import React, { useState, useEffect, useContext, useRef } from 'react';
import styled from 'styled-components';
import { supabase } from '../supabaseClient';
import { ThemeContext } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import {
  Assessment as AssessmentIcon,
  PictureAsPdf,
  Download as DownloadIcon,
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DMCData {
  student_id: string;
  student_name: string;
  father_name: string;
  class: string;
  section: string;
  roll_number: string;
  session: string;
  examination: string;
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

const SegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.BG === '#252525' ? '#222' : '#f8f9fa'};
  border-radius: 11px;
  box-shadow: ${({ theme }) => theme.BG === '#252525' ? '1.4px 1.4px 4px rgba(0,0,0,0.3)' : '1.4px 1.4px 4px rgba(0,0,0,0.1)'};
  border: ${({ theme }) => theme.BG === '#252525' ? '1px solid #333' : '1px solid #e5e7eb'};
  overflow: hidden;
  
  /* Mobile enhancements */
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    border-radius: 8px;
    gap: 0;
    padding: 2px;
  }
  
  @media (max-width: 480px) {
    flex-direction: column;
    gap: 4px;
    padding: 4px;
    border-radius: 6px;
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
  /* Mobile enhancements */
  @media (max-width: 768px) {
    width: 100%;
    border-radius: 6px;
    border-left: none;
    border-right: none;
    min-width: 0;
    background-position: right 1em center;
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

const CertificateContainer = styled.div`
  width: 210mm;
  min-height: 297mm;
  max-width: 210mm;
  margin: 8px auto;
  background: white;
  border: 1px solid #e0e0e0;
  padding: 0;
  font-family: 'Inter', 'Segoe UI', sans-serif;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  transform: scale(1);
  transform-origin: top center;
  
  @media print {
    width: 210mm;
    min-height: 297mm;
    margin: 0;
    box-shadow: none;
    border: none;
    border-radius: 0;
    transform: none;
  }
  
  @media screen and (max-width: 220mm) {
    width: 100%;
    max-width: 100%;
    margin: 4px auto;
    transform: scale(1);
  }
  
  @media screen and (max-width: 768px) {
    margin: 2px auto;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: scale(1);
  }
  
  @media screen and (max-width: 480px) {
    transform: scale(1);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #dc2626, #f59e0b, #10b981, #3b82f6);
    border-radius: 8px 8px 0 0;
  }
`;

const CertificateHeader = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  padding: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  position: relative;
  border-bottom: none;
  overflow: hidden;
  min-height: 120px;
  box-shadow: 
    0 20px 60px rgba(102, 126, 234, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(255,255,255,0.05) 0%, transparent 50%);
    pointer-events: none;
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 6px;
    background: linear-gradient(90deg, 
      #ff6b6b 0%, 
      #4ecdc4 25%, 
      #45b7d1 50%, 
      #96ceb4 75%, 
      #f093fb 100%
    );
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  
`;

const SchoolLogo = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #e2e8f0 100%);
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.15), 
    0 0 0 6px rgba(255, 255, 255, 0.3),
    inset 0 2px 8px rgba(255, 255, 255, 0.8);
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
  
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
`;

const HeaderRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex: 1;
  gap: 8px;
  position: relative;
  z-index: 2;
  height: 100%;
`;

const SchoolDetails = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  position: relative;
  z-index: 2;
`;

const SchoolName = styled.div`
  font-size: clamp(14px, 2.5vw, 28px);
  font-weight: 700;
  color: white;
  margin: 0 0 8px 0;
  line-height: 1.2;
  text-align: center;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  letter-spacing: 0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  width: 100%;
  
  @media (max-width: 1200px) {
    font-size: clamp(12px, 2.2vw, 20px);
  }
  
  @media (max-width: 768px) {
    font-size: clamp(10px, 3vw, 18px);
    white-space: normal;
    line-height: 1.3;
  }
  
  @media (max-width: 480px) {
    font-size: clamp(8px, 4vw, 16px);
  }
`;

const SchoolLocation = styled.div`
  font-size: clamp(10px, 2vw, 16px);
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 6px 0;
  text-align: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  letter-spacing: 0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  width: 100%;
  
  @media (max-width: 768px) {
    font-size: clamp(8px, 2.5vw, 14px);
    white-space: normal;
  }
  
  @media (max-width: 480px) {
    font-size: clamp(7px, 3vw, 12px);
  }
`;

const SchoolTagline = styled.div`
  font-size: clamp(8px, 1.5vw, 12px);
  font-weight: 400;
  color: rgba(255, 255, 255, 0.8);
  margin: 4px 0 0 0;
  text-align: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  letter-spacing: 0.1px;
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  width: 100%;
  
  @media (max-width: 768px) {
    font-size: clamp(6px, 2vw, 10px);
    white-space: normal;
  }
  
  @media (max-width: 480px) {
    font-size: clamp(5px, 2.5vw, 8px);
  }
`;

const CertificateTitle = styled.div`
  background: rgba(102, 126, 234, 0.3);
  color: #1e293b;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  margin: 12px auto 0;
  display: inline-block;
  border-radius: 8px;
  text-align: center;
  width: fit-content;
  letter-spacing: 0.3px;
  text-transform: uppercase;
`;

const ExaminationDetails = styled.div`
  font-size: 16px;
  color: #475569;
  margin: 10px 0 0;
  font-weight: 600;
  text-align: center;
  opacity: 0.9;
  letter-spacing: 0.4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const StudentInfo = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin: 0;
  padding: 16px 24px;
  background: #fafbfc;
  border-bottom: 1px solid #e2e8f0;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  
`;

const InfoLabel = styled.span`
  font-weight: 600;
  min-width: 80px;
  color: #64748b;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const InfoValue = styled.span`
  color: #1e293b;
  font-weight: 500;
  font-size: 15px;
  margin-left: 12px;
`;

const MarksTable = styled.table`
  width: 95%;
  border-collapse: collapse;
  margin: 0 auto;
  font-size: 14px;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
  
  @media (max-width: 768px) {
    width: 98%;
  }
  
  @media (max-width: 480px) {
    width: 100%;
  }
`;

const TableHeader = styled.th`
  background: rgba(102, 126, 234, 0.3);
  color: #1e293b;
  padding: 12px 16px;
  text-align: center;
  font-weight: 700;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  border: none;
  position: relative;
  
  &:first-child {
    border-radius: 12px 0 0 0;
  }
  
  &:last-child {
    border-radius: 0 12px 0 0;
  }
`;

const TableCell = styled.td<{ $isEven?: boolean }>`
  padding: 16px 12px;
  text-align: center;
  border: none;
  border-bottom: 1px solid #f1f5f9;
  background: ${props => props.$isEven ? '#fafbfc' : 'white'};
  font-size: 14px;
  color: #475569;
  font-weight: 500;
  height: 48px;
  vertical-align: middle;
`;

const SubjectCell = styled.td<{ $isEven?: boolean }>`
  padding: 16px 12px;
  text-align: left;
  border: none;
  border-bottom: 1px solid #f1f5f9;
  background: ${props => props.$isEven ? '#fafbfc' : 'white'};
  font-weight: 500;
  font-size: 14px;
  color: #1e293b;
  height: 48px;
  vertical-align: middle;
`;

const TableRow = styled.tr`
  height: 48px;
  vertical-align: middle;
`;

const TotalRow = styled.tr`
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
  font-weight: 600;
  
  td {
    border-top: 2px solid #dc2626;
    border-bottom: none;
    padding: 20px 12px;
    font-size: 15px;
    color: #1e293b;
  }
  
  td:first-child {
    border-radius: 0 0 0 8px;
  }
  
  td:last-child {
    border-radius: 0 0 8px 0;
  }
`;

const SummarySection = styled.div<{ $subjectCount?: number }>`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${props => props.$subjectCount && props.$subjectCount >= 10 ? '12px' : '16px'};
  margin: 0;
  padding: ${props => props.$subjectCount && props.$subjectCount >= 10 ? '16px' : '20px'};
  background: #fafbfc;
  border-bottom: 1px solid #e2e8f0;
`;

const SummaryItem = styled.div<{ $subjectCount?: number }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${props => props.$subjectCount && props.$subjectCount >= 10 ? '12px 8px' : '16px 12px'};
  background: white;
  border-radius: ${props => props.$subjectCount && props.$subjectCount >= 10 ? '6px' : '8px'};
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const SummaryLabel = styled.span<{ $subjectCount?: number }>`
  font-weight: 500;
  color: #64748b;
  font-size: ${props => props.$subjectCount && props.$subjectCount >= 10 ? '10px' : '11px'};
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: ${props => props.$subjectCount && props.$subjectCount >= 10 ? '4px' : '6px'};
`;

const SummaryValue = styled.span<{ $subjectCount?: number }>`
  font-weight: 600;
  color: #1e293b;
  font-size: ${props => props.$subjectCount && props.$subjectCount >= 10 ? '16px' : '18px'};
  text-align: center;
`;

const Footer = styled.div<{ $subjectCount?: number }>`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${props => props.$subjectCount && props.$subjectCount >= 10 ? '20px' : '24px'};
  margin: 0 0 20px 0;
  padding: ${props => props.$subjectCount && props.$subjectCount >= 10 ? '16px' : '20px'};
  background: white;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -20px;
    left: 0;
    right: 0;
    height: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  }
`;

const SignatureBox = styled.div<{ $subjectCount?: number }>`
  text-align: center;
  padding: ${props => props.$subjectCount && props.$subjectCount >= 10 ? '12px' : '16px'};
  background: #fafbfc;
  border-radius: ${props => props.$subjectCount && props.$subjectCount >= 10 ? '6px' : '8px'};
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const SignatureLabel = styled.div<{ $subjectCount?: number }>`
  font-weight: 500;
  color: #64748b;
  margin-bottom: ${props => props.$subjectCount && props.$subjectCount >= 10 ? '12px' : '16px'};
  font-size: ${props => props.$subjectCount && props.$subjectCount >= 10 ? '11px' : '12px'};
  text-transform: uppercase;
  letter-spacing: 0.4px;
`;

const SignatureLine = styled.div<{ $subjectCount?: number }>`
  border-bottom: 2px solid #dc2626;
  height: ${props => props.$subjectCount && props.$subjectCount >= 10 ? '28px' : '32px'};
  margin-top: ${props => props.$subjectCount && props.$subjectCount >= 10 ? '6px' : '8px'};
  border-radius: 0 0 4px 4px;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  font-size: 18px;
  color: #7f8c8d;
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: 40px;
  color: #e74c3c;
  font-size: 16px;
`;


const DetailedMarksCertificate: React.FC = () => {
  const [dmcData, setDmcData] = useState<DMCData | null>(null);
  const [allDmcData, setAllDmcData] = useState<DMCData[]>([]);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const certificateRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadSections(selectedClass.id);
    } else {
      setSections([]);
      setSelectedSection(null);
    }
  }, [selectedClass]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
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
        .select('*')
        .eq('school_id', user?.school_id)
        .order('name');

      if (classesError) throw classesError;
      
      // Remove duplicates based on name
      const uniqueClasses = classesData?.filter((classItem, index, self) => 
        index === self.findIndex(c => c.name === classItem.name)
      ) || [];
      
      setClasses(uniqueClasses);

      // Load examinations for the current school only
      const { data: examinationsData, error: examinationsError } = await supabase
        .from('examinations')
        .select('*')
        .eq('school_id', user?.school_id)
        .order('name');

      if (examinationsError) throw examinationsError;
      setExaminations(examinationsData || []);

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
    if (!selectedClass || !selectedSection || !selectedExamination) {
      toast.error('Please select class, section, and examination');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      

      // Use the exact same approach as MasterSheetManager.tsx
      // Get all students for the selected class/section
      let studentQuery = supabase
        .from('students')
        .select('id, name, father_name, picture_url, class_id, section_id, school_id')
        .eq('school_id', user?.school_id)
        .eq('class_id', selectedClass.id)
        .eq('status', 'active');

      if (selectedSection) {
        studentQuery = studentQuery.eq('section_id', selectedSection.id);
      }

      const { data: students, error: studentsError } = await studentQuery;
      if (studentsError) throw studentsError;

      if (!students || students.length === 0) {
        setDmcData(null);
        throw new Error(`No students found for class ${selectedClass.name}. Please check if students are enrolled in this class.`);
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

      // Get unique subjects that have exam results (matching MasterSheetManager pattern)
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

      // Convert to DMC data format (matching MasterSheetManager pattern)
      const dmcDataArray: DMCData[] = [];
      
      students.forEach(student => {
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

        // Create subjects array with 9 slots (fill empty slots if needed)
        const subjectsArray = Array.from({ length: 9 }, (_, index) => {
          const result = results[index];
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
          return null; // Return null for empty slots
        });

        dmcDataArray.push({
          student_id: student.id,
          student_name: student.name,
          father_name: student.father_name || '',
          class: selectedClass.name,
          section: selectedSection.name,
          roll_number: student.id.toString(),
          session: selectedExamination.session,
          examination: selectedExamination.name,
          subjects: subjectsArray,
          total_marks: totalExamMarks,
          obtained_marks: obtainedMarks,
          percentage: Math.round(percentage * 10) / 10,
          grade: grade,
          position: 0, // Will be calculated after sorting
          date: new Date().toLocaleDateString()
        });
      });

      // Sort by percentage and assign positions
      dmcDataArray.sort((a, b) => b.percentage - a.percentage);
      dmcDataArray.forEach((student, index) => {
        student.position = index + 1;
      });

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
      setLoading(false);
    }
  };

  // Function to calculate student attendance percentage (same logic as StudentProfile.tsx)
  const calculateStudentAttendancePercentage = async (studentId: string): Promise<number> => {
    try {
      // Fetch all attendance records for the student
      const { data: attendanceData, error } = await supabase
        .from('attendance_records')
        .select('id, date, status, remarks')
        .eq('student_id', studentId)
        .order('date', { ascending: false });

      if (error) {
        return 100; // Default to 100% if error
      }

      if (!attendanceData || attendanceData.length === 0) {
        return 100; // Default to 100% if no attendance data
      }

      // Calculate attendance stats (same logic as StudentProfile.tsx)
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

      // Calculate percentage (same as StudentProfile.tsx)
      const attendancePercentage = Math.round((stats.present / stats.total) * 100);
      return attendancePercentage;
    } catch (error) {
      return 100; // Default to 100% if error
    }
  };

  const handleExportPDF = async () => {
    if (!allDmcData || allDmcData.length === 0) {
      toast.error('No DMC data to export');
      return;
    }

    try {
      toast.loading('Generating PDF...', { id: 'pdf-export' });

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

        // Header section with colored background - starts from top
        const headerY = 0;
        
        // Create gradient header background - purple to pink gradient
        // Since jsPDF doesn't support gradients directly, we'll create a gradient effect with multiple rectangles
        const headerHeight = 45; // Increased header height
        const gradientSteps = 50; // More steps for smoother gradient
        const stepWidth = 210 / gradientSteps;
        
        for (let i = 0; i < gradientSteps; i++) {
          // Create smooth horizontal gradient from left purple to right pink
          const intensity = i / (gradientSteps - 1); // 0 to 1 from left to right
          
          // Start with deep purple (#667eea) and transition to bright pink (#f093fb)
          const r = Math.floor(102 + (240 - 102) * intensity);
          const g = Math.floor(126 + (147 - 126) * intensity);
          const b = Math.floor(234 + (251 - 234) * intensity);
          
          doc.setFillColor(r, g, b);
          doc.rect(i * stepWidth, headerY, stepWidth, headerHeight, 'F');
        }
        
        // School logo (circular) - fixed position on the left
        const logoX = 25; // Fixed position on the left
        doc.setFillColor('#ffffff');
        doc.circle(logoX, headerY + 22, 12, 'F'); // Adjusted for taller header
        doc.setDrawColor('#ffffff');
        doc.setLineWidth(2);
        doc.circle(logoX, headerY + 22, 12, 'S');
        
        // Logo - use actual logo from database if available
        if (instituteProfile?.logo_url) {
          try {
            // Add image to PDF
            doc.addImage(instituteProfile.logo_url, 'PNG', logoX - 12, headerY + 10, 24, 24, '', 'FAST');
          } catch (error) {
            // Fallback to text if image fails
            doc.setFontSize(7);
            doc.setTextColor('#1e293b');
            doc.setFont('helvetica', 'bold');
            doc.text((instituteProfile?.name || 'LOGO HERE').substring(0, 8), logoX, headerY + 19, { align: 'center' });
            doc.setFontSize(5);
            doc.setTextColor('#64748b');
            doc.text((instituteProfile?.location || 'SCHOOL').split(',')[0], logoX, headerY + 23, { align: 'center' });
          }
        } else {
          // Fallback to text logo
          doc.setFontSize(7);
          doc.setTextColor('#1e293b');
          doc.setFont('helvetica', 'bold');
          doc.text((instituteProfile?.name || 'LOGO HERE').substring(0, 8), logoX, headerY + 19, { align: 'center' });
          doc.setFontSize(5);
          doc.setTextColor('#64748b');
          doc.text((instituteProfile?.location || 'SCHOOL').split(',')[0], logoX, headerY + 23, { align: 'center' });
        }

        // School details - centered in the remaining space to the right of logo
        const logoAreaWidth = 25; // Further reduced width occupied by logo area
        const remainingWidth = 210 - logoAreaWidth; // Remaining space for details
        const detailsCenterX = logoAreaWidth + (remainingWidth / 2); // Center of remaining space
        
        // School name with exact on-screen styling
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        // Shadow matching on-screen: 0 2px 4px rgba(0, 0, 0, 0.3)
        doc.setTextColor('#6b7280'); // Softer gray for gentler shadow
        doc.text(instituteProfile?.name || 'School Name Here', detailsCenterX + 0.4, headerY + 15.4, { align: 'center' });
        // Main text (white, original position)
        doc.setTextColor('#ffffff');
        doc.text(instituteProfile?.name || 'School Name Here', detailsCenterX, headerY + 15, { align: 'center' });

        // Address with subtle 3D shadow effect
        doc.setFontSize(13);
        doc.setFont('helvetica', 'normal');
        // Shadow (softer color, smaller offset)
        doc.setTextColor('#4a5568');
        doc.text(instituteProfile?.location || 'Address Here - Contact Number', detailsCenterX + 0.2, headerY + 25.2, { align: 'center' });
        // Main text (white, original position)
        doc.setTextColor('#ffffff');
        doc.text(instituteProfile?.location || 'Address Here - Contact Number', detailsCenterX, headerY + 25, { align: 'center' });

        // Tagline with subtle 3D shadow effect
        doc.setFontSize(12);
        doc.setFont('helvetica', 'italic');
        // Shadow (softer color, smaller offset)
        doc.setTextColor('#4a5568');
        doc.text(instituteProfile?.tagline || 'Tagline Here', detailsCenterX + 0.2, headerY + 35.2, { align: 'center' });
        // Main text (white, original position)
        doc.setTextColor('#ffffff');
        doc.text(instituteProfile?.tagline || 'Tagline Here', detailsCenterX, headerY + 35, { align: 'center' });

        // Certificate title section - smaller width, perfectly centered
        const titleY = headerY + headerHeight + 10; // Adjusted for taller header
        const buttonWidth = 80; // Reduced width for tighter fit
        const buttonHeight = 12; // Smaller height
        const buttonX = (210 - buttonWidth) / 2; // Center the button
        
        // Light purple rounded rectangle background (no border, no shadow)
        doc.setFillColor('#c084fc'); // Light purple color
        doc.roundedRect(buttonX, titleY - 6, buttonWidth, buttonHeight, 2, 2, 'F');

        // Certificate title - perfectly centered in smaller button
        doc.setFontSize(12);
        doc.setTextColor('#ffffff'); // White text on purple background
        doc.setFont('helvetica', 'bold');
        const textCenterX = buttonX + (buttonWidth / 2); // Perfect center calculation
        const textCenterY = titleY - 6 + (buttonHeight / 2) + 2; // Perfect vertical center with offset
        doc.text('DETAILED MARKS CERTIFICATE', textCenterX, textCenterY, { align: 'center' });

        // Examination details - separate text below button
        doc.setFontSize(11);
        doc.setTextColor('#64748b'); // Dark gray text
        doc.setFont('helvetica', 'normal');
        doc.text(dmc.examination, 105, titleY + 12, { align: 'center' });

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
        doc.setDrawColor('#e2e8f0');
        doc.setLineWidth(0.5); // Lighter border
        doc.roundedRect(startX, startY, boxWidth, boxHeight, 1, 1, 'S');
        
        // Class box (top right)
        doc.setFillColor('#ffffff');
        doc.roundedRect(startX + boxWidth + boxSpacing, startY, boxWidth, boxHeight, 1, 1, 'F');
        doc.setDrawColor('#e2e8f0');
        doc.setLineWidth(0.5); // Lighter border
        doc.roundedRect(startX + boxWidth + boxSpacing, startY, boxWidth, boxHeight, 1, 1, 'S');
        
        // Name box (bottom left)
        doc.setFillColor('#ffffff');
        doc.roundedRect(startX, startY + boxHeight + verticalSpacing, boxWidth, boxHeight, 1, 1, 'F');
        doc.setDrawColor('#e2e8f0');
        doc.setLineWidth(0.5); // Lighter border
        doc.roundedRect(startX, startY + boxHeight + verticalSpacing, boxWidth, boxHeight, 1, 1, 'S');
        
        // Father's Name box (bottom right)
        doc.setFillColor('#ffffff');
        doc.roundedRect(startX + boxWidth + boxSpacing, startY + boxHeight + verticalSpacing, boxWidth, boxHeight, 1, 1, 'F');
        doc.setDrawColor('#e2e8f0');
        doc.setLineWidth(0.5); // Lighter border
        doc.roundedRect(startX + boxWidth + boxSpacing, startY + boxHeight + verticalSpacing, boxWidth, boxHeight, 1, 1, 'S');

        // Student details in individual boxes
        doc.setFontSize(10); // Increased text size
        doc.setTextColor('#1e293b');
        
        // Roll No - single line, centered vertically (top left)
        doc.setFont('helvetica', 'normal');
        doc.text('ROLL NO:', startX + 5, startY + 8);
        doc.setFontSize(11); // Larger font for database values
        doc.setFont('helvetica', 'bold');
        doc.text(dmc.roll_number, startX + 25, startY + 8);

        // Class - single line, centered vertically (top right)
        doc.setFontSize(10); // Reset to normal for label
        doc.setFont('helvetica', 'normal');
        doc.text('CLASS:', startX + boxWidth + boxSpacing + 5, startY + 8);
        doc.setFontSize(11); // Larger font for database values
        doc.setFont('helvetica', 'bold');
        doc.text(`${dmc.class} (${dmc.section})`, startX + boxWidth + boxSpacing + 25, startY + 8);

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
        
        // Add 9 subject rows with red circles for low marks and A
        for (let j = 0; j < 9; j++) {
          const subject = dmc.subjects[j];
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
          } else {
            tableData.push(['', '', '', '']);
          }
        }

        // Add 10th subject row (empty)
        tableData.push(['', '', '', '']);
        
        // Add total row
        tableData.push([
          '',
          'Total Marks:',
          dmc.total_marks.toString(),
          dmc.obtained_marks.toString()
        ]);

        // Create the table with clean styling - positioned after details grid
        autoTable(doc, {
          startY: tableY,
          margin: { left: tableStartX, right: 210 - tableStartX - tableWidth },
          tableWidth: 'wrap',
          head: [['S. No', 'SUBJECTS', 'TOTAL MARKS', 'MARKS OBTAINED']],
          body: tableData,
          styles: {
            fontSize: 10,
            cellPadding: 3,
            lineColor: '#e2e8f0',
            lineWidth: 0.5,
            textColor: '#1e293b',
            fillColor: '#ffffff'
          },
          headStyles: {
            fillColor: '#c084fc',
            textColor: '#ffffff',
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center'
          },
          alternateRowStyles: {
            fillColor: '#f8f9fa'
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
                needsRedCircle = percentage < 40;
              }
              
              if (needsRedCircle) {
                // Clear the cell content first to prevent doubling
                doc.setFillColor('#ffffff');
                doc.rect(cell.x, cell.y, cell.width, cell.height, 'F');
                
                // Draw small red outline circle
                const centerX = cell.x + cell.width / 2;
                const centerY = cell.y + cell.height / 2;
                const radius = 4; // Much smaller radius
                
                // Red outline circle (not filled)
                doc.setDrawColor('#dc2626');
                doc.setLineWidth(0.5); // Thinner outline
                doc.circle(centerX, centerY, radius, 'S');
                
                // Perfectly center the text inside the circle
                doc.setTextColor('#1e293b');
                doc.setFontSize(9); // Slightly smaller font for better fit
                doc.setFont('helvetica', 'normal');
                doc.text(marks, centerX, centerY, { align: 'center', baseline: 'middle' });
                
                // Return true to prevent autoTable from drawing the cell content
                return true;
              }
            }
            
            // Bold styling for total marks row (row index 10)
            if (data.row.index === 10) {
              const cell = data.cell;
              const text = data.cell.raw;
              
              // Clear the cell content first
              doc.setFillColor('#ffffff');
              doc.rect(cell.x, cell.y, cell.width, cell.height, 'F');
              
              // Draw bold text
              doc.setTextColor('#1e293b');
              doc.setFontSize(10);
              doc.setFont('helvetica', 'bold');
              doc.text(text, cell.x + cell.width / 2, cell.y + cell.height / 2, { align: 'center', baseline: 'middle' });
              
              // Return true to prevent autoTable from drawing the cell content
              return true;
            }
          }
        });

        // Add watermark logo after table (smaller, positioned to not interfere)
        const watermarkSize = 60; // Smaller size to not interfere with table
        const watermarkX = 105; // Center horizontally (50% of 210mm)
        const watermarkY = tableY + 20; // Position higher to avoid table data
        
        // Use same logo logic as header - check if logo_url exists
        if (instituteProfile?.logo_url) {
          try {
            // Add the actual logo image to the watermark (no overlay)
            doc.addImage(
              instituteProfile.logo_url,
              'PNG', // Try PNG first
              watermarkX - watermarkSize/2, // Center the image
              watermarkY - watermarkSize/2, // Center the image
              watermarkSize, // Smaller size
              watermarkSize, // Smaller size
              undefined,
              'FAST' // Fast rendering
            );
          } catch (error) {
            // Try JPEG if PNG fails
            try {
              doc.addImage(
                instituteProfile.logo_url,
                'JPEG', // Try JPEG format
                watermarkX - watermarkSize/2, // Center the image
                watermarkY - watermarkSize/2, // Center the image
                watermarkSize, // Smaller size
                watermarkSize, // Smaller size
                undefined,
                'FAST' // Fast rendering
              );
            } catch (error2) {
              // Try without format specification
              try {
                doc.addImage(
                  instituteProfile.logo_url,
                  watermarkX - watermarkSize/2, // Center the image
                  watermarkY - watermarkSize/2, // Center the image
                  watermarkSize, // Smaller size
                  watermarkSize // Smaller size
                );
              } catch (error3) {
                // If all attempts fail, fallback to text version
                doc.setFontSize(24);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor('#94a3b8'); // Light gray for watermark effect
                
                // School name (top part)
                const schoolName = (instituteProfile?.name || 'AL-HARAM').substring(0, 8);
                doc.text(schoolName, watermarkX, watermarkY - 15, { align: 'center' });
                
                // Location (bottom part)
                doc.setFontSize(18);
                doc.setTextColor('#cbd5e1'); // Even lighter gray
                doc.setFont('helvetica', 'normal');
                const location = (instituteProfile?.location || 'BALU SHARIF').split(',')[0];
                doc.text(location, watermarkX, watermarkY + 15, { align: 'center' });
              }
            }
          }
        } else {
          // Fallback text version (same as header fallback)
          doc.setFontSize(24);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor('#94a3b8'); // Light gray for watermark effect
          
          // School name (top part)
          const schoolName = (instituteProfile?.name || 'AL-HARAM').substring(0, 8);
          doc.text(schoolName, watermarkX, watermarkY - 15, { align: 'center' });
          
          // Location (bottom part)
          doc.setFontSize(18);
          doc.setTextColor('#cbd5e1'); // Even lighter gray
          doc.setFont('helvetica', 'normal');
          const location = (instituteProfile?.location || 'BALU SHARIF').split(',')[0];
          doc.text(location, watermarkX, watermarkY + 15, { align: 'center' });
        }

        // Professional 2-Column Summary Section
        const finalY = (doc as any).lastAutoTable.finalY + 3;
        const summaryY = finalY + 2;
        
        // Center the entire summary section
        const totalSectionWidth = 170; // Total width of both columns
        const sectionStartX = (210 - totalSectionWidth) / 2; // Center on A4 page (210mm width)
        
        // Left Column: Signature Fields
        const leftColumnX = sectionStartX;
        const signatureBoxWidth = 75;
        const signatureBoxHeight = 18; // Match summary box height
        const signatureSpacing = 5; // Match summary box spacing
        
        // Class Teacher Signature Box
        doc.setFillColor('#f8f9fa');
        doc.roundedRect(leftColumnX, summaryY, signatureBoxWidth, signatureBoxHeight, 2, 2);
        doc.setDrawColor('#e5e7eb');
        doc.setLineWidth(0.5);
        doc.roundedRect(leftColumnX, summaryY, signatureBoxWidth, signatureBoxHeight, 2, 2);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#6b7280');
        doc.text('CLASS TEACHER', leftColumnX + signatureBoxWidth/2, summaryY + 5, { align: 'center' });
        
        doc.setDrawColor('#dc2626');
        doc.setLineWidth(0.5);
        doc.line(leftColumnX + 8, summaryY + 15, leftColumnX + signatureBoxWidth - 8, summaryY + 15);
        
        // Examiner Signature Box
        const examinerY = summaryY + signatureBoxHeight + signatureSpacing;
        doc.setFillColor('#f8f9fa');
        doc.roundedRect(leftColumnX, examinerY, signatureBoxWidth, signatureBoxHeight, 2, 2);
        doc.setDrawColor('#e5e7eb');
        doc.setLineWidth(0.5);
        doc.roundedRect(leftColumnX, examinerY, signatureBoxWidth, signatureBoxHeight, 2, 2);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#6b7280');
        doc.text('EXAMINER', leftColumnX + signatureBoxWidth/2, examinerY + 5, { align: 'center' });
        
        doc.setDrawColor('#dc2626');
        doc.setLineWidth(0.5);
        doc.line(leftColumnX + 8, examinerY + 15, leftColumnX + signatureBoxWidth - 8, examinerY + 15);
        
        // Right Column: 2x2 Grid of Summary Boxes
        const rightColumnX = sectionStartX + signatureBoxWidth + 10; // 10mm gap between columns
        const rightColumnWidth = 80;
        const summaryBoxWidth = 40;
        const summaryBoxHeight = 18;
        const summaryBoxSpacing = 5;
        
        // Row 1: Position and Percentage
        const row1Y = summaryY;
        
        // Position Box (Top Left)
        doc.setFillColor('#f8f9fa');
        doc.roundedRect(rightColumnX, row1Y, summaryBoxWidth, summaryBoxHeight, 2, 2);
        doc.setDrawColor('#e5e7eb');
        doc.setLineWidth(0.5);
        doc.roundedRect(rightColumnX, row1Y, summaryBoxWidth, summaryBoxHeight, 2, 2);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#6b7280');
        doc.text('POSITION', rightColumnX + summaryBoxWidth/2, row1Y + 5, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#1e293b');
        doc.text(dmc.position === 1 ? '1st' : 
                 dmc.position === 2 ? '2nd' : 
                 dmc.position === 3 ? '3rd' : 
                 `${dmc.position}th`, rightColumnX + summaryBoxWidth/2, row1Y + 13, { align: 'center' });
        
        // Percentage Box (Top Right)
        const percentageX = rightColumnX + summaryBoxWidth + summaryBoxSpacing;
        doc.setFillColor('#f8f9fa');
        doc.roundedRect(percentageX, row1Y, summaryBoxWidth, summaryBoxHeight, 2, 2);
        doc.setDrawColor('#e5e7eb');
        doc.setLineWidth(0.5);
        doc.roundedRect(percentageX, row1Y, summaryBoxWidth, summaryBoxHeight, 2, 2);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#6b7280');
        doc.text('PERCENTAGE', percentageX + summaryBoxWidth/2, row1Y + 5, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#1e293b');
        doc.text(`${dmc.percentage.toFixed(1)}%`, percentageX + summaryBoxWidth/2, row1Y + 13, { align: 'center' });
        
        // Row 2: Grade and Attendance
        const row2Y = row1Y + summaryBoxHeight + summaryBoxSpacing;
        
        // Grade Box (Bottom Left)
        doc.setFillColor('#f8f9fa');
        doc.roundedRect(rightColumnX, row2Y, summaryBoxWidth, summaryBoxHeight, 2, 2);
        doc.setDrawColor('#e5e7eb');
        doc.setLineWidth(0.5);
        doc.roundedRect(rightColumnX, row2Y, summaryBoxWidth, summaryBoxHeight, 2, 2);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#6b7280');
        doc.text('GRADE', rightColumnX + summaryBoxWidth/2, row2Y + 5, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#1e293b');
        doc.text(dmc.grade, rightColumnX + summaryBoxWidth/2, row2Y + 13, { align: 'center' });
        
        // Attendance Box (Bottom Right)
        doc.setFillColor('#f8f9fa');
        doc.roundedRect(percentageX, row2Y, summaryBoxWidth, summaryBoxHeight, 2, 2);
        doc.setDrawColor('#e5e7eb');
        doc.setLineWidth(0.5);
        doc.roundedRect(percentageX, row2Y, summaryBoxWidth, summaryBoxHeight, 2, 2);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#6b7280');
        doc.text('ATTENDANCE', percentageX + summaryBoxWidth/2, row2Y + 5, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#1e293b');
        // Calculate attendance percentage from student's attendance records (temporarily disabled)
        // const attendancePercentage = await calculateStudentAttendancePercentage(dmc.student_id);
        const attendancePercentage = 85; // Temporary fixed value
        doc.text(`${attendancePercentage}%`, percentageX + summaryBoxWidth/2, row2Y + 13, { align: 'center' });

        // Footer accent bar (matching header gradient exactly)
        const footerY = 290;
        const footerHeight = 7;
        
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
      }

      // Save the PDF
      const fileName = `DMC_${selectedClass?.name}_${selectedSection?.name}_${selectedExamination?.name}_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(fileName);

      toast.success(`PDF exported successfully with ${allDmcData.length} DMCs!`, { id: 'pdf-export' });

    } catch (error) {
      toast.error('Failed to generate PDF', { id: 'pdf-export' });
    }
  };

  const handleExportExcel = () => {
    if (!allDmcData || allDmcData.length === 0) {
      toast.error('No DMC data to export');
      return;
    }
    // TODO: Implement Excel export for all DMCs
    toast.success('Excel export functionality will be implemented');
  };

  return (
    <PageContainer theme={theme}>
      <Header>
        <HeaderRow>
          <Title>
            <AssessmentIcon style={{ fontSize: 20 }} />
            Detailed Marks Certificate
          </Title>
          <HeaderFilters>
            <SegmentedGroup>
              <SegmentedSelect
                value={selectedExamination?.id || ''}
                onChange={(e) => {
                  const exam = examinations.find(ex => ex.id === Number(e.target.value));
                  setSelectedExamination(exam || null);
                }}
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
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </SegmentedSelect>
              
              <SegmentedSelect
                value={selectedSection?.id || ''}
                onChange={(e) => {
                  const sectionId = Number(e.target.value);
                  const selected = sections.find(s => s.id === sectionId);
                  setSelectedSection(selected || null);
                }}
                disabled={!selectedClass}
              >
                <option value="">All Sections</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </SegmentedSelect>
              
              <SegmentedButton
                onClick={() => {
                  if (selectedExamination && selectedClass && selectedSection) {
                    loadDMCData();
                  }
                }}
                disabled={!selectedExamination || !selectedClass || !selectedSection || loading}
              >
                {loading ? 'Loading...' : 'Generate DMC'}
              </SegmentedButton>
              
              {dmcData && (
                <>
                  <SegmentedButton
                    onClick={handleExportPDF}
                    disabled={!dmcData}
                  >
                    <PictureAsPdf style={{ fontSize: 16 }} />
                    PDF
                  </SegmentedButton>
                  
                  <SegmentedButton
                    onClick={handleExportExcel}
                    disabled={!dmcData}
                    last
                  >
                    <DownloadIcon style={{ fontSize: 16 }} />
                    Excel
                  </SegmentedButton>
                </>
              )}
            </SegmentedGroup>
          </HeaderFilters>
        </HeaderRow>
      </Header>

      <MainContent>
        {loading && (
          <LoadingContainer>
            Loading Detailed Marks Certificate...
          </LoadingContainer>
        )}

        {error && (
          <ErrorContainer>
            {error}
          </ErrorContainer>
        )}

        {dmcData && !loading && (
          <ScrollableTableContainer>
              <CertificateContainer ref={certificateRef}>
            {/* Watermark Logo */}
            <div style={{
              position: 'absolute',
              top: '54.4%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: 0.12,
              zIndex: 0,
              pointerEvents: 'none'
            }}>
              <SchoolLogo style={{ 
                width: '500px', 
                height: '500px'
              }}>
                {instituteProfile?.logo_url ? (
                  <img 
                    src={instituteProfile.logo_url} 
                    alt="School Logo"
                  />
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    lineHeight: '1.1',
                    fontSize: '28px',
                    fontWeight: '700',
                    color: '#1e293b'
                  }}>
                    <div style={{ marginBottom: '10px' }}>
                      {instituteProfile?.name?.substring(0, 8) || 'AL-HARAM'}
                    </div>
                    <div style={{ fontSize: '18px', color: '#64748b', fontWeight: '500' }}>
                      {instituteProfile?.location?.split(',')[0] || 'BALU SHARIF'}
                    </div>
                  </div>
                )}
              </SchoolLogo>
            </div>

            <CertificateHeader>
              <HeaderLeft>
                <SchoolLogo>
                  {instituteProfile?.logo_url ? (
                    <img 
                      src={instituteProfile.logo_url} 
                      alt="School Logo"
                    />
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      lineHeight: '1.1',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#1e293b'
                    }}>
                      <div style={{ marginBottom: '2px' }}>
                        {instituteProfile?.name?.substring(0, 8) || 'AL-HARAM'}
                      </div>
                      <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '500' }}>
                        {instituteProfile?.location?.split(',')[0] || 'BALU SHARIF'}
                      </div>
                    </div>
                  )}
                </SchoolLogo>
              </HeaderLeft>
              
              <HeaderRight>
                <SchoolName>
                  {instituteProfile?.name || 'AL-HARAM PUBLIC SCHOOL & IQRA ACADEMY'}
                </SchoolName>
                <SchoolLocation>
                  {instituteProfile?.location || 'BALU SHARIF DISTT. NOWSHERA - +92-300-1234567'}
                </SchoolLocation>
                <SchoolTagline>
                  {instituteProfile?.tagline || 'Excellence in Education'}
                </SchoolTagline>
              </HeaderRight>
            </CertificateHeader>
            
            <div style={{ 
              textAlign: 'center', 
              padding: '16px 24px', 
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <CertificateTitle>Detailed Marks Certificate</CertificateTitle>
              <ExaminationDetails>
                {selectedExamination?.name || 'Select Examination'}
              </ExaminationDetails>
            </div>

            <StudentInfo>
              <div>
                <InfoRow>
                  <InfoLabel>Roll No:</InfoLabel>
                  <InfoValue>{dmcData.roll_number}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Name:</InfoLabel>
                  <InfoValue>{dmcData.student_name}</InfoValue>
                </InfoRow>
              </div>
              <div>
                <InfoRow>
                  <InfoLabel>Class:</InfoLabel>
                  <InfoValue>{dmcData.class} ({dmcData.section})</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>F/Name:</InfoLabel>
                  <InfoValue>{dmcData.father_name}</InfoValue>
                </InfoRow>
              </div>
            </StudentInfo>

            <MarksTable>
              <thead>
                <tr>
                  <TableHeader>S. No</TableHeader>
                  <TableHeader>SUBJECTS</TableHeader>
                  <TableHeader>TOTAL MARKS</TableHeader>
                  <TableHeader>MARKS OBTAINED</TableHeader>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 9 }, (_, index) => {
                  const subject = dmcData.subjects[index];
                  return (
                    <TableRow key={index}>
                      <TableCell $isEven={index % 2 === 0}>
                        {subject ? index + 1 : ''}
                      </TableCell>
                      <SubjectCell $isEven={index % 2 === 0}>
                        {subject ? subject.name : ''}
                      </SubjectCell>
                      <TableCell $isEven={index % 2 === 0}>
                        {subject ? subject.total_marks : ''}
                      </TableCell>
            <TableCell $isEven={index % 2 === 0}>
              {subject ? (
                (subject.obtained_marks === 'A' || subject.obtained_marks === 'Absent') ? (
                  <span style={{
                    display: 'inline-block',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: '2px solid #dc2626',
                    backgroundColor: 'transparent',
                    color: '#dc2626',
                    textAlign: 'center',
                    lineHeight: '20px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    A
                  </span>
                ) : (
                  (typeof subject.obtained_marks === 'number' && subject.obtained_marks < 40) ? (
                    <span style={{
                      display: 'inline-block',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: '2px solid #f59e0b',
                      backgroundColor: 'transparent',
                      color: '#f59e0b',
                      textAlign: 'center',
                      lineHeight: '20px',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}>
                      {subject.obtained_marks}
                    </span>
                  ) : (
                    subject.obtained_marks
                  )
                )
              ) : ''}
            </TableCell>
                    </TableRow>
                  );
                })}
                 <TotalRow>
                   <td style={{ textAlign: 'center', fontWeight: 'bold' }}></td>
                   <td style={{ textAlign: 'left', fontWeight: 'bold' }}>Total Marks:</td>
                   <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{dmcData.total_marks}</td>
                   <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{dmcData.obtained_marks}</td>
                 </TotalRow>
              </tbody>
            </MarksTable>

            <SummarySection $subjectCount={dmcData.subjects.filter(s => s !== null).length}>
              <SummaryItem $subjectCount={dmcData.subjects.filter(s => s !== null).length}>
                <SummaryLabel $subjectCount={dmcData.subjects.filter(s => s !== null).length}>Position</SummaryLabel>
                <SummaryValue $subjectCount={dmcData.subjects.filter(s => s !== null).length}>
                  {dmcData.position === 1 ? '1st' : 
                   dmcData.position === 2 ? '2nd' : 
                   dmcData.position === 3 ? '3rd' : 
                   `${dmcData.position}th`}
                </SummaryValue>
              </SummaryItem>
              <SummaryItem $subjectCount={dmcData.subjects.filter(s => s !== null).length}>
                <SummaryLabel $subjectCount={dmcData.subjects.filter(s => s !== null).length}>Percentage</SummaryLabel>
                <SummaryValue $subjectCount={dmcData.subjects.filter(s => s !== null).length}>{dmcData.percentage}%</SummaryValue>
              </SummaryItem>
              <SummaryItem $subjectCount={dmcData.subjects.filter(s => s !== null).length}>
                <SummaryLabel $subjectCount={dmcData.subjects.filter(s => s !== null).length}>Grade</SummaryLabel>
                <SummaryValue $subjectCount={dmcData.subjects.filter(s => s !== null).length}>{dmcData.grade}</SummaryValue>
              </SummaryItem>
            </SummarySection>

            <Footer $subjectCount={dmcData.subjects.filter(s => s !== null).length}>
              <SignatureBox $subjectCount={dmcData.subjects.filter(s => s !== null).length}>
                <SignatureLabel $subjectCount={dmcData.subjects.filter(s => s !== null).length}>Class Teacher</SignatureLabel>
                <SignatureLine $subjectCount={dmcData.subjects.filter(s => s !== null).length}></SignatureLine>
              </SignatureBox>
              <SignatureBox $subjectCount={dmcData.subjects.filter(s => s !== null).length}>
                <SignatureLabel $subjectCount={dmcData.subjects.filter(s => s !== null).length}>Principal</SignatureLabel>
                <SignatureLine $subjectCount={dmcData.subjects.filter(s => s !== null).length}></SignatureLine>
              </SignatureBox>
            </Footer>
              </CertificateContainer>
            </ScrollableTableContainer>
        )}

        {!dmcData && !loading && !error && (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 40px', 
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            borderRadius: '12px',
            margin: '20px 0'
          }}>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: '600', 
              color: '#1e293b', 
              marginBottom: '12px' 
            }}>
              DMC Template Preview
            </div>
            <div style={{ 
              fontSize: '16px', 
              color: '#64748b', 
              marginBottom: '24px' 
            }}>
              Select class, section, examination, and template to generate DMC
            </div>
            <div style={{ 
              display: 'flex', 
              gap: '16px', 
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <div style={{ 
                padding: '16px 24px', 
                background: 'white', 
                borderRadius: '8px',
                border: '2px solid #e2e8f0',
                minWidth: '120px'
              }}>
                <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>Modern</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Clean & Professional</div>
              </div>
              <div style={{ 
                padding: '16px 24px', 
                background: 'white', 
                borderRadius: '8px',
                border: '2px solid #e2e8f0',
                minWidth: '120px'
              }}>
                <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>Classic</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Traditional Design</div>
              </div>
              <div style={{ 
                padding: '16px 24px', 
                background: 'white', 
                borderRadius: '8px',
                border: '2px solid #e2e8f0',
                minWidth: '120px'
              }}>
                <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>Minimal</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Simple & Clean</div>
              </div>
            </div>
          </div>
        )}

        {/* Minimal Footer with Navigation */}
        {dmcData && allDmcData.length > 1 && (
          <PageFooter>
            <SummaryStats>
              <StatItem>
                <StatValue $type="total">{allDmcData.length}</StatValue>
                <StatLabel>Total Students</StatLabel>
              </StatItem>
              <StatItem>
                <StatValue $type="average">{currentStudentIndex + 1}</StatValue>
                <StatLabel>Current</StatLabel>
              </StatItem>
              <StatItem>
                <StatValue $type="pass">{dmcData.student_name}</StatValue>
                <StatLabel>Student</StatLabel>
              </StatItem>
            </SummaryStats>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                onClick={prevStudent} 
                disabled={currentStudentIndex === 0}
                style={{ 
                  padding: '4px 8px', 
                  fontSize: '0.7rem',
                  border: 'none',
                  borderRadius: '4px',
                  background: currentStudentIndex === 0 ? '#e2e8f0' : '#3b82f6',
                  color: currentStudentIndex === 0 ? '#9ca3af' : 'white',
                  cursor: currentStudentIndex === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentStudentIndex === 0 ? 0.5 : 1
                }}
              >
                ← Prev
              </button>
              
              <span style={{ 
                fontSize: '0.7rem', 
                color: '#64748b',
                minWidth: '60px',
                textAlign: 'center'
              }}>
                {currentStudentIndex + 1} / {allDmcData.length}
              </span>
              
              <button 
                onClick={nextStudent} 
                disabled={currentStudentIndex === allDmcData.length - 1}
                style={{ 
                  padding: '4px 8px', 
                  fontSize: '0.7rem',
                  border: 'none',
                  borderRadius: '4px',
                  background: currentStudentIndex === allDmcData.length - 1 ? '#e2e8f0' : '#3b82f6',
                  color: currentStudentIndex === allDmcData.length - 1 ? '#9ca3af' : 'white',
                  cursor: currentStudentIndex === allDmcData.length - 1 ? 'not-allowed' : 'pointer',
                  opacity: currentStudentIndex === allDmcData.length - 1 ? 0.5 : 1
                }}
              >
                Next →
              </button>
            </div>
          </PageFooter>
        )}
      </MainContent>
    </PageContainer>
  );
};

export default DetailedMarksCertificate;

