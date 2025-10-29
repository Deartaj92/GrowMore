import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    FormControl,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Typography,
    TextField
} from '@mui/material';
import { 
    Add as AddIcon,
    Print as PrintIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Assessment as AssessmentIcon,
    School as SchoolIcon,
    Class as ClassIcon,
    CalendarToday as CalendarIcon,
    Person as PersonIcon,
    Grade as GradeIcon,
    FilterList as FilterIcon,
    Clear as ClearIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/useToast';
import { reportCardService } from '../services/reportCardService';
import { ReportCard } from '../types/reportCards';

const ReportCards: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [reportCards, setReportCards] = useState<ReportCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        type: '',
        term: '',
        status: '' as '' | 'draft' | 'published' | 'archived',
        searchQuery: ''
    });

    useEffect(() => {
        loadReportCards();
    }, [filters]);

    const loadReportCards = async () => {
        try {
            setLoading(true);
            const data = await reportCardService.getReportCards({
                status: filters.status || undefined
            });
            setReportCards(data);
        } catch (error) {
            console.error('Error loading report cards:', error);
            showToast('Failed to load report cards', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this report card?')) return;

        try {
            await reportCardService.deleteReportCard(id);
            setReportCards(prev => prev.filter(rc => rc.id !== id));
            showToast('Report card deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting report card:', error);
            showToast('Failed to delete report card', 'error');
        }
    };

    const filteredReportCards = reportCards.filter(rc => {
        const typeMatch = !filters.type || (rc.student ? 'student' : 'staff') === filters.type;
        const termMatch = !filters.term || rc.term === filters.term;
        const statusMatch = !filters.status || rc.status === filters.status;
        const searchMatch = !filters.searchQuery || (
            (rc.student?.name?.toLowerCase() || '').includes(filters.searchQuery.toLowerCase()) ||
            (rc.student?.father_name?.toLowerCase() || '').includes(filters.searchQuery.toLowerCase())
        );
        return typeMatch && termMatch && statusMatch && searchMatch;
    });

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <div style={{ textAlign: 'center', padding: '48px 0' }}>Loading...</div>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 4 
            }}>
                <Typography 
                    variant="h4" 
                    sx={{ 
                        fontWeight: 600,
                        color: (theme) => theme.palette.primary.main 
                    }}
                >
                    Report Cards Management
                </Typography>
                <Box>
                    <IconButton 
                        onClick={() => setShowFilters(!showFilters)} 
                        sx={{ 
                            mr: 2,
                            bgcolor: (theme) => theme.palette.action.hover
                        }}
                    >
                        <FilterIcon />
                    </IconButton>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/report-cards/create')}
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            px: 3
                        }}
                    >
                        New Report Card
                    </Button>
                </Box>
            </Box>

            {showFilters && (
                <Paper 
                    elevation={0} 
                    sx={{ 
                        mb: 4,
                        p: 3,
                        borderRadius: 2,
                        bgcolor: (theme) => theme.palette.background.default
                    }}
                >
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                label="Search by Name"
                                value={filters.searchQuery}
                                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                                placeholder="Student or Father's Name"
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Type</InputLabel>
                                <Select
                                    value={filters.type}
                                    label="Type"
                                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                >
                                    <MenuItem value="">All</MenuItem>
                                    <MenuItem value="student">Student</MenuItem>
                                    <MenuItem value="staff">Staff</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Term</InputLabel>
                                <Select
                                    value={filters.term}
                                    label="Term"
                                    onChange={(e) => setFilters({ ...filters, term: e.target.value })}
                                >
                                    <MenuItem value="">All Terms</MenuItem>
                                    <MenuItem value="First Term">First Term</MenuItem>
                                    <MenuItem value="Second Term">Second Term</MenuItem>
                                    <MenuItem value="Final Term">Final Term</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={filters.status}
                                    label="Status"
                                    onChange={(e) => setFilters({ 
                                        ...filters, 
                                        status: e.target.value as "" | "draft" | "published" | "archived"
                                    })}
                                >
                                    <MenuItem value="">All</MenuItem>
                                    <MenuItem value="draft">Draft</MenuItem>
                                    <MenuItem value="published">Published</MenuItem>
                                    <MenuItem value="archived">Archived</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </Paper>
            )}

            <Grid container spacing={3}>
                {filteredReportCards.map((rc) => (
                    <Grid item xs={12} key={rc.id}>
                        <Card 
                            elevation={0}
                            sx={{ 
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'divider',
                                '&:hover': {
                                    boxShadow: (theme) => theme.shadows[2]
                                },
                                transition: 'box-shadow 0.3s ease-in-out'
                            }}
                        >
                            {/* ... rest of the card content ... */}
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default ReportCards; 