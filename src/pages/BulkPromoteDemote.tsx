import React, { useState, useEffect, useCallback, useContext } from 'react';
import styled, { useTheme, keyframes, css } from 'styled-components';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import { School as SchoolIcon } from '@mui/icons-material';
import { Box, Grid } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import { useProgress, ThemeContext } from '../components/Layout';
import NoStudentsFound from '../components/NoStudentsFound';
import { sortClasses } from '../utils/classUtils';
import { getStudentDisplayId } from '../utils/studentUtils';
import { usePageFooter } from '../components/Layout/contexts/PageFooterContext';

import Loader from '../components/Loader';
import {
  CARD_RADIUS_LG,
  clayCardStyle,
  clayInputStyle,
  clayPanelStyle,
  getButtonPalette,
  getDashboardPalette,
  getLayoutPalette,
  isDark as checkIsDark,
  minimalSelectMenuStyle,
} from '../styles/DesignSystem';
// Reuse styled components from StudentStatusManager or redefine as needed
// ... (copy ModalContent, Column, StudentList, StudentItem, Checkbox, StudentListItemName, SelectAllContainer, etc.)

const Container = styled.div`
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0 10px 6px 10px;
  box-sizing: border-box;
  background: ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    const dark = checkIsDark(theme);
    return `
      radial-gradient(circle at top left, ${dark ? 'rgba(255, 255, 255, 0.035)' : `${theme.ACCENT}10`} 0%, transparent 26%),
      linear-gradient(180deg, rgba(255,255,255,${dark ? '0.02' : '0.35'}) 0%, transparent 18%),
      ${layout.shellBg}
    `;
  }};
  max-width: 100vw;
  overflow: hidden;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

const PageHeader = styled.div`
  ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    return css`
      ${clayPanelStyle}
      border: 1px solid ${layout.shellBorder};
      box-shadow: ${layout.surfaceShadow};
    `;
  }}
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 0 6px 0;
  padding: 8px 10px;
  @media (max-width: 768px) {
    margin: 8px 0 6px 0;
    padding: 8px;
  }
`;

const Heading = styled.h1`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  @media (max-width: 768px) {
    font-size: 1rem;
    gap: 0.4rem;
  }
`;

const HeaderIcon = styled.div`
  ${clayCardStyle}
  width: 32px;
  height: 32px;
  border-radius: ${CARD_RADIUS_LG};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.ACCENT};
  @media (max-width: 768px) {
    width: 28px;
    height: 28px;
  }
`;

const MainContent = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 0 8px 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 4px;
  }
  @media (max-width: 768px) {
    gap: 0.8rem;
    scroll-behavior: auto;
  }
`;

const ControlPanel = styled.div`
  ${clayPanelStyle}
  border-radius: ${CARD_RADIUS_LG};
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).shellBorder};
  padding: 1rem;
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};
  @media (max-width: 768px) {
    padding: 0.8rem;
  }
`;

const ControlGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.9rem;
  margin-bottom: 1rem;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
`;

const FormRow = styled.div`
  display: flex;
  gap: 0.9rem;
  margin-bottom: 1rem;
  
  @media (max-width: 1200px) {
    flex-direction: column;
    gap: 1rem;
  }
  @media (max-width: 768px) {
    margin-bottom: 1rem;
  }
`;

const FormSection = styled.div`
  ${clayCardStyle}
  flex: 1;
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).shellBorder};
  border-radius: ${CARD_RADIUS_LG};
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;

  @media (max-width: 768px) {
    padding: 0.7rem;
    gap: 0.7rem;
  }
`;

const FormSectionTitle = styled.h4`
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding-bottom: 0.55rem;
  border-bottom: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
`;

const ControlField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 100%;
  @media (max-width: 768px) {
    gap: 0.25rem;
  }
`;

const Label = styled.label`
  font-size: 0.72rem;
  font-weight: 700;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  text-transform: uppercase;
  letter-spacing: 0.35px;
  @media (max-width: 768px) {
    font-size: 0.75rem;
    letter-spacing: 0.25px;
  }
`;

const Select = styled.select`
  ${clayInputStyle}
  ${minimalSelectMenuStyle}
  width: 100%;
  padding: 0.55rem 2rem 0.55rem 0.8rem;
  border-radius: ${CARD_RADIUS_LG};
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    padding: 0.5rem 1.85rem 0.5rem 0.72rem;
    font-size: 0.78rem;
  }
`;

const ActionSelector = styled.div`
  display: flex;
  gap: 0.45rem;
  align-items: center;
  margin-top: 0.7rem;
  padding-top: 0.7rem;
  border-top: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  @media (max-width: 768px) {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    gap: 0.25rem;
  }
`;

const ActionToggle = styled.div`
  ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    return css`
      background: ${layout.surfaceBg};
      border: 1px solid ${layout.surfaceBorder};
      box-shadow: ${layout.surfaceShadow};
    `;
  }}
  display: flex;
  border-radius: ${CARD_RADIUS_LG};
  padding: 2px;
`;

const ToggleButton = styled.button<{ active?: boolean }>`
  padding: 0.42rem 0.78rem;
  border-radius: 4px;
  border: none;
  background: ${({ active, theme }) => active ? theme.ACCENT : 'transparent'};
  color: ${({ active, theme }) => active ? '#fff' : getLayoutPalette(theme).shellMutedText};
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ active, theme }) => active ? theme.ACCENT : getLayoutPalette(theme).surfaceHoverBg};
  }
  
  @media (max-width: 768px) {
    padding: 0.34rem 0.6rem;
    font-size: 0.7rem;
    border-radius: 4px;
  }
`;

const StudentsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  @media (max-width: 1200px) {
    gap: 1.5rem;
  }
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  @media (max-width: 768px) {
    gap: 0.75rem;
  }
`;

const StudentsCard = styled.div`
  ${clayCardStyle}
  border-radius: ${CARD_RADIUS_LG};
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).shellBorder};
  overflow: hidden;
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};
  min-height: 340px;
  display: flex;
  flex-direction: column;
  @media (max-width: 768px) {
    border-radius: 8px;
    min-height: 300px;
  }
`;

const CardHeader = styled.div`
  padding: 0.7rem 0.9rem;
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  border-bottom: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  display: flex;
  align-items: center;
  justify-content: space-between;
  @media (max-width: 768px) {
    padding: 0.75rem 1rem;
  }
