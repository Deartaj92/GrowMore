import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import styled, { useTheme } from 'styled-components';
import { Save, MonetizationOn, Calculate, Payment, History, Search, AccountCircle, CardGiftcard, Paid, ErrorOutline, DeleteOutline as DeleteIcon, Info } from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import { useLocation } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import NoStudentsFound from '../components/NoStudentsFound';
import { useProgress } from '../components/Layout';
import { fetchAllRows } from '../utils/paginationHelper';

import Loader from '../components/Loader';
import { getStudentDisplayId, matchesStudentSearch, fetchStudentByIdentifier, getSequenceNumber } from '../utils/studentUtils';
const Container = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
  box-sizing: border-box;
  @media (max-width: 768px) {
    padding: 1rem 0.5rem;
  }
  @media (max-width: 700px) {
    padding: 0.7rem 0.5rem;
    min-width: 0;
    width: 100%;
    max-width: 100%;
    margin: 0;
    box-sizing: border-box;
  }
`;

const PageGrid = styled.div`
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 1.5rem;
  align-items: start;
  min-height: calc(100vh - 200px);
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  @media (max-width: 700px) {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    min-width: 0;
    width: 100%;
    max-width: 100%;
    margin: 0;
    box-sizing: border-box;
    > div {
      width: 100%;
    }
  }
`;

const LeftSection = styled.div`
  position: sticky;
  top: 1rem;
  height: 100%;
  @media (max-width: 700px) {
    position: static;
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }
`;

const RightSection = styled.div`
  flex: 2 1 0;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  @media (max-width: 700px) {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }
`;

const Heading = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0 0 1.2rem 0;
  text-align: left;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 10px;
  padding: 10px 14px;
  width: 100%;
  margin-bottom: 1.2rem;
  position: relative;
  transition: border-color 0.15s;
  
  &:focus-within {
    border-color: ${({ theme }) => theme.ACCENT};
  }
`;

const SearchInput = styled.input`
  border: none !important;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  outline: none !important;
  width: 100%;
  margin-left: 10px;
  box-shadow: none !important;
  
  &:focus {
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
  }
  
  &::placeholder {
    color: #7c8597;
  }
`;

const FilterSelect = styled.select`
  padding: 6px 12px;
  border-radius: 8px;
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  outline: none;
  margin-left: 1rem;
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  grid-template-rows: 1fr 1fr;
  gap: 2rem 2rem;
  margin-top: 0;
  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    gap: 1.2rem;
  }
`;

const Card = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 18px;
  box-shadow: 0 6px 32px #00000029, 0 1.5px 6px #0000001a;
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 1.8rem 2rem;
  display: flex;
  flex-direction: column;
  position: relative;
  box-sizing: border-box;
  width: 100%;
  @media (max-width: 700px) {
    padding: 0.7rem 0.8rem;
    border-radius: 12px;
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
    margin: 0 0 1rem 0;
  }
