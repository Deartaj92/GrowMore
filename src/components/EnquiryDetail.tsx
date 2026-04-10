import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { useNavigate, useParams } from 'react-router-dom';
import { ThemeContext } from '../contexts/ThemeContext';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Home as HomeIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  AttachFile as AttachFileIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import { enquiryService } from '../services/enquiryService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';
import { Enquiry, EnquiryFollowUp, EnquiryAttachment, EnquiryStatus } from '../types/enquiry';
import { formatAppDate, formatAppDateTime } from '../utils/dateUtils';
import FollowUpForm from './FollowUpForm';
import Loader from './Loader';
import {
  Button,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';

// ===== STYLED COMPONENTS =====

const PageContainer = styled.div`
  width: 100%;
  padding: 1rem;
  padding-bottom: 2rem; /* Extra padding at bottom to prevent clipping */
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
    padding: 0.75rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.5rem;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    padding: 0.75rem;
    text-align: center;
  }
  
  @media (max-width: 480px) {
    padding: 0.5rem;
    margin-bottom: 1rem;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  @media (max-width: 480px) {
    gap: 0.25rem;
  }
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    gap: 0.5rem;
  }
  
  @media (max-width: 480px) {
    flex-direction: column;
    width: 100%;
    gap: 0.5rem;
  }
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
    gap: 0.25rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.1rem;
    flex-direction: column;
    gap: 0.25rem;
    text-align: center;
  }
`;

const BackButton = styled(IconButton)`
  color: ${({ theme }) => theme.ACCENT};
`;

const ActionButton = styled(Button)`
  border-radius: 12px;
  text-transform: none;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  
  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
  
  @media (max-width: 480px) {
    width: 100%;
    padding: 0.75rem 1rem;
  }
`;

// Content Grid
const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
  
  @media (max-width: 768px) {
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  @media (max-width: 480px) {
    gap: 1rem;
    margin-bottom: 1rem;
  }
`;

const Card = styled(Paper)`
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.75rem;
  }
`;

const CardTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0 0 1rem 0;
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

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  
  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.9rem;
`;

const InfoValue = styled.span`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
`;

const StatusBadge = styled.span<{ $color: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ $color }) => $color}20;
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => $color}40;
`;

const PriorityBadge = styled.span<{ $priority: string }>`
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  
  ${({ $priority }) => {
    switch ($priority) {
      case 'urgent':
        return 'background: #fee2e2; color: #991b1b; border: 1px solid #fecaca;';
      case 'high':
        return 'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;';
      case 'medium':
        return 'background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe;';
      case 'low':
        return 'background: #f3f4f6; color: #374151; border: 1px solid #d1d5db;';
      default:
        return 'background: #f3f4f6; color: #374151; border: 1px solid #d1d5db;';
    }
  }}
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const ErrorContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #ef4444;
  background: #fef2f2;
  border-radius: 8px;
  margin: 1rem 0;