`;

const CardTitle = styled.h3`
  font-size: 0.88rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  @media (max-width: 768px) {
    font-size: 0.875rem;
    gap: 0.25rem;
  }
`;

const StudentCount = styled.span`
  font-size: 0.72rem;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  background: ${({ theme }) => getDashboardPalette(theme).status.infoBg};
  padding: 0.18rem 0.55rem;
  border-radius: 999px;
  font-weight: 700;
  @media (max-width: 768px) {
    font-size: 0.75rem;
    padding: 0.125rem 0.5rem;
    border-radius: 12px;
  }
`;

const TableContainer = styled.div`
  overflow-x: auto;
  flex: 1;
  overflow-y: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const Th = styled.th`
  text-align: left;
  padding: 0.55rem 0.8rem;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  font-weight: 700;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  border-bottom: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  position: sticky;
  top: 0;
  z-index: 1;
  @media (max-width: 768px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.7rem;
    letter-spacing: 0.25px;
  }
`;

const Td = styled.td`
  padding: 0.58rem 0.8rem;
  border-bottom: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  vertical-align: middle;
  @media (max-width: 768px) {
    padding: 0.5rem 0.75rem;
  }
`;

const SerialCheckbox = styled.div`
  position: relative;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.ACCENT};
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  transition: all 0.2s ease;
  font-size: 0.64rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};

  &:hover {
    background: ${({ theme }) => theme.ACCENT}15;
    transform: scale(1.05);
  }

  &.checked {
    background: ${({ theme }) => theme.ACCENT};
    color: white;
  }

  /* Mobile adjustments */
  @media (max-width: 768px) {
    width: 22px;
    height: 22px;
    font-size: 0.65rem;
  }
`;

const Avatar = styled.div`
  ${clayCardStyle}
  width: 28px;
  height: 28px;
  border-radius: ${CARD_RADIUS_LG};
  color: ${({ theme }) => theme.ACCENT};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.76rem;
  font-weight: 700;
  margin-right: 0.55rem;
  overflow: hidden;
  flex-shrink: 0;
  @media (max-width: 768px) {
    width: 28px;
    height: 28px;
    font-size: 0.75rem;
    margin-right: 0.5rem;
  }
`;

const StudentInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  @media (max-width: 768px) {
    gap: 0.5rem;
  }
`;

const StudentName = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.82rem;
  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const StudentId = styled.span`
  font-size: 0.68rem;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  font-family: 'Monaco', 'Menlo', monospace;
  @media (max-width: 768px) {
    font-size: 0.7rem;
  }
`;

const ActionsPanel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.9rem;
  padding: 0.9rem 1rem;
  ${clayPanelStyle}
  border-radius: ${CARD_RADIUS_LG};
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).shellBorder};
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    margin-top: 1rem;
    border-radius: 8px;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  @media (max-width: 768px) {
    gap: 0.5rem;
    width: 100%;
    justify-content: center;
  }
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.55rem 1rem;
  border-radius: ${CARD_RADIUS_LG};
  border: 1px solid;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 104px;
  justify-content: center;
  
  ${({ variant, theme }) => {
    const buttons = getButtonPalette(theme);
    switch (variant) {
      case 'primary':
        return `
          background: ${buttons.primaryBg};
          color: ${buttons.primaryText};
          border-color: ${buttons.primaryBorder};
          box-shadow: ${buttons.primaryShadow};
  &:hover {
            box-shadow: ${buttons.primaryHoverShadow};
          }
        `;
      case 'danger':
        return `
          background: ${buttons.dangerBg};
          color: ${buttons.dangerText};
          border-color: ${buttons.dangerBorder};
          box-shadow: ${buttons.dangerShadow};
          &:hover {
            box-shadow: ${buttons.dangerHoverShadow};
          }
        `;
      default:
        return `
          background: ${getLayoutPalette(theme).surfaceBg};
          color: ${getLayoutPalette(theme).shellMutedText};
          border-color: ${getLayoutPalette(theme).surfaceBorder};
          box-shadow: ${getLayoutPalette(theme).surfaceShadow};
          &:hover {
            background: ${getLayoutPalette(theme).surfaceHoverBg};
            border-color: ${getLayoutPalette(theme).surfaceHoverBorder};
          }
        `;
    }
  }}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    padding: 0.625rem 1rem;
    font-size: 0.8rem;
    min-width: 100px;
    border-radius: 6px;
  }
`;

const StatusIndicator = styled.div<{ type: 'success' | 'warning' | 'info' }>`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.32rem 0.65rem;
  border-radius: ${CARD_RADIUS_LG};
  font-size: 0.72rem;
  font-weight: 700;
  
  ${({ type, theme }) => {
    const status = getDashboardPalette(theme).status;
    switch (type) {
      case 'success':
        return `
          background: ${status.successBg};
          color: ${status.success};
          border: 1px solid ${status.success}33;
        `;
      case 'warning':
        return `
          background: ${status.warningBg};
          color: ${status.warning};
          border: 1px solid ${status.warning}33;
        `;
      default:
        return `
          background: ${status.infoBg};
          color: ${status.info};
          border: 1px solid ${status.info}33;
        `;
    }
  }}
  
  @media (max-width: 768px) {
    padding: 0.375rem 0.75rem;
    font-size: 0.8rem;
    border-radius: 6px;
    text-align: center;
    justify-content: center;
  }
`;

const SessionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.74rem;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  padding: 0.38rem 0.72rem;
  border-radius: ${CARD_RADIUS_LG};
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).surfaceBorder};
  
  @media (max-width: 768px) {
    font-size: 0.75rem;
    padding: 0.375rem 0.75rem;
  }
`;

// Modal components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: ${({ theme }) => getLayoutPalette(theme).shellOverlay};
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
  ${clayPanelStyle}
  width: 90vw;
  max-width: 600px;
  max-height: 90vh;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceHoverShadow};
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).shellBorder};
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
  border-bottom: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 10;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
`;

const ModalTitle = styled.div`
  font-size: 1.15rem;
  font-weight: 700;
  background: ${({ theme }) => `linear-gradient(45deg, ${theme.ACCENT}, ${getDashboardPalette(theme).status.violet})`};
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  display: flex;
  align-items: center;
  gap: 16px;
  text-shadow: none;
  position: relative;
  z-index: 1;
  letter-spacing: 0.5px;
`;

