import React, { useState, useEffect, useRef, useContext } from 'react';
import styled, { css } from 'styled-components';
import { supabase } from '../supabaseClient';
import {
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Search as SearchIcon,
  FilterList as FilterIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Close as CloseIcon,
  MoreVert as MoreIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  RemoveCircleOutline as UnlinkIcon,
  Assessment as AssessmentIcon,
  CalendarToday as CalendarIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon
} from '@mui/icons-material';
import { useTheme, useMediaQuery } from '@mui/material';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { ThemeProvider } from 'styled-components';
import { useToast } from '../components/useToast';
import { useAuth } from '../contexts/AuthContext';
import { examinationService } from '../services/examinationService';
import { Examination, ExaminationFilters } from '../types/examinations';

// Styled Components (copied and adapted from SubjectManager)
const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 12px 6px 12px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  height: 92vh;
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

const HeaderFilters = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 8px;
  box-shadow: 0 1px 4px #0001;
  padding: 6px 8px;
`;

const Title = styled.h2`
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 1px;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
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
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.8rem;
  outline: none;
  width: 100%;
  margin-left: 4px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
`;


const ExaminationsGrid = styled.div<{ cardCount: number }>`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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

const ExaminationCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  padding: 1.5rem 1.5rem 1.2rem 1.5rem;
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 2.5px solid ${({ theme }) => theme.BORDER};
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
    padding: 1.2rem 1.2rem 1rem 1.2rem;
    margin-bottom: 0.3rem;
  }
`;

const ExaminationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const ExaminationTitle = styled.h3`
  font-size: 2.1rem;
  font-weight: 900;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  letter-spacing: 0.5px;
`;

const ExaminationDescription = styled.p`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0.4rem 0 0.8rem;
  font-size: 0.95rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin: 1rem 0;
`;

const StatItem = styled.div`
  background: ${({ theme }) => theme.FIELD_BG};
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
  border: 1px solid ${({ theme }) => theme.BORDER};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const StatValue = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
`;

const StatLabelBig = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  letter-spacing: 0.04em;
`;

const ExaminationActions = styled.div`
  display: flex;
  gap: 0.25rem;
  position: absolute;
  top: 1.2rem;
  right: 1.2rem;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-10px) scale(0.95);
  transition: opacity 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1);
  z-index: 2;
  
  ${ExaminationCard}:hover & {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0) scale(1);
  }
`;

const SmallIconButton = styled.button<{ color?: string }>`
  background: ${({ color }) => color || 'transparent'};
  color: white;
  border: none;
  border-radius: 10px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.9rem;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  &:hover {
    background: ${({ color }) => color || '#4a6cf7'};
    transform: scale(1.1) translateY(-1px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  @media (max-width: 700px) {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    font-size: 1rem;
  }
`;

const IconButton = styled.button<{ color?: string }>`
  background: ${({ theme, color }) => color || theme.ACCENT};
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.18s, box-shadow 0.18s, transform 0.18s;
  font-size: 1.25rem;
  margin-left: 0.25rem;
  &:hover {
    background: ${({ theme, color }) => color === '#ef4444' ? '#dc2626' : theme.ACCENT};
    box-shadow: 0 2px 8px ${({ theme, color }) => color || theme.ACCENT}99;
    transform: scale(1.08);
  }
`;

