import React, { useEffect, useState, useContext } from 'react';
import styled, { css } from 'styled-components';
import { useTheme, useMediaQuery } from '@mui/material';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { ThemeProvider } from 'styled-components';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Close as CloseIcon, AttachMoney, School, Commute, Search as SearchIcon, FilterList as FilterIcon, People as PeopleIcon, Info as InfoIcon, Warning as WarningIcon } from '@mui/icons-material';
import { feeService } from '../services/feeService';
import { FeeStructure, FeeHead } from '../types/fee';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import { useLoading } from '../contexts/LoadingContext';
import NoSessionsFound from '../components/NoSessionsFound';
import NoClassesFound from '../components/NoClassesFound';
import { sortClasses } from '../utils/classUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

import Loader from '../components/Loader';
// Styled Components (matching ExaminationManager design language)
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

// Segmented controls matching ExaminationManager
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

const ClassesGrid = styled.div<{ cardCount: number }>`
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

const ClassCard = styled.div`
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
  display: flex;
  flex-direction: column;
  max-height: 600px;

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

const ClassHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  flex-shrink: 0;
`;

const FeeHeadsContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  padding: 0 0.2rem;
  margin: 0 -0.2rem;
  
  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 3px;
    transition: background 0.2s;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
  }
  
  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'} transparent;
`;

const ClassTitle = styled.h3`
  font-size: 1.4rem;
  font-weight: 900;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  letter-spacing: 0.5px;
`;

const ClassDescription = styled.p`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0.4rem 0 0.8rem;
  font-size: 0.95rem;
`;

const FeeHeadRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER}40;
`;

const PillInput = styled.input`
  border: none;
  outline: none;
  border-radius: 999px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 600;
  font-size: 1.01rem;
  padding: 7px 18px;
  width: 80px;
  text-align: center;
  box-shadow: 0 2px 8px 0 rgba(74, 108, 247, 0.07);
  transition: box-shadow 0.18s;
  
  &:focus {
    box-shadow: 0 0 0 3px rgba(74, 108, 247, 0.18);
  }
  
  -moz-appearance: textfield;
  &::-webkit-inner-spin-button, &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

interface StructureForm {
  id?: number;
  classId: number;
  sectionId: number;
  sessionId: number;
  feeHeadId: number;
  amount: string;
}


// Styled components for modal
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
  max-width: 800px;
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
  
  @media (max-width: 768px) {
    padding: 12px 16px;
  }
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
  flex-direction: row;
  gap: 24px;
  background: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 100%)'
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 100%)'};
  min-height: 400px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  
  @media (max-width: 768px) {
    flex-direction: column;
    padding: 12px 16px;
    gap: 12px;
    min-height: 300px;
  }
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

const FeeHeadsCard = styled.div`
  min-width: 260px;
  max-width: 320px;
  border-radius: 16px;
  box-shadow: ${({ theme }) => theme.palette?.mode === 'dark' ? '0 2px 12px #0007' : '0 2px 12px #0001'};
  background: ${({ theme }) => theme.palette?.background?.paper || theme.CARD};
  padding: 20px 18px;
  margin-left: 24px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  border: none;
  height: fit-content;
`;

// Add styled component for the glassy card
const GlassCard = styled.div`
  min-width: 220px;
  max-width: 280px;
  width: 100%;
  border-radius: 18px;
  background: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'rgba(40,60,120,0.18)'
    : 'rgba(255,255,255,0.7)'};
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid ${({ theme }) => theme.palette?.primary?.main ? `rgba(${theme.palette.primary.main}, 0.13)` : 'rgba(80,120,255,0.13)'};
  box-shadow: 0 4px 32px 0 rgba(80,120,255,0.10);
  transition: box-shadow 0.2s, transform 0.2s;
  padding: 1.3rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin-bottom: 0;
  height: 100%;
  position: relative;
  
  &:hover {
    box-shadow: 0 8px 32px 0 rgba(80,120,255,0.18);
    transform: translateY(-2px) scale(1.02);
  }
`;

// Enhance PillInput for glassy/glow effect
const GlassPillInput = styled(PillInput)`
  background: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'rgba(80,120,255,0.10)'
    : 'rgba(80,120,255,0.07)'};
  border-radius: 999px;
  box-shadow: 0 0 0 0 transparent;
  transition: box-shadow 0.18s;
  width: 70px;
  
  &:focus {
    box-shadow: 0 0 0 3px rgba(80,120,255,0.18);
    background: ${({ theme }) => theme.palette?.mode === 'dark'
      ? 'rgba(80,120,255,0.16)'
      : 'rgba(80,120,255,0.13)'};
  }
`;

