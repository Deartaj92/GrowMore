import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { FamilyRestroom, Search as SearchIcon, People as PeopleIcon, Info as InfoIcon } from '@mui/icons-material';
import { CircularProgress, Button, Checkbox, TextField, FormControl, InputLabel, Select, MenuItem, Box, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Divider } from '@mui/material';
import { supabase } from '../supabaseClient';
import { fetchAllRows } from '../utils/paginationHelper';
import { useAuth } from '../contexts/AuthContext';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { getStudentDisplayId } from '../utils/studentUtils';
import { useToast } from '../components/useToast';

const PageContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: ${({ theme }) => theme.BG};
  padding: 0.75rem;
  padding-bottom: 2rem;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  position: relative;

  @media (max-width: 768px) {
    padding: 0.4rem;
    padding-bottom: 2rem;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding: 0.6rem 0.8rem;
  background: ${({ theme }) => theme.CARD};
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.6rem;
    align-items: stretch;
    padding: 0.6rem 0.7rem;
  }
`;

const Title = styled.h1`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;

  @media (max-width: 768px) {
    font-size: 1.1rem;
    text-align: center;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
  min-width: 280px;
  z-index: 1001;

  @media (max-width: 768px) {
    min-width: auto;
    width: 100%;
  }
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  outline: none;
  width: 100%;
  margin-left: 0.4rem;

  &::placeholder {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
  }
`;

const SuggestionsDropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 6px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  z-index: 1002;
  max-height: 240px;
  overflow-y: auto;
  width: 100%;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BORDER};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.TEXT_SECONDARY};
  }

  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.BORDER} ${({ theme }) => theme.BG};
`;
const SuggestionItem = styled.div<{ $isActive?: boolean }>`
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.12s ease;
  background: ${({ $isActive, theme }) => $isActive ? theme.BG : 'transparent'};

  &:hover {
    background: ${({ theme }) => theme.BG};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const SuggestionAvatar = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: ${({ theme }) => theme.ACCENT};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.65rem;
  flex-shrink: 0;
`;

const SuggestionInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const SuggestionName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.8rem;
  margin-bottom: 0.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SuggestionDetails = styled.div`
  font-size: 0.65rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.25rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 0.9rem;

    & > div:first-child {
      order: 2;
    }

    & > div:last-child {
      order: 1;
    }
  }
`;

const Card = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 1rem;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;

  @media (max-width: 768px) {
    padding: 0.9rem;
    overflow: hidden;
  }
`;

const CardTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 0.45rem;
`;

const TableWrapper = styled.div`
  flex: 1;
  max-height: 360px;
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 6px;

  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.BORDER} transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG};
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BORDER};
    border-radius: 4px;
    border: 1px solid ${({ theme }) => theme.BG};
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.TEXT_SECONDARY};
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.thead`
  background: ${({ theme }) => theme.FIELD_BG};
  position: sticky;
  top: 0;
  z-index: 1;
`;

const TableRow = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};

  &:last-child {
    border-bottom: none;
  }
`;

const TableHeaderCell = styled.th`
  padding: 0.6rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  border-right: 1px solid ${({ theme }) => theme.BORDER};

  &:last-child {
    border-right: none;
  }
`;

const TableCell = styled.td`
  padding: 0.6rem;
  font-size: 0.82rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-right: 1px solid ${({ theme }) => theme.BORDER};

  &:last-child {
    border-right: none;
  }
`;

const FamilyInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const FamilyAvatar = styled.div<{ $bg: string }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${({ $bg }) => $bg};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.05rem;
  font-weight: 700;
  overflow: hidden;
`;

const FamilyDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const FamilyName = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 0.2rem;
`;

const FamilyInfoText = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-bottom: 0.2rem;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  gap: 0.6rem;
  border: 1px dashed ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.FIELD_BG};
`;

const FlipSwitchContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  margin: 0.4rem 0 0.75rem 0;
`;

const FlipSwitch = styled.div`
  --card-width: 140px;
  --card-height: 40px;
  --switch-bg: ${({ theme }) => theme.FIELD_BG};
  --switch-border-color: ${({ theme }) => theme.BORDER};
  --text-color: ${({ theme }) => theme.TEXT_PRIMARY};
  --inactive-text-color: ${({ theme }) => theme.TEXT_SECONDARY};
  --icon-shadow-color: rgba(0, 0, 0, 0.25);
  --card-bg: linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.06));
  --highlight-color: ${({ theme }) => theme.ACCENT};

  position: relative;
  display: flex;
  width: calc(var(--card-width) * 2);
  height: var(--card-height);
  background: var(--switch-bg);
  border-radius: 999px;
  border: 1px solid var(--switch-border-color);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  perspective: 1000px;

  input[type='radio'] {
    display: none;
  }

  .switch-button {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    cursor: pointer;
    z-index: 2;
    color: var(--inactive-text-color);
    transition: all 0.25s ease;
    -webkit-tap-highlight-color: transparent;
    position: relative;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .switch-button svg {
    width: 16px;
    height: 16px;
    transition: transform 0.25s ease, filter 0.25s ease;
    filter: drop-shadow(0 1px 2px var(--icon-shadow-color));
  }

  .switch-button:hover {
    color: var(--text-color);
  }

  .switch-button:hover svg {
    transform: translateY(-1px);
    filter: drop-shadow(0 2px 4px var(--icon-shadow-color));
  }

  #switch-opt-1:checked ~ [for='switch-opt-1'],
  #switch-opt-2:checked ~ [for='switch-opt-2'] {
    color: var(--text-color);
    text-shadow: 0 0 6px rgba(0, 0, 0, 0.2);
  }

  .switch-card {
    position: absolute;
    top: 2px;
    left: 2px;
    width: var(--card-width);
    height: calc(var(--card-height) - 4px);
    z-index: 1;
    transform-style: preserve-3d;
  }

  .card-face {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 999px;
    background: var(--card-bg);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }

  .card-back {
    transform: rotateY(180deg);
  }

  #switch-opt-2:checked ~ .switch-card {
    animation: flipRight 0.5s cubic-bezier(0.76, 0, 0.24, 1) forwards;
  }

  #switch-opt-1:checked ~ .switch-card {
    animation: flipLeft 0.5s cubic-bezier(0.76, 0, 0.24, 1) forwards;
  }

  @keyframes flipRight {
    0% {
      transform: translateX(0%) rotateY(0deg);
    }
    50% {
      transform: translateX(50%) rotateY(90deg) scale(1.02);
    }
    100% {
      transform: translateX(100%) rotateY(180deg) scale(1);
    }
  }

  @keyframes flipLeft {
    0% {
      transform: translateX(100%) rotateY(180deg);
    }
    50% {
      transform: translateX(50%) rotateY(90deg) scale(1.02);
    }
    100% {
      transform: translateX(0%) rotateY(0deg) scale(1);
    }
  }
`;

