import React, { useState, useContext, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled, { ThemeProvider, keyframes, createGlobalStyle } from 'styled-components';
import { AccountCircle, Add as AddIcon, Refresh as RefreshIcon, Close as CloseIcon, Save as SaveIcon } from '@mui/icons-material';
import { ThemeContext, darkTheme, lightTheme, useProgress } from './Layout';
import { sortClasses } from '../utils/classUtils';
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
  styled as muiStyled,
  SelectChangeEvent,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import NoSessionsFound from './NoSessionsFound';
import NoClassesFound from './NoClassesFound';
import NoSectionsFound from './NoSectionsFound';

import Loader from '../components/Loader';
// --- Modern Compact Form Layout ---
const ModernForm = styled.form`
  background: ${({ theme }) => theme.CARD};
  border-radius: 0;
  box-shadow: none;
  border: none;
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  position: relative;
  overflow-y: auto;
`;

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
  margin-bottom: 18px;
  background: ${({ theme }) => theme.CARD};
  box-shadow: 0 1px 6px #0001;
  border-radius: 10px;
  padding: 8px 18px 8px 18px;
  min-height: 36px;
`;

const OverlapAvatar = styled.div`
  position: absolute;
  left: 24px;
  top: -32px;
  z-index: 2;
  @media (max-width: 700px) {
    position: static;
    margin: 0 auto 8px auto;
  display: flex;
  justify-content: center;
  }
`;

const CardBlock = styled.div`
  background: ${({ theme }) => theme.BG};
  border-radius: 24px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  padding: 48px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 280px;
  max-width: 340px;
  flex: 0 0 300px;
  position: relative;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
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
    width: 100%;
    max-width: 100%;
    min-width: 0;
    margin: 0;
    padding: 0;
    border-radius: 0;
  }
`;

const LargeAvatarCircle = styled.div`
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 2px solid ${({ theme }) => theme.ACCENT_INPUT};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  margin: 0 auto;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.10);

  &:hover {
    transform: scale(1.04);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.13);
    border-color: ${({ theme }) => theme.ACCENT_INPUT};
  }

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      rgba(0, 0, 0, 0.2) 60%,
      rgba(0, 0, 0, 0.3) 100%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover::before {
    opacity: 1;
  }

  @media (max-width: 900px) {
    width: 72px;
    height: 72px;
  }
  @media (max-width: 700px) {
    width: 120px;
    height: 120px;
  }
`;

const AvatarIcon = styled(AccountCircle)`
  font-size: 2.7rem !important;
  color: ${({ theme }) => theme.ACCENT_INPUT}66;
  transition: color 0.3s ease;
  ${LargeAvatarCircle}:hover & {
    color: ${({ theme }) => theme.ACCENT_INPUT};
  }
`;

const AvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;

  ${LargeAvatarCircle}:hover & {
    transform: scale(1.05);
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const RemoveButton = styled.button`
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%) translateY(10px);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(229, 57, 53, 0.9);
  color: #fff;
  border: none;
  font-size: 20px;
  opacity: 0;
  z-index: 3;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;

  ${LargeAvatarCircle}:hover & {
  opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  &:hover {
    background: #d32f2f;
    box-shadow: 0 4px 12px rgba(229, 57, 53, 0.3);
  }
`;

const CameraIcon = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) translateY(10px);
    color: #fff;
  font-size: 24px;
  opacity: 0;
  transition: all 0.3s ease;
  z-index: 3;
  
  ${LargeAvatarCircle}:hover & {
    opacity: 1;
    transform: translate(-50%, -50%) translateY(0);
  }
`;

const UploadHint = styled.div`
  position: absolute;
  bottom: 16px;
  left: 0;
  right: 0;
  text-align: center;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 500;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.3s ease;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  padding: 0 8px;
  pointer-events: none;
  z-index: 3;

  ${LargeAvatarCircle}:hover & {
    opacity: 1;
    transform: translateY(0);
  }
`;

const FormHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px 24px 8px 24px;
  position: relative;
  @media (max-width: 700px) {
  flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 24px 8px 6px 8px;
  }
`;

const FormTitle = styled.h2`
  font-size: 1.18rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 auto 24px auto;
  text-align: center;
  width: 100%;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
  @media (max-width: 700px) {
    width: 100%;
    justify-content: center;
    margin-top: 6px;
    gap: 6px;
  }
`;

const PillButton = styled.button`
  padding: 12px 24px;
  border-radius: 12px;
  border: none;
  background: ${({ theme }) => theme.ACCENT_INPUT};
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px ${({ theme }) => `${theme.ACCENT_INPUT}33`};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px ${({ theme }) => `${theme.ACCENT_INPUT}66`};
    background: ${({ theme }) => theme.ACCENT_INPUT}ee;
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px ${({ theme }) => `${theme.ACCENT_INPUT}33`};
  }

  @media (max-width: 900px) {
    max-width: 200px;
  }
