import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styled, { ThemeProvider, keyframes, createGlobalStyle, css } from 'styled-components';
import { Add as AddIcon, Refresh as RefreshIcon, Close as CloseIcon, Save as SaveIcon, Delete as DeleteIcon, PersonAdd as PersonAddIcon, CloudUpload as CloudUploadIcon, Description as DescriptionIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import { ThemeContext, darkTheme, lightTheme, useProgress } from './Layout';
import { sortClasses } from '../utils/classUtils';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import { usePageFooter } from './Layout/contexts/PageFooterContext';
import { Box, Grid } from '@mui/material';
import * as XLSX from 'xlsx';
import Loader from './Loader';
import NoSessionsFound from './NoSessionsFound';
import NoClassesFound from './NoClassesFound';
import {
  clayPanelStyle,
  clayCardStyle,
  clayInputStyle,
  clayButtonStyle,
  neumorphSelectFieldStyle,
  minimalSelectMenuStyle,
  CARD_RADIUS_LG,
  CARD_RADIUS_MD,
  getLayoutPalette,
  getDashboardPalette,
} from '../styles/DesignSystem';

// --- Styled Components (matching MarkAttendance.tsx) ---
const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 12px 8px 12px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  ${clayPanelStyle}
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 6px 0 6px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  border-radius: ${CARD_RADIUS_LG};
  padding: 8px 10px;
  min-height: 44px;
`;

const MainContent = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 8px;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: y proximity;
  will-change: scroll-position;
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
  @media (max-width: 700px) {
    scroll-behavior: auto;
    -webkit-overflow-scrolling: touch;
  }
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



const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 140px;
  flex: 1 1 180px;
  @media (max-width: 700px) {
    width: 100%;
    min-width: 0;
    flex: none;
    &.search-group {
      margin-top: 0.7rem;
      order: 2;
    }
    &:not(.search-group) {
      order: 1;
    }
  }
`;

const Label = styled.label`
  font-size: 0.97rem;
  color: ${({ theme }: { theme: any }) => theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const Input = styled.input`
  ${clayInputStyle}
  width: 100%;
  min-height: 42px;
  padding: 0.62rem 0.9rem;
  font-size: 1rem;
  @media (max-width: 700px) {
    width: 100%;
    min-height: 40px;
    font-size: 0.92rem;
  }
`;

const Select = styled.select`
  ${neumorphSelectFieldStyle}
  width: 100%;
  min-height: 42px;
  padding: 0.62rem 2.2rem 0.62rem 0.9rem;
  font-size: 1rem;
  @media (max-width: 700px) {
    min-height: 40px;
    font-size: 0.92rem;
  }
`;

const StudentsListContainer = styled.div`
  ${clayCardStyle}
  padding: 14px;
  margin-top: 10px;
`;

const StudentRow = styled.div<{ $focused?: boolean }>`
  ${clayCardStyle}
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px;
  border: 1.5px solid ${({ theme, $focused }) => $focused ? `${theme.ACCENT}88` : 'transparent'};
  border-radius: ${CARD_RADIUS_LG};
  margin-bottom: 8px;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => `${theme.ACCENT}66`};
  }

  @media (max-width: 700px) {
    gap: 8px;
    padding: 10px;
  }
`;

const StudentRowHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const StudentRowMain = styled.div`
  display: grid;
  grid-template-columns: 52px minmax(160px, 1.2fr) minmax(160px, 1.2fr) minmax(140px, 1fr) minmax(140px, 1fr) minmax(140px, 1fr) minmax(120px, 0.8fr) minmax(150px, 1fr) auto;
  gap: 10px 12px;
  align-items: start;

  @media (max-width: 1400px) {
    grid-template-columns: 52px repeat(4, minmax(140px, 1fr)) auto;
  }

  @media (max-width: 900px) {
    grid-template-columns: 52px 1fr 1fr auto;
  }

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const StudentRowMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const SerialNumber = styled.div`
  ${clayCardStyle}
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: ${({ theme }) => `${theme.ACCENT}18`};
  color: ${({ theme }) => theme.ACCENT};
  font-weight: 700;
  font-size: 0.9rem;
  border: 1.5px solid ${({ theme }) => `${theme.ACCENT}33`};
  flex-shrink: 0;
`;

const RemoveButton = styled.button`
  ${clayButtonStyle}
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #fff;
  border: 1px solid transparent;
  border-radius: ${CARD_RADIUS_MD};
  padding: 0.5rem 0.82rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  font-weight: 600;
`;

const InsertButton = styled.button`
  ${clayButtonStyle}
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: #fff;
  border: 1px solid transparent;
  border-radius: ${CARD_RADIUS_MD};
  padding: 0.5rem 0.82rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  font-weight: 600;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  
  @media (max-width: 700px) {
    width: 100%;
    justify-content: flex-end;
  }
`;

const AddStudentButton = styled.button`
  background: ${({ theme }) => theme.ACCENT};
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s ease;
  margin-top: 0;

  &:hover {
    background: ${({ theme }) => theme.ACCENT}ee;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${({ theme }) => `${theme.ACCENT}33`};
  }
`;

const UploadCsvButton = styled.button`
  ${clayButtonStyle}
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: ${CARD_RADIUS_MD};
  padding: 0.65rem 0.95rem;
  font-size: 0.88rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).surfaceBorder};
  cursor: pointer;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.56);
  z-index: 12000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.3rem;
  letter-spacing: 1px;
  backdrop-filter: blur(6px);
`;

const LoadingSpinner = styled.div`
  border: 6px solid #e0e7ff;
  border-top: 6px solid #4a6cf7;
  border-radius: 50%;
  width: 64px;
  height: 64px;
  animation: spin 1.1s linear infinite;
  margin-bottom: 28px;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ToastContainer = styled.div`
  position: fixed;
  top: 32px;
  right: 32px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

const ToastMsg = styled.div<{type: 'error' | 'success' | 'warning', themeMode: 'dark' | 'light'}>`
  min-width: 220px;
  background: ${({type, themeMode}) => 
    type === 'error' ? (themeMode === 'dark' ? '#ff3b3b' : '#ff5252') :
    type === 'warning' ? (themeMode === 'dark' ? '#ff9800' : '#ff9800') :
    (themeMode === 'dark' ? '#4caf50' : '#43a047')
  };
  color: #fff;
  padding: 14px 32px;
  border-radius: 12px;
  font-size: 1.08rem;
  font-weight: 600;
  margin-bottom: 10px;
  box-shadow: 0 4px 24px 0 #0007;
  opacity: 0.97;
  animation: ${keyframes`
    0% { transform: translateY(-30px) scale(0.95); opacity: 0; }
    60% { transform: translateY(4px) scale(1.03); opacity: 1; }
    100% { transform: translateY(0) scale(1); opacity: 0.97; }
  `} 0.5s;
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.ACCENT};
`;

const ListHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 4px 2px 10px;
  background: ${({ theme }) => getDashboardPalette(theme).cardBg};
  border-bottom: 1px solid ${({ theme }) => getDashboardPalette(theme).divider};
`;

const ListTitle = styled.h4`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const ImportSummary = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 0.84rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  flex-wrap: wrap;
`;

const InstructionsCard = styled.div`
  ${clayCardStyle}
  padding: 16px 18px;
  margin-top: 10px;
  border: 1px solid ${({ theme }) => `${theme.ACCENT}22`};
`;

const InstructionsTitle = styled.h3`
  margin: 0 0 10px 0;
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const InstructionsText = styled.p`
  margin: 0 0 8px 0;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.9rem;
  line-height: 1.5;
`;

