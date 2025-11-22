import React, { useState, useEffect, useContext, useRef } from 'react';
import styled from 'styled-components';
import { supabase } from '../supabaseClient';
import { ThemeContext } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { sortClasses } from '../utils/classUtils';
import { toast } from 'react-hot-toast';
import { examinationConfigurationService, DMCColorConfiguration, ExaminationConfig } from '../services/examinationConfigurationService';
import {
  Assessment as AssessmentIcon,
  PictureAsPdf,
  Print as PrintIcon,
  } from '@mui/icons-material';
import { CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControlLabel, Radio, RadioGroup } from '@mui/material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DMCData {
  student_id: string;
  student_name: string;
  father_name: string;
  class: string;
  section: string;
  roll_number: string;
  examination: string;
  student_image?: string;
  attendance_percentage?: number;
  subjects: ({
    name: string;
    theory_marks: number;
    practical_marks: number;
    total_marks: number;
    obtained_marks: number | string;
    grade: string;
  } | null)[];
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  grade: string;
  position: number;
  date: string;
}

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

interface Examination {
  id: number;
  name: string;
  session: string;
  passing_marks?: number;
  end_date?: string;
}

interface InstituteProfile {
  name: string;
  location: string;
  tagline?: string;
  logo_url?: string | null;
}

// Page Layout Components
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

const SegmentedSelect = styled.select<{ first?: boolean; last?: boolean }>`
  font-family: inherit;
  font-size: 0.77em;
  font-weight: 400;
  height: 28px;
  line-height: 28px;
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
`;

const SegmentedButton = styled.button<{ first?: boolean; last?: boolean; disabled?: boolean }>`
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
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ disabled }) => disabled ? 0.5 : 1};
  &:hover:not(:disabled) {
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
  overflow: hidden;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  
  /* Only show scrollbar when absolutely necessary */
  &:hover {
    overflow: auto;
  }
  
  /* Minimal scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525' ? '#1a1a1a' : '#f1f1f1'};
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? '#4a4a4a' : '#c1c1c1'};
    border-radius: 3px;
    transition: background 0.2s ease;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#5a5a5a' : '#a1a1a1'};
  }
  
  &::-webkit-scrollbar-corner {
    background: ${({ theme }) => theme.BG === '#252525' ? '#1a1a1a' : '#f1f1f1'};
  }
`;

// Footer Components
const PageFooter = styled.div`
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

const DMCContainer = styled.div`
  width: 100%;
  height: 100vh;
  max-height: 100vh;
  margin: 0;
  padding: 16px;
  display: grid;
  grid-template-columns: 300px 1fr 250px;
  gap: 16px;
  overflow: hidden;
  
  @media (max-width: 1200px) {
    grid-template-columns: 280px 1fr 220px;
    gap: 12px;
  }
  
  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    height: 100vh;
    margin: 0;
    border-radius: 0;
    box-shadow: none;
    border: none;
    gap: 0;
    padding: 0;
  }
`;

// Desktop sections with fixed heights
const DesktopLeftColumn = styled.div`
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const DesktopMiddleColumn = styled.div`
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const DesktopRightColumn = styled.div`
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

// Left Column - Student Profile
const StudentProfileCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 20px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const ProfileHeader = styled.div`
  padding-bottom: 16px;
  border-bottom: 2px solid ${({ theme }) => theme.ACCENT};
  display: flex;
  align-items: center;
  gap: 16px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
`;

const StudentImage = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid ${({ theme }) => theme.ACCENT};
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.FIELD_BG};
  flex-shrink: 0;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const StudentInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
`;

const StudentName = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
`;

const StudentClass = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0;
  font-weight: 500;
`;

const ProfileInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ProfileItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
`;

const ProfileLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ProfileValue = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

// Center Column - Marks
const MarksCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 20px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const MarksHeader = styled.div`
  display: grid;
  grid-template-columns: 40px 1fr 80px 80px;
  gap: 12px;
  padding: 12px 16px;
  background: ${({ theme }) => theme.ACCENT};
  color: white;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
`;

const MarksRow = styled.div<{ $isEven?: boolean }>`
  display: grid;
  grid-template-columns: 40px 1fr 80px 80px;
  gap: 12px;
  padding: 10px 16px;
  background: ${({ $isEven, theme }) => $isEven ? theme.FIELD_BG : 'transparent'};
  border-radius: 4px;
  align-items: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.ACCENT}10;
  }
`;

const MarksCell = styled.div<{ $align?: 'left' | 'center' | 'right' }>`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  text-align: ${({ $align }) => $align || 'center'};
`;

const SubjectName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const TotalRow = styled.div`
  display: grid;
  grid-template-columns: 40px 1fr 80px 80px;
  gap: 12px;
  padding: 12px 16px;
  background: ${({ theme }) => theme.ACCENT}15;
  border-radius: 6px;
  margin-top: 8px;
  font-weight: 700;
  border: 1px solid ${({ theme }) => theme.ACCENT};
`;

// Right Column - Summary
const SummaryCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 20px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const SummaryHeader = styled.div`
  text-align: center;
  padding-bottom: 16px;
  border-bottom: 2px solid ${({ theme }) => theme.ACCENT};
`;

const SummaryTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SummaryGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SummaryFirstRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 8px;
`;

const SummaryRest = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  text-align: center;
`;

const SummaryLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
`;

const SummaryValue = styled.span`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const ColorCodedValue = styled.span<{ $value: number }>`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ $value }) => {
    if ($value >= 90) return '#059669'; // Green for excellent (90%+)
    if ($value >= 80) return '#d97706'; // Orange for good (80-89%)
    if ($value >= 70) return '#dc2626'; // Red for poor (70-79%)
    return '#991b1b'; // Dark red for very poor (<70%)
  }};
`;



const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  font-size: 18px;
  color: #7f8c8d;
`;

const ProgressBar = styled.div<{ $progress: number }>`
    position: absolute;
    bottom: 0;
    left: 0;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
  width: ${props => props.$progress}%;
  transition: width 0.3s ease;
  border-radius: 0 0 4px 4px;
`;

const ButtonContent = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: 40px;
  color: #e74c3c;
  font-size: 16px;
`;

// Mobile-specific containers
const MobileHeader = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
    flex-direction: row;
    align-items: center;
    background: ${({ theme }) => theme.CARD};
    border-bottom: 1px solid ${({ theme }) => theme.BORDER};
    padding: 8px 12px;
    gap: 12px;
    height: 60px;
    min-height: 60px;
    max-height: 60px;
    overflow: hidden;
  }
  
  @media (min-width: 769px) {
    display: none;
  }
`;

const MobileSubjectArea = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    background: ${({ theme }) => theme.BACKGROUND};
    padding: 12px;
    flex: 1;
    min-height: 0;
    overflow: visible;
  }
  
  @media (min-width: 769px) {
    display: none;
  }
`;

const MobileFooter = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    background: ${({ theme }) => theme.CARD};
    border-top: 1px solid ${({ theme }) => theme.BORDER};
    padding: 8px;
    gap: 8px;
    flex-shrink: 0;
    min-height: 100px;
  }
  
  @media (min-width: 769px) {
    display: none;
  }
`;

// Mobile student profile
const MobileStudentProfile = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0;
  background: transparent;
  border: none;
  flex: 1;
  min-width: 0;
`;

const MobileStudentImage = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid ${({ theme }) => theme.ACCENT};
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const MobileStudentInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const MobileStudentName = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MobileStudentClass = styled.p`
  margin: 0;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// Mobile marks table
const MobileMarksTable = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  overflow: hidden;
  max-height: calc(100vh - 300px);
  overflow-y: auto;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525' ? '#1a1a1a' : '#f1f1f1'};
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? '#4a4a4a' : '#c1c1c1'};
    border-radius: 3px;
    transition: background 0.2s ease;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#5a5a5a' : '#a1a1a1'};
  }
`;

const MobileMarksHeader = styled.div`
  display: grid;
  grid-template-columns: 25px 1fr 50px 50px;
  gap: 6px;
  padding: 8px 12px;
  background: ${({ theme }) => theme.ACCENT}cc;
  color: white;
  font-weight: 600;
  font-size: 0.7rem;
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(8px);
`;

const MobileMarksRow = styled.div`
  display: grid;
  grid-template-columns: 25px 1fr 50px 50px;
  gap: 6px;
  padding: 6px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  font-size: 0.75rem;
  
  &:last-child {
    border-bottom: none;
  }
`;

const MobileMarksCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-weight: 500;
  
  &:nth-child(2) {
    justify-content: flex-start;
    text-align: left;
  }
`;

// Mobile summary
const MobileSummaryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const MobileSummaryCard = styled.div`
  background: ${({ theme }) => theme.BACKGROUND};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 6px;
  padding: 6px;
  text-align: center;
`;

const MobileSummaryLabel = styled.div`
  font-size: 0.65rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  margin-bottom: 2px;
`;

const MobileSummaryValue = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT};
`;

const MobileSummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  
  &:last-child {
    border-bottom: none;
  }
`;

const MobileSummaryLabelInline = styled.span`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const MobileSummaryValueInline = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT};
`;


const MobileSummaryCardsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 4px;
`;


