import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { rfidOfflineService } from '../services/rfidOfflineService';
import { normalizeDesktopScannerUid } from '../utils/rfidUtils';
import { useToast } from './useToast';
import { Capacitor } from '@capacitor/core';

const getLocalDateKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const GlobalNFCListener: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();

    const { showToast } = useToast();

    const lastScanRef = useRef<{ uid: string, time: number }>({ uid: '', time: 0 });

    const bufferRef = useRef('');
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const electronListenerAttachedRef = useRef(false);

    // Always track the current route so the closure has access to it
    const isAttendancePageRef = useRef(false);
    const isRfidCardAssignmentPageRef = useRef(false);
    useEffect(() => {
        isAttendancePageRef.current = location.pathname.includes('/rfid-scanner');
        isRfidCardAssignmentPageRef.current = location.pathname.includes('/rfid-cards');
    }, [location.pathname]);

    useEffect(() => {
        const schoolId = user?.school_id;
        if (!schoolId) return;

        let cancelled = false;

        const refreshAttendanceCaches = async () => {
            if (cancelled || !navigator.onLine) return;

            try {
                await rfidOfflineService.cacheMappings(String(schoolId));
                await rfidOfflineService.cacheDailyAttendanceHistory(schoolId, getLocalDateKey());
            } catch (error) {
                console.warn('Failed to refresh global RFID attendance caches:', error);
            }
        };

        refreshAttendanceCaches();

        const intervalId = window.setInterval(refreshAttendanceCaches, 60000);
        const handleOnline = () => {
            refreshAttendanceCaches();
        };

        window.addEventListener('online', handleOnline);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
            window.removeEventListener('online', handleOnline);
        };
    }, [user?.school_id]);

    const showElectronScanNotification = (payload: { title: string; body: string; silent?: boolean; imageUrl?: string }) => {
        if (window.electronAPI?.showRfidScanNotification) {
            window.electronAPI.showRfidScanNotification(payload);
        }
    };

    const processUID = async (rawUid: string, source: 'default' | 'electron-background' = 'default') => {
        if (!user?.school_id) return;
        if (isRfidCardAssignmentPageRef.current) return;

        const uid = rawUid.trim().toUpperCase();
        const now = Date.now();

        // Prevent scanning the exact same card multiple times within 2.5 seconds (debouncing)
        // But ALLOW completely different cards to be scanned instantly back-to-back
        if (lastScanRef.current.uid === uid && (now - lastScanRef.current.time) < 2500) {
            return;
        }

        lastScanRef.current = { uid, time: now };

        try {
            console.log('Global RFID/NFC Scan:', uid);
            const result = await rfidOfflineService.markAttendance(uid, user.school_id);

            // Notify RFID page
            window.dispatchEvent(new CustomEvent('rfid-scan-processed', {
                detail: { uid, result }
            }));

            if (isAttendancePageRef.current) return;

            const p = result.person;
            const timeStr = result.recorded_time
                ? new Date(result.recorded_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                : new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

            let type: 'success' | 'error' | 'warning' | 'info' = 'success';
            let title = '';
            let sub = '';

            if (result.type === 'error_checkout_early' && p) {
                type = 'warning';
                title = p.name;
                sub = 'Too Early to Check Out';
            } else if (result.type === 'error_inactive' && p) {
                type = 'error';
                const statusLabel = (p.status || 'inactive').replace('_', ' ');
                title = p.name;
                sub = `Not Active (${statusLabel})`;
            } else if (result.success && p) {
                let statusStr = 'Present';
                if (result.type === 'out') {
                    statusStr = 'Checked Out';
                    type = 'info';
                }
                else if (result.type === 'already') {
                    statusStr = 'Already Marked';
                    type = 'warning';
                }
                else if (result.type === 'already_out') {
                    statusStr = 'Already Left';
                    type = 'warning';
                }
                else if (result.attendance_status === 'late') {
                    statusStr = 'Late';
                    type = 'warning';
                }

                title = p.name;
                const personInfo = p.type === 'employee'
                    ? (p.role || 'Staff')
                    : `${p.class_name || 'N/A'}${p.section_name ? `-${p.section_name}` : ''}`;
                sub = `${statusStr} • ${personInfo} • ${timeStr}`;
            } else if (uid) {
                type = 'error';
                title = 'Unknown Card';
                sub = `UID: ${uid}`;
            }

            if (title) {
                showToast(`${title}: ${sub}`, type);
                if (source === 'electron-background') {
                    showElectronScanNotification({
                        title,
                        body: sub,
                        silent: false,
                        imageUrl: p?.picture_url,
                    });
                }
            }
        } catch (err) {
            console.error('Global NFC Handler Error:', err);
        }
    };

    // 1. Native NFC Listener (Mobile Android)
    useEffect(() => {
        if (!user?.school_id || !Capacitor.isNativePlatform() || isRfidCardAssignmentPageRef.current) {
            return;
        }

        const handleNativeScan = async (event: any) => {
            const tagId = event.tag && event.tag.id;
            if (!tagId) return;

            const uid = tagId
                .map((b: number) => {
                    const normalized = (b & 0xFF).toString(16).toUpperCase();
                    return normalized.length === 1 ? `0${normalized}` : normalized;
                })
                .join('');
            processUID(uid);
        };

        let listenerActive = false;
        const initNfc = () => {
            const nfc = (window as any).nfc;
            if (nfc) {
                if (!listenerActive) {
                    nfc.addTagDiscoveredListener(handleNativeScan,
                        () => {
                            console.log('Global NFC Listener Active');
                            listenerActive = true;
                        },
                        (err: any) => console.error('Failed to start global NFC:', err)
                    );
                }
            } else {
                setTimeout(initNfc, 1000);
            }
        };

        initNfc();

        return () => {
            const nfc = (window as any).nfc;
            if (nfc && listenerActive) {
                nfc.removeTagDiscoveredListener(handleNativeScan);
            }
        };
    }, [location.pathname, user?.school_id]);

    // 2. USB RFID Keyboard Wedge Listener (Web / Desktop / USB OTG)
    useEffect(() => {
        if (!user?.school_id || isRfidCardAssignmentPageRef.current) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (isAttendancePageRef.current || isRfidCardAssignmentPageRef.current) return;

            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                return;
            }

            if (e.key === 'Shift' || e.key === 'CapsLock' || e.key === 'Alt' || e.key === 'Control') return;

            if (e.key === 'Enter') {
                const uid = normalizeDesktopScannerUid(bufferRef.current);
                bufferRef.current = '';
                if (timerRef.current) clearTimeout(timerRef.current);
                if (uid.length >= 4) processUID(uid);
            } else if (e.key.length === 1) {
                bufferRef.current += e.key;
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    const uid = normalizeDesktopScannerUid(bufferRef.current);
                    bufferRef.current = '';
                    if (uid.length >= 4) processUID(uid);
                }, 120);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [location.pathname, user?.school_id]);

    useEffect(() => {
        if (!user?.school_id || !window.electronAPI?.onRfidScan) return;
        if (electronListenerAttachedRef.current) return;

        window.electronAPI.onRfidScan((uid: string) => {
            processUID(uid, 'electron-background');
        });
        electronListenerAttachedRef.current = true;
    }, [user?.school_id]);

    return null;
};

export default GlobalNFCListener;
