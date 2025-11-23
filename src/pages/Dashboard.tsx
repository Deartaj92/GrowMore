import React, { useEffect, useState, useRef, useCallback } from 'react';
import styled, { useTheme, keyframes } from 'styled-components';
import { 
  People, 
  School, 
  Assessment, 
  CalendarMonth, 
  CheckCircle, 
  Cancel, 
  AccessTime, 
  Wc, 
  ArrowBackIosNew, 
  ArrowForwardIos, 
  PictureAsPdf, 
  AccountCircle, 
  MoreVert, 
  KeyboardArrowUp, 
  KeyboardArrowDown,
  KeyboardArrowUpRounded as ChevronDownIcon,
  FileDownloadOutlined as ExportIcon,
  Payments,
  ReceiptLong,
  Settings,
  MonetizationOn,
  Delete,
  Assignment,
  Book,
  WhatsApp
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import ReactDOM from 'react-dom';
import { useToast } from '../components/useToast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useCapacitorPdfSave } from '../hooks/useCapacitorPdfSave';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import NoStudentsFound from '../components/NoStudentsFound';
import NoSessionsFound from '../components/NoSessionsFound';
import { useLoading } from '../contexts/LoadingContext';
import { useProgress } from '../components/Layout';
import { PageHeaderContext } from '../components/Layout';
import { sortClasses } from '../utils/classUtils';
import { getStudentDisplayId } from '../utils/studentUtils';
import Loader from '../components/Loader';
import { homeworkDiaryService } from '../services/homeworkDiaryService';
import WhatsAppBulkSender from '../components/WhatsAppBulkSender';
import { whatsappSemiAutoService, AttendanceNotificationData } from '../services/whatsappSemiAuto';
import { fetchRenderSettings, isDashboardCardVisible, isGuestPageAccessible, RenderSettings } from '../services/renderSettingsService';

// TypeScript declaration for jsPDF autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (...args: any[]) => jsPDF;
  }
}

const DashboardContainer = styled.div`
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

const DashboardGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  justify-content: flex-start;
  align-items: stretch;
  margin-top: 5px;
  width: 100%;
  @media (max-width: 1100px) {
    gap: 16px;
  }
  @media (max-width: 900px) {
    gap: 10px;
    flex-direction: column;
    margin-top: 10px;
  }
  @media (max-width: 600px) {
    gap: 6px;
    margin-top: 4px;
  }
`;

const Card = styled.div<{
  gradient?: string;
  shadow?: string;
}>`
  flex: 1 1 260px;
  min-width: 220px;
  max-width: 400px;
  background: ${({ gradient }) => gradient || 'linear-gradient(135deg, #232a3b 60%, #232a3b 100%)'};
  border-radius: 20px;
  box-shadow: 0 8px 32px 0 #10131b, 0 1.5px 0 #232a3b;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 24px 32px;
  position: relative;
  color: #fff;
  overflow: visible;
  min-width: 0;
  min-height: 0;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 20px;
    box-shadow: inset 0 2px 16px #1a2233;
    pointer-events: none;
    z-index: 0;
  }
  @media (max-width: 900px) {
    flex: 1 1 45%;
    min-width: 180px;
    max-width: 100%;
    padding: 18px 12px;
  }
  @media (max-width: 700px) {
    flex: 1 1 100%;
    min-width: 0;
    max-width: 100%;
    padding: 12px 6px;
  }
`;

const CardIconCircle = styled.div<{
  bg: string;
  shadow: string;
}>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ bg }) => bg};
  box-shadow: ${({ shadow }) => shadow};
  color: #fff;
  font-size: 2rem;
  margin-right: 18px;
  z-index: 1;
`;

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  z-index: 1;
`;

const CardTitle = styled.div`
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 2px;
  text-shadow: 0 2px 8px #10131b;
`;

const CardValue = styled.div`
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: 1px;
  text-shadow: 0 2px 8px #10131b;
`;

const ChartCard = styled(Card)`
  flex-direction: column;
  align-items: flex-start;
  padding: 24px 32px 16px 32px;
  grid-column: span 2;
  min-height: 220px;
`;

const ChartTitle = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 12px;
  text-shadow: 0 2px 8px #10131b;
`;

const ChartSVG = styled.svg`
  width: 100%;
  height: 120px;
  display: block;
`;

const StatCard = styled.div`
  flex: 1 1 320px;
  min-width: 220px;
  max-width: 400px;
  background: linear-gradient(135deg, #232a3b 60%, #232a3b 100%);
  border-radius: 20px;
  box-shadow: 0 8px 32px 0 #10131b, 0 1.5px 0 #232a3b;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 32px 40px;
  position: relative;
  color: #fff;
  overflow: visible;
  min-width: 0;
  min-height: 0;
  @media (max-width: 900px) {
    flex: 1 1 45%;
    min-width: 180px;
    max-width: 100%;
    padding: 18px 12px;
  }
  @media (max-width: 700px) {
    flex: 1 1 100%;
    min-width: 0;
    max-width: 100%;
    padding: 12px 6px;
  }
`;

const IconCircle = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3a4a6d 60%, #4e5d8a 100%);
  box-shadow: 0 4px 16px #1a2233;
  color: #fff;
  font-size: 2rem;
  margin-right: 18px;
  z-index: 1;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: clamp(0.7rem, 2vw, 1.5rem);
  margin-bottom: clamp(1rem, 3vw, 2.2rem);
  width: 100%;
  @media (max-width: 600px) {
    grid-template-columns: 1fr 1fr;
    gap: 0.7rem;
  }
`;

const SummaryCard = styled.div<{ bg?: string }>`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : theme.CARD)};
  border-radius: 14px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.10);
  padding: clamp(0.8rem, 2vw, 1.2rem) clamp(0.8rem, 2vw, 1.2rem) clamp(0.7rem, 1.5vw, 1rem) clamp(0.8rem, 2vw, 1.2rem);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  flex: 1 1 0;
  color: #fff;
  position: relative;
  margin-bottom: 0;
  border: 1px solid ${({ theme }) => theme.BORDER};
  transition: border-color 0.18s;
  font-size: clamp(0.92rem, 1.5vw, 1.05rem);
  &:hover {
    border-color: #6366f1;
  }
`;

const SummaryIconBg = styled.div<{ color: string }>`
  position: absolute;
  top: 0.7rem;
  right: 0.7rem;
  background: ${({ color }) => color};
  border-radius: 16px;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  filter: none;
`;

const SummaryTitle = styled.div`
  font-size: 0.98rem;
  font-weight: 700;
  margin-bottom: 0.2rem;
  color: #a0a7b8;
`;

const SummaryValue = styled.div<{ color?: string }>`
  font-size: 1.5rem;
  font-weight: 800;
  color: ${({ color }) => color || '#fff'};
  margin-bottom: 0.1rem;
`;

const SummarySubRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.1rem;
  margin-top: 0.2rem;
  font-size: 1.08rem;
  font-weight: 600;
`;

const GenderStat = styled.span<{ color: string }>`
  display: flex;
  align-items: center;
  gap: 0.3em;
  color: ${({ color }) => color};
  font-size: 1.08rem;
  font-weight: 700;
`;

const ProgressBar = styled.div<{ color: string; percent: number }>`
  width: 100%;
  height: 9px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 6px;
  margin: 0.5rem 0 0.2rem 0;
  overflow: hidden;
  position: relative;
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${({ percent }) => percent}%;
    background: ${({ color }) => {
      if (color === '#22c55e') return '#22c55e'; // Present (green)
      if (color === '#ef4444') return '#ef4444'; // Absent (red)
      if (color === '#facc15' || color === '#eab308') return '#eab308'; // Late (yellow)
      return color;
    }};
    border-radius: 6px;
    transition: width 0.3s;
  }
`;

const SubLabel = styled.span<{ color: string }>`
  color: ${({ color }) => color};
  font-size: 1.01rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.2em;
`;

const StrengthCard = styled.div`
  background: #181c2a;
  border-radius: 14px;
  box-shadow: 0 4px 18px #0002;
  padding: 1.5rem 1.5rem 1.2rem 1.5rem;
  margin-bottom: 2.2rem;
  width: 100%;
  @media (max-width: 700px) {
    padding: 0.7rem 0.7rem 0.5rem 0.7rem;
    margin-bottom: 1rem;
  }
`;

const StrengthTitle = styled.div`
  font-size: 1.25rem;
  font-weight: 800;
  color: #a78bfa;
  margin-bottom: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
`;

const ClassStrengthTableCard = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : theme.CARD};
  border-radius: 14px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.10);
  padding: 0;
  color: #fff;
  position: relative;
  border: 1px solid ${({ theme }) => theme.BORDER};
  margin-bottom: 0;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  margin-top: 0.2rem;
  overflow: hidden;
`;

const SectionHeader = styled.div`
  width: 100%;
  text-align: center;
  font-size: 1.15rem;
  font-weight: 700;
  color: #a78bfa;
  letter-spacing: 0.02em;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(35,42,59,0.20)' : 'rgba(167,139,250, 0.08)'};
  border-bottom: 1.5px solid ${({ theme }) => theme.BG === '#252525' ? 'rgba(167,139,250,0.2)' : 'rgba(167,139,250,0.15)'};
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(35,42,59,0.35)' : 'rgba(167,139,250, 0.12)'};
  }

  @media (max-width: 700px) {
    padding: 12px;
    font-size: 1.1rem;
  }
`;

const SectionHeaderTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
`;

const StrengthExpandIcon = styled(ChevronDownIcon)<{ $isExpanded: boolean }>`
  width: 20px;
  height: 20px;
  transition: transform 0.2s ease;
  transform: ${props => props.$isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  color: #a78bfa;
`;

const CollapsibleContent = styled.div<{ $isExpanded: boolean }>`
  max-height: ${props => props.$isExpanded ? '500px' : '0'};
  opacity: ${props => props.$isExpanded ? '1' : '0'};
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: ${props => props.$isExpanded ? '1rem 1.2rem' : '0 1.2rem'};
`;

const ClassStrengthTableContainer = styled.div`
  max-height: 320px; /* Height for ~10 rows */
  overflow-y: auto;
  overflow-x: hidden;
  border-radius: 8px;
  padding-right: 8px;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.BG === '#252525' ? '#6366f1cc #232a3b' : '#6366f1cc #e5e7eb'};
  
  &::-webkit-scrollbar {
    width: 10px;
    background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#e5e7eb'};
    border-radius: 8px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #6366f1;
    border-radius: 8px;
    border: 2px solid ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#e5e7eb'};
    min-height: 30px;
    
    &:hover {
      background: #818cf8;
    }
    
    &:active {
      background: #4f46e5;
    }
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#e5e7eb'};
    border-radius: 8px;
    border: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#d1d5db'};
  }
  
  &::-webkit-scrollbar-corner {
    background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#e5e7eb'};
  }
`;

const ClassStrengthTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 0.98em;
  margin: 0 auto;
  th, td {
    padding: 0.45em 0.7em;
    border-bottom: 1px solid #353b4a;
  }
  th:first-child, td:first-child {
    text-align: left;
    width: 25%;
  }
  th:nth-child(2), td:nth-child(2) {
    text-align: right;
    width: 25%;
  }
  th:nth-child(3), td:nth-child(3) {
    text-align: right;
    width: 25%;
  }
  th:nth-child(4), td:nth-child(4) {
    text-align: right;
    width: 25%;
  }
  th {
    color: #a78bfa;
    font-weight: 700;
    background: rgba(167, 139, 250, 0.15);
    position: sticky;
    top: 0;
    z-index: 2;
    backdrop-filter: blur(8px);
  }
`;

const ClassStrengthFooter = styled.div`
  background: rgba(167, 139, 250, 0.1);
  border-top: 2px solid #6366f1;
  padding: 0;
  display: table;
  width: 100%;
  table-layout: fixed;
  font-weight: 800;
  color: #6366f1;
  position: sticky;
  bottom: 0;
  z-index: 1;
  backdrop-filter: blur(8px);
  
  & > span {
    display: table-cell;
    padding: 0.8rem 0.7em;
    vertical-align: middle;
  }
  
  & > span:first-child {
    text-align: left;
    width: 25%;
  }
  
  & > span:nth-child(2) {
    text-align: right;
    width: 25%;
  }
  
  & > span:nth-child(3) {
    text-align: right;
    width: 25%;
  }
  
  & > span:nth-child(4) {
    text-align: right;
    width: 25%;
  }
`;

const GenderRow = styled.div`
  display: flex;
  gap: 0.7rem;
  align-items: center;
`;

const GenderLabel = styled.span<{ color: string }>`
  font-size: 0.97rem;
  font-weight: 700;
  color: ${({ color }) => color};
  display: flex;
  align-items: center;
  gap: 0.2em;
`;

const ProgressBarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  margin: 0.5rem 0 0.2rem 0;
`;

const TwoColumnGrid = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: ${({ $columns }) => ($columns === 2 ? '1fr 1fr' : '1fr')};
  gap: 1.1rem;
  align-items: flex-start;
  width: 100%;
  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
    gap: 0.7rem;
  }
`;

const LeftColumn = styled.div`
    min-width: 0;
    width: 100%;
`;

const RightColumn = styled.div`
    min-width: 0;
    width: 100%;
`;

const AbsentsTableWrapper = styled.div`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : theme.CARD)};
  border-radius: 14px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.10);
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 0;
  margin-bottom: clamp(1rem, 2vw, 2rem);
  position: relative;
  width: 100%;
  overflow: hidden;
`;

const AbsentsTableHeader = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(35,42,59,0.20)' : 'rgba(239,68,68, 0.08)'};
  border-bottom: 1.5px solid ${({ theme }) => theme.BG === '#252525' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)'};
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(35,42,59,0.35)' : 'rgba(239,68,68, 0.12)'};
  }

  @media (max-width: 700px) {
    padding: 12px;
    flex-direction: column;
    gap: 0;
  }
`;

const AbsentsHeaderTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
`;

const AbsentsHeaderTitle = styled.div`
  font-size: 1.15rem;
  font-weight: 700;
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: 8px;

  @media (max-width: 700px) {
    font-size: 1.1rem;
  }
`;

const AbsentsControls = styled.div<{ isExpanded: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;

  @media (max-width: 700px) {
    width: 100%;
    margin-top: ${props => props.isExpanded ? '12px' : '0'};
    height: ${props => props.isExpanded ? 'auto' : '0'};
    opacity: ${props => props.isExpanded ? '1' : '0'};
    pointer-events: ${props => props.isExpanded ? 'auto' : 'none'};
    transition: all 0.2s ease;
    overflow: hidden;
    gap: 8px;
    align-items: stretch;
    justify-content: flex-start;
  }
`;

const DateInput = styled.input`
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(35,42,59,0.45)' : 'rgba(239,68,68,0.08)'};
  border: 1px solid ${({ theme }) => theme.BG === '#252525' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
  height: 36px;

  @media (max-width: 700px) {
    flex: 1;
    height: 44px;
    min-width: 0;
  }
`;

const ExportButton = styled.button`
  background: rgba(239,68,68,0.1);
  color: #ef4444;
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 8px;
  padding: 6px 16px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 36px;
  position: relative;

  &:hover {
    background: rgba(239,68,68,0.15);
  }

  @media (max-width: 700px) {
    height: 44px;
    width: 44px;
    padding: 0;
    font-size: 1rem;
    font-weight: 700;
    min-width: 44px;
    flex-shrink: 0;
  }
`;

const ExportDropdown = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#fff'};
  border: 1px solid ${({ theme }) => theme.BG === '#252525' ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.2)'};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  min-width: 200px;
  overflow: hidden;
  margin-top: 4px;

  @media (max-width: 700px) {
    right: -10px;
    min-width: 180px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    z-index: 99999;
    position: fixed;
    top: auto;
    bottom: auto;
    transform: translateY(0);
    pointer-events: auto;
    touch-action: manipulation;
  }
`;

const ExportDropdownItem = styled.button<{ $type?: 'absent' | 'present' }>`
  width: 100%;
  padding: 10px 16px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.9rem;
  color: ${({ theme, $type }) => {
    if ($type === 'absent') {
      return theme.BG === '#252525' ? '#fca5a5' : '#dc2626';
    } else if ($type === 'present') {
      return theme.BG === '#252525' ? '#86efac' : '#16a34a';
    }
    return theme.BG === '#252525' ? '#e2e8f0' : '#1e293b';
  }};
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: ${({ theme, $type }) => {
      if ($type === 'absent') {
        return theme.BG === '#252525' ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)';
      } else if ($type === 'present') {
        return theme.BG === '#252525' ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.05)';
      }
      return theme.BG === '#252525' ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)';
    }};
  }

  &:first-child {
    border-radius: 8px 8px 0 0;
  }

  &:last-child {
    border-radius: 0 0 8px 8px;
  }

  @media (max-width: 700px) {
    padding: 12px 16px;
    font-size: 1rem;
    min-height: 48px;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }
`;

const ExpandIcon = styled(ChevronDownIcon)<{ $isExpanded: boolean }>`
  width: 20px;
  height: 20px;
  transition: transform 0.2s ease;
  transform: ${props => props.$isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  color: #ef4444;
`;

const WhatsAppButton = styled.button`
  background: rgba(37, 211, 102, 0.1);
  color: #25d366;
  border: 1px solid rgba(37, 211, 102, 0.2);
  border-radius: 8px;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 36px;
  height: 36px;
  flex-shrink: 0;

  &:hover {
    background: rgba(37, 211, 102, 0.15);
    border-color: rgba(37, 211, 102, 0.3);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    font-size: 1.2rem;
  }

  @media (max-width: 700px) {
    width: 44px;
    height: 44px;
    padding: 0;
    flex-shrink: 0;
    
    svg {
      font-size: 1.4rem;
    }
  }
`;

const AbsentsCollapsibleContent = styled(CollapsibleContent)`
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(35,42,59,0.10)' : 'transparent'};
`;

const AbsentsHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-left: auto;
  @media (max-width: 600px) {
    flex-direction: row;
    align-items: stretch;
    gap: 0.5rem;
    margin-left: 0;
    width: 100%;
    & > *:first-child {
      flex: 2 1 0;
      min-width: 0;
    }
    & > *:last-child {
      flex: 1 1 0;
      min-width: 0;
    }
  }
`;

const DateFieldWrapper = styled.div`
  position: relative;
  width: 180px;
  @media (max-width: 900px) {
    width: 100%;
    min-width: 0;
  }
`;

const hideDateIconCss = ``;

const StyledDateInput = styled.input`
  padding: 0.5rem 1rem;
  font-size: 1.05rem;
  border-radius: 8px;
  border: 1.5px solid ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? 'rgba(99,102,241,0.13)' : 'rgba(99,102,241,0.13)'};
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#232a3b' : '#fff'};
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#fff' : '#232a3b'};
  min-height: 2.3em;
  height: 2.3em;
  width: 180px;
  box-sizing: border-box;
  transition: border 0.2s, box-shadow 0.2s;
  &:focus {
    border-color: #a78bfa;
    box-shadow: 0 0 0 2px #a78bfa33;
  }
  @media (max-width: 900px) {
    width: 100%;
    min-width: 0;
  }
`;

const AbsentsTitle = styled.div`
  font-size: 1.15rem;
  font-weight: 700;
  color: #ef4444;
  @media (max-width: 700px) {
    margin-bottom: 1.1rem;
  }
`;

const AbsentsExportBtn = styled.button`
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? 'rgba(239,68,68,0.13)' : 'rgba(225,29,72,0.13)'};
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#ef4444' : '#e11d48'};
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1.1rem;
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  min-width: 80px;
  max-width: 120px;
  white-space: nowrap;
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.5em;
  height: 2.3em;
  box-sizing: border-box;
  @media (max-width: 600px) {
    margin-left: 0;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    justify-content: center;
    font-size: 0.85rem;
    padding: 0.22rem 0.4rem;
    height: 2em;
    gap: 0.2em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    svg { font-size: 0.95em !important; }
  }
  &:hover { background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? 'rgba(239,68,68,0.22)' : 'rgba(225,29,72,0.22)'}; }
