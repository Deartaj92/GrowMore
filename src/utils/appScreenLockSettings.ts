/** Minimum viewport width (px) for screen lock — matches layout “desktop” breakpoint. */
export const SCREEN_LOCK_MIN_WIDTH = 701;

export const LOCK_PERSIST_KEY = 'growmore_app_screen_lock_v1';
export const AUTO_LOCK_ENABLED_KEY = 'growmore_auto_lock_enabled';
/** Current storage: idle duration in seconds. */
export const AUTO_LOCK_IDLE_SECONDS_KEY = 'growmore_auto_lock_idle_seconds';
/** Legacy key (minutes); migrated on read into {@link AUTO_LOCK_IDLE_SECONDS_KEY}. */
export const AUTO_LOCK_MINUTES_KEY = 'growmore_auto_lock_idle_minutes';
export const AUTO_LOCK_SETTINGS_EVENT = 'growmore-auto-lock-settings';

/** Allowed idle durations before auto-lock (seconds). */
export const AUTO_LOCK_IDLE_SECOND_OPTIONS = [30, 60, 120, 300, 600, 900, 1800, 3600] as const;

const LEGACY_MINUTE_OPTIONS = [5, 10, 15, 30, 60] as const;

function isAllowedIdleSeconds(n: number): n is (typeof AUTO_LOCK_IDLE_SECOND_OPTIONS)[number] {
    return (AUTO_LOCK_IDLE_SECOND_OPTIONS as readonly number[]).includes(n);
}

/** Human-readable label for settings UI and menus. */
export function formatAutoLockIdleLabel(seconds: number): string {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds % 60 !== 0) return `${seconds} seconds`;
    const m = seconds / 60;
    return m === 1 ? '1 minute' : `${m} minutes`;
}

export function getIsDesktopForScreenLock(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(min-width: ${SCREEN_LOCK_MIN_WIDTH}px)`).matches;
}

export function readPersistedLock(): boolean {
    try {
        return localStorage.getItem(LOCK_PERSIST_KEY) === '1';
    } catch {
        return false;
    }
}

export function writePersistedLock(locked: boolean): void {
    try {
        if (locked) {
            localStorage.setItem(LOCK_PERSIST_KEY, '1');
        } else {
            localStorage.removeItem(LOCK_PERSIST_KEY);
        }
    } catch {
        /* ignore */
    }
}

export function getAutoLockEnabled(): boolean {
    try {
        return localStorage.getItem(AUTO_LOCK_ENABLED_KEY) === '1';
    } catch {
        return false;
    }
}

export function setAutoLockEnabled(enabled: boolean): void {
    try {
        if (enabled) {
            localStorage.setItem(AUTO_LOCK_ENABLED_KEY, '1');
        } else {
            localStorage.removeItem(AUTO_LOCK_ENABLED_KEY);
        }
    } catch {
        /* ignore */
    }
    dispatchAutoLockSettingsChanged();
}

/** Idle duration before auto-lock (seconds). Migrates legacy minute storage. */
export function getAutoLockIdleSeconds(): number {
    const defaultSeconds = 600;
    try {
        const secRaw = localStorage.getItem(AUTO_LOCK_IDLE_SECONDS_KEY);
        if (secRaw != null && secRaw !== '') {
            const n = parseInt(secRaw, 10);
            if (!Number.isNaN(n) && isAllowedIdleSeconds(n)) return n;
        }

        const minRaw = localStorage.getItem(AUTO_LOCK_MINUTES_KEY);
        if (minRaw != null && minRaw !== '') {
            const minutes = parseInt(minRaw, 10);
            if (!Number.isNaN(minutes) && (LEGACY_MINUTE_OPTIONS as readonly number[]).includes(minutes)) {
                const migrated = minutes * 60;
                if (isAllowedIdleSeconds(migrated)) {
                    try {
                        localStorage.setItem(AUTO_LOCK_IDLE_SECONDS_KEY, String(migrated));
                        localStorage.removeItem(AUTO_LOCK_MINUTES_KEY);
                    } catch {
                        /* ignore */
                    }
                    return migrated;
                }
            }
        }
    } catch {
        /* ignore */
    }
    return defaultSeconds;
}

export function setAutoLockIdleSeconds(seconds: number): void {
    const v = isAllowedIdleSeconds(seconds) ? seconds : 600;
    try {
        localStorage.setItem(AUTO_LOCK_IDLE_SECONDS_KEY, String(v));
        localStorage.removeItem(AUTO_LOCK_MINUTES_KEY);
    } catch {
        /* ignore */
    }
    dispatchAutoLockSettingsChanged();
}

export function dispatchAutoLockSettingsChanged(): void {
    try {
        window.dispatchEvent(new Event(AUTO_LOCK_SETTINGS_EVENT));
    } catch {
        /* ignore */
    }
}

/** Legacy preset list (whole minutes). Prefer {@link AUTO_LOCK_IDLE_SECOND_OPTIONS}. */
export const AUTO_LOCK_MINUTE_OPTIONS = [5, 10, 15, 30, 60] as const;

/**
 * @deprecated Prefer {@link getAutoLockIdleSeconds}. Returns fractional minutes so
 * `getAutoLockMinutes() * 60 * 1000` still matches the configured idle duration (e.g. 30s → 0.5).
 */
export function getAutoLockMinutes(): number {
    return getAutoLockIdleSeconds() / 60;
}

/** @deprecated Prefer {@link setAutoLockIdleSeconds}. */
export function setAutoLockMinutes(minutes: number): void {
    const opts = AUTO_LOCK_MINUTE_OPTIONS as readonly number[];
    const m = opts.includes(minutes) ? minutes : 10;
    setAutoLockIdleSeconds(m * 60);
}
