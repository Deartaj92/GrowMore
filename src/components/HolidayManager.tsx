import React, { useState, useEffect } from 'react';
import styled, { useTheme } from 'styled-components';
import { sortClasses } from '../utils/classUtils';
import { supabase } from '../supabaseClient';
import { Save, Delete, Edit, Close, Search, CheckCircle, RadioButtonUnchecked, Add, CalendarMonth, People, School } from '@mui/icons-material';
import { useToast } from './useToast';
import { motion, AnimatePresence } from 'framer-motion';
import { formatAppDate } from '../utils/dateUtils';
import AppDateField from './shared/AppDateField';
import {
  Dialog as MuiDialog,
  DialogContent as MuiDialogContent,
  IconButton,
  Grid,
  FormControl,
  InputLabel,
  Select as MuiSelect,
  MenuItem,
  TextField,
  Button,
  Checkbox as MuiCheckbox,
  FormControlLabel,
  Typography,
  styled as muiStyled,
  SelectChangeEvent,
  Tabs,
  Tab,
  Box,
  Chip,
  Card,
  CardContent,
  CardActions,
  Divider
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import NoSessionsFound from './NoSessionsFound';
import NoClassesFound from './NoClassesFound';
import NoSectionsFound from './NoSectionsFound';
import Loader from './Loader';

const Container = styled.div`
  width: 100%;
  max-width: 1600px;
  margin: 0.5rem auto 0;
  padding: 1rem 0.5rem;
  @media (max-width: 768px) {
    padding: 0.5rem 0.25rem;
    margin-top: 0.25rem;
  }
`;

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

const CreateButton = styled.button`
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${({ theme }) => theme.ACCENT};
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px ${({ theme }) => theme.ACCENT}22;
  &:hover {
    background: ${({ theme }) => theme.ACCENT + 'cc'};
    transform: translateY(-1px);
  }
`;

const PageTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MainContent = styled.div`
  width: 100%;
`;

const HolidaysSection = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : theme.CARD};
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FormGrid = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FormLabel = styled.label`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 600;
`;

const FormInput = styled.input`
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
  }
`;

const FormTextArea = styled.textarea`
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  outline: none;
  min-height: 100px;
  resize: vertical;
  transition: border-color 0.2s;
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
  }
`;

const DateRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const Checkbox = styled.input`
  width: 1.2rem;
  height: 1.2rem;
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  cursor: pointer;
  font-weight: 500;
`;

const SubmitButton = styled.button`
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${({ theme }) => theme.ACCENT};
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px ${({ theme }) => theme.ACCENT}22;
  justify-content: center;
  &:hover {
    background: ${({ theme }) => theme.ACCENT + 'cc'};
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
`;

const HolidaysGrid = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const HolidayCard = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? '#333' : '#fff'};
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  transition: all 0.2s;
  position: relative;
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    transform: translateY(-2px);
  }
`;

const HolidayHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const HolidayTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
`;

const HolidayActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background: ${({ color }) => color || '#f43f5e'};
    color: #fff;
  }
`;

const HolidayContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const HolidayInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const HolidayChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const HolidayChip = styled.div<{ variant?: 'class' | 'staff' }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${({ variant }) => 
    variant === 'staff' ? '#f59e0b' : '#4a6cf7'
  };
  color: #fff;
  border: none;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
`;

const EmptyText = styled.p`
  font-size: 1.1rem;
  margin: 0;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
  gap: 1rem;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#f1f5f9'};
  border-top: 3px solid ${({ theme }) => theme.ACCENT};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1.1rem;
  font-weight: 500;
`;

// Add keyframes for spinner animation
const spin = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const MultiSelectContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 100%;
`;

const SearchInput = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.BG === '#252525' ? '#333' : '#f8fafc'};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};

  input {
    border: none;
    background: none;
    outline: none;
    width: 100%;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
    font-size: 0.95rem;

    &::placeholder {
      color: ${({ theme }) => theme.TEXT_SECONDARY};
    }
  }

  svg {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    font-size: 1.2rem;
  }
`;

const SelectionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  padding: 0.5rem;
`;

const SelectionItem = styled.div<{ isSelected: boolean }>`
  padding: 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  background: ${({ theme, isSelected }) => 
    isSelected 
      ? theme.BG === '#252525' 
        ? '#333' 
        : '#f1f5f9'
      : 'transparent'
  };
  transition: background-color 0.2s;

  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#333' : '#f1f5f9'};
  }
`;

const SelectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
`;

const ItemName = styled.span<{ isSelected: boolean }>`
  color: ${({ theme, isSelected }) => 
    isSelected ? theme.ACCENT : theme.TEXT_PRIMARY
  };
  font-weight: ${({ isSelected }) => isSelected ? '600' : '400'};
  flex: 1;
`;

const BulkSelectRow = styled.div`
  padding: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  margin-bottom: 0.5rem;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.2s;

  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#333' : '#f1f5f9'};
  }
`;

const BulkSelectLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  font-size: 0.95rem;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  padding: 1rem;
  
  @media (max-width: 768px) {
    padding: 0.5rem;
    align-items: flex-start;
    padding-top: 2rem;
  }
`;

const ModalBox = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  padding: 1rem;
  min-width: 400px;
  max-width: 90vw;
  width: 100%;
  position: relative;
  max-height: 95vh;
  overflow-y: auto;
  
  @media (max-width: 768px) {
    min-width: 320px;
    max-width: 95vw;
    max-height: 90vh;
    padding: 0.75rem;
  }
`;

const ModalSegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.BG === '#252525' ? '#222' : '#f3f4f6'};
  border-radius: 11px;
  box-shadow: 1.4px 1.4px 4px #2222;
  overflow: hidden;
  margin-bottom: 1rem;
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const ModalSegmentedInput = styled.input`
  font-family: inherit;
  font-size: 0.85em;
  font-weight: 400;
  height: 32px;
  line-height: 32px;
  box-shadow: 1.4px 1.4px 4px #2222;
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#f3f4f6'};
  color: ${({ theme }) => theme.BG === '#252525' ? '#C0C0C0' : '#444'};
  padding: 0 0.84em;
  min-width: 120px;
  border-right: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
  &:last-child {
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
    border-right: none;
  }
  &:first-child {
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  }
  @media (max-width: 768px) {
    width: 100%;
    min-width: 0;
    border-radius: 8px !important;
    border-right: none !important;
    margin-bottom: 0.5rem;
  }
`;

const ModalSegmentedCheckbox = styled.div`
  display: flex;
  align-items: center;
  padding: 0 0.84em;
  height: 32px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#f3f4f6'};
  border-right: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
  &:last-child {
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
    border-right: none;
  }
  @media (max-width: 768px) {
    width: 100%;
    border-radius: 8px !important;
    border-right: none !important;
    margin-bottom: 0.5rem;
    justify-content: center;
  }
`;

const ModalSegmentedButton = styled.button<{ $variant?: 'primary' | 'danger' | 'secondary'; $first?: boolean; $last?: boolean }>`
  font-family: inherit;
  font-size: 0.85em;
  font-weight: 600;
  height: 32px;
  line-height: 32px;
  box-shadow: 1.4px 1.4px 4px #2222;
  border: none;
  outline: none;
  transition: all 0.2s;
  appearance: none;
  padding: 0 1.12em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35em;
  border-radius: 0;
  cursor: pointer;
  
  ${({ $first }) => $first && `
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  `}
  ${({ $last }) => $last && `
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  
  background: ${({ $variant, theme }) => {
    if ($variant === 'primary') return '#16a34a';
    if ($variant === 'danger') return '#dc2626';
    return theme.BG === '#252525' ? '#444' : '#f3f4f6';
  }};
  
  color: ${({ $variant }) => {
    if ($variant === 'primary' || $variant === 'danger') return '#fff';
    return 'inherit';
  }};
  
  border: 1.5px solid ${({ $variant, theme }) => {
    if ($variant === 'primary') return '#16a34a';
    if ($variant === 'danger') return '#dc2626';
    return theme.BG === '#252525' ? '#555' : '#e5e7eb';
  }};
  
  &:not(:first-child) {
    border-left: none;
  }
  
  &:hover {
    background: ${({ $variant }) => {
      if ($variant === 'primary') return '#15803d';
      if ($variant === 'danger') return '#991b1b';
      return 'inherit';
    }};
    opacity: ${({ $variant }) => $variant ? '0.9' : '0.8'};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    width: 100%;
    border-radius: 8px !important;
    border-left: none !important;
    margin-bottom: 0.5rem;
  }
`;

const ModalCheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8em;
  color: ${({ theme }) => theme.BG === '#252525' ? '#C0C0C0' : '#444'};
  cursor: pointer;
  white-space: nowrap;
  @media (max-width: 768px) {
    font-size: 0.85em;
  }
`;

const ModalCheckbox = styled.input`
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 2px solid ${({ theme }) => theme.BG === '#252525' ? '#4a6cf7' : '#6366f1'};
  background: ${({ theme }) => theme.BG === '#252525' ? '#181c24' : '#fff'};
  appearance: none;
  outline: none;
  cursor: pointer;
  transition: border 0.18s, background 0.18s, box-shadow 0.18s;
  &:checked {
    background: ${({ theme }) => theme.ACCENT};
    border-color: ${({ theme }) => theme.ACCENT};
  }
  &:checked::after {
    content: '';
    display: block;
    position: absolute;
    left: 3px;
    top: 1px;
    width: 4px;
    height: 8px;
    border: solid #fff;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
  &:hover, &:focus {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}44;
  }
`;

const ModalSegmentedSelect = styled.select`
  font-family: inherit;
  font-size: 0.85em;
  font-weight: 400;
  height: 32px;
  line-height: 32px;
  box-shadow: 1.4px 1.4px 4px #2222;
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#f3f4f6'};
  color: ${({ theme }) => theme.BG === '#252525' ? '#C0C0C0' : '#444'};
  padding: 0 2.2em 0 0.84em;
  min-width: 120px;
  border-right: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
  &:last-child { border-right: none; }
  &:first-child {
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  }
  &:last-child {
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  }
  background-image: ${({ theme }) => theme.BG === '#252525'
    ? `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%23C0C0C0' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`
    : `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%23444' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`};
  background-repeat: no-repeat;
  background-position: right 0.8em center;
  background-size: 1em 1em;
  @media (max-width: 768px) {
    width: 100%;
    min-width: 0;
    border-radius: 8px !important;
    border-right: none !important;
    margin-bottom: 0.5rem;
  }
`;

const ModalGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-top: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const ModalSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ModalSectionTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ModalTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0 0 1rem 0;
  padding-right: 3rem;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
    padding-right: 3.5rem;
    margin-bottom: 0.75rem;
  }
`;

const ModalClose = styled.button<{ disabled?: boolean }>`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: ${({ theme, disabled }) => disabled ? theme.TEXT_DISABLED : theme.TEXT_SECONDARY};
  font-size: 1.5rem;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s;
  z-index: 10;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${({ disabled }) => disabled ? 0.5 : 1};
  
  &:hover {
    background: ${({ theme, disabled }) => disabled ? 'none' : theme.BORDER};
    color: ${({ theme, disabled }) => disabled ? theme.TEXT_DISABLED : theme.TEXT_PRIMARY};
  }
  
  @media (max-width: 768px) {
    top: 0.75rem;
    right: 0.75rem;
    font-size: 1.25rem;
    width: 32px;
    height: 32px;
    padding: 0.25rem;
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  justify-content: flex-end;
`;

