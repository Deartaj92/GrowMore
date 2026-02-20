import React, { useState, useEffect, useContext, useRef } from 'react';
import styled, { ThemeProvider, keyframes } from 'styled-components';
import { supabase } from '../supabaseClient';
import { ThemeContext, darkTheme, lightTheme, useProgress } from './Layout';
import { FamilyRestroom, PersonAdd, Person, Add as AddIcon, Close as CloseIcon, Edit as EditIcon, Delete as DeleteIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { sortClasses } from '../utils/classUtils';
import { getStudentDisplayId } from '../utils/studentUtils';
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
  height: 100%;
  margin: 0;
  padding: 0 12px 6px 12px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow: hidden; /* Prevent container scroll - let MainContent handle it */
  min-height: 0; /* Critical for flex children */
  display: flex;
  flex-direction: column;
  
  @media (max-width: 700px) {
    padding: 0 10px 6px 10px;
  }
`;

const PageHeader = styled.div`
  flex-shrink: 0; /* Don't shrink */
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 6px 0 4px 0;
  padding: 0.5rem 0;
  
  @media (max-width: 700px) {
    margin: 4px 0 4px 0;
  }
`;

const MainContent = styled.div`
  flex: 1; /* Fill remaining space */
  min-height: 0; /* Critical - allows flex child to shrink below content size */
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem 0 8px 0;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  
  @media (max-width: 700px) {
    scroll-behavior: auto;
    -webkit-overflow-scrolling: touch;
    padding: 0.75rem 0 8px 0;
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

const PageTitle = styled.h1`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FamiliesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-top: 0;
  
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
`;

const FamilyCard = styled.div<{ $accent: string }>`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  border: 1px solid ${({ theme }) => theme.BORDER};
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-top: 3px solid ${({ $accent }) => $accent};
  
  &:hover {
    border-color: #6366f1;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
    transform: translateY(-2px);
  }
  
  @media (max-width: 700px) {
    padding: 0.85rem;
    border-radius: 10px;
  }
`;

const AddFamilyCard = styled(FamilyCard)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 1.5px dashed #6366f1;
  color: #6366f1;
  background: ${({ theme }) => theme.BG};
  transition: all 0.2s ease;
  min-height: 180px;
  
  &:hover {
    border-color: #4f46e5;
    background: ${({ theme }) => theme.FIELD_BG};
    color: #4f46e5;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
  }
`;

const FamilyHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 700px) {
    gap: 0.6rem;
    margin-bottom: 0.7rem;
    padding-bottom: 0.7rem;
  }
`;

const ContactBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 10px;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 6px;
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
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${({ $bg }: { $bg: string }) => $bg};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  color: #fff;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
  
  @media (max-width: 700px) {
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
  }
`;

const FamilyInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const FamilyName = styled.h3`
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @media (max-width: 700px) {
    font-size: 1rem;
  }
`;

const FamilyDetails = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.85rem;
  line-height: 1.4;
  
  @media (max-width: 700px) {
    font-size: 0.8rem;
  }
`;

const MemberList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0.75rem 0 0 0;
`;

const MemberItem = styled.li`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 0.4rem;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'};
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  position: relative;
  border: 1px solid transparent;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'};
  }

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
    border: 1px solid #22c55e;
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)'};
  }
  
  @media (max-width: 700px) {
    font-size: 0.8rem;
    padding: 0.45rem 0.5rem;
    gap: 0.5rem;
    .member-actions {
      position: static;
      transform: none;
      opacity: 1 !important;
      margin-left: 0.25rem;
      gap: 0.25rem;
    }
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
  gap: 0.4rem;
  margin-top: auto;
  padding-top: 0.85rem;
  justify-content: flex-end;
  align-items: center;
  
  @media (max-width: 700px) {
    padding-top: 0.7rem;
    gap: 0.3rem;
  }
`;

const StyledIconButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
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
  
  @media (max-width: 700px) {
    padding: 5px;
  }
`;

const DeleteButton = styled(StyledIconButton)`
  &:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.85rem;
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
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
  }
  
  @media (max-width: 700px) {
    padding: 0.4rem 0.7rem;
    font-size: 0.8rem;
    gap: 0.3rem;
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
  border-radius: 12px;
  padding: 1rem;
  width: 96%;
  max-width: 380px;
  position: relative;
  border: 1px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 700px) {
    padding: 0.9rem;
    max-width: 94%;
  }
`;

const ModalTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 1.2rem;
  
  @media (max-width: 700px) {
    font-size: 1.15rem;
    margin: 0 0 1rem;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.2rem;
  
  @media (max-width: 700px) {
    margin-bottom: 1rem;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.4rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  font-size: 0.9rem;
  
  @media (max-width: 700px) {
    font-size: 0.85rem;
    margin-bottom: 0.35rem;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.65rem;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}33;
  }
  
  @media (max-width: 700px) {
    padding: 0.6rem;
    font-size: 0.85rem;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1.3rem;
  cursor: pointer;
  z-index: 10;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  
  &:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }
  
  @media (max-width: 700px) {
    top: 10px;
    right: 10px;
    font-size: 1.2rem;
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
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: ${({ $bg }) => $bg};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  color: #fff;
  font-weight: 600;
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
  
  @media (max-width: 700px) {
    width: 28px;
    height: 28px;
    font-size: 0.85rem;
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

const ToastMsg = styled.div<{ type: 'error' | 'success', themeMode: 'dark' | 'light' }>`
  min-width: 220px;
  background: ${({ type, themeMode }) => type === 'error' ? (themeMode === 'dark' ? '#ff3b3b' : '#ff5252') : (themeMode === 'dark' ? '#4caf50' : '#43a047')};
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
  z-index: 14000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: modal-fade-in 0.25s;
  @media (max-width: 700px) {
    align-items: center;
    padding: 0;
  }
  @keyframes modal-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;
const DeleteModalBox = styled.div`
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-radius: 16px;
  box-shadow: 0 8px 32px #0007;
  padding: 24px 28px 20px 28px;
  min-width: 320px;
  max-width: 520px;
  width: 92vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  @media (max-width: 700px) {
    min-width: 0;
    width: calc(100vw - 32px);
    padding: 16px 16px 14px 16px;
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
const successSoundUrl = `${process.env.PUBLIC_URL || '.'}/success.mp3`;
const errorSoundUrl = `${process.env.PUBLIC_URL || '.'}/error.mp3`;

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
  font-size: 0.88em;
  margin-left: 0.3em;
  font-weight: 400;
  opacity: 0.8;
`;

const MemberGrid = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  list-style: none;
  padding: 0;
  margin: 0;
`;

const ScrollableMemberContainer = styled.div`
  max-height: 140px;
  overflow-y: auto;
  margin: 1rem 0 0 0;
  padding-right: 0.5rem;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 4px;
    transition: background 0.2s;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
  }
  
  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'} ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
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
  
  @media (max-width: 700px) {
    .member-actions {
      position: static;
      transform: none;
      opacity: 1 !important;
      margin-left: 0.2rem;
      gap: 0.25rem;
    }
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
    margin: 0,
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
      height: 'auto',
      margin: 0,
      borderRadius: '16px',
      maxHeight: 'calc(100% - 48px)'
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
  fontSize: '1.1rem',
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
  const [toasts, setToasts] = useState<Array<{ msg: string, type: 'error' | 'success', id: number }>>([]);
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
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const { startProgress, setProgress, completeProgress } = useProgress();
  const [loadingFamilies, setLoadingFamilies] = useState(true);

  // Helper function to get default password
  const generateRandomPassword = (): string => {
    // Generate a random 5-digit number (10000 to 99999)
    const min = 10000;
    const max = 99999;
    const randomPassword = Math.floor(Math.random() * (max - min + 1)) + min;
    return String(randomPassword);
  };

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
          new_class_id,
          new_section_id,
          adm_class_id,
          adm_section_id,
          new_classes:new_class_id(id, name),
          new_sections:new_section_id(id, name),
          adm_classes:adm_class_id(id, name),
          adm_sections:adm_section_id(id, name),
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
              class_id: sch.new_class_id || sch.adm_class_id, // Current class (fallback to admission)
              section_id: sch.new_section_id !== null ? sch.new_section_id : (sch.adm_section_id !== null ? sch.adm_section_id : null), // Current section
              classes: sch.new_classes || sch.adm_classes, // Current class object
              sections: sch.new_sections || sch.adm_sections, // Current section object
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
    setToasts(prev => [...prev, { msg, type, id }]);
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
      // Generate random 5-digit password for families
      const defaultPassword = generateRandomPassword();
      const { error } = await supabase
        .from('families')
        .insert([{ ...form, avatar_url, password: defaultPassword, school_id: user?.school_id }]);
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
    const hasLinked = Array.isArray(family.family_members) && family.family_members.length > 0;
    if (hasLinked) {
      showToast('Unlink all students before deleting family', 'error');
      return;
    }
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
            <div style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: 10 }}>Delete Family</div>
            <div style={{ marginBottom: 10 }}>Are you sure you want to delete <b>{familyToDelete?.name}</b> and unlink all its students?</div>
            <DeleteModalActions>
              <DeleteModalCancel onClick={() => { setShowDeleteModal(false); setFamilyToDelete(null); }}>Cancel</DeleteModalCancel>
              <DeleteModalButton onClick={confirmDeleteFamily}>Delete</DeleteModalButton>
            </DeleteModalActions>
          </DeleteModalBox>
        </DeleteModalOverlay>
      )}
      {confirm && (
        <DeleteModalOverlay>
          <DeleteModalBox theme={themeObj}>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 10 }}>{confirm.title}</div>
            <div style={{ marginBottom: 10 }}>{confirm.message}</div>
            <DeleteModalActions>
              <DeleteModalCancel onClick={() => setConfirm(null)}>Cancel</DeleteModalCancel>
              <DeleteModalButton onClick={async () => { await confirm.onConfirm(); setConfirm(null); }}>Yes</DeleteModalButton>
            </DeleteModalActions>
          </DeleteModalBox>
        </DeleteModalOverlay>
      )}
      <PageContainer>
        {!loadingFamilies && (
          <>
            <PageHeader>
              <PageTitle>Families</PageTitle>
              <HeaderActions>
                <Button onClick={openAddFamilyModal}>
                  <AddIcon style={{ fontSize: 18 }} /> Add Family
                </Button>
              </HeaderActions>
            </PageHeader>
            <MainContent>
              <FamiliesGrid>
              {families.map(family => (
                <FamilyCard key={family.id} $accent={stringToColor(family.name)}>
                  {family.contact_number && (
                    <ContactBadge>
                      <span style={{ opacity: 0.8 }}>📞</span>
                      <span>{family.contact_number}</span>
                    </ContactBadge>
                  )}
                  <FamilyHeader>
                    <Avatar src={family.avatar_url || undefined} sx={{ width: 44, height: 44, fontSize: '1.3rem', fontWeight: 600, bgcolor: stringToColor(family.name) }}>
                      {!family.avatar_url && getInitials(family.name)}
                    </Avatar>
                    <FamilyInfo>
                      <FamilyName>{family.name}</FamilyName>
                      <FamilyDetails>
                        {family.address && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.3rem' }}>
                            <span style={{ opacity: 0.7 }}>📍</span>
                            <span style={{ flex: 1, lineHeight: 1.3 }}>{family.address}</span>
                          </div>
                        )}
                      </FamilyDetails>
                    </FamilyInfo>
                  </FamilyHeader>
                  <div style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: themeObj.TEXT_SECONDARY,
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Students ({family.family_members?.length || 0})
                  </div>
                  {family.family_members && family.family_members.length > 0 ? (
                    family.family_members.length >= 3 ? (
                      <ScrollableMemberContainer theme={themeObj}>
                        <MemberGrid>
                          {[...family.family_members]
                            .sort((a, b) => (b.is_primary_contact ? 1 : 0) - (a.is_primary_contact ? 1 : 0))
                            .map((member: any) => (
                              <MemberItemSmall key={member.id} className={member.is_primary_contact ? 'primary-contact' : ''}>
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
                                    sx={{
                                      minWidth: 0,
                                      px: 1,
                                      fontSize: '0.75rem',
                                      fontWeight: 500,
                                      textTransform: 'none',
                                      height: 22,
                                      borderRadius: '6px'
                                    }}
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
                                  {member.is_primary_contact && (
                                    <MuiIconButton
                                      title="Unset primary"
                                      size="small"
                                      sx={{
                                        width: 20, height: 20, ml: 0.3,
                                        '&:hover': { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }
                                      }}
                                      onClick={async () => {
                                        setLoading(true);
                                        try {
                                          await supabase
                                            .from('family_members')
                                            .update({ is_primary_contact: false })
                                            .eq('id', member.id);
                                          fetchFamilies();
                                          showToast('Primary contact removed', 'success');
                                        } catch (error) {
                                          showToast('Failed to remove primary', 'error');
                                        } finally {
                                          setLoading(false);
                                        }
                                      }}
                                    >
                                      <CloseIcon sx={{ fontSize: '0.9rem' }} />
                                    </MuiIconButton>
                                  )}
                                  <MuiIconButton
                                    className="unlink-btn"
                                    onClick={() => handleUnlinkStudent(member.id)}
                                    disabled={unlinkingId === member.id}
                                    title="Unlink student from family"
                                    size="small"
                                    sx={{
                                      width: 20,
                                      height: 20,
                                      ml: 0.2,
                                      '&:hover': {
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        color: '#ef4444'
                                      }
                                    }}
                                  >
                                    <CloseIcon sx={{ fontSize: '0.9rem' }} />
                                  </MuiIconButton>
                                </div>
                              </MemberItemSmall>
                            ))}
                        </MemberGrid>
                      </ScrollableMemberContainer>
                    ) : (
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
                                  sx={{
                                    minWidth: 0,
                                    px: 1,
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    textTransform: 'none',
                                    height: 22,
                                    borderRadius: '6px'
                                  }}
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
                                {member.is_primary_contact && (
                                  <MuiIconButton
                                    title="Unset primary"
                                    size="small"
                                    sx={{
                                      width: 20, height: 20, ml: 0.3,
                                      '&:hover': { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }
                                    }}
                                    onClick={() => setConfirm({
                                      title: 'Remove Primary Contact',
                                      message: `Unset ${member.student?.name || 'this student'} as the primary contact?`,
                                      onConfirm: async () => {
                                        setLoading(true);
                                        try {
                                          await supabase
                                            .from('family_members')
                                            .update({ is_primary_contact: false })
                                            .eq('id', member.id);
                                          fetchFamilies();
                                          showToast('Primary contact removed', 'success');
                                        } catch (error) {
                                          showToast('Failed to remove primary', 'error');
                                        } finally {
                                          setLoading(false);
                                        }
                                      }
                                    })}
                                  >
                                    <CloseIcon sx={{ fontSize: '0.9rem' }} />
                                  </MuiIconButton>
                                )}
                                <MuiIconButton
                                  className="unlink-btn"
                                  onClick={() => setConfirm({
                                    title: 'Unlink Student',
                                    message: `Are you sure you want to unlink ${member.student?.name || 'this student'} from ${family.name}?`,
                                    onConfirm: async () => handleUnlinkStudent(member.id)
                                  })}
                                  disabled={unlinkingId === member.id}
                                  title="Unlink student from family"
                                  size="small"
                                  sx={{
                                    width: 20,
                                    height: 20,
                                    ml: 0.2,
                                    '&:hover': {
                                      background: 'rgba(239, 68, 68, 0.1)',
                                      color: '#ef4444'
                                    }
                                  }}
                                >
                                  <CloseIcon sx={{ fontSize: '0.9rem' }} />
                                </MuiIconButton>
                              </div>
                            </MemberItem>
                          ))}
                      </MemberList>
                    )
                  ) : (
                    <div style={{
                      color: themeObj.TEXT_SECONDARY,
                      fontStyle: 'italic',
                      fontSize: '0.85rem',
                      padding: '0.75rem',
                      textAlign: 'center',
                      background: themeObj.BG === '#252525' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                      borderRadius: '8px'
                    }}>
                      No students linked
                    </div>
                  )}
                  <CardActions>
                    <StyledIconButton onClick={() => startEditFamily(family)} title="Edit Family">
                      <EditIcon fontSize="small" />
                    </StyledIconButton>
                    <DeleteButton onClick={() => handleDeleteFamily(family)} title={Array.isArray(family.family_members) && family.family_members.length > 0 ? 'Unlink all students first' : 'Delete Family'} disabled={Array.isArray(family.family_members) && family.family_members.length > 0}>
                      <DeleteIcon fontSize="small" />
                    </DeleteButton>
                    <Button onClick={() => { setSelectedFamily(family); setShowLinkModal(true); }}>
                      <PersonAdd style={{ fontSize: 18 }} /> Link Student
                    </Button>
                  </CardActions>
                </FamilyCard>
              ))}
              </FamiliesGrid>
            </MainContent>
          </>
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

        {/* Link Student Modal (centered to viewport via MUI Dialog) */}
        {showLinkModal && (
          <StyledDialog
            open={showLinkModal}
            onClose={() => setShowLinkModal(false)}
            fullScreen={fullScreen}
            maxWidth="sm"
            slotProps={{
              backdrop: { sx: { position: 'fixed', zIndex: 1300 } }
            }}
          >
            <DialogHeader>
              <DialogTitle>Link Student to {selectedFamily?.name}</DialogTitle>
              <MuiIconButton onClick={() => setShowLinkModal(false)} size="small">
                <CloseIcon fontSize="small" />
              </MuiIconButton>
            </DialogHeader>
            <StyledDialogContent>
              <form onSubmit={handleLinkStudent}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Label>Class</Label>
                    <select
                      style={{ width: '100%', padding: '0.65rem', borderRadius: 8, fontSize: '0.9rem', background: themeObj.FIELD_BG, color: themeObj.TEXT_PRIMARY, border: `1px solid ${themeObj.FIELD_BORDER}` }}
                      value={linkClassId}
                      onChange={e => { setLinkClassId(e.target.value); setLinkSectionId(''); setLinkStudentId(''); }}
                    >
                      <option value="">All Classes</option>
                      {classes.map((cls: any) => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Label>Section</Label>
                    <select
                      style={{ width: '100%', padding: '0.65rem', borderRadius: 8, fontSize: '0.9rem', background: themeObj.FIELD_BG, color: themeObj.TEXT_PRIMARY, border: `1px solid ${themeObj.FIELD_BORDER}` }}
                      value={linkSectionId}
                      onChange={e => { setLinkSectionId(e.target.value); setLinkStudentId(''); }}
                      disabled={!linkClassId}
                    >
                      <option value="">All Sections</option>
                      {filteredSections.map((section: any) => (
                        <option key={section.id} value={section.id}>{section.name}</option>
                      ))}
                    </select>
                  </Grid>
                  <Grid item xs={12}>
                    <Label>Student</Label>
                    <select
                      style={{ width: '100%', padding: '0.65rem', borderRadius: 8, fontSize: '0.85rem', background: themeObj.FIELD_BG, color: themeObj.TEXT_PRIMARY, border: `1px solid ${themeObj.FIELD_BORDER}`, lineHeight: '1.4' }}
                      value={linkStudentId}
                      onChange={e => setLinkStudentId(e.target.value)}
                      required
                    >
                      <option value="">Select a student</option>
                      {filteredStudents.map((student: any) => {
                        const isLinked = linkedStudentIds.has(student.id);
                        const displayText = `#${getStudentDisplayId(student)} - ${student.name}${student.father_name ? ` - ${student.father_name}` : ''}${isLinked ? ' (Linked)' : ''}`;
                        return (
                          <option key={student.id} value={student.id} disabled={isLinked}>
                            {displayText}
                          </option>
                        );
                      })}
                    </select>
                  </Grid>
                </Grid>
              </form>
            </StyledDialogContent>
            <FormActions>
              <MuiButton
                onClick={() => setShowLinkModal(false)}
                variant="outlined"
                size="small"
                sx={{ borderRadius: '6px', textTransform: 'none', px: 2 }}
              >
                Cancel
              </MuiButton>
              <MuiButton
                onClick={handleLinkStudent}
                variant="contained"
                size="small"
                disabled={loading}
                sx={{ borderRadius: '6px', textTransform: 'none', px: 2 }}
              >
                {loading ? 'Linking...' : 'Link Student'}
              </MuiButton>
            </FormActions>
          </StyledDialog>
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