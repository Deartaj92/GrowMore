import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchRenderSettings, RenderSettings } from '../services/renderSettingsService';
import styled, { ThemeProvider } from 'styled-components';
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
  Settings as SettingsIcon,
  MonetizationOn as MoneyIcon,
  VolumeUp,
  VolumeOff,
  PieChart as PieChartIcon,
  CloudDownload as CloudDownloadIcon,
  Block as BlockIcon,
  Home as HomeIcon,
  Business as BusinessIcon,
  AttachMoney as AttachMoneyIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Quiz as QuizIcon,
  Info as InfoIcon,
  Assignment,
} from '@mui/icons-material';
import type { NavigateFunction } from 'react-router-dom';

// Sidebar width
const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED = 56;

// Add new constant for mobile transition timing
const MOBILE_TRANSITION_TIMING = 'cubic-bezier(0.4, 0, 0.2, 1)';

const SidebarContainer = styled.nav<{ expanded: boolean; isMobile: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: ${({ expanded, isMobile }) => 
    isMobile 
      ? expanded ? '85vw' : '0px'
      : expanded ? 'max-content' : SIDEBAR_COLLAPSED + 'px'
  };
  min-width: ${({ expanded, isMobile }) =>
    isMobile ? '0' : expanded ? '220px' : SIDEBAR_COLLAPSED + 'px'};
  max-width: ${({ expanded, isMobile }) =>
    isMobile ? '85vw' : expanded ? '350px' : SIDEBAR_COLLAPSED + 'px'};
  background: ${({ theme }) => theme.SIDEBAR_BG || '#23242a'};
  color: ${({ theme }) => theme.TEXT_PRIMARY || '#e0e0e0'};
  box-shadow: ${({ isMobile }) => isMobile ? 'none' : '2px 0 16px #0005'};
  transition: ${({ isMobile }) => 
    isMobile 
      ? `transform 0.2s ${MOBILE_TRANSITION_TIMING}, box-shadow 0.2s ${MOBILE_TRANSITION_TIMING}`
      : `width 0.15s ${MOBILE_TRANSITION_TIMING}`
  };
  z-index: 3000;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  will-change: transform;
  transform: ${({ expanded, isMobile }) => 
    isMobile 
      ? `translateX(${expanded ? '0' : '-100%'}) translateZ(0)`
      : 'translateZ(0)'
  };
  backface-visibility: hidden;
  perspective: 1000px;
  pointer-events: ${({ expanded, isMobile }) => (!expanded && isMobile) ? 'none' : 'auto'};
  
  ${({ isMobile, expanded }) => isMobile && expanded && `
    box-shadow: 2px 0 16px #000a;
  `}
`;

const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: 54px;
  min-height: 54px;
  max-height: 54px;
  padding: 0 12px;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 1px;
  border-bottom: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#33384a' : '#e0e0e0'};
  gap: 10px;
  box-sizing: border-box;
  background: inherit;
`;

const MenuButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  font-size: 1.6rem;
  cursor: pointer;
  margin-right: 8px;
  display: flex;
  align-items: center;
  transition: transform 0.15s ease;
  &:hover {
    transform: scale(1.05);
  }
  &:active {
    transform: scale(0.95);
  }
`;

const SidebarMenu = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
  /* Minimal scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: #444 #23242a;
  &::-webkit-scrollbar {
    width: 7px;
    background: #23242a;
  }
  &::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 6px;
  }
  /* Optimize scrolling */
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
`;

// Simple About Us button
const AboutUsButton = styled.button<{ expanded: boolean }>`
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  background: ${({ theme }) => theme.ACCENT};
  border: none;
  border-radius: 50%;
  color: white;
  display: ${({ expanded }) => expanded ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    font-size: 18px;
  }
`;

const SidebarMenuItem = styled.li<{ active?: boolean; expanded: boolean; dashboard?: boolean }>`
  width: 100%;
  display: flex;
  flex-direction: column;
  background: ${({ dashboard, active, theme }) =>
    dashboard
      ? 'rgba(37,99,235,0.13)'
      : active
      ? theme.HOVER_BG || '#2a2a2a'
      : 'transparent'};
  color: ${({ dashboard }) => (dashboard ? '#2563eb' : 'inherit')};
  border-radius: ${({ dashboard }) => (dashboard ? '0' : '8px')};
  margin: 1px 0;
  transition: background 0.15s ease, color 0.15s ease;
  align-items: stretch;
  box-shadow: ${({ dashboard }) =>
    dashboard ? '0 2px 8px 0 rgba(37,99,235,0.08)' : 'none'};
  will-change: background, color;
`;

const MenuItemButton = styled.button<{ expanded: boolean; dashboard?: boolean }>`
  width: 100%;
  background: none;
  border: none;
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: ${({ expanded }) =>
    expanded ? 'flex-start' : 'center'};
  gap: ${({ expanded }) => (expanded ? '14px' : '0')};
  padding: ${({ expanded }) => (expanded ? '10px 16px' : '10px 0')};
  font-size: 1rem;
  font-weight: ${({ dashboard }) => (dashboard ? 700 : 500)};
  cursor: pointer;
  border-radius: ${({ dashboard }) => (dashboard ? '0' : '8px')};
  transition: background 0.15s ease;
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
  &:hover {
    background: ${({ dashboard }) =>
      dashboard ? 'rgba(37,99,235,0.22)' : 'rgba(74, 108, 247, 0.18)'};
    border-radius: ${({ dashboard }) => (dashboard ? '0' : '8px')};
  }
  &:active {
    transform: scale(0.98) translateZ(0);
  }
`;

const ArrowContainer = styled.span`
  display: flex;
  align-items: center;
  margin-left: auto;
  min-width: 24px;
  justify-content: flex-end;
  transition: transform 0.15s ease;
  will-change: transform;
`;

const IconWrapper = styled.span<{ expanded: boolean }>`
  display: flex;
  align-items: center;
  font-size: 1.4rem;
  transition: transform 0.15s ease;
  will-change: transform;
  ${({ expanded }) =>
    !expanded && `justify-content: center; width: 100%;`}
`;

const Label = styled.span<{ expanded: boolean }>`
  opacity: ${({ expanded }) => (expanded ? 1 : 0)};
  width: ${({ expanded }) => (expanded ? 'auto' : '0')};
  white-space: nowrap;
  transition: opacity 0.15s ease;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  will-change: opacity;
  transform: translateZ(0);
`;

const Drawer = styled.div<{ open: boolean }>`
  max-height: ${({ open }) => (open ? '500px' : '0')};
  overflow: hidden;
  transition: max-height 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  background: ${({ theme }) => theme.BG || '#23242a'};
  border-radius: 0 0 8px 8px;
  box-shadow: ${({ open }) => (open ? '0 2px 8px #0002' : 'none')};
  will-change: max-height;
  transform: translateZ(0);
  backface-visibility: hidden;
`;

const DrawerItem = styled.button`
  width: 100%;
  background: none;
  border: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 32px;
  font-size: 0.98rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s ease;
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
  &:hover {
    background: ${({ theme }) => theme.HOVER_BG || '#2a2a2a'};
  }
  &:active {
    transform: scale(0.98) translateZ(0);
  }
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SidebarLogo = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 10px;
  border: 1.5px solid #33384a;
  background: #fff;
`;

const SidebarShortName = styled.span`
  font-size: 1.13rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SidebarSearchWrapper = styled.div`
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
`;

const SearchIconWrapper = styled.span`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.BG === '#252525' ? '#888' : '#666'};
  display: flex;
  align-items: center;
  pointer-events: none;
  font-size: 1.2rem;
