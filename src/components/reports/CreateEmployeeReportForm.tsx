import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
    Dialog,
    DialogContent,
    IconButton,
    useTheme,
    useMediaQuery,
    styled,
    Avatar
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { reportService } from '../../utils/reportService';
import { Report, ReportCategory, CreateReportDTO, ReportSeverity } from '../../types/reports';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/useToast';
import dayjs, { Dayjs } from 'dayjs';
import { Theme } from '@mui/material/styles';
import { supabase } from '../../supabaseClient';

// Styled components (same as CreateStudentReportForm)
const StyledDialog = styled(Dialog)(({ theme }) => ({
    zIndex: 1300,
    '& .MuiDialog-paper': {
        borderRadius: '16px',
        background: theme.palette.mode === 'dark' 
            ? theme.palette.background.paper 
            : theme.palette.background.paper,
        maxWidth: '600px',
        width: '95%',
        margin: '84px 16px 16px',
        overflow: 'hidden',
        boxShadow: theme.palette.mode === 'dark'
            ? '0 0 40px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.4)'
            : '0 0 40px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.1)',
        border: theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.05)'
            : '1px solid rgba(0, 0, 0, 0.05)',
        transform: 'translateY(0)',
        transition: 'all 0.3s ease-in-out',
        position: 'relative',
        zIndex: 1301,
        [theme.breakpoints.down('sm')]: {
            width: 'calc(100% - 32px)',
            height: 'calc(100% - 96px)',
            margin: '76px 16px 20px',
            borderRadius: '16px',
            maxHeight: 'calc(100% - 96px)'
        }
    },
    '& .MuiBackdrop-root': {
        backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(0, 0, 0, 0.5)'
            : 'rgba(255, 255, 255, 0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        position: 'fixed',
        zIndex: 1300
    }
}));

const DialogHeader = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: `1px solid ${theme.palette.mode === 'dark' 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'rgba(0, 0, 0, 0.05)'}`,
    background: theme.palette.mode === 'dark'
        ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
        : 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
    backdropFilter: 'blur(8px)',
    position: 'relative',
    zIndex: 1
}));

const DialogTitle = styled(Typography)(({ theme }) => ({
    fontSize: '1.5rem',
    fontWeight: 600,
    color: theme.palette.mode === 'dark'
        ? theme.palette.primary.light
        : theme.palette.primary.main,
    textShadow: theme.palette.mode === 'dark'
        ? '0 2px 4px rgba(0, 0, 0, 0.5)'
        : 'none'
}));

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxHeight: 'calc(100vh - 180px)',
    overflowY: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.2) transparent'
        : 'rgba(0, 0, 0, 0.2) transparent',
    '&::-webkit-scrollbar': {
        width: '8px',
        backgroundColor: 'transparent'
    },
    '&::-webkit-scrollbar-track': {
        background: 'transparent',
        borderRadius: '4px',
        margin: '4px'
    },
    '&::-webkit-scrollbar-thumb': {
        backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.2)'
            : 'rgba(0, 0, 0, 0.2)',
        borderRadius: '4px',
        border: `2px solid ${theme.palette.mode === 'dark'
            ? theme.palette.background.paper
            : theme.palette.background.paper}`,
        '&:hover': {
            backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.3)'
                : 'rgba(0, 0, 0, 0.3)'
        }
    },
    background: theme.palette.mode === 'dark'
        ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 100%)'
        : 'linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 100%)',
    '& .MuiFormControl-root': {
        transition: 'background-color 0.2s ease',
    },
    '& .MuiInputBase-root': {
        background: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.03)'
            : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(8px)',
        borderRadius: '8px',
        border: theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.05)'
            : '1px solid rgba(0, 0, 0, 0.05)',
        transition: 'background-color 0.2s ease',
        '&:hover, &.Mui-focused': {
            background: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.05)'
                : 'rgba(255, 255, 255, 0.9)',
        },
        '& .MuiSelect-select, & .MuiInputBase-input': {
            padding: '12px 14px',
            fontSize: '0.95rem',
            '&::placeholder': {
                color: theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.3)'
                    : 'rgba(0, 0, 0, 0.3)',
                opacity: 1
            }
        },
        '& .MuiOutlinedInput-notchedOutline': {
            border: 'none'
        }
    }
}));

const FormActions = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: `1px solid ${theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(0, 0, 0, 0.05)'}`,
    background: theme.palette.mode === 'dark'
        ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
        : 'linear-gradient(0deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
    '& .MuiButton-root': {
        borderRadius: '8px',
        textTransform: 'none',
        padding: '8px 20px',
        fontWeight: 500,
        transition: 'background-color 0.2s ease'
    }
}));

