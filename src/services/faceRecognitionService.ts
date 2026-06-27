import * as faceapi from '@vladmandic/face-api';
import { RFIDMapping } from './rfidOfflineService';

let modelsLoaded = false;

/**
 * Loads face-api.js models from jsDelivr CDN
 */
export async function loadFaceRecognitionModels(
    onProgress?: (status: string) => void
): Promise<void> {
    if (modelsLoaded) return;

    try {
        if (faceapi.tf) {
            if (onProgress) onProgress('Initializing face engine...');
            (faceapi.tf as any).enableProdMode();
        }
    } catch (e) {
        console.warn('Failed to configure faceapi engine:', e);
    }

    // Determine local model URL based on page protocol to support both Electron and web hosts
    const localUrl = window.location.protocol === 'file:' ? './models/' : '/models/';
    const cdnUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model/';

    try {
        if (onProgress) onProgress('Loading face detection model...');
        await faceapi.nets.tinyFaceDetector.loadFromUri(localUrl);

        if (onProgress) onProgress('Loading face landmarks model...');
        await faceapi.nets.faceLandmark68Net.loadFromUri(localUrl);

        if (onProgress) onProgress('Loading face recognition model...');
        await faceapi.nets.faceRecognitionNet.loadFromUri(localUrl);

        modelsLoaded = true;
        if (onProgress) onProgress('Face models loaded successfully');
    } catch (localError) {
        console.warn('Failed to load local face recognition models, trying CDN fallback...', localError);
        try {
            if (onProgress) onProgress('Downloading face detection model (CDN)...');
            await faceapi.nets.tinyFaceDetector.loadFromUri(cdnUrl);

            if (onProgress) onProgress('Downloading face landmarks model (CDN)...');
            await faceapi.nets.faceLandmark68Net.loadFromUri(cdnUrl);

            if (onProgress) onProgress('Downloading face recognition model (CDN)...');
            await faceapi.nets.faceRecognitionNet.loadFromUri(cdnUrl);

            modelsLoaded = true;
            if (onProgress) onProgress('Face models loaded from CDN');
        } catch (cdnError) {
            console.error('All model loading attempts failed:', cdnError);
            throw new Error('Could not load face recognition models.');
        }
    }
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