`;

const AbsenteeCard = styled.div`
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#2a2a2a' : '#fff'};
  border-radius: 10px;
  border: 1.5px solid ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#353b4a' : '#e5e7eb'};
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  padding: 0.38rem 0.7rem 0.38rem 0.7rem;
  margin-bottom: 0.18rem;
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#fff' : '#232a3b'};
  min-width: 0;
  font-size: 0.85rem;
  z-index: 1;
  transition: background 0.18s;
  &:hover {
    background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#353b4a' : '#f3f4f8'};
  }
`;

const IconButton = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  &:hover {
    background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
  }
`;

const AbsenteeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.18rem;
  font-size: 0.92rem;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  @media (max-width: 600px) {
    gap: 0.12rem;
    font-size: 0.85rem;
  }
`;

const StatTooltip = styled.span`
  position: relative;
  cursor: help;

  &:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    padding: 4px 8px;
    background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#fff'};
    color: ${({ theme }) => theme.BG === '#252525' ? '#fff' : '#232a3b'};
    border-radius: 4px;
    font-size: 0.75rem;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    border: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#454d5e' : '#e5e7eb'};
    z-index: 1000;
  }
`;

const AbsenteeId = styled.span`
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#b0b8d1' : '#6366f1'};
  font-weight: 600;
  font-size: 0.85rem;
`;

const AbsenteeName = styled.span`
  font-weight: 700;
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#fff' : '#232a3b'};
  font-size: clamp(0.75rem, 2vw, 0.93rem);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AbsenteeFather = styled.span`
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#a0a7b8' : '#94a3b8'};
  font-size: clamp(0.7rem, 1.8vw, 0.82rem);
  margin-left: 0.15rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AbsenteeMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.18rem;
  font-size: 0.82rem;
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#a0a7b8' : '#64748b'};
  margin-top: 0.14rem;
  flex-wrap: wrap;
  @media (max-width: 600px) {
    gap: 0.10rem;
    font-size: 0.75rem;
  }
`;

const Dot = styled.span`
  display: inline-block;
  width: 4px;
  height: 4px;
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#a0a7b8' : '#cbd5e1'};
  border-radius: 50%;
  margin: 0 0.18rem;
  &.father-dot {
    @media (max-width: 600px) {
      display: none;
    }
  }
`;

const StatusButton = styled.button<{ status: string }>`
  position: absolute;
  top: clamp(0.2rem, 1vw, 0.5rem);
  right: clamp(0.2rem, 1vw, 0.5rem);
  padding: clamp(0.08rem, 0.5vw, 0.2rem) clamp(0.4rem, 1vw, 0.8rem);
  border-radius: 999px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: clamp(0.6rem, 1.2vw, 0.75rem);
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${({ status, theme }) => {
    const isDark = theme.BG === '#252525' || theme.BG === '#181c2a';
    return status === 'Leave' 
      ? (isDark ? 'rgba(37,99,235,0.15)' : '#eff6ff')
      : (isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2');
  }};
  color: ${({ status }) => status === 'Leave' ? '#2563eb' : '#ef4444'};
  border: 1.5px solid ${({ status, theme }) => {
    const isDark = theme.BG === '#252525' || theme.BG === '#181c2a';
    return status === 'Leave'
      ? (isDark ? '#2563eb' : '#bfdbfe')
      : (isDark ? '#ef4444' : '#fecaca');
  }};
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  @media (max-width: 600px) {
    padding: 0.15rem 0.6rem;
    font-size: 0.7rem;
    top: 0.4rem;
    right: 0.4rem;
  }
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

const PreviewIcon = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: #232a3b;
  color: #b0b8d1;
  box-shadow: 0 4px 18px #0006;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3.2rem;
`;

const StudentAvatar = styled.div`
  width: clamp(18px, 4vw, 26px);
  height: clamp(18px, 4vw, 26px);
  border-radius: 50%;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: clamp(0.18rem, 1vw, 0.5rem);
  color: ${({ theme }) => theme.BG === '#252525' ? '#a0a7b8' : '#64748b'};
  font-weight: 600;
  font-size: clamp(0.7rem, 1.5vw, 0.8rem);
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  @media (max-width: 600px) {
    width: 22px;
    height: 22px;
    font-size: 0.7rem;
    margin-right: 0.35rem;
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    display: block;
  }
`;

const AbsenteesGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 12px;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.BG === '#252525' ? '#6366f1cc #232a3b' : '#6366f1cc #e5e7eb'};
  &::-webkit-scrollbar {
    width: 6px;
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? '#6366f1cc' : '#6366f1cc'};
    border-radius: 6px;
    transition: background 0.2s;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#818cf8' : '#818cf8'};
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#e5e7eb'};
    border-radius: 6px;
  }
  @media (max-width: 600px) {
    gap: 0.35rem;
    max-height: 260px;
    padding-right: 6px;
  }
`;

// Animation for absentee card appearance (slide-in with fade and scale)
const slideIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
    filter: blur(4px);
  }
  60% {
    opacity: 1;
    transform: translateY(-4px) scale(1.03);
    filter: blur(0px);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0px);
  }
`;

const AnimatedAbsenteeCard = styled(AbsenteeCard)<{ $index: number }>`
  opacity: 0;
  animation: ${slideIn} 0.7s cubic-bezier(0.23, 1, 0.32, 1) forwards;
  animation-delay: ${props => props.$index * 0.09 + 0.18}s;
`;

const CompactAnimatedAbsenteeCard = styled(AnimatedAbsenteeCard)`
  padding: clamp(0.18rem, 1vw, 0.38rem) clamp(0.5rem, 2vw, 0.7rem);
  font-size: clamp(0.72rem, 1.7vw, 0.8rem);
  min-width: 0;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: clamp(0.18rem, 1vw, 0.55rem);
  position: relative;
  @media (max-width: 600px) {
    padding: 0.28rem 0.5rem;
    font-size: 0.75rem;
    gap: 0.35rem;
    min-width: 340px;
  }
`;

const AbsenteeCardContent = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1 1 0;
  min-width: 0;
`;

const StatusPill = styled.button<{ $status: string }>`
  background: ${({ $status, theme }) => {
    if ($status === 'absent') return theme.BG === '#252525' ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.12)';
    if ($status === 'leave') return theme.BG === '#252525' ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.12)';
    return 'transparent';
  }};
  color: ${({ $status }) => {
    if ($status === 'absent') return '#ef4444';
    if ($status === 'leave') return '#2563eb';
    return '#64748b';
  }};
  border: none;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  position: absolute;
  right: 16px;
  top: 16px;
  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
`;

// Status options for dropdown
const statusOptions = [
  { value: 'present', label: 'Present', color: '#22c55e' },
  { value: 'absent', label: 'Absent', color: '#ef4444' },
  { value: 'late', label: 'Late', color: '#eab308' },
  { value: 'leave', label: 'Leave', color: '#2563eb' },
];
const deleteOption = { value: 'DELETE', label: 'Delete', color: '#ef4444' };

// Minimal dropdown for status
const StatusDropdown = styled.div<{ direction: 'up' | 'down' }>`
  position: absolute;
  z-index: 1000;
  min-width: 120px;
  max-width: 220px;
  width: max-content;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG === '#252525' || theme.BG === '#181c2a' ? 'rgba(42,42,42,0.97)' : '#fff'};
  color: ${({ theme }) => theme.BG === '#252525' || theme.BG === '#181c2a' ? '#f3f4f6' : '#232a3b'};
  border: 1.5px solid ${({ theme }) => theme.BG === '#252525' || theme.BG === '#181c2a' ? '#353b4a' : '#e5e7eb'};
  border-radius: 8px;
  box-shadow: 0 2px 12px #0002;
  padding: 0.2rem 0;
  display: flex;
  flex-direction: column;
  right: 0;
  ${({ direction }) =>
    direction === 'down'
      ? 'top: calc(100% + 6px);'
      : 'bottom: calc(100% + 6px);'}
`;

const StatusOption = styled.button<{ color: string; separator?: boolean }>`
  background: none;
  border: none;
  color: ${({ color }) => color};
  font-weight: 600;
  font-size: 0.93rem;
  padding: 0.4rem 1rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
  border-top: ${({ separator }) => separator ? '1px solid #eee' : 'none'};
  margin-top: ${({ separator }) => separator ? '2px' : '0'};
  &:hover {
    background: ${({ color }) => color}22;
  }
`;

// Stylish loading skeleton for absentee cards
const CardSkeleton = styled.div`
  width: 60px;
  height: 28px;
  border-radius: 8px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.2s infinite;
    border-radius: 8px;
  }
  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
  }
`;

const SkeletonLine = styled.div`
  height: 12px;
  width: 80%;
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#353b4a' : '#e0e7ef'};
  border-radius: 6px;
  margin: 6px 0 0 0;
`;

const SkeletonMeta = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 4px;
`;

const SkeletonBadge = styled.div`
  width: 48px;
  height: 16px;
  border-radius: 999px;
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#353b4a' : '#e0e7ef'};
  position: absolute;
  bottom: 0.38rem;
  right: 0.7rem;
`;

// Stylish loading skeleton for absentee cards
const AbsenteeSkeleton = styled.div`
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#232a3b' : '#f3f4f6'};
  border-radius: 10px;
  border: 1.5px solid ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#353b4a' : '#e5e7eb'};
  min-height: 54px;
  margin-bottom: 0.18rem;
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  padding: 0.38rem 0.7rem 0.38rem 0.7rem;
  position: relative;
  overflow: hidden;
  z-index: 1;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.2s infinite;
    z-index: 2;
    border-radius: 10px;
  }
  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
  }
`;

// Add new styled summary card for dashboard stats
const StatsSummaryCard = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : theme.CARD};
  border-radius: 16px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.10);
  padding: 1.5rem 1.5rem 1.2rem 1.5rem;
  margin-bottom: 1rem;
  width: 100%;
  border: 1.5px solid ${({ theme }) => theme.BORDER};
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
`;

const StatsArcRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.2rem;
  margin-bottom: 0.7rem;
`;

const StatArcWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 44px;
`;
const StatArcLabel = styled.div`
  font-size: 0.78rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 600;
  margin-top: 1px;
`;
const StatArcCount = styled.div`
  font-size: 0.72rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 500;
  margin-top: 0px;
`;
const StatArc: React.FC<{
  percent: number;
  color: string;
  label: string;
  count: number;
}> = ({ percent, color, label, count }) => {
  const [displayPercent, setDisplayPercent] = useState(0);
  const requestRef = useRef<number | null>(null);
  useEffect(() => {
    let start: number | null = null;
    const duration = 1800;
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setDisplayPercent(Math.round(progress * percent));
      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayPercent(percent);
      }
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [percent]);
  // SVG arc math for 270° arc with bottom gap
  const size = 38;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const startAngle = 135; // bottom left
  const endAngle = 405;   // bottom right (270° arc)
  const arcAngle = endAngle - startAngle;
  const arcEnd = startAngle + (arcAngle * (displayPercent / 100));
  // Arc helpers
  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const a = (angle - 90) * Math.PI / 180.0;
    return {
      x: cx + r * Math.cos(a),
      y: cy + r * Math.sin(a)
    };
  };
  const describeArc = (cx: number, cy: number, r: number, start: number, end: number) => {
    const startPt = polarToCartesian(cx, cy, r, end);
    const endPt = polarToCartesian(cx, cy, r, start);
    const largeArcFlag = end - start <= 180 ? '0' : '1';
    return [
      'M', startPt.x, startPt.y,
      'A', r, r, 0, largeArcFlag, 0, endPt.x, endPt.y
    ].join(' ');
  };
  return (
    <StatArcWrapper>
      <svg width={size} height={size} style={{ display: 'block', position: 'relative' }}>
        {/* Background arc */}
        <path
          d={describeArc(center, center, radius, startAngle, endAngle)}
          stroke={color + '22'}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
        />
        {/* Foreground arc */}
        <path
          d={describeArc(center, center, radius, startAngle, arcEnd)}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.4s' }}
        />
        {/* Centered percentage */}
        <text
          x="54%"
          y="54%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="0.62rem"
          fontWeight="700"
          fill={color}
          style={{ fontFamily: 'Inter, Segoe UI, Arial, sans-serif', pointerEvents: 'none', userSelect: 'none' }}
        >
          {displayPercent}%
        </text>
      </svg>
      <StatArcLabel>{label}</StatArcLabel>
      <StatArcCount>{count}</StatArcCount>
    </StatArcWrapper>
  );
};

const NoSessionContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
  padding: 2rem;
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const NoSessionTitle = styled.h2`
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: #6366f1;
`;

const NoSessionText = styled.p`
  font-size: 1.1rem;
  margin-bottom: 2rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const CreateSessionButton = styled.button`
  background: #6366f1;
  color: white;
  border: none;
  padding: 0.8rem 2rem;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: #4f46e5;
    transform: translateY(-2px);
  }
`;

// Add at the top of the file (after imports)
function isNoSessionError(error: any) {
  return (
    error &&
    (
      error.code === 'PGRST116' ||
      error.message?.includes('multiple (or no) rows returned') ||
      error.details?.includes('contains 0 rows')
    )
  );
}


// Add this custom hook at the top of the file, after imports
function useExpandedState(key: string, defaultValue: boolean = false) {
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(isExpanded));
    } catch (error) {
      // Failed to save state
    }
  }, [isExpanded, key]);

  return [isExpanded, setIsExpanded] as const;
}

// Add this styled component near the other styled components at the top:
const AbsenteesStatsRow = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2.5rem;
  margin: 16px 0 0 0;
  font-size: 1.08rem;
  font-weight: 600;
  color: #a0a7b8;
  & .stat {
    display: flex;
    align-items: center;
    gap: 0.4em;
  }
  & .absent { color: #ef4444; }
  & .leave { color: #2563eb; }
  & .avg { color: #22c55e; }
  @media (max-width: 600px) {
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 1rem;
    font-size: 0.85rem;
    margin: 10px 0 0 0;
    align-items: center;
    overflow-x: auto;
    white-space: nowrap;
  }
`;

// Add a small CircleIcon styled component for colored dots:
const CircleIcon = styled.span<{ color: string }>`
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ color }) => color};
  margin-right: 0.4em;
`;

// Fine details styled components
const FineTableWrapper = styled.div`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : theme.CARD)};
  border-radius: 14px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.10);
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 0;
  margin-top: 1.5rem;
  margin-bottom: clamp(1rem, 2vw, 2rem);
  position: relative;
  width: 100%;
  overflow: hidden;
`;

const FineTableHeader = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(35,42,59,0.20)' : 'rgba(239,68,68, 0.08)'};
  border-bottom: 1.5px solid ${({ theme }) => theme.BG === '#252525' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)'};
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(35,42,59,0.35)' : 'rgba(239,68,68, 0.12)'};
  }

  @media (max-width: 700px) {
    padding: 12px;
    flex-direction: column;
    gap: 0;
  }
`;

const FineHeaderTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
`;

const FineHeaderTitle = styled.div`
  font-size: 1.15rem;
  font-weight: 700;
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: 8px;

  @media (max-width: 700px) {
    font-size: 1.1rem;
  }
`;

const FineControls = styled.div<{ isExpanded: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;

  @media (max-width: 700px) {
    width: 100%;
    margin-top: ${props => props.isExpanded ? '12px' : '0'};
    height: ${props => props.isExpanded ? 'auto' : '0'};
    opacity: ${props => props.isExpanded ? '1' : '0'};
    pointer-events: ${props => props.isExpanded ? 'auto' : 'none'};
    transition: all 0.2s ease;
    overflow: hidden;
  }
`;


const FineDateInput = styled.input`
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(35,42,59,0.45)' : 'rgba(239,68,68,0.08)'};
  border: 1px solid ${({ theme }) => theme.BG === '#252525' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
  height: 36px;

  @media (max-width: 700px) {
    flex: 1;
    height: 40px;
  }
`;

const FineAmountButton = styled.button`
  background: rgba(34,197,94,0.1);
  color: #22c55e;
  border: 1px solid rgba(34,197,94,0.2);
  border-radius: 8px;
  padding: 6px 16px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 36px;
  position: relative;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    background: rgba(34,197,94,0.15);
  }

  @media (max-width: 700px) {
    height: 44px;
    padding: 10px 16px;
    font-size: 1rem;
    min-width: 100px;
  }
`;

const FineDetailsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-height: 280px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 12px;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.BG === '#252525' ? '#6366f1cc #232a3b' : '#6366f1cc #e5e7eb'};
  &::-webkit-scrollbar {
    width: 6px;
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? '#6366f1cc' : '#6366f1cc'};
    border-radius: 6px;
    transition: background 0.2s;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#818cf8' : '#818cf8'};
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#e5e7eb'};
    border-radius: 6px;
  }
  @media (max-width: 600px) {
    gap: 0.35rem;
    max-height: 260px;
    padding-right: 6px;
  }
`;

const FineDetailItem = styled.div<{ $isRemission?: boolean }>`
  background: ${({ theme, $isRemission }) => 
    $isRemission 
      ? (theme.BG === '#252525' || theme.BG === '#181c2a' ? 'rgba(236,72,153,0.15)' : 'rgba(236,72,153,0.08)')
      : (theme.BG === '#252525' || theme.BG === '#181c2a' ? '#2a2a2a' : '#fff')
  };
  border-radius: 10px;
  border: 1.5px solid ${({ theme, $isRemission }) => 
    $isRemission 
      ? (theme.BG === '#252525' || theme.BG === '#181c2a' ? 'rgba(236,72,153,0.3)' : 'rgba(236,72,153,0.2)')
      : (theme.BG === '#252525' || theme.BG === '#181c2a' ? '#353b4a' : '#e5e7eb')
  };
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.38rem 0.7rem 0.38rem 0.7rem;
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#fff' : '#232a3b'};
  min-width: 0;
  font-size: 0.85rem;
  z-index: 1;
  transition: background 0.18s;
  &:hover {
    background: ${({ theme, $isRemission }) => 
      $isRemission 
        ? (theme.BG === '#252525' || theme.BG === '#181c2a' ? 'rgba(236,72,153,0.25)' : 'rgba(236,72,153,0.12)')
        : (theme.BG === '#252525' || theme.BG === '#181c2a' ? '#353b4a' : '#f3f4f8')
    };
  }
