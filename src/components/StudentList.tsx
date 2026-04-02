import React, { useEffect, useState, useRef, useMemo, useCallback, memo, lazy, Suspense } from 'react';
import styled, { keyframes, DefaultTheme, css } from 'styled-components';
import { supabase } from '../supabaseClient';
import { sortClasses } from '../utils/classUtils';
import { getStudentDisplayId, matchesStudentSearch } from '../utils/studentUtils';
import { ThemeContext, darkTheme, lightTheme, useProgress } from './Layout';
import { useNavigate } from 'react-router-dom';
import { EditStudentForm } from './students/EditStudentForm';
import { useToast } from './useToast';
import { useAuth } from '../contexts/AuthContext';
import NoStudentsFound from './NoStudentsFound';
import { useLoading } from '../contexts/LoadingContext';
import { useProgress as useProgressHook } from './Layout';
import Loader from './Loader';
import { usePageFooter } from './Layout/contexts/PageFooterContext';
import {
  AccountCircle,
  Edit as EditIcon,
  PictureAsPdf,
  Add as AddIcon,
  Print as PrintIcon,
  FilterList as FilterListIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Sms as SmsIcon,
  WhatsApp as WhatsAppIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { Textfit } from '@techstack/react-textfit';
import GlowingCards, { GlowingCard } from './ui/glowing-cards';
import {
  clayCardStyle,
  clayButtonStyle,
  clayPanelStyle,
  neumorphFieldStyle,
  neumorphSelectFieldStyle,
  minimalSelectMenuStyle,
  getLayoutPalette,
  CARD_RADIUS_LG,
  CARD_RADIUS_MD,
} from '../styles/DesignSystem';

// Lazy load heavy components for mobile optimization
const AdmissionLetterPrint = lazy(() => import('./AdmissionLetterPrint'));
// TypeScript declaration for jsPDF autoTable
// @ts-ignore
// eslint-disable-next-line
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (...args: any[]) => jsPDF;
  }
}

const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 12px 6px 12px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  height: auto;
  min-height: 100%;
  overflow: visible;
  display: flex;
  flex-direction: column;

  @media (max-width: 700px) {
    padding: 0 8px 8px 8px;
    min-height: 100%;
    height: auto;
    overflow: visible;
  }
`;

const Header = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 6px;
  margin: 6px 0 4px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  ${clayPanelStyle}
  border-radius: ${CARD_RADIUS_LG};
  padding: 4px 8px 2px 8px;
  min-height: 36px;

  @media (max-width: 700px) {
    gap: 4px;
    margin: 4px 0 6px 0;
    padding: 4px 6px 6px 6px;
    border-radius: ${CARD_RADIUS_MD};
  }
`;

const HeaderTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;

  @media (max-width: 700px) {
    gap: 6px;
  }
`;

const HeaderFilters = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  padding: 0;
`;

const MobileHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
`;

const MobileHeaderButton = styled.button`
  ${clayButtonStyle}
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: ${CARD_RADIUS_MD};
  flex-shrink: 0;
`;

const MobileSearchSection = styled.div`
  width: 100%;
`;

const MobileFiltersPanel = styled.div`
  width: 100%;
  margin-top: 2px;
`;

const MobileFilterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
`;

const Title = styled.h2`
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  line-height: 1.3;

  @media (max-width: 700px) {
    font-size: 1rem;
    line-height: 1.15;
  }
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  ${neumorphFieldStyle}
  border-radius: ${CARD_RADIUS_MD};
  padding: 2px 6px;
  min-width: 120px;
  max-width: 180px;
  width: 100%;
`;

const SearchInput = styled.input`
  width: 100%;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.8rem;
  outline: none;
  margin-left: 4px;
  box-shadow: none;
`;

const FilterRow = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  @media (max-width: 700px) {
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
  }
`;

const FilterSelect = styled.select`
  ${neumorphSelectFieldStyle}
  padding: 6px 12px;
  border-radius: ${CARD_RADIUS_MD};
  font-size: 1rem;
  cursor: pointer;

  @media (max-width: 700px) {
    width: 100%;
  }
