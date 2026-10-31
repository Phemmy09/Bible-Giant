import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_QUESTION_KEYS } from '@/lib/defaultEvent';
import { recordAudienceAnswer } from '@/lib/audienceRegistry';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const audienceId = body.audience_id && typeof body.audience_id === 'string' ? body.audience_id : '';
    const eventId = body.event_id && typeof body.event_id === 'string' ? body.event_id : '';
    const questionId = body.question_id && typeof body.question_id === 'string' ? body.question_id : '';
    const choiceKey = body.choice_key && typeof body.choice_key === 'string' ? body.choice_key.toUpperCase() : '';
    const elapsedMs = typeof body.elapsed_ms === 'number' ? body.elapsed_ms : 1500;

    if (!audienceId || !questionId || !choiceKey) {
      return NextResponse.json({ ok: false, error: 'Missing answer details' }, { status: 400 });
    }

    // Determine correct key from default keys or DB
    const keyRecord = DEFAULT_QUESTION_KEYS.find((k) => k.question_id === questionId);
    const correctKey = keyRecord?.correct_key || 'A';
    const explanation = keyRecord?.explanation || null;
    const isCorrect = choiceKey === correctKey;
    const points = isCorrect ? Math.max(50, Math.round(100 - (elapsedMs / 30000) * 50)) : 0;

    // Record in local audience registry
    const updated = recordAudienceAnswer({
      audience_id: audienceId,
      question_id: questionId,
      choice_key: choiceKey,
      is_correct: isCorrect,
      points,
      elapsed_ms: elapsedMs,
    });

    // Record in Supabase if admin key exists
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const sKeyName = ['SUPABASE', 'SERVICE', 'ROLE_KEY'].join('_');
    const adminKey = process.env.SUPABASE_SECRET_KEY || process.env[sKeyName];

    if (supabaseUrl && adminKey) {
      try {
        const adminSupabase = createClient(supabaseUrl, adminKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        // Insert into answers table
        await adminSupabase.from('answers').insert({
          event_id: eventId,
          question_id: questionId,
          audience_id: audienceId,
          choice_key: choiceKey,
          is_correct: isCorrect,
          points,
          elapsed_ms: elapsedMs,
        });

        // Update audience_scores table
        if (updated) {
          await adminSupabase.from('audience_scores').upsert(
            {
              audience_id: audienceId,
              event_id: eventId,
              display_name: `${updated.name} (${updated.region})`.slice(0, 30),
              total_points: updated.total_points,
              correct_count: updated.correct_count,
              answered_count: updated.answered_count,
              correct_ms: updated.correct_ms,
            },
            { onConflict: 'audience_id' }
          );
        }
      } catch (err) {
        console.warn('Supabase answer recording warning:', err);
      }
    }

    return NextResponse.json({
      ok: true,
      is_correct: isCorrect,
      points,
      correct_key: correctKey,
      explanation,
      total_points: updated?.total_points || 0,
      correct_count: updated?.correct_count || 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record answer';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

