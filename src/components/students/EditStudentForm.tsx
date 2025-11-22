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
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel
} from '@mui/material';
import { Close as CloseIcon, AccountCircle } from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import { useToast } from '../useToast';
import imageCompression from 'browser-image-compression';
import { useAuth } from '../../contexts/AuthContext';
import { sortClasses } from '../../utils/classUtils';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'];
const RELIGIONS = ['Muslim', 'Christianity', 'Hinduism', 'Sikhism', 'Other'];
const NATIONALITIES = ['Pakistani', 'Indian', 'Afghan', 'Bangladeshi', 'Other'];

// Styled components
const StyledDialog = muiStyled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: '16px',
    background: theme.palette.mode === 'dark' 
      ? theme.palette.background.paper 
      : theme.palette.background.paper,
    maxWidth: '900px',
    width: '90%',
    margin: '60px 16px 16px',
    overflow: 'hidden',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 0 40px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.4)'
      : '0 0 40px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.1)',
    border: theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.05)'
      : '1px solid rgba(0, 0, 0, 0.05)',
    transform: 'translateY(0)',
    transition: 'all 0.3s ease-in-out',
    position: 'relative',
    zIndex: 1301,
    [theme.breakpoints.down('sm')]: {
      width: 'calc(100% - 32px)',
      height: 'calc(100% - 96px)',
      margin: '76px 16px 20px',
      borderRadius: '16px',
      maxHeight: 'calc(100% - 96px)'
    }
  },
  '& .MuiBackdrop-root': {
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(0, 0, 0, 0.5)'
      : 'rgba(255, 255, 255, 0.5)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    position: 'fixed',
    zIndex: 1300
  }
}));

const DialogHeader = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 16px',
  borderBottom: `1px solid ${theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.05)' 
    : 'rgba(0, 0, 0, 0.05)'}`,
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
  backdropFilter: 'blur(8px)',
  position: 'relative',
  zIndex: 1
}));

const DialogTitle = muiStyled(Box)(({ theme }) => ({
  fontSize: '1.25rem',
  fontWeight: 600,
  background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  textShadow: theme.palette.mode === 'dark'
    ? '0 2px 4px rgba(0, 0, 0, 0.5)'
    : 'none'
}));

const StyledDialogContent = muiStyled(DialogContent)(({ theme }) => ({
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  maxHeight: 'calc(100vh - 160px)',
  overflowY: 'auto',
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 100%)'
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 100%)',
  '& .MuiFormControl-root': {
    transition: 'background-color 0.2s ease',
  },
  '& .MuiInputBase-root': {
    background: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(8px)',
    borderRadius: '8px',
    border: theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.05)'
      : '1px solid rgba(0, 0, 0, 0.05)',
    transition: 'background-color 0.2s ease',
    height: '48px',
    '&:hover, &.Mui-focused': {
      background: theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(255, 255, 255, 0.9)',
    },
    '& .MuiSelect-select, & .MuiInputBase-input': {
      padding: '10px 12px',
      fontSize: '0.9rem',
      '&::placeholder': {
        color: theme.palette.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.3)'
          : 'rgba(0, 0, 0, 0.3)',
        opacity: 1
      }
    },
    '& .MuiOutlinedInput-notchedOutline': {
      border: 'none'
    }
  }
}));

const FormActions = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  padding: '8px 16px',
  borderTop: `1px solid ${theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'}`,
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
    : 'linear-gradient(0deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
  position: 'sticky',
  bottom: 0,
  zIndex: 10,
  '& .MuiButton-root': {
    borderRadius: '8px',
    textTransform: 'none',
    padding: '6px 16px',
    fontWeight: 500,
    transition: 'background-color 0.2s ease'
  }
}));

const SectionContainer = muiStyled(Box)({
  marginBottom: '16px'
});

const SectionTitle = muiStyled(Box)(({ theme }) => ({
  fontSize: '1.2rem',
  fontWeight: 700,
  color: theme.palette.primary.main,
  marginBottom: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
}));

