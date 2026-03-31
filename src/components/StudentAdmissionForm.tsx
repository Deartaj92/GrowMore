import React, { useState, useContext, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import styled, { ThemeProvider, keyframes, createGlobalStyle } from 'styled-components';
import { AccountCircle, Add as AddIcon, Refresh as RefreshIcon, Close as CloseIcon, Save as SaveIcon, Description as DescriptionIcon, FamilyRestroom, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { ThemeContext, darkTheme, lightTheme, useProgress } from './Layout';
import { sortClasses } from '../utils/classUtils';
import { getStudentDisplayId } from '../utils/studentUtils';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { supabase } from '../supabaseClient';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  CircularProgress,
  SelectChangeEvent,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Grid,
  Typography,
  Avatar,
  Button,
  Button as MuiButton,
  useTheme,
  useMediaQuery,
  Chip,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import NoSessionsFound from './NoSessionsFound';
import NoClassesFound from './NoClassesFound';
import NoSectionsFound from './NoSectionsFound';
import { CreateFeePlanModal } from '../pages/FeePlans/components/CreateFeePlanModal';
import { FeeHead } from '../types/fee';
import { StudentInfo } from '../pages/FeePlans/types';
import { feeService } from '../services/feeService';
import {
  clayCardStyle,
  clayButtonStyle,
  neumorphFieldStyle,
  getFieldPalette,
  getLayoutPalette,
  CARD_RADIUS_LG,
  CARD_RADIUS_MD,
} from '../styles/DesignSystem';

import Loader from '../components/Loader';
// --- Modern Compact Form Layout ---
const FormWrapper = styled.form`
  width: 100%;
  height: auto;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: visible;
  min-height: 0;
  background: ${({ theme }) => theme.BG};
`;

const Container = styled(Box)`
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
  height: auto;
  min-height: 0;
`;

const MainCard = styled(Box)`
  background: transparent;
  border: none;
  box-shadow: none;
  border-radius: 0;
  padding: 0;
  flex: 1;
  min-width: 0;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  
  @media (min-width: 960px) {
    padding: 0;
    min-height: auto;
  }
  
  @media (max-width: 959px) {
    min-height: auto;
  }
`;

const SidebarCard = styled(Box)`
  background: transparent;
  border: none;
  box-shadow: none;
  border-radius: 0;
  padding: 0;
  margin-top: 80px;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: fit-content;
  max-height: calc(100vh - 16px);
  overflow-y: auto;
  
  @media (min-width: 960px) {
    min-height: auto;
    align-items: stretch;
  }
  
  @media (max-width: 959px) {
    position: relative;
    top: 0;
    margin-top: 0;
    margin-bottom: 0;
    max-height: none;
    min-height: auto;
  }
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => getLayoutPalette(theme).dropdownThumb};
    border-radius: 3px;
    
    &:hover {
      background: ${({ theme }) => getLayoutPalette(theme).dropdownThumbHover};
    }
  }
`;

const AvatarWrapper = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
  width: 100%;
`;

const ImageBox = styled(Box)`
  width: 100%;
  max-width: 280px;
  aspect-ratio: 1;
  border-radius: ${CARD_RADIUS_LG};
  border: 1.5px solid ${({ theme }) => getLayoutPalette(theme).surfaceBorder};
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  position: relative;
  margin: 0 auto;
  
  &:hover {
    border-color: ${({ theme }) => getLayoutPalette(theme).surfaceHoverBorder};
    box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceHoverShadow};
  }
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  @media (max-width: 959px) {
    max-width: 200px;
  }
  
  @media (min-width: 960px) and (max-width: 1279px) {
    max-width: 240px;
  }
`;

const ButtonRow = styled(Box)`
  display: flex;
  gap: 8px;
  width: 100%;
  max-width: 280px;
  margin: 12px auto 0 auto;
  align-items: center;
  justify-content: center;
  
  button {
    flex: 1;
  }
  
  @media (max-width: 959px) {
    max-width: 200px;
  }
  
  @media (min-width: 960px) and (max-width: 1279px) {
    max-width: 240px;
  }
`;

const ActionButtonsContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: auto;
  padding-top: 20px;
  width: 100%;
  max-width: 280px;
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 959px) {
    max-width: 200px;
  }

  @media (min-width: 960px) and (max-width: 1279px) {
    max-width: 240px;
  }
`;

const RemoveBtn = styled(Button).attrs({ $variant: 'danger' })`
  ${clayButtonStyle}
  border-radius: ${CARD_RADIUS_MD};
  padding: 8px 16px;
  font-size: 0.75rem;
  text-transform: none;
  min-width: 0;
  flex: 1;

  svg {
    font-size: 16px;
  }
`;

const SectionHeader = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

const SectionBadge = styled(Box)`
  width: 24px;
  height: 24px;
  border-radius: ${CARD_RADIUS_MD};
  background: ${({ theme }) => theme.ACCENT_INPUT};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
`;

const CompactTextField = styled(TextField)`
  & .MuiOutlinedInput-root {
    border-radius: ${CARD_RADIUS_MD};
    font-size: 0.875rem;
    background: ${({ theme }) => getFieldPalette(theme).bg};
    border: 1.5px solid ${({ theme }) => getFieldPalette(theme).border};
    box-shadow: ${({ theme }) => getFieldPalette(theme).shadow};
    
    input {
      padding: 10px 12px;
    }

    fieldset {
      border: none;
    }

    &:hover {
      border-color: ${({ theme }) => getFieldPalette(theme).hoverBorder};
      box-shadow: ${({ theme }) => getFieldPalette(theme).hoverShadow};
    }

    &.Mui-focused {
      border-color: ${({ theme }) => theme.ACCENT_INPUT};
      box-shadow: ${({ theme }) => getFieldPalette(theme).focusShadow};
    }
  }
  
  & .MuiInputLabel-root {
    font-size: 0.875rem;
  }
`;

const CompactSelect = styled(FormControl)`
  & .MuiOutlinedInput-root {
    border-radius: ${CARD_RADIUS_MD};
    font-size: 0.875rem;
    background: ${({ theme }) => getFieldPalette(theme).bg};
    border: 1.5px solid ${({ theme }) => getFieldPalette(theme).border};
    box-shadow: ${({ theme }) => getFieldPalette(theme).shadow};
    
    .MuiSelect-select {
      padding: 10px 12px;
    }

    fieldset {
      border: none;
    }

    &:hover {
      border-color: ${({ theme }) => getFieldPalette(theme).hoverBorder};
      box-shadow: ${({ theme }) => getFieldPalette(theme).hoverShadow};
    }

    &.Mui-focused {
      border-color: ${({ theme }) => theme.ACCENT_INPUT};
      box-shadow: ${({ theme }) => getFieldPalette(theme).focusShadow};
    }
  }
  
  & .MuiInputLabel-root {
    font-size: 0.875rem;
  }
`;

const ActionButton = styled(Button)`
  ${clayButtonStyle}
  border-radius: ${CARD_RADIUS_MD};
  padding: 10px 20px;
  font-weight: 500;
  text-transform: none;
  font-size: 0.875rem;
  min-width: 0;
  width: 100%;
`;

const PrimaryButton = styled(ActionButton).attrs({ $variant: 'primary' })`
  &:disabled {
    opacity: 0.5;
  }
`;

const SecondaryButton = styled(ActionButton).attrs({ $variant: 'secondary' })``;

const UploadButton = styled(ActionButton).attrs({ $variant: 'secondary' })`
  font-size: 0.75rem;
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
`;

const ImageActionIconButton = styled(Button)<{ $variant?: 'secondary' | 'danger' }>`
  ${clayButtonStyle}
  width: 40px;
  min-width: 40px;
  height: 40px;
  padding: 0;
  border-radius: ${CARD_RADIUS_MD};
  flex: 0 0 40px;

  .MuiButton-startIcon {
    margin: 0;
  }

  svg {
    font-size: 18px;
  }
`;

const ModernForm = FormWrapper;

const StickyHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
  margin-bottom: 16px;
  ${clayCardStyle}
  border-radius: ${CARD_RADIUS_LG};
  padding: 12px 20px;
  min-height: 48px;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const SectionContainer = styled.div`
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
  
  @media (max-width: 700px) {
    margin-bottom: 16px;
  }
`;

const ModernGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  width: 100%;
  padding: 0;
  box-sizing: border-box;
  
  @media (max-width: 1400px) {
    grid-template-columns: repeat(3, 1fr);
  }
  
  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

const Field = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  width: 100%;
`;

const Label = styled.label`
  font-size: 0.92rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const shake = keyframes`
  0% { box-shadow: 0 0 0 0 red; }
  20% { box-shadow: 0 0 0 2px red; }
  40% { box-shadow: 0 0 0 0 red; }
  60% { box-shadow: 0 0 0 2px red; }
  100% { box-shadow: 0 0 0 0 red; }
`;

const Input = styled.input<{invalid?: boolean}>`
  ${neumorphFieldStyle}
  padding: 7px 10px;
  border-radius: ${CARD_RADIUS_MD};
  font-size: 0.98rem;
  animation: ${({invalid}) => invalid ? shake : 'none'} 0.5s;
  width: 100%;
  box-sizing: border-box;
  &:-webkit-autofill,
  &:-webkit-autofill:focus,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:active {
    -webkit-box-shadow: none !important;
    -webkit-text-fill-color: ${({ theme }) => theme.TEXT_PRIMARY} !important;
    transition: background-color 5000s ease-in-out 0s;
    caret-color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

const Textarea = styled.textarea`
  ${neumorphFieldStyle}
  padding: 7px 10px;
  border-radius: ${CARD_RADIUS_MD};
  font-size: 0.98rem;
  min-height: 48px;
  width: 100%;
  box-sizing: border-box;
  &:-webkit-autofill,
  &:-webkit-autofill:focus,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:active {
    -webkit-box-shadow: none !important;
    -webkit-text-fill-color: ${({ theme }) => theme.TEXT_PRIMARY} !important;
    transition: background-color 5000s ease-in-out 0s;
    caret-color: ${({ theme }) => theme.TEXT_PRIMARY};
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

const ToastMsg = styled.div<{type: 'error' | 'success', themeMode: 'dark' | 'light'}>`
  min-width: 220px;
  background: ${({type, themeMode}) => type === 'error' ? (themeMode === 'dark' ? '#ff3b3b' : '#ff5252') : (themeMode === 'dark' ? '#4caf50' : '#43a047')};
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

// Confirmation dialog
const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.25);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
`;
const ModalBox = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${({theme}) => theme.CARD};
  color: ${({theme}) => theme.TEXT_PRIMARY};
  border-radius: 16px;
  box-shadow: 0 8px 32px #0007;
  padding: 32px 36px 24px 36px;
  min-width: 320px;
  width: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1.5px solid ${({theme}) => theme.FIELD_BORDER};
  @media (max-width: 700px) {
    min-width: 0;
    width: 95vw;
    padding: 12px 2vw;
  }
`;
const ModalActions = styled.div`
  display: flex;
  gap: 18px;
  margin-top: 24px;
`;
const ModalButton = styled.button`
  padding: 10px 28px;
  border-radius: 8px;
  border: 1.5px solid ${props => props.theme.FIELD_BORDER};
  font-size: 1.08rem;
  font-weight: 600;
  cursor: pointer;
  background: #4a6cf7;
    color: #fff;
  transition: background 0.18s, border 0.18s;
  overflow-wrap: break-word;
  &:hover { background: #274bb5; border-color: #274bb5; }
`;
const ModalCancel = styled(ModalButton)`
  background: ${props => props.theme.CANCEL_BG};
  color: ${props => props.theme.CANCEL_COLOR};
  &:hover, &:focus { background: ${props => props.theme.ACCENT_INPUT}; color: #fff; border-color: ${props => props.theme.ACCENT_INPUT}; }
`;

const getToday = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};


const TwoColRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;
  width: 100%;
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
`;

const UniqueLoadingOverlay = styled.div`
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

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'];
const RELIGIONS = ['Muslim', 'Christianity', 'Hinduism', 'Sikhism', 'Other'];
const NATIONALITIES = ['Pakistani', 'Indian', 'Afghan', 'Bangladeshi', 'Other'];

// Add a styled prefix for Rs.
const RsPrefix = styled.span`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #888;
  font-size: 0.98rem;
  pointer-events: none;
`;
const RsInputWrapper = styled.div`
  position: relative;
  width: 100%;
`;

// Skeleton loading components
const shimmer = keyframes`
  0% { 
    transform: translateX(-100%);
  }
  100% { 
    transform: translateX(100%);
  }
`;

const isDark = (theme: any) => theme.BG === '#252525' || theme.BG === '#181c2a';

const SkeletonBase = styled.div`
  position: relative;
  overflow: hidden;
  background: ${({ theme }) => isDark(theme) ? '#2a2a2a' : '#f5f5f5'};
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
      ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'},
      transparent
    );
    animation: ${shimmer} 2.5s ease-in-out infinite;
  }
`;

const FormSkeletonContainer = styled.div`
  width: 100%;
  height: 100%;
  padding: 24px;
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  gap: 32px;
  background: ${({ theme }) => theme.BG};
  @media (max-width: 900px) {
    flex-direction: column;
    gap: 18px;
  }
  @media (max-width: 700px) {
    padding: 0;
  }
`;

const SkeletonCardBlock = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 24px;
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 2px 8px rgba(0, 0, 0, 0.2)'
    : '0 2px 8px rgba(0, 0, 0, 0.08)'};
  padding: 48px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 280px;
  max-width: 340px;
  flex: 0 0 300px;
  position: relative;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  backdrop-filter: blur(8px);
  @media (max-width: 900px) {
    width: 100%;
    max-width: 100vw;
    min-width: 0;
    padding: 32px 16px;
    margin-bottom: 0;
    border-radius: 16px;
  }
  @media (max-width: 700px) {
    background: transparent;
    border: none;
    box-shadow: none;
    padding: 0;
    border-radius: 0;
  }
`;

const SkeletonAvatar = styled(SkeletonBase)`
  width: 96px;
  height: 96px;
  border-radius: 50%;
  margin: 8px 8px 48px 8px;
  background: ${({ theme }) => isDark(theme) ? '#333333' : '#e8e8e8'};
  @media (max-width: 900px) {
    width: 72px;
    height: 72px;
  }
  @media (max-width: 700px) {
    width: 120px;
    height: 120px;
  }
`;

const SkeletonButton = styled(SkeletonBase)`
  width: 100%;
  height: 48px;
  border-radius: 12px;
  margin-bottom: 16px;
  background: ${({ theme }) => isDark(theme) ? '#333333' : '#e8e8e8'};
  @media (max-width: 900px) {
    max-width: 200px;
  }
`;

const SkeletonFieldsCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 18px;
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 2px 8px rgba(0, 0, 0, 0.2)'
    : '0 2px 8px rgba(0, 0, 0, 0.08)'};
  padding: 32px 24px;
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  z-index: 1;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  @media (max-width: 900px) {
    width: 100%;
    padding: 18px 8px;
    border-radius: 12px;
  }
  @media (max-width: 700px) {
    padding: 12px 4px;
    border-radius: 8px;
  }
`;

const SkeletonTitle = styled(SkeletonBase)`
  width: 60%;
  height: 32px;
  border-radius: 8px;
  margin: 0 auto 24px auto;
  background: ${({ theme }) => isDark(theme) ? '#333333' : '#e8e8e8'};
`;

const SkeletonInfoBox = styled(SkeletonBase)`
  width: 100%;
  height: 40px;
  border-radius: 8px;
  margin-bottom: 16px;
  background: ${({ theme }) => isDark(theme) ? '#2a2a2a' : '#f5f5f5'};
`;

const SkeletonSectionTitle = styled(SkeletonBase)`
  width: 40%;
  height: 24px;
  border-radius: 6px;
  margin: 18px 0 8px 0;
  background: ${({ theme }) => isDark(theme) ? '#333333' : '#e8e8e8'};
`;

const SkeletonGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 24px 16px;
  width: 100%;
  flex: 1;
  min-height: 0;
  padding: 0 24px;
  box-sizing: border-box;
  @media (max-width: 1200px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
  @media (max-width: 900px) {
    grid-template-columns: 1fr 1fr;
    padding: 0;
  }
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 0;
  }
`;

const SkeletonField = styled(SkeletonBase)`
  width: 100%;
  height: 48px;
  border-radius: 8px;
  background: ${({ theme }) => isDark(theme) ? '#333333' : '#e8e8e8'};
`;

const SkeletonTextArea = styled(SkeletonBase)`
  width: 100%;
  height: 80px;
  border-radius: 8px;
  background: ${({ theme }) => isDark(theme) ? '#333333' : '#e8e8e8'};
`;

const SkeletonHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${({ theme }) => theme.CARD};
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  border-radius: 16px;
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 2px 8px rgba(0, 0, 0, 0.2)'
    : '0 2px 8px rgba(0, 0, 0, 0.08)'};
  padding: 12px 24px 10px 24px;
  min-height: 36px;
  margin: 16px 0 18px 0;
  width: 100%;
  @media (max-width: 700px) {
    padding: 8px 12px 6px 12px;
    margin: 12px 0 12px 0;
    border-radius: 12px;
  }
