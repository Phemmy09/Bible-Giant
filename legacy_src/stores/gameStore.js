import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEMO_ZONES, DEMO_QUESTIONS, SESSION_PHASES, TILE_STATES, ULTIMATE_CHALLENGE } from '@/lib/constants';

// Generate board tiles from questions
const generateBoardTiles = (questions) => {
  return questions.map((q, i) => ({
    tileNumber: i + 1,
    questionId: q.id,
    state: TILE_STATES.HIDDEN,
  }));
};

// Speed-weighted scoring helper (PRD Section 3.3.4)
export const calculateSpeedPoints = (isCorrect, timeTakenMs, limitMs = 20000, minPoints = 300, maxPoints = 1000) => {
  if (!isCorrect) return 0;
  const clampedTime = Math.max(0, Math.min(timeTakenMs, limitMs));
  const fraction = 1 - (clampedTime / limitMs);
  return Math.round(minPoints + (maxPoints - minPoints) * fraction);
};

const initialState = {
  // Session
  session: {
    id: 'demo-session',
    name: 'Ekiti Area Youth Convention — Bible Giant Finals',
    phase: SESSION_PHASES.IN_PROGRESS,
    currentRoundId: 'r2-genesis',
    unitTier: 'zone',
    unitLabel: 'Zone',
    engineMode: 'legacy_board', // 'legacy_board' | 'digital_live'
    sessionCode: '345TWJ',
    version: 0,
  },

  // Zones
  zones: DEMO_ZONES.map(z => ({ ...z, archived: false })),

  // Active round
  activeRound: {
    id: 'r2-genesis',
    roundNumber: 2,
    roundType: 'objective',
    topicLabel: 'Genesis Book',
    isUltimateChallenge: false,
    roundFormat: 'simultaneous', // 'simultaneous' | 'tile_blitz' | 'ultimate_challenge'
  },

  // Questions bank (per round)
  questions: DEMO_QUESTIONS,

  // Board tiles
  boardTiles: generateBoardTiles(DEMO_QUESTIONS),

  // Current question (shown on stage)
  currentQuestion: null,

  // Judgment state
  judgmentStamp: null, // 'correct' | 'incorrect' | null

  // Active zone (whose turn it is)
  activeZoneId: null,

  // Draw order (from spinner)
  drawOrder: null, // { drawnSequence: [{ position, zoneId }], completed: false }

  // Spinner state
  spinnerVisible: false,
  spinnerResult: null,

  // Ultimate Challenge state
  ultimateChallenge: null, // { activeZoneId, questionIndex, timerRemainingMs, timerLocked, subtotal, marks }

  // Podium state
  podiumReveals: [], // [{ rank, zoneId, zoneName, score }]
  podiumRevealing: false,

  // Sound enabled
  soundEnabled: false,

  // Audit log
  auditLog: [],

  // ==========================================
  // DIGITAL LIVE ENGINE (MODE B) EXTENSIONS
  // ==========================================
  digitalStageView: 'join_lobby', // 'join_lobby' | 'question' | 'reveal' | 'results'
  questionTimerRemaining: 20,
  questionTimerRunning: false,
  connectedTeams: {
    'z-ado': { players: ['Bro. Samuel Adeleke', 'Sis. Deborah Babalola'], connected: true },
    'z-ikere': { players: ['Bro. Enoch Olatunji', 'Sis. Faith Adebayo'], connected: true },
    'z-igede': { players: ['Bro. Timothy Daramola', 'Sis. Grace Alabi'], connected: true },
    'z-ido': { players: ['Bro. Daniel Awe', 'Sis. Hannah Ajayi'], connected: true },
    'z-emure': { players: ['Bro. David Ogunleye', 'Sis. Joy Ojo'], connected: true },
    'z-ikole': { players: ['Bro. Peter Ayodele', 'Sis. Mary Bello'], connected: true },
  },
  teamSubmissions: {}, // { [zoneId]: { answerIndex, timeTakenMs, isCorrect, pointsAwarded } }
  audienceMembers: [
    { id: 'aud-1', name: 'Bro. Emmanuel (Ado)', phoneMask: '***-4921', score: 1850 },
    { id: 'aud-2', name: 'Sis. Dorcas (Ikere)', phoneMask: '***-8104', score: 1720 },
    { id: 'aud-3', name: 'Bro. Paul (Igede)', phoneMask: '***-3392', score: 1640 },
    { id: 'aud-4', name: 'Sis. Ruth (Ido)', phoneMask: '***-9021', score: 1580 },
    { id: 'aud-5', name: 'Bro. Matthew (Ikole)', phoneMask: '***-1148', score: 1420 },
  ],
  audienceAnswers: {}, // { [audienceId]: { answerIndex, isCorrect, pointsAwarded } }
  predictionWindowOpen: false,
  audiencePredictions: [], // [{ audienceId, rankings: [zoneIds] }]
};

