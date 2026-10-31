// AFC Bible Giant — PRD-Defined Constants & Brand Canon
// All mottoes, scriptures, addresses, and brand copy MUST use these constants — never hardcoded strings.

export const BRAND = {
  appName: 'Who Wants to Be a Bible Giant',
  shortName: 'AFC Bible Giant',
  churchName: 'The Apostolic Faith Church',
  areaName: 'Apostolic Faith Church Ekiti Area',
  areaHQ: '74 Ajilosun St, Ado-Ekiti, Ekiti State, Nigeria',
  wecaName: 'AFM WECA',
  wecaHQ: 'Faith City Igbesa / Anthony Village, Lagos',
  internationalHQ: 'Portland, Oregon, USA',
  yddName: 'Youth Development Directorate',
};

export const MOTTOES = {
  lightOfTheWorld: {
    text: 'Jesus, The Light of the World',
    scripture: 'John 8:12',
  },
  africaForChrist: {
    text: 'Africa for Christ',
    scripture: 'Mark 16:15',
  },
  yddSlogan: 'Raising & retaining an Army of Outstanding Youth going to Heaven & persuading others to come along.',
};

export const ROUNDS = {
  1: { label: 'Round 1', type: 'objective', description: 'Objective — bracketed options' },
  2: { label: 'Round 2', type: 'objective', description: 'Objective — bracketed options' },
  3: { label: 'Round 3', type: 'objective', description: 'Objective — bracketed options' },
  4: { label: 'Round 4', type: 'german_gap_fill', description: 'German — fill-in-the-gap' },
  5: { label: 'Round 5', type: 'theory_open', description: 'Theory/Open — no options' },
  6: { label: 'Ultimate Challenge', type: 'ultimate_challenge', description: '60-second bonus round' },
};

export const ULTIMATE_CHALLENGE = {
  timerDurationMs: 60000,
  timerDurationSec: 60,
  questionsPerAttempt: 10,
  pointsPerQuestion: 5,
  maxSubtotal: 50,
  ladderSteps: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
};

export const SCORING = {
  standardPointsPerCorrect: 1,     // For legacy board mode
  speedWeighted: {
    maxCorrectPoints: 1000,
    minCorrectPoints: 300,
    defaultTimeLimitMs: 20000,
  },
};

export const SESSION_PHASES = {
  LOBBY: 'lobby',
  IN_PROGRESS: 'in_progress',
  ULTIMATE_CHALLENGE: 'ultimate_challenge',
  PODIUM: 'podium',
  ENDED: 'ended',
};

export const TILE_STATES = {
  HIDDEN: 'hidden',
  ACTIVE: 'active',
  USED: 'used',
  REMOVED: 'removed',
};

export const QUESTION_TYPES = {
  OBJECTIVE: 'objective',
  GERMAN: 'german',
  THEORY: 'theory',
};

export const ENGINE_MODES = {
  LEGACY_BOARD: 'legacy_board',
  DIGITAL_LIVE: 'digital_live',
};

export const VALIDATION = {
  passwordMinLength: 12,
  questionTextMax: 500,
  zoneNameMax: 30,
  zoneNameMin: 1,
  minZones: 2,
  maxZones: 8,
  scoreReasonMinLength: 5,
  docxMaxSizeMB: 10,
  loginAttemptMax: 5,
  lockoutMinutes: 15,
};

export const SOUND_CUES = {
  SUSPENSE_DRONE: 'suspense_drone',
  CORRECT_CHIME: 'correct_chime',
  INCORRECT_BUZZ: 'incorrect_buzz',
  FANFARE: 'fanfare',
  APPLAUSE: 'applause',
  METRONOME_TICK: 'metronome_tick',
  UC_TICK: 'uc_tick',
  TIMER_LOCK_THUD: 'timer_lock_thud',
  WHEEL_SPIN: 'wheel_spin',
  WHEEL_LAND: 'wheel_land',
  PODIUM_DRUM_ROLL: 'podium_drum_roll',
  PODIUM_REVEAL: 'podium_reveal',
};

// Zone colors for visual identity (spinner wheel, scoreboard highlights)
export const ZONE_COLORS = [
  { bg: '#C5A44E', text: '#060B19', label: 'Gold' },
  { bg: '#3498DB', text: '#FFFFFF', label: 'Royal Blue' },
  { bg: '#E74C3C', text: '#FFFFFF', label: 'Crimson' },
  { bg: '#27AE60', text: '#FFFFFF', label: 'Emerald' },
  { bg: '#9B59B6', text: '#FFFFFF', label: 'Purple' },
  { bg: '#F39C12', text: '#060B19', label: 'Amber' },
  { bg: '#1ABC9C', text: '#060B19', label: 'Teal' },
  { bg: '#E67E22', text: '#FFFFFF', label: 'Orange' },
];

// Default demo data for standalone testing
export const DEMO_ZONES = [
  { id: 'z-ido', name: 'IDO', score: 12 },
  { id: 'z-igede', name: 'IGEDE', score: 9 },
  { id: 'z-emure', name: 'EMURE', score: 15 },
  { id: 'z-ado', name: 'ADO', score: 6 },
  { id: 'z-ijero', name: 'IJERO', score: 10 },
];

export const DEMO_QUESTIONS = [
  {
    id: 'q-1',
    type: 'objective',
    questionText: 'Who was Isaac\'s favorite son? (25:28)',
    options: [
      { id: 'A', text: 'Jacob' },
      { id: 'B', text: 'Esau' },
      { id: 'C', text: 'Joseph' },
      { id: 'D', text: 'Reuben' },
    ],
    correctAnswer: 'B',
    scriptureReference: 'Genesis 25:28',
  },
  {
    id: 'q-2',
    type: 'objective',
    questionText: 'How many sons did Jacob have? (35:22)',
    options: [
      { id: 'A', text: '10' },
      { id: 'B', text: '12' },
      { id: 'C', text: '8' },
      { id: 'D', text: '14' },
    ],
    correctAnswer: 'B',
    scriptureReference: 'Genesis 35:22',
  },
  {
    id: 'q-3',
    type: 'german',
    questionText: 'And ____ said to the ____ and ____ of the ____.',
    gaps: { wordBank: ['magicians', 'Chaldeans', 'Nebuchadnezzar', 'sorcerers'] },
    correctAnswer: 'Nebuchadnezzar, magicians, sorcerers, Chaldeans',
    scriptureReference: 'Daniel 2:2',
  },
  {
    id: 'q-4',
    type: 'theory',
    questionText: 'What did Jacob do at his birth? (25:26)',
    correctAnswer: 'He took hold of Esau\'s heel',
    scriptureReference: 'Genesis 25:26',
  },
];
