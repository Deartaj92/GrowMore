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
async function withFetchOverride<T>(
    fn: () => Promise<T>,
    forceReload = false,
    onProgress?: (status: string) => void
): Promise<T> {
    const nativeFetch = window.fetch;

    // Track total bytes loaded across all models during this load session.
    // The three files sizes are approximately:
    // tiny_face_detector_model: 3 KB (json) + 193 KB (bin) = ~196 KB
    // face_landmark_68_model: 8 KB (json) + 357 KB (bin) = ~365 KB
    // face_recognition_model: 20 KB (json) + 6.44 MB (bin) = ~6.46 MB
    // Total aggregate bytes is roughly ~7,020,000 bytes.
    let loadedBytesMap = new Map<string, number>();

    const updateCombinedProgress = () => {
        if (!onProgress) return;
        let totalLoaded = 0;
        loadedBytesMap.forEach((bytes) => {
            totalLoaded += bytes;
        });
        
        // Approximate total expected size for the 3 models (weights + manifests)
        const EXPECTED_TOTAL_BYTES = 7_020_000;
        const percent = Math.min(Math.round((totalLoaded / EXPECTED_TOTAL_BYTES) * 100), 99);
        const mbLoaded = (totalLoaded / (1024 * 1024)).toFixed(2);
        const mbTotal = (EXPECTED_TOTAL_BYTES / (1024 * 1024)).toFixed(2);
        
        onProgress(`Loading models: ${percent}% (${mbLoaded} MB / ${mbTotal} MB)`);
    };

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = typeof input === 'string' ? input
            : input instanceof URL ? input.href
            : (input as Request).url;

        const isModelFile = url.includes('/models/') || url.includes('cdn.jsdelivr.net');

        if (isModelFile && !forceReload && typeof caches !== 'undefined') {
            try {
                // Search across all Cache Storage caches (including Service Worker cache growmore-v1)
                const cachedResponse = await caches.match(url, { ignoreSearch: true });
                if (cachedResponse) {
                    const blob = await cachedResponse.blob();
                    const fileName = url.substring(url.lastIndexOf('/') + 1);
                    loadedBytesMap.set(fileName, blob.size);
                    updateCombinedProgress();
                    return new Response(blob, {
                        headers: cachedResponse.headers,
                        status: cachedResponse.status,
                        statusText: cachedResponse.statusText,
                    });
                }
            } catch (cacheErr) {
                console.warn('[faceapi] Cache Storage match failed:', cacheErr);
            }
        }

        const finalUrl = url;
        const finalInput = typeof input === 'string' ? finalUrl
            : input instanceof URL ? new URL(finalUrl)
            : new Request(finalUrl, input as Request);

        let response: Response;
        try {
            response = await nativeFetch(finalInput, {
                ...(init || {}),
                cache: forceReload ? 'reload' : 'default',
            });
        } catch (fetchErr) {
            // Offline fallback: if network fetch fails, search all Cache Storage caches
            if (typeof caches !== 'undefined') {
                try {
                    const fallbackResponse = await caches.match(url, { ignoreSearch: true });
                    if (fallbackResponse) {
                        const blob = await fallbackResponse.blob();
                        const fileName = url.substring(url.lastIndexOf('/') + 1);
                        loadedBytesMap.set(fileName, blob.size);
                        updateCombinedProgress();
                        return new Response(blob, {
                            headers: fallbackResponse.headers,
                            status: fallbackResponse.status,
                            statusText: fallbackResponse.statusText,
                        });
                    }
                } catch (_) {}
            }
            throw fetchErr;
        }

        if (!isModelFile || !response.ok) {
            return response;
        }

        // Fetch the body once as a Blob to read size instantly, updating progress,
        // and reconstruct a clean, fast native Response object.
        const blob = await response.blob();

        if (isModelFile && typeof caches !== 'undefined') {
            try {
                const cache = await caches.open('face-api-models-cache');
                await cache.put(url, new Response(blob.slice(), {
                    headers: response.headers,
                    status: response.status,
                    statusText: response.statusText,
                }));
            } catch (cacheErr) {
                console.warn('[faceapi] Cache Storage put failed:', cacheErr);
            }
        }

        const fileName = url.substring(url.lastIndexOf('/') + 1);
        loadedBytesMap.set(fileName, blob.size);
        updateCombinedProgress();

        return new Response(blob, {
            headers: response.headers,
            status: response.status,
            statusText: response.statusText,
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
        // Enforce CPU backend instantly. In non-incognito Chrome,
        // compiling WebGL shaders on the GPU context blocks/stalls the main thread
        // for several minutes. Running on CPU bypasses this bottleneck entirely.
        if (onProgress) onProgress('Initializing face engine...');
        if (faceapi.tf) {
            try { (faceapi.tf as any).enableProdMode(); } catch (_) {}
            try {
                await (faceapi.tf as any).setBackend('webgl');
                await (faceapi.tf as any).ready();
            } catch (_) {
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
            await withTimeout(faceapi.nets.tinyFaceDetector.loadFromUri(baseUrl), TIMEOUT, 'tinyFaceDetector');
            await withTimeout(faceapi.nets.faceLandmark68Net.loadFromUri(baseUrl), TIMEOUT, 'faceLandmark68Net');
            await withTimeout(faceapi.nets.faceRecognitionNet.loadFromUri(baseUrl), TIMEOUT, 'faceRecognitionNet');
        };

        // ── Load: try local (cached) → local (force-reload) → CDN ────────────────
        try {
            await withFetchOverride(() => loadFrom(localUrl), false, onProgress);
            modelsLoaded = true;
            if (onProgress) onProgress('Face models loaded ✓');
            return;
        } catch (e1) {
            console.warn('[faceapi] Cached local load failed, retrying with force-reload:', e1);
        }

        try {
            await withFetchOverride(() => loadFrom(localUrl), true, onProgress);
            modelsLoaded = true;
            if (onProgress) onProgress('Face models loaded ✓');
            return;
        } catch (e2) {
            console.warn('[faceapi] Force-reload local load failed, falling back to CDN:', e2);
        }

        // Reset net params before CDN retry
        try { (faceapi.nets.tinyFaceDetector as any).params = undefined; } catch (_) {}
        try { (faceapi.nets.faceLandmark68Net as any).params = undefined; } catch (_) {}
        try { (faceapi.nets.faceRecognitionNet as any).params = undefined; } catch (_) {}

        try {
            await withFetchOverride(() => loadFrom(cdnUrl), false, onProgress);
            modelsLoaded = true;
            if (onProgress) onProgress('Face models loaded ✓ (CDN)');
        } catch (e3) {
            modelsLoadPromise = null;
            throw new Error('Could not load face recognition models. Please check your connection and refresh.');
        }
    })();

    return modelsLoadPromise;
}

/** Converts PostgreSQL bytea format to a Float32Array face descriptor safely */
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
        for (let i = 0; i < len; i++) {
            bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        }
        // Copy to fresh 4-byte aligned ArrayBuffer to prevent Float32Array byteOffset misalignments
        const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        const floatArr = new Float32Array(buffer);
        if (floatArr.length === 128 && !isNaN(floatArr[0]) && isFinite(floatArr[0])) {
            return floatArr;
        }
        return null;
    }

    if (embedding instanceof Uint8Array) {
        const buffer = embedding.buffer.slice(embedding.byteOffset, embedding.byteOffset + embedding.byteLength);
        return new Float32Array(buffer);
    }
    if (embedding instanceof ArrayBuffer) {
        return new Float32Array(embedding.slice(0));
    }
    return null;
}

