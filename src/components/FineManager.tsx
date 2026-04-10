import React, { useState, useEffect, useContext } from 'react';
import styled, { useTheme, keyframes } from 'styled-components';
import { sortClasses } from '../utils/classUtils';
import { supabase } from '../supabaseClient';
import { Save, Delete, Edit, Close, Info } from '@mui/icons-material';
import { useToast } from './useToast';
import { useAuth } from '../contexts/AuthContext';
import { formatAppDate } from '../utils/dateUtils';
import NoClassesFound from './NoClassesFound';
import NoSectionsFound from './NoSectionsFound';
import { useProgress } from '../components/Layout';

import Loader from '../components/Loader';
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: ${({ theme }) => theme.BG};
`;

const Header = styled.div`
  flex: 0 0 auto;
  padding: 0.75rem 2rem 0.5rem 2rem;
  background: ${({ theme }) => theme.BG};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 700px) {
    padding: 0.5rem 1rem 0.25rem 1rem;
  }
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
`;

const HeaderFilters = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  
  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
`;

const MainContent = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 1.5rem 0rem 1rem 2rem;
  
  @media (max-width: 700px) {
    padding: 1rem;
    overflow-y: scroll;
    -webkit-overflow-scrolling: touch;
  }
`;

const Container = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 2rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG};
  flex: 0 0 auto;
  
  @media (max-width: 700px) {
    padding: 0.5rem 1rem;
    flex-direction: row;
    align-items: center;
  }
`;

const PaginationInfo = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.95rem;
  margin-left: auto;
  
  @media (max-width: 700px) {
    font-size: 0.9rem;
  }
`;

const FormCard = styled.form`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : theme.CARD};
  box-shadow: 0 6px 32px rgba(0,0,0,0.18), 0 1.5px 6px rgba(0,0,0,0.10);
  border-radius: 14px;
  padding: 1.5rem 1.5rem 1.2rem 1.5rem;
  margin-bottom: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  width: 100%;
  align-items: stretch;
  height: 100%;
  
  @media (max-width: 900px) {
    margin-bottom: 1rem;
    padding: 1rem;
    gap: 0.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    height: auto;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 120px;
  
  @media (max-width: 900px) {
    gap: 0.2rem;
    min-width: auto;
  }
`;

const Label = styled.label`
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 600;
  margin-bottom: 0.1rem;
`;

const Select = styled.select`
  padding: 0.5rem 0.7rem;
  border-radius: 8px;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.05rem;
  outline: none;
  min-width: 90px;
  transition: border 0.18s;
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
  }
`;

const Input = styled.input`
  padding: 0.5rem 0.7rem;
  border-radius: 8px;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.05rem;
  outline: none;
  min-width: 110px;
  transition: border 0.18s;
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
  }
`;

const ActionButton = styled.button`
  padding: 0.9rem 2.2rem;
  font-size: 1.15rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  background: ${({ theme }) => theme.ACCENT};
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.18s, box-shadow 0.18s;
  box-shadow: 0 2px 8px ${({ theme }) => theme.ACCENT}22;
  justify-content: center;
  width: 100%;
  margin-top: auto;
  &:hover {
    background: ${({ theme }) => theme.ACCENT + 'cc'};
  }
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  @media (max-width: 900px) {
    padding: 0.7rem 1.5rem;
    font-size: 1rem;
    gap: 0.5rem;
    border-radius: 8px;
    margin-top: 0;
  }