`;

const ThemedCancelButton = styled(PillButton)`
  background: ${({ theme }) => theme.CANCEL_BG};
  color: ${({ theme }) => theme.CANCEL_COLOR};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  &:hover {
    background: ${({ theme }) => theme.ACCENT_INPUT};
    color: #fff;
    box-shadow: 0 6px 16px ${({ theme }) => `${theme.ACCENT_INPUT}66`};
  }
`;

const ThreeDBackground = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: linear-gradient(135deg, #232a3b 0%, #232a3b 60%, #2d3a5a 100%),
    radial-gradient(circle at 80% 20%, #4a6cf7 0%, transparent 60%),
    radial-gradient(circle at 20% 80%, #43a04755 0%, transparent 70%);
  filter: blur(0.5px) brightness(1.08);
  opacity: 0.85;
`;

const SectionContainer = styled.div`
  margin-bottom: 32px;
  position: relative;
  z-index: 1;
  @media (max-width: 700px) {
    margin-bottom: 12px;
    padding: 0;
  }
`;

const ModernGrid = styled.div`
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
  }
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 0;
    width: 100%;
  }
`;

const Field = muiStyled(FormControl)(({ theme }) => ({
  width: '100%',
  '& .MuiInputBase-root': {
    background: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.03)'
      : '#fff',
    backdropFilter: 'blur(8px)',
    borderRadius: '8px',
    border: theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.05)'
      : '1px solid rgba(0, 0, 0, 0.15)',
    transition: 'all 0.2s ease',
    height: '48px',

    '&:hover, &.Mui-focused': {
      background: theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : '#fff',
      border: `1px solid ${theme.palette.mode === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : theme.palette.primary.main}`,
      boxShadow: theme.palette.mode === 'dark'
        ? 'none'
        : '0 2px 4px rgba(0,0,0,0.05)',
    },

    '& .MuiSelect-select, & .MuiInputBase-input': {
      padding: '12px 14px',
      fontSize: '0.95rem',
      color: theme.palette.mode === 'dark' 
        ? '#fff' 
        : 'rgba(0, 0, 0, 0.87)',
      '&::placeholder': {
        color: theme.palette.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.3)'
          : 'rgba(0, 0, 0, 0.4)',
        opacity: 1
      }
    },

    '& .MuiOutlinedInput-notchedOutline': {
      border: 'none'
    }
  },

  '& .MuiInputLabel-root': {
    color: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.7)'
      : 'rgba(0, 0, 0, 0.7)',
    '&.Mui-focused': {
      color: theme.palette.primary.main
    }
  },

  '& .MuiFormLabel-asterisk': {
    color: theme.palette.error.main
  }
}));

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
  padding: 7px 10px;
  border-radius: 8px;
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.98rem;
  outline: none;
  transition: border 0.18s, box-shadow 0.18s;
  &:focus {
    border: 1.2px solid ${({ theme }) => theme.ACCENT_INPUT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT_INPUT}33;
  }
  animation: ${({invalid}) => invalid ? shake : 'none'} 0.5s;
  width: 100%;
  box-sizing: border-box;
  &:-webkit-autofill,
  &:-webkit-autofill:focus,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 1000px ${({ theme }) => theme.FIELD_BG} inset !important;
    -webkit-text-fill-color: ${({ theme }) => theme.TEXT_PRIMARY} !important;
    transition: background-color 5000s ease-in-out 0s;
    caret-color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

