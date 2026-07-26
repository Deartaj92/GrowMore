import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import styled, { useTheme } from 'styled-components';
import { 
  Save, 
  MonetizationOn, 
  Calculate, 
  Payment, 
  History, 
  Search, 
  AccountCircle, 
  CardGiftcard, 
  Paid, 
  ErrorOutline, 
  DeleteOutline as DeleteIcon, 
  Edit, 
  Info,
  CheckCircle,
  AccountBalanceWallet,
  ReceiptLong,
  Person
} from '@mui/icons-material';
import { Skeleton } from '@mui/material';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import { useLocation } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import NoStudentsFound from '../components/NoStudentsFound';
import { useProgress } from '../components/Layout';
import { fetchAllRows } from '../utils/paginationHelper';
import { formatAppDate } from '../utils/dateUtils';
import AppDateField from '../components/shared/AppDateField';
import Loader from '../components/Loader';
import { getStudentDisplayId, matchesStudentSearch, fetchStudentByIdentifier, getSequenceNumber } from '../utils/studentUtils';

/* ── EXACT THEME STYLED COMPONENTS & MAXIMUM SPACE UTILIZATION ── */

const Container = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 0.6rem 0.4rem;
  }
`;

const PageGrid = styled.div`
  display: grid;
  grid-template-columns: 390px 1fr;
  gap: 1.2rem;
  align-items: start;
  min-height: calc(100vh - 160px);

  @media (max-width: 1024px) {
    grid-template-columns: 350px 1fr;
    gap: 1rem;
  }
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const LeftSection = styled.div`
  position: sticky;
  top: 1rem;
  height: 100%;
  @media (max-width: 900px) {
    position: static;
    width: 100%;
  }
`;

const RightSection = styled.div`
  flex: 1;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 14px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 1.25rem 1.4rem;
  display: flex;
  flex-direction: column;
  position: relative;
  box-sizing: border-box;
  width: 100%;
  transition: border-color 0.15s ease;

  @media (max-width: 700px) {
    padding: 0.85rem 0.95rem;
    border-radius: 10px;
  }
`;

const CardTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ theme }) => (theme as any).ACCENT};
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;

  svg {
    font-size: 1.3rem;
  }

  @media (max-width: 700px) {
    font-size: 1.05rem;
    margin-bottom: 0.75rem;
  }
`;

const CardPlaceholder = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #7c8597;
  font-size: 0.95rem;
  font-weight: 500;
  gap: 0.6rem;
  padding: 2rem 1rem;
  text-align: center;
`;

const CardIcon = styled.div`
  font-size: 2.5rem;
  color: #7c8597;
  display: flex;
  align-items: center;
  justify-content: center;
`;

/* Search Bar */
const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 9px;
  padding: 6px 12px;
  width: 100%;
  margin-bottom: 1rem;
  position: relative;
  transition: border-color 0.15s;
  box-sizing: border-box;
  
  &:focus-within {
    border-color: ${({ theme }) => (theme as any).ACCENT};
  }
`;

const SearchInput = styled.input`
  border: none !important;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  outline: none !important;
  width: 100%;
  margin-left: 8px;
  box-shadow: none !important;
  
  &::placeholder {
    color: #7c8597;
  }
`;

const SearchIconStyled = styled(Search)`
  color: #7c8597;
  font-size: 1.3rem !important;
`;

const SuggestionList = styled.ul`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.CARD};
  border: 1.5px solid ${({ theme }) => theme.BORDER};
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  z-index: 100;
  margin: 0;
  padding: 0.3rem 0;
  list-style: none;
  max-height: 260px;
  overflow-y: auto;
`;

const SuggestionItem = styled.li<{ active: boolean }>`
  padding: 0.5rem 0.85rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  background: ${({ active, theme }) => active ? theme.HOVER_BG : 'transparent'};
  cursor: pointer;
  font-size: 0.92rem;
  display: flex;
  align-items: center;
  border-left: 3px solid ${({ active, theme }) => active ? (theme as any).ACCENT : 'transparent'};
  transition: background 0.15s, border-color 0.15s;
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
  gap: 0.65rem;
  min-width: 0;
`;

const SuggestionAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #232a3b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
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
  font-size: 0.92rem;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
`;

const SuggestionFather = styled.span`
  color: #7c8597;
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
`;

const SuggestionMetaCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 0;
  margin-left: 0.8rem;
`;

const SuggestionClass = styled.span`
  color: ${({ theme }) => (theme as any).ACCENT};
  font-size: 0.85rem;
  font-weight: 700;
  white-space: nowrap;
`;

const SuggestionId = styled.span`
  color: #a0a7b8;
  font-size: 0.78rem;
  white-space: nowrap;
`;

/* Selected Student Banner */
const StudentInfoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  margin-bottom: 1rem;
  padding: 8px 12px;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 9px;
  width: 100%;
  box-sizing: border-box;
`;

const StudentInfoMain = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
`;

const StudentAvatar = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #232a3b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
  color: #b0b8d1;
  overflow: hidden;
  border: 1.5px solid #353b4a;
  flex-shrink: 0;
`;

const StudentInfoTextCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
`;

const StudentName = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  line-height: 1.1;
`;

const StudentFather = styled.span`
  color: #7c8597;
  font-size: 0.82rem;
`;

const StudentInfoMetaCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.1rem;
  flex-shrink: 0;
`;

const StudentInfoClass = styled.span`
  color: ${({ theme }) => (theme as any).ACCENT};
  font-size: 0.88rem;
  font-weight: 700;
  white-space: nowrap;
