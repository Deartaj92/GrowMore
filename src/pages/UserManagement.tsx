import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import { AccountCircle, Add, Edit, Delete, Search, FilterList, Visibility, VisibilityOff, Lock, People, School, FamilyRestroom, Refresh } from '@mui/icons-material';
import { Tabs, Tab, Box } from '@mui/material';
import UserForm from '../components/UserForm';
import { useAuth } from '../contexts/AuthContext';
import { getStudentDisplayId } from '../utils/studentUtils';
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
  last_online?: string;
  is_online?: boolean;
  app_version?: string;
}

interface Staff {
  id: number;
  name: string;
  role: string;
  mobile: string;
  picture_url?: string | null;
}

interface Parent {
  id: number;
  name: string;
  contact_person: string;
  contact_number: string;
  address: string;
  avatar_url: string | null;
  created_at: string;
  last_online?: string;
  is_online?: boolean;
  app_version?: string;
}

interface Student {
  id: number;
  student_number?: string;
  name: string;
  father_name?: string;
  class_id?: number;
  section_id?: number;
  phone?: string;
  picture_url: string | null;
  status: string;
  created_at: string;
  last_online?: string;
  is_online?: boolean;
  app_version?: string;
  classes?: { name: string } | null;
  sections?: { name: string } | null;
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
  justify-content: space-between;
  align-items: center;
`;

const StatusInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  flex: 1;
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
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(0, 0, 0, 0.5)'
    : 'rgba(255, 255, 255, 0.5)'};
  backdrop-filter: blur(8px);
  WebkitBackdropFilter: blur(8px);
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fade-in 0.2s ease-out;
  @keyframes fade-in {
    from { opacity: 0; backdrop-filter: blur(0); }
    to { opacity: 1; backdrop-filter: blur(8px); }
  }
`;
const PasswordFormContainer = styled.div`
  background: ${({ theme }) => theme.CARD || (theme.BG === '#252525' ? '#2a2a2a' : '#fff')};
  width: 90vw;
  max-width: 500px;
  max-height: 90vh;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: ${({ theme }) => theme.BG === '#252525'
    ? '0 0 40px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.4)'
    : '0 0 40px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.1)'};
  border: ${({ theme }) => theme.BG === '#252525'
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  margin: 32px 16px;
  position: relative;
  z-index: 1301;
  padding: 24px;
  overflow-y: auto;
  animation: slide-up 0.3s cubic-bezier(0.2, 0.9, 0.4, 1);
  @keyframes slide-up {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @media (max-width: 768px) {
    width: calc(100% - 32px);
    max-height: auto;
    height: auto;
    margin: 16px;
    padding: 16px 12px;
  }
  @media (max-width: 480px) {
    width: calc(100% - 24px);
    margin: 12px;
    padding: 14px 10px;
    max-height: 85vh;
  }
`;
const PasswordTitle = styled.h2`
  margin: 0 0 20px 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 20px;
  @media (max-width: 768px) {
    font-size: 16px;
    margin: 0 0 12px 0;
    font-weight: 700;
  }
  @media (max-width: 480px) {
    font-size: 14px;
    margin: 0 0 10px 0;
  }
`;
const PasswordFormGroup = styled.div`
  margin-bottom: 20px;
  @media (max-width: 768px) {
    margin-bottom: 14px;
  }
  @media (max-width: 480px) {
    margin-bottom: 12px;
  }
`;
const PasswordLabel = styled.label`
  display: block;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 500;
  font-size: 14px;
  @media (max-width: 768px) {
    font-size: 12px;
    margin-bottom: 6px;
  }
  @media (max-width: 480px) {
    font-size: 11px;
    margin-bottom: 5px;
  }
`;
const PasswordInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#fff'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 14px;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT || '#6366f1'};
  }
  @media (max-width: 768px) {
    padding: 8px 10px;
    font-size: 13px;
  }
  @media (max-width: 480px) {
    padding: 7px 9px;
    font-size: 12px;
  }
