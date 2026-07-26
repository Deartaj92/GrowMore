import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { StudentPhoto } from '../components/StudentPhoto';
import {
  User,
  ShieldAlert,
  Lock,
  MapPin,
  CheckCircle,
  Key,
  GraduationCap,
  Phone,
  Building2,
  MessageSquareCode,
  Calendar,
  Hash,
  Info,
} from 'lucide-react';
import { AboutUsModal } from '../components/AboutUsModal';
import { PageLoader } from '../components/GrowMoreLoader';
import './Profile.css';

type ProfileRecord = {
  name: string;
  father_name?: string | null;
  gender?: string | null;
  dob?: string | null;
  admission_date?: string | null;
  email?: string | null;
  phone_number?: string | null;
  address?: string | null;
  password?: string | null;
  picture_url?: string | null;
  roll_number?: string | null;
  status?: string | null;
  schools?: { name?: string } | null;
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="profile-detail-item">
    <span className="profile-detail-label">{label}</span>
    <span className="profile-detail-value">{value}</span>
  </div>
);

import { useLmsSettings } from '../contexts/LmsSettingsContext';

export const Profile: React.FC = () => {
  const { student, refreshProfile } = useAuth();
  const { settings } = useLmsSettings();
  const [profileData, setProfileData] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);
  const [updatingPass, setUpdatingPass] = useState(false);
  const [aboutUsOpen, setAboutUsOpen] = useState(false);

  useEffect(() => {
    const loadProfileDetails = async () => {
      if (!student) return;
      try {
        const { data, error } = await supabase
          .from('students')
          .select(`
            *,
            schools:school_id(name)
          `)
          .eq('id', student.id)
          .single();

        if (error) throw error;
        setProfileData(data as ProfileRecord);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadProfileDetails();
  }, [student]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPassError('Please fill out all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 4) {
      setPassError('Password must be at least 4 characters long.');
      return;
    }

    setUpdatingPass(true);
    setPassError(null);
    setPassSuccess(false);

    try {
      const activePassword = profileData?.password || 'aa';
      if (currentPassword !== activePassword) {
        setPassError('Incorrect current password.');
        return;
      }

      const { error: updateError } = await supabase
        .from('students')
        .update({ password: newPassword })
        .eq('id', student!.id);

      if (updateError) throw updateError;

      setPassSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setProfileData((prev) => (prev ? { ...prev, password: newPassword } : prev));
      await refreshProfile();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password.';
      setPassError(message);
    } finally {
      setUpdatingPass(false);
    }
  };

  if (loading || !student || !profileData) {
    return (
      <PageLoader message="Loading your profile…" />
    );
  }

  const photoSource = {
    name: profileData.name || student.name,
    picture_url: profileData.picture_url,
    photo_url: student.photo_url,
  };

  const classLabel = [student.class_name, student.section_name].filter(Boolean).join(' · ') || '—';
  const statusLabel = profileData.status ? String(profileData.status) : 'Active';

  return (
    <div className="profile-page">
      <header className="profile-hero glass-panel">
        <StudentPhoto student={photoSource} size="hero" className="profile-hero-photo" />
        <div className="profile-hero-body">
          <p className="profile-hero-eyebrow">Student profile</p>
          <h1 className="profile-hero-name">{profileData.name}</h1>
          <div className="profile-hero-chips">
            <span className="profile-chip profile-chip--blue">
              <Hash size={13} aria-hidden />
              Roll {student.roll_number || '—'}
            </span>
            <span className="profile-chip profile-chip--slate">
              <GraduationCap size={13} aria-hidden />
              {classLabel}
            </span>
            <span className={`profile-chip profile-chip--status ${statusLabel.toLowerCase()}`}>
              {statusLabel}
            </span>
          </div>
          <p className="profile-hero-school">
            <Building2 size={15} aria-hidden />
            {profileData.schools?.name || 'School campus'}
          </p>
        </div>
      </header>

      <section className="profile-section glass-panel">
        <div className="profile-section-head">
          <GraduationCap size={18} className="profile-section-icon" aria-hidden />
          <h2>Academic information</h2>
        </div>
        <div className="profile-details-grid">
          <DetailItem label="Student ID" value={`#${student.id}`} />
          <DetailItem label="Roll number" value={student.roll_number || '—'} />
          <DetailItem label="Class & section" value={classLabel} />
          <DetailItem label="Admission date" value={formatDate(profileData.admission_date)} />
        </div>
      </section>

      <section className="profile-section glass-panel">
        <div className="profile-section-head">
          <User size={18} className="profile-section-icon" aria-hidden />
          <h2>Personal details</h2>
        </div>
        <div className="profile-details-grid">
          <DetailItem label="Full name" value={profileData.name} />
          <DetailItem label="Father's name" value={profileData.father_name || '—'} />
          <DetailItem label="Gender" value={profileData.gender || '—'} />
          <DetailItem label="Date of birth" value={formatDate(profileData.dob)} />
        </div>
      </section>

      <section className="profile-section glass-panel">
        <div className="profile-section-head">
          <Phone size={18} className="profile-section-icon" aria-hidden />
          <h2>Contact</h2>
        </div>
        <div className="profile-details-grid">
          <DetailItem
            label="Phone"
            value={
              profileData.phone_number ? (
                <a href={`tel:${profileData.phone_number}`} className="profile-link">
                  {profileData.phone_number}
                </a>
              ) : (
                '—'
              )
            }
          />
          <DetailItem
            label="Email"
            value={
              profileData.email ? (
                <a href={`mailto:${profileData.email}`} className="profile-link">
                  {profileData.email}
                </a>
              ) : (
                '—'
              )
            }
          />
          <DetailItem
            label="Address"
            value={
              <span className="profile-address">
                <MapPin size={14} aria-hidden />
                {profileData.address || '—'}
              </span>
            }
          />
        </div>
      </section>

      {settings.tabs.profile.allow_password_change !== false && (
        <section className="profile-section glass-panel">
          <div className="profile-section-head">
            <Lock size={18} className="profile-section-icon" aria-hidden />
            <h2>Security</h2>
          </div>
          <p className="profile-section-desc">Update your portal sign-in password.</p>

          <form onSubmit={handlePasswordChange} className="profile-password-form">
            {passSuccess && (
              <div className="profile-alert profile-alert--success">
                <CheckCircle size={16} aria-hidden />
                <span>Password updated successfully.</span>
              </div>
            )}
            {passError && (
              <div className="profile-alert profile-alert--danger">
                <ShieldAlert size={16} aria-hidden />
                <span>{passError}</span>
              </div>
            )}

            <div className="profile-password-grid">
              <div className="form-group">
                <label htmlFor="current-pass">Current password</label>
                <div className="input-field-icon-wrapper">
                  <Key size={16} className="input-icon" aria-hidden />
                  <input
                    type="password"
                    id="current-pass"
                    className="input-field"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={updatingPass}
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="new-pass">New password</label>
                <div className="input-field-icon-wrapper">
                  <Lock size={16} className="input-icon" aria-hidden />
                  <input
                    type="password"
                    id="new-pass"
                    className="input-field"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={updatingPass}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="confirm-pass">Confirm password</label>
                <div className="input-field-icon-wrapper">
                  <Lock size={16} className="input-icon" aria-hidden />
                  <input
                    type="password"
                    id="confirm-pass"
                    className="input-field"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={updatingPass}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={updatingPass}>
              {updatingPass ? 'Saving…' : 'Update password'}
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="profile-quick-link glass-panel"
        onClick={() => setAboutUsOpen(true)}
      >
        <Info size={20} className="profile-quick-link-icon" aria-hidden />
        <div>
          <strong>About GrowMore</strong>
          <span>Learn about the school management system</span>
        </div>
        <Calendar size={16} className="profile-quick-link-arrow" aria-hidden />
      </button>

      <Link to="/feedback" className="profile-quick-link glass-panel">
        <MessageSquareCode size={20} className="profile-quick-link-icon" aria-hidden />
        <div>
          <strong>Feedback & complaints</strong>
          <span>Send a suggestion or message to administration</span>
        </div>
        <Calendar size={16} className="profile-quick-link-arrow" aria-hidden />
      </Link>

      <AboutUsModal isOpen={aboutUsOpen} onClose={() => setAboutUsOpen(false)} />
    </div>
  );
};
