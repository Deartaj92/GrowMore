import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';
import { sortClasses } from '../utils/classUtils';
import { ThemeContext } from '../contexts/ThemeContext';
import { examinationService } from '../services/examinationService';
import { Examination } from '../types/examinations';
import {
  Assessment as AssessmentIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  BarChart as BarChartIcon,
  Analytics as AnalyticsIcon,
  People as PeopleIcon,
  EmojiEvents as TrophyIcon,
  Grade as GradeIcon,
  Subject as SubjectIcon,
  Class as ClassIcon,
  PictureAsPdf,
  Refresh as RefreshIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Warning as WarningIcon,
  KeyboardArrowUpRounded as ChevronDownIcon,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Loader from './Loader';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  ComposedChart,
  Area,
  AreaChart,
} from 'recharts';

// Subject ordering configuration
const getSubjectOrder = (subjectName: string): number => {
  const name = subjectName.toLowerCase().trim();
  if (name.includes('english') && !name.includes('b')) return 1;
  if (name.includes('english') && name.includes('b')) return 2;
  if (name.includes('urdu') && !name.includes('b')) return 3;
  if (name.includes('urdu') && name.includes('b')) return 4;
  if (name.includes('math') || name.includes('mathematics')) return 5;
  if (name.includes('islam') || name.includes('islamiyat') || name.includes('islamiat')) return 6;
  if (name.includes('pak study') || name.includes('pakistan')) return 7;
  if (name.includes('mutala') || name.includes('quran')) return 8;
  if (name.includes('biology')) return 9;
  if (name.includes('chemistry')) return 10;
  if (name.includes('physics')) return 11;
  if (name.includes('social') || name.includes('study')) return 12;
  if (name.includes('general science')) return 13;
  if (name.includes('general knowledge') || name.includes('gk')) return 14;
  if (name.includes('nazra') || name.includes('nazira')) return 15;
  if (name.includes('hifz') || name.includes('hifazat')) return 16;
  return 999;
};

// Grade calculation helper
const calculateGrade = (percentage: number): string => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
};

// Interfaces
interface Class {
  id: number;
  name: string;
  has_sections?: boolean;
}

interface Section {
  id: number;
  name: string;
  class_id: number;
}

interface Student {
  id: number;
  name: string;
  father_name?: string;
  class_id: number;
  section_id: number | null;
}

interface StudentPerformance {
  student_id: number;
  student_name: string;
  father_name?: string;
  class_name: string;
  section_name: string;
  class_id: number;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  grade: string;
  status: 'pass' | 'fail' | 'absent';
  position: number;
  rank_in_class: number;
}

interface AnalyticsData {
  appearedStudents: number;
  passedStudents: number;
  failedStudents: number;
  averagePercentage: number;
  highestPercentage: number;
  lowestPercentage: number;
  passPercentage: number;
  topPerformers: StudentPerformance[];
  lowestScorer?: StudentPerformance;
  failedStudentsList: StudentPerformance[];
  studentsNeedingAttention: StudentPerformance[];
  subjectPerformance: Array<{
    subject_name: string;
    average_percentage: number;
    pass_percentage: number;
    total_students: number;
  }>;
  classPerformance: Array<{
    class_name: string;
    average_percentage: number;
    pass_percentage: number;
    total_students: number;
  }>;
  gradeDistribution: Array<{
    grade: string;
    count: number;
    percentage: number;
  }>;
}

// Styled Components
const PageContainer = styled.div`
  width: 100%;
  height: 100%;
  padding: clamp(8px, 2vw, 24px);
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  @media (max-width: 900px) {
    padding: clamp(6px, 2vw, 12px);
  }
  @media (max-width: 600px) {
    padding: 8px 10px;
    padding-bottom: 2.5rem;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(0.7rem, 2vw, 1.5rem);
  margin-bottom: clamp(1rem, 3vw, 2.2rem);
  flex-wrap: wrap;
  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.7rem;
  }
`;

const Title = styled.h1`
  font-size: clamp(1.1rem, 2.5vw, 1.5rem);
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  @media (max-width: 600px) {
    font-size: 1.1rem;
  }
`;

const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: clamp(0.5rem, 1.5vw, 1rem);
  @media (max-width: 600px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const Select = styled.select`
  padding: 0.5rem 1rem;
  font-size: 1.05rem;
  border-radius: 8px;
  border: 1.5px solid ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? 'rgba(99,102,241,0.13)' : 'rgba(99,102,241,0.13)'};
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#232a3b' : '#fff'};
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#fff' : '#232a3b'};
  min-height: 2.3em;
  height: 2.3em;
  min-width: 200px;
  box-sizing: border-box;
  transition: border 0.2s, box-shadow 0.2s;
  cursor: pointer;
  outline: none;
  &:focus {
    border-color: #a78bfa;
    box-shadow: 0 0 0 2px #a78bfa33;
  }
  @media (max-width: 600px) {
    flex: 1;
    min-width: 0;
    font-size: 0.95rem;
  }
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.3em;
  height: 2.3em;
  border-radius: 8px;
  border: 1.5px solid ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? 'rgba(99,102,241,0.13)' : 'rgba(99,102,241,0.13)'};
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#232a3b' : '#fff'};
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#fff' : '#232a3b'};
  cursor: pointer;
  transition: all 0.2s;
  box-sizing: border-box;

  &:hover {
    border-color: #a78bfa;
    box-shadow: 0 0 0 2px #a78bfa33;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ExportButton = styled.button`
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? 'rgba(99,102,241,0.13)' : 'rgba(99,102,241,0.13)'};
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#6366f1' : '#6366f1'};
  border: 1.5px solid ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.2)'};
  border-radius: 8px;
  padding: 0.5rem 1.1rem;
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  min-width: 80px;
  max-width: 120px;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.5em;
  height: 2.3em;
  box-sizing: border-box;
  @media (max-width: 600px) {
    font-size: 0.85rem;
    padding: 0.4rem 0.8rem;
    min-width: 70px;
  }
  &:hover { 
    background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.22)'}; 
  }
`;

const MainContent = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: clamp(0.7rem, 2vw, 1.5rem);
  margin-top: clamp(0.5rem, 2vw, 1rem);
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: clamp(0.7rem, 2vw, 1.5rem);
  margin-bottom: clamp(1rem, 3vw, 2.2rem);
  width: 100%;
  @media (max-width: 600px) {
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
    margin-bottom: 1rem;
  }
  @media (max-width: 400px) {
    grid-template-columns: 1fr;
    gap: 0.6rem;
  }
`;

const StatCard = styled.div<{ $highlight?: boolean }>`
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
  
  @media (max-width: 600px) {
    padding: 0.7rem 0.8rem 0.6rem 0.8rem;
    border-radius: 12px;
    font-size: 0.9rem;
  }
`;

const StatLabel = styled.div`
  font-size: 0.98rem;
  font-weight: 700;
  margin-bottom: 0.2rem;
  color: #a0a7b8;
  
  @media (max-width: 600px) {
    font-size: 0.85rem;
    margin-bottom: 0.15rem;
  }
`;

const StatValue = styled.div<{ $color?: string; $size?: 'large' | 'medium' | 'small' }>`
  font-size: ${({ $size }) => {
    if ($size === 'large') return '2rem';
    if ($size === 'small') return '1.2rem';
    return '1.5rem';
  }};
  font-weight: 800;
  color: ${({ $color }) => $color || '#fff'};
  margin-bottom: 0.1rem;
  
  @media (max-width: 600px) {
    font-size: ${({ $size }) => {
      if ($size === 'large') return '1.5rem';
      if ($size === 'small') return '1rem';
      return '1.2rem';
    }};
  }
`;

const StatSubtext = styled.div`
  font-size: 0.85rem;
  color: #a0a7b8;
  margin-top: 0.2rem;
  opacity: 0.8;
  
  @media (max-width: 600px) {
    font-size: 0.75rem;
    margin-top: 0.15rem;
  }
`;

// Collapsible Section Components (matching Dashboard.tsx)
const SectionWrapper = styled.div`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : theme.CARD)};
  border-radius: 14px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.10);
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 0;
  margin-bottom: clamp(1rem, 2vw, 1.5rem);
  position: relative;
  width: 100%;
  overflow: hidden;
  
  @media (max-width: 600px) {
    border-radius: 12px;
    margin-bottom: 0.8rem;
  }
`;

const SectionHeader = styled.div`
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

const SectionHeaderTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
`;

const SectionTitle = styled.div`
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

const ExpandIcon = styled(ChevronDownIcon)<{ $isExpanded: boolean }>`
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

const CollapsibleContent = styled.div<{ $isExpanded: boolean }>`
  max-height: ${props => props.$isExpanded ? '5000px' : '0'};
  opacity: ${props => props.$isExpanded ? '1' : '0'};
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: ${props => props.$isExpanded ? '1rem 1.2rem' : '0 1.2rem'};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(35,42,59,0.10)' : 'transparent'};
  
  @media (max-width: 600px) {
    padding: ${props => props.$isExpanded ? '0.8rem 0.9rem' : '0 0.9rem'};
  }
`;

const Section = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 10px;
  padding: 14px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const CompactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: clamp(0.7rem, 2vw, 1.5rem);
  margin-bottom: clamp(1rem, 3vw, 2.2rem);
  width: 100%;
  @media (max-width: 600px) {
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
    margin-bottom: 1rem;
  }
  @media (max-width: 400px) {
    grid-template-columns: 1fr;
    gap: 0.6rem;
  }
