import React, { useState, createContext, useContext, useRef, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import styled, { ThemeProvider, createGlobalStyle, keyframes } from 'styled-components';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Assessment as AssessmentIcon,
  CalendarMonth as CalendarMonthIcon,
  BarChart as BarChartIcon,
  Event as EventIcon,
  Add as AddIcon,
  ListAlt as ListAltIcon,
  Notifications as BellIcon,
  AccountCircle as UserIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Settings,
  MonetizationOn as MoneyIcon,
  VolumeUp,
  VolumeOff,
  PieChart as PieChartIcon,
  CloudDownload as CloudDownloadIcon,
  Remove,
  CropSquare,
  Close,
  Block as BlockIcon,
  Visibility,
  QuestionAnswer as QuestionAnswerIcon,
  VisibilityOff,
  Home as HomeIcon,
  Business as BusinessIcon,
  AttachMoney as AttachMoneyIcon,
  Refresh as RefreshIcon,
  WifiOff as WifiOffIcon,
  ExitToApp as ExitIcon,
  SystemUpdate as SystemUpdateIcon,
} from '@mui/icons-material';
import ReactDOM from 'react-dom';
import { useToast } from './useToast';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useGlobalClickSound from '../hooks/useGlobalClickSound';
import { getUser, removeUser } from '../utils/auth';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import CollapsibleSidebar from './CollapsibleSidebar';
import { useBackNavigation } from '../hooks/useBackNavigation';
import { useNavigation } from '../contexts/NavigationContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import NotificationBell from './NotificationBell';
import { UpdateService } from '../services/updateService';
import AboutUsModal from './AboutUsModal';
import '../utils/testNotifications'; // Import test utilities

// Capacitor import for mobile back button handling
let CapacitorApp: any = null;
try {
  CapacitorApp = require('@capacitor/app').App;
} catch (e) {
  // Capacitor not available, will use fallback
}

// Theme context
type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
});

// Mute context for global sound control
const MuteContext = createContext<{ muted: boolean; toggleMute: () => void }>({ muted: false, toggleMute: () => {} });

// Context for page header
export const PageHeaderContext = createContext<{ setPageHeader: (header: string) => void }>({ setPageHeader: () => {} });

// Theme colors
const darkTheme = {
  BG: '#252525',
  SIDEBAR_BG: '#2a2a2a',
  CARD: '#2a2a2a',
  ACCENT: '#4a6cf7',
  SHADOW: '0 1.8px 7.2px 0 #0003',
  TEXT_PRIMARY: '#e0e0e0',
  TEXT_SECONDARY: '#b0b8d1',
  BORDER: 'rgba(255, 255, 255, 0.05)',
  ICON_BG: 'rgba(74, 108, 247, 0.15)',
  HOVER_BG: 'rgba(74, 108, 247, 0.18)',
  FIELD_BG: '#252525',
  FIELD_BORDER: '#3a3f4b',
  ACCENT_INPUT: '#4a6cf7',
  CANCEL_BG: '#252525',
  CANCEL_COLOR: '#e0e0e0',
};

const lightTheme = {
  BG: '#f5f7fa',
  SIDEBAR_BG: '#ffffff',
  CARD: '#ffffff',
  ACCENT: '#4a6cf7',
  SHADOW: '0 1.8px 7.2px 0 #0003',
  TEXT_PRIMARY: '#1a1a1a',
  TEXT_SECONDARY: '#666666',
  BORDER: 'rgba(0, 0, 0, 0.05)',
  ICON_BG: 'rgba(74, 108, 247, 0.1)',
  HOVER_BG: 'rgba(74, 108, 247, 0.15)',
  FIELD_BG: '#f7faff',
  FIELD_BORDER: '#b6c2d9',
  ACCENT_INPUT: '#4a6cf7',
  CANCEL_BG: '#ededed',
  CANCEL_COLOR: '#232323',
};

const menuItems = [
  {
    text: 'Welcome Page',
    icon: <HomeIcon />,
    path: '/teacher',
    allowedRoles: ['Teacher']
  },
  {
    text: 'Dashboard',
    icon: <HomeIcon />,
    path: '/dashboard',
    allowedRoles: ['Super Admin', 'Principal', 'Admin']
  },
  {
    text: 'Students',
    icon: <PeopleIcon />,
    path: '/students',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Academic Head'],
  },
  {
    text: 'Attendance',
    icon: <AssessmentIcon />,
    path: '/attendance',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher'],
  },
  {
    text: 'Reports',
    icon: <ListAltIcon />,
    path: '/reports',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher']
  },
  {
    text: 'Fine Management',
    icon: <MoneyIcon />,
    path: '/fines',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Accountant'],
  },
  {
    text: 'Fee Management',
    icon: <AttachMoneyIcon />,
    path: '/fee-management',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Accountant'],
  },
  {
    text: 'Enquiry Management',
    icon: <QuestionAnswerIcon />,
    path: '/enquiries',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Accountant'],
  },
  {
    text: 'Timetable',
    icon: <CalendarMonthIcon />,
    path: '/timetable',
    allowedRoles: ['Super Admin', 'Principal', 'Admin']
  },
  {
    text: 'Employees',
    icon: <SchoolIcon />,
    path: '/employees',
    allowedRoles: ['Super Admin', 'Principal', 'Admin'],
  },
  {
    text: 'Examination',
    icon: <AssessmentIcon />,
    path: '/examination',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher'],
  },
  {
    text: 'Settings',
    icon: <Settings />,
    path: '/settings',
    allowedRoles: ['Super Admin', 'Principal', 'Admin'],
  },
  {
    text: 'Schools Management',
    icon: <BusinessIcon />,
    path: '/schools',
    allowedRoles: ['Super Admin']
  },
];

const BG = '#252525';
const SIDEBAR_BG = '#252525';
const CARD = '#252525';
const ACCENT = '#4a6cf7';
const FONT = `'Inter', 'Segoe UI', Arial, sans-serif`;

const AppContainer = styled.div`
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
  background: ${props => props.theme.BG};
`;

const LayoutWrapper = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: row;
  font-family: ${FONT};
  color: ${props => props.theme.TEXT_PRIMARY};
  background: ${props => props.theme.BG};
`;

const MainArea = styled.div<{ $isTeacher?: boolean }>`
  position: relative;
  margin-left: ${props => props.$isTeacher ? '0' : '54px'};
  margin-top: 54px;
  height: calc(100vh - 32px);
  overflow-y: auto;
  background: ${props => props.theme.BG};
  flex: 1;
  @media (max-width: 700px) {
    margin-left: 0;
    margin-top: 54px;
    height: calc(100vh - 54px);
  }
`;

// Add/update these styled components at the top with other styled components
const Header = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${props => props.theme.CARD};
  box-shadow: 0 1.8px 7.2px 0 #0003;
  border-radius: 0;
  margin: 0;
  padding: 0 20px;
  height: 54px;
  border-bottom: 1px solid ${props => props.theme.BORDER};
  -webkit-app-region: drag;
  
  @media (max-width: 700px) {
    padding: 0 8px;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  
  @media (max-width: 700px) {
    gap: 8px;
    max-width: calc(100% - 100px);
    flex: 0 1 auto;
  }
`;

const MenuButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.TEXT_PRIMARY};
  font-size: 1.7rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
