import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
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
import { ReportUpdate } from '../../types/reports';

const StyledDialog = styled(Dialog)(({ theme }) => ({
    zIndex: 1300,
    '& .MuiDialog-paper': {
        borderRadius: '16px',
        background: theme.palette.mode === 'dark' 
            ? theme.palette.background.paper 
            : theme.palette.background.paper,
        maxWidth: '500px',
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
        : 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)'
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

interface EditUpdateFormProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (updateId: string, updateNote: string) => Promise<void>;
    update: ReportUpdate;
}

export const EditUpdateForm: React.FC<EditUpdateFormProps> = ({
    open,
    onClose,
    onSubmit,
    update
}) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const [updateNote, setUpdateNote] = useState(update.update_note || '');
    const [loading, setLoading] = useState(false);

    // Only initialize form data when modal opens, not when update prop changes
    useEffect(() => {
        if (open) {
            setUpdateNote(update.update_note || '');
        }
    }, [open, update.id]); // Only depend on 'open' and 'update.id', not the entire update object

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (loading) return; // Prevent multiple submissions
        
        setLoading(true);
        try {
            await onSubmit(update.id.toString(), updateNote.trim());
            onClose();
        } catch (error) {
            console.error('Error updating report update:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <StyledDialog
            open={open}
            onClose={onClose}
            fullScreen={fullScreen}
        >
            <DialogHeader>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Edit Update Note
                </Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
                <StyledDialogContent>
                    <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Status changed from <strong>{update.previous_status}</strong> to <strong>{update.new_status}</strong>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Created by {update.staff?.name} • {new Date(update.created_at).toLocaleDateString()}
                        </Typography>
                    </Box>

                    <TextField
                        label="Update Note"
                        multiline
                        rows={6}
                        value={updateNote}
                        onChange={(e) => setUpdateNote(e.target.value)}
                        required
                        fullWidth
                        size="small"
                        placeholder="Enter update note..."
                    />
                </StyledDialogContent>

                <FormActions>
                    <Button 
                        onClick={onClose}
                        variant="outlined"
                        size="small"
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button 
                        type="submit"
                        variant="contained"
                        size="small"
                        disabled={loading || !updateNote.trim()}
                    >
                        {loading ? 'Updating...' : 'Update Note'}
                    </Button>
                </FormActions>
            </form>
        </StyledDialog>
    );
};

