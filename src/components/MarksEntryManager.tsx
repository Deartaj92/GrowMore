import React, { useState, useEffect, useContext, useMemo, useCallback, memo, useRef } from 'react';
import styled, { keyframes, DefaultTheme, css } from 'styled-components';
import { sortClasses } from '../utils/classUtils';
import { getStudentDisplayId } from '../utils/studentUtils';

// Spinner animation
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// Spinner component
const Spinner = styled.div`
  width: 12px;
  height: 12px;
  border: 2px solid #ffffff40;
  border-top: 2px solid #ffffff;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';
import { useActivityTracking } from '../hooks/useActivityTracking';
import { useTheme } from '@mui/material';
import { ThemeProvider } from 'styled-components';
import { usePageFooter } from './Layout/contexts/PageFooterContext';
import { examinationService } from '../services/examinationService';
import { Examination, ExamResult, ExamSubject, BulkMarksEntryDTO } from '../types/examinations';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLoading } from '../contexts/LoadingContext';
import {
  Assessment as AssessmentIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  CalendarToday as CalendarIcon,
  School as SchoolIcon,
  Close as CloseIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  PictureAsPdf,
  Print as PrintIcon,
  Save as SaveIcon,
  Upload as UploadIcon,
  Check as CheckIcon,
  Cancel as CancelIcon,
  Group as GroupIcon,
  Class as ClassIcon,
  Subject as SubjectIcon,
} from '@mui/icons-material';
import { Textfit } from '@techstack/react-textfit';
import GlowingCards, { GlowingCard } from './ui/glowing-cards';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// TypeScript declaration for Capacitor (for mobile PDF export)
declare global {
  interface Window {
    Capacitor?: {
      Plugins: {
        Filesystem: {
          writeFile(options: { path: string; data: string; directory?: string }): Promise<{ uri: string }>;
          getUri(options: { path: string; directory?: string }): Promise<{ uri: string }>;
        };
      };
    };
  }
}

// Styled components matching SubjectManager.tsx exactly
const PageContainer = styled.div`
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0 12px 6px 12px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.palette?.mode === 'dark' ? '#252525' : '#f5f7fa'};
  max-width: 100vw;
  overflow-x: hidden;
  min-height: 0; /* Critical for flex children */
  overflow: hidden;
  display: flex;
  flex-direction: column;
  /* Hardware acceleration for container */
  transform: translateZ(0);
  will-change: transform;
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
  background: ${({ theme }) => theme.palette?.mode === 'dark' ? '#252525' : '#f5f7fa'};
  box-shadow: 0 1px 6px #0001;
  border-radius: 10px;
  padding: 4px 8px 2px 8px;
  min-height: 36px;

  /* Mobile layout - stack in two rows */
  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 8px;
    min-height: auto;
  }
`;

const HeaderTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  flex-wrap: nowrap;

  @media (max-width: 700px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
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
`;

const MobilePdfButton = styled.button`
  display: none;
  
  @media (max-width: 700px) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: none;
    background: ${({ theme }) => theme.palette?.mode === 'dark' ? '#444' : '#f3f4f6'};
    color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#C0C0C0' : '#374151'};
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 1.4px 1.4px 4px #2222;
    
    &:hover {
      background: ${({ theme }) => theme.palette?.mode === 'dark' ? '#555' : '#e5e7eb'};
      transform: translateY(-1px);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
  }
`;

const Title = styled.h2`
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 1px;
  color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#4a6cf7' : '#4a6cf7'};
  margin: 0;
`;

// --- Segmented Group Styles (copied from MarkAttendance.tsx) ---
const SEGMENTED_HEIGHT = '32px';
const SegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.palette?.mode === 'dark' ? '#222' : '#f3f4f6'};
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
  background: ${({ theme }) => theme.palette?.mode === 'dark' ? '#444' : '#f3f4f6'};
  color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#C0C0C0' : '#444'};
`;

const SegmentedSelect = styled.select<{ first?: boolean; last?: boolean }>`
  ${SegmentedBase}
  padding: 0 2.2em 0 0.84em;
  border-right: 1px solid ${({ theme }) => theme.palette?.mode === 'dark' ? '#555' : '#e5e7eb'};
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
    border-left: 1px solid ${({ theme }) => theme.palette?.mode === 'dark' ? '#555' : '#e5e7eb'};
  }
  appearance: none;
  -webkit-appearance: none;
  background-image: ${({ theme }) => theme.palette?.mode === 'dark'
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

const MainContent = styled.div`
  flex: 1;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  padding: 0 0 8px 0;
  /* Super smooth scrolling optimizations */
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: y proximity;
  will-change: scroll-position;
  
  /* Hardware acceleration */
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
  
  /* Momentum scrolling for mobile */
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
    background: ${({ theme }) => theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 4px;
    transition: background 0.2s;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
  }
`;

const SelectionCard = styled.div`
  background: ${({ theme }) => theme.palette?.mode === 'dark' ? '#2a2a2a' : '#ffffff'};
  border-radius: 16px;
  padding: 1.5rem 1.5rem 1.2rem 1.5rem;
  box-shadow: ${({ theme }) => theme.palette?.mode === 'dark' ? '0 1.8px 7.2px 0 #0003' : '0 1.8px 7.2px 0 #0003'};
  border: 2.5px solid ${({ theme }) => theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
  position: relative;
  overflow: visible;
  margin-bottom: 1.5rem;
  min-width: 220px;
  width: 100%;
  transition: border 0.4s cubic-bezier(0.4,0,0.2,1);

  &:hover {
    border-color: #4a6cf7;
    box-shadow: none;
    transform: none;
  }
  
  @media (max-width: 700px) {
    padding: 1.2rem 1.2rem 1rem 1.2rem;
    margin-bottom: 1rem;
  }
`;

const SelectionTitle = styled.h3`
  font-size: 2.1rem;
  font-weight: 900;
  color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a'};
  margin: 0 0 1rem 0;
  letter-spacing: 0.5px;
`;

const SelectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  padding: 8px 0 10px 0;
  background: transparent;
  box-shadow: none;
  justify-content: start;
  /* Hardware acceleration for grid */
  transform: translateZ(0);
  will-change: transform;
  
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 4px 0 8px 0;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#b0b8d1' : '#666666'};
  font-weight: 500;
  font-size: 0.9rem;
`;

const FormSelect = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.palette?.mode === 'dark' ? '#3a3f4b' : '#b6c2d9'};
  border-radius: 8px;
  background: ${({ theme }) => theme.palette?.mode === 'dark' ? '#252525' : '#f7faff'};
  color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a'};
  font-size: 1rem;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => '#4a6cf7'};
    box-shadow: 0 0 0 2px ${({ theme }) => '#4a6cf7'}33;
  }
  
  option {
    background: ${({ theme }) => theme.palette?.mode === 'dark' ? '#252525' : '#f7faff'};
    color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a'};
  }
`;

const StudentsList = styled.div`
  background: ${({ theme }) => theme.palette?.mode === 'dark' ? '#2a2a2a' : '#ffffff'};
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.palette?.mode === 'dark' ? '0 1.8px 7.2px 0 #0003' : '0 1.8px 7.2px 0 #0003'};
  border: 1px solid ${({ theme }) => theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
  overflow: hidden;
  margin-top: 20px;
`;

const StudentRow = styled.div<{ $isActive?: boolean }>`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
  gap: 16px;
  transition: background-color 0.2s ease;
  position: relative;

  /* Active row highlighting - only background color change */
  ${({ $isActive, theme }) => $isActive && `
    background: ${theme.palette?.mode === 'dark' ? 'rgba(74, 108, 247, 0.12)' : 'rgba(74, 108, 247, 0.06)'};
  `}

  &:hover {
    background: ${({ theme, $isActive }) => 
      $isActive 
        ? (theme.palette?.mode === 'dark' ? 'rgba(74, 108, 247, 0.15)' : 'rgba(74, 108, 247, 0.08)')
        : theme.palette?.mode === 'dark' ? '#252525' : '#f7faff'
    };
  }

  &:last-child {
    border-bottom: none;
  }

  /* Mobile layout adjustments */
  @media (max-width: 700px) {
    gap: 12px;
    padding: 10px 12px;
    flex-wrap: nowrap;
  }
`;

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ theme }) => '#4a6cf7'}20;
  color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#4a6cf7' : '#4a6cf7'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
  flex-shrink: 0;