`;

const TableWrapper = styled.div`
  width: 100vw;
  max-width: 100vw;
  overflow-x: auto;
  background: ${({ theme }) => theme.CARD};
  border-radius: 18px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 1.5px solid ${({ theme }) => theme.BORDER};
  margin-bottom: 2rem;
  position: relative;
  @media (max-width: 600px) {
    border-radius: 12px;
    &::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 32px;
      height: 100%;
      pointer-events: none;
      background: linear-gradient(to left, ${({ theme }) => theme.CARD} 60%, transparent 100%);
      z-index: 2;
    }
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
  @media (max-width: 600px) {
    min-width: unset;
    font-size: 0.97rem;
  }
  thead tr {
    background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#f3f4f8'} !important;
  }
  th, td {
    text-align: center;
    padding: 1.1rem 1.5rem;
    font-size: 1.08rem;
    word-break: break-word;
    @media (max-width: 600px) {
      padding: 0.7rem 0.5rem;
      font-size: 0.97rem;
    }
  }
  th {
    color: ${({ theme }) => theme.ACCENT};
    font-weight: 700;
    border-bottom: 2px solid ${({ theme }) => theme.BORDER};
    background: ${({ theme }) => theme.CARD};
    position: sticky;
    top: 0;
    z-index: 2;
    white-space: nowrap;
    @media (max-width: 600px) {
      font-size: 0.97rem;
      white-space: normal;
    }
  }
  td {
    color: ${({ theme }) => theme.TEXT_PRIMARY};
    border-bottom: 1px solid ${({ theme }) => theme.BORDER};
    font-weight: 500;
    @media (max-width: 600px) {
      font-size: 0.97rem;
    }
  }
  tr:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#f3f4f8'};
  }
`;

const DeleteButton = styled(ActionButton)`
  background: #dc2626;
  &:hover {
    background: #dc2626cc;
  }
`;

const Heading = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  text-align: left;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const IconButton = styled.button`
  background: ${({ color, theme }) => color || theme.ACCENT};
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.35rem 0.7rem;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 1px 4px ${({ theme }) => theme.ACCENT}11;
  transition: background 0.18s, box-shadow 0.18s, transform 0.12s;
  &:hover {
    background: ${({ color, theme }) => color ? color + 'cc' : theme.ACCENT + 'cc'};
    transform: scale(1.08);
  }
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
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
  animation: ${spin} 1s linear infinite;
`;

const LoadingText = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1.1rem;
  font-weight: 500;
`;

// Modal styles
const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.8);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(6px);
`;

const ModalBox = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  min-width: 320px;
  max-width: 95vw;
  width: 100%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  position: relative;
  border: 2px solid ${({ theme }) => theme.BORDER};
  opacity: 1;
`;

const ModalHeader = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${({ theme }) => theme.BG_SECONDARY || theme.BG || '#f8f9fa'};
  border-radius: 16px 16px 0 0;
  min-height: 60px;
`;

const ModalMain = styled.div`
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  max-height: 70vh;
`;

const ModalFooter = styled.div`
  padding: 0.75rem 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  background: ${({ theme }) => theme.BG_SECONDARY || theme.BG || '#f8f9fa'};
  border-radius: 0 0 16px 16px;
  min-height: 50px;
`;

const ModalTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
`;

