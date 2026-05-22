import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import styled, { useTheme } from 'styled-components';
import { Search, AddCircle, InfoOutlined, CalendarToday, Edit, DeleteOutline as DeleteIcon, Add } from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { clayCardStyle } from '../styles/DesignSystem';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import { useProgress } from '../components/Layout';
import { fetchAllRows } from '../utils/paginationHelper';
import { getStudentDisplayId, matchesStudentSearch } from '../utils/studentUtils';
import { useToast } from '../components/useToast';
import { formatAppDate } from '../utils/dateUtils';
import Loader from '../components/Loader';
import DescriptionModal from '../components/DescriptionModal';

const Container = styled.div`
  width: 100%;
  max-width: 1450px;
  margin: 0 auto;
  padding: 1.2rem 0.9rem;
  box-sizing: border-box;
  @media (max-width: 700px) {
    padding: 0.9rem 0.7rem;
  }
`;

const PageGrid = styled.div`
  display: grid;
  gap: 0.85rem;
  align-items: flex-start;
`;

const Card = styled.div`
  ${clayCardStyle}
  padding: 1rem 1rem;
  width: 100%;
  box-sizing: border-box;
  @media (max-width: 700px) {
    padding: 0.85rem 0.8rem;
  }
`;

const HeadingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const HeadingIcon = styled.div`
  color: ${({ theme }) => theme.ACCENT};
  font-size: 2rem;
  display: flex;
  align-items: center;
`;

const Heading = styled.h2`
  font-size: 1.45rem;
  font-weight: 800;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
`;

const Description = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  line-height: 1.6;
  font-size: 0.92rem;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 10px;
  padding: 0.75rem 0.85rem;
  width: 100%;
  position: relative;
`;

const TableHeaderBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const HeaderSearchBar = styled(SearchBar)`
  max-width: 340px;
  width: 100%;
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.92rem;
  outline: none;
  width: 100%;
  margin-left: 0.75rem;
  &::placeholder {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
  }
`;

const SuggestionList = styled.ul`
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 0.4rem);
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.14);
  z-index: 10;
  margin: 0;
  padding: 0.4rem 0;
  list-style: none;
  max-height: 240px;
  overflow-y: auto;
`;

const SuggestionItem = styled.li<{ active?: boolean }>`
  padding: 0.65rem 0.9rem;
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  cursor: pointer;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  background: ${({ active, theme }) => (active ? theme.HOVER_BG : 'transparent')};
  &:hover {
    background: ${({ theme }) => theme.HOVER_BG};
  }
`;

const SuggestionMeta = styled.span`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.82rem;
  white-space: nowrap;
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

const SuggestionAvatar = styled.div`
  width: 34px;
  height: 34px;
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
  gap: 0.08rem;
  min-width: 0;
`;

const SuggestionName = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 210px;
`;

const SuggestionSub = styled.span`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.82rem;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
`;

const SuggestionFather = styled.span`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.86rem;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
`;

const SuggestionMetaCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 0;
  margin-left: 0.9rem;
`;

const SuggestionClass = styled.span`
  color: ${({ theme }) => theme.ACCENT};
  font-size: 0.9rem;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
`;

const SuggestionId = styled.span`
  color: #a0a7b8;
  font-size: 0.86rem;
  line-height: 1.1;
  white-space: nowrap;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
`;

const Label = styled.label`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 600;
  font-size: 0.86rem;
`;

const CompactField = styled(FormGroup)`
  min-width: 150px;
  flex: 1 1 150px;
`;

const Input = styled.input`
  padding: 0.65rem 0.8rem;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.88rem;
  outline: none;
`;

const Select = styled.select`
  padding: 0.7rem 0.85rem;
  border-radius: 10px;
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.88rem;
  outline: none;
`;

const TextArea = styled.textarea`
  padding: 0.7rem 0.85rem;
  border-radius: 10px;
  border: 1.2px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.88rem;
  outline: none;
  min-height: 100px;
  resize: vertical;
`;

const AssignRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 0.65rem;
  flex-wrap: wrap;
  margin-top: 0.85rem;
`;

const ButtonSmall = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.6rem 0.9rem;
  border-radius: 12px;
  border: none;
  background: ${({ theme }) => theme.ACCENT};
  color: #fff;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.14);
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const SummaryInline = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-bottom: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.84rem;
`;

const SummaryInlineItem = styled.span`
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 999px;
  padding: 0.35rem 0.65rem;
`;

