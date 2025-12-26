import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Close as CloseIcon, 
  TrendingUp as TrendingUpIcon,
  Info as InfoIcon,
  Preview as PreviewIcon,
  CheckCircle as CheckCircleIcon,
  Percent as PercentIcon,
  AttachMoney as AttachMoneyIcon,
  FilterList as FilterListIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { feeService } from '../../../services/feeService';
import { FeeHead } from '../../../types/fee';
import { IncrementFormData, IncrementPreviewItem } from '../types';
import { supabase } from '../../../supabaseClient';
import { CircularProgress } from '@mui/material';
import { getStudentDisplayId, matchesStudentSearch } from '../../../utils/studentUtils';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  width: 100%;
  max-width: 900px;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.BORDER};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  background: linear-gradient(135deg, ${({ theme }) => theme.ACCENT}15 0%, ${({ theme }) => theme.ACCENT}08 100%);
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 10px;
  
  svg {
    color: ${({ theme }) => theme.ACCENT};
  }
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 4px;
  }
`;

const FormSection = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 4px;
  
  svg {
    color: ${({ theme }) => theme.ACCENT};
    font-size: 1.1rem;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Input = styled.input`
  padding: 12px 16px;
  border-radius: 8px;
  border: 2px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.ACCENT}20;
  }
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT}60;
  }
`;

const Select = styled.select`
  padding: 12px 16px;
  border-radius: 8px;
  border: 2px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.ACCENT}20;
  }
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT}60;
  }
  
  option {
    background: ${({ theme }) => theme.FIELD_BG};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
    padding: 8px;
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px 24px;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)'};
  
  @media (max-width: 600px) {
    flex-direction: column-reverse;
    
    button {
      width: 100%;
    }
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 140px;
  
  ${({ variant, theme }) => {
    if (variant === 'primary') {
      return `
        background: linear-gradient(135deg, ${theme.ACCENT} 0%, ${theme.ACCENT}dd 100%);
        color: white;
        box-shadow: 0 2px 8px ${theme.ACCENT}40;
        
        &:hover:not(:disabled) {
          background: linear-gradient(135deg, ${theme.ACCENT}dd 0%, ${theme.ACCENT} 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px ${theme.ACCENT}60;
        }
        
        &:active:not(:disabled) {
          transform: translateY(0);
        }
        
        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
      `;
    } else {
      return `
        background: ${theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
        color: ${theme.TEXT_PRIMARY};
        border: 2px solid ${theme.BORDER};
        
        &:hover:not(:disabled) {
          background: ${theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'};
          border-color: ${theme.ACCENT}60;
          transform: translateY(-1px);
        }
        
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `;
    }
  }}
`;

const InfoBox = styled.div`
  background: linear-gradient(135deg, ${({ theme }) => theme.ACCENT}15 0%, ${({ theme }) => theme.ACCENT}08 100%);
  border: 2px solid ${({ theme }) => theme.ACCENT}40;
  border-radius: 12px;
  padding: 16px 20px;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  line-height: 1.6;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  
  svg {
    color: ${({ theme }) => theme.ACCENT};
    flex-shrink: 0;
    margin-top: 2px;
  }
  
  strong {
    color: ${({ theme }) => theme.ACCENT};
    font-weight: 600;
  }
`;

const PreviewContainer = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)'};
  border: 2px solid ${({ theme }) => theme.ACCENT}30;
  border-radius: 12px;
  padding: 16px;
  max-height: 300px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.ACCENT}40;
    border-radius: 3px;
  }
`;

const PreviewItem = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT}60;
    transform: translateX(4px);
    box-shadow: 0 2px 8px ${({ theme }) => theme.ACCENT}20;
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const PreviewItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const PreviewItemTitle = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  margin-bottom: 4px;
`;

const PreviewItemSubtitle = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const PreviewItemAmount = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  margin-left: 16px;
`;

