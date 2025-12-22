import React, { useEffect, useState, useContext } from 'react';
import { useTheme } from '@mui/material';
import { ThemeContext, darkTheme, lightTheme } from '../../components/Layout';
import { ThemeProvider } from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseClient';
import { feeService } from '../../services/feeService';
import { FeeHead, FeePlanItem } from '../../types/fee';
import { PageContainer, Header, Title, MainContent } from './styles';
import { FeePlansTable } from './components/FeePlansTable';
import { CreateFeePlanModal } from './components/CreateFeePlanModal';
import { BulkCreateFeePlansModal } from './components/BulkCreateFeePlansModal';
import Loader from '../../components/Loader';
import NoSessionsFound from '../../components/NoSessionsFound';
import styled from 'styled-components';
import { Add as AddIcon, Search as SearchIcon, PlaylistAdd as BulkAddIcon } from '@mui/icons-material';
import { useToast } from '../../components/useToast';
import { fetchAllRows } from '../../utils/paginationHelper';

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.FIELD_BG || theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  outline: none;
  transition: all 0.2s;
  width: 200px;
  min-width: 150px;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}20;
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
  }
  
  @media (max-width: 768px) {
    width: 100%;
    min-width: 0;
  }
`;

const CompactSelect = styled.select`
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.FIELD_BG || theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  cursor: pointer;
  outline: none;
  transition: all 0.2s;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
  }
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  
  ${({ variant, theme }) => {
    if (variant === 'primary') {
      return `
        background: ${theme.ACCENT};
        color: white;
        
        &:hover:not(:disabled) {
          background: ${theme.ACCENT}dd;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px ${theme.ACCENT}40;
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
        border: 1px solid ${theme.BORDER};
        
        &:hover:not(:disabled) {
          background: ${theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'};
        }
        
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `;
    }
  }}
