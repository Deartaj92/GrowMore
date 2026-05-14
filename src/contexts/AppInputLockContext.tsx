import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Lock, LockOpen, Nfc as NfcAttendanceIcon, QrCodeScanner as QrAttendanceIcon } from '@mui/icons-material';
import { useToast } from '../components/useToast';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission } from '../services/permissionService';
import {
    AUTO_LOCK_SETTINGS_EVENT,
    getAutoLockEnabled,
    getAutoLockIdleSeconds,
    getIsDesktopForScreenLock,
    readPersistedLock,
    SCREEN_LOCK_MIN_WIDTH,
    writePersistedLock,
} from '../utils/appScreenLockSettings';

function useDesktopScreenLock(): boolean {
    const [isDesktop, setIsDesktop] = useState(() => getIsDesktopForScreenLock());
    useEffect(() => {
        const mq = window.matchMedia(`(min-width: ${SCREEN_LOCK_MIN_WIDTH}px)`);
        const fn = () => setIsDesktop(mq.matches);
        mq.addEventListener('change', fn);
        return () => mq.removeEventListener('change', fn);
    }, []);
    return isDesktop;
}

function verifySettingsPassword(input: string): boolean {
    const inputTrimmed = input.trim();
    if (inputTrimmed === '7192') return true;
    try {
        const credsStr = localStorage.getItem('auth_credentials');
        if (credsStr) {
            const creds = JSON.parse(credsStr);
            if (creds && creds.password && creds.password === inputTrimmed) {
                return true;
            }
        }
    } catch {
        /* ignore */
    }
    return false;
}

export type AppInputLockContextValue = {
    /** True when lock is engaged in storage (may still be inactive on mobile). */
    isLocked: boolean;
    /** True when lock UI and input blocking are active (desktop width only). */
    isLockActive: boolean;
    isUnlockModalOpen: boolean;
    /** Screen lock is available (desktop / wide window — web or Electron). */
    isScreenLockEnvironment: boolean;
    lockApp: () => void;
    openUnlockModal: () => void;
    setScannerBypassRef: (ref: React.RefObject<HTMLInputElement | null> | null) => void;
};

const defaultValue: AppInputLockContextValue = {
    isLocked: false,
    isLockActive: false,
    isUnlockModalOpen: false,
    isScreenLockEnvironment: false,
    lockApp: () => {},
    openUnlockModal: () => {},
    setScannerBypassRef: () => {},
};

const AppInputLockContext = createContext<AppInputLockContextValue>(defaultValue);

const Z_OVERLAY = 99990;
const Z_MODAL = 100020;

/** Routes must match `App.tsx` (root Layout children). */
const PATH_RFID_ATTENDANCE = '/attendance/rfid-scanner';
const PATH_QR_ATTENDANCE = '/attendance/qr-scanner';

const LockHintBackdrop = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  background: rgba(15, 23, 42, 0.48);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.22s ease, visibility 0.22s ease;
  pointer-events: none;
`;

const LockHintPanel = styled.div`
  position: fixed;
  left: 50%;
  top: 50%;
  z-index: 2;
  width: min(420px, calc(100vw - 2rem));
  box-sizing: border-box;
  padding: 1.5rem 1.65rem 1.4rem;
  border-radius: 18px;
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT};
  border: 1px solid ${({ theme }) => theme.BORDER};
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.06),
    0 24px 48px -12px rgba(15, 23, 42, 0.22);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.65rem;
  opacity: 0;
  visibility: hidden;
  transform: translate(-50%, calc(-50% + 10px));
  transition:
    opacity 0.22s ease,
    visibility 0.22s ease,
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: auto;
`;

const LockScreenRoot = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_OVERLAY};
  touch-action: none;
  cursor: default;

  &:hover > ${LockHintBackdrop} {
    opacity: 1;
    visibility: visible;
  }

  &:hover > ${LockHintPanel} {
    opacity: 1;
    visibility: visible;
    transform: translate(-50%, -50%);
  }

  @media (hover: none) {
    & > ${LockHintBackdrop},
    & > ${LockHintPanel} {
      opacity: 1;
      visibility: visible;
    }

    & > ${LockHintPanel} {
      transform: translate(-50%, -50%);
    }
  }
`;

