import React, { useState, createContext, useContext, useRef, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import styled, { ThemeProvider, createGlobalStyle, keyframes, css } from 'styled-components';
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
  Assignment,
  Search as SearchIcon,
  Person as PersonIcon,
  Snooze as SnoozeIcon,
  RemoveRedEye as EyeIcon,
} from '@mui/icons-material';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { useToast } from './useToast';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Autocomplete, TextField, Box, Typography } from '@mui/material';
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
import { isWeb as checkIsWeb } from '../utils/platformDetection';
import PresenceManager from './PresenceManager';
import AnnouncementHandler from './AnnouncementHandler';

// Capacitor import for mobile back button handling
let CapacitorApp: any = null;
try {
  CapacitorApp = require('@capacitor/app').App;
} catch (e) {
  // Capacitor not available, will use fallback
}

const normalizeIdList = (raw: any): number[] => {
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) {
    return raw
      .map(value => Number(value))
      .filter(value => Number.isFinite(value));
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    const withoutBraces = trimmed.replace(/[{}]/g, '');
    if (!withoutBraces) return [];
    return withoutBraces
      .split(',')
      .map(part => Number(part.trim()))
      .filter(value => Number.isFinite(value));
  }
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? [raw] : [];
  }
  return [];
};

// Theme context
type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => { },
});

// Mute context for global sound control
const MuteContext = createContext<{ muted: boolean; toggleMute: () => void }>({ muted: false, toggleMute: () => { } });

// Context for page header
export const PageHeaderContext = createContext<{ setPageHeader: (header: string) => void }>({ setPageHeader: () => { } });

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
    text: 'Daily Diary',
    icon: <Assignment />,
    path: '/homework-diary',
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
  font-size: ${({ isMobile }) => isMobile ? 'clamp(0.8rem, 3.5vw, 1.05rem)' : '1.12rem'};
  color: ${props => props.theme.TEXT_PRIMARY};
  margin: 0;
  padding: 0;
  min-width: 0;
  flex: ${({ isMobile }) => isMobile ? '2' : '1'};
  line-height: 1.2;
  transition: font-size 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

const StudentSearchWrapper = styled.div<{ $expanded: boolean }>`
  position: relative;
  width: ${props => props.$expanded ? '280px' : '36px'};
  height: 36px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  @media (max-width: 700px) {
    width: ${props => props.$expanded ? '200px' : '36px'};
  }
`;

const StudentSearchInput = styled.div<{ $expanded: boolean }>`
  position: absolute;
  width: 100%;
  height: 36px;
  display: flex;
  align-items: center;
  border-radius: ${props => props.$expanded ? '10px' : '50%'};
  background: ${props => props.theme.FIELD_BG || props.theme.CARD};
  border: 1.2px solid ${props => props.$expanded ? props.theme.FIELD_BORDER : props.theme.BORDER};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: visible;
  cursor: ${props => props.$expanded ? 'text' : 'pointer'};
  -webkit-app-region: no-drag;
  padding: ${props => props.$expanded ? '0 14px' : '0'};
  
  &:hover {
    border-color: ${props => props.theme.ACCENT};
    background: ${props => props.theme.HOVER_BG || props.theme.FIELD_BG || props.theme.CARD};
  }
  
  &:focus-within {
    border-color: ${props => props.theme.ACCENT};
  }
  
  .search-icon {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: ${props => props.theme.TEXT_SECONDARY};
    transition: all 0.3s ease;
    opacity: ${props => props.$expanded ? '0' : '1'};
    transform: ${props => props.$expanded ? 'scale(0)' : 'scale(1)'};
    pointer-events: ${props => props.$expanded ? 'none' : 'auto'};
    position: ${props => props.$expanded ? 'absolute' : 'relative'};
    left: ${props => props.$expanded ? '14px' : '0'};
    
    svg {
      width: 18px;
      height: 18px;
      color: #7c8597;
    }
  }
  
  .search-field {
    flex: 1;
    min-width: 0;
    opacity: ${props => props.$expanded ? '1' : '0'};
    pointer-events: ${props => props.$expanded ? 'auto' : 'none'};
    transition: opacity 0.2s ease 0.1s;
    position: relative;
    
    input {
      border: none;
      background: transparent;
      color: ${props => props.theme.TEXT_PRIMARY};
      font-size: 1rem;
      outline: none;
      width: 100%;
      padding: 0;
      margin-left: ${props => props.$expanded ? '10px' : '0'};
      
      &::placeholder {
        color: #7c8597;
      }
    }
  }
`;

const StudentSuggestionList = styled.ul<{ $visible: boolean }>`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: ${props => props.theme.CARD};
  border: 1.5px solid ${props => props.theme.BORDER};
  border-radius: 0 0 12px 12px;
  box-shadow: 0 8px 32px #0003, 0 1.5px 6px #232a3b22;
  z-index: 1000;
  margin: 0;
  padding: 0.1rem 0;
  list-style: none;
  max-height: 260px;
  overflow-y: auto;
  display: ${props => props.$visible ? 'block' : 'none'};
  scrollbar-width: thin;
  scrollbar-color: ${props => props.theme.ACCENT}40 ${props => props.theme.BG};
  
  &::-webkit-scrollbar {
    width: 10px;
    background: ${props => props.theme.BG};
  }
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.ACCENT}80;
    border-radius: 6px;
  }
  &::-webkit-scrollbar-track {
    background: ${props => props.theme.BG};
    border-radius: 6px;
  }
  
  @media (max-width: 700px) {
    left: -12px;
    right: -12px;
    min-width: calc(100% + 24px);
    width: calc(100% + 24px);
    border-radius: 12px;
    margin-top: 4px;
  }
`;

const StudentSuggestionItem = styled.li<{ $active: boolean }>`
  padding: 0.45rem 1.1rem 0.45rem 0.9rem;
  color: ${props => props.theme.TEXT_PRIMARY};
  background: ${props => props.$active ? props.theme.HOVER_BG : 'transparent'};
  cursor: pointer;
  font-size: 0.98rem;
  display: flex;
  align-items: center;
  border-left: 3.5px solid ${props => props.$active ? props.theme.ACCENT : 'transparent'};
  transition: background 0.16s, border-color 0.16s;
  
  &:hover {
    background: ${props => props.theme.HOVER_BG};
  }
  
  @media (max-width: 700px) {
    padding: 0.35rem 0.9rem 0.35rem 0.7rem;
    font-size: 0.85rem;
  }
`;

const StudentSuggestionItemRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  width: 100%;
`;

const StudentSuggestionMain = styled.div`
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
  
  @media (max-width: 700px) {
    gap: 0.5rem;
  }
`;

const StudentSuggestionTextCol = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const StudentSuggestionAvatar = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #232a3b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: #b0b8d1;
  overflow: hidden;
  border: 1.5px solid #353b4a;
  flex-shrink: 0;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  @media (max-width: 700px) {
    display: none;
  }
`;

const StudentSuggestionName = styled.span`
  font-weight: 700;
  color: ${props => props.theme.TEXT_PRIMARY};
  font-size: 0.99rem;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
  
  @media (max-width: 700px) {
    max-width: 220px;
    font-size: 0.85rem;
  }
`;

const StudentSuggestionFather = styled.span`
  color: #7c8597;
  font-size: 0.97rem;
  font-weight: 500;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
  
  @media (max-width: 700px) {
    max-width: 220px;
    font-size: 0.8rem;
  }
`;

const StudentSuggestionMetaCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 0;
  margin-left: 1.2rem;
