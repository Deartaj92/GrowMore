import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { supabase } from '../supabaseClient';
import {
  Feedback as FeedbackIcon,
  Lightbulb as LightbulbIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle,
  Cancel,
  Pending,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import Loader from '../components/Loader';
import { format } from 'date-fns';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Tabs,
  Tab,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

// Helper function to check if theme is dark
const isDark = (themeObj: any) => themeObj.BG === '#252525';

// ===== STYLED COMPONENTS =====

const PageContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: ${({ theme }) => theme.BG};
  padding: 0.5rem;
  padding-bottom: 2rem; /* Extra padding at bottom to prevent clipping */
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
  position: relative;
  
  @media (max-width: 768px) {
    padding: 0.375rem;
    padding-bottom: 2rem;
    gap: 0.2rem;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  margin-bottom: 0.25rem;
  
  @media (max-width: 768px) {
    padding: 0.5rem;
    margin-bottom: 0.2rem;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
`;

const HeaderTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    flex-shrink: 0;
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${({ theme }) => theme.ACCENT};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    padding: 0.4rem 0.75rem;
    font-size: 0.85rem;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.4rem;
  }
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  border-radius: 12px;
  padding: 1rem;
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  
  @media (max-width: 768px) {
    padding: 0.75rem;
  }
`;

const StatLabel = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-bottom: 0.5rem;
  font-weight: 500;
  
  @media (max-width: 768px) {
    font-size: 0.75rem;
    margin-bottom: 0.4rem;
  }
`;

const StatValue = styled.div`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const TabsContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  margin-bottom: 0.25rem;
`;

const FiltersContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  padding: 1rem;
  margin-bottom: 0.25rem;
  
  @media (max-width: 768px) {
    padding: 0.75rem;
  }
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
`;

const FilterRow = styled.div`
  display: flex;
  gap: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const TableContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  flex: 1;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 1000px;
`;

const TableHeader = styled.thead`
  background: ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'};
`;

const TableHeaderCell = styled.th`
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 768px) {
    padding: 0.75rem 0.5rem;
    font-size: 0.85rem;
  }
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr<{ $isExpanded?: boolean }>`
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  transition: background-color 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)'};
  }
`;

const TableCell = styled.td`
  padding: 1rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  
  @media (max-width: 768px) {
    padding: 0.75rem 0.5rem;
    font-size: 0.85rem;
  }
`;

const StatusBadge = styled(Chip)<{ $status: string }>`
  font-weight: 500;
  font-size: 0.8rem;
  height: 24px;
  
  ${({ $status, theme }) => {
    if ($status === 'reviewed') {
      return `
        background: ${theme.ACCENT}20;
        color: ${theme.ACCENT};
      `;
    } else {
      return `
        background: #f59e0b20;
        color: #f59e0b;
      `;
    }
  }}
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  
  ${({ $variant, theme }) => {
    if ($variant === 'primary') {
      return `
        background: ${theme.ACCENT};
        color: white;
        &:hover {
          opacity: 0.9;
        }
      `;
    } else {
      return `
        background: transparent;
        color: ${theme.TEXT_SECONDARY};
        border: 1px solid ${theme.BORDER};
        &:hover {
          background: ${theme.BORDER};
        }
      `;
    }
  }}
`;

const PaginationContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)'};
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
  }
`;

const PaginationInfo = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.9rem;
  
  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
    justify-content: center;
  }
`;

const PaginationButton = styled.button<{ $disabled?: boolean }>`
  padding: 0.4rem 0.8rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 6px;
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ $disabled }) => $disabled ? 0.5 : 1};
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.BORDER};
  }