`;

const StudentInfoId = styled.span`
  color: #7c8597;
  font-size: 0.8rem;
  white-space: nowrap;
`;

/* Fine Details Section */
const FineDetailsContent = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const FineSummaryColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-bottom: 0.85rem;
  width: 100%;
`;

const FineSummaryCard = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.CARD};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 0.45rem 0.75rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  min-height: 34px;
  box-sizing: border-box;
`;

const FineSummaryLabel = styled.div`
  color: #7c8597;
  font-size: 0.85rem;
  font-weight: 500;
`;

const FineSummaryValue = styled.div<{ color?: string }>`
  font-size: 0.98rem;
  font-weight: 800;
  color: ${({ color }) => color || '#a78bfa'};
  display: flex;
  align-items: center;
  gap: 0.3rem;

  svg {
    font-size: 1.05rem !important;
  }
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => (theme as any).ACCENT + '55'} transparent;

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => (theme as any).ACCENT + '77'};
    border-radius: 6px;
  }
`;

const AttendanceTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const AttendanceTh = styled.th`
  padding: 0.5rem 0.75rem;
  text-align: left;
  color: #7c8597;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.CARD};
  position: sticky;
  top: 0;
  z-index: 2;
`;

const AttendanceTd = styled.td`
  padding: 0.5rem 0.75rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.88rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

/* Right Section Collection Form */
const CardStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  width: 100%;
`;

const CollectFormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.85rem;
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
  }
`;