const InstructionList = styled.ul`
  margin: 0;
  padding-left: 18px;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.88rem;
  line-height: 1.55;
`;

const RowSections = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const ExpandButton = styled.button`
  ${clayButtonStyle}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: ${CARD_RADIUS_MD};
  padding: 0.5rem 0.75rem;
  min-height: 42px;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).surfaceBorder};
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 700;
`;

const CollapsedDrawer = styled.div`
  border-top: 1px solid ${({ theme }) => `${theme.ACCENT}22`};
  padding-top: 12px;
`;

const RowSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const RowSectionTitle = styled.div`
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: ${({ theme }) => theme.ACCENT};
  text-transform: uppercase;
`;

const RowFieldsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px 12px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const RowField = styled.div<{ $spanAll?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  ${({ $spanAll }) => $spanAll ? 'grid-column: 1 / -1;' : ''}
`;

const FieldCaption = styled.label`
  font-size: 0.78rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const FieldHint = styled.div<{ $error?: boolean }>`
  min-height: 16px;
  font-size: 0.75rem;
  color: ${({ theme, $error }) => $error ? '#dc2626' : theme.TEXT_SECONDARY};
`;

const GlobalStyle = createGlobalStyle<{
  fieldBg: string;
  textColor: string;
}>`
  input:-webkit-autofill,
  input:-webkit-autofill:focus,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:active,
  textarea:-webkit-autofill,
  textarea:-webkit-autofill:focus,
  textarea:-webkit-autofill:hover,
  textarea:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 1000px ${props => props.fieldBg} inset !important;
    box-shadow: 0 0 0 1000px ${props => props.fieldBg} inset !important;
    -webkit-text-fill-color: ${props => props.textColor} !important;
    color: ${props => props.textColor} !important;
    caret-color: ${props => props.textColor} !important;
    transition: background-color 5000s ease-in-out 0s;
  }
`;

// --- Skeleton Loading Components ---
const skeletonShimmer = keyframes`
  0% { 
    transform: translateX(-100%);
  }
  100% { 
    transform: translateX(100%);
  }
`;

const isDarkSkeleton = (theme: any) => theme.BG === '#252525' || theme.BG === '#181c2a';

const SkeletonBase = styled.div`
  position: relative;
  overflow: hidden;
  background: ${({ theme }) => isDarkSkeleton(theme) ? '#2a2a2a' : '#f5f5f5'};
  border-radius: 8px;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent,
      ${({ theme }) => isDarkSkeleton(theme) ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'},
      transparent
    );
    animation: ${skeletonShimmer} 2.5s ease-in-out infinite;
  }
`;

const SkeletonHeaderTitle = styled(SkeletonBase)`
  width: 180px;
  height: 22px;
  border-radius: 6px;
  background: ${({ theme }) => isDarkSkeleton(theme) ? '#333333' : '#e8e8e8'};
`;

const SkeletonSegmentedSelect = styled(SkeletonBase)`
  height: 32px;
  width: 140px;
  border-radius: 11px;
  background: ${({ theme }) => isDarkSkeleton(theme) ? '#333333' : '#e8e8e8'};
  margin-right: 1px;
  
  &:first-child {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
  
  &:last-child {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
`;

const SkeletonListHeaderTitle = styled(SkeletonBase)`
  width: 120px;
  height: 20px;
  border-radius: 6px;
  background: ${({ theme }) => isDarkSkeleton(theme) ? '#333333' : '#e8e8e8'};
`;

const SkeletonStudentRow = styled.div`
  display: grid;
  grid-template-columns: 60px 1fr 1fr 1fr auto auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  background: ${({ theme }) => theme.CARD};
  border: ${({ theme }) => isDarkSkeleton(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  border-radius: 8px;
  margin-bottom: 8px;
  box-shadow: ${({ theme }) => isDarkSkeleton(theme)
    ? '0 2px 8px rgba(0, 0, 0, 0.2)'
    : '0 2px 8px rgba(0, 0, 0, 0.08)'};
  
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
`;

const SkeletonSerialNumber = styled(SkeletonBase)`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => isDarkSkeleton(theme) ? '#333333' : '#e8e8e8'};
  flex-shrink: 0;
`;

const SkeletonInput = styled(SkeletonBase)`
  width: 100%;
  height: 40px;
  border-radius: 8px;
  background: ${({ theme }) => isDarkSkeleton(theme) ? '#333333' : '#e8e8e8'};
`;

const SkeletonSelect = styled(SkeletonBase)`
  width: 100%;
  height: 40px;
  border-radius: 8px;
  background: ${({ theme }) => isDarkSkeleton(theme) ? '#333333' : '#e8e8e8'};
`;

const SkeletonButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  
  @media (max-width: 700px) {
    width: 100%;
    justify-content: flex-end;
  }
`;

const SkeletonButton = styled(SkeletonBase)`
  width: 80px;
  height: 36px;
  border-radius: 6px;
  background: ${({ theme }) => isDarkSkeleton(theme) ? '#333333' : '#e8e8e8'};
`;

const SkeletonFooter = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: ${({ theme }) => theme.CARD};
  border-top: ${({ theme }) => isDarkSkeleton(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDarkSkeleton(theme)
    ? '0 -1px 6px rgba(0, 0, 0, 0.2)'
    : '0 -1px 6px rgba(0, 0, 0, 0.08)'};
  min-height: 36px;
  
  @media (max-width: 700px) {
    padding: 0.4rem 0.75rem;
    gap: 0.5rem;
    min-height: 32px;
  }
`;

const SkeletonFooterText = styled(SkeletonBase)`
  height: 18px;
  width: 140px;
  border-radius: 6px;
  background: ${({ theme }) => isDarkSkeleton(theme) ? '#333333' : '#e8e8e8'};
  
  @media (max-width: 700px) {
    display: none;
  }
`;

const SkeletonFooterSegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.BG === '#252525' ? '#222' : '#f3f4f6'};
  border-radius: 11px;
  box-shadow: 1.4px 1.4px 4px #2222;
  overflow: hidden;
`;

const SkeletonFooterButton = styled(SkeletonBase)`
  height: 32px;
  width: 100px;
  border-radius: 0;
  background: ${({ theme }) => isDarkSkeleton(theme) ? '#333333' : '#e8e8e8'};
  margin-right: 1px;
  
  &:first-child {
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  }
  
  &:last-child {
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
    margin-right: 0;
    width: 160px;
  }
`;


// --- Segmented Group Styles (matching MarkAttendance.tsx) ---
const SEGMENTED_HEIGHT = '32px';
const SegmentedGroup = styled.div`
  ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    return css`
  display: flex;
  align-items: center;
  background: ${layout.surfaceBg};
  border: 1px solid ${layout.surfaceBorder};
  border-radius: ${CARD_RADIUS_LG};
  box-shadow: ${layout.surfaceShadow};
  overflow: hidden;
    `;
  }}
  @media (max-width: 700px) {
    width: 100%;
    justify-content: center;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    border-radius: 11px;
  }
