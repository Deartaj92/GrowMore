import React, { useState, useContext, useRef, useEffect } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import {
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  IconButton,
  Box,
  Typography,
  Grid,
} from '@mui/material';
import {
  AccountCircle,
  CloudUpload,
  Close,
  Save,
  Refresh,
} from '@mui/icons-material';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { useToast } from '../components/useToast';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import imageCompression from 'browser-image-compression';
import NoSessionsFound from '../components/NoSessionsFound';
import Loader from '../components/Loader';

const FormWrapper = styled.form`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: 100vh;
  background: ${({ theme }) => theme.BG};
  
  @media (min-width: 1200px) {
    padding: 20px 32px;
  }
`;

const Container = styled(Box)`
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
`;

const MainCard = styled(Box)`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex: 1;
  min-width: 0;
  min-height: fit-content;
  display: flex;
  flex-direction: column;
  
  @media (min-width: 960px) {
    padding: 24px;
    min-height: calc(100vh - 120px);
  }
  
  @media (max-width: 959px) {
    min-height: auto;
  }
`;

const SidebarCard = styled(Box)`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 16px;
  height: fit-content;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  
  @media (min-width: 960px) {
    min-height: calc(100vh - 120px);
    align-items: stretch;
  }
  
  @media (max-width: 959px) {
    position: relative;
    top: 0;
    margin-bottom: 16px;
    max-height: none;
    min-height: auto;
  }
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
    
    &:hover {
      background: rgba(0, 0, 0, 0.3);
    }
  }
`;

const ButtonRow = styled(Box)`
  display: flex;
  gap: 8px;
  width: 100%;
  max-width: 280px;
  margin: 12px auto 0 auto;
  align-items: center;
  justify-content: center;
  
  button {
    flex: 1;
  }
  
  @media (max-width: 959px) {
    max-width: 200px;
  }
  
  @media (min-width: 960px) and (max-width: 1279px) {
    max-width: 240px;
  }
`;

const ActionButtonsContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: auto;
  padding-top: 20px;
  width: 100%;
`;

const AvatarWrapper = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
  width: 100%;
`;

const ImageBox = styled(Box)`
  width: 100%;
  max-width: 280px;
  aspect-ratio: 1;
  border-radius: 12px;
  border: 2px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.FIELD_BG || theme.BG};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  position: relative;
  margin: 0 auto;
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT_INPUT};
    transform: scale(1.01);
  }
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  @media (max-width: 959px) {
    max-width: 200px;
  }
  
  @media (min-width: 960px) and (max-width: 1279px) {
    max-width: 240px;
  }
`;

const RemoveBtn = styled(Button)`
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 0.75rem;
  text-transform: none;
  min-width: auto;
  flex: 0 0 auto;
  
  &:hover {
    background: rgba(239, 68, 68, 1);
  }
  
  svg {
    font-size: 16px;
  }
`;

const SectionHeader = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

const SectionBadge = styled(Box)`
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: ${({ theme }) => theme.ACCENT_INPUT};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
`;

const CompactTextField = styled(TextField)`
  & .MuiOutlinedInput-root {
    border-radius: 8px;
    font-size: 0.875rem;
    
    input {
      padding: 10px 12px;
    }
  }
  
  & .MuiInputLabel-root {
    font-size: 0.875rem;
  }
`;

const CompactSelect = styled(FormControl)`
  & .MuiOutlinedInput-root {
    border-radius: 8px;
    font-size: 0.875rem;
    
    .MuiSelect-select {
      padding: 10px 12px;
    }
  }
  
  & .MuiInputLabel-root {
    font-size: 0.875rem;
  }
`;

const ActionButton = styled(Button)`
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 500;
  text-transform: none;
  font-size: 0.875rem;
  min-width: 120px;
`;

const PrimaryButton = styled(ActionButton)`
  background: ${({ theme }) => theme.ACCENT_INPUT};
  color: white;
  
  &:hover {
    background: ${({ theme }) => theme.ACCENT_INPUT};
    opacity: 0.9;
  }
  
  &:disabled {
    opacity: 0.5;
  }
`;