`;

const CardGrid = styled.div<{ cardCount: number }>`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
  padding: 0;
  margin: 0;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  
  @media (max-width: 700px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
`;

const getStatusColor = (status: string) =>
  status === 'active' ? '34,197,94' : // green
    status === 'inactive' ? '107,114,128' : // gray
    status === 'suspended' ? '245,158,11' : // orange
      status === 'withdrawn' ? '239,68,68' : // red
        '99,102,241'; // blue

const cardFlyIn = keyframes`
  0% { opacity: 0; transform: translateY(39px) scale(0.96); }
  60% { opacity: 1; transform: translateY(-4px) scale(1.01); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
`;

const imageEntry = keyframes`
  0% { opacity: 0; transform: scale(0.92); }
  100% { opacity: 1; transform: scale(1); }
`;

const actionsEntry = keyframes`
  0% { opacity: 0; transform: translateY(12px) scale(0.92); }
  60% { opacity: 0.7; transform: translateY(-3px) scale(1.04); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
`;

const CardIdBadge = styled.span`
  position: absolute;
  top: 3px;
  right: 3px;
  background: #6366f1;
  color: #fff;
  font-size: 7px;
  font-weight: 700;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  box-shadow: 0 1px 2px #0002;
  z-index: 3;
  letter-spacing: 0.2px;
  border: 1px solid #fff3;
`;

const CardImageSection = styled.div`
  width: 100%;
  height: 52px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#f3f4f8'};
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  box-shadow: 0 1px 4px #0001;
  
  @media (max-width: 700px) {
    height: 65px;
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
  }
`;

const StudentCard = styled.div<{ status: string }>`
  ${clayCardStyle}
  border-radius: ${CARD_RADIUS_LG};
  padding: 0;
  position: relative;
  border: 2px solid rgba(${({ status }) => getStatusColor(status)}, 0.5);
  transition: box-shadow 0.25s ease, border-color 0.2s ease;
  min-width: 0;
  max-width: 100%;
  width: 100%;
  cursor: pointer;
  box-sizing: border-box;
  overflow: hidden;
  
  &:hover {
    border-color: rgba(${({ status }) => getStatusColor(status)}, 0.85);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }
  
  @media (max-width: 700px) {
    min-width: 0;
    border-width: 1.5px;
    border-radius: 8px;
  }
`;

const StatusBadge = styled.div<{ status: string }>`
  padding: 0.12rem 0.4rem;
  border-radius: 999px;
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: ${({ status }) =>
    status === 'active' ? 'rgba(34, 197, 94, 0.15)' :
      status === 'inactive' ? 'rgba(107, 114, 128, 0.15)' :
      status === 'suspended' ? 'rgba(245, 158, 11, 0.15)' :
        status === 'withdrawn' ? 'rgba(239, 68, 68, 0.15)' :
          'rgba(99, 102, 241, 0.15)'};
  color: ${({ status }) =>
    status === 'active' ? 'rgb(21, 128, 61)' :
      status === 'inactive' ? 'rgb(75, 85, 99)' :
      status === 'suspended' ? 'rgb(161, 98, 7)' :
        status === 'withdrawn' ? 'rgb(185, 28, 28)' :
          'rgb(67, 56, 202)'};
  box-shadow: none;
  letter-spacing: 0.02em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  line-height: 1;
  border: 1px solid ${({ status }) =>
    status === 'active' ? 'rgba(34, 197, 94, 0.3)' :
      status === 'inactive' ? 'rgba(107, 114, 128, 0.3)' :
      status === 'suspended' ? 'rgba(245, 158, 11, 0.3)' :
        status === 'withdrawn' ? 'rgba(239, 68, 68, 0.3)' :
          'rgba(99, 102, 241, 0.3)'};

  ${({ status }) => status === 'active' && `
    &::before {
      content: '';
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.6;
    }
  `}

  @media (max-width: 700px) {
    padding: 0.08rem 0.32rem;
    font-size: 0.52rem;
    gap: 0.22rem;
  }
`;

const CardImage = styled.img<{ isLoaded?: boolean }>`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 15%; /* Perfect framing for portraits */
  display: block;
  /* Forcing Chrome to use its high-quality interpolation engine */
  image-rendering: -webkit-optimize-contrast; 
  image-rendering: high-quality;
  -webkit-backface-visibility: hidden;
  opacity: ${({ isLoaded }) => (isLoaded ? 1 : 0)};
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
  will-change: transform, opacity;
  
  ${StudentCard}:hover & {
    transform: scale(1.18);
    filter: brightness(1.05);
  }
`;

const Avatar = styled.div`
  width: 80px;
  min-height: 94px;
  align-self: stretch;
  border-radius: 0;
  background: ${({ theme }) => theme.ACCENT + '22'};
  color: ${({ theme }) => theme.ACCENT};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  font-weight: 700;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  letter-spacing: 0.02em;
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
    width: 52px;
    min-height: 64px;
    height: 100%;
    font-size: 1rem;
  }
`;

const CardTop = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0;
  max-height: 94px;
  
  @media (max-width: 700px) {
    min-height: 62px;
    max-height: none;
  }
`;

const StudentName = styled.h3`
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.25;
  margin: 0 0 0.35rem 0;

  @media (max-width: 700px) {
    font-size: 0.72rem;
    line-height: 1.15;
    margin: 0 0 0.06rem 0;
  }
`;

const FatherName = styled.div`
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.3;
  margin-bottom: 0.1rem;

  @media (max-width: 700px) {
    font-size: 0.58rem;
    line-height: 1.15;
    margin-bottom: 0.04rem;
  }
`;

const StudentDetails = styled.p`
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.3;
  margin: 0.2rem 0;

  @media (max-width: 700px) {
    font-size: 0.54rem;
    line-height: 1.15;
    margin: 0.04rem 0 0 0;
  }
`;

const CardActions = styled.div<{ offsetTop?: boolean }>`
  position: absolute;
  bottom: 5px;
  right: 5px;
  display: flex;
  flex-direction: row;
  gap: 3px;
  opacity: 0;
  pointer-events: none;
  z-index: 3;
  transition: opacity 0.18s, transform 0.18s;
  width: auto;
  
  @media (min-width: 701px) {
  ${StudentCard}:hover & {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
    }
  }
  
  @media (max-width: 700px) {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
    bottom: 4px;
    right: 4px;
  }
`;

const CardActionBtn = styled.button`
  ${clayButtonStyle}
  width: 22px;
  height: 22px;
  border-radius: 50%;
  min-width: 22px;
  padding: 0;
  line-height: 1;
  box-sizing: border-box;
  flex: 0 0 22px;
  background: #facc15;
  color: #222;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.88rem;
  cursor: pointer;
  &:hover {
    background: #fde047;
    color: #7c3aed;
    transform: scale(1.12);
  }
  &:last-child {
    background: #ef4444;
    color: #fff;
    &:hover {
      background: #dc2626;
      color: #fff;
    }
  }

  @media (max-width: 700px) {
    width: 18px;
    height: 18px;
    min-width: 18px;
    flex-basis: 18px;
    font-size: 0.66rem;
  }
`;

const CardContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  background: none;
  padding: 0 4px;
`;

const CardNameWrapper = styled.div`
  height: 18px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  margin-top: 0.36em;
  margin-bottom: 0.5px;
`;

const CardName = styled.h3`
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-weight: 700;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.BG === '#252525' ? '#e2e8f0' : '#1e293b'};
  margin: 0;
  text-align: center;
  line-height: 1.25;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 2px rgba(0,0,0,0.08);
  
  @media (max-width: 700px) {
    font-size: 0.9rem;
    font-weight: 700;
  }
`;

const CardDivider = styled.div`
  width: 40%;
  height: 1px;
  background: ${({ theme }) => theme.FIELD_BORDER};
  margin: 3px auto 3px auto;
  border-radius: 1px;
`;

const CardFather = styled.p`
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0 0 1px 0;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
  
  @media (max-width: 700px) {
    font-size: 0.78rem;
    margin: 0 0 2px 0;
  }
`;

const CardInfoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 100%;
`;

const CardInfoRow = styled.div`
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  width: 100%;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-top: 0.5px;
  line-height: 1.3;
  
  @media (max-width: 700px) {
    font-size: 0.78rem;
    margin-top: 1px;
  }
`;

const CardInfoIcon = styled.span`
  display: flex;
  align-items: center;
  font-size: 1em;
  &.id { color: #a78bfa; }
  &.class { color: #6366f1; }
  &.phone { color: #38bdf8; }
  &.dob { color: #14b8a6; }
  &.adm { color: #06b6d4; }
`;

const NoResults = styled.div`
  text-align: center;
  color: #b0b8d1;
  font-size: 1.1rem;
  margin: 48px 0;
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
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1.4;
  
  @media (max-width: 768px) {
    text-align: center;
    font-size: 0.85rem;
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
  ${clayButtonStyle}
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  padding: 0.25rem 0.55rem;
  border-radius: ${CARD_RADIUS_MD};
  border: 1px solid ${({ theme, active }) => active ? 'transparent' : getLayoutPalette(theme).surfaceBorder};
  background: ${({ theme, active }) => active ? theme.ACCENT : getLayoutPalette(theme).surfaceBg};
  color: ${({ theme, active }) => active ? '#fff' : theme.TEXT_PRIMARY};
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 24px;
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

const ListLoadingOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(30,32,38,0.85);
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

const ListLoadingSpinner = styled.div`
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

const EditModalOverlay = styled.div`
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

const EditModalBox = styled.div`
  ${clayCardStyle}
  width: 90vw;
  max-width: 1200px;
  max-height: 90vh;
  border-radius: ${CARD_RADIUS_LG};
  display: flex;
  flex-direction: column;
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

const EditModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  background: ${({ theme }) => getLayoutPalette(theme).shellBg};
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 10;
`;

const EditModalTitle = styled.div`
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

const StyledIconButton = styled.button`
  ${clayButtonStyle}
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).surfaceBorder};
  cursor: pointer;
  display: flex;
  align-items: center;
    justify-content: center;
  border-radius: 50%;
  padding: 8px;
  color: ${({ theme }) => theme.TEXT_PRIMARY};

  &:hover {
    background: ${({ theme }) => getLayoutPalette(theme).surfaceHoverBg};
  }
`;

const EditModalContent = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-height: calc(100vh - 180px);
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

const EditModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  background: ${({ theme }) => getLayoutPalette(theme).shellBg};
`;

const EditModalButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  ${clayButtonStyle}
  padding: 8px 20px;
  border-radius: ${CARD_RADIUS_MD};
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  background: ${({ theme, variant }) => variant === 'primary' ? theme.ACCENT : getLayoutPalette(theme).surfaceBg};
  color: ${({ theme, variant }) => variant === 'primary' ? '#fff' : theme.TEXT_PRIMARY};
  border: 1px solid ${({ theme, variant }) => variant === 'primary' ? 'transparent' : getLayoutPalette(theme).surfaceBorder};
  
  &:hover {
    background: ${({ theme, variant }) => variant === 'primary' ? theme.ACCENT : getLayoutPalette(theme).surfaceHoverBg};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const EditModalAvatar = styled.div`
  width: 82px;
  height: 82px;
  border-radius: 50%;
  background: #2d3340;
  border: 3px solid #4a6cf7;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    box-shadow: 0 0 0 4px #4a6cf799;
    transform: scale(1.02);
  }
  &:active {
    transform: scale(0.98);
  }
`;

const EditAvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  
  /* Mobile optimizations */
  @media (max-width: 700px) {
    /* Use GPU acceleration for smoother rendering */
    transform: translateZ(0);
    backface-visibility: hidden;
  }
`;

const EditAvatarIcon = styled(AccountCircle)`
  font-size: 3.2rem !important;
  color: #bbb;
`;

const EditRemoveButton = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ef4444;
  color: #fff;
  border: 1px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  z-index: 2;
  cursor: pointer;
  box-shadow: 0 1px 4px #0002;
  transition: background 0.18s, color 0.18s, box-shadow 0.18s;
  &:hover {
    background: #dc2626;
    color: #fff;
    border: 1px solid #fff;
    box-shadow: 0 4px 16px #ff5f5633;
  }
`;

const EditHiddenFileInput = styled.input`
  display: none;
`;

const ExportPdfButton = styled.button`
  background: rgba(99, 102, 241, 0.13);
  color: ${({ theme }) => theme.ACCENT};
  border: none;
  border-radius: 8px;
  padding: 0.38em 1.1em;
  font-size: 0.97em;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5em;
  box-shadow: 0 2px 8px #0001;
  transition: background 0.18s, box-shadow 0.18s, transform 0.13s, color 0.13s;
  height: 2.2em;
  margin-left: 8px;
  position: relative;
  &:hover, &:focus {
    background: rgba(99, 102, 241, 0.22);
    color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 4px 16px #6366f122;
    transform: scale(1.045);
  }
  @media (max-width: 700px) {
    width: 100%;
    justify-content: center;
    font-size: 1.05em;
    padding: 0.38em 0.7em;
    margin-left: 0;
  }
