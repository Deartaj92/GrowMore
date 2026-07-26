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
    styled
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { Report, ReportSeverity, ReportCategory } from '../../types/reports';
import { reportService } from '../../utils/reportService';
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
            margin: '48px 12px 24px 12px',
            width: 'calc(100% - 24px)',
            maxWidth: 400,
            maxHeight: 'calc(100vh - 120px)',
        }
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
        : 'linear-gradient(0deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)'
}));

interface EditReportFormProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: { category_id?: number; severity: ReportSeverity; description: string; created_at: string }) => Promise<void>;
    report: Report;
    categories?: ReportCategory[];
}

export const EditReportForm: React.FC<EditReportFormProps> = ({
    open,
    onClose,
    onSubmit,
    report,
    categories
}) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const [categoriesList, setCategoriesList] = useState<ReportCategory[]>(categories || []);

    useEffect(() => {
        if (categories && categories.length > 0) {
            setCategoriesList(categories);
        } else {
            const subjectType = report.subject_type || 'student';
            reportService.getCategories(subjectType).then(cats => setCategoriesList(cats || []));
        }
    }, [categories, report.subject_type]);

    const initialCatId = report.category_id ? parseInt(String(report.category_id)) : (report.category?.id ? parseInt(String(report.category.id)) : 1);

    const [formData, setFormData] = useState({
        category_id: initialCatId,
        description: report.description,
        severity: report.severity,
        created_at: dayjs(report.created_at)
    });
    const [loading, setLoading] = useState(false);

    // Only initialize form data when modal opens, not when report prop changes
    useEffect(() => {
        if (open) {
            const currentCatId = report.category_id ? parseInt(String(report.category_id)) : (report.category?.id ? parseInt(String(report.category.id)) : 1);
            setFormData({
                category_id: currentCatId,
                description: report.description,
                severity: report.severity,
                created_at: dayjs(report.created_at)
            });
        }
    }, [open, report.id, report.category_id, report.category?.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (loading) return; // Prevent multiple submissions
        
        setLoading(true);
        try {
            await onSubmit({
                category_id: Number(formData.category_id),
                description: formData.description.trim(),
                severity: formData.severity,
                created_at: formData.created_at.toISOString()
            });
            onClose();
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    return (
        <StyledDialog
            open={open}
            onClose={onClose}
            fullScreen={fullScreen}
            maxWidth="sm"
        >
            <DialogHeader>
                <DialogTitle>
                    Edit Report
                </DialogTitle>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogHeader>

            <StyledDialogContent>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Category</InputLabel>
                            <Select
                                value={formData.category_id}
                                label="Category"
                                onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
                                required
                            >
                                {categoriesList.map((cat) => (
                                    <MenuItem key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </MenuItem>
                                ))}
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
                            >
                                <MenuItem value="low">Low</MenuItem>
                                <MenuItem value="medium">Medium</MenuItem>
                                <MenuItem value="high">High</MenuItem>
                                <MenuItem value="urgent">Urgent</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                        <DateTimePicker
                            label="Created At"
                            value={formData.created_at}
                            onChange={(newValue) => {
                                if (newValue) {
                                    setFormData({ ...formData, created_at: newValue });
                                }
                            }}
                            slotProps={{ 
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
                            rows={4}
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
                    onClick={onClose}
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
                    {loading ? 'Updating...' : 'Update Report'}
                </Button>
            </FormActions>
        </StyledDialog>
    );
}; 