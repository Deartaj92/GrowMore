import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../contexts/ThemeContext';
import {
  QuestionAnswer as QuestionAnswerIcon,
  People as PeopleIcon,
  Work as WorkIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  Assignment as AssignmentIcon,
  AttachFile as AttachFileIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { enquiryService } from '../services/enquiryService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';
import { EnquiryDashboardData, Enquiry, EnquiryFollowUp } from '../types/enquiry';
import { CircularProgress, Button, TextField, FormControl, InputLabel, Select, MenuItem, Chip, Avatar, IconButton, Tooltip } from '@mui/material';

// ===== STYLED COMPONENTS =====

const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 24px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  height: 100%;
  min-height: 100%;
  padding-bottom: 2rem; /* Extra padding at bottom to prevent clipping */
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
  max-width: 100vw;
  position: relative;
  
  @media (max-width: 768px) {
    padding: 16px;
  }
  
  @media (max-width: 480px) {
    padding: 12px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    text-align: center;
  }
  
  @media (max-width: 480px) {
    padding: 0.75rem;
    margin-bottom: 1rem;
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
    gap: 0.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.25rem;
    flex-direction: column;
    gap: 0.25rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0.5rem 0 0 0;
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
    margin: 0.25rem 0 0 0;
  }
  
  @media (max-width: 480px) {
    font-size: 0.8rem;
    text-align: center;
  }
`;

const HeaderActions = styled.div`
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

// Stats Grid
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  }
  
  @media (max-width: 768px) {
    padding: 1rem;
    gap: 0.75rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.75rem;
    gap: 0.5rem;
    flex-direction: column;
    text-align: center;
  }
`;

const StatIcon = styled.div<{ $color: string }>`
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: ${({ $color }) => $color}15;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $color }) => $color};
  font-size: 1.75rem;
`;

const StatContent = styled.div`
  flex: 1;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-bottom: 0.25rem;
`;

const StatChange = styled.div<{ $positive?: boolean }>`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ $positive }) => $positive ? '#22c55e' : '#ef4444'};
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  @media (max-width: 480px) {
    font-size: 0.7rem;
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
`;

const Card = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

const CardTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

// Tables
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background: ${({ theme }) => theme.FIELD_BG};
`;

const TableRow = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: ${({ theme }) => theme.HOVER_BG};
  }
`;

const TableHeaderCell = styled.th`
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  border-right: 1px solid ${({ theme }) => theme.BORDER};
  
  &:last-child {
    border-right: none;
  }
`;

const TableCell = styled.td`
  padding: 1rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-right: 1px solid ${({ theme }) => theme.BORDER};
  
  &:last-child {
    border-right: none;
  }
`;

// Status Badge
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

// Priority Badge
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

// Loading and Error States
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
  border-radius: 12px;
  margin: 1rem 0;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-align: center;
`;

// Responsive CSS
const ResponsiveStyles = styled.div`
  /* Prevent horizontal scrolling */
  overflow-x: hidden;
  max-width: 100vw;
  
  .desktop-table {
    display: block;
  }
  
  .mobile-cards {
    display: none;
  }
  
  @media (max-width: 768px) {
    .desktop-table {
      display: none !important;
    }
    
    .mobile-cards {
      display: block !important;
    }
    
    /* Ensure no horizontal overflow on mobile */
    table {
      display: none !important;
    }
  }
  
  @media (max-width: 480px) {
    .desktop-table {
      display: none !important;
    }
    
    .mobile-cards {
      display: block !important;
    }
    
    /* Ensure no horizontal overflow on small mobile */
    table {
      display: none !important;
    }
  }
`;

// ===== MAIN COMPONENT =====

