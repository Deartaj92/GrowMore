import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
  styled,
  Avatar,
  Card,
  CardContent,
  Grid,
  Chip,
  Fade,
  Skeleton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Close as CloseIcon, 
  CloudUpload as CloudUploadIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  PersonAdd as PersonAddIcon,
  Person as PersonIcon,
  PersonRemove as PersonRemoveIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import imageCompression from 'browser-image-compression';

import Loader from '../components/Loader';
// Styled components for modern design
const PageContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  minHeight: '100vh',
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
    : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2)
  }
}));

const PageHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(4),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    gap: theme.spacing(2),
    alignItems: 'stretch'
  }
}));

const PageTitle = styled(Typography)(({ theme }) => ({
  fontSize: '2.5rem',
  fontWeight: 700,
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(45deg, #4a6cf7, #7c3aed)'
    : 'linear-gradient(45deg, #4a6cf7, #3b82f6)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  textShadow: theme.palette.mode === 'dark'
    ? '0 4px 8px rgba(0, 0, 0, 0.3)'
    : '0 2px 4px rgba(0, 0, 0, 0.1)',
  [theme.breakpoints.down('sm')]: {
    fontSize: '2rem',
    textAlign: 'center'
  }
}));

const AddButton = styled(Button)(({ theme }) => ({
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(45deg, #4a6cf7, #7c3aed)'
    : 'linear-gradient(45deg, #4a6cf7, #3b82f6)',
  color: 'white',
  borderRadius: '12px',
  padding: '12px 24px',
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '1rem',
  boxShadow: theme.palette.mode === 'dark'
    ? '0 8px 32px rgba(74, 108, 247, 0.3)'
    : '0 8px 32px rgba(74, 108, 247, 0.2)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 12px 40px rgba(74, 108, 247, 0.4)'
      : '0 12px 40px rgba(74, 108, 247, 0.3)'
  }
}));

const SchoolCard = styled(Card)(({ theme }) => ({
  background: theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(20px)',
  borderRadius: '16px',
  border: theme.palette.mode === 'dark'
    ? '1px solid rgba(255, 255, 255, 0.12)'
    : '1px solid rgba(255, 255, 255, 0.3)',
  boxShadow: theme.palette.mode === 'dark'
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  overflow: 'hidden',
  position: 'relative',
  minHeight: '280px',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 12px 40px rgba(0, 0, 0, 0.4)'
      : '0 12px 40px rgba(0, 0, 0, 0.12)',
    '& .card-actions': {
      opacity: 1,
      transform: 'translateY(0)'
    }
  }
}));

const CardHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(3),
  marginBottom: theme.spacing(3),
  paddingBottom: theme.spacing(3),
  borderBottom: `1px solid ${theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.08)' 
    : 'rgba(0, 0, 0, 0.08)'}`
}));

const SchoolAvatar = styled(Avatar)(({ theme }) => ({
  width: 80,
  height: 80,
  border: `4px solid ${theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.15)' 
    : 'rgba(255, 255, 255, 0.9)'}`,
  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
  fontSize: '2rem',
  fontWeight: 700,
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(135deg, #4a6cf7, #7c3aed)'
    : 'linear-gradient(135deg, #4a6cf7, #3b82f6)'
}));

const SchoolInfo = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5)
}));

const SchoolName = styled(Typography)(({ theme }) => ({
  fontSize: '1.5rem',
  fontWeight: 700,
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
  marginBottom: theme.spacing(1),
  lineHeight: 1.2
}));

const SchoolSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  color: theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.6)' 
    : 'rgba(0, 0, 0, 0.6)',
  marginBottom: theme.spacing(1.5)
}));

const StatusChip = styled(Chip)(({ theme }) => ({
  borderRadius: '20px',
  fontWeight: 600,
  fontSize: '0.75rem',
  height: '28px',
  alignSelf: 'flex-start',
  '&.MuiChip-colorSuccess': {
    background: theme.palette.mode === 'dark'
      ? 'rgba(34, 197, 94, 0.25)'
      : 'rgba(34, 197, 94, 0.15)',
    color: '#22c55e',
    border: `1px solid ${theme.palette.mode === 'dark' 
      ? 'rgba(34, 197, 94, 0.3)' 
      : 'rgba(34, 197, 94, 0.2)'}`
  },
  '&.MuiChip-colorDefault': {
    background: theme.palette.mode === 'dark'
      ? 'rgba(156, 163, 175, 0.25)'
      : 'rgba(156, 163, 175, 0.15)',
    color: '#9ca3af',
    border: `1px solid ${theme.palette.mode === 'dark' 
      ? 'rgba(156, 163, 175, 0.3)' 
      : 'rgba(156, 163, 175, 0.2)'}`
  }
}));

const ContactSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2)
}));

const ContactItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(1.5),
  background: theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(0, 0, 0, 0.02)',
  borderRadius: '8px',
  border: theme.palette.mode === 'dark'
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)',
  transition: 'all 0.2s ease',
  '&:hover': {
    background: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(0, 0, 0, 0.04)'
  }
}));

const ContactIcon = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  borderRadius: '8px',
  background: theme.palette.mode === 'dark'
    ? 'rgba(74, 108, 247, 0.2)'
    : 'rgba(74, 108, 247, 0.1)',
  color: theme.palette.primary.main
}));

const ContactText = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1
}));

const ContactLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  fontWeight: 600,
  color: theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.5)' 
    : 'rgba(0, 0, 0, 0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: theme.spacing(0.25)
}));

const ContactValue = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  fontWeight: 500,
  color: theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.9)' 
    : 'rgba(0, 0, 0, 0.8)',
  lineHeight: 1.4
}));

const CardActions = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  right: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  opacity: 0,
  transform: 'translateY(-10px)',
  transition: 'all 0.3s ease',
  zIndex: 2
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  background: theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  border: theme.palette.mode === 'dark'
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(255, 255, 255, 0.2)',
  width: 36,
  height: 36,
  '&:hover': {
    background: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.2)'
      : 'rgba(255, 255, 255, 1)',
    transform: 'scale(1.1)'
  }
}));

// Styled components matching CreateReportForm
const StyledDialog = styled(Dialog)(({ theme }) => ({
  zIndex: 1300,
  '& .MuiDialog-paper': {
    borderRadius: '16px',
    background: theme.palette.mode === 'dark' 
      ? theme.palette.background.paper 
      : theme.palette.background.paper,
    maxWidth: '600px',
    width: '95%',
    margin: '84px 16px 16px',
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

const DialogHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px',
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

const StyledDialogTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.5rem',
  fontWeight: 600,
  color: theme.palette.mode === 'dark'
    ? theme.palette.primary.light
    : theme.palette.primary.main,
  textShadow: theme.palette.mode === 'dark'
    ? '0 2px 4px rgba(0, 0, 0, 0.5)'
    : 'none'
}));

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  maxHeight: 'calc(100vh - 180px)',
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  scrollbarColor: theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.2) transparent'
    : 'rgba(0, 0, 0, 0.2) transparent',
  '&::-webkit-scrollbar': {
    width: '8px',
    backgroundColor: 'transparent'
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
    borderRadius: '4px',
    margin: '4px'
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.2)'
      : 'rgba(0, 0, 0, 0.2)',
    borderRadius: '4px',
    border: `2px solid ${theme.palette.mode === 'dark'
      ? theme.palette.background.paper
      : theme.palette.background.paper}`,
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.3)'
        : 'rgba(0, 0, 0, 0.3)'
    }
  },
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
    '&:hover, &.Mui-focused': {
      background: theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(255, 255, 255, 0.9)',
    },
    '& .MuiInputBase-input': {
      padding: '12px 14px',
      fontSize: '0.95rem',
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

const FormActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  padding: '16px 24px',
  borderTop: `1px solid ${theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'}`,
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
    : 'linear-gradient(0deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
  '& .MuiButton-root': {
    borderRadius: '8px',
    textTransform: 'none',
    padding: '8px 20px',
    fontWeight: 500,
    transition: 'background-color 0.2s ease'
  }
}));

const LogoUploadBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  padding: '20px',
  border: `2px dashed ${theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.2)' 
    : 'rgba(0, 0, 0, 0.2)'}`,
  borderRadius: '12px',
  background: theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.02)'
    : 'rgba(0, 0, 0, 0.02)',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    background: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(0, 0, 0, 0.05)'
  }
}));