`;

const SkeletonHeaderTitle = styled(SkeletonBase)`
  width: 180px;
  height: 22px;
  border-radius: 8px;
  margin-right: 18px;
  background: ${({ theme }) => isDark(theme) ? '#333333' : '#e8e8e8'};
`;

const SkeletonSegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SkeletonSegmentedButton = styled(SkeletonBase)`
  width: 38px;
  height: 32px;
  border-radius: 8px;
  background: ${({ theme }) => isDark(theme) ? '#333333' : '#e8e8e8'};
  @media (max-width: 700px) {
    height: 26px;
  }
`;

const LastInsertedFeed = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)'};
  border: 1px solid ${({ theme }) => theme.BG === '#252525' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)'};
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.BG === '#252525' ? '#e2e8f0' : '#4a5568'};
  font-weight: 500;
  max-width: 450px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 5;
  animation: slideInFromRight 0.4s ease-out;
  
  @keyframes slideInFromRight {
    0% {
      transform: translateX(100%);
      opacity: 0;
    }
    100% {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .student-id {
    color: ${({ theme }) => theme.ACCENT};
    font-weight: 700;
    margin-right: 4px;
  }
  
  .student-name {
    font-weight: 600;
    margin-right: 4px;
  }
  
  .student-father {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    margin-right: 4px;
  }
  
  .student-class {
    color: ${({ theme }) => theme.ACCENT};
    font-weight: 600;
  }
  
  
  .feed-label {
    color: ${({ theme }) => theme.ACCENT};
    font-size: 0.65rem;
    font-weight: 700;
    margin-right: 6px;
    opacity: 0.9;
  }
  
  @media (max-width: 700px) {
    position: static;
    margin: 8px 0;
    max-width: 100%;
    text-align: center;
    font-size: 0.8rem;
    padding: 8px 12px;
  }
`;



