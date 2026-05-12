export const sanitizeRfidUid = (value: string | null | undefined): string =>
    String(value || '').trim().toUpperCase().replace(/[^A-F0-9]/g, '');

const QR_QUERY_KEYS = [
    'uid', 'id', 'rfid', 'card', 'tag', 'code', 'token', 'key', 'v', 'q', 'ref',
    'student_id', 'studentid', 'sid', 'roll', 'roll_no', 'rollno', 'eid', 'emp', 'user', 'pin', 'data',
];

const tryParseHashParams = (hash: string): URLSearchParams | null => {
    const h = hash.replace(/^#/, '').trim();
    if (!h) return null;
    if (h.includes('=')) {
        try {
            return new URLSearchParams(h.startsWith('?') ? h.slice(1) : h);
        } catch {
            return null;
        }
    }
    return null;
};

/**
 * Decode raw QR text into an RFID-style UID for attendance lookup.
 * Supports plain hex, URLs (query + hash), JSON snippets, and embedded hex runs.
 */
export const extractAttendanceUidFromQrPayload = (raw: string | null | undefined): string => {
    const s = String(raw ?? '').trim();
    if (!s) return '';

    const direct = sanitizeRfidUid(s);
    if (direct.length >= 4) return direct;

    const tryParams = (params: URLSearchParams): string => {
        for (const param of QR_QUERY_KEYS) {
            const v = params.get(param);
            if (v) {
                const h = sanitizeRfidUid(decodeURIComponent(v.replace(/\+/g, ' ')));
                if (h.length >= 4) return h;
            }
        }
        return '';
    };

    try {
        const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
        const u = new URL(withProto);
        const fromSearch = tryParams(u.searchParams);
        if (fromSearch) return fromSearch;

        const hashParams = tryParseHashParams(u.hash);
        if (hashParams) {
            const fromHash = tryParams(hashParams);
            if (fromHash) return fromHash;
        }

        const segments = u.pathname.split('/').filter(Boolean);
        for (let i = segments.length - 1; i >= 0; i--) {
            let seg = segments[i];
            try {
                seg = decodeURIComponent(seg);
            } catch {
                // keep raw
            }
            const h = sanitizeRfidUid(seg);
            if (h.length >= 4) return h;
        }
    } catch {
        // not a URL
    }

    if (/^\s*\{/.test(s) && /\}\s*$/.test(s)) {
        try {
            const obj = JSON.parse(s) as Record<string, unknown>;
            for (const k of ['uid', 'id', 'rfid', 'card', 'tag', 'code', 'token', 'student_id', 'studentId', 'roll', 'roll_no']) {
                const v = obj[k];
                if (typeof v === 'string' || typeof v === 'number') {
                    const h = sanitizeRfidUid(String(v));
                    if (h.length >= 4) return h;
                }
            }
        } catch {
            // not JSON
        }
    }

    const runs = s.match(/[a-fA-F0-9]{4,}/g);
    if (runs?.length) {
        const best = runs.reduce((a, b) => (b.length > a.length ? b : a));
        const h = sanitizeRfidUid(best);
        if (h.length >= 4) return h;
    }

    return '';
};

/**
 * Single normalized value for qr_uid storage + scan lookup.
 * Hex payloads → uppercase (same as RFID). Other payloads (URLs, text) → trimmed, lowercase.
 */
export const canonicalQrTokenForMatch = (raw: string | null | undefined): string => {
    const trimmed = String(raw ?? '').trim();
    if (!trimmed) return '';

    const hex = extractAttendanceUidFromQrPayload(trimmed) || sanitizeRfidUid(trimmed);
    if (hex.length >= 4) return hex;

    let s = trimmed;
    try {
        s = decodeURIComponent(s.replace(/\+/g, ' '));
    } catch {
        // ignore
    }
    s = s.replace(/\s+/g, ' ').trim();
    if (s.length > 2048) s = s.slice(0, 2048);
    return s.toLowerCase();
};

export const reverseRfidUidByteOrder = (value: string | null | undefined): string => {
    const sanitized = sanitizeRfidUid(value);
    if (sanitized.length < 2 || sanitized.length % 2 !== 0) {
        return sanitized;
    }

    const bytes = sanitized.match(/.{1,2}/g);
    if (!bytes) {
        return sanitized;
    }

    return bytes.reverse().join('');
};

export const normalizeDesktopScannerUid = (value: string | null | undefined): string => {
    const sanitized = sanitizeRfidUid(value);
    if (sanitized.length < 8 || sanitized.length % 2 !== 0) {
        return sanitized;
    }

    return reverseRfidUidByteOrder(sanitized);
};

const buildDesktopAliasFromLongUid = (value: string): string | null => {
    const sanitized = sanitizeRfidUid(value);
    if (sanitized.length < 14 || sanitized.length % 2 !== 0) {
        return null;
    }

    return `88${sanitized.slice(0, 6)}`;
};

export const buildRfidUidCandidates = (value: string | null | undefined): string[] => {
    const sanitized = sanitizeRfidUid(value);
    if (!sanitized) {
        return [];
    }

    const candidates = new Set<string>();
    const addCandidate = (candidate: string | null | undefined) => {
        const normalized = sanitizeRfidUid(candidate);
        if (!normalized) {
            return;
        }

        candidates.add(normalized);
        const reversed = reverseRfidUidByteOrder(normalized);
        if (reversed) {
            candidates.add(reversed);
        }
    };

    addCandidate(sanitized);
    addCandidate(buildDesktopAliasFromLongUid(sanitized));

    return Array.from(candidates);
};

export const buildRfidUidPrefixCandidates = (value: string | null | undefined): string[] => {
    const candidates = new Set<string>();

    for (const candidate of buildRfidUidCandidates(value)) {
        if (candidate.length === 8 && candidate.startsWith('88')) {
            candidates.add(candidate.slice(2));
        }
    }

    return Array.from(candidates);
};

/** RFID assignment field: USB/desktop normalization + QR-style payloads that decode to hex. */
export const resolveAssignmentUidFromInput = (raw: string | null | undefined): string => {
    const trimmed = String(raw ?? '').trim();
    if (!trimmed) return '';

    const fromPayload = extractAttendanceUidFromQrPayload(trimmed);
    if (fromPayload.length >= 4) return fromPayload;

    const sanitized = sanitizeRfidUid(trimmed);
    if (sanitized.length >= 8 && sanitized.length % 2 === 0) {
        return normalizeDesktopScannerUid(trimmed);
    }

    return sanitized;
};

/**
 * QR assignment value stored in qr_uid (same normalization as attendance lookup).
 */
export const resolveQrAssignmentFromInput = (raw: string | null | undefined): string => {
    const trimmed = String(raw ?? '').trim();
    if (!trimmed) return '';

    const key = canonicalQrTokenForMatch(trimmed);
    return key.length >= 4 ? key : '';
};
