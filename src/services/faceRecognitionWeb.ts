import * as faceapi from 'face-api.js';
import { FACE_EMBEDDING_DIM } from '../utils/faceEmbeddingBytes';

/**
 * face-api.js npm package does not ship weight files on jsDelivr under /weights/ (404).
 * Official weights live in the source repo; raw.githubusercontent.com serves them reliably.
 * Override with REACT_APP_FACE_API_WEIGHTS_URL (no trailing slash) to self-host under public/.
 */
const MODEL_BASE = (
    (typeof process !== 'undefined' && process.env?.REACT_APP_FACE_API_WEIGHTS_URL) ||
    'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'
).replace(/\/$/, '');

let modelsLoading: Promise<void> | null = null;

export async function loadFaceRecognitionModels(): Promise<void> {
    if (modelsLoading) return modelsLoading;
    modelsLoading = (async () => {
        try {
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_BASE);
            await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_BASE);
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_BASE);
        } catch (e) {
            modelsLoading = null;
            throw e;
        }
    })();
    await modelsLoading;
}

export async function captureFaceDescriptorFromVideo(video: HTMLVideoElement): Promise<Float32Array | null> {
    if (!video.videoWidth || !video.videoHeight) return null;
    await loadFaceRecognitionModels();
    const det = await faceapi
        .detectSingleFace(
            video,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.45 })
        )
        .withFaceLandmarks(true)
        .withFaceDescriptor();
    if (!det?.descriptor) return null;
    if (det.descriptor.length !== FACE_EMBEDDING_DIM) return null;
    return det.descriptor;
}

/**
 * @param maxDistance face-api typical threshold ~0.45–0.55 for same person (L2 on 128-d).
 */
export function matchFaceToStudentId(
    live: Float32Array,
    library: Map<number, Float32Array>,
    maxDistance = 0.52
): { studentId: number; distance: number } | null {
    let bestId: number | null = null;
    let bestD = Infinity;
    library.forEach((emb, id) => {
        const d = faceapi.euclideanDistance(live, emb);
        if (d < bestD) {
            bestD = d;
            bestId = id;
        }
    });
    if (bestId == null || bestD > maxDistance) return null;
    return { studentId: bestId, distance: bestD };
}

export type FacePersonMatch =
    | { kind: 'student'; id: number; distance: number }
    | { kind: 'employee'; id: number; distance: number };

/** Best match across student and staff embedding libraries (IDs are in separate namespaces). */
export function matchFaceToPerson(
    live: Float32Array,
    studentLib: Map<number, Float32Array>,
    staffLib: Map<number, Float32Array>,
    maxDistance = 0.52
): FacePersonMatch | null {
    const s = matchFaceToStudentId(live, studentLib, maxDistance);
    const t = matchFaceToStudentId(live, staffLib, maxDistance);
    if (!s && !t) return null;
    if (!s) return { kind: 'employee', id: t!.studentId, distance: t!.distance };
    if (!t) return { kind: 'student', id: s.studentId, distance: s.distance };
    return s.distance <= t.distance
        ? { kind: 'student', id: s.studentId, distance: s.distance }
        : { kind: 'employee', id: t.studentId, distance: t.distance };
}
