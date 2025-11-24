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
  
  @media (max-width: 768px) {
    gap: 12px;
  }
`;

const RightColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
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
  overflow: hidden;
  max-height: 300px;
  overflow-y: auto;
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
`;

const TableRow = styled.div`
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

const FeeHeadName = styled.div`
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
const TableRowWithHover = styled(TableRow)`
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

const FeeStructureManager: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
          // Map to camelCase, cast as any to avoid TS errors
          const camelData = (data as any[]).map(s => ({
            ...s,
            classId: s.class_id,
            feeHeadId: s.fee_head_id,
          }));
          setStructures(camelData);
          // Pre-fill amounts
          const amt: { [key: string]: string } = {};
          camelData.forEach(s => {
            amt[`${s.classId}_${s.feeHeadId}`] = String(s.amount);
          });
          setAmounts(amt);
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

  const handleAmountChange = (classId: number, feeHeadId: number, value: string) => {
    setAmounts(prev => ({ ...prev, [`${classId}_${feeHeadId}`]: value }));
  };

  const handleSaveAll = async () => {
    if (!schoolId || !sessionId) return;
    setSaving(true);
    setError(null);
    try {
      // Prepare bulk upsert
      const payload = [];
      for (const c of classes) {
        for (const fh of feeHeads) {
          const key = `${c.id}_${fh.id}`;
          const amount = amounts[key];
          if (amount && !isNaN(Number(amount))) {
            payload.push({
              classId: c.id,
              feeHeadId: fh.id,
              amount: Number(amount),
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

  // Function to populate default amounts for all classes
  const populateDefaultAmounts = () => {
    const newAmounts = { ...amounts };
    let hasChanges = false;
    
    for (const c of classes) {
      for (const fh of feeHeads) {
        const key = `${c.id}_${fh.id}`;
        const currentAmount = newAmounts[key];
        const defaultAmount = fh.defaultAmount ? String(fh.defaultAmount) : '0';
        
        // Set default amount if:
        // 1. No amount is set, OR
        // 2. Current amount is '0' or empty, OR
        // 3. Current amount is not a valid number
        if (!currentAmount || currentAmount === '0' || currentAmount === '' || isNaN(Number(currentAmount))) {
          newAmounts[key] = defaultAmount;
          hasChanges = true;
        }
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
    setNewFeeHeadFrequency('monthly');
    setNewFeeHeadAutoGenerate(false);
  };

  const handleCloseFeeHeadModal = () => {
    setShowFeeHeadModal(false);
    setNewFeeHeadName('');
    setNewFeeHeadDesc('');
    setNewFeeHeadAmount('');
    setNewFeeHeadFrequency('monthly');
    setNewFeeHeadAutoGenerate(false);
    setEditFeeHead(null);
  };

  const handleEditFeeHead = (fh: FeeHead) => {
    setEditFeeHead(fh);
    setNewFeeHeadName(fh.name);
    setNewFeeHeadDesc(fh.description || '');
    setNewFeeHeadAmount(fh.defaultAmount ? String(fh.defaultAmount) : '');
    setNewFeeHeadFrequency(fh.frequency || 'monthly');
    setNewFeeHeadAutoGenerate(fh.autoGenerate || false);
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

  const handleCreateFeeHead = async () => {
    if (!schoolId || !newFeeHeadName.trim()) return;
    setFeeHeadLoading(true);
    try {
      if (editFeeHead) {
        await feeService.updateFeeHead(editFeeHead.id, schoolId, {
          name: newFeeHeadName.trim(),
          description: newFeeHeadDesc.trim() || null,
          defaultAmount: newFeeHeadAmount ? Number(newFeeHeadAmount) : 0,
          frequency: newFeeHeadFrequency,
          autoGenerate: newFeeHeadAutoGenerate,
        });
        showToast('Fee head updated!', 'success');
      } else {
        await feeService.createFeeHead({
          schoolId,
          name: newFeeHeadName.trim(),
          description: newFeeHeadDesc.trim() || null,
          defaultAmount: newFeeHeadAmount ? Number(newFeeHeadAmount) : 0,
          frequency: newFeeHeadFrequency,
          autoGenerate: newFeeHeadAutoGenerate,
        }, user?.id);
        showToast('Fee head added!', 'success');
      }
      const heads = await feeService.getFeeHeads(schoolId);
      setFeeHeads(heads);
      
      // Immediately populate default amounts for the new/updated fee head
      setTimeout(() => {
        populateDefaultAmounts();
      }, 50);
      
      // Don't close modal on save - removed handleCloseFeeHeadModal() call
      // Reset form for new entry if not editing
      if (!editFeeHead) {
        setNewFeeHeadName('');
        setNewFeeHeadDesc('');
        setNewFeeHeadAmount('');
        setNewFeeHeadFrequency('monthly');
        setNewFeeHeadAutoGenerate(false);
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
    <ThemeProvider theme={theme}>
    <PageContainer>
        <Header>
          <HeaderRow>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Title>
                Fee Structure Manager <span style={{fontWeight:400, fontSize:'1rem', color: theme.palette.mode === 'dark' ? '#b0b8d1' : '#4a4a4a'}}>({classes.length} classes)</span>
              </Title>
              {/* Mobile Add Button - Icon Only */}
              <button
                onClick={() => handleOpenFeeHeadModal()}
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
                title="Add Fee Head"
              >
                <AddIcon style={{ fontSize: 18 }} />
              </button>
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
                    {window.innerWidth <= 900 ? 'Add' : 'Add Fee Head'}
                  </span>
                </SegmentedButton>
              </SegmentedGroup>
            </HeaderFilters>
          </HeaderRow>
        </Header>
        <MainContent>
          <ClassesGrid cardCount={classes.length}>
            {sortClasses(classes).map((c: any) => (
              <ClassCard key={c.id}>
                <ClassHeader>
                  <ClassTitle>{c.name}</ClassTitle>
                </ClassHeader>
                {feeHeads.length === 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2rem 1rem',
                      textAlign: 'center',
                      minHeight: 120
                    }}
                  >
                    <AttachMoney 
                      style={{ 
                        fontSize: 48, 
                        color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                        marginBottom: '1rem'
                      }} 
                    />
                    <div
                      style={{
                        color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                        fontWeight: 500,
                        fontSize: '0.95rem',
                        marginBottom: '0.5rem'
                      }}
                    >
                      No fee head added
                    </div>
                    <div
                      style={{
                        color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                        fontSize: '0.8rem'
                      }}
                    >
                      Add fee heads to set up fee structure
                    </div>
                  </div>
                ) : (
                  feeHeads.map((fh, idx) => (
                    <FeeBlock key={fh.id} style={{ marginLeft: '1rem', marginRight: '1rem', ...(idx === 0 ? { marginTop: '1rem' } : {}), ...(idx === feeHeads.length - 1 ? { marginBottom: '1rem' } : {}) }}>
                      <FeeIcon>
                        {fh.name.toLowerCase().includes('admission') ? <School fontSize="small" /> :
                         fh.name.toLowerCase().includes('transport') ? <Commute fontSize="small" /> :
                         <AttachMoney fontSize="small" />}
                      </FeeIcon>
                      <FeeDetails>
                        <FeeLabel>{fh.name}</FeeLabel>
                        {fh.description && <FeeDesc>{fh.description}</FeeDesc>}
                      </FeeDetails>
                      <PillInput
                        type="number"
                        value={amounts[`${c.id}_${fh.id}`] ?? '0'}
                        onChange={e => handleAmountChange(c.id, fh.id, e.target.value)}
                        min={0}
                      />
                    </FeeBlock>
                  ))
                )}
              </ClassCard>
            ))}
          </ClassesGrid>
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
                <label style={{ display: 'block', marginBottom: '0.1rem', color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', fontWeight: 500, fontSize: '0.9rem' }}>
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
                <label style={{ display: 'block', marginBottom: '0.1rem', color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', fontWeight: 500, fontSize: '0.9rem' }}>
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
                <label style={{ display: 'block', marginBottom: '0.1rem', color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', fontWeight: 500, fontSize: '0.9rem' }}>
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
                <div style={{ fontSize: '0.8rem', color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)', marginTop: '0.1rem' }}>
                  Default amount for this fee head
                </div>
              </div>
              <div style={{ marginBottom: '0.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.1rem', color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', fontWeight: 500, fontSize: '0.9rem' }}>
                  Frequency
                </label>
              <Select
                value={newFeeHeadFrequency}
                onChange={(e) => setNewFeeHeadFrequency(e.target.value)}
              >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                  <option value="one-time">One Time</option>
              </Select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.1rem' }}>
                <input
                  type="checkbox"
                checked={newFeeHeadAutoGenerate}
                onChange={(e) => setNewFeeHeadAutoGenerate(e.target.checked)}
                  style={{ margin: 0 }}
              />
                <label style={{ color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', fontWeight: 500, fontSize: '0.9rem' }}>
                  Auto Generate Invoices
                </label>
              </div>
          </LeftColumn>
          <RightColumn>
              <div style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1.1rem' }}>
              Existing Fee Heads
              </div>
            <FeeHeadsTable>
              <TableHeader>
                <FeeHeadName>Name</FeeHeadName>
                <FeeHeadAmount>Default</FeeHeadAmount>
                <FeeHeadFrequency>Frequency</FeeHeadFrequency>
              </TableHeader>
              {feeHeads.slice(0, 5).map((fh) => (
                <TableRowWithHover key={fh.id} onClick={() => handleEditFeeHead(fh)}>
                  <FeeHeadNameContainer>
                    <FeeHeadName>{fh.name}</FeeHeadName>
                    {fh.autoGenerate && (
                      <AutoGenerateText>Auto Generate</AutoGenerateText>
                    )}
                  </FeeHeadNameContainer>
                  <FeeHeadAmount>
                    {fh.defaultAmount ? `Rs. ${fh.defaultAmount.toFixed(2)}` : '-'}
                  </FeeHeadAmount>
                  <FeeHeadFrequency>
                    {fh.frequency === 'monthly' ? 'Monthly' :
                     fh.frequency === 'quarterly' ? 'Quarterly' :
                     fh.frequency === 'annually' ? 'Annually' :
                     fh.frequency === 'one-time' ? 'One Time' : 'Monthly'}
                  </FeeHeadFrequency>
                  <DeleteIconButton
                    onClick={(e) => handleDeleteFeeHeadFromTable(e, fh)}
                    className="delete-icon"
                  >
                      <DeleteIcon style={{ fontSize: '0.9rem' }} />
                  </DeleteIconButton>
                </TableRowWithHover>
              ))}
              {feeHeads.length === 0 && (
                  <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)', fontSize: '0.9rem' }}>
                    No fee heads added yet
                    </div>
                  </div>
              )}
            </FeeHeadsTable>
            {feeHeads.length > 5 && (
                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)', marginTop: '0.5rem' }}>
                Showing 5 of {feeHeads.length} fee heads
                </div>
            )}
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
            background: theme.palette.mode === 'dark' ? '#444' : '#f3f4f6',
            border: `1.5px solid ${theme.palette.mode === 'dark' ? '#555' : '#e5e7eb'}`,
            color: theme.palette.mode === 'dark' ? '#C0C0C0' : '#444',
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
    </ThemeProvider>
  );
};

export default FeeStructureManager; 