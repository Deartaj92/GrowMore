export const sanitizeRfidUid = (value: string | null | undefined): string =>
    String(value || '').trim().toUpperCase().replace(/[^A-F0-9]/g, '');

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