const StyledDialog = styled.div<{ open: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${({ theme }) => theme.palette?.mode === 'dark' 
    ? 'rgba(0, 0, 0, 0.5)' 
    : 'rgba(255, 255, 255, 0.5)'};
  display: ${props => props.open ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1300;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  overflow-y: auto;
  padding: 20px;
  
  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const DialogPaper = styled.div`
  background: ${({ theme }) => theme.palette?.mode === 'dark' 
    ? theme.palette.background.paper 
    : theme.palette.background.paper};
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  margin: 0;
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.palette?.mode === 'dark'
    ? '0 0 40px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.4)'
    : '0 0 40px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.1)'};
  border: ${({ theme }) => theme.palette?.mode === 'dark'
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  transform: translateY(0);
  transition: all 0.3s ease-in-out;
  position: relative;
  z-index: 1301;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  
  @media (max-width: 768px) {
    max-width: 100%;
    max-height: 85vh;
    border-radius: 12px;
  }
`;

const DialogHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: ${({ theme }) => theme.palette?.mode === 'dark' 
    ? '1px solid rgba(255, 255, 255, 0.05)' 
    : '1px solid rgba(0, 0, 0, 0.05)'};
  background: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)'};
  backdrop-filter: blur(8px);
  position: relative;
  z-index: 1;
  flex-shrink: 0;
`;

const DialogTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.palette?.mode === 'dark'
    ? theme.palette.primary.light
    : theme.palette.primary.main};
  text-shadow: ${({ theme }) => theme.palette?.mode === 'dark'
    ? '0 2px 4px rgba(0, 0, 0, 0.5)'
    : 'none'};
  margin: 0;
`;

const StyledDialogContent = styled.div`
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.2) transparent'
    : 'rgba(0, 0, 0, 0.2) transparent'};
  
  &::-webkit-scrollbar {
    width: 6px;
    background-color: transparent;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 3px;
    margin: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.palette?.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.2)'
      : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 3px;
    border: ${({ theme }) => theme.palette?.mode === 'dark'
      ? `1px solid ${theme.palette.background.paper}`
      : `1px solid ${theme.palette.background.paper}`};
    
    &:hover {
      background-color: ${({ theme }) => theme.palette?.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.3)'
        : 'rgba(0, 0, 0, 0.3)'};
    }
  }
  
  background: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 100%)'
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 100%)'};
  
  @media (max-width: 768px) {
    padding: 12px 16px;
    gap: 12px;
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 0.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.25rem;
  color: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.7)'
    : 'rgba(0, 0, 0, 0.6)'};
  font-weight: 500;
  font-size: 0.9rem;
`;

const ErrorText = styled.span`
  color: #ef4444;
  font-size: 0.8rem;
  margin-top: 0.25rem;
  display: block;
`;

const SessionCard = styled.div`
  background: linear-gradient(135deg, ${({ theme }) => theme.CARD} 0%, ${({ theme }) => theme.CARD}dd 100%);
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  max-width: 100%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, ${({ theme }) => theme.ACCENT}, #6366f1, #8b5cf6);
    border-radius: 16px 16px 0 0;
  }
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }
  
  @media (max-width: 700px) {
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1rem;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  }
`;

const SessionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER}40;
  min-height: 3rem;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 60px;
    height: 2px;
    background: linear-gradient(90deg, ${({ theme }) => theme.ACCENT}, transparent);
    border-radius: 1px;
  }
  
  @media (max-width: 700px) {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.75rem;
  }
`;

const SessionTitle = styled.h3`
  font-size: 1.4rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  background: linear-gradient(135deg, ${({ theme }) => theme.TEXT_PRIMARY}, ${({ theme }) => theme.ACCENT});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  @media (max-width: 700px) {
    font-size: 1.2rem;
    font-weight: 800;
  }
`;

const SessionInfo = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  padding: 0.25rem 0.75rem;
  background: ${({ theme }) => theme.ACCENT}15;
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.ACCENT}30;
  
  @media (max-width: 700px) {
    font-size: 0.85rem;
    font-weight: 600;
  }
`;

const ExaminationsList = styled.div`
  display: grid;
  gap: 1rem;
  
  @media (max-width: 700px) {
    gap: 0.75rem;
  }
`;

const ExamItem = styled.div<{ examType?: string }>`
  background: linear-gradient(135deg, ${({ theme }) => theme.FIELD_BG} 0%, ${({ theme }) => theme.CARD} 100%);
  border: 2px solid ${({ examType }) => 
    examType === 'Examination' ? 'rgba(16, 185, 129, 0.3)' : 
    examType === 'Monthly Test' ? 'rgba(245, 158, 11, 0.3)' : 
    'rgba(0, 0, 0, 0.1)'
  };
  border-radius: 14px;
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  margin-bottom: 0.75rem;
  position: relative;
  overflow: hidden;
  min-height: 120px;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: linear-gradient(180deg, ${({ theme }) => theme.ACCENT}, #6366f1);
    border-radius: 0 2px 2px 0;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    border-color: ${({ examType }) => 
      examType === 'Examination' ? 'rgba(16, 185, 129, 0.5)' : 
      examType === 'Monthly Test' ? 'rgba(245, 158, 11, 0.5)' : 
      'rgba(0, 0, 0, 0.2)'
    };
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
    background: linear-gradient(135deg, ${({ theme }) => theme.CARD} 0%, ${({ theme }) => theme.FIELD_BG} 100%);
    
    &::before {
      opacity: 1;
    }
  }
  
  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: 12px;
    margin-bottom: 0.5rem;
    min-height: auto;
  }
`;

const ExamInfo = styled.div`
  flex: 1;
  
  @media (max-width: 700px) {
    width: 100%;
  }
`;

const ExamName = styled.div`
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  line-height: 1.4;
  letter-spacing: -0.01em;
  
  @media (max-width: 700px) {
    font-size: 1rem;
    font-weight: 800;
    margin-bottom: 0.4rem;
  }
`;

const ExamDetails = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  font-weight: 500;
  
  @media (max-width: 700px) {
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.75rem;
  }