const ModalClose = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  &:hover {
    color: #ef4444;
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

const ModalButton = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  background: ${({ color, theme }) => color || theme.ACCENT};
  color: #fff;
  transition: background 0.18s;
  &:hover {
    background: ${({ color, theme }) => color ? color + 'cc' : theme.ACCENT + 'cc'};
  }
`;

const ModalText = styled.div`
  margin-bottom: 1.2rem;
  color: ${({ theme }) => (theme && 'TEXT_PRIMARY' in theme ? (theme as any).TEXT_PRIMARY : '#fff')};
`;

// Hide number input arrows
const AmountInputWrapper = styled.div`
  position: relative;
  width: 100%;
  display: flex;
`;

const AmountInput = styled(Input)`
  width: 100%;
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  -moz-appearance: textfield;
  padding-right: 2.2rem;
  box-sizing: border-box;
`;

const ClearButton = styled.button`
  position: absolute;
  right: 0.3rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #aaa;
  font-size: 1.1rem;
  cursor: pointer;
  z-index: 2;
  padding: 0 0.2rem;
  margin: 0;
  height: 100%;
  display: flex;
  align-items: center;
  &:hover {
    color: #f43f5e;
    background: #f43f5e22;
    border-radius: 50%;
  }
`;

const AmountButtonGroup = styled.div`
  display: flex;
  gap: 0.4rem;
  margin-top: 0.3rem;
  flex-wrap: wrap;
`;

const AmountButton = styled.button`
  background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#f3f4f8'};
  color: ${({ theme }) => theme.ACCENT};
  border: 1px solid ${({ theme }) => theme.ACCENT};
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.18rem 0.7rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  &:hover {
    background: ${({ theme }) => theme.ACCENT};
    color: #fff;
  }
`;

const AMOUNT_PRESETS = [5, 10, 20, 50, 100];
const AMOUNT_COLORS = ['#6366f1', '#22c55e', '#f59e42', '#f43f5e', '#0ea5e9'];

const PageGrid = styled.div`
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  @media (max-width: 900px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.1rem;
`;

const TopRightDropdown = styled.div`
  margin-left: 1.5rem;
  display: flex;
  align-items: center;
`;

const LeftSection = styled.div`
  flex: 0 0 420px;
  max-width: 420px;
  min-width: 320px;
  position: sticky;
  top: 0;
  align-self: stretch;
  height: calc(100vh - 200px);
  min-height: 400px;
  margin-right: 1.5rem;
  @media (max-width: 900px) {
    flex: 0 0 auto;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    margin: 0;
    position: static;
    height: auto;
  }
`;

const RightSection = styled.div`
  flex: 2 1 0;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  max-height: calc(100vh - 200px);
  min-height: 400px;
  background: ${({ theme }) => theme.BG};
  border: none;
  box-shadow: none;
  
  /* Custom scrollbar for desktop */
  &::-webkit-scrollbar {
    width: 12px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? '#404040' : '#d1d5db'};
    border-radius: 10px;
    border: 3px solid transparent;
    background-clip: content-box;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#505050' : '#9ca3af'};
  }
  
  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.BG === '#252525' ? '#404040 transparent' : '#d1d5db transparent'};
  
  @media (max-width: 900px) {
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
    overflow-y: visible;
    
    /* Hide scrollbar on mobile */
    &::-webkit-scrollbar {
      display: none;
    }
    scrollbar-width: none;
  }
`;

const FineCardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  background: ${({ theme }) => theme.BG};
  border: none;
  box-shadow: none;
  outline: none;
  
  @media (max-width: 900px) {
    gap: 1rem;
    width: 100%;
  }
`;

const FineCard = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : theme.CARD};
  border-radius: 14px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.10);
  padding: 1.2rem 1.2rem 1rem 1.2rem;
  display: flex;
  flex-direction: column;
  position: relative;
  border: 1px solid ${({ theme }) => theme.BORDER};
  transition: border-color 0.18s;
  max-width: 95%;
  margin-left: 1rem;
  &:hover {
    border-color: #6366f1;
  }
  
  @media (max-width: 900px) {
    max-width: 100%;
    margin-left: 0;
  }
`;

const FineCardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.7rem;
`;

const FineCardClass = styled.div`
  font-size: 1.3rem;
  font-weight: 800;
  color: #6366f1;
  margin-bottom: 0;
`;

const FineCardActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-left: 1rem;
`;

const FineCardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const FineCardLabel = styled.div`
  font-size: 0.97rem;
  color: #aaa;
`;

const FloatingHeader = styled.div`
  margin-bottom: 0.7rem;
  background: ${({ theme }) => theme.CARD};
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  padding: 0.7rem 1.2rem;
  font-size: 14px;
  font-weight: 700;
  color: #888;
  text-align: left;
`;

const CardIconButton = styled.button`
  background: none;
  border: none;
  color: #aaa;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.3rem;
  border-radius: 50%;
  transition: background 0.15s, color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background: #f43f5e;
    color: #fff;
    border-radius: 50%;
  }
`;

const CardEditButton = styled(CardIconButton)`
  &:hover {
    background: #4a6cf7;
    color: #fff;
    border-radius: 50%;
  }
`;

const FineAmount = styled.div`
  font-size: 1.5rem;
  font-weight: 800;
  color: #a78bfa;
  margin-bottom: 0.3rem;
`;

const ClassSelect = styled.select`
  padding: 0.35rem 1.1rem;
  border-radius: 8px;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  outline: none;
  min-width: 140px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