export const useGameStore = create(
  persist(
    (set, get) => ({
      ...initialState,

  // --- Session ---
  setSession: (session) => set({ session }),
  setPhase: (phase) => set(state => ({
    session: { ...state.session, phase },
  })),
  setEngineMode: (mode) => {
    set(state => ({
      session: { ...state.session, engineMode: mode },
    }));
    get()._logAction('engine_mode_changed', { mode });
  },
  setSessionCode: (code) => set(state => ({
    session: { ...state.session, sessionCode: code.toUpperCase() },
  })),

  // --- Zones ---
  setZones: (zones) => set({ zones }),
  addZone: (name) => {
    const state = get();
    if (state.zones.length >= 8) return;
    if (state.zones.some(z => z.name.toUpperCase() === name.toUpperCase())) return;
    const id = `z-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    set({ zones: [...state.zones, { id, name: name.toUpperCase(), score: 0, archived: false }] });
    get()._logAction('zone_added', { zoneName: name });
  },
  removeZone: (zoneId) => {
    const state = get();
    const zone = state.zones.find(z => z.id === zoneId);
    if (zone && zone.score > 0) {
      set({ zones: state.zones.map(z => z.id === zoneId ? { ...z, archived: true } : z) });
    } else {
      set({ zones: state.zones.filter(z => z.id !== zoneId) });
    }
    get()._logAction('zone_removed', { zoneId });
  },
  updateZoneScore: (zoneId, delta, reason = '') => {
    set(state => ({
      zones: state.zones.map(z =>
        z.id === zoneId ? { ...z, score: Math.max(0, z.score + delta) } : z
      ),
    }));
    get()._logAction('score_update', { zoneId, delta, reason });
  },
  resetAllScores: () => {
    set(state => ({
      zones: state.zones.map(z => ({ ...z, score: 0 })),
    }));
    get()._logAction('scores_reset', {});
  },

  // --- Rounds ---
  setActiveRound: (round) => set({
    activeRound: round,
    currentQuestion: null,
    judgmentStamp: null,
    ultimateChallenge: null,
    teamSubmissions: {},
  }),
  setRoundNumber: (num) => {
    const roundTypes = { 1: 'objective', 2: 'objective', 3: 'objective', 4: 'german_gap_fill', 5: 'theory_open' };
    const roundFormats = { 1: 'simultaneous', 2: 'simultaneous', 3: 'tile_blitz', 4: 'tile_blitz', 5: 'ultimate_challenge' };
    set(state => ({
      activeRound: {
        ...state.activeRound,
        roundNumber: num,
        roundType: roundTypes[num] || 'objective',
        isUltimateChallenge: num === 6,
        roundFormat: roundFormats[num] || 'simultaneous',
      },
      currentQuestion: null,
      judgmentStamp: null,
      teamSubmissions: {},
      ultimateChallenge: num === 6 ? {
        activeZoneId: null,
        questionIndex: 1,
        timerRemainingMs: ULTIMATE_CHALLENGE.timerDurationMs,
        timerLocked: false,
        subtotal: 0,
        marks: [],
      } : null,
    }));
  },
  setRoundFormat: (format) => set(state => ({
    activeRound: { ...state.activeRound, roundFormat: format },
  })),
  setTopicLabel: (label) => set(state => ({
    activeRound: { ...state.activeRound, topicLabel: label },
  })),

  // --- Questions ---
  setQuestions: (questions) => set({
    questions,
    boardTiles: generateBoardTiles(questions),
  }),
  addQuestion: (question) => {
    const state = get();
    const newQ = { ...question, id: `q-${Date.now()}` };
    const newQuestions = [...state.questions, newQ];
    set({
      questions: newQuestions,
      boardTiles: generateBoardTiles(newQuestions),
    });
  },
  updateQuestion: (id, updates) => set(state => ({
    questions: state.questions.map(q => q.id === id ? { ...q, ...updates } : q),
  })),
  deleteQuestion: (id) => {
    const state = get();
    const newQuestions = state.questions.filter(q => q.id !== id);
    set({
      questions: newQuestions,
      boardTiles: generateBoardTiles(newQuestions),
    });
  },

  // --- Board Tiles ---
  pickTile: (tileNumber) => {
    const state = get();
    const tile = state.boardTiles.find(t => t.tileNumber === tileNumber);
    if (!tile || tile.state !== TILE_STATES.HIDDEN) return;

    const question = state.questions.find(q => q.id === tile.questionId);
    set({
      boardTiles: state.boardTiles.map(t =>
        t.tileNumber === tileNumber ? { ...t, state: TILE_STATES.ACTIVE } : t
      ),
      currentQuestion: question,
      judgmentStamp: null,
      teamSubmissions: {},
      digitalStageView: 'question',
      questionTimerRemaining: 20,
      questionTimerRunning: true,
    });
    get()._logAction('tile_picked', { tileNumber, questionId: tile.questionId });
  },
  resetBoard: () => {
    set(state => ({
      boardTiles: state.boardTiles.map(t => ({ ...t, state: TILE_STATES.HIDDEN })),
      currentQuestion: null,
      judgmentStamp: null,
      teamSubmissions: {},
    }));
    get()._logAction('board_reset', {});
  },

  // --- Judgment (Mode A) ---
  markCorrect: (zoneId) => {
    const state = get();
    if (!state.currentQuestion) return;

    set({ judgmentStamp: 'correct' });
    get().updateZoneScore(zoneId, 1, `Correct answer: ${state.currentQuestion.questionText.substring(0, 50)}`);

    setTimeout(() => {
      const currentState = get();
      const activeTile = currentState.boardTiles.find(t => t.state === TILE_STATES.ACTIVE);
      if (activeTile) {
        set({
          boardTiles: currentState.boardTiles.map(t =>
            t.tileNumber === activeTile.tileNumber ? { ...t, state: TILE_STATES.USED } : t
          ),
        });
        setTimeout(() => {
          set(s => ({
            boardTiles: s.boardTiles.map(t =>
              t.tileNumber === activeTile.tileNumber ? { ...t, state: TILE_STATES.REMOVED } : t
            ),
          }));
        }, 500);
      }
    }, 1500);

    get()._logAction('judgment_correct', { zoneId, questionId: state.currentQuestion?.id });
  },
  markIncorrect: () => {
    const state = get();
    if (!state.currentQuestion) return;

    set({ judgmentStamp: 'incorrect' });

    setTimeout(() => {
      const currentState = get();
      const activeTile = currentState.boardTiles.find(t => t.state === TILE_STATES.ACTIVE);
      if (activeTile) {
        set({
          boardTiles: currentState.boardTiles.map(t =>
            t.tileNumber === activeTile.tileNumber ? { ...t, state: TILE_STATES.USED } : t
          ),
        });
        setTimeout(() => {
          set(s => ({
            boardTiles: s.boardTiles.map(t =>
              t.tileNumber === activeTile.tileNumber ? { ...t, state: TILE_STATES.REMOVED } : t
            ),
          }));
        }, 500);
      }
    }, 1500);

    get()._logAction('judgment_incorrect', { questionId: state.currentQuestion?.id });
  },
  clearJudgment: () => set({ judgmentStamp: null, currentQuestion: null }),

  // --- Active Zone ---
  setActiveZone: (zoneId) => set({ activeZoneId: zoneId }),

  // --- Turn-Order Spinner ---
  showSpinner: () => set({ spinnerVisible: true, spinnerResult: null }),
  hideSpinner: () => set({ spinnerVisible: false }),
  setDrawOrder: (drawOrder) => set({ drawOrder }),
  spinResult: (zoneId) => set({ spinnerResult: zoneId }),

  // --- Ultimate Challenge (Legacy Mode A) ---
  startUltimateChallenge: (zoneId) => {
    set({
      ultimateChallenge: {
        activeZoneId: zoneId,
        questionIndex: 1,
        timerRemainingMs: ULTIMATE_CHALLENGE.timerDurationMs,
        timerLocked: false,
        subtotal: 0,
        marks: Array.from({ length: ULTIMATE_CHALLENGE.questionsPerAttempt }, (_, i) => ({
          questionIndex: i + 1,
          markedCorrect: false,
        })),
      },
    });
    get()._logAction('uc_started', { zoneId });
  },
  ucKeypress: (key) => {
    set(state => {
      const uc = state.ultimateChallenge;
      if (!uc) return state;

      let newUC = { ...uc, marks: [...uc.marks] };
      switch (key) {
        case 'next':
          if (newUC.questionIndex < ULTIMATE_CHALLENGE.questionsPerAttempt) {
            newUC.questionIndex += 1;
          }
          break;
        case 'back':
          if (newUC.questionIndex > 1) {
            newUC.questionIndex -= 1;
          }
          break;
        case 'up': {
          const mark = newUC.marks[newUC.questionIndex - 1];
          if (!mark.markedCorrect) {
            newUC.marks = newUC.marks.map((m, i) =>
              i === newUC.questionIndex - 1 ? { ...m, markedCorrect: true } : m
            );
            newUC.subtotal = Math.min(
              ULTIMATE_CHALLENGE.maxSubtotal,
              newUC.subtotal + ULTIMATE_CHALLENGE.pointsPerQuestion
            );
          }
          break;
        }
        case 'down': {
          const markDown = newUC.marks[newUC.questionIndex - 1];
          if (markDown.markedCorrect) {
            newUC.marks = newUC.marks.map((m, i) =>
              i === newUC.questionIndex - 1 ? { ...m, markedCorrect: false } : m
            );
            newUC.subtotal = Math.max(0, newUC.subtotal - ULTIMATE_CHALLENGE.pointsPerQuestion);
          }
          break;
        }
      }
      return { ultimateChallenge: newUC };
    });
  },
  ucTimerTick: () => {
    set(state => {
      const uc = state.ultimateChallenge;
      if (!uc || uc.timerLocked) return state;
      const newRemaining = Math.max(0, uc.timerRemainingMs - 1000);
      return {
        ultimateChallenge: {
          ...uc,
          timerRemainingMs: newRemaining,
          timerLocked: newRemaining === 0,
        },
      };
    });
  },
  commitUltimateChallenge: () => {
    const state = get();
    const uc = state.ultimateChallenge;
    if (!uc) return;

    get().updateZoneScore(uc.activeZoneId, uc.subtotal, `Ultimate Challenge: ${uc.subtotal} points`);
    set({ ultimateChallenge: null });
    get()._logAction('uc_committed', { zoneId: uc.activeZoneId, subtotal: uc.subtotal });
  },

  // --- Podium ---
  revealNextPodiumRank: () => {
    const state = get();
    const sortedZones = [...state.zones]
      .filter(z => !z.archived)
      .sort((a, b) => b.score - a.score);

    const nextRank = state.podiumReveals.length + 1;
    const revealIndex = sortedZones.length - nextRank;
    if (revealIndex < 0) return;

    const zone = sortedZones[revealIndex];
    set({
      podiumReveals: [
        ...state.podiumReveals,
        { rank: sortedZones.length - revealIndex, zoneId: zone.id, zoneName: zone.name, score: zone.score },
      ],
      podiumRevealing: true,
    });
    setTimeout(() => set({ podiumRevealing: false }), 2000);
  },
  resetPodium: () => set({ podiumReveals: [], podiumRevealing: false }),

  // =======================================================
  // DIGITAL LIVE ENGINE (MODE B) ACTIONS
  // =======================================================
  setDigitalStageView: (view) => set({ digitalStageView: view }),

  startDigitalQuestion: (question) => {
    set({
      currentQuestion: question,
      digitalStageView: 'question',
      teamSubmissions: {},
      audienceAnswers: {},
      questionTimerRemaining: 20,
      questionTimerRunning: true,
    });
    get()._logAction('digital_question_started', { questionId: question.id });
  },

  timerTick: () => {
    set(state => {
      if (!state.questionTimerRunning) return state;
      const newRemaining = Math.max(0, state.questionTimerRemaining - 1);
      return {
        questionTimerRemaining: newRemaining,
        questionTimerRunning: newRemaining > 0,
      };
    });
  },

  stopQuestionTimer: () => set({ questionTimerRunning: false }),

  registerTeam: (zoneId, players, branch = '') => {
    set(state => ({
      connectedTeams: {
        ...state.connectedTeams,
        [zoneId]: {
          ...(state.connectedTeams[zoneId] || {}),
          players: Array.isArray(players) ? players : [players],
          branch: branch || state.connectedTeams[zoneId]?.branch || '',
          connected: true,
        },
      },
    }));
  },

  updateTeamRoster: (zoneId, rosterData) => {
    set(state => ({
      connectedTeams: {
        ...state.connectedTeams,
        [zoneId]: {
          ...(state.connectedTeams[zoneId] || {}),
          ...rosterData,
          connected: true,
        },
      },
    }));
  },

  submitTeamAnswer: (zoneId, answerIndex, timeTakenMs) => {
    const state = get();
    const q = state.currentQuestion;
    if (!q) return;

    // Derive correctIndex from correctAnswer letter (A=0, B=1, C=2, D=3)
    const correctIdx = typeof q.correctIndex === 'number' ? q.correctIndex : ['A','B','C','D'].indexOf(q.correctAnswer);
    const isCorrect = correctIdx === answerIndex;
    const points = calculateSpeedPoints(isCorrect, timeTakenMs, 20000, 300, 1000);

    set(s => ({
      teamSubmissions: {
        ...s.teamSubmissions,
        [zoneId]: {
          answerIndex,
          timeTakenMs,
          isCorrect,
          pointsAwarded: points,
        },
      },
    }));

    // If all competing teams have answered, auto stop timer
    const updatedSubmissions = { ...get().teamSubmissions };
    const allZones = state.zones.filter(z => !z.archived);
    if (Object.keys(updatedSubmissions).length >= allZones.length) {
      set({ questionTimerRunning: false });
    }

    get()._logAction('team_answered', { zoneId, answerIndex, isCorrect, points });
  },

  revealDigitalAnswers: () => {
    const state = get();
    // Commit points to team scores
    Object.entries(state.teamSubmissions).forEach(([zoneId, sub]) => {
      if (sub.isCorrect && sub.pointsAwarded > 0) {
        get().updateZoneScore(zoneId, sub.pointsAwarded, `Digital Live speed points (+${sub.pointsAwarded})`);
      }
    });
    set({
      digitalStageView: 'reveal',
      questionTimerRunning: false,
    });
    get()._logAction('digital_answers_revealed', {});
  },

  registerAudience: (name, phone) => {
    const id = `aud-${Date.now()}`;
    const mask = phone.length >= 4 ? `***-${phone.slice(-4)}` : '***';
    const newMember = { id, name, phoneMask: mask, score: 0 };
    set(state => ({
      audienceMembers: [...state.audienceMembers, newMember],
    }));
    return id;
  },

  submitAudienceAnswer: (audienceId, answerIndex, timeTakenMs) => {
    const state = get();
    const q = state.currentQuestion;
    if (!q) return;

    // Derive correctIndex from correctAnswer letter (A=0, B=1, C=2, D=3)
    const correctIdx = typeof q.correctIndex === 'number' ? q.correctIndex : ['A','B','C','D'].indexOf(q.correctAnswer);
    const isCorrect = correctIdx === answerIndex;
    const points = calculateSpeedPoints(isCorrect, timeTakenMs, 20000, 300, 1000);

    set(s => ({
      audienceAnswers: {
        ...s.audienceAnswers,
        [audienceId]: { answerIndex, isCorrect, pointsAwarded: points },
      },
      audienceMembers: s.audienceMembers.map(m =>
        m.id === audienceId ? { ...m, score: m.score + points } : m
      ),
    }));
  },

  togglePredictionWindow: (open) => {
    set({ predictionWindowOpen: open });
    get()._logAction('prediction_window_toggled', { open });
  },

  submitAudiencePrediction: (audienceId, rankings) => {
    set(state => ({
      audiencePredictions: [
        ...state.audiencePredictions.filter(p => p.audienceId !== audienceId),
        { audienceId, rankings },
      ],
    }));
  },

  // --- Sound ---
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

  // --- Audit ---
  _logAction: (action, details) => {
    set(state => ({
      auditLog: [
        { id: `log-${Date.now()}`, actor: 'admin', action, details, createdAt: new Date().toISOString() },
        ...state.auditLog,
      ].slice(0, 200),
    }));
  },
  getAuditLog: () => get().auditLog,

  // --- Full Reset ---
  resetGame: () => set({
    ...initialState,
    zones: get().zones.map(z => ({ ...z, score: 0 })),
    auditLog: get().auditLog,
  }),
}),
    {
      name: 'afc_bible_giant_store',
      partialize: (state) => ({
        session: state.session,
        zones: state.zones,
        activeRound: state.activeRound,
        questions: state.questions,
        connectedTeams: state.connectedTeams,
        soundEnabled: state.soundEnabled,
        auditLog: state.auditLog,
      }),
    }
  )
);

export default useGameStore;