`;

const ExamActions = styled.div`
  display: flex;
  flex-direction: row;
  gap: 0.75rem;
  align-items: center;
  flex-shrink: 0;
  align-self: flex-end;
  margin-top: 0.5rem;
  padding-top: 0;
  
  @media (max-width: 700px) {
    justify-content: space-between;
    width: 100%;
    gap: 0.75rem;
    align-items: center;
    align-self: stretch;
    margin-top: 0;
    padding-top: 0;
  }
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${props => {
    switch (props.status) {
      case 'published': return 'linear-gradient(135deg, #10b981, #059669)';
      case 'draft': return 'linear-gradient(135deg, #f59e0b, #d97706)';
      case 'archived': return 'linear-gradient(135deg, #6b7280, #4b5563)';
      default: return 'linear-gradient(135deg, #6b7280, #4b5563)';
    }
  }};
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  
  @media (max-width: 700px) {
    padding: 0.35rem 0.7rem;
    font-size: 0.65rem;
    border-radius: 16px;
  }
`;

const SessionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: ${({ theme }) => theme.palette?.mode === 'dark'
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  border-radius: 8px;
  background: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(255, 255, 255, 0.8)'};
  color: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.9)'
    : 'rgba(0, 0, 0, 0.9)'};
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);

  &:hover, &:focus {
    background: ${({ theme }) => theme.palette?.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(255, 255, 255, 0.9)'};
    border-color: ${({ theme }) => theme.palette?.primary?.main || '#1976d2'};
  }

  &::placeholder {
    color: ${({ theme }) => theme.palette?.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.3)'
      : 'rgba(0, 0, 0, 0.3)'};
    opacity: 1;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  border: ${({ theme }) => theme.palette?.mode === 'dark'
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  border-radius: 8px;
  background: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(255, 255, 255, 0.8)'};
  color: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.9)'
    : 'rgba(0, 0, 0, 0.9)'};
  font-size: 0.95rem;
  outline: none;
  resize: vertical;
  min-height: 60px;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);

  &:hover, &:focus {
    background: ${({ theme }) => theme.palette?.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(255, 255, 255, 0.9)'};
    border-color: ${({ theme }) => theme.palette?.primary?.main || '#1976d2'};
  }

  &::placeholder {
    color: ${({ theme }) => theme.palette?.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.3)'
      : 'rgba(0, 0, 0, 0.3)'};
    opacity: 1;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: ${({ theme }) => theme.palette?.mode === 'dark'
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  border-radius: 8px;
  background: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(255, 255, 255, 0.8)'};
  color: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.9)'
    : 'rgba(0, 0, 0, 0.9)'};
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);

  &:hover, &:focus {
    background: ${({ theme }) => theme.palette?.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(255, 255, 255, 0.9)'};
    border-color: ${({ theme }) => theme.palette?.primary?.main || '#1976d2'};
  }

  /* Style the dropdown options */
  option {
    background: ${({ theme }) => theme.palette?.mode === 'dark'
      ? '#1a1a1a'
      : '#ffffff'};
    color: ${({ theme }) => theme.palette?.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.9)'
      : 'rgba(0, 0, 0, 0.9)'};
    padding: 8px 12px;
    border: none;
  }

  /* Style the dropdown arrow */
  appearance: none;
  background-image: ${({ theme }) => theme.palette?.mode === 'dark'
    ? `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`
    : `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23000000' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`};
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px;
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 20px;
  border-top: ${({ theme }) => theme.palette?.mode === 'dark'
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  background: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
    : 'linear-gradient(0deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)'};
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    padding: 12px 16px;
    gap: 12px;
    justify-content: flex-end;
    
    button {
      min-width: 80px;
      min-height: 36px;
      font-size: 0.9rem;
    }
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  outline: none;
  text-transform: none;
  min-width: 80px;
  
  ${({ variant, theme }) => {
    if (variant === 'primary') {
      return `
        background: ${theme.palette?.mode === 'dark' 
          ? 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)'
          : 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)'};
        color: white;
        box-shadow: ${theme.palette?.mode === 'dark'
          ? '0 2px 8px rgba(25, 118, 210, 0.3)'
          : '0 2px 8px rgba(25, 118, 210, 0.2)'};
        
        &:hover {
          background: ${theme.palette?.mode === 'dark'
            ? 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)'
            : 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)'};
          box-shadow: ${theme.palette?.mode === 'dark'
            ? '0 4px 12px rgba(25, 118, 210, 0.4)'
            : '0 4px 12px rgba(25, 118, 210, 0.3)'};
          transform: translateY(-1px);
        }
        
        &:active {
          transform: translateY(0);
          box-shadow: ${theme.palette?.mode === 'dark'
            ? '0 2px 6px rgba(25, 118, 210, 0.3)'
            : '0 2px 6px rgba(25, 118, 210, 0.2)'};
        }
      `;
    } else if (variant === 'danger') {
      return `
        background: ${theme.palette?.mode === 'dark' 
          ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
          : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'};
        color: white;
        box-shadow: ${theme.palette?.mode === 'dark'
          ? '0 2px 8px rgba(239, 68, 68, 0.3)'
          : '0 2px 8px rgba(239, 68, 68, 0.2)'};
        
        &:hover {
          background: ${theme.palette?.mode === 'dark'
            ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
            : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'};
          box-shadow: ${theme.palette?.mode === 'dark'
            ? '0 4px 12px rgba(239, 68, 68, 0.4)'
            : '0 4px 12px rgba(239, 68, 68, 0.3)'};
          transform: translateY(-1px);
        }
        
        &:active {
          transform: translateY(0);
          box-shadow: ${theme.palette?.mode === 'dark'
            ? '0 2px 6px rgba(239, 68, 68, 0.3)'
            : '0 2px 6px rgba(239, 68, 68, 0.2)'};
        }
      `;
    } else {
      return `
        background: ${theme.palette?.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.05)'
          : 'rgba(0, 0, 0, 0.05)'};
        color: ${theme.palette?.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.8)'
          : 'rgba(0, 0, 0, 0.8)'};
        border: 1px solid ${theme.palette?.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(0, 0, 0, 0.1)'};
        
        &:hover {
          background: ${theme.palette?.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(0, 0, 0, 0.08)'};
          border-color: ${theme.palette?.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.2)'
            : 'rgba(0, 0, 0, 0.2)'};
          transform: translateY(-1px);
        }
        
        &:active {
          transform: translateY(0);
        }
      `;
    }
  }}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.7)'
    : 'rgba(0, 0, 0, 0.6)'};
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.palette?.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.1)'};
    color: ${({ theme }) => theme.palette?.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.9)'
      : 'rgba(0, 0, 0, 0.9)'};
  }