`;

// ===== MAIN COMPONENT =====

const EnquiryDetail: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [followUps, setFollowUps] = useState<EnquiryFollowUp[]>([]);
  const [attachments, setAttachments] = useState<EnquiryAttachment[]>([]);
  const [enquiryStatuses, setEnquiryStatuses] = useState<EnquiryStatus[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [followUpFormOpen, setFollowUpFormOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<EnquiryFollowUp | null>(null);

  // Check if user has school_id
  if (!user?.school_id) {
    return (
      <PageContainer theme={theme}>
        <ErrorContainer>
          No school context found. Please contact your administrator.
        </ErrorContainer>
      </PageContainer>
    );
  }

  // Load enquiry details
  const loadEnquiryDetails = async () => {
    if (!id || !user?.school_id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [enquiryData, followUpsData, attachmentsData, statusesData] = await Promise.all([
        enquiryService.getEnquiryById(user.school_id, parseInt(id)),
        enquiryService.getEnquiryFollowUps(user.school_id, parseInt(id)),
        enquiryService.getEnquiryAttachments(user.school_id, parseInt(id)),
        enquiryService.getEnquiryStatuses()
      ]);
      
      setEnquiry(enquiryData);
      setFollowUps(followUpsData);
      setAttachments(attachmentsData);
      setEnquiryStatuses(statusesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load enquiry details');
      showToast('Failed to load enquiry details: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadEnquiryDetails();
  }, [id, user?.school_id]);

  // Handle delete enquiry
  const handleDeleteEnquiry = async () => {
    if (!enquiry || !user?.school_id) return;
    
    setDeleting(true);
    try {
      await enquiryService.deleteEnquiry(user.school_id, enquiry.id);
      showToast('Enquiry deleted successfully!', 'success');
      navigate('/enquiries');
    } catch (err: any) {
      showToast('Failed to delete enquiry: ' + err.message, 'error');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Handle add follow-up
  const handleAddFollowUp = () => {
    setSelectedFollowUp(null);
    setFollowUpFormOpen(true);
  };

  // Handle edit follow-up
  const handleEditFollowUp = (followUp: EnquiryFollowUp) => {
    setSelectedFollowUp(followUp);
    setFollowUpFormOpen(true);
  };

  // Handle follow-up form success
  const handleFollowUpSuccess = () => {
    loadEnquiryDetails(); // Reload data
  };

  if (loading) {
    return (
      <PageContainer theme={theme}>
        <LoadingContainer>
          <CircularProgress style={{ marginRight: '1rem' }} />
          Loading enquiry details...
        </LoadingContainer>
      </PageContainer>
    );
  }

  if (error || !enquiry) {
    return (
      <PageContainer theme={theme}>
        <ErrorContainer>
          <WarningIcon style={{ marginRight: '0.5rem' }} />
          {error || 'Enquiry not found'}
        </ErrorContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer theme={theme}>
      {/* Header */}
      <Header>
        <HeaderLeft>
          <BackButton onClick={() => navigate('/enquiries')}>
            <ArrowBackIcon />
          </BackButton>
          <div>
            <Title>
              <AssignmentIcon style={{ color: (theme as any).ACCENT }} />
              Enquiry #{enquiry.id}
            </Title>
            <Typography variant="body2" style={{ color: (theme as any).TEXT_SECONDARY }}>
              {enquiry.enquiry_type?.name} • Submitted on {formatAppDate(enquiry.enquiry_date)}
            </Typography>
          </div>
        </HeaderLeft>
        <HeaderRight>
          <ActionButton
            variant="outlined"
            onClick={() => navigate(`/enquiries/${enquiry.id}/edit`)}
            startIcon={<EditIcon />}
          >
            Edit
          </ActionButton>
          <ActionButton
            variant="outlined"
            color="error"
            onClick={() => setDeleteDialogOpen(true)}
            startIcon={<DeleteIcon />}
          >
            Delete
          </ActionButton>
        </HeaderRight>
      </Header>

      {/* Content Grid */}
      <ContentGrid>
        {/* Main Content */}
        <div>
          {/* Basic Information */}
          <Card style={{ marginBottom: '1.5rem' }}>
            <CardTitle>
              <PersonIcon />
              Contact Information
            </CardTitle>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <InfoRow>
                  <InfoLabel>Name</InfoLabel>
                  <InfoValue>{enquiry.name}</InfoValue>
                </InfoRow>
              </Grid>
              <Grid item xs={12} md={6}>
                <InfoRow>
                  <InfoLabel>Email</InfoLabel>
                  <InfoValue>{enquiry.email || 'Not provided'}</InfoValue>
                </InfoRow>
              </Grid>
              <Grid item xs={12} md={6}>
                <InfoRow>
                  <InfoLabel>Phone</InfoLabel>
                  <InfoValue>{enquiry.phone || 'Not provided'}</InfoValue>
                </InfoRow>
              </Grid>
              <Grid item xs={12} md={6}>
                <InfoRow>
                  <InfoLabel>Source</InfoLabel>
                  <InfoValue>{enquiry.source}</InfoValue>
                </InfoRow>
              </Grid>
              {enquiry.address && (
                <Grid item xs={12}>
                  <InfoRow>
                    <InfoLabel>Address</InfoLabel>
                    <InfoValue>{enquiry.address}</InfoValue>
                  </InfoRow>
                </Grid>
              )}
            </Grid>
          </Card>

          {/* Enquiry Details */}
          <Card style={{ marginBottom: '1.5rem' }}>
            <CardTitle>
              <AssignmentIcon />
              Enquiry Details
            </CardTitle>
            
            <InfoRow>
              <InfoLabel>Subject</InfoLabel>
              <InfoValue>{enquiry.subject}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Message</InfoLabel>
              <InfoValue style={{ whiteSpace: 'pre-wrap' }}>{enquiry.message}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Priority</InfoLabel>
              <InfoValue>
                <PriorityBadge $priority={enquiry.priority}>
                  {enquiry.priority}
                </PriorityBadge>
              </InfoValue>
            </InfoRow>
          </Card>

          {/* Admission Details */}
          {enquiry.admission_details && (
            <Card style={{ marginBottom: '1.5rem' }}>
              <CardTitle>
                <SchoolIcon />
                Admission Details
              </CardTitle>
              
              <Grid container spacing={2}>
                {Object.entries(enquiry.admission_details).map(([key, value]) => (
                  value && (
                    <Grid item xs={12} md={6} key={key}>
                      <InfoRow>
                        <InfoLabel>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</InfoLabel>
                        <InfoValue>{String(value)}</InfoValue>
                      </InfoRow>
                    </Grid>
                  )
                ))}
              </Grid>
            </Card>
          )}

          {/* Job Details */}
          {enquiry.job_details && (
            <Card style={{ marginBottom: '1.5rem' }}>
              <CardTitle>
                <WorkIcon />
                Job Application Details
              </CardTitle>
              
              <Grid container spacing={2}>
                {Object.entries(enquiry.job_details).map(([key, value]) => (
                  value && (
                    <Grid item xs={12} md={6} key={key}>
                      <InfoRow>
                        <InfoLabel>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</InfoLabel>
                        <InfoValue>{String(value)}</InfoValue>
                      </InfoRow>
                    </Grid>
                  )
                ))}
              </Grid>
            </Card>
          )}

          {/* Follow-ups */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <CardTitle style={{ margin: 0 }}>
                <ScheduleIcon />
                Follow-ups ({followUps.length})
              </CardTitle>
              <Button
                variant="contained"
                size="small"
                onClick={handleAddFollowUp}
                startIcon={<AddIcon />}
                sx={{
                  background: (theme as any).ACCENT,
                  '&:hover': {
                    background: (theme as any).ACCENT_DARK || (theme as any).ACCENT,
                  }
                }}
              >
                Add Follow-up
              </Button>
            </div>
            
            {followUps.length > 0 ? (
              <List>
                {followUps.map((followUp) => (
                  <ListItem key={followUp.id} divider>
                    <ListItemIcon>
                      {followUp.status === 'completed' ? (
                        <CheckCircleIcon style={{ color: '#22c55e' }} />
                      ) : followUp.status === 'cancelled' ? (
                        <CancelIcon style={{ color: '#ef4444' }} />
                      ) : (
                        <ScheduleIcon style={{ color: '#f59e0b' }} />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{followUp.follow_up_type}</span>
                          <Chip
                            label={followUp.status}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.65rem' }}
                          />
                        </div>
                      }
                      secondary={
                        <div>
                          <div>{followUp.subject}</div>
                          <div style={{ fontSize: '0.75rem', color: (theme as any).TEXT_SECONDARY }}>
                            Due: {formatAppDateTime(followUp.follow_up_date)}
                          </div>
                          {followUp.notes && (
                            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                              {followUp.notes}
                            </div>
                          )}
                        </div>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Edit Follow-up">
                        <IconButton 
                          size="small"
                          onClick={() => handleEditFollowUp(followUp)}
                          sx={{ color: (theme as any).ACCENT }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box style={{ textAlign: 'center', padding: '2rem', color: (theme as any).TEXT_SECONDARY }}>
                No follow-ups scheduled
              </Box>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div>
          {/* Status and Assignment */}
          <Card style={{ marginBottom: '1.5rem' }}>
            <CardTitle>
              <AssignmentIcon />
              Status & Assignment
            </CardTitle>
            
            <InfoRow>
              <InfoLabel>Current Status</InfoLabel>
              <InfoValue>
                <StatusBadge $color={enquiry.status?.color || '#6b7280'}>
                  {enquiry.status?.name || 'Unknown'}
                </StatusBadge>
              </InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Assigned To</InfoLabel>
              <InfoValue>{enquiry.assigned_user?.name || 'Unassigned'}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Created By</InfoLabel>
              <InfoValue>System</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Created Date</InfoLabel>
              <InfoValue>{formatAppDateTime(enquiry.created_at || enquiry.enquiry_date)}</InfoValue>
            </InfoRow>
            {enquiry.first_contact_date && (
              <InfoRow>
                <InfoLabel>First Contact</InfoLabel>
                <InfoValue>{formatAppDateTime(enquiry.first_contact_date)}</InfoValue>
              </InfoRow>
            )}
            {enquiry.last_contact_date && (
              <InfoRow>
                <InfoLabel>Last Contact</InfoLabel>
                <InfoValue>{formatAppDateTime(enquiry.last_contact_date)}</InfoValue>
              </InfoRow>
            )}
            {enquiry.resolved_date && (
              <InfoRow>
                <InfoLabel>Resolved Date</InfoLabel>
                <InfoValue>{formatAppDateTime(enquiry.resolved_date)}</InfoValue>
              </InfoRow>
            )}
          </Card>

          {/* Attachments */}
          <Card>
            <CardTitle>
              <AttachFileIcon />
              Attachments ({attachments.length})
            </CardTitle>
            
            {attachments.length > 0 ? (
              <List>
                {attachments.map((attachment) => (
                  <ListItem key={attachment.id} divider>
                    <ListItemIcon>
                      <AttachFileIcon style={{ color: (theme as any).TEXT_SECONDARY }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={attachment.file_name}
                      secondary={
                        <div>
                          <div>{attachment.description}</div>
                          <div style={{ fontSize: '0.75rem', color: (theme as any).TEXT_SECONDARY }}>
                            {attachment.file_size ? `${(attachment.file_size / 1024 / 1024).toFixed(2)} MB` : ''} • 
                            Uploaded on {formatAppDate(attachment.uploaded_at || '')}
                          </div>
                        </div>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Download">
                        <IconButton size="small">
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box style={{ textAlign: 'center', padding: '2rem', color: (theme as any).TEXT_SECONDARY }}>
                No attachments
              </Box>
            )}
          </Card>
        </div>
      </ContentGrid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Enquiry</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this enquiry? This action cannot be undone and will permanently remove all associated data including follow-ups and attachments.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteEnquiry}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Follow-up Form */}
      {enquiry && (
        <FollowUpForm
          enquiryId={enquiry.id}
          open={followUpFormOpen}
          onClose={() => setFollowUpFormOpen(false)}
          onSuccess={handleFollowUpSuccess}
          followUp={selectedFollowUp || undefined}
        />
      )}
    </PageContainer>
  );
};

export default EnquiryDetail;
