import * as faceapi from '@vladmandic/face-api';
import { RFIDMapping } from './rfidOfflineService';

let modelsLoaded = false;
let modelsLoadPromise: Promise<void> | null = null;
let fetchPatched = false;

/**
 * Patches face-api's internal fetch to use standard caching,
 * falling back to no-cache only if needed. This allows instant loading
 * from the browser's disk cache instead of downloading 12MB on every reload.
 */
function patchFaceApiFetch(forceBypass: boolean = false) {
    if (fetchPatched && !forceBypass) return;
    fetchPatched = true;
    try {
        const env = (faceapi.env as any).getEnv?.() || faceapi.env;
        if (env) {
            env.fetch = (url: string, init?: RequestInit) => {
                const hasModel = url.includes('/models/') || url.includes('cdn.jsdelivr.net');
                const finalUrl = hasModel 
                    ? (url.includes('?') ? `${url}&bypass-sw=1` : `${url}?bypass-sw=1`)
                    : url;
                return fetch(finalUrl, { 
                    ...(init || {}), 
                    cache: forceBypass ? 'reload' : 'default' 
                });
            };
        }
    } catch (e) {
        console.warn('Could not patch faceapi fetch:', e);
    }
}

/** Wraps a promise with a hard timeout so a hanging fetch surfaces as an error instead of freezing the UI */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const id = setTimeout(() => reject(new Error(`Timeout loading ${label} after ${ms / 1000}s`)), ms);
        promise.then(v => { clearTimeout(id); resolve(v); }, e => { clearTimeout(id); reject(e); });
    });
}

/**
 * Loads face-api.js models from local /models/ with CDN fallback.
 * Deduplicates concurrent calls. Bypasses browser cache to prevent hangs.
 */
export async function loadFaceRecognitionModels(
    onProgress?: (status: string) => void
): Promise<void> {
    if (modelsLoaded) return;
    if (modelsLoadPromise) return modelsLoadPromise;

    modelsLoadPromise = (async () => {
        // 1. Patch fetch with browser caching enabled (default)
        patchFaceApiFetch(false);

        // ── TF backend initialization ──────────────────────────────────────────────
        // face_recognition_model.bin is 6MB and triggers tf.ready() internally during
        // loadFromUri. In non-incognito Chrome with many open tabs, the WebGL context
        // pool is exhausted and tf.ready() blocks forever → page appears frozen.
        // Fix: explicitly init the backend with a timeout and fall back to CPU.
        if (onProgress) onProgress('Initializing face engine...');
        if (faceapi.tf) {
            try {
                (faceapi.tf as any).enableProdMode();
            } catch (_) {}
            try {
                // Give WebGL 5 seconds to acquire a context; if unavailable, use CPU
                await withTimeout(
                    (faceapi.tf as any).ready(),
                    5000,
                    'WebGL backend'
                );
            } catch (webglErr) {
                console.warn('WebGL context unavailable, switching to CPU backend:', webglErr);
                try {
                    await (faceapi.tf as any).setBackend('cpu');
                    await (faceapi.tf as any).ready();
                } catch (cpuErr) {
                    console.warn('TF backend init failed (non-fatal):', cpuErr);
                }
            }
        }

        const localUrl = window.location.protocol === 'file:' ? './models/' : '/models/';
        const cdnUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model/';
        const MODEL_TIMEOUT_MS = 15000;

        const loadFrom = async (baseUrl: string) => {
            if (onProgress) onProgress('Loading face detection model...');
            await withTimeout(faceapi.nets.tinyFaceDetector.loadFromUri(baseUrl), MODEL_TIMEOUT_MS, 'tinyFaceDetector');

            if (onProgress) onProgress('Loading face landmarks model...');
            await withTimeout(faceapi.nets.faceLandmark68Net.loadFromUri(baseUrl), MODEL_TIMEOUT_MS, 'faceLandmark68Net');

            if (onProgress) onProgress('Loading face recognition model...');
            await withTimeout(faceapi.nets.faceRecognitionNet.loadFromUri(baseUrl), MODEL_TIMEOUT_MS, 'faceRecognitionNet');
        };

        try {
            // Try loading from standard local cache first
            await loadFrom(localUrl);
            modelsLoaded = true;
            if (onProgress) onProgress('Face models loaded successfully');
        } catch (localError) {
            console.warn('Local cached load failed, forcing cache bypass...', localError);
            // 2. Retry local files while forcing cache bypass (fetch fresh)
            patchFaceApiFetch(true);
            try {
                await loadFrom(localUrl);
                modelsLoaded = true;
                if (onProgress) onProgress('Face models re-loaded successfully');
            } catch (retryLocalError) {
                console.warn('Local model reload failed, trying CDN...', retryLocalError);
                // Reset loaded nets so face-api re-fetches cleanly from CDN
                try { (faceapi.nets.tinyFaceDetector as any).params = undefined; } catch (_) {}
                try { (faceapi.nets.faceLandmark68Net as any).params = undefined; } catch (_) {}
                try { (faceapi.nets.faceRecognitionNet as any).params = undefined; } catch (_) {}
                try {
                    await loadFrom(cdnUrl);
                    modelsLoaded = true;
                    if (onProgress) onProgress('Face models loaded from CDN');
                } catch (cdnError) {
                    modelsLoadPromise = null;
                    console.error('All model loading attempts failed:', cdnError);
                    throw new Error('Could not load face recognition models. Please refresh the page.');
                }
            }
        }
    })();

    return modelsLoadPromise;
}