`;

const NoResults = styled.div`
  text-align: center;
  color: #b0b8d1;
  font-size: 1.1rem;
  margin: 48px 0;
`;

const ExaminationsLoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  width: 100%;
  animation: fadeIn 0.5s;
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const ExaminationsLoadingCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 18px;
  box-shadow: 0 8px 32px 0 #0002, 0 1.5px 6px #0001;
  padding: 2.5rem 2.5rem 2rem 2.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 320px;
  max-width: 95vw;
`;

const ExaminationsLoadingSpinner = styled.div`
  width: 54px;
  height: 54px;
  border: 5px solid ${({ theme }) => theme.BORDER};
  border-top: 5px solid ${({ theme }) => theme.ACCENT};
  border-radius: 50%;
  animation: spin 1.1s linear infinite;
  margin-bottom: 28px;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ExaminationsLoadingText = styled.div`
  color: ${({ theme }) => theme.ACCENT};
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  margin-bottom: 6px;
`;

const ExaminationsLoadingSubText = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1.05rem;
  font-weight: 500;
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0;
  padding: 0.15rem 0;
  border-top: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.BG};
  box-shadow: 0 -1px 6px #0001;
  flex: 0 0 auto;
  width: 100%;
  @media (max-width: 700px) {
    flex-direction: row;
    align-items: center;
    gap: 0;
    padding: 0.15rem 0.1rem 0.05rem 0.1rem;
  }
`;

const PaginationInfo = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.95rem;
  
  @media (max-width: 768px) {
    text-align: center;
    font-size: 0.9rem;
  }
`;

const PaginationControls = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  @media (max-width: 700px) {
    flex: none;
    margin-left: auto;
    width: auto;
    gap: 0.2rem;
}
`;

