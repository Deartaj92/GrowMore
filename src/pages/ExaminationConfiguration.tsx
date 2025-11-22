import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  InputAdornment,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  RadioGroup,
  Radio,
  FormGroup,
  FormLabel,
  FormControlLabel as MuiFormControlLabel,
  Autocomplete,
  Stack,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Grade as GradeIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  School as SchoolIcon,
  Assessment as AssessmentIcon,
  PictureAsPdf as PdfIcon,
  Analytics as AnalyticsIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { examinationConfigurationService } from '../services/examinationConfigurationService';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { useToast } from '../components/useToast';

// Styled Components
const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 12px 6px 12px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  height: 93vh;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transform: translateZ(0);
  will-change: transform;
`;

const Header = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 6px 0 4px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.BG};
  box-shadow: 0 1px 6px #0001;
  border-radius: 10px;
  padding: 4px 8px 2px 8px;
  min-height: 36px;
`;

const Title = styled.h2`
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 1px;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 4px 0 0 0;
  line-height: 1.4;
`;

const MainContent = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  padding: 0 0 32px 0;
  
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: scroll-position;
  
  @media (max-width: 700px) {
    scroll-behavior: auto;
    -webkit-overflow-scrolling: touch;
    perspective: none;
    overscroll-behavior: contain;
    scroll-snap-type: none;
  }
  
  @media (min-width: 701px) {
    scroll-behavior: smooth;
    scroll-snap-type: y proximity;
    perspective: 1000px;
  }
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 3px;
    transition: background 0.2s;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
  }
  
  @media (max-width: 700px) {
    &::-webkit-scrollbar {
      width: 4px;
    }
  }
`;

const TabContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 14px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.18), 0 1.5px 6px rgba(0,0,0,0.10);
  margin-bottom: 16px;
  overflow: hidden;
`;

const TabContent = styled.div`
  padding: 24px;
  min-height: 60vh;
`;

const Footer = styled.div`
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.BG};
  box-shadow: 0 -1px 6px #0001;
  margin-top: auto;
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: ${({ theme, variant }) => 
    variant === 'primary'
      ? 'linear-gradient(45deg, #6366f1, #8b5cf6)'
      : theme.BG === '#252525' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.05)'};
  color: ${({ theme, variant }) => 
    variant === 'primary'
      ? '#fff'
      : theme.BG === '#252525'
        ? '#fff'
        : '#1e293b'};
  border: none;
  box-shadow: ${({ variant }) => 
    variant === 'primary'
      ? '0 2px 8px rgba(99, 102, 241, 0.25)'
      : 'none'};
  
  &:hover {
    transform: translateY(-1px);
    background: ${({ theme, variant }) => 
      variant === 'primary'
        ? 'linear-gradient(45deg, #4f46e5, #7c3aed)'
        : theme.BG === '#252525'
          ? 'rgba(255, 255, 255, 0.15)'
          : 'rgba(0, 0, 0, 0.1)'};
    box-shadow: ${({ variant }) => 
      variant === 'primary'
        ? '0 4px 12px rgba(99, 102, 241, 0.35)'
        : 'none'};
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  width: 100%;
`;

const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 5px solid #e0e7ff;
  border-top: 5px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.div`
  margin-top: 18px;
  color: #6366f1;
  font-size: 1.15rem;
  font-weight: 600;
  text-align: center;
`;

interface GradeConfiguration {
  id?: number;
  grade: string;
  min_percentage: number;
  max_percentage: number;
  description?: string;
  color?: string;
}