`;
const PasswordButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
  }
  @media (max-width: 480px) {
    gap: 6px;
    margin-top: 14px;
  }
`;
const PasswordButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: ${({ variant, theme }) =>
    variant === 'secondary'
      ? (theme.BG === '#252525' ? '#2a2a2a' : '#f3f4f6')
      : (theme.ACCENT || '#6366f1')};
  color: ${({ variant }) => variant === 'secondary' ? 'inherit' : 'white'};
  &:hover {
    opacity: 0.9;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  @media (max-width: 768px) {
    padding: 10px;
    font-size: 13px;
    width: 100%;
  }
  @media (max-width: 480px) {
    padding: 8px;
    font-size: 12px;
  }
`;
const PasswordDisplayWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
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

const TabsContainer = styled.div`
  margin-bottom: 24px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

const TabPanel = styled.div`
  margin-top: 24px;
`;

// Skeleton Loading Components
const SkeletonCard = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : theme.CARD};
  border-radius: 14px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.18), 0 1.5px 6px rgba(0,0,0,0.10);
  padding: 1.5rem 1.5rem 1.2rem 1.5rem;
  position: relative;
  border: 2.5px solid ${({ theme }) => theme.BORDER};
  min-width: 270px;
  max-width: 100%;
  width: 100%;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

const SkeletonAvatar = styled.div`
  width: 68px;
  height: 88px;
  border-radius: 16px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  margin-right: 1.2rem;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

const SkeletonLine = styled.div<{ $width?: string; $height?: string; $margin?: string }>`
  width: ${({ $width }) => $width || '100%'};
  height: ${({ $height }) => $height || '16px'};
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 4px;
  margin-bottom: ${({ $margin }) => $margin || '8px'};
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

const SkeletonBadge = styled.div`
  position: absolute;
  top: -12px;
  right: 8px;
  width: 80px;
  height: 24px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 999px;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

const SkeletonButton = styled.div`
  width: 40px;
  height: 32px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 6px;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

const SkeletonCardContent = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0.7rem;
  margin-bottom: 1rem;
`;

const SkeletonCardActions = styled.div`
  display: flex;
  gap: 0.25rem;
  margin-top: 1rem;
  justify-content: flex-end;