`;

const StudentSuggestionClass = styled.span`
  color: ${props => props.theme.ACCENT};
  font-size: 0.91rem;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90px;
  
  @media (max-width: 700px) {
    max-width: 120px;
    font-size: 0.78rem;
  }
`;

const StudentSuggestionId = styled.span`
  color: #a0a7b8;
  font-size: 0.91rem;
  line-height: 1.1;
  white-space: nowrap;
  
  @media (max-width: 700px) {
    font-size: 0.78rem;
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
  @font-face {
    font-family: 'JameelNooriNastaleeq';
    src: url('/fonts/JameelNooriNastaleeq.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
  }

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

const Overlay = styled.div<{ open: boolean }>`
  display: ${({ open }) => open ? 'block' : 'none'};
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
const ProfileDropdownDivider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.BORDER};
  margin: 8px 0;
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

// Announcements modal (user pop-up messages)
const AnnouncementOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9500; /* Below update notification (9999) but above layout */
`;

const AnnouncementBox = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 18px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.35);
  border: 1px solid ${({ theme }) => theme.BORDER};
  max-width: 380px;
  width: min(380px, calc(100vw - 32px));
  max-height: 80vh;
  height: min(500px, 80vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const announcementQuillStyles = css`
  & h1, & h2, & h3, & h4, & h5, & h6 {
    margin: 8px 0 4px 0;
    font-weight: 600;
  }

  & p {
    margin: 6px 0;
  }

  & ul, & ol {
    margin: 6px 0 6px 1.2rem;
    padding-left: 1rem;
  }

  & li {
    margin: 2px 0;
  }

  & code {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'};
    padding: 2px 5px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.85em;
  }

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.18);
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.28);
  }

  .ql-editor {
    font-family: 'JameelNooriNastaleeq', 'Inter', 'Segoe UI', Arial, sans-serif;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }

  & strong, & b {
    font-weight: 600;
  }

  & em, & i {
    font-style: italic;
  }
`;

const AnnouncementHeader = styled.div`
  padding: 8px 16px 6px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
`;

const AnnouncementTitle = styled.div`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  width: 100%;
  flex: 1;
  ${announcementQuillStyles}
`;

const AnnouncementHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const AnnouncementIconButton = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
  &:hover {
    transform: translateY(-1px);
    background: ${({ theme }) => theme.BG};
  }
`;

const AnnouncementBody = styled.div`
  padding: 14px 18px;
  flex: 1;
  overflow-y: auto;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  line-height: 1.5;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'};
  min-height: 220px;
  max-height: 360px;
  ${announcementQuillStyles}

  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => `${theme.TEXT_SECONDARY}66 ${theme.BG}`};

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525' ? '#383d4a' : '#edf1f7'};
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.TEXT_SECONDARY}66;
    border-radius: 999px;
    border: 1px solid ${({ theme }) => theme.BG};
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.35);
  }
`;

const AnnouncementFooter = styled.div`
  padding: 10px 18px 12px 18px;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'};
  min-height: 44px;
  justify-content: center;
`;

const AnnouncementFooterRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
`;

const AnnouncementFooterHighlight = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  width: 100%;
  font-family: 'JameelNooriNastaleeq', 'Inter', 'Segoe UI', Arial, sans-serif;
  ${announcementQuillStyles}
`;

const AnnouncementActions = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px 18px;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.CARD};
`;

const AnnouncementActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 0.2s ease, background 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  ${({ theme, $variant }) => $variant === 'primary'
    ? css`
        background: ${theme.ACCENT};
        color: ${theme.BG};
        &:hover {
          transform: translateY(-1px);
          background: ${theme.ACCENT}cc;
        }
      `
    : css`
        background: ${theme.CARD};
        color: ${theme.TEXT_PRIMARY};
        border-color: ${theme.BORDER};
        &:hover {
          transform: translateY(-1px);
          background: ${theme.BG};
        }
      `}
`;

const SeenByOverlay = styled(AnnouncementOverlay)`
  z-index: 9600;
`;

const SeenByBox = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.35);
  border: 1px solid ${({ theme }) => theme.BORDER};
  width: min(420px, calc(100vw - 32px));
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const SeenByHeader = styled.div`
  padding: 14px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const SeenByTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const SeenByClose = styled(AnnouncementIconButton)`
  width: 32px;
  height: 32px;
`;

const SeenByList = styled.div`
  padding: 14px 18px;
  flex: 1;
  overflow-y: scroll;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 260px; /* about five viewer rows */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => `${theme.ACCENT} ${theme.BG}`};

  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG};
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.ACCENT};
    border-radius: 999px;
    border: 2px solid ${({ theme }) => theme.BG};
  }
`;

const SeenByItem = styled.div`
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'};
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SeenByName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
`;

const SeenByMeta = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`;

const SeenByEmpty = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  padding: 24px 12px;
  font-size: 0.9rem;
`;