const EnquiryDashboard: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<EnquiryDashboardData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Check if user has school_id
  if (!user?.school_id) {
    return (
      <PageContainer theme={theme}>
        <ErrorContainer>
          <WarningIcon style={{ marginRight: '0.5rem' }} />
          No school context found. Please contact your administrator.
        </ErrorContainer>
      </PageContainer>
    );
  }

  // Load dashboard data
  const loadDashboardData = async () => {
    if (!user?.school_id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await enquiryService.getDashboardData(user.school_id);
      setDashboardData(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to load enquiry dashboard data');
      showToast('Failed to load enquiry dashboard: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, [user?.school_id]);

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value % 1 === 0) {
      return String(value);
    }
    return value.toFixed(2);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Format datetime
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle refresh
  const handleRefresh = () => {
    loadDashboardData();
  };

  // Handle view enquiry
  const handleViewEnquiry = (enquiryId: number) => {
    navigate(`/enquiries/${enquiryId}`);
  };

  // Handle create enquiry
  const handleCreateEnquiry = () => {
    navigate('/enquiries/create');
  };

  if (loading) {
    return (
      <PageContainer theme={theme}>
        <LoadingContainer>
          <CircularProgress style={{ marginRight: '1rem' }} />
          Loading enquiry dashboard...
        </LoadingContainer>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer theme={theme}>
        <ErrorContainer>
          <WarningIcon style={{ marginRight: '0.5rem' }} />
          {error}
        </ErrorContainer>
      </PageContainer>
    );
  }

  if (!dashboardData) {
    return (
      <PageContainer theme={theme}>
        <EmptyState>
          <QuestionAnswerIcon style={{ fontSize: '4rem', marginBottom: '1rem', color: (theme as any).TEXT_SECONDARY }} />
          No enquiry data available
        </EmptyState>
      </PageContainer>
    );
  }

  return (
    <ResponsiveStyles>
      <PageContainer theme={theme}>
      {/* Header */}
      <Header>
        <div>
          <Title>
            <QuestionAnswerIcon style={{ color: (theme as any).ACCENT }} />
            Enquiry Management
          </Title>
          <Subtitle>
            Comprehensive enquiry tracking, follow-up management, and admission/job vacancy processing
          </Subtitle>
        </div>
        <HeaderActions>
          <ActionButton
            variant="outlined"
            onClick={handleRefresh}
            startIcon={<RefreshIcon />}
            disabled={loading}
          >
            Refresh
          </ActionButton>
          <ActionButton
            variant="contained"
            onClick={handleCreateEnquiry}
            startIcon={<AddIcon />}
            sx={{
              background: (theme as any).ACCENT,
              '&:hover': {
                background: (theme as any).ACCENT_DARK || (theme as any).ACCENT,
              }
            }}
          >
            New Enquiry
          </ActionButton>
        </HeaderActions>
      </Header>

      {/* Stats Grid */}
      <StatsGrid>
        <StatCard>
          <StatIcon $color="#3b82f6">
            <QuestionAnswerIcon />
          </StatIcon>
          <StatContent>
            <StatValue>{dashboardData.stats.total_enquiries}</StatValue>
            <StatLabel>Total Enquiries</StatLabel>
            <StatChange $positive={true}>
              <TrendingUpIcon style={{ fontSize: '1rem' }} />
              {dashboardData.stats.new_enquiries} new this month
            </StatChange>
          </StatContent>
        </StatCard>

        <StatCard>
          <StatIcon $color="#f59e0b">
            <PendingIcon />
          </StatIcon>
          <StatContent>
            <StatValue>{dashboardData.stats.new_enquiries}</StatValue>
            <StatLabel>New Enquiries</StatLabel>
            <StatChange $positive={false}>
              <ScheduleIcon style={{ fontSize: '1rem' }} />
              Requires attention
            </StatChange>
          </StatContent>
        </StatCard>

        <StatCard>
          <StatIcon $color="#22c55e">
            <CheckCircleIcon />
          </StatIcon>
          <StatContent>
            <StatValue>{dashboardData.stats.resolved_enquiries}</StatValue>
            <StatLabel>Resolved</StatLabel>
            <StatChange $positive={true}>
              <CheckCircleIcon style={{ fontSize: '1rem' }} />
              {dashboardData.stats.total_enquiries > 0 ? 
                Math.round((dashboardData.stats.resolved_enquiries / dashboardData.stats.total_enquiries) * 100) : 0}% resolution rate
            </StatChange>
          </StatContent>
        </StatCard>

        <StatCard>
          <StatIcon $color="#ef4444">
            <WarningIcon />
          </StatIcon>
          <StatContent>
            <StatValue>{dashboardData.stats.overdue_follow_ups}</StatValue>
            <StatLabel>Overdue Follow-ups</StatLabel>
            <StatChange $positive={false}>
              <WarningIcon style={{ fontSize: '1rem' }} />
              Immediate action required
            </StatChange>
          </StatContent>
        </StatCard>
      </StatsGrid>

      {/* Content Grid */}
      <ContentGrid>
        {/* Recent Enquiries */}
        <Card>
          <CardHeader>
            <CardTitle>
              <QuestionAnswerIcon style={{ color: (theme as any).ACCENT }} />
              Recent Enquiries
            </CardTitle>
            <CardActions>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/enquiries')}
                startIcon={<VisibilityIcon />}
              >
                View All
              </Button>
            </CardActions>
          </CardHeader>
          
          {dashboardData.recent_enquiries.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div style={{ display: 'block' }} className="desktop-table">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Type</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Priority</TableHeaderCell>
                    <TableHeaderCell>Date</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <tbody>
                  {dashboardData.recent_enquiries.map((enquiry: any) => (
                    <TableRow key={enquiry.id}>
                      <TableCell>
                        <div style={{ fontWeight: '600' }}>{enquiry.name}</div>
                        <div style={{ fontSize: '0.75rem', color: (theme as any).TEXT_SECONDARY }}>
                          {enquiry.email || enquiry.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={enquiry.enquiry_types?.name || 'Unknown'}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <StatusBadge $color={enquiry.enquiry_statuses?.color || '#6b7280'}>
                          {enquiry.enquiry_statuses?.name || 'Unknown'}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <PriorityBadge $priority={enquiry.priority}>
                          {enquiry.priority}
                        </PriorityBadge>
                      </TableCell>
                      <TableCell>
                        {formatDate(enquiry.enquiry_date)}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewEnquiry(enquiry.id)}
                            sx={{ color: (theme as any).ACCENT }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div style={{ display: 'none' }} className="mobile-cards">
              {dashboardData.recent_enquiries.map((enquiry: any) => (
                <div
                  key={enquiry.id}
                  style={{
                    padding: '1rem',
                    border: `1px solid ${(theme as any).BORDER}`,
                    borderRadius: '12px',
                    marginBottom: '1rem',
                    background: (theme as any).CARD,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: (theme as any).TEXT_PRIMARY, fontSize: '1rem' }}>
                        {enquiry.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: (theme as any).TEXT_SECONDARY, marginTop: '0.25rem' }}>
                        {enquiry.email || enquiry.phone}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <StatusBadge $color={enquiry.enquiry_statuses?.color || '#6b7280'}>
                        {enquiry.enquiry_statuses?.name || 'Unknown'}
                      </StatusBadge>
                      <PriorityBadge $priority={enquiry.priority}>
                        {enquiry.priority}
                      </PriorityBadge>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Chip
                        label={enquiry.enquiry_types?.name || 'Unknown'}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    </div>
                    <div style={{ fontSize: '0.8rem', color: (theme as any).TEXT_SECONDARY }}>
                      {formatDate(enquiry.enquiry_date)}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: `1px solid ${(theme as any).BORDER}` }}>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleViewEnquiry(enquiry.id)}
                        sx={{ color: (theme as any).ACCENT }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
            </>
          ) : (
            <EmptyState>
              <QuestionAnswerIcon style={{ fontSize: '2rem', marginBottom: '0.5rem', color: (theme as any).TEXT_SECONDARY }} />
              No recent enquiries found
            </EmptyState>
          )}
        </Card>

        {/* Pending Follow-ups */}
        <Card>
          <CardHeader>
            <CardTitle>
              <ScheduleIcon style={{ color: (theme as any).ACCENT }} />
              Pending Follow-ups
            </CardTitle>
            <CardActions>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/enquiries/follow-ups')}
                startIcon={<VisibilityIcon />}
              >
                View All
              </Button>
            </CardActions>
          </CardHeader>
          
          {dashboardData.pending_follow_ups.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {dashboardData.pending_follow_ups.slice(0, 5).map((followUp: any) => (
                <div
                  key={followUp.id}
                  style={{
                    padding: '0.75rem',
                    border: `1px solid ${(theme as any).BORDER}`,
                    borderRadius: '8px',
                    background: (theme as any).FIELD_BG
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start', 
                    marginBottom: '0.5rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div style={{ 
                      fontWeight: '600', 
                      color: (theme as any).TEXT_PRIMARY,
                      fontSize: '0.9rem',
                      flex: 1,
                      minWidth: '150px'
                    }}>
                      {followUp.enquiries?.name}
                    </div>
                    <Chip
                      label={followUp.follow_up_type}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.65rem' }}
                    />
                  </div>
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: (theme as any).TEXT_SECONDARY, 
                    marginBottom: '0.25rem',
                    wordBreak: 'break-word'
                  }}>
                    {followUp.enquiries?.subject}
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: (theme as any).TEXT_SECONDARY,
                    wordBreak: 'break-word'
                  }}>
                    Due: {formatDateTime(followUp.follow_up_date)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>
              <ScheduleIcon style={{ fontSize: '2rem', marginBottom: '0.5rem', color: (theme as any).TEXT_SECONDARY }} />
              No pending follow-ups
            </EmptyState>
          )}
        </Card>
      </ContentGrid>

      {/* Charts Grid */}
      <ContentGrid>
        {/* Enquiries by Type */}
        <Card>
          <CardHeader>
            <CardTitle>
              <AssessmentIcon style={{ color: (theme as any).ACCENT }} />
              Enquiries by Type
            </CardTitle>
          </CardHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {dashboardData.stats.enquiries_by_type.map((type, index) => (
              <div key={index}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: (theme as any).TEXT_PRIMARY }}>
                    {type.type_name}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: (theme as any).TEXT_SECONDARY }}>
                    {type.count}
                  </span>
                </div>
                <div style={{ 
                  width: '100%', 
                  height: '8px', 
                  background: (theme as any).FIELD_BG, 
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${Math.min((type.count / Math.max(...dashboardData.stats.enquiries_by_type.map(t => t.count))) * 100, 100)}%`,
                    height: '100%',
                    background: ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444'][index % 5],
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Enquiries by Status */}
        <Card>
          <CardHeader>
            <CardTitle>
              <AssessmentIcon style={{ color: (theme as any).ACCENT }} />
              Enquiries by Status
            </CardTitle>
          </CardHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {dashboardData.stats.enquiries_by_status.map((status, index) => (
              <div key={index}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: status.color
                    }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: (theme as any).TEXT_PRIMARY }}>
                      {status.status_name}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: (theme as any).TEXT_SECONDARY }}>
                    {status.count}
                  </span>
                </div>
                <div style={{ 
                  width: '100%', 
                  height: '8px', 
                  background: (theme as any).FIELD_BG, 
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${Math.min((status.count / Math.max(...dashboardData.stats.enquiries_by_status.map(s => s.count))) * 100, 100)}%`,
                    height: '100%',
                    background: status.color,
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </ContentGrid>

      {/* Last Updated */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '2rem', 
        padding: '1rem', 
        color: (theme as any).TEXT_SECONDARY,
        fontSize: '0.8rem'
      }}>
        Last updated: {lastUpdated.toLocaleString()}
      </div>
      </PageContainer>
    </ResponsiveStyles>
  );
};

export default EnquiryDashboard;