const AmountChange = styled.div<{ positive: boolean }>`
  font-weight: 600;
  color: ${({ positive, theme }) => positive ? '#10b981' : theme.ACCENT};
  font-size: 0.9rem;
`;

const AmountValue = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const TypeSelector = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const TypeOption = styled.div<{ selected: boolean }>`
  padding: 16px;
  border-radius: 10px;
  border: 2px solid ${({ selected, theme }) => selected ? theme.ACCENT : theme.BORDER};
  background: ${({ selected, theme }) => selected 
    ? `linear-gradient(135deg, ${theme.ACCENT}15 0%, ${theme.ACCENT}08 100%)`
    : theme.FIELD_BG};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 12px;
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT}60;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${({ theme }) => theme.ACCENT}20;
  }
  
  svg {
    color: ${({ selected, theme }) => selected ? theme.ACCENT : theme.TEXT_SECONDARY};
    font-size: 1.5rem;
  }
`;

const TypeOptionContent = styled.div`
  flex: 1;
`;

const TypeOptionTitle = styled.div<{ selected: boolean }>`
  font-weight: 600;
  color: ${({ selected, theme }) => selected ? theme.ACCENT : theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  margin-bottom: 4px;
`;

const TypeOptionDesc = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const SearchableMultiSelect = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SearchInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 2px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.FIELD_BG};
  transition: all 0.2s ease;
  
  &:focus-within {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.ACCENT}20;
  }
  
  svg {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    font-size: 1.1rem;
    flex-shrink: 0;
  }
`;

const SearchInputField = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  outline: none;
  
  &::placeholder {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
  }
`;

const ClearSearchButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  padding: 0;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

const SelectionList = styled.div`
  border: 2px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
  background: ${({ theme }) => theme.FIELD_BG};
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.ACCENT}40;
    border-radius: 3px;
  }
`;

const SelectionItem = styled.div<{ selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  }
  
  background: ${({ selected, theme }) => selected 
    ? `linear-gradient(135deg, ${theme.ACCENT}15 0%, ${theme.ACCENT}08 100%)`
    : 'transparent'};
`;

const SelectionCheckbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: ${({ theme }) => theme.ACCENT};
`;

const SelectionLabel = styled.label`
  flex: 1;
  cursor: pointer;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 8px;
  
  svg {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    font-size: 1rem;
  }
`;

const SelectionActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
`;

const SelectionActionButton = styled.button`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.ACCENT}20;
    border-color: ${({ theme }) => theme.ACCENT}60;
    color: ${({ theme }) => theme.ACCENT};
  }