interface DMCConfiguration {
  id?: number;
  include_student_photo: boolean;
  include_teacher_signature: boolean;
  include_principal_signature: boolean;
  include_school_logo: boolean;
  include_attendance_percentage: boolean;
  include_remarks: boolean;
  include_grade: boolean;
  include_school_motto: boolean;
  attendance_threshold: number;
  default_remarks?: string;
  // Additional DMC settings
  include_parent_signature: boolean;
  include_guardian_details: boolean;
  include_medical_certificate: boolean;
  include_conduct_certificate: boolean;
  include_achievement_certificate: boolean;
  watermark_text?: string;
  footer_text?: string;
  header_text?: string;
  certificate_template: 'standard' | 'premium' | 'custom';
  print_quality: 'draft' | 'normal' | 'high';
  auto_generate_serial: boolean;
  include_qr_code: boolean;
  include_barcode: boolean;
}


interface DMCColorConfiguration {
  id?: number;
  // Header colors
  header_gradient_start: string;
  header_gradient_end: string;
  header_text_color: string;
  header_text_shadow: string;
  
  // Logo colors
  logo_background: string;
  logo_border: string;
  
  // Title colors
  title_background: string;
  title_text_color: string;
  title_border: string;
  
  // Bar colors
  bar_gradient_start: string;
  bar_gradient_end: string;
  
  // Student details colors
  details_background: string;
  details_border: string;
  details_text_color: string;
  details_label_color: string;
  
  // Table colors
  table_header_background: string;
  table_header_text: string;
  table_border: string;
  table_alternate_row: string;
  table_text_color: string;
  
  // Summary colors
  summary_background: string;
  summary_border: string;
  summary_text_color: string;
  summary_label_color: string;
  
  // Performance colors
  excellent_color: string; // 90%+
  good_color: string;      // 80-89%
  average_color: string;   // 70-79%
  poor_color: string;      // <70%
  
  // Special marks colors
  absent_color: string;
  fail_color: string;
  
  // Footer colors
  footer_gradient_start: string;
  footer_gradient_end: string;
  
  // Border colors
  border_color: string;
  signature_text_color: string;
}

interface ExaminationConfig {
  id?: number;
  school_id: number;
  grade_configurations: GradeConfiguration[];
  dmc_configuration: DMCConfiguration;
  dmc_color_configuration: DMCColorConfiguration;
  created_at?: string;
  updated_at?: string;
}