`;

const PageTitle = styled.h1<{ isMobile: boolean; $isOverflowing?: boolean }>`
  font-weight: 700;
  font-size: ${({ isMobile }) => isMobile ? 'clamp(0.9rem, 4vw, 1.2rem)' : '1.12rem'};
  color: ${props => props.theme.TEXT_PRIMARY};
  margin: 0;
  padding: 0;
  min-width: 0;
  flex: ${({ isMobile }) => isMobile ? '2' : '1'};
  line-height: 1.2;
  transition: font-size 0.2s ease;
  
  ${({ isMobile, $isOverflowing }) => isMobile ? `
    white-space: nowrap;
    overflow: hidden;
    position: relative;
    
    ${$isOverflowing ? `
      animation: marquee 5s linear infinite;
      
      @keyframes marquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      
      &:hover {
        animation-play-state: paused;
      }
    ` : ''}
  ` : `
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `}
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${props => props.theme.TEXT_PRIMARY};
  letter-spacing: 1px;
  gap: 10px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const LogoContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const LogoName = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${props => props.theme.TEXT_PRIMARY};
  letter-spacing: 1px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const LogoTagline = styled.div`
  font-size: 0.75rem;
  font-weight: 400;
  color: ${props => props.theme.TEXT_SECONDARY};
  letter-spacing: 0.5px;
  line-height: 1.2;
`;

const InstituteLogo = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid ${props => props.theme.BORDER};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
  margin-left: auto;
  
  @media (max-width: 700px) {
    gap: 6px;
    min-width: auto;
    justify-content: flex-end;
  }
`;

const NavigationButtonsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  
  @media (max-width: 700px) {
    display: none;
  }
`;

const HeaderIconCircle = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.theme.CARD};
  box-shadow: ${props => props.theme.SHADOW};
  color: ${props => props.theme.TEXT_SECONDARY};
  font-size: 1.1rem;
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
  
  &:hover {
    background: ${props => props.theme.HOVER_BG};
    color: ${props => props.theme.ACCENT};
    transform: scale(1.05);
    box-shadow: ${props => `0 2px 8px ${props.theme.ACCENT}33`};
  }

  @media (max-width: 700px) {
    width: 36px; // Slightly larger touch target on mobile
    height: 36px;
    font-size: 1.1rem;
  }

  svg {
    width: 20px;
    height: 20px;
    @media (max-width: 700px) {
      width: 22px;
      height: 22px;
    }
  }
`;

const ContentArea = styled.main`
  width: 100%;
  height: 100%;
  background: ${props => props.theme.BG};
  padding: 0;
  min-height: 0;
`;

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const DashboardCard = styled.div`
  background: ${props => props.theme.CARD};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${props => props.theme === lightTheme ? '0 4px 24px 0 #e3e8f7' : props.theme.SHADOW};
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  border: 1px solid ${props => props.theme.BORDER};
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme === lightTheme ? '0 8px 32px 0 #d0e2ff' : '0 8px 24px rgba(0, 0, 0, 0.2)'};
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const CardTitle = styled.h3`
  color: ${props => props.theme.TEXT_PRIMARY};
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
`;

const CardIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.theme.ICON_BG};
  color: ${props => props.theme.ACCENT};
  font-size: 1.2rem;
  border: 1px solid ${props => props.theme.ACCENT}33;
`;

const CardContent = styled.div`
  color: ${props => props.theme.TEXT_SECONDARY};
  font-size: 0.95rem;
  line-height: 1.5;
`;

const CardValue = styled.div`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${props => props.theme.TEXT_PRIMARY};
  margin: 8px 0;
`;

const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid ${props => props.theme.BORDER};
`;

