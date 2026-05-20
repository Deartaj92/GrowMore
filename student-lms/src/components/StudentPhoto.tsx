import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { resolveStudentPhotoUrl, type StudentPhotoSource } from '../utils/studentPhoto';
import './StudentPhoto.css';

type StudentPhotoProps = {
  student: StudentPhotoSource & { name?: string };
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
};

const SIZE_CLASS = {
  sm: 'student-photo--sm',
  md: 'student-photo--md',
  lg: 'student-photo--lg',
  hero: 'student-photo--hero',
};

export const StudentPhoto: React.FC<StudentPhotoProps> = ({
  student,
  size = 'md',
  className = '',
}) => {
  const [failed, setFailed] = useState(false);
  const url = resolveStudentPhotoUrl(student);
  const showImage = Boolean(url) && !failed;
  const initial = student?.name?.trim()?.charAt(0)?.toUpperCase() || '?';

  useEffect(() => {
    setFailed(false);
  }, [url]);

  return (
    <div className={`student-photo ${SIZE_CLASS[size]} ${className}`.trim()}>
      {showImage ? (
        <img
          src={url!}
          alt={student?.name ? `${student.name} portrait` : 'Student photo'}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="student-photo-fallback" aria-hidden>
          {initial !== '?' ? initial : <User strokeWidth={2} />}
        </span>
      )}
    </div>
  );
};