const PaginationButton = styled.button<{ active?: boolean }>`
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  border: 1px solid ${({ theme, active }) => active ? theme.ACCENT : theme.FIELD_BORDER};
  background: ${({ theme, active }) => active ? theme.ACCENT : theme.FIELD_BG};
  color: ${({ theme, active }) => active ? '#fff' : theme.TEXT_PRIMARY};
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 22px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.ACCENT};
    background: ${({ theme }) => theme.ACCENT};
  color: #fff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
    min-width: 36px;
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

// Segmented controls matching StudentList
const SEGMENTED_HEIGHT = '32px';

const SegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.BG === '#252525' ? '#222' : '#f3f4f6'};
  border-radius: 11px;
  box-shadow: 1.4px 1.4px 4px #2222;
  overflow: hidden;
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

const SegmentedButton = styled.button<{ active?: boolean; first?: boolean; last?: boolean }>`
  ${SegmentedBase}
  padding: 0 1.12em;
  display: flex;
  align-items: center;
  gap: 0.35em;
  border-radius: 0;
  ${({ first }) => first && `
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  `}
  ${({ last }) => last && `
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  cursor: pointer;
  background: ${({ active, theme }) => active ? theme.ACCENT : theme.BG};
  color: ${({ active, theme }) => active ? '#fff' : theme.TEXT_PRIMARY};
  border: 1.5px solid ${({ active, theme }) => active ? theme.ACCENT : theme.FIELD_BORDER};
  font-weight: ${({ active }) => active ? 700 : 400};
  &:hover, &:focus {
    background: ${({ theme }) => theme.BG === '#252525' ? '#353535' : '#e5e7eb'};
    opacity: 0.92;
  }
  & svg {
    font-size: 15px;
    vertical-align: middle;
    display: inline-block;
  }
  @media (max-width: 700px) {
    width: 100%;
    border-radius: 8px !important;
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

const AddHeaderIconButton = styled.button`
  background: ${({ theme }) => theme.BG === '#252525' ? '#23242a' : '#f3f4f6'};
  border: none;
  border-radius: 8px;
  padding: 8px;
  margin-left: 8px;
  cursor: pointer;
  box-shadow: 0 1px 4px #0002;
  display: flex;
  align-items: center;
  @media (min-width: 701px) {
    display: none;
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

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
] as const;

const EXAM_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'First Term', label: 'First Term' },
  { value: 'Second Term', label: 'Second Term' },
  { value: 'Mid-term', label: 'Mid-term' },
  { value: 'Final', label: 'Final' },
  { value: 'Quiz', label: 'Quiz' },
  { value: 'Monthly Test', label: 'Monthly Test' },
] as const;

