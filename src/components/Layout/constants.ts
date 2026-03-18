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
  BG: '#252525', // Modern Neutral Dark
  SIDEBAR_BG: '#1c1c1c', // Deep neutral
  CARD: '#2c2c2c', // Slightly lighter neutral
  ACCENT: '#6366f1', // Indigo accent
  SHADOW: '0 4px 12px rgba(0, 0, 0, 0.45)',
  TEXT_PRIMARY: '#f8fafc',
  TEXT_SECONDARY: '#94a3b8',
  BORDER: 'rgba(255, 255, 255, 0.05)',
  ICON_BG: 'rgba(99, 102, 241, 0.15)',
  HOVER_BG: 'rgba(99, 102, 241, 0.18)',
  FIELD_BG: '#1c1c1c',
  FIELD_BORDER: '#3d3d3d',
  ACCENT_INPUT: '#6366f1',
  CANCEL_BG: '#2c2c2c',
  CANCEL_COLOR: '#f8fafc',
};

export const lightTheme = {
  BG: '#f0f7ff', // Soft Light Blue
  SIDEBAR_BG: '#ffffff',
  CARD: '#ffffff',
  ACCENT: '#4f46e5', // Indigo-600
  SHADOW: '0 4px 14px rgba(15, 23, 42, 0.03)',
  TEXT_PRIMARY: '#0f172a',
  TEXT_SECONDARY: '#64748b',
  BORDER: 'rgba(226, 232, 240, 0.8)',
  ICON_BG: 'rgba(79, 70, 229, 0.1)',
  HOVER_BG: 'rgba(79, 70, 229, 0.15)',
  FIELD_BG: '#ffffff',
  FIELD_BORDER: '#cbd5e1',
  ACCENT_INPUT: '#4f46e5',
  CANCEL_BG: '#f1f5f9',
  CANCEL_COLOR: '#0f172a',
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

