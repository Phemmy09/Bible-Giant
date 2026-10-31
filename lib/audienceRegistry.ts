export interface RegisteredAudience {
  id: string;
  event_id: string;
  name: string;
  phone: string;
  region: string;
  total_points: number;
  correct_count: number;
  answered_count: number;
  correct_ms: number;
  joined_at: string;
  answers: Array<{
    question_id: string;
    choice_key: string;
    is_correct: boolean;
    points: number;
    elapsed_ms: number;
    submitted_at: string;
  }>;
}

// In-memory persistent registry for server-side state
const globalAudienceRegistry = new Map<string, RegisteredAudience>();

export function registerAudienceMember(data: {
  id?: string;
  event_id: string;
  name: string;
  phone: string;
  region?: string;
}): RegisteredAudience {
  const id = data.id || `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const existing = Array.from(globalAudienceRegistry.values()).find(
    (a) => a.phone === data.phone && a.event_id === data.event_id
  );

  if (existing) {
    existing.name = data.name;
    existing.region = data.region || existing.region;
    return existing;
  }

  const record: RegisteredAudience = {
    id,
    event_id: data.event_id,
    name: data.name,
    phone: data.phone,
    region: data.region || 'General',
    total_points: 0,
    correct_count: 0,
    answered_count: 0,
    correct_ms: 0,
    joined_at: new Date().toISOString(),
    answers: [],
  };

  globalAudienceRegistry.set(id, record);
  return record;
}

export function recordAudienceAnswer(data: {
  audience_id: string;
  question_id: string;
  choice_key: string;
  is_correct: boolean;
  points: number;
  elapsed_ms: number;
}) {
  const member = globalAudienceRegistry.get(data.audience_id);
  if (!member) return null;

  // Prevent duplicate answer for same question
  const existingAnswer = member.answers.find((a) => a.question_id === data.question_id);
  if (existingAnswer) return member;

  member.answers.push({
    question_id: data.question_id,
    choice_key: data.choice_key,
    is_correct: data.is_correct,
    points: data.points,
    elapsed_ms: data.elapsed_ms,
    submitted_at: new Date().toISOString(),
  });

  member.answered_count += 1;
  if (data.is_correct) {
    member.correct_count += 1;
    member.total_points += data.points;
    member.correct_ms += data.elapsed_ms;
  }

  return member;
}

export function getAudienceLeaderboard(eventId: string): RegisteredAudience[] {
  const list = Array.from(globalAudienceRegistry.values()).filter(
    (a) => a.event_id === eventId
  );

  return list.sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    if (b.correct_count !== a.correct_count) return b.correct_count - a.correct_count;
    if (a.correct_ms !== b.correct_ms) return a.correct_ms - b.correct_ms;
    return a.name.localeCompare(b.name);
  });
}

export function getAllAudienceMembers(eventId: string): RegisteredAudience[] {
  return Array.from(globalAudienceRegistry.values()).filter(
    (a) => a.event_id === eventId
  );
}

