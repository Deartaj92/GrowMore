import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    Box,
    Typography,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Button,
    styled
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { Report, ReportStatus, ReportUpdate } from '../../types/reports';
import { formatAppDateTime } from '../../utils/dateUtils';

const StyledDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialog-paper': {
        borderRadius: '16px',
        background: theme.palette.mode === 'dark' 
            ? theme.palette.background.paper 
            : theme.palette.background.paper,
        maxWidth: '500px',
        width: '95%',
        margin: '16px',
        overflow: 'hidden',
        boxShadow: theme.palette.mode === 'dark'
            ? '0 0 40px rgba(0, 0, 0, 0.5)'
            : '0 0 40px rgba(0, 0, 0, 0.1)',
        border: theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.05)'
            : '1px solid rgba(0, 0, 0, 0.05)'
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
        : 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)'
}));

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    '& .MuiFormControl-root': {
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
        padding: '6px 16px',
        fontWeight: 500
    }
}));

interface ModifyReportModalProps {
    open: boolean;
    onClose: () => void;
    report: Report;
    onSubmit: (reportId: string, status: ReportStatus, notes: string) => Promise<void>;
}

export const ModifyReportModal: React.FC<ModifyReportModalProps> = ({
    open,
    onClose,
    report,
    onSubmit
}) => {
    const [status, setStatus] = useState<ReportStatus>(report.status);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!notes.trim() || loading) return;
        
        setLoading(true);
        try {
            await onSubmit(report.id.toString(), status, notes.trim());
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
            maxWidth="sm"
        >
            <DialogHeader>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Modify Report
                </Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogHeader>

            <StyledDialogContent>
                <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={status}
                        label="Status"
                        onChange={(e) => setStatus(e.target.value as ReportStatus)}
                    >
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="in_review">In Review</MenuItem>
                        <MenuItem value="resolved">Resolved</MenuItem>
                        <MenuItem value="dismissed">Dismissed</MenuItem>
                    </Select>
                </FormControl>

                <TextField
                    label="Add Update Note"
                    multiline
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="Add a new note about the current update..."
                />

                {report.updates && report.updates.length > 0 && (
                    <Box sx={{ 
                        mt: 2,
                        p: 2,
                        bgcolor: (theme) => theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.03)' 
                            : 'rgba(0, 0, 0, 0.02)',
                        borderRadius: 1,
                        border: (theme) => `1px solid ${theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.05)' 
                            : 'rgba(0, 0, 0, 0.05)'}`
                    }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            Previous Updates
                        </Typography>
                        {report.updates.map((update: ReportUpdate, index: number) => (
                            <Box 
                                key={update.id}
                                sx={{
                                    mb: index < report.updates!.length - 1 ? 2 : 0,
                                    p: 1.5,
                                    bgcolor: (theme) => theme.palette.mode === 'dark'
                                        ? 'rgba(255, 255, 255, 0.02)'
                                        : 'rgba(0, 0, 0, 0.01)',
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider'
                                }}
                            >
                                <Box sx={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 0.5
                                }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Updated by {update.staff?.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {formatAppDateTime(update.created_at)}
                                    </Typography>
                                </Box>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    Status changed from <strong>{update.previous_status}</strong> to <strong>{update.new_status}</strong>
                                </Typography>
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                    {update.update_note}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                )}
            </StyledDialogContent>

            <FormActions>
                <Button 
                    onClick={onClose}
                    variant="outlined"
                    size="small"
                >
                    Cancel
                </Button>
                <Button 
                    onClick={handleSubmit}
                    variant="contained"
                    size="small"
                    disabled={!notes.trim() || loading}
                >
                    {loading ? 'Adding...' : 'Add Update'}
                </Button>
            </FormActions>
        </StyledDialog>
    );
};
