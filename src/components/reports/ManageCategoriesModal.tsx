import React, { useState } from 'react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogContent,
    FormControl,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    styled,
    alpha,
    Tooltip
} from '@mui/material';
import {
    Close as CloseIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    AutoAwesome as SeedIcon,
    Category as CategoryIcon
} from '@mui/icons-material';
import { ReportCategory } from '../../types/reports';
import { reportService } from '../../utils/reportService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

const StyledDialog = styled(Dialog)(({ theme }) => ({
    zIndex: 1300,
    '& .MuiDialog-paper': {
        borderRadius: '16px',
        background: theme.palette.background.paper,
        maxWidth: '720px',
        width: '95%',
        margin: '32px 16px',
        overflow: 'hidden',
        boxShadow: theme.palette.mode === 'dark'
            ? '0 0 40px rgba(0, 0, 0, 0.5)'
            : '0 8px 32px rgba(0, 0, 0, 0.1)',
        border: theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.08)'
            : '1px solid rgba(0, 0, 0, 0.08)'
    }
}));

const DialogHeader = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: `1px solid ${theme.palette.divider}`,
    background: theme.palette.mode === 'dark'
        ? alpha(theme.palette.primary.main, 0.08)
        : alpha(theme.palette.primary.main, 0.03)
}));

