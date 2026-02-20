import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import styled from 'styled-components';
import { ExpandMore, ExpandLess, Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon, Close as CloseIcon } from '@mui/icons-material';
import { feeService } from '../../../services/feeService';
import { FeePlanWithItems } from '../../../types/fee';
import { FeeHead } from '../../../types/fee';
import { FeePlanItemsTable } from './FeePlanItemsTable';
import { FeePlanForm } from './FeePlanForm';
import { FeePlanFormData, FeePlanItemFormData } from '../types';
import { useToast } from '../../../components/useToast';
import { supabase } from '../../../supabaseClient';
import { usePageFooter } from '../../../components/Layout/contexts/PageFooterContext';
import { ThemeContext, darkTheme, lightTheme, useTheme } from '../../../components/Layout';
import { fetchAllRows } from '../../../utils/paginationHelper';
import { FeeStructure } from '../../../types/fee';
import { Add as AddIcon } from '@mui/icons-material';

// Segmented pagination components (matching StudentList.tsx)
const SEGMENTED_HEIGHT = '32px';

const SegmentedGroup = styled.div<{ theme?: any }>`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme?.BG === '#252525' ? '#222' : '#f3f4f6'};
  border-radius: 11px;
  box-shadow: 1.4px 1.4px 4px #2222;
  overflow: hidden;
  @media (max-width: 700px) {
    width: 100%;
    justify-content: center;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    border-radius: 8px;
  }
`;

const SegmentedButton = styled.button<{ active?: boolean; first?: boolean; last?: boolean }>`
  font-family: inherit;
  font-size: 0.77em;
  font-weight: 400;
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  box-shadow: 1.4px 1.4px 4px #2222;
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  padding: 0 1.12em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35em;
  border-radius: 0;
  box-sizing: border-box;
  ${({ first }) => first && `
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  `}
  ${({ last }) => last && `
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  cursor: pointer;
  background: ${({ active, theme }) => {
    if (active) return theme?.ACCENT || '#4a6cf7';
    // Inactive button background - should match SegmentedBase
    return theme?.BG === '#252525' ? '#444' : '#f3f4f6';
  }};
  color: ${({ active, theme }) => {
    if (active) return '#fff';
    // Inactive button text color
    return theme?.BG === '#252525' ? '#C0C0C0' : '#444';
  }};
  border: 1.5px solid ${({ active, theme }) => active ? (theme?.ACCENT || '#4a6cf7') : (theme?.FIELD_BORDER || '#3a3f4b')};
  font-weight: ${({ active }) => active ? 700 : 400};
  text-align: center;
  &:hover:not(:disabled), &:focus:not(:disabled) {
    background: ${({ active, theme }) => {
      if (active) return theme?.ACCENT || '#4a6cf7';
      // Hover background for inactive buttons
      return theme?.BG === '#252525' ? '#353535' : '#e5e7eb';
    }};
    opacity: ${({ active }) => active ? 1 : 0.92};
    border: 1.5px solid ${({ active, theme }) => active ? (theme?.ACCENT || '#4a6cf7') : (theme?.FIELD_BORDER || '#3a3f4b')};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  & svg {
    font-size: 15px;
    vertical-align: middle;
    display: inline-block;
  }
  @media (max-width: 700px) {
    width: 100%;
    min-width: 0;
  }
`;

const TableContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'};
`;

const TableHeaderRow = styled.tr`
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
`;

const TableHeader = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr<{ $isExpanded?: boolean }>`
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  transition: background 0.2s ease;
  cursor: pointer;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'};
  }
  
  ${({ $isExpanded }) => $isExpanded && `
    background: ${({ theme }: any) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  `}
`;

const TableCell = styled.td`
  padding: 12px 16px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  vertical-align: middle;
`;

const ExpandCell = styled(TableCell)`
  width: 40px;
  text-align: center;
`;

const ExpandButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'};
  }
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  cursor: pointer;
  transition: all 0.2s ease;
  margin-right: 4px;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'};
  }
`;

const ExpandedRow = styled.tr`
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)'};
`;

const ExpandedCell = styled.td`
  padding: 0;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

const ExpandedContent = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const SummaryRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  padding: 12px;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)'};
  border-radius: 6px;
`;

const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SummaryLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SummaryValue = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const DiscountBadge = styled.span`
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  background: #6366f1;
  color: white;
  margin-left: 8px;
