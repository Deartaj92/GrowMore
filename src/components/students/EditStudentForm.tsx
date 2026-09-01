import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Dialog,
  DialogContent,
  IconButton,
  useTheme,
  useMediaQuery,
  styled as muiStyled,
  SelectChangeEvent,
  Typography,
  Divider,
  CircularProgress
} from '@mui/material';
import { Close as CloseIcon, AccountCircle, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import { useToast } from '../useToast';
import imageCompression from 'browser-image-compression';
import { useAuth } from '../../contexts/AuthContext';
import { sortClasses } from '../../utils/classUtils';
import AppDateField from '../shared/AppDateField';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'];
const RELIGIONS = ['Muslim', 'Christianity', 'Hinduism', 'Sikhism', 'Other'];
const NATIONALITIES = ['Pakistani', 'Indian', 'Afghan', 'Bangladeshi', 'Other'];

// Styled components - Compact Design
const StyledDialog = muiStyled(Dialog)(({ theme }) => ({
  zIndex: 1100,
  '& .MuiDialog-container': {
    alignItems: 'center',
    justifyContent: 'center',
  },
  '& .MuiDialog-paper': {
    borderRadius: '16px',
    background: theme.palette.background.paper,
    maxWidth: '800px',
    width: '95%',
    margin: '72px 16px 60px 16px',
    maxHeight: 'calc(100vh - 132px)',
    overflow: 'hidden',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)'
      : '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    zIndex: 1101,
    [theme.breakpoints.down('sm')]: {
      width: 'calc(100% - 20px)',
      margin: '68px 10px 56px 10px',
      maxHeight: 'calc(100vh - 124px)',
      borderRadius: '16px',
    }
  },
  '& .MuiBackdrop-root': {
    top: '64px',
    bottom: '52px',
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(15, 23, 42, 0.8)'
      : 'rgba(15, 23, 42, 0.45)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    position: 'fixed',
    zIndex: 1099
  }
}));

const DialogHeader = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: `1px solid ${theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.05)' 
    : 'rgba(0, 0, 0, 0.05)'}`,
  flexShrink: 0
}));

const DialogTitle = muiStyled(Box)(({ theme }) => ({
  fontSize: '1rem',
  fontWeight: 600,
  color: theme.palette.text.primary,
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
}));

const StyledDialogContent = muiStyled(DialogContent)(({ theme }) => ({
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  overflow: 'hidden'
}));

const FormContent = muiStyled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  minHeight: 0,
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  '&::-webkit-scrollbar': {
    width: '6px'
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent'
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '3px',
    '&:hover': {
      background: 'rgba(0, 0, 0, 0.3)'
    }
  }
}));

const CompactTextField = muiStyled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    fontSize: '0.875rem',
    '& input': {
      padding: '10px 12px'
    }
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.875rem'
  }
}));

const CompactSelect = muiStyled(FormControl)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    fontSize: '0.875rem',
    '& .MuiSelect-select': {
      padding: '10px 12px'
    }
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.875rem'
  }
}));

const FormActions = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '6px',
  padding: '8px 12px',
  borderTop: `1px solid ${theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'}`,
  flexShrink: 0,
  position: 'sticky',
  bottom: 0,
  background: theme.palette.background.paper,
  zIndex: 10,
  '& .MuiButton-root': {
    borderRadius: '6px',
    textTransform: 'none',
    padding: '6px 12px',
    fontSize: '0.75rem',
    fontWeight: 500,
    minWidth: 'auto'
  }
}));

const SectionContainer = muiStyled(Box)({
  marginBottom: '16px'
});

const SectionHeader = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '12px',
  paddingBottom: '8px',
  borderBottom: `1px solid ${theme.palette.divider}`
}));

const SectionBadge = muiStyled(Box)(({ theme }) => ({
  width: '20px',
  height: '20px',
  borderRadius: '6px',
  background: theme.palette.primary.main,
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.75rem',
  fontWeight: 600,
  flexShrink: 0
}));