`;

// --- Dashboard-style Skeleton Loader for FineManager ---
const FineManagerSkeletonContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background: ${({ theme }) => theme.BG};
  
  @media (max-width: 900px) {
    height: auto;
    min-height: 100vh;
  }
`;
const SkeletonHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 2rem 0.5rem 2rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG};
  flex: 0 0 auto;
  
  @media (max-width: 700px) {
    padding: 0.5rem 1rem 0.25rem 1rem;
  }
`;

const SkeletonMainContent = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 1.5rem 0rem 1rem 2rem;
  
  @media (max-width: 700px) {
    padding: 1rem;
    overflow-y: scroll;
    -webkit-overflow-scrolling: touch;
  }
`;

const SkeletonContainer = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
`;

const SkeletonFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 2rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG};
  flex: 0 0 auto;
  
  @media (max-width: 700px) {
    padding: 0.5rem 1rem;
    flex-direction: row;
    align-items: center;
  }
`;

const SkeletonFooterInfo = styled.div`
  width: 120px;
  height: 20px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : theme.CARD};
  border-radius: 6px;
  margin-left: auto;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
    border-radius: 6px;
  }
`;

const SkeletonHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.1rem;
`;
const SkeletonHeading = styled.div`
  width: 220px;
  height: 32px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : theme.CARD};
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
    border-radius: 8px;
  }
`;
const SkeletonDropdown = styled.div`
  width: 160px;
  height: 36px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : theme.CARD};
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
    border-radius: 8px;
  }
`;
const SkeletonPageGrid = styled.div`
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  @media (max-width: 900px) {
    flex-direction: column;
    gap: 1rem;
  }
  @media (max-width: 700px) {
    flex-direction: column;
    gap: 0.7rem;
    min-width: 0;
    width: 100vw;
  }
`;
const SkeletonFormCard = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : theme.CARD};
  border-radius: 14px;
  padding: 1.5rem 1.5rem 1.2rem 1.5rem;
  margin-bottom: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  width: 100%;
  align-items: stretch;
  flex: 0 0 420px;
  max-width: 420px;
  min-width: 320px;
  height: calc(100vh - 200px);
  min-height: 400px;
  margin-right: 1.5rem;
  @media (max-width: 900px) {
    flex: 0 0 auto;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    margin: 0 0 1rem 0;
    height: auto;
  }
  @media (max-width: 700px) {
    padding: 1.1rem 0.6rem;
    border-radius: 12px;
    box-sizing: border-box;
  }
`;
const SkeletonInput = styled.div`
  width: 100%;
  height: 36px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : theme.CARD};
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
    border-radius: 8px;
  }
`;
const SkeletonFineCardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  background: ${({ theme }) => theme.BG};
  border: none;
  box-shadow: none;
  outline: none;
  flex: 2 1 0;
  min-width: 0;
  width: 100%;
  overflow-y: auto;
  max-height: calc(100vh - 200px);
  min-height: 400px;
  @media (max-width: 900px) {
    gap: 1rem;
    width: 100%;
    flex: 1 1 auto;
    overflow-y: visible;
  }
  @media (max-width: 700px) {
    gap: 0.7rem;
    width: 100vw;
    min-width: 0;
    max-width: 100vw;
  }
`;
const SkeletonFineCard = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : theme.CARD};
  border-radius: 14px;
  padding: 1.2rem 1.2rem 1rem 1.2rem;
  min-height: 100px;
  position: relative;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.BORDER};
  max-width: 95%;
  margin-left: 1rem;
  @media (max-width: 900px) {
    max-width: 100%;
    margin-left: 0;
  }
  @media (max-width: 700px) {
    padding: 1.1rem 0.6rem;
    border-radius: 12px;
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
    margin: 0 0 1rem 0;
  }
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.08), transparent);
    animation: shimmer 1.5s infinite;
    border-radius: 14px;
  }
`;

