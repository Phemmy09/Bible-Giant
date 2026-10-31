import { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { getErrorMessage, DEFAULT_ERROR_MESSAGE } from '@/lib/errors';
import {
  Event,
  EventStatus,
  ScreenMode,
  OptionKey,
} from '@/lib/types';

export type RpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

function extractErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return 'unknown_error';
  const err = error as { message?: string; details?: string };
  if (err.message) {
    return err.message.trim();
  }
  return 'unknown_error';
}

async function executeRpc<T>(
  client: SupabaseClient | undefined,
  fnName: string,
  params?: Record<string, unknown>
): Promise<RpcResult<T>> {
  const supabase = client || createBrowserClient();
  try {
    const { data, error } = await supabase.rpc(fnName, params);
    if (error) {
      const code = extractErrorCode(error);
      return { ok: false, code, message: getErrorMessage(code) };
    }
    return { ok: true, data: data as T };
  } catch (err) {
    const code = extractErrorCode(err);
    return { ok: false, code, message: getErrorMessage(code) };
  }
}

// 1. Server time
export async function rpcServerTime(
  client?: SupabaseClient
): Promise<RpcResult<string>> {
  return executeRpc<string>(client, 'server_time');
}

// 2. Get event by code
export interface EventByCodeData {
  id: string;
  name: string;
  status: EventStatus;
}
export async function rpcGetEventByCode(
  code: string,
  client?: SupabaseClient
): Promise<RpcResult<EventByCodeData>> {
  return executeRpc<EventByCodeData>(client, 'get_event_by_code', {
    p_code: code,
  });
}

// 3. Join as audience
export async function rpcJoinAsAudience(
  code: string,
  name: string,
  client?: SupabaseClient
): Promise<RpcResult<string>> {
  return executeRpc<string>(client, 'join_as_audience', {
    p_code: code,
    p_name: name,
  });
}

// 4. Join as contestant
export interface JoinContestantData {
  ok: boolean;
  code?: string;
  contestant_id?: string;
  event_id?: string;
}
export async function rpcJoinAsContestant(
  code: string,
  seat: number,
  pin: string,
  client?: SupabaseClient
): Promise<RpcResult<{ contestant_id: string; event_id: string }>> {
  const res = await executeRpc<JoinContestantData>(
    client,
    'join_as_contestant',
    {
      p_code: code,
      p_seat: seat,
      p_pin: pin,
    }
  );

  if (!res.ok) return res;

  if (!res.data.ok || !res.data.contestant_id || !res.data.event_id) {
    const code = res.data.code || 'bad_pin';
    return { ok: false, code, message: getErrorMessage(code) };
  }

  return {
    ok: true,
    data: {
      contestant_id: res.data.contestant_id,
      event_id: res.data.event_id,
    },
  };
}

// 5. Submit prediction
export async function rpcSubmitPrediction(
  contestantId: string,
  client?: SupabaseClient
): Promise<RpcResult<void>> {
  return executeRpc<void>(client, 'submit_prediction', {
    p_contestant: contestantId,
  });
}

// 6. Submit answer
export interface SubmitAnswerData {
  accepted: boolean;
  reason?: string;
  elapsed_ms?: number;
}
export async function rpcSubmitAnswer(
  questionId: string,
  choiceKey: OptionKey,
  client?: SupabaseClient
): Promise<RpcResult<{ elapsed_ms?: number }>> {
  const res = await executeRpc<SubmitAnswerData>(client, 'submit_answer', {
    p_question: questionId,
    p_choice: choiceKey,
  });

  if (!res.ok) return res;

  if (!res.data.accepted) {
    const code = res.data.reason || 'closed';
    return { ok: false, code, message: getErrorMessage(code) };
  }

  return { ok: true, data: { elapsed_ms: res.data.elapsed_ms } };
}

// 7. Host: Create event
export async function rpcHostCreateEvent(
  name: string,
  client?: SupabaseClient
): Promise<RpcResult<Event>> {
  return executeRpc<Event>(client, 'host_create_event', {
    p_name: name,
  });
}

