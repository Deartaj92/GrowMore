import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../contexts/ThemeContext';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
  Subject as SubjectIcon,
  Message as MessageIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  AttachFile as AttachFileIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { enquiryService } from '../services/enquiryService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';
import { EnquiryType, EnquiryFormData, AdmissionDetails, JobDetails } from '../types/enquiry';
import AppDateField from './shared/AppDateField';
import {
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Grid,
  Paper,
  Typography,
  Divider,
  Chip,
  Box,
  CircularProgress
} from '@mui/material';

// ===== STYLED COMPONENTS =====

const FormContainer = styled.div`
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  padding-bottom: 3rem; /* Extra padding at bottom to prevent clipping */
  background: ${({ theme }) => theme.BG};
  height: 100%;
  min-height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
  max-width: 100vw;
  position: relative;
  
  @media (max-width: 768px) {
    padding: 1rem;
    max-width: 100%;
  }
  
  @media (max-width: 480px) {
    padding: 0.75rem;
  }
`;

const FormHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    margin-bottom: 1.5rem;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 1rem;
  }
`;

const FormTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0 0 0.5rem 0;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.25rem;
  }
`;

const FormSubtitle = styled.p`
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.8rem;
  }
`;

const FormCard = styled(Paper)`
  padding: 2rem;
  margin-bottom: 1.5rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    margin-bottom: 1rem;
  }
  
  @media (max-width: 480px) {
    padding: 1rem;
    margin-bottom: 0.75rem;
  }
`;

const SectionTitle = styled(Typography)`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1rem;
    margin-bottom: 0.5rem;
    flex-direction: column;
    gap: 0.25rem;
    text-align: center;
  }
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 768px) {
    margin-top: 1.5rem;
    padding-top: 1rem;
  }
  
  @media (max-width: 480px) {
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem;
    padding-top: 0.75rem;
  }
`;

const ActionButton = styled(Button)`
  border-radius: 12px;
  text-transform: none;
  font-weight: 600;
  padding: 0.75rem 2rem;
  
  @media (max-width: 768px) {
    padding: 0.5rem 1.5rem;
  }
  
  @media (max-width: 480px) {
    width: 100%;
    padding: 0.75rem 1rem;
  }
`;

const FileUploadArea = styled.div`
  border: 2px dashed ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  background: ${({ theme }) => theme.FIELD_BG};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT};
    background: ${({ theme }) => theme.HOVER_BG};
  }
`;

