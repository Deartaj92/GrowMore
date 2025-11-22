import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    CardActions,
    Chip,
    Divider,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    Typography,
    Dialog,
    IconButton,
    Avatar,
    Paper,
    DialogContent,
    DialogActions,
    styled,
    TextField,
    Collapse,
    Theme,
    Skeleton
} from '@mui/material';
import { 
    Add as AddIcon, 
    FilterList as FilterIcon, 
    Edit as EditIcon,
    Delete as DeleteIcon,
    Person as PersonIcon,
    Badge as BadgeIcon,
    School as SchoolIcon,
    History as HistoryIcon,
    ArrowForward as ArrowForwardIcon,
    KeyboardArrowDown as KeyboardArrowDownIcon,
    KeyboardArrowRight as KeyboardArrowRightIcon,
    Assignment,
    Timer,
    Search,
    CheckCircle,
    Cancel,
    Autorenew,
    AccessTime as TimeIcon,
    Warning as WarningIcon,
    Update as UpdateIcon
} from '@mui/icons-material';
import { alpha, Theme as MuiTheme, PaletteColor } from '@mui/material/styles';
import { css } from '@emotion/react';
import { reportService } from '../utils/reportService';
import { 
    ReportCategory, 
    ReportSeverity, 
    CreateReportDTO, 
    Report as ImportedReport,
    ReportStatus
} from '../types/reports';
import { useAuth } from '../contexts/AuthContext';
import { CreateReportForm } from '../components/reports/CreateReportForm';
import { ModifyReportModal } from '../components/reports/ModifyReportModal';
import { EditReportForm } from '../components/reports/EditReportForm';
import { EditUpdateForm } from '../components/reports/EditUpdateForm';
import { useToast } from '../components/useToast';
import NoStudentsFound from '../components/NoStudentsFound';
import { supabase } from '../supabaseClient';
import { useProgress } from '../components/Layout';
import { useActivityTracking } from '../hooks/useActivityTracking';

// Type definitions
interface Report extends Omit<ImportedReport, 'id' | 'category_id' | 'reported_by' | 'category'> {
    id: string;
    category_id: string;
    reported_by: string;
    incident_date?: string;
    action_taken?: string;
    category?: {
        id: string;
            name: string;
        };
}

// Utility functions
const statusColors: Record<string, string> = {
    'pending': '#ed6c02',    // Orange
    'in_review': '#2196f3',  // Blue
    'resolved': '#2e7d32',   // Green
    'dismissed': '#757575',  // Grey
    'in_progress': '#f59e42' // Orange
};

const formatStatus = (status: string | undefined) => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getSeverityColor = (severity: string) => {
    switch (severity) {
        case 'low': return '#4caf50';
        case 'medium': return '#ff9800';
        case 'high': return '#f44336';
        case 'urgent': return '#9c27b0';
        default: return '#757575';
    }
};

// Styled Components
const SEGMENTED_HEIGHT = '32px';

const PageContainer = styled(Box)`
  width: 100%;
  margin: 0;
  padding: 0 12px 6px 12px;
  box-sizing: border-box;
  background: ${({ theme }: { theme: any }) => theme.palette.mode === 'dark' ? '#252525' : '#f8fafc'};
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

const Header = styled(Box)`
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
  background: ${({ theme }: { theme: any }) => theme.palette.mode === 'dark' ? '#252525' : '#f8fafc'};
  box-shadow: 0 1px 6px rgba(0,0,0,0.1);
  border-radius: 10px;
  padding: 4px 8px 2px 8px;
  min-height: 36px;
`;

const HeaderFilters = styled(Box)`
  display: flex;
  gap: 6px;
  align-items: center;
  background: ${({ theme }: { theme: any }) => theme.palette.mode === 'dark' ? '#2a2a2a' : '#ffffff'};
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  padding: 6px 8px;
`;

const Title = styled(Typography)`
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 1px;
  color: ${({ theme }: { theme: any }) => theme.palette.primary.main};
  margin: 0;
`;

const MainContent = styled(Box)`
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  padding: 0 0 32px 0;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: y proximity;
  will-change: scroll-position;
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
  
  @media (max-width: 700px) {
    scroll-behavior: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }: { theme: any }) => theme.palette.mode === 'dark' ? '#555' : '#ccc'};
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }: { theme: any }) => theme.palette.mode === 'dark' ? '#777' : '#999'};
  }
`;

const Footer = styled(Box)`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 4px 0 6px 0;
  padding: 8px 12px;
  background: ${({ theme }: { theme: any }) => theme.palette.mode === 'dark' ? '#2a2a2a' : '#ffffff'};
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  min-height: 36px;
  
  @media (max-width: 900px) {
    flex-direction: column;
    gap: 4px;
    padding: 6px 8px;
    min-height: auto;
    border-radius: 8px;
  }
`;

const SegmentedGroup = styled('div')`
  display: flex;
  align-items: center;
  background: ${({ theme }: { theme: any }) => theme.palette.mode === 'dark' ? '#222' : '#f3f4f6'};
  border-radius: 11px;
  box-shadow: 1.4px 1.4px 4px rgba(0,0,0,0.1);
  overflow: hidden;
  @media (max-width: 700px) {
    width: 100%;
    justify-content: center;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    border-radius: 8px;
  }
`;

const SegmentedInput = styled('input')`
  font-family: inherit;
  font-size: 0.77em;
  font-weight: 400;
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  box-shadow: 1.4px 1.4px 4px rgba(0,0,0,0.1);
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  background: ${({ theme }: { theme: any }) => theme.palette.mode === 'dark' ? '#444' : '#f3f4f6'};
  color: ${({ theme }: { theme: any }) => theme.palette.mode === 'dark' ? '#C0C0C0' : '#444'};
  padding: 0 0.84em;
  min-width: 98px;
  border-right: 1px solid ${({ theme }: { theme: any }) => theme.palette.mode === 'dark' ? '#555' : '#e5e7eb'};
  border-top-left-radius: 11px;
  border-bottom-left-radius: 11px;
  @media (max-width: 700px) {
    width: 100%;
    border-radius: 8px !important;
    border-right: none;
    min-width: 0;
  }
`;

const SegmentedButton = styled('button')<{ active?: boolean; first?: boolean; last?: boolean }>`
  font-family: inherit;
  font-size: 0.77em;
  font-weight: 400;
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  box-shadow: 1.4px 1.4px 4px rgba(0,0,0,0.1);
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  background: ${({ active, theme }: { active?: boolean; theme: any }) => active ? theme.palette.primary.main : theme.palette.mode === 'dark' ? '#444' : '#f3f4f6'};
  color: ${({ active, theme }: { active?: boolean; theme: any }) => active ? '#fff' : theme.palette.mode === 'dark' ? '#C0C0C0' : '#444'};
  padding: 0 1.12em;
  display: flex;
  align-items: center;
  gap: 0.35em;
  border-radius: 0;
  ${({ first }: { first?: boolean }) => first && `
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  `}
  ${({ last }: { last?: boolean }) => last && `
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  cursor: pointer;
  @media (max-width: 700px) {
    width: 100%;
    border-radius: 8px !important;
    min-width: 0;
  }
`;

const SegmentedSelect = styled('select')<{ first?: boolean; last?: boolean }>`
  font-family: inherit;
  font-size: 0.77em;
  font-weight: 400;
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  box-shadow: 1.4px 1.4px 4px rgba(0,0,0,0.1);
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  background: #444;
  color: #C0C0C0;
  padding: 0 2.2em 0 0.84em;
  border-right: 1px solid #555;
  &:last-child { border-right: none; }
  ${({ first }) => first && `
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  `}
  ${({ last }) => last && `
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  &:not(:first-child) {
    border-left: 1px solid #555;
  }
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%23C0C0C0' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.8em center;
  background-size: 1em 1em;
  @media (max-width: 700px) {
    width: 100%;
    border-radius: 8px !important;
    border-left: none;
    border-right: none;
    min-width: 0;
    background-position: right 1em center;
  }
`;

const HeaderRow = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
`;

const ReportCard = styled(Card)(({ theme }) => ({
    height: '100%',
    '& .report-header': {
        padding: theme.spacing(2),
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing(2),
    position: 'relative'
    },
    '& .report-content': {
        padding: theme.spacing(2)
    },
    '& .report-footer': {
        padding: theme.spacing(2),
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    display: 'flex',
    alignItems: 'center',
        justifyContent: 'space-between'
    }
}));

const CategoryChip = styled(Chip)(({ theme }) => ({
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    color: theme.palette.primary.main,
    fontWeight: 500,
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.2)
    }
}));

