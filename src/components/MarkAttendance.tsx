import React, { useEffect, useState, useContext, useRef, MouseEvent, useCallback, useMemo } from 'react';
import styled, { css } from 'styled-components';
import { supabase } from '../supabaseClient';
import { ThemeContext, useProgress, darkTheme, lightTheme } from './Layout';
import { useToast } from './useToast';
import { fetchAllRows } from '../utils/paginationHelper';
import { format, isSunday, parseISO } from 'date-fns';
import { sortClasses } from '../utils/classUtils';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircle,
  Cancel,
  RemoveCircle,
  Info,
  Person,
  CalendarToday,
  Class,
  Groups,
  Search,
  CheckCircleOutline,
  CancelOutlined,
  HourglassEmpty,
  Delete,
  Save,
  Refresh,
  Close
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import NoSessionsFound from './NoSessionsFound';
import NoStudentsFound from './NoStudentsFound';
import AppDateField from './shared/AppDateField';
import { useTheme } from 'styled-components';
import { useActivityTracking } from '../hooks/useActivityTracking';
import { whatsappSemiAutoService, AttendanceNotificationData } from '../services/whatsappSemiAuto';
import WhatsAppBulkSender from './WhatsAppBulkSender';
import { hasPermission } from '../services/permissionService';
import { usePageFooter } from './Layout/contexts/PageFooterContext';
import {
  clayCardStyle,
  clayPanelStyle,
  clayInputStyle,
  getLayoutPalette,
  getDashboardPalette,
  minimalSelectMenuStyle,
  CARD_RADIUS_LG,
  isDark as checkIsDark
} from '../styles/DesignSystem';

import Loader from '../components/Loader';
// Move bounceAnimation to the top, before any styled components use it
const bounceAnimation = `
  @keyframes bounceAttention {
    0%, 100% { transform: scale(1); }
    10% { transform: scale(1.08, 0.92); }
    20% { transform: scale(0.92, 1.08); }
    30% { transform: scale(1.04, 0.96); }
    40% { transform: scale(0.98, 1.02); }
    50% { transform: scale(1.02, 0.98); }
    60% { transform: scale(1, 1); }
  }
`;

// Update swellAnimation to last 4 seconds
const swellAnimation = `
  @keyframes swell {
    0% { transform: scale(1); }
    100% { transform: scale(1.45); }
  }
`;

// Add spin animation for WhatsApp processing
const spinAnimation = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Styled Components
const PageContainer = styled.div`
  width: 100%;
  min-height: 100%;
  margin: 0;
  padding: 0.55rem;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top right, ${({ theme }) => `${theme.ACCENT}14`} 0%, transparent 28%),
    ${({ theme }) => getLayoutPalette(theme).shellBg};
  max-width: 100%;
  overflow: hidden;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  position: relative;
  isolation: isolate;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, transparent 26%),
      radial-gradient(circle at bottom left, ${({ theme }) => `${theme.ACCENT}10`} 0%, transparent 34%);
    z-index: -1;
  }

  @media (max-width: 768px) {
    padding: 0.38rem;
    gap: 0.35rem;
  }
`;

const Header = styled.div`
  ${clayPanelStyle}
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
  margin: 0;
  position: sticky;
  top: 0;
  z-index: 100;
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).shellBorder};
  border-radius: ${CARD_RADIUS_LG};
  padding: 0.42rem 0.58rem;
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};
  overflow: hidden;
  min-height: 40px;

  @media (max-width: 768px) {
    gap: 0.42rem;
    padding: 0.4rem 0.48rem;
  }
`;

const MainContent = styled.div`
  ${clayPanelStyle}
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.42rem;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).shellBorder};
  border-radius: ${CARD_RADIUS_LG};
  @media (max-width: 700px) {
    padding: 0.34rem;
    scroll-behavior: auto;
  }
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => getLayoutPalette(theme).dropdownThumb};
    border-radius: 4px;
    transition: background 0.2s;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => getLayoutPalette(theme).dropdownThumbHover};
  }
`;

const Footer = styled.div`
  flex-shrink: 0; /* Don't shrink */
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.2rem 0.5rem;
  border-top: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.BG};
  box-shadow: 0 -1px 6px #0001;
  min-height: 36px;
  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 0.5rem 0.2rem;
    min-height: 44px;
  }
`;

const ControlsBar = styled.div`
  display: flex;
  gap: 1.2rem;
  margin-bottom: 1.2rem;
  flex-wrap: wrap;
  align-items: flex-end;
  position: sticky;
  top: 0;
  background: ${({ theme }: { theme: any }) => theme.CARD};
  z-index: 10;
  padding: 0.7rem 1rem 0.7rem 1rem;
  box-shadow: 0 2px 8px #0002;
  border-radius: 10px;
  border: 1px solid ${({ theme }: { theme: any }) => theme.BORDER};
  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.7rem;
    padding: 0.7rem;
  }
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 140px;
  flex: 1 1 180px;
  @media (max-width: 700px) {
    width: 100%;
    min-width: 0;
    flex: none;
    &.search-group {
      margin-top: 0.7rem;
      order: 2;
    }
    &:not(.search-group) {
      order: 1;
    }
  }
`;

const Label = styled.label`
  font-size: 0.97rem;
  color: ${({ theme }: { theme: any }) => theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const Input = styled.input`
  padding: 0.6rem 1rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }: { theme: any }) => theme.FIELD_BORDER};
  background: ${({ theme }: { theme: any }) => theme.FIELD_BG};
  color: ${({ theme }: { theme: any }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  outline: none;
  transition: all 0.2s;
  &:focus {
    border-color: ${({ theme }: { theme: any }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }: { theme: any }) => theme.ACCENT}33;
  }
  @media (max-width: 700px) {
    width: 100%;
  }
`;

const Select = styled.select`
  padding: 0.6rem 1rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }: { theme: any }) => theme.FIELD_BORDER};
  background: ${({ theme }: { theme: any }) => theme.FIELD_BG};
  color: ${({ theme }: { theme: any }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  outline: none;
  transition: all 0.2s;
  cursor: pointer;
  &:focus {
    border-color: ${({ theme }: { theme: any }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }: { theme: any }) => theme.ACCENT}33;
  }
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  background: ${({ theme }: { theme: any }) => theme.CARD};
  border-radius: 14px;
  box-shadow: ${({ theme }: { theme: any }) => theme.SHADOW};
  border: 1.5px solid ${({ theme }: { theme: any }) => theme.BORDER};
  box-sizing: border-box;
  @media (max-width: 700px) {
    border-radius: 10px;
    margin: 0 -8px;
    width: calc(100% + 16px);
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 700px;
  @media (max-width: 700px) {
    min-width: 600px;
  }
`;

const Th = styled.th`
  padding: 0.6rem 0.7rem;
  text-align: left;
  color: ${({ theme }: { theme: any }) => theme.TEXT_SECONDARY};
  font-weight: 700;
  font-size: 0.97rem;
  border-bottom: 1px solid ${({ theme }: { theme: any }) => theme.BORDER};
  background: ${({ theme }: { theme: any }) => theme.CARD};
  position: sticky;
  top: 0;
  z-index: 2;
`;

const Td = styled.td`
  padding: 0.6rem 0.7rem;
  color: ${({ theme }: { theme: any }) => theme.TEXT_PRIMARY};
  border-bottom: 1px solid ${({ theme }: { theme: any }) => theme.BORDER};
  font-size: 1.01rem;
`;

const Tr = styled.tr`
  &:hover {
    background: ${({ theme }: { theme: any }) => theme.FIELD_BG};
  }
`;

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ theme }: { theme: any }) => theme.FIELD_BG};
  color: ${({ theme }: { theme: any }) => theme.TEXT_SECONDARY};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
  margin-right: 0.7rem;
`;

const NameCell = styled.div`
  display: flex;
  align-items: center;
  font-weight: 700;
  color: ${({ theme }: { theme: any }) => theme.TEXT_PRIMARY};
`;

const StatusCell = styled.div`
  display: flex;
  gap: 0.4rem;
  align-items: center;
`;

const StatusButton = styled.button<{ $active: boolean; $color: string }>`
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: ${({ $active, $color }) => $active ? $color : 'transparent'};
  color: ${({ $active, $color }) => $active ? '#fff' : $color};
  border: 1.5px solid ${({ $color }) => $color};
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.18s, color 0.18s, border-color 0.18s;
  &:hover, &:focus {
    background: ${({ $color }) => $color};
    color: #fff;
    outline: none;
  }
`;

const BulkStatusBar = styled.div`
  display: flex;
  gap: 0.4rem;
  align-items: center;
  margin-bottom: 0.2rem;
  margin-left: 0.7rem;
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.2rem;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  border: none;
  background: ${({ variant, theme }: { variant?: 'primary' | 'secondary'; theme: any }) =>
    variant === 'primary' ? theme.ACCENT : theme.FIELD_BG};
  color: ${({ variant, theme }: { variant?: 'primary' | 'secondary'; theme: any }) =>
    variant === 'primary' ? '#fff' : theme.TEXT_PRIMARY};
  transition: background 0.18s, box-shadow 0.18s;
  &:hover {
    background: ${({ variant, theme }: { variant?: 'primary' | 'secondary'; theme: any }) =>
      variant === 'primary' ? theme.ACCENT + 'cc' : theme.FIELD_BG};
    box-shadow: 0 2px 8px ${({ theme }: { theme: any }) => theme.ACCENT}22;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

// Add new styled components for two-column layout and enhanced visuals
const TwoColumnGrid = styled.div`
  display: flex;
  gap: 1.1rem;
  justify-content: center;
  align-items: flex-start;
  margin: 0 auto 1.2rem auto;
  max-width: 1400px;
  @media (max-width: 700px) {
    flex-direction: column;
    gap: 0.7rem;
    align-items: stretch;
    > div {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
    }
  }
`;
const TableCard = styled.div`
  ${clayCardStyle}
  flex: 1 1 0;
  min-width: 340px;
  border-radius: ${CARD_RADIUS_LG};
  padding: 0 0 1rem 0;
  overflow-x: auto;
`;
const EnhancedTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 340px;
`;
const EnhancedTh = styled.th`
  padding: 0.7rem 0.75rem;
  text-align: left;
  color: ${({ theme }: { theme: any }) => getDashboardPalette(theme).subtleText};
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 1px solid ${({ theme }: { theme: any }) => getLayoutPalette(theme).shellDivider};
  background: transparent;
  position: sticky;
  top: 0;
  z-index: 2;
`;
const EnhancedTd = styled.td`
  padding: 0.8rem 0.75rem;
  color: ${({ theme }: { theme: any }) => theme.TEXT_PRIMARY};
  border-bottom: 1px solid ${({ theme }: { theme: any }) => getLayoutPalette(theme).shellDivider};
  font-size: 0.92rem;
`;
const EnhancedTr = styled.tr`
  transition: background 0.18s ease;
  &:hover {
    background: ${({ theme }: { theme: any }) => getLayoutPalette(theme).navHoverBg};
  }
`;
const StudentDetails = styled.div`
  display: flex;
  align-items: center;
  gap: 0.7rem;
`;
const NameBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;
const StudentName = styled.span`
  font-weight: 700;
  font-size: 0.98rem;
  color: ${({ theme }: { theme: any }) => theme.TEXT_PRIMARY};
`;
const FatherName = styled.span`
  font-size: 0.89rem;
  color: ${({ theme }: { theme: any }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  margin-top: 0.1rem;
`;
const EnhancedStatusButton = styled.button<{ $active: boolean; $color: string }>`
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: ${({ $active, $color, theme }) => $active ? `linear-gradient(135deg, ${$color} 0%, ${$color}dd 100%)` : getLayoutPalette(theme).surfaceBg};
  color: ${({ $active, $color, theme }) => $active ? '#fff' : (checkIsDark(theme) ? '#e2e8f0' : $color)};
  border: 1px solid ${({ $active, $color }) => $active ? 'transparent' : `${$color}40`};
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${({ $active, $color, theme }) => $active ? `0 6px 12px ${$color}30` : getLayoutPalette(theme).surfaceShadow};
  transition: background 0.18s, color 0.18s, border-color 0.18s, box-shadow 0.18s, transform 0.18s;
  &:hover, &:focus {
    background: ${({ $active, $color }) => $active ? `linear-gradient(135deg, ${$color} 0%, ${$color}dd 100%)` : `${$color}18`};
    color: #fff;
    outline: none;
    box-shadow: 0 8px 14px ${({ $color }) => `${$color}30`};
    transform: translateY(-1px);
  }
`;

// Move Checkbox and FloatingSaveButton styled components to the top
const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 2.5px solid ${({ theme }: { theme: any }) => theme.mode === 'dark' ? '#4a6cf7' : '#6366f1'};
  background: ${({ theme }: { theme: any }) => theme.mode === 'dark' ? '#181c24' : '#fff'};
  appearance: none;
  outline: none;
  display: inline-block;
  position: relative;
  margin-right: 0.2rem;
  cursor: pointer;
  transition: border 0.18s, background 0.18s, box-shadow 0.18s;
  &:checked {
    background: ${({ theme }: { theme: any }) => theme.ACCENT};
    border-color: ${({ theme }: { theme: any }) => theme.ACCENT};
  }
  &:checked::after {
    content: '';
    display: block;
    position: absolute;
    left: 5px;
    top: 2.5px;
    width: 5px;
    height: 10px;
    border: solid #fff;
    border-width: 0 2.5px 2.5px 0;
    transform: rotate(45deg);
  }
  &:hover, &:focus {
    box-shadow: 0 0 0 3px ${({ theme }: { theme: any }) => theme.ACCENT}44;
  }
`;

const SerialCheckbox = styled.div`
  position: relative;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => `${theme.ACCENT}55`};
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};
  transition: all 0.2s ease;
  font-size: 0.66rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};

  &:hover {
    background: ${({ theme }) => theme.ACCENT}15;
    transform: scale(1.05);
  }

  &.checked {
    background: ${({ theme }) => `linear-gradient(135deg, ${theme.ACCENT} 0%, ${theme.ACCENT}dd 100%)`};
    border-color: transparent;
    color: white;
    box-shadow: 0 8px 16px ${({ theme }) => `${theme.ACCENT}33`};
  }

  /* Mobile adjustments */
  @media (max-width: 700px) {
    width: 20px;
    height: 20px;
    font-size: 0.6rem;
  }