const UploadedFile = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  margin-top: 0.5rem;
`;

// ===== MAIN COMPONENT =====

interface EnquiryFormProps {
  enquiryId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const EnquiryForm: React.FC<EnquiryFormProps> = ({ enquiryId, onSuccess, onCancel }) => {
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // State
  const [loading, setLoading] = useState(false);
  const [enquiryTypes, setEnquiryTypes] = useState<EnquiryType[]>([]);
  const [formData, setFormData] = useState<EnquiryFormData>({
    enquiry_type_id: 0,
    name: '',
    email: '',
    phone: '',
    address: '',
    subject: '',
    message: '',
    priority: 'medium',
    source: 'website'
  });
  const [admissionDetails, setAdmissionDetails] = useState<Partial<AdmissionDetails>>({});
  const [jobDetails, setJobDetails] = useState<Partial<JobDetails>>({});
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Check if user has school_id
  if (!user?.school_id) {
    return (
      <FormContainer theme={theme}>
        <div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>
          No school context found. Please contact your administrator.
        </div>
      </FormContainer>
    );
  }

  // Load enquiry types and existing enquiry data
  useEffect(() => {
    const loadData = async () => {
      try {
        const types = await enquiryService.getEnquiryTypes();
        setEnquiryTypes(types);
        
        // Set default type if available
        if (types.length > 0 && formData.enquiry_type_id === 0) {
          setFormData(prev => ({ ...prev, enquiry_type_id: types[0].id }));
        }

        // Load existing enquiry data if editing
        if (enquiryId && user?.school_id) {
          const existingEnquiry = await enquiryService.getEnquiryById(user.school_id, enquiryId);
          if (existingEnquiry) {
            // Pre-fill form with existing data
            setFormData({
              enquiry_type_id: existingEnquiry.enquiry_type_id,
              name: existingEnquiry.name,
              email: existingEnquiry.email || '',
              phone: existingEnquiry.phone || '',
              address: existingEnquiry.address || '',
              subject: existingEnquiry.subject,
              message: existingEnquiry.message,
              priority: existingEnquiry.priority,
              source: existingEnquiry.source
            });

            // Pre-fill type-specific details
            if (existingEnquiry.admission_details) {
              setAdmissionDetails(existingEnquiry.admission_details);
            }
            if (existingEnquiry.job_details) {
              setJobDetails(existingEnquiry.job_details);
            }
          }
        }
      } catch (err: any) {
        showToast('Failed to load data: ' + err.message, 'error');
      }
    };

    loadData();
  }, [enquiryId, user?.school_id]);

  // Handle form field changes
  const handleFieldChange = (field: keyof EnquiryFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle admission details changes
  const handleAdmissionDetailsChange = (field: keyof AdmissionDetails, value: any) => {
    setAdmissionDetails(prev => ({ ...prev, [field]: value }));
  };

  // Handle job details changes
  const handleJobDetailsChange = (field: keyof JobDetails, value: any) => {
    setJobDetails(prev => ({ ...prev, [field]: value }));
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  // Remove file
  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.enquiry_type_id) {
      newErrors.enquiry_type_id = 'Please select an enquiry type';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    setLoading(true);
    try {
      if (!user?.school_id) {
        showToast('No school context found', 'error');
        return;
      }

      const submissionData: EnquiryFormData = {
        ...formData,
        admission_details: Object.keys(admissionDetails).length > 0 ? admissionDetails : undefined,
        job_details: Object.keys(jobDetails).length > 0 ? jobDetails : undefined
      };

      if (enquiryId) {
        // Update existing enquiry
        await enquiryService.updateEnquiry(user.school_id, enquiryId, submissionData);
        showToast('Enquiry updated successfully!', 'success');
      } else {
        // Create new enquiry
        await enquiryService.createEnquiry(user.school_id, submissionData, user.id);
        showToast('Enquiry submitted successfully!', 'success');
      }

      // Upload files if any
      if (attachedFiles.length > 0) {
        // Note: File upload would be handled separately after enquiry creation
        showToast('Enquiry created. File upload will be available in the enquiry details.', 'success');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/enquiries');
      }
    } catch (err: any) {
      showToast('Failed to submit enquiry: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/enquiries');
    }
  };

  // Get selected enquiry type
  const selectedType = enquiryTypes.find(type => type.id === formData.enquiry_type_id);

  return (
    <FormContainer theme={theme}>
      <FormHeader>
        <FormTitle>
          {enquiryId ? 'Edit Enquiry' : 'Submit New Enquiry'}
        </FormTitle>
        <FormSubtitle>
          {enquiryId ? 'Update enquiry details and information' : 'Fill out the form below to submit your enquiry'}
        </FormSubtitle>
      </FormHeader>

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <FormCard>
          <SectionTitle>
            <PersonIcon />
            Basic Information
          </SectionTitle>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Name *"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Enquiry Type *</InputLabel>
                <Select
                  value={formData.enquiry_type_id}
                  label="Enquiry Type *"
                  onChange={(e) => handleFieldChange('enquiry_type_id', e.target.value)}
                  error={!!errors.enquiry_type_id}
                >
                  {enquiryTypes.map(type => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                multiline
                rows={2}
                value={formData.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
              />
            </Grid>
          </Grid>
        </FormCard>

        {/* Enquiry Details */}
        <FormCard>
          <SectionTitle>
            <MessageIcon />
            Enquiry Details
          </SectionTitle>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Subject *"
                value={formData.subject}
                onChange={(e) => handleFieldChange('subject', e.target.value)}
                error={!!errors.subject}
                helperText={errors.subject}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Message *"
                multiline
                rows={4}
                value={formData.message}
                onChange={(e) => handleFieldChange('message', e.target.value)}
                error={!!errors.message}
                helperText={errors.message}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  label="Priority"
                  onChange={(e) => handleFieldChange('priority', e.target.value)}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Source</InputLabel>
                <Select
                  value={formData.source}
                  label="Source"
                  onChange={(e) => handleFieldChange('source', e.target.value)}
                >
                  <MenuItem value="website">Website</MenuItem>
                  <MenuItem value="phone">Phone</MenuItem>
                  <MenuItem value="walk-in">Walk-in</MenuItem>
                  <MenuItem value="referral">Referral</MenuItem>
                  <MenuItem value="social-media">Social Media</MenuItem>
                  <MenuItem value="advertisement">Advertisement</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </FormCard>

        {/* Admission Details */}
        {selectedType?.name === 'Admission Inquiry' && (
          <FormCard>
            <SectionTitle>
              <SchoolIcon />
              Admission Details
            </SectionTitle>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Student Name"
                  value={admissionDetails.student_name || ''}
                  onChange={(e) => handleAdmissionDetailsChange('student_name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Student Age"
                  type="number"
                  value={admissionDetails.student_age || ''}
                  onChange={(e) => handleAdmissionDetailsChange('student_age', parseInt(e.target.value) || undefined)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <AppDateField
                  value={admissionDetails.student_dob || ''}
                  onChangeValue={(value) => handleAdmissionDetailsChange('student_dob', value)}
                  label="Date of Birth"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Current Class"
                  value={admissionDetails.current_class || ''}
                  onChange={(e) => handleAdmissionDetailsChange('current_class', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Current School"
                  value={admissionDetails.current_school || ''}
                  onChange={(e) => handleAdmissionDetailsChange('current_school', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Preferred Class"
                  value={admissionDetails.preferred_class || ''}
                  onChange={(e) => handleAdmissionDetailsChange('preferred_class', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Academic Year"
                  value={admissionDetails.academic_year || ''}
                  onChange={(e) => handleAdmissionDetailsChange('academic_year', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Parent Occupation"
                  value={admissionDetails.parent_occupation || ''}
                  onChange={(e) => handleAdmissionDetailsChange('parent_occupation', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={admissionDetails.transport_required || false}
                      onChange={(e) => handleAdmissionDetailsChange('transport_required', e.target.checked)}
                    />
                  }
                  label="Transport Required"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={admissionDetails.hostel_required || false}
                      onChange={(e) => handleAdmissionDetailsChange('hostel_required', e.target.checked)}
                    />
                  }
                  label="Hostel Required"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Special Requirements"
                  multiline
                  rows={2}
                  value={admissionDetails.special_requirements || ''}
                  onChange={(e) => handleAdmissionDetailsChange('special_requirements', e.target.value)}
                />
              </Grid>
            </Grid>
          </FormCard>
        )}

        {/* Job Details */}
        {selectedType?.name === 'Job Vacancy' && (
          <FormCard>
            <SectionTitle>
              <WorkIcon />
              Job Application Details
            </SectionTitle>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Position Applied For"
                  value={jobDetails.position_applied || ''}
                  onChange={(e) => handleJobDetailsChange('position_applied', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={jobDetails.department || ''}
                  onChange={(e) => handleJobDetailsChange('department', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Years of Experience"
                  type="number"
                  value={jobDetails.experience_years || ''}
                  onChange={(e) => handleJobDetailsChange('experience_years', parseInt(e.target.value) || undefined)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Current Position"
                  value={jobDetails.current_position || ''}
                  onChange={(e) => handleJobDetailsChange('current_position', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Current Salary"
                  value={jobDetails.current_salary || ''}
                  onChange={(e) => handleJobDetailsChange('current_salary', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Expected Salary"
                  value={jobDetails.expected_salary || ''}
                  onChange={(e) => handleJobDetailsChange('expected_salary', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <AppDateField
                  value={jobDetails.availability_date || ''}
                  onChangeValue={(value) => handleJobDetailsChange('availability_date', value)}
                  label="Availability Date"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Qualifications"
                  value={jobDetails.qualifications || ''}
                  onChange={(e) => handleJobDetailsChange('qualifications', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Previous Schools/Experience"
                  multiline
                  rows={2}
                  value={jobDetails.previous_schools || ''}
                  onChange={(e) => handleJobDetailsChange('previous_schools', e.target.value)}
                />
              </Grid>
            </Grid>
          </FormCard>
        )}

        {/* File Attachments */}
        <FormCard>
          <SectionTitle>
            <AttachFileIcon />
            Attachments (Optional)
          </SectionTitle>
          
          <FileUploadArea onClick={() => document.getElementById('file-upload')?.click()}>
            <CloudUploadIcon style={{ fontSize: '3rem', color: (theme as any).TEXT_SECONDARY, marginBottom: '1rem' }} />
            <Typography variant="h6" style={{ color: (theme as any).TEXT_PRIMARY, marginBottom: '0.5rem' }}>
              Click to upload files
            </Typography>
            <Typography variant="body2" style={{ color: (theme as any).TEXT_SECONDARY }}>
              Upload documents, certificates, or other relevant files
            </Typography>
            <input
              id="file-upload"
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
          </FileUploadArea>
          
          {attachedFiles.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              {attachedFiles.map((file, index) => (
                <UploadedFile key={index}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AttachFileIcon style={{ color: (theme as any).TEXT_SECONDARY }} />
                    <span style={{ color: (theme as any).TEXT_PRIMARY }}>{file.name}</span>
                    <Chip
                      label={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                      size="small"
                      variant="outlined"
                    />
                  </div>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => removeFile(index)}
                  >
                    Remove
                  </Button>
                </UploadedFile>
              ))}
            </div>
          )}
        </FormCard>

        {/* Form Actions */}
        <FormActions>
          <ActionButton
            variant="outlined"
            onClick={handleCancel}
            startIcon={<CancelIcon />}
            disabled={loading}
          >
            Cancel
          </ActionButton>
          <ActionButton
            type="submit"
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            disabled={loading}
            sx={{
              background: (theme as any).ACCENT,
              '&:hover': {
                background: (theme as any).ACCENT_DARK || (theme as any).ACCENT,
              }
            }}
          >
            {loading ? 'Submitting...' : (enquiryId ? 'Update Enquiry' : 'Submit Enquiry')}
          </ActionButton>
        </FormActions>
      </form>
    </FormContainer>
  );
};

export default EnquiryForm;