const ImageBox = muiStyled(Box)(({ theme }) => ({
  width: '80px',
  height: '80px',
  borderRadius: '8px',
  border: `2px solid ${theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : 'rgba(0, 0, 0, 0.1)'}`,
  background: theme.palette.mode === 'dark' ? '#2d3340' : '#f3f4f6',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  position: 'relative',
  cursor: 'pointer',
  transition: 'all 0.2s',
  flexShrink: 0,
  '&:hover': {
    borderColor: theme.palette.primary.main,
    transform: 'scale(1.02)'
  },
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  }
}));

const RemoveButton = muiStyled(IconButton)({
  position: 'absolute',
  top: 4,
  right: 4,
  width: 20,
  height: 20,
  backgroundColor: '#ef4444',
  color: '#fff',
  '&:hover': {
    backgroundColor: '#dc2626'
  },
  '& svg': {
    fontSize: '14px'
  }
});

interface StudentFormData {
  id?: string;
  name: string;
  class_id: string;
  section_id: string;
  admission_date: string;
  phone?: string;
  picture_url?: string | null;
  dob?: string;
  form_b?: string;
  gender?: string;
  cast?: string;
  orphan?: string;
  osc?: string;
  id_mark?: string;
  blood_group?: string;
  previous_school?: string;
  previous_id?: string;
  religion?: string;
  nationality?: string;
  disease?: string;
  additional_note?: string;
  total_siblings?: string;
  address?: string;
  father_name: string;
  father_national_id?: string;
  father_education?: string;
  father_mobile?: string;
  father_occupation?: string;
  father_income?: string;
  mother_name?: string;
  mother_national_id?: string;
  mother_education?: string;
  mother_mobile?: string;
  mother_occupation?: string;
  mother_income?: string;
  notification_channel?: 'whatsapp' | 'sms';
  _newAvatarFile?: File | null;
}

interface EditStudentFormProps {
  onSubmit: (formData: StudentFormData) => Promise<void>;
  onCancel: () => void;
  open: boolean;
  initialData?: StudentFormData;
}

