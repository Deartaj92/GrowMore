import React, { useState, useEffect, useContext, useMemo, useCallback, memo, useRef } from 'react';
import styled, { keyframes, DefaultTheme, css } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';
import { sortClasses } from '../utils/classUtils';
import { ThemeContext, darkTheme, lightTheme } from '../contexts/ThemeContext';
import { supabase } from '../supabaseClient';
import { testRecordService } from '../services/testRecordService';
import { TestRecord, TestResult } from '../types/testRecords';
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
  KeyboardArrowDown as KeyboardArrowDownIcon,
  PictureAsPdf,
  Print as PrintIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  Quiz as QuizIcon,
  Refresh as RefreshIcon,
  School as SessionIcon,
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

interface Session {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  school_id: number;
}

interface MasterSheetData {
  test_date: string;
  subject_scores: { [subjectName: string]: number | string };
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  average_grade: string;
}

// Styled components matching MasterSheetManager patterns
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
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
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

const Title = styled.h2`
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 1px;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
`;

const HeaderFilters = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 8px;
  box-shadow: 0 1px 4px #0001;
  padding: 6px 8px;
  overflow: visible;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 6px;
  padding: 2px 6px;
  min-width: 120px;
  max-width: 180px;
    width: 100%;
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.BG === '#252525' ? '#C0C0C0' : '#444'};
  font-size: 0.77em;
  font-weight: 400;
  outline: none;
  width: 100%;
  margin-left: 4px;
  height: 32px;
  line-height: 32px;
  flex: 1;
  min-width: 0;
  
  &::placeholder {
    color: ${({ theme }) => theme.BG === '#252525' ? '#C0C0C0' : '#444'};
    opacity: 0.7;
  }
  
  @media (max-width: 700px) {
    font-size: 0.875rem;
    margin-left: 6px;
  }
`;

// Segmented controls matching ExaminationManager
const SEGMENTED_HEIGHT = '32px';

const SegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.BG === '#252525' ? '#222' : '#f3f4f6'};
  border-radius: 11px;
  box-shadow: 1.4px 1.4px 4px #2222;
  overflow: visible;
  @media (max-width: 700px) {
    width: 100%;
    justify-content: center;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    border-radius: 8px;
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

const SegmentedInput = styled.input`
  ${SegmentedBase}
  padding: 0 0.84em;
  min-width: 98px;
  border-right: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
  border-top-left-radius: 11px;
  border-bottom-left-radius: 11px;
  @media (max-width: 700px) {
    width: 100%;
    border-radius: 8px !important;
    border-right: none;
    min-width: 0;
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
    border-radius: 8px !important;
    border-left: none;
    border-right: none;
    min-width: 0;
    background-position: right 1em center;
  }
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
`;

const SearchContainer = styled.div<{ $isMobile?: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#f3f4f6'};
  border: 1.5px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
  border-right: none;
  border-top-left-radius: 11px;
  border-bottom-left-radius: 11px;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  padding: 0 0.84em;
  min-width: 120px;
  max-width: 180px;
  width: 100%;
  overflow: visible;
  height: 32px;
  box-sizing: border-box;
  
  ${({ $isMobile, theme }) => $isMobile && `
    min-width: 0;
    max-width: 100%;
    width: 100%;
    border-right: 1.5px solid ${theme.BG === '#252525' ? '#555' : '#e5e7eb'};
    border-radius: 11px;
    padding: 0 0.75em;
    flex: 1;
  `}
  
  @media (max-width: 700px) {
    min-width: 0;
    max-width: 100%;
    width: 100%;
    border-right: 1.5px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
    border-radius: 11px;
    padding: 0 0.75em;
    flex: 1;
  }
`;

const SuggestionsDropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  max-height: 250px;
  overflow-y: auto;
  overflow-x: hidden;
  width: 300px;
  min-width: 300px;
  min-height: 40px;
  
  /* Custom scrollbar styling - visible */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
    border-radius: 4px;
    margin: 4px 0;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
    border-radius: 4px;
    border: 1px solid ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'};
  }
  
  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'} ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
  
  @media (max-width: 700px) {
    width: 100%;
    min-width: 0;
    left: 0;
    right: 0;
    max-height: 200px;
  }
`;

const SuggestionItem = styled.div<{ $isActive?: boolean }>`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER}40;
  transition: background-color 0.2s ease;
  background: ${({ $isActive, theme }) => $isActive ? `${theme.ACCENT}20` : 'transparent'};
  
  &:hover {
    background: ${({ theme }) => theme.ACCENT}15;
  }
  
  &:active {
    background: ${({ theme }) => theme.ACCENT}25;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const SuggestionAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ theme }) => theme.ACCENT};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.8rem;
  margin-right: 12px;
  flex-shrink: 0;