// Add styled block for fee head rows, mimicking ContactItem
const FeeBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.04)'
    : 'rgba(0, 0, 0, 0.03)'};
  border-radius: 6px;
  border: ${({ theme }) => theme.palette?.mode === 'dark'
    ? '1px solid rgba(255, 255, 255, 0.08)'
    : '1px solid rgba(0, 0, 0, 0.08)'};
  transition: all 0.2s ease;
  margin-bottom: 0.5rem;
  position: relative;
  
  &:hover {
    background: ${({ theme }) => theme.palette?.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(0, 0, 0, 0.05)'};
    border-color: ${({ theme }) => theme.palette?.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(0, 0, 0, 0.12)'};
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const FeeIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'rgba(74, 108, 247, 0.15)'
    : 'rgba(74, 108, 247, 0.08)'};
  color: ${({ theme }) => theme.palette?.primary?.main || theme.ACCENT};
  flex-shrink: 0;
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const FeeDetails = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const FeeLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  line-height: 1.2;
  margin-bottom: 0.1rem;
`;

const FeeDesc = styled.div`
  font-size: 0.65rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  line-height: 1.2;
  opacity: 0.8;
`;

// Add styled components for the two-column layout
const LeftColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  
  /* Custom scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.2) transparent'
    : 'rgba(0, 0, 0, 0.2) transparent'};
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.palette?.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.2)'
      : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 3px;
    
    &:hover {
      background-color: ${({ theme }) => theme.palette?.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.3)'
        : 'rgba(0, 0, 0, 0.3)'};
    }
  }
  
  @media (max-width: 768px) {
    gap: 12px;
  }
`;

const RightColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  min-height: 0;
  border-left: 1px solid ${({ theme }) => theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
  padding-left: 24px;
  
  @media (max-width: 768px) {
    border-left: none;
    border-top: 1px solid ${({ theme }) => theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
    padding-left: 0;
    padding-top: 16px;
    gap: 12px;
  }
`;

const FeeHeadsTable = styled.div`
  background: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(0, 0, 0, 0.02)'};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  /* Custom scrollbar styling for the inner scrollable div */
  > div {
    /* Custom scrollbar styling */
    scrollbar-width: thin;
    scrollbar-color: ${({ theme }) => theme.palette?.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.05)'
      : 'rgba(0, 0, 0, 0.3) rgba(0, 0, 0, 0.05)'};
    
    &::-webkit-scrollbar {
      width: 8px;
    }
    
    &::-webkit-scrollbar-track {
      background: ${({ theme }) => theme.palette?.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(0, 0, 0, 0.05)'};
      border-radius: 4px;
      margin: 4px;
    }
    
    &::-webkit-scrollbar-thumb {
      background-color: ${({ theme }) => theme.palette?.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.3)'
        : 'rgba(0, 0, 0, 0.3)'};
      border-radius: 4px;
      border: 1px solid ${({ theme }) => theme.palette?.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(0, 0, 0, 0.1)'};
      
      &:hover {
        background-color: ${({ theme }) => theme.palette?.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.4)'
          : 'rgba(0, 0, 0, 0.4)'};
      }
      
      &:active {
        background-color: ${({ theme }) => theme.palette?.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.5)'
          : 'rgba(0, 0, 0, 0.5)'};
      }
    }
  }
`;

const TableHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'};
  border-bottom: 1px solid ${({ theme }) => theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
  font-weight: 600;
  font-size: 0.9rem;
  gap: 12px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 1;
`;

const FeeHeadTableRow = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.palette?.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
  transition: background-color 0.2s;
  cursor: pointer;
  position: relative;
  
  &:hover {
    background: ${({ theme }) => theme.palette?.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(0, 0, 0, 0.03)'};
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const FeeHeadModalName = styled.div`
  flex: 1;
  font-weight: 500;
  font-size: 0.9rem;
`;

const FeeHeadNameContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const AutoGenerateText = styled.div`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.palette?.success?.main || '#10b981'};
  font-weight: 500;
  font-style: italic;
`;

const FeeHeadAmount = styled.div`
  font-weight: 600;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.palette?.primary?.main || theme.ACCENT};
  min-width: 70px;
  text-align: right;
  margin-right: 20px;
  background: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'rgba(74, 108, 247, 0.1)'
    : 'rgba(74, 108, 247, 0.05)'};
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'rgba(74, 108, 247, 0.2)'
    : 'rgba(74, 108, 247, 0.1)'};
`;

const FeeHeadFrequency = styled.div`
  font-weight: 500;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  min-width: 60px;
  text-align: center;
  background: ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'};
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  border: 1px solid ${({ theme }) => theme.palette?.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.1)'};
`;

const AutoGenerateBadge = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
  min-width: 60px;
  justify-content: center;
`;

// Add styled component for delete icon
const DeleteIconButton = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.2s ease;
  color: ${({ theme }) => theme.palette?.error?.main || '#ef4444'};
  padding: 4px;
  background: none;
  border: none;
  cursor: pointer;
  
  &:hover {
    background: ${({ theme }) => theme.palette?.mode === 'dark'
      ? 'rgba(244, 67, 54, 0.1)'
      : 'rgba(244, 67, 54, 0.08)'};
  }
`;

// Add styled component for table row with hover effect
const TableRowWithHover = styled(FeeHeadTableRow)`
  &:hover .delete-icon {
    opacity: 1;
  }
`;

// Add form components
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

// New table layout components
const TableLayoutContainer = styled.div`
  display: flex;
  gap: 20px;
  width: 100%;
  height: 100%;
  padding: 16px 0;
  
  @media (max-width: 1024px) {
    flex-direction: column;
    gap: 16px;
  }
`;

const FeeSchedulesColumn = styled.div`
  min-width: 250px;
  max-width: 300px;
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 16px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 2px solid ${({ theme }) => theme.BORDER};
  height: fit-content;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  
  @media (max-width: 1024px) {
    min-width: 100%;
    max-width: 100%;
    max-height: 300px;
  }
`;

const FeeSchedulesTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
`;

const ClassCheckboxItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  margin-bottom: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  }
`;

const ClassCheckbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: ${({ theme }) => theme.ACCENT};
`;

const ClassCheckboxLabel = styled.label`
  font-size: 0.95rem;
  font-weight: 500;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  cursor: pointer;
  flex: 1;
`;

const MainTableContainer = styled.div`
  flex: 1;
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 20px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 2px solid ${({ theme }) => theme.BORDER};
  overflow-x: auto;
`;

const MainTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
`;

const TableHeaderRow = styled.tr`
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
`;

const TableHeaderCell = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-weight: 700;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  white-space: nowrap;
  
  &:first-child {
    width: 40px;
  }
  
  &:nth-child(2) {
    min-width: 200px;
  }
  
  &:nth-child(3) {
    min-width: 120px;
  }
  
  &:nth-child(4) {
    min-width: 400px;
  }
`;

const TableRow = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.BORDER}40;
  transition: background 0.2s;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'};
  }
`;

const TableCell = styled.td`
  padding: 16px;
  vertical-align: top;
`;

const FeeHeadCheckbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: ${({ theme }) => theme.ACCENT};
`;

const FeeHeadName = styled.div`
  font-weight: 600;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 4px;
`;

const FeeHeadDescription = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  opacity: 0.8;
`;

const AmountInput = styled.input`
  width: 100%;
  max-width: 120px;
  padding: 8px 12px;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  font-weight: 600;
  outline: none;
  transition: all 0.2s;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.ACCENT}20;
  }
  
  -moz-appearance: textfield;
  &::-webkit-inner-spin-button, &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const FrequencyCell = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const OneTimeButton = styled.button<{ active: boolean; disabled?: boolean }>`
  padding: 8px 16px;
  border-radius: 6px;
  border: 1.5px solid ${({ active, theme }) => active ? theme.ACCENT : theme.FIELD_BORDER};
  background: ${({ active, theme }) => active ? theme.ACCENT : theme.FIELD_BG};
  color: ${({ active, theme }) => active ? '#fff' : theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  width: fit-content;
  opacity: ${({ disabled }) => disabled ? 0.5 : 1};
  
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.ACCENT};
    background: ${({ active, theme }) => active ? theme.ACCENT : theme.ACCENT}20;
  }
  
  &:disabled {
    cursor: not-allowed;
  }
`;

const MonthsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const MonthButton = styled.button<{ active: boolean; disabled?: boolean }>`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1.5px solid ${({ active, theme }) => active ? theme.ACCENT : theme.FIELD_BORDER};
  background: ${({ active, theme }) => active ? theme.ACCENT : theme.FIELD_BG};
  color: ${({ active, theme }) => active ? '#fff' : theme.TEXT_PRIMARY};
  font-size: 0.75rem;
  font-weight: 600;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  min-width: 45px;
  opacity: ${({ disabled }) => disabled ? 0.5 : 1};
  
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.ACCENT};
    background: ${({ active, theme }) => active ? theme.ACCENT : theme.ACCENT}20;
  }
  
  &:disabled {
    cursor: not-allowed;
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

// Skeleton Loading Components - Dashboard Style
const SkeletonContainer = styled.div`
  width: 100%;
  height: 100%;
  padding: clamp(8px, 2vw, 24px);
  box-sizing: border-box;
  @media (max-width: 900px) {
    padding: clamp(6px, 2vw, 12px);
  }
  @media (max-width: 600px) {
    padding: 8px 10px;
    padding-bottom: 2.5rem;
  }
`;

const SkeletonCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  padding: 1.5rem 1.5rem 1.2rem 1.5rem;
  margin-bottom: 1rem;
  width: 100%;
  border: 2.5px solid ${({ theme }) => theme.BORDER};
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
    z-index: 2;
  }
  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
  }
