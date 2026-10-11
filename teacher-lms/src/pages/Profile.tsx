import React, { useState, useEffect, useRef } from 'react';
import { useTeacherAuth } from '../contexts/TeacherAuthContext';
import { supabase } from '../services/supabase';
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Calendar,
  ShieldCheck,
  Building,
  Sun,
  Moon,
  LogOut,
  CheckCircle2,
  Lock,
  Edit3,
  Camera,
  X,
  Key,
  MapPin,
  HeartHandshake,
  Eye,
  EyeOff,
  AlertCircle,
  Briefcase,
  IdCard,
  Loader2,
} from 'lucide-react';
import './Profile.css';

interface StaffFullData {
  id: number;
  name: string;
  role?: string;
  mobile?: string | null;
  picture_url?: string | null;
  joining_date?: string | null;
  father_name?: string | null;
  gender?: string | null;
  experience?: string | null;
  national_id?: string | null;
  education?: string | null;
  religion?: string | null;
  blood_group?: string | null;
  email?: string | null;
  dob?: string | null;
  address?: string | null;
  school_name?: string;
}

export const Profile: React.FC = () => {
  const { teacher, logout, updateLocalProfile, refreshProfile } = useTeacherAuth();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('teacher-theme') as 'dark' | 'light') || 'dark';
  });

  const [staffData, setStaffData] = useState<StaffFullData | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Edit Profile Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState({
    name: '',
    mobile: '',
    email: '',
    father_name: '',
    gender: 'Male',
    dob: '',
    blood_group: '',
    address: '',
    qualification: '',
    experience: '',
    national_id: '',
    photo_url: '',
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Password Modal State
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Fetch full staff details from Supabase
  const loadStaffDetails = async () => {
    if (!teacher) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('id', teacher.id)
        .single();

      if (!error && data) {
        setStaffData({
          ...data,
          school_name: teacher.school_name,
        });
      }
    } catch (err) {
      console.error('Error fetching full staff details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaffDetails();
  }, [teacher]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('teacher-theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Open Edit Modal with current data
  const handleOpenEdit = () => {
    const current = staffData || (teacher as any);
    setEditForm({
      name: current?.name || teacher?.name || '',
      mobile: current?.mobile || teacher?.phone || '',
      email: current?.email || teacher?.email || '',
      father_name: current?.father_name || '',
      gender: current?.gender || teacher?.gender || 'Male',
      dob: current?.dob || '',
      blood_group: current?.blood_group || '',
      address: current?.address || '',
      qualification: current?.education || teacher?.qualification || '',
      experience: current?.experience || '',
      national_id: current?.national_id || '',
      photo_url: current?.picture_url || teacher?.photo_url || '',
    });
    setPhotoFile(null);
    setPhotoPreview(current?.picture_url || teacher?.photo_url || null);
    setIsEditOpen(true);
  };

  // Handle Photo File Selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMessage({ type: 'error', text: 'Please select a valid image file (PNG, JPG, WebP).' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'Image file size must be less than 5MB.' });
      return;
    }

    setPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
  };

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher) return;

    if (!editForm.name.trim()) {
      setStatusMessage({ type: 'error', text: 'Full Name is required.' });
      return;
    }

    if (!editForm.mobile.trim()) {
      setStatusMessage({ type: 'error', text: 'Mobile Number is required for faculty records.' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      let finalPhotoUrl = editForm.photo_url || null;

      // 1. Upload photo if new file selected
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop() || 'jpg';
        const fileName = `teacher_${teacher.id}_${Date.now()}.${fileExt}`;
        const filePath = `staff/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('staff-avatars')
          .upload(filePath, photoFile, { upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('staff-avatars')
            .getPublicUrl(filePath);
          if (urlData?.publicUrl) {
            finalPhotoUrl = urlData.publicUrl;
          }
        } else {
          console.warn('Storage upload note:', uploadError.message);
        }
      }

      // 2. Update staff table
      const updatePayload = {
        name: editForm.name.trim(),
        mobile: editForm.mobile.trim(),
        email: editForm.email.trim() || null,
        father_name: editForm.father_name.trim() || null,
        gender: editForm.gender || null,
        dob: editForm.dob || null,
        blood_group: editForm.blood_group || null,
        address: editForm.address.trim() || null,
        education: editForm.qualification.trim() || null,
        experience: editForm.experience.trim() || null,
        national_id: editForm.national_id.trim() || null,
        picture_url: finalPhotoUrl,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('staff')
        .update(updatePayload)
        .eq('id', teacher.id);

      if (updateError) {
        throw updateError;
      }

      // 3. Update local session so navigation and header reflect changes immediately
      updateLocalProfile({
        name: editForm.name.trim(),
        phone: editForm.mobile.trim(),
        email: editForm.email.trim() || null,
        qualification: editForm.qualification.trim() || null,
        gender: editForm.gender || null,
        photo_url: finalPhotoUrl,
      });

      // 4. Update local state
      setStaffData((prev) => (prev ? { ...prev, ...updatePayload } : null));

      setIsEditOpen(false);
      setStatusMessage({ type: 'success', text: 'Faculty profile updated successfully!' });
      setTimeout(() => setStatusMessage(null), 4500);

      // Background refresh
      refreshProfile();
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to update profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Save Password Change
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher) return;

    if (!newPassword || newPassword.length < 6) {
      setStatusMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setIsSavingPassword(true);
    setStatusMessage(null);

    try {
      // Find matching user in users table
      const { data: matchedUser } = await supabase
        .from('users')
        .select('id, username')
        .or(`staff_id.eq.${teacher.id},id.eq.${teacher.user_id || -1}`)
        .maybeSingle();

      if (matchedUser) {
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({
            password: newPassword,
            updated_at: new Date().toISOString(),
          })
          .eq('id', matchedUser.id);

        if (userUpdateError) throw userUpdateError;
      } else {
        // Fallback: check by username or mobile
        const { error: updateByPhone } = await supabase
          .from('users')
          .update({
            password: newPassword,
            updated_at: new Date().toISOString(),
          })
          .eq('phone', teacher.phone || '');

        if (updateByPhone) throw updateByPhone;
      }

      setIsPasswordOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      setStatusMessage({ type: 'success', text: 'Portal security password updated successfully!' });
      setTimeout(() => setStatusMessage(null), 4500);
    } catch (err: any) {
      console.error('Failed to update password:', err);
      setStatusMessage({ type: 'error', text: err?.message || 'Could not update password. Please contact the administrator.' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const activePhoto = staffData?.picture_url || teacher?.photo_url;
  const activeName = staffData?.name || teacher?.name || 'Faculty Member';
  const activeDesignation = teacher?.designation || staffData?.education || 'Teacher';
  const activeEmpId = teacher?.employee_id || (staffData?.national_id ? `CNIC: ${staffData.national_id}` : `ID: EMP-${teacher?.id}`);

  return (
    <div className="profile-module-page">
      {/* STATUS TOAST FEEDBACK */}
      {statusMessage && (
        <div className={`profile-toast-banner ${statusMessage.type}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            style={{ width: '24px', height: '24px' }}
            onClick={() => setStatusMessage(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 1. HERO IDENTITY CARD */}
      <div className="profile-hero-card">
        <div className="profile-hero-left">
          <div className="profile-avatar-wrap">
            {activePhoto ? (
              <img src={activePhoto} alt={activeName} className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-fallback">
                {activeName.charAt(0) || 'F'}
              </div>
            )}
            <span className="profile-online-badge" title="Active Verified Faculty" />
            <button
              type="button"
              className="profile-avatar-quick-btn"
              onClick={handleOpenEdit}
              title="Change Profile Photo"
            >
              <Camera size={13} />
            </button>
          </div>

          <div className="profile-hero-meta">
            <h2 className="profile-hero-name">{activeName}</h2>
            <div className="profile-hero-tags">
              <span className="profile-designation-badge">
                {activeDesignation}
              </span>
              <span className="profile-empid-badge">
                {activeEmpId}
              </span>
              <span className="badge badge-emerald">
                <CheckCircle2 size={12} /> Active Faculty
              </span>
            </div>
          </div>
        </div>

        <div className="profile-hero-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleOpenEdit}
            title="Edit faculty profile details"
          >
            <Edit3 size={15} />
            <span>Edit Profile</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsPasswordOpen(true)}
            title="Update portal login credentials"
          >
            <Key size={15} />
            <span>Security</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={toggleTheme}
            title="Toggle portal color theme"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={logout}
            title="Sign out of teacher portal"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* 2. CREDENTIALS & PREFERENCES GRID */}
      <div className="profile-grid-container">
        {/* PERSONAL DETAILS CARD */}
        <div className="profile-section-card">
          <div className="profile-section-header">
            <div className="profile-section-header-left">
              <div className="profile-section-icon">
                <User size={18} />
              </div>
              <h3 className="profile-section-title">Personal Information</h3>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleOpenEdit}
              title="Edit Personal Information"
            >
              <Edit3 size={14} />
            </button>
          </div>

          <div className="profile-details-list">
            <div className="profile-detail-row">
              <span className="profile-detail-label">
                <User size={14} /> Full Name
              </span>
              <span className="profile-detail-value">{activeName}</span>
            </div>

            <div className="profile-detail-row">
              <span className="profile-detail-label">
                <HeartHandshake size={14} /> Father / Guardian
              </span>
              <span className="profile-detail-value">
                {staffData?.father_name || 'Not Recorded'}
              </span>
            </div>

            <div className="profile-detail-row">
              <span className="profile-detail-label">
                <User size={14} /> Gender
              </span>
              <span className="profile-detail-value">
                {staffData?.gender || teacher?.gender || 'Not Specified'}
              </span>
            </div>

            <div className="profile-detail-row">
              <span className="profile-detail-label">
                <Calendar size={14} /> Date of Birth
              </span>
              <span className="profile-detail-value">
                {staffData?.dob
                  ? new Date(staffData.dob).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Not Recorded'}
              </span>
            </div>

            <div className="profile-detail-row">
              <span className="profile-detail-label">
                <HeartHandshake size={14} /> Blood Group
              </span>
              <span className="profile-detail-value">
                {staffData?.blood_group || 'Not Recorded'}
              </span>
            </div>

            <div className="profile-detail-row">
              <span className="profile-detail-label">
                <IdCard size={14} /> National ID / CNIC
              </span>
              <span className="profile-detail-value">
                {staffData?.national_id || 'Not Recorded'}
              </span>
            </div>

            <div className="profile-detail-row">
              <span className="profile-detail-label">
                <MapPin size={14} /> Residential Address
              </span>
              <span className="profile-detail-value">
                {staffData?.address || 'On Record with HR'}
              </span>
            </div>
          </div>
        </div>

        {/* ACADEMIC & INSTITUTIONAL CREDENTIALS */}
        <div className="profile-section-card">
          <div className="profile-section-header">
            <div className="profile-section-header-left">
              <div className="profile-section-icon">
                <GraduationCap size={18} />
              </div>
              <h3 className="profile-section-title">Academic & Institutional</h3>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleOpenEdit}
              title="Edit Academic Details"
            >
              <Edit3 size={14} />
            </button>
          </div>

          <div className="profile-details-list">
            <div className="profile-detail-row">
              <span className="profile-detail-label">
                <Building size={14} /> Institution
              </span>
              <span className="profile-detail-value">
                {teacher?.school_name || 'Al Haram Public School and Iqra Academy'}
              </span>
            </div>

            <div className="profile-detail-row">
              <span className="profile-detail-label">
                <ShieldCheck size={14} /> System Role
              </span>
              <span className="profile-detail-value">
                {teacher?.role || 'Teacher'} (Faculty Portal)
              </span>
            </div>

            <div className="profile-detail-row">
              <span className="profile-detail-label">
                <GraduationCap size={14} /> Highest Education
              </span>
              <span className="profile-detail-value">
                {staffData?.education || teacher?.qualification || 'Certified Faculty'}
              </span>
            </div>

            <div className="profile-detail-row">
              <span className="profile-detail-label">
                <Briefcase size={14} /> Teaching Experience
              </span>
              <span className="profile-detail-value">
                {staffData?.experience || 'Professional Educator'}
              </span>
            </div>

            <div className="profile-detail-row">
              <span className="profile-detail-label">
                <Calendar size={14} /> Appointment Date
              </span>
              <span className="profile-detail-value">
                {staffData?.joining_date || teacher?.joining_date
                  ? new Date(staffData?.joining_date || teacher?.joining_date!).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Official Staff Roster'}
              </span>
            </div>
          </div>
        </div>

        {/* CONTACT & SECURITY */}
        <div className="profile-section-card">
          <div className="profile-section-header">
            <div className="profile-section-header-left">
              <div className="profile-section-icon">
                <Lock size={18} />
              </div>
              <h3 className="profile-section-title">Contact & Portal Security</h3>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setIsPasswordOpen(true)}
              title="Update Portal Password"
            >
              <Key size={14} />
            </button>
          </div>

          <div className="profile-details-list">
            <div className="profile-detail-row">
              <span className="profile-detail-label">
                <Phone size={14} /> Official Mobile
              </span>
              <span className="profile-detail-value">
                {staffData?.mobile || teacher?.phone || 'On Record with HR'}
              </span>
            </div>

            <div className="profile-detail-row">
              <span className="profile-detail-label">
                <Mail size={14} /> Official Email
              </span>
              <span className="profile-detail-value">
                {staffData?.email || teacher?.email || 'Registered Staff Account'}
              </span>
            </div>

            <div className="profile-preference-row" style={{ marginTop: '0.35rem' }}>
              <div className="profile-preference-info">
                <span className="profile-preference-title">Portal Password</span>
                <span className="profile-preference-sub">
                  Secure password for teacher portal logins
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsPasswordOpen(true)}
              >
                Change
              </button>
            </div>

            <div className="profile-preference-row">
              <div className="profile-preference-info">
                <span className="profile-preference-title">Display Theme Mode</span>
                <span className="profile-preference-sub">
                  {theme === 'dark' ? 'Executive Dark Mode' : 'Crisp Light Mode'}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={toggleTheme}
              >
                Toggle
              </button>
            </div>

            <div className="profile-preference-row">
              <div className="profile-preference-info">
                <span className="profile-preference-title">Session Security</span>
                <span className="profile-preference-sub">
                  Authenticated session active on current browser
                </span>
              </div>
              <span className="badge badge-emerald">Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. EDIT PROFILE MODAL */}
      {isEditOpen && (
        <div className="profile-modal-overlay" onClick={() => !isSaving && setIsEditOpen(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <div className="profile-modal-title-group">
                <Edit3 size={18} className="text-emerald-500" />
                <h3 className="profile-modal-title">Update Faculty Profile</h3>
              </div>
              <button
                type="button"
                className="btn btn-icon btn-ghost"
                onClick={() => !isSaving && setIsEditOpen(false)}
                disabled={isSaving}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="profile-modal-body">
              {/* Photo Upload Area */}
              <div className="profile-photo-upload-row">
                <div className="profile-photo-preview-wrap">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="profile-photo-preview-img" />
                  ) : (
                    <div className="profile-avatar-fallback">
                      {editForm.name.charAt(0) || 'F'}
                    </div>
                  )}
                </div>
                <div className="profile-photo-upload-meta">
                  <h4 className="profile-photo-upload-title">Faculty Portrait</h4>
                  <p className="profile-photo-upload-hint">
                    Upload a square PNG, JPG, or WebP photo up to 5MB.
                  </p>
                  <div className="profile-photo-actions">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handlePhotoSelect}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera size={13} />
                      <span>Choose Photo</span>
                    </button>
                    {photoPreview && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                          setEditForm({ ...editForm, photo_url: '' });
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Grid */}
              <div className="profile-form-grid">
                <div className="profile-form-group">
                  <label className="profile-form-label">
                    Full Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="profile-form-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="e.g. Wasim Abbas"
                  />
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label">
                    Father / Guardian Name
                  </label>
                  <input
                    type="text"
                    className="profile-form-input"
                    value={editForm.father_name}
                    onChange={(e) => setEditForm({ ...editForm, father_name: e.target.value })}
                    placeholder="e.g. Muhammad Abbas"
                  />
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label">
                    Official Mobile / WhatsApp <span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    className="profile-form-input"
                    value={editForm.mobile}
                    onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                    placeholder="e.g. 03001234567"
                  />
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label">
                    Official Email
                  </label>
                  <input
                    type="email"
                    className="profile-form-input"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="e.g. teacher@growmore.edu"
                  />
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label">Gender</label>
                  <select
                    className="profile-form-select"
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label">Date of Birth</label>
                  <input
                    type="date"
                    className="profile-form-input"
                    value={editForm.dob}
                    onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                  />
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label">Blood Group</label>
                  <select
                    className="profile-form-select"
                    value={editForm.blood_group}
                    onChange={(e) => setEditForm({ ...editForm, blood_group: e.target.value })}
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label">National ID / CNIC</label>
                  <input
                    type="text"
                    className="profile-form-input"
                    value={editForm.national_id}
                    onChange={(e) => setEditForm({ ...editForm, national_id: e.target.value })}
                    placeholder="e.g. 37405-1234567-1"
                  />
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label">Highest Qualification</label>
                  <input
                    type="text"
                    className="profile-form-input"
                    value={editForm.qualification}
                    onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
                    placeholder="e.g. M.Sc Mathematics, B.Ed"
                  />
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label">Teaching Experience</label>
                  <input
                    type="text"
                    className="profile-form-input"
                    value={editForm.experience}
                    onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })}
                    placeholder="e.g. 6 Years"
                  />
                </div>

                <div className="profile-form-group full-width">
                  <label className="profile-form-label">Residential Address</label>
                  <textarea
                    className="profile-form-textarea"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    placeholder="Enter complete residential address"
                    rows={2}
                  />
                </div>
              </div>

              <div className="profile-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsEditOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving Changes…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Save Profile</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. CHANGE PASSWORD MODAL */}
      {isPasswordOpen && (
        <div className="profile-modal-overlay" onClick={() => !isSavingPassword && setIsPasswordOpen(false)}>
          <div className="profile-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <div className="profile-modal-title-group">
                <Key size={18} className="text-emerald-500" />
                <h3 className="profile-modal-title">Change Portal Password</h3>
              </div>
              <button
                type="button"
                className="btn btn-icon btn-ghost"
                onClick={() => !isSavingPassword && setIsPasswordOpen(false)}
                disabled={isSavingPassword}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="profile-modal-body">
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Set a new password for logging into the GrowMore Teachers LMS Portal.
              </p>

              <div className="profile-form-group">
                <label className="profile-form-label">
                  New Password <span className="required">*</span>
                </label>
                <div className="profile-password-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    className="profile-form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    className="profile-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="profile-form-group">
                <label className="profile-form-label">
                  Confirm New Password <span className="required">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="profile-form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />
              </div>

              <div className="profile-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsPasswordOpen(false)}
                  disabled={isSavingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSavingPassword}
                >
                  {isSavingPassword ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Updating…</span>
                    </>
                  ) : (
                    <>
                      <Lock size={14} />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
