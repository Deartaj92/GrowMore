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

// Styled components
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

// Update the selectMenuProps configuration
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
                },
                // Firefox specific styling
                '@supports (-moz-appearance: none)': {
                    scrollbarWidth: 'thin',
                    scrollbarColor: (theme: Theme) => theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.2) transparent'
                        : 'rgba(0, 0, 0, 0.2) transparent'
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
    subject_type: 'student' | 'staff';
    student_id?: number;
    staff_id?: number;
    description: string;
    severity: ReportSeverity;
    created_at: Dayjs;
    class_id: number;
    section_id: number;
}

interface CreateReportFormProps {
    open: boolean;
    onCancel: () => void;
    onSubmit: (data: CreateReportDTO) => Promise<void>;
    initialData?: Report;
}

export const CreateReportForm: React.FC<CreateReportFormProps> = ({
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
    const [selectedType, setSelectedType] = useState<'student' | 'staff'>(initialData?.subject_type || 'student');
    const [loading, setLoading] = useState(false);
    
    // State for dropdowns
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [staffMembers, setStaffMembers] = useState<any[]>([]);
    
    const [formData, setFormData] = useState<FormData>({
        category_id: initialData?.category_id || 0,
        subject_type: initialData?.subject_type || 'student',
        student_id: initialData?.student_id || undefined,
        staff_id: initialData?.staff_id || undefined,
        description: initialData?.description || '',
        severity: initialData?.severity || 'low',
        created_at: initialData?.created_at ? dayjs(initialData.created_at) : dayjs(),
        class_id: 0,
        section_id: 0
    });

    useEffect(() => {
        if (initialData) {
            setSelectedType(initialData.subject_type);
            setFormData({
                category_id: initialData.category_id,
                subject_type: initialData.subject_type,
                student_id: initialData.student_id,
                staff_id: initialData.staff_id,
                description: initialData.description,
                severity: initialData.severity,
                created_at: dayjs(initialData.created_at),
                class_id: 0,
                section_id: 0
            });
        }
    }, [initialData]);

    useEffect(() => {
        loadCategories();
        loadClasses();
        loadStaff();
    }, [selectedType]);

    useEffect(() => {
        if (formData.class_id) {
            loadSections(formData.class_id);
        } else {
            setSections([]);
        }
    }, [formData.class_id]);

    useEffect(() => {
        if (formData.class_id && formData.section_id) {
            loadStudents(formData.class_id, formData.section_id);
        } else {
            setStudents([]);
        }
    }, [formData.class_id, formData.section_id]);

    useEffect(() => {
        if (user?.role === 'Teacher') {
            setSelectedType('student');
            setFormData((prev) => ({ ...prev, subject_type: 'student' }));
        }
    }, [user?.role]);

    const loadCategories = async () => {
        try {
            const data = await reportService.getCategories(selectedType, user?.school_id);
            setCategories(data);
        } catch (error) {
            showToast('Failed to load categories', 'error');
            console.error('Error loading categories:', error);
        }
    };

    const loadClasses = async () => {
        try {
            const data = await reportService.getClasses(user?.school_id);
            setClasses(data);
        } catch (error) {
            showToast('Failed to load classes', 'error');
            console.error('Error loading classes:', error);
        }
    };

    const loadSections = async (classId: number) => {
        try {
            const data = await reportService.getSections(classId, user?.school_id);
            setSections(data);
        } catch (error) {
            showToast('Failed to load sections', 'error');
            console.error('Error loading sections:', error);
        }
    };

    const loadStudents = async (classId: number, sectionId: number) => {
        try {
            const data = await reportService.getStudents(classId, sectionId, user?.school_id);
            setStudents(data);
        } catch (error) {
            showToast('Failed to load students', 'error');
            console.error('Error loading students:', error);
        }
    };

    const loadStaff = async () => {
        try {
            const data = await reportService.getStaff(user?.school_id);
            setStaffMembers(data);
        } catch (error) {
            showToast('Failed to load staff members', 'error');
            console.error('Error loading staff:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (loading) return; // Prevent multiple submissions
        
        if (!formData.category_id || !formData.description.trim()) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        setLoading(true);
        try {
            const reportData: CreateReportDTO = {
                category_id: formData.category_id,
                description: formData.description.trim(),
                severity: formData.severity,
                created_at: formData.created_at.toISOString(),
                subject_type: selectedType,
                student_id: selectedType === 'student' ? formData.student_id : undefined,
                staff_id: selectedType === 'staff' ? formData.staff_id : undefined
            };

            await onSubmit(reportData);
            handleClose();
        } catch (error: any) {
            console.error('Error submitting report:', error);
            showToast(error.message || 'Error creating report', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleTypeChange = (type: 'student' | 'staff') => {
        setSelectedType(type);
        setFormData({
            ...formData,
            subject_type: type,
            category_id: 0,
            student_id: undefined,
            staff_id: undefined,
            class_id: 0,
            section_id: 0
        });
        showToast(`Switched to ${type} report`, 'success');
    };

    const handleClose = () => {
        setFormData({
            category_id: 0,
            subject_type: 'student',
            description: '',
            severity: 'low',
            created_at: dayjs(),
            class_id: 0,
            section_id: 0
        });
        setSelectedType('student');
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
                    {initialData ? 'Edit Report' : 'Create New Report'}
                </DialogTitle>
                <IconButton onClick={handleClose} size="small">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogHeader>

            <StyledDialogContent>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Report Type</InputLabel>
                            <Select
                                value={selectedType}
                                label="Report Type"
                                onChange={(e) => handleTypeChange(e.target.value as 'student' | 'staff')}
                                disabled={user?.role === 'Teacher'}
                            >
                                <MenuItem value="student">Student Report</MenuItem>
                                {user?.role !== 'Teacher' && (
                                <MenuItem value="staff">Staff Report</MenuItem>
                                )}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Category</InputLabel>
                            <Select
                                value={formData.category_id ? formData.category_id.toString() : ''}
                                label="Category"
                                onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
                                required
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

                    {selectedType === 'student' ? (
                        <>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Class</InputLabel>
                                    <Select
                                        value={formData.class_id ? formData.class_id.toString() : ''}
                                        label="Class"
                                        onChange={(e) => setFormData({ 
                                            ...formData, 
                                            class_id: Number(e.target.value), 
                                            section_id: 0,
                                            student_id: undefined
                                        })}
                                        required
                                    >
                                        <MenuItem value="">Select Class</MenuItem>
                                        {classes.map((cls) => (
                                            <MenuItem key={cls.id} value={cls.id.toString()}>
                                                {cls.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Section</InputLabel>
                                    <Select
                                        value={formData.section_id ? formData.section_id.toString() : ''}
                                        label="Section"
                                        onChange={(e) => setFormData({ 
                                            ...formData, 
                                            section_id: Number(e.target.value),
                                            student_id: undefined
                                        })}
                                        required
                                        disabled={!formData.class_id}
                                    >
                                        <MenuItem value="">Select Section</MenuItem>
                                        {sections.map((section) => (
                                            <MenuItem key={section.id} value={section.id.toString()}>
                                                {section.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Student</InputLabel>
                                    <Select
                                        value={formData.student_id ? formData.student_id.toString() : ''}
                                        label="Student"
                                        onChange={(e) => setFormData({ 
                                            ...formData, 
                                            student_id: Number(e.target.value) 
                                        })}
                                        required
                                        disabled={!formData.section_id}
                                        MenuProps={selectMenuProps}
                                    >
                                        <MenuItem value="">Select Student</MenuItem>
                                        {students.map((student) => (
                                            <MenuItem key={student.id} value={student.id.toString()}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}>
                                                    <Avatar 
                                                        src={student.picture_url || undefined} 
                                                        sx={{ width: 40, height: 40 }}
                                                    >
                                                        {!student.picture_url && student.name && student.name.charAt(0).toUpperCase()}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                                                            {student.name}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                                                            {student.father_name || 'N/A'}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ marginLeft: 'auto', textAlign: 'right' }}>
                                                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                                                            ID: {student.id}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                                                            {student.address || 'No address'}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </>
                    ) : (
                        <Grid item xs={12}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Staff Member</InputLabel>
                                <Select
                                    value={formData.staff_id ? formData.staff_id.toString() : ''}
                                    label="Staff Member"
                                    onChange={(e) => setFormData({ ...formData, staff_id: Number(e.target.value) })}
                                    required
                                    MenuProps={selectMenuProps}
                                >
                                    <MenuItem value="">Select Staff Member</MenuItem>
                                    {staffMembers.map((staff) => (
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
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    )}

                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Severity</InputLabel>
                            <Select
                                value={formData.severity}
                                label="Severity"
                                onChange={(e) => setFormData({ ...formData, severity: e.target.value as ReportSeverity })}
                                required
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