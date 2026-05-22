import React, { useState, useEffect, useRef, useContext } from 'react';
import styled, { css } from 'styled-components';
import { sortClasses } from '../utils/classUtils';
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
  RemoveCircleOutline as UnlinkIcon
} from '@mui/icons-material';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { ThemeProvider } from 'styled-components';
import { useToast } from '../components/useToast';
import { useAuth } from '../contexts/AuthContext';
import Loader from '../components/Loader';

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
          background: ${theme.name === 'dark' ? '#252525' : '#f7faff'};
          color: #4a6cf7;
          border: 1px solid ${theme.name === 'dark' ? '#3a3f4b' : '#b6c2d9'};
          &:hover {
            background: ${theme.name === 'dark' ? 'rgba(74, 108, 247, 0.18)' : 'rgba(74, 108, 247, 0.15)'};
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

const SubjectsGrid = styled.div<{ cardCount: number }>`
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

const SubjectCard = styled.div`
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

const SubjectHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const SubjectTitle = styled.h3`
  font-size: 2.1rem;
  font-weight: 900;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  letter-spacing: 0.5px;
`;

const SubjectDescription = styled.p`
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

const ClassSubjects = styled.div`
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const AssignButton = styled.button`
  width: 100%;
  margin-top: 16px;
  background: rgba(74, 108, 247, 0.3);
  color: #4a6cf7;
  font-weight: 700;
  border: none;
  border-radius: 10px;
  padding: 0.75rem 0;
  font-size: 1.08rem;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, box-shadow 0.18s;
  box-shadow: 0 2px 8px 0 #4a6cf733;
  &:hover {
    background: rgba(74, 108, 247, 0.5);
    color: #fff;
    box-shadow: 0 4px 16px 0 #4a6cf755;
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

const Modal = styled.div`
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000 !important;
  backdrop-filter: blur(6px);
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

const SubjectActions = styled.div`
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
  
  ${SubjectCard}:hover & {
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



const SubjectsLoadingContainer = styled.div`
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

const SubjectsLoadingCard = styled.div`
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

const SubjectsLoadingSpinner = styled.div`
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

const SubjectsLoadingText = styled.div`
  color: ${({ theme }) => theme.ACCENT};
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  margin-bottom: 6px;
`;

const SubjectsLoadingSubText = styled.div`
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

// Assignment Modal specific components
const AssignModalContent = styled.div`
  width: 800px;
  max-width: 90vw;
  max-height: 90vh;
  background: ${props => props.theme.CARD_BG || props.theme.BG || '#ffffff'};
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  position: relative;
  border: 2px solid ${props => props.theme.BORDER};
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  opacity: 1;
`;

const AssignModalHeader = styled.div`
  padding: 1.5rem 2rem 1rem 2rem;
  border-bottom: 1px solid ${props => props.theme.BORDER};
  background: ${props => props.theme.BG_SECONDARY || props.theme.BG || '#f8f9fa'};
  border-radius: 16px 16px 0 0;
  opacity: 1;
  
  @media (max-width: 768px) {
    padding: 1rem 1.5rem 0.75rem 1.5rem;
  }
`;

const HeaderClassSelection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  label {
    font-size: 0.85rem;
    font-weight: 600;
    color: ${props => props.theme.TEXT_SECONDARY};
    white-space: nowrap;
  }
  
  select {
    min-width: 100px;
    padding: 0.4rem 0.6rem;
    border: 1px solid ${props => props.theme.FIELD_BORDER};
    border-radius: 6px;
    background: ${props => props.theme.FIELD_BG};
    color: ${props => props.theme.TEXT_PRIMARY};
    font-size: 0.85rem;
    outline: none;
    cursor: pointer;
    
    &:focus {
      border-color: ${props => props.theme.ACCENT};
      box-shadow: 0 0 0 2px ${props => props.theme.ACCENT}20;
    }
  }
`;

const AssignModalMain = styled.div`
  flex: 1;
  padding: 1.5rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const AssignModalFooter = styled.div`
  padding: 0.75rem 1.5rem;
  border-top: 1px solid ${props => props.theme.BORDER};
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  background: ${props => props.theme.BG_SECONDARY || props.theme.BG || '#f8f9fa'};
  border-radius: 0 0 16px 16px;
  opacity: 1;
  min-height: 50px;
`;

const SubjectsContainer = styled.div`
  display: flex;
  gap: 1rem;
  flex: 1;
  overflow: hidden;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
  }
`;

const SubjectsColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const ColumnHeader = styled.div`
  padding: 0.75rem;
  background: ${props => props.theme.ACCENT};
  color: white;
  font-weight: 600;
  text-align: center;
  border-radius: 8px 8px 0 0;
  font-size: 0.9rem;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const SubjectsList = styled.div<{ itemCount: number }>`
  border: 1px solid ${props => props.theme.BORDER};
  border-top: none;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
  height: ${props => Math.min(props.itemCount * 48 + 16, 300)}px;
  overflow-y: auto;
  
  @media (max-width: 768px) {
    height: auto;
    max-height: none;
    overflow-y: visible;
    border: 1px solid ${props => props.theme.BORDER};
    border-top: none;
  }
`;

