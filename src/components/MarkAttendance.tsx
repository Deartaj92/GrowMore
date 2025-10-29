import React, { useEffect, useState, useContext, useRef, MouseEvent, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { supabase } from '../supabaseClient';
import { ThemeContext, useProgress, darkTheme, lightTheme } from './Layout';
import { useToast } from './useToast';
import { format, isSunday, parseISO } from 'date-fns';
import { sortClasses } from '../utils/classUtils';
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
import { useTheme } from 'styled-components';
import { useActivityTracking } from '../hooks/useActivityTracking';
import { whatsappSemiAutoService, AttendanceNotificationData } from '../services/whatsappSemiAuto';
import WhatsAppBulkSender from './WhatsAppBulkSender';

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
  margin: 0;
  padding: 0 12px 6px 12px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  min-height: 0;
  display: flex;
  flex-direction: column;
  height: 93vh;
`;
const Header = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 6px 0 4px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.BG};
  box-shadow: 0 1px 6px #0001;
  border-radius: 10px;
  padding: 4px 8px 2px 8px;
  min-height: 36px;
`;
const MainContent = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  padding: 0 0 32px 0;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: y proximity;
  will-change: scroll-position;
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
  @media (max-width: 700px) {
    scroll-behavior: auto;
    -webkit-overflow-scrolling: touch;
  }
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 4px;
    transition: background 0.2s;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
  }
`;
const Footer = styled.div`
  flex: 0 0 auto;
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
  flex: 1 1 0;
  min-width: 340px;
  background: ${({ theme }: { theme: any }) => theme.CARD};
  border-radius: 16px;
  box-shadow: ${({ theme }: { theme: any }) => theme.SHADOW}, 0 8px 32px 0 ${({ theme }: { theme: any }) => theme.ACCENT}11;
  border: 1.5px solid ${({ theme }: { theme: any }) => theme.BORDER};
  padding: 0 0 1.5rem 0;
  overflow-x: auto;
`;
const EnhancedTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 340px;
`;
const EnhancedTh = styled.th`
  padding: 0.35rem 0.6rem;
  text-align: left;
  color: ${({ theme }: { theme: any }) => theme.TEXT_SECONDARY};
  font-weight: 700;
  font-size: 0.93rem;
  border-bottom: 1px solid ${({ theme }: { theme: any }) => theme.BORDER};
  background: ${({ theme }: { theme: any }) => theme.CARD};
  position: sticky;
  top: 0;
  z-index: 2;
  height: 30px;
`;
const EnhancedTd = styled.td`
  padding: 0.35rem 0.6rem;
  color: ${({ theme }: { theme: any }) => theme.TEXT_PRIMARY};
  border-bottom: 1px solid ${({ theme }: { theme: any }) => theme.BORDER};
  font-size: 0.93rem;
  height: 30px;
`;
const EnhancedTr = styled.tr`
  &:hover {
    background: ${({ theme }: { theme: any }) => theme.FIELD_BG};
    box-shadow: 0 2px 8px ${({ theme }: { theme: any }) => theme.ACCENT}11;
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
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ $active, $color }) => $active ? $color : 'transparent'};
  color: ${({ $active, $color }) => $active ? '#fff' : $color};
  border: 1.5px solid ${({ $color }) => $color};
  font-size: 0.93rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${({ $active, $color }) => $active ? `0 0 6px 1.5px ${$color}55` : 'none'};
  transition: background 0.18s, color 0.18s, border-color 0.18s, box-shadow 0.18s;
  &:hover, &:focus {
    background: ${({ $color }) => $color};
    color: #fff;
    outline: none;
    box-shadow: 0 0 6px 1.5px ${({ $color }) => $color}55;
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
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  border: 2px solid ${({ theme }) => theme.ACCENT};
  background: ${({ theme }) => theme.FIELD_BG};
  transition: all 0.2s ease;
  font-size: 0.7rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};

  &:hover {
    background: ${({ theme }) => theme.ACCENT}15;
    transform: scale(1.05);
  }

  &.checked {
    background: ${({ theme }) => theme.ACCENT};
    color: white;
  }

  /* Mobile adjustments */
  @media (max-width: 700px) {
    width: 22px;
    height: 22px;
    font-size: 0.65rem;
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
  gap: 0.6rem;
  width: 100%;
  box-sizing: border-box;
  padding-bottom: 5.5rem;
`;
const MobileStudentCard = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }: { theme: any }) => theme.CARD};
  border-radius: 12px;
  box-shadow: ${({ theme }: { theme: any }) => theme.SHADOW};
  border: 1px solid ${({ theme }: { theme: any }) => theme.BORDER};
  padding: 0.5rem 0.7rem;
  gap: 0.7rem;
  font-size: 0.93rem;
  width: 100%;
  min-width: 320px;
  transition: background-color 0.2s ease, border-color 0.2s ease;
  cursor: pointer;
  
  &:hover {
    background: ${({ theme }: { theme: any }) => theme.ACCENT}25;
    border-color: ${({ theme }: { theme: any }) => theme.ACCENT}40;
  }
