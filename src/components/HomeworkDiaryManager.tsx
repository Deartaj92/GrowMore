import React, { useEffect, useState, useContext, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { supabase } from '../supabaseClient';
import { ThemeContext, darkTheme, lightTheme } from './Layout';
import { useToast } from './useToast';
import { useAuth } from '../contexts/AuthContext';
import { sortClasses } from '../utils/classUtils';
import { homeworkDiaryService } from '../services/homeworkDiaryService';
import { HomeworkDiary, BulkHomeworkAssignmentDTO } from '../types/homeworkDiary';
import {
  Assignment,
  CalendarToday,
  Class,
  Book,
  Save,
  Delete,
  Edit,
  Add,
  Subject as SubjectIcon,
  CheckCircle,
  Cancel
} from '@mui/icons-material';
import { format, parseISO, isSunday } from 'date-fns';
import NoSessionsFound from './NoSessionsFound';
import NoStudentsFound from './NoStudentsFound';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { useActivityTracking } from '../hooks/useActivityTracking';

// Styled Components
const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 1.5rem;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  min-height: 0;
  display: flex;
  flex-direction: column;
  height: 93vh;
  
  @media (max-width: 768px) {
    padding: 1rem;
    height: calc(100vh - 3rem);
  }
  
  @media (max-width: 480px) {
    padding: 0.75rem;
  }
`;

const Header = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.CARD};
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  padding: 1.25rem 1.5rem;
  min-height: 3rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  backdrop-filter: blur(10px);
  
  @media (max-width: 768px) {
    padding: 0.625rem 0.875rem;
    border-radius: 8px;
    margin-bottom: 0.875rem;
    gap: 0.375rem;
    min-height: auto;
    flex-direction: column;
    align-items: stretch;
  }
  
  @media (max-width: 480px) {
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    margin-bottom: 0.75rem;
    gap: 0.25rem;
  }
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, ${({ theme }) => theme.ACCENT} 0%, ${({ theme }) => theme.ACCENT}dd 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  svg {
    width: 1.5rem;
    height: 1.5rem;
    color: ${({ theme }) => theme.ACCENT};
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  }
  
  @media (max-width: 768px) {
    font-size: 1rem;
    gap: 0.5rem;
    
    svg {
      width: 1.125rem;
      height: 1.125rem;
    }
  }
  
  @media (max-width: 480px) {
    font-size: 0.875rem;
    gap: 0.375rem;
    
    svg {
      width: 1rem;
      height: 1rem;
    }
  }
`;

// --- Segmented Group Styles (similar to TestRecordManager.tsx) ---
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
    border-radius: 11px;
  }
`;

const SegmentedSelect = styled.select<{ first?: boolean; last?: boolean }>`
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
  cursor: pointer;
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

const SegmentedDatePicker = styled.div<{ first?: boolean; last?: boolean }>`
  font-family: inherit;
  font-size: 0.77em;
  font-weight: 400;
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  box-shadow: 1.4px 1.4px 4px #2222;
  border: none;
  outline: none;
  transition: background 0.2s;
  background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#f3f4f6'};
  color: ${({ theme }) => theme.BG === '#252525' ? '#C0C0C0' : '#444'};
  padding: 0 0.84em;
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
  display: flex;
  align-items: center;
  min-width: 140px;
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

const FilterSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    margin-bottom: 0.875rem;
    gap: 0.5rem;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 0.75rem;
    gap: 0.375rem;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
  
  @media (max-width: 768px) {
    gap: 0.375rem;
    width: 100%;
  }
`;

const FilterLabel = styled.label`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
  display: block;
  
  @media (max-width: 768px) {
    font-size: 0.6875rem;
    margin-bottom: 0.375rem;
  }
`;

const Select = styled.select`
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 2px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9375rem;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2.5rem;
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT}60;
  }
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 4px ${({ theme }) => theme.ACCENT}15;
    background-color: ${({ theme }) => theme.FIELD_BG};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: ${({ theme }) => theme.BORDER}40;
  }
  
  @media (max-width: 768px) {
    padding: 0.625rem 0.875rem;
    padding-right: 2.25rem;
    font-size: 0.875rem;
    border-radius: 8px;
  }
`;

const MainContent = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0 0 1.5rem 0;
  -webkit-overflow-scrolling: touch;
  
  @media (max-width: 768px) {
    padding: 0 0 1rem 0;
  }
  
  @media (max-width: 480px) {
    padding: 0 0 0.75rem 0;
  }
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BORDER};
    border-radius: 3px;
  }
`;

const HomeworkCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.25rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  @media (max-width: 480px) {
    gap: 0.875rem;
  }
`;

const HomeworkCard = styled.div`
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.05) 100%), ' + theme.CARD
    : 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.03) 100%), ' + theme.CARD};
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid ${({ theme }) => theme.BG === '#252525' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: linear-gradient(180deg, #10b981 0%, #059669 100%);
    opacity: 1;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.15);
    transform: translateY(-2px);
    border-color: ${({ theme }) => theme.BG === '#252525' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.3)'};
    background: ${({ theme }) => theme.BG === '#252525'
    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%), ' + theme.CARD
    : 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.05) 100%), ' + theme.CARD};
    
    &::before {
      opacity: 1;
    }
  }
  
  @media (max-width: 768px) {
    padding: 1.25rem;
    border-radius: 12px;
  }
  
  @media (max-width: 480px) {
    padding: 1rem;
    border-radius: 10px;
  }
`;

const HomeworkHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid ${({ theme }) => theme.BORDER}40;
  gap: 1rem;
  flex-wrap: wrap;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    gap: 0.875rem;
  }
  
  @media (max-width: 480px) {
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 0.875rem;
    padding-bottom: 0.875rem;
  }
