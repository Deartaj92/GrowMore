import React, { useEffect, useState, useContext, useRef } from 'react';
import styled, { css } from 'styled-components';
import { supabase } from '../supabaseClient';
import { fetchAllRows } from '../utils/paginationHelper';
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
  RemoveCircleOutline as UnlinkIcon
} from '@mui/icons-material';
import { ThemeContext, darkTheme, lightTheme } from './Layout';
import { ThemeProvider } from 'styled-components';
import { useToast } from './useToast';
import { useAuth } from '../contexts/AuthContext';
import NoSessionsFound from './NoSessionsFound';
import Loader from './Loader';

// Styled Components (copied and adapted from ClassesManager)
const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 12px 6px 12px;
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

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
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
`;

const SessionsGrid = styled.div<{ cardCount: number }>`
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

const SessionCard = styled.div`
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
const SessionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const SessionTitle = styled.h3`
  font-size: 2.1rem;
  font-weight: 900;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  letter-spacing: 0.5px;
`;

const SessionDescription = styled.p`
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

const CardActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
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

const Modal = styled.div`
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000 !important;
  backdrop-filter: blur(4px);
  overflow-y: auto;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  position: relative;
  border: 1px solid ${({ theme }) => theme.BORDER};
  margin: auto;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 1.5rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}33;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}33;
  }
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
`;
const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
`;

const LoadingSpinner = styled.div`
  width: 50px;
  height: 50px;
  border: 3px solid #4a6cf7;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const ErrorMessage = styled.div`
  background: #fee2e2;
  color: #dc2626;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SuccessMessage = styled.div`
  background: #dcfce7;
  color: #16a34a;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

const CloseButton = styled.button`
  position: absolute;
  top: 18px;
  right: 18px;
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 10;
  &:hover {
  color: #ef4444;
  }
`;

const SessionActions = styled.div`
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
  
  ${SessionCard}:hover & {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0) scale(1);
  }
`;

const SmallIconButton = styled.button<{ color?: string }>`
  background: ${({ color }) => color || 'transparent'};
  color: white;
  border: none;
  border-radius: 8px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.18s, box-shadow 0.18s, transform 0.18s;
  font-size: 1rem;
  padding: 0;
  box-shadow: 0 1px 4px rgba(74,108,247,0.08);
  &:hover {
    background: ${({ color }) => color || '#4a6cf7'}33;
    transform: scale(1.15);
    box-shadow: 0 2px 8px ${({ color }) => color || '#4a6cf7'}33;
  }
`;

// Add a CardContent wrapper for flex layout
const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;

// Add this before the SessionsManager component
const AddSessionCard = styled(SessionCard)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px dashed #4a6cf7;
  color: #4a6cf7;
  background: ${({ theme }) => theme.BG};
  transition: border-color 0.18s, background 0.18s;
  &:hover {
    border-color: #274bb5;
    background: ${({ theme }) => theme.FIELD_BG};
  }
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

// Add SegmentedGroup and SegmentedSelect styled components
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
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }

`;

const SessionDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  flex: 1 1 auto;
`;
const SessionName = styled.h3`
  font-size: 1.25rem;
  font-weight: 800;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0 0 0.2rem 0;
`;
const SessionDate = styled.div`
  color: #facc15;
  font-size: 0.97rem;
  font-weight: 600;
  margin-bottom: 0.1rem;
  display: flex;
  align-items: center;
  gap: 0.18em;
  white-space: nowrap;
`;
const ToText = styled.span`
  color: #22c55e;
  font-weight: 700;
  margin: 0 0.2em;
`;
const SessionStrength = styled.div`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.01rem;
  font-weight: 600;
  margin-bottom: 0.1rem;
`;
const SessionStrengthGrid = styled.div<{ columns: number }>`
  margin: 4px 0 0 0;
  padding: 0;
  font-size: 0.97rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  display: grid;
  grid-template-columns: ${({ columns }) => `repeat(${columns}, 1fr)`};
  gap: 1rem;
`;
const StrengthCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.97rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  padding: 0.3rem 0.5rem;
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : theme.CARD};
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  min-height: 32px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  justify-content: space-between;
  gap: 0.5rem;