`;

const CardTitle = styled.h3`
  font-size: 1.35rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  @media (max-width: 700px) {
    font-size: 1.1rem;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
`;

const CardPlaceholder = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #7c8597;
  font-size: 1.1rem;
  gap: 0.7rem;
`;

const CardIcon = styled.div`
  font-size: 2.7rem;
  color: #7c8597;
`;

const HeaderSection = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto 2.2rem auto;
  padding: 1.5rem 1rem 0 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
`;

const SearchHeaderBar = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 10px;
  padding: 0.7rem 1.2rem;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  position: relative;
`;

const SearchIconStyled = styled(Search)`
  color: #7c8597;
  font-size: 1.5rem !important;
`;

const SearchInputHeader = styled.input`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.15rem;
  outline: none;
  width: 100%;
  margin-left: 12px;
`;

const SuggestionList = styled.ul`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.CARD};
  border: 1.5px solid ${({ theme }) => theme.BORDER};
  border-radius: 0 0 12px 12px;
  box-shadow: 0 8px 32px #0003, 0 1.5px 6px #232a3b22;
  z-index: 10;
  margin: 0;
  padding: 0.1rem 0;
  list-style: none;
  max-height: 260px;
  overflow-y: auto;
`;

const SuggestionItem = styled.li<{active: boolean}>`
  padding: 0.45rem 1.1rem 0.45rem 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  background: ${({ active, theme }) => active ? theme.HOVER_BG : 'transparent'};
  cursor: pointer;
  font-size: 0.98rem;
  display: flex;
  align-items: center;
  border-left: 3.5px solid ${({ active, theme }) => active ? theme.ACCENT : 'transparent'};
  transition: background 0.16s, border-color 0.16s;
  &:hover {
    background: ${({ theme }) => theme.HOVER_BG};
  }
`;

const SuggestionItemRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  width: 100%;
`;

const SuggestionMain = styled.div`
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
`;

const SuggestionTextCol = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const SuggestionAvatar = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #232a3b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: #b0b8d1;
  overflow: hidden;
  border: 1.5px solid #353b4a;
  flex-shrink: 0;
`;

const SuggestionInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  min-width: 0;
`;

const SuggestionName = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.99rem;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
`;

const SuggestionFather = styled.span`
  color: #7c8597;
  font-size: 0.97rem;
  font-weight: 500;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
`;

const SuggestionMetaCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 0;
  margin-left: 1.2rem;
`;

const SuggestionClass = styled.span`
  color: ${({ theme }) => (theme as any).ACCENT};
  font-size: 0.91rem;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90px;
`;

const SuggestionId = styled.span`
  color: #a0a7b8;
  font-size: 0.91rem;
  line-height: 1.1;
  white-space: nowrap;
`;

const CompactHeaderCard = styled(Card)`
  padding: 0.7rem 2.2rem;
  margin-bottom: 2rem;
  max-width: 100%;
  width: 100%;
  margin-left: 0;
  margin-right: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 1.2rem;
  min-height: unset;
  box-sizing: border-box;
`;

const HeaderTitle = styled.div`
  font-size: 1.25rem;
  font-weight: 800;
  color: ${({ theme }) => (theme as any).ACCENT};
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CardStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: auto;
  @media (max-width: 700px) {
    gap: 0.7rem;
    width: 100vw;
    min-width: 0;
    max-width: 100vw;
  }
`;

const StudentInfoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.2rem;
  margin-bottom: 1.5rem;
  padding: 12px 16px;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 10px;
  width: 100%;
  @media (max-width: 700px) {
    flex-direction: row;
    align-items: center;
    gap: 0.7rem;
    padding: 10px 8px;
    margin-bottom: 1rem;
  }
`;

const StudentAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #232a3b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
  color: #b0b8d1;
  overflow: hidden;
  border: 1.5px solid #353b4a;
`;

const StudentInfoTextCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
  
  @media (max-width: 700px) {
    flex: 1 1 0;
    min-width: 0;
  }
`;

const StudentName = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
`;

const StudentFather = styled.span`
  color: #7c8597;
  font-size: 0.92rem;
`;

const StudentInfoMetaCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
  min-width: 0;
  
  @media (max-width: 700px) {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }
`;

const StudentInfoClass = styled.span`
  color: ${({ theme }) => theme.ACCENT};
  font-size: 0.92rem;
  font-weight: 600;
  white-space: nowrap;
  
  @media (max-width: 700px) {
    font-size: 0.85rem;
  }
`;

const StudentInfoId = styled.span`
  color: #7c8597;
  font-size: 0.9rem;
  white-space: nowrap;
  
  @media (max-width: 700px) {
    font-size: 0.8rem;
  }
`;

const StudentInfoMain = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
  
  @media (max-width: 700px) {
    flex: 1 1 0;
    min-width: 0;
    gap: 0.6rem;
  }
`;

const HeaderFlexRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 1.2rem;
`;

const HeaderLeft = styled.div`
  flex: 1 1 0;
  display: flex;
  align-items: center;
  min-width: 0;
`;

const HeaderCenter = styled.div`
  flex: 2 1 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
`;

const HeaderRight = styled.div`
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
`;

const CollectFormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.2rem;
  width: 100%;
  padding: 1.2rem 0;
  margin-top: 0.5rem;
  @media (max-width: 900px) {
    grid-template-columns: 1fr 1fr;
    gap: 0.7rem;
  }
  @media (max-width: 700px) {
    grid-template-columns: 1fr 1fr;
    gap: 0.4rem;
    padding: 0.3rem 0 0 0;
    margin-top: 0;
    align-items: start;
  }
`;

const CollectField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;

  &:nth-child(n+4) {
    margin-top: 0.8rem;
  }

  &:last-child {
    margin-top: 2.25rem;
  }

  @media (max-width: 700px) {
    gap: 0.2rem;
    margin: 0;
    
    &:nth-child(n+4) {
      margin-top: 0;
    }

    &:nth-child(5) {
      grid-column: 1 / -1;
    }

    &:last-child {
      margin-top: 0.3rem;
      grid-column: 1 / -1;
    }
  }
`;

const CollectLabel = styled.label`
  font-size: 0.93rem;
  color: #7c8597;
  font-weight: 500;
  margin-bottom: 0.2rem;
  @media (max-width: 700px) {
    font-size: 0.75rem;
    margin-bottom: 0.05rem;
    line-height: 1.2;
  }
`;

const CollectInput = styled.input`
  width: 100%;
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-radius: 7px;
  padding: 7px 10px;
  font-size: 1.05rem;
  outline: none;
  transition: border 0.15s;
  height: 38px;
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
  }
  @media (max-width: 700px) {
    padding: 4px 6px;
    font-size: 0.85rem;
    height: 30px;
    border-radius: 4px;
    border-width: 1px;
  }
`;

const QuickButtonRow = styled.div`
  display: flex;
  gap: 0.25rem;
  margin-top: 0.18rem;
  justify-content: flex-start;
  flex-wrap: wrap;
`;

const QuickButton = styled.button`
  background: ${({ theme }) => theme.ACCENT};
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 1px 7px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  height: 22px;
  min-width: 36px;
  line-height: 1;
  transition: background 0.15s;
  margin: 0;
  &:hover {
    background: ${({ theme }) => theme.ACCENT_DARK || '#4f46e5'};
  }
`;

const CollectButton = styled.button`
  background: ${({ theme }) => theme.ACCENT};
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0;
  font-size: 1.08rem;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
  height: 38px;
  box-shadow: 0 1px 4px #0000001a;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover {
    background: ${({ theme }) => theme.ACCENT_DARK || '#4f46e5'};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  @media (max-width: 700px) {
    font-size: 0.85rem;
    height: 30px;
    border-radius: 4px;
    gap: 0.3rem;
    box-shadow: 0 1px 2px #0000001a;
  }
`;

const InputWithPrefixWrapper = styled.div`
  position: relative;
  width: 100%;
  
  input {
    @media (max-width: 700px) {
      padding-left: 2rem !important;
    }
  }
`;

const InputPrefix = styled.span`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #7c8597;
  pointer-events: none;
  font-size: 1.05rem;
  @media (max-width: 700px) {
    left: 6px;
    font-size: 0.8rem;
  }
`;

const StyledSelect = styled.select`
  width: 100%;
  height: 38px;
  padding: 7px 10px;
  border-radius: 7px;
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.05rem;
  outline: none;
  transition: border 0.15s;
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
  }
  @media (max-width: 700px) {
    padding: 4px 6px;
    font-size: 0.85rem;
    height: 30px;
    border-radius: 4px;
    border-width: 1px;
  }
`;

const AddIcon = styled.span`
  margin-right: 0.5rem;
`;

// Styled components for the Modal
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  overflow-y: auto;
  padding: 1rem;
  box-sizing: border-box;
`;

const ModalDialog = styled.div`
  background: ${({ theme }) => theme.CARD};
  padding: 2rem 2.5rem;
  border-radius: 12px;
  box-shadow: 0 5px 25px rgba(0,0,0,0.2);
  width: 100%;
  max-width: 450px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  text-align: center;
  @media (max-width: 700px) {
    padding: 1.1rem 0.7rem;
    max-width: 98vw;
    min-width: 0;
  }
`;

const ModalTitle = styled.h4`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.3rem;
  font-weight: 700;
  margin-top: 0;
  margin-bottom: 0.8rem;
`;

const ModalMessage = styled.p`
  color: ${({ theme }) => theme.TEXT_SECONDARY || '#adb5bd'};
  font-size: 1rem;
  margin-bottom: 1.8rem;
  line-height: 1.6;
`;

const ModalButtonRow = styled.div`
  display: flex;
  gap: 0.8rem;
  justify-content: center;
`;

const ModalButton = styled.button<{ primary?: boolean }>`
  padding: 0.6rem 1.5rem;
  border-radius: 7px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;

  ${({ theme, primary }) => primary ? `
    background-color: ${theme.ACCENT_DANGER || '#e53e3e'};
    color: #fff;
    border-color: ${theme.ACCENT_DANGER || '#e53e3e'};
    &:hover {
      background-color: ${theme.ACCENT_DANGER_DARK || '#c53030'};
      border-color: ${theme.ACCENT_DANGER_DARK || '#c53030'};
    }
  ` : `
    background-color: ${theme.BUTTON_SECONDARY_BG || theme.FIELD_BG };
    color: ${theme.TEXT_PRIMARY};
    border: 1px solid ${theme.BUTTON_SECONDARY_BORDER || theme.FIELD_BORDER};
    &:hover {
      background-color: ${theme.BUTTON_SECONDARY_HOVER_BG || theme.HOVER_BG};
      border-color: ${theme.BUTTON_SECONDARY_HOVER_BORDER || theme.ACCENT};
    }
  `}
`;

const FineDetailsContent = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  
  @media (max-width: 700px) {
    .fine-summary {
      order: 2;
      margin-top: 0.5rem;
      margin-bottom: 0;
    }
    
    .fine-table {
      order: 1;
    }
  }
`;

const FineSummaryRow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
  margin-bottom: 0.7rem;
  width: 100%;
  
  @media (max-width: 700px) {
    gap: 0.3rem;
    margin-bottom: 0;
  }
`;

const FineSummaryCard = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.CARD};
  border-radius: 7px;
  box-shadow: 0 1px 4px #0001;
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 0.4rem 0.7rem 0.3rem 0.7rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  min-height: 34px;
  
  @media (max-width: 700px) {
    padding: 0.25rem 0.5rem;
    min-height: 28px;
    border-radius: 5px;
    border-width: 1px;
  }
`;

const FineSummaryLabel = styled.div`
  color: #7c8597;
  font-size: 0.87rem;
  font-weight: 500;
  line-height: 1.1;
  
  @media (max-width: 700px) {
    font-size: 0.75rem;
    font-weight: 600;
  }
`;

const FineSummaryValue = styled.div<{ color?: string }>`
  font-size: 1.01rem;
  font-weight: 800;
  color: ${({ color }) => color || '#a78bfa'};
  line-height: 1.1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.2rem;
  
  @media (max-width: 700px) {
    font-size: 0.85rem;
    font-weight: 700;
    gap: 0.15rem;
    
    svg {
      font-size: 15px !important;
      margin-right: 3px !important;
    }
    
    span {
      font-size: 0.7rem !important;
      margin-right: 3px !important;
    }
    
    .remission-text {
      font-size: 0.7rem !important;
      margin-right: 4px !important;
    }
  }
`;

const AttendanceTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.7rem;
`;

const AttendanceTh = styled.th`
  padding: 0.32rem 0.5rem;
  text-align: left;
  color: #7c8597;
  font-size: 0.91rem;
  font-weight: 700;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.CARD};
  position: sticky;
  top: 0;
  z-index: 2;
`;

const AttendanceTd = styled.td`
  padding: 0.32rem 0.5rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.91rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

// Update the TableWrapper styled component to ensure the scrollbar is visible
const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  max-height: 500px;
  overflow-y: scroll;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.ACCENT}40 ${({ theme }) => theme.BG};
  &::-webkit-scrollbar {
    width: 10px;
    background: ${({ theme }) => theme.BG};
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.ACCENT}80;
    border-radius: 6px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG};
    border-radius: 6px;
  }
  @media (max-width: 700px) {
    border-radius: 10px;
    background: ${({ theme }) => theme.CARD};
    padding-bottom: 0.5rem;
    margin-bottom: 0.5rem;
    min-width: 0;
    box-sizing: border-box;
  }
