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

export const buildRfidUidCandidates = (value: string | null | undefined): string[] => {
    const sanitized = sanitizeRfidUid(value);
    if (!sanitized) {
        return [];
    }

    const reversed = reverseRfidUidByteOrder(sanitized);
    return reversed && reversed !== sanitized ? [sanitized, reversed] : [sanitized];
};