const ExaminationConfiguration: React.FC = () => {
  const { theme } = React.useContext(ThemeContext);
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Check if user has school_id
  if (!user?.school_id) {
    return (
      <PageContainer theme={theme === 'dark' ? darkTheme : lightTheme}>
        <Header theme={theme === 'dark' ? darkTheme : lightTheme}>
          <Title theme={theme === 'dark' ? darkTheme : lightTheme}>Examination Configuration</Title>
          <Subtitle theme={theme === 'dark' ? darkTheme : lightTheme}>
            Configure examination settings and DMC preferences
          </Subtitle>
        </Header>
        <MainContent>
          <Alert severity="error" sx={{ m: 2 }}>
            No school context found. Please contact your administrator.
          </Alert>
        </MainContent>
      </PageContainer>
    );
  }
  const [config, setConfig] = useState<ExaminationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gradeDialog, setGradeDialog] = useState({ open: false, grade: null as GradeConfiguration | null });
  const [editingGrade, setEditingGrade] = useState<GradeConfiguration | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState(0);

  // Default grade configurations
  const defaultGrades: GradeConfiguration[] = [
    { grade: 'A+', min_percentage: 90, max_percentage: 100, description: 'Outstanding', color: '#4CAF50' },
    { grade: 'A', min_percentage: 80, max_percentage: 89, description: 'Excellent', color: '#8BC34A' },
    { grade: 'B+', min_percentage: 70, max_percentage: 79, description: 'Very Good', color: '#CDDC39' },
    { grade: 'B', min_percentage: 60, max_percentage: 69, description: 'Good', color: '#FFC107' },
    { grade: 'C+', min_percentage: 50, max_percentage: 59, description: 'Satisfactory', color: '#FF9800' },
    { grade: 'C', min_percentage: 40, max_percentage: 49, description: 'Pass', color: '#FF5722' },
    { grade: 'D', min_percentage: 0, max_percentage: 39, description: 'Fail', color: '#F44336' }
  ];

  // Default DMC configuration
  const defaultDMCConfig: DMCConfiguration = {
    include_student_photo: true,
    include_teacher_signature: true,
    include_principal_signature: true,
    include_school_logo: true,
    include_attendance_percentage: true,
    include_remarks: true,
    include_grade: true,
    include_school_motto: true,
    attendance_threshold: 75,
    default_remarks: 'Good performance. Keep it up!',
    include_parent_signature: false,
    include_guardian_details: false,
    include_medical_certificate: false,
    include_conduct_certificate: false,
    include_achievement_certificate: false,
    watermark_text: 'CONFIDENTIAL',
    footer_text: 'This certificate is computer generated and does not require signature.',
    header_text: 'DETAILED MARK CERTIFICATE',
    certificate_template: 'standard',
    print_quality: 'normal',
    auto_generate_serial: true,
    include_qr_code: false,
    include_barcode: false
  };


  // Default DMC Color configuration
  const defaultDMCColorConfig: DMCColorConfiguration = {
    // Header colors - Purple to Pink gradient
    header_gradient_start: '#667eea',
    header_gradient_end: '#f093fb',
    header_text_color: '#ffffff',
    header_text_shadow: '#6b7280',
    
    // Logo colors
    logo_background: '#ffffff',
    logo_border: '#ffffff',
    
    // Title colors
    title_background: '#d8b4fe',
    title_text_color: '#ffffff',
    title_border: '#d8b4fe',
    
    // Bar colors - Multi-color gradient
    bar_gradient_start: '#93c5fd',
    bar_gradient_end: '#86efac',
    
    // Student details colors
    details_background: '#ffffff',
    details_border: '#e2e8f0',
    details_text_color: '#1e293b',
    details_label_color: '#6b7280',
    
    // Table colors
    table_header_background: '#d8b4fe',
    table_header_text: '#ffffff',
    table_border: '#e2e8f0',
    table_alternate_row: '#f3e8ff',
    table_text_color: '#1e293b',
    
    // Summary colors
    summary_background: '#f3e8ff',
    summary_border: '#e5e7eb',
    summary_text_color: '#1e293b',
    summary_label_color: '#6b7280',
    
    // Performance colors
    excellent_color: '#059669', // Green for 90%+
    good_color: '#d97706',      // Orange for 80-89%
    average_color: '#dc2626',   // Red for 70-79%
    poor_color: '#991b1b',      // Dark red for <70%
    
    // Special marks colors
    absent_color: '#dc2626',
    fail_color: '#dc2626',
    
    // Footer colors - Same as header
    footer_gradient_start: '#667eea',
    footer_gradient_end: '#f093fb',
    
    // Border colors
    border_color: '#667eea',
    signature_text_color: '#6b7280'
  };

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      // Get current school ID from user context
      const schoolId = user?.school_id;
      if (!schoolId) {
        throw new Error('No school ID available');
      }

      const data = await examinationConfigurationService.getExaminationConfiguration(schoolId);

      if (data) {
        // Ensure DMC color configuration is included
        if (!data.dmc_color_configuration) {
          data.dmc_color_configuration = defaultDMCColorConfig;
        }
        setConfig(data);
      } else {
        // Create default configuration
        const newConfig: ExaminationConfig = {
          school_id: schoolId,
          grade_configurations: defaultGrades,
          dmc_configuration: defaultDMCConfig,
          dmc_color_configuration: defaultDMCColorConfig
        };
        setConfig(newConfig);
      }
    } catch (error) {
      showToast('Failed to load configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      setSaving(true);
      if (!config) return;

      // Validate grade configuration
      const validation = examinationConfigurationService.validateGradeConfiguration(config.grade_configurations);
      if (!validation.valid) {
        setValidationErrors(validation.errors);
        showToast('Please fix validation errors before saving', 'error');
        return;
      }

      setValidationErrors([]);
      const savedConfig = await examinationConfigurationService.upsertExaminationConfiguration(config);
      setConfig(savedConfig);

      showToast('Configuration saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGradeChange = (index: number, field: keyof GradeConfiguration, value: any) => {
    if (!config) return;
    
    const updatedGrades = [...config.grade_configurations];
    updatedGrades[index] = { ...updatedGrades[index], [field]: value };
    
    setConfig({
      ...config,
      grade_configurations: updatedGrades
    });
  };

  const addGrade = () => {
    setEditingGrade({
      grade: '',
      min_percentage: 0,
      max_percentage: 100,
      description: '',
      color: '#2196F3'
    });
    setGradeDialog({ open: true, grade: null });
  };

  const editGrade = (grade: GradeConfiguration) => {
    setEditingGrade(grade);
    setGradeDialog({ open: true, grade });
  };

  const saveGrade = () => {
    if (!editingGrade || !config) return;

    const updatedGrades = [...config.grade_configurations];
    
    if (gradeDialog.grade) {
      // Edit existing grade
      const index = updatedGrades.findIndex(g => g.id === gradeDialog.grade?.id);
      if (index !== -1) {
        updatedGrades[index] = { ...editingGrade, id: gradeDialog.grade.id };
      }
    } else {
      // Add new grade
      updatedGrades.push(editingGrade);
    }

    setConfig({
      ...config,
      grade_configurations: updatedGrades
    });

    setGradeDialog({ open: false, grade: null });
    setEditingGrade(null);
  };

  const deleteGrade = (gradeId: number) => {
    if (!config) return;
    
    const updatedGrades = config.grade_configurations.filter(g => g.id !== gradeId);
    setConfig({
      ...config,
      grade_configurations: updatedGrades
    });
  };

  const handleDMCChange = (field: keyof DMCConfiguration, value: any) => {
    if (!config) return;
    
    setConfig({
      ...config,
      dmc_configuration: {
        ...config.dmc_configuration,
        [field]: value
      }
    });
  };

  const handleDMCColorChange = (field: keyof DMCColorConfiguration, value: any) => {
    if (!config) return;
    
    setConfig({
      ...config,
      dmc_color_configuration: {
        ...config.dmc_color_configuration,
        [field]: value
      }
    });
  };


  if (loading) {
    return (
      <PageContainer theme={theme === 'dark' ? darkTheme : lightTheme}>
        <LoadingContainer>
          <LoadingSpinner />
          <LoadingText>Loading configuration...</LoadingText>
        </LoadingContainer>
      </PageContainer>
    );
  }

  if (!config) {
    return (
      <PageContainer theme={theme === 'dark' ? darkTheme : lightTheme}>
        <LoadingContainer>
          <LoadingText>Failed to load configuration</LoadingText>
        </LoadingContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer theme={theme === 'dark' ? darkTheme : lightTheme}>
      <Header theme={theme === 'dark' ? darkTheme : lightTheme}>
        <div>
          <Title theme={theme === 'dark' ? darkTheme : lightTheme}>
            Examination Configuration
          </Title>
          <Subtitle theme={theme === 'dark' ? darkTheme : lightTheme}>
            Configure comprehensive examination settings, grade criteria, DMC options, and reporting
          </Subtitle>
        </div>
      </Header>

      <MainContent theme={theme === 'dark' ? darkTheme : lightTheme}>
        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              Configuration Validation Errors:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {validationErrors.map((error, index) => (
                <li key={index}>
                  <Typography variant="body2">{error}</Typography>
                </li>
              ))}
            </ul>
          </Alert>
        )}

        <TabContainer theme={theme === 'dark' ? darkTheme : lightTheme}>
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              '& .MuiTab-root': {
                color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
                '&.Mui-selected': {
                  color: '#6366f1'
                }
              }
            }}
          >
            <Tab 
              icon={<GradeIcon />} 
              label="Grade Configuration" 
              iconPosition="start"
              sx={{ minHeight: 64 }}
            />
            <Tab 
              icon={<AssignmentIcon />} 
              label="DMC Settings" 
              iconPosition="start"
              sx={{ minHeight: 64 }}
            />
            <Tab 
              icon={<PaletteIcon />} 
              label="DMC Colors" 
              iconPosition="start"
              sx={{ minHeight: 64 }}
            />
          </Tabs>

          <TabContent>
            {activeTab === 0 && (
              <GradeConfigurationTab 
                config={config}
                onGradeChange={handleGradeChange}
                onAddGrade={addGrade}
                onEditGrade={editGrade}
                onDeleteGrade={deleteGrade}
              />
            )}
            
            {activeTab === 1 && (
              <DMCConfigurationTab 
                config={config}
                onDMCChange={handleDMCChange}
              />
            )}
            
            {activeTab === 2 && (
              <DMCColorConfigurationTab 
                config={config}
                onDMCColorChange={handleDMCColorChange}
              />
            )}
          </TabContent>
        </TabContainer>
      </MainContent>

      <Footer theme={theme === 'dark' ? darkTheme : lightTheme}>
        <ActionButton
          theme={theme === 'dark' ? darkTheme : lightTheme}
          variant="secondary"
          onClick={async () => {
            try {
              // Reset to defaults by creating a new default configuration
              const schoolId = user?.school_id;
              if (!schoolId) {
                showToast('No school ID available', 'error');
                return;
              }
              const defaultConfig: ExaminationConfig = {
                school_id: schoolId,
                grade_configurations: defaultGrades,
                dmc_configuration: defaultDMCConfig,
                dmc_color_configuration: defaultDMCColorConfig
              };
              await examinationConfigurationService.upsertExaminationConfiguration(defaultConfig);
              await loadConfiguration();
              showToast('Configuration reset to defaults successfully', 'success');
            } catch (error) {
              showToast('Failed to reset configuration', 'error');
            }
          }}
        >
          Reset to Defaults
        </ActionButton>
        <ActionButton
          theme={theme === 'dark' ? darkTheme : lightTheme}
          variant="secondary"
          onClick={async () => {
            try {
              await loadConfiguration();
              showToast('Configuration reloaded successfully', 'success');
            } catch (error) {
              showToast('Failed to reload configuration', 'error');
            }
          }}
        >
          Reload
        </ActionButton>
        <ActionButton
          theme={theme === 'dark' ? darkTheme : lightTheme}
          variant="primary"
          onClick={saveConfiguration}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </ActionButton>
      </Footer>

      {/* Grade Dialog */}
      <Dialog open={gradeDialog.open} onClose={() => setGradeDialog({ open: false, grade: null })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {gradeDialog.grade ? 'Edit Grade' : 'Add New Grade'}
        </DialogTitle>
        <DialogContent>
          {editingGrade && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Grade"
                  value={editingGrade.grade}
                  onChange={(e) => setEditingGrade({ ...editingGrade, grade: e.target.value })}
                  placeholder="e.g., A+, B, C-"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Color"
                  type="color"
                  value={editingGrade.color}
                  onChange={(e) => setEditingGrade({ ...editingGrade, color: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Min Percentage"
                  type="number"
                  value={editingGrade.min_percentage}
                  onChange={(e) => setEditingGrade({ ...editingGrade, min_percentage: parseInt(e.target.value) })}
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Max Percentage"
                  type="number"
                  value={editingGrade.max_percentage}
                  onChange={(e) => setEditingGrade({ ...editingGrade, max_percentage: parseInt(e.target.value) })}
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={editingGrade.description || ''}
                  onChange={(e) => setEditingGrade({ ...editingGrade, description: e.target.value })}
                  placeholder="e.g., Outstanding, Excellent, Good"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGradeDialog({ open: false, grade: null })}>
            Cancel
          </Button>
          <Button onClick={saveGrade} variant="contained">
            {gradeDialog.grade ? 'Update' : 'Add'} Grade
          </Button>
        </DialogActions>
      </Dialog>

    </PageContainer>
  );
};

// Tab Components
const GradeConfigurationTab: React.FC<{
  config: ExaminationConfig | null;
  onGradeChange: (index: number, field: keyof GradeConfiguration, value: any) => void;
  onAddGrade: () => void;
  onEditGrade: (grade: GradeConfiguration) => void;
  onDeleteGrade: (gradeId: number) => void;
}> = ({ config, onGradeChange, onAddGrade, onEditGrade, onDeleteGrade }) => {
  if (!config) return null;

  return (
    <Card>
      <CardHeader
        avatar={<GradeIcon color="primary" />}
        title="Grade Configuration"
        subheader="Set percentage ranges for each grade"
        action={
          <Button
            startIcon={<AddIcon />}
            onClick={onAddGrade}
            variant="outlined"
            size="small"
          >
            Add Grade
          </Button>
        }
      />
      <CardContent>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Grade</TableCell>
                <TableCell>Min %</TableCell>
                <TableCell>Max %</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {config.grade_configurations.map((grade, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Chip 
                      label={grade.grade} 
                      sx={{ 
                        bgcolor: grade.color || '#2196F3',
                        color: 'white',
                        fontWeight: 600
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={grade.min_percentage}
                      onChange={(e) => onGradeChange(index, 'min_percentage', parseInt(e.target.value))}
                      inputProps={{ min: 0, max: 100 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={grade.max_percentage}
                      onChange={(e) => onGradeChange(index, 'max_percentage', parseInt(e.target.value))}
                      inputProps={{ min: 0, max: 100 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={grade.description || ''}
                      onChange={(e) => onGradeChange(index, 'description', e.target.value)}
                      placeholder="Description"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => onEditGrade(grade)}>
                      <EditIcon />
                    </IconButton>
                    {grade.id && (
                      <IconButton size="small" onClick={() => onDeleteGrade(grade.id!)}>
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

const DMCConfigurationTab: React.FC<{
  config: ExaminationConfig | null;
  onDMCChange: (field: keyof DMCConfiguration, value: any) => void;
}> = ({ config, onDMCChange }) => {
  if (!config) return null;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            avatar={<AssignmentIcon color="primary" />}
            title="DMC Settings"
            subheader="Configure basic certificate elements"
          />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.dmc_configuration.include_student_photo}
                      onChange={(e) => onDMCChange('include_student_photo', e.target.checked)}
                    />
                  }
                  label="Include Student Photo"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.dmc_configuration.include_teacher_signature}
                      onChange={(e) => onDMCChange('include_teacher_signature', e.target.checked)}
                    />
                  }
                  label="Include Teacher Signature"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.dmc_configuration.include_principal_signature}
                      onChange={(e) => onDMCChange('include_principal_signature', e.target.checked)}
                    />
                  }
                  label="Include Principal Signature"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.dmc_configuration.include_school_logo}
                      onChange={(e) => onDMCChange('include_school_logo', e.target.checked)}
                    />
                  }
                  label="Include School Logo"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.dmc_configuration.include_attendance_percentage}
                      onChange={(e) => onDMCChange('include_attendance_percentage', e.target.checked)}
                    />
                  }
                  label="Include Attendance Percentage"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.dmc_configuration.include_remarks}
                      onChange={(e) => onDMCChange('include_remarks', e.target.checked)}
                    />
                  }
                  label="Include Remarks"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.dmc_configuration.include_grade}
                      onChange={(e) => onDMCChange('include_grade', e.target.checked)}
                    />
                  }
                  label="Include Grade"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.dmc_configuration.include_school_motto}
                      onChange={(e) => onDMCChange('include_school_motto', e.target.checked)}
                    />
                  }
                  label="Include School Motto"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

    </Grid>
  );
};






