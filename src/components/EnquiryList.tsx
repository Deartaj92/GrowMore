import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../contexts/ThemeContext';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import { enquiryService } from '../services/enquiryService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';
import { Enquiry, EnquiryType, EnquiryStatus, EnquiryFilters } from '../types/enquiry';
import { formatAppDate, formatAppDateTime } from '../utils/dateUtils';
import Loader from './Loader';
import {
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Pagination,
  CircularProgress
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
  }
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  
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

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
  
  @media (max-width: 480px) {
    flex-direction: column;
    width: 100%;
    gap: 0.5rem;
  }
`;

const FiltersContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
  padding: 1rem;
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    padding: 0.75rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.5rem;
    gap: 0.5rem;
  }
`;

const TableCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid ${({ theme }) => theme.BORDER};
  overflow: hidden;
  
  @media (max-width: 768px) {
    border-radius: 8px;
  }
`;

// Mobile Card Component
const MobileCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 480px) {
    padding: 0.75rem;
    margin-bottom: 0.75rem;
  }
`;

const MobileCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
`;

const MobileCardTitle = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  
  @media (max-width: 480px) {
    font-size: 0.9rem;
  }
`;

const MobileCardSubtitle = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 0.25rem;
  
  @media (max-width: 480px) {
    font-size: 0.75rem;
  }
`;

const MobileCardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const MobileCardRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  
  @media (max-width: 480px) {
    font-size: 0.8rem;
  }
`;

const MobileCardLabel = styled.span`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const MobileCardValue = styled.span`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const MobileCardActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
`;

// Filter Controls Container
const FilterControlsContainer = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
    gap: 0.75rem;
  }
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

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
`;