/** Converts a Float32Array face descriptor into a PostgreSQL-compatible bytea hex string */
export function float32ArrayToHex(arr: Float32Array): string {
    const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
    let hex = '\\\\x';
    for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
    return hex;
}

/** Gets or computes cached Float32Array face embedding for an RFIDMapping object */
export function getParsedEmbedding(m: RFIDMapping): Float32Array | null {
    if (!m.face_embedding) return null;
    if ((m as any)._cachedFloat32Array instanceof Float32Array) {
        return (m as any)._cachedFloat32Array;
    }
    const parsed = parseFaceEmbedding(m.face_embedding);
    if (parsed) {
        (m as any)._cachedFloat32Array = parsed;
    }
    return parsed;
}

/** Computes Euclidean distance between two face descriptors */
export function calculateEuclideanDistance(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return Infinity;
    let sum = 0;
    for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; sum += d * d; }
    return Math.sqrt(sum);
}

/** Matches a detected face descriptor against cached local mappings in microsecond time */
export function matchFace(
    descriptor: Float32Array,
    mappings: RFIDMapping[],
    threshold = 0.45
): { person: RFIDMapping; distance: number } | null {
    let best: { person: RFIDMapping; distance: number } | null = null;
    const descLen = descriptor.length;
    for (const m of mappings) {
        const saved = getParsedEmbedding(m);
        if (!saved || saved.length !== descLen) continue;
        const dist = calculateEuclideanDistance(descriptor, saved);
        if (dist < threshold && (!best || dist < best.distance)) {
            best = { person: m, distance: dist };
        }
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