const CardStat = styled.div<{ positive?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${props => props.positive 
    ? props.theme === 'light' 
      ? '#2e7d32' 
      : '#4caf50'
    : props.theme.TEXT_SECONDARY};
  font-size: 0.9rem;
  font-weight: 500;
`;

const GlobalStyle = createGlobalStyle`
  /* Hide scrollbar for Chrome, Safari and Opera */
  ::-webkit-scrollbar {
    width: 0px;
    background: transparent;
  }
  /* Hide scrollbar for IE, Edge and Firefox */
  body, * {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
  }
  html, body {
    overflow-x: hidden;
    max-width: 100vw;
  }
  
  /* Mobile touch optimizations */
  @media (max-width: 700px) {
    * {
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    
    input, textarea, select {
      -webkit-user-select: text;
      -khtml-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      user-select: text;
    }
    
    /* Prevent zoom on double tap */
    * {
      touch-action: manipulation;
    }
    
    /* Smooth transitions for mobile */
    .sidebar-transition {
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
  }
`;

const Overlay = styled.div<{open: boolean}>`
  display: ${({open}) => open ? 'block' : 'none'};
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.32);
  z-index: 2100;
  @media (min-width: 701px) {
    display: none;
  }
`;

const Dashboard: React.FC = () => {
  const { theme } = useContext(ThemeContext);

  return (
    <ContentArea>
      <DashboardGrid>
        <DashboardCard theme={theme}>
          <CardHeader>
            <CardTitle>Total Students</CardTitle>
            <CardIcon><PeopleIcon /></CardIcon>
          </CardHeader>
          <CardValue>1,234</CardValue>
          <CardContent>Active students enrolled this semester</CardContent>
          <CardFooter>
            <CardStat positive theme={theme}>
              <span>↑ 12%</span>
              <span>vs last month</span>
            </CardStat>
          </CardFooter>
        </DashboardCard>

        <DashboardCard theme={theme}>
          <CardHeader>
            <CardTitle>Attendance Rate</CardTitle>
            <CardIcon><AssessmentIcon /></CardIcon>
          </CardHeader>
          <CardValue>94.5%</CardValue>
          <CardContent>Average attendance across all classes</CardContent>
          <CardFooter>
            <CardStat positive theme={theme}>
              <span>↑ 2.3%</span>
              <span>vs last week</span>
            </CardStat>
          </CardFooter>
        </DashboardCard>

        <DashboardCard theme={theme}>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardIcon><EventIcon /></CardIcon>
          </CardHeader>
          <CardValue>8</CardValue>
          <CardContent>Events scheduled for this week</CardContent>
          <CardFooter>
            <CardStat theme={theme}>
              <span>3 new</span>
              <span>this week</span>
            </CardStat>
          </CardFooter>
        </DashboardCard>

        <DashboardCard theme={theme}>
          <CardHeader>
            <CardTitle>Teacher Ratio</CardTitle>
            <CardIcon><SchoolIcon /></CardIcon>
          </CardHeader>
          <CardValue>1:15</CardValue>
          <CardContent>Average student to teacher ratio</CardContent>
          <CardFooter>
            <CardStat theme={theme}>
              <span>Optimal</span>
              <span>range</span>
            </CardStat>
          </CardFooter>
        </DashboardCard>
      </DashboardGrid>
    </ContentArea>
  );
};

const MacWindowControls = styled.div`
  display: flex;
  gap: 8px;
  height: 100%;
  align-items: center;
  -webkit-app-region: no-drag;
  margin-left: 12px;
  padding: 0 4px;
  
  @media (max-width: 700px) {
    display: none;
  }
`;

const MacButton = styled.button<{ color: string }>`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: ${({ color }) => color};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s ease;
  opacity: 0.8;
  
  &:hover {
    opacity: 1;
  }
  
  &:active {
    opacity: 0.7;
  }

  svg {
    width: 10px;
    height: 10px;
    color: #000;
    opacity: 0;
    transition: opacity 0.2s ease;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  &:hover svg {
    opacity: 0.8;
  }
`;

const ProfileDropdown = styled.div`
  position: absolute;
  right: 0;
  top: 110%;
  background: ${({ theme }) => theme.CARD};
  border: 1.5px solid ${({ theme }) => theme.BORDER};
  border-radius: 14px;
  box-shadow: 0 8px 32px 0 #0003, 0 1.5px 6px #0005;
  min-width: 210px;
  z-index: 3000;
  padding: 14px 0 8px 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;
const ProfileDropdownItem = styled.button`
  width: 100%;
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.05rem;
  font-weight: 500;
  padding: 10px 22px;
  text-align: left;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  &:hover {
    background: ${({ theme }) => theme.HOVER_BG};
    color: ${({ theme }) => theme.ACCENT};
  }
`;
const ProfileDropdownHeader = styled.div`
  padding: 0 22px 8px 22px;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.98rem;
  font-weight: 600;
  border-bottom: 1.5px solid ${({ theme }) => theme.BORDER};
  margin-bottom: 6px;
`;

const ToggleSwitch = styled.div`
  position: relative;
  width: 36px;
  height: 18px;
  background: ${({ theme }) => theme.TEXT_SECONDARY}40;
  border-radius: 12px;
  padding: 2px;
  transition: all 0.3s;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;

  &[data-checked="true"] {
    background: ${({ theme }) => theme.ACCENT};
  }

  &::after {
    content: '';
    position: absolute;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    left: 2px;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &[data-checked="true"]::after {
    transform: translateX(18px);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.35);
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
`;
const ModalBox = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  padding: 2.2rem 2rem 1.7rem 2rem;
  min-width: 320px;
  max-width: 95vw;
  width: 100%;
  max-width: 400px;
  position: relative;
  border: 1.5px solid ${({ theme }) => theme.BORDER};
`;
const ModalTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin-bottom: 1.1rem;
`;
const ModalClose = styled.button`
  position: absolute;
  top: 0.7rem;
  right: 0.7rem;
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1.5rem;
  cursor: pointer;
`;
const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  justify-content: flex-end;
`;
const ModalButton = styled.button`
  padding: 0.5rem 1.2rem;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  background: ${({ color, theme }) => color || theme.ACCENT};
  color: #fff;
  transition: background 0.18s;
  &:hover {
    background: ${({ color, theme }) => color ? color + 'cc' : theme.ACCENT + 'cc'};
  }
`;
const ModalLabel = styled.label`
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 600;
  margin-bottom: 0.1rem;
`;
const ModalInputGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 10px;
  padding: 0 12px;
  margin-bottom: 1rem;
  transition: border 0.18s;
  &:focus-within { border-color: ${({ theme }) => theme.ACCENT_INPUT}; }
`;
const ModalInput = styled.input`
  border: none;
  background: none;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.08rem;
  padding: 13px 0;
  width: 100%;
  &:focus { outline: none; }
`;
const ModalError = styled.div`
  color: #ef4444;
  font-size: 1rem;
  text-align: center;
  margin-top: 4px;
  background: ${({ theme }) => theme.CARD};
  border-radius: 8px;
  padding: 7px 0 5px 0;
`;
const ModalSuccess = styled.div`
  color: #22c55e;
  font-size: 1rem;
  text-align: center;
  margin-top: 4px;
  background: ${({ theme }) => theme.CARD};
  border-radius: 8px;
  padding: 7px 0 5px 0;
`;

const NetworkAlert = styled.div`
  position: fixed;
  top: 54px;
  left: 0;
  right: 0;
  background: #ef4444;
  color: white;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 500;
  z-index: 2000;
  animation: slideDown 0.3s ease-out;
  
  @keyframes slideDown {
    from { transform: translateY(-100%); }
    to { transform: translateY(0); }
  }
`;

const NetworkModal = styled(ModalOverlay)`
  background: rgba(0, 0, 0, 0.75);
  z-index: 9999 !important;
`;

const NetworkModalContent = styled(ModalBox)`
  text-align: center;
  padding: 2rem;
`;

const NetworkIcon = styled.div`
  font-size: 3rem;
  color: #ef4444;
  margin-bottom: 1rem;
`;

const NetworkTitle = styled.h2`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.5rem;
  margin-bottom: 1rem;
`;

const NetworkMessage = styled.p`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-bottom: 2rem;
  line-height: 1.5;
`;

const NetworkActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
`;

const NetworkButton = styled(ModalButton)<{ variant?: 'primary' | 'danger' }>`
  min-width: 120px;
  background: ${({ variant }) => variant === 'danger' ? '#ef4444' : '#4a6cf7'};
  &:hover {
    background: ${({ variant }) => variant === 'danger' ? '#dc2626' : '#3a5ce5'};
  }
`;

const WeakConnectionIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: #f59e0b;
  color: white;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  flex-shrink: 0;

  @media (max-width: 700px) {
    padding: 4px 8px;
    margin-right: 0;
    
    svg {
      width: 18px;
      height: 18px;
    }
  }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
  }
`;

const PageLoader = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${props => props.theme.BG};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 5000;
  gap: 20px;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid ${props => props.theme.BORDER};
  border-top: 3px solid ${props => props.theme.ACCENT};
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.div`
  color: ${props => props.theme.TEXT_PRIMARY};
  font-size: 1.1rem;
  font-weight: 500;
`;

// Move checkConnection outside of useEffect
const checkConnection: (
  setIsOnline: React.Dispatch<React.SetStateAction<boolean>>,
  setIsWeakConnection: React.Dispatch<React.SetStateAction<boolean>>,
  setIsCheckingConnection: React.Dispatch<React.SetStateAction<boolean>>
) => Promise<void> = async (
  setIsOnline,
  setIsWeakConnection,
  setIsCheckingConnection
) => {
  try {
    setIsCheckingConnection(true);
    const startTime = performance.now();
    const controller = new AbortController();
    
    // Increase timeout to 60 seconds for very slow connections
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    // Only mark as weak connection if it's really slow (>20 seconds)
    setIsWeakConnection(responseTime > 20000);
    
    // Always mark as online if we get any response (even slow)
    setIsOnline(true);
  } catch (error) {
    // Only mark as offline if it's a network error, not a timeout
    if (error instanceof Error && error.name === 'AbortError') {
      // Timeout occurred - this might be a very slow connection, not necessarily offline
      // Always assume online for timeouts on slow connections
      if (navigator.onLine) {
        setIsOnline(true);
        setIsWeakConnection(true); // Mark as weak but not offline
      } else {
        // Only mark as offline if navigator.onLine is false
        setIsOnline(false);
        setIsWeakConnection(false);
      }
    } else {
      // Real network error - definitely offline
      setIsOnline(false);
      setIsWeakConnection(false);
    }
  } finally {
    setIsCheckingConnection(false);
  }
};

const OfflineContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
  text-align: center;
  gap: 16px;
  color: ${props => props.theme.TEXT_SECONDARY};

  h1 {
    color: ${props => props.theme.TEXT_PRIMARY};
    margin: 0;
  }
`;

const ActionButton = styled.button`
  background-color: ${props => props.theme.ACCENT};
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #3a5cc7;
  }

  &:disabled {
    background-color: #555;
    cursor: not-allowed;
  }
`;

// Remove forced always-on progress bar and update ProgressBarContainer
const ProgressBarOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 2px;
  pointer-events: none;
  z-index: 100000;
`;

const ProgressBar = styled.div<{
  progress: number;
  isVisible: boolean;
  isIndeterminate?: boolean;
  disableTransition?: boolean;
}>`
  height: 100%;
  background: linear-gradient(90deg, #4a6cf7, #6366f1, #8b5cf6);
  opacity: ${({ isVisible }) => isVisible ? 1 : 0};
  transition: opacity 0.3s ease-out;
  box-shadow: 0 2px 16px 0 rgba(74, 108, 247, 0.2);
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  ${({ isIndeterminate, progress, disableTransition }) =>
    isIndeterminate
      ? `
        width: 100%;
        animation: shimmer 1.5s infinite linear;
      `
      : `
        width: ${progress}%;
        transition: ${disableTransition ? 'none' : 'opacity 0.3s ease-out, width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'};
      `}

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

// Add progress context for managing progress state
interface ProgressContextType {
  startProgress: (indeterminate?: boolean) => void;
  setProgress: (progress: number) => void;
  completeProgress: () => void;
  resetProgress: () => void;
}

const ProgressContext = createContext<ProgressContextType>({
  startProgress: () => {},
  setProgress: () => {},
  completeProgress: () => {},
  resetProgress: () => {},
});

export const useProgress = () => useContext(ProgressContext);

// Progress provider component
const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [progress, setProgressState] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isIndeterminate, setIsIndeterminate] = useState(false);
  const [disableTransition, setDisableTransition] = useState(false);
  const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);

  const startProgress = useCallback((indeterminate = false) => {
    // Prevent multiple simultaneous starts
    if (isActiveRef.current) {
      return;
    }
    
    // Clear any existing timeout
    if (progressTimeoutRef.current) {
      clearTimeout(progressTimeoutRef.current);
      progressTimeoutRef.current = null;
    }
    
    // Temporarily disable transition to prevent showing previous progress
    setDisableTransition(true);
    
    // Reset progress to 0 immediately without transition
    setProgressState(0);
    
    isActiveRef.current = true;
    setIsVisible(true);
    setIsIndeterminate(indeterminate);
    
    // Re-enable transition after a brief delay
    setTimeout(() => {
      setDisableTransition(false);
    }, 50);
  }, []);

  const setProgress = useCallback((newProgress: number) => {
    if (isIndeterminate || !isActiveRef.current) return;
    
    // Ensure progress only goes forward
    setProgressState(prev => {
      const clampedProgress = Math.min(100, Math.max(0, newProgress));
      return Math.max(prev, clampedProgress);
    });
  }, [isIndeterminate]);

  const completeProgress = useCallback(() => {
    if (!isActiveRef.current) {
      return;
    }
    
    setProgressState(100);
    setIsIndeterminate(false);
    
    // Hide progress bar after completion
    if (progressTimeoutRef.current) {
      clearTimeout(progressTimeoutRef.current);
    }
    
    progressTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      isActiveRef.current = false;
      // Keep progress at 100% until hidden to prevent back-and-forth
    }, 300); // Slightly longer timeout for smoother transition
  }, []);

  const resetProgress = useCallback(() => {
    isActiveRef.current = false;
    setIsVisible(false);
    setProgressState(0);
    setIsIndeterminate(false);
    setDisableTransition(false);
    if (progressTimeoutRef.current) {
      clearTimeout(progressTimeoutRef.current);
      progressTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ProgressContext.Provider value={{ startProgress, setProgress, completeProgress, resetProgress }}>
      {children}
      <ProgressBarOverlay>
        <ProgressBar
          progress={progress}
          isVisible={isVisible}
          isIndeterminate={isIndeterminate}
          disableTransition={disableTransition}
        />
      </ProgressBarOverlay>
    </ProgressContext.Provider>
  );
};

const Layout: React.FC = () => {
  const location = useLocation();
  const [tooltipOpen, setTooltipOpen] = useState<number | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });
  const [userTheme, setUserTheme] = useState<boolean>(() => {
    const stored = localStorage.getItem('theme');
    return stored === 'light' || stored === 'dark';
  });
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 700);
  const [sidebarTooltip, setSidebarTooltip] = useState<{text: string, top: number, left: number} | null>(null);
  const userHasInteracted = useRef(false);
  const [muted, setMuted] = useState(() => {
    const stored = localStorage.getItem('muted');
    return stored === 'true';
  });
  const user = getUser();
  const { user: authUser } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [aboutUsModalOpen, setAboutUsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const toast = useToast();
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const profileIconRef = useRef<HTMLButtonElement>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [isWeakConnection, setIsWeakConnection] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isRouteChanging, setIsRouteChanging] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [instituteProfile, setInstituteProfile] = useState<{ short_name?: string; name?: string; logo_url?: string; tagline?: string } | null>(null);
  const [lastChecked, setLastChecked] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageHeader, setPageHeader] = useState('');
  const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  
  // Update checking state
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateService] = useState(() => UpdateService.getInstance());

  // Mobile navigation state
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  // Use navigation context instead of local state
  const { navHistory, forwardHistory, handleGoBack, handleGoForward } = useNavigation();
  const isNavigatingViaButtonsRef = useRef(false);
  const lastBackPressRef = useRef<number>(0);

  // Get progress functions
  const { startProgress, setProgress, completeProgress, resetProgress } = useProgress();

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.isMaximized().then(setIsMaximized);
      window.electronAPI.onMaximize(() => setIsMaximized(true));
      window.electronAPI.onUnmaximize(() => setIsMaximized(false));
    }
  }, []);

  // Fetch institute profile
  useEffect(() => {
    const fetchInstituteProfile = async () => {
      if (!authUser?.school_id) {
        return;
      }
      
      try {
        // Remove progress bar calls to avoid interfering with page-specific progress
        const { data, error } = await supabase
          .from('institute_profile')
          .select('*')
          .eq('school_id', authUser.school_id)
          .single();
        
        if (!error && data && (data.short_name || data.logo_url)) {
          setInstituteProfile(data);
        } else {
          // Fallback: try to get logo from schools table
          try {
            const { data: schoolData, error: schoolError } = await supabase
              .from('schools')
              .select('name, logo_url')
              .eq('id', authUser.school_id)
              .single();
            
            if (!schoolError && schoolData) {
              setInstituteProfile({
                short_name: schoolData.name,
                logo_url: schoolData.logo_url,
                tagline: schoolData.name
              });
            } else {
              setInstituteProfile(null);
            }
          } catch (fallbackError) {
            console.error('Error fetching school data:', fallbackError);
            setInstituteProfile(null);
          }
        }
        // Remove completeProgress call
      } catch (error) {
        console.error('Error fetching institute profile:', error);
        setInstituteProfile(null);
        // Remove completeProgress call
      }
    };

    fetchInstituteProfile();
  }, [authUser?.school_id]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      setUserTheme(true);
      return next;
    });
  };

  const toggleMute = () => {
    setMuted(m => {
      localStorage.setItem('muted', String(!m));
      return !m;
    });
  };

  const handleLogout = () => {
    removeUser();
    navigate('/login');
  };

  // Close sidebar on overlay click or route change
  React.useEffect(() => {
    setTooltipOpen(null);
  }, [location.pathname]);

  React.useEffect(() => {
    const unlock = () => {
      userHasInteracted.current = true;
      window.removeEventListener('mousedown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('mousedown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
    return () => {
      window.removeEventListener('mousedown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  // Helper to play hover sound
  const playHoverSound = () => {
    if (!userHasInteracted.current || muted) return;
    const audio = new window.Audio('/hover.mp3?v=' + Date.now());
    audio.volume = 1.0;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  const muiTheme = React.useMemo(() => createTheme({
    palette: {
      mode: theme,
      primary: { main: '#4a6cf7' },
      secondary: { main: '#ef4444' },
      background: {
        default: theme === 'dark' ? darkTheme.BG : lightTheme.BG,
        paper: theme === 'dark' ? darkTheme.CARD : lightTheme.CARD,
      },
    },
  }), [theme]);

  useGlobalClickSound();

  // Listen for device theme changes in real time
  React.useEffect(() => {
    if (userTheme) return; // Don't override user choice
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, [userTheme]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 700);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mobile back button handling (Capacitor / WebView)
  useEffect(() => {
    const handleBackPress = () => {
      // Close sidebar first if open
      if (sidebarOpen) { 
        setSidebarOpen(false); 
        return; 
      }

      // Navigate back in app history if available
      if (location.pathname !== '/dashboard') {
        handleGoBack();
        return;
      }

      // Show exit confirmation dialog
      setShowExitConfirm(true);
    };

    let removeCapListener: (() => void) | null = null;
    
    // Try to set up Capacitor listener
    const setupCapacitorListener = async () => {
      try {
        if (CapacitorApp) {
          const listener = await CapacitorApp.addListener('backButton', handleBackPress);
          removeCapListener = () => {
            listener.remove();
          };
        }
      } catch (error) {
        console.log('Capacitor not available or error setting up listener:', error);
      }
    };

    // Set up listener
    setupCapacitorListener();

    // Fallback for non-Capacitor contexts (web/Cordova)
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      handleBackPress();
      
      // Push the current state back to prevent navigation
      window.history.pushState(null, '', window.location.pathname);
    };

    // Handle beforeunload to prevent accidental exits
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (showExitConfirm) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    // Push initial state to enable back button handling
    window.history.pushState(null, '', window.location.pathname);

    // Add event listeners
    window.addEventListener('popstate', handlePopState, true);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      removeCapListener?.();
      window.removeEventListener('popstate', handlePopState, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sidebarOpen, navHistory, navigate, showExitConfirm]);

  // Navigation functions are now provided by NavigationContext

  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt + Left Arrow for back
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        handleGoBack();
      }
      // Alt + Right Arrow for forward
      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault();
        handleGoForward();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGoBack, handleGoForward]);

  // Swipe to open/close sidebar (mobile)
  useEffect(() => {
    if (!isMobile) return;

    const handleTouchStart = (e: TouchEvent) => {
      setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
      if (!touchStart || !touchEnd) return;
      
      const dx = touchEnd - touchStart;
      const isRightSwipe = dx > 50;    // left -> right
      const isLeftSwipe = dx < -50;    // right -> left

      // Open: left-to-right swipe starting near the left edge when closed
      if (!sidebarOpen && isRightSwipe && touchStart < 50) {
        setSidebarOpen(true);
      } else if (sidebarOpen && isLeftSwipe) {
        // Close: right-to-left swipe when open
        setSidebarOpen(false);
      }

      setTouchStart(null);
      setTouchEnd(null);
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchStart, touchEnd, sidebarOpen, isMobile]);

  // Reset modal state when opening/closing
  const openChangePasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setModalLoading(false);
    setShowChangePassword(true);
  };
  const closeChangePasswordModal = () => {
    setShowChangePassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setModalLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.showToast('All fields are required.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.showToast('New passwords do not match.', 'error');
      return;
    }
    setModalLoading(true);
    startProgress(true); // Start indeterminate progress for password change
    
    try {
      // Check current password
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .eq('password', currentPassword)
        .single();

      if (error || !data) {
        toast.showToast('Current password is incorrect.', 'error');
        completeProgress();
        return;
      }

      // Update password
      const { error: updateError } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', user.id);

      if (updateError) {
        console.error('Password update error:', updateError);
        toast.showToast('Failed to update password.', 'error');
        completeProgress();
        return;
      }

      toast.showToast('Password updated successfully!', 'success');
      completeProgress();
      setTimeout(() => {
        closeChangePasswordModal();
      }, 600); // Delay to allow toast to show
    } catch (err) {
      console.error('Password change error:', err);
      toast.showToast('Something went wrong.', 'error');
      completeProgress();
    } finally {
      setModalLoading(false);
    }
  };

  // Click-away logic for profile dropdown
  useEffect(() => {
    if (!profileMenuOpen) return;
    function handleClick(e: MouseEvent) {
      const dropdown = profileDropdownRef.current;
      const icon = profileIconRef.current;
      if (
        dropdown && !dropdown.contains(e.target as Node) &&
        icon && !icon.contains(e.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileMenuOpen]);

  // Filter menu items based on user role
  const filteredMenuItems = React.useMemo(() => {
    if (!user) return [];
    return menuItems.filter(item => {
    if (!user || !user.role || !item.allowedRoles) return false;
    // For teachers, show Welcome Page, Attendance, and Reports
    if (user.role === 'Teacher') {
      return item.text === 'Attendance' || item.text === 'Welcome Page' || item.text === 'Reports';
    }
    return item.allowedRoles.includes(user.role);
  });
  }, [user]);

  const handleRefresh = () => {
    startProgress(true); // Start indeterminate progress for page refresh
    window.location.reload();
  };

  // Update checking functions
  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      const result = await updateService.checkForUpdates();
      if (result.updateAvailable && result.release) {
        const shouldDownload = confirm(
          `Update ${result.release.tag_name} is available!\n\n${result.release.body || 'Bug fixes and improvements'}\n\nWould you like to download it now?`
        );
        if (shouldDownload) {
          await updateService.downloadUpdate(result.release, (progress) => {
            // Progress will be handled by the UpdateNotification component
            console.log(`Download progress: ${progress}%`);
          });
        }
      } else {
        toast.showToast('You are using the latest version!', 'success');
      }
    } catch (error) {
      console.error('Update check failed:', error);
      toast.showToast('Failed to check for updates. Please try again later.', 'error');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // Check for updates on app startup
  useEffect(() => {
    const checkForUpdatesOnStartup = async () => {
      try {
        const result = await updateService.checkForUpdates();
        if (result.updateAvailable) {
          // Update notification will be shown by the UpdateNotification component
          console.log('Update available:', result.release?.tag_name);
        }
      } catch (error) {
        console.error('Startup update check failed:', error);
        // Don't show error to user on startup
      }
    };

    // Check for updates 2 seconds after app loads
    const timer = setTimeout(checkForUpdatesOnStartup, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Function to check actual internet connectivity
  useEffect(() => {
    let isMounted = true;

    const wrappedCheckConnection = async () => {
      if (!isMounted) return;
      
      await checkConnection(
        (online) => {
          setIsOnline(online);
          if (online) {
            setIsPageLoading(false);
          }
        },
        setIsWeakConnection,
        setIsCheckingConnection
      );
    };

    wrappedCheckConnection();
    const intervalId = setInterval(() => {
      if (isMounted) wrappedCheckConnection();
    }, 60000); // Check every 60 seconds instead of 30 seconds
    const handleOnline = () => { if (isMounted) wrappedCheckConnection(); };
    const handleOffline = () => { if (isMounted) setIsOnline(false); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    // Don't start progress for retry - just check connection
    await checkConnection(setIsOnline, setIsWeakConnection, setIsCheckingConnection);
    setLastChecked(new Date());
    // Don't complete progress since we didn't start it
  };

  const handleExit = () => {
    if (window.electronAPI) {
      window.electronAPI.close();
    } else {
      window.close();
    }
  };

  useEffect(() => {
    if (isOnline && isPageLoading) {
      setIsPageLoading(false);
    }
  }, [isOnline, isPageLoading]);

  // Show loading overlay for 500ms after route change
  useEffect(() => {
    setIsRouteChanging(true);
    // Remove progress calls to avoid interfering with page-specific progress bars
    
    const timer = setTimeout(() => {
      setIsRouteChanging(false);
      // Remove completeProgress call
    }, 300); // Reduced from 500ms to 300ms
    
    return () => {
      clearTimeout(timer);
      // Remove completeProgress call
    };
  }, [location.pathname]);

  // Add this effect after the other useEffects
  useEffect(() => {
    // On every route change, check connectivity before showing content
    setIsPageLoading(true);
    // Remove progress calls to avoid interfering with page-specific progress bars
    
    checkConnection(
      (online) => {
        setIsOnline(online);
        if (online) {
          setIsPageLoading(false);
          // Remove completeProgress call
        } else {
          // Remove completeProgress call
        }
      },
      setIsWeakConnection,
      setIsCheckingConnection
    );
  }, [location.pathname]);

  useEffect(() => {
    async function fetchStaffProfile() {
      if (user?.id) {
        try {
          // 1. Fetch user from users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('staff_id')
            .eq('id', user.id)
            .single();
          if (!userError && userData?.staff_id) {
            setStaffId(userData.staff_id);
            // 2. Fetch staff from staff table
            const { data: staffData, error: staffError } = await supabase
              .from('staff')
              .select('name, picture_url')
              .eq('id', userData.staff_id)
              .single();
            if (!staffError && staffData) {
              setStaffName(staffData.name || null);
              setAvatarUrl(staffData.picture_url || null);
            } else {
              setStaffName(null);
              setAvatarUrl(null);
            }
          } else {
            setStaffId(null);
            setStaffName(null);
            setAvatarUrl(null);
          }
        } catch (error) {
          console.error('Error fetching staff profile:', error);
          setStaffId(null);
          setStaffName(null);
          setAvatarUrl(null);
        }
      }
    }
    fetchStaffProfile();
  }, [user?.id]);

  const checkActive = (item: any) => {
    // For the root path, we want an exact match.
    if (item.path === '/') {
      return location.pathname === '/';
    }

    // For other paths, we can check if the current URL starts with the item's path.
    // This makes parent items active for their child routes (e.g., 'Students' for 'Add Student').
    if (item.path && location.pathname.startsWith(item.path)) {
      return true;
    }

    // Also check if any of the submenu items are active (for items that don't have a top-level path).
    if (item.submenu) {
      return item.submenu.some((subItem: any) => location.pathname === subItem.path);
    }

    return false;
  };

  // Custom header text for each route (supports dynamic patterns like '/students/:id')
  const customHeaderTexts: Record<string, string> = {
    '/': 'Dashboard',
    '/students': 'All Students',
    '/students/add': 'Add Student',
    '/bulk-student-admission': 'Bulk Student Admission',
    '/students/status': 'Student Status Management',
    '/students/:id': 'Student Profile',
    '/students/profile/:id': 'Student Profile',
    '/bulk-promote-demote': 'Promotion/Demotion',
    '/family-management': 'Family Management',
    '/no-classes': 'No Classes Found',
    '/no-sections': 'No Sections Found',
    '/no-sessions': 'No Sessions Found',
    '/no-students': 'No Students Found',
    '/attendance': 'Mark Attendance',
    '/attendance/report': 'Attendance Report',
    '/reports': 'Reports',
    '/fines/assign': 'Assign Fine',
    '/fines/collect': 'Collect Fine',
    '/fines/remaining': 'Remaining Fine',
    '/fines/statistics': 'Fine Statistics',
    '/fee-management': 'Fee Dashboard',
    '/fee-structure-management': 'Fee Structure',
    '/load-fee': 'Load Fee',
    '/timetable': 'Timetable',
    '/employees': 'All Employees',
    '/employees/add': 'Add Employee',
    '/employees/edit/:id': 'Edit Employee',
    '/teacher-subjects': 'Teacher Subject Assignment',
    '/subjects': 'Manage Subjects',
    '/settings': 'Settings',
    '/settings/institute-profile': 'Institute Profile',
    '/settings/classes': 'Classes',
    '/settings/sessions': 'Sessions',
    '/settings/holidays': 'Holidays',
    '/settings/user-management': 'User Management',
    '/schools': 'Schools Management',
    // Add more as needed
  };

  // Helper to match dynamic route patterns like '/students/:id' to '/students/123'
  function matchRoutePattern(pattern: string, pathname: string): boolean {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = pathname.split('/').filter(Boolean);
    if (patternParts.length !== pathParts.length) return false;
    return patternParts.every((part, i) => part.startsWith(':') || part === pathParts[i]);
  }

  // State for current time (for dashboard header)
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minutesStr = minutes < 10 ? '0' + minutes : minutes;
      setCurrentTime(`${hours}:${minutesStr} ${ampm}`);
    }, 1000 * 10); // update every 10 seconds for smoothness
    return () => clearInterval(interval);
  }, []);

  const getPageHeaderText = (pathname: string) => {
    if (pathname === '/') return currentTime;
    if (customHeaderTexts[pathname]) return customHeaderTexts[pathname];
    const dynamicMatch = Object.keys(customHeaderTexts).find(pattern => matchRoutePattern(pattern, pathname));
    if (dynamicMatch) return customHeaderTexts[dynamicMatch];
    // Parent match, but skip '/' key
    const parentMatch = Object.keys(customHeaderTexts)
      .filter(key => key !== '/')
      .find(key => pathname.startsWith(key));
    if (parentMatch) return customHeaderTexts[parentMatch];
    // Fallback: use pageHeader from context
    return pageHeader || '';
  };

  // Reset pageHeader on route change
  useEffect(() => { setPageHeader(''); }, [location.pathname]);

  // Check if title is overflowing on mobile
  useEffect(() => {
    if (!isMobile || !titleRef.current) return;
    
    const checkOverflow = () => {
      if (titleRef.current) {
        const isOverflowing = titleRef.current.scrollWidth > titleRef.current.clientWidth;
        setIsTitleOverflowing(isOverflowing);
      }
    };
    
    // Check immediately with a small delay to ensure DOM is ready
    setTimeout(checkOverflow, 100);
    
    // Check on resize
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [isMobile, location.pathname]);

  return (
    <PageHeaderContext.Provider value={{ setPageHeader }}>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <MuteContext.Provider value={{ muted, toggleMute }}>
          <MuiThemeProvider theme={muiTheme}>
            <CssBaseline />
            <ProgressProvider>
              <NotificationProvider>
          <ThemeProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
                {/* Show network error modal only if truly offline (not just slow connection) */}
                {!isOnline && !isWeakConnection && (
                  <NetworkModal>
                    <NetworkModalContent>
                      <NetworkIcon>
                        <WifiOffIcon style={{ fontSize: 'inherit' }} />
                      </NetworkIcon>
                      <NetworkTitle>No Internet Connection</NetworkTitle>
                      <NetworkMessage>
                        Please check your internet connection and try again.
                        The application requires an internet connection to function properly.
                      </NetworkMessage>
                      <NetworkActions>
                        <NetworkButton 
                          onClick={handleRetry}
                          disabled={isCheckingConnection}
                        >
                          {isCheckingConnection ? 'Checking...' : 'Retry'}
                        </NetworkButton>
                        <NetworkButton variant="danger" onClick={handleExit}>
                          Exit
                        </NetworkButton>
                      </NetworkActions>
                    </NetworkModalContent>
                  </NetworkModal>
                )}
            <GlobalStyle />
            <AppContainer>
              <LayoutWrapper>
                {/* Sidebar always rendered on desktop, toggled on mobile - Hidden for teachers */}
                {user?.role !== 'Teacher' && (
                  <CollapsibleSidebar
                    navigate={navigate}
                    theme={theme === 'dark' ? darkTheme : lightTheme}
                    userRole={user?.role}
                    instituteProfile={instituteProfile ?? undefined}
                    open={isMobile ? sidebarOpen : true}
                    onClose={() => setSidebarOpen(false)}
                    onAboutUsClick={() => setAboutUsModalOpen(true)}
                  />
                )}
                <MainArea $isTeacher={user?.role === 'Teacher'}>
                  <Header>
                    <HeaderLeft>
                      {user?.role === 'Teacher' ? (
                        <MenuButton
                          onClick={() => navigate('/teacher')}
                          aria-label="Go to Dashboard"
                          title="Dashboard"
                        >
                          <DashboardIcon />
                        </MenuButton>
                      ) : (
                        <MenuButton
                          onClick={() => setSidebarOpen((v) => !v)}
                          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
                        >
                          <MenuIcon />
                        </MenuButton>
                      )}
                      <NavigationButtonsContainer>
                        <HeaderIconCircle 
                          as="button" 
                          onClick={handleGoBack} 
                          title={location.pathname === '/dashboard' ? "Home page" : `Go back (Alt+Left) - ${navHistory.length - 1} pages`}
                          aria-label={location.pathname === '/dashboard' ? "Home page" : "Go back"}
                          disabled={location.pathname === '/dashboard'}
                          style={{ 
                            opacity: location.pathname === '/dashboard' ? 0.4 : 1,
                            cursor: location.pathname === '/dashboard' ? 'not-allowed' : 'pointer',
                            transition: 'opacity 0.2s ease'
                          }}
                        >
                          <span style={{ display: 'inline-block', transform: 'translateX(-1px)' }}>‹</span>
                        </HeaderIconCircle>
                        <HeaderIconCircle 
                          as="button" 
                          onClick={handleGoForward} 
                          title={forwardHistory.length > 0 ? `Go forward (Alt+Right) - ${forwardHistory.length} pages` : "No forward history"}
                          aria-label="Go forward"
                          disabled={forwardHistory.length === 0}
                          style={{ 
                            opacity: forwardHistory.length === 0 ? 0.4 : 1,
                            cursor: forwardHistory.length === 0 ? 'not-allowed' : 'pointer',
                            transition: 'opacity 0.2s ease'
                          }}
                        >
                          <span style={{ display: 'inline-block', transform: 'translateX(1px)' }}>›</span>
                        </HeaderIconCircle>
                      </NavigationButtonsContainer>
                      {/* Dashboard/Teacher special layout - show logo and short name on left */}
                      {(location.pathname === '/dashboard' || location.pathname === '/teacher') ? (
                        <>
                          {isMobile && instituteProfile?.logo_url && (
                            <InstituteLogo 
                              src={instituteProfile.logo_url} 
                              alt="School Logo"
                            />
                          )}
                          {instituteProfile?.short_name && (
                            <Logo>
                              <LogoContent>
                                <LogoName>
                                  {isMobile ? instituteProfile.short_name : instituteProfile.name || instituteProfile.short_name}
                                </LogoName>
                                {instituteProfile.tagline && (
                                  <LogoTagline>{instituteProfile.tagline}</LogoTagline>
                                )}
                              </LogoContent>
                            </Logo>
                          )}
                        </>
                      ) : (
                        <>
                          <PageTitle 
                            ref={titleRef}
                            isMobile={isMobile}
                            $isOverflowing={isTitleOverflowing}
                          >
                            {getPageHeaderText(location.pathname)}
                          </PageTitle>
                          {/* School logo - hidden on mobile for non-dashboard pages */}
                          {!isMobile && instituteProfile?.logo_url && (
                            <InstituteLogo 
                              src={instituteProfile.logo_url} 
                              alt="School Logo"
                            />
                          )}
                          {!isMobile && instituteProfile?.short_name && (
                            <Logo>
                              <LogoContent>
                                <LogoName>{instituteProfile.short_name}</LogoName>
                                {instituteProfile.tagline && (
                                  <LogoTagline>{instituteProfile.tagline}</LogoTagline>
                                )}
                              </LogoContent>
                            </Logo>
                          )}
                        </>
                      )}
                    </HeaderLeft>
                    <HeaderActions>
                      {isWeakConnection && (
                        <WeakConnectionIndicator title="Slow internet connection detected">
                          <WifiOffIcon style={{ color: '#fbbf24' }} />
                          {!isMobile && 'Slow Connection'}
                        </WeakConnectionIndicator>
                      )}
                      {user?.role !== 'Teacher' && <NotificationBell />}
                      <HeaderIconCircle 
                        as="button" 
                        onClick={handleRefresh} 
                        aria-label="Refresh page"
                      >
                        <RefreshIcon />
                      </HeaderIconCircle>
                      <div style={{ position: 'relative' }}>
                        <HeaderIconCircle 
                          as="button" 
                          ref={profileIconRef} 
                          onClick={() => setProfileMenuOpen(v => !v)} 
                          aria-label="Profile"
                        >
                          {avatarUrl ? (
                            <img 
                              src={avatarUrl} 
                              alt="avatar" 
                              style={{ 
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%', 
                                objectFit: 'cover',
                                padding: '2px'
                              }} 
                            />
                          ) : (
                            <UserIcon />
                          )}
                        </HeaderIconCircle>
                        {profileMenuOpen && (
                          <ProfileDropdown ref={profileDropdownRef}>
                            <ProfileDropdownHeader>
                              {staffName || user?.name} <span style={{ color: '#6366f1', fontWeight: 600, marginLeft: 4 }}>{user?.role}</span>
                            </ProfileDropdownHeader>
                            <ProfileDropdownItem onClick={toggleTheme}>
                              <span>Dark Mode</span>
                              <ToggleSwitch 
                                data-checked={theme === 'dark'} 
                              />
                            </ProfileDropdownItem>
                            <ProfileDropdownItem onClick={(e) => { e.stopPropagation(); openChangePasswordModal(); setProfileMenuOpen(false); }}>
                              Change Password
                            </ProfileDropdownItem>
                            <ProfileDropdownItem 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                handleCheckForUpdates(); 
                                setProfileMenuOpen(false); 
                              }}
                              disabled={isCheckingUpdate}
                              style={{ 
                                opacity: isCheckingUpdate ? 0.6 : 1,
                                cursor: isCheckingUpdate ? 'not-allowed' : 'pointer'
                              }}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <SystemUpdateIcon style={{ fontSize: '18px' }} />
                                {isCheckingUpdate ? 'Checking...' : 'Check for Updates'}
                              </span>
                            </ProfileDropdownItem>
                            {user?.role === 'Teacher' && (
                              <ProfileDropdownItem onClick={(e) => { e.stopPropagation(); setAboutUsModalOpen(true); setProfileMenuOpen(false); }}>
                                About Us
                              </ProfileDropdownItem>
                            )}
                            <ProfileDropdownItem onClick={(e) => { e.stopPropagation(); handleLogout(); }} style={{ color: '#ef4444', fontWeight: 600 }}>
                              Logout
                            </ProfileDropdownItem>
                          </ProfileDropdown>
                        )}
                      </div>
                    </HeaderActions>
                    {window.electronAPI && (
                      <MacWindowControls>
                        <MacButton
                          color="#febc2e"
                          onClick={() => window.electronAPI?.minimize()}
                          title="Minimize"
                        >
                          <Remove style={{ fontSize: '12px' }} />
                        </MacButton>
                        <MacButton
                          color="#28c840"
                          onClick={() => {
                            if (isMaximized) {
                              window.electronAPI?.unmaximize();
                            } else {
                              window.electronAPI?.maximize();
                            }
                          }}
                          title={isMaximized ? "Restore" : "Maximize"}
                        >
                          {isMaximized ? (
                            <CropSquare style={{ fontSize: '10px', transform: 'scale(0.8) translate(-60%, -60%)' }} />
                          ) : (
                            <CropSquare style={{ fontSize: '10px' }} />
                          )}
                        </MacButton>
                        <MacButton
                          color="#ff5f57"
                          onClick={() => {
                            window.electronAPI?.close();
                          }}
                          title="Close"
                        >
                          <Close style={{ fontSize: '12px' }} />
                        </MacButton>
                      </MacWindowControls>
                    )}
                  </Header>
                  <ContentArea>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                      >
                        {isOnline ? (
                    <Outlet />
                        ) : (
                          <OfflineContainer>
                            <WifiOffIcon style={{fontSize: 64, color: '#ff6b6b'}}/>
                            <h1>You are offline</h1>
                            <p>Please check your internet connection.</p>
                            <p>Last check: {lastChecked.toLocaleTimeString()}</p>
                            <ActionButton onClick={handleRetry} disabled={isCheckingConnection}>
                              {isCheckingConnection ? 'Retrying...' : 'Retry Now'}
                            </ActionButton>
                          </OfflineContainer>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </ContentArea>
                </MainArea>
              </LayoutWrapper>
            </AppContainer>

            {/* Change Password Modal */}
            {showChangePassword && (
              <ModalOverlay onClick={closeChangePasswordModal}>
                <ModalBox onClick={(e) => e.stopPropagation()}>
                  <ModalClose onClick={closeChangePasswordModal}>&times;</ModalClose>
                  <ModalTitle>Change Password</ModalTitle>
                  <form onSubmit={handlePasswordChange}>
                    <ModalLabel>Current Password</ModalLabel>
                    <ModalInputGroup>
                      <ModalInput
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        required
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowCurrent(!showCurrent)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '8px',
                          color: theme === 'dark' ? '#fff' : '#1e293b'
                        }}
                      >
                        {showCurrent ? <VisibilityOff /> : <Visibility />}
                      </button>
                    </ModalInputGroup>

                    <ModalLabel>New Password</ModalLabel>
                    <ModalInputGroup>
                      <ModalInput
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowNew(!showNew)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '8px',
                          color: theme === 'dark' ? '#fff' : '#1e293b'
                        }}
                      >
                        {showNew ? <VisibilityOff /> : <Visibility />}
                      </button>
                    </ModalInputGroup>

                    <ModalLabel>Confirm New Password</ModalLabel>
                    <ModalInputGroup>
                      <ModalInput
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowConfirm(!showConfirm)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '8px',
                          color: theme === 'dark' ? '#fff' : '#1e293b'
                        }}
                      >
                        {showConfirm ? <VisibilityOff /> : <Visibility />}
                      </button>
                    </ModalInputGroup>

                    <ModalActions>
                      <ModalButton type="button" onClick={closeChangePasswordModal} color="#6b7280">
                        Cancel
                      </ModalButton>
                      <ModalButton type="submit" disabled={modalLoading}>
                        {modalLoading ? 'Updating...' : 'Update Password'}
                      </ModalButton>
                    </ModalActions>
                  </form>
                </ModalBox>
              </ModalOverlay>
            )}

            {/* Exit Confirmation Modal */}
            {showExitConfirm && (
              <ModalOverlay onClick={() => setShowExitConfirm(false)}>
                <ModalBox onClick={(e) => e.stopPropagation()}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      margin: '0 auto 16px',
                      background: theme === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <ExitIcon style={{ fontSize: '32px', color: '#ef4444' }} />
                    </div>
                    <ModalTitle style={{ textAlign: 'center', marginBottom: '8px' }}>
                      Exit Application
                    </ModalTitle>
                    <p style={{
                      color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                      marginBottom: '24px',
                      textAlign: 'center'
                    }}>
                      Are you sure you want to exit the application?
                    </p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <ModalButton
                        onClick={() => setShowExitConfirm(false)}
                        color="#6b7280"
                        style={{ flex: 1 }}
                      >
                        Cancel
                      </ModalButton>
                      <ModalButton
                        onClick={() => {
                          setShowExitConfirm(false);
                          try { 
                            if (CapacitorApp) {
                              CapacitorApp.exitApp();
                            } else if (window.electronAPI) {
                              window.electronAPI.close();
                            } else {
                              window.close();
                            }
                          } catch { /* noop */ }
                        }}
                        color="#ef4444"
                        style={{ flex: 1 }}
                      >
                        Exit
                      </ModalButton>
                    </div>
                  </div>
                </ModalBox>
              </ModalOverlay>
            )}
          </ThemeProvider>
              </NotificationProvider>
            </ProgressProvider>
          </MuiThemeProvider>
        </MuteContext.Provider>
      </ThemeContext.Provider>
      
      {/* About Us Modal */}
      <AboutUsModal 
        isOpen={aboutUsModalOpen} 
        onClose={() => setAboutUsModalOpen(false)} 
      />
    </PageHeaderContext.Provider>
  );
};

export default Layout; 
export { ThemeContext, darkTheme, lightTheme, MuteContext }; 
export { ProgressProvider }; 