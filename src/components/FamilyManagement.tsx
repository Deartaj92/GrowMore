import React, { useState, useEffect, useContext, useRef } from 'react';
import styled, { ThemeProvider, keyframes } from 'styled-components';
import { supabase } from '../supabaseClient';
import { ThemeContext, darkTheme, lightTheme, useProgress } from './Layout';
import { FamilyRestroom, PersonAdd, Person, Add as AddIcon, Close as CloseIcon, Edit as EditIcon, Delete as DeleteIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { sortClasses } from '../utils/classUtils';
import {
    Box,
    Button as MuiButton,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
    Dialog,
    DialogContent,
    IconButton as MuiIconButton,
    useTheme,
    useMediaQuery,
    styled as muiStyled,
    Avatar
} from '@mui/material';
import { Theme as MuiTheme } from '@mui/material/styles';
import imageCompression from 'browser-image-compression';

import Loader from '../components/Loader';
const PageContainer = styled.div`
  width: 100%;
  padding: 1.2rem 1.2rem 2rem 1.2rem;
  background: ${({ theme }) => theme.BG};
  min-height: 100vh;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
`;

const FamiliesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-top: 0.2rem;
`;

const FamilyCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  padding: 1.5rem 1.5rem 1.2rem 1.5rem;
  box-shadow: ${({ theme }) => theme.SHADOW};
  transition: border-color 0.18s, box-shadow 0.18s;
  border: 1.5px solid ${({ theme }) => theme.BORDER};
  position: relative;
  overflow: hidden;
  margin-bottom: 0.5rem;
  min-width: 220px;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  height: 100%;
  &:hover {
    border-color: #6366f1;
  }
`;

const AddFamilyCard = styled(FamilyCard)`
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

const FamilyHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

// Add a helper for avatar color
function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ('00' + value.toString(16)).slice(-2);
  }
  return color;
}

const FamilyAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ $bg }: { $bg: string }) => $bg};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #fff;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  overflow: hidden;
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    display: block;
  }
`;

const FamilyInfo = styled.div`
  flex: 1;
`;

const FamilyName = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  color: ${({ theme }) => theme.ACCENT};
  font-weight: 700;
`;

const FamilyDetails = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.98rem;
`;

const MemberList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 1rem 0 0 0;
`;

const MemberItem = styled.li`
  display: flex;
  align-items: center;
  gap: 0.7rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 0.3rem;
  background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#f3f4f8'};
  padding: 0.5rem;
  border-radius: 8px;
  position: relative;

  span {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .member-actions {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    gap: 0.3rem;
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 2;
    align-items: center;
  }
  &:hover .member-actions {
    opacity: 1;
  }
  .unlink-btn {
    opacity: 1 !important;
    position: static;
    transform: none;
    margin-left: 0.2rem;
  }
  &.primary-contact {
    border: 2px solid #22c55e !important;
    box-shadow: 0 0 0 2px #22c55e33;
  }
`;

const MemberIcon = styled.div`
  color: ${({ theme }) => theme.ACCENT};
  font-size: 1.2rem;
  display: flex;
  align-items: center;
`;

const CardActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 1.2rem;
  justify-content: flex-end;
`;

const StyledIconButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${({ theme }) => theme.HOVER_BG};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DeleteButton = styled(StyledIconButton)`
  &:hover {
    color: #ef4444;
  }
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.98rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  background: ${({ theme }) => theme.ACCENT};
  color: white;
  min-width: 0;
  width: auto;
  &:hover {
    background: ${({ theme }) => theme.ACCENT_INPUT};
    transform: translateY(-1px);
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 14px;
  padding: 1.1rem 1.2rem 1.2rem 1.2rem;
  width: 96%;
  max-width: 370px;
  position: relative;
  border: 1px solid ${({ theme }) => theme.BORDER};
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

const UnlinkButton = styled.button`
  background: none;
  border: none;
  color: #ef4444;
  font-size: 1.2rem;
  cursor: pointer;
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  &:hover {
    color: #dc2626;
  }
`;

const StudentAvatar = styled.div<{ $src?: string; $bg: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ $bg }) => $bg};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: #fff;
  font-weight: 700;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    display: block;
  }
`;

const StudentAvatarPreview = styled.div<{ $top: number; $left: number; $themeObj: any }>`
  position: fixed;
  top: ${({ $top }) => $top}px;
  left: ${({ $left }) => $left}px;
  z-index: 2000;
  background: ${({ $themeObj }) => $themeObj.CARD};
  border: 2px solid ${({ $themeObj }) => $themeObj.ACCENT};
  border-radius: 50%;
  box-shadow: 0 4px 24px #0007;
  width: 96px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  transition: opacity 0.18s;
  opacity: 1;
`;

// Toast styles (copied and adapted from StudentAdmissionForm.tsx)
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

const DeleteModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(30, 32, 38, 0.38);
  backdrop-filter: blur(7px) saturate(1.2);
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: modal-fade-in 0.25s;
  @media (max-width: 700px) {
    align-items: flex-start;
    padding: 24px 0 0 0;
  }
  @keyframes modal-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;
const DeleteModalBox = styled.div`
  background: ${({theme}) => theme.CARD};
  color: ${({theme}) => theme.TEXT_PRIMARY};
  border-radius: 16px;
  box-shadow: 0 8px 32px #0007;
  padding: 32px 36px 24px 36px;
  min-width: 320px;
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
const DeleteModalActions = styled.div`
  display: flex;
  gap: 18px;
  margin-top: 24px;
`;
const DeleteModalButton = styled.button`
  padding: 10px 28px;
  border-radius: 8px;
  border: 1.5px solid ${props => props.theme.FIELD_BORDER};
  font-size: 1.08rem;
  font-weight: 600;
  cursor: pointer;
  background: #ef4444;
  color: #fff;
  transition: background 0.18s, border 0.18s;
  overflow-wrap: break-word;
  &:hover { background: #b91c1c; border-color: #b91c1c; }
`;
const DeleteModalCancel = styled(DeleteModalButton)`
  background: ${props => props.theme.CANCEL_BG};
  color: ${props => props.theme.CANCEL_COLOR};
  &:hover, &:focus { background: ${props => props.theme.ACCENT_INPUT}; color: #fff; border-color: ${props => props.theme.ACCENT_INPUT}; }
`;

// Add sound effects for toasts
// Use local files in public directory
const successSoundUrl = '/success.mp3';
const errorSoundUrl = '/error.mp3';

const FamilyAvatarPreview = styled.div<{ $top: number; $left: number; $themeObj: any }>`
  position: fixed;
  top: ${({ $top }) => $top}px;
  left: ${({ $left }) => $left}px;
  z-index: 2100;
  background: ${({ $themeObj }) => $themeObj.CARD};
  border: 2px solid ${({ $themeObj }) => $themeObj.ACCENT};
  border-radius: 50%;
  box-shadow: 0 4px 24px #0007;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  transition: opacity 0.18s;
  opacity: 1;
`;

// Add a styled span for class-section info
const ClassSectionInfo = styled.span`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.92em;
  margin-left: 0.4em;
  font-weight: 500;
`;

const MemberGrid = styled.ul`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.4rem 0.7rem;
  list-style: none;
  padding: 0;
  margin: 1rem 0 0 0;
`;

const MemberItemSmall = styled(MemberItem)`
  font-size: 0.85rem;
  padding: 0.35rem 0.4rem;
  margin-bottom: 0;
  min-width: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  
  span {
    font-size: 0.85em;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .member-actions {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    gap: 0.3rem;
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 2;
    align-items: center;
  }
  &:hover .member-actions {
    opacity: 1;
  }
  .unlink-btn {
    opacity: 1 !important;
    position: static;
    transform: none;
    margin-left: 0.2rem;
  }
  &.primary-contact {
    border: 2px solid #22c55e !important;
    box-shadow: 0 0 0 2px #22c55e33;
  }
`;

// Enhanced Modal Components (copied from CreateReportForm)
const StyledDialog = muiStyled(Dialog)(({ theme }: { theme: MuiTheme }) => ({
    zIndex: 1300,
    '& .MuiDialog-paper': {
        borderRadius: '16px',
        background: theme.palette.mode === 'dark' 
            ? theme.palette.background.paper 
            : theme.palette.background.paper,
        maxWidth: '600px',
        width: '95%',
        margin: '84px 16px 16px',
        overflow: 'hidden',
        boxShadow: theme.palette.mode === 'dark'
            ? '0 0 40px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.4)'
            : '0 0 40px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.1)',
        border: theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.05)'
            : '1px solid rgba(0, 0, 0, 0.05)',
        transform: 'translateY(0)',
        transition: 'all 0.3s ease-in-out',
        position: 'relative',
        zIndex: 1301,
        [theme.breakpoints.down('sm')]: {
            width: 'calc(100% - 32px)',
            height: 'calc(100% - 96px)',
            margin: '76px 16px 20px',
            borderRadius: '16px',
            maxHeight: 'calc(100% - 96px)'
        }
    },
    '& .MuiBackdrop-root': {
        backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(0, 0, 0, 0.5)'
            : 'rgba(255, 255, 255, 0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        position: 'fixed',
        zIndex: 1300
    }
}));

const DialogHeader = muiStyled(Box)(({ theme }: { theme: MuiTheme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: `1px solid ${theme.palette.mode === 'dark' 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'rgba(0, 0, 0, 0.05)'}`,
    background: theme.palette.mode === 'dark'
        ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
        : 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
    backdropFilter: 'blur(8px)',
    position: 'relative',
    zIndex: 1
}));

const DialogTitle = muiStyled(Typography)(({ theme }: { theme: MuiTheme }) => ({
    fontSize: '1.5rem',
    fontWeight: 600,
    color: theme.palette.mode === 'dark'
        ? theme.palette.primary.light
        : theme.palette.primary.main,
    textShadow: theme.palette.mode === 'dark'
        ? '0 2px 4px rgba(0, 0, 0, 0.5)'
        : 'none'
}));

const StyledDialogContent = muiStyled(DialogContent)(({ theme }: { theme: MuiTheme }) => ({
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxHeight: 'calc(100vh - 180px)',
    overflowY: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.2) transparent'
        : 'rgba(0, 0, 0, 0.2) transparent',
    '&::-webkit-scrollbar': {
        width: '8px',
        backgroundColor: 'transparent'
    },
    '&::-webkit-scrollbar-track': {
        background: 'transparent',
        borderRadius: '4px',
        margin: '4px'
    },
    '&::-webkit-scrollbar-thumb': {
        backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.2)'
            : 'rgba(0, 0, 0, 0.2)',
        borderRadius: '4px',
        border: `2px solid ${theme.palette.mode === 'dark'
            ? theme.palette.background.paper
            : theme.palette.background.paper}`,
        '&:hover': {
            backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.3)'
                : 'rgba(0, 0, 0, 0.3)'
        }
    },
    background: theme.palette.mode === 'dark'
        ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 100%)'
        : 'linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 100%)',
    '& .MuiFormControl-root': {
        transition: 'background-color 0.2s ease',
    },
    '& .MuiInputBase-root': {
        background: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.03)'
            : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(8px)',
        borderRadius: '8px',
        border: theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.05)'
            : '1px solid rgba(0, 0, 0, 0.05)',
        transition: 'background-color 0.2s ease',
        '&:hover, &.Mui-focused': {
            background: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.05)'
                : 'rgba(255, 255, 255, 0.9)',
        },
        '& .MuiSelect-select, & .MuiInputBase-input': {
            padding: '12px 14px',
            fontSize: '0.95rem',
            '&::placeholder': {
                color: theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.3)'
                    : 'rgba(0, 0, 0, 0.3)',
                opacity: 1
            }
        },
        '& .MuiOutlinedInput-notchedOutline': {
            border: 'none'
        }
    }
}));

const FormActions = muiStyled(Box)(({ theme }: { theme: MuiTheme }) => ({
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: `1px solid ${theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(0, 0, 0, 0.05)'}`,
    background: theme.palette.mode === 'dark'
        ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
        : 'linear-gradient(0deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
    '& .MuiButton-root': {
        borderRadius: '8px',
        textTransform: 'none',
        padding: '8px 20px',
        fontWeight: 500,
        transition: 'background-color 0.2s ease'
    }
}));

// Avatar Upload Section - matching SchoolsManagement exactly
const AvatarUploadBox = muiStyled(Box)(({ theme }: { theme: MuiTheme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  padding: '20px',
  border: `2px dashed ${theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.2)' 
    : 'rgba(0, 0, 0, 0.2)'}`,
  borderRadius: '12px',
  background: theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.02)'
    : 'rgba(0, 0, 0, 0.02)',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    background: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(0, 0, 0, 0.05)'
  }
}));

// --- FamilyManagement Skeleton Loader Styled Components (matching StudentList) ---
const FamilyManagementSkeletonContainer = styled.div`
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
const FamilyManagementSkeletonGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem 1.5rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 18px 0 32px 0;
  background: transparent;
`;
const FamilySkeletonCard = styled.div`
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#232a3b' : '#f3f4f6'};
  border-radius: 16px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.10), 0 1.5px 6px rgba(0,0,0,0.10);
  border: 1.5px solid ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#353b4a' : '#e5e7eb'};
  min-height: 180px;
  width: 100%;
  max-width: 340px;
  margin: 0 auto;
  padding: 1.5rem 1.5rem 1.2rem 1.5rem;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
    z-index: 2;
    border-radius: 16px;
  }
  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
  }
`;
const FamilySkeletonAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  margin: 0 auto 18px auto;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent);
    animation: shimmer 1.5s infinite;
    border-radius: 50%;
  }