`;

const StudentInfo = styled.div`
  flex: 1;
  min-width: 0;

  /* Mobile layout adjustments */
  @media (max-width: 700px) {
    flex: 1;
    min-width: 0;
  }
`;

const DesktopLayout = styled.div`
  display: flex;
  flex-direction: column;

  @media (max-width: 700px) {
    display: none;
  }
`;

const MobileStudentLayout = styled.div`
  display: none;

  @media (max-width: 700px) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
  }
`;

const MobileStudentName = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a'};
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const MobileFatherName = styled.span`
  font-weight: 400;
  color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#9ca3af' : '#6b7280'};
  font-size: 0.75rem;
`;

const StudentName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a'};
  font-size: 0.95rem;
  margin-bottom: 2px;

  /* Mobile layout - reduce margin and font size */
  @media (max-width: 700px) {
    margin-bottom: 0;
    font-size: 0.9rem;
  }
`;

const StudentDetails = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#b0b8d1' : '#666666'};
  display: flex;
  gap: 8px;
  align-items: center;

  /* Mobile layout - put everything in one line */
  @media (max-width: 700px) {
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 6px;
    font-size: 0.75rem;
  }
`;

const StudentId = styled.span`
  background: ${({ theme }) => '#4a6cf7'}15;
  color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#4a6cf7' : '#4a6cf7'};
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 500;

  /* Mobile layout - smaller padding and font */
  @media (max-width: 700px) {
    padding: 1px 4px;
    font-size: 0.65rem;
    border-radius: 6px;
    background: transparent;
    color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#9ca3af' : '#6b7280'};
    font-weight: 400;
  }
`;

// Shake animation keyframes
const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
  20%, 40%, 60%, 80% { transform: translateX(2px); }
`;

const MarksInput = styled.input<{ $hasError?: boolean }>`
  width: 80px;
  padding: 8px 12px;
  border: 1px solid ${({ theme, $hasError }) => 
    $hasError ? '#ef4444' : 
    theme.palette?.mode === 'dark' ? '#3a3f4b' : '#b6c2d9'
  };
  border-radius: 8px;
  background: ${({ theme, $hasError }) => 
    $hasError ? 
      (theme.palette?.mode === 'dark' ? '#2d1b1b' : '#fef2f2') : 
      theme.palette?.mode === 'dark' ? '#252525' : '#f7faff'
  };
  color: ${({ theme, $hasError }) => 
    $hasError ? 
      (theme.palette?.mode === 'dark' ? '#fca5a5' : '#dc2626') :
      theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a'
  };
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
  transition: all 0.2s ease;
  animation: ${({ $hasError }) => $hasError ? shake : 'none'} 0.5s ease-in-out;

  &::placeholder {
    font-size: 0.65rem;
    font-weight: 400;
    color: ${({ theme, $hasError }) => 
      $hasError ? 
        (theme.palette?.mode === 'dark' ? '#fca5a5' : '#dc2626') :
        theme.palette?.mode === 'dark' ? '#9ca3af' : '#6b7280'
    };
  }

  &:focus {
    outline: none;
    border-color: ${({ theme, $hasError }) => 
      $hasError ? '#ef4444' : '#4a6cf7'
    };
    box-shadow: 0 0 0 2px ${({ theme, $hasError }) => 
      $hasError ? 
        (theme.palette?.mode === 'dark' ? '#ef444420' : '#ef444420') :
        '#4a6cf720'
    };
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type=number] {
    -moz-appearance: textfield;
  }

  /* Mobile layout adjustments */
  @media (max-width: 700px) {
    width: 70px;
    padding: 6px 8px;
    font-size: 0.85rem;
    margin-left: auto;
  }
`;

const PercentageDisplay = styled.div`
  min-width: 60px;
  text-align: center;

  /* Hide percentage on mobile */
  @media (max-width: 700px) {
    display: none;
  }
`;

const PercentageValue = styled.div<{ $percentage: number }>`
  font-size: 0.9rem;
  font-weight: 700;
  color: ${({ $percentage }) => 
    $percentage >= 80 ? '#16a34a' : 
    $percentage >= 60 ? '#f59e0b' : 
    $percentage >= 40 ? '#f97316' : '#dc2626'
  };
`;

const ActionButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: ${({ theme }) => '#4a6cf7'};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;

  &:hover {
    background: ${({ theme }) => '#4a6cf7'}cc;
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  /* Hide action button on mobile */
  @media (max-width: 700px) {
    display: none;
  }
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: ${({ theme }) => '#4a6cf7'};
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
  border: 2px solid ${({ theme }) => '#4a6cf7'};
  background: ${({ theme }) => theme.palette?.mode === 'dark' ? '#252525' : '#f7faff'};
  transition: all 0.2s ease;
  font-size: 0.7rem;
  font-weight: 600;
  color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#4a6cf7' : '#4a6cf7'};

  &:hover {
    background: ${({ theme }) => '#4a6cf7'}15;
    transform: scale(1.05);
  }

  &.checked {
    background: ${({ theme }) => '#4a6cf7'};
    color: white;
  }

  /* Mobile adjustments */
  @media (max-width: 700px) {
    width: 22px;
    height: 22px;
    font-size: 0.65rem;
  }
`;

const SelectionControls = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: ${({ theme }) => theme.palette?.mode === 'dark' ? '#252525' : '#f7faff'};
  border-bottom: 1px solid ${({ theme }) => theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
  font-size: 0.9rem;
  font-weight: 500;
  color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a'};
`;

const SelectAllButton = styled.button`
  padding: 4px 8px;
  border: 1px solid ${({ theme }) => '#4a6cf7'};
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#4a6cf7' : '#4a6cf7'};
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => '#4a6cf7'}15;
  }

  /* Hide on mobile devices */
  @media (max-width: 700px) {
    display: none;
  }
`;

const Footer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.palette?.mode === 'dark' ? '#2a2a2a' : '#ffffff'};
  border-top: 1px solid ${({ theme }) => theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
  padding: 12px 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  
  /* Ensure footer is at the very bottom */
  margin: 0;
  width: 100%;
  box-sizing: border-box;
  
  /* Mobile adjustments */
  @media (max-width: 700px) {
    padding: 10px 12px;
    gap: 6px;
    justify-content: space-between;
  }
`;

const FooterButtonGroup = styled.div`
  display: flex;
  gap: 6px;
  
  @media (min-width: 701px) {
    gap: 8px;
  }
`;

const FooterButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 6px 12px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 60px;

  ${({ variant, theme }) => {
    if (variant === 'primary') {
      return `
        background: ${'#4a6cf7'};
        color: white;
        &:hover {
          background: ${'#4a6cf7'}cc;
        }
      `;
    } else {
      return `
        background: ${theme.palette?.mode === 'dark' ? '#252525' : '#f7faff'};
        color: ${theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a'};
        border: 1px solid ${theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
        &:hover {
          background: ${theme.palette?.mode === 'dark' ? '#252525' : '#f7faff'}cc;
          border-color: ${'#4a6cf7'};
        }
      `;
    }
  }}
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'success' | 'danger' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;

  ${({ variant, theme }) => {
    switch (variant) {
      case 'primary':
        return `
          background: #4a6cf7;
          color: white;
          &:hover {
            background: #3a5ce5;
            transform: translateY(-1px);
          }
        `;
      case 'secondary':
        return `
          background: ${theme === 'dark' ? '#252525' : '#f7faff'};
          color: #4a6cf7;
          border: 1px solid ${theme === 'dark' ? '#3a3f4b' : '#b6c2d9'};
          &:hover {
            background: ${theme === 'dark' ? 'rgba(74, 108, 247, 0.18)' : 'rgba(74, 108, 247, 0.15)'};
            border-color: #4a6cf7;
          }
        `;
      case 'success':
        return `
          background: #10b981;
          color: white;
          &:hover {
            background: #059669;
            transform: translateY(-1px);
          }
        `;
      case 'danger':
        return `
          background: #ef4444;
          color: white;
          &:hover {
            background: #dc2626;
          }
        `;
      default:
        return '';
    }
  }}

  @media (max-width: 700px) {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    gap: 0.4rem;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
`;

const NoResults = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#b0b8d1' : '#666666'};
  font-size: 1.1rem;
  margin: 48px 0;
  padding: 40px;
`;

const ToTopButton = styled.button`
  position: fixed;
  right: 18px;
  bottom: 24px;
  z-index: 3000;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px #0005;
  font-size: 2rem;
  cursor: pointer;
  transition: background 0.18s, box-shadow 0.18s, transform 0.13s;
  opacity: 0.92;
  &:hover {
    background: #4f46e5;
    box-shadow: 0 8px 32px #6366f155;
    transform: scale(1.08);
  }
  @media (min-width: 701px) {
    display: none;
  }
`;

// Modal Components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.palette?.mode === 'dark' ? '#2a2a2a' : '#ffffff'};
  border-radius: 16px;
  padding: 24px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid ${({ theme }) => theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
`;

const ModalTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a'};
  margin: 0 0 16px 0;
  text-align: center;
`;

const ModalMessage = styled.p`
  font-size: 1rem;
  color: ${({ theme }) => theme.palette?.mode === 'dark' ? '#b0b8d1' : '#666666'};
  margin: 0 0 24px 0;
  text-align: center;
  line-height: 1.5;
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`;

const ModalButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  min-width: 100px;

  ${({ variant, theme }) => {
    if (variant === 'primary') {
      return `
        background: #4a6cf7;
        color: white;
        &:hover {
          background: #3a5ce5;
          transform: translateY(-1px);
        }
      `;
    } else {
      return `
        background: ${theme.palette?.mode === 'dark' ? '#444' : '#f3f4f6'};
        color: ${theme.palette?.mode === 'dark' ? '#e0e0e0' : '#1a1a1a'};
        border: 1px solid ${theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
        &:hover {
          background: ${theme.palette?.mode === 'dark' ? '#555' : '#e5e7eb'};
        }
      `;
    }
  }}
`;

// Types for the new structure
interface Class {
  id: number;
  name: string;
  school_id: number;
  has_sections?: boolean;
}

interface Section {
  id: number;
  name: string;
  class_id: number;
  school_id: number;
}

interface Student {
  id: number;
  name: string;
  father_name?: string;
  roll_number?: string;
  picture_url?: string;
  class_id: number;
  section_id: number;
  school_id: number;
}

const MarksEntryManager: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const theme = useTheme();
  const { setLoading, loading } = useLoading();
  const navigate = useNavigate();
  const location = useLocation();
  const { logExaminationMarksActivity } = useActivityTracking();
  const { setFooterContent } = usePageFooter();
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 700);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // State for form fields
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState<boolean>(false);
  
  // Selected values
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedExam, setSelectedExam] = useState<Examination | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  
  // Marks data
  const [marksData, setMarksData] = useState<{ [studentId: number]: number | string }>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeStudentId, setActiveStudentId] = useState<number | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  
  const [showToTop, setShowToTop] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [inputErrors, setInputErrors] = useState<{ [studentId: number]: boolean }>({});
  const [focusedStudentId, setFocusedStudentId] = useState<number | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number, studentId: number) => {
    // Allow "A" key for absent students (even with numeric input mode)
    if (e.key === 'A' || e.key === 'a') {
      e.preventDefault();
      const maxMarks = selectedSubject?.max_marks || selectedSubject?.total_marks || 100;
      handleMarksInput(studentId, 'A', maxMarks);
      return;
    }

    // Prevent arrow keys from changing the value
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      return;
    }

    // Handle Enter key to move to next student
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextIndex = currentIndex + 1;
      if (nextIndex < students.length) {
        const nextInput = document.querySelector(`input[data-student-index="${nextIndex}"]`) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
          // Use setTimeout to ensure the focus happens before selection
          setTimeout(() => {
            nextInput.select();
          }, 0);
          // Auto-scroll to keep the focused input visible
          scrollToKeepVisible(nextInput);
        }
      } else {
        // Reached end of list - show save modal
        setShowSaveModal(true);
      }
    }

    // Handle Tab key for navigation
    if (e.key === 'Tab') {
      e.preventDefault();
      const nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex >= 0 && nextIndex < students.length) {
        const targetInput = document.querySelector(`input[data-student-index="${nextIndex}"]`) as HTMLInputElement;
        if (targetInput) {
          targetInput.focus();
          // Use setTimeout to ensure the focus happens before selection
          setTimeout(() => {
            targetInput.select();
          }, 0);
          scrollToKeepVisible(targetInput);
        }
      }
    }
  };

  const scrollToKeepVisible = (inputElement: HTMLInputElement) => {
    if (!mainContentRef.current) return;
    
    const container = mainContentRef.current;
    const containerRect = container.getBoundingClientRect();
    const inputRect = inputElement.getBoundingClientRect();
    
    // Check if input is near the bottom edge (within 100px)
    const distanceFromBottom = containerRect.bottom - inputRect.bottom;
    
    if (distanceFromBottom < 100) {
      // Scroll down to keep the input visible
      const scrollAmount = Math.min(150, container.scrollHeight - container.scrollTop - container.clientHeight);
      container.scrollBy({
        top: scrollAmount,
        behavior: 'smooth'
      });
    }
    
    // Check if input is near the top edge (within 50px)
    const distanceFromTop = inputRect.top - containerRect.top;
    
    if (distanceFromTop < 50) {
      // Scroll up to keep the input visible
      container.scrollBy({
        top: -100,
        behavior: 'smooth'
      });
    }
  };

  const handleFocus = (studentId: number, inputElement: HTMLInputElement) => {
    setActiveStudentId(studentId);
    setFocusedStudentId(studentId);
    // Auto-scroll to keep focused input visible
    scrollToKeepVisible(inputElement);
    // Ensure text is selected when focusing (especially for mobile)
    setTimeout(() => {
      inputElement.select();
    }, 0);
  };

  const handleBlur = () => {
    // Clear active state immediately for better responsiveness
    setActiveStudentId(null);
    setFocusedStudentId(null);
  };

  // Selection handlers
  const handleSelectStudent = (studentId: number, checked: boolean) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(studentId);
      } else {
        newSet.delete(studentId);
        // Clear marks data when student is deselected
        setMarksData(prev => {
          const newMarks = { ...prev };
          delete newMarks[studentId];
          return newMarks;
        });
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedStudents(new Set(students.map(s => s.id)));
  };

  const handleDeselectAll = () => {
    setSelectedStudents(new Set());
    // Clear all marks data when deselecting all
    setMarksData({});
  };

  const handleToggleAll = () => {
    if (selectedStudents.size === students.length) {
      handleDeselectAll();
    } else {
      handleSelectAll();
    }
  };

  // Modal handlers
  const handleSaveFromModal = async () => {
    setShowSaveModal(false);
    // Auto-select all students for saving
    setSelectedStudents(new Set(students.map(s => s.id)));
    await handleSaveMarks();
  };

  const handleCancelModal = () => {
    setShowSaveModal(false);
  };

  // Handle "A" button click for absent students
  const handleAbsentButton = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Find the currently focused input
    const focusedInput = document.querySelector('input[data-student-index]:focus') as HTMLInputElement;
    
    if (focusedInput) {
      // Get the student index from the data attribute
      const studentIndex = parseInt(focusedInput.getAttribute('data-student-index') || '0');
      const studentId = students[studentIndex]?.id;
      
      if (studentId) {
        // Update React state directly
        setMarksData(prev => ({
          ...prev,
          [studentId]: 'A'
        }));
        
        // Select student when "A" is entered
        setSelectedStudents(prev => new Set(prev).add(studentId));
        
        // Clear any error state
        setInputErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[studentId];
          return newErrors;
        });
      }
    }
  };

  // Handle marks input with validation and error feedback
  const handleMarksInput = (studentId: number, inputValue: string, maxMarks: number) => {
    const existingMarks = marksData[studentId];
    
    // Allow "A" for absent, empty string, or numeric values
    if (inputValue === 'A' || inputValue === '') {
      setMarksData(prev => ({
        ...prev,
        [studentId]: inputValue
      }));
      
      // Update selection based on marks value
      if (inputValue === 'A') {
        // Select student if marks is 'A' (absent)
        setSelectedStudents(prev => new Set(prev).add(studentId));
      } else {
        // Deselect student if marks field is empty
        setSelectedStudents(prev => {
          const newSet = new Set(prev);
          newSet.delete(studentId);
          return newSet;
        });
      }
      
      // Clear any error state
      setInputErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[studentId];
        return newErrors;
      });
      return;
    }

    // Handle numeric input
    if (!isNaN(Number(inputValue)) && inputValue !== '') {
      const value = Number(inputValue);
      
      // Check if value exceeds max marks
      if (value > maxMarks) {
        // Show error animation and revert to existing marks
        setInputErrors(prev => ({ ...prev, [studentId]: true }));
        
        // Show error toast
        showToast(`Marks cannot exceed ${maxMarks}.`, 'error');
        
        // Revert to existing marks immediately
        setMarksData(prev => ({
          ...prev,
          [studentId]: existingMarks !== undefined ? existingMarks : ''
        }));
        
        // Clear error state after animation
        setTimeout(() => {
          setInputErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[studentId];
            return newErrors;
          });
        }, 1000);
        
        return;
      }
      
      // Valid input - update marks
      setMarksData(prev => ({
        ...prev,
        [studentId]: value
      }));
      
      // Select student if marks value is entered (including 0)
      setSelectedStudents(prev => new Set(prev).add(studentId));
      
      // Clear any error state
      setInputErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[studentId];
        return newErrors;
      });
    }
  };

  // Generate Marks Sheet PDF - For ALL classes without any selections
  const generateMarksSheetPDF = async () => {
    try {
      setPdfLoading(true);
      
      // Check if it's a mobile device
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Show immediate feedback for mobile users
      if (isMobileDevice) {
        showToast('Generating PDF for mobile... Please wait.', 'success');
      }
      
      // Fetch active session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user?.school_id)
        .single();

      if (sessionError || !sessionData) {
        showToast('No active session found. Please contact administrator.', 'error');
        return;
      }

      // Fetch all classes and sections
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name, has_sections')
        .eq('school_id', user?.school_id);

      if (classesError) {
        showToast('Failed to fetch classes', 'error');
        return;
      }

      // Sort classes using the universal class sorting function
      const sortedClassesData = sortClasses(classesData || []);

      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('id, name, class_id')
        .eq('school_id', user?.school_id)
        .order('name');

      if (sectionsError) {
        showToast('Failed to fetch sections', 'error');
        return;
      }

      // Fetch all students from student_class_history for all classes
      const { data: schData, error: schError } = await supabase
        .from('student_class_history')
        .select(`
          student_id,
          new_class_id,
          new_section_id,
          adm_class_id,
          adm_section_id,
          students!inner(id, name, father_name, status, roll_number)
        `)
        .eq('session_id', sessionData.id)
        .eq('school_id', user?.school_id)
        .eq('students.status', 'active')
        .order('new_class_id')
        .order('new_section_id');

      if (schError) {
        showToast('Failed to fetch students from database', 'error');
        return;
      }

      if (!schData || schData.length === 0) {
        showToast('No students found in any class', 'error');
        return;
      }

      // Group students by class and section
      const studentsByClassSection: { [key: string]: any[] } = {};
      schData.forEach(item => {
        const classId = item.new_class_id || item.adm_class_id;
        const sectionId = item.new_section_id !== null ? item.new_section_id : (item.adm_section_id !== null ? item.adm_section_id : null);
        const key = `${classId}-${sectionId}`;
        if (!studentsByClassSection[key]) {
          studentsByClassSection[key] = [];
        }
        // Access the student data properly - it's a single object, not an array
        const student = Array.isArray(item.students) ? item.students[0] : item.students;
        studentsByClassSection[key].push({
          id: student.id,
          name: student.name,
          father_name: student.father_name,
          roll_number: student.roll_number,
          class_id: classId,
          section_id: sectionId
        });
      });

      // Sort students by name within each class-section group
      Object.keys(studentsByClassSection).forEach(key => {
        studentsByClassSection[key].sort((a, b) => a.name.localeCompare(b.name));
      });

      // Sort class-section keys using the universal class sorting function
      const classObjects = Object.keys(studentsByClassSection).map(key => {
        const [classId] = key.split('-');
        const className = sortedClassesData?.find(c => c.id === parseInt(classId))?.name || 'Unknown';
        return {
          name: className,
          key: key
        };
      });
      const sortedClassObjects = sortClasses(classObjects);
      const sortedKeys = sortedClassObjects.map(obj => obj.key);

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      let isFirstPage = true;
      let totalStudents = 0;
      
      // Generate pages for each class-section combination in sorted order
      for (const key of sortedKeys) {
        const students = studentsByClassSection[key];
        const [classId, sectionId] = key.split('-').map(Number);
        const classObj = sortedClassesData?.find(c => c.id === classId);
        const className = classObj?.name || 'Unknown';
        const hasSections = classObj?.has_sections ?? true;
        const sectionName = hasSections ? (sectionsData?.find(s => s.id === sectionId)?.name || 'Unknown') : null;
        
        // Add new page for each class-section (except first)
        if (!isFirstPage) {
          doc.addPage();
        }
        
        // Professional Header Design
        // Main Title with enhanced styling
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('MARKS SHEET', pageWidth / 2, 20, { align: 'center' });
        
        // Decorative line under title
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1);
        doc.line(20, 25, pageWidth - 20, 25);
        
        // Header information in a structured box
        const headerBoxY = 30;
        const headerBoxHeight = 15;
        
        // Draw header box background
        doc.setFillColor(248, 249, 250);
        doc.rect(15, headerBoxY, pageWidth - 30, headerBoxHeight, 'F');
        
        // Draw header box border
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.rect(15, headerBoxY, pageWidth - 30, headerBoxHeight, 'S');
        
        // Header content with better typography
        doc.setFontSize(10);
        
        // Left column
        doc.setFont('helvetica', 'bold');
        doc.text('Subject:', 20, 36);
        doc.setFont('helvetica', 'normal');
        doc.text('____________________________', 35, 36);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Teacher:', 20, 42);
        doc.setFont('helvetica', 'normal');
        doc.text('____________________________', 35, 42);
        
        // Right column
        doc.setFont('helvetica', 'bold');
        doc.text('Class:', 120, 36);
        doc.setFont('helvetica', 'normal');
        const classDisplayName = sectionName ? `${className} - ${sectionName}` : className;
        doc.text(classDisplayName, 140, 36);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Date:', 120, 42);
        doc.setFont('helvetica', 'normal');
        doc.text('________________', 140, 42);
        
        // Bottom border line
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(15, 50, pageWidth - 15, 50);
        
        // Table data - sorted by ID
        const sortedStudents = students.sort((a, b) => {
          const aId = getStudentDisplayId(a);
          const bId = getStudentDisplayId(b);
          if (typeof aId === 'number' && typeof bId === 'number') {
            return aId - bId;
          }
          return String(aId).localeCompare(String(bId));
        });
        const tableData = sortedStudents.map((student, index) => [
          index + 1,
          getStudentDisplayId(student).toString(),
          student.name,
          student.father_name || '',
          '', // Total marks (blank for teacher to fill)
          '', // Obtained marks (blank for teacher to fill)
          ''  // Remarks (blank for teacher to fill)
        ]);
        
        // Create table with professional styling
        autoTable(doc, {
          startY: 55,
          head: [['S.No', 'ID', 'Student Name', 'Father Name', 'Total Marks', 'Obtained Marks', 'Remarks']],
          body: tableData,
          styles: {
            fontSize: 8,
            cellPadding: 2,
            lineColor: '#000',
            lineWidth: 0.3,
            textColor: '#000',
            fillColor: '#ffffff'
          },
          headStyles: {
            fillColor: '#f0f0f0',
            textColor: '#000',
            fontStyle: 'bold',
            fontSize: 8
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 12 }, // S.No
            1: { halign: 'center', cellWidth: 12 }, // ID
            2: { halign: 'left', cellWidth: 39 },   // Student Name
            3: { halign: 'left', cellWidth: 38 },   // Father Name
            4: { halign: 'center', cellWidth: 25 }, // Total Marks
            5: { halign: 'center', cellWidth: 25 }, // Obtained Marks
            6: { halign: 'center', cellWidth: 30 }   // Remarks
          },
          margin: { left: 15, right: 15 }
        });
        
        // Professional Footer with signature and date
        const finalY = (doc as any).lastAutoTable.finalY + 15;
        
        // Check if we need to add footer on current page or next page
        if (finalY > pageHeight - 25) {
          doc.addPage();
          doc.setFontSize(8);
          doc.text('Teacher Signature: _________________', 15, 30);
          doc.text('Returned Date: _________________', pageWidth - 60, 30);
        } else {
          doc.setFontSize(8);
          doc.text('Teacher Signature: _________________', 15, finalY);
          doc.text('Returned Date: _________________', pageWidth - 60, finalY);
        }
        
        totalStudents += students.length;
        isFirstPage = false;
      }
      
      
      // Save the PDF with mobile-friendly approach
      const fileName = `Marks Sheets_${new Date().toLocaleDateString('en-GB')}.pdf`;
      
      if (isMobileDevice) {
        // For mobile devices, use Capacitor Filesystem API approach (like BWT_Project)
        try {
          // Generate PDF as base64 string
          const pdfBase64 = doc.output('datauristring').split(',')[1];
          
          // Create unique filename with timestamp to prevent overwriting
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const mobileFileName = `marks-sheet-${timestamp}.pdf`;

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
              showToast(`PDF saved successfully as ${mobileFileName}`, 'success');
              
              // Trigger native Android "Open with" dialog by opening the file URI
              // This will show the native Android app chooser dialog
              window.open(uriResult.uri, '_blank');
              
            } catch (fsError) {
              // If filesystem fails, fallback to regular download
              doc.save(mobileFileName);
              showToast('PDF downloaded successfully!', 'success');
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
                <p style="margin: 0 0 15px 0; color: #666;">Total Students: ${totalStudents}</p>
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
              
              showToast(`PDF ready! Click the download button that appeared on screen.`, 'success');
              
            } catch (webError) {
              
              // Final fallback: Open PDF in new tab with data URI
              const pdfDataUri = doc.output('datauristring');
              const newWindow = window.open('', '_blank');
              if (newWindow) {
                newWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Marks Sheet PDF</title>
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
                          <h2>📄 Marks Sheet PDF Generated</h2>
                          <p><strong>Total Students:</strong> ${totalStudents}</p>
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
                showToast(`PDF opened in new tab. Use the download button in the new tab.`, 'success');
              } else {
                showToast('Please allow popups for this site to download the PDF', 'error');
              }
            }
          }
        } catch (error) {
          showToast('Failed to export PDF on mobile. Please try on desktop.', 'error');
        }
      } else {
        // For desktop, use the standard approach
        doc.save(fileName);
        showToast(`Marks sheet PDF generated successfully with ${totalStudents} students across all classes`, 'success');
      }
    } catch (error) {
      showToast('Failed to generate marks sheet PDF', 'error');
    } finally {
      setPdfLoading(false);
    }
  };

  // Load existing marks for the selected subject
  const loadExistingMarks = async () => {
    if (!selectedExam || !selectedSubject || students.length === 0) {
      return;
    }

    try {
      // Use the actual subject ID from the subjects table, not the class_subjects ID
      const subjectId = selectedSubject.subject_id || selectedSubject.subject?.id;
      const examId = selectedExam.id;
      const studentIds = students.map(s => s.id);

      const { data: existingMarks, error } = await supabase
        .from('exam_results')
        .select('student_id, obtained_marks, remarks')
        .eq('exam_id', examId)
        .eq('subject_id', subjectId)
        .in('student_id', studentIds);

      if (error) {
        showToast(`Failed to load existing marks: ${error.message}`, 'error');
        return;
      }

      // Convert to marksData format
      const marksData: { [studentId: number]: number | string } = {};
      const studentsWithMarks = new Set<number>();
      
      existingMarks?.forEach(mark => {
        // If remarks is "Absent", show "A", otherwise show the obtained marks
        marksData[mark.student_id] = mark.remarks === 'Absent' ? 'A' : mark.obtained_marks;
        // Select students who have marks (including 0 and A)
        studentsWithMarks.add(mark.student_id);
      });

      setMarksData(marksData);
      // Set selection based on students who have marks
      setSelectedStudents(studentsWithMarks);
      
      if (existingMarks && existingMarks.length > 0) {
        showToast(`Loaded existing marks for ${existingMarks.length} students`, 'success');
      } else {
        showToast('No existing marks found', 'success');
      }
    } catch (error) {
      showToast('Failed to load existing marks', 'error');
    }
  };

  // Save marks to database
  const handleSaveMarks = async () => {
    if (!selectedExam || !selectedSubject) {
      showToast('Please select exam and subject', 'error');
      return;
    }

    if (!hasActiveSession || !activeSessionId) {
      showToast('No active session found. Please contact administrator.', 'error');
      return;
    }

    if (selectedStudents.size === 0) {
      showToast('Please select students to save marks for', 'error');
      return;
    }

    if (saving) {
      showToast('Already saving marks, please wait...', 'error');
      return;
    }

    try {
      setSaving(true);
      // Use the actual subject ID from the subjects table, not the class_subjects ID
      const subjectId = selectedSubject.subject_id || selectedSubject.subject?.id;
      const examId = selectedExam.id;

      // Filter marks data for selected students only
      const selectedMarksData = Object.entries(marksData)
        .filter(([studentId]) => selectedStudents.has(parseInt(studentId)))
        .filter(([studentId, marks]) => marks !== '' && marks !== null && marks !== undefined);

      if (selectedMarksData.length === 0) {
        showToast('No valid marks to save for selected students', 'error');
        return;
      }

      // Prepare data for upsert
      const maxMarks = selectedSubject.max_marks || selectedSubject.total_marks || 100;
      const hasSections = selectedClass?.has_sections ?? true;
      const marksToSave = selectedMarksData.map(([studentId, marks]) => ({
        exam_id: examId,
        subject_id: subjectId,
        student_id: parseInt(studentId),
        class_id: selectedClass?.id,
        section_id: hasSections ? selectedSection?.id : null,
        session_id: activeSessionId!, // Add session_id
        school_id: user?.school_id,
        obtained_marks: marks === 'A' ? 0 : marks, // Store 0 for absent, actual marks for others
        max_marks: maxMarks,
        remarks: marks === 'A' ? 'Absent' : null, // Add remarks for absent students
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      // First, delete existing marks for selected students
      const studentIds = marksToSave.map(mark => mark.student_id);
      const { error: deleteError } = await supabase
        .from('exam_results')
        .delete()
        .eq('exam_id', examId)
        .eq('subject_id', subjectId)
        .in('student_id', studentIds);

      if (deleteError) {
        // Continue with insert even if delete fails
      }
      
      // Insert new marks
      const { data, error } = await supabase
        .from('exam_results')
        .insert(marksToSave);

      if (error) {
        showToast(`Failed to save marks: ${error.message}`, 'error');
        return;
      }

      showToast(`Successfully saved marks for ${marksToSave.length} selected students`, 'success');
      
      // Log examination marks activity
      try {
        await logExaminationMarksActivity(
          'create',
          selectedClass?.name || 'Unknown Class',
          selectedSection?.name || 'All Sections',
          selectedSubject?.subject?.name || 'Unknown Subject',
          selectedExam?.name || 'Unknown Examination',
          marksToSave.length
        );
      } catch (activityError) {
        // Don't fail the save operation if activity logging fails
      }
      
      // Clear selection after successful save
      setSelectedStudents(new Set());
    } catch (error) {
      showToast('Failed to save marks', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete marks for selected students
  const handleDeleteMarks = async () => {
    if (!selectedExam || !selectedSubject) {
      showToast('Please select exam and subject', 'error');
      return;
    }

    if (selectedStudents.size === 0) {
      showToast('Please select students to delete marks for', 'error');
      return;
    }

    if (deleting) {
      showToast('Already deleting marks, please wait...', 'error');
      return;
    }

    try {
      setDeleting(true);
      const subjectId = selectedSubject.subject_id || selectedSubject.subject?.id;
      const examId = selectedExam.id;
      const studentIds = Array.from(selectedStudents);

      const { error } = await supabase
        .from('exam_results')
        .delete()
        .eq('exam_id', examId)
        .eq('subject_id', subjectId)
        .in('student_id', studentIds);

      if (error) {
        showToast(`Failed to delete marks: ${error.message}`, 'error');
        return;
      }

      // Remove marks from local state for selected students
      const newMarksData = { ...marksData };
      studentIds.forEach(studentId => {
        delete newMarksData[studentId];
      });
      setMarksData(newMarksData);

      showToast(`Successfully deleted marks for ${studentIds.length} selected students`, 'success');
      // Clear selection after successful delete
      setSelectedStudents(new Set());
    } catch (error) {
      showToast('Failed to delete marks', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Load initial data
  useEffect(() => {
    if (user?.school_id) {
      loadClasses();
      loadExaminations();
      loadActiveSession();
    }
  }, [user?.school_id]);

  // Auto-select examination when navigating from examination card
  useEffect(() => {
    if (examinations.length > 0 && location.state?.examinationId && !selectedExam) {
      const examinationId = location.state.examinationId;
      const examination = examinations.find(exam => exam.id === examinationId);
      if (examination) {
        setSelectedExam(examination);
        showToast(`Examination "${examination.name}" selected`, 'success');
      }
    }
  }, [examinations, location.state?.examinationId, selectedExam]);

  // Load sections when class is selected
  useEffect(() => {
    if (selectedClass) {
      if (selectedClass.has_sections ?? true) {
        loadSections(selectedClass.id);
      } else {
        setSections([]);
        setSelectedSection(null);
      }
    }
  }, [selectedClass]);

  // Load students when class is selected and
  // - if class has sections: section must be selected
  // - if no sections: load immediately
  useEffect(() => {
    if (!selectedClass) return;
    const hasSections = selectedClass.has_sections ?? true;
    if (hasSections && selectedSection) {
      loadStudents(selectedClass.id, selectedSection.id);
    } else if (!hasSections) {
      loadStudents(selectedClass.id, null);
    }
  }, [selectedClass, selectedSection]);

  // Load subjects when class is selected
  useEffect(() => {
    if (selectedClass && selectedExam) {
      loadSubjects(selectedExam.id);
    }
  }, [selectedClass, selectedExam]);


  // Load existing marks when subject is selected
  useEffect(() => {
    if (selectedExam && selectedSubject && students.length > 0) {
      loadExistingMarks();
    }
  }, [selectedExam, selectedSubject, students]);

  // Scroll to top when subject changes
  useEffect(() => {
    if (selectedSubject && mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedSubject]);

  // Set footer content for global footer
  useEffect(() => {
    const shouldShowFooter = hasActiveSession && selectedClass && (selectedClass.has_sections ? !!selectedSection : true) && selectedExam && selectedSubject && students.length > 0;
    
    if (shouldShowFooter) {
      const FooterContentComponent = React.memo(() => {
        const isDark = theme.palette.mode === 'dark';
        
        return (
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'center' : 'center',
            justifyContent: isMobile ? 'center' : 'flex-end',
            width: '100%',
            gap: isMobile ? '6px' : '8px',
            flexWrap: isMobile ? 'nowrap' : 'wrap'
          }}>
            <FooterButton
              variant="secondary"
              onClick={handleAbsentButton}
              onMouseDown={(e) => e.preventDefault()}
              style={{ 
                backgroundColor: '#f59e0b',
                color: 'white',
                border: '1px solid #f59e0b',
                fontWeight: 'bold',
                fontSize: isMobile ? '0.85rem' : '0.9rem',
                padding: isMobile ? '6px 10px' : '6px 12px'
              }}
            >
              A
            </FooterButton>
            <FooterButtonGroup>
              <FooterButton
                variant="secondary"
                onClick={() => {
                  setMarksData({});
                  setSelectedStudents(new Set());
                }}
                style={{ minWidth: isMobile ? '50px' : '60px', fontSize: isMobile ? '0.75rem' : '0.8rem' }}
              >
                Reset
              </FooterButton>
              <FooterButton
                variant="secondary"
                onClick={handleDeleteMarks}
                disabled={deleting || selectedStudents.size === 0}
                style={{ 
                  opacity: (deleting || selectedStudents.size === 0) ? 0.7 : 1,
                  cursor: (deleting || selectedStudents.size === 0) ? 'not-allowed' : 'pointer',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: '1px solid #ef4444',
                  fontSize: isMobile ? '0.75rem' : '0.8rem'
                }}
              >
                {deleting ? (
                  <>
                    <Spinner />
                    Deleting...
                  </>
                ) : (
                  <>
                    <DeleteIcon style={{ fontSize: isMobile ? 10 : 12 }} />
                    Delete
                  </>
                )}
              </FooterButton>
              <FooterButton
                variant="primary"
                onClick={handleSaveMarks}
                disabled={saving || selectedStudents.size === 0}
                style={{ 
                  opacity: (saving || selectedStudents.size === 0) ? 0.7 : 1,
                  cursor: (saving || selectedStudents.size === 0) ? 'not-allowed' : 'pointer',
                  fontSize: isMobile ? '0.75rem' : '0.8rem'
                }}
              >
                {saving ? (
                  <>
                    <Spinner />
                    Saving...
                  </>
                ) : (
                  <>
                    <SaveIcon style={{ fontSize: isMobile ? 10 : 12 }} />
                    Save
                  </>
                )}
              </FooterButton>
            </FooterButtonGroup>
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
  }, [hasActiveSession, selectedClass, selectedSection, selectedExam, selectedSubject, students.length, selectedStudents.size, saving, deleting, isMobile, theme, setFooterContent, handleAbsentButton, handleDeleteMarks, handleSaveMarks]);

  // Selection is now handled based on marks data in loadExistingMarks and handleMarksInput



  const loadClasses = async () => {
    try {
      setLoading(true);
      
      if (user?.role === 'Teacher' && user?.staff_id) {
        // For teachers, get classes where they have assigned subjects
        const { data, error } = await supabase
          .from('teacher_class_subjects')
          .select(`
            class_subject_id,
            class_subjects!inner(
              class_id,
              classes!inner(id, name, school_id, has_sections)
            )
          `)
          .eq('teacher_id', user.staff_id)
          .eq('school_id', user?.school_id);
        
        if (error) throw error;
        
        // Extract unique classes from the nested structure
        const uniqueClasses = new Map();
        data?.forEach(item => {
          const classData = (item.class_subjects as any)?.classes;
          if (classData && !uniqueClasses.has(classData.id)) {
            uniqueClasses.set(classData.id, classData);
          }
        });
        
        const teacherClasses = Array.from(uniqueClasses.values());
        const sortedClasses = sortClasses(teacherClasses);
        setClasses(sortedClasses);
      } else {
        // For other roles, load all classes
        const { data, error } = await supabase
          .from('classes')
          .select('id, name, school_id, has_sections')
          .eq('school_id', user?.school_id);
        
        if (error) throw error;
        
        // Sort classes: numbered classes first, then special classes (Play Group, Nursery, K.G)
        const sortedClasses = sortClasses(data || []);
        
        setClasses(sortedClasses);
      }
    } catch (error) {
      showToast('Failed to load classes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSections = async (classId: number) => {
    try {
      if (user?.role === 'Teacher' && user?.staff_id) {
        // For teachers, get sections where they have assigned subjects
        const { data, error } = await supabase
          .from('teacher_class_subjects')
          .select(`
            section_id,
            class_subjects!inner(
              class_id,
              classes!inner(id, name, school_id, has_sections)
            )
          `)
          .eq('teacher_id', user.staff_id)
          .eq('school_id', user?.school_id)
          .eq('class_subjects.class_id', classId);
        
        if (error) throw error;
        
        // Extract unique sections from the nested structure
        const uniqueSections = new Map();
        data?.forEach(item => {
          if (item.section_id) {
            // Get section details
            const sectionId = item.section_id;
            if (!uniqueSections.has(sectionId)) {
              uniqueSections.set(sectionId, { id: sectionId });
            }
          }
        });
        
        // Fetch full section details for the unique section IDs
        if (uniqueSections.size > 0) {
          const sectionIds = Array.from(uniqueSections.keys());
          const { data: sectionsData, error: sectionsError } = await supabase
            .from('sections')
            .select('*')
            .in('id', sectionIds)
            .eq('school_id', user?.school_id)
            .order('name');
          
          if (sectionsError) throw sectionsError;
          setSections(sectionsData || []);
        } else {
          setSections([]);
        }
      } else {
        // For other roles, load all sections for the class
        const { data, error } = await supabase
          .from('sections')
          .select('*')
          .eq('class_id', classId)
          .eq('school_id', user?.school_id)
          .order('name');
        
        if (error) throw error;
        setSections(data || []);
      }
    } catch (error) {
      showToast('Failed to load sections', 'error');
    }
  };

  const loadExaminations = async () => {
    try {
      const data = await examinationService.getExaminations({ status: 'published' }, user?.school_id);
      setExaminations(data);
    } catch (error) {
      showToast('Failed to load examinations', 'error');
    }
  };

  const loadSubjects = async (examId: number) => {
    try {
      // Load subjects assigned to the selected class
      if (selectedClass) {
        if (user?.role === 'Teacher' && user?.staff_id) {
          // For teachers, get subjects through teacher_class_subjects table
          const { data, error } = await supabase
            .from('teacher_class_subjects')
            .select(`
              class_subjects!inner(
                *,
                subject:subjects(name, code)
              )
            `)
            .eq('teacher_id', user.staff_id)
            .eq('school_id', user?.school_id)
            .eq('class_subjects.class_id', selectedClass.id);
          
          if (error) {
            throw error;
          }
          
          if (data && data.length > 0) {
            // Extract class_subjects data from the nested structure
            const subjects = data.map(item => item.class_subjects).filter(Boolean) as any[];
            setSubjects(subjects);
          } else {
            setSubjects([]);
            showToast('No subjects assigned to you for this class', 'error');
          }
        } else {
          // For other roles, get all subjects for the class
          const { data, error } = await supabase
            .from('class_subjects')
            .select(`
              *,
              subject:subjects(name, code)
            `)
            .eq('class_id', selectedClass.id)
            .eq('school_id', user?.school_id);
          
          if (error) {
            throw error;
          }
          
          if (data && data.length > 0) {
            setSubjects(data);
          } else {
            setSubjects([]);
          }
        }
      } else {
        setSubjects([]);
      }
    } catch (error) {
      showToast('Failed to load subjects', 'error');
    }
  };

  // Load active session
  const loadActiveSession = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id, name')
        .eq('is_active', true)
        .eq('school_id', user?.school_id)
        .single();

      if (sessionError || !sessionData) {
        setActiveSessionId(null);
        setHasActiveSession(false);
        return;
      }

      setActiveSessionId(sessionData.id);
      setHasActiveSession(true);
    } catch (error) {
      setActiveSessionId(null);
      setHasActiveSession(false);
    }
  };

  const loadStudents = async (classId: number, sectionId: number | null) => {
    try {
      if (!activeSessionId) {
        showToast('No active session found. Please contact administrator.', 'error');
        setStudents([]);
        return;
      }

      // Fetch students from student_class_history for the active session and selected class/section
      let schQuery = supabase
        .from('student_class_history')
        .select('student_id')
        .eq('session_id', activeSessionId)
        .eq('new_class_id', classId)
        .eq('school_id', user?.school_id);

      if (sectionId === null) {
        schQuery = schQuery.is('new_section_id', null);
      } else {
        schQuery = schQuery.eq('new_section_id', sectionId);
      }

      const { data: schData, error: schError } = await schQuery;

      if (schError) {
        throw schError;
      }

      if (!schData || schData.length === 0) {
        setStudents([]);
        return;
      }

      // Get student IDs from student_class_history
      const studentIds = schData.map(sch => sch.student_id);

      // Fetch full student details
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, father_name, picture_url, class_id, section_id, school_id, roll_number')
        .eq('school_id', user?.school_id)
        .eq('status', 'active')
        .in('id', studentIds);
      
      if (studentsError) {
        throw studentsError;
      }

      const formattedStudents = (studentsData || []).sort((a, b) => a.id - b.id);
      setStudents(formattedStudents);
      
      // View activities are not logged - only create, update, and delete
      try {
        // No activity logging for view actions
      } catch (activityError) {
        // Don't fail the operation if activity logging fails
      }
    } catch (error) {
      showToast('Failed to load students', 'error');
    }
  };


  if (loading) {
    return (
      <LoadingContainer>
        <div style={{ 
          animation: 'spin 1s linear infinite', 
          borderRadius: '50%', 
          height: '128px', 
          width: '128px', 
          borderBottom: '2px solid #3b82f6' 
        }}></div>
      </LoadingContainer>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <PageContainer>
      <Header>
        <HeaderTopRow>
          <Title>Marks Entry Management</Title>
          
          {/* Mobile PDF Button - only visible on mobile and not for teachers */}
          {user?.role !== 'Teacher' && (
            <MobilePdfButton
              onClick={generateMarksSheetPDF}
              disabled={pdfLoading}
              title="Generate Marks Sheet PDF"
            >
              {pdfLoading ? (
                <Spinner />
              ) : (
                <PictureAsPdf style={{ fontSize: 18 }} />
              )}
            </MobilePdfButton>
          )}
          
          {/* Desktop layout - all fields in one row */}
          <DesktopSegmentedGroup>
            <SegmentedGroup >
              <SegmentedSelect
                value={selectedClass?.id || ''}
                onChange={(e) => {
                  const classId = Number(e.target.value);
                  const selected = classes.find(c => c.id === classId);
                  setSelectedClass(selected || null);
                  setSelectedSection(null);
                  setSelectedSubject(null);
                  setStudents([]);
                  setMarksData({});
                }}
                style={{ minWidth: 120 }}
                first
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </SegmentedSelect>
              {(selectedClass?.has_sections ?? true) && (
                <SegmentedSelect
                  value={selectedSection?.id || ''}
                  onChange={(e) => {
                    const sectionId = Number(e.target.value);
                    const selected = sections.find(s => s.id === sectionId);
                    setSelectedSection(selected || null);
                    setSelectedSubject(null);
                    setStudents([]);
                    setMarksData({});
                  }}
                  disabled={!selectedClass}
                  style={{ minWidth: 120 }}
                >
                  <option value="">Select Section</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </SegmentedSelect>
              )}
              {user?.role !== 'Teacher' && (
                <SegmentedSelect
                  value={selectedExam?.id || ''}
                  onChange={(e) => {
                    const examId = Number(e.target.value);
                    const selected = examinations.find(e => e.id === examId);
                    setSelectedExam(selected || null);
                    setSelectedSubject(null);
                  }}
                  style={{ minWidth: 120 }}
                >
                  <option value="">Select Examination</option>
                  {examinations.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.name} ({exam.exam_type})
                    </option>
                  ))}
                </SegmentedSelect>
              )}
              <SegmentedSelect
                value={selectedSubject?.id || ''}
                onChange={(e) => {
                  const subjectId = Number(e.target.value);
                  const selected = subjects.find(s => s.id === subjectId);
                  setSelectedSubject(selected || null);
                }}
                disabled={user?.role !== 'Teacher' && !selectedExam}
                style={{ minWidth: 120 }}
              >
                <option value="">Select Subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.subject?.name || subject.name} (Max: {subject.max_marks || subject.total_marks || 100})
                  </option>
                ))}
              </SegmentedSelect>
              
              {user?.role !== 'Teacher' && (
                <Button
                  variant="secondary"
                  onClick={generateMarksSheetPDF}
                  disabled={pdfLoading}
                  style={{ 
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    opacity: pdfLoading ? 0.7 : 1,
                    cursor: pdfLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {pdfLoading ? (
                    <>
                      <Spinner />
                      Generating...
                    </>
                  ) : (
                    <>
                      <PictureAsPdf style={{ fontSize: 14 }} />
                      Marks Sheet PDF
                    </>
                  )}
                </Button>
              )}
            </SegmentedGroup>
          </DesktopSegmentedGroup>
        </HeaderTopRow>
        
        <HeaderBottomRow>

          {/* Mobile layout - two separate rows */}
          <MobileHeaderLayout>
            {/* First row: Class and Section */}
            <MobileRow>
              <SegmentedGroup >
                <SegmentedSelect
                  value={selectedClass?.id || ''}
                  onChange={(e) => {
                    const classId = Number(e.target.value);
                    const selected = classes.find(c => c.id === classId);
                    setSelectedClass(selected || null);
                    setSelectedSection(null);
                    setSelectedSubject(null);
                    setStudents([]);
                    setMarksData({});
                  }}
                  style={{ minWidth: 120 }}
                  first
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </SegmentedSelect>
                {(selectedClass?.has_sections ?? true) && (
                  <SegmentedSelect
                    value={selectedSection?.id || ''}
                    onChange={(e) => {
                      const sectionId = Number(e.target.value);
                      const selected = sections.find(s => s.id === sectionId);
                      setSelectedSection(selected || null);
                      setSelectedSubject(null);
                      setStudents([]);
                      setMarksData({});
                    }}
                    disabled={!selectedClass}
                    style={{ minWidth: 120 }}
                    last
                  >
                    <option value="">Select Section</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </SegmentedSelect>
                )}
              </SegmentedGroup>
            </MobileRow>

            {/* Second row: Exam and Subject */}
            <MobileRow>
              <SegmentedGroup >
                {user?.role !== 'Teacher' && (
                  <SegmentedSelect
                    value={selectedExam?.id || ''}
                    onChange={(e) => {
                      const examId = Number(e.target.value);
                      const selected = examinations.find(e => e.id === examId);
                      setSelectedExam(selected || null);
                      setSelectedSubject(null);
                    }}
                    style={{ minWidth: 120 }}
                    first
                  >
                    <option value="">Select Examination</option>
                    {examinations.map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.name} ({exam.exam_type})
                      </option>
                    ))}
                  </SegmentedSelect>
                )}
                <SegmentedSelect
                  value={selectedSubject?.id || ''}
                  onChange={(e) => {
                    const subjectId = Number(e.target.value);
                    const selected = subjects.find(s => s.id === subjectId);
                    setSelectedSubject(selected || null);
                  }}
                  disabled={user?.role !== 'Teacher' && !selectedExam}
                  style={{ minWidth: 120 }}
                  last
                >
                  <option value="">Select Subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.subject?.name || subject.name} (Max: {subject.max_marks || subject.total_marks || 100})
                    </option>
                  ))}
                </SegmentedSelect>
              </SegmentedGroup>
            </MobileRow>
          </MobileHeaderLayout>
        </HeaderBottomRow>
      </Header>

      <MainContent ref={mainContentRef}>

        {/* Students and Marks Entry */}
        {hasActiveSession && selectedClass && (selectedClass.has_sections ? !!selectedSection : true) && (user?.role === 'Teacher' ? selectedSubject : selectedExam && selectedSubject) && students.length > 0 && (
          <StudentsList>
            {/* Selection Controls */}
            <SelectionControls>
              <SerialCheckbox
                className={selectedStudents.size === students.length && students.length > 0 ? 'checked' : ''}
                onClick={handleToggleAll}
                title={selectedStudents.size === students.length ? 'Deselect all students' : 'Select all students'}
                style={{ fontSize: '0.6rem', fontWeight: 'bold' }}
              >
                {selectedStudents.size === students.length && students.length > 0 ? '✓' : '○'}
              </SerialCheckbox>
              <span>
                {selectedStudents.size === 0 
                  ? 'Select students to save/delete marks' 
                  : `${selectedStudents.size} of ${students.length} students selected`
                }
              </span>
            </SelectionControls>
            
            {students.map((student, index) => {
              const marksValue = marksData[student.id];
              const maxMarks = selectedSubject.max_marks || selectedSubject.total_marks || 100;
              
              // Handle "A" for absent students and "0" for zero marks
              const obtainedMarks = marksValue === 'A' ? 0 : (marksValue !== undefined && marksValue !== null ? parseFloat(String(marksValue)) : 0);
              const percentage = maxMarks > 0 ? (obtainedMarks / maxMarks) * 100 : 0;
              const isSelected = selectedStudents.has(student.id);
              
              return (
                <StudentRow key={student.id} $isActive={activeStudentId === student.id}>
                  <SerialCheckbox
                    className={isSelected ? 'checked' : ''}
                    onClick={() => handleSelectStudent(student.id, !isSelected)}
                    title={isSelected ? 'Deselect student' : 'Select student'}
                  >
                    {index + 1}
                  </SerialCheckbox>
                  <Avatar>
                    {student.picture_url ? (
                      <img 
                        src={student.picture_url} 
                        alt={student.name}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover', 
                          borderRadius: '50%' 
                        }} 
                      />
                    ) : (
                      student.name.charAt(0).toUpperCase()
                    )}
                  </Avatar>
                  
                  <StudentInfo>
                    {/* Desktop layout - name on top, details below */}
                    <DesktopLayout>
                      <StudentName>{student.name}</StudentName>
                      <StudentDetails>
                        <span>{student.father_name}</span>
                        <StudentId>ID: {getStudentDisplayId(student)}</StudentId>
                      </StudentDetails>
                    </DesktopLayout>
                    
                    {/* Mobile layout - vertical layout */}
                    <MobileStudentLayout>
                      <MobileStudentName>
                        {student.name} - <StudentId>ID: {getStudentDisplayId(student)}</StudentId>
                      </MobileStudentName>
                      <MobileFatherName>{student.father_name}</MobileFatherName>
                    </MobileStudentLayout>
                  </StudentInfo>
                  
                  <MarksInput
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={marksData[student.id] !== undefined ? marksData[student.id] : ''}
                    onChange={(e) => {
                      const inputValue = e.target.value.toUpperCase();
                      handleMarksInput(student.id, inputValue, maxMarks);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, students.indexOf(student), student.id)}
                    onFocus={(e) => handleFocus(student.id, e.target as HTMLInputElement)}
                    onBlur={handleBlur}
                    onInput={(e) => {
                      // Handle mobile keyboard "Next" button and other input events
                      const input = e.target as HTMLInputElement;
                      // Check if this is likely a mobile "Next" button press
                      // by checking if the input loses focus immediately after input
                      setTimeout(() => {
                        if (document.activeElement !== input && students.indexOf(student) + 1 < students.length) {
                          const nextIndex = students.indexOf(student) + 1;
                          const nextInput = document.querySelector(`input[data-student-index="${nextIndex}"]`) as HTMLInputElement;
                          if (nextInput) {
                            nextInput.focus();
                            setTimeout(() => {
                              nextInput.select();
                            }, 0);
                            scrollToKeepVisible(nextInput);
                          }
                        }
                      }, 100);
                    }}
                    placeholder="Obt. Marks"
                    maxLength={10}
                    data-student-index={students.indexOf(student)}
                    $hasError={inputErrors[student.id] || false}
                  />
                  
                  {/* Desktop-only elements */}
                  <PercentageDisplay>
                    <PercentageValue $percentage={percentage}>
                      {marksData[student.id] === 'A' ? 'Absent' : 
                       marksData[student.id] === 0 ? '0%' :
                       isNaN(percentage) ? '0%' : `${percentage.toFixed(1)}%`}
                    </PercentageValue>
                  </PercentageDisplay>
                  
                  <ActionButton
                    onClick={() => {
                      showToast('Marks updated for ' + student.name, 'success');
                    }}
                    disabled={!marksData[student.id]}
                    title="Save marks"
                  >
                    ✓
                  </ActionButton>
                </StudentRow>
              );
            })}
            
          </StudentsList>
        )}

        {/* No Students Message */}
        {hasActiveSession && selectedClass && (selectedClass.has_sections ? !!selectedSection : true) && students.length === 0 && (
          <NoResults>
            No students found in {selectedClass.name}{selectedClass.has_sections && selectedSection ? ` - ${selectedSection.name}` : ''}
          </NoResults>
        )}

        {/* No Active Session Warning */}
        {!hasActiveSession && (
          <NoResults>
            <div style={{ 
              background: '#fef3c7', 
              border: '1px solid #f59e0b', 
              borderRadius: '8px', 
              padding: '16px', 
              color: '#92400e',
              textAlign: 'center'
            }}>
              <strong>⚠️ No Active Session Found</strong>
              <br />
              Please contact your administrator to set up an active academic session.
              <br />
              <small>Marks entry requires an active session to maintain proper academic records.</small>
            </div>
          </NoResults>
        )}

        {/* No Selection Message */}
        {hasActiveSession && (!selectedClass || !(selectedClass.has_sections ? !!selectedSection : true) || (user?.role !== 'Teacher' && !selectedExam) || !selectedSubject) && (
          <NoResults>
            Please select Class{selectedClass?.has_sections ? ', Section' : ''}{user?.role !== 'Teacher' ? ', Examination' : ''}, and Subject to view students
          </NoResults>
        )}
      </MainContent>

      {showToTop && (
        <ToTopButton onClick={() => mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
          <KeyboardArrowUpIcon />
        </ToTopButton>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <ModalOverlay onClick={handleCancelModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>List Completed</ModalTitle>
            <ModalMessage>
              You have reached the end of the student list. Would you like to save all the marks you have entered?
            </ModalMessage>
            <ModalButtons>
              <ModalButton variant="secondary" onClick={handleCancelModal}>
                Cancel
              </ModalButton>
              <ModalButton variant="primary" onClick={handleSaveFromModal} disabled={saving}>
                {saving ? (
                  <>
                    <Spinner />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </ModalButton>
            </ModalButtons>
          </ModalContent>
        </ModalOverlay>
      )}
      </PageContainer>
    </ThemeProvider>
  );
};

export default MarksEntryManager;