const StudentTableHeaderCell = styled(TableHeaderCell)`
  text-align: center;
`;

const StudentTableCell = styled(TableCell)`
  text-align: center;
`;

const FormFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const FormRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const FormButton = styled.div`
  margin-top: 0.75rem;
`;

const FamilyFeeCollection: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const { user } = useAuth();
  const themeObj = theme === 'dark' ? darkTheme : lightTheme;
  const toast = useToast();

  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<any>(null);
  const [loadingFamilies, setLoadingFamilies] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [studentClassMap, setStudentClassMap] = useState<Map<number, { className?: string; sectionName?: string }>>(new Map());
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [familySummary, setFamilySummary] = useState<Array<{
    student: any;
    totalChallan: number;
    totalArrear: number;
    totalPaid: number;
    totalDue: number;
    remaining: number;
  }>>([]);
  const [collectionMode, setCollectionMode] = useState<'family' | 'student'>('family');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentPayMap, setStudentPayMap] = useState<Record<number, string>>({});

  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountTypes, setAccountTypes] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isCollecting, setIsCollecting] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPlan, setConfirmPlan] = useState<any>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const formatCurrency = (value: number): string => {
    if (value % 1 === 0) return String(value);
    return value.toFixed(2);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getFamilyDisplayId = (familyId: number): string => {
    if (!user?.school_id) return String(familyId);
    return `F${user.school_id}-${familyId}`;
  };

  const stringToColor = (str: string) => {
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
  };

  const fetchActiveSession = async () => {
    if (!user?.school_id) return;
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('id, is_active')
      .eq('school_id', user.school_id);

    if (sessionsData) {
      const active = sessionsData.find((s: any) => s.is_active);
      setActiveSessionId(active?.id ?? null);
    }
  };

  const fetchFamilies = async () => {
    if (!user?.school_id) return;
    setLoadingFamilies(true);
    const { data, error } = await supabase
      .from('families')
      .select(`*, family_members (id, student_id, student:students (*))`)
      .eq('school_id', user.school_id)
      .order('name', { ascending: true });

    if (!error && data) {
      setFamilies(data);
    }
    setLoadingFamilies(false);
  };

  const fetchAccounts = async () => {
    if (!user?.school_id) return;
    const { data: accountsData } = await supabase
      .from('accounts')
      .select('*')
      .eq('school_id', user.school_id)
      .order('name', { ascending: true });

    const { data: accountTypesData } = await supabase
      .from('account_types')
      .select('*')
      .order('name', { ascending: true });

    if (accountsData) setAccounts(accountsData);
    if (accountTypesData) setAccountTypes(accountTypesData);
  };

  useEffect(() => {
    if (!user?.school_id) return;
    fetchActiveSession();
    fetchFamilies();
    fetchAccounts();
  }, [user?.school_id]);

  const paymentMethodOptions = useMemo(() => {
    const options: Array<{ value: string; label: string; isAccount: boolean; accountId?: number }> = [
      { value: 'Cash', label: 'Cash', isAccount: false },
      { value: 'Cheque', label: 'Cheque', isAccount: false }
    ];

    accounts.forEach((account) => {
      const accountType = accountTypes.find((t) => t.name === account.type);
      const displayName = accountType?.display_name || account.name;
      options.push({
        value: `account_${account.id}`,
        label: `${displayName} - ${account.name}`,
        isAccount: true,
        accountId: account.id
      });
    });

    return options;
  }, [accounts, accountTypes]);

  const suggestions = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return families.slice(0, 15);
    return families.filter((family) => {
      const idMatch = String(family.id).includes(needle);
      const nameMatch = family.name?.toLowerCase().includes(needle);
      const contactMatch = family.contact_person?.toLowerCase().includes(needle);
      const phoneMatch = family.contact_number?.includes(needle);
      return idMatch || nameMatch || contactMatch || phoneMatch;
    }).slice(0, 15);
  }, [families, searchTerm]);

  const selectedFamilyStudents = useMemo(() => {
    if (!selectedFamily?.family_members) return [];
    return selectedFamily.family_members
      .map((m: any) => m.student)
      .filter(Boolean);
  }, [selectedFamily]);

  const studentMap = useMemo(() => {
    const map = new Map<number, any>();
    selectedFamilyStudents.forEach((s: any) => map.set(s.id, s));
    return map;
  }, [selectedFamilyStudents]);

  const fetchStudentClassInfo = async (studentIds: number[]) => {
    if (!user?.school_id) return;
    if (!studentIds.length) {
      setStudentClassMap(new Map());
      return;
    }

    const map = new Map<number, { className?: string; sectionName?: string }>();

    if (activeSessionId) {
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
          adm_sections:adm_section_id(id, name)
        `)
        .eq('session_id', activeSessionId)
        .eq('school_id', user.school_id)
        .in('student_id', studentIds);

      if (!error && data) {
        data.forEach((row: any) => {
          const className = row.new_classes?.name || row.adm_classes?.name;
          const sectionName = row.new_sections?.name || row.adm_sections?.name;
          map.set(row.student_id, { className, sectionName });
        });
      }
    } else {
      const { data, error } = await supabase
        .from('students')
        .select('id, classes(name), sections(name)')
        .eq('school_id', user.school_id)
        .in('id', studentIds);

      if (!error && data) {
        data.forEach((row: any) => {
          map.set(row.id, { className: row.classes?.name, sectionName: row.sections?.name });
        });
      }
    }

    setStudentClassMap(map);
  };

  useEffect(() => {
    if (!selectedFamily) return;
    const ids = selectedFamily.family_members?.map((m: any) => m.student_id).filter(Boolean) || [];
    fetchStudentClassInfo(ids);
    setSelectedStudentIds([]);
    setStudentPayMap({});
  }, [selectedFamily, activeSessionId]);

  const handleSelectFamily = (family: any) => {
    setSelectedFamily(family);
    setSearchTerm(`${family.name} (ID: ${family.id})`);
    setShowSuggestions(false);
    setActiveIndex(0);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const toSelect = suggestions[activeIndex];
      if (toSelect) handleSelectFamily(toSelect);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };
  const fetchFamilyFeeSummary = async (family: any) => {
    if (!user?.school_id || !family) return;
    const studentIds = family.family_members?.map((m: any) => m.student_id).filter(Boolean) || [];
    if (studentIds.length === 0) {
      setFamilySummary([]);
      return;
    }

    setSummaryLoading(true);
    try {
      const challanQuery = supabase
        .from('fee_challans')
        .select(`id, student_id, session_id, fee_challans_items (id, amount)`)
        .in('student_id', studentIds)
        .eq('school_id', user.school_id);

      if (activeSessionId) {
        challanQuery.eq('session_id', activeSessionId);
      }

      const arrearsQuery = supabase
        .from('fee_arrears')
        .select('id, student_id, amount, status')
        .in('student_id', studentIds)
        .eq('school_id', user.school_id)
        .in('status', ['unpaid', 'partial']);

      const paymentsQuery = supabase
        .from('fee_payments')
        .select(`id, student_id, fee_payment_items (id, fee_challan_item_id, fee_arrear_id, amount, paid_amount)`)
        .in('student_id', studentIds)
        .eq('school_id', user.school_id);

      const [{ data: challans, error: challanError }, { data: arrears, error: arrearsError }, { data: payments, error: paymentsError }] =
        await Promise.all([challanQuery, arrearsQuery, paymentsQuery]);

      if (challanError) throw challanError;
      if (arrearsError) throw arrearsError;
      if (paymentsError) throw paymentsError;

      const totalsByStudent = new Map<number, { totalChallan: number; totalArrear: number; totalPaid: number }>();
      studentIds.forEach((id: number) => {
        totalsByStudent.set(id, { totalChallan: 0, totalArrear: 0, totalPaid: 0 });
      });

      const challanItemToStudent = new Map<number, number>();
      (challans || []).forEach((challan: any) => {
        const studentId = challan.student_id;
        const entry = totalsByStudent.get(studentId) || { totalChallan: 0, totalArrear: 0, totalPaid: 0 };
        (challan.fee_challans_items || []).forEach((item: any) => {
          const amount = Number(item.amount || 0);
          entry.totalChallan += amount;
          challanItemToStudent.set(item.id, studentId);
        });
        totalsByStudent.set(studentId, entry);
      });

      const arrearToStudent = new Map<number, number>();
      (arrears || []).forEach((arrear: any) => {
        const studentId = arrear.student_id;
        const entry = totalsByStudent.get(studentId) || { totalChallan: 0, totalArrear: 0, totalPaid: 0 };
        const amount = Number(arrear.amount || 0);
        entry.totalArrear += amount;
        arrearToStudent.set(arrear.id, studentId);
        totalsByStudent.set(studentId, entry);
      });

      (payments || []).forEach((payment: any) => {
        (payment.fee_payment_items || []).forEach((item: any) => {
          const paid = Number(item.paid_amount ?? item.amount ?? 0);
          if (item.fee_challan_item_id && challanItemToStudent.has(item.fee_challan_item_id)) {
            const studentId = challanItemToStudent.get(item.fee_challan_item_id) as number;
            const entry = totalsByStudent.get(studentId);
            if (entry) entry.totalPaid += paid;
          }
          if (item.fee_arrear_id && arrearToStudent.has(item.fee_arrear_id)) {
            const studentId = arrearToStudent.get(item.fee_arrear_id) as number;
            const entry = totalsByStudent.get(studentId);
            if (entry) entry.totalPaid += paid;
          }
        });
      });

      const summaryRows = (family.family_members || [])
        .map((m: any) => m.student)
        .filter(Boolean)
        .map((student: any) => {
          const totals = totalsByStudent.get(student.id) || { totalChallan: 0, totalArrear: 0, totalPaid: 0 };
          const totalDue = totals.totalChallan + totals.totalArrear;
          const remaining = Math.max(0, totalDue - totals.totalPaid);
          return {
            student,
            totalChallan: totals.totalChallan,
            totalArrear: totals.totalArrear,
            totalPaid: totals.totalPaid,
            totalDue,
            remaining
          };
        });

      setFamilySummary(summaryRows);
    } catch (err: any) {
      toast.showToast('Failed to load family fee summary', 'error');
      setFamilySummary([]);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchFamilyPaymentHistory = async (family: any) => {
    if (!user?.school_id || !family) return;
    const studentIds = family.family_members?.map((m: any) => m.student_id).filter(Boolean) || [];
    if (studentIds.length === 0) {
      setPaymentHistory([]);
      return;
    }

    setPaymentHistoryLoading(true);
    try {
      const data = await fetchAllRows(async (from, to) => {
        return await supabase
          .from('fee_payments')
          .select(`
            *,
            fee_payment_items (id, fee_challan_item_id, fee_arrear_id, amount, paid_amount),
            accounts (id, name, type, bank_name, account_number, mobile_number, wallet_number)
          `)
          .in('student_id', studentIds)
          .eq('school_id', user.school_id)
          .order('payment_date', { ascending: false })
          .range(from, to);
      });
      setPaymentHistory(data || []);
    } catch (err: any) {
      setPaymentHistory([]);
    } finally {
      setPaymentHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedFamily) {
      setFamilySummary([]);
      setPaymentHistory([]);
      return;
    }
    fetchFamilyFeeSummary(selectedFamily);
    fetchFamilyPaymentHistory(selectedFamily);
  }, [selectedFamily, activeSessionId]);

  const familyTotals = useMemo(() => {
    return familySummary.reduce(
      (acc, row) => {
        acc.totalDue += row.totalDue;
        acc.totalPaid += row.totalPaid;
        acc.totalRemaining += row.remaining;
        return acc;
      },
      { totalDue: 0, totalPaid: 0, totalRemaining: 0 }
    );
  }, [familySummary]);

  const selectedTotals = useMemo(() => {
    const selectedSet = new Set(selectedStudentIds);
    const totalRemaining = familySummary.reduce((sum, row) => {
      if (selectedSet.has(row.student.id)) return sum + row.remaining;
      return sum;
    }, 0);
    return { totalRemaining };
  }, [selectedStudentIds, familySummary]);

  const perStudentTotal = useMemo(() => {
    return Object.values(studentPayMap).reduce((sum, v) => sum + Number(v || 0), 0);
  }, [studentPayMap]);

  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const setStudentPay = (studentId: number, value: string) => {
    const numeric = Math.max(0, Number(value || 0));
    setStudentPayMap((prev) => ({ ...prev, [studentId]: numeric ? String(numeric) : '' }));
    if (!selectedStudentIds.includes(studentId) && numeric > 0) {
      setSelectedStudentIds((prev) => [...prev, studentId]);
    }
  };
  const buildStudentPaymentItems = async (studentId: number, netAmount: number) => {
    if (!user?.school_id) return [] as any[];

    const challanQuery = supabase
      .from('fee_challans')
      .select(`
        id,
        student_id,
        session_id,
        fee_challans_items (id, amount)
      `)
      .eq('student_id', studentId)
      .eq('school_id', user.school_id);

    if (activeSessionId) {
      challanQuery.eq('session_id', activeSessionId);
    }

    const arrearsQuery = supabase
      .from('fee_arrears')
      .select('id, student_id, amount, status')
      .eq('student_id', studentId)
      .eq('school_id', user.school_id)
      .in('status', ['unpaid', 'partial']);

    const paymentsQuery = supabase
      .from('fee_payments')
      .select(`id, fee_payment_items (fee_challan_item_id, fee_arrear_id, amount, paid_amount)`)
      .eq('student_id', studentId)
      .eq('school_id', user.school_id);

    const [{ data: challans }, { data: arrears }, { data: payments }] = await Promise.all([
      challanQuery,
      arrearsQuery,
      paymentsQuery
    ]);

    const paidByChallanItem = new Map<number, number>();
    const paidByArrear = new Map<number, number>();

    (payments || []).forEach((payment: any) => {
      (payment.fee_payment_items || []).forEach((item: any) => {
        const paid = Number(item.paid_amount ?? item.amount ?? 0);
        if (item.fee_challan_item_id) {
          paidByChallanItem.set(item.fee_challan_item_id, (paidByChallanItem.get(item.fee_challan_item_id) || 0) + paid);
        }
        if (item.fee_arrear_id) {
          paidByArrear.set(item.fee_arrear_id, (paidByArrear.get(item.fee_arrear_id) || 0) + paid);
        }
      });
    });

    const items: Array<{ fee_challan_item_id?: number; fee_arrear_id?: number; remaining: number }> = [];

    (challans || []).forEach((challan: any) => {
      (challan.fee_challans_items || []).forEach((item: any) => {
        const amount = Number(item.amount || 0);
        const paid = paidByChallanItem.get(item.id) || 0;
        const remaining = Math.max(0, amount - paid);
        if (remaining > 0) {
          items.push({ fee_challan_item_id: item.id, remaining });
        }
      });
    });

    (arrears || []).forEach((arrear: any) => {
      const amount = Number(arrear.amount || 0);
      const paid = paidByArrear.get(arrear.id) || 0;
      const remaining = Math.max(0, amount - paid);
      if (remaining > 0) {
        items.push({ fee_arrear_id: arrear.id, remaining });
      }
    });

    let remainingNet = netAmount;
    const paymentItems = items.map((item) => {
      const paid_amount = remainingNet > 0 ? Math.min(remainingNet, item.remaining) : 0;
      remainingNet -= paid_amount;
      return {
        fee_challan_item_id: item.fee_challan_item_id || null,
        fee_arrear_id: item.fee_arrear_id || null,
        amount: item.remaining,
        paid_amount
      };
    });

    return paymentItems;
  };

  const createStudentPayment = async (studentId: number, amount: number, discount: number, net: number) => {
    if (!user?.school_id) return;

    const paymentItems = await buildStudentPaymentItems(studentId, net);
    if (paymentItems.length === 0) return;

    const paymentRecord: any = {
      amount,
      discount_amount: discount,
      net_amount: net,
      payment_mode: paymentMethod,
      remarks: paymentRemarks,
      payment_date: paymentDate,
      school_id: user.school_id,
      received_by: user?.id || 0,
      student_id: studentId
    };

    if (selectedAccountId && paymentMethod.startsWith('account_')) {
      paymentRecord.account_id = selectedAccountId;
    }

    if (transactionId && transactionId.trim()) {
      paymentRecord.transaction_id = transactionId.trim();
    }

    if (chequeNumber && chequeNumber.trim()) {
      paymentRecord.cheque_number = chequeNumber.trim();
    }

    const { data: newPayment, error: paymentError } = await supabase
      .from('fee_payments')
      .insert([paymentRecord])
      .select();

    if (paymentError) throw paymentError;

    const paymentId = newPayment?.[0]?.id;
    if (!paymentId) return;

    const paymentItemsWithId = paymentItems.map((item) => ({
      payment_id: paymentId,
      fee_challan_item_id: item.fee_challan_item_id,
      fee_arrear_id: item.fee_arrear_id,
      amount: item.amount,
      paid_amount: item.paid_amount,
      school_id: user.school_id
    }));

    const { error: itemsError } = await supabase
      .from('fee_payment_items')
      .insert(paymentItemsWithId);

    if (itemsError) throw itemsError;
  };

  const buildPaymentPlan = () => {
    if (!selectedFamily) {
      toast.showToast('Please select a family first.', 'error');
      return null;
    }

    const discount = Number(discountAmount || 0);
    const totalRemaining = collectionMode === 'family' ? familyTotals.totalRemaining : selectedTotals.totalRemaining;

    let amount = 0;
    if (collectionMode === 'family') {
      amount = Number(paymentAmount || 0);
    } else {
      amount = perStudentTotal;
    }

    const net = amount + discount;

    if (amount <= 0) {
      toast.showToast('Please enter a valid amount.', 'error');
      return null;
    }

    if (net > totalRemaining && totalRemaining > 0) {
      toast.showToast('Amount exceeds remaining balance.', 'error');
      return null;
    }

    const targets: Array<{ studentId: number; netAmount: number }> = [];

    if (collectionMode === 'family') {
      let remainingNet = net;
      for (const row of familySummary) {
        if (row.remaining <= 0) continue;
        if (remainingNet <= 0) break;
        const alloc = Math.min(remainingNet, row.remaining);
        targets.push({ studentId: row.student.id, netAmount: alloc });
        remainingNet -= alloc;
      }
    } else {
      const totalPay = perStudentTotal;
      if (totalPay <= 0) {
        toast.showToast('Please enter per-student amounts.', 'error');
        return null;
      }
      for (const row of familySummary) {
        const entered = Number(studentPayMap[row.student.id] || 0);
        if (entered > 0) {
          const alloc = entered + (totalPay > 0 ? (discount * entered) / totalPay : 0);
          targets.push({ studentId: row.student.id, netAmount: alloc });
        }
      }
    }

    if (targets.length === 0) {
      toast.showToast('No students to collect from.', 'error');
      return null;
    }

    const entries = targets.map((t) => {
      const row = familySummary.find((r) => r.student.id === t.studentId);
      const label = row ? `${getStudentDisplayId(row.student)} - ${row.student.name}` : String(t.studentId);
      return { id: t.studentId, label, amount: t.netAmount };
    });

    return {
      amount,
      discount,
      net,
      totalRemaining,
      targets,
      entries,
      mode: collectionMode,
      paymentMethod,
      paymentDate,
      paymentRemarks,
      familyName: selectedFamily.name,
      familyId: selectedFamily.id
    };
  };

  const handleCollectPayment = async (planOverride?: any) => {
    const override = planOverride && typeof planOverride === 'object' && typeof planOverride.preventDefault === 'function' ? null : planOverride;
    const plan = override || buildPaymentPlan();
    if (!plan) return;

    if (!override) {
      setConfirmPlan(plan);
      setConfirmOpen(true);
      return;
    }

    const { amount, discount, targets } = plan;
    const totalNet = targets.reduce((sum: number, t: any) => sum + t.netAmount, 0);
    const ratio = totalNet > 0 ? amount / totalNet : 1;

    setIsCollecting(true);
    try {
      let amountAssigned = 0;
      let discountAssigned = 0;
      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        let studentAmount = i === targets.length - 1
          ? amount - amountAssigned
          : Number((target.netAmount * ratio).toFixed(2));
        let studentDiscount = i === targets.length - 1
          ? discount - discountAssigned
          : Number((target.netAmount - studentAmount).toFixed(2));

        if (studentAmount < 0) studentAmount = 0;
        if (studentDiscount < 0) studentDiscount = 0;

        amountAssigned += studentAmount;
        discountAssigned += studentDiscount;

        await createStudentPayment(target.studentId, studentAmount, studentDiscount, target.netAmount);
      }

      toast.showToast('Family payment collected successfully!', 'success');
      setPaymentAmount('');
      setDiscountAmount('');
      setPaymentRemarks('');
      setTransactionId('');
      setChequeNumber('');
      setStudentPayMap({});
      setSelectedStudentIds([]);
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setConfirmPlan(null);

      await fetchFamilyFeeSummary(selectedFamily);
      await fetchFamilyPaymentHistory(selectedFamily);
    } catch (err: any) {
      toast.showToast('Failed to collect payment: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsCollecting(false);
    }
  };

  const handleConfirmPayment = () => {
    if (!confirmPlan) return;
    setConfirmOpen(false);
    handleCollectPayment(confirmPlan);
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!confirmOpen) {
        handleCollectPayment();
      }
    }
  };
  return (
    <PageContainer theme={themeObj}>
      <Header theme={themeObj}>
        <Title theme={themeObj}>Family Fee Collection</Title>
        <SearchContainer theme={themeObj}>
          <SearchIcon style={{ fontSize: '1.1rem', color: themeObj.TEXT_SECONDARY }} />
          <SearchInput
            ref={searchInputRef}
            theme={themeObj}
            placeholder="Search family by name, ID, contact"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
              setActiveIndex(0);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleSearchKeyDown}
          />
          {showSuggestions && suggestions.length > 0 && (
            <SuggestionsDropdown theme={themeObj}>
              {suggestions.map((family, idx) => (
                <SuggestionItem
                  key={family.id}
                  theme={themeObj}
                  $isActive={idx === activeIndex}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectFamily(family)}
                >
                  <SuggestionAvatar theme={themeObj}>
                    {(family.name || 'F').charAt(0).toUpperCase()}
                  </SuggestionAvatar>
                  <SuggestionInfo>
                    <SuggestionName theme={themeObj}>{family.name}</SuggestionName>
                    <SuggestionDetails theme={themeObj}>
                      ID: {getFamilyDisplayId(family.id)}
                      {family.contact_person ? ` · ${family.contact_person}` : ''}
                      {family.contact_number ? ` · ${family.contact_number}` : ''}
                    </SuggestionDetails>
                  </SuggestionInfo>
                </SuggestionItem>
              ))}
            </SuggestionsDropdown>
          )}
        </SearchContainer>
      </Header>

      {loadingFamilies ? (
        <EmptyState theme={themeObj}>
          <CircularProgress size={28} />
          Loading families...
        </EmptyState>
      ) : (
        <>
        <ContentGrid>
          <Card theme={themeObj}>
            <CardTitle theme={themeObj}>
              <FamilyRestroom style={{ color: themeObj.ACCENT }} />
              Family Details
            </CardTitle>

            {selectedFamily ? (
              <>
                <FamilyInfo theme={themeObj}>
                  <FamilyAvatar $bg={stringToColor(selectedFamily.name || 'F')}>
                    {selectedFamily.avatar_url ? (
                      <img
                        src={selectedFamily.avatar_url}
                        alt="Family"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      (selectedFamily.name || 'F').charAt(0).toUpperCase()
                    )}
                  </FamilyAvatar>
                  <FamilyDetails>
                    <FamilyName theme={themeObj}>{selectedFamily.name}</FamilyName>
                    <FamilyInfoText theme={themeObj}>ID: {getFamilyDisplayId(selectedFamily.id)}</FamilyInfoText>
                    {selectedFamily.contact_person && (
                      <FamilyInfoText theme={themeObj}>Contact: {selectedFamily.contact_person}</FamilyInfoText>
                    )}
                    {selectedFamily.contact_number && (
                      <FamilyInfoText theme={themeObj}>Phone: {selectedFamily.contact_number}</FamilyInfoText>
                    )}
                    {selectedFamily.address && (
                      <FamilyInfoText theme={themeObj}>Address: {selectedFamily.address}</FamilyInfoText>
                    )}
                  </FamilyDetails>
                </FamilyInfo>

                <CardTitle theme={themeObj} style={{ marginTop: 0 }}>
                  <PeopleIcon style={{ color: themeObj.ACCENT }} />
                  {collectionMode === 'student' ? 'Per Student Collection' : 'Linked Students'}
                </CardTitle>

                {collectionMode === 'student' ? (
                  familySummary.length > 0 ? (
                    <TableWrapper theme={themeObj}>
                      <Table>
                        <TableHeader theme={themeObj}>
                          <TableRow>
                            <StudentTableHeaderCell theme={themeObj}>Select</StudentTableHeaderCell>
                            <TableHeaderCell theme={themeObj}>Student</TableHeaderCell>
                            <StudentTableHeaderCell theme={themeObj}>Remaining</StudentTableHeaderCell>
                            <StudentTableHeaderCell theme={themeObj}>Pay Now</StudentTableHeaderCell>
                          </TableRow>
                        </TableHeader>
                        <tbody>
                          {familySummary.map((row) => (
                            <TableRow key={row.student.id}>
                              <StudentTableCell theme={themeObj}>
                                <Checkbox
                                  checked={selectedStudentIds.includes(row.student.id)}
                                  onChange={() => toggleStudentSelection(row.student.id)}
                                  size="small"
                                />
                              </StudentTableCell>
                              <TableCell theme={themeObj} style={{ fontWeight: 600 }}>
                                {getStudentDisplayId(row.student)} - {row.student.name}
                              </TableCell>
                              <StudentTableCell theme={themeObj}>Rs. {formatCurrency(row.remaining)}</StudentTableCell>
                              <StudentTableCell theme={themeObj}>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={studentPayMap[row.student.id] || ''}
                                  onChange={(e) => setStudentPay(row.student.id, e.target.value)}
                                  inputProps={{ min: 0, max: row.remaining, step: 0.01 }}
                                  sx={{ width: 120 }}
                                  disabled={row.remaining <= 0}
                                  onKeyDown={handleFormKeyDown}
                                />
                              </StudentTableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell theme={themeObj} style={{ fontWeight: 700 }} colSpan={2}>
                              Total Remaining
                            </TableCell>
                            <StudentTableCell theme={themeObj} style={{ fontWeight: 700 }}>
                              Rs. {formatCurrency(familyTotals.totalRemaining)}
                            </StudentTableCell>
                            <StudentTableCell theme={themeObj} style={{ fontWeight: 700 }}>
                              Rs. {formatCurrency(perStudentTotal)}
                            </StudentTableCell>
                          </TableRow>
                        </tbody>
                      </Table>
                    </TableWrapper>
                  ) : (
                    <EmptyState theme={themeObj}>No fee data found for this family.</EmptyState>
                  )
                ) : (
                  selectedFamilyStudents.length > 0 ? (
                    <TableWrapper theme={themeObj}>
                      <Table>
                        <TableHeader theme={themeObj}>
                          <TableRow>
                            <TableHeaderCell theme={themeObj}>Student</TableHeaderCell>
                            <TableHeaderCell theme={themeObj}>Class / Section</TableHeaderCell>
                            <TableHeaderCell theme={themeObj} style={{ textAlign: 'center' }}>Remaining</TableHeaderCell>
                          </TableRow>
                        </TableHeader>
                        <tbody>
                          {selectedFamilyStudents.map((student: any) => {
                            const cls = studentClassMap.get(student.id);
                            const classLabel = cls?.className || student.classes?.name || '-';
                            const sectionLabel = cls?.sectionName || student.sections?.name || '';
                            const summary = familySummary.find(s => s.student.id === student.id);
                            const remaining = summary?.remaining ?? 0;
                            return (
                              <TableRow key={student.id}>
                                <TableCell theme={themeObj} style={{ fontWeight: 600 }}>
                                  {getStudentDisplayId(student)} - {student.name}
                                </TableCell>
                                <TableCell theme={themeObj}>
                                  {classLabel}{sectionLabel ? ` (${sectionLabel})` : ''}
                                </TableCell>
                                <TableCell theme={themeObj} style={{ textAlign: 'center', fontWeight: 600 }}>
                                  Rs. {formatCurrency(remaining)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          <TableRow>
                            <TableCell theme={themeObj} style={{ fontWeight: 700 }} colSpan={2}>
                              Total Remaining
                            </TableCell>
                            <TableCell theme={themeObj} style={{ textAlign: 'center', fontWeight: 700 }}>
                              Rs. {formatCurrency(familyTotals.totalRemaining)}
                            </TableCell>
                          </TableRow>
                        </tbody>
                      </Table>
                    </TableWrapper>
                  ) : (
                    <EmptyState theme={themeObj}>No students linked to this family.</EmptyState>
                  )
                )}
              </>
            ) : (
              <EmptyState theme={themeObj}>
                <FamilyRestroom style={{ fontSize: '2.5rem' }} />
                Select a family to view linked students
              </EmptyState>
            )}
          </Card>

          <Card theme={themeObj}>
            <CardTitle theme={themeObj}>Collection</CardTitle>

            {summaryLoading ? (
              <EmptyState theme={themeObj}>
                <CircularProgress size={24} />
                Loading fee summary...
              </EmptyState>
            ) : selectedFamily ? (
              <>
                <FlipSwitchContainer>
  <FlipSwitch>
    <input
      type="radio"
      id="switch-opt-1"
      name="flip-switch"
      checked={collectionMode === 'family'}
      onChange={() => setCollectionMode('family')}
    />
    <input
      type="radio"
      id="switch-opt-2"
      name="flip-switch"
      checked={collectionMode === 'student'}
      onChange={() => setCollectionMode('student')}
    />

    <label htmlFor="switch-opt-1" className="switch-button">
      <FamilyRestroom />
      <span>Family Total</span>
    </label>

    <label htmlFor="switch-opt-2" className="switch-button">
      <PeopleIcon />
      <span>Per Student</span>
    </label>

    <div className="switch-card">
      <div className="card-face card-front"></div>
      <div className="card-face card-back"></div>
    </div>
  </FlipSwitch>
</FlipSwitchContainer>

                <CardTitle theme={themeObj} style={{ marginTop: '1.25rem' }}>Payment Details</CardTitle>
                <FormFields onKeyDown={handleFormKeyDown}>
                  {collectionMode === 'family' ? (
                    <FormRow>
                      <TextField
                        label="Amount"
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        size="small"
                        placeholder="Enter payment amount"
                      />
                    </FormRow>
                  ) : (
                    <FormRow>
                      <TextField
                        label="Total Amount"
                        type="number"
                        value={perStudentTotal}
                        size="small"
                        disabled
                      />
                    </FormRow>
                  )}

                  <FormRow>
                    <TextField
                      label="Discount Amount"
                      type="number"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      size="small"
                      placeholder="Enter discount amount (optional)"
                    />
                  </FormRow>

                  <FormRow>
                    <FormControl fullWidth size="small">
                      <InputLabel>Payment Method</InputLabel>
                      <Select
                        value={paymentMethod}
                        label="Payment Method"
                        onChange={(e) => {
                          const value = e.target.value as string;
                          setPaymentMethod(value);
                          if (value.startsWith('account_')) {
                            const accountId = parseInt(value.replace('account_', ''), 10);
                            setSelectedAccountId(accountId);
                          } else {
                            setSelectedAccountId(null);
                            setTransactionId('');
                          }
                          if (value !== 'Cheque') {
                            setChequeNumber('');
                          }
                        }}
                      >
                        {paymentMethodOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </FormRow>

                  {selectedAccountId && (
                    <FormRow>
                      <Box sx={{
                        padding: '0.75rem',
                        background: themeObj.CARD,
                        borderRadius: '8px',
                        border: `1px solid ${themeObj.BORDER}`,
                        fontSize: '0.85rem'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: '0.5rem' }}>
                          <InfoIcon sx={{ fontSize: '1rem', color: themeObj.ACCENT }} />
                          <strong>Selected Account</strong>
                        </Box>
                        {(() => {
                          const selectedAccount = accounts.find(a => a.id === selectedAccountId);
                          if (!selectedAccount) return null;
                          return (
                            <>
                              <div><strong>Name:</strong> {selectedAccount.name}</div>
                              {selectedAccount.account_number && <div><strong>Account:</strong> {selectedAccount.account_number}</div>}
                              {selectedAccount.mobile_number && <div><strong>Mobile:</strong> {selectedAccount.mobile_number}</div>}
                            </>
                          );
                        })()}
                      </Box>
                    </FormRow>
                  )}

                  {paymentMethod.startsWith('account_') && (
                    <FormRow>
                      <TextField
                        label="Transaction ID"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        size="small"
                        placeholder="Enter transaction ID (optional)"
                      />
                    </FormRow>
                  )}

                  {paymentMethod === 'Cheque' && (
                    <FormRow>
                      <TextField
                        label="Cheque Number"
                        value={chequeNumber}
                        onChange={(e) => setChequeNumber(e.target.value)}
                        size="small"
                        placeholder="Enter cheque number"
                      />
                    </FormRow>
                  )}

                  <FormRow>
                    <TextField
                      label="Payment Date"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      disabled
                    />
                  </FormRow>

                  <FormRow>
                    <TextField
                      label="Remarks"
                      value={paymentRemarks}
                      onChange={(e) => setPaymentRemarks(e.target.value)}
                      size="small"
                      placeholder="Enter payment remarks (optional)"
                      multiline
                      rows={2}
                    />
                  </FormRow>

                  <FormButton>
                    <Button
                      onClick={() => handleCollectPayment()}
                      variant="contained"
                      fullWidth
                      size="small"
                      disabled={isCollecting}
                      sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 600,
                        py: 1.5,
                        background: '#16a34a',
                        '&:hover': { background: '#15803d' }
                      }}
                    >
                      {isCollecting ? 'Collecting...' : 'Collect Payment'}
                    </Button>
                  </FormButton>
                </FormFields>
              </>
            ) : (
              <EmptyState theme={themeObj}>
                Select a family to view summary
              </EmptyState>
            )}
          </Card>
        </ContentGrid>

        {selectedFamily && (
          <Card theme={themeObj} style={{ marginTop: '1.5rem' }}>
            <CardTitle theme={themeObj}>Payment History</CardTitle>
            {paymentHistoryLoading ? (
              <EmptyState theme={themeObj}>
                <CircularProgress size={24} />
                Loading payment history...
              </EmptyState>
            ) : paymentHistory.length > 0 ? (
              <TableWrapper theme={themeObj}>
                <Table>
                  <TableHeader theme={themeObj}>
                    <TableRow>
                      <TableHeaderCell theme={themeObj}>Payment ID</TableHeaderCell>
                      <TableHeaderCell theme={themeObj}>Date</TableHeaderCell>
                      <TableHeaderCell theme={themeObj}>Student</TableHeaderCell>
                      <TableHeaderCell theme={themeObj}>Amount</TableHeaderCell>
                      <TableHeaderCell theme={themeObj}>Discount</TableHeaderCell>
                      <TableHeaderCell theme={themeObj}>Net</TableHeaderCell>
                      <TableHeaderCell theme={themeObj}>Method</TableHeaderCell>
                      <TableHeaderCell theme={themeObj}>Remarks</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <tbody>
                    {paymentHistory.map((payment: any) => {
                      const student = studentMap.get(payment.student_id);
                      const method = payment.accounts
                        ? `${payment.payment_mode} - ${payment.accounts.name}`
                        : payment.payment_mode;
                      return (
                        <TableRow key={payment.id}>
                          <TableCell theme={themeObj} style={{ fontWeight: 600 }}>{payment.id}</TableCell>
                          <TableCell theme={themeObj}>{formatDate(payment.payment_date || payment.created_at)}</TableCell>
                          <TableCell theme={themeObj}>{student ? `${getStudentDisplayId(student)} - ${student.name}` : payment.student_id}</TableCell>
                          <TableCell theme={themeObj}>Rs. {formatCurrency(Number(payment.amount || 0))}</TableCell>
                          <TableCell theme={themeObj}>Rs. {formatCurrency(Number(payment.discount_amount || 0))}</TableCell>
                          <TableCell theme={themeObj}>Rs. {formatCurrency(Number(payment.net_amount || payment.amount || 0))}</TableCell>
                          <TableCell theme={themeObj}>{method || '-'}</TableCell>
                          <TableCell theme={themeObj}>{payment.remarks || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </tbody>
                </Table>
              </TableWrapper>
            ) : (
              <EmptyState theme={themeObj}>No payment history found.</EmptyState>
            )}
          </Card>
        )}
        </>
      )}

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        maxWidth="md"
        fullWidth
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirmPayment();
          }
        }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: themeObj.CARD,
            border: `1px solid ${themeObj.BORDER}`
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Confirm Payment
            </Typography>
            <Typography variant="caption" sx={{ color: themeObj.TEXT_SECONDARY }}>
              {confirmPlan?.mode === 'student' ? 'Per Student' : 'Family Total'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 1 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <Box sx={{ display: 'grid', gap: 0.75 }}>
              <Typography variant="caption" sx={{ color: themeObj.TEXT_SECONDARY }}>
                Family
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {confirmPlan?.familyName || '-'}
              </Typography>
              <Typography variant="body2" sx={{ color: themeObj.TEXT_SECONDARY }}>
                Method: {confirmPlan?.paymentMethod || '-'}
              </Typography>
              <Typography variant="body2" sx={{ color: themeObj.TEXT_SECONDARY }}>
                Date: {confirmPlan?.paymentDate || '-'}
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gap: 0.75 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: themeObj.TEXT_SECONDARY }}>
                  Amount
                </Typography>
                <Typography variant="body2">Rs. {formatCurrency(Number(confirmPlan?.amount || 0))}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: themeObj.TEXT_SECONDARY }}>
                  Discount
                </Typography>
                <Typography variant="body2">Rs. {formatCurrency(Number(confirmPlan?.discount || 0))}</Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  Net
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  Rs. {formatCurrency(Number(confirmPlan?.net || 0))}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2">Allocation</Typography>
            <Typography variant="caption" sx={{ color: themeObj.TEXT_SECONDARY }}>
              {confirmPlan?.entries?.length || 0} students
            </Typography>
          </Box>

          <Box sx={{ maxHeight: 220, overflowY: 'auto', border: `1px solid ${themeObj.BORDER}`, borderRadius: 2 }}>
            {confirmPlan?.entries?.map((item: any, idx: number) => (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  px: 1.5,
                  py: 1,
                  borderBottom: idx === (confirmPlan?.entries?.length || 0) - 1 ? 'none' : `1px solid ${themeObj.BORDER}`
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {item.label}
                </Typography>
                <Typography variant="body2">Rs. {formatCurrency(Number(item.amount || 0))}</Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="text" onClick={() => setConfirmOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleConfirmPayment} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Confirm & Collect
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FamilyFeeCollection;

