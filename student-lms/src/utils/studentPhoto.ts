const SUPABASE_URL = 'https://seeeczoigcxwvpazfydj.supabase.co';

export type StudentPhotoSource = {
  picture_url?: string | null;
  photo_url?: string | null;
} | null | undefined;

/** Resolve the best available student portrait URL from DB fields. */
export function resolveStudentPhotoUrl(source: StudentPhotoSource): string | null {
  const raw = source?.picture_url ?? source?.photo_url;
  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return `${SUPABASE_URL}${trimmed}`;
  }

  if (trimmed.includes('supabase.co/storage')) {
    return trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${trimmed.replace(/^\/+/, '')}`;
}