const ModalContent = styled.div`
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
  background: transparent;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => `${getLayoutPalette(theme).dropdownThumb} transparent`};
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
    background: ${({ theme }) => getLayoutPalette(theme).dropdownThumb};
    border-radius: 4px;
    border: 2px solid ${({ theme }) => theme.BG};
    &:hover {
      background: ${({ theme }) => getLayoutPalette(theme).dropdownThumbHover};
    }
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
`;

const ModalButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 8px 18px;
  border-radius: ${CARD_RADIUS_LG};
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
  ${({ theme, variant }) => {
    const buttons = getButtonPalette(theme);
    const layout = getLayoutPalette(theme);

    if (variant === 'primary') {
      return css`
        background: ${buttons.primaryBg};
        color: ${buttons.primaryText};
        border: 1px solid ${buttons.primaryBorder};
        box-shadow: ${buttons.primaryShadow};
      `;
    }

    if (variant === 'danger') {
      return css`
        background: ${buttons.dangerBg};
        color: ${buttons.dangerText};
        border: 1px solid ${buttons.dangerBorder};
        box-shadow: ${buttons.dangerShadow};
      `;
    }

    return css`
      background: ${layout.surfaceBg};
      color: ${theme.TEXT_PRIMARY};
      border: 1px solid ${layout.surfaceBorder};
      box-shadow: ${layout.surfaceShadow};
    `;
  }}
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: ${({ theme, variant }) => {
      const buttons = getButtonPalette(theme);
      const layout = getLayoutPalette(theme);
      if (variant === 'primary') return buttons.primaryHoverShadow;
      if (variant === 'danger') return buttons.dangerHoverShadow;
      return layout.surfaceHoverShadow;
    }};
    background: ${({ theme, variant }) => {
      const layout = getLayoutPalette(theme);
      if (variant === 'primary' || variant === 'danger') return undefined;
      return layout.surfaceHoverBg;
    }};
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

const ModalText = styled.div`
  color: ${({ theme }) => getDashboardPalette(theme).bodyText};
  font-size: 0.95rem;
  margin-bottom: 1.5rem;
  font-weight: 500;
  line-height: 1.5;

  strong {
    color: ${({ theme }) => theme.ACCENT};
    font-weight: 600;
  }
`;

const InfoBox = styled.div<{ type?: 'success' | 'warning' | 'error' }>`
  ${({ theme, type }) => {
    const status = getDashboardPalette(theme).status;
    if (type === 'success') {
      return css`background: ${status.successBg}; border: 1px solid ${status.success}33; color: ${status.success};`;
    }
    if (type === 'warning') {
      return css`background: ${status.warningBg}; border: 1px solid ${status.warning}33; color: ${status.warning};`;
    }
    if (type === 'error') {
      return css`background: ${status.dangerBg}; border: 1px solid ${status.danger}33; color: ${status.danger};`;
    }
    return css`background: ${status.infoBg}; border: 1px solid ${status.info}33; color: ${status.info};`;
  }}
  border-radius: ${CARD_RADIUS_LG};
  padding: 10px 12px;
  margin-top: 0.8rem;
  font-size: 0.82rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const StudentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
`;

const StudentItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.55rem;
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  border-radius: ${CARD_RADIUS_LG};
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).surfaceBorder};
`;

const StudentListItemName = styled.span`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.8rem;
`;


const BulkPromoteDemote: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const { setLoading, loading } = useLoading();
  const { startProgress, setProgress, completeProgress } = useProgress();
  const { setFooterContent } = usePageFooter();
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [sourceClass, setSourceClass] = useState('');
  const [sourceSection, setSourceSection] = useState('');
  const [sourceSections, setSourceSections] = useState<any[]>([]);
  const [sourceStudents, setSourceStudents] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<'promote' | 'demote' | 'passout'>('promote');
  const [targetClass, setTargetClass] = useState('');
  const [targetSection, setTargetSection] = useState('');
  const [targetSections, setTargetSections] = useState<any[]>([]);
  const [targetStudents, setTargetStudents] = useState<any[]>([]);
  const [targetStatus, setTargetStatus] = useState<string>('retain');
  const [processing, setProcessing] = useState(false);
  const [hasAnyStudents, setHasAnyStudents] = useState<boolean | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [targetClassStudentsCount, setTargetClassStudentsCount] = useState(0);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sourceSession, setSourceSession] = useState('');
  const [activeSession, setActiveSession] = useState<{ id: string; name: string } | null>(null);

  // Detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700;

  useEffect(() => {
    const loadInitialData = async () => {
      if (!user?.school_id) return;
      const minDuration = 2000;
      const start = Date.now();
      setLoading(true);
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
  }, [user?.school_id, setLoading, startProgress, setProgress, completeProgress]);

  const checkForAnyStudents = async () => {
    if (!user?.school_id) return;

    try {
      // Check if there are any students in the students table for this school
      const { data, error } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', user?.school_id)
        .eq('status', 'active')
        .limit(1);

      if (error) {
        setHasAnyStudents(false);
        return;
      }

      setHasAnyStudents(data && data.length > 0);
    } catch (err: any) {
      setHasAnyStudents(false);
    }
  };

  // Check if there are any students in the system for the active session
  useEffect(() => {
    checkForAnyStudents();
  }, [user?.school_id]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, is_active')
        .eq('school_id', user?.school_id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
      const active = data?.find(s => s.is_active);
      if (active) {
        setActiveSession(active);
        // Default to previous session if we have one, otherwise active session
        const activeIndex = data!.findIndex(s => s.id === active.id);
        if (activeIndex < data!.length - 1) {
          setSourceSession(data![activeIndex + 1].id);
        } else {
          setSourceSession(active.id);
        }
      }
    } catch (err: any) {
      // Don't show error toast for this as it's not critical
    }
  };

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, has_sections')
      .eq('school_id', user?.school_id);
    if (!error && data) {
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

  // Fetch sections for source class
  useEffect(() => {
    if (!sourceClass) {
      setSourceSections([]);
      setSourceSection('');
      setSourceStudents([]);
      setSelectedStudents(new Set());
      return;
    }
    const minDuration = 2000;
    const start = Date.now();
    setLoading(true);
    const fetchSections = async () => {
      const { data } = await supabase
        .from('sections')
        .select('id, name')
        .eq('class_id', sourceClass)
        .eq('school_id', user?.school_id);
      setSourceSections(data || []);
      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => setLoading(false), minDuration - elapsed);
      } else {
        setLoading(false);
      }
    };
    fetchSections();
  }, [sourceClass, user?.school_id]);

  // Fetch students for source class/section
  useEffect(() => {
    if (!sourceClass || !sourceSession) {
      setSourceStudents([]);
      setSelectedStudents(new Set());
      return;
    }

    // Check if the selected class has sections
    const selectedClass = classes.find(c => String(c.id) === String(sourceClass));
    const hasSections = selectedClass?.has_sections ?? true;

    // If class has sections but no section is selected, don't fetch
    if (hasSections && !sourceSection) {
      setSourceStudents([]);
      setSelectedStudents(new Set());
      return;
    }
    const minDuration = 2000;
    const start = Date.now();
    setLoading(true);
    const fetchStudents = async () => {
      try {
        // Check if the selected class has sections
        const selectedClass = classes.find(c => String(c.id) === String(sourceClass));
        const hasSections = selectedClass?.has_sections ?? true;

        // Fetch students from student_class_history for the source session and selected class/section
        let schQuery = supabase
          .from('student_class_history')
          .select('student_id')
          .eq('session_id', sourceSession)
          .eq('new_class_id', sourceClass)
          .eq('school_id', user?.school_id);

        // Only filter by section if the class has sections
        if (hasSections) {
          schQuery = schQuery.eq('new_section_id', sourceSection);
        } else {
          schQuery = schQuery.is('new_section_id', null);
        }

        const { data: schData, error: schError } = await schQuery;

        if (schError) throw schError;

        if (!schData || schData.length === 0) {
          setSourceStudents([]);
          setSelectedStudents(new Set());
          return;
        }

        // Get student IDs from student_class_history
        const studentIds = schData.map(sch => sch.student_id);

        // Fetch full student details
        const { data, error } = await supabase
          .from('students')
          .select(`
            *,
            classes:class_id(name, has_sections),
            sections:section_id(name)
          `)
          .eq('school_id', user?.school_id)
          .eq('status', 'active')
          .in('id', studentIds);

        if (error) throw error;

        // Sort students by ID
        const sortedStudents = (data || []).sort((a, b) => {
          const idA = parseInt(a.id) || 0;
          const idB = parseInt(b.id) || 0;
          return idA - idB;
        });

        setSourceStudents(sortedStudents);
        setSelectedStudents(new Set(sortedStudents.map((s) => s.id)));
      } catch (err: any) {
        toast.showToast('Failed to fetch students', 'error');
        setSourceStudents([]);
        setSelectedStudents(new Set());
      } finally {
        const elapsed = Date.now() - start;
        if (elapsed < minDuration) {
          setTimeout(() => setLoading(false), minDuration - elapsed);
        } else {
          setLoading(false);
        }
      }
    };
    fetchStudents();
  }, [sourceClass, sourceSection, user?.school_id, classes, sourceSession]);

  // Auto-select target class based on action
  useEffect(() => {
    if (!sourceClass || action === 'passout') {
      setTargetClass('');
      setTargetSection('');
      setTargetSections([]);
      setTargetStudents([]);
      return;
    }
    const currentIdx = classes.findIndex(c => String(c.id) === sourceClass);
    let targetIdx = action === 'promote' ? currentIdx + 1 : currentIdx - 1;
    if (targetIdx >= 0 && targetIdx < classes.length) {
      setTargetClass(String(classes[targetIdx].id));
    } else {
      setTargetClass('');
    }
    setTargetSection('');
    setTargetSections([]);
    setTargetStudents([]);
  }, [action, sourceClass, classes]);

  // Fetch sections for target class
  useEffect(() => {
    if (!targetClass) {
      setTargetSections([]);
      setTargetSection('');
      setTargetStudents([]);
      return;
    }
    const minDuration = 2000;
    const start = Date.now();
    setLoading(true);
    const fetchSections = async () => {
      const { data } = await supabase
        .from('sections')
        .select('id, name')
        .eq('class_id', targetClass)
        .eq('school_id', user?.school_id);
      setTargetSections(data || []);
      // Auto-select matching section name
      if (data && sourceSection) {
        const sourceSecObj = sourceSections.find(sec => String(sec.id) === sourceSection);
        if (sourceSecObj) {
          const match = data.find(sec => sec.name === sourceSecObj.name);
          if (match) {
            setTargetSection(String(match.id));
            const elapsed = Date.now() - start;
            if (elapsed < minDuration) {
              setTimeout(() => setLoading(false), minDuration - elapsed);
            } else {
              setLoading(false);
            }
            return;
          }
        }
      }
      setTargetSection('');
      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => setLoading(false), minDuration - elapsed);
      } else {
        setLoading(false);
      }
    }
    fetchSections();
  }, [targetClass, sourceSection, user?.school_id]);

  // Fetch students for target class/section
  useEffect(() => {
    if (!targetClass) {
      setTargetStudents([]);
      return;
    }

    // Check if the target class has sections
    const targetClassObj = classes.find(c => String(c.id) === String(targetClass));
    const hasSections = targetClassObj?.has_sections ?? true;

    // If class has sections but no section is selected, don't fetch
    if (hasSections && !targetSection) {
      setTargetStudents([]);
      return;
    }
    const minDuration = 2000;
    const start = Date.now();
    setLoading(true);
    const fetchTargetStudents = async () => {
      try {
        // Check if the target class has sections
        const targetClassObj = classes.find(c => String(c.id) === String(targetClass));
        const hasSections = targetClassObj?.has_sections ?? true;

        // Fetch students from student_class_history for the active session and selected class/section
        let schQuery = supabase
          .from('student_class_history')
          .select('student_id')
          .eq('session_id', activeSession?.id)
          .eq('new_class_id', targetClass)
          .eq('school_id', user?.school_id);

        // Only filter by section if the class has sections
        if (hasSections) {
          schQuery = schQuery.eq('new_section_id', targetSection);
        } else {
          schQuery = schQuery.is('new_section_id', null);
        }

        const { data: schData, error: schError } = await schQuery;

        if (schError) throw schError;

        if (!schData || schData.length === 0) {
          setTargetStudents([]);
          return;
        }

        // Get student IDs from student_class_history
        const studentIds = schData.map(sch => sch.student_id);

        // Fetch full student details
        const { data, error } = await supabase
          .from('students')
          .select(`
            *,
            classes:class_id(name, has_sections),
            sections:section_id(name)
          `)
          .eq('school_id', user?.school_id)
          .eq('status', 'active')
          .in('id', studentIds);

        if (error) throw error;

        // Sort students by ID
        const sortedStudents = (data || []).sort((a, b) => {
          const idA = parseInt(a.id) || 0;
          const idB = parseInt(b.id) || 0;
          return idA - idB;
        });

        setTargetStudents(sortedStudents);
      } catch (err: any) {
        toast.showToast('Failed to fetch target students', 'error');
        setTargetStudents([]);
      } finally {
        const elapsed = Date.now() - start;
        if (elapsed < minDuration) {
          setTimeout(() => setLoading(false), minDuration - elapsed);
        } else {
          setLoading(false);
        }
      }
    };
    fetchTargetStudents();
  }, [targetClass, targetSection, user?.school_id, classes, activeSession]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(new Set(sourceStudents.map((s: any) => s.id)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleStudentCheck = (id: string, checked: boolean) => {
    const newSet = new Set(selectedStudents);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedStudents(newSet);
  };

  // Helper function to update student_class_history (same as StudentStatusManager)
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

  // Check if target class has existing students
  const checkTargetClassStudents = useCallback(async () => {
    if (!targetClass) return 0;

    try {
      // Check if the target class has sections
      const targetClassObj = classes.find(c => String(c.id) === String(targetClass));
      const hasSections = targetClassObj?.has_sections ?? true;

      // Check student_class_history for the active session
      let schQuery = supabase
        .from('student_class_history')
        .select('student_id')
        .eq('session_id', activeSession?.id)
        .eq('new_class_id', parseInt(targetClass))
        .eq('school_id', user?.school_id);

      // Only filter by section if the class has sections
      if (hasSections) {
        schQuery = schQuery.eq('new_section_id', parseInt(targetSection));
      } else {
        schQuery = schQuery.is('new_section_id', null);
      }

      const { data: schData, error: schError } = await schQuery;

      if (schError) throw schError;

      if (!schData || schData.length === 0) {
        return 0;
      }

      // Get student IDs from student_class_history
      const studentIds = schData.map(sch => sch.student_id);

      // Check how many of these students are still active
      const { data: activeStudents, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', user?.school_id)
        .eq('status', 'active')
        .in('id', studentIds);

      if (studentsError) throw studentsError;

      return activeStudents?.length || 0;
    } catch (error) {
      return 0;
    }
  }, [targetClass, targetSection, classes, activeSession, user?.school_id]);

  const handleConfirm = async () => {
    // --- PASSOUT path: only update status, no class/section change ---
    if (action === 'passout') {
      if (!sourceClass || selectedStudents.size === 0) return;
      const sourceClassObj = classes.find(c => String(c.id) === String(sourceClass));
      const sourceHasSections = sourceClassObj?.has_sections ?? true;
      if (sourceHasSections && !sourceSection) return;

      const minDuration = 2000;
      const start = Date.now();
      setProcessing(true);
      setLoading(true);
      try {
        const studentIds = Array.from(selectedStudents);
        let processedCount = 0;

        for (const studentId of studentIds) {
          try {
            const student = sourceStudents.find(s => s.id === studentId);
            const oldClassId = student?.class_id;
            const oldStatus = student?.status;

            // Only update status to 'passout'; keep class/section unchanged
            await supabase.from('students').update({
              status: 'passout'
            }).eq('id', studentId);

            // Record in student_status_history
            await supabase.from('student_status_history').insert({
              student_id: studentId,
              school_id: user?.school_id,
              action: 'passout',
              old_status: oldStatus,
              new_status: 'passout',
              old_class_id: oldClassId,
              new_class_id: oldClassId,
              reason: null,
              performed_by: user?.id || null,
              new_section_id: student?.section_id || null
            });

            processedCount++;
          } catch (error) { }
        }

        toast.showToast(`Successfully marked ${processedCount} students as Passed Out`, 'success');

        // Reset form
        setSourceClass('');
        setSourceSection('');
        setSelectedStudents(new Set());
        setSourceStudents([]);
        setTargetStatus('retain');
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
      return;
    }

    // --- PROMOTE / DEMOTE path ---
    const sourceClassObj = classes.find(c => String(c.id) === String(sourceClass));
    const sourceHasSections = sourceClassObj?.has_sections ?? true;

    // Check if target class has sections
    const targetClassObj = classes.find(c => String(c.id) === String(targetClass));
    const targetHasSections = targetClassObj?.has_sections ?? true;

    // Validate required fields
    if (!sourceClass || !targetClass || selectedStudents.size === 0) return;
    if (sourceHasSections && !sourceSection) return;
    if (targetHasSections && !targetSection) return;
    const minDuration = 2000;
    const start = Date.now();
    setProcessing(true);
    setLoading(true);
    try {
      const studentIds = Array.from(selectedStudents);
      const totalStudents = studentIds.length;
      let processedCount = 0;

      for (const studentId of studentIds) {
        try {
          const student = sourceStudents.find(s => s.id === studentId);
          const oldClassId = student?.class_id;
          const oldSectionId = student?.section_id;
          const oldStatus = student?.status;

          // Check if the new class has sections
          const selectedClass = classes.find(c => c.id === parseInt(targetClass));
          const hasSections = selectedClass?.has_sections ?? true;
          const finalSectionId = hasSections ? parseInt(targetSection) : null;
          const finalStatus = targetStatus === 'retain' ? oldStatus : targetStatus;

          // Update or create student_class_history for the active session
          if (activeSession) {
            await updateStudentClassHistory(studentId, activeSession.id, parseInt(targetClass), finalSectionId);
          }

          // **Crucial**: Update students table to reflect their new current class/section 
          await supabase.from('students').update({
            class_id: parseInt(targetClass),
            section_id: finalSectionId,
            status: finalStatus
          }).eq('id', studentId);

          // 2. Record in student_status_history
          await supabase.from('student_status_history').insert({
            student_id: studentId,
            school_id: user?.school_id,
            action: action,
            old_status: oldStatus,
            new_status: finalStatus,
            old_class_id: oldClassId,
            new_class_id: parseInt(targetClass),
            reason: null,
            performed_by: user?.id || null,
            new_section_id: finalSectionId
          });

          processedCount++;
        } catch (error) {
        }
      }

      toast.showToast(`Successfully ${action}d ${processedCount} students`, 'success');

      // Reset form
      setSourceClass('');
      setSourceSection('');
      setTargetClass('');
      setTargetSection('');
      setSelectedStudents(new Set());
      setSourceStudents([]);
      setTargetStudents([]);
      setTargetStatus('retain');

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

  const handleCancel = useCallback(() => {
    setSourceClass('');
    setSourceSection('');
    setTargetClass('');
    setTargetSection('');
    setSourceStudents([]);
    setTargetStudents([]);
    setSelectedStudents(new Set());
    setTargetStatus('retain');
  }, []);

  const handleConfirmClick = useCallback(async () => {
    const sourceClassObj = classes.find(c => String(c.id) === String(sourceClass));
    const sourceHasSections = sourceClassObj?.has_sections ?? true;

    // Validate source
    if (!sourceClass || selectedStudents.size === 0) {
      toast.showToast('Please select all required fields and students', 'error');
      return;
    }
    if (sourceHasSections && !sourceSection) {
      toast.showToast('Please select a source section', 'error');
      return;
    }

    // For passout, skip target validation
    if (action === 'passout') {
      setTargetClassStudentsCount(0);
      setShowConfirmModal(true);
      return;
    }

    // Check if target class has sections
    const targetClassObj = classes.find(c => String(c.id) === String(targetClass));
    const targetHasSections = targetClassObj?.has_sections ?? true;

    if (!targetClass) {
      toast.showToast('Please select all required fields and students', 'error');
      return;
    }
    if (targetHasSections && !targetSection) {
      toast.showToast('Please select a target section', 'error');
      return;
    }

    // Check if target class has existing students
    const existingStudentsCount = await checkTargetClassStudents();
    setTargetClassStudentsCount(existingStudentsCount);
    setShowConfirmModal(true);
  }, [sourceClass, targetClass, selectedStudents.size, sourceSection, targetSection, classes, toast, checkTargetClassStudents, action]);

  const handleConfirmModalConfirm = async () => {
    setShowConfirmModal(false);
    await handleConfirm();
  };

  // Set global footer content - MUST be before early returns
  useEffect(() => {
    const FooterContent = React.memo(() => {
      const themeObj = theme as any;
      const sourceClassObj = classes.find(c => String(c.id) === String(sourceClass));
      const targetClassObj = classes.find(c => String(c.id) === String(targetClass));
      const isDisabled = action === 'passout'
        ? (processing || !sourceClass || selectedStudents.size === 0 ||
          (sourceClassObj?.has_sections !== false && !sourceSection))
        : (processing || !sourceClass || !targetClass || selectedStudents.size === 0 ||
          (sourceClassObj?.has_sections !== false && !sourceSection) ||
          (targetClassObj?.has_sections !== false && !targetSection));

      return (
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'center' : 'center',
          justifyContent: isMobile ? 'center' : 'space-between',
          width: '100%',
          gap: isMobile ? '0.35rem' : '0.75rem',
          flexWrap: isMobile ? 'nowrap' : 'wrap'
        }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <ActionButton
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
              disabled={processing}
              style={{
                padding: isMobile ? '0.46rem 0.82rem' : '0.55rem 1rem',
                borderRadius: '6px',
                border: '1px solid',
                fontSize: isMobile ? '0.72rem' : '0.76rem',
                fontWeight: 700,
                cursor: processing ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                minWidth: isMobile ? '92px' : '104px',
                justifyContent: 'center',
                background: getLayoutPalette(themeObj).surfaceBg,
                color: getLayoutPalette(themeObj).shellMutedText,
                borderColor: getLayoutPalette(themeObj).surfaceBorder,
                boxShadow: getLayoutPalette(themeObj).surfaceShadow,
                opacity: processing ? 0.5 : 1
              }}
            >
              Cancel
            </ActionButton>
            <ActionButton
              variant="primary"
              onClick={(e) => {
                e.preventDefault();
                handleConfirmClick();
              }}
              disabled={isDisabled}
              style={{
                padding: isMobile ? '0.46rem 0.82rem' : '0.55rem 1rem',
                borderRadius: '6px',
                border: '1px solid',
                fontSize: isMobile ? '0.72rem' : '0.76rem',
                fontWeight: 700,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                minWidth: isMobile ? '92px' : '104px',
                justifyContent: 'center',
                background: getButtonPalette(themeObj).primaryBg,
                color: 'white',
                borderColor: getButtonPalette(themeObj).primaryBorder,
                boxShadow: getButtonPalette(themeObj).primaryShadow,
                opacity: isDisabled ? 0.5 : 1
              }}
            >
              {processing ? 'Processing...' : action === 'passout' ? `Mark ${selectedStudents.size} Students as Passed Out` : `${action === 'promote' ? 'Promote' : 'Demote'} ${selectedStudents.size} Students`}
            </ActionButton>
          </div>

          {selectedStudents.size > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: isMobile ? '0.28rem 0.58rem' : '0.34rem 0.68rem',
              borderRadius: '6px',
              fontSize: isMobile ? '0.7rem' : '0.74rem',
              fontWeight: 700,
              background: getDashboardPalette(themeObj).status.successBg,
              color: getDashboardPalette(themeObj).status.success,
              border: `1px solid ${getDashboardPalette(themeObj).status.success}33`
            }}>
              {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''} selected for {action === 'passout' ? 'passout' : action}
            </div>
          )}
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
  }, [processing, sourceClass, targetClass, selectedStudents.size, sourceSection, targetSection, action, classes, isMobile, theme, setFooterContent, handleCancel, handleConfirmClick, activeSession]);

  if (loading) {
    return <Loader />;
  }

  // Show NoStudentsFound only if there are truly no students in the system
  if (!loading && hasAnyStudents === false) {
    return <NoStudentsFound />;
  }

  return (
    <Container>
      <PageHeader>
        <Heading>
          <HeaderIcon>
            <SchoolIcon style={{ fontSize: 16 }} />
          </HeaderIcon>
          Bulk Promote/Demote Students
        </Heading>
        {activeSession && (
          <SessionInfo>
            <span>Active Session:</span>
            <strong>{activeSession.name}</strong>
          </SessionInfo>
        )}
      </PageHeader>

      <MainContent>
        <ControlPanel>
          <form onSubmit={e => e.preventDefault()}>
            <FormRow>
              <FormSection>
                <FormSectionTitle>📤 Source Information</FormSectionTitle>
                <ControlField>
                  <Label>Source Session</Label>
                  <Select value={sourceSession} onChange={e => {
                    e.preventDefault();
                    setSourceSession(e.target.value);
                    setSourceClass('');
                    setSourceSection('');
                    setTargetClass('');
                    setTargetSection('');
                    setSourceStudents([]);
                    setSelectedStudents(new Set());
                  }}>
                    <option value="">Select Session</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.name} {s.is_active ? '(Active)' : ''}</option>
                    ))}
                  </Select>
                </ControlField>

                <ControlGrid>
                  <ControlField>
                    <Label>Source Class</Label>
                    <Select value={sourceClass} onChange={e => {
                      e.preventDefault();
                      setSourceClass(e.target.value);
                    }}>
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </Select>
                  </ControlField>

                  {(() => {
                    const selectedClass = classes.find(c => String(c.id) === String(sourceClass));
                    const hasSections = selectedClass?.has_sections ?? true;
                    return hasSections ? (
                      <ControlField>
                        <Label>Source Section</Label>
                        <Select value={sourceSection} onChange={e => {
                          e.preventDefault();
                          setSourceSection(e.target.value);
                        }} disabled={!sourceClass}>
                          <option value="">Select Section</option>
                          {sourceSections.map(sec => (
                            <option key={sec.id} value={sec.id}>{sec.name}</option>
                          ))}
                        </Select>
                      </ControlField>
                    ) : null;
                  })()}
                </ControlGrid>
              </FormSection>

              <FormSection>
                <FormSectionTitle>📥 Target Information</FormSectionTitle>

                {action === 'passout' ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    padding: '1rem',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1.5px dashed rgba(245, 158, 11, 0.5)',
                    borderRadius: '8px',
                    color: (theme as any).BG === '#252525' ? '#fbbf24' : '#92400e',
                    fontSize: '0.9rem',
                    lineHeight: 1.6
                  }}>
                    <div style={{ fontSize: '1.3rem' }}>🎓</div>
                    <div>
                      <strong>Passout action selected.</strong><br />
                      No target class or section is required. The selected students&apos; status will be set to
                      &nbsp;<strong>Passed Out</strong> and their existing class and section will remain unchanged.
                    </div>
                  </div>
                ) : (
                  <>
                    <ControlField>
                      <Label>Target Session</Label>
                      <Select value={activeSession?.id || ''} disabled>
                        <option value={activeSession?.id || ''}>{activeSession?.name || 'Active Session'}</option>
                      </Select>
                    </ControlField>

                    <ControlGrid>
                      <ControlField>
                        <Label>Target Class</Label>
                        <Select value={targetClass} onChange={e => {
                          e.preventDefault();
                          setTargetClass(e.target.value);
                        }} disabled={!sourceClass}>
                          <option value="">Select Class</option>
                          {classes
                            .filter((cls, idx) => {
                              const currentIdx = classes.findIndex(c => String(c.id) === sourceClass);
                              const targetIdx = action === 'promote' ? currentIdx + 1 : currentIdx - 1;
                              return targetIdx >= 0 && targetIdx < classes.length && classes[targetIdx].id === cls.id;
                            })
                            .map(cls => (
                              <option key={cls.id} value={cls.id}>{cls.name}</option>
                            ))}
                        </Select>
                      </ControlField>

                      {(() => {
                        const selectedClass = classes.find(c => String(c.id) === String(targetClass));
                        const hasSections = selectedClass?.has_sections ?? true;
                        return hasSections ? (
                          <ControlField>
                            <Label>Target Section</Label>
                            <Select value={targetSection} onChange={e => {
                              e.preventDefault();
                              setTargetSection(e.target.value);
                            }} disabled={!targetClass}>
                              <option value="">Select Section</option>
                              {targetSections.map(sec => (
                                <option key={sec.id} value={sec.id}>{sec.name}</option>
                              ))}
                            </Select>
                          </ControlField>
                        ) : null;
                      })()}
                    </ControlGrid>

                    <ControlField>
                      <Label>Target Status</Label>
                      <Select value={targetStatus} onChange={e => {
                        e.preventDefault();
                        setTargetStatus(e.target.value);
                      }}>
                        <option value="retain">Retain Current Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="withdrawn">Withdrawn</option>
                      </Select>
                    </ControlField>
                  </>
                )}
              </FormSection>
            </FormRow>
          </form>

          <ActionSelector>
            <Label>Action Type</Label>
            <ActionToggle>
              <ToggleButton
                active={action === 'promote'}
                onClick={(e) => {
                  e.preventDefault();
                  setAction('promote');
                }}
              >
                Promote
              </ToggleButton>
              <ToggleButton
                active={action === 'demote'}
                onClick={(e) => {
                  e.preventDefault();
                  setAction('demote');
                }}
              >
                Demote
              </ToggleButton>
              <ToggleButton
                active={action === 'passout'}
                onClick={(e) => {
                  e.preventDefault();
                  setAction('passout');
                }}
                style={action === 'passout' ? { background: '#f59e0b', color: '#fff' } : {}}
              >
                🎓 Passout
              </ToggleButton>
            </ActionToggle>
          </ActionSelector>
        </ControlPanel>

        <StudentsGrid>
          <StudentsCard>
            <CardHeader>
              <CardTitle>
                Source Students
                {sourceStudents.length > 0 && (
                  <StatusIndicator type="info">
                    {selectedStudents.size} of {sourceStudents.length} selected
                  </StatusIndicator>
                )}
              </CardTitle>
              <StudentCount>{sourceStudents.length}</StudentCount>
            </CardHeader>
            <TableContainer>
              <Table>
                <thead>
                  <tr>
                    <Th>
                      <SerialCheckbox
                        className={selectedStudents.size === sourceStudents.length && sourceStudents.length > 0 ? 'checked' : ''}
                        onClick={(e) => {
                          e.preventDefault();
                          handleSelectAll(selectedStudents.size !== sourceStudents.length || sourceStudents.length === 0);
                        }}
                        title={selectedStudents.size === sourceStudents.length && sourceStudents.length > 0 ? 'Deselect all students' : 'Select all students'}
                      >
                        {selectedStudents.size === sourceStudents.length && sourceStudents.length > 0 ? '✓' : '○'}
                      </SerialCheckbox>
                    </Th>
                    <Th>Student</Th>
                    <Th>Father</Th>
                  </tr>
                </thead>
                <tbody>
                  {sourceStudents.map((student, idx) => (
                    <tr key={student.id}>
                      <Td>
                        <SerialCheckbox
                          className={selectedStudents.has(student.id) ? 'checked' : ''}
                          onClick={(e) => {
                            e.preventDefault();
                            handleStudentCheck(student.id, !selectedStudents.has(student.id));
                          }}
                          title={selectedStudents.has(student.id) ? 'Deselect student' : 'Select student'}
                        >
                          {idx + 1}
                        </SerialCheckbox>
                      </Td>
                      <Td>
                        <StudentInfo>
                          <Avatar>
                            {student.picture_url ? (
                              <img
                                src={student.picture_url}
                                alt={student.name}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  borderRadius: '8px',
                                  objectFit: 'cover',
                                  display: 'block'
                                }}
                              />
                            ) : (
                              <span style={{ width: '100%', textAlign: 'center' }}>
                                {(student.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?')}
                              </span>
                            )}
                          </Avatar>
                          <div>
                            <StudentName>{getStudentDisplayId(student)} - {student.name}</StudentName>
                          </div>
                        </StudentInfo>
                      </Td>
                      <Td>{student.father_name || 'N/A'}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableContainer>
          </StudentsCard>

          <StudentsCard>
            <CardHeader>
              <CardTitle>Target Students</CardTitle>
              <StudentCount>{targetStudents.length}</StudentCount>
            </CardHeader>
            <TableContainer>
              <Table>
                <thead>
                  <tr>
                    <Th>#</Th>
                    <Th>Student</Th>
                    <Th>Father</Th>
                  </tr>
                </thead>
                <tbody>
                  {targetStudents.map((student, idx) => (
                    <tr key={student.id}>
                      <Td>
                        <SerialCheckbox
                          className=""
                          style={{ cursor: 'default', background: '#f5f5f5', color: '#666', borderColor: '#ddd' }}
                        >
                          {idx + 1}
                        </SerialCheckbox>
                      </Td>
                      <Td>
                        <StudentInfo>
                          <Avatar>
                            {student.picture_url ? (
                              <img
                                src={student.picture_url}
                                alt={student.name}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  borderRadius: '8px',
                                  objectFit: 'cover',
                                  display: 'block'
                                }}
                              />
                            ) : (
                              <span style={{ width: '100%', textAlign: 'center' }}>
                                {(student.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?')}
                              </span>
                            )}
                          </Avatar>
                          <div>
                            <StudentName>{getStudentDisplayId(student)} - {student.name}</StudentName>
                          </div>
                        </StudentInfo>
                      </Td>
                      <Td>{student.father_name || 'N/A'}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableContainer>
          </StudentsCard>
        </StudentsGrid>
      </MainContent>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <ModalOverlay>
          <ModalBox>
            <ModalHeader>
              <ModalTitle>
                <SchoolIcon style={{ fontSize: '1.4rem' }} />
                Confirm {action === 'promote' ? 'Promotion' : action === 'demote' ? 'Demotion' : 'Passout'}
              </ModalTitle>
            </ModalHeader>

            <ModalContent>
              <ModalText>
                {action === 'passout' ? (
                  <>Are you sure you want to mark <strong>{selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''}</strong> from{' '}
                    <strong>{classes.find(c => c.id === parseInt(sourceClass))?.name}</strong> as <strong>Passed Out</strong>?{' '}
                    Their status will be updated to &quot;passout&quot; and their class/section will remain unchanged.</>
                ) : (
                  <>Are you sure you want to {action} <strong>{selectedStudents.size} students</strong> from{' '}
                    <strong>{classes.find(c => c.id === parseInt(sourceClass))?.name}</strong> to{' '}
                    <strong>{classes.find(c => c.id === parseInt(targetClass))?.name}</strong>?</>
                )}
              </ModalText>

              <div>
                <h4 style={{ marginBottom: '0.5rem', color: (theme as any).TEXT_PRIMARY }}>
                  Selected Students:
                </h4>
                <StudentList>
                  {sourceStudents
                    .filter(student => selectedStudents.has(student.id))
                    .map(student => (
                      <StudentItem key={student.id}>
                        <StudentListItemName>
                          {getStudentDisplayId(student)} - {student.name}
                        </StudentListItemName>
                      </StudentItem>
                    ))}
                </StudentList>
              </div>

              {targetClassStudentsCount > 0 && (
                <InfoBox type="warning">
                  <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                  <div>
                    <strong>Warning:</strong> The target class already has {targetClassStudentsCount} student{targetClassStudentsCount !== 1 ? 's' : ''} in it.
                    This will add {selectedStudents.size} more student{selectedStudents.size !== 1 ? 's' : ''} to the same class.
                  </div>
                </InfoBox>
              )}

              <InfoBox type="success">
                <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
                <div>
                  <strong>Note:</strong> This action will update the student records and create history entries for tracking purposes.
                </div>
              </InfoBox>
            </ModalContent>

            <ModalFooter>
              <ModalButton
                onClick={(e) => {
                  e.preventDefault();
                  setShowConfirmModal(false);
                }}
                disabled={processing}
              >
                Cancel
              </ModalButton>
              <ModalButton
                variant="primary"
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmModalConfirm();
                }}
                disabled={processing}
              >
                {processing ? 'Processing...' : `Confirm ${action === 'promote' ? 'Promotion' : action === 'demote' ? 'Demotion' : 'Passout'}`}
              </ModalButton>
            </ModalFooter>
          </ModalBox>
        </ModalOverlay>
      )}
    </Container>
  );
};

export default BulkPromoteDemote; 