interface ManageCategoriesModalProps {
    open: boolean;
    onClose: () => void;
    categories: ReportCategory[];
    onRefreshCategories: () => Promise<void>;
}

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
    open,
    onClose,
    categories,
    onRefreshCategories
}) => {
    const { user } = useAuth();
    const { showToast } = useToast();

    // New Category Form state
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState<'student' | 'staff'>('student');
    const [adding, setAdding] = useState(false);
    const [seeding, setSeeding] = useState(false);

    // Edit state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editType, setEditType] = useState<'student' | 'staff'>('student');

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        setAdding(true);
        try {
            await reportService.createCategory({
                name: newName.trim(),
                type: newType,
                school_id: user?.school_id || 1
            });
            setNewName('');
            await onRefreshCategories();
            showToast('Category created successfully', 'success');
        } catch (err) {
            console.error('Error creating category:', err);
            showToast('Failed to create category', 'error');
        } finally {
            setAdding(false);
        }
    };

    const handleSeedDefaultCategories = async () => {
        setSeeding(true);
        try {
            await reportService.seedDefaultCategories(user?.school_id || 1);
            await onRefreshCategories();
            showToast('Default categories seeded successfully', 'success');
        } catch (err) {
            console.error('Error seeding default categories:', err);
            showToast('Failed to seed default categories', 'error');
        } finally {
            setSeeding(false);
        }
    };

    const handleStartEdit = (cat: ReportCategory) => {
        setEditingId(cat.id);
        setEditName(cat.name);
        setEditType((cat.type as 'student' | 'staff') || 'student');
    };

    const handleSaveEdit = async (id: number) => {
        if (!editName.trim()) return;
        try {
            await reportService.updateCategory(id, {
                name: editName.trim(),
                type: editType
            });
            setEditingId(null);
            await onRefreshCategories();
            showToast('Category updated', 'success');
        } catch (err) {
            console.error('Error updating category:', err);
            showToast('Failed to update category', 'error');
        }
    };

    const handleDeleteCategory = async (id: number, name: string) => {
        if (!window.confirm(`Are you sure you want to delete category "${name}"?`)) return;
        try {
            await reportService.deleteCategory(id);
            await onRefreshCategories();
            showToast('Category deleted', 'success');
        } catch (err) {
            console.error('Error deleting category:', err);
            showToast('Failed to delete category', 'error');
        }
    };

    return (
        <StyledDialog open={open} onClose={onClose} maxWidth="md">
            <DialogHeader>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CategoryIcon color="primary" sx={{ fontSize: 26 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Manage Categories
                    </Typography>
                    <Chip label={`${categories.length} Total`} size="small" color="primary" sx={{ fontWeight: 700 }} />
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogHeader>

            <DialogContent sx={{ p: 3 }}>
                {/* Create New Category Toolbar */}
                <Paper 
                    component="form" 
                    onSubmit={handleCreateCategory}
                    sx={{ p: 2, mb: 3, borderRadius: 3, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04), border: '1px solid', borderColor: 'divider' }}
                >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'primary.main' }}>
                        ➕ Create New Category
                    </Typography>

                    <Grid container spacing={1.5} alignItems="center">
                        <Grid item xs={12} sm={5}>
                            <TextField
                                label="Category Name"
                                size="small"
                                fullWidth
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="e.g. Uniform Misconduct"
                                required
                            />
                        </Grid>

                        <Grid item xs={6} sm={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Target Subject</InputLabel>
                                <Select
                                    value={newType}
                                    label="Target Subject"
                                    onChange={(e) => setNewType(e.target.value as 'student' | 'staff')}
                                >
                                    <MenuItem value="student">🎓 Student Complaints</MenuItem>
                                    <MenuItem value="staff">👨‍🏫 Staff Complaints</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={6} sm={3}>
                            <Button
                                type="submit"
                                variant="contained"
                                size="small"
                                fullWidth
                                disabled={adding || !newName.trim()}
                                startIcon={<AddIcon />}
                                sx={{ height: 40, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                            >
                                {adding ? 'Adding...' : 'Add Category'}
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>

                {/* Seed Categories Banner */}
                {categories.length === 0 && (
                    <Box sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'warning.light', color: 'warning.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            No categories found in database. Seed standard default categories now.
                        </Typography>
                        <Button 
                            variant="contained" 
                            color="secondary" 
                            size="small" 
                            onClick={handleSeedDefaultCategories}
                            disabled={seeding}
                            startIcon={<SeedIcon />}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                            {seeding ? 'Seeding...' : 'Seed Defaults'}
                        </Button>
                    </Box>
                )}

                {/* Categories Data Table */}
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 360 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.9) : '#f8fafc' } }}>
                                <TableCell>ID</TableCell>
                                <TableCell>Category Name</TableCell>
                                <TableCell>Subject Type</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {categories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                        No categories found. Click "Seed Defaults" or add a new category above.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                categories.map((cat) => {
                                    const isEditing = editingId === cat.id;
                                    const isStudentType = (cat.type || 'student').toLowerCase() === 'student';

                                    return (
                                        <TableRow key={cat.id} hover>
                                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                                #{cat.id}
                                            </TableCell>
                                            <TableCell>
                                                {isEditing ? (
                                                    <TextField
                                                        size="small"
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        autoFocus
                                                        fullWidth
                                                    />
                                                ) : (
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {cat.name}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {isEditing ? (
                                                    <Select
                                                        size="small"
                                                        value={editType}
                                                        onChange={(e) => setEditType(e.target.value as 'student' | 'staff')}
                                                    >
                                                        <MenuItem value="student">Student</MenuItem>
                                                        <MenuItem value="staff">Staff</MenuItem>
                                                    </Select>
                                                ) : (
                                                    <Chip
                                                        label={isStudentType ? 'Student' : 'Staff'}
                                                        size="small"
                                                        sx={{
                                                            fontWeight: 700,
                                                            fontSize: '0.72rem',
                                                            bgcolor: isStudentType ? alpha('#0284c7', 0.12) : alpha('#7c3aed', 0.12),
                                                            color: isStudentType ? '#0284c7' : '#7c3aed'
                                                        }}
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell align="right">
                                                {isEditing ? (
                                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                        <IconButton size="small" color="primary" onClick={() => handleSaveEdit(cat.id)}>
                                                            <SaveIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton size="small" onClick={() => setEditingId(null)}>
                                                            <CancelIcon fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                ) : (
                                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                        <Tooltip title="Edit Category">
                                                            <IconButton size="small" onClick={() => handleStartEdit(cat)}>
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete Category">
                                                            <IconButton size="small" color="error" onClick={() => handleDeleteCategory(cat.id, cat.name)}>
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
        </StyledDialog>
    );
};