export const EditStudentForm: React.FC<EditStudentFormProps> = ({
  onSubmit,
  onCancel,
  open,
  initialData
}) => {
  const theme = useTheme();
  const { showToast } = useToast();
  const { user } = useAuth();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [formData, setFormData] = useState<StudentFormData>({
    name: '',
    class_id: '',
    section_id: '',
    admission_date: '',
    phone: '',
    picture_url: '',
    dob: '',
    form_b: '',
    gender: '',
    cast: '',
    orphan: '',
    osc: '',
    id_mark: '',
    blood_group: '',
    previous_school: '',
    previous_id: '',
    religion: '',
    nationality: '',
    disease: '',
    additional_note: '',
    total_siblings: '',
    address: '',
    father_name: '',
    father_national_id: '',
    father_education: '',
    father_mobile: '',
    father_occupation: '',
    father_income: '',
    mother_name: '',
    mother_national_id: '',
    mother_education: '',
    mother_mobile: '',
    mother_occupation: '',
    mother_income: '',
    notification_channel: 'whatsapp',
    _newAvatarFile: null
  });
  const [classOptions, setClassOptions] = useState<Array<{ id: string; name: string; has_sections?: boolean }>>([]);
  const [sectionOptions, setSectionOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const avatarFileRef = useRef<File | null>(null); // Store File object in ref to preserve it
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [selectedClassHasSections, setSelectedClassHasSections] = useState<boolean>(true);

  // Update form data when initialData changes (when editing different students)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData(initialData);
      setEditAvatar(initialData.picture_url || null);
      // Clear ref when form is reset
      avatarFileRef.current = null;
    }
  }, [initialData]);

  // Also update form data when the modal opens
  useEffect(() => {
    if (open && initialData && Object.keys(initialData).length > 0) {
      setFormData(initialData);
      setEditAvatar(initialData.picture_url || null);
      // Clear ref when modal opens
      avatarFileRef.current = null;
    }
  }, [open, initialData]);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!user?.school_id) return;
      
      const { data } = await supabase
        .from('classes')
        .select('id, name, has_sections')
        .eq('school_id', user.school_id);
      const sortedClasses = sortClasses(data || []);
      setClassOptions(sortedClasses);
    };
    fetchClasses();
  }, [user?.school_id]);

  useEffect(() => {
    if (!formData.class_id) {
      setSectionOptions([]);
      setSelectedClassHasSections(true);
      return;
    }
    
    // Check if selected class has sections
    const selectedClass = classOptions.find(c => String(c.id) === String(formData.class_id));
    const hasSections = selectedClass?.has_sections ?? true;
    setSelectedClassHasSections(hasSections);
    
    // Only fetch sections if class has sections
    if (!hasSections) {
      setSectionOptions([]);
      setFormData(prev => ({ ...prev, section_id: '' }));
      return;
    }
    
    const fetchSections = async () => {
      if (!user?.school_id) return;
      
      const { data } = await supabase
        .from('sections')
        .select('id, name')
        .eq('class_id', formData.class_id)
        .eq('school_id', user.school_id);
      setSectionOptions(data || []);
    };
    fetchSections();
  }, [formData.class_id, classOptions, user?.school_id]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) {
      return;
    }

    try {
      setIsCompressing(true);
      let file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file', 'error');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsCompressing(false);
        return;
      }

      // If file is larger than 100KB, compress it
      if (file.size > 100 * 1024) {
        try {
          file = await imageCompression(file, {
            maxSizeMB: 0.25,
            maxWidthOrHeight: 300, // Adjusted for perfect 4x downscaling on 80px containers to kill jaggedness (Moiré)
            useWebWorker: true,
            fileType: 'image/jpeg',
            initialQuality: 0.88
          });
        } catch (err) {
          showToast('Failed to compress image', 'error');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      }

      // For preview
      const reader = new FileReader();
      
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setEditAvatar(ev.target.result as string);
        }
      };
      
      reader.onerror = () => {
        showToast('Failed to read image file', 'error');
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      
      reader.readAsDataURL(file);
      
      // Store the file in ref to preserve File object (avoids serialization issues)
      avatarFileRef.current = file;
      
      // Store file reference in formData for tracking
      setFormData(prev => ({ ...prev, _newAvatarFile: file as any })); // Store marker, actual file is in ref
    } catch (error: any) {
      showToast('Error processing image: ' + (error?.message || 'Unknown error'), 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemoveAvatar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditAvatar(null);
    avatarFileRef.current = null; // Clear ref
    setFormData(prev => ({ ...prev, picture_url: null, _newAvatarFile: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission
    
    try {
      setIsSubmitting(true);
      
      const hasNewAvatarPreview =
        Boolean(avatarFileRef.current) &&
        typeof editAvatar === 'string' &&
        editAvatar.startsWith('data:image/');

      // Get the actual File object from ref (preserves File instance)
      const submitData = {
        ...formData,
        _newAvatarFile: avatarFileRef.current || formData._newAvatarFile,
        _newAvatarBase64: hasNewAvatarPreview ? editAvatar : null
      };
      
      await onSubmit(submitData);
      setTimeout(() => {
        onCancel();
      }, 1500);
    } catch (error) {
      showToast('Failed to update student', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };


  
      return (
        <StyledDialog
          open={open}
          onClose={onCancel}
          fullScreen={false}
          maxWidth="lg"
        >
      <DialogHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ImageBox onClick={() => !isCompressing && fileInputRef.current?.click()}>
            {isCompressing ? (
              <CircularProgress size={32} />
            ) : (editAvatar || formData.picture_url) ? (
              <img src={editAvatar || formData.picture_url || ''} alt="Student" />
            ) : (
              <AccountCircle sx={{ fontSize: '3rem', color: 'text.secondary' }} />
            )}
            {!isCompressing && (editAvatar || formData.picture_url) && (
              <RemoveButton onClick={handleRemoveAvatar} size="small">
                <CloseIcon />
              </RemoveButton>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
          </ImageBox>
          <DialogTitle>Edit Student</DialogTitle>
        </Box>
        <IconButton onClick={onCancel} size="small">
          <CloseIcon />
        </IconButton>
      </DialogHeader>

      <StyledDialogContent>
        <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          <FormContent>
          <SectionContainer>
            <SectionHeader>
              <SectionBadge>1</SectionBadge>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Student Information
              </Typography>
            </SectionHeader>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="name"
                  value={formData.name}
                  onChange={handleTextChange}
                  required
                  label="Name"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactSelect fullWidth size="small">
                  <InputLabel id="class-label">Class</InputLabel>
                  <Select
                    labelId="class-label"
                    name="class_id"
                    value={formData.class_id || ''}
                    onChange={handleSelectChange}
                    required
                    label="Class"
                  >
                    {classOptions.map(c => (
                      <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </CompactSelect>
              </Grid>
              {selectedClassHasSections && (
                <Grid item xs={12} sm={6} md={4}>
                  <CompactSelect fullWidth size="small">
                    <InputLabel id="section-label">Section</InputLabel>
                    <Select
                      labelId="section-label"
                      name="section_id"
                      value={formData.section_id || ''}
                      onChange={handleSelectChange}
                      required
                      disabled={!formData.class_id}
                      label="Section"
                    >
                      {sectionOptions.map(s => (
                        <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                      ))}
                    </Select>
                  </CompactSelect>
                </Grid>
              )}
              <Grid item xs={12} sm={6} md={4}>
                <AppDateField
                  value={formData.admission_date}
                  onChangeValue={(value) => setFormData(prev => ({ ...prev, admission_date: value }))}
                  required
                  label="Date of Admission"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="phone"
                  value={formData.phone}
                  onChange={handleTextChange}
                  label="Mobile No. for SMS/WhatsApp"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactSelect fullWidth size="small">
                  <InputLabel id="notification-channel-label">Notification Channel</InputLabel>
                  <Select
                    labelId="notification-channel-label"
                    name="notification_channel"
                    value={formData.notification_channel || 'whatsapp'}
                    onChange={(e) => setFormData(prev => ({ ...prev, notification_channel: (e.target.value as 'whatsapp' | 'sms') }))}
                    label="Notification Channel"
                  >
                    <MenuItem value="whatsapp">WhatsApp</MenuItem>
                    <MenuItem value="sms">SMS</MenuItem>
                  </Select>
                </CompactSelect>
              </Grid>
            </Grid>
          </SectionContainer>

          <Divider sx={{ my: 1 }} />
          <SectionContainer>
            <SectionHeader>
              <SectionBadge>2</SectionBadge>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Other Information
              </Typography>
            </SectionHeader>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6} md={4}>
                <AppDateField
                  value={formData.dob}
                  onChangeValue={(value) => setFormData(prev => ({ ...prev, dob: value }))}
                  label="Date of Birth"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="form_b"
                  value={formData.form_b}
                  onChange={handleTextChange}
                  label="Student Birth Form ID / NIC"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactSelect fullWidth size="small">
                  <InputLabel id="gender-label">Gender</InputLabel>
                  <Select
                    labelId="gender-label"
                    name="gender"
                    value={formData.gender || 'Male'}
                    onChange={handleSelectChange}
                    label="Gender"
                  >
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </CompactSelect>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="cast"
                  value={formData.cast}
                  onChange={handleTextChange}
                  label="Cast"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="orphan"
                  value={formData.orphan}
                  onChange={handleTextChange}
                  label="Orphan Student"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="osc"
                  value={formData.osc}
                  onChange={handleTextChange}
                  label="OSC Number"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="id_mark"
                  value={formData.id_mark}
                  onChange={handleTextChange}
                  label="Identification Mark"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactSelect fullWidth size="small">
                  <InputLabel id="blood-group-label">Blood Group</InputLabel>
                  <Select
                    labelId="blood-group-label"
                    name="blood_group"
                    value={formData.blood_group || ''}
                    onChange={handleSelectChange}
                    label="Blood Group"
                  >
                    {BLOOD_GROUPS.map(bg => (
                      <MenuItem key={bg} value={bg}>{bg}</MenuItem>
                    ))}
                  </Select>
                </CompactSelect>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="previous_school"
                  value={formData.previous_school}
                  onChange={handleTextChange}
                  label="Previous School"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="previous_id"
                  value={formData.previous_id}
                  onChange={handleTextChange}
                  label="Previous ID / Board Roll No"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactSelect fullWidth size="small">
                  <InputLabel id="religion-label">Religion</InputLabel>
                  <Select
                    labelId="religion-label"
                    name="religion"
                    value={formData.religion || 'Muslim'}
                    onChange={handleSelectChange}
                    label="Religion"
                  >
                    {RELIGIONS.map(r => (
                      <MenuItem key={r} value={r}>{r}</MenuItem>
                    ))}
                  </Select>
                </CompactSelect>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactSelect fullWidth size="small">
                  <InputLabel id="nationality-label">Nationality</InputLabel>
                  <Select
                    labelId="nationality-label"
                    name="nationality"
                    value={formData.nationality || 'Pakistani'}
                    onChange={handleSelectChange}
                    label="Nationality"
                  >
                    {NATIONALITIES.map(n => (
                      <MenuItem key={n} value={n}>{n}</MenuItem>
                    ))}
                  </Select>
                </CompactSelect>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="total_siblings"
                  type="number"
                  value={formData.total_siblings}
                  onChange={handleTextChange}
                  label="Total Siblings"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="disease"
                  value={formData.disease}
                  onChange={handleTextChange}
                  label="Disease If Any?"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="additional_note"
                  value={formData.additional_note}
                  onChange={handleTextChange}
                  label="Additional Note"
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <CompactTextField
                  fullWidth
                  name="address"
                  value={formData.address}
                  onChange={handleTextChange}
                  label="Address"
                  size="small"
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </SectionContainer>

          <Divider sx={{ my: 1 }} />
          <SectionContainer>
            <SectionHeader>
              <SectionBadge>3</SectionBadge>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Father/Guardian Information
              </Typography>
            </SectionHeader>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="father_name"
                  value={formData.father_name}
                  onChange={handleTextChange}
                  required
                  label="Father Name"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="father_national_id"
                  value={formData.father_national_id}
                  onChange={handleTextChange}
                  label="Father National ID"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="father_education"
                  value={formData.father_education}
                  onChange={handleTextChange}
                  label="Education"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="father_mobile"
                  value={formData.father_mobile}
                  onChange={handleTextChange}
                  label="Mobile No"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="father_occupation"
                  value={formData.father_occupation}
                  onChange={handleTextChange}
                  label="Occupation"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="father_income"
                  type="number"
                  value={formData.father_income}
                  onChange={handleTextChange}
                  label="Income"
                  size="small"
                  InputProps={{
                    startAdornment: <Box component="span" sx={{ color: 'text.secondary', mr: 1, fontSize: '0.875rem' }}>Rs.</Box>
                  }}
                />
              </Grid>
            </Grid>
          </SectionContainer>

          <Divider sx={{ my: 1 }} />
          <SectionContainer>
            <SectionHeader>
              <SectionBadge>4</SectionBadge>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Mother Information
              </Typography>
            </SectionHeader>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="mother_name"
                  value={formData.mother_name}
                  onChange={handleTextChange}
                  label="Mother Name"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="mother_national_id"
                  value={formData.mother_national_id}
                  onChange={handleTextChange}
                  label="Mother National ID"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="mother_education"
                  value={formData.mother_education}
                  onChange={handleTextChange}
                  label="Education"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="mother_mobile"
                  value={formData.mother_mobile}
                  onChange={handleTextChange}
                  label="Mobile No"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="mother_occupation"
                  value={formData.mother_occupation}
                  onChange={handleTextChange}
                  label="Occupation"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CompactTextField
                  fullWidth
                  name="mother_income"
                  type="number"
                  value={formData.mother_income}
                  onChange={handleTextChange}
                  label="Income"
                  size="small"
                  InputProps={{
                    startAdornment: <Box component="span" sx={{ color: 'text.secondary', mr: 1, fontSize: '0.875rem' }}>Rs.</Box>
                  }}
                />
              </Grid>
            </Grid>
          </SectionContainer>
          </FormContent>
          
          <FormActions>
            <Button 
              onClick={onCancel}
              variant="outlined"
              size="small"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              variant="contained"
              size="small"
              disabled={isSubmitting || isCompressing}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </FormActions>
        </form>
      </StyledDialogContent>
    </StyledDialog>
  );
}; 