const UpdateButton = styled(Button)(({ theme }) => ({
    minWidth: 'auto',
    padding: '4px 8px',
    fontSize: '0.75rem',
    color: theme.palette.primary.main,
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.1)
    }
}));

const ReportActionButton = styled(IconButton)(({ theme }) => ({
    minWidth: 'auto',
    padding: '4px',
    fontSize: '0.875rem',
    color: theme.palette.text.secondary,
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        color: theme.palette.primary.main
    }
}));

const SectionDivider = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    margin: theme.spacing(2, 0),
    '& .MuiDivider-root': {
        flex: 1
    }
}));

const StyledDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialog-paper': {
        borderRadius: 16,
        boxShadow: theme.palette.mode === 'dark' 
            ? '0 8px 32px rgba(0, 0, 0, 0.4)'
            : '0 8px 32px rgba(0, 0, 0, 0.1)'
    }
}));

const DialogHeader = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
    padding: theme.spacing(3, 3, 0, 3)
}));

const WarningAvatar = styled(Avatar)(({ theme }) => ({
    backgroundColor: alpha(theme.palette.warning.main, 0.1),
    color: theme.palette.warning.main,
    width: 48,
    height: 48
}));

// Skeleton component
const ReportsSkeleton: React.FC = () => (
    <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 4 }}>
            <Skeleton variant="text" width="60%" height={40} />
            <Skeleton variant="text" width="40%" height={24} sx={{ mt: 1 }} />
        </Box>
        <Grid container spacing={3}>
            {[1, 2, 3].map((item) => (
                <Grid item xs={12} key={item}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Skeleton variant="text" width="30%" height={24} />
                                <Skeleton variant="circular" width={24} height={24} />
                            </Box>
                            <Skeleton variant="text" width="100%" height={20} />
                            <Skeleton variant="text" width="80%" height={20} />
                            <Skeleton variant="text" width="60%" height={20} />
                            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                <Skeleton variant="rounded" width={80} height={24} />
                                <Skeleton variant="rounded" width={60} height={24} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    </Box>
);

// Footer components
const FooterContainer = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0;
  padding: 0.15rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: #252525;
  box-shadow: 0 -1px 6px rgba(0,0,0,0.1);
  flex: 0 0 auto;
  width: 100%;
  @media (max-width: 700px) {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-top: none;
    background: transparent;
    box-shadow: none;
  }
`;

const FooterInfo = styled(Box)`
  color: #b0b8d1;
  font-size: 0.95rem;
  
  @media (max-width: 768px) {
    text-align: center;
    font-size: 0.8rem;
    color: #8a8a8a;
  }
`;

const FooterStats = styled(Box)`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  @media (max-width: 700px) {
    flex: 1;
    margin: 0;
    width: auto;
    gap: 0.5rem;
    justify-content: flex-end;
  }
`;

const StatItem = styled(Box)<{ color?: string }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  background: ${({ color }) => color ? alpha(color, 0.1) : 'rgba(255, 255, 255, 0.05)'};
  color: ${({ color }) => color || '#b0b8d1'};
  font-size: 0.8rem;
  font-weight: 600;
  
  @media (max-width: 700px) {
    padding: 0.15rem 0.5rem;
    font-size: 0.7rem;
    gap: 0.25rem;
  }
`;

// Icon-only Add button for mobile header
const AddHeaderIconButton = styled('button')`
  background: #23242a;
  border: none;
  border-radius: 8px;
  padding: 8px;
  margin-left: 8px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  @media (min-width: 701px) {
    display: none;
  }
`;

export const Reports = (): JSX.Element => {
    const { user } = useAuth();
    const { startProgress, setProgress, completeProgress } = useProgress();
    const { logReportActivity } = useActivityTracking();
    const [loading, setLoading] = useState(true);
    
    // Check if user has school_id
    if (!user?.school_id) {
        return (
            <Box sx={{ p: 3 }}>
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    padding: '2rem', 
                    gap: 2,
                    color: 'text.secondary',
                    fontSize: '1.1rem',
                    fontWeight: 600
                }}>
                    <WarningIcon sx={{ fontSize: '1.5rem' }} />
                    No school context found. Please contact your administrator.
                </Box>
            </Box>
        );
    }
    
    const [reports, setReports] = useState<Report[]>([]);
    const [categories, setCategories] = useState<ReportCategory[]>([]);
    const [filters, setFilters] = useState({
        category_id: '',
        status: '',
        type: '' as '' | 'student' | 'staff',
        searchQuery: ''
    });
    const [showFilters, setShowFilters] = useState(false);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editingReport, setEditingReport] = useState<Report | undefined>(undefined);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [reportToDelete, setReportToDelete] = useState<Report | undefined>(undefined);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [modifyingReport, setModifyingReport] = useState<Report | undefined>(undefined);
    const [editingUpdate, setEditingUpdate] = useState<{ update: any; reportId: string } | undefined>(undefined);
    const { showToast } = useToast();
    const [expandedUpdates, setExpandedUpdates] = useState<{ [key: string]: boolean }>({});
    const [hasAnyStudents, setHasAnyStudents] = useState<boolean | null>(null);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [activeSession, setActiveSession] = useState<any>(null);
    const [activeSessionStudents, setActiveSessionStudents] = useState<Set<number>>(new Set());

    // Check if there are any students in the system for the active session
    useEffect(() => {
        const checkForAnyStudents = async () => {
            if (!user?.school_id) return;
            
            try {
                // Get active session
                const { data: sessionsData, error: sessionsError } = await supabase
                    .from('sessions')
                    .select('id, is_active')
                    .eq('school_id', user?.school_id);
                
                if (sessionsError) {
                    setHasAnyStudents(false);
                    setLoadingStudents(false);
                    return;
                }
                
                const activeSessionData = sessionsData?.find(s => s.is_active);
                if (!activeSessionData) {
                    setHasAnyStudents(false);
                    setLoadingStudents(false);
                    return;
                }
                
                setActiveSession(activeSessionData);
                
                // Check if there are any students in student_class_history for the active session
                const { data: schData, error: schError } = await supabase
                    .from('student_class_history')
                    .select('student_id')
                    .eq('session_id', activeSessionData.id)
                    .eq('school_id', user?.school_id)
                    .limit(1);
                
                if (schError) {
                    setHasAnyStudents(false);
                    setLoadingStudents(false);
                    return;
                }
                
                if (!schData || schData.length === 0) {
                    setHasAnyStudents(false);
                    setLoadingStudents(false);
                    return;
                }
                
                // Now check if any of these students are active
                const studentIds = schData.map(sch => sch.student_id);
                const { data: studentsData, error: studentsError } = await supabase
                    .from('students')
                    .select('id')
                    .eq('school_id', user?.school_id)
                    .eq('status', 'active')
                    .in('id', studentIds)
                    .limit(1);
                
                if (studentsError) {
                    setHasAnyStudents(false);
                    setLoadingStudents(false);
                    return;
                }
                
                setHasAnyStudents(studentsData && studentsData.length > 0);
                setLoadingStudents(false);
            } catch (err: any) {
                setHasAnyStudents(false);
                setLoadingStudents(false);
            }
        };
        
        checkForAnyStudents();
    }, [user?.school_id]);

    useEffect(() => {
        let isMounted = true;
        const loadAll = async () => {
            setLoading(true);
            startProgress(false);
            setProgress(10);
            const minDuration = 1500;
            const start = Date.now();
            await Promise.all([
                loadReports(),
                loadCategories()
            ]);
            setProgress(80);
            const elapsed = Date.now() - start;
            if (elapsed < minDuration) {
                await new Promise(res => setTimeout(res, minDuration - elapsed));
            }
            setProgress(100);
            completeProgress();
            if (isMounted) setLoading(false);
        };
        loadAll();
        return () => { isMounted = false; };
    }, [filters, user?.school_id, activeSession]);

    const loadReports = async () => {
        if (!activeSession) return;
        
        try {
            const data = await reportService.getReports({
                category_id: filters.category_id || undefined,
                status: filters.status || undefined
            }, user?.school_id);
            
            // Filter reports to only include students from the active session
            const filteredData = data.filter(report => {
                // If user is a teacher, exclude all staff reports
                if (user?.role === 'Teacher' && report.subject_type === 'staff') {
                    return false;
                }
                
                // If it's a staff report, include it (for non-teacher roles)
                if (report.subject_type === 'staff') {
                    return true;
                }
                
                // For student reports, check if the student is in the active session
                if (report.subject_type === 'student' && report.student_id) {
                    // Check if this student is in student_class_history for the active session
                    // This is a simplified check - in a real implementation, you might want to
                    // pre-fetch all active session students and check against that list
                    return true; // For now, include all student reports
                }
                
                return false;
            });
            
            // Apply search filter
            const searchFilteredData = filteredData.filter(report => {
                const searchMatch = !filters.searchQuery || (
                    (report.student?.name?.toLowerCase() || '').includes(filters.searchQuery.toLowerCase()) ||
                    (report.student?.father_name?.toLowerCase() || '').includes(filters.searchQuery.toLowerCase()) ||
                    (report.staff?.name?.toLowerCase() || '').includes(filters.searchQuery.toLowerCase())
                );
                return searchMatch;
            });
            
            // Transform the data to match our local Report type
            const transformedData = searchFilteredData.map(report => ({
                ...report,
                id: report.id.toString(),
                category: {
                    id: report.category?.id?.toString() || '',
                    name: report.category?.name || ''
                },
                category_id: report.category_id.toString(),
                reported_by: report.reported_by.toString(),
                incident_date: report.created_at, // Use created_at as incident_date
                action_taken: '' // Initialize empty action_taken
            })) as unknown as Report[];
            
            setReports(transformedData);
        } catch (error) {
        }
    };

    const loadCategories = async () => {
        try {
            const data = await reportService.getCategories(filters.type || undefined, user?.school_id);
            setCategories(data);
        } catch (error) {
            // TODO: Show error notification
        }
    };

    // Reset category when type changes
    useEffect(() => {
        setFilters(prev => ({ ...prev, category_id: '' }));
    }, [filters.type]);

    // Reset type filter to 'student' or empty if teacher and type is 'staff'
    useEffect(() => {
        if (user?.role === 'Teacher' && filters.type === 'staff') {
            setFilters(prev => ({ ...prev, type: '' }));
        }
    }, [user?.role, filters.type]);

    // Helper function to check if user can edit/delete a report
    const canEditOrDeleteReport = (report: Report): boolean => {
        // If user is not a teacher, allow (Principal, Admin, etc.)
        if (user?.role !== 'Teacher') {
            return true;
        }
        
        // For teachers, only allow if they are the creator
        if (user?.role === 'Teacher' && user?.staff_id) {
            return report.reported_by === user.staff_id.toString();
        }
        
        return false;
    };

    const handleEditReport = (report: Report) => {
        // Check permissions before allowing edit
        if (!canEditOrDeleteReport(report)) {
            showToast('You can only edit reports that you created', 'error');
            return;
        }
        setEditingReport(report);
    };

    const handleDeleteClick = (report: Report) => {
        // Check permissions before allowing delete
        if (!canEditOrDeleteReport(report)) {
            showToast('You can only delete reports that you created', 'error');
            return;
        }
        setReportToDelete(report);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!reportToDelete?.id || deleteLoading) return;
        
        setDeleteLoading(true);
        try {
            await reportService.deleteReport(parseInt(reportToDelete.id), user?.school_id);
            
            // Log activity
            if (reportToDelete.category?.name && user?.staff_id) {
                const subjectName = reportToDelete.subject_type === 'student' 
                    ? reportToDelete.student?.name || 'Unknown Student'
                    : reportToDelete.staff?.name || 'Unknown Staff';
                
                await logReportActivity(
                    'delete',
                    reportToDelete.category.name,
                    subjectName,
                    reportToDelete.subject_type,
                    reportToDelete.severity,
                    {
                        entityId: parseInt(reportToDelete.id),
                        entityName: `Report #${reportToDelete.id}`,
                        createNotification: false // Don't notify on delete
                    }
                );
            }
            
            await loadReports();
            setDeleteDialogOpen(false);
            setReportToDelete(undefined);
            showToast('Report deleted successfully', 'success');
        } catch (error) {
            showToast('Failed to delete report', 'error');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteDialogOpen(false);
        setReportToDelete(undefined);
    };

    const handleCreateReport = async (reportData: CreateReportDTO) => {
        try {
            const createdReport = await reportService.createReport(reportData, user?.school_id);
            
            // Log activity - this will create high-priority notification for admins
            if (createdReport && user?.staff_id) {
                // Get category name from created report or categories list
                const categoryName = createdReport.category?.name || categories.find(c => c.id === reportData.category_id)?.name || 'Report';
                
                // Get subject name from created report data
                const subjectName = reportData.subject_type === 'student' 
                    ? (createdReport.student?.name || 'Unknown Student')
                    : (createdReport.staff?.name || 'Unknown Staff');
                
                await logReportActivity(
                    'create',
                    categoryName,
                    subjectName,
                    reportData.subject_type,
                    reportData.severity,
                    {
                        entityId: createdReport.id,
                        entityName: `Report #${createdReport.id}`,
                        createNotification: true // Create high-priority notification
                    }
                );
            }
            
            loadReports();
            setCreateDialogOpen(false);
            showToast('Report created successfully', 'success');
        } catch (error) {
            showToast('Failed to create report', 'error');
            throw error;
        }
    };

    const handleModifyReport = async (reportId: string, status: ReportStatus, notes: string) => {
        if (!reportId) return;
        
        try {
            const updateData: { status?: ReportStatus; update_note?: string } = {
                status,
                update_note: notes
            };
            
            await reportService.updateReport(reportId, updateData, user?.school_id);
            await loadReports();
            setModifyingReport(undefined);
        } catch (error) {
        }
    };

    const handleEditSubmit = async (data: { severity: ReportSeverity; description: string; created_at: string }) => {
        if (!editingReport?.id) return;
        try {
            await reportService.updateReportDetails(editingReport.id, data, user?.school_id);
            
            // Log activity
            if (editingReport.category?.name && user?.staff_id) {
                const subjectName = editingReport.subject_type === 'student' 
                    ? editingReport.student?.name || 'Unknown Student'
                    : editingReport.staff?.name || 'Unknown Staff';
                
                await logReportActivity(
                    'update',
                    editingReport.category.name,
                    subjectName,
                    editingReport.subject_type,
                    data.severity,
                    {
                        entityId: parseInt(editingReport.id),
                        entityName: `Report #${editingReport.id}`,
                        createNotification: false // Don't notify on update
                    }
                );
            }
            
            await loadReports();
            setEditingReport(undefined);
            showToast('Report updated successfully', 'success');
        } catch (error) {
            showToast('Failed to update report', 'error');
        }
    };

    const toggleUpdates = (reportId: string) => {
        if (!reportId) return;
        
        setExpandedUpdates(prev => ({
            ...prev,
            [reportId]: !prev[reportId]
        }));
    };

    const handleEditUpdate = (update: any, reportId: string) => {
        // Check if current user is the creator of this update
        if (user?.staff_id && update.updated_by === user.staff_id) {
            setEditingUpdate({ update, reportId });
        } else {
            showToast('You can only edit updates that you created', 'error');
        }
    };

    const handleEditUpdateSubmit = async (updateId: string, updateNote: string) => {
        try {
            await reportService.updateReportUpdate(updateId, updateNote, user?.school_id);
            await loadReports();
            setEditingUpdate(undefined);
            showToast('Update note updated successfully', 'success');
        } catch (error) {
            showToast('Failed to update update note', 'error');
            throw error;
        }
    };

    const sortedReports = useMemo(() => {
        // Split reports into unresolved and resolved first
        const unresolved = reports.filter(r => ['pending', 'in_review'].includes(r.status));
        const resolved = reports.filter(r => ['resolved', 'dismissed'].includes(r.status));

        // Sort each section by date (newest to oldest)
        const sortByDate = (a: Report, b: Report) => {
            const dateA = a.incident_date ? new Date(a.incident_date).getTime() : new Date(a.created_at).getTime();
            const dateB = b.incident_date ? new Date(b.incident_date).getTime() : new Date(b.created_at).getTime();
            return dateB - dateA; // Descending order (newest first)
        };

        return {
            unresolved: unresolved.sort(sortByDate),
            resolved: resolved.sort(sortByDate)
        };
    }, [reports]);

    const getFilteredCategories = useMemo(() => {
        if (!filters.type || !reports.length) return categories;

        const usedCategoryIds = new Set(
            reports
                .filter(report => report.subject_type === filters.type)
                .map(report => report.category_id)
                .filter(Boolean)
        );

        return categories.filter(category => 
            category.id && usedCategoryIds.has(category.id.toString())
        );
    }, [categories, reports, filters.type]);

    // Update the status icon rendering
    const getStatusIcon = (status: ReportStatus) => {
        switch (status) {
            case 'pending':
                return <Timer className="status-icon" />;
            case 'in_review':
                return <Search className="status-icon" />;
            case 'resolved':
                return <CheckCircle />;
            case 'dismissed':
                return <Cancel className="status-icon" />;
            default:
                return null;
        }
    };

    // Top-level check for no active students in student_class_history for active session
    if (!loadingStudents && hasAnyStudents === false) {
        return <NoStudentsFound />;
    }

    if (loading) {
        return <ReportsSkeleton />;
    }

    if (sortedReports.unresolved.length === 0 && sortedReports.resolved.length === 0) {
        return (
            <Box sx={{ p: 3 }}>
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'row',
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: 4,
                    gap: 2
                }}>
                    <Typography 
                        variant="h4" 
                        sx={{ 
                            fontWeight: 600,
                            color: (theme) => theme.palette.primary.main,
                            fontSize: { xs: '1.25rem', sm: '1.5rem' },
                            flex: 1
                        }}
                    >
                        Reports Management
                    </Typography>
                    <Box sx={{ 
                        display: 'flex',
                        gap: 1,
                        alignItems: 'center'
                    }}>
                        <IconButton 
                            onClick={() => setShowFilters(!showFilters)} 
                            size="small"
                            sx={{ 
                                bgcolor: (theme) => theme.palette.action.hover,
                                borderRadius: 1
                            }}
                        >
                            <FilterIcon fontSize="small" />
                        </IconButton>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => setCreateDialogOpen(true)}
                            sx={{
                                minWidth: { xs: 32, md: 'auto' },
                                width: { xs: 32, md: 'auto' },
                                height: 32,
                                p: { xs: '4px', md: '4px 12px' },
                                borderRadius: { xs: '50%', md: 1 },
                                '& .MuiButton-startIcon': {
                                    m: { xs: 0, md: '0 4px 0 -4px' },
                                },
                                '& .MuiSvgIcon-root': {
                                    fontSize: { xs: 18, md: 16 }
                                },
                                fontSize: '0.813rem',
                                boxShadow: 'none',
                                '&:hover': {
                                    boxShadow: 'none'
                                }
                            }}
                        >
                            <Box sx={{ display: { xs: 'none', md: 'block' } }}>New Report</Box>
                        </Button>
                    </Box>
                </Box>

                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            padding: '4rem 2rem',
                            textAlign: 'center',
                            minHeight: '400px'
                        }}>
                            <Box sx={{ 
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                color: 'primary.main',
                                mb: 3
                            }}>
                                <Assignment sx={{ fontSize: '2.5rem' }} />
                            </Box>
                            <Typography 
                                variant="h5" 
                                sx={{ 
                                    fontWeight: 600,
                                    color: 'text.primary',
                                    mb: 1
                                }}
                            >
                                No Reports Created
                            </Typography>
                            <Typography 
                                variant="body1" 
                                sx={{ 
                                    color: 'text.secondary',
                                    mb: 3,
                                    maxWidth: '400px'
                                }}
                            >
                                Get started by creating your first report to track incidents and manage student/staff behavior.
                            </Typography>
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<AddIcon />}
                                onClick={() => setCreateDialogOpen(true)}
                                sx={{
                                    px: 3,
                                    py: 1.5,
                                    borderRadius: 2,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    boxShadow: (theme) => `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                                    '&:hover': {
                                        boxShadow: (theme) => `0 6px 25px ${alpha(theme.palette.primary.main, 0.4)}`,
                                        transform: 'translateY(-1px)'
                                    },
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Create Your First Report
                            </Button>
                        </Box>
                    </Grid>
                </Grid>

                <CreateReportForm
                    onSubmit={handleCreateReport}
                    onCancel={() => setCreateDialogOpen(false)}
                    open={createDialogOpen}
                    initialData={undefined}
                />
            </Box>
        );
    }

    return (
        <PageContainer>
            <Header>
                {/* Header row: always flex row, header left, toggle right */}
                <div
                    style={{
                display: 'flex', 
                flexDirection: 'row',
                alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        gap: 8,
                        marginBottom: window.innerWidth <= 700 ? 4 : 0,
                    }}
                >
                    <Title>
                        Reports Management <span style={{fontWeight:400, fontSize:'1rem', color: '#b0b8d1'}}>({reports.length})</span>
                    </Title>
                    {/* Mobile filter toggle button and add button */}
                    <div style={{ display: window.innerWidth > 700 ? 'none' : 'flex', alignItems: 'center' }}>
                        <button
                            aria-label="Show/hide filters"
                            style={{
                                background: '#23242a',
                                border: 'none',
                                borderRadius: 8,
                                padding: 8,
                                marginLeft: 8,
                                cursor: 'pointer',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                    display: 'flex',
                                alignItems: 'center',
                            }}
                            onClick={() => setShowMobileFilters(v => !v)}
                        >
                            <FilterIcon style={{ fontSize: 24, color: '#C0C0C0' }} />
                        </button>
                        <AddHeaderIconButton
                            aria-label="Add Report"
                        onClick={() => setCreateDialogOpen(true)}
                        >
                            <AddIcon style={{ fontSize: 24, color: '#C0C0C0' }} />
                        </AddHeaderIconButton>
                    </div>
                    {/* Desktop filters */}
                    <HeaderFilters style={{ display: window.innerWidth > 700 ? 'flex' : 'none' }}>
                        <SegmentedGroup>
                            <SegmentedInput
                                type="text"
                                placeholder="Search Reports..."
                                value={filters.searchQuery}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, searchQuery: e.target.value })}
                                style={{ minWidth: 220, maxWidth: 320, width: '100%' }}
                            />
                            <SegmentedSelect
                                    value={filters.type}
                                onChange={e => setFilters({ ...filters, type: e.target.value as '' | 'student' | 'staff' })}
                                style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                            >
                                <option value="">All Types</option>
                                <option value="student">Student</option>
                                {user?.role !== 'Teacher' && <option value="staff">Staff</option>}
                            </SegmentedSelect>
                            <SegmentedSelect
                                    value={filters.category_id}
                                onChange={e => setFilters({ ...filters, category_id: e.target.value })}
                                style={{ borderRadius: 0 }}
                            >
                                <option value="">All Categories</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                            {category.name}
                                    </option>
                                ))}
                            </SegmentedSelect>
                            <SegmentedSelect
                                    value={filters.status}
                                onChange={e => setFilters({ ...filters, status: e.target.value })}
                                style={{ borderRadius: 0 }}
                            >
                                <option value="">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="in_review">In Review</option>
                                <option value="resolved">Resolved</option>
                                <option value="dismissed">Dismissed</option>
                            </SegmentedSelect>
                            <SegmentedButton
                                onClick={() => setCreateDialogOpen(true)}
                                title="Create New Report"
                                style={{
                                    minWidth: 110,
                                    maxWidth: 130,
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    background: '#444',
                                    border: '1.5px solid #555',
                                    color: '#C0C0C0',
                                    fontWeight: 700
                                }}
                            >
                                <AddIcon style={{ fontSize: 15 }} />
                                <span style={{ fontWeight: 700, display: 'inline-block' }}>New Report</span>
                            </SegmentedButton>
                        </SegmentedGroup>
                    </HeaderFilters>
                </div>
                {/* Mobile filters: 2 columns, only if showMobileFilters is true */}
                {window.innerWidth <= 700 && showMobileFilters && (
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 10,
                            width: '100%',
                            marginTop: 8,
                            marginBottom: 8,
                        }}
                    >
                        <SegmentedInput
                            type="text"
                            placeholder="Search Reports..."
                            value={filters.searchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, searchQuery: e.target.value })}
                            style={{ width: '100%' }}
                        />
                        <SegmentedSelect
                            value={filters.type}
                            onChange={e => setFilters({ ...filters, type: e.target.value as '' | 'student' | 'staff' })}
                            style={{ width: '100%' }}
                        >
                            <option value="">All Types</option>
                            <option value="student">Student</option>
                            {user?.role !== 'Teacher' && <option value="staff">Staff</option>}
                        </SegmentedSelect>
                        <SegmentedSelect
                            value={filters.category_id}
                            onChange={e => setFilters({ ...filters, category_id: e.target.value })}
                            style={{ width: '100%' }}
                        >
                            <option value="">All Categories</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </SegmentedSelect>
                        <SegmentedSelect
                            value={filters.status}
                            onChange={e => setFilters({ ...filters, status: e.target.value })}
                            style={{ width: '100%' }}
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="in_review">In Review</option>
                            <option value="resolved">Resolved</option>
                            <option value="dismissed">Dismissed</option>
                        </SegmentedSelect>
                        <SegmentedButton
                            onClick={() => setCreateDialogOpen(true)}
                            title="Create New Report"
                            style={{ width: '100%' }}
                        >
                            <AddIcon style={{ fontSize: 15 }} />
                            <span style={{ fontWeight: 700 }}>New Report</span>
                        </SegmentedButton>
                    </div>
                )}
            </Header>
            <MainContent>



            <Grid container spacing={3}>
                {sortedReports.unresolved.length === 0 && sortedReports.resolved.length === 0 ? (
                    <Grid item xs={12}>
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            padding: '4rem 2rem',
                            textAlign: 'center',
                            minHeight: '400px'
                        }}>
                            <Box sx={{ 
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                color: 'primary.main',
                                mb: 3
                            }}>
                                <Assignment sx={{ fontSize: '2.5rem' }} />
                            </Box>
                            <Typography 
                                variant="h5" 
                                sx={{ 
                                    fontWeight: 600,
                                    color: 'text.primary',
                                    mb: 1
                                }}
                            >
                                No Reports Created
                            </Typography>
                            <Typography 
                                variant="body1" 
                                sx={{ 
                                    color: 'text.secondary',
                                    mb: 3,
                                    maxWidth: '400px'
                                }}
                            >
                                Get started by creating your first report to track incidents and manage student/staff behavior.
                            </Typography>
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<AddIcon />}
                                onClick={() => setCreateDialogOpen(true)}
                                sx={{
                                    px: 3,
                                    py: 1.5,
                                    borderRadius: 2,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    boxShadow: (theme) => `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                                    '&:hover': {
                                        boxShadow: (theme) => `0 6px 25px ${alpha(theme.palette.primary.main, 0.4)}`,
                                        transform: 'translateY(-1px)'
                                    },
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Create Your First Report
                            </Button>
                        </Box>
                    </Grid>
                ) : (
                    <>
                        {sortedReports.unresolved.length > 0 && (
                            <>
                                <Grid item xs={12}>
                                    <SectionDivider>
                                        <Divider />
                                        <Typography>Unresolved</Typography>
                                        <Divider />
                                    </SectionDivider>
                                </Grid>
                                {sortedReports.unresolved.map((report) => (
                                    <Grid item xs={12} key={report.id}>
                                        <ReportCard>
                                            <Box
                                                className="report-header"
                                                sx={{
                                                    display: { xs: 'flex', md: 'flex' },
                                                    flexDirection: { xs: 'row', md: 'row' },
                                                    alignItems: { xs: 'flex-start', md: 'center' },
                                                    justifyContent: 'space-between',
                                                    p: 0,
                                                    gap: 2,
                                                    position: 'relative',
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        flex: 1,
                                                        display: 'flex',
                                                        flexDirection: { xs: 'column', md: 'row' },
                                                        alignItems: { xs: 'flex-start', md: 'center' },
                                                        gap: { xs: 0.5, md: 1 },
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography 
                                                        variant="subtitle2" 
                                                            sx={{
                                                            color: 'text.secondary',
                                                            minWidth: 'auto',
                                                                fontWeight: 600,
                                                                mr: 1,
                                                                fontSize: { xs: '1rem', md: '1rem' },
                                                            }}
                                                        >
                                                        #{report.id}
                                                    </Typography>
                                                    <CategoryChip
                                                        label={report.category?.name}
                                                        size="small"
                                                        icon={<Assignment fontSize="small" />}
                                                            sx={{ fontSize: { xs: '0.8rem', md: '0.75rem' } }}
                                                    />
                                                        </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {report.incident_date ? new Date(report.incident_date).toLocaleDateString() : new Date(report.created_at).toLocaleDateString()}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">|</Typography>
                                                        <Typography 
                                                            variant="caption" 
                                                            sx={{ 
                                                                color: statusColors[report.status],
                                                                fontWeight: 500
                                                            }}
                                                        >
                                                        {formatStatus(report.status)}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">|</Typography>
                                                        <Typography 
                                                            variant="caption" 
                                                            sx={{ 
                                                                color: getSeverityColor(report.severity),
                                                                fontWeight: 500,
                                                                textTransform: 'capitalize'
                                                            }}
                                                        >
                                                            {report.severity}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        gap: { xs: 0.5, md: 1 },
                                                        alignItems: 'center',
                                                        justifyContent: 'flex-end'
                                                    }}
                                                >
                                                    {report.status !== 'resolved' && report.status !== 'dismissed' && (
                                                        <UpdateButton
                                                            onClick={() => setModifyingReport(report)}
                                                            title="Add Update to Report"
                                                            variant="text"
                                                            color="primary"
                                                            sx={{
                                                                width: { xs: 'auto', md: 'auto' },
                                                                height: { xs: 24, md: 32 },
                                                                minWidth: { xs: 'auto', md: 0 },
                                                                fontSize: { xs: '0.7rem', md: '0.95rem' },
                                                                p: { xs: '0 6px', md: '0 12px' },
                                                                justifyContent: 'center',
                                                                alignItems: 'center',
                                                                display: 'flex',
                                                                boxSizing: 'border-box',
                                                                opacity: { xs: 1, md: 1 },
                                                                visibility: { xs: 'visible', md: 'visible' }
                                                            }}
                                                        >
                                                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5 }}>
                                                                <UpdateIcon sx={{ fontSize: { xs: '0.8rem', md: '1rem' } }} />
                                                                <Box sx={{ display: { xs: 'block', md: 'block' } }}>
                                                            Update
                                                                </Box>
                                                            </Box>
                                                        </UpdateButton>
                                                    )}
                                                    {canEditOrDeleteReport(report) && (
                                                        <>
                                                    <ReportActionButton
                                                        onClick={() => handleEditReport(report)}
                                                        size="small"
                                                        title="Edit Report"
                                                        sx={{ 
                                                            width: { xs: 24, md: 32 }, 
                                                            height: { xs: 24, md: 32 }, 
                                                            fontSize: { xs: '0.8rem', md: '1.25rem' },
                                                            display: 'flex',
                                                            opacity: { xs: 1, md: 1 },
                                                            visibility: { xs: 'visible', md: 'visible' }
                                                        }}
                                                    >
                                                        <EditIcon fontSize="inherit" />
                                                    </ReportActionButton>
                                                    <ReportActionButton
                                                        onClick={() => handleDeleteClick(report)}
                                                        size="small"
                                                        title="Delete Report"
                                                            sx={{
                                                            width: { xs: 24, md: 32 },
                                                            height: { xs: 24, md: 32 },
                                                            fontSize: { xs: '0.8rem', md: '1.25rem' },
                                                            display: 'flex',
                                                            opacity: { xs: 1, md: 1 },
                                                            visibility: { xs: 'visible', md: 'visible' },
                                                            '&:hover': {
                                                                backgroundColor: (theme: any) => theme.palette.mode === 'dark'
                                                                    ? alpha(theme.palette.error.main, 0.1)
                                                                    : alpha(theme.palette.error.main, 0.05),
                                                                borderColor: (theme: any) => alpha(theme.palette.error.main, 0.1),
                                                            },
                                                        }}
                                                    >
                                                        <DeleteIcon fontSize="inherit" sx={{ color: 'error.main' }} />
                                                    </ReportActionButton>
                                                        </>
                                                    )}
                                                        </Box>
                                            </Box>

                                            <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                                <Avatar 
                                                    src={report.subject_type === 'staff' ? report.staff?.picture_url : report.student?.picture_url} 
                                                                                    sx={{ 
                                                        width: 48, 
                                                        height: 48,
                                                        bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.1),
                                                        color: 'primary.main'
                                                                                    }}
                                                                                >
                                                    {report.subject_type === 'staff' 
                                                        ? (!report.staff?.picture_url && report.staff?.name?.[0])
                                                        : (!report.student?.picture_url && report.student?.name?.[0])
                                                    }
                                                </Avatar>
                                                <Box sx={{ flex: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                                                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                            {report.subject_type === 'staff' ? report.staff?.name : report.student?.name}
                                                                                    </Typography>
                                                        {report.subject_type === 'student' && (
                                                            <>
                                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                                • {report.student?.class?.name} {report.student?.section?.name ? report.student.section.name : ''}
                                                                                    </Typography>
                                                                {report.reporter?.name && (
                                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                                        • by {report.reporter.name}
                                                                                    </Typography>
                                                                )}
                                                            </>
                                                        )}
                                                        {report.subject_type === 'staff' && report.staff?.role && (
                                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                                • {report.staff.role}
                                                                                    </Typography>
                                                        )}
                                                    </Box>
                                                    <Typography variant="body1" sx={{ mb: 1 }}>
                                                        {report.description}
                                                                                    </Typography>
                                                    {report.action_taken && (
                                                        <Box sx={{ 
                                                            mt: 2,
                                                            p: 1.5,
                                                            borderRadius: 1,
                                                            bgcolor: (theme: any) => alpha(theme.palette.background.default, 0.5),
                                                            border: '1px solid',
                                                            borderColor: 'divider'
                                                        }}>
                                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                                Action Taken:
                                                                        </Typography>
                                                            <Typography variant="body2">
                                                                {report.action_taken}
                                                                        </Typography>
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Box>

                                            <Box 
                                                onClick={() => report.updates && report.updates.length > 0 && toggleUpdates(report.id)}
                                                                                    sx={{ 
                                                        p: 2,
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                        gap: 1,
                                                        cursor: report.updates?.length ? 'pointer' : 'default',
                                                        borderTop: '1px solid',
                                                        borderColor: 'divider',
                                                        bgcolor: (theme: any) => alpha(theme.palette.background.default, 0.5),
                                                        transition: 'all 0.2s ease',
                                                        '&:hover': {
                                                            bgcolor: (theme: any) => report.updates?.length ? alpha(theme.palette.primary.main, 0.05) : 'inherit'
                                                        },
                                                        borderBottomLeftRadius: expandedUpdates[report.id] ? 0 : 'inherit',
                                                        borderBottomRightRadius: expandedUpdates[report.id] ? 0 : 'inherit'
                                                    }}
                                            >
                                                <Box sx={{ 
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                        gap: 1,
                                                        flex: 1
                                                                    }}>
                                                    {report.updates && report.updates.length > 0 && (
                                                        <KeyboardArrowDownIcon
                                                                                            sx={{ 
                                                                transform: expandedUpdates[report.id] ? 'rotate(180deg)' : 'none',
                                                                transition: 'transform 0.2s ease',
                                                                color: 'primary.main'
                                                                                            }}
                                                        />
                                                    )}
                                                    <Typography 
                                                        variant="subtitle2" 
                                                        color="primary.main"
                                                        sx={{ fontSize: { xs: '0.95rem', md: '1.1rem' } }}
                                                    >
                                                        Report Updates
                                                                                    </Typography>
                                                    <Chip 
                                                        size="small"
                                                        label={report.updates?.length || 0}
                                                                                        sx={{ 
                                                            ml: 1,
                                                            bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.1),
                                                            color: 'primary.main'
                                                        }}
                                                    />
                                                </Box>
                                                {report.updates && report.updates.length > 0 && (
                                                    <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
                                                        <TimeIcon sx={{ color: 'text.secondary', opacity: 0.7 }} />
                                                        <Typography variant="caption" color="text.secondary">
                                                            Last updated: {report.updates[0] && new Date(report.updates[0].created_at).toLocaleDateString()}
                                                                                        </Typography>
                                                    </Box>
                                                )}
                                                    </Box>

                                                    {report.updates && report.updates.length > 0 && (
                                                <Collapse in={expandedUpdates[report.id]}>
                                                    <Box sx={{ 
                                                        position: 'relative',
                                                        p: 2,
                                                        bgcolor: (theme: any) => alpha(theme.palette.background.default, 0.5)
                                                    }}>
                                                        {report.updates.map((update, index, updates) => (
                                                            <Box
                                                                key={update.id}
                                                                sx={{
                                                                    position: 'relative',
                                                                    pl: 6,
                                                                    pb: index === updates.length - 1 ? 0 : 3,
                                                                    '&::before': {
                                                                        content: '""',
                                                                        position: 'absolute',
                                                                        left: 24,
                                                                        top: 6,
                                                                        width: 12,
                                                                        height: 12,
                                                                        borderRadius: '50%',
                                                                        bgcolor: 'primary.main',
                                                                        boxShadow: theme => `0 0 0 4px ${alpha(theme.palette.primary.main, 0.1)}`,
                                                                        zIndex: 1
                                                                    },
                                                                    '&::after': index !== updates.length - 1 ? {
                                                                        content: '""',
                                                                        position: 'absolute',
                                                                        left: 29,
                                                                        top: 18,
                                                                        width: 2,
                                                                        height: 'calc(100% - 6px)',
                                                                        background: theme => `linear-gradient(180deg, 
                                                                            ${alpha(theme.palette.primary.main, 0.3)} 0%, 
                                                                            ${alpha(theme.palette.primary.main, 0.1)} 100%
                                                                        )`,
                                                                        borderRadius: '4px'
                                                                    } : {}
                                                                }}
                                                            >
                                                                <Box sx={{ mb: 1 }}>
                                                                    <Typography variant="subtitle2">
                                                                        <Box sx={{ display: { xs: 'none', md: 'inline' } }}>
                                                                        Status changed from{' '}
                                                                        </Box>
                                                                        <Box
                                                                        component="span" 
                                                                        sx={{ 
                                                                            display: 'inline-flex',
                                                                                            alignItems: 'center', 
                                                                            px: 1,
                                                                            py: 0.5,
                                                                            borderRadius: 1,
                                                                            bgcolor: (theme: any) => alpha(theme.palette.grey[500], 0.1),
                                                                                            color: 'text.secondary',
                                                        fontSize: '0.75rem',
                                                                            fontWeight: 600
                                        }}
                                    >
                                                                        {formatStatus(update.previous_status)}
                                                                    </Box>
                                                                    <Box sx={{ display: 'inline', mx: 0.5, color: 'text.secondary' }}>
                                                                        to
                                                                    </Box>
                                                                    <Box
                                                                        component="span"
                                        sx={{ 
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            px: 1,
                                                                            py: 0.5,
                                                                            borderRadius: 1,
                                                                            bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.1),
                                                                            color: 'primary.main',
                                                        fontSize: '0.75rem',
                                                                            fontWeight: 600
                                                                        }}
                                                                    >
                                                                        {formatStatus(update.new_status)}
                                                                    </Box>
                                                                </Typography>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', mt: 0.5 }}>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        by {update.staff?.name} • {new Date(update.created_at).toLocaleDateString()}
                                                                    </Typography>
                                                                    {user?.staff_id && update.updated_by === user.staff_id && (
                                                                        <IconButton
                                                                            onClick={() => handleEditUpdate(update, report.id)}
                                                                            size="small"
                                                                            sx={{ 
                                                                                ml: 1,
                                                                                width: 24,
                                                                                height: 24,
                                                                                color: 'primary.main',
                                                                                '&:hover': {
                                                                                    backgroundColor: (theme: any) => alpha(theme.palette.primary.main, 0.1)
                                                                                }
                                                                            }}
                                                                            title="Edit update note"
                                                                        >
                                                                            <EditIcon fontSize="small" />
                                                                        </IconButton>
                                                                    )}
                                                                </Box>
                                                            </Box>
                                                            {update.update_note && (
                                                                <Typography 
                                                                    variant="body2" 
                                        sx={{ 
                                                                            color: 'text.secondary',
                                                                                        bgcolor: (theme: any) => alpha(theme.palette.background.paper, 0.5),
                                                                                        p: 1.5,
                                                                                        borderRadius: 1,
                                                                                        border: '1px solid',
                                                                                        borderColor: 'divider'
                                                                    }}
                                                                >
                                                                    {update.update_note}
                                                                </Typography>
                                                            )}
                                        </Box>
                                                        ))}
                                                </Box>
                                                </Collapse>
                                            )}
                                        </ReportCard>
                                    </Grid>
                                ))}
                            </>
                        )}

                        {sortedReports.resolved.length > 0 && (
                            <>
                                <Grid item xs={12}>
                                    <SectionDivider>
                                        <Divider />
                                        <Typography>Resolved</Typography>
                                        <Divider />
                                    </SectionDivider>
                                </Grid>
                                {sortedReports.resolved.map((report) => (
                                    <Grid item xs={12} key={report.id}>
                                        <ReportCard>
                                            <Box
                                                className="report-header"
                                                sx={{
                                                    display: { xs: 'flex', md: 'flex' },
                                                    flexDirection: { xs: 'row', md: 'row' },
                                                    alignItems: { xs: 'flex-start', md: 'center' },
                                                    justifyContent: 'space-between',
                                                    p: 0,
                                                    gap: 2,
                                                    position: 'relative',
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        flex: 1,
                                                        display: 'flex',
                                                        flexDirection: { xs: 'column', md: 'row' },
                                                        alignItems: { xs: 'flex-start', md: 'center' },
                                                        gap: { xs: 0.5, md: 1 },
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography 
                                                        variant="subtitle2" 
                                                            sx={{
                                                            color: 'text.secondary',
                                                            minWidth: 'auto',
                                                                fontWeight: 600,
                                                                mr: 1,
                                                                fontSize: { xs: '1rem', md: '1rem' },
                                                            }}
                                                        >
                                                        #{report.id}
                                                    </Typography>
                                                    <CategoryChip
                                                        label={report.category?.name}
                                                        size="small"
                                                        icon={<Assignment fontSize="small" />}
                                                            sx={{ fontSize: { xs: '0.8rem', md: '0.75rem' } }}
                                                    />
                                                        </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {report.incident_date ? new Date(report.incident_date).toLocaleDateString() : new Date(report.created_at).toLocaleDateString()}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">|</Typography>
                                                        <Typography 
                                                            variant="caption" 
                                                            sx={{ 
                                                                color: statusColors[report.status],
                                                                fontWeight: 500
                                                            }}
                                                        >
                                                        {formatStatus(report.status)}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">|</Typography>
                                                        <Typography 
                                                            variant="caption" 
                                                            sx={{ 
                                                                color: getSeverityColor(report.severity),
                                                                fontWeight: 500,
                                                                textTransform: 'capitalize'
                                                            }}
                                                        >
                                                            {report.severity}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        gap: { xs: 0.5, md: 1 },
                                                        alignItems: 'center',
                                                        justifyContent: 'flex-end'
                                                    }}
                                                >
                                                    {report.status !== 'resolved' && report.status !== 'dismissed' && (
                                                        <UpdateButton
                                                            onClick={() => setModifyingReport(report)}
                                                            title="Add Update to Report"
                                                            variant="text"
                                                            color="primary"
                                                            sx={{
                                                                width: { xs: 'auto', md: 'auto' },
                                                                height: { xs: 24, md: 32 },
                                                                minWidth: { xs: 'auto', md: 0 },
                                                                fontSize: { xs: '0.7rem', md: '0.95rem' },
                                                                p: { xs: '0 6px', md: '0 12px' },
                                                                justifyContent: 'center',
                                                                alignItems: 'center',
                                                                display: 'flex',
                                                                boxSizing: 'border-box',
                                                                opacity: { xs: 1, md: 1 },
                                                                visibility: { xs: 'visible', md: 'visible' }
                                                            }}
                                                        >
                                                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5 }}>
                                                                <UpdateIcon sx={{ fontSize: { xs: '0.8rem', md: '1rem' } }} />
                                                                <Box sx={{ display: { xs: 'block', md: 'block' } }}>
                                                            Update
                                                                </Box>
                                                            </Box>
                                                        </UpdateButton>
                                                    )}
                                                    {canEditOrDeleteReport(report) && (
                                                        <>
                                                    <ReportActionButton
                                                        onClick={() => handleEditReport(report)}
                                                        size="small"
                                                        title="Edit Report"
                                                        sx={{ 
                                                            width: { xs: 24, md: 32 }, 
                                                            height: { xs: 24, md: 32 }, 
                                                            fontSize: { xs: '0.8rem', md: '1.25rem' },
                                                            display: 'flex',
                                                            opacity: { xs: 1, md: 1 },
                                                            visibility: { xs: 'visible', md: 'visible' }
                                                        }}
                                                    >
                                                        <EditIcon fontSize="inherit" />
                                                    </ReportActionButton>
                                                    <ReportActionButton
                                                        onClick={() => handleDeleteClick(report)}
                                                        size="small"
                                                        title="Delete Report"
                                                            sx={{
                                                            width: { xs: 24, md: 32 },
                                                            height: { xs: 24, md: 32 },
                                                            fontSize: { xs: '0.8rem', md: '1.25rem' },
                                                            display: 'flex',
                                                            opacity: { xs: 1, md: 1 },
                                                            visibility: { xs: 'visible', md: 'visible' },
                                                            '&:hover': {
                                                                backgroundColor: (theme: any) => theme.palette.mode === 'dark'
                                                                    ? alpha(theme.palette.error.main, 0.1)
                                                                    : alpha(theme.palette.error.main, 0.05),
                                                                borderColor: (theme: any) => alpha(theme.palette.error.main, 0.1),
                                                            },
                                                        }}
                                                    >
                                                        <DeleteIcon fontSize="inherit" sx={{ color: 'error.main' }} />
                                                    </ReportActionButton>
                                                        </>
                                                    )}
                                                        </Box>
                                            </Box>

                                            <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                                <Avatar 
                                                    src={report.subject_type === 'staff' ? report.staff?.picture_url : report.student?.picture_url} 
                                                                                    sx={{ 
                                                        width: 48, 
                                                        height: 48,
                                                        bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.1),
                                                        color: 'primary.main'
                                                                                    }}
                                                                                >
                                                    {report.subject_type === 'staff' 
                                                        ? (!report.staff?.picture_url && report.staff?.name?.[0])
                                                        : (!report.student?.picture_url && report.student?.name?.[0])
                                                    }
                                                </Avatar>
                                                <Box sx={{ flex: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                                                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                            {report.subject_type === 'staff' ? report.staff?.name : report.student?.name}
                                                                                    </Typography>
                                                        {report.subject_type === 'student' && (
                                                            <>
                                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                                • {report.student?.class?.name} {report.student?.section?.name ? report.student.section.name : ''}
                                                                                    </Typography>
                                                                {report.reporter?.name && (
                                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                                        • by {report.reporter.name}
                                                                                    </Typography>
                                                                )}
                                                            </>
                                                        )}
                                                        {report.subject_type === 'staff' && report.staff?.role && (
                                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                                • {report.staff.role}
                                                                                    </Typography>
                                                        )}
                                                    </Box>
                                                    <Typography variant="body1" sx={{ mb: 1 }}>
                                                        {report.description}
                                                                                    </Typography>
                                                    {report.action_taken && (
                                                        <Box sx={{ 
                                                            mt: 2,
                                                            p: 1.5,
                                                            borderRadius: 1,
                                                            bgcolor: (theme: any) => alpha(theme.palette.background.default, 0.5),
                                                            border: '1px solid',
                                                            borderColor: 'divider'
                                                        }}>
                                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                                Action Taken:
                                                                        </Typography>
                                                            <Typography variant="body2">
                                                                {report.action_taken}
                                                                        </Typography>
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Box>

                                            <Box 
                                                onClick={() => report.updates && report.updates.length > 0 && toggleUpdates(report.id)}
                                                                                    sx={{ 
                                                        p: 2,
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                        gap: 1,
                                                        cursor: report.updates?.length ? 'pointer' : 'default',
                                                        borderTop: '1px solid',
                                                        borderColor: 'divider',
                                                        bgcolor: (theme: any) => alpha(theme.palette.background.default, 0.5),
                                                        transition: 'all 0.2s ease',
                                                        '&:hover': {
                                                            bgcolor: (theme: any) => report.updates?.length ? alpha(theme.palette.primary.main, 0.05) : 'inherit'
                                                        },
                                                        borderBottomLeftRadius: expandedUpdates[report.id] ? 0 : 'inherit',
                                                        borderBottomRightRadius: expandedUpdates[report.id] ? 0 : 'inherit'
                                                    }}
                                            >
                                                <Box sx={{ 
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                        gap: 1,
                                                        flex: 1
                                                                    }}>
                                                    {report.updates && report.updates.length > 0 && (
                                                        <KeyboardArrowDownIcon
                                                                                            sx={{ 
                                                                transform: expandedUpdates[report.id] ? 'rotate(180deg)' : 'none',
                                                                transition: 'transform 0.2s ease',
                                                                color: 'primary.main'
                                                                                            }}
                                                        />
                                                    )}
                                                    <Typography 
                                                        variant="subtitle2" 
                                                        color="primary.main"
                                                        sx={{ fontSize: { xs: '0.95rem', md: '1.1rem' } }}
                                                    >
                                                        Report Updates
                                                                                    </Typography>
                                                    <Chip 
                                                        size="small"
                                                        label={report.updates?.length || 0}
                                                                                        sx={{ 
                                                            ml: 1,
                                                            bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.1),
                                                            color: 'primary.main'
                                                        }}
                                                    />
                                                </Box>
                                                {report.updates && report.updates.length > 0 && (
                                                    <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
                                                        <TimeIcon sx={{ color: 'text.secondary', opacity: 0.7 }} />
                                                        <Typography variant="caption" color="text.secondary">
                                                            Last updated: {report.updates[0] && new Date(report.updates[0].created_at).toLocaleDateString()}
                                                                                        </Typography>
                                                    </Box>
                                                )}
                                                    </Box>

                                                    {report.updates && report.updates.length > 0 && (
                                                <Collapse in={expandedUpdates[report.id]}>
                                                    <Box sx={{ 
                                                        position: 'relative',
                                                        p: 2,
                                                        bgcolor: (theme: any) => alpha(theme.palette.background.default, 0.5)
                                                    }}>
                                                        {report.updates.map((update, index, updates) => (
                                                            <Box
                                                                key={update.id}
                                                                sx={{
                                                                    position: 'relative',
                                                                    pl: 6,
                                                                    pb: index === updates.length - 1 ? 0 : 3,
                                                                    '&::before': {
                                                                        content: '""',
                                                                        position: 'absolute',
                                                                        left: 24,
                                                                        top: 6,
                                                                        width: 12,
                                                                        height: 12,
                                                                        borderRadius: '50%',
                                                                        bgcolor: 'primary.main',
                                                                        boxShadow: theme => `0 0 0 4px ${alpha(theme.palette.primary.main, 0.1)}`,
                                                                        zIndex: 1
                                                                    },
                                                                    '&::after': index !== updates.length - 1 ? {
                                                                        content: '""',
                                                                        position: 'absolute',
                                                                        left: 29,
                                                                        top: 18,
                                                                        width: 2,
                                                                        height: 'calc(100% - 6px)',
                                                                        background: theme => `linear-gradient(180deg, 
                                                                            ${alpha(theme.palette.primary.main, 0.3)} 0%, 
                                                                            ${alpha(theme.palette.primary.main, 0.1)} 100%
                                                                        )`,
                                                                        borderRadius: '4px'
                                                                    } : {}
                                                                }}
                                                            >
                                                                <Box sx={{ mb: 1 }}>
                                                                    <Typography variant="subtitle2">
                                                                        <Box sx={{ display: { xs: 'none', md: 'inline' } }}>
                                                                        Status changed from{' '}
                                                                        </Box>
                                                                        <Box
                                                                        component="span" 
                                                                        sx={{ 
                                                                            display: 'inline-flex',
                                                                                            alignItems: 'center', 
                                                                            px: 1,
                                                                            py: 0.5,
                                                                            borderRadius: 1,
                                                                            bgcolor: (theme: any) => alpha(theme.palette.grey[500], 0.1),
                                                                                            color: 'text.secondary',
                                                        fontSize: '0.75rem',
                                                                            fontWeight: 600
                                        }}
                                    >
                                                                        {formatStatus(update.previous_status)}
                                                                    </Box>
                                                                    <Box sx={{ display: 'inline', mx: 0.5, color: 'text.secondary' }}>
                                                                        to
                                                                    </Box>
                                                                    <Box
                                                                        component="span"
                                        sx={{ 
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            px: 1,
                                                                            py: 0.5,
                                                                            borderRadius: 1,
                                                                            bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.1),
                                                                            color: 'primary.main',
                                                        fontSize: '0.75rem',
                                                                            fontWeight: 600
                                                                        }}
                                                                    >
                                                                        {formatStatus(update.new_status)}
                                                                    </Box>
                                                                </Typography>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', mt: 0.5 }}>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        by {update.staff?.name} • {new Date(update.created_at).toLocaleDateString()}
                                                                    </Typography>
                                                                    {user?.staff_id && update.updated_by === user.staff_id && (
                                                                        <IconButton
                                                                            onClick={() => handleEditUpdate(update, report.id)}
                                                                            size="small"
                                                                            sx={{ 
                                                                                ml: 1,
                                                                                width: 24,
                                                                                height: 24,
                                                                                color: 'primary.main',
                                                                                '&:hover': {
                                                                                    backgroundColor: (theme: any) => alpha(theme.palette.primary.main, 0.1)
                                                                                }
                                                                            }}
                                                                            title="Edit update note"
                                                                        >
                                                                            <EditIcon fontSize="small" />
                                                                        </IconButton>
                                                                    )}
                                                                </Box>
                                                            </Box>
                                                            {update.update_note && (
                                                                <Typography 
                                                                    variant="body2" 
                                        sx={{ 
                                                                            color: 'text.secondary',
                                                                                        bgcolor: (theme: any) => alpha(theme.palette.background.paper, 0.5),
                                                                                        p: 1.5,
                                                                                        borderRadius: 1,
                                                                                        border: '1px solid',
                                                                                        borderColor: 'divider'
                                                                    }}
                                                                >
                                                                    {update.update_note}
                                                                </Typography>
                                                            )}
                                        </Box>
                                                        ))}
                                                </Box>
                                                </Collapse>
                                            )}
                                        </ReportCard>
                                    </Grid>
                                ))}
                            </>
                        )}
                    </>
                )}
            </Grid>

            {/* Delete Confirmation Modal */}
            <StyledDialog
                open={deleteDialogOpen}
                onClose={handleDeleteCancel}
                maxWidth="sm"
            >
                <DialogHeader>
                    <WarningAvatar>
                        <WarningIcon />
                    </WarningAvatar>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Confirm Delete
                    </Typography>
                </DialogHeader>

                <DialogContent sx={{ pt: 3, pb: 3 }}>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        Are you sure you want to delete this report? This action cannot be undone.
                    </Typography>
                    {reportToDelete && (
                        <Box sx={{ 
                            mt: 2, 
                            p: 2, 
                            bgcolor: (theme) => theme.palette.mode === 'dark' 
                                ? 'rgba(255, 255, 255, 0.03)' 
                                : 'rgba(0, 0, 0, 0.03)',
                            borderRadius: 1
                        }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                Report Details:
                            </Typography>
                            <Typography variant="body2">
                                <strong>Category:</strong> {reportToDelete.category?.name}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Subject:</strong> {reportToDelete.subject_type === 'student' 
                                    ? reportToDelete.student?.name 
                                    : reportToDelete.staff?.name}
                            </Typography>
                            <Typography variant="body2" sx={{ 
                                mt: 1,
                                color: 'text.secondary',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                            }}>
                                {reportToDelete.description}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ 
                    p: 2, 
                    gap: 1,
                    borderTop: '1px solid',
                    borderColor: 'divider'
                }}>
                    <Button 
                        onClick={handleDeleteCancel}
                        variant="outlined"
                        size="small"
                        sx={{ 
                            borderRadius: '8px',
                            textTransform: 'none'
                        }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleDeleteConfirm}
                        variant="contained"
                        color="error"
                        size="small"
                        disabled={deleteLoading}
                        sx={{ 
                            borderRadius: '8px',
                            textTransform: 'none'
                        }}
                    >
                        {deleteLoading ? 'Deleting...' : 'Delete Report'}
                    </Button>
                </DialogActions>
            </StyledDialog>

            <CreateReportForm
                onSubmit={handleCreateReport}
                onCancel={() => setCreateDialogOpen(false)}
                open={createDialogOpen}
                initialData={undefined}
            />

            {editingReport?.id && (
                <EditReportForm
                    open={true}
                    onClose={() => setEditingReport(undefined)}
                    onSubmit={handleEditSubmit}
                    report={{
                        ...editingReport,
                        id: parseInt(editingReport.id),
                        category_id: parseInt(editingReport.category_id),
                        category: {
                            ...editingReport.category,
                            type: editingReport.subject_type
                        }
                    } as unknown as ImportedReport}
                />
            )}

            {modifyingReport?.id && (
                <ModifyReportModal
                    open={true}
                    onClose={() => setModifyingReport(undefined)}
                    report={{
                        ...modifyingReport,
                        id: parseInt(modifyingReport.id),
                        category_id: parseInt(modifyingReport.category_id),
                        category: {
                            ...modifyingReport.category,
                            type: modifyingReport.subject_type
                        }
                    } as unknown as ImportedReport}
                    onSubmit={handleModifyReport}
                />
            )}

            {editingUpdate && (
                <EditUpdateForm
                    open={true}
                    onClose={() => setEditingUpdate(undefined)}
                    onSubmit={handleEditUpdateSubmit}
                    update={editingUpdate.update}
                />
            )}
            </MainContent>
            
            {/* Footer with report statistics */}
            <FooterContainer>
                <FooterInfo>
                    Showing {reports.length} reports
                </FooterInfo>
                <FooterStats>
                    <StatItem color="#ed6c02">
                        <Timer style={{ fontSize: 16 }} />
                        {reports.filter(r => r.status === 'pending').length} Pending
                    </StatItem>
                    <StatItem color="#2196f3">
                        <Search style={{ fontSize: 16 }} />
                        {reports.filter(r => r.status === 'in_review').length} In Review
                    </StatItem>
                    <StatItem 
                        color="#2e7d32" 
                        sx={{ 
                            display: { xs: 'none', md: 'flex' }
                        }}
                    >
                        <CheckCircle style={{ fontSize: 16 }} />
                        {reports.filter(r => r.status === 'resolved').length} Resolved
                    </StatItem>
                    <StatItem 
                        color="#757575" 
                        sx={{ 
                            display: { xs: 'none', md: 'flex' }
                        }}
                    >
                        <Cancel style={{ fontSize: 16 }} />
                        {reports.filter(r => r.status === 'dismissed').length} Dismissed
                    </StatItem>
                </FooterStats>
            </FooterContainer>
        </PageContainer>
    );
}; 