`;

const SidebarSearchInput = styled.input<{ expanded: boolean }>`
  width: ${({ expanded }) => (expanded ? '100%' : '0')};
  opacity: ${({ expanded }) => (expanded ? 1 : 0)};
  transition: width 0.15s ease;
  background: ${({ theme }) => theme.BG === '#252525' ? '#23242a' : '#ffffff'};
  color: ${({ theme }) => theme.BG === '#252525' ? '#e0e0e0' : '#333333'};
  border: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#33384a' : '#e0e0e0'};
  border-radius: 6px;
  padding: 8px 36px 8px 36px;
  font-size: 1rem;
  outline: none;
  margin-left: ${({ expanded }) => (expanded ? '0' : '-9999px')};
  will-change: transform, width;
  transform: translateZ(0);
  backface-visibility: hidden;
  
  &::placeholder {
    color: ${({ theme }) => theme.BG === '#252525' ? '#888888' : '#999999'};
  }
  
  &:focus {
    border-color: ${({ theme }) => theme.BG === '#252525' ? '#4a6cf7' : '#4a6cf7'};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.BG === '#252525' ? 'rgba(74, 108, 247, 0.2)' : 'rgba(74, 108, 247, 0.1)'};
  }
`;

const ClearSearchButton = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: ${({ theme }) => theme.BG === '#252525' ? '#aaa' : '#777'};
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  z-index: 2;
  transition: color 0.15s ease, transform 0.1s ease;
  will-change: color, transform;
  &:hover {
    color: ${({ theme }) => theme.BG === '#252525' ? '#fff' : '#333'};
    transform: translateY(-50%) scale(1.1);
  }
  &:active {
    transform: translateY(-50%) scale(0.9);
  }
`;

const SubmenuParent = styled.span`
  display: block;
  font-size: 0.85em;
  color: #aaa;
  margin-left: 36px;
  margin-top: -4px;
`;

