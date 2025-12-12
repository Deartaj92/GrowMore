import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUserPermissions } from '../../../../services/permissionService';
import { shouldShowMenuItem, pathToPermissionKey } from '../../../../utils/permissionMapping';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../supabaseClient';
import { examinationService } from '../../../../services/examinationService';
import type { Examination } from '../../../../types/examinations';
import {
  Refresh as RefreshIcon,
  AccountCircle as UserIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  PersonAdd as PersonAddIcon,
  Block as BlockIcon,
  GroupAdd as GroupAddIcon,
  Description as DescriptionIcon,
  Assessment as AssessmentIcon,
  BarChart as BarChartIcon,
  Work as WorkIcon,
  AccessTime as AccessTimeIcon,
  EventBusy as EventBusyIcon,
  Event as EventIcon,
  Assignment as AssignmentIcon,
  CalendarMonth as CalendarMonthIcon,
  AttachMoney as AttachMoneyIcon,
  AccountBalance as AccountBalanceIcon,
  ListAlt as ListAltIcon,
  AccountBalanceWallet as WalletIcon,
  Receipt as ReceiptIcon,
  Gavel as GavelIcon,
  PieChart as PieChartIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Quiz as QuizIcon,
  Forum as ForumIcon,
  Settings as SettingsIcon,
  Business as BusinessIcon,
  BeachAccess as BeachAccessIcon,
  Notifications as NotificationsIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Person as PersonIcon,
  CloudDownload as CloudDownloadIcon,
  EmojiEvents as EmojiEventsIcon,
  Add as AddIcon,
  List as ListIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  ChevronRight as ChevronRightIcon,
  Feedback as FeedbackIcon,
  TrendingUp as TrendingUpIcon,
  Calculate as CalculateIcon,
} from '@mui/icons-material';
import styled from 'styled-components';
import {
  Header as HeaderStyled,
  HeaderLeft,
  HeaderActions,
  HeaderIconCircle,
} from '../../styles';
import { StudentInfo, ParentInfo, InstituteProfile } from '../../types';
import NotificationBell from '../../../NotificationBell';
import ProfileDropdown from '../ProfileDropdown/ProfileDropdown';

// Mac-style window controls (for Electron)
const MacWindowControls = styled.div`
  display: flex;
  gap: 11px;
  height: 28px;
  align-items: center;
  -webkit-app-region: no-drag;
  margin-left: 8px;
  margin-right: -16px;
  padding-right: 16px;
  
  @media (max-width: 700px) {
    display: none;
  }
`;

const MacButton = styled.button<{ color: string }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: ${({ color }) => color};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  padding: 0;
  transition: box-shadow 0.18s, background 0.18s;
  box-shadow: 0 1px 2px #0002;
  outline: none;
  &:hover { filter: brightness(1.1); }
  &:focus { outline: none; }
  &:active { filter: brightness(0.95); }
`;

const MacIcon = styled.span`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  color: #222c;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s;
  ${MacButton}:hover & { opacity: 1; }
`;

function MacWindowControlsComponent() {
  const [isMaximized, setIsMaximized] = React.useState(false);
  React.useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.isMaximized().then(setIsMaximized);
      window.electronAPI.onMaximize(() => setIsMaximized(true));
      window.electronAPI.onUnmaximize(() => setIsMaximized(false));
    }
  }, []);
  const handleMinimize = () => { if (window.electronAPI) window.electronAPI.minimize(); };
  const handleMaximize = () => { if (window.electronAPI) { if (isMaximized) window.electronAPI.unmaximize(); else window.electronAPI.maximize(); } };
  const handleClose = () => { if (window.electronAPI) window.electronAPI.close(); };
  return (
    <MacWindowControls>
      <MacButton color="#ffbd2e" aria-label="Minimize" title="Minimize" onClick={handleMinimize}><MacIcon>&#8211;</MacIcon></MacButton>
      <MacButton color="#27c93f" aria-label={isMaximized ? 'Restore' : 'Maximize'} title={isMaximized ? 'Restore' : 'Maximize'} onClick={handleMaximize}><MacIcon>{isMaximized ? <>&#9633;</> : <>&#9723;</>}</MacIcon></MacButton>
      <MacButton color="#ff5f56" aria-label="Close" title="Close" onClick={handleClose}><MacIcon>&#10005;</MacIcon></MacButton>
    </MacWindowControls>
  );
}

// App Logo
const AppLogo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
  color: white;
  margin-right: 14px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(147, 51, 234, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  -webkit-app-region: no-drag;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(147, 51, 234, 0.4);
  }
  
  svg {
    font-size: 18px;
  }
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
  
  @media (max-width: 700px) {
    width: 28px;
    height: 28px;
    margin-right: 10px;
    
    svg {
      font-size: 16px;
    }
  }
`;

// Navigation Menu Container
const NavMenu = styled.nav`
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  position: relative;
  z-index: 100002;
  
  @media (max-width: 700px) {
    display: none;
  }
`;

// Navigation Menu Item
const NavMenuItem = styled.button<{ $hasDropdown?: boolean; $isDashboard?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: ${props => props.theme.TEXT_SECONDARY};
  font-size: 0.85rem;
  font-weight: 500;
  cursor: ${props => props.$hasDropdown ? 'default' : 'pointer'};
  border-radius: 6px;
  transition: all 0.2s ease;
  position: relative;
  white-space: nowrap;
  -webkit-app-region: no-drag;
  
  ${props => props.$isDashboard && `
    color: #9333ea;
    font-weight: 600;
  `}
  
  &:hover {
    background: ${props => props.theme.BG};
    color: ${props => props.$isDashboard ? '#9333ea' : props.theme.TEXT_PRIMARY};
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 12px;
      right: 12px;
      height: 2px;
      background: ${props => props.$isDashboard ? 'linear-gradient(90deg, #9333ea, #7c3aed)' : 'linear-gradient(90deg, #3b82f6, #2563eb)'};
      border-radius: 2px 2px 0 0;
    }
  }
  
  svg {
    font-size: 16px;
    flex-shrink: 0;
  }
  
  @media (max-width: 700px) {
    padding: 6px 10px;
    font-size: 0.8rem;
    gap: 5px;
    
    svg {
      font-size: 14px;
    }
  }
`;

const MenuWrapper = styled.div`
  position: relative;
  z-index: 100002;
