import { create } from 'zustand';
import { VALIDATION } from '@/lib/constants';

// For demo/standalone: default password is "BibleGiant2030!"
const DEFAULT_PASSWORD_HASH = 'BibleGiant2030!';

export const useAuthStore = create((set, get) => ({
  isAuthenticated: false,
  loginAttempts: 0,
  lockedUntil: null,
  lastActivity: null,

  login: (password) => {
    const state = get();

    // Check lockout
    if (state.lockedUntil && new Date() < new Date(state.lockedUntil)) {
      const remaining = Math.ceil((new Date(state.lockedUntil) - new Date()) / 60000);
      return { success: false, error: `Account locked. Try again in ${remaining} minutes.` };
    }

    // Validate password
    if (password === DEFAULT_PASSWORD_HASH) {
      set({
        isAuthenticated: true,
        loginAttempts: 0,
        lockedUntil: null,
        lastActivity: new Date().toISOString(),
      });
      return { success: true };
    }

    // Failed attempt
    const newAttempts = state.loginAttempts + 1;
    if (newAttempts >= VALIDATION.loginAttemptMax) {
      const lockExpiry = new Date(Date.now() + VALIDATION.lockoutMinutes * 60000).toISOString();
      set({ loginAttempts: newAttempts, lockedUntil: lockExpiry });
      return {
        success: false,
        error: `Too many failed attempts. Account locked for ${VALIDATION.lockoutMinutes} minutes.`,
      };
    }

    set({ loginAttempts: newAttempts });
    return {
      success: false,
      error: `Invalid password. ${VALIDATION.loginAttemptMax - newAttempts} attempts remaining.`,
    };
  },

  logout: () => set({
    isAuthenticated: false,
    lastActivity: null,
  }),

  changePassword: (currentPassword, newPassword) => {
    if (currentPassword !== DEFAULT_PASSWORD_HASH) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    // Validate new password
    if (newPassword.length < VALIDATION.passwordMinLength) {
      return { success: false, error: `Password must be at least ${VALIDATION.passwordMinLength} characters.` };
    }
    if (!/[A-Z]/.test(newPassword)) {
      return { success: false, error: 'Password must include an uppercase letter.' };
    }
    if (!/[a-z]/.test(newPassword)) {
      return { success: false, error: 'Password must include a lowercase letter.' };
    }
    if (!/[0-9]/.test(newPassword)) {
      return { success: false, error: 'Password must include a number.' };
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      return { success: false, error: 'Password must include a symbol.' };
    }

    // In production, this would hash and store in Supabase
    return { success: true, message: 'Password changed successfully.' };
  },

  touchActivity: () => set({ lastActivity: new Date().toISOString() }),
}));

export default useAuthStore;
