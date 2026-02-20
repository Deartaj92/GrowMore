import React, { useState, useEffect, useContext, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';
import { ThemeContext, darkTheme, lightTheme } from '../contexts/ThemeContext';
import { examinationService } from '../services/examinationService';
import { Examination } from '../types/examinations';
import { useLoading } from '../contexts/LoadingContext';
import { usePageFooter } from './Layout/contexts/PageFooterContext';
import {
  EmojiEvents as TrophyIcon,
  School as SchoolIcon,
  Class as ClassIcon,
  Person as PersonIcon,
  Star as StarIcon,
  Close as CloseIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  PictureAsPdf,
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getStudentDisplayId } from '../utils/studentUtils';
import Loader from './Loader';

// Spinner animation
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// Pulse animation
const pulse = keyframes`
  0%, 100% { 
    opacity: 1;
    transform: scale(1);
  }
  50% { 
    opacity: 0.5;
    transform: scale(0.8);
  }
`;

const Spinner = styled.div`
  width: 12px;
  height: 12px;
  border: 2px solid #ffffff40;
  border-top: 2px solid #ffffff;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

// Styled components matching other examination components
const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 8px 0 8px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  height: 100%;
  min-height: 0;
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

// Enhanced Header Components (matching other components)
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

const SegmentedSelect = styled.select<{ first?: boolean; $last?: boolean }>`
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
  ${({ $last }) => $last && `
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

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  @media (max-width: 480px) {
    gap: 12px;
  }
`;

const MainContent = styled.div`
  flex: 1;
  min-height: 0;
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

const ScrollableContainer = styled.div`
  flex: 1;
  overflow: auto;
  border-radius: 8px;
`;

const ClassesGrid = styled.div<{ cardCount: number }>`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
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
  
  /* Limit to maximum 4 columns */
  @media (min-width: 1200px) {
    grid-template-columns: repeat(4, 1fr);
  }
  
  @media (max-width: 1199px) and (min-width: 900px) {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 0.8rem;
  }
  
  @media (max-width: 900px) {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 0.8rem;
  }
  
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 0.8rem;
    padding: 4px 0 8px 0;
  }
`;

const ClassCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1rem 1rem 0.8rem 1rem;
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 2px solid ${({ theme }) => theme.BORDER};
  position: relative;
  overflow: visible;
  margin-bottom: 0.5rem;
  min-width: 220px;
  width: 100%;
  transition: border 0.4s cubic-bezier(0.4,0,0.2,1);

  &:hover {
    border-color: #4a6cf7;
    box-shadow: none;
    transform: none;
  }
  
  @media (max-width: 700px) {
    padding: 0.8rem 0.8rem 0.6rem 0.8rem;
    margin-bottom: 0.3rem;
    min-width: 200px;
  }
`;

const ClassHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.8rem;
`;

const ClassTitle = styled.h3`
  font-size: 1.4rem;
  font-weight: 800;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  letter-spacing: 0.3px;
`;

const ClassSubtitle = styled.p`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0.2rem 0 0.5rem;
  font-size: 0.8rem;
`;

const PositionHoldersList = styled.div`
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 350px;
  overflow-y: auto;
  padding-right: 8px;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 12px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f0f0f0'};
    border-radius: 6px;
    border: 2px solid ${({ theme }) => theme.BORDER};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? '#4a6cf7' : '#4a6cf7'};
    border-radius: 6px;
    border: 2px solid ${({ theme }) => theme.BG === '#252525' ? '#3a5ce5' : '#3a5ce5'};
    transition: background 0.2s ease;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#3a5ce5' : '#3a5ce5'};
  }
  
  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #4a6cf7 ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f0f0f0'};