`;

interface ApplyIncrementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: number;
  sessionId: number;
  feeHeads: FeeHead[];
}

export const ApplyIncrementModal: React.FC<ApplyIncrementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  schoolId,
  sessionId,
  feeHeads,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [preview, setPreview] = useState<IncrementPreviewItem[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [feeHeadSearchTerm, setFeeHeadSearchTerm] = useState('');
  
  const [formData, setFormData] = useState<IncrementFormData>({
    incrementType: 'percentage',
    incrementValue: 0,
    targetType: 'plans',
    preserveDiscountAmount: false,
    studentIds: undefined,
    classIds: undefined,
    feeHeadIds: undefined,
  });

  useEffect(() => {
    if (isOpen) {
      fetchClasses();
      fetchStudents();
    }
  }, [isOpen, schoolId]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');
      if (error) throw error;
      setClasses(data || []);
    } catch (error: any) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      // Fetch students with father name
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, father_name, roll_number')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .order('name');
      
      if (studentsError) throw studentsError;
      if (!studentsData || studentsData.length === 0) {
        setStudents([]);
        return;
      }

      // Fetch class history for current session to get class and section info
      const { data: historyData } = await supabase
        .from('student_class_history')
        .select(`
          student_id,
          new_class_id,
          new_section_id,
          new_classes:new_class_id(id, name),
          new_sections:new_section_id(id, name)
        `)
        .eq('session_id', sessionId)
        .eq('school_id', schoolId)
        .in('student_id', studentsData.map(s => s.id))
        .order('id', { ascending: true });

      // Create a map of latest class/section for each student
      const classMap = new Map();
      if (historyData) {
        // Group by student_id and get the latest record for each
        const studentRecordsMap = new Map();
        historyData.forEach((entry: any) => {
          const studentId = entry.student_id;
          if (!studentRecordsMap.has(studentId)) {
            studentRecordsMap.set(studentId, []);
          }
          studentRecordsMap.get(studentId).push(entry);
        });

        // Get the latest record (current class) for each student
        studentRecordsMap.forEach((records, studentId) => {
          if (records.length > 0) {
            const lastRecord = records[records.length - 1];
            const classObj = Array.isArray(lastRecord.new_classes) ? lastRecord.new_classes[0] : lastRecord.new_classes;
            const sectionObj = Array.isArray(lastRecord.new_sections) ? lastRecord.new_sections[0] : lastRecord.new_sections;
            classMap.set(studentId, {
              className: classObj?.name || null,
              sectionName: sectionObj?.name || null,
            });
          }
        });
      }

      // Merge class/section info with student data
      const studentsWithClass = studentsData.map((student: any) => ({
        ...student,
        className: classMap.get(student.id)?.className || null,
        sectionName: classMap.get(student.id)?.sectionName || null,
      }));

      setStudents(studentsWithClass);
    } catch (error: any) {
      console.error('Error fetching students:', error);
    }
  };

  const generatePreview = async () => {
    if (!formData.incrementValue || formData.incrementValue <= 0) {
      showToast('Please enter a valid increment value', 'error');
      return;
    }

    setPreviewLoading(true);
    try {
      const previewItems: IncrementPreviewItem[] = [];

      if (formData.targetType === 'plans' || formData.targetType === 'both') {
        const feePlans = await feeService.getAllFeePlans(schoolId);
        let plansToProcess = feePlans;
        
        if (formData.studentIds && formData.studentIds.length > 0) {
          plansToProcess = feePlans.filter(p => formData.studentIds!.includes(p.studentId));
        }

        for (const plan of plansToProcess) {
          const student = students.find(s => s.id === plan.studentId);
          const itemsToProcess = plan.items.filter(item => {
            if (formData.feeHeadIds && formData.feeHeadIds.length > 0) {
              return formData.feeHeadIds.includes(item.feeHeadId);
            }
            return true;
          });

          for (const item of itemsToProcess) {
            const feeHead = feeHeads.find(fh => fh.id === item.feeHeadId);
            let newActualFee: number;
            
            if (formData.incrementType === 'percentage') {
              newActualFee = item.actualFee * (1 + formData.incrementValue / 100);
            } else {
              newActualFee = item.actualFee + formData.incrementValue;
            }

            const newAmountRounded = Math.round(newActualFee * 100) / 100;
            const change = Math.round((newAmountRounded - item.actualFee) * 100) / 100;
            const changePercent = item.actualFee > 0 ? (change / item.actualFee) * 100 : 0;
            
            previewItems.push({
              id: `plan_${item.id}`,
              type: 'fee_plan',
              name: `${student?.name || `Student ${plan.studentId}`} - ${feeHead?.name || `Fee Head ${item.feeHeadId}`}`,
              studentName: student?.name,
              feeHeadName: feeHead?.name || `Fee Head ${item.feeHeadId}`,
              currentAmount: item.actualFee,
              newAmount: newAmountRounded,
              change: change,
              changePercent: changePercent,
            });
          }
        }
      }

      if (formData.targetType === 'structures' || formData.targetType === 'both') {
        let query = supabase
          .from('fee_structures')
          .select('*')
          .eq('school_id', schoolId);

        if (formData.classIds && formData.classIds.length > 0) {
          query = query.in('class_id', formData.classIds);
        }

        if (formData.feeHeadIds && formData.feeHeadIds.length > 0) {
          query = query.in('fee_head_id', formData.feeHeadIds);
        }

        const { data: structures, error } = await query;
        if (error) throw error;

        if (structures) {
          // Get unique class IDs to fetch class names
          const uniqueClassIds = Array.from(new Set(structures.map(s => s.class_id)));
          const { data: classesData } = await supabase
            .from('classes')
            .select('id, name')
            .in('id', uniqueClassIds)
            .eq('school_id', schoolId);
          
          const classMap = new Map((classesData || []).map(c => [c.id, c.name]));

          for (const struct of structures) {
            const feeHead = feeHeads.find(fh => fh.id === struct.fee_head_id);
            const className = classMap.get(struct.class_id);
            let newAmount: number;
            
            if (formData.incrementType === 'percentage') {
              newAmount = Number(struct.amount) * (1 + formData.incrementValue / 100);
            } else {
              newAmount = Number(struct.amount) + formData.incrementValue;
            }

            const currentAmount = Number(struct.amount);
            const newAmountRounded = Math.round(newAmount * 100) / 100;
            const change = Math.round((newAmountRounded - currentAmount) * 100) / 100;
            const changePercent = currentAmount > 0 ? (change / currentAmount) * 100 : 0;
            
            previewItems.push({
              id: `structure_${struct.id}`,
              type: 'fee_structure',
              name: `${className || `Class ${struct.class_id}`} - ${feeHead?.name || `Fee Head ${struct.fee_head_id}`}`,
              className: className,
              feeHeadName: feeHead?.name || `Fee Head ${struct.fee_head_id}`,
              currentAmount: currentAmount,
              newAmount: newAmountRounded,
              change: change,
              changePercent: changePercent,
            });
          }
        }
      }

      setPreview(previewItems);
    } catch (error: any) {
      showToast('Failed to generate preview', 'error');
      console.error('Preview error:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApply = async () => {
    if (!formData.incrementValue || formData.incrementValue <= 0) {
      showToast('Please enter a valid increment value', 'error');
      return;
    }

    if (preview.length === 0) {
      showToast('Please generate preview first', 'error');
      return;
    }

    setLoading(true);
    try {
      let totalUpdated = 0;
      let affectedStudents = 0;

      // Apply to fee plans if needed
      if (formData.targetType === 'plans' || formData.targetType === 'both') {
        const result = await feeService.applyIncrementToFeePlans(
          schoolId,
          sessionId,
          formData.incrementType,
          formData.incrementValue,
          {
            studentIds: formData.studentIds,
            feeHeadIds: formData.feeHeadIds,
            preserveDiscountAmount: formData.preserveDiscountAmount,
          },
          user?.id
        );
        totalUpdated += result.updatedCount;
        affectedStudents = result.affectedStudents;
      }

      // Apply to fee structures if needed
      if (formData.targetType === 'structures' || formData.targetType === 'both') {
        const result = await feeService.applyIncrementToFeeStructures(
          schoolId,
          sessionId,
          formData.incrementType,
          formData.incrementValue,
          {
            classIds: formData.classIds,
            feeHeadIds: formData.feeHeadIds,
          },
          user?.id
        );
        totalUpdated += result.updatedCount;
      }

      showToast(
        `Increment applied successfully! Updated ${totalUpdated} items${affectedStudents > 0 ? ` for ${affectedStudents} students` : ''}`,
        'success'
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Failed to apply increment', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <TrendingUpIcon />
            Apply Fee Increment
          </ModalTitle>
          <CloseButton onClick={onClose}>
            <CloseIcon />
          </CloseButton>
        </ModalHeader>
        <ModalBody>
          <InfoBox>
            <InfoIcon />
            <div>
              <strong>Important:</strong> Increments only affect fee plans and fee structures. 
              Already generated Challans will NOT be modified. New fee generations will use the updated amounts.
            </div>
          </InfoBox>

          <FormSection>
            <SectionTitle>
              <TrendingUpIcon />
              Increment Configuration
            </SectionTitle>
            
            <FormGroup>
              <Label>
                <PercentIcon style={{ fontSize: '1rem' }} />
                Increment Type
              </Label>
              <TypeSelector>
                <TypeOption
                  selected={formData.incrementType === 'percentage'}
                  onClick={() => setFormData({ ...formData, incrementType: 'percentage' })}
                >
                  <PercentIcon />
                  <TypeOptionContent>
                    <TypeOptionTitle selected={formData.incrementType === 'percentage'}>
                      Percentage
                    </TypeOptionTitle>
                    <TypeOptionDesc>Apply a percentage increase (e.g., 10%)</TypeOptionDesc>
                  </TypeOptionContent>
                </TypeOption>
                <TypeOption
                  selected={formData.incrementType === 'fixed'}
                  onClick={() => setFormData({ ...formData, incrementType: 'fixed' })}
                >
                  <AttachMoneyIcon />
                  <TypeOptionContent>
                    <TypeOptionTitle selected={formData.incrementType === 'fixed'}>
                      Fixed Amount
                    </TypeOptionTitle>
                    <TypeOptionDesc>Add a fixed amount (e.g., Rs. 500)</TypeOptionDesc>
                  </TypeOptionContent>
                </TypeOption>
              </TypeSelector>
            </FormGroup>

            <FormGroup>
              <Label>
                {formData.incrementType === 'percentage' ? <PercentIcon style={{ fontSize: '1rem' }} /> : <AttachMoneyIcon style={{ fontSize: '1rem' }} />}
                Increment Value {formData.incrementType === 'percentage' ? '(%)' : '(Rs.)'}
              </Label>
              <Input
                type="number"
                step={formData.incrementType === 'percentage' ? '0.1' : '1'}
                min="0"
                value={formData.incrementValue || ''}
                onChange={(e) => setFormData({ ...formData, incrementValue: parseFloat(e.target.value) || 0 })}
                onWheel={(e) => {
                  if (document.activeElement === e.currentTarget) {
                    e.currentTarget.blur();
                  }
                }}
                placeholder={formData.incrementType === 'percentage' ? 'e.g., 10' : 'e.g., 500'}
              />
            </FormGroup>

            <FormGroup>
              <Label>Target Type</Label>
              <Select
                value={formData.targetType}
                onChange={(e) => setFormData({ ...formData, targetType: e.target.value as 'plans' | 'structures' | 'both' })}
              >
                <option value="plans">Fee Plans Only</option>
                <option value="structures">Fee Structures Only</option>
                <option value="both">Both Plans & Structures</option>
              </Select>
            </FormGroup>
          </FormSection>

          <FormSection>
            <SectionTitle>
              <FilterListIcon />
              Filters (Optional)
            </SectionTitle>

            {(formData.targetType === 'plans' || formData.targetType === 'both') && (
              <FormGroup>
                <Label>Filter by Students</Label>
                <SearchableMultiSelect>
                  <SearchInputWrapper>
                    <SearchIcon />
                    <SearchInputField
                      type="text"
                      placeholder="Search students by name or roll number..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                    />
                    {studentSearchTerm && (
                      <ClearSearchButton
                        onClick={() => setStudentSearchTerm('')}
                        title="Clear search"
                      >
                        <ClearIcon style={{ fontSize: '1rem' }} />
                      </ClearSearchButton>
                    )}
                  </SearchInputWrapper>
                  
                  <SelectionList>
                    {(() => {
                      const filtered = students.filter(student => {
                        if (!studentSearchTerm.trim()) return true;
                        const searchLower = studentSearchTerm.toLowerCase();
                        // Use utility function for roll number matching
                        const rollMatch = matchesStudentSearch(student, studentSearchTerm);
                        // Also check name match
                        const nameMatch = student.name.toLowerCase().includes(searchLower);
                        return rollMatch.matches || nameMatch;
                      }).sort((a, b) => {
                        // Sort by match score if searching
                        if (studentSearchTerm.trim()) {
                          const aMatch = matchesStudentSearch(a, studentSearchTerm);
                          const bMatch = matchesStudentSearch(b, studentSearchTerm);
                          if (aMatch.matches && bMatch.matches) {
                            return bMatch.score - aMatch.score; // Higher score first
                          }
                          if (aMatch.matches) return -1;
                          if (bMatch.matches) return 1;
                        }
                        return 0;
                      });
                      
                      const allFilteredSelected = filtered.length > 0 && 
                        filtered.every(s => formData.studentIds?.includes(s.id));
                      
                      return (
                        <>
                          {filtered.length > 0 && (
                            <SelectionItem
                              selected={allFilteredSelected}
                              onClick={() => {
                                if (allFilteredSelected) {
                                  // Deselect all filtered
                                  const newIds = formData.studentIds?.filter(id => 
                                    !filtered.some(s => s.id === id)
                                  ) || [];
                                  setFormData({ ...formData, studentIds: newIds.length > 0 ? newIds : undefined });
                                } else {
                                  // Select all filtered
                                  const filteredIds = filtered.map(s => s.id);
                                  const newIds = Array.from(new Set([...(formData.studentIds || []), ...filteredIds]));
                                  setFormData({ ...formData, studentIds: newIds });
                                }
                              }}
                            >
                              <SelectionCheckbox
                                type="checkbox"
                                checked={allFilteredSelected}
                                onChange={() => {}}
                              />
                              <SelectionLabel>
                                <strong>Select All ({filtered.length})</strong>
                              </SelectionLabel>
                            </SelectionItem>
                          )}
                          {filtered.map(student => {
                            const isSelected = formData.studentIds?.includes(student.id) || false;
                            return (
                              <SelectionItem
                                key={student.id}
                                selected={isSelected}
                                onClick={() => {
                                  if (isSelected) {
                                    const newIds = formData.studentIds?.filter(id => id !== student.id) || [];
                                    setFormData({ ...formData, studentIds: newIds.length > 0 ? newIds : undefined });
                                  } else {
                                    const newIds = [...(formData.studentIds || []), student.id];
                                    setFormData({ ...formData, studentIds: newIds });
                                  }
                                }}
                              >
                                <SelectionCheckbox
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                />
                                <SelectionLabel>
                                  <span>
                                    {getStudentDisplayId(student)} - {student.name}
                                    {student.father_name && ` - ${student.father_name}`}
                                    {student.className && (
                                      <span style={{ opacity: 0.7 }}>
                                        {' - '}
                                        {student.className}
                                        {student.sectionName && `(${student.sectionName})`}
                                      </span>
                                    )}
                                  </span>
                                </SelectionLabel>
                              </SelectionItem>
                            );
                          })}
                          {filtered.length === 0 && (
                            <div style={{ 
                              padding: '20px', 
                              textAlign: 'center', 
                              color: 'inherit', 
                              opacity: 0.6,
                              fontSize: '0.9rem'
                            }}>
                              No students found matching "{studentSearchTerm}"
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </SelectionList>
                  
                  {formData.studentIds && formData.studentIds.length > 0 && (
                    <SelectionActions>
                      <SelectionActionButton
                        onClick={() => setFormData({ ...formData, studentIds: undefined })}
                      >
                        Clear All
                      </SelectionActionButton>
                    </SelectionActions>
                  )}
                  
                  <div style={{ fontSize: '0.8rem', color: 'inherit', opacity: 0.7, marginTop: '4px' }}>
                    {formData.studentIds && formData.studentIds.length > 0 
                      ? `${formData.studentIds.length} student(s) selected`
                      : 'Leave empty to apply to all students'}
                  </div>
                </SearchableMultiSelect>
              </FormGroup>
            )}

            {(formData.targetType === 'structures' || formData.targetType === 'both') && (
              <FormGroup>
                <Label>Filter by Classes</Label>
                <Select
                  multiple
                  value={formData.classIds?.map(String) || []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                    setFormData({ ...formData, classIds: selected.length > 0 ? selected : undefined });
                  }}
                  style={{ minHeight: '120px' }}
                >
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </Select>
                <div style={{ fontSize: '0.8rem', color: 'inherit', opacity: 0.7, marginTop: '4px' }}>
                  Leave empty to apply to all classes
                </div>
              </FormGroup>
            )}

            <FormGroup>
              <Label>Filter by Fee Heads</Label>
              <SearchableMultiSelect>
                <SearchInputWrapper>
                  <SearchIcon />
                  <SearchInputField
                    type="text"
                    placeholder="Search fee heads by name..."
                    value={feeHeadSearchTerm}
                    onChange={(e) => setFeeHeadSearchTerm(e.target.value)}
                  />
                  {feeHeadSearchTerm && (
                    <ClearSearchButton
                      onClick={() => setFeeHeadSearchTerm('')}
                      title="Clear search"
                    >
                      <ClearIcon style={{ fontSize: '1rem' }} />
                    </ClearSearchButton>
                  )}
                </SearchInputWrapper>
                
                <SelectionList>
                  {(() => {
                    const filtered = feeHeads.filter(feeHead => {
                      if (!feeHeadSearchTerm.trim()) return true;
                      const searchLower = feeHeadSearchTerm.toLowerCase();
                      return feeHead.name.toLowerCase().includes(searchLower) ||
                             String(feeHead.id).includes(searchLower);
                    });
                    
                    const allFilteredSelected = filtered.length > 0 && 
                      filtered.every(fh => formData.feeHeadIds?.includes(fh.id));
                    
                    return (
                      <>
                        {filtered.length > 0 && (
                          <SelectionItem
                            selected={allFilteredSelected}
                            onClick={() => {
                              if (allFilteredSelected) {
                                // Deselect all filtered
                                const newIds = formData.feeHeadIds?.filter(id => 
                                  !filtered.some(fh => fh.id === id)
                                ) || [];
                                setFormData({ ...formData, feeHeadIds: newIds.length > 0 ? newIds : undefined });
                              } else {
                                // Select all filtered
                                const filteredIds = filtered.map(fh => fh.id);
                                const newIds = Array.from(new Set([...(formData.feeHeadIds || []), ...filteredIds]));
                                setFormData({ ...formData, feeHeadIds: newIds });
                              }
                            }}
                          >
                            <SelectionCheckbox
                              type="checkbox"
                              checked={allFilteredSelected}
                              onChange={() => {}}
                            />
                            <SelectionLabel>
                              <strong>Select All ({filtered.length})</strong>
                            </SelectionLabel>
                          </SelectionItem>
                        )}
                        {filtered.map(feeHead => {
                          const isSelected = formData.feeHeadIds?.includes(feeHead.id) || false;
                          return (
                            <SelectionItem
                              key={feeHead.id}
                              selected={isSelected}
                              onClick={() => {
                                if (isSelected) {
                                  const newIds = formData.feeHeadIds?.filter(id => id !== feeHead.id) || [];
                                  setFormData({ ...formData, feeHeadIds: newIds.length > 0 ? newIds : undefined });
                                } else {
                                  const newIds = [...(formData.feeHeadIds || []), feeHead.id];
                                  setFormData({ ...formData, feeHeadIds: newIds });
                                }
                              }}
                            >
                              <SelectionCheckbox
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                              />
                              <SelectionLabel>
                                <span>{feeHead.name}</span>
                                {feeHead.description && (
                                  <span style={{ opacity: 0.6, fontSize: '0.85rem', marginLeft: '8px' }}>
                                    - {feeHead.description}
                                  </span>
                                )}
                              </SelectionLabel>
                            </SelectionItem>
                          );
                        })}
                        {filtered.length === 0 && (
                          <div style={{ 
                            padding: '20px', 
                            textAlign: 'center', 
                            color: 'inherit', 
                            opacity: 0.6,
                            fontSize: '0.9rem'
                          }}>
                            No fee heads found matching "{feeHeadSearchTerm}"
                          </div>
                        )}
                      </>
                    );
                  })()}
                </SelectionList>
                
                {formData.feeHeadIds && formData.feeHeadIds.length > 0 && (
                  <SelectionActions>
                    <SelectionActionButton
                      onClick={() => setFormData({ ...formData, feeHeadIds: undefined })}
                    >
                      Clear All
                    </SelectionActionButton>
                  </SelectionActions>
                )}
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: 'inherit', 
                  opacity: 0.7, 
                  marginTop: '8px',
                  padding: '8px',
                  textAlign: 'center'
                }}>
                  {formData.feeHeadIds && formData.feeHeadIds.length > 0 
                    ? `${formData.feeHeadIds.length} fee head(s) selected`
                    : 'Leave empty to apply to all fee heads'}
                </div>
              </SearchableMultiSelect>
            </FormGroup>

            {(formData.targetType === 'plans' || formData.targetType === 'both') && (
              <CheckboxContainer>
                <Checkbox
                  type="checkbox"
                  checked={formData.preserveDiscountAmount}
                  onChange={(e) => setFormData({ ...formData, preserveDiscountAmount: e.target.checked })}
                />
                <Label style={{ margin: 0, cursor: 'pointer', fontWeight: 500 }}>
                  Preserve Discount Amount (keep discount amount constant, recalculate percent)
                </Label>
              </CheckboxContainer>
            )}
          </FormSection>

          {preview.length > 0 && (
            <FormSection>
              <SectionTitle>
                <PreviewIcon />
                Preview ({preview.length} items will be updated)
              </SectionTitle>
              <PreviewContainer>
                {preview.slice(0, 15).map((item, idx) => (
                  <PreviewItem key={idx}>
                    <PreviewItemInfo>
                      <PreviewItemTitle>
                        {item.type === 'fee_plan' && item.studentName && (
                          <>👤 {item.studentName}</>
                        )}
                        {item.type === 'fee_structure' && item.className && (
                          <>📚 {item.className}</>
                        )}
                      </PreviewItemTitle>
                      <PreviewItemSubtitle>
                        {item.feeHeadName}
                      </PreviewItemSubtitle>
                    </PreviewItemInfo>
                    <PreviewItemAmount>
                      <AmountChange positive={item.change > 0}>
                        {item.change > 0 ? '+' : ''}Rs. {item.change.toFixed(2)}
                      </AmountChange>
                      <AmountValue>
                        Rs. {item.currentAmount.toFixed(2)} → Rs. {item.newAmount.toFixed(2)}
                      </AmountValue>
                    </PreviewItemAmount>
                  </PreviewItem>
                ))}
                {preview.length > 15 && (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '12px', 
                    color: 'inherit', 
                    opacity: 0.7,
                    fontSize: '0.85rem',
                    fontStyle: 'italic'
                  }}>
                    ... and {preview.length - 15} more items
                  </div>
                )}
              </PreviewContainer>
            </FormSection>
          )}
        </ModalBody>
        <ButtonGroup>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={generatePreview} disabled={loading || previewLoading}>
            {previewLoading ? (
              <>
                <CircularProgress size={16} style={{ color: 'inherit' }} />
                Generating...
              </>
            ) : (
              <>
                <VisibilityIcon style={{ fontSize: '1rem' }} />
                Generate Preview
              </>
            )}
          </Button>
          <Button variant="primary" onClick={handleApply} disabled={loading || preview.length === 0}>
            {loading ? (
              <>
                <CircularProgress size={16} style={{ color: 'white' }} />
                Applying...
              </>
            ) : (
              <>
                <CheckCircleIcon style={{ fontSize: '1rem' }} />
                Apply Increment
              </>
            )}
          </Button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