// DMC Color Configuration Tab Component
const DMCColorConfigurationTab: React.FC<{
  config: ExaminationConfig | null;
  onDMCColorChange: (field: keyof DMCColorConfiguration, value: any) => void;
}> = ({ config, onDMCColorChange }) => {
  if (!config || !config.dmc_color_configuration) return null;

  const colorConfig = config.dmc_color_configuration;

  const ColorBlock = ({ label, value, onChange, gradient = false }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    gradient?: boolean;
  }) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
        {label}
      </Typography>
      <Box
        sx={{
          width: '100%',
          height: 60,
          borderRadius: 1,
          border: '2px solid #e0e0e0',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          background: gradient 
            ? `linear-gradient(45deg, ${value || '#000000'}, ${colorConfig.header_gradient_end || '#000000'})`
            : (value || '#000000'),
          '&:hover': {
            borderColor: '#1976d2',
            transform: 'scale(1.02)',
            transition: 'all 0.2s ease'
          }
        }}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'color';
          input.value = value || '#000000';
          input.onchange = (e) => onChange((e.target as HTMLInputElement).value);
          input.click();
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 600,
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            textAlign: 'center'
          }}
        >
          {value ? value.toUpperCase() : '#000000'}
        </Box>
      </Box>
    </Box>
  );

  return (
    <Grid container spacing={3}>
      {/* Header & Layout Colors */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader
            avatar={<PaletteIcon color="primary" />}
            title="Header & Layout"
            subheader="Main document colors"
          />
          <CardContent>
            <ColorBlock
              label="Header Gradient Start"
              value={colorConfig.header_gradient_start}
              onChange={(value) => onDMCColorChange('header_gradient_start', value)}
            />
            <ColorBlock
              label="Header Gradient End"
              value={colorConfig.header_gradient_end}
              onChange={(value) => onDMCColorChange('header_gradient_end', value)}
            />
            <ColorBlock
              label="Table Header"
              value={colorConfig.table_header_background}
              onChange={(value) => onDMCColorChange('table_header_background', value)}
            />
            <ColorBlock
              label="Table Text"
              value={colorConfig.table_header_text}
              onChange={(value) => onDMCColorChange('table_header_text', value)}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Performance Colors */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader
            avatar={<PaletteIcon color="success" />}
            title="Performance Colors"
            subheader="Grade-based color coding"
          />
          <CardContent>
            <ColorBlock
              label="Excellent (90%+)"
              value={colorConfig.excellent_color}
              onChange={(value) => onDMCColorChange('excellent_color', value)}
            />
            <ColorBlock
              label="Good (80-89%)"
              value={colorConfig.good_color}
              onChange={(value) => onDMCColorChange('good_color', value)}
            />
            <ColorBlock
              label="Average (70-79%)"
              value={colorConfig.average_color}
              onChange={(value) => onDMCColorChange('average_color', value)}
            />
            <ColorBlock
              label="Poor (<70%)"
              value={colorConfig.poor_color}
              onChange={(value) => onDMCColorChange('poor_color', value)}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Special & Footer Colors */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader
            avatar={<PaletteIcon color="warning" />}
            title="Special & Footer"
            subheader="Marks and footer colors"
          />
          <CardContent>
            <ColorBlock
              label="Absent/Fail Marks"
              value={colorConfig.absent_color}
              onChange={(value) => onDMCColorChange('absent_color', value)}
            />
            <ColorBlock
              label="Footer Gradient Start"
              value={colorConfig.footer_gradient_start}
              onChange={(value) => onDMCColorChange('footer_gradient_start', value)}
            />
            <ColorBlock
              label="Footer Gradient End"
              value={colorConfig.footer_gradient_end}
              onChange={(value) => onDMCColorChange('footer_gradient_end', value)}
            />
            <ColorBlock
              label="Border Color"
              value={colorConfig.border_color}
              onChange={(value) => onDMCColorChange('border_color', value)}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default ExaminationConfiguration;
