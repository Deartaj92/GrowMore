import React, { useState, useEffect, useRef, useMemo, memo, useCallback, useContext } from 'react';
import styled, { useTheme, css, keyframes } from 'styled-components';
import { sortClasses } from '../utils/classUtils';
import { getStudentDisplayId, matchesStudentSearch } from '../utils/studentUtils';
import { supabase } from '../supabaseClient';
import {
  AccountCircle,
  Edit as EditIcon,
  Delete as DeleteIcon,
  School as SchoolIcon,
  Block as BlockIcon,
  ExitToApp as ExitIcon,
  History as HistoryMaterialIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  PeopleOutline as PeopleOutlineIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { useToast } from '../components/useToast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CircularProgress, Box, Grid } from '@mui/material';
import { darkTheme, lightTheme, useProgress, ThemeContext } from '../components/Layout';
import { useLoading } from '../contexts/LoadingContext';
import NoStudentsFound from '../components/NoStudentsFound';
import { usePageFooter } from '../components/Layout/contexts/PageFooterContext';

import Loader from '../components/Loader';
// Styled components
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  max-width: 100%;
  position: relative;
  background: ${({ theme }) => theme.BG};
  overflow: hidden;
`;

const ContentArea = styled.div`
  flex: 1;
  width: 100%;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 8px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &::-webkit-scrollbar {
    display: none;
  }

  -ms-overflow-style: none;
  scrollbar-width: none;
`;

const Header = styled.div`
  position: sticky;
  top: 0;
  z-index: 20;
  background: ${({ theme }) => theme.BG};
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  width: 100%;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    padding: 8px;
    gap: 8px;
    flex-direction: column;
    align-items: stretch;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
  
  @media (max-width: 768px) {
    width: 100%;
    flex-direction: column;
    gap: 8px;
  }
`;

const Heading = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  text-align: left;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 10px;
  padding: 0.5rem 0.7rem;
  width: 300px;
  position: relative;

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const SearchInput = styled.input`
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.05rem;
  width: 100%;
  margin-left: 0.5rem;
  outline: none;
  &::placeholder {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
  }
`;

const FilterSelect = styled.select`
  padding: 0.5rem 0.7rem;
  border-radius: 8px;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.05rem;
  outline: none;
  min-width: 140px;
  margin-left: 1rem;
  transition: border 0.18s;
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
  }

  @media (max-width: 768px) {
    width: 100%;
    margin-left: 0;
  }
`;

const PageGrid = styled.div`
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  @media (max-width: 900px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const StudentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  width: 100%;
  padding: 0;
  margin: 0;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(1, minmax(0, 1fr));
    gap: 12px; /* Reduce gap on mobile for better performance */
  }
`;

const getStatusColor = (status: string) =>
  status === 'active' ? '34,197,94' : // green
    status === 'inactive' ? '107,114,128' : // gray
      status === 'suspended' ? '245,158,11' : // orange
        status === 'withdrawn' ? '239,68,68' : // red
          '99,102,241'; // blue

const StudentCard = styled.div<{ status: string }>`
  background: ${({ theme }) => theme.CARD};
  border-radius: 14px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.18), 0 1.5px 6px rgba(0,0,0,0.10);
  padding: 0;
  position: relative;
  border: 2.5px solid rgba(${({ status }) => getStatusColor(status)}, 0.5);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.18s;
  min-width: 270px;
  max-width: 100%;
  width: 100%;
  overflow: hidden;
  box-sizing: border-box;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: rgba(${({ status }) => getStatusColor(status)}, 0.8);
  }
  
  @media (max-width: 700px) {
    /* Optimize for mobile performance */
    padding: 0;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    border-width: 2px;
    transition: none;
    transform: translateZ(0);
    will-change: transform;
    
    &:hover {
      transform: translateZ(0);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    &:active {
      opacity: 0.95;
    }
  }
`;

const StatusBadge = styled.div<{ status: string }>`
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  background: ${({ status }) =>
    status === 'active' ? 'rgb(34, 197, 94)' :
      status === 'inactive' ? 'rgb(107, 114, 128)' :
        status === 'suspended' ? 'rgb(245, 158, 11)' :
          status === 'withdrawn' ? 'rgb(239, 68, 68)' :
            'rgb(99, 102, 241)'};
  color: #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  z-index: 2;
  letter-spacing: 0.01em;
  display: flex;
  align-items: center;
  text-transform: capitalize;
  gap: 0.4rem;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
  
  &:active {
    transform: scale(0.98);
  }

  ${({ status }) => status === 'active' && `
    &::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.2; }
      50% { opacity: 0.8; }
    }
  `}
`;

const StudentInfo = styled.div`
  margin-top: 1rem;
`;

const StudentName = styled.h3`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.3rem 0;
  
  @media (max-width: 700px) {
    font-size: 0.95rem;
    margin: 0 0 0.25rem 0;
  }
`;

const StudentDetails = styled.p`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.85rem;
  margin: 0.2rem 0;
  
  @media (max-width: 700px) {
    font-size: 0.8rem;
    margin: 0.15rem 0;
  }
`;

const ActionButtons = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 3px;
  width: 200px;
  background: transparent;
  border-radius: 6px;
  padding: 3px;
  flex-shrink: 0;
  
  /* When single button, align to bottom right */
  &[data-single-button="true"] {
    display: flex !important;
    justify-content: flex-end;
    align-items: flex-end;
    width: 200px; /* Keep same width as grid */
    
    button {
      width: auto !important;
      min-width: fit-content;
      max-width: calc(100% - 6px); /* Ensure it fits within padding */
    }
  }
  
  @media (max-width: 700px) {
    /* 2x2 grid on mobile for compact layout */
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: repeat(2, minmax(0, 1fr));
    width: 150px;
    gap: 4px;
    padding: 0;
    margin: 0;
    background: transparent;
    border-radius: 6px;
    align-self: center;
    
    &[data-single-button="true"] {
      display: flex !important;
      justify-content: center;
      align-items: center;
      width: 150px;
      
      button {
        width: 100% !important;
      }
    }
  }
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'danger' | 'warning' }>`
  background: ${({ variant, theme }) =>
    variant === 'primary' ? 'rgba(59, 130, 246, 0.13)' :
      variant === 'danger' ? 'rgba(239, 68, 68, 0.13)' :
        variant === 'warning' ? 'rgba(251, 191, 36, 0.13)' :
          theme.BG === '#252525' ? '#333' : '#f3f4f6'};
  color: ${({ variant }) =>
    variant === 'primary' ? '#3b82f6' :
      variant === 'danger' ? '#ef4444' :
        variant === 'warning' ? '#f59e0b' :
          '#888'};
  border: none;
  border-radius: 6px;
  padding: clamp(0.3rem, 2vw, 0.6rem) clamp(0.4rem, 3vw, 0.8rem);
  font-size: clamp(0.5rem, 1.8vw, 0.85rem);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: clamp(0.1rem, 1vw, 0.3rem);
  transition: all 0.18s;
  min-width: 0;
  white-space: nowrap;
  height: clamp(28px, 8vw, 36px);
  width: 100%;
  justify-content: center;
  overflow: visible;
  box-sizing: border-box;

  /* Icon sizing */
  svg {
    width: clamp(0.7rem, 2.5vw, 1.1rem);
    height: clamp(0.7rem, 2.5vw, 1.1rem);
    flex-shrink: 0;
  }

  /* Text sizing */
  span {
    font-size: inherit;
    line-height: 1.1;
    white-space: nowrap;
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    background: ${({ variant }) =>
    variant === 'primary' ? 'rgba(59, 130, 246, 0.22)' :
      variant === 'danger' ? 'rgba(239, 68, 68, 0.22)' :
        variant === 'warning' ? 'rgba(251, 191, 36, 0.22)' :
          'rgba(120,120,120,0.18)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 700px) {
    /* Compact buttons to fit in one line */
    flex: 1;
    min-width: 0;
    padding: 0.4rem 0.3rem;
    font-size: 0.65rem;
    height: 32px;
    gap: 0.2rem;
    border-radius: 6px;
    white-space: nowrap;
    
    svg {
      width: 0.75rem;
      height: 0.75rem;
      flex-shrink: 0;
    }
    
    span {
      font-size: 0.65rem;
      font-weight: 600;
      white-space: nowrap;
    }
  }
`;

const HistoryButton = styled.button<{ status: string }>`
  position: absolute;
  background: ${({ theme }) => theme.BG === '#252525' ? '#555' : '#9ca3af'};
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  z-index: 3;
  transition: all 0.2s;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    background: ${({ theme }) => theme.BG === '#252525' ? '#666' : '#6b7280'};
  }
  
  svg {
    width: 0.75rem;
    height: 0.75rem;
  }
  
  /* Desktop: Position to the left of status badge (same top, calculated right) */
  @media (min-width: 701px) {
    top: 12px;
    /* Position closer to status badge - adjust based on badge width */
    /* Status badges vary: "Active" ~55px, "Withdrawn" ~75px, "Suspended" ~75px, "Inactive" ~70px */
    /* Using smaller gap for better proximity */
    right: calc(12px + 55px);
  }
  
  /* Mobile: Position below status badge */
  @media (max-width: 700px) {
    top: 44px;
    right: 12px;
    width: 22px;
    height: 22px;
    
    svg {
      width: 0.7rem;
      height: 0.7rem;
    }
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(0, 0, 0, 0.5)'
    : 'rgba(255, 255, 255, 0.5)'};
  backdrop-filter: blur(8px);
  WebkitBackdropFilter: blur(8px);
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fade-in 0.2s ease-out;
  @keyframes fade-in {
    from { opacity: 0; backdrop-filter: blur(0); }
    to { opacity: 1; backdrop-filter: blur(8px); }
  }
`;

const ModalBox = styled.div`
  background: ${({ theme }) => theme.CARD};
  width: 90vw;
  max-width: 500px;
  max-height: 90vh;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: ${({ theme }) => theme.BG === '#252525'
    ? '0 0 40px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.4)'
    : '0 0 40px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.1)'};
  border: ${({ theme }) => theme.BG === '#252525'
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  margin: 32px 16px;
  position: relative;
  z-index: 1301;
  animation: slide-up 0.3s cubic-bezier(0.2, 0.9, 0.4, 1);
  @keyframes slide-up {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @media (max-width: 768px) {
    width: calc(100% - 32px);
    height: calc(100% - 64px);
    margin: 32px 16px;
    max-height: calc(100% - 64px);
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'};
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)'};
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 10;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
`;

const ModalTitle = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  background: linear-gradient(45deg, #6366f1, #8b5cf6);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  display: flex;
  align-items: center;
  gap: 16px;
  text-shadow: ${({ theme }) => theme.BG === '#252525'
    ? '0 2px 4px rgba(0, 0, 0, 0.5)'
    : 'none'};
  position: relative;
  z-index: 1;
  letter-spacing: 0.5px;
`;

const ModalContent = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 100%)'
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 100%)'};
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.2) transparent'
    : 'rgba(0, 0, 0, 0.2) transparent'};
  &::-webkit-scrollbar {
    width: 8px;
    background: transparent;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 4px;
    margin: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.2)'
    : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 4px;
    border: 2px solid ${({ theme }) => theme.BG};
    &:hover {
      background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.3)'
    : 'rgba(0, 0, 0, 0.3)'};
    }
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'};
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
    : 'linear-gradient(0deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)'};