const EmptyState = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(8),
  textAlign: 'center',
  color: theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.6)' 
    : 'rgba(0, 0, 0, 0.6)'
}));

const AdminForm = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3)
}));

const FormRow = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    gridTemplateColumns: '1fr'
  }
}));

const AdminSection = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  padding: theme.spacing(2),
  background: theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2)
}));

const AdminHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(1)
}));

const AdminIcon = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  borderRadius: '8px',
  background: theme.palette.mode === 'dark'
    ? 'rgba(74, 108, 247, 0.2)'
    : 'rgba(74, 108, 247, 0.1)',
  color: theme.palette.primary.main
}));

const AdminTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.25rem',
  fontWeight: 600,
  color: theme.palette.mode === 'dark'
    ? theme.palette.primary.light
    : theme.palette.primary.main
}));

const AdminInfo = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1)
}));

const AdminName = styled(Typography)(({ theme }) => ({
  fontSize: '1rem',
  fontWeight: 600,
  color: theme.palette.mode === 'dark'
    ? theme.palette.primary.light
    : theme.palette.primary.main
}));

const AdminDetails = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5)
}));

const AdminDetail = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1)
}));

const AdminDetailLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  fontWeight: 600,
  color: theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.5)'
    : 'rgba(0, 0, 0, 0.5)'
}));

const AdminDetailValue = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  fontWeight: 500,
  color: theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.9)'
    : 'rgba(0, 0, 0, 0.8)'
}));

interface School {
  id: number;
  name: string;
  address: string;
  contact: string;
  email: string;
  status: string;
  logo_url?: string;
  school_admin_id?: number;
  created_at: string;
  updated_at: string;
  admin?: {
    name: string;
    username: string;
    mobile: string;
  };
}

interface AdminFormData {
  name: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
  gender: string;
  address: string;
  date_of_birth: string;
  joining_date: string;
  username: string;
}