const ExaminationManager: React.FC = () => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { showToast } = useToast();
  const { user } = useAuth();
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingExam, setEditingExam] = useState<Examination | null>(null);
  const [newExamination, setNewExamination] = useState({
    name: '',
    exam_type: 'Examination',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    session_id: 1,
    status: 'draft',
    passing_marks: 40
  });
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [examinationToDelete, setExaminationToDelete] = useState<Examination | null>(null);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  const fetchExaminations = async () => {
    if (!user?.school_id) return;
    try {
      setLoading(true);
      const data = await examinationService.getExaminations({}, user.school_id);
      setExaminations(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch examinations');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    if (!user?.school_id) return;
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setSessions(data || []);
      
      // Find the currently active session
      const currentDate = new Date();
      const active = data?.find(session => {
        const startDate = new Date(session.start_date || new Date());
        const endDate = session.end_date ? new Date(session.end_date) : null;
        return currentDate >= startDate && (!endDate || currentDate <= endDate);
      });
      
      setActiveSession(active || data?.[0] || null);
    } catch (error) {
    }
  };

  useEffect(() => {
    if (user?.school_id) {
      fetchExaminations();
      fetchSessions();
    }
  }, [user?.school_id]);

  useEffect(() => {
    if (openDialog) {
      setTimeout(() => {
        // Focus on first input if needed
      }, 100);
    }
  }, [openDialog]);

  const handleOpenDialog = (examination?: Examination) => {
    if (examination) {
      setEditingExam(examination);
      setNewExamination({
        name: examination.name,
        exam_type: examination.exam_type,
        description: examination.description || '',
        start_date: examination.start_date,
        end_date: examination.end_date || '',
        session_id: examination.session_id || 1,
        status: examination.status,
        passing_marks: examination.passing_marks || 40
      });
    } else {
      setEditingExam(null);
      setNewExamination({
        name: '',
        exam_type: 'Examination',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        session_id: activeSession?.id || 1,
        status: 'draft',
        passing_marks: 40
      });
    }
    setOpenDialog(true);
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!newExamination.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!newExamination.exam_type) {
      errors.exam_type = 'Exam type is required';
    }
    
    if (!newExamination.start_date) {
      errors.start_date = 'Start date is required';
    }
    
    if (!newExamination.session_id) {
      errors.session_id = 'Session is required';
    }
    
    if (newExamination.passing_marks < 0 || newExamination.passing_marks > 100) {
      errors.passing_marks = 'Passing marks must be between 0 and 100';
    }
    
    if (newExamination.end_date && newExamination.start_date) {
      const startDate = new Date(newExamination.start_date);
      const endDate = new Date(newExamination.end_date);
      if (endDate < startDate) {
        errors.end_date = 'End date must be after start date';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingExam(null);
    setNewExamination({
      name: '',
      exam_type: 'Examination',
      description: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      session_id: 1,
      status: 'draft',
      passing_marks: 40
    });
    setFormErrors({});
  };

  const handleSaveExamination = async () => {
    if (!user?.school_id || isSaving) return;
    
    if (!validateForm()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Check for duplicate name (case-insensitive, ignore self if editing)
      const nameLower = newExamination.name.trim().toLowerCase();
      const duplicateName = examinations.some(e => e.name.trim().toLowerCase() === nameLower && (!editingExam || e.id !== editingExam.id));
      if (duplicateName) {
        showToast('An examination with this name already exists.', 'error');
        return;
      }
      
      let error = null;
      if (editingExam) {
        await examinationService.updateExamination(editingExam.id, {
          ...newExamination,
          exam_type: newExamination.exam_type as any,
          status: newExamination.status as 'draft' | 'published' | 'archived'
        }, user.school_id);
      } else {
        await examinationService.createExamination({
          ...newExamination,
          exam_type: newExamination.exam_type as any,
          school_id: user.school_id,
          session_id: newExamination.session_id,
          created_by: user.id,
          end_date: newExamination.start_date // Use start_date as end_date for now
        });
      }
      
      if (error) {
        showToast('Error saving examination.', 'error');
        return;
      }
      
      // Success - show appropriate message
      if (editingExam) {
        showToast('Examination updated successfully.', 'success');
      } else {
        showToast('Examination added successfully.', 'success');
      }
      
      handleCloseDialog();
      fetchExaminations();
    } catch (err) {
      showToast('Error saving examination.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExamination = async (id: number) => {
    if (!user?.school_id) return;
    
    try {
      await examinationService.deleteExamination(id, user.school_id);
      showToast('Examination deleted.', 'success');
      fetchExaminations();
    } catch (err) {
      showToast('Error deleting examination.', 'error');
    }
  };

  // Open delete modal
  const openDeleteModal = (examination: Examination) => {
    setExaminationToDelete(examination);
    setDeleteModalOpen(true);
  };
  
  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setExaminationToDelete(null);
  };
  
  const confirmDelete = async () => {
    if (examinationToDelete) {
      await handleDeleteExamination(examinationToDelete.id);
    }
    closeDeleteModal();
  };

  const filteredExaminations = examinations.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.exam_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group examinations by session and sort by creation date (newest first)
  const examinationsBySession = filteredExaminations.reduce((acc, examination) => {
    const sessionId = examination.session_id;
    if (!acc[sessionId]) {
      acc[sessionId] = {
        session: examination.session,
        examinations: []
      };
    }
    acc[sessionId].examinations.push(examination);
    return acc;
  }, {} as Record<number, { session: any; examinations: Examination[] }>);

  // Sort examinations within each session by start date (earliest first)
  Object.keys(examinationsBySession).forEach(sessionId => {
    examinationsBySession[parseInt(sessionId)].examinations.sort((a, b) => 
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );
  });

  // Check if user has school_id - moved after all hooks
  if (!user?.school_id) {
    return (
      <ThemeProvider theme={theme}>
        <PageContainer>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '2rem', 
            gap: 16,
            color: '#888',
            fontSize: '1.1rem',
            fontWeight: 600
          }}>
            <InfoIcon style={{ fontSize: '1.5rem' }} />
            No school context found. Please contact your administrator.
          </div>
        </PageContainer>
      </ThemeProvider>
    );
  }

  if (loading) return (
    <ThemeProvider theme={theme}>
      <ExaminationsLoadingContainer>
        <ExaminationsLoadingCard>
          <ExaminationsLoadingSpinner />
          <ExaminationsLoadingText>Loading Examinations...</ExaminationsLoadingText>
          <ExaminationsLoadingSubText>Please wait while we fetch the latest examinations.</ExaminationsLoadingSubText>
        </ExaminationsLoadingCard>
      </ExaminationsLoadingContainer>
    </ThemeProvider>
  );

  return (
    <ThemeProvider theme={theme}>
      <PageContainer>
        <Header>
          <HeaderRow>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Title>
                Examination Management <span style={{fontWeight:400, fontSize:'1rem', color: theme.palette.mode === 'dark' ? '#b0b8d1' : '#4a4a4a'}}>({examinations.length})</span>
              </Title>
              {/* Mobile Add Button - Icon Only */}
              <button
                onClick={() => handleOpenDialog()}
                style={{
                  display: window.innerWidth <= 700 ? 'flex' : 'none',
                  background: theme.palette.mode === 'dark' ? '#23242a' : '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px #0002',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme.palette.mode === 'dark' ? '#C0C0C0' : '#444',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  width: '36px',
                  height: '36px',
                  flexShrink: 0
                }}
                title="Add Examination"
              >
                <AddIcon style={{ fontSize: 18 }} />
              </button>
            </div>
            <HeaderFilters style={{ display: window.innerWidth > 700 ? 'flex' : 'none' }}>
              <SegmentedGroup>
                <SegmentedInput
                  type="text"
                  placeholder="Search examinations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ minWidth: 220, maxWidth: 320, width: '100%' }}
                />
                <SegmentedButton
                  onClick={() => handleOpenDialog()}
                  title="Add Examination"
                  style={{
                    minWidth: 120,
                    maxWidth: 140,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    background: theme.palette.mode === 'dark' ? '#444' : '#f3f4f6',
                    border: `1.5px solid ${theme.palette.mode === 'dark' ? '#555' : '#e5e7eb'}`,
                    color: theme.palette.mode === 'dark' ? '#C0C0C0' : '#444',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    padding: '6px 8px'
                  }}
                >
                  <AddIcon style={{ fontSize: 14 }} />
                  <span style={{ fontWeight: 700, display: 'inline-block', whiteSpace: 'nowrap' }}>
                    {window.innerWidth <= 900 ? 'Add' : 'Add Exam'}
                  </span>
                </SegmentedButton>
              </SegmentedGroup>
            </HeaderFilters>
          </HeaderRow>
          {/* Mobile Search Bar */}
          <div style={{ display: window.innerWidth <= 700 ? 'flex' : 'none', marginTop: '8px', width: '100%' }}>
            <SearchBar style={{ width: '100%', maxWidth: 'none', flex: 1 }}>
              <SearchIcon style={{ color: theme.palette.mode === 'dark' ? '#b0b8d1' : '#666666' }} />
              <SearchInput
                placeholder="Search examinations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: '1rem' }}
              />
            </SearchBar>
          </div>
        </Header>

        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <WarningIcon /> {error}
          </div>
        )}

        <MainContent>
          <SessionsGrid>
            {Object.entries(examinationsBySession).map(([sessionId, sessionData]) => (
              <SessionCard key={sessionId}>
                <SessionHeader>
                  <SessionTitle>{sessionData.session?.name || `Session ${sessionId}`}</SessionTitle>
                  <SessionInfo>
                    {sessionData.examinations.length} examination(s)
                  </SessionInfo>
                </SessionHeader>
                
                <ExaminationsList>
                  {sessionData.examinations.map(examination => (
                    <ExamItem key={examination.id} examType={examination.exam_type}>
                      <div style={{ 
                        position: 'absolute', 
                        top: '1rem', 
                        right: '1rem',
                        background: examination.exam_type === 'Examination' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: examination.exam_type === 'Examination' ? '#10b981' : '#f59e0b',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        border: `1px solid ${examination.exam_type === 'Examination' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'}`
                      }}>
                        {examination.exam_type}
                      </div>
                      <ExamInfo>
                        <ExamName>{examination.name}</ExamName>
                        <ExamDetails>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ 
                              width: '6px', 
                              height: '6px', 
                              borderRadius: '50%', 
                              background: '#6366f1' 
                            }} />
                            <span>
                              {examination.start_date ? new Date(examination.start_date).toLocaleDateString('en-GB') : 'TBD'} - {examination.end_date ? new Date(examination.end_date).toLocaleDateString('en-GB') : 'TBD'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ 
                              width: '6px', 
                              height: '6px', 
                              borderRadius: '50%', 
                              background: '#8b5cf6' 
                            }} />
                            <span>Passing Marks: {examination.passing_marks || 40}%</span>
                          </div>
                        </ExamDetails>
                      </ExamInfo>
                      <ExamActions>
                        <StatusBadge status={examination.status}>
                          {examination.status}
                        </StatusBadge>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <SmallIconButton color="#4a6cf7" title="Edit Examination" onClick={() => {
                            handleOpenDialog(examination);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}>
                            <EditIcon style={{ fontSize: '0.9rem' }} />
                          </SmallIconButton>
                          <SmallIconButton color="#ef4444" title="Delete Examination" onClick={() => {
                            openDeleteModal(examination);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}>
                            <DeleteIcon style={{ fontSize: '0.9rem' }} />
                          </SmallIconButton>
                        </div>
                      </ExamActions>
                    </ExamItem>
                  ))}
                </ExaminationsList>
              </SessionCard>
            ))}
          </SessionsGrid>
        </MainContent>

        <PaginationContainer>
          <PaginationInfo style={{ marginLeft: 'auto', textAlign: 'right' }}>
            Total Examinations: {examinations.length}
          </PaginationInfo>
        </PaginationContainer>
      </PageContainer>
      
      <StyledDialog open={openDialog}>
        <DialogPaper onClick={e => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{editingExam ? 'Edit Examination' : 'Add New Examination'}</DialogTitle>
            <CloseButton onClick={handleCloseDialog}>
              <CloseIcon />
            </CloseButton>
          </DialogHeader>
          
          <StyledDialogContent>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveExamination(); }}>
              <FormGrid>
                <FormGroup>
                  <Label>Name</Label>
                  <Input
                    type="text"
                    value={newExamination.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExamination({ ...newExamination, name: e.target.value })}
                    placeholder="Enter examination name"
                    required
                    autoFocus
                  />
                  {formErrors.name && <ErrorText>{formErrors.name}</ErrorText>}
                </FormGroup>
                
                <FormGroup>
                  <Label>Exam Type</Label>
                  <Select
                    value={newExamination.exam_type}
                    onChange={(e) => setNewExamination({ ...newExamination, exam_type: e.target.value })}
                  >
                    <option value="Examination">Examination</option>
                    <option value="Monthly Test">Monthly Test</option>
                  </Select>
                  {formErrors.exam_type && <ErrorText>{formErrors.exam_type}</ErrorText>}
                </FormGroup>
                
              </FormGrid>
              
              <FormGroup>
                <Label>Session</Label>
                <Select
                  value={newExamination.session_id}
                  onChange={(e) => setNewExamination({ ...newExamination, session_id: parseInt(e.target.value) })}
                >
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name} ({session.start_date ? new Date(session.start_date).toLocaleDateString('en-GB') : 'TBD'} - {session.end_date ? new Date(session.end_date).toLocaleDateString('en-GB') : 'TBD'})
                    </option>
                  ))}
                </Select>
                {formErrors.session_id && <ErrorText>{formErrors.session_id}</ErrorText>}
              </FormGroup>
              
              <FormGrid>
                <FormGroup>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={newExamination.start_date}
                    onChange={(e) => setNewExamination({ ...newExamination, start_date: e.target.value })}
                    required
                  />
                  {formErrors.start_date && <ErrorText>{formErrors.start_date}</ErrorText>}
                </FormGroup>
                
                <FormGroup>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={newExamination.end_date}
                    onChange={(e) => setNewExamination({ ...newExamination, end_date: e.target.value })}
                  />
                  {formErrors.end_date && <ErrorText>{formErrors.end_date}</ErrorText>}
                </FormGroup>
              </FormGrid>
              
              <FormGroup>
                <Label>Status</Label>
                <Select
                  value={newExamination.status}
                  onChange={(e) => setNewExamination({ ...newExamination, status: e.target.value as any })}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </Select>
              </FormGroup>
              
              <FormGrid>
                <FormGroup>
                  <Label>Passing Marks (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={newExamination.passing_marks}
                    onChange={(e) => setNewExamination({ ...newExamination, passing_marks: parseInt(e.target.value) || 40 })}
                    placeholder="Enter passing marks percentage"
                  />
                  {formErrors.passing_marks && <ErrorText>{formErrors.passing_marks}</ErrorText>}
                </FormGroup>
                
                <FormGroup>
                  <Label>Description</Label>
                  <TextArea
                    value={newExamination.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewExamination({ ...newExamination, description: e.target.value })}
                    placeholder="Enter examination description (optional)"
                  />
                </FormGroup>
              </FormGrid>
            </form>
          </StyledDialogContent>
          
          <FormActions>
            <Button variant="secondary" type="button" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button variant="primary" type="button" onClick={handleSaveExamination} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </FormActions>
        </DialogPaper>
      </StyledDialog>
      
      {/* Delete confirmation modal */}
      <StyledDialog open={deleteModalOpen}>
        <DialogPaper onClick={e => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#ef4444',
                color: '#fff',
                borderRadius: '50%',
                width: '2.1rem',
                height: '2.1rem',
                fontSize: '1.3rem'
              }}>
                <DeleteIcon style={{ fontSize: '1.1rem' }} />
              </div>
              Delete Examination
            </DialogTitle>
            <CloseButton onClick={closeDeleteModal}>
              <CloseIcon />
            </CloseButton>
          </DialogHeader>
          
          <StyledDialogContent>
            <div style={{ padding: '0', fontSize: '1.05rem', color: '#f87171', fontWeight: 500, marginBottom: '1rem' }}>
              Are you sure you want to delete the examination "{examinationToDelete?.name}"? This will also remove all associated results and data.
            </div>
          </StyledDialogContent>
          
          <FormActions>
            <Button variant="secondary" type="button" onClick={closeDeleteModal}>
              Cancel
            </Button>
            <Button variant="danger" type="button" onClick={confirmDelete}>
              Delete
            </Button>
          </FormActions>
        </DialogPaper>
      </StyledDialog>
    </ThemeProvider>
  );
};

export default ExaminationManager;
