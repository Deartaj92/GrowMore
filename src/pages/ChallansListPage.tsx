import React, { useState, useEffect, useMemo, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { ThemeProvider } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import Loader from '../components/Loader';
import { usePageFooter } from '../components/Layout/contexts/PageFooterContext';
import { 
  Receipt, 
  Search,
  Download,
  Visibility,
  CheckCircle,
  Cancel,
  Schedule,
  AccountBalanceWallet,
  Close,
  Person,
  CalendarToday,
  Info
} from '@mui/icons-material';
import { sortClasses } from '../utils/classUtils';
import { fetchAllRows } from '../utils/paginationHelper';
import { getSequenceNumber } from '../utils/studentUtils';
import {
  loadChallans,
  loadChallanItems,
  loadStudentDetails,
  loadStudentClasses,
  getAvailableMonthsAndYears,
  Challan,
  ChallanItem
} from './ChallansList/services/challanService';

// ===== STYLED COMPONENTS =====
const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 6px 4px 6px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  min-height: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

const Header = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin: 2px 0 1px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.BG};
  box-shadow: 0 1px 4px #0001;
  border-radius: 6px;
  padding: 2px 4px 1px 4px;
  min-height: 28px;
`;

const Title = styled.h1`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  
  @media (max-width: 700px) {
    padding-right: 50px;
  }
`;

const SEGMENTED_HEIGHT = '28px';

const SegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.BG === '#252525' ? '#222' : '#f8f9fa'};
  border-radius: 11px;
  box-shadow: ${({ theme }) => theme.BG === '#252525' ? '1.4px 1.4px 4px rgba(0,0,0,0.3)' : '1.4px 1.4px 4px rgba(0,0,0,0.1)'};
  border: ${({ theme }) => theme.BG === '#252525' ? '1px solid #333' : '1px solid #e5e7eb'};
  overflow: hidden;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    border-radius: 8px;
    gap: 0;
    padding: 0;
  }
  
  @media (max-width: 480px) {
    flex-direction: row;
    gap: 0;
    padding: 0;
    border-radius: 8px;
    overflow-x: visible;
    overflow-y: visible;
  }
`;

const SegmentedSelect = styled.select<{ first?: boolean; last?: boolean }>`
  font-family: inherit;
  font-size: 0.77em;
  font-weight: 400;
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  box-shadow: ${({ theme }) => theme.BG === '#252525' ? '1.4px 1.4px 4px rgba(0,0,0,0.3)' : '1.4px 1.4px 4px rgba(0,0,0,0.1)'};
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#ffffff'};
  color: ${({ theme }) => theme.BG === '#252525' ? '#C0C0C0' : '#374151'};
  padding: 0 2.2em 0 0.84em;
  border-right: ${({ theme }) => theme.BG === '#252525' ? '1px solid #555' : '1px solid #e5e7eb'};
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
    border-left: ${({ theme }) => theme.BG === '#252525' ? '1px solid #555' : '1px solid #e5e7eb'};
  }
  appearance: none;
  -webkit-appearance: none;
  background-image: ${({ theme }) => theme.BG === '#252525' 
    ? `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%23C0C0C0' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`
    : `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%23374151' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`};
  background-repeat: no-repeat;
  background-position: right 0.8em center;
  background-size: 1em 1em;
  
  @media (max-width: 768px) {
    width: 100%;
    border-radius: 0;
    border-left: none;
    border-right: none;
    min-width: 0;
    background-position: right 1em center;
    margin: 0;
    box-shadow: none;
  }
  
  @media (max-width: 480px) {
    width: 100%;
    border-radius: 0;
    margin: 0;
    border: none;
    background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#ffffff'};
    box-shadow: none;
  }
`;

const SegmentedSearchInput = styled.input<{ first?: boolean; last?: boolean }>`
  font-family: inherit;
  font-size: 0.77em;
  font-weight: 400;
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  box-shadow: ${({ theme }) => theme.BG === '#252525' ? '1.4px 1.4px 4px rgba(0,0,0,0.3)' : '1.4px 1.4px 4px rgba(0,0,0,0.1)'};
  border: none;
  outline: none;
  transition: background 0.2s;
  background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#ffffff'};
  color: ${({ theme }) => theme.BG === '#252525' ? '#C0C0C0' : '#374151'};
  padding: 0 0.84em;
  border-right: ${({ theme }) => theme.BG === '#252525' ? '1px solid #555' : '1px solid #e5e7eb'};
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
    border-left: ${({ theme }) => theme.BG === '#252525' ? '1px solid #555' : '1px solid #e5e7eb'};
  }
  
  min-width: 300px;
  width: 300px;
  
  &::placeholder {
    color: ${({ theme }) => theme.BG === '#252525' ? '#888' : '#9ca3af'};
    font-size: 0.9em;
  }
  
  @media (max-width: 768px) {
    width: 100%;
    min-width: 0;
    border-radius: 0;
    border-left: none;
    border-right: none;
    margin: 0;
    box-shadow: none;
  }
  
  @media (max-width: 480px) {
    width: 100%;
    min-width: 0;
    border-radius: 0;
    margin: 0;
    border: none;
    background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#ffffff'};
    box-shadow: none;
  }
