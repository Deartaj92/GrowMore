import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Button,
    Card,
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
    Tooltip,
    Tabs,
    Tab,
    Badge
} from '@mui/material';
import Loader from '../components/Loader';
import { 
    Add as AddIcon, 
    FilterList as FilterIcon, 
    Edit as EditIcon,
    Delete as DeleteIcon,
    Person as PersonIcon,
    School as SchoolIcon,
    KeyboardArrowDown as KeyboardArrowDownIcon,
    Assignment,
    Timer,
    Search,
    CheckCircle,
    Cancel,
    AccessTime as TimeIcon,
    Warning as WarningIcon,
    Update as UpdateIcon,
    GetApp as ExportIcon,
    Clear as ClearIcon,
    SupervisorAccount as StaffIcon,
    TrendingUp as TrendingUpIcon,
    ReportProblem as AlertIcon,
    Category as CategoryIcon
} from '@mui/icons-material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import { reportService } from '../utils/reportService';
import { 
    ReportCategory, 
    ReportSeverity, 
    CreateReportDTO, 
    Report as ImportedReport,
    ReportStatus
} from '../types/reports';
import { useAuth } from '../contexts/AuthContext';
import { CreateStudentReportForm } from '../components/reports/CreateStudentReportForm';
import { CreateEmployeeReportForm } from '../components/reports/CreateEmployeeReportForm';
import { ModifyReportModal } from '../components/reports/ModifyReportModal';
import { EditReportForm } from '../components/reports/EditReportForm';
import { EditUpdateForm } from '../components/reports/EditUpdateForm';
import { ManageCategoriesModal } from '../components/reports/ManageCategoriesModal';
import { useToast } from '../components/useToast';
import NoStudentsFound from '../components/NoStudentsFound';
import { supabase } from '../supabaseClient';
import { useProgress } from '../components/Layout';
import { useActivityTracking } from '../hooks/useActivityTracking';
import { formatAppDate } from '../utils/dateUtils';
import { usePageFooter } from '../components/Layout/contexts/PageFooterContext';

// Local Report Type definition
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

// Utility Status Colors
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
    switch (severity?.toLowerCase()) {
        case 'low': return '#4caf50';
        case 'medium': return '#ff9800';
        case 'high': return '#f44336';
        case 'urgent': return '#9c27b0';
        default: return '#757575';
    }
};

const getSeverityBgColor = (severity: string, themeMode: string) => {
    const color = getSeverityColor(severity);
    return themeMode === 'dark' ? alpha(color, 0.2) : alpha(color, 0.1);
};