const NetworkButton = styled(ModalButton) <{ variant?: 'primary' | 'danger' }>`
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
  startProgress: () => { },
  setProgress: () => { },
  completeProgress: () => { },
  resetProgress: () => { },
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
  const [sidebarTooltip, setSidebarTooltip] = useState<{ text: string, top: number, left: number } | null>(null);
  const userHasInteracted = useRef(false);
  const [muted, setMuted] = useState(() => {
    const stored = localStorage.getItem('muted');
    return stored === 'true';
  });
  const user = getUser();
  const { user: authUser, signOut } = useAuth();
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
  // Check if running on web (not Electron or Capacitor)
  // Hide navigation buttons on web - only show in Electron/Capacitor apps
  const isWeb = checkIsWeb();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [instituteProfile, setInstituteProfile] = useState<{ short_name?: string; name?: string; logo_url?: string; tagline?: string } | null>(null);
  const [studentInfo, setStudentInfo] = useState<{
    id: number;
    name: string;
    school_id: number;
    class_id?: number | null;
    section_id?: number | null;
  } | null>(null);
  const [parentInfo, setParentInfo] = useState<{
    id: number;
    name: string;
    school_id: number;
    contact_person?: string | null;
    contact_number?: string | null;
    address?: string | null;
    avatar_url?: string | null;
  } | null>(null);
  const [lastChecked, setLastChecked] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageHeader, setPageHeader] = useState('');
  const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [announcementQueue, setAnnouncementQueue] = useState<any[]>([]);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [seenByModalOpen, setSeenByModalOpen] = useState(false);
  const [seenByEntries, setSeenByEntries] = useState<AnnouncementView[]>([]);
  const [seenByLoading, setSeenByLoading] = useState(false);
  const [seenByError, setSeenByError] = useState<string | null>(null);
  const seenAnnouncementsRef = useRef<Set<number>>(new Set());
  const snoozedAnnouncementsRef = useRef<Set<number>>(new Set());
  const viewerDeviceIdRef = useRef<string>('');

  const ensureViewerDeviceId = () => {
    if (viewerDeviceIdRef.current) return viewerDeviceIdRef.current;
    if (typeof window === 'undefined') return 'server-device';
    const key = 'gm_viewer_device_id';
    let existing = window.localStorage.getItem(key);
    if (!existing) {
      const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev_${Math.random().toString(36).slice(2)}_${Date.now()}`;
      existing = randomPart;
      window.localStorage.setItem(key, existing);
    }
    viewerDeviceIdRef.current = existing;
    return existing;
  };

  const getViewerIdentifier = (identity: AnnouncementIdentity | null) => {
    if (!identity) return null;
    const deviceId = ensureViewerDeviceId();
    if (identity.type === 'student') {
      if (identity.studentId) return `student_${identity.studentId}`;
      return `student_device_${deviceId}`;
    }
    if (identity.staffId) return `staff_${identity.staffId}`;
    if (identity.userId) return `user_${identity.userId}`;
    const roleKey = identity.role ? identity.role.replace(/\s+/g, '_').toLowerCase() : 'staff';
    return `staff_device_${deviceId}_${roleKey}`;
  };

  const currentAnnouncement = showAnnouncement && announcementQueue.length
    ? announcementQueue[currentAnnouncementIndex]
    : null;

  const canViewSeenByList = !!authUser?.role && ['Super Admin', 'Principal', 'Admin'].includes(authUser.role);

  // Student search state
  const [studentSearchInput, setStudentSearchInput] = useState('');
  const [studentSearchSuggestions, setStudentSearchSuggestions] = useState<Array<{
    id: number;
    name: string;
    father_name?: string;
    class_id: number;
    section_id: number;
    picture_url?: string;
    class_name?: string;
    section_name?: string;
  }>>([]);
  const [studentSearchShowSuggestions, setStudentSearchShowSuggestions] = useState(false);
  const [studentSearchActiveSuggestion, setStudentSearchActiveSuggestion] = useState(0);
  const [studentSearchExpanded, setStudentSearchExpanded] = useState(false);
  const studentSearchRef = useRef<HTMLDivElement>(null);
  const studentSearchInputRef = useRef<HTMLInputElement>(null);
  const [studentsList, setStudentsList] = useState<Array<{
    id: number;
    name: string;
    father_name?: string;
    class_id: number;
    section_id: number;
    picture_url?: string;
  }>>([]);
  const [classesList, setClassesList] = useState<Array<{ id: number; name: string; has_sections?: boolean }>>([]);
  const [sectionsList, setSectionsList] = useState<Array<{ id: number; name: string }>>([]);

  // Check if we're on student profile page and user is Principal
  const isStudentProfilePage = location.pathname.match(/^\/students\/profile\/\d+$/);
  const showStudentSearch = user?.role === 'Principal' && isStudentProfilePage;

  // Fetch students, classes, and sections for search
  useEffect(() => {
    if (!showStudentSearch || !user?.school_id) return;

    const fetchSearchData = async () => {
      try {
        const [studentsResult, classesResult, sectionsResult] = await Promise.all([
          supabase
            .from('students')
            .select('id, name, father_name, class_id, section_id, picture_url')
            .eq('school_id', user.school_id),
          supabase
            .from('classes')
            .select('id, name, has_sections')
            .eq('school_id', user.school_id),
          supabase
            .from('sections')
            .select('id, name')
            .eq('school_id', user.school_id)
        ]);

        if (studentsResult.data) setStudentsList(studentsResult.data);
        if (classesResult.data) setClassesList(classesResult.data);
        if (sectionsResult.data) setSectionsList(sectionsResult.data);
      } catch (error) {
        // Error fetching search data
      }
    };

    fetchSearchData();
  }, [showStudentSearch, user?.school_id]);

  // Search logic - filter students similar to FineCollection with better ID matching
  useEffect(() => {
    if (!studentSearchExpanded) {
      setStudentSearchSuggestions([]);
      setStudentSearchShowSuggestions(false);
      return;
    }

    if (studentSearchInput.trim().length === 0) {
      setStudentSearchSuggestions([]);
      setStudentSearchShowSuggestions(false);
      return;
    }

    const searchTerm = studentSearchInput.trim().toLowerCase();
    const isNumericSearch = !isNaN(Number(searchTerm));
    const searchTermNum = isNumericSearch ? parseInt(searchTerm) : null;

    // Filter and score students for better sorting
    const scoredStudents = studentsList
      .map(student => {
        const studentIdStr = String(student.id);
        const studentNameLower = student.name.toLowerCase();
        let score = 0;
        let matches = false;

        if (isNumericSearch && searchTermNum !== null) {
          // ID search - prioritize exact match, then starts with, then contains
          if (student.id === searchTermNum) {
            score = 1000; // Highest priority for exact match
            matches = true;
          } else if (studentIdStr.startsWith(searchTerm)) {
            score = 500; // High priority for starts with
            matches = true;
          } else if (studentIdStr.includes(searchTerm)) {
            score = 100; // Lower priority for contains
            matches = true;
          }
        } else {
          // Name search
          if (studentNameLower.startsWith(searchTerm)) {
            score = 100; // High priority for starts with
            matches = true;
          } else if (studentNameLower.includes(searchTerm)) {
            score = 50; // Lower priority for contains
            matches = true;
          }

          // Also check ID for non-numeric searches (secondary)
          if (!matches && studentIdStr.includes(searchTerm)) {
            score = 10;
            matches = true;
          }
        }

        return matches ? { student, score } : null;
      })
      .filter(item => item !== null)
      .sort((a, b) => b!.score - a!.score) // Sort by score descending
      .slice(0, 8)
      .map(item => item!.student);

    // Enrich with class and section names
    const enriched = scoredStudents.map(student => {
      const classObj = classesList.find(c => c.id === student.class_id);
      const sectionObj = sectionsList.find(s => s.id === student.section_id);
      return {
        ...student,
        class_name: classObj?.name || '',
        section_name: sectionObj?.name || ''
      };
    });

    setStudentSearchSuggestions(enriched);
    setStudentSearchShowSuggestions(enriched.length > 0);
    setStudentSearchActiveSuggestion(0);
  }, [studentSearchInput, studentsList, classesList, sectionsList, studentSearchExpanded]);

  // Close search when clicking outside
  useEffect(() => {
    if (!showStudentSearch || !studentSearchExpanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (studentSearchRef.current && !studentSearchRef.current.contains(event.target as Node)) {
        setStudentSearchExpanded(false);
        setStudentSearchInput('');
        setStudentSearchSuggestions([]);
        setStudentSearchShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStudentSearch, studentSearchExpanded]);

  // Collapse search when route changes
  useEffect(() => {
    setStudentSearchExpanded(false);
    setStudentSearchInput('');
    setStudentSearchSuggestions([]);
    setStudentSearchShowSuggestions(false);
  }, [location.pathname]);

  // Keyboard navigation for suggestions
  const handleStudentSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!studentSearchShowSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setStudentSearchActiveSuggestion(prev => Math.min(prev + 1, studentSearchSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setStudentSearchActiveSuggestion(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (studentSearchSuggestions[studentSearchActiveSuggestion]) {
        handleStudentSelect(studentSearchSuggestions[studentSearchActiveSuggestion]);
      }
    } else if (e.key === 'Escape') {
      setStudentSearchExpanded(false);
      setStudentSearchInput('');
      setStudentSearchSuggestions([]);
      setStudentSearchShowSuggestions(false);
    }
  };

  // Helper functions
  const getStudentClassName = (classId: number) => {
    return classesList.find(c => c.id === classId)?.name || '-';
  };

  const getStudentSectionName = (sectionId: number) => {
    return sectionsList.find(s => s.id === sectionId)?.name || '';
  };

  const getStudentClassHasSections = (classId: number) => {
    return classesList.find(c => c.id === classId)?.has_sections ?? true;
  };

  // Handle student selection
  const handleStudentSelect = (student: {
    id: number;
    name: string;
    class_id: number;
    section_id: number;
  }) => {
    navigate(`/students/profile/${student.id}`);
    setStudentSearchInput('');
    setStudentSearchSuggestions([]);
    setStudentSearchShowSuggestions(false);
    setStudentSearchExpanded(false);
  };

  // Update checking state
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isDownloadActive, setIsDownloadActive] = useState(false);
  const [updateService] = useState(() => UpdateService.getInstance());
  const appVersion = process.env.REACT_APP_VERSION || 'dev';

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

  // Detect student or parent session and load minimal info
  // Also clear student/parent info if staff user is detected
  useEffect(() => {
    const load = async () => {
      try {
        // If staff user is logged in (user from getUser exists), clear student/parent sessions
        const currentUser = getUser();
        if (currentUser) {
          // Staff is logged in, ensure student/parent sessions are cleared
          localStorage.removeItem('studentSession');
          localStorage.removeItem('parentSession');
          setStudentInfo(null);
          setParentInfo(null);
          return;
        }

        // Only check for student/parent session if no staff user is logged in
        // Check for student session first
        const studentRaw = localStorage.getItem('studentSession');
        if (studentRaw) {
          const studentParsed = JSON.parse(studentRaw);
          if (studentParsed?.id) {
            const { data } = await supabase
              .from('students')
              .select('id, name, school_id, class_id, section_id')
              .eq('id', studentParsed.id)
              .single();
            if (data) {
              setStudentInfo({
                id: data.id,
                name: data.name,
                school_id: data.school_id,
                class_id: data.class_id,
                section_id: data.section_id,
              });
              setParentInfo(null);
              return;
            }
          }
        }

        // Check for parent session
        const parentRaw = localStorage.getItem('parentSession');
        if (parentRaw) {
          const parentParsed = JSON.parse(parentRaw);
          if (parentParsed?.id) {
            const { data } = await supabase
              .from('families')
              .select('id, name, school_id, contact_person, contact_number, address, avatar_url')
              .eq('id', parentParsed.id)
              .single();
            if (data) {
              setParentInfo({
                id: data.id,
                name: data.name,
                school_id: data.school_id,
                contact_person: data.contact_person,
                contact_number: data.contact_number,
                address: data.address,
                avatar_url: data.avatar_url,
              });
              setStudentInfo(null);
              return;
            }
          }
        }

        // No valid session found
        setStudentInfo(null);
        setParentInfo(null);
      } catch {
        setStudentInfo(null);
        setParentInfo(null);
      }
    };
    load();
  }, [user, authUser]);

  // Fetch institute profile
  useEffect(() => {
    const fetchInstituteProfile = async () => {
      const schoolId = authUser?.school_id || studentInfo?.school_id || parentInfo?.school_id;
      if (!schoolId) {
        return;
      }
      try {
        // Remove progress bar calls to avoid interfering with page-specific progress
        const { data, error } = await supabase
          .from('institute_profile')
          .select('*')
          .eq('school_id', schoolId)
          .single();

        if (!error && data && (data.short_name || data.logo_url)) {
          setInstituteProfile(data);
        } else {
          // Fallback: try to get logo from schools table
          try {
            const { data: schoolData, error: schoolError } = await supabase
              .from('schools')
              .select('name, logo_url')
              .eq('id', schoolId)
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
            setInstituteProfile(null);
          }
        }
        // Remove completeProgress call
      } catch (error) {
        setInstituteProfile(null);
        // Remove completeProgress call
      }
    };

    fetchInstituteProfile();
  }, [authUser?.school_id, studentInfo?.school_id]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      setUserTheme(true);
      return next;
    });
  };

  const buildViewerPayload = (identity: AnnouncementIdentity | null) => {
    if (!identity) return null;
    const viewerIdentifier = getViewerIdentifier(identity);
    if (!viewerIdentifier) return null;
    const base: any = {
      school_id: identity.schoolId,
      viewer_type: identity.type,
      viewer_role: identity.type === 'student' ? 'Student' : identity.role || 'Staff',
      viewer_name: identity.type === 'student'
        ? studentInfo?.name || 'Student'
        : parentInfo?.name || staffName || authUser?.name || 'Staff Member',
      viewer_identifier: viewerIdentifier,
      viewer_device_id: ensureViewerDeviceId(),
    };
    if (identity.type === 'student') {
      if (identity.studentId) base.student_id = identity.studentId;
    } else {
      if (identity.staffId) base.staff_id = identity.staffId;
      if (identity.userId) base.user_id = identity.userId;
    }

    return base;
  };

  const trackAnnouncementSeen = useCallback(async (announcement: any) => {
    if (!announcement?.id || seenAnnouncementsRef.current.has(announcement.id)) return;
    const identity = getAnnouncementIdentity();
    const payload = buildViewerPayload(identity);
    if (!identity || !payload) return;

    try {
      await supabase
        .from('announcement_views')
        .upsert(
          {
            announcement_id: announcement.id,
            ...payload,
          },
          { onConflict: 'announcement_id,viewer_identifier' }
        );
      seenAnnouncementsRef.current.add(announcement.id);
    } catch (error) {
    }
  }, [authUser?.name, authUser?.role, studentInfo?.name, parentInfo?.name, staffName, staffId]);

  const loadSeenByEntries = useCallback(async (announcementId: number) => {
    setSeenByLoading(true);
    setSeenByError(null);
    try {
      const { data, error } = await supabase
        .from('announcement_views')
        .select('*')
        .eq('announcement_id', announcementId)
        .order('seen_at', { ascending: false });
      if (error) throw error;
      setSeenByEntries(data || []);
    } catch (error) {
      setSeenByError('Unable to load viewers right now.');
    } finally {
      setSeenByLoading(false);
    }
  }, []);

  const handleOpenSeenBy = async () => {
    if (!currentAnnouncement?.id) return;
    setSeenByModalOpen(true);
    loadSeenByEntries(currentAnnouncement.id);
  };

  const handleCloseSeenBy = () => {
    setSeenByModalOpen(false);
  };

  useEffect(() => {
    if (currentAnnouncement) {
      trackAnnouncementSeen(currentAnnouncement);
    }
  }, [currentAnnouncement, trackAnnouncementSeen]);

  const toggleMute = () => {
    setMuted(m => {
      localStorage.setItem('muted', String(!m));
      return !m;
    });
  };

  const handleLogout = async () => {
    // Handle Student Logout
    const studentSession = localStorage.getItem('studentSession');
    if (studentSession) {
      try {
        const parsed = JSON.parse(studentSession);
        if (parsed.id) {
          await supabase
            .from('students')
            .update({ is_online: false, last_online: new Date().toISOString() })
            .eq('id', parsed.id);
        }
      } catch (e) {
      }
      localStorage.removeItem('studentSession');
    }

    // Handle Staff Logout
    if (authUser) {
      try {
        await signOut();
      } catch (error) {
        removeUser();
      }
    } else {
      removeUser();
    }
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
    const audio = new window.Audio(`${process.env.PUBLIC_URL || '.'}/hover.mp3?v=` + Date.now());
    audio.volume = 1.0;
    audio.currentTime = 0;
    audio.play().catch(() => { });
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
      }
    };

    // On web, don't set up any custom navigation handlers - let browser handle it
    if (isWeb) {
      return;
    }

    // Set up listener only for Electron/Capacitor
    setupCapacitorListener();

    // Fallback for non-Capacitor contexts (Electron/Cordova)
    const handlePopState = (event: PopStateEvent) => {
      // Only prevent navigation in Electron/Capacitor
      event.preventDefault();
      event.stopImmediatePropagation();
      handleBackPress();

      // Push the current state back to prevent navigation
      window.history.pushState(null, '', window.location.pathname);
    };

    // Handle beforeunload to prevent accidental exits
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Only show exit confirm in Electron/Capacitor
      if (showExitConfirm) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    // Push initial state to enable back button handling
    window.history.pushState(null, '', window.location.pathname);

    // Add event listeners only for Electron/Capacitor
    window.addEventListener('popstate', handlePopState, true);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      removeCapListener?.();
      window.removeEventListener('popstate', handlePopState, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sidebarOpen, location.pathname, handleGoBack, showExitConfirm, isWeb, setSidebarOpen, setShowExitConfirm]);

  // Navigation functions are now provided by NavigationContext

  // Keyboard shortcuts for navigation (only in Electron/Capacitor, not on web)
  useEffect(() => {
    // On web, let browser handle Alt+Left/Right for navigation
    if (isWeb) {
      return;
    }

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
  }, [handleGoBack, handleGoForward, isWeb]);

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
    if (newPassword.length < 4) {
      toast.showToast('Password must be at least 4 characters.', 'error');
      return;
    }
    setModalLoading(true);
    startProgress(true); // Start indeterminate progress for password change

    try {
      // Check if student is logged in
      if (studentInfo) {
        // Student password change flow
        const { data, error } = await supabase
          .from('students')
          .select('password')
          .eq('id', studentInfo.id)
          .single();

        if (error) {
          toast.showToast('Failed to verify current password.', 'error');
          completeProgress();
          setModalLoading(false);
          return;
        }

        // Check current password (accept both the stored password and default 'aa')
        const isValidPassword = data.password === currentPassword ||
          (data.password === 'aa' && currentPassword === 'aa') ||
          (!data.password && currentPassword === 'aa');

        if (!isValidPassword) {
          toast.showToast('Current password is incorrect.', 'error');
          completeProgress();
          setModalLoading(false);
          return;
        }

        // Update student password
        const { error: updateError } = await supabase
          .from('students')
          .update({ password: newPassword })
          .eq('id', studentInfo.id)
          .eq('school_id', studentInfo.school_id);

        if (updateError) {
          toast.showToast('Failed to update password.', 'error');
          completeProgress();
          return;
        }

        toast.showToast('Password updated successfully!', 'success');
        completeProgress();
        setTimeout(() => {
          closeChangePasswordModal();
        }, 600);
        return;
      }

      // Check if parent is logged in
      if (parentInfo) {
        // Parent password change flow
        const { data, error } = await supabase
          .from('families')
          .select('password')
          .eq('id', parentInfo.id)
          .single();

        if (error) {
          toast.showToast('Failed to verify current password.', 'error');
          completeProgress();
          setModalLoading(false);
          return;
        }

        // Check current password (accept both the stored password and default 'aa')
        const isValidPassword = data.password === currentPassword ||
          (data.password === 'aa' && currentPassword === 'aa') ||
          (!data.password && currentPassword === 'aa');

        if (!isValidPassword) {
          toast.showToast('Current password is incorrect.', 'error');
          completeProgress();
          setModalLoading(false);
          return;
        }

        // Update family password
        const { error: updateError } = await supabase
          .from('families')
          .update({ password: newPassword })
          .eq('id', parentInfo.id)
          .eq('school_id', parentInfo.school_id);

        if (updateError) {
          toast.showToast('Failed to update password.', 'error');
          completeProgress();
          return;
        }

        toast.showToast('Password updated successfully!', 'success');
        completeProgress();
        setTimeout(() => {
          closeChangePasswordModal();
        }, 600);
        return;
      }

      // Staff password change flow (existing logic)
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
      // For teachers, show Welcome Page, Attendance, Reports, Examination, and Homework Diary
      if (user.role === 'Teacher') {
        return item.text === 'Attendance' ||
          item.text === 'Welcome Page' ||
          item.text === 'Reports' ||
          item.text === 'Examination' ||
          item.text === 'Daily Diary';
      }
      return item.allowedRoles.includes(user.role);
    });
  }, [user]);

  const handleRefresh = () => {
    // Prevent refresh if download is active
    if (isDownloadActive) {
      toast.showToast('Please wait for the download to complete before refreshing', 'error');
      return;
    }

    try {
      startProgress(true); // Start indeterminate progress for page refresh

      // For student users, use React Router navigation instead of hard reload
      // Students use studentSession in localStorage, not user in AuthContext
      // Hard reload causes white screen because InitialRouteHandler redirects before student session is checked
      const studentSession = localStorage.getItem('studentSession');
      if (studentSession) {
        try {
          const parsed = JSON.parse(studentSession);
          if (parsed?.id) {
            // Student user: navigate to the same route with a timestamp query param
            // This forces React Router to remount the component without full page reload
            const currentPath = location.pathname;
            const searchParams = new URLSearchParams(location.search);
            searchParams.set('_refresh', Date.now().toString());
            navigate(`${currentPath}?${searchParams.toString()}`, { replace: true });
            // Remove the refresh param after a short delay
            setTimeout(() => {
              navigate(currentPath, { replace: true });
              completeProgress();
            }, 100);
            return;
          }
        } catch (e) {
          // If parsing fails, fall through to normal refresh
        }
      }

      // For guest users, also use React Router navigation to avoid routing issues
      // Guest users might have render settings that need to be checked on refresh
      const currentUser = getUser();
      if (currentUser && currentUser.role === 'Guest') {
        // Guest user: navigate to the same route with a timestamp query param
        // This forces React Router to remount the component without full page reload
        const currentPath = location.pathname;
        const searchParams = new URLSearchParams(location.search);
        searchParams.set('_refresh', Date.now().toString());
        navigate(`${currentPath}?${searchParams.toString()}`, { replace: true });
        // Remove the refresh param after a short delay
        setTimeout(() => {
          navigate(currentPath, { replace: true });
          completeProgress();
        }, 100);
        return;
      }

      // For other staff users (principal, teacher), use normal hard reload
      // Force a hard reload for all user types
      if (window.location.reload) {
        window.location.reload();
      } else {
        // Fallback: navigate to the same page to force refresh
        window.location.href = window.location.href;
      }
    } catch (error) {
      // Fallback: try alternative reload method
      window.location.href = window.location.href;
    }
  };

  // Check download state periodically
  useEffect(() => {
    const checkDownloadState = () => {
      if ((window as any).updateNotificationRef?.current) {
        const isActive = (window as any).updateNotificationRef.current.isDownloadActive();
        setIsDownloadActive(isActive);
      } else {
        // Fallback: check localStorage
        try {
          const downloadState = localStorage.getItem('gm_download_state');
          if (downloadState) {
            const state = JSON.parse(downloadState);
            // Consider download active if progress < 100, even if paused
            setIsDownloadActive(state.progress < 100);
          } else {
            setIsDownloadActive(false);
          }
        } catch {
          setIsDownloadActive(false);
        }
      }
    };

    // Check immediately
    checkDownloadState();

    // Check periodically
    const interval = setInterval(checkDownloadState, 1000);
    return () => clearInterval(interval);
  }, []);

  // Prevent page refresh/reload when download is active
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDownloadActive) {
        e.preventDefault();
        // Get download details for better warning
        let downloadInfo = '';
        try {
          const downloadState = localStorage.getItem('gm_download_state');
          if (downloadState) {
            const state = JSON.parse(downloadState);
            const progress = state.totalBytes > 0 
              ? Math.round((state.downloadedBytes / state.totalBytes) * 100) 
              : 0;
            const status = state.isPaused ? ' - Paused' : '';
            downloadInfo = ` (${state.fileName} - ${progress}%${status})`;
          }
        } catch (e) {
          // Ignore errors
        }
        e.returnValue = `⚠️ Download in progress${downloadInfo}. Are you sure you want to leave? The download will be canceled.`;
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDownloadActive]);

  // Update checking functions - use the global update notification modal
  const handleCheckForUpdates = async () => {
    // If download is active, restore the modal instead of checking for updates
    if (isDownloadActive && (window as any).updateNotificationRef?.current) {
      (window as any).updateNotificationRef.current.restoreDownloadModal();
      setProfileMenuOpen(false);
      return;
    }

    if (isCheckingUpdate) return; // debounce concurrent checks
    setIsCheckingUpdate(true);
    try {
      // Use the global update check function that shows the modal
      if ((window as any).checkForAppUpdates) {
        (window as any).checkForAppUpdates();
      } else {
        toast.showToast('Update service not available', 'error');
      }
    } catch (error) {
      toast.showToast('Failed to check for updates', 'error');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // Remove intrusive startup confirm flow; UpdateNotification handles showing the card

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
    // Check if download is active
    if (isDownloadActive) {
      // Get download details for better warning message
      let downloadDetails = '';
      try {
        const downloadState = localStorage.getItem('gm_download_state');
        if (downloadState) {
          const state = JSON.parse(downloadState);
          const progress = state.totalBytes > 0 
            ? Math.round((state.downloadedBytes / state.totalBytes) * 100) 
            : 0;
          const status = state.isPaused ? ' (Paused)' : '';
          downloadDetails = `\n\nDownload: ${state.fileName}\nProgress: ${progress}%${status}`;
        }
      } catch (e) {
        // Ignore errors
      }

      const confirmClose = window.confirm(
        '⚠️ Download in Progress!\n\n' +
        'A download is currently in progress (or paused).' + downloadDetails +
        '\n\nIf you close the application now, the download will be canceled.\n\n' +
        'Are you sure you want to close?'
      );
      if (!confirmClose) {
        return;
      }
    }

    try {
      if (CapacitorApp) {
        CapacitorApp.exitApp();
      } else if (window.electronAPI) {
        window.electronAPI.close();
      } else if (isWeb) {
        // On web, try to close the tab/window
        // Note: window.close() only works if the window was opened by JavaScript
        // For user-opened tabs, we'll try to close, and if that fails, navigate to a blank page
        const closed = window.close();
        // If window.close() didn't work (returns false or window still exists after a short delay)
        // Navigate to about:blank as a fallback
        setTimeout(() => {
          if (!document.hidden) {
            window.location.href = 'about:blank';
          }
        }, 100);
      } else {
        window.close();
      }
    } catch (error) {
      // Fallback: try window.close() or navigate away
      try {
        window.close();
      } catch {
        if (isWeb) {
          window.location.href = 'about:blank';
        }
      }
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
    '/students/list': 'Students List',
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
    '/homework-diary': 'Daily Diary',
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
    // Check pageHeader context first (takes precedence if set)
    if (pageHeader) return pageHeader;
    if (pathname === '/') return currentTime;
    if (customHeaderTexts[pathname]) return customHeaderTexts[pathname];
    const dynamicMatch = Object.keys(customHeaderTexts).find(pattern => matchRoutePattern(pattern, pathname));
    if (dynamicMatch) return customHeaderTexts[dynamicMatch];
    // Parent match, but skip '/' key
    const parentMatch = Object.keys(customHeaderTexts)
      .filter(key => key !== '/')
      .find(key => pathname.startsWith(key));
    if (parentMatch) return customHeaderTexts[parentMatch];
    // Fallback: empty string
    return '';
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

  const getAnnouncementIdentity = () => {
    if (studentInfo) {
      return {
        type: 'student' as const,
        schoolId: studentInfo.school_id,
        studentId: studentInfo.id,
        classId: studentInfo.class_id ?? undefined,
        sectionId: studentInfo.section_id ?? undefined,
      };
    }
    if (authUser?.school_id) {
      return {
        type: 'staff' as const,
        schoolId: authUser.school_id,
        staffId: staffId ? Number(staffId) : undefined,
        role: authUser.role,
        userId: authUser.id,
      };
    }
    return null;
  };

  const getDismissStorageKey = (announcementId: number, identity: ReturnType<typeof getAnnouncementIdentity>) => {
    if (!identity) return null;
    const recipientId = identity.type === 'student'
      ? identity.studentId
      : identity.staffId || identity.userId || identity.role || 'staff';
    return `gm_ann_dismiss_${identity.schoolId}_${identity.type}_${recipientId}_${announcementId}`;
  };

  const isAnnouncementDismissed = (announcementId: number, identity: ReturnType<typeof getAnnouncementIdentity>) => {
    if (typeof window === 'undefined') return false;
    const key = getDismissStorageKey(announcementId, identity);
    if (!key) return false;
    return window.localStorage.getItem(key) === '1';
  };

  const persistAnnouncementDismissal = (announcementId: number, identity: ReturnType<typeof getAnnouncementIdentity>) => {
    if (typeof window === 'undefined') return;
    const key = getDismissStorageKey(announcementId, identity);
    if (!key) return;
    window.localStorage.setItem(key, '1');
  };

  type AnnouncementIdentity = ReturnType<typeof getAnnouncementIdentity>;

  interface AnnouncementView {
    id?: number;
    announcement_id?: number;
    viewer_identifier: string;
    viewer_type?: string;
    viewer_role?: string;
    viewer_name?: string;
    student_id?: number;
    staff_id?: number;
    user_id?: number;
    viewer_device_id?: string;
    seen_at?: string;
  }

  const matchesAnnouncementAudience = (announcement: any, identity: AnnouncementIdentity) => {
    if (!identity) return false;
    if (identity.type === 'student') {
      if (announcement.audience_group !== 'students') return false;
      switch (announcement.target_scope) {
        case 'all':
          return true;
        case 'single':
        case 'multi': {
          if (!identity.studentId) return false;
          const targetIds = [
            ...normalizeIdList(announcement.student_id),
            ...normalizeIdList(announcement.student_ids),
          ];
          return targetIds.includes(identity.studentId);
        }
        case 'class': {
          const classMatches = !announcement.class_id || (identity.classId && announcement.class_id === identity.classId);
          const sectionMatches = !announcement.section_id || (identity.sectionId && announcement.section_id === identity.sectionId);
          return classMatches && sectionMatches;
        }
        default:
          return false;
      }
    } else {
      if (announcement.audience_group !== 'staff') return false;
      switch (announcement.target_scope) {
        case 'all':
          return true;
        case 'role':
          return !!announcement.staff_role && announcement.staff_role === identity.role;
        case 'single':
        case 'multi': {
          if (!identity.staffId) return false;
          const targetIds = [
            ...normalizeIdList(announcement.staff_id),
            ...normalizeIdList(announcement.staff_ids),
          ];
          return targetIds.includes(identity.staffId);
        }
        default:
          return false;
      }
    }
  };

  const isWithinDisplayWindow = (announcement: any, today: string) => {
    if (announcement.show_from && announcement.show_from > today) return false;
    if (announcement.show_until && announcement.show_until < today) return false;
    return true;
  };

  const shouldDisplayAnnouncement = (announcement: any, identity: AnnouncementIdentity, today: string) => {
    if (!identity || !announcement || announcement.is_active === false) return false;
    if (announcement.id && snoozedAnnouncementsRef.current.has(announcement.id)) return false;
    if (!isWithinDisplayWindow(announcement, today)) return false;
    if (!matchesAnnouncementAudience(announcement, identity)) return false;
    if (isAnnouncementDismissed(announcement.id, identity)) return false;
    return true;
  };

  const enqueueAnnouncement = (announcement: any) => {
    setAnnouncementQueue(prev => {
      if (prev.some(existing => existing.id === announcement.id)) {
        return prev;
      }
      if (!prev.length) {
        setCurrentAnnouncementIndex(0);
        setShowAnnouncement(true);
        return [announcement];
      }
      return [...prev, announcement];
    });
  };

  const handleOpenAnnouncement = useCallback(async (id: number) => {
    // Check if it's already in the queue
    const existing = announcementQueue.find(a => a.id === id);
    if (existing) {
      const index = announcementQueue.indexOf(existing);
      setCurrentAnnouncementIndex(index);
      setShowAnnouncement(true);
      return;
    }

    // Fetch from DB
    try {
      const { data, error } = await supabase.from('announcements').select('*').eq('id', id).single();
      if (data && !error) {
        // Add to queue and show
        setAnnouncementQueue(prev => [data, ...prev]);
        setCurrentAnnouncementIndex(0);
        setShowAnnouncement(true);
      }
    } catch (e) {
    }
  }, [announcementQueue]);

  const loadAnnouncements = useCallback(async () => {
    const identity = getAnnouncementIdentity();
    if (!identity) return;

    const today = new Date().toISOString().split('T')[0];

    try {
      let query = supabase
        .from('announcements')
        .select('*')
        .eq('school_id', identity.schoolId)
        .eq('is_active', true)
        .lte('show_from', today)
        .or(`show_until.is.null,show_until.gte.${today}`)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error || !data) {
        return;
      }

      const filtered = data.filter((a: any) => shouldDisplayAnnouncement(a, identity, today));

      const visible = filtered;
      if (!visible.length) {
        setAnnouncementQueue([]);
        setShowAnnouncement(false);
        return;
      }

      setAnnouncementQueue(visible);
      setCurrentAnnouncementIndex(0);
      setShowAnnouncement(true);
    } catch {
      // Fail silently for announcements
    }
  }, [authUser?.school_id, authUser?.role, studentInfo, staffId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadAnnouncements();
    }, 2500);
    return () => clearTimeout(timeout);
  }, [loadAnnouncements]);

  useEffect(() => {
    loadAnnouncements();
  }, [location.pathname, loadAnnouncements]);

  useEffect(() => {
    const identity = getAnnouncementIdentity();
    if (!identity) return;

    const channel = supabase
      .channel(`announcement_inserts_school_${identity.schoolId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements',
          filter: `school_id=eq.${identity.schoolId}`,
        },
        payload => {
          const newAnnouncement = payload.new as any;
          const latestIdentity = getAnnouncementIdentity();
          const today = new Date().toISOString().split('T')[0];
          if (shouldDisplayAnnouncement(newAnnouncement, latestIdentity, today)) {
            enqueueAnnouncement(newAnnouncement);
          }
        }
      )
      .subscribe(status => {
        if (process.env.NODE_ENV === 'development') {
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentInfo, authUser?.school_id, authUser?.role, staffId]);

  const handleDismissAnnouncement = () => {
    if (!announcementQueue.length) {
      setShowAnnouncement(false);
      setAnnouncementQueue([]);
      setCurrentAnnouncementIndex(0);
      return;
    }

    if (currentAnnouncementIndex + 1 < announcementQueue.length) {
      setCurrentAnnouncementIndex(currentAnnouncementIndex + 1);
    } else {
      setShowAnnouncement(false);
      setAnnouncementQueue([]);
      setCurrentAnnouncementIndex(0);
    }
  };

  const handleRemindMeLater = () => {
    if (currentAnnouncement?.id) {
      snoozedAnnouncementsRef.current.add(currentAnnouncement.id);
    }
    handleDismissAnnouncement();
  };

  const handleDontShowAgain = () => {
    if (!currentAnnouncement) return;
    const identity = getAnnouncementIdentity();
    if (identity) {
      persistAnnouncementDismissal(currentAnnouncement.id, identity);
    }
    if (currentAnnouncement.id) {
      snoozedAnnouncementsRef.current.delete(currentAnnouncement.id);
    }
    handleDismissAnnouncement();
  };

  return (
    <PageHeaderContext.Provider value={{ setPageHeader }}>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <PresenceManager />
        <MuteContext.Provider value={{ muted, toggleMute }}>
          <MuiThemeProvider theme={muiTheme}>
            <CssBaseline />
            <ProgressProvider>
              <NotificationProvider>
                <AnnouncementHandler onOpenAnnouncement={handleOpenAnnouncement} />
                <ThemeProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
                  {currentAnnouncement && (
                    <AnnouncementOverlay>
                      <AnnouncementBox>
                        <AnnouncementHeader>
                          <AnnouncementTitle
                            className="ql-editor"
                            dangerouslySetInnerHTML={{ __html: currentAnnouncement.title || '' }}
                          />
                        </AnnouncementHeader>
                        <AnnouncementBody>
                          <div
                            className="ql-editor"
                            dangerouslySetInnerHTML={{ __html: currentAnnouncement.message || '' }}
                          />
                        </AnnouncementBody>
                        {currentAnnouncement.footer_text && (
                          <AnnouncementFooter>
                            <AnnouncementFooterRow>
                              <AnnouncementFooterHighlight
                                className="ql-editor"
                                dangerouslySetInnerHTML={{ __html: currentAnnouncement.footer_text }}
                              />
                            </AnnouncementFooterRow>
                          </AnnouncementFooter>
                        )}
                        <AnnouncementActions>
                          <AnnouncementActionButton $variant="primary" type="button" onClick={handleRemindMeLater}>
                            <SnoozeIcon fontSize="small" />
                            Remind me later
                          </AnnouncementActionButton>
                          {!currentAnnouncement.hide_dont_show && (
                            <AnnouncementActionButton type="button" onClick={handleDontShowAgain}>
                              <VisibilityOff fontSize="small" />
                              Don't show again
                            </AnnouncementActionButton>
                          )}
                        </AnnouncementActions>
                      </AnnouncementBox>
                    </AnnouncementOverlay>
                  )}
                  {seenByModalOpen && (
                    <SeenByOverlay>
                      <SeenByBox>
                        <SeenByHeader>
                          <SeenByTitle>Seen by</SeenByTitle>
                          <SeenByClose onClick={handleCloseSeenBy}>
                            <CloseIcon fontSize="small" />
                          </SeenByClose>
                        </SeenByHeader>
                        <SeenByList>
                          {seenByLoading && <SeenByEmpty>Loading…</SeenByEmpty>}
                          {!seenByLoading && seenByError && <SeenByEmpty>{seenByError}</SeenByEmpty>}
                          {!seenByLoading && !seenByError && seenByEntries.length === 0 && (
                            <SeenByEmpty>No viewers yet.</SeenByEmpty>
                          )}
                          {!seenByLoading && !seenByError && seenByEntries.map(entry => (
                            <SeenByItem key={entry.viewer_identifier}>
                              <SeenByName>{entry.viewer_name || entry.viewer_identifier}</SeenByName>
                              <SeenByMeta>
                                <span>{entry.viewer_role || entry.viewer_type}</span>
                                {entry.seen_at && <span>{new Date(entry.seen_at).toLocaleString()}</span>}
                              </SeenByMeta>
                            </SeenByItem>
                          ))}
                        </SeenByList>
                      </SeenByBox>
                    </SeenByOverlay>
                  )}
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
                      {/* Sidebar shown only for Principal, Admin, or Super Admin */}
                      {user && ['Principal', 'Admin', 'Super Admin'].includes(user.role) && (
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
                      <MainArea $isTeacher={!user || !['Principal', 'Admin', 'Super Admin'].includes(user.role)}>
                        <Header>
                          <HeaderLeft>
                            {user && ['Principal', 'Admin', 'Super Admin'].includes(user.role) ? (
                              <MenuButton
                                onClick={() => setSidebarOpen((v) => !v)}
                                aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
                              >
                                <MenuIcon />
                              </MenuButton>
                            ) : (user || studentInfo || parentInfo) ? (
                              <MenuButton
                                onClick={() => navigate('/landing-page')}
                                aria-label="Go to Dashboard"
                                title="Dashboard"
                              >
                                <DashboardIcon />
                              </MenuButton>
                            ) : null}
                            {/* Only show navigation buttons in Electron/Capacitor, not on web */}
                            {!isWeb && (
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
                            )}
                            {/* Always show school/institute short name in header for both staff and students */}
                            {(location.pathname === '/dashboard' || location.pathname === '/teacher' || studentInfo) ? (
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
                                  data-text={getPageHeaderText(location.pathname)}
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
                            {/* Student Search Bar (for Principal on student profile page) */}
                            {showStudentSearch && (
                              <StudentSearchWrapper ref={studentSearchRef} $expanded={studentSearchExpanded}>
                                <StudentSearchInput
                                  $expanded={studentSearchExpanded}
                                  onClick={() => {
                                    if (!studentSearchExpanded) {
                                      setStudentSearchExpanded(true);
                                      setTimeout(() => {
                                        studentSearchInputRef.current?.focus();
                                      }, 100);
                                    }
                                  }}
                                >
                                  <div className="search-icon">
                                    <SearchIcon />
                                  </div>
                                  <div className="search-field">
                                    <input
                                      ref={studentSearchInputRef}
                                      type="text"
                                      value={studentSearchInput}
                                      onChange={(e) => setStudentSearchInput(e.target.value)}
                                      onKeyDown={handleStudentSearchKeyDown}
                                      onFocus={() => {
                                        if (studentSearchSuggestions.length > 0) {
                                          setStudentSearchShowSuggestions(true);
                                        }
                                      }}
                                      placeholder="Search by name or ID..."
                                    />
                                  </div>
                                  {studentSearchShowSuggestions && studentSearchSuggestions.length > 0 && (
                                    <StudentSuggestionList $visible={studentSearchShowSuggestions}>
                                      {studentSearchSuggestions.map((student, idx) => (
                                        <StudentSuggestionItem
                                          key={student.id}
                                          $active={idx === studentSearchActiveSuggestion}
                                          onClick={() => handleStudentSelect(student)}
                                          onMouseEnter={() => setStudentSearchActiveSuggestion(idx)}
                                        >
                                          <StudentSuggestionItemRow>
                                            <StudentSuggestionMain>
                                              <StudentSuggestionAvatar>
                                                {student.picture_url ? (
                                                  <img src={student.picture_url} alt="" />
                                                ) : (
                                                  <UserIcon style={{ fontSize: '1.4rem' }} />
                                                )}
                                              </StudentSuggestionAvatar>
                                              <StudentSuggestionTextCol>
                                                <StudentSuggestionName>{student.name}</StudentSuggestionName>
                                                {student.father_name && (
                                                  <StudentSuggestionFather>{student.father_name}</StudentSuggestionFather>
                                                )}
                                              </StudentSuggestionTextCol>
                                            </StudentSuggestionMain>
                                            <StudentSuggestionMetaCol>
                                              <StudentSuggestionClass>
                                                {getStudentClassName(student.class_id)}
                                                {getStudentClassHasSections(student.class_id) && getStudentSectionName(student.section_id)
                                                  ? ` ${getStudentSectionName(student.section_id)}`
                                                  : ''}
                                              </StudentSuggestionClass>
                                              <StudentSuggestionId>ID: {student.id}</StudentSuggestionId>
                                            </StudentSuggestionMetaCol>
                                          </StudentSuggestionItemRow>
                                        </StudentSuggestionItem>
                                      ))}
                                    </StudentSuggestionList>
                                  )}
                                </StudentSearchInput>
                              </StudentSearchWrapper>
                            )}
                            {isWeakConnection && (
                              <WeakConnectionIndicator title="Slow internet connection detected">
                                <WifiOffIcon style={{ color: '#fbbf24' }} />
                                {!isMobile && 'Slow Connection'}
                              </WeakConnectionIndicator>
                            )}
                            {/* Show notification bell for all authenticated users (staff and students) */}
                            {(user || studentInfo || parentInfo) && <NotificationBell />}
                            <HeaderIconCircle
                              as="button"
                              onClick={handleRefresh}
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
                              <HeaderIconCircle
                                as="button"
                                ref={profileIconRef}
                                onClick={() => setProfileMenuOpen(v => !v)}
                                aria-label="Profile"
                              >
                                {(avatarUrl || parentInfo?.avatar_url) ? (
                                  <img
                                    src={avatarUrl || parentInfo?.avatar_url || ''}
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
                                    {studentInfo?.name || parentInfo?.name || staffName || user?.name}
                                    {!studentInfo && !parentInfo && user?.role && (
                                      <span style={{ color: '#6366f1', fontWeight: 600, marginLeft: 4 }}>{user?.role}</span>
                                    )}
                                    {parentInfo && (
                                      <span style={{ color: '#6366f1', fontWeight: 600, marginLeft: 4 }}>Parent</span>
                                    )}
                                    {studentInfo && (
                                      <span style={{ color: '#6366f1', fontWeight: 600, marginLeft: 4 }}>Student</span>
                                    )}
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
                                  {/* Only show "Check for Updates" in Electron/desktop or Capacitor (mobile), not in web */}
                                  {!isWeb && (
                                    <>
                                      <ProfileDropdownDivider />
                                      <ProfileDropdownItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCheckForUpdates();
                                          setProfileMenuOpen(false);
                                        }}
                                        disabled={isCheckingUpdate && !isDownloadActive}
                                        style={{
                                          opacity: (isCheckingUpdate && !isDownloadActive) ? 0.6 : 1,
                                          cursor: (isCheckingUpdate && !isDownloadActive) ? 'not-allowed' : 'pointer',
                                          color: isDownloadActive ? (theme === 'dark' ? '#60a5fa' : '#2563eb') : undefined
                                        }}
                                      >
                                        {isDownloadActive ? 'Downloading Update...' : (isCheckingUpdate ? 'Checking...' : 'Check for Updates')}
                                      </ProfileDropdownItem>
                                    </>
                                  )}
                                  <ProfileDropdownDivider />
                                  <ProfileDropdownItem disabled style={{ opacity: 0.8, cursor: 'default' }}>
                                    Version: v{appVersion}
                                  </ProfileDropdownItem>
                                  {(user?.role === 'Teacher' || studentInfo || parentInfo) && (
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
                                  <WifiOffIcon style={{ fontSize: 64, color: '#ff6b6b' }} />
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
                                handleExit();
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