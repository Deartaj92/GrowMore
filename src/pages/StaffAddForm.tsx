import React, { useState, useContext, useRef, useEffect } from 'react';
import styled, { ThemeProvider, keyframes } from 'styled-components';
import { AccountCircle } from '@mui/icons-material';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { useToast } from '../components/useToast';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import imageCompression from 'browser-image-compression';
import NoSessionsFound from '../components/NoSessionsFound';

const ModernForm = styled.form`
  background: ${({ theme }) => theme.CARD};
  border-radius: 0;
  box-shadow: none;
  border: none;
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 24px;
  position: relative;
  overflow-y: auto;
`;

const LargeAvatarCircle = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 4px solid ${({ theme }) => theme.FIELD_BORDER};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  margin-bottom: 32px;
  transition: box-shadow 0.18s;
  &:hover {
    box-shadow: 0 0 0 4px ${({ theme }) => theme.FIELD_BORDER}99;
  }
`;

const AvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const AvatarIcon = styled(AccountCircle)`
  font-size: 2.8rem !important;
  color: #bbb;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const RemoveButton = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background:rgb(127, 6, 0);
  color: #fff;
  border: 1.2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.92rem;
  opacity: 1;
  z-index: 2;
  cursor: pointer;
  box-shadow: 0 2px 8px #0002;
  transition: background 0.18s, color 0.18s, box-shadow 0.18s;
  &:hover {
    background: #e0483e;
    color: #fff;
    border: 1.2px solid #fff;
    box-shadow: 0 4px 16px #ff5f5633;
  }
`;

const FormHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px 24px 8px 24px;
  position: relative;
  @media (max-width: 700px) {
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 24px 8px 6px 8px;
  }
`;

const FormTitle = styled.h2`
  font-size: 1.18rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 auto 24px auto;
  text-align: center;
  width: 100%;
`;

const PillButton = styled.button`
  padding: 7px 18px;
  border-radius: 999px;
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.ACCENT_INPUT};
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: none;
  transition: background 0.18s, color 0.18s, border 0.18s;
  width: 100%;
  max-width: 260px;
  margin: 0 auto;
  &:hover, &:focus {
    background: ${({ theme }) => theme.ACCENT_INPUT};
    color: #fff;
    border-color: ${({ theme }) => theme.ACCENT_INPUT};
  }
`;

const ThemedCancelButton = styled(PillButton)`
  background: ${({ theme }) => theme.CANCEL_BG};
  color: ${({ theme }) => theme.CANCEL_COLOR};
  &:hover, &:focus {
    background: ${({ theme }) => theme.ACCENT_INPUT};
    color: #fff;
    border-color: ${({ theme }) => theme.ACCENT_INPUT};
  }
`;

const ModernGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px 16px;
  width: 100%;
  flex: 1;
  min-height: 0;
  padding: 0 24px;
  box-sizing: border-box;
  @media (max-width: 900px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 0 8px;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const Label = styled.label`
  font-size: 0.92rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const Input = styled.input`
  padding: 7px 10px;
  border-radius: 8px;
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.98rem;
  outline: none;
  transition: border 0.18s, box-shadow 0.18s;
  &:focus {
    border: 1.2px solid ${({ theme }) => theme.ACCENT_INPUT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT_INPUT}33;
  }
  width: 100%;
  box-sizing: border-box;
`;

const Select = styled.select`
  padding: 7px 10px;
  border-radius: 8px;
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.98rem;
  outline: none;
  transition: border 0.18s, box-shadow 0.18s;
  &:focus {
    border: 1.2px solid ${({ theme }) => theme.ACCENT_INPUT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT_INPUT}33;
  }
  width: 100%;
  box-sizing: border-box;
`;

const Textarea = styled.textarea`
  padding: 7px 10px;
  border-radius: 8px;
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.98rem;
  outline: none;
  min-height: 48px;
  transition: border 0.18s, box-shadow 0.18s;
  &:focus {
    border: 1.2px solid ${({ theme }) => theme.ACCENT_INPUT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT_INPUT}33;
  }
  width: 100%;
  box-sizing: border-box;
`;

const SectionContainer = styled.div`
  margin-bottom: 32px;
  position: relative;
  z-index: 1;
`;

const FormBlocks = styled.div`
  display: flex;
  flex-direction: row;
  gap: 32px;
  width: 100%;
  height: 100%;
  background: transparent;
  @media (max-width: 900px) {
    flex-direction: column;
    gap: 18px;
  }
`;

const CardBlock = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 18px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 220px;
  max-width: 340px;
  flex: 0 0 260px;
  @media (max-width: 900px) {
    width: 100%;
    max-width: 100vw;
    min-width: 0;
    padding: 18px 8px;
    margin-bottom: 0;
  }
`;

const FieldsCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 18px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  padding: 32px 24px;
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  z-index: 1;
  @media (max-width: 900px) {
    width: 100%;
    padding: 18px 8px;
    border-radius: 12px;
  }
`;

const ActionsBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  margin-top: 24px;
  width: 100%;
  @media (max-width: 900px) {
    flex-direction: column;
    align-items: center;
    margin-top: 18px;
    gap: 10px;
    width: 100%;
  }
`;

const RsPrefix = styled.span`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #888;
  font-size: 0.98rem;
  pointer-events: none;
`;
const RsInputWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const RELIGION_OPTIONS = ['Muslim', 'Christianity', 'Hinduism', 'Sikhism', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'];
const ROLE_OPTIONS = ['Principal', 'Management Staff', 'Teacher', 'Accountant', 'Store Manager', 'Other'];

const getToday = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

const StaffAddForm: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const themeObj = theme === 'dark' ? darkTheme : lightTheme;
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const editId = queryParams.get('edit');
  const { user } = useAuth();
  
  // Check if user has school_id
  if (!user?.school_id) {
    return (
      <ThemeProvider theme={themeObj}>
        <ModernForm>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '2rem', 
            gap: 16,
            color: '#888',
            fontSize: '1.1rem',
            fontWeight: 600
          }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            No school context found. Please contact your administrator.
          </div>
        </ModernForm>
      </ThemeProvider>
    );
  }

  const [form, setForm] = useState({
    name: '',
    mobile: '',
    role: '',
    picture: null as string | null,
    pictureFile: null as File | null,
    joiningDate: getToday(),
    salary: '',
    fatherName: '',
    gender: 'Male',
    experience: '',
    nationalId: '',
    education: '',
    religion: '',
    bloodGroup: '',
    email: '',
    dob: '2000-01-01',
    address: '',
  });
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    if (editId) {
      const fetchEmployee = async () => {
        if (!user?.school_id) return;
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('id', editId)
          .eq('school_id', user.school_id)
          .single();
        if (!error && data) {
          setForm({
            name: data.name || '',
            mobile: data.mobile || '',
            role: data.role || '',
            picture: null,
            pictureFile: null,
            joiningDate: data.joining_date || getToday(),
            salary: data.salary ? String(data.salary) : '',
            fatherName: data.father_name || '',
            gender: data.gender || '',
            experience: data.experience || '',
            nationalId: data.national_id || '',
            education: data.education || '',
            religion: data.religion || '',
            bloodGroup: data.blood_group || '',
            email: data.email || '',
            dob: data.dob || '2000-01-01',
            address: data.address || '',
          });
          setImage(data.picture_url || null);
        }
      };
      fetchEmployee();
    }
  }, [editId, user?.school_id]);

  // Fetch sessions
  useEffect(() => {
    const fetchSessions = async () => {
      if (!user?.school_id) return;
      
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name')
        .eq('school_id', user.school_id)
        .order('name');
      if (!error && data) {
        setSessions(data);
      }
    };
    fetchSessions();
  }, [user?.school_id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      let file = e.target.files[0];
      // If file is larger than 100KB, compress it
      if (file.size > 100 * 1024) {
        try {
          file = await imageCompression(file, {
            maxSizeMB: 0.09, // Stricter: target < 100KB
            maxWidthOrHeight: 400, // Stricter: smaller dimensions
            useWebWorker: true,
          });
        } catch (err) {
          showToast('Failed to compress image', 'error');
          return;
        }
      }
      // Log the file size for debugging
      console.log('Compressed file size:', file.size / 1024, 'KB');
      // For preview
      const reader = new FileReader();
      reader.onload = ev => setImage(ev.target?.result as string);
      reader.readAsDataURL(file);
      // Store the file for upload
      setForm(prev => ({ ...prev, pictureFile: file }));
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImage(null);
    setForm(prev => ({ ...prev, pictureFile: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleReset = () => {
    setForm({
      name: '',
      mobile: '',
      role: '',
      picture: null,
      pictureFile: null,
      joiningDate: getToday(),
      salary: '',
      fatherName: '',
      gender: 'Male',
      experience: '',
      nationalId: '',
      education: '',
      religion: '',
      bloodGroup: '',
      email: '',
      dob: '2000-01-01',
      address: '',
    });
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school_id) {
      showToast('No school context found. Please contact your administrator.', 'error');
      return;
    }
    setLoading(true);
    try {
      let picture_url = image;
      // If a new image is uploaded, upload it
      if (form.pictureFile) {
        const fileExt = form.pictureFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `staff/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('staff-avatars')
          .upload(filePath, form.pictureFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('staff-avatars')
          .getPublicUrl(filePath);
        picture_url = publicUrl;
      }

      const staffData = {
        name: form.name.trim(),
        role: form.role,
        mobile: form.mobile.trim(),
        picture_url,
        joining_date: form.joiningDate,
        salary: form.salary ? parseFloat(form.salary) : null,
        father_name: form.fatherName.trim() || null,
        gender: form.gender || null,
        experience: form.experience.trim() || null,
        national_id: form.nationalId.trim() || null,
        education: form.education.trim() || null,
        religion: form.religion || null,
        blood_group: form.bloodGroup || null,
        email: form.email.trim() || null,
        dob: form.dob || null,
        address: form.address.trim() || null,
        school_id: user.school_id
      };

      let result;
      if (editId) {
        // Update existing staff member
        const { data, error: updateError } = await supabase
          .from('staff')
          .update(staffData)
          .eq('id', editId)
          .eq('school_id', user.school_id)
          .select()
          .single();
        
        if (updateError) {
          console.error('Error updating staff record:', updateError);
          throw updateError;
        }
        result = data;
        showToast('Staff member updated successfully', 'success');
      } else {
        // Insert new staff member
        const { data, error: insertError } = await supabase
          .from('staff')
          .insert([staffData])
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting staff record:', insertError);
          throw insertError;
        }
        result = data;
        showToast('Staff member added successfully', 'success');
      }

      navigate('/employees');
    } catch (error: any) {
      console.error('Error saving staff member:', error);
      showToast(error.message || 'Failed to save staff member', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Show NoSessionsFound if there are no sessions
  if (sessions.length === 0) {
    return <NoSessionsFound />;
  }

  return (
    <ThemeProvider theme={themeObj}>
      <ModernForm onSubmit={handleSubmit}>
        <FormBlocks>
          <CardBlock>
            <LargeAvatarCircle onClick={handleAvatarClick} title="Click to upload/change photo">
              {image ? <AvatarImg src={image} alt="Preview" /> : <AvatarIcon />}
              {image && (
                <RemoveButton type="button" onClick={handleRemoveImage} title="Remove photo">×</RemoveButton>
              )}
              <HiddenFileInput
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImage}
              />
            </LargeAvatarCircle>
            <ActionsBlock>
              <PillButton type="submit" disabled={loading}>{loading ? (editId ? 'Updating...' : 'Saving...') : (editId ? 'Update' : 'Save')}</PillButton>
              <PillButton type="button" onClick={handleReset}>Reset</PillButton>
            </ActionsBlock>
          </CardBlock>
          <FieldsCard>
            <FormTitle>{editId ? 'Edit Staff Member' : 'Add Staff Member'}</FormTitle>
            <SectionContainer>
              <div style={{ fontWeight: 700, fontSize: '1.18rem', margin: '18px 0 8px 0', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '1.3em', marginRight: 8 }}>①</span> Basic Information
              </div>
              <ModernGrid>
                <Field><Label>Employee Name*</Label><Input name="name" value={form.name} onChange={handleChange} required /></Field>
                <Field><Label>Mobile No for SMS/WhatsApp*</Label><Input name="mobile" value={form.mobile} onChange={handleChange} placeholder="e.g +92xxxxxxxxxx" /></Field>
                <Field><Label>Employee Role*</Label><Select name="role" value={form.role} onChange={handleChange} required><option value="">Select*</option>{ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}</Select></Field>
                <Field><Label>Date of Joining*</Label><Input name="joiningDate" type="date" value={form.joiningDate} onChange={handleChange} /></Field>
                <Field><Label>Monthly Salary*</Label><RsInputWrapper><RsPrefix>Rs.</RsPrefix><Input name="salary" type="number" min="0" value={form.salary} onChange={handleChange} style={{ paddingLeft: 38 }} /></RsInputWrapper></Field>
              </ModernGrid>
            </SectionContainer>
            <SectionContainer>
              <div style={{ fontWeight: 700, fontSize: '1.18rem', margin: '18px 0 8px 0', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '1.3em', marginRight: 8 }}>②</span> Other Information
              </div>
              <ModernGrid>
                <Field><Label>Father / Husband Name</Label><Input name="fatherName" value={form.fatherName} onChange={handleChange} /></Field>
                <Field><Label>Gender</Label><Select name="gender" value={form.gender} onChange={handleChange}><option value="">Select</option>{GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}</Select></Field>
                <Field><Label>Experience</Label><Input name="experience" value={form.experience} onChange={handleChange} /></Field>
                <Field><Label>National ID</Label><Input name="nationalId" value={form.nationalId} onChange={handleChange} /></Field>
                <Field><Label>Education</Label><Input name="education" value={form.education} onChange={handleChange} /></Field>
                <Field><Label>Religion</Label><Select name="religion" value={form.religion} onChange={handleChange}><option value="">Select</option>{RELIGION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}</Select></Field>
                <Field><Label>Blood Group</Label><Select name="bloodGroup" value={form.bloodGroup} onChange={handleChange}><option value="">Select</option>{BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}</Select></Field>
                <Field><Label>Email Address</Label><Input name="email" type="email" value={form.email} onChange={handleChange} /></Field>
                <Field><Label>Date of Birth</Label><Input name="dob" type="date" value={form.dob} onChange={handleChange} /></Field>
                <Field style={{ gridColumn: '1 / -1' }}><Label>Home Address</Label><Textarea name="address" value={form.address} onChange={handleChange} /></Field>
              </ModernGrid>
            </SectionContainer>
          </FieldsCard>
        </FormBlocks>
      </ModernForm>
    </ThemeProvider>
  );
};

export default StaffAddForm; 