const SubjectItem = styled.div<{ selected?: boolean }>`
  padding: 0.75rem;
  border-bottom: 1px solid ${props => props.theme.BORDER};
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.selected ? props.theme.ACCENT + '20' : 'transparent'};
  color: ${props => props.theme.TEXT_PRIMARY};
  
  &:hover {
    background: ${props => props.selected ? props.theme.ACCENT + '30' : props.theme.FIELD_BG};
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SubjectItemContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
`;

const SubjectItemHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SubjectItemName = styled.span`
  font-weight: 500;
`;

const SubjectItemCode = styled.span`
  color: ${props => props.theme.TEXT_SECONDARY};
  font-size: 0.85rem;
  margin-left: auto;
`;

const MarksInput = styled.input`
  width: 80px;
  padding: 0.25rem 0.5rem;
  border: 1px solid ${props => props.theme.FIELD_BORDER};
  border-radius: 4px;
  background: ${props => props.theme.FIELD_BG};
  color: ${props => props.theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  text-align: center;
  
  /* Remove number input arrows */
  -moz-appearance: textfield;
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.ACCENT};
    box-shadow: 0 0 0 2px ${props => props.theme.ACCENT}20;
  }
`;

const MarksLabel = styled.label`
  font-size: 0.8rem;
  color: ${props => props.theme.TEXT_SECONDARY};
  font-weight: 500;
`;

interface Subject {
  id: string;
  name: string;
  code: string;
  short_name: string;
  description: string;
  created_at: string;
}

interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  is_optional: boolean;
  total_marks: number;
  classes: {
    name: string;
  };
}

interface Class {
  id: string;
  name: string;
  description?: string;
}