const PaginationInfo = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
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

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-align: center;
`;

// ===== MAIN COMPONENT =====

const EnquiryList: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [enquiryTypes, setEnquiryTypes] = useState<EnquiryType[]>([]);
  const [enquiryStatuses, setEnquiryStatuses] = useState<EnquiryStatus[]>([]);
  const [filters, setFilters] = useState<EnquiryFilters>({});
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEnquiries, setTotalEnquiries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const itemsPerPage = 20;

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

  // Load enquiries
  const loadEnquiries = async (page: number = 1) => {
    if (!user?.school_id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const offset = (page - 1) * itemsPerPage;
      const { data, count } = await enquiryService.getEnquiries(
        user.school_id,
        { ...filters, search },
        itemsPerPage,
        offset
      );
      
      setEnquiries(data);
      setTotalEnquiries(count);
      setTotalPages(Math.ceil(count / itemsPerPage));
      setCurrentPage(page);
    } catch (err: any) {
      setError(err.message || 'Failed to load enquiries');
      showToast('Failed to load enquiries: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load enquiry types and statuses
  const loadEnquiryTypesAndStatuses = async () => {
    try {
      const [types, statuses] = await Promise.all([
        enquiryService.getEnquiryTypes(),
        enquiryService.getEnquiryStatuses()
      ]);
      
      setEnquiryTypes(types);
      setEnquiryStatuses(statuses);
    } catch (err: any) {
      showToast('Failed to load enquiry types and statuses: ' + err.message, 'error');
    }
  };

  // Load data on component mount and filter changes
  useEffect(() => {
    loadEnquiryTypesAndStatuses();
  }, []);

  useEffect(() => {
    loadEnquiries(1);
  }, [filters, search, user?.school_id]);

  // Handle search
  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  // Handle filter change
  const handleFilterChange = (key: keyof EnquiryFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    loadEnquiries(page);
  };

  // Handle menu open
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, enquiry: Enquiry) => {
    setAnchorEl(event.currentTarget);
    setSelectedEnquiry(enquiry);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedEnquiry(null);
  };

  // Handle view enquiry
  const handleViewEnquiry = (enquiryId: number) => {
    navigate(`/enquiries/${enquiryId}`);
    handleMenuClose();
  };

  // Handle edit enquiry
  const handleEditEnquiry = (enquiryId: number) => {
    navigate(`/enquiries/${enquiryId}/edit`);
    handleMenuClose();
  };

  // Handle delete enquiry
  const handleDeleteEnquiry = async () => {
    if (!selectedEnquiry || !user?.school_id) return;
    
    setDeleting(true);
    try {
      await enquiryService.deleteEnquiry(user.school_id, selectedEnquiry.id);
      showToast('Enquiry deleted successfully!', 'success');
      loadEnquiries(currentPage);
      setDeleteDialogOpen(false);
    } catch (err: any) {
      showToast('Failed to delete enquiry: ' + err.message, 'error');
    } finally {
      setDeleting(false);
      handleMenuClose();
    }
  };

  if (loading && enquiries.length === 0) {
    return <Loader />;
  }

  if (error) {
    return (
      <PageContainer theme={theme}>
        <ErrorContainer>
          {error}
        </ErrorContainer>
      </PageContainer>
    );
  }

  return (
    <ResponsiveStyles>
      <PageContainer theme={theme}>
      {/* Header */}
      <Header>
        <Title>
          <AssignmentIcon style={{ color: (theme as any).ACCENT }} />
          Enquiry Management
        </Title>
        <Controls>
          <Button
            variant="outlined"
            onClick={() => loadEnquiries(currentPage)}
            startIcon={<RefreshIcon />}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate('/enquiries/create')}
            startIcon={<AddIcon />}
            sx={{
              background: (theme as any).ACCENT,
              '&:hover': {
                background: (theme as any).ACCENT_DARK || (theme as any).ACCENT,
              }
            }}
          >
            New Enquiry
          </Button>
        </Controls>
      </Header>

      {/* Filters */}
      <FiltersContainer>
        <SearchContainer>
          <TextField
            size="small"
            placeholder="Search enquiries..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon style={{ color: (theme as any).TEXT_SECONDARY, marginRight: '0.5rem' }} />
            }}
            sx={{ 
              minWidth: 300,
              '@media (max-width: 768px)': {
                minWidth: '100%',
                width: '100%'
              }
            }}
          />
        </SearchContainer>
        
        <FilterControlsContainer>
          <FormControl size="small" sx={{ 
            minWidth: 150,
            '@media (max-width: 768px)': {
              minWidth: '100%',
              width: '100%'
            }
          }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={filters.enquiry_type_id || ''}
              label="Type"
              onChange={(e) => handleFilterChange('enquiry_type_id', e.target.value || undefined)}
            >
              <MenuItem value="">All Types</MenuItem>
              {enquiryTypes.map(type => (
                <MenuItem key={type.id} value={type.id}>
                  {type.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ 
            minWidth: 150,
            '@media (max-width: 768px)': {
              minWidth: '100%',
              width: '100%'
            }
          }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status_id || ''}
              label="Status"
              onChange={(e) => handleFilterChange('status_id', e.target.value || undefined)}
            >
              <MenuItem value="">All Statuses</MenuItem>
              {enquiryStatuses.map(status => (
                <MenuItem key={status.id} value={status.id}>
                  {status.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ 
            minWidth: 120,
            '@media (max-width: 768px)': {
              minWidth: '100%',
              width: '100%'
            }
          }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={filters.priority || ''}
              label="Priority"
              onChange={(e) => handleFilterChange('priority', e.target.value || undefined)}
            >
              <MenuItem value="">All Priorities</MenuItem>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ 
            minWidth: 120,
            '@media (max-width: 768px)': {
              minWidth: '100%',
              width: '100%'
            }
          }}>
            <InputLabel>Source</InputLabel>
            <Select
              value={filters.source || ''}
              label="Source"
              onChange={(e) => handleFilterChange('source', e.target.value || undefined)}
            >
              <MenuItem value="">All Sources</MenuItem>
              <MenuItem value="website">Website</MenuItem>
              <MenuItem value="phone">Phone</MenuItem>
              <MenuItem value="walk-in">Walk-in</MenuItem>
              <MenuItem value="referral">Referral</MenuItem>
              <MenuItem value="social-media">Social Media</MenuItem>
              <MenuItem value="advertisement">Advertisement</MenuItem>
            </Select>
          </FormControl>
        </FilterControlsContainer>
      </FiltersContainer>

      {/* Enquiries Table */}
      <TableCard>
        {enquiries.length > 0 ? (
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
                    <TableHeaderCell>Contact</TableHeaderCell>
                    <TableHeaderCell>Date</TableHeaderCell>
                    <TableHeaderCell>Follow-up</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <tbody>
                  {enquiries.map((enquiry) => (
                    <TableRow key={enquiry.id}>
                      <TableCell>
                        <div style={{ fontWeight: '600' }}>{enquiry.name}</div>
                        <div style={{ fontSize: '0.75rem', color: (theme as any).TEXT_SECONDARY }}>
                          {enquiry.subject}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={enquiry.enquiry_type?.name || 'Unknown'}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <StatusBadge $color={enquiry.status?.color || '#6b7280'}>
                          {enquiry.status?.name || 'Unknown'}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <PriorityBadge $priority={enquiry.priority}>
                          {enquiry.priority}
                        </PriorityBadge>
                      </TableCell>
                      <TableCell>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {enquiry.email && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                              <EmailIcon style={{ fontSize: '0.8rem', color: (theme as any).TEXT_SECONDARY }} />
                              {enquiry.email}
                            </div>
                          )}
                          {enquiry.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                              <PhoneIcon style={{ fontSize: '0.8rem', color: (theme as any).TEXT_SECONDARY }} />
                              {enquiry.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatAppDate(enquiry.enquiry_date)}
                      </TableCell>
                      <TableCell>
                        {enquiry.follow_up_date ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                            <ScheduleIcon style={{ fontSize: '0.8rem', color: (theme as any).TEXT_SECONDARY }} />
                            {formatAppDateTime(enquiry.follow_up_date)}
                          </div>
                        ) : (
                          <span style={{ color: (theme as any).TEXT_SECONDARY, fontSize: '0.8rem' }}>
                            No follow-up
                          </span>
                        )}
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
                        <Tooltip title="More Actions">
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, enquiry)}
                          >
                            <MoreIcon fontSize="small" />
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
              {enquiries.map((enquiry) => (
                <MobileCard key={enquiry.id} theme={theme}>
                  <MobileCardHeader>
                    <div>
                      <MobileCardTitle>{enquiry.name}</MobileCardTitle>
                      <MobileCardSubtitle>{enquiry.subject}</MobileCardSubtitle>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <StatusBadge $color={enquiry.status?.color || '#6b7280'}>
                        {enquiry.status?.name || 'Unknown'}
                      </StatusBadge>
                      <PriorityBadge $priority={enquiry.priority}>
                        {enquiry.priority}
                      </PriorityBadge>
                    </div>
                  </MobileCardHeader>
                  
                  <MobileCardContent>
                    <MobileCardRow>
                      <MobileCardLabel>Type:</MobileCardLabel>
                      <MobileCardValue>
                        <Chip
                          label={enquiry.enquiry_type?.name || 'Unknown'}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </MobileCardValue>
                    </MobileCardRow>
                    
                    {enquiry.email && (
                      <MobileCardRow>
                        <MobileCardLabel>Email:</MobileCardLabel>
                        <MobileCardValue style={{ fontSize: '0.8rem' }}>{enquiry.email}</MobileCardValue>
                      </MobileCardRow>
                    )}
                    
                    {enquiry.phone && (
                      <MobileCardRow>
                        <MobileCardLabel>Phone:</MobileCardLabel>
                        <MobileCardValue style={{ fontSize: '0.8rem' }}>{enquiry.phone}</MobileCardValue>
                      </MobileCardRow>
                    )}
                    
                    <MobileCardRow>
                      <MobileCardLabel>Date:</MobileCardLabel>
                      <MobileCardValue>{formatAppDate(enquiry.enquiry_date)}</MobileCardValue>
                    </MobileCardRow>
                    
                    {enquiry.follow_up_date && (
                      <MobileCardRow>
                        <MobileCardLabel>Follow-up:</MobileCardLabel>
                        <MobileCardValue style={{ fontSize: '0.8rem' }}>
                          {formatAppDateTime(enquiry.follow_up_date)}
                        </MobileCardValue>
                      </MobileCardRow>
                    )}
                  </MobileCardContent>
                  
                  <MobileCardActions>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleViewEnquiry(enquiry.id)}
                        sx={{ color: (theme as any).ACCENT }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="More Actions">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, enquiry)}
                      >
                        <MoreIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </MobileCardActions>
                </MobileCard>
              ))}
            </div>
            
            {/* Pagination */}
            <PaginationContainer>
              <PaginationInfo>
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalEnquiries)} of {totalEnquiries} enquiries
              </PaginationInfo>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
              />
            </PaginationContainer>
          </>
        ) : (
          <EmptyState>
            <AssignmentIcon style={{ fontSize: '4rem', marginBottom: '1rem', color: (theme as any).TEXT_SECONDARY }} />
            No enquiries found
          </EmptyState>
        )}
      </TableCard>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedEnquiry && handleViewEnquiry(selectedEnquiry.id)}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedEnquiry && handleEditEnquiry(selectedEnquiry.id)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Enquiry</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={() => setDeleteDialogOpen(true)}
          sx={{ color: '#ef4444' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" sx={{ color: '#ef4444' }} />
          </ListItemIcon>
          <ListItemText>Delete Enquiry</ListItemText>
        </MenuItem>
      </Menu>

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
      </PageContainer>
    </ResponsiveStyles>
  );
};

export default EnquiryList;