`;

// Move constants outside component to avoid recreation on every render
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'] as const;
const RELIGIONS = ['Muslim', 'Christianity', 'Hinduism', 'Sikhism', 'Other'] as const;
const NATIONALITIES = ['Pakistani', 'Indian', 'Afghan', 'Bangladeshi', 'Other'] as const;

const PerPageWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-right: 16px;
  @media (max-width: 600px) {
    flex-direction: column;
    align-items: center;
    gap: 4px;
    margin-right: 0;
    margin-bottom: 8px;
    width: 100%;
    justify-content: center;
  }
`;

const PerPageLabel = styled.span`
  font-size: 0.97em;
  color: #888;
  font-weight: 500;
  letter-spacing: 0.2px;
  @media (max-width: 600px) {
    font-size: 0.95em;
    margin-top: 10px;
    text-align: center;
    width: 100%;
  }
`;

// Move constants outside component to avoid recreation
const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'withdrawn', label: 'Withdrawn' },
] as const;

// Add a class for the Add Student card
const AddStudentCard = styled(StudentCard)`
`;

const SpinnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  width: 100%;
`;

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 5px solid #e0e7ff;
  border-top: 5px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const SpinnerText = styled.div`
  margin-top: 18px;
  color: #6366f1;
  font-size: 1.15rem;
  font-weight: 600;
  text-align: center;
`;

const EditModalForm = styled.form`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const FormSection = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 24px;
  ${clayCardStyle}
  padding: 24px;
  border-radius: ${CARD_RADIUS_LG};
  &:last-child {
    margin-bottom: 0;
  }
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 16px;
  }
`;

const FormSectionHeader = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

const FormSectionTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
`;

const FormSectionNumber = styled.span`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ theme }) => theme.ACCENT};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: background-color 0.2s ease;
`;

const FormLabel = styled.label`
  font-weight: 500;
  color: ${({ theme }) => theme.BG === '#252525'
    ? '#e2e8f0'
    : '#475569'};
  font-size: 0.95rem;
  margin-bottom: 4px;
`;

const FormInputBase = styled.div`
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).surfaceBorder};
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};
  backdrop-filter: blur(8px);
  border-radius: ${CARD_RADIUS_MD};
  transition: all 0.2s ease;
  position: relative;
  padding: 0;

  &:hover, &:focus-within {
    border-color: ${({ theme }) => getLayoutPalette(theme).surfaceHoverBorder};
    box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceHoverShadow};
  }
`;

const FormInput = styled.input`
  width: 100%;
  padding: 16px;
  font-size: 0.95rem;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.BG === '#252525'
    ? '#fff'
    : '#1e293b'};
  outline: none;
  height: 48px;

  &::placeholder {
    color: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.3)'
    : 'rgba(0, 0, 0, 0.3)'};
    opacity: 1;
  }
`;

const FormSelect = styled.select`
  ${neumorphSelectFieldStyle}
  width: 100%;
  padding: 16px;
  font-size: 0.95rem;
  border: none;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  outline: none;
  cursor: pointer;
  padding-right: 48px;
  height: 48px;
  transition: all 0.2s ease;
`;

const FormTextarea = styled.textarea`
  width: 100%;
  padding: 16px;
  font-size: 0.95rem;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.BG === '#252525'
    ? '#fff'
    : '#1e293b'};
  outline: none;
  min-height: 120px;
  resize: vertical;

  &::placeholder {
    color: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.3)'
    : 'rgba(0, 0, 0, 0.3)'};
    opacity: 1;
  }
`;


const MainContent = styled.div`
  flex: 1;
  min-height: auto;
  max-height: none;
  overflow: visible;
  padding: 0 0 8px 0;
  
  @media (max-width: 700px) {
    padding-bottom: 16px;
  }
`;

// Add SegmentedGroup and SegmentedSelect styled components
const SEGMENTED_HEIGHT = '32px';

const SegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).surfaceBorder};
  border-radius: ${CARD_RADIUS_MD};
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};
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
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const PerPageSelect = styled.select`
  ${neumorphSelectFieldStyle}
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 4px 24px 4px 8px;
  border-radius: ${CARD_RADIUS_MD};
  outline: none;
  cursor: pointer;
  
  @media (max-width: 700px) {
    font-size: 0.8rem;
    padding: 4px 20px 4px 6px;
    background-size: 12px;
    background-position: right 6px center;
  }
`;

const SegmentedInput = styled.input`
  ${SegmentedBase}
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  padding: 0 0.84em;
  min-width: 98px;
  border-right: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
  border-top-left-radius: 11px;
  border-bottom-left-radius: 11px;
  @media (max-width: 700px) {
    width: 100%;
    height: 30px;
    line-height: 30px;
    font-size: 0.82rem;
    padding: 0 0.7em;
    border-radius: 8px !important;
    min-width: 0;
    border-right: none;
  }
`;

const SegmentedButton = styled.button<{ active?: boolean; first?: boolean; last?: boolean }>`
  ${SegmentedBase}
  padding: 0 1.12em;
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35em;
  border-radius: 0;
  box-sizing: border-box;
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
  border: 1px solid ${({ active, theme }) => active ? 'transparent' : getLayoutPalette(theme).surfaceBorder};
  font-weight: ${({ active }) => active ? 700 : 400};
  text-align: center;
  &:hover:not(:disabled), &:focus:not(:disabled) {
    background: ${({ active, theme }) => active ? theme.ACCENT : getLayoutPalette(theme).surfaceHoverBg};
    opacity: 0.92;
    border: 1px solid ${({ active, theme }) => active ? 'transparent' : getLayoutPalette(theme).surfaceHoverBorder};
  }
  & svg {
    font-size: 15px;
    vertical-align: middle;
    display: inline-block;
  }
  @media (max-width: 700px) {
    width: 100%;
    height: 30px;
    line-height: 30px;
    font-size: 0.8rem;
    padding: 0 0.8em;
    min-width: 0;
  }
`;

const SegmentedSelect = styled.select<{ first?: boolean; last?: boolean }>`
  ${SegmentedBase}
  ${minimalSelectMenuStyle}
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  padding: 0 2.2em 0 0.84em;
  border-right: 1px solid ${({ theme }) => getLayoutPalette(theme).surfaceBorder};
  &:last-child { border-right: none; }
  ${({ first }) => `
    ${first ? 'border-top-left-radius: 11px; border-bottom-left-radius: 11px;' : ''}
  `}
  ${({ last }) => `
    ${last ? 'border-top-right-radius: 11px; border-bottom-right-radius: 11px;' : ''}
  `}
  &:not(:first-child) {
    border-left: 1px solid ${({ theme }) => getLayoutPalette(theme).surfaceBorder};
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
    height: 30px;
    line-height: 30px;
    font-size: 0.82rem;
    padding: 0 2em 0 0.7em;
    border-radius: 8px !important;
    min-width: 0;
    border-left: none;
    border-right: none;
    background-position: right 0.7em center;
    background-size: 0.9em 0.9em;
    text-overflow: ellipsis;
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

// Add a new styled component for the pill background
const PaginationPill = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.BG === '#252525' ? '#18191c' : '#222'};
  border-radius: 999px;
  box-shadow: 0 2px 16px #0006;
  padding: 4px 16px;
  gap: 2px;
  min-height: 44px;
  min-width: 0;
  @media (max-width: 700px) {
    margin-left: auto;
    margin-right: 0;
    max-width: 98vw;
    overflow-x: auto;
  }
`;

const PaginationNumber = styled.span<{ active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 1.18rem;
  font-weight: 600;
  color: ${({ active, theme }) => active ? '#fff' : theme.TEXT_SECONDARY};
  background: ${({ active, theme }) => active ? theme.ACCENT : 'transparent'};
  border-radius: 50%;
  transition: background 0.18s, color 0.18s;
`;

const PaginationIconBtn = styled.button`
  background: none;
  border: none;
  color: #aaa;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
  &:hover:not(:disabled) {
    background: #2226;
    color: #fff;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Add styled component for floating to-top button
const ToTopButton = styled.button`
  position: fixed;
  right: 20px;
  bottom: 140px;
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

// Add styled component for alphabetical divider
const AlphaDivider = React.memo(styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1.2em 0 0.2em 0;
  @media (max-width: 700px) {
    position: sticky;
    top: 0;
    z-index: 20;
    background: ${({ theme }) => theme.BG};
    border-bottom: 1.5px solid #4443;
    box-shadow: 0 2px 8px #0001;
    margin-top: 0;
    padding-top: 0.5em;
    padding-bottom: 0.2em;
  }
  @media (min-width: 701px) { display: none; }

  .line {
    flex: 1;
    height: 2px;
    background: #4446;
    border-radius: 2px;
    margin: 0 8px;
  }
  .letter {
    font-size: 1.25rem;
    font-weight: 900;
    color: #6366f1;
    background: ${({ theme }) => theme.BG};
    padding: 0 18px;
    border-radius: 999px;
    letter-spacing: 2px;
    box-shadow: 0 2px 8px #0001;
    text-shadow: 0 1px 2px #0002;
    display: inline-block;
  }
`);

// Icon-only Add button for mobile header
const AddHeaderIconButton = styled.button`
  ${clayButtonStyle}
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).surfaceBorder};
  border-radius: ${CARD_RADIUS_MD};
  width: 34px;
  height: 34px;
  padding: 0;
  margin-left: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  @media (min-width: 701px) {
    display: none;
  }
`;


// Optimized image component with intersection observer for mobile
const MemoizedCardImage = memo(({ src, alt }: { src: string; alt: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // Use Intersection Observer for better performance on mobile
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before image comes into view
        threshold: 0.1
      }
    );

    observer.observe(img);

    return () => observer.disconnect();
  }, []);

  return (
    <CardImage
      ref={imgRef}
      src={isInView ? src : undefined}
      alt={alt}
      loading="lazy"
      isLoaded={isLoaded}
      onLoad={() => setIsLoaded(true)}
    />
  );
});

