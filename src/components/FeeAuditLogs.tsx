import React, { useState, useEffect } from 'react';
import styled, { useTheme } from 'styled-components';
import { 
  History, 
  Search, 
  FilterList, 
  Refresh,
  Visibility,
  Person,
  CalendarToday,
  Category
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { useToast } from './useToast';
import { useAuth } from '../contexts/AuthContext';
import { FeeAuditLog } from '../types/fee';
import FeeAuditSetupInstructions from './FeeAuditSetupInstructions';

// Styled Components
const Container = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  padding: 0.5rem 1rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  min-width: 200px;
  
  &::placeholder {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
  }
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => (theme as any).ACCENT};
  }
`;

const FilterSelect = styled.select`
  padding: 0.5rem 1rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => (theme as any).ACCENT};
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${({ theme }) => (theme as any).ACCENT};
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => (theme as any).ACCENT}dd;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const LogsContainer = styled.div`
  max-height: 600px;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BORDER};
    border-radius: 4px;
  }
`;

const LogItem = styled.div<{ $action: string }>`
  padding: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  transition: background 0.2s ease;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f8f9fa'};
  }
`;

const LogHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const LogTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const ActionBadge = styled.span<{ $action: string }>`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ $action, theme }) => {
    switch ($action) {
      case 'create': return '#10b981';
      case 'update': return '#3b82f6';
      case 'delete': return '#ef4444';
      default: return theme.TEXT_SECONDARY;
    }
  }};
  color: white;
`;

const LogMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  flex-wrap: wrap;
`;

const LogDetails = styled.div`
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f8f9fa'};
  border-radius: 6px;
  border-left: 3px solid ${({ theme }) => (theme as any).ACCENT};
`;

const ChangesContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 0.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ChangeSection = styled.div<{ $type: 'old' | 'new' }>`
  padding: 0.5rem;
  border-radius: 4px;
  background: ${({ $type, theme }) => 
    $type === 'old' 
      ? (theme.BG === '#252525' ? '#1a1a1a' : '#fef2f2')
      : (theme.BG === '#252525' ? '#1a1a1a' : '#f0fdf4')
  };
  border: 1px solid ${({ $type }) => 
    $type === 'old' ? '#fecaca' : '#bbf7d0'
  };
`;

const ChangeTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
`;

const ChangeContent = styled.pre`
  font-size: 0.8rem;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #ef4444;
`;