`;

const SegmentedBase = css`
  font-family: inherit;
  font-size: 0.77em;
  font-weight: 400;
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  border: none;
  outline: none;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
  appearance: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const SegmentedSelect = styled.select<{ first?: boolean; last?: boolean }>`
  ${SegmentedBase}
  ${minimalSelectMenuStyle}
  padding: 0 2.2em 0 0.84em;
  border-right: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
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
    border-left: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  }
  appearance: none;
  -webkit-appearance: none;
  background-image: ${({ theme }) => {
    const color = encodeURIComponent(getDashboardPalette(theme).subtleText);
    return `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='${color}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;
  }};
  background-repeat: no-repeat;
  background-position: right 0.8em center;
  background-size: 1em 1em;
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
  background: ${({ active, theme }) => active ? theme.ACCENT : 'transparent'};
  color: ${({ active, theme }) => active ? '#fff' : theme.TEXT_PRIMARY};
  border: 1px solid ${({ active, theme }) => active ? theme.ACCENT : 'transparent'};
  font-weight: ${({ active }) => active ? 700 : 400};
  &:hover, &:focus {
    background: ${({ active, theme }) => active ? theme.ACCENT : getLayoutPalette(theme).navHoverBg};
    opacity: 1;
  }
  & svg {
    font-size: 15px;
    vertical-align: middle;
    display: inline-block;
  }
  @media (max-width: 700px) {
    width: 100%;
    min-width: 0;
    border-radius: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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

interface StudentData {
  id: string;
  name: string;
  fatherName: string;
  gender: string;
  classId?: string;
  className?: string;
  sectionId?: string;
  sectionName?: string;
  admissionDate?: string;
  phone?: string;
  notificationChannel?: string;
  dob?: string;
  studentId?: string;
  cast?: string;
  orphan?: string;
  osc?: string;
  idMark?: string;
  bloodGroup?: string;
  previousSchool?: string;
  previousId?: string;
  religion?: string;
  nationality?: string;
  disease?: string;
  additionalNote?: string;
  totalSiblings?: string;
  address?: string;
  fatherNationalId?: string;
  fatherEducation?: string;
  fatherMobile?: string;
  fatherOccupation?: string;
  fatherIncome?: string;
  motherName?: string;
  motherNationalId?: string;
  motherEducation?: string;
  motherMobile?: string;
  motherOccupation?: string;
  motherIncome?: string;
  familyId?: string;
  familyName?: string;
}

interface SchoolSection {
  id: string;
  name: string;
  class_id: number | string;
}

const padDatePart = (value: number) => String(value).padStart(2, '0');

const formatDateDisplay = (date: Date) =>
  `${padDatePart(date.getDate())}-${padDatePart(date.getMonth() + 1)}-${date.getFullYear()}`;

const formatDateIso = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

const getTodayDisplay = () => formatDateDisplay(new Date());

const isValidDate = (date: Date) => !Number.isNaN(date.getTime());

const parseFlexibleDate = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value instanceof Date && isValidDate(value)) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const parsed = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return isValidDate(parsed) ? parsed : null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  if (/^\d+(\.\d+)?$/.test(raw)) {
    const numericValue = Number(raw);
    if (Number.isFinite(numericValue)) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const parsed = new Date(excelEpoch.getTime() + numericValue * 24 * 60 * 60 * 1000);
      return isValidDate(parsed) ? parsed : null;
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    return isValidDate(parsed) ? parsed : null;
  }

  const normalized = raw.replace(/[/.]/g, '-');
  const parts = normalized.split('-').map(part => part.trim()).filter(Boolean);

  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const [year, month, day] = parts.map(Number);
      const parsed = new Date(year, month - 1, day);
      return isValidDate(parsed) ? parsed : null;
    }

    const [first, second, third] = parts.map(Number);
    if (third > 999) {
      const parsed = new Date(third, second - 1, first);
      return isValidDate(parsed) ? parsed : null;
    }
  }

  const nativeParsed = new Date(raw);
  return isValidDate(nativeParsed) ? nativeParsed : null;
};

const normalizeDateForDisplay = (value: unknown, fallback: string = getTodayDisplay()) => {
  const parsed = parseFlexibleDate(value);
  return parsed ? formatDateDisplay(parsed) : fallback;
};

const normalizeDateForBackend = (value: unknown, fallback?: string) => {
  const parsed = parseFlexibleDate(value);
  if (parsed) {
    return formatDateIso(parsed);
  }
  return fallback || formatDateIso(new Date());
};

const normalizeHeader = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const normalizeCompare = (value: unknown) => normalizeHeader(value);

const stringValue = (value: unknown) => String(value ?? '').trim();

const nullableValue = (value: unknown) => {
  const normalized = stringValue(value);
  return normalized ? normalized : null;
};

const createStudent = (overrides: Partial<StudentData> = {}): StudentData => ({
  id: overrides.id || `temp-${Date.now()}-${Math.random()}`,
  name: '',
  fatherName: '',
  gender: 'Male',
  admissionDate: getTodayDisplay(),
  notificationChannel: 'whatsapp',
  dob: '01-01-2000',
  religion: 'Muslim',
  nationality: 'Pakistani',
  ...overrides,
});

const createDefaultStudents = (count: number): StudentData[] =>
  Array.from({ length: count }, (_, index) =>
    createStudent({
      id: `default-${Date.now()}-${index + 1}`,
    })
  );

const getRowValue = (row: Record<string, unknown>, aliases: string[]): string => {
  for (const alias of aliases) {
    const match = Object.keys(row).find(key => normalizeHeader(key) === alias);
    if (match) {
      const value = stringValue(row[match]);
      if (value) {
        return value;
      }
    }
  }
  return '';
};

const normalizeGender = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'f' || normalized === 'female') return 'Female';
  if (normalized === 'o' || normalized === 'other') return 'Other';
  return 'Male';
};

const normalizeNotificationChannel = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return normalized === 'sms' ? 'sms' : 'whatsapp';
};

const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const RELIGIONS = ['Muslim', 'Christian', 'Hindu', 'Sikh', 'Other'];
const NATIONALITIES = ['Pakistani', 'Afghan', 'Indian', 'Bangladeshi', 'Other'];