`;
const MobileAvatar = styled(Avatar)`
  width: 28px;
  height: 28px;
  font-size: 0.93rem;
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
  font-size: 0.97rem;
  color: ${({ theme }: { theme: any }) => theme.TEXT_PRIMARY};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const MobileFatherName = styled.span`
  font-size: 0.85rem;
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
  grid-gap: 0.3rem;
  width: 64px;
`;
const DesktopStatusRow = styled.div`
  display: flex;
  gap: 0.6rem;
  margin-left: auto;
`;
// Desktop status button: pill/rounded rectangle, full name
const DesktopStatusButton = styled.button<{ $active: boolean; $color: string }>`
  min-width: 90px;
  padding: 0.45rem 1.1rem;
  border-radius: 22px;
  background: ${({ $active, $color }) => $active ? $color : 'transparent'};
  color: ${({ $active, $color }) => $active ? '#fff' : $color};
  border: 1.5px solid ${({ $color }) => $color};
  font-size: 1.01rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${({ $active, $color }) => $active ? `0 0 8px 2px ${$color}33` : 'none'};
  transition: background 0.18s, color 0.18s, border-color 0.18s, box-shadow 0.18s;
  &:hover, &:focus {
    background: ${({ $color }) => $color};
    color: #fff;
    outline: none;
    box-shadow: 0 0 8px 2px ${({ $color }) => $color}33;
  }
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

// Add skeleton loading components
const SkeletonControlsBar = styled.div`
  display: flex;
  gap: 1.2rem;
  margin-bottom: 1.2rem;
  flex-wrap: wrap;
  align-items: flex-end;
  padding: 0.7rem 1rem 0.7rem 1rem;
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : theme.CARD};
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
    z-index: 2;
  }
  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.7rem;
    padding: 0.7rem;
  }
  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
  }
`;

const SkeletonInputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 140px;
  flex: 1 1 180px;
  @media (max-width: 700px) {
    width: 100%;
    min-width: 0;
    flex: none;
  }
`;

const SkeletonLabel = styled.div`
  width: 60px;
  height: 16px;
  border-radius: 4px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  margin-bottom: 4px;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

const SkeletonInput = styled.div`
  width: 100%;
  height: 40px;
  border-radius: 8px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

const SkeletonSelectAllRow = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 0.7rem;
  margin-left: 0.2rem;
  justify-content: space-between;
`;

const SkeletonCheckbox = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ theme }: { theme: any }) => theme.BG === '#252525' ? '#181c2a' : '#e5e7eb'};
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

const SkeletonButton = styled.div`
  width: 120px;
  height: 36px;
  border-radius: 8px;
  background: ${({ theme }: { theme: any }) => theme.BG === '#252525' ? '#181c2a' : '#e5e7eb'};
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

const SkeletonStudentCard = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : theme.CARD};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 0.5rem 0.7rem;
  gap: 0.7rem;
  width: 100%;
  /* Removed min-width and margin-bottom for full expansion */
  position: relative;
  overflow: hidden;
  z-index: 1;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
    z-index: 2;
  }
`;

const SkeletonAvatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

const SkeletonNameBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
  min-width: 0;
  gap: 4px;
`;

const SkeletonName = styled.div`
  width: 120px;
  height: 16px;
  border-radius: 4px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

const SkeletonFatherName = styled.div`
  width: 80px;
  height: 12px;
  border-radius: 4px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

const SkeletonStatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-gap: 0.3rem;
  width: 64px;
`;

const SkeletonStatusButton = styled.div`
  width: 28px;
  height: 28px;
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