const MobileSummaryInfoCard = styled.div<{ $vertical?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  gap: 16px;
  
  ${({ $vertical }) => $vertical && `
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  `}
`;

const MobileSummaryInfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
`;

const MobileSummaryInfoLabel = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.8;
  flex-shrink: 0;
`;

const MobileSummaryInfoValue = styled.span`
  font-size: 0.9rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  letter-spacing: 0.3px;
  flex: 1;
  text-align: right;
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

const DetailedMarksCertificate: React.FC = () => {
  const [dmcData, setDmcData] = useState<DMCData | null>(null);
  const [allDmcData, setAllDmcData] = useState<DMCData[]>([]);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const certificateRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfVersion, setPdfVersion] = useState<'colored' | 'bw' | 'custom'>('colored');
  const [colorsModalOpen, setColorsModalOpen] = useState(false);
  const { theme } = useContext(ThemeContext);
  const { user } = useAuth();
  

  // Filter states
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedExamination, setSelectedExamination] = useState<Examination | null>(null);
  const [instituteProfile, setInstituteProfile] = useState<InstituteProfile | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('modern');
  const [customColors, setCustomColors] = useState<DMCColorConfiguration | null>(null);
  const [dmcConfig, setDmcConfig] = useState<any>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadCustomColors = async () => {
    try {
      if (user?.school_id) {
        const config = await examinationConfigurationService.getExaminationConfiguration(user.school_id);
        
        if (config) {
          if (config.dmc_color_configuration) {
            // Force migration and ensure border_color is always set
            const colorConfig = { ...config.dmc_color_configuration };
            
            // Always ensure border_color exists - use signature_line_color if available, otherwise use table_header_background
            if (!colorConfig.border_color) {
              if ((colorConfig as any).signature_line_color) {
                colorConfig.border_color = (colorConfig as any).signature_line_color;
              } else {
                colorConfig.border_color = colorConfig.table_header_background || '#667eea';
              }
            }
            
            // Force update the database to ensure border_color is always present
            try {
              const updatedConfig = {
                ...config,
                dmc_color_configuration: colorConfig
              };
              await examinationConfigurationService.upsertExaminationConfiguration(updatedConfig);
            } catch (migrationError) {
            }
            
            setCustomColors(colorConfig);
          }
          if (config.dmc_configuration) {
            setDmcConfig(config.dmc_configuration);
          }
        }
        if (!config?.dmc_color_configuration) {
          // Try to create a default configuration
          try {
            const defaultConfig: ExaminationConfig = {
              school_id: user.school_id,
              grade_configurations: examinationConfigurationService.getDefaultGradeConfigurations(),
              dmc_configuration: examinationConfigurationService.getDefaultDMCConfiguration(),
              dmc_color_configuration: {
                header_gradient_start: '#667eea',
                header_gradient_end: '#764ba2',
                header_text_color: '#ffffff',
                header_text_shadow: '#4a5568',
                logo_background: '#ffffff',
                logo_border: '#e2e8f0',
                title_background: '#667eea',
                title_text_color: '#ffffff',
                title_border: '#667eea',
                bar_gradient_start: '#667eea',
                bar_gradient_end: '#764ba2',
                details_background: '#ffffff',
                details_border: '#e2e8f0',
                details_text_color: '#1e293b',
                details_label_color: '#6b7280',
                table_header_background: '#667eea',
                table_header_text: '#ffffff',
                table_border: '#e2e8f0',
                table_alternate_row: '#f8fafc',
                table_text_color: '#1e293b',
                summary_background: '#f8fafc',
                summary_border: '#e2e8f0',
                summary_text_color: '#1e293b',
                summary_label_color: '#6b7280',
                excellent_color: '#059669',
                good_color: '#d97706',
                average_color: '#dc2626',
                poor_color: '#991b1b',
                absent_color: '#dc2626',
                fail_color: '#dc2626',
                footer_gradient_start: '#667eea',
                footer_gradient_end: '#764ba2',
                border_color: '#667eea',
                signature_text_color: '#6b7280'
              }
            };
            await examinationConfigurationService.upsertExaminationConfiguration(defaultConfig);
            // Reload the configuration
            const newConfig = await examinationConfigurationService.getExaminationConfiguration(user.school_id);
            if (newConfig?.dmc_color_configuration) {
              // Handle migration from old signature_line_color to new border_color
              const colorConfig = { ...newConfig.dmc_color_configuration };
              if ((colorConfig as any).signature_line_color && !colorConfig.border_color) {
                colorConfig.border_color = (colorConfig as any).signature_line_color;
                // Update the database with the migrated configuration
                try {
                  const updatedConfig = {
                    ...newConfig,
                    dmc_color_configuration: colorConfig
                  };
                  await examinationConfigurationService.upsertExaminationConfiguration(updatedConfig);
                } catch (migrationError) {
                }
              }
              setCustomColors(colorConfig);
            }
          } catch (createError) {
            // If database table doesn't exist, set a fallback configuration
            setCustomColors({
              header_gradient_start: '#667eea',
              header_gradient_end: '#764ba2',
              header_text_color: '#ffffff',
              header_text_shadow: '#4a5568',
              logo_background: '#ffffff',
              logo_border: '#e2e8f0',
              title_background: '#667eea',
              title_text_color: '#ffffff',
              title_border: '#667eea',
              bar_gradient_start: '#667eea',
              bar_gradient_end: '#764ba2',
              details_background: '#ffffff',
              details_border: '#e2e8f0',
              details_text_color: '#1e293b',
              details_label_color: '#6b7280',
              table_header_background: '#667eea',
              table_header_text: '#ffffff',
              table_border: '#e2e8f0',
              table_alternate_row: '#f8fafc',
              table_text_color: '#1e293b',
              summary_background: '#f8fafc',
              summary_border: '#e2e8f0',
              summary_text_color: '#1e293b',
              summary_label_color: '#6b7280',
              excellent_color: '#059669',
              good_color: '#d97706',
              average_color: '#dc2626',
              poor_color: '#991b1b',
              absent_color: '#dc2626',
              fail_color: '#dc2626',
              footer_gradient_start: '#667eea',
              footer_gradient_end: '#764ba2',
              border_color: '#667eea',
              signature_text_color: '#6b7280'
            });
          }
        }
      } else {
      }
    } catch (error) {
    }
  };

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

  // Auto-generate DMC when all fields are selected
  useEffect(() => {
    if (selectedExamination && selectedClass && !loading) {
      // Check if the class has sections
      const hasSections = selectedClass.has_sections ?? true;
      if (hasSections && selectedSection) {
        loadDMCData();
      } else if (!hasSections) {
        loadDMCData();
      }
    }
  }, [selectedExamination, selectedClass, selectedSection]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load custom colors first
      await loadCustomColors();
      
      // Load institute profile using the same logic as InstituteProfile.tsx
      if (user?.school_id) {
        // Fetch institute profile
        const { data: profileData, error: profileError } = await supabase
          .from('institute_profile')
          .select('*')
          .eq('school_id', user.school_id)
          .single();

        // Fetch school data
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('*')
          .eq('id', user.school_id)
          .single();

        if (schoolError) {
        }

        // Merge school data with institute profile data (same logic as InstituteProfile.tsx)
        const mergedData = {
          name: profileData?.name || schoolData?.name || 'AL-HARAM PUBLIC SCHOOL & IQRA ACADEMY',
          short_name: profileData?.short_name || schoolData?.name?.substring(0, 3).toUpperCase() || '',
          tagline: profileData?.tagline || `Welcome to ${schoolData?.name || 'Our School'}`,
          phone: profileData?.phone || schoolData?.contact || '+92-300-1234567',
          website: profileData?.website || '',
          address: profileData?.address || schoolData?.address || 'BALU SHARIF DISTT. NOWSHERA',
          country: profileData?.country || 'Pakistan',
          logo_url: profileData?.logo_url || schoolData?.logo_url || null,
        };

        setInstituteProfile({
          name: mergedData.name,
          location: `${mergedData.address} - ${mergedData.phone}`,
          tagline: mergedData.tagline,
          logo_url: mergedData.logo_url
        });
      } else {
        // Fallback to default data
        setInstituteProfile({
          name: 'AL-HARAM PUBLIC SCHOOL & IQRA ACADEMY',
          location: 'BALU SHARIF DISTT. NOWSHERA - +92-300-1234567',
          tagline: 'Excellence in Education',
          logo_url: null
        });
      }

      // Load classes for the current school only
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name, school_id, has_sections')
        .eq('school_id', user?.school_id);

      if (classesError) throw classesError;
      
      // Remove duplicates based on name
      const uniqueClasses = classesData?.filter((classItem, index, self) => 
        index === self.findIndex(c => c.name === classItem.name)
      ) || [];
      
      // Sort classes: numbered classes first, then special classes (Play Group, Nursery, K.G)
      const sortedClasses = sortClasses(uniqueClasses);
      
      setClasses(sortedClasses);

      // Load examinations for the current school only
      const { data: examinationsData, error: examinationsError } = await supabase
        .from('examinations')
        .select('*')
        .eq('school_id', user?.school_id)
        .order('name');

      if (examinationsError) throw examinationsError;
      setExaminations(examinationsData || []);

      // Load custom colors for DMC
      await loadCustomColors();

    } catch (err) {
      toast.error('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

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
    } catch (err) {
      toast.error('Failed to load sections');
    }
  };

  const navigateToStudent = (index: number) => {
    if (index >= 0 && index < allDmcData.length) {
      setCurrentStudentIndex(index);
      setDmcData(allDmcData[index]);
    }
  };

  const nextStudent = () => {
    if (currentStudentIndex < allDmcData.length - 1) {
      navigateToStudent(currentStudentIndex + 1);
    }
  };

  const prevStudent = () => {
    if (currentStudentIndex > 0) {
      navigateToStudent(currentStudentIndex - 1);
    }
  };

  const loadDMCData = async () => {
    if (!selectedClass || !selectedExamination) {
      toast.error('Please select class and examination');
      return;
    }

    // Check if the class has sections
    const hasSections = selectedClass.has_sections ?? true;
    if (hasSections && !selectedSection) {
      toast.error('Please select section');
      return;
    }

    try {
      setLoading(true);
      setLoadingProgress(0);
      setError(null);
      
      // Simulate progress for DMC generation
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 200);
      

      // Use the exact same approach as MasterSheetManager.tsx
      // Get all students for the selected class/section
      let studentQuery = supabase
        .from('students')
        .select('id, name, father_name, picture_url, class_id, section_id, school_id')
        .eq('school_id', user?.school_id)
        .eq('class_id', selectedClass.id)
        .eq('status', 'active');

      // Add section filter only if the class has sections
      if (hasSections && selectedSection) {
        studentQuery = studentQuery.eq('section_id', selectedSection.id);
      } else if (!hasSections) {
        studentQuery = studentQuery.is('section_id', null);
      }

      const { data: students, error: studentsError } = await studentQuery;
      if (studentsError) throw studentsError;

      if (!students || students.length === 0) {
        setDmcData(null);
        setAllDmcData([]);
        setError(`No students found for class ${selectedClass.name}${hasSections && selectedSection?.name ? ` (${selectedSection.name})` : ''}. Please check if students are enrolled in this class${hasSections ? ' and section' : ''}.`);
        return;
      }

      // Fetch exam results for the selected examination (matching MasterSheetManager pattern)
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
          subjects!inner(name)
        `)
        .eq('exam_id', selectedExamination.id)
        .eq('school_id', user?.school_id)
        .in('student_id', students.map(s => s.id));

      if (resultsError) throw resultsError;

      // Check if any exam results exist for this examination
      if (!examResults || examResults.length === 0) {
        setDmcData(null);
        setAllDmcData([]);
        setError(`No examination results found for ${selectedExamination?.name}. Please ensure exam results have been entered for this examination.`);
        return;
      }

      // Get unique subjects that have exam results (matching MasterSheetManager pattern)
      const subjectsWithResults = new Set();
      examResults?.forEach(result => {
        subjectsWithResults.add(result.subject_id);
      });

      // Check if any subjects have exam results
      if (subjectsWithResults.size === 0) {
        setDmcData(null);
        setAllDmcData([]);
        setError(`No subjects found with examination results for ${selectedExamination?.name}. Please ensure exam results have been entered for at least one subject.`);
        return;
      }

      // Store subjects with results for header generation
      const subjectsData = examResults?.reduce((acc, result) => {
        if (!acc[result.subject_id]) {
          acc[result.subject_id] = {
            id: result.subject_id,
            name: (result.subjects as any)?.name,
            max_marks: result.max_marks
          };
        }
        return acc;
      }, {} as any) || {};

      // Convert to array and set state
      const subjectsArray = Object.values(subjectsData);

      // Group results by student (matching MasterSheetManager pattern)
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
        setAllDmcData([]);
        setDmcData(null);
        setError(`No examination records found for ${selectedClass?.name} ${hasSections && selectedSection?.name ? `(${selectedSection.name})` : ''} in ${selectedExamination?.name}. Please ensure exam results have been entered for this class${hasSections ? ' and section' : ''} and examination.`);
        return;
      }

      // Sort students by student ID first
      const sortedStudents = studentsWithResults.sort((a, b) => a.id - b.id);

      // Convert to DMC data format (matching MasterSheetManager pattern)
      const dmcDataArray: DMCData[] = [];
      
      // Process students sequentially to handle async attendance calculation
      for (let index = 0; index < sortedStudents.length; index++) {
        const student = sortedStudents[index];
        const results = studentResults[student.id] || [];
        const obtainedMarks = results.reduce((sum, r) => sum + (r.obtained_marks || 0), 0);
        const percentage = totalExamMarks > 0 ? (obtainedMarks / totalExamMarks) * 100 : 0;
        
        // Determine grade based on percentage
        let grade = 'F';
        if (percentage >= 90) grade = 'A+';
        else if (percentage >= 80) grade = 'A';
        else if (percentage >= 70) grade = 'B';
        else if (percentage >= 60) grade = 'C';
        else if (percentage >= 50) grade = 'D';

        // Sort results by subject order using the getSubjectOrder function
        const sortedResults = results.sort((a, b) => {
          const orderA = getSubjectOrder(a.subjects?.name || '');
          const orderB = getSubjectOrder(b.subjects?.name || '');
          return orderA - orderB;
        });

        // Create subjects array with all available subjects
        const subjectsArray = sortedResults.map((result) => {
          if (result && result.subjects) {
            // Check if student was absent for this subject (matching MasterSheetManager logic)
            let obtainedMarks = result.obtained_marks;
            if (result.remarks === 'Absent' || (result.obtained_marks === 0 && result.remarks?.toLowerCase().includes('absent'))) {
              obtainedMarks = 'A';
            }
            
            return {
              name: result.subjects.name,
              theory_marks: 0,
              practical_marks: 0,
              total_marks: result.max_marks,
              obtained_marks: obtainedMarks,
              grade: grade
            };
          }
          return null;
        }).filter(subject => subject !== null);

        // Calculate attendance percentage for this student
        const attendancePercentage = await calculateStudentAttendancePercentage(student.id, selectedExamination.end_date);

        dmcDataArray.push({
          student_id: student.id,
          student_name: student.name,
          father_name: student.father_name || '',
          class: selectedClass.name,
          section: hasSections ? (selectedSection?.name || 'All') : '',
          roll_number: (index + 1).toString(), // Sequential R. No based on sorted student order
          examination: selectedExamination.name,
          student_image: student.picture_url,
          attendance_percentage: attendancePercentage,
          subjects: subjectsArray,
          total_marks: totalExamMarks,
          obtained_marks: obtainedMarks,
          percentage: Math.round(percentage * 10) / 10,
          grade: grade,
          position: 0, // Will be calculated after sorting
          date: new Date().toLocaleDateString()
        });
      }

      // First, sort by obtained marks to assign positions (exact same logic as MasterSheetManager)
      const sortedByMarks = [...dmcDataArray].sort((a, b) => b.obtained_marks - a.obtained_marks);
      
      // Assign positions with proper handling of ties (exact same logic as MasterSheetManager)
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
        }
        
        // Move to next position (skip the tied students and increment by 1)
        i += sameMarksCount - 1;
        currentPosition = currentPosition + 1; // Always increment by 1 for next position
      }

      // Then sort by student ID for display (exact same logic as MasterSheetManager)
      dmcDataArray.sort((a, b) => Number(a.student_id) - Number(b.student_id));

      // Load all students' DMC data
      if (dmcDataArray.length > 0) {
        setAllDmcData(dmcDataArray);
        setDmcData(dmcDataArray[0]);
        setCurrentStudentIndex(0);
        toast.success(`DMC loaded for ${dmcDataArray.length} students`);
      } else {
        throw new Error('No exam results found');
      }

    } catch (err) {
      setError('Failed to load DMC data');
      toast.error('Failed to load DMC data');
    } finally {
      setLoadingProgress(100);
      setTimeout(() => {
        setLoading(false);
        setLoadingProgress(0);
      }, 300);
    }
  };

  // Function to calculate student attendance percentage (filtered by examination end date)
  const calculateStudentAttendancePercentage = async (studentId: string, examinationEndDate?: string): Promise<number> => {
    try {
      // Build query for attendance records
      let query = supabase
        .from('attendance_records')
        .select('id, date, status, remarks')
        .eq('student_id', studentId)
        .order('date', { ascending: false });

      // If examination end date is provided, filter attendance records to only include those before/on the end date
      if (examinationEndDate) {
        query = query.lte('date', examinationEndDate);
      }

      const { data: attendanceData, error } = await query;

      if (error) {
        return 100; // Default to 100% if error
      }

      if (!attendanceData || attendanceData.length === 0) {
        return 100; // Default to 100% if no attendance data
      }

      // Calculate attendance stats
      const stats: {
        present: number;
        absent: number;
        late: number;
        leave: number;
        total: number;
      } = {
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        total: attendanceData.length
      };

      attendanceData.forEach((record: { status: 'present' | 'absent' | 'late' | 'leave' }) => {
        if (record.status in stats) {
          stats[record.status as keyof typeof stats]++;
        }
      });

      // Calculate percentage
      const attendancePercentage = Math.round((stats.present / stats.total) * 100);
      return attendancePercentage;
    } catch (error) {
      return 100; // Default to 100% if error
    }
  };

  // Helper function to generate initials from student name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2); // Limit to 2 characters
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

  // Helper function to convert hex color to RGB for jsPDF
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };


  const handleExportPDF = async () => {
    if (!allDmcData || allDmcData.length === 0) {
      toast.error('No DMC data to export');
      return;
    }

    if (pdfLoading) {
      return; // Prevent multiple clicks while generating
    }


    // Show dialog to choose PDF version
    setPdfDialogOpen(true);
  };

  const handleConfirmPDFExport = async () => {
    setPdfDialogOpen(false);
    
    // Helper function to lighten a hex color (moved inside function for scope access)
    const lightenColor = (hex: string, factor: number): string => {
      const rgb = hexToRgb(hex);
      const r = Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * factor));
      const g = Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * factor));
      const b = Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * factor));
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };
    
    try {
      setPdfLoading(true);
      setPdfProgress(0);
      const versionName = pdfVersion === 'colored' ? 'Colored' : pdfVersion === 'custom' ? 'Custom' : 'B&W';
      toast.loading(`Generating ${versionName} PDF...`, { id: 'pdf-export' });
      
      // Simulate progress for PDF generation
      const progressInterval = setInterval(() => {
        setPdfProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 300);

      // Create new PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });


      // Process each DMC
      for (let i = 0; i < allDmcData.length; i++) {
        const dmc = allDmcData[i];
        
        // Add new page for each DMC (except the first one)
        if (i > 0) {
          doc.addPage();
        }

        // Header section - starts from top
        const headerY = 0;
        const headerHeight = 45; // Increased header height
        
        if (pdfVersion === 'colored') {
          // Create gradient header background - purple to pink gradient
          // Since jsPDF doesn't support gradients directly, we'll create a gradient effect with multiple rectangles
          const gradientSteps = 50; // More steps for smoother gradient
          const stepWidth = 210 / gradientSteps;
          
          for (let i = 0; i < gradientSteps; i++) {
            // Create smooth horizontal gradient from left purple to right pink
            const intensity = i / (gradientSteps - 1); // 0 to 1 from left to right
            
            // Lighter version: soft purplish-blue to light magenta-purple
            const r = Math.floor(120 + (220 - 120) * intensity);
            const g = Math.floor(90 + (100 - 90) * intensity);
            const b = Math.floor(180 + (240 - 180) * intensity);
            
            doc.setFillColor(r, g, b);
            doc.rect(i * stepWidth, headerY, stepWidth, headerHeight, 'F');
          }
        } else if (pdfVersion === 'custom' && customColors) {
            // Custom version - use configured colors
            const startColor = hexToRgb(customColors.header_gradient_start);
            const endColor = hexToRgb(customColors.header_gradient_end);
            const gradientSteps = 50;
            const stepWidth = 210 / gradientSteps;
            
            for (let i = 0; i < gradientSteps; i++) {
              const intensity = i / (gradientSteps - 1);
              const r = Math.floor(startColor.r + (endColor.r - startColor.r) * intensity);
              const g = Math.floor(startColor.g + (endColor.g - startColor.g) * intensity);
              const b = Math.floor(startColor.b + (endColor.b - startColor.b) * intensity);
            
            doc.setFillColor(r, g, b);
            doc.rect(i * stepWidth, headerY, stepWidth, headerHeight, 'F');
          }
        } else {
          // B&W version - lighter gray header background (half darkness)
          doc.setFillColor('#d1d5db');
          doc.rect(0, headerY, 210, headerHeight, 'F');
          
          // Add subtle border
          doc.setDrawColor('#9ca3af');
          doc.setLineWidth(0.5);
          doc.rect(0, headerY, 210, headerHeight, 'S');
        }
        
        // Check if logo is available and enabled in configuration
        const hasLogo = instituteProfile?.logo_url && dmcConfig?.include_school_logo;
        
        let detailsCenterX;
        let logoAreaWidth = 0;
        
        if (hasLogo) {
          // School logo (circular) - fixed position on the left
          const logoX = 25; // Fixed position on the left
          const logoY = headerY + (headerHeight / 2); // Perfectly center vertically in header
          const logoRadius = 12;
          
          // Use exact same background color as header - no border/ring
          if (pdfVersion === 'colored') {
            // For colored version, use white circle with no border
            doc.setFillColor('#ffffff');
            doc.circle(logoX, logoY, logoRadius, 'F');
          } else if (pdfVersion === 'custom' && customColors) {
            // For custom version, use configured logo background
            const logoBgColor = hexToRgb(customColors.logo_background);
            doc.setFillColor(logoBgColor.r, logoBgColor.g, logoBgColor.b);
            doc.circle(logoX, logoY, logoRadius, 'F');
          } else {
            // For B&W version, use exact same background as header with no border
            doc.setFillColor('#d1d5db');
            doc.circle(logoX, logoY, logoRadius, 'F');
          }
          
          // Add logo image to PDF - perfectly centered
          try {
            if (instituteProfile.logo_url) {
              doc.addImage(instituteProfile.logo_url, 'PNG', logoX - logoRadius, logoY - logoRadius, logoRadius * 2, logoRadius * 2, '', 'FAST');
            }
          } catch (error) {
            // If image fails, don't show anything - just leave the circle empty
          }
          
          // School details - centered in the remaining space to the right of logo
          logoAreaWidth = 25; // Width occupied by logo area
          const remainingWidth = 210 - logoAreaWidth; // Remaining space for details
          detailsCenterX = logoAreaWidth + (remainingWidth / 2); // Center of remaining space
        } else {
          // No logo - center details based on full header width
          detailsCenterX = 105; // Center of full A4 width (210mm / 2)
        }
        
        // School name with exact on-screen styling
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        
        if (pdfVersion === 'colored') {
          // Shadow matching on-screen: 0 2px 4px rgba(0, 0, 0, 0.3)
          doc.setTextColor('#6b7280'); // Softer gray for gentler shadow
          doc.text(instituteProfile?.name || 'School Name Here', detailsCenterX + 0.4, headerY + 15.4, { align: 'center' });
          // Main text (white, original position)
          doc.setTextColor('#ffffff');
          doc.text(instituteProfile?.name || 'School Name Here', detailsCenterX, headerY + 15, { align: 'center' });
        } else if (pdfVersion === 'custom' && customColors) {
          // Custom version - use configured text colors
          const shadowColor = hexToRgb(customColors.header_text_shadow);
          doc.setTextColor(shadowColor.r, shadowColor.g, shadowColor.b);
          doc.text(instituteProfile?.name || 'School Name Here', detailsCenterX + 0.4, headerY + 15.4, { align: 'center' });
          
          const textColor = hexToRgb(customColors.header_text_color);
          doc.setTextColor(textColor.r, textColor.g, textColor.b);
          doc.text(instituteProfile?.name || 'School Name Here', detailsCenterX, headerY + 15, { align: 'center' });
        } else {
          // B&W version - dark text on light background
          doc.setTextColor('#1f2937');
          doc.text(instituteProfile?.name || 'School Name Here', detailsCenterX, headerY + 15, { align: 'center' });
        }

        // Address with subtle 3D shadow effect
        doc.setFontSize(13);
        doc.setFont('helvetica', 'normal');
        
        if (pdfVersion === 'colored') {
          // Shadow (softer color, smaller offset)
          doc.setTextColor('#4a5568');
          doc.text(instituteProfile?.location || 'Address Here - Contact Number', detailsCenterX + 0.2, headerY + 25.2, { align: 'center' });
          // Main text (white, original position)
          doc.setTextColor('#ffffff');
          doc.text(instituteProfile?.location || 'Address Here - Contact Number', detailsCenterX, headerY + 25, { align: 'center' });
        } else if (pdfVersion === 'custom' && customColors) {
          // Custom version - use configured text colors
          const shadowColor = hexToRgb(customColors.header_text_shadow);
          doc.setTextColor(shadowColor.r, shadowColor.g, shadowColor.b);
          doc.text(instituteProfile?.location || 'Address Here - Contact Number', detailsCenterX + 0.2, headerY + 25.2, { align: 'center' });
          
          const textColor = hexToRgb(customColors.header_text_color);
          doc.setTextColor(textColor.r, textColor.g, textColor.b);
          doc.text(instituteProfile?.location || 'Address Here - Contact Number', detailsCenterX, headerY + 25, { align: 'center' });
        } else {
          // B&W version - dark text on light background
          doc.setTextColor('#374151');
          doc.text(instituteProfile?.location || 'Address Here - Contact Number', detailsCenterX, headerY + 25, { align: 'center' });
        }

        // Tagline with subtle 3D shadow effect - only if enabled in configuration
        if (dmcConfig?.include_school_motto) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'italic');
        
        if (pdfVersion === 'colored') {
          // Shadow (softer color, smaller offset)
          doc.setTextColor('#4a5568');
          doc.text(instituteProfile?.tagline || 'Tagline Here', detailsCenterX + 0.2, headerY + 35.2, { align: 'center' });
          // Main text (white, original position)
          doc.setTextColor('#ffffff');
          doc.text(instituteProfile?.tagline || 'Tagline Here', detailsCenterX, headerY + 35, { align: 'center' });
          } else if (pdfVersion === 'custom' && customColors) {
            // Custom version - use configured text colors
            const shadowColor = hexToRgb(customColors.header_text_shadow);
            doc.setTextColor(shadowColor.r, shadowColor.g, shadowColor.b);
            doc.text(instituteProfile?.tagline || 'Tagline Here', detailsCenterX + 0.2, headerY + 35.2, { align: 'center' });
            
            const textColor = hexToRgb(customColors.header_text_color);
            doc.setTextColor(textColor.r, textColor.g, textColor.b);
          doc.text(instituteProfile?.tagline || 'Tagline Here', detailsCenterX, headerY + 35, { align: 'center' });
        } else {
          // B&W version - dark text on light background
          doc.setTextColor('#6b7280');
          doc.text(instituteProfile?.tagline || 'Tagline Here', detailsCenterX, headerY + 35, { align: 'center' });
          }
        }

        // Bar below header (colored or B&W)
        const barY = headerY + headerHeight;
        const barHeight = 1.5;
        
        if (pdfVersion === 'colored') {
          const barGradientSteps = 50;
          const barStepWidth = 210 / barGradientSteps;
          
          for (let i = 0; i < barGradientSteps; i++) {
            // Create colorful gradient bar with multiple colors
            const intensity = i / (barGradientSteps - 1);
            
            // Lighter multi-color gradient: light blue -> light purple -> light pink -> light orange -> light green
            let r, g, b;
            if (intensity < 0.2) {
              // Light blue to light purple
              const localIntensity = intensity / 0.2;
              r = Math.floor(147 + (200 - 147) * localIntensity);
              g = Math.floor(197 + (162 - 197) * localIntensity);
              b = Math.floor(253 + (235 - 253) * localIntensity);
            } else if (intensity < 0.4) {
              // Light purple to light pink
              const localIntensity = (intensity - 0.2) / 0.2;
              r = Math.floor(200 + (252 - 200) * localIntensity);
              g = Math.floor(162 + (165 - 162) * localIntensity);
              b = Math.floor(235 + (207 - 235) * localIntensity);
            } else if (intensity < 0.6) {
              // Light pink to light orange
              const localIntensity = (intensity - 0.4) / 0.2;
              r = Math.floor(252 + (254 - 252) * localIntensity);
              g = Math.floor(165 + (215 - 165) * localIntensity);
              b = Math.floor(207 + (180 - 207) * localIntensity);
            } else if (intensity < 0.8) {
              // Light orange to light yellow
              const localIntensity = (intensity - 0.6) / 0.2;
              r = Math.floor(254 + (254 - 254) * localIntensity);
              g = Math.floor(215 + (240 - 215) * localIntensity);
              b = Math.floor(180 + (138 - 180) * localIntensity);
            } else {
              // Light yellow to light green
              const localIntensity = (intensity - 0.8) / 0.2;
              r = Math.floor(254 + (134 - 254) * localIntensity);
              g = Math.floor(240 + (239 - 240) * localIntensity);
              b = Math.floor(138 + (129 - 138) * localIntensity);
            }
            
            doc.setFillColor(r, g, b);
            doc.rect(i * barStepWidth, barY, barStepWidth, barHeight, 'F');
          }
        } else if (pdfVersion === 'custom' && customColors) {
          // Custom version - use configured bar colors
          const barGradientSteps = 50;
          const barStepWidth = 210 / barGradientSteps;
          
          for (let i = 0; i < barGradientSteps; i++) {
            const intensity = i / (barGradientSteps - 1);
            
            // Convert hex colors to RGB
            const startColor = hexToRgb(customColors.bar_gradient_start);
            const endColor = hexToRgb(customColors.bar_gradient_end);
            
            const r = Math.floor(startColor.r + (endColor.r - startColor.r) * intensity);
            const g = Math.floor(startColor.g + (endColor.g - startColor.g) * intensity);
            const b = Math.floor(startColor.b + (endColor.b - startColor.b) * intensity);
            
            doc.setFillColor(r, g, b);
            doc.rect(i * barStepWidth, barY, barStepWidth, barHeight, 'F');
          }
        } else {
          // B&W version - lighter gray bar (half darkness)
          doc.setFillColor('#d1d5db');
          doc.rect(0, barY, 210, barHeight, 'F');
        }

        // Certificate title section - smaller width, perfectly centered
        const titleY = headerY + headerHeight + 17; // Reduced spacing by 15% (20 - 3 = 17)
        const buttonWidth = 80; // Reduced width for tighter fit
        const buttonHeight = 12; // Smaller height
        const buttonX = (210 - buttonWidth) / 2; // Center the button
        
        if (pdfVersion === 'colored') {
          // Lighter purple rounded rectangle background (no border, no shadow)
          doc.setFillColor('#d8b4fe'); // Lighter purple color
          doc.roundedRect(buttonX, titleY - 6, buttonWidth, buttonHeight, 2, 2, 'F');

          // Certificate title - perfectly centered in smaller button
          doc.setFontSize(12);
          doc.setTextColor('#ffffff'); // White text on purple background
          doc.setFont('helvetica', 'bold');
          const textCenterX = buttonX + (buttonWidth / 2); // Perfect center calculation
          const textCenterY = titleY - 6 + (buttonHeight / 2) + 2; // Perfect vertical center with offset
          doc.text('DETAILED MARKS CERTIFICATE', textCenterX, textCenterY, { align: 'center' });
        } else if (pdfVersion === 'custom' && customColors) {
          // Custom version - use table header colors for certificate title
          const titleBgColor = hexToRgb(customColors.table_header_background);
          doc.setFillColor(titleBgColor.r, titleBgColor.g, titleBgColor.b);
          doc.roundedRect(buttonX, titleY - 6, buttonWidth, buttonHeight, 2, 2, 'F');
          
          const titleBorderColor = hexToRgb(customColors.table_border);
          doc.setDrawColor(titleBorderColor.r, titleBorderColor.g, titleBorderColor.b);
          doc.setLineWidth(0.5);
          doc.roundedRect(buttonX, titleY - 6, buttonWidth, buttonHeight, 2, 2, 'S');

          // Certificate title - use table header text color
          doc.setFontSize(12);
          const titleTextColor = hexToRgb(customColors.table_header_text);
          doc.setTextColor(titleTextColor.r, titleTextColor.g, titleTextColor.b);
          doc.setFont('helvetica', 'bold');
          const textCenterX = buttonX + (buttonWidth / 2); // Perfect center calculation
          const textCenterY = titleY - 6 + (buttonHeight / 2) + 2; // Perfect vertical center with offset
          doc.text('DETAILED MARKS CERTIFICATE', textCenterX, textCenterY, { align: 'center' });
        } else {
          // B&W version - same accent color as header/footer
          doc.setFillColor('#d1d5db');
          doc.roundedRect(buttonX, titleY - 6, buttonWidth, buttonHeight, 2, 2, 'F');
          doc.setDrawColor('#9ca3af');
          doc.setLineWidth(0.5);
          doc.roundedRect(buttonX, titleY - 6, buttonWidth, buttonHeight, 2, 2, 'S');

          // Certificate title - dark text on accent background
          doc.setFontSize(12);
          doc.setTextColor('#1f2937');
          doc.setFont('helvetica', 'bold');
          const textCenterX = buttonX + (buttonWidth / 2); // Perfect center calculation
          const textCenterY = titleY - 6 + (buttonHeight / 2) + 2; // Perfect vertical center with offset
          doc.text('DETAILED MARKS CERTIFICATE', textCenterX, textCenterY, { align: 'center' });
        }

        // Examination details - separate text below button
        doc.setFontSize(11);
        if (pdfVersion === 'custom' && customColors) {
          const examTextColor = hexToRgb(customColors.details_text_color);
          doc.setTextColor(examTextColor.r, examTextColor.g, examTextColor.b);
        } else {
        doc.setTextColor(pdfVersion === 'colored' ? '#64748b' : '#374151'); // Dark gray text
        }
        doc.setFont('helvetica', 'normal');
        doc.text(dmc.examination, 105, titleY + 12, { align: 'center' });

        // Student image - positioned to the right of the DETAILED MARKS CERTIFICATE block (if enabled in config and image exists)
        if (dmcConfig?.include_student_photo && dmc.student_image) {
          const imageX = buttonX + buttonWidth + 16; // 16mm gap from the certificate title block (moved more right)
          const imageY = titleY - 10; // Moved up from the certificate title block
          const imageSize = 22; // 22mm square image for better proportion
          
          try {
            // Add the image directly (jsPDF doesn't support clipping well)
            doc.addImage(dmc.student_image, imageX, imageY, imageSize, imageSize, '', 'FAST');
          } catch (error) {
            // If image fails to load, don't render anything
          }
        }

        // Student information section - modern design like on-screen
        const studentY = titleY + 25;
        
        // Create individual rounded boxes for each field - on-screen vibe
        const boxWidth = 95; // Significantly increased width
        const boxHeight = 12; // Further reduced height
        const boxSpacing = 4; // Further reduced horizontal spacing
        const verticalSpacing = 3; // Further reduced vertical spacing
        
        // Center the student details section
        const totalDetailsWidth = (boxWidth * 2) + boxSpacing; // Total width of 2 boxes + spacing
        const startX = (210 - totalDetailsWidth) / 2; // Center on A4 page (210mm width)
        const startY = studentY - 5; // Adjusted for smaller boxes
        
        // Add subtle separator line before student details
        doc.setDrawColor('#f1f5f9'); // Very light gray
        doc.setLineWidth(0.3); // Very thin line
        doc.line(startX, startY - 5, startX + totalDetailsWidth, startY - 5);
        
        // Roll No box (top left)
        doc.setFillColor('#ffffff');
        doc.roundedRect(startX, startY, boxWidth, boxHeight, 1, 1, 'F');
        if (pdfVersion === 'custom' && customColors) {
          // Use border_color if available, otherwise fallback to table_header_background
          const borderColorValue = customColors.border_color || customColors.table_header_background || '#667eea';
          const borderColor = hexToRgb(borderColorValue);
          doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
        } else {
        doc.setDrawColor(pdfVersion === 'colored' ? '#e2e8f0' : '#374151');
        }
        doc.setLineWidth(0.5); // Lighter border
        doc.roundedRect(startX, startY, boxWidth, boxHeight, 1, 1, 'S');
        
        // Class box (top right)
        doc.setFillColor('#ffffff');
        doc.roundedRect(startX + boxWidth + boxSpacing, startY, boxWidth, boxHeight, 1, 1, 'F');
        if (pdfVersion === 'custom' && customColors) {
          // Use border_color if available, otherwise fallback to table_header_background
          const borderColorValue = customColors.border_color || customColors.table_header_background || '#667eea';
          const borderColor = hexToRgb(borderColorValue);
          doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
        } else {
        doc.setDrawColor(pdfVersion === 'colored' ? '#e2e8f0' : '#374151');
        }
        doc.setLineWidth(0.5); // Lighter border
        doc.roundedRect(startX + boxWidth + boxSpacing, startY, boxWidth, boxHeight, 1, 1, 'S');
        
        // Name box (bottom left)
        doc.setFillColor('#ffffff');
        doc.roundedRect(startX, startY + boxHeight + verticalSpacing, boxWidth, boxHeight, 1, 1, 'F');
        if (pdfVersion === 'custom' && customColors) {
          // Use border_color if available, otherwise fallback to table_header_background
          const borderColorValue = customColors.border_color || customColors.table_header_background || '#667eea';
          const borderColor = hexToRgb(borderColorValue);
          doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
        } else {
        doc.setDrawColor(pdfVersion === 'colored' ? '#e2e8f0' : '#374151');
        }
        doc.setLineWidth(0.5); // Lighter border
        doc.roundedRect(startX, startY + boxHeight + verticalSpacing, boxWidth, boxHeight, 1, 1, 'S');
        
        // Father's Name box (bottom right)
        doc.setFillColor('#ffffff');
        doc.roundedRect(startX + boxWidth + boxSpacing, startY + boxHeight + verticalSpacing, boxWidth, boxHeight, 1, 1, 'F');
        if (pdfVersion === 'custom' && customColors) {
          // Use border_color if available, otherwise fallback to table_header_background
          const borderColorValue = customColors.border_color || customColors.table_header_background || '#667eea';
          const borderColor = hexToRgb(borderColorValue);
          doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
        } else {
        doc.setDrawColor(pdfVersion === 'colored' ? '#e2e8f0' : '#374151');
        }
        doc.setLineWidth(0.5); // Lighter border
        doc.roundedRect(startX + boxWidth + boxSpacing, startY + boxHeight + verticalSpacing, boxWidth, boxHeight, 1, 1, 'S');

        // Student details in individual boxes
        doc.setFontSize(10); // Increased text size
        if (pdfVersion === 'custom' && customColors) {
          const detailsTextColor = hexToRgb(customColors.details_text_color);
          doc.setTextColor(detailsTextColor.r, detailsTextColor.g, detailsTextColor.b);
        } else {
        doc.setTextColor(pdfVersion === 'colored' ? '#1e293b' : '#1f2937');
        }
        
        // R. No - single line, centered vertically (top left)
        doc.setFont('helvetica', 'normal');
        doc.text('R. NO:', startX + 5, startY + 8);
        doc.setFontSize(11); // Larger font for database values
        doc.setFont('helvetica', 'bold');
        doc.text(dmc.roll_number, startX + 25, startY + 8);

        // Class - single line, centered vertically (top right)
        doc.setFontSize(10); // Reset to normal for label
        doc.setFont('helvetica', 'normal');
        doc.text('CLASS:', startX + boxWidth + boxSpacing + 5, startY + 8);
        doc.setFontSize(11); // Larger font for database values
        doc.setFont('helvetica', 'bold');
        doc.text(`${dmc.class}${dmc.section ? ` (${dmc.section})` : ''}`, startX + boxWidth + boxSpacing + 25, startY + 8);

        // Name - single line, centered vertically (bottom left)
        doc.setFontSize(10); // Reset to normal for label
        doc.setFont('helvetica', 'normal');
        doc.text('NAME:', startX + 5, startY + boxHeight + verticalSpacing + 8);
        doc.setFontSize(11); // Larger font for database values
        doc.setFont('helvetica', 'bold');
        doc.text(dmc.student_name, startX + 25, startY + boxHeight + verticalSpacing + 8);

        // Father's Name - single line, centered vertically (bottom right)
        doc.setFontSize(10); // Reset to normal for label
        doc.setFont('helvetica', 'normal');
        doc.text('F/NAME:', startX + boxWidth + boxSpacing + 5, startY + boxHeight + verticalSpacing + 8);
        doc.setFontSize(11); // Larger font for database values
        doc.setFont('helvetica', 'bold');
        doc.text(dmc.father_name, startX + boxWidth + boxSpacing + 25, startY + boxHeight + verticalSpacing + 8);


        // Marks table - positioned after student details with proper gap and width
        const detailsGridWidth = (boxWidth * 2) + boxSpacing; // Total width of details grid
        const detailsGridStartX = startX; // Start position of details grid
        const detailsGridEndY = startY + (boxHeight * 2) + verticalSpacing; // End of details grid
        const tableGap = 5; // Further reduced gap between details and table
        const tableY = detailsGridEndY + tableGap; // Table starts after gap
        const tableStartX = detailsGridStartX; // Table starts at same X as details
        const tableWidth = detailsGridWidth; // Table width matches details grid width
        
        // Prepare table data
        const tableData = [];
        
        // Add all subject rows with red circles for low marks and A
        dmc.subjects.forEach((subject, j) => {
          if (subject) {
            let marksDisplay = subject.obtained_marks;
            
            // Handle A/Absent marks properly
            if (subject.obtained_marks === 'A' || subject.obtained_marks === 'Absent') {
              marksDisplay = 'A';
            } else {
              marksDisplay = subject.obtained_marks.toString();
            }
            
            tableData.push([
              (j + 1).toString(),
              subject.name,
              subject.total_marks.toString(),
              marksDisplay
            ]);
          }
        });
        
        // Ensure minimum 10 rows by adding empty rows if needed
        const minRows = 10;
        const currentRows = tableData.length;
        
        if (currentRows < minRows) {
          const emptyRowsNeeded = minRows - currentRows;
          for (let i = 0; i < emptyRowsNeeded; i++) {
            tableData.push([
              '', // No numbering for empty rows
              '',
              '',
              ''
            ]);
          }
        }
        
        // Add total row
        const showGradeInTotal = dmcConfig?.include_teacher_signature && dmcConfig?.include_grade;
        
        if (showGradeInTotal) {
          // Show grade with obtained marks in Total Marks row
          tableData.push([
            '',
            'Total Marks:',
            dmc.total_marks.toString(),
            `${dmc.obtained_marks} - ${dmc.grade}`
          ]);
        } else {
          // Standard total marks display
        tableData.push([
          '',
          'Total Marks:',
          dmc.total_marks.toString(),
          dmc.obtained_marks.toString()
        ]);
        }

        // Create the table with clean styling - positioned after details grid
        autoTable(doc, {
          startY: tableY,
          margin: { left: tableStartX, right: 210 - tableStartX - tableWidth },
          tableWidth: 'wrap',
          head: [['S. No', 'SUBJECTS', 'TOTAL MARKS', 'MARKS OBTAINED']],
          body: tableData,
          styles: {
            fontSize: 11,
            cellPadding: 3,
            lineColor: pdfVersion === 'custom' && customColors ? 
              `${customColors.table_header_background}` : 
              (pdfVersion === 'colored' ? '#e2e8f0' : '#374151'),
            lineWidth: 0.5,
            textColor: pdfVersion === 'custom' && customColors ? 
              `${customColors.table_text_color}` : 
              (pdfVersion === 'colored' ? '#1e293b' : '#1f2937'),
            fillColor: '#ffffff'
          },
          headStyles: {
            fillColor: pdfVersion === 'custom' && customColors ? 
              `${customColors.table_header_background}` : 
              (pdfVersion === 'colored' ? '#d8b4fe' : '#d1d5db'),
            textColor: pdfVersion === 'custom' && customColors ? 
              `${customColors.table_header_text}` : 
              (pdfVersion === 'colored' ? '#ffffff' : '#1f2937'),
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center'
          },
          alternateRowStyles: {
            fillColor: pdfVersion === 'custom' && customColors ? 
              lightenColor(customColors.table_header_background, 0.85) : 
              (pdfVersion === 'colored' ? '#f3e8ff' : '#f1f5f9')
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 20 },
            1: { halign: 'left', cellWidth: 94 },
            2: { halign: 'center', cellWidth: 40 },
            3: { halign: 'center', cellWidth: 40 }
          },
          didDrawCell: (data: any) => {
            // Custom drawing for marks column (column 3) with red outline circles
            if (data.column.index === 3 && data.cell.raw) {
              const marks = data.cell.raw;
              const cell = data.cell;
              
              // Get the corresponding subject data to calculate percentage
              const rowIndex = data.row.index;
              const subject = dmc.subjects[rowIndex];
              
              let needsRedCircle = false;
              
              if (marks === 'A' || marks === 'Absent') {
                needsRedCircle = true;
              } else if (subject && typeof marks === 'string' && !isNaN(parseInt(marks))) {
                const obtainedMarks = parseInt(marks);
                const totalMarks = subject.total_marks;
                const percentage = (obtainedMarks / totalMarks) * 100;
                const passingMarks = selectedExamination?.passing_marks || 40;
                needsRedCircle = percentage < passingMarks;
              }
              
               if (needsRedCircle) {
                 // Let autoTable draw the marks normally, then just add the circle outline
                 const centerX = cell.x + cell.width / 2;
                 const centerY = cell.y + cell.height / 2;
                 const radius = 4; // Much smaller radius
                 
                 // Draw only the circle outline (no fill, no text)
                 doc.setDrawColor(pdfVersion === 'colored' ? '#dc2626' : '#374151');
                 doc.setLineWidth(0.5); // Thinner outline
                 doc.circle(centerX, centerY, radius, 'S'); // 'S' means stroke only, no fill
                 
                 // Don't return true - let autoTable handle the marks
                 return false;
               }
            }
            
            // Bold styling for total marks row (row index 10)
            if (data.row.index === 10) {
              const cell = data.cell;
              const text = data.cell.raw;
              
              // Add background color based on version (same as alternate rows)
              if (pdfVersion === 'custom' && customColors) {
                const lighterHeaderColor = hexToRgb(lightenColor(customColors.table_header_background, 0.85));
                doc.setFillColor(lighterHeaderColor.r, lighterHeaderColor.g, lighterHeaderColor.b);
              } else {
                doc.setFillColor(pdfVersion === 'colored' ? '#f3e8ff' : '#f1f5f9');
              }
              doc.rect(cell.x, cell.y, cell.width, cell.height, 'F');
              
              // Add same borders as other rows
              if (pdfVersion === 'custom' && customColors) {
                const headerColor = hexToRgb(customColors.table_header_background);
                doc.setDrawColor(headerColor.r, headerColor.g, headerColor.b);
              } else {
                doc.setDrawColor(pdfVersion === 'colored' ? '#e2e8f0' : '#374151');
              }
              doc.setLineWidth(0.5);
              doc.rect(cell.x, cell.y, cell.width, cell.height, 'S');
              
              // Draw bold text with same font size as other rows
              if (pdfVersion === 'custom' && customColors) {
                const textColor = hexToRgb(customColors.table_text_color);
                doc.setTextColor(textColor.r, textColor.g, textColor.b);
              } else {
                doc.setTextColor(pdfVersion === 'colored' ? '#1e293b' : '#1f2937');
              }
              doc.setFontSize(11); // Same size as other rows
              doc.setFont('helvetica', 'bold');
              doc.text(text, cell.x + cell.width / 2, cell.y + cell.height / 2, { align: 'center', baseline: 'middle' });
              
              // Return true to prevent autoTable from drawing the cell content
              return true;
            }
          }
        });


        // Professional 2-Column Summary Section
        const finalY = (doc as any).lastAutoTable.finalY + 3;
        const summaryY = finalY + 2;
        
        // Center the entire summary section
        const totalSectionWidth = 170; // Total width of both columns
        const sectionStartX = (210 - totalSectionWidth) / 2; // Center on A4 page (210mm width)
        
        // Left Column: Signature Field (Examiner only)
        const leftColumnX = sectionStartX;
        const signatureBoxWidth = 75;
        const signatureBoxHeight = 18; // Match summary box height
        
        // Examiner Signature Field (no border, just line and text)
        const examinerY = summaryY;
        
        // Calculate position to align with second row of summary cards
        const secondRowY = summaryY + 18 + 5;
        
        // Stamp and Signature Box (spans both rows in left column)
        const stampBoxX = leftColumnX;
        const stampBoxWidth = signatureBoxWidth;
        const stampBoxY = summaryY; // Start from top row
        const stampBoxHeight = (18 * 2) + 5; // Height of both rows plus gap
        
        // Draw the box background
        if (pdfVersion === 'custom' && customColors) {
          const summaryBgColor = hexToRgb(customColors.summary_background);
          doc.setFillColor(summaryBgColor.r, summaryBgColor.g, summaryBgColor.b);
        } else {
          doc.setFillColor(pdfVersion === 'colored' ? '#f3e8ff' : '#f9fafb');
        }
        doc.roundedRect(stampBoxX, stampBoxY, stampBoxWidth, stampBoxHeight, 2, 2);
        
        // Draw the box border
        if (pdfVersion === 'custom' && customColors) {
          // Use border_color if available, otherwise fallback to summary_border or table_header_background
          const borderColorValue = customColors.border_color || customColors.summary_border || customColors.table_header_background || '#667eea';
          const summaryBorderColor = hexToRgb(borderColorValue);
          doc.setDrawColor(summaryBorderColor.r, summaryBorderColor.g, summaryBorderColor.b);
        } else {
          doc.setDrawColor(pdfVersion === 'colored' ? '#e5e7eb' : '#374151');
        }
        doc.setLineWidth(0.5);
        doc.roundedRect(stampBoxX, stampBoxY, stampBoxWidth, stampBoxHeight, 2, 2);
        
        // Add "Stamp and Signature" text
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        if (pdfVersion === 'custom' && customColors) {
          const summaryLabelColor = hexToRgb(customColors.summary_label_color);
          doc.setTextColor(summaryLabelColor.r, summaryLabelColor.g, summaryLabelColor.b);
        } else {
        doc.setTextColor(pdfVersion === 'colored' ? '#6b7280' : '#374151');
        }
        // Add "Principal Stamp" text at the bottom of the box
        const textY = stampBoxY + stampBoxHeight - 5; // Position at bottom with 5px margin
        doc.text('PRINCIPAL STAMP', stampBoxX + stampBoxWidth/2, textY, { align: 'center' });
        
        // Right Column: 2x2 Grid of Summary Boxes
        const rightColumnX = sectionStartX + signatureBoxWidth + 10; // 10mm gap between columns
        const rightColumnWidth = 80;
        const summaryBoxWidth = 40;
        
        // Row 1: Position and Percentage
        const row1Y = summaryY;
        
        // Position Box (Top Left)
        if (pdfVersion === 'custom' && customColors) {
          const summaryBgColor = hexToRgb(customColors.summary_background);
          doc.setFillColor(summaryBgColor.r, summaryBgColor.g, summaryBgColor.b);
        } else {
        doc.setFillColor(pdfVersion === 'colored' ? '#f3e8ff' : '#f9fafb');
        }
        doc.roundedRect(rightColumnX, row1Y, summaryBoxWidth, 18, 2, 2);
        if (pdfVersion === 'custom' && customColors) {
          const borderColor = hexToRgb(customColors.border_color);
          doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
        } else {
        doc.setDrawColor(pdfVersion === 'colored' ? '#e5e7eb' : '#374151');
        }
        doc.setLineWidth(0.5);
        doc.roundedRect(rightColumnX, row1Y, summaryBoxWidth, 18, 2, 2);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        if (pdfVersion === 'custom' && customColors) {
          const summaryLabelColor = hexToRgb(customColors.summary_label_color);
          doc.setTextColor(summaryLabelColor.r, summaryLabelColor.g, summaryLabelColor.b);
        } else {
        doc.setTextColor(pdfVersion === 'colored' ? '#6b7280' : '#374151');
        }
        doc.text('POSITION', rightColumnX + summaryBoxWidth/2, row1Y + 5, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        if (pdfVersion === 'custom' && customColors) {
          const summaryTextColor = hexToRgb(customColors.summary_text_color);
          doc.setTextColor(summaryTextColor.r, summaryTextColor.g, summaryTextColor.b);
        } else {
        doc.setTextColor(pdfVersion === 'colored' ? '#1e293b' : '#1f2937');
        }
        doc.text(getPositionSuffix(dmc.position), rightColumnX + summaryBoxWidth/2, row1Y + 13, { align: 'center' });
        
        // Percentage Box (Top Right)
        const percentageX = rightColumnX + summaryBoxWidth + 5;
        if (pdfVersion === 'custom' && customColors) {
          const summaryBgColor = hexToRgb(customColors.summary_background);
          doc.setFillColor(summaryBgColor.r, summaryBgColor.g, summaryBgColor.b);
        } else {
        doc.setFillColor(pdfVersion === 'colored' ? '#f3e8ff' : '#f9fafb');
        }
        doc.roundedRect(percentageX, row1Y, summaryBoxWidth, 18, 2, 2);
        if (pdfVersion === 'custom' && customColors) {
          const borderColor = hexToRgb(customColors.border_color);
          doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
        } else {
        doc.setDrawColor(pdfVersion === 'colored' ? '#e5e7eb' : '#374151');
        }
        doc.setLineWidth(0.5);
        doc.roundedRect(percentageX, row1Y, summaryBoxWidth, 18, 2, 2);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        if (pdfVersion === 'custom' && customColors) {
          const summaryLabelColor = hexToRgb(customColors.summary_label_color);
          doc.setTextColor(summaryLabelColor.r, summaryLabelColor.g, summaryLabelColor.b);
        } else {
        doc.setTextColor(pdfVersion === 'colored' ? '#6b7280' : '#374151');
        }
        doc.text('PERCENTAGE', percentageX + summaryBoxWidth/2, row1Y + 5, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        
        // Color code percentage based on value and version
        const percentage = dmc.percentage;
        if (pdfVersion === 'custom' && customColors) {
          // Use custom performance colors
          if (percentage >= 90) {
            const excellentColor = hexToRgb(customColors.excellent_color);
            doc.setTextColor(excellentColor.r, excellentColor.g, excellentColor.b);
          } else if (percentage >= 80) {
            const goodColor = hexToRgb(customColors.good_color);
            doc.setTextColor(goodColor.r, goodColor.g, goodColor.b);
          } else if (percentage >= 70) {
            const averageColor = hexToRgb(customColors.average_color);
            doc.setTextColor(averageColor.r, averageColor.g, averageColor.b);
          } else {
            const poorColor = hexToRgb(customColors.poor_color);
            doc.setTextColor(poorColor.r, poorColor.g, poorColor.b);
          }
        } else if (pdfVersion === 'colored') {
          if (percentage >= 90) {
            doc.setTextColor('#059669'); // Green for excellent (90%+)
          } else if (percentage >= 80) {
            doc.setTextColor('#d97706'); // Orange for good (80-89%)
          } else if (percentage >= 70) {
            doc.setTextColor('#dc2626'); // Red for poor (70-79%)
          } else {
            doc.setTextColor('#991b1b'); // Dark red for very poor (<70%)
          }
        } else {
          // B&W version - use solid dark color like other summary details
          doc.setTextColor('#1f2937'); // Dark gray - same as other summary values
        }
        
        doc.text(`${percentage.toFixed(1)}%`, percentageX + summaryBoxWidth/2, row1Y + 13, { align: 'center' });
        
        // Row 2: Conditional layout based on teacher signature setting
        const row2Y = row1Y + 18 + 5;
        const showTeacherSignature = dmcConfig?.include_teacher_signature;
        
        if (showTeacherSignature) {
          // 3-box layout: Position, Percentage, Teacher Signature
          // Teacher Signature Box (spans both columns)
          const teacherSignatureX = rightColumnX;
          const teacherSignatureWidth = (summaryBoxWidth * 2) + 5; // Width of both boxes plus gap
          
          if (pdfVersion === 'custom' && customColors) {
            const summaryBgColor = hexToRgb(customColors.summary_background);
            doc.setFillColor(summaryBgColor.r, summaryBgColor.g, summaryBgColor.b);
          } else {
            doc.setFillColor(pdfVersion === 'colored' ? '#f3e8ff' : '#f9fafb');
          }
          doc.roundedRect(teacherSignatureX, row2Y, teacherSignatureWidth, 18, 2, 2);
          if (pdfVersion === 'custom' && customColors) {
            // Use border_color if available, otherwise fallback to summary_border or table_header_background
            const borderColorValue = customColors.border_color || customColors.summary_border || customColors.table_header_background || '#667eea';
            const summaryBorderColor = hexToRgb(borderColorValue);
            doc.setDrawColor(summaryBorderColor.r, summaryBorderColor.g, summaryBorderColor.b);
          } else {
            doc.setDrawColor(pdfVersion === 'colored' ? '#e5e7eb' : '#374151');
          }
          doc.setLineWidth(0.5);
          doc.roundedRect(teacherSignatureX, row2Y, teacherSignatureWidth, 18, 2, 2);
          
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          if (pdfVersion === 'custom' && customColors) {
            const summaryLabelColor = hexToRgb(customColors.summary_label_color);
            doc.setTextColor(summaryLabelColor.r, summaryLabelColor.g, summaryLabelColor.b);
          } else {
            doc.setTextColor(pdfVersion === 'colored' ? '#6b7280' : '#374151');
          }
          doc.text('TEACHER SIGNATURE', teacherSignatureX + teacherSignatureWidth/2, row2Y + 5, { align: 'center' });
        } else {
          // Conditional layout based on Grade and Attendance settings
          const includeGrade = dmcConfig?.include_grade;
          const includeAttendance = dmcConfig?.include_attendance_percentage;
          
          if (includeGrade && includeAttendance) {
            // 4-box layout: Position, Percentage, Grade, Attendance
        // Grade Box (Bottom Left)
        if (pdfVersion === 'custom' && customColors) {
          const summaryBgColor = hexToRgb(customColors.summary_background);
          doc.setFillColor(summaryBgColor.r, summaryBgColor.g, summaryBgColor.b);
        } else {
        doc.setFillColor(pdfVersion === 'colored' ? '#f3e8ff' : '#f9fafb');
        }
        doc.roundedRect(rightColumnX, row2Y, summaryBoxWidth, 18, 2, 2);
        if (pdfVersion === 'custom' && customColors) {
          // Use border_color if available, otherwise fallback to summary_border or table_header_background
          const borderColorValue = customColors.border_color || customColors.summary_border || customColors.table_header_background || '#667eea';
          const summaryBorderColor = hexToRgb(borderColorValue);
          doc.setDrawColor(summaryBorderColor.r, summaryBorderColor.g, summaryBorderColor.b);
        } else {
        doc.setDrawColor(pdfVersion === 'colored' ? '#e5e7eb' : '#374151');
        }
        doc.setLineWidth(0.5);
        doc.roundedRect(rightColumnX, row2Y, summaryBoxWidth, 18, 2, 2);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        if (pdfVersion === 'custom' && customColors) {
          const summaryLabelColor = hexToRgb(customColors.summary_label_color);
          doc.setTextColor(summaryLabelColor.r, summaryLabelColor.g, summaryLabelColor.b);
        } else {
        doc.setTextColor(pdfVersion === 'colored' ? '#6b7280' : '#374151');
        }
        doc.text('GRADE', rightColumnX + summaryBoxWidth/2, row2Y + 5, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        if (pdfVersion === 'custom' && customColors) {
          const summaryTextColor = hexToRgb(customColors.summary_text_color);
          doc.setTextColor(summaryTextColor.r, summaryTextColor.g, summaryTextColor.b);
        } else {
        doc.setTextColor(pdfVersion === 'colored' ? '#1e293b' : '#1f2937');
        }
        doc.text(dmc.grade, rightColumnX + summaryBoxWidth/2, row2Y + 13, { align: 'center' });
        
        // Attendance Box (Bottom Right)
        if (pdfVersion === 'custom' && customColors) {
          const summaryBgColor = hexToRgb(customColors.summary_background);
          doc.setFillColor(summaryBgColor.r, summaryBgColor.g, summaryBgColor.b);
        } else {
        doc.setFillColor(pdfVersion === 'colored' ? '#f3e8ff' : '#f9fafb');
        }
        doc.roundedRect(percentageX, row2Y, summaryBoxWidth, 18, 2, 2);
        if (pdfVersion === 'custom' && customColors) {
          // Use border_color if available, otherwise fallback to summary_border or table_header_background
          const borderColorValue = customColors.border_color || customColors.summary_border || customColors.table_header_background || '#667eea';
          const summaryBorderColor = hexToRgb(borderColorValue);
          doc.setDrawColor(summaryBorderColor.r, summaryBorderColor.g, summaryBorderColor.b);
        } else {
        doc.setDrawColor(pdfVersion === 'colored' ? '#e5e7eb' : '#374151');
        }
        doc.setLineWidth(0.5);
        doc.roundedRect(percentageX, row2Y, summaryBoxWidth, 18, 2, 2);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        if (pdfVersion === 'custom' && customColors) {
          const summaryLabelColor = hexToRgb(customColors.summary_label_color);
          doc.setTextColor(summaryLabelColor.r, summaryLabelColor.g, summaryLabelColor.b);
        } else {
        doc.setTextColor(pdfVersion === 'colored' ? '#6b7280' : '#374151');
        }
        doc.text('ATTENDANCE', percentageX + summaryBoxWidth/2, row2Y + 5, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        
        // Calculate attendance percentage from student's attendance records (filtered by examination end date)
        const attendancePercentage = await calculateStudentAttendancePercentage(dmc.student_id, selectedExamination?.end_date);
        
        // Color code based on percentage and version
        if (pdfVersion === 'custom' && customColors) {
          // Use custom performance colors
          if (attendancePercentage >= 90) {
            const excellentColor = hexToRgb(customColors.excellent_color);
            doc.setTextColor(excellentColor.r, excellentColor.g, excellentColor.b);
          } else if (attendancePercentage >= 80) {
            const goodColor = hexToRgb(customColors.good_color);
            doc.setTextColor(goodColor.r, goodColor.g, goodColor.b);
          } else if (attendancePercentage >= 70) {
            const averageColor = hexToRgb(customColors.average_color);
            doc.setTextColor(averageColor.r, averageColor.g, averageColor.b);
          } else {
            const poorColor = hexToRgb(customColors.poor_color);
            doc.setTextColor(poorColor.r, poorColor.g, poorColor.b);
          }
        } else if (pdfVersion === 'colored') {
          if (attendancePercentage >= 90) {
            doc.setTextColor('#059669'); // Green for excellent attendance (90%+)
          } else if (attendancePercentage >= 80) {
            doc.setTextColor('#d97706'); // Orange for good attendance (80-89%)
          } else if (attendancePercentage >= 70) {
            doc.setTextColor('#dc2626'); // Red for poor attendance (70-79%)
          } else {
            doc.setTextColor('#991b1b'); // Dark red for very poor attendance (<70%)
          }
        } else {
          // B&W version - use different shades of gray
          if (attendancePercentage >= 90) {
            doc.setTextColor('#1f2937'); // Dark gray for excellent attendance (90%+)
          } else if (attendancePercentage >= 80) {
            doc.setTextColor('#374151'); // Medium dark gray for good attendance (80-89%)
          } else if (attendancePercentage >= 70) {
            doc.setTextColor('#6b7280'); // Medium gray for poor attendance (70-79%)
          } else {
            doc.setTextColor('#9ca3af'); // Light gray for very poor attendance (<70%)
          }
        }
        
        doc.text(`${attendancePercentage}%`, percentageX + summaryBoxWidth/2, row2Y + 13, { align: 'center' });
          } else if (includeGrade && !includeAttendance) {
            // 3-box layout: Position, Percentage, Grade (spans both columns)
            const gradeX = rightColumnX;
            const gradeWidth = (summaryBoxWidth * 2) + 5; // Width of both boxes plus gap
            
            if (pdfVersion === 'custom' && customColors) {
              const summaryBgColor = hexToRgb(customColors.summary_background);
              doc.setFillColor(summaryBgColor.r, summaryBgColor.g, summaryBgColor.b);
            } else {
              doc.setFillColor(pdfVersion === 'colored' ? '#f3e8ff' : '#f9fafb');
            }
            doc.roundedRect(gradeX, row2Y, gradeWidth, 18, 2, 2);
            if (pdfVersion === 'custom' && customColors) {
              const summaryBorderColor = hexToRgb(customColors.summary_border);
              doc.setDrawColor(summaryBorderColor.r, summaryBorderColor.g, summaryBorderColor.b);
            } else {
              doc.setDrawColor(pdfVersion === 'colored' ? '#e5e7eb' : '#374151');
            }
            doc.setLineWidth(0.5);
            doc.roundedRect(gradeX, row2Y, gradeWidth, 18, 2, 2);
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            if (pdfVersion === 'custom' && customColors) {
              const summaryLabelColor = hexToRgb(customColors.summary_label_color);
              doc.setTextColor(summaryLabelColor.r, summaryLabelColor.g, summaryLabelColor.b);
            } else {
              doc.setTextColor(pdfVersion === 'colored' ? '#6b7280' : '#374151');
            }
            doc.text('GRADE', gradeX + gradeWidth/2, row2Y + 5, { align: 'center' });
            
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            if (pdfVersion === 'custom' && customColors) {
              const summaryTextColor = hexToRgb(customColors.summary_text_color);
              doc.setTextColor(summaryTextColor.r, summaryTextColor.g, summaryTextColor.b);
            } else {
              doc.setTextColor(pdfVersion === 'colored' ? '#1e293b' : '#1f2937');
            }
            doc.text(dmc.grade, gradeX + gradeWidth/2, row2Y + 13, { align: 'center' });
          } else if (!includeGrade && includeAttendance) {
            // 3-box layout: Position, Percentage, Attendance (spans both columns)
            const attendanceX = rightColumnX;
            const attendanceWidth = (summaryBoxWidth * 2) + 5; // Width of both boxes plus gap
            
            if (pdfVersion === 'custom' && customColors) {
              const summaryBgColor = hexToRgb(customColors.summary_background);
              doc.setFillColor(summaryBgColor.r, summaryBgColor.g, summaryBgColor.b);
            } else {
              doc.setFillColor(pdfVersion === 'colored' ? '#f3e8ff' : '#f9fafb');
            }
            doc.roundedRect(attendanceX, row2Y, attendanceWidth, 18, 2, 2);
            if (pdfVersion === 'custom' && customColors) {
              const summaryBorderColor = hexToRgb(customColors.summary_border);
              doc.setDrawColor(summaryBorderColor.r, summaryBorderColor.g, summaryBorderColor.b);
            } else {
              doc.setDrawColor(pdfVersion === 'colored' ? '#e5e7eb' : '#374151');
            }
            doc.setLineWidth(0.5);
            doc.roundedRect(attendanceX, row2Y, attendanceWidth, 18, 2, 2);
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            if (pdfVersion === 'custom' && customColors) {
              const summaryLabelColor = hexToRgb(customColors.summary_label_color);
              doc.setTextColor(summaryLabelColor.r, summaryLabelColor.g, summaryLabelColor.b);
            } else {
              doc.setTextColor(pdfVersion === 'colored' ? '#6b7280' : '#374151');
            }
            doc.text('ATTENDANCE', attendanceX + attendanceWidth/2, row2Y + 5, { align: 'center' });
            
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            
            // Calculate attendance percentage from student's attendance records (filtered by examination end date)
            const attendancePercentage = await calculateStudentAttendancePercentage(dmc.student_id, selectedExamination?.end_date);
            
            // Color code based on percentage and version
            if (pdfVersion === 'custom' && customColors) {
              // Use custom performance colors
              if (attendancePercentage >= 90) {
                const excellentColor = hexToRgb(customColors.excellent_color);
                doc.setTextColor(excellentColor.r, excellentColor.g, excellentColor.b);
              } else if (attendancePercentage >= 80) {
                const goodColor = hexToRgb(customColors.good_color);
                doc.setTextColor(goodColor.r, goodColor.g, goodColor.b);
              } else if (attendancePercentage >= 70) {
                const averageColor = hexToRgb(customColors.average_color);
                doc.setTextColor(averageColor.r, averageColor.g, averageColor.b);
              } else {
                const poorColor = hexToRgb(customColors.poor_color);
                doc.setTextColor(poorColor.r, poorColor.g, poorColor.b);
              }
            } else if (pdfVersion === 'colored') {
              if (attendancePercentage >= 90) {
                doc.setTextColor('#059669'); // Green for excellent attendance (90%+)
              } else if (attendancePercentage >= 80) {
                doc.setTextColor('#d97706'); // Orange for good attendance (80-89%)
              } else if (attendancePercentage >= 70) {
                doc.setTextColor('#dc2626'); // Red for poor attendance (70-79%)
              } else {
                doc.setTextColor('#991b1b'); // Dark red for very poor attendance (<70%)
              }
            } else {
              // B&W version - use different shades of gray
              if (attendancePercentage >= 90) {
                doc.setTextColor('#1f2937'); // Dark gray for excellent attendance (90%+)
              } else if (attendancePercentage >= 80) {
                doc.setTextColor('#374151'); // Medium dark gray for good attendance (80-89%)
              } else if (attendancePercentage >= 70) {
                doc.setTextColor('#6b7280'); // Medium gray for poor attendance (70-79%)
              } else {
                doc.setTextColor('#9ca3af'); // Light gray for very poor attendance (<70%)
              }
            }
            
            doc.text(`${attendancePercentage}%`, attendanceX + attendanceWidth/2, row2Y + 13, { align: 'center' });
          }
          // If neither Grade nor Attendance is enabled, show nothing in row 2
        }

        // Footer accent bar (colored or B&W) - positioned at bottom of page
        const footerY = 290;
        const footerHeight = 7;
        
        if (pdfVersion === 'colored') {
          // Create gradient effect matching header - same colors and direction
          const footerGradientSteps = 50; // Same as header
          const footerStepWidth = 210 / footerGradientSteps; // Horizontal gradient like header
          
          for (let i = 0; i < footerGradientSteps; i++) {
            // Create smooth horizontal gradient from left purple to right pink (same as header)
            const intensity = i / (footerGradientSteps - 1); // 0 to 1 from left to right
            
            // Start with deep purple (#667eea) and transition to bright pink (#f093fb) - EXACT same as header
            const r = Math.floor(102 + (240 - 102) * intensity);
            const g = Math.floor(126 + (147 - 126) * intensity);
            const b = Math.floor(234 + (251 - 234) * intensity);
            
            doc.setFillColor(r, g, b);
            doc.rect(i * footerStepWidth, footerY, footerStepWidth, footerHeight, 'F');
          }
        } else if (pdfVersion === 'custom' && customColors) {
          // Custom version - use configured footer colors
          const footerGradientSteps = 50;
          const footerStepWidth = 210 / footerGradientSteps;
          
          for (let i = 0; i < footerGradientSteps; i++) {
            const intensity = i / (footerGradientSteps - 1);
            
            // Convert hex colors to RGB
            const startColor = hexToRgb(customColors.footer_gradient_start);
            const endColor = hexToRgb(customColors.footer_gradient_end);
            
            const r = Math.floor(startColor.r + (endColor.r - startColor.r) * intensity);
            const g = Math.floor(startColor.g + (endColor.g - startColor.g) * intensity);
            const b = Math.floor(startColor.b + (endColor.b - startColor.b) * intensity);
            
            doc.setFillColor(r, g, b);
            doc.rect(i * footerStepWidth, footerY, footerStepWidth, footerHeight, 'F');
          }
        } else {
          // B&W version - lighter gray footer bar (half darkness)
          doc.setFillColor('#d1d5db');
          doc.rect(0, footerY, 210, footerHeight, 'F');
        }
      }

      // Check if it's a mobile device
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Show immediate feedback for mobile users
      if (isMobileDevice) {
        toast.success('Generating PDF for mobile... Please wait.', { id: 'pdf-export' });
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
      const versionSuffix = pdfVersion === 'colored' ? 'Colored' : pdfVersion === 'custom' ? 'Custom' : 'B&W';
      const sectionPart = selectedSection ? `(${selectedSection.name})` : '';
      const fileName = `DMC_${selectedClass?.name}${sectionPart}_${selectedExamination?.name}_${versionSuffix}_${new Date().toLocaleDateString('en-GB')}.pdf`;
      
      if (isMobileDevice) {
        // For mobile devices, use Capacitor Filesystem API approach
        try {
          // Generate PDF as base64 string
          const pdfBase64 = doc.output('datauristring').split(',')[1];
          
          // Create unique filename with timestamp to prevent overwriting
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const mobileFileName = `dmc-${timestamp}.pdf`;

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
              toast.success(`PDF saved successfully as ${mobileFileName}`, { id: 'pdf-export' });
              
              // Trigger native Android "Open with" dialog by opening the file URI
              // This will show the native Android app chooser dialog
              window.open(uriResult.uri, '_blank');
              
            } catch (fsError) {
              // If filesystem fails, fallback to regular download
              doc.save(mobileFileName);
              toast.success('PDF downloaded successfully!', { id: 'pdf-export' });
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
                <p style="margin: 0 0 15px 0; color: #666;">Detailed Marks Certificate</p>
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
              
              toast.success(`PDF ready! Click the download button that appeared on screen.`, { id: 'pdf-export' });
              
            } catch (webError) {
              
              // Final fallback: Open PDF in new tab with data URI
              const pdfDataUri = doc.output('datauristring');
              const newWindow = window.open('', '_blank');
              if (newWindow) {
                newWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>DMC PDF</title>
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
                          <h2>📄 DMC PDF Generated</h2>
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
                toast.success(`PDF opened in new tab. Use the download button in the new tab.`, { id: 'pdf-export' });
              } else {
                toast.error('Please allow popups for this site to download the PDF', { id: 'pdf-export' });
              }
            }
          }
        } catch (error) {
          toast.error('Failed to export PDF on mobile. Please try on desktop.', { id: 'pdf-export' });
        }
      } else {
        // For desktop, use the standard approach
        doc.save(fileName);
        const versionName = pdfVersion === 'colored' ? 'Colored' : pdfVersion === 'custom' ? 'Custom' : 'B&W';
        toast.success(`${versionName} PDF exported successfully with ${allDmcData.length} DMCs!`, { id: 'pdf-export' });
      }

    } catch (error) {
      toast.error('Failed to generate PDF', { id: 'pdf-export' });
    } finally {
      setPdfProgress(100);
      setTimeout(() => {
        setPdfLoading(false);
        setPdfProgress(0);
      }, 300);
    }
  };


  return (
    <PageContainer theme={theme}>
      <Header>
        <HeaderTopRow>
          <Title>
            <AssessmentIcon style={{ fontSize: 20 }} />
            Detailed Marks Certificate
          </Title>
          
          {/* Mobile PDF Button - only visible on mobile */}
          {dmcData && (
          <MobilePdfButton
            onClick={handleExportPDF}
              disabled={loading || pdfLoading || !dmcData}
            title="Generate DMC PDF"
          >
            {pdfLoading ? (
              <CircularProgress size={16} />
            ) : (
              <PictureAsPdf style={{ fontSize: 18 }} />
            )}
          </MobilePdfButton>
          )}
          
          {/* Desktop layout - all fields in one row */}
          <DesktopSegmentedGroup>
            <SegmentedGroup>
              <SegmentedSelect
                value={selectedExamination?.id || ''}
                onChange={(e) => {
                  const exam = examinations.find(ex => ex.id === Number(e.target.value));
                  setSelectedExamination(exam || null);
                  // Reset class and section when exam changes
                  setSelectedClass(null);
                  setSelectedSection(null);
                }}
                disabled={loading}
                style={{ minWidth: 120 }}
                first
              >
                <option value="">Select Examination</option>
                {examinations.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name} ({(exam as any).exam_type?.replace('_', ' ').toUpperCase() || 'EXAM'})
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
                disabled={loading || !selectedExamination}
                style={{ minWidth: 120 }}
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
                  disabled={loading || !selectedClass}
                  style={{ minWidth: 120 }}
                >
                  <option value="">All Sections</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </SegmentedSelect>
              )}
              
              {dmcData && (
                    <SegmentedButton
                      onClick={handleExportPDF}
                      disabled={loading || !dmcData || pdfLoading}
                  last
                    >
                      <ButtonContent>
                        {pdfLoading ? (
                          <>
                            <CircularProgress size={16} />
                            <span style={{ marginLeft: '8px' }}>Generating PDF...</span>
                          </>
                        ) : (
                          <>
                            <PictureAsPdf style={{ fontSize: 16 }} />
                            <span style={{ marginLeft: '8px' }}>PDF</span>
                          </>
                        )}
                        {pdfLoading && <ProgressBar $progress={pdfProgress} />}
                      </ButtonContent>
                    </SegmentedButton>
              )}
            </SegmentedGroup>
          </DesktopSegmentedGroup>
        </HeaderTopRow>

        <HeaderBottomRow>
          {/* Mobile layout - all three dropdowns in one connected segmented group */}
          <MobileHeaderLayout>
            <MobileRow>
              <SegmentedGroup>
                <SegmentedSelect
                  value={selectedExamination?.id || ''}
                  onChange={(e) => {
                    const exam = examinations.find(ex => ex.id === Number(e.target.value));
                    setSelectedExamination(exam || null);
                    // Reset class and section when exam changes
                    setSelectedClass(null);
                    setSelectedSection(null);
                  }}
                  disabled={loading}
                  style={{ flex: '1', minWidth: 0 }}
                  first
                >
                  <option value="">Select Examination</option>
                  {examinations.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.name} ({(exam as any).exam_type?.replace('_', ' ').toUpperCase() || 'EXAM'})
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
                  disabled={loading || !selectedExamination}
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
                    disabled={loading || !selectedClass}
                    style={{ flex: '0.5', minWidth: 0 }}
                    last
                  >
                    <option value="">All Sections</option>
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

      <MainContent>
        {loading && (
          <LoadingContainer>
            Loading Detailed Marks Certificate...
          </LoadingContainer>
        )}

        {error && (
          <ErrorContainer>
            <div style={{ 
              fontSize: '18px', 
              marginBottom: '16px',
              color: '#dc2626'
            }}>
              ⚠️ No Data Available
            </div>
            <div style={{ 
              fontSize: '14px', 
              lineHeight: '1.5',
              color: '#6b7280',
              maxWidth: '500px',
              margin: '0 auto'
            }}>
              {error}
            </div>
            <div style={{ 
              fontSize: '12px', 
              marginTop: '16px',
              color: '#9ca3af',
              fontStyle: 'italic'
            }}>
              Please check your selections and ensure data has been entered correctly.
            </div>
          </ErrorContainer>
        )}

        {!dmcData && !loading && !error && (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: theme === 'dark' ? '#d1d5db' : '#64748b',
            fontSize: '16px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <div>Select examination and class{selectedClass?.has_sections ? ' and section' : ''} to generate DMC</div>
          </div>
        )}

        {dmcData && !loading && (
          <DMCContainer ref={certificateRef}>
            {/* Mobile Layout */}
            <MobileHeader>
              <MobileStudentProfile>
                <MobileStudentImage>
                  {dmcData.student_image ? (
                    <img 
                      src={dmcData.student_image} 
                      alt={dmcData.student_name}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const initialsElement = e.currentTarget.nextElementSibling as HTMLElement;
                        if (initialsElement) {
                          initialsElement.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div 
                    style={{ 
                      display: dmcData.student_image ? 'none' : 'flex',
                      width: '100%',
                      height: '100%',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#6366f1',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      borderRadius: '50%'
                    }}
                  >
                    {getInitials(dmcData.student_name)}
                    </div>
                </MobileStudentImage>
                <MobileStudentInfo>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      color: '#6b7280', 
                      fontWeight: '500',
                      flexShrink: 0
                    }}>
                      ID: {dmcData.student_id}
                    </span>
                    <MobileStudentName style={{ margin: 0, flex: 1, minWidth: 0 }}>
                      {dmcData.student_name}
                      <span style={{ 
                        fontSize: '0.8rem', 
                        color: '#9ca3af', 
                        fontWeight: '400',
                        marginLeft: '6px'
                      }}>
                        • {dmcData.father_name}
                      </span>
                    </MobileStudentName>
                    <MobileStudentClass style={{ flexShrink: 0, marginLeft: '8px' }}>
                      {dmcData.class}{dmcData.section ? ` (${dmcData.section})` : ''}
                    </MobileStudentClass>
                  </div>
                </MobileStudentInfo>
              </MobileStudentProfile>
            </MobileHeader>

            <MobileSubjectArea>
              <MobileMarksTable>
                <MobileMarksHeader>
                  <MobileMarksCell>S.NO</MobileMarksCell>
                  <MobileMarksCell>SUBJECTS</MobileMarksCell>
                  <MobileMarksCell>TOTAL</MobileMarksCell>
                  <MobileMarksCell>OBTAINED</MobileMarksCell>
                </MobileMarksHeader>
                {dmcData.subjects.filter((subject): subject is NonNullable<typeof subject> => subject !== null).map((subject, index) => (
                  <MobileMarksRow key={index}>
                    <MobileMarksCell>{index + 1}</MobileMarksCell>
                    <MobileMarksCell>{subject.name}</MobileMarksCell>
                    <MobileMarksCell>{subject.total_marks}</MobileMarksCell>
                    <MobileMarksCell>
                      {(subject.obtained_marks === 'A' || subject.obtained_marks === 'Absent') ? (
                        <span style={{
                          display: 'inline-block',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: '2px solid #dc2626',
                          backgroundColor: 'transparent',
                          color: '#dc2626',
                          fontSize: '10px',
                          fontWeight: 'bold',
                      textAlign: 'center', 
                          lineHeight: '14px'
                        }}>
                          A
                        </span>
                      ) : (
                        (typeof subject.obtained_marks === 'number') ? (
                          (() => {
                            const percentage = (subject.obtained_marks / subject.total_marks) * 100;
                            const passingMarks = selectedExamination?.passing_marks || 40;
                            return percentage < passingMarks || subject.obtained_marks === 0 ? (
                              <span style={{
                                display: 'inline-block',
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                border: '2px solid #dc2626',
                                backgroundColor: 'transparent',
                                color: '#dc2626',
                                textAlign: 'center',
                                lineHeight: '14px',
                                fontSize: '9px',
                                fontWeight: 'bold'
                              }}>
                                {subject.obtained_marks}
                              </span>
                            ) : (
                              subject.obtained_marks
                            );
                          })()
                        ) : (
                          subject.obtained_marks
                        )
                      )}
                    </MobileMarksCell>
                  </MobileMarksRow>
                ))}
              </MobileMarksTable>
            </MobileSubjectArea>

            {/* Mobile Footer with Summary */}
            <MobileFooter>
              <MobileSummaryCardsGrid>
                {/* First Card: Percentage (left) and Marks (right) */}
                <MobileSummaryInfoCard>
                  <MobileSummaryInfoItem>
                    <MobileSummaryInfoLabel>Percentage</MobileSummaryInfoLabel>
                    <MobileSummaryInfoValue style={{ 
                      color: dmcData.percentage >= 80 ? '#10b981' : dmcData.percentage >= 60 ? '#f59e0b' : '#ef4444'
                    }}>
                      {dmcData.percentage.toFixed(1)}%
                    </MobileSummaryInfoValue>
                  </MobileSummaryInfoItem>
                  <MobileSummaryInfoItem>
                    <MobileSummaryInfoLabel>Marks</MobileSummaryInfoLabel>
                    <MobileSummaryInfoValue>
                      {dmcData.obtained_marks}/{dmcData.total_marks}
                    </MobileSummaryInfoValue>
                  </MobileSummaryInfoItem>
                </MobileSummaryInfoCard>
                
                {/* Second Card: Attendance (left) and Position (right) */}
                <MobileSummaryInfoCard>
                  <MobileSummaryInfoItem>
                    <MobileSummaryInfoLabel>Attendance</MobileSummaryInfoLabel>
                    <MobileSummaryInfoValue style={{ 
                      color: (dmcData.attendance_percentage || 100) >= 90 ? '#10b981' : (dmcData.attendance_percentage || 100) >= 80 ? '#f59e0b' : '#ef4444'
                    }}>
                      {dmcData.attendance_percentage || 100}%
                    </MobileSummaryInfoValue>
                  </MobileSummaryInfoItem>
                  <MobileSummaryInfoItem>
                    <MobileSummaryInfoLabel>Position</MobileSummaryInfoLabel>
                    <MobileSummaryInfoValue>
                      {dmcData.position}
                    </MobileSummaryInfoValue>
                  </MobileSummaryInfoItem>
                </MobileSummaryInfoCard>
              </MobileSummaryCardsGrid>
            </MobileFooter>


            {/* Desktop Layout */}
            <DesktopLeftColumn>
              <StudentProfileCard>
              <ProfileHeader>
                <StudentImage>
                  {dmcData.student_image ? (
                    <img 
                      src={dmcData.student_image} 
                      alt={dmcData.student_name}
                      onError={(e) => {
                        // Hide the image and show initials instead
                        e.currentTarget.style.display = 'none';
                        const initialsElement = e.currentTarget.nextElementSibling as HTMLElement;
                        if (initialsElement) {
                          initialsElement.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div 
                    style={{ 
                      display: dmcData.student_image ? 'none' : 'flex',
                      width: '100%',
                      height: '100%',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#6366f1',
                      color: 'white',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      borderRadius: '50%'
                    }}
                  >
                    {getInitials(dmcData.student_name)}
                  </div>
                </StudentImage>
                <StudentInfo>
                  <StudentName style={{ margin: 0 }}>
                    {dmcData.student_name}
                  </StudentName>
            </StudentInfo>
              </ProfileHeader>
              
              <ProfileInfo>
                <ProfileItem>
                  <ProfileLabel>Roll Number</ProfileLabel>
                  <ProfileValue>{dmcData.roll_number}</ProfileValue>
                </ProfileItem>
                <ProfileItem>
                  <ProfileLabel>Father's Name</ProfileLabel>
                  <ProfileValue>{dmcData.father_name}</ProfileValue>
                </ProfileItem>
                <ProfileItem>
                  <ProfileLabel>Examination</ProfileLabel>
                  <ProfileValue>{selectedExamination?.name || 'Select Examination'}</ProfileValue>
                </ProfileItem>
              </ProfileInfo>
              </StudentProfileCard>
            </DesktopLeftColumn>

            <DesktopMiddleColumn>
              <MarksCard>
              <MarksHeader>
                <div>S. No</div>
                <div>SUBJECTS</div>
                <div>TOTAL</div>
                <div>OBTAINED</div>
              </MarksHeader>
              
              {dmcData.subjects.filter((subject): subject is NonNullable<typeof subject> => subject !== null).map((subject, index) => {
                  return (
                  <MarksRow key={index} $isEven={index % 2 === 0}>
                    <MarksCell $align="center">
                      {index + 1}
                    </MarksCell>
                    <MarksCell $align="left">
                      <SubjectName>
                        {subject.name}
                      </SubjectName>
                    </MarksCell>
                    <MarksCell $align="center">
                      {subject.total_marks}
                    </MarksCell>
                    <MarksCell $align="center">
                      {(subject.obtained_marks === 'A' || subject.obtained_marks === 'Absent') ? (
                  <span style={{
                    display: 'inline-block',
                          width: '20px',
                          height: '20px',
                    borderRadius: '50%',
                    border: '2px solid #dc2626',
                    backgroundColor: 'transparent',
                    color: '#dc2626',
                    textAlign: 'center',
                          lineHeight: '16px',
                          fontSize: '10px',
                    fontWeight: 'bold'
                  }}>
                    A
                  </span>
                ) : (
                        (typeof subject.obtained_marks === 'number') ? (
                          (() => {
                            const percentage = (subject.obtained_marks / subject.total_marks) * 100;
                            const passingMarks = selectedExamination?.passing_marks || 40;
                            return percentage < passingMarks || subject.obtained_marks === 0 ? (
                              <span style={{
                                display: 'inline-block',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                border: '2px solid #dc2626',
                                backgroundColor: 'transparent',
                                color: '#dc2626',
                                textAlign: 'center',
                                lineHeight: '16px',
                                fontSize: '9px',
                                fontWeight: 'bold'
                              }}>
                                {subject.obtained_marks}
                              </span>
                            ) : (
                              subject.obtained_marks
                            );
                          })()
                        ) : (
                          subject.obtained_marks
                        )
                      )}
                    </MarksCell>
                  </MarksRow>
                  );
                })}
              
              </MarksCard>
            </DesktopMiddleColumn>

            <DesktopRightColumn>
              <SummaryCard>
              <SummaryHeader>
                <SummaryTitle>Performance Summary</SummaryTitle>
              </SummaryHeader>
              
              <SummaryGrid>
                <SummaryFirstRow>
                  <SummaryItem>
                    <SummaryLabel>Percentage</SummaryLabel>
                    <ColorCodedValue $value={dmcData.percentage}>
                      {dmcData.percentage}%
                    </ColorCodedValue>
                  </SummaryItem>
                  <SummaryItem>
                    <SummaryLabel>Position</SummaryLabel>
                    <SummaryValue>
                      {getPositionSuffix(dmcData.position)}
                  </SummaryValue>
                </SummaryItem>
                </SummaryFirstRow>
                
                <SummaryRest>
                  <SummaryItem>
                    <SummaryLabel>Grade</SummaryLabel>
                    <SummaryValue>{dmcData.grade}</SummaryValue>
                </SummaryItem>
                  <SummaryItem>
                    <SummaryLabel>Attendance</SummaryLabel>
                    <ColorCodedValue $value={dmcData.attendance_percentage || 100}>
                      {dmcData.attendance_percentage || 100}%
                  </ColorCodedValue>
                </SummaryItem>
                  <SummaryItem>
                    <SummaryLabel>Marks</SummaryLabel>
                    <SummaryValue>{dmcData.obtained_marks} / {dmcData.total_marks}</SummaryValue>
                  </SummaryItem>
                </SummaryRest>
              </SummaryGrid>
              </SummaryCard>
            </DesktopRightColumn>
          </DMCContainer>
        )}


        {/* Minimal Footer with Navigation */}
        {dmcData && allDmcData.length > 1 && (
          <PageFooter>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <button 
                onClick={prevStudent} 
                disabled={currentStudentIndex === 0}
                style={{ 
                  padding: '6px 12px', 
                  fontSize: '0.8rem',
                  border: 'none',
                  borderRadius: '6px',
                  background: currentStudentIndex === 0 ? '#e2e8f0' : '#3b82f6',
                  color: currentStudentIndex === 0 ? '#9ca3af' : 'white',
                  cursor: currentStudentIndex === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentStudentIndex === 0 ? 0.5 : 1,
                  fontWeight: '500'
                }}
              >
                ← Prev
              </button>
              
              <span style={{ 
                fontSize: '0.8rem', 
                color: '#64748b',
                minWidth: '60px',
                textAlign: 'center',
                fontWeight: '500',
                padding: '0 8px'
              }}>
                {currentStudentIndex + 1} / {allDmcData.length}
              </span>
              
              <button 
                onClick={nextStudent} 
                disabled={currentStudentIndex === allDmcData.length - 1}
                style={{ 
                  padding: '6px 12px', 
                  fontSize: '0.8rem',
                  border: 'none',
                  borderRadius: '6px',
                  background: currentStudentIndex === allDmcData.length - 1 ? '#e2e8f0' : '#3b82f6',
                  color: currentStudentIndex === allDmcData.length - 1 ? '#9ca3af' : 'white',
                  cursor: currentStudentIndex === allDmcData.length - 1 ? 'not-allowed' : 'pointer',
                  opacity: currentStudentIndex === allDmcData.length - 1 ? 0.5 : 1,
                  fontWeight: '500'
                }}
              >
                Next →
              </button>
            </div>
          </PageFooter>
        )}
      </MainContent>

      {/* PDF Version Selection Dialog */}
      <Dialog 
        open={pdfDialogOpen} 
        onClose={() => setPdfDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle style={{ 
          textAlign: 'center', 
          fontSize: '1.2rem', 
          fontWeight: 'bold',
          color: theme === 'dark' ? '#e5e7eb' : '#1f2937'
        }}>
          Choose PDF Version
        </DialogTitle>
        <DialogContent>
          <div style={{ 
            padding: '20px 0',
            textAlign: 'center',
            color: theme === 'dark' ? '#d1d5db' : '#6b7280'
          }}>
            <p style={{ marginBottom: '20px' }}>
              Select the PDF version you want to generate:
            </p>
            {!customColors && (
              <div style={{ 
                marginBottom: '20px', 
                padding: '16px', 
                backgroundColor: '#f8fafc', 
                border: '1px solid #e2e8f0', 
                borderRadius: '8px',
                fontSize: '14px',
                color: '#64748b'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '16px' }}>ℹ️</span>
                  <strong>Custom Version Not Available</strong>
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px' }}>
                  Configure DMC colors in Examination Settings to enable the custom version.
                </p>
                <button 
                  onClick={loadCustomColors}
              style={{ 
                    padding: '8px 16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  🔄 Reload Configuration
                </button>
              </div>
            )}
            {/* Clickable Visual Options */}
            <div style={{ 
                display: 'flex', 
              justifyContent: 'space-around', 
                gap: '16px',
              flexWrap: 'wrap',
              marginTop: '20px'
            }}>
              {/* Colored Version Option */}
              <div 
                onClick={() => setPdfVersion('colored')}
                style={{ 
                  flex: '1',
                  minWidth: '120px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  transform: pdfVersion === 'colored' ? 'scale(1.05)' : 'scale(1)',
                  opacity: pdfVersion === 'colored' ? 1 : 0.8
                }}
              >
                  <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '500',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  marginBottom: '8px'
                }}>
                  Colored Version
                </div>
                <div style={{
                  width: '100%',
                  height: '80px',
                    borderRadius: '8px',
                  background: 'linear-gradient(135deg, #667eea, #f093fb)',
                  border: pdfVersion === 'colored' ? '3px solid #3b82f6' : '2px solid #e5e7eb',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: pdfVersion === 'colored' ? '0 4px 12px rgba(59, 130, 246, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  {/* Header */}
                    <div style={{ 
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                      height: '20px', 
                    background: 'linear-gradient(90deg, #667eea, #f093fb)'
                  }}></div>
                  {/* Title Bar */}
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '8px',
                    right: '8px',
                    height: '12px',
                    background: '#667eea',
                    borderRadius: '2px'
                  }}></div>
                  {/* Table Header */}
                  <div style={{
                    position: 'absolute',
                    top: '40px',
                    left: '8px',
                    right: '8px',
                    height: '8px',
                    background: '#667eea',
                    borderRadius: '2px'
                  }}></div>
                  {/* Table Rows */}
                  <div style={{
                    position: 'absolute',
                    top: '50px',
                    left: '8px',
                    right: '8px',
                    height: '4px',
                    background: '#f8fafc',
                    borderRadius: '1px'
                  }}></div>
                  <div style={{
                    position: 'absolute',
                    top: '56px',
                    left: '8px',
                    right: '8px',
                    height: '4px',
                    background: '#ffffff',
                    borderRadius: '1px'
                  }}></div>
                </div>
                <div style={{ 
                  marginTop: '8px',
                  fontSize: '11px',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                }}>
                  Full color with gradients
                    </div>
                    </div>

              {/* B&W Version Option */}
              <div 
                onClick={() => setPdfVersion('bw')}
                style={{ 
                  flex: '1',
                  minWidth: '120px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  transform: pdfVersion === 'bw' ? 'scale(1.05)' : 'scale(1)',
                  opacity: pdfVersion === 'bw' ? 1 : 0.8
                }}
              >
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '500',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  marginBottom: '8px'
                }}>
                  Black & White
                  </div>
                  <div style={{ 
                  width: '100%',
                  height: '80px',
                    borderRadius: '8px',
                  background: '#ffffff',
                  border: pdfVersion === 'bw' ? '3px solid #3b82f6' : '2px solid #e5e7eb',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: pdfVersion === 'bw' ? '0 4px 12px rgba(59, 130, 246, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  {/* Header */}
                    <div style={{ 
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                      height: '20px', 
                    background: 'linear-gradient(90deg, #6b7280, #9ca3af)'
                  }}></div>
                  {/* Title Bar */}
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '8px',
                    right: '8px',
                    height: '12px',
                    background: '#6b7280',
                    borderRadius: '2px'
                  }}></div>
                  {/* Table Header */}
                  <div style={{
                    position: 'absolute',
                    top: '40px',
                    left: '8px',
                    right: '8px',
                    height: '8px',
                    background: '#6b7280',
                    borderRadius: '2px'
                  }}></div>
                  {/* Table Rows */}
                  <div style={{
                    position: 'absolute',
                    top: '50px',
                    left: '8px',
                    right: '8px',
                    height: '4px',
                    background: '#f3f4f6',
                    borderRadius: '1px'
                  }}></div>
                  <div style={{
                    position: 'absolute',
                    top: '56px',
                    left: '8px',
                    right: '8px',
                    height: '4px',
                    background: '#ffffff',
                    borderRadius: '1px'
                  }}></div>
                </div>
                <div style={{ 
                  marginTop: '8px',
                  fontSize: '11px',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                }}>
                  Print-friendly grayscale
                </div>
              </div>

              {/* Custom Version Option */}
              <div 
                onClick={() => customColors && setPdfVersion('custom')}
                style={{ 
                  flex: '1',
                  minWidth: '120px',
                  textAlign: 'center',
                  cursor: customColors ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  transform: pdfVersion === 'custom' ? 'scale(1.05)' : 'scale(1)',
                  opacity: customColors ? (pdfVersion === 'custom' ? 1 : 0.8) : 0.5
                }}
              >
                <div style={{ 
                      fontSize: '12px',
                  fontWeight: '500',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  marginBottom: '8px'
                    }}>
                  Custom Version
                    </div>
                <div style={{
                  width: '100%',
                  height: '80px',
                  borderRadius: '8px',
                  background: customColors ? '#ffffff' : '#f3f4f6',
                  border: pdfVersion === 'custom' ? '3px solid #3b82f6' : '2px solid #e5e7eb',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: pdfVersion === 'custom' ? '0 4px 12px rgba(59, 130, 246, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  {customColors ? (
                    <>
                      {/* Header */}
                      <div style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        right: '0',
                        height: '20px',
                        background: `linear-gradient(90deg, ${customColors.header_gradient_start}, ${customColors.header_gradient_end})`
                      }}></div>
                      {/* Title Bar */}
                      <div style={{
                        position: 'absolute',
                        top: '20px',
                        left: '8px',
                        right: '8px',
                        height: '12px',
                        background: customColors.title_background,
                        borderRadius: '2px'
                      }}></div>
                      {/* Table Header */}
                      <div style={{
                        position: 'absolute',
                        top: '40px',
                        left: '8px',
                        right: '8px',
                        height: '8px',
                        background: customColors.table_header_background,
                        borderRadius: '2px'
                      }}></div>
                      {/* Table Rows */}
                      <div style={{
                        position: 'absolute',
                        top: '50px',
                        left: '8px',
                        right: '8px',
                        height: '4px',
                        background: customColors.table_alternate_row,
                        borderRadius: '1px'
                      }}></div>
                      <div style={{
                        position: 'absolute',
                        top: '56px',
                        left: '8px',
                        right: '8px',
                        height: '4px',
                        background: customColors.details_background,
                        borderRadius: '1px'
                      }}></div>
                    </>
                  ) : (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: '10px',
                      color: '#9ca3af',
                      textAlign: 'center'
                    }}>
                      Not Available
                    </div>
                  )}
                  </div>
                <div style={{ 
                  marginTop: '8px',
                  fontSize: '11px',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                }}>
                  {customColors ? 'Your configured colors' : 'Configure colors first'}
                </div>
              </div>
            </div>
            
          </div>
        </DialogContent>
        <DialogActions style={{ 
          padding: '16px 24px',
          justifyContent: 'center',
          gap: '12px'
        }}>
          <Button 
            onClick={() => setPdfDialogOpen(false)}
            variant="outlined"
            style={{
              borderColor: theme === 'dark' ? '#6b7280' : '#d1d5db',
              color: theme === 'dark' ? '#d1d5db' : '#6b7280'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmPDFExport}
            variant="contained"
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              fontWeight: 'bold'
            }}
            disabled={pdfLoading}
          >
            {pdfLoading ? (
              <>
                <CircularProgress size={16} style={{ marginRight: '8px' }} />
                Generating...
              </>
            ) : (
              <>
                <PictureAsPdf style={{ marginRight: '8px', fontSize: '18px' }} />
                Generate PDF
              </>
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Colors Debug Modal */}
      <Dialog
        open={colorsModalOpen}
        onClose={() => setColorsModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle style={{ 
          backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
          color: theme === 'dark' ? '#f9fafb' : '#111827',
          borderBottom: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '24px', 
              height: '24px', 
              borderRadius: '4px',
              background: 'linear-gradient(45deg, #667eea, #f093fb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              🎨
            </div>
            Custom Colors Debug
          </div>
        </DialogTitle>
        <DialogContent style={{ 
          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
          color: theme === 'dark' ? '#f9fafb' : '#111827',
          padding: '24px'
        }}>
          {customColors ? (
            <div>
              <div style={{ 
                marginBottom: '20px', 
                padding: '12px', 
                backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
                borderRadius: '8px',
                border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`
              }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>
                  🎨 Custom Colors Loaded Successfully
                </h3>
                <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
                  These colors are currently loaded in memory and should be applied to the PDF.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                {/* Header Colors */}
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb',
                  borderRadius: '8px',
                  border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>Header Colors</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      backgroundColor: customColors.header_gradient_start,
                      borderRadius: '4px',
                      border: '1px solid #ccc'
                    }}></div>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                      Start: {customColors.header_gradient_start}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      backgroundColor: customColors.header_gradient_end,
                      borderRadius: '4px',
                      border: '1px solid #ccc'
                    }}></div>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                      End: {customColors.header_gradient_end}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      backgroundColor: customColors.header_text_color,
                      borderRadius: '4px',
                      border: '1px solid #ccc'
                    }}></div>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                      Text: {customColors.header_text_color}
                    </span>
                  </div>
                </div>

                {/* Table Colors */}
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb',
                  borderRadius: '8px',
                  border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>Table Colors</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      backgroundColor: customColors.table_header_background,
                      borderRadius: '4px',
                      border: '1px solid #ccc'
                    }}></div>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                      Header: {customColors.table_header_background}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      backgroundColor: customColors.table_header_text,
                      borderRadius: '4px',
                      border: '1px solid #ccc'
                    }}></div>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                      Text: {customColors.table_header_text}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      backgroundColor: customColors.table_border,
                      borderRadius: '4px',
                      border: '1px solid #ccc'
                    }}></div>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                      Border: {customColors.table_border}
                    </span>
                  </div>
                </div>

                {/* Performance Colors */}
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb',
                  borderRadius: '8px',
                  border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>Performance Colors</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      backgroundColor: customColors.excellent_color,
                      borderRadius: '4px',
                      border: '1px solid #ccc'
                    }}></div>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                      Excellent: {customColors.excellent_color}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      backgroundColor: customColors.good_color,
                      borderRadius: '4px',
                      border: '1px solid #ccc'
                    }}></div>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                      Good: {customColors.good_color}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      backgroundColor: customColors.poor_color,
                      borderRadius: '4px',
                      border: '1px solid #ccc'
                    }}></div>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                      Poor: {customColors.poor_color}
                    </span>
                  </div>
                </div>

                {/* Raw Data */}
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb',
                  borderRadius: '8px',
                  border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                  gridColumn: '1 / -1'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>Raw JSON Data</h4>
                  <pre style={{ 
                    fontSize: '11px', 
                    fontFamily: 'monospace',
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                    padding: '12px',
                    borderRadius: '4px',
                    border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                    overflow: 'auto',
                    maxHeight: '200px',
                    margin: 0
                  }}>
                    {JSON.stringify(customColors, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 20px',
              color: theme === 'dark' ? '#9ca3af' : '#6b7280'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>No Custom Colors Loaded</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Custom colors are not currently loaded. Try reloading the configuration or setting up colors in the Examination Configuration page.
              </p>
            </div>
          )}
        </DialogContent>
        <DialogActions style={{ 
          backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
          borderTop: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
          padding: '16px 24px'
        }}>
          <Button 
            onClick={() => setColorsModalOpen(false)}
            variant="outlined"
            style={{
              borderColor: theme === 'dark' ? '#6b7280' : '#d1d5db',
              color: theme === 'dark' ? '#f9fafb' : '#374151'
            }}
          >
            Close
          </Button>
          <Button 
            onClick={() => {
              loadCustomColors();
            }}
            variant="contained"
            style={{
              backgroundColor: '#3b82f6',
              color: 'white'
            }}
          >
            Reload Colors
          </Button>
          <Button 
            onClick={async () => {
              try {
                if (user?.school_id) {
                  // Delete existing configuration
                  await examinationConfigurationService.deleteExaminationConfiguration(user.school_id);
                  await loadCustomColors();
                }
              } catch (error) {
              }
            }}
            variant="contained"
            style={{
              backgroundColor: '#dc2626',
              color: 'white'
            }}
          >
            Clear & Reset
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default DetailedMarksCertificate;
