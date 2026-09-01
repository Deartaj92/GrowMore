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
    Avatar,
    Paper,
    Chip,
    CircularProgress,
    Checkbox,
    Stepper,
    Step,
    StepLabel,
    StepConnector,
    stepConnectorClasses,
    keyframes
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { 
    Close as CloseIcon, 
    SupervisorAccount as StaffIcon, 
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Tag as TagIcon,
    Description as DescriptionIcon,
    SelectAll as SelectAllIcon,
    ClearAll as ClearAllIcon,
    CheckBoxOutlineBlank,
    CheckBox as CheckBoxIcon,
    Category as CategoryIcon,
    Speed as SpeedIcon,
    CalendarToday as CalendarIcon,
    ArrowBack as ArrowBackIcon,
    ArrowForward as ArrowForwardIcon,
    RateReview as ReviewIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { reportService } from '../../utils/reportService';
import { Report, ReportCategory, CreateReportDTO, ReportSeverity } from '../../types/reports';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/useToast';
import dayjs, { Dayjs } from 'dayjs';
import { Theme, alpha } from '@mui/material/styles';
import { supabase } from '../../supabaseClient';

const icon = <CheckBoxOutlineBlank fontSize="small" />;

// Shake Keyframe Animation
const shakeKeyframes = keyframes`
  0%, 100% { transform: translateX(0); }
  15%, 45%, 75% { transform: translateX(-6px); }
  30%, 60%, 90% { transform: translateX(6px); }
`;

const FieldContainer = styled(Box)<{ $shaking?: boolean }>(({ $shaking }) => ({
    animation: $shaking ? `${shakeKeyframes} 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both` : 'none',
    transition: 'transform 0.2s ease',
}));

// Custom Stepper Connector using Theme Tokens
const ColorConnector = styled(StepConnector)(({ theme }) => ({
    [`&.${stepConnectorClasses.alternativeLabel}`]: {
        top: 22,
    },
    [`&.${stepConnectorClasses.active}`]: {
        [`& .${stepConnectorClasses.line}`]: {
            background: `linear-gradient(90deg, ${theme.palette.secondary.main || '#0d9488'} 0%, ${theme.palette.secondary.light || '#10b981'} 100%)`,
        },
    },
    [`&.${stepConnectorClasses.completed}`]: {
        [`& .${stepConnectorClasses.line}`]: {
            background: theme.palette.success.main,
        },
    },
    [`& .${stepConnectorClasses.line}`]: {
        height: 3,
        border: 0,
        backgroundColor: theme.palette.divider,
        borderRadius: 1,
    },
}));

// Custom Step Icon using Theme Tokens
const StepIconRoot = styled('div')<{ ownerState: { active?: boolean; completed?: boolean } }>(
    ({ theme, ownerState }) => ({
        backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.8) : theme.palette.action.hover,
        zIndex: 1,
        color: theme.palette.text.secondary,
        width: 36,
        height: 36,
        display: 'flex',
        borderRadius: '50%',
        justifyContent: 'center',
        alignItems: 'center',
        border: `2px solid ${theme.palette.divider}`,
        fontWeight: 800,
        fontSize: '0.85rem',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ...(ownerState.active && {
            background: `linear-gradient(135deg, ${theme.palette.secondary.dark || '#065f46'} 0%, ${theme.palette.secondary.main || '#0d9488'} 100%)`,
            color: '#ffffff',
            borderColor: theme.palette.secondary.main || '#0d9488',
            boxShadow: `0 4px 14px ${alpha(theme.palette.secondary.main || '#0d9488', 0.4)}`,
            transform: 'scale(1.08)'
        }),
        ...(ownerState.completed && {
            backgroundColor: theme.palette.success.main,
            color: '#ffffff',
            borderColor: theme.palette.success.main,
            boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.3)}`
        }),
    }),
);

function CustomStepIcon(props: { active?: boolean; completed?: boolean; icon: React.ReactNode }) {
    const { active, completed, icon } = props;

    const icons: { [index: string]: React.ReactElement } = {
        1: <StaffIcon style={{ fontSize: 18 }} />,
        2: <DescriptionIcon style={{ fontSize: 18 }} />,
        3: <ReviewIcon style={{ fontSize: 18 }} />,
    };

    return (
        <StepIconRoot ownerState={{ completed, active }}>
            {completed ? <CheckCircleIcon style={{ fontSize: 18 }} /> : icons[String(icon)]}
        </StepIconRoot>
    );
}

const StyledDialog = styled(Dialog)(({ theme }) => ({
    zIndex: 1100,
    '& .MuiDialog-container': {
        alignItems: 'center',
        justifyContent: 'center',
    },
    '& .MuiDialog-paper': {
        borderRadius: '20px',
        background: theme.palette.background.paper,
        maxWidth: '660px',
        width: '95%',
        margin: '72px 16px 60px 16px',
        maxHeight: 'calc(100vh - 132px)',
        overflow: 'hidden',
        boxShadow: theme.palette.mode === 'dark'
            ? '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)'
            : `0 20px 60px ${alpha(theme.palette.secondary.main || '#0d9488', 0.15)}, 0 0 0 1px ${alpha(theme.palette.divider, 0.8)}`,
        position: 'relative',
        zIndex: 1101,
        [theme.breakpoints.down('sm')]: {
            width: 'calc(100% - 20px)',
            margin: '68px 10px 56px 10px',
            maxHeight: 'calc(100vh - 124px)',
            borderRadius: '16px',
        }
    },
    '& .MuiBackdrop-root': {
        top: '64px',
        bottom: '52px',
        backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(15, 23, 42, 0.8)'
            : 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        position: 'fixed',
        zIndex: 1099
    }
}));

const DialogHeader = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 24px',
    background: theme.palette.mode === 'dark'
        ? `linear-gradient(135deg, ${alpha(theme.palette.secondary.dark || '#065f46', 0.9)} 0%, ${alpha(theme.palette.secondary.main || '#0d9488', 0.8)} 100%)`
        : `linear-gradient(135deg, ${theme.palette.secondary.dark || '#065f46'} 0%, ${theme.palette.secondary.main || '#0d9488'} 100%)`,
    color: '#ffffff',
    position: 'relative',
    zIndex: 1,
    boxShadow: `0 4px 20px ${alpha(theme.palette.secondary.main || '#0d9488', 0.25)}`
}));

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxHeight: 'calc(100vh - 250px)',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'thin',
    scrollbarColor: theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.2) transparent'
        : 'rgba(0, 0, 0, 0.2) transparent',
    '&::-webkit-scrollbar': {
        width: '6px',
        backgroundColor: 'transparent'
    },
    '&::-webkit-scrollbar-thumb': {
        backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.2)'
            : alpha(theme.palette.secondary.main || '#0d9488', 0.2),
        borderRadius: '3px'
    },
    [theme.breakpoints.down('sm')]: {
        padding: '16px',
        gap: '16px'
    },
    '& .MuiOutlinedInput-notchedOutline': {
        border: 'none'
    }
}));

const FormActions = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 24px',
    borderTop: `1px solid ${theme.palette.divider}`,
    background: theme.palette.mode === 'dark'
        ? alpha(theme.palette.background.default, 0.6)
        : theme.palette.background.default
}));

const SeverityCard = styled(Paper)<{ $selected?: boolean; $color: string }>(({ theme, $selected, $color }) => ({
    padding: '12px',
    borderRadius: '12px',
    border: `2px solid ${$selected ? $color : alpha(theme.palette.divider, 0.8)}`,
    background: $selected
        ? (theme.palette.mode === 'dark' ? alpha($color, 0.22) : alpha($color, 0.08))
        : (theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.6) : theme.palette.background.paper),
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: $selected ? `0 6px 18px ${alpha($color, 0.25)}` : 'none',
    '&:hover': {
        transform: 'translateY(-2px)',
        borderColor: $color,
        boxShadow: `0 6px 16px ${alpha($color, 0.2)}`
    }
}));

const STEPS = ['Select Staff', 'Incident Details', 'Review & Submit'];

interface FormData {
    category_id: number;
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
    const [activeStep, setActiveStep] = useState(0);
    const [touched, setTouched] = useState(false);
    const [shakingFields, setShakingFields] = useState<Record<string, boolean>>({});
    const [categories, setCategories] = useState<ReportCategory[]>([]);
    const [staffMembers, setStaffMembers] = useState<any[]>([]);
    const [selectedStaffMembers, setSelectedStaffMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingStaff, setLoadingStaff] = useState(false);
    
    const [formData, setFormData] = useState<FormData>({
        category_id: initialData?.category_id || 0,
        description: initialData?.description || '',
        severity: initialData?.severity || 'low',
        created_at: initialData?.created_at ? dayjs(initialData.created_at) : dayjs()
    });

    const checkedIcon = <CheckBoxIcon fontSize="small" sx={{ color: theme.palette.secondary.main || '#0d9488' }} />;

    const selectMenuProps = {
        PaperProps: {
            sx: {
                maxHeight: 280,
                borderRadius: '14px',
                marginTop: '6px',
                backgroundColor: theme.palette.background.paper,
                boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                border: `1px solid ${theme.palette.divider}`,
                '& .MuiMenuItem-root': {
                    padding: '10px 14px',
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    margin: '3px 6px',
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    '&:hover': {
                        backgroundColor: alpha(theme.palette.secondary.main || '#0d9488', 0.08),
                        color: theme.palette.secondary.main || '#0d9488'
                    },
                    '&.Mui-selected': {
                        backgroundColor: alpha(theme.palette.secondary.main || '#0d9488', 0.14),
                        color: theme.palette.secondary.main || '#0d9488',
                        fontWeight: 700
                    }
                }
            }
        }
    };

    const SEVERITY_CONFIG: Record<ReportSeverity, { label: string; color: string; desc: string }> = {
        low: { label: 'Low', color: theme.palette.success.main || '#10b981', desc: 'Minor issue / Routine note' },
        medium: { label: 'Medium', color: theme.palette.warning.main || '#f59e0b', desc: 'Standard complaint / Follow-up required' },
        high: { label: 'High', color: theme.palette.error.main || '#ef4444', desc: 'Serious misconduct / Escalated' },
        urgent: { label: 'Urgent', color: '#8b5cf6', desc: 'Critical incident / Immediate action' }
    };

    const QUICK_TAGS = [
        { tag: '#StaffPerformance', color: theme.palette.secondary.main || '#0d9488' },
        { tag: '#Attendance', color: theme.palette.warning.main },
        { tag: '#Conduct', color: '#7c3aed' },
        { tag: '#Misconduct', color: theme.palette.error.main },
        { tag: '#Communication', color: theme.palette.primary.main },
        { tag: '#Safety', color: theme.palette.success.main }
    ];

    useEffect(() => {
        if (initialData) {
            setFormData({
                category_id: initialData.category_id,
                description: initialData.description,
                severity: initialData.severity,
                created_at: dayjs(initialData.created_at)
            });
        }
    }, [initialData]);

    useEffect(() => {
        if (open) {
            setActiveStep(0);
            setTouched(false);
            setShakingFields({});
            loadCategories();
            loadStaff();
        }
    }, [open]);

    const triggerShake = (fieldName: string) => {
        setShakingFields(prev => ({ ...prev, [fieldName]: true }));
        setTimeout(() => {
            setShakingFields(prev => ({ ...prev, [fieldName]: false }));
        }, 500);
    };

    const loadCategories = async () => {
        try {
            const data = await reportService.getCategories('staff', user?.school_id);
            setCategories(data || []);
        } catch (error) {
            showToast('Failed to load categories', 'error');
        }
    };

    const loadStaff = async () => {
        setLoadingStaff(true);
        try {
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
            setSelectedStaffMembers([]);
        } catch (error) {
            showToast('Failed to load staff members', 'error');
        } finally {
            setLoadingStaff(false);
        }
    };

    const handleSelectAllStaff = () => {
        if (selectedStaffMembers.length === staffMembers.length) {
            setSelectedStaffMembers([]);
        } else {
            setSelectedStaffMembers([...staffMembers]);
        }
    };

    const handleRemoveStaff = (staffId: number) => {
        setSelectedStaffMembers(prev => prev.filter(s => s.id !== staffId));
    };

    const handleAddTag = (tag: string) => {
        setFormData(prev => {
            const trimmed = prev.description.trim();
            const newDesc = trimmed ? `${trimmed} ${tag}` : tag;
            return { ...prev, description: newDesc };
        });
    };

    // Validation Statuses
    const isCategoryValid = formData.category_id > 0;
    const isStaffValid = selectedStaffMembers.length > 0;
    const isDescriptionValid = formData.description.trim().length > 0;

    const validateStep = (step: number): boolean => {
        setTouched(true);
        if (step === 0) {
            let valid = true;
            if (!isCategoryValid) {
                triggerShake('category');
                valid = false;
            }
            if (!isStaffValid) {
                triggerShake('staff');
                valid = false;
            }
            if (!valid) {
                showToast('Please fill in all highlighted required fields', 'error');
            }
            return valid;
        }
        if (step === 1) {
            if (!isDescriptionValid) {
                triggerShake('description');
                showToast('Please enter a detailed description', 'error');
                return false;
            }
            return true;
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep(activeStep)) {
            setActiveStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setActiveStep(prev => prev - 1);
    };

    const handleSubmit = async () => {
        if (loading) return;
        
        if (!validateStep(0) || !validateStep(1)) return;

        setLoading(true);
        try {
            let count = 0;
            for (const staff of selectedStaffMembers) {
                const reportData: CreateReportDTO = {
                    category_id: formData.category_id,
                    description: formData.description.trim(),
                    severity: formData.severity,
                    created_at: formData.created_at.toISOString(),
                    subject_type: 'staff',
                    student_id: undefined,
                    staff_id: staff.id
                };

                await onSubmit(reportData);
                count++;
            }

            showToast(`Successfully created ${count} staff ${count === 1 ? 'report' : 'reports'}`, 'success');
            handleClose();
        } catch (error: any) {
            showToast(error.message || 'Error creating reports', 'error');
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
        setSelectedStaffMembers([]);
        setActiveStep(0);
        setTouched(false);
        setShakingFields({});
        onCancel();
    };

    const getInputSx = (isValid: boolean) => ({
        '& .MuiInputBase-root': {
            borderRadius: '12px',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            background: theme.palette.mode === 'dark' ? alpha(theme.palette.background.default, 0.6) : '#f8fafc',
            border: `1.5px solid ${
                isValid 
                    ? theme.palette.success.main 
                    : (touched ? theme.palette.error.main : theme.palette.divider)
            }`,
            boxShadow: isValid 
                ? `0 0 0 3px ${alpha(theme.palette.success.main, 0.15)}` 
                : (touched ? `0 0 0 3px ${alpha(theme.palette.error.main, 0.15)}` : 'none'),
            color: theme.palette.text.primary,
            '&:hover': {
                borderColor: isValid ? theme.palette.success.dark : (touched ? theme.palette.error.dark : (theme.palette.secondary.main || '#0d9488'))
            }
        }
    });

    const selectedCategory = categories.find(c => c.id === formData.category_id);

    return (
        <StyledDialog
            open={open}
            onClose={handleClose}
            fullScreen={false}
            maxWidth="sm"
        >
            {/* Header */}
            <DialogHeader>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8 }}>
                    <Avatar sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.2)', 
                        color: '#ffffff',
                        width: 44,
                        height: 44,
                        border: '2px solid rgba(255, 255, 255, 0.4)',
                    }}>
                        <StaffIcon fontSize="medium" />
                    </Avatar>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, color: '#ffffff' }}>
                            {initialData ? 'Edit Staff Report' : 'New Staff Complaint'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.85)', fontWeight: 600 }}>
                            Step {activeStep + 1} of {STEPS.length}: {STEPS[activeStep]}
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={handleClose} size="small" sx={{ color: '#ffffff', bgcolor: 'rgba(255, 255, 255, 0.15)', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.28)' } }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogHeader>

            {/* Stepper Progress Bar */}
            <Box sx={{ px: 3, pt: 2.5, pb: 1, bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.default, 0.6) : '#f8fafc', borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Stepper activeStep={activeStep} alternativeLabel connector={<ColorConnector />}>
                    {STEPS.map((label, index) => (
                        <Step key={label}>
                            <StepLabel StepIconComponent={(props) => <CustomStepIcon {...props} icon={index + 1} />}>
                                <Typography variant="caption" sx={{ fontWeight: activeStep === index ? 800 : 600, color: activeStep === index ? (theme.palette.secondary.main || '#0d9488') : theme.palette.text.secondary }}>
                                    {label}
                                </Typography>
                            </StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Box>

            <StyledDialogContent>
                {/* STEP 1: CATEGORY & STAFF SELECTION */}
                {activeStep === 0 && (
                    <Grid container spacing={2}>
                        {/* Category */}
                        <Grid item xs={12}>
                            <FieldContainer $shaking={shakingFields['category']}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: theme.palette.text.primary, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                        <CategoryIcon sx={{ color: isCategoryValid ? theme.palette.success.main : (theme.palette.secondary.main || '#0d9488'), fontSize: 20 }} /> Select Complaint Category
                                    </Box>
                                    {isCategoryValid && (
                                        <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: 20 }} />
                                    )}
                                </Typography>
                                <FormControl fullWidth size="small" sx={getInputSx(isCategoryValid)}>
                                    <InputLabel>Report Category</InputLabel>
                                    <Select
                                        value={formData.category_id ? formData.category_id.toString() : ''}
                                        label="Report Category"
                                        onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
                                        required
                                        MenuProps={selectMenuProps}
                                    >
                                        <MenuItem value="" disabled>Choose Category...</MenuItem>
                                        {categories.map((category) => (
                                            <MenuItem key={category.id} value={category.id.toString()}>
                                                {category.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </FieldContainer>
                        </Grid>

                        {/* Staff Member Multi Autocomplete */}
                        <Grid item xs={12}>
                            <FieldContainer $shaking={shakingFields['staff']}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: theme.palette.text.primary, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                        <StaffIcon sx={{ color: isStaffValid ? theme.palette.success.main : theme.palette.info.main, fontSize: 20 }} /> Select Staff Member(s)
                                    </Typography>
                                    {staffMembers.length > 0 && (
                                        <Button
                                            size="small"
                                            onClick={handleSelectAllStaff}
                                            startIcon={selectedStaffMembers.length === staffMembers.length ? <ClearAllIcon /> : <SelectAllIcon />}
                                            sx={{ textTransform: 'none', fontWeight: 800, fontSize: '0.75rem', py: 0, color: theme.palette.secondary.main || '#0d9488' }}
                                        >
                                            {selectedStaffMembers.length === staffMembers.length ? 'Deselect All' : `Select All (${staffMembers.length})`}
                                        </Button>
                                    )}
                                </Box>
                                <Autocomplete
                                    multiple
                                    disableCloseOnSelect
                                    options={staffMembers}
                                    loading={loadingStaff}
                                    value={selectedStaffMembers}
                                    onChange={(_, newValue) => setSelectedStaffMembers(newValue)}
                                    getOptionLabel={(option: any) => `${option.name} (${option.role || 'Staff'})`}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    filterOptions={(options, { inputValue }) => {
                                        const searchLower = inputValue.toLowerCase();
                                        return options.filter((s: any) => 
                                            s.name?.toLowerCase().includes(searchLower) ||
                                            s.role?.toLowerCase().includes(searchLower) ||
                                            s.id?.toString().includes(searchLower)
                                        );
                                    }}
                                    sx={getInputSx(isStaffValid)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Select Staff Member(s)"
                                            required={selectedStaffMembers.length === 0}
                                            size="small"
                                            placeholder={selectedStaffMembers.length > 0 ? "Add more staff..." : "Search staff name or role..."}
                                            InputProps={{
                                                ...params.InputProps,
                                                endAdornment: (
                                                    <>
                                                        {loadingStaff ? <CircularProgress size={18} sx={{ mr: 1, color: theme.palette.secondary.main || '#0d9488' }} /> : null}
                                                        {params.InputProps.endAdornment}
                                                    </>
                                                ),
                                            }}
                                        />
                                    )}
                                    renderOption={(props, staff, { selected }) => (
                                        <Box 
                                            component="li" 
                                            {...props}
                                            key={staff.id}
                                            sx={{ cursor: 'pointer', py: 0.8, px: 1, color: theme.palette.text.primary }}
                                        >
                                            <Checkbox
                                                icon={icon}
                                                checkedIcon={checkedIcon}
                                                style={{ marginRight: 8 }}
                                                checked={selected}
                                            />
                                            <Avatar 
                                                src={staff.picture_url || undefined} 
                                                sx={{ width: 34, height: 34, mr: 1.5, bgcolor: alpha(theme.palette.secondary.main || '#0d9488', 0.12), color: theme.palette.secondary.main || '#0d9488', fontWeight: 800, fontSize: '0.8rem', border: `1px solid ${alpha(theme.palette.secondary.main || '#0d9488', 0.25)}` }}
                                            >
                                                {!staff.picture_url && staff.name?.charAt(0)?.toUpperCase()}
                                            </Avatar>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.text.primary }} noWrap>
                                                    {staff.name}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }} noWrap>
                                                    {staff.role || 'Staff Member'}
                                                </Typography>
                                            </Box>
                                            <Chip label={`ID: ${staff.id}`} size="small" variant="outlined" sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem', color: theme.palette.secondary.main || '#0d9488', borderColor: alpha(theme.palette.secondary.main || '#0d9488', 0.3) }} />
                                        </Box>
                                    )}
                                />
                            </FieldContainer>
                        </Grid>

                        {/* Selected Staff Preview Banner */}
                        {selectedStaffMembers.length > 0 && (
                            <Grid item xs={12}>
                                <Paper sx={{ 
                                    p: 1.8, 
                                    borderRadius: '14px', 
                                    border: `1.5px solid ${theme.palette.success.main}`,
                                    background: theme.palette.mode === 'dark' 
                                        ? `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.15)} 0%, ${alpha(theme.palette.background.paper, 0.6)} 100%)`
                                        : `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.08)} 0%, #ffffff 100%)`,
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: theme.palette.success.main, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                            <CheckCircleIcon style={{ fontSize: 18 }} /> {selectedStaffMembers.length} {selectedStaffMembers.length === 1 ? 'Staff Member' : 'Staff Members'} Selected
                                        </Typography>
                                        <Chip 
                                            label={`${selectedStaffMembers.length} ${selectedStaffMembers.length === 1 ? 'Report' : 'Reports'} will be generated`} 
                                            sx={{ fontWeight: 800, height: 24, fontSize: '0.72rem', bgcolor: theme.palette.success.main, color: '#ffffff' }} 
                                        />
                                    </Box>

                                    <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', maxHeight: 100, overflowY: 'auto', pt: 0.5 }}>
                                        {selectedStaffMembers.map(staff => (
                                            <Chip
                                                key={staff.id}
                                                avatar={
                                                    <Avatar src={staff.picture_url || undefined} sx={{ bgcolor: theme.palette.success.main, color: '#ffffff', fontWeight: 800 }}>
                                                        {!staff.picture_url && staff.name?.charAt(0)?.toUpperCase()}
                                                    </Avatar>
                                                }
                                                label={`${staff.name} (${staff.role || 'Staff'})`}
                                                onDelete={() => handleRemoveStaff(staff.id)}
                                                size="small"
                                                sx={{ 
                                                    fontWeight: 700, 
                                                    fontSize: '0.78rem',
                                                    bgcolor: theme.palette.background.paper,
                                                    border: `1.5px solid ${alpha(theme.palette.success.main, 0.4)}`,
                                                    color: theme.palette.text.primary
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Paper>
                            </Grid>
                        )}
                    </Grid>
                )}

                {/* STEP 2: INCIDENT DETAILS & SEVERITY */}
                {activeStep === 1 && (
                    <Grid container spacing={2}>
                        {/* Severity Selector */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: theme.palette.text.primary, mb: 1, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                <SpeedIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} /> Incident Severity
                            </Typography>
                            <Grid container spacing={1.2}>
                                {(Object.keys(SEVERITY_CONFIG) as ReportSeverity[]).map((sev) => {
                                    const cfg = SEVERITY_CONFIG[sev];
                                    const isSelected = formData.severity === sev;
                                    return (
                                        <Grid item xs={6} sm={3} key={sev}>
                                            <SeverityCard
                                                $selected={isSelected}
                                                $color={cfg.color}
                                                onClick={() => setFormData({ ...formData, severity: sev })}
                                            >
                                                <Box>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isSelected ? cfg.color : theme.palette.text.primary, fontSize: '0.85rem' }}>
                                                        {cfg.label}
                                                    </Typography>
                                                </Box>
                                                {isSelected && (
                                                    <CheckCircleIcon sx={{ fontSize: 16, color: cfg.color }} />
                                                )}
                                            </SeverityCard>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </Grid>

                        {/* Incident Date & Time */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: theme.palette.text.primary, mb: 1, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                <CalendarIcon sx={{ color: theme.palette.success.main, fontSize: 20 }} /> Incident Date & Time
                            </Typography>
                            <DateTimePicker
                                label="Incident Date & Time"
                                value={formData.created_at}
                                onChange={(newValue) => {
                                    if (newValue) setFormData({ ...formData, created_at: newValue });
                                }}
                                slotProps={{ 
                                    popper: { sx: { zIndex: 2000 } },
                                    textField: { fullWidth: true, required: true, size: "small" } 
                                }}
                            />
                        </Grid>

                        {/* Detailed Description & Quick Tags */}
                        <Grid item xs={12}>
                            <FieldContainer $shaking={shakingFields['description']}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: theme.palette.text.primary, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                        <DescriptionIcon sx={{ color: isDescriptionValid ? theme.palette.success.main : (theme.palette.secondary.main || '#0d9488'), fontSize: 20 }} /> Detailed Description
                                    </Box>
                                    {isDescriptionValid && (
                                        <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: 20 }} />
                                    )}
                                </Typography>
                                <TextField
                                    label="Detailed Description"
                                    multiline
                                    rows={4}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    required
                                    fullWidth
                                    size="small"
                                    placeholder="Describe the complaint or incident details..."
                                    sx={getInputSx(isDescriptionValid)}
                                />
                            </FieldContainer>
                            {/* Quick Tag Pills */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap', mt: 1.2 }}>
                                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 700, mr: 0.5, display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                    <TagIcon style={{ fontSize: 13 }} /> Quick Tags:
                                </Typography>
                                {QUICK_TAGS.map(({ tag, color }) => (
                                    <Chip
                                        key={tag}
                                        label={tag}
                                        size="small"
                                        clickable
                                        onClick={() => handleAddTag(tag)}
                                        sx={{ 
                                            height: 22, 
                                            fontSize: '0.72rem', 
                                            fontWeight: 800, 
                                            color: color,
                                            bgcolor: alpha(color, 0.1),
                                            border: `1px solid ${alpha(color, 0.25)}`,
                                            '&:hover': { bgcolor: alpha(color, 0.2), transform: 'scale(1.04)' }
                                        }}
                                    />
                                ))}
                            </Box>
                        </Grid>
                    </Grid>
                )}

                {/* STEP 3: REVIEW & CONFIRM */}
                {activeStep === 2 && (
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Paper sx={{ p: 2, borderRadius: '16px', border: `1.5px solid ${alpha(theme.palette.secondary.main || '#0d9488', 0.3)}`, bgcolor: alpha(theme.palette.secondary.main || '#0d9488', 0.04) }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: theme.palette.text.primary, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ReviewIcon sx={{ color: theme.palette.secondary.main || '#0d9488' }} /> Complaint Summary Review
                                </Typography>

                                <Grid container spacing={1.5}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Category</Typography>
                                        <Chip label={selectedCategory?.name || 'N/A'} size="small" color="secondary" sx={{ fontWeight: 800, mt: 0.3 }} />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Severity</Typography>
                                        <Chip 
                                            label={SEVERITY_CONFIG[formData.severity].label} 
                                            size="small" 
                                            sx={{ fontWeight: 800, mt: 0.3, bgcolor: alpha(SEVERITY_CONFIG[formData.severity].color, 0.15), color: SEVERITY_CONFIG[formData.severity].color }} 
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                                            Selected Staff ({selectedStaffMembers.length})
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap', maxHeight: 80, overflowY: 'auto' }}>
                                            {selectedStaffMembers.map(s => (
                                                <Chip key={s.id} label={`${s.name} (${s.role || 'Staff'})`} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                                            ))}
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Incident Date</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                                            {formData.created_at.format('DD MMM YYYY, hh:mm A')}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.3 }}>Description</Typography>
                                        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: '8px', bgcolor: theme.palette.background.paper }}>
                                            <Typography variant="body2" sx={{ fontStyle: 'italic', whiteSpace: 'pre-wrap', color: theme.palette.text.primary }}>
                                                "{formData.description}"
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>
                    </Grid>
                )}
            </StyledDialogContent>

            {/* Step Navigation Actions Footer */}
            <FormActions>
                {activeStep === 0 ? (
                    <Button 
                        onClick={handleClose}
                        variant="outlined"
                        size="small"
                        sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, px: 2.5 }}
                    >
                        Cancel
                    </Button>
                ) : (
                    <Button 
                        onClick={handleBack}
                        variant="outlined"
                        size="small"
                        startIcon={<ArrowBackIcon />}
                        sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, px: 2.5 }}
                    >
                        Back
                    </Button>
                )}

                {activeStep < STEPS.length - 1 ? (
                    <Button 
                        onClick={handleNext}
                        variant="contained"
                        color="secondary"
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        sx={{ 
                            borderRadius: '10px', 
                            textTransform: 'none', 
                            fontWeight: 800, 
                            px: 3.5,
                            py: 0.9,
                            background: `linear-gradient(135deg, ${theme.palette.secondary.dark || '#065f46'} 0%, ${theme.palette.secondary.main || '#0d9488'} 100%)`,
                            boxShadow: `0 6px 20px ${alpha(theme.palette.secondary.main || '#0d9488', 0.35)}`
                        }}
                    >
                        Continue to {STEPS[activeStep + 1]}
                    </Button>
                ) : (
                    <Button 
                        onClick={handleSubmit}
                        variant="contained"
                        color="secondary"
                        size="small"
                        disabled={loading || selectedStaffMembers.length === 0}
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                        sx={{ 
                            borderRadius: '10px', 
                            textTransform: 'none', 
                            fontWeight: 800, 
                            px: 3.5,
                            py: 0.9,
                            background: `linear-gradient(135deg, ${theme.palette.success.dark} 0%, ${theme.palette.success.main} 100%)`,
                            boxShadow: `0 6px 20px ${alpha(theme.palette.success.main, 0.4)}`,
                            '&:hover': {
                                background: `linear-gradient(135deg, ${theme.palette.success.dark} 0%, ${theme.palette.success.main} 100%)`,
                            }
                        }}
                    >
                        {loading 
                            ? 'Submitting...' 
                            : selectedStaffMembers.length > 1 
                                ? `Submit ${selectedStaffMembers.length} Reports` 
                                : 'Submit Report'
                        }
                    </Button>
                )}
            </FormActions>
        </StyledDialog>
    );
};