const AvatarUpload = muiStyled(Box)(({ theme }) => ({
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  background: theme.palette.mode === 'dark' ? '#2d3340' : '#f3f4f6',
  border: `2px solid ${theme.palette.primary.main}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  position: 'relative',
  cursor: 'pointer',
  transition: 'all 0.2s',
  '&:hover': {
    boxShadow: `0 0 0 3px ${theme.palette.primary.main}99`,
    transform: 'scale(1.02)'
  }
}));

const AvatarImg = muiStyled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover'
});

const RemoveButton = muiStyled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: 4,
  right: 4,
  width: 16,
  height: 16,
  backgroundColor: '#ef4444',
  color: '#fff',
  border: '1px solid #fff',
  '&:hover': {
    backgroundColor: '#dc2626'
  }
}));

interface StudentFormData {
  id?: string;
  name: string;
  class_id: string;
  section_id: string;
  admission_date: string;
  discount_in_fee?: string;
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
    discount_in_fee: '',
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClassHasSections, setSelectedClassHasSections] = useState<boolean>(true);

  // Update form data when initialData changes (when editing different students)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData(initialData);
      setEditAvatar(initialData.picture_url || null);
    }
  }, [initialData]);

  // Also update form data when the modal opens
  useEffect(() => {
    if (open && initialData && Object.keys(initialData).length > 0) {
      setFormData(initialData);
      setEditAvatar(initialData.picture_url || null);
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
    if (e.target.files && e.target.files[0]) {
      let file = e.target.files[0];
      // If file is larger than 100KB, compress it
      if (file.size > 100 * 1024) {
        try {
          file = await imageCompression(file, {
            maxSizeMB: 0.09, // Stricter: target < 100KB
            maxWidthOrHeight: 300, // Smaller avatar size
            useWebWorker: true,
          });
        } catch (err) {
          showToast('Failed to compress image', 'error');
          return;
        }
      }
      // Log the file size for debugging
      // For preview
      const reader = new FileReader();
      reader.onload = (ev) => setEditAvatar(ev.target?.result as string);
      reader.readAsDataURL(file);
      // Store the file for upload
      setFormData(prev => ({ ...prev, _newAvatarFile: file }));
    }
  };

  const handleRemoveAvatar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditAvatar(null);
    setFormData(prev => ({ ...prev, picture_url: null, _newAvatarFile: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission
    
    try {
      setIsSubmitting(true);
      await onSubmit(formData);
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
          fullScreen={fullScreen}
          maxWidth="lg"
        >
      <DialogHeader>
        <DialogTitle>
          <AvatarUpload onClick={() => fileInputRef.current?.click()}>
            {(editAvatar || formData.picture_url) ? (
              <AvatarImg src={editAvatar || formData.picture_url || ''} alt="Student" />
            ) : (
              <AccountCircle sx={{ fontSize: '2.5rem', color: '#bbb' }} />
            )}
            {(editAvatar || formData.picture_url) && (
              <RemoveButton onClick={handleRemoveAvatar}>
                <CloseIcon fontSize="small" />
              </RemoveButton>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
          </AvatarUpload>
          Edit Student
        </DialogTitle>
        <IconButton onClick={onCancel} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogHeader>

      <StyledDialogContent>
        <form ref={formRef} onSubmit={handleSubmit}>
          <SectionContainer>
            <SectionTitle>
              <span style={{ fontSize: '1.1em', marginRight: 6 }}>①</span>
              Student Information
            </SectionTitle>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="name"
                    value={formData.name}
                    onChange={handleTextChange}
                    required
                    label="Name*"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel id="class-label">Class*</InputLabel>
                  <Select
                    labelId="class-label"
                    name="class_id"
                    value={formData.class_id || ''}
                    onChange={handleSelectChange}
                    required
                    label="Class*"
                  >
                    {classOptions.map(c => (
                      <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {selectedClassHasSections && (
                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth>
                    <InputLabel id="section-label">Section*</InputLabel>
                    <Select
                      labelId="section-label"
                      name="section_id"
                      value={formData.section_id || ''}
                      onChange={handleSelectChange}
                      required
                      disabled={!formData.class_id}
                      label="Section*"
                    >
                      {sectionOptions.map(s => (
                        <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="admission_date"
                    type="date"
                    value={formData.admission_date}
                    onChange={handleTextChange}
                    required
                    label="Date of Admission*"
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="discount_in_fee"
                    type="number"
                    value={formData.discount_in_fee}
                    onChange={handleTextChange}
                    label="Discount in Fee"
                    variant="outlined"
                    InputProps={{
                      startAdornment: <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>Rs.</Box>
                    }}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="phone"
                    value={formData.phone}
                    onChange={handleTextChange}
                    label="Mobile No. for SMS/WhatsApp"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <FormLabel component="legend">Notification Channel</FormLabel>
                  <RadioGroup
                    row
                    value={formData.notification_channel || 'whatsapp'}
                    onChange={(e) => setFormData(prev => ({ ...prev, notification_channel: (e.target.value as 'whatsapp' | 'sms') }))}
                    name="notification_channel"
                  >
                    <FormControlLabel value="whatsapp" control={<Radio />} label="WhatsApp" />
                    <FormControlLabel value="sms" control={<Radio />} label="SMS" />
                  </RadioGroup>
                </FormControl>
              </Grid>
            </Grid>
          </SectionContainer>

          <SectionContainer>
            <SectionTitle>
              <span style={{ fontSize: '1.1em', marginRight: 6 }}>②</span>
              Other Information
            </SectionTitle>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="dob"
                    type="date"
                    value={formData.dob}
                    onChange={handleTextChange}
                    label="Date of Birth"
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="form_b"
                    value={formData.form_b}
                    onChange={handleTextChange}
                    label="Student Birth Form ID / NIC"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
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
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="cast"
                    value={formData.cast}
                    onChange={handleTextChange}
                    label="Cast"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="orphan"
                    value={formData.orphan}
                    onChange={handleTextChange}
                    label="Orphan Student"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="osc"
                    value={formData.osc}
                    onChange={handleTextChange}
                    label="OSC Number"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="id_mark"
                    value={formData.id_mark}
                    onChange={handleTextChange}
                    label="Identification Mark"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
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
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="previous_school"
                    value={formData.previous_school}
                    onChange={handleTextChange}
                    label="Previous School"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="previous_id"
                    value={formData.previous_id}
                    onChange={handleTextChange}
                    label="Previous ID / Board Roll No"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
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
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
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
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="total_siblings"
                    type="number"
                    value={formData.total_siblings}
                    onChange={handleTextChange}
                    label="Total Siblings"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="disease"
                    value={formData.disease}
                    onChange={handleTextChange}
                    label="Disease If Any?"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="additional_note"
                    value={formData.additional_note}
                    onChange={handleTextChange}
                    label="Additional Note"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="address"
                    value={formData.address}
                    onChange={handleTextChange}
                    label="Address"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>
            </Grid>
          </SectionContainer>

          <SectionContainer>
            <SectionTitle>
              <span style={{ fontSize: '1.1em', marginRight: 6 }}>③</span>
              Father/Guardian Information
            </SectionTitle>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="father_name"
                    value={formData.father_name}
                    onChange={handleTextChange}
                    required
                    label="Father Name*"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="father_national_id"
                    value={formData.father_national_id}
                    onChange={handleTextChange}
                    label="Father National ID"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="father_education"
                    value={formData.father_education}
                    onChange={handleTextChange}
                    label="Education"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="father_mobile"
                    value={formData.father_mobile}
                    onChange={handleTextChange}
                    label="Mobile No"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="father_occupation"
                    value={formData.father_occupation}
                    onChange={handleTextChange}
                    label="Occupation"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="father_income"
                    type="number"
                    value={formData.father_income}
                    onChange={handleTextChange}
                    label="Income"
                    variant="outlined"
                    InputProps={{
                      startAdornment: <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>Rs.</Box>
                    }}
                  />
                </FormControl>
              </Grid>
            </Grid>
          </SectionContainer>

          <SectionContainer>
            <SectionTitle>
              <span style={{ fontSize: '1.1em', marginRight: 6 }}>④</span>
              Mother Information
            </SectionTitle>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="mother_name"
                    value={formData.mother_name}
                    onChange={handleTextChange}
                    label="Mother Name"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="mother_national_id"
                    value={formData.mother_national_id}
                    onChange={handleTextChange}
                    label="Mother National ID"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="mother_education"
                    value={formData.mother_education}
                    onChange={handleTextChange}
                    label="Education"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="mother_mobile"
                    value={formData.mother_mobile}
                    onChange={handleTextChange}
                    label="Mobile No"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="mother_occupation"
                    value={formData.mother_occupation}
                    onChange={handleTextChange}
                    label="Occupation"
                    variant="outlined"
                  />
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <TextField
                    name="mother_income"
                    type="number"
                    value={formData.mother_income}
                    onChange={handleTextChange}
                    label="Income"
                    variant="outlined"
                    InputProps={{
                      startAdornment: <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>Rs.</Box>
                    }}
                  />
                </FormControl>
              </Grid>
            </Grid>
          </SectionContainer>
          
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
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </FormActions>
        </form>
      </StyledDialogContent>
    </StyledDialog>
  );
}; 