`;

const TableWrapper = styled.div`
  max-height: 440px; /* 10 rows + header = 11 * 40px */
  overflow-y: auto;
  overflow-x: auto;
  border-radius: 6px;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.BG === '#252525' ? '#6366f1 #1e293b' : '#6366f1 #f1f5f9'};
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
  
  @media (max-width: 600px) {
    max-height: 400px;
    margin-left: -10px;
    margin-right: -10px;
    padding-left: 8px;
    padding-right: 8px;
    border-radius: 0;
  }
  
  &::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525' ? '#1e293b' : '#f1f5f9'};
    border-radius: 4px;
    border: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#d1d5db'};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? '#6366f1' : '#6366f1'};
    border-radius: 4px;
    border: 2px solid ${({ theme }) => theme.BG === '#252525' ? '#1e293b' : '#f1f5f9'};
    min-height: 30px;
    
    &:hover {
      background: ${({ theme }) => theme.BG === '#252525' ? '#818cf8' : '#818cf8'};
    }
    
    &:active {
      background: ${({ theme }) => theme.BG === '#252525' ? '#4f46e5' : '#4f46e5'};
    }
  }
  
  &::-webkit-scrollbar-corner {
    background: ${({ theme }) => theme.BG === '#252525' ? '#1e293b' : '#f1f5f9'};
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
  min-width: 600px; /* Ensure table doesn't get too cramped on mobile */
  
  @media (max-width: 600px) {
    font-size: 0.7rem;
    min-width: 500px;
  }
`;

const Th = styled.th`
  padding: 10px 8px;
  text-align: left;
  font-weight: 600;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#1e293b' : '#f8fafc'};
  white-space: nowrap;
  
  @media (max-width: 600px) {
    padding: 8px 6px;
    font-size: 0.65rem;
    letter-spacing: 0.3px;
  }
`;

const Td = styled.td`
  padding: 10px 8px;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 600px) {
    padding: 8px 6px;
    font-size: 0.7rem;
  }
`;

const Badge = styled.span<{ $variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  background: ${({ $variant, theme }) => {
    if ($variant === 'success') return theme.BG === '#252525' ? '#065f46' : '#d1fae5';
    if ($variant === 'warning') return theme.BG === '#252525' ? '#78350f' : '#fef3c7';
    if ($variant === 'danger') return theme.BG === '#252525' ? '#7f1d1d' : '#fee2e2';
    if ($variant === 'info') return theme.BG === '#252525' ? '#1e3a8a' : '#dbeafe';
    return theme.BG === '#252525' ? '#374151' : '#f3f4f6';
  }};
  color: ${({ $variant, theme }) => {
    if ($variant === 'success') return theme.BG === '#252525' ? '#6ee7b7' : '#065f46';
    if ($variant === 'warning') return theme.BG === '#252525' ? '#fbbf24' : '#78350f';
    if ($variant === 'danger') return theme.BG === '#252525' ? '#f87171' : '#991b1b';
    if ($variant === 'info') return theme.BG === '#252525' ? '#93c5fd' : '#1e40af';
    return theme.TEXT_SECONDARY;
  }};
  
  @media (max-width: 600px) {
    padding: 3px 8px;
    font-size: 0.65rem;
    border-radius: 10px;
  }
`;

const MiniCard = styled.div`
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
  
  @media (max-width: 600px) {
    padding: 0.7rem 0.8rem 0.6rem 0.8rem;
    border-radius: 12px;
    font-size: 0.9rem;
  }
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  width: 100%;
  gap: 0.5rem;
  &:last-child {
    margin-bottom: 0;
  }
  
  @media (max-width: 600px) {
    margin-bottom: 0.4rem;
    flex-wrap: wrap;
  }
`;

const InfoLabel = styled.span`
  font-size: 0.98rem;
  color: #a0a7b8;
  font-weight: 700;
  
  @media (max-width: 600px) {
    font-size: 0.85rem;
  }
`;

const InfoValue = styled.span<{ $color?: string }>`
  font-size: 1rem;
  font-weight: 800;
  color: ${({ $color }) => $color || '#fff'};
  
  @media (max-width: 600px) {
    font-size: 0.9rem;
  }
`;

const ProgressBar = styled.div<{ $percentage: number; $color?: string }>`
  width: 100%;
  height: 6px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#334155' : '#e2e8f0'};
  border-radius: 3px;
  overflow: hidden;
  margin-top: 6px;

  &::after {
    content: '';
    display: block;
    width: ${({ $percentage }) => Math.min($percentage, 100)}%;
    height: 100%;
    background: ${({ $color, theme }) => $color || theme.ACCENT};
    transition: width 0.3s ease;
    border-radius: 3px;
  }
  
  @media (max-width: 600px) {
    height: 5px;
    margin-top: 5px;
  }
`;

const CompactProgressBar = styled.div<{ $percentage: number; $color?: string }>`
  width: 60px;
  height: 4px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#334155' : '#e2e8f0'};
  border-radius: 2px;
  overflow: hidden;
  display: inline-block;
  margin-left: 8px;
  vertical-align: middle;

  &::after {
    content: '';
    display: block;
    width: ${({ $percentage }) => Math.min($percentage, 100)}%;
    height: 100%;
    background: ${({ $color, theme }) => $color || theme.ACCENT};
    transition: width 0.3s ease;
    border-radius: 2px;
  }
`;

const Divider = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
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
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #4f46e5;
    transform: scale(1.1);
  }
  
  @media (max-width: 600px) {
    right: 12px;
    bottom: 16px;
    width: 44px;
    height: 44px;
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.3);
  }
`;

// Dashboard-specific styled components
const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 0.75rem;
  width: 100%;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(6, 1fr);
    gap: 0.65rem;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.6rem;
  }
`;

const DashboardCard = styled.div<{ $span?: number; $highlight?: boolean }>`
  grid-column: span ${({ $span }) => $span || 6};
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : theme.CARD)};
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03);
  padding: 0.9rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  
  ${({ $highlight }) => $highlight && `
    border: 2px solid #6366f1;
    background: linear-gradient(135deg, ${({ theme }: any) => theme.BG === '#252525' ? '#2a2a2a' : '#fff'} 0%, ${({ theme }: any) => theme.BG === '#252525' ? '#1e293b' : '#f8fafc'} 100%);
  `}
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
  }
  
  @media (max-width: 1200px) {
    grid-column: span ${({ $span }) => $span && $span > 6 ? 6 : $span || 6};
    padding: 0.8rem;
  }
  
  @media (max-width: 768px) {
    grid-column: span 1;
    padding: 0.7rem;
  }
`;

const PerformanceIndexCard = styled(DashboardCard)`
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #fff;
  border: none;
  padding: 1.2rem;
  min-height: fit-content;
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
    opacity: 0.5;
  }
  
  @media (max-width: 1200px) {
    padding: 1rem;
    
    > div {
      flex-direction: column;
      align-items: flex-start !important;
      gap: 1rem !important;
    }
    
    > div > div:last-child {
      max-width: 100% !important;
      grid-template-columns: repeat(2, 1fr) !important;
    }
  }
  
  @media (max-width: 768px) {
    padding: 1.1rem;
    border-radius: 12px;
    
    > div {
      flex-direction: column !important;
      align-items: center !important;
      gap: 1.25rem !important;
      text-align: center;
    }
    
    > div > div:first-child {
      width: 100%;
      flex-direction: column !important;
      align-items: center !important;
      gap: 0.75rem !important;
      text-align: center;
    }
    
    > div > div:first-child > div:last-child {
      text-align: center;
    }
  }
  
  @media (max-width: 480px) {
    padding: 0.95rem;
    
    > div {
      gap: 1rem !important;
    }
    
    > div > div:first-child {
      gap: 0.6rem !important;
    }
  }
`;

const PerformanceValue = styled.div`
  font-size: 3.5rem;
  font-weight: 900;
  color: #fff;
  margin: 0.5rem 0;
  line-height: 1;
  
  @media (max-width: 768px) {
    font-size: 2.2rem;
  }
  
  @media (max-width: 480px) {
    font-size: 2rem;
  }
`;

const PerformanceLabel = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 0.5rem;
  
  @media (max-width: 768px) {
    font-size: 0.75rem;
    letter-spacing: 0.8px;
  }
  
  @media (max-width: 480px) {
    font-size: 0.7rem;
    letter-spacing: 0.6px;
  }
`;

const TrendIndicator = styled.div<{ $positive?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: ${({ $positive }) => $positive ? '#6ee7b7' : '#fca5a5'};
  margin-top: 0.5rem;
  font-weight: 600;
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
`;

const MetricItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const MetricLabel = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  @media (max-width: 768px) {
    font-size: 0.7rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.65rem;
    letter-spacing: 0.3px;
  }
`;

const MetricValue = styled.div`
  font-size: 1.3rem;
  font-weight: 700;
  color: #fff;
  
  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.1rem;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  flex: 1;
  max-width: 600px;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    max-width: 100%;
    width: 100%;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 0.85rem;
  }
`;

const ChartCard = styled(DashboardCard)`
  min-height: 350px;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    min-height: 300px;
  }
`;

const ChartTitle = styled.div`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  letter-spacing: 0.2px;
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
    margin-bottom: 0.4rem;
  }