const BulkStudentAdmission: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const { user } = useAuth();
  const { setLoading, loading } = useLoading();
  const { startProgress, completeProgress, setProgress } = useProgress();
  const { setFooterContent } = usePageFooter();
  const navigate = useNavigate();
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 700);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const [students, setStudents] = useState<StudentData[]>([]);
  const [classes, setClasses] = useState<{id: string, name: string, has_sections?: boolean}[]>([]);
  const [allSections, setAllSections] = useState<SchoolSection[]>([]);
  const [families, setFamilies] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Array<{msg: string, type: 'error' | 'success' | 'warning', id: number}>>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [hasClasses, setHasClasses] = useState(true);
  const [focusedStudentId, setFocusedStudentId] = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(new Set());
  const lastRowRef = useRef<HTMLDivElement>(null);
  const studentsRef = useRef<StudentData[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  const toastId = useRef(0);
  
  // Keep ref in sync with state
  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  const showToast = useCallback((msg: string, type: 'error' | 'success' | 'warning' = 'success') => {
    const id = toastId.current++;
    setToasts(prev => [...prev, {msg, type, id}]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2200);
  }, []);

  // Initialize with 10 default student rows
  useEffect(() => {
    if (students.length === 0) {
      setStudents(createDefaultStudents(10));
    }
  }, []);

  // Check for active session and classes on mount
  useEffect(() => {
    const checkPrerequisites = async () => {
      if (!user?.school_id) {
        showToast('User school information not found', 'error');
        return;
      }

      setLoading(true);
      startProgress(false);
      setProgress(10);

      try {
        // Check for active session for this school
        setProgress(20);
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select('id, name')
          .eq('is_active', true)
          .eq('school_id', user.school_id)
          .single();

        if (sessionError || !session) {
          setActiveSession(null);
        } else {
          setActiveSession(session);
        }

        // Check for classes for this school
        setProgress(40);
        const { data: classes, error: classesError } = await supabase
          .from('classes')
          .select('id')
          .eq('school_id', user.school_id)
          .limit(1);

        setHasClasses(!classesError && classes && classes.length > 0);

        setProgress(100);
      } catch (error) {
      } finally {
        setLoading(false);
        completeProgress();
      }
    };

    checkPrerequisites();
  }, [user?.school_id, setLoading, startProgress, setProgress, completeProgress]);

  // Fetch classes on mount
  useEffect(() => {
    if (!user?.school_id) return;

    setLoadingClasses(true);
    supabase
      .from('classes')
      .select('id, name, has_sections')
      .eq('school_id', user.school_id)
      .then(({ data, error }) => {
        setLoadingClasses(false);
        if (error) {
          return;
        }
        const sortedClasses = sortClasses(data || []);
        setClasses(sortedClasses);
      });
  }, [user?.school_id]);

  useEffect(() => {
    if (!user?.school_id) return;

    supabase
      .from('sections')
      .select('id, name, class_id')
      .eq('school_id', user.school_id)
      .then(({ data, error }) => {
        if (!error) {
          setAllSections(data || []);
        }
      });
  }, [user?.school_id]);

  useEffect(() => {
    if (!user?.school_id) return;

    supabase
      .from('families')
      .select('id, name')
      .eq('school_id', user.school_id)
      .order('name')
      .then(({ data, error }) => {
        if (!error) {
          setFamilies((data || []).map((family: any) => ({
            id: String(family.id),
            name: family.name,
          })));
        }
      });
  }, [user?.school_id]);

  const addStudent = () => {
    const newStudent = createStudent({ id: Date.now().toString() });
    setStudents([...students, newStudent]);
  };

  const insertStudent = (afterIndex: number) => {
    const newStudent = createStudent({ id: Date.now().toString() });
    
    const newStudents = [...students];
    newStudents.splice(afterIndex + 1, 0, newStudent);
    setStudents(newStudents);
    setFocusedStudentId(newStudent.id);
    
    // Focus the name field of the newly inserted student after a short delay
    setTimeout(() => {
      const nameInput = document.querySelector(`input[data-student-id="${newStudent.id}"][data-field="name"]`) as HTMLInputElement;
      if (nameInput) {
        nameInput.focus();
      }
    }, 50);
  };

  const removeStudent = (id: string) => {
    setStudents(students.filter(student => student.id !== id));
    setExpandedStudentIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const updateStudent = (id: string, field: keyof StudentData, value: string) => {
    setStudents(students.map(student => 
      student.id === id
        ? {
            ...student,
            [field]: value,
            ...(field === 'classId' ? { sectionId: '', sectionName: '' } : {})
          }
        : student
    ));
  };

  const toggleStudentExpanded = useCallback((id: string) => {
    setExpandedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const getSectionsForClass = useCallback((classId?: string) => {
    if (!classId) return [];
    return allSections.filter(section => String(section.class_id) === String(classId));
  }, [allSections]);

  const classHasSections = useCallback((classId?: string) => {
    if (!classId) return true;
    const selectedClass = classes.find(cls => String(cls.id) === String(classId));
    return selectedClass?.has_sections ?? true;
  }, [classes]);

  const findFamilyMatch = useCallback((value?: string) => {
    if (!value) return null;
    const trimmedValue = value.trim();
    if (!trimmedValue) return null;

    return families.find(family =>
      String(family.id) === trimmedValue || normalizeCompare(family.name) === normalizeCompare(trimmedValue)
    ) || null;
  }, [families]);

  const generateNextStudentId = useCallback(async (): Promise<number> => {
    if (!user?.school_id) {
      throw new Error('School ID not found');
    }

    const { data: existingStudents, error } = await supabase
      .from('students')
      .select('id')
      .eq('school_id', user.school_id)
      .order('id', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error('Failed to generate student ID: ' + error.message);
    }

    return existingStudents && existingStudents.length > 0 ? existingStudents[0].id + 1 : 1;
  }, [user?.school_id]);

  const insertStudentWithRetry = useCallback(async (studentData: any, maxRetries: number = 5): Promise<any> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const freshStudentId = await generateNextStudentId();
      studentData.id = freshStudentId;

      const { data: newStudent, error: insertError } = await supabase
        .from('students')
        .insert([studentData])
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505' && attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
          continue;
        }
        throw insertError;
      }

      return newStudent;
    }
    throw new Error('Failed to insert student after retries.');
  }, [generateNextStudentId]);

  const findClassMatch = useCallback((value?: string) => {
    if (!value) return null;
    const trimmedValue = value.trim();
    if (!trimmedValue) return null;

    return classes.find(cls =>
      String(cls.id) === trimmedValue || normalizeCompare(cls.name) === normalizeCompare(trimmedValue)
    ) || null;
  }, [classes]);

  const findSectionMatch = useCallback((classId: number, value?: string) => {
    if (!value) return null;
    const trimmedValue = value.trim();
    if (!trimmedValue) return null;

    return allSections.find(section =>
      String(section.class_id) === String(classId) &&
      (String(section.id) === trimmedValue || normalizeCompare(section.name) === normalizeCompare(trimmedValue))
    ) || null;
  }, [allSections]);

  const resolvePlacement = useCallback((student: StudentData) => {
    const classSource = student.classId || student.className;
    const classMatch = findClassMatch(classSource);

    if (!classMatch) {
      return {
        error: `Class could not be resolved for ${student.name || 'a student'}. Use class_id or class name.`,
      };
    }

    const classId = Number(classMatch.id);
    const classHasSections = classMatch.has_sections ?? true;

    if (!classHasSections) {
      return {
        classId,
        sectionId: null as number | null,
        className: classMatch.name,
      };
    }

    const sectionSource = student.sectionId || student.sectionName;
    const sectionMatch = findSectionMatch(classId, sectionSource);

    if (!sectionMatch) {
      return {
        error: `Section could not be resolved for ${student.name || 'a student'} in ${classMatch.name}.`,
      };
    }

    return {
      classId,
      sectionId: Number(sectionMatch.id),
      className: classMatch.name,
      sectionName: sectionMatch.name,
    };
  }, [findClassMatch, findSectionMatch]);

  const handleCsvFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        showToast('The selected CSV file is empty.', 'error');
        return;
      }

      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true });

      if (!rows.length) {
        showToast('No student rows were found in the selected CSV.', 'error');
        return;
      }

      const timestamp = Date.now();
      const importedStudents = rows.map((row, index) => {
        const rawClass = getRowValue(row, ['classid', 'class', 'classcode', 'classname', 'classlabel']);
        const classMatch = findClassMatch(rawClass);
        const rawSection = getRowValue(row, ['sectionid', 'section', 'sectioncode', 'sectionname', 'sectionlabel']);
        const sectionMatch = classMatch ? findSectionMatch(Number(classMatch.id), rawSection) : null;
        const rawFamily = getRowValue(row, ['familyid', 'family', 'familyname']);
        const familyMatch = findFamilyMatch(rawFamily);

        return createStudent({
          id: `csv-${timestamp}-${index}`,
          name: getRowValue(row, ['name', 'studentname', 'student']),
          fatherName: getRowValue(row, ['fathername', 'father', 'parentname']),
          gender: normalizeGender(getRowValue(row, ['gender', 'sex']) || 'Male'),
          classId: classMatch ? String(classMatch.id) : '',
          className: rawClass,
          sectionId: sectionMatch ? String(sectionMatch.id) : '',
          sectionName: rawSection,
          admissionDate: normalizeDateForDisplay(getRowValue(row, ['admissiondate', 'dateofadmission']), getTodayDisplay()),
          phone: getRowValue(row, ['phone', 'studentphone']),
          notificationChannel: normalizeNotificationChannel(getRowValue(row, ['notificationchannel', 'channel']) || 'whatsapp'),
          dob: normalizeDateForDisplay(getRowValue(row, ['dob', 'dateofbirth']), '01-01-2000'),
          studentId: getRowValue(row, ['studentid', 'formb', 'bform', 'registrationno']),
          cast: getRowValue(row, ['cast', 'caste']),
          orphan: getRowValue(row, ['orphan']),
          osc: getRowValue(row, ['osc']),
          idMark: getRowValue(row, ['idmark', 'identificationmark']),
          bloodGroup: getRowValue(row, ['bloodgroup']),
          previousSchool: getRowValue(row, ['previousschool']),
          previousId: getRowValue(row, ['previousid']),
          religion: getRowValue(row, ['religion']) || 'Muslim',
          nationality: getRowValue(row, ['nationality']) || 'Pakistani',
          disease: getRowValue(row, ['disease']),
          additionalNote: getRowValue(row, ['additionalnote', 'note', 'notes']),
          totalSiblings: getRowValue(row, ['totalsiblings', 'siblings']),
          address: getRowValue(row, ['address']),
          fatherNationalId: getRowValue(row, ['fathernationalid', 'fathercnic']),
          fatherEducation: getRowValue(row, ['fathereducation']),
          fatherMobile: getRowValue(row, ['fathermobile', 'fatherphone']),
          fatherOccupation: getRowValue(row, ['fatheroccupation']),
          fatherIncome: getRowValue(row, ['fatherincome']),
          motherName: getRowValue(row, ['mothername']),
          motherNationalId: getRowValue(row, ['mothernationalid', 'mothercnic']),
          motherEducation: getRowValue(row, ['mothereducation']),
          motherMobile: getRowValue(row, ['mothermobile', 'motherphone']),
          motherOccupation: getRowValue(row, ['motheroccupation']),
          motherIncome: getRowValue(row, ['motherincome']),
          familyId: familyMatch ? String(familyMatch.id) : '',
          familyName: rawFamily,
        });
      });

      setStudents(importedStudents);
      setImportFileName(file.name);
      setFocusedStudentId(importedStudents[0]?.id || null);
      setExpandedStudentIds(new Set());
      showToast(`${importedStudents.length} student rows loaded from ${file.name}.`, 'success');
    } catch (error: any) {
      showToast(`Failed to read CSV: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      event.target.value = '';
    }
  }, [showToast, findClassMatch, findSectionMatch, findFamilyMatch]);

  // Helper function to get default password - memoized to prevent handleSubmit recreation
  const generateRandomPassword = useCallback((): string => {
    // Generate a random 5-digit number (10000 to 99999)
    const min = 10000;
    const max = 99999;
    const randomPassword = Math.floor(Math.random() * (max - min + 1)) + min;
    return String(randomPassword);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user?.school_id) {
      showToast('User school information not found', 'error');
      return;
    }

    // Get current students from ref (avoids dependency on students array)
    const currentStudents = studentsRef.current;
    
    if (currentStudents.length === 0) {
      showToast('Please add at least one student!', 'error');
      return;
    }

    // Filter out students without required fields (Name and Father only)
    const validStudents = currentStudents.filter(student => 
      student.name.trim() && student.fatherName.trim()
    );

    if (validStudents.length === 0) {
      showToast('Please add at least one student with Name and Father fields', 'error');
      return;
    }

    // Show warning if some students are incomplete but still allow submission
    if (validStudents.length !== currentStudents.length) {
      const incompleteCount = currentStudents.length - validStudents.length;
      showToast(`Warning: ${incompleteCount} students are missing Name or Father fields. Only complete students will be saved.`, 'warning');
    }

    setSubmitting(true);
    startProgress(false);
    setProgress(10);

    try {
      // Check for active session
      setProgress(20);
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
        .single();
      
      if (sessionError || !session) {
        showToast('Cannot add students: No active session found!', 'error');
        setSubmitting(false);
        completeProgress();
        return;
      }

      setProgress(35);
      const failedIds = new Set<string>();
      const failureMessages: string[] = [];
      let successCount = 0;

      for (let index = 0; index < validStudents.length; index++) {
        const student = validStudents[index];
        const progressBase = 35 + Math.round(((index + 1) / validStudents.length) * 60);
        setProgress(progressBase);

        try {
          const placement = resolvePlacement(student);

          if ('error' in placement) {
            throw new Error(placement.error);
          }

          const admissionDate = normalizeDateForBackend(student.admissionDate);
          const dob = normalizeDateForBackend(student.dob, '2000-01-01');
          const studentData = {
            name: student.name,
            class_id: placement.classId,
            section_id: placement.sectionId,
            admission_date: admissionDate,
            phone: nullableValue(student.phone),
            dob,
            form_b: nullableValue(student.studentId),
            gender: student.gender || 'Male',
            cast: nullableValue(student.cast),
            orphan: nullableValue(student.orphan),
            osc: nullableValue(student.osc),
            id_mark: nullableValue(student.idMark),
            blood_group: nullableValue(student.bloodGroup),
            previous_school: nullableValue(student.previousSchool),
            previous_id: nullableValue(student.previousId),
            religion: student.religion || 'Muslim',
            nationality: student.nationality || 'Pakistani',
            disease: nullableValue(student.disease),
            additional_note: nullableValue(student.additionalNote),
            total_siblings: nullableValue(student.totalSiblings),
            address: nullableValue(student.address),
            father_name: student.fatherName,
            father_national_id: nullableValue(student.fatherNationalId),
            father_education: nullableValue(student.fatherEducation),
            father_mobile: nullableValue(student.fatherMobile),
            father_occupation: nullableValue(student.fatherOccupation),
            father_income: nullableValue(student.fatherIncome),
            mother_name: nullableValue(student.motherName),
            mother_national_id: nullableValue(student.motherNationalId),
            mother_education: nullableValue(student.motherEducation),
            mother_mobile: nullableValue(student.motherMobile),
            mother_occupation: nullableValue(student.motherOccupation),
            mother_income: nullableValue(student.motherIncome),
            notification_channel: student.notificationChannel || 'whatsapp',
            session_id: session.id,
            school_id: user.school_id,
            status: 'active',
            password: generateRandomPassword()
          };

          const newStudent = await insertStudentWithRetry(studentData);

          const familyMatch = findFamilyMatch(student.familyId || student.familyName);
          if (familyMatch) {
            const { error: familyLinkError } = await supabase
              .from('family_members')
              .insert([
                {
                  family_id: Number(familyMatch.id),
                  student_id: newStudent.id,
                  is_primary_contact: false,
                  school_id: user.school_id
                }
              ]);

            if (familyLinkError) {
              throw new Error(`Family link failed for ${student.name}: ${familyLinkError.message}`);
            }
          }

          const { error: historyError } = await supabase
            .from('student_class_history')
            .insert([
              {
                student_id: newStudent.id,
                adm_class_id: placement.classId,
                adm_section_id: placement.sectionId,
                new_class_id: placement.classId,
                new_section_id: placement.sectionId,
                session_id: session.id,
                school_id: user.school_id,
                admission_date: admissionDate,
                status: 'active'
              }
            ]);

          if (historyError) {
            throw new Error(`History update failed for ${student.name}: ${historyError.message}`);
          }

          successCount += 1;
        } catch (error: any) {
          failedIds.add(student.id);
          if (failureMessages.length < 5) {
            failureMessages.push(error?.message || `Failed to save ${student.name}`);
          }
        }
      }

      const remainingStudents = currentStudents.filter(student => {
        const missingRequiredFields = !student.name.trim() || !student.fatherName.trim();
        return missingRequiredFields || failedIds.has(student.id);
      });

      setProgress(100);

      if (successCount > 0 && remainingStudents.length === 0) {
        setStudents(createDefaultStudents(10));
        setImportFileName('');
      } else if (successCount > 0) {
        setStudents(remainingStudents);
        if (failedIds.size === 0) {
          setImportFileName('');
        }
      }

      if (successCount > 0 && failedIds.size === 0) {
        showToast(`${successCount} students added successfully!`, 'success');
      } else if (successCount > 0) {
        const failureHint = failureMessages[0] ? ` ${failureMessages[0]}` : '';
        showToast(`${successCount} students added, ${failedIds.size} rows need attention.${failureHint}`, 'warning');
      } else {
        showToast(failureMessages[0] || 'No students could be added.', 'error');
      }
    } catch (err: any) {
      showToast('Error: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setSubmitting(false);
      completeProgress();
    }
  }, [user?.school_id, showToast, startProgress, setProgress, completeProgress, generateRandomPassword, resolvePlacement, insertStudentWithRetry, findFamilyMatch]);

  const handleCancel = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleReset = useCallback(() => {
    setStudents([]);
    setImportFileName('');
    setExpandedStudentIds(new Set());
    setStudents(createDefaultStudents(10));
  }, []);

  // Handle tab key to add new row when tabbing from gender field in last row
  const handleTabKey = (e: React.KeyboardEvent, studentId: string, isLastRow: boolean, fieldType: string) => {
    if (e.key === 'Tab' && isLastRow && fieldType === 'gender') {
      e.preventDefault();
      
      // Add new student
      const newStudent = createStudent({
        id: `temp-${Date.now()}-${Math.random()}`
      });
      
      setStudents(prev => [...prev, newStudent]);
      setFocusedStudentId(newStudent.id);
      
      // Focus the name field of the newly added student after a short delay
      setTimeout(() => {
        const nameInput = document.querySelector(`input[data-student-id="${newStudent.id}"][data-field="name"]`) as HTMLInputElement;
        if (nameInput) {
          nameInput.focus();
        }
      }, 50);
    }
  };

  // Handle focus changes to update focused student
  const handleFieldFocus = (studentId: string) => {
    setFocusedStudentId(studentId);
  };

  // Keyboard shortcuts for gender selection and Enter to save students
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Handle Enter key to save students
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
        return;
      }

      // Handle M/F keys for gender selection
      if (e.key.toLowerCase() === 'm' || e.key.toLowerCase() === 'f') {
        // Only handle if not typing in an input field
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
          return;
        }

        e.preventDefault();
        if (focusedStudentId) {
          updateStudent(focusedStudentId, 'gender', e.key.toLowerCase() === 'm' ? 'Male' : 'Female');
        } else {
          // If no focused student, find the first student and set gender
          const firstStudent = students[0];
          if (firstStudent) {
            setFocusedStudentId(firstStudent.id);
            updateStudent(firstStudent.id, 'gender', e.key.toLowerCase() === 'm' ? 'Male' : 'Female');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [students, focusedStudentId, handleSubmit]);

  // Set global footer content - MUST be before early returns
  useEffect(() => {
    const FooterContent = React.memo(() => {
      const themeObj = theme === 'dark' ? darkTheme : lightTheme;
      
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
          {!isMobile && (
            <div style={{ 
              fontSize: '0.98rem', 
              color: themeObj.TEXT_SECONDARY, 
              fontWeight: 600 
            }}>
              Total Students: {students.length}
            </div>
          )}
          <SegmentedGroup theme={themeObj}>
            <SegmentedButton
              theme={themeObj}
              first
              onClick={handleReset}
            >
              <RefreshIcon style={{ fontSize: 17, marginRight: 4 }} />
              Reset
            </SegmentedButton>
            <SegmentedButton
              theme={themeObj}
              onClick={handleCancel}
            >
              <CloseIcon style={{ fontSize: 17, marginRight: 4 }} />
              Cancel
            </SegmentedButton>
            <SegmentedButton
              theme={themeObj}
              last
              onClick={handleSubmit}
              disabled={submitting}
              style={{ 
                color: '#fff', 
                background: '#16a34a', 
                borderColor: '#16a34a', 
                fontWeight: 700,
                opacity: submitting ? 0.6 : 1,
                whiteSpace: 'nowrap',
                minWidth: 'fit-content'
              }}
            >
              {submitting ? (
                <div style={{ width: 16, height: 16, border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  <SaveIcon style={{ fontSize: 17, marginRight: 4 }} />
                  <span style={{ whiteSpace: 'nowrap' }}>Add {students.length} Students</span>
                </>
              )}
            </SegmentedButton>
          </SegmentedGroup>
        </div>
      );
    });

    setFooterContent({
      visible: true,
      content: <FooterContent />
    });

    return () => {
      setFooterContent(null);
    };
  }, [students.length, submitting, isMobile, theme, setFooterContent, handleSubmit, handleCancel, handleReset]);

  if (loading) {
    return <Loader />;
  }

  if (!activeSession) {
    return <NoSessionsFound />;
  }

  if (!hasClasses) {
    return <NoClassesFound />;
  }

  return (
    <ThemeProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
      <GlobalStyle
        fieldBg={(theme === 'dark' ? darkTheme.FIELD_BG : lightTheme.FIELD_BG) || '#23272f'}
        textColor={(theme === 'dark' ? darkTheme.TEXT_PRIMARY : lightTheme.TEXT_PRIMARY) || '#fff'}
      />
      {toasts.length > 0 && (
        ReactDOM.createPortal(
          <ToastContainer>
            {toasts.map(t => (
              <ToastMsg key={t.id} type={t.type} themeMode={theme}>
                {t.msg}
              </ToastMsg>
            ))}
          </ToastContainer>,
          document.body
        )
      )}
      {submitting && ReactDOM.createPortal(
        <LoadingOverlay>
          <LoadingSpinner />
          <div style={{marginTop: 12, fontWeight: 700, fontSize: '1.25rem', letterSpacing: '1.5px'}}>Adding Students...</div>
          <div style={{marginTop: 8, fontSize: '1.05rem', color: '#b0b8d1'}}>Please wait while we save the records.</div>
        </LoadingOverlay>,
        document.body
      )}
      <PageContainer theme={theme === 'dark' ? darkTheme : lightTheme}>
        <Header theme={theme === 'dark' ? darkTheme : lightTheme}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <HeaderTitle>Bulk Student Admission</HeaderTitle>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <UploadCsvButton
              type="button"
              onClick={() => csvInputRef.current?.click()}
              title="Upload CSV file"
            >
              <CloudUploadIcon style={{ fontSize: 18 }} />
              Upload CSV
            </UploadCsvButton>
            <HiddenFileInput
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFileChange}
            />
          </div>
        </Header>
        <MainContent>
          <InstructionsCard>
            <InstructionsTitle>CSV Upload Instructions</InstructionsTitle>
            <InstructionsText>
              Upload a CSV with one student per row. The importer fills the same editable fields you see below, so you can review and adjust anything before saving.
            </InstructionsText>
            <InstructionList>
              <li>Recommended columns: `name`, `father_name`, `class_id` or `class`, `section_id` or `section`, `admission_date`, `gender`, `dob`, `phone`, `student_id`.</li>
              <li>You can also include admission-form fields like `cast`, `blood_group`, `religion`, `nationality`, `address`, `previous_school`, `father_mobile`, `mother_name`, and the rest of the visible row fields.</li>
              <li>Class and section are now row-based. For CSV import, each row should carry its own class and section information.</li>
              <li>Only fields actually required by the database need to be completed. Anything else can stay blank.</li>
              <li>If a class or section from the CSV does not resolve automatically, the row stays editable so you can correct it on screen.</li>
            </InstructionList>
          </InstructionsCard>
          <StudentsListContainer>
            <ListHeader>
              <div>
                <ListTitle>Students ({students.length})</ListTitle>
                <ImportSummary>
                  <DescriptionIcon style={{ fontSize: 16 }} />
                  <span>{importFileName ? `Loaded: ${importFileName}` : 'CSV supports name, father_name, gender, class_id/class, section_id/section, admission_date and admission-form style fields.'}</span>
                </ImportSummary>
              </div>
              <AddStudentButton type="button" onClick={addStudent}>
                <PersonAddIcon style={{ fontSize: 18 }} />
                Add Row
              </AddStudentButton>
            </ListHeader>
            
            {students.map((student, index) => {
              const isLastRow = index === students.length - 1;
              const rowSections = getSectionsForClass(student.classId);
              const rowHasSections = classHasSections(student.classId);
              const unresolvedClass = !!student.className && !student.classId;
              const unresolvedSection = rowHasSections && !!student.sectionName && !student.sectionId;
              const isExpanded = expandedStudentIds.has(student.id);
              return (
                <StudentRow 
                  key={student.id} 
                  $focused={focusedStudentId === student.id}
                  onClick={() => setFocusedStudentId(student.id)}
                  ref={isLastRow ? lastRowRef : null}
                >
                  <StudentRowHeader>
                    <StudentRowMeta>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: (theme === 'dark' ? darkTheme : lightTheme).TEXT_PRIMARY }}>
                          {student.name || `Student Row ${index + 1}`}
                        </div>
                        <FieldHint $error={unresolvedClass || unresolvedSection}>
                          {unresolvedClass
                            ? `CSV class "${student.className}" could not be matched.`
                            : unresolvedSection
                              ? `CSV section "${student.sectionName}" could not be matched.`
                              : 'Edit any row fields before saving.'}
                        </FieldHint>
                      </div>
                    </StudentRowMeta>
                    <ButtonContainer>
                      <ExpandButton
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStudentExpanded(student.id);
                        }}
                      >
                        {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                        {isExpanded ? 'Hide Details' : 'More Details'}
                      </ExpandButton>
                      <InsertButton 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          insertStudent(index);
                        }}
                        data-student-id={student.id}
                        data-field="insert"
                        tabIndex={-1}
                        title="Insert new row after this one"
                      >
                        <AddIcon fontSize="small" />
                        Row
                      </InsertButton>
                      <RemoveButton 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeStudent(student.id);
                        }}
                        data-student-id={student.id}
                        data-field="remove"
                        tabIndex={-1}
                      >
                        <DeleteIcon fontSize="small" />
                        Remove
                      </RemoveButton>
                    </ButtonContainer>
                  </StudentRowHeader>

                  <StudentRowMain>
                    <SerialNumber style={{ width: 44, height: 44 }}>{index + 1}</SerialNumber>
                    <RowField>
                      <FieldCaption>Name</FieldCaption>
                      <Input
                        placeholder="Student Name"
                        value={student.name || ''}
                        onChange={(e) => updateStudent(student.id, 'name', e.target.value)}
                        onFocus={() => handleFieldFocus(student.id)}
                        onClick={(e) => e.stopPropagation()}
                        data-student-id={student.id}
                        data-field="name"
                      />
                    </RowField>
                    <RowField>
                      <FieldCaption>Father Name</FieldCaption>
                      <Input
                        placeholder="Father Name"
                        value={student.fatherName || ''}
                        onChange={(e) => updateStudent(student.id, 'fatherName', e.target.value)}
                        onFocus={() => handleFieldFocus(student.id)}
                        onClick={(e) => e.stopPropagation()}
                        data-student-id={student.id}
                        data-field="fatherName"
                      />
                    </RowField>
                    <RowField>
                      <FieldCaption>Class</FieldCaption>
                      <Select
                        value={student.classId || ''}
                        onChange={(e) => updateStudent(student.id, 'classId', e.target.value)}
                        onFocus={() => handleFieldFocus(student.id)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">Select Class</option>
                        {loadingClasses ? (
                          <option disabled>Loading...</option>
                        ) : (
                          classes.map(c => (
                            <option key={c.id} value={String(c.id)}>{c.name}</option>
                          ))
                        )}
                      </Select>
                      <FieldHint $error={unresolvedClass}>{unresolvedClass ? `Imported: ${student.className}` : ' '}</FieldHint>
                    </RowField>
                    <RowField>
                      <FieldCaption>Section</FieldCaption>
                      <Select
                        value={student.sectionId || ''}
                        onChange={(e) => updateStudent(student.id, 'sectionId', e.target.value)}
                        onFocus={() => handleFieldFocus(student.id)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={!student.classId || !rowHasSections}
                      >
                        <option value="">
                          {!student.classId ? 'Select Section' : !rowHasSections ? 'No Sections' : 'Select Section'}
                        </option>
                        {rowSections.map(section => (
                          <option key={section.id} value={String(section.id)}>{section.name}</option>
                        ))}
                      </Select>
                      <FieldHint $error={unresolvedSection}>{unresolvedSection ? `Imported: ${student.sectionName}` : ' '}</FieldHint>
                    </RowField>
                    <RowField>
                      <FieldCaption>Admission Date</FieldCaption>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="dd-mm-yyyy"
                        value={student.admissionDate || getTodayDisplay()}
                        onChange={(e) => updateStudent(student.id, 'admissionDate', e.target.value)}
                        onBlur={(e) => updateStudent(student.id, 'admissionDate', normalizeDateForDisplay(e.target.value, getTodayDisplay()))}
                        onFocus={() => handleFieldFocus(student.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </RowField>
                    <RowField>
                      <FieldCaption>Gender</FieldCaption>
                      <Select
                        value={student.gender || 'Male'}
                        onChange={(e) => updateStudent(student.id, 'gender', e.target.value)}
                        onFocus={() => handleFieldFocus(student.id)}
                        onKeyDown={(e) => handleTabKey(e, student.id, isLastRow, 'gender')}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </Select>
                    </RowField>
                    <RowField>
                      <FieldCaption>Phone</FieldCaption>
                      <Input
                        value={student.phone || ''}
                        onChange={(e) => updateStudent(student.id, 'phone', e.target.value.replace(/[^0-9]/g, ''))}
                        onFocus={() => handleFieldFocus(student.id)}
                        onClick={(e) => e.stopPropagation()}
                        maxLength={11}
                      />
                    </RowField>
                  </StudentRowMain>

                  {isExpanded && <CollapsedDrawer><RowSections>
                    <RowSection>
                      <RowSectionTitle>Additional Student Details</RowSectionTitle>
                      <RowFieldsGrid>
                        <RowField>
                          <FieldCaption>Notification Channel</FieldCaption>
                          <Select
                            value={student.notificationChannel || 'whatsapp'}
                            onChange={(e) => updateStudent(student.id, 'notificationChannel', e.target.value)}
                            onFocus={() => handleFieldFocus(student.id)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="whatsapp">WhatsApp</option>
                            <option value="sms">SMS</option>
                          </Select>
                        </RowField>
                        <RowField>
                          <FieldCaption>Family</FieldCaption>
                          <Select
                            value={student.familyId || ''}
                            onChange={(e) => updateStudent(student.id, 'familyId', e.target.value)}
                            onFocus={() => handleFieldFocus(student.id)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">Optional Family</option>
                            {families.map(family => (
                              <option key={family.id} value={family.id}>{`F${family.id} - ${family.name}`}</option>
                            ))}
                          </Select>
                          <FieldHint>{student.familyName && !student.familyId ? `Imported value: ${student.familyName}` : ' '}</FieldHint>
                        </RowField>
                      </RowFieldsGrid>
                    </RowSection>

                    <RowSection>
                      <RowSectionTitle>Other Information</RowSectionTitle>
                      <RowFieldsGrid>
                        <RowField>
                          <FieldCaption>Date of Birth</FieldCaption>
                          <Input type="text" inputMode="numeric" placeholder="dd-mm-yyyy" value={student.dob || '01-01-2000'} onChange={(e) => updateStudent(student.id, 'dob', e.target.value)} onBlur={(e) => updateStudent(student.id, 'dob', normalizeDateForDisplay(e.target.value, '01-01-2000'))} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                        <RowField>
                          <FieldCaption>Student Birth Form ID / NIC</FieldCaption>
                          <Input value={student.studentId || ''} onChange={(e) => updateStudent(student.id, 'studentId', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                        <RowField>
                          <FieldCaption>Cast</FieldCaption>
                          <Input value={student.cast || ''} onChange={(e) => updateStudent(student.id, 'cast', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                        <RowField>
                          <FieldCaption>Orphan Student</FieldCaption>
                          <Input value={student.orphan || ''} onChange={(e) => updateStudent(student.id, 'orphan', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                        <RowField>
                          <FieldCaption>OSC Number</FieldCaption>
                          <Input value={student.osc || ''} onChange={(e) => updateStudent(student.id, 'osc', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                        <RowField>
                          <FieldCaption>Identification Mark</FieldCaption>
                          <Input value={student.idMark || ''} onChange={(e) => updateStudent(student.id, 'idMark', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                        <RowField>
                          <FieldCaption>Blood Group</FieldCaption>
                          <Select value={student.bloodGroup || ''} onChange={(e) => updateStudent(student.id, 'bloodGroup', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()}>
                            {BLOOD_GROUPS.map(bg => <option key={bg || 'blank'} value={bg}>{bg || 'Select'}</option>)}
                          </Select>
                        </RowField>
                        <RowField>
                          <FieldCaption>Previous School</FieldCaption>
                          <Input value={student.previousSchool || ''} onChange={(e) => updateStudent(student.id, 'previousSchool', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                        <RowField>
                          <FieldCaption>Previous ID / Board Roll No</FieldCaption>
                          <Input value={student.previousId || ''} onChange={(e) => updateStudent(student.id, 'previousId', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                        <RowField>
                          <FieldCaption>Religion</FieldCaption>
                          <Select value={student.religion || 'Muslim'} onChange={(e) => updateStudent(student.id, 'religion', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()}>
                            {RELIGIONS.map(item => <option key={item} value={item}>{item}</option>)}
                          </Select>
                        </RowField>
                        <RowField>
                          <FieldCaption>Nationality</FieldCaption>
                          <Select value={student.nationality || 'Pakistani'} onChange={(e) => updateStudent(student.id, 'nationality', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()}>
                            {NATIONALITIES.map(item => <option key={item} value={item}>{item}</option>)}
                          </Select>
                        </RowField>
                        <RowField>
                          <FieldCaption>Total Siblings</FieldCaption>
                          <Input type="number" min="0" value={student.totalSiblings || ''} onChange={(e) => updateStudent(student.id, 'totalSiblings', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                        <RowField>
                          <FieldCaption>Disease If Any?</FieldCaption>
                          <Input value={student.disease || ''} onChange={(e) => updateStudent(student.id, 'disease', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                        <RowField>
                          <FieldCaption>Additional Note</FieldCaption>
                          <Input value={student.additionalNote || ''} onChange={(e) => updateStudent(student.id, 'additionalNote', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                        <RowField $spanAll>
                          <FieldCaption>Address</FieldCaption>
                          <Input as="textarea" rows={2} value={student.address || ''} onChange={(e) => updateStudent(student.id, 'address', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                      </RowFieldsGrid>
                    </RowSection>

                    <RowSection>
                      <RowSectionTitle>Father / Guardian Information</RowSectionTitle>
                      <RowFieldsGrid>
                        <RowField>
                          <FieldCaption>Father Name</FieldCaption>
                          <Input value={student.fatherName || ''} onChange={(e) => updateStudent(student.id, 'fatherName', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                        <RowField>
                          <FieldCaption>Father National ID</FieldCaption>
                          <Input value={student.fatherNationalId || ''} onChange={(e) => updateStudent(student.id, 'fatherNationalId', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                        <RowField>
                          <FieldCaption>Father Education</FieldCaption>
                          <Input value={student.fatherEducation || ''} onChange={(e) => updateStudent(student.id, 'fatherEducation', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                        <RowField>
                          <FieldCaption>Father Mobile</FieldCaption>
                          <Input value={student.fatherMobile || ''} onChange={(e) => updateStudent(student.id, 'fatherMobile', e.target.value.replace(/[^0-9]/g, ''))} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                        <RowField>
                          <FieldCaption>Father Occupation</FieldCaption>
                          <Input value={student.fatherOccupation || ''} onChange={(e) => updateStudent(student.id, 'fatherOccupation', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                        <RowField>
                          <FieldCaption>Father Income</FieldCaption>
                          <Input value={student.fatherIncome || ''} onChange={(e) => updateStudent(student.id, 'fatherIncome', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                      </RowFieldsGrid>
                    </RowSection>

                    <RowSection>
                      <RowSectionTitle>Mother Information</RowSectionTitle>
                      <RowFieldsGrid>
                        <RowField>
                          <FieldCaption>Mother Name</FieldCaption>
                          <Input value={student.motherName || ''} onChange={(e) => updateStudent(student.id, 'motherName', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                        <RowField>
                          <FieldCaption>Mother National ID</FieldCaption>
                          <Input value={student.motherNationalId || ''} onChange={(e) => updateStudent(student.id, 'motherNationalId', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                        <RowField>
                          <FieldCaption>Mother Education</FieldCaption>
                          <Input value={student.motherEducation || ''} onChange={(e) => updateStudent(student.id, 'motherEducation', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                        <RowField>
                          <FieldCaption>Mother Mobile</FieldCaption>
                          <Input value={student.motherMobile || ''} onChange={(e) => updateStudent(student.id, 'motherMobile', e.target.value.replace(/[^0-9]/g, ''))} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                        <RowField>
                          <FieldCaption>Mother Occupation</FieldCaption>
                          <Input value={student.motherOccupation || ''} onChange={(e) => updateStudent(student.id, 'motherOccupation', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                        <RowField>
                          <FieldCaption>Mother Income</FieldCaption>
                          <Input value={student.motherIncome || ''} onChange={(e) => updateStudent(student.id, 'motherIncome', e.target.value)} onFocus={() => handleFieldFocus(student.id)} onClick={(e) => e.stopPropagation()} />
                        </RowField>
                      </RowFieldsGrid>
                    </RowSection>
                  </RowSections></CollapsedDrawer>}
                </StudentRow>
              );
            })}
          </StudentsListContainer>
        </MainContent>
      </PageContainer>
    </ThemeProvider>
  );
};

export default BulkStudentAdmission;