`;

// Circle spinner loader for search suggestions
const CircleLoader = styled.span`
  display: inline-block;
  margin-left: 0.2rem;
  width: 16px;
  height: 16px;
  vertical-align: middle;
  border: 2px solid ${({ theme }) => theme.ACCENT + '55'};
  border-top: 2px solid ${({ theme }) => theme.ACCENT};
  border-radius: 50%;
  animation: circle-spin 0.7s linear infinite;
  @keyframes circle-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Add a helper to get day short name
function getDayShort(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

// Add styled components for status dropdown and button
const StatusButton = styled.button<{ status: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin: 0 auto;
  top: unset;
  right: unset;
  left: unset;
  bottom: unset;
  padding: clamp(0.08rem, 0.5vw, 0.2rem) clamp(0.4rem, 1vw, 0.8rem);
  border-radius: 999px;
  border: none;
  font-weight: 600;
  font-size: clamp(0.6rem, 1.2vw, 0.75rem);
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${({ status, theme }) => {
    const themeAny = theme as any;
    const isDark = themeAny.BG === '#252525' || themeAny.BG === '#181c2a';
    if (status === 'Leave') {
      return isDark ? 'rgba(37,99,235,0.15)' : '#eff6ff';
    } else if (status === 'late' || status === 'Late') {
      return isDark ? 'rgba(245,158,11,0.15)' : '#fef9e7';
    } else {
      return isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2';
    }
  }};
  color: ${({ status }) => {
    if (status === 'Leave') return '#2563eb';
    if (status === 'late' || status === 'Late') return '#eab308';
    return '#ef4444';
  }};
  border: 1.5px solid ${({ status, theme }) => {
    const themeAny = theme as any;
    const isDark = themeAny.BG === '#252525' || themeAny.BG === '#181c2a';
    if (status === 'Leave') {
      return isDark ? '#2563eb' : '#bfdbfe';
    } else if (status === 'late' || status === 'Late') {
      return isDark ? '#eab308' : '#fde68a';
    } else {
      return isDark ? '#ef4444' : '#fecaca';
    }
  }};
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  @media (max-width: 600px) {
    padding: 0.15rem 0.6rem;
    font-size: 0.7rem;
  }
`;

const StatusDropdown = styled.div<{ direction: 'up' | 'down' }>`
  position: absolute;
  z-index: 1000;
  min-width: 120px;
  max-width: 220px;
  width: max-content;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG === '#252525' || theme.BG === '#181c2a' ? '#2a2a2a' : '#ffffff'};
  color: ${({ theme }) => theme.BG === '#252525' || theme.BG === '#181c2a' ? '#f3f4f6' : '#232a3b'};
  border: 1.5px solid ${({ theme }) => theme.BG === '#252525' || theme.BG === '#181c2a' ? '#353b4a' : '#e5e7eb'};
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1);
  padding: 0.2rem 0;
  display: flex;
  flex-direction: column;
  right: 0;
  ${({ direction }) =>
    direction === 'down'
      ? 'top: calc(100% + 6px);'
      : 'bottom: calc(100% + 6px);'}
`;

const StatusOption = styled.button<{ color: string; separator?: boolean }>`
  background: ${({ theme }) => theme.BG === '#252525' || theme.BG === '#181c2a' ? '#2a2a2a' : '#ffffff'};
  border: none;
  color: ${({ color }) => color};
  font-weight: 600;
  font-size: 0.93rem;
  padding: 0.4rem 1rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
  border-top: ${({ separator }) => separator ? '1px solid #eee' : 'none'};
  margin-top: ${({ separator }) => separator ? '2px' : '0'};
  width: 100%;
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' || theme.BG === '#181c2a' ? '#3a3a3a' : '#f8f9fa'};
  }
`;

// In the StatusDropdown definition, add a new styled component for the date display
const DropdownDate = styled.div`
  font-size: 0.93rem;
  font-weight: 600;
  color: #6366f1;
  background: ${({ theme }) => theme.BG === '#252525' || theme.BG === '#181c2a' ? '#2a2a2a' : '#ffffff'};
  padding: 0.4rem 1rem 0.2rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 0.2rem;