`;

type ModalButtonVariant = 'primary' | 'secondary' | 'danger';

const ModalButton = styled.button<{ variant?: ModalButtonVariant }>`
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: ${({ theme, variant }) =>
    variant === 'primary'
      ? 'linear-gradient(45deg, #6366f1, #8b5cf6)'
      : variant === 'danger'
        ? 'linear-gradient(45deg, #ef4444, #dc2626)'
        : theme.BG === '#252525'
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(0, 0, 0, 0.05)'};
  color: ${({ theme, variant }) =>
    variant === 'primary' || variant === 'danger'
      ? '#fff'
      : theme.BG === '#252525'
        ? '#fff'
        : '#1e293b'};
  border: none;
  box-shadow: ${({ variant }) =>
    variant === 'primary'
      ? '0 2px 8px rgba(99, 102, 241, 0.25)'
      : variant === 'danger'
        ? '0 2px 8px rgba(239, 68, 68, 0.25)'
        : 'none'};
  
  &:hover {
    transform: translateY(-1px);
    background: ${({ theme, variant }) =>
    variant === 'primary'
      ? 'linear-gradient(45deg, #4f46e5, #7c3aed)'
      : variant === 'danger'
        ? 'linear-gradient(45deg, #dc2626, #b91c1c)'
        : theme.BG === '#252525'
          ? 'rgba(255, 255, 255, 0.15)'
          : 'rgba(0, 0, 0, 0.1)'};
    box-shadow: ${({ variant }) =>
    variant === 'primary'
      ? '0 4px 12px rgba(99, 102, 241, 0.35)'
      : variant === 'danger'
        ? '0 4px 12px rgba(239, 68, 68, 0.35)'
        : 'none'};
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const Avatar = styled.div`
  width: 120px;
  min-height: 140px;
  align-self: stretch;
  border-radius: 0;
  background: ${({ theme }) => theme.ACCENT + '22'};
  color: ${({ theme }) => theme.ACCENT};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 700;
  flex-shrink: 0;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ theme }) => theme.BG === '#252525' ?
    'linear-gradient(45deg, rgba(255,255,255,0.1), transparent)' :
    'linear-gradient(45deg, rgba(0,0,0,0.05), transparent)'};
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover::after {
    opacity: 1;
  }

  @media (max-width: 700px) {
    width: 90px;
    min-height: 120px;
    font-size: 2rem;
  }
`;

const CardTop = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0;
  max-height: 140px;
  
  @media (max-width: 700px) {
    max-height: 120px;
  }
`;

const MobileInfoRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  width: 100%;
`;

const FatherName = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.85rem;
  margin-bottom: 0.1rem;
  
  @media (max-width: 700px) {
    font-size: 0.8rem;
    margin-bottom: 0.05rem;
  }
`;

const ReasonBadge = styled.div<{ status: string }>`
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 500;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  background: ${({ theme, status }) =>
    theme.BG === '#252525'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(0, 0, 0, 0.03)'};
  border-left: 3px solid ${({ status }) =>
    status === 'suspended' ? '#f59e0b' :
      status === 'withdrawn' ? '#ef4444' :
        status === 'inactive' ? '#6b7280' :
          '#6366f1'};
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  
  @media (max-width: 700px) {
    font-size: 0.65rem;
    padding: 0.35rem 0.5rem;
  }
`;

const StudentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const StudentItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : theme.CARD};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const StudentListItemName = styled.span`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
`;

const SelectAllContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
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

const PageSizeSelect = styled.select`
  padding: 0.5rem;
  border-radius: 8px;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  outline: none;
  margin-left: 1rem;

  @media (max-width: 768px) {
    margin-left: 0;
    width: 100%;
    margin-top: 0.5rem;
    padding: 0.4rem;
    font-size: 0.9rem;
  }
`;

const ModalInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  outline: none;
  transition: all 0.2s ease;
  margin-bottom: 0.5rem;

  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}33;
  }

  &::placeholder {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
  }
`;

const ModalSelect = styled.select`
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  outline: none;
  transition: all 0.2s ease;
  margin-bottom: 1rem;
  cursor: pointer;
  appearance: none;
  background-image: ${({ theme }) => theme.BG === '#252525'
    ? `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`
    : `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`};
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;

  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}33;
  }
`;

const ModalLabel = styled.label`
  display: block;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
`;

const ModalFormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const ModalText = styled.div`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.1rem;
  margin-bottom: 1.5rem;
  font-weight: 500;
  line-height: 1.5;

  strong {
    color: ${({ theme }) => theme.ACCENT};
    font-weight: 600;
  }
`;

const HistoryModalContent = styled.div`
  max-height: 70vh;
  overflow-y: auto;
  padding: 0 24px;
  margin: 16px 0;
  
  /* Modern scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05)'};

  /* Webkit scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
    background: transparent;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'};
    border-radius: 4px;
    margin: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.2)'
    : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 4px;
    border: 2px solid transparent;
    background-clip: padding-box;
    
    &:hover {
      background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.3)'
    : 'rgba(0, 0, 0, 0.3)'};
      border: 1.5px solid transparent;
      background-clip: padding-box;
    }
  }
`;

const HistoryEntry = styled.div<{ type: string }>`
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.02)'};
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  position: relative;
  border-left: 4px solid ${({ type }) =>
    type === 'suspend' ? '#f59e0b' :
      type === 'deactivate' ? '#6b7280' :
        type === 'withdraw' ? '#ef4444' :
          type === 'promote' ? '#3b82f6' :
            type === 'reactivate' ? '#22c55e' :
              type === 'readmit' ? '#10b981' : '#6b7280'};
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 12px ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(0, 0, 0, 0.3)'
    : 'rgba(0, 0, 0, 0.1)'};
  }

  @media (max-width: 700px) {
    transition: none;
    &:hover {
      transform: none;
      box-shadow: none;
    }
  }

  &::before {
    content: '';
    position: absolute;
    top: 16px;
    left: -10px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ type }) =>
    type === 'suspend' ? '#f59e0b' :
      type === 'deactivate' ? '#6b7280' :
        type === 'withdraw' ? '#ef4444' :
          type === 'promote' ? '#3b82f6' :
            type === 'reactivate' ? '#22c55e' :
              type === 'readmit' ? '#10b981' : '#6b7280'};
    box-shadow: 0 0 8px ${({ type }) =>
    type === 'suspend' ? 'rgba(245, 158, 11, 0.5)' :
      type === 'deactivate' ? 'rgba(107, 114, 128, 0.5)' :
        type === 'withdraw' ? 'rgba(239, 68, 68, 0.5)' :
          type === 'promote' ? 'rgba(59, 130, 246, 0.5)' :
            type === 'reactivate' ? 'rgba(34, 197, 94, 0.5)' :
              type === 'readmit' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(107, 114, 128, 0.5)'};
  }
`;

const HistoryTitle = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HistoryDate = styled.span`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: normal;
`;

const HistoryDetail = styled.div<{ type?: string }>`
  font-size: 0.95rem;
  color: ${({ theme, type }) => type ? type : theme.TEXT_SECONDARY};
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const HistoryPerformer = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.1)'};
`;

const StatusIcon = styled.span<{ type: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${({ type }) =>
    type === 'suspend' ? 'rgba(245, 158, 11, 0.2)' :
      type === 'deactivate' ? 'rgba(107, 114, 128, 0.2)' :
        type === 'withdraw' ? 'rgba(239, 68, 68, 0.2)' :
          type === 'promote' ? 'rgba(59, 130, 246, 0.2)' :
            type === 'reactivate' ? 'rgba(34, 197, 94, 0.2)' :
              type === 'readmit' ? 'rgba(16, 185, 129, 0.2)' :
                type === 'history' ? 'rgba(99, 102, 241, 0.2)' :
                  'rgba(107, 114, 128, 0.2)'};
  color: ${({ type }) =>
    type === 'suspend' ? '#f59e0b' :
      type === 'deactivate' ? '#6b7280' :
        type === 'withdraw' ? '#ef4444' :
          type === 'promote' ? '#3b82f6' :
            type === 'reactivate' ? '#22c55e' :
              type === 'readmit' ? '#10b981' :
                type === 'history' ? '#6366f1' :
                  '#6b7280'};
`;

const StyledSelect = styled.select`
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  outline: none;
  transition: all 0.2s ease;
  cursor: pointer;
  appearance: none;
  background-image: ${({ theme }) => theme.BG === '#252525'
    ? `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23e0e0e0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`
    : `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231a1a1a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`};
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;

  &:hover {
    border-color: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
  }

  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.ACCENT}26;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: ${({ theme }) => theme.BG === '#252525' ? '#252525' : '#f5f5f5'};
  }

  option {
    background: ${({ theme }) => theme.FIELD_BG};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
    padding: 8px;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const FormLabel = styled.label`
  display: block;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
`;

const InfoBox = styled.div<{ type?: 'success' | 'warning' | 'error' }>`
  background: ${({ theme, type }) => {
    if (type === 'success') return theme.BG === '#252525' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)';
    if (type === 'warning') return theme.BG === '#252525' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)';
    if (type === 'error') return theme.BG === '#252525' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)';
    return theme.BG === '#252525' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)';
  }};
  border: 1px solid ${({ theme, type }) => {
    if (type === 'success') return 'rgba(34, 197, 94, 0.2)';
    if (type === 'warning') return 'rgba(245, 158, 11, 0.2)';
    if (type === 'error') return 'rgba(239, 68, 68, 0.2)';
    return 'rgba(99, 102, 241, 0.2)';
  }};
  color: ${({ theme, type }) => {
    if (type === 'success') return theme.BG === '#252525' ? '#22c55e' : '#16a34a';
    if (type === 'warning') return theme.BG === '#252525' ? '#f59e0b' : '#d97706';
    if (type === 'error') return theme.BG === '#252525' ? '#ef4444' : '#dc2626';
    return theme.BG === '#252525' ? '#6366f1' : '#4f46e5';
  }};
  border-radius: 8px;
  padding: 12px 16px;
  margin-top: 1rem;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;



// Add SegmentedGroup, SegmentedInput, SegmentedSelect styled components (copied from StudentList.tsx)
const SEGMENTED_HEIGHT = '32px';
const SegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.BG === '#252525' ? '#222' : '#f3f4f6'};
  border-radius: 11px;
  box-shadow: 1.4px 1.4px 4px rgba(0, 0, 0, 0.1);
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
  box-shadow: 1.4px 1.4px 4px rgba(0, 0, 0, 0.1);
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
const SegmentedSelect = styled.select`
  ${SegmentedBase}
  padding: 0 2.2em 0 0.84em;
  border-right: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
  &:last-child { border-right: none; }
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

interface SegmentedButtonProps {
  active?: boolean;
  first?: boolean;
  last?: boolean;
  disabled?: boolean;
}

const SegmentedButton = styled.button<SegmentedButtonProps>`
  ${SegmentedBase}
  padding: 0 0.84em;
  min-width: 32px;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ disabled }) => disabled ? '0.5' : '1'};
  background: ${({ theme, active }) =>
    active ? theme.ACCENT :
      theme.BG === '#252525' ? '#444' : '#f3f4f6'};
  color: ${({ theme, active }) =>
    active ? '#fff' :
      theme.BG === '#252525' ? '#C0C0C0' : '#444'};
  border-right: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
  &:last-child { border-right: none; }
  &:not(:first-child) {
    border-left: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
  }
  border-top-left-radius: ${({ first }) => first ? '11px' : '0'};
  border-bottom-left-radius: ${({ first }) => first ? '11px' : '0'};
  border-top-right-radius: ${({ last }) => last ? '11px' : '0'};
  border-bottom-right-radius: ${({ last }) => last ? '11px' : '0'};
  &:hover:not(:disabled) {
    background: ${({ theme, active }) =>
    active ? theme.ACCENT :
      theme.BG === '#252525' ? '#555' : '#e5e7eb'};
  }
  @media (max-width: 700px) {
    width: 100%;
    min-width: 0;
  }
`;

const AddHeaderIconButton = styled.button`
  background: ${({ theme }) => theme.BG === '#252525' ? '#23242a' : '#f3f4f6'};
  border: none;
  border-radius: 8px;
  padding: 8px;
  margin-left: 8px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  @media (min-width: 701px) {
    display: none;
  }
`;

// Memoized Student Card Component for better performance
const MemoizedStudentCard = memo(({ student, onStatusChange, onPromote, onReadmit, onHistory, classes, sections, setSelectedStudent, setModalType, setShowModal, fetchSectionsForPromotion }: {
  student: any;
  onStatusChange: (studentId: string, newStatus: string, reason?: string, actionDate?: string) => void;
  onPromote: (studentId: string, newClassId: number, newSectionId: number) => void;
  onReadmit: (student: any) => void;
  onHistory: (studentId: number) => void;
  classes: any[];
  sections: any[];
  setSelectedStudent: (student: any) => void;
  setModalType: (type: 'suspend' | 'withdraw' | 'promote' | 'deactivate' | null) => void;
  setShowModal: (show: boolean) => void;
  fetchSectionsForPromotion: (classId: number, prevSectionId?: number) => void;
}) => {
  const navigate = useNavigate();
  const theme = useTheme();

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700;

  // Memoize button handlers to prevent re-renders
  const handleDeactivate = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const today = new Date().toISOString().split('T')[0];
    setSelectedStudent({
      ...student,
      reason: '',
      deactivateDate: today
    });
    setModalType('deactivate');
    setShowModal(true);
  }, [student, setSelectedStudent, setModalType, setShowModal]);

  const handleSuspend = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const today = new Date().toISOString().split('T')[0];
    setSelectedStudent({
      ...student,
      reason: '',
      suspendDate: today
    });
    setModalType('suspend');
    setShowModal(true);
  }, [student, setSelectedStudent, setModalType, setShowModal]);

  const handleWithdraw = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const today = new Date().toISOString().split('T')[0];
    setSelectedStudent({
      ...student,
      reason: '',
      withdrawDate: today
    });
    setModalType('withdraw');
    setShowModal(true);
  }, [student, setSelectedStudent, setModalType, setShowModal]);

  const handlePromoteClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedStudent({
      ...student,
      newClassId: student.class_id,
      newSectionId: student.section_id
    });
    setModalType('promote');
    setShowModal(true);
    if (student.class_id) {
      fetchSectionsForPromotion(student.class_id, student.section_id);
    }
  }, [student, setSelectedStudent, setModalType, setShowModal, fetchSectionsForPromotion]);

  const handleReactivate = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onStatusChange(student.id, 'active');
  }, [student.id, onStatusChange]);

  const handleReadmitClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onReadmit(student);
  }, [student, onReadmit]);

  const handleHistoryClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onHistory(student.id);
  }, [student.id, onHistory]);

  const handleAvatarClick = useCallback(() => {
    navigate(`/students/profile/${student.id}`);
  }, [student.id, navigate]);

  return (
    <StudentCard status={student.status}>
      {!isMobile && (
        <StatusBadge
          status={student.status}
          title="Click to view status history"
          onClick={handleHistoryClick}
        >
          {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
        </StatusBadge>
      )}
      <CardTop>
        <Avatar
          onClick={handleAvatarClick}
          title="View Student Profile"
        >
          {student.picture_url ? (
            <img src={student.picture_url} alt={student.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
          ) : (
            <span style={{ width: '100%', textAlign: 'center' }}>{(student.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?')}</span>
          )}
        </Avatar>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isMobile ? '1rem 0.5rem 1rem 0.75rem' : '1.2rem 1.5rem 1.2rem 1rem' }}>
          <StudentName>
            {student.name}
            <span style={{
              fontSize: '0.7rem',
              opacity: 0.6,
              marginLeft: '6px',
              fontWeight: 'normal'
            }}>
              #{getStudentDisplayId(student)}
            </span>
          </StudentName>
          <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '0.5rem' : '1rem', flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ flex: 1, width: isMobile ? '100%' : 'auto' }}>
              <FatherName>{student.father_name || 'N/A'}</FatherName>
              <StudentDetails style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span>
                  {student.classes?.name || 'N/A'}
                  {student.sections?.name && ` (${student.sections.name})`}
                </span>
                {isMobile && (
                  <StatusBadge
                    status={student.status}
                    title="Click to view status history"
                    onClick={handleHistoryClick}
                    style={{ position: 'relative', top: 'auto', right: 'auto', fontSize: '0.6rem', padding: '0.15rem 0.5rem' }}
                  >
                    {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                  </StatusBadge>
                )}
              </StudentDetails>
            </div>
            {!isMobile && (
              <ActionButtons data-single-button={student.status === 'withdrawn' ? 'true' : 'false'}>
                {student.status === 'active' && (
                  <>
                    <ActionButton onClick={handleDeactivate}>
                      <BlockIcon style={{ fontSize: '1rem' }} />
                      <span>Deactivate</span>
                    </ActionButton>
                    <ActionButton variant="warning" onClick={handleSuspend}>
                      <BlockIcon style={{ fontSize: '1rem' }} />
                      <span>Suspend</span>
                    </ActionButton>
                    <ActionButton variant="danger" onClick={handleWithdraw}>
                      <ExitIcon style={{ fontSize: '1rem' }} />
                      <span>Withdraw</span>
                    </ActionButton>
                    <ActionButton variant="primary" onClick={handlePromoteClick}>
                      <SchoolIcon style={{ fontSize: '1rem' }} />
                      <span>Promote</span>
                    </ActionButton>
                  </>
                )}
                {student.status === 'inactive' && (
                  <>
                    <ActionButton variant="primary" onClick={handleReactivate}>
                      <SchoolIcon style={{ fontSize: '1rem' }} />
                      <span>Reactivate</span>
                    </ActionButton>
                    <ActionButton variant="danger" onClick={handleWithdraw}>
                      <ExitIcon style={{ fontSize: '1rem' }} />
                      <span>Withdraw</span>
                    </ActionButton>
                  </>
                )}
                {student.status === 'suspended' && (
                  <>
                    <ActionButton variant="primary" onClick={handleReactivate}>
                      <SchoolIcon style={{ fontSize: '1rem' }} />
                      <span>Reactivate</span>
                    </ActionButton>
                    <ActionButton variant="danger" onClick={handleWithdraw}>
                      <ExitIcon style={{ fontSize: '1rem' }} />
                      <span>Withdraw</span>
                    </ActionButton>
                  </>
                )}
                {student.status === 'withdrawn' && (
                  <ActionButton variant="primary" onClick={handleReadmitClick}>
                    <SchoolIcon style={{ fontSize: '1rem' }} />
                    <span>Re-admit</span>
                  </ActionButton>
                )}
              </ActionButtons>
            )}
          </div>
        </div>
        {isMobile && (
          <ActionButtons data-single-button={student.status === 'withdrawn' ? 'true' : 'false'}>
            {student.status === 'active' && (
              <>
                <ActionButton onClick={handleDeactivate}>
                  <BlockIcon style={{ fontSize: '0.9rem' }} />
                  <span>Deact</span>
                </ActionButton>
                <ActionButton variant="warning" onClick={handleSuspend}>
                  <BlockIcon style={{ fontSize: '0.9rem' }} />
                  <span>Susp</span>
                </ActionButton>
                <ActionButton variant="danger" onClick={handleWithdraw}>
                  <ExitIcon style={{ fontSize: '0.9rem' }} />
                  <span>Withd</span>
                </ActionButton>
                <ActionButton variant="primary" onClick={handlePromoteClick}>
                  <SchoolIcon style={{ fontSize: '0.9rem' }} />
                  <span>Promo</span>
                </ActionButton>
              </>
            )}
            {student.status === 'inactive' && (
              <>
                <ActionButton variant="primary" onClick={handleReactivate}>
                  <SchoolIcon style={{ fontSize: '0.9rem' }} />
                  <span>Reactiv</span>
                </ActionButton>
                <ActionButton variant="danger" onClick={handleWithdraw}>
                  <ExitIcon style={{ fontSize: '0.9rem' }} />
                  <span>Withd</span>
                </ActionButton>
              </>
            )}
            {student.status === 'suspended' && (
              <>
                <ActionButton variant="primary" onClick={handleReactivate}>
                  <SchoolIcon style={{ fontSize: '0.9rem' }} />
                  <span>Reactiv</span>
                </ActionButton>
                <ActionButton variant="danger" onClick={handleWithdraw}>
                  <ExitIcon style={{ fontSize: '0.9rem' }} />
                  <span>Withd</span>
                </ActionButton>
              </>
            )}
            {student.status === 'withdrawn' && (
              <ActionButton variant="primary" onClick={handleReadmitClick}>
                <SchoolIcon style={{ fontSize: '0.9rem' }} />
                <span>Re-admit</span>
              </ActionButton>
            )}
          </ActionButtons>
        )}
      </CardTop>
    </StudentCard>
  );
});