const selectMenuProps = {
    PaperProps: {
        sx: {
            maxHeight: 300,
            backgroundColor: (theme: Theme) => theme.palette.mode === 'dark' 
                ? theme.palette.background.paper
                : theme.palette.background.paper,
            '& .MuiList-root': {
                padding: '4px 0',
                maxHeight: 300,
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: (theme: Theme) => theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.2) transparent'
                    : 'rgba(0, 0, 0, 0.2) transparent',
                '&::-webkit-scrollbar': {
                    width: '12px',
                    background: 'transparent'
                },
                '&::-webkit-scrollbar-track': {
                    background: 'transparent'
                },
                '&::-webkit-scrollbar-thumb': {
                    backgroundColor: (theme: Theme) => theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.2)'
                        : 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '6px',
                    border: (theme: Theme) => `3px solid ${theme.palette.mode === 'dark' 
                        ? theme.palette.background.paper 
                        : theme.palette.background.paper}`,
                    '&:hover': {
                        backgroundColor: (theme: Theme) => theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.3)'
                            : 'rgba(0, 0, 0, 0.3)'
                    }
                }
            },
            '& .MuiMenuItem-root': {
                padding: '10px 14px',
                fontSize: '0.95rem',
                transition: 'all 0.2s ease',
                '&:hover': {
                    backgroundColor: (theme: Theme) => theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.08)'
                        : theme.palette.action.hover
                },
                '&.Mui-selected': {
                    backgroundColor: (theme: Theme) => theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.16)'
                        : theme.palette.action.selected,
                    fontWeight: 500,
                    '&:hover': {
                        backgroundColor: (theme: Theme) => theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.24)'
                            : theme.palette.action.selected
                    }
                }
            }
        }
    },
    MenuListProps: {
        style: {
            padding: 0
        }
    },
    anchorOrigin: {
        vertical: 'bottom' as const,
        horizontal: 'left' as const
    },
    transformOrigin: {
        vertical: 'top' as const,
        horizontal: 'left' as const
    }
};

interface FormData {
    category_id: number;
    staff_id?: number;
    description: string;
    severity: ReportSeverity;
    created_at: Dayjs;
}

interface CreateEmployeeReportFormProps {
    open: boolean;
    onCancel: () => void;
    onSubmit: (data: CreateReportDTO) => Promise<void>;
    initialData?: Report;
}