`;

const HeaderTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  width: 100%;

  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }
`;

const HeaderBottomRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;

  @media (max-width: 700px) {
    flex-direction: row;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
  }
`;

const DesktopSegmentedGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;

  @media (max-width: 700px) {
    display: none;
  }
`;

const MobileHeaderLayout = styled.div`
  display: none;

  @media (max-width: 700px) {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
  }
`;

const MobileRow = styled.div`
  display: flex;
  width: 100%;
  gap: 0;
  margin-top: 4px;
  
  @media (max-width: 700px) {
    gap: 0;
    margin-top: 6px;
  }
`;

const MainContent = styled.div`
  flex: 1;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  padding: 0;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 3px;
    transition: background 0.2s;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
  }
`;

const TableArea = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 18px;
  box-shadow: 0 6px 32px #00000029, 0 1.5px 6px #0000001a;
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 2rem 2.2rem;
  margin-bottom: 2.5rem;
  width: 100%;
  @media (max-width: 700px) {
    padding: 1.2rem 0.7rem;
  }
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  @media (max-width: 700px) {
    border-radius: 8px;
    &::-webkit-scrollbar {
      height: 4px;
      width: 4px;
    }
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: ${({ theme }) => theme.CARD};
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 4px #0001;
`;

const Th = styled.th`
  padding: 0.4rem 0.4rem;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.ACCENT};
  font-weight: 700;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  font-size: 0.75rem;
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 0.35rem 0.4rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  font-size: 0.7rem;
  white-space: nowrap;
`;

const LeftTd = styled(Td)`
  text-align: left;
`;

const CenterTd = styled(Td)`
  text-align: center;
  @media (max-width: 700px) {
    text-align: right;
    padding-right: 1.2em;
  }
`;

const CenterTh = styled(Th)`
  text-align: center;
`;

const DetailsButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: ${({ theme }) => theme.ACCENT};
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 70px;
  justify-content: center;
  
  &:hover {
    background: ${({ theme }) => theme.ACCENT}dd;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  svg {
    font-size: 0.8rem;
  }
  
  @media (max-width: 768px) {
    padding: 6px 10px;
    font-size: 0.65rem;
    min-width: 60px;
  }
  
  @media (max-width: 480px) {
    padding: 4px 8px;
    font-size: 0.6rem;
    min-width: 50px;
  }
`;

const ErrorContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #ef4444;
  text-align: center;
`;

const SummaryStats = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    gap: 12px;
    justify-content: center;
    width: 100%;
  }
  
  @media (max-width: 480px) {
    gap: 8px;
    flex-wrap: wrap;
    justify-content: space-between;
  }
`;

const StatItem = styled.div<{ $type?: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 2px;
    text-align: center;
    min-width: 50px;
  }
  
  @media (max-width: 480px) {
    font-size: 0.75rem;
    min-width: 40px;
    gap: 1px;
  }
`;

const StatValue = styled.span<{ $type?: string }>`
  font-weight: 700;
  font-size: 0.9rem;
  color: ${({ $type, theme }) => {
    if ($type === 'total') return theme.ACCENT;
    if ($type === 'average') return '#3b82f6';
    return theme.TEXT_PRIMARY;
  }};
  
  @media (max-width: 768px) {
    font-size: 1rem;
    font-weight: 700;
  }
  
  @media (max-width: 480px) {
    font-size: 0.9rem;
    font-weight: 600;
  }