`;

const StatusPill = styled.div<{ status: 'active' | 'inactive' | 'expired' }>`
  position: absolute;
  top: 1.1rem;
  right: 1.1rem;
  z-index: 2;
  background: ${({ status }) =>
    status === 'active' ? '#22c55e' :
    status === 'inactive' ? '#ef4444' :
    '#6b7280'};
  color: #fff;
  padding: 0.13em 0.8em;
  border-radius: 999px;
  font-size: 0.87rem;
  font-weight: 700;
  box-shadow: 0 2px 8px #0002;
  letter-spacing: 0.01em;
  opacity: 0.85;
`;

const TotalRow = styled.div`
  margin-top: 1.2rem;
  font-size: 1.08rem;
  font-weight: 800;
  color: ${({ theme }) => theme.ACCENT};
  text-align: right;
  letter-spacing: 0.5px;
`;

// Add types for students, classes, and sections
interface Student {
  id: number;
  session_id: number;
  class_id: number;
  section_id: number;
}
interface Class {
  id: number;
  name: string;
}
interface Section {
  id: number;
  name: string;
  class_id: number;
  session_id: number;
}

interface Session {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

// Add date formatting helper at the top
function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).replace(/ /g, '-');
}

const SessionsManager: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const themeObj = theme === 'dark' ? darkTheme : lightTheme;
  const { showToast } = useToast();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [formData, setFormData] = useState({ name: '', start_date: '', end_date: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [setActiveLoading, setSetActiveLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [studentClassHistory, setStudentClassHistory] = useState<any[]>([]);

  // Get the current user's school_id
  const getCurrentUserSchoolId = () => {
    if (!user) return null;
    
    // For super admin, they can see all schools, but we'll filter by their primary school
    if (user.role === 'Super Admin') {
      return user.school_id || 1; // Default to school 1 for super admin
    }
    
    return user.school_id;
  };

  const currentSchoolId = getCurrentUserSchoolId();

  useEffect(() => {
    if (currentSchoolId) {
    fetchSessions();
    // Fetch students, classes, and sections for strength summary
    (async () => {
      setLoadingClasses(true);
      setLoadingSections(true);
      const [studentsData, classesData, sectionsData] = await Promise.all([
          fetchAllRows(async (from, to) => {
            return await supabase.from('students')
              .select('id, session_id, class_id, section_id')
              .eq('school_id', currentSchoolId)
              .range(from, to);
          }),
          fetchAllRows(async (from, to) => {
            return await supabase.from('classes')
              .select('id, name')
              .eq('school_id', currentSchoolId)
              .range(from, to);
          }),
          fetchAllRows(async (from, to) => {
            return await supabase.from('sections')
              .select('id, name, class_id, session_id')
              .eq('school_id', currentSchoolId)
              .range(from, to);
          }),
      ]);
      setStudents(studentsData as Student[]);
      setClasses((classesData as Class[]) || []);
      setSections((sectionsData as Section[]) || []);
      setLoadingClasses(false);
      setLoadingSections(false);
    })();
    }
  }, [currentSchoolId]);

  useEffect(() => {
    if (currentSchoolId) {
    fetchStudentClassHistory();
    }
  }, [currentSchoolId]);

  // Helper to auto-deactivate ended sessions
  const autoDeactivateEndedSessions = async (sessionsList: Session[]) => {
    const today = new Date().toISOString().slice(0, 10);
    const endedActiveSessions = sessionsList.filter(s => s.is_active && s.end_date < today);
    if (endedActiveSessions.length > 0) {
      const ids = endedActiveSessions.map(s => s.id);
      await supabase.from('sessions').update({ is_active: false }).in('id', ids);
      setSessions(sessionsList.map(s => ids.includes(s.id) ? { ...s, is_active: false } : s));
    } else {
      setSessions(sessionsList);
    }
  };

  const fetchSessions = async () => {
    if (!currentSchoolId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('school_id', currentSchoolId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      if (data) await autoDeactivateEndedSessions(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentClassHistory = async () => {
    if (!currentSchoolId) return;
    
    try {
      const { data: studentClassHistoryData } = await supabase
        .from('student_class_history')
        .select('*')
        .eq('school_id', currentSchoolId);
      setStudentClassHistory(studentClassHistoryData || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const isOverlapping = (start1: string, end1: string, start2: string, end2: string) => {
    return (
      (start1 <= end2 && end1 >= start2)
    );
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSchoolId) {
      showToast('No school context found.', 'error');
      return;
    }
    
    setAddLoading(true);
    try {
      if (!formData.name.trim() || !formData.start_date || !formData.end_date) {
        showToast('All fields are required.', 'error');
        setAddLoading(false);
        return;
      }
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        showToast('Start date cannot be after end date.', 'error');
        setAddLoading(false);
        return;
      }
      if (sessions.some(s => isOverlapping(formData.start_date, formData.end_date, s.start_date, s.end_date))) {
        showToast('Session period overlaps with an existing session.', 'error');
        setAddLoading(false);
        return;
      }
      if (sessions.some(s => s.name.trim().toLowerCase() === formData.name.trim().toLowerCase())) {
        showToast('A session with this name already exists.', 'error');
        setAddLoading(false);
        return;
      }
      // Insert the new session as active with school_id
      const { data, error } = await supabase
        .from('sessions')
        .insert([{ 
          name: formData.name, 
          start_date: formData.start_date, 
          end_date: formData.end_date, 
          is_active: true,
          school_id: currentSchoolId
        }])
        .select();
      if (error) throw error;
      // Set all other sessions in this school to inactive
      if (data && data[0] && data[0].id) {
        await supabase
          .from('sessions')
          .update({ is_active: false })
          .eq('school_id', currentSchoolId)
          .neq('id', data[0].id);
      }
      if (data) await autoDeactivateEndedSessions([...(data || []), ...sessions]);
      setShowAddModal(false);
      setFormData({ name: '', start_date: '', end_date: '' });
      showToast('Session added and set as active.', 'success');
      await fetchSessions();
    } catch (err: any) {
      setError(err.message);
      showToast('An unexpected error occurred while adding the session.', 'error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSchoolId) {
      showToast('No school context found.', 'error');
      return;
    }
    
    setEditLoading(true);
    try {
      if (!selectedSession) return;
      if (!formData.name.trim() || !formData.start_date || !formData.end_date) {
        showToast('All fields are required.', 'error');
        setEditLoading(false);
        return;
      }
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        showToast('Start date cannot be after end date.', 'error');
        setEditLoading(false);
        return;
      }
      if (sessions.some(s => s.id !== selectedSession.id && isOverlapping(formData.start_date, formData.end_date, s.start_date, s.end_date))) {
        showToast('Session period overlaps with an existing session.', 'error');
        setEditLoading(false);
        return;
      }
      if (sessions.some(s => s.name.trim().toLowerCase() === formData.name.trim().toLowerCase() && s.id !== selectedSession.id)) {
        showToast('A session with this name already exists.', 'error');
        setEditLoading(false);
        return;
      }
      const { error } = await supabase
        .from('sessions')
        .update({ name: formData.name, start_date: formData.start_date, end_date: formData.end_date })
        .eq('id', selectedSession.id)
        .eq('school_id', currentSchoolId);
      if (error) throw error;
      await fetchSessions(); // re-fetch to ensure auto-deactivation
      setShowEditModal(false);
      setSelectedSession(null);
      setFormData({ name: '', start_date: '', end_date: '' });
      showToast('Session updated successfully.', 'success');
    } catch (err: any) {
      setError(err.message);
      showToast('Error updating session: ' + err.message, 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!selectedSession || !currentSchoolId) return;
    setDeleteLoading(true);
    try {
      // Check for students in this session
      const { data: studentsInSession, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('session_id', selectedSession.id)
        .eq('school_id', currentSchoolId);
      if (studentError) throw studentError;
      if (studentsInSession && studentsInSession.length > 0) {
        showToast('Cannot delete session with registered students.', 'error');
        setDeleteLoading(false);
        setShowDeleteModal(false);
        setSelectedSession(null);
        return;
      }
      const wasActive = selectedSession.is_active;
      const deletedSessionId = selectedSession.id;
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', selectedSession.id)
        .eq('school_id', currentSchoolId);
      if (error) throw error;
      const updatedSessions = sessions.filter(s => s.id !== selectedSession.id);
      setSessions(updatedSessions);
      setShowDeleteModal(false);
      setSelectedSession(null);
      showToast('Session deleted successfully.', 'success');
      // If the deleted session was active, set the most recent previous session as active
      if (wasActive && updatedSessions.length > 0) {
        // Find the session with the latest end_date
        const prevSession = [...updatedSessions].sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())[0];
        if (prevSession) {
          await supabase
            .from('sessions')
            .update({ is_active: true })
            .eq('id', prevSession.id)
            .eq('school_id', currentSchoolId);
          setSessions(updatedSessions.map(s => ({ ...s, is_active: s.id === prevSession.id })));
        }
      }
      await fetchSessions();
    } catch (err: any) {
      setError(err.message);
      showToast('An unexpected error occurred while deleting the session.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSetActive = async (session: Session) => {
    if (!currentSchoolId) {
      showToast('No school context found.', 'error');
      return;
    }
    
    setSetActiveLoading(true);
    try {
      // Set all sessions in this school to inactive, then set this one to active
      const { error: error1 } = await supabase
        .from('sessions')
        .update({ is_active: false })
        .eq('school_id', currentSchoolId)
        .neq('id', session.id);
      const { error: error2 } = await supabase
        .from('sessions')
        .update({ is_active: true })
        .eq('id', session.id)
        .eq('school_id', currentSchoolId);
      if (error1 || error2) throw error1 || error2;
      setSessions(sessions.map(s => ({ ...s, is_active: s.id === session.id })));
      showToast('Session set as active.', 'success');
    } catch (err: any) {
      setError(err.message);
      showToast('An unexpected error occurred while setting the session as active.', 'error');
    } finally {
      setSetActiveLoading(false);
    }
  };

  if (!currentSchoolId) {
    return (
      <ThemeProvider theme={themeObj}>
        <PageContainer>
          <Header>
            <Title>Sessions Manager</Title>
          </Header>
          <ErrorMessage>
            <WarningIcon style={{ fontSize: '1rem' }} /> No school context found. Please contact your administrator.
          </ErrorMessage>
        </PageContainer>
      </ThemeProvider>
    );
  }

  if (loading) return (
      <ThemeProvider theme={themeObj}>
      <Loader />
      </ThemeProvider>
    );

  const todayStr = new Date().toISOString().slice(0, 10);
  const sortedSessions = [...sessions].sort((a, b) => a.id - b.id);

  const filteredSessions = sortedSessions.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ThemeProvider theme={themeObj}>
    <PageContainer>
        <Header>
          <HeaderRow>
            <Title theme={themeObj}>
              Sessions Manager <span style={{fontWeight:400, fontSize:'1rem', color: theme === 'dark' ? '#b0b8d1' : '#4a4a4a'}}>({sessions.length})</span>
            </Title>
            <HeaderFilters style={{ display: window.innerWidth > 700 ? 'flex' : 'none' }}>
              <SegmentedGroup>
                <SegmentedInput
                  theme={themeObj}
                  type="text"
                  placeholder="Search sessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ minWidth: 220, maxWidth: 320, width: '100%' }}
                />
                <SegmentedButton
                  theme={themeObj}
                  onClick={() => setShowAddModal(true)}
                  title="Add Session"
                  style={{
                    minWidth: 110,
                    maxWidth: 130,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    background: theme === 'dark' ? '#444' : '#f3f4f6',
                    border: `1.5px solid ${theme === 'dark' ? '#555' : '#e5e7eb'}`,
                    color: theme === 'dark' ? '#C0C0C0' : '#444',
                    fontWeight: 700
                  }}
                >
                  <AddIcon style={{ fontSize: 15 }} />
                  <span style={{ fontWeight: 700, display: 'inline-block' }}>Add Session</span>
                </SegmentedButton>
              </SegmentedGroup>
            </HeaderFilters>
            {/* Mobile Add Button */}
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: window.innerWidth <= 700 ? 'flex' : 'none',
                background: theme === 'dark' ? '#23242a' : '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                boxShadow: '0 1px 4px #0002',
                alignItems: 'center',
                gap: '6px',
                color: theme === 'dark' ? '#C0C0C0' : '#444',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              <AddIcon style={{ fontSize: 18 }} />
              Add Session
            </button>
          </HeaderRow>
          {/* Mobile Search Bar */}
          <div style={{ display: window.innerWidth <= 700 ? 'flex' : 'none', marginTop: '8px', width: '100%' }}>
            <SearchBar style={{ width: '100%', maxWidth: 'none', flex: 1 }}>
              <SearchIcon style={{ color: theme === 'dark' ? '#b0b8d1' : '#666666' }} />
              <SearchInput
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: '1rem' }}
              />
            </SearchBar>
        </div>
        </Header>

        {error && (
          <ErrorMessage>
            <WarningIcon /> {error}
          </ErrorMessage>
        )}

        <MainContent>
          <SessionsGrid cardCount={filteredSessions.length + 1}>
          {filteredSessions.map(session => {
            // Filter student_class_history for this session
            const schRows = studentClassHistory.filter(sch => sch.session_id === session.id);
            // Build a map: { 'class_id-section_id': count }
            const pairCountMap = new Map<string, number>();
            schRows.forEach(sch => {
              const classId = sch.new_class_id || sch.adm_class_id;
              const sectionId = sch.new_section_id !== null ? sch.new_section_id : (sch.adm_section_id !== null ? sch.adm_section_id : null);
              const key = `${classId}-${sectionId}`;
              pairCountMap.set(key, (pairCountMap.get(key) || 0) + 1);
            });
            // Build a list of { class_id, section_id, count }
            const pairList = Array.from(pairCountMap.entries()).map(([key, count]) => {
              const [class_id, section_id] = key.split('-').map(Number);
              return { class_id, section_id, count };
            });
            // Sort by class name, then section name
            pairList.sort((a, b) => {
              const classA = classes.find(c => c.id === a.class_id)?.name || '';
              const classB = classes.find(c => c.id === b.class_id)?.name || '';
              const aNum = parseInt(classA.replace(/[^0-9]/g, ''));
              const bNum = parseInt(classB.replace(/[^0-9]/g, ''));
              if (!isNaN(aNum) && !isNaN(bNum) && aNum !== bNum) return aNum - bNum;
              if (classA !== classB) return classA.localeCompare(classB);
              const sectionA = sections.find(s => s.id === a.section_id)?.name || '';
              const sectionB = sections.find(s => s.id === b.section_id)?.name || '';
              return sectionA.localeCompare(sectionB);
            });

            // Compute status
            let status: 'active' | 'inactive' | 'expired' = 'inactive';
            if (session.end_date < todayStr) status = 'expired';
            else if (session.is_active) status = 'active';

            return (
              <SessionCard key={session.id} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <SessionActions>
                  {!session.is_active && (
                    <SmallIconButton color="#4a6cf7" title="Set Active" onClick={() => handleSetActive(session)}>
                      <CheckIcon style={{ fontSize: '1rem' }} />
                    </SmallIconButton>
                  )}
                  <SmallIconButton color="#4a6cf7" title="Edit Session" onClick={() => {
                    setSelectedSession(session);
                    setFormData({ name: session.name, start_date: session.start_date, end_date: session.end_date });
                    setShowEditModal(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}>
                    <EditIcon style={{ fontSize: '1rem' }} />
                  </SmallIconButton>
                  {schRows.length === 0 && (
                  <SmallIconButton color="#ef4444" title="Delete Session" onClick={() => {
                    setSelectedSession(session);
                    setShowDeleteModal(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}>
                    <DeleteIcon style={{ fontSize: '1rem' }} />
                  </SmallIconButton>
                  )}
                </SessionActions>
                <CardContent>
                  <SessionHeader>
                    <div>
                      <SessionTitle>{session.name}</SessionTitle>
                      <SessionDescription>Session ID: {session.id}</SessionDescription>
                    </div>
                  </SessionHeader>
                  <StatsGrid>
                    <StatItem>
                      <StatValue>{schRows.length}</StatValue>
                      <StatLabelBig>STUDENTS</StatLabelBig>
                    </StatItem>
                    <StatItem>
                      <StatValue>{pairList.length}</StatValue>
                      <StatLabelBig>CLASS-SECTIONS</StatLabelBig>
                    </StatItem>
                  </StatsGrid>
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ color: '#facc15', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      {formatDate(session.start_date)} to {formatDate(session.end_date)}
                    </div>
                    <div style={{ 
                      background: status === 'active' ? '#22c55e' : status === 'expired' ? '#ef4444' : '#6b7280',
                      color: 'white',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '999px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      display: 'inline-block'
                    }}>
                      {status === 'expired' ? 'Expired' : status === 'active' ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </CardContent>
              </SessionCard>
            );
          })}
          <AddSessionCard theme={themeObj} onClick={() => {
            setShowAddModal(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}>
            <AddIcon style={{ fontSize: '3rem', marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add Session</div>
          </AddSessionCard>
        </SessionsGrid>

        </MainContent>

        <PaginationContainer>
          <PaginationInfo style={{ marginLeft: 'auto', textAlign: 'right' }}>
            Total Sessions: {sessions.length}
          </PaginationInfo>
        </PaginationContainer>
        {/* Add Session Modal */}
        {showAddModal && (
          <Modal onClick={() => setShowAddModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalTitle>Add New Session</ModalTitle>
              <form onSubmit={handleAddSession}>
                <FormGroup>
                  <Label>Session Name</Label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., 2023-2024"
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </FormGroup>
                <ModalActions>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={addLoading}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={addLoading}>
                    {addLoading ? 'Adding...' : 'Add Session'}
                  </Button>
                </ModalActions>
              </form>
            </ModalContent>
          </Modal>
        )}
        {/* Edit Session Modal */}
        {showEditModal && (
          <Modal onClick={() => setShowEditModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalTitle>Edit Session</ModalTitle>
              <form onSubmit={handleEditSession}>
                <FormGroup>
                  <Label>Session Name</Label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </FormGroup>
                <ModalActions>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    disabled={editLoading}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={editLoading}>
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </ModalActions>
              </form>
            </ModalContent>
          </Modal>
        )}
        {/* Delete Session Modal */}
        {showDeleteModal && (
          <Modal onClick={() => setShowDeleteModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalTitle>Delete Session</ModalTitle>
              <p>Are you sure you want to delete {selectedSession?.name}? This action cannot be undone.<br/><b>Note:</b> You cannot delete a session if it has any students.</p>
              <ModalActions>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  type="button"
                  onClick={handleDeleteSession}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </Button>
              </ModalActions>
            </ModalContent>
          </Modal>
        )}
        {loadingClasses ? <div style={{ textAlign: 'center', padding: '2rem' }}>Loading classes...</div> : null}
        {loadingSections ? <div style={{ textAlign: 'center', padding: '2rem' }}>Loading sections...</div> : null}
      </PageContainer>
    </ThemeProvider>
  );
};

export default SessionsManager; 