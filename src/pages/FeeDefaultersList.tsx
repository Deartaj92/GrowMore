import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import styled, { useTheme } from 'styled-components';
import { 
  AccountCircle, 
  MonetizationOn, 
  Info,
  Refresh,
  Visibility as DetailsIcon,
  PictureAsPdf,
  Receipt as ReceiptIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import { useProgress } from '../components/Layout';
import NoStudentsFound from '../components/NoStudentsFound';
import { sortClasses } from '../utils/classUtils';
import { getStudentDisplayId, matchesStudentSearch } from '../utils/studentUtils';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  gap: 6px;
  margin: 4px 0 2px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.BG};
  box-shadow: 0 1px 4px #0001;
  border-radius: 8px;
  padding: 3px 6px 1px 6px;
  min-height: 32px;
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
    padding-right: 50px; /* Space for PDF button */
  }
`;

// Enhanced Header Components (matching MasterSheetManager)
const SEGMENTED_HEIGHT = '28px';

const SegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.BG === '#252525' ? '#222' : '#f8f9fa'};
  border-radius: 11px;
  box-shadow: ${({ theme }) => theme.BG === '#252525' ? '1.4px 1.4px 4px rgba(0,0,0,0.3)' : '1.4px 1.4px 4px rgba(0,0,0,0.1)'};
  border: ${({ theme }) => theme.BG === '#252525' ? '1px solid #333' : '1px solid #e5e7eb'};
  overflow: hidden;
  
  /* Mobile enhancements - maintain segmented group appearance */
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

const SegmentedSelect = styled.select<{ first?: boolean; last?: boolean; $isSection?: boolean }>`
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
  /* Mobile enhancements - maintain segmented group appearance */
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
  
  /* Mobile-specific styling for section */
  ${({ $isSection }) => $isSection && `
    @media (max-width: 768px) {
      font-size: 0.65em;
      padding: 0 1.8em 0 0.6em;
    }
    
    @media (max-width: 480px) {
      font-size: 0.6em;
      padding: 0 1.5em 0 0.5em;
    }
  `}
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
  
  /* Desktop width - make search field wider */
  min-width: 300px;
  width: 300px;
  
  &::placeholder {
    color: ${({ theme }) => theme.BG === '#252525' ? '#888' : '#9ca3af'};
    font-size: 0.9em;
  }
  
  /* Mobile enhancements - maintain segmented group appearance */
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

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  width: 100%;
  max-width: 400px;
  position: relative;
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  outline: none;
  width: 100%;
  &::placeholder {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
  }
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  /* Mobile enhancements */
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  @media (max-width: 480px) {
    gap: 12px;
  }
`;

const HeaderTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;

  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
`;

const HeaderBottomRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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
    gap: 8px;
    width: 100%;
  }
`;

const MobileRow = styled.div`
  display: flex;
  width: 100%;
  gap: 8px;
  margin-top: 8px; /* Lower the segmented group */
  
  @media (max-width: 700px) {
    gap: 0;
    margin-top: 12px; /* More space on mobile */
  }
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
  
  /* Mobile enhancements - add bottom padding for fixed footer */
  @media (max-width: 480px) {
    padding-bottom: 60px;
  }
  
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
  @media (max-width: 700px) {
    border-radius: 12px;
    &::-webkit-scrollbar {
      height: 6px;
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
  padding: 0.7rem 0.5rem;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.ACCENT};
  font-weight: 700;
  border-bottom: 1.5px solid ${({ theme }) => theme.BORDER};
  font-size: 1.01rem;
`;

const Td = styled.td`
  padding: 0.6rem 0.5rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  font-size: 0.97rem;
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

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #232a3b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: #b0b8d1;
  overflow: hidden;
  border: 1.5px solid #353b4a;
  cursor: pointer;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    display: block;
  }
`;

const StudentInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const StudentAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => theme.ACCENT}20;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.ACCENT};
  font-weight: 600;
  font-size: 0.875rem;
  overflow: hidden;
  border: 2px solid ${({ theme }) => theme.ACCENT}40;
`;

const StudentDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const StudentName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.875rem;
`;

const StudentInfoText = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const AmountCell = styled(Td)`
  font-weight: 600;
  color: ${({ color }) => color || '#ef4444'};
  font-size: 1rem;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-bottom: 1rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const ErrorContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #ef4444;
  text-align: center;
`;

const Footer = styled.div`
  position: sticky;
  bottom: 0;
  background: ${({ theme }) => theme.CARD};
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  padding: 4px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
  margin-top: 4px;
  
  /* Mobile enhancements */
  @media (max-width: 768px) {
    padding: 6px 12px;
    flex-direction: column;
    gap: 6px;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
    border-top: 1px solid ${({ theme }) => theme.BORDER};
  }
  
  @media (max-width: 480px) {
    padding: 8px 10px;
    gap: 8px;
    border-radius: 8px 8px 0 0;
    margin: 0;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
  }
`;

const SummaryStats = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  
  /* Mobile enhancements */
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
  
  /* Mobile enhancements */
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
    if ($type === 'pass') return '#16a34a';
    if ($type === 'fail') return '#dc2626';
    if ($type === 'absent') return '#6b7280';
    if ($type === 'average') return '#3b82f6';
    return theme.TEXT_PRIMARY;
  }};
  
  /* Mobile enhancements */
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
  
  /* Mobile enhancements */
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
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  svg {
    font-size: 0.8rem;
  }
  
  /* Mobile enhancements */
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

const SegmentedButton = styled.button<{ first?: boolean; last?: boolean; $isPdf?: boolean }>`
  font-family: inherit;
  font-size: 0.7em;
  font-weight: 400;
  height: 28px;
  line-height: 28px;
  box-shadow: ${({ theme }) => theme.BG === '#252525' ? '1px 1px 3px rgba(0,0,0,0.3)' : '1px 1px 3px rgba(0,0,0,0.1)'};
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#ffffff'};
  color: ${({ theme }) => theme.BG === '#252525' ? '#C0C0C0' : '#374151'};
  padding: 0 0.8em;
  display: flex;
  align-items: center;
  gap: 0.25em;
  border-radius: 0;
  border-right: ${({ theme }) => theme.BG === '#252525' ? '1px solid #555' : '1px solid #e5e7eb'};
  &:last-child { border-right: none; }
  &:not(:first-child) {
    border-left: ${({ theme }) => theme.BG === '#252525' ? '1px solid #555' : '1px solid #e5e7eb'};
  }
  ${({ first }) => first && `
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  `}
  ${({ last }) => last && `
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#555' : '#f3f4f6'};
  }
  /* Mobile enhancements */
  @media (max-width: 768px) {
    width: 100%;
    border-radius: 6px;
    border-left: none;
    border-right: none;
    min-width: 0;
    margin: 1px;
  }
  
  @media (max-width: 480px) {
    width: 100%;
    border-radius: 6px;
    margin: 0;
    border: ${({ theme }) => theme.BG === '#252525' ? '1px solid #444' : '1px solid #e5e7eb'};
    background: ${({ theme }) => theme.BG === '#252525' ? '#333' : '#ffffff'};
    box-shadow: ${({ theme }) => theme.BG === '#252525' ? '1px 1px 3px rgba(0,0,0,0.3)' : '1px 1px 3px rgba(0,0,0,0.1)'};
  }
  
  /* Mobile-specific styling for PDF button */
  ${({ $isPdf }) => $isPdf && `
    @media (max-width: 768px) {
      font-size: 0.6em;
      padding: 0 0.6em;
    }
    
    @media (max-width: 480px) {
      font-size: 0.55em;
      padding: 0 0.5em;
    }
  `}
`;

// Right-side panel components
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
`;

const PanelTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.2rem;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#f3f4f6'};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

const PanelContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  
  /* Custom scrollbar styling */
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

const FeeItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  
  &:last-child {
    border-bottom: none;
  }
`;

const FeeItemName = styled.span`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 500;
`;

const FeeItemAmount = styled.span`
  color: ${({ theme }) => theme.ACCENT};
  font-weight: 600;
`;

const PaymentItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  
  &:last-child {
    border-bottom: none;
  }
`;

const PaymentDate = styled.span`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.9rem;
`;

const PaymentAmount = styled.span`
  color: #10b981;
  font-weight: 600;
`;

const PanelEmptyState = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-style: italic;
  padding: 20px 0;
`;

const PanelStudentInfo = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? '#333' : '#ffffff'};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const PanelStudentName = styled.h3`
  margin: 0 0 8px 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.1rem;
  font-weight: 600;
`;

const PanelStudentDetails = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.9rem;
  line-height: 1.4;
`;

const ProgressModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 100001; /* Higher than the top progress bar (100000) */
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${({ $isOpen }) => $isOpen ? '1' : '0'};
  visibility: ${({ $isOpen }) => $isOpen ? 'visible' : 'hidden'};
  transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
`;

const ProgressModalContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  padding: 32px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const ProgressModalTitle = styled.h3`
  margin: 0 0 20px 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.4rem;
  font-weight: 600;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 24px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#e5e7eb'};
  border-radius: 12px;
  overflow: hidden;
  margin: 16px 0;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const ProgressBarFill = styled.div<{ $progress: number }>`
  height: 100%;
  background: linear-gradient(90deg, #4a6cf7 0%, #6b8cff 100%);
  border-radius: 12px;
  transition: width 0.3s ease-out;
  width: ${({ $progress }) => $progress}%;
  box-shadow: 0 2px 8px rgba(74, 108, 247, 0.4);
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    animation: shimmer 2s infinite;
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

const ProgressText = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.1rem;
  font-weight: 600;
  margin: 12px 0 8px 0;
`;

const ProgressMessage = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.95rem;
  margin-top: 8px;
  min-height: 24px;
`;

const SpinnerContainer = styled.div`
  display: flex;
  justify-content: center;
  margin: 16px 0;
`;

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid ${({ theme }) => theme.BG === '#252525' ? '#3a3a3a' : '#e5e7eb'};
  border-top: 4px solid #4a6cf7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const CancelButton = styled.button`
  margin-top: 24px;
  padding: 12px 32px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#3a3a3a' : '#f3f4f6'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#e5e7eb'};
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;



const FeeDefaultersList: React.FC = () => {
  const theme = useTheme();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { setLoading, loading } = useLoading();
  const { startProgress, setProgress, completeProgress } = useProgress();
  const navigate = useNavigate();

  // State variables
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [feeData, setFeeData] = useState<any[]>([]);
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [slipsLoading, setSlipsLoading] = useState(false);
  const [messageLanguage, setMessageLanguage] = useState<'english' | 'urdu'>('english');
  const [slipProgress, setSlipProgress] = useState({ current: 0, total: 0, message: '' });
  const [showProgressModal, setShowProgressModal] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentFeeDetails, setStudentFeeDetails] = useState<any>(null);
  const [studentPaymentHistory, setStudentPaymentHistory] = useState<any[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  // Check if user has school_id
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

  // Helper functions
  const getClassName = (classId: any) => 
    classes.find((c: any) => String(c.id) === String(classId))?.name || '-';
  
  const getSectionName = (sectionId: any) => 
    sections.find((s: any) => String(s.id) === String(sectionId))?.name || '';

  const formatCurrency = (value: number): string => {
    if (value % 1 === 0) {
      return String(value);
    }
    return value.toFixed(2);
  };

  // Handle Details button click
  const handleViewDetails = async (student: any) => {
    setSelectedStudent(student);
    setIsPanelOpen(true);
    setPanelLoading(true);
    
    try {
      // Fetch fee details for the student
      const { data: feeInvoices, error: invoicesError } = await supabase
        .from('fee_invoices')
        .select(`
          id,
          student_id,
          session_id,
          month,
          year,
          total_amount,
          status,
          due_date,
          created_at,
          fee_invoice_items (
            id,
            fee_head_id,
            amount,
            fee_heads (
              id,
              name,
              description
            )
          )
        `)
        .eq('student_id', student.id)
        .eq('school_id', user.school_id)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (invoicesError) throw invoicesError;

        // Fetch payment history for the student through fee_invoices
        const { data: paymentHistory, error: paymentError } = await supabase
          .from('fee_payments')
          .select(`
            id,
            amount,
            payment_date,
            payment_mode,
            remarks,
            fee_invoices!inner (
              student_id
            ),
            fee_payment_items (
              id,
              fee_item_id,
              amount
            )
          `)
          .eq('fee_invoices.student_id', student.id)
          .eq('school_id', user.school_id)
          .order('payment_date', { ascending: false });

      if (paymentError) throw paymentError;

      // Calculate remaining fee items
      let remainingFeeItems: any[] = [];
      let totalRemaining = 0;

      if (feeInvoices && feeInvoices.length > 0) {
        const feeItems: any[] = [];
        
        // Process each fee item individually to calculate remaining amounts
        feeInvoices.forEach((invoice) => {
          invoice.fee_invoice_items?.forEach((item: any) => {
            const itemAmount = Number(item.amount || 0);
            
            // Calculate already paid amount for this specific fee item
            const alreadyPaid = paymentHistory?.reduce((sum, payment) => {
              if (payment.fee_payment_items) {
                const itemPayment = payment.fee_payment_items.find(
                  (paymentItem: any) => paymentItem.fee_item_id === item.id
                );
                return sum + (itemPayment ? Number(itemPayment.amount || 0) : 0);
              }
              return sum;
            }, 0) || 0;
            
            const remainingItemAmount = Math.max(0, itemAmount - alreadyPaid);
            
            // Only include items that still need payment
            if (remainingItemAmount > 0) {
              const feeHeadName = item.fee_heads?.name || 'Unknown Fee Head';
              const monthYear = new Date(invoice.month + '/01/' + invoice.year).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
              
              feeItems.push({
                name: `${feeHeadName} (${monthYear})`,
                amount: remainingItemAmount,
                dueDate: invoice.due_date
              });
              totalRemaining += remainingItemAmount;
            }
          });
        });
        
        remainingFeeItems = feeItems;
      }

      setStudentFeeDetails({
        remainingFeeItems,
        totalRemaining
      });
      setStudentPaymentHistory(paymentHistory || []);
    } catch (error) {
      showToast('Failed to load student details', 'error');
    } finally {
      setPanelLoading(false);
    }
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setSelectedStudent(null);
    setStudentFeeDetails(null);
    setStudentPaymentHistory([]);
  };

  // Handle PDF export
  const handleExportPDF = async () => {
    setExportLoading(true);
    
    try {
      // Check if it's a mobile device
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Show immediate feedback for mobile users
      if (isMobileDevice) {
      }
      
      // Filter out students with 0 remaining amount for PDF export
      const defaultersForPDF = filteredDefaulters.filter(defaulter => defaulter.remainingAmount > 0);
      
      // Check if there are any defaulters to export
      if (defaultersForPDF.length === 0) {
        showToast('No fee defaulters found to export', 'success');
        setExportLoading(false);
        return;
      }
      
      // Group defaulters by class-section
      const defaultersByClassSection: { [key: string]: any[] } = {};
      defaultersForPDF.forEach(defaulter => {
        const classId = defaulter.class_id;
        const sectionId = defaulter.section_id;
        const key = `${classId}_${sectionId}`;
        if (!defaultersByClassSection[key]) defaultersByClassSection[key] = [];
        defaultersByClassSection[key].push(defaulter);
      });

      // Sort classes using the universal class sorting function
      const classObjects = Object.keys(defaultersByClassSection).map(key => {
        const [classIdA] = key.split('_');
        return {
          name: getClassName(classIdA),
          key: key
        };
      });
      const sortedClassObjects = sortClasses(classObjects);
      const sortedClassKeys = sortedClassObjects.map(obj => obj.key);

      // Sort defaulters within each class by ID
      Object.keys(defaultersByClassSection).forEach(key => {
        defaultersByClassSection[key].sort((a, b) => a.id - b.id);
      });

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      // Collect all defaulters from all classes into a single array
      const allDefaulters: any[] = [];
      
      for (const key of sortedClassKeys) {
        const defaulters = defaultersByClassSection[key];
        const processedDefaulters = await Promise.all(defaulters.map(async (defaulter, idx) => {
          // Fetch fee invoices for this student to get fee items
          const { data: feeInvoices, error: invoicesError } = await supabase
            .from('fee_invoices')
            .select(`
              id,
              student_id,
              session_id,
              month,
              year,
              total_amount,
              status,
              due_date,
              created_at,
              fee_invoice_items (
                id,
                fee_head_id,
                amount,
                fee_heads (
                  id,
                  name,
                  description
                )
              )
            `)
            .eq('student_id', defaulter.id)
            .eq('school_id', user.school_id)
            .order('year', { ascending: false })
            .order('month', { ascending: false });

          // Fetch payment history for this student
          const { data: paymentHistory, error: paymentError } = await supabase
            .from('fee_payments')
            .select(`
              *,
              fee_invoices!inner (
                student_id
              ),
              fee_payment_items (
                id,
                fee_item_id,
                amount
              )
            `)
            .eq('fee_invoices.student_id', defaulter.id)
            .eq('school_id', user.school_id)
            .order('payment_date', { ascending: false });

          // Calculate fee items like in FeeCollectionNew.tsx
          let particularsText = '';
          let totalFeeAmount = 0;

          if (feeInvoices && feeInvoices.length > 0) {
            const feeItems: string[] = [];
            
            feeInvoices.forEach((invoice) => {
              invoice.fee_invoice_items?.forEach((item: any) => {
                const itemAmount = Number(item.amount || 0);
                
                // Calculate already paid amount for this specific fee item
                const alreadyPaid = paymentHistory?.reduce((sum, payment) => {
                  if (payment.fee_payment_items) {
                    const itemPayment = payment.fee_payment_items.find(
                      (paymentItem: any) => paymentItem.fee_item_id === item.id
                    );
                    return sum + (itemPayment ? Number(itemPayment.amount || 0) : 0);
                  }
                  return sum;
                }, 0) || 0;
                
                const remainingItemAmount = Math.max(0, itemAmount - alreadyPaid);
                
                // Only include items that still need payment
                if (remainingItemAmount > 0) {
                  const feeHeadName = item.fee_heads?.name || 'Unknown Fee Head';
                  const monthYear = new Date(invoice.month + '/01/' + invoice.year).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                  feeItems.push(`${feeHeadName} (${monthYear}) - Rs.${remainingItemAmount}`);
                  totalFeeAmount += remainingItemAmount;
                }
              });
            });
            
            particularsText = feeItems.join(', ');
          }

          // Find last payment date
          let lastPaymentDate = 'N/A';
          if (paymentHistory && paymentHistory.length > 0) {
            const sortedPayments = paymentHistory.sort((a, b) => 
              new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
            );
            const lastPayment = sortedPayments[0];
            if (lastPayment && lastPayment.payment_date) {
              const paymentDate = new Date(lastPayment.payment_date);
              const day = paymentDate.getDate().toString().padStart(2, '0');
              const month = (paymentDate.getMonth() + 1).toString().padStart(2, '0');
              const year = paymentDate.getFullYear().toString().slice(-2);
              lastPaymentDate = `${day}-${month}-${year}`;
            }
          }

          return {
            ...defaulter,
            particularsText: particularsText || 'No outstanding fees',
            totalFeeAmount,
            lastPaymentDate
          };
        }));
        
        // Add processed defaulters to the main array
        allDefaulters.push(...processedDefaulters);
      }
      
      // Sort all defaulters by class using classUtils and then by student ID within each class
      allDefaulters.sort((a, b) => {
        // First sort by class using the classUtils sorting logic
        const aClassName = getClassName(a.class_id);
        const bClassName = getClassName(b.class_id);
        
        // Create temporary objects for classUtils sorting
        const aClassObj = { name: aClassName };
        const bClassObj = { name: bClassName };
        
        // Use classUtils sorting logic
        const sortedClasses = sortClasses([aClassObj, bClassObj]);
        const aIndex = sortedClasses.findIndex(obj => obj.name === aClassName);
        const bIndex = sortedClasses.findIndex(obj => obj.name === bClassName);
        
        const classComparison = aIndex - bIndex;
        if (classComparison !== 0) return classComparison;
        
        // Then sort by student ID within the same class
        return a.id - b.id;
      });
      
      // Assign correct serial numbers after sorting
      allDefaulters.forEach((defaulter, index) => {
        defaulter.globalIndex = index + 1;
      });
      
      // Create single table with all defaulters
      const headers = [
        ['SNo', 'ID', 'Name', 'Father', 'Class', 'Particulars', 'Total Amount', 'Last Payment']
      ];
      
      const body = allDefaulters.map((defaulter) => [
        defaulter.globalIndex,
        getStudentDisplayId(defaulter),
        defaulter.name,
        defaulter.father_name || '-',
        `${getClassName(defaulter.class_id)} (${getSectionName(defaulter.section_id)})`,
        defaulter.particularsText,
        { content: defaulter.totalFeeAmount, styles: { fontStyle: 'bold' } },
        defaulter.lastPaymentDate || 'N/A'
      ]);
      
      // Add total row (only if there are defaulters with outstanding amounts)
      if (allDefaulters.length > 0) {
        const totalAmount = allDefaulters.reduce((sum, defaulter) => sum + defaulter.totalFeeAmount, 0);
        body.push([
          { content: 'Total', colSpan: 6, styles: { fontStyle: 'bold', halign: 'right', fillColor: [240,240,240] } },
          { content: totalAmount, styles: { fontStyle: 'bold', fillColor: [240,240,240] } },
          { content: '', styles: { fillColor: [240,240,240] } }
        ]);
      }
      
      // Header
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Fee Defaulters Report', 105, 15, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const today = new Date();
      const printDate = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getFullYear()}`;
      doc.text(`Print Date: ${printDate}`, 200, 15, { align: 'right' });
      
      autoTable(doc, {
        head: headers,
        body,
        startY: 22,
        margin: { left: 6, right: 6 },
        tableWidth: 'auto',
        styles: { fontSize: 7, cellPadding: 1, halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [240,240,240], textColor: 60, fontStyle: 'bold', halign: 'center', fontSize: 6 },
        bodyStyles: { textColor: 60, fontSize: 6 },
        columnStyles: {
          0: { cellWidth: 8 }, // SNo
          1: { cellWidth: 12 }, // ID
          2: { halign: 'left', cellWidth: 25 }, // Name
          3: { halign: 'left', cellWidth: 25 }, // Father
          4: { cellWidth: 18 }, // Class (reduced width)
          5: { halign: 'left', cellWidth: 75 }, // Particulars (reduced to make room for Last Payment)
          6: { cellWidth: 15 }, // Total Amount
          7: { cellWidth: 15 }  // Last Payment
        },
        theme: 'grid',
        didDrawPage: (data) => {
          // This callback is called for each page as it's drawn
          // We'll add page numbers after the table is complete
        }
      });
      
      // Add total page count to all pages after table is generated
      const totalPages = doc.internal.pages.length;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        
        const pageText = `Page ${i} of ${totalPages}`;
        const pageWidth = doc.internal.pageSize.getWidth();
        const textWidth = doc.getTextWidth(pageText);
        const x = (pageWidth - textWidth) / 2;
        const y = doc.internal.pageSize.getHeight() - 10;
        
        doc.text(pageText, x, y);
      }
      
      // Format date as dd-mmm-yyyy for filename
      const formatDateForFileName = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      };

      const fileName = `Fee Defaulters (${formatDateForFileName(new Date())}).pdf`;
      
      if (isMobileDevice) {
        // For mobile devices, use Capacitor Filesystem API approach
        try {
          // Generate PDF as base64 string
          const pdfBase64 = doc.output('datauristring').split(',')[1];
          
          // Create unique filename with timestamp to prevent overwriting
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const mobileFileName = `fee-defaulters-${timestamp}.pdf`;

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
              
              // Trigger native Android "Open with" dialog by opening the file URI
              window.open(uriResult.uri, '_blank');
              
            } catch (fsError) {
              // If filesystem fails, fallback to regular download
              doc.save(mobileFileName);
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
                <p style="margin: 0 0 15px 0; color: #666;">Fee Defaulters Report</p>
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
              
              
            } catch (webError) {
              
              // Final fallback: Open PDF in new tab with data URI
              const pdfDataUri = doc.output('datauristring');
              const newWindow = window.open('', '_blank');
              if (newWindow) {
                newWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Fee Defaulters PDF</title>
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
                          <h2>📄 Fee Defaulters PDF Generated</h2>
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
              } else {
              }
            }
          }
        } catch (error) {
          // Error handled by toast notification
        }
      } else {
        // For desktop, use the standard approach
        doc.save(fileName);
      }
    } catch (error) {
      // Error handled by toast notification
    } finally {
      setExportLoading(false);
    }
  };

  // Helper function to allow React to update UI
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Helper function to load Urdu font
  // Helper function to render Urdu text to canvas and return as image data
  const renderUrduTextToImage = async (text: string, width: number, fontSize: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Set canvas size (in pixels, we'll scale for PDF)
        const scale = 2; // Higher scale for better quality
        canvas.width = width * scale * 3.779527559; // Convert mm to pixels (1mm = 3.779527559px)
        canvas.height = 200 * scale; // Initial height, will adjust

        // Load the Urdu font
        const fontFace = new FontFace('JameelNooriNastaleeq', 'url(/fonts/JameelNooriNastaleeq.ttf)');
        
        fontFace.load().then((loadedFont) => {
          document.fonts.add(loadedFont);
          
          // Set font and text properties
          ctx.font = `${fontSize * scale}px JameelNooriNastaleeq`;
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.direction = 'rtl'; // Right-to-left for Urdu
          
          // Split text into lines that fit the width
          // For Urdu/RTL, the browser handles direction automatically
          const maxWidth = canvas.width - 20 * scale; // Padding
          const words = text.split(' ');
          const lines: string[] = [];
          let currentLine = '';
          
          // Build lines normally - browser will handle RTL rendering
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) {
            lines.push(currentLine);
          }
          
          // Adjust canvas height based on number of lines (minimal line height for compact text)
          const lineHeight = fontSize * scale * 1.15;
          canvas.height = (lines.length * lineHeight) + 20 * scale;
          
          // Clear and redraw with proper height
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.font = `${fontSize * scale}px JameelNooriNastaleeq`;
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.direction = 'rtl';
          
          // Draw each line
          lines.forEach((line, index) => {
            const y = 10 * scale + (index * lineHeight);
            ctx.fillText(line, canvas.width / 2, y);
          });
          
          // Convert canvas to image data
          const imageData = canvas.toDataURL('image/png');
          resolve(imageData);
        }).catch((error) => {
          // Fallback: render without custom font
          ctx.font = `${fontSize * scale}px Arial`;
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.direction = 'rtl';
          
          const maxWidth = canvas.width - 20 * scale;
          const words = text.split(' ');
          const lines: string[] = [];
          let currentLine = '';
          
          // Build lines normally - browser will handle RTL rendering
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) {
            lines.push(currentLine);
          }
          
          const lineHeight = fontSize * scale * 1.15;
          canvas.height = (lines.length * lineHeight) + 20 * scale;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.font = `${fontSize * scale}px Arial`;
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.direction = 'rtl';
          
          lines.forEach((line, index) => {
            const y = 10 * scale + (index * lineHeight);
            ctx.fillText(line, canvas.width / 2, y);
          });
          
          const imageData = canvas.toDataURL('image/png');
          resolve(imageData);
        });
      } catch (error) {
        reject(error);
      }
    });
  };

  const loadUrduFont = async (doc: jsPDF): Promise<boolean> => {
    try {
      // Check if font is already loaded
      const fontList = doc.getFontList();
      if (fontList && 'JameelNooriNastaleeq' in fontList) {
        return true;
      }

      // Try different possible paths for the font file
      const fontPaths = [
        '/fonts/JameelNooriNastaleeq.ttf',
        '/public/fonts/JameelNooriNastaleeq.ttf',
        './fonts/JameelNooriNastaleeq.ttf',
        'fonts/JameelNooriNastaleeq.ttf'
      ];

      for (const fontPath of fontPaths) {
        try {
          const response = await fetch(fontPath);
          
          if (response.ok) {
            const fontArrayBuffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(fontArrayBuffer);
            
            // Convert to base64 properly - handle large files in chunks
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
              const chunk = uint8Array.slice(i, i + chunkSize);
              binary += String.fromCharCode.apply(null, Array.from(chunk));
            }
            const fontBase64 = btoa(binary);
            
            
            // Add font to jsPDF
            try {
              doc.addFileToVFS('JameelNooriNastaleeq.ttf', fontBase64);
              doc.addFont('JameelNooriNastaleeq.ttf', 'JameelNooriNastaleeq', 'normal');
              
              // Also register bold variant (same font file)
              doc.addFont('JameelNooriNastaleeq.ttf', 'JameelNooriNastaleeq', 'bold');
              
              // Verify font was added
              const updatedFontList = doc.getFontList();
              
              if (updatedFontList && 'JameelNooriNastaleeq' in updatedFontList) {
                return true;
              } else {
                // Try alternative font name
                if (updatedFontList && Object.keys(updatedFontList).some(f => f.toLowerCase().includes('jameel'))) {
                  const altFontName = Object.keys(updatedFontList).find(f => f.toLowerCase().includes('jameel'));
                  return true;
                }
              }
            } catch (fontError) {
              throw fontError;
            }
          } else {
          }
        } catch (e) {
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  };

  // Handle Cancel Slip Generation
  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setShowProgressModal(false);
      setSlipsLoading(false);
      showToast('Fee slip generation cancelled', 'success');
    }
  };

  // Handle Generate Slips - Generate single PDF with all fee slips
  const handleGenerateSlips = async () => {
    setSlipsLoading(true);
    setShowProgressModal(true);
    setSlipProgress({ current: 0, total: 0, message: 'Initializing...' });
    
    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    
    try {
      // Check if it's a mobile device
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Filter out students with 0 remaining amount for slips
      const defaultersForSlips = filteredDefaulters.filter(defaulter => defaulter.remainingAmount > 0);
      
      // Check if there are any defaulters to generate slips for
      if (defaultersForSlips.length === 0) {
        showToast('No fee defaulters found to generate slips', 'success');
        setSlipsLoading(false);
        setShowProgressModal(false);
        return;
      }
      
      setSlipProgress({ current: 0, total: defaultersForSlips.length, message: 'Fetching school information...' });

      // Fetch school information
      const [{ data: profileData }, { data: schoolData }] = await Promise.all([
        supabase.from('institute_profile').select('*').eq('school_id', user.school_id).single(),
        supabase.from('schools').select('*').eq('id', user.school_id).single(),
      ]);

      const schoolInfo = {
        name: profileData?.name || schoolData?.name || 'AL-HARAM PUBLIC SCHOOL & IQRA ACADEMY',
        address: profileData?.address || schoolData?.address || 'BALU SHARIF DISTT. NOWSHERA',
        phone: profileData?.phone || schoolData?.contact || '0315 949830',
        logo_url: profileData?.logo_url || schoolData?.logo_url || null,
      };

      // Fetch sessions to get active session
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('id, name, is_active')
        .eq('school_id', user.school_id)
        .order('is_active', { ascending: false })
        .limit(1);

      const activeSession = sessionsData?.[0];

      // Create single PDF document
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Load Urdu font if needed
      setSlipProgress({ current: 0, total: defaultersForSlips.length, message: 'Loading fonts...' });
      let urduFontLoaded = false;
      if (messageLanguage === 'urdu') {
        urduFontLoaded = await loadUrduFont(doc);
        if (!urduFontLoaded) {
          showToast('Urdu font could not be loaded. Please ensure font file is in public/fonts/ folder.', 'error');
        } else {
          // Verify font is available
          const fontList = doc.getFontList();
        }
      }

      // OPTIMIZATION: Fetch all invoice and payment data in bulk upfront
      setSlipProgress({ current: 0, total: defaultersForSlips.length, message: 'Fetching fee data in bulk...' });
        
      const studentIds = defaultersForSlips.map(d => d.id);

      // Fetch all invoices for all students at once
      const { data: allInvoices, error: invoicesError } = await supabase
          .from('fee_invoices')
          .select(`
            id,
            student_id,
            session_id,
            month,
            year,
            total_amount,
            status,
            due_date,
            fee_invoice_items (
              id,
              fee_head_id,
              amount,
              fee_heads (
                id,
                name,
                description
              )
            )
          `)
          .eq('school_id', user.school_id)
        .in('student_id', studentIds)
          .order('year', { ascending: false })
          .order('month', { ascending: false });

        if (invoicesError) {
        throw invoicesError;
      }

      // Group invoices by student_id
      const invoicesByStudent: { [key: number]: any[] } = {};
      if (allInvoices) {
        for (const invoice of allInvoices) {
          if (!invoicesByStudent[invoice.student_id]) {
            invoicesByStudent[invoice.student_id] = [];
          }
          invoicesByStudent[invoice.student_id].push(invoice);
        }
        }

      // Fetch all payments for all students at once
      const invoiceIds = allInvoices?.map(inv => inv.id) || [];
      let paymentsByStudent: { [key: number]: any[] } = {};
      
      if (invoiceIds.length > 0) {
        const { data: allPayments, error: paymentsError } = await supabase
          .from('fee_payments')
          .select(`
            id,
            amount,
            invoice_id,
            fee_invoices!inner (
              student_id
            ),
            fee_payment_items (
              id,
              fee_item_id,
              amount
            )
          `)
          .eq('school_id', user.school_id)
          .in('invoice_id', invoiceIds);

        if (!paymentsError && allPayments) {
          for (const payment of allPayments) {
            // Handle both array and object types from Supabase
            const studentId = Array.isArray(payment.fee_invoices) 
              ? payment.fee_invoices[0]?.student_id 
              : (payment.fee_invoices as any)?.student_id;
            
            if (studentId) {
              if (!paymentsByStudent[studentId]) {
                paymentsByStudent[studentId] = [];
              }
              paymentsByStudent[studentId].push(payment);
            }
          }
        }
      }

      setSlipProgress({ current: 0, total: defaultersForSlips.length, message: 'Generating PDF slips...' });

      // Process each defaulter and add slip to PDF
      for (let i = 0; i < defaultersForSlips.length; i++) {
        const defaulter = defaultersForSlips[i];
        
        // Check if operation was cancelled
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Operation cancelled by user');
        }
        
        // Update progress
        setSlipProgress({ 
          current: i + 1, 
          total: defaultersForSlips.length, 
          message: `Generating slip for ${defaulter.name}...` 
        });
        
        // Allow React to update UI (small delay every 10 slips to improve responsiveness)
        if (i % 10 === 0) {
          await sleep(1);
        }
        
        // Add new page for each slip (except the first one)
        if (i > 0) {
          doc.addPage();
        }

        // Get pre-fetched data for this student
        const feeInvoices = invoicesByStudent[defaulter.id] || [];
        const paymentHistory = paymentsByStudent[defaulter.id] || [];

        // Calculate remaining items only - ensure only items with remaining > 0
        const remainingFeeItems: any[] = [];
        let totalRemainingAmount = 0;

        if (feeInvoices && feeInvoices.length > 0) {
          feeInvoices.forEach((invoice) => {
            invoice.fee_invoice_items?.forEach((item: any) => {
              const itemAmount = Number(item.amount || 0);
              
              // Calculate already paid amount for this specific fee item
              const alreadyPaid = paymentHistory?.reduce((sum, payment) => {
                if (payment.fee_payment_items) {
                  const itemPayment = payment.fee_payment_items.find(
                    (paymentItem: any) => paymentItem.fee_item_id === item.id
                  );
                  return sum + (itemPayment ? Number(itemPayment.amount || 0) : 0);
                }
                return sum;
              }, 0) || 0;
              
              const remainingItemAmount = Math.max(0, itemAmount - alreadyPaid);
              
              // Only include items that still need payment (remaining > 0)
              if (remainingItemAmount > 0) {
                const monthYear = invoice.month && invoice.year
                  ? `${invoice.month} ${invoice.year}`
                  : '-';
                
                remainingFeeItems.push({
                  name: item.fee_heads?.name || 'Unknown Fee Head',
                  monthYear,
                  amount: remainingItemAmount,
                });
                totalRemainingAmount += remainingItemAmount;
              }
            });
          });
        }

        // Skip this student if no remaining amount
        if (totalRemainingAmount <= 0) {
          continue;
        }

        // Header section - matching the image
        const headerY = 10;
        
        // School name - bold and centered (increased size)
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(schoolInfo.name, 105, headerY, { align: 'center' });

        // Contact info - centered (increased size)
        doc.setFontSize(13);
        doc.setFont('helvetica', 'normal');
        const contactText = schoolInfo.phone ? `${schoolInfo.address || ''} - ${schoolInfo.phone}` : schoolInfo.address || '';
        doc.text(contactText, 105, headerY + 8, { align: 'center' });

        // Separator line
        const separatorY = headerY + 16;
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0);
        doc.line(20, separatorY, 190, separatorY);

        // Main title - "Remaining Fee Slip"
        const titleY = separatorY + 10;
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Remaining Fee Slip', 105, titleY, { align: 'center' });

        // Student details section - 3 column table
        const detailsY = titleY + 10;
        
        // Student details table - Name, Father, Class
        const studentDetailsData = [
          [`${getStudentDisplayId(defaulter)} - ${defaulter.name}`, defaulter.father_name || '-', `${getClassName(defaulter.class_id)}${getSectionName(defaulter.section_id) ? ` (${getSectionName(defaulter.section_id)})` : ''}`]
        ];

        autoTable(doc, {
          startY: detailsY,
          head: [['Name', 'Father', 'Class']],
          body: studentDetailsData,
          margin: { left: 20, right: 20 },
          tableWidth: 170,
          styles: { 
            fontSize: 12, 
            cellPadding: 4,
            lineColor: [0, 0, 0],
            lineWidth: 0.5,
            textColor: [0, 0, 0]
          },
          headStyles: { 
            fillColor: [240, 240, 240], 
            textColor: [0, 0, 0], 
            fontStyle: 'bold',
            fontSize: 12,
            lineWidth: 0.5,
            cellPadding: 2,
            minCellHeight: 5,
            halign: 'center'
          },
          columnStyles: {
            0: { cellWidth: 70, halign: 'center' },
            1: { cellWidth: 55, halign: 'center' },
            2: { cellWidth: 45, halign: 'center' }
          },
          theme: 'grid',
        });

        let yPos = (doc as any).lastAutoTable.finalY + 10;

        // Fee Details title - centered on light gray background
        const feeTitleY = yPos;
        doc.setFillColor(240, 240, 240);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.rect(20, feeTitleY - 6, 170, 8, 'FD');
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Fee Details', 105, feeTitleY, { align: 'center' });

        // Fee details table - Sno, Fee Items, Amounts
        if (remainingFeeItems.length > 0) {
          const feeTableData = remainingFeeItems.map((item, idx) => [
            (idx + 1).toString(),
            `${item.name} (${item.monthYear})`,
            formatCurrency(item.amount)
          ]);

          // Ensure exactly 15 data rows (add empty rows if needed)
          const targetRows = 15;
          const currentRows = feeTableData.length;
          const emptyRowsNeeded = Math.max(0, targetRows - currentRows);
          
          for (let i = 0; i < emptyRowsNeeded; i++) {
            feeTableData.push(['', '', '']);
          }

          // Add total row (will be styled with didDrawCell)
          feeTableData.push([
            '',
            'Total',
            formatCurrency(totalRemainingAmount)
          ]);

          autoTable(doc, {
            startY: feeTitleY + 4,
            head: [['Sno', 'Particulars', 'Amounts']],
            body: feeTableData,
            margin: { left: 20, right: 20 },
            tableWidth: 170,
            styles: { 
              fontSize: 12, 
              cellPadding: 2,
              lineColor: [0, 0, 0],
              lineWidth: 0.3,
              textColor: [0, 0, 0],
              minCellHeight: 5
            },
            headStyles: { 
              fillColor: [240, 240, 240], 
              textColor: [0, 0, 0], 
              fontStyle: 'bold',
              fontSize: 12,
              lineWidth: 0.3,
              cellPadding: 2,
              minCellHeight: 5
            },
            columnStyles: {
              0: { cellWidth: 20, halign: 'center' }, // Center Sno column
              1: { cellWidth: 100, halign: 'left' },
              2: { cellWidth: 50, halign: 'center' } // Center Amounts column
            },
            theme: 'grid', // Simple grid theme with normal borders
            didParseCell: (data: any) => {
              const rowIndex = data.row.index;
              const isTotalRow = rowIndex === feeTableData.length - 1;
              const isHeaderRow = rowIndex === -1; // Header row has index -1
              
              // Handle header alignment - center Sno and Amounts, keep Particulars left
              if (isHeaderRow) {
                if (data.column.index === 0 || data.column.index === 2) {
                  data.cell.styles.halign = 'center';
                } else if (data.column.index === 1) {
                  data.cell.styles.halign = 'left';
                }
              }
              
              // Set background color for total row so autoTable draws borders on top
              if (isTotalRow) {
                data.cell.styles.fillColor = [240, 240, 240];
                data.cell.styles.fontStyle = 'bold';
                // Center the "Total" text in the Particulars column (column 1)
                if (data.column.index === 1) {
                  data.cell.styles.halign = 'center';
                }
              }
            },
            didDrawCell: (data: any) => {
              const rowIndex = data.row.index;
              const isEmptyRow = rowIndex >= 0 && 
                                 rowIndex < feeTableData.length - 1 &&
                                 feeTableData[rowIndex][0] === '' && 
                                 feeTableData[rowIndex][1] === '' && 
                                 feeTableData[rowIndex][2] === '';
              
              // Handle empty rows - no text
              if (isEmptyRow) {
                return true;
              }
              
              // Let autoTable handle everything (header, data rows, footer, borders)
              return false;
            }
          });

          yPos = (doc as any).lastAutoTable.finalY + 10;
        }

        // Message section - proper message text (ensure it fits on page)
        const maxMessageY = 270; // Maximum Y position to ensure it fits on A4 (297mm height)
        const messageY = Math.min(yPos, maxMessageY);
        
        // Select message based on language
        let messageText = '';
        
        if (messageLanguage === 'urdu') {
          // Urdu message - render to canvas and embed as image
          messageText = ` محترم والدین، آپ کی ہر کاوش آپ کے بچے کی تعلیم میں سرمایہ کاری ہے اور یہ ان کا مستقبل بناتی ہے۔  فیس کی بروقت ادائیگی آپ کے بچے کی صلاحیتوں کو کھولنے اور ان کے مستقبل کو روشن  بنانے کی طرف ایک قدم ہے۔ بروقت ادائیگی آپ کے بچے کے لیے معیاری تعلیم کو برقرار رکھنے میں مدد کرتی ہے۔ براہ کرم جلد از جلد بقایا جات ادا کریں تاکہ غیر منقطع تعلیم اور مسلسل عمدگی کو یقینی بنایا جا سکے۔ ہم اور آپ مل کر کل کے رہنما بنا رہے ہیں۔ اس سفر میں آپ کی شراکت انمول ہے۔ آپ کی مسلسل حمایت اور اپنے بچے کی کامیابی کے لیے عزم کا شکریہ!`;
          
          try {
            // Same page constraints as English: max Y position is 279mm (leaving space for date)
            const maxMessageY = 279; // Same as English version
            const availableHeight = maxMessageY - messageY;
            
            // Try with initial font size first (similar to English's initialFontSize)
            let fontSize = 20;
            let imageData = await renderUrduTextToImage(messageText, 190, fontSize);
            
            // Calculate image dimensions
            const img = new Image();
            img.src = imageData;
            
            await new Promise((resolve) => {
              img.onload = () => {
                // Calculate dimensions in mm (canvas is 2x scale, so divide by 2 and convert px to mm)
                const imgHeightMm = (img.height / 2) / 3.779527559; // Convert from pixels to mm
                
                // If it doesn't fit, reduce font size (similar to English's reducedFontSize logic)
                if (imgHeightMm > availableHeight) {
                  // Reduce font size proportionally to fit
                  fontSize = Math.max(14, Math.floor(fontSize * (availableHeight / imgHeightMm)));
                  // Re-render with smaller font
                  renderUrduTextToImage(messageText, 190, fontSize).then((newImageData) => {
                    const newImg = new Image();
                    newImg.src = newImageData;
                    newImg.onload = () => {
                      const finalHeightMm = (newImg.height / 2) / 3.779527559;
                      const finalWidthMm = 190;
                      const xPos = (210 - finalWidthMm) / 2; // A4 width is 210mm
                      
                      // Ensure final height doesn't exceed available space (same constraint as English)
                      const finalHeight = Math.min(finalHeightMm, availableHeight);
                      
                      // Add image to PDF
                      doc.addImage(newImageData, 'PNG', xPos, messageY, finalWidthMm, finalHeight);
                      resolve(null);
                    };
                    newImg.onerror = () => resolve(null);
                  }).catch(() => resolve(null));
                } else {
                  // Fits with initial size - use it directly
                  const finalWidthMm = 190;
                  const xPos = (210 - finalWidthMm) / 2; // A4 width is 210mm
                
                // Add image to PDF
                  doc.addImage(imageData, 'PNG', xPos, messageY, finalWidthMm, imgHeightMm);
                resolve(null);
                }
              };
              img.onerror = () => {
                resolve(null);
              };
            });
          } catch (error) {
            // Fallback to English if Urdu rendering fails
            messageText = `Dear Parents, your investment in your child's education today shapes their tomorrow. Every fee payment is a step towards unlocking your child's potential and building a brighter future. We understand the importance of timely payments in maintaining the quality education your child deserves. Please clear the outstanding dues as soon as possible to ensure uninterrupted learning and continued excellence. Together, we are building the leaders of tomorrow. Your partnership in this journey is invaluable. Thank you for your continued support and commitment to your child's success!`;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            const splitText = doc.splitTextToSize(messageText, 190);
            const lineHeight = 5;
            splitText.forEach((line: string, index: number) => {
              const lineY = messageY + (index * lineHeight);
              if (lineY < 279) { // Same constraint as English
                doc.text(line, 105, lineY, { align: 'center' });
              }
            });
          }
        } else {
          // English message - render directly with jsPDF
          let messageText = `Dear Parents, your investment in your child's education today shapes their tomorrow. Every fee payment is a step towards unlocking your child's potential and building a brighter future. We understand the importance of timely payments in maintaining the quality education your child deserves. Please clear the outstanding dues as soon as possible to ensure uninterrupted learning and continued excellence. Together, we are building the leaders of tomorrow. Your partnership in this journey is invaluable. Thank you for your continued support and commitment to your child's success!`;
          
          const initialFontSize = 14;
          const initialLineHeight = 5.5; // Slightly increased to match larger font
          const reducedFontSize = 12;
          const reducedLineHeight = 5;

          doc.setTextColor(0, 0, 0);
          
          const boldPhrase = "Dear Parents!";
          let currentY = messageY; // Start Y for the message block

          // 1. Render "Dear Parents!" in bold and centered
          doc.setFontSize(initialFontSize);
          doc.setFont('helvetica', 'bold');
          doc.text(boldPhrase, 105, currentY, { align: 'center' }); // Center align bold phrase
          currentY += initialLineHeight; // Move to next line for the rest of the message

          // 2. Prepare the remaining message for centered rendering
          let remainingMessage = messageText;
          if (messageText.startsWith(boldPhrase)) {
            remainingMessage = messageText.substring(boldPhrase.length).trim();
          }

          doc.setFont('helvetica', 'normal'); // Reset to normal font for the rest
          
          const splitText = doc.splitTextToSize(remainingMessage, 190);
          const remainingMessageHeight = splitText.length * initialLineHeight;
          
          // Check if remaining message fits on page, if not, reduce font size
          if (currentY + remainingMessageHeight > 279) { // Leave space for date at bottom
            doc.setFontSize(reducedFontSize);
            splitText.forEach((line: string, index: number) => {
              const lineY = currentY + (index * reducedLineHeight);
              if (lineY < 279) { // Leave space for date at bottom
                doc.text(line, 105, lineY, { 
                  align: 'center', 
                maxWidth: 190 
                });
              }
            });
          } else {
            doc.setFontSize(initialFontSize); // Ensure font size is set for this path too
            splitText.forEach((line: string, index: number) => {
              doc.text(line, 105, currentY + (index * initialLineHeight), { 
                align: 'center', 
                maxWidth: 190 
              });
            });
          }
        }
        
        // Add date at the bottom right of the page (small font)
        const currentDate = new Date();
        const day = currentDate.getDate().toString().padStart(2, '0');
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const month = months[currentDate.getMonth()];
        const year = currentDate.getFullYear();
        const dateString = `${day} ${month}, ${year}`;
        
        doc.setFontSize(11); // Date font size
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(dateString, 190, 285, { align: 'right' }); // Right-aligned, near right margin
      }

      // Save single PDF file
      setSlipProgress({ 
        current: defaultersForSlips.length, 
        total: defaultersForSlips.length, 
        message: 'Finalizing PDF document...' 
      });
      await sleep(100);
      
      const formatDateForFileName = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      };

      const fileName = `Fee_Slips_${formatDateForFileName(new Date())}.pdf`;
      
      setSlipProgress({ 
        current: defaultersForSlips.length, 
        total: defaultersForSlips.length, 
        message: 'Saving PDF file...' 
      });
      await sleep(100);
      
      if (isMobileDevice) {
        // For mobile devices, use Capacitor Filesystem API approach
        try {
          const pdfBase64 = doc.output('datauristring').split(',')[1];
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const mobileFileName = `fee-slips-${timestamp}.pdf`;

          if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
            try {
              await window.Capacitor.Plugins.Filesystem.writeFile({
                path: mobileFileName,
                data: pdfBase64,
                directory: 'DOCUMENTS'
              });

              const uriResult = await window.Capacitor.Plugins.Filesystem.getUri({
                path: mobileFileName,
                directory: 'DOCUMENTS'
              });

              showToast(`PDF saved successfully as ${mobileFileName}`, 'success');
              window.open(uriResult.uri, '_blank');
            } catch (fsError) {
              doc.save(mobileFileName);
              showToast('PDF downloaded successfully!', 'success');
            }
          } else {
            const pdfBlob = doc.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('PDF downloaded successfully!', 'success');
          }
        } catch (error) {
          showToast('Failed to export PDF on mobile. Please try on desktop.', 'error');
        }
      } else {
        // For desktop, use the standard approach
        doc.save(fileName);
        showToast(`Generated ${defaultersForSlips.length} fee slip(s) in single PDF successfully!`, 'success');
      }
    } catch (error) {
      // Don't show error toast if user cancelled the operation
      if (error instanceof Error && error.message === 'Operation cancelled by user') {
        // Already handled in handleCancelGeneration
      } else {
      showToast('Failed to generate slips: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
      }
    } finally {
      setSlipsLoading(false);
      setShowProgressModal(false);
      setSlipProgress({ current: 0, total: 0, message: '' });
      // Clear abort controller
      abortControllerRef.current = null;
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalDefaulters = defaulters.length;
    const totalAmount = defaulters.reduce((sum, defaulter) => sum + defaulter.remainingAmount, 0);
    const averageAmount = totalDefaulters > 0 ? totalAmount / totalDefaulters : 0;
    
    return {
      totalDefaulters,
      totalAmount,
      averageAmount
    };
  }, [defaulters]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      startProgress(false);
      setProgress(10);
      setLoading(true);
      
      try {
        const [{ data: studentsData }, { data: classesData }, { data: allSectionsData }] = await Promise.all([
          supabase.from('students').select('id, name, father_name, class_id, section_id, picture_url, roll_number').eq('status', 'active').eq('school_id', user.school_id),
          supabase.from('classes').select('id, name').eq('school_id', user.school_id),
          supabase.from('sections').select('id, name, class_id').eq('school_id', user.school_id),
        ]);
        
        
        if (studentsData) setStudents(studentsData);
        if (classesData) {
          // Sort classes using the utility function
          const sortedClasses = sortClasses(classesData);
          setClasses(sortedClasses);
        }
        if (allSectionsData) setSections(allSectionsData);
        
        setProgress(100);
        completeProgress();
      } catch (err: any) {
        setError('Failed to load initial data: ' + (err.message || 'Unknown error'));
        completeProgress();
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [user?.school_id]);

  // Filter sections for dropdown when class is selected
  const filteredSections = useMemo(() => {
    if (!selectedClass) return [];
    const filtered = sections.filter(section => section.class_id === Number(selectedClass));
    return filtered;
  }, [sections, selectedClass]);

  // Reset section selection when class changes
  useEffect(() => {
    setSelectedSection('');
  }, [selectedClass]);

  // Load fee defaulters data
  useEffect(() => {
    if (students.length === 0) return;

    const loadFeeDefaulters = async () => {
      setLoadingData(true);
      setError(null);
      
      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        setLoadingData(false);
      }, 10000); // 10 seconds timeout (should be much faster now)
      
      try {
        const defaulterData = [];
        let processedCount = 0;
        
        // First, let's check if fee_invoices table exists and has data
        const { data: testInvoices, error: testError } = await supabase
          .from('fee_invoices')
          .select('id, total_amount')
          .limit(1);
        
        if (testError) {
          // If no fee invoices table, show empty list (no fee system configured)
          setDefaulters([]);
          return;
        }
        
        
        // Much more efficient approach: Get all data in bulk queries
        
        // Get all fee invoices for all students at once
        const studentIds = students.map(s => s.id);
        const { data: allInvoices, error: invoicesError } = await supabase
          .from('fee_invoices')
          .select('id, student_id, total_amount')
          .eq('school_id', user.school_id)
          .in('student_id', studentIds);
        
        
        // Get all payments for all invoices at once
        let allPayments: any[] = [];
        if (allInvoices && allInvoices.length > 0) {
          const invoiceIds = allInvoices.map(inv => inv.id);
          const { data: payments, error: paymentsError } = await supabase
            .from('fee_payments')
            .select('invoice_id, amount')
            .eq('school_id', user.school_id)
            .in('invoice_id', invoiceIds);
          
          if (!paymentsError) {
            allPayments = payments || [];
          }
        }
        
        // Process the data locally (much faster)
        
        // Group invoices by student_id
        const invoicesByStudent: { [key: string]: any[] } = {};
        if (allInvoices) {
          for (const invoice of allInvoices) {
            if (!invoicesByStudent[String(invoice.student_id)]) {
              invoicesByStudent[String(invoice.student_id)] = [];
            }
            invoicesByStudent[String(invoice.student_id)].push(invoice);
          }
        }
        
        // Group payments by invoice_id
        const paymentsByInvoice: { [key: string]: any[] } = {};
        for (const payment of allPayments) {
          if (!paymentsByInvoice[String(payment.invoice_id)]) {
            paymentsByInvoice[String(payment.invoice_id)] = [];
          }
          paymentsByInvoice[String(payment.invoice_id)].push(payment);
        }
        
        // Process each student
        for (const student of students) {
          const studentInvoices = invoicesByStudent[String(student.id)] || [];
          
          if (studentInvoices.length > 0) {
            let totalFeeAmount = 0;
            let totalPaidAmount = 0;
            
            // Calculate total fee amount
            for (const invoice of studentInvoices) {
              totalFeeAmount += Number(invoice.total_amount || 0);
              
              // Calculate payments for this invoice
              const invoicePayments = paymentsByInvoice[String(invoice.id)] || [];
              for (const payment of invoicePayments) {
                totalPaidAmount += Number(payment.amount || 0);
              }
            }
            
            const remainingAmount = totalFeeAmount - totalPaidAmount;
            
            // Only include students with remaining amount > 0
            if (remainingAmount > 0) {
              defaulterData.push({
                ...student,
                totalFeeAmount,
                totalPaidAmount,
                remainingAmount
              });
            }
          }
        }
        
        // Sort by class first (using classUtils), then by remaining amount (highest first)
        defaulterData.sort((a, b) => {
          // First sort by class using classUtils
          const classA = classes.find(c => c.id === a.class_id);
          const classB = classes.find(c => c.id === b.class_id);
          
          if (classA && classB) {
            const classComparison = sortClasses([classA, classB]);
            if (classComparison[0].id !== classA.id) {
              return 1; // classB comes before classA
            } else if (classComparison[0].id !== classB.id) {
              return -1; // classA comes before classB
            }
          }
          
          // If same class or no class info, sort by remaining amount (highest first)
          return b.remainingAmount - a.remainingAmount;
        });
        
        
        // If no defaulters found, show empty list (no students with outstanding fees)
        if (defaulterData.length === 0) {
          setDefaulters([]);
        } else {
          setDefaulters(defaulterData);
        }
      } catch (err: any) {
        setError('Failed to load fee defaulters. Please check if fee data is properly configured.');
        setDefaulters([]);
      } finally {
        clearTimeout(timeoutId);
        setLoadingData(false);
      }
    };

    loadFeeDefaulters();
  }, [students, user?.school_id]);

  // Filter defaulters based on search
  const filteredDefaulters = useMemo(() => {
    let filtered = defaulters;
    
    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(defaulter => {
        const nameMatch = defaulter.name.toLowerCase().includes(searchLower);
        const fatherMatch = defaulter.father_name?.toLowerCase().includes(searchLower);
        const idMatch = matchesStudentSearch(defaulter, search);
        const classMatch = getClassName(defaulter.class_id).toLowerCase().includes(searchLower);
        const sectionMatch = getSectionName(defaulter.section_id).toLowerCase().includes(searchLower);
        return nameMatch || fatherMatch || idMatch.matches || classMatch || sectionMatch;
      });
    }
    
    // Apply class filter
    if (selectedClass) {
      filtered = filtered.filter(defaulter => String(defaulter.class_id) === selectedClass);
    }
    
    // Apply section filter
    if (selectedSection) {
      filtered = filtered.filter(defaulter => String(defaulter.section_id) === selectedSection);
    }
    
    return filtered;
  }, [defaulters, search, selectedClass, selectedSection, classes, sections]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalDefaulters = filteredDefaulters.length;
    const totalOutstanding = filteredDefaulters.reduce((sum, defaulter) => sum + (defaulter.remainingAmount || 0), 0);
    
    return {
      totalDefaulters,
      totalOutstanding
    };
  }, [filteredDefaulters]);

  // Handle refresh
  const handleRefresh = async () => {
    setLoadingData(true);
    setError(null);
    
    try {
      // Reload students data
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, father_name, class_id, section_id, picture_url, roll_number')
        .eq('status', 'active')
        .eq('school_id', user.school_id);
      
      if (studentsError) throw studentsError;
      
      if (studentsData) {
        setStudents(studentsData);
        showToast('Data refreshed successfully!', 'success');
      }
    } catch (err: any) {
      setError('Failed to refresh data: ' + (err.message || 'Unknown error'));
      showToast('Failed to refresh data', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <TableArea>
          <LoadingContainer>
            <Refresh style={{ marginRight: '0.5rem' }} />
            Loading fee defaulters...
          </LoadingContainer>
        </TableArea>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <TableArea>
          <ErrorContainer>
            <Info style={{ marginRight: '0.5rem' }} />
            {error}
          </ErrorContainer>
        </TableArea>
      </PageContainer>
    );
  }

  if (students.length === 0) {
    return <NoStudentsFound />;
  }

  return (
    <PageContainer>
      <Header>
        <HeaderTopRow>
        <Title>
          💰 Fee Defaulters List
        </Title>
          
          {/* Desktop layout - all fields in one row */}
          <DesktopSegmentedGroup>
            <SegmentedGroup>
              <SegmentedSearchInput
              type="text"
              placeholder="Search by name, father's name, ID, class, or section..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
                first
            />
              
              <SegmentedSelect
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
              </SegmentedSelect>
              
              {selectedClass && (
                <SegmentedSelect
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
                  $isSection={true}
          >
            <option value="">All Sections</option>
                  {filteredSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
                </SegmentedSelect>
              )}
              
              <SegmentedButton
                onClick={handleExportPDF}
                disabled={exportLoading}
                $isPdf={true}
              >
                {exportLoading ? (
                  <div style={{ 
                    width: 16, 
                    height: 16, 
                    border: '2px solid #e0e7ff', 
                    borderTop: '2px solid #4a6cf7', 
                    borderRadius: '50%', 
                    animation: 'spin 1s linear infinite' 
                  }} />
                ) : (
                  <PictureAsPdf style={{ fontSize: 16 }} />
                )}
                {exportLoading ? 'Exporting...' : 'PDF'}
              </SegmentedButton>
              
              <SegmentedButton
                onClick={handleGenerateSlips}
                disabled={slipsLoading}
                $isPdf={true}
              >
                {slipsLoading ? (
                  <div style={{ 
                    width: 16, 
                    height: 16, 
                    border: '2px solid #e0e7ff', 
                    borderTop: '2px solid #4a6cf7', 
                    borderRadius: '50%', 
                    animation: 'spin 1s linear infinite' 
                  }} />
                ) : (
                  <ReceiptIcon style={{ fontSize: 16 }} />
                )}
                {slipsLoading ? 'Generating...' : 'Slips'}
              </SegmentedButton>
              
              <SegmentedButton
                onClick={() => setMessageLanguage(messageLanguage === 'english' ? 'urdu' : 'english')}
                last
                style={{ 
                  minWidth: '80px',
                  fontSize: '12px',
                  padding: '4px 8px'
                }}
              >
                {messageLanguage === 'english' ? 'EN' : 'اردو'}
              </SegmentedButton>
            </SegmentedGroup>
          </DesktopSegmentedGroup>
        </HeaderTopRow>
        
        <HeaderBottomRow>
          {/* Mobile layout - search and filters in separate rows */}
          <MobileHeaderLayout>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <SegmentedButton
                onClick={handleExportPDF}
                disabled={exportLoading}
                $isPdf={true}
              >
                {exportLoading ? (
                  <div style={{ 
                    width: 16, 
                    height: 16, 
                    border: '2px solid #e0e7ff', 
                    borderTop: '2px solid #4a6cf7', 
                    borderRadius: '50%', 
                    animation: 'spin 1s linear infinite' 
                  }} />
                ) : (
                  <PictureAsPdf style={{ fontSize: 18 }} />
                )}
                {exportLoading ? 'Exporting...' : 'PDF'}
              </SegmentedButton>
              
              <SegmentedButton
                onClick={handleGenerateSlips}
                disabled={slipsLoading}
                $isPdf={true}
              >
                {slipsLoading ? (
                  <div style={{ 
                    width: 16, 
                    height: 16, 
                    border: '2px solid #e0e7ff', 
                    borderTop: '2px solid #4a6cf7', 
                    borderRadius: '50%', 
                    animation: 'spin 1s linear infinite' 
                  }} />
                ) : (
                  <ReceiptIcon style={{ fontSize: 18 }} />
                )}
                {slipsLoading ? 'Generating...' : 'Slips'}
              </SegmentedButton>
              
              <SegmentedButton
                onClick={() => setMessageLanguage(messageLanguage === 'english' ? 'urdu' : 'english')}
                style={{ 
                  minWidth: '70px',
                  fontSize: '12px',
                  padding: '4px 8px'
                }}
              >
                {messageLanguage === 'english' ? 'EN' : 'اردو'}
              </SegmentedButton>
        </div>
            <MobileRow>
              <SegmentedGroup>
                <SegmentedSearchInput
                  type="text"
                  placeholder="Search by name, father's name, ID, class, or section..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ flex: '1', minWidth: 0 }}
                  first
                />
                
                <SegmentedSelect
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  style={{ flex: '1', minWidth: 0 }}
                >
                  <option value="">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </SegmentedSelect>
                
                {selectedClass && (
                  <SegmentedSelect
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    $isSection={true}
                    style={{ flex: '1', minWidth: 0 }}
                    last
                  >
                    <option value="">All Sections</option>
                    {filteredSections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </SegmentedSelect>
                )}
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
                <CenterTh>ID</CenterTh>
                <Th style={{ textAlign: 'left' }}>Name</Th>
                <Th style={{ textAlign: 'left' }}>Father</Th>
                <CenterTh>Class (Section)</CenterTh>
                <CenterTh>Total Amount</CenterTh>
                <CenterTh>Action</CenterTh>
              </tr>
            </thead>
            <tbody>
              {loadingData ? (
                <tr><CenterTd colSpan={7}>Loading fee defaulters...</CenterTd></tr>
              ) : filteredDefaulters.length === 0 ? (
                <tr><CenterTd colSpan={7}>No fee defaulters found. All students have paid their fees or have no outstanding amounts.</CenterTd></tr>
              ) : (
                filteredDefaulters.map((defaulter, idx) => (
                  <tr 
                    key={defaulter.id}
                    onClick={() => handleViewDetails(defaulter)}
                    style={{
                      cursor: 'pointer'
                    }}
                  >
                    <CenterTd>{idx + 1}</CenterTd>
                    <CenterTd>{getStudentDisplayId(defaulter)}</CenterTd>
                    <LeftTd
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        minWidth: 120,
                        width: '100%',
                        maxWidth: 340,
                        ...(window.innerWidth <= 700 ? { minWidth: 240, maxWidth: 600 } : {})
                      }}
                    >
                      <Avatar data-avatar>
                        {defaulter.picture_url ? (
                          <img src={defaulter.picture_url} alt="" />
                        ) : (
                          <AccountCircle style={{ fontSize: '1.3rem' }} />
                        )}
                      </Avatar>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                        <span style={{ fontWeight: 600 }}>{defaulter.name}</span>
                      </div>
                    </LeftTd>
                    <LeftTd>{defaulter.father_name || '-'}</LeftTd>
                    <CenterTd>{getClassName(defaulter.class_id)} ({getSectionName(defaulter.section_id)})</CenterTd>
                    <CenterTd style={{ color: '#ef4444', fontWeight: 700 }}>
                      Rs. {formatCurrency(defaulter.remainingAmount)}
                    </CenterTd>
                    <CenterTd>
                      <DetailsButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(defaulter);
                        }}
                        title="View fee details and collect payment"
                      >
                        <DetailsIcon />
                        Details
                      </DetailsButton>
                    </CenterTd>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </TableWrapper>
        </TableArea>
      </MainContent>
      
      <Footer>
        <SummaryStats>
          <StatItem>
            <StatValue $type="total">{summary.totalDefaulters}</StatValue>
            <StatLabel>Total Defaulters</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue $type="average">Rs. {formatCurrency(summary.totalOutstanding)}</StatValue>
            <StatLabel>Total Outstanding</StatLabel>
          </StatItem>
        </SummaryStats>
      </Footer>

      {/* Right-side Panel */}
      <PanelOverlay $isOpen={isPanelOpen} onClick={handleClosePanel}>
      <PanelContainer $isOpen={isPanelOpen} onClick={(e) => e.stopPropagation()}>
        <PanelHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            {/* Student Avatar */}
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: (theme as any).ACCENT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.4rem',
              fontWeight: '600',
              flexShrink: 0,
              overflow: 'hidden'
            }}>
              {selectedStudent?.picture_url ? (
                <img 
                  src={selectedStudent.picture_url} 
                  alt={selectedStudent.name}
                  style={{ 
                    width: '120%', 
                    height: '120%', 
                    objectFit: 'cover', 
                    borderRadius: '50%',
                    transform: 'scale(1.1)',
                    margin: '-10%'
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const nextSibling = e.currentTarget.nextSibling as HTMLElement;
                    if (nextSibling) {
                      nextSibling.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div 
                style={{ 
                  display: selectedStudent?.picture_url ? 'none' : 'flex',
                  width: '100%', 
                  height: '100%', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: 'inherit',
                  color: 'inherit',
                  fontWeight: 'inherit',
                  fontSize: 'inherit'
                }}
              >
                {selectedStudent?.name?.charAt(0) || 'S'}
              </div>
            </div>
            
            {/* Student Details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontSize: '1rem', 
                fontWeight: '600',
                color: (theme as any).TEXT_PRIMARY,
                marginBottom: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {selectedStudent ? getStudentDisplayId(selectedStudent) : ''} - {selectedStudent?.name} - {selectedStudent?.father_name || 'N/A'}
              </div>
              <div style={{ 
                fontSize: '0.9rem', 
                color: (theme as any).TEXT_SECONDARY,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {selectedStudent ? getClassName(selectedStudent.class_id) : ''} ({selectedStudent ? getSectionName(selectedStudent.section_id) : ''})
              </div>
            </div>
          </div>
          
          <CloseButton onClick={handleClosePanel}>
            <CloseIcon />
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
          ) : (
            <>
              {/* Remaining Fee Items Section */}
              <SectionContainer>
                <SectionTitle>
                  💰 Remaining Fee Items
                </SectionTitle>
                {studentFeeDetails?.remainingFeeItems?.length > 0 ? (
                  <>
                    {studentFeeDetails.remainingFeeItems.map((item: any, index: number) => (
                      <FeeItem key={index}>
                        <FeeItemName>{item.name}</FeeItemName>
                        <FeeItemAmount>Rs. {item.amount.toLocaleString()}</FeeItemAmount>
                      </FeeItem>
                    ))}
                    <div style={{ 
                      marginTop: '12px', 
                      padding: '12px', 
                      background: (theme as any).BG === '#252525' ? '#333' : '#f0f9ff',
                      borderRadius: '6px',
                      border: `1px solid ${(theme as any).ACCENT}20`
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        fontWeight: '600',
                        color: (theme as any).ACCENT
                      }}>
                        <span>Total Outstanding:</span>
                        <span>Rs. {studentFeeDetails.totalRemaining.toLocaleString()}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <PanelEmptyState>No outstanding fees</PanelEmptyState>
                )}
              </SectionContainer>

              {/* Payment History Section */}
              <SectionContainer>
                <SectionTitle>
                  📋 Payment History
                </SectionTitle>
                {studentPaymentHistory?.length > 0 ? (
                  <>
                    {studentPaymentHistory.map((payment: any, index: number) => (
                      <PaymentItem key={index}>
                        <div>
                          <PaymentDate>
                            {new Date(payment.payment_date).toLocaleDateString('en-GB')}
                          </PaymentDate>
                            <div style={{ fontSize: '0.8rem', color: (theme as any).TEXT_SECONDARY, marginTop: '2px' }}>
                            {payment.payment_mode || 'Cash'} • {payment.remarks || 'No remarks'}
                          </div>
                        </div>
                        <PaymentAmount>Rs. {payment.amount.toLocaleString()}</PaymentAmount>
                      </PaymentItem>
                    ))}
                    <div style={{ 
                      marginTop: '12px', 
                      padding: '12px', 
                      background: (theme as any).BG === '#252525' ? '#333' : '#f0fdf4',
                      borderRadius: '6px',
                      border: '1px solid #10b98120'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        fontWeight: '600',
                        color: '#10b981'
                      }}>
                        <span>Total Paid:</span>
                        <span>Rs. {studentPaymentHistory.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <PanelEmptyState>No payment history found</PanelEmptyState>
                )}
              </SectionContainer>
            </>
          )}
        </PanelContent>
      </PanelContainer>
    </PanelOverlay>

      {/* Progress Modal for Slip Generation - Rendered using Portal */}
      {showProgressModal && ReactDOM.createPortal(
        <ProgressModalOverlay $isOpen={showProgressModal}>
          <ProgressModalContainer>
            <ProgressModalTitle>
              <ReceiptIcon style={{ fontSize: '2rem', color: '#4a6cf7' }} />
              Generating Fee Slips
            </ProgressModalTitle>
            
            <SpinnerContainer>
              <Spinner />
            </SpinnerContainer>
            
            <ProgressText>
              {slipProgress.current} of {slipProgress.total} slips generated
            </ProgressText>
            
            <ProgressBarContainer>
              <ProgressBarFill 
                $progress={slipProgress.total > 0 ? (slipProgress.current / slipProgress.total) * 100 : 0} 
              />
            </ProgressBarContainer>
            
            <ProgressMessage>
              {slipProgress.message}
            </ProgressMessage>
            
            <div style={{ 
              marginTop: '24px', 
              padding: '16px', 
              background: (theme as any).BG === '#252525' ? '#2a2a2a' : '#f0f9ff',
              borderRadius: '8px',
              textAlign: 'center',
              color: (theme as any).TEXT_SECONDARY,
              fontSize: '0.9rem'
            }}>
              <strong style={{ color: (theme as any).TEXT_PRIMARY }}>Please wait...</strong>
              <br />
              Do not close this window or navigate away.
              <br />
              This process may take a few minutes for large batches.
            </div>

            <CancelButton onClick={handleCancelGeneration}>
              <CloseIcon style={{ fontSize: '1.2rem' }} />
              Cancel Generation
            </CancelButton>
          </ProgressModalContainer>
        </ProgressModalOverlay>,
        document.body
      )}
    </PageContainer>
  );
};

export default FeeDefaultersList;