const SidebarLogoWrapper = styled.div`
  width: 48px;
  height: 48px;
  margin: 14px auto 8px auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${({ theme }) => theme.BG === '#252525' ? '#23242a' : '#ffffff'};
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  border: 1px solid ${({ theme }) => theme.BG === '#252525' ? 'transparent' : '#e0e0e0'};
`;

const SidebarLogoIcon = styled.img`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid ${({ theme }) => theme.BG === '#252525' ? '#33384a' : '#e0e0e0'};
`;

// Memoized backdrop component
const Backdrop = memo(({ onClose, visible }: { onClose: () => void; visible: boolean }) => (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.32)',
      zIndex: 2999,
      opacity: visible ? 1 : 0,
      transition: `opacity 0.2s ${MOBILE_TRANSITION_TIMING}`,
      pointerEvents: visible ? 'auto' : 'none',
    }}
    onClick={onClose}
  />
));

// Memoized search result item
const SearchResultItem = memo(({ 
  result, 
  expanded, 
  onNavigate, 
  onClose 
}: { 
  result: any; 
  expanded: boolean; 
  onNavigate: (path: string) => void; 
  onClose: () => void; 
}) => (
  <SidebarMenuItem expanded={expanded} dashboard={result.text === 'Dashboard'}>
    <MenuItemButton
      expanded={expanded}
      dashboard={result.text === 'Dashboard'}
      onClick={() => {
        if (result.path) {
          onNavigate(result.path);
          onClose();
        }
      }}
    >
      <IconWrapper expanded={expanded}>{result.icon}</IconWrapper>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
        <Label expanded={expanded}>{result.text}</Label>
        {expanded && result.category && result.category !== 'Main' && (
          <span style={{ 
            fontSize: '0.75rem', 
            color: '#888', 
            marginTop: '2px',
            opacity: 0.8
          }}>
            {result.category}
          </span>
        )}
      </div>
    </MenuItemButton>
  </SidebarMenuItem>
));

// Memoized menu item
const MenuItem = memo(({ 
  item, 
  idx, 
  expanded, 
  openDrawer, 
  onNavigate, 
  onClose, 
  setOpenDrawer,
  userRole
}: { 
  item: any; 
  idx: number; 
  expanded: boolean; 
  openDrawer: number | null; 
  onNavigate: (path: string) => void; 
  onClose: () => void; 
  setOpenDrawer: (idx: number | null) => void; 
  userRole: string;
}) => {
  const handleClick = useCallback(() => {
    if (item.path) {
      onNavigate(item.path);
      setOpenDrawer(null);
      onClose();
    }
  }, [item.path, setOpenDrawer, onNavigate, onClose]);

  return (
    <SidebarMenuItem key={item.text} expanded={expanded} dashboard={item.text === 'Dashboard'}>
      <MenuItemButton
        expanded={expanded}
        dashboard={item.text === 'Dashboard'}
        onClick={handleClick}
      >
        <IconWrapper expanded={expanded}>{item.icon}</IconWrapper>
        <Label expanded={expanded}>{item.text}</Label>
      </MenuItemButton>
    </SidebarMenuItem>
  );
});