`;

const SuggestionInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const SuggestionName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  margin-bottom: 2px;
  
  .father-name {
    font-weight: 400;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
  }
`;

const SuggestionDetails = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  line-height: 1.2;
`;

const SessionSelect = styled.select`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  outline: none;
  width: 100%;
  cursor: pointer;
  
  option {
    background: ${({ theme }) => theme.CARD};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

const MainContent = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  padding: 0 0 32px 0;
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
  
  /* Smooth scrollbar styling */
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



// Card Components
const SubjectCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
  
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const SubjectCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const SubjectHeader = styled.div<{ $isClickable?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  cursor: ${({ $isClickable }) => $isClickable ? 'pointer' : 'default'};
  user-select: none;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: ${({ theme, $isClickable }) => $isClickable ? `${theme.BORDER}20` : 'transparent'};
  }
`;

const SubjectHeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
`;

const SubjectName = styled.h3`
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const SubjectHeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  flex-shrink: 0;
`;

const SubjectGrade = styled.div<{ $grade: string }>`
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$grade) {
      case 'A+':
      case 'A':
        return '#10b981';
      case 'B+':
      case 'B':
        return '#f59e0b';
      case 'C+':
      case 'C':
        return '#f97316';
      default:
        return '#ef4444';
    }
  }};
  color: white;
  white-space: nowrap;
`;

const SubjectBadge = styled.div`
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${({ theme }) => theme.ACCENT}15;
  color: ${({ theme }) => theme.ACCENT};
  border: 1px solid ${({ theme }) => theme.ACCENT}30;
  white-space: nowrap;
`;

const CollapseIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  transition: transform 0.2s ease;
  
  &.expanded {
    transform: rotate(180deg);
  }
`;

const TestResultsList = styled.div<{ $isExpanded?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow: hidden;
  transition: max-height 0.3s ease, opacity 0.3s ease;
  max-height: ${({ $isExpanded }) => $isExpanded ? '1000px' : '0'};
  opacity: ${({ $isExpanded }) => $isExpanded ? '1' : '0'};
  margin-bottom: ${({ $isExpanded }) => $isExpanded ? '0' : '0'};
`;

const TestResultItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: ${({ theme }) => theme.BG};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const TestDate = styled.span`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const TestScore = styled.span<{ $score: string }>`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => {
    if (props.$score === '-') return props.theme.TEXT_SECONDARY;
    
    if (props.$score.includes('/')) {
      const [obtained, max] = props.$score.split('/').map(Number);
      const percentage = (obtained / max) * 100;
      
      if (percentage >= 80) return '#10b981'; // green
      if (percentage >= 60) return '#f59e0b'; // yellow
      return '#ef4444'; // red
    }
    
    return props.theme.TEXT_PRIMARY;
  }};
`;

const SubjectSummary = styled.div`
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SummaryText = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const SummaryValue = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const EmptyStateIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
`;

const EmptyStateTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const EmptyStateText = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

// Summary Card Components
const SummaryCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const SummaryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

const SummaryTitle = styled.h3`
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const SummaryStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  
  @media (max-width: 700px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
`;

const SummaryStatItem = styled.div<{ $variant?: 'subjects' | 'tests' | 'marks' | 'percentage' }>`
  text-align: center;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  ${({ $variant, theme }) => {
    const isDark = theme.BG === '#252525';
    switch ($variant) {
      case 'subjects':
        return `
          background: ${isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)'};
          border-color: ${isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'};
        `;
      case 'tests':
        return `
          background: ${isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)'};
          border-color: ${isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)'};
        `;
      case 'marks':
        return `
          background: ${isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)'};
          border-color: ${isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)'};
        `;
      case 'percentage':
        return `
          background: ${isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)'};
          border-color: ${isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)'};
        `;
      default:
        return `
          background: ${theme.FIELD_BG};
          border-color: ${theme.BORDER};
        `;
    }
  }}
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  @media (max-width: 700px) {
    padding: 0.625rem;
  }
`;

const SummaryStatLabel = styled.div<{ $variant?: 'subjects' | 'tests' | 'marks' | 'percentage' }>`
  font-size: 0.8rem;
  color: ${({ theme, $variant }) => {
    const isDark = theme.BG === '#252525';
    switch ($variant) {
      case 'subjects':
        return isDark ? '#93c5fd' : '#3b82f6';
      case 'tests':
        return isDark ? '#6ee7b7' : '#10b981';
      case 'marks':
        return isDark ? '#fcd34d' : '#f59e0b';
      case 'percentage':
        return isDark ? '#c4b5fd' : '#8b5cf6';
      default:
        return theme.TEXT_SECONDARY;
    }
  }};
  margin-bottom: 0.25rem;
  font-weight: 500;
  
  @media (max-width: 700px) {
    font-size: 0.75rem;
  }
`;

const SummaryStatValue = styled.div<{ $variant?: 'subjects' | 'tests' | 'marks' | 'percentage' }>`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme, $variant }) => {
    const isDark = theme.BG === '#252525';
    switch ($variant) {
      case 'subjects':
        return isDark ? '#60a5fa' : '#2563eb';
      case 'tests':
        return isDark ? '#34d399' : '#059669';
      case 'marks':
        return isDark ? '#fbbf24' : '#d97706';
      case 'percentage':
        return isDark ? '#a78bfa' : '#7c3aed';
      default:
        return theme.ACCENT;
    }
  }};
  
  @media (max-width: 700px) {
    font-size: 1rem;
  }