const Textarea = styled.textarea`
  padding: 7px 10px;
  border-radius: 8px;
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.98rem;
  outline: none;
  min-height: 48px;
  transition: border 0.18s, box-shadow 0.18s;
  &:focus {
    border: 1.2px solid ${({ theme }) => theme.ACCENT_INPUT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT_INPUT}33;
  }
  width: 100%;
  box-sizing: border-box;
  &:-webkit-autofill,
  &:-webkit-autofill:focus,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 1000px ${({ theme }) => theme.FIELD_BG} inset !important;
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

const FormBlocks = styled.div`
  display: flex;
  flex-direction: row;
  gap: 32px;
  width: 100%;
  height: 100%;
  background: transparent;
  @media (max-width: 900px) {
    flex-direction: column;
    gap: 18px;
  }
`;

const FieldsCard = styled.div`
  background: ${({ theme }) => theme.BG};
  border-radius: 18px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  padding: 32px 24px;
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  z-index: 1;
  @media (max-width: 900px) {
    width: 100%;
    padding: 18px 8px;
    border-radius: 12px;
  }
`;

const ActionsBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  margin-top: 32px;
  width: 100%;
  
  @media (max-width: 900px) {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
  }
`;

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
`;

const SkeletonCardBlock = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 24px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  padding: 48px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 280px;
  max-width: 340px;
  flex: 0 0 300px;
  position: relative;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  backdrop-filter: blur(8px);
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
  @media (max-width: 900px) {
    width: 100%;
    max-width: 100vw;
    min-width: 0;
    padding: 32px 16px;
    margin-bottom: 0;
    border-radius: 16px;
  }
`;

const SkeletonAvatar = styled.div`
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  margin: 8px 8px 48px 8px;
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

const SkeletonButton = styled.div`
  width: 100%;
  height: 48px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 12px;
  margin-bottom: 16px;
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

const SkeletonFieldsCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 18px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  padding: 32px 24px;
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  z-index: 1;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
    z-index: 2;
  }
  @media (max-width: 900px) {
    width: 100%;
    padding: 18px 8px;
    border-radius: 12px;
  }
`;

const SkeletonTitle = styled.div`
  width: 60%;
  height: 32px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 8px;
  margin: 0 auto 24px auto;
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

const SkeletonInfoBox = styled.div`
  width: 100%;
  height: 40px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#2d3748' : '#f7fafc'};
  border-radius: 8px;
  margin-bottom: 16px;
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

const SkeletonSectionTitle = styled.div`
  width: 40%;
  height: 24px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 6px;
  margin: 18px 0 8px 0;
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

const SkeletonGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 24px 16px;
  width: 100%;
  flex: 1;
  min-height: 0;
  padding: 0 24px;
  box-sizing: border-box;
  @media (max-width: 900px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 0 8px;
  }
`;

const SkeletonField = styled.div`
  width: 100%;
  height: 48px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 8px;
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

const SkeletonTextArea = styled.div`
  width: 100%;
  height: 80px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 8px;
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

const SkeletonHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${({ theme }) => theme.CARD};
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 16px;
  box-shadow: 0 4px 16px #0002;
  padding: 12px 24px 10px 24px;
  min-height: 36px;
  margin: 16px 0 18px 0;
  width: 100%;
`;
const SkeletonHeaderTitle = styled.div`
  width: 180px;
  height: 22px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 8px;
  margin-right: 18px;
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
const SkeletonSegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;
const SkeletonSegmentedButton = styled.div`
  width: 38px;
  height: 32px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#f3f4f6'};
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
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
  max-width: 280px;
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


