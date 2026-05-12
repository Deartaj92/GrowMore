import { useCallback, useEffect, useRef, useState } from 'react';
import {
    captureFaceDescriptorFromVideo,
    loadFaceRecognitionModels,
    matchFaceToPerson,
} from '../services/faceRecognitionWeb';
import { syncFaceEmbeddingsFromServer } from '../services/faceEmbeddingSync';
import { rfidOfflineService } from '../services/rfidOfflineService';
import { fetchStaffForFaceMark, fetchStudentForFaceMark } from '../services/faceAttendancePerson';

const LS_KEY = 'qr_attendance_face_on';

/** Slightly looser than 0.52 so real-world lighting still matches enrolled templates. */
const FACE_MATCH_MAX_DISTANCE = 0.58;

type ShowToast = (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;

function waitForVideoFrame(video: HTMLVideoElement, timeoutMs = 10000): Promise<boolean> {
    if (video.videoWidth > 0 && video.videoHeight > 0) return Promise.resolve(true);
    return new Promise(resolve => {
        const done = (ok: boolean) => {
            clearTimeout(timer);
            video.removeEventListener('loadeddata', onLoaded);
            video.removeEventListener('loadedmetadata', onLoaded);
            resolve(ok);
        };
        const onLoaded = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0) done(true);
        };
        const timer = window.setTimeout(() => done(false), timeoutMs);
        video.addEventListener('loadeddata', onLoaded);
        video.addEventListener('loadedmetadata', onLoaded);
        onLoaded();
    });
}

type Params = {
    schoolId: number | undefined;
    selectedDate: string;
    faceEnabled: boolean;
    stopCameraScanner: () => Promise<void>;
    /** Same entry point as QR / USB scans */
    processUID: (uid: string) => void;
    showToast?: ShowToast;
};

export function useQrAttendanceFace({
    schoolId,
    selectedDate,
    faceEnabled,
    stopCameraScanner,
    processUID,
    showToast,
}: Params) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const librariesRef = useRef({
        students: new Map<number, Float32Array>(),
        staff: new Map<number, Float32Array>(),
    });
    const lastHitRef = useRef<{ key: string; t: number } | null>(null);
    const [faceStatus, setFaceStatus] = useState('');
    const [syncing, setSyncing] = useState(false);

    const stopFaceStream = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
    }, []);

    useEffect(() => {
        if (!faceEnabled) {
            stopFaceStream();
            setFaceStatus('');
            return;
        }

        void stopCameraScanner();
        if (!schoolId) return;

        let cancelled = false;
        let interval: ReturnType<typeof setInterval> | null = null;

        (async () => {
            setSyncing(true);
            setFaceStatus('Syncing face profiles…');
            try {
                const libs = await syncFaceEmbeddingsFromServer(schoolId);
                if (cancelled) return;
                librariesRef.current = libs;
                const n = libs.students.size + libs.staff.size;
                const parts: string[] = [];
                if (libs.students.size) parts.push(`${libs.students.size} students`);
                if (libs.staff.size) parts.push(`${libs.staff.size} staff`);
                setFaceStatus(n ? `Face ready (${parts.join(', ')})` : 'No enrolled faces yet');
                await loadFaceRecognitionModels();
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                    audio: false,
                });
                if (cancelled) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                streamRef.current = stream;
                const v = videoRef.current;
                if (v) {
                    v.srcObject = stream;
                    try {
                        await v.play();
                    } catch {
                        /* autoplay policies */
                    }
                    const sized = await waitForVideoFrame(v);
                    if (cancelled) return;
                    if (!sized) {
                        const msg =
                            'Front camera has no video size yet. Allow camera, use HTTPS, and ensure no other app is using the camera.';
                        setFaceStatus(msg);
                        showToast?.(msg, 'warning');
                    }
                } else {
                    const msg = 'Face camera element is not ready. Toggle face mode off and on again.';
                    setFaceStatus(msg);
                    showToast?.(msg, 'warning');
                }

                interval = setInterval(async () => {
                    try {
                        const video = videoRef.current;
                        if (!video || !video.videoWidth || !video.videoHeight) return;

                        const { students, staff } = librariesRef.current;
                        if (!students.size && !staff.size) return;

                        const desc = await captureFaceDescriptorFromVideo(video);
                        if (!desc) return;

                        const hit = matchFaceToPerson(desc, students, staff, FACE_MATCH_MAX_DISTANCE);
                        if (!hit) return;

                        const dedupeKey = `${hit.kind}:${hit.id}`;
                        const now = Date.now();
                        const prev = lastHitRef.current;
                        if (prev && prev.key === dedupeKey && now - prev.t < 4500) return;
                        lastHitRef.current = { key: dedupeKey, t: now };

                        const person =
                            hit.kind === 'student'
                                ? await fetchStudentForFaceMark(hit.id, schoolId)
                                : await fetchStaffForFaceMark(hit.id, schoolId);
                        if (!person) {
                            showToast?.(
                                'Face matched but profile could not be loaded (permissions or network). Try again or re-save face on Assign page.',
                                'error'
                            );
                            return;
                        }
                        const uid = (person.rfid_uid || '').trim();
                        if (uid.length >= 4) {
                            processUID(uid);
                        } else {
                            const result = await rfidOfflineService.markAttendanceWithPerson(person, schoolId, selectedDate);
                            window.dispatchEvent(
                                new CustomEvent('rfid-scan-processed', {
                                    detail: { uid: `face:${dedupeKey}`, result },
                                })
                            );
                        }
                    } catch (err: any) {
                        console.error('Face attendance tick:', err);
                        const msg = err?.message || 'Face attendance error';
                        setFaceStatus(msg);
                        showToast?.(msg, 'error');
                    }
                }, 2000);
            } catch (e: any) {
                if (!cancelled) {
                    const msg = e?.message || 'Face setup failed';
                    setFaceStatus(msg);
                    showToast?.(msg, 'error');
                }
            } finally {
                if (!cancelled) setSyncing(false);
            }
        })();

        return () => {
            cancelled = true;
            if (interval) clearInterval(interval);
            stopFaceStream();
        };
    }, [faceEnabled, schoolId, selectedDate, processUID, stopCameraScanner, stopFaceStream, showToast]);

    return { faceVideoRef: videoRef, faceStatus, faceSyncing: syncing };
}

export function readFaceToggleFromStorage(): boolean {
    try {
        return localStorage.getItem(LS_KEY) === '1';
    } catch {
        return false;
    }
}

export function writeFaceToggleToStorage(on: boolean): void {
    try {
        localStorage.setItem(LS_KEY, on ? '1' : '0');
    } catch {
        /* ignore */
    }
}
