import React, { useState, useContext, useEffect } from 'react';
import styled from 'styled-components';
import { ThemeContext } from '../contexts/ThemeContext';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Event as MeetingIcon,
  Sms as SmsIcon,
  WhatsApp as WhatsAppIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { enquiryService } from '../services/enquiryService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';
import { EnquiryFollowUp } from '../types/enquiry';
import {
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';

// ===== STYLED COMPONENTS =====

const FormContainer = styled.div`
  padding: 1rem;
  
  @media (max-width: 768px) {
    padding: 0.75rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.5rem;
  }
`;

const SectionTitle = styled(Typography)`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.9rem;
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
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 768px) {
    margin-top: 1rem;
    padding-top: 0.75rem;
  }
  
  @media (max-width: 480px) {
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 0.75rem;
    padding-top: 0.5rem;
  }
`;

const ActionButton = styled(Button)`
  border-radius: 12px;
  text-transform: none;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  
  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
  }
  
  @media (max-width: 480px) {
    width: 100%;
    padding: 0.75rem 1rem;
  }
`;

// ===== MAIN COMPONENT =====

interface FollowUpFormProps {
  enquiryId: number;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  followUp?: EnquiryFollowUp;
}

const FollowUpForm: React.FC<FollowUpFormProps> = ({ 
  enquiryId, 
  open, 
  onClose, 
  onSuccess, 
  followUp 
}) => {
  const { theme } = useContext(ThemeContext);
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // State
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    follow_up_type: 'call' as 'call' | 'email' | 'meeting' | 'sms' | 'whatsapp' | 'visit',
    subject: '',
    message: '',
    follow_up_date: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM
    assigned_to: user?.id || undefined,
    notes: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Check if user has school_id
  if (!user?.school_id) {
    return null;
  }

  // Load existing follow-up data when editing
  useEffect(() => {
    if (followUp && open) {
      // Pre-fill form with existing follow-up data
      setFormData({
        follow_up_type: followUp.follow_up_type,
        subject: followUp.subject || '',
        message: followUp.message || '',
        follow_up_date: followUp.follow_up_date ? new Date(followUp.follow_up_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        assigned_to: followUp.assigned_to || user.id,
        notes: followUp.notes || ''
      });
    } else if (!followUp && open) {
      // Reset form for new follow-up
      setFormData({
        follow_up_type: 'call',
        subject: '',
        message: '',
        follow_up_date: new Date().toISOString().slice(0, 16),
        assigned_to: user.id,
        notes: ''
      });
    }
  }, [followUp, open, user.id]);

  // Handle form field changes
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.follow_up_type) {
      newErrors.follow_up_type = 'Please select a follow-up type';
    }
    if (!formData.follow_up_date) {
      newErrors.follow_up_date = 'Please select a follow-up date';
    }
    if (formData.subject && formData.subject.length < 3) {
      newErrors.subject = 'Subject must be at least 3 characters';
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

      const followUpData = {
        ...formData,
        follow_up_date: new Date(formData.follow_up_date).toISOString(),
        status: 'pending' as const
      };

      if (followUp) {
        // Update existing follow-up
        await enquiryService.updateFollowUp(user.school_id, followUp.id, followUpData);
        showToast('Follow-up updated successfully!', 'success');
      } else {
        // Create new follow-up
        await enquiryService.createFollowUp(user.school_id, enquiryId, followUpData, user.id);
        showToast('Follow-up created successfully!', 'success');
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      showToast('Failed to save follow-up: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    onClose();
  };

  // Get follow-up type icon
  const getFollowUpTypeIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <PhoneIcon />;
      case 'email':
        return <EmailIcon />;
      case 'meeting':
        return <MeetingIcon />;
      case 'sms':
        return <SmsIcon />;
      case 'whatsapp':
        return <WhatsAppIcon />;
      case 'visit':
        return <HomeIcon />;
      default:
        return <ScheduleIcon />;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          background: (theme as any).CARD,
          border: `1px solid ${(theme as any).BORDER}`
        }
      }}
    >
      <DialogTitle>
        <Typography variant="h6" style={{ color: (theme as any).ACCENT, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ScheduleIcon />
          {followUp ? `Edit Follow-up - ${followUp.follow_up_type}` : 'Add New Follow-up'}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <FormContainer theme={theme}>
          <form onSubmit={handleSubmit}>
            {/* Follow-up Details */}
            <SectionTitle>
              <ScheduleIcon />
              Follow-up Details
              {followUp && (
                <span style={{ 
                  marginLeft: 'auto', 
                  fontSize: '0.7rem', 
                  color: (theme as any).ACCENT,
                  fontWeight: '600',
                  padding: '0.25rem 0.5rem',
                  border: `1px solid ${(theme as any).ACCENT}`,
                  borderRadius: '12px',
                  background: `${(theme as any).ACCENT}10`
                }}>
                  Editing Existing
                </span>
              )}
            </SectionTitle>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!errors.follow_up_type}>
                  <InputLabel>Follow-up Type</InputLabel>
                  <Select
                    value={formData.follow_up_type}
                    label="Follow-up Type"
                    onChange={(e) => handleFieldChange('follow_up_type', e.target.value)}
                    startAdornment={getFollowUpTypeIcon(formData.follow_up_type)}
                  >
                    <MenuItem value="call">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <PhoneIcon />
                        Phone Call
                      </div>
                    </MenuItem>
                    <MenuItem value="email">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <EmailIcon />
                        Email
                      </div>
                    </MenuItem>
                    <MenuItem value="meeting">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MeetingIcon />
                        Meeting
                      </div>
                    </MenuItem>
                    <MenuItem value="sms">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <SmsIcon />
                        SMS
                      </div>
                    </MenuItem>
                    <MenuItem value="whatsapp">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <WhatsAppIcon />
                        WhatsApp
                      </div>
                    </MenuItem>
                    <MenuItem value="visit">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <HomeIcon />
                        Visit
                      </div>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Follow-up Date & Time"
                  type="datetime-local"
                  value={formData.follow_up_date}
                  onChange={(e) => handleFieldChange('follow_up_date', e.target.value)}
                  error={!!errors.follow_up_date}
                  helperText={errors.follow_up_date}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Subject"
                  value={formData.subject}
                  onChange={(e) => handleFieldChange('subject', e.target.value)}
                  error={!!errors.subject}
                  helperText={errors.subject}
                  placeholder="Brief subject for the follow-up"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Message"
                  multiline
                  rows={3}
                  value={formData.message}
                  onChange={(e) => handleFieldChange('message', e.target.value)}
                  placeholder="Detailed message or talking points for the follow-up"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  placeholder="Internal notes or reminders"
                />
              </Grid>
            </Grid>
          </form>
        </FormContainer>
      </DialogContent>
      
      <DialogActions>
        <ActionButton
          variant="outlined"
          onClick={handleCancel}
          disabled={loading}
          startIcon={<CancelIcon />}
        >
          Cancel
        </ActionButton>
        <ActionButton
          type="submit"
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          sx={{
            background: (theme as any).ACCENT,
            '&:hover': {
              background: (theme as any).ACCENT_DARK || (theme as any).ACCENT,
            }
          }}
        >
          {loading ? 'Saving...' : (followUp ? 'Update Follow-up' : 'Create Follow-up')}
        </ActionButton>
      </DialogActions>
    </Dialog>
  );
};

export default FollowUpForm;
