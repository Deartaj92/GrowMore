import React, { useState, useEffect } from 'react';
import styled, { useTheme } from 'styled-components';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import { School as SchoolIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import { darkTheme, lightTheme, useProgress } from '../components/Layout';
import NoStudentsFound from '../components/NoStudentsFound';
import { sortClasses } from '../utils/classUtils';

import Loader from '../components/Loader';
// Reuse styled components from StudentStatusManager or redefine as needed
// ... (copy ModalContent, Column, StudentList, StudentItem, Checkbox, StudentListItemName, SelectAllContainer, etc.)

const Container = styled.div`
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 1rem 2rem;
  @media (max-width: 1200px) {
    padding: 1rem 1.5rem;
  }
  @media (max-width: 768px) {
    padding: 0.5rem 0.75rem;
  }
`;

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  @media (max-width: 768px) {
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
  }
`;

const Heading = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  @media (max-width: 768px) {
    font-size: 1.25rem;
    gap: 0.5rem;
  }
`;

const HeaderIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, ${({ theme }) => theme.ACCENT}22, ${({ theme }) => theme.ACCENT}44);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.ACCENT};
  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
    border-radius: 8px;
  }
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  @media (max-width: 768px) {
    gap: 1rem;
  }
`;

const ControlPanel = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  @media (max-width: 768px) {
    padding: 1rem;
    border-radius: 8px;
  }
`;

const ControlGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  margin-bottom: 1.5rem;
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

const ControlField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  @media (max-width: 768px) {
    gap: 0.25rem;
  }
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  @media (max-width: 768px) {
    font-size: 0.75rem;
    letter-spacing: 0.25px;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  font-weight: 500;
  outline: none;
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.ACCENT}22;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f5f5f5'};
  }
  
  @media (max-width: 768px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    border-radius: 6px;
  }
`;

const ActionSelector = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  @media (max-width: 768px) {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    gap: 0.25rem;
  }
`;

const ActionToggle = styled.div`
  display: flex;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 8px;
  padding: 2px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
`;

const ToggleButton = styled.button<{ active?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: none;
  background: ${({ active }) => active ? '#3b82f6' : 'transparent'};
  color: ${({ active }) => active ? '#fff' : '#666'};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ active }) => active ? '#2563eb' : '#f3f4f6'};
  }
  
  @media (max-width: 768px) {
    padding: 0.375rem 0.75rem;
    font-size: 0.8rem;
    border-radius: 4px;
  }
`;

const StudentsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
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
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-height: 400px;
  display: flex;
  flex-direction: column;
  @media (max-width: 768px) {
    border-radius: 8px;
    min-height: 300px;
  }
`;

const CardHeader = styled.div`
  padding: 1rem 1.5rem;
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f8fafc'};
  border-bottom: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  display: flex;
  align-items: center;
  justify-content: space-between;
  @media (max-width: 768px) {
    padding: 0.75rem 1rem;
  }
`;

const CardTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
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
  font-size: 0.875rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  background: ${({ theme }) => theme.ACCENT}22;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-weight: 500;
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
  font-size: 0.875rem;
  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const Th = styled.th`
  text-align: left;
  padding: 0.75rem 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f8fafc'};
  border-bottom: 1px solid ${({ theme }) => theme.FIELD_BORDER};
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
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  vertical-align: middle;
  @media (max-width: 768px) {
    padding: 0.5rem 0.75rem;
  }
`;

const SerialCheckbox = styled.div`
  position: relative;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  border: 2px solid ${({ theme }) => theme.ACCENT};
  background: ${({ theme }) => theme.FIELD_BG};
  transition: all 0.2s ease;
  font-size: 0.7rem;
  font-weight: 600;
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
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, ${({ theme }) => theme.ACCENT}22, ${({ theme }) => theme.ACCENT}44);
  color: ${({ theme }) => theme.ACCENT};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  margin-right: 0.75rem;
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
  gap: 0.75rem;
  @media (max-width: 768px) {
    gap: 0.5rem;
  }
`;

const StudentName = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const StudentId = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-family: 'Monaco', 'Menlo', monospace;
  @media (max-width: 768px) {
    font-size: 0.7rem;
  }