`;

const FeePlansContent: React.FC<{ theme: typeof darkTheme }> = ({ theme: customTheme }) => {
  const { user } = useAuth();
  const muiTheme = useTheme();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkCreating, setBulkCreating] = useState(false);
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [bulkCreateStats, setBulkCreateStats] = useState({
    totalStudents: 0,
    studentsNeedingPlans: 0,
    sessionName: ''
  });

  // Check for in-progress operations on mount
  useEffect(() => {
    if (user?.school_id && sessionId) {
      const progressKey = `bulk_create_fee_plans_${user.school_id}_${sessionId}`;
      const existingProgress = localStorage.getItem(progressKey);
      if (existingProgress) {
        try {
          const progressData = JSON.parse(existingProgress);
          // If operation is older than 5 minutes, clear it
          if (Date.now() - progressData.timestamp > 300000) {
            localStorage.removeItem(progressKey);
          }
        } catch (e) {
          localStorage.removeItem(progressKey);
        }
      }
    }
  }, [user?.school_id, sessionId]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.school_id) return;
      
      setLoading(true);
      try {
        // Fetch sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('*')
          .eq('school_id', user.school_id)
          .order('is_active', { ascending: false })
          .order('id', { ascending: false });

        if (sessionsError) throw sessionsError;
        setSessions(sessionsData || []);

        // Set active session
        const activeSession = sessionsData?.find((s: any) => s.is_active);
        if (activeSession) {
          setSessionId(activeSession.id);
        } else if (sessionsData && sessionsData.length > 0) {
          setSessionId(sessionsData[0].id);
        }

        // Fetch fee heads
        const heads = await feeService.getFeeHeads(user.school_id);
        setFeeHeads(heads);

      } catch (error: any) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user?.school_id]);

  const handleBulkCreateClick = async () => {
    if (!user?.school_id || !sessionId) {
      showToast('Please select a session first', 'error');
      return;
    }

    // Get session name
    const selectedSession = sessions.find(s => s.id === sessionId);
    const sessionName = selectedSession?.name || 'Unknown Session';

    try {
      // Get all students with class info for selected session
      const classHistory = await fetchAllRows(async (from, to) => {
        return await supabase
          .from('student_class_history')
          .select('student_id, new_class_id, new_section_id')
          .eq('school_id', user.school_id)
          .eq('session_id', sessionId)
          .range(from, to);
      });

      if (classHistory.length === 0) {
        showToast('No students found in selected session', 'error');
        return;
      }

      // Get unique student IDs
      const studentIdsSet = new Set(classHistory.map(ch => ch.student_id));
      const studentIds = Array.from(studentIdsSet);

      // Check which students already have fee plans
      const existingPlans = await fetchAllRows(async (from, to) => {
        return await supabase
          .from('fee_plans')
          .select('student_id')
          .eq('school_id', user.school_id)
          .in('student_id', studentIds)
          .range(from, to);
      });

      const existingStudentIds = new Set(existingPlans.map(p => p.student_id));
      const studentsNeedingPlans = studentIds.filter(id => !existingStudentIds.has(id));

      if (studentsNeedingPlans.length === 0) {
        showToast('All students already have fee plans', 'success');
        return;
      }

      // Set stats and show modal
      setBulkCreateStats({
        totalStudents: studentIds.length,
        studentsNeedingPlans: studentsNeedingPlans.length,
        sessionName
      });
      setShowBulkCreateModal(true);
    } catch (error: any) {
      console.error('Error preparing bulk create:', error);
      showToast(error.message || 'Failed to prepare bulk creation', 'error');
    }
  };

  const executeBulkCreate = async (
    onProgress?: (progress: number, step: string, success: number, errors: number, estimatedTime?: number) => void
  ) => {
    if (!user?.school_id || !sessionId) {
      throw new Error('Missing required data');
    }

    const progressKey = `bulk_create_fee_plans_${user.school_id}_${sessionId}`;
    const startTime = Date.now();
    let lastProgressUpdate = startTime;

    // Check if operation is already in progress
    const existingProgress = localStorage.getItem(progressKey);
    if (existingProgress) {
      const progressData = JSON.parse(existingProgress);
      if (progressData.status === 'in_progress' && Date.now() - progressData.timestamp < 300000) { // 5 minutes
        throw new Error('Bulk creation is already in progress. Please wait for it to complete.');
      }
    }

    // Mark operation as in progress
    localStorage.setItem(progressKey, JSON.stringify({
      status: 'in_progress',
      timestamp: Date.now(),
      schoolId: user.school_id,
      sessionId
    }));

    setBulkCreating(true);
    try {
      onProgress?.(1, 'Fetching student data...', 0, 0, undefined);

      // Get all students with class info for selected session
      const classHistory = await fetchAllRows(async (from, to) => {
        return await supabase
          .from('student_class_history')
          .select('student_id, new_class_id, new_section_id')
          .eq('school_id', user.school_id)
          .eq('session_id', sessionId)
          .range(from, to);
      });

      if (classHistory.length === 0) {
        throw new Error('No students found in selected session');
      }

      // Get unique student IDs
      const studentIdsSet = new Set(classHistory.map(ch => ch.student_id));
      const studentIds = Array.from(studentIdsSet);

      // Check which students already have fee plans
      const existingPlans = await fetchAllRows(async (from, to) => {
        return await supabase
          .from('fee_plans')
          .select('student_id')
          .eq('school_id', user.school_id)
          .in('student_id', studentIds)
          .range(from, to);
      });

      const existingStudentIds = new Set(existingPlans.map(p => p.student_id));
      const studentsNeedingPlans = studentIds.filter(id => !existingStudentIds.has(id));

      if (studentsNeedingPlans.length === 0) {
        throw new Error('All students already have fee plans');
      }

      onProgress?.(5, 'Fetching student details...', 0, 0, undefined);

      // Get students data in parallel chunks
      const students: any[] = [];
      const chunkSize = 1000;
      const fetchPromises: Promise<void>[] = [];
      
      for (let i = 0; i < studentsNeedingPlans.length; i += chunkSize) {
        const chunk = studentsNeedingPlans.slice(i, i + chunkSize);
        fetchPromises.push(
          Promise.resolve(
            supabase
              .from('students')
              .select('id, name')
              .eq('school_id', user.school_id)
              .in('id', chunk)
              .then(({ data, error }) => {
                if (error) throw error;
                if (data) students.push(...data);
              })
          )
        );
      }
      await Promise.all(fetchPromises);

      onProgress?.(10, 'Preparing batch data...', 0, 0, undefined);

      // Create a map for quick class history lookup
      const classHistoryMap = new Map(classHistory.map(ch => [ch.student_id, ch]));

      // Group students by class and prepare batch data
      const studentsByClass: Record<number, Array<{ id: number; name: string; classId: number; sectionId?: number }>> = {};
      
      students.forEach(student => {
        const history = classHistoryMap.get(student.id);
        if (history && history.new_class_id) {
          if (!studentsByClass[history.new_class_id]) {
            studentsByClass[history.new_class_id] = [];
          }
          studentsByClass[history.new_class_id].push({
            id: student.id,
            name: student.name,
            classId: history.new_class_id,
            sectionId: history.new_section_id || undefined
          });
        }
      });

      // Fetch all fee structures for all classes at once
      const allClassIds = Object.keys(studentsByClass).map(id => parseInt(id));
      const allStructures: any[] = [];
      
      if (allClassIds.length > 0) {
        const structureChunkSize = 100;
        for (let i = 0; i < allClassIds.length; i += structureChunkSize) {
          const classChunk = allClassIds.slice(i, i + structureChunkSize);
          const structuresData = await fetchAllRows(async (from, to) => {
            return await supabase
              .from('fee_structures')
              .select('*')
              .eq('school_id', user.school_id)
              .in('class_id', classChunk)
              .range(from, to);
          });
          allStructures.push(...structuresData);
        }
      }

      // Create structures map by class
      const structuresByClass = new Map<number, any[]>();
      allStructures.forEach(s => {
        if (!structuresByClass.has(s.class_id)) {
          structuresByClass.set(s.class_id, []);
        }
        structuresByClass.get(s.class_id)!.push(s);
      });

      onProgress?.(15, 'Preparing fee plans for batch creation...', 0, 0, undefined);

      // Prepare all fee plans for batch creation
      const feePlansToCreate: Array<{
        studentId: number;
        effectiveFrom: string;
        items: Omit<FeePlanItem, 'id' | 'feePlanId' | 'schoolId' | 'createdAt' | 'updatedAt'>[];
      }> = [];

      const effectiveFrom = new Date().toISOString().split('T')[0];
      const totalStudentsToProcess = studentsNeedingPlans.length;

      for (const [classId, classStudents] of Object.entries(studentsByClass)) {
        const structuresData = structuresByClass.get(parseInt(classId)) || [];
        const applicableFeeHeadIds = new Set(structuresData.map(s => s.fee_head_id));
        const filteredFeeHeads = feeHeads.filter(fh => applicableFeeHeadIds.has(fh.id));

        if (filteredFeeHeads.length === 0) {
          continue;
        }

        for (const student of classStudents) {
          const items = filteredFeeHeads.map(feeHead => {
            const structure = structuresData.find(s => s.fee_head_id === feeHead.id);
            const amount = structure?.amount || feeHead.defaultAmount || 0;
            
            return {
              feeHeadId: feeHead.id,
              actualFee: amount,
              discountAmount: 0,
              discountPercent: 0,
              feeAfterDiscount: amount,
              discountType: undefined,
              discountReason: undefined
            };
          });

          feePlansToCreate.push({
            studentId: student.id,
            effectiveFrom,
            items
          });
        }
      }

      onProgress?.(20, 'Creating fee plans in batches...', 0, 0, undefined);

      // Batch create fee plans (reduced batch size for better reliability)
      let successCount = 0;
      let errorCount = 0;
      const batchSize = 200;
      const totalBatches = Math.ceil(feePlansToCreate.length / batchSize);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batch = feePlansToCreate.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
        
        try {
          const result = await feeService.batchCreateFeePlans(
        user.school_id,
            batch,
        user.id
      );

          successCount += result.successCount;
          errorCount += result.errorCount;
        } catch (error: any) {
          console.error(`Error in batch ${batchIndex + 1}:`, error);
          errorCount += batch.length;
        }

        // Calculate progress and estimated time
        const processed = (batchIndex + 1) * batchSize;
        const actualProcessed = Math.min(processed, feePlansToCreate.length);
        const progress = 20 + (actualProcessed / feePlansToCreate.length) * 80;
        
        // Calculate estimated time
        const elapsed = Date.now() - startTime;
        const rate = actualProcessed / (elapsed / 1000); // items per second
        const remaining = feePlansToCreate.length - actualProcessed;
        const estimatedSeconds = rate > 0 ? remaining / rate : 0;
        
        // Update progress every batch or every 2 seconds
        const now = Date.now();
        if (batchIndex === totalBatches - 1 || now - lastProgressUpdate >= 2000) {
          onProgress?.(
            Math.min(Math.round(progress * 100) / 100, 99),
            `Creating fee plans... (${actualProcessed}/${feePlansToCreate.length})`,
            successCount,
            errorCount,
            estimatedSeconds
          );
          lastProgressUpdate = now;
        }
      }

      // Clear progress from localStorage
      localStorage.removeItem(progressKey);

      onProgress?.(100, 'Completed!', successCount, errorCount, 0);

      // Refresh the plans list
      setRefreshKey(prev => prev + 1);
      
      return { successCount, errorCount };
    } catch (error: any) {
      // Clear progress on error
      localStorage.removeItem(progressKey);
      console.error('Error in bulk create:', error);
      throw error;
    } finally {
      setBulkCreating(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (sessions.length === 0) {
    return <NoSessionsFound />;
  }

  return (
    <PageContainer>
      <Header>
        <Title>Fee Plans</Title>
        <ActionButtons>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative', flex: '1', minWidth: '200px', maxWidth: '300px' }}>
            <SearchIcon style={{ position: 'absolute', left: '8px', fontSize: '18px', color: customTheme?.TEXT_SECONDARY, pointerEvents: 'none' }} />
            <SearchInput
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px' }}
            />
          </div>
          <Button
            variant="secondary"
            onClick={handleBulkCreateClick}
            disabled={bulkCreating || !sessionId}
            title="Create fee plans for all active students without plans"
          >
            <BulkAddIcon style={{ fontSize: '16px' }} />
            {bulkCreating ? 'Creating...' : 'Bulk Create'}
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            <AddIcon style={{ fontSize: '16px' }} />
            Create
          </Button>
        </ActionButtons>
      </Header>
      <MainContent>
        <FeePlansTable
          key={refreshKey}
          schoolId={user?.school_id || 0}
          sessionId={sessionId || undefined}
          feeHeads={feeHeads}
          searchQuery={searchQuery}
          onRefresh={() => {
            setRefreshKey(prev => prev + 1);
          }}
        />
      </MainContent>
      <CreateFeePlanModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setRefreshKey(prev => prev + 1);
        }}
        schoolId={user?.school_id || 0}
        feeHeads={feeHeads}
      />
      <BulkCreateFeePlansModal
        isOpen={showBulkCreateModal}
        onClose={() => {
          setShowBulkCreateModal(false);
          if (!bulkCreating) {
            setRefreshKey(prev => prev + 1);
          }
        }}
        onConfirm={async (onProgress?: (progress: number, step: string, success: number, errors: number, estimatedTime?: number) => void) => {
          return await executeBulkCreate(onProgress);
        }}
        totalStudents={bulkCreateStats.totalStudents}
        studentsNeedingPlans={bulkCreateStats.studentsNeedingPlans}
        sessionName={bulkCreateStats.sessionName}
      />
    </PageContainer>
  );
};

const FeePlans: React.FC = () => {
  const muiTheme = useTheme();
  const baseTheme = muiTheme.palette.mode === 'dark' ? darkTheme : lightTheme;
  
  // Merge custom theme with MUI theme for styled-components compatibility
  const customTheme = {
    ...baseTheme,
    palette: {
      mode: muiTheme.palette.mode,
      primary: { main: baseTheme.ACCENT },
      error: { main: '#ef4444' },
      success: { main: '#10b981' },
      background: {
        paper: baseTheme.CARD,
        default: baseTheme.BG,
      },
    },
  };
  
  return (
    <ThemeProvider theme={customTheme}>
      <FeePlansContent theme={customTheme} />
    </ThemeProvider>
  );
};

export default FeePlans;