const SecondaryButton = styled(ActionButton)`
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border: 1px solid ${({ theme }) => theme.BORDER};
  
  &:hover {
    background: ${({ theme }) => theme.BG};
    border-color: ${({ theme }) => theme.ACCENT_INPUT};
  }
`;

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const RELIGION_OPTIONS = ['Muslim', 'Christianity', 'Hinduism', 'Sikhism', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'];

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
  
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    role: '',
    picture: null as string | null,
    pictureFile: null as File | null,
    joiningDate: getToday(),
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
    notificationChannel: 'whatsapp' as 'whatsapp' | 'sms',
  });
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sessions, setSessions] = useState<Array<{ id: number; name: string }>>([]);
  const [roles, setRoles] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.school_id) {
        setInitialLoading(false);
        return;
      }

      try {
        const [sessionsResult, rolesResult, employeeResult] = await Promise.all([
          supabase
            .from('sessions')
            .select('id, name')
            .eq('school_id', user.school_id)
            .order('name'),
          supabase
            .from('roles')
            .select('id, name')
            .eq('school_id', user.school_id)
            .order('name'),
          editId
            ? supabase
                .from('staff')
                .select('*')
                .eq('id', editId)
                .eq('school_id', user.school_id)
                .single()
            : Promise.resolve({ data: null, error: null })
        ]);

        if (!sessionsResult.error && sessionsResult.data) {
          setSessions(sessionsResult.data);
        }

        if (!rolesResult.error && rolesResult.data) {
          setRoles(rolesResult.data);
        } else if (rolesResult.error) {
          console.error('Error fetching roles:', rolesResult.error);
        }

        if (editId && !employeeResult.error && employeeResult.data) {
          const data = employeeResult.data;
          setForm({
            name: data.name || '',
            mobile: data.mobile || '',
            role: data.role || '',
            picture: null,
            pictureFile: null,
            joiningDate: data.joining_date || getToday(),
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
            notificationChannel: (data.notification_channel as 'whatsapp' | 'sms') || 'whatsapp',
          });
          setImage(data.picture_url || null);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchInitialData();
  }, [editId, user?.school_id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm({ ...form, [name]: value });
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      let file = e.target.files[0];
      if (file.size > 100 * 1024) {
        try {
          file = await imageCompression(file, {
            maxSizeMB: 0.25,
            maxWidthOrHeight: 800,
            useWebWorker: true,
            fileType: 'image/jpeg',
            initialQuality: 0.85
          });
        } catch (err) {
          showToast('Failed to compress image', 'error');
          return;
        }
      }
      const reader = new FileReader();
      reader.onload = ev => setImage(ev.target?.result as string);
      reader.readAsDataURL(file);
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
      notificationChannel: 'whatsapp' as 'whatsapp' | 'sms',
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
        notification_channel: form.notificationChannel || 'whatsapp',
        school_id: user.school_id
      };

      let result;
      if (editId) {
        const { data, error: updateError } = await supabase
          .from('staff')
          .update(staffData)
          .eq('id', editId)
          .eq('school_id', user.school_id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        result = data;
        showToast('Staff member updated successfully', 'success');
      } else {
        const { data, error: insertError } = await supabase
          .from('staff')
          .insert([staffData])
          .select()
          .single();

        if (insertError) throw insertError;
        result = data;
        showToast('Staff member added successfully', 'success');
      }

      navigate('/employees');
    } catch (error: any) {
      showToast(error.message || 'Failed to save staff member', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <Loader />;
  }

  if (!user?.school_id) {
    return (
      <ThemeProvider theme={themeObj}>
        <FormWrapper>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: 2 }}>
            <Typography variant="body1" color="text.secondary">
              ⚠️ No school context found. Please contact your administrator.
            </Typography>
          </Box>
        </FormWrapper>
      </ThemeProvider>
    );
  }

  if (sessions.length === 0) {
    return <NoSessionsFound />;
  }

  return (
    <ThemeProvider theme={themeObj}>
      <FormWrapper onSubmit={handleSubmit}>
        <Container>
          <Grid container spacing={2} sx={{ alignItems: 'flex-start' }}>
            {/* Main Form */}
            <Grid item xs={12} md={8} lg={9}>
              <MainCard>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, fontSize: '1.25rem' }}>
                  {editId ? 'Edit Staff Member' : 'Add Staff Member'}
                </Typography>

                {/* Basic Information */}
                <SectionHeader>
                  <SectionBadge>1</SectionBadge>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    Basic Information
                  </Typography>
                </SectionHeader>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6} lg={4}>
                    <CompactTextField
                      fullWidth
                      label="Employee Name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} lg={4}>
                    <CompactTextField
                      fullWidth
                      label="Mobile No for SMS/WhatsApp"
                      name="mobile"
                      value={form.mobile}
                      onChange={handleChange}
                      required
                      placeholder="e.g +92xxxxxxxxxx"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} lg={4}>
                    <CompactSelect fullWidth size="small">
                      <InputLabel>Notification Channel</InputLabel>
                      <Select
                        value={form.notificationChannel}
                        onChange={(e) => handleSelectChange('notificationChannel', e.target.value)}
                        label="Notification Channel"
                      >
                        <MenuItem value="whatsapp">WhatsApp</MenuItem>
                        <MenuItem value="sms">SMS</MenuItem>
                      </Select>
                    </CompactSelect>
                  </Grid>
                  <Grid item xs={12} sm={6} lg={4}>
                    <CompactSelect fullWidth size="small">
                      <InputLabel>Employee Role *</InputLabel>
                      <Select
                        value={form.role}
                        onChange={(e) => handleSelectChange('role', e.target.value)}
                        label="Employee Role *"
                        required
                      >
                        <MenuItem value="">Select Role</MenuItem>
                        {roles.map(r => (
                          <MenuItem key={r.id} value={r.name}>{r.name}</MenuItem>
                        ))}
                      </Select>
                    </CompactSelect>
                  </Grid>
                  <Grid item xs={12} sm={6} lg={4}>
                    <CompactTextField
                      fullWidth
                      label="Date of Joining"
                      name="joiningDate"
                      type="date"
                      value={form.joiningDate}
                      onChange={handleChange}
                      required
                      InputLabelProps={{ shrink: true }}
                      size="small"
                    />
                  </Grid>
                </Grid>

                {/* Other Information */}
                <SectionHeader>
                  <SectionBadge>2</SectionBadge>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    Other Information
                  </Typography>
                </SectionHeader>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} lg={4}>
                    <CompactTextField
                      fullWidth
                      label="Father / Husband Name"
                      name="fatherName"
                      value={form.fatherName}
                      onChange={handleChange}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} lg={4}>
                    <CompactSelect fullWidth size="small">
                      <InputLabel>Gender</InputLabel>
                      <Select
                        value={form.gender}
                        onChange={(e) => handleSelectChange('gender', e.target.value)}
                        label="Gender"
                      >
                        {GENDER_OPTIONS.map(g => (
                          <MenuItem key={g} value={g}>{g}</MenuItem>
                        ))}
                      </Select>
                    </CompactSelect>
                  </Grid>
                  <Grid item xs={12} sm={6} lg={4}>
                    <CompactTextField
                      fullWidth
                      label="Experience"
                      name="experience"
                      value={form.experience}
                      onChange={handleChange}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} lg={4}>
                    <CompactTextField
                      fullWidth
                      label="National ID"
                      name="nationalId"
                      value={form.nationalId}
                      onChange={handleChange}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} lg={4}>
                    <CompactTextField
                      fullWidth
                      label="Education"
                      name="education"
                      value={form.education}
                      onChange={handleChange}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} lg={4}>
                    <CompactSelect fullWidth size="small">
                      <InputLabel>Religion</InputLabel>
                      <Select
                        value={form.religion}
                        onChange={(e) => handleSelectChange('religion', e.target.value)}
                        label="Religion"
                      >
                        {RELIGION_OPTIONS.map(r => (
                          <MenuItem key={r} value={r}>{r}</MenuItem>
                        ))}
                      </Select>
                    </CompactSelect>
                  </Grid>
                  <Grid item xs={12} sm={6} lg={4}>
                    <CompactSelect fullWidth size="small">
                      <InputLabel>Blood Group</InputLabel>
                      <Select
                        value={form.bloodGroup}
                        onChange={(e) => handleSelectChange('bloodGroup', e.target.value)}
                        label="Blood Group"
                      >
                        {BLOOD_GROUPS.map(bg => (
                          <MenuItem key={bg} value={bg}>{bg}</MenuItem>
                        ))}
                      </Select>
                    </CompactSelect>
                  </Grid>
                  <Grid item xs={12} sm={6} lg={4}>
                    <CompactTextField
                      fullWidth
                      label="Email Address"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} lg={4}>
                    <CompactTextField
                      fullWidth
                      label="Date of Birth"
                      name="dob"
                      type="date"
                      value={form.dob}
                      onChange={handleChange}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <CompactTextField
                      fullWidth
                      label="Home Address"
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      multiline
                      rows={2}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </MainCard>
            </Grid>

            {/* Sidebar - Right Side */}
            <Grid item xs={12} md={4} lg={3}>
              <SidebarCard>
                <AvatarWrapper>
                  <Box sx={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <ImageBox onClick={handleAvatarClick}>
                      {image ? (
                        <img src={image} alt="Profile preview" />
                      ) : (
                        <AccountCircle sx={{ fontSize: 80, color: 'text.secondary' }} />
                      )}
                    </ImageBox>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImage}
                      style={{ display: 'none' }}
                    />
                  </Box>
                  <ButtonRow>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<CloudUpload />}
                      onClick={handleAvatarClick}
                      sx={{ fontSize: '0.75rem', textTransform: 'none', flex: 1 }}
                    >
                      Upload Photo
                    </Button>
                    {image && (
                      <RemoveBtn
                        variant="contained"
                        size="small"
                        startIcon={<Close />}
                        onClick={handleRemoveImage}
                      >
                        Remove
                      </RemoveBtn>
                    )}
                  </ButtonRow>
                </AvatarWrapper>
                <ActionButtonsContainer>
                  <PrimaryButton
                    type="submit"
                    variant="contained"
                    startIcon={<Save />}
                    disabled={loading}
                    fullWidth
                  >
                    {loading ? (editId ? 'Updating...' : 'Saving...') : (editId ? 'Update' : 'Save')}
                  </PrimaryButton>
                  <SecondaryButton
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={handleReset}
                    fullWidth
                  >
                    Reset
                  </SecondaryButton>
                </ActionButtonsContainer>
              </SidebarCard>
            </Grid>
          </Grid>
        </Container>
      </FormWrapper>
    </ThemeProvider>
  );
};

export default StaffAddForm;
