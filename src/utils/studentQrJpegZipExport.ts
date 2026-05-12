import JSZip from 'jszip';
import QRCode from 'qrcode';

/** Windows / ZIP–safe path segment (no slashes, control chars, reserved names). */
export function sanitizePathSegment(raw: string, maxLen = 120): string {
    const cleaned = String(raw || '')
        .replace(/[\u0000-\u001f\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, ' ')
        .trim();
    const base = cleaned.slice(0, maxLen) || 'unknown';
    const reserved = /^(con|prn|aux|nul|com\d|lpt\d)$/i;
    if (reserved.test(base)) return `_${base}`;
    return base;
}

/** Convert PNG data URL from qrcode to JPEG blob (white background). */
export function pngDataUrlToJpegBlob(pngDataUrl: string, quality = 0.92): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(
                blob => {
                    if (blob) resolve(blob);
                    else reject(new Error('JPEG encoding failed'));
                },
                'image/jpeg',
                quality
            );
        };
        img.onerror = () => reject(new Error('Failed to load QR image'));
        img.src = pngDataUrl;
    });
}

export type QrZipStudentInput = {
    id: number;
    name: string;
    father_name?: string | null;
    qr_uid: string | null;
    classFolderLabel: string;
};

/**
 * Builds a ZIP: one folder per class (sanitized), each file `Student_Father_Class.jpg` (JPEG).
 * Resolves duplicate names in the same folder with numeric suffixes.
 */
export async function buildStudentQrJpegZip(
    students: QrZipStudentInput[],
    options?: { qrPixelSize?: number }
): Promise<Blob> {
    const qrSize = options?.qrPixelSize ?? 480;
    const zip = new JSZip();
    const usedPaths = new Set<string>();

    for (const s of students) {
        const raw = String(s.qr_uid || '').trim();
        if (!raw) continue;

        const folder = sanitizePathSegment(s.classFolderLabel, 100);
        const father = (s.father_name || '').trim() || 'Unknown';
        const baseName = sanitizePathSegment(`${s.name}_${father}_${s.classFolderLabel}`, 140);

        let relPath = `${folder}/${baseName}.jpg`;
        let n = 0;
        while (usedPaths.has(relPath.toLowerCase())) {
            n += 1;
            relPath = `${folder}/${baseName}_${n}.jpg`;
        }
        usedPaths.add(relPath.toLowerCase());

        const pngDataUrl = await QRCode.toDataURL(raw, {
            width: qrSize,
            margin: 1,
            errorCorrectionLevel: 'M',
        });
        const jpegBlob = await pngDataUrlToJpegBlob(pngDataUrl);
        zip.file(relPath, jpegBlob);
    }

    return zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
    });
}
