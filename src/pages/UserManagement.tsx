import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import { AccountCircle, Add, Edit, Delete, Search, FilterList, Visibility, VisibilityOff, Lock } from '@mui/icons-material';
import UserForm from '../components/UserForm';
import { useAuth } from '../contexts/AuthContext';
import NoSessionsFound from '../components/NoSessionsFound';
import Loader from '../components/Loader';

// Types
interface User {
  id: number;
  username: string;
  name: string;
  role: 'Principal' | 'Management Staff' | 'Teacher' | 'Accountant' | 'Store Manager' | 'Guest' | 'Other';
  status: string;
  avatar_url: string | null;
  created_at: string;
  password: string;
  staff_id?: number;
  school_id?: number;
}

interface Staff {
  id: number;
  name: string;
  role: string;
  mobile: string;
  picture_url?: string | null;
}

// Styled Components
const Container = styled.div`
  width: 90vw;
  max-width: 1550px;
  margin: 0 auto;
  padding: 1.5rem 0.3rem;
  @media (max-width: 768px) {
    padding: 1rem 0.1rem;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  @media (max-width: 600px) {
    flex-direction: column;
    gap: 10px;
  }
`;

const Title = styled.h1`
  font-size: 24px;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
`;

const SearchBar = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#fff'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  padding: 8px 12px;
  width: 300px;
  @media (max-width: 600px) {
    width: 100%;
  }
`;

const SearchInput = styled.input`
  border: none;
  background: none;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 14px;
  width: 100%;
  &:focus {
    outline: none;
  }
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background: #4f46e5;
  }
`;

const UserGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-top: 2rem;
  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const UserCard = styled.div<{ status: string }>`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : theme.CARD};
  border-radius: 14px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.18), 0 1.5px 6px rgba(0,0,0,0.10);
  padding: 1.5rem 1.5rem 1.2rem 1.5rem;
  position: relative;
  border: 2.5px solid rgba(${({ status }) => getStatusColor(status)}, 0.5);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.18s;
  min-width: 270px;
  max-width: 100%;
  width: 100%;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: rgba(${({ status }) => getStatusColor(status)}, 0.8);
  }
`;

const RoleBadge = styled.div<{ role: string }>`
  position: absolute;
  top: -12px;
  right: 8px;
  padding: 0.18rem 0.7rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  background: ${({ role }) => {
    switch (role) {
      case 'Principal': return '#ef4444';
      case 'Management Staff': return '#22c55e';
      case 'Teacher': return '#6366f1';
      case 'Accountant': return '#f59e0b';
      case 'Store Manager': return '#8b5cf6';
      case 'Guest': return '#10b981';
      default: return '#6b7280';
    }
  }};
  color: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.13);
  z-index: 3;
  letter-spacing: 0.02em;
`;

const StatusBadge = styled.div<{ status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-left: 8px;
  padding: 0.18rem 0.7rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  background: ${({ status }) =>
    status === 'active' ? 'rgba(34, 197, 94, 0.3)' :
    status === 'suspended' ? 'rgba(245, 158, 11, 0.3)' :
    status === 'withdrawn' ? 'rgba(239, 68, 68, 0.3)' :
    'rgba(99, 102, 241, 0.3)'};
  color: #fff;
  letter-spacing: 0.02em;

  ${({ status }) => status === 'active' && `
    &::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.2; }
      50% { opacity: 0.8; }
    }
  `}
`;

const CardTop = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0.7rem;
`;

const Avatar = styled.div<{ src?: string | null }>`
  width: 68px;
  height: 88px;
  border-radius: 16px;
  background: ${({ src, theme }) => src ? `url(${src})` : theme.ACCENT + '22'};
  background-size: cover;
  background-position: center;
  color: ${({ theme }) => theme.ACCENT};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  margin-right: 1.2rem;
  flex-shrink: 0;
  overflow: hidden;
`;

const UserName = styled.h3`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const UsernameText = styled.div`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-bottom: 0.2rem;
`;

const InfoRow = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.9rem;
  margin: 0.25rem 0;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.25rem;
  margin-top: 1rem;
  flex-wrap: wrap;
  width: 100%;
  justify-content: flex-end;
  align-items: center;