const CollectField = styled.div<{ $fullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  width: 100%;
  grid-column: ${({ $fullWidth }) => ($fullWidth ? '1 / -1' : 'span 1')};

  @media (max-width: 600px) {
    &:nth-child(5) {
      grid-column: 1 / -1;
    }
    &:last-child {
      grid-column: 1 / -1;
    }
  }
`;

const CollectLabel = styled.label`
  font-size: 0.82rem;
  color: #7c8597;
  font-weight: 600;
`;

const InputWithPrefixWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const InputPrefix = styled.span`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #7c8597;
  pointer-events: none;
  font-size: 0.9rem;
  font-weight: 600;
`;

const CollectInput = styled.input`
  width: 100%;
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.15s;
  height: 38px;
  box-sizing: border-box;

  &:focus {
    border-color: ${({ theme }) => (theme as any).ACCENT};
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const StyledSelect = styled.select`
  width: 100%;
  height: 38px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;

  &:focus {
    border-color: ${({ theme }) => (theme as any).ACCENT};
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const CollectButton = styled.button`
  background: ${({ theme }) => (theme as any).ACCENT};
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 0 1rem;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
  height: 38px;
  transition: background-color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;

  &:hover:not(:disabled) {
    background: ${({ theme }) => (theme as any).ACCENT_DARK || '#4f46e5'};
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

/* Status Button & Dropdowns */
const StatusButton = styled.button<{ status: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.15rem 0.65rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.75rem;
  cursor: pointer;
  transition: transform 0.15s;
  background: ${({ status, theme }) => {
    const isDark = theme.BG === '#252525' || theme.BG === '#181c2a';
    if (status === 'Leave' || status === 'leave') return isDark ? 'rgba(37,99,235,0.18)' : '#eff6ff';
    if (status === 'late' || status === 'Late') return isDark ? 'rgba(245,158,11,0.18)' : '#fef9e7';
    return isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2';
  }};
  color: ${({ status }) => {
    if (status === 'Leave' || status === 'leave') return '#3b82f6';
    if (status === 'late' || status === 'Late') return '#f59e0b';
    return '#ef4444';
  }};
  border: 1.2px solid ${({ status, theme }) => {
    const isDark = theme.BG === '#252525' || theme.BG === '#181c2a';
    if (status === 'Leave' || status === 'leave') return isDark ? '#2563eb' : '#bfdbfe';
    if (status === 'late' || status === 'Late') return isDark ? '#eab308' : '#fde68a';
    return isDark ? '#ef4444' : '#fecaca';
  }};

  &:hover {
    transform: scale(1.04);
  }
`;

const StatusDropdown = styled.div<{ direction: 'up' | 'down' }>`
  position: absolute;
  z-index: 1000;
  min-width: 130px;
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border: 1.5px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
  padding: 0.25rem 0;
  display: flex;
  flex-direction: column;
`;

const StatusOption = styled.button<{ color: string; separator?: boolean }>`
  background: transparent;
  border: none;
  color: ${({ color }) => color};
  font-weight: 600;
  font-size: 0.85rem;
  padding: 0.4rem 0.85rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
  border-top: ${({ separator, theme }) => separator ? `1px solid ${theme.BORDER}` : 'none'};

  &:hover {
    background: ${({ theme }) => theme.HOVER_BG};
  }
`;

const DropdownDate = styled.div`
  font-size: 0.82rem;
  font-weight: 700;
  color: ${({ theme }) => (theme as any).ACCENT};
  padding: 0.35rem 0.85rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  margin-bottom: 0.2rem;
`;

/* Special Fines */
const SpecialFinesSection = styled.div`
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px dashed ${({ theme }) => theme.BORDER};
`;

const SpecialFineEntry = styled.div`
  padding: 0.55rem 0.75rem;
  background: ${({ theme }) => theme.FIELD_BG};
  border-left: 3px solid #3b82f6;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SpecialFineInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex: 1;
`;

const SpecialFineDescription = styled.div`
  font-size: 0.85rem;
  color: #3b82f6;
  font-weight: 600;
`;

const SpecialFineAmount = styled.div`
  font-size: 0.92rem;
  color: #3b82f6;
  font-weight: 700;
  white-space: nowrap;
  margin-left: 0.8rem;
`;

const SpecialFineActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.8rem;
`;

const SpecialFineIconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0.3rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-radius: 4px;
  transition: background 0.15s;
  &:hover {
    background: ${({ theme }) => theme.HOVER_BG};
  }
`;

/* Modals */
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
  padding: 1rem;
  box-sizing: border-box;
`;

const ModalDialog = styled.div`
  background: ${({ theme }) => theme.CARD};
  padding: 1.6rem 1.8rem;
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  width: 100%;
  max-width: 420px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  text-align: center;
`;

const ModalTitle = styled.h4`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.2rem;
  font-weight: 700;
  margin-top: 0;
  margin-bottom: 0.75rem;
`;

const ModalMessage = styled.p`
  color: #7c8597;
  font-size: 0.92rem;
  margin-bottom: 1.4rem;
  line-height: 1.5;
`;

const ModalButtonRow = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: center;
`;

const ModalButton = styled.button<{ primary?: boolean }>`
  padding: 0.55rem 1.3rem;
  border-radius: 7px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background-color 0.15s;

  ${({ theme, primary }) => primary ? `
    background-color: #ef4444;
    color: #fff;
    &:hover { background-color: #dc2626; }
  ` : `
    background-color: ${theme.FIELD_BG};
    color: ${theme.TEXT_PRIMARY};
    border-color: ${theme.FIELD_BORDER};
    &:hover { background-color: ${theme.HOVER_BG}; }
  `}
`;

const ModalFormRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 0.85rem;
  text-align: left;
`;

const CircleLoader = styled.span`
  display: inline-block;
  margin-left: 0.2rem;
  width: 16px;
  height: 16px;
  vertical-align: middle;
  border: 2px solid ${({ theme }) => ((theme as any).ACCENT || '#6366f1') + '55'};
  border-top: 2px solid ${({ theme }) => (theme as any).ACCENT || '#6366f1'};
  border-radius: 50%;
  animation: circle-spin 0.7s linear infinite;
  @keyframes circle-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

function getDayShort(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/* ── SKELETON LOADERS ── */

const TableRowSkeleton: React.FC<{ columns: number }> = ({ columns }) => (
  <>
    {Array.from({ length: 4 }).map((_, rIdx) => (
      <tr key={rIdx}>
        {Array.from({ length: columns }).map((_, cIdx) => (
          <AttendanceTd key={cIdx}>
            <Skeleton
              variant="text"
              animation="wave"
              height={22}
              sx={{
                bgcolor: (theme: any) =>
                  theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                borderRadius: '4px',
              }}
            />
          </AttendanceTd>
        ))}
      </tr>
    ))}
  </>
);

const PageSkeleton: React.FC = () => {
  return (
    <Container>
      <PageGrid>
        <LeftSection>
          <Card>
            <Skeleton variant="rectangular" height={38} sx={{ borderRadius: '9px', mb: 2 }} animation="wave" />
            <Skeleton variant="rectangular" height={52} sx={{ borderRadius: '9px', mb: 2 }} animation="wave" />
            <Skeleton variant="text" width={140} height={28} sx={{ mb: 1.5 }} animation="wave" />
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} variant="rectangular" height={34} sx={{ borderRadius: '8px', mb: 1 }} animation="wave" />
            ))}
            <Skeleton variant="rectangular" height={150} sx={{ borderRadius: '8px', mt: 1.5 }} animation="wave" />
          </Card>
        </LeftSection>
        <RightSection>
          <CardStack>
            <Card>
              <Skeleton variant="text" width={160} height={28} sx={{ mb: 2 }} animation="wave" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <Skeleton key={idx} variant="rectangular" height={38} sx={{ borderRadius: '8px' }} animation="wave" />
                ))}
              </div>
            </Card>
            <Card>
              <Skeleton variant="text" width={160} height={28} sx={{ mb: 2 }} animation="wave" />
              <Skeleton variant="rectangular" height={130} sx={{ borderRadius: '8px' }} animation="wave" />
            </Card>
          </CardStack>
        </RightSection>
      </PageGrid>
    </Container>
  );
};

/* ── MAIN COMPONENT ── */

const FineCollection: React.FC = () => {
  const theme = useTheme();
  const themeAny = theme as any;
  const { showToast } = useToast();
  const { user } = useAuth();
  const { setLoading, loading } = useLoading();
  const { startProgress, setProgress, completeProgress } = useProgress();
  
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
  const [specialFinesForStudent, setSpecialFinesForStudent] = useState<any[]>([]);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingSpecialFineId, setEditingSpecialFineId] = useState<number | null>(null);
  const [specialFineEditDescription, setSpecialFineEditDescription] = useState('');
  const [specialFineEditAmount, setSpecialFineEditAmount] = useState('');
  const [showSpecialFineEditModal, setShowSpecialFineEditModal] = useState(false);
  const [showSpecialFineDeleteConfirmModal, setShowSpecialFineDeleteConfirmModal] = useState(false);
  const [specialFineToDeleteId, setSpecialFineToDeleteId] = useState<number | null>(null);
  const [isSavingSpecialFineEdit, setIsSavingSpecialFineEdit] = useState(false);
  const [isDeletingSpecialFine, setIsDeletingSpecialFine] = useState(false);
  const [justSelectedStudent, setJustSelectedStudent] = useState(false);
  const location = useLocation();
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [dropdownIdx, setDropdownIdx] = useState<number | null>(null);
  const [dropdownDirection, setDropdownDirection] = useState<'up' | 'down'>('up');
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const statusOptions = [
    { value: 'Present', label: 'Present', color: '#22c55e' },
    { value: 'Absent', label: 'Absent', color: '#ef4444' },
    { value: 'Late', label: 'Late', color: '#eab308' },
    { value: 'Leave', label: 'Leave', color: '#2563eb' },
  ];
  const deleteOption = { value: 'DELETE', label: 'Delete', color: '#ef4444' };

  const totalFine = useMemo(() => {
    return attendanceRows.reduce((sum, row) => sum + Number(row.fine || 0), 0);
  }, [attendanceRows]);

  const totalSpecialForStudent = useMemo(() => {
    return specialFinesForStudent.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  }, [specialFinesForStudent]);

  const totalSpecialPaidForStudent = useMemo(() => {
    return specialFinesForStudent.reduce((sum, s) => sum + Number(s.paid_amount || 0), 0);
  }, [specialFinesForStudent]);

  const totalActualPaid = useMemo(() => {
    return paymentHistory.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }, [paymentHistory]);

  const totalGivenRemission = useMemo(() => {
    return paymentHistory.reduce((sum, payment) => sum + Number(payment.remission || 0), 0);
  }, [paymentHistory]);
  
  const totalAccountedFor = useMemo(() => {
      return totalActualPaid + totalGivenRemission;
  }, [totalActualPaid, totalGivenRemission]);

  const remainingFineDisplay = useMemo(() => {
    const combinedTotal = totalFine + totalSpecialForStudent;
    const combinedAccounted = totalAccountedFor + totalSpecialPaidForStudent;
    const remaining = combinedTotal - combinedAccounted;
    return remaining > 0 ? remaining : 0;
  }, [totalFine, totalAccountedFor, totalSpecialForStudent, totalSpecialPaidForStudent]);

  const isCollectionDisabled = useMemo(() => {
    return !selectedStudent || remainingFineDisplay <= 0;
  }, [selectedStudent, remainingFineDisplay]);

  const hasCollectionAfterSpecialFine = (fine: any) => {
    if (!fine?.created_at) return false;
    const fineCreatedAt = new Date(fine.created_at);
    return paymentHistory.some((payment: any) => {
      if (!payment?.payment_date) return false;
      const paymentDate = new Date(payment.payment_date);
      return paymentDate > fineCreatedAt;
    });
  };

  const handleEditSpecialFine = (fine: any) => {
    setEditingSpecialFineId(fine.id);
    setSpecialFineEditDescription(fine.description || '');
    setSpecialFineEditAmount(String(fine.amount || ''));
    setShowSpecialFineEditModal(true);
  };

  const cancelEditSpecialFine = () => {
    setShowSpecialFineEditModal(false);
    setEditingSpecialFineId(null);
    setSpecialFineEditDescription('');
    setSpecialFineEditAmount('');
  };

  const saveSpecialFineEdit = async () => {
    if (!editingSpecialFineId || !user?.school_id) return;
    if (!specialFineEditDescription.trim()) {
      showToast('Please enter a special fine description.', 'error');
      return;
    }
    const amountValue = Number(parseFloat(specialFineEditAmount || '0').toFixed(2));
    if (!amountValue || amountValue <= 0) {
      showToast('Please enter a valid amount.', 'error');
      return;
    }

    setIsSavingSpecialFineEdit(true);
    try {
      const { data, error } = await supabase
        .from('special_fines')
        .update({
          description: specialFineEditDescription.trim(),
          amount: amountValue,
        })
        .eq('id', editingSpecialFineId)
        .eq('school_id', user.school_id)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setSpecialFinesForStudent(prev => prev.map(fine => fine.id === editingSpecialFineId ? { ...fine, ...data[0] } : fine));
        showToast('Special fine updated successfully.', 'success');
      } else {
        showToast('Special fine updated, but failed to refresh the row.', 'warning');
      }
      cancelEditSpecialFine();
    } catch (err: any) {
      showToast('Failed to update special fine: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsSavingSpecialFineEdit(false);
    }
  };

  const handleDeleteSpecialFine = (fine: any) => {
    setSpecialFineToDeleteId(fine.id);
    setShowSpecialFineDeleteConfirmModal(true);
  };

  const cancelDeleteSpecialFine = () => {
    setShowSpecialFineDeleteConfirmModal(false);
    setSpecialFineToDeleteId(null);
  };

  const confirmDeleteSpecialFine = async () => {
    if (!specialFineToDeleteId || !user?.school_id) return;
    setIsDeletingSpecialFine(true);
    try {
      const { error } = await supabase
        .from('special_fines')
        .delete()
        .eq('id', specialFineToDeleteId)
        .eq('school_id', user.school_id);

      if (error) throw error;
      setSpecialFinesForStudent(prev => prev.filter(fine => fine.id !== specialFineToDeleteId));
      showToast('Special fine deleted successfully.', 'success');
    } catch (err: any) {
      showToast('Failed to delete special fine: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsDeletingSpecialFine(false);
      cancelDeleteSpecialFine();
    }
  };

  const formatCurrency = (value: number): string => {
    if (value % 1 === 0) {
      return String(value);
    }
    return value.toFixed(2);
  };

  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      startProgress(false);
      setProgress(10);
      setLoading(true);
      const minDuration = 1200;
      const start = Date.now();
      const dataPromise = (async () => {
        const [{ data: studentsData }, { data: classesData }, { data: sectionsData }] = await Promise.all([
          supabase.from('students').select('*').eq('status', 'active').eq('school_id', user.school_id),
          supabase.from('classes').select('id, name, has_sections').eq('school_id', user.school_id),
          supabase.from('sections').select('id, name').eq('school_id', user.school_id),
        ]);
        if (studentsData) setStudents(studentsData);
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
    if (!loading && students.length > 0 && !selectedStudent) {
      const focusTimer = setTimeout(() => {
        if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(focusTimer);
    }
  }, [loading, students.length, selectedStudent]);

  useEffect(() => {
    if (students.length > 0 && location.state && location.state.studentId) {
      const identifier = location.state.studentId;
      let student = students.find((s: any) => String(s.id) === String(identifier));
      if (!student) {
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
  }, [students, location.state]);

  const handleSelectStudent = (student: any) => {
    if (searchInputRef.current && document.activeElement === searchInputRef.current) {
      searchInputRef.current.blur();
    }
    
    setSearch(student.name);
    setShowSuggestions(false);
    setJustSelectedStudent(true);
    setSearchExactMatch(true);
    setSelectedStudent(student);
    
    const determineFocus = () => {
      if (amountInputRef.current && amountInputRef.current.disabled) {
        isFocusingAmountRef.current = false;
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      } else if (amountInputRef.current && !amountInputRef.current.disabled) {
        isFocusingAmountRef.current = true;
        amountInputRef.current.focus();
        if (amountInputRef.current.value) {
          amountInputRef.current.select();
        }
      }
    };
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        determineFocus();
        setTimeout(determineFocus, 50);
        setTimeout(determineFocus, 150);
        setTimeout(determineFocus, 300);
        setTimeout(() => {
          determineFocus();
          if (amountInputRef.current && amountInputRef.current.disabled) {
            isFocusingAmountRef.current = false;
          }
        }, 400);
      });
    });
  };

  useEffect(() => {
    if (justSelectedStudent) {
      setShowSuggestions(false);
      setJustSelectedStudent(false);
      return;
    }

    if (searchExactMatch && selectedStudent) {
      const selectedRollNumber = getStudentDisplayId(selectedStudent);
      if (search === selectedStudent.name || search === String(selectedRollNumber)) {
        setShowSuggestions(false);
        return;
      }
    }

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
    const isNumericSearch = !isNaN(Number(searchLower));
    const searchTermNum = isNumericSearch ? parseInt(searchLower) : null;
    
    const scoredStudents = students
      .map((student) => {
        const studentNameLower = student.name.toLowerCase();
        let score = 0;
        let matches = false;
        
        const sequenceNumber = getSequenceNumber(student.roll_number);
        const sequenceStr = sequenceNumber || '';
        const rollNumberNum = sequenceNumber ? parseInt(sequenceNumber) : Infinity;

        if (isNumericSearch && searchTermNum !== null) {
          if (sequenceStr && sequenceStr === searchLower) {
            score = 1000;
            matches = true;
          } else if (sequenceStr && sequenceStr.startsWith(searchLower)) {
            score = 800;
            matches = true;
          } else if (sequenceStr && sequenceStr.includes(searchLower)) {
            score = 600;
            matches = true;
          }
        } else {
          if (sequenceStr && sequenceStr.includes(searchLower)) {
            score = 10;
            matches = true;
          }
        }

        if (!matches) {
          if (studentNameLower.startsWith(searchLower)) {
            score = 100;
            matches = true;
          } else if (studentNameLower.includes(searchLower)) {
            score = 50;
            matches = true;
          }
        }
        
        return matches ? { student, score, rollNumberNum } : null;
      })
      .filter(item => item !== null)
      .sort((a, b) => {
        if (b!.score !== a!.score) return b!.score - a!.score;
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
        handleSelectStudent(suggestions[activeSuggestion]);
      }
    }
  };

  useEffect(() => {
    if (showSuggestions && suggestionItemRefs.current[activeSuggestion]) {
      suggestionItemRefs.current[activeSuggestion]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeSuggestion, showSuggestions]);

  const handleSearchFocus = () => {
    if (!searchExactMatch && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    setSuggestionsLoading(true);
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
        
        const fineData = await fetchAllRows(async (from, to) => {
          return await supabase
            .from('fines')
            .select('class_id, absent_fine, late_fine, effective_from')
            .eq('school_id', user.school_id)
            .order('effective_from', { ascending: true })
            .range(from, to);
        });

        const rows = (attData || []).map((rec: any) => {
          const classIdFromRecord = rec.class_id || selectedStudent.class_id;
          const classFines = fineData?.filter((f: any) => String(f.class_id) === String(classIdFromRecord)) || [];
          
          let applicableFine = null;
          for (const f of classFines) {
            if (f.effective_from <= rec.date) {
              applicableFine = f;
            }
          }
          let fineAmount = 0;
          if (applicableFine) {
            fineAmount = rec.status === 'absent' ? Number(applicableFine.absent_fine || 0) : Number(applicableFine.late_fine || 0);
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
        try {
          const { data: sdata, error: sError } = await supabase
            .from('special_fines')
            .select('id, amount, paid_amount, status, description, created_at')
            .eq('student_id', selectedStudent.id)
            .eq('school_id', user.school_id);
          if (!sError) setSpecialFinesForStudent(sdata || []);
        } catch (err) {
          setSpecialFinesForStudent([]);
        }
      } catch (err: any) {
        setPaymentHistoryError('Failed to fetch payment history. ' + (err.message || 'Unknown error'));
        setPaymentHistory([]);
      } finally {
        setPaymentHistoryLoading(false);
      }
    };

    fetchPaymentHistoryData();
  }, [selectedStudent, user?.school_id]);

  useEffect(() => {
    if (shouldFocusSearchAfterPaymentRef.current) return;
    
    if (selectedStudent && amountInputRef.current) {
      if (amountInputRef.current.disabled) {
        isFocusingAmountRef.current = false;
        if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
        return;
      }
      
      if (!isFocusingAmountRef.current) {
        isFocusingAmountRef.current = true;
      }
      
      const checkAndRestoreFocus = () => {
        if (shouldFocusSearchAfterPaymentRef.current) return;
        if (amountInputRef.current && 
            !amountInputRef.current.disabled &&
            isFocusingAmountRef.current && 
            document.activeElement !== amountInputRef.current) {
          amountInputRef.current.focus();
        }
      };
      
      const timers = [
        setTimeout(checkAndRestoreFocus, 100),
        setTimeout(checkAndRestoreFocus, 200),
        setTimeout(checkAndRestoreFocus, 400),
        setTimeout(() => {
          checkAndRestoreFocus();
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

    const currentAmount = parseFloat(amount || '0');
    const currentRemission = parseFloat(remission || '0');

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

    const actualRemainingFine = (totalFine + totalSpecialForStudent) - (totalAccountedFor + totalSpecialPaidForStudent);

    if (actualRemainingFine <= 0) {
      showToast("There is no remaining fine to collect.", 'error');
      return;
    }

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
        
        shouldFocusSearchAfterPaymentRef.current = true;
        isFocusingAmountRef.current = false;
        
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (searchInputRef.current) {
              searchInputRef.current.focus();
              if (searchInputRef.current.value) {
                searchInputRef.current.select();
              }
            }
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
    setItemToDeleteId(paymentId);
    setShowDeleteConfirmModal(true);
  };

  const cancelDelete = () => {
    setShowDeleteConfirmModal(false);
    setItemToDeleteId(null);
  };

  useEffect(() => {
    if (!showDeleteConfirmModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') confirmActualDelete();
      else if (e.key === 'Escape') cancelDelete();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteConfirmModal]);

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isCollecting) {
      e.preventDefault();
      handleCollectPayment();
    }
  };

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
        if (sessionData) setSessionId(sessionData.id);
      } catch (err) {}
    };
    
    if (user?.school_id) fetchCurrentSession();
  }, [user?.school_id]);

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
    return <PageSkeleton />;
  }

  return (
    <Container>
      <PageGrid>
        {/* LEFT COLUMN */}
        <LeftSection>
          <Card>
            {/* Search Field */}
            <SearchBar ref={inputRef}>
              <SearchIconStyled />
              <SearchInput
                ref={searchInputRef}
                value={search}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                onKeyDown={handleKeyDown}
                placeholder="Search student by name or roll number..."
              />
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
                              <AccountCircle style={{ fontSize: '1.2rem' }} />
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

            {/* Selected Student Banner */}
            {selectedStudent && (
              <StudentInfoRow>
                <StudentInfoMain>
                  <StudentAvatar>
                    {selectedStudent.picture_url ? (
                      <img src={selectedStudent.picture_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <AccountCircle style={{ fontSize: '1.4rem' }} />
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

            <div>
              <CardTitle>
                <Calculate /> Fine Details
              </CardTitle>
              
              {selectedStudent ? (
                <FineDetailsContent>
                  <FineSummaryColumn>
                    <FineSummaryCard>
                      <FineSummaryLabel>Total Fine</FineSummaryLabel>
                      <FineSummaryValue color="#a78bfa">
                        <CardGiftcard style={{ fontSize: 16 }} />
                        Rs. {formatCurrency(totalFine)}
                      </FineSummaryValue>
                    </FineSummaryCard>

                    <FineSummaryCard>
                      <FineSummaryLabel>
                        Paid Amount {totalGivenRemission > 0 && <span style={{ fontSize: '0.78rem', color: '#7c8597', fontWeight: 400 }}>(Remission: Rs. {formatCurrency(totalGivenRemission)})</span>}
                      </FineSummaryLabel>
                      <FineSummaryValue color="#4ade80">
                        <Paid style={{ fontSize: 16 }} />
                        Rs. {formatCurrency(totalActualPaid)}
                      </FineSummaryValue>
                    </FineSummaryCard>

                    <FineSummaryCard>
                      <FineSummaryLabel>Special Fine</FineSummaryLabel>
                      <FineSummaryValue color="#a78bfa">
                        <CardGiftcard style={{ fontSize: 16 }} />
                        Rs. {formatCurrency(totalSpecialForStudent - totalSpecialPaidForStudent)}
                      </FineSummaryValue>
                    </FineSummaryCard>

                    <FineSummaryCard>
                      <FineSummaryLabel>Remaining</FineSummaryLabel>
                      <FineSummaryValue color="#f43f5e">
                        <ErrorOutline style={{ fontSize: 16 }} />
                        Rs. {formatCurrency(remainingFineDisplay)}
                      </FineSummaryValue>
                    </FineSummaryCard>
                  </FineSummaryColumn>

                  <TableWrapper className="attendance-table-wrapper">
                    <AttendanceTable>
                      <thead>
                        <tr>
                          <AttendanceTh>Date</AttendanceTh>
                          <AttendanceTh>Day</AttendanceTh>
                          <AttendanceTh style={{ textAlign: 'center' }}>Status</AttendanceTh>
                          <AttendanceTh style={{ textAlign: 'right' }}>Fine</AttendanceTh>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceLoading ? (
                          <TableRowSkeleton columns={4} />
                        ) : attendanceError ? (
                          <tr><AttendanceTd colSpan={4} style={{ color: '#ef4444' }}>{attendanceError}</AttendanceTd></tr>
                        ) : attendanceRows.length === 0 ? (
                          <tr><AttendanceTd colSpan={4} style={{ textAlign: 'center', color: '#7c8597', padding: '1.5rem 0' }}>No absent or late records found.</AttendanceTd></tr>
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
                                      const spaceBelow = viewportHeight - rect.bottom - 20;
                                      const spaceAbove = rect.top - 20;
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
                                              if (['leave', 'present'].includes(opt.value.toLowerCase())) {
                                                setAttendanceRows(prevRows => prevRows.filter((_, i) => i !== idx));
                                              } else {
                                                setAttendanceRows(prevRows =>
                                                  prevRows.map((r, i) => i === idx ? { ...r, status: opt.value.toLowerCase() } : r)
                                                );
                                              }
                                              showToast('Status updated.', 'success');
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
                              <AttendanceTd style={{ textAlign: 'right', fontWeight: 700, color: '#f43f5e' }}>
                                Rs. {row.fine}
                              </AttendanceTd>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </AttendanceTable>
                  </TableWrapper>

                  {specialFinesForStudent.length > 0 && (
                    <SpecialFinesSection>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: themeAny.TEXT_PRIMARY, marginBottom: '0.5rem' }}>
                        Special Fines
                      </div>
                      {specialFinesForStudent.map((fine, idx) => {
                        const canDelete = !hasCollectionAfterSpecialFine(fine);
                        return (
                          <SpecialFineEntry key={fine.id || idx}>
                            <SpecialFineInfo>
                              <SpecialFineDescription>
                                {fine.description?.trim() ? fine.description : 'Special fine'}
                              </SpecialFineDescription>
                              <span style={{ fontSize: '0.75rem', color: '#7c8597', marginTop: '0.1rem' }}>{formatAppDate(fine.created_at)}</span>
                            </SpecialFineInfo>
                            <SpecialFineActions>
                              <SpecialFineAmount>
                                Rs. {formatCurrency(fine.amount || 0)}
                              </SpecialFineAmount>
                              <SpecialFineIconButton
                                type="button"
                                title="Edit special fine"
                                onClick={() => handleEditSpecialFine(fine)}
                              >
                                <Edit style={{ fontSize: '0.95rem', color: (themeAny as any).ACCENT }} />
                              </SpecialFineIconButton>
                              {canDelete && (
                                <SpecialFineIconButton
                                  type="button"
                                  title="Delete special fine"
                                  onClick={() => handleDeleteSpecialFine(fine)}
                                >
                                  <DeleteIcon style={{ fontSize: '0.95rem', color: '#ef4444' }} />
                                </SpecialFineIconButton>
                              )}
                            </SpecialFineActions>
                          </SpecialFineEntry>
                        );
                      })}
                    </SpecialFinesSection>
                  )}
                </FineDetailsContent>
              ) : (
                <CardPlaceholder>
                  <CardIcon><MonetizationOn /></CardIcon>
                  Select a student to view fine details
                </CardPlaceholder>
              )}
            </div>
          </Card>
        </LeftSection>

        {/* RIGHT COLUMN */}
        <RightSection>
          <CardStack>
            {/* Collect Payment Form */}
            <Card>
              <CardTitle>
                <Payment /> Collect Payment
              </CardTitle>
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
                        autoComplete="new-password"
                        name="amount-input"
                        data-form-type="other"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        spellCheck="false"
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setAmount(val);
                        }}
                        onFocus={() => {
                          if (isFocusingAmountRef.current) {
                            setTimeout(() => {
                              if (document.activeElement === amountInputRef.current) {
                                isFocusingAmountRef.current = false;
                              }
                            }, 100);
                          }
                        }}
                        placeholder="0.00"
                        style={{ paddingLeft: '2.5rem' }}
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
                        autoComplete="new-password"
                        name="remission-input"
                        data-form-type="other"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        spellCheck="false"
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setRemission(val);
                        }}
                        placeholder="0.00"
                        style={{ paddingLeft: '2.5rem' }}
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

                  {/* Collection Date Field */}
                  <CollectField>
                    <CollectLabel>Collection Date</CollectLabel>
                    <AppDateField
                      value={collectDate}
                      onChange={e => setCollectDate(e.target.value)}
                      disabled={isCollectionDisabled}
                      textFieldProps={{
                        InputLabelProps: { shrink: true },
                        autoComplete: 'new-password',
                        onKeyDown: handleFormKeyDown,
                        inputProps: {
                          'data-form-type': 'other',
                          'data-lpignore': 'true',
                          'data-1p-ignore': 'true',
                        },
                      }}
                    />
                  </CollectField>

                  {/* Payment Method Field */}
                  <CollectField>
                    <CollectLabel>Payment Method</CollectLabel>
                    <StyledSelect 
                      value={paymentMethod} 
                      autoComplete="new-password"
                      data-form-type="other"
                      data-lpignore="true"
                      data-1p-ignore="true"
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
                      type="text"
                      value={remarks}
                      autoComplete="new-password"
                      data-form-type="other"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      spellCheck="false"
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
                          <Paid style={{ fontSize: '1.15rem' }} /> Collect
                        </>
                      )}
                    </CollectButton>
                  </CollectField>
                </CollectFormGrid>
              ) : (
                <CardPlaceholder style={{ minHeight: '120px' }}>
                  <CardIcon><Payment /></CardIcon>
                  Select a student to collect payment
                </CardPlaceholder>
              )}
            </Card>

            {/* Payment History Table Card */}
            <Card>
              <CardTitle>
                <History /> Payment History
              </CardTitle>
              {selectedStudent ? (
                paymentHistoryLoading ? (
                  <TableWrapper>
                    <AttendanceTable style={{ minWidth: 550 }}>
                      <thead>
                        <tr>
                          <AttendanceTh>Date</AttendanceTh>
                          <AttendanceTh>Day</AttendanceTh>
                          <AttendanceTh>Amount</AttendanceTh>
                          <AttendanceTh>Remission</AttendanceTh>
                          <AttendanceTh>Method</AttendanceTh>
                          <AttendanceTh>Remarks</AttendanceTh>
                          <AttendanceTh style={{ textAlign: 'center' }}>Action</AttendanceTh>
                        </tr>
                      </thead>
                      <tbody>
                        <TableRowSkeleton columns={7} />
                      </tbody>
                    </AttendanceTable>
                  </TableWrapper>
                ) : paymentHistoryError ? (
                  <CardPlaceholder style={{ minHeight: '120px', color: '#ef4444' }}>{paymentHistoryError}</CardPlaceholder>
                ) : paymentHistory.length > 0 ? (
                  <TableWrapper>
                    <AttendanceTable style={{ minWidth: 550 }}>
                      <thead>
                        <tr>
                          <AttendanceTh>Date</AttendanceTh>
                          <AttendanceTh>Day</AttendanceTh>
                          <AttendanceTh>Amount</AttendanceTh>
                          <AttendanceTh>Remission</AttendanceTh>
                          <AttendanceTh>Method</AttendanceTh>
                          <AttendanceTh>Remarks</AttendanceTh>
                          <AttendanceTh style={{ textAlign: 'center' }}>Action</AttendanceTh>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentHistory.map((payment: any, idx: number) => (
                          <tr key={payment.id || idx}>
                            <AttendanceTd>{formatAppDate(payment.payment_date)}</AttendanceTd>
                            <AttendanceTd>{getDayShort(payment.payment_date)}</AttendanceTd>
                            <AttendanceTd style={{ fontWeight: 700, color: '#4ade80' }}>Rs. {payment.amount}</AttendanceTd>
                            <AttendanceTd style={{ fontWeight: 600, color: '#7c8597' }}>Rs. {payment.remission || 0}</AttendanceTd>
                            <AttendanceTd>{payment.payment_method}</AttendanceTd>
                            <AttendanceTd style={{ color: '#7c8597' }}>{payment.remarks || '-'}</AttendanceTd>
                            <AttendanceTd style={{ textAlign: 'center' }}>
                              <DeleteIcon
                                style={{ cursor: 'pointer', color: '#f43f5e', fontSize: '1.15rem' }}
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
                  <CardIcon><History /></CardIcon>
                  Select a student to view payment history
                </CardPlaceholder>
              )}
            </Card>
          </CardStack>
        </RightSection>
      </PageGrid>

      {/* Modals */}
      {showSpecialFineEditModal && ReactDOM.createPortal(
        <ModalOverlay onClick={cancelEditSpecialFine}>
          <ModalDialog onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Edit Special Fine</ModalTitle>
            <ModalFormRow>
              <CollectLabel>Description</CollectLabel>
              <CollectInput
                value={specialFineEditDescription}
                onChange={e => setSpecialFineEditDescription(e.target.value)}
              />
            </ModalFormRow>
            <ModalFormRow>
              <CollectLabel>Amount</CollectLabel>
              <CollectInput
                value={specialFineEditAmount}
                onChange={e => setSpecialFineEditAmount(e.target.value)}
                inputMode="decimal"
              />
            </ModalFormRow>
            <ModalButtonRow>
              <ModalButton onClick={cancelEditSpecialFine} disabled={isSavingSpecialFineEdit}>Cancel</ModalButton>
              <ModalButton
                primary
                onClick={saveSpecialFineEdit}
                disabled={isSavingSpecialFineEdit}
              >
                {isSavingSpecialFineEdit ? 'Saving...' : 'Save'}
              </ModalButton>
            </ModalButtonRow>
          </ModalDialog>
        </ModalOverlay>,
        document.body
      )}

      {showDeleteConfirmModal && ReactDOM.createPortal(
        <ModalOverlay onClick={cancelDelete}>
          <ModalDialog onClick={(e) => e.stopPropagation()}>
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

      {showSpecialFineDeleteConfirmModal && ReactDOM.createPortal(
        <ModalOverlay onClick={cancelDeleteSpecialFine}>
          <ModalDialog onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Confirm Delete Special Fine</ModalTitle>
            <ModalMessage>
              Are you sure you want to delete this special fine? This action cannot be undone.
            </ModalMessage>
            <ModalButtonRow>
              <ModalButton onClick={cancelDeleteSpecialFine} disabled={isDeletingSpecialFine}>Cancel</ModalButton>
              <ModalButton
                primary
                onClick={confirmDeleteSpecialFine}
                disabled={isDeletingSpecialFine}
              >
                {isDeletingSpecialFine ? 'Deleting...' : 'Delete'}
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