const SchoolsManagement: React.FC = () => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { showToast } = useToast();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [removeAdminConfirmOpen, setRemoveAdminConfirmOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);
  const [schoolToRemoveAdmin, setSchoolToRemoveAdmin] = useState<School | null>(null);
  const [form, setForm] = useState({ name: '', address: '', contact: '', email: '' });
  const [adminForm, setAdminForm] = useState<AdminFormData>({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    gender: '',
    address: '',
    date_of_birth: '',
    joining_date: '',
    username: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>('');
  const [nextCustomId, setNextCustomId] = useState<string | null>(null);

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schools')
        .select(`
          *,
          admin:users!school_admin_id (
            name,
            username,
            mobile
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchools(data || []);
    } catch (error: any) {
      showToast('Failed to load schools', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      let file = e.target.files[0];
      
      // Compress if larger than 100KB
      if (file.size > 100 * 1024) {
        try {
          file = await imageCompression(file, {
            maxSizeMB: 0.09,
            maxWidthOrHeight: 400,
            useWebWorker: true,
          });
        } catch (err) {
          showToast('Failed to compress logo', 'error');
          return;
        }
      }

      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleOpenDialog = async (school?: School) => {
    if (school) {
      setEditingSchool(school);
      setForm({ 
        name: school.name, 
        address: school.address, 
        contact: school.contact,
        email: school.email
      });
      setLogoPreview(school.logo_url || null);
      setLogoFile(null);
      setNextCustomId(null);
    } else {
      setEditingSchool(null);
      setForm({ name: '', address: '', contact: '', email: '' });
      setLogoPreview(null);
      setLogoFile(null);
      
      // Fetch next custom ID for new school
      try {
        const { data: customIdData, error: customIdError } = await supabase
          .rpc('get_next_school_custom_id');
        
        if (!customIdError && customIdData) {
          setNextCustomId(customIdData);
        } else {
          setNextCustomId('S1');
        }
      } catch (error) {
        setNextCustomId('001');
      }
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSchool(null);
    setForm({ name: '', address: '', contact: '', email: '' });
    setLogoPreview(null);
    setLogoFile(null);
  };

  const handleOpenAdminDialog = (school: School) => {
    setSelectedSchool(school);
    setAdminForm({
      name: '',
      email: '',
      mobile: '',
      password: '',
      confirmPassword: '',
      gender: '',
      address: '',
      date_of_birth: '',
      joining_date: '',
      username: ''
    });
    setAdminDialogOpen(true);
  };

  const handleCloseAdminDialog = () => {
    setAdminDialogOpen(false);
    setSelectedSchool(null);
    setAdminForm({
      name: '',
      email: '',
      mobile: '',
      password: '',
      confirmPassword: '',
      gender: '',
      address: '',
      date_of_birth: '',
      joining_date: '',
      username: ''
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdminTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdminForm({ ...adminForm, [e.target.name]: e.target.value });
  };

  const handleAdminSelectChange = (e: SelectChangeEvent<string>) => {
    setAdminForm({ ...adminForm, [e.target.name]: e.target.value });
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.address.trim() || !form.contact.trim() || !form.email.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    if (!validateEmail(form.email.trim())) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    try {
      setLoading(true);
      let logoUrl = editingSchool?.logo_url || '';

      // Handle logo deletion if removed
      if (logoPreview === null && editingSchool?.logo_url) {
        const url = editingSchool.logo_url;
        const match = url.match(/school-logos\/([^?\s]+)/);
        if (match && match[1]) {
          const path = match[1];
          const { error: removeError } = await supabase.storage.from('school-logos').remove([path]);
          if (removeError) {
            // Failed to delete old logo
          }
        }
        logoUrl = '';
      }

      // Upload new logo if changed
      if (logoFile) {
        // Delete old logo if exists
        if (editingSchool?.logo_url) {
          const url = editingSchool.logo_url;
          const match = url.match(/school-logos\/([^?\s]+)/);
          if (match && match[1]) {
            const path = match[1];
            const { error: removeError } = await supabase.storage.from('school-logos').remove([path]);
            if (removeError) {
              // Failed to delete old logo
            }
          }
        }

        // Upload new logo
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `school_${editingSchool?.id || Date.now()}_${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('school-logos')
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('school-logos')
          .getPublicUrl(fileName);
        
        logoUrl = urlData.publicUrl;
      }

      if (editingSchool) {
        // Update existing school
        const { error } = await supabase
          .from('schools')
          .update({
            name: form.name.trim(),
            address: form.address.trim(),
            contact: form.contact.trim(),
            email: form.email.trim(),
            logo_url: logoUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSchool.id);

        if (error) throw error;
        showToast('School updated successfully', 'success');
      } else {
        // Create new school with custom_id
        // Get the next sequential custom_id
        const { data: customIdData, error: customIdError } = await supabase
          .rpc('get_next_school_custom_id');

        if (customIdError) throw customIdError;

        const customId = customIdData || 'S1';

        // Create new school
        const { error } = await supabase
          .from('schools')
          .insert({
            name: form.name.trim(),
            address: form.address.trim(),
            contact: form.contact.trim(),
            email: form.email.trim(),
            logo_url: logoUrl,
            status: 'active',
            custom_id: customId
          });

        if (error) throw error;
        showToast('School created successfully', 'success');
      }

      handleCloseDialog();
      loadSchools();
    } catch (error: any) {
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Failed to save school';
      
      if (error.code === '23505') {
        // Unique constraint violation
        if (error.message.includes('email')) {
          errorMessage = 'A school with this email already exists';
        } else if (error.message.includes('name')) {
          errorMessage = 'A school with this name already exists';
        } else {
          errorMessage = 'A school with these details already exists';
        }
      } else if (error.code === '23502') {
        // Not null violation
        errorMessage = 'Please fill in all required fields';
      } else if (error.code === '23514') {
        // Check constraint violation
        errorMessage = 'Invalid data provided';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    // Validate form
    if (!adminForm.name.trim() || !adminForm.email.trim() || !adminForm.mobile.trim() || 
        !adminForm.password || !adminForm.confirmPassword || !adminForm.gender || 
        !adminForm.address.trim() || !adminForm.date_of_birth || !adminForm.joining_date || 
        !adminForm.username.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    if (!validateEmail(adminForm.email.trim())) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    if (adminForm.password !== adminForm.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    try {
      setLoading(true);

      // First, add to staff table
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .insert({
          name: adminForm.name.trim(),
          email: adminForm.email.trim(),
          mobile: adminForm.mobile.trim(),
          gender: adminForm.gender,
          address: adminForm.address.trim(),
          dob: adminForm.date_of_birth,
          joining_date: adminForm.joining_date,
          role: 'Principal',
          school_id: selectedSchool?.id
        })
        .select()
        .single();

      if (staffError) throw staffError;

      // Then, add to users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          username: adminForm.username.trim(),
          name: adminForm.name.trim(),
          mobile: adminForm.mobile.trim(),
          password: adminForm.password, // Note: In production, this should be hashed
          role: 'Principal',
          staff_id: staffData.id,
          school_id: selectedSchool?.id
        })
        .select()
        .single();

      if (userError) throw userError;

      // Update the school to set the admin
      const { error: schoolUpdateError } = await supabase
        .from('schools')
        .update({
          school_admin_id: userData.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSchool?.id);

      if (schoolUpdateError) throw schoolUpdateError;

      showToast('Admin created successfully', 'success');
      handleCloseAdminDialog();
      loadSchools();
    } catch (error: any) {
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Failed to create admin';
      
      if (error.code === '23505') {
        // Unique constraint violation
        if (error.message.includes('username')) {
          errorMessage = 'A user with this username already exists';
        } else if (error.message.includes('email')) {
          errorMessage = 'A user with this email already exists';
        } else if (error.message.includes('mobile')) {
          errorMessage = 'A user with this mobile number already exists';
        } else {
          errorMessage = 'A user with these details already exists';
        }
      } else if (error.code === '23502') {
        // Not null violation
        errorMessage = 'Please fill in all required fields';
      } else if (error.code === '23514') {
        // Check constraint violation
        errorMessage = 'Invalid data provided';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('School deleted successfully', 'success');
      loadSchools();
    } catch (error: any) {
      showToast(error.message || 'Failed to delete school', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = (school: School) => {
    setSchoolToDelete(school);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!schoolToDelete) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', schoolToDelete.id);

      if (error) throw error;
      showToast('School deleted successfully', 'success');
      loadSchools();
    } catch (error: any) {
      showToast(error.message || 'Failed to delete school', 'error');
    } finally {
      setLoading(false);
      setDeleteConfirmOpen(false);
      setSchoolToDelete(null);
    }
  };

  const handleConfirmRemoveAdmin = (school: School) => {
    setSchoolToRemoveAdmin(school);
    setRemoveAdminConfirmOpen(true);
  };

  const confirmRemoveAdmin = async () => {
    if (!schoolToRemoveAdmin) return;
    
    try {
      setLoading(true);
      
      // First, get the admin user details to find the staff_id
      const { data: adminUser, error: userError } = await supabase
        .from('users')
        .select('staff_id')
        .eq('id', schoolToRemoveAdmin.school_admin_id)
        .single();

      if (userError) throw userError;

      // Delete the user record
      const { error: deleteUserError } = await supabase
        .from('users')
        .delete()
        .eq('id', schoolToRemoveAdmin.school_admin_id);

      if (deleteUserError) throw deleteUserError;

      // Delete the staff record if staff_id exists
      if (adminUser?.staff_id) {
        const { error: deleteStaffError } = await supabase
          .from('staff')
          .delete()
          .eq('id', adminUser.staff_id);

        if (deleteStaffError) throw deleteStaffError;
      }

      // Update the school to remove the admin reference
      const { error: schoolUpdateError } = await supabase
        .from('schools')
        .update({
          school_admin_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', schoolToRemoveAdmin.id);

      if (schoolUpdateError) throw schoolUpdateError;

      showToast('Admin removed successfully', 'success');
      loadSchools();
    } catch (error: any) {
      showToast(error.message || 'Failed to remove admin', 'error');
    } finally {
      setLoading(false);
      setRemoveAdminConfirmOpen(false);
      setSchoolToRemoveAdmin(null);
    }
  };

  const handleToggleStatus = async (school: School) => {
    try {
      setLoading(true);
      const newStatus = school.status === 'active' ? 'inactive' : 'active';
      
      const { error } = await supabase
        .from('schools')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', school.id);

      if (error) throw error;
      showToast(`School ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
      loadSchools();
    } catch (error: any) {
      showToast(error.message || 'Failed to update school status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderSchoolCard = (school: School) => (
    <Grid item xs={12} sm={6} lg={4} key={school.id}>
      <Fade in timeout={300}>
        <SchoolCard>
          <CardActions className="card-actions">
            <ActionButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDialog(school);
              }}
            >
              <EditIcon fontSize="small" />
            </ActionButton>
            <ActionButton 
              size="small"
              color={school.status === 'active' ? 'success' : 'default'}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleStatus(school);
              }}
              title={school.status === 'active' ? 'Deactivate School' : 'Activate School'}
            >
              {school.status === 'active' ? (
                <CheckCircleIcon fontSize="small" />
              ) : (
                <CancelIcon fontSize="small" />
              )}
            </ActionButton>
            <ActionButton 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAdminDialog(school);
              }}
            >
              <PersonAddIcon fontSize="small" />
            </ActionButton>
            {school.admin && (
              <ActionButton 
                size="small"
                color="warning"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConfirmRemoveAdmin(school);
                }}
              >
                <PersonRemoveIcon fontSize="small" />
              </ActionButton>
            )}
            <ActionButton 
              size="small" 
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmDelete(school);
              }}
            >
              <DeleteIcon fontSize="small" />
            </ActionButton>
          </CardActions>
          
          <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardHeader>
              <SchoolAvatar src={school.logo_url}>
                {school.name.charAt(0)}
              </SchoolAvatar>
              <SchoolInfo>
                <SchoolName>{school.name}</SchoolName>
                <SchoolSubtitle>
                  Educational Institution
                </SchoolSubtitle>
                <StatusChip 
                  label={school.status === 'active' ? 'Active' : 'Inactive'} 
                  color={school.status === 'active' ? 'success' : 'default'}
                  size="small"
                />
              </SchoolInfo>
            </CardHeader>
            
            <ContactSection>
              <ContactItem>
                <ContactIcon>
                  <LocationIcon fontSize="small" />
                </ContactIcon>
                <ContactText>
                  <ContactLabel>Address</ContactLabel>
                  <ContactValue>
                    {school.address}
                  </ContactValue>
                </ContactText>
              </ContactItem>
              
              <ContactItem>
                <ContactIcon>
                  <PhoneIcon fontSize="small" />
                </ContactIcon>
                <ContactText>
                  <ContactLabel>Phone</ContactLabel>
                  <ContactValue>
                    {school.contact}
                  </ContactValue>
                </ContactText>
              </ContactItem>
              
              <ContactItem>
                <ContactIcon>
                  <EmailIcon fontSize="small" />
                </ContactIcon>
                <ContactText>
                  <ContactLabel>Email</ContactLabel>
                  <ContactValue>
                    {school.email}
                  </ContactValue>
                </ContactText>
              </ContactItem>
            </ContactSection>

            {school.admin && (
              <AdminSection>
                <AdminHeader>
                  <AdminIcon>
                    <PersonIcon fontSize="small" />
                  </AdminIcon>
                  <AdminTitle>School Administrator</AdminTitle>
                </AdminHeader>
                <AdminInfo>
                  <AdminName>{school.admin.name}</AdminName>
                  <AdminDetails>
                    <AdminDetail>
                      <AdminDetailLabel>Username:</AdminDetailLabel>
                      <AdminDetailValue>{school.admin.username}</AdminDetailValue>
                    </AdminDetail>
                    <AdminDetail>
                      <AdminDetailLabel>Phone:</AdminDetailLabel>
                      <AdminDetailValue>{school.admin.mobile}</AdminDetailValue>
                    </AdminDetail>
                  </AdminDetails>
                </AdminInfo>
              </AdminSection>
            )}
          </CardContent>
        </SchoolCard>
      </Fade>
    </Grid>
  );


  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>Schools Management</PageTitle>
        <AddButton 
          startIcon={<AddIcon />} 
          onClick={() => handleOpenDialog()}
        >
          Add School
        </AddButton>
      </PageHeader>

      <Grid container spacing={3}>
        {loading ? (
          <Grid item xs={12}>
            <Loader />
          </Grid>
        ) : schools.length > 0 ? 
            schools.map(renderSchoolCard) :
            (
              <Grid item xs={12}>
                <EmptyState>
                  <BusinessIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                  <Typography variant="h6" gutterBottom>
                    No Schools Found
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 3 }}>
                    Get started by adding your first school
                  </Typography>
                  <AddButton 
                    startIcon={<AddIcon />} 
                    onClick={() => handleOpenDialog()}
                  >
                    Add Your First School
                  </AddButton>
                </EmptyState>
              </Grid>
            )
        }
      </Grid>
      
      {/* School Modal */}
      <StyledDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullScreen={fullScreen}
        maxWidth="sm"
        slotProps={{
          backdrop: {
            sx: {
              position: 'fixed',
              zIndex: 1300
            }
          }
        }}
        PaperProps={{
          sx: {
            maxHeight: {
              xs: 'calc(100% - 96px)',
              sm: 'calc(100% - 100px)'
            }
          }
        }}
      >
        <DialogHeader>
          <StyledDialogTitle>
            {editingSchool ? 'Edit School' : 'Add School'}
          </StyledDialogTitle>
          <IconButton onClick={handleCloseDialog} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogHeader>

        <StyledDialogContent>
          {!editingSchool && nextCustomId && (
            <Box sx={{ 
              mb: 2, 
              p: 1.5, 
              background: theme.palette.mode === 'dark' 
                ? 'rgba(74, 108, 247, 0.15)' 
                : 'rgba(74, 108, 247, 0.1)',
              borderRadius: '8px',
              border: `1px solid ${theme.palette.mode === 'dark' 
                ? 'rgba(74, 108, 247, 0.3)' 
                : 'rgba(74, 108, 247, 0.2)'}`
            }}>
              <Typography variant="body2" sx={{ 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                color: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.6)' 
                  : 'rgba(0, 0, 0, 0.6)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 0.5
              }}>
                Next School ID
              </Typography>
              <Typography variant="h6" sx={{ 
                fontSize: '1.25rem', 
                fontWeight: 700, 
                color: theme.palette.primary.main 
              }}>
                {nextCustomId}
              </Typography>
            </Box>
          )}
          <LogoUploadBox component="label">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              style={{ display: 'none' }}
            />
            {logoPreview ? (
              <Box sx={{ position: 'relative' }}>
              <Avatar src={logoPreview} sx={{ width: 80, height: 80 }} />
                <IconButton 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeLogo();
                  }} 
                  size="small"
                  sx={{ 
                    position: 'absolute', 
                    top: -8, 
                    right: -8, 
                    background: '#ef4444', 
                    color: '#fff',
                    width: 24,
                    height: 24,
                    '&:hover': { background: '#dc2626' }
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ) : (
              <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            )}
            <Typography variant="body2" color="text.secondary">
              {logoPreview ? 'Click to change logo' : 'Click to upload logo'}
            </Typography>
          </LogoUploadBox>

          <TextField
            margin="dense"
            label="School Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            fullWidth
            required
            size="small"
          />
          <TextField
            margin="dense"
            label="Address"
            name="address"
            value={form.address}
            onChange={handleChange}
            fullWidth
            required
            size="small"
          />
          <TextField
            margin="dense"
            label="Contact"
            name="contact"
            value={form.contact}
            onChange={handleChange}
            fullWidth
            required
            size="small"
          />
          <TextField
            margin="dense"
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            fullWidth
            required
            size="small"
          />
        </StyledDialogContent>

        <FormActions>
          <Button 
            onClick={handleCloseDialog}
            variant="outlined"
            size="small"
            disabled={loading}
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            variant="contained"
            size="small"
            disabled={loading}
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            {loading ? 'Saving...' : (editingSchool ? 'Update' : 'Add')}
          </Button>
        </FormActions>
      </StyledDialog>

      {/* Admin Creation Modal */}
      <StyledDialog
        open={adminDialogOpen}
        onClose={handleCloseAdminDialog}
        fullScreen={fullScreen}
        maxWidth="md"
        slotProps={{
          backdrop: {
            sx: {
              position: 'fixed',
              zIndex: 1300
            }
          }
        }}
        PaperProps={{
          sx: {
            maxHeight: {
              xs: 'calc(100% - 96px)',
              sm: 'calc(100% - 100px)'
            }
          }
        }}
      >
        <DialogHeader>
          <StyledDialogTitle>
            Create Admin for {selectedSchool?.name}
          </StyledDialogTitle>
          <IconButton onClick={handleCloseAdminDialog} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogHeader>

        <StyledDialogContent>
          <AdminForm>
            <FormRow>
              <TextField
                label="Full Name"
                name="name"
                value={adminForm.name}
                onChange={handleAdminTextChange}
                fullWidth
                required
                size="small"
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                value={adminForm.email}
                onChange={handleAdminTextChange}
                fullWidth
                required
                size="small"
              />
            </FormRow>

            <FormRow>
              <TextField
                label="Phone"
                name="mobile"
                value={adminForm.mobile}
                onChange={handleAdminTextChange}
                fullWidth
                required
                size="small"
              />
              <FormControl fullWidth size="small">
                <InputLabel>Gender</InputLabel>
                <Select
                  name="gender"
                  value={adminForm.gender}
                  onChange={handleAdminSelectChange}
                  label="Gender"
                  required
                >
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </FormRow>

            <TextField
              label="Address"
              name="address"
              value={adminForm.address}
              onChange={handleAdminTextChange}
              fullWidth
              required
              size="small"
            />

            <FormRow>
              <TextField
                label="Date of Birth"
                name="date_of_birth"
                type="date"
                value={adminForm.date_of_birth}
                onChange={handleAdminTextChange}
                fullWidth
                required
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Joining Date"
                name="joining_date"
                type="date"
                value={adminForm.joining_date}
                onChange={handleAdminTextChange}
                fullWidth
                required
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </FormRow>

            <TextField
              label="Username"
              name="username"
              value={adminForm.username}
              onChange={handleAdminTextChange}
              fullWidth
              required
              size="small"
            />

            <FormRow>
              <TextField
                label="Password"
                name="password"
                type="password"
                value={adminForm.password}
                onChange={handleAdminTextChange}
                fullWidth
                required
                size="small"
              />
              <TextField
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={adminForm.confirmPassword}
                onChange={handleAdminTextChange}
                fullWidth
                required
                size="small"
              />
            </FormRow>
          </AdminForm>
        </StyledDialogContent>

        <FormActions>
          <Button 
            onClick={handleCloseAdminDialog}
            variant="outlined"
            size="small"
            disabled={loading}
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateAdmin}
            variant="contained"
            size="small"
            disabled={loading}
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            {loading ? 'Creating...' : 'Create Admin'}
          </Button>
        </FormActions>
      </StyledDialog>

      {/* Delete Confirmation Modal */}
      <StyledDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="sm"
        slotProps={{
          backdrop: {
            sx: {
              position: 'fixed',
              zIndex: 1300
            }
          }
        }}
      >
        <DialogHeader>
          <StyledDialogTitle>
            Confirm Delete School
          </StyledDialogTitle>
          <IconButton onClick={() => setDeleteConfirmOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogHeader>

        <StyledDialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete <strong>{schoolToDelete?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone. All data associated with this school will be permanently deleted.
          </Typography>
        </StyledDialogContent>

        <FormActions>
          <Button 
            onClick={() => setDeleteConfirmOpen(false)}
            variant="outlined"
            size="small"
            disabled={loading}
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDelete}
            variant="contained"
            color="error"
            size="small"
            disabled={loading}
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            {loading ? 'Deleting...' : 'Delete School'}
          </Button>
        </FormActions>
      </StyledDialog>

      {/* Remove Admin Confirmation Modal */}
      <StyledDialog
        open={removeAdminConfirmOpen}
        onClose={() => setRemoveAdminConfirmOpen(false)}
        maxWidth="sm"
        slotProps={{
          backdrop: {
            sx: {
              position: 'fixed',
              zIndex: 1300
            }
          }
        }}
      >
        <DialogHeader>
          <StyledDialogTitle>
            Confirm Remove Admin
          </StyledDialogTitle>
          <IconButton onClick={() => setRemoveAdminConfirmOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogHeader>

        <StyledDialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to remove the admin from <strong>{schoolToRemoveAdmin?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The admin will no longer have access to this school. You can assign a new admin later.
          </Typography>
        </StyledDialogContent>

        <FormActions>
          <Button 
            onClick={() => setRemoveAdminConfirmOpen(false)}
            variant="outlined"
            size="small"
            disabled={loading}
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmRemoveAdmin}
            variant="contained"
            color="warning"
            size="small"
            disabled={loading}
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            {loading ? 'Removing...' : 'Remove Admin'}
          </Button>
        </FormActions>
      </StyledDialog>
    </PageContainer>
  );
};

export default SchoolsManagement; 