const StudentStatusManager: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { setLoading, loading } = useLoading();
  const { startProgress, setProgress, completeProgress } = useProgress();
  const { setFooterContent } = usePageFooter();

  // Detect mobile early for initial state setup
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700;

  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'suspend' | 'withdraw' | 'promote' | 'deactivate' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyStudent, setHistoryStudent] = useState<any>(null);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showReadmitModal, setShowReadmitModal] = useState(false);
  const [readmitStudent, setReadmitStudent] = useState<any>(null);
  const [readmitClass, setReadmitClass] = useState('');
  const [readmitSection, setReadmitSection] = useState('');
  const [readmitSections, setReadmitSections] = useState<any[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSourceClass, setBulkSourceClass] = useState('');
  const [bulkAction, setBulkAction] = useState<'promote' | 'demote'>('promote');
  const [bulkTargetClass, setBulkTargetClass] = useState('');
  const [bulkTargetSection, setBulkTargetSection] = useState('');
  const [bulkSections, setBulkSections] = useState<any[]>([]);
  const [bulkSourceSection, setBulkSourceSection] = useState('');
  const [bulkSourceSections, setBulkSourceSections] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [sourceStudents, setSourceStudents] = useState<any[]>([]);
  const [targetStudents, setTargetStudents] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(isMobile ? 20 : 100);
  const [promotionSections, setPromotionSections] = useState<any[]>([]);
  const [userIdToName, setUserIdToName] = useState<Record<number, string>>({});
  const [userIdToStaffName, setUserIdToStaffName] = useState<Record<number, string>>({});
  const [hasAnyStudents, setHasAnyStudents] = useState<boolean | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const navigate = useNavigate();

  // Mobile optimizations - memoized to avoid re-creating on every render
  const mobileOptimizations = useMemo(() => ({
    enableAnimations: !isMobile,
    enableGlowEffects: !isMobile,
    reduceRenders: isMobile,
    batchUpdates: isMobile,
    debounceDelay: isMobile ? 500 : 300,
    renderBatchSize: isMobile ? 20 : 100
  }), [isMobile]);

  const totalPages = Math.ceil(filteredStudents.length / perPage);

  // Optimized pagination - always paginate, even when searching
  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return filteredStudents.slice(start, end);
  }, [filteredStudents, page, perPage]);

  // Add these calculations near the pagination logic - match StudentList.tsx exactly
  const from = (page - 1) * perPage + 1;
  const to = (page - 1) * perPage + paginated.length;
  const total = filteredStudents.length;

  // Memoized callback handlers for better performance - MUST be before useEffect that uses them
  const scrollToTop = useCallback(() => {
    if (contentAreaRef.current) {
      contentAreaRef.current.scrollTo({ top: 0, behavior: isMobile ? 'auto' : 'smooth' });
    }
  }, [isMobile]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    scrollToTop();
  }, [scrollToTop]);

  // Set global footer content - MUST be before early returns
  useEffect(() => {
    if (filteredStudents.length > 0) {
      const FooterContentComponent = React.memo(() => {
        const themeObj = (theme as any).BG === '#252525' ? darkTheme : lightTheme;
        const currentFrom = (page - 1) * perPage + 1;
        const currentTo = (page - 1) * perPage + paginated.length;
        const currentTotal = filteredStudents.length;
        
        return (
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'center' : 'center',
            justifyContent: isMobile ? 'center' : 'space-between',
            width: '100%',
            gap: isMobile ? '0.5rem' : '1rem',
            flexWrap: isMobile ? 'nowrap' : 'wrap'
          }}>
            <PaginationInfo theme={themeObj} style={{ flex: 1, textAlign: isMobile ? 'center' : 'left', fontSize: isMobile ? '0.9rem' : '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isMobile
                ? `${currentFrom} to ${currentTo} of ${currentTotal}`
                : `Showing ${currentFrom} to ${currentTo} of ${currentTotal} students`
              }
            </PaginationInfo>
            <PaginationControls theme={themeObj} style={{ flex: 'none', marginLeft: isMobile ? '0' : 'auto', width: 'auto' }}>
              <SegmentedGroup theme={themeObj}>
                <SegmentedButton
                  theme={themeObj}
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  first
                  style={{ minWidth: 32 }}
                >
                  ‹
                </SegmentedButton>
                {page > 1 && (
                  <SegmentedButton
                    theme={themeObj}
                    onClick={() => handlePageChange(page - 1)}
                    style={{ minWidth: 32 }}
                  >
                    {page - 1}
                  </SegmentedButton>
                )}
                <SegmentedButton
                  theme={themeObj}
                  active
                  disabled
                  style={{ minWidth: 32 }}
                >
                  {page}
                </SegmentedButton>
                {page < totalPages && (
                  <SegmentedButton
                    theme={themeObj}
                    onClick={() => handlePageChange(page + 1)}
                    style={{ minWidth: 32 }}
                  >
                    {page + 1}
                  </SegmentedButton>
                )}
                <SegmentedButton
                  theme={themeObj}
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  last
                  style={{ minWidth: 32 }}
                >
                  ›
                </SegmentedButton>
              </SegmentedGroup>
            </PaginationControls>
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
  }, [filteredStudents.length, page, perPage, paginated.length, totalPages, isMobile, theme, setFooterContent, handlePageChange]);

  const handleClassFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setClassFilter(e.target.value);
    setSectionFilter('');
  }, []);

  const handleSectionFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSectionFilter(e.target.value);
  }, []);

  const handleSessionFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSessionFilter(e.target.value);
  }, []);

  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  }, []);

  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      if (!user?.school_id) {
        toast.showToast('User school information not found', 'error');
        setLoading(false);
        return;
      }
      const minDuration = 2000;
      const start = Date.now();
      setLoading(true);
      setLoadingStudents(true);
      startProgress(false);
      setProgress(10);
      await fetchSessions();
      setProgress(20);
      await fetchClasses();
      setProgress(30);
      await fetchAllSections();
      setProgress(40);
      await checkForAnyStudents();
      setProgress(50);
      setProgress(60);
      setProgress(100);
      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => {
          setLoading(false);
          completeProgress();
        }, minDuration - elapsed);
      } else {
        setLoading(false);
        completeProgress();
      }
    };
    loadInitialData();
  }, [user?.school_id, startProgress, setProgress, completeProgress]);

  // Optimized filtered students computation with reduced memory allocations and ID search
  const computedFilteredStudents = useMemo(() => {
    if (!students.length) return [];

    // Pre-compute filter values to avoid repeated conversions
    const searchLower = search.trim().toLowerCase();
    const searchTerm = search.trim();
    const isNumericSearch = !isNaN(Number(searchTerm));
    const searchTermNum = isNumericSearch ? parseInt(searchTerm) : null;
    const classFilterStr = classFilter ? String(classFilter) : '';
    const sectionFilterStr = sectionFilter ? String(sectionFilter) : '';
    const statusFilterStr = statusFilter ? String(statusFilter) : '';

    // Use for loop with scoring for better sorting
    const scoredResults: Array<{ student: typeof students[0]; score: number }> = [];

    for (let i = 0; i < students.length; i++) {
      const stu = students[i];
      let shouldInclude = true;
      let searchScore = 0;

      // Search filter with scoring
      if (searchLower && shouldInclude) {
        let searchMatch = false;

        // Check ID/roll_number search using utility function
        const idMatch = matchesStudentSearch(stu, searchTerm);
        if (idMatch.matches) {
          searchScore = idMatch.score;
          searchMatch = true;
        }

        // Name and other field searches
        if (!searchMatch) {
          const nameMatch = stu.name?.toLowerCase().includes(searchLower);
          const classMatch = stu.classes?.name?.toLowerCase().includes(searchLower);
          const sectionMatch = stu.sections?.name?.toLowerCase().includes(searchLower);

          if (nameMatch || classMatch || sectionMatch) {
            searchMatch = true;
            // Prioritize name matches
            if (nameMatch) {
              if (stu.name?.toLowerCase().startsWith(searchLower)) {
                searchScore = Math.max(searchScore, 100); // High priority for name starts with
              } else {
                searchScore = Math.max(searchScore, 50); // Lower priority for name contains
              }
            } else {
              searchScore = Math.max(searchScore, 25); // Lower priority for class/section matches
            }
          }
        }

        if (!searchMatch) {
          shouldInclude = false;
        }
      }

      // Class filter
      if (classFilterStr && shouldInclude) {
        shouldInclude = String(stu.class_id) === classFilterStr;
      }

      // Section filter
      if (sectionFilterStr && shouldInclude) {
        shouldInclude = String(stu.section_id) === sectionFilterStr;
      }

      // Status filter
      if (statusFilterStr && shouldInclude) {
        shouldInclude = String(stu.status) === statusFilterStr;
      }

      if (shouldInclude) {
        scoredResults.push({ student: stu, score: searchScore });
      }
    }

    // Sort by score descending (higher scores first), then by ID ascending
    scoredResults.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score; // Higher score first
      }
      return a.student.id - b.student.id; // Then by ID ascending
    });

    return scoredResults.map(item => item.student);
  }, [students, search, classFilter, sectionFilter, statusFilter]);

  // Update filtered state from memoized computation
  useEffect(() => {
    setFilteredStudents(computedFilteredStudents);
  }, [computedFilteredStudents]);

  useEffect(() => {
    setPage(1);
  }, [search, classFilter, sectionFilter, statusFilter, sessionFilter]);

  // Reset to page 1 if perPage changes and current page is out of range
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [perPage, totalPages]);

  // Optimized search debounce with mobile-specific delays
  useEffect(() => {
    const delay = mobileOptimizations.debounceDelay;
    let timeoutId: NodeJS.Timeout;

    const debouncedSearch = () => {
      if (timeoutId) clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          window.requestIdleCallback(() => {
            setSearch(searchInput);
          });
        } else {
          requestAnimationFrame(() => {
            setSearch(searchInput);
          });
        }
      }, delay);
    };

    debouncedSearch();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [searchInput, mobileOptimizations.debounceDelay]);

  // Optimized scroll handler with RAF for better mobile performance
  useEffect(() => {
    const el = contentAreaRef.current;
    if (!el) return;

    let rafId: number | null = null;

    const onScroll = () => {
      if (rafId) return; // Skip if already scheduled

      rafId = requestAnimationFrame(() => {
        // Minimal scroll handling for mobile performance
        rafId = null;
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      el.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    // Always fetch all students (current class comes from student_class_history)
    if (user?.school_id) {
      fetchStudents();
    }
  }, [sessionFilter, user?.school_id]);

  useEffect(() => {
    // Reset section filter when class filter changes
    setSectionFilter('');
  }, [classFilter]);

  useEffect(() => {
    const fetchReasons = async () => {
      const inactiveStudents = students.filter(s => s.status !== 'active');
      if (inactiveStudents.length === 0) return;
      const { data: historyData, error } = await supabase
        .from('student_status_history')
        .select('student_id, new_status, reason, created_at')
        .in('student_id', inactiveStudents.map(s => s.id))
        .order('created_at', { ascending: false });
      if (!error && historyData) {
        const reasonMap: Record<string, string> = {};
        inactiveStudents.forEach(stu => {
          const entry = historyData.find(
            h => h.student_id === stu.id && h.new_status === stu.status && h.reason
          );
          if (entry) reasonMap[stu.id] = entry.reason;
        });
        setStudents(prev =>
          prev.map(stu =>
            stu.status !== 'active'
              ? { ...stu, status_reason: reasonMap[stu.id] }
              : stu
          )
        );
      }
    };
    if (students.length > 0) fetchReasons();
  }, [students]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, is_active')
        .eq('school_id', user?.school_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);

      // Set default session filter to "All Sessions"
      setSessionFilter('all');
    } catch (err: any) {
      toast.showToast('Failed to fetch sessions', 'error');
    }
  };

  // Check if there are any students in the system
  const checkForAnyStudents = async () => {
    if (!user?.school_id) return;

    try {
      // Check if there are any students in the students table for this school
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', user.school_id)
        .limit(1);

      if (studentsError) {
        setHasAnyStudents(false);
        return;
      }

      setHasAnyStudents(studentsData && studentsData.length > 0);
    } catch (err: any) {
      setHasAnyStudents(false);
    }
  };

  const fetchStudents = async () => {
    try {
      // Always fetch all students from students table
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          *,
          classes:class_id(name),
          sections:section_id(name)
        `)
        .eq('school_id', user?.school_id)
        .order('name');

      if (studentsError) throw studentsError;

      if (!studentsData || studentsData.length === 0) {
        setStudents([]);
        setFilteredStudents([]);
        setTimeout(() => setLoadingStudents(false), 100);
        return;
      }

      // Get current class from student_class_history for each student
      const studentIds = studentsData.map((s: any) => s.id);

      // Fetch class history for all students - get latest record for each student
      const { data: historyData } = await supabase
        .from('student_class_history')
        .select(`
          id,
          student_id,
          session_id,
          new_class_id,
          new_section_id,
          new_classes:new_class_id(id, name),
          new_sections:new_section_id(id, name)
        `)
        .in('student_id', studentIds)
        .eq('school_id', user?.school_id)
        .order('id', { ascending: true });

      // Create a map of current class for each student
      const currentClassMap = new Map();

      if (historyData && historyData.length > 0) {
        // Group by student_id
        const studentRecordsMap = new Map();
        historyData.forEach((entry: any) => {
          const studentId = entry.student_id;
          if (!studentRecordsMap.has(studentId)) {
            studentRecordsMap.set(studentId, []);
          }
          studentRecordsMap.get(studentId).push(entry);
        });

        // For each student, get the latest record (current class)
        studentRecordsMap.forEach((records, studentId) => {
          if (records.length > 0) {
            // Last record = current class
            const lastRecord = records[records.length - 1];
            currentClassMap.set(studentId, {
              class: lastRecord.new_classes || null,
              section: lastRecord.new_sections || null,
              class_id: lastRecord.new_class_id || null,
              section_id: lastRecord.new_section_id || null
            });
          }
        });
      }

      // Merge student data with current class from history
      const studentsWithCurrentClass = studentsData.map((student: any) => {
        const currentClass = currentClassMap.get(student.id);

        // Use current class from history if available, otherwise fall back to students table
        return {
          ...student,
          classes: currentClass?.class || student.classes || null,
          sections: currentClass?.section || student.sections || null,
          class_id: currentClass?.class_id || student.class_id || null,
          section_id: currentClass?.section_id || student.section_id || null
        };
      });

      setStudents(studentsWithCurrentClass);
      setFilteredStudents(studentsWithCurrentClass);
      setTimeout(() => setLoadingStudents(false), 100);
    } catch (err: any) {
      toast.showToast('Failed to fetch students', 'error');
      setTimeout(() => setLoadingStudents(false), 100);
    }
  };

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, has_sections')
      .eq('school_id', user?.school_id)
      .order('name');

    if (!error && data) {
      // Sort classes: numbered classes first, then special classes (Play Group, Nursery, K.G)
      const sortedClasses = sortClasses(data);

      setClasses(sortedClasses);
    }
  };

  const fetchAllSections = async () => {
    const { data, error } = await supabase
      .from('sections')
      .select('id, name, class_id')
      .eq('school_id', user?.school_id);
    if (!error && data) {
      setSections(data);
    }
  };

  const handleStatusChange = async (studentId: string, newStatus: string, reason?: string, actionDate?: string) => {
    const minDuration = 2000;
    const start = Date.now();
    setLoading(true);
    try {
      setProcessing(true);
      const student = students.find(s => s.id === studentId);
      const oldStatus = student?.status;
      const oldClassId = student?.class_id;
      const oldSectionId = student?.section_id;
      // 1. Update only status and status_updated_at in students
      const { error } = await supabase
        .from('students')
        .update({
          status: newStatus,
          status_updated_at: new Date().toISOString()
        })
        .eq('id', studentId)
        .eq('school_id', user?.school_id);
      if (error) throw error;
      // 2. Record in student_status_history
      await supabase.from('student_status_history').insert({
        student_id: studentId,
        school_id: user?.school_id,
        action: newStatus === 'suspended' ? 'suspend' :
          newStatus === 'withdrawn' ? 'withdraw' :
            newStatus === 'inactive' ? 'deactivate' :
              newStatus === 'active' ? 'reactivate' : newStatus,
        old_status: oldStatus,
        new_status: newStatus,
        old_class_id: oldClassId,
        new_class_id: oldClassId,
        reason: reason || null,
        performed_by: user?.id || null,
        new_section_id: oldSectionId || null,
        created_at: actionDate
          ? new Date(actionDate + 'T' + new Date().toTimeString().slice(0, 8)).toISOString()
          : undefined
      });
      toast.showToast('Student status updated successfully', 'success');
      fetchStudents();
      setShowModal(false);
      setSelectedStudent(null);
      setModalType(null);
    } catch (err: any) {
      toast.showToast(err.message, 'error');
    } finally {
      setProcessing(false);
      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => setLoading(false), minDuration - elapsed);
      } else {
        setLoading(false);
      }
    }
  };

  // Helper function to update student_class_history
  const updateStudentClassHistory = async (studentId: string, sessionId: string, newClassId: number, newSectionId: number | null) => {

    // First, get the original admission class from the first record (minimum id) for this student
    // This preserves the admission class which should never change
    const { data: admissionRecord, error: admissionError } = await supabase
      .from('student_class_history')
      .select('adm_class_id, adm_section_id')
      .eq('student_id', studentId)
      .eq('school_id', user?.school_id)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    // If no admission record exists, use the new class as admission (shouldn't happen for promotions, but handle it)
    const admClassId = admissionRecord?.adm_class_id || newClassId;
    const admSectionId = admissionRecord?.adm_section_id !== null ? admissionRecord?.adm_section_id : newSectionId;


    // Check if an entry exists for this student in this session
    const { data: existingEntry, error: checkError } = await supabase
      .from('student_class_history')
      .select('id')
      .eq('student_id', studentId)
      .eq('session_id', sessionId)
      .eq('school_id', user?.school_id)
      .maybeSingle();


    if (existingEntry) {
      // Update existing entry - preserve admission class, update only new/current class
      const { error: schError } = await supabase
        .from('student_class_history')
        .update({
          adm_class_id: admClassId, // Preserve admission class (never change)
          adm_section_id: admSectionId, // Preserve admission section (never change)
          new_class_id: newClassId, // Update current class to promoted class
          new_section_id: newSectionId // Update current section to promoted section
        })
        .eq('id', existingEntry.id);

      if (schError) {
        // Failed to update student_class_history
      }
    } else {
      // Create new entry - preserve admission class, set new class to promoted class
      const { error: schError } = await supabase
        .from('student_class_history')
        .insert({
          student_id: studentId,
          session_id: sessionId,
          adm_class_id: admClassId, // Preserve admission class (never change)
          adm_section_id: admSectionId, // Preserve admission section (never change)
          new_class_id: newClassId, // Set current class to promoted class
          new_section_id: newSectionId, // Set current section to promoted section
          school_id: user?.school_id
        });

      if (schError) {
        // Failed to create student_class_history entry
      }
    }
  };

  const handlePromote = async (studentId: string, newClassId: number, newSectionId: number | null) => {
    const minDuration = 2000;
    const start = Date.now();
    setLoading(true);
    try {
      setProcessing(true);
      const student = students.find(s => s.id === studentId);
      const oldClassId = student?.class_id;
      const oldSectionId = student?.section_id;
      const oldStatus = student?.status;

      // Check if the new class has sections
      const selectedClass = classes.find(c => c.id === newClassId);
      const hasSections = selectedClass?.has_sections ?? true;
      const finalSectionId = hasSections ? newSectionId : null;

      // Update or create student_class_history for the current session
      // Note: We do NOT update class_id and section_id in students table - only update student_class_history
      if (sessionFilter === 'all') {
        // When "All Sessions" is selected, update student_class_history for the active session
        const { data: activeSession } = await supabase
          .from('sessions')
          .select('id')
          .eq('school_id', user?.school_id)
          .eq('is_active', true)
          .single();

        if (activeSession) {
          await updateStudentClassHistory(studentId, activeSession.id, newClassId, finalSectionId);
        }
      } else if (sessionFilter) {
        // Specific session selected
        await updateStudentClassHistory(studentId, sessionFilter, newClassId, finalSectionId);
      }

      // 2. Record in student_status_history
      await supabase.from('student_status_history').insert({
        student_id: studentId,
        school_id: user?.school_id,
        action: 'promote',
        old_status: oldStatus,
        new_status: oldStatus, // status doesn't change on promote
        old_class_id: oldClassId,
        new_class_id: newClassId,
        reason: null,
        performed_by: user?.id || null,
        new_section_id: newSectionId || null
      });

      toast.showToast('Student promoted successfully', 'success');
      fetchStudents();
      setShowModal(false);
      setSelectedStudent(null);
      setModalType(null);
    } catch (err: any) {
      toast.showToast(err.message, 'error');
    } finally {
      setProcessing(false);
      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => setLoading(false), minDuration - elapsed);
      } else {
        setLoading(false);
      }
    }
  };

  const fetchHistory = async (studentId: number) => {
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from('student_status_history')
      .select('*')
      .eq('student_id', studentId)
      .eq('school_id', user?.school_id)
      .order('created_at', { ascending: false }); // Most recent first
    setHistoryRecords(data || []);
    setHistoryLoading(false);
    // Fetch user names for performed_by
    const userIds = Array.from(new Set((data || []).map(r => r.performed_by).filter(Boolean)));
    if (userIds.length > 0) {
      // 1. Fetch users to get staff_id
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, staff_id')
        .in('id', userIds)
        .eq('school_id', user?.school_id);
      const idToName: Record<number, string> = {};
      const idToStaffId: Record<number, string> = {};
      (usersData || []).forEach(u => {
        idToName[u.id] = u.name;
        if (u.staff_id) idToStaffId[u.id] = u.staff_id;
      });
      setUserIdToName(idToName);
      // 2. Fetch staff names
      const staffIds = Object.values(idToStaffId).filter(Boolean);
      let staffIdToName: Record<string, string> = {};
      if (staffIds.length > 0) {
        const { data: staffData } = await supabase
          .from('staff')
          .select('id, name')
          .in('id', staffIds)
          .eq('school_id', user?.school_id);
        (staffData || []).forEach(s => { staffIdToName[s.id] = s.name; });
      }
      // 3. Map userId to staff name
      const userIdToStaffNameMap: Record<number, string> = {};
      Object.entries(idToStaffId).forEach(([userId, staffId]) => {
        if (staffIdToName[staffId]) userIdToStaffNameMap[userId as any] = staffIdToName[staffId];
      });
      setUserIdToStaffName(userIdToStaffNameMap);
    } else {
      setUserIdToName({});
      setUserIdToStaffName({});
    }
  };

  const openReadmitModal = (student: any) => {
    setReadmitStudent(student);
    setReadmitClass(student.class_id ? String(student.class_id) : '');
    setReadmitSection(student.section_id ? String(student.section_id) : '');
    setShowReadmitModal(true);
    fetchSectionsForClass(student.class_id);
  };

  const fetchSectionsForClass = async (classId: number) => {
    if (!classId) return setReadmitSections([]);
    const { data } = await supabase
      .from('sections')
      .select('id, name')
      .eq('class_id', classId)
      .eq('school_id', user?.school_id);
    setReadmitSections(data || []);
  };

  const handleReadmit = async () => {
    // Check if class has sections
    const selectedClass = classes.find(c => String(c.id) === String(readmitClass));
    const hasSections = selectedClass?.has_sections ?? true;

    if (!readmitStudent || !readmitClass || (hasSections && !readmitSection)) return;

    const minDuration = 2000;
    const start = Date.now();
    setLoading(true);
    try {
      const oldStatus = readmitStudent.status;
      const oldClassId = readmitStudent.class_id;
      const oldSectionId = readmitStudent.section_id;
      const newClassId = parseInt(readmitClass);
      const newSectionId = hasSections && readmitSection ? parseInt(readmitSection) : null;

      // 1. Update status, class, section, and status_updated_at in students
      const { error } = await supabase
        .from('students')
        .update({
          status: 'active',
          class_id: newClassId,
          section_id: newSectionId,
          status_updated_at: new Date().toISOString()
        })
        .eq('id', readmitStudent.id)
        .eq('school_id', user?.school_id);
      if (error) throw error;

      // 2. Update or create student_class_history for the current session
      if (sessionFilter === 'all') {
        // When "All Sessions" is selected, update student_class_history for the active session
        const { data: activeSession } = await supabase
          .from('sessions')
          .select('id')
          .eq('school_id', user?.school_id)
          .eq('is_active', true)
          .single();

        if (activeSession) {
          await updateStudentClassHistory(readmitStudent.id, activeSession.id, newClassId, newSectionId);
        }
      } else if (sessionFilter) {
        // Specific session selected
        await updateStudentClassHistory(readmitStudent.id, sessionFilter, newClassId, newSectionId);
      }

      // 3. Record in student_status_history
      await supabase.from('student_status_history').insert({
        student_id: readmitStudent.id,
        school_id: user?.school_id,
        action: 'readmit',
        old_status: oldStatus,
        new_status: 'active',
        old_class_id: oldClassId,
        new_class_id: newClassId,
        reason: null,
        performed_by: user?.id || null,
        new_section_id: newSectionId || null
      });

      toast.showToast('Student re-admitted successfully', 'success');
      fetchStudents();
      setShowReadmitModal(false);
      setReadmitStudent(null);
      setReadmitClass('');
      setReadmitSection('');
    } catch (err: any) {
      toast.showToast(err.message, 'error');
    } finally {
      setProcessing(false);
      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => setLoading(false), minDuration - elapsed);
      } else {
        setLoading(false);
      }
    }
  };

  // Helper to get class/section name by id
  const getClassName = (id: number) => classes.find((c: any) => c.id === id)?.name || id;
  const getSectionName = (id: number) => sections.find((s: any) => s.id === id)?.name || id;

  // Helper to fetch sections for a class
  const fetchSectionsForPromotion = async (classId: number, prevSectionId?: number) => {
    if (!classId) {
      setPromotionSections([]);
      return;
    }
    const { data } = await supabase
      .from('sections')
      .select('id, name')
      .eq('class_id', classId)
      .eq('school_id', user?.school_id);
    setPromotionSections(data || []);
    // If previous section exists in new class, preselect it
    if (selectedStudent && prevSectionId) {
      const match = (data || []).find((sec: any) => sec.id === prevSectionId);
      setSelectedStudent((prev: any) => ({
        ...prev,
        newSectionId: match ? match.id : (data && data[0] ? data[0].id : '')
      }));
    }
  };

  const openModal = (student: any, type: 'suspend' | 'withdraw' | 'promote') => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedStudent({
      ...student,
      reason: '',
      suspendDate: type === 'suspend' ? today : undefined,
      withdrawDate: type === 'withdraw' ? today : undefined
    });
    setModalType(type);
    setShowModal(true);
  };

  if (loading) {
    return <Loader />;
  }

  // Top-level check for no students in table at page load
  if (!loadingStudents && hasAnyStudents === false) {
    return <NoStudentsFound />;
  }

  return (
    <PageContainer>
      <Header>
        {/* Header row: always flex row, header left, toggle right */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: 8,
            marginBottom: window.innerWidth <= 700 ? 4 : 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ActionButton
              variant="primary"
              onClick={() => navigate('/bulk-promote-demote')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                fontSize: '0.9rem',
                height: '32px'
              }}
            >
              <SchoolIcon style={{ fontSize: '1rem' }} />
              Promote/Demote
            </ActionButton>
          </div>

          {/* Mobile filter toggle button */}
          <div style={{ display: window.innerWidth > 700 ? 'none' : 'flex', alignItems: 'center' }}>
            <button
              aria-label="Show/hide filters"
              style={{
                background: (theme as any).BG === '#252525' ? '#23242a' : '#f3f4f6',
                border: 'none',
                borderRadius: 8,
                padding: 8,
                marginLeft: 8,
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
              }}
              onClick={() => setShowMobileFilters(v => !v)}
            >
              <FilterListIcon style={{ fontSize: 24, color: (theme as any).BG === '#252525' ? '#C0C0C0' : '#444' }} />
            </button>
          </div>

          {/* Desktop filters */}
          <FilterGroup style={{ display: window.innerWidth > 700 ? 'flex' : 'none' }}>
            <SegmentedGroup>
              <SegmentedInput
                type="text"
                placeholder="Search students..."
                value={searchInput}
                onChange={handleSearchInputChange}
                style={{ minWidth: 180, maxWidth: 240, width: '100%' }}
              />
              <SegmentedSelect
                value={sessionFilter}
                onChange={handleSessionFilterChange}
              >
                <option value="all">All Sessions</option>
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.name} {session.is_active ? '(Active)' : ''}
                  </option>
                ))}
              </SegmentedSelect>
              <SegmentedSelect
                value={classFilter}
                onChange={handleClassFilterChange}
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </SegmentedSelect>
              {(() => {
                const selectedClass = classes.find(c => String(c.id) === String(classFilter));
                const hasSections = selectedClass?.has_sections ?? true;
                return hasSections ? (
                  <SegmentedSelect
                    value={sectionFilter}
                    onChange={handleSectionFilterChange}
                    disabled={!classFilter}
                  >
                    <option value="">All Sections</option>
                    {sections.filter(s => !classFilter || s.class_id === parseInt(classFilter)).map(sec => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </SegmentedSelect>
                ) : null;
              })()}
              <SegmentedSelect
                value={statusFilter}
                onChange={handleStatusFilterChange}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="withdrawn">Withdrawn</option>
              </SegmentedSelect>
            </SegmentedGroup>
          </FilterGroup>
        </div>

        {/* Search field - mobile only */}
        {window.innerWidth <= 700 && (
          <div style={{ width: '100%', marginTop: 8 }}>
            <SegmentedInput
              type="text"
              placeholder="Search students..."
              value={searchInput}
              onChange={handleSearchInputChange}
              style={{ width: '100%' }}
            />
          </div>
        )}

        {/* Mobile filters: 2 columns, only if showMobileFilters is true */}
        {window.innerWidth <= 700 && showMobileFilters && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              width: '100%',
              marginTop: 8,
              marginBottom: 8,
            }}
          >
            <SegmentedSelect
              value={sessionFilter}
              onChange={handleSessionFilterChange}
              style={{ width: '100%' }}
            >
              <option value="all">All Sessions</option>
              {sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.name} {session.is_active ? '(Active)' : ''}
                </option>
              ))}
            </SegmentedSelect>
            <SegmentedSelect
              value={classFilter}
              onChange={handleClassFilterChange}
              style={{ width: '100%' }}
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </SegmentedSelect>
            {(() => {
              const selectedClass = classes.find(c => String(c.id) === String(classFilter));
              const hasSections = selectedClass?.has_sections ?? true;
              return hasSections ? (
                <SegmentedSelect
                  value={sectionFilter}
                  onChange={handleSectionFilterChange}
                  disabled={!classFilter}
                  style={{ width: '100%' }}
                >
                  <option value="">All Sections</option>
                  {sections.filter(s => !classFilter || s.class_id === parseInt(classFilter)).map(sec => (
                    <option key={sec.id} value={sec.id}>{sec.name}</option>
                  ))}
                </SegmentedSelect>
              ) : null;
            })()}
            <SegmentedSelect
              value={statusFilter}
              onChange={handleStatusFilterChange}
              style={{ width: '100%' }}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="withdrawn">Withdrawn</option>
            </SegmentedSelect>
          </div>
        )}
      </Header>

      <ContentArea ref={contentAreaRef}>
        {loading || loadingStudents || (hasAnyStudents === null) ? (
          <Loader />
        ) : hasAnyStudents === false ? (
          <NoStudentsFound />
        ) : students.length === 0 && !loadingStudents ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            color: (theme as any).TEXT_SECONDARY,
            textAlign: 'center'
          }}>
            <span style={{ marginBottom: 16 }}>
              No students found.
            </span>
          </div>
        ) : paginated.length === 0 && (search || classFilter || sectionFilter || statusFilter) ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            color: (theme as any).TEXT_SECONDARY,
            textAlign: 'center'
          }}>
            <span style={{ marginBottom: 16 }}>
              {search
                ? `No students match your search for "${search}"${classFilter ? ` in ${classes.find(c => c.id === parseInt(classFilter))?.name || 'selected class'}` : ''}${sectionFilter ? `, section ${sections.find(s => s.id === parseInt(sectionFilter))?.name || ''}` : ''}${statusFilter ? `, status "${statusFilter}"` : ''}.`
                : classFilter || sectionFilter || statusFilter
                  ? `No students found${classFilter ? ` in ${classes.find(c => c.id === parseInt(classFilter))?.name || 'selected class'}` : ''}${sectionFilter ? `, section ${sections.find(s => s.id === parseInt(sectionFilter))?.name || ''}` : ''}${statusFilter ? `, status "${statusFilter}"` : ''}.`
                  : 'No students found.'}
            </span>
            <button
              onClick={() => {
                setSearch('');
                setClassFilter('');
                setSectionFilter('');
                setStatusFilter('');
              }}
              style={{
                padding: '8px 20px',
                background: (theme as any).BG === '#252525' ? ((theme as any).ACCENT + '22') : '#f3f4f8',
                border: `1.5px solid ${(theme as any).BG === '#252525' ? (theme as any).ACCENT : '#bbb'}`,
                borderRadius: 8,
                cursor: 'pointer',
                color: (theme as any).BG === '#252525' ? (theme as any).ACCENT : '#333',
                fontWeight: 600,
                fontSize: '0.95rem'
              }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <StudentGrid>
            {paginated.map(student => (
              <MemoizedStudentCard
                key={student.id}
                student={student}
                onStatusChange={handleStatusChange}
                onPromote={handlePromote}
                onReadmit={openReadmitModal}
                onHistory={async (studentId: number) => {
                  setHistoryStudent(student);
                  setShowHistoryModal(true);
                  await fetchHistory(studentId);
                }}
                classes={classes}
                sections={sections}
                setSelectedStudent={setSelectedStudent}
                setModalType={setModalType}
                setShowModal={setShowModal}
                fetchSectionsForPromotion={fetchSectionsForPromotion}
              />
            ))}
          </StudentGrid>
        )}
      </ContentArea>

      {showModal && selectedStudent && (
        <ModalOverlay>
          <ModalBox
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' && !processing) {
                if (modalType === 'deactivate' && selectedStudent.reason) {
                  handleStatusChange(selectedStudent.id, 'inactive', selectedStudent.reason, selectedStudent.deactivateDate);
                } else if (modalType === 'suspend' && selectedStudent.reason) {
                  handleStatusChange(selectedStudent.id, 'suspended', selectedStudent.reason, selectedStudent.suspendDate);
                } else if (modalType === 'withdraw' && selectedStudent.reason) {
                  handleStatusChange(selectedStudent.id, 'withdrawn', selectedStudent.reason, selectedStudent.withdrawDate);
                } else if (modalType === 'promote') {
                  handlePromote(selectedStudent.id, selectedStudent.newClassId, selectedStudent.newSectionId);
                }
              }
            }}
          >
            <ModalHeader>
              {modalType === 'deactivate' && (
                <>
                  <BlockIcon style={{ color: '#6b7280' }} />
                  Deactivate Student
                </>
              )}
              {modalType === 'suspend' && (
                <>
                  <BlockIcon style={{ color: '#f59e0b' }} />
                  Suspend Student
                </>
              )}
              {modalType === 'withdraw' && (
                <>
                  <ExitIcon style={{ color: '#ef4444' }} />
                  Withdraw Student
                </>
              )}
              {modalType === 'promote' && (
                <>
                  <SchoolIcon style={{ color: '#3b82f6' }} />
                  Promote Student
                </>
              )}
            </ModalHeader>

            <ModalContent>
              {modalType === 'deactivate' && (
                <>
                  <ModalText>
                    Are you sure you want to deactivate <strong>{selectedStudent.name}</strong>?
                    This will mark the student as inactive.
                  </ModalText>
                  <ModalFormGroup>
                    <ModalLabel htmlFor="reason">Enter reason for deactivation (required):</ModalLabel>
                    <ModalInput
                      id="reason"
                      type="text"
                      placeholder="Enter detailed reason"
                      value={selectedStudent.reason || ''}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, reason: e.target.value })}
                      required
                      autoFocus
                    />
                  </ModalFormGroup>
                  <ModalFormGroup>
                    <ModalLabel htmlFor="deactivateDate">Date of deactivation:</ModalLabel>
                    <ModalInput
                      id="deactivateDate"
                      type="date"
                      value={selectedStudent.deactivateDate || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, deactivateDate: e.target.value })}
                      required
                      min="2000-01-01"
                      max="2100-12-31"
                    />
                  </ModalFormGroup>
                </>
              )}

              {modalType === 'suspend' && (
                <>
                  <ModalText>
                    Are you sure you want to suspend <strong>{selectedStudent.name}</strong>?
                    This will temporarily restrict the student's access.
                  </ModalText>
                  <ModalFormGroup>
                    <ModalLabel htmlFor="reason">Enter reason for suspension (required):</ModalLabel>
                    <ModalInput
                      id="reason"
                      type="text"
                      placeholder="Enter detailed reason"
                      value={selectedStudent.reason || ''}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, reason: e.target.value })}
                      required
                      autoFocus
                    />
                  </ModalFormGroup>
                  <ModalFormGroup>
                    <ModalLabel htmlFor="suspendDate">Date of suspension:</ModalLabel>
                    <ModalInput
                      id="suspendDate"
                      type="date"
                      value={selectedStudent.suspendDate || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, suspendDate: e.target.value })}
                      required
                      min="2000-01-01"
                      max="2100-12-31"
                    />
                  </ModalFormGroup>
                </>
              )}

              {modalType === 'withdraw' && (
                <>
                  <ModalText>
                    Are you sure you want to withdraw <strong>{selectedStudent.name}</strong>?
                    This action will permanently remove the student from active status.
                  </ModalText>
                  <ModalFormGroup>
                    <ModalLabel htmlFor="reason">Enter reason for withdrawal (required):</ModalLabel>
                    <ModalInput
                      id="reason"
                      type="text"
                      placeholder="Enter detailed reason"
                      value={selectedStudent.reason || ''}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, reason: e.target.value })}
                      required
                      autoFocus
                    />
                  </ModalFormGroup>
                  <ModalFormGroup>
                    <ModalLabel htmlFor="withdrawDate">Date of withdrawal:</ModalLabel>
                    <ModalInput
                      id="withdrawDate"
                      type="date"
                      value={selectedStudent.withdrawDate || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSelectedStudent({ ...selectedStudent, withdrawDate: e.target.value })}
                      required
                      min="2000-01-01"
                      max="2100-12-31"
                    />
                  </ModalFormGroup>
                </>
              )}

              {modalType === 'promote' && (
                <>
                  <ModalText>
                    Promote <strong>{selectedStudent.name}</strong> to:
                  </ModalText>
                  <ModalFormGroup>
                    <ModalLabel>Select New Class</ModalLabel>
                    <ModalSelect
                      value={selectedStudent.newClassId || ''}
                      onChange={async (e: React.ChangeEvent<HTMLSelectElement>) => {
                        const newClassId = Number(e.target.value);
                        setSelectedStudent({ ...selectedStudent, newClassId, newSectionId: undefined });
                        if (newClassId) {
                          await fetchSectionsForPromotion(newClassId);
                        }
                      }}
                    >
                      <option value="">Select Class</option>
                      {classes.map((cls: any) => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </ModalSelect>
                  </ModalFormGroup>
                  {(() => {
                    const selectedClass = classes.find(c => c.id === selectedStudent.newClassId);
                    const hasSections = selectedClass?.has_sections ?? true;
                    return hasSections ? (
                      <ModalFormGroup>
                        <ModalLabel>Select New Section</ModalLabel>
                        <ModalSelect
                          value={selectedStudent.newSectionId || ''}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            setSelectedStudent({ ...selectedStudent, newSectionId: Number(e.target.value) })}
                          disabled={!selectedStudent.newClassId || !promotionSections.length}
                        >
                          <option value="">Select Section</option>
                          {promotionSections.map((sec: any) => (
                            <option key={sec.id} value={sec.id}>{sec.name}</option>
                          ))}
                        </ModalSelect>
                      </ModalFormGroup>
                    ) : null;
                  })()}
                </>
              )}
            </ModalContent>

            <ModalFooter>
              <ModalButton
                onClick={() => {
                  setShowModal(false);
                  setSelectedStudent(null);
                  setModalType(null);
                }}
                disabled={processing}
              >
                Cancel
              </ModalButton>
              <ModalButton
                variant={modalType === 'withdraw' ? 'danger' : 'primary'}
                onClick={() => {
                  if (modalType === 'deactivate' && selectedStudent.reason) {
                    handleStatusChange(selectedStudent.id, 'inactive', selectedStudent.reason, selectedStudent.deactivateDate);
                  } else if (modalType === 'suspend' && selectedStudent.reason) {
                    handleStatusChange(selectedStudent.id, 'suspended', selectedStudent.reason, selectedStudent.suspendDate);
                  } else if (modalType === 'withdraw' && selectedStudent.reason) {
                    handleStatusChange(selectedStudent.id, 'withdrawn', selectedStudent.reason, selectedStudent.withdrawDate);
                  } else if (modalType === 'promote') {
                    const selectedClass = classes.find(c => c.id === selectedStudent.newClassId);
                    const hasSections = selectedClass?.has_sections ?? true;
                    handlePromote(selectedStudent.id, selectedStudent.newClassId, hasSections ? selectedStudent.newSectionId : null);
                  }
                }}
                disabled={processing ||
                  (modalType === 'deactivate' && !selectedStudent.reason) ||
                  (modalType === 'suspend' && !selectedStudent.reason) ||
                  (modalType === 'withdraw' && !selectedStudent.reason)}
              >
                {processing ? (
                  <>
                    <CircularProgress size={16} color="inherit" />
                    Processing...
                  </>
                ) : (
                  <>
                    {modalType === 'deactivate' && 'Deactivate'}
                    {modalType === 'suspend' && 'Suspend'}
                    {modalType === 'withdraw' && 'Withdraw'}
                    {modalType === 'promote' && 'Promote'}
                  </>
                )}
              </ModalButton>
            </ModalFooter>
          </ModalBox>
        </ModalOverlay>
      )}

      {showHistoryModal && historyStudent && (
        <ModalOverlay>
          <ModalBox style={{ width: '90vw', maxWidth: 600, maxHeight: '90vh' }}>
            <ModalHeader>
              <ModalTitle>
                <StatusIcon type="history">
                  <HistoryMaterialIcon style={{ fontSize: '1.4rem' }} />
                </StatusIcon>
                Status History - {historyStudent.name}
              </ModalTitle>
            </ModalHeader>

            {historyLoading ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                color: (theme as any).TEXT_SECONDARY
              }}>
                <CircularProgress size={24} style={{ marginRight: '12px' }} />
                Loading history...
              </div>
            ) : historyRecords.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: (theme as any).TEXT_SECONDARY,
                fontSize: '1.1rem'
              }}>
                No history records found
              </div>
            ) : (
              <HistoryModalContent>
                {historyRecords.map((rec, idx) => (
                  <HistoryEntry key={rec.id || idx} type={rec.action}>
                    <HistoryTitle>
                      <StatusIcon type={rec.action}>
                        {rec.action === 'suspend' && <BlockIcon style={{ fontSize: '1rem' }} />}
                        {rec.action === 'deactivate' && <BlockIcon style={{ fontSize: '1rem' }} />}
                        {rec.action === 'withdraw' && <ExitIcon style={{ fontSize: '1rem' }} />}
                        {(rec.action === 'promote' || rec.action === 'reactivate' || rec.action === 'readmit') &&
                          <SchoolIcon style={{ fontSize: '1rem' }} />}
                      </StatusIcon>
                      {rec.action.charAt(0).toUpperCase() + rec.action.slice(1)}
                      <HistoryDate>
                        {rec.created_at ? new Date(rec.created_at).toLocaleString() : ''}
                      </HistoryDate>
                    </HistoryTitle>

                    {rec.reason && (
                      <HistoryDetail type="#fbbf24">
                        Reason: {rec.reason}
                      </HistoryDetail>
                    )}

                    {rec.action === 'promote' && (
                      <HistoryDetail type="#3b82f6">
                        <SchoolIcon style={{ fontSize: '1rem' }} />
                        Promoted to {getClassName(rec.new_class_id)}
                        {rec.new_section_id ? ` (${getSectionName(rec.new_section_id)})` : ''}
                      </HistoryDetail>
                    )}

                    {rec.action === 'demote' && (
                      <HistoryDetail type="#6366f1">
                        <SchoolIcon style={{ fontSize: '1rem' }} />
                        Demoted to {getClassName(rec.new_class_id)}
                        {rec.new_section_id ? ` (${getSectionName(rec.new_section_id)})` : ''}
                      </HistoryDetail>
                    )}

                    {rec.action === 'readmit' && (
                      <HistoryDetail type="#10b981">
                        <SchoolIcon style={{ fontSize: '1rem' }} />
                        Re-admitted to {getClassName(rec.new_class_id)}
                        {rec.new_section_id ? ` (${getSectionName(rec.new_section_id)})` : ''}
                      </HistoryDetail>
                    )}

                    {(rec.action === 'suspend' || rec.action === 'withdraw' || rec.action === 'reactivate') && rec.new_status && (
                      <HistoryDetail type={
                        rec.action === 'suspend' ? '#f59e0b' :
                          rec.action === 'withdraw' ? '#ef4444' : '#22c55e'
                      }>
                        Status changed to: {rec.new_status}
                      </HistoryDetail>
                    )}

                    {rec.performed_by && (
                      <HistoryPerformer>
                        Performed by: {
                          userIdToStaffName[rec.performed_by] ||
                          userIdToName[rec.performed_by] ||
                          `User #${rec.performed_by}`
                        }
                      </HistoryPerformer>
                    )}
                  </HistoryEntry>
                ))}
              </HistoryModalContent>
            )}

            <ModalFooter>
              <ModalButton onClick={() => setShowHistoryModal(false)}>
                Close
              </ModalButton>
            </ModalFooter>
          </ModalBox>
        </ModalOverlay>
      )}

      {showReadmitModal && readmitStudent && (
        <ModalOverlay>
          <ModalBox
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' && !processing && readmitClass && readmitSection) {
                handleReadmit();
              }
            }}
            style={{ maxWidth: 480 }}
          >
            <ModalHeader>
              <ModalTitle>
                <StatusIcon type="readmit">
                  <SchoolIcon style={{ fontSize: '1.4rem' }} />
                </StatusIcon>
                Re-admit Student
              </ModalTitle>
            </ModalHeader>

            <ModalContent>
              <ModalText>
                Re-admit <strong>{readmitStudent.name}</strong> to active status:
              </ModalText>

              <FormGroup>
                <FormLabel htmlFor="readmitClass">Select New Class</FormLabel>
                <StyledSelect
                  id="readmitClass"
                  value={readmitClass}
                  onChange={async (e: React.ChangeEvent<HTMLSelectElement>) => {
                    setReadmitClass(e.target.value);
                    setReadmitSection('');
                    await fetchSectionsForClass(Number(e.target.value));
                  }}
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </StyledSelect>
              </FormGroup>

              {(() => {
                const selectedClass = classes.find(c => String(c.id) === String(readmitClass));
                const hasSections = selectedClass?.has_sections ?? true;
                return hasSections ? (
                  <FormGroup>
                    <FormLabel htmlFor="readmitSection">Select New Section</FormLabel>
                    <StyledSelect
                      id="readmitSection"
                      value={readmitSection}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setReadmitSection(e.target.value)}
                      disabled={!readmitClass || readmitSections.length === 0}
                    >
                      <option value="">Select Section</option>
                      {readmitSections.map(sec => (
                        <option key={sec.id} value={sec.id}>{sec.name}</option>
                      ))}
                    </StyledSelect>
                    {readmitClass && readmitSections.length === 0 && (
                      <InfoBox type="error">
                        <WarningIcon style={{ fontSize: '1.1rem' }} />
                        No sections available for this class
                      </InfoBox>
                    )}
                  </FormGroup>
                ) : null;
              })()}

              <InfoBox type="success">
                <InfoIcon style={{ fontSize: '1.2rem' }} />
                Student will be marked as active upon re-admission
              </InfoBox>
            </ModalContent>

            <ModalFooter>
              <ModalButton
                onClick={() => {
                  setShowReadmitModal(false);
                  setReadmitStudent(null);
                  setReadmitClass('');
                  setReadmitSection('');
                }}
                disabled={processing}
              >
                Cancel
              </ModalButton>
              <ModalButton
                variant="primary"
                onClick={handleReadmit}
                disabled={processing || !readmitClass || (() => {
                  const selectedClass = classes.find(c => String(c.id) === String(readmitClass));
                  const hasSections = selectedClass?.has_sections ?? true;
                  return hasSections && !readmitSection;
                })()}
              >
                {processing ? (
                  <>
                    <CircularProgress size={16} color="inherit" />
                    <span style={{ marginLeft: '8px' }}>Processing...</span>
                  </>
                ) : (
                  'Re-admit Student'
                )}
              </ModalButton>
            </ModalFooter>
          </ModalBox>
        </ModalOverlay>
      )}
    </PageContainer>
  );
};

export default StudentStatusManager; 