`;

const SubjectMasteryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const MasteryCircle = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const MasteryLabel = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 600;
  text-align: center;
`;

const TopSubjectsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
`;

const TopSubjectsTh = styled.th`
  text-align: left;
  padding: 0.75rem 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TopSubjectsTd = styled.td`
  padding: 0.75rem 0.5rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

const ImprovementBadge = styled.span<{ $positive?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $positive }) => $positive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
  color: ${({ $positive }) => $positive ? '#10b981' : '#ef4444'};
`;

const AreasForImprovement = styled.ul`
  list-style: none;
  padding: 0;
  margin: 1rem 0 0 0;
`;

const ImprovementItem = styled.li`
  padding: 0.75rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  
  &:last-child {
    border-bottom: none;
  }
  
  &::before {
    content: '•';
    color: #6366f1;
    font-weight: bold;
    display: inline-block;
    width: 1em;
    margin-right: 0.5rem;
  }
`;

const ExaminationAnalytics: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { theme } = useContext(ThemeContext);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [selectedExam, setSelectedExam] = useState<Examination | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showToTop, setShowToTop] = useState(false);
  
  // Collapsible section states (matching Dashboard pattern)
  const [isTopPerformersExpanded, setIsTopPerformersExpanded] = useState(true);
  const [isStudentsNeedingAttentionExpanded, setIsStudentsNeedingAttentionExpanded] = useState(true);
  const [isFailedStudentsExpanded, setIsFailedStudentsExpanded] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.school_id) {
      loadExaminations();
    }
  }, [user?.school_id]);

  useEffect(() => {
    if (selectedExam) {
      loadAnalytics();
    }
  }, [selectedExam]);

  useEffect(() => {
    const handleScroll = () => {
      if (mainContentRef.current) {
        setShowToTop(mainContentRef.current.scrollTop > 300);
      }
    };

    const contentElement = mainContentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
      return () => contentElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const loadExaminations = async () => {
    try {
      setLoading(true);
      // Fetch both published and archived examinations
      const [publishedData, archivedData] = await Promise.all([
        examinationService.getExaminations({ status: 'published' }, user?.school_id),
        examinationService.getExaminations({ status: 'archived' }, user?.school_id)
      ]);
      const allExaminations = [...publishedData, ...archivedData];
      const uniqueExaminations = Array.from(
        new Map(allExaminations.map(exam => [exam.id, exam])).values()
      );
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

  const loadAnalytics = async () => {
    if (!selectedExam || !user?.school_id) return;

    try {
      setAnalyticsLoading(true);
      const { analytics: analyticsData, classes: classesData } = await getAnalyticsData(selectedExam.id, user.school_id);
      setAnalytics(analyticsData);
      setClasses(classesData);
    } catch (error) {
      showToast('Failed to load analytics', 'error');
    } finally {
      setAnalyticsLoading(false);
    }
  };

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

  // Helper function to calculate subject performance from data
  const getSubjectPerformanceFromData = (combinedData: StudentPerformance[], allExamResults: any[], passingPercentage: number) => {
    // Get unique subjects from exam results
    const subjectMap = new Map<number, { id: number; name: string }>();
    allExamResults.forEach(result => {
      if (result.subject_id) {
        let subjectName = 'Unknown';
        if (result.subjects) {
          if (typeof result.subjects === 'object' && !Array.isArray(result.subjects)) {
            subjectName = result.subjects.name || 'Unknown';
          } else if (Array.isArray(result.subjects) && result.subjects.length > 0) {
            subjectName = result.subjects[0].name || 'Unknown';
          }
        }
        if (!subjectMap.has(result.subject_id)) {
          subjectMap.set(result.subject_id, { id: result.subject_id, name: subjectName });
        }
      }
    });

    if (subjectMap.size === 0) {
      return [];
    }

    // Group exam results by subject to calculate per-subject marks
    const subjectResultsMap = new Map<number, Map<number, { obtained: number; max: number; remarks?: string }>>();
    
    allExamResults.forEach(result => {
      if (!result.subject_id || !result.student_id) return;
      
      const remarks = result.remarks || '';
      const isAbsent = remarks === 'Absent' || remarks.toLowerCase().includes('absent');
      if (isAbsent) return; // Skip absent students
      
      if (!subjectResultsMap.has(result.subject_id)) {
        subjectResultsMap.set(result.subject_id, new Map());
      }
      
      const studentMap = subjectResultsMap.get(result.subject_id)!;
      if (!studentMap.has(result.student_id)) {
        studentMap.set(result.student_id, { obtained: 0, max: 0 });
      }
      
      const studentData = studentMap.get(result.student_id)!;
      studentData.obtained += result.obtained_marks || 0;
      studentData.max += result.max_marks || 0;
    });

    // Calculate performance for each subject
    const subjectPerformance = Array.from(subjectMap.entries()).map(([subjectId, subjectInfo]) => {
      const studentResults = subjectResultsMap.get(subjectId);
      if (!studentResults || studentResults.size === 0) {
        return {
          subject_name: subjectInfo.name,
          average_percentage: 0,
          pass_percentage: 0,
          total_students: 0
        };
      }

      const studentPercentages: number[] = [];
      let passedCount = 0;
      
      studentResults.forEach((data, studentId) => {
        if (data.max > 0) {
          const percentage = (data.obtained / data.max) * 100;
          studentPercentages.push(percentage);
          if (percentage >= passingPercentage) {
            passedCount++;
          }
        }
      });

      const averagePercentage = studentPercentages.length > 0
        ? studentPercentages.reduce((sum, p) => sum + p, 0) / studentPercentages.length
        : 0;
      
      const passPercentage = studentPercentages.length > 0
        ? (passedCount / studentPercentages.length) * 100
        : 0;

      return {
        subject_name: subjectInfo.name,
        average_percentage: averagePercentage,
        pass_percentage: passPercentage,
        total_students: studentPercentages.length
      };
    });

    return subjectPerformance.sort((a, b) => {
      const orderA = getSubjectOrder(a.subject_name);
      const orderB = getSubjectOrder(b.subject_name);
      return orderA - orderB;
    });
  };

  // Get analytics data - complete implementation
  const getAnalyticsData = async (examId: number, schoolId: number): Promise<{ analytics: AnalyticsData; classes: Array<{ id: number; name: string }> }> => {
    // Get examination details for passing percentage
    const { data: examDetails, error: examDetailsError } = await supabase
      .from('examinations')
      .select('passing_marks')
      .eq('id', examId)
      .eq('school_id', schoolId)
      .single();

    if (examDetailsError) throw examDetailsError;
    const passingPercentage = examDetails?.passing_marks || 33;

    // Step 1: Get all distinct class_ids from exam_results (fetch all rows) filtered by exam_id and school_id
    const allExamResults = await fetchAllRows(async (from, to) => {
      return await supabase
        .from('exam_results')
        .select('class_id, student_id, subject_id, obtained_marks, max_marks, remarks, exam_id, classes!inner(id, name), subjects!inner(name)')
        .eq('exam_id', examId)
        .eq('school_id', schoolId)
        .range(from, to);
    });

    if (allExamResults.length === 0) {
      return { analytics: getEmptyAnalytics(), classes: [] };
    }

    // Extract unique class IDs and create class map
    const classMap = new Map<number, { id: number; name: string }>();
    allExamResults.forEach(result => {
      const classId = result.class_id;
      const classInfo = (result.classes as any);
      if (classId && classInfo && !classMap.has(classId)) {
        classMap.set(classId, {
          id: classId,
          name: classInfo.name || `Class ${classId}`
        });
      }
    });

    const classes = sortClasses(Array.from(classMap.values()));
    const classIds = Array.from(classMap.keys());    // Step 2: Get all students who appeared in this exam (using IDs from results) filtered by school_id
    const studentIds = Array.from(new Set(allExamResults.map(r => r.student_id)));
    
    if (studentIds.length === 0) {
      return { analytics: getEmptyAnalytics(), classes: [] };
    }

    const allStudents = await fetchAllRows(async (from, to) => {
      return await supabase
        .from('students')
        .select('id, name, father_name, class_id, section_id, roll_number')
        .in('id', studentIds)
        .eq('school_id', schoolId)
        .range(from, to);
    });

    // Step 3: Group exam results by class_id and student_id
    const resultsByClassAndStudent: { [classId: number]: { [studentId: number]: any[] } } = {};
    allExamResults.forEach(result => {
      const classId = result.class_id;
      const studentId = result.student_id;
      if (!resultsByClassAndStudent[classId]) {
        resultsByClassAndStudent[classId] = {};
      }
      if (!resultsByClassAndStudent[classId][studentId]) {
        resultsByClassAndStudent[classId][studentId] = [];
      }
      resultsByClassAndStudent[classId][studentId].push(result);
    });

    // Step 4: Process only students who appeared (have exam results and not marked absent)
    const allCombinedData: StudentPerformance[] = [];

    for (const classInfo of classes) {
      const classId = classInfo.id;
      const classResults = resultsByClassAndStudent[classId] || {};
      
      // Get unique student IDs who have exam results for this class
      const studentIdsWithResults = Object.keys(classResults).map(id => Number(id));
      
      if (studentIdsWithResults.length === 0) continue;

      // Get all exam results for this class to determine subjects
      const allClassResults: any[] = [];
      studentIdsWithResults.forEach(studentId => {
        const results = classResults[studentId] || [];
        if (results.length > 0) {
          allClassResults.push(...results);
        }
      });

      // Get unique subjects for this class
      const subjectsData: { [key: number]: { id: number; name: string; max_marks: number } } = {};
      allClassResults.forEach(result => {
        if (!subjectsData[result.subject_id]) {
          subjectsData[result.subject_id] = {
            id: result.subject_id,
            name: (result.subjects as any)?.name || '',
            max_marks: result.max_marks
          };
        }
      });

      const subjectsArray = Object.values(subjectsData).sort((a, b) => {
        const orderA = getSubjectOrder(a.name);
        const orderB = getSubjectOrder(b.name);
        return orderA - orderB;
      });

      const totalExamMarks = subjectsArray.reduce((sum, subject) => sum + (subject.max_marks || 0), 0);

      // Process ONLY students who have exam results (appeared students)
      for (const studentId of studentIdsWithResults) {
        const results = classResults[studentId] || [];
        
        // Skip if no results or marked as absent
        if (results.length === 0) continue;
        if (results.some(r => r.remarks === 'Absent')) continue;
        
        // Get student details
        const student = allStudents.find(s => s.id === studentId);
        if (!student) continue;
        
        const obtainedMarks = results.reduce((sum, r) => sum + (r.obtained_marks || 0), 0);
        const percentage = totalExamMarks > 0 ? (obtainedMarks / totalExamMarks) * 100 : 0;
        
        let status: 'pass' | 'fail' = percentage < passingPercentage ? 'fail' : 'pass';
        const grade = calculateGrade(percentage);

        allCombinedData.push({
          student_id: student.id,
          student_name: student.name,
          father_name: student.father_name,
          class_name: classInfo.name,
          section_name: '',
          class_id: student.class_id,
          total_marks: totalExamMarks,
          obtained_marks: obtainedMarks,
          percentage: percentage,
          grade: grade,
          status: status,
          position: 0,
          rank_in_class: 0
        });
      }
    }

    // Step 5: Calculate analytics (all students in allCombinedData are appeared)
    const appearedStudents = allCombinedData.length;
    const passedStudents = allCombinedData.filter(s => s.status === 'pass').length;
    const failedStudents = allCombinedData.filter(s => s.status === 'fail').length;
    const averagePercentage = appearedStudents > 0
      ? allCombinedData.reduce((sum, s) => sum + s.percentage, 0) / appearedStudents
      : 0;
    const highestPercentage = appearedStudents > 0
      ? Math.max(...allCombinedData.map(s => s.percentage))
      : 0;
    const lowestPercentage = appearedStudents > 0
      ? Math.min(...allCombinedData.map(s => s.percentage))
      : 0;
    const passPercentage = appearedStudents > 0 ? (passedStudents / appearedStudents) * 100 : 0;

    // Calculate positions
    const sortedByPercentage = [...allCombinedData].sort((a, b) => b.percentage - a.percentage);
    let currentPosition = 1;
    for (let i = 0; i < sortedByPercentage.length; i++) {
      const student = sortedByPercentage[i];
      const currentPercentage = student.percentage;
      let samePercentageCount = 1;
      for (let j = i + 1; j < sortedByPercentage.length; j++) {
        if (sortedByPercentage[j].percentage === currentPercentage) {
          samePercentageCount++;
        } else {
          break;
        }
      }
      for (let k = 0; k < samePercentageCount; k++) {
        sortedByPercentage[i + k].position = currentPosition;
        sortedByPercentage[i + k].rank_in_class = currentPosition;
      }
      i += samePercentageCount - 1;
      currentPosition++;
    }

    // Update positions in allCombinedData
    const positionMap = new Map(sortedByPercentage.map(s => [s.student_id, s.position]));
    allCombinedData.forEach(student => {
      student.position = positionMap.get(student.student_id) || 0;
      student.rank_in_class = positionMap.get(student.student_id) || 0;
    });

    // Top performers
    const topPerformers = sortedByPercentage.slice(0, 15).map(student => ({
      ...student,
      student_id: student.student_id,
      student_name: student.student_name,
      father_name: student.father_name,
      class_name: student.class_name,
      section_name: student.section_name,
      percentage: student.percentage,
      obtained_marks: student.obtained_marks,
      total_marks: student.total_marks,
      grade: student.grade,
      position: student.position,
      rank_in_class: student.rank_in_class,
      status: student.status
    }));

    const lowestScorer = sortedByPercentage.length > 0 ? sortedByPercentage[sortedByPercentage.length - 1] : undefined;
    const failedStudentsList = sortedByPercentage
      .filter(student => student.status === 'fail')
      .map(student => ({ ...student }));
    
    // Students needing attention (below 50%) - sorted from lowest to highest percentage
    const studentsNeedingAttention = sortedByPercentage
      .filter(student => student.percentage < 50)
      .reverse() // Reverse to get lowest to highest (since sortedByPercentage is highest to lowest)
      .map(student => ({ ...student }));

    // Subject performance - calculate from allCombinedData
    const subjectPerformance = getSubjectPerformanceFromData(allCombinedData, allExamResults, passingPercentage);

    // Class performance
    const classPerformance = getClassPerformance(allCombinedData, passingPercentage);

    // Grade distribution
    const gradeDistribution = getGradeDistribution(allCombinedData);

    return {
      analytics: {
        appearedStudents,
        passedStudents,
        failedStudents,
        averagePercentage,
        highestPercentage,
        lowestPercentage,
        passPercentage,
        topPerformers,
        lowestScorer,
        failedStudentsList,
        studentsNeedingAttention,
        subjectPerformance,
        classPerformance,
        gradeDistribution
      },
      classes
    };
  };

  const getEmptyAnalytics = (): AnalyticsData => ({
    appearedStudents: 0,
    passedStudents: 0,
    failedStudents: 0,
    averagePercentage: 0,
    highestPercentage: 0,
    lowestPercentage: 0,
    passPercentage: 0,
    topPerformers: [],
    lowestScorer: undefined,
    failedStudentsList: [],
    studentsNeedingAttention: [],
    subjectPerformance: [],
    classPerformance: [],
    gradeDistribution: []
  });

  const getSubjectPerformance = async (examId: number, schoolId: number, passingPercentage: number) => {
    const { data: examResults, error } = await supabase
      .from('exam_results')
      .select(`
        student_id,
        obtained_marks,
        max_marks,
        percentage,
        remarks,
        subject_id,
        subjects!inner(name, short_name)
      `)
      .eq('exam_id', examId)
      .eq('school_id', schoolId);

    if (error) throw error;

    const subjectMap = new Map<string, any[]>();
    examResults?.forEach(result => {
      const subjectName = (result.subjects as any)?.name || 'Unknown';
      if (!subjectMap.has(subjectName)) {
        subjectMap.set(subjectName, []);
      }
      subjectMap.get(subjectName)!.push(result);
    });

    const subjectPerformance = Array.from(subjectMap.entries()).map(([subjectName, results]) => {
      const nonAbsentResults = results.filter(r => r.remarks !== 'Absent' && !r.remarks?.toLowerCase().includes('absent'));
      const averagePercentage = results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length || 0;
      const passPercentage = nonAbsentResults.length > 0
        ? (nonAbsentResults.filter(r => (r.percentage || 0) >= passingPercentage).length / nonAbsentResults.length) * 100
        : 0;

      return {
        subject_name: subjectName,
        average_percentage: averagePercentage,
        pass_percentage: passPercentage,
        total_students: results.length
      };
    });

    return subjectPerformance.sort((a, b) => {
      const orderA = getSubjectOrder(a.subject_name);
      const orderB = getSubjectOrder(b.subject_name);
      return orderA - orderB;
    });
  };

  const getClassPerformance = (combinedData: StudentPerformance[], passingPercentage: number) => {
    const classMap = new Map<string, StudentPerformance[]>();
    combinedData.forEach(student => {
      const className = student.class_name;
      if (!classMap.has(className)) {
        classMap.set(className, []);
      }
      classMap.get(className)!.push(student);
    });

    const classPerformance = Array.from(classMap.entries()).map(([className, students]) => {
      const percentages = students.map(s => s.percentage);
      const averagePercentage = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
      const nonAbsentStudents = students.filter(s => s.status !== 'absent');
      const passPercentage = nonAbsentStudents.length > 0
        ? (nonAbsentStudents.filter(s => s.status === 'pass').length / nonAbsentStudents.length) * 100
        : 0;

      return {
        class_name: className,
        average_percentage: averagePercentage,
        pass_percentage: passPercentage,
        total_students: percentages.length
      };
    });

    return classPerformance.sort((a, b) => {
      const numA = parseInt(a.class_name.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.class_name.match(/\d+/)?.[0] || '0');
      if (numA !== numB) return numA - numB;
      return a.class_name.localeCompare(b.class_name);
    });
  };

  const getGradeDistribution = (students: StudentPerformance[]) => {
    const gradeCounts: { [key: string]: number } = {};
    students.forEach(student => {
      gradeCounts[student.grade] = (gradeCounts[student.grade] || 0) + 1;
    });

    const total = students.length;
    return ['A+', 'A', 'B', 'C', 'D', 'F'].map(grade => ({
      grade,
      count: gradeCounts[grade] || 0,
      percentage: total > 0 ? ((gradeCounts[grade] || 0) / total) * 100 : 0
    }));
  };

  const handleExportPDF = async () => {
    if (!selectedExam || !analytics) {
      showToast('Please select an examination and wait for analytics to load', 'error');
      return;
    }

    setExportLoading(true);
    try {
      // Fetch school information
      let schoolName = 'School';
      if (user?.school_id) {
        try {
          const { data: schoolData } = await supabase
            .from('schools')
            .select('name')
            .eq('id', user.school_id)
            .single();
          if (schoolData?.name) {
            schoolName = schoolData.name;
          }
        } catch (err) {
        }
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const maxWidth = pageWidth - (margin * 2);

      // Helper function to add new page if needed
      const checkPageBreak = (currentY: number, requiredSpace: number = 20) => {
        if (currentY + requiredSpace > pageHeight - margin) {
          doc.addPage();
          // Don't add header on new pages, just return the starting Y position
          return margin + 10;
        }
        return currentY + 10;
      };

      // Helper function to add header only on first page
      const addPageHeader = (yPos: number, isFirstPage: boolean = true) => {
        if (!isFirstPage) {
          return yPos; // Don't add header on subsequent pages
        }
        
        // Header background
        doc.setFillColor(99, 102, 241);
        doc.rect(0, 0, pageWidth, 25, 'F');
        
        // School name
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(schoolName, margin, 12);
        
        // Report title
        doc.setFontSize(12);
        doc.text('Examination Analytics Report', margin, 18);
        
        // Exam name
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Exam: ${selectedExam.name}`, margin, 23);
        
        // Date
        doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth - margin - 50, 23, { align: 'right' });
        
        doc.setTextColor(0, 0, 0);
        return yPos;
      };

      // Helper function to add section title
      const addSectionTitle = (title: string, yPos: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(99, 102, 241);
        doc.text(title, margin, yPos);
        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);
        doc.setTextColor(0, 0, 0);
        return yPos + 8;
      };

      // Helper function to add footer
      const addFooter = () => {
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(128, 128, 128);
          doc.text(
            `Page ${i} of ${pageCount}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
        }
      };

      let yPos = margin + 30;

      // Page 1: Header and Overview
      addPageHeader(yPos, true); // Only show header on first page
      yPos = margin + 30;

      // Overall Statistics Section
      yPos = addSectionTitle('Overall Statistics', yPos);
      
      // Create a professional table for statistics
      const statsData = [
        ['Appeared Students', analytics.appearedStudents.toString()],
        ['Passed Students', analytics.passedStudents.toString()],
        ['Failed Students', analytics.failedStudents.toString()],
        ['Average Percentage', analytics.averagePercentage.toFixed(2) + '%'],
        ['Pass Rate', analytics.passPercentage.toFixed(2) + '%'],
        ['Highest Percentage', analytics.highestPercentage.toFixed(2) + '%'],
        ['Lowest Percentage', analytics.lowestPercentage.toFixed(2) + '%'],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: statsData,
        theme: 'striped',
        headStyles: { 
          fillColor: [99, 102, 241], 
          textColor: 255, 
          fontStyle: 'bold',
          fontSize: 10,
          halign: 'left'
        },
        bodyStyles: { 
          fontSize: 9,
          halign: 'left'
        },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: margin, right: margin },
        styles: { 
          cellPadding: 4,
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        columnStyles: {
          0: { cellWidth: 120, fontStyle: 'bold', textColor: [60, 60, 60] },
          1: { cellWidth: 60, halign: 'right', textColor: [99, 102, 241], fontStyle: 'bold' }
        },
        showHead: 'everyPage' // Ensure table headers repeat on every page
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
      yPos = checkPageBreak(yPos, 30);

      // Class-wise Performance
      if (analytics.classPerformance.length > 0) {
        yPos = addSectionTitle('Class-wise Performance', yPos);
        
        const classData = analytics.classPerformance
          .filter(cp => cp && cp.class_name) // Filter out invalid entries
          .map(cp => [
            cp.class_name || '',
            (cp.average_percentage || 0).toFixed(1) + '%',
            (cp.pass_percentage || 0).toFixed(1) + '%',
            (cp.total_students || 0).toString()
          ])
          .filter(row => row.length === 4); // Ensure all rows have 4 columns

        if (classData.length > 0) {
          autoTable(doc, {
            startY: yPos,
            head: [['Class', 'Average %', 'Pass Rate %', 'Students']],
            body: classData,
            theme: 'striped',
            headStyles: { 
              fillColor: [99, 102, 241], 
              textColor: 255, 
              fontStyle: 'bold',
              fontSize: 9
            },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { left: margin, right: margin },
            styles: { cellPadding: 3 },
            showHead: 'everyPage' // Ensure table headers repeat on every page
          });

          yPos = (doc as any).lastAutoTable.finalY + 10;
          yPos = checkPageBreak(yPos, 30);
        }
      }

      // Subject-wise Performance
      if (analytics.subjectPerformance.length > 0) {
        yPos = addSectionTitle('Subject-wise Performance', yPos);
        
        const subjectData = analytics.subjectPerformance
          .filter(sp => sp && sp.subject_name) // Filter out invalid entries
          .map(sp => [
            sp.subject_name || '',
            (sp.average_percentage || 0).toFixed(1) + '%',
            (sp.pass_percentage || 0).toFixed(1) + '%',
            (sp.total_students || 0).toString()
          ])
          .filter(row => row.length === 4); // Ensure all rows have 4 columns

        if (subjectData.length > 0) {
          autoTable(doc, {
            startY: yPos,
            head: [['Subject', 'Average %', 'Pass Rate %', 'Students']],
            body: subjectData,
            theme: 'striped',
            headStyles: { 
              fillColor: [16, 185, 129], 
              textColor: 255, 
              fontStyle: 'bold',
              fontSize: 9
            },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { left: margin, right: margin },
            styles: { cellPadding: 3 },
            showHead: 'everyPage' // Ensure table headers repeat on every page
          });

          yPos = (doc as any).lastAutoTable.finalY + 10;
          yPos = checkPageBreak(yPos, 30);
        }
      }

      // Grade Distribution
      if (analytics.gradeDistribution.length > 0) {
        yPos = addSectionTitle('Grade Distribution', yPos);
        
        const gradeData = analytics.gradeDistribution
          .filter(gd => gd && gd.grade) // Filter out invalid entries
          .map(gd => [
            gd.grade || '',
            (gd.count || 0).toString(),
            (gd.percentage || 0).toFixed(1) + '%'
          ])
          .filter(row => row.length === 3); // Ensure all rows have 3 columns

        if (gradeData.length > 0) {
          autoTable(doc, {
            startY: yPos,
            head: [['Grade', 'Count', 'Percentage']],
            body: gradeData,
            theme: 'striped',
            headStyles: { 
              fillColor: [139, 92, 246], 
              textColor: 255, 
              fontStyle: 'bold',
              fontSize: 9
            },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { left: margin, right: margin },
            styles: { cellPadding: 3 },
            showHead: 'everyPage' // Ensure table headers repeat on every page
          });

          yPos = (doc as any).lastAutoTable.finalY + 10;
          yPos = checkPageBreak(yPos, 30);
        }
      }

      // Top Performers
      if (analytics.topPerformers.length > 0) {
        yPos = addSectionTitle('Top Performers (Top 15)', yPos);
        
        const topPerformersData = analytics.topPerformers
          .filter(tp => tp && tp.student_name) // Filter out invalid entries
          .map((tp, idx) => [
            (idx + 1).toString(),
            tp.student_name || '',
            tp.class_name || '',
            ((tp.obtained_marks || 0).toFixed(0) + '/' + (tp.total_marks || 0).toFixed(0)),
            (tp.percentage || 0).toFixed(2) + '%',
            tp.grade || ''
          ])
          .filter(row => row.length === 6); // Ensure all rows have 6 columns

        if (topPerformersData.length > 0) {
          autoTable(doc, {
            startY: yPos,
            head: [['Rank', 'Student Name', 'Class', 'Marks', 'Percentage', 'Grade']],
            body: topPerformersData,
            theme: 'striped',
            headStyles: { 
              fillColor: [245, 158, 11], 
              textColor: 255, 
              fontStyle: 'bold',
              fontSize: 9
            },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { left: margin, right: margin },
            styles: { cellPadding: 3 },
            columnStyles: {
              0: { cellWidth: 15 },
              1: { cellWidth: 50 },
              2: { cellWidth: 30 },
              3: { cellWidth: 30 },
              4: { cellWidth: 30 },
              5: { cellWidth: 20 }
            },
            showHead: 'everyPage' // Ensure table headers repeat on every page
          });

          yPos = (doc as any).lastAutoTable.finalY + 10;
          yPos = checkPageBreak(yPos, 30);
        }
      }

      // Students Needing Attention
      if (analytics.studentsNeedingAttention.length > 0) {
        yPos = addSectionTitle('Students Needing Attention (Below 50%)', yPos);
        
        const attentionData = analytics.studentsNeedingAttention
          .filter(sna => sna && sna.student_name) // Filter out invalid entries
          .map(sna => [
            sna.student_name || '',
            sna.class_name || '',
            ((sna.obtained_marks || 0).toFixed(0) + '/' + (sna.total_marks || 0).toFixed(0)),
            (sna.percentage || 0).toFixed(2) + '%',
            sna.grade || ''
          ])
          .filter(row => row.length === 5); // Ensure all rows have 5 columns

        if (attentionData.length > 0) {
          autoTable(doc, {
            startY: yPos,
            head: [['Student Name', 'Class', 'Marks', 'Percentage', 'Grade']],
            body: attentionData,
            theme: 'striped',
            headStyles: { 
              fillColor: [239, 68, 68], 
              textColor: 255, 
              fontStyle: 'bold',
              fontSize: 9
            },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [254, 242, 242] },
            margin: { left: margin, right: margin },
            styles: { cellPadding: 3 },
            columnStyles: {
              0: { cellWidth: 60 },
              1: { cellWidth: 35 },
              2: { cellWidth: 35 },
              3: { cellWidth: 35 },
              4: { cellWidth: 20 }
            },
            showHead: 'everyPage' // Ensure table headers repeat on every page
          });

          yPos = (doc as any).lastAutoTable.finalY + 10;
          yPos = checkPageBreak(yPos, 30);
        }
      }

      // Failed Students
      if (analytics.failedStudentsList.length > 0) {
        yPos = addSectionTitle('Failed Students', yPos);
        
        const failedData = analytics.failedStudentsList
          .filter(fs => fs && fs.student_name) // Filter out invalid entries
          .map(fs => [
            fs.student_name || '',
            fs.class_name || '',
            ((fs.obtained_marks || 0).toFixed(0) + '/' + (fs.total_marks || 0).toFixed(0)),
            (fs.percentage || 0).toFixed(2) + '%',
            fs.grade || ''
          ])
          .filter(row => row.length === 5); // Ensure all rows have 5 columns

        if (failedData.length > 0) {
          autoTable(doc, {
            startY: yPos,
            head: [['Student Name', 'Class', 'Marks', 'Percentage', 'Grade']],
            body: failedData,
            theme: 'striped',
            headStyles: { 
              fillColor: [185, 28, 28], 
              textColor: 255, 
              fontStyle: 'bold',
              fontSize: 9
            },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [254, 242, 242] },
            margin: { left: margin, right: margin },
            styles: { cellPadding: 3 },
            columnStyles: {
              0: { cellWidth: 60 },
              1: { cellWidth: 35 },
              2: { cellWidth: 35 },
              3: { cellWidth: 35 },
              4: { cellWidth: 20 }
            },
            showHead: 'everyPage' // Ensure table headers repeat on every page
          });

          yPos = (doc as any).lastAutoTable.finalY + 10;
        }
      }

      // Add footer to all pages
      addFooter();

      // Save PDF
      const fileName = `Examination_Analytics_${selectedExam.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Handle mobile/desktop differently
      const capacitor = (window as any).Capacitor;
      const isNative = capacitor?.isNativePlatform?.() || false;
      
      if (isNative) {
        try {
          const pdfBlob = doc.output('blob');
          const { Filesystem, Directory } = await import('@capacitor/filesystem');
          const base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(base64);
            };
            reader.readAsDataURL(pdfBlob);
          });
          
          await Filesystem.writeFile({
            path: `Documents/${fileName}`,
            data: base64Data,
            directory: Directory.ExternalStorage as any
          });
          
          showToast('PDF saved to Documents folder', 'success');
        } catch (mobileError) {
          // Fallback to regular download if mobile save fails
          doc.save(fileName);
          showToast('PDF exported successfully', 'success');
        }
      } else {
        doc.save(fileName);
        showToast('PDF exported successfully', 'success');
      }
    } catch (error) {
      showToast('Failed to export PDF', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleToTop = () => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Prepare chart data
  const gradeChartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.gradeDistribution.map(gd => ({
      grade: gd.grade,
      count: gd.count,
      percentage: gd.percentage
    }));
  }, [analytics]);

  const allSubjectsChartData = useMemo(() => {
    if (!analytics || analytics.subjectPerformance.length === 0) return [];
    
    // Function to get base subject name (remove suffixes like " B", " A", " I", " II", etc.)
    const getBaseSubjectName = (name: string): string => {
      // Remove common suffixes: " B", " A", " I", " II", " 1", " 2", etc.
      return name.replace(/\s+[ABI1-9]+$/, '').trim();
    };
    
    // Group subjects by base name
    const subjectMap = new Map<string, {
      baseName: string;
      subjects: Array<{
        name: string;
        average: number;
        passRate: number;
        students: number;
        passed: number;
        failed: number;
      }>;
    }>();
    
    analytics.subjectPerformance.forEach(sp => {
      const baseName = getBaseSubjectName(sp.subject_name);
      const passed = Math.round((sp.pass_percentage / 100) * sp.total_students);
      const failed = sp.total_students - passed;
      
      if (!subjectMap.has(baseName)) {
        subjectMap.set(baseName, {
          baseName,
          subjects: []
        });
      }
      subjectMap.get(baseName)!.subjects.push({
        name: sp.subject_name,
        average: sp.average_percentage,
        passRate: sp.pass_percentage,
        students: sp.total_students,
        passed,
        failed
      });
    });
    
    // Combine similar subjects
    const combinedData = Array.from(subjectMap.values()).map(group => {
      if (group.subjects.length === 1) {
        // Single subject, no need to combine
        const subj = group.subjects[0];
        return {
          subject: group.baseName.length > 15 ? group.baseName.substring(0, 15) + '...' : group.baseName,
          fullName: group.baseName,
          average: subj.average,
          passRate: subj.passRate,
          students: subj.students,
          passed: subj.passed,
          failed: subj.failed
        };
      } else {
        // Multiple similar subjects, combine them
        const totalStudents = group.subjects.reduce((sum, s) => sum + s.students, 0);
        const totalPassed = group.subjects.reduce((sum, s) => sum + s.passed, 0);
        const totalFailed = group.subjects.reduce((sum, s) => sum + s.failed, 0);
        // Weighted average based on student count
        const weightedAverage = group.subjects.reduce((sum, s) => 
          sum + (s.average * s.students), 0) / totalStudents;
        const weightedPassRate = group.subjects.reduce((sum, s) => 
          sum + (s.passRate * s.students), 0) / totalStudents;
        
        return {
          subject: group.baseName.length > 15 ? group.baseName.substring(0, 15) + '...' : group.baseName,
          fullName: group.baseName,
          average: weightedAverage,
          passRate: weightedPassRate,
          students: totalStudents,
          passed: totalPassed,
          failed: totalFailed
        };
      }
    });
    
    return combinedData;
  }, [analytics]);

  const classPerformanceChartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.classPerformance.map(cp => {
      const passed = Math.round((cp.pass_percentage / 100) * cp.total_students);
      const failed = cp.total_students - passed;
      return {
        class: cp.class_name,
        average: cp.average_percentage,
        passRate: cp.pass_percentage,
        students: cp.total_students,
        passed,
        failed
      };
    });
  }, [analytics]);


  const areasForImprovement = useMemo(() => {
    if (!analytics) return [];
    const improvements: string[] = [];
    
    // Find subjects with low pass rates
    const lowPassSubjects = analytics.subjectPerformance
      .filter(sp => sp.pass_percentage < 50)
      .slice(0, 2);
    lowPassSubjects.forEach(sp => {
      improvements.push(`Problem Solving in ${sp.subject_name}`);
    });
    
    // Find classes needing attention
    const lowPerformingClasses = analytics.classPerformance
      .filter(cp => cp.average_percentage < analytics.averagePercentage)
      .slice(0, 1);
    if (lowPerformingClasses.length > 0) {
      improvements.push(`Individualized Learning Plans for ${lowPerformingClasses[0].class_name}`);
    }
    
    // Add general improvements
    if (analytics.studentsNeedingAttention.length > 0) {
      improvements.push('Targeted Tutoring for Struggling Students');
    }
    
    if (analytics.failedStudentsList.length > 0) {
      improvements.push('Critical Thinking Enhancement Programs');
    }
    
    return improvements.length > 0 ? improvements : ['All areas performing well'];
  }, [analytics]);

  const COLORS = ['#6366f1', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  const GRADE_COLORS: { [key: string]: string } = {
    'A+': '#10b981',
    'A': '#22c55e',
    'B': '#3b82f6',
    'C': '#f59e0b',
    'D': '#f97316',
    'F': '#ef4444'
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <PageContainer>
      <Header>
        <Title>
          <AnalyticsIcon />
          Examination Analytics
        </Title>
        <HeaderControls>
          <Select
            value={selectedExam?.id || ''}
            onChange={(e) => {
              const exam = examinations.find(ex => ex.id === Number(e.target.value));
              setSelectedExam(exam || null);
            }}
          >
            <option value="">Select Examination</option>
            {examinations.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name} ({exam.exam_type.replace('_', ' ').toUpperCase()})
              </option>
            ))}
          </Select>
          <IconButton onClick={loadAnalytics} disabled={!selectedExam || analyticsLoading} title="Refresh">
            <RefreshIcon />
          </IconButton>
          <ExportButton onClick={handleExportPDF} disabled={!selectedExam || !analytics || exportLoading}>
            {exportLoading ? (
              <div style={{ width: 16, height: 16, border: '2px solid #e0e7ff', borderTop: '2px solid #4a6cf7', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            ) : (
              <PictureAsPdf style={{ fontSize: '1rem' }} />
            )}
            PDF
          </ExportButton>
        </HeaderControls>
      </Header>

      <MainContent ref={mainContentRef}>
        {analyticsLoading ? (
          <Loader size="small" />
        ) : !selectedExam ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#666' }}>
            Please select an examination to view analytics
          </div>
        ) : (
          <>
            {!analytics ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#666' }}>
                Loading analytics...
              </div>
            ) : (
              <>
                {/* Professional Dashboard Layout */}
                <DashboardGrid>
                  {/* Overall Performance Index - Full Width Top Row */}
                  <PerformanceIndexCard $span={12}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <PerformanceValue style={{ fontSize: '2.5rem', margin: 0 }}>{analytics.averagePercentage.toFixed(1)}%</PerformanceValue>
                        <div>
                          <PerformanceLabel style={{ fontSize: '0.7rem', marginBottom: '0.2rem' }}>Overall Performance Index</PerformanceLabel>
                          <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.1rem' }}>Average Percentage</div>
                        </div>
                      </div>
                      
                      <MetricsGrid>
                        <MetricItem style={{ textAlign: 'center' }}>
                          <MetricLabel style={{ fontSize: '0.65rem', marginBottom: '0.3rem' }}>Appeared</MetricLabel>
                          <MetricValue style={{ fontSize: '1.4rem' }}>{analytics.appearedStudents}</MetricValue>
                        </MetricItem>
                        <MetricItem style={{ textAlign: 'center' }}>
                          <MetricLabel style={{ fontSize: '0.65rem', marginBottom: '0.3rem' }}>Passed / Failed</MetricLabel>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            <MetricValue style={{ fontSize: '1.4rem', color: '#6ee7b7' }}>{analytics.passedStudents}</MetricValue>
                            <span style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.5)' }}>/</span>
                            <MetricValue style={{ fontSize: '1.4rem', color: '#fca5a5' }}>{analytics.failedStudents}</MetricValue>
                          </div>
                        </MetricItem>
                        <MetricItem style={{ textAlign: 'center' }}>
                          <MetricLabel style={{ fontSize: '0.65rem', marginBottom: '0.3rem' }}>Pass %</MetricLabel>
                          <MetricValue style={{ fontSize: '1.4rem', color: '#6ee7b7' }}>{analytics.passPercentage.toFixed(1)}%</MetricValue>
                        </MetricItem>
                        <MetricItem style={{ textAlign: 'center' }}>
                          <MetricLabel style={{ fontSize: '0.65rem', marginBottom: '0.3rem' }}>Average %</MetricLabel>
                          <MetricValue style={{ fontSize: '1.4rem', color: '#fff' }}>{analytics.averagePercentage.toFixed(1)}%</MetricValue>
                        </MetricItem>
                      </MetricsGrid>
                    </div>
                  </PerformanceIndexCard>

                  {/* All Subjects Performance - Full Width */}
                  <ChartCard $span={12} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexShrink: 0 }}>
                      <ChartTitle style={{ marginBottom: 0 }}>
                        <SubjectIcon />
                        All Subjects Performance
                      </ChartTitle>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '12px', height: '12px', backgroundColor: '#6366f1', borderRadius: '2px' }}></div>
                          <span style={{ fontSize: '0.7rem', color: (theme as any).TEXT_SECONDARY }}>Average %</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '2px' }}></div>
                          <span style={{ fontSize: '0.7rem', color: (theme as any).TEXT_SECONDARY }}>Pass Rate %</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: (theme as any).TEXT_SECONDARY }}>
                          {allSubjectsChartData.length} {allSubjectsChartData.length === 1 ? 'Subject' : 'Subjects'}
                        </div>
                      </div>
                    </div>
                    {allSubjectsChartData.length > 0 ? (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={allSubjectsChartData} 
                            margin={{ top: 5, right: 25, left: 15, bottom: 55 }}
                            barCategoryGap="20%"
                          >
                            <XAxis 
                              dataKey="subject" 
                              stroke={(theme as any).TEXT_SECONDARY}
                              angle={-45}
                              textAnchor="end"
                              height={55}
                              interval={0}
                              fontSize={11}
                              tick={{ fill: (theme as any).TEXT_SECONDARY }}
                              tickLine={{ stroke: (theme as any).TEXT_SECONDARY }}
                            />
                          <YAxis 
                            stroke={(theme as any).TEXT_SECONDARY}
                            domain={[0, 100]}
                            tick={{ fill: (theme as any).TEXT_SECONDARY }}
                            tickLine={{ stroke: (theme as any).TEXT_SECONDARY }}
                            label={{ 
                              value: 'Percentage (%)', 
                              angle: -90, 
                              position: 'insideLeft', 
                              style: { 
                                textAnchor: 'middle',
                                fill: (theme as any).TEXT_SECONDARY,
                                fontSize: '12px'
                              } 
                            }}
                            ticks={[0, 25, 50, 75, 100]}
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                            contentStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }}
                            content={({ active, payload, label }: any) => {
                              if (!active || !payload || !payload.length) return null;
                              
                              const isDark = (theme as any).BG === '#252525';
                              const data = payload[0]?.payload;
                              const subject = data ? allSubjectsChartData.find((s: any) => s.subject === data.subject) : null;
                              const fullSubjectName = subject?.fullName || label;
                              
                              return (
                                <div style={{
                                  backgroundColor: isDark ? '#1e293b' : '#fff',
                                  border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
                                  borderRadius: '8px',
                                  padding: '12px',
                                  boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.15)',
                                  minWidth: '200px'
                                }}>
                                  <div style={{
                                    color: isDark ? '#f1f5f9' : '#1e293b',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    marginBottom: '10px',
                                    borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                                    paddingBottom: '6px'
                                  }}>
                                    {fullSubjectName}
                                  </div>
                                  {payload.map((entry: any, index: number) => {
                                    const numValue = typeof entry.value === 'number' ? entry.value : parseFloat(entry.value);
                                    if (entry.dataKey === 'average') {
                                      return (
                                        <div key={index} style={{ color: isDark ? '#cbd5e1' : '#64748b', fontSize: '12px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ color: entry.color, fontSize: '10px' }}>●</span> 
                                          <span>Average %: <strong style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>{numValue.toFixed(2)}%</strong></span>
                                        </div>
                                      );
                                    }
                                    if (entry.dataKey === 'passRate') {
                                      const passed = subject?.passed || 0;
                                      const failed = subject?.failed || 0;
                                      return (
                                        <div key={index} style={{ color: isDark ? '#cbd5e1' : '#64748b', fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ color: entry.color, fontSize: '10px' }}>●</span> 
                                          <span>Pass Rate %: <strong style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>{numValue.toFixed(2)}%</strong> (Passed: <strong style={{ color: '#10b981' }}>{passed}</strong>, Failed: <strong style={{ color: '#ef4444' }}>{failed}</strong>)</span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })}
                                </div>
                              );
                            }}
                          />
                          <Bar 
                            dataKey="average" 
                            fill="#6366f1" 
                            name="Average %" 
                            radius={[6, 6, 0, 0]}
                            maxBarSize={50}
                          />
                          <Bar 
                            dataKey="passRate" 
                            fill="#10b981" 
                            name="Pass Rate %" 
                            radius={[6, 6, 0, 0]}
                            maxBarSize={50}
                          />
                        </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div style={{ padding: '3rem', textAlign: 'center', color: (theme as any).TEXT_SECONDARY }}>
                        <SubjectIcon style={{ fontSize: '3rem', opacity: 0.3, marginBottom: '1rem' }} />
                        <div style={{ fontSize: '1rem' }}>No subject data available</div>
                      </div>
                    )}
                  </ChartCard>

                  {/* Grade Distribution and Class Performance - Side by Side */}
                  <ChartCard $span={6}>
                    <ChartTitle>
                      <GradeIcon />
                      Distribution of Grades
                    </ChartTitle>
                    {gradeChartData.length > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', flex: 1 }}>
                        <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={gradeChartData}>
                          <XAxis dataKey="grade" stroke={(theme as any).TEXT_SECONDARY} />
                          <YAxis stroke={(theme as any).TEXT_SECONDARY} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }}
                            content={({ active, payload, label }: any) => {
                              if (!active || !payload || !payload.length) return null;
                              
                              const isDark = (theme as any).BG === '#252525';
                              const data = payload[0]?.payload;
                              const grade = data?.grade || label;
                              const count = data?.count || 0;
                              const percentage = data?.percentage || 0;
                              
                              return (
                                <div style={{
                                  backgroundColor: isDark ? '#1e293b' : '#fff',
                                  border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
                                  borderRadius: '8px',
                                  padding: '12px',
                                  boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.15)',
                                  minWidth: '200px'
                                }}>
                                  <div style={{
                                    color: isDark ? '#f1f5f9' : '#1e293b',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    marginBottom: '10px',
                                    borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                                    paddingBottom: '6px'
                                  }}>
                                    Grade: {grade}
                                  </div>
                                  {payload.map((entry: any, index: number) => {
                                    const numValue = typeof entry.value === 'number' ? entry.value : parseFloat(entry.value);
                                    return (
                                      <div key={index} style={{ color: isDark ? '#cbd5e1' : '#64748b', fontSize: '12px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ color: entry.color, fontSize: '10px' }}>●</span> 
                                        <span>Count: <strong style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>{count}</strong></span>
                                      </div>
                                    );
                                  })}
                                  <div style={{ color: isDark ? '#cbd5e1' : '#64748b', fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>Percentage: <strong style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>{percentage.toFixed(2)}%</strong></span>
                                  </div>
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="percentage" radius={[8, 8, 0, 0]}>
                            {gradeChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={GRADE_COLORS[entry.grade] || COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div style={{ padding: '2rem', textAlign: 'center', color: (theme as any).TEXT_SECONDARY }}>
                        No grade data available
                      </div>
                    )}
                  </ChartCard>

                  {/* Class Performance Chart */}
                  <ChartCard $span={6}>
                    <ChartTitle>
                      <ClassIcon />
                      Student Performance by Class
                    </ChartTitle>
                    {classPerformanceChartData.length > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', flex: 1 }}>
                        <ResponsiveContainer width="100%" height={250}>
                        <ComposedChart data={classPerformanceChartData}>
                          <XAxis dataKey="class" stroke={(theme as any).TEXT_SECONDARY} angle={-45} textAnchor="end" height={80} />
                          <YAxis stroke={(theme as any).TEXT_SECONDARY} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }}
                            content={({ active, payload, label }: any) => {
                              if (!active || !payload || !payload.length) return null;
                              
                              const isDark = (theme as any).BG === '#252525';
                              const data = payload[0]?.payload;
                              const classData = data ? classPerformanceChartData.find((c: any) => c.class === data.class) : null;
                              
                              return (
                                <div style={{
                                  backgroundColor: isDark ? '#1e293b' : '#fff',
                                  border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
                                  borderRadius: '8px',
                                  padding: '12px',
                                  boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.15)',
                                  minWidth: '200px'
                                }}>
                                  <div style={{
                                    color: isDark ? '#f1f5f9' : '#1e293b',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    marginBottom: '10px',
                                    borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                                    paddingBottom: '6px'
                                  }}>
                                    {label}
                                  </div>
                                  {payload.map((entry: any, index: number) => {
                                    const numValue = typeof entry.value === 'number' ? entry.value : parseFloat(entry.value);
                                    const passed = classData?.passed || 0;
                                    const failed = classData?.failed || 0;
                                    
                                    if (entry.dataKey === 'average') {
                                      return (
                                        <div key={index} style={{ color: isDark ? '#cbd5e1' : '#64748b', fontSize: '12px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ color: entry.color, fontSize: '10px' }}>●</span> 
                                          <span>Average %: <strong style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>{numValue.toFixed(2)}%</strong></span>
                                        </div>
                                      );
                                    }
                                    if (entry.dataKey === 'passRate') {
                                      return (
                                        <div key={index} style={{ color: isDark ? '#cbd5e1' : '#64748b', fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ color: entry.color, fontSize: '10px' }}>●</span> 
                                          <span>Pass Rate %: <strong style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>{numValue.toFixed(2)}%</strong> (Passed: <strong style={{ color: '#10b981' }}>{passed}</strong>, Failed: <strong style={{ color: '#ef4444' }}>{failed}</strong>)</span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })}
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="average" name="Average %" radius={[8, 8, 0, 0]}>
                            {classPerformanceChartData.map((entry, index) => {
                              const colors = [
                                '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
                                '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6',
                                '#a855f7', '#3b82f6', '#22c55e', '#eab308', '#f43f5e'
                              ];
                              return (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                              );
                            })}
                          </Bar>
                          <Line type="monotone" dataKey="passRate" stroke="#10b981" strokeWidth={2} name="Pass Rate %" />
                        </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div style={{ padding: '2rem', textAlign: 'center', color: (theme as any).TEXT_SECONDARY }}>
                        No class data available
                      </div>
                    )}
                  </ChartCard>
                </DashboardGrid>

                {/* Detailed Tables Section - Collapsible */}


            {analytics.topPerformers.length > 0 && (
              <SectionWrapper>
                <SectionHeader onClick={() => setIsTopPerformersExpanded(!isTopPerformersExpanded)}>
                  <SectionHeaderTitle>
                    <SectionTitle>
                      <TrophyIcon style={{ fontSize: window.innerWidth <= 700 ? '1.1rem' : '1.3rem' }} />
                      Top Performers (Top 15)
                    </SectionTitle>
                    <ExpandIcon $isExpanded={isTopPerformersExpanded} />
                  </SectionHeaderTitle>
                </SectionHeader>
                <CollapsibleContent $isExpanded={isTopPerformersExpanded}>
                  <TableWrapper>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Rank</Th>
                          <Th>Name</Th>
                          <Th>Class</Th>
                          <Th>Marks</Th>
                          <Th>%</Th>
                          <Th>Grade</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.topPerformers.map((tp, idx) => (
                          <tr key={idx}>
                            <Td>
                              <Badge $variant={idx < 3 ? "success" : "info"}>
                                #{tp.position}
                              </Badge>
                            </Td>
                            <Td><strong>{tp.student_name}</strong></Td>
                            <Td>{tp.class_name}</Td>
                            <Td>{tp.obtained_marks}/{tp.total_marks}</Td>
                            <Td>
                              <InfoValue $color={tp.percentage >= 90 ? "#10b981" : tp.percentage >= 75 ? "#3b82f6" : "#6366f1"}>
                                {tp.percentage.toFixed(1)}%
                              </InfoValue>
                            </Td>
                            <Td>
                              <Badge $variant={tp.grade === 'A+' || tp.grade === 'A' ? "success" : tp.grade === 'B' ? "info" : "warning"}>
                                {tp.grade}
                              </Badge>
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </TableWrapper>
                </CollapsibleContent>
              </SectionWrapper>
            )}


            {analytics.studentsNeedingAttention.length > 0 && (
              <SectionWrapper>
                <SectionHeader onClick={() => setIsStudentsNeedingAttentionExpanded(!isStudentsNeedingAttentionExpanded)}>
                  <SectionHeaderTitle>
                    <SectionTitle>
                      <WarningIcon style={{ fontSize: window.innerWidth <= 700 ? '1.1rem' : '1.3rem' }} />
                      Students Needing Attention ({analytics.studentsNeedingAttention.length})
                    </SectionTitle>
                    <ExpandIcon $isExpanded={isStudentsNeedingAttentionExpanded} />
                  </SectionHeaderTitle>
                </SectionHeader>
                <CollapsibleContent $isExpanded={isStudentsNeedingAttentionExpanded}>
                  <div style={{ padding: '8px 0 12px 0', fontSize: '0.75rem', color: '#666', marginBottom: '8px' }}>
                    Students scoring below 50% who require additional support
                  </div>
                  <TableWrapper>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Name</Th>
                          <Th>Class</Th>
                          <Th>Marks</Th>
                          <Th>%</Th>
                          <Th>Grade</Th>
                          <Th>Status</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.studentsNeedingAttention.map((student, idx) => (
                          <tr key={idx}>
                            <Td><strong>{student.student_name}</strong></Td>
                            <Td>{student.class_name}</Td>
                            <Td>{student.obtained_marks}/{student.total_marks}</Td>
                            <Td>
                              <InfoValue $color={student.percentage < 33 ? "#ef4444" : "#f59e0b"}>
                                {student.percentage.toFixed(1)}%
                              </InfoValue>
                            </Td>
                            <Td>
                              <Badge $variant={student.percentage < 33 ? "danger" : "warning"}>
                                {student.grade}
                              </Badge>
                            </Td>
                            <Td>
                              <Badge $variant={student.status === 'pass' ? "info" : "danger"}>
                                {student.status === 'pass' ? 'Pass' : 'Fail'}
                              </Badge>
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </TableWrapper>
                </CollapsibleContent>
              </SectionWrapper>
            )}

            {analytics.failedStudentsList.length > 0 && (
              <SectionWrapper>
                <SectionHeader onClick={() => setIsFailedStudentsExpanded(!isFailedStudentsExpanded)}>
                  <SectionHeaderTitle>
                    <SectionTitle>
                      <PeopleIcon style={{ fontSize: window.innerWidth <= 700 ? '1.1rem' : '1.3rem' }} />
                      Failed Students ({analytics.failedStudentsList.length})
                    </SectionTitle>
                    <ExpandIcon $isExpanded={isFailedStudentsExpanded} />
                  </SectionHeaderTitle>
                </SectionHeader>
                <CollapsibleContent $isExpanded={isFailedStudentsExpanded}>
                  <TableWrapper>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Name</Th>
                          <Th>Class</Th>
                          <Th>Marks</Th>
                          <Th>%</Th>
                          <Th>Grade</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.failedStudentsList.map((fs, idx) => (
                          <tr key={idx}>
                            <Td><strong>{fs.student_name}</strong></Td>
                            <Td>{fs.class_name}</Td>
                            <Td>{fs.obtained_marks}/{fs.total_marks}</Td>
                            <Td>
                              <InfoValue $color="#ef4444">{fs.percentage.toFixed(1)}%</InfoValue>
                            </Td>
                            <Td>
                              <Badge $variant="danger">{fs.grade}</Badge>
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </TableWrapper>
                </CollapsibleContent>
              </SectionWrapper>
            )}
              </>
            )}
          </>
        )}
      </MainContent>

      {showToTop && (
        <ToTopButton onClick={handleToTop} aria-label="Scroll to top">
          <KeyboardArrowUpIcon style={{ fontSize: 32 }} />
        </ToTopButton>
      )}

    </PageContainer>
  );
};

export default ExaminationAnalytics;

