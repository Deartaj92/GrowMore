import React, { useState, useEffect, useContext, useMemo, useCallback, memo, useRef } from 'react';
import styled, { keyframes, DefaultTheme, css } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';
import { sortClasses } from '../utils/classUtils';
import { ThemeContext, darkTheme, lightTheme } from '../contexts/ThemeContext';
import { supabase } from '../supabaseClient';
import { examinationService } from '../services/examinationService';
import { examinationSummaryService, ExaminationSummary } from '../services/examinationSummaryService';
import { Examination, ExamMasterSheet } from '../types/examinations';
import { useNavigate } from 'react-router-dom';
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
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Textfit } from '@techstack/react-textfit';
import GlowingCards, { GlowingCard } from './ui/glowing-cards';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Interfaces
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
  picture_url?: string;
  class_id: number;
  section_id: number;
  school_id: number;
}

interface MasterSheetData {
  student_id: number;
  student_name: string;
  father_name?: string;
  class_name: string;
  section_name: string;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  grade?: string;
  status: 'pass' | 'fail' | 'absent';
  position: number;
  rank_in_class: number;
  rank_in_section: number;
  subject_scores?: { [key: string]: number | string };
  individual_results?: any[];
  remarks?: string;
}

// Styled components matching StudentList.tsx patterns
const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 8px 0 8px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  height: 92vh;
  display: flex;
  flex-direction: column;
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

// Enhanced Header Components (matching AttendanceReport)
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

const SegmentedSelect = styled.select<{ first?: boolean; last?: boolean; $isSection?: boolean; $isPdf?: boolean }>`
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
  
  /* Mobile-specific styling for section and PDF */
  ${({ $isSection, $isPdf }) => ($isSection || $isPdf) && `
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

const SegmentedButton = styled.button<{ first?: boolean; last?: boolean; $isPdf?: boolean }>`
  font-family: inherit;
  font-size: 0.7em;
  font-weight: 400;
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
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

const HeaderFilters = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  background: ${({ theme }) => theme.CARD};
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  padding: 6px 8px;
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
    background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#f3f4f6'};
    color: ${({ theme }) => theme.BG === '#252525' ? '#C0C0C0' : '#374151'};
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 1.4px 1.4px 4px #2222;
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 10;
    
    &:hover {
      background: ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
      transform: translateY(-1px);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
  }
`;



const SelectionCard = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : theme.CARD};
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  padding: 20px;
  margin-bottom: 20px;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    transform: translateY(-2px);
  }
`;

const SelectionTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SelectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
`;

const SelectionItem = styled.div<{ selected?: boolean }>`
  background: ${({ selected, theme }) => 
    selected 
      ? theme.ACCENT 
      : theme.BG === '#252525' ? '#333' : '#f8f9fa'};
  color: ${({ selected }) => selected ? '#fff' : 'inherit'};
  border: 2px solid ${({ selected, theme }) => 
    selected ? theme.ACCENT : theme.FIELD_BORDER};
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT};
    transform: translateY(-1px);
  }
`;

// Professional Master Sheet Components
const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  background: ${({ theme }) => theme.CARD};
  border-radius: 14px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 1.5px solid ${({ theme }) => theme.BORDER};
  margin: 16px 0;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 1200px;
  
  thead tr:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#f3f4f8'} !important;
  }
  
  tbody tr {
    transition: background-color 0.2s ease;
    cursor: pointer;
  }
  
  tbody tr:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#3a3a3a' : '#e5e7eb'} !important;
  }
`;

const Th = styled.th`
  padding: 0.25rem 0.2rem;
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 700;
  font-size: 0.93rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.CARD};
  position: sticky;
  top: 0;
  z-index: 2;
  min-width: 34px;
  max-width: 36px;
`;

const Td = styled.td`
  padding: 0.18rem 0.2rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  font-size: 0.97rem;
  text-align: center;
  min-width: 34px;
  max-width: 36px;
  
  /* Force specific colors for ID and Total columns */
  &.id-column {
    color: ${({ theme }) => theme.BG === '#252525' ? '#e2e8f0' : '#000000'} !important;
    font-weight: 600;
  }
  
  &.total-column {
    color: ${({ theme }) => theme.BG === '#252525' ? '#e2e8f0' : '#000000'} !important;
    font-weight: 700;
  }
`;

const StudentNameCell = styled(Td)`
  font-weight: 700;
  text-align: left;
  color: ${({ theme }) => theme.BG === '#252525' ? '#fff' : '#232323'};
  min-width: 120px;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FatherNameCell = styled(Td)`
  font-weight: 500;
  text-align: left;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  min-width: 120px;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SubjectCell = styled(Td)<{ $highlight?: boolean }>`
  font-weight: 600;
  color: ${({ $highlight, theme }) => 
    $highlight ? theme.ACCENT : theme.TEXT_PRIMARY
  };
  background: ${({ $highlight }) => 
    $highlight ? 'rgba(34, 197, 94, 0.08)' : 'transparent'
  };
`;

const AbsentCell = styled(Td)`
  font-weight: 700;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  text-align: center;
`;

const PoorScoreCell = styled(Td)`
  font-weight: 600;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  text-align: center;
`;

const PositionCell = styled(Td)<{ $position: number }>`
  font-weight: 600;
  font-size: 0.8rem;
  color: ${({ $position, theme }) => {
    if ($position === 1) return '#ffd700'; // Bright gold
    if ($position === 2) return '#fbbf24'; // Amber
    if ($position === 3) return '#f59e0b'; // Orange-yellow
    if ($position <= 10) return '#3b82f6';
    return theme.TEXT_SECONDARY;
  }};
  text-align: center;
  padding: 4px 8px;
`;

const PercentageCell = styled(Td)<{ $percentage: number }>`
  font-weight: 600;
  color: ${({ $percentage }) => {
    if ($percentage >= 80) return '#10b981';
    if ($percentage >= 60) return '#f59e0b';
    if ($percentage >= 40) return '#f97316';
    return '#ef4444';
  }};
  text-align: center;
`;

const RemarksCell = styled(Td)`
  text-align: left;
  min-width: 200px;
  max-width: 300px;
`;

const RemarksInput = styled.input<{ $status: string }>`
  width: 100%;
  font-size: 0.7rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  padding: 4px 8px;
  background: ${({ $status }) => {
    if ($status === 'pass') return 'rgba(34, 197, 94, 0.1)';
    if ($status === 'fail') return 'rgba(239, 68, 68, 0.1)';
    return 'rgba(156, 163, 175, 0.1)';
  }};
  border-radius: 6px;
  border: ${({ $status }) => {
    if ($status === 'pass') return '1px solid rgba(34, 197, 94, 0.2)';
    if ($status === 'fail') return '1px solid rgba(239, 68, 68, 0.2)';
    return '1px solid rgba(156, 163, 175, 0.2)';
  }};
  outline: none;
  transition: all 0.2s ease;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}20;
  }