// Skeleton loading component
const FormSkeleton: React.FC = () => {
  return (
    <>
      <SkeletonHeader>
        <SkeletonHeaderTitle />
        <SkeletonSegmentedGroup>
          <SkeletonSegmentedButton />
          <SkeletonSegmentedButton />
          <SkeletonSegmentedButton />
        </SkeletonSegmentedGroup>
      </SkeletonHeader>
    <FormSkeletonContainer>
      <SkeletonCardBlock>
        <SkeletonAvatar />
        <SkeletonButton />
        <SkeletonButton />
        <SkeletonButton />
      </SkeletonCardBlock>
      <SkeletonFieldsCard>
        <SkeletonTitle />
        <SkeletonInfoBox />
        {/* Student Information Section */}
        <SkeletonSectionTitle />
        <SkeletonGrid>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonField key={i} />
          ))}
        </SkeletonGrid>
        {/* Other Information Section */}
        <SkeletonSectionTitle />
        <SkeletonGrid>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <SkeletonField key={i} />
          ))}
          <SkeletonTextArea style={{ gridColumn: '1 / -1' }} />
        </SkeletonGrid>
        {/* Father Information Section */}
        <SkeletonSectionTitle />
        <SkeletonGrid>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonField key={i} />
          ))}
        </SkeletonGrid>
        {/* Mother Information Section */}
        <SkeletonSectionTitle />
        <SkeletonGrid>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonField key={i} />
          ))}
        </SkeletonGrid>
      </SkeletonFieldsCard>
    </FormSkeletonContainer>
    </>
  );
};

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
    & svg {
      font-size: 13px;
    }
  }
`;

// --- Layout and Section Styles copied from StudentList.tsx ---
const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 12px 6px 12px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  height: 93vh;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
  margin: 16px 0 18px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.CARD};
  box-shadow: 0 4px 16px #0002;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 16px;
  padding: 12px 24px 10px 24px;
  min-height: 36px;
  h2 {
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: 1px;
    color: ${({ theme }) => theme.ACCENT};
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    @media (max-width: 700px) {
      font-size: 0.525rem;
    }
  }
`;

const MainCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  box-shadow: 0 4px 16px #0002;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 18px;
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const FooterCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  box-shadow: 0 4px 16px #0002;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 16px;
  padding: 16px 24px 14px 24px;
  margin-top: 18px;
  width: 100%;
