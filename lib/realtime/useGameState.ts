'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GameState, Event, Question, Round } from '@/lib/types';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  DEFAULT_EVENT,
  DEFAULT_EVENT_ID,
  DEFAULT_GAME_STATE,
  DEFAULT_QUESTIONS,
  DEFAULT_ROUNDS,
} from '@/lib/defaultEvent';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface UseGameStateReturn {
  gameState: GameState | null;
  event: Event | null;
  currentQuestion: Question | null;
  currentRound: Round | null;
  connectionStatus: ConnectionStatus;
  refetch: () => Promise<void>;
}

export function useGameState(eventId: string | null | undefined): UseGameStateReturn {
  const supabase = createClient();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  const versionRef = useRef<number>(-1);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Full re-fetch of event, game_state, current question and round
  const fetchAllState = useCallback(async () => {
    if (!eventId) return;

    try {
      // 1. Fetch game_state
      const { data: gsData, error: gsErr } = await supabase
        .from('game_state')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (!gsErr && gsData) {
        const gs = gsData as GameState;
        // Ignore state with version lower than held
        if (gs.version >= versionRef.current) {
          versionRef.current = gs.version;
          setGameState(gs);

          // Fetch current question if set and shown/open/locked/revealed
          if (gs.current_question_id && gs.question_status !== 'hidden') {
            const { data: qData } = await supabase
              .from('questions')
              .select('*')
              .eq('id', gs.current_question_id)
              .single();
            setCurrentQuestion((qData as Question) || null);
          } else {
            setCurrentQuestion(null);
          }

          // Fetch current round
          if (gs.current_round_id) {
            const { data: rData } = await supabase
              .from('rounds')
              .select('*')
              .eq('id', gs.current_round_id)
              .single();
            setCurrentRound((rData as Round) || null);
          } else {
            setCurrentRound(null);
          }
        }
      } else if (eventId === DEFAULT_EVENT_ID || !gsData) {
        // Fallback to pre-created default event state
        setGameState((prev) => prev || DEFAULT_GAME_STATE);
        setEvent((prev) => prev || DEFAULT_EVENT);
        setCurrentRound((prev) => prev || DEFAULT_ROUNDS[0]);
        setCurrentQuestion((prev) => prev || DEFAULT_QUESTIONS[0]);
        setConnectionStatus('connected');
      }

      // 2. Fetch event
      const { data: evData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      if (evData) {
        setEvent(evData as Event);
      } else if (eventId === DEFAULT_EVENT_ID) {
        setEvent(DEFAULT_EVENT);
      }
    } catch {
      // Graceful fallback to default event
      if (eventId === DEFAULT_EVENT_ID) {
        setGameState((prev) => prev || DEFAULT_GAME_STATE);
        setEvent((prev) => prev || DEFAULT_EVENT);
        setCurrentRound((prev) => prev || DEFAULT_ROUNDS[0]);
        setCurrentQuestion((prev) => prev || DEFAULT_QUESTIONS[0]);
        setConnectionStatus('connected');
      }
    }
  }, [eventId, supabase]);

  // Polling fallback when realtime is disconnected
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(() => {
      fetchAllState();
    }, 3000);
  }, [fetchAllState]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!eventId) return;

    // (1) Initial fetch on mount
    fetchAllState();

    // (2) Setup realtime subscription
    const channel = supabase.channel(`game_state:${eventId}`);
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_state', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const newGs = payload.new as GameState;
          if (newGs && newGs.version >= versionRef.current) {
            versionRef.current = newGs.version;
            setGameState(newGs);
            fetchAllState(); // Refresh associated question/round
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        (payload) => {
          const newEv = payload.new as Event;
          if (newEv) {
            setEvent(newEv);
          }
        }
      )
      .subscribe((status) => {
        // (3) Track channel status
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          stopPolling();
          // (5) Full re-fetch on subscribe/resubscribe
          fetchAllState();
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          // (4) On error/disconnect: show reconnecting, start 3s polling fallback
          setConnectionStatus('reconnecting');
          startPolling();
        }
      });

    // (VisibilityChange): Re-fetch immediately when tab becomes visible
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        fetchAllState();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Online / Offline window events
    function handleOnline() {
      setConnectionStatus('connecting');
      fetchAllState();
    }
    function handleOffline() {
      setConnectionStatus('disconnected');
      startPolling();
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      supabase.removeChannel(channel);
    };
  }, [eventId, fetchAllState, startPolling, stopPolling, supabase]);

  return {
    gameState,
    event,
    currentQuestion,
    currentRound,
    connectionStatus,
    refetch: fetchAllState,
  };
}