`;

// Footer Components
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

const PositionBadge = styled.div<{ $position: number }>`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  font-weight: 700;
  background: ${({ $position }) => {
    if ($position === 1) return 'linear-gradient(135deg, #ffd700, #ffed4e)';
    if ($position === 2) return 'linear-gradient(135deg, #c0c0c0, #e5e7eb)';
    if ($position === 3) return 'linear-gradient(135deg, #cd7f32, #f59e0b)';
    return '#f3f4f6';
  }};
  color: ${({ $position }) => $position <= 3 ? '#ffffff' : '#6b7280'};
  box-shadow: ${({ $position }) => 
    $position <= 3 ? '0 2px 4px rgba(0, 0, 0, 0.15)' : '0 1px 2px rgba(0, 0, 0, 0.05)'
  };
  border: ${({ $position }) => 
    $position <= 3 ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid #e5e7eb'
  };
`;

const StudentInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const StudentName = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.7rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
`;

const StudentDetails = styled.div`
  font-size: 0.65rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
`;

const ScoreCell = styled.div<{ $highlight?: boolean }>`
  text-align: center;
  font-weight: 500;
  font-size: 0.7rem;
  color: ${({ $highlight, theme }) => 
    $highlight ? theme.ACCENT : theme.TEXT_PRIMARY
  };
  min-height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StatusBadge = styled.div<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ $status }) => {
    if ($status === 'pass') return '#dcfce7';
    if ($status === 'fail') return '#fef2f2';
    if ($status === 'absent') return '#f3f4f6';
    return '#f3f4f6';
  }};
  color: ${({ $status }) => {
    if ($status === 'pass') return '#166534';
    if ($status === 'fail') return '#dc2626';
    if ($status === 'absent') return '#6b7280';
    return '#6b7280';
  }};
`;

const GradeBadge = styled.div<{ $grade: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 20px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  background: ${({ $grade }) => {
    if ($grade.includes('A')) return '#dcfce7';
    if ($grade.includes('B')) return '#dbeafe';
    if ($grade.includes('C')) return '#fef3c7';
    if ($grade.includes('D')) return '#fed7aa';
    if ($grade.includes('F')) return '#fef2f2';
    return '#f3f4f6';
  }};
  color: ${({ $grade }) => {
    if ($grade.includes('A')) return '#166534';
    if ($grade.includes('B')) return '#1e40af';
    if ($grade.includes('C')) return '#d97706';
    if ($grade.includes('D')) return '#ea580c';
    if ($grade.includes('F')) return '#dc2626';
    return '#6b7280';
  }};
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 35px 120px 120px 50px 50px 50px 50px 50px 50px 50px 50px 50px 50px 50px 45px 45px 1fr;
  gap: 0;
  padding: 6px;
  background: ${({ theme }) => theme.BG};
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
  font-size: 0.7rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.2px;
  min-height: 28px;
`;


const SummaryCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin: 16px 0;
`;

const SummaryCard = styled.div<{ $type: string }>`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 6px;
  padding: 12px;
  text-align: center;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const SummaryValue = styled.div<{ $type: string }>`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ $type }) => {
    if ($type === 'total') return '#1f2937';
    if ($type === 'pass') return '#10b981';
    if ($type === 'fail') return '#ef4444';
    if ($type === 'absent') return '#f59e0b';
    if ($type === 'average') return '#3b82f6';
    return '#6b7280';
  }};
  margin-bottom: 4px;
`;

const SummaryLabel = styled.div`
  font-size: 0.7rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'success' | 'info' }>`
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  
  ${({ variant, theme }) => {
    switch (variant) {
      case 'primary':
        return `
          background: ${theme.ACCENT};
          color: #fff;
          &:hover {
            background: ${theme.ACCENT}dd;
            transform: translateY(-1px);
          }
        `;
      case 'success':
        return `
          background: #10b981;
          color: #fff;
          &:hover {
            background: #059669;
            transform: translateY(-1px);
          }
        `;
      case 'info':
        return `
          background: #3b82f6;
          color: #fff;
          &:hover {
            background: #2563eb;
            transform: translateY(-1px);
          }
        `;
      default:
        return `
          background: ${theme.BG === '#252525' ? '#444' : '#f3f4f6'};
          color: ${theme.TEXT_PRIMARY};
          border: 1px solid ${theme.FIELD_BORDER};
          &:hover {
            background: ${theme.BG === '#252525' ? '#555' : '#e5e7eb'};
          }
        `;
    }
  }}
`;

const NoResults = styled.div`
  text-align: center;
  color: #b0b8d1;
  font-size: 1.1rem;
  margin: 48px 0;
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

const MainContent = styled.div`
  flex: 1;
  overflow: hidden;
  padding: 0 2px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  
  /* Mobile enhancements - add bottom padding for fixed footer */
  @media (max-width: 480px) {
    padding-bottom: 60px;
  }
