import React, { useState, useEffect } from 'react';
import './StudentAvatar.css';

interface StudentAvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  gender?: string | null;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  showGenderDot?: boolean;
}

// Curated harmonious flat color palette designed for dark themes (#252525 background)
const AVATAR_PALETTE = [
  '#2563eb', // Indigo Blue
  '#059669', // Emerald Green
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#db2777', // Rose Pink
  '#0891b2', // Cyan
  '#4f46e5', // Deep Indigo
  '#0d9488', // Teal
  '#dc2626', // Crimson Red
  '#65a30d', // Lime
];

/**
 * Sanitizes and normalizes picture URLs from Supabase storage or external links
 */
export const sanitizeAvatarUrl = (rawUrl?: string | null): string | null => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;

  // Full HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Relative storage paths in Supabase
  const SUPABASE_BASE = 'https://seeeczoigcxwvpazfydj.supabase.co/storage/v1/object/public/';
  if (trimmed.startsWith('student-avatars/')) {
    return `${SUPABASE_BASE}${trimmed}`;
  }
  if (trimmed.startsWith('student-pictures/')) {
    return `${SUPABASE_BASE}${trimmed}`;
  }
  if (trimmed.startsWith('storage/v1/object/public/')) {
    return `https://seeeczoigcxwvpazfydj.supabase.co/${trimmed}`;
  }
  if (trimmed.startsWith('students/')) {
    return `${SUPABASE_BASE}student-avatars/${trimmed}`;
  }

  // Raw file key in student-avatars bucket
  return `${SUPABASE_BASE}student-avatars/${trimmed}`;
};

/**
 * Computes deterministic 1-2 character initials for a given student name
 */
export const getStudentInitials = (name?: string | null): string => {
  if (!name || typeof name !== 'string') return '?';
  const clean = name.replace(/[^\w\s]/gi, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    const single = parts[0];
    return single.length >= 2 ? single.substring(0, 2).toUpperCase() : single.charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Computes a deterministic flat background color for a student name
 */
const getAvatarBgColor = (name: string, gender?: string | null): string => {
  if (gender) {
    const g = gender.toLowerCase();
    if (g === 'female' || g === 'girl') return '#db2777';
  }

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
};

export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  src,
  name,
  size = 38,
  gender,
  className = '',
  style = {},
  title,
  showGenderDot = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const cleanUrl = sanitizeAvatarUrl(src);

  // Reset error state if src changes
  useEffect(() => {
    setHasError(false);
  }, [cleanUrl]);

  const initials = getStudentInitials(name);
  const bgColor = getAvatarBgColor(name, gender);
  const fontSize = Math.max(10, Math.round(size * 0.38));

  const shouldRenderImg = Boolean(cleanUrl) && !hasError;

  return (
    <div
      className={`student-avatar ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        fontSize: `${fontSize}px`,
        ...style,
      }}
      title={title || name}
    >
      {/* Fallback Initials Badge (placed at z-index: 1) */}
      <div
        className="student-avatar-fallback"
        style={{
          backgroundColor: bgColor,
          fontSize: `${fontSize}px`,
        }}
      >
        {initials}
      </div>

      {/* Real Image (placed at z-index: 2, renders directly on top) */}
      {shouldRenderImg && (
        <img
          src={cleanUrl!}
          alt={name}
          className="student-avatar-img"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
        />
      )}

      {/* Gender Dot if requested */}
      {showGenderDot && gender && (
        <span
          className={`student-avatar-gender-indicator ${
            gender.toLowerCase() === 'female' || gender.toLowerCase() === 'girl' ? 'female' : 'male'
          }`}
          title={gender}
        />
      )}
    </div>
  );
};

export default StudentAvatar;
