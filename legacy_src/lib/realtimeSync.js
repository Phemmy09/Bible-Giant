// Real-Time Synchronization Engine (PRD Section 4)
// Dual-layer sync:
// 1. Local BroadcastChannel (<10ms p95 latency for same-machine dual screen Operator -> Projector)
// 2. Supabase Realtime Channels (for remote team podium laptops /play and audience mobile /join)

import { supabase } from '@/lib/supabase';
import { useGameStore } from '@/stores/gameStore';

const LOCAL_CHANNEL_NAME = 'afc_bible_giant_sync';
let localChannel = null;
let supabaseChannel = null;
let isBroadcasting = false;

// Initialize BroadcastChannel safely in browser
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    localChannel = new BroadcastChannel(LOCAL_CHANNEL_NAME);
  } catch (e) {
    console.warn('BroadcastChannel initialization failed:', e);
  }
}

/**
 * Broadcast an action or state slice to all listening windows & remote clients
 */
export function broadcastAction(actionType, payload = {}) {
  if (isBroadcasting) return;

  const message = {
    actionType,
    payload,
    timestamp: Date.now(),
  };

  // 1. Broadcast locally across browser tabs (Admin -> Stage)
  if (localChannel) {
    try {
      localChannel.postMessage(message);
    } catch (e) {
      console.warn('Local broadcast error:', e);
    }
  }

  // 2. Broadcast remotely via Supabase Realtime
  if (supabaseChannel) {
    try {
      supabaseChannel.send({
        type: 'broadcast',
        event: 'game_event',
        payload: message,
      });
    } catch (e) {
      console.warn('Supabase broadcast error:', e);
    }
  }
}

/**
 * Initialize listeners on a client (Stage, Team Device, Audience, or Admin)
 */
export function initRealtimeSync(sessionCode = '345TWJ') {
  const store = useGameStore.getState();

  // 1. Listen on Local BroadcastChannel
  if (localChannel) {
    localChannel.onmessage = (event) => {
      const data = event.data;
      if (!data || !data.actionType) return;
      handleInboundAction(data.actionType, data.payload);
    };
  }

  // 2. Listen on Supabase Realtime Channel
  if (supabase) {
    const channelName = `session_${sessionCode.toLowerCase()}`;
    if (supabaseChannel) {
      supabase.removeChannel(supabaseChannel);
    }

    supabaseChannel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
        },
      })
      .on('broadcast', { event: 'game_event' }, ({ payload }) => {
        if (!payload || !payload.actionType) return;
        handleInboundAction(payload.actionType, payload.payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Supabase Realtime connected on ${channelName}`);
        }
      });
  }

  return () => {
    if (supabaseChannel && supabase) {
      supabase.removeChannel(supabaseChannel);
      supabaseChannel = null;
    }
  };
}

/**
 * Handle incoming synchronized actions across surfaces
 */
function handleInboundAction(actionType, payload) {
  isBroadcasting = true;
  try {
    const store = useGameStore.getState();

    switch (actionType) {
      case 'STATE_SYNC':
        if (payload) {
          useGameStore.setState(payload);
        }
        break;

      case 'TILE_PICKED':
        if (payload.tileNumber) {
          store.pickTile(payload.tileNumber);
        }
        break;

      case 'JUDGMENT_CORRECT':
        if (payload.zoneId) {
          store.markCorrect(payload.zoneId);
        }
        break;

      case 'JUDGMENT_INCORRECT':
        store.markIncorrect();
        break;

      case 'ROUND_CHANGED':
        if (payload.roundNumber) {
          store.setRoundNumber(payload.roundNumber);
        }
        break;

      case 'ENGINE_MODE_CHANGED':
        if (payload.mode) {
          store.setEngineMode(payload.mode);
        }
        break;

      case 'DIGITAL_STAGE_VIEW':
        if (payload.view) {
          store.setDigitalStageView(payload.view);
        }
        break;

      case 'TIMER_TICK':
        if (typeof payload.remaining === 'number') {
          useGameStore.setState({
            questionTimerRemaining: payload.remaining,
            questionTimerRunning: payload.running,
          });
        }
        break;

      case 'TEAM_SUBMISSION':
        if (payload.zoneId && payload.submission) {
          useGameStore.setState(s => ({
            teamSubmissions: {
              ...s.teamSubmissions,
              [payload.zoneId]: payload.submission,
            },
          }));
        }
        break;

      case 'PREDICTION_TOGGLED':
        if (typeof payload.open === 'boolean') {
          store.togglePredictionWindow(payload.open);
        }
        break;

      default:
        break;
    }
  } finally {
    isBroadcasting = false;
  }
}
