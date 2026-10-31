/**
 * Join code generator per docs/01-PRD.md §6.1 & docs/08-TEST-PLAN.md U-06.
 * Generates 5 characters uppercase alphanumeric, strictly excluding 0, O, 1, I, L.
 */
export const JOIN_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateJoinCode(): string {
  let code = '';
  for (let i = 0; i < 5; i++) {
    const idx = Math.floor(Math.random() * JOIN_CODE_CHARS.length);
    code += JOIN_CODE_CHARS[idx];
  }
  return code;
}

export function isValidJoinCode(code: string): boolean {
  if (!code || code.length !== 5) return false;
  const upper = code.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    if (!JOIN_CODE_CHARS.includes(upper[i])) return false;
  }
  return true;
}

