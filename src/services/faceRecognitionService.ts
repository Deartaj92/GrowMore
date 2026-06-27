import * as faceapi from '@vladmandic/face-api';
import { RFIDMapping } from './rfidOfflineService';

let modelsLoaded = false;
let modelsLoadPromise: Promise<void> | null = null;

/** Wraps a promise with a hard timeout so a hanging fetch surfaces as an error */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const id = setTimeout(() => reject(new Error(`Timeout loading ${label} after ${ms / 1000}s`)), ms);
        promise.then(v => { clearTimeout(id); resolve(v); }, e => { clearTimeout(id); reject(e); });
    });
}

/**
 * Temporarily replaces window.fetch for the duration of `fn()`.
 *
 * Why: @vladmandic/face-api and TF.js both call window.fetch internally.
 * The Service Worker in non-incognito Chrome intercepts /models/ requests and
 * returns empty/stale responses, causing loadFromUri to hang forever.
 * Incognito has no Service Worker → works instantly.
 *
 * Solution: override window.fetch globally for the duration of model loading,
 * appending ?bypass-sw=1 so the SW skips it and fetches from the network.
 * window.fetch is restored immediately after, with no side effects.
 */
async function withFetchOverride<T>(fn: () => Promise<T>, forceReload = false): Promise<T> {
    const nativeFetch = window.fetch;
    window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = typeof input === 'string' ? input
            : input instanceof URL ? input.href
            : (input as Request).url;

        const isModelFile = url.includes('/models/') || url.includes('cdn.jsdelivr.net');
        const finalUrl = isModelFile
            ? (url.includes('?') ? `${url}&bypass-sw=1` : `${url}?bypass-sw=1`)
            : url;

        const finalInput = typeof input === 'string' ? finalUrl
            : input instanceof URL ? new URL(finalUrl)
            : new Request(finalUrl, input as Request);

        return nativeFetch(finalInput, {
            ...(init || {}),
            cache: forceReload ? 'reload' : 'default',
        });
    };

    try {
        return await fn();
    } finally {
        window.fetch = nativeFetch;
    }
}

/**
 * Loads face-api.js models.
 * - Deduplicates concurrent calls (singleton promise).
 * - Bypasses Service Worker cache for model files via window.fetch override.
 * - Falls back to CDN if local /models/ fails.
 */
export async function loadFaceRecognitionModels(
    onProgress?: (status: string) => void
): Promise<void> {
    if (modelsLoaded) return;
    if (modelsLoadPromise) return modelsLoadPromise;

    modelsLoadPromise = (async () => {
        // ── TF backend init ───────────────────────────────────────────────────────
        // In non-incognito Chrome with many open tabs, WebGL context pool is
        // exhausted and tf.ready() blocks forever → page appears frozen.
        if (onProgress) onProgress('Initializing face engine...');
        if (faceapi.tf) {
            try { (faceapi.tf as any).enableProdMode(); } catch (_) {}
            try {
                await withTimeout((faceapi.tf as any).ready(), 5000, 'WebGL backend');
            } catch {
                try {
                    await (faceapi.tf as any).setBackend('cpu');
                    await (faceapi.tf as any).ready();
                } catch (_) {}
            }
        }

        const localUrl = window.location.protocol === 'file:' ? './models/' : '/models/';
        const cdnUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model/';
        const TIMEOUT = 15_000;

        const loadFrom = async (baseUrl: string) => {
            if (onProgress) onProgress('Loading face detection model...');
            await withTimeout(faceapi.nets.tinyFaceDetector.loadFromUri(baseUrl), TIMEOUT, 'tinyFaceDetector');

            if (onProgress) onProgress('Loading face landmarks model...');
            await withTimeout(faceapi.nets.faceLandmark68Net.loadFromUri(baseUrl), TIMEOUT, 'faceLandmark68Net');

            if (onProgress) onProgress('Loading face recognition model...');
            await withTimeout(faceapi.nets.faceRecognitionNet.loadFromUri(baseUrl), TIMEOUT, 'faceRecognitionNet');
        };

        // ── Load: try local (cached) → local (force-reload) → CDN ────────────────
        try {
            await withFetchOverride(() => loadFrom(localUrl), false);
            modelsLoaded = true;
            if (onProgress) onProgress('Face models loaded');
            return;
        } catch (e1) {
            console.warn('[faceapi] Cached local load failed, retrying with force-reload:', e1);
        }

        try {
            await withFetchOverride(() => loadFrom(localUrl), true);
            modelsLoaded = true;
            if (onProgress) onProgress('Face models loaded');
            return;
        } catch (e2) {
            console.warn('[faceapi] Force-reload local load failed, falling back to CDN:', e2);
        }

        // Reset net params before CDN retry
        try { (faceapi.nets.tinyFaceDetector as any).params = undefined; } catch (_) {}
        try { (faceapi.nets.faceLandmark68Net as any).params = undefined; } catch (_) {}
        try { (faceapi.nets.faceRecognitionNet as any).params = undefined; } catch (_) {}

        try {
            await withFetchOverride(() => loadFrom(cdnUrl), false);
            modelsLoaded = true;
            if (onProgress) onProgress('Face models loaded (CDN)');
        } catch (e3) {
            modelsLoadPromise = null;
            throw new Error('Could not load face recognition models. Please check your connection and refresh.');
        }
    })();

    return modelsLoadPromise;
}