`;
const attentionPulse = `
  @keyframes attentionPulse {
    0% { transform: scale(1); box-shadow: 0 4px 16px #0002; }
    50% { transform: scale(1.12); box-shadow: 0 8px 32px #0004; }
    100% { transform: scale(1); box-shadow: 0 4px 16px #0002; }
  }
`;
const FloatingButtonsGlass = styled.div`
  position: fixed;
  bottom: 2rem;
  right: 4rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.7rem 1.2rem;
  border-radius: 32px;
  background: rgba(40, 40, 60, 0.32);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.18);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1.5px solid rgba(255,255,255,0.18);
  z-index: 3000;
`;
const FloatingSaveButton = styled.button`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #16a34a;
  color: #fff;
  border: none;
  box-shadow: 0 6px 24px #0003;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.7rem;
  cursor: pointer;
  transition: background 0.18s, box-shadow 0.18s, transform 0.18s;
  &:hover {
    background: #15803d;
    box-shadow: 0 8px 32px #0004;
    transform: scale(1.07);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;
const FloatingDeleteButton = styled.button`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #dc2626;
  color: #fff;
  border: none;
  box-shadow: 0 6px 24px #0003;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  cursor: pointer;
  transition: background 0.18s, box-shadow 0.18s, transform 0.18s;
  &:hover {
    background: #991b1b;
    box-shadow: 0 8px 32px #0004;
    transform: scale(1.07);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;
const Spinner = styled.div`
  width: 28px;
  height: 28px;
  border: 3px solid #fff6;
  border-top: 3px solid #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// Add mobile block styles
const MobileStudentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  box-sizing: border-box;
  padding-bottom: 0.2rem;
`;
const MobileStudentCard = styled.div`
  ${clayCardStyle}
  display: flex;
  align-items: center;
  border-radius: ${CARD_RADIUS_LG};
  padding: 0.62rem 0.72rem;
  gap: 0.55rem;
  font-size: 0.88rem;
  width: 100%;
  min-width: 0;
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-1px);
    border-color: ${({ theme }: { theme: any }) => theme.ACCENT}40;
    box-shadow: ${({ theme }: { theme: any }) => getLayoutPalette(theme).surfaceHoverShadow};
  }
`;
const MobileAvatar = styled(Avatar)`
  width: 24px;
  height: 24px;
  font-size: 0.82rem;
`;
const MobileNameBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
  min-width: 0;
`;
const MobileStudentName = styled.span`
  font-weight: 700;
  font-size: 0.9rem;
  color: ${({ theme }: { theme: any }) => theme.TEXT_PRIMARY};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const MobileFatherName = styled.span`
  font-size: 0.78rem;
  color: ${({ theme }: { theme: any }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  margin-top: 0.05rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const MobileStatusRow = styled.div`
  display: flex;
  gap: 0.3rem;
  margin-left: auto;
`;
const MobileCheckbox = styled(Checkbox)`
  margin-right: 0.5rem;
`;

// 1. S. No block
const SNoBlock = styled.div`
  width: 2.2em;
  min-width: 2.2em;
  text-align: center;
  font-size: 0.93rem;
  color: ${({ theme }: { theme: any }) => theme.TEXT_SECONDARY};
  font-weight: 600;
`;

// Responsive status button containers
const MobileStatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-gap: 0.24rem;
  width: 56px;
`;
const DesktopStatusRow = styled.div`
  display: flex;
  gap: 0.42rem;
  margin-left: auto;
`;
// Desktop status button: pill/rounded rectangle, full name
const DesktopStatusButton = styled.button<{ $active: boolean; $color: string }>`
  min-width: 78px;
  padding: 0.42rem 0.78rem;
  border-radius: 12px;
  background: ${({ $active, $color, theme }) => $active ? `linear-gradient(135deg, ${$color} 0%, ${$color}dd 100%)` : getLayoutPalette(theme).surfaceBg};
  color: ${({ $active, $color, theme }) => $active ? '#fff' : (checkIsDark(theme) ? '#e2e8f0' : $color)};
  border: 1px solid ${({ $active, $color }) => $active ? 'transparent' : `${$color}44`};
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${({ $active, $color, theme }) => $active ? `0 8px 14px ${$color}30` : getLayoutPalette(theme).surfaceShadow};
  transition: background 0.18s, color 0.18s, border-color 0.18s, box-shadow 0.18s, transform 0.18s;
  &:hover, &:focus {
    background: ${({ $active, $color }) => $active ? `linear-gradient(135deg, ${$color} 0%, ${$color}dd 100%)` : `${$color}18`};
    color: #fff;
    outline: none;
    box-shadow: 0 10px 16px ${({ $color }) => `${$color}30`};
    transform: translateY(-1px);
  }
`;

const RemarksInput = styled.input`
  ${clayInputStyle}
  min-width: 104px;
  max-width: 168px;
  padding: 0.38rem 0.62rem;
  margin-right: 0.72rem;
  font-size: 0.84rem;
`;

const SelectionRow = styled.div`
  ${clayCardStyle}
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.42rem 0.58rem;
  margin-bottom: 0.1rem;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  font-size: 0.84rem;
  font-weight: 600;
`;

const CenterStateCard = styled.div`
  ${clayCardStyle}
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  text-align: center;
  padding: 1.4rem 0.9rem;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
`;

const WhatsAppNotice = styled.div`
  ${clayCardStyle}
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0.58rem 0.75rem;
  color: ${({ theme }) => getDashboardPalette(theme).titleText};
  font-size: 0.83rem;
  font-weight: 600;
  flex-wrap: wrap;
`;

const WhatsAppToggle = styled.input.attrs({ type: 'checkbox' })`
  width: 16px;
  height: 16px;
  accent-color: #25d366;
  cursor: pointer;
`;

// Select All/Deselect All controls
const SelectAllRow = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 0.7rem;
  margin-left: 0.2rem;
  justify-content: space-between;
`;
const SelectAllCheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: 40px;
`;
const BigCircleCheckbox = styled(Checkbox)`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border-width: 2.5px;
  margin: 0;
  appearance: none;
  background: ${({ theme }: { theme: any }) => theme.mode === 'dark' ? '#181c24' : '#fff'};
  box-shadow: 0 2px 8px ${({ theme }: { theme: any }) => theme.mode === 'dark' ? '#4a6cf733' : '#6366f133'};
  position: relative;
  transition: border 0.18s, background 0.18s, box-shadow 0.18s;
  &:checked {
    background: ${({ theme }: { theme: any }) => theme.ACCENT};
    border-color: ${({ theme }: { theme: any }) => theme.ACCENT};
  }
  &:checked::after {
    content: '';
    display: block;
    position: absolute;
    left: 10px;
    top: 5px;
    width: 7px;
    height: 14px;
    border: solid #fff;
    border-width: 0 3.5px 3.5px 0;
    transform: rotate(45deg);
  }
  &:hover, &:focus {
    box-shadow: 0 0 0 4px ${({ theme }: { theme: any }) => theme.ACCENT}44;
  }
`;
const SelectAllButton = styled.button`
  background: ${({ theme }: { theme: any }) => theme.ACCENT};
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.45rem 1.1rem;
  font-size: 0.97rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.18s, box-shadow 0.18s;
  box-shadow: 0 2px 8px ${({ theme }: { theme: any }) => theme.ACCENT}22;
  &:hover {
    background: ${({ theme }: { theme: any }) => theme.ACCENT + 'cc'};
  }
`;
const DeselectAllButton = styled(SelectAllButton)`
  background: ${({ theme }: { theme: any }) => theme.FIELD_BG};
  color: ${({ theme }: { theme: any }) => theme.TEXT_PRIMARY};
  border: 1.5px solid ${({ theme }: { theme: any }) => theme.BORDER};
  box-shadow: none;
  &:hover {
    background: ${({ theme }: { theme: any }) => theme.FIELD_BG};
    border-color: ${({ theme }: { theme: any }) => theme.ACCENT};
    color: ${({ theme }: { theme: any }) => theme.ACCENT};
  }
`;

// Add these styled components near the top
const SearchInputWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const SearchInput = styled(Input)`
  width: 100%;
  height: 40px;
  padding-right: 2.2rem;
  box-sizing: border-box;
`;

const SearchClearButton = styled.button`
  position: absolute;
  right: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  color: #888;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  height: 1.6rem;
  width: 1.6rem;
  z-index: 2;
`;

const ConfirmationDialog = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${({ theme }: { theme: any }) => theme.CARD};
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 8px 32px #0004;
  z-index: 4000;
  min-width: 300px;
  border: 1px solid ${({ theme }: { theme: any }) => theme.BORDER};
`;

const DialogTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: ${({ theme }: { theme: any }) => theme.TEXT_PRIMARY};
  font-size: 1.2rem;
`;

const DialogContent = styled.p`
  margin: 0 0 1.5rem 0;
  color: ${({ theme }: { theme: any }) => theme.TEXT_SECONDARY};
  font-size: 1rem;
  line-height: 1.5;
`;

const DialogButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const DialogButton = styled.button<{ $variant?: 'danger' | 'secondary' }>`
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  border: none;
  background: ${({ $variant, theme }: { $variant?: 'danger' | 'secondary'; theme: any }) =>
    $variant === 'danger' ? '#dc2626' : theme.FIELD_BG};
  color: ${({ $variant }) => ($variant === 'danger' ? '#fff' : 'inherit')};
  transition: all 0.18s;
  &:hover {
    background: ${({ $variant }) =>
      $variant === 'danger' ? '#991b1b' : 'inherit'};
    opacity: ${({ $variant }) => ($variant === 'danger' ? 1 : 0.8)};
  }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #0006;
  z-index: 3999;
`;

const StatusListDialog = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${({ theme }: { theme: any }) => theme.CARD};
  border-radius: 12px;
  box-shadow: 0 8px 32px #0004;
  z-index: 4001;
  min-width: 320px;
  max-width: 500px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }: { theme: any }) => theme.BORDER};
  overflow: hidden;
`;

const StatusListTitle = styled.h3`
  margin: 0;
  padding: 0.5rem 1rem;
  color: ${({ theme }: { theme: any }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  background: ${({ theme }: { theme: any }) => theme.CARD};
  border-bottom: 1px solid ${({ theme }: { theme: any }) => theme.BORDER};
  position: sticky;
  top: 0;
  z-index: 1;
  flex-shrink: 0;
  line-height: 1.2;
  min-height: 2.5rem;
  height: 2.5rem;
  box-sizing: border-box;
`;

const StatusListCloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }: { theme: any }) => theme.TEXT_SECONDARY};
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
  font-size: 1.2rem;
  line-height: 1;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  
  &:hover {
    background: ${({ theme }: { theme: any }) => theme.FIELD_BG};
    color: ${({ theme }: { theme: any }) => theme.TEXT_PRIMARY};
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const StatusListContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.5rem 1rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  
  /* Visible scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }: { theme: any }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }: { theme: any }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 4px;
    transition: background 0.2s;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }: { theme: any }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
  }
  
  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }: { theme: any }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'} ${({ theme }: { theme: any }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
`;

const StatusListItem = styled.div`
  padding: 0.35rem 0.5rem;
  color: ${({ theme }: { theme: any }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  border-bottom: 1px solid ${({ theme }: { theme: any }) => theme.BORDER};
  line-height: 1.3;
  &:last-child {
    border-bottom: none;
  }
`;

const StatusListFooter = styled.div`
  padding: 0.5rem 1rem;
  background: ${({ theme }: { theme: any }) => theme.CARD};
  border-top: 1px solid ${({ theme }: { theme: any }) => theme.BORDER};
  position: sticky;
  bottom: 0;
  z-index: 1;
  flex-shrink: 0;
  min-height: 2.5rem;
  height: 2.5rem;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

const ClickableSummaryItem = styled.span`
  cursor: pointer;
  transition: all 0.2s;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }: { theme: any }) => `${theme.ACCENT}22`};
  background: ${({ theme }: { theme: any }) => getLayoutPalette(theme).surfaceBg};
  box-shadow: ${({ theme }: { theme: any }) => getLayoutPalette(theme).surfaceShadow};
  &:hover {
    background: ${({ theme }: { theme: any }) => `${theme.ACCENT}18`};
    color: ${({ theme }: { theme: any }) => theme.ACCENT};
    border-color: ${({ theme }: { theme: any }) => `${theme.ACCENT}44`};
    box-shadow: ${({ theme }: { theme: any }) => getLayoutPalette(theme).surfaceHoverShadow};
  }
`;

const FooterShell = styled.div<{ $isMobile: boolean }>`
  width: 100%;
  display: flex;
  flex-direction: ${({ $isMobile }) => $isMobile ? 'column' : 'row'};
  align-items: center;
  justify-content: ${({ $isMobile }) => $isMobile ? 'center' : 'space-between'};
  gap: ${({ $isMobile }) => $isMobile ? '0.42rem' : '0.7rem'};
  padding: 0;
  border: none;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
`;

const FooterSummary = styled.div<{ $isMobile: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $isMobile }) => $isMobile ? 'center' : 'flex-start'};
  flex-wrap: wrap;
  gap: ${({ $isMobile }) => $isMobile ? '0.24rem' : '0.36rem'};
  font-size: ${({ $isMobile }) => $isMobile ? '0.7rem' : '0.84rem'};
  font-weight: 600;
  color: ${({ theme }) => getLayoutPalette(theme).footerText};
  min-width: 0;
`;

const FooterDivider = styled.span`
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  opacity: 0.65;
`;

const FooterActions = styled.div<{ $isMobile: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $isMobile }) => $isMobile ? 'center' : 'flex-end'};
  gap: 0;
  width: ${({ $isMobile }) => $isMobile ? '100%' : 'auto'};
  flex-wrap: wrap;
`;

const FooterActionGroup = styled.div<{ $isMobile: boolean }>`
  display: flex;
  align-items: center;
  width: ${({ $isMobile }) => $isMobile ? '100%' : 'auto'};
  max-width: 100%;
  overflow: hidden;
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).surfaceBorder};
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};
  border-radius: ${CARD_RADIUS_LG};

  @media (max-width: 700px) {
    width: 100%;
  }
`;

const FooterActionButton = styled.button<{ $variant?: 'default' | 'danger' | 'success'; first?: boolean; last?: boolean }>`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.34rem;
  min-height: 30px;
  min-width: 72px;
  padding: 0.34rem 0.72rem;
  border: none;
  border-right: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  border-radius: 0;
  cursor: pointer;
  font-size: 0.76rem;
  font-weight: 700;
  color: ${({ theme, $variant }) => {
    if ($variant === 'danger' || $variant === 'success') return '#fff';
    return theme.TEXT_PRIMARY;
  }};
  background: ${({ theme, $variant }) => {
    if ($variant === 'danger') return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    if ($variant === 'success') return 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
    return 'transparent';
  }};
  box-shadow: ${({ theme, $variant }) => {
    if ($variant === 'danger') return 'inset 0 0 0 999px rgba(239, 68, 68, 0.06)';
    if ($variant === 'success') return 'inset 0 0 0 999px rgba(34, 197, 94, 0.06)';
    return 'none';
  }};
  transition: background 0.18s ease, transform 0.18s ease, opacity 0.18s ease;

  ${({ first }) => first && `
    border-top-left-radius: ${CARD_RADIUS_LG};
    border-bottom-left-radius: ${CARD_RADIUS_LG};
  `}

  ${({ last }) => last && `
    border-top-right-radius: ${CARD_RADIUS_LG};
    border-bottom-right-radius: ${CARD_RADIUS_LG};
    border-right: none;
  `}

  &:hover:not(:disabled) {
    transform: none;
    background: ${({ theme, $variant }) => {
      if ($variant === 'danger') return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      if ($variant === 'success') return 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
      return getLayoutPalette(theme).navHoverBg;
    }};
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 700px) {
    flex: 1 1 25%;
    min-width: 0;
    padding: 0.36rem 0.4rem;
    font-size: 0.72rem;
    gap: 0.24rem;
    white-space: nowrap;
  }
`;


const SkeletonFloatingButton = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${({ theme }) => theme.BG === '#252525' ? '#181c2a' : '#e5e7eb'};
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.06), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

const SkeletonRemarksInput = styled.div`
  width: 120px;
  height: 32px;
  border-radius: 8px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#181c2a' : '#e5e7eb'};
  margin-right: 1rem;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.06), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

const SkeletonDesktopStatusRow = styled.div`
  display: flex;
  gap: 0.6rem;
  margin-left: auto;
`;

const SkeletonDesktopStatusButton = styled.div`
  min-width: 90px;
  height: 36px;
  border-radius: 22px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#181c2a' : '#e5e7eb'};
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.06), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

interface Student {
  id: number;
  name: string;
  father_name: string;
  status?: 'present' | 'absent' | 'leave' | 'late';
  picture_url?: string;
  remarks?: string;
  check_in_time?: string | null;
  source?: string | null;
  rfid_uid?: string | null;
  isOnLeave?: boolean;
}

// Add a hook to detect mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 700);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

const toInputTime = (value?: string | null) => {
  const raw = (value || '').trim();
  if (!raw) return '';

  if (raw.includes('T') || /[zZ]|[+-]\d{2}:\d{2}$/.test(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
    }
  }

  const match = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) return '';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
};

const buildLocalTimestamp = (date: string, value?: string | null) => {
  const normalized = toInputTime(value);
  if (!normalized) return null;

  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = normalized.split(':').map(Number);
  const localDate = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);

  if (Number.isNaN(localDate.getTime())) return null;
  return localDate.toISOString();
};

const currentTimeValue = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const getManualAttendanceTimestamp = (date: string, existingValue?: string | null) => {
  if (existingValue) return existingValue;

  const today = format(new Date(), 'yyyy-MM-dd');
  if (date === today) {
    return buildLocalTimestamp(date, currentTimeValue());
  }

  return buildLocalTimestamp(date, '08:00');
};

const MarkAttendance: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const toast = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { startProgress, setProgress, completeProgress } = useProgress();
  const { logAttendanceActivity } = useActivityTracking();

  // Inject CSS animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = bounceAnimation + swellAnimation + spinAnimation;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);
  
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [classes, setClasses] = useState<Array<{ id: string; name: string; has_sections?: boolean }>>([]);
  const [sections, setSections] = useState<Array<{ id: string; name: string }>>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'manual_only' | 'rfid_ready' | 'on_leave'>('manual_only');
  const [hoveredAvatar, setHoveredAvatar] = useState<{ id: number; x: number; y: number; url: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveButtonBounce, setSaveButtonBounce] = useState(false);
  const [hasAttendanceRecords, setHasAttendanceRecords] = useState(false);
  const [statusBounce, setStatusBounce] = useState<{ id: number; status: string } | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [teacherSections, setTeacherSections] = useState<Array<{ id: string; name: string; class_id: string }>>([]);
  const [teacherClasses, setTeacherClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [staffId, setStaffId] = useState<number | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sendWhatsAppNotifications, setSendWhatsAppNotifications] = useState(false);
  const [whatsappProcessing, setWhatsappProcessing] = useState(false);
  const [showWhatsAppSender, setShowWhatsAppSender] = useState(false);
  const [whatsappNotificationData, setWhatsappNotificationData] = useState<AttendanceNotificationData[]>([]);
  const [hasAnyStudents, setHasAnyStudents] = useState<boolean | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [showStatusList, setShowStatusList] = useState(false);
  const [selectedStatusType, setSelectedStatusType] = useState<'present' | 'absent' | 'leave' | 'late' | null>(null);
  const [hasWhatsAppPermission, setHasWhatsAppPermission] = useState(false);
  const { setFooterContent } = usePageFooter();
  const navigate = useNavigate();
  const location = useLocation();

  // Stats
  const totalStudents = students.length;
  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = students.filter(s => s.status === 'absent').length;
  const leaveCount = students.filter(s => s.status === 'leave').length;

  // Selected rows state - declared early to be used in footer useEffect
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  const didSetDefaultStatus = useRef(false);
  const didAutoSelect = useRef(false);
  // Default status and selection are now handled directly in fetchStudents to avoid race conditions
  useEffect(() => {
    didSetDefaultStatus.current = false;
    didAutoSelect.current = false;
  }, [selectedClass, selectedSection, date]);


  // Check WhatsApp notification permission
  useEffect(() => {
    const checkWhatsAppPermission = async () => {
      if (!user?.id || !user?.school_id) {
        setHasWhatsAppPermission(false);
        return;
      }
      try {
        const hasPerm = await hasPermission(user.id, 'attendance.send_whatsapp_notifications', user.school_id);
        setHasWhatsAppPermission(hasPerm);
      } catch (error) {
        console.error('Error checking WhatsApp permission:', error);
        setHasWhatsAppPermission(false);
      }
    };
    checkWhatsAppPermission();
  }, [user?.id, user?.school_id]);

  // Define filteredStudents early so it can be used in handleSave
  const filteredStudents = useCallback((columnStudents: Student[]) =>
    columnStudents.filter(student =>
      (student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.father_name.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (
        attendanceFilter === 'all' ||
        (attendanceFilter === 'manual_only' && !student.rfid_uid) ||
        (attendanceFilter === 'rfid_ready' && !!student.rfid_uid) ||
        (attendanceFilter === 'on_leave' && !!student.isOnLeave)
      )
    ), [searchTerm, attendanceFilter]);

  // Define handleMarkAll early so it can be used in footer
  const handleMarkAll = useCallback((status: 'present' | 'absent' | 'leave') => {
    setStudents(prev =>
      prev.map(s =>
        selectedRows.includes(s.id) ? { ...s, status } : s
      )
    );
  }, [selectedRows]);

  // Create a ref for handleSave to avoid dependency issues
  const handleSaveRef = useRef<() => Promise<void>>();
  
  // Set footer content for global footer
  useEffect(() => {
    const footerContent = (
      <FooterShell theme={theme === 'dark' ? darkTheme : lightTheme} $isMobile={isMobile}>
        <FooterSummary theme={theme === 'dark' ? darkTheme : lightTheme} $isMobile={isMobile}>
          <span>Total: {totalStudents}</span>
          <FooterDivider theme={theme === 'dark' ? darkTheme : lightTheme}>|</FooterDivider>
          <ClickableSummaryItem 
            theme={theme === 'dark' ? darkTheme : lightTheme}
            onClick={() => {
              setSelectedStatusType('present');
              setShowStatusList(true);
            }}
          >
            Present: {presentCount}
          </ClickableSummaryItem>
          <FooterDivider theme={theme === 'dark' ? darkTheme : lightTheme}>|</FooterDivider>
          <ClickableSummaryItem 
            theme={theme === 'dark' ? darkTheme : lightTheme}
            onClick={() => {
              setSelectedStatusType('absent');
              setShowStatusList(true);
            }}
          >
            Absent: {absentCount}
          </ClickableSummaryItem>
          <FooterDivider theme={theme === 'dark' ? darkTheme : lightTheme}>|</FooterDivider>
          <ClickableSummaryItem 
            theme={theme === 'dark' ? darkTheme : lightTheme}
            onClick={() => {
              setSelectedStatusType('leave');
              setShowStatusList(true);
            }}
          >
            Leave: {leaveCount}
          </ClickableSummaryItem>
          <FooterDivider theme={theme === 'dark' ? darkTheme : lightTheme}>|</FooterDivider>
          <ClickableSummaryItem 
            theme={theme === 'dark' ? darkTheme : lightTheme}
            onClick={() => {
              setSelectedStatusType('late');
              setShowStatusList(true);
            }}
          >
            Late: {students.filter(s => s.status === 'late').length}
          </ClickableSummaryItem>
        </FooterSummary>
        <FooterActions theme={theme === 'dark' ? darkTheme : lightTheme} $isMobile={isMobile}>
          <FooterActionGroup theme={theme === 'dark' ? darkTheme : lightTheme} $isMobile={isMobile}>
            <FooterActionButton
              theme={theme === 'dark' ? darkTheme : lightTheme}
              first
              onClick={() => handleMarkAll('present')}
              disabled={students.length === 0 || selectedRows.length === 0}
            >
              {!isMobile && <CheckCircle style={{ fontSize: 18, marginRight: 4 }} />}
              All Present
            </FooterActionButton>
            <FooterActionButton
              theme={theme === 'dark' ? darkTheme : lightTheme}
              onClick={() => handleMarkAll('absent')}
              disabled={students.length === 0 || selectedRows.length === 0}
            >
              {!isMobile && <Cancel style={{ fontSize: 18, marginRight: 4 }} />}
              All Absent
            </FooterActionButton>
            <FooterActionButton
              theme={theme === 'dark' ? darkTheme : lightTheme}
              onClick={() => handleMarkAll('leave')}
              disabled={students.length === 0 || selectedRows.length === 0}
            >
              {!isMobile && <Info style={{ fontSize: 18, marginRight: 4 }} />}
              All Leave
            </FooterActionButton>
            <FooterActionButton
              theme={theme === 'dark' ? darkTheme : lightTheme}
              $variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={students.length === 0 || selectedRows.length === 0 || !selectedClass || !date || deleting || (classes.find(c => String(c.id) === String(selectedClass))?.has_sections ?? true) && !selectedSection}
            >
              {deleting ? <Spinner /> : <><Delete style={{ fontSize: isMobile ? 14 : 18, marginRight: isMobile ? 2 : 4 }} /> Delete</>}
            </FooterActionButton>
            <FooterActionButton
              theme={theme === 'dark' ? darkTheme : lightTheme}
              $variant="success"
              last
              onClick={() => handleSaveRef.current?.()}
              disabled={students.length === 0 || selectedRows.length === 0 || saving}
            >
              {saving ? <Spinner /> : <><Save style={{ fontSize: isMobile ? 14 : 18, marginRight: isMobile ? 2 : 4 }} /> Save</>}
            </FooterActionButton>
          </FooterActionGroup>
        </FooterActions>
      </FooterShell>
    );

    setFooterContent({
      visible: true,
      content: footerContent
    });

    // Cleanup on unmount
    return () => {
      setFooterContent(null);
    };
  }, [
    students, 
    totalStudents, 
    presentCount, 
    absentCount, 
    leaveCount, 
    selectedRows, 
    selectedClass, 
    date, 
    deleting, 
    saving, 
    isMobile, 
    theme, 
    classes, 
    selectedSection,
    setFooterContent,
    handleMarkAll
  ]);

  // Main data loading effect with progress bar
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true); // Show skeleton at start
      if (!user?.school_id) {
        setLoading(false);
        return;
      }
      const minDuration = 1500; // 1.5 seconds minimum
      const start = Date.now();
      // Start determinate progress
      startProgress(false);
      setProgress(10);
      // Fetch active session
      setProgress(20);
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
        .single();
      if (sessionData) {
        setSessionId(sessionData.id);
        setHasActiveSession(true);
      } else {
        setHasActiveSession(false);
      }
      setLoadingSession(false);
      // Fetch classes
      setProgress(40);
      await fetchClasses();
      // Check for any active students
      setProgress(60);
      if (sessionData) {
        const { data: schData } = await supabase
          .from('student_class_history')
          .select('student_id')
          .eq('session_id', sessionData.id)
          .eq('school_id', user.school_id);
        if (schData && schData.length > 0) {
          const studentIds = schData.map(sch => sch.student_id);
          const { data: studentsData } = await supabase
            .from('students')
            .select('id')
            .eq('school_id', user.school_id)
            .eq('status', 'active')
            .in('id', studentIds);
          setHasAnyStudents(studentsData && studentsData.length > 0);
        } else {
          setHasAnyStudents(false);
        }
      }
      // Complete progress
      setProgress(100);
      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => {
          setLoading(false); // Hide skeleton after min duration
          completeProgress();
        }, minDuration - elapsed);
      } else {
        setLoading(false); // Hide skeleton immediately if slow
        completeProgress();
      }
    };
    loadInitialData();
  }, [user?.school_id]);

  useEffect(() => {
    if (user?.school_id) {
    fetchClasses();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClass && user?.school_id) {
      fetchSections();
    }
  }, [selectedClass, user]);

  // Preloading guard: when class/section changes to a valid selection, show loading immediately
  useEffect(() => {
    if (!user?.school_id) return;
    // Determine if the selected class requires a section
    const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
    const hasSections = selectedClassObj?.has_sections ?? true;

    // If no class or required section is missing, don't set loading (and clear students)
    if (!selectedClass || (hasSections && !selectedSection)) {
      setLoadingStudents(false);
      return;
    }

    // We have a valid selection that will trigger fetchStudents; set loading immediately
    setLoadingStudents(true);
  }, [selectedClass, selectedSection, user?.school_id, classes]);

  // Ensure selectedSection aligns with selectedClass for teachers
  useEffect(() => {
    if (user?.role !== 'Teacher') return;
    if (!selectedClass) return;
    if (!selectedSection) return;
    const isValid = teacherSections.some(
      (s) => String(s.id) === String(selectedSection) && String(s.class_id) === String(selectedClass)
    );
    if (!isValid) {
      setSelectedSection('');
    }
  }, [selectedClass, selectedSection, teacherSections, user?.role]);

  // Auto-select the only available section for the selected class (teacher),
  // but only when the teacher is linked to exactly one class
  useEffect(() => {
    if (user?.role !== 'Teacher') return;
    if (!selectedClass) return;
    const uniqueClassIds = Array.from(new Set(teacherSections.map(s => String(s.class_id))));
    if (uniqueClassIds.length !== 1) return;
    if (!selectedSection && sections.length === 1) {
      setSelectedSection(sections[0].id.toString());
    }
  }, [sections, selectedClass, selectedSection, user?.role, teacherSections]);

  // Fetch active session on mount
  useEffect(() => {
    const fetchSession = async () => {
      if (!user?.school_id) {
        setHasActiveSession(false);
        setLoadingSession(false);
        return;
      }
      const { data, error } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
        .single();
      if (data) {
        setSessionId(data.id);
        setHasActiveSession(true);
      } else {
        setHasActiveSession(false);
      }
      if (error && !(
        error.code === 'PGRST116' ||
        error.message?.includes('multiple (or no) rows returned') ||
        error.details?.includes('contains 0 rows')
      )) {
        setHasActiveSession(false);
      }
      setLoadingSession(false);
    };
    fetchSession();
  }, [user]);

  // Check for any active students in the system for the active session
  useEffect(() => {
    const checkForAnyActiveStudents = async () => {
      if (!user?.school_id || !sessionId) return;
      // Fetch all student IDs from student_class_history for the active session
      const { data: schData, error: schError } = await supabase
        .from('student_class_history')
        .select('student_id')
        .eq('session_id', sessionId)
        .eq('school_id', user.school_id);
      if (schError || !schData || schData.length === 0) {
        setHasAnyStudents(false);
        return;
      }
      // Fetch student details with status: 'active'
      const studentIds = schData.map(sch => sch.student_id);
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .in('id', studentIds);
      if (!studentsError && studentsData && studentsData.length > 0) {
        setHasAnyStudents(true);
      } else {
        setHasAnyStudents(false);
      }
    };
    checkForAnyActiveStudents();
  }, [user?.school_id, sessionId]);

  // On mount, fetch staff_id for the logged-in user if teacher
  useEffect(() => {
    if (!hasActiveSession) return;
    const fetchStaffId = async () => {
      if (!user || user.role !== 'Teacher') return;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('staff_id')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        if (data && data.staff_id) {
          setStaffId(data.staff_id);
        } else {
          setStaffId(null);
          toast.showToast('No staff ID found for your user. Please contact admin.', 'error');
        }
      } catch (error) {
        setStaffId(null);
        toast.showToast('Failed to fetch staff ID for your user.', 'error');
      }
    };
    fetchStaffId();
    // eslint-disable-next-line
  }, [user, hasActiveSession]);

  // Fetch teacher sections using staffId
  useEffect(() => {
    const fetchTeacherSections = async () => {
      if (!user || user.role !== 'Teacher' || !staffId || !user.school_id) return;
      try {
        const { data, error } = await supabase
          .from('sections')
          .select('id, name, class_id')
          .eq('teacher_id', staffId)
          .eq('school_id', user.school_id);
        if (error) throw error;
        if (data && data.length > 0) {
          setTeacherSections(data);
          // Determine unique classes linked to the teacher
          const uniqueClassIds = Array.from(new Set(data.map(s => String(s.class_id))));
          if (uniqueClassIds.length === 1) {
            const onlyClassId = uniqueClassIds[0];
            // Auto-select class if not already selected
            if (!selectedClass) {
              setSelectedClass(onlyClassId.toString());
            }
            // If exactly one section in that class is linked to the teacher, auto-select it
            const sectionsInOnlyClass = data.filter(s => String(s.class_id) === String(onlyClassId));
            if (!selectedSection && sectionsInOnlyClass.length === 1) {
              setSelectedSection(sectionsInOnlyClass[0].id.toString());
            }
          }
        } else {
          setTeacherSections([]);
          toast.showToast('No section assigned to you. Please contact admin.', 'error');
        }
      } catch (error) {
        toast.showToast('Failed to fetch your assigned sections', 'error');
      }
    };
    fetchTeacherSections();
    // eslint-disable-next-line
  }, [user, staffId]);

  // Fetch teacher classes using staffId
  useEffect(() => {
    const fetchTeacherClasses = async () => {
      if (user?.role !== 'Teacher' || teacherSections.length === 0 || !user.school_id) return;
      const classIds = Array.from(new Set(teacherSections.map(s => s.class_id)));
      if (classIds.length === 0) return;
      try {
      const { data, error } = await supabase
        .from('classes')
          .select('id, name')
          .in('id', classIds)
          .eq('school_id', user.school_id);
      if (error) throw error;
        setTeacherClasses(data || []);
      } catch (error) {
        setTeacherClasses([]);
      }
    };
    fetchTeacherClasses();
    // eslint-disable-next-line
  }, [teacherSections, user]);

  // Update fetchClasses and fetchSections to use staffId for teacher role
  const fetchClasses = async () => {
    if (!user?.school_id) return;
    try {
      setLoadingClasses(true);
      const data = await fetchAllRows(async (from, to) => {
        return await supabase.from('classes')
          .select('id, name, has_sections')
          .eq('school_id', user.school_id)
          .range(from, to);
      });
      
      if (!data) {
        toast.showToast('Failed to fetch classes (see console)', 'error');
      }
      const sortedClasses = sortClasses(data || []);
      setClasses(sortedClasses);
    } catch (error) {
      toast.showToast('Failed to fetch classes (exception)', 'error');
    } finally {
      setLoadingClasses(false);
    }
  };

  // Update fetchSections to use staffId for teacher role
  const fetchSections = async () => {
    if (!selectedClass || !user?.school_id) return;
    try {
      setLoadingSections(true);
      let query = supabase
        .from('sections')
        .select('id, name')
        .eq('class_id', selectedClass)
        .eq('school_id', user.school_id)
        .order('name');
      if (user?.role === 'Teacher' && staffId) {
        query = query.eq('teacher_id', staffId);
      }
      const { data, error } = await query;
      if (error) {
        toast.showToast('Failed to fetch sections (see console)', 'error');
      }
      setSections(data || []);
    } catch (error) {
      toast.showToast('Failed to fetch sections (exception)', 'error');
    } finally {
      setLoadingSections(false);
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass || !date || !user?.school_id || !sessionId) return;
    
    // Check if the selected class has sections
    const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
    const hasSections = selectedClassObj?.has_sections ?? true;
    
    // If class has sections but no section is selected, don't fetch
    if (hasSections && !selectedSection) return;
    
    setLoadingStudents(true);
    try {
      // First check if it's a holiday or Sunday
      if (isSunday(parseISO(date))) {
        toast.showToast('Selected date is a Sunday', 'error');
        setStudents([]);
        setLoadingStudents(false);
        return;
      }

      // Check for holidays - similar to how Sundays are handled
      // First get all holidays for the date range
      const { data: allHolidays } = await supabase
        .from('holidays')
        .select('id, name, start_date, end_date')
        .eq('school_id', user.school_id)
        .eq('session_id', sessionId)
        .lte('start_date', date)
        .gte('end_date', date);

      if (allHolidays && allHolidays.length > 0) {
        // Get holiday assignments for these holidays
        const holidayIds = allHolidays.map(h => h.id);
        const selectedClassId = String(selectedClass);
        
        // Get ALL holiday assignments for these holidays
        // Note: Some assignments may have null school_id (legacy data), so we fetch all and filter manually
        const { data: allAssignmentsNoFilter } = await supabase
          .from('holiday_classes')
          .select('holiday_id, class_id, section_id, school_id')
          .in('holiday_id', holidayIds);
        
        // Filter assignments: include if school_id is null/undefined (legacy) or matches user's school_id
        const finalAssignments = (allAssignmentsNoFilter || []).filter(a => {
          return a.school_id === null || a.school_id === undefined || Number(a.school_id) === Number(user.school_id);
        });

        // Check if any holiday applies to this class/section
        const applicableHoliday = allHolidays.find(holiday => {
          // Get ALL assignments for this holiday (across all classes)
          const allAssignmentsForHoliday = finalAssignments.filter(a => a.holiday_id === holiday.id);
          
          // CRITICAL: If holiday has no assignments at all, it does NOT apply to any class
          // Only holidays with explicit class assignments apply
          if (allAssignmentsForHoliday.length === 0) {
            return false;
          }
          
          // Holiday has assignments - check if any are for THIS specific class
          const assignmentsForThisClass = allAssignmentsForHoliday.filter(a => 
            String(a.class_id) === selectedClassId
          );
          
          // CRITICAL: If no assignments for this class, holiday does NOT apply to this class
          if (assignmentsForThisClass.length === 0) {
            return false;
          }
          
          // We have assignments for this class - now check section logic
          
          // Handle non-sectioned classes (has_sections === false)
          if (!hasSections) {
            // For non-sectioned classes, only class-wide assignments (section_id is null) apply
            const classWideAssignments = assignmentsForThisClass.filter(a => 
              a.section_id === null || 
              a.section_id === undefined
            );
            // Only block if there's a class-wide assignment for this non-sectioned class
            return classWideAssignments.length > 0;
          }
          
          // Handle sectioned classes (has_sections === true)
          // Separate class-wide and section-specific assignments
          const classWideAssignments = assignmentsForThisClass.filter(a => 
            a.section_id === null || 
            a.section_id === undefined
          );
          const sectionSpecificAssignments = assignmentsForThisClass.filter(a => 
            a.section_id !== null && 
            a.section_id !== undefined
          );
          
          // If there are section-specific assignments, holiday ONLY applies to those sections
          if (sectionSpecificAssignments.length > 0) {
            // Section-specific holidays require a section to be selected
            if (!selectedSection) {
              return false;
            }
            
            // Check if the selected section matches any section-specific assignment
            const selectedSectionStr = String(selectedSection);
            const sectionMatches = sectionSpecificAssignments.some(a => {
              return String(a.section_id) === selectedSectionStr;
            });
            
            // Only block if the selected section matches
            return sectionMatches;
          }
          
          // If no section-specific assignments, check for class-wide assignment
          // Class-wide means holiday applies to ALL sections of this class
          if (classWideAssignments.length > 0) {
            return true;
          }
          
          // No matching assignments (shouldn't happen, but safety check)
          return false;
        });

        if (applicableHoliday) {
          toast.showToast(`Selected date is a holiday: ${applicableHoliday.name}`, 'error');
          setStudents([]);
          setLoadingStudents(false);
          return;
        }
      }

      // Fetch students from student_class_history for the active session and selected class/section
      let schQuery = supabase
        .from('student_class_history')
        .select('student_id')
        .eq('session_id', sessionId)
        .eq('new_class_id', selectedClass)
        .eq('school_id', user.school_id);
      
      // Only filter by section if the class has sections
      if (hasSections) {
        schQuery = schQuery.eq('new_section_id', selectedSection);
      } else {
        schQuery = schQuery.is('new_section_id', null);
      }
      
      const { data: schData, error: schError } = await schQuery;

      if (schError) throw schError;

      if (!schData || schData.length === 0) {
        setStudents([]);
        setLoadingStudents(false);
        return;
      }

      // Get student IDs from student_class_history
      const studentIds = schData.map(sch => sch.student_id);

      // Fetch full student details
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, father_name, picture_url, rfid_uid')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .in('id', studentIds);

      if (studentsError) throw studentsError;

      // Fetch attendance records for this date/section/class
      let attendanceQuery = supabase
        .from('attendance_records')
        .select('student_id, status, remarks, check_in_time, source')
        .eq('class_id', selectedClass)
        .eq('date', date)
        .eq('school_id', user.school_id);
      
      // Only filter by section if the class has sections
      if (hasSections) {
        attendanceQuery = attendanceQuery.eq('section_id', selectedSection);
      } else {
        attendanceQuery = attendanceQuery.is('section_id', null);
      }
      
      const { data: attendanceData, error: attendanceError } = await attendanceQuery;

      if (attendanceError) throw attendanceError;

      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select('student_id')
        .eq('school_id', user.school_id)
        .eq('session_id', sessionId)
        .eq('status', 'approved')
        .in('student_id', studentIds)
        .lte('start_date', date)
        .gte('end_date', date);

      if (leaveError) throw leaveError;

      // Merge attendance status into students
      const attendanceMap = new Map();
      (attendanceData || []).forEach((rec: any) => {
        attendanceMap.set(rec.student_id, {
          status: rec.status,
          remarks: rec.remarks,
          check_in_time: rec.check_in_time,
          source: rec.source
        });
      });
      const approvedLeaveSet = new Set((leaveData || []).map((leave: any) => leave.student_id));
      const formattedStudents = (studentsData || []).map((student: any) => {
        const att = attendanceMap.get(student.id);
        const isOnLeave = approvedLeaveSet.has(student.id);
        return {
          id: student.id,
          name: student.name,
          father_name: student.father_name,
          status: att ? att.status : (isOnLeave ? 'leave' : (attendanceData && attendanceData.length === 0 ? 'present' : undefined)),
          picture_url: student.picture_url,
          remarks: att ? att.remarks || '' : '',
          check_in_time: att ? att.check_in_time || null : null,
          source: att ? att.source || null : null,
          rfid_uid: student.rfid_uid,
          isOnLeave,
        };
      }).sort((a, b) => a.id - b.id);
      
      setStudents(formattedStudents);
      const recordsCount = (attendanceData || []).length;
      setHasAttendanceRecords(recordsCount > 0);
      
      // Auto-select logic: 
      // If no records for the day, select everyone (they default to 'present')
      // If some records exist, only select those with records
      if (recordsCount === 0) {
        setSelectedRows(formattedStudents.map(s => s.id));
      } else {
        setSelectedRows(formattedStudents.filter(s => s.status).map(s => s.id));
      }
      didAutoSelect.current = true;
      didSetDefaultStatus.current = true;
      
      // Log attendance view activity (no notification for view)
      try {
        // View activities are not logged - only create, update, and delete
      } catch (activityError) {
        // Don't fail the operation if activity logging fails
      }
    } catch (error) {
      toast.showToast('Failed to fetch students', 'error');
    } finally {
      setLoadingStudents(false);
    }
  };

  // Touch handling state to prevent status change during scroll
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const [isTouchScrolling, setIsTouchScrolling] = useState(false);

  // Helper function for vibration feedback
  const vibrate = useCallback((pattern: number | number[] = 10) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        // Vibration not supported or failed
      }
    }
  }, []);

  const handleStatusChange = (studentId: number, status: 'present' | 'absent' | 'leave' | 'late') => {
    // Prevent status change if user is scrolling
    if (isTouchScrolling) return;
    
    // Vibration feedback
    vibrate(10);
    
    setStudents(prev =>
      prev.map(student =>
        student.id === studentId
          ? ({
              ...student,
              status: status.toLowerCase() as 'present' | 'absent' | 'leave' | 'late',
              check_in_time: status === 'present' || status === 'late'
                ? getManualAttendanceTimestamp(date, student.check_in_time)
                : null,
              source: 'manual'
            } as Student)
          : student
      )
    );
    setSelectedRows(prev => prev.includes(studentId) ? prev : [...prev, studentId]);
    setStatusBounce({ id: studentId, status: status.toLowerCase() });
    setTimeout(() => setStatusBounce(null), 600);
  };


  const handleBulkMark = (status: 'present' | 'absent' | 'leave' | 'late') => {
    setStudents(prev =>
      prev.map(student => ({
        ...student,
        status,
        check_in_time: status === 'present' || status === 'late'
          ? getManualAttendanceTimestamp(date, student.check_in_time)
          : null,
        source: 'manual'
      }))
    );
    toast.showToast('Marked all students as ' + status, 'success');
  };

  // WhatsApp notification function
  const sendAttendanceNotifications = async (
    studentsToSave: any[],
    selectedClassObj: any,
    selectedSectionObj: any
  ) => {
    try {
      // Get school information
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('name')
        .eq('id', user?.school_id)
        .single();

      if (schoolError) throw schoolError;

      // Prepare notification data for absent/late/leave students
      const notificationData = await whatsappSemiAutoService.prepareAttendanceNotifications(
        studentsToSave,
        user?.school_id!,
        schoolData?.name || 'School',
        selectedClassObj?.name || 'Unknown Class',
        selectedSectionObj?.name
      );

      if (notificationData.length > 0) {
        // Store notification data and show React component
        setWhatsappNotificationData(notificationData);
        setShowWhatsAppSender(true);

        // Log notification activity
        await whatsappSemiAutoService.logNotificationActivity(
          'prepare',
          selectedClassObj?.name || 'Unknown Class',
          selectedSectionObj?.name || 'All Sections',
          notificationData.length,
          date
        );

        return notificationData.length;
      }
      return 0;
    } catch (error) {
      throw error;
    }
  };

  const handleSave = useCallback(async () => {
    if (!selectedClass || !date || !user?.school_id) {
      toast.showToast('Please select class and date', 'error');
      return;
    }
    
    // Check if the selected class has sections
    const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
    const hasSections = selectedClassObj?.has_sections ?? true;
    
    // If class has sections but no section is selected, show error
    if (hasSections && !selectedSection) {
      toast.showToast('Please select section', 'error');
      return;
    }
    
    if (!sessionId) {
      toast.showToast('No active session found. Please contact administrator.', 'error');
      return;
    }
    setSaving(true);
    
    // Start progress for save operation
    startProgress(false);
    setProgress(10);
    
    try {
      // Only allow valid statuses
      const validStatuses = ['present', 'absent', 'leave', 'late'];
      // Filter only selected students that have a valid status
      const studentsToSave = students.filter(student => 
        selectedRows.includes(student.id) && 
        typeof student.status === 'string' && 
        validStatuses.includes(student.status)
      );
      
      if (studentsToSave.length === 0) {
        toast.showToast('Please select at least one student with a status to save', 'error');
        setSaving(false);
        completeProgress();
        return;
      }
      
      setProgress(30);
      const attendanceRecords = studentsToSave.map(student => ({
        student_id: student.id,
        class_id: selectedClass,
        section_id: hasSections ? selectedSection : null,
        date,
        status: typeof student.status === 'string' ? student.status.toLowerCase() : student.status,
        remarks: student.remarks || null,
        check_in_time: student.status === 'present' || student.status === 'late'
          ? getManualAttendanceTimestamp(date, student.check_in_time)
          : null,
        source: student.source || 'manual',
        created_at: new Date().toISOString(),
        session_id: sessionId,
        school_id: user.school_id,
      }));
      const studentIdsToSave = studentsToSave.map(student => student.id);
      
      setProgress(50);
      // Delete only the records for students being explicitly saved.
      // This preserves attendance for untouched students on the same day.
      let deleteQuery = supabase
        .from('attendance_records')
        .delete()
        .eq('class_id', selectedClass)
        .eq('date', date)
        .eq('school_id', user.school_id)
        .in('student_id', studentIdsToSave);
      
      // Only filter by section if the class has sections
      if (hasSections) {
        deleteQuery = deleteQuery.eq('section_id', selectedSection);
      } else {
        deleteQuery = deleteQuery.is('section_id', null);
      }
      
      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;
      
      setProgress(70);
      // Insert new records
      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert(attendanceRecords);
      if (insertError) throw insertError;
      
      setProgress(90);
      setHasAttendanceRecords(true);
      
      // Clear unsaved changes flag after successful save
      setSelectedRows([]);
      
      // Log attendance activity
      try {
        const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
        const selectedSectionObj = sections.find(s => String(s.id) === String(selectedSection));
        
        await logAttendanceActivity(
          'create',
          selectedClassObj?.name || 'Unknown Class',
          selectedSectionObj?.name || 'All Sections',
          studentsToSave.length,
          date
        );
      } catch (activityError) {
        // Don't fail the save operation if activity logging fails
      }
      
      // NEW: Send WhatsApp notifications if enabled
      if (sendWhatsAppNotifications) {
        setWhatsappProcessing(true);
        try {
          const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
          const selectedSectionObj = sections.find(s => String(s.id) === String(selectedSection));
          
          const notificationCount = await sendAttendanceNotifications(
            studentsToSave,
            selectedClassObj,
            selectedSectionObj
          );
          
          if (notificationCount > 0) {
            toast.showToast(`Attendance saved and ${notificationCount} WhatsApp notifications prepared`, 'success');
          } else {
            toast.showToast('Attendance saved successfully', 'success');
          }
        } catch (whatsappError) {
          toast.showToast('Attendance saved but WhatsApp preparation failed', 'error');
        } finally {
          setWhatsappProcessing(false);
        }
      } else {
        toast.showToast('Attendance saved successfully', 'success');
      }
      
      // Refresh the students list to show updated status
      await fetchStudents();
      
      setProgress(100);
      completeProgress();
    } catch (error: any) {
      toast.showToast(error.message || 'Failed to save attendance', 'error');
      completeProgress();
    } finally {
      setSaving(false);
    }
  }, [selectedClass, date, user?.school_id, selectedSection, sessionId, students, searchTerm, classes, sections, sendWhatsAppNotifications, sendAttendanceNotifications, fetchStudents, filteredStudents]);
  
  // Update handleSave ref whenever handleSave changes
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  useEffect(() => {
    // Clear students when class/section changes
    setStudents([]);
    setSelectedRows([]);
    
    if (selectedClass && date && user?.school_id) {
      // Check if the selected class has sections
      const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
      const hasSections = selectedClassObj?.has_sections ?? true;
      
      // Clear section selection if the new class doesn't have sections
      if (!hasSections) {
        setSelectedSection('');
      }
      
      // Only fetch if class has no sections OR if class has sections and section is selected
      if (!hasSections || (hasSections && selectedSection)) {
        // Set loading immediately to avoid empty-state flicker
        setLoadingStudents(true);
        fetchStudents();
      } else {
        // No valid selection to fetch yet
        setLoadingStudents(false);
      }
    } else {
      setLoadingStudents(false);
    }
  }, [selectedClass, selectedSection, date, user, classes]);

  // Group students by status
  const presentStudents = students.filter(s => s.status === 'present');
  const absentStudents = students.filter(s => s.status === 'absent');
  const leaveStudents = students.filter(s => s.status === 'leave');
  const unmarkedStudents = students.filter(s => !s.status);

  // Just before return, after students and filteredStudents are defined:
  const filtered = filteredStudents(students);
  const allChecked = filtered.length > 0 && filtered.every(s => selectedRows.includes(s.id));
  const handleToggleSelectAll = () => {
    if (allChecked) {
      // Deselect only filtered students
      setSelectedRows(prev => prev.filter(id => !filtered.some(s => s.id === id)));
      setStudents(prev => prev.map(s => filtered.some(f => f.id === s.id) ? { ...s, status: undefined, check_in_time: null, source: null } : s));
    } else {
      // Select all filtered students
      setSelectedRows(prev => Array.from(new Set([...prev, ...filtered.map(s => s.id)])));
      setStudents(prev => prev.map(s => filtered.some(f => f.id === s.id)
        ? { ...s, status: 'present', check_in_time: getManualAttendanceTimestamp(date, s.check_in_time), source: 'manual' }
        : s));
    }
  };
  // Enter key submits
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleSave();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  // Add this function to handle row selection
  const handleSelectRow = (studentId: number) => {
    setSelectedRows(prev => {
      if (prev.includes(studentId)) {
        // Deselect: remove from selectedRows and clear status
        setStudents(students => students.map(s => s.id === studentId ? { ...s, status: undefined, check_in_time: null, source: null } : s));
        return prev.filter(id => id !== studentId);
      } else {
        // Select: add to selectedRows and set status to present
        setStudents(students => students.map(s => s.id === studentId
          ? { ...s, status: 'present', check_in_time: getManualAttendanceTimestamp(date, s.check_in_time), source: 'manual' }
          : s));
        return [...prev, studentId];
      }
    });
  };

  // Reset didAutoSelect when class/section/date changes
  useEffect(() => {
    didAutoSelect.current = false;
  }, [selectedClass, selectedSection, date]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!selectedClass || !date) return false;
    // Check if there are any selected rows with status changes
    // If there are selected rows, we have unsaved changes
    return selectedRows.length > 0;
  }, [selectedRows, selectedClass, date]);

  // Handle browser navigation (refresh, close tab, etc.)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved attendance changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle React Router navigation (back button, programmatic navigation)
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handlePopState = (event: PopStateEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setShowSaveConfirm(true);
        // Push state back to prevent navigation
        window.history.pushState(null, '', location.pathname);
      }
    };

    // Push initial state to enable back button handling
    window.history.pushState(null, '', location.pathname);
    window.addEventListener('popstate', handlePopState, true);

    return () => {
      window.removeEventListener('popstate', handlePopState, true);
    };
  }, [hasUnsavedChanges, location.pathname]);

  const handleRemarksChange = (studentId: number, value: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, remarks: value } : s));
  };

  const handleDelete = async () => {
    if (!selectedClass || !date || !user?.school_id) return;
    
    // Check if the selected class has sections
    const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
    const hasSections = selectedClassObj?.has_sections ?? true;
    
    // If class has sections but no section is selected, return
    if (hasSections && !selectedSection) return;
    
    setDeleting(true);
    
    // Start progress for delete operation
    startProgress(false);
    setProgress(10);
    
    try {
      setProgress(50);
      let deleteQuery = supabase
        .from('attendance_records')
        .delete()
        .eq('class_id', selectedClass)
        .eq('date', date)
        .eq('school_id', user.school_id)
        .in('student_id', selectedRows); // Only delete records for selected students
      
      // Only filter by section if the class has sections
      if (hasSections) {
        deleteQuery = deleteQuery.eq('section_id', selectedSection);
      } else {
        deleteQuery = deleteQuery.is('section_id', null);
      }
      
      const { error } = await deleteQuery;

      if (error) throw error;

      setProgress(80);
      
      // Clear selection after deletion
      setSelectedRows([]);
      
      // Refresh the students list to show updated state (this handles resetting to default if needed)
      await fetchStudents();
      
      setProgress(100);
      completeProgress();
      toast.showToast('Attendance records deleted successfully', 'success');
    } catch (error) {
      toast.showToast('Failed to delete attendance records', 'error');
      completeProgress();
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  useEffect(() => {
    if (selectedRows.length > 0) {
      const interval = setInterval(() => {
        setSaveButtonBounce(true);
        setTimeout(() => setSaveButtonBounce(false), 600); // match animation duration
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setSaveButtonBounce(false);
    }
  }, [selectedRows.length]);

  // Determine if teacher has only one section
  const teacherHasSingleSection = user?.role === 'Teacher' && teacherSections.length === 1;
  const teacherHasMultipleSections = user?.role === 'Teacher' && teacherSections.length > 1;
  const compactDateFieldProps = {
    InputLabelProps: { shrink: true },
    sx: {
      minWidth: 142,
      '& .MuiOutlinedInput-notchedOutline': {
        border: 'none',
      },
      '& .MuiInputBase-root': {
        minHeight: 26,
        height: 26,
        fontSize: '0.77em',
        borderRadius: 0,
        background: 'transparent',
        color: (theme === 'dark' ? darkTheme : lightTheme).TEXT_PRIMARY,
        boxShadow: 'none',
        borderRight: `1px solid ${getLayoutPalette(theme === 'dark' ? darkTheme : lightTheme).shellDivider}`,
      },
      '& .MuiInputBase-input': {
        padding: '0 11px',
        height: '26px',
        boxSizing: 'border-box',
      },
      '& .MuiInputBase-root.Mui-focused': {
        background: 'transparent',
      },
      '& .MuiIconButton-root': {
        padding: '4px',
        color: (theme === 'dark' ? darkTheme : lightTheme).TEXT_SECONDARY,
      },
      '& .MuiSvgIcon-root': {
        fontSize: '1rem',
      },
    },
  };

  // Student area logic
  let studentAreaContent = null;
  if (!selectedClass) {
    studentAreaContent = (
      <CenterStateCard>
        <Class style={{ fontSize: 54, color: '#6366f1', marginBottom: 12 }} />
        <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>Select a class to mark attendance</div>
        <div style={{ fontSize: '1rem', marginTop: 8, opacity: 0.82 }}>Attendance will appear here once you select a class.</div>
      </CenterStateCard>
    );
  } else {
    // Check if the selected class has sections
    const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
    const hasSections = selectedClassObj?.has_sections ?? true;
    
    // If class has sections but no section is selected, show section selection message
    if (hasSections && !selectedSection) {
      studentAreaContent = (
        <CenterStateCard>
          <Class style={{ fontSize: 54, color: '#6366f1', marginBottom: 12 }} />
          <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>Select a section to mark attendance</div>
          <div style={{ fontSize: '1rem', marginTop: 8, opacity: 0.82 }}>Attendance will appear here once you select a section.</div>
        </CenterStateCard>
      );
    } else if (!loading && !loadingStudents && students.length === 0) {
      studentAreaContent = (
        <CenterStateCard style={{ minHeight: 220 }}>
          <span style={{ fontSize: 48, marginBottom: 12 }}>
            <i className="fas fa-user-slash" />
          </span>
          <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>No students found to be listed for this class.</div>
        </CenterStateCard>
      );
    }
  }

  // Set footer loading state when loading
  useEffect(() => {
    if (loadingSession || loading) {
      setFooterContent({
        visible: true,
        loading: true,
      });
    } else {
      // Clear footer loading when not loading (actual footer content will be set by the footer useEffect)
      if (!selectedClass || !date) {
        setFooterContent(null);
      }
    }
  }, [loadingSession, loading, selectedClass, date, setFooterContent]);

  // Show skeleton loader for any loading state
  if (loadingSession || loading) {
    return <Loader />;
  }

  if (!hasActiveSession) {
    return <NoSessionsFound />;
  }

  if (hasAnyStudents === false) {
    return <NoStudentsFound />;
  }

  return (
    <>
    <PageContainer>
      <Header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isMobile && (
            <h2 style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: 1, color: theme === 'dark' ? darkTheme.ACCENT : lightTheme.ACCENT, margin: 0 }}>
              Mark Attendance
            </h2>
          )}
        </div>
        {isMobile ? (
          <MobileHeaderControls>
            <SegmentedGroup theme={theme === 'dark' ? darkTheme : lightTheme}>
              <SegmentedSelect
                theme={theme === 'dark' ? darkTheme : lightTheme}
                value={selectedClass} 
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  setSelectedClass(e.target.value);
                }}
                disabled={user?.role === 'Teacher' ? teacherHasSingleSection : false}
                first
              >
                <option value="">Select Class</option>
                {user?.role === 'Teacher'
                    ? teacherClasses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                    : classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
              </SegmentedSelect>
              {(() => {
                const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
                const hasSections = selectedClassObj?.has_sections ?? true;
                return hasSections ? (
                  <SegmentedSelect
                    theme={theme === 'dark' ? darkTheme : lightTheme}
                    value={selectedSection} 
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      setSelectedSection(e.target.value);
                    }}
                    disabled={user?.role === 'Teacher' ? teacherHasSingleSection : (!selectedClass && user?.role !== 'Teacher') || loadingSections || !user?.school_id}
                    last
                  >
                    <option value="">Select Section</option>
                    {user?.role === 'Teacher'
                        ? sections.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))
                        : sections.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                  </SegmentedSelect>
                ) : (
                  <SegmentedSelect
                    theme={theme === 'dark' ? darkTheme : lightTheme}
                    value=""
                    disabled
                    last
                  >
                    <option value="">No Section</option>
                  </SegmentedSelect>
                );
              })()}
            </SegmentedGroup>

            <MobileHeaderRow>
              <MobileDateFieldShell theme={theme === 'dark' ? darkTheme : lightTheme}>
                <AppDateField
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                  }}
                  fullWidth
                  textFieldProps={{ InputLabelProps: { shrink: true }, sx: { width: '100%', minWidth: 0 } }}
                />
              </MobileDateFieldShell>

              <SegmentedGroup theme={theme === 'dark' ? darkTheme : lightTheme}>
                <SegmentedSelect
                  theme={theme === 'dark' ? darkTheme : lightTheme}
                  value={attendanceFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAttendanceFilter(e.target.value as any)}
                  first
                  last
                >
                  <option value="all">All</option>
                  <option value="manual_only">No Card</option>
                  <option value="rfid_ready">Has Card</option>
                  <option value="on_leave">On Leave</option>
                </SegmentedSelect>
              </SegmentedGroup>
            </MobileHeaderRow>
          </MobileHeaderControls>
        ) : (
          <SegmentedGroup theme={theme === 'dark' ? darkTheme : lightTheme}>
            <SegmentedSelect
              theme={theme === 'dark' ? darkTheme : lightTheme}
              value={selectedClass}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  setSelectedClass(e.target.value);
                }}
                disabled={user?.role === 'Teacher' ? teacherHasSingleSection : false}
              style={{ minWidth: 110 }}
              first
            >
              <option value="">Select Class</option>
              {user?.role === 'Teacher'
                ? teacherClasses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))
                : classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
            </SegmentedSelect>
            {(() => {
              const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
              const hasSections = selectedClassObj?.has_sections ?? true;
              return hasSections ? (
                <SegmentedSelect
                  theme={theme === 'dark' ? darkTheme : lightTheme}
                  value={selectedSection}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      setSelectedSection(e.target.value);
                    }}
                  disabled={user?.role === 'Teacher' ? teacherHasSingleSection : (!selectedClass && user?.role !== 'Teacher') || loadingSections || !user?.school_id}
                  style={{ minWidth: 110 }}
                >
                  <option value="">Select Section</option>
                  {user?.role === 'Teacher'
                    ? sections.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))
                    : sections.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                </SegmentedSelect>
              ) : null;
            })()}
            <DateSegmentShell>
              <AppDateField
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                }}
                fullWidth={false}
                textFieldProps={compactDateFieldProps}
              />
            </DateSegmentShell>
            <SegmentedInput
              theme={theme === 'dark' ? darkTheme : lightTheme}
                type="text"
                placeholder="Search by name or father name..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setSearchTerm(e.target.value);
                }}
              style={{ minWidth: 156 }}
            />
            <SegmentedSelect
              theme={theme === 'dark' ? darkTheme : lightTheme}
              value={attendanceFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAttendanceFilter(e.target.value as any)}
              style={{ minWidth: 118 }}
            >
              <option value="all">All</option>
              <option value="manual_only">No Card</option>
              <option value="rfid_ready">Has Card</option>
              <option value="on_leave">On Leave</option>
            </SegmentedSelect>
          </SegmentedGroup>
              )}
      </Header>
      <MainContent>
        <MobileStudentList>
          {/* Minimal Select All / Deselect All checkbox above the list */}
          {filtered.length > 0 && (
            <SelectionRow>
              <SerialCheckbox
                className={allChecked ? 'checked' : ''}
                onClick={handleToggleSelectAll}
                title={allChecked ? 'Deselect all students' : 'Select all students'}
                style={{ fontSize: '0.6rem', fontWeight: 'bold' }}
              >
                {allChecked ? '✓' : '○'}
              </SerialCheckbox>
              <span style={{ userSelect: 'none' }}>Select All</span>
            </SelectionRow>
          )}
          {studentAreaContent ? (
            studentAreaContent
          ) : (
            // Remove the SelectAllRow block here
            null
          )}
          {loadingStudents ? (
            <CenterStateCard style={{ minHeight: 180 }}>
              <Spinner />
              <div style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '1.2px' }}>Loading students…</div>
            </CenterStateCard>
          ) : (!loadingStudents && students.length === 0) ? (
            null
          ) : (
            filtered.map((student, idx) => {
              const isSelected = selectedRows.includes(student.id);
              return (
              <MobileStudentCard key={student.id}>
                  <SerialCheckbox
                    className={isSelected ? 'checked' : ''}
                    onClick={() => handleSelectRow(student.id)}
                    title={isSelected ? 'Deselect student' : 'Select student'}
                  >
                    {idx + 1}
                  </SerialCheckbox>
                <MobileAvatar
                  onMouseEnter={e => {
                    if (student.picture_url) {
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setHoveredAvatar({
                        id: student.id,
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                        url: student.picture_url
                      });
                    }
                  }}
                  onMouseLeave={() => setHoveredAvatar(null)}
                >
                  {student.picture_url ? (
                    <img src={student.picture_url} alt={student.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  ) : (
                    student.name.charAt(0)
                  )}
                </MobileAvatar>
                <MobileNameBlock>
                  <MobileStudentName>
                    {student.name}
                    {!student.rfid_uid && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#f59e42', fontWeight: 600 }}>(No Card)</span>}
                    {student.isOnLeave && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#4a6cf7', fontWeight: 600 }}>(Leave)</span>}
                  </MobileStudentName>
                  <MobileFatherName>{student.father_name}</MobileFatherName>
                </MobileNameBlock>
                {isMobile ? (
                  <MobileStatusGrid>
                    <EnhancedStatusButton
                      $active={student.status === 'present'}
                      $color="#16a34a"
                      onTouchStart={(e) => {
                        const touch = e.touches[0];
                        touchStartPos.current = { x: touch.clientX, y: touch.clientY };
                        setIsTouchScrolling(false);
                      }}
                      onTouchMove={(e) => {
                        if (!touchStartPos.current) return;
                        const touch = e.touches[0];
                        const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
                        const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);
                        if (deltaX > 10 || deltaY > 10) {
                          setIsTouchScrolling(true);
                        }
                      }}
                      onTouchEnd={(e) => {
                        if (!isTouchScrolling) {
                          handleStatusChange(student.id, 'present');
                        }
                        touchStartPos.current = null;
                        setTimeout(() => setIsTouchScrolling(false), 100);
                      }}
                      onClick={() => handleStatusChange(student.id, 'present')}
                    >
                      P
                    </EnhancedStatusButton>
                    <EnhancedStatusButton
                      $active={student.status === 'absent'}
                      $color="#dc2626"
                      onTouchStart={(e) => {
                        const touch = e.touches[0];
                        touchStartPos.current = { x: touch.clientX, y: touch.clientY };
                        setIsTouchScrolling(false);
                      }}
                      onTouchMove={(e) => {
                        if (!touchStartPos.current) return;
                        const touch = e.touches[0];
                        const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
                        const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);
                        if (deltaX > 10 || deltaY > 10) {
                          setIsTouchScrolling(true);
                        }
                      }}
                      onTouchEnd={(e) => {
                        if (!isTouchScrolling) {
                          handleStatusChange(student.id, 'absent');
                        }
                        touchStartPos.current = null;
                        setTimeout(() => setIsTouchScrolling(false), 100);
                      }}
                      onClick={() => handleStatusChange(student.id, 'absent')}
                    >
                      A
                    </EnhancedStatusButton>
                    <EnhancedStatusButton
                      $active={student.status === 'leave'}
                      $color="#4a6cf7"
                      onTouchStart={(e) => {
                        const touch = e.touches[0];
                        touchStartPos.current = { x: touch.clientX, y: touch.clientY };
                        setIsTouchScrolling(false);
                      }}
                      onTouchMove={(e) => {
                        if (!touchStartPos.current) return;
                        const touch = e.touches[0];
                        const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
                        const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);
                        if (deltaX > 10 || deltaY > 10) {
                          setIsTouchScrolling(true);
                        }
                      }}
                      onTouchEnd={(e) => {
                        if (!isTouchScrolling) {
                          handleStatusChange(student.id, 'leave');
                        }
                        touchStartPos.current = null;
                        setTimeout(() => setIsTouchScrolling(false), 100);
                      }}
                      onClick={() => handleStatusChange(student.id, 'leave')}
                    >
                      L
                    </EnhancedStatusButton>
                    <EnhancedStatusButton
                      $active={student.status === 'late'}
                      $color="#f59e42"
                      onTouchStart={(e) => {
                        const touch = e.touches[0];
                        touchStartPos.current = { x: touch.clientX, y: touch.clientY };
                        setIsTouchScrolling(false);
                      }}
                      onTouchMove={(e) => {
                        if (!touchStartPos.current) return;
                        const touch = e.touches[0];
                        const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
                        const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);
                        if (deltaX > 10 || deltaY > 10) {
                          setIsTouchScrolling(true);
                        }
                      }}
                      onTouchEnd={(e) => {
                        if (!isTouchScrolling) {
                          handleStatusChange(student.id, 'late');
                        }
                        touchStartPos.current = null;
                        setTimeout(() => setIsTouchScrolling(false), 100);
                      }}
                      onClick={() => handleStatusChange(student.id, 'late')}
                    >
                      Lt
                    </EnhancedStatusButton>
                  </MobileStatusGrid>
                ) : (
                  <>
                    <RemarksInput
                      type="text"
                      value={student.remarks || ''}
                      onChange={e => handleRemarksChange(student.id, e.target.value)}
                      placeholder="Remarks"
                    />
                    <DesktopStatusRow>
                      <DesktopStatusButton
                        $active={student.status === 'present'}
                        $color="#16a34a"
                        onMouseDown={e => { e.preventDefault(); handleStatusChange(student.id, 'present'); }}
                        onMouseUp={() => setStatusBounce(null)}
                        onMouseLeave={() => setStatusBounce(null)}
                        onTouchStart={e => { handleStatusChange(student.id, 'present'); }}
                        onTouchEnd={() => setStatusBounce(null)}
                        onClick={() => handleStatusChange(student.id, 'present')}
                      >
                        Present
                      </DesktopStatusButton>
                      <DesktopStatusButton
                        $active={student.status === 'absent'}
                        $color="#dc2626"
                        onMouseDown={e => { e.preventDefault(); handleStatusChange(student.id, 'absent'); }}
                        onMouseUp={() => setStatusBounce(null)}
                        onMouseLeave={() => setStatusBounce(null)}
                        onTouchStart={e => { handleStatusChange(student.id, 'absent'); }}
                        onTouchEnd={() => setStatusBounce(null)}
                        onClick={() => handleStatusChange(student.id, 'absent')}
                      >
                        Absent
                      </DesktopStatusButton>
                      <DesktopStatusButton
                        $active={student.status === 'leave'}
                        $color="#4a6cf7"
                        onMouseDown={e => { e.preventDefault(); handleStatusChange(student.id, 'leave'); }}
                        onMouseUp={() => setStatusBounce(null)}
                        onMouseLeave={() => setStatusBounce(null)}
                        onTouchStart={e => { handleStatusChange(student.id, 'leave'); }}
                        onTouchEnd={() => setStatusBounce(null)}
                        onClick={() => handleStatusChange(student.id, 'leave')}
                      >
                        Leave
                      </DesktopStatusButton>
                      <DesktopStatusButton
                        $active={student.status === 'late'}
                        $color="#f59e42"
                        onMouseDown={e => { e.preventDefault(); handleStatusChange(student.id, 'late'); }}
                        onMouseUp={() => setStatusBounce(null)}
                        onMouseLeave={() => setStatusBounce(null)}
                        onTouchStart={e => { handleStatusChange(student.id, 'late'); }}
                        onTouchEnd={() => setStatusBounce(null)}
                        onClick={() => handleStatusChange(student.id, 'late')}
                      >
                        Late
                      </DesktopStatusButton>
                    </DesktopStatusRow>
                  </>
                )}
              </MobileStudentCard>
              );
            })
          )}
        </MobileStudentList>
      </MainContent>
      
      {/* WhatsApp Notification Toggle */}
      {students.length > 0 && hasWhatsAppPermission && (
        <WhatsAppNotice>
          <WhatsAppToggle
            id="whatsapp-toggle"
            checked={sendWhatsAppNotifications}
            onChange={(e) => setSendWhatsAppNotifications(e.target.checked)}
            disabled={saving || whatsappProcessing}
          />
          <label 
            htmlFor="whatsapp-toggle" 
            style={{ 
              cursor: saving || whatsappProcessing ? 'not-allowed' : 'pointer',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span style={{ color: '#25d366', fontSize: '16px' }}>📱</span>
            Send Notifications (WhatsApp & SMS)
          </label>
          {whatsappProcessing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#25d366' }}>
              <div style={{
                width: '12px',
                height: '12px',
                border: '2px solid #25d366',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <span style={{ fontSize: '0.8rem' }}>Preparing...</span>
            </div>
          )}
        </WhatsAppNotice>
      )}
        {showDeleteConfirm && (
          <>
            <Overlay onClick={() => setShowDeleteConfirm(false)} />
            <ConfirmationDialog>
              <DialogTitle>Delete Selected Records</DialogTitle>
              <DialogContent>
                Are you sure you want to delete attendance records for the {selectedRows.length} selected student(s)? This action cannot be undone.
              </DialogContent>
              <DialogButtons>
                <DialogButton onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </DialogButton>
                <DialogButton $variant="danger" onClick={handleDelete}>
                  Delete
                </DialogButton>
              </DialogButtons>
            </ConfirmationDialog>
          </>
        )}
        {hoveredAvatar && (
          <div
            style={{
              position: 'fixed',
              left: hoveredAvatar.x - 60,
              top: hoveredAvatar.y - 130,
              zIndex: 4000,
              pointerEvents: 'none',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 4px 24px #0007',
              border: '2px solid #4a6cf7',
              padding: 4,
              width: 120,
              height: 120,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <img
              src={hoveredAvatar.url}
              alt="Preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }}
            />
          </div>
        )}
      </PageContainer>
      
      {/* Save Confirmation Dialog */}
      {showSaveConfirm && (
        <>
          <Overlay onClick={() => setShowSaveConfirm(false)} />
          <ConfirmationDialog>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogContent>
              You have unsaved attendance changes. Do you want to save before leaving?
            </DialogContent>
            <DialogButtons>
              <DialogButton onClick={() => {
                setShowSaveConfirm(false);
                setPendingNavigation(null);
                // Clear selected rows to allow navigation
                setSelectedRows([]);
              }}>
                Leave Without Saving
              </DialogButton>
              <DialogButton onClick={() => {
                setShowSaveConfirm(false);
                setPendingNavigation(null);
              }}>
                Cancel
              </DialogButton>
              <DialogButton 
                $variant="danger" 
                onClick={async () => {
                  setShowSaveConfirm(false);
                  await handleSave();
                  setPendingNavigation(null);
                }}
                style={{ background: '#16a34a', color: '#fff' }}
              >
                Save & Leave
              </DialogButton>
            </DialogButtons>
          </ConfirmationDialog>
        </>
      )}
      
      {/* WhatsApp Bulk Sender Modal */}
      {showWhatsAppSender && (
        <WhatsAppBulkSender
          notificationData={whatsappNotificationData}
          schoolName="Your School Name" // You can get this from schoolData
          selectedDate={(whatsappNotificationData[0]?.date as string) || new Date().toISOString().slice(0,10)}
          onClose={() => {
            setShowWhatsAppSender(false);
            setWhatsappNotificationData([]);
          }}
        />
      )}
      
      {/* Status List Modal */}
      {showStatusList && selectedStatusType && (
        <>
          <Overlay onClick={() => {
            setShowStatusList(false);
            setSelectedStatusType(null);
          }} />
          <StatusListDialog theme={theme === 'dark' ? darkTheme : lightTheme}>
            <StatusListTitle theme={theme === 'dark' ? darkTheme : lightTheme}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
                {selectedStatusType === 'present' && <CheckCircle style={{ color: '#16a34a', fontSize: '1rem', display: 'flex', alignItems: 'center' }} />}
                {selectedStatusType === 'absent' && <Cancel style={{ color: '#dc2626', fontSize: '1rem', display: 'flex', alignItems: 'center' }} />}
                {selectedStatusType === 'leave' && <Info style={{ color: '#4a6cf7', fontSize: '1rem', display: 'flex', alignItems: 'center' }} />}
                {selectedStatusType === 'late' && <HourglassEmpty style={{ color: '#f59e42', fontSize: '1rem', display: 'flex', alignItems: 'center' }} />}
                <span style={{ display: 'flex', alignItems: 'center', lineHeight: '1.2' }}>
                  {selectedStatusType.charAt(0).toUpperCase() + selectedStatusType.slice(1)} Students
                  ({students.filter(s => s.status === selectedStatusType).length})
                </span>
              </div>
              <StatusListCloseButton
                theme={theme === 'dark' ? darkTheme : lightTheme}
                onClick={() => {
                  setShowStatusList(false);
                  setSelectedStatusType(null);
                }}
                title="Close"
              >
                ×
              </StatusListCloseButton>
            </StatusListTitle>
            <StatusListContent theme={theme === 'dark' ? darkTheme : lightTheme}>
              {students
                .filter(s => s.status === selectedStatusType)
                .length > 0 ? (
                students
                  .filter(s => s.status === selectedStatusType)
                  .map((student) => {
                    // Find the actual serial number from the filtered students list (matches what's shown in main list)
                    // If student is not in filtered (due to search), use their position in students array
                    const filteredIndex = filtered.findIndex(s => s.id === student.id);
                    const serialNumber = filteredIndex >= 0 ? filteredIndex + 1 : students.findIndex(s => s.id === student.id) + 1;
                    return (
                      <StatusListItem key={student.id} theme={theme === 'dark' ? darkTheme : lightTheme}>
                        {serialNumber}. {student.name}{student.father_name ? ` - ` : ''}
                        {student.father_name && (
                          <span style={{ color: theme === 'dark' ? darkTheme.TEXT_SECONDARY : lightTheme.TEXT_SECONDARY }}>
                            {student.father_name}
                          </span>
                        )}
                      </StatusListItem>
                    );
                  })
              ) : (
                <StatusListItem theme={theme === 'dark' ? darkTheme : lightTheme} style={{ color: theme === 'dark' ? darkTheme.TEXT_SECONDARY : lightTheme.TEXT_SECONDARY }}>
                  No {selectedStatusType} students
                </StatusListItem>
              )}
            </StatusListContent>
          </StatusListDialog>
        </>
      )}
    </>
  );
};

// Native MUI Skeleton Component

// --- Segmented Group Styles (copied from StudentList) ---
const SEGMENTED_HEIGHT = '26px';
const SegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).surfaceBorder};
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};
  border-radius: ${CARD_RADIUS_LG};
  overflow: hidden;
  @media (max-width: 700px) {
    width: 100%;
    justify-content: stretch;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow: hidden;
    border-radius: 11px;
    -webkit-overflow-scrolling: touch;
  }
