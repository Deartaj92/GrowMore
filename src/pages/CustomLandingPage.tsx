import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import styled, { css } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { landingPageService, WidgetWithPreference } from '../services/landingPageService';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import * as Icons from '@mui/icons-material';
import { Assessment as AssessmentIcon, BarChart as BarChartIcon, Assignment as AssignmentIcon, Quiz as QuizIcon, School as SchoolIcon, Schedule as ScheduleIcon, AccessTime as AccessTimeIcon, Person as PersonIcon, Event as EventIcon, CalendarToday as CalendarIcon, LocationOn as LocationIcon, Phone as PhoneIcon, Sms as SmsIcon, WhatsApp as WhatsAppIcon, AccountCircle, AttachMoney as AttachMoneyIcon, EventBusy as EventBusyIcon, Feedback as FeedbackIcon, Lightbulb as LightbulbIcon, Close as CloseIcon, Notifications as NoticeIcon, Warning as WarningIcon, Info as InfoIcon, Error as ErrorIcon } from '@mui/icons-material';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Select, MenuItem, FormControl, InputLabel, Box, Typography, IconButton, Tabs, Tab, Chip, useTheme as useMuiTheme, useMediaQuery, Theme } from '@mui/material';
import { styled as muiStyled } from '@mui/material/styles';
import { useToast } from '../components/useToast';
import Loader from '../components/Loader';
import { examinationService } from '../services/examinationService';
import { Examination } from '../types/examinations';
import { fetchRenderSettings, isTeacherCardVisible, isStudentCardVisible, isParentCardVisible, RenderSettings } from '../services/renderSettingsService';
import { getStudentDisplayId, createStudentSlug } from '../utils/studentUtils';
import { format } from 'date-fns';
import { formatAppDate } from '../utils/dateUtils';
import { isWeb as checkIsWeb } from '../utils/platformDetection';
import { ExpandMore, ExpandLess, Receipt, History as HistoryIcon, CheckCircle, Cancel, Pending, CancelOutlined, ExitToApp as ExitIcon } from '@mui/icons-material';
import { usePageFooter } from '../components/Layout/contexts/PageFooterContext';
import AppDateField from '../components/shared/AppDateField';

// Capacitor import for mobile back button handling
let CapacitorApp: any = null;
try {
  CapacitorApp = require('@capacitor/app').App;
} catch (e) {
  // Capacitor not available, will use fallback
}

const Container = styled.div`
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const WelcomeHeader = styled.div`
  margin-bottom: 2rem;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 0.5rem;
  line-height: 1.2;
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const WidgetsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 2rem;
  width: 100%;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const WidgetCard = styled.div<{ $color?: string }>`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 16px;
  padding: 0;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  min-height: 180px;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, ${({ $color }) => $color || '#3b82f6'}, ${({ $color }) => $color ? `${$color}80` : '#3b82f680'});
    border-radius: 16px 16px 0 0;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, ${({ $color }) => $color ? `${$color}05` : '#3b82f605'} 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-6px) scale(1.02);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
    border-color: ${({ $color }) => $color || '#3b82f6'};
    
    &::after {
      opacity: 1;
    }
  }
  
  &:active {
    transform: translateY(-3px) scale(1.01);
  }
`;

const WidgetHeader = styled.div<{ $color?: string }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 20px 20px 16px 20px;
  position: relative;
  z-index: 1;
`;

const WidgetIcon = styled.div<{ $color?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color, theme }) => $color ? `${$color}15` : theme.ICON_BG};
  color: ${({ $color }) => $color || '#3b82f6'};
  font-size: 24px;
  flex-shrink: 0;
  
  svg {
    width: 24px;
    height: 24px;
  }
`;

const WidgetTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  line-height: 1.3;
  flex: 1;
`;

const WidgetBody = styled.div`
  padding: 0 20px 20px 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  z-index: 1;
`;

const WidgetValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 8px 0;
  line-height: 1;
`;

const WidgetDescription = styled.p`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0;
  line-height: 1.4;
`;

// Notices section styled components
const NoticesSection = styled.div`
  margin-bottom: 3rem;
  width: 100%;
`;

const NoticesTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const NoticesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const NoticeCard = styled.div<{ $noticeType?: string }>`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-left: 4px solid ${({ $noticeType }) => {
    switch ($noticeType) {
      case 'warning': return '#f59e0b';
      case 'urgent': return '#ef4444';
      case 'success': return '#10b981';
      default: return '#3b82f6';
    }
  }};
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border-color: ${({ $noticeType }) => {
      switch ($noticeType) {
        case 'warning': return '#f59e0b';
        case 'urgent': return '#ef4444';
        case 'success': return '#10b981';
        default: return '#3b82f6';
      }
    }};
  }
`;

const NoticeHeader = styled.div`
  display: flex;
  align-items: start;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const NoticeTitleStyled = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const NoticeTypeBadge = styled.span<{ $noticeType?: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  background: ${({ $noticeType }) => {
    switch ($noticeType) {
      case 'warning': return '#f59e0b15';
      case 'urgent': return '#ef444415';
      case 'success': return '#10b98115';
      default: return '#3b82f615';
    }
  }};
  color: ${({ $noticeType }) => {
    switch ($noticeType) {
      case 'warning': return '#f59e0b';
      case 'urgent': return '#ef4444';
      case 'success': return '#10b981';
      default: return '#3b82f6';
    }
  }};
`;

const NoticeDescription = styled.p`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  line-height: 1.6;
  margin: 0;
`;

const WidgetAction = styled.div<{ $color?: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ $color }) => $color || '#3b82f6'};
  font-size: 0.9rem;
  font-weight: 600;
  margin-top: 12px;
  transition: all 0.3s ease;
  
  &::after {
    content: '→';
    transition: transform 0.3s ease;
  }
  
  ${WidgetCard}:hover & {
    transform: translateX(4px);
    
    &::after {
      transform: translateX(6px);
    }
  }
`;

// Teacher-specific styled components (matching WelcomePage)
const WelcomeText = styled.div`
  text-align: center;
  margin-bottom: 1rem;
`;

const WelcomeSmall = styled.div`
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-bottom: 0.2rem;
  font-weight: 400;
`;

const WelcomeLarge = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  line-height: 1;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const GrowText = styled.span`
  color: #ff6b35;
  text-shadow: 0 4px 8px rgba(255, 107, 53, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const MoreText = styled.span`
  color: #3b82f6;
  text-shadow: 0 4px 8px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const QuickLinksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
  margin-top: 2rem;
  width: 100%;
  max-width: 1600px;
  margin-left: auto;
  margin-right: auto;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const QuickLinkCard = styled.div<{ $color?: string }>`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 16px;
  padding: 0;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  height: 200px;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, ${({ $color }) => $color || '#3b82f6'}, ${({ $color }) => $color ? `${$color}80` : '#3b82f680'});
    border-radius: 16px 16px 0 0;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, ${({ $color }) => $color ? `${$color}05` : '#3b82f605'} 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-6px) scale(1.02);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
    border-color: ${({ $color }) => $color || '#3b82f6'};
    
    &::after {
      opacity: 1;
    }
  }
  
  &:active {
    transform: translateY(-3px) scale(1.01);
  }
  
  @media (max-width: 768px) {
    height: 180px;
  }
`;

const CardHeader = styled.div<{ $color?: string }>`
  padding: 20px 20px 12px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    padding: 16px 16px 10px 16px;
    gap: 12px;
  }
`;

const CardIcon = styled.div<{ $color?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, ${({ $color }) => $color || '#3b82f6'}, ${({ $color }) => $color ? `${$color}80` : '#3b82f680'});
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  flex-shrink: 0;
  box-shadow: 0 6px 16px ${({ $color }) => $color ? `${$color}25` : '#3b82f625'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  svg {
    width: 24px !important;
    height: 24px !important;
  }
  
  ${QuickLinkCard}:hover & {
    transform: scale(1.1);
    box-shadow: 0 8px 24px ${({ $color }) => $color ? `${$color}40` : '#3b82f640'};
  }
  
  @media (max-width: 768px) {
    width: 44px;
    height: 44px;
    
    svg {
      width: 20px !important;
      height: 20px !important;
    }
  }
`;

const CardTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  line-height: 1.3;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const CardBody = styled.div`
  padding: 0 20px 20px 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    padding: 0 16px 16px 16px;
  }
`;

const CardDescription = styled.p`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0 0 12px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
    margin: 0 0 10px 0;
    -webkit-line-clamp: 2;
  }
`;

// Student card styled components (matching StudentList.tsx)
const getStatusColor = (status: string) =>
  status === 'active' ? '34,197,94' : // green
    status === 'suspended' ? '245,158,11' : // orange
      status === 'withdrawn' ? '239,68,68' : // red
        '99,102,241'; // blue

const StudentCardGrid = styled.div<{ $hasScroll?: boolean; $columns?: number }>`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  width: 100%;
  padding: 0;
  margin: 0;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  
  @media (max-width: 700px) {
    grid-template-columns: repeat(1, 1fr);
    gap: 8px;
  }
  
  /* Apply scrollbar for both mobile and desktop when there are more than 2 rows */
  ${({ $hasScroll, theme, $columns = 3 }) => $hasScroll && css`
    /* Calculate height for 2 rows: 2 rows × (card height + gap) - gap (last row doesn't need gap) */
    /* Card height is approximately 150px (more compact display), gap is 16px on desktop, 8px on mobile */
    max-height: ${$columns === 1
      ? 'calc(2 * (150px + 8px) - 8px)' /* Mobile: 1 column, 2 rows = 308px */
      : $columns === 2
        ? 'calc(2 * (150px + 16px) - 16px)' /* Tablet: 2 columns, 2 rows = 316px */
        : 'calc(2 * (150px + 16px) - 16px)'}; /* Desktop: 3 columns, 2 rows = 316px */
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 8px;
    -webkit-overflow-scrolling: touch;
    
    /* Custom scrollbar styling */
    scrollbar-width: thin;
    scrollbar-color: ${theme.BG === '#252525'
      ? 'rgba(255, 255, 255, 0.3) transparent'
      : 'rgba(0, 0, 0, 0.3) transparent'};
    
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 3px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: ${theme.BG === '#252525'
      ? 'rgba(255, 255, 255, 0.3)'
      : 'rgba(0, 0, 0, 0.3)'};
      border-radius: 3px;
      
      &:hover {
        background: ${theme.BG === '#252525'
      ? 'rgba(255, 255, 255, 0.5)'
      : 'rgba(0, 0, 0, 0.5)'};
      }
    }
  `}
`;

const StudentCard = styled.div<{ status: string }>`
  background: ${({ theme }) => theme.CARD};
  border-radius: 14px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.18), 0 1.5px 6px rgba(0,0,0,0.10);
  padding: 0;
  position: relative;
  border: 2.5px solid rgba(${({ status }) => getStatusColor(status)}, 0.5);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.18s;
  min-width: 270px;
  max-width: 100%;
  width: 100%;
  cursor: default;
  box-sizing: border-box;
  overflow: hidden;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: rgba(${({ status }) => getStatusColor(status)}, 0.8);
  }
  
  @media (max-width: 700px) {
    min-width: 200px;
  }
`;

const StatusBadge = styled.div<{ status: string }>`
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 600;
  background: ${({ status }) =>
    status === 'active' ? 'rgba(34, 197, 94, 0.15)' :
      status === 'suspended' ? 'rgba(245, 158, 11, 0.15)' :
        status === 'withdrawn' ? 'rgba(239, 68, 68, 0.15)' :
          'rgba(99, 102, 241, 0.15)'};
  color: ${({ status }) =>
    status === 'active' ? 'rgb(21, 128, 61)' :
      status === 'suspended' ? 'rgb(161, 98, 7)' :
        status === 'withdrawn' ? 'rgb(185, 28, 28)' :
          'rgb(67, 56, 202)'};
  box-shadow: none;
  letter-spacing: 0.02em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  line-height: 1;
  border: 1px solid ${({ status }) =>
    status === 'active' ? 'rgba(34, 197, 94, 0.3)' :
      status === 'suspended' ? 'rgba(245, 158, 11, 0.3)' :
        status === 'withdrawn' ? 'rgba(239, 68, 68, 0.3)' :
          'rgba(99, 102, 241, 0.3)'};

  ${({ status }) => status === 'active' && `
    &::before {
      content: '';
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.6;
    }
  `}
`;

const CardImageSection = styled.div`
  width: 100%;
  height: 80px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#f3f4f8'};
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  box-shadow: 0 1px 4px #0001;
  
  @media (max-width: 700px) {
    height: 100px;
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
  }
`;

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.32s cubic-bezier(0.4,0,0.2,1);
  will-change: transform;
  ${StudentCard}:hover & {
    transform: none;
  }
  
  @media (max-width: 700px) {
    transition: transform 0.2s ease;
    transform: translateZ(0);
    backface-visibility: hidden;
  }
`;

const StudentCardAvatar = styled.div`
  width: 120px;
  min-height: 140px;
  align-self: stretch;
  border-radius: 0;
  background: ${({ theme }) => theme.ACCENT + '22'};
  color: ${({ theme }) => theme.ACCENT};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 700;
  flex-shrink: 0;
  overflow: hidden;
  cursor: default;
  transition: all 0.2s ease;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ theme }) => theme.BG === '#252525' ?
    'linear-gradient(45deg, rgba(255,255,255,0.1), transparent)' :
    'linear-gradient(45deg, rgba(0,0,0,0.05), transparent)'};
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover::after {
    opacity: 1;
  }
  
  @media (max-width: 700px) {
    width: 90px;
    min-height: 120px;
    font-size: 2rem;
  }
`;

const StudentCardTop = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0;
  max-height: 140px;
  
  @media (max-width: 700px) {
    max-height: 120px;
  }
`;

const StudentCardName = styled.h3`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
`;

const StudentCardFatherName = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.92rem;
  margin-bottom: 0.1rem;
`;

const StudentCardDetails = styled.p`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.9rem;
  margin: 0.25rem 0;
`;

const CardActions = styled.div<{ offsetTop?: boolean; $active?: boolean }>`
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  flex-direction: row;
  gap: 4px;
  opacity: 0;
  pointer-events: none;
  z-index: 3;
  transition: opacity 0.18s, transform 0.18s;
  width: auto;
  
  @media (min-width: 701px) {
    ${StudentCard}:hover & {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }
  }
  
  @media (max-width: 700px) {
    opacity: ${({ $active }) => $active ? 1 : 0};
    pointer-events: ${({ $active }) => $active ? 'auto' : 'none'};
    transition: opacity 0.2s ease;
  }
`;

const CardActionBtn = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: #4a6cf7;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  transition: background 0.18s, color 0.18s, transform 0.18s;
  cursor: pointer;
  &:hover {
    background: #3a5ce5;
    transform: scale(1.12);
  }
`;

const StudentCardContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  background: none;
  padding: 0 6px;
`;

const CardIdBadge = styled.span`
  position: absolute;
  top: 4px;
  right: 4px;
  background: #6366f1;
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  box-shadow: 0 1px 2px #0002;
  z-index: 3;
  letter-spacing: 0.2px;
  border: 1px solid #fff3;
`;

const CardAction = styled.div<{ $color?: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ $color }) => $color || '#3b82f6'};
  font-size: 0.9rem;
  font-weight: 600;
  margin-top: auto;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &::after {
    content: '→';
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 1rem;
    display: inline-block;
  }
  
  ${QuickLinkCard}:hover & {
    transform: translateX(2px);
    
    &::after {
      transform: translateX(6px) scale(1.1);
    }
  }
  
  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

const CardDivider = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: block;
    height: 1px;
    background: ${({ theme }) => theme.BORDER};
    margin: 8px 0;
    opacity: 0.5;
  }
`;

// Events section styled components
const EventsSection = styled.div`
  margin-bottom: 3rem;
  width: 100%;
`;

const LinkedStudentsCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 16px;
  padding: 1.5rem;
  margin-top: 2rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  @media (max-width: 768px) {
    padding: 1rem;
    margin-top: 1.5rem;
  }
`;

const LinkedStudentsCardHeader = styled.div`
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const LinkedStudentsCardTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const TotalRemainingFee = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(239, 68, 68, 0.15)'
    : 'rgba(239, 68, 68, 0.1)'};
  border: 1px solid ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(239, 68, 68, 0.3)'
    : 'rgba(239, 68, 68, 0.2)'};
  border-radius: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.BG === '#252525'
    ? '#fca5a5'
    : '#dc2626'};
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
`;

const FeeAmount = styled.span`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.BG === '#252525'
    ? '#ef4444'
    : '#b91c1c'};
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const FeeInfoCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 1rem;
  margin-top: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    margin-top: 1rem;
  }
`;

const FeeInfoCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

const FeeInfoCardTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const TotalFeeBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(239, 68, 68, 0.15)'
    : 'rgba(239, 68, 68, 0.1)'};
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.BG === '#252525'
    ? '#ef4444'
    : '#b91c1c'};
  
  span:last-child {
    font-size: 1.9rem;
    
    @media (max-width: 768px) {
      font-size: 1.8rem;
    }
  }
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
    padding: 0.5rem;
  }
`;

const StudentFeeCardsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const StudentFeeCard = styled.div`
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(0, 0, 0, 0.02)'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-left: 3px solid ${({ theme }) => theme.BG === '#252525' ? '#ef4444' : '#dc2626'};
  border-radius: 8px;
  padding: 0.75rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.03)'};
  }
  
  @media (max-width: 768px) {
    padding: 0.625rem;
  }
`;

const StudentFeeCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.625rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const StudentFeeCardName = styled.div`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const StudentFeeCardTotal = styled.div`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ theme }) => theme.BG === '#252525'
    ? '#ef4444'
    : '#b91c1c'};
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

// Helper functions for fee display
const formatCurrency = (amount: number): string => {
  return `Rs. ${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)}`;
};

const formatDate = (date: string): string => {
  try {
    return format(new Date(date), 'dd MMM yyyy');
  } catch {
    return date;
  }
};

// Styled components for ledger-style display
const FeeTableContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  overflow: hidden;
  margin-top: 1rem;
`;

const FeeTableWrapper = styled.div`
  overflow-x: auto;
`;

const FeeTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
  table-layout: fixed;
  
  thead tr {
    display: table-row;
  }
  
  thead th {
    display: table-cell;
  }
  
  tbody tr {
    display: table-row;
  }
  
  tbody td {
    display: table-cell;
  }
`;

const FeeTableHeader = styled.thead`
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(0, 0, 0, 0.02)'};
  display: table-header-group;
`;

const FeeTableHeaderCell = styled.th`
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  white-space: nowrap;
  vertical-align: middle;
  width: auto;
`;

const FeeTableBody = styled.tbody``;

const FeeTableRow = styled.tr<{ $isExpanded?: boolean }>`
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  transition: background 0.2s ease;
  display: table-row;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(0, 0, 0, 0.02)'};
  }
`;

const FeeTableCell = styled.td`
  padding: 1rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  vertical-align: middle;
  white-space: nowrap;
`;

const ExpandButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.03)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(0, 0, 0, 0.05)'};
    transform: translateY(-1px);
  }
`;

const ExpandedRow = styled.tr`
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.02)'
    : 'rgba(0, 0, 0, 0.01)'};
`;

const ExpandedCell = styled.td`
  padding: 0;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

const ExpandedContent = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT || '#6366f1'};
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InvoiceTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
`;

const InvoiceTableHeader = styled.thead`
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(0, 0, 0, 0.02)'};
`;

const InvoiceTableHeaderCell = styled.th`
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

const InvoiceTableRow = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.02)'
    : 'rgba(0, 0, 0, 0.01)'};
  }
`;

const InvoiceTableCell = styled.td`
  padding: 0.75rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const InvoiceStatusBadge = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  
  ${({ $status }) => {
    if ($status === 'paid') {
      return `
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
      `;
    } else if ($status === 'partial') {
      return `
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
      `;
    } else {
      return `
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      `;
    }
  }}
`;

const FeeItemsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const FeeItemRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr;
  gap: 0.75rem;
  padding: 0.5rem 0.625rem;
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.02)'
    : 'rgba(0, 0, 0, 0.01)'};
  border-radius: 6px;
  align-items: center;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.25rem;
    padding: 0.5rem;
  }
`;

const FeeItemName = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 500;
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }
`;

const FeeItemDueDate = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  @media (max-width: 768px) {
    font-size: 0.75rem;
    &::before {
      content: 'Due: ';
      font-weight: 600;
    }
  }
`;

const FeeItemAmount = styled.div`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${({ theme }) => theme.BG === '#252525'
    ? '#ef4444'
    : '#b91c1c'};
  text-align: right;
  
  @media (max-width: 768px) {
    text-align: left;
    font-size: 0.8rem;
    &::before {
      content: 'Amount: ';
      font-weight: 600;
      color: ${({ theme }) => theme.TEXT_SECONDARY};
      margin-right: 0.25rem;
    }
  }
`;

const EventsTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const EventsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

// Quick Actions section styled components
const QuickActionsSection = styled.div`
  margin-bottom: 2rem;
  width: 100%;
`;

const QuickActionsTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const QuickActionsCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ef4444, #f59e0b);
    border-radius: 12px 12px 0 0;
  }

  @media (max-width: 768px) {
    padding: 1rem;
    border-radius: 10px;
    
    &::before {
      height: 2px;
    }
  }
`;

const QuickActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 0.5rem;
  }
`;

const QuickActionItem = styled.div<{ $color?: string }>`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f8f9fa'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 10px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: ${({ $color }) => $color || '#3b82f6'};
    background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#ffffff'};
  }
  
  @media (max-width: 768px) {
    padding: 0.6rem 0.5rem;
    gap: 0.4rem;
    border-radius: 8px;
  }
`;

const QuickActionIcon = styled.div<{ $color?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, ${({ $color }) => $color || '#3b82f6'}, ${({ $color }) => $color ? `${$color}80` : '#3b82f680'});
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 4px 12px ${({ $color }) => $color ? `${$color}25` : '#3b82f625'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  svg {
    width: 20px !important;
    height: 20px !important;
  }
  
  ${QuickActionItem}:hover & {
    transform: scale(1.1);
    box-shadow: 0 6px 16px ${({ $color }) => $color ? `${$color}40` : '#3b82f640'};
  }
  
  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    
    svg {
      width: 16px !important;
      height: 16px !important;
    }
  }
`;

const QuickActionTitle = styled.h3`
  font-size: 0.95rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 0.875rem;
  }
`;

const LeaveHistorySection = styled.div`
  margin-top: 1.5rem;
  width: 100%;
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
`;

const LeaveHistoryHeader = styled.div`
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(35,42,59,0.20)' : 'rgba(99,102,241, 0.08)'};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  transition: background-color 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(35,42,59,0.35)' : 'rgba(99,102,241, 0.12)'};
  }
  
  @media (max-width: 768px) {
    padding: 0.6rem 0.5rem;
  }
`;

const LeaveHistoryTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  
  @media (max-width: 768px) {
    font-size: 0.85rem;
    font-weight: 500;
    gap: 0.4rem;
  }
`;

const LeaveHistoryIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  
  svg {
    width: 18px !important;
    height: 18px !important;
  }
  
  @media (max-width: 768px) {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    
    svg {
      width: 16px !important;
      height: 16px !important;
    }
  }
`;

const LeaveHistoryExpandIcon = styled(ExpandMore) <{ $expanded: boolean }>`
  transition: transform 0.3s ease;
  transform: ${props => props.$expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const LeaveHistoryContent = styled.div<{ $expanded: boolean }>`
  max-height: ${props => props.$expanded ? '600px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: ${props => props.$expanded ? '1rem 1.25rem' : '0 1.25rem'};
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    max-height: ${props => props.$expanded ? '500px' : '0'};
    padding: ${props => props.$expanded ? '0.75rem 0.5rem' : '0 0.5rem'};
  }
`;

const LeaveRequestList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5rem;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.ACCENT};
    border-radius: 4px;
    
    &:hover {
      background: ${({ theme }) => theme.ACCENT};
      opacity: 0.8;
    }
  }
  
  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.ACCENT} ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
  
  @media (max-width: 768px) {
    gap: 0.5rem;
    max-height: 350px;
    padding-right: 0.25rem;
    
    &::-webkit-scrollbar {
      width: 6px;
    }
  }
`;

const LeaveRequestItem = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f8f9fa'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 10px;
  padding: 1rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    border-radius: 8px;
  }
`;

const LeaveRequestHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const LeaveRequestInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
`;

const LeaveRequestStudentInfo = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  flex-wrap: wrap;
  
  .student-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
    font-weight: 500;
    
    svg {
      color: ${({ theme }) => theme.ACCENT};
      font-size: 1rem;
    }
  }
  
  .student-id {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    font-size: 0.9rem;
    font-weight: 400;
  }
  
  .student-class {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    font-size: 0.9rem;
    
    svg {
      color: ${({ theme }) => theme.ACCENT};
      font-size: 1rem;
    }
  }
  
  strong {
    font-weight: 600;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
  
  span {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    font-size: 0.85rem;
  }
  
  svg {
    color: ${({ theme }) => theme.ACCENT};
    opacity: 0.8;
  }
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
    
    .student-name {
      gap: 0.4rem;
      font-size: 0.85rem;
      
      svg {
        font-size: 0.9rem;
      }
    }
    
    .student-id {
      font-size: 0.8rem;
    }
    
    .student-class {
      gap: 0.4rem;
      font-size: 0.8rem;
      
      svg {
        font-size: 0.9rem;
      }
    }
    
    strong {
      font-size: 0.85rem;
    }
    
    span {
      font-size: 0.75rem;
    }
  }
`;

const LeaveRequestType = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  text-transform: capitalize;
`;

const LeaveRequestDates = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const LeaveStatusBadge = styled.div<{ $status: string }>`
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
  
  ${({ $status, theme }) => {
    if ($status === 'approved' || $status === 'reviewed') {
      return `
        background: ${theme.BG === '#252525' ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.1)'};
        color: #22c55e;
        border: 1px solid ${theme.BG === '#252525' ? 'rgba(34,197,94,0.4)' : 'rgba(34,197,94,0.3)'};
      `;
    } else if ($status === 'rejected') {
      return `
        background: ${theme.BG === '#252525' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)'};
        color: #ef4444;
        border: 1px solid ${theme.BG === '#252525' ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.3)'};
      `;
    } else {
      return `
        background: ${theme.BG === '#252525' ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.1)'};
        color: #fbbf24;
        border: 1px solid ${theme.BG === '#252525' ? 'rgba(251,191,36,0.4)' : 'rgba(251,191,36,0.3)'};
      `;
    }
  }}
`;

const LeaveRequestReason = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 0.5rem;
  line-height: 1.5;
`;

const LeaveRequestMeta = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`;

const CancelButton = styled.button`
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid ${({ theme }) => theme.BG === '#252525' ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.3)'};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)'};
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.15)'};
    border-color: ${({ theme }) => theme.BG === '#252525' ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.4)'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.9rem;
`;

// Exit Dialog Styled Components
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

const ModalButton = styled.button<{ $color?: string }>`
  padding: 0.5rem 1.2rem;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  background: ${({ $color, theme }) => $color || theme.ACCENT};
  color: #fff;
  transition: background 0.18s;
  &:hover {
    background: ${({ $color, theme }) => $color ? $color + 'cc' : theme.ACCENT + 'cc'};
  }
`;

const EventCard = styled.div<{ $eventType?: string }>`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${({ $eventType }) => {
    switch ($eventType) {
      case 'academic': return '#3b82f6';
      case 'sports': return '#10b981';
      case 'cultural': return '#f59e0b';
      case 'holiday': return '#ef4444';
      case 'meeting': return '#8b5cf6';
      default: return '#6b7280';
    }
  }};
  }
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border-color: ${({ $eventType }) => {
    switch ($eventType) {
      case 'academic': return '#3b82f6';
      case 'sports': return '#10b981';
      case 'cultural': return '#f59e0b';
      case 'holiday': return '#ef4444';
      case 'meeting': return '#8b5cf6';
      default: return '#6b7280';
    }
  }};
  }
`;

const EventHeader = styled.div`
  display: flex;
  align-items: start;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const EventTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  flex: 1;
`;

const EventTypeBadge = styled.span<{ $eventType?: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  background: ${({ $eventType }) => {
    switch ($eventType) {
      case 'academic': return '#3b82f615';
      case 'sports': return '#10b98115';
      case 'cultural': return '#f59e0b15';
      case 'holiday': return '#ef444415';
      case 'meeting': return '#8b5cf615';
      default: return '#6b728015';
    }
  }};
  color: ${({ $eventType }) => {
    switch ($eventType) {
      case 'academic': return '#3b82f6';
      case 'sports': return '#10b981';
      case 'cultural': return '#f59e0b';
      case 'holiday': return '#ef4444';
      case 'meeting': return '#8b5cf6';
      default: return '#6b7280';
    }
  }};
`;

const EventDescription = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0 0 1rem 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const EventDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const EventDetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  svg {
    font-size: 1rem;
    opacity: 0.7;
  }
`;

// Styled Dialog Components (matching UserDashboard.tsx)
const StyledDialog = muiStyled(Dialog)(({ theme }) => ({
  zIndex: 1300,
  '& .MuiDialog-paper': {
    borderRadius: '16px',
    background: theme.palette.mode === 'dark' 
      ? theme.palette.background.paper 
      : theme.palette.background.paper,
    maxWidth: '600px',
    width: '95%',
    margin: '84px 16px 16px',
    overflow: 'hidden',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 0 40px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.4)'
      : '0 0 40px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.1)',
    border: theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.05)'
      : '1px solid rgba(0, 0, 0, 0.05)',
    transform: 'translateY(0)',
    transition: 'all 0.3s ease-in-out',
    position: 'relative',
    zIndex: 1301,
    [theme.breakpoints.down('sm')]: {
      width: 'calc(100% - 32px)',
      height: 'calc(100% - 96px)',
      margin: '76px 16px 20px',
      borderRadius: '16px',
      maxHeight: 'calc(100% - 96px)'
    }
  },
  '& .MuiBackdrop-root': {
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(0, 0, 0, 0.5)'
      : 'rgba(255, 255, 255, 0.5)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    position: 'fixed',
    zIndex: 1300
  }
}));

const DialogHeader = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px',
  borderBottom: `1px solid ${theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.05)' 
    : 'rgba(0, 0, 0, 0.05)'}`,
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
  backdropFilter: 'blur(8px)',
  position: 'relative',
  zIndex: 1
}));

const DialogTitleStyled = muiStyled(Typography)(({ theme }) => ({
  fontSize: '1.5rem',
  fontWeight: 600,
  color: theme.palette.mode === 'dark'
    ? theme.palette.primary.light
    : theme.palette.primary.main,
  textShadow: theme.palette.mode === 'dark'
    ? '0 2px 4px rgba(0, 0, 0, 0.5)'
    : 'none'
}));

const StyledDialogContent = muiStyled(DialogContent)(({ theme }) => ({
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  maxHeight: 'calc(100vh - 180px)',
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  scrollbarColor: theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.2) transparent'
    : 'rgba(0, 0, 0, 0.2) transparent',
  '&::-webkit-scrollbar': {
    width: '8px',
    backgroundColor: 'transparent'
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
    borderRadius: '4px',
    margin: '4px'
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.2)'
      : 'rgba(0, 0, 0, 0.2)',
    borderRadius: '4px',
    border: `2px solid ${theme.palette.mode === 'dark'
      ? theme.palette.background.paper
      : theme.palette.background.paper}`,
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.3)'
        : 'rgba(0, 0, 0, 0.3)'
    }
  },
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 100%)'
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 100%)',
  '& .MuiFormControl-root': {
    transition: 'background-color 0.2s ease',
  },
  '& .MuiInputBase-root': {
    background: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(8px)',
    borderRadius: '8px',
    border: theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.05)'
      : '1px solid rgba(0, 0, 0, 0.05)',
    transition: 'background-color 0.2s ease',
    '&:hover, &.Mui-focused': {
      background: theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(255, 255, 255, 0.9)',
    },
    '& .MuiSelect-select, & .MuiInputBase-input': {
      padding: '12px 14px',
      fontSize: '0.95rem',
      '&::placeholder': {
        color: theme.palette.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.3)'
          : 'rgba(0, 0, 0, 0.3)',
        opacity: 1
      }
    },
    '& .MuiOutlinedInput-notchedOutline': {
      border: 'none'
    }
  }
}));

const FormActions = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  padding: '16px 24px',
  borderTop: `1px solid ${theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'}`,
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
    : 'linear-gradient(0deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
  '& .MuiButton-root': {
    borderRadius: '8px',
    textTransform: 'none',
    padding: '8px 20px',
    fontWeight: 500,
    transition: 'background-color 0.2s ease'
  }
}));

// Select menu props configuration
const selectMenuProps = {
  PaperProps: {
    sx: {
      maxHeight: 300,
      backgroundColor: (theme: Theme) => theme.palette.mode === 'dark' 
        ? theme.palette.background.paper
        : theme.palette.background.paper,
      '& .MuiList-root': {
        padding: '4px 0',
        maxHeight: 300,
        overflowY: 'auto',
        scrollbarWidth: 'thin',
        scrollbarColor: (theme: Theme) => theme.palette.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.2) transparent'
          : 'rgba(0, 0, 0, 0.2) transparent',
        '&::-webkit-scrollbar': {
          width: '12px',
          background: 'transparent'
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent'
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: (theme: Theme) => theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.2)'
            : 'rgba(0, 0, 0, 0.2)',
          borderRadius: '6px',
          border: (theme: Theme) => `3px solid ${theme.palette.mode === 'dark' 
            ? theme.palette.background.paper 
            : theme.palette.background.paper}`,
          '&:hover': {
            backgroundColor: (theme: Theme) => theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.3)'
              : 'rgba(0, 0, 0, 0.3)'
          }
        },
        '@supports (-moz-appearance: none)': {
          scrollbarWidth: 'thin',
          scrollbarColor: (theme: Theme) => theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.2) transparent'
            : 'rgba(0, 0, 0, 0.2) transparent'
        }
      },
      '& .MuiMenuItem-root': {
        padding: '10px 14px',
        fontSize: '0.95rem',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: (theme: Theme) => theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.08)'
            : theme.palette.action.hover
        },
        '&.Mui-selected': {
          backgroundColor: (theme: Theme) => theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.16)'
            : theme.palette.action.selected,
          fontWeight: 500,
          '&:hover': {
            backgroundColor: (theme: Theme) => theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.24)'
              : theme.palette.action.selected
          }
        }
      }
    }
  },
  MenuListProps: {
    style: {
      padding: 0
    }
  },
  anchorOrigin: {
    vertical: 'bottom' as const,
    horizontal: 'left' as const
  },
  transformOrigin: {
    vertical: 'top' as const,
    horizontal: 'left' as const
  }
};

