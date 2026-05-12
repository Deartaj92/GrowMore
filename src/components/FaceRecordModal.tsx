import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CircularProgress } from '@mui/material';
import { Close, Face as FaceIcon, PhotoCamera } from '@mui/icons-material';
import { captureFaceDescriptorFromVideo, loadFaceRecognitionModels } from '../services/faceRecognitionWeb';
import { saveStaffFaceEmbedding, saveStudentFaceEmbedding } from '../services/faceEmbeddingSync';
import { useToast } from './useToast';

type PersonKind = 'student' | 'employee';

type Props = {
    open: boolean;
    personKind: PersonKind;
    personId: number | null;
    schoolId: number;
    personName: string;
    onClose: () => void;
    onSaved: () => void;
};

const FaceRecordModal: React.FC<Props> = ({
    open,
    personKind,
    personId,
    schoolId,
    personName,
    onClose,
    onSaved,
}) => {
    const toast = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [busy, setBusy] = useState(false);
    const [models, setModels] = useState(false);

    const stopStream = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
    }, []);

    useEffect(() => {
        if (!open || !personId) {
            stopStream();
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                await loadFaceRecognitionModels();
                if (cancelled) return;
                setModels(true);
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                    audio: false,
                });
                if (cancelled) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
            } catch (e: any) {
                toast.showToast('Camera: ' + (e?.message || 'failed'), 'error');
            }
        })();

        return () => {
            cancelled = true;
            stopStream();
        };
    }, [open, personId, stopStream, toast]);

    const handleSave = async () => {
        if (!personId || !videoRef.current) return;
        setBusy(true);
        try {
            const desc = await captureFaceDescriptorFromVideo(videoRef.current);
            if (!desc) {
                toast.showToast('No clear face detected. Center your face and try again.', 'error');
                return;
            }
            if (personKind === 'employee') {
                await saveStaffFaceEmbedding(personId, schoolId, desc);
            } else {
                await saveStudentFaceEmbedding(personId, schoolId, desc);
            }
            toast.showToast('Face profile saved (compact embedding only).', 'success');
            onSaved();
            onClose();
        } catch (e: any) {
            toast.showToast(e?.message || 'Save failed', 'error');
        } finally {
            setBusy(false);
        }
    };

    if (!open || !personId) return null;

    const roleLabel = personKind === 'employee' ? 'Staff' : 'Student';

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.55)',
                zIndex: 12000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#1e293b',
                    color: '#f8fafc',
                    borderRadius: 12,
                    maxWidth: 420,
                    width: '100%',
                    padding: '1rem',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FaceIcon style={{ color: '#a855f7' }} />
                    Record face ({roleLabel}) — {personName}
                </h3>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.35 }}>
                    Stores a small numeric face template (~512 bytes) for matching — not a photo. First use downloads face models (~6 MB once, then cached).
                </p>
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    style={{ width: '100%', maxHeight: 260, borderRadius: 8, background: '#000', marginTop: 10, objectFit: 'cover' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button type="button" onClick={onClose} disabled={busy} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #475569', background: 'transparent', color: '#e2e8f0', cursor: 'pointer' }}>
                        <Close style={{ fontSize: 18, verticalAlign: 'middle' }} /> Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={busy || !models}
                        style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#a855f7', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                    >
                        {busy ? <CircularProgress size={16} color="inherit" /> : <PhotoCamera style={{ fontSize: 18, verticalAlign: 'middle' }} />}
                        {' '}Save face
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FaceRecordModal;
