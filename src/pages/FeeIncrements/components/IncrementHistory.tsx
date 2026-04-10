import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  History as HistoryIcon,
  Undo as UndoIcon,
  TrendingUp as TrendingUpIcon,
  Percent as PercentIcon,
  AttachMoney as AttachMoneyIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/useToast';
import { feeService } from '../../../services/feeService';
import { IncrementHistory as IncrementHistoryType } from '../types';
import { ReverseIncrementModal } from './ReverseIncrementModal';
import { CircularProgress } from '@mui/material';
import { supabase } from '../../../supabaseClient';
import { formatAppDateTime } from '../../../utils/dateUtils';

const HistoryContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;

  @media (max-width: 768px) {
    gap: 12px;
  }
`;

const HistoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.BORDER};

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
    border-radius: 8px;
  }
`;

const Title = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.5rem;

  @media (max-width: 768px) {
    font-size: 1.1rem;
    width: 100%;
    gap: 8px;
  }
`;

const FilterSection = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;

  .filter-icon {
    @media (max-width: 768px) {
      display: none !important;
    }
  }

  @media (max-width: 768px) {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }
`;

const FilterLabel = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-right: 4px;

  @media (max-width: 768px) {
    display: none;
  }
`;

const ClearFiltersButton = styled.button`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &:hover {
    background: ${({ theme }) => theme.ACCENT + '20'};
    border-color: ${({ theme }) => theme.ACCENT};
    color: ${({ theme }) => theme.ACCENT};
  }

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    padding: 8px 10px;
    margin-top: 2px;
    font-size: 0.8rem;
    gap: 4px;
  }
`;

const Select = styled.select`
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  cursor: pointer;

  @media (max-width: 768px) {
    width: 100%;
    font-size: 0.8rem;
    padding: 8px 10px;
    border-radius: 6px;
  }
`;

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (max-width: 768px) {
    gap: 10px;
  }
`;

const HistoryCard = styled.div<{ status: string }>`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 20px;
  border: 1px solid ${({ theme, status }) => 
    status === 'reversed' ? 'rgba(239, 68, 68, 0.4)' : 
    theme.BORDER};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    padding: 12px;
    border-radius: 6px;
    
    &:hover {
      transform: none;
    }
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 8px;
    margin-bottom: 10px;
  }
`;

const CardTitle = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;

  @media (max-width: 768px) {
    gap: 6px;
  }
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  .session-name {
    @media (max-width: 768px) {
      font-size: 0.8rem !important;
    }
  }

  @media (max-width: 768px) {
    gap: 8px;
  }
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ theme, status }) => 
    status === 'reversed' ? 'rgba(239, 68, 68, 0.2)' : 
    theme.ACCENT + '20'};
  color: ${({ theme, status }) => 
    status === 'reversed' ? '#ef4444' : 
    theme.ACCENT};
  border: 1px solid ${({ theme, status }) => 
    status === 'reversed' ? 'rgba(239, 68, 68, 0.4)' : 
    theme.ACCENT + '40'};

  svg {
    @media (max-width: 768px) {
      font-size: 0.75rem !important;
      margin-right: 3px !important;
    }
  }

  @media (max-width: 768px) {
    padding: 3px 8px;
    border-radius: 8px;
    font-size: 0.7rem;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-end;
    gap: 6px;
  }
`;

const ActionButton = styled.button<{ variant?: 'edit' | 'reverse' }>`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => 
    theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.ACCENT + '20'};
    border-color: ${({ theme }) => theme.ACCENT};
    color: ${({ theme }) => theme.ACCENT};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    @media (max-width: 768px) {
      font-size: 0.8rem !important;
    }
  }

  @media (max-width: 768px) {
    padding: 5px 10px;
    font-size: 0.75rem;
    gap: 4px;
    border-radius: 5px;
  }
`;

const CardDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 8px;
    margin-bottom: 10px;
  }
`;

const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  @media (max-width: 768px) {
    gap: 2px;
  }
`;

const DetailLabel = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  font-weight: 600;

  @media (max-width: 768px) {
    font-size: 0.7rem;
  }
`;

const DetailValue = styled.span`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;

  svg {
    @media (max-width: 768px) {
      font-size: 0.85rem !important;
    }
  }

  @media (max-width: 768px) {
    font-size: 0.85rem;
    gap: 4px;
  }
`;

const FilterInfo = styled.div`
  padding: 12px;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  margin-top: 12px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};

  @media (max-width: 768px) {
    padding: 8px;
    margin-top: 8px;
    font-size: 0.75rem;
    border-radius: 6px;
  }
`;

const MetaInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    font-size: 0.7rem;
    padding-top: 8px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${({ theme }) => theme.TEXT_SECONDARY};

  @media (max-width: 768px) {
    padding: 40px 16px;
    font-size: 0.9rem;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
`;

interface IncrementHistoryProps {
  schoolId: number;
  sessionId?: number;
  feeHeads: any[];
}

export const IncrementHistoryComponent: React.FC<IncrementHistoryProps> = ({
  schoolId,
  sessionId,
  feeHeads,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [history, setHistory] = useState<IncrementHistoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [allHistory, setAllHistory] = useState<IncrementHistoryType[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<IncrementHistoryType[]>([]);
  const [filterSessionId, setFilterSessionId] = useState<number | undefined>(sessionId);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterIncrementType, setFilterIncrementType] = useState<string>('all');
  const [filterTargetType, setFilterTargetType] = useState<string>('all');
  const [reversingHistory, setReversingHistory] = useState<IncrementHistoryType | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    fetchSessions();
  }, [schoolId]);

  useEffect(() => {
    fetchHistory();
  }, [schoolId, filterSessionId]);

  useEffect(() => {
    applyFilters();
  }, [allHistory, filterSessionId, filterStatus, filterIncrementType, filterTargetType]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('school_id', schoolId)
        .order('is_active', { ascending: false })
        .order('id', { ascending: false });
      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await feeService.getIncrementHistory(schoolId, undefined); // Fetch all, filter client-side
      setAllHistory(data);
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch increment history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allHistory];

    // Filter by session
    if (filterSessionId) {
      filtered = filtered.filter(item => item.sessionId === filterSessionId);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }

    // Filter by increment type
    if (filterIncrementType !== 'all') {
      filtered = filtered.filter(item => item.incrementType === filterIncrementType);
    }

    // Filter by target type
    if (filterTargetType !== 'all') {
      filtered = filtered.filter(item => item.targetType === filterTargetType);
    }

    setFilteredHistory(filtered);
  };

  const clearFilters = () => {
    setFilterSessionId(sessionId);
    setFilterStatus('all');
    setFilterIncrementType('all');
    setFilterTargetType('all');
  };

  const handleReverse = async (historyItem: IncrementHistoryType) => {
    try {
      await feeService.reverseIncrement(historyItem.id, schoolId, user?.id);
      showToast('Increment reversed successfully', 'success');
      fetchHistory();
      setReversingHistory(null);
    } catch (error: any) {
      showToast(error.message || 'Failed to reverse increment', 'error');
    }
  };


  const formatDate = (dateString: string) => {
    return formatAppDateTime(dateString);
  };

  const formatIncrementValue = (type: string, value: number) => {
    if (type === 'percentage') {
      return `${value}%`;
    }
    return `Rs. ${value.toFixed(2)}`;
  };

  const getTargetTypeLabel = (type: string) => {
    switch (type) {
      case 'fee_plans':
        return 'Fee Plans';
      case 'fee_structures':
        return 'Fee Structures';
      case 'both':
        return 'Both';
      default:
        return type;
    }
  };

  const getFilterSummary = (filterOptions: any) => {
    const parts: string[] = [];
    if (filterOptions.studentIds && filterOptions.studentIds.length > 0) {
      parts.push(`${filterOptions.studentIds.length} student(s)`);
    }
    if (filterOptions.classIds && filterOptions.classIds.length > 0) {
      parts.push(`${filterOptions.classIds.length} class(es)`);
    }
    if (filterOptions.feeHeadIds && filterOptions.feeHeadIds.length > 0) {
      const headNames = filterOptions.feeHeadIds
        .map((id: number) => feeHeads.find(h => h.id === id)?.name || `Fee Head ${id}`)
        .join(', ');
      parts.push(`Fee Heads: ${headNames}`);
    }
    if (parts.length === 0) {
      return 'All items';
    }
    return parts.join(' • ');
  };

  if (loading) {
    return (
      <LoadingContainer>
        <CircularProgress />
      </LoadingContainer>
    );
  }

  return (
    <HistoryContainer>
      <HistoryHeader>
        <Title>
          <HistoryIcon />
          Increment History
        </Title>
        <FilterSection>
          <FilterListIcon style={{ fontSize: '1rem', color: 'inherit', opacity: 0.7, display: 'none' }} className="filter-icon" />
          <FilterLabel>Session:</FilterLabel>
          <Select
            value={filterSessionId || ''}
            onChange={(e) => setFilterSessionId(e.target.value ? Number(e.target.value) : undefined)}
            aria-label="Filter by session"
          >
            <option value="">All Sessions</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} {s.is_active ? '(Active)' : ''}
              </option>
            ))}
          </Select>

          <FilterLabel>Status:</FilterLabel>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="reversed">Reversed</option>
          </Select>

          <FilterLabel>Type:</FilterLabel>
          <Select
            value={filterIncrementType}
            onChange={(e) => setFilterIncrementType(e.target.value)}
            aria-label="Filter by increment type"
          >
            <option value="all">All</option>
            <option value="percentage">%</option>
            <option value="fixed">Fixed</option>
          </Select>

          <FilterLabel>Target:</FilterLabel>
          <Select
            value={filterTargetType}
            onChange={(e) => setFilterTargetType(e.target.value)}
            aria-label="Filter by target type"
          >
            <option value="all">All</option>
            <option value="fee_plans">Plans</option>
            <option value="fee_structures">Structures</option>
            <option value="both">Both</option>
          </Select>

          {(filterSessionId !== sessionId || filterStatus !== 'all' || filterIncrementType !== 'all' || filterTargetType !== 'all') && (
            <ClearFiltersButton onClick={clearFilters}>
              <ClearIcon style={{ fontSize: '0.85rem' }} />
              Clear
            </ClearFiltersButton>
          )}
        </FilterSection>
      </HistoryHeader>

      {filteredHistory.length === 0 ? (
        <EmptyState>
          <HistoryIcon style={{ fontSize: '3rem', opacity: 0.3, marginBottom: '16px' }} />
          <p>No increment history found</p>
        </EmptyState>
      ) : (
        <HistoryList>
          {filteredHistory.map((item) => (
            <HistoryCard key={item.id} status={item.status}>
              <CardHeader>
                <CardTitle>
                  <TitleRow>
                    <StatusBadge status={item.status}>
                      {item.status === 'reversed' ? (
                        <><CancelIcon style={{ fontSize: '0.9rem', marginRight: '4px' }} /> Reversed</>
                      ) : (
                        <><CheckCircleIcon style={{ fontSize: '0.9rem', marginRight: '4px' }} /> Active</>
                      )}
                    </StatusBadge>
                    <span style={{ color: 'inherit', fontSize: '0.9rem' }} className="session-name">
                      {item.session?.name || `Session ${item.sessionId}`}
                    </span>
                  </TitleRow>
                </CardTitle>
                <ActionButtons>
                  {item.status === 'active' && (
                    <ActionButton
                      variant="reverse"
                      onClick={() => setReversingHistory(item)}
                    >
                      <UndoIcon style={{ fontSize: '0.9rem' }} />
                      Reverse
                    </ActionButton>
                  )}
                </ActionButtons>
              </CardHeader>

              <CardDetails>
                <DetailItem>
                  <DetailLabel>Increment Type</DetailLabel>
                  <DetailValue>
                    {item.incrementType === 'percentage' ? (
                      <><PercentIcon style={{ fontSize: '1rem' }} /> Percentage</>
                    ) : (
                      <><AttachMoneyIcon style={{ fontSize: '1rem' }} /> Fixed Amount</>
                    )}
                  </DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>Increment Value</DetailLabel>
                  <DetailValue>
                    <TrendingUpIcon style={{ fontSize: '1rem' }} />
                    {formatIncrementValue(item.incrementType, item.incrementValue)}
                  </DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>Target</DetailLabel>
                  <DetailValue>{getTargetTypeLabel(item.targetType)}</DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>Items Updated</DetailLabel>
                  <DetailValue>{item.itemsUpdated}</DetailValue>
                </DetailItem>
                {item.affectedStudents !== undefined && (
                  <DetailItem>
                    <DetailLabel>Affected Students</DetailLabel>
                    <DetailValue>
                      <PersonIcon style={{ fontSize: '1rem' }} />
                      {item.affectedStudents}
                    </DetailValue>
                  </DetailItem>
                )}
              </CardDetails>

              <FilterInfo>
                <strong>Filters:</strong> {getFilterSummary(item.filterOptions)}
              </FilterInfo>

              <MetaInfo>
                <span>
                  Created by {item.createdByUser?.name || 'Unknown'} on {formatDate(item.createdAt)}
                </span>
                {item.remarks && (
                  <span style={{ fontStyle: 'italic' }}>{item.remarks}</span>
                )}
              </MetaInfo>
            </HistoryCard>
          ))}
        </HistoryList>
      )}

      {reversingHistory && (
        <ReverseIncrementModal
          isOpen={!!reversingHistory}
          onClose={() => setReversingHistory(null)}
          onConfirm={() => handleReverse(reversingHistory)}
          historyItem={reversingHistory}
        />
      )}
    </HistoryContainer>
  );
};