// 8. Host: Set event status
export async function rpcHostSetEventStatus(
  eventId: string,
  status: EventStatus,
  client?: SupabaseClient
): Promise<RpcResult<void>> {
  return executeRpc<void>(client, 'host_set_event_status', {
    p_event: eventId,
    p_status: status,
  });
}

// 9. Host: Create contestant
export async function rpcHostCreateContestant(
  eventId: string,
  name: string,
  groupLabel: string | null,
  seatNo: number,
  pin: string,
  client?: SupabaseClient
): Promise<RpcResult<string>> {
  return executeRpc<string>(client, 'host_create_contestant', {
    p_event: eventId,
    p_name: name,
    p_group: groupLabel,
    p_seat: seatNo,
    p_pin: pin,
  });
}

// 10. Host: Reset contestant PIN
export async function rpcHostResetContestantPin(
  contestantId: string,
  newPin: string,
  client?: SupabaseClient
): Promise<RpcResult<void>> {
  return executeRpc<void>(client, 'host_reset_contestant_pin', {
    p_contestant: contestantId,
    p_pin: newPin,
  });
}

// 11. Host: Set screen
export async function rpcHostSetScreen(
  eventId: string,
  screen: ScreenMode,
  client?: SupabaseClient
): Promise<RpcResult<void>> {
  return executeRpc<void>(client, 'host_set_screen', {
    p_event: eventId,
    p_screen: screen,
  });
}

// 12. Host: Show question
export async function rpcHostShowQuestion(
  eventId: string,
  questionId: string,
  client?: SupabaseClient
): Promise<RpcResult<void>> {
  return executeRpc<void>(client, 'host_show_question', {
    p_event: eventId,
    p_question: questionId,
  });
}

// 13. Host: Open question
export async function rpcHostOpenQuestion(
  eventId: string,
  client?: SupabaseClient
): Promise<RpcResult<void>> {
  return executeRpc<void>(client, 'host_open_question', {
    p_event: eventId,
  });
}

// 14. Host: Lock question
export async function rpcHostLockQuestion(
  eventId: string,
  client?: SupabaseClient
): Promise<RpcResult<void>> {
  return executeRpc<void>(client, 'host_lock_question', {
    p_event: eventId,
  });
}

// 15. Host: Reveal question
export async function rpcHostRevealQuestion(
  eventId: string,
  client?: SupabaseClient
): Promise<RpcResult<void>> {
  return executeRpc<void>(client, 'host_reveal_question', {
    p_event: eventId,
  });
}

// 16. Host: Reset question
export async function rpcHostResetQuestion(
  eventId: string,
  client?: SupabaseClient
): Promise<RpcResult<void>> {
  return executeRpc<void>(client, 'host_reset_question', {
    p_event: eventId,
  });
}

// 17. Host: Mark spoken
export async function rpcHostMarkSpoken(
  eventId: string,
  contestantId: string,
  isCorrect: boolean,
  client?: SupabaseClient
): Promise<RpcResult<void>> {
  return executeRpc<void>(client, 'host_mark_spoken', {
    p_event: eventId,
    p_contestant: contestantId,
    p_correct: isCorrect,
  });
}

// 18. Host: Adjust score
export async function rpcHostAdjustScore(
  eventId: string,
  contestantId: string,
  delta: number,
  reason: string,
  client?: SupabaseClient
): Promise<RpcResult<void>> {
  return executeRpc<void>(client, 'host_adjust_score', {
    p_event: eventId,
    p_contestant: contestantId,
    p_delta: delta,
    p_reason: reason,
  });
}

// 19. Host: Draw raffle
export interface RaffleWinnerData {
  winner_name: string;
  pool_kind: 'correct_predictors' | 'all_audience';
  pool_size: number;
}
export async function rpcHostDrawRaffle(
  eventId: string,
  client?: SupabaseClient
): Promise<RpcResult<RaffleWinnerData>> {
  return executeRpc<RaffleWinnerData>(client, 'host_draw_raffle', {
    p_event: eventId,
  });
}