const TwoColumn = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.95rem 1.3rem;
  border-radius: 12px;
  border: none;
  background: ${({ theme }) => theme.ACCENT};
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16);
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryCard = styled.div`
  ${clayCardStyle}
  padding: 1.35rem 1.4rem;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const SummaryLabel = styled.div`
  font-size: 0.96rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 600;
`;

const SummaryValue = styled.div<{ color?: string }>`
  font-size: 2rem;
  font-weight: 800;
  color: ${({ color, theme }) => color || theme.ACCENT};
  margin-top: 0.6rem;
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
`;

const StyledSelect = styled.select`
  flex: 1;
  padding: 0.5rem;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 8px;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0.35rem;
  border-radius: 8px;
  transition: background 0.15s;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  &:hover {
    background: ${({ theme }) => theme.HOVER_BG};
  }
`;


const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  z-index: 1000;
`;

const ModalDialog = styled.div`
  width: min(560px, 100%);
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 16px;
  padding: 1.4rem;
  box-shadow: 0 15px 45px rgba(0, 0, 0, 0.18);
`;

const ModalTitle = styled.h3`
  margin: 0 0 1rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.2rem;
`;

const ModalMessage = styled.p`
  margin: 0 0 1.25rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  line-height: 1.6;
`;

const ModalButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const ModalButton = styled.button<{ primary?: boolean }>`
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  font-weight: 700;
  transition: background 0.2s, border-color 0.2s;
  ${({ theme, primary }) => primary ? `
    background: ${theme.ACCENT};
    color: #fff;
  ` : `
    background: ${theme.FIELD_BG};
    color: ${theme.TEXT_PRIMARY};
    border-color: ${theme.BORDER};
  `}
`;

const ModalRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-bottom: 1rem;
`;

const StudentMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.82rem;
  line-height: 1.4;
  margin-top: 0.1rem;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 780px;
  background: ${({ theme }) => theme.CARD};
`;

const Th = styled.th`
  padding: 0.75rem 0.8rem;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.ACCENT};
  font-weight: 700;
  font-size: 0.86rem;
  text-align: left;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

const Td = styled.td`
  padding: 0.75rem 0.8rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  font-size: 0.9rem;
`;

const StudentName = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  align-items: flex-start;
`;

const StatusBadge = styled.span<{ status: string }>`
  display: inline-flex;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #fff;
  background: ${({ status }) =>
    status === 'paid'
      ? '#10b981'
      : status === 'cancelled'
      ? '#f97316'
      : '#2563eb'};
`;