`;

const CardActionButton = styled.button<{ $variant?: 'primary' | 'danger' }>`
  background: ${({ $variant }) =>
    $variant === 'danger' ? 'rgba(239, 68, 68, 0.13)' :
    $variant === 'primary' ? 'rgba(99, 102, 241, 0.13)' :
    'rgba(120,120,120,0.10)'};
  color: ${({ $variant }) =>
    $variant === 'danger' ? '#ef4444' :
    $variant === 'primary' ? '#6366f1' :
    '#888'};
  border: 1.1px solid
    ${({ $variant }) =>
      $variant === 'danger' ? 'rgba(239, 68, 68, 0.25)' :
      $variant === 'primary' ? 'rgba(99, 102, 241, 0.25)' :
      'rgba(120,120,120,0.13)'};
  border-radius: 6px;
  padding: 0.18rem 0.55rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: background 0.18s, color 0.18s, border 0.18s;
  box-shadow: none;
  min-width: 0;
  white-space: nowrap;
  &:hover {
    background: ${({ $variant }) =>
      $variant === 'danger' ? 'rgba(239, 68, 68, 0.22)' :
      $variant === 'primary' ? 'rgba(99, 102, 241, 0.22)' :
      'rgba(120,120,120,0.18)'};
    border-color: ${({ $variant }) =>
      $variant === 'danger' ? '#ef4444' :
      $variant === 'primary' ? '#6366f1' :
      '#888'};
    color: #fff;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Helper for status color (reuse from StudentStatusManager)
const getStatusColor = (status: string) =>
  status === 'active' ? '34,197,94' : // green
  status === 'suspended' ? '245,158,11' : // orange
  status === 'withdrawn' ? '239,68,68' : // red
  '99,102,241'; // blue

// Modal and related styled components for password modal
const PasswordModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;
const PasswordFormContainer = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#fff'};
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;
const PasswordTitle = styled.h2`
  margin: 0 0 20px 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 20px;
`;
const PasswordFormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
const PasswordLabel = styled.label`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 14px;
  font-weight: 500;
`;
const PasswordInput = styled.input`
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 6px;
  font-size: 14px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#fff'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  &:focus {
    outline: none;
    border-color: #6366f1;
  }
`;
const PasswordButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`;
const PasswordButton = styled.button<{ variant?: 'secondary' }>`
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: ${({ variant }) => variant === 'secondary' ? '#6b7280' : '#6366f1'};
  color: white;
  &:hover {
    background: ${({ variant }) => variant === 'secondary' ? '#4b5563' : '#4f46e5'};
  }
`;

const AvatarImagePreview = styled.div`
  position: fixed;
  z-index: 9999;
  background: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  border-radius: 0;
  box-shadow: none;
`;

const PreviewImg = styled.img`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 4px 18px #0006;
  background: #232a3b;
`;

const AddUserCard = styled(UserCard)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.ACCENT};
  cursor: pointer;
  min-height: 180px;
  border-style: dashed;
  border-color: ${({ theme }) => theme.ACCENT};
  box-shadow: none;
  transition: background 0.18s, border-color 0.18s;
  &:hover {
    background: ${({ theme }) => theme.ACCENT + '11'};
    border-color: ${({ theme }) => theme.ACCENT};
    color: ${({ theme }) => theme.ACCENT};
  }
`;

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const toast = useToast();
  const { user } = useAuth();
  const [viewPasswordId, setViewPasswordId] = useState<number | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hoveredAvatar, setHoveredAvatar] = useState<{ url: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const checkActiveSession = async () => {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user?.school_id)
        .maybeSingle();
      if (sessionError && !(
        sessionError.code === 'PGRST116' ||
        sessionError.message?.includes('multiple (or no) rows returned') ||
        sessionError.details?.includes('contains 0 rows')
      )) {
        setHasActiveSession(false);
        setLoading(false);
        return;
      }
      setHasActiveSession(!!sessionData);
      setLoading(false);
    };
    checkActiveSession();
  }, [user?.school_id]);

  useEffect(() => {
    if (hasActiveSession) {
    fetchUsers();
    fetchStaff();
    }
  }, [user?.school_id, hasActiveSession]);

  const fetchStaff = async () => {
    if (!user?.school_id) {
      toast.showToast('User school information not found', 'error');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, role, mobile, picture_url')
        .eq('school_id', user.school_id)
        .order('name');

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      toast.showToast('Failed to fetch staff', 'error');
    }
  };

  const fetchUsers = async () => {
    if (!user?.school_id) {
      toast.showToast('User school information not found', 'error');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      toast.showToast('Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get staff name and avatar
  const getStaffInfo = (staffId: number | undefined) => {
    if (!staffId) return { name: '-', avatar: null };
    const staffMember = staff.find(s => s.id === staffId);
    return {
      name: staffMember ? staffMember.name : '-',
      avatar: staffMember?.picture_url || null
    };
  };

  const handleDelete = async (id: number) => {
    if (!user?.school_id) {
      toast.showToast('User school information not found', 'error');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)
        .eq('school_id', user.school_id);

      if (error) throw error;
      setUsers(users.filter(user => user.id !== id));
      toast.showToast('User deleted successfully', 'success');
    } catch (error) {
      toast.showToast('Failed to delete user', 'error');
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setShowForm(true);
  };

  const handleAdd = () => {
    setSelectedUser(undefined);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    fetchUsers();
  };

  const handleViewPassword = (user: User) => {
    setPasswordUser(user);
    setShowPasswordModal(true);
    setShowPassword(false);
    setNewPassword('');
  };

  const handleChangePassword = async () => {
    if (!passwordUser || !user?.school_id) {
      toast.showToast('User school information not found', 'error');
      return;
    }
    if (!newPassword) {
      toast.showToast('Password cannot be empty', 'error');
      return;
    }
    try {
      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', passwordUser.id)
        .eq('school_id', user.school_id);
      if (error) throw error;
      toast.showToast('Password updated successfully', 'success');
      setShowPasswordModal(false);
      setPasswordUser(null);
      setNewPassword('');
      fetchUsers();
    } catch (error) {
      toast.showToast('Failed to update password', 'error');
    }
  };

  const filteredUsers = users.filter(user => {
    const staffInfo = getStaffInfo(user.staff_id);
    const searchLower = searchTerm.toLowerCase();
    return (
      staffInfo.name.toLowerCase().includes(searchLower) ||
      user.username.toLowerCase().includes(searchLower) ||
      user.name.toLowerCase().includes(searchLower) ||
      user.role.toLowerCase().includes(searchLower)
    );
  });

  if (loading) return <Loader />;
  if (!hasActiveSession) return <NoSessionsFound />;

  return (
    <Container>
      <Header>
        <Title>User Management</Title>
        <div style={{ display: 'flex', gap: '10px' }}>
          <SearchBar>
            <Search style={{ color: '#6b7280' }} />
            <SearchInput
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchBar>
        </div>
      </Header>

      <UserGrid>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>Loading...</div>
        ) : filteredUsers.length === 0 ? (
          <>
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>No users found</div>
            <AddUserCard status="active" onClick={handleAdd} title="Add User">
              <Add style={{ fontSize: 48, marginBottom: 8 }} />
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Add User</div>
            </AddUserCard>
          </>
        ) : (
          <>
            <AddUserCard status="active" onClick={handleAdd} title="Add User">
              <Add style={{ fontSize: 48, marginBottom: 8 }} />
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Add User</div>
            </AddUserCard>
            {filteredUsers.map(user => {
              const staffInfo = getStaffInfo(user.staff_id);
              // For Guest users, use the user's name directly instead of staff name
              const displayName = user.role === 'Guest' ? user.name : staffInfo.name;
              const displayAvatar = user.role === 'Guest' ? user.avatar_url : staffInfo.avatar;
              return (
                <UserCard key={user.id} status={user.status}>
                  <RoleBadge role={user.role}>{user.role}</RoleBadge>
                  <CardTop>
                    <Avatar src={displayAvatar}>
                      {!displayAvatar && displayName.charAt(0).toUpperCase()}
                    </Avatar>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <UserName>
                        {displayName}
                        <StatusBadge status={user.status}>
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </StatusBadge>
                      </UserName>
                      <UsernameText>@{user.username}</UsernameText>
                    </div>
                  </CardTop>
                  <ActionButtons>
                    <CardActionButton onClick={() => handleViewPassword(user)} title="View/Change Password">
                      <Lock />
                    </CardActionButton>
                    <CardActionButton onClick={() => handleEdit(user)} title="Edit User">
                      <Edit />
                    </CardActionButton>
                    <CardActionButton $variant="danger" onClick={() => handleDelete(user.id)} title="Delete User">
                      <Delete />
                    </CardActionButton>
                  </ActionButtons>
                </UserCard>
              );
            })}
          </>
        )}
      </UserGrid>

      {/* Password Modal */}
      {showPasswordModal && passwordUser && (
        <PasswordModal onClick={() => setShowPasswordModal(false)}>
          <PasswordFormContainer onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <PasswordTitle>View / Change Password</PasswordTitle>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Avatar src={getStaffInfo(passwordUser.staff_id).avatar}>
                {!getStaffInfo(passwordUser.staff_id).avatar && getStaffInfo(passwordUser.staff_id).name.charAt(0).toUpperCase()}
              </Avatar>
              <div>
                <strong>User:</strong> {getStaffInfo(passwordUser.staff_id).name} (@{passwordUser.username})
              </div>
            </div>
            <PasswordFormGroup>
              <PasswordLabel>Current Password</PasswordLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PasswordInput
                  type={showPassword ? 'text' : 'password'}
                  value={passwordUser.password}
                  readOnly
                  style={{ flex: 1 }}
                />
                <CardActionButton type="button" onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </CardActionButton>
              </div>
            </PasswordFormGroup>
            <PasswordFormGroup>
              <PasswordLabel>New Password</PasswordLabel>
              <PasswordInput
                type="password"
                value={newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </PasswordFormGroup>
            <PasswordButtonGroup>
              <PasswordButton type="button" onClick={handleChangePassword}>Change Password</PasswordButton>
              <PasswordButton type="button" variant="secondary" onClick={() => setShowPasswordModal(false)}>Cancel</PasswordButton>
            </PasswordButtonGroup>
          </PasswordFormContainer>
        </PasswordModal>
      )}

      {showForm && (
        <UserForm
          user={selectedUser}
          onClose={() => {
            setShowForm(false);
            setSelectedUser(undefined);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {hoveredAvatar && (
        <AvatarImagePreview 
          style={{ 
            top: hoveredAvatar.y - 130,
            left: hoveredAvatar.x - 60
          }}
          onMouseEnter={() => setHoveredAvatar(null)}
        >
          <PreviewImg src={hoveredAvatar.url} alt="Avatar Preview" />
        </AvatarImagePreview>
      )}
    </Container>
  );
};

export default UserManagement; 