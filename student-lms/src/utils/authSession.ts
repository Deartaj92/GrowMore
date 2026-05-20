import type { StudentSession } from '../types/studentSession';

const SESSION_KEY = 'lms_student_session_v1';
const LEGACY_SESSION_KEY = 'studentSession';

type StoredSessionPayload = {
  version: 1;
  savedAt: number;
  profile: StudentSession;
};

const isValidProfile = (value: unknown): value is StudentSession => {
  if (!value || typeof value !== 'object') return false;
  const p = value as StudentSession;
  return typeof p.id === 'number' && p.id > 0 && typeof p.school_id === 'number';
};

const parseLegacyProfile = (raw: string): StudentSession | null => {
  try {
    const data = JSON.parse(raw) as StudentSession;
    if (!isValidProfile(data)) return null;
    return { ...data, isStudent: true };
  } catch {
    return null;
  }
};

export const loadStoredSession = (): StudentSession | null => {
  try {
    const current = localStorage.getItem(SESSION_KEY);
    if (current) {
      const payload = JSON.parse(current) as StoredSessionPayload;
      if (payload?.version === 1 && isValidProfile(payload.profile)) {
        return payload.profile;
      }
    }

    const legacy = localStorage.getItem(LEGACY_SESSION_KEY);
    if (legacy) {
      const profile = parseLegacyProfile(legacy);
      if (profile) {
        saveStoredSession(profile);
        localStorage.removeItem(LEGACY_SESSION_KEY);
        return profile;
      }
    }
  } catch (e) {
    console.warn('Failed to read stored student session', e);
  }
  return null;
};

export const saveStoredSession = (profile: StudentSession): void => {
  try {
    const payload: StoredSessionPayload = {
      version: 1,
      savedAt: Date.now(),
      profile: { ...profile, isStudent: true },
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch (e) {
    console.warn('Failed to save student session', e);
  }
};

export const clearStoredSession = (): void => {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch (e) {
    console.warn('Failed to clear student session', e);
  }
};