/**
 * Converts PostgreSQL bytea format to a Float32Array face descriptor
 */
export function parseFaceEmbedding(embedding: any): Float32Array | null {
    if (!embedding) return null;

    if (embedding instanceof Float32Array) {
        return embedding;
    }

    if (Array.isArray(embedding)) {
        return new Float32Array(embedding);
    }

    if (typeof embedding === 'string') {
        let hex = embedding.trim();
        // Remove PostgreSQL hex prefix if present (\x or \\x or 0x)
        if (hex.startsWith('\\x')) {
            hex = hex.slice(2);
        } else if (hex.startsWith('\\\\x')) {
            hex = hex.slice(3);
        } else if (hex.startsWith('0x')) {
            hex = hex.slice(2);
        }

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
        return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
    }

    if (embedding instanceof Uint8Array) {
        return new Float32Array(embedding.buffer, embedding.byteOffset, embedding.byteLength / 4);
    }

    if (embedding instanceof ArrayBuffer) {
        return new Float32Array(embedding);
    }

    return null;
}

/**
 * Converts a Float32Array face descriptor into a PostgreSQL-compatible bytea hex string
 */
export function float32ArrayToHex(arr: Float32Array): string {
    const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
    let hex = '\\\\x'; // Escaped backslash for PostgreSQL literal values
    for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
}

/**
 * Computes the Euclidean distance between two face descriptors
 */
export function calculateEuclideanDistance(arr1: Float32Array, arr2: Float32Array): number {
    if (arr1.length !== arr2.length) return Infinity;
    let sum = 0;
    for (let i = 0; i < arr1.length; i++) {
        const diff = arr1[i] - arr2[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

/**
 * Matches a detected face descriptor against local mappings cached in IndexedDB
 */
export function matchFace(
    descriptor: Float32Array,
    mappings: RFIDMapping[],
    threshold: number = 0.6
): { person: RFIDMapping; distance: number } | null {
    let bestMatch: { person: RFIDMapping; distance: number } | null = null;

    for (const mapping of mappings) {
        if (!mapping.face_embedding) continue;
        const savedEmbedding = parseFaceEmbedding(mapping.face_embedding);
        if (!savedEmbedding || savedEmbedding.length !== descriptor.length) continue;

        const dist = calculateEuclideanDistance(descriptor, savedEmbedding);
        if (dist < threshold) {
            if (!bestMatch || dist < bestMatch.distance) {
                bestMatch = { person: mapping, distance: dist };
            }
        }
    }

    return bestMatch;
}

/**
 * Detects the laptop's Infrared (IR) camera by scanning available devices
 */
export async function getIRCameraDevice(): Promise<MediaDeviceInfo | null> {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        // Search for infrared / Windows Hello indicators in label
        const irKeywords = [/ir\s/i, /infrared/i, /hello/i, /rgbir/i];
        for (const kw of irKeywords) {
            const match = videoDevices.find(d => kw.test(d.label));
            if (match) return match;
        }

        // Return first device if no explicit IR found as fallback
        return videoDevices[0] || null;
    } catch (e) {
        console.warn('Error enumerating devices for IR camera:', e);
        return null;
    }
}