const ModalButton = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  background: ${({ color, theme }) => color || theme.ACCENT};
  color: #fff;
  transition: all 0.2s;
  &:hover {
    background: ${({ color, theme }) => color ? color + 'cc' : theme.ACCENT + 'cc'};
    transform: translateY(-1px);
  }
`;

const ModalText = styled.div`
  margin-bottom: 1.5rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  line-height: 1.5;
`;

interface Section {
  id: number;
  name: string;
  class_id: number;
}

interface Class {
  id: number;
  name: string;
  has_sections?: boolean;
}

interface Staff {
  id: number;
  name: string;
  role: string;
}

interface Holiday {
    id: number;
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    is_recurring: boolean;
    session_id: number;
  holiday_classes?: Array<{
    class_id: number;
    section_id: number | null;
    classes: {
      id: number;
      name: string;
    };
    sections: {
      id: number;
      name: string;
    } | null;
  }>;
  holiday_staff?: Array<{
    staff_id: number;
    staff: {
      id: number;
      name: string;
      role: string;
    };
  }>;
  classes?: Array<{
    class_id: number;
    class_name: string;
    sections?: Array<{
      section_id: number;
      section_name: string;
    }>;
  }>;
  staff?: Array<{
    staff_id: number;
    staff_name: string;
    staff_role: string;
  }>;
}

interface ClassAssignment {
  class_id: number;
  class_name: string;
  sections: Array<{
    section_id: number;
    section_name: string;
  }>;
}

interface ClassSectionSelectorProps {
  classes: Class[];
  sections: Section[];
  selectedClasses: number[];
  selectedSections: { [key: number]: number[] };
  onClassSelect: (classId: number) => void;
  onSectionSelect: (classId: number, sectionId: number) => void;
  onBulkClassSelection: (selectAll: boolean) => void;
}

interface StaffSelectorProps {
  staff: Staff[];
  selectedStaff: number[];
  onStaffSelect: (staffId: number) => void;
  onBulkStaffSelection: (selectAll: boolean) => void;
}

const ClassSectionSelector: React.FC<ClassSectionSelectorProps> = ({
  classes,
  sections,
  selectedClasses,
  selectedSections,
  onClassSelect,
  onSectionSelect,
  onBulkClassSelection,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClasses, setExpandedClasses] = useState<number[]>([]);

  // Check if all classes are selected
  const allClassesSelected = classes.length > 0 && selectedClasses.length === classes.length;

  useEffect(() => {
    // Auto-expand classes when they are selected
    setExpandedClasses(prev => {
      const newExpanded = new Set(prev);
      selectedClasses.forEach(classId => {
        newExpanded.add(classId);
      });
      return Array.from(newExpanded);
    });
  }, [selectedClasses]);

  const toggleExpand = (classId: number, event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const isCheckbox = target.tagName.toLowerCase() === 'input' && 
                      (target as HTMLInputElement).type === 'checkbox';
    
    // Toggle expansion if not clicking checkbox
    if (!isCheckbox) {
      setExpandedClasses(prev => 
        prev.includes(classId)
          ? prev.filter(id => id !== classId)
          : [...prev, classId]
      );
    }
  };

  const handleClassCheckbox = (e: React.ChangeEvent<HTMLInputElement>, classId: number) => {
    e.stopPropagation();
    onClassSelect(classId);
  };

  const handleSectionCheckbox = (e: React.ChangeEvent<HTMLInputElement>, classId: number, sectionId: number) => {
    e.stopPropagation();
    if (!selectedSections[classId]?.includes(sectionId)) {
      if (!selectedClasses.includes(classId)) {
        onClassSelect(classId);
      }
    }
    onSectionSelect(classId, sectionId);
  };

  const formatClassName = (name: string) => {
    const match = name.match(/(\d+)/);
    if (!match) return name;
    
    const num = parseInt(match[1]);
    const suffix = ['th', 'st', 'nd', 'rd'][(num > 3 && num < 21) || num % 10 > 3 ? 0 : num % 10];
    return name.replace(/(\d+)/, `${num}${suffix}`);
  };

  // Sort classes: numbered classes first, then special classes (Play Group, Nursery, K.G)
  const sortedClasses = sortClasses(classes);

  const filteredClasses = sortedClasses.filter(cls => 
    cls.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const getSelectedSectionsCount = (classId: number) => {
    const count = selectedSections[classId]?.length || 0;
    return count > 0 ? `${count} sections selected` : '';
  };

  return (
    <MultiSelectContainer>
      <SearchInput>
        <Search />
        <input
          type="text"
          placeholder="Search classes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </SearchInput>
      
      {/* Select All Classes Option */}
      {classes.length > 0 && (
        <div style={{ 
          padding: '0.75rem', 
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '0.5rem'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            cursor: 'pointer'
          }}
          onClick={() => {
            onBulkClassSelection(!allClassesSelected);
          }}>
            <input
              type="checkbox"
              checked={allClassesSelected}
              onChange={() => {}} // Handle change in onClick to avoid double-triggering
              style={{ 
                width: '16px', 
                height: '16px',
                borderRadius: '4px',
                cursor: 'pointer',
                accentColor: '#4a6cf7'
              }}
            />
            <span style={{ 
              fontWeight: '600', 
              color: '#4a6cf7',
              fontSize: '0.95rem'
            }}>
              {allClassesSelected ? 'Deselect All Classes' : 'Select All Classes'}
            </span>
          </div>
        </div>
      )}
      
      <SelectionList>
        {filteredClasses.map(cls => {
          const isSelected = selectedClasses.includes(cls.id);
          const isExpanded = expandedClasses.includes(cls.id);
          const classSections = sections.filter(s => s.class_id === cls.id);
          const selectedCount = getSelectedSectionsCount(cls.id);

          return (
            <div key={cls.id}>
              <SelectionItem 
                isSelected={isSelected}
                onClick={(e) => toggleExpand(cls.id, e)}
              >
                <SelectionLabel>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleClassCheckbox(e, cls.id)}
                    style={{ 
                      width: '16px', 
                      height: '16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      accentColor: '#4a6cf7'
                    }}
                  />
                  <ItemName isSelected={isSelected}>
                    {cls.name}
                  </ItemName>
                  {selectedCount && (
                    <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      {selectedCount}
                    </span>
                  )}
                </SelectionLabel>
              </SelectionItem>
              {isExpanded && (cls.has_sections ?? true) && classSections.length > 0 && (
                <div style={{ marginLeft: '2rem', marginTop: '0.25rem' }}>
                  {classSections.map(section => {
                    const isSectionSelected = (selectedSections[cls.id] || []).includes(section.id);
                    
                    return (
                      <SelectionItem
                        key={section.id}
                        isSelected={isSectionSelected}
                        onClick={() => onSectionSelect(cls.id, section.id)}
                      >
                        <SelectionLabel>
                          <input
                            type="checkbox"
                            checked={isSectionSelected}
                            onChange={() => {}}
                            style={{ 
                              width: '16px', 
                              height: '16px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              accentColor: '#4a6cf7'
                            }}
                          />
                          <ItemName isSelected={isSectionSelected}>
                            {section.name}
                          </ItemName>
                        </SelectionLabel>
                      </SelectionItem>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </SelectionList>
    </MultiSelectContainer>
  );
};

const StaffSelector: React.FC<StaffSelectorProps> = ({
  staff,
  selectedStaff,
  onStaffSelect,
  onBulkStaffSelection,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Check if all staff are selected
  const allStaffSelected = staff.length > 0 && selectedStaff.length === staff.length;

  const filteredStaff = staff.filter(staffMember => 
    staffMember.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staffMember.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MultiSelectContainer>
      <SearchInput>
        <Search />
        <input
          type="text"
          placeholder="Search staff..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </SearchInput>
      
      {/* Select All Staff Option */}
      {staff.length > 0 && (
        <BulkSelectRow onClick={() => onBulkStaffSelection(!allStaffSelected)}>
          <BulkSelectLabel>
            <input
              type="checkbox"
              checked={allStaffSelected}
              onChange={() => {}}
              style={{ 
                width: '16px', 
                height: '16px',
                borderRadius: '4px',
                cursor: 'pointer',
                accentColor: '#4a6cf7'
              }}
            />
            {allStaffSelected ? 'Deselect All Staff' : 'Select All Staff'}
          </BulkSelectLabel>
        </BulkSelectRow>
      )}
      
      <SelectionList>
        {filteredStaff.map(staffMember => {
          const isSelected = selectedStaff.includes(staffMember.id);
          
          return (
            <SelectionItem 
              key={staffMember.id}
              isSelected={isSelected}
              onClick={() => onStaffSelect(staffMember.id)}
            >
              <SelectionLabel>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onStaffSelect(staffMember.id)}
                  style={{ 
                    width: '16px', 
                    height: '16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    accentColor: '#4a6cf7'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <ItemName isSelected={isSelected}>
                    {staffMember.name}
                  </ItemName>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    color: '#6b7280',
                    marginTop: '2px'
                  }}>
                    {staffMember.role}
                  </div>
                </div>
              </SelectionLabel>
            </SelectionItem>
          );
        })}
      </SelectionList>
    </MultiSelectContainer>
  );
};

const StyledDialog = muiStyled(MuiDialog)(({ theme }) => ({
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

const DialogHeader = muiStyled('div')(({ theme }) => ({
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

const DialogTitle = muiStyled(Typography)(({ theme }) => ({
  fontSize: '1.5rem',
  fontWeight: 600,
  color: theme.palette.mode === 'dark'
    ? theme.palette.primary.light
    : theme.palette.primary.main,
  textShadow: theme.palette.mode === 'dark'
    ? '0 2px 4px rgba(0, 0, 0, 0.5)'
    : 'none'
}));

const StyledDialogContent = muiStyled(MuiDialogContent)(({ theme }) => ({
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
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 100%)'
}));

const FormActions = muiStyled('div')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  padding: '16px 24px',
  borderTop: `1px solid ${theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)'}`,
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
    : 'linear-gradient(0deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)'
}));