`;

const PositionHolder = styled.div<{ $position: number }>`
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 8px;
  margin-bottom: 0.5rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f8f9fa'};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const Avatar = styled.div<{ $position: number }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 700;
  margin-right: 12px;
  background: ${({ $position }) => {
    if ($position === 1) return 'linear-gradient(135deg, #22c55e, #16a34a)';
    if ($position === 2) return 'linear-gradient(135deg, #3b82f6, #2563eb)';
    if ($position === 3) return 'linear-gradient(135deg, #f97316, #ea580c)';
    return 'linear-gradient(135deg, #6b7280, #4b5563)';
  }};
  color: #ffffff;
  border: 2px solid ${({ $position }) => {
    if ($position === 1) return '#16a34a';
    if ($position === 2) return '#2563eb';
    if ($position === 3) return '#ea580c';
    return '#9ca3af';
  }};
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const PositionBadge = styled.div<{ $position: number }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 800;
  margin-left: auto;
  background: ${({ $position }) => {
    if ($position === 1) return 'linear-gradient(135deg, #22c55e, #16a34a)';
    if ($position === 2) return 'linear-gradient(135deg, #3b82f6, #2563eb)';
    if ($position === 3) return 'linear-gradient(135deg, #f97316, #ea580c)';
    return 'linear-gradient(135deg, #6b7280, #4b5563)';
  }};
  color: #ffffff;
  border: 2px solid ${({ $position }) => {
    if ($position === 1) return '#16a34a';
    if ($position === 2) return '#2563eb';
    if ($position === 3) return '#ea580c';
    return '#9ca3af';
  }};
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
`;

const StudentInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-right: 12px;
`;

const StudentName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  margin-bottom: 1px;
`;

const StudentDetails = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
`;

const StudentId = styled.span`
  background: ${({ theme }) => theme.BG === '#252525' ? '#333' : '#f1f3f4'};
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 500;
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const ScoreInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  margin-right: 12px;
`;

const ScoreValue = styled.div<{ $position: number }>`
  font-weight: 700;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const ScoreLabel = styled.div`
  font-size: 0.65rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const PositionCounts = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 4px;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    gap: 8px;
    margin-top: 0;
    justify-content: center; /* Center position counts on mobile */
    flex: 1;
  }
  
  @media (max-width: 480px) {
    gap: 6px;
    margin-top: 0;
  }
`;

const PositionCount = styled.div<{ $position: number }>`
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  
  @media (max-width: 768px) {
    padding: 1px 4px;
    font-size: 0.6rem;
    gap: 2px;
  }
  
  @media (max-width: 480px) {
    padding: 1px 3px;
    font-size: 0.55rem;
    gap: 1px;
  }
  background: ${({ $position, theme }) => {
    switch ($position) {
      case 1: return theme.BG === '#252525' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)';
      case 2: return theme.BG === '#252525' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)';
      case 3: return theme.BG === '#252525' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.1)';
      default: return theme.FIELD_BG;
    }
  }};
  color: ${({ $position, theme }) => {
    switch ($position) {
      case 1: return '#22c55e';
      case 2: return '#3b82f6';
      case 3: return '#f97316';
      default: return theme.TEXT_PRIMARY;
    }
  }};
  border: 1px solid ${({ $position, theme }) => {
    switch ($position) {
      case 1: return 'rgba(34, 197, 94, 0.3)';
      case 2: return 'rgba(59, 130, 246, 0.3)';
      case 3: return 'rgba(249, 115, 22, 0.3)';
      default: return theme.BORDER;
    }
  }};
`;

const PositionCountLabel = styled.span`
  font-weight: 700;
`;

const PositionCountValue = styled.span`
  font-weight: 800;
  font-size: 0.7rem;
