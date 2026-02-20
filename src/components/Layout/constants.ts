import React from 'react';
import {
  Home as HomeIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  ListAlt as ListAltIcon,
  MonetizationOn as MoneyIcon,
  AttachMoney as AttachMoneyIcon,
  Loyalty as LoyaltyIcon,
  QuestionAnswer as QuestionAnswerIcon,
  CalendarMonth as CalendarMonthIcon,
  School as SchoolIcon,
  Settings,
  Assignment,
} from '@mui/icons-material';
import { MenuItem } from './types';

export const darkTheme = {
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

export const lightTheme = {
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

export const menuItems: MenuItem[] = [
  {
    text: 'Welcome Page',
    icon: React.createElement(HomeIcon),
    path: '/user',
    allowedRoles: ['Teacher']
  },
  {
    text: 'Students',
    icon: React.createElement(PeopleIcon),
    path: '/students',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Academic Head'],
  },
  {
    text: 'Attendance',
    icon: React.createElement(AssessmentIcon),
    path: '/attendance',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher'],
  },
  {
    text: 'Reports',
    icon: React.createElement(ListAltIcon),
    path: '/reports',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher']
  },
  {
    text: 'Fine Management',
    icon: React.createElement(MoneyIcon),
    path: '/fines',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Accountant'],
  },
  {
    text: 'Enquiry Management',
    icon: React.createElement(QuestionAnswerIcon),
    path: '/enquiries',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Accountant'],
  },
  {
    text: 'Timetable',
    icon: React.createElement(CalendarMonthIcon),
    path: '/timetable',
    allowedRoles: ['Super Admin', 'Principal', 'Admin']
  },
  {
    text: 'Employees',
    icon: React.createElement(SchoolIcon),
    path: '/employees',
    allowedRoles: ['Super Admin', 'Principal', 'Admin'],
  },
  {
    text: 'Examination',
    icon: React.createElement(AssessmentIcon),
    path: '/examination',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher'],
  },
  {
    text: 'Daily Diary',
    icon: React.createElement(Assignment),
    path: '/homework-diary',
    allowedRoles: ['Super Admin', 'Principal', 'Admin', 'Teacher'],
  },
  {
    text: 'Settings',
    icon: React.createElement(Settings),
    path: '/settings',
    allowedRoles: ['Super Admin', 'Principal', 'Admin'],
  },
];

export const FONT = `'Inter', 'Segoe UI', Arial, sans-serif`;

export const customHeaderTexts: Record<string, string> = {
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
  '/fee-structure-management': 'Fee Structure',
  '/fee-plans': 'Fee Plans',
  '/fee-increments': 'Fee Increments',
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
};