`;

const FineCardContent = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1 1 0;
  min-width: 0;
`;

const FineRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.18rem;
  font-size: 0.92rem;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  @media (max-width: 600px) {
    gap: 0.12rem;
    font-size: 0.85rem;
  }
`;

const FineMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.18rem;
  font-size: 0.82rem;
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#a0a7b8' : '#64748b'};
  margin-top: 0.14rem;
  flex-wrap: wrap;
  @media (max-width: 600px) {
    gap: 0.10rem;
    font-size: 0.75rem;
  }
`;

const FineStudentAvatar = styled.div`
  width: clamp(18px, 4vw, 26px);
  height: clamp(18px, 4vw, 26px);
  border-radius: 50%;
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#232a3b' : '#f1f5f9'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#b0b8d1' : '#64748b'};
  overflow: hidden;
  border: 1px solid ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#3a3f4a' : '#e2e8f0'};
  flex-shrink: 0;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
`;

const FineStudentId = styled.span`
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#b0b8d1' : '#6366f1'};
  font-weight: 600;
  font-size: 0.85rem;
`;

const FineStudentName = styled.span`
  font-weight: 700;
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#fff' : '#232a3b'};
  font-size: clamp(0.75rem, 2vw, 0.93rem);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FineStudentFather = styled.span`
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#a0a7b8' : '#94a3b8'};
  font-size: clamp(0.7rem, 1.8vw, 0.82rem);
  margin-left: 0.15rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FineAmount = styled.span<{ $isRemission?: boolean }>`
  color: ${({ $isRemission }) => $isRemission ? '#ec4899' : '#22c55e'};
  font-weight: 700;
  font-size: 0.9rem;
`;

const RemissionBadge = styled.span`
  background: rgba(236, 72, 153, 0.1);
  color: #ec4899;
  border: 1px solid rgba(236, 72, 153, 0.2);
  border-radius: 4px;
  padding: 0.1rem 0.3rem;
  font-size: 0.7rem;
  font-weight: 600;
  margin-left: 0.3rem;
`;

const FineTime = styled.span`
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#a0a7b8' : '#64748b'};
  font-size: 0.8rem;
`;

const FineActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
`;

const FineDot = styled.span`
  display: inline-block;
  width: 4px;
  height: 4px;
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#a0a7b8' : '#94a3b8'};
  border-radius: 50%;
  margin: 0 0.1rem;
`;

const DeleteButton = styled.button`
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.15);
  border-radius: 4px;
  padding: 0.3rem;
  font-size: 0.7rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  
  &:hover {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.25);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const NoFineData = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  min-height: 120px;
`;

const FineExpandIcon = styled(ChevronDownIcon)<{ $isExpanded: boolean }>`
  width: 20px;
  height: 20px;
  transition: transform 0.2s ease;
  transform: ${props => props.$isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  color: #ef4444;
`;

const FineCollapsibleContent = styled(CollapsibleContent)`
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(35,42,59,0.10)' : 'transparent'};
`;

// Homework Diary styled components
const HomeworkTableWrapper = styled.div`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : theme.CARD)};
  border-radius: 14px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.10);
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 0;
  margin-top: 1.5rem;
  margin-bottom: clamp(1rem, 2vw, 2rem);
  position: relative;
  width: 100%;
  overflow: hidden;
  
  @media (max-width: 700px) {
    border-radius: 12px;
    margin-top: 1rem;
    margin-bottom: 1rem;
  }
`;

const HomeworkTableHeader = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(35,42,59,0.20)' : 'rgba(99,102,241, 0.08)'};
  border-bottom: 1.5px solid ${({ theme }) => theme.BG === '#252525' ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)'};
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(35,42,59,0.35)' : 'rgba(99,102,241, 0.12)'};
  }
  
  @media (max-width: 700px) {
    padding: 10px 12px;
  }
`;

const HomeworkHeaderTitle = styled.div`
  font-size: 1.15rem;
  font-weight: 700;
  color: #6366f1;
  display: flex;
  align-items: center;
  gap: 8px;
  
  @media (max-width: 700px) {
    font-size: 1rem;
    gap: 6px;
  }
`;

const HomeworkExpandIcon = styled(ChevronDownIcon)<{ $isExpanded: boolean }>`
  width: 20px;
  height: 20px;
  transition: transform 0.2s ease;
  transform: ${props => props.$isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  color: #6366f1;
  
  @media (max-width: 700px) {
    width: 18px;
    height: 18px;
  }
`;

const HomeworkCollapsibleContent = styled(CollapsibleContent)`
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(35,42,59,0.10)' : 'transparent'};
`;

const HomeworkList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem 1.2rem;
  scrollbar-width: thin;
  scrollbar-color: #6366f1 ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#e5e7eb'};
  
  &::-webkit-scrollbar {
    width: 10px;
    background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#e5e7eb'};
    border-radius: 8px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #6366f1;
    border-radius: 8px;
    border: 2px solid ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#e5e7eb'};
    min-height: 30px;
    
    &:hover {
      background: #818cf8;
    }
    
    &:active {
      background: #4f46e5;
    }
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#e5e7eb'};
    border-radius: 8px;
    border: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#d1d5db'};
  }
  
  &::-webkit-scrollbar-corner {
    background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#e5e7eb'};
  }
  
  @media (max-width: 700px) {
    padding: 0.75rem 0.9rem;
    gap: 0.4rem;
    max-height: 350px;
    
    &::-webkit-scrollbar {
      width: 6px;
    }
  }
`;

const HomeworkClassItem = styled.div`
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#2a2a2a' : '#fff'};
  border-radius: 10px;
  border: 1.5px solid ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#353b4a' : '#e5e7eb'};
  padding: 0.75rem 1rem;
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#fff' : '#232a3b'};
  min-width: 0;
  font-size: 0.9rem;
  
  @media (max-width: 700px) {
    padding: 0.6rem 0.75rem;
    font-size: 0.85rem;
    border-radius: 8px;
  }
`;

const HomeworkClassHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-weight: 700;
  color: #6366f1;
  font-size: 1rem;
  
  @media (max-width: 700px) {
    font-size: 0.9rem;
    gap: 0.4rem;
    margin-bottom: 0.4rem;
    flex-wrap: wrap;
  }
`;

const HomeworkSubjectItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.625rem 0;
  border-bottom: 1px solid ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#353b4a' : '#e5e7eb'};
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)'};
    border-radius: 6px;
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  @media (max-width: 700px) {
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.5rem 0;
    align-items: stretch;
  }
`;

const HomeworkSubjectHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  
  @media (max-width: 700px) {
    justify-content: space-between;
    gap: 0.5rem;
  }
`;

const HomeworkSubjectName = styled.span`
  font-weight: 600;
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#a78bfa' : '#6366f1'};
  min-width: 110px;
  max-width: 110px;
  font-size: 0.85rem;
  flex-shrink: 0;
  
  @media (max-width: 700px) {
    min-width: auto;
    max-width: none;
    font-size: 0.8rem;
    flex: 1;
  }
`;

const HomeworkText = styled.span`
  flex: 1;
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#e2e8f0' : '#1e293b'};
  font-size: 0.85rem;
  line-height: 1.6;
  word-wrap: break-word;
  min-width: 0;
  
  @media (max-width: 700px) {
    font-size: 0.8rem;
    line-height: 1.5;
    width: 100%;
    flex: none;
  }
`;

const HomeworkTeacher = styled.span`
  font-weight: 500;
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#94a3b8' : '#64748b'};
  font-size: 0.8rem;
  min-width: 100px;
  text-align: right;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
  
  @media (max-width: 700px) {
    min-width: auto;
    text-align: right;
    justify-content: flex-end;
    font-size: 0.75rem;
    flex-shrink: 0;
  }
`;

const NoHomeworkData = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  min-height: 120px;
`;

const FineStatsRow = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2.5rem;
  margin: 16px 0 0 0;
  font-size: 1.08rem;
  font-weight: 600;
  color: #a0a7b8;
  & .stat {
    display: flex;
    align-items: center;
    gap: 0.4em;
  }
  & .total { color: #6366f1; }
  & .amount { color: #22c55e; }
  & .avg { color: #f59e0b; }
  & .remission { color: #ec4899; }
  @media (max-width: 600px) {
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 1rem;
    font-size: 0.85rem;
    margin: 10px 0 0 0;
    align-items: center;
    overflow-x: auto;
    white-space: nowrap;
  }
`;

// Delete Confirmation Modal Components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
  margin: 0;
  padding: 0;
  overflow: hidden;
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#ffffff'};
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 320px;
  width: 90%;
  max-height: 90vh;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid ${({ theme }) => theme.BORDER};
  position: relative;
  animation: modalSlideIn 0.3s ease-out;
  margin: auto;
  overflow-y: auto;
  
  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const ModalIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
  font-size: 1.2rem;
`;

const ModalTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
`;

const ModalMessage = styled.p`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.9rem;
  line-height: 1.4;
  margin: 0 0 1rem 0;
`;

const StudentInfoCard = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(35,42,59,0.3)' : 'rgba(239,68,68,0.05)'};
  border: 1px solid ${({ theme }) => theme.BG === '#252525' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)'};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
`;

const StudentName = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 0.5rem;
`;

const StudentDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
`;

const DetailLabel = styled.span`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const DetailValue = styled.span<{ highlight?: boolean }>`
  color: ${({ theme, highlight }) => highlight ? '#22c55e' : theme.TEXT_PRIMARY};
  font-weight: ${({ highlight }) => highlight ? '700' : '600'};
`;

const ModalActions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

const ModalButton = styled.button<{ variant: 'cancel' | 'delete' }>`
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  min-width: 80px;
  
  ${({ variant, theme }) => variant === 'cancel' ? `
    background: ${theme.BG === '#252525' ? '#353b4a' : '#f1f5f9'};
    color: ${theme.TEXT_PRIMARY};
    border: 1px solid ${theme.BG === '#252525' ? '#4a5568' : '#e2e8f0'};
    
    &:hover {
      background: ${theme.BG === '#252525' ? '#4a5568' : '#e2e8f0'};
    }
  ` : `
    background: #ef4444;
    color: white;
    
    &:hover {
      background: #dc2626;
      transform: translateY(-1px);
    }
    
    &:active {
      transform: translateY(0);
    }
  `}
`;

// Helper function to compare class names numerically
const compareClassNames = (a: string, b: string): number => {
  // Extract numbers from class names (e.g., "Class 1", "1st", "10th", etc.)
  const getClassNumber = (className: string): number => {
    const match = className.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };
  
  const numA = getClassNumber(a);
  const numB = getClassNumber(b);
  
  // If both have numbers, compare numerically
  if (numA !== 0 && numB !== 0) {
    return numA - numB;
  }
  
  // If only one has a number, prioritize it
  if (numA !== 0) return -1;
  if (numB !== 0) return 1;
  
  // If neither has numbers, compare alphabetically
  return a.localeCompare(b);
};