`;

const MenuDropdown = styled.div<{ $isOpen: boolean; $columns?: number; $actualColumns?: number }>`
  position: fixed;
  background: ${props => props.theme.CARD};
  border: 1px solid ${props => props.theme.BORDER};
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12), 0 3px 6px rgba(0, 0, 0, 0.08);
  padding: 14px;
  z-index: 100001;
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transform: ${props => props.$isOpen ? 'translateY(0)' : 'translateY(-8px)'};
  transition: all 0.2s ease;
  display: ${props => props.$isOpen ? ((props.$actualColumns || props.$columns || 1) === 1 ? 'block' : 'grid') : 'none'};
  grid-template-columns: ${props => {
    const cols = props.$actualColumns || props.$columns || 1;
    if (cols === 1) return '1fr';
    if (cols === 2) return 'repeat(2, 1fr)';
    if (cols === 3) return 'repeat(3, 1fr)';
    return `repeat(${cols}, 1fr)`;
  }};
  gap: 16px;
  pointer-events: ${props => props.$isOpen ? 'auto' : 'none'};
  width: fit-content;
  min-width: ${props => {
    const cols = props.$actualColumns || props.$columns || 1;
    if (cols === 1) return '280px';
    if (cols === 2) return '480px';
    if (cols === 3) return '720px';
    return 'auto';
  }};
  max-width: ${props => {
    const cols = props.$actualColumns || props.$columns || 1;
    if (cols === 1) return '400px';
    if (cols === 2) return '600px';
    if (cols === 3) return '1000px';
    return 'auto';
  }};
  
  @media (max-width: 1400px) {
    ${props => {
      const cols = props.$actualColumns || props.$columns || 1;
      if (cols >= 3) {
        return `
          grid-template-columns: repeat(2, 1fr);
          min-width: 480px;
          max-width: 600px;
        `;
      }
      return '';
    }}
  }
  
  @media (max-width: 1024px) {
    ${props => {
      const cols = props.$actualColumns || props.$columns || 1;
      if (cols >= 3) {
        return `
          grid-template-columns: repeat(2, 1fr);
          min-width: 480px;
          max-width: 600px;
        `;
      }
      if (cols === 2) {
        return `
          grid-template-columns: 1fr;
          min-width: 280px;
          max-width: 400px;
        `;
      }
      return '';
    }}
  }
  
  @media (max-width: 768px) {
    min-width: 90vw;
    max-width: 90vw;
    grid-template-columns: 1fr !important;
    gap: 12px;
    padding: 12px;
  }
`;

const DropdownColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  
  &:not(:last-child)::after {
    content: '';
    position: absolute;
    right: -8px;
    top: 0;
    bottom: 0;
    width: 1px;
    background: ${props => props.theme.BORDER};
  }
`;

const ColumnSeparator = styled.div`
  width: 100%;
  height: 1px;
  background: ${props => props.theme.BORDER};
  margin: 8px 0;
`;

const ColumnTitle = styled.h3`
  font-size: 0.8rem;
  font-weight: 700;
  color: ${props => props.theme.TEXT_PRIMARY};
  margin: 0 0 8px 0;
  padding-bottom: 6px;
  border-bottom: 2px solid ${props => props.theme.BORDER};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const DropdownMenuItem = styled.button<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: none;
  background: ${props => props.theme.CARD};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
  
  &:hover {
    background: ${props => props.theme.BG};
    transform: translateX(3px);
  }
  
  .menu-icon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: linear-gradient(135deg, ${props => props.$color} 0%, ${props => props.$color}dd 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
    box-shadow: 0 2px 6px ${props => props.$color}40;
    
    svg {
      font-size: 18px;
    }
  }
  
  .menu-content {
    flex: 1;
    min-width: 0;
  }
  
  .menu-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: ${props => props.theme.TEXT_PRIMARY};
    margin: 0 0 3px 0;
    line-height: 1.2;
  }
  
  .menu-description {
    font-size: 0.7rem;
    color: ${props => props.theme.TEXT_SECONDARY};
    margin: 0;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

// Mobile Sidebar Components
const MobileSidebarBackdrop = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9998;
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transition: opacity 0.3s ease, visibility 0.3s ease;
  
  @media (min-width: 701px) {
    display: none;
  }
`;

const MobileSidebar = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 85vw;
  max-width: 320px;
  height: 100dvh;
  max-height: 100dvh;
  background: ${props => props.theme.CARD};
  z-index: 9999;
  transform: translateX(${props => props.$isOpen ? '0' : '-100%'});
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 2px 0 16px rgba(0, 0, 0, 0.2);
  
  /* Fallback for browsers that don't support dvh */
  @supports not (height: 100dvh) {
    height: 100vh;
    max-height: 100vh;
  }
  
  @media (min-width: 701px) {
    display: none;
  }
`;

const MobileSidebarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid ${props => props.theme.BORDER};
  background: ${props => props.theme.CARD};
  position: sticky;
  top: 0;
  z-index: 1;
`;

const MobileSidebarTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${props => props.theme.TEXT_PRIMARY};
  margin: 0;
`;

const MobileSidebarCloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.TEXT_PRIMARY};
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.BG};
  }
  
  svg {
    font-size: 24px;
  }
`;

const MobileMenuSection = styled.div`
  padding: 8px 0;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.BG === '#252525' || props.theme.BG === '#181c2a' 
      ? 'rgba(255, 255, 255, 0.2)' 
      : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.BG === '#252525' || props.theme.BG === '#181c2a' 
      ? 'rgba(255, 255, 255, 0.3)' 
      : 'rgba(0, 0, 0, 0.3)'};
  }
  
  scrollbar-width: thin;
  scrollbar-color: ${props => props.theme.BG === '#252525' || props.theme.BG === '#181c2a' 
    ? 'rgba(255, 255, 255, 0.2) transparent' 
    : 'rgba(0, 0, 0, 0.2) transparent'};
`;

const MobileMenuItem = styled.button<{ $hasSubmenu?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px;
  background: none;
  border: none;
  color: ${props => props.theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.BG};
  }
  
  .menu-icon {
    margin-right: 12px;
    display: flex;
    align-items: center;
    color: ${props => props.theme.TEXT_SECONDARY};
    
    svg {
      font-size: 20px;
    }
  }
  
  .menu-label {
    flex: 1;
  }
  
  .menu-arrow {
    color: ${props => props.theme.TEXT_SECONDARY};
    transition: transform 0.2s ease;
    transform: ${props => props.$hasSubmenu ? 'rotate(0deg)' : 'rotate(-90deg)'};
  }
`;

const MobileSubmenu = styled.div<{ $isOpen: boolean }>`
  max-height: ${props => props.$isOpen ? '1000px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease;
  background: ${props => props.theme.BG};
`;

const MobileSubmenuItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px 10px 32px;
  background: none;
  border: none;
  color: ${props => props.theme.TEXT_SECONDARY};
  font-size: 0.85rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.CARD};
    color: ${props => props.theme.TEXT_PRIMARY};
  }
  
  .submenu-icon {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    
    svg {
      font-size: 16px;
      color: white;
    }
  }
  
  .submenu-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .submenu-title {
    font-weight: 500;
    color: ${props => props.theme.TEXT_PRIMARY};
    font-size: 0.85rem;
  }
  
  .submenu-description {
    font-size: 0.7rem;
    color: ${props => props.theme.TEXT_SECONDARY};
    opacity: 0.85;
    line-height: 1.3;
    display: block;
  }
`;

const HamburgerButton = styled.button`
  display: none;
  background: none;
  border: none;
  color: ${props => props.theme.TEXT_PRIMARY};
  cursor: pointer;
  padding: 8px;
  margin-right: 8px;
  border-radius: 6px;
  transition: background 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.BG};
  }
  
  svg {
    font-size: 24px;
  }
  
  @media (max-width: 700px) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const ProfileAvatarContainer = styled(HeaderIconCircle)<{ $hasImage: boolean }>`
  border: ${props => props.$hasImage ? `2.5px solid ${props.theme.BORDER}` : 'none'};
  box-shadow: ${props => props.$hasImage 
    ? `0 2px 10px rgba(0, 0, 0, 0.12), 0 0 0 1px ${props.theme.BG}40` 
    : props.theme.SHADOW};
  background: ${props => props.$hasImage ? 'transparent' : props.theme.CARD};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  padding: 0;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: ${props => props.$hasImage 
      ? `0 4px 16px rgba(0, 0, 0, 0.18), 0 0 0 3px ${props.theme.ACCENT}40` 
      : `0 2px 8px ${props.theme.ACCENT}33`};
    border-color: ${props => props.$hasImage ? props.theme.ACCENT : 'transparent'};
  }
  
  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    display: block;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    z-index: 0;
  }
  
  &:hover img {
    transform: scale(1.08);
  }
  
  svg {
    position: relative;
    z-index: 0;
  }