`;

const StatLabel = styled.span`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  
  @media (max-width: 768px) {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  
  @media (max-width: 480px) {
    font-size: 0.6rem;
    font-weight: 500;
  }
`;

// Panel styled components
const PanelOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 20px;
  opacity: ${({ $isOpen }) => $isOpen ? '1' : '0'};
  visibility: ${({ $isOpen }) => $isOpen ? 'visible' : 'hidden'};
  transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
  
  @media (max-width: 768px) {
    align-items: flex-end;
    padding: 10px;
  }
`;

const PanelContainer = styled.div<{ $isOpen: boolean }>`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  width: 500px;
  max-width: 90vw;
  height: 80vh;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.BORDER};
  transform: translateX(${({ $isOpen }) => $isOpen ? '0' : '100%'});
  transition: transform 0.3s ease-in-out;
  
  @media (max-width: 768px) {
    width: 100%;
    height: 85vh;
    max-height: 85vh;
    border-radius: 12px 12px 0 0;
  }
`;

const PanelHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${({ theme }) => theme.BG};
  flex-shrink: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#f3f4f6'};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
  
  svg {
    font-size: 1.2rem;
  }
`;

const PanelContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 0;
  
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.BORDER} transparent;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG};
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BORDER};
    border-radius: 4px;
    border: 1px solid ${({ theme }) => theme.BG};
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.TEXT_SECONDARY};
  }
`;

const SectionContainer = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f8f9fa'};
  border-radius: 8px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const SectionTitle = styled.h4`
  margin: 0 0 12px 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: ${({ theme }) => theme.BG};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 6px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  
  &:not(:last-child)::after {
    content: '•';
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    margin-left: 8px;
    opacity: 0.5;
  }
`;

const InfoItemLabel = styled.span`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-right: 4px;
`;

const InfoItemValue = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 700;
`;

const StudentCard = styled.div`
  background: linear-gradient(135deg, ${({ theme }) => theme.BG} 0%, ${({ theme }) => theme.ACCENT}08 100%);
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const StudentName = styled.div`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  
  svg {
    font-size: 1rem;
    color: ${({ theme }) => theme.ACCENT};
  }
`;

const StudentMeta = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  margin-left: 26px;
  padding-top: 4px;
`;

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  
  svg {
    font-size: 0.9rem;
    color: ${({ theme }) => theme.ACCENT};
    flex-shrink: 0;
    opacity: 0.8;
  }
`;

const DetailValue = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 500;
  line-height: 1.4;
`;

const ItemsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
`;

const ItemCard = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: ${({ theme }) => theme.BG};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT}40;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transform: translateX(2px);
  }
`;

const ItemName = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 600;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ItemAmount = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.ACCENT};
  font-weight: 700;
  margin-left: 12px;
  flex-shrink: 0;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
`;

const TotalCard = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  background: linear-gradient(135deg, ${({ theme }) => theme.ACCENT}20 0%, ${({ theme }) => theme.ACCENT}12 100%);
  border: 2px solid ${({ theme }) => theme.ACCENT}40;
  border-radius: 10px;
  margin-top: 8px;
  box-shadow: 0 4px 12px ${({ theme }) => theme.ACCENT}15;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, ${({ theme }) => theme.ACCENT} 0%, ${({ theme }) => theme.ACCENT}dd 100%);
  }
`;

const TotalLabel = styled.div`
  font-size: 0.9rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TotalAmount = styled.div`
  font-size: 1.2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.ACCENT};
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  letter-spacing: 0.5px;
`;

const PanelEmptyState = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-style: italic;
  padding: 20px 0;