`;

const SubjectSummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
`;

const SubjectSummaryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const SubjectSummaryName = styled.span`
  font-size: 0.9rem;
  font-weight: 500;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const SubjectSummaryMarks = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
`;

// Main Component
const TestRecordMasterSheet: React.FC = (): JSX.Element => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const { setLoading, loading } = useLoading();

  // State management
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<Student[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [searchExactMatch, setSearchExactMatch] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [justSelectedStudent, setJustSelectedStudent] = useState(false);
  const [masterSheetData, setMasterSheetData] = useState<MasterSheetData[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [summaryData, setSummaryData] = useState<{
    totalSubjects: number;
    totalTests: number;
    totalObtainedMarks: number;
    totalMaxMarks: number;
    totalPercentage: number;
    subjectSummaries: Array<{
      subject_id: number;
      subject_name: string;
      obtained_marks: number;
      total_marks: number;
      percentage: number;
      test_count: number;
    }>;
  }>({
    totalSubjects: 0,
    totalTests: 0,
    totalObtainedMarks: 0,
    totalMaxMarks: 0,
    totalPercentage: 0,
    subjectSummaries: []
  });
  
  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const desktopSuggestionsRef = useRef<HTMLDivElement>(null);
  const mobileSuggestionsRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);

  // Helper function to fetch all rows with pagination
  const fetchAllRows = async <T,>(queryFn: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>): Promise<T[]> => {
    let allResults: T[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await queryFn(from, from + pageSize - 1);
      if (error) throw error;

      if (data && data.length > 0) {
        allResults = allResults.concat(data);
        from += pageSize;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    return allResults;
  };

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!user?.school_id || hasInitializedRef.current) return;

      try {
        setLoadingSessions(true);
        
        // Fetch all rows using pagination
        const [studentsData, classesData, sectionsData, sessionsData] = await Promise.all([
          fetchAllRows(async (from, to) => {
            return await supabase
              .from('students')
              .select('id, name, father_name, class_id, section_id, picture_url, school_id')
              .eq('status', 'active')
              .eq('school_id', user.school_id)
              .range(from, to);
          }),
          fetchAllRows(async (from, to) => {
            return await supabase
              .from('classes')
              .select('id, name, school_id')
              .eq('school_id', user.school_id)
              .range(from, to);
          }),
          fetchAllRows(async (from, to) => {
            return await supabase
              .from('sections')
              .select('id, name, class_id, school_id')
              .eq('school_id', user.school_id)
              .range(from, to);
          }),
          fetchAllRows(async (from, to) => {
            return await supabase
              .from('sessions')
              .select('id, name, start_date, end_date, is_active, school_id')
              .eq('school_id', user.school_id)
              .order('start_date', { ascending: false })
              .range(from, to);
          }),
        ]);
        
        setStudents(studentsData);
        setClasses(classesData);
        setSections(sectionsData);
        if (sessionsData.length > 0) {
          setSessions(sessionsData);
          // Set active session as default (silent selection)
          const activeSession = sessionsData.find(s => s.is_active);
          if (activeSession) {
            setSelectedSession(activeSession.id);
          } else if (sessionsData.length > 0) {
            // If no active session, select the most recent one
            const mostRecentSession = sessionsData[0]; // Already sorted by start_date desc
            setSelectedSession(mostRecentSession.id);
          }
          hasInitializedRef.current = true;
        }
      } catch (error) {
        showToast('Failed to load data', 'error');
      } finally {
        setLoadingSessions(false);
      }
    };

    loadInitialData();
  }, [user?.school_id]);

  // Auto-focus search input on page load
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select?.();
      }
    }, 100);
    return () => clearTimeout(t);
  }, []);

  // Handle student selection
  const handleSelectStudent = useCallback((student: Student, event?: React.MouseEvent | React.TouchEvent) => {
    if (!student) return;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setSearch(student.name);
    setShowSuggestions(false);
    setJustSelectedStudent(true);
    setSearchExactMatch(true);
    setSelectedStudent(student);
    // Small delay to ensure selection is processed before blur
    setTimeout(() => {
      searchInputRef.current?.blur();
    }, 100);
  }, []);

  // Search functionality
  useEffect(() => {
    if (justSelectedStudent) {
      setShowSuggestions(false);
      setJustSelectedStudent(false);
      return;
    }

    if (searchExactMatch && selectedStudent && search === selectedStudent.name) {
      setShowSuggestions(false);
      return;
    }

    if (searchExactMatch && (!selectedStudent || search !== selectedStudent.name)) {
      setSearchExactMatch(false);
    }

    if (search.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
     
    const s = search.trim().toLowerCase();
    let filtered = students.filter(
      (stu: Student) => stu.name.toLowerCase().includes(s) || String(stu.id).includes(s)
    );
    // If searching by digits, sort by id ascending; otherwise keep name order
    if (/^\d+$/.test(s)) {
      filtered = filtered.sort((a: Student, b: Student) => Number(a.id) - Number(b.id));
    }
    filtered = filtered.slice(0, 8);
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setActiveSuggestion(0);
  }, [search, students, justSelectedStudent, selectedStudent, searchExactMatch]);

  // Helper functions
  const getClassName = (classId: number) => classes.find((c: Class) => String(c.id) === String(classId))?.name || '-';
  const getSectionName = (sectionId: number) => sections.find((s: Section) => String(s.id) === String(sectionId))?.name || '';

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;
    
    // Helper function to scroll active element into view
    const scrollActiveIntoView = (newIndex: number) => {
      requestAnimationFrame(() => {
        // Try to find the visible dropdown (desktop or mobile)
        const isMobile = window.innerWidth <= 700;
        const dropdownRef = isMobile ? mobileSuggestionsRef : desktopSuggestionsRef;
        const dropdown = dropdownRef.current;
        
        if (!dropdown) return;
        
        const activeElement = dropdown.querySelector(`[data-suggestion-index="${newIndex}"]`) as HTMLElement;
        if (!activeElement) return;
        
        const elementTop = activeElement.offsetTop;
        const elementBottom = elementTop + activeElement.offsetHeight;
        const dropdownTop = dropdown.scrollTop;
        const dropdownBottom = dropdownTop + dropdown.clientHeight;
        
        if (elementTop < dropdownTop) {
          dropdown.scrollTo({ top: elementTop, behavior: 'smooth' });
        } else if (elementBottom > dropdownBottom) {
          dropdown.scrollTo({ top: elementBottom - dropdown.clientHeight, behavior: 'smooth' });
        }
      });
    };
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = Math.min(activeSuggestion + 1, suggestions.length - 1);
      setActiveSuggestion(newIndex);
      scrollActiveIntoView(newIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = Math.max(activeSuggestion - 1, 0);
      setActiveSuggestion(newIndex);
      scrollActiveIntoView(newIndex);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[activeSuggestion]) {
        handleSelectStudent(suggestions[activeSuggestion], e as any);
      }
    }
  };

  const handleSearchFocus = () => {
    if (!searchExactMatch && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    if (searchExactMatch && selectedStudent && newValue !== selectedStudent.name) {
      setSearchExactMatch(false);
    }
  };

  // Click outside to close suggestions (handles both mouse and touch)
  useEffect(() => {
    const handleClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      const isInsideInput = searchInputRef.current?.contains(target);
      const isInsideDesktopSuggestions = desktopSuggestionsRef.current?.contains(target);
      const isInsideMobileSuggestions = mobileSuggestionsRef.current?.contains(target);
      
      if (!isInsideInput && !isInsideDesktopSuggestions && !isInsideMobileSuggestions) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick as EventListener);
    document.addEventListener('touchstart', handleClick as EventListener);
    return () => {
      document.removeEventListener('mousedown', handleClick as EventListener);
      document.removeEventListener('touchstart', handleClick as EventListener);
    };
  }, []);

  // Load master sheet data when student or session is selected
  useEffect(() => {
    if (selectedStudent && selectedSession) {
      loadMasterSheetData();
    } else {
      setMasterSheetData([]);
      setSubjects([]);
    }
  }, [selectedStudent, selectedSession]);

  const loadMasterSheetData = async () => {
    if (!selectedStudent || !user?.school_id || !selectedSession) return;

    try {
      setLoading(true);

      // Get all test results for the selected student and session using pagination
      const testResults = await fetchAllRows(async (from, to) => {
        return await supabase
          .from('test_results')
          .select(`
            id,
            obtained_marks,
            max_marks,
            percentage,
            grade,
            remarks,
            test_records!inner(
              id,
              name,
              test_date,
              subject_id
            )
          `)
          .eq('student_id', selectedStudent.id)
          .eq('session_id', selectedSession)
          .eq('school_id', user.school_id)
          .range(from, to);
      });

      if (!testResults || testResults.length === 0) {
        setMasterSheetData([]);
        setSubjects([]);
        return;
      }

      // Get unique test record IDs
      const testRecordIds = Array.from(new Set(testResults.map(result => (result.test_records as any).id)));

      // Get test records for the selected session using pagination
      // Split into chunks if there are too many IDs (Supabase has a limit on .in() array size)
      const chunkSize = 1000;
      const testRecordChunks: number[][] = [];
      for (let i = 0; i < testRecordIds.length; i += chunkSize) {
        testRecordChunks.push(testRecordIds.slice(i, i + chunkSize));
      }

      let allTestRecords: any[] = [];
      for (const chunk of testRecordChunks) {
        const chunkRecords = await fetchAllRows(async (from, to) => {
          return await supabase
            .from('test_records')
            .select(`
              id,
              name,
              test_date,
              subject_id
            `)
            .in('id', chunk)
            .eq('session_id', selectedSession)
            .eq('school_id', user.school_id)
            .range(from, to);
        });
        allTestRecords = allTestRecords.concat(chunkRecords);
      }

      const testRecords = allTestRecords;

      // Get subject information separately using pagination
      const uniqueSubjectIds = new Set(testRecords?.map(record => record.subject_id) || []);
      const subjectIds = Array.from(uniqueSubjectIds);
      
      // Split subject IDs into chunks if needed
      const subjectChunks: number[][] = [];
      for (let i = 0; i < subjectIds.length; i += chunkSize) {
        subjectChunks.push(subjectIds.slice(i, i + chunkSize));
      }

      let allSubjectsData: any[] = [];
      for (const chunk of subjectChunks) {
        const chunkSubjects = await fetchAllRows(async (from, to) => {
          return await supabase
            .from('subjects')
            .select('id, name')
            .in('id', chunk)
            .eq('school_id', user.school_id)
            .range(from, to);
        });
        allSubjectsData = allSubjectsData.concat(chunkSubjects);
      }

      const subjectsData = allSubjectsData;

      // Create a map of subjects by ID
      const subjectsMap = new Map();
      subjectsData?.forEach(subject => {
        subjectsMap.set(subject.id, subject);
      });

      // Create a map of test results by test record ID
      const resultsMap = new Map();
      testResults.forEach(result => {
        const testRecordId = (result.test_records as any).id;
        resultsMap.set(testRecordId, result);
      });

      // Group by subject and date
      const subjectMap = new Map<string, Map<string, any>>();
      const dateSet = new Set<string>();

      testRecords?.forEach(record => {
        const testDate = record.test_date;
        const subject = subjectsMap.get(record.subject_id);
        const subjectName = subject?.name;
        const result = resultsMap.get(record.id);

        if (!subjectName) return; // Skip if subject not found

        if (!subjectMap.has(subjectName)) {
          subjectMap.set(subjectName, new Map());
        }

        subjectMap.get(subjectName)!.set(testDate, result);
        dateSet.add(testDate);
      });

      // Convert to master sheet data
      const masterData: MasterSheetData[] = [];
      const sortedDates = Array.from(dateSet).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

      subjectMap.forEach((dateMap, subjectName) => {
        const subjectScores: { [subjectName: string]: number | string } = {};
        let totalObtained = 0;
        let totalMax = 0;

        sortedDates.forEach(testDate => {
          const result = dateMap.get(testDate);
          if (result) {
            subjectScores[testDate] = `${result.obtained_marks}/${result.max_marks}`;
            totalObtained += result.obtained_marks;
            totalMax += result.max_marks;
          } else {
            subjectScores[testDate] = '-';
          }
        });

        const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
        const averageGrade = calculateGrade(percentage);

        masterData.push({
          test_date: subjectName, // Using subject name as the identifier
          subject_scores: subjectScores,
          total_marks: totalMax,
          obtained_marks: totalObtained,
          percentage: percentage,
          average_grade: averageGrade
        });
      });

      // Sort by subject name
      masterData.sort((a, b) => a.test_date.localeCompare(b.test_date));

      // Calculate summary data
      const subjectSummaries: Array<{
        subject_id: number;
        subject_name: string;
        obtained_marks: number;
        total_marks: number;
        percentage: number;
        test_count: number;
      }> = [];

      let totalSubjects = 0;
      let totalTests = 0;
      let totalObtainedMarks = 0;
      let totalMaxMarks = 0;

      subjectMap.forEach((dateMap, subjectName) => {
        const subject = Array.from(subjectsMap.values()).find(s => s.name === subjectName);
        if (subject) {
          let subjectObtainedMarks = 0;
          let subjectTotalMarks = 0;
          let subjectTestCount = 0;

          dateMap.forEach((result) => {
            if (result) {
              subjectObtainedMarks += result.obtained_marks;
              subjectTotalMarks += result.max_marks;
              subjectTestCount++;
            }
          });

          const subjectPercentage = subjectTotalMarks > 0 ? (subjectObtainedMarks / subjectTotalMarks) * 100 : 0;

          subjectSummaries.push({
            subject_id: subject.id,
            subject_name: subjectName,
            obtained_marks: subjectObtainedMarks,
            total_marks: subjectTotalMarks,
            percentage: subjectPercentage,
            test_count: subjectTestCount
          });

          totalSubjects++;
          totalTests += subjectTestCount;
          totalObtainedMarks += subjectObtainedMarks;
          totalMaxMarks += subjectTotalMarks;
        }
      });

      const totalPercentage = totalMaxMarks > 0 ? (totalObtainedMarks / totalMaxMarks) * 100 : 0;

      setSummaryData({
        totalSubjects,
        totalTests,
        totalObtainedMarks,
        totalMaxMarks,
        totalPercentage,
        subjectSummaries
      });

      setMasterSheetData(masterData);
      setSubjects(sortedDates);

    } catch (error) {
      showToast('Failed to load master sheet data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    if (percentage >= 33) return 'D';
    return 'F';
  };

  return (
    <PageContainer>
      <Header>
        <HeaderRow>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <Title>
              Test Record Master Sheet
        </Title>
          </div>
          <HeaderFilters style={{ display: window.innerWidth > 700 ? 'flex' : 'none' }}>
            <SegmentedGroup>
              <SearchContainer style={{ minWidth: 220, maxWidth: 320, width: '100%' }}>
                <SearchIcon style={{ color: theme === 'dark' ? '#C0C0C0' : '#444', fontSize: '16px' }} />
          <SearchInput
            ref={searchInputRef}
                  type="text"
                  placeholder="Search students..."
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (search.trim().length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
          />
          {selectedStudent && (
            <button
                    onClick={() => {
                      setSelectedStudent(null);
                      setSearch('');
                      setMasterSheetData([]);
                      setSubjects([]);
                    }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                      padding: '2px',
                      borderRadius: '4px',
                      color: '#6b7280',
                      transition: 'all 0.2s ease',
                      marginLeft: '4px'
                    }}
                    title="Clear selection"
                  >
                    <CloseIcon style={{ fontSize: '16px' }} />
                  </button>
                )}
                {showSuggestions && suggestions.length > 0 && (
                  <SuggestionsDropdown ref={desktopSuggestionsRef}>
                    {suggestions.map((student: Student, index: number) => (
                      <SuggestionItem
                        key={student.id}
                        data-suggestion-index={index}
                        onClick={(e) => {
                          handleSelectStudent(student, e);
                        }}
                        onMouseDown={(e) => {
                          // Prevent input blur on desktop
                          e.preventDefault();
                          handleSelectStudent(student, e);
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                        }}
                        onTouchEnd={(e) => {
                          handleSelectStudent(student, e);
                        }}
                        $isActive={activeSuggestion === index}
                      >
                        <SuggestionAvatar>
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
                              display: student.picture_url ? 'none' : 'flex',
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
                            {student.name.charAt(0)}
                          </div>
                        </SuggestionAvatar>
                        <SuggestionInfo>
                          <SuggestionName>
                            {student.name} • <span className="father-name">{student.father_name}</span>
                          </SuggestionName>
                          <SuggestionDetails>
                            Class: {getClassName(student.class_id)} {getSectionName(student.section_id)} | ID: {student.id}
                          </SuggestionDetails>
                        </SuggestionInfo>
                      </SuggestionItem>
                    ))}
                  </SuggestionsDropdown>
                )}
              </SearchContainer>
              <SegmentedSelect
                value={selectedSession || ''}
                onChange={(e) => setSelectedSession(e.target.value ? parseInt(e.target.value) : null)}
                style={{ minWidth: 200, maxWidth: 280 }}
                last
                disabled={loadingSessions}
              >
                <option value="">
                  {loadingSessions ? 'Loading sessions...' : 'Select Session'}
                </option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name} {session.is_active ? '(Active)' : ''} - {new Date(session.start_date).getFullYear()}
                  </option>
                ))}
              </SegmentedSelect>
            </SegmentedGroup>
          </HeaderFilters>
        </HeaderRow>
        {/* Mobile Search Bar */}
        <div style={{ display: window.innerWidth <= 700 ? 'flex' : 'none', marginTop: '8px', width: '100%', gap: '8px' }}>
          <SearchContainer $isMobile={true} style={{ width: '100%', maxWidth: 'none', flex: 1 }}>
            <SearchIcon style={{ color: theme === 'dark' ? '#C0C0C0' : '#444', fontSize: '16px' }} />
            <SearchInput
              ref={searchInputRef}
              placeholder="Search students..."
              value={search}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (search.trim().length > 0) {
                  setShowSuggestions(true);
                }
              }}
            />
            {selectedStudent && (
              <button
                onClick={() => {
                  setSelectedStudent(null);
                  setSearch('');
                  setMasterSheetData([]);
                  setSubjects([]);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  borderRadius: '4px',
                  color: '#6b7280',
                  transition: 'all 0.2s ease',
                  marginLeft: '4px'
                }}
                title="Clear selection"
              >
                <CloseIcon style={{ fontSize: '16px' }} />
            </button>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <SuggestionsDropdown ref={mobileSuggestionsRef}>
              {suggestions.map((student: Student, index: number) => (
                <SuggestionItem
                  key={student.id}
                  data-suggestion-index={index}
                  onClick={(e) => {
                    handleSelectStudent(student, e);
                  }}
                  onMouseDown={(e) => {
                    // Prevent input blur on desktop
                    e.preventDefault();
                    handleSelectStudent(student, e);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    handleSelectStudent(student, e);
                  }}
                  $isActive={activeSuggestion === index}
                >
                  <SuggestionAvatar>
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
                        display: student.picture_url ? 'none' : 'flex',
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
                      {student.name.charAt(0)}
                    </div>
                  </SuggestionAvatar>
                  <SuggestionInfo>
                    <SuggestionName>
                      {student.name} • <span className="father-name">{student.father_name}</span>
                    </SuggestionName>
                    <SuggestionDetails>
                      Class: {getClassName(student.class_id)} {getSectionName(student.section_id)} | ID: {student.id}
                    </SuggestionDetails>
                  </SuggestionInfo>
                </SuggestionItem>
              ))}
            </SuggestionsDropdown>
          )}
        </SearchContainer>
        </div>
      </Header>

      <MainContent>
        {loadingSessions ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: '#6b7280',
            fontSize: '1rem'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: `3px solid #e0e0e0`,
              borderTop: `3px solid #4a6cf7`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem auto'
            }}></div>
            <div style={{ marginBottom: '0.5rem', fontWeight: '600' }}>
              Loading Sessions
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Please wait while we fetch available sessions...
            </div>
          </div>
        ) : !selectedSession ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: '#6b7280',
            fontSize: '1rem'
          }}>
            <SessionIcon style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
            <div style={{ marginBottom: '0.5rem', fontWeight: '600' }}>
              Select a Session
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Please select a session from the dropdown above to view test records
            </div>
            {!loadingSessions && sessions.length === 0 && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem', 
                background: '#fef3c7', 
                border: '1px solid #f59e0b', 
                borderRadius: '8px',
                color: '#92400e',
                fontSize: '0.9rem'
              }}>
                <strong>No sessions found!</strong> Please contact your administrator to set up academic sessions.
              </div>
            )}
          </div>
        ) : !selectedStudent ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: '#6b7280',
            fontSize: '1rem'
          }}>
            <SearchIcon style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
            <div style={{ marginBottom: '0.5rem', fontWeight: '600' }}>
              Search for a student
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Use the search field above to find and select a student to view their test records
            </div>
          </div>
        ) : selectedStudent ? (
          loading ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '2rem',
              color: '#6b7280',
              fontSize: '0.9rem'
            }}>
              <RefreshIcon style={{ 
                marginRight: '8px', 
                animation: 'spin 1s linear infinite',
                fontSize: '18px'
              }} />
              Loading existing test records...
            </div>
          ) : masterSheetData.length > 0 ? (
          <>
            {/* Summary Card */}
            <SummaryCard>
              <SummaryHeader>
                <SummaryTitle>Test Summary</SummaryTitle>
              </SummaryHeader>
              
              <SummaryStats>
                <SummaryStatItem $variant="subjects">
                  <SummaryStatLabel $variant="subjects">Total Subjects</SummaryStatLabel>
                  <SummaryStatValue $variant="subjects">{summaryData.totalSubjects}</SummaryStatValue>
                </SummaryStatItem>
                <SummaryStatItem $variant="tests">
                  <SummaryStatLabel $variant="tests">Total Tests</SummaryStatLabel>
                  <SummaryStatValue $variant="tests">{summaryData.totalTests}</SummaryStatValue>
                </SummaryStatItem>
                <SummaryStatItem $variant="marks">
                  <SummaryStatLabel $variant="marks">Total Marks</SummaryStatLabel>
                  <SummaryStatValue $variant="marks">{summaryData.totalObtainedMarks}/{summaryData.totalMaxMarks}</SummaryStatValue>
                </SummaryStatItem>
                <SummaryStatItem $variant="percentage">
                  <SummaryStatLabel $variant="percentage">Overall %</SummaryStatLabel>
                  <SummaryStatValue $variant="percentage">{summaryData.totalPercentage.toFixed(1)}%</SummaryStatValue>
                </SummaryStatItem>
              </SummaryStats>

              <SubjectSummaryGrid>
                {summaryData.subjectSummaries.map((subject) => (
                  <SubjectSummaryItem key={subject.subject_id}>
                    <SubjectSummaryName>{subject.subject_name} ({subject.test_count})</SubjectSummaryName>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <SubjectSummaryMarks>{subject.obtained_marks}/{subject.total_marks}</SubjectSummaryMarks>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: '500' }}>
                        {subject.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </SubjectSummaryItem>
                ))}
              </SubjectSummaryGrid>
            </SummaryCard>

            <SubjectCardsGrid>
            {masterSheetData.map((subjectData, index) => {
              const isExpanded = expandedCards.has(index);
              const toggleCard = () => {
                setExpandedCards(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(index)) {
                    newSet.delete(index);
                  } else {
                    newSet.add(index);
                  }
                  return newSet;
                });
              };
              
              return (
              <SubjectCard key={index}>
                  <SubjectHeader $isClickable={true} onClick={toggleCard}>
                    <SubjectHeaderLeft>
                  <SubjectName>
                    {subjectData.test_date} ({subjects.filter(date => subjectData.subject_scores[date] !== '-').length})
                  </SubjectName>
                    </SubjectHeaderLeft>
                    <SubjectHeaderRight>
                      <SubjectBadge>
                        {subjectData.obtained_marks}/{subjectData.total_marks}
                      </SubjectBadge>
                      <SubjectBadge>
                        {subjectData.percentage.toFixed(1)}%
                      </SubjectBadge>
                  <SubjectGrade $grade={subjectData.average_grade}>
                    {subjectData.average_grade}
                  </SubjectGrade>
                      <CollapseIcon className={isExpanded ? 'expanded' : ''}>
                        <KeyboardArrowDownIcon style={{ fontSize: '1.2rem' }} />
                      </CollapseIcon>
                    </SubjectHeaderRight>
                </SubjectHeader>
                
                  <TestResultsList $isExpanded={isExpanded}>
                  {subjects
                    .filter(date => subjectData.subject_scores[date] !== '-')
                    .map((date) => (
                      <TestResultItem key={date}>
                        <TestDate>{new Date(date).toLocaleDateString('en-GB')}</TestDate>
                        <TestScore $score={String(subjectData.subject_scores[date])}>
                          {subjectData.subject_scores[date]}
                        </TestScore>
                      </TestResultItem>
                    ))}
                </TestResultsList>
              </SubjectCard>
              );
            })}
          </SubjectCardsGrid>
          </>
          ) : (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: '#6b7280',
            fontSize: '1rem'
          }}>
            <QuizIcon style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
            <div style={{ marginBottom: '0.5rem', fontWeight: '600' }}>
              No test records found for {selectedStudent.name}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Test records will appear here once they are entered for this student
            </div>
          </div>
          )
        ) : null}
      </MainContent>
    </PageContainer>
  );
};

export default TestRecordMasterSheet;