`;

const DateSegmentShell = styled.div`
  display: flex;
  align-items: stretch;
  min-width: 0;

  .MuiFormControl-root,
  .MuiStack-root {
    width: 100%;
    min-width: 0;
  }

  .MuiInputBase-root {
    border-radius: 0 !important;
  }
`;

const MobileHeaderControls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  width: 100%;
`;

const MobileHeaderRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0.45rem;
  width: 100%;
  align-items: stretch;
`;

const MobileDateFieldShell = styled.div`
  min-width: 0;
  width: 100%;

  .MuiFormControl-root,
  .MuiStack-root {
    width: 100%;
    min-width: 0;
  }

  .MuiInputBase-root {
    min-height: 29px;
    border-radius: 11px;
    background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
    box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};
  }
`;

const SegmentedBase = css`
  font-family: inherit;
  font-size: 0.71em;
  font-weight: 500;
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  outline: none;
  transition: background 0.2s, color 0.2s;
  appearance: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border: none;
  box-shadow: none;
  @media (max-width: 700px) {
    font-size: 0.68em;
    height: 26px;
    line-height: 26px;
  }
`;
const SegmentedInput = styled.input<{ pill?: boolean }>`
  ${SegmentedBase}
  padding: 0 0.68em;
  min-width: 86px;
  border-radius: 0;
  border-right: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  ${({ pill }) => pill && `
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  &:last-child {
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
  &:first-child {
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  }
  &:not(:first-child) {
    border-left: none;
  }
  &:focus {
    background: ${({ theme }) => getLayoutPalette(theme).navHoverBg};
  }
  &::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: ${({ theme }) => checkIsDark(theme) ? 0.82 : 0.65};
    filter: ${({ theme }) => checkIsDark(theme) ? 'invert(0.88)' : 'invert(0.18)'};
  }
  @media (max-width: 700px) {
    min-width: 80px;
    max-width: none;
    flex: 1 1 0;
    width: 100%;
    padding: 0 0.5em;
    border-radius: 0;
    &:last-child {
      border-top-right-radius: 11px;
      border-bottom-right-radius: 11px;
    }
    &:first-child {
      border-top-left-radius: 11px;
      border-bottom-left-radius: 11px;
    }
  }
`;
const SegmentedSelect = styled.select<{ first?: boolean; last?: boolean }>`
  ${SegmentedBase}
  ${minimalSelectMenuStyle}
  padding: 0 1.95em 0 0.68em;
  border-radius: 0;
  border-right: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  &:last-child { border-right: none; }
  ${({ first }) => first && `
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  `}
  ${({ last }) => last && `
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  &:not(:first-child) {
    border-left: none;
  }
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  background-image: ${({ theme }) => {
    const stroke = checkIsDark(theme) ? '%2394a3b8' : '%2364748b';
    return `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='${stroke}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;
  }};
  background-repeat: no-repeat;
  background-position: right 0.75em center;
  background-size: 0.9em 0.9em;
  &:focus {
    background-color: ${({ theme }) => getLayoutPalette(theme).navHoverBg};
  }
  @media (max-width: 700px) {
    min-width: 0;
    max-width: none;
    flex: 1 1 0;
    width: 100%;
    padding: 0 1.55em 0 0.5em;
    background-position: right 0.5em center;
    background-size: 0.85em 0.85em;
    border-radius: 0;
    ${({ first }) => first && `
      border-top-left-radius: 11px;
      border-bottom-left-radius: 11px;
    `}
    ${({ last }) => last && `
      border-top-right-radius: 11px;
      border-bottom-right-radius: 11px;
    `}
  }
`;
// ... existing code ...

const SegmentedButton = styled.button<{ active?: boolean; first?: boolean; last?: boolean }>`
  ${SegmentedBase}
  padding: 0 1.12em;
  display: flex;
  align-items: center;
  gap: 0.35em;
  border-radius: 0;
  border-right: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  ${({ first }) => first && `
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  `}
  ${({ last }) => last && `
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  cursor: pointer;
  background: ${({ active, theme }) => active ? `${theme.ACCENT}18` : 'transparent'};
  color: ${({ active, theme }) => active ? theme.ACCENT : theme.TEXT_PRIMARY};
  border-top: none;
  border-bottom: none;
  border-left: none;
  font-weight: ${({ active }) => active ? 700 : 400};
  &:last-child {
    border-right: none;
  }
  &:hover, &:focus {
    background: ${({ active, theme }) => active ? `${theme.ACCENT}18` : getLayoutPalette(theme).navHoverBg};
    opacity: 1;
  }
  & svg {
    font-size: 15px;
    vertical-align: middle;
    display: inline-block;
  }
  @media (max-width: 700px) {
    min-width: 70px;
    max-width: 100px;
    flex: 0 0 auto;
    padding: 0 0.8em;
    gap: 0.25em;
    border-radius: 0;
    white-space: nowrap;
    & svg {
      font-size: 14px;
    }
    ${({ first }) => first && `
      border-top-left-radius: 11px;
      border-bottom-left-radius: 11px;
    `}
    ${({ last }) => last && `
      border-top-right-radius: 11px;
      border-bottom-right-radius: 11px;
    `}
  }
`;

export default MarkAttendance; 