`;
const FamilySkeletonLine = styled.div<{ width?: string; height?: string }>`
  height: ${({ height }) => height || '18px'};
  width: ${({ width }) => width || '80%'};
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#353b4a' : '#e0e7ef'};
  border-radius: 8px;
  margin: 10px auto 0 auto;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent);
    animation: shimmer 1.5s infinite;
    border-radius: 8px;
  }
`;
const FamilySkeletonDivider = styled.div`
  width: 60%;
  height: 2px;
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#353b4a' : '#e5e7eb'};
  margin: 8px auto 8px auto;
  border-radius: 2px;
`;
const skeletonFamilyCount = 8;
const FamilyManagementSkeleton: React.FC = () => (
  <FamilyManagementSkeletonContainer>
    <FamilyManagementSkeletonGrid>
      {Array.from({ length: skeletonFamilyCount }).map((_, i) => (
        <FamilySkeletonCard key={i}>
          <FamilySkeletonAvatar />
          <FamilySkeletonLine width="70%" height="22px" />
          <FamilySkeletonLine width="50%" height="16px" />
          <FamilySkeletonDivider />
          <FamilySkeletonLine width="60%" height="14px" />
          <FamilySkeletonLine width="40%" height="14px" />
        </FamilySkeletonCard>
      ))}
    </FamilyManagementSkeletonGrid>
  </FamilyManagementSkeletonContainer>
);

const FamilyManagement: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const { user } = useAuth();
  const themeObj = theme === 'dark' ? darkTheme : lightTheme;
  const muiTheme = useTheme();
  const fullScreen = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const [families, setFamilies] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    contact_number: '',
    avatar_url: '',
  });
  const [linkStudentId, setLinkStudentId] = useState('');
  const [linkClassId, setLinkClassId] = useState('');
  const [linkSectionId, setLinkSectionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [studentAvatarPreview, setStudentAvatarPreview] = useState<{
    src?: string;
    initials?: string;
    bg: string;
    top: number;
    left: number;
  } | null>(null);
  const previewTimeout = useRef<NodeJS.Timeout | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFamily, setEditingFamily] = useState<any>(null);
  const [toasts, setToasts] = useState<Array<{msg: string, type: 'error' | 'success', id: number}>>([]);
  const toastId = useRef(0);
  const themeMode = theme === 'dark' ? 'dark' : 'light';
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [familyToDelete, setFamilyToDelete] = useState<any>(null);
  const [familyAvatarPreview, setFamilyAvatarPreview] = useState<{
    src?: string;
    initials?: string;
    bg: string;
    top: number;
    left: number;
  } | null>(null);
  const { startProgress, setProgress, completeProgress } = useProgress();
  const [loadingFamilies, setLoadingFamilies] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchAll = async () => {
      startProgress(false);
      setProgress(10);
      await fetchFamilies();
      setProgress(40);
      await fetchStudents();
      setProgress(70);
      await fetchClasses();
      await fetchSections();
      setProgress(100);
      setTimeout(() => {
        if (isMounted) setLoadingFamilies(false);
        completeProgress();
      }, 400);
    };
    if (user?.school_id) {
      setLoadingFamilies(true);
      fetchAll();
    }
    return () => { isMounted = false; };
  }, [user?.school_id]);

  const fetchFamilies = async () => {
    const { data, error } = await supabase
      .from('families')
      .select(`*, family_members (*, student:students (*))`)
      .eq('school_id', user?.school_id);
    if (!error && data) setFamilies(data);
  };

  const fetchStudents = async () => {
    if (!user?.school_id) return;
    
    let sessionToUse = null;
    // Get active session
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('id, is_active')
      .eq('school_id', user.school_id);
    if (sessionsData) {
      const activeSession = sessionsData.find((s) => s.is_active);
      if (activeSession) sessionToUse = String(activeSession.id);
    }
    
    if (sessionToUse) {
      // Fetch from student_class_history for the active session
    const { data, error } = await supabase
        .from('student_class_history')
        .select(`
          student_id,
          class_id,
          section_id,
          classes:class_id(name),
          sections:section_id(name),
          session_id
        `)
        .eq('session_id', sessionToUse)
        .eq('school_id', user.school_id)
        .order('id', { ascending: false });
      
      if (!error && data) {
        // Fetch student data separately since we can't use automatic joins with composite keys
        const studentIds = Array.from(new Set(data.map((sch: any) => sch.student_id)));
        const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('*')
          .eq('school_id', user.school_id)
          .in('id', studentIds);
        
        if (!studentsError && studentsData) {
          // Create a map of student data by ID
          const studentsMap = new Map(studentsData.map((student: any) => [student.id, student]));
          // Map to student-like objects for rendering
          const mapped = data.map((sch: any) => {
            const student = studentsMap.get(sch.student_id);
            return {
              ...student,
              class_id: sch.class_id,
              section_id: sch.section_id,
              classes: sch.classes,
              sections: sch.sections,
              session_id: sch.session_id,
            };
          });
          setStudents(mapped);
        }
      }
    } else {
      // Fallback: fetch all students for the school
      const { data, error } = await supabase
        .from('students')
        .select(`*, classes(name), sections(name)`)
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false });
      if (!error) setStudents(data || []);
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

  const fetchSections = async () => {
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('school_id', user?.school_id);
    if (!error && data) setSections(data);
  };

  // Play sound for toast
  const playToastSound = (type: 'error' | 'success') => {
    const url = type === 'success' ? successSoundUrl : errorSoundUrl;
    const audio = new Audio(url);
    audio.volume = 0.25;
    audio.play();
  };

  // Toast logic
  const showToast = (msg: string, type: 'error' | 'success' = 'success') => {
    playToastSound(type);
    const id = toastId.current++;
    setToasts(prev => [...prev, {msg, type, id}]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2200);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      reader.onload = (ev: ProgressEvent<FileReader>) => setAvatarPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
      // Store the file for upload
      setAvatarFile(file);
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleAddFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    startProgress(false);
    setProgress(20);
    let avatar_url = '';
    try {
      if (avatarFile) {
        setProgress(40);
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `family_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('family-avatars')
          .upload(fileName, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('family-avatars')
          .getPublicUrl(fileName);
        avatar_url = publicUrl;
      }
      setProgress(70);
      const { error } = await supabase
        .from('families')
        .insert([{ ...form, avatar_url, school_id: user?.school_id }]);
      if (error) throw error;
      setShowAddModal(false);
      setForm({ name: '', address: '', contact_number: '', avatar_url: '' });
      setAvatarFile(null);
      setAvatarPreview(null);
      await fetchFamilies();
      showToast('Family added successfully!', 'success');
      setProgress(100);
    } catch (error: any) {
      showToast('Failed to add family: ' + (error?.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
      completeProgress();
    }
  };

  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamily || !linkStudentId) return;
    setLoading(true);
    startProgress(false);
    setProgress(20);
    try {
      const { error } = await supabase.from('family_members').insert([
        {
          family_id: selectedFamily.id,
          student_id: linkStudentId,
          is_primary_contact: false,
          school_id: user?.school_id
        },
      ]);
      setProgress(70);
      if (error) throw error;
      setShowLinkModal(false);
      setLinkStudentId('');
      setLinkClassId('');
      setLinkSectionId('');
      await fetchFamilies();
      showToast('Student linked to family!', 'success');
      setProgress(100);
    } catch (error: any) {
      showToast('Failed to link student: ' + (error?.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
      completeProgress();
    }
  };

  // Compute all linked student IDs
  const linkedStudentIds = new Set(
    families.flatMap((fam: any) => fam.family_members?.map((m: any) => m.student_id) || [])
  );

  // Filter sections based on selected class
  const filteredSections = linkClassId
    ? sections.filter((s: any) => String(s.class_id) === linkClassId)
    : sections;

  // Filter students based on selected class and section
  const filteredStudents = students.filter((student: any) => {
    if (linkClassId && String(student.class_id) !== linkClassId) return false;
    if (linkSectionId && String(student.section_id) !== linkSectionId) return false;
    return true;
  });

  // Helper to get initials
  function getInitials(name: string) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  // Unlink student from family
  const handleUnlinkStudent = async (familyMemberId: string) => {
    setUnlinkingId(familyMemberId);
    try {
      await supabase.from('family_members').delete().eq('id', familyMemberId);
      fetchFamilies();
      showToast('Student unlinked from family!', 'success');
    } catch (error: any) {
      console.error('Error unlinking student:', error);
      showToast('Failed to unlink student: ' + (error?.message || 'Unknown error'), 'error');
    } finally {
      setUnlinkingId(null);
    }
  };

  function getStudentInitials(name: string) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  const handleEditFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFamily) return;
    setLoading(true);
    startProgress(false);
    setProgress(20);
    try {
      let avatar_url = editingFamily.avatar_url;
      if (avatarFile) {
        setProgress(40);
        // Delete old avatar if it exists
        if (editingFamily.avatar_url) {
          const url = editingFamily.avatar_url;
          const match = url.match(/family-avatars\/([^?\s]+)/);
          if (match && match[1]) {
            const path = match[1];
            await supabase.storage.from('family-avatars').remove([path]);
          }
        }
        // Upload new avatar
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `family_${editingFamily.id}_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('family-avatars')
          .upload(fileName, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('family-avatars')
          .getPublicUrl(fileName);
        avatar_url = publicUrl;
      } else if (avatarPreview === null) {
        setProgress(40);
        // Avatar was removed
        if (editingFamily.avatar_url) {
          const url = editingFamily.avatar_url;
          const match = url.match(/family-avatars\/([^?\s]+)/);
          if (match && match[1]) {
            const path = match[1];
            await supabase.storage.from('family-avatars').remove([path]);
          }
        }
        avatar_url = null;
      }
      setProgress(70);
      const { error } = await supabase
        .from('families')
        .update({ ...form, avatar_url })
        .eq('id', editingFamily.id)
        .eq('school_id', user?.school_id);
      if (error) throw error;
      setShowEditModal(false);
      setEditingFamily(null);
      setForm({ name: '', address: '', contact_number: '', avatar_url: '' });
      setAvatarFile(null);
      setAvatarPreview(null);
      await fetchFamilies();
      showToast('Family updated successfully!', 'success');
      setProgress(100);
    } catch (error: any) {
      showToast('Failed to update family: ' + (error?.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
      completeProgress();
    }
  };

  const handleDeleteFamily = (family: any) => {
    setFamilyToDelete(family);
    setShowDeleteModal(true);
  };

  // Actual delete logic
  const confirmDeleteFamily = async () => {
    if (!familyToDelete) return;
    try {
      const { error } = await supabase
        .from('families')
        .delete()
        .eq('id', familyToDelete.id)
        .eq('school_id', user?.school_id);
      if (error) throw error;
      fetchFamilies();
      showToast('Family deleted successfully!', 'success');
    } catch (error: any) {
      console.error('Error deleting family:', error);
      showToast('Failed to delete family: ' + (error?.message || 'Unknown error'), 'error');
    } finally {
      setShowDeleteModal(false);
      setFamilyToDelete(null);
    }
  };

  const startEditFamily = (family: any) => {
    setEditingFamily(family);
    setForm({
      name: family.name,
      address: family.address,
      contact_number: family.contact_number,
      avatar_url: family.avatar_url
    });
    setAvatarPreview(family.avatar_url);
    setShowEditModal(true);
  };

  // When opening Add Family modal, always reset form and avatar
  const openAddFamilyModal = () => {
    setForm({ name: '', address: '', contact_number: '', avatar_url: '' });
    setAvatarFile(null);
    setAvatarPreview(null);
    setShowAddModal(true);
  };

  // Helper to get class and section name
  function getClassSectionString(student: any) {
    const cls = classes.find((c: any) => c.id === student.class_id);
    const sec = sections.find((s: any) => s.id === student.section_id);
    if (cls && sec) return `(${cls.name}-${sec.name})`;
    if (cls) return `(${cls.name})`;
    return '';
  }

  const handleCloseModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setForm({ name: '', address: '', contact_number: '', avatar_url: '' });
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  return (
    <ThemeProvider theme={themeObj}>
      {/* Toasts */}
      {toasts.length > 0 && (
        <ToastContainer>
          {toasts.map(t => (
            <ToastMsg key={t.id} type={t.type} themeMode={themeMode}>
              {t.msg}
            </ToastMsg>
          ))}
        </ToastContainer>
      )}
      {/* Family Avatar Hover Preview */}
      {familyAvatarPreview && (
        <FamilyAvatarPreview $top={familyAvatarPreview.top} $left={familyAvatarPreview.left} $themeObj={themeObj}>
          {familyAvatarPreview.src ? (
            <img src={familyAvatarPreview.src} alt="Preview" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
          ) : (
            <span style={{ fontSize: '2.8rem', fontWeight: 800 }}>{familyAvatarPreview.initials}</span>
          )}
        </FamilyAvatarPreview>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteModalOverlay>
          <DeleteModalBox theme={themeObj}>
            <div style={{fontSize: '1.15rem', fontWeight: 600, marginBottom: 10}}>Delete Family</div>
            <div style={{marginBottom: 10}}>Are you sure you want to delete <b>{familyToDelete?.name}</b> and unlink all its students?</div>
            <DeleteModalActions>
              <DeleteModalCancel onClick={() => { setShowDeleteModal(false); setFamilyToDelete(null); }}>Cancel</DeleteModalCancel>
              <DeleteModalButton onClick={confirmDeleteFamily}>Delete</DeleteModalButton>
            </DeleteModalActions>
          </DeleteModalBox>
        </DeleteModalOverlay>
      )}
      <PageContainer>
        {loadingFamilies ? (
          <FamilyManagementSkeleton />
        ) : (
          <FamiliesGrid>
            {families.map(family => (
              <FamilyCard key={family.id}>
                <FamilyHeader>
                  <Avatar src={family.avatar_url || undefined} sx={{ width: 48, height: 48, fontSize: '1.5rem', bgcolor: stringToColor(family.name) }}>
                    {!family.avatar_url && getInitials(family.name)}
                  </Avatar>
                  <FamilyInfo>
                    <FamilyName>{family.name}</FamilyName>
                    <FamilyDetails>
                      {family.address}<br />
                      <b>Contact:</b> {family.contact_number || '-'}
                    </FamilyDetails>
                  </FamilyInfo>
                </FamilyHeader>
                <div style={{marginTop: 10, marginBottom: 4, fontWeight: 600, color: themeObj.TEXT_PRIMARY}}>Linked Students:</div>
                {family.family_members && family.family_members.length > 0 ? (
                    <MemberList>
                    {[...family.family_members]
                      .sort((a, b) => (b.is_primary_contact ? 1 : 0) - (a.is_primary_contact ? 1 : 0))
                      .map((member: any) => (
                        <MemberItem key={member.id} className={member.is_primary_contact ? 'primary-contact' : ''}>
                          <StudentAvatar
                            $src={member.student?.picture_url}
                            $bg={stringToColor(member.student?.name || '')}
                            onMouseEnter={e => {
                              if (previewTimeout.current) clearTimeout(previewTimeout.current);
                              const rect = (e.target as HTMLElement).getBoundingClientRect();
                              setStudentAvatarPreview({
                                src: member.student?.picture_url,
                                initials: getStudentInitials(member.student?.name || ''),
                                bg: stringToColor(member.student?.name || ''),
                                top: rect.top - 110 < 0 ? rect.bottom + 8 : rect.top - 110,
                                left: rect.left - 32 < 0 ? rect.right + 8 : rect.left - 32,
                              });
                            }}
                            onMouseLeave={() => {
                              previewTimeout.current = setTimeout(() => setStudentAvatarPreview(null), 120);
                            }}
                          >
                            {member.student?.picture_url ? (
                              <img src={member.student.picture_url} alt={member.student.name} />
                            ) : (
                              getStudentInitials(member.student?.name || '')
                            )}
                          </StudentAvatar>
                          <span>
                            {member.student?.name}
                            {getClassSectionString(member.student) && (
                              <ClassSectionInfo>{getClassSectionString(member.student)}</ClassSectionInfo>
                            )}
                          </span>
                          <div className="member-actions">
                            <MuiButton
                              variant={member.is_primary_contact ? 'contained' : 'outlined'}
                              color="primary"
                              size="small"
                              disabled={member.is_primary_contact || loading}
                              sx={{ minWidth: 0, px: 1.2, fontSize: '0.78rem', fontWeight: 600, textTransform: 'none', height: 24, borderRadius: '7px' }}
                              onClick={async () => {
                                if (member.is_primary_contact) return;
                                setLoading(true);
                                try {
                                  await supabase
                                    .from('family_members')
                                    .update({ is_primary_contact: false })
                                    .eq('family_id', family.id);
                                  await supabase
                                    .from('family_members')
                                    .update({ is_primary_contact: true })
                                    .eq('id', member.id);
                                  fetchFamilies();
                                  showToast('Primary contact updated!', 'success');
                                } catch (error) {
                                  showToast('Failed to update primary contact', 'error');
                                } finally {
                                  setLoading(false);
                                }
                              }}
                            >
                              {member.is_primary_contact ? 'Primary' : 'Make Primary'}
                            </MuiButton>
                            <MuiIconButton
                              className="unlink-btn"
                              onClick={() => handleUnlinkStudent(member.id)}
                              disabled={unlinkingId === member.id}
                              title="Unlink student from family"
                              size="small"
                              sx={{ width: 22, height: 22, ml: 0.2 }}
                            >
                              <CloseIcon sx={{ fontSize: '1rem' }} />
                            </MuiIconButton>
                          </div>
                        </MemberItem>
                      ))}
                    </MemberList>
                ) : (
                  <MemberList>
                    <MemberItem style={{ justifyContent: 'center', color: themeObj.TEXT_SECONDARY, fontStyle: 'italic' }}>None</MemberItem>
                  </MemberList>
                )}
                <CardActions>
                  <StyledIconButton onClick={() => startEditFamily(family)} title="Edit Family">
                    <EditIcon fontSize="small" />
                  </StyledIconButton>
                  <DeleteButton onClick={() => handleDeleteFamily(family)} title="Delete Family">
                    <DeleteIcon fontSize="small" />
                  </DeleteButton>
                  <Button onClick={() => { setSelectedFamily(family); setShowLinkModal(true); }}>
                    <PersonAdd style={{ fontSize: 18 }} /> Link Student
                  </Button>
                </CardActions>
              </FamilyCard>
            ))}
            <AddFamilyCard onClick={openAddFamilyModal}>
              <AddIcon style={{ fontSize: '3rem', marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add Family</div>
            </AddFamilyCard>
          </FamiliesGrid>
        )}

        {/* Enhanced Add Family Modal */}
        <StyledDialog
            open={showAddModal}
            onClose={handleCloseModal}
            fullScreen={fullScreen}
            maxWidth="sm"
            slotProps={{
                backdrop: {
                    sx: {
                        position: 'fixed',
                        zIndex: 1300
                    }
                }
            }}
            PaperProps={{
                sx: {
                    maxHeight: {
                        xs: 'calc(100% - 96px)',
                        sm: 'calc(100% - 100px)'
                    }
                }
            }}
        >
            <DialogHeader>
                <DialogTitle>Add New Family</DialogTitle>
                <MuiIconButton onClick={handleCloseModal} size="small">
                    <CloseIcon fontSize="small" />
                </MuiIconButton>
            </DialogHeader>

            <StyledDialogContent>
              <form onSubmit={handleAddFamily}>
                    <AvatarUploadBox component="label">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            style={{ display: 'none' }}
                        />
                      {avatarPreview ? (
                            <Box sx={{ position: 'relative' }}>
                                <Avatar src={avatarPreview} sx={{ width: 80, height: 80, fontSize: '2.5rem' }}>
                                    {!avatarPreview && getInitials(form.name)}
                                </Avatar>
                                <MuiIconButton 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        removeAvatar();
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
                                </MuiIconButton>
                            </Box>
                        ) : (
                            <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                        )}
                        <Typography variant="body2" color="text.secondary">
                            {avatarPreview ? 'Click to change avatar' : 'Click to upload avatar'}
                        </Typography>
                    </AvatarUploadBox>

                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                label="Family Name"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                                fullWidth
                                size="small"
                  />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Address"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                                fullWidth
                                size="small"
                                multiline
                                rows={2}
                  />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Contact Number"
                    value={form.contact_number}
                    onChange={e => setForm({ ...form, contact_number: e.target.value })}
                                fullWidth
                                size="small"
                                type="tel"
                            />
                        </Grid>
                    </Grid>
              </form>
            </StyledDialogContent>

            <FormActions>
                <MuiButton 
                    onClick={handleCloseModal}
                    variant="outlined"
                    size="small"
                    sx={{ 
                        borderRadius: '6px',
                        textTransform: 'none',
                        px: 2
                    }}
                >
                    Cancel
                </MuiButton>
                <MuiButton 
                    onClick={handleAddFamily}
                    variant="contained"
                    size="small"
                    disabled={loading}
                    sx={{ 
                        borderRadius: '6px',
                        textTransform: 'none',
                        px: 2
                    }}
                >
                    {loading ? 'Saving...' : 'Add Family'}
                </MuiButton>
            </FormActions>
        </StyledDialog>

        {/* Enhanced Edit Family Modal */}
        <StyledDialog
            open={showEditModal}
            onClose={() => setShowEditModal(false)}
            fullScreen={fullScreen}
            maxWidth="sm"
            slotProps={{
                backdrop: {
                    sx: {
                        position: 'fixed',
                        zIndex: 1300
                    }
                }
            }}
            PaperProps={{
                sx: {
                    maxHeight: {
                        xs: 'calc(100% - 96px)',
                        sm: 'calc(100% - 100px)'
                    }
                }
            }}
        >
            <DialogHeader>
                <DialogTitle>Edit Family</DialogTitle>
                <MuiIconButton onClick={() => setShowEditModal(false)} size="small">
                    <CloseIcon fontSize="small" />
                </MuiIconButton>
            </DialogHeader>

            <StyledDialogContent>
              <form onSubmit={handleEditFamily}>
                    <AvatarUploadBox component="label">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            style={{ display: 'none' }}
                        />
                      {avatarPreview ? (
                            <Box sx={{ position: 'relative' }}>
                                <Avatar src={avatarPreview} sx={{ width: 80, height: 80, fontSize: '2.5rem' }}>
                                    {!avatarPreview && getInitials(form.name)}
                                </Avatar>
                                <MuiIconButton 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        removeAvatar();
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
                                </MuiIconButton>
                            </Box>
                        ) : (
                            <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                        )}
                        <Typography variant="body2" color="text.secondary">
                            {avatarPreview ? 'Click to change avatar' : 'Click to upload avatar'}
                        </Typography>
                    </AvatarUploadBox>

                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                label="Family Name"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                                fullWidth
                                size="small"
                  />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Address"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                                fullWidth
                                size="small"
                                multiline
                                rows={2}
                  />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Contact Number"
                    value={form.contact_number}
                    onChange={e => setForm({ ...form, contact_number: e.target.value })}
                                fullWidth
                                size="small"
                                type="tel"
                            />
                        </Grid>
                    </Grid>
              </form>
            </StyledDialogContent>

            <FormActions>
                <MuiButton 
                    onClick={() => setShowEditModal(false)}
                    variant="outlined"
                    size="small"
                    sx={{ 
                        borderRadius: '6px',
                        textTransform: 'none',
                        px: 2
                    }}
                >
                    Cancel
                </MuiButton>
                <MuiButton 
                    onClick={handleEditFamily}
                    variant="contained"
                    size="small"
                    disabled={loading}
                    sx={{ 
                        borderRadius: '6px',
                        textTransform: 'none',
                        px: 2
                    }}
                >
                    {loading ? 'Saving...' : 'Update Family'}
                </MuiButton>
            </FormActions>
        </StyledDialog>

        {/* Link Student Modal */}
        {showLinkModal && (
          <Modal onClick={() => setShowLinkModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <CloseButton onClick={() => setShowLinkModal(false)}>
                <CloseIcon />
              </CloseButton>
              <ModalTitle>Link Student to {selectedFamily?.name}</ModalTitle>
              <form onSubmit={handleLinkStudent}>
                <FormGroup>
                  <Label>Class</Label>
                  <select
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 8, fontSize: '1rem', background: themeObj.FIELD_BG, color: themeObj.TEXT_PRIMARY, border: `1px solid ${themeObj.FIELD_BORDER}` }}
                    value={linkClassId}
                    onChange={e => { setLinkClassId(e.target.value); setLinkSectionId(''); setLinkStudentId(''); }}
                  >
                    <option value="">All Classes</option>
                    {classes.map((cls: any) => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </FormGroup>
                {(() => {
                  const selectedClass = classes.find(c => String(c.id) === String(linkClassId));
                  const hasSections = selectedClass?.has_sections ?? true;
                  return hasSections ? (
                    <FormGroup>
                      <Label>Section</Label>
                      <select
                        style={{ width: '100%', padding: '0.75rem', borderRadius: 8, fontSize: '1rem', background: themeObj.FIELD_BG, color: themeObj.TEXT_PRIMARY, border: `1px solid ${themeObj.FIELD_BORDER}` }}
                        value={linkSectionId}
                        onChange={e => { setLinkSectionId(e.target.value); setLinkStudentId(''); }}
                        disabled={!linkClassId}
                      >
                        <option value="">All Sections</option>
                        {filteredSections.map((section: any) => (
                          <option key={section.id} value={section.id}>{section.name}</option>
                        ))}
                      </select>
                    </FormGroup>
                  ) : null;
                })()}
                <FormGroup>
                  <Label>Student</Label>
                  <select
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 8, fontSize: '1rem', background: themeObj.FIELD_BG, color: themeObj.TEXT_PRIMARY, border: `1px solid ${themeObj.FIELD_BORDER}` }}
                    value={linkStudentId}
                    onChange={e => setLinkStudentId(e.target.value)}
                    required
                  >
                    <option value="">Select a student</option>
                    {filteredStudents.map((student: any) => {
                      const isLinked = linkedStudentIds.has(student.id);
                      return (
                        <option key={student.id} value={student.id} disabled={isLinked}>
                          {student.name}{isLinked ? ' (Linked)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </FormGroup>
                <CardActions>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Linking...' : 'Link Student'}
                  </Button>
                </CardActions>
              </form>
            </ModalContent>
          </Modal>
        )}

        {studentAvatarPreview && (
          <StudentAvatarPreview $top={studentAvatarPreview.top} $left={studentAvatarPreview.left} $themeObj={themeObj}>
            {studentAvatarPreview.src ? (
              <img src={studentAvatarPreview.src} alt="Preview" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
            ) : (
              <span style={{ fontSize: '2.2rem', fontWeight: 800 }}>{studentAvatarPreview.initials}</span>
            )}
          </StudentAvatarPreview>
        )}
      </PageContainer>
    </ThemeProvider>
  );
};

export default FamilyManagement; 