const SkeletonFloatingButtons = styled.div`
  position: fixed;
  bottom: 2rem;
  right: 4rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.7rem 1.2rem;
  border-radius: 32px;
  background: rgba(40, 40, 60, 0.32);
  backdrop-filter: blur(12px);
  border: 1.5px solid rgba(255,255,255,0.18);
  z-index: 3000;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.06), transparent);
    animation: shimmer 1.5s infinite;
    z-index: 2;
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

  // Stats
  const totalStudents = students.length;
  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = students.filter(s => s.status === 'absent').length;
  const leaveCount = students.filter(s => s.status === 'leave').length;

  const didSetDefaultStatus = useRef(false);
  const didAutoSelect = useRef(false);
  useEffect(() => {
    if (!didSetDefaultStatus.current && students.length > 0) {
      // Only set default status if there are no existing attendance records
      if (!hasAttendanceRecords) {
        setStudents(prev => prev.map(s => ({ ...s, status: s.status || 'present' })));
      }
      didSetDefaultStatus.current = true;
    }
    if (students.length > 0 && !didAutoSelect.current) {
      // Only auto-select if there are no existing attendance records
      if (!hasAttendanceRecords) {
        setSelectedRows(students.map(s => s.id));
      } else {
        // If there are existing records, only select students who have status
        setSelectedRows(students.filter(s => s.status).map(s => s.id));
      }
      didAutoSelect.current = true;
    }
    // eslint-disable-next-line
  }, [students, hasAttendanceRecords]);

  useEffect(() => {
    didSetDefaultStatus.current = false;
  }, [selectedClass, selectedSection, date]);

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
        console.error('Error fetching active session:', error);
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
        console.error('Error fetching staff_id:', error);
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
          if (!selectedSection) {
            setSelectedSection(data[0].id.toString());
            setSelectedClass(data[0].class_id.toString());
          }
        } else {
          setTeacherSections([]);
          toast.showToast('No section assigned to you. Please contact admin.', 'error');
        }
      } catch (error) {
        console.error('Error fetching teacher sections:', error);
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
        console.error('Error fetching teacher classes:', error);
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
      const query = supabase.from('classes').select('id, name, has_sections').eq('school_id', user.school_id);
      
      const { data, error } = await query;
      if (error) {
        console.error('Error fetching classes:', error);
        toast.showToast('Failed to fetch classes (see console)', 'error');
      }
      const sortedClasses = sortClasses(data || []);
      setClasses(sortedClasses);
    } catch (error) {
      toast.showToast('Failed to fetch classes (exception)', 'error');
      console.error('Exception in fetchClasses:', error);
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
        console.error('Error fetching sections:', error);
        toast.showToast('Failed to fetch sections (see console)', 'error');
      }
      setSections(data || []);
    } catch (error) {
      toast.showToast('Failed to fetch sections (exception)', 'error');
      console.error('Exception in fetchSections:', error);
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

      // Check for holidays (simplified approach)
      // First get all holidays for the date range
      const { data: allHolidays } = await supabase
        .from('holidays')
        .select('*')
        .eq('school_id', user.school_id)
        .lte('start_date', date)
        .gte('end_date', date);

      if (allHolidays && allHolidays.length > 0) {
        // Get holiday assignments for these holidays
        const holidayIds = allHolidays.map(h => h.id);
        const { data: holidayAssignments } = await supabase
          .from('holiday_classes')
          .select('holiday_id, class_id, section_id')
          .in('holiday_id', holidayIds);

        // Check if any holiday applies to this class/section
        const isHoliday = allHolidays.some(holiday => {
          const assignments = holidayAssignments?.filter(a => a.holiday_id === holiday.id) || [];
          
          // Global holiday (no assignments)
          if (assignments.length === 0) return true;
          
          // Class-specific holiday (no section specified)
          if (assignments.some(a => a.class_id === selectedClass && !a.section_id)) return true;
          
          // Section-specific holiday
          if (hasSections && assignments.some(a => a.class_id === selectedClass && a.section_id === selectedSection)) return true;
          
          return false;
        });

        if (isHoliday) {
          toast.showToast('Selected date is a holiday', 'error');
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
        .eq('class_id', selectedClass)
        .eq('school_id', user.school_id);
      
      // Only filter by section if the class has sections
      if (hasSections) {
        schQuery = schQuery.eq('section_id', selectedSection);
      } else {
        schQuery = schQuery.is('section_id', null);
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
        .select('id, name, father_name, picture_url')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .in('id', studentIds);

      if (studentsError) throw studentsError;

      // Fetch attendance records for this date/section/class
      let attendanceQuery = supabase
        .from('attendance_records')
        .select('student_id, status, remarks')
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

      // Merge attendance status into students
      const attendanceMap = new Map();
      (attendanceData || []).forEach((rec: any) => {
        attendanceMap.set(rec.student_id, { status: rec.status, remarks: rec.remarks });
      });
      const formattedStudents = (studentsData || []).map((student: any) => {
        const att = attendanceMap.get(student.id);
        return {
          id: student.id,
          name: student.name,
          father_name: student.father_name,
          status: att ? att.status : (attendanceData && attendanceData.length === 0 ? 'present' : undefined),
          picture_url: student.picture_url,
          remarks: att ? att.remarks || '' : '',
        };
      }).sort((a, b) => a.id - b.id);
      setStudents(formattedStudents);
      if (formattedStudents.length === 0) {
        toast.showToast('No students found in this class', 'success');
      }
      setHasAttendanceRecords((attendanceData || []).length > 0);
      
      // Log attendance view activity (no notification for view)
      try {
        const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
        const selectedSectionObj = sections.find(s => String(s.id) === String(selectedSection));
        
        await logAttendanceActivity(
          'view',
          selectedClassObj?.name || 'Unknown Class',
          selectedSectionObj?.name || 'All Sections',
          formattedStudents.length,
          date,
          { createNotification: false } // Don't create notification for view
        );
      } catch (activityError) {
        console.error('Failed to log attendance view activity:', activityError);
        // Don't fail the operation if activity logging fails
      }
    } catch (error) {
      toast.showToast('Failed to fetch students', 'error');
      console.error('Error:', error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleStatusChange = (studentId: number, status: 'present' | 'absent' | 'leave' | 'late') => {
    setStudents(prev =>
      prev.map(student =>
        student.id === studentId
          ? ({ ...student, status: status.toLowerCase() as 'present' | 'absent' | 'leave' | 'late' } as Student)
          : student
      )
    );
    setSelectedRows(prev => prev.includes(studentId) ? prev : [...prev, studentId]);
    setStatusBounce({ id: studentId, status: status.toLowerCase() });
    setTimeout(() => setStatusBounce(null), 600);
  };


  const handleBulkMark = (status: 'present' | 'absent' | 'leave' | 'late') => {
    setStudents(prev =>
      prev.map(student => ({ ...student, status }))
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

        console.log(`Prepared ${notificationData.length} WhatsApp notifications`);
        return notificationData.length;
      }
      return 0;
    } catch (error) {
      console.error('Error preparing attendance notifications:', error);
      throw error;
    }
  };

  const handleSave = async () => {
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
      const studentsToSave = filtered.filter(student => typeof student.status === 'string' && validStatuses.includes(student.status));
      if (studentsToSave.length === 0) {
        toast.showToast('No valid attendance records to save', 'error');
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
        created_at: new Date().toISOString(),
        session_id: sessionId,
        school_id: user.school_id,
      }));
      
      setProgress(50);
      // Delete existing records first to avoid conflicts
      let deleteQuery = supabase
        .from('attendance_records')
        .delete()
        .eq('class_id', selectedClass)
        .eq('date', date)
        .eq('school_id', user.school_id);
      
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
        console.error('Failed to log attendance activity:', activityError);
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
          console.error('Failed to prepare WhatsApp notifications:', whatsappError);
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
      console.error('Error saving attendance:', error);
      toast.showToast(error.message || 'Failed to save attendance', 'error');
      completeProgress();
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = (columnStudents: Student[]) =>
    columnStudents.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.father_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  useEffect(() => {
    // Clear students when class changes
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
        fetchStudents();
      }
    }
  }, [selectedClass, selectedSection, date, user, classes]);

  // Group students by status
  const presentStudents = students.filter(s => s.status === 'present');
  const absentStudents = students.filter(s => s.status === 'absent');
  const leaveStudents = students.filter(s => s.status === 'leave');
  const unmarkedStudents = students.filter(s => !s.status);

  // Just before return, after students and filteredStudents are defined:
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const filtered = filteredStudents(students);
  const allChecked = filtered.length > 0 && filtered.every(s => selectedRows.includes(s.id));
  const handleToggleSelectAll = () => {
    if (allChecked) {
      // Deselect only filtered students
      setSelectedRows(prev => prev.filter(id => !filtered.some(s => s.id === id)));
      setStudents(prev => prev.map(s => filtered.some(f => f.id === s.id) ? { ...s, status: undefined } : s));
    } else {
      // Select all filtered students
      setSelectedRows(prev => Array.from(new Set([...prev, ...filtered.map(s => s.id)])));
      setStudents(prev => prev.map(s => filtered.some(f => f.id === s.id) ? { ...s, status: 'present' } : s));
    }
  };
  const handleMarkAll = (status: 'present' | 'absent') => {
    setStudents(prev =>
      prev.map(s =>
        selectedRows.includes(s.id) ? { ...s, status } : s
      )
    );
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
        setStudents(students => students.map(s => s.id === studentId ? { ...s, status: undefined } : s));
        return prev.filter(id => id !== studentId);
      } else {
        // Select: add to selectedRows and set status to present
        setStudents(students => students.map(s => s.id === studentId ? { ...s, status: 'present' } : s));
        return [...prev, studentId];
      }
    });
  };

  // Reset didAutoSelect when class/section/date changes
  useEffect(() => {
    didAutoSelect.current = false;
  }, [selectedClass, selectedSection, date]);

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
        .eq('school_id', user.school_id);
      
      // Only filter by section if the class has sections
      if (hasSections) {
        deleteQuery = deleteQuery.eq('section_id', selectedSection);
      } else {
        deleteQuery = deleteQuery.is('section_id', null);
      }
      
      const { error } = await deleteQuery;

      if (error) throw error;

      setProgress(80);
      // Set all students to present after deletion
      setStudents(prev => prev.map(s => ({ ...s, status: 'present' })));
      setHasAttendanceRecords(false);
      
      setProgress(100);
      completeProgress();
      toast.showToast('Attendance records deleted successfully', 'success');
    } catch (error) {
      toast.showToast('Failed to delete attendance records', 'error');
      console.error('Error:', error);
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

  // Student area logic
  let studentAreaContent = null;
  if (!selectedClass) {
    studentAreaContent = (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', width: '100%', textAlign: 'center', color: '#888', fontWeight: 600
      }}>
        <Class style={{ fontSize: 54, color: '#6366f1', marginBottom: 12 }} />
        <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>Select a class to mark attendance</div>
        <div style={{ fontSize: '1rem', marginTop: 8, color: '#aaa' }}>Attendance will appear here once you select a class.</div>
      </div>
    );
  } else {
    // Check if the selected class has sections
    const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
    const hasSections = selectedClassObj?.has_sections ?? true;
    
    // If class has sections but no section is selected, show section selection message
    if (hasSections && !selectedSection) {
      studentAreaContent = (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', width: '100%', textAlign: 'center', color: '#888', fontWeight: 600
        }}>
          <Class style={{ fontSize: 54, color: '#6366f1', marginBottom: 12 }} />
          <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>Select a section to mark attendance</div>
          <div style={{ fontSize: '1rem', marginTop: 8, color: '#aaa' }}>Attendance will appear here once you select a section.</div>
        </div>
      );
    } else if (!loading && students.length === 0) {
      studentAreaContent = (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', color: '#888', fontWeight: 600
        }}>
          <span style={{ fontSize: 48, marginBottom: 12 }}>
            <i className="fas fa-user-slash" />
          </span>
          <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>No students found to be listed for this class.</div>
        </div>
      );
    }
  }

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
          <>
            <SegmentedGroup theme={theme === 'dark' ? darkTheme : lightTheme}>
              <SegmentedSelect
                theme={theme === 'dark' ? darkTheme : lightTheme}
                value={selectedClass} 
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  setSelectedClass(e.target.value);
                }}
                disabled={user?.role === 'Teacher' ? teacherHasSingleSection : false}
                style={{ minWidth: 120 }}
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
                    style={{ minWidth: 120 }}
                  >
                    <option value="">Select Section</option>
                    {user?.role === 'Teacher'
                        ? teacherSections.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))
                        : sections.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                  </SegmentedSelect>
                ) : null;
              })()}
              <SegmentedInput
                theme={theme === 'dark' ? darkTheme : lightTheme}
                type="date"
                value={date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setDate(e.target.value);
                }}
                style={{ minWidth: 120 }}
              />
            </SegmentedGroup>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              gap: 12,
              fontSize: isMobile ? '0.89rem' : '0.98rem',
              color: theme === 'dark' ? darkTheme.TEXT_SECONDARY : lightTheme.TEXT_SECONDARY,
              fontWeight: 600,
              marginTop: 8,
              textAlign: 'center'
            }}>
              <span>Total: {totalStudents}</span>
              <span>| Present: {presentCount}</span>
              <span>| Absent: {absentCount}</span>
              <span>| Leave: {leaveCount}</span>
              <span>| Late: {students.filter(s => s.status === 'late').length}</span>
            </div>
          </>
        ) : (
          <SegmentedGroup theme={theme === 'dark' ? darkTheme : lightTheme}>
            <SegmentedSelect
              theme={theme === 'dark' ? darkTheme : lightTheme}
              value={selectedClass}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  setSelectedClass(e.target.value);
                }}
                disabled={user?.role === 'Teacher' ? teacherHasSingleSection : false}
              style={{ minWidth: 120 }}
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
                  style={{ minWidth: 120 }}
                >
                  <option value="">Select Section</option>
                  {user?.role === 'Teacher'
                    ? teacherSections.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))
                    : sections.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                </SegmentedSelect>
              ) : null;
            })()}
            <SegmentedInput
              theme={theme === 'dark' ? darkTheme : lightTheme}
              type="date"
              value={date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setDate(e.target.value);
                }}
              style={{ minWidth: 120 }}
            />
            <SegmentedInput
              theme={theme === 'dark' ? darkTheme : lightTheme}
                type="text"
                placeholder="Search by name or father name..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setSearchTerm(e.target.value);
                }}
              style={{ minWidth: 180 }}
            />
          </SegmentedGroup>
              )}
      </Header>
      <MainContent>
        <MobileStudentList>
          {/* Minimal Select All / Deselect All checkbox above the list */}
          {filtered.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 8px 12px', fontSize: '0.97em' }}>
              <SerialCheckbox
                className={allChecked ? 'checked' : ''}
                onClick={handleToggleSelectAll}
                title={allChecked ? 'Deselect all students' : 'Select all students'}
                style={{ fontSize: '0.6rem', fontWeight: 'bold' }}
              >
                {allChecked ? '✓' : '○'}
              </SerialCheckbox>
              <span style={{ userSelect: 'none', color: '#a0a7b8' }}>Select All</span>
            </div>
          )}
          {studentAreaContent ? (
            studentAreaContent
          ) : (
            // Remove the SelectAllRow block here
            null
          )}
          {loadingStudents ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: 16 }}>
              <Spinner />
              <div style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '1.2px' }}>Loading students…</div>
            </div>
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
                  <MobileStudentName>{student.name}</MobileStudentName>
                  <MobileFatherName>{student.father_name}</MobileFatherName>
                </MobileNameBlock>
                {isMobile ? (
                  <MobileStatusGrid>
                    <EnhancedStatusButton
                      $active={student.status === 'present'}
                      $color="#16a34a"
                      onMouseDown={e => { e.preventDefault(); handleStatusChange(student.id, 'present'); }}
                      onMouseUp={() => setStatusBounce(null)}
                      onMouseLeave={() => setStatusBounce(null)}
                      onTouchStart={e => { handleStatusChange(student.id, 'present'); }}
                      onTouchEnd={() => setStatusBounce(null)}
                      onClick={() => handleStatusChange(student.id, 'present')}
                    >
                      P
                    </EnhancedStatusButton>
                    <EnhancedStatusButton
                      $active={student.status === 'absent'}
                      $color="#dc2626"
                      onMouseDown={e => { e.preventDefault(); handleStatusChange(student.id, 'absent'); }}
                      onMouseUp={() => setStatusBounce(null)}
                      onMouseLeave={() => setStatusBounce(null)}
                      onTouchStart={e => { handleStatusChange(student.id, 'absent'); }}
                      onTouchEnd={() => setStatusBounce(null)}
                      onClick={() => handleStatusChange(student.id, 'absent')}
                    >
                      A
                    </EnhancedStatusButton>
                    <EnhancedStatusButton
                      $active={student.status === 'leave'}
                      $color="#4a6cf7"
                      onMouseDown={e => { e.preventDefault(); handleStatusChange(student.id, 'leave'); }}
                      onMouseUp={() => setStatusBounce(null)}
                      onMouseLeave={() => setStatusBounce(null)}
                      onTouchStart={e => { handleStatusChange(student.id, 'leave'); }}
                      onTouchEnd={() => setStatusBounce(null)}
                      onClick={() => handleStatusChange(student.id, 'leave')}
                    >
                      L
                    </EnhancedStatusButton>
                    <EnhancedStatusButton
                      $active={student.status === 'late'}
                      $color="#f59e42"
                      onMouseDown={e => { e.preventDefault(); handleStatusChange(student.id, 'late'); }}
                      onMouseUp={() => setStatusBounce(null)}
                      onMouseLeave={() => setStatusBounce(null)}
                      onTouchStart={e => { handleStatusChange(student.id, 'late'); }}
                      onTouchEnd={() => setStatusBounce(null)}
                      onClick={() => handleStatusChange(student.id, 'late')}
                    >
                      Lt
                    </EnhancedStatusButton>
                  </MobileStatusGrid>
                ) : (
                  <>
                    <input
                      type="text"
                      value={student.remarks || ''}
                      onChange={e => handleRemarksChange(student.id, e.target.value)}
                      placeholder="Remarks"
                      style={{
                        marginRight: '1rem',
                        padding: '0.4rem 0.7rem',
                        borderRadius: '8px',
                        border: '1px solid #888',
                        minWidth: '120px',
                        maxWidth: '200px',
                        fontSize: '0.97rem',
                        background: 'rgba(255,255,255,0.07)',
                        color: '#fff',
                        outline: 'none',
                      }}
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
      {students.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '8px 16px',
          margin: '8px 0',
          background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
          borderRadius: '8px',
          border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          fontSize: '0.9rem',
          fontWeight: 600,
          color: theme === 'dark' ? '#e2e8f0' : '#374151'
        }}>
          <input
            type="checkbox"
            id="whatsapp-toggle"
            checked={sendWhatsAppNotifications}
            onChange={(e) => setSendWhatsAppNotifications(e.target.checked)}
            disabled={saving || whatsappProcessing}
            style={{
              width: '18px',
              height: '18px',
              accentColor: '#25d366',
              cursor: saving || whatsappProcessing ? 'not-allowed' : 'pointer'
            }}
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
            Send WhatsApp notifications to absent/late/leave students
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
        </div>
      )}
      
      <Footer>
        {!isMobile && (
          <div style={{ fontSize: '0.98rem', color: (theme === 'dark' ? darkTheme.TEXT_SECONDARY : lightTheme.TEXT_SECONDARY), fontWeight: 600 }}>
            Total: {totalStudents} | Present: {presentCount} | Absent: {absentCount} | Leave: {leaveCount} | Late: {students.filter(s => s.status === 'late').length}
          </div>
        )}
        <SegmentedGroup
          theme={theme === 'dark' ? darkTheme : lightTheme}
          style={isMobile
            ? { marginTop: 8, width: '100%', justifyContent: 'center', overflowX: 'auto' }
            : { marginTop: 8, justifyContent: 'flex-end' }
          }
        >
          <SegmentedButton
            theme={theme === 'dark' ? darkTheme : lightTheme}
            first
            onClick={() => handleMarkAll('present')}
            style={{ minWidth: 70, padding: '0.35rem 0.7em', fontSize: '0.85em', minHeight: 32 }}
            disabled={students.length === 0 || selectedRows.length === 0}
          >
            {!isMobile && <CheckCircle style={{ fontSize: 18, marginRight: 4 }} />}
            All Present
          </SegmentedButton>
          <SegmentedButton
            theme={theme === 'dark' ? darkTheme : lightTheme}
            onClick={() => handleMarkAll('absent')}
            style={{ minWidth: 70, padding: '0.35rem 0.7em', fontSize: '0.85em', minHeight: 32 }}
            disabled={students.length === 0 || selectedRows.length === 0}
          >
            {!isMobile && <Cancel style={{ fontSize: 18, marginRight: 4 }} />}
            All Absent
          </SegmentedButton>
          <SegmentedButton
            theme={theme === 'dark' ? darkTheme : lightTheme}
              onClick={() => setShowDeleteConfirm(true)}
            disabled={students.length === 0 || selectedRows.length === 0 || !selectedClass || !date || deleting || (classes.find(c => String(c.id) === String(selectedClass))?.has_sections ?? true) && !selectedSection}
            style={{ minWidth: 90, padding: '0.35rem 0.7em', fontSize: '0.97em', color: '#fff', background: '#dc2626', borderColor: '#dc2626', minHeight: 32, opacity: 0.93 }}
            >
            {deleting ? <Spinner /> : <><Delete style={{ fontSize: 18, marginRight: 4 }} /> Delete</>}
          </SegmentedButton>
          <SegmentedButton
            theme={theme === 'dark' ? darkTheme : lightTheme}
            last
            onClick={handleSave}
            disabled={students.length === 0 || selectedRows.length === 0 || saving}
            style={{ minWidth: 90, padding: '0.35rem 0.7em', fontSize: '0.97em', color: '#fff', background: '#16a34a', borderColor: '#16a34a', fontWeight: 700, minHeight: 32, opacity: 0.93 }}
          >
            {saving ? <Spinner /> : <><Save style={{ fontSize: 18, marginRight: 4 }} /> Save</>}
          </SegmentedButton>
        </SegmentedGroup>
      </Footer>
        {showDeleteConfirm && (
          <>
            <Overlay onClick={() => setShowDeleteConfirm(false)} />
            <ConfirmationDialog>
              <DialogTitle>Delete Attendance Records</DialogTitle>
              <DialogContent>
                Are you sure you want to delete all attendance records for the selected class, section, and date? This action cannot be undone.
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
      
      {/* WhatsApp Bulk Sender Modal */}
      {showWhatsAppSender && (
        <WhatsAppBulkSender
          notificationData={whatsappNotificationData}
          schoolName="Your School Name" // You can get this from schoolData
          onClose={() => {
            setShowWhatsAppSender(false);
            setWhatsappNotificationData([]);
          }}
        />
      )}
    </>
  );
};

// Dashboard-style MarkAttendanceSkeleton component
const MarkAttendanceSkeleton: React.FC = () => {
  return (
    <MarkAttendanceSkeletonContainer>
      {/* Controls bar skeleton */}
      <SkeletonControlsBar>
        {[1,2,3].map(i => (
          <SkeletonInputGroup key={i}>
            <SkeletonLabel />
            <SkeletonInput />
          </SkeletonInputGroup>
        ))}
      </SkeletonControlsBar>
      {/* Stats row skeleton */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '8px 0 12px 0' }}>
        <div style={{ width: 320, height: 18, borderRadius: 8, background: '#232a3b22', maxWidth: '100%' }} />
      </div>
      {/* Select All skeleton */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 8px 12px', fontSize: '0.97em' }}>
        <div style={{ width: 16, height: 16, borderRadius: 4, background: '#232a3b22' }} />
        <div style={{ width: 60, height: 12, borderRadius: 4, background: '#232a3b22' }} />
      </div>
      {/* Student list skeleton */}
      <div style={{ width: '100%' }}>
        {[1,2,3,4,5,6,7,8].map(i => (
          <SkeletonStudentCard key={i}>
            <SkeletonAvatar />
            <SkeletonNameBlock>
              <SkeletonName />
              <SkeletonFatherName />
            </SkeletonNameBlock>
          </SkeletonStudentCard>
        ))}
      </div>
      {/* Footer segmented group skeleton */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <div style={{ display: 'flex', gap: 0, borderRadius: 11, overflow: 'hidden', boxShadow: '1.4px 1.4px 4px #2222' }}>
          {[1,2,3,4].map((i) => (
            <div key={i} style={{ width: 90, height: 32, background: '#232a3b22', border: '1.5px solid #232a3b33', borderLeft: i === 1 ? '1.5px solid #232a3b33' : 'none', borderRadius: i === 1 ? '11px 0 0 11px' : i === 4 ? '0 11px 11px 0' : '0', marginLeft: i === 1 ? 0 : -1.5 }} />
          ))}
        </div>
      </div>
    </MarkAttendanceSkeletonContainer>
  );
};

// Dashboard-style skeleton container for MarkAttendance
const MarkAttendanceSkeletonContainer = styled.div`
  width: 100%;
  height: 100%;
  padding: clamp(8px, 2vw, 24px);
  box-sizing: border-box;
  @media (max-width: 900px) {
    padding: clamp(6px, 2vw, 12px);
  }
  @media (max-width: 600px) {
    padding: 8px 10px;
    padding-bottom: 2.5rem;
  }