// Comprehensive page database for global search
const allPages = [
  // Main Navigation Pages
  {
    text: 'Welcome Page',
    icon: <HomeIcon />,
    path: '/teacher',
    allowedRoles: ['Teacher'],
    category: 'Main',
    keywords: ['welcome', 'home', 'teacher', 'dashboard']
  },
  {
    text: 'Dashboard',
    icon: <HomeIcon />,
    path: '/dashboard',
    allowedRoles: ['Super Admin', 'Principal', 'Admin'],
    category: 'Main',
    keywords: ['dashboard', 'home', 'overview', 'main']
  },
  {
    text: 'Students',
    icon: <PeopleIcon />,
    path: '/students',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Academic Head'],
    category: 'Main',
    keywords: ['students', 'pupils', 'learners', 'enrollment']
  },
  {
    text: 'Attendance',
    icon: <AssessmentIcon />,
    path: '/attendance',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher'],
    category: 'Main',
    keywords: ['attendance', 'present', 'absent', 'marking']
  },
  {
    text: 'Reports',
    icon: <ListAltIcon />,
    path: '/reports',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher'],
    category: 'Main',
    keywords: ['reports', 'analytics', 'statistics', 'data']
  },
  {
    text: 'Fine Management',
    icon: <MoneyIcon />,
    path: '/fines',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Accountant'],
    category: 'Main',
    keywords: ['fines', 'penalties', 'money', 'collection']
  },
  {
    text: 'Fee Management',
    icon: <AttachMoneyIcon />,
    path: '/fee-management',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Accountant'],
    category: 'Main',
    keywords: ['fees', 'payments', 'tuition', 'billing']
  },
  {
    text: 'Enquiry Management',
    icon: <QuestionAnswerIcon />,
    path: '/enquiries',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Accountant'],
    category: 'Main',
    keywords: ['enquiry', 'inquiry', 'admission', 'questions']
  },
  {
    text: 'Timetable',
    icon: <CalendarMonthIcon />,
    path: '/timetable',
    allowedRoles: ['Super Admin', 'Principal', 'Admin'],
    category: 'Main',
    keywords: ['timetable', 'schedule', 'classes', 'periods']
  },
  {
    text: 'Employees',
    icon: <SchoolIcon />,
    path: '/employees',
    allowedRoles: ['Super Admin', 'Principal', 'Admin'],
    category: 'Main',
    keywords: ['employees', 'staff', 'teachers', 'workers']
  },
  {
    text: 'Examination',
    icon: <AssessmentIcon />,
    path: '/examination',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher'],
    category: 'Main',
    keywords: ['examination', 'exams', 'tests', 'assessment']
  },
  {
    text: 'Daily Diary',
    icon: <Assignment />,
    path: '/homework-diary',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher'],
    category: 'Main',
    keywords: ['homework', 'diary', 'assignment', 'daily homework', 'homework diary', 'daily diary']
  },
  {
    text: 'Test Record',
    icon: <QuizIcon />,
    path: '/test-dashboard',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher'],
    category: 'Main',
    keywords: ['test record', 'test management', 'quiz', 'test', 'assignment', 'practice']
  },
  {
    text: 'Settings',
    icon: <SettingsIcon />,
    path: '/settings',
    allowedRoles: ['Super Admin', 'Principal', 'Admin'],
    category: 'Main',
    keywords: ['settings', 'configuration', 'preferences', 'options']
  },
  {
    text: 'Schools Management',
    icon: <BusinessIcon />,
    path: '/schools',
    allowedRoles: ['Super Admin', 'Principal'],
    category: 'Main',
    keywords: ['schools', 'institutions', 'management', 'multi-school']
  },

  // Student Management Pages
  {
    text: 'Add Student',
    icon: <PeopleIcon />,
    path: '/students/add',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Academic Head'],
    category: 'Students',
    keywords: ['add student', 'register', 'new student', 'enrollment']
  },
  {
    text: 'Bulk Add Students',
    icon: <PeopleIcon />,
    path: '/students/bulk-add',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Academic Head'],
    category: 'Students',
    keywords: ['bulk add', 'multiple students', 'import', 'batch']
  },
  {
    text: 'Student Status',
    icon: <PeopleIcon />,
    path: '/students/status',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Academic Head'],
    category: 'Students',
    keywords: ['student status', 'active', 'inactive', 'enrollment status']
  },
  {
    text: 'Student Promotion',
    icon: <PeopleIcon />,
    path: '/students/promotion',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Academic Head'],
    category: 'Students',
    keywords: ['promotion', 'class transfer', 'upgrade', 'advancement']
  },
  {
    text: 'Family Management',
    icon: <PeopleIcon />,
    path: '/students/family',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Academic Head'],
    category: 'Students',
    keywords: ['family', 'parents', 'guardians', 'emergency contacts']
  },

  // Fine Management Pages
  {
    text: 'Collect Fine',
    icon: <MoneyIcon />,
    path: '/fines/collect',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Accountant'],
    category: 'Fines',
    keywords: ['collect fine', 'fine payment', 'penalty collection']
  },
  {
    text: 'Fine History',
    icon: <MoneyIcon />,
    path: '/fines/history',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Accountant'],
    category: 'Fines',
    keywords: ['fine history', 'payment history', 'fine records']
  },
  {
    text: 'Fine Reports',
    icon: <MoneyIcon />,
    path: '/fines/reports',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Accountant'],
    category: 'Fines',
    keywords: ['fine reports', 'fine analytics', 'fine statistics']
  },

  // Fee Management Pages
  {
    text: 'Fee Structure',
    icon: <AttachMoneyIcon />,
    path: '/fee-structure-management',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Accountant'],
    category: 'Fees',
    keywords: ['fee structure', 'fee setup', 'fee configuration']
  },
  {
    text: 'Load Fee',
    icon: <AttachMoneyIcon />,
    path: '/load-fee',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Accountant'],
    category: 'Fees',
    keywords: ['load fee', 'import fees', 'bulk fee', 'fee upload']
  },
  {
    text: 'Fee Collection',
    icon: <AttachMoneyIcon />,
    path: '/fee-collection',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Accountant'],
    category: 'Fees',
    keywords: ['fee collection', 'payment collection', 'fee payment']
  },
  {
    text: 'Fee Defaulters',
    icon: <AttachMoneyIcon />,
    path: '/fee-defaulters',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Accountant'],
    category: 'Fees',
    keywords: ['fee defaulters', 'outstanding fees', 'pending payments']
  },
  {
    text: 'Fee Audit Logs',
    icon: <AttachMoneyIcon />,
    path: '/fee-audit-logs',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Accountant'],
    category: 'Fees',
    keywords: ['fee audit', 'fee logs', 'fee history', 'audit trail']
  },
  {
    text: 'Fee Analytics',
    icon: <AttachMoneyIcon />,
    path: '/fee-analytics',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Accountant'],
    category: 'Fees',
    keywords: ['fee analytics', 'fee reports', 'fee statistics', 'fee insights']
  },

  // Examination Pages
  {
    text: 'Manage Examinations',
    icon: <AssessmentIcon />,
    path: '/examinations',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher'],
    category: 'Examination',
    keywords: ['examinations', 'exam management', 'test setup']
  },
  {
    text: 'Marks Entry',
    icon: <AssessmentIcon />,
    path: '/marks-entry',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher'],
    category: 'Examination',
    keywords: ['marks entry', 'grade entry', 'score entry', 'results']
  },
  {
    text: 'Master Sheets',
    icon: <AssessmentIcon />,
    path: '/master-sheets',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher'],
    category: 'Examination',
    keywords: ['master sheets', 'result sheets', 'grade sheets']
  },
  {
    text: 'DMC Generation',
    icon: <AssessmentIcon />,
    path: '/dmc-generation',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher'],
    category: 'Examination',
    keywords: ['dmc', 'marks certificate', 'result certificate', 'transcript']
  },
  {
    text: 'Position Holders',
    icon: <AssessmentIcon />,
    path: '/position-holders',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher'],
    category: 'Examination',
    keywords: ['position holders', 'rankings', 'top students', 'merit list']
  },
  {
    text: 'Exam Analytics',
    icon: <AssessmentIcon />,
    path: '/exam-analytics',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher'],
    category: 'Examination',
    keywords: ['exam analytics', 'exam reports', 'performance analysis']
  },
  {
    text: 'Manage Subjects',
    icon: <AssessmentIcon />,
    path: '/subjects',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher'],
    category: 'Examination',
    keywords: ['subjects', 'subject management', 'courses', 'curriculum']
  },

  // Settings Pages
  {
    text: 'Institute Profile',
    icon: <SettingsIcon />,
    path: '/settings/institute-profile',
    allowedRoles: ['Super Admin', 'Principal', 'Admin'],
    category: 'Settings',
    keywords: ['institute profile', 'school profile', 'institution details']
  },
  {
    text: 'Classes',
    icon: <SettingsIcon />,
    path: '/settings/classes',
    allowedRoles: ['Super Admin', 'Principal', 'Admin'],
    category: 'Settings',
    keywords: ['classes', 'class management', 'sections', 'divisions']
  },
  {
    text: 'Sessions',
    icon: <SettingsIcon />,
    path: '/settings/sessions',
    allowedRoles: ['Super Admin', 'Principal', 'Admin'],
    category: 'Settings',
    keywords: ['sessions', 'academic year', 'terms', 'periods']
  },
  {
    text: 'Holidays',
    icon: <SettingsIcon />,
    path: '/settings/holidays',
    allowedRoles: ['Super Admin', 'Principal', 'Admin'],
    category: 'Settings',
    keywords: ['holidays', 'vacations', 'non-working days', 'calendar']
  },
  {
    text: 'User Management',
    icon: <SettingsIcon />,
    path: '/settings/user-management',
    allowedRoles: ['Super Admin', 'Principal', 'Admin'],
    category: 'Settings',
    keywords: ['user management', 'users', 'accounts', 'permissions']
  },

  // Employee Pages
  {
    text: 'Add Employee',
    icon: <SchoolIcon />,
    path: '/employees/add',
    allowedRoles: ['Super Admin', 'Principal', 'Admin'],
    category: 'Employees',
    keywords: ['add employee', 'new employee', 'staff registration']
  },
  {
    text: 'Employee List',
    icon: <SchoolIcon />,
    path: '/employees/list',
    allowedRoles: ['Super Admin', 'Principal', 'Admin'],
    category: 'Employees',
    keywords: ['employee list', 'staff list', 'all employees']
  },
  {
    text: 'Employee Attendance',
    icon: <SchoolIcon />,
    path: '/employees/attendance',
    allowedRoles: ['Super Admin', 'Principal', 'Admin'],
    category: 'Employees',
    keywords: ['employee attendance', 'staff attendance', 'work hours']
  },
  {
    text: 'Employee Reports',
    icon: <SchoolIcon />,
    path: '/employees/reports',
    allowedRoles: ['Super Admin', 'Principal', 'Admin'],
    category: 'Employees',
    keywords: ['employee reports', 'staff reports', 'employee analytics']
  },

  // Attendance Pages
  {
    text: 'Mark Attendance',
    icon: <AssessmentIcon />,
    path: '/attendance/mark',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher'],
    category: 'Attendance',
    keywords: ['mark attendance', 'take attendance', 'record attendance']
  },
  {
    text: 'Attendance Reports',
    icon: <AssessmentIcon />,
    path: '/attendance/reports',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher'],
    category: 'Attendance',
    keywords: ['attendance reports', 'attendance analytics', 'attendance statistics']
  },
  {
    text: 'Attendance History',
    icon: <AssessmentIcon />,
    path: '/attendance/history',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher'],
    category: 'Attendance',
    keywords: ['attendance history', 'past attendance', 'attendance records']
  },

  // Enquiry Pages
  {
    text: 'Enquiry Dashboard',
    icon: <QuestionAnswerIcon />,
    path: '/enquiries/dashboard',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Accountant'],
    category: 'Enquiry',
    keywords: ['enquiry dashboard', 'inquiry overview', 'enquiry summary']
  },
  {
    text: 'All Enquiries',
    icon: <QuestionAnswerIcon />,
    path: '/enquiries/list',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Accountant'],
    category: 'Enquiry',
    keywords: ['all enquiries', 'enquiry list', 'inquiry list', 'manage enquiries']
  },
  {
    text: 'New Enquiry',
    icon: <QuestionAnswerIcon />,
    path: '/enquiries/create',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Accountant'],
    category: 'Enquiry',
    keywords: ['new enquiry', 'create enquiry', 'add inquiry', 'register enquiry']
  },
];