const SubjectManager = () => {
  const { theme } = useContext(ThemeContext);
  const themeObj = theme === 'dark' ? darkTheme : lightTheme;
  const { showToast } = useToast();
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [newSubject, setNewSubject] = useState({
    name: '',
    code: '',
    short_name: '',
    description: '',
  });
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningClass, setAssigningClass] = useState<Class | null>(null);
  const [assignSelectedSubjects, setAssignSelectedSubjects] = useState<string[]>([]);
  const [subjectMarks, setSubjectMarks] = useState<Record<string, number>>({});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [subjectDependencies, setSubjectDependencies] = useState<Record<string, { hasExams: boolean; hasTeachers: boolean; examCount: number; teacherCount: number }>>({});
  const [loadingDependencies, setLoadingDependencies] = useState(false);

  const fetchSubjects = async () => {
    if (!user?.school_id) return;
    try {
      setLoading(true);
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('school_id', user.school_id)
      .order('name');
    
    if (error) {
        setError('Failed to fetch subjects');
      return;
    }
    
    setSubjects(data || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch subjects');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    if (!user?.school_id) return;
    try {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, description')
      .eq('school_id', user.school_id)
      .order('name');
    
    if (error) {
      return;
    }
    
    setClasses(data || []);
    } catch (err) {
    }
  };

  const fetchClassSubjects = async () => {
    if (!user?.school_id) return;
    try {
    const { data, error } = await supabase
      .from('class_subjects')
      .select(`
        *,
        classes (
          name
        )
      `)
      .eq('school_id', user.school_id);
    
    if (error) {
      return;
    }
    
    setClassSubjects(data || []);
    } catch (err) {
    }
  };

  useEffect(() => {
    if (user?.school_id) {
      fetchSubjects();
      fetchClasses();
      fetchClassSubjects();
    }
  }, [user?.school_id]);

  useEffect(() => {
    if (openDialog) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [openDialog]);

  // Keyboard handler for dialog
  useEffect(() => {
    if (!openDialog) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseDialog();
      } else if (e.key === 'Enter') {
        // Only trigger if not a textarea and not in a form submission
        if (document.activeElement && 
            (document.activeElement as HTMLElement).tagName !== 'TEXTAREA' &&
            (document.activeElement as HTMLElement).tagName !== 'BUTTON') {
          handleSaveSubject();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openDialog, newSubject, editingSubject]);

  // Keyboard handler for assign modal
  useEffect(() => {
    if (!assignModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAssignModal();
      } else if (e.key === 'Enter') {
        handleAssignModalSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [assignModalOpen, assignSelectedSubjects, assigningClass]);

  // Check if user has school_id - moved after all hooks
  if (!user?.school_id) {
    return (
      <ThemeProvider theme={themeObj}>
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

  if (loading) return <Loader />;

  const handleOpenDialog = (subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      setNewSubject({
        name: subject.name,
        code: subject.code,
        short_name: subject.short_name,
        description: subject.description,
      });
    } else {
      setEditingSubject(null);
      let nextCode = '01';
      if (subjects.length > 0) {
        // Only consider subjects from the same school for code generation
        const codes = subjects
          .map(s => parseInt(s.code, 10))
          .filter(n => !isNaN(n) && n > 0); // Filter out invalid codes
        
        if (codes.length > 0) {
          // Find the next available code, handling gaps in sequence
          const sortedCodes = codes.sort((a, b) => a - b);
          let nextNumber = 1;
          
          for (const code of sortedCodes) {
            if (code === nextNumber) {
              nextNumber++;
            } else {
              break; // Found a gap, use this number
            }
          }
          
          nextCode = String(nextNumber).padStart(2, '0');
        }
      }
      setNewSubject({
        name: '',
        code: nextCode,
        short_name: '',
        description: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSubject(null);
    setNewSubject({
      name: '',
      code: '',
      short_name: '',
      description: '',
    });
  };

  const handleSaveSubject = async () => {
    if (!newSubject.name || !newSubject.short_name || !user?.school_id || isSaving) return;
    
    setIsSaving(true);
    
    try {
    // Allow duplicate names - removed duplicate name check
    
    // Check for duplicate code (ignore self if editing)
    const duplicateCode = subjects.some(s => s.code === newSubject.code && (!editingSubject || s.id !== editingSubject.id));
    if (duplicateCode) {
      showToast('A subject with this code already exists.', 'error');
      return;
    }
    
    // Check for duplicate short name (case-insensitive, ignore self if editing)
    const shortNameLower = newSubject.short_name.trim().toLowerCase();
    const duplicateShortName = subjects.some(s => s.short_name.trim().toLowerCase() === shortNameLower && (!editingSubject || s.id !== editingSubject.id));
    if (duplicateShortName) {
      showToast('A subject with this short name already exists.', 'error');
      return;
    }
    
    let error = null;
    if (editingSubject) {
      ({ error } = await supabase
        .from('subjects')
        .update(newSubject)
        .eq('id', editingSubject.id)
        .eq('school_id', user.school_id));
    } else {
      ({ error } = await supabase
        .from('subjects')
        .insert([{ ...newSubject, school_id: user.school_id }]));
    }
      
    if (error) {
      showToast('Error saving subject.', 'error');
      return;
    }
      
      // Success - show appropriate message
      if (editingSubject) {
        showToast('Subject updated successfully.', 'success');
      } else {
        showToast('Subject added successfully.', 'success');
      }
      
    handleCloseDialog();
    fetchSubjects();
    } catch (err) {
      showToast('Error saving subject.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!user?.school_id) return;
    
    // Check if subject is linked to any classes
    const linkedClasses = classSubjects.filter(cs => cs.subject_id === id);
    if (linkedClasses.length > 0) {
      const classNames = linkedClasses.map(cs => cs.classes.name).join(', ');
      showToast(`Cannot delete subject. It is currently assigned to classes: ${classNames}. Please remove the subject from these classes first.`, 'error');
      return;
    }
    
    // Delete the subject (no class assignments to worry about)
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id)
      .eq('school_id', user.school_id);
    if (error) {
      showToast('Error deleting subject.', 'error');
      return;
    }
    showToast('Subject deleted.', 'success');
    fetchSubjects();
    fetchClassSubjects();
  };

  const handleAssignSubjects = async () => {
    if (!selectedClass) return;

    // First, remove all existing assignments for this class
    const { error: deleteError } = await supabase
      .from('class_subjects')
      .delete()
      .eq('class_id', selectedClass);

    if (deleteError) {
      return;
    }

    // Then, create new assignments
    const assignments = selectedSubjects.map(subjectId => ({
      class_id: selectedClass,
      subject_id: subjectId,
    }));

    const { error: insertError } = await supabase
      .from('class_subjects')
      .insert(assignments);

    if (insertError) {
      return;
    }

    setSelectedClass('');
    setSelectedSubjects([]);
    fetchClassSubjects();
  };

  const getClassSubjects = (subjectId: string) => {
    return classSubjects
      .filter(cs => cs.subject_id === subjectId)
      .map(cs => {
        // Handle case where classes might be an array or single object
        const classesData = Array.isArray(cs.classes) ? cs.classes[0] : cs.classes;
        return classesData?.name || 'Unknown Class';
      });
  };

  const sortedClasses = sortClasses(classes);

  const openAssignModal = (cls?: Class) => {
    setAssigningClass(cls || null);
    if (cls) {
      // Preselect already assigned subjects if class is provided
    const assigned = classSubjects.filter(cs => cs.class_id === cls.id).map(cs => cs.subject_id);
    setAssignSelectedSubjects(assigned);
      
      // Load existing marks
      const marks: Record<string, number> = {};
      classSubjects
        .filter(cs => cs.class_id === cls.id)
        .forEach(cs => {
          marks[cs.subject_id] = cs.total_marks || 100; // Default to 100 if no marks set
        });
      setSubjectMarks(marks);
      
      // Load dependencies for assigned subjects
      loadSubjectDependencies(cls.id, assigned);
    } else {
      setAssignSelectedSubjects([]);
      setSubjectMarks({});
      setSubjectDependencies({});
    }
    setAssignModalOpen(true);
  };

  const loadSubjectDependencies = async (classId: string, subjectIds: string[]) => {
    if (!user?.school_id) return;
    
    setLoadingDependencies(true);
    setSubjectDependencies({}); // Clear previous dependencies
    
    try {
      const dependencies: Record<string, { hasExams: boolean; hasTeachers: boolean; examCount: number; teacherCount: number }> = {};
      
      for (const subjectId of subjectIds) {
        const deps = await checkSubjectClassDependencies(subjectId, classId);
        dependencies[subjectId] = deps;
      }
      
      setSubjectDependencies(dependencies);
    } catch (error) {
    } finally {
      setLoadingDependencies(false);
    }
  };

  const closeAssignModal = () => {
    setAssignModalOpen(false);
    setAssigningClass(null);
    setAssignSelectedSubjects([]);
    setSubjectMarks({});
    setSubjectDependencies({});
    setLoadingDependencies(false);
  };

  const handleAssignModalSave = async () => {
    if (!assigningClass || !user?.school_id) return;
    
    try {
      // Get current assignments for this class
      const currentAssignments = classSubjects.filter(cs => 
        String(cs.class_id) === String(assigningClass.id)
      );
      
      // Find subjects to add (new assignments)
      const subjectsToAdd = assignSelectedSubjects.filter(subjectId => 
        !currentAssignments.some(ca => String(ca.subject_id) === String(subjectId))
      );
      
      // Find subjects to remove (unassigned)
      const subjectsToRemove = currentAssignments.filter(ca => 
        !assignSelectedSubjects.some(selectedId => String(selectedId) === String(ca.subject_id))
      );
      
      // Find subjects to update (existing assignments with changed marks)
      const subjectsToUpdate = currentAssignments.filter(ca => {
        const subjectId = String(ca.subject_id);
        return assignSelectedSubjects.some(selectedId => String(selectedId) === String(ca.subject_id)) && 
               ca.total_marks !== (subjectMarks[subjectId] || 100);
      });
      
      // Check dependencies before removing subjects
      if (subjectsToRemove.length > 0) {
        const warnings = [];
        
        for (const subjectToRemove of subjectsToRemove) {
          const dependencies = await checkSubjectClassDependencies(
            String(subjectToRemove.subject_id), 
            String(assigningClass.id)
          );
          
          if (dependencies.hasExams || dependencies.hasTeachers) {
            const subjectName = subjects.find(s => s.id === subjectToRemove.subject_id)?.name || 'Unknown Subject';
            const className = assigningClass.name;
            
            let warningMsg = `Warning: "${subjectName}" in class "${className}" has `;
            const parts = [];
            
            if (dependencies.hasExams) {
              parts.push(`${dependencies.examCount} examination record${dependencies.examCount > 1 ? 's' : ''}`);
            }
            if (dependencies.hasTeachers) {
              parts.push(`${dependencies.teacherCount} teacher assignment${dependencies.teacherCount > 1 ? 's' : ''}`);
            }
            
            warningMsg += parts.join(' and ') + '. Removing this subject may affect existing data.';
            warnings.push(warningMsg);
          }
        }
        
        // Show warnings if any
        if (warnings.length > 0) {
          const confirmMessage = warnings.join('\n\n') + '\n\nDo you want to continue?';
          if (!window.confirm(confirmMessage)) {
            return; // User cancelled
          }
        }
        
        // Proceed with removal
    const { error: delError } = await supabase
      .from('class_subjects')
      .delete()
          .in('id', subjectsToRemove.map(s => s.id));
    if (delError) {
          showToast('Error removing unassigned subjects.', 'error');
      return;
    }
      }
      
      // Update existing assignments with new marks
      for (const subject of subjectsToUpdate) {
        const subjectId = String(subject.subject_id);
        const { error: updateError } = await supabase
          .from('class_subjects')
          .update({ total_marks: subjectMarks[subjectId] || 100 })
          .eq('id', subject.id);
        if (updateError) {
          showToast('Error updating subject marks.', 'error');
          return;
        }
      }
      
    // Add new assignments
      if (subjectsToAdd.length > 0) {
        const assignments = subjectsToAdd.map(subjectId => ({
        class_id: assigningClass.id,
        subject_id: subjectId,
          school_id: user.school_id,
          total_marks: subjectMarks[subjectId] || 100
      }));
      const { error: insError } = await supabase.from('class_subjects').insert(assignments);
      if (insError) {
          showToast('Error assigning new subjects.', 'error');
        return;
      }
    }
      
      showToast('Subjects updated successfully.', 'success');
    fetchClassSubjects();
    closeAssignModal();
    } catch (error) {
      showToast('Error updating assignments.', 'error');
    }
  };

  // Sort subjects by code (ascending, as number)
  const sortedSubjects = [...subjects].sort((a, b) => parseInt(a.code, 10) - parseInt(b.code, 10));

  // Open delete modal
  const openDeleteModal = (subject: Subject) => {
    setSubjectToDelete(subject);
    setDeleteModalOpen(true);
  };
  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setSubjectToDelete(null);
  };
  const confirmDelete = async () => {
    if (subjectToDelete) {
      await handleDeleteSubject(subjectToDelete.id);
    }
    closeDeleteModal();
  };

  // Check if subject can be deleted (not linked to any classes)
  const canDeleteSubject = (subject: Subject) => {
    return !classSubjects.some(cs => cs.subject_id === subject.id);
  };

  // Check if subject-class combination has examination records or teacher assignments
  const checkSubjectClassDependencies = async (subjectId: string, classId: string) => {
    if (!user?.school_id) return { hasExams: false, hasTeachers: false, examCount: 0, teacherCount: 0 };

    try {
      // Check for examination records
      const { data: examResults, error: examError } = await supabase
        .from('exam_results')
        .select('id')
        .eq('subject_id', subjectId)
        .eq('class_id', classId)
        .eq('school_id', user.school_id);

      if (examError) {
      }

      // Check for teacher assignments
      const { data: teacherAssignments, error: teacherError } = await supabase
        .from('teacher_class_subjects')
        .select(`
          id,
          class_subjects!inner(
            id,
            subject_id,
            class_id
          )
        `)
        .eq('class_subjects.subject_id', subjectId)
        .eq('class_subjects.class_id', classId)
        .eq('school_id', user.school_id);

      if (teacherError) {
      }

      return {
        hasExams: (examResults?.length || 0) > 0,
        hasTeachers: (teacherAssignments?.length || 0) > 0,
        examCount: examResults?.length || 0,
        teacherCount: teacherAssignments?.length || 0
      };
    } catch (error) {
      return { hasExams: false, hasTeachers: false, examCount: 0, teacherCount: 0 };
    }
  };

  const filteredSubjects = sortedSubjects.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.short_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ThemeProvider theme={themeObj}>
    <PageContainer>
        <Header>
          <HeaderRow>
            <Title theme={themeObj}>
              Subject Management <span style={{fontWeight:400, fontSize:'1rem', color: theme === 'dark' ? '#b0b8d1' : '#4a4a4a'}}>({subjects.length})</span>
            </Title>
            <HeaderFilters style={{ display: window.innerWidth > 700 ? 'flex' : 'none' }}>
              <SegmentedGroup>
                <SegmentedInput
                  theme={themeObj}
                  type="text"
                  placeholder="Search subjects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ minWidth: 220, maxWidth: 320, width: '100%' }}
                />
                <SegmentedButton
                  theme={themeObj}
                  onClick={() => handleOpenDialog()}
                  title="Add Subject"
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
                  <span style={{ fontWeight: 700, display: 'inline-block' }}>Add Subject</span>
                </SegmentedButton>
                                  <SegmentedButton
                    theme={themeObj}
                    onClick={() => {
                      if (classes.length > 0) {
                        openAssignModal();
                      } else {
                        showToast('No classes available for assignment.', 'error');
                      }
                    }}
                    title="Manage Assignments"
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
                    <SchoolIcon style={{ fontSize: 15 }} />
                    <span style={{ fontWeight: 700, display: 'inline-block' }}>Assignments</span>
                  </SegmentedButton>
              </SegmentedGroup>
            </HeaderFilters>
            {/* Mobile Icon Buttons */}
            <div style={{ 
              display: window.innerWidth <= 700 ? 'flex' : 'none',
              gap: '8px',
              alignItems: 'center'
            }}>
              <button
                onClick={() => handleOpenDialog()}
                style={{
                  background: theme === 'dark' ? '#23242a' : '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px #0002',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme === 'dark' ? '#C0C0C0' : '#444',
                  fontSize: '1.1rem',
                  width: '36px',
                  height: '36px'
                }}
                title="Add Subject"
              >
                <AddIcon style={{ fontSize: 20 }} />
              </button>
              <button
                onClick={() => {
                  if (classes.length > 0) {
                    openAssignModal();
                  } else {
                    showToast('No classes available for assignment.', 'error');
                  }
                }}
                style={{
                  background: theme === 'dark' ? '#23242a' : '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px #0002',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme === 'dark' ? '#C0C0C0' : '#444',
                  fontSize: '1.1rem',
                  width: '36px',
                  height: '36px'
                }}
                title="Manage Assignments"
              >
                <SchoolIcon style={{ fontSize: 20 }} />
              </button>
            </div>
          </HeaderRow>
          {/* Mobile Search Bar */}
          <div style={{ display: window.innerWidth <= 700 ? 'flex' : 'none', marginTop: '8px', width: '100%' }}>
            <SearchBar style={{ width: '100%', maxWidth: 'none', flex: 1 }}>
              <SearchIcon style={{ color: theme === 'dark' ? '#b0b8d1' : '#666666' }} />
              <SearchInput
                placeholder="Search subjects..."
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
          <SubjectsGrid cardCount={filteredSubjects.length + 1}>
          {filteredSubjects.map(subject => {
            const assignedClasses = getClassSubjects(subject.id);
            const assignedCount = assignedClasses.length;
            
            return (
              <SubjectCard key={subject.id} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <SubjectActions>
                  <SmallIconButton color="#22c55e" title="Assign to Classes" onClick={() => {
                    openAssignModal();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}>
                    <SchoolIcon style={{ fontSize: '1rem' }} />
                  </SmallIconButton>
                  <SmallIconButton color="#4a6cf7" title="Edit Subject" onClick={() => {
                    handleOpenDialog(subject);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}>
                    <EditIcon style={{ fontSize: '1rem' }} />
                  </SmallIconButton>
                  <SmallIconButton 
                    color={canDeleteSubject(subject) ? "#ef4444" : "#888"} 
                    title={canDeleteSubject(subject) ? "Delete Subject" : "Cannot delete - subject is assigned to classes"} 
                    onClick={() => {
                      if (canDeleteSubject(subject)) {
                    openDeleteModal(subject);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else {
                        const linkedClasses = classSubjects.filter(cs => cs.subject_id === subject.id);
                        const classNames = linkedClasses.map(cs => cs.classes.name).join(', ');
                        showToast(`Cannot delete subject. It is assigned to classes: ${classNames}. Please remove the subject from these classes first.`, 'error');
                      }
                    }}
                    style={{ 
                      opacity: canDeleteSubject(subject) ? 1 : 0.5,
                      cursor: canDeleteSubject(subject) ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <DeleteIcon style={{ fontSize: '1rem' }} />
                  </SmallIconButton>
                </SubjectActions>
                <CardContent>
                  <SubjectHeader>
                    <div>
                      <SubjectTitle>{subject.name}</SubjectTitle>
                      <SubjectDescription>Code: {subject.code} | Short: {subject.short_name}</SubjectDescription>
                      <div style={{ 
                        color: themeObj.TEXT_SECONDARY, 
                        fontSize: '0.9rem', 
                        marginTop: '0.5rem',
                        lineHeight: '1.4'
                      }}>
                        {subject.description || 'No description'}
                      </div>
                    </div>
                  </SubjectHeader>
                  {assignedClasses.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ color: themeObj.TEXT_SECONDARY, fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Assigned to:</div>
                      <ClassSubjects>
                        {assignedClasses.sort((a, b) => {
                      const numA = parseInt(a);
                      const numB = parseInt(b);
                      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                      if (!isNaN(numA)) return -1;
                      if (!isNaN(numB)) return 1;
                      return a.localeCompare(b);
                    }).map((className) => (
                          <div
                        key={className}
                            style={{
                              background: themeObj.ACCENT,
                              color: 'white',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '999px',
                              fontSize: '0.85rem',
                              fontWeight: 600
                            }}
                          >
                            {className}
                          </div>
                    ))}
                  </ClassSubjects>
        </div>
                  )}
                </CardContent>
              </SubjectCard>
            );
          })}

        </SubjectsGrid>

        </MainContent>

                <PaginationContainer>
          {/* Mobile Assignments Button */}
          <button
            onClick={() => {
              if (classes.length > 0) {
                openAssignModal();
              } else {
                showToast('No classes available for assignment.', 'error');
              }
            }}
            style={{
              display: window.innerWidth <= 700 ? 'flex' : 'none',
              background: theme === 'dark' ? '#23242a' : '#f3f4f6',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              alignItems: 'center',
              gap: '8px',
              color: theme === 'dark' ? '#C0C0C0' : '#444',
              fontSize: '0.9rem',
              fontWeight: 600,
              marginRight: 'auto'
            }}
          >
            <SchoolIcon style={{ fontSize: 16 }} />
            <span>Assignments</span>
          </button>
          <PaginationInfo style={{ marginLeft: 'auto', textAlign: 'right' }}>
            Total Subjects: {subjects.length}
          </PaginationInfo>
        </PaginationContainer>
      </PageContainer>
      {openDialog && (
        <Modal onClick={handleCloseDialog}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <CloseButton onClick={handleCloseDialog}>
              <CloseIcon />
            </CloseButton>
          <ModalTitle>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</ModalTitle>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveSubject(); }}>
              <FormGroup>
                <Label>Subject Name</Label>
                <Input
                  type="text"
              value={newSubject.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSubject({ ...newSubject, name: e.target.value })}
                  placeholder="Enter subject name"
                  required
                  autoFocus
                />
              </FormGroup>
              <FormGroup>
                <Label>Subject Code</Label>
                <Input
                  type="text"
              value={newSubject.code}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSubject({ ...newSubject, code: e.target.value })}
                  placeholder="Enter subject code"
                  required
                  readOnly={!editingSubject}
                />
              </FormGroup>
              <FormGroup>
                <Label>Short Name</Label>
                <Input
                  type="text"
              value={newSubject.short_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSubject({ ...newSubject, short_name: e.target.value })}
                  placeholder="Enter short name (e.g., ENG, MATH, SCI)"
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Description</Label>
                <TextArea
              value={newSubject.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewSubject({ ...newSubject, description: e.target.value })}
                  placeholder="Enter subject description (optional)"
                />
              </FormGroup>
              <ModalActions>
                <Button variant="secondary" type="button" onClick={handleCloseDialog}>
              Cancel (Esc)
            </Button>
                <Button variant="primary" type="submit">
              Save (Enter)
            </Button>
              </ModalActions>
            </form>
          </ModalContent>
        </Modal>
      )}
      {/* Assign Subjects Modal */}
      {assignModalOpen && (
        <Modal onClick={closeAssignModal}>
          <AssignModalContent onClick={e => e.stopPropagation()}>
            <AssignModalHeader>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', marginBottom: '0.75rem' }}>
                <div>
                  <ModalTitle style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Subject Assignment</ModalTitle>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    color: themeObj.TEXT_SECONDARY,
                    marginTop: '0.5rem',
                    fontWeight: 500
                  }}>
                    Tap the Subjects to Add/Remove
                  </div>
                </div>
                <HeaderClassSelection>
                  <label>Class:</label>
                  <select
                    value={String(assigningClass?.id || '')}
                    onChange={(e) => {
                      const selectedClass = classes.find(c => 
                        String(c.id) === String(e.target.value)
                      );
                      if (selectedClass) {
                        setAssigningClass(selectedClass);
                        // Load existing assignments for this class
                        const assigned = classSubjects.filter(cs => 
                          String(cs.class_id) === String(selectedClass.id)
                        ).map(cs => cs.subject_id);
                        setAssignSelectedSubjects(assigned);
                        
                        // Load existing marks for this class
                        const marks: Record<string, number> = {};
                        classSubjects
                          .filter(cs => String(cs.class_id) === String(selectedClass.id))
                          .forEach(cs => {
                            marks[cs.subject_id] = cs.total_marks || 100;
                          });
                        setSubjectMarks(marks);
                        
                        // Load dependencies for assigned subjects
                        loadSubjectDependencies(String(selectedClass.id), assigned);
                      }
                    }}
                  >
                    <option value="">Select...</option>
                    {classes
                      .sort((a, b) => {
                        // Extract numbers from class names for proper numerical sorting
                        const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
                        const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
                        return numA - numB;
                      })
                      .map(cls => (
                        <option key={cls.id} value={String(cls.id)}>
                          {cls.name}
                        </option>
                      ))}
                  </select>
                </HeaderClassSelection>
              </div>
            </AssignModalHeader>
            
            <AssignModalMain>
              {/* Subject Selection - Two Columns */}
              {assigningClass && (
                <SubjectsContainer>
                  {/* Available Subjects */}
                  <SubjectsColumn>
                    <ColumnHeader>Available Subjects</ColumnHeader>
                    <SubjectsList itemCount={subjects.filter(subject => !assignSelectedSubjects.includes(subject.id)).length}>
                      {subjects
                        .filter(subject => !assignSelectedSubjects.includes(subject.id))
                        .map(subject => (
                          <SubjectItem
                key={subject.id}
                            onClick={() => {
                        setAssignSelectedSubjects([...assignSelectedSubjects, subject.id]);
                        // Set default marks for new subject if not already set
                        if (!subjectMarks[subject.id]) {
                          setSubjectMarks(prev => ({
                            ...prev,
                            [subject.id]: 100
                          }));
                        }
                            }}
                          >
                            <span style={{ 
                              fontSize: '0.7rem', 
                              color: '#888', 
                              minWidth: '20px',
                              textAlign: 'right'
                            }}>
                              {subjects
                                .filter(subject => !assignSelectedSubjects.includes(subject.id))
                                .findIndex(s => s.id === subject.id) + 1}.
                            </span>
                            <SubjectItemName>
                              {window.innerWidth <= 768 ? subject.short_name : subject.name}
                            </SubjectItemName>
                            <SubjectItemCode>{subject.code}</SubjectItemCode>
                          </SubjectItem>
                        ))}
                      {subjects.filter(subject => !assignSelectedSubjects.includes(subject.id)).length === 0 && (
                        <div style={{ 
                          padding: '2rem', 
                          textAlign: 'center', 
                          color: themeObj.TEXT_SECONDARY,
                          fontStyle: 'italic'
                        }}>
                          All subjects are assigned
                        </div>
                      )}
                    </SubjectsList>
                  </SubjectsColumn>

                  {/* Assigned Subjects */}
                  <SubjectsColumn>
                    <ColumnHeader>
                      Assigned Subjects ({assignSelectedSubjects.length})
                      {loadingDependencies && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          marginLeft: '0.5rem',
                          fontSize: '0.8rem',
                          opacity: 0.8
                        }}>
                          <div style={{
                            width: '12px',
                            height: '12px',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTop: '2px solid white',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            marginRight: '0.25rem'
                          }} />
                          Checking dependencies...
                        </div>
                      )}
                    </ColumnHeader>
                    <SubjectsList itemCount={assignSelectedSubjects.length}>
                      {subjects
                        .filter(subject => assignSelectedSubjects.includes(subject.id))
                        .map(subject => (
                          <SubjectItem
                            key={subject.id}
                            selected={true}
                            style={{
                              opacity: loadingDependencies ? 0.8 : (subjectDependencies[subject.id] && (subjectDependencies[subject.id].hasExams || subjectDependencies[subject.id].hasTeachers) ? 0.7 : 1),
                              cursor: loadingDependencies ? 'wait' : (subjectDependencies[subject.id] && (subjectDependencies[subject.id].hasExams || subjectDependencies[subject.id].hasTeachers) ? 'not-allowed' : 'pointer')
                            }}
                            onClick={() => {
                              // Don't allow removal while loading dependencies
                              if (loadingDependencies) {
                                showToast('Please wait while dependencies are being checked...', 'error');
                                return;
                              }
                              
                              // Check if subject has dependencies before allowing removal
                              if (subjectDependencies[subject.id] && (subjectDependencies[subject.id].hasExams || subjectDependencies[subject.id].hasTeachers)) {
                                const deps = subjectDependencies[subject.id];
                                const subjectName = subject.name;
                                const className = assigningClass?.name || 'Unknown Class';
                                
                                let warningMsg = `Cannot remove "${subjectName}" from class "${className}". This subject has `;
                                const parts = [];
                                
                                if (deps.hasExams) {
                                  parts.push(`${deps.examCount} examination record${deps.examCount > 1 ? 's' : ''}`);
                                }
                                if (deps.hasTeachers) {
                                  parts.push(`${deps.teacherCount} teacher assignment${deps.teacherCount > 1 ? 's' : ''}`);
                                }
                                
                                warningMsg += parts.join(' and ') + '. Please remove the examination records and teacher assignments first.';
                                showToast(warningMsg, 'error');
                                return;
                              }
                              
                        setAssignSelectedSubjects(assignSelectedSubjects.filter(id => id !== subject.id));
                            }}
                          >
                            <SubjectItemContent>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                width: '100%',
                                gap: '0.5rem'
                              }}>
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '0.5rem',
                                  flex: 1
                                }}>
                                  <span style={{ 
                                    fontSize: '0.7rem', 
                                    color: '#888', 
                                    minWidth: '20px',
                                    textAlign: 'right'
                                  }}>
                                    {subjects
                                      .filter(subject => assignSelectedSubjects.includes(subject.id))
                                      .findIndex(s => s.id === subject.id) + 1}.
                                  </span>
                                  <SubjectItemName>
                                    {window.innerWidth <= 768 ? subject.short_name : subject.name}
                                  </SubjectItemName>
                                  <SubjectItemCode>({subject.code})</SubjectItemCode>
                                  {!loadingDependencies && subjectDependencies[subject.id] && (subjectDependencies[subject.id].hasExams || subjectDependencies[subject.id].hasTeachers) && (
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      marginLeft: '0.5rem'
                                    }}>
                                      <div
                                        style={{ 
                                          fontSize: '0.9rem', 
                                          color: '#f59e0b',
                                          cursor: 'help',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center'
                                        }}
                                        title={`This subject has ${subjectDependencies[subject.id].hasExams ? `${subjectDependencies[subject.id].examCount} examination record${subjectDependencies[subject.id].examCount > 1 ? 's' : ''}` : ''}${subjectDependencies[subject.id].hasExams && subjectDependencies[subject.id].hasTeachers ? ' and ' : ''}${subjectDependencies[subject.id].hasTeachers ? `${subjectDependencies[subject.id].teacherCount} teacher assignment${subjectDependencies[subject.id].teacherCount > 1 ? 's' : ''}` : ''}. Removing it may affect existing data.`}
                                      >
                                        <WarningIcon style={{ fontSize: 'inherit' }} />
                                      </div>
                                    </div>
                                  )}
                                  {loadingDependencies && (
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      marginLeft: '0.5rem',
                                      opacity: 0.6
                                    }}>
                                      <div style={{
                                        width: '12px',
                                        height: '12px',
                                        border: '2px solid #ccc',
                                        borderTop: '2px solid #666',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                      }} />
                                    </div>
                                  )}
                                </div>
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '0.25rem',
                                  flexShrink: 0
                                }}>
                                  <MarksLabel style={{ fontSize: '0.75rem', margin: 0 }}>Marks:</MarksLabel>
                                  <MarksInput
                                    type="number"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    min="1"
                                    max="1000"
                                    value={subjectMarks[subject.id] || 100}
                                    onChange={(e) => {
                                      const marks = parseInt(e.target.value) || 100;
                                      setSubjectMarks(prev => ({
                                        ...prev,
                                        [subject.id]: marks
                                      }));
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onFocus={(e) => e.stopPropagation()}
                                    style={{
                                      width: '60px',
                                      padding: '0.2rem 0.3rem',
                                      fontSize: '0.8rem'
                                    }}
                                  />
                                </div>
                              </div>
                            </SubjectItemContent>
                          </SubjectItem>
                        ))}
                      {assignSelectedSubjects.length === 0 && (
                        <div style={{ 
                          padding: '2rem', 
                          textAlign: 'center', 
                          color: themeObj.TEXT_SECONDARY,
                          fontStyle: 'italic'
                        }}>
                          No subjects assigned
                        </div>
                      )}
                    </SubjectsList>
                  </SubjectsColumn>
                </SubjectsContainer>
              )}

              {!assigningClass && (
                <div style={{ 
                  padding: '3rem', 
                  textAlign: 'center', 
                  color: themeObj.TEXT_SECONDARY,
                  fontStyle: 'italic'
                }}>
                  Please select a class to assign subjects
                </div>
              )}
            </AssignModalMain>

            <AssignModalFooter>
              <Button 
                variant="secondary" 
                type="button" 
                onClick={closeAssignModal}
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="button" 
                onClick={handleAssignModalSave}
                disabled={!assigningClass}
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                Save Assignment
              </Button>
            </AssignModalFooter>
          </AssignModalContent>
        </Modal>
      )}
      {/* Delete confirmation modal */}
      {deleteModalOpen && (
        <Modal onClick={closeDeleteModal}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <CloseButton onClick={closeDeleteModal}>
              <CloseIcon />
            </CloseButton>
            <ModalTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
            Delete Subject
          </ModalTitle>
            {subjectToDelete && canDeleteSubject(subjectToDelete) ? (
            <div style={{ padding: '0', fontSize: '1.05rem', color: '#f87171', fontWeight: 500, marginBottom: '1rem' }}>
                Are you sure you want to delete the subject "{subjectToDelete.name}"?
            </div>
            ) : (
              <div style={{ padding: '0', fontSize: '1.05rem', color: '#f87171', fontWeight: 500, marginBottom: '1rem' }}>
                Cannot delete subject "{subjectToDelete?.name}". It is currently assigned to classes and must be removed from those classes first.
              </div>
            )}
            <ModalActions>
              <Button variant="secondary" type="button" onClick={closeDeleteModal}>
                Cancel
              </Button>
              {subjectToDelete && canDeleteSubject(subjectToDelete) && (
              <Button variant="danger" type="button" onClick={confirmDelete}>
                Delete
              </Button>
              )}
            </ModalActions>
          </ModalContent>
        </Modal>
      )}
    </ThemeProvider>
  );
};

export default SubjectManager; 