`;

// --- Segmented Group Styles (copied from StudentList) ---
const SEGMENTED_HEIGHT = '32px';
const SegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.BG === '#252525' ? '#222' : '#f3f4f6'};
  border-radius: 11px;
  box-shadow: 1.4px 1.4px 4px #2222;
  overflow: hidden;
  @media (max-width: 700px) {
    width: 100%;
    justify-content: center;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    border-radius: 11px;
  }
`;
const SegmentedBase = css`
  font-family: inherit;
  font-size: 0.77em;
  font-weight: 400;
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  box-shadow: 1.4px 1.4px 4px #2222;
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#f3f4f6'};
  color: ${({ theme }) => theme.BG === '#252525' ? '#C0C0C0' : '#444'};
`;
const SegmentedInput = styled.input<{ pill?: boolean }>`
  ${SegmentedBase}
  padding: 0 0.84em;
  min-width: 98px;
  border-right: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
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
    border-left: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
  }
  @media (max-width: 700px) {
    width: 100%;
    min-width: 0;
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
  padding: 0 2.2em 0 0.84em;
  border-right: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
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
    border-left: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
  }
  appearance: none;
  -webkit-appearance: none;
  background-image: ${({ theme }) => theme.BG === '#252525'
    ? `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%23C0C0C0' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`
    : `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%23444' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`};
  background-repeat: no-repeat;
  background-position: right 0.8em center;
  background-size: 1em 1em;
  @media (max-width: 700px) {
    width: 100%;
    min-width: 0;
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
  ${({ first }) => first && `
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  `}
  ${({ last }) => last && `
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  cursor: pointer;
  background: ${({ active, theme }) => active ? theme.ACCENT : theme.BG};
  color: ${({ active, theme }) => active ? '#fff' : theme.TEXT_PRIMARY};
  border: 1.5px solid ${({ active, theme }) => active ? theme.ACCENT : theme.FIELD_BORDER};
  font-weight: ${({ active }) => active ? 700 : 400};
  &:hover, &:focus {
    background: ${({ theme }) => theme.BG === '#252525' ? '#353535' : '#e5e7eb'};
    opacity: 0.92;
  }
  & svg {
    font-size: 15px;
    vertical-align: middle;
    display: inline-block;
  }
  @media (max-width: 700px) {
    width: 100%;
    min-width: 0;
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

export default MarkAttendance; 