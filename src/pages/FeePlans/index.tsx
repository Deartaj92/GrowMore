import React, { useEffect, useState, useContext } from 'react';
import { useTheme } from '@mui/material';
import { ThemeContext, darkTheme, lightTheme } from '../../components/Layout';
import { ThemeProvider } from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseClient';
import { feeService } from '../../services/feeService';
import { FeeHead } from '../../types/fee';
import { PageContainer, Header, Title, MainContent } from './styles';
import { FeePlansTable } from './components/FeePlansTable';
import { CreateFeePlanModal } from './components/CreateFeePlanModal';
import Loader from '../../components/Loader';
import NoSessionsFound from '../../components/NoSessionsFound';
import styled from 'styled-components';
import { Add as AddIcon } from '@mui/icons-material';

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;
  
  ${({ variant, theme }) => {
    if (variant === 'primary') {
      return `
        background: ${theme.ACCENT};
        color: white;
        
        &:hover {
          background: ${theme.ACCENT}dd;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px ${theme.ACCENT}40;
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
        
        &:hover {
          background: ${theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'};
        }
      `;
    }
  }}
`;

const FeePlansContent: React.FC<{ theme: typeof darkTheme }> = ({ theme: customTheme }) => {
  const { user } = useAuth();
  const muiTheme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
          <select
            value={sessionId || ''}
            onChange={(e) => setSessionId(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: `1px solid ${customTheme?.BORDER || '#ddd'}`,
              background: customTheme?.FIELD_BG || '#fff',
              color: customTheme?.TEXT_PRIMARY || '#000',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} {s.is_active ? '(Active)' : ''}
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            <AddIcon style={{ fontSize: '18px' }} />
            Create New Fee Plan
          </Button>
        </ActionButtons>
      </Header>
      <MainContent>
        <FeePlansTable
          key={refreshKey}
          schoolId={user?.school_id || 0}
          sessionId={sessionId || undefined}
          feeHeads={feeHeads}
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
        sessionId={sessionId || 0}
        feeHeads={feeHeads}
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