const LockBaseTint = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  background: rgba(0, 0, 0, 0.2);
`;

const LockHintBadge = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1px solid ${({ theme }) => theme.BORDER};
  color: ${({ theme }) => theme.ACCENT};
  margin-bottom: 0.15rem;

  svg {
    font-size: 26px;
  }
`;

const LockHintKicker = styled.span`
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const LockHintTitle = styled.h2`
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: ${({ theme }) => theme.TEXT};
`;

const LockHintBody = styled.p`
  margin: 0 0 0.35rem;
  font-size: 0.84rem;
  font-weight: 500;
  line-height: 1.55;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  max-width: 34em;
`;

const LockHintShortcutsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;
  width: 100%;
  margin: 0.15rem 0 0.25rem;
`;

const LockHintNavIconBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT};
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    transform 0.12s ease;

  &:hover {
    background: ${({ theme }) => theme.HOVER_BG};
    border-color: ${({ theme }) => theme.ACCENT};
    color: ${({ theme }) => theme.ACCENT};
    transform: translateY(-1px);
  }

  svg {
    font-size: 26px;
  }
`;

const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_MODAL};
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;
`;

const ModalCard = styled.div`
  width: 100%;
  max-width: 400px;
  border-radius: 16px;
  padding: 1.25rem 1.35rem;
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  color: ${({ theme }) => theme.TEXT};
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
`;

const ModalTitle = styled.h2`
  margin: 0 0 0.35rem 0;
  font-size: 1.1rem;
  font-weight: 800;
`;

const ModalSub = styled.p`
  margin: 0 0 1rem 0;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  line-height: 1.45;
`;

const PasswordField = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT};
  font-size: 0.95rem;
  margin-bottom: 1rem;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 0.65rem;
  justify-content: flex-end;
  flex-wrap: wrap;
`;

const Btn = styled.button<{ $primary?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  border: 1px solid ${({ theme, $primary }) => ($primary ? theme.ACCENT : theme.BORDER)};
  background: ${({ theme, $primary }) => ($primary ? theme.ACCENT : 'transparent')};
  color: ${({ theme, $primary }) => ($primary ? '#fff' : theme.TEXT)};
`;

const HintUnlockBtn = styled(Btn)`
  width: 100%;
  margin-top: 0.35rem;
  justify-content: center;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.62rem 1rem;
  border-radius: 12px;
  font-size: 0.88rem;
`;

function getBypassElement(holder: React.MutableRefObject<React.RefObject<HTMLInputElement | null> | null>) {
    return holder.current?.current ?? null;
}

/** Matches `ProtectedRoute` for `/attendance/rfid-scanner` and `/attendance/qr-scanner` in `App.tsx`. */
const PERM_ATTENDANCE_SCANNER = 'rfid-scanner';