const CustomLandingPage: React.FC = () => {
  const { user } = useAuth();
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const muiTheme = useMuiTheme();
  const fullScreen = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState<WidgetWithPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [widgetData, setWidgetData] = useState<Record<string, any>>({});
  const [studentInfo, setStudentInfo] = useState<{ id: number; name: string; school_id: number; role: string } | null>(null);
  const [parentInfo, setParentInfo] = useState<{ id: number; name: string; school_id: number; role: string } | null>(null);
  const [isStudentActive, setIsStudentActive] = useState<boolean>(true); // Default to true to avoid flicker
  const [linkedStudents, setLinkedStudents] = useState<Array<{
    id: number;
    name: string;
    picture_url?: string | null;
    father_name?: string | null;
    phone?: string | null;
    father_mobile?: string | null;
    address?: string | null;
    status?: string;
    class_id?: number | null;
    section_id?: number | null;
    classes?: { name: string } | null;
    sections?: { name: string } | null;
    notification_channel?: string | null;
    remainingFee?: number;
  }>>([]);
  const [totalRemainingFee, setTotalRemainingFee] = useState<number>(0);
  const [feeDetails, setFeeDetails] = useState<Array<{
    studentId: number;
    studentName: string;
    invoices: Array<{
      id: number;
      month: string | null;
      year: number | null;
      invoice_date: string;
      due_date: string;
      total_amount: number;
      status: string;
    }>;
    payments: Array<{
      id: number;
      invoice_id: number;
      payment_date: string;
      amount: number;
      discount_amount: number;
      net_amount: number;
      payment_mode: string;
    }>;
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
  }>>([]);
  const [expandedFeeRows, setExpandedFeeRows] = useState<Set<number>>(new Set());
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [gridColumns, setGridColumns] = useState(3);

  // Teacher-specific state
  const [staffName, setStaffName] = useState<string>('');
  const [staffGender, setStaffGender] = useState<string>('');
  const [teacherSections, setTeacherSections] = useState<Array<{ id: number, name: string, class_id: number, class_name: string }>>([]);
  const [publishedExaminations, setPublishedExaminations] = useState<Examination[]>([]);
  const [isClassTeacher, setIsClassTeacher] = useState<boolean>(false);
  const [renderSettings, setRenderSettings] = useState<RenderSettings | null>(null);

  // Events state
  const [events, setEvents] = useState<Array<{
    id: number;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    event_type: string;
    is_all_day: boolean;
    visible_to: string[];
  }>>([]);

  // Notices state
  const [dismissedNotices, setDismissedNotices] = useState<Set<number>>(new Set());
  const [notices, setNotices] = useState<Array<{
    id: number;
    title: string;
    description: string;
    notice_type: string;
    visible_to: string[];
    is_active: boolean;
    expiry_date?: string | null;
    created_at: string;
  }>>([]);

  // Leave Request Modal state
  const [leaveRequestModalOpen, setLeaveRequestModalOpen] = useState(false);
  const [leaveRequestForm, setLeaveRequestForm] = useState({
    studentId: '', // For students/parents
    staffId: '', // For teachers/staff
    leaveType: 'sick',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [submittingLeaveRequest, setSubmittingLeaveRequest] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<Array<{
    id: number;
    student_id?: number | null;
    staff_id?: number | null;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: string;
    requested_by: string;
    requested_by_name: string;
    created_at: string;
    reviewed_at?: string | null;
    review_notes?: string | null;
    students?: { name: string } | null;
    staff?: { name: string, role?: string } | null;
  }>>([]);
  const [loadingLeaveRequests, setLoadingLeaveRequests] = useState(false);
  const [leaveHistoryExpanded, setLeaveHistoryExpanded] = useState(false);
  const [historyActiveTab, setHistoryActiveTab] = useState(0); // 0 = Leave Requests, 1 = Complaints, 2 = Suggestions

  // Complaints and suggestions history state
  const [complaintsHistory, setComplaintsHistory] = useState<Array<{
    id: number;
    subject: string;
    complaint_text: string;
    status: string;
    created_at: string;
    reviewed_at?: string | null;
    review_notes?: string | null;
  }>>([]);
  const [suggestionsHistory, setSuggestionsHistory] = useState<Array<{
    id: number;
    subject: string;
    suggestion_text: string;
    status: string;
    created_at: string;
    reviewed_at?: string | null;
    review_notes?: string | null;
  }>>([]);
  const [loadingComplaintsHistory, setLoadingComplaintsHistory] = useState(false);
  const [loadingSuggestionsHistory, setLoadingSuggestionsHistory] = useState(false);

  // Complaint modal state
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [complaintForm, setComplaintForm] = useState({
    subject: '',
    complaintText: '',
  });
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  // Suggestion modal state
  const [suggestionModalOpen, setSuggestionModalOpen] = useState(false);
  const [suggestionForm, setSuggestionForm] = useState({
    subject: '',
    suggestionText: '',
  });
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const showExitConfirmRef = React.useRef(false);

  const { showToast } = useToast();
  const isWeb = checkIsWeb();
  const { setFooterContent } = usePageFooter();

  // Set footer content with real-time clock
  useEffect(() => {
    const updateFooter = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
      });
      const dateStr = now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      setFooterContent({
        visible: true,
        content: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start', width: '100%' }}>
            <span>{timeStr}</span>
            <span style={{ opacity: 0.6 }}>•</span>
            <span>{dateStr}</span>
          </div>
        )
      });
    };

    // Update immediately
    updateFooter();

    // Update every second for real-time clock
    const interval = setInterval(updateFooter, 1000);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      setFooterContent(null);
    };
  }, [setFooterContent]);

  // Sync ref with state
  useEffect(() => {
    showExitConfirmRef.current = showExitConfirm;
  }, [showExitConfirm]);

  // Handle exit function
  const handleExit = () => {
    try {
      if (CapacitorApp) {
        CapacitorApp.exitApp();
      } else if ((window as any).electronAPI) {
        (window as any).electronAPI.close();
      } else if (isWeb) {
        // On web, try to close the tab/window
        const closed = window.close();
        // If window.close() didn't work, navigate to about:blank as a fallback
        setTimeout(() => {
          if (!document.hidden) {
            window.location.href = 'about:blank';
          }
        }, 100);
      } else {
        window.close();
      }
    } catch (error) {
      console.error('Error exiting application:', error);
    }
  };

  // Helper function to notify users with complaints-suggestions permission when a suggestion is submitted
  const createSuggestionNotificationForAdmins = async (
    suggestionId: number,
    schoolId: number,
    submittedByName: string,
    subject: string
  ) => {
    try {
      // Import the permission service function
      const { getUsersWithPermission } = await import('../services/permissionService');
      
      // Get all users who have the 'complaints-suggestions' permission
      const userIds = await getUsersWithPermission('complaints-suggestions', schoolId);

      if (userIds.length === 0) {
        return;
      }

      const notifications = userIds.map((userId) => ({
        recipient_id: userId,
        school_id: schoolId,
        notification_type: 'suggestion',
        title: 'New Suggestion Submitted',
        message: `${submittedByName} submitted a new suggestion: "${subject}"`,
        is_read: false,
        is_important: false,
        created_at: new Date().toISOString(),
      }));

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) throw notifError;
    } catch (error: any) {
      console.error('Error creating suggestion notifications:', error);
      throw error;
    }
  };

  // Helper function to notify users with leave-requests permission when a leave request is submitted
  const createLeaveRequestNotificationForAdmins = async (
    leaveRequestId: number,
    schoolId: number,
    requestedByName: string,
    leaveType: string,
    startDate: string,
    endDate: string,
    isStaffRequest: boolean
  ) => {
    try {
      // Import the permission service function
      const { getUsersWithPermission } = await import('../services/permissionService');
      
      // Get all users who have the 'leave-requests' permission
      const userIds = await getUsersWithPermission('leave-requests', schoolId);

      if (userIds.length === 0) {
        return;
      }

      const leaveTypeLabel = leaveType.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      const dateRange = `${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

      const notifications = userIds.map((userId) => ({
        recipient_id: userId,
        school_id: schoolId,
        notification_type: 'leave_request',
        title: 'New Leave Request Submitted',
        message: `${requestedByName}${isStaffRequest ? ' (Staff)' : ''} submitted a new ${leaveTypeLabel} leave request from ${dateRange}`,
        is_read: false,
        is_important: true,
        created_at: new Date().toISOString(),
      }));

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) throw notifError;
    } catch (error: any) {
      console.error('Error creating leave request notifications:', error);
      throw error;
    }
  };

  // Helper function to notify users with complaints-suggestions permission when a complaint is submitted
  const createComplaintNotificationForAdmins = async (
    complaintId: number,
    schoolId: number,
    submittedByName: string,
    subject: string
  ) => {
    try {
      // Import the permission service function
      const { getUsersWithPermission } = await import('../services/permissionService');
      
      // Get all users who have the 'complaints-suggestions' permission
      const userIds = await getUsersWithPermission('complaints-suggestions', schoolId);

      if (userIds.length === 0) {
        return;
      }

      const notifications = userIds.map((userId) => ({
        recipient_id: userId,
        school_id: schoolId,
        notification_type: 'complaint',
        title: 'New Complaint Submitted',
        message: `${submittedByName} submitted a new complaint: "${subject}"`,
        is_read: false,
        is_important: true, // Complaints are marked as important
        created_at: new Date().toISOString(),
      }));

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) throw notifError;
    } catch (error: any) {
      console.error('Error creating complaint notifications:', error);
      throw error;
    }
  };

  // Helper function to notify submitter when a suggestion is reviewed
  // This function can be called from a review page when a suggestion is reviewed
  const createSuggestionReviewNotification = async (
    suggestionId: number,
    schoolId: number,
    submittedBy: string,
    submittedById: number | null,
    submittedByName: string,
    subject: string,
    status: 'reviewed',
    reviewNotes?: string
  ) => {
    try {
      let recipientId: number | null = null;
      let familyRecipientId: number | null = null;

      if (submittedBy === 'student') {
        recipientId = submittedById;
      } else if (submittedBy === 'parent') {
        familyRecipientId = submittedById;
      } else if (submittedBy === 'staff' && submittedById) {
        // Find the user account linked to this staff_id
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('staff_id', submittedById)
          .eq('school_id', schoolId)
          .maybeSingle();

        if (userData) {
          recipientId = userData.id;
        }
      }

      if (recipientId || familyRecipientId) {
        const notificationData: any = {
          school_id: schoolId,
          notification_type: 'suggestion',
          title: 'Suggestion Reviewed',
          message: `Your suggestion "${subject}" has been reviewed.${reviewNotes ? `\n\nNote: ${reviewNotes}` : ''}`,
          is_read: false,
          is_important: false,
          created_at: new Date().toISOString(),
        };

        if (recipientId) {
          notificationData.recipient_id = recipientId;
        }
        if (familyRecipientId) {
          notificationData.family_recipient_id = familyRecipientId;
        }

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notificationData);

        if (notifError) {
          console.error('Error creating suggestion review notification:', notifError);
        }
      }
    } catch (error: any) {
      console.error('Error in createSuggestionReviewNotification:', error);
    }
  };

  // Helper function to notify submitter when a complaint is reviewed
  // This function can be called from a review page when a complaint is reviewed
  const createComplaintReviewNotification = async (
    complaintId: number,
    schoolId: number,
    submittedBy: string,
    submittedById: number | null,
    submittedByName: string,
    subject: string,
    status: 'reviewed',
    reviewNotes?: string
  ) => {
    try {
      let recipientId: number | null = null;
      let familyRecipientId: number | null = null;

      if (submittedBy === 'student') {
        recipientId = submittedById;
      } else if (submittedBy === 'parent') {
        familyRecipientId = submittedById;
      } else if (submittedBy === 'staff' && submittedById) {
        // Find the user account linked to this staff_id
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('staff_id', submittedById)
          .eq('school_id', schoolId)
          .maybeSingle();

        if (userData) {
          recipientId = userData.id;
        }
      }

      if (recipientId || familyRecipientId) {
        const notificationData: any = {
          school_id: schoolId,
          notification_type: 'complaint',
          title: 'Complaint Reviewed',
          message: `Your complaint "${subject}" has been reviewed.${reviewNotes ? `\n\nNote: ${reviewNotes}` : ''}`,
          is_read: false,
          is_important: false,
          created_at: new Date().toISOString(),
        };

        if (recipientId) {
          notificationData.recipient_id = recipientId;
        }
        if (familyRecipientId) {
          notificationData.family_recipient_id = familyRecipientId;
        }

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notificationData);

        if (notifError) {
          console.error('Error creating complaint review notification:', notifError);
        }
      }
    } catch (error: any) {
      console.error('Error in createComplaintReviewNotification:', error);
    }
  };

  // Check for student or parent session if no staff user
  useEffect(() => {
    if (!user) {
      try {
        const studentSession = localStorage.getItem('studentSession');
        if (studentSession) {
          const parsed = JSON.parse(studentSession);
          if (parsed?.id && parsed?.school_id) {
            setStudentInfo({
              id: parsed.id,
              name: parsed.name || 'Student',
              school_id: parsed.school_id,
              role: 'Student'
            });
            setParentInfo(null);
            setIsStudentActive(true); // Reset to true, will be updated by loadStudentData
            return;
          }
        }

        const parentSession = localStorage.getItem('parentSession');
        if (parentSession) {
          const parsed = JSON.parse(parentSession);
          if (parsed?.id && parsed?.school_id) {
            setParentInfo({
              id: parsed.id,
              name: parsed.name || 'Parent',
              school_id: parsed.school_id,
              role: 'Parent'
            });
            setStudentInfo(null);
            setIsStudentActive(true);
            return;
          }
        }

        setStudentInfo(null);
        setParentInfo(null);
        setIsStudentActive(true);
      } catch (e) {
        // Error parsing session
        setStudentInfo(null);
        setParentInfo(null);
        setIsStudentActive(true);
      }
    } else {
      setStudentInfo(null);
      setParentInfo(null);
      setIsStudentActive(true);
    }
  }, [user]);

  // Track mobile state and grid columns
  useEffect(() => {
    const checkViewport = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      setIsMobile(width <= 700);

      // Determine grid columns based on viewport width
      if (width <= 700) {
        setGridColumns(1); // Mobile: 1 column
      } else if (width <= 1200) {
        setGridColumns(2); // Tablet: 2 columns
      } else {
        setGridColumns(3); // Desktop: 3 columns
      }
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);

    return () => {
      window.removeEventListener('resize', checkViewport);
    };
  }, []);

  // Close card actions when clicking outside on mobile
  useEffect(() => {
    if (activeCardId === null) return;

    const handleClickOutside = (e: Event) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking on a card or its actions
      if (target.closest('[data-student-card]')) return;
      setActiveCardId(null);
    };

    // Only add listener on mobile
    if (isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [activeCardId, isMobile]);

  // Mobile back button handling (Capacitor / WebView)
  useEffect(() => {
    // Only handle for Teacher, Parent, or Student roles
    const isTargetRole = user?.role === 'Teacher' || user?.role === 'Parent' || user?.role === 'Student' || studentInfo || parentInfo;
    if (!isTargetRole) {
      return;
    }

    const handleBackPress = () => {
      // If modal is already showing, don't do anything
      if (showExitConfirmRef.current) {
        return;
      }
      
      // Show exit confirmation dialog
      showExitConfirmRef.current = true;
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
        // Ignore errors
      }
    };

    // Set up listener for Capacitor
    setupCapacitorListener();

    // Add keyboard shortcut for testing back button in browser (Escape key)
    // This allows testing mobile back button behavior without a physical device
    const handleKeyDown = (event: KeyboardEvent) => {
      // Press Escape to simulate Android back button (only in web/mobile view)
      if (event.key === 'Escape' && isWeb && window.innerWidth < 1024) {
        event.preventDefault();
        event.stopPropagation();
        handleBackPress();
      }
    };

    // Add keyboard listener for testing
    if (isWeb) {
      window.addEventListener('keydown', handleKeyDown);
    }

    // Handle browser back button (Web/Electron)
    const handlePopState = (event: PopStateEvent) => {
      // If modal is already showing, just prevent navigation and return
      if (showExitConfirmRef.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
        window.history.pushState(null, '', window.location.pathname);
        return;
      }

      // Immediately prevent navigation
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      
      // Show exit confirmation dialog
      handleBackPress();

      // Push the current state back to prevent navigation
      window.history.pushState(null, '', window.location.pathname);
    };

    // Push initial state to trap back button
    window.history.pushState(null, '', window.location.pathname);
    // Use capture phase to catch event early
    window.addEventListener('popstate', handlePopState, true);

    // Handle beforeunload to prevent accidental exits
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Only show exit confirm in Electron/Capacitor
      if (showExitConfirmRef.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (removeCapListener) removeCapListener();
      window.removeEventListener('popstate', handlePopState, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (isWeb) {
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [user, studentInfo, parentInfo, isWeb]);

  useEffect(() => {
    const schoolId = user?.school_id || studentInfo?.school_id || parentInfo?.school_id;
    if (schoolId) {
      // Load events and notices for all users
      loadEvents();
      loadNotices();

      // If user is a Teacher, load teacher-specific data
      if (user?.role === 'Teacher') {
        loadTeacherData();
      } else if (user?.role === 'Student' || studentInfo) {
        // For students, load render settings
        loadStudentData();
      } else if (user?.role === 'Parent' || parentInfo) {
        // For parents, load linked students
        loadParentData();
      } else {
        loadWidgets();
      }
    }
  }, [user?.school_id, studentInfo?.school_id, parentInfo?.school_id]);

  const loadStudentData = async () => {
    const schoolId = user?.school_id || studentInfo?.school_id;
    if (!schoolId || !studentInfo?.id) return;

    setLoading(true);
    try {
      const settings = await fetchRenderSettings(schoolId);
      setRenderSettings(settings);

      // Fetch active session for students (needed for leave requests)
      const { data: activeSessionData } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', schoolId)
        .maybeSingle();

      if (activeSessionData) {
        setActiveSessionId(activeSessionData.id);
      }

      // Fetch latest status from student_status_history
      const { data: statusHistory, error: statusError } = await supabase
        .from('student_status_history')
        .select('new_status, created_at')
        .eq('student_id', studentInfo.id)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!statusError && statusHistory) {
        // Use the latest status from history
        setIsStudentActive(statusHistory.new_status === 'active');
      } else {
        // If no history exists, check the students table status as fallback
        const { data: studentData } = await supabase
          .from('students')
          .select('status')
          .eq('id', studentInfo.id)
          .eq('school_id', schoolId)
          .maybeSingle();
        
        setIsStudentActive(studentData?.status === 'active' || studentData?.status === undefined);
      }
    } catch (error) {
      // Handle error silently, default to active
      setIsStudentActive(true);
    } finally {
      setLoading(false);
    }
  };

  const loadParentData = async () => {
    const familyId = parentInfo?.id;
    const schoolId = parentInfo?.school_id;
    if (!familyId || !schoolId) return;

    setLoading(true);
    try {
      // Fetch linked students from family_members table with full student details
      const { data: familyMembers, error } = await supabase
        .from('family_members')
        .select(`
          student_id,
          students (
            id,
            name,
            picture_url,
            father_name,
            phone,
            father_mobile,
            address,
            status,
            notification_channel
          )
        `)
        .eq('family_id', familyId);

      if (error) throw error;

      // Extract student IDs
      const studentIds = (familyMembers || [])
        .map((member: any) => member.students?.id)
        .filter(Boolean);

      if (studentIds.length === 0) {
        setLinkedStudents([]);
        setLoading(false);
        return;
      }

      // Fetch full student data with class/section from student_class_history
      const { data: activeSessionData } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', schoolId)
        .maybeSingle();

      if (activeSessionData) {
        setActiveSessionId(activeSessionData.id);
      }

      let studentsWithClass: any[] = [];

      if (activeSessionData) {
        // Fetch from student_class_history for active session
        const { data: historyData } = await supabase
          .from('student_class_history')
          .select(`
            student_id,
            new_class_id,
            new_section_id,
            new_classes:new_class_id(id, name),
            new_sections:new_section_id(id, name)
          `)
          .eq('session_id', activeSessionData.id)
          .eq('school_id', schoolId)
          .in('student_id', studentIds);

        if (historyData && historyData.length > 0) {
          const historyMap = new Map(historyData.map((h: any) => [h.student_id, h]));

          // Fetch students and merge with class history
          const { data: studentsData } = await supabase
            .from('students')
            .select('id, name, picture_url, father_name, phone, father_mobile, address, status, notification_channel, roll_number')
            .eq('school_id', schoolId)
            .in('id', studentIds);

          studentsWithClass = (studentsData || []).map((student: any) => {
            const history = historyMap.get(student.id);
            return {
              ...student,
              class_id: history?.new_class_id || null,
              section_id: history?.new_section_id || null,
              classes: history?.new_classes || null,
              sections: history?.new_sections || null,
            };
          });
        }
      }

      // If no history data, fetch students directly
      if (studentsWithClass.length === 0) {
        const { data: studentsData } = await supabase
          .from('students')
          .select('id, name, picture_url, father_name, phone, father_mobile, address, status, notification_channel, class_id, section_id, roll_number')
          .eq('school_id', schoolId)
          .in('id', studentIds);

        if (studentsData) {
          // Fetch class and section names
          const classIds = Array.from(new Set(studentsData.map((s: any) => s.class_id).filter(Boolean)));
          const sectionIds = Array.from(new Set(studentsData.map((s: any) => s.section_id).filter(Boolean)));

          const { data: classesData } = await supabase
            .from('classes')
            .select('id, name')
            .eq('school_id', schoolId)
            .in('id', classIds);

          const { data: sectionsData } = await supabase
            .from('sections')
            .select('id, name')
            .eq('school_id', schoolId)
            .in('id', sectionIds);

          const classMap = new Map(classesData?.map((c: any) => [c.id, c]) || []);
          const sectionMap = new Map(sectionsData?.map((s: any) => [s.id, s]) || []);

          studentsWithClass = (studentsData || []).map((student: any) => ({
            ...student,
            classes: classMap.get(student.class_id) || null,
            sections: sectionMap.get(student.section_id) || null,
          }));
        }
      }

      setLinkedStudents(studentsWithClass);

      // Calculate remaining fee for all linked students
      await calculateRemainingFeesForStudents(studentsWithClass, schoolId);

      // Load render settings for parents
      const settings = await fetchRenderSettings(schoolId);
      setRenderSettings(settings);
    } catch (error) {
      console.error('[CustomLandingPage] Error loading parent data:', error);
      setLinkedStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate remaining fee for a list of students (using LedgerPage approach)
  const calculateRemainingFeesForStudents = async (
    students: Array<{
      id: number;
      name: string;
      picture_url?: string | null;
      father_name?: string | null;
      phone?: string | null;
      father_mobile?: string | null;
      address?: string | null;
      status?: string;
      class_id?: number | null;
      section_id?: number | null;
      classes?: { name: string } | null;
      sections?: { name: string } | null;
      notification_channel?: string | null;
    }>,
    schoolId: number
  ) => {
    if (!students || students.length === 0) {
      setTotalRemainingFee(0);
      setFeeDetails([]);
      return;
    }

    try {
      const studentIds = students.map(s => s.id);

      // Fetch all invoices for linked students (same approach as LedgerPage)
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('fee_invoices')
        .select('*')
        .eq('school_id', schoolId)
        .in('student_id', studentIds)
        .order('invoice_date', { ascending: false });

      if (invoicesError) {
        console.error('[CustomLandingPage] Error fetching invoices:', invoicesError);
        setTotalRemainingFee(0);
        setFeeDetails([]);
        return;
      }

      // Fetch all payments for invoices of linked students
      const invoiceIds = (invoicesData || []).map(inv => inv.id);
      let paymentsData: any[] = [];

      if (invoiceIds.length > 0) {
        const { data: payments, error: paymentsError } = await supabase
          .from('fee_payments')
          .select('*')
          .eq('school_id', schoolId)
          .in('invoice_id', invoiceIds)
          .order('payment_date', { ascending: false });

        if (paymentsError) {
          console.error('[CustomLandingPage] Error fetching payments:', paymentsError);
        } else {
          paymentsData = payments || [];
        }
      }

      // Fetch all fee_invoice_items for the invoices
      let invoiceItemsData: any[] = [];
      if (invoiceIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('fee_invoice_items')
          .select(`
              id,
            invoice_id,
            fee_head_id,
                amount,
                fee_heads (
                  id,
                  name,
                  description
            )
          `)
          .in('invoice_id', invoiceIds);

        if (!itemsError && items) {
          invoiceItemsData = items;
        }
      }

      // Fetch all fee_payment_items for the payments
      const paymentIds = paymentsData.map(p => p.id);
      let paymentItemsData: any[] = [];

      if (paymentIds.length > 0) {
        const { data: paymentItems, error: paymentItemsError } = await supabase
          .from('fee_payment_items')
          .select('id, payment_id, fee_challan_item_id, amount, paid_amount')
          .in('payment_id', paymentIds);

        if (!paymentItemsError && paymentItems) {
          paymentItemsData = paymentItems;
        }
      }

      // Build fee details for each student (same approach as LedgerPage)
      let totalRemaining = 0;
      const feeDetailsList: Array<{
        studentId: number;
        studentName: string;
        invoices: Array<{
          id: number;
          month: string | null;
          year: number | null;
          invoice_date: string;
          due_date: string;
          total_amount: number;
          status: string;
        }>;
        payments: Array<{
          id: number;
          invoice_id: number;
          payment_date: string;
          amount: number;
          discount_amount: number;
          net_amount: number;
          payment_mode: string;
        }>;
        totalInvoiced: number;
        totalPaid: number;
        totalOutstanding: number;
      }> = [];

      const studentsWithFees = students.map(student => {
        // Get invoices for this student
        const studentInvoices = (invoicesData || []).filter(inv => inv.student_id === student.id);

        // Get payments for this student's invoices
        const studentPayments = (paymentsData || []).filter(pay =>
          studentInvoices.some(inv => inv.id === pay.invoice_id)
        );

        // Calculate totals (same as LedgerPage)
        const totalInvoiced = studentInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
        const totalPaid = studentPayments.reduce((sum, pay) => sum + Number(pay.net_amount || pay.amount || 0), 0);
        const totalOutstanding = totalInvoiced - totalPaid;

        // Store fee information with invoices and payments (include all students, even with zero outstanding)
        feeDetailsList.push({
          studentId: student.id,
          studentName: student.name,
          invoices: studentInvoices.map(inv => ({
            id: inv.id,
            month: inv.month,
            year: inv.year,
            invoice_date: inv.invoice_date,
            due_date: inv.due_date,
            total_amount: Number(inv.total_amount || 0),
            status: inv.status
          })),
          payments: studentPayments.map(pay => ({
            id: pay.id,
            invoice_id: pay.invoice_id,
            payment_date: pay.payment_date,
            amount: Number(pay.amount || 0),
            discount_amount: Number(pay.discount_amount || 0),
            net_amount: Number(pay.net_amount || pay.amount || 0),
            payment_mode: pay.payment_mode
          })),
          totalInvoiced,
          totalPaid,
          totalOutstanding
        });

        totalRemaining += totalOutstanding;
        return { ...student, remainingFee: totalOutstanding };
      });

      setLinkedStudents(studentsWithFees);
      setTotalRemainingFee(totalRemaining);
      setFeeDetails(feeDetailsList);
    } catch (error) {
      console.error('[CustomLandingPage] Error calculating remaining fees:', error);
      setTotalRemainingFee(0);
      setFeeDetails([]);
    }
  };

  const loadTeacherData = async () => {
    if (!user?.school_id || !user?.staff_id) return;

    setLoading(true);
    try {
      const [staffNameResult, examinationsResult, classTeacherResult, sectionsResult, settingsResult] = await Promise.all([
        fetchStaffName(),
        fetchPublishedExaminations(),
        checkClassTeacherAssignment(),
        fetchTeacherSections(),
        fetchRenderSettingsData()
      ]);

      // Fetch active session for teachers (needed for leave requests)
      const { data: activeSessionData } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
        .maybeSingle();

      if (activeSessionData) {
        setActiveSessionId(activeSessionData.id);
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffName = async () => {
    if (user?.staff_id) {
      try {
        const { data, error } = await supabase
          .from('staff')
          .select('name, gender')
          .eq('id', user.staff_id)
          .single();

        if (error) throw error;
        if (data) {
          setStaffName(data.name);
          setStaffGender(data.gender || '');
        }
      } catch (error) {
        // Handle error silently
      }
    }
  };

  const fetchPublishedExaminations = async () => {
    if (user?.school_id) {
      try {
        const examinations = await examinationService.getExaminations({}, user.school_id);
        const published = examinations.filter(exam => exam.status === 'published');
        setPublishedExaminations(published);
      } catch (error) {
        // Handle error silently
      }
    }
  };

  const checkClassTeacherAssignment = async () => {
    if (user?.staff_id && user?.school_id) {
      try {
        const { data: sectionAssignments, error } = await supabase
          .from('sections')
          .select('id, name, class_id')
          .eq('teacher_id', user.staff_id)
          .eq('school_id', user.school_id);

        if (error) {
          setIsClassTeacher(false);
          return;
        }

        const hasSectionAssignments = sectionAssignments && sectionAssignments.length > 0;
        setIsClassTeacher(hasSectionAssignments);
      } catch (error) {
        setIsClassTeacher(false);
      }
    }
  };

  const fetchTeacherSections = async () => {
    if (user?.staff_id && user?.school_id) {
      try {
        const { data: sections, error: sectionsError } = await supabase
          .from('sections')
          .select('id, name, class_id')
          .eq('teacher_id', user.staff_id)
          .eq('school_id', user.school_id);

        if (sectionsError) {
          setTeacherSections([]);
          return;
        }

        if (!sections || sections.length === 0) {
          setTeacherSections([]);
          return;
        }

        const classIds = Array.from(new Set(sections.map(s => s.class_id)));

        const { data: classes, error: classesError } = await supabase
          .from('classes')
          .select('id, name')
          .in('id', classIds)
          .eq('school_id', user.school_id);

        if (classesError) {
          setTeacherSections([]);
          return;
        }

        const classMap = new Map(classes?.map(c => [c.id, c.name]) || []);

        const formattedSections = sections.map(section => ({
          id: section.id,
          name: section.name,
          class_id: section.class_id,
          class_name: classMap.get(section.class_id) || 'Unknown Class'
        }));

        setTeacherSections(formattedSections);
      } catch (error) {
        setTeacherSections([]);
      }
    }
  };

  const fetchRenderSettingsData = async () => {
    if (user?.school_id) {
      const settings = await fetchRenderSettings(user.school_id);
      setRenderSettings(settings);
    }
  };

  const loadEvents = async () => {
    const schoolId = user?.school_id || studentInfo?.school_id || parentInfo?.school_id;
    if (!schoolId) return;

    try {
      const userRole = user?.role || studentInfo?.role || parentInfo?.role || 'Guest';

      // Fetch all events for the school
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('school_id', schoolId)
        .gte('end_date', new Date().toISOString().split('T')[0]) // Only future events
        .order('start_date', { ascending: true })
        .limit(10); // Limit to 10 upcoming events

      if (error) throw error;

      // Filter events based on user role and visible_to array
      const filteredEvents = (data || []).filter(event => {
        // If visible_to is empty, show to all
        if (!event.visible_to || event.visible_to.length === 0) return true;
        // Check if user's role is in visible_to array
        return event.visible_to.includes(userRole);
      });

      setEvents(filteredEvents);
    } catch (error) {
      console.error('[CustomLandingPage] Error loading events:', error);
    }
  };

  // Load dismissed notices from database on mount (only dismissed ones)
  useEffect(() => {
    const loadDismissedNotices = async () => {
      const schoolId = user?.school_id || studentInfo?.school_id || parentInfo?.school_id;
      if (!schoolId) return;

      // Build viewer_identifier based on user type
      let viewerIdentifier: string | null = null;
      if (studentInfo?.id) {
        viewerIdentifier = `student_${studentInfo.id}`;
      } else if (parentInfo?.id) {
        viewerIdentifier = `parent_${parentInfo.id}`;
      } else if (user?.staff_id) {
        viewerIdentifier = `staff_${user.staff_id}`;
      } else if (user?.id) {
        viewerIdentifier = `user_${user.id}`;
      }

      if (!viewerIdentifier) return;

      try {
        const { data, error } = await supabase
          .from('notice_views')
          .select('notice_id')
          .eq('viewer_identifier', viewerIdentifier)
          .eq('school_id', schoolId)
          .eq('dismissed', true); // Only get dismissed notices

        if (error) throw error;

        const dismissedIds = (data || []).map(item => item.notice_id);
        setDismissedNotices(new Set(dismissedIds));
      } catch (error) {
        console.error('Error loading dismissed notices:', error);
      }
    };

    loadDismissedNotices();
  }, [user?.id, user?.staff_id, user?.school_id, studentInfo?.id, studentInfo?.school_id, parentInfo?.id, parentInfo?.school_id]);

  const loadNotices = async () => {
    const schoolId = user?.school_id || studentInfo?.school_id || parentInfo?.school_id;
    if (!schoolId) return;

    try {
      const userRole = user?.role || studentInfo?.role || parentInfo?.role || 'Guest';
      const today = new Date().toISOString().split('T')[0];
      const userId = user?.id || studentInfo?.id || parentInfo?.id;

      // Fetch dismissed notices for this user first
      let dismissedIds = new Set<number>();
      
      // Build viewer_identifier based on user type
      let viewerIdentifier: string | null = null;
      if (studentInfo?.id) {
        viewerIdentifier = `student_${studentInfo.id}`;
      } else if (parentInfo?.id) {
        viewerIdentifier = `parent_${parentInfo.id}`;
      } else if (user?.staff_id) {
        viewerIdentifier = `staff_${user.staff_id}`;
      } else if (user?.id) {
        viewerIdentifier = `user_${user.id}`;
      }

      if (viewerIdentifier && schoolId) {
        // Only fetch dismissed notices (dismissed=true)
        const { data: dismissedData, error: dismissedError } = await supabase
          .from('notice_views')
          .select('notice_id')
          .eq('viewer_identifier', viewerIdentifier)
          .eq('school_id', schoolId)
          .eq('dismissed', true);

        if (!dismissedError && dismissedData) {
          dismissedData.forEach(item => dismissedIds.add(item.notice_id));
          setDismissedNotices(dismissedIds);
        }
      }

      // Fetch all active notices for the school
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .or(`expiry_date.is.null,expiry_date.gte.${today}`) // Only get notices that haven't expired
        .order('created_at', { ascending: false })
        .limit(10); // Limit to 10 recent notices

      if (error) throw error;

      // Filter notices based on individual targeting or visible_to roles
      const filteredNotices = (data || []).filter(notice => {
        // Filter out dismissed notices - use the fetched data, not state
        if (dismissedIds.has(notice.id)) {
          return false;
        }
        // Check individual targeting first (new method)
        if (notice.audience_group && notice.target_scope) {
          // Individual targeting is set
          if (notice.audience_group === 'all_users') {
            return true; // Show to all users
          }
          
          // Check if user is a student (via user.role or studentInfo)
          const studentId = studentInfo?.id;
          if (studentId) {
            if (notice.audience_group !== 'students') return false;
            switch (notice.target_scope) {
              case 'all':
                return true;
              case 'single':
              case 'multi': {
                const targetIds = [
                  ...(notice.student_id ? [notice.student_id] : []),
                  ...(notice.student_ids || [])
                ];
                return targetIds.includes(studentId);
              }
              case 'class': {
                // Check if student's class/section matches
                // For students, we need to get class_id from linkedStudents or fetch it
                // For now, if we have linkedStudents with this student, use that
                const studentData = linkedStudents.find(s => s.id === studentId);
                const studentClassId = studentData?.class_id;
                const studentSectionId = studentData?.section_id;
                const classMatches = !notice.class_id || notice.class_id === studentClassId;
                const sectionMatches = !notice.section_id || notice.section_id === studentSectionId;
                return classMatches && sectionMatches;
              }
              default:
                return false;
            }
          }
          
          // Check if user is staff (via user.role or user.staff_id)
          const staffId = user?.staff_id;
          if (staffId) {
            if (notice.audience_group !== 'staff') return false;
            switch (notice.target_scope) {
              case 'all':
                return true;
              case 'single':
              case 'multi': {
                const targetIds = [
                  ...(notice.staff_id ? [notice.staff_id] : []),
                  ...(notice.staff_ids || [])
                ];
                return targetIds.includes(staffId);
              }
              case 'role':
                return notice.staff_role === userRole;
              default:
                return false;
            }
          }
          
          // Check if user is a parent (via user.role or parentInfo)
          // For parents, check if any of their linked students match
          if (user?.role === 'Parent' || parentInfo) {
            if (notice.audience_group !== 'parents') return false;
            switch (notice.target_scope) {
              case 'all':
                return true;
              case 'single':
              case 'multi': {
                // For parents, check if family_id matches
                const familyId = parentInfo?.id;
                if (familyId) {
                  const targetIds = [
                    ...(notice.family_id ? [notice.family_id] : []),
                    ...(notice.family_ids || [])
                  ];
                  return targetIds.includes(familyId);
                }
                return false;
              }
              default:
                return false;
            }
          }
          
          return false;
        }
        
        // Legacy: fall back to visible_to roles
        if (!notice.visible_to || notice.visible_to.length === 0) return true;
        return notice.visible_to.includes(userRole);
      });

      setNotices(filteredNotices);

      // Track all displayed notices as "seen" (automatically)
      if (filteredNotices.length > 0 && viewerIdentifier && schoolId) {
        // Build viewer payload for tracking
        let viewerPayload: any = {
          school_id: schoolId,
          viewer_identifier: viewerIdentifier,
          dismissed: false, // Just marking as seen, not dismissed
        };

        if (studentInfo?.id) {
          viewerPayload.viewer_type = 'student';
          viewerPayload.viewer_role = 'Student';
          viewerPayload.viewer_name = studentInfo.name || 'Student';
          viewerPayload.student_id = studentInfo.id;
        } else if (parentInfo?.id) {
          viewerPayload.viewer_type = 'parent';
          viewerPayload.viewer_role = 'Parent';
          viewerPayload.viewer_name = parentInfo.name || 'Parent';
        } else if (user?.staff_id) {
          viewerPayload.viewer_type = 'staff';
          viewerPayload.viewer_role = user.role || 'Staff';
          viewerPayload.viewer_name = user.name || 'Staff Member';
          viewerPayload.staff_id = user.staff_id;
          if (user.id) {
            viewerPayload.user_id = user.id;
          }
        } else if (user?.id) {
          viewerPayload.viewer_type = 'user';
          viewerPayload.viewer_role = user.role || 'User';
          viewerPayload.viewer_name = user.name || 'User';
          viewerPayload.user_id = user.id;
        }

        // Track each notice as seen (upsert to avoid duplicates)
        filteredNotices.forEach(async (notice) => {
          if (notice.id) {
            try {
              await supabase
                .from('notice_views')
                .upsert({
                  notice_id: notice.id,
                  ...viewerPayload,
                }, {
                  onConflict: 'notice_id,viewer_identifier'
                });
            } catch (error) {
              // Silent fail - don't block UI if tracking fails
              console.error('Error tracking notice as seen:', error);
            }
          }
        });
      }
    } catch (error) {
      console.error('[CustomLandingPage] Error loading notices:', error);
    }
  };

  const handleDismissNotice = async (noticeId: number) => {
    const schoolId = user?.school_id || studentInfo?.school_id || parentInfo?.school_id;
    if (!schoolId || !noticeId) return;

    // Build viewer_identifier and payload based on user type
    let viewerIdentifier: string | null = null;
    let viewerPayload: any = {
      notice_id: noticeId,
      school_id: schoolId,
    };

    if (studentInfo?.id) {
      viewerIdentifier = `student_${studentInfo.id}`;
      viewerPayload.viewer_type = 'student';
      viewerPayload.viewer_role = 'Student';
      viewerPayload.viewer_name = studentInfo.name || 'Student';
      viewerPayload.student_id = studentInfo.id;
    } else if (parentInfo?.id) {
      viewerIdentifier = `parent_${parentInfo.id}`;
      viewerPayload.viewer_type = 'parent';
      viewerPayload.viewer_role = 'Parent';
      viewerPayload.viewer_name = parentInfo.name || 'Parent';
      // Note: parentInfo.id is family_id, not user_id
    } else if (user?.staff_id) {
      viewerIdentifier = `staff_${user.staff_id}`;
      viewerPayload.viewer_type = 'staff';
      viewerPayload.viewer_role = user.role || 'Staff';
      viewerPayload.viewer_name = user.name || 'Staff Member';
      viewerPayload.staff_id = user.staff_id;
      if (user.id) {
        viewerPayload.user_id = user.id;
      }
    } else if (user?.id) {
      viewerIdentifier = `user_${user.id}`;
      viewerPayload.viewer_type = 'user';
      viewerPayload.viewer_role = user.role || 'User';
      viewerPayload.viewer_name = user.name || 'User';
      viewerPayload.user_id = user.id;
    }

    if (!viewerIdentifier) {
      console.error('Cannot determine viewer identifier');
      return;
    }

    viewerPayload.viewer_identifier = viewerIdentifier;
    viewerPayload.dismissed = true; // Mark as dismissed
    viewerPayload.dismissed_at = new Date().toISOString(); // Track when dismissed

    try {
      // Save to database using notice_views with dismissed=true
      const { error } = await supabase
        .from('notice_views')
        .upsert(viewerPayload, {
          onConflict: 'notice_id,viewer_identifier'
        });

      if (error) {
        throw error;
      }

      // Update local state
      const newDismissed = new Set(dismissedNotices);
      newDismissed.add(noticeId);
      setDismissedNotices(newDismissed);
      setNotices(prev => prev.filter(n => n.id !== noticeId));
    } catch (error) {
      console.error('Error dismissing notice:', error);
    }
  };

  const loadWidgets = async () => {
    const schoolId = user?.school_id || studentInfo?.school_id;
    if (!schoolId) return;

    setLoading(true);
    try {
      // Determine user role
      const userRole = user?.role || studentInfo?.role || 'Guest';
      const widgetsData = await landingPageService.getWidgetsForRole(schoolId, userRole);
      setWidgets(widgetsData);

      // Load data for stat widgets
      const dataPromises = widgetsData
        .filter(w => w.widget_type === 'stat')
        .map(async (widget) => {
          try {
            const value = await fetchWidgetValue(widget);
            return { [widget.widget_key]: value };
          } catch (error) {
            return { [widget.widget_key]: 'N/A' };
          }
        });

      const dataResults = await Promise.all(dataPromises);
      const dataMap = Object.assign({}, ...dataResults);
      setWidgetData(dataMap);
    } catch (error) {
      console.error('[CustomLandingPage] Error loading widgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWidgetValue = async (widget: WidgetWithPreference): Promise<string | number> => {
    const config = widget.widget_config || {};
    const schoolId = user?.school_id || studentInfo?.school_id;

    try {
      switch (config.query) {
        case 'students':
          const { count: studentCount } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId);
          return studentCount || 0;

        case 'staff':
          let staffQuery = supabase
            .from('staff')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId);

          if (config.filter?.role) {
            staffQuery = staffQuery.eq('role', config.filter.role);
          }

          const { count: staffCount } = await staffQuery;
          return staffCount || 0;

        case 'reports':
          let reportsQuery = supabase
            .from('reports')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId);

          if (config.filter?.status) {
            reportsQuery = reportsQuery.eq('status', config.filter.status);
          }

          const { count: reportsCount } = await reportsQuery;
          return reportsCount || 0;

        case 'attendance':
          // Get today's attendance count
          const today = new Date().toISOString().split('T')[0];
          const { count: attendanceCount } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId)
            .eq('date', today);
          return attendanceCount || 0;

        default:
          return 'N/A';
      }
    } catch (error) {
      console.error('[CustomLandingPage] Error fetching widget value:', error);
      return 'N/A';
    }
  };

  const getIconComponent = (iconName?: string) => {
    if (!iconName) return Icons.Dashboard;
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Icons.Dashboard;
  };

  const handleWidgetClick = (widget: WidgetWithPreference) => {
    const config = widget.widget_config || {};

    // Handle link widgets
    if (widget.widget_type === 'link' && config.route) {
      navigate(config.route);
    }

    // Handle stat widgets - navigate to relevant page
    if (widget.widget_type === 'stat') {
      switch (widget.widget_key) {
        case 'total_students':
          navigate('/students');
          break;
        case 'total_teachers':
          navigate('/employees');
          break;
        case 'attendance_today':
          navigate('/attendance');
          break;
        case 'pending_reports':
          navigate('/reports');
          break;
        default:
          break;
      }
    }
  };

  // Helper function to get gender-based title
  const getGenderTitle = (gender: string) => {
    if (!gender) return '';
    const genderLower = gender.toLowerCase();
    if (genderLower === 'male' || genderLower === 'm') return 'Mr. ';
    if (genderLower === 'female' || genderLower === 'f') return 'Ms. ';
    return '';
  };

  // Helper function to format class-section info
  const getClassSectionInfo = () => {
    if (teacherSections.length === 0) return '';

    const sectionsInfo = teacherSections.map(section =>
      `${section.class_name}-${section.name}`
    ).join(', ');

    return ` (${sectionsInfo})`;
  };

  // Helper function to format event date
  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Helper function to format event time
  const formatEventTime = (timeStr?: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Fetch leave requests history
  const fetchLeaveRequests = async () => {
    const schoolId = user?.school_id || studentInfo?.school_id || (parentInfo ? parentInfo.school_id : null);
    if (!schoolId || !activeSessionId) return;

    setLoadingLeaveRequests(true);
    try {
      const isParent = user?.role === 'Parent' || !!parentInfo;
      const isTeacher = user?.role === 'Teacher';

      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          students:student_id (
            name,
            roll_number,
            classes:class_id (name, has_sections),
            sections:section_id (name)
          )
        `)
        .eq('school_id', schoolId)
        .eq('session_id', activeSessionId)
        .order('created_at', { ascending: false });

      if (isParent && parentInfo) {
        // For parents, get requests for their linked students
        const studentIds = linkedStudents.map((s) => s.id);
        if (studentIds.length > 0) {
          query = query.in('student_id', studentIds);
        } else {
          setLeaveRequests([]);
          setLoadingLeaveRequests(false);
          return;
        }
      } else if (isTeacher && user?.staff_id) {
        // For teachers, get their own staff leave requests
        query = query.eq('staff_id', user.staff_id);
      } else if (studentInfo && studentInfo.id) {
        // For students, get their own requests
        query = query.eq('student_id', studentInfo.id);
      } else {
        setLeaveRequests([]);
        setLoadingLeaveRequests(false);
        return;
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enrich with staff data if staff_id is present
      if (data && data.length > 0) {
        const staffIds = data
          .filter((req: any) => req.staff_id)
          .map((req: any) => req.staff_id)
          .filter((id: number, index: number, self: number[]) => self.indexOf(id) === index); // Unique IDs

        if (staffIds.length > 0) {
          const { data: staffData } = await supabase
            .from('staff')
            .select('id, name, role')
            .in('id', staffIds);

          if (staffData) {
            const staffMap = new Map(staffData.map((s: any) => [s.id, s]));
            data.forEach((req: any) => {
              if (req.staff_id && staffMap.has(req.staff_id)) {
                req.staff = staffMap.get(req.staff_id);
              }
            });
          }
        }
      }

      setLeaveRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching leave requests:', error);
    } finally {
      setLoadingLeaveRequests(false);
    }
  };

  // Fetch leave requests when modal closes or component mounts
  useEffect(() => {
    if (activeSessionId && (user || studentInfo || parentInfo)) {
      fetchLeaveRequests();
    }
  }, [activeSessionId, user, studentInfo, parentInfo, linkedStudents.length, user?.staff_id]);

  // Refetch when a new request is submitted
  useEffect(() => {
    if (!leaveRequestModalOpen && !submittingLeaveRequest) {
      fetchLeaveRequests();
    }
  }, [leaveRequestModalOpen, submittingLeaveRequest]);

  // Fetch complaints history
  const fetchComplaintsHistory = async () => {
    const schoolId = user?.school_id || studentInfo?.school_id || (parentInfo ? parentInfo.school_id : null);
    if (!schoolId) return;

    setLoadingComplaintsHistory(true);
    try {
      const isStudent = user?.role === 'Student' || !!studentInfo;
      const isParent = user?.role === 'Parent' || !!parentInfo;
      const isTeacher = user?.role === 'Teacher';

      let query = supabase
        .from('complaints')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (isStudent && studentInfo?.id) {
        query = query.eq('submitted_by', 'student').eq('submitted_by_id', studentInfo.id);
      } else if (isParent && parentInfo?.id) {
        query = query.eq('submitted_by', 'parent').eq('submitted_by_id', parentInfo.id);
      } else if (isTeacher && user?.staff_id) {
        query = query.eq('submitted_by', 'staff').eq('submitted_by_id', user.staff_id);
      } else {
        setComplaintsHistory([]);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      setComplaintsHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching complaints history:', error);
    } finally {
      setLoadingComplaintsHistory(false);
    }
  };

  // Fetch suggestions history
  const fetchSuggestionsHistory = async () => {
    const schoolId = user?.school_id || studentInfo?.school_id || (parentInfo ? parentInfo.school_id : null);
    if (!schoolId) return;

    setLoadingSuggestionsHistory(true);
    try {
      const isStudent = user?.role === 'Student' || !!studentInfo;
      const isParent = user?.role === 'Parent' || !!parentInfo;
      const isTeacher = user?.role === 'Teacher';

      let query = supabase
        .from('suggestions')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (isStudent && studentInfo?.id) {
        query = query.eq('submitted_by', 'student').eq('submitted_by_id', studentInfo.id);
      } else if (isParent && parentInfo?.id) {
        query = query.eq('submitted_by', 'parent').eq('submitted_by_id', parentInfo.id);
      } else if (isTeacher && user?.staff_id) {
        query = query.eq('submitted_by', 'staff').eq('submitted_by_id', user.staff_id);
      } else {
        setSuggestionsHistory([]);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      setSuggestionsHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching suggestions history:', error);
    } finally {
      setLoadingSuggestionsHistory(false);
    }
  };

  // Fetch complaints and suggestions history when history section is expanded
  useEffect(() => {
    if (leaveHistoryExpanded) {
      if (historyActiveTab === 1) {
        fetchComplaintsHistory();
      } else if (historyActiveTab === 2) {
        fetchSuggestionsHistory();
      }
    }
  }, [leaveHistoryExpanded, historyActiveTab]);

  // Refetch when modals close
  useEffect(() => {
    if (!complaintModalOpen && !submittingComplaint) {
      fetchComplaintsHistory();
    }
  }, [complaintModalOpen, submittingComplaint]);

  useEffect(() => {
    if (!suggestionModalOpen && !submittingSuggestion) {
      fetchSuggestionsHistory();
    }
  }, [suggestionModalOpen, submittingSuggestion]);

  // Handle cancel leave request
  const handleCancelLeaveRequest = async (requestId: number) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      showToast('Leave request cancelled successfully!', 'success');
      fetchLeaveRequests(); // Refresh the list
    } catch (error: any) {
      console.error('Error cancelling leave request:', error);
      showToast('Failed to cancel leave request: ' + (error.message || 'Unknown error'), 'error');
    }
  };

  // Suggestion Modal JSX (memoized to prevent re-renders on input)
  // MUST be defined before any conditional returns (including loading check) to follow Rules of Hooks
  const suggestionModalJSX = useMemo(() => {
    const schoolId = user?.school_id || studentInfo?.school_id || (parentInfo ? parentInfo.school_id : null);
    const isParent = user?.role === 'Parent' || !!parentInfo;
    const isTeacher = user?.role === 'Teacher';

    return (
      <StyledDialog
        open={suggestionModalOpen}
        onClose={() => !submittingSuggestion && setSuggestionModalOpen(false)}
        fullScreen={fullScreen}
        maxWidth="sm"
        slotProps={{
          backdrop: {
            sx: {
              position: 'fixed',
              zIndex: 1300
            }
          }
        }}
        PaperProps={{
          sx: {
            maxHeight: {
              xs: 'calc(100% - 96px)',
              sm: 'calc(100% - 100px)'
            }
          }
        }}
      >
        <DialogHeader>
          <DialogTitleStyled>
            Submit Suggestion
          </DialogTitleStyled>
          <IconButton
            onClick={() => setSuggestionModalOpen(false)}
            disabled={submittingSuggestion}
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogHeader>

        <StyledDialogContent>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Subject"
              value={suggestionForm.subject}
              onChange={(e) => setSuggestionForm({ ...suggestionForm, subject: e.target.value })}
              fullWidth
              required
              size="small"
              placeholder="Brief description of your suggestion"
            />

            <TextField
              label="Suggestion Details"
              value={suggestionForm.suggestionText}
              onChange={(e) => setSuggestionForm({ ...suggestionForm, suggestionText: e.target.value })}
              fullWidth
              required
              multiline
              rows={3}
              size="small"
              placeholder="Please provide detailed information about your suggestion..."
            />
          </Box>
        </StyledDialogContent>

        <FormActions>
          <Button
            onClick={() => setSuggestionModalOpen(false)}
            disabled={submittingSuggestion}
            variant="outlined"
            size="small"
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              const schoolId = user?.school_id || studentInfo?.school_id || parentInfo?.school_id;

              if (!schoolId) {
                showToast('School ID not found. Please contact administration.', 'error');
                return;
              }

              if (!suggestionForm.subject.trim() || !suggestionForm.suggestionText.trim()) {
                showToast('Please fill in all required fields.', 'error');
                return;
              }

              setSubmittingSuggestion(true);
              try {
                const isParent = user?.role === 'Parent' || !!parentInfo;
                const isTeacher = user?.role === 'Teacher';
                const submittedBy = isTeacher ? 'staff' : (isParent ? 'parent' : 'student');
                const submittedById = isTeacher
                  ? (user?.staff_id || null)
                  : (isParent
                    ? (parentInfo?.id || null)
                    : (studentInfo?.id || null));
                const submittedByName = isTeacher
                  ? (user?.name || 'Staff')
                  : (isParent
                    ? (parentInfo?.name || user?.name || 'Parent')
                    : (studentInfo?.name || user?.name || 'Student'));

                const { data: suggestionData, error } = await supabase
                  .from('suggestions')
                  .insert({
                    school_id: schoolId,
                    submitted_by: submittedBy,
                    submitted_by_id: submittedById,
                    submitted_by_name: submittedByName,
                    subject: suggestionForm.subject.trim(),
                    suggestion_text: suggestionForm.suggestionText.trim(),
                    status: 'in_review',
                  })
                  .select()
                  .single();

                if (error) throw error;

                // Notify admins/staff about the new suggestion
                try {
                  await createSuggestionNotificationForAdmins(
                    suggestionData.id,
                    schoolId,
                    submittedByName,
                    suggestionForm.subject.trim()
                  );
                } catch (notificationError) {
                  // Don't fail submission if notification fails
                  console.error('Error creating notification for suggestion:', notificationError);
                }

                showToast('Suggestion submitted successfully!', 'success');
                setSuggestionModalOpen(false);
                setSuggestionForm({
                  subject: '',
                  suggestionText: '',
                });
              } catch (error: any) {
                console.error('Error submitting suggestion:', error);
                showToast('Failed to submit suggestion: ' + (error.message || 'Unknown error'), 'error');
              } finally {
                setSubmittingSuggestion(false);
              }
            }}
            variant="contained"
            size="small"
            disabled={submittingSuggestion || !suggestionForm.subject.trim() || !suggestionForm.suggestionText.trim()}
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            {submittingSuggestion ? 'Submitting...' : 'Submit Suggestion'}
          </Button>
        </FormActions>
      </StyledDialog>
    );
  }, [suggestionModalOpen, submittingSuggestion, suggestionForm, user, studentInfo, parentInfo, showToast, fullScreen]);

  // Complaint Modal JSX (memoized to prevent re-renders on input)
  // MUST be defined before any conditional returns (including loading check) to follow Rules of Hooks
  const complaintModalJSX = useMemo(() => {
    const schoolId = user?.school_id || studentInfo?.school_id || (parentInfo ? parentInfo.school_id : null);
    const isParent = user?.role === 'Parent' || !!parentInfo;
    const isTeacher = user?.role === 'Teacher';

    return (
      <StyledDialog
        open={complaintModalOpen}
        onClose={() => !submittingComplaint && setComplaintModalOpen(false)}
        fullScreen={fullScreen}
        maxWidth="sm"
        slotProps={{
          backdrop: {
            sx: {
              position: 'fixed',
              zIndex: 1300
            }
          }
        }}
        PaperProps={{
          sx: {
            maxHeight: {
              xs: 'calc(100% - 96px)',
              sm: 'calc(100% - 100px)'
            }
          }
        }}
      >
        <DialogHeader>
          <DialogTitleStyled>
            Register Complaint
          </DialogTitleStyled>
          <IconButton
            onClick={() => setComplaintModalOpen(false)}
            disabled={submittingComplaint}
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogHeader>

        <StyledDialogContent>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Subject"
              value={complaintForm.subject}
              onChange={(e) => setComplaintForm({ ...complaintForm, subject: e.target.value })}
              fullWidth
              required
              size="small"
              placeholder="Brief description of your complaint"
            />

            <TextField
              label="Complaint Details"
              value={complaintForm.complaintText}
              onChange={(e) => setComplaintForm({ ...complaintForm, complaintText: e.target.value })}
              fullWidth
              required
              multiline
              rows={3}
              size="small"
              placeholder="Please provide detailed information about your complaint..."
            />
          </Box>
        </StyledDialogContent>

        <FormActions>
          <Button
            onClick={() => setComplaintModalOpen(false)}
            disabled={submittingComplaint}
            variant="outlined"
            size="small"
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              const schoolId = user?.school_id || studentInfo?.school_id || parentInfo?.school_id;

              if (!schoolId) {
                showToast('School ID not found. Please contact administration.', 'error');
                return;
              }

              if (!complaintForm.subject.trim() || !complaintForm.complaintText.trim()) {
                showToast('Please fill in all required fields.', 'error');
                return;
              }

              setSubmittingComplaint(true);
              try {
                const isParent = user?.role === 'Parent' || !!parentInfo;
                const submittedBy = isTeacher ? 'staff' : (isParent ? 'parent' : 'student');
                const submittedById = isTeacher
                  ? (user?.staff_id || null)
                  : (isParent
                    ? (parentInfo?.id || null)
                    : (studentInfo?.id || null));
                const submittedByName = isTeacher
                  ? (user?.name || 'Staff')
                  : (isParent
                    ? (parentInfo?.name || user?.name || 'Parent')
                    : (studentInfo?.name || user?.name || 'Student'));

                const { data: complaintData, error } = await supabase
                  .from('complaints')
                  .insert({
                    school_id: schoolId,
                    submitted_by: submittedBy,
                    submitted_by_id: submittedById,
                    submitted_by_name: submittedByName,
                    subject: complaintForm.subject.trim(),
                    complaint_text: complaintForm.complaintText.trim(),
                    status: 'in_review',
                  })
                  .select()
                  .single();

                if (error) throw error;

                // Notify admins/staff about the new complaint
                try {
                  await createComplaintNotificationForAdmins(
                    complaintData.id,
                    schoolId,
                    submittedByName,
                    complaintForm.subject.trim()
                  );
                } catch (notificationError) {
                  // Don't fail submission if notification fails
                  console.error('Error creating notification for complaint:', notificationError);
                }

                showToast('Complaint submitted successfully!', 'success');
                setComplaintModalOpen(false);
                setComplaintForm({
                  subject: '',
                  complaintText: '',
                });
              } catch (error: any) {
                console.error('Error submitting complaint:', error);
                showToast('Failed to submit complaint: ' + (error.message || 'Unknown error'), 'error');
              } finally {
                setSubmittingComplaint(false);
              }
            }}
            variant="contained"
            size="small"
            disabled={submittingComplaint || !complaintForm.subject.trim() || !complaintForm.complaintText.trim()}
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            {submittingComplaint ? 'Submitting...' : 'Submit Complaint'}
          </Button>
        </FormActions>
      </StyledDialog>
    );
  }, [complaintModalOpen, submittingComplaint, complaintForm, user, studentInfo, parentInfo, showToast, fullScreen]);

  // Leave Request Modal JSX (memoized to prevent re-renders on input)
  // MUST be defined before any conditional returns (including loading check) to follow Rules of Hooks
  const leaveRequestModalJSX = useMemo(() => {
    const schoolId = user?.school_id || studentInfo?.school_id || (parentInfo ? parentInfo.school_id : null);
    const isParent = user?.role === 'Parent' || !!parentInfo;

    return (
      <StyledDialog
        open={leaveRequestModalOpen}
        onClose={() => !submittingLeaveRequest && setLeaveRequestModalOpen(false)}
        fullScreen={fullScreen}
        maxWidth="sm"
        slotProps={{
          backdrop: {
            sx: {
              position: 'fixed',
              zIndex: 1300
            }
          }
        }}
        PaperProps={{
          sx: {
            maxHeight: {
              xs: 'calc(100% - 96px)',
              sm: 'calc(100% - 100px)'
            }
          }
        }}
      >
        <DialogHeader>
          <DialogTitleStyled>
            Request for Leave
          </DialogTitleStyled>
          <IconButton
            onClick={() => setLeaveRequestModalOpen(false)}
            disabled={submittingLeaveRequest}
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogHeader>

        <StyledDialogContent>
          <Box display="flex" flexDirection="column" gap={2}>
            {isParent && linkedStudents.length > 1 && (
              <FormControl fullWidth size="small">
                <InputLabel>Select Student</InputLabel>
                <Select
                  value={leaveRequestForm.studentId}
                  onChange={(e) => setLeaveRequestForm({ ...leaveRequestForm, studentId: e.target.value })}
                  label="Select Student"
                  MenuProps={selectMenuProps}
                >
                  {linkedStudents.map((student) => (
                    <MenuItem key={student.id} value={student.id.toString()}>
                      {student.name} {student.classes?.name && `(${student.classes.name}${student.sections?.name ? ` - ${student.sections.name}` : ''})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {(user?.role === 'Teacher') && user?.staff_id && (
              <Box sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: theme.BG === '#252525' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                border: `1px solid ${theme.BORDER}`
              }}>
                <Box component="span" sx={{ color: theme.TEXT_PRIMARY, fontWeight: 500 }}>
                  Requesting leave for: <strong>{user.name || 'You'}</strong>
                </Box>
              </Box>
            )}

            <FormControl fullWidth size="small">
              <InputLabel>Leave Type</InputLabel>
              <Select
                value={leaveRequestForm.leaveType}
                onChange={(e) => setLeaveRequestForm({ ...leaveRequestForm, leaveType: e.target.value })}
                label="Leave Type"
                MenuProps={selectMenuProps}
              >
                <MenuItem value="sick">Sick Leave</MenuItem>
                <MenuItem value="personal">Personal Leave</MenuItem>
                <MenuItem value="emergency">Emergency</MenuItem>
                <MenuItem value="family_event">Family Event</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            <Box display="flex" gap={2}>
              <AppDateField
                label="Start Date"
                value={leaveRequestForm.startDate}
                onChange={(e) => setLeaveRequestForm({ ...leaveRequestForm, startDate: e.target.value })}
                fullWidth
                required
                size="small"
                textFieldProps={{ InputLabelProps: { shrink: true } }}
              />
              <AppDateField
                label="End Date"
                value={leaveRequestForm.endDate}
                onChange={(e) => setLeaveRequestForm({ ...leaveRequestForm, endDate: e.target.value })}
                fullWidth
                required
                size="small"
                textFieldProps={{ InputLabelProps: { shrink: true } }}
              />
            </Box>

            <TextField
              label="Reason"
              value={leaveRequestForm.reason}
              onChange={(e) => setLeaveRequestForm({ ...leaveRequestForm, reason: e.target.value })}
              fullWidth
              required
              multiline
              rows={3}
              size="small"
              placeholder="Please provide a detailed reason for the leave request..."
            />
          </Box>
        </StyledDialogContent>

        <FormActions>
          <Button
            onClick={() => setLeaveRequestModalOpen(false)}
            disabled={submittingLeaveRequest}
            variant="outlined"
            size="small"
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              const schoolId = user?.school_id || studentInfo?.school_id || parentInfo?.school_id;

              if (!schoolId || !activeSessionId) {
                showToast('Active session not found. Please contact administration.', 'error');
                return;
              }

              const isTeacher = user?.role === 'Teacher';
              const hasStudentId = leaveRequestForm.studentId && !isTeacher;
              const hasStaffId = isTeacher && user?.staff_id;

              if ((!hasStudentId && !hasStaffId) || !leaveRequestForm.startDate || !leaveRequestForm.endDate || !leaveRequestForm.reason.trim()) {
                showToast('Please fill in all required fields.', 'error');
                return;
              }

              if (new Date(leaveRequestForm.startDate) > new Date(leaveRequestForm.endDate)) {
                showToast('End date must be after start date.', 'error');
                return;
              }

              setSubmittingLeaveRequest(true);
              try {
                const isParent = user?.role === 'Parent' || !!parentInfo;
                const requestedBy = isTeacher ? 'staff' : (isParent ? 'parent' : 'student');
                const requestedById = isTeacher
                  ? (user?.staff_id || null)
                  : (isParent
                    ? (parentInfo?.id || null)
                    : (studentInfo?.id || parseInt(leaveRequestForm.studentId)));
                const requestedByName = isTeacher
                  ? (user?.name || 'Staff')
                  : (isParent
                    ? (parentInfo?.name || user?.name || 'Parent')
                    : (studentInfo?.name || user?.name || 'Student'));

                const insertData: any = {
                  school_id: schoolId,
                  session_id: activeSessionId,
                  leave_type: leaveRequestForm.leaveType,
                  start_date: leaveRequestForm.startDate,
                  end_date: leaveRequestForm.endDate,
                  reason: leaveRequestForm.reason.trim(),
                  requested_by: requestedBy,
                  requested_by_id: requestedById,
                  requested_by_name: requestedByName,
                  status: 'pending',
                };

                if (isTeacher && user?.staff_id) {
                  insertData.staff_id = user.staff_id;
                } else {
                  insertData.student_id = parseInt(leaveRequestForm.studentId);
                }

                const { data: leaveRequestData, error } = await supabase
                  .from('leave_requests')
                  .insert(insertData)
                  .select()
                  .single();

                if (error) throw error;

                // Notify admins/staff about the new leave request
                try {
                  await createLeaveRequestNotificationForAdmins(
                    leaveRequestData.id,
                    schoolId,
                    requestedByName,
                    leaveRequestForm.leaveType,
                    leaveRequestForm.startDate,
                    leaveRequestForm.endDate,
                    isTeacher
                  );
                } catch (notificationError) {
                  // Don't fail submission if notification fails
                  console.error('Error creating notification for leave request:', notificationError);
                }

                showToast('Leave request submitted successfully!', 'success');
                setLeaveRequestModalOpen(false);
                const resetForm = {
                  studentId: '',
                  staffId: '',
                  leaveType: 'sick' as const,
                  startDate: '',
                  endDate: '',
                  reason: '',
                };
                if (isTeacher && user?.staff_id) {
                  resetForm.staffId = user.staff_id.toString();
                }
                setLeaveRequestForm(resetForm);
              } catch (error: any) {
                console.error('Error submitting leave request:', error);
                showToast('Failed to submit leave request: ' + (error.message || 'Unknown error'), 'error');
              } finally {
                setSubmittingLeaveRequest(false);
              }
            }}
            variant="contained"
            size="small"
            disabled={submittingLeaveRequest || (!leaveRequestForm.studentId && !(user?.role === 'Teacher' && user?.staff_id)) || !leaveRequestForm.startDate || !leaveRequestForm.endDate || !leaveRequestForm.reason.trim()}
            sx={{ 
              borderRadius: '6px',
              textTransform: 'none',
              px: 2
            }}
          >
            {submittingLeaveRequest ? 'Submitting...' : 'Submit Request'}
          </Button>
        </FormActions>
      </StyledDialog>
    );
  }, [leaveRequestModalOpen, submittingLeaveRequest, linkedStudents, theme, user, studentInfo, parentInfo, activeSessionId, leaveRequestForm, fullScreen, showToast]);

  // Early return for loading state - must be AFTER all hooks
  if (loading) {
    return <Loader />;
  }

  // If user is a Student, show student-specific menu cards
  if (user?.role === 'Student' || studentInfo) {
    // For students, get ID from studentInfo (for student session) or from user
    // Note: Students don't have staff_id, so we need to get their student ID differently
    let studentId: number | null = null;

    if (studentInfo?.id) {
      studentId = studentInfo.id;
    } else if (user?.role === 'Student') {
      // If user is logged in as student, we might need to fetch their student ID
      // For now, try to get it from localStorage or we'll need to fetch it
      try {
        const studentSession = localStorage.getItem('studentSession');
        if (studentSession) {
          const parsed = JSON.parse(studentSession);
          if (parsed?.id) {
            studentId = parsed.id;
          }
        }
      } catch (e) {
        // Error parsing student session
      }
    }

    return (
      <Container>
        <WelcomeHeader>
          <WelcomeText>
            <WelcomeSmall>Welcome to</WelcomeSmall>
            <WelcomeLarge>
              <GrowText>GROW</GrowText> <MoreText>MORE!</MoreText>
            </WelcomeLarge>
          </WelcomeText>
          <Subtitle>{user?.name || studentInfo?.name || 'Student'}</Subtitle>
        </WelcomeHeader>

        {/* Notices Section */}
        {notices.length > 0 && (
          <NoticesSection>
            <NoticesTitle>
              <NoticeIcon />
              Important
            </NoticesTitle>
            <NoticesGrid>
              {notices.map((notice) => {
                const getNoticeIcon = () => {
                  switch (notice.notice_type) {
                    case 'warning': return <WarningIcon style={{ color: '#f59e0b' }} />;
                    case 'urgent': return <ErrorIcon style={{ color: '#ef4444' }} />;
                    case 'success': return <CheckCircle style={{ color: '#10b981' }} />;
                    default: return <InfoIcon style={{ color: '#3b82f6' }} />;
                  }
                };
                
                return (
                  <NoticeCard key={notice.id} $noticeType={notice.notice_type}>
                    <NoticeHeader>
                      <NoticeTitleStyled>
                        {getNoticeIcon()}
                        {notice.title}
                      </NoticeTitleStyled>
                      <Box display="flex" alignItems="center" gap={1}>
                        <NoticeTypeBadge $noticeType={notice.notice_type}>
                          {notice.notice_type}
                        </NoticeTypeBadge>
                        <IconButton
                          size="small"
                          onClick={() => handleDismissNotice(notice.id)}
                          sx={{ 
                            color: 'text.secondary',
                            '&:hover': { color: 'text.primary' }
                          }}
                          title="Dismiss notice"
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </NoticeHeader>
                    <NoticeDescription>{notice.description}</NoticeDescription>
                  </NoticeCard>
                );
              })}
            </NoticesGrid>
          </NoticesSection>
        )}

        {/* Events Section */}
        {events.length > 0 && (
          <EventsSection>
            <EventsTitle>
              <EventIcon />
              Upcoming Events
            </EventsTitle>
            <EventsGrid>
              {events.map((event) => (
                <EventCard key={event.id} $eventType={event.event_type}>
                  <EventHeader>
                    <EventTitle>{event.title}</EventTitle>
                    <EventTypeBadge $eventType={event.event_type}>
                      {event.event_type}
                    </EventTypeBadge>
                  </EventHeader>
                  <EventDescription>{event.description}</EventDescription>
                  <EventDetails>
                    <EventDetailRow>
                      <CalendarIcon />
                      <span>
                        {formatEventDate(event.start_date)}
                        {event.start_date !== event.end_date && ` - ${formatEventDate(event.end_date)}`}
                      </span>
                    </EventDetailRow>
                    {!event.is_all_day && event.start_time && (
                      <EventDetailRow>
                        <AccessTimeIcon />
                        <span>
                          {formatEventTime(event.start_time)}
                          {event.end_time && ` - ${formatEventTime(event.end_time)}`}
                        </span>
                      </EventDetailRow>
                    )}
                    {event.location && (
                      <EventDetailRow>
                        <LocationIcon />
                        <span>{event.location}</span>
                      </EventDetailRow>
                    )}
                  </EventDetails>
                </EventCard>
              ))}
            </EventsGrid>
          </EventsSection>
        )}

        <QuickLinksGrid>
          {/* My Profile Card */}
          {studentId && isStudentCardVisible(renderSettings, 'my_profile') && (
            <QuickLinkCard onClick={() => {
              // Navigate to my-profile route (no ID in URL for security)
              navigate('/my-profile');
            }} $color="#6366f1">
              <CardHeader $color="#6366f1">
                <CardIcon $color="#6366f1">
                  <PersonIcon />
                </CardIcon>
                <CardTitle>My Profile</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  View your profile, attendance records, examination results, test records, and reports.
                </CardDescription>
                <CardAction $color="#6366f1">
                  View Profile
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          )}
        </QuickLinksGrid>

        {/* Quick Actions Section */}
        {isStudentActive && (isStudentCardVisible(renderSettings, 'request_leave') ||
          isStudentCardVisible(renderSettings, 'register_complaint') ||
          isStudentCardVisible(renderSettings, 'suggestions')) && (
            <QuickActionsSection>
              <QuickActionsTitle>Quick Actions</QuickActionsTitle>
              <QuickActionsCard>
                <QuickActionsGrid>
                  {isStudentCardVisible(renderSettings, 'request_leave') && (
                    <QuickActionItem
                      $color="#3b82f6"
                      onClick={() => {
                        if (studentId) {
                          setLeaveRequestForm({
                            studentId: studentId.toString(),
                            staffId: '',
                            leaveType: 'sick',
                            startDate: '',
                            endDate: '',
                            reason: '',
                          });
                          setLeaveRequestModalOpen(true);
                        }
                      }}
                    >
                      <QuickActionIcon $color="#3b82f6">
                        <EventBusyIcon />
                      </QuickActionIcon>
                      <QuickActionTitle>Request for Leave</QuickActionTitle>
                    </QuickActionItem>
                  )}
                  {isStudentCardVisible(renderSettings, 'register_complaint') && (
                    <QuickActionItem
                      $color="#ef4444"
                      onClick={() => {
                        setComplaintForm({
                          subject: '',
                          complaintText: '',
                        });
                        setComplaintModalOpen(true);
                      }}
                    >
                      <QuickActionIcon $color="#ef4444">
                        <FeedbackIcon />
                      </QuickActionIcon>
                      <QuickActionTitle>Register Complaint</QuickActionTitle>
                    </QuickActionItem>
                  )}
                  {isStudentCardVisible(renderSettings, 'suggestions') && (
                    <QuickActionItem
                      $color="#f59e0b"
                      onClick={() => {
                        setSuggestionForm({
                          subject: '',
                          suggestionText: '',
                        });
                        setSuggestionModalOpen(true);
                      }}
                    >
                      <QuickActionIcon $color="#f59e0b">
                        <LightbulbIcon />
                      </QuickActionIcon>
                      <QuickActionTitle>Suggestions</QuickActionTitle>
                    </QuickActionItem>
                  )}
                </QuickActionsGrid>

                {/* Request History Section with Tabs */}
                <div style={{ marginTop: '1.5rem', borderTop: `1px solid ${theme.BORDER}`, paddingTop: '1rem' }}>
                  <LeaveHistoryHeader onClick={() => setLeaveHistoryExpanded(!leaveHistoryExpanded)}>
                    <LeaveHistoryTitle>
                      <LeaveHistoryIcon>
                        <HistoryIcon />
                      </LeaveHistoryIcon>
                      Request History
                    </LeaveHistoryTitle>
                    <LeaveHistoryExpandIcon $expanded={leaveHistoryExpanded} />
                  </LeaveHistoryHeader>
                  <LeaveHistoryContent $expanded={leaveHistoryExpanded}>
                    {leaveHistoryExpanded && (
                      <>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
                          <Tabs
                            value={historyActiveTab}
                            onChange={(e, newValue) => setHistoryActiveTab(newValue)}
                            sx={{
                              '& .MuiTab-root': {
                                color: theme.TEXT_SECONDARY,
                                textTransform: 'none',
                                fontSize: '0.9rem',
                                fontWeight: 500,
                                '&.Mui-selected': {
                                  color: theme.ACCENT,
                                },
                              },
                              '& .MuiTabs-indicator': {
                                backgroundColor: theme.ACCENT,
                              },
                            }}
                          >
                            <Tab
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  Leave Requests
                                  {leaveRequests.length > 0 && (
                                    <Chip
                                      label={leaveRequests.length}
                                      size="small"
                                      sx={{
                                        height: '18px',
                                        minWidth: '18px',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        background: '#3b82f6',
                                        color: 'white',
                                      }}
                                    />
                                  )}
                                </Box>
                              }
                            />
                            <Tab
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  Complaints
                                  {complaintsHistory.length > 0 && (
                                    <Chip
                                      label={complaintsHistory.length}
                                      size="small"
                                      sx={{
                                        height: '18px',
                                        minWidth: '18px',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        background: '#ef4444',
                                        color: 'white',
                                      }}
                                    />
                                  )}
                                </Box>
                              }
                            />
                            <Tab
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  Suggestions
                                  {suggestionsHistory.length > 0 && (
                                    <Chip
                                      label={suggestionsHistory.length}
                                      size="small"
                                      sx={{
                                        height: '18px',
                                        minWidth: '18px',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        background: '#f59e0b',
                                        color: 'white',
                                      }}
                                    />
                                  )}
                                </Box>
                              }
                            />
                          </Tabs>
                        </Box>

                        {historyActiveTab === 0 && (
                          <>
                            {loadingLeaveRequests ? (
                              <Loader size="small" />
                            ) : leaveRequests.length === 0 ? (
                              <EmptyState>No leave requests found</EmptyState>
                            ) : (
                              <LeaveRequestList>
                                {leaveRequests.map((request: any) => {
                                  const student = request.students;
                                  const studentName = student?.name || 'Unknown Student';
                                  const className = student?.classes?.name || '';
                                  const sectionName = student?.sections?.name || '';
                                  const hasSections = student?.classes?.has_sections;
                                  const classSection = className + (hasSections && sectionName ? ` - ${sectionName}` : '');
                                  // Extract school ID with proper type handling - using any to bypass TypeScript narrowing issue
                                  // @ts-ignore - TypeScript incorrectly narrows parentInfo to 'never' in this context
                                  const parentSchoolId: number | null = parentInfo ? (parentInfo as any).school_id : null;
                                  // @ts-ignore - TypeScript incorrectly infers parentSchoolId as 'never' due to control flow analysis
                                  const currentSchoolId = user?.school_id || studentInfo?.school_id || parentSchoolId;
                                  // Use getStudentDisplayId utility function to get proper display ID
                                  let studentDisplayId = '';
                                  if (student && currentSchoolId) {
                                    try {
                                      const displayId = getStudentDisplayId({
                                        id: student.id || request.student_id,
                                        roll_number: student.roll_number
                                      });
                                      studentDisplayId = `S${currentSchoolId}-${displayId}`;
                                    } catch (e) {
                                      // Fallback if utility function fails
                                      if (student.roll_number) {
                                        const rollNumberStr = String(student.roll_number);
                                        if (rollNumberStr.includes('-')) {
                                          const parts = rollNumberStr.split('-');
                                          studentDisplayId = `S${currentSchoolId}-${parts[parts.length - 1]}`;
                                        } else {
                                          studentDisplayId = `S${currentSchoolId}-${rollNumberStr}`;
                                        }
                                      }
                                    }
                                  }

                                  return (
                                    <LeaveRequestItem key={request.id}>
                                      {student && (
                                        <LeaveRequestStudentInfo>
                                          <div className="student-name">
                                            <PersonIcon />
                                            {studentName}
                                          </div>
                                          {studentDisplayId && (
                                            <span className="student-id">{studentDisplayId}</span>
                                          )}
                                          {classSection && (
                                            <div className="student-class">
                                              <SchoolIcon />
                                              {classSection}
                                            </div>
                                          )}
                                        </LeaveRequestStudentInfo>
                                      )}
                                      <LeaveRequestHeader>
                                        <LeaveRequestInfo>
                                          <LeaveRequestType>
                                            {request.leave_type.replace('_', ' ')}
                                          </LeaveRequestType>
                                          <LeaveRequestDates>
                                            <CalendarIcon style={{ fontSize: '0.9rem' }} />
                                            {format(new Date(request.start_date), 'MMM dd, yyyy')} - {format(new Date(request.end_date), 'MMM dd, yyyy')}
                                          </LeaveRequestDates>
                                        </LeaveRequestInfo>
                                        <LeaveStatusBadge $status={request.status}>
                                          {request.status === 'approved' && <CheckCircle style={{ fontSize: '0.9rem' }} />}
                                          {request.status === 'rejected' && <Cancel style={{ fontSize: '0.9rem' }} />}
                                          {request.status === 'pending' && <Pending style={{ fontSize: '0.9rem' }} />}
                                          {request.status}
                                        </LeaveStatusBadge>
                                      </LeaveRequestHeader>
                                      <LeaveRequestReason>
                                        <strong>Reason:</strong> {request.reason}
                                      </LeaveRequestReason>
                                      <LeaveRequestMeta>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                          <span>
                                            <AccessTimeIcon style={{ fontSize: '0.85rem', marginRight: '0.25rem' }} />
                                            Requested: {format(new Date(request.created_at), 'MMM dd, yyyy hh:mm a')}
                                          </span>
                                          {request.reviewed_at && (
                                            <span>
                                              <AccessTimeIcon style={{ fontSize: '0.85rem', marginRight: '0.25rem' }} />
                                              Reviewed: {format(new Date(request.reviewed_at), 'MMM dd, yyyy hh:mm a')}
                                            </span>
                                          )}
                                        </div>
                                        {request.status === 'pending' && (
                                          <CancelButton onClick={() => handleCancelLeaveRequest(request.id)}>
                                            <CancelOutlined style={{ fontSize: '0.9rem' }} />
                                            Cancel
                                          </CancelButton>
                                        )}
                                      </LeaveRequestMeta>
                                      {request.review_notes && (
                                        <LeaveRequestReason style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                                          <strong>Review Notes:</strong> {request.review_notes}
                                        </LeaveRequestReason>
                                      )}
                                    </LeaveRequestItem>
                                  );
                                })}
                              </LeaveRequestList>
                            )}
                          </>
                        )}

                        {historyActiveTab === 1 && (
                          <>
                            {loadingComplaintsHistory ? (
                              <Loader size="small" />
                            ) : complaintsHistory.length === 0 ? (
                              <EmptyState>No complaints found</EmptyState>
                            ) : (
                              <LeaveRequestList>
                                {complaintsHistory.map((complaint: any) => (
                                  <LeaveRequestItem key={complaint.id}>
                                    <LeaveRequestHeader>
                                      <LeaveRequestInfo>
                                        <LeaveRequestType>
                                          {complaint.subject}
                                        </LeaveRequestType>
                                        <LeaveRequestDates>
                                          <CalendarIcon style={{ fontSize: '0.9rem' }} />
                                          {format(new Date(complaint.created_at), 'MMM dd, yyyy')}
                                        </LeaveRequestDates>
                                      </LeaveRequestInfo>
                                      <LeaveStatusBadge $status={complaint.status}>
                                        {complaint.status === 'reviewed' && <CheckCircle style={{ fontSize: '0.9rem' }} />}
                                        {complaint.status === 'in_review' && <Pending style={{ fontSize: '0.9rem' }} />}
                                        {complaint.status}
                                      </LeaveStatusBadge>
                                    </LeaveRequestHeader>
                                    <LeaveRequestReason>
                                      <strong>Details:</strong> {complaint.complaint_text}
                                    </LeaveRequestReason>
                                    <LeaveRequestMeta>
                                      <span>
                                        <AccessTimeIcon style={{ fontSize: '0.85rem', marginRight: '0.25rem' }} />
                                        Submitted: {format(new Date(complaint.created_at), 'MMM dd, yyyy hh:mm a')}
                                      </span>
                                      {complaint.reviewed_at && (
                                        <span>
                                          <AccessTimeIcon style={{ fontSize: '0.85rem', marginRight: '0.25rem' }} />
                                          Reviewed: {format(new Date(complaint.reviewed_at), 'MMM dd, yyyy hh:mm a')}
                                        </span>
                                      )}
                                    </LeaveRequestMeta>
                                    {complaint.review_notes && (
                                      <LeaveRequestReason style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                                        <strong>Review Notes:</strong> {complaint.review_notes}
                                      </LeaveRequestReason>
                                    )}
                                  </LeaveRequestItem>
                                ))}
                              </LeaveRequestList>
                            )}
                          </>
                        )}

                        {historyActiveTab === 2 && (
                          <>
                            {loadingSuggestionsHistory ? (
                              <Loader size="small" />
                            ) : suggestionsHistory.length === 0 ? (
                              <EmptyState>No suggestions found</EmptyState>
                            ) : (
                              <LeaveRequestList>
                                {suggestionsHistory.map((suggestion: any) => (
                                  <LeaveRequestItem key={suggestion.id}>
                                    <LeaveRequestHeader>
                                      <LeaveRequestInfo>
                                        <LeaveRequestType>
                                          {suggestion.subject}
                                        </LeaveRequestType>
                                        <LeaveRequestDates>
                                          <CalendarIcon style={{ fontSize: '0.9rem' }} />
                                          {format(new Date(suggestion.created_at), 'MMM dd, yyyy')}
                                        </LeaveRequestDates>
                                      </LeaveRequestInfo>
                                      <LeaveStatusBadge $status={suggestion.status}>
                                        {suggestion.status === 'reviewed' && <CheckCircle style={{ fontSize: '0.9rem' }} />}
                                        {suggestion.status === 'in_review' && <Pending style={{ fontSize: '0.9rem' }} />}
                                        {suggestion.status}
                                      </LeaveStatusBadge>
                                    </LeaveRequestHeader>
                                    <LeaveRequestReason>
                                      <strong>Details:</strong> {suggestion.suggestion_text}
                                    </LeaveRequestReason>
                                    <LeaveRequestMeta>
                                      <span>
                                        <AccessTimeIcon style={{ fontSize: '0.85rem', marginRight: '0.25rem' }} />
                                        Submitted: {format(new Date(suggestion.created_at), 'MMM dd, yyyy hh:mm a')}
                                      </span>
                                      {suggestion.reviewed_at && (
                                        <span>
                                          <AccessTimeIcon style={{ fontSize: '0.85rem', marginRight: '0.25rem' }} />
                                          Reviewed: {format(new Date(suggestion.reviewed_at), 'MMM dd, yyyy hh:mm a')}
                                        </span>
                                      )}
                                    </LeaveRequestMeta>
                                    {suggestion.review_notes && (
                                      <LeaveRequestReason style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                                        <strong>Review Notes:</strong> {suggestion.review_notes}
                                      </LeaveRequestReason>
                                    )}
                                  </LeaveRequestItem>
                                ))}
                              </LeaveRequestList>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </LeaveHistoryContent>
                </div>
              </QuickActionsCard>
            </QuickActionsSection>
          )}
        {leaveRequestModalJSX}
        {complaintModalJSX}
        {suggestionModalJSX}

        {/* Exit Confirmation Modal */}
        {showExitConfirm && (
          <ModalOverlay theme={theme} onClick={() => {
            showExitConfirmRef.current = false;
            setShowExitConfirm(false);
          }}>
            <ModalBox theme={theme} onClick={(e) => e.stopPropagation()}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  margin: '0 auto 16px',
                  background: theme.BG === '#252525' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ExitIcon style={{ fontSize: '32px', color: '#ef4444' }} />
                </div>
                <ModalTitle theme={theme} style={{ textAlign: 'center', marginBottom: '8px' }}>
                  Exit Application
                </ModalTitle>
                <p style={{
                  color: theme.BG === '#252525' ? '#9ca3af' : '#6b7280',
                  marginBottom: '24px',
                  textAlign: 'center'
                }}>
                  Are you sure you want to exit the application?
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <ModalButton
                    theme={theme}
                    onClick={() => {
                      showExitConfirmRef.current = false;
                      setShowExitConfirm(false);
                    }}
                    $color="#6b7280"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </ModalButton>
                  <ModalButton
                    theme={theme}
                    onClick={() => {
                      showExitConfirmRef.current = false;
                      setShowExitConfirm(false);
                      handleExit();
                    }}
                    $color="#ef4444"
                    style={{ flex: 1 }}
                  >
                    Exit
                  </ModalButton>
                </div>
              </div>
            </ModalBox>
          </ModalOverlay>
        )}
      </Container>
    );
  }

  // If user is a Parent, show linked students
  if (user?.role === 'Parent' || parentInfo) {
    return (
      <Container>
        <WelcomeHeader>
          <WelcomeText>
            <WelcomeSmall>Welcome to</WelcomeSmall>
            <WelcomeLarge>
              <GrowText>GROW</GrowText> <MoreText>MORE!</MoreText>
            </WelcomeLarge>
          </WelcomeText>
          <Subtitle>{user?.name || parentInfo?.name || 'Parent'}</Subtitle>
        </WelcomeHeader>

        {/* Notices Section */}
        {notices.length > 0 && (
          <NoticesSection>
            <NoticesTitle>
              <NoticeIcon />
              Important
            </NoticesTitle>
            <NoticesGrid>
              {notices.map((notice) => {
                const getNoticeIcon = () => {
                  switch (notice.notice_type) {
                    case 'warning': return <WarningIcon style={{ color: '#f59e0b' }} />;
                    case 'urgent': return <ErrorIcon style={{ color: '#ef4444' }} />;
                    case 'success': return <CheckCircle style={{ color: '#10b981' }} />;
                    default: return <InfoIcon style={{ color: '#3b82f6' }} />;
                  }
                };
                
                return (
                  <NoticeCard key={notice.id} $noticeType={notice.notice_type}>
                    <NoticeHeader>
                      <NoticeTitleStyled>
                        {getNoticeIcon()}
                        {notice.title}
                      </NoticeTitleStyled>
                      <Box display="flex" alignItems="center" gap={1}>
                        <NoticeTypeBadge $noticeType={notice.notice_type}>
                          {notice.notice_type}
                        </NoticeTypeBadge>
                        <IconButton
                          size="small"
                          onClick={() => handleDismissNotice(notice.id)}
                          sx={{ 
                            color: 'text.secondary',
                            '&:hover': { color: 'text.primary' }
                          }}
                          title="Dismiss notice"
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </NoticeHeader>
                    <NoticeDescription>{notice.description}</NoticeDescription>
                  </NoticeCard>
                );
              })}
            </NoticesGrid>
          </NoticesSection>
        )}

        {/* Events Section */}
        {events.length > 0 && (
          <EventsSection>
            <EventsTitle>
              <EventIcon />
              Upcoming Events
            </EventsTitle>
            <EventsGrid>
              {events.map((event) => (
                <EventCard key={event.id} $eventType={event.event_type}>
                  <EventHeader>
                    <EventTitle>{event.title}</EventTitle>
                    <EventTypeBadge $eventType={event.event_type}>
                      {event.event_type}
                    </EventTypeBadge>
                  </EventHeader>
                  <EventDescription>{event.description}</EventDescription>
                  <EventDetails>
                    <EventDetailRow>
                      <CalendarIcon />
                      <span>
                        {formatEventDate(event.start_date)}
                        {event.start_date !== event.end_date && ` - ${formatEventDate(event.end_date)}`}
                      </span>
                    </EventDetailRow>
                    {!event.is_all_day && event.start_time && (
                      <EventDetailRow>
                        <AccessTimeIcon />
                        <span>
                          {formatEventTime(event.start_time)}
                          {event.end_time && ` - ${formatEventTime(event.end_time)}`}
                        </span>
                      </EventDetailRow>
                    )}
                    {event.location && (
                      <EventDetailRow>
                        <LocationIcon />
                        <span>{event.location}</span>
                      </EventDetailRow>
                    )}
                  </EventDetails>
                </EventCard>
              ))}
            </EventsGrid>
          </EventsSection>
        )}

        {/* Linked Students Section - moved above Quick Actions */}
        {isParentCardVisible(renderSettings, 'linked_students') && (
          <LinkedStudentsCard>
            <LinkedStudentsCardHeader>
              <LinkedStudentsCardTitle>Linked Students</LinkedStudentsCardTitle>
            </LinkedStudentsCardHeader>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary, #666)' }}>
                Loading students...
              </div>
            ) : linkedStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary, #666)' }}>
                No students linked to this family.
              </div>
            ) : (
              <StudentCardGrid
                $hasScroll={linkedStudents.length > (gridColumns * 2)}
                $columns={gridColumns}
              >
                {linkedStudents.map((student) => (
                  <StudentCard
                    key={student.id}
                    status={student.status || 'active'}
                    data-student-card
                    onClick={(e) => {
                      // Don't toggle if clicking on action buttons
                      if ((e.target as HTMLElement).closest('.card-actions')) return;

                      // On mobile, toggle actions visibility
                      if (isMobile) {
                        setActiveCardId(activeCardId === student.id ? null : student.id);
                      }
                    }}
                  >
                    <StudentCardTop>
                      <StudentCardAvatar
                        title="Student Avatar"
                      >
                        {student.picture_url ? (
                          <img
                            src={student.picture_url}
                            alt={student.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              objectPosition: 'top',
                              display: 'block'
                            }}
                          />
                        ) : (
                          <span style={{ width: '100%', textAlign: 'center' }}>
                            {(student.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?')}
                          </span>
                        )}
                      </StudentCardAvatar>
                      <StudentCardContent style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.2rem 1.5rem 1.2rem 1rem' }}>
                        <StudentCardName>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span>{student.name}</span>
                            <StatusBadge status={student.status || 'active'}>
                              {(student.status || 'active').charAt(0).toUpperCase() + (student.status || 'active').slice(1)}
                            </StatusBadge>
                          </div>
                        </StudentCardName>
                        <StudentCardFatherName style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{student.father_name || 'N/A'}</span>
                          {(student.phone || student.father_mobile) && (
                            <span style={{ fontSize: '0.85rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <PhoneIcon style={{ fontSize: '0.9rem' }} />
                              {student.phone || student.father_mobile}
                            </span>
                          )}
                        </StudentCardFatherName>
                        <StudentCardDetails style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span>
                            {student.classes?.name || 'N/A'}
                            {student.sections?.name && ` (${student.sections.name})`}
                          </span>
                          {student.address && (
                            <span style={{ fontSize: '0.8rem', opacity: 0.7, textAlign: 'right', maxWidth: '50%', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                              <LocationIcon style={{ fontSize: '0.9rem' }} />
                              {student.address}
                            </span>
                          )}
                        </StudentCardDetails>
                      </StudentCardContent>
                    </StudentCardTop>
                    <CardActions className="card-actions" $active={activeCardId === student.id}>
                      <CardActionBtn
                        title="View Profile"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setActiveCardId(null);
                          const slug = createStudentSlug(student.name);
                          navigate(`/students/profile/${slug}`);
                        }}
                      >
                        <AccountCircle fontSize="inherit" />
                      </CardActionBtn>
                    </CardActions>
                  </StudentCard>
                ))}
              </StudentCardGrid>
            )}
          </LinkedStudentsCard>
        )}

        {/* Fee Info Section */}
        {isParentCardVisible(renderSettings, 'fee_info') && feeDetails.length > 0 && (
          <FeeInfoCard>
            <FeeInfoCardHeader>
              <FeeInfoCardTitle>
                <AttachMoneyIcon style={{ fontSize: '1.1rem' }} />
                Fee Ledger
              </FeeInfoCardTitle>
              {totalRemainingFee > 0 && (
                <TotalFeeBadge>
                  <span>Total Outstanding:</span>
                  <span>{formatCurrency(totalRemainingFee)}</span>
                </TotalFeeBadge>
              )}
            </FeeInfoCardHeader>

            <FeeTableContainer theme={theme}>
              <FeeTableWrapper theme={theme}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px', display: 'table', tableLayout: 'auto' }}>
                  <thead style={{ display: 'table-header-group', background: theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)' }}>
                    <tr style={{ display: 'table-row' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', color: theme.TEXT_SECONDARY, borderBottom: `1px solid ${theme.BORDER}`, whiteSpace: 'nowrap' }}>Student</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', color: theme.TEXT_SECONDARY, borderBottom: `1px solid ${theme.BORDER}`, whiteSpace: 'nowrap' }}>Total amount</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', color: theme.TEXT_SECONDARY, borderBottom: `1px solid ${theme.BORDER}`, whiteSpace: 'nowrap' }}>Amount paid</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', color: theme.TEXT_SECONDARY, borderBottom: `1px solid ${theme.BORDER}`, whiteSpace: 'nowrap' }}>Remaining amount</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', color: theme.TEXT_SECONDARY, borderBottom: `1px solid ${theme.BORDER}`, whiteSpace: 'nowrap' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody style={{ display: 'table-row-group' }}>
                    {feeDetails.map((feeDetail) => {
                      const student = linkedStudents.find(s => s.id === feeDetail.studentId);
                      if (!student) return null;

                      const isExpanded = expandedFeeRows.has(feeDetail.studentId);

                      return (
                        <React.Fragment key={feeDetail.studentId}>
                          <tr
                            onClick={() => {
                              setExpandedFeeRows(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(feeDetail.studentId)) {
                                  newSet.delete(feeDetail.studentId);
                                } else {
                                  newSet.add(feeDetail.studentId);
                                }
                                return newSet;
                              });
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <FeeTableCell theme={theme}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {isExpanded ? <ExpandLess /> : <ExpandMore />}
                                <strong>{student.name}</strong>
                              </div>
                            </FeeTableCell>
                            <FeeTableCell theme={theme}>{formatCurrency(feeDetail.totalInvoiced)}</FeeTableCell>
                            <FeeTableCell theme={theme}>{formatCurrency(feeDetail.totalPaid)}</FeeTableCell>
                            <FeeTableCell theme={theme}>
                              <span style={{
                                color: feeDetail.totalOutstanding > 0 ? '#ef4444' : '#10b981',
                                fontWeight: 600
                              }}>
                                {formatCurrency(feeDetail.totalOutstanding)}
                              </span>
                            </FeeTableCell>
                            <FeeTableCell theme={theme}>
                              <CardActionBtn
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  const slug = createStudentSlug(student.name);
                                  navigate(`/students/profile/${slug}`);
                                }}
                                title="View Profile"
                              >
                                <AccountCircle fontSize="inherit" />
                              </CardActionBtn>
                            </FeeTableCell>
                          </tr>
                          {isExpanded && (
                            <ExpandedRow theme={theme}>
                              <ExpandedCell colSpan={5} theme={theme}>
                                <ExpandedContent theme={theme}>
                                  <div style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ marginBottom: '0.75rem', color: theme.TEXT_PRIMARY }}>Invoices</h4>
                                    {feeDetail.invoices.length > 0 ? (
                                      <InvoiceTable theme={theme}>
                                        <thead>
                                          <tr>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', color: theme.TEXT_SECONDARY, borderBottom: `1px solid ${theme.BORDER}` }}>Month/Year</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', color: theme.TEXT_SECONDARY, borderBottom: `1px solid ${theme.BORDER}` }}>Invoice Date</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', color: theme.TEXT_SECONDARY, borderBottom: `1px solid ${theme.BORDER}` }}>Due Date</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', color: theme.TEXT_SECONDARY, borderBottom: `1px solid ${theme.BORDER}` }}>Amount</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', color: theme.TEXT_SECONDARY, borderBottom: `1px solid ${theme.BORDER}` }}>Status</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {feeDetail.invoices.map((invoice) => (
                                            <InvoiceTableRow key={invoice.id} theme={theme}>
                                              <InvoiceTableCell theme={theme}>
                                                {invoice.month ? `${invoice.month} ${invoice.year}` : `Year ${invoice.year}`}
                                              </InvoiceTableCell>
                                              <InvoiceTableCell theme={theme}>
                                                {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}
                                              </InvoiceTableCell>
                                              <InvoiceTableCell theme={theme}>
                                                {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                                              </InvoiceTableCell>
                                              <InvoiceTableCell theme={theme}>{formatCurrency(invoice.total_amount)}</InvoiceTableCell>
                                              <InvoiceTableCell theme={theme}>
                                                <span style={{
                                                  color: invoice.status === 'paid' ? '#10b981' : '#ef4444',
                                                  fontWeight: 500
                                                }}>
                                                  {invoice.status}
                                                </span>
                                              </InvoiceTableCell>
                                            </InvoiceTableRow>
                                          ))}
                                        </tbody>
                                      </InvoiceTable>
                                    ) : (
                                      <div style={{ padding: '1rem', textAlign: 'center', color: theme.TEXT_SECONDARY }}>
                                        No invoices found
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <h4 style={{ marginBottom: '0.75rem', color: theme.TEXT_PRIMARY }}>Payments</h4>
                                    {feeDetail.payments.length > 0 ? (
                                      <InvoiceTable theme={theme}>
                                        <thead>
                                          <tr>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', color: theme.TEXT_SECONDARY, borderBottom: `1px solid ${theme.BORDER}` }}>Payment Date</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', color: theme.TEXT_SECONDARY, borderBottom: `1px solid ${theme.BORDER}` }}>Amount</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', color: theme.TEXT_SECONDARY, borderBottom: `1px solid ${theme.BORDER}` }}>Discount</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', color: theme.TEXT_SECONDARY, borderBottom: `1px solid ${theme.BORDER}` }}>Net Amount</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', color: theme.TEXT_SECONDARY, borderBottom: `1px solid ${theme.BORDER}` }}>Payment Mode</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {feeDetail.payments.map((payment) => (
                                            <InvoiceTableRow key={payment.id} theme={theme}>
                                              <InvoiceTableCell theme={theme}>
                                                {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                                              </InvoiceTableCell>
                                              <InvoiceTableCell theme={theme}>{formatCurrency(payment.amount)}</InvoiceTableCell>
                                              <InvoiceTableCell theme={theme}>{formatCurrency(payment.discount_amount)}</InvoiceTableCell>
                                              <InvoiceTableCell theme={theme}>{formatCurrency(payment.net_amount)}</InvoiceTableCell>
                                              <InvoiceTableCell theme={theme}>{payment.payment_mode}</InvoiceTableCell>
                                            </InvoiceTableRow>
                                          ))}
                                        </tbody>
                                      </InvoiceTable>
                                    ) : (
                                      <div style={{ padding: '1rem', textAlign: 'center', color: theme.TEXT_SECONDARY }}>
                                        No payments found
                                      </div>
                                    )}
                                  </div>
                                </ExpandedContent>
                              </ExpandedCell>
                            </ExpandedRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </FeeTableWrapper>
            </FeeTableContainer>
          </FeeInfoCard>
        )}

        {/* Quick Actions Section */}
        {(isParentCardVisible(renderSettings, 'request_leave') ||
          isParentCardVisible(renderSettings, 'register_complaint') ||
          isParentCardVisible(renderSettings, 'suggestions')) && (
            <QuickActionsSection>
              <QuickActionsTitle>Quick Actions</QuickActionsTitle>
              <QuickActionsCard>
                <QuickActionsGrid>
                  {isParentCardVisible(renderSettings, 'request_leave') && (
                    <QuickActionItem
                      $color="#3b82f6"
                      onClick={() => {
                        setLeaveRequestForm({
                          studentId: linkedStudents.length > 0 ? linkedStudents[0].id.toString() : '',
                          staffId: '',
                          leaveType: 'sick',
                          startDate: '',
                          endDate: '',
                          reason: '',
                        });
                        setLeaveRequestModalOpen(true);
                      }}
                    >
                      <QuickActionIcon $color="#3b82f6">
                        <EventBusyIcon />
                      </QuickActionIcon>
                      <QuickActionTitle>Request for Leave</QuickActionTitle>
                    </QuickActionItem>
                  )}
                  {isParentCardVisible(renderSettings, 'register_complaint') && (
                    <QuickActionItem
                      $color="#ef4444"
                      onClick={() => {
                        setComplaintForm({
                          subject: '',
                          complaintText: '',
                        });
                        setComplaintModalOpen(true);
                      }}
                    >
                      <QuickActionIcon $color="#ef4444">
                        <FeedbackIcon />
                      </QuickActionIcon>
                      <QuickActionTitle>Register Complaint</QuickActionTitle>
                    </QuickActionItem>
                  )}
                  {isParentCardVisible(renderSettings, 'suggestions') && (
                    <QuickActionItem
                      $color="#f59e0b"
                      onClick={() => {
                        setSuggestionForm({
                          subject: '',
                          suggestionText: '',
                        });
                        setSuggestionModalOpen(true);
                      }}
                    >
                      <QuickActionIcon $color="#f59e0b">
                        <LightbulbIcon />
                      </QuickActionIcon>
                      <QuickActionTitle>Suggestions</QuickActionTitle>
                    </QuickActionItem>
                  )}
                </QuickActionsGrid>

                {/* Request History Section with Tabs */}
                <div style={{ marginTop: '1.5rem', borderTop: `1px solid ${theme.BORDER}`, paddingTop: '1rem' }}>
                  <LeaveHistoryHeader onClick={() => setLeaveHistoryExpanded(!leaveHistoryExpanded)}>
                    <LeaveHistoryTitle>
                      <LeaveHistoryIcon>
                        <HistoryIcon />
                      </LeaveHistoryIcon>
                      Request History
                    </LeaveHistoryTitle>
                    <LeaveHistoryExpandIcon $expanded={leaveHistoryExpanded} />
                  </LeaveHistoryHeader>
                  <LeaveHistoryContent $expanded={leaveHistoryExpanded}>
                    {leaveHistoryExpanded && (
                      <>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
                          <Tabs
                            value={historyActiveTab}
                            onChange={(e, newValue) => setHistoryActiveTab(newValue)}
                            sx={{
                              '& .MuiTab-root': {
                                color: theme.TEXT_SECONDARY,
                                textTransform: 'none',
                                fontSize: '0.9rem',
                                fontWeight: 500,
                                '&.Mui-selected': {
                                  color: theme.ACCENT,
                                },
                              },
                              '& .MuiTabs-indicator': {
                                backgroundColor: theme.ACCENT,
                              },
                            }}
                          >
                            <Tab
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  Leave Requests
                                  {leaveRequests.length > 0 && (
                                    <Chip
                                      label={leaveRequests.length}
                                      size="small"
                                      sx={{
                                        height: '18px',
                                        minWidth: '18px',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        background: '#3b82f6',
                                        color: 'white',
                                      }}
                                    />
                                  )}
                                </Box>
                              }
                            />
                            <Tab
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  Complaints
                                  {complaintsHistory.length > 0 && (
                                    <Chip
                                      label={complaintsHistory.length}
                                      size="small"
                                      sx={{
                                        height: '18px',
                                        minWidth: '18px',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        background: '#ef4444',
                                        color: 'white',
                                      }}
                                    />
                                  )}
                                </Box>
                              }
                            />
                            <Tab
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  Suggestions
                                  {suggestionsHistory.length > 0 && (
                                    <Chip
                                      label={suggestionsHistory.length}
                                      size="small"
                                      sx={{
                                        height: '18px',
                                        minWidth: '18px',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        background: '#f59e0b',
                                        color: 'white',
                                      }}
                                    />
                                  )}
                                </Box>
                              }
                            />
                          </Tabs>
                        </Box>

                        {historyActiveTab === 0 && (
                          <>
                            {loadingLeaveRequests ? (
                              <Loader size="small" />
                            ) : leaveRequests.length === 0 ? (
                              <EmptyState>No leave requests found</EmptyState>
                            ) : (
                              <LeaveRequestList>
                                {leaveRequests.map((request: any) => {
                                  const student = request.students;
                                  const studentName = student?.name || 'Unknown Student';
                                  const className = student?.classes?.name || '';
                                  const sectionName = student?.sections?.name || '';
                                  const hasSections = student?.classes?.has_sections;
                                  const classSection = className + (hasSections && sectionName ? ` - ${sectionName}` : '');
                                  // Extract school ID with proper type handling - using any to bypass TypeScript narrowing issue
                                  // @ts-ignore - TypeScript incorrectly narrows parentInfo to 'never' in this context
                                  const parentSchoolId: number | null = parentInfo ? (parentInfo as any).school_id : null;
                                  // @ts-ignore - TypeScript incorrectly infers parentSchoolId as 'never' due to control flow analysis
                                  const currentSchoolId = user?.school_id || studentInfo?.school_id || parentSchoolId;
                                  // Use getStudentDisplayId utility function to get proper display ID
                                  let studentDisplayId = '';
                                  if (student && currentSchoolId) {
                                    try {
                                      const displayId = getStudentDisplayId({
                                        id: student.id || request.student_id,
                                        roll_number: student.roll_number
                                      });
                                      studentDisplayId = `S${currentSchoolId}-${displayId}`;
                                    } catch (e) {
                                      // Fallback if utility function fails
                                      if (student.roll_number) {
                                        const rollNumberStr = String(student.roll_number);
                                        if (rollNumberStr.includes('-')) {
                                          const parts = rollNumberStr.split('-');
                                          studentDisplayId = `S${currentSchoolId}-${parts[parts.length - 1]}`;
                                        } else {
                                          studentDisplayId = `S${currentSchoolId}-${rollNumberStr}`;
                                        }
                                      }
                                    }
                                  }

                                  return (
                                    <LeaveRequestItem key={request.id}>
                                      {student && (
                                        <LeaveRequestStudentInfo>
                                          <div className="student-name">
                                            <PersonIcon />
                                            {studentName}
                                          </div>
                                          {studentDisplayId && (
                                            <span className="student-id">{studentDisplayId}</span>
                                          )}
                                          {classSection && (
                                            <div className="student-class">
                                              <SchoolIcon />
                                              {classSection}
                                            </div>
                                          )}
                                        </LeaveRequestStudentInfo>
                                      )}
                                      <LeaveRequestHeader>
                                        <LeaveRequestInfo>
                                          <LeaveRequestType>
                                            {request.leave_type.replace('_', ' ')}
                                          </LeaveRequestType>
                                          <LeaveRequestDates>
                                            <CalendarIcon style={{ fontSize: '0.9rem' }} />
                                            {format(new Date(request.start_date), 'MMM dd, yyyy')} - {format(new Date(request.end_date), 'MMM dd, yyyy')}
                                          </LeaveRequestDates>
                                        </LeaveRequestInfo>
                                        <LeaveStatusBadge $status={request.status}>
                                          {request.status === 'approved' && <CheckCircle style={{ fontSize: '0.9rem' }} />}
                                          {request.status === 'rejected' && <Cancel style={{ fontSize: '0.9rem' }} />}
                                          {request.status === 'pending' && <Pending style={{ fontSize: '0.9rem' }} />}
                                          {request.status}
                                        </LeaveStatusBadge>
                                      </LeaveRequestHeader>
                                      <LeaveRequestReason>
                                        <strong>Reason:</strong> {request.reason}
                                      </LeaveRequestReason>
                                      <LeaveRequestMeta>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                          <span>
                                            <AccessTimeIcon style={{ fontSize: '0.85rem', marginRight: '0.25rem' }} />
                                            Requested: {format(new Date(request.created_at), 'MMM dd, yyyy hh:mm a')}
                                          </span>
                                          {request.reviewed_at && (
                                            <span>
                                              <AccessTimeIcon style={{ fontSize: '0.85rem', marginRight: '0.25rem' }} />
                                              Reviewed: {format(new Date(request.reviewed_at), 'MMM dd, yyyy hh:mm a')}
                                            </span>
                                          )}
                                        </div>
                                        {request.status === 'pending' && (
                                          <CancelButton onClick={() => handleCancelLeaveRequest(request.id)}>
                                            <CancelOutlined style={{ fontSize: '0.9rem' }} />
                                            Cancel
                                          </CancelButton>
                                        )}
                                      </LeaveRequestMeta>
                                      {request.review_notes && (
                                        <LeaveRequestReason style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                                          <strong>Review Notes:</strong> {request.review_notes}
                                        </LeaveRequestReason>
                                      )}
                                    </LeaveRequestItem>
                                  );
                                })}
                              </LeaveRequestList>
                            )}
                          </>
                        )}

                        {historyActiveTab === 1 && (
                          <>
                            {loadingComplaintsHistory ? (
                              <Loader size="small" />
                            ) : complaintsHistory.length === 0 ? (
                              <EmptyState>No complaints found</EmptyState>
                            ) : (
                              <LeaveRequestList>
                                {complaintsHistory.map((complaint: any) => (
                                  <LeaveRequestItem key={complaint.id}>
                                    <LeaveRequestHeader>
                                      <LeaveRequestInfo>
                                        <LeaveRequestType>
                                          {complaint.subject}
                                        </LeaveRequestType>
                                        <LeaveRequestDates>
                                          <CalendarIcon style={{ fontSize: '0.9rem' }} />
                                          {format(new Date(complaint.created_at), 'MMM dd, yyyy')}
                                        </LeaveRequestDates>
                                      </LeaveRequestInfo>
                                      <LeaveStatusBadge $status={complaint.status}>
                                        {complaint.status === 'reviewed' && <CheckCircle style={{ fontSize: '0.9rem' }} />}
                                        {complaint.status === 'in_review' && <Pending style={{ fontSize: '0.9rem' }} />}
                                        {complaint.status}
                                      </LeaveStatusBadge>
                                    </LeaveRequestHeader>
                                    <LeaveRequestReason>
                                      <strong>Details:</strong> {complaint.complaint_text}
                                    </LeaveRequestReason>
                                    <LeaveRequestMeta>
                                      <span>
                                        <AccessTimeIcon style={{ fontSize: '0.85rem', marginRight: '0.25rem' }} />
                                        Submitted: {format(new Date(complaint.created_at), 'MMM dd, yyyy hh:mm a')}
                                      </span>
                                      {complaint.reviewed_at && (
                                        <span>
                                          <AccessTimeIcon style={{ fontSize: '0.85rem', marginRight: '0.25rem' }} />
                                          Reviewed: {format(new Date(complaint.reviewed_at), 'MMM dd, yyyy hh:mm a')}
                                        </span>
                                      )}
                                    </LeaveRequestMeta>
                                    {complaint.review_notes && (
                                      <LeaveRequestReason style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                                        <strong>Review Notes:</strong> {complaint.review_notes}
                                      </LeaveRequestReason>
                                    )}
                                  </LeaveRequestItem>
                                ))}
                              </LeaveRequestList>
                            )}
                          </>
                        )}

                        {historyActiveTab === 2 && (
                          <>
                            {loadingSuggestionsHistory ? (
                              <Loader size="small" />
                            ) : suggestionsHistory.length === 0 ? (
                              <EmptyState>No suggestions found</EmptyState>
                            ) : (
                              <LeaveRequestList>
                                {suggestionsHistory.map((suggestion: any) => (
                                  <LeaveRequestItem key={suggestion.id}>
                                    <LeaveRequestHeader>
                                      <LeaveRequestInfo>
                                        <LeaveRequestType>
                                          {suggestion.subject}
                                        </LeaveRequestType>
                                        <LeaveRequestDates>
                                          <CalendarIcon style={{ fontSize: '0.9rem' }} />
                                          {format(new Date(suggestion.created_at), 'MMM dd, yyyy')}
                                        </LeaveRequestDates>
                                      </LeaveRequestInfo>
                                      <LeaveStatusBadge $status={suggestion.status}>
                                        {suggestion.status === 'reviewed' && <CheckCircle style={{ fontSize: '0.9rem' }} />}
                                        {suggestion.status === 'in_review' && <Pending style={{ fontSize: '0.9rem' }} />}
                                        {suggestion.status}
                                      </LeaveStatusBadge>
                                    </LeaveRequestHeader>
                                    <LeaveRequestReason>
                                      <strong>Details:</strong> {suggestion.suggestion_text}
                                    </LeaveRequestReason>
                                    <LeaveRequestMeta>
                                      <span>
                                        <AccessTimeIcon style={{ fontSize: '0.85rem', marginRight: '0.25rem' }} />
                                        Submitted: {format(new Date(suggestion.created_at), 'MMM dd, yyyy hh:mm a')}
                                      </span>
                                      {suggestion.reviewed_at && (
                                        <span>
                                          <AccessTimeIcon style={{ fontSize: '0.85rem', marginRight: '0.25rem' }} />
                                          Reviewed: {format(new Date(suggestion.reviewed_at), 'MMM dd, yyyy hh:mm a')}
                                        </span>
                                      )}
                                    </LeaveRequestMeta>
                                    {suggestion.review_notes && (
                                      <LeaveRequestReason style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                                        <strong>Review Notes:</strong> {suggestion.review_notes}
                                      </LeaveRequestReason>
                                    )}
                                  </LeaveRequestItem>
                                ))}
                              </LeaveRequestList>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </LeaveHistoryContent>
                </div>
              </QuickActionsCard>
            </QuickActionsSection>
          )}
        {leaveRequestModalJSX}
        {complaintModalJSX}
        {suggestionModalJSX}

        {/* Exit Confirmation Modal */}
        {showExitConfirm && (
          <ModalOverlay theme={theme} onClick={() => {
            showExitConfirmRef.current = false;
            setShowExitConfirm(false);
          }}>
            <ModalBox theme={theme} onClick={(e) => e.stopPropagation()}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  margin: '0 auto 16px',
                  background: theme.BG === '#252525' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ExitIcon style={{ fontSize: '32px', color: '#ef4444' }} />
                </div>
                <ModalTitle theme={theme} style={{ textAlign: 'center', marginBottom: '8px' }}>
                  Exit Application
                </ModalTitle>
                <p style={{
                  color: theme.BG === '#252525' ? '#9ca3af' : '#6b7280',
                  marginBottom: '24px',
                  textAlign: 'center'
                }}>
                  Are you sure you want to exit the application?
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <ModalButton
                    theme={theme}
                    onClick={() => {
                      showExitConfirmRef.current = false;
                      setShowExitConfirm(false);
                    }}
                    $color="#6b7280"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </ModalButton>
                  <ModalButton
                    theme={theme}
                    onClick={() => {
                      showExitConfirmRef.current = false;
                      setShowExitConfirm(false);
                      handleExit();
                    }}
                    $color="#ef4444"
                    style={{ flex: 1 }}
                  >
                    Exit
                  </ModalButton>
                </div>
              </div>
            </ModalBox>
          </ModalOverlay>
        )}
      </Container>
    );
  }

  // If user is a Teacher, show teacher-specific menu cards
  if (user?.role === 'Teacher') {
    return (
      <Container>
        <WelcomeHeader>
          <WelcomeText>
            <WelcomeSmall>Welcome to</WelcomeSmall>
            <WelcomeLarge>
              <GrowText>GROW</GrowText> <MoreText>MORE!</MoreText>
            </WelcomeLarge>
          </WelcomeText>
          <Subtitle>{getGenderTitle(staffGender)}{staffName || user?.name || 'User'}{getClassSectionInfo()}</Subtitle>
        </WelcomeHeader>

        {/* Notices Section */}
        {notices.length > 0 && (
          <NoticesSection>
            <NoticesTitle>
              <NoticeIcon />
              Important
            </NoticesTitle>
            <NoticesGrid>
              {notices.map((notice) => {
                const getNoticeIcon = () => {
                  switch (notice.notice_type) {
                    case 'warning': return <WarningIcon style={{ color: '#f59e0b' }} />;
                    case 'urgent': return <ErrorIcon style={{ color: '#ef4444' }} />;
                    case 'success': return <CheckCircle style={{ color: '#10b981' }} />;
                    default: return <InfoIcon style={{ color: '#3b82f6' }} />;
                  }
                };
                
                return (
                  <NoticeCard key={notice.id} $noticeType={notice.notice_type}>
                    <NoticeHeader>
                      <NoticeTitleStyled>
                        {getNoticeIcon()}
                        {notice.title}
                      </NoticeTitleStyled>
                      <Box display="flex" alignItems="center" gap={1}>
                        <NoticeTypeBadge $noticeType={notice.notice_type}>
                          {notice.notice_type}
                        </NoticeTypeBadge>
                        <IconButton
                          size="small"
                          onClick={() => handleDismissNotice(notice.id)}
                          sx={{ 
                            color: 'text.secondary',
                            '&:hover': { color: 'text.primary' }
                          }}
                          title="Dismiss notice"
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </NoticeHeader>
                    <NoticeDescription>{notice.description}</NoticeDescription>
                  </NoticeCard>
                );
              })}
            </NoticesGrid>
          </NoticesSection>
        )}

        {/* Events Section */}
        {events.length > 0 && (
          <EventsSection>
            <EventsTitle>
              <EventIcon />
              Upcoming Events
            </EventsTitle>
            <EventsGrid>
              {events.map((event) => (
                <EventCard key={event.id} $eventType={event.event_type}>
                  <EventHeader>
                    <EventTitle>{event.title}</EventTitle>
                    <EventTypeBadge $eventType={event.event_type}>
                      {event.event_type}
                    </EventTypeBadge>
                  </EventHeader>
                  <EventDescription>{event.description}</EventDescription>
                  <EventDetails>
                    <EventDetailRow>
                      <CalendarIcon />
                      <span>
                        {formatEventDate(event.start_date)}
                        {event.start_date !== event.end_date && ` - ${formatEventDate(event.end_date)}`}
                      </span>
                    </EventDetailRow>
                    {!event.is_all_day && event.start_time && (
                      <EventDetailRow>
                        <AccessTimeIcon />
                        <span>
                          {formatEventTime(event.start_time)}
                          {event.end_time && ` - ${formatEventTime(event.end_time)}`}
                        </span>
                      </EventDetailRow>
                    )}
                    {event.location && (
                      <EventDetailRow>
                        <LocationIcon />
                        <span>{event.location}</span>
                      </EventDetailRow>
                    )}
                  </EventDetails>
                </EventCard>
              ))}
            </EventsGrid>
          </EventsSection>
        )}

        <QuickLinksGrid>
          {/* My Profile Card */}
          {user?.staff_id && isTeacherCardVisible(renderSettings, 'my_profile') && (
            <QuickLinkCard onClick={() => navigate('/profile')} $color="#6366f1">
              <CardHeader $color="#6366f1">
                <CardIcon $color="#6366f1">
                  <PersonIcon />
                </CardIcon>
                <CardTitle>My Profile</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  View your profile, attendance records, timetable, test analysis, and diary assignments.
                </CardDescription>
                <CardAction $color="#6366f1">
                  View Profile
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          )}

          {user?.staff_id && isTeacherCardVisible(renderSettings, 'my_profile') && <CardDivider />}

          {/* Attendance Cards - Only show if teacher is assigned as class teacher */}
          {isClassTeacher && isTeacherCardVisible(renderSettings, 'mark_attendance') && (
            <QuickLinkCard onClick={() => navigate('/attendance/mark')} $color="#3b82f6">
              <CardHeader $color="#3b82f6">
                <CardIcon $color="#3b82f6">
                  <AssessmentIcon />
                </CardIcon>
                <CardTitle>Mark Attendance</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  Take attendance for your classes. Mark students as present, absent, or late.
                </CardDescription>
                <CardAction $color="#3b82f6">
                  Get Started
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          )}

          {isClassTeacher && isTeacherCardVisible(renderSettings, 'attendance_reports') && (
            <QuickLinkCard onClick={() => navigate('/attendance/report')} $color="#10b981">
              <CardHeader $color="#10b981">
                <CardIcon $color="#10b981">
                  <BarChartIcon />
                </CardIcon>
                <CardTitle>Attendance Reports</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  View and analyze attendance records, generate reports, and track attendance patterns.
                </CardDescription>
                <CardAction $color="#10b981">
                  Get Started
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          )}

          {isClassTeacher && isTeacherCardVisible(renderSettings, 'half_leaves') && (
            <QuickLinkCard onClick={() => navigate('/attendance/half-leaves')} $color="#ec4899">
              <CardHeader $color="#ec4899">
                <CardIcon $color="#ec4899">
                  <AccessTimeIcon />
                </CardIcon>
                <CardTitle>Half Leaves</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  Record and manage half-day leaves for students in your classes. Track first half and second half leave records.
                </CardDescription>
                <CardAction $color="#ec4899">
                  Get Started
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          )}

          {(isClassTeacher && (isTeacherCardVisible(renderSettings, 'mark_attendance') || isTeacherCardVisible(renderSettings, 'attendance_reports') || isTeacherCardVisible(renderSettings, 'half_leaves'))) && <CardDivider />}

          {isTeacherCardVisible(renderSettings, 'reports') && (
            <QuickLinkCard onClick={() => navigate('/reports')} $color="#f59e0b">
              <CardHeader $color="#f59e0b">
                <CardIcon $color="#f59e0b">
                  <AssignmentIcon />
                </CardIcon>
                <CardTitle>Reports</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  View, create, and manage student and staff reports.
                </CardDescription>
                <CardAction $color="#f59e0b">
                  Get Started
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          )}

          {isTeacherCardVisible(renderSettings, 'reports') && <CardDivider />}

          {isTeacherCardVisible(renderSettings, 'test_marks_entry') && (
            <QuickLinkCard onClick={() => navigate('/test-records')} $color="#8b5cf6">
              <CardHeader $color="#8b5cf6">
                <CardIcon $color="#8b5cf6">
                  <QuizIcon />
                </CardIcon>
                <CardTitle>Test Marks Entry</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  Create and manage test records, enter marks, and track student performance.
                </CardDescription>
                <CardAction $color="#8b5cf6">
                  Get Started
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          )}

          {isTeacherCardVisible(renderSettings, 'test_records') && (
            <QuickLinkCard onClick={() => navigate('/test-record-master-sheet')} $color="#06b6d4">
              <CardHeader $color="#06b6d4">
                <CardIcon $color="#06b6d4">
                  <AssessmentIcon />
                </CardIcon>
                <CardTitle>Test Records</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  View comprehensive test records and performance analysis for students.
                </CardDescription>
                <CardAction $color="#06b6d4">
                  Get Started
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          )}

          {(isTeacherCardVisible(renderSettings, 'test_marks_entry') || isTeacherCardVisible(renderSettings, 'test_records')) && <CardDivider />}

          {isTeacherCardVisible(renderSettings, 'my_timetable') && (
            <QuickLinkCard onClick={() => navigate('/my-timetable')} $color="#8b5cf6">
              <CardHeader $color="#8b5cf6">
                <CardIcon $color="#8b5cf6">
                  <ScheduleIcon />
                </CardIcon>
                <CardTitle>My Timetable</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  View your assigned periods, subjects, and classes for the current session.
                </CardDescription>
                <CardAction $color="#8b5cf6">
                  View Schedule
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          )}

          {isTeacherCardVisible(renderSettings, 'my_timetable') && <CardDivider />}

          {isTeacherCardVisible(renderSettings, 'assign_diary') && (
            <QuickLinkCard onClick={() => navigate('/homework-diary')} $color="#10b981">
              <CardHeader $color="#10b981">
                <CardIcon $color="#10b981">
                  <AssignmentIcon />
                </CardIcon>
                <CardTitle>Assign Diary</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  Assign daily homework diary entries for your classes and subjects.
                </CardDescription>
                <CardAction $color="#10b981">
                  Get Started
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          )}

          {isTeacherCardVisible(renderSettings, 'assign_diary') && <CardDivider />}

          {/* Examination Marks Entry Cards */}
          {isTeacherCardVisible(renderSettings, 'examination_marks_entry') && publishedExaminations.map((examination) => (
            <QuickLinkCard
              key={examination.id}
              onClick={() => navigate('/marks-entry', { state: { examinationId: examination.id } })}
              $color="#ef4444"
            >
              <CardHeader $color="#ef4444">
                <CardIcon $color="#ef4444">
                  <SchoolIcon />
                </CardIcon>
                <CardTitle>{examination.name}</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  Enter marks for {examination.exam_type} - {examination.start_date ? formatAppDate(examination.start_date) : 'TBD'}
                </CardDescription>
                <CardAction $color="#ef4444">
                  Get Started
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          ))}
        </QuickLinksGrid>

        {/* Quick Actions Section */}
        {(isTeacherCardVisible(renderSettings, 'request_leave') ||
          isTeacherCardVisible(renderSettings, 'register_complaint') ||
          isTeacherCardVisible(renderSettings, 'suggestions')) && (
            <QuickActionsSection>
              <QuickActionsTitle>Quick Actions</QuickActionsTitle>
              <QuickActionsCard>
                <QuickActionsGrid>
                  {isTeacherCardVisible(renderSettings, 'request_leave') && (
                    <QuickActionItem
                      $color="#3b82f6"
                      onClick={() => {
                        if (user?.staff_id) {
                          setLeaveRequestForm({
                            studentId: '',
                            staffId: user.staff_id.toString(),
                            leaveType: 'sick',
                            startDate: '',
                            endDate: '',
                            reason: '',
                          });
                          setLeaveRequestModalOpen(true);
                        } else {
                          showToast('Unable to identify staff member. Please contact administration.', 'error');
                        }
                      }}
                    >
                      <QuickActionIcon $color="#3b82f6">
                        <EventBusyIcon />
                      </QuickActionIcon>
                      <QuickActionTitle>Request for Leave</QuickActionTitle>
                    </QuickActionItem>
                  )}
                  {isTeacherCardVisible(renderSettings, 'register_complaint') && (
                    <QuickActionItem
                      $color="#ef4444"
                      onClick={() => {
                        setComplaintForm({
                          subject: '',
                          complaintText: '',
                        });
                        setComplaintModalOpen(true);
                      }}
                    >
                      <QuickActionIcon $color="#ef4444">
                        <FeedbackIcon />
                      </QuickActionIcon>
                      <QuickActionTitle>Register Complaint</QuickActionTitle>
                    </QuickActionItem>
                  )}
                  {isTeacherCardVisible(renderSettings, 'suggestions') && (
                    <QuickActionItem
                      $color="#f59e0b"
                      onClick={() => {
                        setSuggestionForm({
                          subject: '',
                          suggestionText: '',
                        });
                        setSuggestionModalOpen(true);
                      }}
                    >
                      <QuickActionIcon $color="#f59e0b">
                        <LightbulbIcon />
                      </QuickActionIcon>
                      <QuickActionTitle>Suggestions</QuickActionTitle>
                    </QuickActionItem>
                  )}
                </QuickActionsGrid>

                {/* Request History Section with Tabs */}
                <div style={{ marginTop: '1.5rem', borderTop: `1px solid ${theme.BORDER}`, paddingTop: '1rem' }}>
                  <LeaveHistoryHeader onClick={() => setLeaveHistoryExpanded(!leaveHistoryExpanded)}>
                    <LeaveHistoryTitle>
                      <LeaveHistoryIcon>
                        <HistoryIcon />
                      </LeaveHistoryIcon>
                      Request History
                    </LeaveHistoryTitle>
                    <LeaveHistoryExpandIcon $expanded={leaveHistoryExpanded} />
                  </LeaveHistoryHeader>
                  <LeaveHistoryContent $expanded={leaveHistoryExpanded}>
                    {leaveHistoryExpanded && (
                      <>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
                          <Tabs
                            value={historyActiveTab}
                            onChange={(e, newValue) => setHistoryActiveTab(newValue)}
                            sx={{
                              '& .MuiTab-root': {
                                color: theme.TEXT_SECONDARY,
                                textTransform: 'none',
                                fontSize: '0.9rem',
                                fontWeight: 500,
                                '&.Mui-selected': {
                                  color: theme.ACCENT,
                                },
                              },
                              '& .MuiTabs-indicator': {
                                backgroundColor: theme.ACCENT,
                              },
                            }}
                          >
                            <Tab
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  Leave Requests
                                  {leaveRequests.length > 0 && (
                                    <Chip
                                      label={leaveRequests.length}
                                      size="small"
                                      sx={{
                                        height: '18px',
                                        minWidth: '18px',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        background: '#3b82f6',
                                        color: 'white',
                                      }}
                                    />
                                  )}
                                </Box>
                              }
                            />
                            <Tab
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  Complaints
                                  {complaintsHistory.length > 0 && (
                                    <Chip
                                      label={complaintsHistory.length}
                                      size="small"
                                      sx={{
                                        height: '18px',
                                        minWidth: '18px',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        background: '#ef4444',
                                        color: 'white',
                                      }}
                                    />
                                  )}
                                </Box>
                              }
                            />
                            <Tab
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  Suggestions
                                  {suggestionsHistory.length > 0 && (
                                    <Chip
                                      label={suggestionsHistory.length}
                                      size="small"
                                      sx={{
                                        height: '18px',
                                        minWidth: '18px',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        background: '#f59e0b',
                                        color: 'white',
                                      }}
                                    />
                                  )}
                                </Box>
                              }
                            />
                          </Tabs>
                        </Box>

                        {historyActiveTab === 0 && (
                          <>
                            {loadingLeaveRequests ? (
                              <Loader size="small" />
                            ) : leaveRequests.length === 0 ? (
                              <EmptyState>No leave requests found</EmptyState>
                            ) : (
                              <LeaveRequestList>
                                {leaveRequests.map((request: any) => {
                                  const student = request.students;
                                  const staff = request.staff;
                                  const isStaffRequest = !!staff || !!request.staff_id;

                                  // Student info
                                  const studentName = student?.name || 'Unknown Student';
                                  const className = student?.classes?.name || '';
                                  const sectionName = student?.sections?.name || '';
                                  const hasSections = student?.classes?.has_sections;
                                  const classSection = className + (hasSections && sectionName ? ` - ${sectionName}` : '');

                                  // Staff info
                                  const staffName = staff?.name || 'Unknown Staff';
                                  const staffRole = staff?.role || '';

                                  // Extract school ID with proper type handling
                                  // @ts-ignore - TypeScript incorrectly narrows parentInfo to 'never' in this context
                                  const parentSchoolId: number | null = parentInfo ? (parentInfo as any).school_id : null;
                                  // @ts-ignore - TypeScript incorrectly infers parentSchoolId as 'never' due to control flow analysis
                                  const currentSchoolId = user?.school_id || studentInfo?.school_id || parentSchoolId;

                                  // Use getStudentDisplayId utility function to get proper display ID
                                  let studentDisplayId = '';
                                  if (student && currentSchoolId) {
                                    try {
                                      const displayId = getStudentDisplayId({
                                        id: student.id || request.student_id,
                                        roll_number: student.roll_number
                                      });
                                      studentDisplayId = `S${currentSchoolId}-${displayId}`;
                                    } catch (e) {
                                      // Fallback if utility function fails
                                      if (student.roll_number) {
                                        const rollNumberStr = String(student.roll_number);
                                        if (rollNumberStr.includes('-')) {
                                          const parts = rollNumberStr.split('-');
                                          studentDisplayId = `S${currentSchoolId}-${parts[parts.length - 1]}`;
                                        } else {
                                          studentDisplayId = `S${currentSchoolId}-${rollNumberStr}`;
                                        }
                                      }
                                    }
                                  }

                                  return (
                                    <LeaveRequestItem key={request.id}>
                                      {student && (
                                        <LeaveRequestStudentInfo>
                                          <div className="student-name">
                                            <PersonIcon />
                                            {studentName}
                                          </div>
                                          {studentDisplayId && (
                                            <span className="student-id">{studentDisplayId}</span>
                                          )}
                                          {classSection && (
                                            <div className="student-class">
                                              <SchoolIcon />
                                              {classSection}
                                            </div>
                                          )}
                                        </LeaveRequestStudentInfo>
                                      )}
                                      {isStaffRequest && staff && (
                                        <LeaveRequestStudentInfo>
                                          <div className="student-name">
                                            <PersonIcon />
                                            {staffName}
                                          </div>
                                          {staffRole && (
                                            <div className="student-class">
                                              <SchoolIcon />
                                              {staffRole}
                                            </div>
                                          )}
                                        </LeaveRequestStudentInfo>
                                      )}
                                      <LeaveRequestHeader>
                                        <LeaveRequestInfo>
                                          <LeaveRequestType>
                                            {request.leave_type.replace('_', ' ')}
                                          </LeaveRequestType>
                                          <LeaveRequestDates>
                                            <CalendarIcon style={{ fontSize: '0.9rem' }} />
                                            {format(new Date(request.start_date), 'MMM dd, yyyy')} - {format(new Date(request.end_date), 'MMM dd, yyyy')}
                                          </LeaveRequestDates>
                                        </LeaveRequestInfo>
                                        <LeaveStatusBadge $status={request.status}>
                                          {request.status === 'approved' && <CheckCircle style={{ fontSize: '0.9rem' }} />}
                                          {request.status === 'rejected' && <Cancel style={{ fontSize: '0.9rem' }} />}
                                          {request.status === 'pending' && <Pending style={{ fontSize: '0.9rem' }} />}
                                          {request.status}
                                        </LeaveStatusBadge>
                                      </LeaveRequestHeader>
                                      <LeaveRequestReason>
                                        <strong>Reason:</strong> {request.reason}
                                      </LeaveRequestReason>
                                      <LeaveRequestMeta>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                          <span>
                                            <AccessTimeIcon style={{ fontSize: '0.85rem', marginRight: '0.25rem' }} />
                                            Requested: {format(new Date(request.created_at), 'MMM dd, yyyy hh:mm a')}
                                          </span>
                                          {request.reviewed_at && (
                                            <span>
                                              <AccessTimeIcon style={{ fontSize: '0.85rem', marginRight: '0.25rem' }} />
                                              Reviewed: {format(new Date(request.reviewed_at), 'MMM dd, yyyy hh:mm a')}
                                            </span>
                                          )}
                                        </div>
                                        {request.status === 'pending' && (
                                          <CancelButton onClick={() => handleCancelLeaveRequest(request.id)}>
                                            <CancelOutlined style={{ fontSize: '0.9rem' }} />
                                            Cancel
                                          </CancelButton>
                                        )}
                                      </LeaveRequestMeta>
                                      {request.review_notes && (
                                        <LeaveRequestReason style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                                          <strong>Review Notes:</strong> {request.review_notes}
                                        </LeaveRequestReason>
                                      )}
                                    </LeaveRequestItem>
                                  );
                                })}
                              </LeaveRequestList>
                            )}
                          </>
                        )}

                        {historyActiveTab === 1 && (
                          <>
                            {loadingComplaintsHistory ? (
                              <Loader size="small" />
                            ) : complaintsHistory.length === 0 ? (
                              <EmptyState>No complaints found</EmptyState>
                            ) : (
                              <LeaveRequestList>
                                {complaintsHistory.map((complaint: any) => (
                                  <LeaveRequestItem key={complaint.id}>
                                    <LeaveRequestHeader>
                                      <LeaveRequestInfo>
                                        <LeaveRequestType>
                                          {complaint.subject}
                                        </LeaveRequestType>
                                        <LeaveRequestDates>
                                          <CalendarIcon style={{ fontSize: '0.9rem' }} />
                                          {format(new Date(complaint.created_at), 'MMM dd, yyyy')}
                                        </LeaveRequestDates>
                                      </LeaveRequestInfo>
                                      <LeaveStatusBadge $status={complaint.status}>
                                        {complaint.status === 'reviewed' && <CheckCircle style={{ fontSize: '0.9rem' }} />}
                                        {complaint.status === 'in_review' && <Pending style={{ fontSize: '0.9rem' }} />}
                                        {complaint.status}
                                      </LeaveStatusBadge>
                                    </LeaveRequestHeader>
                                    <LeaveRequestReason>
                                      <strong>Details:</strong> {complaint.complaint_text}
                                    </LeaveRequestReason>
                                    <LeaveRequestMeta>
                                      <span>
                                        <AccessTimeIcon style={{ fontSize: '0.85rem', marginRight: '0.25rem' }} />
                                        Submitted: {format(new Date(complaint.created_at), 'MMM dd, yyyy hh:mm a')}
                                      </span>
                                      {complaint.reviewed_at && (
                                        <span>
                                          <AccessTimeIcon style={{ fontSize: '0.85rem', marginRight: '0.25rem' }} />
                                          Reviewed: {format(new Date(complaint.reviewed_at), 'MMM dd, yyyy hh:mm a')}
                                        </span>
                                      )}
                                    </LeaveRequestMeta>
                                    {complaint.review_notes && (
                                      <LeaveRequestReason style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                                        <strong>Review Notes:</strong> {complaint.review_notes}
                                      </LeaveRequestReason>
                                    )}
                                  </LeaveRequestItem>
                                ))}
                              </LeaveRequestList>
                            )}
                          </>
                        )}

                        {historyActiveTab === 2 && (
                          <>
                            {loadingSuggestionsHistory ? (
                              <Loader size="small" />
                            ) : suggestionsHistory.length === 0 ? (
                              <EmptyState>No suggestions found</EmptyState>
                            ) : (
                              <LeaveRequestList>
                                {suggestionsHistory.map((suggestion: any) => (
                                  <LeaveRequestItem key={suggestion.id}>
                                    <LeaveRequestHeader>
                                      <LeaveRequestInfo>
                                        <LeaveRequestType>
                                          {suggestion.subject}
                                        </LeaveRequestType>
                                        <LeaveRequestDates>
                                          <CalendarIcon style={{ fontSize: '0.9rem' }} />
                                          {format(new Date(suggestion.created_at), 'MMM dd, yyyy')}
                                        </LeaveRequestDates>
                                      </LeaveRequestInfo>
                                      <LeaveStatusBadge $status={suggestion.status}>
                                        {suggestion.status === 'reviewed' && <CheckCircle style={{ fontSize: '0.9rem' }} />}
                                        {suggestion.status === 'in_review' && <Pending style={{ fontSize: '0.9rem' }} />}
                                        {suggestion.status}
                                      </LeaveStatusBadge>
                                    </LeaveRequestHeader>
                                    <LeaveRequestReason>
                                      <strong>Details:</strong> {suggestion.suggestion_text}
                                    </LeaveRequestReason>
                                    <LeaveRequestMeta>
                                      <span>
                                        <AccessTimeIcon style={{ fontSize: '0.85rem', marginRight: '0.25rem' }} />
                                        Submitted: {format(new Date(suggestion.created_at), 'MMM dd, yyyy hh:mm a')}
                                      </span>
                                      {suggestion.reviewed_at && (
                                        <span>
                                          <AccessTimeIcon style={{ fontSize: '0.85rem', marginRight: '0.25rem' }} />
                                          Reviewed: {format(new Date(suggestion.reviewed_at), 'MMM dd, yyyy hh:mm a')}
                                        </span>
                                      )}
                                    </LeaveRequestMeta>
                                    {suggestion.review_notes && (
                                      <LeaveRequestReason style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                                        <strong>Review Notes:</strong> {suggestion.review_notes}
                                      </LeaveRequestReason>
                                    )}
                                  </LeaveRequestItem>
                                ))}
                              </LeaveRequestList>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </LeaveHistoryContent>
                </div>
              </QuickActionsCard>
            </QuickActionsSection>
          )}
        {leaveRequestModalJSX}
        {complaintModalJSX}
        {suggestionModalJSX}

        {/* Exit Confirmation Modal */}
        {showExitConfirm && (
          <ModalOverlay theme={theme} onClick={() => {
            showExitConfirmRef.current = false;
            setShowExitConfirm(false);
          }}>
            <ModalBox theme={theme} onClick={(e) => e.stopPropagation()}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  margin: '0 auto 16px',
                  background: theme.BG === '#252525' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ExitIcon style={{ fontSize: '32px', color: '#ef4444' }} />
                </div>
                <ModalTitle theme={theme} style={{ textAlign: 'center', marginBottom: '8px' }}>
                  Exit Application
                </ModalTitle>
                <p style={{
                  color: theme.BG === '#252525' ? '#9ca3af' : '#6b7280',
                  marginBottom: '24px',
                  textAlign: 'center'
                }}>
                  Are you sure you want to exit the application?
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <ModalButton
                    theme={theme}
                    onClick={() => {
                      showExitConfirmRef.current = false;
                      setShowExitConfirm(false);
                    }}
                    $color="#6b7280"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </ModalButton>
                  <ModalButton
                    theme={theme}
                    onClick={() => {
                      showExitConfirmRef.current = false;
                      setShowExitConfirm(false);
                      handleExit();
                    }}
                    $color="#ef4444"
                    style={{ flex: 1 }}
                  >
                    Exit
                  </ModalButton>
                </div>
              </div>
            </ModalBox>
          </ModalOverlay>
        )}
      </Container>
    );
  }

  // For non-teacher roles, show widget-based landing page
  // Get display name safely - use type assertion to avoid TypeScript narrowing issues
  const studentInfoName = (studentInfo as { id: number; name: string; school_id: number; role: string } | null)?.name;
  const displayName = user?.name || studentInfoName || 'User';

  if (widgets.length === 0) {
    return (
      <Container>
        <WelcomeHeader>
          <Title>Welcome, {displayName}</Title>
          <Subtitle>No widgets configured for your role. Contact your administrator.</Subtitle>
        </WelcomeHeader>
      </Container>
    );
  }

  return (
    <Container>
      <WelcomeHeader>
        <Title>Welcome, {displayName}</Title>
        <Subtitle>Your personalized landing page</Subtitle>
      </WelcomeHeader>

      {/* Notices Section */}
      {notices.length > 0 && (
        <NoticesSection>
          <NoticesTitle>
            <NoticeIcon />
            Important
          </NoticesTitle>
          <NoticesGrid>
            {notices.map((notice) => {
              const getNoticeIcon = () => {
                switch (notice.notice_type) {
                  case 'warning': return <WarningIcon style={{ color: '#f59e0b' }} />;
                  case 'urgent': return <ErrorIcon style={{ color: '#ef4444' }} />;
                  case 'success': return <CheckCircle style={{ color: '#10b981' }} />;
                  default: return <InfoIcon style={{ color: '#3b82f6' }} />;
                }
              };
              
              return (
                <NoticeCard key={notice.id} $noticeType={notice.notice_type}>
                  <NoticeHeader>
                    <NoticeTitleStyled>
                      {getNoticeIcon()}
                      {notice.title}
                    </NoticeTitleStyled>
                    <NoticeTypeBadge $noticeType={notice.notice_type}>
                      {notice.notice_type}
                    </NoticeTypeBadge>
                  </NoticeHeader>
                  <NoticeDescription>{notice.description}</NoticeDescription>
                </NoticeCard>
              );
            })}
          </NoticesGrid>
        </NoticesSection>
      )}

      {/* Events Section */}
      {events.length > 0 && (
        <EventsSection>
          <EventsTitle>
            <EventIcon />
            Upcoming Events
          </EventsTitle>
          <EventsGrid>
            {events.map((event) => (
              <EventCard key={event.id} $eventType={event.event_type}>
                <EventHeader>
                  <EventTitle>{event.title}</EventTitle>
                  <EventTypeBadge $eventType={event.event_type}>
                    {event.event_type}
                  </EventTypeBadge>
                </EventHeader>
                <EventDescription>{event.description}</EventDescription>
                <EventDetails>
                  <EventDetailRow>
                    <CalendarIcon />
                    <span>
                      {formatEventDate(event.start_date)}
                      {event.start_date !== event.end_date && ` - ${formatEventDate(event.end_date)}`}
                    </span>
                  </EventDetailRow>
                  {!event.is_all_day && event.start_time && (
                    <EventDetailRow>
                      <AccessTimeIcon />
                      <span>
                        {formatEventTime(event.start_time)}
                        {event.end_time && ` - ${formatEventTime(event.end_time)}`}
                      </span>
                    </EventDetailRow>
                  )}
                  {event.location && (
                    <EventDetailRow>
                      <LocationIcon />
                      <span>{event.location}</span>
                    </EventDetailRow>
                  )}
                </EventDetails>
              </EventCard>
            ))}
          </EventsGrid>
        </EventsSection>
      )}

      <WidgetsGrid>
        {widgets.map((widget) => {
          const IconComponent = getIconComponent(widget.icon_name);
          const value = widgetData[widget.widget_key] ?? '—';

          return (
            <WidgetCard
              key={widget.id}
              $color={widget.color}
              onClick={() => handleWidgetClick(widget)}
            >
              <WidgetHeader $color={widget.color}>
                <WidgetIcon $color={widget.color}>
                  <IconComponent />
                </WidgetIcon>
                <WidgetTitle>{widget.widget_name}</WidgetTitle>
              </WidgetHeader>
              <WidgetBody>
                {widget.widget_type === 'stat' && (
                  <WidgetValue>{value}</WidgetValue>
                )}
                {widget.widget_type === 'link' && (
                  <WidgetDescription>
                    {widget.widget_config?.description || 'Click to navigate'}
                  </WidgetDescription>
                )}
                <WidgetAction $color={widget.color}>
                  {widget.widget_type === 'stat' ? 'View Details' : 'Open'}
                </WidgetAction>
              </WidgetBody>
            </WidgetCard>
          );
        })}
      </WidgetsGrid>
    </Container>
  );
};

export default CustomLandingPage;