`;

const AvailableFeeHeadsSection = styled.div`
  margin-top: 24px;
  padding-top: 24px;
  border-top: 2px solid ${({ theme }) => theme.BORDER};
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 16px 0;
`;

const AvailableFeeHeadsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
`;

const AvailableTableHeader = styled.thead`
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
`;

const AvailableHeaderRow = styled.tr`
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
`;

const AvailableHeaderCell = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-weight: 700;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  white-space: nowrap;
`;

const AvailableTableBody = styled.tbody``;

const AvailableFeeHeadRow = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.BORDER}40;
  transition: background 0.2s;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'};
  }
`;

const AvailableBodyCell = styled.td`
  padding: 12px 16px;
  vertical-align: middle;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  background: ${({ theme }) => theme.ACCENT};
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.85rem;
  font-weight: 500;
  gap: 4px;
  
  &:hover {
    background: ${({ theme }) => theme.ACCENT}dd;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ReadOnlyText = styled.div<{ $color?: string }>`
  padding: 8px 10px;
  color: ${({ theme, $color }) => $color || theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  text-align: right;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-weight: ${({ $color }) => $color ? '600' : 'normal'};
`;

const ReadOnlyTextLeft = styled.div`
  padding: 8px 10px;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  text-align: left;
  min-height: 38px;
  display: flex;
  align-items: center;
`;

const FeeHeadName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
`;

const PaginationInfo = styled.div<{ theme?: any }>`
  font-size: 0.9rem;
  color: ${({ theme }) => theme?.TEXT_SECONDARY || '#666'};
  
  @media (max-width: 768px) {
    text-align: center;
    width: 100%;
    font-size: 0.85rem;
    line-height: 1.4;
  }
`;

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    gap: 0.375rem;
  }