`;


const FineCollection: React.FC = () => {
  const theme = useTheme();
  const themeAny = theme as any;
  const { showToast } = useToast();
  const { user } = useAuth();
  const { setLoading, loading } = useLoading();
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

  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [searchExactMatch, setSearchExactMatch] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const suggestionItemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const isFocusingAmountRef = useRef(false);
  const shouldFocusSearchAfterPaymentRef = useRef(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [attendanceRows, setAttendanceRows] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [remission, setRemission] = useState('');
  const [collectDate, setCollectDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isCollecting, setIsCollecting] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [paymentHistoryError, setPaymentHistoryError] = useState<string | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [justSelectedStudent, setJustSelectedStudent] = useState(false);
  const location = useLocation();
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [dropdownIdx, setDropdownIdx] = useState<number | null>(null);
  const [dropdownDirection, setDropdownDirection] = useState<'up' | 'down'>('up');
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Add status options
  const statusOptions = [
    { value: 'Present', label: 'Present', color: '#22c55e' },
    { value: 'Absent', label: 'Absent', color: '#ef4444' },
    { value: 'Late', label: 'Late', color: '#eab308' },
    { value: 'Leave', label: 'Leave', color: '#2563eb' },
  ];
  const deleteOption = { value: 'DELETE', label: 'Delete', color: '#ef4444' };

  // Calculate fine totals using useMemo for efficiency
  const totalFine = useMemo(() => {
    return attendanceRows.reduce((sum, row) => sum + Number(row.fine || 0), 0);
  }, [attendanceRows]);

  // Total actual cash collected
  const totalActualPaid = useMemo(() => {
    return paymentHistory.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }, [paymentHistory]);

  // Total remission given
  const totalGivenRemission = useMemo(() => {
    return paymentHistory.reduce((sum, payment) => sum + Number(payment.remission || 0), 0);
  }, [paymentHistory]);
  
  // Combined total of actual paid and remission given
  const totalAccountedFor = useMemo(() => {
      return totalActualPaid + totalGivenRemission;
  }, [totalActualPaid, totalGivenRemission]);

  // Remaining fine to be paid
  const remainingFineDisplay = useMemo(() => {
    const remaining = totalFine - totalAccountedFor; // Uses totalAccountedFor
    return remaining > 0 ? remaining : 0; 
  }, [totalFine, totalAccountedFor]);

  // Flag to determine if collection form should be disabled
  const isCollectionDisabled = useMemo(() => {
    // Disable when no student selected or remaining fine is 0
    return !selectedStudent || remainingFineDisplay <= 0;
  }, [selectedStudent, remainingFineDisplay]);

  // Helper function to format currency
  const formatCurrency = (value: number): string => {
    // Check if the value is a whole number
    if (value % 1 === 0) {
      return String(value);
    }
    // Otherwise, format to 2 decimal places
    return value.toFixed(2);
  };


  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      startProgress(false);
      setProgress(10);
      setLoading(true);
      const minDuration = 1500;
      const start = Date.now();
      // Start data fetch and timer in parallel
      const dataPromise = (async () => {
        const [{ data: studentsData }, { data: classesData }, { data: sectionsData }] = await Promise.all([
          supabase.from('students').select('*').eq('status', 'active').eq('school_id', user.school_id),
          supabase.from('classes').select('id, name, has_sections').eq('school_id', user.school_id),
          supabase.from('sections').select('id, name').eq('school_id', user.school_id),
        ]);
        if (studentsData) {
          setStudents(studentsData);
        }
        if (classesData) setClasses(classesData);
        if (sectionsData) setSections(sectionsData);
      })();
      const timerPromise = new Promise(res => setTimeout(res, minDuration));
      await Promise.all([dataPromise, timerPromise]);
      setProgress(100);
      completeProgress();
      if (isMounted) setLoading(false);
    };
    loadAll();
    return () => { isMounted = false; };
  }, [user?.school_id]);

  useEffect(() => {
    const fetchAll = async () => {
      if (!user?.school_id) return;
      const minDuration = 2000;
      const start = Date.now();
      setLoading(true);
      const [studentsData, classesData, sectionsData] = await Promise.all([
        fetchAllRows(async (from, to) => {
          return await supabase.from('students')
            .select('*')
            .eq('status', 'active')
            .eq('school_id', user.school_id)
            .range(from, to);
        }),
        fetchAllRows(async (from, to) => {
          return await supabase.from('classes')
            .select('id, name, has_sections')
            .eq('school_id', user.school_id)
            .range(from, to);
        }),
        fetchAllRows(async (from, to) => {
          return await supabase.from('sections')
            .select('id, name')
            .eq('school_id', user.school_id)
            .range(from, to);
        }),
      ]);
      setStudents(studentsData);
      setClasses(classesData);
      setSections(sectionsData);
      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => setLoading(false), minDuration - elapsed);
      } else {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user?.school_id]);

  // Auto-focus search input on page load (after loading completes)
  useEffect(() => {
    if (!loading && students.length > 0 && !selectedStudent) {
      // Focus search input after page is loaded and no student is selected
      const focusTimer = setTimeout(() => {
        if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
      
      return () => clearTimeout(focusTimer);
    }
  }, [loading, students.length, selectedStudent]);

  useEffect(() => {
    // If navigated with a studentId (can be ID or roll_number sequence), auto-select that student after students are loaded
    if (students.length > 0 && location.state && location.state.studentId) {
      const identifier = location.state.studentId;
      // Try to find by ID first, then by roll_number sequence
      let student = students.find((s: any) => String(s.id) === String(identifier));
      if (!student) {
        // Try to find by roll_number sequence (exact match only)
        for (const s of students) {
          const match = matchesStudentSearch(s, String(identifier));
          if (match.matches && match.score >= 1000) {
            student = s;
            break;
          }
        }
      }
      if (student) {
        handleSelectStudent(student);
      }
    }
    // eslint-disable-next-line
  }, [students, location.state]);

  const handleSelectStudent = (student: any) => {
    // Blur search input first to release focus (important for Enter key)
    if (searchInputRef.current && document.activeElement === searchInputRef.current) {
      searchInputRef.current.blur();
    }
    
    // Update state
    setSearch(student.name);
    setShowSuggestions(false);
    setJustSelectedStudent(true);
    setSearchExactMatch(true);
    setSelectedStudent(student);
    
    // Check if amount field will be disabled (after state updates complete)
    // If disabled, focus search field instead; otherwise focus amount field
    const determineFocus = () => {
      // Check if amount field is disabled (which happens when remaining fine is 0)
      if (amountInputRef.current && amountInputRef.current.disabled) {
        // Field is disabled, focus search field and select its content
        isFocusingAmountRef.current = false; // Don't try to focus amount
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      } else if (amountInputRef.current && !amountInputRef.current.disabled) {
        // Field is enabled, focus amount field
        isFocusingAmountRef.current = true;
        amountInputRef.current.focus();
        if (amountInputRef.current.value) {
          amountInputRef.current.select();
        }
      }
    };
    
    // Wait for state updates and disabled state to be calculated
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        determineFocus();
        // Try again after a delay to catch delayed disabled state updates
        setTimeout(determineFocus, 50);
        setTimeout(determineFocus, 150);
        setTimeout(determineFocus, 300);
        // Final check after all calculations complete
        setTimeout(() => {
          determineFocus();
          // Only clear flag if field is disabled, otherwise keep it for useEffect backup
          if (amountInputRef.current && amountInputRef.current.disabled) {
            isFocusingAmountRef.current = false;
          }
        }, 400);
      });
    });
  };

  // Search effect
  useEffect(() => {
    // If we just selected a student, keep suggestions hidden
    if (justSelectedStudent) {
      setShowSuggestions(false);
      setJustSelectedStudent(false); // Reset the flag
      return;
    }

    // If the search exactly matches the selected student's name or roll number, don't show suggestions
    if (searchExactMatch && selectedStudent) {
      const selectedRollNumber = getStudentDisplayId(selectedStudent);
      if (search === selectedStudent.name || search === String(selectedRollNumber)) {
        setShowSuggestions(false);
        return;
      }
    }

    // If search doesn't match selected student name or roll number anymore, clear the exact match flag
    if (searchExactMatch && selectedStudent) {
      const selectedRollNumber = getStudentDisplayId(selectedStudent);
      if (search !== selectedStudent.name && search !== String(selectedRollNumber)) {
        setSearchExactMatch(false);
      }
    } else if (searchExactMatch && !selectedStudent) {
      setSearchExactMatch(false);
    }

    if (search.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSuggestionsLoading(false);
      return;
    }
    
    setSuggestionsLoading(true);
     
    const searchTerm = search.trim();
    const searchLower = searchTerm.toLowerCase();
    
    // Filter and score students for better sorting - use roll number only (not ID)
    const isNumericSearch = !isNaN(Number(searchLower));
    const searchTermNum = isNumericSearch ? parseInt(searchLower) : null;
    
    const scoredStudents = students
      .map((student) => {
        const studentNameLower = student.name.toLowerCase();
        let score = 0;
        let matches = false;
        
        // Get roll number sequence for search and sorting
        // roll_number format: "S{school_id}-{sequence}" (e.g., "S1-20")
        const sequenceNumber = getSequenceNumber(student.roll_number);
        const sequenceStr = sequenceNumber || '';
        const rollNumberNum = sequenceNumber ? parseInt(sequenceNumber) : Infinity; // Use Infinity for students without roll number so they sort last

        // Check roll number search only (not ID)
        if (isNumericSearch && searchTermNum !== null) {
          // Numeric search - check roll_number sequence only
          if (sequenceStr && sequenceStr === searchLower) {
            score = 1000; // Highest priority for exact roll_number sequence match
            matches = true;
          } else if (sequenceStr && sequenceStr.startsWith(searchLower)) {
            score = 800; // High priority for roll_number sequence starts with
            matches = true;
          } else if (sequenceStr && sequenceStr.includes(searchLower)) {
            score = 600; // Medium priority for roll_number sequence contains
            matches = true;
          }
        } else {
          // Non-numeric search - check roll_number sequence only
          if (sequenceStr && sequenceStr.includes(searchLower)) {
            score = 10;
            matches = true;
          }
        }

        // Name search (only if roll number didn't match)
        if (!matches) {
          if (studentNameLower.startsWith(searchLower)) {
            score = 100; // High priority for name starts with
            matches = true;
          } else if (studentNameLower.includes(searchLower)) {
            score = 50; // Lower priority for name contains
            matches = true;
          }
        }
        
        return matches ? { student, score, rollNumberNum } : null;
      })
      .filter(item => item !== null)
      .sort((a, b) => {
        // First sort by score (higher score first)
        if (b!.score !== a!.score) {
          return b!.score - a!.score;
        }
        // Then sort by roll number numerically ascending (for same score group)
        // This ensures "20" comes before "200", "201", etc.
        return a!.rollNumberNum - b!.rollNumberNum;
      })
      .map(item => item!.student);

    setSuggestions(scoredStudents);
    setShowSuggestions(scoredStudents.length > 0);
    setActiveSuggestion(0);
    setSuggestionsLoading(false);
  }, [search, students, justSelectedStudent, selectedStudent, searchExactMatch]);

  const getClassName = (classId: any) => classes.find((c: any) => String(c.id) === String(classId))?.name || '-';
  const getSectionName = (sectionId: any) => sections.find((s: any) => String(s.id) === String(sectionId))?.name || '';
  const getClassHasSections = (classId: any) => classes.find((c: any) => String(c.id) === String(classId))?.has_sections ?? true;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = Math.min(activeSuggestion + 1, suggestions.length - 1);
      setActiveSuggestion(newIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = Math.max(activeSuggestion - 1, 0);
      setActiveSuggestion(newIndex);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (suggestions[activeSuggestion]) {
        // Call handleSelectStudent directly - it handles blur and focus internally
        // No need to blur here as handleSelectStudent does it
        handleSelectStudent(suggestions[activeSuggestion]);
      }
    }
  };

  // Scroll active suggestion into view when arrow keys are used
  useEffect(() => {
    if (showSuggestions && suggestionItemRefs.current[activeSuggestion]) {
      suggestionItemRefs.current[activeSuggestion]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeSuggestion, showSuggestions]);

  // Scroll active suggestion into view when arrow keys are used
  useEffect(() => {
    if (showSuggestions && suggestionItemRefs.current[activeSuggestion]) {
      suggestionItemRefs.current[activeSuggestion]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeSuggestion, showSuggestions]);

  // Handling suggestions showing/hiding with onFocus
  const handleSearchFocus = () => {
    // Only show suggestions if we don't have an exact match with selected student
    // AND there are actual suggestions available to show
    if (!searchExactMatch && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Handling search input changes to properly track when to show/hide suggestions
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    setSuggestionsLoading(true);
    // If the user modifies the search text and it no longer matches the selected student's name or roll number,
    // clear the exact match flag to allow suggestions to show again
    if (searchExactMatch && selectedStudent) {
      const selectedRollNumber = getStudentDisplayId(selectedStudent);
      if (newValue !== selectedStudent.name && newValue !== String(selectedRollNumber)) {
        setSearchExactMatch(false);
      }
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!selectedStudent) {
      setAttendanceRows([]);
      setAttendanceError(null);
      return;
    }

    const fetchAttendanceAndFines = async () => {
      setAttendanceLoading(true);
      setAttendanceError(null);
      try {
        // 1. Fetch attendance records (absent/late) with pagination
        const attData = await fetchAllRows(async (from, to) => {
          return await supabase
            .from('attendance_records')
            .select('date, status, session_id, class_id')
            .eq('student_id', selectedStudent.id)
            .eq('school_id', user.school_id)
            .in('status', ['absent', 'late'])
            .order('date', { ascending: false })
            .range(from, to);
        });
        
        // 2. Fetch all fine settings for the school with pagination
        const fineData = await fetchAllRows(async (from, to) => {
          return await supabase
            .from('fines')
            .select('class_id, absent_fine, late_fine, effective_from')
            .eq('school_id', user.school_id)
            .order('effective_from', { ascending: true })
            .range(from, to);
        });
        // 3. For each attendance record, find the fine in effect on that date using the class from the record
        const rows = (attData || []).map((rec: any) => {
          // Use the class_id directly from the attendance record (this is the class the student was in when attendance was marked)
          // If class_id is not available in the record (old records), fall back to student's current class
          const classIdFromRecord = rec.class_id || selectedStudent.class_id;
          
          // Find fines for that specific class
          const classFines = fineData?.filter((f: any) => f.class_id === classIdFromRecord) || [];
          
          // Find the latest fine setting with effective_from <= rec.date
          let fine = classFines && classFines.length > 0 ? classFines[0] : null;
          for (const f of classFines) {
            if (f.effective_from <= rec.date) fine = f;
          }
          let fineAmount = 0;
          if (fine) {
            fineAmount = rec.status === 'absent' ? Number(fine.absent_fine) : Number(fine.late_fine);
          }
          
          return {
            date: rec.date,
            status: rec.status,
            fine: fineAmount,
          };
        });
        setAttendanceRows(rows);
      } catch (err: any) {
        setAttendanceError('Failed to fetch attendance or fine data.');
        setAttendanceRows([]);
      } finally {
        setAttendanceLoading(false);
      }
    };
    fetchAttendanceAndFines();
  }, [selectedStudent, user?.school_id]);

  // New useEffect for fetching payment history
  useEffect(() => {
    if (!selectedStudent) {
      setPaymentHistory([]);
      setPaymentHistoryError(null);
      return;
    }

    const fetchPaymentHistoryData = async () => {
      setPaymentHistoryLoading(true);
      setPaymentHistoryError(null);
      try {
        // Helper function to fetch all rows with pagination (handles 1000 row limit)
        const fetchAllRows = async (queryBuilder: any, pageSize: number = 1000): Promise<any[]> => {
          const allData: any[] = [];
          let from = 0;
          let hasMore = true;

          while (hasMore) {
            const to = from + pageSize - 1;
            const { data, error } = await queryBuilder.range(from, to);
            if (error) throw error;
            if (data && data.length > 0) {
              allData.push(...data);
              hasMore = data.length === pageSize;
              from += pageSize;
            } else {
              hasMore = false;
            }
          }
          return allData;
        };

        const paymentsQuery = supabase
          .from('fine_payments')
          .select('*')
          .eq('student_id', selectedStudent.id)
          .eq('school_id', user.school_id)
          .order('payment_date', { ascending: false });

        const data = await fetchAllRows(paymentsQuery);
        setPaymentHistory(data || []);
      } catch (err: any) {
        setPaymentHistoryError('Failed to fetch payment history. ' + (err.message || 'Unknown error'));
        setPaymentHistory([]);
      } finally {
        setPaymentHistoryLoading(false);
      }
    };

    fetchPaymentHistoryData();
  }, [selectedStudent, user?.school_id]);

  // Persistent focus restoration - checks and restores focus if lost during re-renders
  // Also handles case where amount field is disabled (remaining fine = 0) by focusing search
  useEffect(() => {
    // Don't run if we just collected a payment and want to focus search
    if (shouldFocusSearchAfterPaymentRef.current) {
      return;
    }
    
    if (selectedStudent && amountInputRef.current) {
      // Check if field is disabled - if so, focus search field instead
      if (amountInputRef.current.disabled) {
        // Field is disabled (remaining fine is 0), ensure search field has focus
        isFocusingAmountRef.current = false; // Clear flag since we're focusing search
        if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
        return;
      }
      
      // Field is enabled - ensure we're trying to focus it
      // Set flag to true if it's not already set (in case it was cleared by previous disabled student)
      if (!isFocusingAmountRef.current) {
        isFocusingAmountRef.current = true;
      }
      
      // Check and restore focus if needed
      const checkAndRestoreFocus = () => {
        // Don't restore focus if we should be focusing search after payment
        if (shouldFocusSearchAfterPaymentRef.current) {
          return;
        }
        if (amountInputRef.current && 
            !amountInputRef.current.disabled &&
            isFocusingAmountRef.current && 
            document.activeElement !== amountInputRef.current) {
          amountInputRef.current.focus();
        }
      };
      
      // Check at various intervals to catch focus loss
      const timers = [
        setTimeout(checkAndRestoreFocus, 100),
        setTimeout(checkAndRestoreFocus, 200),
        setTimeout(checkAndRestoreFocus, 400),
        setTimeout(() => {
          checkAndRestoreFocus();
          // Clear flag after final check
          isFocusingAmountRef.current = false;
        }, 600)
      ];
      
      return () => {
        timers.forEach(timer => clearTimeout(timer));
      };
    }
  }, [selectedStudent, remainingFineDisplay]);

  const handleCollectPayment = async () => {
    if (!selectedStudent) {
      showToast("Please select a student first.", 'error');
      return;
    }

    const currentAmount = parseFloat(amount || '0'); // Default to 0 if empty
    const currentRemission = parseFloat(remission || '0'); // Default to 0 if empty

    // Better validation with more precise error messages
    if (isNaN(currentAmount) || currentAmount < 0) {
      showToast("Please enter a valid non-negative amount.", 'error');
      return;
    }
    if (isNaN(currentRemission) || currentRemission < 0) {
      showToast("Please enter a valid non-negative remission amount.", 'error');
      return;
    }
    if (currentAmount + currentRemission <= 0) {
      showToast("The total collection (Amount + Remission) must be greater than zero.", 'error');
      return;
    }

    const actualRemainingFine = totalFine - totalAccountedFor;

    // First check if there's any remaining fine at all
    if (actualRemainingFine <= 0) {
      showToast("There is no remaining fine to collect.", 'error');
      return;
    }

    // Then check if the amount exceeds remaining fine
    if ((currentAmount + currentRemission) > actualRemainingFine) {
      showToast(`Collection (Rs. ${formatCurrency(currentAmount + currentRemission)}) exceeds remaining fine (Rs. ${formatCurrency(actualRemainingFine)}).`, 'error');
      return;
    }

    setIsCollecting(true);
    try {
      const paymentRecord = {
        student_id: selectedStudent.id,
        amount: currentAmount,
        remission: currentRemission,
        payment_method: paymentMethod,
        remarks: remarks,
        payment_date: collectDate,
        school_id: user.school_id
      };

      const { data: newPayment, error } = await supabase
        .from('fine_payments')
        .insert([paymentRecord])
        .select(); 

      if (error) {
        showToast("Failed to collect payment: " + error.message, 'error');
        throw error;
      }

      if (newPayment && newPayment.length > 0) {
        setPaymentHistory(prevHistory => [newPayment[0], ...prevHistory]);
        showToast("Payment collected successfully!", 'success');
        setAmount('');
        setRemission('');
        setRemarks('');
        setCollectDate(new Date().toISOString().slice(0, 10));
        
        // After payment is collected, focus back on search and select its content
        // Set flag to prevent useEffect from interfering
        shouldFocusSearchAfterPaymentRef.current = true;
        isFocusingAmountRef.current = false;
        
        // Use requestAnimationFrame to ensure state updates and DOM updates are complete
        // Also blur any currently focused elements first to ensure clean focus transfer
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (searchInputRef.current) {
              searchInputRef.current.focus();
              // Select all content in the search field
              if (searchInputRef.current.value) {
                searchInputRef.current.select();
              }
            }
            // Clear flag after focus is set
            setTimeout(() => {
              shouldFocusSearchAfterPaymentRef.current = false;
            }, 100);
          });
        });
      } else {
        showToast("Payment collected, but failed to retrieve the record. Please refresh.", 'error');
      }

    } catch (err: any) {
      if (!(err.message && err.message.startsWith('Failed to collect payment'))) {
         showToast("An unexpected error occurred while collecting payment.", 'error');
      }
    } finally {
      setIsCollecting(false);
    }
  };

  const confirmActualDelete = async () => {
    if (itemToDeleteId === null) return;
    
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('fine_payments')
        .delete()
        .eq('id', itemToDeleteId)
        .eq('school_id', user.school_id);

      if (error) {
        showToast("Failed to delete payment: " + error.message, 'error');
        throw error;
      }
      setPaymentHistory(prevHistory => prevHistory.filter(p => p.id !== itemToDeleteId));
      showToast("Payment record deleted successfully.", 'success');
    } catch (err: any) {
      if (!(err.message && err.message.startsWith('Failed to delete payment'))) {
        showToast("An unexpected error occurred. Please try again.", 'error');
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmModal(false);
      setItemToDeleteId(null);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    // Instead of window.confirm, show the modal
    setItemToDeleteId(paymentId);
    setShowDeleteConfirmModal(true);
  };

  const cancelDelete = () => {
    setShowDeleteConfirmModal(false);
    setItemToDeleteId(null);
  };

  // Add Enter key handler for delete confirmation
  useEffect(() => {
    if (!showDeleteConfirmModal) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        confirmActualDelete();
      } else if (e.key === 'Escape') {
        cancelDelete();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteConfirmModal]);

  // Handle Enter key press on form inputs to submit payment
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isCollecting) {
      e.preventDefault();
      handleCollectPayment();
    }
  };

  // Fetch current session
  useEffect(() => {
    const fetchCurrentSession = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('id')
          .eq('school_id', user.school_id)
          .eq('is_active', true)
          .single();
        
        if (sessionError) throw sessionError;
        if (sessionData) {
          setSessionId(sessionData.id);
        }
      } catch (err) {
      }
    };
    
    if (user?.school_id) {
      fetchCurrentSession();
    }
  }, [user?.school_id]);

  // Add effect to dismiss dropdown on click outside or scroll
  useEffect(() => {
    if (dropdownIdx === null) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !pillRefs.current[dropdownIdx]?.contains(e.target as Node)
      ) {
        setDropdownIdx(null);
      }
    };
    const handleScroll = () => setDropdownIdx(null);
    document.addEventListener('mousedown', handleClick);
    const tw = document.querySelector('.attendance-table-wrapper');
    if (tw) tw.addEventListener('scroll', handleScroll);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      if (tw) tw.removeEventListener('scroll', handleScroll);
    };
  }, [dropdownIdx]);

  if (!loading && students.length === 0) {
    return <NoStudentsFound />;
  }

  if (loading) {
    return <Loader />;
  }

  return (
    <Container>
      <PageGrid>
        <LeftSection>
          <Card>
            {/* Search Field */}
            <SearchBar ref={inputRef}>
              <SearchIconStyled style={{ color: '#7c8597', fontSize: '1.3rem' }} />
              <SearchInput
                ref={searchInputRef}
                value={search}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                onKeyDown={handleKeyDown}
                placeholder="Search by name or roll number..."
              />
              {/* Show circle loader when suggestions are loading */}
              {suggestionsLoading && <CircleLoader />}
              {showSuggestions && suggestions.length > 0 && (
                <SuggestionList>
                  {suggestions.map((student, idx) => (
                    <SuggestionItem
                      key={student.id}
                      ref={(el) => { suggestionItemRefs.current[idx] = el; }}
                      active={idx === activeSuggestion}
                      onClick={() => handleSelectStudent(student)}
                      onMouseEnter={() => setActiveSuggestion(idx)}
                    >
                      <SuggestionItemRow>
                        <SuggestionMain>
                          <SuggestionAvatar>
                            {student.picture_url ? (
                              <img src={student.picture_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <AccountCircle style={{ fontSize: '1.4rem' }} />
                            )}
                          </SuggestionAvatar>
                          <SuggestionInfo>
                            <SuggestionName>{student.name}</SuggestionName>
                            <SuggestionFather>{student.father_name}</SuggestionFather>
                          </SuggestionInfo>
                        </SuggestionMain>
                        <SuggestionMetaCol>
                          <SuggestionClass>{getClassName(student.class_id)} {getClassHasSections(student.class_id) && getSectionName(student.section_id) ? getSectionName(student.section_id) : ''}</SuggestionClass>
                          <SuggestionId>ID: {getStudentDisplayId(student)}</SuggestionId>
                        </SuggestionMetaCol>
                      </SuggestionItemRow>
                    </SuggestionItem>
                  ))}
                </SuggestionList>
              )}
            </SearchBar>

            {/* Student Info */}
            {selectedStudent && (
              <StudentInfoRow>
                <StudentInfoMain>
                  <StudentAvatar>
                    {selectedStudent.picture_url ? (
                      <img src={selectedStudent.picture_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <AccountCircle style={{ fontSize: '1.6rem' }} />
                    )}
                  </StudentAvatar>
                  <StudentInfoTextCol>
                    <StudentName>{selectedStudent.name}</StudentName>
                    <StudentFather>{selectedStudent.father_name}</StudentFather>
                  </StudentInfoTextCol>
                </StudentInfoMain>
                <StudentInfoMetaCol>
                  <StudentInfoClass>{getClassName(selectedStudent.class_id)} {getClassHasSections(selectedStudent.class_id) && getSectionName(selectedStudent.section_id) ? getSectionName(selectedStudent.section_id) : ''}</StudentInfoClass>
                  <StudentInfoId>ID: {getStudentDisplayId(selectedStudent)}</StudentInfoId>
                </StudentInfoMetaCol>
              </StudentInfoRow>
            )}

            <div style={{ marginTop: '1.5rem' }}>
              <CardTitle><Calculate style={{ color: (theme as any).ACCENT }} /> Fine Details</CardTitle>
              
              {selectedStudent ? (
                <FineDetailsContent>
                  <FineSummaryRow className="fine-summary">
                    <FineSummaryCard>
                      <FineSummaryLabel>Total Fine</FineSummaryLabel>
                      <FineSummaryValue color="#6366f1">
                        <CardGiftcard style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }} /> 
                        Rs. {formatCurrency(totalFine)}
                      </FineSummaryValue>
                    </FineSummaryCard>
                    <FineSummaryCard>
                      <FineSummaryLabel>Paid Amount</FineSummaryLabel>
                      <FineSummaryValue color="#22c55e">
                        {totalGivenRemission > 0 && (
                          <span className="remission-text" style={{ color: '#5a6478', fontWeight: 500, fontSize: '0.97em', marginRight: 8 }}>
                            (Remission: Rs. {formatCurrency(totalGivenRemission)})
                          </span>
                        )}
                        <Paid style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }} />
                        Rs. {formatCurrency(totalActualPaid)}
                      </FineSummaryValue>
                    </FineSummaryCard>
                    <FineSummaryCard>
                      <FineSummaryLabel>Remaining</FineSummaryLabel>
                      <FineSummaryValue color="#f43f5e">
                        <ErrorOutline style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }} /> 
                        Rs. {formatCurrency(remainingFineDisplay)}
                      </FineSummaryValue>
                    </FineSummaryCard>
                  </FineSummaryRow>
                  <TableWrapper className="attendance-table-wrapper fine-table">
                  <AttendanceTable>
                    <thead>
                      <tr>
                        <AttendanceTh>Date</AttendanceTh>
                        <AttendanceTh>Day</AttendanceTh>
                        <AttendanceTh>Status</AttendanceTh>
                        <AttendanceTh>Fine</AttendanceTh>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceLoading ? (
                        <tr><AttendanceTd colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}><Loader size="small" /></AttendanceTd></tr>
                      ) : attendanceError ? (
                        <tr><AttendanceTd colSpan={4}>{attendanceError}</AttendanceTd></tr>
                      ) : attendanceRows.length === 0 ? (
                        <tr><AttendanceTd colSpan={4}>No absent or late records found.</AttendanceTd></tr>
                      ) : (
                        attendanceRows.map((row, idx) => (
                          <tr key={row.date + row.status + idx}>
                            <AttendanceTd>{row.date}</AttendanceTd>
                            <AttendanceTd>{getDayShort(row.date)}</AttendanceTd>
                            <AttendanceTd style={{ position: 'relative', textAlign: 'center', verticalAlign: 'middle' }}>
                              <StatusButton
                                ref={el => (pillRefs.current[idx] = el)}
                                status={row.status}
                                onClick={e => {
                                  const rect = pillRefs.current[idx]?.getBoundingClientRect();
                                  if (rect) {
                                    const viewportHeight = window.innerHeight;
                                    const dropdownHeight = 200;
                                    const spaceBelow = viewportHeight - rect.bottom - 20; // 20px padding from bottom
                                    const spaceAbove = rect.top - 20; // 20px padding from top
                                    
                                    // If not enough space below but enough space above, position above
                                    const shouldPositionAbove = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
                                    
                                    setDropdownDirection(shouldPositionAbove ? 'up' : 'down');
                                    setDropdownPos({
                                      left: rect.left,
                                      top: shouldPositionAbove ? rect.top - 204 : rect.bottom + 4,
                                    });
                                  } else {
                                    setDropdownDirection('down');
                                    setDropdownPos(null);
                                  }
                                  setDropdownIdx(idx);
                                }}
                              >
                              {row.status}
                              </StatusButton>
                              {dropdownIdx === idx && dropdownPos && (
                                ReactDOM.createPortal(
                                  <StatusDropdown
                                    ref={dropdownRef}
                                    direction={dropdownDirection}
                                    style={{
                                      position: 'fixed',
                                      top: dropdownPos.top,
                                      left: dropdownPos.left,
                                      zIndex: 1000,
                                      backgroundColor: (themeAny.BG === '#252525' || themeAny.BG === '#181c2a') ? '#2a2a2a' : '#ffffff',
                                      color: (themeAny.BG === '#252525' || themeAny.BG === '#181c2a') ? '#f3f4f6' : '#232a3b',
                                      boxShadow: '0 4px 24px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)',
                                      border: '1.5px solid',
                                      borderColor: (themeAny.BG === '#252525' || themeAny.BG === '#181c2a') ? '#353b4a' : '#e5e7eb',
                                    }}
                                  >
                                      <DropdownDate>{row.date}</DropdownDate>
                                      {statusOptions.map(opt => (
                                        <StatusOption
                                          key={opt.value}
                                          color={opt.color}
                                          onClick={async () => {
                                            if (!sessionId) {
                                              showToast('Session not available. Please refresh the page.', 'error');
                                              return;
                                            }
                                            try {
                                              const { error } = await supabase
                                                .from('attendance_records')
                                                .upsert([
                                                  {
                                                    student_id: selectedStudent.id,
                                                    class_id: selectedStudent.class_id,
                                                    section_id: getClassHasSections(selectedStudent.class_id) ? selectedStudent.section_id : null,
                                                    session_id: sessionId,
                                                    date: row.date,
                                                    status: opt.value.toLowerCase(),
                                                    school_id: user.school_id
                                                  }
                                                ], { onConflict: 'student_id,date,session_id' });
                                              if (error) throw error;
                                              // If status is 'leave' or 'present', remove the row, else update in place
                                              if (['leave', 'present'].includes(opt.value.toLowerCase())) {
                                                setAttendanceRows(prevRows => prevRows.filter((_, i) => i !== idx));
                                              } else {
                                                setAttendanceRows(prevRows =>
                                                  prevRows.map((r, i) => i === idx ? { ...r, status: opt.value.toLowerCase() } : r)
                                                );
                                              }
                                              showToast('Status updated.', 'success');
                                              // Refetch attendance and fine data to refresh all loaded data
                                              if (selectedStudent) {
                                                setAttendanceLoading(true);
                                                setAttendanceError(null);
                                                try {
                                                  // Helper function to fetch all rows with pagination (handles 1000 row limit)
                                                  const fetchAllRows = async (queryBuilder: any, pageSize: number = 1000): Promise<any[]> => {
                                                    const allData: any[] = [];
                                                    let from = 0;
                                                    let hasMore = true;

                                                    while (hasMore) {
                                                      const to = from + pageSize - 1;
                                                      const { data, error } = await queryBuilder.range(from, to);
                                                      if (error) throw error;
                                                      if (data && data.length > 0) {
                                                        allData.push(...data);
                                                        hasMore = data.length === pageSize;
                                                        from += pageSize;
                                                      } else {
                                                        hasMore = false;
                                                      }
                                                    }
                                                    return allData;
                                                  };

                                                  // Fetch attendance records with pagination
                                                  const attendanceQuery = supabase
                                                    .from('attendance_records')
                                                    .select('date, status, session_id')
                                                    .eq('student_id', selectedStudent.id)
                                                    .eq('school_id', user.school_id)
                                                    .in('status', ['absent', 'late'])
                                                    .order('date', { ascending: false });
                                                  
                                                  const attData = await fetchAllRows(attendanceQuery);
                                                  
                                                  // Fetch fines with pagination
                                                  const finesQuery = supabase
                                                    .from('fines')
                                                    .select('absent_fine, late_fine, effective_from')
                                                    .eq('class_id', selectedStudent.class_id)
                                                    .eq('school_id', user.school_id)
                                                    .order('effective_from', { ascending: true });
                                                  
                                                  const fineData = await fetchAllRows(finesQuery);
                                                  const rows = (attData || []).map((rec: any) => {
                                                    let fine = fineData && fineData.length > 0 ? fineData[0] : null;
                                                    for (const f of fineData) {
                                                      if (f.effective_from <= rec.date) fine = f;
                                                    }
                                                    let fineAmount = 0;
                                                    if (fine) {
                                                      fineAmount = rec.status === 'absent' ? Number(fine.absent_fine) : Number(fine.late_fine);
                                                    }
                                                    return {
                                                      date: rec.date,
                                                      status: rec.status,
                                                      fine: fineAmount,
                                                    };
                                                  });
                                                  setAttendanceRows(rows);
                                                } catch (err: any) {
                                                  setAttendanceError('Failed to fetch attendance or fine data.');
                                                  setAttendanceRows([]);
                                                } finally {
                                                  setAttendanceLoading(false);
                                                }
                                              }
                                            } catch (err) {
                                              showToast('Failed to update status.', 'error');
                                            }
                                            setDropdownIdx(null);
                                          }}
                                        >
                                          {opt.label}
                                        </StatusOption>
                                      ))}
                                      <StatusOption
                                        color={deleteOption.color}
                                        separator
                                        onClick={async () => {
                                          try {
                                            const { error } = await supabase
                                              .from('attendance_records')
                                              .delete()
                                              .eq('student_id', selectedStudent.id)
                                              .eq('date', row.date)
                                              .eq('school_id', user.school_id);
                                            if (error) throw error;
                                            // Remove the row from local state
                                            setAttendanceRows(prevRows => prevRows.filter((_, i) => i !== idx));
                                            showToast('Attendance record removed.', 'success');
                                          } catch (err) {
                                            showToast('Failed to remove attendance record.', 'error');
                                          }
                                          setDropdownIdx(null);
                                        }}
                                      >
                                        {deleteOption.label}
                                      </StatusOption>
                                    </StatusDropdown>,
                                    document.body
                                  )
                              )}
                            </AttendanceTd>
                            <AttendanceTd>Rs. {row.fine}</AttendanceTd>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </AttendanceTable>
                  </TableWrapper>
                </FineDetailsContent>
              ) : (
                <CardPlaceholder>
                  <CardIcon><MonetizationOn style={{ fontSize: '3.2rem' }} /></CardIcon>
                  Select a student to view fine details
                </CardPlaceholder>
              )}
            </div>
          </Card>
        </LeftSection>

        <CardStack>
          <Card>
            <CardTitle><Payment style={{ color: (theme as any).ACCENT }} /> Collect Payment</CardTitle>
            {selectedStudent ? (
              <CollectFormGrid>
                {/* Amount Field */}
                <CollectField>
                  <CollectLabel>Amount</CollectLabel>
                  <InputWithPrefixWrapper>
                    <InputPrefix>Rs.</InputPrefix>
                    <CollectInput
                      ref={amountInputRef}
                      type="tel"
                      value={amount}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      name="amount-input"
                      data-form-type="other"
                      onChange={e => {
                        // Only allow integers
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setAmount(val);
                      }}
                      onFocus={() => {
                        // Clear the focusing flag when field actually receives focus
                        if (isFocusingAmountRef.current) {
                          // Don't clear immediately, wait a bit to ensure focus sticks
                          setTimeout(() => {
                            if (document.activeElement === amountInputRef.current) {
                              isFocusingAmountRef.current = false;
                            }
                          }, 100);
                        }
                      }}
                      placeholder="0.00"
                      style={{ paddingLeft: '2.8rem' }}
                      onKeyDown={e => {
                        if (["e", "E", "+", "-", "."].includes(e.key)) {
                          e.preventDefault();
                        }
                        handleFormKeyDown(e);
                      }}
                      disabled={isCollectionDisabled}
                    />
                  </InputWithPrefixWrapper>
                </CollectField>

                {/* Remission Field */}
                <CollectField>
                  <CollectLabel>Remission</CollectLabel>
                  <InputWithPrefixWrapper>
                    <InputPrefix>Rs.</InputPrefix>
                    <CollectInput
                      type="tel"
                      value={remission}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      name="remission-input"
                      data-form-type="other"
                      onChange={e => {
                        // Only allow integers
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setRemission(val);
                      }}
                      placeholder="0.00"
                      style={{ paddingLeft: '2.8rem' }}
                      onKeyDown={e => {
                        if (["e", "E", "+", "-", "."].includes(e.key)) {
                          e.preventDefault();
                        }
                        handleFormKeyDown(e);
                      }}
                      disabled={isCollectionDisabled}
                    />
                  </InputWithPrefixWrapper>
                </CollectField>

                {/* Date Field */}
                <CollectField>
                  <CollectLabel>Collection Date</CollectLabel>
                  <CollectInput
                    className="standalone" 
                    type="date"
                    value={collectDate}
                    onChange={e => setCollectDate(e.target.value)}
                    onKeyDown={handleFormKeyDown}
                    disabled={isCollectionDisabled}
                  />
                </CollectField>

                {/* Payment Method Field */}
                <CollectField>
                  <CollectLabel>Payment Method</CollectLabel>
                  <StyledSelect 
                    value={paymentMethod} 
                    onChange={e => setPaymentMethod(e.target.value)}
                    disabled={isCollectionDisabled}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Online">Online</option>
                    <option value="Other">Other</option>
                  </StyledSelect>
                </CollectField>

                {/* Remarks Field */}
                <CollectField>
                  <CollectLabel>Remarks</CollectLabel>
                  <CollectInput
                    className="standalone" 
                    type="text"
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="Optional notes"
                    onKeyDown={handleFormKeyDown}
                    disabled={isCollectionDisabled}
                  />
                </CollectField>

                {/* Collect Button Field */}
                <CollectField>
                  <CollectButton
                    type="button"
                    onClick={handleCollectPayment}
                    disabled={isCollecting || isCollectionDisabled}
                  >
                    {isCollecting ? 'Collecting...' : (
                      <>
                        <AddIcon /> Collect
                      </>
                    )}
                  </CollectButton>
                </CollectField>
              </CollectFormGrid>
            ) : (
              <CardPlaceholder style={{ minHeight: '120px' }}>
                <CardIcon><Payment style={{ fontSize: '3.2rem' }} /></CardIcon>
                Select a student to collect payment
              </CardPlaceholder>
            )}
          </Card>
          <Card>
            <CardTitle><History style={{ color: (theme as any).ACCENT }} /> Payment History</CardTitle>
            {selectedStudent ? (
              paymentHistoryLoading ? (
                <CardPlaceholder style={{ minHeight: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Loader size="small" /></CardPlaceholder>
              ) : paymentHistoryError ? (
                <CardPlaceholder style={{ minHeight: '120px', color: 'red' }}>{paymentHistoryError}</CardPlaceholder>
              ) : paymentHistory.length > 0 ? (
                <TableWrapper>
                  <AttendanceTable style={{ marginTop: '0.5rem', minWidth: 600 }}>
                  <thead>
                    <tr>
                      <AttendanceTh>Date</AttendanceTh>
                      <AttendanceTh>Day</AttendanceTh>
                      <AttendanceTh>Amount</AttendanceTh>
                      <AttendanceTh>Remission</AttendanceTh>
                      <AttendanceTh>Method</AttendanceTh>
                      <AttendanceTh>Remarks</AttendanceTh>
                      <AttendanceTh>Action</AttendanceTh>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((payment: any, idx: number) => (
                      <tr key={payment.id || idx}>
                        <AttendanceTd>{new Date(payment.payment_date).toLocaleDateString()}</AttendanceTd>
                        <AttendanceTd>{getDayShort(payment.payment_date)}</AttendanceTd>
                        <AttendanceTd>Rs. {payment.amount}</AttendanceTd>
                        <AttendanceTd>Rs. {payment.remission || 0}</AttendanceTd>
                        <AttendanceTd>{payment.payment_method}</AttendanceTd>
                        <AttendanceTd>{payment.remarks || '-'}</AttendanceTd>
                        <AttendanceTd>
                          <DeleteIcon
                            style={{ cursor: 'pointer', color: '#f43f5e', fontSize: '1.2rem' }}
                            onClick={() => handleDeletePayment(payment.id)}
                          />
                        </AttendanceTd>
                      </tr>
                    ))}
                  </tbody>
                </AttendanceTable>
                </TableWrapper>
              ) : (
                <CardPlaceholder style={{ minHeight: '120px' }}>No payment history found for this student.</CardPlaceholder>
              )
            ) : (
              <CardPlaceholder style={{ minHeight: '120px' }}>
                <CardIcon><History style={{ fontSize: '3.2rem' }} /></CardIcon>
                Select a student to view payment history
              </CardPlaceholder>
            )}
          </Card>
        </CardStack>
      </PageGrid>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && ReactDOM.createPortal(
        <ModalOverlay onClick={cancelDelete}> {/* Optional: close on overlay click */}
          <ModalDialog onClick={(e) => e.stopPropagation()}> {/* Prevents closing when clicking inside dialog */}
            <ModalTitle>Confirm Deletion</ModalTitle>
            <ModalMessage>
              Are you sure you want to delete this payment record? This action cannot be undone.
            </ModalMessage>
            <ModalButtonRow>
              <ModalButton onClick={cancelDelete} disabled={isDeleting}>Cancel</ModalButton>
              <ModalButton 
                primary 
                onClick={confirmActualDelete} 
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Payment'}
              </ModalButton>
            </ModalButtonRow>
          </ModalDialog>
        </ModalOverlay>,
        document.body
      )}
    </Container>
  );
};

export default FineCollection; 