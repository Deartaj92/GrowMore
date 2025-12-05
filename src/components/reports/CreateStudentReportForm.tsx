import React, { useState, useEffect, useRef } from 'react';
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
    Paper
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { Close as CloseIcon } from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { reportService } from '../../utils/reportService';
import { Report, ReportCategory, CreateReportDTO, ReportSeverity } from '../../types/reports';
import { useAuth } from '../../contexts/AuthContext';
import { getStudentDisplayId, matchesStudentSearch } from '../../utils/studentUtils';
import { useToast } from '../../components/useToast';
import dayjs, { Dayjs } from 'dayjs';
import { Theme } from '@mui/material/styles';

// Styled components (same as CreateReportForm)
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
    student_id?: number;
    description: string;
    severity: ReportSeverity;
    created_at: Dayjs;
    class_id: number;
    section_id: number;
}

interface CreateStudentReportFormProps {
    open: boolean;
    onCancel: () => void;
    onSubmit: (data: CreateReportDTO) => Promise<void>;
    initialData?: Report;
}

export const CreateStudentReportForm: React.FC<CreateStudentReportFormProps> = ({
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
    const [loading, setLoading] = useState(false);
    const scrollPositionRef = useRef<number>(0);
    const isScrollingRef = useRef<boolean>(false);
    const touchStartRef = useRef<{ y: number; time: number } | null>(null);
    const listboxRef = useRef<HTMLUListElement | null>(null);
    const isUserScrollingRef = useRef<boolean>(false);
    const scrollRestoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // State for dropdowns
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [selectedClassHasSections, setSelectedClassHasSections] = useState<boolean>(true);
    
    // Loading states
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [loadingSections, setLoadingSections] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState(false);
    
    const [formData, setFormData] = useState<FormData>({
        category_id: initialData?.category_id || 0,
        student_id: initialData?.student_id || undefined,
        description: initialData?.description || '',
        severity: initialData?.severity || 'low',
        created_at: initialData?.created_at ? dayjs(initialData.created_at) : dayjs(),
        class_id: 0,
        section_id: 0
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                category_id: initialData.category_id,
                student_id: initialData.student_id,
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
    }, []);

    useEffect(() => {
        if (formData.class_id) {
            const selectedClass = classes.find(c => c.id === formData.class_id);
            const hasSections = selectedClass?.has_sections ?? true;
            setSelectedClassHasSections(hasSections);
            
            if (hasSections) {
                loadSections(formData.class_id);
            } else {
                setSections([]);
                setFormData(prev => ({ ...prev, section_id: 0 }));
                loadStudents(formData.class_id, null);
            }
        } else {
            setSections([]);
            setSelectedClassHasSections(true);
        }
    }, [formData.class_id, classes]);

    useEffect(() => {
        if (formData.class_id) {
            if (selectedClassHasSections) {
                if (formData.section_id) {
                    loadStudents(formData.class_id, formData.section_id);
                } else {
                    setStudents([]);
                }
            } else {
                loadStudents(formData.class_id, null);
            }
        } else {
            setStudents([]);
        }
    }, [formData.class_id, formData.section_id, selectedClassHasSections]);

    // Restore scroll position when listbox is available
    useEffect(() => {
        if (listboxRef.current && scrollPositionRef.current > 0) {
            // Use requestAnimationFrame to ensure DOM is ready
            requestAnimationFrame(() => {
                if (listboxRef.current && scrollPositionRef.current > 0) {
                    listboxRef.current.scrollTop = scrollPositionRef.current;
                }
            });
        }
    }, [students, open]);

    // Use MutationObserver to restore scroll position when DOM changes
    useEffect(() => {
        if (!listboxRef.current || !open) return;

        let restoreTimeout: NodeJS.Timeout;
        
        const observer = new MutationObserver(() => {
            if (listboxRef.current && scrollPositionRef.current > 0) {
                // Clear any pending restore
                clearTimeout(restoreTimeout);
                // Restore scroll position after a short delay to ensure DOM is stable
                restoreTimeout = setTimeout(() => {
                    if (listboxRef.current && scrollPositionRef.current > 0) {
                        const currentScroll = listboxRef.current.scrollTop;
                        // Only restore if scroll position was reset (close to 0) or significantly different
                        if (currentScroll < 10 || Math.abs(currentScroll - scrollPositionRef.current) > 50) {
                            listboxRef.current.scrollTop = scrollPositionRef.current;
                        }
                    }
                }, 50);
            }
        });

        observer.observe(listboxRef.current, {
            childList: true,
            subtree: true,
            attributes: true
        });

        return () => {
            clearTimeout(restoreTimeout);
            observer.disconnect();
        };
    }, [open]);

    const loadCategories = async () => {
        try {
            const data = await reportService.getCategories('student', user?.school_id);
            setCategories(data);
        } catch (error) {
            showToast('Failed to load categories', 'error');
        }
    };

    const loadClasses = async () => {
        setLoadingClasses(true);
        try {
            const data = await reportService.getClasses(user?.school_id);
            setClasses(data);
        } catch (error) {
            showToast('Failed to load classes', 'error');
        } finally {
            setLoadingClasses(false);
        }
    };

    const loadSections = async (classId: number) => {
        setLoadingSections(true);
        try {
            const data = await reportService.getSections(classId, user?.school_id);
            setSections(data);
        } catch (error) {
            showToast('Failed to load sections', 'error');
        } finally {
            setLoadingSections(false);
        }
    };

    const loadStudents = async (classId: number, sectionId: number | null) => {
        setLoadingStudents(true);
        try {
            const data = await reportService.getStudents(classId, sectionId, user?.school_id);
            setStudents(data);
        } catch (error) {
            showToast('Failed to load students', 'error');
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (loading) return;
        
        if (!formData.category_id || !formData.description.trim()) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        
        if (!formData.class_id) {
            showToast('Please select a class', 'error');
            return;
        }
        if (selectedClassHasSections && !formData.section_id) {
            showToast('Please select a section', 'error');
            return;
        }
        if (!formData.student_id) {
            showToast('Please select a student', 'error');
            return;
        }

        setLoading(true);
        try {
            const reportData: CreateReportDTO = {
                category_id: formData.category_id,
                description: formData.description.trim(),
                severity: formData.severity,
                created_at: formData.created_at.toISOString(),
                subject_type: 'student',
                student_id: formData.student_id,
                staff_id: undefined
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
            created_at: dayjs(),
            class_id: 0,
            section_id: 0
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
                    {initialData ? 'Edit Student Report' : 'Create Student Report'}
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

                    {/* Row 2: Class and Section - Both on same row */}
                    <Grid item xs={12} sm={selectedClassHasSections ? 6 : 12}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Class</InputLabel>
                            <Select
                                value={formData.class_id ? formData.class_id.toString() : ''}
                                label="Class"
                                onChange={(e) => {
                                    const selectedClassId = Number(e.target.value);
                                    const selectedClass = classes.find(c => c.id === selectedClassId);
                                    const hasSections = selectedClass?.has_sections ?? true;
                                    
                                    setFormData({ 
                                        ...formData, 
                                        class_id: selectedClassId, 
                                        section_id: 0,
                                        student_id: undefined
                                    });
                                    setSelectedClassHasSections(hasSections);
                                }}
                                required
                                disabled={loadingClasses}
                                MenuProps={selectMenuProps}
                            >
                                <MenuItem value="">Select Class</MenuItem>
                                {loadingClasses ? (
                                    <MenuItem disabled>Loading classes...</MenuItem>
                                ) : (
                                    classes.map((cls) => (
                                        <MenuItem key={cls.id} value={cls.id.toString()}>
                                            {cls.name}
                                        </MenuItem>
                                    ))
                                )}
                            </Select>
                            {loadingClasses && (
                                <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                                    Loading classes...
                                </Typography>
                            )}
                        </FormControl>
                    </Grid>

                    {selectedClassHasSections && (
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
                                    disabled={!formData.class_id || loadingSections}
                                    MenuProps={selectMenuProps}
                                >
                                    <MenuItem value="">Select Section</MenuItem>
                                    {loadingSections ? (
                                        <MenuItem disabled>Loading sections...</MenuItem>
                                    ) : (
                                        sections.map((section) => (
                                            <MenuItem key={section.id} value={section.id.toString()}>
                                                {section.name}
                                            </MenuItem>
                                        ))
                                    )}
                                </Select>
                                {loadingSections && (
                                    <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                                        Loading sections...
                                    </Typography>
                                )}
                            </FormControl>
                        </Grid>
                    )}

                    <Grid item xs={12}>
                        <Autocomplete
                            options={students}
                            loading={loadingStudents}
                            disabled={!formData.class_id || (selectedClassHasSections && !formData.section_id) || loadingStudents}
                            value={students.find(s => s.id === formData.student_id) || null}
                            onOpen={() => {
                                // Restore scroll position when dropdown opens
                                if (listboxRef.current && scrollPositionRef.current > 0) {
                                    requestAnimationFrame(() => {
                                        if (listboxRef.current) {
                                            listboxRef.current.scrollTop = scrollPositionRef.current;
                                        }
                                    });
                                }
                            }}
                            onClose={() => {
                                // Save scroll position when dropdown closes
                                if (listboxRef.current) {
                                    scrollPositionRef.current = listboxRef.current.scrollTop;
                                }
                            }}
                            onChange={(_, newValue) => setFormData({ 
                                ...formData, 
                                student_id: newValue ? newValue.id : undefined 
                            })}
                            getOptionLabel={(option: any) => `${option.name} (${getStudentDisplayId(option)})`}
                            filterOptions={(options, { inputValue }) => {
                                // Save scroll position before filtering
                                if (listboxRef.current) {
                                    scrollPositionRef.current = listboxRef.current.scrollTop;
                                }
                                
                                const searchLower = inputValue.toLowerCase();
                                const filtered = options.filter((s: any) => {
                                    const nameMatch = s.name.toLowerCase().includes(searchLower);
                                    const idMatch = matchesStudentSearch(s, inputValue);
                                    return nameMatch || idMatch.matches;
                                });
                                
                                // Restore scroll position after filtering (if no input, maintain position)
                                if (listboxRef.current && !inputValue && scrollPositionRef.current > 0) {
                                    requestAnimationFrame(() => {
                                        if (listboxRef.current) {
                                            listboxRef.current.scrollTop = scrollPositionRef.current;
                                        }
                                    });
                                }
                                
                                return filtered;
                            }}
                            onInputChange={(_, value, reason) => {
                                // Save scroll position when input changes
                                if (listboxRef.current && reason !== 'reset') {
                                    scrollPositionRef.current = listboxRef.current.scrollTop;
                                }
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Student"
                                    required
                                    size="small"
                                    InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                            <>
                                                {loadingStudents ? <Typography variant="body2" sx={{ mr: 2 }}>Loading...</Typography> : null}
                                                {params.InputProps.endAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
                            renderOption={(props, student) => {
                                const { onClick, ...otherProps } = props;
                                
                                return (
                                    <Box 
                                        component="li" 
                                        {...otherProps}
                                        key={student.id}
                                        onTouchStart={(e) => {
                                            touchStartRef.current = {
                                                y: e.touches[0].clientY,
                                                time: Date.now()
                                            };
                                            isScrollingRef.current = false;
                                        }}
                                        onTouchMove={(e) => {
                                            if (touchStartRef.current) {
                                                const touchY = e.touches[0].clientY;
                                                const deltaY = Math.abs(touchY - touchStartRef.current.y);
                                                if (deltaY > 10) {
                                                    isScrollingRef.current = true;
                                                }
                                            }
                                        }}
                                        onTouchEnd={() => {
                                            // Reset touch start after a delay to allow click to check
                                            setTimeout(() => {
                                                touchStartRef.current = null;
                                            }, 50);
                                        }}
                                        onClick={(e) => {
                                            // Only trigger selection if it wasn't a scroll gesture
                                            if (!isScrollingRef.current) {
                                                onClick?.(e);
                                            }
                                            // Reset after a short delay
                                            setTimeout(() => {
                                                isScrollingRef.current = false;
                                            }, 150);
                                        }}
                                        sx={{
                                            touchAction: 'pan-y',
                                            cursor: 'pointer',
                                            WebkitTapHighlightColor: 'transparent',
                                            '-webkit-touch-callout': 'none'
                                        }}
                                    >
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
                                                    ID: {getStudentDisplayId(student)}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                                                    {student.address || 'No address'}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                );
                            }}
                            ListboxComponent={React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
                                (props, ref) => {
                                    const listboxRefInternal = React.useRef<HTMLUListElement | null>(null);
                                    const lastScrollTopRef = React.useRef<number>(0);
                                    const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
                                    
                                    const setRef = React.useCallback((node: HTMLUListElement | null) => {
                                        listboxRefInternal.current = node;
                                        listboxRef.current = node;
                                        
                                        if (typeof ref === 'function') {
                                            ref(node);
                                        } else if (ref) {
                                            (ref as React.MutableRefObject<HTMLUListElement | null>).current = node;
                                        }
                                        
                                        // Only restore scroll position when listbox is first mounted (not during active scrolling)
                                        if (node && scrollPositionRef.current > 0 && !isUserScrollingRef.current) {
                                            // Small delay to ensure DOM is ready
                                            setTimeout(() => {
                                                if (node && scrollPositionRef.current > 0 && !isUserScrollingRef.current) {
                                                    node.scrollTop = scrollPositionRef.current;
                                                }
                                            }, 10);
                                        }
                                    }, [ref]);
                                    
                                    React.useEffect(() => {
                                        const listbox = listboxRefInternal.current;
                                        if (!listbox) return;
                                        
                                        // Only restore scroll if it was reset by the component (not by user)
                                        const checkAndRestoreScroll = () => {
                                            if (!listbox || isUserScrollingRef.current) return;
                                            
                                            const currentScroll = listbox.scrollTop;
                                            const savedScroll = scrollPositionRef.current;
                                            
                                            // Only restore if scroll was unexpectedly reset to near 0 when we had a saved position
                                            if (savedScroll > 50 && currentScroll < 10) {
                                                // User is not scrolling, so this is likely a component reset
                                                listbox.scrollTop = savedScroll;
                                            }
                                        };
                                        
                                        // Use a debounced observer to avoid interfering with smooth scrolling
                                        const observer = new MutationObserver(() => {
                                            // Clear any pending restore
                                            if (scrollRestoreTimeoutRef.current) {
                                                clearTimeout(scrollRestoreTimeoutRef.current);
                                            }
                                            
                                            // Only restore after user has stopped scrolling for a bit
                                            scrollRestoreTimeoutRef.current = setTimeout(() => {
                                                if (!isUserScrollingRef.current) {
                                                    checkAndRestoreScroll();
                                                }
                                            }, 100);
                                        });
                                        
                                        observer.observe(listbox, {
                                            childList: true,
                                            subtree: true
                                        });
                                        
                                        return () => {
                                            if (scrollRestoreTimeoutRef.current) {
                                                clearTimeout(scrollRestoreTimeoutRef.current);
                                            }
                                            observer.disconnect();
                                        };
                                    }, []);
                                    
                                    return (
                                        <ul
                                            {...props}
                                            ref={setRef}
                                            style={{
                                                ...props.style,
                                                maxHeight: 300,
                                                overflowY: 'auto',
                                                touchAction: 'pan-y',
                                                WebkitOverflowScrolling: 'touch',
                                                scrollBehavior: 'auto',
                                                position: 'relative',
                                                overscrollBehavior: 'contain'
                                            }}
                                            onScroll={(e) => {
                                                const target = e.currentTarget;
                                                const currentScroll = target.scrollTop;
                                                
                                                // Detect if user is actively scrolling
                                                const scrollDelta = Math.abs(currentScroll - lastScrollTopRef.current);
                                                if (scrollDelta > 1) {
                                                    isUserScrollingRef.current = true;
                                                    
                                                    // Clear the flag after scrolling stops
                                                    if (scrollTimeoutRef.current) {
                                                        clearTimeout(scrollTimeoutRef.current);
                                                    }
                                                    scrollTimeoutRef.current = setTimeout(() => {
                                                        isUserScrollingRef.current = false;
                                                    }, 150);
                                                }
                                                
                                                lastScrollTopRef.current = currentScroll;
                                                scrollPositionRef.current = currentScroll;
                                                props.onScroll?.(e);
                                            }}
                                            onTouchStart={() => {
                                                isUserScrollingRef.current = true;
                                            }}
                                            onTouchEnd={() => {
                                                // Keep flag true briefly, then clear
                                                setTimeout(() => {
                                                    isUserScrollingRef.current = false;
                                                }, 200);
                                            }}
                                        />
                                    );
                                }
                            )}
                            disableListWrap
                            PaperComponent={(props) => (
                                <Paper
                                    {...props}
                                    sx={{
                                        ...selectMenuProps.PaperProps?.sx,
                                        maxHeight: 300,
                                        backgroundColor: theme.palette.mode === 'dark' 
                                            ? theme.palette.background.paper
                                            : theme.palette.background.paper,
                                        touchAction: 'pan-y',
                                        '& .MuiAutocomplete-listbox': {
                                            touchAction: 'pan-y',
                                            WebkitOverflowScrolling: 'touch',
                                            overscrollBehavior: 'contain',
                                            '&::-webkit-scrollbar': {
                                                width: '8px'
                                            },
                                            '&::-webkit-scrollbar-track': {
                                                background: 'transparent'
                                            },
                                            '&::-webkit-scrollbar-thumb': {
                                                backgroundColor: theme.palette.mode === 'dark'
                                                    ? 'rgba(255, 255, 255, 0.2)'
                                                    : 'rgba(0, 0, 0, 0.2)',
                                                borderRadius: '4px',
                                                '&:hover': {
                                                    backgroundColor: theme.palette.mode === 'dark'
                                                        ? 'rgba(255, 255, 255, 0.3)'
                                                        : 'rgba(0, 0, 0, 0.3)'
                                                }
                                            }
                                        }
                                    }}
                                />
                            )}
                        />
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