const EmptyState = styled.div`
  padding: 2rem 1rem;
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const NoData = styled.div`
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 1rem;
`;

const SpecialFines: React.FC = () => {
  const theme = useTheme() as any;
  const { user } = useAuth();
  const { setLoading, loading } = useLoading();
  const { setProgress, startProgress, completeProgress } = useProgress();
  const toast = useToast();

  const [students, setStudents] = useState<any[]>([]);
  const [specialFines, setSpecialFines] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);
  const [activeStudentSuggestion, setActiveStudentSuggestion] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [description, setDescription] = useState('');
  const [isCustomDescription, setIsCustomDescription] = useState(false);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [editingFineId, setEditingFineId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteFineId, setDeleteFineId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isProcessingFine, setIsProcessingFine] = useState(false);
  const [descriptions, setDescriptions] = useState<Array<{id:number, name:string}>>([]);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  
  // Set first description as default when loaded
  useEffect(() => {
    if (descriptions.length > 0 && !description) {
      setDescription(descriptions[0].name);
    }
  }, [descriptions, description]);

  const studentSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.school_id) return;
    const fetchData = async () => {
      setLoading(true);
      startProgress(false);
      setProgress(15);
      try {
        const [studentRows, fineRows, classRows, sectionRows, descriptionRows] = await Promise.all([
          fetchAllRows<any>(async (from, to) => {
            return await supabase
              .from('students')
              .select('id, name, father_name, roll_number, class_id, section_id, picture_url')
              .eq('school_id', user.school_id)
              .eq('status', 'active')
              .order('name', { ascending: true })
              .range(from, to);
          }),
          fetchAllRows<any>(async (from, to) => {
            return await supabase
              .from('special_fines')
              .select('*')
              .eq('school_id', user.school_id)
              .order('created_at', { ascending: false })
              .range(from, to);
          }),
          fetchAllRows<any>(async (from, to) => {
            return await supabase
              .from('classes')
              .select('id, name')
              .eq('school_id', user.school_id)
              .range(from, to);
          }),
          fetchAllRows<any>(async (from, to) => {
            return await supabase
              .from('sections')
              .select('id, name')
              .eq('school_id', user.school_id)
              .range(from, to);
          }),
          fetchAllRows<any>(async (from, to) => {
            return await supabase
              .from('specialfines_descriptions')
              .select('id, name')
              .eq('school_id', user.school_id)
              .order('name', { ascending: true })
              .range(from, to);
          }),
        ]);

        setStudents(studentRows || []);
        setSpecialFines(fineRows || []);
        setClasses(classRows || []);
        setSections(sectionRows || []);
        setDescriptions(descriptionRows || []);
        setProgress(100);
      } catch (error) {
        console.error('Failed to load special fines data:', error);
        toast.showToast('Failed to load special fines', 'error');
      } finally {
        setLoading(false);
        completeProgress();
      }
    };

    fetchData();
  }, [user?.school_id, setLoading, startProgress, setProgress, completeProgress, toast]);

  const studentSuggestionsList = useMemo(() => {
    const trimmed = studentSearch.trim();
    if (!trimmed) return [];
    const lower = trimmed.toLowerCase();
    const scored = students
      .map(student => {
        const name = String(student.name || '').toLowerCase();
        const idMatch = matchesStudentSearch(student, trimmed);
        let score = idMatch.score;
        let matches = idMatch.matches;

        if (name.includes(lower)) {
          const prefixScore = name.startsWith(lower) ? 900 : 500;
          score = Math.max(score, prefixScore);
          matches = true;
        }

        return matches ? { student, score } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (b!.score || 0) - (a!.score || 0))
      .map(item => item!.student);

    return scored.slice(0, 8);
  }, [students, studentSearch]);

  const getClassName = (classId: any) => classes.find(c => String(c.id) === String(classId))?.name || '';
  const getSectionName = (sectionId: any) => sections.find(s => String(s.id) === String(sectionId))?.name || '';
  const formatClassSection = (classId: any, sectionId: any) => {
    const className = getClassName(classId);
    const sectionName = getSectionName(sectionId);
    if (!className && !sectionName) return '—';
    return sectionName ? `${className} (${sectionName})` : className;
  };

  const enrichedSpecialFines = useMemo(() => {
    return specialFines.map(fine => ({
      ...fine,
      student: students.find(s => s.id === fine.student_id),
    }));
  }, [specialFines, students]);

  const totalAmount = useMemo(() => {
    return enrichedSpecialFines.reduce((sum, fine) => sum + Number(fine.amount || 0), 0);
  }, [enrichedSpecialFines]);

  const totalPaid = useMemo(() => {
    return enrichedSpecialFines.reduce((sum, fine) => sum + Number(fine.paid_amount || 0), 0);
  }, [enrichedSpecialFines]);

  const pendingCount = useMemo(() => {
    return enrichedSpecialFines.filter(fine => fine.status !== 'paid').length;
  }, [enrichedSpecialFines]);

  const visibleSpecialFines = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    if (!query) return enrichedSpecialFines;
    return enrichedSpecialFines.filter(fine => {
      const idValue = String(getStudentDisplayId(fine.student || { id: fine.student_id })).toLowerCase();
      const studentName = String(fine.student?.name || '').toLowerCase();
      const fatherName = String(fine.student?.father_name || '').toLowerCase();
      const descriptionValue = String(fine.description || '').toLowerCase();
      const classSection = String(formatClassSection(fine.student?.class_id, fine.student?.section_id)).toLowerCase();
      const amountValue = String(fine.amount || '').toLowerCase();
      return (
        idValue.includes(query) ||
        studentName.includes(query) ||
        fatherName.includes(query) ||
        descriptionValue.includes(query) ||
        classSection.includes(query) ||
        amountValue.includes(query)
      );
    });
  }, [enrichedSpecialFines, tableSearch]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (studentSearchRef.current && !studentSearchRef.current.contains(event.target as Node)) {
        setShowStudentSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSave = async () => {
    if (!user?.school_id) {
      toast.showToast('School context missing', 'error');
      return;
    }

    if (!selectedStudent?.id) {
      toast.showToast('Please select a student', 'error');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.showToast('Please enter a valid amount', 'error');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('special_fines').insert([{ 
        student_id: selectedStudent.id,
        description: description.trim() || 'Special Fine',
        amount: Number(parseFloat(amount).toFixed(2)),
        paid_amount: 0,
        status: 'pending',

        school_id: user.school_id,
      }]);

      if (error) {
        console.error('Failed to create special fine:', error);
        toast.showToast('Unable to add special fine', 'error');
        return;
      }

      toast.showToast('Special fine added successfully');
      setDescription(descriptions.length > 0 ? descriptions[0].name : 'Special Fine');
      setAmount('');
      setSelectedStudent(null);
      setStudentSearch('');

      const refreshed = await fetchAllRows<any>(async (from, to) => {
        return await supabase
          .from('special_fines')
          .select('*')
          .eq('school_id', user.school_id)
          .order('created_at', { ascending: false })
          .range(from, to);
      });
      setSpecialFines(refreshed || []);
    } catch (error) {
      console.error('Failed to save special fine:', error);
      toast.showToast('Failed to save special fine', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEditFine = (fine: any) => {
    setEditingFineId(fine.id);
    setEditDescription(fine.description || '');
    setEditAmount(String(fine.amount || ''));
    setShowEditModal(true);
  };

  const cancelEditFine = () => {
    setEditingFineId(null);
    setEditDescription('');
    setEditAmount('');
    setShowEditModal(false);
  };

  const saveEditFine = async () => {
    if (!user?.school_id || !editingFineId) return;
    const amountValue = Number(parseFloat(editAmount || '0').toFixed(2));
    if (!editDescription.trim()) {
      toast.showToast('Please enter a description.', 'error');
      return;
    }
    if (!amountValue || amountValue <= 0) {
      toast.showToast('Please enter a valid amount.', 'error');
      return;
    }

    setIsProcessingFine(true);
    try {
      const { data, error } = await supabase
        .from('special_fines')
        .update({ description: editDescription.trim(), amount: amountValue })
        .eq('id', editingFineId)
        .eq('school_id', user.school_id)
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        setSpecialFines(prev => prev.map(fine => fine.id === editingFineId ? { ...fine, ...data[0] } : fine));
      }
      toast.showToast('Special fine updated successfully.', 'success');
      cancelEditFine();
    } catch (error) {
      console.error('Failed to edit special fine:', error);
      toast.showToast('Failed to edit special fine', 'error');
    } finally {
      setIsProcessingFine(false);
    }
  };

  const openDeleteFine = (fineId: number) => {
    setDeleteFineId(fineId);
    setShowDeleteModal(true);
  };

  const cancelDeleteFine = () => {
    setDeleteFineId(null);
    setShowDeleteModal(false);
  };

  const confirmDeleteFine = async () => {
    if (!user?.school_id || !deleteFineId) return;
    setIsProcessingFine(true);
    try {
      const { error } = await supabase
        .from('special_fines')
        .delete()
        .eq('id', deleteFineId)
        .eq('school_id', user.school_id);

      if (error) throw error;
      setSpecialFines(prev => prev.filter(fine => fine.id !== deleteFineId));
      toast.showToast('Special fine deleted successfully.', 'success');
      cancelDeleteFine();
    } catch (error) {
      console.error('Failed to delete special fine:', error);
      toast.showToast('Failed to delete special fine', 'error');
    } finally {
      setIsProcessingFine(false);
    }
  };

  if (!user?.school_id) {
    return (
      <Container>
        <Card>
          <HeadingRow>
            <HeadingIcon>
              <InfoOutlined />
            </HeadingIcon>
            <Heading>No school selected</Heading>
          </HeadingRow>
          <Description>Please sign in with a school account to manage special fines.</Description>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <HeadingRow>
        <HeadingIcon>
          <AddCircle />
        </HeadingIcon>
        <div>
          <Heading>Special Fines</Heading>
          </div>
      </HeadingRow>

      <PageGrid>
        <Card>
          <HeadingRow>
            <HeadingIcon>
              <CalendarToday />
            </HeadingIcon>
            <Heading>Assign Student Fine</Heading>
          </HeadingRow>

          <AssignRow>
            <CompactField style={{ position: 'relative', flex: '2 1 280px' }} ref={studentSearchRef}>
              <Label>Student</Label>
              <SearchBar>
                <Search style={{ color: theme.TEXT_SECONDARY, fontSize: '1rem' }} />
                <SearchInput
                  placeholder="Search student name or id"
                  value={studentSearch}
                  onChange={e => {
                    setStudentSearch(e.target.value);
                    setShowStudentSuggestions(true);
                    setActiveStudentSuggestion(0);
                    setSelectedStudent(null);
                  }}
                  onFocus={() => {
                    if (studentSuggestionsList.length > 0) {
                      setShowStudentSuggestions(true);
                    }
                  }}
                  onKeyDown={e => {
                    if (!studentSuggestionsList.length) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setActiveStudentSuggestion(s => Math.min(s + 1, studentSuggestionsList.length - 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setActiveStudentSuggestion(s => Math.max(s - 1, 0));
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      const student = studentSuggestionsList[activeStudentSuggestion];
                      if (student) {
                        setSelectedStudent(student);
                        setStudentSearch(`${student.name} · ${student.father_name || '—'} · ${getClassName(student.class_id)}${getClassName(student.class_id) && getSectionName(student.section_id) ? `/${getSectionName(student.section_id)}` : ''} · ${getStudentDisplayId(student)}`);
                        setShowStudentSuggestions(false);
                      }
                    }
                  }}
                />
              </SearchBar>
              {showStudentSuggestions && studentSuggestionsList.length > 0 && (
                <SuggestionList>
                  {studentSuggestionsList.map((student, index) => (
                    <SuggestionItem
                      key={student.id}
                      active={index === activeStudentSuggestion}
                      onMouseDown={e => {
                        e.preventDefault();
                        setSelectedStudent(student);
                        setStudentSearch(`${student.name} · ${student.father_name || '—'} · ${getClassName(student.class_id)}${getClassName(student.class_id) && getSectionName(student.section_id) ? `/${getSectionName(student.section_id)}` : ''} · ${getStudentDisplayId(student)}`);
                        setShowStudentSuggestions(false);
                      }}
                    >
                      <SuggestionItemRow>
                        <SuggestionMain>
                          <SuggestionAvatar>
                            {student.picture_url ? (
                              <img
                                src={student.picture_url}
                                alt={student.name || 'Student'}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              student.name ? student.name.charAt(0).toUpperCase() : '?'
                            )}
                          </SuggestionAvatar>
                          <SuggestionInfo>
                            <SuggestionName>{student.name}</SuggestionName>
                            <SuggestionFather>{student.father_name || ''}</SuggestionFather>
                            <SuggestionSub>
                              {getClassName(student.class_id)}{getClassName(student.class_id) && getSectionName(student.section_id) ? ` • ${getSectionName(student.section_id)}` : ''}
                            </SuggestionSub>
                          </SuggestionInfo>
                        </SuggestionMain>
                        <SuggestionMetaCol>
                          <SuggestionClass>{student.roll_number || 'No ID'}</SuggestionClass>
                          <SuggestionId>ID: {getStudentDisplayId(student)}</SuggestionId>
                        </SuggestionMetaCol>
                      </SuggestionItemRow>
                    </SuggestionItem>
                  ))}
                </SuggestionList>
              )}
            </CompactField>

            <CompactField style={{ position: 'relative', flex: '2 1 280px' }}>
              <Label>Description</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <StyledSelect
                  value={isCustomDescription ? '__custom__' : description}
                  onChange={e => {
                    if (e.target.value === '__custom__') {
                      setIsCustomDescription(true);
                      setDescription('');
                    } else {
                      setIsCustomDescription(false);
                      setDescription(e.target.value);
                    }
                  }}
                >
                  <option value="" disabled>Select description</option>
                  {descriptions.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                  <option value="__custom__">Custom...</option>
                </StyledSelect>
                {isCustomDescription && (
                  <Input
                    placeholder="Custom description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    style={{ flex: 1, marginLeft: '0.5rem' }}
                  />
                )}
                <ActionButton onClick={() => setShowDescriptionModal(true)} title="Manage descriptions">
                  <AddCircle />
                </ActionButton>
              </div>
            </CompactField>

            <CompactField>
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </CompactField>

            <ButtonSmall onClick={handleSave} disabled={saving}>
              <AddCircle style={{ fontSize: '1.05rem' }} />
              {saving ? 'Saving' : 'Add'}
            </ButtonSmall>
          </AssignRow>
        </Card>

        <Card>
          {loading ? (
            <Loader />
          ) : (
            <>
              <TableHeaderBar>
                <SummaryInline>
                  <SummaryInlineItem>Total: {enrichedSpecialFines.length}</SummaryInlineItem>
                  <SummaryInlineItem>Amount: Rs.{Math.round(totalAmount).toLocaleString()}</SummaryInlineItem>
                </SummaryInline>
                <HeaderSearchBar>
                  <Search style={{ color: theme.TEXT_SECONDARY, fontSize: '1rem' }} />
                  <SearchInput
                    placeholder="Search entries"
                    value={tableSearch}
                    onChange={e => setTableSearch(e.target.value)}
                    style={{ marginLeft: '0.75rem' }}
                  />
                </HeaderSearchBar>
              </TableHeaderBar>
              <TableWrapper>
                <Table>
                  <thead>
                  <tr>
                    <Th>ID</Th>
                    <Th>Student</Th>
                    <Th>Father</Th>
                    <Th>Class / Section</Th>
                    <Th>Description</Th>
                    <Th>Amount</Th>
                    <Th>Created</Th>
                    <Th>Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSpecialFines.length === 0 ? (
                    <tr>
                      <Td colSpan={8}>
                        <EmptyState>
                          No special fines found. Add one above to get started.
                        </EmptyState>
                      </Td>
                    </tr>
                  ) : (
                    visibleSpecialFines.map(fine => (
                      <tr key={fine.id}>
                        <Td>{getStudentDisplayId(fine.student || { id: fine.student_id })}</Td>
                        <Td>
                          <strong style={{ fontSize: '0.95rem', color: theme.TEXT_PRIMARY }}>
                            {fine.student?.name || 'Unknown student'}
                          </strong>
                        </Td>
                        <Td>{fine.student?.father_name || '—'}</Td>
                        <Td>{formatClassSection(fine.student?.class_id, fine.student?.section_id)}</Td>
                        <Td style={{ color: theme.ACCENT, fontWeight: 600 }}>{fine.description || 'Special Fine'}</Td>
                        <Td style={{ color: '#dc2626', fontWeight: 700 }}>
                          Rs.{Math.round(Number(fine.amount || 0)).toLocaleString()}
                        </Td>
                        <Td>{fine.created_at ? formatAppDate(fine.created_at) : '—'}</Td>
                        <Td>
                          <ActionButton type="button" onClick={() => openEditFine(fine)} title="Edit special fine">
                            <Edit style={{ fontSize: '1rem', color: theme.ACCENT }} />
                          </ActionButton>
                          <ActionButton type="button" onClick={() => openDeleteFine(fine.id)} title="Delete special fine">
                            <DeleteIcon style={{ fontSize: '1rem', color: '#ef4444' }} />
                          </ActionButton>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </TableWrapper>
            </>
          )}
        </Card>
      </PageGrid>

      {showEditModal && ReactDOM.createPortal(
        <ModalOverlay onClick={cancelEditFine}>
          <ModalDialog onClick={e => e.stopPropagation()}>
            <ModalTitle>Edit Special Fine</ModalTitle>
            <ModalRow>
              <Label>Description</Label>
              <Input
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
              />
            </ModalRow>
            <ModalRow>
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={editAmount}
                onChange={e => setEditAmount(e.target.value)}
              />
            </ModalRow>
            <ModalButtonRow>
              <ModalButton type="button" onClick={cancelEditFine}>Cancel</ModalButton>
              <ModalButton type="button" primary onClick={saveEditFine} disabled={isProcessingFine}>
                {isProcessingFine ? 'Saving...' : 'Save'}
              </ModalButton>
            </ModalButtonRow>
          </ModalDialog>
        </ModalOverlay>,
        document.body
      )}

      {showDeleteModal && ReactDOM.createPortal(
        <ModalOverlay onClick={cancelDeleteFine}>
          <ModalDialog onClick={e => e.stopPropagation()}>
            <ModalTitle>Delete Special Fine</ModalTitle>
            <ModalMessage>Are you sure you want to delete this special fine? This action cannot be undone.</ModalMessage>
            <ModalButtonRow>
              <ModalButton type="button" onClick={cancelDeleteFine}>Cancel</ModalButton>
              <ModalButton type="button" primary onClick={confirmDeleteFine} disabled={isProcessingFine}>
                {isProcessingFine ? 'Deleting...' : 'Delete'}
              </ModalButton>
            </ModalButtonRow>
          </ModalDialog>
        </ModalOverlay>,
        document.body
      )}
{showDescriptionModal && (
  <DescriptionModal
    open={showDescriptionModal}
    onClose={() => setShowDescriptionModal(false)}
    onRefresh={async () => {
      const { data, error } = await supabase
        .from('specialfines_descriptions')
        .select('id, name')
        .eq('school_id', user?.school_id)
        .order('name', { ascending: true });
      if (!error) setDescriptions(data as any);
    }}
  />
)}

    </Container>
  );
};

export default SpecialFines;