const MemoizedCardActions = memo(({ student, onEdit, onPrint, onProfile }: {
  student: any;
  onEdit: () => void;
  onPrint: () => void;
  onProfile: () => void;
}) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700;

  return (
    <CardActions className="card-actions" offsetTop={student.status !== 'active'}>
      <CardActionBtn
        title="View Profile"
        onClick={(e) => {
          e.stopPropagation();
          onProfile();
        }}
        style={{ background: '#4a6cf7', color: '#fff' }}
      >
        <AccountCircle fontSize="inherit" />
      </CardActionBtn>
      <CardActionBtn
        title="Edit"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      >
        <EditIcon fontSize="inherit" />
      </CardActionBtn>
      {!isMobile && (
        <CardActionBtn title="Print Admission Letter" onClick={onPrint}>
          <PrintIcon fontSize="inherit" />
        </CardActionBtn>
      )}
    </CardActions>
  );
});

const MemoizedStudentCard = memo(({
  student,
  onClick,
  onEdit,
  onPrint,
  onProfile
}: {
  student: any;
  onClick: (e: React.MouseEvent) => void;
  onEdit: () => void;
  onPrint: () => void;
  onProfile: () => void;
}) => {
  const displayId = getStudentDisplayId(student);
  const isCompactMobile = typeof window !== 'undefined' && window.innerWidth <= 700;

  return (
    <StudentCard status={student.status || 'active'} onClick={onClick} data-student-card>
      <div style={{
        position: 'absolute',
        top: isCompactMobile ? '4px' : '5px',
        right: isCompactMobile ? '4px' : '5px',
        fontSize: isCompactMobile ? '0.58rem' : '0.65rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        color: 'inherit',
        opacity: 0.75,
        background: 'rgba(0, 0, 0, 0.06)',
        padding: isCompactMobile ? '2px 5px' : '3px 6px',
        borderRadius: '5px',
        zIndex: 1,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif"
      }}>
        #{displayId}
      </div>
      <CardTop>
        <Avatar
          onClick={(e) => {
            e.stopPropagation();
            onClick(e);
          }}
          title="View Student Profile"
        >
          {student.picture_url ? (
            <CardImage src={student.picture_url} alt={student.name} isLoaded={true} />
          ) : (
            <span style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PersonIcon
                style={{
                  fontSize: isCompactMobile ? 56 : 88,
                  color: '#9ca3af',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25)) drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
                }}
              />
            </span>
          )}
        </Avatar>
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: isCompactMobile ? '0.22rem 0.32rem 0.22rem 0.28rem' : '0.52rem 0.65rem 0.52rem 0.45rem',
          minWidth: 0,
          height: '100%'
        }}>
          <StudentName>
            <div style={{ display: 'flex', alignItems: 'center', gap: isCompactMobile ? '3px' : '6px', flexWrap: 'wrap', minWidth: 0 }}>
              <span style={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: isCompactMobile ? '100%' : 'unset'
              }}>
                {student.name}
              </span>
              <StatusBadge status={student.status || 'active'}>
                {isCompactMobile
                  ? (student.status || 'active').charAt(0).toUpperCase()
                  : (student.status || 'active').charAt(0).toUpperCase() + (student.status || 'active').slice(1)}
              </StatusBadge>
            </div>
          </StudentName>
          <FatherName style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: isCompactMobile ? '3px' : '8px', minWidth: 0 }}>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.father_name || 'N/A'}</span>
            {!isCompactMobile && (student.phone || student.father_mobile) && (
              <span style={{ fontSize: '0.75rem', fontWeight: 500, opacity: 0.9, display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                {student.notification_channel === 'whatsapp' ? (
                  <WhatsAppIcon style={{ fontSize: '0.8rem', color: '#25D366' }} />
                ) : student.notification_channel === 'sms' ? (
                  <SmsIcon style={{ fontSize: '0.8rem', color: '#4CAF50' }} />
                ) : (
                  <PhoneIcon style={{ fontSize: '0.8rem' }} />
                )}
                {student.phone || student.father_mobile}
              </span>
            )}
          </FatherName>
          <StudentDetails style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: isCompactMobile ? '3px' : '8px', marginBottom: isCompactMobile ? '0' : '3px', minWidth: 0 }}>
            <span>
              {student.classes?.name || 'N/A'}
              {student.sections?.name && ` (${student.sections.name})`}
            </span>
            {!isCompactMobile && student.address && (
              <span style={{ fontSize: '0.72rem', fontWeight: 500, opacity: 0.85, textAlign: 'right', maxWidth: '50%', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                <LocationIcon style={{ fontSize: '0.75rem' }} />
                {student.address}
              </span>
            )}
          </StudentDetails>
          {isCompactMobile && (student.phone || student.father_mobile) && (
            <StudentDetails style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px', minWidth: 0 }}>
              {student.notification_channel === 'whatsapp' ? (
                <WhatsAppIcon style={{ fontSize: '0.64rem', color: '#25D366', flexShrink: 0 }} />
              ) : student.notification_channel === 'sms' ? (
                <SmsIcon style={{ fontSize: '0.64rem', color: '#4CAF50', flexShrink: 0 }} />
              ) : (
                <PhoneIcon style={{ fontSize: '0.64rem', flexShrink: 0 }} />
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {student.phone || student.father_mobile}
              </span>
            </StudentDetails>
          )}
        </div>
      </CardTop>
      <MemoizedCardActions
        student={student}
        onEdit={onEdit}
        onPrint={onPrint}
        onProfile={onProfile}
      />
    </StudentCard>
  );
});

const StudentList: React.FC = () => {
  const { theme } = React.useContext(ThemeContext);
  const { showToast } = useToast();
  const { user } = useAuth();
  const { setLoading, loading } = useLoading();
  const { setFooterContent } = usePageFooter();
  const [students, setStudents] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [classOptions, setClassOptions] = useState<any[]>([]);
  const [sectionOptions, setSectionOptions] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = search.trim()
    ? filtered // show all filtered students if searching
    : filtered.slice((page - 1) * perPage, page * perPage);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const editModalBoxRef = useRef<HTMLDivElement>(null);
  const [sessionOptions, setSessionOptions] = useState<any[]>([]);
  const [loadingSessionsFilter, setLoadingSessionsFilter] = useState(false);
  const [sessionFilter, setSessionFilter] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('active');
  const navigate = useNavigate();
  const [printStudent, setPrintStudent] = useState<any | null>(null);
  const { startProgress, completeProgress, setProgress } = useProgressHook();

  // Add state to track if we should show "no students" state
  const [showNoStudents, setShowNoStudents] = useState(false);
  const [hasFetchedStudents, setHasFetchedStudents] = useState(false); // NEW
  const noStudentsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showMobileFilters, setShowMobileFilters] = React.useState(false);
  // To Top button state
  const [showToTop, setShowToTop] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [scrolling, setScrolling] = useState(false);
  const scrollRAFRef = useRef<number | null>(null);
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 700 : false
  );

  const isMobile = isMobileView;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 700);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Memoize expensive computations
  const studentIdMap = useMemo(() => {
    return new Map(students.map(student => [student.id, student]));
  }, [students]);

  // Optimize student lookup for mobile
  const getStudentById = useCallback((id: string) => {
    return studentIdMap.get(id);
  }, [studentIdMap]);

  // Optimized event handlers with useCallback
  const handleCardClickMemo = useCallback((student: any, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.card-actions')) return;

    // On both mobile and desktop, show actions instead of navigating
    const card = (e.target as HTMLElement).closest('[data-student-card]');
    if (card) {
      const actions = card.querySelector('.card-actions') as HTMLElement;
      if (actions) {
        // First, hide all other card actions
        const allCards = document.querySelectorAll('[data-student-card]');
        allCards.forEach(otherCard => {
          if (otherCard !== card) {
            const otherActions = otherCard.querySelector('.card-actions') as HTMLElement;
            if (otherActions) {
              otherActions.style.opacity = '0';
              otherActions.style.pointerEvents = 'none';
            }
          }
        });

        // Then toggle the clicked card's actions
        const isVisible = actions.style.opacity === '1';
        actions.style.opacity = isVisible ? '0' : '1';
        actions.style.pointerEvents = isVisible ? 'none' : 'auto';
      }
    }
  }, []);

  const handleClassFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newClassFilter = e.target.value;
    setClassFilter(newClassFilter);
    setSectionFilter(''); // Reset section when class changes

    // Check if the selected class has sections
    const selectedClass = classOptions.find(c => String(c.id) === String(newClassFilter));
    const hasSections = selectedClass?.has_sections ?? true;

    // If class doesn't have sections, clear section filter
    if (!hasSections) {
      setSectionFilter('');
    }
  }, [classOptions]);

  const handleSectionFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSectionFilter(e.target.value);
  }, []);

  const handleSessionFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSessionFilter(e.target.value);
  }, []);

  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  }, []);

  const handleEditMemo = useCallback((student: any) => {
    setEditingStudent(student);

    // Create the form data object
    const formData = {
      name: student.name || '',
      class_id: student.class_id || '',
      section_id: student.section_id || '',
      admission_date: student.admission_date || student.created_at || '',
      discount_in_fee: student.discount_in_fee || '',
      phone: student.phone || '',
      picture_url: student.picture_url || '',
      dob: student.dob || '2000-01-01',
      form_b: student.form_b || '',
      gender: student.gender || 'Male',
      cast: student.cast || '',
      orphan: student.orphan || '',
      osc: student.osc || '',
      id_mark: student.id_mark || '',
      blood_group: student.blood_group || '',
      previous_school: student.previous_school || '',
      previous_id: student.previous_id || '',
      religion: student.religion || 'Muslim',
      nationality: student.nationality || 'Pakistani',
      disease: student.disease || '',
      additional_note: student.additional_note || '',
      total_siblings: student.total_siblings || '',
      address: student.address || '',
      father_name: student.father_name || '',
      father_national_id: student.father_national_id || '',
      father_education: student.father_education || '',
      father_mobile: student.father_mobile || '',
      father_occupation: student.father_occupation || '',
      father_income: student.father_income || '',
      mother_name: student.mother_name || '',
      mother_national_id: student.mother_national_id || '',
      mother_education: student.mother_education || '',
      mother_mobile: student.mother_mobile || '',
      mother_occupation: student.mother_occupation || '',
      mother_income: student.mother_income || '',
      notification_channel: student.notification_channel || 'whatsapp',
      status: student.status || 'active'
    };

    setEditForm(formData);
  }, []);


  const handlePrintMemo = useCallback((student: any) => {
    setPrintStudent(student);
  }, []);

  const handleProfileMemo = useCallback((student: any) => {
    // Use roll_number sequence if available, otherwise fall back to id
    const displayId = getStudentDisplayId(student);
    navigate(`/students/profile/${String(displayId)}`);
  }, [navigate]);

  // Optimized scroll handler with RAF and mobile-specific optimizations
  useEffect(() => {
    let rafId: number | null = null;
    let lastScrollTop = 0;

    const onScroll = () => {
      if (rafId) return; // Skip if already scheduled

      rafId = requestAnimationFrame(() => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;

        // Only update state if scroll position changed significantly (mobile optimization)
        if (Math.abs(scrollTop - lastScrollTop) > 10) {
          setShowToTop(scrollTop > 200); // Show button only after scrolling down significantly
          lastScrollTop = scrollTop;
        }

        rafId = null;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);


  // Optimized filtered students computation with reduced memory allocations and ID search
  const filteredStudents = useMemo(() => {
    if (!students.length) return [];

    // Pre-compute filter values to avoid repeated conversions
    const searchLower = search.trim().toLowerCase();
    const searchTerm = search.trim();
    const isNumericSearch = !isNaN(Number(searchTerm));
    const searchTermNum = isNumericSearch ? parseInt(searchTerm) : null;
    const classFilterStr = classFilter ? String(classFilter) : '';
    const sectionFilterStr = sectionFilter ? String(sectionFilter) : '';
    const sessionFilterStr = sessionFilter ? String(sessionFilter) : '';
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
          const sessionMatch = stu.sessions?.name?.toLowerCase().includes(searchLower);

          if (nameMatch || classMatch || sectionMatch || sessionMatch) {
            searchMatch = true;
            // Prioritize name matches
            if (nameMatch) {
              if (stu.name?.toLowerCase().startsWith(searchLower)) {
                searchScore = Math.max(searchScore, 100); // High priority for name starts with
              } else {
                searchScore = Math.max(searchScore, 50); // Lower priority for name contains
              }
            } else {
              searchScore = Math.max(searchScore, 25); // Lower priority for class/section/session matches
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

      // Session filter
      if (sessionFilterStr && shouldInclude) {
        shouldInclude = String(stu.session_id) === sessionFilterStr;
      }

      // Status filter
      if (statusFilterStr && shouldInclude) {
        shouldInclude = String(stu.status) === statusFilterStr;
      }

      if (shouldInclude) {
        scoredResults.push({ student: stu, score: searchScore });
      }
    }

    // Sort by score descending (higher scores first), then by ID descending
    scoredResults.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score; // Higher score first
      }
      return b.student.id - a.student.id; // Then by ID descending
    });

    return scoredResults.map(item => item.student);
  }, [students, search, classFilter, sectionFilter, sessionFilter, statusFilter]);

  // Optimized studentsToShow computation
  const studentsToShow = useMemo(() => {
    // Always use pagination with 100 students per page
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return filteredStudents.slice(start, end);
  }, [filteredStudents, page, perPage]);


  // Remove grouped students logic since we're not using alphabet system anymore

  // Mobile-specific optimizations
  const mobileOptimizations = useMemo(() => ({
    shouldUseVirtualization: false, // Disabled virtualization for mobile
    renderBatchSize: isMobile ? 20 : 100,
    debounceDelay: isMobile ? 500 : 300,
    enableAnimations: !isMobile, // Disable animations on mobile for better performance
    enableGlowEffects: !isMobile // Disable glow effects on mobile
  }), [isMobile, filteredStudents.length]);

  // Optimized search debounce with mobile-specific delays and cleanup
  useEffect(() => {
    const delay = mobileOptimizations.debounceDelay;
    let timeoutId: NodeJS.Timeout;

    const debouncedSearch = () => {
      // Cancel previous timeout
      if (timeoutId) clearTimeout(timeoutId);

      // Set new timeout
      timeoutId = setTimeout(() => {
        // Use requestIdleCallback for better performance on mobile
        if (window.requestIdleCallback) {
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


  // Reset fetch state on component mount
  useEffect(() => {
    setHasFetchedStudents(false);
    setShowNoStudents(false);
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!user?.school_id) {
        showToast('User school information not found', 'error');
        setLoading(false);
        setHasFetchedStudents(true);
        return;
      }
      const minDuration = 2000; // 2 seconds
      const start = Date.now();
      setLoading(true);

      // Start determinate progress
      startProgress(false);
      setProgress(10);

      // Always fetch all students from students table
      setProgress(30);
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', user.school_id)
        .order('id', { ascending: false });

      if (studentsError) {
        showToast('Failed to load students', 'error');
        setLoading(false);
        completeProgress();
        setHasFetchedStudents(true);
        return;
      }

      if (!studentsData || studentsData.length === 0) {
        setStudents([]);
        setLoading(false);
        completeProgress();
        setHasFetchedStudents(true);
        return;
      }

      setProgress(50);

      // Get current class from student_class_history for each student
      const studentIds = studentsData.map((s: any) => s.id);

      setProgress(70);

      // Fetch class history for all students - get latest record for each student
      let historyQuery = supabase
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
        .eq('school_id', user.school_id)
        .order('id', { ascending: true });

      if (sessionFilter) {
        historyQuery = historyQuery.eq('session_id', sessionFilter);
      }

      const { data: historyData } = await historyQuery;

      setProgress(90);

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
              section_id: lastRecord.new_section_id || null,
              session_id: lastRecord.session_id || null
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
          classes: currentClass?.class || null,
          sections: currentClass?.section || null,
          class_id: currentClass?.class_id || student.class_id || null,
          section_id: currentClass?.section_id || student.section_id || null,
          session_id: currentClass?.session_id || student.session_id || null
        };
      });

      setProgress(100);
      // Sort students by ID descending
      const sortedStudents = studentsWithCurrentClass.sort((a, b) => b.id - a.id);
      setStudents(sortedStudents);

      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => {
          setLoading(false);
          completeProgress();
          setHasFetchedStudents(true);
        }, minDuration - elapsed);
      } else {
        setLoading(false);
        completeProgress();
        setHasFetchedStudents(true);
      }
    };

    fetchStudents().catch((error) => {
      setLoading(false);
      completeProgress();
      setHasFetchedStudents(true);
      showToast('Failed to load students', 'error');
    });
  }, [sessionFilter, user?.school_id, startProgress, setProgress, completeProgress]);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!user?.school_id) return;

      setLoadingClasses(true);
      const { data } = await supabase
        .from('classes')
        .select('id, name, has_sections')
        .eq('school_id', user.school_id);
      const sortedClasses = sortClasses(data || []);
      setClassOptions(sortedClasses);
      setLoadingClasses(false);
    };
    fetchClasses();
  }, [user?.school_id]);

  useEffect(() => {
    if (!classFilter || !user?.school_id) {
      setSectionOptions([]);
      return;
    }
    const fetchSections = async () => {
      setLoadingSections(true);
      const { data } = await supabase
        .from('sections')
        .select('id, name')
        .eq('class_id', classFilter)
        .eq('school_id', user.school_id);
      setSectionOptions(data || []);
      setLoadingSections(false);
    };
    fetchSections();
  }, [classFilter, user?.school_id]);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user?.school_id) return;

      setLoadingSessionsFilter(true);
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, name, is_active')
        .eq('school_id', user.school_id);
      if (sessionsError) {
      } else {
        setSessionOptions(sessionsData || []);
        const activeSession = sessionsData?.find(session => session.is_active);
        if (activeSession) {
          setSessionFilter(String(activeSession.id));
        }
      }
      setLoadingSessionsFilter(false);
    };
    fetchSessions();
  }, [user?.school_id]);

  // Remove redundant filtering effect - now handled by filteredStudents useMemo

  useEffect(() => {
    if (!editForm.class_id || !user?.school_id) {
      setSectionOptions([]);
      return;
    }
    const fetchSections = async () => {
      const { data } = await supabase
        .from('sections')
        .select('id, name')
        .eq('class_id', editForm.class_id)
        .eq('school_id', user.school_id);
      setSectionOptions(data || []);
    };
    fetchSections();
  }, [editForm.class_id, user?.school_id]);

  // Update filtered state from memoized filteredStudents
  useEffect(() => {
    setFiltered(filteredStudents);
    setPage(1); // Reset to first page when filters change
  }, [filteredStudents]);

  // Reset to page 1 if perPage changes and current page is out of range
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [perPage, totalPages]);


  // Scroll event for disabling tooltip during scroll
  useEffect(() => {
    let isScrolling = false;

    const onScroll = () => {
      if (!isScrolling) {
        isScrolling = true;
        setScrolling(true);
      }

      if (scrollRAFRef.current) {
        cancelAnimationFrame(scrollRAFRef.current);
      }

      scrollRAFRef.current = requestAnimationFrame(() => {
        isScrolling = false;
        setScrolling(false);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (scrollRAFRef.current) {
        cancelAnimationFrame(scrollRAFRef.current);
      }
    };
  }, []);



  const handleEditSave = async (formData: any) => {
    if (!editingStudent || !user?.school_id) return;
    setEditLoading(true);

    try {
      // Convert empty string numeric fields to null
      const numericFields = [
        'discount_in_fee', 'phone', 'form_b', 'father_income', 'mother_income', 'total_siblings', 'father_mobile', 'mother_mobile'
      ];
      const cleanedForm = { ...formData };
      numericFields.forEach(field => {
        if (cleanedForm[field] === "") cleanedForm[field] = null;
      });

      // Convert empty section_id to null (for classes without sections)
      if (cleanedForm.section_id === "" || !cleanedForm.section_id) {
        cleanedForm.section_id = null;
      }
      // Remove fields not in DB
      delete cleanedForm._newAvatarFile;
      // Always include session_id in the update payload
      cleanedForm.session_id = editingStudent.session_id;
      // Only keep fields that exist in the students table
      const allowedFields = [
        'name', 'class_id', 'section_id', 'admission_date', 'discount_in_fee', 'phone', 'picture_url', 'dob', 'form_b', 'gender', 'cast', 'orphan', 'osc', 'id_mark', 'blood_group', 'previous_school', 'previous_id', 'religion', 'nationality', 'disease', 'additional_note', 'total_siblings', 'address', 'father_name', 'father_national_id', 'father_education', 'father_mobile', 'father_occupation', 'father_income', 'mother_name', 'mother_national_id', 'mother_education', 'mother_mobile', 'mother_occupation', 'mother_income', 'notification_channel', 'status', 'session_id'
      ];
      Object.keys(cleanedForm).forEach(key => {
        if (!allowedFields.includes(key)) {
          delete cleanedForm[key];
        }
      });
      // Handle avatar upload/removal
      if (formData._newAvatarFile || (formData as any)._newAvatarBase64) {
        // Delete old image if it exists
        if (editingStudent && editingStudent.picture_url) {
          const url = editingStudent.picture_url;
          const match = url.match(/student-avatars\/([^?\s]+)/);
          if (match && match[1]) {
            const path = match[1];
            const { error: removeError } = await supabase.storage.from('student-avatars').remove([path]);
            if (removeError) {
              // Failed to delete old avatar
            }
          }
        }

        let file: any = formData._newAvatarFile;

        // If it's totally lost, notify the user. 
        if (!file || (!('size' in file) && !('type' in file))) {
          showToast('Invalid file structure. Please re-select the image.', 'error');
          setEditLoading(false);
          return;
        }

        const fileExt = (file.name || '').split('.').pop() || 'jpg';
        // Generate random file name like StaffAddForm
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `students/${fileName}`; // StaffAddForm uses 'staff/filename' structure!
        
        showToast('Uploading picture...', 'info');
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('student-avatars') // Or is it student-avatars? The bucket might require subfolders or just file directly.
          .upload(fileName, file); // No contentType, no upsert, directly pass the Blob.
          
        if (uploadError) {
          showToast('Failed to upload avatar: ' + uploadError.message, 'error');
          setEditLoading(false);
          return;
        }
        
        const { data: publicUrlData } = supabase
          .storage
          .from('student-avatars')
          .getPublicUrl(fileName);
        cleanedForm.picture_url = publicUrlData?.publicUrl || null;
      } else if (cleanedForm.picture_url === null) {
        // Remove avatar
        cleanedForm.picture_url = null;
      }
      // Log the payload for debugging
      const { data: updatedStudent, error } = await supabase
        .from('students')
        .update(cleanedForm)
        .eq('id', editingStudent.id)
        .eq('school_id', user.school_id)
        .select('*, classes(name), sections(name)')
        .single();
      // --- Update student_class_history: Always update adm_class_id and adm_section_id in ALL records ---
      // Note: We do NOT update new_class_id and new_section_id - those are only changed by promotion/demotion
      // Update admission class and section in ALL student_class_history records for this student
      // This query will update ALL entries for this student (across all sessions) because we filter only by student_id
      const { error: historyError, data: updatedHistory } = await supabase
        .from('student_class_history')
        .update({
          adm_class_id: cleanedForm.class_id,
          adm_section_id: cleanedForm.section_id,
          admission_date: cleanedForm.admission_date
        })
        .eq('student_id', editingStudent.id)
        .eq('school_id', user.school_id)
        .select('id');

      if (historyError) {
        // Don't fail the entire operation
      }
      setEditLoading(false);
      if (error) {
        showToast('Failed to update student: ' + error.message, 'error');
        return;
      }

      // Update local state with the complete updated student data including class and section names
      if (updatedStudent) {
        setStudents(prev => prev.map(stu =>
          stu.id === editingStudent.id
            ? { ...stu, ...updatedStudent, classes: updatedStudent.classes, sections: updatedStudent.sections }
            : stu
        ));
        setFiltered(prev => prev.map(stu =>
          stu.id === editingStudent.id
            ? { ...stu, ...updatedStudent, classes: updatedStudent.classes, sections: updatedStudent.sections }
            : stu
        ));
      }

      showToast('Student updated successfully!', 'success');
      setTimeout(() => {
        setEditingStudent(null);
      }, 1800);
      return; // Ensure the function properly resolves
    } catch (error) {
      showToast('Failed to update student: ' + (error as Error).message, 'error');
      setEditLoading(false);
      throw error; // Re-throw to let the form handle it
    }
  };

  const handleEditCancel = () => {
    setEditingStudent(null);
  };

  const handleEditAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev: ProgressEvent<FileReader>) => setEditAvatar(ev.target?.result as string);
      reader.readAsDataURL(file);
      // Prepare for upload on save
      setEditForm((prev: any) => ({ ...prev, _newAvatarFile: file }));
    }
  };

  const handleEditRemoveAvatar = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setEditAvatar(null);
    setEditForm((prev: any) => ({ ...prev, picture_url: null, _newAvatarFile: null }));
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const handleEditAvatarClick = () => {
    if (editFileInputRef.current) editFileInputRef.current.click();
  };

  // Keyboard and click-outside handlers for edit modal
  useEffect(() => {
    if (!editingStudent) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleEditCancel();
      } else if (e.key === 'Enter') {
        // Only submit if not inside a textarea
        const active = document.activeElement;
        if (active && (active.tagName === 'TEXTAREA' || (active as HTMLElement).getAttribute('type') === 'textarea')) return;
        e.preventDefault();
        // Find the form and trigger submission
        const form = document.querySelector('form');
        if (form) {
          form.requestSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [editingStudent, editForm, editLoading]);

  // Helper function to format dates as dd-mm-yyyy
  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // getMonth() returns 0-11
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleExportStudentsPdf = async () => {
    if (!filtered.length) return;

    setExportLoading(true);
    try {
      // Check if it's a mobile device
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      // Show immediate feedback for mobile users
      if (isMobileDevice) {
        showToast('Generating PDF for mobile... Please wait.', 'success');
      }

      // Lazy load PDF libraries for mobile optimization
      const [jsPDFModule, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);

      const { jsPDF } = jsPDFModule;
      const autoTable = autoTableModule.default;

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const margin = 14;
      const tableTop = 32;

      // Sort students by ID in ascending order first
      const sortedStudents = [...filtered].sort((a, b) => Number(a.id) - Number(b.id));

      // Group students by class-section and sort each group by ID
      const grouped: Record<string, typeof sortedStudents> = {};
      sortedStudents.forEach(stu => {
        const className = stu.classes?.name || '-';
        const sectionName = stu.sections?.name ? ` (${stu.sections.name})` : '';
        const groupKey = className + sectionName;
        if (!grouped[groupKey]) grouped[groupKey] = [];
        grouped[groupKey].push(stu);
      });

      // Sort each group by student ID to ensure proper order
      Object.keys(grouped).forEach(groupKey => {
        grouped[groupKey].sort((a, b) => Number(a.id) - Number(b.id));
      });

      // Sort group keys using the universal class sorting function
      const classObjects = Object.keys(grouped).map(groupKey => {
        // Extract just the class name (remove section part)
        const className = groupKey.split(' (')[0];
        return { name: className, groupKey };
      });
      const sortedClassObjects = sortClasses(classObjects);
      const sortedGroupKeys = sortedClassObjects.map(obj => obj.groupKey);

      let firstPage = true;
      sortedGroupKeys.forEach((groupKey) => {
        const students = grouped[groupKey];
        if (!firstPage) doc.addPage();
        firstPage = false;

        // Header
        doc.setFontSize(18);
        doc.text('Up-to-Date Students List', 105, margin, { align: 'center' });
        doc.setFontSize(16);
        doc.text(groupKey, 105, margin + 10, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Generated on: ${formatDate(new Date())}`, 210 - margin, margin, { align: 'right' });

        // Table columns
        const head = [
          ['S.No', 'ID', 'Name', 'Father Name', 'Mobile', 'DOB', 'Adm. Date', 'Remarks']
        ];

        // Table rows - students are already sorted by ID within each group
        const body = students.map((stu: any, idx: number) => {
          const displayId = getStudentDisplayId(stu);
          return [
            idx + 1,
            displayId,
            stu.name || '-',
            stu.father_name || '-',
            stu.phone || '-',
            stu.dob ? formatDate(new Date(stu.dob)) : '-',
            (stu.admission_date || stu.created_at) ? formatDate(new Date(stu.admission_date || stu.created_at)) : '-',
            '' // Remarks blank
          ];
        });

        autoTable(doc, {
          head,
          body,
          theme: 'grid',
          startY: tableTop,
          margin: { top: margin, left: margin, right: margin },
          headStyles: {
            fillColor: [99, 102, 241],
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 2,
          },
          styles: {
            fontSize: 9,
            cellPadding: 2,
            halign: 'center',
            textColor: [60, 60, 60],
            minCellHeight: 6,
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
          },
          alternateRowStyles: { fillColor: [232, 240, 254] },
          columnStyles: {
            0: { cellWidth: 14, halign: 'center' },
            1: { cellWidth: 14, halign: 'center' },
            2: { cellWidth: 32, halign: 'left' },
            3: { cellWidth: 32, halign: 'left' },
            4: { cellWidth: 24, halign: 'center' },
            5: { cellWidth: 20, halign: 'center' },
            6: { cellWidth: 22, halign: 'center' },
            7: { cellWidth: 26, halign: 'center' },
          },
        });
      });

      // Format date as dd-mmm-yyyy
      const formatDateForFileName = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      };

      // Save the PDF with mobile-friendly approach
      const fileName = `Students List (${formatDateForFileName(new Date())}).pdf`;

      if (isMobileDevice) {
        // For mobile devices, use Capacitor Filesystem API approach
        try {
          // Generate PDF as base64 string
          const pdfBase64 = doc.output('datauristring').split(',')[1];

          // Create unique filename with timestamp to prevent overwriting
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const mobileFileName = `students-list-${timestamp}.pdf`;

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
              <p style="margin: 0 0 15px 0; color: #666;">Students List Report</p>
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
                    <title>Students List PDF</title>
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
                        <h2>📄 Students List PDF Generated</h2>
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
        showToast('Students list PDF generated successfully', 'success');
      }
    } catch (error) {
      showToast('Failed to generate PDF', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  // Add a debug log to print all unique statuses in the students array for troubleshooting
  useEffect(() => {
    const uniqueStatuses = Array.from(new Set(students.map(stu => stu.status)));
  }, [students]);



  const handlePrintAdmissionLetter = (student: any) => {
    setPrintStudent(student);
  };

  const handleCardClick = (student: any, e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    if ((e.target as HTMLElement).closest('.card-actions')) {
      return;
    }
    // Use roll_number sequence if available, otherwise fall back to id
    const displayId = getStudentDisplayId(student);
    navigate(`/students/profile/${String(displayId)}`);
  };

  // Show real content only when not loading and students are loaded
  const showRealStudentList = !loading && students.length > 0;

  // Handle showing NoStudentsFound with delay
  useEffect(() => {
    // Clear any existing timeout
    if (noStudentsTimeoutRef.current) {
      clearTimeout(noStudentsTimeoutRef.current);
    }
    if (!loading && students.length === 0 && hasFetchedStudents) { // MODIFIED
      // Set a timeout to show NoStudentsFound after 2.5 seconds
      noStudentsTimeoutRef.current = setTimeout(() => {
        setShowNoStudents(true);
      }, 2500);
    } else {
      // If we have students or are still loading, don't show NoStudentsFound
      setShowNoStudents(false);
    }
    // Cleanup timeout on unmount
    return () => {
      if (noStudentsTimeoutRef.current) {
        clearTimeout(noStudentsTimeoutRef.current);
      }
    };
  }, [loading, students.length, hasFetchedStudents]); // MODIFIED

  // Remove redundant scroll handler - now handled by the optimized version above

  const handleToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Scroll to top when page changes
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    scrollToTop();
  }, []);

  const handlePerPageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPerPage = parseInt(e.target.value, 10);
    setPerPage(newPerPage);
    setPage(1); // Reset to first page when per page changes
    scrollToTop();
  }, []);

  // Add these calculations near the pagination logic
  const from = (page - 1) * perPage + 1;
  const to = (page - 1) * perPage + paginated.length;
  const total = filtered.length;

  // Set footer content for global footer - MUST be before early returns
  useEffect(() => {
    if (filtered.length > 0) {
      const FooterContentComponent = React.memo(() => {
        const themeObj = theme === 'dark' ? darkTheme : lightTheme;
        const currentFrom = (page - 1) * perPage + 1;
        const currentTo = (page - 1) * perPage + paginated.length;
        const currentTotal = filtered.length;

        return (
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: isMobile ? '0.5rem' : '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '0.75rem', flex: 1, minWidth: 0 }}>
              <PerPageSelect
                theme={themeObj}
                value={perPage}
                onChange={handlePerPageChange}
                style={{
                  minWidth: isMobile ? '55px' : '65px',
                  maxWidth: isMobile ? '65px' : '75px'
                }}
              >
                <option value="20">20</option>
                <option value="30">30</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </PerPageSelect>
              <PaginationInfo theme={themeObj} style={{ textAlign: 'left', fontSize: isMobile ? '0.9rem' : '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                {isMobile
                  ? `${currentFrom} to ${currentTo} of ${currentTotal}`
                  : `Showing ${currentFrom} to ${currentTo} of ${currentTotal} students`
                }
              </PaginationInfo>
            </div>
            <PaginationControls theme={themeObj} style={{ flex: 'none', width: 'auto' }}>
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
  }, [filtered.length, page, perPage, paginated.length, totalPages, isMobile, theme, setFooterContent, handlePageChange, handlePerPageChange]);

  // Show loading animation until students are fully loaded
  if (loading || !hasFetchedStudents) {
    return <Loader />;
  }
  if (showNoStudents && students.length === 0 && hasFetchedStudents) { // MODIFIED
    return <NoStudentsFound />;
  }

  return (
    <>
      <PageContainer>
        <MainContent ref={mainContentRef}>
          <Header>
            <HeaderTopRow>
              <Title theme={theme === 'dark' ? darkTheme : lightTheme}>
                All Students <span style={{ fontWeight: 400, fontSize: isMobile ? '0.9rem' : '1rem', color: theme === 'dark' ? '#b0b8d1' : '#4a4a4a' }}>({filtered.length})</span>
              </Title>
              {isMobile ? (
                <MobileHeaderActions>
                  <MobileHeaderButton
                    aria-label="Show/hide filters"
                    onClick={() => setShowMobileFilters(v => !v)}
                  >
                    <FilterListIcon style={{ fontSize: 18, color: '#fff' }} />
                  </MobileHeaderButton>
                  <AddHeaderIconButton
                    aria-label="Add Student"
                    onClick={() => navigate('/students/add')}
                    theme={theme === 'dark' ? darkTheme : lightTheme}
                  >
                    <AddIcon style={{ fontSize: 18, color: '#fff' }} />
                  </AddHeaderIconButton>
                </MobileHeaderActions>
              ) : (
                <HeaderFilters>
                <SegmentedGroup>
                  <SegmentedInput
                    theme={theme === 'dark' ? darkTheme : lightTheme}
                    type="text"
                    placeholder="Search Student..."
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    style={{ minWidth: 220, maxWidth: 320, width: '100%' }}
                  />
                  <SegmentedSelect
                    value={classFilter}
                    onChange={handleClassFilterChange}
                  >
                    <option value="">All Classes</option>
                    {loadingClasses ? <option>Loading...</option> :
                      classOptions.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </SegmentedSelect>
                  {(() => {
                    const selectedClass = classOptions.find(c => String(c.id) === String(classFilter));
                    const hasSections = selectedClass?.has_sections ?? true;
                    return hasSections ? (
                      <SegmentedSelect
                        value={sectionFilter}
                        onChange={handleSectionFilterChange}
                        disabled={!classFilter}
                      >
                        <option value="">All Sections</option>
                        {loadingSections ? <option>Loading...</option> :
                          sectionOptions.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                      </SegmentedSelect>
                    ) : null;
                  })()}
                  <SegmentedSelect
                    value={sessionFilter}
                    onChange={handleSessionFilterChange}
                  >
                    {loadingSessionsFilter ? <option>Loading...</option> :
                      sessionOptions.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                  </SegmentedSelect>
                  <SegmentedSelect
                    value={statusFilter}
                    onChange={handleStatusFilterChange}
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </SegmentedSelect>
                  <SegmentedButton
                    theme={theme === 'dark' ? darkTheme : lightTheme}
                    onClick={handleExportStudentsPdf}
                    disabled={exportLoading}
                    title="Export students to PDF"
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
                    {exportLoading ? (
                      <div style={{
                        width: 15,
                        height: 15,
                        border: '2px solid #e0e7ff',
                        borderTop: '2px solid #4a6cf7',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                    ) : (
                      <PictureAsPdf style={{ fontSize: 15 }} />
                    )}
                    <span style={{ fontWeight: 700, display: 'inline-block' }}>
                      {exportLoading ? 'Exporting...' : 'Export'}
                    </span>
                  </SegmentedButton>
                </SegmentedGroup>
                </HeaderFilters>
              )}
            </HeaderTopRow>
            {isMobile && (
              <MobileSearchSection>
                <SegmentedInput
                  theme={theme === 'dark' ? darkTheme : lightTheme}
                  type="text"
                  placeholder="Search Student..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  style={{ width: '100%' }}
                />
              </MobileSearchSection>
            )}
            {isMobile && showMobileFilters && (
              <MobileFiltersPanel>
                <MobileFilterGrid>
                <SegmentedSelect
                  value={classFilter}
                  onChange={handleClassFilterChange}
                  style={{ width: '100%' }}
                >
                  <option value="">All Classes</option>
                  {loadingClasses ? <option>Loading...</option> :
                    classOptions.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </SegmentedSelect>
                {(() => {
                  const selectedClass = classOptions.find(c => String(c.id) === String(classFilter));
                  const hasSections = selectedClass?.has_sections ?? true;
                  return hasSections ? (
                    <SegmentedSelect
                      value={sectionFilter}
                      onChange={handleSectionFilterChange}
                      disabled={!classFilter}
                      style={{ width: '100%' }}
                    >
                      <option value="">All Sections</option>
                      {loadingSections ? <option>Loading...</option> :
                        sectionOptions.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </SegmentedSelect>
                  ) : null;
                })()}
                <SegmentedSelect
                  value={sessionFilter}
                  onChange={handleSessionFilterChange}
                  style={{ width: '100%' }}
                >
                  {loadingSessionsFilter ? <option>Loading...</option> :
                    sessionOptions.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </SegmentedSelect>
                <SegmentedSelect
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  style={{ width: '100%' }}
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </SegmentedSelect>
                <SegmentedButton
                  theme={theme === 'dark' ? darkTheme : lightTheme}
                  onClick={handleExportStudentsPdf}
                  disabled={exportLoading}
                  title="Export students to PDF"
                  style={{ width: '100%', gridColumn: '1 / -1', justifyContent: 'center' }}
                >
                  {exportLoading ? (
                    <div style={{
                      width: 15,
                      height: 15,
                      border: '2px solid #e0e7ff',
                      borderTop: '2px solid #4a6cf7',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                  ) : (
                    <PictureAsPdf style={{ fontSize: 15 }} />
                  )}
                  <span style={{ fontWeight: 700 }}>
                    {exportLoading ? 'Exporting...' : 'Export'}
                  </span>
                </SegmentedButton>
                </MobileFilterGrid>
              </MobileFiltersPanel>
            )}
          </Header>
          {filteredStudents.length === 0 ? (
            <NoResults>No students found matching your search criteria.</NoResults>
          ) : (
            mobileOptimizations.enableGlowEffects ? (
              <GlowingCards enableGlow gap="0.6em" maxWidth="100%" padding="0">
                <CardGrid cardCount={studentsToShow.length}>
                  {studentsToShow.map((student) => (
                    <GlowingCard key={student.id} className="!max-w-full !w-full !p-0" glowColor="#6366f1">
                      <MemoizedStudentCard
                        student={student}
                        onClick={(e) => handleCardClickMemo(student, e)}
                        onEdit={() => handleEditMemo(student)}
                        onPrint={() => handlePrintMemo(student)}
                        onProfile={() => handleProfileMemo(student)}
                      />
                    </GlowingCard>
                  ))}
                </CardGrid>
              </GlowingCards>
            ) : (
              <CardGrid cardCount={studentsToShow.length}>
                {studentsToShow.map((student) => (
                  <MemoizedStudentCard
                    key={student.id}
                    student={student}
                    onClick={(e) => handleCardClickMemo(student, e)}
                    onEdit={() => handleEditMemo(student)}
                    onPrint={() => handlePrintMemo(student)}
                    onProfile={() => handleProfileMemo(student)}
                  />
                ))}
              </CardGrid>
            )
          )}
        </MainContent>
        {editingStudent && (
          <EditStudentForm
            key={editingStudent.id} // Force re-render when editing different students
            open={Boolean(editingStudent)}
            onSubmit={handleEditSave}
            onCancel={handleEditCancel}
            initialData={editForm}
          />
        )}
        {printStudent && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#fff', zIndex: 9999, overflow: 'auto' }}>
            <Suspense fallback={<Loader />}>
              <AdmissionLetterPrint student={printStudent} onClose={() => setPrintStudent(null)} />
            </Suspense>
          </div>
        )}
      </PageContainer>
      {showToTop && (
        <ToTopButton onClick={handleToTop} aria-label="Scroll to top">
          <KeyboardArrowUpIcon style={{ fontSize: 32 }} />
        </ToTopButton>
      )}
    </>
  );
};



export default memo(StudentList); 