`;

const SkeletonUserCard = () => (
  <SkeletonCard>
    <SkeletonBadge />
    <SkeletonCardContent>
      <SkeletonAvatar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <SkeletonLine $width="70%" $height="20px" $margin="0.5rem" />
        <SkeletonLine $width="50%" $height="14px" $margin="0.25rem" />
        <SkeletonLine $width="60%" $height="14px" $margin="0.25rem" />
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <SkeletonLine $width="60px" $height="12px" $margin="0" />
          <SkeletonLine $width="50px" $height="12px" $margin="0" />
        </div>
      </div>
    </SkeletonCardContent>
    <SkeletonCardActions>
      <SkeletonButton />
      <SkeletonButton />
      <SkeletonButton />
    </SkeletonCardActions>
  </SkeletonCard>
);

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
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
  const [activeTab, setActiveTab] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentPasswordModal, setShowStudentPasswordModal] = useState(false);
  const [studentNewPassword, setStudentNewPassword] = useState('');
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [studentPassword, setStudentPassword] = useState<string>('');
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
      setLoading(true);
      if (activeTab === 0) {
        fetchUsers();
        fetchStaff();
      } else if (activeTab === 1) {
        fetchParents();
      } else if (activeTab === 2) {
        fetchStudents();
      }
    }
  }, [user?.school_id, hasActiveSession, activeTab]);

  // Real-time subscription for staff online status (affects users tab)
  useEffect(() => {
    if (!user?.school_id || !hasActiveSession || activeTab !== 0) return;

    const channel = supabase
      .channel(`staff-online-status-${user.school_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'staff',
          filter: `school_id=eq.${user.school_id}`,
        },
        (payload) => {
          console.log('Staff online status update received:', payload);
          const updatedStaff = payload.new as any;
          // Update users that have this staff_id
          setUsers((prevUsers) =>
            prevUsers.map((user) =>
              user.staff_id === updatedStaff.id
                ? {
                    ...user,
                    is_online: updatedStaff.is_online,
                    last_online: updatedStaff.last_online,
                    app_version: updatedStaff.app_version,
                  }
                : user
            )
          );
        }
      )
      .subscribe((status) => {
        console.log('Staff subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to staff online status updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to staff online status');
        }
      });

    return () => {
      console.log('Unsubscribing from staff online status');
      supabase.removeChannel(channel);
    };
  }, [user?.school_id, hasActiveSession, activeTab]);

  // Real-time subscription for students online status
  useEffect(() => {
    if (!user?.school_id || !hasActiveSession || activeTab !== 2) return;

    const channel = supabase
      .channel(`students-online-status-${user.school_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'students',
          filter: `school_id=eq.${user.school_id}`,
        },
        (payload) => {
          console.log('Student online status update received:', payload);
          const updatedStudent = payload.new as any;
          setStudents((prevStudents) =>
            prevStudents.map((student) =>
              student.id === updatedStudent.id
                ? {
                    ...student,
                    is_online: updatedStudent.is_online,
                    last_online: updatedStudent.last_online,
                    app_version: updatedStudent.app_version,
                  }
                : student
            )
          );
        }
      )
      .subscribe((status) => {
        console.log('Student subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to student online status updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to student online status');
        }
      });

    return () => {
      console.log('Unsubscribing from student online status');
      supabase.removeChannel(channel);
    };
  }, [user?.school_id, hasActiveSession, activeTab]);

  // Real-time subscription for families online status
  useEffect(() => {
    if (!user?.school_id || !hasActiveSession || activeTab !== 1) return;

    const channel = supabase
      .channel(`families-online-status-${user.school_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'families',
          filter: `school_id=eq.${user.school_id}`,
        },
        (payload) => {
          console.log('Family online status update received:', payload);
          const updatedFamily = payload.new as any;
          setParents((prevParents) =>
            prevParents.map((parent) =>
              parent.id === updatedFamily.id
                ? {
                    ...parent,
                    is_online: updatedFamily.is_online,
                    last_online: updatedFamily.last_online,
                    app_version: updatedFamily.app_version,
                  }
                : parent
            )
          );
        }
      )
      .subscribe((status) => {
        console.log('Family subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to family online status updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to family online status');
        }
      });

    return () => {
      console.log('Unsubscribing from family online status');
      supabase.removeChannel(channel);
    };
  }, [user?.school_id, hasActiveSession, activeTab]);

  // Polling fallback to refresh online status every 10 seconds
  useEffect(() => {
    if (!hasActiveSession || !user?.school_id) return;

    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Set up polling to refresh online status
    pollingIntervalRef.current = setInterval(() => {
      if (activeTab === 0) {
        // Refresh users (which includes staff online status)
        fetchUsers();
      } else if (activeTab === 1) {
        // Refresh parents
        fetchParents();
      } else if (activeTab === 2) {
        // Refresh students
        fetchStudents();
      }
    }, 10 * 1000); // Poll every 10 seconds

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [hasActiveSession, user?.school_id, activeTab]);

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

  const fetchParents = async () => {
    if (!user?.school_id) {
      toast.showToast('User school information not found', 'error');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('families')
        .select('id, name, contact_person, contact_number, address, avatar_url, created_at, last_online, is_online, app_version')
        .eq('school_id', user.school_id)
        .order('name');

      if (error) throw error;
      setParents(data || []);
    } catch (error) {
      toast.showToast('Failed to fetch parents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!user?.school_id) {
      toast.showToast('User school information not found', 'error');
      setLoading(false);
      return;
    }

    try {
      // Fetch students with their current class/section info from student_class_history
      const { data: activeSessionData } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
        .maybeSingle();

      if (activeSessionData) {
        // Fetch from student_class_history for active session
        const { data: historyData, error: historyError } = await supabase
          .from('student_class_history')
          .select(`
            student_id,
            new_class_id,
            new_section_id,
            adm_class_id,
            adm_section_id,
            new_classes:new_class_id(id, name),
            new_sections:new_section_id(id, name),
            adm_classes:adm_class_id(id, name),
            adm_sections:adm_section_id(id, name)
          `)
          .eq('session_id', activeSessionData.id)
          .eq('school_id', user.school_id);

        if (!historyError && historyData && historyData.length > 0) {
          const studentIds = Array.from(new Set(historyData.map((sch: any) => sch.student_id)));
          const { data: studentsData, error: studentsError } = await supabase
            .from('students')
            .select('id, student_number, name, father_name, phone, picture_url, status, last_online, is_online, app_version, created_at')
            .eq('school_id', user.school_id)
            .in('id', studentIds);

          if (!studentsError && studentsData) {
            const studentsMap = new Map(studentsData.map((student: any) => [student.id, student]));
            const mapped = historyData.map((sch: any) => {
              const student = studentsMap.get(sch.student_id);
              if (!student) return null;
              return {
                ...student,
                class_id: sch.new_class_id || sch.adm_class_id,
                section_id: sch.new_section_id !== null ? sch.new_section_id : (sch.adm_section_id !== null ? sch.adm_section_id : null),
                classes: sch.new_classes || sch.adm_classes,
                sections: sch.new_sections || sch.adm_sections,
              };
            }).filter(Boolean);
            // Sort by ID descending (higher IDs first)
            const sorted = mapped.sort((a: Student, b: Student) => b.id - a.id);
            setStudents(sorted as Student[]);
            setLoading(false);
            return;
          }
        }
      }

      // Fallback: fetch all students directly
      const { data, error } = await supabase
        .from('students')
        .select(`*, classes(name), sections(name)`)
        .eq('school_id', user.school_id)
        .order('id', { ascending: false });

      if (error) throw error;
      const sorted = (data || []).sort((a: Student, b: Student) => b.id - a.id);
      setStudents(sorted);
    } catch (error) {
      toast.showToast('Failed to fetch students', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!user?.school_id) {
      toast.showToast('User school information not found', 'error');
      setLoading(false);
      return;
    }

    try {
      // Fetch users with staff online status joined
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch staff data to get online status for users with staff_id
      const staffIds = (usersData || [])
        .filter(u => u.staff_id)
        .map(u => u.staff_id)
        .filter((id, index, self) => self.indexOf(id) === index);

      let staffOnlineStatus: Record<number, { is_online?: boolean; last_online?: string; app_version?: string }> = {};
      
      if (staffIds.length > 0) {
        const { data: staffData } = await supabase
          .from('staff')
          .select('id, is_online, last_online, app_version')
          .in('id', staffIds)
          .eq('school_id', user.school_id);

        if (staffData) {
          staffData.forEach(staff => {
            staffOnlineStatus[staff.id] = {
              is_online: staff.is_online,
              last_online: staff.last_online,
              app_version: staff.app_version
            };
          });
        }
      }

      // Merge online status into users
      const usersWithStatus = (usersData || []).map(u => ({
        ...u,
        is_online: u.staff_id ? staffOnlineStatus[u.staff_id]?.is_online : undefined,
        last_online: u.staff_id ? staffOnlineStatus[u.staff_id]?.last_online : undefined,
        app_version: u.staff_id ? staffOnlineStatus[u.staff_id]?.app_version : undefined
      }));

      setUsers(usersWithStatus);
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

  // Helper function to get family display ID
  const getFamilyDisplayId = (familyId: number): string => {
    if (!user?.school_id) return String(familyId);
    return `F${user.school_id}-${familyId}`;
  };

  // Helper function to format last online time
  const formatLastOnline = (lastOnline: string | null | undefined): string => {
    if (!lastOnline) return 'Never';
    
    const now = new Date();
    const lastOnlineDate = new Date(lastOnline);
    const diffMs = now.getTime() - lastOnlineDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    // For longer periods, show the date
    return lastOnlineDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: lastOnlineDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
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
    if (!searchTerm) return true;
    const staffInfo = getStaffInfo(user.staff_id);
    const searchLower = searchTerm.toLowerCase();
    // For Guest users, use the user's name directly; otherwise use staff name
    const displayName = user.role === 'Guest' ? user.name : staffInfo.name;
    return displayName.toLowerCase().includes(searchLower);
  });

  const filteredParents = parents.filter(parent => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return parent.name.toLowerCase().includes(searchLower);
  });

  const filteredStudents = students.filter(student => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return student.name.toLowerCase().includes(searchLower);
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setSearchTerm('');
  };

  const handleViewStudentPassword = async (student: Student) => {
    // Fetch current password
    if (!user?.school_id) {
      toast.showToast('User school information not found', 'error');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('students')
        .select('password')
        .eq('id', student.id)
        .eq('school_id', user.school_id)
        .single();

      if (error) throw error;
      setStudentPassword(data?.password || 'aa');
      setSelectedStudent(student);
      setShowStudentPasswordModal(true);
      setShowStudentPassword(false);
      setStudentNewPassword('');
    } catch (error) {
      toast.showToast('Failed to fetch student password', 'error');
    }
  };

  const handleChangeStudentPassword = async () => {
    if (!selectedStudent || !user?.school_id) {
      toast.showToast('Student information not found', 'error');
      return;
    }
    if (!studentNewPassword.trim()) {
      toast.showToast('Password cannot be empty', 'error');
      return;
    }
    try {
      const { error } = await supabase
        .from('students')
        .update({ password: studentNewPassword.trim() })
        .eq('id', selectedStudent.id)
        .eq('school_id', user.school_id);
      if (error) throw error;
      toast.showToast('Password updated successfully', 'success');
      setShowStudentPasswordModal(false);
      setSelectedStudent(null);
      setStudentNewPassword('');
      fetchStudents();
    } catch (error) {
      toast.showToast('Failed to update password', 'error');
    }
  };

  const handleResetStudentPassword = async () => {
    if (!selectedStudent || !user?.school_id) {
      toast.showToast('Student information not found', 'error');
      return;
    }
    try {
      const { error } = await supabase
        .from('students')
        .update({ password: 'aa' })
        .eq('id', selectedStudent.id)
        .eq('school_id', user.school_id);
      if (error) throw error;
      toast.showToast('Password reset to default (aa)', 'success');
      setShowStudentPasswordModal(false);
      setSelectedStudent(null);
      setStudentNewPassword('');
      fetchStudents();
    } catch (error) {
      toast.showToast('Failed to reset password', 'error');
    }
  };

  // Prevent body scroll when student password modal is open
  useEffect(() => {
    if (showStudentPasswordModal) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.setAttribute('data-scroll-position', scrollY.toString());
    } else {
      const scrollY = document.body.getAttribute('data-scroll-position');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.removeAttribute('data-scroll-position');
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY, 10));
      }
    }
    return () => {
      const scrollY = document.body.getAttribute('data-scroll-position');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        document.body.removeAttribute('data-scroll-position');
        window.scrollTo(0, parseInt(scrollY, 10));
      }
    };
  }, [showStudentPasswordModal]);

  if (loading) return <Loader />;
  if (!hasActiveSession) return <NoSessionsFound />;

  const renderStaffTab = () => {
    const now = new Date();
    
    return (
    <>
      <UserGrid>
        {loading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonUserCard key={i} />
            ))}
          </>
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
                // Use is_online flag if explicitly set to false, otherwise calculate from timestamp
                const isOnline = user.is_online === false 
                  ? false
                  : user.last_online && (now.getTime() - new Date(user.last_online).getTime() < 5 * 60 * 1000);
                
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
                      <StatusInfo>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: isOnline ? '#22c55e' : '#9ca3af',
                            boxShadow: isOnline ? '0 0 4px #22c55e' : 'none'
                          }} />
                          <span style={{ fontSize: '12px', color: isOnline ? '#22c55e' : '#6b7280' }}>
                            {isOnline ? 'Online' : `Last Online: ${formatLastOnline(user.last_online)}`}
                          </span>
                        </div>
                        {user.app_version && (
                          <span style={{
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            background: 'rgba(99, 102, 241, 0.1)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            color: '#6366f1'
                          }}>
                            v{user.app_version}
                          </span>
                        )}
                      </StatusInfo>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    <CardActionButton onClick={() => handleViewPassword(user)} title="View/Change Password">
                      <Lock />
                    </CardActionButton>
                    <CardActionButton onClick={() => handleEdit(user)} title="Edit User">
                      <Edit />
                    </CardActionButton>
                    <CardActionButton $variant="danger" onClick={() => handleDelete(user.id)} title="Delete User">
                      <Delete />
                    </CardActionButton>
                      </div>
                  </ActionButtons>
                </UserCard>
              );
            })}
          </>
        )}
      </UserGrid>
    </>
  );
  };

  const renderParentsTab = () => {
    const now = new Date();
    
    return (
    <>
      <UserGrid>
        {loading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonUserCard key={i} />
            ))}
          </>
        ) : filteredParents.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>No parents found</div>
        ) : (
            filteredParents.map(parent => {
              // Use is_online flag if explicitly set to false, otherwise calculate from timestamp
              const isOnline = parent.is_online === false
                ? false
                : parent.last_online && (now.getTime() - new Date(parent.last_online).getTime() < 5 * 60 * 1000);
              
              return (
            <UserCard key={parent.id} status="active">
                  <RoleBadge role="Parent">ID: {getFamilyDisplayId(parent.id)}</RoleBadge>
              <CardTop>
                <Avatar src={parent.avatar_url}>
                  {!parent.avatar_url && parent.name.charAt(0).toUpperCase()}
                </Avatar>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <UserName>
                    {parent.name}
                    <StatusBadge status="active">Active</StatusBadge>
                  </UserName>
                  <UsernameText>Contact: {parent.contact_person}</UsernameText>
                  <InfoRow>Phone: {parent.contact_number}</InfoRow>
                  {parent.address && <InfoRow>Address: {parent.address}</InfoRow>}
                </div>
              </CardTop>
              <ActionButtons>
                    <StatusInfo>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: isOnline ? '#22c55e' : '#9ca3af',
                          boxShadow: isOnline ? '0 0 4px #22c55e' : 'none'
                        }} />
                        <span style={{ fontSize: '12px', color: isOnline ? '#22c55e' : '#6b7280' }}>
                          {isOnline ? 'Online' : `Last Online: ${formatLastOnline(parent.last_online)}`}
                        </span>
                      </div>
                      {parent.app_version && (
                        <span style={{
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          background: 'rgba(99, 102, 241, 0.1)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          color: '#6366f1'
                        }}>
                          v{parent.app_version}
                        </span>
                      )}
                    </StatusInfo>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                <CardActionButton onClick={() => {/* TODO: Edit parent */}} title="Edit Parent">
                  <Edit />
                </CardActionButton>
                <CardActionButton $variant="danger" onClick={() => {/* TODO: Delete parent */}} title="Delete Parent">
                  <Delete />
                </CardActionButton>
                    </div>
              </ActionButtons>
            </UserCard>
              );
            })
        )}
      </UserGrid>
    </>
  );
  };

  const renderStudentsTab = () => {
    const now = new Date();
    
    return (
      <>
        <UserGrid>
          {loading ? (
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonUserCard key={i} />
              ))}
            </>
          ) : filteredStudents.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>No students found</div>
          ) : (
            filteredStudents.map(student => {
              // Use is_online flag if explicitly set to false, otherwise calculate from timestamp
              const isOnline = student.is_online === false
                ? false
                : student.last_online && (now.getTime() - new Date(student.last_online).getTime() < 5 * 60 * 1000);
              
              return (
                <UserCard key={student.id} status={student.status}>
                  <RoleBadge role="Student">ID: {getStudentDisplayId(student)}</RoleBadge>
                  <CardTop>
                    <Avatar src={student.picture_url}>
                      {!student.picture_url && student.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <UserName>
                        {student.name}
                        <StatusBadge status={student.status}>
                          {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                        </StatusBadge>
                      </UserName>
                      {student.father_name && (
                        <UsernameText>Father: {student.father_name}</UsernameText>
                      )}
                      <InfoRow>
                        {student.classes?.name
                          ? `${student.classes.name}${student.sections?.name ? ` (${student.sections.name})` : ''}`
                          : '-'}
                      </InfoRow>
                    </div>
                  </CardTop>
                  <ActionButtons>
                    <StatusInfo>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: isOnline ? '#22c55e' : '#9ca3af',
                            boxShadow: isOnline ? '0 0 4px #22c55e' : 'none'
                          }} />
                          <span style={{ fontSize: '12px', color: isOnline ? '#22c55e' : '#6b7280' }}>
                          {isOnline ? 'Online' : `Last Online: ${formatLastOnline(student.last_online)}`}
                          </span>
                        </div>
                        {student.app_version && (
                          <span style={{
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            background: 'rgba(99, 102, 241, 0.1)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            color: '#6366f1'
                          }}>
                            v{student.app_version}
                          </span>
                        )}
                    </StatusInfo>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    <CardActionButton onClick={() => window.location.href = `/student/${student.id}`} title="View Profile">
                      <AccountCircle />
                    </CardActionButton>
                    <CardActionButton onClick={() => handleViewStudentPassword(student)} title="Manage Password">
                      <Lock />
                    </CardActionButton>
                    </div>
                  </ActionButtons>
                </UserCard>
              );
            })
          )}
        </UserGrid>
      </>
    );
  };

  return (
    <Container>
      <Header>
        <Title>User Management</Title>
        <div style={{ display: 'flex', gap: '10px' }}>
          <SearchBar>
            <Search style={{ color: '#6b7280' }} />
            <SearchInput
              placeholder={
                activeTab === 0 ? "Search by name..." :
                activeTab === 1 ? "Search by name..." :
                "Search by name..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchBar>
        </div>
      </Header>

      <TabsContainer>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              minHeight: 48,
            },
          }}
        >
          <Tab icon={<People />} iconPosition="start" label="Staff" />
          <Tab icon={<FamilyRestroom />} iconPosition="start" label="Parents" />
          <Tab icon={<School />} iconPosition="start" label="Students" />
        </Tabs>
      </TabsContainer>

      <TabPanel>
        {activeTab === 0 && renderStaffTab()}
        {activeTab === 1 && renderParentsTab()}
        {activeTab === 2 && renderStudentsTab()}
      </TabPanel>

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

      {/* Student Password Modal */}
      {showStudentPasswordModal && selectedStudent && ReactDOM.createPortal(
        <PasswordModal onClick={() => setShowStudentPasswordModal(false)}>
          <PasswordFormContainer onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <PasswordTitle>Manage Student Password</PasswordTitle>
            <div style={{
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <AccountCircle style={{ fontSize: 40, color: '#6366f1' }} />
              <div>
                <div style={{
                  fontWeight: 600,
                  color: 'inherit',
                  fontSize: '16px'
                }}>
                  {selectedStudent.name}
                </div>
                <div style={{
                  fontSize: 14,
                  color: '#6b7280',
                  marginTop: 2
                }}>
                  ID: {getStudentDisplayId(selectedStudent)} {selectedStudent.father_name && `| Father: ${selectedStudent.father_name}`}
                </div>
              </div>
            </div>
            <PasswordFormGroup>
              <PasswordLabel>Current Password</PasswordLabel>
              <PasswordDisplayWrapper>
                <PasswordInput
                  type={showStudentPassword ? 'text' : 'password'}
                  value={studentPassword || 'aa'}
                  readOnly
                  style={{ flex: 1 }}
                />
                <CardActionButton type="button" onClick={() => setShowStudentPassword(v => !v)} style={{ padding: '8px 12px' }}>
                  {showStudentPassword ? <VisibilityOff style={{ fontSize: 18 }} /> : <Visibility style={{ fontSize: 18 }} />}
                </CardActionButton>
              </PasswordDisplayWrapper>
            </PasswordFormGroup>
            <PasswordFormGroup>
              <PasswordLabel>New Password <span style={{ color: '#ef4444' }}>*</span></PasswordLabel>
              <PasswordInput
                type="password"
                value={studentNewPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStudentNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
            </PasswordFormGroup>
            <PasswordButtonGroup>
              <PasswordButton variant="secondary" onClick={() => {
                setStudentNewPassword('aa');
                handleResetStudentPassword();
              }}>
                <Refresh style={{ fontSize: 16, marginRight: 4 }} />
                Reset to Default
              </PasswordButton>
              <PasswordButton
                onClick={handleChangeStudentPassword}
                disabled={!studentNewPassword || !studentNewPassword.trim()}
              >
                Change Password
              </PasswordButton>
            </PasswordButtonGroup>
            <PasswordButton
              variant="secondary"
              onClick={() => {
                setShowStudentPasswordModal(false);
                setSelectedStudent(null);
                setStudentNewPassword('');
              }}
              style={{ marginTop: 12, width: '100%' }}
            >
              Cancel
            </PasswordButton>
          </PasswordFormContainer>
        </PasswordModal>,
        document.body
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