`;

// ===== CONSTANTS =====
const MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
];

// ===== HELPER FUNCTIONS =====
const formatMonth = (month: string | null): string => {
  if (!month) return 'N/A';
  if (month === 'one-time') return 'One-time';
  const monthNum = parseInt(month);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) return month;
  return MONTHS[monthNum - 1]?.label || month;
};

const formatCurrency = (value: number): string => {
  if (value % 1 === 0) {
    return String(value);
  }
  return value.toFixed(2);
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (error) {
    return 'N/A';
  }
};

// ===== MAIN COMPONENT =====
const ChallansListPage: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth();
  const { showToast } = useToast();
  const { setFooterContent } = usePageFooter();
  
  const schoolId = user?.school_id;
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 700);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // State
  const [loading, setLoading] = useState(true);
  const [challans, setChallans] = useState<Challan[]>([]);
  const [students, setStudents] = useState<Map<number, any>>(new Map());
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [studentClasses, setStudentClasses] = useState<Map<number, string>>(new Map());
  
  // Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<Challan | null>(null);
  const [challanItems, setChallanItems] = useState<ChallanItem[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);
  
  // Filters
  const [selectedSession, setSelectedSession] = useState<number | ''>('');
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [selectedSection, setSelectedSection] = useState<number | ''>('');
  const [selectedMonth, setSelectedMonth] = useState<number | string | ''>('');
  const [selectedYear, setSelectedYear] = useState<number | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Available months and years based on data
  const [availableMonths, setAvailableMonths] = useState<Array<{ value: number | string; label: string }>>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  // Helper functions
  const getClassName = (classId: any) => 
    classes.find((c: any) => String(c.id) === String(classId))?.name || '-';
  
  // Load initial data (classes, sessions)
  useEffect(() => {
    if (!schoolId) return;
    
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [classesData, sectionsData, sessionsData] = await Promise.all([
          fetchAllRows(async (from, to) => {
            return await supabase
              .from('classes')
              .select('*')
              .eq('school_id', schoolId)
              .order('name')
              .range(from, to);
          }),
          fetchAllRows(async (from, to) => {
            return await supabase
              .from('sections')
              .select('*')
              .eq('school_id', schoolId)
              .order('name')
              .range(from, to);
          }),
          fetchAllRows(async (from, to) => {
            return await supabase
              .from('sessions')
              .select('*')
              .eq('school_id', schoolId)
              .order('is_active', { ascending: false })
              .order('name')
              .range(from, to);
          })
        ]);
        
        setClasses(classesData || []);
        setSections(sectionsData || []);
        setSessions(sessionsData || []);
        
        // Set default to active session
        const activeSession = sessionsData?.find(s => s.is_active);
        if (activeSession) {
          setSelectedSession(activeSession.id);
        }
        
        // Don't set default year - show all years by default
        // User can filter by year if needed
      } catch (error) {
        console.error('Error loading initial data:', error);
        showToast('Failed to load data', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, [schoolId, showToast]);

  // Load available months and years based on current filters (session, class, section)
  useEffect(() => {
    if (!schoolId || !selectedSession) {
      setAvailableMonths([]);
      setAvailableYears([]);
      return;
    }
    
    const loadAvailableMonthsAndYears = async () => {
      try {
        const filters = {
          schoolId,
          sessionId: selectedSession,
          classId: selectedClass || undefined,
          sectionId: selectedSection || undefined,
        };
        
        const { months, years } = await getAvailableMonthsAndYears(filters);
        setAvailableMonths(months);
        setAvailableYears(years);
        
        // Reset month/year selection if current selection is not in available options
        if (selectedMonth && !months.find((m: { value: number | string; label: string }) => String(m.value) === String(selectedMonth))) {
          setSelectedMonth('');
        }
        if (selectedYear && !years.includes(selectedYear)) {
          setSelectedYear('');
        }
      } catch (error) {
        console.error('Error loading available months and years:', error);
        setAvailableMonths([]);
        setAvailableYears([]);
      }
    };
    
    loadAvailableMonthsAndYears();
  }, [schoolId, selectedSession, selectedClass, selectedSection]);

  // Load challans based on filters
  useEffect(() => {
    if (!schoolId || !selectedSession) {
      setChallans([]);
      setStudents(new Map());
      return;
    }
    
    const loadChallansData = async () => {
      setLoading(true);
      try {
        const filters = {
          schoolId,
          sessionId: selectedSession,
          classId: selectedClass || undefined,
          sectionId: selectedSection || undefined,
          month: selectedMonth || undefined,
          year: selectedYear || undefined,
          status: selectedStatus || undefined,
        };
        
        const data = await loadChallans(filters);
        setChallans(data);
        
        // Load student details
        if (data.length > 0) {
          const studentIds = Array.from(new Set(data.map(c => c.student_id)));
          const studentsMap = await loadStudentDetails(studentIds, schoolId);
          setStudents(studentsMap);
        } else {
          setStudents(new Map());
        }
      } catch (error) {
        console.error('Error loading challans:', error);
        showToast('Failed to load challans', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadChallansData();
  }, [schoolId, selectedSession, selectedClass, selectedSection, selectedMonth, selectedYear, selectedStatus, showToast]);

  // Load student classes for filtered challans
  useEffect(() => {
    if (challans.length === 0 || !selectedSession || !schoolId) {
      setStudentClasses(new Map());
      return;
    }
    
    const loadClasses = async () => {
      const studentIds = Array.from(new Set(challans.map(c => c.student_id)));
      if (studentIds.length === 0) {
        setStudentClasses(new Map());
        return;
      }
      
      const classMap = await loadStudentClasses(studentIds, selectedSession, schoolId, classes);
      setStudentClasses(classMap);
    };
    
    loadClasses();
  }, [challans, selectedSession, schoolId, classes]);

  // Load challan items when challan is selected
  useEffect(() => {
    if (!selectedChallan || !schoolId) {
      setChallanItems([]);
      return;
    }

    const loadItems = async () => {
      setPanelLoading(true);
      try {
        const items = await loadChallanItems(selectedChallan.id, schoolId);
        setChallanItems(items);
      } catch (error) {
        console.error('Error loading challan items:', error);
        showToast('Failed to load challan items', 'error');
      } finally {
        setPanelLoading(false);
      }
    };

    loadItems();
  }, [selectedChallan, schoolId, showToast]);

  // Filter challans by search query
  const filteredChallans = useMemo(() => {
    let filtered = challans;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(challan => {
        const student = students.get(challan.student_id);
        return (
          student?.name?.toLowerCase().includes(query) ||
          student?.roll_number?.toLowerCase().includes(query) ||
          challan.id.toString().includes(query)
        );
      });
    }
    
    return filtered;
  }, [challans, students, searchQuery]);

  // Paginated challans
  const paginatedChallans = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredChallans.slice(startIndex, endIndex);
  }, [filteredChallans, currentPage, itemsPerPage]);

  // Total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredChallans.length / itemsPerPage);
  }, [filteredChallans.length, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSession, selectedClass, selectedSection, selectedMonth, selectedYear, selectedStatus]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalChallans = filteredChallans.length;
    const totalAmount = filteredChallans.reduce((sum, c) => sum + Number(c.total_amount || 0), 0);
    
    return {
      totalChallans,
      totalAmount
    };
  }, [filteredChallans]);

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Set footer content for global footer with pagination
  useEffect(() => {
    if (filteredChallans.length > 0) {
      const FooterContentComponent = React.memo(() => {
        const themeObj = (theme as any).BG === '#252525' ? darkTheme : lightTheme;
        
        return (
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'center' : 'center',
            justifyContent: isMobile ? 'center' : 'space-between',
            width: '100%',
            gap: isMobile ? '0.5rem' : '0.75rem',
            flexWrap: isMobile ? 'nowrap' : 'wrap',
            padding: '0 0.5rem'
          }}>
            <SummaryStats theme={themeObj}>
              <StatItem theme={themeObj}>
                <StatValue $type="total" theme={themeObj}>{summary.totalChallans}</StatValue>
                <StatLabel theme={themeObj}>Total Challans</StatLabel>
              </StatItem>
              <StatItem theme={themeObj}>
                <StatValue $type="average" theme={themeObj}>Rs. {formatCurrency(summary.totalAmount)}</StatValue>
                <StatLabel theme={themeObj}>Total Amount</StatLabel>
              </StatItem>
            </SummaryStats>
            
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.7rem',
                color: themeObj.TEXT_SECONDARY
              }}>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: `1px solid ${themeObj.BORDER}`,
                      borderRadius: '4px',
                      background: currentPage === 1 ? themeObj.BG : themeObj.CARD,
                      color: currentPage === 1 ? themeObj.TEXT_SECONDARY : themeObj.TEXT_PRIMARY,
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '0.7rem',
                      opacity: currentPage === 1 ? 0.5 : 1
                    }}
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: `1px solid ${themeObj.BORDER}`,
                      borderRadius: '4px',
                      background: currentPage === totalPages ? themeObj.BG : themeObj.CARD,
                      color: currentPage === totalPages ? themeObj.TEXT_SECONDARY : themeObj.TEXT_PRIMARY,
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      fontSize: '0.7rem',
                      opacity: currentPage === totalPages ? 0.5 : 1
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      });

      setFooterContent({
        visible: true,
        content: <FooterContentComponent />
      });

      return () => {
        setFooterContent(null);
      };
    } else {
      setFooterContent(null);
    }
  }, [filteredChallans, summary, isMobile, theme, setFooterContent, currentPage, totalPages]);

  // Event handlers
  const handleViewDetails = (challan: Challan) => {
    setSelectedChallan(challan);
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setSelectedChallan(null);
    setChallanItems([]);
  };

  // Check if user has school_id - must be after all hooks
  if (!user?.school_id) {
    return (
      <PageContainer>
        <TableArea>
          <ErrorContainer>
            <Info style={{ marginRight: '0.5rem' }} />
            No school context found. Please contact your administrator.
          </ErrorContainer>
        </TableArea>
      </PageContainer>
    );
  }

  if (loading && challans.length === 0) {
    return <Loader />;
  }

  return (
    <ThemeProvider theme={theme}>
      <PageContainer>
        <Header>
          <HeaderTopRow>
            <Title>
              📋 Generated Challans
            </Title>
            
            {/* Desktop layout - all fields in one row */}
            <DesktopSegmentedGroup>
              <SegmentedGroup>
                <SegmentedSearchInput
                  type="text"
                  placeholder="Search by name, roll number, or challan ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  first
                />
                
                <SegmentedSelect
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <option value="">All Sessions</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name} {session.is_active && '(Active)'}
                    </option>
                  ))}
                </SegmentedSelect>
                
                <SegmentedSelect
                  value={selectedClass}
                  onChange={(e) => {
                    const value = e.target.value === '' ? '' : Number(e.target.value);
                    setSelectedClass(value);
                    setSelectedSection(''); // Reset section when class changes
                  }}
                >
                  <option value="">All Classes</option>
                  {sortClasses(classes).map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </SegmentedSelect>
                
                <SegmentedSelect
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={selectedClass === ''}
                >
                  <option value="">All Sections</option>
                  {sections
                    .filter((sec: any) => !selectedClass || sec.class_id === selectedClass)
                    .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))
                    .map((sec: any) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name}
                      </option>
                    ))}
                </SegmentedSelect>
                
                <SegmentedSelect
                  value={selectedMonth}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setSelectedMonth('');
                    } else if (value === 'one-time') {
                      setSelectedMonth('one-time');
                    } else {
                      setSelectedMonth(Number(value));
                    }
                  }}
                >
                  <option value="">All Months</option>
                  {availableMonths.map(month => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </SegmentedSelect>
                
                <SegmentedSelect
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <option value="">All Years</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </SegmentedSelect>
                
                <SegmentedSelect
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  last
                >
                  <option value="">All Status</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </SegmentedSelect>
              </SegmentedGroup>
            </DesktopSegmentedGroup>
          </HeaderTopRow>
          
          <HeaderBottomRow>
            {/* Mobile layout - search and filters in separate rows */}
            <MobileHeaderLayout>
              <MobileRow>
                <SegmentedGroup>
                  <SegmentedSearchInput
                    type="text"
                    placeholder="Search by name, roll number, or challan ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ flex: '1', minWidth: 0 }}
                    first
                  />
                  
                  <SegmentedSelect
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{ flex: '1', minWidth: 0 }}
                  >
                    <option value="">All Sessions</option>
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.name} {session.is_active && '(Active)'}
                      </option>
                    ))}
                  </SegmentedSelect>
                  
                  <SegmentedSelect
                    value={selectedClass}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '' : Number(e.target.value);
                      setSelectedClass(value);
                      setSelectedSection(''); // Reset section when class changes
                    }}
                    style={{ flex: '1', minWidth: 0 }}
                  >
                    <option value="">All Classes</option>
                    {sortClasses(classes).map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </SegmentedSelect>
                  
                  <SegmentedSelect
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={selectedClass === ''}
                    style={{ flex: '1', minWidth: 0 }}
                  >
                    <option value="">All Sections</option>
                    {sections
                      .filter((sec: any) => !selectedClass || sec.class_id === selectedClass)
                      .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))
                      .map((sec: any) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.name}
                        </option>
                      ))}
                  </SegmentedSelect>
                  
                  <SegmentedSelect
                    value={selectedMonth}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setSelectedMonth('');
                      } else if (value === 'one-time') {
                        setSelectedMonth('one-time');
                      } else {
                        setSelectedMonth(Number(value));
                      }
                    }}
                    style={{ flex: '1', minWidth: 0 }}
                  >
                    <option value="">All Months</option>
                    {availableMonths.map(month => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </SegmentedSelect>
                  
                  <SegmentedSelect
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{ flex: '1', minWidth: 0 }}
                  >
                    <option value="">All Years</option>
                    {availableYears.map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </SegmentedSelect>
                  
                  <SegmentedSelect
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    style={{ flex: '1', minWidth: 0 }}
                    last
                  >
                    <option value="">All Status</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </SegmentedSelect>
                </SegmentedGroup>
              </MobileRow>
            </MobileHeaderLayout>
          </HeaderBottomRow>
        </Header>
        
        <MainContent>
          <TableArea>
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <CenterTh>SNo</CenterTh>
                    <CenterTh>Challan ID</CenterTh>
                    <Th style={{ textAlign: 'left' }}>Student</Th>
                    <CenterTh>Class</CenterTh>
                    <CenterTh>Month</CenterTh>
                    <CenterTh>Year</CenterTh>
                    <CenterTh>Amount</CenterTh>
                    <CenterTh>Status</CenterTh>
                    <CenterTh>Due Date</CenterTh>
                    <CenterTh>Action</CenterTh>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><CenterTd colSpan={10}>Loading challans...</CenterTd></tr>
                  ) : filteredChallans.length === 0 ? (
                    <tr><CenterTd colSpan={10}>No challans found. Try adjusting your filters.</CenterTd></tr>
                  ) : (
                    paginatedChallans.map((challan, idx) => {
                      const student = students.get(challan.student_id);
                      const className = studentClasses.get(challan.student_id) || 'N/A';
                      const globalIndex = (currentPage - 1) * itemsPerPage + idx;
                      
                      return (
                        <tr 
                          key={challan.id}
                          onClick={() => handleViewDetails(challan)}
                          style={{
                            cursor: 'pointer'
                          }}
                        >
                          <CenterTd>{globalIndex + 1}</CenterTd>
                          <CenterTd>#{challan.id}</CenterTd>
                          <LeftTd>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                              {student?.roll_number && (
                                <span style={{ fontWeight: 600, fontSize: '0.7rem' }}>
                                  {getSequenceNumber(student.roll_number) || student.roll_number}
                                </span>
                              )}
                              {student?.roll_number && student?.name && (
                                <span style={{ color: (theme as any).TEXT_SECONDARY }}>.</span>
                              )}
                              <span style={{ fontWeight: 600, fontSize: '0.7rem' }}>{student?.name || 'N/A'}</span>
                              {student?.father_name && (
                                <>
                                  <span style={{ color: (theme as any).TEXT_SECONDARY }}>.</span>
                                  <span style={{ 
                                    fontSize: '0.7rem', 
                                    color: (theme as any).TEXT_SECONDARY,
                                    opacity: 0.7,
                                    fontWeight: 400
                                  }}>
                                    {student.father_name}
                                  </span>
                                </>
                              )}
                            </div>
                          </LeftTd>
                          <CenterTd>{className}</CenterTd>
                          <CenterTd>{formatMonth(challan.month)}</CenterTd>
                          <CenterTd>{challan.year || 'N/A'}</CenterTd>
                          <CenterTd style={{ color: (theme as any).ACCENT, fontWeight: 700, fontSize: '0.7rem' }}>
                            Rs. {formatCurrency(Number(challan.total_amount || 0))}
                          </CenterTd>
                          <CenterTd>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: challan.status === 'paid' ? (theme as any).ACCENT + '20' : 
                                         challan.status === 'partial' ? '#fbbf24' + '20' :
                                         challan.status === 'cancelled' ? '#ef4444' + '20' : (theme as any).BORDER,
                              color: challan.status === 'paid' ? (theme as any).ACCENT :
                                    challan.status === 'partial' ? '#fbbf24' :
                                    challan.status === 'cancelled' ? '#ef4444' : (theme as any).TEXT_SECONDARY
                            }}>
                              {challan.status.charAt(0).toUpperCase() + challan.status.slice(1)}
                            </span>
                          </CenterTd>
                          <CenterTd>
                            {challan.due_date ? new Date(challan.due_date).toLocaleDateString() : 'N/A'}
                          </CenterTd>
                          <CenterTd>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              <DetailsButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(challan);
                                }}
                                title="View challan details"
                              >
                                <Visibility />
                                Details
                              </DetailsButton>
                            </div>
                          </CenterTd>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </TableWrapper>
          </TableArea>
        </MainContent>

        {/* Right-side Panel */}
        <PanelOverlay $isOpen={isPanelOpen} onClick={handleClosePanel}>
          <PanelContainer $isOpen={isPanelOpen} onClick={(e) => e.stopPropagation()}>
            <PanelHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: theme.ACCENT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  flexShrink: 0
                }}>
                  <Receipt style={{ fontSize: '1.5rem' }} />
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontSize: '0.95rem', 
                    fontWeight: '600',
                    color: theme.TEXT_PRIMARY,
                    marginBottom: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    Challan #{selectedChallan?.id || ''}
                  </div>
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: theme.TEXT_SECONDARY,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {selectedChallan ? `${formatMonth(selectedChallan.month)} ${selectedChallan.year || ''}` : ''}
                  </div>
                </div>
              </div>
              
              <CloseButton onClick={handleClosePanel}>
                <Close />
              </CloseButton>
            </PanelHeader>
            
            <PanelContent>
              {panelLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    border: '4px solid #e0e7ff',
                    borderTop: '4px solid #4a6cf7',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto'
                  }} />
                  <div style={{ marginTop: '16px', color: (theme as any).TEXT_SECONDARY }}>Loading details...</div>
                </div>
              ) : selectedChallan ? (
                <>
                  <InfoRow>
                    <InfoItem>
                      <InfoItemLabel>ID</InfoItemLabel>
                      <InfoItemValue>#{selectedChallan.id}</InfoItemValue>
                    </InfoItem>
                    <InfoItem>
                      <InfoItemLabel>Month</InfoItemLabel>
                      <InfoItemValue>{formatMonth(selectedChallan.month)}</InfoItemValue>
                    </InfoItem>
                    <InfoItem>
                      <InfoItemLabel>Year</InfoItemLabel>
                      <InfoItemValue>{selectedChallan.year || 'N/A'}</InfoItemValue>
                    </InfoItem>
                  </InfoRow>

                  <SectionContainer>
                    <SectionTitle>
                      <Person style={{ fontSize: '1rem' }} />
                      Student Information
                    </SectionTitle>
                    <StudentCard>
                      <StudentName>
                        <Person />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                          <span>{students.get(selectedChallan.student_id)?.name || 'N/A'}</span>
                          {students.get(selectedChallan.student_id)?.father_name && (
                            <>
                              <span style={{ color: theme.TEXT_SECONDARY }}>.</span>
                              <span style={{ 
                                color: theme.TEXT_SECONDARY,
                                opacity: 0.7,
                                fontWeight: 400
                              }}>
                                {students.get(selectedChallan.student_id)?.father_name}
                              </span>
                            </>
                          )}
                        </div>
                      </StudentName>
                      {students.get(selectedChallan.student_id)?.roll_number && (
                        <StudentMeta>
                          Roll: {getSequenceNumber(students.get(selectedChallan.student_id)?.roll_number) || students.get(selectedChallan.student_id)?.roll_number} • {studentClasses.get(selectedChallan.student_id) || 'N/A'}
                        </StudentMeta>
                      )}
                    </StudentCard>
                  </SectionContainer>

                  <SectionContainer>
                    <SectionTitle>
                      <CalendarToday style={{ fontSize: '1rem' }} />
                      Important Dates
                    </SectionTitle>
                    <DetailRow>
                      <CalendarToday />
                      <DetailValue>
                        <strong>Generated:</strong> {formatDate(selectedChallan.challan_date)}
                      </DetailValue>
                    </DetailRow>
                    <DetailRow>
                      <Schedule />
                      <DetailValue>
                        <strong>Due Date:</strong> {formatDate(selectedChallan.due_date)}
                      </DetailValue>
                    </DetailRow>
                  </SectionContainer>

                  <SectionContainer>
                    <SectionTitle>
                      <Receipt style={{ fontSize: '1rem' }} />
                      Fee Items ({challanItems.length})
                    </SectionTitle>
                    {challanItems.length === 0 ? (
                      <PanelEmptyState>No items found</PanelEmptyState>
                    ) : (
                      <>
                        <ItemsList>
                          {challanItems.map((item: any) => (
                            <ItemCard key={item.id}>
                              <ItemName>
                                {item.fee_heads?.name || `Fee Head #${item.fee_head_id}`}
                              </ItemName>
                              <ItemAmount>
                                Rs. {Number(item.amount || 0).toFixed(2)}
                              </ItemAmount>
                            </ItemCard>
                          ))}
                        </ItemsList>
                        <TotalCard>
                          <TotalLabel>Total Amount</TotalLabel>
                          <TotalAmount>
                            Rs. {Number(selectedChallan.total_amount || 0).toFixed(2)}
                          </TotalAmount>
                        </TotalCard>
                      </>
                    )}
                  </SectionContainer>

                  {selectedChallan.remarks && (
                    <SectionContainer>
                      <SectionTitle>
                        Remarks
                      </SectionTitle>
                      <div style={{
                        padding: '12px 14px',
                        background: (theme as any).BG,
                        border: `1px solid ${(theme as any).BORDER}`,
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        color: (theme as any).TEXT_SECONDARY,
                        fontStyle: 'italic',
                        lineHeight: 1.5
                      }}>
                        {selectedChallan.remarks}
                      </div>
                    </SectionContainer>
                  )}
                </>
              ) : null}
            </PanelContent>
          </PanelContainer>
        </PanelOverlay>
      </PageContainer>
    </ThemeProvider>
  );
};

export default ChallansListPage;