`;

const MainContent = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  padding: 0 0 32px 0;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: y proximity;
  will-change: scroll-position;
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
  @media (max-width: 700px) {
    max-height: none;
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
    discountInFee: '',
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
    name: string;
    fatherName: string;
    className: string;
    sectionName: string;
    timestamp: Date;
  } | null>(null);
  const [selectedClassHasSections, setSelectedClassHasSections] = useState<boolean>(true);

  // Helper function to generate next available student ID (global sequential)
  const generateNextStudentId = async (): Promise<number> => {
    try {
      // Get the highest student ID across all schools
      const { data: existingStudents, error } = await supabase
        .from('students')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error getting highest student ID:', error);
        throw new Error('Failed to generate student ID: ' + error.message);
      }

      console.log('Highest existing student ID:', existingStudents);

      // Calculate the next student ID (global sequential)
      const nextStudentId = existingStudents && existingStudents.length > 0 
        ? existingStudents[0].id + 1 
        : 1;

      console.log(`Generated next student ID: ${nextStudentId}`);
      return nextStudentId;
    } catch (error) {
      console.error('Error generating student ID:', error);
      throw error;
    }
  };

  // Helper function to insert student with retry mechanism for race conditions
  const insertStudentWithRetry = async (studentData: any, maxRetries: number = 5): Promise<any> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Generate a fresh ID for each attempt to avoid race conditions
        if (!user?.school_id) {
          throw new Error('School ID not found');
        }
        
        const freshStudentId = await generateNextStudentId();
        studentData.id = freshStudentId;
        
        console.log(`Attempt ${attempt}: Inserting student with ID ${freshStudentId}`);
        
        const { data: newStudent, error: insertError } = await supabase
          .from('students')
          .insert([studentData])
          .select()
          .single();

        if (insertError) {
          console.error(`Attempt ${attempt} failed with error:`, insertError);
          // Check if it's a unique constraint violation (race condition)
          if (insertError.code === '23505' && attempt < maxRetries) {
            console.log(`Attempt ${attempt} failed due to duplicate ID ${freshStudentId}, will retry with new ID...`);
            // Add exponential backoff delay before next attempt
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
            continue;
          }
          throw insertError;
        }

        console.log(`Attempt ${attempt} successful, student inserted with ID: ${newStudent.id}`);
        return newStudent;
      } catch (error) {
        console.error(`Attempt ${attempt} failed with exception:`, error);
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
          section_id
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
          name: lastStudent.name,
          fatherName: lastStudent.father_name || 'N/A',
          className: className,
          sectionName: sectionName,
          timestamp: new Date(lastStudent.created_at)
        });
      }
    } catch (error) {
      console.error('Error fetching last added student:', error);
    }
  };

  // Check for active session and classes on mount
  useEffect(() => {
    const checkPrerequisites = async () => {
      if (!user?.school_id) {
        console.error('No school_id found for user');
        showToast('User school information not found', 'error');
        return;
      }

      // Prevent multiple simultaneous calls
      if (progressActiveRef.current) {
        console.log('checkPrerequisites already in progress, skipping...');
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
        console.error('Error checking prerequisites:', error);
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
        console.error('Error fetching classes:', error);
        return;
      }
      const sortedClasses = sortClasses(data || []);
      setClasses(sortedClasses);
    });
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
          console.error('Section fetch error:', error);
        }
        setSections(data || []);
    });
  }, [form.class, user?.school_id]);

  // Focus name field when component is ready (after all loading and checks)
  useEffect(() => {
    if (!loading && activeSession && hasClasses && hasSections) {
      // Try multiple times to ensure focus works
      const focusAttempts = [100, 300, 500];
      const timers: NodeJS.Timeout[] = [];
      
      focusAttempts.forEach((delay) => {
        const timer = setTimeout(() => {
          if (nameRef.current) {
            console.log(`Attempting to focus name field after ${delay}ms`);
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
  
  // Debug: Log form state changes
  useEffect(() => {
    console.log('Form state changed:', form);
  }, [form]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    console.log('Input change:', e.target.name, '=', e.target.value);
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    console.log('Select change:', e.target.name, '=', e.target.value);
    
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
            maxSizeMB: 0.09, // Stricter: target < 100KB
            maxWidthOrHeight: 400, // Stricter: smaller dimensions
            useWebWorker: true,
          });
        } catch (err) {
          showToast('Failed to compress image', 'error');
          return;
        }
      }
      // Log the file size for debugging
      console.log('Compressed file size:', file.size / 1024, 'KB');
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
      discountInFee: '',
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
    });
    setImage(null);
    setSelectedClassHasSections(true); // Reset to default
    if (fileInputRef.current) fileInputRef.current.value = '';
    
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Debug: Log form state before validation
    console.log('Form state before submission:', form);
    
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
    
    // Debug: Log form state after validation
    console.log('Form validation passed, form state:', form);
    
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (!user?.school_id) {
      showToast('User school information not found', 'error');
      return;
    }

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
            discount_in_fee: form.discountInFee || null,
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
            password: 'aa'
      };

      // Debug: Log the data being sent to database
      console.log('Form data being sent to database:', {
        form: form,
        studentData: studentData,
        gender: form.gender,
        religion: form.religion,
        nationality: form.nationality
      });

      // 5. Insert student with custom ID
      setProgress(85);
      
      // Debug: Log the exact data being sent to insertStudentWithRetry
      console.log('Calling insertStudentWithRetry with data:', studentData);
      
      const newStudent = await insertStudentWithRetry(studentData);

      if (!newStudent) {
        console.error('Student insert error: No student returned');
        showToast('Failed to add student: Unknown error', 'error');
        setSubmitting(false);
        completeProgress();
        return;
      }
      
      // Debug: Log the returned student data
      console.log('Student successfully inserted:', newStudent);

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
        console.error('History insert error:', historyError);
        showToast('Failed to add to session history: ' + historyError.message, 'error');
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
        name: form.name,
        fatherName: form.fatherName,
        className: selectedClass?.name || 'Unknown',
        sectionName: selectedSection?.name || (selectedClassHasSections ? 'Unknown' : 'No Section'),
        timestamp: new Date()
      });
      
      showToast(`Student added successfully with ID: ${newStudent.id}!`, 'success');
      handleReset();
    } catch (err: any) {
      console.error('Submission error:', err);
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
    return (
      <ThemeProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
        <FormSkeleton />
      </ThemeProvider>
    );
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
        <Header theme={theme === 'dark' ? darkTheme : lightTheme}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', gap: 8 }}>
            {/* Only show header text on desktop */}
            {window.innerWidth > 700 && (
              <h2 style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                letterSpacing: 1,
                color: theme === 'dark' ? darkTheme.ACCENT : lightTheme.ACCENT,
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1
              }}>
                Student Admission Form
              </h2>
            )}
            <div style={{ flex: 1, display: 'flex', justifyContent: window.innerWidth > 700 ? 'flex-end' : 'center' }}>
              <SegmentedGroup theme={theme === 'dark' ? darkTheme : lightTheme}>
                <SegmentedButton theme={theme === 'dark' ? darkTheme : lightTheme} type="submit" form="admission-form" first>
                  <SaveIcon style={{ fontSize: 17, marginRight: 4, marginBottom: -2 }} />
                  <span className="seg-btn-text">Save</span>
                </SegmentedButton>
                <SegmentedButton theme={theme === 'dark' ? darkTheme : lightTheme} type="button" onClick={handleReset}>
                  <RefreshIcon style={{ fontSize: 17, marginRight: 4, marginBottom: -2 }} />
                  <span className="seg-btn-text">Reset</span>
                </SegmentedButton>
                <SegmentedButton theme={theme === 'dark' ? darkTheme : lightTheme} type="button" onClick={handleCancel} last>
                  <CloseIcon style={{ fontSize: 17, marginRight: 4, marginBottom: -2 }} />
                  <span className="seg-btn-text">Cancel</span>
                </SegmentedButton>
              </SegmentedGroup>
            </div>
          </div>
        </Header>
        <MainContent>
          <MainCard>
            <ModernForm id="admission-form" onSubmit={handleSubmit} style={showConfirm ? { pointerEvents: 'none', userSelect: 'none', opacity: 0.7 } : {}}>
              <FormBlocks>
                <FieldsCard>
                  {lastInsertedStudent && (
                    <LastInsertedFeed theme={theme === 'dark' ? darkTheme : lightTheme}>
                      <span className="feed-label">Last Added:</span>
                      <span className="student-id">#{lastInsertedStudent.id}</span>
                      <span className="student-name">{lastInsertedStudent.name}</span>
                      <span className="student-father">({lastInsertedStudent.fatherName})</span>
                      <span className="student-class">- {lastInsertedStudent.className}({lastInsertedStudent.sectionName})</span>
                    </LastInsertedFeed>
                  )}
            <SectionContainer>
              <div style={{ fontWeight: 700, fontSize: '1.18rem', margin: '18px 0 8px 0', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '1.3em', marginRight: 8 }}>①</span> Student Information
              </div>
              <ModernGrid>
                <Field>
                  <TextField
                    fullWidth
                    name="name"
                    label="Name*"
                    value={form.name}
                    onChange={handleInputChange}
                    inputRef={nameRef}
                    variant="outlined"
                  />
            </Field>
                <Field>
                  <InputLabel id="class-label">Class*</InputLabel>
                  <Select
                    labelId="class-label"
                    name="class"
                    value={form.class}
                    onChange={handleSelectChange}
                    label="Class*"
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
                </Field>
                {selectedClassHasSections && (
                  <Field>
                    <InputLabel id="section-label">Section*</InputLabel>
                    <Select
                      labelId="section-label"
                      name="section"
                      value={form.section}
                      onChange={handleSelectChange}
                      label="Section*"
                      disabled={!form.class}
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
                  </Field>
                )}
                      <Field
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gridRow: '1 / span 2',
                          gridColumn: 4,
                          ...(window.innerWidth <= 700 ? {
                            gridColumn: '1 / -1',
                            gridRow: '1',
                            marginBottom: 8,
                          } : {})
                        }}
                      >
                        <LargeAvatarCircle onClick={handleAvatarClick}>
                          {image ? <AvatarImg src={image} alt="Preview" /> : <AvatarIcon />}
                          {image ? (
                            <RemoveButton type="button" onClick={handleRemoveImage}>
                              ×
                            </RemoveButton>
                          ) : (
                            <UploadHint>Select picture</UploadHint>
                          )}
                          <HiddenFileInput
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImage}
                          />
                        </LargeAvatarCircle>
                </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="admissionDate"
                    label="Date of Admission*"
                    type="date"
                    value={form.admissionDate}
                    onChange={handleInputChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="discountInFee"
                    label="Discount in Fee"
                    type="number"
                    value={form.discountInFee}
                    onChange={handleInputChange}
                    InputProps={{
                      startAdornment: <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>Rs.</Box>
                    }}
                  />
                </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="phone" 
                    label="Mobile No. for SMS/WhatsApp"
                    value={form.phone} 
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setForm(prev => ({ ...prev, phone: value }));
                    }}
                    inputProps={{
                      maxLength: 11,
                      minLength: 10,
                      pattern: '[0-9]*'
                    }}
                  />
                </Field>
                <Field>
                  <FormLabel component="legend">Notification Channel</FormLabel>
                  <RadioGroup
                    row
                    value={form.notificationChannel}
                    onChange={(e) => setForm(prev => ({ ...prev, notificationChannel: (e.target.value as 'whatsapp' | 'sms') }))}
                    name="notificationChannel"
                  >
                    <FormControlLabel value="whatsapp" control={<Radio />} label="WhatsApp" />
                    <FormControlLabel value="sms" control={<Radio />} label="SMS" />
                  </RadioGroup>
                </Field>
              </ModernGrid>
            </SectionContainer>
            <SectionContainer>
              <div style={{ fontWeight: 700, fontSize: '1.18rem', margin: '18px 0 8px 0', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '1.3em', marginRight: 8 }}>②</span> Other Information
              </div>
              <ModernGrid>
                <Field>
                  <TextField
                    fullWidth
                    name="dob"
                    label="Date of Birth"
                    type="date"
                    value={form.dob}
                    onChange={handleInputChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="studentId"
                    label="Student Birth Form ID / NIC"
                    value={form.studentId}
                    onChange={handleInputChange}
                  />
                </Field>
                <Field>
                  <InputLabel id="gender-label">Gender</InputLabel>
                  <Select
                    labelId="gender-label"
                    name="gender"
                    value={form.gender}
                    onChange={handleSelectChange}
                    label="Gender"
                  >
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </Field>
            <Field>
                  <TextField
                    fullWidth
                    name="cast"
                    label="Cast"
                    value={form.cast}
                    onChange={handleInputChange}
                  />
                </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="orphan"
                    label="Orphan Student"
                    value={form.orphan}
                    onChange={handleInputChange}
                  />
                </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="osc" 
                    label="OSC Number"
                    value={form.osc} 
                    onChange={handleInputChange}
                  />
            </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="idMark"
                    label="Identification Mark"
                    value={form.idMark}
                    onChange={handleInputChange}
                  />
                </Field>
                <Field>
                  <InputLabel id="blood-group-label">Blood Group</InputLabel>
                  <Select
                    labelId="blood-group-label"
                    name="bloodGroup"
                    value={form.bloodGroup || ''}
                    onChange={handleSelectChange}
                    label="Blood Group"
                  >
                    <MenuItem value="">Select</MenuItem>
                    {BLOOD_GROUPS.map(bg => (
                      <MenuItem key={bg} value={bg}>{bg}</MenuItem>
                    ))}
              </Select>
            </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="previousSchool"
                    label="Previous School"
                    value={form.previousSchool}
                    onChange={handleInputChange}
                  />
                </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="previousId"
                    label="Previous ID / Board Roll No"
                    value={form.previousId}
                    onChange={handleInputChange}
                  />
                </Field>
                <Field>
                  <InputLabel id="religion-label">Religion</InputLabel>
                  <Select
                    labelId="religion-label"
                    name="religion"
                    value={form.religion}
                    onChange={handleSelectChange}
                    label="Religion"
                  >
                    {RELIGIONS.map(r => (
                      <MenuItem key={r} value={r}>{r}</MenuItem>
                    ))}
                  </Select>
                </Field>
                <Field>
                  <InputLabel id="nationality-label">Nationality</InputLabel>
                  <Select
                    labelId="nationality-label"
                    name="nationality"
                    value={form.nationality}
                    onChange={handleSelectChange}
                    label="Nationality"
                  >
                    {NATIONALITIES.map(n => (
                      <MenuItem key={n} value={n}>{n}</MenuItem>
                    ))}
                  </Select>
                </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="totalSiblings"
                    label="Total Siblings"
                    type="number"
                    value={form.totalSiblings}
                    onChange={handleInputChange}
                    inputProps={{ min: 0 }}
                  />
                </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="disease"
                    label="Disease If Any?"
                    value={form.disease}
                    onChange={handleInputChange}
                  />
                </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="additionalNote"
                    label="Additional Note"
                    value={form.additionalNote}
                    onChange={handleInputChange}
                  />
                </Field>
                <Field style={{ gridColumn: '1 / -1' }}>
                  <TextField
                    fullWidth
                    name="address"
                    label="Address"
                    value={form.address}
                    onChange={handleInputChange}
                  />
                </Field>
              </ModernGrid>
            </SectionContainer>
            <SectionContainer>
              <div style={{ fontWeight: 700, fontSize: '1.18rem', margin: '18px 0 8px 0', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '1.3em', marginRight: 8 }}>③</span> Father/Guardian Information
              </div>
              <ModernGrid>
                <Field>
                  <TextField
                    fullWidth
                    name="fatherName"
                    label="Father Name*"
                    value={form.fatherName}
                    onChange={handleInputChange}
                    inputRef={fatherRef}
                  />
                </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="fatherNationalId"
                    label="Father National ID"
                    value={form.fatherNationalId}
                    onChange={handleInputChange}
                  />
                </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="fatherEducation"
                    label="Education"
                    value={form.fatherEducation}
                    onChange={handleInputChange}
                  />
                </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="fatherMobile"
                    label="Mobile No"
                    value={form.fatherMobile}
                    onChange={handleInputChange}
                    inputProps={{
                      pattern: '[0-9]*',
                      inputMode: 'numeric'
                    }}
                  />
                </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="fatherOccupation"
                    label="Occupation"
                    value={form.fatherOccupation}
                    onChange={handleInputChange}
                  />
                </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="fatherIncome"
                    label="Income"
                    type="number"
                    value={form.fatherIncome}
                    onChange={handleInputChange}
                    InputProps={{
                      startAdornment: <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>Rs.</Box>
                    }}
                  />
                  </Field>
              </ModernGrid>
            </SectionContainer>
            <SectionContainer>
              <div style={{ fontWeight: 700, fontSize: '1.18rem', margin: '18px 0 8px 0', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '1.3em', marginRight: 8 }}>④</span> Mother Information
              </div>
              <ModernGrid>
                <Field>
                  <TextField
                    fullWidth
                    name="motherName"
                    label="Mother Name"
                    value={form.motherName}
                    onChange={handleInputChange}
                  />
                </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="motherNationalId"
                    label="Mother National ID"
                    value={form.motherNationalId}
                    onChange={handleInputChange}
                  />
                </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="motherEducation"
                    label="Education"
                    value={form.motherEducation}
                    onChange={handleInputChange}
                  />
                </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="motherMobile"
                    label="Mobile No"
                    value={form.motherMobile}
                    onChange={handleInputChange}
                    inputProps={{
                      pattern: '[0-9]*',
                      inputMode: 'numeric'
                    }}
                  />
                </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="motherOccupation"
                    label="Occupation"
                    value={form.motherOccupation}
                    onChange={handleInputChange}
                  />
                </Field>
                <Field>
                  <TextField
                    fullWidth
                    name="motherIncome"
                    label="Income"
                    type="number"
                    value={form.motherIncome}
                    onChange={handleInputChange}
                    InputProps={{
                      startAdornment: <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>Rs.</Box>
                    }}
                  />
            </Field>
              </ModernGrid>
            </SectionContainer>
          </FieldsCard>
        </FormBlocks>
      </ModernForm>
          </MainCard>
        </MainContent>
      </PageContainer>
    </ThemeProvider>
  );
};

export default StudentAdmissionForm; 