/** Converts PostgreSQL bytea format to a Float32Array face descriptor */
export function parseFaceEmbedding(embedding: any): Float32Array | null {
    if (!embedding) return null;
    if (embedding instanceof Float32Array) return embedding;
    if (Array.isArray(embedding)) return new Float32Array(embedding);

    if (typeof embedding === 'string') {
        let hex = embedding.trim();
        if (hex.startsWith('\\x')) hex = hex.slice(2);
        else if (hex.startsWith('\\\\x')) hex = hex.slice(3);
        else if (hex.startsWith('0x')) hex = hex.slice(2);

        if (!/^[0-9a-fA-F]+$/.test(hex)) {
            try {
                const parsed = JSON.parse(hex);
                if (Array.isArray(parsed)) return new Float32Array(parsed);
            } catch (_) {}
            return null;
        }

        const len = hex.length / 2;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
    }

    if (embedding instanceof Uint8Array)
        return new Float32Array(embedding.buffer, embedding.byteOffset, embedding.byteLength / 4);
    if (embedding instanceof ArrayBuffer) return new Float32Array(embedding);
    return null;
}

/** Converts a Float32Array face descriptor into a PostgreSQL-compatible bytea hex string */
export function float32ArrayToHex(arr: Float32Array): string {
    const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
    let hex = '\\\\x';
    for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
    return hex;
}

/** Computes Euclidean distance between two face descriptors */
export function calculateEuclideanDistance(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return Infinity;
    let sum = 0;
    for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; sum += d * d; }
    return Math.sqrt(sum);
}

/** Matches a detected face descriptor against cached local mappings */
export function matchFace(
    descriptor: Float32Array,
    mappings: RFIDMapping[],
    threshold = 0.6
): { person: RFIDMapping; distance: number } | null {
    let best: { person: RFIDMapping; distance: number } | null = null;
    for (const m of mappings) {
        if (!m.face_embedding) continue;
        const saved = parseFaceEmbedding(m.face_embedding);
        if (!saved || saved.length !== descriptor.length) continue;
        const dist = calculateEuclideanDistance(descriptor, saved);
        if (dist < threshold && (!best || dist < best.distance)) best = { person: m, distance: dist };
    }
    return best;
}

/** Detects the laptop's IR camera by scanning available devices */
export async function getIRCameraDevice(): Promise<MediaDeviceInfo | null> {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videos = devices.filter(d => d.kind === 'videoinput');
        const irKeywords = [/ir\s/i, /infrared/i, /hello/i, /rgbir/i];
        for (const kw of irKeywords) {
            const match = videos.find(d => kw.test(d.label));
            if (match) return match;
        }
        return videos[0] || null;
    } catch (e) {
        console.warn('Error enumerating devices for IR camera:', e);
        return null;
    }
}