// Main menu items for sidebar navigation (exclude Welcome Page from sidebar)
const menuItems = allPages.filter(page => page.category === 'Main' && page.text !== 'Welcome Page');

interface CollapsibleSidebarProps {
  navigate: NavigateFunction;
  theme: any;
  userRole: string;
  instituteProfile?: { logo_url?: string; short_name?: string };
  open: boolean;
  onClose: () => void;
  onAboutUsClick?: () => void;
}

const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({ navigate, theme, userRole, instituteProfile, open, onClose, onAboutUsClick }) => {
  const { user } = useAuth() as any;
  const [expanded, setExpanded] = useState(false);
  const [openDrawer, setOpenDrawer] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);
  const [search, setSearch] = useState('');
  const prevExpanded = React.useRef(expanded);
  const resizeTimeoutRef = useRef<number>();
  const touchStartXRef = useRef<number>(0);
  const [renderSettings, setRenderSettings] = useState<RenderSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Fetch guest render settings
  useEffect(() => {
    if (userRole === 'Guest' && user?.school_id) {
      setSettingsLoading(true);
      fetchRenderSettings(user.school_id)
        .then(s => setRenderSettings(s))
        .catch(() => setRenderSettings(null))
        .finally(() => setSettingsLoading(false));
    } else {
      setRenderSettings(null);
      setSettingsLoading(false);
    }
  }, [userRole, user?.school_id]);

  // Map menu text to guest menu setting key
  const getGuestMenuKey = useCallback((text: string): string | null => {
    switch (text) {
      case 'Dashboard': return 'menu_dashboard';
      case 'Students': return 'menu_students';
      case 'Attendance': return 'menu_attendance';
      case 'Reports': return 'menu_reports';
      case 'Fine Management': return 'menu_fines';
      case 'Fee Management': return 'menu_fee_management';
      case 'Enquiry Management': return 'menu_enquiries';
      case 'Timetable': return 'menu_timetable';
      case 'Employees': return 'menu_employees';
      case 'Examination': return 'menu_examination';
      case 'Daily Diary': return 'menu_daily_diary';
      case 'Test Record': return 'menu_test_record';
      case 'Settings': return 'menu_settings';
      case 'Schools Management': return 'menu_schools_management';
      default: return null;
    }
  }, []);

  // Optimized resize handler with RAF and debouncing
  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      window.cancelAnimationFrame(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = window.requestAnimationFrame(() => {
      const newIsMobile = window.innerWidth <= 700;
      if (newIsMobile !== isMobile) {
        setIsMobile(newIsMobile);
        if (!newIsMobile) {
          setExpanded(false);
        }
      }
    });
  }, [isMobile]);

  // Cleanup resize handler
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        window.cancelAnimationFrame(resizeTimeoutRef.current);
      }
    };
  }, []);

  // Touch handlers for swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    
    const touchX = e.touches[0].clientX;
    const diff = touchX - touchStartXRef.current;
    
    // Only handle left swipe when menu is open
    if (expanded && diff < -50) {
      onClose();
    }
    // Only handle right swipe when menu is closed and touch starts near left edge
    else if (!expanded && diff > 50 && touchStartXRef.current < 30) {
      setExpanded(true);
    }
  }, [expanded, isMobile, onClose]);

  // Enhanced swipe gesture handling
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    
    const touchX = e.changedTouches[0].clientX;
    const diff = touchX - touchStartXRef.current;
    const minSwipeDistance = 80; // Minimum distance for swipe gesture
    
    if (Math.abs(diff) >= minSwipeDistance) {
      if (diff > 0 && !expanded && touchStartXRef.current < 50) {
        // Right swipe from left edge - open sidebar
        setExpanded(true);
      } else if (diff < 0 && expanded) {
        // Left swipe when sidebar is open - close sidebar
        onClose();
      }
    }
  }, [expanded, isMobile, onClose]);

  // Global touch handler for swipe-to-open from anywhere on screen
  useEffect(() => {
    if (!isMobile) return;

    let startX = 0;
    let startY = 0;
    let isSwiping = false;

    const handleGlobalTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isSwiping = false;
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!isSwiping) {
        const deltaX = Math.abs(e.touches[0].clientX - startX);
        const deltaY = Math.abs(e.touches[0].clientY - startY);
        
        // Start swiping if horizontal movement is greater than vertical
        if (deltaX > 20 && deltaX > deltaY) {
          isSwiping = true;
        }
      }
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (!isSwiping) return;
      
      const deltaX = e.changedTouches[0].clientX - startX;
      const deltaY = Math.abs(e.changedTouches[0].clientY - startY);
      
      // Only handle horizontal swipes with minimal vertical movement
      if (Math.abs(deltaX) > 80 && deltaY < 100) {
        if (deltaX > 0 && startX < 50 && !expanded) {
          // Right swipe from left edge - open sidebar
          setExpanded(true);
        } else if (deltaX < 0 && expanded) {
          // Left swipe when sidebar is open - close sidebar
          onClose();
        }
      }
    };

    document.addEventListener('touchstart', handleGlobalTouchStart, { passive: true });
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: true });
    document.addEventListener('touchend', handleGlobalTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleGlobalTouchStart);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isMobile, expanded, onClose]);

  // Listen for closeSidebar events
  useEffect(() => {
    const handleCloseSidebar = () => {
      setExpanded(false);
      onClose();
    };

    document.addEventListener('closeSidebar', handleCloseSidebar);
    return () => {
      document.removeEventListener('closeSidebar', handleCloseSidebar);
    };
  }, [onClose]);

  // Responsive: update isMobile on resize with optimized handler
  useEffect(() => {
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Mobile: expanded state management
  useEffect(() => {
    if (isMobile) {
      if (open) {
        requestAnimationFrame(() => setExpanded(true));
      } else {
        requestAnimationFrame(() => {
          setExpanded(false);
          setOpenDrawer(null);
          setSearch('');
        });
      }
    }
  }, [open, isMobile]);

  // Memoized filtered menu items
  const filteredMenuItems = useMemo(() => {
    return menuItems
    .filter(item => {
      if (!userRole) return false;
      // For teachers, show Welcome Page, Attendance, Reports, Examination, Daily Diary, and Test Record
      if (userRole === 'Teacher') {
        return item.text === 'Attendance' ||
               item.text === 'Welcome Page' ||
               item.text === 'Reports' ||
               item.text === 'Examination' ||
               item.text === 'Daily Diary' ||
               item.text === 'Test Record';
      }
      // For Guests: bypass role filter and control via render settings
      if (userRole === 'Guest') {
        const key = getGuestMenuKey(item.text);
        if (!key) return true;
        if (!renderSettings) return true; // default allow before load
        return renderSettings.guest?.[key] !== false;
      }
      // Other roles: enforce allowedRoles as usual
      return item.allowedRoles?.includes(userRole);
    })
    .filter(item => {
      // Filter main menu by search
      if (!search) return true;
      return item.text.toLowerCase().includes(search.toLowerCase());
    });
  }, [userRole, search, renderSettings, getGuestMenuKey]);

  // Memoized comprehensive search results
  const flatSearchResults = useMemo(() => {
    if (!search) return [];
    
    const searchTerm = search.toLowerCase();
    
    return allPages
      .filter(page => {
        // Role-based filtering
        if (!userRole || !page.allowedRoles) return false;
        if (userRole === 'Teacher') {
          return page.text === 'Attendance' || 
                 page.text === 'Welcome Page' || 
                 page.text === 'Reports' || 
                 page.text === 'Test Record' ||
                 page.text === 'Examination' ||
                 page.text === 'Daily Diary' ||
                 page.category === 'Attendance' || 
                 page.category === 'Examination';
        }
        return page.allowedRoles.includes(userRole);
      })
      .filter(page => {
        // Comprehensive search matching
        const textMatch = page.text.toLowerCase().includes(searchTerm);
        const keywordMatch = page.keywords.some(keyword => 
          keyword.toLowerCase().includes(searchTerm)
        );
        const categoryMatch = page.category.toLowerCase().includes(searchTerm);
        
        return textMatch || keywordMatch || categoryMatch;
      })
      .map(page => ({
        type: 'page',
        icon: page.icon,
        text: page.text,
        path: page.path,
        category: page.category,
        page,
      }))
      .sort((a, b) => {
        // Prioritize exact matches and main menu items
        const aExact = a.text.toLowerCase() === searchTerm;
        const bExact = b.text.toLowerCase() === searchTerm;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Then prioritize main menu items
        const aMain = a.category === 'Main';
        const bMain = b.category === 'Main';
        if (aMain && !bMain) return -1;
        if (!aMain && bMain) return 1;
        
        // Finally sort alphabetically
        return a.text.localeCompare(b.text);
      });
  }, [search, userRole]);

  // Optimize mouse handlers
  const handleMouseEnter = useCallback(() => {
    if (!isMobile) {
      requestAnimationFrame(() => setExpanded(true));
    }
  }, [isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (!isMobile) {
      requestAnimationFrame(() => setExpanded(false));
    }
  }, [isMobile]);

  // Mobile: toggle with menu button
  const handleMenuClick = useCallback(() => {
    setExpanded((v) => !v);
  }, []);

  // Clear search when sidebar collapses
  useEffect(() => {
    if (prevExpanded.current && !expanded) {
      setSearch('');
    }
    prevExpanded.current = expanded;
  }, [expanded]);

  // Memoized navigation handler
  const handleNavigate = useCallback((path: string) => {
    navigate(path);
    setOpenDrawer(null);
    onClose();
  }, [navigate, onClose]);

  // Memoized search change handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  // Memoized clear search handler
  const handleClearSearch = useCallback(() => {
    setSearch('');
  }, []);

  // Memoized close handler
  const handleClose = useCallback(() => {
    setExpanded(false);
    onClose();
  }, [onClose]);

  // --- RENDER LOGIC ---
  // On mobile, only render if open. On desktop, always render.
  if (isMobile && !open && !expanded) return null;

  return (
    <ThemeProvider theme={theme}>
      {isMobile && <Backdrop onClose={onClose} visible={expanded} />}
      <SidebarContainer
        expanded={expanded}
        isMobile={isMobile}
        data-sidebar="true"
        onMouseEnter={!isMobile ? handleMouseEnter : undefined}
        onMouseLeave={!isMobile ? handleMouseLeave : undefined}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchMove={isMobile ? handleTouchMove : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        style={{ position: 'fixed', left: 0, top: 0, zIndex: 3000 }}
      >
        {/* Show logo at top only when collapsed, or fallback icon */}
        {!expanded && (
          <SidebarLogoWrapper>
            {instituteProfile?.logo_url ? (
              <SidebarLogoIcon src={instituteProfile.logo_url} alt="Institute Logo" />
            ) : (
              <SchoolIcon style={{ fontSize: 32, color: theme.ACCENT || '#4a6cf7' }} />
            )}
          </SidebarLogoWrapper>
        )}
        {expanded && (
          <SidebarHeader>
            {isMobile && (
              <MenuButton
                onClick={handleClose}
                aria-label="Close menu"
              >
                <MenuIcon />
              </MenuButton>
            )}

            <SidebarSearchWrapper>
              <SearchIconWrapper>
                <SearchIcon style={{ fontSize: '1.2rem' }} />
              </SearchIconWrapper>
              <SidebarSearchInput
                expanded={expanded}
                type="text"
                placeholder="Search all pages..."
                value={search}
                onChange={handleSearchChange}
                aria-label="Search all pages"
                style={{ flex: 1 }}
              />
              {search && expanded && (
                <ClearSearchButton
                  type="button"
                  aria-label="Clear search"
                  onClick={handleClearSearch}
                >
                  <CloseIcon style={{ fontSize: '1.2rem' }} />
                </ClearSearchButton>
              )}
            </SidebarSearchWrapper>
          </SidebarHeader>
        )}
        <SidebarMenu>
          {search ? (
            flatSearchResults.length === 0 ? (
              <li style={{ padding: '16px', color: '#888' }}>No results found.</li>
            ) : (
              flatSearchResults.map((result, idx) => (
                <SearchResultItem
                  key={result.text + idx}
                  result={result}
                    expanded={expanded}
                  onNavigate={handleNavigate}
                  onClose={onClose}
                />
              ))
            )
          ) : (
            filteredMenuItems.map((item, idx) => (
              <MenuItem
                key={item.text}
                item={item}
                idx={idx}
                    expanded={expanded}
                openDrawer={openDrawer}
                onNavigate={handleNavigate}
                onClose={onClose}
                setOpenDrawer={setOpenDrawer}
                userRole={userRole}
              />
            ))
          )}
        </SidebarMenu>
        
        {/* Simple About Us Button */}
        {expanded && (
          <AboutUsButton 
            onClick={() => {
              if (onAboutUsClick) {
                onAboutUsClick();
              } else {
                handleNavigate('/about');
              }
              onClose();
            }}
            title="About Grow More"
            expanded={expanded}
          >
            <InfoIcon />
          </AboutUsButton>
        )}
      </SidebarContainer>
    </ThemeProvider>
  );
};

export default memo(CollapsibleSidebar); 