`;

const SubjectName = styled.div`
  font-size: 1.125rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
  
  svg {
    width: 1.375rem;
    height: 1.375rem;
    flex-shrink: 0;
    color: #10b981;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  }
  
  @media (max-width: 768px) {
    font-size: 1rem;
    gap: 0.625rem;
    
    svg {
      width: 1.25rem;
      height: 1.25rem;
    }
  }
  
  @media (max-width: 480px) {
    font-size: 0.9375rem;
    width: 100%;
    gap: 0.5rem;
    
    svg {
      width: 1.125rem;
      height: 1.125rem;
    }
  }
`;

const GeneralHomeworkLabel = styled(SubjectName)`
  color: ${({ theme }) => theme.ACCENT};
`;

const HomeworkText = styled.div`
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  line-height: 1.65;
  white-space: pre-wrap;
  margin-bottom: 1rem;
  word-wrap: break-word;
  padding: 0.875rem;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 10px;
  border-left: 3px solid #10b98140;
  flex: 1;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  
  @media (max-width: 768px) {
    font-size: 0.9375rem;
    line-height: 1.65;
    margin-bottom: 0.875rem;
    padding: 0.875rem;
    border-radius: 8px;
    -webkit-line-clamp: 8;
  }
  
  @media (max-width: 480px) {
    font-size: 0.875rem;
    padding: 0.75rem;
    -webkit-line-clamp: 10;
  }
`;

const HomeworkMeta = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  display: flex;
  gap: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
  padding-top: 0.75rem;
  margin-top: 0.75rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER}40;
  
  span {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-weight: 500;
  }
  
  @media (max-width: 768px) {
    font-size: 0.8125rem;
    gap: 1.25rem;
  }
`;

const DeleteModalOverlay = styled.div`
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
  padding: 1rem;
  backdrop-filter: blur(4px);
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    align-items: flex-end;
  }
`;

const DeleteModalBox = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  padding: 1.5rem;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid ${({ theme }) => theme.BORDER};
  animation: slideUp 0.3s ease-out;
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @media (max-width: 768px) {
    border-radius: 16px 16px 0 0;
    padding: 1.25rem;
    max-width: 100%;
    animation: slideUpMobile 0.3s ease-out;
  }
  
  @keyframes slideUpMobile {
    from {
      opacity: 0;
      transform: translateY(100%);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const DeleteModalHeader = styled.div`
  display: flex;
  align-items: center;
    gap: 0.75rem;
  margin-bottom: 1rem;
  
  svg {
    width: 1.5rem;
    height: 1.5rem;
    color: #dc2626;
  }
  
  h3 {
    font-size: 1.25rem;
    font-weight: 700;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
    margin: 0;
  }
  
  @media (max-width: 768px) {
    margin-bottom: 0.875rem;
    
    svg {
      width: 1.375rem;
      height: 1.375rem;
    }
    
    h3 {
      font-size: 1.125rem;
    }
  }
`;

const DeleteModalContent = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.9375rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    font-size: 0.875rem;
    margin-bottom: 1.25rem;
  }
`;

const DeleteModalActions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  
  @media (max-width: 768px) {
    flex-direction: column-reverse;
    gap: 0.625rem;
    
    button {
      width: 100%;
    }
  }
`;

const DeleteModalButton = styled.button<{ variant?: 'cancel' | 'delete' }>`
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  
  ${({ variant, theme }) => {
    if (variant === 'delete') {
      return `
        background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
        color: #fff;
        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        
        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(220, 38, 38, 0.4);
        }
      `;
    }
    return `
      background: ${theme.FIELD_BG};
      color: ${theme.TEXT_PRIMARY};
      border-color: ${theme.BORDER};
      
      &:hover {
        background: ${theme.BORDER}40;
      }
    `;
  }}
  
  @media (max-width: 768px) {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  
  button {
    @media (min-width: 769px) {
      padding: 0.5rem 0.875rem;
      font-size: 0.8125rem;
      gap: 0.375rem;
      border-radius: 8px;
      width: 85px;
      box-sizing: border-box;
      
      svg {
        width: 0.9375rem;
        height: 0.9375rem;
      }
    }
  }
  
  @media (max-width: 480px) {
    width: 100%;
    
    button {
      flex: 1;
      justify-content: center;
      min-width: 0;
    }
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  position: relative;
  overflow: hidden;
  background: ${({ variant, theme }) => {
    if (variant === 'primary') return `linear-gradient(135deg, ${theme.ACCENT} 0%, ${theme.ACCENT}dd 100%)`;
    if (variant === 'danger') return 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
    return theme.FIELD_BG;
  }};
  color: ${({ variant }) => variant === 'primary' || variant === 'danger' ? '#fff' : 'inherit'};
  box-shadow: ${({ variant }) => variant === 'primary' || variant === 'danger' ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 2px 6px rgba(0, 0, 0, 0.08)'};
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }
  
  svg {
    width: 1.125rem;
    height: 1.125rem;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: ${({ variant }) => variant === 'primary' || variant === 'danger' ? '0 6px 20px rgba(0, 0, 0, 0.2)' : '0 4px 12px rgba(0, 0, 0, 0.12)'};
    
    &::before {
      width: 300px;
      height: 300px;
    }
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  @media (max-width: 768px) {
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
    gap: 0.375rem;
    border-radius: 8px;
    
    svg {
      width: 1rem;
      height: 1rem;
    }
  }
  
  @media (max-width: 480px) {
    padding: 0.5625rem 1rem;
    font-size: 0.8125rem;
    gap: 0.3125rem;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  border: 2px dashed ${({ theme }) => theme.BORDER};
  margin: 2rem 0;
  
  @media (max-width: 768px) {
    padding: 3rem 1.5rem;
    border-radius: 12px;
    margin: 1.5rem 0;
  }
  
  @media (max-width: 480px) {
    padding: 2.5rem 1.25rem;
    border-radius: 10px;
    margin: 1rem 0;
  }
`;

const EmptyStateIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1.5rem;
  opacity: 0.5;
  filter: grayscale(0.3);
  
  @media (max-width: 768px) {
    font-size: 3.5rem;
    margin-bottom: 1.25rem;
  }
  
  @media (max-width: 480px) {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
`;

const EmptyStateText = styled.p`
  font-size: 1.125rem;
  margin: 0.75rem 0;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  
  @media (max-width: 768px) {
    font-size: 1rem;
    margin: 0.625rem 0;
  }
  
  @media (max-width: 480px) {
    font-size: 0.9375rem;
    margin: 0.5rem 0;
  }
`;

const EmptyStateSubtext = styled.p`
  font-size: 0.9375rem;
  opacity: 0.7;
  margin: 0.5rem 0 0 0;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  @media (max-width: 768px) {
    font-size: 0.875rem;
    margin: 0.375rem 0 0 0;
  }
  
  @media (max-width: 480px) {
    font-size: 0.8125rem;
    margin: 0.25rem 0 0 0;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem;
  width: 100%;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid ${({ theme }) => theme.BORDER};
  border-top: 4px solid ${({ theme }) => theme.ACCENT};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const FormSection = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  padding: 1.75rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid ${({ theme }) => theme.BORDER};
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, ${({ theme }) => theme.ACCENT} 0%, ${({ theme }) => theme.ACCENT}80 100%);
  }
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    margin-bottom: 1.25rem;
    border-radius: 12px;
  }
  
  @media (max-width: 480px) {
    padding: 1.25rem;
    margin-bottom: 1rem;
    border-radius: 10px;
  }