// Pagination styled components
const PaginationContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG};
`;

const PaginationInfo = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.875rem;
`;

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PaginationButton = styled.button`
  padding: 0.5rem 1rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.BG_SECONDARY};
    border-color: ${({ theme }) => (theme as any).ACCENT};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageNumbers = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const PageButton = styled.button<{ $active: boolean }>`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ $active, theme }) => $active ? (theme as any).ACCENT : theme.BG};
  color: ${({ $active, theme }) => $active ? '#fff' : theme.TEXT};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 2.5rem;

  &:hover:not(:disabled) {
    background: ${({ $active, theme }) => $active ? (theme as any).ACCENT : theme.BG_SECONDARY};
    border-color: ${({ theme }) => (theme as any).ACCENT};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface FeeAuditLogsProps {
  entity?: string;
  entityId?: number;
  limit?: number;
}

const FeeAuditLogs: React.FC<FeeAuditLogsProps> = ({ 
  entity, 
  entityId, 
  limit = 50 
}) => {
  const theme = useTheme();
  const { showToast } = useToast();
  const { user } = useAuth();
  
  const [logs, setLogs] = useState<FeeAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState(entity || '');
  const [actionFilter, setActionFilter] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Load audit logs with pagination
  const loadAuditLogs = async (page: number = currentPage) => {
    if (!user?.school_id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // First, get total count for pagination
      let countQuery = supabase
        .from('fee_audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', user.school_id);

      // Apply same filters to count query
      if (entityFilter) {
        countQuery = countQuery.eq('entity', entityFilter);
      }
      
      if (entityId) {
        countQuery = countQuery.eq('entity_id', entityId);
      }
      
      if (actionFilter) {
        countQuery = countQuery.eq('action', actionFilter);
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      const total = count || 0;
      const totalPagesCount = Math.ceil(total / limit);
      
      setTotalLogs(total);
      setTotalPages(totalPagesCount);

      // Calculate offset for pagination
      const offset = (page - 1) * limit;

      // Load audit logs with pagination
      let query = supabase
        .from('fee_audit_logs')
        .select('*')
        .eq('school_id', user.school_id);

      // Apply filters
      if (entityFilter) {
        query = query.eq('entity', entityFilter);
      }
      
      if (entityId) {
        query = query.eq('entity_id', entityId);
      }
      
      if (actionFilter) {
        query = query.eq('action', actionFilter);
      }

      const { data, error: fetchError } = await query
        .order('changed_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (fetchError) throw fetchError;

      // Get unique user IDs from audit logs
      const allUserIds = data?.map(log => log.changed_by).filter(Boolean) || [];
      const userIds = Array.from(new Set(allUserIds));
      
      // Fetch user information separately
      let usersData: any[] = [];
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', userIds);
        
        if (!usersError) {
          usersData = users || [];
        }
      }

      // Combine audit logs with user data
      const combinedData = data?.map(log => ({
        ...log,
        changedByUser: usersData.find(u => u.id === log.changed_by) || null
      })) || [];

      setLogs(combinedData);
      setCurrentPage(page);
    } catch (err: any) {
      console.error('Error loading audit logs:', err);
      
      // Check for specific error types
      if (err.message?.includes('relation "fee_audit_logs" does not exist') || 
          err.message?.includes('table "fee_audit_logs" does not exist') ||
          err.code === '42P01') {
        setError('Fee audit system not set up yet. Please run the setup script to create the audit logs table.');
      } else {
        setError('Failed to load audit logs: ' + (err.message || 'Unknown error'));
      }
      showToast('Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load logs on component mount and when filters change
  useEffect(() => {
    loadAuditLogs(1); // Always start from page 1 when filters change
  }, [user?.school_id, entityFilter, actionFilter, entityId]);

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      loadAuditLogs(page);
    }
  };

  // Handle previous page
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  // Handle next page
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  // Helper function to get user-friendly entity name
  const getEntityDisplayName = (entity: string) => {
    const entityMap: { [key: string]: string } = {
      'fee_heads': 'Fee Head',
      'fee_structures': 'Fee Structure',
      'fee_invoices': 'Fee Invoice',
      'fee_payments': 'Fee Payment',
      'student_fee_plans': 'Student Fee Plan',
      'student_fee_concessions': 'Fee Concession'
    };
    return entityMap[entity] || entity;
  };

  // Helper function to get user-friendly action description
  const getActionDescription = (entity: string, action: string, log: FeeAuditLog) => {
    const entityName = getEntityDisplayName(entity);
    
    switch (action) {
      case 'CREATE':
        switch (entity) {
          case 'fee_heads':
            return `Created fee head "${log.new_values?.name || 'Unknown'}"`;
          case 'fee_structures':
            return `Set fee structure for class`;
          case 'fee_invoices':
            return `Generated fee invoice`;
          case 'fee_payments':
            const amount = log.new_values?.amount || 0;
            const invoiceId = log.new_values?.invoice_id;
            if (invoiceId && invoiceToStudentMap[invoiceId]) {
              const studentId = invoiceToStudentMap[invoiceId];
              const studentDetails = getStudentDetails(studentId);
              return `Collected fee of Rs. ${amount} for ${studentDetails}`;
            }
            return `Recorded fee payment of Rs. ${amount}`;
          case 'student_fee_plans':
            return `Assigned fee plan to student`;
          case 'student_fee_concessions':
            return `Granted fee concession`;
          default:
            return `Created ${entityName}`;
        }
      case 'UPDATE':
        switch (entity) {
          case 'fee_heads':
            return `Updated fee head "${log.new_values?.name || 'Unknown'}"`;
          case 'fee_structures':
            return `Modified fee structure`;
          case 'fee_invoices':
            return `Updated fee invoice`;
          case 'fee_payments':
            const amount = log.new_values?.amount || 0;
            const invoiceId = log.new_values?.invoice_id;
            if (invoiceId && invoiceToStudentMap[invoiceId]) {
              const studentId = invoiceToStudentMap[invoiceId];
              const studentDetails = getStudentDetails(studentId);
              return `Modified fee payment of Rs. ${amount} for ${studentDetails}`;
            }
            return `Modified fee payment of Rs. ${amount}`;
          case 'student_fee_plans':
            return `Updated student fee plan`;
          case 'student_fee_concessions':
            return `Modified fee concession`;
          default:
            return `Updated ${entityName}`;
        }
      case 'DELETE':
        switch (entity) {
          case 'fee_heads':
            return `Deleted fee head "${log.old_values?.name || 'Unknown'}"`;
          case 'fee_structures':
            return `Removed fee structure`;
          case 'fee_invoices':
            return `Deleted fee invoice`;
          case 'fee_payments':
            const amount = log.old_values?.amount || 0;
            const invoiceId = log.old_values?.invoice_id;
            if (invoiceId && invoiceToStudentMap[invoiceId]) {
              const studentId = invoiceToStudentMap[invoiceId];
              const studentDetails = getStudentDetails(studentId);
              return `Removed fee payment of Rs. ${amount} for ${studentDetails}`;
            }
            return `Removed fee payment of Rs. ${amount}`;
          case 'student_fee_plans':
            return `Removed student fee plan`;
          case 'student_fee_concessions':
            return `Removed fee concession`;
          default:
            return `Deleted ${entityName}`;
        }
      default:
        return `${action} ${entityName}`;
    }
  };

  // State for student, class, and section data
  const [studentData, setStudentData] = useState<{ [key: number]: any }>({});
  const [classData, setClassData] = useState<{ [key: number]: any }>({});
  const [sectionData, setSectionData] = useState<{ [key: number]: any }>({});
  const [invoiceToStudentMap, setInvoiceToStudentMap] = useState<{ [key: number]: number }>({});

  // Load student and class data
  const loadStudentAndClassData = async () => {
    if (!user?.school_id) return;

    try {
      // Get all unique student IDs, class IDs, section IDs, and invoice IDs from logs
      const studentIds = new Set<number>();
      const classIds = new Set<number>();
      const sectionIds = new Set<number>();
      const invoiceIds = new Set<number>();

      logs.forEach(log => {
        if (log.new_values?.student_id) studentIds.add(log.new_values.student_id);
        if (log.old_values?.student_id) studentIds.add(log.old_values.student_id);
        if (log.new_values?.class_id) classIds.add(log.new_values.class_id);
        if (log.old_values?.class_id) classIds.add(log.old_values.class_id);
        if (log.new_values?.section_id) sectionIds.add(log.new_values.section_id);
        if (log.old_values?.section_id) sectionIds.add(log.old_values.section_id);
        if (log.new_values?.invoice_id) invoiceIds.add(log.new_values.invoice_id);
        if (log.old_values?.invoice_id) invoiceIds.add(log.old_values.invoice_id);
      });

      // Fetch student data directly
      if (studentIds.size > 0) {
        const { data: students } = await supabase
          .from('students')
          .select('id, name, class_id, section_id')
          .in('id', Array.from(studentIds))
          .eq('school_id', user.school_id);

        if (students) {
          const studentMap: { [key: number]: any } = {};
          students.forEach(student => {
            studentMap[student.id] = student;
          });
          setStudentData(studentMap);
        }
      }

      // Fetch student data through invoices (for fee payments)
      if (invoiceIds.size > 0) {
        const { data: invoices } = await supabase
          .from('fee_invoices')
          .select(`
            id,
            student_id,
            students!inner (
              id,
              name,
              class_id,
              section_id
            )
          `)
          .in('id', Array.from(invoiceIds))
          .eq('school_id', user.school_id);

        if (invoices) {
          const studentMap: { [key: number]: any } = {};
          const invoiceMap: { [key: number]: number } = {};
          
          invoices.forEach(invoice => {
            if (invoice.students) {
              studentMap[invoice.student_id] = invoice.students;
              invoiceMap[invoice.id] = invoice.student_id;
            }
          });
          
          setStudentData(prev => ({ ...prev, ...studentMap }));
          setInvoiceToStudentMap(prev => ({ ...prev, ...invoiceMap }));
        }
      }

      // Fetch class data
      if (classIds.size > 0) {
        const { data: classes } = await supabase
          .from('classes')
          .select('id, name')
          .in('id', Array.from(classIds))
          .eq('school_id', user.school_id);

        if (classes) {
          const classMap: { [key: number]: any } = {};
          classes.forEach(cls => {
            classMap[cls.id] = cls;
          });
          setClassData(classMap);
        }
      }

      // Fetch section data
      if (sectionIds.size > 0) {
        const { data: sections } = await supabase
          .from('sections')
          .select('id, name')
          .in('id', Array.from(sectionIds))
          .eq('school_id', user.school_id);

        if (sections) {
          const sectionMap: { [key: number]: any } = {};
          sections.forEach(section => {
            sectionMap[section.id] = section;
          });
          setSectionData(sectionMap);
        }
      }
    } catch (error) {
      console.error('Error loading student/class data:', error);
    }
  };

  // Load student and class data when logs change
  React.useEffect(() => {
    if (logs.length > 0) {
      loadStudentAndClassData();
    }
  }, [logs, user?.school_id]);

  // Helper function to get student details
  const getStudentDetails = (studentId: number) => {
    const student = studentData[studentId];
    if (!student) return `ID-${studentId}`;
    
    const className = classData[student.class_id]?.name || 'Unknown Class';
    const sectionName = student.section_id ? sectionData[student.section_id]?.name || `Section ${student.section_id}` : '';
    const sectionDisplay = sectionName ? `(${sectionName})` : '';
    
    return `ID-${studentId}-${student.name} (${className}${sectionDisplay})`;
  };

  // Helper function to get relevant details
  const getRelevantDetails = (log: FeeAuditLog) => {
    const details: string[] = [];
    
    // Add amount if available
    if (log.new_values?.amount) {
      details.push(`₹${log.new_values.amount}`);
    } else if (log.old_values?.amount) {
      details.push(`₹${log.old_values.amount}`);
    }
    
    // Add student information with class details
    if (log.new_values?.student_id || log.old_values?.student_id) {
      const studentId = log.new_values?.student_id || log.old_values?.student_id;
      details.push(getStudentDetails(studentId));
    }
    
    return details;
  };

  // Filter logs based on search term
  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const description = getActionDescription(log.entity, log.action, log);
    
    return (
      description.toLowerCase().includes(searchLower) ||
      log.changedByUser?.name?.toLowerCase().includes(searchLower) ||
      log.changedByUser?.email?.toLowerCase().includes(searchLower) ||
      getEntityDisplayName(log.entity).toLowerCase().includes(searchLower)
    );
  });

  // Toggle log expansion
  const toggleLogExpansion = (logId: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Format JSON for display
  const formatJson = (obj: any) => {
    if (!obj) return 'N/A';
    return JSON.stringify(obj, null, 2);
  };

  if (error) {
    // Show setup instructions if the audit system isn't configured
    if (error.includes('not set up') || error.includes('not properly configured')) {
      return <FeeAuditSetupInstructions />;
    }
    
    return (
      <Container>
        <ErrorState>
          <History style={{ fontSize: '3rem', marginBottom: '1rem' }} />
          <div>{error}</div>
        </ErrorState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>
          <History />
          Fee Audit Logs
        </Title>
        
        <Controls>
          <SearchInput
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <FilterSelect
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          >
            <option value="">All Activities</option>
            <option value="fee_heads">Fee Heads</option>
            <option value="fee_structures">Fee Structures</option>
            <option value="fee_invoices">Fee Invoices</option>
            <option value="fee_payments">Fee Payments</option>
            <option value="student_fee_plans">Student Fee Plans</option>
            <option value="student_fee_concessions">Fee Concessions</option>
          </FilterSelect>
          
          <FilterSelect
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            <option value="CREATE">Created</option>
            <option value="UPDATE">Modified</option>
            <option value="DELETE">Deleted</option>
          </FilterSelect>
          
          <RefreshButton onClick={() => loadAuditLogs(currentPage)} disabled={loading}>
            <Refresh />
            Refresh
          </RefreshButton>
        </Controls>
      </Header>

      <LogsContainer>
        {loading ? (
          <LoadingState>
            <Refresh style={{ animation: 'spin 1s linear infinite' }} />
            Loading audit logs...
          </LoadingState>
        ) : filteredLogs.length === 0 ? (
          <EmptyState>
            <History style={{ fontSize: '3rem', marginBottom: '1rem' }} />
            <div>No audit logs found</div>
          </EmptyState>
        ) : (
          filteredLogs.map((log) => (
            <LogItem key={log.id} $action={log.action}>
              <LogHeader>
                <LogTitle>
                  <Category />
                  {getActionDescription(log.entity, log.action, log)}
                </LogTitle>
                
                <LogMeta>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Person style={{ fontSize: '1rem' }} />
                    {log.changedByUser?.name || (log.changed_by ? `User ID: ${log.changed_by}` : 'System')}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CalendarToday style={{ fontSize: '1rem' }} />
                    {formatTimestamp(log.changed_at)}
                  </div>
                  
                  <button
                    onClick={() => toggleLogExpansion(log.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: (theme as any).ACCENT,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.8rem'
                    }}
                  >
                    <Visibility />
                    {expandedLogs.has(log.id) ? 'Hide' : 'Show'} Details
                  </button>
                </LogMeta>
              </LogHeader>
              
              {expandedLogs.has(log.id) && (
                <LogDetails>
                  <ChangesContainer>
                    <ChangeSection $type="old">
                      <ChangeTitle>Before</ChangeTitle>
                      <ChangeContent>{formatJson(log.old_values)}</ChangeContent>
                    </ChangeSection>
                    
                    <ChangeSection $type="new">
                      <ChangeTitle>After</ChangeTitle>
                      <ChangeContent>{formatJson(log.new_values)}</ChangeContent>
                    </ChangeSection>
                  </ChangesContainer>
                </LogDetails>
              )}
            </LogItem>
          ))
        )}
      </LogsContainer>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <PaginationContainer>
          <PaginationInfo>
            Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalLogs)} of {totalLogs} logs
          </PaginationInfo>
          
          <PaginationControls>
            <PaginationButton 
              onClick={handlePreviousPage} 
              disabled={currentPage === 1 || loading}
            >
              Previous
            </PaginationButton>
            
            <PageNumbers>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <PageButton
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    $active={currentPage === pageNum}
                    disabled={loading}
                  >
                    {pageNum}
                  </PageButton>
                );
              })}
            </PageNumbers>
            
            <PaginationButton 
              onClick={handleNextPage} 
              disabled={currentPage === totalPages || loading}
            >
              Next
            </PaginationButton>
          </PaginationControls>
        </PaginationContainer>
      )}
    </Container>
  );
};

export default FeeAuditLogs;