`;

const ActionsPanel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  margin-top: 1.5rem;
  padding: 1.5rem 2rem;
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
  gap: 0.75rem;
  align-items: center;
  @media (max-width: 768px) {
    gap: 0.5rem;
    width: 100%;
    justify-content: center;
  }
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: 1px solid;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 120px;
  justify-content: center;
  
  ${({ variant }) => {
    switch (variant) {
      case 'primary':
        return `
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
  &:hover {
            background: #2563eb;
            border-color: #2563eb;
          }
        `;
      case 'danger':
        return `
          background: #ef4444;
          color: white;
          border-color: #ef4444;
          &:hover {
            background: #dc2626;
            border-color: #dc2626;
          }
        `;
      default:
        return `
          background: transparent;
          color: #6b7280;
          border-color: #d1d5db;
          &:hover {
            background: #f9fafb;
            border-color: #9ca3af;
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
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  
  ${({ type }) => {
    switch (type) {
      case 'success':
        return `
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        `;
      case 'warning':
        return `
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        `;
      default:
        return `
          background: #dbeafe;
          color: #1e40af;
          border: 1px solid #bfdbfe;
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
  gap: 0.5rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  background: ${({ theme }) => theme.BACKGROUND_SECONDARY};
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  
  @media (max-width: 768px) {
    font-size: 0.75rem;
    padding: 0.375rem 0.75rem;
  }
`;

// Modal components
const ModalOverlay = styled.div`
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

const ModalBox = styled.div`
  background: ${({ theme }) => theme.CARD};
  width: 90vw;
  max-width: 600px;
  max-height: 90vh;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: ${({ theme }) => theme.BG === '#252525'
    ? '0 0 40px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.4)'
    : '0 0 40px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.1)'};
  border: ${({ theme }) => theme.BG === '#252525'
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
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
  border-bottom: 1px solid ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'};
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)'};
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 10;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
`;

const ModalTitle = styled.div`
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

const ModalContent = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
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

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'};
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
    : 'linear-gradient(0deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)'};
`;

const ModalButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: ${({ theme, variant }) => 
    variant === 'primary'
      ? 'linear-gradient(45deg, #6366f1, #8b5cf6)'
      : variant === 'danger'
        ? 'linear-gradient(45deg, #ef4444, #dc2626)'
        : theme.BG === '#252525' 
          ? 'rgba(255, 255, 255, 0.1)' 
          : 'rgba(0, 0, 0, 0.05)'};
  color: ${({ theme, variant }) => 
    variant === 'primary' || variant === 'danger'
      ? '#fff'
      : theme.BG === '#252525'
        ? '#fff'
        : '#1e293b'};
  border: none;
  box-shadow: ${({ variant }) => 
    variant === 'primary'
      ? '0 2px 8px rgba(99, 102, 241, 0.25)'
      : variant === 'danger'
        ? '0 2px 8px rgba(239, 68, 68, 0.25)'
        : 'none'};
  
  &:hover {
    transform: translateY(-1px);
    background: ${({ theme, variant }) => 
      variant === 'primary'
        ? 'linear-gradient(45deg, #4f46e5, #7c3aed)'
        : variant === 'danger'
          ? 'linear-gradient(45deg, #dc2626, #b91c1c)'
          : theme.BG === '#252525'
            ? 'rgba(255, 255, 255, 0.15)'
            : 'rgba(0, 0, 0, 0.1)'};
    box-shadow: ${({ variant }) => 
      variant === 'primary'
        ? '0 4px 12px rgba(99, 102, 241, 0.35)'
        : variant === 'danger'
          ? '0 4px 12px rgba(239, 68, 68, 0.35)'
          : 'none'};
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
  color: ${({theme}) => theme.TEXT_PRIMARY};
  font-size: 1.1rem;
  margin-bottom: 1.5rem;
  font-weight: 500;
  line-height: 1.5;

  strong {
    color: ${({theme}) => theme.ACCENT};
    font-weight: 600;
  }
`;

const InfoBox = styled.div<{ type?: 'success' | 'warning' | 'error' }>`
  background: ${({theme, type}) => {
    if (type === 'success') return theme.BG === '#252525' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)';
    if (type === 'warning') return theme.BG === '#252525' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)';
    if (type === 'error') return theme.BG === '#252525' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)';
    return theme.BG === '#252525' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)';
  }};
  border: 1px solid ${({theme, type}) => {
    if (type === 'success') return 'rgba(34, 197, 94, 0.2)';
    if (type === 'warning') return 'rgba(245, 158, 11, 0.2)';
    if (type === 'error') return 'rgba(239, 68, 68, 0.2)';
    return 'rgba(99, 102, 241, 0.2)';
  }};
  color: ${({theme, type}) => {
    if (type === 'success') return theme.BG === '#252525' ? '#22c55e' : '#16a34a';
    if (type === 'warning') return theme.BG === '#252525' ? '#f59e0b' : '#d97706';
    if (type === 'error') return theme.BG === '#252525' ? '#ef4444' : '#dc2626';
    return theme.BG === '#252525' ? '#6366f1' : '#4f46e5';
  }};
  border-radius: 8px;
  padding: 12px 16px;
  margin-top: 1rem;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  padding: 0.5rem;
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : theme.CARD};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
`;

const StudentListItemName = styled.span`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
`;

// Skeleton loading components
const SkeletonHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.FIELD_BORDER};
`;

const SkeletonIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
`;

const SkeletonTitle = styled.div`
  width: 300px;
  height: 28px;
  border-radius: 8px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
`;

const SkeletonControlPanel = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const SkeletonControlGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const SkeletonField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SkeletonLabel = styled.div`
  width: 80px;
  height: 14px;
  border-radius: 4px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
`;

const SkeletonSelect = styled.div`
  width: 100%;
  height: 44px;
  border-radius: 8px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
`;

const SkeletonStudentsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  margin-bottom: 1.5rem;
`;

const SkeletonStudentsCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  overflow: hidden;
`;

const SkeletonCardHeader = styled.div`
  padding: 1rem 1.5rem;
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f8fafc'};
  border-bottom: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SkeletonCardTitle = styled.div`
  width: 120px;
  height: 16px;
  border-radius: 4px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
`;

const SkeletonCount = styled.div`
  width: 40px;
  height: 20px;
  border-radius: 10px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
`;

const SkeletonTable = styled.div`
  padding: 1rem;
`;

const SkeletonTableRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.FIELD_BORDER};
`;

const SkeletonCheckbox = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 3px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
`;

const SkeletonAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${({ theme }) => theme.ACCENT + '22'};
`;

const SkeletonText = styled.div<{ width?: string }>`
  width: ${({ width }) => width || '100px'};
  height: 14px;
  border-radius: 4px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
`;

const SkeletonActionsPanel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem;
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
`;

const SkeletonButton = styled.div`
  width: 120px;
  height: 40px;
  border-radius: 8px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
`;

const PageSkeleton: React.FC = () => {
  return (
    <Container>
      <SkeletonHeader>
        <SkeletonIcon />
        <SkeletonTitle />
      </SkeletonHeader>
      
      <SkeletonControlPanel>
        <SkeletonControlGrid>
          {[1,2,3,4].map(i => (
            <SkeletonField key={i}>
              <SkeletonLabel />
              <SkeletonSelect />
            </SkeletonField>
          ))}
        </SkeletonControlGrid>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <SkeletonSelect style={{ width: '100px', height: '36px' }} />
        </div>
      </SkeletonControlPanel>
      
      <SkeletonStudentsGrid>
        {[1,2].map(i => (
          <SkeletonStudentsCard key={i}>
            <SkeletonCardHeader>
              <SkeletonCardTitle />
              <SkeletonCount />
            </SkeletonCardHeader>
            <SkeletonTable>
            {[1,2,3,4,5].map(j => (
                <SkeletonTableRow key={j}>
                  <SkeletonCheckbox />
                  <SkeletonText width="20px" />
                  <SkeletonText width="40px" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                <SkeletonAvatar />
                    <SkeletonText width="80px" />
                  </div>
                  <SkeletonText width="60px" />
                </SkeletonTableRow>
              ))}
            </SkeletonTable>
          </SkeletonStudentsCard>
        ))}
      </SkeletonStudentsGrid>
      
      <SkeletonActionsPanel>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <SkeletonButton />
          <SkeletonButton />
        </div>
        <SkeletonButton />
      </SkeletonActionsPanel>
    </Container>
  );
};

const BulkPromoteDemote: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const { setLoading, loading } = useLoading();
  const { startProgress, setProgress, completeProgress } = useProgress();
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [sourceClass, setSourceClass] = useState('');
  const [sourceSection, setSourceSection] = useState('');
  const [sourceSections, setSourceSections] = useState<any[]>([]);
  const [sourceStudents, setSourceStudents] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<'promote' | 'demote'>('promote');
  const [targetClass, setTargetClass] = useState('');
  const [targetSection, setTargetSection] = useState('');
  const [targetSections, setTargetSections] = useState<any[]>([]);
  const [targetStudents, setTargetStudents] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [hasAnyStudents, setHasAnyStudents] = useState<boolean | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [targetClassStudentsCount, setTargetClassStudentsCount] = useState(0);
  const [activeSession, setActiveSession] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      if (!user?.school_id) return;
      const minDuration = 2000;
      const start = Date.now();
      setLoading(true);
      startProgress(false);
      setProgress(10);
      await fetchActiveSession();
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
        console.error('Error checking for students:', error);
        setHasAnyStudents(false);
        return;
      }
      
      setHasAnyStudents(data && data.length > 0);
    } catch (err: any) {
      console.error('Error checking for students:', err);
      setHasAnyStudents(false);
    }
  };

  // Check if there are any students in the system for the active session
  useEffect(() => {
    checkForAnyStudents();
  }, [user?.school_id]);

  const fetchActiveSession = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name')
        .eq('school_id', user?.school_id)
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      setActiveSession(data);
    } catch (err: any) {
      console.error('Error fetching active session:', err);
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
    if (!sourceClass) {
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
        
        // Fetch students from student_class_history for the active session and selected class/section
        let schQuery = supabase
          .from('student_class_history')
          .select('student_id')
          .eq('session_id', activeSession?.id)
          .eq('class_id', sourceClass)
          .eq('school_id', user?.school_id);
        
        // Only filter by section if the class has sections
        if (hasSections) {
          schQuery = schQuery.eq('section_id', sourceSection);
            } else {
          schQuery = schQuery.is('section_id', null);
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
        console.error('Error fetching students:', err);
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
  }, [sourceClass, sourceSection, user?.school_id, classes, activeSession]);

  // Auto-select target class based on action
  useEffect(() => {
    if (!sourceClass) {
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
          .eq('class_id', targetClass)
          .eq('school_id', user?.school_id);
        
        // Only filter by section if the class has sections
        if (hasSections) {
          schQuery = schQuery.eq('section_id', targetSection);
            } else {
          schQuery = schQuery.is('section_id', null);
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
        console.error('Error fetching target students:', err);
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
    console.log('Updating student_class_history for student:', studentId, 'session:', sessionId);
    // First, check if an entry exists for this student in this session
    const { data: existingEntry, error: checkError } = await supabase
      .from('student_class_history')
        .select('id')
      .eq('student_id', studentId)
      .eq('session_id', sessionId)
        .eq('school_id', user?.school_id)
        .single();

    console.log('Existing entry check:', existingEntry, 'Error:', checkError);
    
    if (existingEntry) {
      console.log('Updating existing student_class_history entry:', existingEntry.id);
      // Update existing entry
      const { error: schError } = await supabase
        .from('student_class_history')
        .update({
          class_id: newClassId,
          section_id: newSectionId
        })
        .eq('id', existingEntry.id);
      
      if (schError) {
        console.warn('Failed to update student_class_history:', schError);
      } else {
        console.log('Successfully updated student_class_history');
      }
    } else {
      console.log('Creating new student_class_history entry');
      // Create new entry
      const { error: schError } = await supabase
        .from('student_class_history')
        .insert({
          student_id: studentId,
          session_id: sessionId,
          class_id: newClassId,
          section_id: newSectionId,
          school_id: user?.school_id
        });
      
      if (schError) {
        console.warn('Failed to create student_class_history entry:', schError);
      } else {
        console.log('Successfully created student_class_history entry');
      }
    }
  };

  // Check if target class has existing students
  const checkTargetClassStudents = async () => {
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
        .eq('class_id', parseInt(targetClass))
        .eq('school_id', user?.school_id);
      
      // Only filter by section if the class has sections
      if (hasSections) {
        schQuery = schQuery.eq('section_id', parseInt(targetSection));
      } else {
        schQuery = schQuery.is('section_id', null);
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
      console.error('Error checking target class students:', error);
      return 0;
    }
  };

  const handleConfirm = async () => {
    // Check if source class has sections
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
          
          // 1. Update class, section, and status_updated_at in students
      const { error } = await supabase
        .from('students')
            .update({
              class_id: parseInt(targetClass),
              section_id: finalSectionId,
              status_updated_at: new Date().toISOString()
            })
            .eq('id', studentId)
        .eq('school_id', user?.school_id);
      if (error) throw error;

          // 2. Update or create student_class_history for the active session
          if (activeSession) {
            console.log('Updating student_class_history for active session:', activeSession.id);
            await updateStudentClassHistory(studentId, activeSession.id, parseInt(targetClass), finalSectionId);
          } else {
            console.log('No active session found - skipping student_class_history update');
          }
          
          // 3. Record in student_status_history
          await supabase.from('student_status_history').insert({
            student_id: studentId,
            school_id: user?.school_id,
            action: action,
            old_status: oldStatus,
            new_status: oldStatus, // status doesn't change on promote/demote
            old_class_id: oldClassId,
            new_class_id: parseInt(targetClass),
        reason: null,
            performed_by: user?.id || null,
            new_section_id: finalSectionId
          });

          processedCount++;
        } catch (error) {
          console.error(`Error processing student ${studentId}:`, error);
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

  const handleCancel = () => {
    setSourceClass('');
    setSourceSection('');
    setTargetClass('');
    setTargetSection('');
    setSourceStudents([]);
    setTargetStudents([]);
    setSelectedStudents(new Set());
  };

  const handleConfirmClick = async () => {
    // Check if source class has sections
    const sourceClassObj = classes.find(c => String(c.id) === String(sourceClass));
    const sourceHasSections = sourceClassObj?.has_sections ?? true;
    
    // Check if target class has sections
    const targetClassObj = classes.find(c => String(c.id) === String(targetClass));
    const targetHasSections = targetClassObj?.has_sections ?? true;
    
    // Validate required fields
    if (!sourceClass || !targetClass || selectedStudents.size === 0) {
      toast.showToast('Please select all required fields and students', 'error');
      return;
    }
    if (sourceHasSections && !sourceSection) {
      toast.showToast('Please select a source section', 'error');
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
  };

  const handleConfirmModalConfirm = async () => {
    setShowConfirmModal(false);
    await handleConfirm();
  };

  if (loading) {
    return (
      <Container style={{ paddingTop: '80px' }}>
        <PageSkeleton />
      </Container>
    );
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
            <SchoolIcon style={{ fontSize: 20 }} />
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
                                {(student.name?.split(' ').map((n: string) => n[0]).join('').slice(0,2) || '?')}
                              </span>
                      )}
                    </Avatar>
                          <div>
                            <StudentName>{student.id} - {student.name}</StudentName>
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
                                {(student.name?.split(' ').map((n: string) => n[0]).join('').slice(0,2) || '?')}
                              </span>
                      )}
                    </Avatar>
                          <div>
                            <StudentName>{student.id} - {student.name}</StudentName>
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

        <ActionsPanel>
          <ActionButtons>
            <ActionButton onClick={(e) => {
              e.preventDefault();
              handleCancel();
            }} disabled={processing}>
              Cancel
        </ActionButton>
            <ActionButton 
              variant="primary" 
              onClick={(e) => {
                e.preventDefault();
                handleConfirmClick();
              }} 
              disabled={processing || !sourceClass || !targetClass || selectedStudents.size === 0 || 
                (classes.find(c => String(c.id) === String(sourceClass))?.has_sections !== false && !sourceSection) ||
                (classes.find(c => String(c.id) === String(targetClass))?.has_sections !== false && !targetSection)}
            >
              {processing ? 'Processing...' : `${action === 'promote' ? 'Promote' : 'Demote'} ${selectedStudents.size} Students`}
            </ActionButton>
          </ActionButtons>
          
          {selectedStudents.size > 0 && (
            <StatusIndicator type="success">
              {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''} selected for {action}
            </StatusIndicator>
          )}
        </ActionsPanel>
      </MainContent>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <ModalOverlay>
          <ModalBox>
            <ModalHeader>
              <ModalTitle>
                <SchoolIcon style={{ fontSize: '1.4rem' }} />
                Confirm {action === 'promote' ? 'Promotion' : 'Demotion'}
              </ModalTitle>
            </ModalHeader>
            
            <ModalContent>
              <ModalText>
                Are you sure you want to {action} <strong>{selectedStudents.size} students</strong> from{' '}
                <strong>{classes.find(c => c.id === parseInt(sourceClass))?.name}</strong> to{' '}
                <strong>{classes.find(c => c.id === parseInt(targetClass))?.name}</strong>?
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
                          {student.id} - {student.name}
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
                {processing ? 'Processing...' : `Confirm ${action === 'promote' ? 'Promotion' : 'Demotion'}`}
              </ModalButton>
            </ModalFooter>
          </ModalBox>
        </ModalOverlay>
      )}
    </Container>
  );
};

export default BulkPromoteDemote; 