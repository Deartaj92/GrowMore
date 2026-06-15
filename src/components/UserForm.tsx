import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { supabase } from '../supabaseClient';
import { useToast } from './useToast';
import { useAuth } from '../contexts/AuthContext';
import { crypt, gen_salt } from '../utils/crypto';
import { Visibility, VisibilityOff } from '@mui/icons-material';

interface User {
  id?: number;
  username: string;
  name: string;
  role: string;
  role_id?: number | null;
  status: string;
  avatar_url: string | null;
  password: string;
  staff_id?: number;
  school_id?: number;
}

interface Role {
  id: number;
  name: string;
}

interface Staff {
  id: number;
  name: string;
  role: string;
  mobile: string;
  father_name?: string | null;
}

interface UserFormProps {
  user?: User;
  onClose: () => void;
  onSuccess: () => void;
}

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30, 32, 38, 0.38);
  backdrop-filter: blur(7px) saturate(1.2);
  animation: modal-fade-in 0.25s;
  @media (max-width: 700px) {
    align-items: flex-start;
    padding: 24px 0 0 0;
  }

  @keyframes modal-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const FormContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-radius: 16px;
  padding: 32px 32px 24px 32px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  border: 1.5px solid ${({ theme }) => theme.BORDER};
  position: relative;
  @media (max-width: 700px) {
    max-width: 98vw;
    padding: 18px 6px 16px 6px;
    border-radius: 12px;
  }
`;

const Title = styled.h2`
  margin: 0 0 20px 0;
  color: ${({ theme }) => theme.ACCENT};
  font-size: 1.25rem;
  font-weight: 700;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 14px;
  font-weight: 500;
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 8px;
  font-size: 14px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  transition: border 0.18s;
  width: 100%;
  box-sizing: border-box;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}33;
  }
`;

const PasswordWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
`;

const PasswordToggleButton = styled.button`
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  &:hover {
    color: ${({ theme }) => theme.ACCENT};
  }
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 8px;
  font-size: 14px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  transition: border 0.18s;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}33;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`;

const Button = styled.button<{ variant?: 'secondary' }>`
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: ${({ variant, theme }) => variant === 'secondary' ? theme.CANCEL_BG : theme.ACCENT};
  color: ${({ variant, theme }) => variant === 'secondary' ? theme.CANCEL_COLOR : '#fff'};
  transition: background 0.18s, color 0.18s;
  &:hover {
    background: ${({ variant, theme }) => variant === 'secondary' ? theme.ACCENT_INPUT : theme.ACCENT_INPUT};
    color: #fff;
  }
`;

