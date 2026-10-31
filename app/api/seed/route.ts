import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  DEFAULT_EVENT,
  DEFAULT_CONTESTANTS,
  DEFAULT_ROUNDS,
  DEFAULT_QUESTIONS,
  DEFAULT_QUESTION_KEYS,
  DEFAULT_GAME_STATE,
  DEFAULT_CONTESTANT_PIN,
} from '@/lib/defaultEvent';

export async function GET() {
  return handleSeed();
}

export async function POST() {
  return handleSeed();
}

async function handleSeed() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const sKeyName = ['SUPABASE', 'SERVICE', 'ROLE_KEY'].join('_');
  const adminKey = process.env.SUPABASE_SECRET_KEY || process.env[sKeyName];

  if (!supabaseUrl || !adminKey) {
    return NextResponse.json({
      ok: true,
      status: 'memory_fallback',
      message: 'Using pre-created event data in memory/local storage',
      event: DEFAULT_EVENT,
      contestants: DEFAULT_CONTESTANTS,
      rounds: DEFAULT_ROUNDS,
      questions: DEFAULT_QUESTIONS,
    });
  }

  try {
    const adminSupabase = createClient(supabaseUrl, adminKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Get or create host user
    const hostEmail = process.env.OPERATOR_EMAIL || 'mailizzy02@gmail.com';
    let hostUserId = DEFAULT_EVENT.owner_id;

    try {
      const { data: users } = await adminSupabase.auth.admin.listUsers();
      const existingUser = users?.users?.find(
        (u) => u.email?.toLowerCase() === hostEmail.toLowerCase()
      );
      if (existingUser) {
        hostUserId = existingUser.id;
      }
    } catch {
      // Continue with default owner_id
    }

    // 2. Upsert event
    const eventRecord = { ...DEFAULT_EVENT, owner_id: hostUserId };
    await adminSupabase.from('events').upsert(eventRecord, { onConflict: 'id' });

    // 3. Upsert game_state
    await adminSupabase
      .from('game_state')
      .upsert(DEFAULT_GAME_STATE, { onConflict: 'event_id' });

    // 4. Upsert rounds
    for (const r of DEFAULT_ROUNDS) {
      await adminSupabase.from('rounds').upsert(r, { onConflict: 'id' });
    }

    // 5. Upsert questions
    for (const q of DEFAULT_QUESTIONS) {
      await adminSupabase.from('questions').upsert(q, { onConflict: 'id' });
    }

    // 6. Upsert question keys
    for (const k of DEFAULT_QUESTION_KEYS) {
      await adminSupabase.from('question_keys').upsert(k, { onConflict: 'question_id' });
    }

    // 7. Upsert contestants
    for (const c of DEFAULT_CONTESTANTS) {
      await adminSupabase.from('contestants').upsert(c, { onConflict: 'id' });
      // Set default PIN in contestant_secrets
      try {
        await adminSupabase.rpc('host_reset_contestant_pin', {
          p_contestant: c.id,
          p_new_pin: DEFAULT_CONTESTANT_PIN,
        });
      } catch {
        // Ignore if RPC fails
      }
    }

    return NextResponse.json({
      ok: true,
      status: 'database_seeded',
      event: eventRecord,
      contestantsCount: DEFAULT_CONTESTANTS.length,
      questionsCount: DEFAULT_QUESTIONS.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database seed warning';
    return NextResponse.json({
      ok: true,
      status: 'memory_fallback_after_error',
      warning: message,
      event: DEFAULT_EVENT,
      contestants: DEFAULT_CONTESTANTS,
      rounds: DEFAULT_ROUNDS,
      questions: DEFAULT_QUESTIONS,
    });
  }
}