`;

interface FeePlansTableProps {
  schoolId: number;
  studentId?: number;
  sessionId?: number;
  feeHeads: FeeHead[];
  onRefresh?: () => void;
  searchQuery?: string;
}

export const FeePlansTable: React.FC<FeePlansTableProps> = ({
  schoolId,
  studentId,
  sessionId,
  feeHeads,
  onRefresh,
  searchQuery = ''
}) => {
  const toast = useToast();
  const { theme } = useTheme();
  const { setFooterContent } = usePageFooter();
  const [plans, setPlans] = useState<FeePlanWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlans, setExpandedPlans] = useState<Set<number>>(new Set());
  const [editingPlan, setEditingPlan] = useState<FeePlanWithItems | null>(null);
  const [formData, setFormData] = useState<FeePlanFormData | null>(null);
  const [studentsMap, setStudentsMap] = useState<Map<number, { name: string; rollNumber?: string; className?: string; sectionName?: string }>>(new Map());
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [studentClassInfo, setStudentClassInfo] = useState<{ classId: number; sectionId?: number } | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadPlans = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const fetchedPlans = await feeService.getAllFeePlans(schoolId, studentId);
      setPlans(fetchedPlans);

      // Clear students map - will be loaded on-demand for visible plans
      setStudentsMap(new Map());
    } catch (error: any) {
      console.error('Error loading fee plans:', error);
      toast.showToast(error.message || 'Failed to load fee plans', 'error');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId, studentId, sessionId, toast]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const toggleExpand = (planId: number) => {
    setExpandedPlans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(planId)) {
        newSet.delete(planId);
        setEditingPlan(null);
        setFormData(null);
      } else {
        newSet.add(planId);
      }
      return newSet;
    });
  };

  const handleEdit = async (plan: FeePlanWithItems) => {
    setEditingPlan(plan);
    setFormData({
      effectiveFrom: plan.effectiveFrom,
      notes: plan.notes,
      items: plan.items.map(item => ({
        feeHeadId: item.feeHeadId,
        actualFee: item.actualFee,
        discountAmount: item.discountAmount,
        discountPercent: item.discountPercent,
        feeAfterDiscount: item.feeAfterDiscount,
        discountType: item.discountType,
        discountReason: item.discountReason
      }))
    });
    
    // Reset fee structures and class info
    setFeeStructures([]);
    setStudentClassInfo(null);
    
    // Get student's class information for filtering fee heads
    try {
      // Get active session
      const { data: activeSession } = await supabase
        .from('sessions')
        .select('id')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (activeSession) {
        const { data: historyData } = await supabase
          .from('student_class_history')
          .select('new_class_id, new_section_id')
          .eq('student_id', plan.studentId)
          .eq('session_id', activeSession.id)
          .eq('school_id', schoolId)
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (historyData) {
          const classId = historyData.new_class_id;
          setStudentClassInfo({
            classId: historyData.new_class_id,
            sectionId: historyData.new_section_id || undefined
          });
          
          // Fetch fee structures for this class
          const structuresData = await fetchAllRows(async (from, to) => {
            return await supabase
              .from('fee_structures')
              .select('*')
              .eq('school_id', schoolId)
              .eq('class_id', classId)
              .range(from, to);
          });
          
          const structures: FeeStructure[] = structuresData.map((item: any) => ({
            id: item.id,
            schoolId: item.school_id,
            classId: item.class_id,
            sectionId: item.section_id,
            sessionId: item.session_id,
            feeHeadId: item.fee_head_id,
            amount: item.amount,
            months: item.months || [],
            firstTime: item.first_time || false,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
          }));
          
          setFeeStructures(structures);
        }
      }
    } catch (error: any) {
      console.error('Error loading student class info:', error);
      // Continue with edit even if class info fails to load
    }
    
    if (!expandedPlans.has(plan.id)) {
      toggleExpand(plan.id);
    }
  };
  
  const handleAddFeeHead = (feeHeadId: number) => {
    if (!formData) return;
    
    const feeHead = feeHeads.find(fh => fh.id === feeHeadId);
    if (!feeHead) return;
    
    // Check if fee head is already in the plan
    if (formData.items.some(item => item.feeHeadId === feeHeadId)) {
      toast.showToast('This fee head is already in the plan', 'error');
      return;
    }
    
    // Get amount from fee structure or use default
    const structure = feeStructures.find(s => s.feeHeadId === feeHeadId);
    const amount = structure?.amount || feeHead.defaultAmount || 0;
    
    // Add new fee head to the plan
    const newItem: FeePlanItemFormData = {
      feeHeadId: feeHeadId,
      actualFee: amount,
      discountAmount: 0,
      discountPercent: 0,
      feeAfterDiscount: amount,
      discountType: undefined,
      discountReason: undefined
    };
    
    setFormData(prev => prev ? {
      ...prev,
      items: [...prev.items, newItem]
    } : null);
    
    toast.showToast(`Added "${feeHead.name}" to fee plan`, 'success');
  };

  const handleSave = async () => {
    if (!editingPlan || !formData || saving) return;

    setSaving(true);
    try {
      await feeService.createOrUpdateFeePlan(
        schoolId,
        editingPlan.studentId,
        formData,
        undefined
      );
      toast.showToast('Fee plan updated successfully!', 'success');
      setEditingPlan(null);
      setFormData(null);
      await loadPlans();
      onRefresh?.();
    } catch (error: any) {
      console.error('Error saving fee plan:', error);
      toast.showToast(error.message || 'Failed to save fee plan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan: FeePlanWithItems) => {
    if (!window.confirm('Are you sure you want to delete this fee plan?')) return;

    try {
      await feeService.deleteFeePlan(schoolId, plan.studentId);
      toast.showToast('Fee plan deleted successfully!', 'success');
      await loadPlans();
      onRefresh?.();
    } catch (error: any) {
      console.error('Error deleting fee plan:', error);
      toast.showToast(error.message || 'Failed to delete fee plan', 'error');
    }
  };

  const calculateTotals = (items: FeePlanItemFormData[]) => {
    return items.reduce((acc, item) => ({
      actualFee: acc.actualFee + item.actualFee,
      discountAmount: acc.discountAmount + item.discountAmount,
      feeAfterDiscount: acc.feeAfterDiscount + item.feeAfterDiscount
    }), { actualFee: 0, discountAmount: 0, feeAfterDiscount: 0 });
  };

  // Filter plans by search query
  // When searching, we need student data for all plans to filter correctly
  const filteredPlans = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return plans;
    
    const query = searchQuery.toLowerCase().trim();
    
    // Get all student IDs from plans
    const allStudentIds = new Set(plans.map(p => p.studentId));
    const allStudentDataLoaded = Array.from(allStudentIds).every(id => studentsMap.has(id));
    
    // If not all student data is loaded yet, return all plans (will filter once data loads)
    if (!allStudentDataLoaded) {
      return plans;
    }
    
    // All student data loaded - filter properly
    return plans.filter(plan => {
      const studentInfo = studentsMap.get(plan.studentId);
      if (!studentInfo) return false;
      
      const name = studentInfo?.name?.toLowerCase() || '';
      const rollNumber = studentInfo?.rollNumber?.toLowerCase() || '';
      const className = studentInfo?.className?.toLowerCase() || '';
      const sectionName = studentInfo?.sectionName?.toLowerCase() || '';
      
      return name.includes(query) || 
             rollNumber.includes(query) || 
             className.includes(query) || 
             sectionName.includes(query);
    });
  }, [plans, searchQuery, studentsMap]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredPlans.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPlans = useMemo(() => {
    return filteredPlans.slice(startIndex, endIndex);
  }, [filteredPlans, startIndex, endIndex]);
  
  // Load student data for visible plans, or all plans when searching
  useEffect(() => {
    if (!schoolId) return;
    
    const loadStudentDataForPage = async () => {
      // When searching, load data for all plans to enable proper filtering
      // Otherwise, only load data for visible plans (performance optimization)
      const plansToLoad = searchQuery && searchQuery.trim() ? plans : paginatedPlans;
      if (plansToLoad.length === 0) return;
      
      const studentIdsToLoad = Array.from(new Set(plansToLoad.map(p => p.studentId)));
      const missingStudentIds = studentIdsToLoad.filter(id => !studentsMap.has(id));
      
      if (missingStudentIds.length === 0) return; // All student data already loaded
      
      try {
        // Get active session for class history lookup
        const { data: activeSession } = await supabase
          .from('sessions')
          .select('id')
          .eq('school_id', schoolId)
          .eq('is_active', true)
          .maybeSingle();
        
        // Fetch students in chunks
        const allStudents: any[] = [];
        const chunkSize = 1000;
        for (let i = 0; i < missingStudentIds.length; i += chunkSize) {
          const chunk = missingStudentIds.slice(i, i + chunkSize);
          const chunkStudents = await fetchAllRows(async (from, to) => {
            return await supabase
              .from('students')
              .select('id, name, roll_number')
              .eq('school_id', schoolId)
              .in('id', chunk)
              .range(from, to);
          });
          allStudents.push(...chunkStudents);
        }
        
        // Fetch class history
        const allClassHistory: any[] = [];
        if (activeSession) {
          for (let i = 0; i < missingStudentIds.length; i += chunkSize) {
            const chunk = missingStudentIds.slice(i, i + chunkSize);
            const chunkHistory = await fetchAllRows(async (from, to) => {
              return await supabase
                .from('student_class_history')
                .select('student_id, new_class_id, new_section_id')
                .eq('school_id', schoolId)
                .eq('session_id', activeSession.id)
                .in('student_id', chunk)
                .order('id', { ascending: false })
                .range(from, to);
            });
            allClassHistory.push(...chunkHistory);
          }
        }
        
        // Get latest class history for each student
        const classHistoryMap = new Map<number, { classId: number; sectionId?: number }>();
        allClassHistory.forEach((history: any) => {
          if (!classHistoryMap.has(history.student_id)) {
            classHistoryMap.set(history.student_id, {
              classId: history.new_class_id,
              sectionId: history.new_section_id || undefined
            });
          }
        });
        
        // Fetch class and section names
        const classIds = Array.from(new Set(Array.from(classHistoryMap.values()).map(ch => ch.classId).filter(Boolean)));
        const sectionIds = Array.from(new Set(Array.from(classHistoryMap.values()).map(ch => ch.sectionId).filter(Boolean)));
        
        const classesMap = new Map<number, string>();
        const sectionsMap = new Map<number, string>();
        
        if (classIds.length > 0) {
          for (let i = 0; i < classIds.length; i += chunkSize) {
            const chunk = classIds.slice(i, i + chunkSize);
            const chunkClasses = await fetchAllRows(async (from, to) => {
              return await supabase
                .from('classes')
                .select('id, name')
                .eq('school_id', schoolId)
                .in('id', chunk)
                .range(from, to);
            });
            chunkClasses.forEach((cls: any) => {
              classesMap.set(cls.id, cls.name);
            });
          }
        }
        
        if (sectionIds.length > 0) {
          for (let i = 0; i < sectionIds.length; i += chunkSize) {
            const chunk = sectionIds.slice(i, i + chunkSize);
            const chunkSections = await fetchAllRows(async (from, to) => {
              return await supabase
                .from('sections')
                .select('id, name')
                .eq('school_id', schoolId)
                .in('id', chunk)
                .range(from, to);
            });
            chunkSections.forEach((sec: any) => {
              sectionsMap.set(sec.id, sec.name);
            });
          }
        }
        
        // Update students map with new data
        setStudentsMap(prev => {
          const updated = new Map(prev);
          allStudents.forEach((student: any) => {
            const classHistory = classHistoryMap.get(student.id);
            updated.set(student.id, {
              name: student.name || 'Unknown',
              rollNumber: student.roll_number || '',
              className: classHistory ? classesMap.get(classHistory.classId) || '' : '',
              sectionName: classHistory?.sectionId ? sectionsMap.get(classHistory.sectionId) || '' : ''
            });
          });
          return updated;
        });
      } catch (error: any) {
        console.error('Error loading student data for page:', error);
        // Don't show toast - this is a background operation
      }
    };
    
    loadStudentDataForPage();
  }, [paginatedPlans, schoolId, studentsMap, searchQuery, plans]);

  // Reset page when plans or search query change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredPlans.length, searchQuery]);

  // Set footer content for global footer
  useEffect(() => {
    if (plans.length > 0) {
      const FooterContentComponent = React.memo(() => {
        const themeObj = theme === 'dark' ? darkTheme : lightTheme;
        const from = startIndex + 1;
        const to = Math.min(endIndex, plans.length);
        const total = plans.length;
        
        return (
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'center' : 'center',
            justifyContent: isMobile ? 'center' : 'space-between',
            width: '100%',
            gap: isMobile ? '0.5rem' : '1rem',
            flexWrap: isMobile ? 'nowrap' : 'wrap'
          }}>
            <PaginationInfo theme={themeObj} style={{ fontSize: isMobile ? '0.85rem' : '0.9rem' }}>
              {searchQuery ? `Showing ${from} to ${to} of ${total} results` : `Showing ${from} to ${to} of ${total} fee plans`}
            </PaginationInfo>
            {totalPages > 1 && (
              <PaginationControls theme={themeObj} style={{ flex: 'none', width: 'auto' }}>
                <SegmentedGroup theme={themeObj}>
                  <SegmentedButton
                    theme={themeObj}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    first
                    style={{ minWidth: 32 }}
                  >
                    ‹
                  </SegmentedButton>
                  {currentPage > 1 && (
                    <SegmentedButton
                      theme={themeObj}
                      onClick={() => setCurrentPage(currentPage - 1)}
                      style={{ minWidth: 32 }}
                    >
                      {currentPage - 1}
                    </SegmentedButton>
                  )}
                  <SegmentedButton
                    theme={themeObj}
                    active
                    disabled
                    style={{ minWidth: 32 }}
                  >
                    {currentPage}
                  </SegmentedButton>
                  {currentPage < totalPages && (
                    <SegmentedButton
                      theme={themeObj}
                      onClick={() => setCurrentPage(currentPage + 1)}
                      style={{ minWidth: 32 }}
                    >
                      {currentPage + 1}
                    </SegmentedButton>
                  )}
                  <SegmentedButton
                    theme={themeObj}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    last
                    style={{ minWidth: 32 }}
                  >
                    ›
                  </SegmentedButton>
                </SegmentedGroup>
              </PaginationControls>
            )}
          </div>
        );
      });

      setFooterContent({
        visible: true,
        content: <FooterContentComponent />
      });

      return () => {
        setFooterContent(null);
      };
    } else {
      setFooterContent(null);
    }
  }, [filteredPlans.length, startIndex, endIndex, currentPage, totalPages, isMobile, theme, setFooterContent, searchQuery]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading fee plans...</div>;
  }

  if (plans.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        <p>No fee plans found</p>
      </div>
    );
  }

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableHeaderRow>
            <TableHeader style={{ width: '40px' }}></TableHeader>
            <TableHeader>Student</TableHeader>
            <TableHeader>Class</TableHeader>
            <TableHeader>Effective From</TableHeader>
            <TableHeader style={{ textAlign: 'right' }}>Total Amount</TableHeader>
            <TableHeader style={{ textAlign: 'center' }}>Items</TableHeader>
            <TableHeader style={{ textAlign: 'center', width: '100px' }}>Actions</TableHeader>
          </TableHeaderRow>
        </TableHead>
        <TableBody>
          {paginatedPlans.map(plan => {
            const isExpanded = expandedPlans.has(plan.id);
            const isEditing = editingPlan?.id === plan.id;
            const studentInfo = studentsMap.get(plan.studentId);
            const totals = calculateTotals(plan.items.map(item => ({
              feeHeadId: item.feeHeadId,
              actualFee: item.actualFee,
              discountAmount: item.discountAmount,
              discountPercent: item.discountPercent,
              feeAfterDiscount: item.feeAfterDiscount
            })));

            return (
              <React.Fragment key={plan.id}>
                <TableRow $isExpanded={isExpanded} onClick={() => toggleExpand(plan.id)}>
                  <ExpandCell>
                    <ExpandButton onClick={(e) => { e.stopPropagation(); toggleExpand(plan.id); }}>
                      {isExpanded ? <ExpandLess /> : <ExpandMore />}
                    </ExpandButton>
                  </ExpandCell>
                  <TableCell>
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {studentInfo?.name || `Student #${plan.studentId}`}
                      </div>
                      {studentInfo?.rollNumber && (
                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>
                          {studentInfo.rollNumber}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {studentInfo?.className || '-'}
                    {studentInfo?.sectionName && ` / ${studentInfo.sectionName}`}
                  </TableCell>
                  <TableCell>{new Date(plan.effectiveFrom).toLocaleDateString()}</TableCell>
                  <TableCell style={{ textAlign: 'right', fontWeight: 600 }}>
                    Rs. {totals.feeAfterDiscount.toFixed(2)}
                  </TableCell>
                  <TableCell style={{ textAlign: 'center' }}>{plan.items.length}</TableCell>
                  <TableCell style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    {isEditing ? (
                      <ActionButton
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPlan(null);
                          setFormData(null);
                        }}
                        title="Cancel Edit"
                      >
                        <CloseIcon style={{ fontSize: '18px' }} />
                      </ActionButton>
                    ) : (
                      <ActionButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(plan);
                        }}
                        title="Edit"
                      >
                        <EditIcon style={{ fontSize: '18px' }} />
                      </ActionButton>
                    )}
                    <ActionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(plan);
                      }}
                      title="Delete"
                    >
                      <DeleteIcon style={{ fontSize: '18px' }} />
                    </ActionButton>
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <ExpandedRow>
                    <ExpandedCell colSpan={7}>
                      <ExpandedContent>
                        {isEditing && formData ? (
                          <>
                            <FeePlanForm
                              formData={formData}
                              onChange={(updates) => setFormData(prev => prev ? { ...prev, ...updates } : null)}
                            />
                            <FeePlanItemsTable
                              feeHeads={feeHeads}
                              items={formData.items}
                              onChange={(index, updates) => {
                                setFormData(prev => prev ? {
                                  ...prev,
                                  items: prev.items.map((item, i) => 
                                    i === index ? { ...item, ...updates } : item
                                  )
                                } : null);
                              }}
                              onRemoveItem={(index) => {
                                if (!formData) return;
                                const itemToRemove = formData.items[index];
                                const feeHead = feeHeads.find(fh => fh.id === itemToRemove.feeHeadId);
                                const confirmMessage = feeHead 
                                  ? `Are you sure you want to remove "${feeHead.name}" from this fee plan?`
                                  : 'Are you sure you want to remove this fee head from the fee plan?';
                                
                                if (window.confirm(confirmMessage)) {
                                  setFormData(prev => prev ? {
                                    ...prev,
                                    items: prev.items.filter((_, i) => i !== index)
                                  } : null);
                                }
                              }}
                            />
                            
                            {/* Available Fee Heads Section */}
                            {studentClassInfo && feeStructures.length > 0 && (() => {
                              // Filter fee heads to only those applicable to the student's class
                              const applicableFeeHeadIds = new Set(feeStructures.map(s => s.feeHeadId));
                              const applicableFeeHeads = feeHeads.filter(fh => applicableFeeHeadIds.has(fh.id));
                              
                              // Get fee heads that are NOT in the current plan
                              const currentFeeHeadIds = new Set(formData.items.map(item => item.feeHeadId));
                              const availableFeeHeads = applicableFeeHeads.filter(fh => !currentFeeHeadIds.has(fh.id));
                              
                              if (availableFeeHeads.length === 0) return null;
                              
                              return (
                                <AvailableFeeHeadsSection>
                                  <SectionTitle>Available Fee Heads (Not in Plan)</SectionTitle>
                                  <AvailableFeeHeadsTable>
                                    <AvailableTableHeader>
                                      <AvailableHeaderRow>
                                        <AvailableHeaderCell style={{ width: '20px' }}>#</AvailableHeaderCell>
                                        <AvailableHeaderCell style={{ width: '30%' }}>Fee Particulars</AvailableHeaderCell>
                                        <AvailableHeaderCell style={{ textAlign: 'right', width: '15%' }}>Default Amount</AvailableHeaderCell>
                                        <AvailableHeaderCell style={{ width: '35%' }}>Description</AvailableHeaderCell>
                                        <AvailableHeaderCell style={{ width: '20%', textAlign: 'center' }}>Action</AvailableHeaderCell>
                                      </AvailableHeaderRow>
                                    </AvailableTableHeader>
                                    <AvailableTableBody>
                                      {availableFeeHeads.map((feeHead, index) => {
                                        const structure = feeStructures.find(s => s.feeHeadId === feeHead.id);
                                        const defaultAmount = structure?.amount || feeHead.defaultAmount || 0;
                                        
                                        return (
                                          <AvailableFeeHeadRow key={feeHead.id}>
                                            <AvailableBodyCell>{index + 1}</AvailableBodyCell>
                                            <AvailableBodyCell>
                                              <FeeHeadName>{feeHead.name}</FeeHeadName>
                                            </AvailableBodyCell>
                                            <AvailableBodyCell>
                                              <ReadOnlyText>Rs. {defaultAmount.toFixed(2)}</ReadOnlyText>
                                            </AvailableBodyCell>
                                            <AvailableBodyCell>
                                              <ReadOnlyTextLeft style={{ fontSize: '0.85rem' }}>
                                                {feeHead.description || '-'}
                                              </ReadOnlyTextLeft>
                                            </AvailableBodyCell>
                                            <AvailableBodyCell style={{ textAlign: 'center' }}>
                                              <AddButton
                                                onClick={() => handleAddFeeHead(feeHead.id)}
                                                title={`Add ${feeHead.name} to fee plan`}
                                              >
                                                <AddIcon style={{ fontSize: '16px' }} />
                                                Add
                                              </AddButton>
                                            </AvailableBodyCell>
                                          </AvailableFeeHeadRow>
                                        );
                                      })}
                                    </AvailableTableBody>
                                  </AvailableFeeHeadsTable>
                                </AvailableFeeHeadsSection>
                              );
                            })()}
                            
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => {
                                  if (!saving) {
                                    setEditingPlan(null);
                                    setFormData(null);
                                    setFeeStructures([]);
                                    setStudentClassInfo(null);
                                  }
                                }}
                                disabled={saving}
                                style={{
                                  padding: '10px 20px',
                                  borderRadius: '8px',
                                  border: '1px solid #ddd',
                                  background: 'transparent',
                                  cursor: saving ? 'not-allowed' : 'pointer',
                                  opacity: saving ? 0.5 : 1,
                                  transition: 'all 0.2s'
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSave}
                                disabled={saving}
                                style={{
                                  padding: '10px 20px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: saving ? '#9ca3af' : '#6366f1',
                                  color: 'white',
                                  cursor: saving ? 'not-allowed' : 'pointer',
                                  fontWeight: 600,
                                  opacity: saving ? 0.7 : 1,
                                  transition: 'all 0.2s'
                                }}
                              >
                                {saving ? 'Saving...' : 'Save Changes'}
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            {plan.notes && (
                              <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '6px' }}>
                                <strong>Notes:</strong> {plan.notes}
                              </div>
                            )}
                            <FeePlanItemsTable
                              feeHeads={feeHeads}
                              items={plan.items.map(item => ({
                                feeHeadId: item.feeHeadId,
                                actualFee: item.actualFee,
                                discountAmount: item.discountAmount,
                                discountPercent: item.discountPercent,
                                feeAfterDiscount: item.feeAfterDiscount,
                                discountType: item.discountType,
                                discountReason: item.discountReason
                              }))}
                              onChange={() => {}}
                            />
                          </>
                        )}
                      </ExpandedContent>
                    </ExpandedCell>
                  </ExpandedRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