const Dashboard: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [studentClassHistory, setStudentClassHistory] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<any[]>([]);
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);
  const [exportAbsentLoading, setExportAbsentLoading] = useState(false);
  const [exportPresentLoading, setExportPresentLoading] = useState(false);
  const [hasAnyStudents, setHasAnyStudents] = useState<boolean | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  const [initialLoad, setInitialLoad] = useState(true); // Track if this is the first load
  
  // Consolidated loading state that tracks all data checks
  const [allDataLoaded, setAllDataLoaded] = useState(false);
  const theme = useTheme();
  const isDark = (theme as any).BG === '#252525' || (theme as any).BG === '#181c2a';
  const [absentDate, setAbsentDate] = useState(() => new Date().toISOString().slice(0,10));
  const [absentees, setAbsentees] = useState<any[]>([]);
  const [studentDetails, setStudentDetails] = useState<Record<string, any>>({});
  const [dropdownIdx, setDropdownIdx] = useState<number | null>(null);
  const [dropdownDirection, setDropdownDirection] = useState<'up' | 'down'>('up');
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const toast = useToast();
  const navigate = useNavigate();
  const [dateInputRef, setDateInputRef] = useState<HTMLInputElement | null>(null);
  const [hoveredAvatar, setHoveredAvatar] = useState<{ url: string; x: number; y: number } | null>(null);
  const savePdf = useCapacitorPdfSave();
  const { user } = useAuth();
  const { setLoading, loading } = useLoading();
  const { startProgress, completeProgress, setProgress } = useProgress();
  const progressActiveRef = useRef(false); // Track if progress is already active
  const dataLoadedRef = useRef(false); // Track if data has been loaded
  const [isStrengthExpanded, setIsStrengthExpanded] = useExpandedState('dashboard_strength_expanded');
  const [isAbsenteesExpanded, setIsAbsenteesExpanded] = useExpandedState('dashboard_absentees_expanded');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLButtonElement>(null);
  const { setPageHeader } = React.useContext(PageHeaderContext);
  const [schoolName, setSchoolName] = useState<string>('');
  const [todayCollectedFine, setTodayCollectedFine] = useState<number>(0);
  const [fineDate, setFineDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fineDetails, setFineDetails] = useState<any[]>([]);
  const [isFineExpanded, setIsFineExpanded] = useExpandedState('dashboard_fine_expanded');
  
  // Homework Diary state
  const [homeworkDiaryData, setHomeworkDiaryData] = useState<any[]>([]);
  const [isHomeworkExpanded, setIsHomeworkExpanded] = useExpandedState('dashboard_homework_expanded');
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fineToDelete, setFineToDelete] = useState<{ 
    id: string; 
    studentName: string; 
    studentId: string;
    className: string;
    amount: number;
    date: string;
  } | null>(null);
  
  // WhatsApp notification modal state
  const [showWhatsAppSender, setShowWhatsAppSender] = useState(false);
  const [whatsappNotificationData, setWhatsappNotificationData] = useState<AttendanceNotificationData[]>([]);
  const [whatsappProcessing, setWhatsappProcessing] = useState(false);
  
  // Render settings for guest users
  const [renderSettings, setRenderSettings] = useState<RenderSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Helper functions for class and section names
  const getClassName = (classId: any) => classes.find((c: any) => String(c.id) === String(classId))?.name || '-';
  const getSectionName = (sectionId: any) => sections.find((s: any) => String(s.id) === String(sectionId))?.name || '';

  // Show delete confirmation modal
  const showDeleteConfirmation = (fine: any) => {
    const student = fine.students;
    const classLabel = `${getClassName(student.class_id)}${getSectionName(student.section_id) ? ' (' + getSectionName(student.section_id) + ')' : ''}`;
    const date = new Date(fine.created_at).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    
    setFineToDelete({ 
      id: fine.id, 
      studentName: student.name,
      studentId: String(getStudentDisplayId(student)),
      className: classLabel,
      amount: Number(fine.amount),
      date: date
    });
    setShowDeleteModal(true);
  };

  // Delete fine payment function
  const handleDeleteFine = async () => {
    if (!user?.school_id || !fineToDelete) {
      toast.showToast('User school information not found', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('fine_payments')
        .delete()
        .eq('id', fineToDelete.id)
        .eq('school_id', user.school_id);

      if (error) {
        toast.showToast('Failed to delete fine payment', 'error');
        return;
      }

      toast.showToast('Fine payment deleted successfully', 'success');
      
      // Close modal
      setShowDeleteModal(false);
      setFineToDelete(null);
      
      // Refresh the fine details
      const fetchFineDetails = async () => {
        try {
          const { data: fineData, error: fineError } = await supabase
            .from('fine_payments')
            .select(`
              id,
              student_id,
              amount,
              remission,
              created_at,
              students!inner(
                id,
                name,
                father_name,
                class_id,
                section_id,
                picture_url
              )
            `)
            .eq('school_id', user.school_id)
            .gte('created_at', `${fineDate}T00:00:00`)
            .lte('created_at', `${fineDate}T23:59:59`)
            .order('created_at', { ascending: false });

          if (!fineError && fineData) {
            const totalCollected = fineData.reduce((sum, payment) => {
              return sum + (Number(payment.amount) || 0);
            }, 0);
            setTodayCollectedFine(totalCollected);
            setFineDetails(fineData);
          } else {
            setTodayCollectedFine(0);
            setFineDetails([]);
          }
        } catch (error) {
          // Error refreshing fine details
        }
      };

      fetchFineDetails();
    } catch (error) {
      toast.showToast('Failed to delete fine payment', 'error');
    }
  };

  // Cancel delete operation
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setFineToDelete(null);
  };

  // Handle keyboard events for delete confirmation modal
  useEffect(() => {
    if (!showDeleteModal) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleDeleteFine();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelDelete();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteModal]);
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 700);
  const isCapacitor = !!(window as any).Capacitor && !!(window as any).Capacitor.isNativePlatform && (window as any).Capacitor.isNativePlatform();
  const isElectron = !!(window as any).electron || (typeof window !== 'undefined' && (window as any).process?.type === 'renderer');

  // Update mobile detection on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 700);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch school name and set page header
  useEffect(() => {
    const fetchSchoolName = async () => {
      if (!user?.school_id) return;
      
      try {
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('name')
          .eq('id', user.school_id)
          .single();

        if (!schoolError && schoolData) {
          setSchoolName(schoolData.name);
          setPageHeader(`${schoolData.name} - Dashboard`);
        }
      } catch (error) {
        setPageHeader('Dashboard');
      }
    };

    fetchSchoolName();
  }, [user?.school_id, setPageHeader]);

  // Fetch render settings if user is a guest
  useEffect(() => {
    if (user?.role === 'Guest' && user?.school_id) {
      setSettingsLoading(true);
      fetchRenderSettings(user.school_id)
        .then(settings => {
          setRenderSettings(settings);
        })
        .catch(error => {
          // Error fetching render settings for guest
        })
        .finally(() => {
          setSettingsLoading(false);
        });
    }
  }, [user]);

  // Fetch fine details for selected date
  useEffect(() => {
    const fetchFineDetails = async () => {
      if (!user?.school_id) return;
      
      try {
        
        // First, let's check what fine payments exist for this school
        const { data: allFines, error: allFinesError } = await supabase
          .from('fine_payments')
          .select('*')
          .eq('school_id', user.school_id)
          .limit(10);
        
        
        // Now get the specific date data - use created_at instead of date
        const { data: fineData, error: fineError } = await supabase
          .from('fine_payments')
          .select(`
            id,
            student_id,
            amount,
            remission,
            created_at,
            students!inner(
              id,
              name,
              father_name,
              class_id,
              section_id,
              picture_url
            )
          `)
          .eq('school_id', user.school_id)
          .gte('created_at', `${fineDate}T00:00:00`)
          .lte('created_at', `${fineDate}T23:59:59`)
          .order('created_at', { ascending: false });


        if (!fineError && fineData) {
          const totalCollected = fineData.reduce((sum, payment) => {
            return sum + (Number(payment.amount) || 0);
          }, 0);
          setTodayCollectedFine(totalCollected);
          setFineDetails(fineData);
        } else {
          // If no data for specific date, try different approaches
          
          // Try to get all fine payments for this school to see what dates exist
          const { data: allPayments, error: allPaymentsError } = await supabase
            .from('fine_payments')
            .select('id, amount, created_at')
            .eq('school_id', user.school_id)
            .order('created_at', { ascending: false })
            .limit(20);
          
          // Try to find payments that might match the date (in case of timezone issues)
          if (allPayments && allPayments.length > 0) {
            const matchingPayments = allPayments.filter(payment => {
              const paymentCreatedDate = new Date(payment.created_at).toISOString().slice(0, 10);
              return paymentCreatedDate === fineDate;
            });
            
            if (matchingPayments.length > 0) {
              // Get full details for matching payments
              const paymentIds = matchingPayments.map(p => p.id || p.created_at);
              const { data: matchingDetails, error: matchingError } = await supabase
                .from('fine_payments')
                .select(`
                  id,
                  student_id,
                  amount,
                  remission,
                  created_at,
                  students!inner(
                    id,
                    name,
                    father_name,
                    class_id,
                    section_id,
                    picture_url
                  )
                `)
                .eq('school_id', user.school_id)
                .in('id', paymentIds);
              
              if (!matchingError && matchingDetails) {
                const totalCollected = matchingDetails.reduce((sum, payment) => {
                  return sum + (Number(payment.amount) || 0);
                }, 0);
                setTodayCollectedFine(totalCollected);
                setFineDetails(matchingDetails);
              }
            } else {
              // If still no data, try to get the most recent fine payments
              const { data: recentPayments, error: recentError } = await supabase
                .from('fine_payments')
                .select(`
                  id,
                  student_id,
                  amount,
                  remission,
                  created_at,
                  students!inner(
                    id,
                    name,
                    father_name,
                    class_id,
                    section_id,
                    picture_url
                  )
                `)
                .eq('school_id', user.school_id)
                .order('created_at', { ascending: false })
                .limit(10);
              
              
              if (!recentError && recentPayments && recentPayments.length > 0) {
                const totalCollected = recentPayments.reduce((sum, payment) => {
                  return sum + (Number(payment.amount) || 0);
                }, 0);
                setTodayCollectedFine(totalCollected);
                setFineDetails(recentPayments);
              }
            }
          }
        }
      } catch (error) {
        // Error fetching fine details
      }
    };

    fetchFineDetails();
  }, [user?.school_id, fineDate]);

  // Fetch homework diary for today
  useEffect(() => {
    const fetchHomeworkDiary = async () => {
      if (!user?.school_id) return;
      
      try {
        const today = new Date().toISOString().slice(0, 10);
        const { data, error } = await supabase
          .from('homework_diary')
          .select(`
            id,
            class_id,
            section_id,
            subject_id,
            homework_text,
            homework_date,
            assigned_by,
            classes:class_id(id, name),
            sections:section_id(id, name),
            subjects:subject_id(id, name),
            assigned_by_user:users!assigned_by(id, name)
          `)
          .eq('homework_date', today)
          .eq('school_id', user.school_id)
          .order('class_id', { ascending: true })
          .order('section_id', { ascending: true, nullsFirst: true })
          .order('subject_id', { ascending: true, nullsFirst: true });
        
        if (error) {
          return;
        }
        
        // Process and normalize the data - handle both created_by_user and assigned_by_user
        const processedData = (data || []).map((item: any) => ({
          ...item,
          users: item.assigned_by_user || item.created_by_user || null
        }));
        
        setHomeworkDiaryData(processedData);
      } catch (error) {
        // Error fetching homework diary
      }
    };
    
    fetchHomeworkDiary();
  }, [user?.school_id]);

  // Handle clicking outside the export dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    };

    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown]);

  // Consolidated dashboard visibility logic is now handled in the render section

  // Check if there are any students in the system for the active session
  const checkForAnyStudents = async () => {
    if (!user?.school_id || !sessionData?.id) return false;
    
    try {
      // First check student_class_history for the active session
      const { data: schData, error: schError } = await supabase
        .from('student_class_history')
        .select('student_id')
        .eq('session_id', sessionData.id)
        .eq('school_id', user.school_id);
      
      if (!schError && schData && schData.length > 0) {
        // Now check if any of these students are active
        const studentIds = schData.map(sch => sch.student_id);
        if (studentIds.length === 0) {
          setHasAnyStudents(false);
          return false;
        }
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id')
          .eq('school_id', user.school_id)
          .eq('status', 'active')
          .in('id', studentIds)
          .limit(1);
        if (!studentsError && studentsData && studentsData.length > 0) {
          setHasAnyStudents(true);
          return true;
        } else {
          setHasAnyStudents(false);
          return false;
        }
      }
      
      // Fallback: check students table for any active students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .limit(1);
      if (!studentsError && studentsData && studentsData.length > 0) {
        setHasAnyStudents(true);
        return true;
      } else {
        setHasAnyStudents(false);
        return false;
      }
    } catch (error) {
      setHasAnyStudents(false);
      return false;
    }
  };

  const fetchAll = useCallback(async () => {
      if (!user?.school_id) {
        toast.showToast('User school information not found', 'error');
        return;
      }
      
      // Prevent multiple simultaneous calls using ref only
      if (progressActiveRef.current) {
        return;
      }
      
      const minDuration = 2000; // 2 seconds
      const start = Date.now();
      setLoading(true);
      progressActiveRef.current = true; // Mark progress as active
      
      // Start determinate progress - same as StudentList
      startProgress(false);
      setProgress(10);
      
      const today = new Date().toISOString().slice(0, 10);
      
      setProgress(20);
      const { data: sessionDataResult, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
      .maybeSingle();
      
    if (sessionError && !isNoSessionError(sessionError)) {
        toast.showToast('Failed to fetch active session', 'error');
        setAllDataLoaded(true);
        const elapsed = Date.now() - start;
        if (elapsed < minDuration) {
          setTimeout(() => {
            setLoading(false);
            completeProgress();
            progressActiveRef.current = false; // Reset progress flag
          }, minDuration - elapsed);
        } else {
          setLoading(false);
          completeProgress();
          progressActiveRef.current = false; // Reset progress flag
        }
        return;
      }
      if (!sessionDataResult?.id) {
        setSessionData(null);
        setHasActiveSession(false);
        setAllDataLoaded(true);
        const elapsed = Date.now() - start;
        if (elapsed < minDuration) {
          setTimeout(() => {
            setLoading(false);
            completeProgress();
            progressActiveRef.current = false; // Reset progress flag
          }, minDuration - elapsed);
        } else {
          setLoading(false);
          completeProgress();
          progressActiveRef.current = false; // Reset progress flag
        }
        return;
      }
      
      setProgress(30);
      setSessionData(sessionDataResult);
      setHasActiveSession(true);
      
      // First fetch students from student_class_history for the active session
      setProgress(40);
      const { data: schData, error: schError } = await supabase
        .from('student_class_history')
        .select('student_id')
        .eq('session_id', sessionDataResult.id)
        .eq('school_id', user.school_id);

      if (schError || !schData) {
        setStudents([]);
        setClasses([]);
        setSections([]);
        setAttendanceToday([]);
        setAllDataLoaded(true);
        const elapsed = Date.now() - start;
        if (elapsed < minDuration) {
          setTimeout(() => {
            setLoading(false);
            completeProgress();
            progressActiveRef.current = false; // Reset progress flag
          }, minDuration - elapsed);
        } else {
          setLoading(false);
          completeProgress();
          progressActiveRef.current = false; // Reset progress flag
        }
        return;
      }

      if (schData.length === 0) {
        setStudents([]);
        setClasses([]);
        setSections([]);
        setAttendanceToday([]);
        // Check if there are any students at all in the system
        await checkForAnyStudents();
        setLoadingStudents(false);
        setAllDataLoaded(true);
        const elapsed = Date.now() - start;
        if (elapsed < minDuration) {
          setTimeout(() => {
            setLoading(false);
            completeProgress();
            progressActiveRef.current = false; // Reset progress flag
          }, minDuration - elapsed);
        } else {
          setLoading(false);
          completeProgress();
          progressActiveRef.current = false; // Reset progress flag
        }
        return;
      }

      // Get student IDs from student_class_history
      const studentIds = schData.map(sch => sch.student_id);

      setProgress(60);
      // Fetch student details for those enrolled in the current session and are 'active'
      const [{ data: studentsData }, { data: classesData }, { data: sectionsData }, { data: attendanceData }] = await Promise.all([
        supabase.from('students').select('id, name, father_name, gender, status, class_id, section_id').eq('school_id', user.school_id).eq('status', 'active').in('id', studentIds),
        supabase.from('classes').select('id, name').eq('school_id', user.school_id),
        supabase.from('sections').select('id, name').eq('school_id', user.school_id),
        supabase.from('attendance_records')
          .select('student_id, status, date')
          .eq('date', today)
          .eq('session_id', sessionDataResult.id)
          .eq('school_id', user.school_id),
      ]);
      
      setProgress(80);
      setStudents(studentsData || []);
      setStudentClassHistory(schData || []);
      setClasses(classesData || []);
      setSections(sectionsData || []);
      setAttendanceToday(attendanceData || []);
      
      // Now check if there are any students in the system
      setProgress(90);
      await checkForAnyStudents();
      setLoadingStudents(false);
      
      setProgress(100);
      // Mark initial load as complete and all data loaded
      setInitialLoad(false);
      setAllDataLoaded(true);
      
      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => {
          setLoading(false);
          completeProgress();
          progressActiveRef.current = false; // Reset progress flag
        }, minDuration - elapsed);
      } else {
        setLoading(false);
        completeProgress();
        progressActiveRef.current = false; // Reset progress flag
      }
  }, [user?.school_id, toast, setLoading]); // Removed loading from dependencies to fix circular dependency

  useEffect(() => {
    // Only fetch on initial load, not on every status update
    if (user?.school_id && !dataLoadedRef.current) {
      dataLoadedRef.current = true;
      fetchAll();
    }
  }, [user?.school_id]);

  // Cleanup effect to reset progress flag on unmount
  useEffect(() => {
    return () => {
      progressActiveRef.current = false;
    };
  }, []);

  // Fetch absentees for selected date
  useEffect(() => {
    const fetchAbsentees = async () => {
      if (!absentDate || !user?.school_id) return; // Removed loading check to prevent circular dependency

      try {
        // First get the active session for this school
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('id')
          .eq('is_active', true)
          .eq('school_id', user.school_id)
          .single();

        if (sessionError && !isNoSessionError(sessionError)) {
          toast.showToast('Failed to fetch active session', 'error');
          return;
        }

        if (!sessionData?.id) {
          setStudentDetails({});
          setAbsentees([]);
          return;
        }

        // First get attendance records for the date
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance_records')
          .select(`
            id,
            student_id,
            status,
            remarks,
            date,
            class_id,
            section_id
          `)
          .eq('date', absentDate)
          .eq('session_id', sessionData.id)
          .eq('school_id', user.school_id)
          .or('status.eq.absent,status.eq.leave'); // Fetch both absent and leave records

        if (attendanceError) {
          throw attendanceError;
        }


        // Get unique student IDs
        const studentIds = attendanceData
          .map(record => record.student_id)
          .filter((id, index, self) => id && self.indexOf(id) === index);

        if (studentIds.length === 0) {
          setStudentDetails({});
          setAbsentees([]);
          return;
        }

        // Fetch student details for these IDs
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select(`
            id,
            name,
            father_name,
            picture_url,
            class_id,
            section_id,
            classes (
              id,
              name
            ),
            sections (
              id,
              name
            )
          `)
          .in('id', studentIds)
          .eq('school_id', user.school_id);

        if (studentsError) {
          throw studentsError;
        }


        // Get attendance statistics for each student
        const monthStart = format(startOfMonth(parseISO(absentDate)), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(parseISO(absentDate)), 'yyyy-MM-dd');

        const { data: monthlyAttendance, error: monthlyError } = await supabase
          .from('attendance_records')
          .select('student_id, status, date')
          .in('student_id', studentIds)
          .gte('date', monthStart)
          .lte('date', monthEnd)
          .eq('school_id', user.school_id);

        if (monthlyError) {
          throw monthlyError;
        }

        // Calculate monthly statistics for each student
        const monthlyStats: Record<number, { absences: number; leaves: number; total: number }> = {};
        monthlyAttendance.forEach(record => {
          if (!monthlyStats[record.student_id]) {
            monthlyStats[record.student_id] = { absences: 0, leaves: 0, total: 0 };
          }
          monthlyStats[record.student_id].total++;
          if (record.status === 'absent') monthlyStats[record.student_id].absences++;
          if (record.status === 'leave') monthlyStats[record.student_id].leaves++;
        });

        // Create a map of student details with attendance stats
        const newStudentDetails: Record<string, any> = {};
        studentsData.forEach((student: any) => {
          const stats = monthlyStats[student.id] || { absences: 0, leaves: 0, total: 0 };
          const attendance_percentage = stats.total ? 
            Math.round(((stats.total - stats.absences - stats.leaves) / stats.total) * 100) : 100;

          newStudentDetails[student.id] = {
            ...student,
            class_name: student.classes?.name || 'Unknown Class',
            section_name: student.sections?.name || 'Unknown Section',
            monthly_absences: stats.absences,
            monthly_leaves: stats.leaves,
            attendance_percentage
          };
        });

        setStudentDetails(newStudentDetails);
        
        // Sort absentees by class and then by student name
        const sortedAbsentees = attendanceData.sort((a, b) => {
          const studentA = newStudentDetails[a.student_id];
          const studentB = newStudentDetails[b.student_id];
          
          if (!studentA || !studentB) return 0;
          
          // Sort by class name first (numeric), then by student name
          const classComparison = compareClassNames(studentA.class_name, studentB.class_name);
          if (classComparison !== 0) return classComparison;
          return studentA.name.localeCompare(studentB.name);
        });
        
        setAbsentees(sortedAbsentees);
      } catch (error) {
        toast.showToast('Failed to fetch absentees', 'error');
      }
    };

    fetchAbsentees();
  }, [absentDate, user?.school_id]); // Removed loading dependency to prevent circular dependency

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownIdx(null);
      }
    }
    if (dropdownIdx !== null) {
      document.addEventListener('mousedown', handleClick);
    } else {
      document.removeEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownIdx]);

  // --- Summary Stats ---
  const totalStudents = students.length;
  // Use attendanceData for selected absentDate (already fetched for absentees)
  const [attendanceDataForDate, setAttendanceDataForDate] = useState<any[]>([]);
  useEffect(() => {
    const fetchAttendanceForDate = async () => {
      if (!user?.school_id) return; // Removed loading check to prevent circular dependency
      
      const { data, error } = await supabase
        .from('attendance_records')
        .select('student_id, status, date')
        .eq('date', absentDate)
        .eq('school_id', user.school_id);
      setAttendanceDataForDate(data || []);
    };
    fetchAttendanceForDate();
  }, [absentDate, user?.school_id]); // Removed loading dependency to prevent circular dependency
  const presentToday = attendanceDataForDate.filter(a => a.status === 'present').length;
  const absentToday = attendanceDataForDate.filter(a => a.status === 'absent').length;
  const leaveToday = attendanceDataForDate.filter(a => a.status === 'leave').length;
  const lateToday = attendanceDataForDate.filter(a => a.status === 'late').length;
  const totalMarked = attendanceDataForDate.length;
  const presentPercent = totalMarked ? Math.round((presentToday / totalMarked) * 1000) / 10 : 0;
  const absentPercent = totalMarked ? Math.round((absentToday / totalMarked) * 1000) / 10 : 0;
  const leavePercent = totalMarked ? Math.round((leaveToday / totalMarked) * 1000) / 10 : 0;
  const latePercent = totalMarked ? Math.round((lateToday / totalMarked) * 1000) / 10 : 0;

  // --- Class-wise Strength from Class History (Active Session) ---
  const classStrengths = sortClasses(classes).map(cls => {
    // Get students enrolled in this class for the current session
    // The students data already contains only active students from the current session
    const classHistoryStudents = students.filter(s => {
      return s.status === 'active' && String(s.class_id) === String(cls.id);
    });

    const boys = classHistoryStudents.filter(s => s.gender?.toLowerCase() === 'male' || s.gender?.toLowerCase() === 'boy').length;
    const girls = classHistoryStudents.filter(s => s.gender?.toLowerCase() === 'female' || s.gender?.toLowerCase() === 'girl').length;

    return {
      name: cls.name,
      total: classHistoryStudents.length,
      boys,
      girls,
    };
  }).filter(cls => cls.total > 0);

  // Calculate totals directly from students data to ensure accuracy
  const totalStudentsFromHistory = classStrengths.reduce((sum, cls) => sum + cls.total, 0);
  const totalBoysFromHistory = students.filter(s => s.status === 'active' && (s.gender?.toLowerCase() === 'male' || s.gender?.toLowerCase() === 'boy')).length;
  const totalGirlsFromHistory = students.filter(s => s.status === 'active' && (s.gender?.toLowerCase() === 'female' || s.gender?.toLowerCase() === 'girl')).length;

  // PDF Export for all absentees for the selected date
  const exportAbsenteesPDF = async () => {
    if (!user?.school_id) {
      toast.showToast('User school information not found', 'error');
      return;
    }

    setExportAbsentLoading(true);
    try {
      // Check if it's a mobile device
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Show immediate feedback for mobile users
      if (isMobileDevice) {
        toast.showToast('Generating PDF for mobile... Please wait.', 'success');
      }
      // First get the active session for this school
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
        .single();

      if (sessionError && !isNoSessionError(sessionError)) {
        toast.showToast('Failed to fetch active session', 'error');
        return;
      }

      if (!sessionData?.id) {
        toast.showToast('No active session found', 'error');
        return;
      }

      // Fetch attendance records for absent and leave students
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance_records')
        .select(`
          id,
          student_id,
          status,
          remarks,
          date,
          class_id,
          section_id
        `)
      .eq('date', absentDate)
        .eq('session_id', sessionData.id)
        .eq('school_id', user.school_id)
        .or('status.eq.absent,status.eq.leave'); // Fetch both absent and leave records

      if (attendanceError) {
      toast.showToast('Failed to fetch absentees for export.', 'error');
      return;
    }

      if (!attendanceData || attendanceData.length === 0) {
      toast.showToast('No absentees to export.', 'error');
      return;
    }

      // Get unique student IDs
      const studentIds = attendanceData
        .map(record => record.student_id)
        .filter((id, index, self) => id && self.indexOf(id) === index);

      if (studentIds.length === 0) {
        toast.showToast('No absentees to export.', 'error');
        return;
      }

      // Fetch student details for these IDs
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          name,
          father_name,
          phone,
          class_id,
          section_id
        `)
        .in('id', studentIds)
        .eq('school_id', user.school_id);

      if (studentsError) {
        toast.showToast('Failed to fetch absentees details.', 'error');
        return;
      }

      // Fetch class and section details separately
      const classIds = studentsData.map(student => student.class_id).filter((id, index, self) => self.indexOf(id) === index);
      const sectionIds = studentsData.map(student => student.section_id).filter((id, index, self) => self.indexOf(id) === index);
      
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', classIds)
        .eq('school_id', user.school_id);

      if (classesError) {
        toast.showToast('Failed to fetch class details.', 'error');
        return;
      }

      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('id, name')
        .in('id', sectionIds)
        .eq('school_id', user.school_id);

      if (sectionsError) {
        toast.showToast('Failed to fetch section details.', 'error');
        return;
      }

      // Create maps for quick class and section lookup
      const classMap = new Map(classesData.map(cls => [cls.id, cls.name]));
      const sectionMap = new Map(sectionsData.map(sec => [sec.id, sec.name]));

      // Get attendance statistics for each student
      const monthStart = format(startOfMonth(parseISO(absentDate)), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(parseISO(absentDate)), 'yyyy-MM-dd');

      const { data: monthlyAttendance, error: monthlyError } = await supabase
        .from('attendance_records')
        .select('student_id, status, date')
        .in('student_id', studentIds)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .eq('school_id', user.school_id);

      if (monthlyError) {
      }

      // Combine data and calculate statistics
      const absentStudents = studentsData.map(student => {
        const attendanceRecord = attendanceData.find(record => record.student_id === student.id);
        const studentMonthlyAttendance = monthlyAttendance?.filter(a => a.student_id === student.id) || [];
        
        const totalDays = studentMonthlyAttendance.length;
        const absentDays = studentMonthlyAttendance.filter(a => a.status === 'absent' || a.status === 'leave').length;
        const attendancePercentage = totalDays > 0 ? ((totalDays - absentDays) / totalDays * 100).toFixed(1) : '100.0';

        return {
          id: student.id,
          name: student.name || '',
          father_name: student.father_name || '',
          phone: student.phone || '',
          class: `${classMap.get(student.class_id) || ''} (${sectionMap.get(student.section_id) || ''})`,
          class_name: classMap.get(student.class_id) || '',
          section_name: sectionMap.get(student.section_id) || '',
          status: attendanceRecord?.status || 'absent',
          monthly_absences: absentDays,
          attendance_percentage: attendancePercentage
        };
      }).sort((a, b) => {
        // Sort by class name first (numeric), then by student name
        const classComparison = compareClassNames(a.class_name, b.class_name);
        if (classComparison !== 0) return classComparison;
        return a.name.localeCompare(b.name);
      });

      // --- Fix summary counts: fetch complete attendance data for the date ---
      const { data: completeAttendanceData, error: completeAttendanceError } = await supabase
        .from('attendance_records')
        .select('student_id, status, date')
        .eq('date', absentDate)
        .eq('session_id', sessionData.id)
        .eq('school_id', user.school_id);

      if (completeAttendanceError) {
      }

      const presentCount = completeAttendanceData?.filter(a => a.status === 'present').length || 0;
      const absentCount = completeAttendanceData?.filter(a => a.status === 'absent').length || 0;
      const leaveCount = completeAttendanceData?.filter(a => a.status === 'leave').length || 0;
      const lateCount = completeAttendanceData?.filter(a => a.status === 'late').length || 0;
      const totalCount = completeAttendanceData?.length || 0;
    const attPercent = totalCount ? (((presentCount + lateCount) / totalCount) * 100).toFixed(1) : '0.0';
    // Create PDF
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Absent Students Report', 15, 18);
    doc.setFontSize(11);
    // Format date as dd-mm-yyyy for filename
    const [yyyy, mm, dd] = absentDate.split('-');
    const formattedDate = `${dd}-${mm}-${yyyy}`;
    doc.text(`Date: ${formattedDate}`, 15, 26);
    doc.setFontSize(10);
    // Total (Indigo)
    doc.setTextColor(99, 102, 241);
    doc.text(`Total: ${totalCount}`, 120, 18);
    // Present (Green)
    doc.setTextColor(34, 197, 94);
    doc.text(`Present: ${presentCount + lateCount}`, 120, 24);
    // Absent (Red)
    doc.setTextColor(239, 68, 68);
    doc.text(`Absent: ${absentCount}`, 170, 18);
    // Leave (Blue)
    doc.setTextColor(37, 99, 235);
    doc.text(`Leave: ${leaveCount}`, 170, 24);
    // Late (Yellow)
    doc.setTextColor(234, 179, 8);
    doc.text(`Late: ${lateCount}`, 120, 30);
    // Per% (Green/Yellow/Red based on value)
    let perColor: [number, number, number] = [34, 197, 94];
    const perVal = parseFloat(attPercent);
    if (perVal < 75) perColor = [239, 68, 68];
    else if (perVal < 85) perColor = [234, 179, 8];
    doc.setTextColor(...perColor);
    doc.text(`Per%: ${attPercent}%`, 170, 30);
    doc.setTextColor(0, 0, 0); // Reset to black
    autoTable(doc, {
      startY: 36,
      head: [['SNo', 'ID', 'Name', 'Father Name', 'Mobile', 'Class', 'Status', 'M.A', 'Att%']],
      body: absentStudents.map((student, idx) => [
        idx + 1,
        getStudentDisplayId(student),
        student.name,
        student.father_name,
        student.phone,
        student.class,
        student.status,
        student.monthly_absences,
        `${student.attendance_percentage}%`
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [99, 102, 241], // Indigo
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 2,
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 2,
        halign: 'center',
        textColor: [60, 60, 60],
        minCellHeight: 6,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      alternateRowStyles: { fillColor: [232, 240, 254] }, // Light pastel blue
      margin: { top: 36, left: 10, right: 10 },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' }, // SNo
        1: { cellWidth: 14, halign: 'center' }, // ID
        2: { cellWidth: 32, halign: 'left' }, // Name
        3: { cellWidth: 32, halign: 'left' }, // Father Name
      },
      didParseCell: function (data) {
        // Color status text
        if (data.column.index === 6) {
          if (data.cell.raw === 'Absent') data.cell.styles.textColor = [239, 68, 68]; // Red
          if (data.cell.raw === 'Leave') data.cell.styles.textColor = [37, 99, 235]; // Blue
        }
        // Color attendance %
        if (data.column.index === 8) {
          const percent = parseInt(String(data.cell.raw || '').replace('%', ''));
          if (percent < 75) data.cell.styles.textColor = [239, 68, 68]; // Red
          else if (percent < 85) data.cell.styles.textColor = [234, 179, 8]; // Yellow
          else data.cell.styles.textColor = [34, 197, 94]; // Green
        }
      },
    });
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Generated on: ${new Date().toLocaleString()}`,
      10,
      doc.internal.pageSize.height - 10
    );
    const isCapacitor = !!(window as any).Capacitor && !!(window as any).Capacitor.isNativePlatform && (window as any).Capacitor.isNativePlatform();
    const isElectron = !!(window as any).electron || (typeof window !== 'undefined' && (window as any).process?.type === 'renderer');
    if (isCapacitor) {
      const pdfBlob = doc.output('blob');
      await savePdf(pdfBlob, `Absent Students (${formattedDate}).pdf`, true);
      // Optionally show a toast or message here for mobile
    } else if (isElectron) {
      let electron;
      try {
        electron = (window as any).electron || (window as any).require && (window as any).require('electron');
      } catch (e) { electron = null; }
      if (electron && electron.remote && electron.remote.dialog && electron.remote.app) {
        const path = electron.remote.require('path');
        const documentsPath = electron.remote.app.getPath('documents');
        const defaultFilePath = path.join(documentsPath, `Absent Students (${formattedDate}).pdf`);
        const { filePath } = await electron.remote.dialog.showSaveDialog({
          title: 'Save Absent Students Report',
          defaultPath: defaultFilePath,
          filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
        });
        if (filePath) {
          const pdfBuffer = doc.output('arraybuffer');
          const fs = electron.remote.require('fs');
          fs.writeFileSync(filePath, Buffer.from(pdfBuffer));
          alert(`PDF saved successfully to: ${filePath}`);
        }
    } else {
        // Format date as dd-mmm-yyyy for filename
        const formatDateForFileName = (date: Date) => {
          const day = date.getDate().toString().padStart(2, '0');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const month = months[date.getMonth()];
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        };

        const fileName = `Absent Students (${formatDateForFileName(new Date())}).pdf`;
        
        if (isMobileDevice) {
          // For mobile devices, use Capacitor Filesystem API approach
          try {
            // Generate PDF as base64 string
            const pdfBase64 = doc.output('datauristring').split(',')[1];
            
            // Create unique filename with timestamp to prevent overwriting
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const mobileFileName = `absent-students-${timestamp}.pdf`;

            // Check if Capacitor is available (for mobile apps)
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
              try {
                // Write PDF to documents directory
                await window.Capacitor.Plugins.Filesystem.writeFile({
                  path: mobileFileName,
                  data: pdfBase64,
                  directory: 'DOCUMENTS'
                });

                // Get the file URI
                const uriResult = await window.Capacitor.Plugins.Filesystem.getUri({
                  path: mobileFileName,
                  directory: 'DOCUMENTS'
                });

                // Show success message and trigger native Android "Open with" dialog
                toast.showToast(`PDF saved successfully as ${mobileFileName}`, 'success');
                
                // Trigger native Android "Open with" dialog by opening the file URI
                // This will show the native Android app chooser dialog
                window.open(uriResult.uri, '_blank');
                
              } catch (fsError) {
                // If filesystem fails, fallback to regular download
                doc.save(mobileFileName);
                toast.showToast('PDF downloaded successfully!', 'success');
              }
            } else {
              // Fallback for web browsers - use the blob approach
              try {
                const pdfBlob = doc.output('blob');
                const url = URL.createObjectURL(pdfBlob);
                
                // Create a visible download button for mobile
                const downloadContainer = document.createElement('div');
                downloadContainer.style.cssText = `
                  position: fixed;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  background: white;
                  border: 2px solid #4a6cf7;
                  border-radius: 12px;
                  padding: 20px;
                  z-index: 10000;
                  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                  text-align: center;
                  max-width: 90vw;
                `;
                
                downloadContainer.innerHTML = `
                  <h3 style="margin: 0 0 15px 0; color: #4a6cf7;">PDF Ready for Download</h3>
                  <p style="margin: 0 0 15px 0; color: #666;">Absent Students Report</p>
                  <a href="${url}" download="${fileName}" 
                     style="display: inline-block; background: #4a6cf7; color: white; padding: 12px 24px; 
                            text-decoration: none; border-radius: 8px; font-weight: bold; margin: 5px;">
                    📄 Download PDF
                  </a>
                  <br>
                  <button onclick="this.parentElement.remove()" 
                          style="background: #ef4444; color: white; border: none; padding: 8px 16px; 
                                 border-radius: 6px; margin-top: 10px; cursor: pointer;">
                    Close
                  </button>
                `;
                
                document.body.appendChild(downloadContainer);
                
                // Auto-remove after 30 seconds
                setTimeout(() => {
                  if (downloadContainer.parentElement) {
                    downloadContainer.remove();
                  }
                  URL.revokeObjectURL(url);
                }, 30000);
                
                toast.showToast(`PDF ready! Click the download button that appeared on screen.`, 'success');
                
              } catch (webError) {
                
                // Final fallback: Open PDF in new tab with data URI
                const pdfDataUri = doc.output('datauristring');
                const newWindow = window.open('', '_blank');
                if (newWindow) {
                  newWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>Absent Students PDF</title>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                          .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                          .header { text-align: center; margin-bottom: 20px; }
                          .download-btn { display: inline-block; background: #4a6cf7; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px; }
                          .download-btn:hover { background: #3a5ce5; }
                          iframe { width: 100%; height: 600px; border: none; border-radius: 8px; }
                        </style>
                      </head>
                      <body>
                        <div class="container">
                          <div class="header">
                            <h2>📄 Absent Students PDF Generated</h2>
                            <p>If the PDF doesn't open automatically, use the download button below:</p>
                          </div>
                          <div style="text-align: center;">
                            <a href="${pdfDataUri}" download="${fileName}" class="download-btn">
                              📥 Download PDF File
                            </a>
                          </div>
                          <iframe src="${pdfDataUri}"></iframe>
                        </div>
                      </body>
                    </html>
                  `);
                  newWindow.document.close();
                  toast.showToast(`PDF opened in new tab. Use the download button in the new tab.`, 'success');
                } else {
                  toast.showToast('Please allow popups for this site to download the PDF', 'error');
                }
              }
            }
          } catch (error) {
            toast.showToast('Failed to export PDF on mobile. Please try on desktop.', 'error');
          }
        } else {
          // For desktop, use the standard approach
          doc.save(fileName);
          toast.showToast('Absent students PDF generated successfully', 'success');
        }
      }
    } else {
      // Web: just trigger download, do not show any alert or message
      // Format date as dd-mmm-yyyy for filename
      const formatDateForFileName = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      };

      const fileName = `Absent Students (${formatDateForFileName(new Date())}).pdf`;
      
      if (isMobileDevice) {
        // For mobile devices, use Capacitor Filesystem API approach
        try {
          // Generate PDF as base64 string
          const pdfBase64 = doc.output('datauristring').split(',')[1];
          
          // Create unique filename with timestamp to prevent overwriting
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const mobileFileName = `absent-students-${timestamp}.pdf`;

          // Check if Capacitor is available (for mobile apps)
          if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
            try {
              // Write PDF to documents directory
              await window.Capacitor.Plugins.Filesystem.writeFile({
                path: mobileFileName,
                data: pdfBase64,
                directory: 'DOCUMENTS'
              });

              // Get the file URI
              const uriResult = await window.Capacitor.Plugins.Filesystem.getUri({
                path: mobileFileName,
                directory: 'DOCUMENTS'
              });

              // Show success message and trigger native Android "Open with" dialog
              toast.showToast(`PDF saved successfully as ${mobileFileName}`, 'success');
              
              // Trigger native Android "Open with" dialog by opening the file URI
              // This will show the native Android app chooser dialog
              window.open(uriResult.uri, '_blank');
              
            } catch (fsError) {
              // If filesystem fails, fallback to regular download
              doc.save(mobileFileName);
              toast.showToast('PDF downloaded successfully!', 'success');
            }
          } else {
            // Fallback for web browsers - use the blob approach
            try {
              const pdfBlob = doc.output('blob');
              const url = URL.createObjectURL(pdfBlob);
              
              // Create a visible download button for mobile
              const downloadContainer = document.createElement('div');
              downloadContainer.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border: 2px solid #4a6cf7;
                border-radius: 12px;
                padding: 20px;
                z-index: 10000;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                text-align: center;
                max-width: 90vw;
              `;
              
              downloadContainer.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #4a6cf7;">PDF Ready for Download</h3>
                <p style="margin: 0 0 15px 0; color: #666;">Absent Students Report</p>
                <a href="${url}" download="${fileName}" 
                   style="display: inline-block; background: #4a6cf7; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 8px; font-weight: bold; margin: 5px;">
                  📄 Download PDF
                </a>
                <br>
                <button onclick="this.parentElement.remove()" 
                        style="background: #ef4444; color: white; border: none; padding: 8px 16px; 
                               border-radius: 6px; margin-top: 10px; cursor: pointer;">
                  Close
                </button>
              `;
              
              document.body.appendChild(downloadContainer);
              
              // Auto-remove after 30 seconds
              setTimeout(() => {
                if (downloadContainer.parentElement) {
                  downloadContainer.remove();
                }
                URL.revokeObjectURL(url);
              }, 30000);
              
              toast.showToast(`PDF ready! Click the download button that appeared on screen.`, 'success');
              
            } catch (webError) {
              
              // Final fallback: Open PDF in new tab with data URI
              const pdfDataUri = doc.output('datauristring');
              const newWindow = window.open('', '_blank');
              if (newWindow) {
                newWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Absent Students PDF</title>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <style>
                        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        .header { text-align: center; margin-bottom: 20px; }
                        .download-btn { display: inline-block; background: #4a6cf7; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px; }
                        .download-btn:hover { background: #3a5ce5; }
                        iframe { width: 100%; height: 600px; border: none; border-radius: 8px; }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <div class="header">
                          <h2>📄 Absent Students PDF Generated</h2>
                          <p>If the PDF doesn't open automatically, use the download button below:</p>
                        </div>
                        <div style="text-align: center;">
                          <a href="${pdfDataUri}" download="${fileName}" class="download-btn">
                            📥 Download PDF File
                          </a>
                        </div>
                        <iframe src="${pdfDataUri}"></iframe>
                      </div>
                    </body>
                  </html>
                `);
                newWindow.document.close();
                toast.showToast(`PDF opened in new tab. Use the download button in the new tab.`, 'success');
              } else {
                toast.showToast('Please allow popups for this site to download the PDF', 'error');
              }
            }
          }
        } catch (error) {
          toast.showToast('Failed to export PDF on mobile. Please try on desktop.', 'error');
        }
      } else {
        // For desktop, use the standard approach
        doc.save(fileName);
        toast.showToast('Absent students PDF generated successfully', 'success');
      }
    }
    } catch (error: any) {
      toast.showToast(error.message || 'Failed to export absent students', 'error');
    } finally {
      setExportAbsentLoading(false);
    }
  };

  const exportPresentStudentsPDF = async () => {
    if (!user?.school_id) {
      toast.showToast('User school information not found', 'error');
      return;
    }

    setExportPresentLoading(true);
    try{
      // Check if it's a mobile device
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Show immediate feedback for mobile users
      if (isMobileDevice) {
        toast.showToast('Generating PDF for mobile... Please wait.', 'success');
      }
      // First get the active session for this school
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
        .single();

      if (sessionError && !isNoSessionError(sessionError)) {
        toast.showToast('Failed to fetch active session', 'error');
        return;
      }

      if (!sessionData?.id) {
        toast.showToast('No active session found', 'error');
        return;
      }

      // Fetch attendance records for present and late students
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select(`
          id,
          student_id,
          status,
          remarks,
          date,
          class_id,
          section_id
        `)
        .eq('date', absentDate)
        .eq('session_id', sessionData.id)
        .eq('school_id', user.school_id)
        .or('status.eq.present,status.eq.late'); // Fetch both present and late records

      if (attendanceError) {
        toast.showToast('Failed to fetch present students for export.', 'error');
        return;
      }

      if (!attendanceData || attendanceData.length === 0) {
        toast.showToast('No present students to export.', 'error');
        return;
      }

      // Get unique student IDs
      const studentIds = attendanceData
        .map(record => record.student_id)
        .filter((id, index, self) => id && self.indexOf(id) === index);

      if (studentIds.length === 0) {
        toast.showToast('No present students to export.', 'error');
        return;
      }

      // Fetch student details for these IDs
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          name,
          father_name,
          phone,
          class_id,
          section_id
        `)
        .in('id', studentIds)
        .eq('school_id', user.school_id);

      if (studentsError) {
        toast.showToast('Failed to fetch present students details.', 'error');
        return;
      }

      // Fetch class and section details separately
      const classIds = studentsData.map(student => student.class_id).filter((id, index, self) => self.indexOf(id) === index);
      const sectionIds = studentsData.map(student => student.section_id).filter((id, index, self) => self.indexOf(id) === index);
      
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', classIds)
        .eq('school_id', user.school_id);

      if (classesError) {
        toast.showToast('Failed to fetch class details.', 'error');
        return;
      }

      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('id, name')
        .in('id', sectionIds)
        .eq('school_id', user.school_id);

      if (sectionsError) {
        toast.showToast('Failed to fetch section details.', 'error');
        return;
      }

      // Create maps for quick class and section lookup
      const classMap = new Map(classesData.map(cls => [cls.id, cls.name]));
      const sectionMap = new Map(sectionsData.map(sec => [sec.id, sec.name]));

      // Get attendance statistics for each student
      const monthStart = format(startOfMonth(parseISO(absentDate)), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(parseISO(absentDate)), 'yyyy-MM-dd');

      const { data: monthlyAttendance, error: monthlyError } = await supabase
        .from('attendance_records')
        .select('student_id, status, date')
        .in('student_id', studentIds)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .eq('school_id', user.school_id);

      if (monthlyError) {
      }

      // Combine data and calculate statistics
      const presentStudents = studentsData.map(student => {
        const attendanceRecord = attendanceData.find(record => record.student_id === student.id);
        const studentMonthlyAttendance = monthlyAttendance?.filter(a => a.student_id === student.id) || [];
        
        const totalDays = studentMonthlyAttendance.length;
        const absentDays = studentMonthlyAttendance.filter(a => a.status === 'absent' || a.status === 'leave').length;
        const attendancePercentage = totalDays > 0 ? ((totalDays - absentDays) / totalDays * 100).toFixed(1) : '100.0';

        return {
          id: student.id,
          name: student.name || '',
          father_name: student.father_name || '',
          phone: student.phone || '',
          class: `${classMap.get(student.class_id) || ''} (${sectionMap.get(student.section_id) || ''})`,
          class_name: classMap.get(student.class_id) || '',
          section_name: sectionMap.get(student.section_id) || '',
          status: attendanceRecord?.status || 'present',
          monthly_absences: absentDays,
          attendance_percentage: attendancePercentage
        };
      }).sort((a, b) => {
        // Sort by class name first (numeric), then by student name
        const classComparison = compareClassNames(a.class_name, b.class_name);
        if (classComparison !== 0) return classComparison;
        return a.name.localeCompare(b.name);
      });

    // --- Fix summary counts: fetch complete attendance data for the date ---
    const { data: completeAttendanceData, error: completeAttendanceError } = await supabase
      .from('attendance_records')
      .select('student_id, status, date')
      .eq('date', absentDate)
      .eq('session_id', sessionData.id)
      .eq('school_id', user.school_id);

    if (completeAttendanceError) {
    }

    const presentCount = completeAttendanceData?.filter(a => a.status === 'present').length || 0;
    const absentCount = completeAttendanceData?.filter(a => a.status === 'absent').length || 0;
    const leaveCount = completeAttendanceData?.filter(a => a.status === 'leave').length || 0;
    const lateCount = completeAttendanceData?.filter(a => a.status === 'late').length || 0;
    const totalCount = completeAttendanceData?.length || 0;
    const attPercent = totalCount ? (((presentCount + lateCount) / totalCount) * 100).toFixed(1) : '0.0';
    
    // Create PDF
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Present Students Report', 15, 18);
    doc.setFontSize(11);
    // Format date as dd-mm-yyyy for filename
    const [yyyy, mm, dd] = absentDate.split('-');
    const formattedDate = `${dd}-${mm}-${yyyy}`;
    doc.text(`Date: ${formattedDate}`, 15, 26);
    doc.setFontSize(10);
    // Total (Indigo)
    doc.setTextColor(99, 102, 241);
    doc.text(`Total: ${totalCount}`, 120, 18);
    // Present (Green)
    doc.setTextColor(34, 197, 94);
    doc.text(`Present: ${presentCount + lateCount}`, 120, 24);
    // Absent (Red)
    doc.setTextColor(239, 68, 68);
    doc.text(`Absent: ${absentCount}`, 170, 18);
    // Leave (Blue)
    doc.setTextColor(37, 99, 235);
    doc.text(`Leave: ${leaveCount}`, 170, 24);
    // Late (Yellow)
    doc.setTextColor(234, 179, 8);
    doc.text(`Late: ${lateCount}`, 120, 30);
    // Per% (Green/Yellow/Red based on value)
    let perColor: [number, number, number] = [34, 197, 94];
    const perVal = parseFloat(attPercent);
    if (perVal < 75) perColor = [239, 68, 68];
    else if (perVal < 85) perColor = [234, 179, 8];
    doc.setTextColor(...perColor);
    doc.text(`Per%: ${attPercent}%`, 170, 30);
    doc.setTextColor(0, 0, 0); // Reset to black
    autoTable(doc, {
      startY: 36,
      head: [['SNo', 'ID', 'Name', 'Father Name', 'Mobile', 'Class', 'Status', 'M.A', 'Att%']],
      body: presentStudents.map((student, idx) => [
        idx + 1,
        getStudentDisplayId(student),
        student.name,
        student.father_name,
        student.phone,
        student.class,
        student.status,
        student.monthly_absences,
        `${student.attendance_percentage}%`
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [99, 102, 241], // Indigo
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 2,
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 2,
        halign: 'center',
        textColor: [60, 60, 60],
        minCellHeight: 6,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      alternateRowStyles: { fillColor: [232, 240, 254] }, // Light pastel blue
      margin: { top: 36, left: 10, right: 10 },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' }, // SNo
        1: { cellWidth: 14, halign: 'center' }, // ID
        2: { cellWidth: 32, halign: 'left' }, // Name
        3: { cellWidth: 32, halign: 'left' }, // Father Name
      },
      didParseCell: function (data) {
        // Color status text
        if (data.column.index === 6) {
          if (data.cell.raw === 'Present') data.cell.styles.textColor = [34, 197, 94]; // Green
          if (data.cell.raw === 'Late') data.cell.styles.textColor = [234, 179, 8]; // Yellow
        }
        // Color attendance %
        if (data.column.index === 8) {
          const percent = parseInt(String(data.cell.raw || '').replace('%', ''));
          if (percent < 75) data.cell.styles.textColor = [239, 68, 68]; // Red
          else if (percent < 85) data.cell.styles.textColor = [234, 179, 8]; // Yellow
          else data.cell.styles.textColor = [34, 197, 94]; // Green
        }
      },
    });
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Generated on: ${new Date().toLocaleString()}`,
      10,
      doc.internal.pageSize.height - 10
    );
    const isCapacitor = !!(window as any).Capacitor && !!(window as any).Capacitor.isNativePlatform && (window as any).Capacitor.isNativePlatform();
    const isElectron = !!(window as any).electron || (typeof window !== 'undefined' && (window as any).process?.type === 'renderer');
    if (isCapacitor) {
      const pdfBlob = doc.output('blob');
      await savePdf(pdfBlob, `Present Students (${formattedDate}).pdf`, true);
      // Optionally show a toast or message here for mobile
    } else if (isElectron) {
      let electron;
      try {
        electron = (window as any).electron || (window as any).require && (window as any).require('electron');
      } catch (e) { electron = null; }
      if (electron && electron.remote && electron.remote.dialog && electron.remote.app) {
        const path = electron.remote.require('path');
        const documentsPath = electron.remote.app.getPath('documents');
        const defaultFilePath = path.join(documentsPath, `Present Students (${formattedDate}).pdf`);
        const { filePath } = await electron.remote.dialog.showSaveDialog({
          title: 'Save Present Students Report',
          defaultPath: defaultFilePath,
          filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
        });
        if (filePath) {
          const pdfBuffer = doc.output('arraybuffer');
          const fs = electron.remote.require('fs');
          fs.writeFileSync(filePath, Buffer.from(pdfBuffer));
          alert(`PDF saved successfully to: ${filePath}`);
        }
    } else {
        // Format date as dd-mmm-yyyy for filename
        const formatDateForFileName = (date: Date) => {
          const day = date.getDate().toString().padStart(2, '0');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const month = months[date.getMonth()];
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        };

        const fileName = `Present Students (${formatDateForFileName(new Date())}).pdf`;
        
        if (isMobileDevice) {
          // For mobile devices, use Capacitor Filesystem API approach
          try {
            // Generate PDF as base64 string
            const pdfBase64 = doc.output('datauristring').split(',')[1];
            
            // Create unique filename with timestamp to prevent overwriting
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const mobileFileName = `present-students-${timestamp}.pdf`;

            // Check if Capacitor is available (for mobile apps)
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
              try {
                // Write PDF to documents directory
                await window.Capacitor.Plugins.Filesystem.writeFile({
                  path: mobileFileName,
                  data: pdfBase64,
                  directory: 'DOCUMENTS'
                });

                // Get the file URI
                const uriResult = await window.Capacitor.Plugins.Filesystem.getUri({
                  path: mobileFileName,
                  directory: 'DOCUMENTS'
                });

                // Show success message and trigger native Android "Open with" dialog
                toast.showToast(`PDF saved successfully as ${mobileFileName}`, 'success');
                
                // Trigger native Android "Open with" dialog by opening the file URI
                // This will show the native Android app chooser dialog
                window.open(uriResult.uri, '_blank');
                
              } catch (fsError) {
                // If filesystem fails, fallback to regular download
                doc.save(mobileFileName);
                toast.showToast('PDF downloaded successfully!', 'success');
              }
            } else {
              // Fallback for web browsers - use the blob approach
              try {
                const pdfBlob = doc.output('blob');
                const url = URL.createObjectURL(pdfBlob);
                
                // Create a visible download button for mobile
                const downloadContainer = document.createElement('div');
                downloadContainer.style.cssText = `
                  position: fixed;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  background: white;
                  border: 2px solid #4a6cf7;
                  border-radius: 12px;
                  padding: 20px;
                  z-index: 10000;
                  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                  text-align: center;
                  max-width: 90vw;
                `;
                
                downloadContainer.innerHTML = `
                  <h3 style="margin: 0 0 15px 0; color: #4a6cf7;">PDF Ready for Download</h3>
                  <p style="margin: 0 0 15px 0; color: #666;">Present Students Report</p>
                  <a href="${url}" download="${fileName}" 
                     style="display: inline-block; background: #4a6cf7; color: white; padding: 12px 24px; 
                            text-decoration: none; border-radius: 8px; font-weight: bold; margin: 5px;">
                    📄 Download PDF
                  </a>
                  <br>
                  <button onclick="this.parentElement.remove()" 
                          style="background: #ef4444; color: white; border: none; padding: 8px 16px; 
                                 border-radius: 6px; margin-top: 10px; cursor: pointer;">
                    Close
                  </button>
                `;
                
                document.body.appendChild(downloadContainer);
                
                // Auto-remove after 30 seconds
                setTimeout(() => {
                  if (downloadContainer.parentElement) {
                    downloadContainer.remove();
                  }
                  URL.revokeObjectURL(url);
                }, 30000);
                
                toast.showToast(`PDF ready! Click the download button that appeared on screen.`, 'success');
                
              } catch (webError) {
                
                // Final fallback: Open PDF in new tab with data URI
                const pdfDataUri = doc.output('datauristring');
                const newWindow = window.open('', '_blank');
                if (newWindow) {
                  newWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>Present Students PDF</title>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                          .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                          .header { text-align: center; margin-bottom: 20px; }
                          .download-btn { display: inline-block; background: #4a6cf7; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px; }
                          .download-btn:hover { background: #3a5ce5; }
                          iframe { width: 100%; height: 600px; border: none; border-radius: 8px; }
                        </style>
                      </head>
                      <body>
                        <div class="container">
                          <div class="header">
                            <h2>📄 Present Students PDF Generated</h2>
                            <p>If the PDF doesn't open automatically, use the download button below:</p>
                          </div>
                          <div style="text-align: center;">
                            <a href="${pdfDataUri}" download="${fileName}" class="download-btn">
                              📥 Download PDF File
                            </a>
                          </div>
                          <iframe src="${pdfDataUri}"></iframe>
                        </div>
                      </body>
                    </html>
                  `);
                  newWindow.document.close();
                  toast.showToast(`PDF opened in new tab. Use the download button in the new tab.`, 'success');
                } else {
                  toast.showToast('Please allow popups for this site to download the PDF', 'error');
                }
              }
            }
          } catch (error) {
            toast.showToast('Failed to export PDF on mobile. Please try on desktop.', 'error');
          }
        } else {
          // For desktop, use the standard approach
          doc.save(fileName);
          toast.showToast('Present students PDF generated successfully', 'success');
        }
      }
    } else {
      // Web: just trigger download, do not show any alert or message
      // Format date as dd-mmm-yyyy for filename
      const formatDateForFileName = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      };

      const fileName = `Present Students (${formatDateForFileName(new Date())}).pdf`;
      
      if (isMobileDevice) {
        // For mobile devices, use Capacitor Filesystem API approach
        try {
          // Generate PDF as base64 string
          const pdfBase64 = doc.output('datauristring').split(',')[1];
          
          // Create unique filename with timestamp to prevent overwriting
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const mobileFileName = `present-students-${timestamp}.pdf`;

          // Check if Capacitor is available (for mobile apps)
          if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
            try {
              // Write PDF to documents directory
              await window.Capacitor.Plugins.Filesystem.writeFile({
                path: mobileFileName,
                data: pdfBase64,
                directory: 'DOCUMENTS'
              });

              // Get the file URI
              const uriResult = await window.Capacitor.Plugins.Filesystem.getUri({
                path: mobileFileName,
                directory: 'DOCUMENTS'
              });

              // Show success message and trigger native Android "Open with" dialog
              toast.showToast(`PDF saved successfully as ${mobileFileName}`, 'success');
              
              // Trigger native Android "Open with" dialog by opening the file URI
              // This will show the native Android app chooser dialog
              window.open(uriResult.uri, '_blank');
              
            } catch (fsError) {
              // If filesystem fails, fallback to regular download
              doc.save(mobileFileName);
              toast.showToast('PDF downloaded successfully!', 'success');
            }
          } else {
            // Fallback for web browsers - use the blob approach
            try {
              const pdfBlob = doc.output('blob');
              const url = URL.createObjectURL(pdfBlob);
              
              // Create a visible download button for mobile
              const downloadContainer = document.createElement('div');
              downloadContainer.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border: 2px solid #4a6cf7;
                border-radius: 12px;
                padding: 20px;
                z-index: 10000;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                text-align: center;
                max-width: 90vw;
              `;
              
              downloadContainer.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #4a6cf7;">PDF Ready for Download</h3>
                <p style="margin: 0 0 15px 0; color: #666;">Present Students Report</p>
                <a href="${url}" download="${fileName}" 
                   style="display: inline-block; background: #4a6cf7; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 8px; font-weight: bold; margin: 5px;">
                  📄 Download PDF
                </a>
                <br>
                <button onclick="this.parentElement.remove()" 
                        style="background: #ef4444; color: white; border: none; padding: 8px 16px; 
                               border-radius: 6px; margin-top: 10px; cursor: pointer;">
                  Close
                </button>
              `;
              
              document.body.appendChild(downloadContainer);
              
              // Auto-remove after 30 seconds
              setTimeout(() => {
                if (downloadContainer.parentElement) {
                  downloadContainer.remove();
                }
                URL.revokeObjectURL(url);
              }, 30000);
              
              toast.showToast(`PDF ready! Click the download button that appeared on screen.`, 'success');
              
            } catch (webError) {
              
              // Final fallback: Open PDF in new tab with data URI
              const pdfDataUri = doc.output('datauristring');
              const newWindow = window.open('', '_blank');
              if (newWindow) {
                newWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Present Students PDF</title>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <style>
                        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        .header { text-align: center; margin-bottom: 20px; }
                        .download-btn { display: inline-block; background: #4a6cf7; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px; }
                        .download-btn:hover { background: #3a5ce5; }
                        iframe { width: 100%; height: 600px; border: none; border-radius: 8px; }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <div class="header">
                          <h2>📄 Present Students PDF Generated</h2>
                          <p>If the PDF doesn't open automatically, use the download button below:</p>
                        </div>
                        <div style="text-align: center;">
                          <a href="${pdfDataUri}" download="${fileName}" class="download-btn">
                            📥 Download PDF File
                          </a>
                        </div>
                        <iframe src="${pdfDataUri}"></iframe>
                      </div>
                    </body>
                  </html>
                `);
                newWindow.document.close();
                toast.showToast(`PDF opened in new tab. Use the download button in the new tab.`, 'success');
              } else {
                toast.showToast('Please allow popups for this site to download the PDF', 'error');
              }
            }
          }
        } catch (error) {
          toast.showToast('Failed to export PDF on mobile. Please try on desktop.', 'error');
        }
      } else {
        // For desktop, use the standard approach
        doc.save(fileName);
        toast.showToast('Present students PDF generated successfully', 'success');
      }
    }
    } catch (error: any) {
      toast.showToast(error.message || 'Failed to export present students', 'error');
    } finally {
      setExportPresentLoading(false);
    }
  };


  const handleStatusUpdate = async (absentee: any) => {
    if (!absentee.id || !absentee.student_id || !user?.school_id) {
      toast.showToast('Invalid attendance record or missing school information', 'error');
      return;
    }

    try {
      // First verify if the student exists
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('id', absentee.student_id)
        .eq('school_id', user.school_id)
        .single();

      if (studentError || !studentData) {
        toast.showToast('Student not found in database', 'error');
        return;
      }

      // Get active session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
        .single();

      if (sessionError || !sessionData?.id) {
        toast.showToast('No active session found', 'error');
        return;
      }

      // Update the status directly
      const { error: updateError } = await supabase
        .from('attendance_records')
        .update({ status: 'present' })
        .match({
          id: absentee.id,
          student_id: studentData.id,
          session_id: sessionData.id,
          date: absentDate,
          school_id: user.school_id
        });

      if (updateError) {
        throw updateError;
      }

      toast.showToast('Status updated successfully', 'success');
      
      // Update the local state instead of refreshing the whole list
      setAbsentees(prev => prev.map(a => 
        a.id === absentee.id 
          ? { ...a, status: 'present' }
          : a
      ));
    } catch (error: any) {
      toast.showToast(error.message || 'Failed to update status', 'error');
    }
  };

  // Fetch student details when we have an ID
  const fetchStudentDetails = async (studentId: number) => {
    if (!user?.school_id) return null;
    
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          name,
          father_name,
          picture_url,
          class_id,
          section_id,
          classes (
            name
          ),
          sections (
            name
          )
        `)
        .eq('id', studentId)
        .eq('school_id', user.school_id)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  };

  // Modified fetchAbsentees function
  const fetchAbsentees = async () => {
    if (!absentDate || !user?.school_id) return;

    try {
      // Get active session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
        .single();

      if (sessionError && !isNoSessionError(sessionError)) {
        toast.showToast('Failed to fetch active session', 'error');
        return;
      }

      if (!sessionData?.id) {
        setStudentDetails({});
        setAbsentees([]);
        return;
      }

      // First get attendance records for the date
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select(`
          id,
          student_id,
          status,
          remarks,
          date,
          class_id,
          section_id
        `)
        .eq('date', absentDate)
        .eq('session_id', sessionData.id)
        .eq('school_id', user.school_id)
        .or('status.eq.absent,status.eq.leave'); // Fetch both absent and leave records

      if (attendanceError) {
        throw attendanceError;
      }

      // Get unique student IDs
      const studentIds = attendanceData
        .map(record => record.student_id)
        .filter((id, index, self) => id && self.indexOf(id) === index);

      if (studentIds.length === 0) {
        setStudentDetails({});
        setAbsentees([]);
        return;
      }

      // Fetch student details for these IDs
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          name,
          father_name,
          picture_url,
          class_id,
          section_id,
          classes (
            id,
            name
          ),
          sections (
            id,
            name
          )
        `)
        .in('id', studentIds)
        .eq('school_id', user.school_id);

      if (studentsError) {
        throw studentsError;
      }

      // Get attendance statistics for each student
      const monthStart = format(startOfMonth(parseISO(absentDate)), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(parseISO(absentDate)), 'yyyy-MM-dd');

      const { data: monthlyAttendance, error: monthlyError } = await supabase
        .from('attendance_records')
        .select('student_id, status, date')
        .in('student_id', studentIds)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .eq('school_id', user.school_id);

      if (monthlyError) {
        throw monthlyError;
      }

      // Calculate monthly statistics for each student
      const monthlyStats: Record<number, { absences: number; leaves: number; total: number }> = {};
      monthlyAttendance.forEach(record => {
        if (!monthlyStats[record.student_id]) {
          monthlyStats[record.student_id] = { absences: 0, leaves: 0, total: 0 };
        }
        monthlyStats[record.student_id].total++;
        if (record.status === 'absent') monthlyStats[record.student_id].absences++;
        if (record.status === 'leave') monthlyStats[record.student_id].leaves++;
      });

      // Create a map of student details with attendance stats
      const newStudentDetails: Record<string, any> = {};
      studentsData.forEach((student: any) => {
        const stats = monthlyStats[student.id] || { absences: 0, leaves: 0, total: 0 };
        const attendance_percentage = stats.total ? 
          Math.round(((stats.total - stats.absences - stats.leaves) / stats.total) * 100) : 100;

        newStudentDetails[student.id] = {
          ...student,
          class_name: student.classes?.name || 'Unknown Class',
          section_name: student.sections?.name || 'Unknown Section',
          monthly_absences: stats.absences,
          monthly_leaves: stats.leaves,
          attendance_percentage
        };
      });

      setStudentDetails(newStudentDetails);
      
      // Sort absentees by class and then by student name
      const sortedAbsentees = attendanceData.sort((a, b) => {
        const studentA = newStudentDetails[a.student_id];
        const studentB = newStudentDetails[b.student_id];
        
        if (!studentA || !studentB) return 0;
        
        // Sort by class name first (numeric), then by student name
        const classComparison = compareClassNames(studentA.class_name, studentB.class_name);
        if (classComparison !== 0) return classComparison;
        return studentA.name.localeCompare(studentB.name);
      });
      
      setAbsentees(sortedAbsentees);

    } catch (error) {
      toast.showToast('Failed to fetch absentees', 'error');
    }
  };

  // Use fetchAbsentees in useEffect
  useEffect(() => {
    fetchAbsentees();
  }, [absentDate, user?.school_id]);

  // Show loading animation while all data is being fetched and checked
  if (loading || !allDataLoaded || settingsLoading) {
    return <Loader />;
  }

  // For guest users, check if dashboard access is allowed
  // Note: This check is redundant since ProtectedRoute already checks this,
  // but we keep it as a safety measure in case someone accesses Dashboard directly
  if (user?.role === 'Guest') {
    // If settings are still loading, show loader
    if (settingsLoading || !renderSettings) {
      return <Loader />;
    }
    
    // If settings loaded but dashboard page access is not enabled, show access denied
    // Use isGuestPageAccessible to check if the dashboard page is accessible
    if (!isGuestPageAccessible(renderSettings, 'dashboard')) {
      return (
        <DashboardContainer>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            textAlign: 'center',
            color: isDark ? '#a0a7b8' : '#64748b',
            minHeight: '400px'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.7 }}>🔒</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem', color: isDark ? '#e2e8f0' : '#1e293b' }}>
              Access Denied
            </div>
            <div style={{ fontSize: '0.95rem', opacity: 0.8 }}>
              Dashboard access is not enabled for guest users. Please contact your administrator.
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '1rem' }}>
              To enable access, go to Settings → Render Settings → Guest tab → Enable "Dashboard"
            </div>
          </div>
        </DashboardContainer>
      );
    }
  }

  if (!hasActiveSession) {
    return <NoSessionsFound />;
  }

  // Check if no students are found
  if (students.length === 0) {
    if (hasAnyStudents === false) {
      return <NoStudentsFound />;
    }
  }
  
  // Check which cards should be visible for guest users
  const isGuest = user?.role === 'Guest';
  const showClassStrength = !isGuest || isDashboardCardVisible(renderSettings, 'class_strength_card');
  const showFineCollection = !isGuest || isDashboardCardVisible(renderSettings, 'fine_collection_card');
  const showAbsentees = !isGuest || isDashboardCardVisible(renderSettings, 'absentees_card');
  const showHomeworkDiary = !isGuest || isDashboardCardVisible(renderSettings, 'homework_diary_card');
  const hasLeftCards = showClassStrength || showFineCollection;
  const hasRightCards = showAbsentees || showHomeworkDiary;

  return (
    <DashboardContainer>
      <TwoColumnGrid $columns={(hasLeftCards && hasRightCards) ? 2 : 1}>
        {hasLeftCards && (
        <LeftColumn>
          {showClassStrength && (
            <ClassStrengthTableCard>
              <SectionHeader onClick={() => setIsStrengthExpanded(!isStrengthExpanded)}>
                <SectionHeaderTitle>
                  Class Wise Strength
                  <StrengthExpandIcon $isExpanded={isStrengthExpanded} />
                </SectionHeaderTitle>
              </SectionHeader>
            <CollapsibleContent $isExpanded={isStrengthExpanded}>
              <ClassStrengthTableContainer>
                <ClassStrengthTable>
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Total</th>
                      <th>Boys</th>
                      <th>Girls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStrengths.map(cls => (
                      <tr key={cls.name}>
                        <td style={{ color: '#6366f1', fontWeight: 700 }}>{cls.name}</td>
                        <td style={{ fontWeight: 800, color: isDark ? '#fff' : '#232a3b' }}>{cls.total}</td>
                        <td style={{ color: '#22c55e', fontWeight: 600 }}>{cls.boys}</td>
                        <td style={{ color: '#a78bfa', fontWeight: 600 }}>{cls.girls}</td>
                      </tr>
                    ))}
                  </tbody>
                </ClassStrengthTable>
              </ClassStrengthTableContainer>
              <ClassStrengthFooter>
                <span>TOTAL</span>
                <span style={{ color: isDark ? '#fff' : '#232a3b' }}>
                  {totalStudentsFromHistory}
                </span>
                <span style={{ color: '#22c55e' }}>
                  {totalBoysFromHistory}
                </span>
                <span style={{ color: '#a78bfa' }}>
                  {totalGirlsFromHistory}
                </span>
              </ClassStrengthFooter>
            </CollapsibleContent>
          </ClassStrengthTableCard>
          )}
          
          {/* Fine Collection Details Card */}
          {showFineCollection && (
            <FineTableWrapper>
            <FineTableHeader onClick={() => setIsFineExpanded(!isFineExpanded)}>
              <FineHeaderTitleRow>
                <FineHeaderTitle>
                  <MonetizationOn style={{ fontSize: '1.3rem' }} />
                  Fine Collection Details
                </FineHeaderTitle>
                <FineExpandIcon $isExpanded={isFineExpanded} />
              </FineHeaderTitleRow>
              <FineControls isExpanded={isFineExpanded}>
                <FineDateInput
                  type="date"
                  value={fineDate}
                  onChange={(e) => {
                    e.stopPropagation();
                    setFineDate(e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <FineAmountButton
                  onClick={(e) => e.stopPropagation()}
                >
                  Rs {todayCollectedFine.toLocaleString()}
                </FineAmountButton>
              </FineControls>
            </FineTableHeader>
            
            <FineCollapsibleContent $isExpanded={isFineExpanded}>
              <FineDetailsList>
                {fineDetails.length === 0 ? (
                  <NoFineData>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.7 }}>
                      💰
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                      No Fine Collections
                    </div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                      No fine payments recorded for {new Date(fineDate).toLocaleDateString()}
                    </div>
                  </NoFineData>
                ) : (
                  fineDetails.map((fine) => {
                    const student = fine.students;
                    const classLabel = `${getClassName(student.class_id)}${getSectionName(student.section_id) ? ' (' + getSectionName(student.section_id) + ')' : ''}`;
                    const time = new Date(fine.created_at).toLocaleTimeString('en-GB', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: false 
                    });
                    
                    // Check if this is a remission entry (has remission amount > 0)
                    const isRemission = fine.remission && Number(fine.remission) > 0;
                    
                    // Use raw database values - no conversion needed
                    const displayAmount = Number(fine.amount);
                    const displayRemission = Number(fine.remission);
                    
                    
                    return (
                      <FineDetailItem key={fine.id} $isRemission={isRemission}>
                        <FineStudentAvatar>
                          {student.picture_url ? (
                            <img src={student.picture_url} alt={student.name} />
                          ) : (
                            <AccountCircle style={{ fontSize: '0.8rem' }} />
                          )}
                        </FineStudentAvatar>
                        <FineCardContent>
                          <FineRow>
                            <FineStudentId>{getStudentDisplayId(student)}</FineStudentId>
                            <FineDot />
                            <FineStudentName>{student.name}</FineStudentName>
                            {student.father_name && (
                              <>
                                <FineDot />
                                <FineStudentFather>{student.father_name}</FineStudentFather>
                              </>
                            )}
                          </FineRow>
                          <FineMeta>
                            <span>{classLabel}</span>
                            <FineDot />
                            <FineAmount $isRemission={isRemission}>
                              <span style={{ color: '#22c55e' }}>
                                Rs {displayAmount.toLocaleString()}
                              </span>
                              <span style={{ marginLeft: '0.3rem', fontSize: '0.8rem', color: '#ec4899' }}>
                                (Rem: Rs {displayRemission.toLocaleString()})
                              </span>
                            </FineAmount>
                            <FineDot />
                            <FineTime>{time}</FineTime>
                          </FineMeta>
                        </FineCardContent>
                        {!isGuest && (
                          <FineActions>
                            <DeleteButton
                              onClick={() => showDeleteConfirmation(fine)}
                              title="Delete fine payment"
                            >
                              <Delete style={{ fontSize: '0.7rem' }} />
                            </DeleteButton>
                          </FineActions>
                        )}
                      </FineDetailItem>
                    );
                  })
                )}
              </FineDetailsList>
              <FineStatsRow>
                <span className="stat total">Total Entries: <b>{fineDetails.length}</b></span>
                <span className="stat avg">Avg: <b>Rs {fineDetails.length ? Math.round(todayCollectedFine / fineDetails.length) : 0}</b></span>
                {fineDetails.some(fine => fine.remission && Number(fine.remission) > 0) && (
                  <span className="stat remission">Remission: <b>Rs {fineDetails.reduce((sum, fine) => sum + (Number(fine.remission) || 0), 0).toLocaleString()}</b></span>
                )}
              </FineStatsRow>
            </FineCollapsibleContent>
          </FineTableWrapper>
          )}
        </LeftColumn>
        )}
        {hasRightCards && (
        <RightColumn>
          {showAbsentees && (
            <AbsentsTableWrapper>
            <AbsentsTableHeader onClick={() => setIsAbsenteesExpanded(!isAbsenteesExpanded)}>
              <AbsentsHeaderTitleRow>
                <AbsentsHeaderTitle>
                  Today's Absentees
                </AbsentsHeaderTitle>
                <ExpandIcon $isExpanded={isAbsenteesExpanded} />
              </AbsentsHeaderTitleRow>
              <AbsentsControls isExpanded={isAbsenteesExpanded}>
                <DateInput
                  type="date"
                  value={absentDate}
                  onChange={(e) => {
                    e.stopPropagation();
                    setAbsentDate(e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <WhatsAppButton
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (whatsappProcessing || absentees.length === 0) return;
                    // Proceed even if absentees list is empty, since we also include 'late' students for the selected date
                    
                    setWhatsappProcessing(true);
                    try {
                      // Also include students marked 'late' for the selected date (not listed in UI)
                      let lateRecords: { student_id: number; status: string; date: string; remarks?: string }[] = [];
                      if (user?.school_id) {
                        const { data: sessionData, error: sessionError } = await supabase
                          .from('sessions')
                          .select('id')
                          .eq('is_active', true)
                          .eq('school_id', user.school_id)
                          .single();

                        if (!sessionError && sessionData?.id) {
                          const { data: lateData, error: lateError } = await supabase
                            .from('attendance_records')
                            .select('student_id, status, date, remarks')
                            .eq('date', absentDate)
                            .eq('session_id', sessionData.id)
                            .eq('school_id', user.school_id)
                            .eq('status', 'late');

                          if (!lateError && lateData) {
                            lateRecords = lateData as any;
                          }
                        }
                      }

                      // Prepare notification data for absent/leave + late students
                      const attendanceForNotify = [
                        ...absentees.map(a => ({
                          id: a.student_id,
                          status: a.status,
                          date: absentDate,
                          remarks: a.remarks
                        })),
                        ...lateRecords.map(l => ({
                          id: l.student_id,
                          status: l.status,
                          date: l.date || absentDate,
                          remarks: l.remarks
                        }))
                      ];

                      // De-duplicate by student id, preferring non-late statuses if duplicates exist
                      const seen = new Set<number>();
                      const uniqueAttendance = attendanceForNotify.filter(entry => {
                        if (seen.has(entry.id)) return false;
                        seen.add(entry.id);
                        return true;
                      });

                      const notificationData = await whatsappSemiAutoService.prepareAttendanceNotifications(
                        uniqueAttendance,
                        user?.school_id!,
                        schoolName || 'School',
                        'All Classes',
                        undefined
                      );
                      
                      if (notificationData.length > 0) {
                        setWhatsappNotificationData(notificationData);
                        setShowWhatsAppSender(true);
                        toast.showToast(`Prepared ${notificationData.length} notifications`, 'success');
                      } else {
                        toast.showToast('No students with phone numbers found', 'success');
                      }
                    } catch (error) {
                      toast.showToast('Failed to prepare notifications', 'error');
                    } finally {
                      setWhatsappProcessing(false);
                    }
                  }}
                  disabled={whatsappProcessing || absentees.length === 0}
                  style={{
                    opacity: (whatsappProcessing || absentees.length === 0) ? 0.5 : 1,
                    cursor: (whatsappProcessing || absentees.length === 0) ? 'not-allowed' : 'pointer'
                  }}
                  title="Send WhatsApp/SMS notifications to absent students"
                >
                  {whatsappProcessing ? (
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #25d366',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                  ) : (
                    <WhatsApp />
                  )}
                </WhatsAppButton>
                {isMobile ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ExportButton 
                      onClick={(e) => {
                        e.stopPropagation();
                        exportAbsenteesPDF();
                      }}
                      disabled={exportAbsentLoading}
                      style={{ 
                        background: 'rgba(239,68,68,0.1)', 
                        color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.2)',
                        opacity: exportAbsentLoading ? 0.5 : 1
                      }}
                    >
                      A
                    </ExportButton>
                    <ExportButton 
                      onClick={(e) => {
                        e.stopPropagation();
                        exportPresentStudentsPDF();
                      }}
                      disabled={exportPresentLoading}
                      style={{ 
                        background: 'rgba(34,197,94,0.1)', 
                        color: '#16a34a',
                        border: '1px solid rgba(34,197,94,0.2)',
                        opacity: exportPresentLoading ? 0.5 : 1
                      }}
                    >
                      P
                    </ExportButton>
                  </div>
                ) : (
                  <ExportButton 
                    ref={exportDropdownRef}
                    onClick={(e) => {
                    e.stopPropagation();
                      setShowExportDropdown(!showExportDropdown);
                    }}
                  >
                    <ExportIcon fontSize="small" />
                    Export
                    <ExpandIcon $isExpanded={showExportDropdown} />
                    {showExportDropdown && (
                      <ExportDropdown>
                        <ExportDropdownItem 
                          $type="absent"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowExportDropdown(false);
                            exportAbsenteesPDF();
                          }}
                        >
                          <ExportIcon fontSize="small" />
                          Absent Students
                        </ExportDropdownItem>
                        <ExportDropdownItem 
                          $type="present"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowExportDropdown(false);
                            exportPresentStudentsPDF();
                          }}
                        >
                          <ExportIcon fontSize="small" />
                          Present Students
                        </ExportDropdownItem>
                      </ExportDropdown>
                    )}
                  </ExportButton>
                )}
              </AbsentsControls>
            </AbsentsTableHeader>
            <AbsentsCollapsibleContent $isExpanded={isAbsenteesExpanded}>
              <AbsenteesGrid>
                {(() => {
                  // Check if it's Sunday
                  const selectedDate = new Date(absentDate);
                  const isSunday = selectedDate.getDay() === 0;
                  
                  // Check if there are any attendance records for the date
                  const hasAttendanceRecords = attendanceDataForDate.length > 0;
                  
                  // Check if there are any absent students
                  const hasAbsentStudents = absentees.length > 0;
                  
                  if (isSunday) {
                    return (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem',
                        textAlign: 'center',
                        color: isDark ? '#a0a7b8' : '#64748b',
                        minHeight: '200px'
                      }}>
                        <div style={{
                          fontSize: '3rem',
                          marginBottom: '1rem',
                          color: '#6366f1',
                          opacity: 0.7
                        }}>
                          🏖️
                        </div>
                        <div style={{
                          fontSize: '1.2rem',
                          fontWeight: 600,
                          marginBottom: '0.5rem',
                          color: isDark ? '#e2e8f0' : '#1e293b'
                        }}>
                          Sunday - No Classes
                        </div>
                        <div style={{
                          fontSize: '0.95rem',
                          opacity: 0.8
                        }}>
                          School is closed on Sundays
                        </div>
                      </div>
                    );
                  }
                  
                  if (!hasAttendanceRecords) {
                    return (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem',
                        textAlign: 'center',
                        color: isDark ? '#a0a7b8' : '#64748b',
                        minHeight: '200px'
                      }}>
                        <div style={{
                          fontSize: '3rem',
                          marginBottom: '1rem',
                          color: '#6366f1',
                          opacity: 0.7
                        }}>
                          📊
                        </div>
                        <div style={{
                          fontSize: '1.2rem',
                          fontWeight: 600,
                          marginBottom: '0.5rem',
                          color: isDark ? '#e2e8f0' : '#1e293b'
                        }}>
                          No Attendance Records
                        </div>
                        <div style={{
                          fontSize: '0.95rem',
                          opacity: 0.8
                        }}>
                          No attendance has been recorded for {new Date(absentDate).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  }
                  
                  if (!hasAbsentStudents) {
                    return (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem',
                        textAlign: 'center',
                        color: isDark ? '#a0a7b8' : '#64748b',
                        minHeight: '200px'
                      }}>
                        <div style={{
                          fontSize: '3rem',
                          marginBottom: '1rem',
                          color: '#22c55e',
                          opacity: 0.7
                        }}>
                          ✅
                        </div>
                        <div style={{
                          fontSize: '1.2rem',
                          fontWeight: 600,
                          marginBottom: '0.5rem',
                          color: isDark ? '#e2e8f0' : '#1e293b'
                        }}>
                          No Absent Students
                        </div>
                        <div style={{
                          fontSize: '0.95rem',
                          opacity: 0.8
                        }}>
                          All students are present on {new Date(absentDate).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  }
                  
                  // Show absent students if there are any
                  return absentees.map((absentee, globalIdx) => {
                    const student = studentDetails[absentee.student_id];
                    if (!student) return null;
                    
                    return (
                      <CompactAnimatedAbsenteeCard key={absentee.id} $index={globalIdx}>
                        <StudentAvatar
                          onMouseEnter={(e) => {
                            if (student.picture_url) {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              setHoveredAvatar({
                                url: student.picture_url,
                                x: rect.left + rect.width / 2,
                                y: rect.top
                              });
                            }
                          }}
                          onMouseLeave={() => setHoveredAvatar(null)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setHoveredAvatar(null);
                            navigate(`/students/profile/${student.id}`);
                          }}
                          title={`View profile of ${student.name}`}
                          style={{ cursor: 'pointer' }}
                        >
                          {student.picture_url ? (
                            <img src={student.picture_url} alt={student.name} />
                          ) : (
                            <AccountCircle style={{ fontSize: '1.3em', color: '#b0b8d1' }} />
                          )}
                        </StudentAvatar>
                        <AbsenteeCardContent>
                          <AbsenteeRow>
                            <AbsenteeId>{getStudentDisplayId(student)}</AbsenteeId>
                            <Dot />
                            <AbsenteeName>{student.name}</AbsenteeName>
                            {student.father_name && (
                              <>
                                <Dot />
                                <AbsenteeFather>{student.father_name}</AbsenteeFather>
                              </>
                            )}
                          </AbsenteeRow>
                          <AbsenteeRow style={{ fontSize: '0.82rem', color: isDark ? '#a0a7b8' : '#64748b' }}>
                            <span>{student.class_name}</span>
                            {student.section_name && (
                              <>
                                <Dot />
                                <span>{student.section_name}</span>
                              </>
                            )}
                            <Dot />
                            <span>{student.monthly_absences || 0} M.A</span>
                            <Dot />
                            <span>{student.monthly_leaves || 0} M.L</span>
                            <Dot />
                            <span style={{
                              color: student.attendance_percentage < 75 ? '#ef4444' : 
                                    student.attendance_percentage < 85 ? '#eab308' : '#22c55e',
                              fontWeight: 600
                            }}>
                              {student.attendance_percentage || 0}%
                            </span>
                          </AbsenteeRow>
                        </AbsenteeCardContent>
                        <StatusPill
                          type="button"
                          $status={absentee.status}
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const spaceBelow = window.innerHeight - rect.bottom;
                            const spaceAbove = rect.top;
                            setDropdownDirection(spaceBelow >= 180 || spaceBelow > spaceAbove ? 'down' : 'up');
                            setDropdownPos({ top: rect.top, left: rect.left });
                            setDropdownIdx(globalIdx);
                            return false;
                          }}
                        >
                          {absentee.status === 'absent' ? 'Absent' : 'Leave'}
                        </StatusPill>
                          {dropdownIdx === globalIdx && dropdownPos &&
                            ReactDOM.createPortal(
                              <StatusDropdown
                                ref={dropdownRef}
                                direction={dropdownDirection}
                                style={{
                                  position: 'fixed',
                                  left: dropdownPos.left,
                                  top: dropdownDirection === 'down' ? dropdownPos.top : undefined,
                                  bottom: dropdownDirection === 'up' ? window.innerHeight - dropdownPos.top : undefined,
                                }}
                              >
                                {statusOptions.map(opt => (
                                  <StatusOption
                                    key={opt.value}
                                    type="button"
                                    color={opt.color}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      
                                      const handleStatusUpdate = async () => {
                                        const absentee = absentees[globalIdx];
                                        if (!user?.school_id) {
                                          toast.showToast('User school information not found', 'error');
                                          return;
                                        }
                                        
                                        try {
                                        // Get active session
                                        const { data: sessionData, error: sessionError } = await supabase
                                          .from('sessions')
                                          .select('id')
                                          .eq('is_active', true)
                                          .eq('school_id', user.school_id)
                                          .single();

                                        if (sessionError) throw sessionError;
                                        if (!sessionData?.id) {
                                          toast.showToast('No active session found for this school', 'error');
                                          return;
                                        }

                                        if (opt.value === 'present' || opt.value === 'late') {
                                          // Delete the record if marking as present or late
                                          const { error: deleteError } = await supabase
                                            .from('attendance_records')
                                            .delete()
                                            .match({
                                              id: absentee.id,
                                              student_id: absentee.student_id,
                                              date: absentDate,
                                              session_id: sessionData.id,
                                              school_id: user.school_id
                                            });

                                          if (deleteError) throw deleteError;
                                          
                                          // Remove from list
                                          setAbsentees(prev => prev.filter(a => a.id !== absentee.id));
                                        } else {
                                          // Update to absent or leave
                                          const { error: updateError } = await supabase
                                            .from('attendance_records')
                                            .update({
                                              status: opt.value
                                            })
                                            .match({
                                              id: absentee.id,
                                              student_id: absentee.student_id,
                                              date: absentDate,
                                              session_id: sessionData.id,
                                              school_id: user.school_id
                                            });

                                          if (updateError) throw updateError;
                                          
                                          // Update status in list
                                          setAbsentees(prev => prev.map(a => 
                                            a.id === absentee.id 
                                              ? { ...a, status: opt.value }
                                              : a
                                          ));
                                        }

                                        // Update local attendance data without refetching
                                        setAttendanceDataForDate(prev => {
                                          if (opt.value === 'present' || opt.value === 'late') {
                                            // Remove the record
                                            return prev.filter(r => r.student_id !== absentee.student_id);
                                          } else {
                                            // Update the record status
                                            return prev.map(r => 
                                              r.student_id === absentee.student_id 
                                                ? { ...r, status: opt.value }
                                                : r
                                            );
                                          }
                                        });

                                        toast.showToast('Status updated successfully', 'success');
                                        } catch (err) {
                                          toast.showToast('Failed to update status', 'error');
                                        }
                                        setDropdownIdx(null);
                                      };
                                      
                                      handleStatusUpdate();
                                      return false;
                                    }}
                                  >
                                    {opt.label}
                                  </StatusOption>
                                ))}
                                <StatusOption
                                  type="button"
                                  color={deleteOption.color}
                                  separator
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    const absentee = absentees[globalIdx];
                                    if (!user?.school_id) {
                                      toast.showToast('User school information not found', 'error');
                                      return;
                                    }
                                    
                                    try {
                                      // Get active session
                                      const { data: sessionData, error: sessionError } = await supabase
                                        .from('sessions')
                                        .select('id')
                                        .eq('is_active', true)
                                        .eq('school_id', user.school_id)
                                        .single();

                                      if (sessionError) throw sessionError;
                                      if (!sessionData?.id) {
                                        toast.showToast('No active session found for this school', 'error');
                                        return;
                                      }

                                      // Delete the attendance record
                                      const { error: deleteError } = await supabase
                                        .from('attendance_records')
                                        .delete()
                                        .match({
                                          id: absentee.id,
                                          student_id: absentee.student_id,
                                          date: absentDate,
                                          session_id: sessionData.id,
                                          school_id: user.school_id
                                        });

                                      if (deleteError) throw deleteError;

                                      // Remove from absentees list
                                      setAbsentees(prev => prev.filter(a => a.id !== absentee.id));

                                      // Update local attendance data without refetching
                                      setAttendanceDataForDate(prev => 
                                        prev.filter(r => r.student_id !== absentee.student_id)
                                      );

                                      toast.showToast('Attendance record deleted', 'success');
                                    } catch (err) {
                                      toast.showToast('Failed to delete record', 'error');
                                    }
                                    setDropdownIdx(null);
                                    return false;
                                  }}
                                >
                                  {deleteOption.label}
                                </StatusOption>
                              </StatusDropdown>,
                              document.body
                            )}
                      </CompactAnimatedAbsenteeCard>
                    );
                  });
                })()}
              </AbsenteesGrid>
              <AbsenteesStatsRow>
                <span className="stat total">T: <b>{attendanceDataForDate.length}</b></span>
                <span className="stat present">P: <b>{attendanceDataForDate.filter(a => a.status === 'present').length}</b></span>
                <span className="stat absent">A: <b>{attendanceDataForDate.filter(a => a.status === 'absent').length}</b></span>
                <span className="stat leave">L: <b>{attendanceDataForDate.filter(a => a.status === 'leave').length}</b></span>
                <span className="stat late">LT: <b>{attendanceDataForDate.filter(a => a.status === 'late').length}</b></span>
                <span className="stat avg">P%: <b>{attendanceDataForDate.length ? Math.round(((attendanceDataForDate.filter(a => a.status === 'present').length + attendanceDataForDate.filter(a => a.status === 'late').length) / attendanceDataForDate.length) * 100) : 0}%</b></span>
              </AbsenteesStatsRow>
            </AbsentsCollapsibleContent>
          </AbsentsTableWrapper>
          )}
          
          {/* Homework Diary Section */}
          {showHomeworkDiary && (
            <HomeworkTableWrapper>
            <HomeworkTableHeader onClick={() => setIsHomeworkExpanded(!isHomeworkExpanded)}>
              <HomeworkHeaderTitle>
                <Assignment style={{ fontSize: window.innerWidth <= 700 ? '1.1rem' : '1.3rem' }} />
                Today's Homework Diary
              </HomeworkHeaderTitle>
              <HomeworkExpandIcon $isExpanded={isHomeworkExpanded} />
            </HomeworkTableHeader>
            
            <HomeworkCollapsibleContent $isExpanded={isHomeworkExpanded}>
              <HomeworkList>
                {(() => {
                  // Group homework by class only (combine all sections for the same class)
                  const grouped: Record<string, any> = {};
                  
                  homeworkDiaryData.forEach((hw: any) => {
                    const classId = hw.class_id;
                    const className = hw.classes?.name || 'Unknown Class';
                    
                    // Create key: just classId to group all sections together
                    const key = String(classId);
                    
                    if (!grouped[key]) {
                      // For display, use the first section name if all entries have the same section
                      // Otherwise, show just the class name
                      grouped[key] = {
                        class_id: classId,
                        class_name: className,
                        section_id: null,
                        section_name: '',
                        entries: []
                      };
                    }
                    
                    grouped[key].entries.push(hw);
                  });
                  
                  // After grouping, determine if all entries have the same section
                  Object.values(grouped).forEach((group: any) => {
                    const sections = new Set();
                    group.entries.forEach((entry: any) => {
                      if (entry.section_id) {
                        sections.add(entry.section_id);
                      }
                    });
                    
                    // If all entries have the same section, show it in the header
                    if (sections.size === 1) {
                      const sectionId = Array.from(sections)[0] as number;
                      const firstEntry = group.entries.find((e: any) => e.section_id === sectionId);
                      if (firstEntry) {
                        group.section_id = sectionId;
                        group.section_name = firstEntry.sections?.name || '';
                      }
                    }
                  });
                  
                  const groups = Object.values(grouped);
                  
                  if (groups.length === 0) {
                    return (
                      <NoHomeworkData>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.7 }}>
                          📝
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                          No Homework Assigned
                        </div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                          No homework has been assigned for today
                        </div>
                      </NoHomeworkData>
                    );
                  }
                  
                  return groups.map((group: any, groupIdx: number) => {
                    // Sort entries: general homework first (null subject), then by subject name
                    const sortedEntries = group.entries.sort((a: any, b: any) => {
                      if (!a.subject_id && !b.subject_id) return 0;
                      if (!a.subject_id) return -1;
                      if (!b.subject_id) return 1;
                      const aName = a.subjects?.name || '';
                      const bName = b.subjects?.name || '';
                      return aName.localeCompare(bName);
                    });
                    
                    const classLabel = group.section_name 
                      ? `${group.class_name} (${group.section_name})`
                      : group.class_name;
                    const diaryCount = sortedEntries.length;
                    
                    return (
                      <HomeworkClassItem key={groupIdx}>
                        <HomeworkClassHeader>
                          <School style={{ fontSize: window.innerWidth <= 700 ? '0.9rem' : '1rem' }} />
                          <span>{classLabel}</span>
                          <span style={{ 
                            marginLeft: 'auto',
                            fontSize: window.innerWidth <= 700 ? '0.75rem' : '0.875rem',
                            fontWeight: 600,
                            color: '#6366f1',
                            backgroundColor: 'rgba(99,102,241,0.1)',
                            padding: window.innerWidth <= 700 ? '0.2rem 0.5rem' : '0.25rem 0.625rem',
                            borderRadius: window.innerWidth <= 700 ? '8px' : '12px',
                            border: '1px solid rgba(99,102,241,0.2)',
                            whiteSpace: 'nowrap'
                          }}>
                            {diaryCount} {diaryCount === 1 ? 'Entry' : 'Entries'}
                          </span>
                        </HomeworkClassHeader>
                        {sortedEntries.map((entry: any, entryIdx: number) => {
                          const subjectName = entry.subjects?.name || 'General Homework';
                          const isGeneral = !entry.subject_id;
                          
                          return (
                            <HomeworkSubjectItem key={entryIdx}>
                              {window.innerWidth <= 700 ? (
                                <>
                                  <HomeworkSubjectHeader>
                                    <HomeworkSubjectName>
                                      {isGeneral ? (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                          <Assignment style={{ fontSize: '0.75rem' }} />
                                          {subjectName}
                                        </span>
                                      ) : (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                          <Book style={{ fontSize: '0.75rem' }} />
                                          {subjectName}
                                        </span>
                                      )}
                                    </HomeworkSubjectName>
                                    <HomeworkTeacher>
                                      {entry.users?.name ? (
                                        <>
                                          <AccountCircle style={{ fontSize: '0.7rem', opacity: 0.7 }} />
                                          {entry.users.name}
                                        </>
                                      ) : (
                                        <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>—</span>
                                      )}
                                    </HomeworkTeacher>
                                  </HomeworkSubjectHeader>
                                  <HomeworkText>{entry.homework_text}</HomeworkText>
                                </>
                              ) : (
                                <>
                                  <HomeworkSubjectName>
                                    {isGeneral ? (
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Assignment style={{ fontSize: '0.875rem' }} />
                                        {subjectName}
                                      </span>
                                    ) : (
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Book style={{ fontSize: '0.875rem' }} />
                                        {subjectName}
                                      </span>
                                    )}
                                  </HomeworkSubjectName>
                                  <HomeworkText>{entry.homework_text}</HomeworkText>
                                  <HomeworkTeacher>
                                    {entry.users?.name ? (
                                      <>
                                        <AccountCircle style={{ fontSize: '0.875rem', opacity: 0.7 }} />
                                        {entry.users.name}
                                      </>
                                    ) : (
                                      <span style={{ opacity: 0.5, fontSize: '0.75rem' }}>—</span>
                                    )}
                                  </HomeworkTeacher>
                                </>
                              )}
                            </HomeworkSubjectItem>
                          );
                        })}
                      </HomeworkClassItem>
                    );
                  });
                })()}
              </HomeworkList>
            </HomeworkCollapsibleContent>
          </HomeworkTableWrapper>
          )}
        </RightColumn>
        )}
      </TwoColumnGrid>
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
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && fineToDelete && ReactDOM.createPortal(
        <ModalOverlay onClick={cancelDelete}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalIcon>
                <Delete />
              </ModalIcon>
              <ModalTitle>Delete Fine Payment</ModalTitle>
            </ModalHeader>
            <ModalMessage>
              Are you sure you want to delete this fine payment? This action cannot be undone.
            </ModalMessage>
            
            <StudentInfoCard>
              <StudentName>{fineToDelete.studentName}</StudentName>
              <StudentDetails>
                <DetailRow>
                  <DetailLabel>Student ID:</DetailLabel>
                  <DetailValue>{fineToDelete.studentId}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Class:</DetailLabel>
                  <DetailValue>{fineToDelete.className}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Amount:</DetailLabel>
                  <DetailValue highlight>Rs {fineToDelete.amount.toLocaleString()}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Date:</DetailLabel>
                  <DetailValue>{fineToDelete.date}</DetailValue>
                </DetailRow>
              </StudentDetails>
            </StudentInfoCard>
            
            <ModalActions>
              <ModalButton variant="cancel" onClick={cancelDelete}>
                Cancel
              </ModalButton>
              <ModalButton variant="delete" onClick={handleDeleteFine}>
                Delete
              </ModalButton>
            </ModalActions>
          </ModalContent>
        </ModalOverlay>,
        document.body
      )}
      
      {/* WhatsApp Bulk Sender Modal */}
      {showWhatsAppSender && (
        <WhatsAppBulkSender
          notificationData={whatsappNotificationData}
          schoolName={schoolName || 'School'}
          selectedDate={absentDate}
          onClose={() => {
            setShowWhatsAppSender(false);
            setWhatsappNotificationData([]);
          }}
        />
      )}
    </DashboardContainer>
  );
};

export default Dashboard; 