`;

const PageInput = styled.input`
  width: 60px;
  padding: 0.4rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 6px;
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  text-align: center;
`;

// ===== INTERFACES =====

interface Complaint {
  id: number;
  school_id: number;
  submitted_by: 'student' | 'parent' | 'staff';
  submitted_by_id: number | null;
  submitted_by_name: string;
  subject: string;
  complaint_text: string;
  status: 'in_review' | 'reviewed';
  assigned_to: number | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Suggestion {
  id: number;
  school_id: number;
  submitted_by: 'student' | 'parent' | 'staff';
  submitted_by_id: number | null;
  submitted_by_name: string;
  subject: string;
  suggestion_text: string;
  status: 'in_review' | 'reviewed';
  assigned_to: number | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ===== MAIN COMPONENT =====

const ComplaintsSuggestionsPage: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  // Get activeTab from route state (for navigation from notifications)
  const initialTab = (location.state as any)?.activeTab ?? 0;
  const [activeTab, setActiveTab] = useState(initialTab); // 0 = Complaints, 1 = Suggestions
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Complaints state
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [complaintSearchQuery, setComplaintSearchQuery] = useState('');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<string>('all');
  const [complaintDateFrom, setComplaintDateFrom] = useState('');
  const [complaintDateTo, setComplaintDateTo] = useState('');
  const [complaintCurrentPage, setComplaintCurrentPage] = useState(1);
  const complaintItemsPerPage = 50;
  
  // Suggestions state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionSearchQuery, setSuggestionSearchQuery] = useState('');
  const [suggestionStatusFilter, setSuggestionStatusFilter] = useState<string>('all');
  const [suggestionDateFrom, setSuggestionDateFrom] = useState('');
  const [suggestionDateTo, setSuggestionDateTo] = useState('');
  const [suggestionCurrentPage, setSuggestionCurrentPage] = useState(1);
  const suggestionItemsPerPage = 50;
  
  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Complaint | Suggestion | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Helper functions
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'N/A';
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
    } catch {
      return 'N/A';
    }
  };

  // Data fetching functions
  const fetchComplaints = async () => {
    if (!user?.school_id) return;
    
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (error: any) {
      console.error('Error fetching complaints:', error);
      showToast('Failed to fetch complaints', 'error');
    }
  };

  const fetchSuggestions = async () => {
    if (!user?.school_id) return;
    
    try {
      const { data, error } = await supabase
        .from('suggestions')
        .select('*')
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error: any) {
      console.error('Error fetching suggestions:', error);
      showToast('Failed to fetch suggestions', 'error');
    }
  };

  // Fetch both complaints and suggestions on initial load
  const fetchAllData = async () => {
    if (!user?.school_id) return;
    
    setIsLoadingData(true);
    try {
      await Promise.all([fetchComplaints(), fetchSuggestions()]);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Filtered data
  const filteredComplaints = useMemo(() => {
    let filtered = [...complaints];

    // Search filter
    if (complaintSearchQuery.trim()) {
      const query = complaintSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.subject.toLowerCase().includes(query) ||
          c.submitted_by_name.toLowerCase().includes(query) ||
          c.complaint_text.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (complaintStatusFilter !== 'all') {
      filtered = filtered.filter((c) => c.status === complaintStatusFilter);
    }

    // Date filter
    if (complaintDateFrom) {
      filtered = filtered.filter(
        (c) => new Date(c.created_at) >= new Date(complaintDateFrom)
      );
    }
    if (complaintDateTo) {
      filtered = filtered.filter(
        (c) => new Date(c.created_at) <= new Date(complaintDateTo + 'T23:59:59')
      );
    }

    return filtered;
  }, [complaints, complaintSearchQuery, complaintStatusFilter, complaintDateFrom, complaintDateTo]);

  const filteredSuggestions = useMemo(() => {
    let filtered = [...suggestions];

    // Search filter
    if (suggestionSearchQuery.trim()) {
      const query = suggestionSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.subject.toLowerCase().includes(query) ||
          s.submitted_by_name.toLowerCase().includes(query) ||
          s.suggestion_text.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (suggestionStatusFilter !== 'all') {
      filtered = filtered.filter((s) => s.status === suggestionStatusFilter);
    }

    // Date filter
    if (suggestionDateFrom) {
      filtered = filtered.filter(
        (s) => new Date(s.created_at) >= new Date(suggestionDateFrom)
      );
    }
    if (suggestionDateTo) {
      filtered = filtered.filter(
        (s) => new Date(s.created_at) <= new Date(suggestionDateTo + 'T23:59:59')
      );
    }

    return filtered;
  }, [suggestions, suggestionSearchQuery, suggestionStatusFilter, suggestionDateFrom, suggestionDateTo]);

  // Pagination
  const paginatedComplaints = useMemo(() => {
    const start = (complaintCurrentPage - 1) * complaintItemsPerPage;
    const end = start + complaintItemsPerPage;
    return filteredComplaints.slice(start, end);
  }, [filteredComplaints, complaintCurrentPage, complaintItemsPerPage]);

  const paginatedSuggestions = useMemo(() => {
    const start = (suggestionCurrentPage - 1) * suggestionItemsPerPage;
    const end = start + suggestionItemsPerPage;
    return filteredSuggestions.slice(start, end);
  }, [filteredSuggestions, suggestionCurrentPage, suggestionItemsPerPage]);

  const totalComplaintPages = Math.ceil(filteredComplaints.length / complaintItemsPerPage);
  const totalSuggestionPages = Math.ceil(filteredSuggestions.length / suggestionItemsPerPage);

  // Calculate counts for badges (in_review items) - memoized for performance
  const inReviewComplaintsCount = useMemo(() => {
    return complaints.filter(c => c.status === 'in_review').length;
  }, [complaints]);

  const inReviewSuggestionsCount = useMemo(() => {
    return suggestions.filter(s => s.status === 'in_review').length;
  }, [suggestions]);

  // Update activeTab when route state changes (for navigation from notifications)
  useEffect(() => {
    if (location.state && (location.state as any).activeTab !== undefined) {
      setActiveTab((location.state as any).activeTab);
    }
  }, [location.state]);

  // Fetch both complaints and suggestions on initial load
  useEffect(() => {
    if (user?.school_id) {
      fetchAllData();
    }
  }, [user?.school_id]);

  // Refetch current tab data when switching tabs (in case data changed)
  useEffect(() => {
    if (user?.school_id && !isLoadingData) {
      if (activeTab === 0) {
        fetchComplaints();
      } else {
        fetchSuggestions();
      }
    }
  }, [activeTab]);

  if (isLoadingData) {
    return <Loader />;
  }

  return (
    <PageContainer theme={theme}>
      <Header theme={theme}>
        <HeaderTitle theme={theme}>
          {activeTab === 0 ? <FeedbackIcon /> : <LightbulbIcon />}
          {activeTab === 0 ? 'Complaints Management' : 'Suggestions Management'}
        </HeaderTitle>
        <HeaderActions>
          <RefreshButton
            theme={theme}
            onClick={() => {
              fetchAllData();
            }}
          >
            <RefreshIcon style={{ fontSize: '1rem' }} />
            Refresh
          </RefreshButton>
        </HeaderActions>
      </Header>

      {/* Tabs */}
      <TabsContainer theme={theme}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              '& .MuiTab-root': {
                color: theme.TEXT_SECONDARY,
                '&.Mui-selected': {
                  color: theme.ACCENT,
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: theme.ACCENT,
              },
            }}
          >
            <Tab
              icon={<FeedbackIcon />}
              iconPosition="start"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Complaints
                  {inReviewComplaintsCount > 0 && (
                    <Chip
                      label={inReviewComplaintsCount}
                      size="small"
                      sx={{
                        height: '20px',
                        minWidth: '20px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: '#ef4444',
                        color: 'white',
                      }}
                    />
                  )}
                </Box>
              }
              sx={{ textTransform: 'none', fontSize: '0.95rem', fontWeight: 500 }}
            />
            <Tab
              icon={<LightbulbIcon />}
              iconPosition="start"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Suggestions
                  {inReviewSuggestionsCount > 0 && (
                    <Chip
                      label={inReviewSuggestionsCount}
                      size="small"
                      sx={{
                        height: '20px',
                        minWidth: '20px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: '#f59e0b',
                        color: 'white',
                      }}
                    />
                  )}
                </Box>
              }
              sx={{ textTransform: 'none', fontSize: '0.95rem', fontWeight: 500 }}
            />
          </Tabs>
        </Box>
      </TabsContainer>

      {/* Summary Cards */}
      {activeTab === 0 ? (
        <StatsGrid>
          <StatCard theme={theme}>
            <StatLabel theme={theme}>Total Complaints</StatLabel>
            <StatValue theme={theme}>{complaints.length}</StatValue>
          </StatCard>
          <StatCard theme={theme}>
            <StatLabel theme={theme}>In Review</StatLabel>
            <StatValue theme={theme}>
              {complaints.filter(c => c.status === 'in_review').length}
            </StatValue>
          </StatCard>
          <StatCard theme={theme}>
            <StatLabel theme={theme}>Reviewed</StatLabel>
            <StatValue theme={theme}>
              {complaints.filter(c => c.status === 'reviewed').length}
            </StatValue>
          </StatCard>
        </StatsGrid>
      ) : (
        <StatsGrid>
          <StatCard theme={theme}>
            <StatLabel theme={theme}>Total Suggestions</StatLabel>
            <StatValue theme={theme}>{suggestions.length}</StatValue>
          </StatCard>
          <StatCard theme={theme}>
            <StatLabel theme={theme}>In Review</StatLabel>
            <StatValue theme={theme}>
              {suggestions.filter(s => s.status === 'in_review').length}
            </StatValue>
          </StatCard>
          <StatCard theme={theme}>
            <StatLabel theme={theme}>Reviewed</StatLabel>
            <StatValue theme={theme}>
              {suggestions.filter(s => s.status === 'reviewed').length}
            </StatValue>
          </StatCard>
        </StatsGrid>
      )}

      {/* Filters */}
      <FiltersContainer theme={theme}>
        {activeTab === 0 ? (
          <FiltersGrid>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by subject, submitter name..."
              value={complaintSearchQuery}
              onChange={(e) => {
                setComplaintSearchQuery(e.target.value);
                setComplaintCurrentPage(1);
              }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: theme.TEXT_SECONDARY, mr: 1, fontSize: '1.2rem' }} />,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: theme.TEXT_PRIMARY,
                  '& fieldset': { borderColor: theme.BORDER },
                  '&:hover fieldset': { borderColor: theme.ACCENT },
                  '&.Mui-focused fieldset': { borderColor: theme.ACCENT },
                },
              }}
            />
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: theme.TEXT_SECONDARY }}>Status</InputLabel>
              <Select
                value={complaintStatusFilter}
                onChange={(e) => {
                  setComplaintStatusFilter(e.target.value);
                  setComplaintCurrentPage(1);
                }}
                label="Status"
                sx={{
                  color: theme.TEXT_PRIMARY,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.BORDER },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.ACCENT },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.ACCENT },
                }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="in_review">In Review</MenuItem>
                <MenuItem value="reviewed">Reviewed</MenuItem>
              </Select>
            </FormControl>
            <FilterRow>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Date From"
                value={complaintDateFrom}
                onChange={(e) => {
                  setComplaintDateFrom(e.target.value);
                  setComplaintCurrentPage(1);
                }}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: theme.TEXT_PRIMARY,
                    '& fieldset': { borderColor: theme.BORDER },
                    '&:hover fieldset': { borderColor: theme.ACCENT },
                    '&.Mui-focused fieldset': { borderColor: theme.ACCENT },
                  },
                  '& .MuiInputLabel-root': { color: theme.TEXT_SECONDARY },
                }}
              />
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Date To"
                value={complaintDateTo}
                onChange={(e) => {
                  setComplaintDateTo(e.target.value);
                  setComplaintCurrentPage(1);
                }}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: theme.TEXT_PRIMARY,
                    '& fieldset': { borderColor: theme.BORDER },
                    '&:hover fieldset': { borderColor: theme.ACCENT },
                    '&.Mui-focused fieldset': { borderColor: theme.ACCENT },
                  },
                  '& .MuiInputLabel-root': { color: theme.TEXT_SECONDARY },
                }}
              />
            </FilterRow>
          </FiltersGrid>
        ) : (
          <FiltersGrid>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by subject, submitter name..."
              value={suggestionSearchQuery}
              onChange={(e) => {
                setSuggestionSearchQuery(e.target.value);
                setSuggestionCurrentPage(1);
              }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: theme.TEXT_SECONDARY, mr: 1, fontSize: '1.2rem' }} />,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: theme.TEXT_PRIMARY,
                  '& fieldset': { borderColor: theme.BORDER },
                  '&:hover fieldset': { borderColor: theme.ACCENT },
                  '&.Mui-focused fieldset': { borderColor: theme.ACCENT },
                },
              }}
            />
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: theme.TEXT_SECONDARY }}>Status</InputLabel>
              <Select
                value={suggestionStatusFilter}
                onChange={(e) => {
                  setSuggestionStatusFilter(e.target.value);
                  setSuggestionCurrentPage(1);
                }}
                label="Status"
                sx={{
                  color: theme.TEXT_PRIMARY,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.BORDER },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.ACCENT },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.ACCENT },
                }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="in_review">In Review</MenuItem>
                <MenuItem value="reviewed">Reviewed</MenuItem>
              </Select>
            </FormControl>
            <FilterRow>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Date From"
                value={suggestionDateFrom}
                onChange={(e) => {
                  setSuggestionDateFrom(e.target.value);
                  setSuggestionCurrentPage(1);
                }}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: theme.TEXT_PRIMARY,
                    '& fieldset': { borderColor: theme.BORDER },
                    '&:hover fieldset': { borderColor: theme.ACCENT },
                    '&.Mui-focused fieldset': { borderColor: theme.ACCENT },
                  },
                  '& .MuiInputLabel-root': { color: theme.TEXT_SECONDARY },
                }}
              />
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Date To"
                value={suggestionDateTo}
                onChange={(e) => {
                  setSuggestionDateTo(e.target.value);
                  setSuggestionCurrentPage(1);
                }}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: theme.TEXT_PRIMARY,
                    '& fieldset': { borderColor: theme.BORDER },
                    '&:hover fieldset': { borderColor: theme.ACCENT },
                    '&.Mui-focused fieldset': { borderColor: theme.ACCENT },
                  },
                  '& .MuiInputLabel-root': { color: theme.TEXT_SECONDARY },
                }}
              />
            </FilterRow>
          </FiltersGrid>
        )}
      </FiltersContainer>

      {/* Table */}
      <TableContainer theme={theme}>
        <TableWrapper>
          <Table>
            <TableHeader>
              <tr>
                <TableHeaderCell theme={theme}>ID</TableHeaderCell>
                <TableHeaderCell theme={theme}>Subject</TableHeaderCell>
                <TableHeaderCell theme={theme}>Submitted By</TableHeaderCell>
                <TableHeaderCell theme={theme}>Type</TableHeaderCell>
                <TableHeaderCell theme={theme}>Status</TableHeaderCell>
                <TableHeaderCell theme={theme}>Created At</TableHeaderCell>
                <TableHeaderCell theme={theme}>Actions</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {activeTab === 0 ? (
                paginatedComplaints.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} theme={theme} style={{ textAlign: 'center', padding: '2rem' }}>
                      No complaints found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedComplaints.map((complaint) => (
                    <TableRow key={complaint.id}>
                      <TableCell theme={theme}>#{complaint.id}</TableCell>
                      <TableCell theme={theme}>
                        <div style={{ fontWeight: 500 }}>{complaint.subject}</div>
                        <div style={{ fontSize: '0.8rem', color: theme.TEXT_SECONDARY, marginTop: '0.25rem' }}>
                          {complaint.complaint_text.substring(0, 100)}
                          {complaint.complaint_text.length > 100 ? '...' : ''}
                        </div>
                      </TableCell>
                      <TableCell theme={theme}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <PersonIcon style={{ fontSize: '1rem', color: theme.TEXT_SECONDARY }} />
                          {complaint.submitted_by_name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: theme.TEXT_SECONDARY, marginTop: '0.25rem' }}>
                          {complaint.submitted_by}
                        </div>
                      </TableCell>
                      <TableCell theme={theme}>
                        <Chip
                          label="Complaint"
                          size="small"
                          sx={{
                            background: '#ef444420',
                            color: '#ef4444',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                          }}
                        />
                      </TableCell>
                      <TableCell theme={theme}>
                        <StatusBadge
                          $status={complaint.status}
                          label={complaint.status === 'reviewed' ? 'Reviewed' : 'In Review'}
                          icon={
                            complaint.status === 'reviewed' ? (
                              <CheckCircle style={{ fontSize: '0.9rem' }} />
                            ) : (
                              <Pending style={{ fontSize: '0.9rem' }} />
                            )
                          }
                        />
                      </TableCell>
                      <TableCell theme={theme}>
                        <div>{formatDate(complaint.created_at)}</div>
                        <div style={{ fontSize: '0.8rem', color: theme.TEXT_SECONDARY, marginTop: '0.25rem' }}>
                          {format(new Date(complaint.created_at), 'hh:mm a')}
                        </div>
                      </TableCell>
                      <TableCell theme={theme}>
                        <ActionButton
                          $variant="primary"
                          theme={theme}
                          onClick={() => {
                            setSelectedItem(complaint);
                            setReviewNotes(complaint.review_notes || '');
                            setReviewModalOpen(true);
                          }}
                        >
                          <ViewIcon style={{ fontSize: '1rem' }} />
                          {complaint.status === 'reviewed' ? 'View' : 'Review'}
                        </ActionButton>
                      </TableCell>
                    </TableRow>
                  ))
                )
              ) : (
                paginatedSuggestions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} theme={theme} style={{ textAlign: 'center', padding: '2rem' }}>
                      No suggestions found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSuggestions.map((suggestion) => (
                    <TableRow key={suggestion.id}>
                      <TableCell theme={theme}>#{suggestion.id}</TableCell>
                      <TableCell theme={theme}>
                        <div style={{ fontWeight: 500 }}>{suggestion.subject}</div>
                        <div style={{ fontSize: '0.8rem', color: theme.TEXT_SECONDARY, marginTop: '0.25rem' }}>
                          {suggestion.suggestion_text.substring(0, 100)}
                          {suggestion.suggestion_text.length > 100 ? '...' : ''}
                        </div>
                      </TableCell>
                      <TableCell theme={theme}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <PersonIcon style={{ fontSize: '1rem', color: theme.TEXT_SECONDARY }} />
                          {suggestion.submitted_by_name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: theme.TEXT_SECONDARY, marginTop: '0.25rem' }}>
                          {suggestion.submitted_by}
                        </div>
                      </TableCell>
                      <TableCell theme={theme}>
                        <Chip
                          label="Suggestion"
                          size="small"
                          sx={{
                            background: '#f59e0b20',
                            color: '#f59e0b',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                          }}
                        />
                      </TableCell>
                      <TableCell theme={theme}>
                        <StatusBadge
                          $status={suggestion.status}
                          label={suggestion.status === 'reviewed' ? 'Reviewed' : 'In Review'}
                          icon={
                            suggestion.status === 'reviewed' ? (
                              <CheckCircle style={{ fontSize: '0.9rem' }} />
                            ) : (
                              <Pending style={{ fontSize: '0.9rem' }} />
                            )
                          }
                        />
                      </TableCell>
                      <TableCell theme={theme}>
                        <div>{formatDate(suggestion.created_at)}</div>
                        <div style={{ fontSize: '0.8rem', color: theme.TEXT_SECONDARY, marginTop: '0.25rem' }}>
                          {format(new Date(suggestion.created_at), 'hh:mm a')}
                        </div>
                      </TableCell>
                      <TableCell theme={theme}>
                        <ActionButton
                          $variant="primary"
                          theme={theme}
                          onClick={() => {
                            setSelectedItem(suggestion);
                            setReviewNotes(suggestion.review_notes || '');
                            setReviewModalOpen(true);
                          }}
                        >
                          <ViewIcon style={{ fontSize: '1rem' }} />
                          {suggestion.status === 'reviewed' ? 'View' : 'Review'}
                        </ActionButton>
                      </TableCell>
                    </TableRow>
                  ))
                )
              )}
            </TableBody>
          </Table>
        </TableWrapper>

        {/* Pagination */}
        <PaginationContainer theme={theme}>
          <PaginationInfo theme={theme}>
            Showing{' '}
            {activeTab === 0
              ? `${(complaintCurrentPage - 1) * complaintItemsPerPage + 1}-${Math.min(
                  complaintCurrentPage * complaintItemsPerPage,
                  filteredComplaints.length
                )}`
              : `${(suggestionCurrentPage - 1) * suggestionItemsPerPage + 1}-${Math.min(
                  suggestionCurrentPage * suggestionItemsPerPage,
                  filteredSuggestions.length
                )}`}{' '}
            of {activeTab === 0 ? filteredComplaints.length : filteredSuggestions.length}
          </PaginationInfo>
          <PaginationControls>
            <PaginationButton
              theme={theme}
              $disabled={activeTab === 0 ? complaintCurrentPage === 1 : suggestionCurrentPage === 1}
              onClick={() => {
                if (activeTab === 0) {
                  setComplaintCurrentPage(1);
                } else {
                  setSuggestionCurrentPage(1);
                }
              }}
            >
              First
            </PaginationButton>
            <PaginationButton
              theme={theme}
              $disabled={activeTab === 0 ? complaintCurrentPage === 1 : suggestionCurrentPage === 1}
              onClick={() => {
                if (activeTab === 0) {
                  setComplaintCurrentPage((prev) => Math.max(1, prev - 1));
                } else {
                  setSuggestionCurrentPage((prev) => Math.max(1, prev - 1));
                }
              }}
            >
              Previous
            </PaginationButton>
            <span style={{ color: theme.TEXT_SECONDARY, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Page
              <PageInput
                theme={theme}
                type="number"
                min="1"
                max={activeTab === 0 ? totalComplaintPages : totalSuggestionPages}
                value={activeTab === 0 ? complaintCurrentPage : suggestionCurrentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value) || 1;
                  const maxPage = activeTab === 0 ? totalComplaintPages : totalSuggestionPages;
                  const validPage = Math.max(1, Math.min(page, maxPage));
                  if (activeTab === 0) {
                    setComplaintCurrentPage(validPage);
                  } else {
                    setSuggestionCurrentPage(validPage);
                  }
                }}
              />
              of {activeTab === 0 ? totalComplaintPages : totalSuggestionPages}
            </span>
            <PaginationButton
              theme={theme}
              $disabled={
                activeTab === 0
                  ? complaintCurrentPage === totalComplaintPages
                  : suggestionCurrentPage === totalSuggestionPages
              }
              onClick={() => {
                if (activeTab === 0) {
                  setComplaintCurrentPage((prev) => Math.min(totalComplaintPages, prev + 1));
                } else {
                  setSuggestionCurrentPage((prev) => Math.min(totalSuggestionPages, prev + 1));
                }
              }}
            >
              Next
            </PaginationButton>
            <PaginationButton
              theme={theme}
              $disabled={
                activeTab === 0
                  ? complaintCurrentPage === totalComplaintPages
                  : suggestionCurrentPage === totalSuggestionPages
              }
              onClick={() => {
                if (activeTab === 0) {
                  setComplaintCurrentPage(totalComplaintPages);
                } else {
                  setSuggestionCurrentPage(totalSuggestionPages);
                }
              }}
            >
              Last
            </PaginationButton>
          </PaginationControls>
        </PaginationContainer>
      </TableContainer>

      {/* Review Modal */}
      <Dialog
        open={reviewModalOpen}
        onClose={() => !isSubmittingReview && setReviewModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            background: theme.CARD,
            border: `1px solid ${theme.BORDER}`,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: theme.TEXT_PRIMARY,
            borderBottom: `1px solid ${theme.BORDER}`,
            pb: 2,
            fontWeight: 600,
          }}
        >
          {selectedItem && (activeTab === 0 ? 'Review Complaint' : 'Review Suggestion')}
          <Button
            onClick={() => setReviewModalOpen(false)}
            disabled={isSubmittingReview}
            sx={{ color: theme.TEXT_SECONDARY, minWidth: 'auto' }}
          >
            ×
          </Button>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedItem && (
            <Box display="flex" flexDirection="column" gap={2}>
              <Box>
                <Box sx={{ fontSize: '0.85rem', color: theme.TEXT_SECONDARY, mb: 0.5 }}>
                  Subject
                </Box>
                <Box sx={{ fontSize: '1rem', color: theme.TEXT_PRIMARY, fontWeight: 500 }}>
                  {activeTab === 0
                    ? (selectedItem as Complaint).subject
                    : (selectedItem as Suggestion).subject}
                </Box>
              </Box>

              <Box>
                <Box sx={{ fontSize: '0.85rem', color: theme.TEXT_SECONDARY, mb: 0.5 }}>
                  Submitted By
                </Box>
                <Box sx={{ fontSize: '1rem', color: theme.TEXT_PRIMARY }}>
                  {activeTab === 0
                    ? (selectedItem as Complaint).submitted_by_name
                    : (selectedItem as Suggestion).submitted_by_name}{' '}
                  ({activeTab === 0
                    ? (selectedItem as Complaint).submitted_by
                    : (selectedItem as Suggestion).submitted_by})
                </Box>
              </Box>

              <Box>
                <Box sx={{ fontSize: '0.85rem', color: theme.TEXT_SECONDARY, mb: 0.5 }}>
                  {activeTab === 0 ? 'Complaint Details' : 'Suggestion Details'}
                </Box>
                <Box
                  sx={{
                    fontSize: '0.95rem',
                    color: theme.TEXT_PRIMARY,
                    padding: '1rem',
                    background: isDark(theme) ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                    borderRadius: '8px',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                >
                  {activeTab === 0
                    ? (selectedItem as Complaint).complaint_text
                    : (selectedItem as Suggestion).suggestion_text}
                </Box>
              </Box>

              <Box>
                <Box sx={{ fontSize: '0.85rem', color: theme.TEXT_SECONDARY, mb: 0.5 }}>
                  Status
                </Box>
                <StatusBadge
                  $status={activeTab === 0
                    ? (selectedItem as Complaint).status
                    : (selectedItem as Suggestion).status}
                  label={
                    activeTab === 0
                      ? (selectedItem as Complaint).status === 'reviewed'
                        ? 'Reviewed'
                        : 'In Review'
                      : (selectedItem as Suggestion).status === 'reviewed'
                      ? 'Reviewed'
                      : 'In Review'
                  }
                  icon={
                    activeTab === 0
                      ? (selectedItem as Complaint).status === 'reviewed' ? (
                          <CheckCircle style={{ fontSize: '0.9rem' }} />
                        ) : (
                          <Pending style={{ fontSize: '0.9rem' }} />
                        )
                      : (selectedItem as Suggestion).status === 'reviewed' ? (
                          <CheckCircle style={{ fontSize: '0.9rem' }} />
                        ) : (
                          <Pending style={{ fontSize: '0.9rem' }} />
                        )
                  }
                />
              </Box>

              {(activeTab === 0
                ? (selectedItem as Complaint).status === 'reviewed'
                : (selectedItem as Suggestion).status === 'reviewed') && (
                <Box>
                  <Box sx={{ fontSize: '0.85rem', color: theme.TEXT_SECONDARY, mb: 0.5 }}>
                    {activeTab === 0 ? 'Resolution Notes' : 'Review Notes'}
                  </Box>
                  <Box
                    sx={{
                      fontSize: '0.95rem',
                      color: theme.TEXT_PRIMARY,
                      padding: '1rem',
                      background: isDark(theme) ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                      borderRadius: '8px',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {activeTab === 0
                      ? (selectedItem as Complaint).review_notes || 'No notes provided'
                      : (selectedItem as Suggestion).review_notes || 'No notes provided'}
                  </Box>
                </Box>
              )}

              {(activeTab === 0
                ? (selectedItem as Complaint).status === 'in_review'
                : (selectedItem as Suggestion).status === 'in_review') && (
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label={activeTab === 0 ? 'Resolution Notes' : 'Review Notes'}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder={`Enter ${activeTab === 0 ? 'resolution' : 'review'} notes...`}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: theme.TEXT_PRIMARY,
                        '& fieldset': { borderColor: theme.BORDER },
                        '&:hover fieldset': { borderColor: theme.ACCENT },
                        '&.Mui-focused fieldset': { borderColor: theme.ACCENT },
                      },
                      '& .MuiInputLabel-root': { color: theme.TEXT_SECONDARY },
                    }}
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            borderTop: `1px solid ${theme.BORDER}`,
            pt: 2,
          }}
        >
          <Button
            onClick={() => setReviewModalOpen(false)}
            disabled={isSubmittingReview}
            sx={{ color: theme.TEXT_SECONDARY }}
          >
            {selectedItem &&
            (activeTab === 0
              ? (selectedItem as Complaint).status === 'reviewed'
              : (selectedItem as Suggestion).status === 'reviewed')
              ? 'Close'
              : 'Cancel'}
          </Button>
          {selectedItem &&
            (activeTab === 0
              ? (selectedItem as Complaint).status === 'in_review'
              : (selectedItem as Suggestion).status === 'in_review') && (
              <Button
                onClick={async () => {
                  if (!selectedItem || !user?.school_id || !user?.id) {
                    showToast('Missing required information', 'error');
                    return;
                  }

                  setIsSubmittingReview(true);
                  try {
                    const updateData: any = {
                      status: 'reviewed',
                      reviewed_by: user.id,
                      reviewed_at: new Date().toISOString(),
                      review_notes: reviewNotes.trim() || null,
                    };

                    const tableName = activeTab === 0 ? 'complaints' : 'suggestions';
                    const { error } = await supabase
                      .from(tableName)
                      .update(updateData)
                      .eq('id', selectedItem.id);

                    if (error) throw error;

                    // Create notification for the submitter
                    try {
                      const item = selectedItem as Complaint | Suggestion;
                      const notificationData: any = {
                        school_id: user.school_id,
                        notification_type: activeTab === 0 ? 'complaint' : 'suggestion',
                        title: activeTab === 0 ? 'Complaint Reviewed' : 'Suggestion Reviewed',
                        message: `Your ${activeTab === 0 ? 'complaint' : 'suggestion'} "${item.subject}" has been reviewed.${reviewNotes.trim() ? `\n\nNote: ${reviewNotes.trim()}` : ''}`,
                        is_read: false,
                        is_important: false,
                        created_at: new Date().toISOString(),
                      };

                      if (item.submitted_by === 'student') {
                        notificationData.recipient_id = item.submitted_by_id;
                      } else if (item.submitted_by === 'parent') {
                        notificationData.family_recipient_id = item.submitted_by_id;
                      } else if (item.submitted_by === 'staff' && item.submitted_by_id) {
                        // Find the user account linked to this staff_id
                        const { data: userData } = await supabase
                          .from('users')
                          .select('id')
                          .eq('staff_id', item.submitted_by_id)
                          .eq('school_id', user.school_id)
                          .maybeSingle();

                        if (userData) {
                          notificationData.recipient_id = userData.id;
                        }
                      }

                      if (notificationData.recipient_id || notificationData.family_recipient_id) {
                        const { error: insertError } = await supabase.from('notifications').insert(notificationData);
                        if (insertError) {
                          console.error('Error inserting notification:', insertError);
                        }
                      }
                    } catch (notificationError) {
                      console.error('Error creating notification:', notificationError);
                      // Don't fail the review if notification fails
                    }

                    showToast(
                      `${activeTab === 0 ? 'Complaint' : 'Suggestion'} reviewed successfully!`,
                      'success'
                    );

                    setReviewModalOpen(false);
                    setSelectedItem(null);
                    setReviewNotes('');

                    // Refresh data
                    if (activeTab === 0) {
                      await fetchComplaints();
                    } else {
                      await fetchSuggestions();
                    }
                  } catch (error: any) {
                    console.error('Error submitting review:', error);
                    showToast('Failed to submit review: ' + (error.message || 'Unknown error'), 'error');
                  } finally {
                    setIsSubmittingReview(false);
                  }
                }}
                variant="contained"
                disabled={isSubmittingReview}
                sx={{
                  background: theme.ACCENT,
                  '&:hover': {
                    background: theme.ACCENT,
                    opacity: 0.9,
                  },
                }}
              >
                {isSubmittingReview ? 'Submitting...' : 'Mark as Reviewed'}
              </Button>
            )}
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default ComplaintsSuggestionsPage;