`;

const ScrollableTableContainer = styled.div`
  flex: 1;
  overflow: auto;
  border-radius: 8px;
  
  /* Minimal scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525' ? '#1a1a1a' : '#f1f1f1'};
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? '#4a4a4a' : '#c1c1c1'};
    border-radius: 4px;
    transition: background 0.2s ease;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#5a5a5a' : '#a1a1a1'};
  }
  
  &::-webkit-scrollbar-corner {
    background: ${({ theme }) => theme.BG === '#252525' ? '#1a1a1a' : '#f1f1f1'};
  }
`;


// Subject ordering configuration - handles variations in naming
const getSubjectOrder = (subjectName: string): number => {
  const name = subjectName.toLowerCase().trim();
  
  // English subjects
  if (name.includes('english') && !name.includes('b')) return 1;
  if (name.includes('english') && name.includes('b')) return 2;
  
  // Urdu subjects
  if (name.includes('urdu') && !name.includes('b')) return 3;
  if (name.includes('urdu') && name.includes('b')) return 4;
  
  // Mathematics
  if (name.includes('math') || name.includes('mathematics')) return 5;
  
  // Islamic subjects
  if (name.includes('islam') || name.includes('islamiyat') || name.includes('islamiat')) return 6;
  if (name.includes('pak study') || name.includes('pakistan')) return 7;
  if (name.includes('mutala') || name.includes('quran')) return 8;
  
  // Science subjects
  if (name.includes('biology')) return 9;
  if (name.includes('chemistry')) return 10;
  if (name.includes('physics')) return 11;
  
  // Social subjects
  if (name.includes('social') || name.includes('study')) return 12;
  if (name.includes('general science')) return 13;
  if (name.includes('general knowledge') || name.includes('gk')) return 14;
  
  // Islamic studies
  if (name.includes('nazra') || name.includes('nazira')) return 15;
  if (name.includes('hifz') || name.includes('hifazat')) return 16;
  
  // Default order for other subjects
  return 999;
};

const MasterSheetManager: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { theme } = useContext(ThemeContext);
  const { setLoading, loading } = useLoading();
  
  // State for data
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [masterSheetData, setMasterSheetData] = useState<MasterSheetData[]>([]);
  const [subjectsWithResults, setSubjectsWithResults] = useState<any[]>([]);
  
  // Selected values
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedExam, setSelectedExam] = useState<Examination | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  
  const [generating, setGenerating] = useState(false);
  const [showToTop, setShowToTop] = useState(false);
  const [editingRemarks, setEditingRemarks] = useState<{ [key: number]: string }>({});
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.school_id) {
      loadClasses();
      loadExaminations();
    }
  }, [user?.school_id]);

  useEffect(() => {
    if (selectedClass) {
      // Check if the class has sections
      const hasSections = selectedClass.has_sections ?? true;
      if (hasSections) {
        loadSections(selectedClass.id);
      } else {
        setSections([]);
        setSelectedSection(null);
      }
    } else {
      setSections([]);
      setSelectedSection(null);
    }
  }, [selectedClass]);

  // Load classes
  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, school_id, has_sections')
        .eq('school_id', user?.school_id);
      
      if (error) throw error;
      
      // Sort classes: numbered classes first, then special classes (Play Group, Nursery, K.G)
      const sortedClasses = sortClasses(data || []);
      
      setClasses(sortedClasses);
    } catch (error) {
      showToast('Failed to load classes', 'error');
    }
  };

  // Load sections for selected class
  const loadSections = async (classId: number) => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('class_id', classId)
        .eq('school_id', user?.school_id)
        .order('name');
      
      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      showToast('Failed to load sections', 'error');
    }
  };

  const loadExaminations = async () => {
    try {
      setLoading(true);
      // Fetch both published and archived examinations
      const [publishedData, archivedData] = await Promise.all([
        examinationService.getExaminations({ status: 'published' }, user?.school_id),
        examinationService.getExaminations({ status: 'archived' }, user?.school_id)
      ]);
      // Combine and remove duplicates (in case an exam has both statuses somehow)
      const allExaminations = [...publishedData, ...archivedData];
      const uniqueExaminations = Array.from(
        new Map(allExaminations.map(exam => [exam.id, exam])).values()
      );
      // Sort by created_at descending
      uniqueExaminations.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
      setExaminations(uniqueExaminations);
    } catch (error) {
      showToast('Failed to load examinations', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load master sheet data from exam_results
  const loadMasterSheetData = useCallback(async () => {
    if (!selectedExam || !selectedClass) return;

    // Check if the class has sections
    const hasSections = selectedClass.has_sections ?? true;
    if (hasSections && !selectedSection) return;

    try {
      setLoading(true);
      
      // Always calculate the detailed master sheet data
      // The examination summaries are stored for quick access in StudentProfile
      // but MasterSheetManager should always show the full detailed view
      
      // Get all students for the selected class/section (regardless of status)
      const studentQuery = supabase
        .from('students')
        .select('id, name, father_name, picture_url, class_id, section_id, school_id')
        .eq('school_id', user?.school_id)
        .eq('class_id', selectedClass.id);
      
      // Add section filter only if the class has sections
      if (hasSections && selectedSection) {
        studentQuery.eq('section_id', selectedSection.id);
      } else if (!hasSections) {
        studentQuery.is('section_id', null);
      }

      const { data: students, error: studentsError } = await studentQuery;
      if (studentsError) throw studentsError;

      if (!students || students.length === 0) {
        setMasterSheetData([]);
        return;
      }

      // Get exam results for all subjects in this exam
      const { data: examResults, error: resultsError } = await supabase
        .from('exam_results')
        .select(`
          student_id,
          obtained_marks,
          max_marks,
          percentage,
          grade,
          remarks,
          subject_id,
          subjects!inner(name, short_name)
        `)
        .eq('exam_id', selectedExam.id)
        .eq('school_id', user?.school_id)
        .in('student_id', students.map(s => s.id));

      if (resultsError) throw resultsError;

      // Get unique subjects that have exam results
      const subjectsWithResults = new Set();
      examResults?.forEach(result => {
        subjectsWithResults.add(result.subject_id);
      });

      // Store subjects with results for header generation
      const subjectsData = examResults?.reduce((acc, result) => {
        if (!acc[result.subject_id]) {
          acc[result.subject_id] = {
            id: result.subject_id,
            name: (result.subjects as any)?.name,
            short_name: (result.subjects as any)?.short_name,
            max_marks: result.max_marks
          };
        }
        return acc;
      }, {} as any) || {};

      // Convert to array and sort by subject order
      const subjectsArray = Object.values(subjectsData).sort((a: any, b: any) => {
        const orderA = getSubjectOrder(a.name || '');
        const orderB = getSubjectOrder(b.name || '');
        return orderA - orderB;
      });
      setSubjectsWithResults(subjectsArray);

      // Group results by student
      const studentResults: { [studentId: number]: any[] } = {};
      examResults?.forEach(result => {
        if (!studentResults[result.student_id]) {
          studentResults[result.student_id] = [];
        }
        studentResults[result.student_id].push(result);
      });

      // Calculate total marks from all subjects with results (consistent for all students)
      const totalExamMarks = subjectsArray.reduce((sum: number, subject: any) => sum + (subject.max_marks || 0), 0);

      // Filter out students who don't have any examination records
      const studentsWithResults = students.filter(student => {
        const results = studentResults[student.id] || [];
        return results.length > 0; // Only include students who have at least one exam result
      });

      if (studentsWithResults.length === 0) {
        setMasterSheetData([]);
        return;
      }

      // Calculate master sheet data for each student (only those with exam results)
      const masterSheetData: MasterSheetData[] = studentsWithResults.map(student => {
        const results = studentResults[student.id] || [];
        const obtainedMarks = results.reduce((sum, r) => sum + (r.obtained_marks || 0), 0);
        const percentage = totalExamMarks > 0 ? (obtainedMarks / totalExamMarks) * 100 : 0;
        
        // Determine status using dynamic passing marks from examination
        let status: 'pass' | 'fail' | 'absent' = 'pass';
        if (results.some(r => r.remarks === 'Absent')) {
          status = 'absent';
        } else if (percentage < (selectedExam.passing_marks || 40)) {
          status = 'fail';
        }

        // Generate remarks based on percentage using dynamic passing marks
        const passingMarks = selectedExam.passing_marks || 40;
        let remarks = '';
        if (percentage < passingMarks) {
          remarks = 'Need to Work Hard';
        } else if (percentage < 60) {
          remarks = 'Good';
        } else if (percentage < 70) {
          remarks = 'Very Good';
        } else if (percentage < 80) {
          remarks = 'Excellent';
        } else {
          remarks = 'Excellent - Keep it up!';
        }

        // Calculate grade based on percentage
        const averageGrade = calculateGrade(percentage);

        // Create subject scores mapping using actual subject data from database
        const subjectScores: { [key: string]: number | string } = {};
        results.forEach(result => {
          const subject = result.subjects as any;
          const subjectCode = subject?.short_name || subject?.name?.substring(0, 3).toUpperCase();
          
          // Check if student was absent for this subject
          if (result.remarks === 'Absent' || result.obtained_marks === 0 && result.remarks?.toLowerCase().includes('absent')) {
            subjectScores[subjectCode] = 'A';
          } else {
            // Store the actual obtained marks (including 0)
            subjectScores[subjectCode] = result.obtained_marks;
          }
        });

        return {
          student_id: student.id,
          student_name: student.name,
          father_name: student.father_name,
          class_name: selectedClass.name,
          section_name: hasSections ? (selectedSection?.name || 'All') : '',
          total_marks: totalExamMarks,
          obtained_marks: obtainedMarks,
          percentage: percentage,
          grade: averageGrade,
          status: status,
          position: 0, // Will be calculated after sorting
          rank_in_class: 0,
          rank_in_section: 0,
          subject_scores: subjectScores,
          individual_results: results,
          remarks: remarks
        };
      });

      // First, sort by obtained marks to assign positions
      const sortedByMarks = [...masterSheetData].sort((a, b) => b.obtained_marks - a.obtained_marks);
      
      // Assign positions with proper handling of ties
      let currentPosition = 1;
      for (let i = 0; i < sortedByMarks.length; i++) {
        const student = sortedByMarks[i];
        const currentMarks = student.obtained_marks;
        
        // Count how many students have the same marks as current student
        let sameMarksCount = 1;
        for (let j = i + 1; j < sortedByMarks.length; j++) {
          if (sortedByMarks[j].obtained_marks === currentMarks) {
            sameMarksCount++;
          } else {
            break;
          }
        }
        
        // Assign the same position to all students with same marks
        for (let k = 0; k < sameMarksCount; k++) {
          sortedByMarks[i + k].position = currentPosition;
          sortedByMarks[i + k].rank_in_class = currentPosition;
          sortedByMarks[i + k].rank_in_section = currentPosition;
        }
        
        // Move to next position (skip the tied students and increment by 1)
        i += sameMarksCount - 1;
        currentPosition = currentPosition + 1; // Always increment by 1 for next position
      }

      // Then sort by student ID for display
      masterSheetData.sort((a, b) => a.student_id - b.student_id);

      // Store examination summaries in the database
      await storeExaminationSummaries(masterSheetData, selectedExam, selectedClass, selectedSection, user?.school_id);

      setMasterSheetData(masterSheetData);
    } catch (error) {
      showToast('Failed to load master sheet data', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedExam, selectedClass, selectedSection, user?.school_id]);

  // Function to load examination summaries from the database
  const loadExaminationSummaries = async (): Promise<MasterSheetData[]> => {
    if (!selectedExam || !selectedClass || !user?.school_id) return [];

    try {
      const hasSections = selectedClass.has_sections ?? true;
      
      // Build filters based on whether class has sections
      const filters: any = {
        examination_id: selectedExam.id,
        class_id: selectedClass.id,
        school_id: user.school_id
      };
      
      // Only add section_id filter if the class has sections
      if (hasSections) {
        if (selectedSection) {
          filters.section_id = selectedSection.id;
        }
        // If class has sections but no section is selected, don't load summaries
        else {
          return [];
        }
      } else {
        // For non-sectioned classes, explicitly filter for null section_id
        filters.section_id = null;
      }

      const summaries = await examinationSummaryService.getExaminationSummaries(filters);

      // Convert examination summaries to master sheet data format
      return summaries.map(summary => ({
        student_id: summary.student_id,
        student_name: (summary.student as any)?.name || 'Unknown',
        father_name: (summary.student as any)?.father_name,
        class_name: (summary.class as any)?.name || selectedClass.name,
        section_name: hasSections ? ((summary.section as any)?.name || selectedSection?.name || '') : '',
        total_marks: summary.total_marks,
        obtained_marks: summary.obtained_marks,
        percentage: summary.percentage,
        grade: summary.grade,
        status: summary.status as 'pass' | 'fail' | 'absent',
        position: summary.position,
        rank_in_class: summary.rank_in_class,
        rank_in_section: summary.rank_in_section,
        subject_scores: {}, // Will be populated if needed
        individual_results: [], // Will be populated if needed
        remarks: summary.remarks
      }));
    } catch (error) {
      return [];
    }
  };

  // Function to store examination summaries in the database
  const storeExaminationSummaries = async (
    masterSheetData: MasterSheetData[], 
    selectedExam: Examination, 
    selectedClass: Class, 
    selectedSection: Section | null, 
    schoolId: number | undefined
  ) => {
    if (!schoolId || !selectedExam.session_id) return;

    try {
      const hasSections = selectedClass.has_sections ?? true;
      
      // Convert master sheet data to examination summaries
      const examinationSummaries: ExaminationSummary[] = masterSheetData.map(student => ({
        examination_id: selectedExam.id,
        student_id: student.student_id,
        class_id: selectedClass.id,
        section_id: hasSections ? (selectedSection?.id || null) : null,
        school_id: schoolId,
        session_id: selectedExam.session_id,
        obtained_marks: student.obtained_marks,
        total_marks: student.total_marks,
        percentage: student.percentage,
        grade: student.grade,
        position: student.position,
        rank_in_class: student.rank_in_class,
        rank_in_section: student.rank_in_section,
        total_strength: masterSheetData.length,
        status: student.status,
        remarks: student.remarks
      }));

      // Bulk upsert examination summaries
      await examinationSummaryService.bulkUpsertExaminationSummaries(examinationSummaries);
      
    } catch (error) {
      // Don't show error to user as this is a background operation
    }
  };

  useEffect(() => {
    if (selectedExam && selectedClass) {
      // Check if the class has sections
      const hasSections = selectedClass.has_sections ?? true;
      if (hasSections && selectedSection) {
        loadMasterSheetData();
      } else if (!hasSections) {
        loadMasterSheetData();
      }
    }
  }, [selectedExam, selectedClass, selectedSection, loadMasterSheetData]);

  const handleGenerateMasterSheet = async () => {
    if (!selectedExam || !selectedClass) return;

    try {
      setGenerating(true);
      await examinationService.generateMasterSheet(
        selectedExam.id,
        selectedClass.id,
        selectedSection?.id || undefined,
        user?.school_id
      );
      showToast('Master sheet generated successfully', 'success');
      loadMasterSheetData();
    } catch (error) {
      showToast('Failed to generate master sheet', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleRefreshSummaries = async () => {
    if (!selectedExam || !selectedClass) return;

    try {
      setLoading(true);
      showToast('Refreshing examination summaries...', 'success');
      
      // Delete existing summaries for this examination
      await examinationSummaryService.deleteExaminationSummariesByExam(selectedExam.id, user?.school_id || 0);
      
      // Reload master sheet data (which will recalculate and store new summaries)
      await loadMasterSheetData();
      
      showToast('Examination summaries refreshed successfully', 'success');
    } catch (error) {
      showToast('Failed to refresh examination summaries', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get proper position suffix
  const getPositionSuffix = (position: number): string => {
    const lastDigit = position % 10;
    const lastTwoDigits = position % 100;
    
    // Handle special cases for 11th, 12th, 13th
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return `${position}th`;
    }
    
    // Handle regular cases
    switch (lastDigit) {
      case 1:
        return `${position}st`;
      case 2:
        return `${position}nd`;
      case 3:
        return `${position}rd`;
      default:
        return `${position}th`;
    }
  };

  const handleExportMasterSheetPDF = async () => {
    if (!selectedExam || !selectedClass || !masterSheetData.length) {
      showToast('Please generate master sheet data first', 'error');
      return;
    }

    setExportLoading(true);
    try {
      // Check if it's a mobile device
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Show immediate feedback for mobile users
      if (isMobileDevice) {
        showToast('Generating PDF for mobile... Please wait.', 'success');
      }
      // Fetch session name from sessions table
      let sessionName = 'N/A';
      if (selectedExam.session_id) {
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('name')
          .eq('id', selectedExam.session_id)
          .single();
        
        if (!sessionError && sessionData?.name) {
          sessionName = sessionData.name;
        }
      }

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Set font styles
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);

      // Add title
      const title = `Master Sheet - ${selectedExam.name}`;
      doc.text(title, 14, 20);
      
      // Add class/section info to top right
      const hasSections = selectedClass.has_sections ?? true;
      const classSectionStr = `${selectedClass.name}${hasSections && selectedSection ? ` - ${selectedSection.name}` : ''}`;
      doc.text(classSectionStr, doc.internal.pageSize.getWidth() - 14, 20, { align: 'right' });

      // Add subtitle with exam details
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Session: ${sessionName}`, 14, 30);
      doc.text(`Total Students: ${masterSheetData.length}`, 80, 30);
      doc.text(`Passing Marks: ${selectedExam.passing_marks || 40}%`, 160, 30);

      // Helper function to calculate grade based on percentage
      const calculateGrade = (percentage: number): string => {
        if (percentage >= 90) return 'A+';
        if (percentage >= 80) return 'A';
        if (percentage >= 70) return 'B';
        if (percentage >= 60) return 'C';
        if (percentage >= 50) return 'D';
        return 'F';
      };

      // Prepare table data - match on-screen structure exactly, sorted by student ID
      const sortedData = [...masterSheetData].sort((a, b) => a.student_id - b.student_id);
      const tableData = sortedData.map((student, idx) => {
        const row = [
          (idx + 1).toString(), // ID (position)
          student.student_name, // Name
          student.father_name || 'N/A', // Father
        ];
        
        // Add dynamic subject columns
        subjectsWithResults.forEach((subject) => {
          const subjectCode = subject.short_name || subject.name?.substring(0, 3).toUpperCase();
          
          const score = student.subject_scores?.[subjectCode];
          if (score === undefined || score === null) {
            row.push('-'); // No result recorded
          } else if (score === 'A') {
            row.push('A'); // Absent
          } else {
            row.push(score.toString()); // Actual score
          }
        });
        
        // Add remaining columns
        row.push(
          student.total_marks.toFixed(0), // Total
          `${student.obtained_marks.toFixed(0)} - ${(student.grade && student.grade !== 'N/A') ? student.grade : calculateGrade(student.percentage)}`, // Obt with grade
          `${student.percentage.toFixed(1)}%`, // Per
          getPositionSuffix(student.position) // PO (Position)
        );
        
        return row;
      });

      // Prepare table headers - match on-screen exactly
      const headers = ['ID', 'Name', 'Father'];
      
      // Add dynamic subject headers with max marks
      subjectsWithResults.forEach((subject) => {
        const subjectCode = subject.short_name || subject.name?.substring(0, 3).toUpperCase();
        const maxMarks = subject.max_marks || 0;
        headers.push(`${subjectCode} (${maxMarks})`);
      });
      
      // Add remaining headers
      headers.push('Total', 'Obt', 'Per', 'PO');

      // Build columnStyles for proper column widths - match on-screen structure
      const totalWidth = 270;
      
      // Calculate dynamic widths based on number of subjects
      const subjectColumnsCount = subjectsWithResults.length;
      const fixedColumnsWidth = 12 + 35 + 15 + 20 + 15 + 15; // ID + Name (fixed) + Total + Obt + Per + PO
      const subjectColumnsWidth = subjectColumnsCount * 12; // Each subject column is 12mm
      const availableWidth = totalWidth - fixedColumnsWidth - subjectColumnsWidth;
      
      // Dynamic width for Father column only (Name stays fixed at 35mm)
      const fatherWidth = Math.max(20, availableWidth); // Minimum 20mm
      
      const columnStyles: any = {
        0: { cellWidth: 12, halign: 'center', valign: 'middle' }, // ID
        1: { cellWidth: 35, halign: 'left', valign: 'middle' }, // Name (fixed)
        2: { cellWidth: fatherWidth, halign: 'left', valign: 'middle' }, // Father (dynamic)
      };
      
      // Add dynamic subject column styles
      let colIndex = 3;
      subjectsWithResults.forEach((subject) => {
        columnStyles[colIndex] = { cellWidth: 12, halign: 'center', valign: 'middle' }; // Subject columns
        colIndex++;
      });
      
      // Add remaining column styles
      columnStyles[colIndex] = { cellWidth: 15, halign: 'center', valign: 'middle' }; // Total
      columnStyles[colIndex + 1] = { cellWidth: 20, halign: 'center', valign: 'middle' }; // Obt (wider for grade)
      columnStyles[colIndex + 2] = { cellWidth: 15, halign: 'center', valign: 'middle' }; // Per
      columnStyles[colIndex + 3] = { cellWidth: 15, halign: 'center', valign: 'middle' }; // PO

      // Add table
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 35,
        margin: { left: 14 },
        styles: {
          fontSize: 8,
          cellPadding: 1.5,
          overflow: 'linebreak',
          halign: 'center',
          lineColor: [0, 0, 0],
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        columnStyles,
        didParseCell: function(data) {
          // Skip header row - don't apply position highlighting to header
          if (data.row.section === 'head') {
            return;
          }
          
          // Get the student data for this row to check position
          // data.row.index corresponds directly to the tableData array (which is sortedData)
          const student = sortedData[data.row.index];
          const position = student ? student.position : 0;
          
          // Highlight entire row based on position (1st, 2nd, 3rd)
          if (position === 1 || position === 2 || position === 3) {
            // Top 3 places - light yellow background
            data.cell.styles.fillColor = [254, 243, 199]; // Light yellow
          }
          
          // Style for subject cells (absent and poor scores)
          const subjectColumnsStart = 3;
          const subjectColumnsEnd = subjectColumnsStart + subjectsWithResults.length - 1;
          
          if (data.column.index >= subjectColumnsStart && data.column.index <= subjectColumnsEnd) {
            const score = String(data.cell.raw || '');
            if (score === 'A') {
              // Absent - red text and light red background
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fillColor = [254, 202, 202]; // Darker red background
            } else if (score === '-') {
              // No result recorded - gray text
              data.cell.styles.textColor = [107, 114, 128]; // Gray color
            } else {
              // Check for poor scores (below passing marks)
              const subjectIndex = data.column.index - subjectColumnsStart;
              const subject = subjectsWithResults[subjectIndex];
              const maxMarks = subject?.max_marks || 100;
              const passingMarks = selectedExam.passing_marks || 40;
              const percentage = maxMarks > 0 ? (Number(score) / maxMarks) * 100 : 0;
              
              if (percentage < passingMarks) {
                // Poor score (including 0 marks) - red text and light red background
                data.cell.styles.textColor = [220, 38, 38];
                data.cell.styles.fillColor = [254, 202, 202]; // Darker red background
              }
            }
          }
          
          // Style for obtained marks cells (Obt column) - make bold
          const obtColumnIndex = subjectColumnsStart + subjectsWithResults.length + 1; // Total, Obt
          if (data.column.index === obtColumnIndex) {
            data.cell.styles.fontStyle = 'bold';
          }
          
          // Style for percentage cells (Per column)
          const perColumnIndex = subjectColumnsStart + subjectsWithResults.length + 2; // Total, Obt, Per
          if (data.column.index === perColumnIndex) {
            const percentage = parseFloat(String(data.cell.raw || '0').replace('%', ''));
            if (percentage >= 90) {
              data.cell.styles.textColor = [22, 163, 74];
            } else if (percentage >= 80) {
              data.cell.styles.textColor = [34, 197, 94];
            } else if (percentage >= 70) {
              data.cell.styles.textColor = [245, 158, 66];
            } else if (percentage < 70) {
              data.cell.styles.textColor = [220, 38, 38];
            }
          }
        }
      });

      // Add position holders table (all students with 1st, 2nd, 3rd positions)
      const positionHolders = [...masterSheetData]
        .sort((a, b) => a.position - b.position)
        .filter(student => student.position <= 3 && student.status !== 'absent');

      if (positionHolders.length > 0) {
        // Check if we need a new page for position holders
        const currentY = (doc as any).lastAutoTable.finalY + 5;
        const pageHeight = doc.internal.pageSize.height;
        
        if (currentY > pageHeight - 40) {
          doc.addPage();
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('POSITION HOLDERS (1st, 2nd, 3rd)', 14, currentY > pageHeight - 40 ? 15 : currentY);
        
        // Helper function to calculate grade based on percentage
        const calculateGrade = (percentage: number): string => {
          if (percentage >= 90) return 'A+';
          if (percentage >= 80) return 'A';
          if (percentage >= 70) return 'B';
          if (percentage >= 60) return 'C';
          if (percentage >= 50) return 'D';
          return 'F';
        };

        const positionData = positionHolders.map((student, index) => [
          getPositionSuffix(student.position),
          student.student_name,
          student.father_name || 'N/A',
          (student.grade && student.grade !== 'N/A') ? student.grade : calculateGrade(student.percentage),
          `${student.obtained_marks.toFixed(0)} - ${(student.grade && student.grade !== 'N/A') ? student.grade : calculateGrade(student.percentage)}`,
          `${student.percentage.toFixed(1)}%`
        ]);

        autoTable(doc, {
          startY: (currentY > pageHeight - 40 ? 20 : currentY + 3),
          head: [['Position', 'Student Name', 'Father Name', 'Grade', 'Marks', 'Percentage']],
          body: positionData,
          theme: 'grid',
          headStyles: { fillColor: [74, 108, 247], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 14, right: 14 },
          styles: { fontSize: 7, cellPadding: 1 },
          columnStyles: {
            0: { cellWidth: 18, halign: 'center' },
            1: { cellWidth: 35, halign: 'left' },
            2: { cellWidth: 30, halign: 'left' },
            3: { cellWidth: 15, halign: 'center' },
            4: { cellWidth: 25, halign: 'center' },
            5: { cellWidth: 18, halign: 'center' }
          }
        });
      }

      // Calculate summary statistics
      const passCount = masterSheetData.filter(s => s.status === 'pass').length;
      const failCount = masterSheetData.filter(s => s.status === 'fail').length;
      const avgPercentage = masterSheetData.reduce((sum, s) => sum + s.percentage, 0) / masterSheetData.length;
      
      // Calculate grade-wise counts
      const gradeCounts = masterSheetData.reduce((acc, student) => {
        const grade = calculateGrade(student.percentage);
        acc[grade] = (acc[grade] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });
      
      // Add footer with page numbers
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        
        // Add page number on the right side (moved more to the left)
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width - 50,
          doc.internal.pageSize.height - 10
        );
        
        // Add summary statistics only on the last page
        if (i === pageCount) {
          // Prepare grade-wise counts
          const gradeText = Object.entries(gradeCounts)
            .sort(([a], [b]) => {
              const order = ['A+', 'A', 'B', 'C', 'D', 'F'];
              return order.indexOf(a) - order.indexOf(b);
            })
            .map(([grade, count]) => `${grade}: ${count}`)
            .join(' | ');
          
          // Add summary statistics on the left side of footer (last page only) with larger font and colors
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          
          // Set starting position
          let currentX = 14;
          const yPosition = doc.internal.pageSize.height - 10;
          
          // Passed (Green)
          doc.setTextColor(34, 197, 94); // Green color
          doc.text(`Passed: ${passCount}`, currentX, yPosition);
          currentX += doc.getTextWidth(`Passed: ${passCount} | `);
          
          // Failed (Red)
          doc.setTextColor(239, 68, 68); // Red color
          doc.text(`Failed: ${failCount}`, currentX, yPosition);
          currentX += doc.getTextWidth(`Failed: ${failCount} | `);
          
          // Average (Blue)
          doc.setTextColor(59, 130, 246); // Blue color
          doc.text(`Average: ${avgPercentage.toFixed(1)}%`, currentX, yPosition);
          currentX += doc.getTextWidth(`Average: ${avgPercentage.toFixed(1)}% | `);
          
          // Grades (Default black)
          doc.setTextColor(0, 0, 0); // Black color
          doc.text(`Grades: ${gradeText}`, currentX, yPosition);
        }
      }

      // Format date as dd-mmm-yyyy
      const formatDate = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      };

      // Save the PDF with mobile-friendly approach
      const sectionPart = selectedSection ? `(${selectedSection.name})` : '';
      const fileName = `MasterSheet_${selectedClass?.name}${sectionPart}_${selectedExam?.name}_${new Date().toLocaleDateString('en-GB')}.pdf`;
      
      if (isMobileDevice) {
        // For mobile devices, use Capacitor Filesystem API approach
        try {
          // Generate PDF as base64 string
          const pdfBase64 = doc.output('datauristring').split(',')[1];
          
          // Create unique filename with timestamp to prevent overwriting
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const mobileFileName = `master-sheet-${timestamp}.pdf`;

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
                <p style="margin: 0 0 15px 0; color: #666;">Master Sheet Report</p>
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
                      <title>Master Sheet PDF</title>
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
                          <h2>📄 Master Sheet PDF Generated</h2>
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
        showToast('Master sheet PDF exported successfully', 'success');
      }
    } catch (error) {
      showToast('Failed to export master sheet PDF', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportMasterSheet = async (format: 'excel' | 'csv') => {
    if (!selectedExam || !selectedClass) return;

    try {
      const blob = await examinationService.exportMasterSheet({
        exam_id: selectedExam.id,
        class_id: selectedClass.id,
        section_id: selectedSection?.id || undefined,
        export_options: {
          format,
          include_remarks: true,
          include_analytics: true
        }
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `master_sheet_${selectedExam.name}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast('Master sheet exported successfully', 'success');
    } catch (error) {
      showToast('Failed to export master sheet', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-100 text-green-800';
      case 'fail': return 'bg-red-100 text-red-800';
      case 'absent': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade?.includes('A')) return 'bg-green-100 text-green-800';
    if (grade?.includes('B')) return 'bg-blue-100 text-blue-800';
    if (grade?.includes('C')) return 'bg-yellow-100 text-yellow-800';
    if (grade?.includes('D')) return 'bg-orange-100 text-orange-800';
    if (grade?.includes('F')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  // Helper function to calculate grade based on percentage
  const calculateGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  const handleToTop = () => {
    const el = mainContentRef.current;
    if (el) {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleRemarksChange = (studentId: number, value: string) => {
    setEditingRemarks(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const handleRemarksSave = async (studentId: number) => {
    try {
      const remarks = editingRemarks[studentId];
      if (!remarks) return;

      // Update the master sheet data locally
      setMasterSheetData(prev => prev.map(student => 
        student.student_id === studentId 
          ? { ...student, remarks: remarks }
          : student
      ));

      // Clear the editing state
      setEditingRemarks(prev => {
        const newState = { ...prev };
        delete newState[studentId];
        return newState;
      });

      showToast('Remarks updated successfully', 'success');
    } catch (error) {
      showToast('Failed to save remarks', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '60vh',
        width: '100%',
      }}>
        <div style={{
          width: 48,
          height: 48,
          border: '5px solid #e0e7ff',
          borderTop: '5px solid #6366f1',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <>
      <PageContainer>
        <Header>
          <HeaderTopRow>
            <Title>
              <AssessmentIcon style={{ fontSize: 20 }} />
              Master Sheet Management
            </Title>
            
            {/* Mobile PDF Button - only visible on mobile */}
            <MobilePdfButton
              type="button"
              onClick={handleExportMasterSheetPDF}
              disabled={!selectedExam || !selectedClass || ((selectedClass?.has_sections ?? true) && !selectedSection) || masterSheetData.length === 0 || exportLoading}
              title="Generate Master Sheet PDF"
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
            </MobilePdfButton>
            
            {/* Desktop layout - all fields in one row */}
            <DesktopSegmentedGroup>
              <SegmentedGroup>
                <SegmentedSelect
                  value={selectedExam?.id || ''}
                  onChange={(e) => {
                    const exam = examinations.find(ex => ex.id === Number(e.target.value));
                    setSelectedExam(exam || null);
                  }}
                  first
                >
                  <option value="">Select Examination</option>
                  {examinations.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.name} ({exam.exam_type.replace('_', ' ').toUpperCase()})
                    </option>
                  ))}
                </SegmentedSelect>
                
                <SegmentedSelect
                  value={selectedClass?.id || ''}
                  onChange={(e) => {
                    const classId = Number(e.target.value);
                    const selected = classes.find(c => c.id === classId);
                    setSelectedClass(selected || null);
                    setSelectedSection(null);
                  }}
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
                    }}
                    disabled={!selectedClass}
                    $isSection={true}
                  >
                    <option value="">Select Section</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </SegmentedSelect>
                )}
                
                <SegmentedButton
                  type="button"
                  onClick={handleRefreshSummaries}
                  disabled={!selectedExam || !selectedClass || loading}
                  title="Refresh Examination Summaries"
                >
                  {loading ? (
                    <div style={{ 
                      width: 16, 
                      height: 16, 
                      border: '2px solid #e0e7ff', 
                      borderTop: '2px solid #4a6cf7', 
                      borderRadius: '50%', 
                      animation: 'spin 1s linear infinite' 
                    }} />
                  ) : (
                    <RefreshIcon style={{ fontSize: 16 }} />
                  )}
                  {loading ? 'Refreshing...' : 'Refresh'}
                </SegmentedButton>
                
                <SegmentedButton
                  type="button"
                  onClick={handleExportMasterSheetPDF}
                  disabled={!selectedExam || !selectedClass || ((selectedClass?.has_sections ?? true) && !selectedSection) || masterSheetData.length === 0 || exportLoading}
                  last
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
              </SegmentedGroup>
            </DesktopSegmentedGroup>
          </HeaderTopRow>
          
          <HeaderBottomRow>
            {/* Mobile layout - examination takes half, class+section take the other half */}
            <MobileHeaderLayout>
              <MobileRow>
                <SegmentedGroup>
                  <SegmentedSelect
                    value={selectedExam?.id || ''}
                    onChange={(e) => {
                      const exam = examinations.find(ex => ex.id === Number(e.target.value));
                      setSelectedExam(exam || null);
                    }}
                    style={{ flex: '1', minWidth: 0 }}
                    first
                  >
                    <option value="">Select Examination</option>
                    {examinations.map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.name} ({exam.exam_type.replace('_', ' ').toUpperCase()})
                      </option>
                    ))}
                  </SegmentedSelect>
                  <SegmentedSelect
                    value={selectedClass?.id || ''}
                    onChange={(e) => {
                      const classId = Number(e.target.value);
                      const selected = classes.find(c => c.id === classId);
                      setSelectedClass(selected || null);
                      setSelectedSection(null);
                    }}
                    style={{ flex: '0.5', minWidth: 0 }}
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
                      }}
                      disabled={!selectedClass}
                      $isSection={true}
                      style={{ flex: '0.5', minWidth: 0 }}
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
            </MobileHeaderLayout>
          </HeaderBottomRow>
        </Header>
        
        <MainContent ref={mainContentRef}>


          {/* No Selection Message */}
          {(!selectedExam || !selectedClass || ((selectedClass?.has_sections ?? true) && !selectedSection)) && (
            <NoResults>
              Please select Examination, Class{selectedClass?.has_sections ?? true ? ', and Section' : ''} to view master sheet data
            </NoResults>
          )}

          {/* Master Sheet Results */}
          {selectedExam && selectedClass && ((selectedClass?.has_sections ?? true) ? selectedSection : true) && masterSheetData.length > 0 && (
            <ScrollableTableContainer>
              <Table>
                <thead>
                  <tr>
                    <Th style={{ minWidth: 40, maxWidth: 40 }}>ID</Th>
                    <Th style={{ minWidth: 120, maxWidth: 220 }}>Name</Th>
                    <Th style={{ minWidth: 120, maxWidth: 220 }}>Father</Th>
                    {/* Dynamic subject headers based on subjects with results */}
                    {subjectsWithResults.map((subject) => {
                      const subjectCode = subject.short_name || subject.name?.substring(0, 3).toUpperCase();
                      return (
                        <Th key={subject.id} style={{ minWidth: 50, maxWidth: 50 }}>
                          <div style={{ lineHeight: '1.2' }}>
                            <div>{subjectCode}</div>
                            <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: '500' }}>
                              ({subject.max_marks})
                            </div>
                          </div>
                        </Th>
                      );
                    })}
                    <Th style={{ minWidth: 60, maxWidth: 60 }}>
                      <div style={{ lineHeight: '1.2' }}>
                        <div>Total</div>
                        <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: '500' }}>
                          ({masterSheetData.length > 0 ? 
                            (masterSheetData[0].total_marks || subjectsWithResults.reduce((sum, sub) => sum + (sub.max_marks || 0), 0)) : 0})
                        </div>
                      </div>
                    </Th>
                    <Th style={{ minWidth: 60, maxWidth: 60 }}>Obt</Th>
                    <Th style={{ minWidth: 60, maxWidth: 60 }}>Per</Th>
                    <Th style={{ minWidth: 50, maxWidth: 50 }}>PO</Th>
                    <Th style={{ minWidth: 200, maxWidth: 300 }}>Remarks</Th>
                  </tr>
                </thead>
                <tbody>
                  {masterSheetData.map((student, index) => (
                    <tr key={student.student_id}>
                      <Td className="id-column">
                        {index + 1}
                      </Td>
                      
                      <StudentNameCell>{student.student_name}</StudentNameCell>
                      <FatherNameCell>{student.father_name}</FatherNameCell>
                      
                      {/* Dynamic subject scores based on subjects with results */}
                      {subjectsWithResults.map((subject) => {
                        const subjectCode = subject.short_name || subject.name?.substring(0, 3).toUpperCase();
                        
                        const score = student.subject_scores?.[subjectCode];
                        
                        if (score === undefined || score === null) {
                          return <SubjectCell key={subject.id}>-</SubjectCell>; // No result recorded
                        } else if (score === 'A') {
                          return <AbsentCell key={subject.id}>A</AbsentCell>; // Absent
                        } else {
                          const maxMarks = subject.max_marks || 100;
                          const percentage = maxMarks > 0 ? (Number(score) / maxMarks) * 100 : 0;
                          const passingMarks = selectedExam.passing_marks || 40;
                          // Consider 0 marks as failed (percentage < passingMarks including 0)
                          return percentage < passingMarks ? (
                            <PoorScoreCell key={subject.id}>{score}</PoorScoreCell>
                          ) : (
                            <SubjectCell key={subject.id}>{score}</SubjectCell>
                          );
                        }
                      })}
                      
                      <SubjectCell className="total-column">
                        {student.total_marks.toFixed(0)}
                      </SubjectCell>
                      
                      <SubjectCell>
                        {student.obtained_marks.toFixed(0)} - {(student.grade && student.grade !== 'N/A') ? student.grade : calculateGrade(student.percentage)}
                      </SubjectCell>
                      
                      <PercentageCell $percentage={student.percentage}>
                        {student.percentage.toFixed(1)}%
                      </PercentageCell>
                      
                      <PositionCell $position={student.position}>
                        {getPositionSuffix(student.position)}
                      </PositionCell>
                      
                      <RemarksCell>
                        <RemarksInput
                          type="text"
                          value={editingRemarks[student.student_id] || student.remarks || 'Enter remarks...'}
                          onChange={(e) => handleRemarksChange(student.student_id, e.target.value)}
                          onBlur={() => handleRemarksSave(student.student_id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRemarksSave(student.student_id);
                              e.currentTarget.blur();
                            }
                          }}
                          $status={student.status}
                          placeholder="Enter remarks..."
                        />
                      </RemarksCell>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </ScrollableTableContainer>
          )}

          {masterSheetData.length === 0 && selectedExam && selectedClass && ((selectedClass?.has_sections ?? true) ? selectedSection : true) && (
            <NoResults>No master sheet data available for the selected criteria.</NoResults>
          )}

          {/* Footer with Summary */}
          {masterSheetData.length > 0 && (
            <Footer>
              <SummaryStats>
                <StatItem>
                  <StatValue $type="total">{masterSheetData.length}</StatValue>
                  <StatLabel>Total Students</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue $type="pass">{masterSheetData.filter(ms => ms.status === 'pass').length}</StatValue>
                  <StatLabel>Passed</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue $type="fail">{masterSheetData.filter(ms => ms.status === 'fail').length}</StatValue>
                  <StatLabel>Failed</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue $type="absent">{masterSheetData.filter(ms => ms.status === 'absent').length}</StatValue>
                  <StatLabel>Absent</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue $type="average">
                    {masterSheetData.length > 0 
                      ? (masterSheetData.reduce((sum, ms) => sum + ms.percentage, 0) / masterSheetData.length).toFixed(1)
                      : '0.0'
                    }%
                  </StatValue>
                  <StatLabel>Average</StatLabel>
                </StatItem>
              </SummaryStats>
            </Footer>
          )}

        </MainContent>
      </PageContainer>
      {showToTop && (
        <ToTopButton type="button" onClick={handleToTop} aria-label="Scroll to top">
          <KeyboardArrowUpIcon style={{ fontSize: 32 }} />
        </ToTopButton>
      )}
    </>
  );
};

export default MasterSheetManager;