const FineManagerSkeleton: React.FC = () => (
  <FineManagerSkeletonContainer>
    <style>{`
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `}</style>
    
    <SkeletonHeader>
      <SkeletonHeading />
      <SkeletonDropdown />
    </SkeletonHeader>
    
    <SkeletonMainContent>
      <SkeletonContainer>
        <SkeletonPageGrid>
          <SkeletonFormCard>
            {[1,2,3,4].map(i => <SkeletonInput key={i} />)}
          </SkeletonFormCard>
          <SkeletonFineCardList>
            {[1,2,3,4,5].map(i => <SkeletonFineCard key={i} />)}
          </SkeletonFineCardList>
        </SkeletonPageGrid>
      </SkeletonContainer>
    </SkeletonMainContent>
    
    <SkeletonFooter>
      <SkeletonFooterInfo />
    </SkeletonFooter>
  </FineManagerSkeletonContainer>
);

const FineManager: React.FC = () => {
  const theme = useTheme();
  const toast = useToast();
  const { user } = useAuth();
  const { startProgress, setProgress, completeProgress } = useProgress();
  
  // Check if user has school_id
  if (!user?.school_id) {
    return (
      <Container>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '2rem', 
          gap: 16,
          color: '#888',
          fontSize: '1.1rem',
          fontWeight: 600
        }}>
          <Info style={{ fontSize: '1.5rem' }} />
          No school context found. Please contact your administrator.
        </div>
      </Container>
    );
  }

  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);
  const [sections, setSections] = useState<Array<{ id: number; name: string; class_id: number }>>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [fines, setFines] = useState<Array<{
    id: string;
    class_id: number;
    absent_fine: number;
    late_fine: number;
    effective_from: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingSections, setLoadingSections] = useState(true);
  const [newFine, setNewFine] = useState({ 
    absent_fine: 0, 
    late_fine: 0, 
    effective_from: new Date().toISOString().split('T')[0] 
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fineToEdit, setFineToEdit] = useState<typeof fines[0] | null>(null);
  const [fineToDelete, setFineToDelete] = useState<typeof fines[0] | null>(null);
  const [classFilter, setClassFilter] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      startProgress(false);
      setProgress(10);
      setLoading(true);
      setLoadingClasses(true);
      setLoadingSections(true);
      const minDuration = 1500;
      // Start data fetch and timer in parallel
      const dataPromise = (async () => {
        // Fetch classes
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('id, name')
          .eq('school_id', user.school_id)
          .order('name', { ascending: true });
        if (!classError && classData) {
          const sortedClasses = sortClasses(classData);
          setClasses(sortedClasses);
        }
        setLoadingClasses(false);
        // Fetch sections
        const { data: sectionData, error: sectionError } = await supabase
          .from('sections')
          .select('id, name, class_id')
          .eq('school_id', user.school_id);
        if (!sectionError && sectionData) {
          setSections(sectionData);
        }
        setLoadingSections(false);
        // Fetch fines
        const { data: fineData, error: fineError } = await supabase
          .from('fines')
          .select('*')
          .eq('school_id', user.school_id)
          .order('effective_from', { ascending: false });
        if (!fineError && fineData) {
          setFines(fineData);
        }
        setLoading(false);
      })();
      const timerPromise = new Promise(res => setTimeout(res, minDuration));
      await Promise.all([dataPromise, timerPromise]);
      setProgress(100);
      completeProgress();
    };
    loadAll();
    return () => { isMounted = false; };
  }, [user?.school_id]);

  const handleSaveFine = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedClass) {
      toast.showToast('Please select a class');
      return;
    }
    if (!newFine.effective_from) {
      toast.showToast('Please select an effective from date');
      return;
    }
    // Check for duplicate
    const duplicate = fines.find(f =>
      String(f.class_id) === String(selectedClass) &&
      f.effective_from === newFine.effective_from
    );
    if (duplicate) {
      toast.showToast('A fine for this class with the same effective date already exists.');
      return;
    }
    try {
      const upsertObj: any = {
        class_id: Number(selectedClass),
        absent_fine: newFine.absent_fine,
        late_fine: newFine.late_fine,
        effective_from: newFine.effective_from,
        school_id: user.school_id
      };
      if (editId) upsertObj.id = editId;
      const { error } = await supabase
        .from('fines')
        .upsert(upsertObj);
      if (error) throw error;
      toast.showToast(editId ? 'Fine settings updated.' : 'Fine settings saved successfully');
      setNewFine({ absent_fine: 0, late_fine: 0, effective_from: new Date().toISOString().split('T')[0] });
      setEditId(null);
      setSelectedClass('');
      // Refresh all fines
      const { data } = await supabase
        .from('fines')
        .select('*')
        .eq('school_id', user.school_id)
        .order('effective_from', { ascending: false });
      if (data) setFines(data);
    } catch (error: any) {
      toast.showToast('Failed to save fine settings: ' + error.message);
    }
  };

  const handleDeleteFine = async (fineId: string) => {
    try {
      const { error } = await supabase
        .from('fines')
        .delete()
        .eq('id', fineId)
        .eq('school_id', user.school_id);
      if (error) throw error;
      toast.showToast('Fine settings deleted successfully');
      setFines(fines.filter(f => f.id !== fineId));
      if (editId === fineId) {
        setEditId(null);
        setNewFine({ absent_fine: 0, late_fine: 0, effective_from: '' });
      }
    } catch (error: any) {
      toast.showToast('Failed to delete fine settings: ' + error.message);
    }
  };

  // Handle Enter key to save
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveFine();
    }
  };

  // When absent fine changes, auto-fill late fine to half (rounded)
  const handleAbsentFineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const absent = Number(e.target.value);
    setNewFine(prev => ({
      ...prev,
      absent_fine: absent,
      late_fine: Math.round(absent / 2)
    }));
  };

  const handleEditFine = (fine: typeof fines[0]) => {
    setEditId(fine.id);
    setSelectedClass(String(fine.class_id));
    setNewFine({
      absent_fine: fine.absent_fine,
      late_fine: fine.late_fine,
      effective_from: fine.effective_from || new Date().toISOString().split('T')[0]
    });
  };

  // Edit modal handlers
  const openEditModal = (fine: typeof fines[0]) => {
    setFineToEdit(fine);
    setShowEditModal(true);
  };
  const closeEditModal = () => {
    setShowEditModal(false);
    setFineToEdit(null);
  };
  const handleEditModalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fineToEdit) return;
    if (!fineToEdit.effective_from) {
      toast.showToast('Please select an effective from date');
      return;
    }
    try {
      // Ensure id and class_id are present
      const upsertObj = {
        id: fineToEdit.id,
        class_id: fineToEdit.class_id,
        absent_fine: fineToEdit.absent_fine,
        late_fine: fineToEdit.late_fine,
        effective_from: fineToEdit.effective_from,
        school_id: user.school_id
      };
      const { error } = await supabase
        .from('fines')
        .upsert(upsertObj);
      if (error) throw error;
      toast.showToast('Fine updated.');
      closeEditModal();
      // Refresh all fines
      setLoading(true);
      const { data } = await supabase
        .from('fines')
        .select('*')
        .eq('school_id', user.school_id)
        .order('effective_from', { ascending: false });
      if (data) setFines(data);
      setLoading(false);
    } catch (error: any) {
      toast.showToast('Failed to update fine: ' + error.message);
    }
  };

  // Delete modal handlers
  const openDeleteModal = (fine: typeof fines[0]) => {
    setFineToDelete(fine);
    setShowDeleteModal(true);
  };
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setFineToDelete(null);
  };
  const handleDeleteConfirm = async () => {
    if (!fineToDelete) return;
    try {
      const { error } = await supabase
        .from('fines')
        .delete()
        .eq('id', fineToDelete.id)
        .eq('school_id', user.school_id);
      if (error) throw error;
      toast.showToast('Fine deleted.');
      closeDeleteModal();
      // Refresh all fines
      setLoading(true);
      const { data } = await supabase
        .from('fines')
        .select('*')
        .eq('school_id', user.school_id)
        .order('effective_from', { ascending: false });
      if (data) setFines(data);
      setLoading(false);
    } catch (error: any) {
      toast.showToast('Failed to delete fine: ' + error.message);
    }
  };

  const renderLoading = () => (
    <LoadingContainer>
      <Spinner />
      <LoadingText>Loading fines...</LoadingText>
    </LoadingContainer>
  );

  const filteredFines = classFilter
    ? fines.filter(fine => String(fine.class_id) === classFilter)
    : fines;

  // Show loading state while fetching classes and sections
  if (loadingClasses || loadingSections || loading) {
    return <Loader />;
  }

  // Show NoClassesFound if there are no classes
  if (classes.length === 0) {
    return <NoClassesFound />;
  }

  // Show NoSectionsFound if there are no sections
  if (sections.length === 0) {
    return <NoSectionsFound />;
  }

  if (loading) {
    return <Loader />;
  }

  return (
    <PageContainer>
      <Header>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Title style={{ margin: 0 }}>Fine Management</Title>
          <ClassSelect value={classFilter} onChange={e => setClassFilter(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </ClassSelect>
        </div>
      </Header>
      
      <MainContent>
        <Container>
          <PageGrid>
        <LeftSection>
          <FormCard onSubmit={handleSaveFine}>
            <FilterGroup>
              <Label>Class</Label>
              <Select
                value={selectedClass}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClass(e.target.value)}
                onKeyDown={handleKeyDown}
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </FilterGroup>
            <FilterGroup>
              <Label>Absent Fine (Rs.)</Label>
              <AmountInputWrapper>
                <AmountInput
                  type="number"
                  min="0"
                  value={newFine.absent_fine}
                  onChange={handleAbsentFineChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter amount"
                />
                <ClearButton type="button" onClick={() => setNewFine(prev => ({ ...prev, absent_fine: 0 }))}>&times;</ClearButton>
              </AmountInputWrapper>
            </FilterGroup>
            <FilterGroup>
              <Label>Late Fine (Rs.)</Label>
              <AmountInputWrapper>
                <AmountInput
                  type="number"
                  min="0"
                  value={newFine.late_fine}
                  onChange={e => setNewFine(prev => ({ ...prev, late_fine: Number(e.target.value) }))}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter amount"
                />
                <ClearButton type="button" onClick={() => setNewFine(prev => ({ ...prev, late_fine: 0 }))}>&times;</ClearButton>
              </AmountInputWrapper>
            </FilterGroup>
            <FilterGroup>
              <Label>Effective From</Label>
              <Input
                type="date"
                value={newFine.effective_from}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFine(prev => ({ ...prev, effective_from: e.target.value }))}
                onKeyDown={handleKeyDown}
              />
            </FilterGroup>
            <ActionButton
              type="submit"
              disabled={!selectedClass || loading}
            >
              <Save style={{ fontSize: 20 }} />
              {editId ? 'Update' : 'Save'}
            </ActionButton>
          </FormCard>
        </LeftSection>
        <RightSection>
          <FineCardList>
            {loading ? (
              <div style={{ textAlign: 'center', color: '#888', padding: '2rem 0' }}>Loading fines...</div>
            ) : filteredFines.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#888', padding: '2rem 0' }}>
                No fines configured yet. Add your first fine using the form above.
              </div>
            ) : (
              filteredFines.map(fine => {
                const className = classes.find(c => c.id === fine.class_id)?.name;
                return (
                  <FineCard key={fine.id}>
                    <FineCardTop>
                      <FineCardClass>{className}</FineCardClass>
                      <FineCardActions>
                        <CardEditButton
                          title="Edit"
                          onClick={() => openEditModal(fine)}
                          aria-label="Edit"
                        >
                          <Edit style={{ fontSize: 18 }} />
                        </CardEditButton>
                        <CardIconButton
                          title="Delete"
                          onClick={() => openDeleteModal(fine)}
                          aria-label="Delete"
                          disabled={loading}
                        >
                          <Delete style={{ fontSize: 18 }} />
                        </CardIconButton>
                      </FineCardActions>
                    </FineCardTop>
                    <FineCardBody>
                      <FineCardLabel>Effective from: {formatAppDate(fine.effective_from)}</FineCardLabel>
                      <FineCardLabel>Created by: admin</FineCardLabel>
                    </FineCardBody>
                    <FineAmount>Rs. {Math.round(fine.absent_fine)}</FineAmount>
                  </FineCard>
                );
              })
            )}
          </FineCardList>
        </RightSection>
          </PageGrid>
        </Container>
      </MainContent>
      
      <PaginationContainer>
        <PaginationInfo>
          Total Fines: {filteredFines.length}
        </PaginationInfo>
      </PaginationContainer>

      {/* Edit Modal */}
      {showEditModal && fineToEdit && (
        <ModalOverlay onClick={closeEditModal}>
          <ModalBox as="form" onSubmit={handleEditModalSave} onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Edit Fine</ModalTitle>
              <ModalClose onClick={closeEditModal} title="Close"><Close /></ModalClose>
            </ModalHeader>
            
            <ModalMain>
              <FilterGroup>
                <Label>Class</Label>
                <Select
                  value={fineToEdit.class_id}
                  onChange={e => setFineToEdit(f => f ? { ...f, class_id: Number(e.target.value) } : f)}
                >
                  <option value="">Select Class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </FilterGroup>
              <FilterGroup>
                <Label>Absent Fine (Rs.)</Label>
                <AmountInputWrapper>
                  <AmountInput
                    type="number"
                    min="0"
                    value={fineToEdit.absent_fine}
                    onChange={e => setFineToEdit(f => f ? { ...f, absent_fine: Number(e.target.value), late_fine: Math.round(Number(e.target.value)/2) } : f)}
                    placeholder="Enter amount"
                    required
                  />
                  <ClearButton type="button" onClick={() => setFineToEdit(f => f ? { ...f, absent_fine: 0 } : f)}>&times;</ClearButton>
                </AmountInputWrapper>
              </FilterGroup>
              <FilterGroup>
                <Label>Late Fine (Rs.)</Label>
                <AmountInputWrapper>
                  <AmountInput
                    type="number"
                    min="0"
                    value={fineToEdit.late_fine}
                    onChange={e => setFineToEdit(f => f ? { ...f, late_fine: Number(e.target.value) } : f)}
                    placeholder="Enter amount"
                    required
                  />
                  <ClearButton type="button" onClick={() => setFineToEdit(f => f ? { ...f, late_fine: 0 } : f)}>&times;</ClearButton>
                </AmountInputWrapper>
              </FilterGroup>
              <FilterGroup>
                <Label>Effective From</Label>
                <Input
                  type="date"
                  value={fineToEdit.effective_from}
                  onChange={e => setFineToEdit({ ...fineToEdit, effective_from: e.target.value })}
                  required
                />
              </FilterGroup>
            </ModalMain>
            
            <ModalFooter>
              <ModalActions>
                <ModalButton type="button" color="#6b7280" onClick={closeEditModal}>Cancel</ModalButton>
                <ModalButton type="submit">Save Changes</ModalButton>
              </ModalActions>
            </ModalFooter>
          </ModalBox>
        </ModalOverlay>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && fineToDelete && (
        <ModalOverlay onClick={closeDeleteModal}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Delete Fine</ModalTitle>
              <ModalClose onClick={closeDeleteModal} title="Close"><Close /></ModalClose>
            </ModalHeader>
            
            <ModalMain>
              <ModalText>
                Are you sure you want to delete this fine for <b>{classes.find(c => c.id === fineToDelete.class_id)?.name}</b>?
              </ModalText>
              <ModalText style={{ color: '#ef4444', fontSize: '0.9rem', fontStyle: 'italic' }}>
                This action cannot be undone.
              </ModalText>
            </ModalMain>
            
            <ModalFooter>
              <ModalActions>
                <ModalButton type="button" color="#6b7280" onClick={closeDeleteModal}>Cancel</ModalButton>
                <ModalButton type="button" color="#dc2626" onClick={handleDeleteConfirm}>Delete Fine</ModalButton>
              </ModalActions>
            </ModalFooter>
          </ModalBox>
        </ModalOverlay>
      )}
    </PageContainer>
  );
};

export default FineManager;
