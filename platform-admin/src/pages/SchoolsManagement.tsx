import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Avatar,
  Card,
  CardContent,
  Grid,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';

interface School {
  id: number;
  name: string;
  address: string;
  contact: string;
  email: string;
  status: string;
  logo_url?: string;
  created_at: string;
  school_admin_id?: number | null;
}

interface SchoolAdmin {
  id: number;
  username: string;
  name: string;
  email: string;
}

const SchoolsManagement: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  
  // Create admin dialog
  const [createAdminDialogOpen, setCreateAdminDialogOpen] = useState(false);
  const [schoolForNewAdmin, setSchoolForNewAdmin] = useState<School | null>(null);
  const [adminForm, setAdminForm] = useState({ username: '', name: '', email: '', password: '' });
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Edit admin dialog
  const [editAdminDialogOpen, setEditAdminDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<SchoolAdmin | null>(null);
  const [editAdminForm, setEditAdminForm] = useState({ username: '', name: '', email: '', password: '' });
  const [showEditPassword, setShowEditPassword] = useState(false);

  const [form, setForm] = useState({ name: '', address: '', contact: '', email: '', status: 'active' });

  const [schoolAdmins, setSchoolAdmins] = useState<SchoolAdmin[]>([]);
  
  useEffect(() => {
    loadSchools();
    loadSchoolAdmins();
  }, []);

  const loadSchoolAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, name, email')
        .eq('role', 'school_admin');
      if (error) throw error;
      setSchoolAdmins((data || []) as SchoolAdmin[]);
    } catch (error: any) {
      toast.error('Failed to load school admins');
    }
  };

  const handleEditAdminClick = (admin: SchoolAdmin) => {
    setEditingAdmin(admin);
    setEditAdminForm({ username: admin.username, name: admin.name, email: admin.email, password: '' });
    setShowEditPassword(false);
    setEditAdminDialogOpen(true);
  };

  const handleEditAdminSubmit = async () => {
    if (!editingAdmin) return;
    const { username, name, email, password } = editAdminForm;
    if (!username || !name || !email) {
      toast.error('Name, username and email are required');
      return;
    }
    try {
      const updateData: any = { username, name, email };
      if (password.trim()) updateData.password = password.trim();

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', editingAdmin.id);

      if (error) throw error;
      toast.success('School admin updated successfully');
      setEditAdminDialogOpen(false);
      loadSchoolAdmins();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update admin');
    }
  };
  const loadSchools = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchools(data || []);
    } catch (error: any) {
      toast.error('Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (school?: School) => {
    if (school) {
      setEditingSchool(school);
      setForm({ 
        name: school.name, 
        address: school.address || '', 
        contact: school.contact || '',
        email: school.email || '',
        status: school.status || 'active'
      });
    } else {
      setEditingSchool(null);
      setForm({ name: '', address: '', contact: '', email: '', status: 'active' });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSchool(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error('School name is required');
      return;
    }

    try {
      const schoolData = {
        name: form.name,
        address: form.address,
        contact: form.contact,
        email: form.email,
        status: form.status,
        updated_at: new Date().toISOString()
      };

      if (editingSchool) {
        const { error } = await supabase
          .from('schools')
          .update(schoolData)
          .eq('id', editingSchool.id);

        if (error) throw error;
        toast.success('School updated successfully');
      } else {
        const { data: newSchool, error } = await supabase
          .from('schools')
          .insert([{ ...schoolData, created_at: new Date().toISOString() }])
          .select('id')
          .single();

        if (error) throw error;

        // Auto-assign custom_id = S + school.id
        if (newSchool?.id) {
          const { error: updateError } = await supabase
            .from('schools')
            .update({ custom_id: `S${newSchool.id}` })
            .eq('id', newSchool.id);
          if (updateError) throw updateError;
        }

        toast.success('School created successfully');
      }

      handleCloseDialog();
      loadSchools();
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    }
  };

  const handleCreateAdminClick = (school: School) => {
    setSchoolForNewAdmin(school);
    setAdminForm({ username: '', name: '', email: '', password: '' });
    setShowCreatePassword(false);
    setCreateAdminDialogOpen(true);
  };

  // Remove admin from a school (clear school_admin_id)
  const handleRemoveAdmin = async (school: School) => {
    try {
      const { error } = await supabase
        .from('schools')
        .update({ school_admin_id: null })
        .eq('id', school.id);
      if (error) throw error;
      toast.success('Admin removed from school');
      loadSchools();
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove admin');
    }
  };

  const handleCreateAdminSubmit = async () => {
    if (!schoolForNewAdmin) return;
    const { username, name, email, password } = adminForm;
    if (!username || !name || !email || !password) {
      toast.error('All fields are required');
      return;
    }
    try {
      // 1. Create staff entry for the school admin
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .insert([
          {
            name,
            role: 'school_admin',
            email,
            school_id: schoolForNewAdmin.id
          }
        ])
        .select('id')
        .single();
      if (staffError) throw staffError;

      // 1b. Create school_admin role in roles table for this school, or find existing
      let roleId: number | null = null;
      const { data: existingRole, error: roleFetchError } = await supabase
        .from('roles')
        .select('id')
        .eq('school_id', schoolForNewAdmin.id)
        .eq('name', 'school_admin')
        .maybeSingle();

      if (roleFetchError) throw roleFetchError;

      if (existingRole) {
        roleId = existingRole.id;
      } else {
        const { data: newRole, error: roleInsertError } = await supabase
          .from('roles')
          .insert([
            {
              school_id: schoolForNewAdmin.id,
              name: 'school_admin',
              description: 'School Administrator',
              is_system_role: true
            }
          ])
          .select('id')
          .single();
        if (roleInsertError) throw roleInsertError;
        roleId = newRole.id;
      }

      // 2. Create user entry linked to the staff record, school, and role_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([
          {
            username,
            name,
            email,
            password,
            role: 'school_admin',
            role_id: roleId,
            staff_id: staffData.id,
            school_id: schoolForNewAdmin.id
          }
        ])
        .select('id')
        .single();
      if (userError) throw userError;

      // 3. Update the school to reference the newly created user as school_admin_id
      const { error: schoolError } = await supabase
        .from('schools')
        .update({ school_admin_id: userData.id })
        .eq('id', schoolForNewAdmin.id);
      if (schoolError) throw schoolError;

      toast.success('School admin created successfully');
      setCreateAdminDialogOpen(false);
      loadSchoolAdmins();
      loadSchools();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create school admin');
    }
  };

  const handleDeleteClick = (school: School) => {
    setSchoolToDelete(school);
    setDeletePassword('');
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!schoolToDelete) return;
    if (!deletePassword) {
      toast.error('Password is required to delete school');
      return;
    }

    try {
      // 1. Verify the password of the current platform admin user
      if (!user) {
        toast.error('You must be logged in to perform this action');
        return;
      }

      // Check user password from database
      const { data: userData, error: verifyError } = await supabase
        .from(user.role === 'super_admin' ? 'super_admins' : 'users')
        .select('password')
        .eq('id', user.id)
        .single();

      if (verifyError || !userData) {
        toast.error('Error verifying credentials');
        return;
      }

      if (userData.password !== deletePassword) {
        toast.error('Incorrect password. School deletion aborted.');
        return;
      }

      // 2. Perform deletion
      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', schoolToDelete.id);

      if (error) throw error;
      toast.success('School deleted successfully');
      setDeleteConfirmOpen(false);
      setDeletePassword('');
      loadSchools();
    } catch (error: any) {
      toast.error('Cannot delete school. It might have associated records.');
      setDeleteConfirmOpen(false);
      setDeletePassword('');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>Schools</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={() => handleOpenDialog()}
          sx={{ borderRadius: 2, px: 3 }}
        >
          Add School
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {schools.map((school) => (
            <Grid component="div" item xs={12} sm={6} md={4} lg={3} key={school.id}>
              <Card sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 3,
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }
              }}>
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Avatar 
                      src={school.logo_url} 
                      sx={{ width: 64, height: 64, bgcolor: theme.palette.primary.light }}
                    >
                      {school.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <IconButton size="small" onClick={() => handleOpenDialog(school)} color="primary" title="Edit School">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteClick(school)} color="error" title="Delete School">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                      {!school.school_admin_id && (
                        <IconButton size="small" onClick={() => handleCreateAdminClick(school)} color="success" title="Create Admin">
                          <AddIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                  
                  <Typography variant="h6" sx={{ fontWeight: 500 }} gutterBottom noWrap>{school.name}</Typography>
                  
                  <Chip 
                    label={school.status.toUpperCase()} 
                    size="small" 
                    color={school.status === 'active' ? 'success' : 'default'}
                    sx={{ mb: 2, fontWeight: 'bold', fontSize: '0.7rem' }}
                  />

                  {school.school_admin_id ? (
                    <Box sx={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      mt: 1, mb: 1, p: 1, borderRadius: 1,
                      bgcolor: 'action.hover'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
                        <AdminIcon fontSize="small" color="primary" />
                        <Typography variant="body2" color="primary" noWrap>
                          {(() => {
                            const admin = schoolAdmins.find(a => a.id === school.school_admin_id);
                            return admin ? `${admin.name}` : 'Admin assigned';
                          })()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                        <IconButton
                          size="small"
                          title="Edit Admin"
                          color="primary"
                          onClick={() => {
                            const admin = schoolAdmins.find(a => a.id === school.school_admin_id);
                            if (admin) handleEditAdminClick(admin);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleRemoveAdmin(school)} color="error" title="Remove Admin">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No admin assigned
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {school.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                        <EmailIcon fontSize="small" />
                        <Typography variant="body2" sx={{ textAlign: 'center' }}>{school.email}</Typography>
                      </Box>
                    )}
                    {school.contact && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                        <PhoneIcon fontSize="small" />
                        <Typography variant="body2" noWrap>{school.contact}</Typography>
                      </Box>
                    )}
                    {school.address && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                        <LocationIcon fontSize="small" />
                        <Typography variant="body2" noWrap>{school.address}</Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* School Form Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingSchool ? 'Edit School' : 'Add New School'}
          <IconButton onClick={handleCloseDialog} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="School Name"
              fullWidth
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <TextField
              label="Email Address"
              fullWidth
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <TextField
              label="Contact Number"
              fullWidth
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
            />
            <TextField
              label="Address"
              fullWidth
              multiline
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={form.status}
                label="Status"
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={handleCloseDialog} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" disableElevation>
              {editingSchool ? 'Save Changes' : 'Create School'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Create School Admin Dialog */}
      <Dialog open={createAdminDialogOpen} onClose={() => setCreateAdminDialogOpen(false)} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Create Admin — {schoolForNewAdmin?.name}
          <IconButton size="small" onClick={() => setCreateAdminDialogOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2.5 }}>
          <TextField
            label="Full Name"
            fullWidth
            required
            value={adminForm.name}
            onChange={e => setAdminForm({ ...adminForm, name: e.target.value })}
          />
          <TextField
            label="Username"
            fullWidth
            required
            value={adminForm.username}
            onChange={e => setAdminForm({ ...adminForm, username: e.target.value })}
          />
          <TextField
            label="Email Address"
            fullWidth
            required
            type="email"
            value={adminForm.email}
            onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
          />
            <TextField
              label="Password"
              variant="outlined"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setCreateAdminDialogOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={handleCreateAdminSubmit} disableElevation>Create Admin</Button>
        </DialogActions>
      </Dialog>

      {/* Edit School Admin Dialog */}
      <Dialog open={editAdminDialogOpen} onClose={() => setEditAdminDialogOpen(false)} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Edit School Admin
          <IconButton size="small" onClick={() => setEditAdminDialogOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2.5 }}>
          <TextField
            label="Full Name"
            fullWidth
            required
            value={editAdminForm.name}
            onChange={e => setEditAdminForm({ ...editAdminForm, name: e.target.value })}
          />
          <TextField
            label="Username"
            fullWidth
            required
            value={editAdminForm.username}
            onChange={e => setEditAdminForm({ ...editAdminForm, username: e.target.value })}
          />
          <TextField
            label="Email Address"
            fullWidth
            required
            type="email"
            value={editAdminForm.email}
            onChange={e => setEditAdminForm({ ...editAdminForm, email: e.target.value })}
          />
            <TextField
              label="New Password (leave blank to keep current)"
              fullWidth
              type={showEditPassword ? 'text' : 'password'}
              value={editAdminForm.password}
              onChange={e => setEditAdminForm({ ...editAdminForm, password: e.target.value })}
              helperText="Only fill this if you want to reset the password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowEditPassword(p => !p)} edge="end">
                      {showEditPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setEditAdminDialogOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={handleEditAdminSubmit} disableElevation>Save Changes</Button>
        </DialogActions>
      </Dialog>


      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} sx={{ '& .MuiDialog-paper': { borderRadius: 3, width: '100%', maxWidth: 450 } }}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Typography>
            Are you sure you want to delete <strong>{schoolToDelete?.name}</strong>? This action cannot be undone and will fail if the school has associated records.
          </Typography>
          <TextField
            label="Your Account Password"
            type="password"
            fullWidth
            required
            size="small"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disableElevation>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SchoolsManagement;
