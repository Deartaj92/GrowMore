/** face-api.js face descriptor length */
export const FACE_EMBEDDING_DIM = 128;
export const FACE_EMBEDDING_BYTE_LENGTH = FACE_EMBEDDING_DIM * 4;

/**
 * Persist exactly 512 bytes (never the parent ArrayBuffer from tfjs / face-api views),
 * so Postgres bytea does not accidentally store a huge backing buffer.
 */
export function float32DescriptorToBytes(descriptor: Float32Array): Uint8Array {
    if (descriptor.length !== FACE_EMBEDDING_DIM) {
        throw new Error(`Expected ${FACE_EMBEDDING_DIM}-dim face descriptor, got ${descriptor.length}`);
    }
    const out = new Uint8Array(FACE_EMBEDDING_BYTE_LENGTH);
    const src = new Uint8Array(descriptor.buffer, descriptor.byteOffset, FACE_EMBEDDING_BYTE_LENGTH);
    out.set(src);
    return out;
}

/** Interpret first 128 floats from bytes; oversize blobs use the first 512 bytes only (legacy / corrupt rows). */
export function bytesToFloat32Descriptor(bytes: ArrayBuffer | Uint8Array): Float32Array | null {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (u8.byteLength < FACE_EMBEDDING_BYTE_LENGTH) return null;
    const head = u8.subarray(0, FACE_EMBEDDING_BYTE_LENGTH);
    const copy = head.slice().buffer;
    return new Float32Array(copy);
}

/** Parse Supabase bytea (may arrive as hex string, base64, typed arrays, or JSON number[]). */
export function parseFaceEmbeddingFromSupabase(value: unknown): Float32Array | null {
    if (value == null) return null;

    if (Array.isArray(value)) {
        if (value.length === FACE_EMBEDDING_DIM) {
            return Float32Array.from(value as number[]);
        }
        return null;
    }

    if (value && typeof value === 'object' && 'data' in (value as any) && Array.isArray((value as any).data)) {
        const arr = (value as { data: number[] }).data;
        if (arr.length >= FACE_EMBEDDING_DIM) {
            return Float32Array.from(arr.slice(0, FACE_EMBEDDING_DIM));
        }
        if (arr.length >= FACE_EMBEDDING_BYTE_LENGTH) {
            return bytesToFloat32Descriptor(new Uint8Array(arr.slice(0, FACE_EMBEDDING_BYTE_LENGTH)));
        }
        return null;
    }

    if (value instanceof ArrayBuffer) {
        return bytesToFloat32Descriptor(new Uint8Array(value));
    }
    if (value instanceof Uint8Array) {
        return bytesToFloat32Descriptor(value);
    }
    if (typeof value === 'string') {
        if (value.startsWith('\\x')) {
            const hex = value.slice(2);
            if (hex.length % 2 !== 0) return null;
            const u8 = new Uint8Array(hex.length / 2);
            for (let i = 0; i < u8.length; i++) {
                u8[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
            }
            return bytesToFloat32Descriptor(u8);
        }
        try {
            const bin = atob(value);
            const u8 = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
            return bytesToFloat32Descriptor(u8);
        } catch {
            return null;
        }
    }
    return null;
}