`;

const FormTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  letter-spacing: -0.01em;
  
  svg {
    width: 1.5rem;
    height: 1.5rem;
    color: ${({ theme }) => theme.ACCENT};
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  }
  
  @media (max-width: 768px) {
    font-size: 1.125rem;
    margin-bottom: 1.25rem;
    gap: 0.625rem;
    
    svg {
      width: 1.375rem;
      height: 1.375rem;
    }
  }
  
  @media (max-width: 480px) {
    font-size: 1rem;
    margin-bottom: 1rem;
    gap: 0.5rem;
    
    svg {
      width: 1.25rem;
      height: 1.25rem;
    }
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.875rem;
    margin-bottom: 0.875rem;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 1rem;
  border-radius: 10px;
  border: 2px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9375rem;
  font-family: inherit;
  line-height: 1.7;
  outline: none;
  resize: vertical;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
  
  &::placeholder {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    opacity: 0.5;
  }
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT}60;
  }
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 4px ${({ theme }) => theme.ACCENT}15;
    background-color: ${({ theme }) => theme.FIELD_BG};
  }
  
  @media (max-width: 768px) {
    min-height: 110px;
    padding: 0.875rem;
    font-size: 0.875rem;
    border-radius: 8px;
  }
  
  @media (max-width: 480px) {
    min-height: 100px;
    padding: 0.75rem;
    font-size: 0.8125rem;
  }
`;

const SubjectsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.875rem;
    margin-top: 0.875rem;
  }
  
  @media (max-width: 480px) {
    gap: 0.75rem;
    margin-top: 0.75rem;
  }
`;

const SubjectCard = styled.div`
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 12px;
  padding: 1.25rem;
  border: 2px solid ${({ theme }) => theme.BORDER};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 3px;
    height: 100%;
    background: ${({ theme }) => theme.ACCENT};
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT}60;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
    
    &::before {
      opacity: 1;
    }
  }
  
  @media (max-width: 768px) {
    padding: 1rem;
    border-radius: 10px;
  }
  
  @media (max-width: 480px) {
    padding: 0.875rem;
    border-radius: 8px;
  }
`;

const SubjectCardHeader = styled.div`
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 1rem;
  letter-spacing: -0.01em;
  
  @media (max-width: 768px) {
    font-size: 0.9375rem;
    margin-bottom: 0.875rem;
    gap: 0.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
  }
`;

// Simple character counter text used near textareas
const CounterText = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 0.25rem;
  display: inline-block;
  text-align: right;
`;

interface Session {
  id: number;
  name: string;
  is_active: boolean;
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

interface Subject {
  id: number;
  name: string;
  class_id?: number;
}

interface ClassSubject {
  id: number;
  class_id: number;
  subject_id: number;
  subject: {
    id: number;
    name: string;
    code?: string;
  };
}

const ToggleChip = styled.button<{ active: boolean }>`
  background: ${({ theme, active }) => active ? theme.ACCENT : 'transparent'};
  color: ${({ theme, active }) => active ? '#fff' : theme.TEXT_PRIMARY};
  border: 1px solid ${({ theme, active }) => active ? theme.ACCENT : theme.BORDER};
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  &:hover {
    background: ${({ theme, active }) => active ? theme.ACCENT : theme.HOVER_BG};
  }
`;

const FixedFooter = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.CARD};
  padding: 1rem 2rem;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  z-index: 100;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 768px) {
    padding: 0.75rem 1rem;
    gap: 0.75rem;
    
    button {
      flex: 1;
      padding: 0.625rem;
      font-size: 0.875rem;
    }
  }
