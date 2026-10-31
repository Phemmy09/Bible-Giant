export type EventStatus =
  | 'setup'
  | 'predictions_open'
  | 'predictions_locked'
  | 'live'
  | 'finished';

export type RoundType = 'speed' | 'individual';

export type QuestionStatus =
  | 'hidden'
  | 'shown'
  | 'open'
  | 'locked'
  | 'revealed';

export type ScreenMode =
  | 'lobby'
  | 'predictions'
  | 'question'
  | 'answer'
  | 'leaderboard'
  | 'winner'
  | 'raffle'
  | 'blank';

export type OptionKey = 'A' | 'B' | 'C' | 'D' | 'E';

export interface QuestionOption {
  key: OptionKey;
  text: string;
}

export type AnswerMode = 'choice' | 'spoken';

export interface Event {
  id: string;
  owner_id: string;
  name: string;
  join_code: string;
  status: EventStatus;
  max_audience: number;
  created_at: string;
}

export interface Contestant {
  id: string;
  event_id: string;
  seat_no: number;
  name: string;
  group_label: string | null;
  photo_url: string | null;
  auth_user_id: string | null;
  claimed_at: string | null;
}

export interface AudienceMember {
  id: string;
  event_id: string;
  auth_user_id: string;
  display_name: string;
  phone?: string | null;
  region?: string | null;
  joined_at: string;
}

export interface Round {
  id: string;
  event_id: string;
  position: number;
  title: string;
  type: RoundType;
  max_points: number;
  min_points: number;
  time_limit_sec: number;
  wrong_penalty: number;
  first_correct_bonus: number;
  audience_can_answer: boolean;
}

export interface Question {
  id: string;
  event_id: string;
  round_id: string;
  position: number;
  body: string;
  options: QuestionOption[];
  scripture_ref: string | null;
  image_url: string | null;
  answer_mode: AnswerMode;
  assigned_contestant_id: string | null;
  points_override: number | null;
}

export interface QuestionKey {
  question_id: string;
  event_id: string;
  correct_key: OptionKey | null;
  explanation: string | null;
}

export interface GameState {
  event_id: string;
  current_round_id: string | null;
  current_question_id: string | null;
  question_status: QuestionStatus;
  screen: ScreenMode;
  opened_at: string | null;
  closes_at: string | null;
  version: number;
  updated_at: string;
}

export interface Answer {
  id: string;
  event_id: string;
  question_id: string;
  contestant_id: string | null;
  audience_id: string | null;
  choice_key: OptionKey | null;
  submitted_at: string;
  elapsed_ms: number | null;
  is_correct: boolean | null;
  points: number;
}

export interface Prediction {
  id: string;
  event_id: string;
  audience_id: string;
  contestant_id: string;
  updated_at: string;
}

export interface ContestantScore {
  contestant_id: string;
  event_id: string;
  total_points: number;
  correct_count: number;
  answered_count: number;
  correct_ms: number;
}

export interface AudienceScore {
  audience_id: string;
  event_id: string;
  display_name: string;
  phone?: string | null;
  region?: string | null;
  total_points: number;
  correct_count: number;
  answered_count: number;
  correct_ms: number;
}

export interface ScoreAdjustment {
  id: string;
  event_id: string;
  contestant_id: string;
  delta: number;
  reason: string;
  created_at: string;
}

export interface RaffleDraw {
  id: string;
  event_id: string;
  audience_id: string | null;
  winner_name: string;
  pool_kind: 'correct_predictors' | 'all_audience';
  pool_size: number;
  drawn_at: string;
}