`;

// Footer Components (kept for use in global footer)
const SummaryStats = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    display: none; /* Hide on mobile devices */
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
    if ($type === 'classes') return '#16a34a';
    if ($type === 'students') return '#3b82f6';
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

const NoResults = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1.1rem;
  margin: 48px 0;
  padding: 40px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  background: ${({ variant, theme }) => {
    if (variant === 'primary') {
      return '#4a6cf7';
    } else {
      return theme.BG === '#252525' ? '#333' : '#f3f4f6';
    }
  }};
  color: ${({ variant, theme }) => {
    if (variant === 'primary') {
      return 'white';
    } else {
      return theme.TEXT_PRIMARY;
    }
  }};
  border: 1px solid ${({ variant, theme }) => {
    if (variant === 'primary') {
      return '#4a6cf7';
    } else {
      return theme.BORDER;
    }
  }};

  &:hover {
    background: ${({ variant, theme }) => {
    if (variant === 'primary') {
      return '#3a5ce5';
    } else {
      return theme.BG === '#252525' ? '#444' : '#e5e7eb';
    }
  }};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const PdfButton = styled.button<{ first?: boolean; $last?: boolean }>`
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
  ${({ $last }) => $last && `
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#555' : '#f3f4f6'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
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

// Types
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

interface PositionHolder {
  student_id: number;
  student_name: string;
  father_name?: string;
  roll_number?: string;
  class_name: string;
  section_name: string;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  position: number;
  grade: string;
}

interface ClassPositionData {
  class_id: number;
  class_name: string;
  section_id: number | null;
  section_name: string;
  position_holders: PositionHolder[];
}

const PositionHolders: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { theme } = useContext(ThemeContext);
  const { setLoading, loading } = useLoading();
  const { setFooterContent } = usePageFooter();

  // State for data
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [positionData, setPositionData] = useState<ClassPositionData[]>([]);

  // Selected values
  const [selectedExam, setSelectedExam] = useState<Examination | null>(null);

  const [showToTop, setShowToTop] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 700);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load examinations
  useEffect(() => {
    if (user?.school_id) {
      loadExaminations();
    }
  }, [user?.school_id]);

  // Load position data when exam is selected
  useEffect(() => {
    if (selectedExam) {
      loadPositionData();
    }
  }, [selectedExam]);

  // Set footer content for global footer
  useEffect(() => {
    if (selectedExam && positionData.length > 0) {
      const totalStudents = positionData.reduce((sum, classData) => sum + classData.position_holders.length, 0);
      const firstCount = positionData.reduce((sum, classData) =>
        sum + classData.position_holders.filter(holder => holder.position === 1).length, 0
      );
      const secondCount = positionData.reduce((sum, classData) =>
        sum + classData.position_holders.filter(holder => holder.position === 2).length, 0
      );
      const thirdCount = positionData.reduce((sum, classData) =>
        sum + classData.position_holders.filter(holder => holder.position === 3).length, 0
      );

      const FooterContentComponent = React.memo(() => (
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'center' : 'center',
          justifyContent: isMobile ? 'center' : 'space-between',
          width: '100%',
          gap: isMobile ? '0.5rem' : '1rem',
          flexWrap: isMobile ? 'nowrap' : 'wrap'
        }}>
          {/* Desktop Summary Stats - Hidden on Mobile */}
          {!isMobile && (
            <SummaryStats theme={theme === 'dark' ? darkTheme : lightTheme}>
              <StatItem theme={theme === 'dark' ? darkTheme : lightTheme}>
                <StatValue $type="classes" theme={theme === 'dark' ? darkTheme : lightTheme}>{positionData.length}</StatValue>
                <StatLabel theme={theme === 'dark' ? darkTheme : lightTheme}>Classes</StatLabel>
              </StatItem>
              <StatItem theme={theme === 'dark' ? darkTheme : lightTheme}>
                <StatValue $type="students" theme={theme === 'dark' ? darkTheme : lightTheme}>{totalStudents}</StatValue>
                <StatLabel theme={theme === 'dark' ? darkTheme : lightTheme}>Top 3 Holders</StatLabel>
              </StatItem>
              <StatItem theme={theme === 'dark' ? darkTheme : lightTheme}>
                <StatValue $type="total" theme={theme === 'dark' ? darkTheme : lightTheme}>{selectedExam.name}</StatValue>
                <StatLabel theme={theme === 'dark' ? darkTheme : lightTheme}>Examination</StatLabel>
              </StatItem>
            </SummaryStats>
          )}

          {/* Position Summary - Always Visible */}
          <PositionCounts theme={theme === 'dark' ? darkTheme : lightTheme}>
            {[1, 2, 3].map(position => {
              const totalCount = positionData.reduce((sum, classData) =>
                sum + classData.position_holders.filter(holder => holder.position === position).length, 0
              );
              if (totalCount > 0) {
                return (
                  <PositionCount key={position} $position={position} theme={theme === 'dark' ? darkTheme : lightTheme}>
                    <PositionCountLabel>
                      {position === 1 ? '1st' : position === 2 ? '2nd' : '3rd'}
                    </PositionCountLabel>
                    <PositionCountValue>- {totalCount.toString().padStart(2, '0')}</PositionCountValue>
                  </PositionCount>
                );
              }
              return null;
            })}
          </PositionCounts>
        </div>
      ));

      setFooterContent({
        visible: true,
        content: <FooterContentComponent />
      });
    } else {
      setFooterContent(null);
    }

    return () => {
      setFooterContent(null);
    };
  }, [selectedExam, positionData, isMobile, theme, setFooterContent]);

  const loadExaminations = async () => {
    try {
      setLoading(true);
      const data = await examinationService.getExaminations({}, user?.school_id);
      setExaminations(data);
    } catch (error) {
      showToast('Failed to load examinations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPositionData = async () => {
    if (!selectedExam) return;

    try {
      setLoading(true);

      // First, get all classes (both sectioned and non-sectioned)
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('id, name, has_sections')
        .eq('school_id', user?.school_id);

      if (classesError) throw classesError;

      if (!classes || classes.length === 0) {
        setPositionData([]);
        return;
      }

      // Get all sections for classes that have sections
      const { data: sections } = await supabase
        .from('sections')
        .select('id, name, class_id')
        .in('class_id', classes.map(c => c.id));

      // Create lookup maps
      const classMap = new Map(classes.map(c => [c.id, c.name]));
      const classHasSectionsMap = new Map(classes.map(c => [c.id, c.has_sections ?? true]));
      const sectionMap = new Map(sections?.map(s => [s.id, s.name]) || []);

      // Helper function to get section name for a class-section combination
      const getSectionName = (classId: number, sectionId: number | null): string => {
        if (!sectionId) return '';
        const hasSections = classHasSectionsMap.get(classId) ?? true;
        if (!hasSections) return '';
        return sectionMap.get(sectionId) || '';
      };

      // Process each class individually (following MasterSheetManager pattern)
      const positionData: ClassPositionData[] = [];

      for (const classInfo of classes) {
        const hasSections = classInfo.has_sections ?? true;

        if (hasSections) {
          // For classes with sections, process each section separately
          const classSections = sections?.filter(s => s.class_id === classInfo.id) || [];

          for (const section of classSections) {
            const classSectionData = await processClassSection(classInfo, section, hasSections, classHasSectionsMap, sectionMap);
            if (classSectionData) {
              positionData.push(classSectionData);
            }
          }
        } else {
          // For classes without sections, process the entire class
          const classData = await processClassSection(classInfo, null, hasSections, classHasSectionsMap, sectionMap);
          if (classData) {
            positionData.push(classData);
          }
        }
      }

      // Sort by class name and section
      positionData.sort((a, b) => {
        // First sort by class number
        const numA = parseInt(a.class_name.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.class_name.match(/\d+/)?.[0] || '0');

        if (numA !== numB) {
          return numA - numB;
        }

        // If same class, sort by section (A before B, then C, etc.)
        const sectionA = a.section_name || '';
        const sectionB = b.section_name || '';

        // If one has no section and other does, no section comes first
        if (!sectionA && sectionB) return -1;
        if (sectionA && !sectionB) return 1;
        if (!sectionA && !sectionB) return 0;

        // Both have sections, sort alphabetically (A, B, C, etc.)
        return sectionA.localeCompare(sectionB);
      });

      setPositionData(positionData);
    } catch (error) {
      showToast('Failed to load position data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to process each class/section (following MasterSheetManager pattern)
  const processClassSection = async (classInfo: any, section: any, hasSections: boolean, classHasSectionsMap: Map<number, boolean>, sectionMap: Map<number, string>) => {
    try {
      // Check if selectedExam exists
      if (!selectedExam) {
        return null;
      }

      // Get students for this class/section
      const studentQuery = supabase
        .from('students')
        .select('id, name, father_name, picture_url, class_id, section_id, school_id, roll_number')
        .eq('school_id', user?.school_id)
        .eq('class_id', classInfo.id);

      // Add section filter only if the class has sections
      if (hasSections && section) {
        studentQuery.eq('section_id', section.id);
      } else if (!hasSections) {
        studentQuery.is('section_id', null);
      }

      const { data: studentsData, error: studentsError } = await studentQuery;
      if (studentsError) throw studentsError;

      // Check for exclusions if an exam is selected
      let excludedIds = new Set<number>();
      if (selectedExam) {
        const { data: exclusionsData } = await supabase
          .from('exam_exclusions')
          .select('student_id')
          .eq('exam_id', selectedExam.id)
          .eq('school_id', user?.school_id);

        if (exclusionsData) {
          excludedIds = new Set(exclusionsData.map(e => e.student_id));
        }
      }

      // Filter out excluded students
      const students = (studentsData || []).filter(student => !excludedIds.has(student.id));

      if (!students || students.length === 0) {
        return null;
      }

      // Get exam results for all subjects in this exam for these students
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

      if (!examResults || examResults.length === 0) {
        return null;
      }

      // Get unique subjects that have exam results
      const subjectsWithResults = new Set();
      examResults?.forEach(result => {
        subjectsWithResults.add(result.subject_id);
      });

      // Store subjects with results for total marks calculation
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

      // Convert to array and calculate total exam marks
      const subjectsArray = Object.values(subjectsData);
      const totalExamMarks = subjectsArray.reduce((sum: number, subject: any) => sum + (subject.max_marks || 0), 0);

      // Group results by student
      const studentResults: { [studentId: number]: any[] } = {};
      examResults?.forEach(result => {
        if (!studentResults[result.student_id]) {
          studentResults[result.student_id] = [];
        }
        studentResults[result.student_id].push(result);
      });

      // Filter out students who don't have any examination records
      const studentsWithResults = students.filter(student => {
        const results = studentResults[student.id] || [];
        return results.length > 0; // Only include students who have at least one exam result
      });

      if (studentsWithResults.length === 0) {
        return null;
      }

      // Calculate position data for each student (following MasterSheetManager pattern)
      const studentTotals: any[] = [];
      studentsWithResults.forEach(student => {
        const results = studentResults[student.id] || [];
        const obtainedMarks = results.reduce((sum, r) => sum + (r.obtained_marks || 0), 0);
        const percentage = totalExamMarks > 0 ? (obtainedMarks / totalExamMarks) * 100 : 0;

        studentTotals.push({
          student_id: student.id,
          student_name: student.name,
          father_name: student.father_name,
          picture_url: student.picture_url,
          class_id: student.class_id,
          section_id: student.section_id,
          roll_number: student.roll_number,
          class_name: classInfo.name,
          section_name: hasSections ? (section?.name || '') : '',
          total_marks: totalExamMarks,
          obtained_marks: obtainedMarks,
          percentage: percentage,
          grade: calculateGrade(percentage)
        });
      });

      // Sort students by obtained marks and assign positions
      const sortedStudents = studentTotals.sort((a, b) => b.obtained_marks - a.obtained_marks);

      // Assign positions with proper handling of ties
      let currentPosition = 1;
      for (let i = 0; i < sortedStudents.length; i++) {
        const student = sortedStudents[i];
        const currentMarks = student.obtained_marks;

        // Count how many students have the same marks as current student
        let sameMarksCount = 1;
        for (let j = i + 1; j < sortedStudents.length; j++) {
          if (sortedStudents[j].obtained_marks === currentMarks) {
            sameMarksCount++;
          } else {
            break;
          }
        }

        // Assign the same position to all students with same marks
        for (let k = 0; k < sameMarksCount; k++) {
          sortedStudents[i + k].position = currentPosition;
        }

        // Move to next position (skip the tied students and increment by 1)
        i += sameMarksCount - 1;
        currentPosition = currentPosition + 1;
      }

      // Only keep top 3 position holders
      const topThreeStudents = sortedStudents.filter(student => student.position <= 3);

      return {
        class_id: classInfo.id,
        class_name: classInfo.name,
        section_id: hasSections ? (section?.id || null) : null,
        section_name: hasSections ? (section?.name || '') : '',
        position_holders: topThreeStudents
      };
    } catch (error) {
      return null;
    }
  };

  const handleToTop = () => {
    const el = mainContentRef.current;
    if (el) {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Generate Position Holders PDF
  const generatePositionHoldersPDF = async () => {
    if (!selectedExam || positionData.length === 0) {
      showToast('Please select an examination and ensure position data is available', 'error');
      return;
    }

    try {
      setPdfLoading(true);

      // Check if it's a mobile device
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      // Show immediate feedback for mobile users
      if (isMobileDevice) {
        showToast('Generating PDF for mobile... Please wait.', 'success');
      }

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Add colored background box first
      doc.setFillColor(240, 248, 255); // Light blue background
      doc.rect(15, 15, pageWidth - 30, 15, 'F');

      // Professional Header with Color
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(74, 108, 247); // Blue color
      doc.text('POSITION HOLDERS REPORT', pageWidth / 2, 20, { align: 'center' });

      // Decorative line with color
      doc.setDrawColor(74, 108, 247);
      doc.setLineWidth(2);
      doc.line(20, 25, pageWidth - 20, 25);

      // Header information with colors
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 197, 94); // Green color
      doc.text('Examination:', 20, 35);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0); // Black for value
      doc.text(selectedExam.name, 50, 35);

      // Summary statistics
      const totalClasses = positionData.length;
      const totalStudents = positionData.reduce((sum, classData) => sum + classData.position_holders.length, 0);
      const firstCount = positionData.reduce((sum, classData) =>
        sum + classData.position_holders.filter(holder => holder.position === 1).length, 0
      );
      const secondCount = positionData.reduce((sum, classData) =>
        sum + classData.position_holders.filter(holder => holder.position === 2).length, 0
      );
      const thirdCount = positionData.reduce((sum, classData) =>
        sum + classData.position_holders.filter(holder => holder.position === 3).length, 0
      );

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(249, 115, 22); // Orange color
      doc.text('Summary:', 20, 45);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0); // Black for values
      doc.text(`Total Classes: ${totalClasses} | Total Students: ${totalStudents}`, 20, 52);
      doc.text(`1st Positions: ${firstCount} | 2nd Positions: ${secondCount} | 3rd Positions: ${thirdCount}`, 20, 59);

      // Bottom border with color
      doc.setDrawColor(249, 115, 22);
      doc.setLineWidth(1);
      doc.line(20, 65, pageWidth - 20, 65);

      let currentY = 75;

      // Generate content for each class
      for (const classData of positionData) {
        // Check if we need a new page
        if (currentY > pageHeight - 50) {
          doc.addPage();
          currentY = 20;
        }

        // Class header with color
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(74, 108, 247); // Blue color
        const classTitle = classData.section_name ? `${classData.class_name} (${classData.section_name})` : classData.class_name;
        doc.text(classTitle, 20, currentY);

        // Position counts for this class with colors
        const classFirstCount = classData.position_holders.filter(holder => holder.position === 1).length;
        const classSecondCount = classData.position_holders.filter(holder => holder.position === 2).length;
        const classThirdCount = classData.position_holders.filter(holder => holder.position === 3).length;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0); // Black for values
        doc.text(`1st: ${classFirstCount} | 2nd: ${classSecondCount} | 3rd: ${classThirdCount}`, 20, currentY + 6);

        currentY += 12;

        // Prepare table data
        const tableData = classData.position_holders.map((holder, index) => [
          index + 1,
          getStudentDisplayId({ id: holder.student_id, roll_number: holder.roll_number }).toString(),
          holder.student_name,
          holder.father_name || '',
          `${holder.obtained_marks}/${holder.total_marks}`,
          holder.percentage.toFixed(1) + '%',
          holder.grade,
          holder.position === 1 ? '1st' : holder.position === 2 ? '2nd' : '3rd'
        ]);

        // Create table with colors
        autoTable(doc, {
          startY: currentY,
          head: [['#', 'ID', 'Student Name', 'Father Name', 'Obt/Total', 'Per%', 'Grade', 'Position']],
          body: tableData,
          styles: {
            fontSize: 8,
            cellPadding: 2,
            lineColor: '#4a6cf7',
            lineWidth: 0.5,
            textColor: '#000',
            fillColor: '#ffffff'
          },
          headStyles: {
            fillColor: '#4a6cf7',
            textColor: '#ffffff',
            fontStyle: 'bold',
            fontSize: 8
          },
          alternateRowStyles: {
            fillColor: '#f8f9ff'
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 15 },  // #
            1: { halign: 'center', cellWidth: 15 },  // ID
            2: { halign: 'left', cellWidth: 35 },    // Student Name
            3: { halign: 'left', cellWidth: 35 },    // Father Name
            4: { halign: 'center', cellWidth: 18 },  // Obt/Total
            5: { halign: 'center', cellWidth: 18 },  // Percentage
            6: { halign: 'center', cellWidth: 15 },  // Grade
            7: { halign: 'center', cellWidth: 18 }   // Position
          },
          margin: { left: 20, right: 20 },
          didDrawCell: (data: any) => {
            // Color position cells based on position
            if (data.column.index === 7 && data.cell.raw) { // Position column
              const position = data.cell.raw;
              if (position === '1st') {
                data.cell.styles.fillColor = [34, 197, 94]; // Green
                data.cell.styles.textColor = [255, 255, 255]; // White text
              } else if (position === '2nd') {
                data.cell.styles.fillColor = [59, 130, 246]; // Blue
                data.cell.styles.textColor = [255, 255, 255]; // White text
              } else if (position === '3rd') {
                data.cell.styles.fillColor = [249, 115, 22]; // Orange
                data.cell.styles.textColor = [255, 255, 255]; // White text
              }
            }
          }
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;
      }

      // Format date as dd-mmm-yyyy
      const formatDate = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      };

      // Footer with color
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      if (finalY > pageHeight - 20) {
        doc.addPage();
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(74, 108, 247); // Blue color
        doc.text('Generated on: ' + formatDate(new Date()), 20, 30);

        // Add colored footer line
        doc.setDrawColor(74, 108, 247);
        doc.setLineWidth(0.5);
        doc.line(20, 25, pageWidth - 20, 25);
      } else {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(74, 108, 247); // Blue color
        doc.text('Generated on: ' + formatDate(new Date()), 20, finalY);

        // Add colored footer line
        doc.setDrawColor(74, 108, 247);
        doc.setLineWidth(0.5);
        doc.line(20, finalY - 5, pageWidth - 20, finalY - 5);
      }

      // Save the PDF with mobile-friendly approach
      const fileName = `PositionHolders_${selectedExam?.name}_${new Date().toLocaleDateString('en-GB')}.pdf`;

      if (isMobileDevice) {
        // For mobile devices, use Capacitor Filesystem API approach
        try {
          // Generate PDF as base64 string
          const pdfBase64 = doc.output('datauristring').split(',')[1];

          // Create unique filename with timestamp to prevent overwriting
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const mobileFileName = `position-holders-${timestamp}.pdf`;

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
                <p style="margin: 0 0 15px 0; color: #666;">Position Holders Report</p>
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
                      <title>Position Holders PDF</title>
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
                          <h2>📄 Position Holders PDF Generated</h2>
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
        showToast('Position Holders PDF generated successfully', 'success');
      }
    } catch (error) {
      showToast('Failed to generate PDF', 'error');
    } finally {
      setPdfLoading(false);
    }
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

  if (loading) {
    return <Loader />;
  }

  return (
    <>
      <PageContainer>
        <Header>
          <HeaderTopRow>
            <Title>
              <TrophyIcon style={{ fontSize: 20 }} />
              Position Holders
            </Title>

            {/* Mobile PDF Button - only visible on mobile */}
            <MobilePdfButton
              onClick={generatePositionHoldersPDF}
              disabled={pdfLoading || !selectedExam || positionData.length === 0}
              title="Generate Position Holders PDF"
            >
              {pdfLoading ? (
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

                <PdfButton
                  onClick={generatePositionHoldersPDF}
                  disabled={pdfLoading || !selectedExam || positionData.length === 0}
                  $last={true}
                >
                  {pdfLoading ? (
                    <>
                      <div style={{
                        width: 12,
                        height: 12,
                        border: '2px solid #ffffff40',
                        borderTop: '2px solid #ffffff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginRight: '4px'
                      }} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <PictureAsPdf style={{ fontSize: 14, marginRight: '4px' }} />
                      Export PDF
                    </>
                  )}
                </PdfButton>
              </SegmentedGroup>
            </DesktopSegmentedGroup>
          </HeaderTopRow>

          <HeaderBottomRow>
            {/* Mobile layout */}
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
                    $last
                  >
                    <option value="">Select Examination</option>
                    {examinations.map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.name} ({exam.exam_type.replace('_', ' ').toUpperCase()})
                      </option>
                    ))}
                  </SegmentedSelect>
                </SegmentedGroup>
              </MobileRow>
            </MobileHeaderLayout>
          </HeaderBottomRow>
        </Header>

        <MainContent ref={mainContentRef}>
          <ScrollableContainer>
            {selectedExam && positionData.length > 0 && (
              <ClassesGrid cardCount={positionData.length}>
                {positionData.map((classData) => (
                  <ClassCard key={`${classData.class_id}-${classData.section_id}`}>
                    <ClassHeader>
                      <div>
                        <ClassTitle>
                          {classData.section_name ? `${classData.class_name} (${classData.section_name})` : classData.class_name}
                        </ClassTitle>
                        <ClassSubtitle>
                          {classData.position_holders.length > 0
                            ? `Top ${classData.position_holders.length} position holders`
                            : 'No position holders found'
                          }
                        </ClassSubtitle>

                        {/* Position Counts */}
                        {classData.position_holders.length > 0 && (
                          <PositionCounts>
                            {[1, 2, 3].map(position => {
                              const count = classData.position_holders.filter(holder => holder.position === position).length;
                              if (count > 0) {
                                return (
                                  <PositionCount key={position} $position={position}>
                                    <PositionCountLabel>
                                      {position === 1 ? '1st' : position === 2 ? '2nd' : '3rd'}
                                    </PositionCountLabel>
                                    <PositionCountValue>- {count.toString().padStart(2, '0')}</PositionCountValue>
                                  </PositionCount>
                                );
                              }
                              return null;
                            })}
                          </PositionCounts>
                        )}
                      </div>
                    </ClassHeader>

                    <PositionHoldersList>
                      {classData.position_holders.map((holder) => (
                        <PositionHolder key={holder.student_id} $position={holder.position}>
                          <Avatar $position={holder.position}>
                            {holder.student_name.charAt(0).toUpperCase()}
                          </Avatar>

                          <StudentInfo>
                            <StudentName>{holder.student_name}</StudentName>
                            <StudentDetails>
                              <span>{holder.father_name}</span>
                              <StudentId>ID: {getStudentDisplayId({ id: holder.student_id, roll_number: holder.roll_number })}</StudentId>
                            </StudentDetails>
                          </StudentInfo>

                          <ScoreInfo>
                            <ScoreValue $position={holder.position}>
                              {holder.obtained_marks.toFixed(0)}/{holder.total_marks.toFixed(0)}
                            </ScoreValue>
                            <ScoreLabel>
                              {holder.percentage.toFixed(1)}% - {holder.grade}
                            </ScoreLabel>
                          </ScoreInfo>

                          <PositionBadge $position={holder.position}>
                            {holder.position}
                          </PositionBadge>
                        </PositionHolder>
                      ))}

                      {classData.position_holders.length === 0 && (
                        <div style={{
                          textAlign: 'center',
                          padding: '16px',
                          color: '#6b7280',
                          fontSize: '0.9rem',
                          fontStyle: 'italic'
                        }}>
                          No top 3 position holders found
                        </div>
                      )}
                    </PositionHoldersList>
                  </ClassCard>
                ))}
              </ClassesGrid>
            )}

            {selectedExam && positionData.length === 0 && (
              <NoResults>
                No position data available for the selected examination.
              </NoResults>
            )}

            {!selectedExam && (
              <NoResults>
                Please select an examination to view position holders.
              </NoResults>
            )}
          </ScrollableContainer>

        </MainContent>
      </PageContainer>

      {showToTop && (
        <ToTopButton onClick={handleToTop} aria-label="Scroll to top">
          <KeyboardArrowUpIcon style={{ fontSize: 32 }} />
        </ToTopButton>
      )}
    </>
  );
};

export default PositionHolders;