// --- Segmented Button Styles: Exact copy from StudentList.tsx ---
const SEGMENTED_HEIGHT = '32px';
const SEGMENTED_HEIGHT_MOBILE = '26px';

const SegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.BG === '#252525' ? '#222' : '#f3f4f6'};
  border-radius: 11px;
  box-shadow: 1.4px 1.4px 4px #2222;
  overflow: hidden;
  @media (max-width: 700px) {
    /* Keep desktop look, just a bit smaller */
    border-radius: 9px;
    box-shadow: 1px 1px 3px #2222;
    width: 100%;
    flex: 1;
  }
`;

const SegmentedButton = styled.button<{ first?: boolean; last?: boolean }>`
  font-family: inherit;
  font-size: 0.77em;
  font-weight: 400;
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  box-shadow: 1.4px 1.4px 4px #2222;
  border: none;
  outline: none;
  transition: background 0.2s, height 0.2s, font-size 0.2s, padding 0.2s;
  appearance: none;
  background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#f3f4f6'};
  color: ${({ theme }) => theme.BG === '#252525' ? '#C0C0C0' : theme.TEXT_PRIMARY};
  padding: 0 1.12em;
  display: flex;
  align-items: center;
  gap: 0.35em;
  border-radius: 0;
  flex: 1;
  justify-content: center;
  ${({ first }) => first && `
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  `}
  ${({ last }) => last && `
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  cursor: pointer;
  border-right: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  &:last-child { border-right: none; }
  margin: 0;
  &:hover, &:focus {
    background: ${({ theme }) => theme.BG === '#252525' ? '#353535' : '#e5e7eb'};
    opacity: 0.92;
  }
  & svg {
    font-size: 15px;
    vertical-align: middle;
    display: inline-block;
    transition: font-size 0.2s;
  }
  @media (max-width: 700px) {
    height: ${SEGMENTED_HEIGHT_MOBILE};
    line-height: ${SEGMENTED_HEIGHT_MOBILE};
    font-size: 0.93em;
    padding: 0 0.85em;
    flex: 1;
    & svg {
      font-size: 13px;
    }
  }
`;

const StandaloneFeePlanButton = styled.button`
  font-family: inherit;
  font-size: 0.93em;
  font-weight: 400;
  height: ${SEGMENTED_HEIGHT_MOBILE};
  line-height: ${SEGMENTED_HEIGHT_MOBILE};
  box-shadow: 1px 1px 3px #2222;
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#f3f4f6'};
  color: ${({ theme }) => theme.BG === '#252525' ? '#C0C0C0' : theme.TEXT_PRIMARY};
  padding: 0 0.85em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35em;
  border-radius: 9px;
  cursor: pointer;
  margin: 0;
  width: 100%;
  &:hover, &:focus {
    background: ${({ theme }) => theme.BG === '#252525' ? '#353535' : '#e5e7eb'};
    opacity: 0.92;
  }
  & svg {
    font-size: 13px;
    vertical-align: middle;
    display: inline-block;
  }
  @media (min-width: 701px) {
    display: none;
  }
`;

// --- Layout and Section Styles copied from StudentList.tsx ---
const PageContainer = styled.div`
  width: 100%;
  height: auto;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: none;
  overflow: visible;
  min-height: 100%;
  display: flex;
  flex-direction: column;
`;

const Header = StickyHeader;

const FooterCard = styled.div`
  ${clayCardStyle}
  border-radius: ${CARD_RADIUS_LG};
  padding: 16px 24px 14px 24px;
  margin-top: 18px;
  width: 100%;
`;

const MainContent = styled.div`
  flex: 1 1 auto;
  min-height: auto;
  height: auto;
  overflow: visible;
  padding: 8px 12px 16px;
  
  @media (min-width: 1200px) {
    padding: 10px 16px 20px;
  }

  @media (max-width: 700px) {
    padding: 8px 8px 16px;
  }
`;

const GlobalStyle = createGlobalStyle<{
  fieldBg: string;
  textColor: string;
}>`
  /* Removed .seg-btn-text display: none for mobile to always show button text */
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

const StudentAdmissionForm: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const themeObj = theme === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth();
  const { setLoading, loading } = useLoading();
  const { startProgress, completeProgress, setProgress } = useProgress();
  const progressActiveRef = useRef(false);
  const [image, setImage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    registrationNo: '',
    class: '',
    section: '',
    admissionDate: getToday(),
    phone: '',
    notificationChannel: 'whatsapp' as 'whatsapp' | 'sms',
    picture: null as string | null,
    pictureFile: null as File | null,
    dob: '2000-01-01',
    studentId: '',
    gender: 'Male', // Set default gender
    cast: '',
    orphan: '',
    osc: '',
    idMark: '',
    bloodGroup: '',
    previousSchool: '',
    previousId: '',
    religion: 'Muslim', // Set default religion
    nationality: 'Pakistani',
    disease: '',
    additionalNote: '',
    totalSiblings: '',
    address: '',
    fatherName: '',
    fatherNationalId: '',
    fatherEducation: '',
    fatherMobile: '',
    fatherOccupation: '',
    fatherIncome: '',
    motherName: '',
    motherNationalId: '',
    motherEducation: '',
    motherMobile: '',
    motherOccupation: '',
    motherIncome: '',
    family: '', // Family ID or 'new' for new family
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const fatherRef = useRef<HTMLInputElement>(null);
  const classRef = useRef<HTMLSelectElement>(null);
  const sectionRef = useRef<HTMLSelectElement>(null);
  const [toasts, setToasts] = useState<Array<{msg: string, type: 'error' | 'success', id: number}>>([]);
  const toastId = useRef(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [classes, setClasses] = useState<{id: string, name: string, has_sections?: boolean}[]>([]);
  const [sections, setSections] = useState<{id: string, name: string}[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [classIdWarning, setClassIdWarning] = useState('');
  const navigate = useNavigate();
  const [activeSession, setActiveSession] = useState<any>(null);
  const [hasClasses, setHasClasses] = useState(true);
  const [hasSections, setHasSections] = useState(true);
  const [currentStudentCount, setCurrentStudentCount] = useState<number>(0);
  const [lastInsertedStudent, setLastInsertedStudent] = useState<{
    id: number;
    roll_number?: string | null;
    name: string;
    fatherName: string;
    className: string;
    sectionName: string;
    timestamp: Date;
  } | null>(null);
  const [selectedClassHasSections, setSelectedClassHasSections] = useState<boolean>(true);
  const [showFeePlanModal, setShowFeePlanModal] = useState(false);
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [newStudentForFeePlan, setNewStudentForFeePlan] = useState<StudentInfo | null>(null);
  const [saveAndCreateFeePlan, setSaveAndCreateFeePlan] = useState(false);
  const [families, setFamilies] = useState<any[]>([]);
  const [loadingFamilies, setLoadingFamilies] = useState(false);
  const [showNewFamilyModal, setShowNewFamilyModal] = useState(false);
  const [newFamilyForm, setNewFamilyForm] = useState({
    name: '',
    address: '',
    contact_number: '',
    avatar_url: '',
  });
  const [familyAvatarFile, setFamilyAvatarFile] = useState<File | null>(null);
  const [familyAvatarPreview, setFamilyAvatarPreview] = useState<string | null>(null);
  const [creatingFamily, setCreatingFamily] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);
  const fieldPalette = useMemo(() => getFieldPalette(themeObj), [themeObj]);
  const selectMenuProps = useMemo(() => ({
    PaperProps: {
      sx: {
        bgcolor: fieldPalette.menuBg,
        color: fieldPalette.menuText,
        border: `1px solid ${fieldPalette.border}`,
        boxShadow: fieldPalette.shadow,
        mt: 0.5,
        '& .MuiList-root': {
          py: 0.5,
        },
        '& .MuiMenuItem-root': {
          color: fieldPalette.menuText,
        },
        '& .MuiMenuItem-root.Mui-selected': {
          backgroundColor: `${themeObj.ACCENT}22`,
        },
        '& .MuiMenuItem-root.Mui-selected:hover': {
          backgroundColor: `${themeObj.ACCENT}2e`,
        },
        '& .MuiMenuItem-root:hover': {
          backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)',
        },
      },
    },
  }), [fieldPalette, themeObj, theme]);

  // Helper function to generate next available student ID (school-specific)
  const generateNextStudentId = async (): Promise<number> => {
    try {
      if (!user?.school_id) {
        throw new Error('School ID not found');
      }

      // Get the highest student ID for this school
      const { data: existingStudents, error } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', user.school_id)
        .order('id', { ascending: false })
        .limit(1);

      if (error) {
        throw new Error('Failed to generate student ID: ' + error.message);
      }

      // Calculate the next student ID (school-specific sequential)
      const nextStudentId = existingStudents && existingStudents.length > 0 
        ? existingStudents[0].id + 1 
        : 1;

      return nextStudentId;
    } catch (error) {
      throw error;
    }
  };

  // Helper function to insert student with retry mechanism for race conditions
  const insertStudentWithRetry = async (studentData: any, maxRetries: number = 5): Promise<any> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Generate a fresh ID for each attempt to avoid race conditions
        // roll_number will be auto-generated by database trigger
        if (!user?.school_id) {
          throw new Error('School ID not found');
        }
        
        const freshStudentId = await generateNextStudentId();
        studentData.id = freshStudentId;
        // Don't set roll_number - let the database trigger generate it
        
        const { data: newStudent, error: insertError } = await supabase
          .from('students')
          .insert([studentData])
          .select()
          .single();

        if (insertError) {
          // Check if it's a unique constraint violation (race condition)
          if (insertError.code === '23505' && attempt < maxRetries) {
            // Add exponential backoff delay before next attempt
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
            continue;
          }
          throw insertError;
        }

        return newStudent;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
  };

  // Fetch the last added student for this school
  const fetchLastAddedStudent = async () => {
    if (!user?.school_id) return;
    
    try {
      const { data: lastStudent, error } = await supabase
        .from('students')
        .select(`
          id,
          name,
          father_name,
          created_at,
          class_id,
          section_id,
          roll_number
        `)
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && lastStudent) {
        // Fetch class and section names separately
        let className = 'Unknown';
        let sectionName = 'Unknown';
        
        if (lastStudent.class_id) {
          const { data: classData } = await supabase
            .from('classes')
            .select('name')
            .eq('id', lastStudent.class_id)
            .single();
          className = classData?.name || 'Unknown';
        }
        
        if (lastStudent.section_id) {
          const { data: sectionData } = await supabase
            .from('sections')
            .select('name')
            .eq('id', lastStudent.section_id)
            .single();
          sectionName = sectionData?.name || 'Unknown';
        }
        
        setLastInsertedStudent({
          id: lastStudent.id,
          roll_number: lastStudent.roll_number || null,
          name: lastStudent.name,
          fatherName: lastStudent.father_name || 'N/A',
          className: className,
          sectionName: sectionName,
          timestamp: new Date(lastStudent.created_at)
        });
      }
    } catch (error) {
      // Error fetching last added student
    }
  };

  // Check for active session and classes on mount
  useEffect(() => {
    const checkPrerequisites = async () => {
      if (!user?.school_id) {
        showToast('User school information not found', 'error');
        return;
      }

      // Prevent multiple simultaneous calls
      if (progressActiveRef.current) {
        return;
      }

      const minDuration = 1500; // 1.5 seconds
      const start = Date.now();
      setLoading(true);
      progressActiveRef.current = true;

      // Start determinate progress
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

        // Check for sections for this school
        setProgress(60);
        const { data: sections, error: sectionsError } = await supabase
          .from('sections')
          .select('id')
          .eq('school_id', user.school_id)
          .limit(1);

        setHasSections(!sectionsError && sections && sections.length > 0);

        // Get current student count for this school
        setProgress(80);
        const { count: studentCount, error: countError } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', user.school_id);

        if (!countError) {
          setCurrentStudentCount(studentCount || 0);
        }

        // Fetch the last added student
        setProgress(90);
        await fetchLastAddedStudent();

        setProgress(100);
      } catch (error) {
        // Error checking prerequisites
      } finally {
        const elapsed = Date.now() - start;
        if (elapsed < minDuration) {
          setTimeout(() => {
            setLoading(false);
            completeProgress();
            progressActiveRef.current = false;
          }, minDuration - elapsed);
        } else {
          setLoading(false);
          completeProgress();
          progressActiveRef.current = false;
        }
      }
    };

    checkPrerequisites();
  }, [user?.school_id, setLoading, startProgress, setProgress, completeProgress]);

  // Cleanup effect to reset progress flag on unmount
  useEffect(() => {
    return () => {
      progressActiveRef.current = false;
    };
  }, []);

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

  // Fetch fee heads on mount
  useEffect(() => {
    const fetchFeeHeads = async () => {
      if (!user?.school_id) return;
      try {
        const heads = await feeService.getFeeHeads(user.school_id);
        setFeeHeads(heads);
      } catch (error) {
        console.error('Error fetching fee heads:', error);
      }
    };
    fetchFeeHeads();
  }, [user?.school_id]);

  // Fetch sections when class changes
  useEffect(() => {
    if (!form.class || !user?.school_id) { 
      setSections([]); 
      return; 
    }
    setLoadingSections(true);
    supabase
      .from('sections')
      .select('id, name, class_id')
      .eq('class_id', Number(form.class))
      .eq('school_id', user.school_id)
      .then(({ data, error }) => {
        setLoadingSections(false);
        if (error) {
          // Section fetch error
        }
        setSections(data || []);
    });
  }, [form.class, user?.school_id]);

  // Fetch families on mount
  useEffect(() => {
    const fetchFamilies = async () => {
      if (!user?.school_id) return;
      setLoadingFamilies(true);
      try {
        const { data, error } = await supabase
          .from('families')
          .select('id, name, contact_number, address')
          .eq('school_id', user.school_id)
          .order('name');
        if (!error && data) {
          setFamilies(data);
        }
      } catch (error) {
        // Error fetching families
      } finally {
        setLoadingFamilies(false);
      }
    };
    fetchFamilies();
  }, [user?.school_id]);

  // Mobile detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 700);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Focus name field when component is ready (after all loading and checks)
  useEffect(() => {
    if (!loading && activeSession && hasClasses && hasSections) {
      // Try multiple times to ensure focus works
      const focusAttempts = [100, 300, 500];
      const timers: NodeJS.Timeout[] = [];
      
      focusAttempts.forEach((delay) => {
        const timer = setTimeout(() => {
          if (nameRef.current) {
            nameRef.current.focus();
            // Scroll into view if needed
            nameRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, delay);
        timers.push(timer);
      });
      
      return () => {
        timers.forEach(timer => clearTimeout(timer));
      };
    }
  }, [loading, activeSession, hasClasses, hasSections]);
  

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    if (e.target.name === 'class') {
      const selectedClass = classes.find(c => c.id === e.target.value);
      const hasSections = selectedClass?.has_sections ?? true; // Default to true if not specified
      setSelectedClassHasSections(hasSections);
      
      // If class doesn't have sections, clear the section selection
      if (!hasSections) {
        setForm({ ...form, [e.target.name]: e.target.value, section: '' });
        setSections([]); // Clear sections list
      } else {
        setForm({ ...form, [e.target.name]: e.target.value });
      }
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      let file = e.target.files[0];
      // If file is larger than 100KB, compress it
      if (file.size > 100 * 1024) {
        try {
          file = await imageCompression(file, {
            maxSizeMB: 0.25,
            maxWidthOrHeight: 800,
            useWebWorker: true,
            fileType: 'image/jpeg',
            initialQuality: 0.85
          });
        } catch (err) {
          showToast('Failed to compress image', 'error');
          return;
        }
      }
      // Log the file size for debugging
      // For preview
      const reader = new FileReader();
      reader.onload = ev => setImage(ev.target?.result as string);
      reader.readAsDataURL(file);
      // Store the file for upload
      setForm(prev => ({ ...prev, pictureFile: file }));
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleReset = () => {
    setForm({
      name: '',
      registrationNo: '',
      class: '',
      section: '',
      admissionDate: getToday(),
      phone: '',
      picture: null,
      pictureFile: null,
      dob: '2000-01-01',
      studentId: '',
      gender: 'Male', // Reset to default gender
      cast: '',
      orphan: '',
      osc: '',
      idMark: '',
      bloodGroup: '',
      previousSchool: '',
      previousId: '',
      religion: 'Muslim', // Reset to default religion
      nationality: 'Pakistani',
      disease: '',
      additionalNote: '',
      totalSiblings: '',
      address: '',
      fatherName: '',
      fatherNationalId: '',
      fatherEducation: '',
      fatherMobile: '',
      fatherOccupation: '',
      fatherIncome: '',
      motherName: '',
      motherNationalId: '',
      motherEducation: '',
      motherMobile: '',
      motherOccupation: '',
      motherIncome: '',
      notificationChannel: 'whatsapp' as 'whatsapp' | 'sms',
      family: '',
    });
    setImage(null);
    setSelectedClassHasSections(true); // Reset to default
    if (fileInputRef.current) fileInputRef.current.value = '';
    setNewFamilyForm({ name: '', address: '', contact_number: '', avatar_url: '' });
    setFamilyAvatarFile(null);
    setFamilyAvatarPreview(null);
    setShowNewFamilyModal(false);
    
    // Focus name field after reset
    setTimeout(() => {
      nameRef.current?.focus();
    }, 50);
  };

  const handleVibrate = (field: string) => {
    setInvalidField(field);
    if (window.navigator.vibrate) window.navigator.vibrate(120);
    setTimeout(() => setInvalidField(null), 500);
  };

  const showToast = (msg: string, type: 'error' | 'success' = 'success') => {
    const id = toastId.current++;
    setToasts(prev => [...prev, {msg, type, id}]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2200);
  };

  // Helper to get initials
  const getInitials = (name: string) => {
    if (!name) return 'F';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  // Family handlers
  const handleFamilyChange = (e: SelectChangeEvent<string>) => {
    const value = e.target.value;
    if (value === 'new') {
      setShowNewFamilyModal(true);
      setForm({ ...form, family: '' });
    } else {
      setForm({ ...form, family: value });
    }
  };

  const handleFamilyAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      let file = e.target.files[0];
      if (file.size > 100 * 1024) {
        try {
          file = await imageCompression(file, {
            maxSizeMB: 0.09,
            maxWidthOrHeight: 400,
            useWebWorker: true,
          });
        } catch (err) {
          showToast('Failed to compress image', 'error');
          return;
        }
      }
      const reader = new FileReader();
      reader.onload = (ev) => setFamilyAvatarPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
      setFamilyAvatarFile(file);
    }
  };

  const handleCreateFamily = async () => {
    if (!newFamilyForm.name.trim()) {
      showToast('Family name is required!', 'error');
      return;
    }
    setCreatingFamily(true);
    startProgress(false);
    setProgress(20);
    try {
      let avatar_url = '';
      if (familyAvatarFile) {
        setProgress(40);
        const fileExt = familyAvatarFile.name.split('.').pop();
        const fileName = `family_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('family-avatars')
          .upload(fileName, familyAvatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('family-avatars')
          .getPublicUrl(fileName);
        avatar_url = publicUrl;
      }
      setProgress(70);
      const defaultPassword = generateRandomPassword();
      const { data: newFamily, error } = await supabase
        .from('families')
        .insert([{ 
          name: newFamilyForm.name,
          address: newFamilyForm.address,
          contact_number: newFamilyForm.contact_number,
          avatar_url,
          password: defaultPassword,
          school_id: user?.school_id 
        }])
        .select()
        .single();
      if (error) throw error;
      setFamilies([...families, newFamily]);
      setForm({ ...form, family: String(newFamily.id) });
      setNewFamilyForm({ name: '', address: '', contact_number: '', avatar_url: '' });
      setFamilyAvatarFile(null);
      setFamilyAvatarPreview(null);
      setShowNewFamilyModal(false);
      showToast('Family created successfully!', 'success');
      setProgress(100);
    } catch (error: any) {
      showToast('Failed to create family: ' + (error?.message || 'Unknown error'), 'error');
    } finally {
      setCreatingFamily(false);
      completeProgress();
    }
  };

  const handleCloseNewFamilyModal = () => {
    setShowNewFamilyModal(false);
    setNewFamilyForm({ name: '', address: '', contact_number: '', avatar_url: '' });
    setFamilyAvatarFile(null);
    setFamilyAvatarPreview(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Debug: Log form state before validation
    
    if (!form.name.trim()) {
      handleVibrate('name');
      nameRef.current?.focus();
      showToast('Name is required!', 'error');
      return;
    }
    if (!form.fatherName.trim()) {
      handleVibrate('fatherName');
      fatherRef.current?.focus();
      showToast('Father name is required!', 'error');
      return;
    }
    if (!form.class) {
      handleVibrate('class');
      classRef.current?.focus();
      showToast('Please select a class!', 'error');
      return;
    }
    if (selectedClassHasSections && !form.section) {
      handleVibrate('section');
      sectionRef.current?.focus();
      showToast('Please select a section!', 'error');
      return;
    }
    if (!form.gender) {
      showToast('Please select gender!', 'error');
      return;
    }
    if (!form.religion) {
      showToast('Please select religion!', 'error');
      return;
    }
    if (!form.nationality) {
      showToast('Please select nationality!', 'error');
      return;
    }
    if (!form.family) {
      handleVibrate('family');
      showToast('Please select a family!', 'error');
      return;
    }
    
    // Debug: Log form state after validation
    
    setShowConfirm(true);
  };

  const handleSaveAndCreateFeePlan = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveAndCreateFeePlan(true);
    handleSubmit(e);
  };

  // Helper function to generate random 5-digit password
  const generateRandomPassword = (): string => {
    // Generate a random 5-digit number (10000 to 99999)
    const min = 10000;
    const max = 99999;
    const randomPassword = Math.floor(Math.random() * (max - min + 1)) + min;
    return String(randomPassword);
  };

  const handleConfirm = async () => {
    if (!user?.school_id) {
      showToast('User school information not found', 'error');
      return;
    }

    const shouldOpenFeePlan = saveAndCreateFeePlan;
    setShowConfirm(false);
    setSubmitting(true);

    // Start progress for form submission
    startProgress(false);
    setProgress(10);

    try {
      // 1. First check for active session for this school
      setProgress(20);
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', user.school_id)
        .single();
      
      if (sessionError || !session) {
        showToast('Cannot add student: No active session found for this school!', 'error');
        setSubmitting(false);
        completeProgress();
        return;
      }

      // 2. Prepare for student insertion (ID will be generated fresh on each retry attempt)
      setProgress(30);

      // 3. Upload avatar if present
      setProgress(50);
      let avatar_url = null;
      if (form.pictureFile) {
        const file = form.pictureFile;
        const fileExt = file.name.split('.').pop();
        const fileName = `student_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('student-avatars')
          .upload(fileName, file, { upsert: true });
        if (uploadError) {
          showToast('Failed to upload avatar: ' + uploadError.message, 'error');
          setSubmitting(false);
          completeProgress();
          return;
        }
        const { data: publicUrlData } = supabase
          .storage
          .from('student-avatars')
          .getPublicUrl(fileName);
        avatar_url = publicUrlData?.publicUrl || null;
      }

      // 4. Prepare student data with school_id (id will be generated fresh on each retry)
      setProgress(70);
      const studentData = {
            // id will be set fresh on each retry attempt
            name: form.name,
            class_id: Number(form.class),
            section_id: selectedClassHasSections ? Number(form.section) : null,
            admission_date: form.admissionDate,
            phone: form.phone || null,
            picture_url: avatar_url,
            dob: form.dob || null,
            form_b: form.studentId || null,
            gender: form.gender || 'Male', // Ensure gender is always set
            cast: form.cast || null,
            orphan: form.orphan || null,
            osc: form.osc || null,
            id_mark: form.idMark || null,
            blood_group: form.bloodGroup || null,
            previous_school: form.previousSchool || null,
            previous_id: form.previousId || null,
            religion: form.religion || 'Muslim', // Ensure religion is always set
            nationality: form.nationality || 'Pakistani', // Ensure nationality is always set
            disease: form.disease || null,
            additional_note: form.additionalNote || null,
            total_siblings: form.totalSiblings || null,
            address: form.address || null,
            father_name: form.fatherName,
            father_national_id: form.fatherNationalId || null,
            father_education: form.fatherEducation || null,
            father_mobile: form.fatherMobile || null,
            father_occupation: form.fatherOccupation || null,
            father_income: form.fatherIncome || null,
            mother_name: form.motherName || null,
            mother_national_id: form.motherNationalId || null,
            mother_education: form.motherEducation || null,
            mother_mobile: form.motherMobile || null,
            mother_occupation: form.motherOccupation || null,
            mother_income: form.motherIncome || null,
            notification_channel: form.notificationChannel || 'whatsapp',
            session_id: session.id,
            school_id: user.school_id,
            status: 'active',
            password: generateRandomPassword()
      };

      // Debug: Log the data being sent to database
      // 5. Insert student with custom ID
      setProgress(85);
      
      const newStudent = await insertStudentWithRetry(studentData);

      if (!newStudent) {
        showToast('Failed to add student: Unknown error', 'error');
        setSubmitting(false);
        completeProgress();
        return;
      }
      

      // 6. Insert into student_class_history with school_id
      // For new admissions: adm_class_id and new_class_id are the same (admission = current)
      setProgress(95);
      const admissionClassId = Number(form.class);
      const admissionSectionId = selectedClassHasSections ? Number(form.section) : null;
      const { error: historyError } = await supabase
        .from('student_class_history')
        .insert([
          {
            student_id: newStudent.id,
            adm_class_id: admissionClassId,
            adm_section_id: admissionSectionId,
            new_class_id: admissionClassId, // For new students, current class = admission class
            new_section_id: admissionSectionId, // For new students, current section = admission section
            session_id: session.id,
            school_id: user.school_id,
            admission_date: form.admissionDate,
            status: 'active'
          }
        ]);

      if (historyError) {
        showToast('Failed to add to session history: ' + historyError.message, 'error');
        setSubmitting(false);
        completeProgress();
        return;
      }

      // 7. Link student to family (mandatory)
      const familyId = Number(form.family);
      const { error: linkError } = await supabase
        .from('family_members')
        .insert([
          {
            family_id: familyId,
            student_id: newStudent.id,
            is_primary_contact: false, // First student is not primary by default
            school_id: user.school_id
          }
        ]);
      
      if (linkError) {
        showToast('Student created but failed to link to family: ' + linkError.message, 'error');
        setSubmitting(false);
        completeProgress();
        return;
      }

      setProgress(100);
      
      // Get class and section names for the feed
      const selectedClass = classes.find(c => c.id === form.class);
      const selectedSection = selectedClassHasSections ? sections.find(s => s.id === form.section) : null;
      
      // Set the last inserted student data for the feed
      setLastInsertedStudent({
        id: newStudent.id,
        roll_number: newStudent.roll_number || null,
        name: form.name,
        fatherName: form.fatherName,
        className: selectedClass?.name || 'Unknown',
        sectionName: selectedSection?.name || (selectedClassHasSections ? 'Unknown' : 'No Section'),
        timestamp: new Date()
      });
      
      const displayId = newStudent.roll_number || newStudent.id;
      showToast(`Student added successfully with Roll Number: ${displayId}!`, 'success');
      
      // If "Save and Create Fee Plan" was clicked, prepare student info and open modal
      if (shouldOpenFeePlan) {
        const studentInfo: StudentInfo = {
          id: newStudent.id,
          name: form.name,
          fatherName: form.fatherName,
          rollNumber: newStudent.roll_number || null,
          dateOfAdmission: form.admissionDate,
          className: selectedClass?.name || 'Unknown',
          sectionName: selectedSection?.name || (selectedClassHasSections ? 'Unknown' : 'No Section'),
          classId: Number(form.class),
          sectionId: selectedClassHasSections ? Number(form.section) : undefined
        };
        setNewStudentForFeePlan(studentInfo);
        setShowFeePlanModal(true);
        setSaveAndCreateFeePlan(false);
      } else {
        handleReset();
      }
    } catch (err: any) {
      showToast('Error: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setSubmitting(false);
      completeProgress();
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleModalCancel = () => {
    setShowConfirm(false);
  };

  useEffect(() => {
    if (!showConfirm) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleConfirm();
      } else if (e.key === 'Escape') {
        handleModalCancel();
      }
    };
    window.addEventListener('keydown', handleKey, { capture: true });
    return () => window.removeEventListener('keydown', handleKey, { capture: true });
  }, [showConfirm]);

  if (loading) {
    return <Loader />;
  }

  if (!activeSession) {
    return <NoSessionsFound />;
  }

  if (!hasClasses) {
    return <NoClassesFound />;
  }

  if (!hasSections) {
    return <NoSectionsFound />;
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
      {showConfirm && ReactDOM.createPortal(
        <ModalOverlay>
          <ModalBox theme={theme === 'dark' ? darkTheme : lightTheme}>
            <div style={{fontSize: '1.15rem', fontWeight: 600, marginBottom: 10}}>Confirm Submission</div>
            <div style={{marginBottom: 10}}>Are you sure you want to submit the form?</div>
            <ModalActions>
              <ModalCancel onClick={handleModalCancel}>Cancel</ModalCancel>
              <ModalButton onClick={handleConfirm}>Confirm</ModalButton>
            </ModalActions>
          </ModalBox>
        </ModalOverlay>,
        document.body
      )}
      {submitting && ReactDOM.createPortal(
        <UniqueLoadingOverlay>
          <LoadingSpinner />
          <div style={{marginTop: 12, fontWeight: 700, fontSize: '1.25rem', letterSpacing: '1.5px'}}>Registering Student…</div>
          <div style={{marginTop: 8, fontSize: '1.05rem', color: '#b0b8d1'}}>Please wait while we save the record.</div>
        </UniqueLoadingOverlay>,
        document.body
      )}
      {classIdWarning && (
        <div style={{ background: '#fbbf24', color: '#222', padding: '10px', borderRadius: '8px', marginBottom: '1rem', fontWeight: 700, textAlign: 'center' }}>
          ⚠️ {classIdWarning}
        </div>
      )}
      <PageContainer theme={theme === 'dark' ? darkTheme : lightTheme}>
        <MainContent>
          <FormWrapper id="admission-form" onSubmit={handleSubmit} style={showConfirm ? { pointerEvents: 'none', userSelect: 'none', opacity: 0.7 } : {}}>
            <Grid container spacing={2} sx={{ alignItems: 'flex-start', width: '100%', margin: 0 }}>
                {/* Main Form */}
                <Grid item xs={12} md={8} lg={9}>
                  <MainCard>
                    {lastInsertedStudent && (
                      <LastInsertedFeed theme={theme === 'dark' ? darkTheme : lightTheme}>
                        <span className="feed-label">Last Added:</span>
                        <span className="student-id">#{getStudentDisplayId(lastInsertedStudent)}</span>
                        <span className="student-name">{lastInsertedStudent.name}</span>
                        <span className="student-father">({lastInsertedStudent.fatherName})</span>
                        <span className="student-class">- {lastInsertedStudent.className}({lastInsertedStudent.sectionName})</span>
                      </LastInsertedFeed>
                    )}
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, fontSize: '1.25rem' }}>
                      Student Admission Form
                    </Typography>

                    {/* Student Information Section */}
                    <SectionContainer>
                      <SectionHeader>
                        <SectionBadge>1</SectionBadge>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                          Student Information
                        </Typography>
                      </SectionHeader>
                      <ModernGrid>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="name"
                            label="Name"
                            value={form.name}
                            onChange={handleInputChange}
                            inputRef={nameRef}
                            size="small"
                            required
                          />
                        </Field>
                        <Field>
                          <CompactSelect fullWidth size="small">
                            <InputLabel id="class-label">Class*</InputLabel>
                            <Select
                              labelId="class-label"
                              name="class"
                              value={form.class}
                              onChange={handleSelectChange}
                              MenuProps={selectMenuProps}
                              label="Class*"
                              inputRef={classRef}
                            >
                              <MenuItem value="">Select Class</MenuItem>
                              {loadingClasses ? (
                                <MenuItem disabled>Loading...</MenuItem>
                              ) : (
                                classes.map(c => (
                                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                ))
                              )}
                            </Select>
                          </CompactSelect>
                        </Field>
                        {selectedClassHasSections && (
                          <Field>
                            <CompactSelect fullWidth size="small">
                              <InputLabel id="section-label">Section*</InputLabel>
                              <Select
                                labelId="section-label"
                                name="section"
                                value={form.section}
                                onChange={handleSelectChange}
                                MenuProps={selectMenuProps}
                                label="Section*"
                                disabled={!form.class}
                                inputRef={sectionRef}
                              >
                                <MenuItem value="">Select Section</MenuItem>
                                {loadingSections ? (
                                  <MenuItem disabled>Loading...</MenuItem>
                                ) : (
                                  sections.map(s => (
                                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                                  ))
                                )}
                              </Select>
                            </CompactSelect>
                          </Field>
                        )}
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="admissionDate"
                            label="Date of Admission"
                            type="date"
                            value={form.admissionDate}
                            onChange={handleInputChange}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                            required
                          />
                        </Field>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="phone" 
                            label="Mobile No. for SMS/WhatsApp"
                            value={form.phone} 
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              setForm(prev => ({ ...prev, phone: value }));
                            }}
                            size="small"
                            inputProps={{
                              maxLength: 11,
                              minLength: 10,
                              pattern: '[0-9]*'
                            }}
                          />
                        </Field>
                        <Field>
                          <CompactSelect fullWidth size="small">
                            <InputLabel id="notification-channel-label">Notification Channel</InputLabel>
                            <Select
                              labelId="notification-channel-label"
                              name="notificationChannel"
                              value={form.notificationChannel}
                              onChange={(e) => setForm(prev => ({ ...prev, notificationChannel: (e.target.value as 'whatsapp' | 'sms') }))}
                              MenuProps={selectMenuProps}
                              label="Notification Channel"
                            >
                              <MenuItem value="whatsapp">WhatsApp</MenuItem>
                              <MenuItem value="sms">SMS</MenuItem>
                            </Select>
                          </CompactSelect>
                        </Field>
                        <Field sx={{ gridColumn: { xs: '1 / -1', lg: 'span 2' } }}>
                          <CompactSelect fullWidth size="small">
                            <InputLabel id="family-label">Family*</InputLabel>
                            <Select
                              labelId="family-label"
                              name="family"
                              value={form.family}
                              onChange={handleFamilyChange}
                              MenuProps={selectMenuProps}
                              label="Family*"
                              required
                              error={invalidField === 'family'}
                            >
                              <MenuItem value="">Select Family</MenuItem>
                              {loadingFamilies ? (
                                <MenuItem disabled>Loading families...</MenuItem>
                              ) : (
                                families.map(family => (
                                  <MenuItem key={family.id} value={String(family.id)}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                      <FamilyRestroom sx={{ fontSize: '1.1rem', opacity: 0.7 }} />
                                      <Box sx={{ flex: 1 }}>
                                        <Box component="span" sx={{ fontWeight: 600, color: theme === 'dark' ? darkTheme.ACCENT : lightTheme.ACCENT }}>
                                          F{family.id}
                                        </Box>
                                        {' - '}
                                        <Box component="span">{family.name}</Box>
                                        {family.contact_number && (
                                          <Box component="span" sx={{ fontSize: '0.85rem', opacity: 0.7, ml: 1 }}>
                                            ({family.contact_number})
                                          </Box>
                                        )}
                                      </Box>
                                    </Box>
                                  </MenuItem>
                                ))
                              )}
                              <MenuItem value="new" sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 0.5, pt: 1.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: theme === 'dark' ? darkTheme.ACCENT : lightTheme.ACCENT }}>
                                  <AddIcon />
                                  <Box component="span" sx={{ fontWeight: 600 }}>Create New Family</Box>
                                </Box>
                              </MenuItem>
                            </Select>
                          </CompactSelect>
                        </Field>
                      </ModernGrid>
                    </SectionContainer>

                    <Divider sx={{ my: 3 }} />

                    {/* Other Information Section */}
                    <SectionContainer>
                      <SectionHeader>
                        <SectionBadge>2</SectionBadge>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                          Other Information
                        </Typography>
                      </SectionHeader>
                      <ModernGrid>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="dob"
                            label="Date of Birth"
                            type="date"
                            value={form.dob}
                            onChange={handleInputChange}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                          />
                        </Field>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="studentId"
                            label="Student Birth Form ID / NIC"
                            value={form.studentId}
                            onChange={handleInputChange}
                            size="small"
                          />
                        </Field>
                        <Field>
                          <CompactSelect fullWidth size="small">
                            <InputLabel id="gender-label">Gender</InputLabel>
                            <Select
                              labelId="gender-label"
                              name="gender"
                              value={form.gender}
                              onChange={handleSelectChange}
                              MenuProps={selectMenuProps}
                              label="Gender"
                            >
                              <MenuItem value="Male">Male</MenuItem>
                              <MenuItem value="Female">Female</MenuItem>
                              <MenuItem value="Other">Other</MenuItem>
                            </Select>
                          </CompactSelect>
                        </Field>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="cast"
                            label="Cast"
                            value={form.cast}
                            onChange={handleInputChange}
                            size="small"
                          />
                        </Field>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="orphan"
                            label="Orphan Student"
                            value={form.orphan}
                            onChange={handleInputChange}
                            size="small"
                          />
                        </Field>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="osc" 
                            label="OSC Number"
                            value={form.osc} 
                            onChange={handleInputChange}
                            size="small"
                          />
                        </Field>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="idMark"
                            label="Identification Mark"
                            value={form.idMark}
                            onChange={handleInputChange}
                            size="small"
                          />
                        </Field>
                        <Field>
                          <CompactSelect fullWidth size="small">
                            <InputLabel id="blood-group-label">Blood Group</InputLabel>
                            <Select
                              labelId="blood-group-label"
                              name="bloodGroup"
                              value={form.bloodGroup || ''}
                              onChange={handleSelectChange}
                              MenuProps={selectMenuProps}
                              label="Blood Group"
                            >
                              <MenuItem value="">Select</MenuItem>
                              {BLOOD_GROUPS.map(bg => (
                                <MenuItem key={bg} value={bg}>{bg}</MenuItem>
                              ))}
                            </Select>
                          </CompactSelect>
                        </Field>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="previousSchool"
                            label="Previous School"
                            value={form.previousSchool}
                            onChange={handleInputChange}
                            size="small"
                          />
                        </Field>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="previousId"
                            label="Previous ID / Board Roll No"
                            value={form.previousId}
                            onChange={handleInputChange}
                            size="small"
                          />
                        </Field>
                        <Field>
                          <CompactSelect fullWidth size="small">
                            <InputLabel id="religion-label">Religion</InputLabel>
                            <Select
                              labelId="religion-label"
                              name="religion"
                              value={form.religion}
                              onChange={handleSelectChange}
                              MenuProps={selectMenuProps}
                              label="Religion"
                            >
                              {RELIGIONS.map(r => (
                                <MenuItem key={r} value={r}>{r}</MenuItem>
                              ))}
                            </Select>
                          </CompactSelect>
                        </Field>
                        <Field>
                          <CompactSelect fullWidth size="small">
                            <InputLabel id="nationality-label">Nationality</InputLabel>
                            <Select
                              labelId="nationality-label"
                              name="nationality"
                              value={form.nationality}
                              onChange={handleSelectChange}
                              MenuProps={selectMenuProps}
                              label="Nationality"
                            >
                              {NATIONALITIES.map(n => (
                                <MenuItem key={n} value={n}>{n}</MenuItem>
                              ))}
                            </Select>
                          </CompactSelect>
                        </Field>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="totalSiblings"
                            label="Total Siblings"
                            type="number"
                            value={form.totalSiblings}
                            onChange={handleInputChange}
                            inputProps={{ min: 0 }}
                            size="small"
                          />
                        </Field>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="disease"
                            label="Disease If Any?"
                            value={form.disease}
                            onChange={handleInputChange}
                            size="small"
                          />
                        </Field>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="additionalNote"
                            label="Additional Note"
                            value={form.additionalNote}
                            onChange={handleInputChange}
                            size="small"
                          />
                        </Field>
                        <Field sx={{ gridColumn: '1 / -1' }}>
                          <CompactTextField
                            fullWidth
                            name="address"
                            label="Address"
                            value={form.address}
                            onChange={handleInputChange}
                            multiline
                            rows={2}
                            size="small"
                          />
                        </Field>
                      </ModernGrid>
                    </SectionContainer>

                    <Divider sx={{ my: 3 }} />

                    {/* Father/Guardian Information Section */}
                    <SectionContainer>
                      <SectionHeader>
                        <SectionBadge>3</SectionBadge>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                          Father/Guardian Information
                        </Typography>
                      </SectionHeader>
                      <ModernGrid>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="fatherName"
                            label="Father Name"
                            value={form.fatherName}
                            onChange={handleInputChange}
                            inputRef={fatherRef}
                            size="small"
                            required
                          />
                        </Field>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="fatherNationalId"
                            label="Father National ID"
                            value={form.fatherNationalId}
                            onChange={handleInputChange}
                            size="small"
                          />
                        </Field>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="fatherEducation"
                            label="Education"
                            value={form.fatherEducation}
                            onChange={handleInputChange}
                            size="small"
                          />
                        </Field>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="fatherMobile"
                            label="Mobile No"
                            value={form.fatherMobile}
                            onChange={handleInputChange}
                            size="small"
                            inputProps={{
                              pattern: '[0-9]*',
                              inputMode: 'numeric'
                            }}
                          />
                        </Field>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="fatherOccupation"
                            label="Occupation"
                            value={form.fatherOccupation}
                            onChange={handleInputChange}
                            size="small"
                          />
                        </Field>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="fatherIncome"
                            label="Income"
                            type="number"
                            value={form.fatherIncome}
                            onChange={handleInputChange}
                            size="small"
                            InputProps={{
                              startAdornment: <Box component="span" sx={{ color: 'text.secondary', mr: 1, fontSize: '0.875rem' }}>Rs.</Box>
                            }}
                          />
                        </Field>
                      </ModernGrid>
                    </SectionContainer>

                    <Divider sx={{ my: 3 }} />

                    {/* Mother Information Section */}
                    <SectionContainer>
                      <SectionHeader>
                        <SectionBadge>4</SectionBadge>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                          Mother Information
                        </Typography>
                      </SectionHeader>
                      <ModernGrid>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="motherName"
                            label="Mother Name"
                            value={form.motherName}
                            onChange={handleInputChange}
                            size="small"
                          />
                        </Field>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="motherNationalId"
                            label="Mother National ID"
                            value={form.motherNationalId}
                            onChange={handleInputChange}
                            size="small"
                          />
                        </Field>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="motherEducation"
                            label="Education"
                            value={form.motherEducation}
                            onChange={handleInputChange}
                            size="small"
                          />
                        </Field>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="motherMobile"
                            label="Mobile No"
                            value={form.motherMobile}
                            onChange={handleInputChange}
                            size="small"
                            inputProps={{
                              pattern: '[0-9]*',
                              inputMode: 'numeric'
                            }}
                          />
                        </Field>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="motherOccupation"
                            label="Occupation"
                            value={form.motherOccupation}
                            onChange={handleInputChange}
                            size="small"
                          />
                        </Field>
                        <Field>
                          <CompactTextField
                            fullWidth
                            name="motherIncome"
                            label="Income"
                            type="number"
                            value={form.motherIncome}
                            onChange={handleInputChange}
                            size="small"
                            InputProps={{
                              startAdornment: <Box component="span" sx={{ color: 'text.secondary', mr: 1, fontSize: '0.875rem' }}>Rs.</Box>
                            }}
                          />
                        </Field>
                      </ModernGrid>
                    </SectionContainer>
                  </MainCard>
                </Grid>

                {/* Sidebar - Right Side */}
                <Grid item xs={12} md={4} lg={3}>
                  <SidebarCard>
                    <AvatarWrapper>
                      <Box sx={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <ImageBox onClick={handleAvatarClick}>
                          {image ? (
                            <img src={image} alt="Profile preview" />
                          ) : (
                            <AccountCircle sx={{ fontSize: 80, color: 'text.secondary' }} />
                          )}
                        </ImageBox>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImage}
                          style={{ display: 'none' }}
                        />
                      </Box>
                      <ButtonRow>
                        {image ? (
                          <>
                            <ImageActionIconButton
                              $variant="secondary"
                              variant="outlined"
                              onClick={handleAvatarClick}
                              aria-label="Upload photo"
                              title="Upload photo"
                            >
                              <CloudUploadIcon />
                            </ImageActionIconButton>
                            <ImageActionIconButton
                              $variant="danger"
                              variant="contained"
                              onClick={handleRemoveImage}
                              aria-label="Remove photo"
                              title="Remove photo"
                            >
                              <CloseIcon />
                            </ImageActionIconButton>
                          </>
                        ) : (
                          <UploadButton
                            variant="outlined"
                            startIcon={<CloudUploadIcon />}
                            onClick={handleAvatarClick}
                          >
                            Upload Photo
                          </UploadButton>
                        )}
                      </ButtonRow>
                    </AvatarWrapper>
                    <ActionButtonsContainer>
                      <PrimaryButton
                        type="submit"
                        variant="contained"
                        startIcon={<SaveIcon />}
                        disabled={submitting}
                        fullWidth
                      >
                        {submitting ? 'Saving...' : 'Save'}
                      </PrimaryButton>
                      {!isMobile && (
                        <PrimaryButton
                          type="button"
                          variant="contained"
                          startIcon={<DescriptionIcon />}
                          onClick={handleSaveAndCreateFeePlan}
                          disabled={submitting}
                          fullWidth
                        >
                          Save & Fee Plan
                        </PrimaryButton>
                      )}
                      <SecondaryButton
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={handleReset}
                        fullWidth
                      >
                        Reset
                      </SecondaryButton>
                      <SecondaryButton
                        variant="outlined"
                        startIcon={<CloseIcon />}
                        onClick={handleCancel}
                        fullWidth
                      >
                        Cancel
                      </SecondaryButton>
                      {isMobile && (
                        <PrimaryButton
                          type="button"
                          variant="contained"
                          startIcon={<DescriptionIcon />}
                          onClick={handleSaveAndCreateFeePlan}
                          disabled={submitting}
                          fullWidth
                        >
                          Save & Fee Plan
                        </PrimaryButton>
                      )}
                    </ActionButtonsContainer>
                  </SidebarCard>
                </Grid>
              </Grid>
          </FormWrapper>
        </MainContent>
      </PageContainer>
      {/* New Family Modal */}
      <Dialog
        open={showNewFamilyModal}
        onClose={handleCloseNewFamilyModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: theme === 'dark' ? darkTheme.CARD : lightTheme.CARD,
            color: theme === 'dark' ? darkTheme.TEXT_PRIMARY : lightTheme.TEXT_PRIMARY,
            borderRadius: '16px'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FamilyRestroom />
            <span>Create New Family</span>
          </Box>
          <IconButton onClick={handleCloseNewFamilyModal} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            {/* Avatar Upload */}
            <Box
              component="label"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: 3,
                border: `2px dashed ${theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
                borderRadius: '12px',
                background: theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: theme === 'dark' ? darkTheme.ACCENT : lightTheme.ACCENT,
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                }
              }}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFamilyAvatarChange}
                style={{ display: 'none' }}
              />
              {familyAvatarPreview ? (
                <Box sx={{ position: 'relative' }}>
                  <Avatar src={familyAvatarPreview} sx={{ width: 80, height: 80, fontSize: '2.5rem' }}>
                    {!familyAvatarPreview && getInitials(newFamilyForm.name)}
                  </Avatar>
                  <IconButton
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setFamilyAvatarPreview(null);
                      setFamilyAvatarFile(null);
                    }}
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      background: '#ef4444',
                      color: '#fff',
                      width: 24,
                      height: 24,
                      '&:hover': { background: '#dc2626' }
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
              )}
              <Typography variant="body2" color="text.secondary">
                {familyAvatarPreview ? 'Click to change avatar' : 'Click to upload avatar'}
              </Typography>
            </Box>

            {/* Family Form Fields */}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Family Name"
                  value={newFamilyForm.name}
                  onChange={e => setNewFamilyForm({ ...newFamilyForm, name: e.target.value })}
                  required
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Address"
                  value={newFamilyForm.address}
                  onChange={e => setNewFamilyForm({ ...newFamilyForm, address: e.target.value })}
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Contact Number"
                  value={newFamilyForm.contact_number}
                  onChange={e => setNewFamilyForm({ ...newFamilyForm, contact_number: e.target.value })}
                  fullWidth
                  size="small"
                  type="tel"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, padding: 2, borderTop: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` }}>
          <MuiButton
            onClick={handleCloseNewFamilyModal}
            variant="outlined"
            size="small"
            sx={{
              borderRadius: '8px',
              textTransform: 'none'
            }}
          >
            Cancel
          </MuiButton>
          <MuiButton
            onClick={handleCreateFamily}
            variant="contained"
            size="small"
            disabled={creatingFamily || !newFamilyForm.name.trim()}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              background: theme === 'dark' ? darkTheme.ACCENT : lightTheme.ACCENT,
              '&:hover': {
                background: theme === 'dark' ? darkTheme.ACCENT_INPUT : lightTheme.ACCENT_INPUT
              }
            }}
          >
            {creatingFamily ? 'Creating...' : 'Create Family'}
          </MuiButton>
        </Box>
      </Dialog>
      {activeSession && (
        <CreateFeePlanModal
          isOpen={showFeePlanModal}
          onClose={() => {
            setShowFeePlanModal(false);
            setNewStudentForFeePlan(null);
            handleReset();
          }}
          onSuccess={() => {
            setShowFeePlanModal(false);
            setNewStudentForFeePlan(null);
            handleReset();
          }}
          schoolId={user?.school_id || 0}
          feeHeads={feeHeads}
          initialStudent={newStudentForFeePlan}
        />
      )}
    </ThemeProvider>
  );
};

export default StudentAdmissionForm; 