export const CreateEmployeeReportForm: React.FC<CreateEmployeeReportFormProps> = ({
    open,
    onCancel,
    onSubmit,
    initialData
}) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const { user } = useAuth();
    const { showToast } = useToast();
    const [categories, setCategories] = useState<ReportCategory[]>([]);
    const [staffMembers, setStaffMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingStaff, setLoadingStaff] = useState(false);
    
    const [formData, setFormData] = useState<FormData>({
        category_id: initialData?.category_id || 0,
        staff_id: initialData?.staff_id || undefined,
        description: initialData?.description || '',
        severity: initialData?.severity || 'low',
        created_at: initialData?.created_at ? dayjs(initialData.created_at) : dayjs()
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                category_id: initialData.category_id,
                staff_id: initialData.staff_id,
                description: initialData.description,
                severity: initialData.severity,
                created_at: dayjs(initialData.created_at)
            });
        }
    }, [initialData]);

    useEffect(() => {
        loadCategories();
        loadStaff();
    }, []);

    const loadCategories = async () => {
        try {
            const data = await reportService.getCategories('staff', user?.school_id);
            setCategories(data);
        } catch (error) {
            showToast('Failed to load categories', 'error');
        }
    };

    const loadStaff = async () => {
        setLoadingStaff(true);
        try {
            // Fetch staff with picture_url
            const { data, error } = await supabase
                .from('staff')
                .select(`
                    id,
                    name,
                    role,
                    father_name,
                    mobile,
                    picture_url
                `)
                .eq('school_id', user?.school_id || 0)
                .order('name');
            
            if (error) throw error;
            setStaffMembers(data || []);
        } catch (error) {
            showToast('Failed to load staff members', 'error');
        } finally {
            setLoadingStaff(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (loading) return;
        
        if (!formData.category_id || !formData.description.trim()) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        
        if (!formData.staff_id) {
            showToast('Please select a staff member', 'error');
            return;
        }

        setLoading(true);
        try {
            const reportData: CreateReportDTO = {
                category_id: formData.category_id,
                description: formData.description.trim(),
                severity: formData.severity,
                created_at: formData.created_at.toISOString(),
                subject_type: 'staff',
                student_id: undefined,
                staff_id: formData.staff_id
            };

            await onSubmit(reportData);
            handleClose();
        } catch (error: any) {
            showToast(error.message || 'Error creating report', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            category_id: 0,
            description: '',
            severity: 'low',
            created_at: dayjs()
        });
        onCancel();
    };

    return (
        <StyledDialog
            open={open}
            onClose={handleClose}
            fullScreen={fullScreen}
            maxWidth="sm"
            slotProps={{
                backdrop: {
                    sx: {
                        position: 'fixed',
                        zIndex: 1300
                    }
                }
            }}
            PaperProps={{
                sx: {
                    maxHeight: {
                        xs: 'calc(100% - 96px)',
                        sm: 'calc(100% - 100px)'
                    }
                }
            }}
        >
            <DialogHeader>
                <DialogTitle>
                    {initialData ? 'Edit Employee Report' : 'Create Employee Report'}
                </DialogTitle>
                <IconButton onClick={handleClose} size="small">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogHeader>

            <StyledDialogContent>
                <Grid container spacing={2}>
                    {/* Row 1: Category - Expanded */}
                    <Grid item xs={12}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Category</InputLabel>
                            <Select
                                value={formData.category_id ? formData.category_id.toString() : ''}
                                label="Category"
                                onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
                                required
                                MenuProps={selectMenuProps}
                            >
                                <MenuItem value="">Select Category</MenuItem>
                                {categories.map((category) => (
                                    <MenuItem key={category.id} value={category.id.toString()}>
                                        {category.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Staff Member</InputLabel>
                            <Select
                                value={formData.staff_id ? formData.staff_id.toString() : ''}
                                label="Staff Member"
                                onChange={(e) => setFormData({ ...formData, staff_id: Number(e.target.value) })}
                                required
                                disabled={loadingStaff}
                                MenuProps={selectMenuProps}
                            >
                                <MenuItem value="">Select Staff Member</MenuItem>
                                {loadingStaff ? (
                                    <MenuItem disabled>Loading staff members...</MenuItem>
                                ) : (
                                    staffMembers.map((staff) => (
                                        <MenuItem key={staff.id} value={staff.id.toString()}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}>
                                                <Avatar 
                                                    src={staff.picture_url || undefined} 
                                                    sx={{ width: 40, height: 40 }}
                                                >
                                                    {!staff.picture_url && staff.name && staff.name.charAt(0).toUpperCase()}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                                                        {staff.name}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                                                        {staff.role || 'N/A'}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ marginLeft: 'auto', textAlign: 'right' }}>
                                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                                                        ID: {staff.id}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </MenuItem>
                                    ))
                                )}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Severity</InputLabel>
                            <Select
                                value={formData.severity}
                                label="Severity"
                                onChange={(e) => setFormData({ ...formData, severity: e.target.value as ReportSeverity })}
                                required
                                MenuProps={selectMenuProps}
                            >
                                <MenuItem value="low">Low</MenuItem>
                                <MenuItem value="medium">Medium</MenuItem>
                                <MenuItem value="high">High</MenuItem>
                                <MenuItem value="urgent">Urgent</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <DateTimePicker
                            label="Created At"
                            value={formData.created_at}
                            onChange={(newValue) => {
                                if (newValue) {
                                    setFormData({ ...formData, created_at: newValue });
                                }
                            }}
                            slotProps={{ 
                                popper: {
                                    sx: { zIndex: 2000, minWidth: 240, maxWidth: 300 }
                                },
                                textField: { 
                                    fullWidth: true,
                                    required: true,
                                    size: "small"
                                } 
                            }}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            label="Description"
                            multiline
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                            fullWidth
                            size="small"
                        />
                    </Grid>
                </Grid>
            </StyledDialogContent>

            <FormActions>
                <Button 
                    onClick={handleClose}
                    variant="outlined"
                    size="small"
                    sx={{ 
                        borderRadius: '6px',
                        textTransform: 'none',
                        px: 2
                    }}
                >
                    Cancel
                </Button>
                <Button 
                    onClick={handleSubmit}
                    variant="contained"
                    size="small"
                    disabled={loading}
                    sx={{ 
                        borderRadius: '6px',
                        textTransform: 'none',
                        px: 2
                    }}
                >
                    {loading ? 'Creating...' : (initialData ? 'Update Report' : 'Create Report')}
                </Button>
            </FormActions>
        </StyledDialog>
    );
};

