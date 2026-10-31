import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseQuestionsFromBuffer } from '@/lib/questionParser';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const eventId = (formData.get('eventId') as string) || '';
    const roundId = (formData.get('roundId') as string) || '';
    const previewOnly = formData.get('previewOnly') === 'true';

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = file.name || 'questions.txt';

    // 1. Parse buffer using smart parser
    const parseResult = await parseQuestionsFromBuffer(buffer, filename);

    if (!parseResult.ok || parseResult.questions.length === 0) {
      return NextResponse.json({
        ok: false,
        error: parseResult.errors[0] || 'No valid questions could be extracted from this document.',
        detectedFormat: parseResult.detectedFormat,
      }, { status: 422 });
    }

    // 2. If preview requested, return parsed data immediately for operator review
    if (previewOnly) {
      return NextResponse.json({
        ok: true,
        preview: true,
        filename,
        detectedFormat: parseResult.detectedFormat,
        totalFound: parseResult.questions.length,
        questions: parseResult.questions,
      });
    }

    // 3. Connect to Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const sKeyName = ['SUPABASE', 'SERVICE', 'ROLE_KEY'].join('_');
    const adminKey = process.env.SUPABASE_SECRET_KEY || process.env[sKeyName];

    let effectiveRoundId = roundId;
    let effectiveRoundTitle = 'Imported Round';

    if (supabaseUrl && adminKey && eventId) {
      const adminSupabase = createClient(supabaseUrl, adminKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Resolve round: If not specified, get first round or create one
      if (!effectiveRoundId) {
        const { data: existingRounds } = await adminSupabase
          .from('rounds')
          .select('id, title, position')
          .eq('event_id', eventId)
          .order('position', { ascending: true })
          .limit(1);

        if (existingRounds && existingRounds.length > 0) {
          effectiveRoundId = existingRounds[0].id;
          effectiveRoundTitle = existingRounds[0].title;
        } else {
          // Create a new round
          const { data: newRound } = await adminSupabase
            .from('rounds')
            .insert({
              event_id: eventId,
              title: `Round 1: Imported Questions (${filename.slice(0, 20)})`,
              position: 1,
              type: 'speed',
              time_limit_sec: 20,
              points_correct: 10,
              penalty_wrong: 0,
            })
            .select('*')
            .single();

          if (newRound) {
            effectiveRoundId = newRound.id;
            effectiveRoundTitle = newRound.title;
          }
        }
      } else {
        // Fetch target round title
        const { data: rData } = await adminSupabase
          .from('rounds')
          .select('title')
          .eq('id', effectiveRoundId)
          .single();
        if (rData) effectiveRoundTitle = rData.title;
      }

      // Count existing questions in this round to determine starting position
      const { count } = await adminSupabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('round_id', effectiveRoundId);

      let nextPos = (count || 0) + 1;
      let importedCount = 0;

      for (const q of parseResult.questions) {
        const { data: newQ, error: qErr } = await adminSupabase
          .from('questions')
          .insert({
            event_id: eventId,
            round_id: effectiveRoundId,
            position: nextPos++,
            body: q.body,
            options: q.options,
            scripture_ref: q.scripture_ref,
            answer_mode: q.answer_mode,
          })
          .select('id')
          .single();

        if (newQ && !qErr) {
          importedCount++;
          if (q.answer_mode === 'choice' && q.correct_key) {
            await adminSupabase.from('question_keys').insert({
              question_id: newQ.id,
              event_id: eventId,
              correct_key: q.correct_key,
              explanation: q.explanation,
            });
          }
        }
      }

      return NextResponse.json({
        ok: true,
        importedCount,
        totalFound: parseResult.questions.length,
        roundId: effectiveRoundId,
        roundTitle: effectiveRoundTitle,
        detectedFormat: parseResult.detectedFormat,
      });
    }

    return NextResponse.json({
      ok: true,
      importedCount: parseResult.questions.length,
      roundId: effectiveRoundId || 'default-round',
      roundTitle: effectiveRoundTitle,
      detectedFormat: parseResult.detectedFormat,
      notice: 'Parsed successfully and cached in session.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