const HolidayManager: React.FC = () => {
  const theme = useTheme();
  const toast = useToast();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [selectedSections, setSelectedSections] = useState<{[key: number]: number[]}>({});
  const [selectedStaff, setSelectedStaff] = useState<number[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    is_recurring: false,
    session_id: ''
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [editHolidayForm, setEditHolidayForm] = useState<any>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const fetchHolidays = async () => {
    if (!user?.school_id) {
      toast.showToast('School context not found. Please log in again.');
      return;
    }

    setLoading(true);
    try {
      // First, get all holidays with their class, section, and staff assignments, filtered by school_id
      const { data: holidaysData, error: holidaysError } = await supabase
        .from('holidays')
        .select(`
          *,
          holiday_classes (
            class_id,
            section_id,
            classes (
              id,
              name
            ),
            sections (
              id,
              name
            )
          ),
          holiday_staff (
            staff_id,
            staff (
              id,
              name,
              role
            )
          )
        `)
        .eq('school_id', user.school_id)
        .eq('session_id', selectedSession || '')
        .order('start_date', { ascending: false });

      if (holidaysError) throw holidaysError;

      // Transform the data to match our expected format
      const transformedHolidays = (holidaysData || []).map((holiday: Holiday) => {
        const classes = (holiday.holiday_classes || []).reduce((acc: ClassAssignment[], assignment) => {
          const classEntry = acc.find(c => c.class_id === assignment.class_id);
          if (classEntry) {
            if (assignment.section_id && assignment.sections) {
              classEntry.sections = classEntry.sections || [];
              classEntry.sections.push({
                section_id: assignment.sections.id,
                section_name: assignment.sections.name
              });
            }
          } else if (assignment.classes) {
            acc.push({
              class_id: assignment.class_id,
              class_name: assignment.classes.name,
              sections: assignment.section_id && assignment.sections ? [{
                section_id: assignment.sections.id,
                section_name: assignment.sections.name
              }] : []
            });
          }
          return acc;
        }, []);

        const staff = (holiday.holiday_staff || []).map(assignment => ({
          staff_id: assignment.staff_id,
          staff_name: assignment.staff.name,
          staff_role: assignment.staff.role
        }));

        return {
          ...holiday,
          classes: classes,
          staff: staff,
          holiday_classes: undefined,
          holiday_staff: undefined
        };
      });

      setHolidays(transformedHolidays);
    } catch (error: any) {
      toast.showToast('Failed to fetch holidays: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.school_id && selectedSession) {
      fetchHolidays();
    }
  }, [user?.school_id, selectedSession]);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user?.school_id) return;
      
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, is_active')
        .eq('school_id', user.school_id)
        .order('name');
      if (!error && data) {
        setSessions(data);
        
        // Auto-select the active session
        const activeSession = data.find(session => session.is_active);
        if (activeSession && !selectedSession) {
          setSelectedSession(activeSession.id.toString());
        }
      }
    };
    fetchSessions();
  }, [user?.school_id, selectedSession]);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!user?.school_id) return;
      
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, has_sections')
        .eq('school_id', user.school_id)
        .order('name');
      if (!error && data) {
        setClasses(data);
      }
    };
    fetchClasses();
  }, [user?.school_id]);

  useEffect(() => {
    const fetchSections = async () => {
      if (!user?.school_id) {
        setSections([]);
        setSelectedSections({});
        return;
      }
      const { data, error } = await supabase
        .from('sections')
        .select('id, name, class_id')
        .eq('school_id', user.school_id)
        .order('name');
      if (!error && data) {
        setSections(data);
      }
    };
    fetchSections();
  }, [user?.school_id]);

  useEffect(() => {
    const fetchStaff = async () => {
      if (!user?.school_id) {
        setStaff([]);
        setSelectedStaff([]);
        return;
      }
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, role')
        .eq('school_id', user.school_id)
        .order('name');
      if (!error && data) {
        setStaff(data);
      }
    };
    fetchStaff();
  }, [user?.school_id]);

  const handleClassSelection = (classId: number) => {
    setSelectedClasses(prev => {
      const isSelected = prev.includes(classId);
      const selectedClass = classes.find(c => c.id === classId);
      const hasSections = selectedClass?.has_sections ?? true;
      
      if (isSelected) {
        // Deselect class and remove its sections
        const newSelectedSections = { ...selectedSections };
        delete newSelectedSections[classId];
        setSelectedSections(newSelectedSections);
        return prev.filter(id => id !== classId);
      } else {
        // Select class and automatically select all its sections (only if class has sections)
        if (hasSections) {
          const classSections = sections.filter(s => s.class_id === classId);
          const sectionIds = classSections.map(s => s.id);
          
          setSelectedSections(prev => ({
            ...prev,
            [classId]: sectionIds
          }));
        }
        
        return [...prev, classId];
      }
    });
  };

  const handleSectionSelection = (classId: number, sectionId: number) => {
    setSelectedSections(prev => {
      const currentSections = prev[classId] || [];
      const isSelected = currentSections.includes(sectionId);
      const newSections = isSelected
        ? currentSections.filter(id => id !== sectionId)
        : [...currentSections, sectionId];
      
      return {
        ...prev,
        [classId]: newSections
      };
    });
  };

  // Function to handle bulk class selection/deselection
  const handleBulkClassSelection = (selectAll: boolean) => {
    if (selectAll) {
      // Select all classes and their sections (only for classes that have sections)
      const allClassIds = classes.map(cls => cls.id);
      const allSections: { [key: number]: number[] } = {};
      
      classes.forEach(cls => {
        const hasSections = cls.has_sections ?? true;
        if (hasSections) {
          const classSections = sections.filter(s => s.class_id === cls.id);
          allSections[cls.id] = classSections.map(s => s.id);
        }
      });
      
      setSelectedClasses(allClassIds);
      setSelectedSections(allSections);
    } else {
      // Deselect all classes and clear all sections
      setSelectedClasses([]);
      setSelectedSections({});
    }
  };

  const handleStaffSelection = (staffId: number) => {
    setSelectedStaff(prev => {
      const isSelected = prev.includes(staffId);
      return isSelected
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId];
    });
  };

  // Function to handle bulk staff selection/deselection
  const handleBulkStaffSelection = (selectAll: boolean) => {
    if (selectAll) {
      // Select all staff
      const allStaffIds = staff.map(staffMember => staffMember.id);
      setSelectedStaff(allStaffIds);
    } else {
      // Deselect all staff
      setSelectedStaff([]);
    }
  };

  const handleSaveHoliday = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user?.school_id) {
      toast.showToast('School context not found. Please log in again.');
      return;
    }
    if (!selectedSession) {
      toast.showToast('Please select a session');
      return;
    }
    if (!newHoliday.name) {
      toast.showToast('Please enter a holiday name');
      return;
    }
    if (!newHoliday.start_date || !newHoliday.end_date) {
      toast.showToast('Please select start and end dates');
      return;
    }

    try {
      setCreateLoading(true);
      
      // First, if editing, delete existing holiday_classes and holiday_staff
      if (editId) {
        await supabase
          .from('holiday_classes')
          .delete()
          .eq('holiday_id', editId);
        
        await supabase
          .from('holiday_staff')
          .delete()
          .eq('holiday_id', editId);
      }

      // Save or update the holiday
      const { data: holidayData, error: holidayError } = await supabase
        .from('holidays')
        .upsert({
        name: newHoliday.name,
        description: newHoliday.description,
        start_date: newHoliday.start_date,
        end_date: newHoliday.end_date,
        is_recurring: newHoliday.is_recurring,
          session_id: Number(selectedSession),
          school_id: user.school_id,
          ...(editId && { id: editId })
        })
        .select()
        .single();

      if (holidayError) throw holidayError;

      // Handle class and section assignments
      if (selectedClasses.length > 0) {
        const holidayClasses = [];
        
        // Process each selected class
        for (const classId of selectedClasses) {
          const selectedClass = classes.find(c => c.id === classId);
          const hasSections = selectedClass?.has_sections ?? true;
          const sections = selectedSections[classId] || [];
          
          if (!hasSections) {
            // Class doesn't have sections - add class-wide holiday
            holidayClasses.push({
              holiday_id: holidayData.id,
              class_id: classId,
              section_id: null
            });
          } else if (sections.length === 0) {
            // Class has sections but no specific sections selected - add class-wide holiday
            holidayClasses.push({
              holiday_id: holidayData.id,
              class_id: classId,
              section_id: null
            });
          } else {
            // Class has sections and specific sections selected - add section-specific holidays
            holidayClasses.push(
              ...sections.map(sectionId => ({
                holiday_id: holidayData.id,
                class_id: classId,
                section_id: sectionId
              }))
            );
          }
        }

        if (holidayClasses.length > 0) {
          const { error: classError } = await supabase
            .from('holiday_classes')
            .upsert(holidayClasses);

          if (classError) throw classError;
        }
      }

      // Handle staff assignments
      if (selectedStaff.length > 0) {
        const holidayStaff = selectedStaff.map(staffId => ({
          holiday_id: holidayData.id,
          staff_id: staffId
        }));

        const { error: staffError } = await supabase
          .from('holiday_staff')
          .upsert(holidayStaff);

        if (staffError) throw staffError;
      }

      toast.showToast(editId ? 'Holiday updated.' : 'Holiday saved successfully');
      
      // Reset form
      setNewHoliday({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        is_recurring: false,
        session_id: ''
      });
      setSelectedClasses([]);
      setSelectedSections({});
      setSelectedStaff([]);
      setEditId(null);
      setSelectedSession('');

      // Refresh holidays
      await fetchHolidays();
    } catch (error: any) {
      toast.showToast('Failed to save holiday: ' + error.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteHoliday = async (holidayId: number) => {
    if (!user?.school_id) {
      toast.showToast('School context not found. Please log in again.');
      return;
    }

    try {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', holidayId)
        .eq('school_id', user.school_id);
      if (error) throw error;
      toast.showToast('Holiday deleted successfully');
      setHolidays(holidays.filter(h => h.id !== holidayId));
      if (editId === holidayId) {
        setEditId(null);
        setNewHoliday({
          name: '',
          description: '',
          start_date: '',
          end_date: '',
          is_recurring: false,
          session_id: ''
        });
      }
    } catch (error: any) {
      toast.showToast('Failed to delete holiday: ' + error.message);
    }
  };

  const openDeleteModal = (holiday: Holiday) => {
    setHolidayToDelete(holiday);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setHolidayToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!holidayToDelete || !user?.school_id) return;
    try {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', holidayToDelete.id)
        .eq('school_id', user.school_id);
      if (error) throw error;
      toast.showToast('Holiday deleted.');
      closeDeleteModal();
      await fetchHolidays();
    } catch (error: any) {
      toast.showToast('Failed to delete holiday: ' + error.message);
    }
  };

  const formatDate = (dateStr: string) => {
    return formatAppDate(dateStr);
  };

  // Add this function to handle "Select All Sections" for a class
  const handleSelectAllSections = (classId: number) => {
    const classSections = sections.filter(s => s.class_id === classId);
    setSelectedSections(prev => ({
      ...prev,
      [classId]: classSections.map(s => s.id)
    }));
  };

  const handleEditHoliday = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setEditHolidayForm({
      session_id: holiday.session_id || '',
      name: holiday.name || '',
      description: holiday.description || '',
      start_date: holiday.start_date || '',
      end_date: holiday.end_date || '',
      is_recurring: holiday.is_recurring || false,
      classes: holiday.classes || [],
    });
    setShowEditModal(true);
  };

  const handleEditHolidaySelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setEditHolidayForm((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditHolidayChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target instanceof HTMLInputElement) ? e.target.checked : undefined;
    setEditHolidayForm((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleEditHolidaySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHoliday || !user?.school_id) return;
    if (!editHolidayForm.name || !editHolidayForm.start_date || !editHolidayForm.end_date || !editHolidayForm.session_id) {
      toast.showToast('Please fill all required fields');
      return;
    }
    try {
      // Update holiday
      const { error } = await supabase
        .from('holidays')
        .update({
          name: editHolidayForm.name,
          description: editHolidayForm.description,
          start_date: editHolidayForm.start_date,
          end_date: editHolidayForm.end_date,
          is_recurring: editHolidayForm.is_recurring,
          session_id: Number(editHolidayForm.session_id),
        })
        .eq('id', editingHoliday.id)
        .eq('school_id', user.school_id);
      if (error) throw error;
      toast.showToast('Holiday updated successfully!');
      setShowEditModal(false);
      setEditingHoliday(null);
      setEditHolidayForm({});
      await fetchHolidays();
    } catch (err: any) {
      toast.showToast('Failed to update holiday: ' + err.message);
    }
  };

  const handleEditHolidayCancel = () => {
    setShowEditModal(false);
    setEditingHoliday(null);
    setEditHolidayForm({});
  };

  const handleCreateHoliday = () => {
    setNewHoliday({
      name: '',
      description: '',
      start_date: '',
      end_date: '',
      is_recurring: false,
      session_id: ''
    });
    setSelectedClasses([]);
    setSelectedSections({});
    setSelectedStaff([]);
    setEditId(null);
    setShowCreateModal(true);
  };

  const handleCreateModalCancel = () => {
    if (createLoading) return; // Prevent closing during creation
    setShowCreateModal(false);
    setNewHoliday({
      name: '',
      description: '',
      start_date: '',
      end_date: '',
      is_recurring: false,
      session_id: ''
    });
    setSelectedClasses([]);
    setSelectedSections({});
    setSelectedStaff([]);
    setEditId(null);
    setCreateLoading(false);
  };

  const handleCreateModalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSaveHoliday();
    if (!createLoading) {
      setShowCreateModal(false);
    }
  };

  // Show loading state if school context is not available
  if (!user?.school_id) {
    return <Loader />;
  }

  // Show NoSessionsFound if there are no sessions
  if (sessions.length === 0) {
    return <NoSessionsFound />;
  }

  // Show NoClassesFound if there are no classes
  if (classes.length === 0) {
    return <NoClassesFound />;
  }

  // Show NoSectionsFound if there are no sections
  if (sections.length === 0) {
    return <NoSectionsFound />;
  }

  return (
    <Container>
      <PageHeader>
        <PageTitle>
          <CalendarMonth />
          Manage Holidays
        </PageTitle>
        <CreateButton onClick={handleCreateHoliday}>
          <Add />
          Create Holiday
        </CreateButton>
      </PageHeader>
      
      <MainContent>
        <HolidaysSection>
          <SectionTitle>
            <CalendarMonth />
            Holidays
          </SectionTitle>
          
          {holidays.length === 0 ? (
            <EmptyState>
              <EmptyIcon>
                <CalendarMonth />
              </EmptyIcon>
              <EmptyText>No holidays created yet</EmptyText>
            </EmptyState>
          ) : (
            <HolidaysGrid>
              {holidays.map(holiday => {
                const sessionName = sessions.find(s => s.id === holiday.session_id)?.name;
                return (
                  <HolidayCard key={holiday.id}>
                    <HolidayHeader>
                      <HolidayTitle>{holiday.name}</HolidayTitle>
                      <HolidayActions>
                        <ActionButton
                          title="Edit"
                          onClick={() => handleEditHoliday(holiday)}
                          disabled={loading}
                        >
                          <Edit />
                        </ActionButton>
                        <ActionButton
                          title="Delete"
                          onClick={() => openDeleteModal(holiday)}
                          disabled={loading}
                          color="#f43f5e"
                        >
                          <Delete />
                        </ActionButton>
                      </HolidayActions>
                    </HolidayHeader>
                    
                    <HolidayContent>
                      <HolidayInfo>
                        <CalendarMonth style={{ fontSize: '1rem' }} />
                        Session: {sessionName}
                      </HolidayInfo>
                      
                      {holiday.classes && holiday.classes.length > 0 ? (
                        <>
                          <HolidayInfo>
                            <School style={{ fontSize: '1rem' }} />
                            Classes & Sections:
                          </HolidayInfo>
                          <HolidayChips>
                            {holiday.classes.map(c => {
                              const classObj = classes.find(cls => cls.id === c.class_id);
                              const hasSections = classObj?.has_sections ?? true;
                              
                              const displayText = hasSections && c.sections && c.sections.length > 0
                                ? `${c.class_name} (${c.sections.map(s => s.section_name).join(', ')})`
                                : c.class_name;
                              
                              return (
                                <HolidayChip key={c.class_id} variant="class">
                                  {displayText}
                                </HolidayChip>
                              );
                            })}
                          </HolidayChips>
                        </>
                      ) : (
                        <HolidayInfo>
                          <School style={{ fontSize: '1rem' }} />
                          Classes: School-wide
                        </HolidayInfo>
                      )}
                      
                      {holiday.staff && holiday.staff.length > 0 ? (
                        <>
                          <HolidayInfo>
                            <People style={{ fontSize: '1rem' }} />
                            Staff:
                          </HolidayInfo>
                          <HolidayChips>
                            {holiday.staff.map(s => (
                              <HolidayChip key={s.staff_id} variant="staff">
                                {s.staff_name} ({s.staff_role})
                              </HolidayChip>
                            ))}
                          </HolidayChips>
                        </>
                      ) : (
                        <HolidayInfo>
                          <People style={{ fontSize: '1rem' }} />
                          Staff: All staff
                        </HolidayInfo>
                      )}
                      
                      <HolidayInfo>
                        <CalendarMonth style={{ fontSize: '1rem' }} />
                        Period: {formatDate(holiday.start_date)} to {formatDate(holiday.end_date)}
                      </HolidayInfo>
                      
                      {holiday.description && (
                        <HolidayInfo>
                          Description: {holiday.description}
                        </HolidayInfo>
                      )}
                      
                      {holiday.is_recurring && (
                        <HolidayInfo>
                          🔄 Recurring Holiday
                        </HolidayInfo>
                      )}
                    </HolidayContent>
                  </HolidayCard>
                );
              })}
            </HolidaysGrid>
          )}
        </HolidaysSection>
      </MainContent>

      {showDeleteModal && holidayToDelete && (
        <ModalOverlay>
          <ModalBox>
            <ModalTitle>Delete Holiday?</ModalTitle>
            <ModalClose onClick={closeDeleteModal} title="Close"><Close /></ModalClose>
            <ModalText>
              Are you sure you want to delete the holiday <b>{holidayToDelete.name}</b>?
            </ModalText>
            <ModalActions>
              <ModalButton type="button" color="#6b7280" onClick={closeDeleteModal}>Cancel</ModalButton>
              <ModalButton type="button" color="#dc2626" onClick={handleDeleteConfirm}>Delete</ModalButton>
            </ModalActions>
          </ModalBox>
        </ModalOverlay>
      )}

      {showEditModal && editingHoliday && (
        <StyledDialog open={showEditModal} onClose={handleEditHolidayCancel} maxWidth="sm" fullWidth>
          <DialogHeader>
            <DialogTitle>
              Edit Holiday
            </DialogTitle>
            <IconButton onClick={handleEditHolidayCancel} size="small">
              <Close style={{ fontSize: 20 }} />
            </IconButton>
          </DialogHeader>
          <StyledDialogContent>
            <form onSubmit={handleEditHolidaySave}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Session*</InputLabel>
                    <MuiSelect
                      name="session_id"
                      value={editHolidayForm.session_id}
                      label="Session*"
                      onChange={handleEditHolidaySelectChange}
                      required
                    >
                      <MenuItem value="">Select Session</MenuItem>
                      {sessions.map((s) => (
                        <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                      ))}
                    </MuiSelect>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="name"
                    label="Holiday Name*"
                    value={editHolidayForm.name}
                    onChange={handleEditHolidayChange}
                    required
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="description"
                    label="Description"
                    value={editHolidayForm.description}
                    onChange={handleEditHolidayChange}
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <AppDateField
                    value={editHolidayForm.start_date}
                    onChangeValue={(value) => setEditHolidayForm(prev => ({ ...prev, start_date: value }))}
                    label="Start Date*"
                    required
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <AppDateField
                    value={editHolidayForm.end_date}
                    onChangeValue={(value) => setEditHolidayForm(prev => ({ ...prev, end_date: value }))}
                    label="End Date*"
                    required
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <MuiCheckbox
                        name="is_recurring"
                        checked={!!editHolidayForm.is_recurring}
                        onChange={handleEditHolidayChange}
                        color="primary"
                      />
                    }
                    label="Recurring Holiday"
                  />
                </Grid>
              </Grid>
              <FormActions>
                <Button onClick={handleEditHolidayCancel} variant="outlined" size="small" sx={{ borderRadius: '6px', textTransform: 'none', px: 2 }}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" size="small" sx={{ borderRadius: '6px', textTransform: 'none', px: 2 }}>
                  Save Changes
                </Button>
              </FormActions>
            </form>
          </StyledDialogContent>
        </StyledDialog>
      )}

      {/* Create Holiday Modal */}
      {showCreateModal && (
        <ModalOverlay>
          <ModalBox style={{ maxWidth: '900px', width: '95vw' }}>
            <ModalTitle>Create New Holiday</ModalTitle>
            <ModalClose onClick={handleCreateModalCancel} disabled={createLoading}>×</ModalClose>
            
            <form onSubmit={handleCreateModalSave}>
              {/* Compact Segmented Header */}
              <ModalSegmentedGroup>
                <ModalSegmentedSelect
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value as string)}
                  required
                >
                  <option value="">Select Session</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </ModalSegmentedSelect>
                
                <ModalSegmentedInput
                  type="text"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Holiday Name"
                  required
                />
                
                <AppDateField
                  value={newHoliday.start_date}
                  onChange={(e) => {
                    const startDate = e.target.value;
                    setNewHoliday(prev => ({ 
                      ...prev, 
                      start_date: startDate,
                      end_date: prev.end_date || startDate
                    }));
                  }}
                  required
                  textFieldProps={{ InputLabelProps: { shrink: true } }}
                />
                
                <AppDateField
                  value={newHoliday.end_date}
                  onChange={(e) => setNewHoliday(prev => ({ ...prev, end_date: e.target.value }))}
                  required
                  textFieldProps={{ InputLabelProps: { shrink: true } }}
                />
                
                <ModalSegmentedCheckbox>
                  <ModalCheckboxLabel htmlFor="recurring-create-modal">
                    <ModalCheckbox
                      type="checkbox"
                      checked={newHoliday.is_recurring}
                      onChange={(e) => setNewHoliday(prev => ({ ...prev, is_recurring: e.target.checked }))}
                      id="recurring-create-modal"
                    />
                    Recurring
                  </ModalCheckboxLabel>
                </ModalSegmentedCheckbox>
              </ModalSegmentedGroup>


              {/* Two-column layout for Students and Staff */}
              <ModalGrid>
                <ModalSection>
                  <ModalSectionTitle>
                    <School />
                    Students & Classes
                  </ModalSectionTitle>
                  <ClassSectionSelector
                    classes={classes}
                    sections={sections}
                    selectedClasses={selectedClasses}
                    selectedSections={selectedSections}
                    onClassSelect={handleClassSelection}
                    onSectionSelect={handleSectionSelection}
                    onBulkClassSelection={handleBulkClassSelection}
                  />
                </ModalSection>

                <ModalSection>
                  <ModalSectionTitle>
                    <People />
                    Staff Members
                  </ModalSectionTitle>
                  <StaffSelector
                    staff={staff}
                    selectedStaff={selectedStaff}
                    onStaffSelect={handleStaffSelection}
                    onBulkStaffSelection={handleBulkStaffSelection}
                  />
                </ModalSection>
              </ModalGrid>

              <ModalSegmentedGroup style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                <ModalSegmentedButton
                  type="button"
                  $variant="secondary"
                  $first
                  onClick={handleCreateModalCancel}
                  disabled={createLoading}
                >
                  Cancel
                </ModalSegmentedButton>
                <ModalSegmentedButton
                  type="submit"
                  $variant="primary"
                  $last
                  disabled={!selectedSession || createLoading}
                >
                  {createLoading ? (
                    <>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        border: '2px solid #ffffff40',
                        borderTop: '2px solid #ffffff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save />
                      Create Holiday
                    </>
                  )}
                </ModalSegmentedButton>
              </ModalSegmentedGroup>
            </form>
          </ModalBox>
        </ModalOverlay>
      )}
    </Container>
  );
};

export default HolidayManager;