const UserForm: React.FC<UserFormProps> = ({ user, onClose, onSuccess }) => {
  const [form, setForm] = useState<User>({
    username: '',
    name: '',
    role: '',
    role_id: null,
    status: 'active',
    avatar_url: null,
    password: '',
    staff_id: undefined
  });
  const [staff, setStaff] = useState<Staff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [usernameStatus, setUsernameStatus] = useState<'checking' | 'available' | 'taken' | 'idle'>('idle');
  const [showPassword, setShowPassword] = useState(false);
  const toast = useToast();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchRoles();
    fetchStaff();
  }, []);

  useEffect(() => {
    if (user) {
      // If role_id is missing, try to find it from the role name
      let roleId = user.role_id;
      if (!roleId && user.role && roles.length > 0) {
        const matchingRole = roles.find(r => r.name === user.role);
        roleId = matchingRole?.id || null;
      }
      
      setForm({
        ...user,
        role_id: roleId || null
      });
      // For existing users, check if their username meets requirements
      if (user.username && user.username.length >= 4) {
        setUsernameStatus('available');
      } else {
        setUsernameStatus('idle');
      }
    } else {
      // For new users, reset username status and fetch default password
      setUsernameStatus('idle');
      fetchDefaultPassword();
      // Set default role to first available role (usually Teacher)
      if (roles.length > 0) {
        const defaultRole = roles.find(r => r.name === 'Teacher') || roles[0];
        setForm(prev => ({
          ...prev,
          role: defaultRole.name,
          role_id: defaultRole.id
        }));
      }
    }
  }, [user, roles]);

  const generateRandomPassword = (): string => {
    // Generate a random 5-digit number (10000 to 99999)
    const min = 10000;
    const max = 99999;
    const randomPassword = Math.floor(Math.random() * (max - min + 1)) + min;
    return String(randomPassword);
  };

  const fetchDefaultPassword = () => {
    // Generate random 5-digit password for new staff users
    const randomPassword = generateRandomPassword();
    setForm(prev => ({ ...prev, password: randomPassword }));
  };

  useEffect(() => {
    if (form.role && form.role !== 'Guest') {
      const filtered = staff.filter(s => s.role === form.role);
      setFilteredStaff(filtered);
      if (!staffLoading && filtered.length === 0) {
        toast.showToast(`No staff members found for role: ${form.role}`, 'error');
      }
    } else if (form.role === 'Guest') {
      // For Guest users, clear staff selection and allow manual name entry
      setFilteredStaff([]);
      setForm(prev => ({ ...prev, staff_id: undefined }));
    }
  }, [form.role, staff, staffLoading, toast]);

  const fetchRoles = async () => {
    if (!currentUser?.school_id) return;
    setRolesLoading(true);
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name')
        .eq('school_id', currentUser.school_id)
        .order('name');

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      toast.showToast('Failed to fetch roles', 'error');
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchStaff = async () => {
    if (!currentUser?.school_id) return;
    setStaffLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, role, mobile, father_name')
        .eq('school_id', currentUser.school_id)
        .order('name');

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      toast.showToast('Failed to fetch staff members', 'error');
    } finally {
      setStaffLoading(false);
    }
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || !currentUser?.school_id) {
      setUsernameStatus('idle');
      return;
    }

    // Check minimum length requirement for both new and existing users
    if (username.length < 4) {
      setUsernameStatus('idle');
      return;
    }

    if (user && username === user.username) {
      setUsernameStatus('available');
      return;
    }

    setUsernameStatus('checking');
    
    try {
      const { data: existingUser, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .eq('school_id', currentUser.school_id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No user found with this username
        setUsernameStatus('available');
      } else if (existingUser) {
        setUsernameStatus('taken');
      } else {
        setUsernameStatus('available');
      }
    } catch (error) {
      setUsernameStatus('available');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'username') {
      const cleanUsername = value.toLowerCase().replace(/\s+/g, '');
      setForm(prev => ({ ...prev, [name]: cleanUsername }));
      
      // Check username availability after a short delay
      if (cleanUsername.length >= 4) {
        const timeoutId = setTimeout(() => checkUsernameAvailability(cleanUsername), 500);
        return () => clearTimeout(timeoutId);
      } else {
        setUsernameStatus('idle');
      }
    } else if (name === 'role') {
      // Find the role_id for the selected role
      const selectedRole = roles.find(r => r.name === value);
      setForm(prev => ({
        ...prev,
        role: value,
        role_id: selectedRole?.id || null,
        staff_id: undefined
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleStaffSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const staffId = parseInt(e.target.value);
    const selectedStaff = staff.find(s => s.id === staffId);
    if (selectedStaff) {
      // Find the role_id for the staff member's role
      const staffRole = roles.find(r => r.name === selectedStaff.role);
      setForm(prev => ({
        ...prev,
        staff_id: staffId,
        name: selectedStaff.name,
        role: selectedStaff.role,
        role_id: staffRole?.id || null
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username) {
      toast.showToast('Username is required', 'error');
      return;
    }
    
    // Password is only required for new users
    if (!user && !form.password) {
      toast.showToast('Password is required for new users', 'error');
      return;
    }

    if (!currentUser?.school_id) {
      toast.showToast('School information not found. Please try logging in again.', 'error');
      return;
    }

    try {
      if (user) {
        // For updates, check if username is changed and if it conflicts with existing users
        if (form.username !== user.username) {
          const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('username', form.username)
            .eq('school_id', currentUser.school_id)
            .neq('id', user.id) // Exclude current user from check
            .single();

          if (existingUser) {
            toast.showToast('Username already exists. Please choose a different username.', 'error');
            return;
          }
        }

        const { error } = await supabase
          .from('users')
          .update({
            username: form.username,
            name: form.name,
            role: form.role,
            role_id: form.role_id,
            status: form.status,
            staff_id: form.staff_id,
            school_id: currentUser?.school_id
          })
          .eq('id', user.id);

        if (error) throw error;
        toast.showToast('User updated successfully', 'success');
      } else {
        // For new users, check if username already exists
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('username', form.username)
          .eq('school_id', currentUser.school_id)
          .single();

        if (existingUser) {
          toast.showToast('Username already exists. Please choose a different username.', 'error');
          return;
        }

        const { error } = await supabase
          .from('users')
          .insert([{
            username: form.username,
            name: form.name,
            role: form.role,
            role_id: form.role_id,
            status: form.status,
            password: form.password,
            staff_id: form.staff_id,
            school_id: currentUser?.school_id
          }]);

        if (error) {
          throw error;
        }
        toast.showToast('User created successfully', 'success');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      
      // Handle specific database errors
      if (error.code === '23505' && error.message.includes('username')) {
        toast.showToast('Username already exists. Please choose a different username.', 'error');
      } else {
        toast.showToast('Failed to save user', 'error');
      }
    }
  };

  return (
    <Modal onClick={onClose}>
      <FormContainer onClick={e => e.stopPropagation()}>
        <Title>{user ? 'Edit User' : 'Add User'}</Title>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Role*</Label>
            <Select 
              name="role" 
              value={form.role} 
              onChange={handleChange} 
              required
              disabled={rolesLoading}
            >
              {rolesLoading ? (
                <option value="">Loading roles...</option>
              ) : roles.length === 0 ? (
                <option value="">No roles available</option>
              ) : (
                <>
                  <option value="">Select a role</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </>
              )}
            </Select>
          </FormGroup>

          {form.role !== 'Guest' ? (
            <FormGroup>
              <Label>Select Staff Member*</Label>
              <Select 
                value={form.staff_id || ''} 
                onChange={handleStaffSelect}
                required
                disabled={filteredStaff.length === 0}
              >
                <option value="">{filteredStaff.length === 0 ? 'No staff members found for this role' : 'Select a staff member'}</option>
                {filteredStaff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.id} · {s.name}{s.father_name ? ` · ${s.father_name}` : ''}
                  </option>
                ))}
              </Select>
              {filteredStaff.length === 0 && (
                <div style={{ 
                  fontSize: '12px', 
                  color: '#f59e0b', 
                  marginTop: '4px',
                  fontStyle: 'italic'
                }}>
                  Please add staff members with this role first
                </div>
              )}
            </FormGroup>
          ) : (
            <FormGroup>
              <Label>Name*</Label>
              <Input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter guest user name"
                required
              />
              <div style={{ 
                fontSize: '12px', 
                color: '#6b7280', 
                marginTop: '4px',
                fontStyle: 'italic'
              }}>
                Guest users are not linked to staff members
              </div>
            </FormGroup>
          )}

          <FormGroup>
            <Label>Username*</Label>
            <Input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              style={{
                borderColor: usernameStatus === 'available' ? '#22c55e' : 
                             usernameStatus === 'taken' ? '#ef4444' : 
                             usernameStatus === 'checking' ? '#f59e0b' : undefined
              }}
            />
            {/* Username status indicator */}
            {usernameStatus !== 'idle' && (
              <div style={{
                fontSize: '0.8rem',
                marginTop: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {usernameStatus === 'checking' && (
                  <>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #f59e0b', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                    <span style={{ color: '#f59e0b' }}>Checking availability...</span>
                  </>
                )}
                {usernameStatus === 'available' && (
                  <>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                    <span style={{ color: '#22c55e' }}>Username available</span>
                  </>
                )}
                {usernameStatus === 'taken' && (
                  <>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                    <span style={{ color: '#ef4444' }}>Username already taken</span>
                  </>
                )}
              </div>
            )}
            {/* Show minimum character message when username is too short */}
            {form.username.length > 0 && form.username.length < 4 && (
              <div style={{
                fontSize: '0.8rem',
                marginTop: '0.25rem',
                color: '#f59e0b',
                fontStyle: 'italic'
              }}>
                Minimum 4 characters required
              </div>
            )}
            {/* Show validation message for edit mode when username is invalid */}
            {user && form.username.length > 0 && form.username.length < 4 && (
              <div style={{
                fontSize: '0.8rem',
                marginTop: '0.25rem',
                color: '#ef4444',
                fontStyle: 'italic'
              }}>
                Username must be at least 4 characters to save changes
              </div>
            )}
          </FormGroup>

          {!user && (
            <FormGroup>
              <Label>Password*</Label>
              <PasswordWrapper>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  disabled={usernameStatus !== 'available'}
                  style={{
                    opacity: usernameStatus === 'available' ? 1 : 0.6,
                    cursor: usernameStatus === 'available' ? 'text' : 'not-allowed',
                    paddingRight: '35px'
                  }}
                />
                {usernameStatus === 'available' && (
                  <PasswordToggleButton type="button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </PasswordToggleButton>
                )}
              </PasswordWrapper>
              {usernameStatus !== 'available' && (
                <div style={{
                  fontSize: '0.8rem',
                  marginTop: '0.25rem',
                  color: '#f59e0b',
                  fontStyle: 'italic'
                }}>
                  {usernameStatus === 'idle' ? 'Enter a valid username first' : 
                   usernameStatus === 'checking' ? 'Checking username availability...' :
                   usernameStatus === 'taken' ? 'Choose a different username' : 
                   'Username must be at least 4 characters'}
                </div>
              )}
            </FormGroup>
          )}
          {/* Show password change option for existing users */}
          {user && (
            <FormGroup>
              <Label>Password</Label>
              <PasswordWrapper>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Leave blank to keep current password"
                  style={{
                    opacity: 0.8,
                    fontStyle: 'italic',
                    paddingRight: '35px'
                  }}
                />
                <PasswordToggleButton type="button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </PasswordToggleButton>
              </PasswordWrapper>
              <div style={{
                fontSize: '0.8rem',
                marginTop: '0.25rem',
                color: '#888',
                fontStyle: 'italic'
              }}>
                Leave blank to keep current password unchanged
              </div>
            </FormGroup>
          )}

          <FormGroup>
            <Label>Status</Label>
            <Select name="status" value={form.status} onChange={handleChange}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormGroup>

          <ButtonGroup>
            <Button type="submit" disabled={usernameStatus === 'taken' || (form.username.length > 0 && form.username.length < 4)}>
              {user ? 'Update' : 'Create'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          </ButtonGroup>
        </Form>
      </FormContainer>
    </Modal>
  );
};

export default UserForm; 