`;

interface HeaderProps {
  user: any;
  studentInfo: StudentInfo | null;
  parentInfo: ParentInfo | null;
  isDownloadActive: boolean;
  onRefresh: () => void;
  avatarUrl: string | null;
  staffName: string | null;
  profileMenuOpen: boolean;
  setProfileMenuOpen: (open: boolean) => void;
  profileIconRef: React.RefObject<HTMLButtonElement>;
  profileDropdownRef: React.RefObject<HTMLDivElement>;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenChangePassword: () => void;
  isWeb: boolean;
  onCheckForUpdates: () => void;
  isCheckingUpdate: boolean;
  onAboutUsClick: () => void;
  onLogout: () => void;
  appVersion: string;
  instituteProfile: InstituteProfile | null;
}

const Header: React.FC<HeaderProps> = ({
  user,
  studentInfo,
  parentInfo,
  isDownloadActive,
  onRefresh,
  avatarUrl,
  staffName,
  profileMenuOpen,
  setProfileMenuOpen,
  profileIconRef,
  profileDropdownRef,
  theme,
  onToggleTheme,
  onOpenChangePassword,
  isWeb,
  onCheckForUpdates,
  isCheckingUpdate,
  onAboutUsClick,
  onLogout,
  appVersion,
  instituteProfile,
}) => {
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser } = useAuth();
  
  // State for published examinations
  const [publishedExaminations, setPublishedExaminations] = useState<Examination[]>([]);

  // Reset image error when avatar URL changes
  useEffect(() => {
    setImageError(false);
  }, [avatarUrl, parentInfo?.avatar_url]);
  
  // Check if user is Student or Parent - these use localStorage sessions
  // Students and Parents use localStorage sessions, so check localStorage immediately to prevent menu flash
  // Also check props for when they're loaded
  const checkIsRestrictedRole = () => {
    // First check localStorage immediately (prevents flash on load)
    try {
      const studentSession = localStorage.getItem('studentSession');
      const parentSession = localStorage.getItem('parentSession');
      if (studentSession || parentSession) {
        return true;
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    
    // Then check props (for when they're loaded)
    if (!!studentInfo || !!parentInfo) {
      return true;
    }
    
    // If user has no school_id and is not super admin, they might be student/parent
    // But we check via localStorage primarily
    return false;
  };
  
  const isRestrictedRole = checkIsRestrictedRole();
  
  // Load user permissions for all users with role_id
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  useEffect(() => {
    const loadPermissions = async () => {
      // Check if user is Super Admin (from super_admins table)
      if (user?.id && !user?.school_id) {
        try {
          const { data: superAdminData } = await supabase
            .from('super_admins')
            .select('id')
            .eq('username', user.username)
            .maybeSingle();
          
          if (superAdminData) {
            setIsSuperAdmin(true);
            // Super Admin has all permissions
            setUserPermissions(new Set(Object.values(pathToPermissionKey)));
            setPermissionsLoaded(true);
            return;
          }
        } catch (error) {
          console.error('Error checking super admin:', error);
        }
      }

      // Load permissions for all users with role_id from roles table
      if (user?.id && user?.school_id) {
        try {
          const perms = await getUserPermissions(user.id, user.school_id);
          setUserPermissions(perms);
          setPermissionsLoaded(true);
        } catch (error) {
          console.error('Error loading permissions:', error);
          setPermissionsLoaded(true);
        }
      } else {
        setPermissionsLoaded(true);
      }
    };
    
    loadPermissions();
  }, [user?.id, user?.school_id, user?.username]);

  // Load published examinations
  useEffect(() => {
    const loadPublishedExaminations = async () => {
      const schoolId = authUser?.school_id || user?.school_id;
      if (!schoolId) return;
      
      try {
        const exams = await examinationService.getExaminations({ status: 'published' }, schoolId);
        setPublishedExaminations(exams);
      } catch (error) {
        console.error('Error loading published examinations:', error);
        setPublishedExaminations([]);
      }
    };
    
    loadPublishedExaminations();
  }, [authUser?.school_id, user?.school_id]);
  
  const [studentMenuOpen, setStudentMenuOpen] = useState(false);
  const [employeeMenuOpen, setEmployeeMenuOpen] = useState(false);
  const [financeMenuOpen, setFinanceMenuOpen] = useState(false);
  const [communicationMenuOpen, setCommunicationMenuOpen] = useState(false);
  const [academicsMenuOpen, setAcademicsMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileOpenMenus, setMobileOpenMenus] = useState<Set<string>>(new Set());
  const menuLeaveTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout | null }>({});
  const studentMenuRef = useRef<HTMLDivElement>(null);
  const studentButtonRef = useRef<HTMLButtonElement>(null);
  const studentDropdownRef = useRef<HTMLDivElement>(null);
  const employeeMenuRef = useRef<HTMLDivElement>(null);
  const employeeButtonRef = useRef<HTMLButtonElement>(null);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);
  const financeMenuRef = useRef<HTMLDivElement>(null);
  const financeButtonRef = useRef<HTMLButtonElement>(null);
  const financeDropdownRef = useRef<HTMLDivElement>(null);
  const communicationMenuRef = useRef<HTMLDivElement>(null);
  const communicationButtonRef = useRef<HTMLButtonElement>(null);
  const communicationDropdownRef = useRef<HTMLDivElement>(null);
  const academicsMenuRef = useRef<HTMLDivElement>(null);
  const academicsButtonRef = useRef<HTMLButtonElement>(null);
  const academicsDropdownRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  // Update dropdown positions
  const updateDropdownPositions = () => {
    const updatePosition = (buttonRef: React.RefObject<HTMLButtonElement>, dropdownRef: React.RefObject<HTMLDivElement>) => {
      if (buttonRef.current && dropdownRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        dropdownRef.current.style.top = `${buttonRect.bottom + 4}px`;
        dropdownRef.current.style.left = `${buttonRect.left}px`;
      }
    };

    if (studentMenuOpen) updatePosition(studentButtonRef, studentDropdownRef);
    if (employeeMenuOpen) updatePosition(employeeButtonRef, employeeDropdownRef);
    if (financeMenuOpen) updatePosition(financeButtonRef, financeDropdownRef);
    if (communicationMenuOpen) updatePosition(communicationButtonRef, communicationDropdownRef);
    if (academicsMenuOpen) updatePosition(academicsButtonRef, academicsDropdownRef);
    if (settingsMenuOpen) updatePosition(settingsButtonRef, settingsDropdownRef);
  };

  // Update positions when menus open or on scroll/resize
  useEffect(() => {
    if (studentMenuOpen || employeeMenuOpen || financeMenuOpen || 
        communicationMenuOpen || academicsMenuOpen || settingsMenuOpen) {
      updateDropdownPositions();
      const handleScroll = () => updateDropdownPositions();
      const handleResize = () => updateDropdownPositions();
      
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [studentMenuOpen, employeeMenuOpen, financeMenuOpen, 
      communicationMenuOpen, academicsMenuOpen, settingsMenuOpen]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(menuLeaveTimeoutRef.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  // Student menu items
  const studentMenuItems = [
    {
      title: 'All Students',
      description: 'View and manage all student records',
      icon: <PeopleIcon />,
      path: '/students/list',
      color: '#3b82f6'
    },
    {
      title: 'Add Student',
      description: 'Register new students',
      icon: <PersonAddIcon />,
      path: '/students/add',
      color: '#10b981'
    },
    {
      title: 'Bulk Add Students',
      description: 'Add multiple students at once',
      icon: <GroupAddIcon />,
      path: '/bulk-student-admission',
      color: '#06b6d4'
    },
    {
      title: 'Student Status',
      description: 'Manage enrollment status',
      icon: <BlockIcon />,
      path: '/students/status',
      color: '#f59e0b'
    },
    {
      title: 'Promotion',
      description: 'Handle student promotions',
      icon: <SchoolIcon />,
      path: '/bulk-promote-demote',
      color: '#8b5cf6'
    },
    {
      title: 'Family Management',
      description: 'Manage family relationships',
      icon: <PeopleIcon />,
      path: '/family-management',
      color: '#ef4444'
    },
    {
      title: 'Withdrawal Register',
      description: 'View admission and withdrawal',
      icon: <DescriptionIcon />,
      path: '/students/withdrawal-register',
      color: '#14b8a6'
    }
  ];

  // Attendance menu items (Student only)
  const attendanceMenuItems = [
    {
      title: 'Mark Student Attendance',
      description: 'Record daily student attendance',
      icon: <AssessmentIcon />,
      path: '/attendance/mark',
      color: '#3b82f6'
    },
    {
      title: 'Student Attendance Report',
      description: 'Generate attendance reports',
      icon: <BarChartIcon />,
      path: '/attendance/report',
      color: '#10b981'
    },
    {
      title: 'Student Half Leaves',
      description: 'Record and manage student half-day leaves',
      icon: <AccessTimeIcon />,
      path: '/attendance/half-leaves',
      color: '#ec4899'
    }
  ];

  // Reports menu items
  const studentReportsMenuItems = [
    {
      title: 'Student Reports',
      description: 'Generate comprehensive student reports',
      icon: <BarChartIcon />,
      path: '/reports',
      color: '#3b82f6'
    }
  ];

  const employeeReportsMenuItems = [
    {
      title: 'Employee Reports',
      description: 'Generate comprehensive employee reports',
      icon: <BarChartIcon />,
      path: '/reports/employee-reports',
      color: '#3b82f6'
    }
  ];

  // Employee attendance menu items
  const employeeAttendanceMenuItems = [
    {
      title: 'Mark Staff Attendance',
      description: 'Record daily staff attendance',
      icon: <WorkIcon />,
      path: '/attendance/staff',
      color: '#f59e0b'
    },
    {
      title: 'Staff Attendance Report',
      description: 'Generate staff reports',
      icon: <BarChartIcon />,
      path: '/attendance/staff-report',
      color: '#8b5cf6'
    },
    {
      title: 'Staff Half Leaves',
      description: 'Record and manage staff half-day leaves',
      icon: <AccessTimeIcon />,
      path: '/attendance/staff-half-leaves',
      color: '#ec4899'
    }
  ];

  // Employee menu items
  const employeeMenuItems = [
    {
      title: 'All Employees',
      description: 'View and manage all staff members',
      icon: <SchoolIcon />,
      path: '/employees/list',
      color: '#3b82f6'
    },
    {
      title: 'Add New',
      description: 'Register new employees and create profiles',
      icon: <PersonAddIcon />,
      path: '/employees/add',
      color: '#10b981'
    },
    {
      title: 'Teacher Subject Assignment',
      description: 'Assign subjects to teachers',
      icon: <AssignmentIcon />,
      path: '/teacher-subjects',
      color: '#f59e0b'
    },
    {
      title: 'Timetable',
      description: 'Create and manage class schedules',
      icon: <CalendarMonthIcon />,
      path: '/timetable',
      color: '#8b5cf6'
    }
  ];

  // Fee menu items - split into two groups
  const feeMenuItems1 = [
    {
      title: 'Fee Structure',
      description: 'Create and manage fee structures',
      icon: <AccountBalanceIcon />,
      path: '/fee-structure-management',
      color: '#10b981'
    },
    {
      title: 'Fee Plans',
      description: 'Create and manage individual student fee plans',
      icon: <DescriptionIcon />,
      path: '/fee-plans',
      color: '#06b6d4'
    },
    {
      title: 'Fee Increments',
      description: 'Apply increments to fee plans and structures',
      icon: <TrendingUpIcon />,
      path: '/fee-increments',
      color: '#f97316'
    },
    {
      title: 'Load Fee',
      description: 'Import and load fee data',
      icon: <AttachMoneyIcon />,
      path: '/load-fee',
      color: '#f59e0b'
    },
    {
      title: 'Fee Collection',
      description: 'Enhanced fee collection interface',
      icon: <AttachMoneyIcon />,
      path: '/fee-collection',
      color: '#8b5cf6'
    },
    {
      title: 'Fee Defaulters',
      description: 'View students with outstanding fees',
      icon: <AttachMoneyIcon />,
      path: '/fee-defaulters',
      color: '#ef4444'
    },
    {
      title: 'Fee Audit Logs',
      description: 'Track all fee-related changes',
      icon: <ListAltIcon />,
      path: '/fee-audit-logs',
      color: '#6b7280'
    },
    {
      title: 'Payroll Management',
      description: 'Manage employee salaries, payments, and payroll operations',
      icon: <CalculateIcon />,
      path: '/payroll',
      color: '#3b82f6'
    }
  ];

  const feeMenuItems2 = [
    {
      title: 'Fee Analytics',
      description: 'Comprehensive fee analytics dashboard',
      icon: <AssessmentIcon />,
      path: '/fee-analytics',
      color: '#059669'
    },
    {
      title: 'Fee Concessions',
      description: 'Manage student fee concessions',
      icon: <AttachMoneyIcon />,
      path: '/concessions',
      color: '#ec4899'
    },
    {
      title: 'Payment History',
      description: 'View complete payment history',
      icon: <ListAltIcon />,
      path: '/payment-history',
      color: '#3b82f6'
    },
    {
      title: 'Fee Ledger',
      description: 'View comprehensive fee ledger',
      icon: <AccountBalanceIcon />,
      path: '/ledger',
      color: '#14b8a6'
    }
  ];

  // Expense menu items
  const expenseMenuItems = [
    {
      title: 'Expense Manager',
      description: 'Track and manage all school expenditures',
      icon: <ReceiptIcon />,
      path: '/expense-manager',
      color: '#dc2626'
    },
    {
      title: 'Expense Analytics',
      description: 'View comprehensive expense analytics and insights',
      icon: <BarChartIcon />,
      path: '/expense-analytics',
      color: '#3b82f6'
    }
  ];

  // Fine menu items
  const fineMenuItems = [
    {
      title: 'Assign Fine',
      description: 'Set and assign fines for violations',
      icon: <AttachMoneyIcon />,
      path: '/fines/assign',
      color: '#3b82f6'
    },
    {
      title: 'Collect Fine',
      description: 'Process fine payments and track collections',
      icon: <AttachMoneyIcon />,
      path: '/fines/collect',
      color: '#10b981'
    },
    {
      title: 'Remaining Fine',
      description: 'View outstanding fines and track payments',
      icon: <WalletIcon />,
      path: '/fines/remaining',
      color: '#f59e0b'
    },
    {
      title: 'Fine Statistics',
      description: 'Analyze fine trends and generate reports',
      icon: <PieChartIcon />,
      path: '/fines/statistics',
      color: '#8b5cf6'
    }
  ];




  // Enquiry Management menu items (moved to Communication)
  const enquiryMenuItems = [
    {
      title: 'Enquiry Dashboard',
      description: 'Overview of all enquiries',
      icon: <DashboardIcon />,
      path: '/enquiries/dashboard',
      color: '#3b82f6'
    },
    {
      title: 'All Enquiries',
      description: 'View and manage all enquiries',
      icon: <ListIcon />,
      path: '/enquiries/list',
      color: '#10b981'
    },
    {
      title: 'New Enquiry',
      description: 'Create new enquiries',
      icon: <AddIcon />,
      path: '/enquiries/create',
      color: '#f59e0b'
    }
  ];

  // Communication menu items (placeholder for future communication features)
  const communicationMenuItems = [
    {
      title: 'Messages',
      description: 'Send and receive messages',
      icon: <ForumIcon />,
      path: '/students/general-message',
      color: '#3b82f6'
    },
    {
      title: 'Announcements',
      description: 'Create and manage announcements',
      icon: <ListAltIcon />,
      path: '/settings/user-announcements',
      color: '#10b981'
    },
    {
      title: 'Events and Notices',
      description: 'Create and manage school events and notices',
      icon: <EventIcon />,
      path: '/events',
      color: '#8b5cf6'
    },
    {
      title: 'Leave Requests',
      description: 'Review and manage leave requests',
      icon: <EventBusyIcon />,
      path: '/attendance/leave-requests',
      color: '#ef4444'
    },
    {
      title: 'Complaints & Suggestions',
      description: 'Review and manage student and parent complaints and suggestions',
      icon: <FeedbackIcon />,
      path: '/attendance/complaints-suggestions',
      color: '#f59e0b'
    }
  ];

  // Generate description for Marks Entry based on published examinations
  const getMarksEntryDescription = useMemo(() => {
    if (publishedExaminations.length === 0) {
      return 'Enter and manage student marks';
    } else if (publishedExaminations.length === 1) {
      return publishedExaminations[0].name;
    } else {
      const count = publishedExaminations.length;
      const countText = count === 2 ? 'Two' : count === 3 ? 'Three' : count === 4 ? 'Four' : count === 5 ? 'Five' : `${count}`;
      return `${countText} Examinations`;
    }
  }, [publishedExaminations]);

  // Examination menu items
  const examinationMenuItems = useMemo(() => {
    const baseItems = [
      {
        title: 'Manage Examinations',
        description: 'Create and manage examination schedules',
        icon: <AssessmentIcon />,
        path: '/examinations',
        color: '#3b82f6'
      },
      {
        title: 'Master Sheets',
        description: 'Generate comprehensive master sheets',
        icon: <BarChartIcon />,
        path: '/master-sheets',
        color: '#f59e0b'
      },
      {
        title: 'DMC Generation',
        description: 'Generate detailed marks certificates',
        icon: <CloudDownloadIcon />,
        path: '/dmc-generation',
        color: '#8b5cf6'
      },
      {
        title: 'Position Holders',
        description: 'View student positions and rankings',
        icon: <EmojiEventsIcon />,
        path: '/position-holders',
        color: '#ef4444'
      },
      {
        title: 'Exam Analytics',
        description: 'Analyze examination performance',
        icon: <PieChartIcon />,
        path: '/exam-analytics',
        color: '#06b6d4'
      },
      {
        title: 'Manage Subjects',
        description: 'Add, edit, and manage subjects',
        icon: <SchoolIcon />,
        path: '/subjects',
        color: '#84cc16'
      },
      {
        title: 'Examination Configuration',
        description: 'Configure grade criteria and settings',
        icon: <SettingsIcon />,
        path: '/examination-configuration',
        color: '#6366f1'
      }
    ];

    // Only add Marks Entry if there are published examinations
    if (publishedExaminations.length > 0) {
      baseItems.splice(1, 0, {
        title: 'Marks Entry',
        description: getMarksEntryDescription,
        icon: <ListAltIcon />,
        path: '/marks-entry',
        color: '#10b981'
      });
    }

    return baseItems;
  }, [publishedExaminations, getMarksEntryDescription]);

  // Test Record menu items
  const testRecordMenuItems = [
    {
      title: 'Test Marks Entry',
      description: 'View and manage test records',
      icon: <QuizIcon />,
      path: '/test-records',
      color: '#10b981'
    },
    {
      title: 'Test Master Sheet',
      description: 'Generate test master sheets',
      icon: <AssessmentIcon />,
      path: '/test-record-master-sheet',
      color: '#f59e0b'
    },
    {
      title: 'Test Analytics',
      description: 'Analyze test performance and statistics',
      icon: <BarChartIcon />,
      path: '/test-analytics',
      color: '#8b5cf6'
    }
  ];

  // Daily Diary menu items
  const diaryMenuItems = [
    {
      title: 'Assign Diary',
      description: 'Create and manage daily homework assignments',
      icon: <AssignmentIcon />,
      path: '/homework-diary',
      color: '#3b82f6'
    },
    {
      title: 'Diary Analytics',
      description: 'Analyze homework assignment patterns',
      icon: <BarChartIcon />,
      path: '/diary-analytics',
      color: '#10b981'
    }
  ];

  // Settings menu items - split into two columns
  const settingsColumn1Items = [
    {
      title: 'Institute Profile',
      description: 'Manage school information and settings',
      icon: <BusinessIcon />,
      path: '/settings/institute-profile',
      color: '#3b82f6'
    },
    {
      title: 'Classes',
      description: 'Create and manage class structures',
      icon: <SchoolIcon />,
      path: '/settings/classes',
      color: '#10b981'
    },
    {
      title: 'Sessions',
      description: 'Configure academic sessions and terms',
      icon: <CalendarMonthIcon />,
      path: '/settings/sessions',
      color: '#f59e0b'
    },
    {
      title: 'Holidays',
      description: 'Set up holiday calendar',
      icon: <BeachAccessIcon />,
      path: '/settings/holidays',
      color: '#8b5cf6'
    }
  ];

  const settingsColumn2Items = [
    {
      title: 'User Management',
      description: 'Manage user accounts and permissions',
      icon: <PeopleIcon />,
      path: '/settings/user-management',
      color: '#ef4444'
    },
    {
      title: 'Role Management',
      description: 'Configure roles and access permissions',
      icon: <AdminPanelSettingsIcon />,
      path: '/settings/role-management',
      color: '#8b5cf6'
    },
    {
      title: 'User Permissions',
      description: 'Manage individual user permissions',
      icon: <PersonIcon />,
      path: '/settings/user-permissions',
      color: '#10b981'
    },
    {
      title: 'Render Settings',
      description: 'Configure render settings users',
      icon: <SettingsIcon />,
      path: '/settings/rendersettings',
      color: '#ec4899'
    },
    {
      title: 'General Settings',
      description: 'Configure general system settings',
      icon: <SettingsIcon />,
      path: '/settings/general-settings',
      color: '#6366f1'
    },
    {
      title: 'Notification Settings',
      description: 'Manage notification preferences',
      icon: <NotificationsIcon />,
      path: '/settings/notifications',
      color: '#ec4899'
    }
  ];

  // Helper function to get dashboard path based on permissions
  const getDashboardPath = useCallback(() => {
    // Super Admin always has dashboard access
    if (isSuperAdmin) {
      return '/dashboard';
    }
    
    if (!user?.id || !user?.school_id || !permissionsLoaded) {
      return '/user'; // Default to UserDashboard while loading
    }
    
    // Check dashboard permission using role_id from roles table
    if (userPermissions.has('dashboard')) {
      return '/dashboard';
    }
    
    // Default to UserDashboard if no dashboard permission
    return '/user';
  }, [user?.id, user?.school_id, permissionsLoaded, userPermissions, isSuperAdmin]);

  const menuItems = [
    {
      icon: <PeopleIcon />,
      path: '/students',
      label: 'Students',
      hasDropdown: true,
      menuItems: [
        { title: 'Student Management', items: studentMenuItems },
        { title: 'Attendance', items: attendanceMenuItems },
        { title: 'Reports', items: studentReportsMenuItems }
      ],
      columns: 3
    },
    {
      icon: <SchoolIcon />,
      path: '/employees',
      label: 'Employees',
      hasDropdown: true,
      menuItems: [
        { title: 'Employee Management', items: employeeMenuItems },
        { title: 'Attendance', items: employeeAttendanceMenuItems },
        { title: 'Reports', items: employeeReportsMenuItems }
      ],
      columns: 3
    },
    {
      icon: <AccountBalanceIcon />,
      path: '/finance',
      label: 'Finance',
      hasDropdown: true,
      menuItems: [
        { 
          title: 'Fee Management', 
          items: feeMenuItems1
        },
        { 
          title: 'Fee & Expense', 
          items: feeMenuItems2,
          expenseItems: expenseMenuItems
        },
        { title: 'Fine Management', items: fineMenuItems }
      ],
      columns: 3
    },
    {
      icon: <AssessmentIcon />,
      path: '/academics',
      label: 'Academics',
      hasDropdown: true,
      menuItems: [
        { title: 'Examination', items: examinationMenuItems },
        { title: 'Test Management', items: testRecordMenuItems },
        { title: 'Daily Diary', items: diaryMenuItems }
      ],
      columns: 3
    },
    {
      icon: <ForumIcon />,
      path: '/communication',
      label: 'Communication',
      hasDropdown: true,
      menuItems: [
        { title: 'Communication', items: communicationMenuItems },
        { title: 'Enquiry Management', items: enquiryMenuItems }
      ],
      columns: 2
    },
    {
      icon: <SettingsIcon />,
      path: '/settings',
      label: 'Settings',
      hasDropdown: true,
      menuItems: [
        { title: 'School Configuration', items: settingsColumn1Items },
        { title: 'System Settings', items: settingsColumn2Items }
      ],
      columns: 2
    }
  ];
  
  // Filter menu items based on permissions for teachers
  const filterMenuItems = useMemo(() => {
    if (!permissionsLoaded) return [];
    
    const filterItems = (items: any[]): any[] => {
      return items.filter(item => 
        shouldShowMenuItem(item.path, user?.role, userPermissions)
      );
    };
    
    const filterMenuSections = (sections: any[]): any[] => {
      return sections.map(section => {
        const filteredItems = filterItems(section.items || []);
        const filteredExpenseItems = section.expenseItems ? filterItems(section.expenseItems) : undefined;
        
        // Only include section if it has visible items
        if (filteredItems.length === 0 && (!filteredExpenseItems || filteredExpenseItems.length === 0)) {
          return null;
        }
        
        return {
          ...section,
          items: filteredItems,
          ...(filteredExpenseItems && { expenseItems: filteredExpenseItems })
        };
      }).filter((section): section is NonNullable<typeof section> => section !== null);
    };
    
    return menuItems.map(menuItem => {
      if (!menuItem.hasDropdown) {
        // Simple menu item - check permission
        if (!shouldShowMenuItem(menuItem.path, user?.role, userPermissions)) {
          return null;
        }
        return menuItem;
      }
      
      // Menu with dropdown - filter submenu items
      const filteredSections = filterMenuSections(menuItem.menuItems || []);
      
      // Only show menu if it has at least one visible section
      if (filteredSections.length === 0) {
        return null;
      }
      
      return {
        ...menuItem,
        menuItems: filteredSections
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
  }, [permissionsLoaded, user?.role, userPermissions, menuItems, getDashboardPath]);

  const toggleMobileMenu = (menuLabel: string) => {
    setMobileOpenMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuLabel)) {
        newSet.delete(menuLabel);
      } else {
        newSet.add(menuLabel);
      }
      return newSet;
    });
  };

  const handleMobileMenuItemClick = useCallback((path: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setMobileSidebarOpen(false);
    setMobileOpenMenus(new Set());
    navigate(path, { replace: false });
  }, [navigate]);

  return (
    <>
      {!isRestrictedRole && (
        <>
          <MobileSidebarBackdrop 
            $isOpen={mobileSidebarOpen} 
            onClick={() => {
              setMobileSidebarOpen(false);
              setMobileOpenMenus(new Set());
            }}
          />
          <MobileSidebar $isOpen={mobileSidebarOpen}>
        <MobileSidebarHeader>
          <MobileSidebarTitle>Menu</MobileSidebarTitle>
          <MobileSidebarCloseButton
            onClick={() => {
              setMobileSidebarOpen(false);
              setMobileOpenMenus(new Set());
            }}
          >
            <CloseIcon />
          </MobileSidebarCloseButton>
        </MobileSidebarHeader>
        <MobileMenuSection>
          {filterMenuItems.map((item) => {
            const isOpen = mobileOpenMenus.has(item.label);
            return (
              <React.Fragment key={item.path}>
                <MobileMenuItem
                  $hasSubmenu={item.hasDropdown}
                  onClick={() => {
                    if (item.hasDropdown) {
                      toggleMobileMenu(item.label);
                    } else {
                      handleMobileMenuItemClick(item.path);
                    }
                  }}
                >
                  <span className="menu-icon">{item.icon}</span>
                  <span className="menu-label">{item.label}</span>
                  {item.hasDropdown && (
                    <ChevronRightIcon 
                      className="menu-arrow"
                      style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    />
                  )}
                </MobileMenuItem>
                {item.hasDropdown && (
                  <MobileSubmenu $isOpen={isOpen}>
                    {item.menuItems && Array.isArray(item.menuItems) && item.menuItems.length > 0 && (
                      (() => {
                        const firstItem = item.menuItems[0] as any;
                        return firstItem?.title && 'items' in firstItem && firstItem.items;
                      })() ? (
                        // Multi-column structure (Students, Employees, Finance, Academics, Communication)
                        item.menuItems.map((section: any, sectionIdx: number) => (
                          <React.Fragment key={sectionIdx}>
                            <MobileMenuItem
                              style={{
                                padding: '8px 16px',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                textTransform: 'uppercase',
                                color: 'inherit',
                                cursor: 'default',
                                borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#e0e0e0'}`,
                                marginTop: sectionIdx > 0 ? '8px' : '0'
                              } as React.CSSProperties}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="menu-label">{section.title}</span>
                            </MobileMenuItem>
                            {section.items && section.items.map((menuItem: any, idx: number) => (
                              <MobileSubmenuItem
                                key={idx}
                                onClick={(e) => handleMobileMenuItemClick(menuItem.path, e)}
                                style={{ '--color': menuItem.color } as React.CSSProperties}
                              >
                                <div 
                                  className="submenu-icon"
                                  style={{ background: `linear-gradient(135deg, ${menuItem.color} 0%, ${menuItem.color}dd 100%)` }}
                                >
                                  {menuItem.icon}
                                </div>
                                <div className="submenu-content">
                                  <div className="submenu-title">{menuItem.title}</div>
                                  <div className="submenu-description">{menuItem.description}</div>
                                </div>
                              </MobileSubmenuItem>
                            ))}
                            {section.expenseItems && (
                              <>
                                {section.expenseItems.map((menuItem: any, idx: number) => (
                                  <MobileSubmenuItem
                                    key={`expense-${idx}`}
                                    onClick={() => handleMobileMenuItemClick(menuItem.path)}
                                    style={{ '--color': menuItem.color } as React.CSSProperties}
                                  >
                                    <div 
                                      className="submenu-icon"
                                      style={{ background: `linear-gradient(135deg, ${menuItem.color} 0%, ${menuItem.color}dd 100%)` }}
                                    >
                                      {menuItem.icon}
                                    </div>
                                    <div className="submenu-content">
                                      <div className="submenu-title">{menuItem.title}</div>
                                      <div className="submenu-description">{menuItem.description}</div>
                                    </div>
                                  </MobileSubmenuItem>
                                ))}
                              </>
                            )}
                          </React.Fragment>
                        ))
                      ) : (
                        // Single column structure (Settings)
                        (item.menuItems as any[]).map((menuItem: any, idx: number) => (
                          <MobileSubmenuItem
                            key={idx}
                            onClick={() => handleMobileMenuItemClick(menuItem.path)}
                            style={{ '--color': menuItem.color } as React.CSSProperties}
                          >
                            <div 
                              className="submenu-icon"
                              style={{ background: `linear-gradient(135deg, ${menuItem.color} 0%, ${menuItem.color}dd 100%)` }}
                            >
                              {menuItem.icon}
                            </div>
                            <div className="submenu-content">
                              <div className="submenu-title">{menuItem.title}</div>
                              <div className="submenu-description">{menuItem.description}</div>
                            </div>
                          </MobileSubmenuItem>
                        ))
                      )
                    )}
                  </MobileSubmenu>
                )}
              </React.Fragment>
            );
          })}
        </MobileMenuSection>
      </MobileSidebar>
        </>
      )}
      <HeaderStyled $hasSidebar={false}>
        <HeaderLeft>
          {!isRestrictedRole && (
            <HamburgerButton
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open menu"
            >
              <MenuIcon />
            </HamburgerButton>
          )}
          <AppLogo 
            onClick={() => {
              if (isRestrictedRole) {
                navigate('/home');
              } else {
                navigate(getDashboardPath());
              }
            }} 
            title={isRestrictedRole ? 'Go to Home' : 'Go to Dashboard'}
          >
          {instituteProfile?.logo_url ? (
            <img src={instituteProfile.logo_url} alt="App Logo" />
          ) : (
            <SchoolIcon />
          )}
        </AppLogo>
        {!isRestrictedRole && permissionsLoaded && (
        <NavMenu>
          {filterMenuItems.map((item) => {
            const isStudents = item.label === 'Students';
            const isEmployees = item.label === 'Employees';
            
            const getMenuState = () => {
              if (isStudents) return { open: studentMenuOpen, setOpen: setStudentMenuOpen, ref: studentMenuRef, buttonRef: studentButtonRef, dropdownRef: studentDropdownRef };
              if (isEmployees) return { open: employeeMenuOpen, setOpen: setEmployeeMenuOpen, ref: employeeMenuRef, buttonRef: employeeButtonRef, dropdownRef: employeeDropdownRef };
              if (item.label === 'Finance') return { open: financeMenuOpen, setOpen: setFinanceMenuOpen, ref: financeMenuRef, buttonRef: financeButtonRef, dropdownRef: financeDropdownRef };
              if (item.label === 'Communication') return { open: communicationMenuOpen, setOpen: setCommunicationMenuOpen, ref: communicationMenuRef, buttonRef: communicationButtonRef, dropdownRef: communicationDropdownRef };
              if (item.label === 'Academics') return { open: academicsMenuOpen, setOpen: setAcademicsMenuOpen, ref: academicsMenuRef, buttonRef: academicsButtonRef, dropdownRef: academicsDropdownRef };
              if (item.label === 'Settings') return { open: settingsMenuOpen, setOpen: setSettingsMenuOpen, ref: settingsMenuRef, buttonRef: settingsButtonRef, dropdownRef: settingsDropdownRef };
              return null;
            };
            
            const menuState = item.hasDropdown ? getMenuState() : null;
            
            if (item.hasDropdown) {
              return (
                <MenuWrapper 
                  key={item.path} 
                  ref={menuState?.ref}
                  onMouseEnter={() => {
                    // Close all other menus first
                    if (!isStudents && studentMenuOpen) setStudentMenuOpen(false);
                    if (!isEmployees && employeeMenuOpen) setEmployeeMenuOpen(false);
                    if (item.label !== 'Finance' && financeMenuOpen) setFinanceMenuOpen(false);
                    if (item.label !== 'Communication' && communicationMenuOpen) setCommunicationMenuOpen(false);
                    if (item.label !== 'Academics' && academicsMenuOpen) setAcademicsMenuOpen(false);
                    if (item.label !== 'Settings' && settingsMenuOpen) setSettingsMenuOpen(false);
                    
                    // Clear any pending close timeout for this menu
                    if (menuLeaveTimeoutRef.current[item.path]) {
                      clearTimeout(menuLeaveTimeoutRef.current[item.path]!);
                      menuLeaveTimeoutRef.current[item.path] = null;
                    }
                    
                    // Clear all other menu timeouts
                    Object.keys(menuLeaveTimeoutRef.current).forEach(key => {
                      if (key !== item.path && menuLeaveTimeoutRef.current[key]) {
                        clearTimeout(menuLeaveTimeoutRef.current[key]!);
                        menuLeaveTimeoutRef.current[key] = null;
                      }
                    });
                    
                    menuState?.setOpen(true);
                    // Update position immediately
                    setTimeout(() => {
                      if (menuState?.buttonRef.current && menuState?.dropdownRef.current) {
                        const buttonRect = menuState.buttonRef.current.getBoundingClientRect();
                        if (menuState.dropdownRef.current) {
                          menuState.dropdownRef.current.style.top = `${buttonRect.bottom + 4}px`;
                          menuState.dropdownRef.current.style.left = `${buttonRect.left}px`;
                        }
                      }
                    }, 0);
                  }}
                  onMouseLeave={() => {
                    // Add a small delay before closing to allow moving to dropdown
                    menuLeaveTimeoutRef.current[item.path] = setTimeout(() => {
                      menuState?.setOpen(false);
                      menuLeaveTimeoutRef.current[item.path] = null;
                    }, 100);
                  }}
                >
                  <NavMenuItem
                    ref={menuState?.buttonRef}
                    $hasDropdown={true}
                    aria-label={item.label}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavMenuItem>
                  <MenuDropdown
                    ref={menuState?.dropdownRef}
                    $isOpen={menuState?.open || false}
                    $columns={item.columns}
                    $actualColumns={item.menuItems?.length || 0}
                    onMouseEnter={() => {
                      // Clear any pending close timeout when mouse enters dropdown
                      if (menuLeaveTimeoutRef.current[item.path]) {
                        clearTimeout(menuLeaveTimeoutRef.current[item.path]!);
                        menuLeaveTimeoutRef.current[item.path] = null;
                      }
                    }}
                    onMouseLeave={() => {
                      // Close when mouse leaves dropdown
                      menuState?.setOpen(false);
                    }}
                  >
                    {item.label === 'Finance' ? (
                      // Finance has 3 columns: Fee Management, Fee & Expense, Fine Management
                      item.menuItems?.map((section: any, sectionIdx: number) => (
                        <DropdownColumn key={sectionIdx}>
                          <ColumnTitle>{section.title}</ColumnTitle>
                          {section.expenseItems ? (
                            // Column 2: Fee & Expense - show Fee items, separator, then Expense items
                            <>
                              {section.items.map((menuItem: any, idx: number) => (
                                <DropdownMenuItem
                                  key={idx}
                                  $color={menuItem.color}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    menuState?.setOpen(false);
                                    navigate(menuItem.path, { replace: false });
                                  }}
                                >
                                  <div className="menu-icon">{menuItem.icon}</div>
                                  <div className="menu-content">
                                    <div className="menu-title">{menuItem.title}</div>
                                    <div className="menu-description">{menuItem.description}</div>
                                  </div>
                                </DropdownMenuItem>
                              ))}
                              <ColumnSeparator />
                              {section.expenseItems.map((menuItem: any, idx: number) => (
                                <DropdownMenuItem
                                  key={idx}
                                  $color={menuItem.color}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    menuState?.setOpen(false);
                                    navigate(menuItem.path, { replace: false });
                                  }}
                                >
                                  <div className="menu-icon">{menuItem.icon}</div>
                                  <div className="menu-content">
                                    <div className="menu-title">{menuItem.title}</div>
                                    <div className="menu-description">{menuItem.description}</div>
                                  </div>
                                </DropdownMenuItem>
                              ))}
                            </>
                          ) : (
                            // Column 1 (Fee Management) or Column 3 (Fine Management) - direct items
                            section.items.map((menuItem: any, idx: number) => (
                              <DropdownMenuItem
                                key={idx}
                                $color={menuItem.color}
                                onClick={() => {
                                  navigate(menuItem.path);
                                  menuState?.setOpen(false);
                                }}
                              >
                                <div className="menu-icon">{menuItem.icon}</div>
                                <div className="menu-content">
                                  <div className="menu-title">{menuItem.title}</div>
                                  <div className="menu-description">{menuItem.description}</div>
                                </div>
                              </DropdownMenuItem>
                            ))
                          )}
                        </DropdownColumn>
                      ))
                    ) : isStudents || isEmployees || item.label === 'Academics' || item.label === 'Communication' || item.label === 'Settings' ? (
                      // Students, Employees, and Academics have 3 columns, Communication and Settings have 2 columns - all with titles
                      item.menuItems?.map((section: any, sectionIdx: number) => (
                        <DropdownColumn key={sectionIdx}>
                          <ColumnTitle>{section.title}</ColumnTitle>
                          {section.items.map((menuItem: any, idx: number) => (
                            <DropdownMenuItem
                              key={idx}
                              $color={menuItem.color}
                              onClick={() => {
                                navigate(menuItem.path);
                                menuState?.setOpen(false);
                              }}
                            >
                              <div className="menu-icon">{menuItem.icon}</div>
                              <div className="menu-content">
                                <div className="menu-title">{menuItem.title}</div>
                                <div className="menu-description">{menuItem.description}</div>
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownColumn>
                      ))
                    ) : (
                      // Single column fallback (Settings)
                      <DropdownColumn style={{ gridColumn: `1 / -1` }}>
                        {(() => {
                          const firstItem = item.menuItems && Array.isArray(item.menuItems) && item.menuItems.length > 0 ? item.menuItems[0] : null;
                          const hasSectionStructure = firstItem && typeof firstItem === 'object' && 'items' in firstItem && Array.isArray((firstItem as any).items);
                          
                          if (hasSectionStructure) {
                            // If menuItems is array of sections, render items from first section
                            return (firstItem as any).items.map((menuItem: any, idx: number) => (
                              <DropdownMenuItem
                                key={idx}
                                $color={menuItem.color}
                                onClick={() => {
                                  navigate(menuItem.path);
                                  menuState?.setOpen(false);
                                }}
                              >
                                <div className="menu-icon">{menuItem.icon}</div>
                                <div className="menu-content">
                                  <div className="menu-title">{menuItem.title}</div>
                                  <div className="menu-description">{menuItem.description}</div>
                                </div>
                              </DropdownMenuItem>
                            ));
                          } else {
                            // Direct array of menu items
                            return (item.menuItems as any[])?.map((menuItem: any, idx: number) => (
                              <DropdownMenuItem
                                key={idx}
                                $color={menuItem.color}
                                onClick={() => {
                                  navigate(menuItem.path);
                                  menuState?.setOpen(false);
                                }}
                              >
                                <div className="menu-icon">{menuItem.icon}</div>
                                <div className="menu-content">
                                  <div className="menu-title">{menuItem.title}</div>
                                  <div className="menu-description">{menuItem.description}</div>
                                </div>
                              </DropdownMenuItem>
                            ));
                          }
                        })()}
                      </DropdownColumn>
                    )}
                  </MenuDropdown>
                </MenuWrapper>
              );
            }
            return (
              <NavMenuItem
                key={item.path}
                $isDashboard={false}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!item.hasDropdown) {
                    navigate(item.path, { replace: false });
                  }
                }}
                aria-label={item.label}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavMenuItem>
            );
          })}
        </NavMenu>
        )}
      </HeaderLeft>
      <HeaderActions>
        {/* Show notification bell for all authenticated users (staff and students) */}
        {(user || studentInfo || parentInfo) && <NotificationBell />}
        <HeaderIconCircle
          as="button"
          onClick={onRefresh}
          aria-label="Refresh page"
          disabled={isDownloadActive}
          style={{
            opacity: isDownloadActive ? 0.5 : 1,
            cursor: isDownloadActive ? 'not-allowed' : 'pointer',
            pointerEvents: isDownloadActive ? 'none' : 'auto'
          }}
          title={isDownloadActive ? 'Download in progress. Please wait before refreshing.' : 'Refresh page'}
        >
          <RefreshIcon />
        </HeaderIconCircle>
        <div style={{ position: 'relative' }}>
          <ProfileAvatarContainer
            as="button"
            ref={profileIconRef}
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            aria-label="Profile"
            $hasImage={!!(avatarUrl || parentInfo?.avatar_url) && !imageError}
          >
            {(avatarUrl || parentInfo?.avatar_url) && !imageError ? (
              <img
                src={avatarUrl || parentInfo?.avatar_url || ''}
                alt="avatar"
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
              />
            ) : (
              <UserIcon />
            )}
          </ProfileAvatarContainer>
          {profileMenuOpen && (
            <ProfileDropdown
              ref={profileDropdownRef}
              studentInfo={studentInfo}
              parentInfo={parentInfo}
              staffName={staffName}
              user={user}
              theme={theme}
              onToggleTheme={onToggleTheme}
              onOpenChangePassword={onOpenChangePassword}
              isWeb={isWeb}
              onCheckForUpdates={onCheckForUpdates}
              isCheckingUpdate={isCheckingUpdate}
              isDownloadActive={isDownloadActive}
              onAboutUsClick={onAboutUsClick}
              onLogout={onLogout}
              appVersion={appVersion}
            />
          )}
        </div>
        {!isWeb && <MacWindowControlsComponent />}
      </HeaderActions>
    </HeaderStyled>
    </>
  );
};

export default Header;