// Dynamic Category Color Map
const getCategoryColor = (categoryName?: string) => {
    if (!categoryName) return '#2563eb';
    const name = categoryName.toLowerCase();

    if (name.includes('discipline') || name.includes('behavior') || name.includes('misconduct')) return '#e11d48'; // Rose
    if (name.includes('academic') || name.includes('grade') || name.includes('exam') || name.includes('test')) return '#2563eb'; // Blue
    if (name.includes('attendance') || name.includes('tard') || name.includes('leave') || name.includes('late')) return '#d97706'; // Amber
    if (name.includes('bullying') || name.includes('fight') || name.includes('harass') || name.includes('abuse')) return '#7c3aed'; // Purple
    if (name.includes('staff') || name.includes('employee') || name.includes('teacher')) return '#0d9488'; // Teal
    if (name.includes('property') || name.includes('damage') || name.includes('theft')) return '#c05621'; // Bronze
    if (name.includes('general') || name.includes('other')) return '#059669'; // Emerald

    // String Hashing fallback for custom categories
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) {
        hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 60%, 42%)`;
};

// Styled Components using MUI Theme design tokens
const PageContainer = styled(Box)(({ theme }) => ({
    width: '100%',
    margin: 0,
    padding: '0 16px 12px 16px',
    boxSizing: 'border-box',
    background: theme.palette.mode === 'dark' ? theme.palette.background.default : '#f8fafc',
    maxWidth: '100vw',
    overflowX: 'hidden',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
}));

const Header = styled(Box)(({ theme }) => ({
    flex: '0 0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    margin: '8px 0',
    background: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.8) : '#ffffff',
    backdropFilter: 'blur(8px)',
    boxShadow: theme.palette.mode === 'dark' ? '0 2px 10px rgba(0,0,0,0.4)' : '0 2px 10px rgba(0,0,0,0.05)',
    borderRadius: 12,
    padding: '12px 16px',
    border: `1px solid ${theme.palette.divider}`,
}));

const MainContent = styled(Box)(({ theme }) => ({
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: '4px 0 12px 0',
    '&::-webkit-scrollbar': {
        width: '6px',
    },
    '&::-webkit-scrollbar-track': {
        background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
        background: theme.palette.mode === 'dark' ? '#555' : '#ccc',
        borderRadius: '3px',
    },
}));

const KPICard = styled(Paper)<{ active?: boolean; accentcolor?: string }>(({ theme, active, accentcolor }) => ({
    padding: '12px 16px',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    border: `1.5px solid ${active ? (accentcolor || theme.palette.primary.main) : alpha(theme.palette.divider, 0.8)}`,
    background: active 
        ? (theme.palette.mode === 'dark' ? alpha(accentcolor || theme.palette.primary.main, 0.15) : alpha(accentcolor || theme.palette.primary.main, 0.08))
        : (theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.6) : '#ffffff'),
    boxShadow: active ? `0 4px 14px ${alpha(accentcolor || theme.palette.primary.main, 0.25)}` : '0 1px 4px rgba(0,0,0,0.04)',
    '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: `0 6px 16px ${alpha(accentcolor || theme.palette.primary.main, 0.2)}`,
        borderColor: accentcolor || theme.palette.primary.main,
    }
}));

const ReportCard = styled(Card)(({ theme }) => ({
    borderRadius: 14,
    boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
    border: `1px solid ${theme.palette.divider}`,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    overflow: 'hidden',
    background: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#ffffff',
    '&:hover': {
        boxShadow: theme.palette.mode === 'dark' ? '0 6px 24px rgba(0,0,0,0.45)' : '0 6px 20px rgba(0,0,0,0.1)',
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

import { useLocation } from 'react-router-dom';

interface ReportsProps {
    defaultTab?: 'student' | 'staff' | 'all';
}

export const Reports = ({ defaultTab }: ReportsProps = {}): JSX.Element => {
    const location = useLocation();
    const { user } = useAuth();
    const { startProgress, setProgress, completeProgress } = useProgress();
    const { logReportActivity } = useActivityTracking();
    const { setFooterContent } = usePageFooter();
    const muiTheme = useMuiTheme();
    const { showToast } = useToast();

    // Core States
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<Report[]>([]);
    const [categories, setCategories] = useState<ReportCategory[]>([]);
    
    // Initial Tab State: 'student' | 'staff' | 'all'
    const initialTab = useMemo(() => {
        if (defaultTab) return defaultTab;
        const path = location.pathname.toLowerCase();
        const search = location.search.toLowerCase();
        if (path.includes('employee') || path.includes('staff') || search.includes('staff') || search.includes('employee')) {
            return 'staff';
        }
        return 'student';
    }, [defaultTab, location]);

    const [subjectTab, setSubjectTab] = useState<'student' | 'staff' | 'all'>(initialTab);

    // Sync tab if route or defaultTab changes
    useEffect(() => {
        if (defaultTab) {
            setSubjectTab(defaultTab);
        } else {
            const path = location.pathname.toLowerCase();
            const search = location.search.toLowerCase();
            if (path.includes('employee') || path.includes('staff') || search.includes('staff') || search.includes('employee')) {
                setSubjectTab('staff');
            }
        }
    }, [defaultTab, location.pathname, location.search]);

    // Advanced Filters
    const [filters, setFilters] = useState({
        category_id: '',
        status: '',
        class_id: '',
        reported_by: '',
        searchQuery: ''
    });
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    // Classes & Staff for filtering
    const [classList, setClassList] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);

    // Dialogs
    const [createStudentDialogOpen, setCreateStudentDialogOpen] = useState(false);
    const [createEmployeeDialogOpen, setCreateEmployeeDialogOpen] = useState(false);
    const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
    const [editingReport, setEditingReport] = useState<Report | undefined>(undefined);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [reportToDelete, setReportToDelete] = useState<Report | undefined>(undefined);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [modifyingReport, setModifyingReport] = useState<Report | undefined>(undefined);
    const [editingUpdate, setEditingUpdate] = useState<{ update: any; reportId: string } | undefined>(undefined);
    const [expandedUpdates, setExpandedUpdates] = useState<{ [key: string]: boolean }>({});

    // Mobile detection
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    // Permission check for viewing and creating staff/employee reports
    const canViewStaffReports = useMemo(() => {
        if (!user) return false;
        // Super Admin, Admin, Principal, Director, Owner have full staff report access
        const privilegedRoles = ['Super Admin', 'Admin', 'Principal', 'Director', 'Owner'];
        if (privilegedRoles.includes(user.role || '')) return true;
        
        // Teachers and other restricted roles cannot view or manage staff complaints
        return false;
    }, [user]);

    // Automatically restrict non-privileged roles to student complaints only
    useEffect(() => {
        if (!canViewStaffReports && subjectTab !== 'student') {
            setSubjectTab('student');
        }
    }, [canViewStaffReports, subjectTab]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Load available classes & staff for filtering
    useEffect(() => {
        if (user?.school_id) {
            reportService.getClasses(user.school_id)
                .then(classes => setClassList(classes))
                .catch(() => setClassList([]));
            
            reportService.getStaff(user.school_id)
                .then(staff => setStaffList(staff))
                .catch(() => setStaffList([]));
        }
    }, [user?.school_id]);

    // Derive Unique Reporters List
    const reportersList = useMemo(() => {
        const map = new Map<string, string>();
        staffList.forEach(s => {
            if (s.id && s.name) map.set(s.id.toString(), s.name);
        });
        reports.forEach(r => {
            if (r.reported_by && r.reporter?.name) {
                map.set(r.reported_by.toString(), r.reporter.name);
            }
        });
        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [staffList, reports]);

    // Load Reports and Categories whenever Tab or Filters change
    const loadReports = async () => {
        if (!user?.school_id) return;

        try {
            let fetchedReports: ImportedReport[] = [];
            if (subjectTab === 'student') {
                fetchedReports = await reportService.getStudentReports({
                    category_id: filters.category_id || undefined,
                    status: filters.status || undefined,
                    subject_type: 'student'
                }, user.school_id);
            } else if (subjectTab === 'staff') {
                fetchedReports = await reportService.getEmployeeReports({
                    category_id: filters.category_id || undefined,
                    status: filters.status || undefined,
                    subject_type: 'staff'
                }, user.school_id);
            } else {
                fetchedReports = await reportService.getAllReports({
                    category_id: filters.category_id || undefined,
                    status: filters.status || undefined,
                }, user.school_id);
            }

            // Transform raw payload to match component state structure
            const formatted = fetchedReports.map((report: any) => {
                const catName = report.category?.name 
                    || categories.find(c => String(c.id) === String(report.category_id))?.name 
                    || 'General Complaint';

                return {
                    ...report,
                    id: report.id.toString(),
                    category_id: report.category_id ? report.category_id.toString() : '',
                    reported_by: report.reported_by ? report.reported_by.toString() : '',
                    incident_date: report.created_at,
                    action_taken: report.action_taken || '',
                    category: {
                        id: report.category_id ? report.category_id.toString() : (report.category?.id?.toString() || '1'),
                        name: catName
                    }
                };
            }) as unknown as Report[];

            setReports(formatted);
        } catch (err) {
            console.error('Error loading reports:', err);
        }
    };

    const loadCategories = async () => {
        try {
            const catType = subjectTab === 'all' ? undefined : subjectTab;
            const data = await reportService.getCategories(catType, user?.school_id);
            setCategories(data || []);
            return data || [];
        } catch (err) {
            console.error('Error loading categories:', err);
            return [];
        }
    };

    useEffect(() => {
        let isMounted = true;

        const loadAll = async () => {
            setLoading(true);
            startProgress(false);
            setProgress(20);
            await loadCategories();
            await loadReports();
            setProgress(100);
            completeProgress();
            if (isMounted) setLoading(false);
        };

        loadAll();
        return () => { isMounted = false; };
    }, [subjectTab, filters.category_id, filters.status, user?.school_id]);

    // Compute Repeat Incident History Counts
    const incidentCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        reports.forEach(r => {
            const key = r.subject_type === 'student' 
                ? `student_${r.student_id || r.student?.id}`
                : `staff_${r.staff_id || r.staff?.id}`;
            if (key && key !== 'student_undefined' && key !== 'staff_undefined') {
                counts[key] = (counts[key] || 0) + 1;
            }
        });
        return counts;
    }, [reports]);

    // Apply Client-Side Filtering (Search, Class, Reported By)
    const filteredReports = useMemo(() => {
        return reports.filter(report => {
            // Search Query
            if (filters.searchQuery.trim()) {
                const query = filters.searchQuery.toLowerCase().trim();
                const studentName = report.student?.name?.toLowerCase() || '';
                const fatherName = report.student?.father_name?.toLowerCase() || '';
                const staffName = report.staff?.name?.toLowerCase() || '';
                const categoryName = (report.category?.name || categories.find(c => String(c.id) === String(report.category_id))?.name || '').toLowerCase();
                const desc = report.description?.toLowerCase() || '';
                const reportId = `#${report.id}`;

                const matchesSearch = studentName.includes(query) ||
                    fatherName.includes(query) ||
                    staffName.includes(query) ||
                    categoryName.includes(query) ||
                    desc.includes(query) ||
                    reportId.includes(query);

                if (!matchesSearch) return false;
            }

            // Reported By Filter
            if (filters.reported_by && report.reported_by?.toString() !== filters.reported_by.toString()) {
                return false;
            }

            // Class Filter (For student reports)
            if (filters.class_id && report.student) {
                if (report.student.class?.id?.toString() !== filters.class_id.toString()) {
                    return false;
                }
            }

            return true;
        });
    }, [reports, filters, categories]);

    // Categories that actually have reports logged
    const categoriesWithReports = useMemo(() => {
        const activeCategoryIds = new Set<string>();
        const activeCategoryNames = new Set<string>();

        reports.forEach(r => {
            if (r.category_id) {
                activeCategoryIds.add(String(r.category_id));
            }
            if (r.category?.id) {
                activeCategoryIds.add(String(r.category.id));
            }
            if (r.category?.name) {
                activeCategoryNames.add(r.category.name.toLowerCase().trim());
            }
        });

        return categories.filter(c => 
            activeCategoryIds.has(String(c.id)) || 
            activeCategoryNames.has(c.name.toLowerCase().trim())
        );
    }, [categories, reports]);

    // Split into Unresolved and Resolved
    const sortedReports = useMemo(() => {
        const unresolved = filteredReports.filter(r => ['pending', 'in_review'].includes(r.status));
        const resolved = filteredReports.filter(r => ['resolved', 'dismissed'].includes(r.status));

        const sortByDate = (a: Report, b: Report) => {
            const dateA = new Date(a.incident_date || a.created_at).getTime();
            const dateB = new Date(b.incident_date || b.created_at).getTime();
            return dateB - dateA;
        };

        return {
            unresolved: unresolved.sort(sortByDate),
            resolved: resolved.sort(sortByDate)
        };
    }, [filteredReports]);

    // KPI Metrics calculation
    const kpiMetrics = useMemo(() => {
        const total = reports.length;
        const pending = reports.filter(r => r.status === 'pending').length;
        const urgentHigh = reports.filter(r => ['urgent', 'high'].includes(r.severity?.toLowerCase())).length;
        const resolved = reports.filter(r => ['resolved', 'dismissed'].includes(r.status)).length;
        const resRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

        return { total, pending, urgentHigh, resRate };
    }, [reports]);

    // Footer Sync
    useEffect(() => {
        if (loading) {
            setFooterContent(null);
            return;
        }

        setFooterContent({
            visible: true,
            content: (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', px: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Showing {filteredReports.length} of {reports.length} reports
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        <Chip size="small" icon={<Timer style={{ fontSize: 14 }} />} label={`${kpiMetrics.pending} Pending`} sx={{ bgcolor: alpha('#ed6c02', 0.1), color: '#ed6c02', fontWeight: 600 }} />
                        <Chip size="small" icon={<CheckCircle style={{ fontSize: 14 }} />} label={`${kpiMetrics.resRate}% Resolved`} sx={{ bgcolor: alpha('#2e7d32', 0.1), color: '#2e7d32', fontWeight: 600 }} />
                    </Box>
                </Box>
            )
        });

        return () => setFooterContent(null);
    }, [loading, filteredReports.length, reports.length, kpiMetrics, setFooterContent]);

    // CSV Export Utility
    const handleExportCSV = () => {
        if (filteredReports.length === 0) {
            showToast('No reports available to export', 'error');
            return;
        }

        const headers = ['Report ID', 'Subject Type', 'Subject Name', 'Class / Role', 'Category', 'Severity', 'Status', 'Date', 'Reported By', 'Description'];
        const rows = filteredReports.map(r => [
            `"${r.id}"`,
            `"${r.subject_type || 'student'}"`,
            `"${(r.subject_type === 'staff' ? r.staff?.name : r.student?.name) || 'N/A'}"`,
            `"${r.subject_type === 'staff' ? (r.staff?.role || 'N/A') : (`${r.student?.class?.name || ''} ${r.student?.section?.name || ''}`.trim() || 'N/A')}"`,
            `"${r.category?.name || 'N/A'}"`,
            `"${r.severity}"`,
            `"${r.status}"`,
            `"${formatAppDate(r.created_at)}"`,
            `"${r.reporter?.name || 'Staff'}"`,
            `"${(r.description || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Complaints_Export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Exported reports to CSV successfully', 'success');
    };

    // Helper permissions
    const canEditOrDeleteReport = (report: Report): boolean => {
        if (user?.role !== 'Teacher') return true;
        if (user?.role === 'Teacher' && user?.staff_id) {
            return report.reported_by === user.staff_id.toString();
        }
        return false;
    };

    const handleEditReport = (report: Report) => {
        if (!canEditOrDeleteReport(report)) {
            showToast('You can only edit reports that you created', 'error');
            return;
        }
        setEditingReport(report);
    };

    const handleDeleteClick = (report: Report) => {
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
            if (reportToDelete.subject_type === 'staff') {
                await reportService.deleteEmployeeReport(parseInt(reportToDelete.id), user?.school_id);
            } else {
                await reportService.deleteStudentReport(parseInt(reportToDelete.id), user?.school_id);
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

    const handleCreateReport = async (reportData: CreateReportDTO) => {
        try {
            if (reportData.subject_type === 'staff') {
                await reportService.createEmployeeReport(reportData, user?.school_id);
            } else {
                await reportService.createStudentReport(reportData, user?.school_id);
            }
            await loadReports();
            setCreateStudentDialogOpen(false);
            setCreateEmployeeDialogOpen(false);
            showToast('Report logged successfully', 'success');
        } catch (error) {
            showToast('Failed to create report', 'error');
            throw error;
        }
    };

    const handleModifyReport = async (reportId: string, status: ReportStatus, notes: string) => {
        if (!reportId) return;
        try {
            const report = reports.find(r => r.id === reportId);
            if (report?.subject_type === 'staff') {
                await reportService.updateEmployeeReport(reportId, { status, update_note: notes }, user?.school_id);
            } else {
                await reportService.updateStudentReport(reportId, { status, update_note: notes }, user?.school_id);
            }
            await loadReports();
            setModifyingReport(undefined);
            showToast('Status updated successfully', 'success');
        } catch (error) {
            showToast('Failed to update status', 'error');
        }
    };

    const handleEditSubmit = async (data: { category_id?: number; severity: ReportSeverity; description: string; created_at: string }) => {
        if (!editingReport?.id) return;
        try {
            if (editingReport.subject_type === 'staff') {
                await reportService.updateEmployeeReportDetails(editingReport.id, data, user?.school_id);
            } else {
                await reportService.updateStudentReportDetails(editingReport.id, data, user?.school_id);
            }
            await loadReports();
            setEditingReport(undefined);
            showToast('Report details updated', 'success');
        } catch (error) {
            showToast('Failed to update report', 'error');
        }
    };

    const toggleUpdates = (reportId: string) => {
        setExpandedUpdates(prev => ({ ...prev, [reportId]: !prev[reportId] }));
    };

    const resetFilters = () => {
        setFilters({
            category_id: '',
            status: '',
            class_id: '',
            reported_by: '',
            searchQuery: ''
        });
    };

    const hasActiveFilters = Boolean(
        filters.category_id || filters.status || filters.class_id || filters.reported_by || filters.searchQuery
    );

    if (!user?.school_id) {
        return (
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <WarningIcon sx={{ fontSize: '1.5rem', color: 'warning.main' }} />
                <Typography variant="body1">No school context found. Please contact your administrator.</Typography>
            </Box>
        );
    }

    // Render Component Card
    const renderReportCard = (report: Report) => {
        const isStudent = report.subject_type !== 'staff';
        const subjectName = isStudent ? report.student?.name : report.staff?.name;
        const classNameSection = isStudent ? `${report.student?.class?.name || ''} ${report.student?.section?.name || ''}`.trim() : '';
        const fatherName = isStudent ? report.student?.father_name : undefined;

        const subjectSubtext = isStudent
            ? [fatherName, classNameSection].filter(Boolean).join(' • ') || 'Student'
            : report.staff?.role || 'Staff';

        const subjectPicture = isStudent ? report.student?.picture_url : report.staff?.picture_url;
        
        const subjectKey = isStudent ? `student_${report.student_id || report.student?.id}` : `staff_${report.staff_id || report.staff?.id}`;
        const totalIncidentsForSubject = incidentCounts[subjectKey] || 1;

        const categoryName = report.category?.name || categories.find(c => String(c.id) === String(report.category_id))?.name || 'General Complaint';
        const categoryColor = getCategoryColor(categoryName);

        return (
            <Grid item xs={12} key={report.id}>
                <ReportCard sx={{
                    p: { xs: 1.8, sm: 2 },
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.divider, 0.6) : '#e2e8f0',
                    borderLeft: `5px solid ${categoryColor}`,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? theme.palette.background.paper : '#ffffff',
                    boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.03)',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        borderColor: categoryColor,
                        boxShadow: (theme) => theme.palette.mode === 'dark'
                            ? `0 6px 24px ${alpha(categoryColor, 0.25)}`
                            : `0 6px 24px ${alpha(categoryColor, 0.12)}`,
                    }
                }}>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', gap: { xs: 1.2, md: 2 } }}>
                        
                        {/* 1. Subject Header Column */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: { xs: '100%', md: 'auto' }, minWidth: { md: 240 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar 
                                    src={subjectPicture} 
                                    sx={{ 
                                        width: { xs: 42, sm: 46 }, 
                                        height: { xs: 42, sm: 46 }, 
                                        bgcolor: alpha(categoryColor, 0.15), 
                                        color: categoryColor, 
                                        fontWeight: 800,
                                        fontSize: '1rem',
                                        border: `1.5px solid ${alpha(categoryColor, 0.4)}`
                                    }}
                                >
                                    {!subjectPicture && (subjectName?.[0] || '?')}
                                </Avatar>
                                <Box sx={{ minWidth: 0 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: { xs: '0.92rem', sm: '0.98rem' }, lineHeight: 1.2 }} noWrap>
                                            {subjectName || 'Unknown Subject'}
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem' }}>
                                            #{report.id}
                                        </Typography>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2, fontWeight: 600 }}>
                                        {subjectSubtext}
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Mobile Top Right Corner: Severity, Status and Category on the same line */}
                            <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <Chip 
                                    label={report.severity?.toUpperCase()} 
                                    size="small" 
                                    sx={{ 
                                        fontWeight: 900, 
                                        fontSize: '0.65rem', 
                                        height: 20,
                                        color: getSeverityColor(report.severity),
                                        bgcolor: (theme) => getSeverityBgColor(report.severity, theme.palette.mode)
                                    }} 
                                />
                                <Chip 
                                    label={formatStatus(report.status)} 
                                    size="small" 
                                    icon={report.status === 'resolved' ? <CheckCircle style={{ fontSize: 13, color: '#2e7d32' }} /> : undefined}
                                    sx={{ 
                                        fontWeight: 800, 
                                        fontSize: '0.68rem', 
                                        height: 20,
                                        color: report.status === 'resolved' ? '#2e7d32' : (statusColors[report.status] || '#757575'),
                                        bgcolor: report.status === 'resolved' ? alpha('#2e7d32', 0.18) : alpha(statusColors[report.status] || '#757575', 0.12),
                                        border: report.status === 'resolved' ? `1px solid ${alpha('#2e7d32', 0.4)}` : 'none'
                                    }} 
                                />
                                <Chip 
                                    label={categoryName} 
                                    size="small" 
                                    sx={{ 
                                        height: 20, 
                                        fontSize: '0.68rem', 
                                        fontWeight: 800, 
                                        bgcolor: alpha(categoryColor, 0.12), 
                                        color: categoryColor,
                                        border: `1px solid ${alpha(categoryColor, 0.3)}`
                                    }} 
                                />
                            </Box>
                        </Box>

                        {/* 2. Main Content Column */}
                        <Box sx={{ 
                            flex: 1, 
                            minWidth: 0, 
                            px: { xs: 0, md: 2 }, 
                            py: { xs: 0.5, md: 0 },
                            borderLeft: { xs: 'none', md: `1px solid ${alpha(muiTheme.palette.divider, 0.6)}` },
                            borderRight: { xs: 'none', md: `1px solid ${alpha(muiTheme.palette.divider, 0.6)}` }
                        }}>
                            {/* Desktop Header Row: Left (Severity, Status, Incidents), Right (Category) */}
                            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.8 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                    <Chip 
                                        label={report.severity?.toUpperCase()} 
                                        size="small" 
                                        sx={{ 
                                            fontWeight: 900, 
                                            fontSize: '0.68rem', 
                                            height: 22,
                                            color: getSeverityColor(report.severity),
                                            bgcolor: (theme) => getSeverityBgColor(report.severity, theme.palette.mode)
                                        }} 
                                    />
                                    <Chip 
                                        label={formatStatus(report.status)} 
                                        size="small" 
                                        icon={report.status === 'resolved' ? <CheckCircle style={{ fontSize: 14, color: '#2e7d32' }} /> : undefined}
                                        sx={{ 
                                            fontWeight: 800, 
                                            fontSize: '0.72rem', 
                                            height: 22,
                                            color: report.status === 'resolved' ? '#2e7d32' : (statusColors[report.status] || '#757575'),
                                            bgcolor: report.status === 'resolved' ? alpha('#2e7d32', 0.18) : alpha(statusColors[report.status] || '#757575', 0.12),
                                            border: report.status === 'resolved' ? `1px solid ${alpha('#2e7d32', 0.4)}` : 'none'
                                        }} 
                                    />
                                    {totalIncidentsForSubject > 1 && (
                                        <Chip 
                                            label={`${totalIncidentsForSubject} Incidents`} 
                                            size="small" 
                                            color="error" 
                                            variant="outlined" 
                                            sx={{ height: 20, fontSize: '0.68rem', fontWeight: 800 }} 
                                        />
                                    )}
                                </Box>

                                <Chip 
                                    label={categoryName} 
                                    size="small" 
                                    sx={{ 
                                        height: 22, 
                                        fontSize: '0.72rem', 
                                        fontWeight: 800, 
                                        bgcolor: alpha(categoryColor, 0.12), 
                                        color: categoryColor,
                                        border: `1px solid ${alpha(categoryColor, 0.3)}`
                                    }} 
                                />
                            </Box>

                            {/* Mobile Repeat Incidents Badge */}
                            {totalIncidentsForSubject > 1 && (
                                <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 0.5 }}>
                                    <Chip 
                                        label={`${totalIncidentsForSubject} Incidents`} 
                                        size="small" 
                                        color="error" 
                                        variant="outlined" 
                                        sx={{ height: 20, fontSize: '0.68rem', fontWeight: 800 }} 
                                    />
                                </Box>
                            )}

                            <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.5, fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>
                                {report.description}
                            </Typography>

                            {report.action_taken && (
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.8, color: 'success.main', fontWeight: 700 }}>
                                    ✓ Resolution: {report.action_taken}
                                </Typography>
                            )}
                        </Box>

                        {/* 3. Actions & Reporter Footer Column */}
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: { xs: 'row', md: 'column' }, 
                            alignItems: { xs: 'center', md: 'flex-end' }, 
                            justifyContent: { xs: 'space-between', md: 'center' },
                            alignSelf: { xs: 'stretch', md: 'center' },
                            gap: { xs: 1.5, md: 1 }, 
                            pt: { xs: 1.2, md: 0 },
                            mt: { xs: 0.8, md: 0 },
                            borderTop: { xs: `1px solid ${alpha(muiTheme.palette.divider, 0.4)}`, md: 'none' },
                            minWidth: { md: 150 }
                        }}>
                            {/* Left Side (Mobile) / Top (Desktop): Single Line for Reporter & Date */}
                            <Box sx={{ minWidth: 0, textAlign: { xs: 'left', md: 'right' } }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, fontSize: '0.75rem', lineHeight: 1.3 }} noWrap>
                                    By <strong>{report.reporter?.name || 'Staff'}</strong> • {formatAppDate(report.incident_date || report.created_at)}
                                </Typography>
                            </Box>

                            {/* Right Side (Mobile) / Bottom (Desktop): Action Buttons */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                {report.status !== 'resolved' && report.status !== 'dismissed' && (
                                    <Button
                                        size="small"
                                        variant="contained"
                                        disableElevation
                                        onClick={() => setModifyingReport(report)}
                                        sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', py: 0.3, px: 1.5, borderRadius: 1.5 }}
                                    >
                                        Update Status
                                    </Button>
                                )}
                                {canEditOrDeleteReport(report) && (
                                    <>
                                        <Tooltip title="Edit Report">
                                            <IconButton size="small" onClick={() => handleEditReport(report)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete Report">
                                            <IconButton size="small" color="error" onClick={() => handleDeleteClick(report)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </>
                                )}
                            </Box>
                        </Box>

                    </Box>

                    {/* Collapsible Updates Bar */}
                    {report.updates && report.updates.length > 0 && (
                        <>
                            <Box 
                                onClick={() => toggleUpdates(report.id)}
                                sx={{ 
                                    mt: 1.5,
                                    pt: 1,
                                    borderTop: '1px solid',
                                    borderColor: 'divider',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    color: 'primary.main'
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <KeyboardArrowDownIcon sx={{ 
                                        transform: expandedUpdates[report.id] ? 'rotate(180deg)' : 'none', 
                                        transition: 'transform 0.2s',
                                        fontSize: 18
                                    }} />
                                    <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.78rem' }}>
                                        {report.updates.length} Updates Logged
                                    </Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                    Last: {formatAppDate(report.updates[0].created_at)}
                                </Typography>
                            </Box>

                            <Collapse in={expandedUpdates[report.id]}>
                                <Box sx={{ pt: 1.5 }}>
                                    {report.updates.map((update) => (
                                        <Box key={update.id} sx={{ py: 0.8, borderBottom: '1px dashed', borderColor: 'divider' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                                    Status changed to <Chip label={formatStatus(update.new_status)} size="small" sx={{ height: 18, fontSize: '0.68rem' }} />
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    by {update.staff?.name || 'Staff'} • {formatAppDate(update.created_at)}
                                                </Typography>
                                            </Box>
                                            {update.update_note && (
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                                                    "{update.update_note}"
                                                </Typography>
                                            )}
                                        </Box>
                                    ))}
                                </Box>
                            </Collapse>
                        </>
                    )}
                </ReportCard>
            </Grid>
        );
    };

    if (loading) return <Loader />;

    return (
        <PageContainer>
            {/* Header Control Section */}
            <Header>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: '0.5px' }}>
                            Complaints & Reports
                        </Typography>
                        <Chip label={`${reports.length} Records`} size="small" color="primary" sx={{ fontWeight: 700 }} />
                    </Box>

                    {/* Mode Switcher Tabs - Only visible to authorized management roles */}
                    {canViewStaffReports && (
                        <Tabs
                            value={subjectTab}
                            onChange={(_, val) => setSubjectTab(val)}
                            textColor="primary"
                            indicatorColor="primary"
                            variant="scrollable"
                            scrollButtons="auto"
                            allowScrollButtonsMobile
                            sx={{
                                minHeight: 36,
                                width: { xs: '100%', md: 'auto' },
                                '& .MuiTab-root': {
                                    minHeight: 36,
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.88rem',
                                    px: 2,
                                    py: 0.5
                                }
                            }}
                        >
                            <Tab label="🎓 Student Complaints" value="student" />
                            <Tab label="👨‍🏫 Staff Complaints" value="staff" />
                            <Tab label="📋 All Reports" value="all" />
                        </Tabs>
                    )}

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 1, ml: { xs: 0, md: 'auto' }, width: { xs: '100%', md: 'auto' }, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<CategoryIcon />}
                            onClick={() => setManageCategoriesOpen(true)}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: { xs: 1.2, sm: 2 } }}
                        >
                            Manage Categories
                        </Button>

                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<ExportIcon />}
                            onClick={handleExportCSV}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: { xs: 1.2, sm: 2 } }}
                        >
                            Export CSV
                        </Button>

                        {(subjectTab === 'student' || subjectTab === 'all') && (
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => setCreateStudentDialogOpen(true)}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                            >
                                New Student Report
                            </Button>
                        )}

                        {canViewStaffReports && (subjectTab === 'staff' || subjectTab === 'all') && (
                            <Button
                                variant="contained"
                                color="secondary"
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => setCreateEmployeeDialogOpen(true)}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                            >
                                New Staff Report
                            </Button>
                        )}
                    </Box>
                </Box>

                {/* Mobile Compact Horizontal KPI Strip (Visible on Mobile Only) */}
                <Box sx={{ display: { xs: 'flex', sm: 'none' }, gap: 1, overflowX: 'auto', py: 1, my: 0.5, px: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Chip 
                        label={`Total: ${kpiMetrics.total}`} 
                        size="small" 
                        onClick={resetFilters} 
                        color="primary" 
                        variant={!hasActiveFilters ? "filled" : "outlined"} 
                        sx={{ fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }} 
                    />
                    <Chip 
                        label={`Pending: ${kpiMetrics.pending}`} 
                        size="small" 
                        onClick={() => setFilters(f => ({ ...f, status: f.status === 'pending' ? '' : 'pending' }))} 
                        sx={{ bgcolor: alpha('#ed6c02', 0.15), color: '#ed6c02', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }} 
                    />
                    <Chip 
                        label={`Urgent: ${kpiMetrics.urgentHigh}`} 
                        size="small" 
                        sx={{ bgcolor: alpha('#f44336', 0.15), color: '#f44336', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }} 
                    />
                    <Chip 
                        label={`Resolved: ${kpiMetrics.resRate}%`} 
                        size="small" 
                        onClick={() => setFilters(f => ({ ...f, status: f.status === 'resolved' ? '' : 'resolved' }))} 
                        sx={{ bgcolor: alpha('#2e7d32', 0.15), color: '#2e7d32', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }} 
                    />
                </Box>

                {/* Desktop KPI Metrics Cards Banner (Visible on Desktop Only) */}
                <Grid container spacing={2} sx={{ mt: 0.5, display: { xs: 'none', sm: 'flex' } }}>
                    <Grid item xs={6} sm={3}>
                        <KPICard 
                            accentcolor={muiTheme.palette.primary.main} 
                            active={!hasActiveFilters}
                            onClick={resetFilters}
                        >
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                                    Total Logged
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.2 }}>
                                    {kpiMetrics.total}
                                </Typography>
                            </Box>
                            <Avatar sx={{ bgcolor: alpha(muiTheme.palette.primary.main, 0.12), color: muiTheme.palette.primary.main }}>
                                <Assignment />
                            </Avatar>
                        </KPICard>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                        <KPICard 
                            accentcolor="#ed6c02" 
                            active={filters.status === 'pending'}
                            onClick={() => setFilters(f => ({ ...f, status: f.status === 'pending' ? '' : 'pending' }))}
                        >
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                                    Pending Review
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 800, color: '#ed6c02', mt: 0.2 }}>
                                    {kpiMetrics.pending}
                                </Typography>
                            </Box>
                            <Avatar sx={{ bgcolor: alpha('#ed6c02', 0.12), color: '#ed6c02' }}>
                                <Timer />
                            </Avatar>
                        </KPICard>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                        <KPICard 
                            accentcolor="#f44336" 
                            active={false}
                        >
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                                    Urgent & High
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 800, color: '#f44336', mt: 0.2 }}>
                                    {kpiMetrics.urgentHigh}
                                </Typography>
                            </Box>
                            <Avatar sx={{ bgcolor: alpha('#f44336', 0.12), color: '#f44336' }}>
                                <AlertIcon />
                            </Avatar>
                        </KPICard>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                        <KPICard 
                            accentcolor="#2e7d32" 
                            active={filters.status === 'resolved'}
                            onClick={() => setFilters(f => ({ ...f, status: f.status === 'resolved' ? '' : 'resolved' }))}
                        >
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                                    Resolution Rate
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 800, color: '#2e7d32', mt: 0.2 }}>
                                    {kpiMetrics.resRate}%
                                </Typography>
                            </Box>
                            <Avatar sx={{ bgcolor: alpha('#2e7d32', 0.12), color: '#2e7d32' }}>
                                <CheckCircle />
                            </Avatar>
                        </KPICard>
                    </Grid>
                </Grid>

                {/* Filter Toolbar Inputs */}
                <Box sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search by name, father name, text or category..."
                            value={filters.searchQuery}
                            onChange={(e) => setFilters(f => ({ ...f, searchQuery: e.target.value }))}
                            InputProps={{
                                startAdornment: <Search sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
                                endAdornment: filters.searchQuery ? (
                                    <IconButton size="small" onClick={() => setFilters(f => ({ ...f, searchQuery: '' }))}>
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                ) : null
                            }}
                        />

                        {/* Mobile Toggle Filters Button */}
                        <Button
                            size="small"
                            variant={hasActiveFilters ? "contained" : "outlined"}
                            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                            sx={{ display: { xs: 'flex', sm: 'none' }, whiteSpace: 'nowrap', textTransform: 'none', fontWeight: 700, minWidth: 90 }}
                        >
                            {hasActiveFilters ? 'Filters *' : 'Filters'}
                        </Button>
                    </Box>

                    {/* Filter Dropdowns (Collapsible on Mobile, Always Visible on Desktop) */}
                    <Collapse in={mobileFiltersOpen} sx={{ display: { xs: 'block', sm: 'none' }, mt: 1 }}>
                        <Grid container spacing={1.5}>
                            <Grid item xs={6}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Category</InputLabel>
                                    <Select
                                        label="Category"
                                        value={filters.category_id}
                                        onChange={(e) => setFilters(f => ({ ...f, category_id: e.target.value }))}
                                    >
                                        <MenuItem value="">All Active Categories</MenuItem>
                                        {categoriesWithReports.map(c => (
                                            <MenuItem key={c.id} value={c.id.toString()}>{c.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={6}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        label="Status"
                                        value={filters.status}
                                        onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                                    >
                                        <MenuItem value="">All Statuses</MenuItem>
                                        <MenuItem value="pending">Pending</MenuItem>
                                        <MenuItem value="in_review">In Review</MenuItem>
                                        <MenuItem value="resolved">Resolved</MenuItem>
                                        <MenuItem value="dismissed">Dismissed</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={6}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Reported By</InputLabel>
                                    <Select
                                        label="Reported By"
                                        value={filters.reported_by}
                                        onChange={(e) => setFilters(f => ({ ...f, reported_by: e.target.value }))}
                                    >
                                        <MenuItem value="">All Reporters</MenuItem>
                                        {reportersList.map(r => (
                                            <MenuItem key={r.id} value={r.id.toString()}>{r.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            {(subjectTab === 'student' || subjectTab === 'all') && (
                                <Grid item xs={6}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Class</InputLabel>
                                        <Select
                                            label="Class"
                                            value={filters.class_id}
                                            onChange={(e) => setFilters(f => ({ ...f, class_id: e.target.value }))}
                                        >
                                            <MenuItem value="">All Classes</MenuItem>
                                            {classList.map(cls => (
                                                <MenuItem key={cls.id} value={cls.id.toString()}>{cls.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}

                            {hasActiveFilters && (
                                <Grid item xs={12}>
                                    <Button 
                                        size="small" 
                                        color="error" 
                                        startIcon={<ClearIcon />} 
                                        onClick={resetFilters}
                                        sx={{ textTransform: 'none', fontWeight: 600 }}
                                    >
                                        Reset Filters
                                    </Button>
                                </Grid>
                            )}
                        </Grid>
                    </Collapse>

                    {/* Desktop Always Visible Filter Dropdowns */}
                    <Grid container spacing={1.5} alignItems="center" sx={{ mt: 0.5, display: { xs: 'none', sm: 'flex' } }}>
                        <Grid item sm={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Category</InputLabel>
                                <Select
                                    label="Category"
                                    value={filters.category_id}
                                    onChange={(e) => setFilters(f => ({ ...f, category_id: e.target.value }))}
                                >
                                    <MenuItem value="">All Active Categories</MenuItem>
                                    {categoriesWithReports.map(c => (
                                        <MenuItem key={c.id} value={c.id.toString()}>{c.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item sm={2.5}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Status</InputLabel>
                                <Select
                                    label="Status"
                                    value={filters.status}
                                    onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                                >
                                    <MenuItem value="">All Statuses</MenuItem>
                                    <MenuItem value="pending">Pending</MenuItem>
                                    <MenuItem value="in_review">In Review</MenuItem>
                                    <MenuItem value="resolved">Resolved</MenuItem>
                                    <MenuItem value="dismissed">Dismissed</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item sm={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Reported By</InputLabel>
                                <Select
                                    label="Reported By"
                                    value={filters.reported_by}
                                    onChange={(e) => setFilters(f => ({ ...f, reported_by: e.target.value }))}
                                >
                                    <MenuItem value="">All Reporters</MenuItem>
                                    {reportersList.map(r => (
                                        <MenuItem key={r.id} value={r.id.toString()}>{r.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {(subjectTab === 'student' || subjectTab === 'all') && (
                            <Grid item sm={2.5}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Class</InputLabel>
                                    <Select
                                        label="Class"
                                        value={filters.class_id}
                                        onChange={(e) => setFilters(f => ({ ...f, class_id: e.target.value }))}
                                    >
                                        <MenuItem value="">All Classes</MenuItem>
                                        {classList.map(cls => (
                                            <MenuItem key={cls.id} value={cls.id.toString()}>{cls.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}

                        {hasActiveFilters && (
                            <Grid item sm="auto">
                                <Button 
                                    size="small" 
                                    color="error" 
                                    startIcon={<ClearIcon />} 
                                    onClick={resetFilters}
                                    sx={{ textTransform: 'none', fontWeight: 600 }}
                                >
                                    Reset Filters
                                </Button>
                            </Grid>
                        )}
                    </Grid>
                </Box>
            </Header>

            {/* Main Content Area */}
            <MainContent>
                <Grid container spacing={2.5}>
                    {sortedReports.unresolved.length === 0 && sortedReports.resolved.length === 0 ? (
                        <Grid item xs={12}>
                            <Paper sx={{ 
                                p: 6, 
                                textAlign: 'center', 
                                borderRadius: 4, 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.4) : '#ffffff'
                            }}>
                                <Avatar sx={{ width: 72, height: 72, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1), color: 'primary.main', mb: 2 }}>
                                    <Assignment sx={{ fontSize: 36 }} />
                                </Avatar>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                                    No Complaints Found
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: 3 }}>
                                    {hasActiveFilters 
                                        ? 'No complaint records match your active search or filter criteria. Try resetting your filters.' 
                                        : 'No complaint reports logged yet. Get started by creating a new complaint report.'}
                                </Typography>
                                {hasActiveFilters ? (
                                    <Button variant="outlined" onClick={resetFilters} startIcon={<ClearIcon />}>
                                        Clear Active Filters
                                    </Button>
                                ) : (
                                    <Button 
                                        variant="contained" 
                                        onClick={() => subjectTab === 'staff' ? setCreateEmployeeDialogOpen(true) : setCreateStudentDialogOpen(true)} 
                                        startIcon={<AddIcon />}
                                    >
                                        Log New Complaint
                                    </Button>
                                )}
                            </Paper>
                        </Grid>
                    ) : (
                        <>
                            {/* Unresolved Complaints Section */}
                            {sortedReports.unresolved.length > 0 && (
                                <>
                                    <Grid item xs={12}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 1 }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'warning.main', letterSpacing: '0.5px' }}>
                                                UNRESOLVED COMPLAINTS ({sortedReports.unresolved.length})
                                            </Typography>
                                            <Divider sx={{ flex: 1 }} />
                                        </Box>
                                    </Grid>
                                    {sortedReports.unresolved.map(renderReportCard)}
                                </>
                            )}

                            {/* Resolved Complaints Section */}
                            {sortedReports.resolved.length > 0 && (
                                <>
                                    <Grid item xs={12}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3, mb: 1 }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'success.main', letterSpacing: '0.5px' }}>
                                                RESOLVED / DISMISSED ({sortedReports.resolved.length})
                                            </Typography>
                                            <Divider sx={{ flex: 1 }} />
                                        </Box>
                                    </Grid>
                                    {sortedReports.resolved.map(renderReportCard)}
                                </>
                            )}
                        </>
                    )}
                </Grid>

                {/* Dialogs */}
                {/* Delete Dialog */}
                <StyledDialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm">
                    <DialogHeader>
                        <WarningAvatar><WarningIcon /></WarningAvatar>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>Confirm Delete</Typography>
                    </DialogHeader>
                    <DialogContent sx={{ pt: 2, pb: 2 }}>
                        <Typography variant="body1">
                            Are you sure you want to delete Report #{reportToDelete?.id}? This action cannot be undone.
                        </Typography>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, gap: 1 }}>
                        <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">Cancel</Button>
                        <Button onClick={handleDeleteConfirm} variant="contained" color="error" disabled={deleteLoading}>
                            {deleteLoading ? 'Deleting...' : 'Delete Report'}
                        </Button>
                    </DialogActions>
                </StyledDialog>

                {/* Create Student Report Form Modal */}
                <CreateStudentReportForm
                    open={createStudentDialogOpen}
                    onCancel={() => setCreateStudentDialogOpen(false)}
                    onSubmit={handleCreateReport}
                />

                {/* Create Employee Report Form Modal */}
                <CreateEmployeeReportForm
                    open={createEmployeeDialogOpen}
                    onCancel={() => setCreateEmployeeDialogOpen(false)}
                    onSubmit={handleCreateReport}
                />

                {/* Edit Report Details Form Modal */}
                {editingReport?.id && (
                    <EditReportForm
                        open={true}
                        onClose={() => setEditingReport(undefined)}
                        onSubmit={handleEditSubmit}
                        categories={categories}
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

                {/* Modify Report Status Modal */}
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

                {/* Manage Categories Modal */}
                <ManageCategoriesModal
                    open={manageCategoriesOpen}
                    onClose={() => setManageCategoriesOpen(false)}
                    categories={categories}
                    onRefreshCategories={async () => {
                        await loadCategories();
                        await loadReports();
                    }}
                />
            </MainContent>
        </PageContainer>
    );
};