`;

const HomeworkDiaryManager: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const { user } = useAuth();
  const toast = useToast();
  const { logHomeworkDiaryActivity } = useActivityTracking();

  // Get the actual theme object
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | ''>('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<number | ''>('');
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
  const [subjects, setSubjects] = useState<ClassSubject[]>([]);
  const [homeworkEntries, setHomeworkEntries] = useState<HomeworkDiary[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedClassHasSections, setSelectedClassHasSections] = useState(true);

  // Form state for adding/editing homework
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [homeworkText, setHomeworkText] = useState('');
  const [selectedSubjectForEdit, setSelectedSubjectForEdit] = useState<number | '' | null>('');
  const editFormRef = useRef<HTMLDivElement>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<number | null>(null);

  // Bulk assignment state
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkAssignments, setBulkAssignments] = useState<Array<{ subject_id: number | null; homework_text: string }>>([]);

  // New Bulk Mode State
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkGroups, setBulkGroups] = useState<BulkClassSectionGroup[]>([]);
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());

  const toggleGroupVisibility = (groupId: string) => {
    const newHidden = new Set(hiddenGroups);
    if (newHidden.has(groupId)) {
      newHidden.delete(groupId);
    } else {
      newHidden.add(groupId);
    }
    setHiddenGroups(newHidden);
  };

  interface BulkSubjectAssignment {
    id?: number;
    subject_id: number;
    subject_name: string;
    homework_text: string;
    original_text?: string;
  }

  interface BulkClassSectionGroup {
    class_id: number;
    class_name: string;
    section_id: number | null;
    section_name: string | null;
    assignments: BulkSubjectAssignment[];
  }

  // Check if selected date is Sunday (use useMemo to avoid recalculation on every render)
  const isSelectedDateSunday = useMemo(() => {
    if (!selectedDate) return false;
    try {
      const dateStr = selectedDate.format('YYYY-MM-DD');
      return isSunday(parseISO(dateStr));
    } catch (error) {
      return false;
    }
  }, [selectedDate]);

  // Fetch active sessions
  useEffect(() => {
    if (!user?.school_id) return;

    const fetchSessions = async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('school_id', user.school_id)
        .order('name', { ascending: false });

      if (error) {
        return;
      }

      setSessions(data || []);
      const activeSession = data?.find(s => s.is_active);
      if (activeSession) {
        setSelectedSession(activeSession.id);
      }
    };

    fetchSessions();
  }, [user?.school_id]);

  // Fetch classes (no session requirement)
  useEffect(() => {
    if (!user?.school_id) return;

    const fetchClasses = async () => {
      setLoading(true);

      try {
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
            .select('id, name, has_sections')
            .eq('school_id', user.school_id)
            .order('name');

          if (error) throw error;

          const sortedClasses = sortClasses(data || []);
          setClasses(sortedClasses);
        }
      } catch (error: any) {
        toast.showToast('Failed to load classes', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [user?.school_id, user?.role, user?.staff_id]);

  // Professional auto-select: only when exactly one class linked to the teacher
  useEffect(() => {
    if (user?.role !== 'Teacher') return;
    if (selectedClass) return;
    if (classes.length === 1) {
      setSelectedClass(classes[0].id);
    }
  }, [user?.role, classes, selectedClass]);

  // Fetch sections when class is selected (matching StudentList pattern)
  useEffect(() => {
    if (!user?.school_id || !selectedClass) {
      setSections([]);
      setSelectedSection('');
      return;
    }

    const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));
    const hasSections = selectedClassObj?.has_sections ?? true;
    setSelectedClassHasSections(hasSections);

    if (!hasSections) {
      setSections([]);
      setSelectedSection('');
      return;
    }

    const fetchSections = async () => {
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
            .eq('class_subjects.class_id', selectedClass);

          if (error) throw error;

          // Extract unique sections from the nested structure
          const uniqueSections = new Map();
          data?.forEach(item => {
            if (item.section_id) {
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
              .eq('school_id', user.school_id)
              .order('name');

            if (sectionsError) throw sectionsError;
            setSections(sectionsData || []);
            // If teacher has exactly one class and there is exactly one section, auto-select it
            if (classes.length === 1 && (sectionsData?.length || 0) === 1 && !selectedSection) {
              setSelectedSection(sectionsData![0].id);
            }
          } else {
            setSections([]);
          }
        } else {
          // For other roles, fetch all sections for the class
          const { data, error } = await supabase
            .from('sections')
            .select('id, name, class_id, session_id')
            .eq('class_id', selectedClass)
            .eq('school_id', user.school_id)
            .order('name');

          if (error) {
            toast.showToast('Failed to load sections', 'error');
            return;
          }

          const filteredSections = data || [];
          setSections(filteredSections);
          // If teacher has exactly one class and there is exactly one section, auto-select it
          if (user?.role === 'Teacher' && classes.length === 1 && filteredSections.length === 1 && !selectedSection) {
            setSelectedSection(filteredSections[0].id);
          }
        }
      } catch (error) {
        toast.showToast('Failed to load sections', 'error');
      }
    };

    fetchSections();
  }, [selectedClass, selectedSession, user?.school_id, user?.role, user?.staff_id, classes]);

  // Fetch subjects when class is selected
  useEffect(() => {
    if (!user?.school_id || !selectedClass) {
      setSubjects([]);
      return;
    }

    const fetchSubjects = async () => {
      try {
        if (user?.role === 'Teacher' && user?.staff_id) {
          // For teachers, get subjects through teacher_class_subjects
          const { data, error } = await supabase
            .from('teacher_class_subjects')
            .select(`
              class_subjects!inner(
                id,
                class_id,
                subject_id,
                subject:subjects(name, code)
              )
            `)
            .eq('teacher_id', user.staff_id)
            .eq('school_id', user.school_id)
            .eq('class_subjects.class_id', selectedClass);

          if (error) throw error;

          if (data && data.length > 0) {
            const subjects = data.map((item: any) => item.class_subjects).filter(Boolean);
            setSubjects(subjects);
          } else {
            setSubjects([]);
          }
        } else {
          // For other roles, get all subjects for the class
          const { data, error } = await supabase
            .from('class_subjects')
            .select(`
              id,
              class_id,
              subject_id,
              subject:subjects(name, code)
            `)
            .eq('class_id', selectedClass)
            .eq('school_id', user.school_id);

          if (error) throw error;
          // Fix: Ensure subject is a single object, not an array
          const fixedData = (data || []).map((item: any) => ({
            ...item,
            subject: Array.isArray(item.subject) ? item.subject[0] : item.subject
          }));
          setSubjects(fixedData);
        }
      } catch (error) {
        toast.showToast('Failed to load subjects', 'error');
      }
    };

    fetchSubjects();
  }, [selectedClass, user?.school_id, user?.role, user?.staff_id]);

  // Fetch existing homework entries
  const fetchHomeworkEntries = async () => {
    if (!user?.school_id || !selectedClass || !selectedDate) return;

    try {
      setLoading(true);
      const dateStr = selectedDate.format('YYYY-MM-DD');
      // For non-sectioned classes, section_id should be null
      // For sectioned classes, use the selected section (can be empty to show all sections)
      const sectionId = selectedClassHasSections
        ? (selectedSection ? Number(selectedSection) : null)
        : null;

      // Pass teacher ID if user is a teacher to filter by teacher's subjects
      const entries = await homeworkDiaryService.getHomeworkByClassAndDate(
        Number(selectedClass),
        sectionId,
        dateStr,
        user.school_id,
        user?.role === 'Teacher' ? user.staff_id : null
      );

      setHomeworkEntries(entries);

      // Log view activity
      try {
        const selectedClassObj = classes.find(c => c.id === Number(selectedClass));
        const selectedSectionObj = sections.find(s => s.id === Number(selectedSection));
        const dateStr = selectedDate.format('YYYY-MM-DD');

        await logHomeworkDiaryActivity(
          'view',
          selectedClassObj?.name || 'Unknown Class',
          selectedSectionObj?.name || null,
          null, // subject name (viewing all subjects)
          dateStr,
          entries.length,
          { createNotification: false } // Don't create notification for view
        );
      } catch (activityError) {
        // Don't fail the operation if activity logging fails
      }
    } catch (error: any) {
      toast.showToast('Failed to load homework entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch homework when filters change (session not required for viewing)
  useEffect(() => {
    if (selectedClass && selectedDate) {
      fetchHomeworkEntries();
    } else {
      setHomeworkEntries([]);
    }
  }, [selectedClass, selectedSection, selectedDate]);

  // Initialize bulk assignments when subjects are loaded and pre-fill existing homework
  useEffect(() => {
    if (subjects.length > 0 && showBulkForm && selectedClass && selectedDate) {
      // Create a map of existing homework by subject_id for quick lookup
      const homeworkMap = new Map<number | null, string>();
      homeworkEntries.forEach(entry => {
        const key = entry.subject_id || null;
        if (!homeworkMap.has(key) || homeworkMap.get(key) === '') {
          homeworkMap.set(key, entry.homework_text);
        }
      });

      // Initialize assignments for each subject, pre-filling existing homework
      const assignments: Array<{ subject_id: number | null; homework_text: string }> = subjects.map(subj => ({
        subject_id: subj.subject_id,
        homework_text: homeworkMap.get(subj.subject_id) || ''
      }));

      setBulkAssignments(assignments);
    } else if (subjects.length > 0 && showBulkForm) {
      // If class/date not selected yet, initialize with empty fields
      setBulkAssignments(subjects.map(subj => ({
        subject_id: subj.subject_id,
        homework_text: ''
      })));
    }
  }, [subjects, showBulkForm, homeworkEntries, selectedClass, selectedDate]);

  // Fetch data for Bulk Mode
  useEffect(() => {
    if (!isBulkMode || !user?.school_id || !selectedDate) return;

    const loadBulkData = async () => {
      setLoading(true);
      try {
        // 1. Get all relevant sections
        let allSections: Section[] = [];
        const classIds = classes.map(c => c.id);

        if (classIds.length === 0) {
          setBulkGroups([]);
          setLoading(false);
          return;
        }

        if (user?.role === 'Teacher' && user?.staff_id) {
          // Fetch sections assigned to teacher
          const { data: teacherData, error: teacherError } = await supabase
            .from('teacher_class_subjects')
            .select('section_id, class_subjects(class_id)')
            .eq('teacher_id', user.staff_id)
            .eq('school_id', user.school_id);

          if (teacherError) throw teacherError;

          const sectionIds = teacherData
            .map((t: any) => t.section_id)
            .filter((id: any) => id !== null); // Filter nulls

          if (sectionIds.length > 0) {
            const { data: secData, error: secError } = await supabase
              .from('sections')
              .select('*')
              .in('id', sectionIds)
              .order('name');
            if (secError) throw secError;
            allSections = secData || [];
          }
        } else {
          // Admin: Fetch all sections for these classes
          const { data: secData, error: secError } = await supabase
            .from('sections')
            .select('*')
            .in('class_id', classIds)
            .eq('school_id', user.school_id)
            .order('name');
          if (secError) throw secError;
          allSections = secData || [];
        }

        // 2. Get all relevant subjects
        let allSubjects: any[] = []; // Store class_subjects

        if (user?.role === 'Teacher' && user?.staff_id) {
          const { data: subData, error: subError } = await supabase
            .from('teacher_class_subjects')
            .select(`
                  class_subjects!inner(
                    id,
                    class_id,
                    subject_id,
                    subject:subjects(name, code)
                  ),
                  section_id
                `)
            .eq('teacher_id', user.staff_id)
            .eq('school_id', user.school_id);

          if (subError) throw subError;
          // Map to a structure we can use
          allSubjects = subData.map((item: any) => ({
            ...item.class_subjects,
            section_id: item.section_id // Attach section_id if specific
          }));
        } else {
          const { data: subData, error: subError } = await supabase
            .from('class_subjects')
            .select(`
                  id,
                  class_id,
                  subject_id,
                  subject:subjects(name, code)
                `)
            .in('class_id', classIds)
            .eq('school_id', user.school_id);

          if (subError) throw subError;
          allSubjects = subData || [];
        }

        // 3. Fetch existing homework for this date
        const dateStr = selectedDate.format('YYYY-MM-DD');
        const { data: existingHomework, error: homeworkError } = await supabase
          .from('homework_diary')
          .select('*')
          .eq('school_id', user.school_id)
          .eq('homework_date', dateStr);

        if (homeworkError) throw homeworkError;

        // Create a lookup map: `${class_id}-${section_id || 'null'}-${subject_id}` -> Entry
        const homeworkMap = new Map();
        existingHomework?.forEach(h => {
          const key = `${h.class_id}-${h.section_id || 'null'}-${h.subject_id}`;
          homeworkMap.set(key, h);
        });

        // 4. Build Groups
        const groups: BulkClassSectionGroup[] = [];

        for (const cls of classes) {
          // Determine sections for this class
          const classSections = allSections.filter(s => s.class_id === cls.id);

          if (cls.has_sections) {
            if (classSections.length === 0) {
              continue;
            }

            for (const section of classSections) {
              // Find subjects for this class/section
              let relevantSubjects = [];
              if (user?.role === 'Teacher') {
                relevantSubjects = allSubjects.filter(s =>
                  s.class_id === cls.id &&
                  (s.section_id === section.id || s.section_id === null)
                );
              } else {
                relevantSubjects = allSubjects.filter(s => s.class_id === cls.id);
              }

              // Deduplicate subjects
              const uniqueSubjects = new Map();
              relevantSubjects.forEach(s => {
                const subj = Array.isArray(s.subject) ? s.subject[0] : s.subject;
                if (!uniqueSubjects.has(s.subject_id)) {
                  const key = `${cls.id}-${section.id}-${s.subject_id}`;
                  const existing = homeworkMap.get(key);

                  uniqueSubjects.set(s.subject_id, {
                    id: existing?.id,
                    subject_id: s.subject_id,
                    subject_name: subj.name,
                    homework_text: existing?.homework_text || '',
                    original_text: existing?.homework_text || ''
                  });
                }
              });

              if (uniqueSubjects.size > 0) {
                groups.push({
                  class_id: cls.id,
                  class_name: cls.name,
                  section_id: section.id,
                  section_name: section.name,
                  assignments: Array.from(uniqueSubjects.values())
                });
              }
            }
          } else {
            // No sections
            let relevantSubjects = [];
            if (user?.role === 'Teacher') {
              relevantSubjects = allSubjects.filter(s => s.class_id === cls.id);
            } else {
              relevantSubjects = allSubjects.filter(s => s.class_id === cls.id);
            }

            const uniqueSubjects = new Map();
            relevantSubjects.forEach(s => {
              const subj = Array.isArray(s.subject) ? s.subject[0] : s.subject;
              if (!uniqueSubjects.has(s.subject_id)) {
                const key = `${cls.id}-null-${s.subject_id}`;
                const existing = homeworkMap.get(key);

                uniqueSubjects.set(s.subject_id, {
                  id: existing?.id,
                  subject_id: s.subject_id,
                  subject_name: subj.name,
                  homework_text: existing?.homework_text || '',
                  original_text: existing?.homework_text || ''
                });
              }
            });

            if (uniqueSubjects.size > 0) {
              groups.push({
                class_id: cls.id,
                class_name: cls.name,
                section_id: null,
                section_name: null,
                assignments: Array.from(uniqueSubjects.values())
              });
            }
          }
        }

        setBulkGroups(groups);

      } catch (error) {
        console.error(error);
        toast.showToast('Failed to load bulk data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadBulkData();
  }, [isBulkMode, user?.school_id, classes, selectedDate]);

  const handleGlobalBulkSave = async () => {
    if (!user?.school_id || !selectedSession || !selectedDate) {
      toast.showToast('Missing required information', 'error');
      return;
    }

    const dateStr = selectedDate.format('YYYY-MM-DD');
    if (isSunday(parseISO(dateStr))) {
      toast.showToast('Homework cannot be assigned on Sunday', 'error');
      return;
    }

    setSaving(true);
    try {
      const promises = [];

      for (const group of bulkGroups) {
        for (const assignment of group.assignments) {
          // Skip if no changes
          if (assignment.homework_text === assignment.original_text) continue;

          if (assignment.id) {
            // Update existing
            if (!assignment.homework_text.trim()) {
              // If empty, delete
              promises.push(homeworkDiaryService.deleteHomeworkDiary(assignment.id, user.school_id!));
            } else {
              // Update - Only send content, preserve creator
              promises.push(homeworkDiaryService.updateHomeworkDiary(
                assignment.id,
                {
                  id: assignment.id,
                  homework_text: assignment.homework_text,
                  // Explicitly NOT sending created_by or user_id to preserve original creator
                },
                user.school_id!
              ));
            }
          } else if (assignment.homework_text.trim()) {
            // Create new
            promises.push(homeworkDiaryService.createHomeworkDiary(
              {
                class_id: group.class_id,
                section_id: group.section_id,
                session_id: Number(selectedSession),
                subject_id: assignment.subject_id,
                homework_date: dateStr,
                homework_text: assignment.homework_text
              },
              user.school_id!,
              user.id!
            ));
          }
        }
      }

      await Promise.all(promises);

      toast.showToast(`Successfully saved changes`, 'success');

      // Reload data to reflect changes
      // We can just trigger the effect by toggling a dummy state or just calling the function if we extracted it.
      // Or simpler: just close bulk mode or let the user stay. 
      // If staying, we should update 'original_text' to match current.
      // For now, let's just exit bulk mode as per previous behavior, or maybe stay?
      // Previous behavior was exit.
      setIsBulkMode(false);

      if (selectedClass) {
        fetchHomeworkEntries();
      }
    } catch (error: any) {
      toast.showToast(error.message || 'Failed to save bulk homework', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHomework = async () => {
    if (!user?.school_id || !selectedClass || !selectedDate || !homeworkText.trim() || !selectedSubjectForEdit) {
      toast.showToast('Please fill in all required fields including subject', 'error');
      return;
    }

    // Check if selected date is Sunday
    if (selectedDate) {
      const dateStr = selectedDate.format('YYYY-MM-DD');
      if (isSunday(parseISO(dateStr))) {
        toast.showToast('Homework cannot be assigned on Sunday', 'error');
        return;
      }
    }

    // Session is required for saving homework
    if (!selectedSession) {
      toast.showToast('Please select a session to assign homework', 'error');
      return;
    }

    // Validate section selection for sectioned classes
    if (selectedClassHasSections && !selectedSection) {
      toast.showToast('Please select a section for this class', 'error');
      return;
    }

    try {
      setSaving(true);
      const dateStr = selectedDate.format('YYYY-MM-DD');
      // For non-sectioned classes, section_id should be null
      // For sectioned classes, use the selected section or null if not selected
      const sectionId = selectedClassHasSections
        ? (selectedSection ? Number(selectedSection) : null)
        : null;
      const subjectId =
        typeof selectedSubjectForEdit === 'number'
          ? selectedSubjectForEdit
          : (selectedSubjectForEdit ? Number(selectedSubjectForEdit) : null);

      if (isEditing && editingId) {
        await homeworkDiaryService.updateHomeworkDiary(
          editingId,
          {
            id: editingId,
            homework_text: homeworkText,
            subject_id: subjectId
          },
          user.school_id
        );
        toast.showToast('Homework updated successfully', 'success');

        // Log update activity
        try {
          const selectedClassObj = classes.find(c => c.id === Number(selectedClass));
          const selectedSectionObj = sections.find(s => s.id === Number(selectedSection));
          const selectedSubjectObj = subjects.find(s => s.subject_id === subjectId);

          await logHomeworkDiaryActivity(
            'update',
            selectedClassObj?.name || 'Unknown Class',
            selectedSectionObj?.name || null,
            selectedSubjectObj?.subject?.name || 'General Homework',
            dateStr,
            1
          );
        } catch (activityError) {
          // Don't fail the operation if activity logging fails
        }
      } else {
        await homeworkDiaryService.createHomeworkDiary(
          {
            class_id: Number(selectedClass),
            section_id: sectionId,
            session_id: Number(selectedSession),
            subject_id: subjectId,
            homework_date: dateStr,
            homework_text: homeworkText
          },
          user.school_id,
          user.id!
        );
        toast.showToast('Homework assigned successfully', 'success');

        // Log create activity
        try {
          const selectedClassObj = classes.find(c => c.id === Number(selectedClass));
          const selectedSectionObj = sections.find(s => s.id === Number(selectedSection));
          const selectedSubjectObj = subjects.find(s => s.subject_id === subjectId);

          await logHomeworkDiaryActivity(
            'create',
            selectedClassObj?.name || 'Unknown Class',
            selectedSectionObj?.name || null,
            selectedSubjectObj?.subject?.name || 'General Homework',
            dateStr,
            1
          );
        } catch (activityError) {
          // Don't fail the operation if activity logging fails
        }
      }

      // Reset form
      setHomeworkText('');
      setSelectedSubjectForEdit('');
      setIsEditing(false);
      setEditingId(null);
      setShowBulkForm(false);

      // Refresh homework entries
      await fetchHomeworkEntries();
    } catch (error: any) {
      toast.showToast(error.message || 'Failed to save homework', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Helper function to clear all form fields for new entry
  const clearFormFields = () => {
    setHomeworkText('');
    setSelectedSubjectForEdit('');
    setIsEditing(false);
    setEditingId(null);
    setShowBulkForm(false);
    setBulkAssignments([]);
  };

  const handleEdit = (entry: HomeworkDiary) => {
    setEditingId(entry.id);
    setIsEditing(true);
    setSelectedSubjectForEdit(entry.subject_id || '');
    setHomeworkText(entry.homework_text);
    setShowBulkForm(false);

    // Scroll to edit form after state update
    setTimeout(() => {
      if (editFormRef.current) {
        editFormRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 150);
  };

  const handleDeleteClick = (id: number) => {
    setEntryToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete || !user?.school_id) {
      setDeleteModalOpen(false);
      setEntryToDelete(null);
      return;
    }

    try {
      // Get entry details before deleting for activity logging
      const entryToDeleteData = homeworkEntries.find(e => e.id === entryToDelete);

      await homeworkDiaryService.deleteHomeworkDiary(entryToDelete, user.school_id);
      toast.showToast('Homework deleted successfully', 'success');

      // Log delete activity
      if (entryToDeleteData) {
        try {
          const selectedClassObj = classes.find(c => c.id === entryToDeleteData.class_id);
          const selectedSectionObj = sections.find(s => s.id === entryToDeleteData.section_id);
          const selectedSubjectObj = subjects.find(s => s.subject_id === entryToDeleteData.subject_id);

          await logHomeworkDiaryActivity(
            'delete',
            selectedClassObj?.name || 'Unknown Class',
            selectedSectionObj?.name || null,
            selectedSubjectObj?.subject?.name || entryToDeleteData.subject_name || 'General Homework',
            entryToDeleteData.homework_date,
            1
          );
        } catch (activityError) {
          // Don't fail the operation if activity logging fails
        }
      }

      setDeleteModalOpen(false);
      setEntryToDelete(null);
      await fetchHomeworkEntries();
    } catch (error: any) {
      toast.showToast('Failed to delete homework', 'error');
      setDeleteModalOpen(false);
      setEntryToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setEntryToDelete(null);
  };

  const handleCancel = () => {
    setHomeworkText('');
    setSelectedSubjectForEdit('');
    setIsEditing(false);
    setEditingId(null);
    setShowBulkForm(false);
    setBulkAssignments([]);
  };

  if (!user?.school_id) {
    return <NoSessionsFound />;
  }

  const hasActiveSession = sessions.some(s => s.is_active);
  if (!hasActiveSession && sessions.length > 0) {
    return <NoSessionsFound />;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <PageContainer theme={theme}>
        <Header theme={theme}>
          <Title theme={theme}>
            <Assignment /> Daily Homework Diary
          </Title>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant={isBulkMode ? "primary" : "secondary"}
              onClick={() => {
                setIsBulkMode(!isBulkMode);
                setShowBulkForm(false);
                setIsEditing(false);
              }}
              style={{ height: '32px', padding: '0 12px', fontSize: '0.85rem' }}
            >
              <SubjectIcon style={{ width: '16px', height: '16px' }} />
              {isBulkMode ? 'Exit Bulk Mode' : 'Bulk Mode'}
            </Button>

            <SegmentedGroup theme={theme}>
              {!isBulkMode && (
                <>
                  <SegmentedSelect
                    theme={theme}
                    value={selectedClass}
                    onChange={(e) => {
                      setSelectedClass(e.target.value ? Number(e.target.value) : '');
                      setSelectedSection('');
                      clearFormFields();
                    }}
                    style={{ minWidth: 120 }}
                    first
                  >
                    <option value="">Select Class</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </SegmentedSelect>

                  {selectedClassHasSections && (
                    <SegmentedSelect
                      theme={theme}
                      value={selectedSection}
                      onChange={(e) => {
                        setSelectedSection(e.target.value ? Number(e.target.value) : '');
                        clearFormFields();
                      }}
                      disabled={!selectedClass || sections.length === 0}
                      style={{ minWidth: 120 }}
                    >
                      <option value="">
                        {sections.length === 0
                          ? 'No sections found'
                          : 'All Sections'}
                      </option>
                      {sections.map(section => (
                        <option key={section.id} value={section.id}>
                          {section.name}
                        </option>
                      ))}
                    </SegmentedSelect>
                  )}
                </>
              )}

              <SegmentedDatePicker theme={theme} first={isBulkMode} last>
                <DatePicker
                  value={selectedDate}
                  onChange={(newValue) => setSelectedDate(newValue)}
                  format="DD-MM-YYYY"
                  slotProps={{
                    textField: {
                      size: 'small',
                      variant: 'standard',
                      InputProps: {
                        disableUnderline: true,
                        sx: {
                          fontSize: '0.77em',
                          color: theme.BG === '#252525' ? '#C0C0C0' : '#444',
                          '& input': {
                            padding: '0 0.5rem 0 0',
                            height: '32px',
                            fontSize: '0.875rem',
                            fontFamily: 'inherit',
                            fontWeight: 400,
                          },
                          '& .MuiInputAdornment-root': {
                            marginLeft: 0,
                            marginRight: '0.5rem',
                            '& .MuiIconButton-root': {
                              padding: '0.375rem',
                              '& svg': {
                                fontSize: '0.875rem',
                                width: '0.875rem',
                                height: '0.875rem',
                              },
                            },
                          },
                        },
                      },
                      sx: {
                        width: '100%',
                        '& .MuiInputBase-root': {
                          height: '32px',
                          fontSize: '0.875rem',
                          color: theme.BG === '#252525' ? '#C0C0C0' : '#444',
                          fontFamily: 'inherit',
                          fontWeight: 400,
                        },
                      },
                    },
                  }}
                />
              </SegmentedDatePicker>
            </SegmentedGroup>
          </div>
        </Header>

        <MainContent theme={theme} style={{ paddingBottom: '80px' }}>
          {isBulkMode ? (
            <div style={{ padding: '0 0.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, color: theme.TEXT_PRIMARY }}>Bulk Assignment</h3>
                </div>

                {/* Class/Section Toggles */}
                {bulkGroups.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {bulkGroups.map(group => {
                      const groupId = `${group.class_id}-${group.section_id}`;
                      const isVisible = !hiddenGroups.has(groupId);
                      return (
                        <ToggleChip
                          key={groupId}
                          theme={theme}
                          active={isVisible}
                          onClick={() => toggleGroupVisibility(groupId)}
                        >
                          {isVisible ? <CheckCircle style={{ fontSize: '14px' }} /> : <Cancel style={{ fontSize: '14px' }} />}
                          {group.class_name} {group.section_name ? `(${group.section_name})` : ''}
                        </ToggleChip>
                      );

                    })}
                    <ToggleChip
                      theme={theme}
                      active={hiddenGroups.size < bulkGroups.length}
                      onClick={() => {
                        if (hiddenGroups.size === bulkGroups.length) {
                          // Select All (Clear hidden)
                          setHiddenGroups(new Set());
                        } else {
                          // Deselect All (Add all to hidden)
                          const allGroupIds = new Set(bulkGroups.map(g => `${g.class_id}-${g.section_id}`));
                          setHiddenGroups(allGroupIds);
                        }
                      }}
                      style={{ marginLeft: 'auto' }}
                    >
                      {hiddenGroups.size === bulkGroups.length ? (
                        <>
                          <CheckCircle style={{ fontSize: '14px' }} /> Select All
                        </>
                      ) : (
                        <>
                          <Cancel style={{ fontSize: '14px' }} /> Deselect All
                        </>
                      )}
                    </ToggleChip>
                  </div>
                )}
              </div>

              {loading ? (
                <LoadingContainer>
                  <Spinner theme={theme} />
                </LoadingContainer>
              ) : (
                <>
                  {bulkGroups.length === 0 && (
                    <EmptyState theme={theme}>
                      <EmptyStateText>No classes found for bulk assignment</EmptyStateText>
                    </EmptyState>
                  )}

                  {bulkGroups.map((group, groupIndex) => {
                    const groupId = `${group.class_id}-${group.section_id}`;
                    if (hiddenGroups.has(groupId)) return null;

                    return (
                      <FormSection key={groupId} theme={theme} style={{ marginBottom: '2rem' }}>
                        <FormTitle theme={theme} style={{ borderBottom: `1px solid ${theme.BORDER}`, paddingBottom: '0.5rem' }}>
                          <Class /> {group.class_name} {group.section_name ? `- ${group.section_name}` : ''}
                        </FormTitle>
                        <SubjectsGrid>
                          {group.assignments.map((assignment, assignIndex) => (
                            <SubjectCard key={assignment.subject_id} theme={theme}>
                              <SubjectCardHeader theme={theme} style={{ justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  📚 {assignment.subject_name}
                                </div>
                                <span style={{ fontSize: '0.75rem', color: theme.TEXT_SECONDARY, fontWeight: 500 }}>
                                  {group.class_name} {group.section_name ? `(${group.section_name})` : ''}
                                </span>
                              </SubjectCardHeader>
                              <TextArea
                                theme={theme}
                                placeholder={`Homework for ${assignment.subject_name}...`}
                                value={assignment.homework_text}
                                onChange={(e) => {
                                  const newGroups = [...bulkGroups];
                                  newGroups[groupIndex].assignments[assignIndex].homework_text = e.target.value;
                                  setBulkGroups(newGroups);
                                }}
                                style={{ minHeight: '100px' }}
                              />
                            </SubjectCard>
                          ))}
                        </SubjectsGrid>
                      </FormSection>
                    );
                  })}
                </>
              )}
            </div>
          ) : selectedClass && selectedDate ? (
            <>
              {!isEditing && (
                <FormSection theme={theme}>
                  <FormTitle theme={theme}>
                    <Add /> Add New Homework
                  </FormTitle>
                  <FormGrid>
                    <FilterGroup>
                      <FilterLabel theme={theme}>Subject</FilterLabel>
                      <Select
                        theme={theme}
                        value={selectedSubjectForEdit || ''}
                        onChange={(e) => setSelectedSubjectForEdit(e.target.value ? Number(e.target.value) : '')}
                      >
                        <option value="">Select Subject</option>
                        {subjects.map(subj => (
                          <option key={subj.subject_id} value={subj.subject_id}>
                            {subj.subject?.name || 'Unknown'}
                          </option>
                        ))}
                      </Select>
                    </FilterGroup>
                  </FormGrid>
                  <TextArea
                    theme={theme}
                    placeholder="Enter homework text..."
                    value={homeworkText}
                    onChange={(e) => setHomeworkText(e.target.value)}
                  />
                </FormSection>
              )}

              {isEditing && (
                <FormSection ref={editFormRef} theme={theme}>
                  <FormTitle theme={theme}>
                    <Edit /> Edit Homework
                  </FormTitle>
                  <FormGrid>
                    <FilterGroup>
                      <FilterLabel theme={theme}>Subject</FilterLabel>
                      <Select
                        theme={theme}
                        value={selectedSubjectForEdit || ''}
                        onChange={(e) => setSelectedSubjectForEdit(e.target.value ? Number(e.target.value) : '')}
                      >
                        <option value="">Select Subject</option>
                        {subjects.map(subj => (
                          <option key={subj.subject_id} value={subj.subject_id}>
                            {subj.subject?.name || 'Unknown'}
                          </option>
                        ))}
                      </Select>
                    </FilterGroup>
                  </FormGrid>
                  <TextArea
                    theme={theme}
                    placeholder="Enter homework text..."
                    value={homeworkText}
                    onChange={(e) => setHomeworkText(e.target.value)}
                  />
                </FormSection>
              )}

              {homeworkEntries.filter(entry => entry.subject_id !== null).length > 0 ? (
                <HomeworkCardsGrid theme={theme}>
                  {homeworkEntries.filter(entry => entry.subject_id !== null).map(entry => (
                    <HomeworkCard key={entry.id} theme={theme}>
                      <HomeworkHeader theme={theme}>
                        <SubjectName theme={theme}>
                          <Book /> {entry.subject_name || 'Unknown Subject'}
                        </SubjectName>
                        <ActionButtons>
                          <Button variant="secondary" onClick={() => handleEdit(entry)}>
                            <Edit /> Edit
                          </Button>
                          <Button variant="danger" onClick={() => handleDeleteClick(entry.id)}>
                            <Delete /> Delete
                          </Button>
                        </ActionButtons>
                      </HomeworkHeader>
                      <HomeworkText theme={theme}>{entry.homework_text}</HomeworkText>
                      <HomeworkMeta theme={theme}>
                        <span>📅 {format(parseISO(entry.homework_date), 'dd-MM-yyyy')}</span>
                        {entry.assigned_by_name && <span>👤 {entry.assigned_by_name}</span>}
                      </HomeworkMeta>
                    </HomeworkCard>
                  ))}
                </HomeworkCardsGrid>
              ) : (
                !loading && (
                  <EmptyState theme={theme}>
                    <EmptyStateIcon>📝</EmptyStateIcon>
                    <EmptyStateText>No homework assigned for this date</EmptyStateText>
                    <EmptyStateSubtext>Add homework using the form above</EmptyStateSubtext>
                  </EmptyState>
                )
              )}
            </>
          ) : (
            <EmptyState theme={theme}>
              <EmptyStateIcon>📚</EmptyStateIcon>
              <EmptyStateText>Select class and date to view or assign homework</EmptyStateText>
            </EmptyState>
          )}

          {/* Fixed Footer for Actions */}
          {(isBulkMode || (selectedClass && selectedDate)) && (
            <FixedFooter theme={theme}>
              {isBulkMode ? (
                <>
                  <Button variant="secondary" onClick={() => setIsBulkMode(false)}>
                    <Cancel /> Cancel
                  </Button>
                  <Button variant="primary" onClick={handleGlobalBulkSave} disabled={saving || isSelectedDateSunday}>
                    <Save /> {saving ? 'Saving...' : isSelectedDateSunday ? 'Sunday' : 'Save Changes'}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" onClick={handleCancel}>
                    <Cancel /> Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSaveHomework}
                    disabled={saving || !homeworkText.trim() || isSelectedDateSunday}
                  >
                    <Save /> {saving ? 'Saving...' : isSelectedDateSunday ? 'Sunday' : (isEditing ? 'Update Homework' : 'Save Homework')}
                  </Button>
                </>
              )}
            </FixedFooter>
          )}
        </MainContent>

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && (
          <DeleteModalOverlay onClick={handleDeleteCancel}>
            <DeleteModalBox theme={theme} onClick={(e) => e.stopPropagation()}>
              <DeleteModalHeader theme={theme}>
                <Delete />
                <h3>Delete Homework</h3>
              </DeleteModalHeader>
              <DeleteModalContent theme={theme}>
                Are you sure you want to delete this homework entry? This action cannot be undone.
              </DeleteModalContent>
              <DeleteModalActions>
                <DeleteModalButton variant="cancel" theme={theme} onClick={handleDeleteCancel}>
                  Cancel
                </DeleteModalButton>
                <DeleteModalButton variant="delete" onClick={handleDeleteConfirm}>
                  Delete
                </DeleteModalButton>
              </DeleteModalActions>
            </DeleteModalBox>
          </DeleteModalOverlay>
        )}
      </PageContainer>
    </LocalizationProvider>
  );
};

export default HomeworkDiaryManager;