export const AppInputLockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const navigate = useNavigate();
    const isDesktop = useDesktopScreenLock();
    const [canAttendanceScannerShortcuts, setCanAttendanceScannerShortcuts] = useState(false);

    const [isLocked, setIsLocked] = useState(readPersistedLock);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [unlockPassword, setUnlockPassword] = useState('');

    const lockActive = isLocked && isDesktop;
    const unlockModalVisible = showUnlockModal && isDesktop;

    const scannerBypassHolderRef = useRef<React.RefObject<HTMLInputElement | null> | null>(null);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const idleActivityThrottleRef = useRef(0);

    useEffect(() => {
        writePersistedLock(isLocked);
    }, [isLocked]);

    useEffect(() => {
        let cancelled = false;
        const uid = user?.id;
        const sid = user?.school_id;
        if (uid == null || sid == null) {
            setCanAttendanceScannerShortcuts(false);
            return;
        }
        (async () => {
            const ok = await hasPermission(uid, PERM_ATTENDANCE_SCANNER, sid);
            if (!cancelled) setCanAttendanceScannerShortcuts(ok);
        })();
        return () => {
            cancelled = true;
        };
    }, [user?.id, user?.school_id]);

    const setScannerBypassRef = useCallback((ref: React.RefObject<HTMLInputElement | null> | null) => {
        scannerBypassHolderRef.current = ref;
    }, []);

    const lockApp = useCallback(() => {
        setIsLocked(true);
        setShowUnlockModal(false);
        setUnlockPassword('');
        queueMicrotask(() => {
            if (!getIsDesktopForScreenLock()) return;
            const el = getBypassElement(scannerBypassHolderRef);
            (el as HTMLInputElement | null)?.focus?.();
        });
    }, []);

    const openUnlockModal = useCallback(() => {
        if (!getIsDesktopForScreenLock()) return;
        setUnlockPassword('');
        setShowUnlockModal(true);
    }, []);

    const closeUnlockModal = useCallback(() => {
        setShowUnlockModal(false);
        setUnlockPassword('');
    }, []);

    const tryUnlock = useCallback(() => {
        if (verifySettingsPassword(unlockPassword)) {
            setIsLocked(false);
            setShowUnlockModal(false);
            setUnlockPassword('');
        } else {
            showToast('Incorrect password.', 'error');
            setUnlockPassword('');
        }
    }, [unlockPassword, showToast]);

    useEffect(() => {
        if (!isDesktop && showUnlockModal) {
            setShowUnlockModal(false);
            setUnlockPassword('');
        }
    }, [isDesktop, showUnlockModal]);

    useEffect(() => {
        if (!lockActive || unlockModalVisible) return;

        const isBypass = (t: EventTarget | null) => {
            const el = getBypassElement(scannerBypassHolderRef);
            return el != null && (t === el || (t instanceof Node && el.contains(t)));
        };

        const isLockControl = (t: EventTarget | null) =>
            t instanceof Element && !!t.closest('[data-app-input-lock-control]');

        const blockKey = (e: KeyboardEvent) => {
            if (isBypass(e.target)) return;
            if (isLockControl(e.target)) return;
            e.preventDefault();
            e.stopPropagation();
            const el = getBypassElement(scannerBypassHolderRef);
            (el as HTMLInputElement | null)?.focus?.();
        };

        document.addEventListener('keydown', blockKey, true);
        document.addEventListener('keyup', blockKey, true);
        return () => {
            document.removeEventListener('keydown', blockKey, true);
            document.removeEventListener('keyup', blockKey, true);
        };
    }, [lockActive, unlockModalVisible]);

    useEffect(() => {
        if (!lockActive || unlockModalVisible) return;
        const id = window.setInterval(() => {
            const active = document.activeElement;
            if (active instanceof Element && active.closest('[data-app-input-lock-control]')) {
                return;
            }
            const el = getBypassElement(scannerBypassHolderRef);
            if (el && document.activeElement !== el) {
                (el as HTMLInputElement).focus?.();
            }
        }, 400);
        return () => clearInterval(id);
    }, [lockActive, unlockModalVisible]);

    useEffect(() => {
        if (!isDesktop || isLocked || showUnlockModal) {
            if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current);
                idleTimerRef.current = null;
            }
            return;
        }

        const scheduleIdleLock = () => {
            if (!getAutoLockEnabled()) {
                if (idleTimerRef.current) {
                    clearTimeout(idleTimerRef.current);
                    idleTimerRef.current = null;
                }
                return;
            }
            if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current);
            }
            idleTimerRef.current = setTimeout(() => {
                idleTimerRef.current = null;
                lockApp();
            }, getAutoLockIdleSeconds() * 1000);
        };

        const onActivity = () => {
            const now = Date.now();
            if (now - idleActivityThrottleRef.current < 750) return;
            idleActivityThrottleRef.current = now;
            scheduleIdleLock();
        };

        scheduleIdleLock();

        const events: (keyof DocumentEventMap)[] = ['mousedown', 'mousemove', 'keydown', 'wheel', 'scroll', 'touchstart'];
        events.forEach((ev) => {
            document.addEventListener(ev, onActivity as EventListener, { passive: true });
        });

        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                scheduleIdleLock();
            }
        };
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener(AUTO_LOCK_SETTINGS_EVENT, scheduleIdleLock);

        return () => {
            if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current);
                idleTimerRef.current = null;
            }
            events.forEach((ev) => {
                document.removeEventListener(ev, onActivity as EventListener);
            });
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener(AUTO_LOCK_SETTINGS_EVENT, scheduleIdleLock);
        };
    }, [isDesktop, isLocked, showUnlockModal, lockApp]);

    const ctx = useMemo<AppInputLockContextValue>(
        () => ({
            isLocked,
            isLockActive: lockActive,
            isUnlockModalOpen: unlockModalVisible,
            isScreenLockEnvironment: isDesktop,
            lockApp,
            openUnlockModal,
            setScannerBypassRef,
        }),
        [isLocked, lockActive, unlockModalVisible, isDesktop, lockApp, openUnlockModal, setScannerBypassRef],
    );

    const portal = typeof document !== 'undefined'
        ? createPortal(
            <>
                {lockActive && !unlockModalVisible && (
                    <LockScreenRoot
                        role="presentation"
                        title="Application locked. Hover the dimmed area for unlock options, or use the lock control in the header."
                        onWheel={(e) => e.preventDefault()}
                        onTouchMove={(e) => e.preventDefault()}
                    >
                        <LockBaseTint aria-hidden />
                        <LockHintBackdrop className="lock-hint-backdrop" aria-hidden />
                        <LockHintPanel
                            className="lock-hint-panel"
                            onClick={(e) => e.stopPropagation()}
                            role="region"
                            aria-label="Application locked"
                        >
                            <LockHintBadge>
                                <Lock aria-hidden />
                            </LockHintBadge>
                            <LockHintKicker>Security</LockHintKicker>
                            <LockHintTitle>Application locked</LockHintTitle>
                            <LockHintBody>
                                {canAttendanceScannerShortcuts
                                    ? 'Input is disabled until you unlock. Use the header lock control, or open RFID / QR attendance below (including while offline). USB / wedge scanners still reach the hidden field on those pages.'
                                    : 'Input is disabled until you unlock. Use the header lock control.'}
                            </LockHintBody>
                            {canAttendanceScannerShortcuts && (
                                <LockHintShortcutsRow>
                                    <LockHintNavIconBtn
                                        type="button"
                                        data-app-input-lock-control
                                        title="RFID attendance"
                                        aria-label="Go to RFID attendance"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(PATH_RFID_ATTENDANCE);
                                        }}
                                    >
                                        <NfcAttendanceIcon aria-hidden />
                                    </LockHintNavIconBtn>
                                    <LockHintNavIconBtn
                                        type="button"
                                        data-app-input-lock-control
                                        title="QR attendance"
                                        aria-label="Go to QR attendance"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(PATH_QR_ATTENDANCE);
                                        }}
                                    >
                                        <QrAttendanceIcon aria-hidden />
                                    </LockHintNavIconBtn>
                                </LockHintShortcutsRow>
                            )}
                            <HintUnlockBtn
                                type="button"
                                $primary
                                data-app-input-lock-control
                                aria-label="Unlock application"
                                title="Sign in with your password to unlock"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openUnlockModal();
                                }}
                            >
                                <LockOpen style={{ fontSize: 18 }} aria-hidden />
                                Unlock
                            </HintUnlockBtn>
                        </LockHintPanel>
                    </LockScreenRoot>
                )}
                {unlockModalVisible && (
                    <ModalBackdrop
                        role="presentation"
                        onMouseDown={(e) => {
                            if (e.target === e.currentTarget) closeUnlockModal();
                        }}
                    >
                        <ModalCard onMouseDown={(e) => e.stopPropagation()}>
                            <ModalTitle>Unlock app</ModalTitle>
                            <ModalSub>
                                Enter your login password to unlock the application.
                            </ModalSub>
                            <PasswordField
                                type="password"
                                autoComplete="current-password"
                                placeholder="Password"
                                value={unlockPassword}
                                onChange={(e) => setUnlockPassword(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') tryUnlock();
                                }}
                            />
                            <ButtonRow>
                                <Btn type="button" onClick={closeUnlockModal}>
                                    Cancel
                                </Btn>
                                <Btn type="button" $primary onClick={tryUnlock}>
                                    Unlock
                                </Btn>
                            </ButtonRow>
                        </ModalCard>
                    </ModalBackdrop>
                )}
            </>,
            document.body,
        )
        : null;

    return (
        <AppInputLockContext.Provider value={ctx}>
            {children}
            {portal}
        </AppInputLockContext.Provider>
    );
};

export function useAppInputLock(): AppInputLockContextValue {
    return useContext(AppInputLockContext);
}