`;

const SkeletonHeader = styled.div`
  height: 40px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 8px;
  margin-bottom: 1rem;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

const SkeletonClassCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  padding: 1.5rem 1.5rem 1.2rem 1.5rem;
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 2.5px solid ${({ theme }) => theme.BORDER};
  position: relative;
  overflow: hidden;
  margin-bottom: 0.5rem;
  min-width: 220px;
  width: 100%;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
    z-index: 2;
  }
`;

const SkeletonClassTitle = styled.div`
  height: 32px;
  width: 60%;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 8px;
  margin-bottom: 1rem;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

const SkeletonFeeBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)'};
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'};
  margin-bottom: 0.5rem;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
    z-index: 2;
  }
`;

const SkeletonFeeIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

const SkeletonFeeDetails = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SkeletonFeeLabel = styled.div`
  height: 16px;
  width: 80%;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

const SkeletonFeeDesc = styled.div`
  height: 12px;
  width: 60%;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

const SkeletonPillInput = styled.div`
  width: 80px;
  height: 32px;
  border-radius: 16px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent);
    animation: shimmer 1.5s infinite;
  }
`;

const SkeletonLoader = () => (
  <SkeletonContainer>
    <SkeletonCard>
      <SkeletonHeader />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {[1, 2, 3, 4].map(i => (
          <SkeletonClassCard key={i}>
            <SkeletonClassTitle />
            {[1, 2, 3].map(j => (
              <SkeletonFeeBlock key={j}>
                <SkeletonFeeIcon />
                <SkeletonFeeDetails>
                  <SkeletonFeeLabel />
                  <SkeletonFeeDesc />
                </SkeletonFeeDetails>
                <SkeletonPillInput />
              </SkeletonFeeBlock>
            ))}
          </SkeletonClassCard>
        ))}
      </div>
    </SkeletonCard>
  </SkeletonContainer>
);

const FeeStructureManagerContent: React.FC<{ theme: typeof darkTheme }> = ({ theme: customTheme }) => {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const { user } = useAuth();
  const { setLoading, loading } = useLoading();
  const schoolId = user?.school_id;
  const { showToast } = useToast();

  // State
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState(0);
  const [amounts, setAmounts] = useState<{ [key: string]: string }>({}); // key: `${classId}_${feeHeadId}`
  const [selectedClasses, setSelectedClasses] = useState<Set<number>>(new Set());
  const [selectedFeeHeads, setSelectedFeeHeads] = useState<Set<number>>(new Set());
  const [months, setMonths] = useState<{ [key: string]: number[] }>({}); // key: `${classId}_${feeHeadId}`
  const [firstTime, setFirstTime] = useState<{ [key: string]: boolean }>({}); // key: `${classId}_${feeHeadId}`
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showFeeHeadModal, setShowFeeHeadModal] = useState(false);
  const [newFeeHeadName, setNewFeeHeadName] = useState('');
  const [newFeeHeadDesc, setNewFeeHeadDesc] = useState('');
  const [newFeeHeadAmount, setNewFeeHeadAmount] = useState('');
  const [newFeeHeadFrequency, setNewFeeHeadFrequency] = useState('monthly');
  const [newFeeHeadAutoGenerate, setNewFeeHeadAutoGenerate] = useState(false);
  const [feeHeadLoading, setFeeHeadLoading] = useState(false);
  const [editFeeHead, setEditFeeHead] = useState<FeeHead | null>(null);
  const [deleteFeeHead, setDeleteFeeHead] = useState<FeeHead | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedClassesForFeeHead, setSelectedClassesForFeeHead] = useState<Set<number>>(new Set());
  
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Fetch all data
  useEffect(() => {
    if (!schoolId) return;
    const minDuration = 2000;
    const start = Date.now();
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [feeHeadsRes, classesRes, sessionsRes] = await Promise.all([
          feeService.getFeeHeads(schoolId),
          supabase.from('classes').select('id, name').eq('school_id', schoolId),
          supabase.from('sessions').select('id, name').eq('school_id', schoolId),
        ]);
        setFeeHeads(feeHeadsRes);
        setClasses(classesRes.data || []);
        setSessions(sessionsRes.data || []);
        // Load existing structures for the selected session
        if (sessionId) {
          const data = await feeService.getFeeStructures(schoolId, { sessionId });
          setStructures(data);
          // Pre-fill amounts, months, and firstTime
          const amt: { [key: string]: string } = {};
          const mths: { [key: string]: number[] } = {};
          const ft: { [key: string]: boolean } = {};
          
          data.forEach(s => {
            const key = `${s.classId}_${s.feeHeadId}`;
            amt[key] = String(s.amount);
            mths[key] = s.months || [];
            ft[key] = s.firstTime || false;
          });
          
          setAmounts(amt);
          setMonths(mths);
          setFirstTime(ft);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        const elapsed = Date.now() - start;
        if (elapsed < minDuration) {
          setTimeout(() => setLoading(false), minDuration - elapsed);
        } else {
        setLoading(false);
        }
      }
    })();
    // eslint-disable-next-line
  }, [schoolId, sessionId]);

  useEffect(() => {
    if (sessions.length && sessionId === 0) {
      // Try to find active session
      const active = sessions.find((s: any) => s.is_active);
      if (active) setSessionId(active.id);
      else setSessionId(Math.max(...sessions.map((s: any) => s.id)));
    }
    // eslint-disable-next-line
  }, [sessions]);

  // No longer need auto-select since we show all classes in the table

  const handleAmountChange = (classId: number, feeHeadId: number, value: string) => {
    setAmounts(prev => ({ ...prev, [`${classId}_${feeHeadId}`]: value }));
  };

  const handleClassToggle = (classId: number) => {
    setSelectedClasses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
  };

  const handleFeeHeadToggle = (feeHeadId: number) => {
    setSelectedFeeHeads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(feeHeadId)) {
        newSet.delete(feeHeadId);
      } else {
        newSet.add(feeHeadId);
      }
      return newSet;
    });
  };

  const handleMonthToggle = async (classId: number, feeHeadId: number, month: number) => {
    if (!schoolId || !sessionId) return;
    const key = `${classId}_${feeHeadId}`;
    const current = months[key] || [];
    const newMonths = current.includes(month)
      ? current.filter(m => m !== month)
      : [...current, month].sort((a, b) => a - b);
    
    setMonths(prev => ({ ...prev, [key]: newMonths }));
    
    // Auto-save
    try {
      const amount = amounts[key];
      if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
        await feeService.bulkUpsertFeeStructures(schoolId, sessionId, [{
          classId,
          feeHeadId,
          amount: Number(amount),
          months: newMonths,
          firstTime: firstTime[key] || false,
        }], user?.id);
      }
    } catch (err: any) {
      console.error('Auto-save failed:', err);
    }
  };

  const handleFirstTimeToggle = async (classId: number, feeHeadId: number) => {
    if (!schoolId || !sessionId) return;
    const key = `${classId}_${feeHeadId}`;
    const newFirstTime = !firstTime[key];
    setFirstTime(prev => ({
      ...prev,
      [key]: newFirstTime
    }));
    
    // If One Time is selected, clear months
    if (newFirstTime) {
      setMonths(prev => ({ ...prev, [key]: [] }));
    }
    
    // Auto-save
    try {
      const amount = amounts[key];
      if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
        await feeService.bulkUpsertFeeStructures(schoolId, sessionId, [{
          classId,
          feeHeadId,
          amount: Number(amount),
          months: newFirstTime ? [] : (months[key] || []),
          firstTime: newFirstTime,
        }], user?.id);
      }
    } catch (err: any) {
      console.error('Auto-save failed:', err);
    }
  };

  const handleSaveAll = async () => {
    if (!schoolId || !sessionId) return;
    setSaving(true);
    setError(null);
    try {
      // Prepare bulk upsert - for all classes and fee heads
      const payload = [];
      for (const c of classes) {
        for (const fh of feeHeads) {
          const key = `${c.id}_${fh.id}`;
          const amount = amounts[key];
          if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
            payload.push({
              classId: c.id,
              feeHeadId: fh.id,
              amount: Number(amount),
              months: months[key] || [],
              firstTime: firstTime[key] || false,
            });
          }
        }
      }
      await feeService.bulkUpsertFeeStructures(schoolId, sessionId, payload, user?.id);
      setError(null);
      showToast('Fee structure saved!', 'success');
    } catch (err: any) {
      setError(err.message || 'Failed to save');
      showToast(err.message || 'Failed to save fee structure', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Function to populate default amounts only for existing fee structures
  const populateDefaultAmounts = () => {
    const newAmounts = { ...amounts };
    let hasChanges = false;
    
    // Only populate amounts for classes that already have fee structures
    for (const s of structures) {
      const key = `${s.classId}_${s.feeHeadId}`;
      const currentAmount = newAmounts[key];
      const feeHead = feeHeads.find(fh => fh.id === s.feeHeadId);
      const defaultAmount = feeHead?.defaultAmount ? String(feeHead.defaultAmount) : '0';
      
      // Set default amount if:
      // 1. No amount is set, OR
      // 2. Current amount is '0' or empty, OR
      // 3. Current amount is not a valid number
      if (!currentAmount || currentAmount === '0' || currentAmount === '' || isNaN(Number(currentAmount))) {
        newAmounts[key] = defaultAmount;
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      setAmounts(newAmounts);
    }
  };

  // Effect to populate default amounts when fee heads or classes change
  useEffect(() => {
    if (feeHeads.length > 0 && classes.length > 0) {
      populateDefaultAmounts();
    }
  }, [feeHeads, classes]);

  // Effect to populate default amounts after loading existing structures
  useEffect(() => {
    if (feeHeads.length > 0 && classes.length > 0 && structures.length >= 0) {
      // Small delay to ensure structures are fully loaded
      const timer = setTimeout(() => {
        populateDefaultAmounts();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [structures, feeHeads, classes]);

  const handleOpenFeeHeadModal = () => {
    setShowFeeHeadModal(true);
    setNewFeeHeadName('');
    setNewFeeHeadDesc('');
    setNewFeeHeadAmount('');
    setNewFeeHeadAutoGenerate(false);
    // Don't pre-select any classes - user must explicitly select
    setSelectedClassesForFeeHead(new Set());
  };

  const handleCloseFeeHeadModal = () => {
    setShowFeeHeadModal(false);
    setNewFeeHeadName('');
    setNewFeeHeadDesc('');
    setNewFeeHeadAmount('');
    setNewFeeHeadAutoGenerate(false);
    setEditFeeHead(null);
    setSelectedClassesForFeeHead(new Set());
  };

  const handleEditFeeHead = async (fh: FeeHead) => {
    setEditFeeHead(fh);
    setNewFeeHeadName(fh.name);
    setNewFeeHeadDesc(fh.description || '');
    setNewFeeHeadAmount(fh.defaultAmount ? String(fh.defaultAmount) : '');
    setNewFeeHeadAutoGenerate(fh.autoGenerate || false);
    
    // Load existing classes that have this fee head
    if (schoolId && sessionId) {
      try {
        const existingStructures = await feeService.getFeeStructures(schoolId, { 
          sessionId,
          feeHeadId: fh.id 
        });
        const existingClassIds = new Set(existingStructures.map(s => s.classId));
        setSelectedClassesForFeeHead(existingClassIds);
      } catch (err) {
        console.error('Failed to load existing classes:', err);
        setSelectedClassesForFeeHead(new Set());
      }
    } else {
      setSelectedClassesForFeeHead(new Set());
    }
    
    setShowFeeHeadModal(true);
  };

  const handleDeleteFeeHead = async () => {
    if (!deleteFeeHead || !schoolId) return;
    setDeleteLoading(true);
    try {
      await feeService.deleteFeeHead(deleteFeeHead.id, schoolId);
      const heads = await feeService.getFeeHeads(schoolId);
      setFeeHeads(heads);
      setDeleteFeeHead(null);
      showToast('Fee head deleted!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete fee head', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteFeeHeadFromTable = (e: React.MouseEvent, fh: FeeHead) => {
    e.stopPropagation(); // Prevent row click
    setDeleteFeeHead(fh);
  };

  const handleExportPDF = async () => {
    if (!schoolId || !sessionId || classes.length === 0 || feeHeads.length === 0) {
      showToast('No data available to export', 'error');
      return;
    }

    setExportLoading(true);
    try {
      const doc = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Get school name and session name
      const { data: schoolData } = await supabase
        .from('schools')
        .select('name')
        .eq('id', schoolId)
        .single();
      
      const schoolName = schoolData?.name || 'School Name';
      const sessionName = sessions.find(s => s.id === sessionId)?.name || 'Session';

      // Header
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text(schoolName, pageWidth / 2, 15, { align: 'center' });
      
      doc.setFontSize(13);
      doc.text('Fee Structure Report', pageWidth / 2, 22, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Session: ${sessionName}`, pageWidth / 2, 28, { align: 'center' });

      let currentY = 38;
      const sortedClasses = sortClasses(classes);
      let grandTotal = 0;

      // Create a table for each class
      sortedClasses.forEach((cls: any, classIndex: number) => {
        // Filter fee heads to only show those that have fee structures for this class
        const feeHeadsForClass = feeHeads.filter(fh => {
          // Check if a fee structure exists for this class-fee head combination
          return structures.some(s => s.classId === cls.id && s.feeHeadId === fh.id);
        });
        
        // Skip this class if it has no fee heads
        if (feeHeadsForClass.length === 0) return;
        
        // Check if we need a new page
        const estimatedHeight = (feeHeadsForClass.length + 3) * 10; // Rough estimate
        if (currentY + estimatedHeight > pageHeight - 20) {
          doc.addPage();
          currentY = 20;
        }

        // Class header
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(74, 108, 247);
        doc.setTextColor(255, 255, 255);
        doc.rect(10, currentY, pageWidth - 20, 8, 'F');
        doc.text(`Class: ${cls.name}`, pageWidth / 2, currentY + 5.5, { align: 'center' });
        
        currentY += 10;

        // Prepare table data for this class
        const tableData: any[] = [];
        let classTotal = 0;

        feeHeadsForClass.forEach((fh) => {
          const key = `${cls.id}_${fh.id}`;
          const amount = amounts[key] ? Number(amounts[key]) : 0;
          const feeMonths = months[key] || [];
          const isOneTime = firstTime[key] || false;
          
          // Format frequency display
          let frequencyText = '';
          if (isOneTime) {
            frequencyText = 'One Time';
          } else if (feeMonths.length === 0) {
            frequencyText = 'All months';
          } else if (feeMonths.length === 12) {
            frequencyText = 'All months';
          } else {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            frequencyText = feeMonths.map(m => monthNames[m - 1]).join(', ');
          }
          
          tableData.push([
            fh.name,
            fh.description || '-',
            amount > 0 ? `Rs. ${amount.toFixed(0)}` : '-',
            frequencyText || '-'
          ]);
          
          classTotal += amount;
        });

        // Add class total row only if there are fee heads
        if (tableData.length > 0) {
          tableData.push([
            { content: 'Total', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
            { content: `Rs. ${classTotal.toFixed(0)}`, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
            { content: '', styles: { fillColor: [240, 240, 240] } }
          ]);

          grandTotal += classTotal;
        }

        // Generate table for this class only if there's data
        if (tableData.length > 0) {
          autoTable(doc, {
            head: [['Fee Head', 'Description', 'Amount', 'Frequency']],
            body: tableData,
            startY: currentY,
            theme: 'grid',
            styles: {
              fontSize: 9,
              cellPadding: 3,
              valign: 'middle',
            },
            headStyles: {
              fillColor: [240, 240, 240],
              textColor: [0, 0, 0],
              fontStyle: 'bold',
              halign: 'center',
            },
            columnStyles: {
              0: { halign: 'left', cellWidth: 45 },
              1: { halign: 'left', cellWidth: 60 },
              2: { halign: 'right', cellWidth: 30, fontStyle: 'bold' },
              3: { halign: 'left', cellWidth: 50 },
            },
            margin: { left: 10, right: 10 },
            didDrawPage: (data) => {
              currentY = data.cursor?.y || currentY;
            }
          });

          currentY = (doc as any).lastAutoTable.finalY + 8;
        }
      });

      // Add grand total summary
      if (currentY + 30 > pageHeight - 20) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(74, 108, 247);
      doc.setTextColor(255, 255, 255);
      doc.rect(10, currentY, pageWidth - 20, 10, 'F');
      doc.text('Grand Total Summary', pageWidth / 2, currentY + 6.5, { align: 'center' });
      
      currentY += 12;

      // Summary table - only include classes that have fee structures
      const summaryData: any[] = [];
      sortedClasses.forEach((cls: any) => {
        // Filter fee heads to only those that have fee structures for this class
        const feeHeadsForClass = feeHeads.filter(fh => {
          return structures.some(s => s.classId === cls.id && s.feeHeadId === fh.id);
        });
        
        // Skip classes with no fee heads
        if (feeHeadsForClass.length === 0) return;
        
        let classTotal = 0;
        feeHeadsForClass.forEach((fh) => {
          const key = `${cls.id}_${fh.id}`;
          const amount = amounts[key] ? Number(amounts[key]) : 0;
          classTotal += amount;
        });
        summaryData.push([cls.name, `Rs. ${classTotal.toFixed(0)}`]);
      });

      // Add grand total row
      summaryData.push([
        { content: 'Grand Total', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: `Rs. ${grandTotal.toFixed(0)}`, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
      ]);

      autoTable(doc, {
        head: [['Class', 'Total Amount']],
        body: summaryData,
        startY: currentY,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3,
          valign: 'middle',
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold' },
          1: { halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: 10, right: 10 },
      });

      // Add footer to all pages
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Footer
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`Printed: ${format(new Date(), 'dd-MM-yyyy')}`, 10, pageHeight - 10);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 10, pageHeight - 10, { align: 'right' });
      }

      // Save PDF
      doc.save(`Fee_Structure_${sessionName.replace(/\s+/g, '_')}_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
      showToast('PDF exported successfully!', 'success');
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      showToast(error.message || 'Failed to export PDF', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleCreateFeeHead = async () => {
    if (!schoolId || !newFeeHeadName.trim() || !sessionId) return;
    setFeeHeadLoading(true);
    try {
      if (editFeeHead) {
        await feeService.updateFeeHead(editFeeHead.id, schoolId, {
          name: newFeeHeadName.trim(),
          description: newFeeHeadDesc.trim() || null,
          defaultAmount: newFeeHeadAmount ? Number(newFeeHeadAmount) : 0,
          autoGenerate: newFeeHeadAutoGenerate,
        });
        
        // Update fee structures for selected classes
        if (selectedClassesForFeeHead.size > 0 && newFeeHeadAmount) {
          const amount = Number(newFeeHeadAmount);
          if (!isNaN(amount) && amount > 0) {
            // Get existing structures for this fee head
            const existingStructures = await feeService.getFeeStructures(schoolId, { 
              sessionId,
              feeHeadId: editFeeHead.id 
            });
            const existingClassIds = new Set(existingStructures.map(s => s.classId));
            const selectedClassIds = selectedClassesForFeeHead;
            
            // Classes to add
            const classesToAdd = Array.from(selectedClassIds).filter(id => !existingClassIds.has(id));
            // Classes to remove
            const classesToRemove = Array.from(existingClassIds).filter(id => !selectedClassIds.has(id));
            
            // Add new fee structures
            if (classesToAdd.length > 0) {
              const addPayload = classesToAdd.map(classId => ({
                classId,
                feeHeadId: editFeeHead.id,
                amount,
                months: [],
                firstTime: false,
              }));
              await feeService.bulkUpsertFeeStructures(schoolId, sessionId, addPayload, user?.id);
            }
            
            // Remove fee structures for deselected classes
            if (classesToRemove.length > 0) {
              const removePayload = classesToRemove.map(classId => ({
                classId,
                feeHeadId: editFeeHead.id,
                amount: 0, // Set to 0 to effectively remove
                months: [],
                firstTime: false,
              }));
              // Delete the structures
              for (const classId of classesToRemove) {
                const structure = existingStructures.find(s => s.classId === classId);
                if (structure) {
                  await feeService.deleteFeeStructure(structure.id, schoolId);
                }
              }
            }
            
            // Update amounts for existing classes that are still selected
            const classesToUpdate = Array.from(selectedClassIds).filter(id => existingClassIds.has(id));
            if (classesToUpdate.length > 0) {
              const updatePayload = classesToUpdate.map(classId => {
                const existing = existingStructures.find(s => s.classId === classId);
                return {
                  classId,
                  feeHeadId: editFeeHead.id,
                  amount,
                  months: existing?.months || [],
                  firstTime: existing?.firstTime || false,
                };
              });
              await feeService.bulkUpsertFeeStructures(schoolId, sessionId, updatePayload, user?.id);
            }
          }
        } else if (selectedClassesForFeeHead.size === 0) {
          // Remove all fee structures if no classes selected
          const existingStructures = await feeService.getFeeStructures(schoolId, { 
            sessionId,
            feeHeadId: editFeeHead.id 
          });
          for (const structure of existingStructures) {
            await feeService.deleteFeeStructure(structure.id, schoolId);
          }
        }
        
        showToast('Fee head updated!', 'success');
      } else {
        // Create the fee head
        const newFeeHead = await feeService.createFeeHead({
          schoolId,
          name: newFeeHeadName.trim(),
          description: newFeeHeadDesc.trim() || null,
          defaultAmount: newFeeHeadAmount ? Number(newFeeHeadAmount) : 0,
          frequency: 'monthly', // Default frequency
          autoGenerate: newFeeHeadAutoGenerate,
        }, user?.id);
        
        // Create fee structures for selected classes
        if (selectedClassesForFeeHead.size > 0 && newFeeHeadAmount) {
          const amount = Number(newFeeHeadAmount);
          if (!isNaN(amount) && amount > 0) {
            const payload = Array.from(selectedClassesForFeeHead).map(classId => ({
              classId,
              feeHeadId: newFeeHead.id,
              amount,
              months: [],
              firstTime: false,
            }));
            
            await feeService.bulkUpsertFeeStructures(schoolId, sessionId, payload, user?.id);
          }
        }
        
        showToast('Fee head added!', 'success');
      }
      
      // Reload data
      const heads = await feeService.getFeeHeads(schoolId);
      setFeeHeads(heads);
      
      // Reload structures if session is selected
      if (sessionId) {
        const data = await feeService.getFeeStructures(schoolId, { sessionId });
        setStructures(data);
        // Update amounts, months, and firstTime
        const amt: { [key: string]: string } = {};
        const mths: { [key: string]: number[] } = {};
        const ft: { [key: string]: boolean } = {};
        
        data.forEach(s => {
          const key = `${s.classId}_${s.feeHeadId}`;
          amt[key] = String(s.amount);
          mths[key] = s.months || [];
          ft[key] = s.firstTime || false;
        });
        
        setAmounts(prev => ({ ...prev, ...amt }));
        setMonths(prev => ({ ...prev, ...mths }));
        setFirstTime(prev => ({ ...prev, ...ft }));
      }
      
      // Don't close modal on save - removed handleCloseFeeHeadModal() call
      // Reset form for new entry if not editing
      if (!editFeeHead) {
        setNewFeeHeadName('');
        setNewFeeHeadDesc('');
        setNewFeeHeadAmount('');
        setNewFeeHeadAutoGenerate(false);
        setSelectedClassesForFeeHead(new Set());
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create fee head');
      showToast(err.message || 'Failed to add fee head', 'error');
    } finally {
      setFeeHeadLoading(false);
    }
  };

  if (loading) return <Loader />;

  // Check for prerequisites and show appropriate empty states
  if (sessions.length === 0) {
    return <NoSessionsFound />;
  }

  if (classes.length === 0) {
    return <NoClassesFound />;
  }

  return (
    <PageContainer>
        <Header>
          <HeaderRow>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Title>
                Fee Structure Manager <span style={{fontWeight:400, fontSize:'1rem', color: muiTheme.palette.mode === 'dark' ? '#b0b8d1' : '#4a4a4a'}}>({classes.length} classes)</span>
              </Title>
              {/* Mobile Buttons - Icon Only */}
              <div style={{ display: window.innerWidth <= 700 ? 'flex' : 'none', gap: '6px' }}>
                <button
                  onClick={handleExportPDF}
                  disabled={exportLoading || classes.length === 0 || feeHeads.length === 0}
                  style={{
                    background: muiTheme.palette.mode === 'dark' ? '#23242a' : '#f3f4f6',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px',
                    cursor: exportLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 4px #0002',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: muiTheme.palette.mode === 'dark' ? '#C0C0C0' : '#444',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    width: '36px',
                    height: '36px',
                    flexShrink: 0,
                    opacity: exportLoading || classes.length === 0 || feeHeads.length === 0 ? 0.5 : 1
                  }}
                  title="Export PDF"
                >
                  {exportLoading ? '...' : '📄'}
                </button>
              <button
                onClick={() => handleOpenFeeHeadModal()}
                style={{
                  background: muiTheme.palette.mode === 'dark' ? '#23242a' : '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px #0002',
                    display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: muiTheme.palette.mode === 'dark' ? '#C0C0C0' : '#444',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  width: '36px',
                  height: '36px',
                  flexShrink: 0
                }}
                title="Add Fee Head"
              >
                <AddIcon style={{ fontSize: 18 }} />
              </button>
              </div>
            </div>
            <HeaderFilters style={{ display: window.innerWidth > 700 ? 'flex' : 'none' }}>
              <SegmentedGroup>
                <SegmentedSelect
                  value={sessionId}
                  onChange={(e) => setSessionId(Number(e.target.value))}
                  first
                >
                  <option value={0}>Select Session</option>
              {sessions.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </SegmentedSelect>
                <SegmentedButton
                  onClick={handleExportPDF}
                  disabled={exportLoading || classes.length === 0 || feeHeads.length === 0}
                  title="Export PDF"
                  style={{
                    minWidth: 100,
                    maxWidth: 120,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    background: muiTheme.palette.mode === 'dark' ? '#444' : '#f3f4f6',
                    border: `1.5px solid ${muiTheme.palette.mode === 'dark' ? '#555' : '#e5e7eb'}`,
                    color: muiTheme.palette.mode === 'dark' ? '#C0C0C0' : '#444',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    padding: '6px 8px',
                    cursor: exportLoading || classes.length === 0 || feeHeads.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: exportLoading || classes.length === 0 || feeHeads.length === 0 ? 0.5 : 1
                  }}
                >
                  <span style={{ fontWeight: 700, display: 'inline-block', whiteSpace: 'nowrap' }}>
                    {exportLoading ? 'Exporting...' : '📄 Export PDF'}
                  </span>
                </SegmentedButton>
                <SegmentedButton
                  onClick={() => handleOpenFeeHeadModal()}
                  title="Add Fee Head"
                  last
                  style={{
                    minWidth: 120,
                    maxWidth: 140,
              width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    background: muiTheme.palette.mode === 'dark' ? '#444' : '#f3f4f6',
                    border: `1.5px solid ${muiTheme.palette.mode === 'dark' ? '#555' : '#e5e7eb'}`,
                    color: muiTheme.palette.mode === 'dark' ? '#C0C0C0' : '#444',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    padding: '6px 8px'
                  }}
                >
                  <AddIcon style={{ fontSize: 14 }} />
                  <span style={{ fontWeight: 700, display: 'inline-block', whiteSpace: 'nowrap' }}>
                    {window.innerWidth <= 900 ? 'Add' : 'Add Fee Head'}
                  </span>
                </SegmentedButton>
              </SegmentedGroup>
            </HeaderFilters>
          </HeaderRow>
        </Header>
        <MainContent>
          {feeHeads.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                textAlign: 'center',
                minHeight: 400
              }}
            >
              <AttachMoney 
                style={{ 
                  fontSize: 64, 
                  color: muiTheme.palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                  marginBottom: '1.5rem'
                }} 
              />
              <div
                style={{
                  color: muiTheme.palette.mode === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  marginBottom: '0.5rem'
                }}
              >
                No fee heads added
              </div>
              <div
                style={{
                  color: muiTheme.palette.mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                  fontSize: '0.9rem'
                }}
              >
                Add fee heads to set up fee structure
              </div>
            </div>
          ) : (
            <MainTableContainer>
              <MainTable>
                <thead>
                  <TableHeaderRow>
                    <TableHeaderCell style={{ position: 'sticky', left: 0, zIndex: 10, background: customTheme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)', minWidth: '150px' }}>Class</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: '200px' }}>Fee Head</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: '120px' }}>Amount</TableHeaderCell>
                    <TableHeaderCell style={{ minWidth: '400px' }}>Frequency</TableHeaderCell>
                  </TableHeaderRow>
                </thead>
                <tbody>
                  {sortClasses(classes).map((c: any, classIndex: number) => {
                    // Filter fee heads to only show those that have fee structures for this class
                    const feeHeadsForClass = feeHeads.filter(fh => {
                      const key = `${c.id}_${fh.id}`;
                      // Check if a fee structure exists for this class-fee head combination
                      return structures.some(s => s.classId === c.id && s.feeHeadId === fh.id);
                    });
                    
                    if (feeHeadsForClass.length === 0) return null;
                    
                    return feeHeadsForClass.map((fh, feeHeadIndex: number) => {
                      const key = `${c.id}_${fh.id}`;
                      const currentMonths = months[key] || [];
                      const isFirstTime = firstTime[key] || false;
                      const isFirstFeeHead = feeHeadIndex === 0;
                      const isLastFeeHead = feeHeadIndex === feeHeadsForClass.length - 1;
                      const isLastClass = classIndex === classes.length - 1;
                      
                      return (
                        <TableRow 
                          key={`${c.id}_${fh.id}`}
                          style={{
                            borderBottom: isLastFeeHead && !isLastClass 
                              ? `2px solid ${customTheme.BG === '#252525' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
                              : undefined
                          }}
                        >
                          {isFirstFeeHead && (
                            <TableCell 
                              rowSpan={feeHeadsForClass.length}
                              style={{ 
                                position: 'sticky', 
                                left: 0, 
                                zIndex: 9, 
                                background: customTheme.CARD, 
                                fontWeight: 600, 
                                fontSize: '0.95rem',
                                verticalAlign: 'top',
                                paddingTop: '20px'
                              }}
                            >
                              {c.name}
                            </TableCell>
                          )}
                          <TableCell>
                            <FeeHeadName>{fh.name}</FeeHeadName>
                            {fh.description && (
                              <FeeHeadDescription>{fh.description}</FeeHeadDescription>
                            )}
                          </TableCell>
                          <TableCell>
                            <AmountInput
                              type="number"
                              value={amounts[key] ?? '0'}
                              onChange={e => {
                                const value = e.target.value;
                                setAmounts(prev => ({ ...prev, [key]: value }));
                              }}
                              min={0}
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell>
                            <FrequencyCell>
                              <OneTimeButton
                                active={isFirstTime}
                                disabled={false}
                                onClick={() => handleFirstTimeToggle(c.id, fh.id)}
                              >
                                One Time
                              </OneTimeButton>
                              <MonthsContainer>
                                {MONTHS.map((monthName, index) => {
                                  const monthNum = index + 1;
                                  const isActive = currentMonths.includes(monthNum);
                                  return (
                                    <MonthButton
                                      key={monthNum}
                                      active={isActive}
                                      disabled={isFirstTime}
                                      onClick={() => handleMonthToggle(c.id, fh.id, monthNum)}
                                    >
                                      {monthName}
                                    </MonthButton>
                                  );
                                })}
                              </MonthsContainer>
                            </FrequencyCell>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })}
                </tbody>
              </MainTable>
            </MainTableContainer>
          )}
        </MainContent>
      <StyledDialog open={showFeeHeadModal}>
        <DialogPaper onClick={e => e.stopPropagation()}>
        <DialogHeader>
            <DialogTitle>
            {editFeeHead ? 'Edit Fee Head' : 'Add Fee Head'}
            </DialogTitle>
            <CloseButton onClick={handleCloseFeeHeadModal}>
              <CloseIcon />
            </CloseButton>
        </DialogHeader>
        <StyledDialogContent>
          <LeftColumn>
              <div style={{ marginBottom: '0.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.1rem', color: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', fontWeight: 500, fontSize: '0.9rem' }}>
                  Fee Head Name
                </label>
                <Input
                  type="text"
              value={newFeeHeadName}
              onChange={e => setNewFeeHeadName(e.target.value)}
                  placeholder="Enter fee head name"
              required
              autoFocus
                />
              </div>
              <div style={{ marginBottom: '0.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.1rem', color: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', fontWeight: 500, fontSize: '0.9rem' }}>
                  Description (optional)
                </label>
                <TextArea
              value={newFeeHeadDesc}
              onChange={e => setNewFeeHeadDesc(e.target.value)}
                  placeholder="Enter description"
                  rows={2}
                />
              </div>
              <div style={{ marginBottom: '0.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.1rem', color: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', fontWeight: 500, fontSize: '0.9rem' }}>
                  Default Amount
                </label>
                <Input
                  type="number"
              value={newFeeHeadAmount}
              onChange={e => setNewFeeHeadAmount(e.target.value)}
                  placeholder="Enter default amount"
                  min={0}
                  step={0.01}
                />
                <div style={{ fontSize: '0.8rem', color: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)', marginTop: '0.1rem' }}>
                  Default amount for this fee head
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.1rem' }}>
                <input
                  type="checkbox"
                checked={newFeeHeadAutoGenerate}
                onChange={(e) => setNewFeeHeadAutoGenerate(e.target.checked)}
                  style={{ margin: 0 }}
              />
                <label style={{ color: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', fontWeight: 500, fontSize: '0.9rem' }}>
                  Auto Generate Invoices
                </label>
              </div>
              <div style={{ marginTop: '1rem', marginBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <label style={{ color: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', fontWeight: 500, fontSize: '0.9rem' }}>
                      Apply to Classes
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedClassesForFeeHead.size === classes.length) {
                          setSelectedClassesForFeeHead(new Set());
                        } else {
                          setSelectedClassesForFeeHead(new Set(classes.map(c => c.id)));
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
                        borderRadius: '6px',
                        padding: '4px 12px',
                        fontSize: '0.75rem',
                        color: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {selectedClassesForFeeHead.size === classes.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div style={{ 
                    maxHeight: '200px', 
                    overflowY: 'auto', 
                    border: `1px solid ${muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`, 
                    borderRadius: '8px',
                    padding: '8px',
                    background: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'
                  }}>
                    {sortClasses(classes).map((c: any) => (
                      <div key={c.id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '6px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onClick={() => {
                        setSelectedClassesForFeeHead(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(c.id)) {
                            newSet.delete(c.id);
                          } else {
                            newSet.add(c.id);
                          }
                          return newSet;
                        });
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedClassesForFeeHead.has(c.id)}
                          onChange={() => {
                            setSelectedClassesForFeeHead(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(c.id)) {
                                newSet.delete(c.id);
                              } else {
                                newSet.add(c.id);
                              }
                              return newSet;
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ margin: 0, cursor: 'pointer' }}
                        />
                        <label style={{ 
                          cursor: 'pointer', 
                          fontSize: '0.9rem',
                          color: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
                          flex: 1
                        }}>
                          {c.name}
                        </label>
                      </div>
                    ))}
                    {classes.length === 0 && (
                      <div style={{ 
                        padding: '1rem', 
                        textAlign: 'center', 
                        color: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                        fontSize: '0.85rem'
                      }}>
                        No classes available
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)', marginTop: '0.5rem' }}>
                    {selectedClassesForFeeHead.size > 0 
                      ? `Selected ${selectedClassesForFeeHead.size} class${selectedClassesForFeeHead.size > 1 ? 'es' : ''}. Fee structures will be created automatically.`
                      : 'No classes selected. Fee head will be created but you can add fee structures manually later.'}
                  </div>
                </div>
          </LeftColumn>
          <RightColumn>
              <div style={{ 
                fontWeight: 600, 
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
              }}>
                <span>Existing Fee Heads</span>
                {feeHeads.length > 0 && (
                  <span style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: 500,
                    color: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'
                  }}>
                    {feeHeads.length} {feeHeads.length === 1 ? 'fee head' : 'fee heads'}
                  </span>
                )}
              </div>
            <FeeHeadsTable>
              <TableHeader>
                <FeeHeadModalName>Name</FeeHeadModalName>
                <FeeHeadAmount>Default Amount</FeeHeadAmount>
                <div style={{ minWidth: '24px' }}></div>
              </TableHeader>
              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                {feeHeads.length === 0 ? (
                  <div style={{ 
                    padding: '2rem 1.5rem', 
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '200px'
                  }}>
                    <div style={{ 
                      fontSize: '2.5rem',
                      marginBottom: '0.5rem',
                      opacity: 0.3
                    }}>📋</div>
                    <div style={{ 
                      color: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)', 
                      fontSize: '0.9rem',
                      fontWeight: 500
                    }}>
                      No fee heads added yet
                    </div>
                    <div style={{ 
                      color: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)', 
                      fontSize: '0.8rem',
                      marginTop: '0.25rem'
                    }}>
                      Create your first fee head to get started
                    </div>
                  </div>
                ) : (
                  feeHeads.map((fh) => (
                    <TableRowWithHover key={fh.id} onClick={() => handleEditFeeHead(fh)}>
                      <FeeHeadNameContainer>
                        <FeeHeadModalName>{fh.name}</FeeHeadModalName>
                        {fh.description && (
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                            marginTop: '2px',
                            lineHeight: '1.3',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {fh.description}
                          </div>
                        )}
                        {fh.autoGenerate && (
                          <AutoGenerateText style={{ marginTop: '4px' }}>Auto Generate</AutoGenerateText>
                        )}
                      </FeeHeadNameContainer>
                      <FeeHeadAmount>
                        {fh.defaultAmount ? `Rs. ${fh.defaultAmount.toFixed(2)}` : '-'}
                      </FeeHeadAmount>
                      <DeleteIconButton
                        onClick={(e) => handleDeleteFeeHeadFromTable(e, fh)}
                        className="delete-icon"
                      >
                        <DeleteIcon style={{ fontSize: '0.9rem' }} />
                      </DeleteIconButton>
                    </TableRowWithHover>
                  ))
                )}
              </div>
            </FeeHeadsTable>
          </RightColumn>
        </StyledDialogContent>
        <FormActions>
            <Button variant="secondary" onClick={handleCloseFeeHeadModal}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateFeeHead} disabled={feeHeadLoading || !newFeeHeadName.trim()}>
            {feeHeadLoading ? (editFeeHead ? 'Updating...' : 'Saving...') : (editFeeHead ? 'Update' : 'Save')}
            </Button>
        </FormActions>
        </DialogPaper>
      </StyledDialog>
      <StyledDialog open={!!deleteFeeHead}>
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
              Delete Fee Head
            </DialogTitle>
            <CloseButton onClick={() => setDeleteFeeHead(null)}>
              <CloseIcon />
            </CloseButton>
          </DialogHeader>
          
          <StyledDialogContent>
            <div style={{ padding: '0', fontSize: '1.05rem', color: '#f87171', fontWeight: 500, marginBottom: '1rem' }}>
              Are you sure you want to delete the fee head "{deleteFeeHead?.name}"? This will also remove all associated fee structures and data.
            </div>
          </StyledDialogContent>
          
        <FormActions>
            <Button variant="secondary" onClick={() => setDeleteFeeHead(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteFeeHead} disabled={deleteLoading}>
            {deleteLoading ? 'Deleting...' : 'Delete'}
            </Button>
        </FormActions>
        </DialogPaper>
      </StyledDialog>

      <PaginationContainer>
        <PaginationInfo>
          Total Classes: {classes.length}
        </PaginationInfo>
        <PaginationControls>
          <Button onClick={handleSaveAll} variant="primary" style={{
            background: muiTheme.palette.mode === 'dark' ? '#444' : '#f3f4f6',
            border: `1.5px solid ${muiTheme.palette.mode === 'dark' ? '#555' : '#e5e7eb'}`,
            color: muiTheme.palette.mode === 'dark' ? '#C0C0C0' : '#444',
            fontWeight: 700,
            fontSize: '0.85rem',
            padding: '6px 12px',
            borderRadius: '8px',
            minWidth: '100px'
          }}>
            {saving ? 'Saving...' : 'Save All'}
          </Button>
        </PaginationControls>
      </PaginationContainer>
    </PageContainer>
  );
};

const FeeStructureManager: React.FC = () => {
  const muiTheme = useTheme();
  const baseTheme = muiTheme.palette.mode === 'dark' ? darkTheme : lightTheme;
  
  // Merge custom theme with MUI theme for styled-components compatibility
  const customTheme = {
    ...baseTheme,
    palette: {
      mode: muiTheme.palette.mode,
      primary: { main: baseTheme.ACCENT },
      error: { main: '#ef4444' },
      success: { main: '#10b981' },
      background: {
        paper: baseTheme.CARD,
        default: baseTheme.BG,
      },
    },
  };
  
  return (
    <ThemeProvider theme={customTheme}>
      <FeeStructureManagerContent theme={customTheme} />
    </ThemeProvider>
  );
};

export default FeeStructureManager; 