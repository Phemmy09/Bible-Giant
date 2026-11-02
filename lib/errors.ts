/**
 * Error code to plain English mapping per docs/02-ARCHITECTURE.md §10.
 */
export const ERROR_MESSAGES: Record<string, string> = {
  closed: 'This question is closed for answers.',
  late: 'Time is up! Your answer arrived after the deadline.',
  already_answered: 'You have already answered this question.',
  not_joined: 'Please sign in or join the event first.',
  not_your_question: 'This question is assigned to another contestant.',
  bad_pin: 'Wrong PIN. Please try again.',
  locked_out: 'Too many attempts — ask the operator to reset your PIN.',
  audience_full: 'This event is full.',
  no_event: 'We could not find that code.',
  not_owner: 'Only the operator can perform this action.',
  bad_name: 'Please enter a valid name (1–30 characters).',
  bad_assembly: 'Please enter a valid assembly or church name (1–60 characters).',
  bad_phone: 'Please enter a valid phone number (7–20 digits).',
  bad_question: 'Invalid question format. Please check the required fields.',
  bad_seat: 'Invalid seat number (must be 1–8).',
  seat_taken: 'This seat has already been added.',
  bad_state: 'Action not allowed in the current state.',
  no_key: 'This question does not have a correct answer key set.',
  already_played: 'This question has already been answered.',
  spoken: 'This question is answered aloud; the operator will mark it.',
  bad_choice: 'Invalid answer option.',
  bad_reason: 'Please enter a reason with at least 3 characters.',
  no_audience: 'No eligible audience members remaining for the raffle.',
};

export const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export function getErrorMessage(code: string | undefined | null): string {
  if (!code) return DEFAULT_ERROR_MESSAGE;
  return ERROR_MESSAGES[code] || DEFAULT_ERROR_MESSAGE;
}

