import React, { useEffect, useState, useContext } from 'react';
import { useTheme } from '@mui/material';
import { ThemeContext, darkTheme, lightTheme } from '../../components/Layout';
import { ThemeProvider } from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseClient';
import { feeService } from '../../services/feeService';
import { FeeHead } from '../../types/fee';
import { PageContainer, Header, Title, MainContent, InfoBox } from './styles';
import { ApplyIncrementModal } from './components/ApplyIncrementModal';
import { IncrementHistoryComponent } from './components/IncrementHistory';
import Loader from '../../components/Loader';
import NoSessionsFound from '../../components/NoSessionsFound';
import styled from 'styled-components';
import { TrendingUp as TrendingUpIcon, Info as InfoIcon, History as HistoryIcon } from '@mui/icons-material';

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

const ContentCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  padding: 32px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
  }
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 20px 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  line-height: 1.7;
  padding: 12px;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)'};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT}40;
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'};
    transform: translateX(4px);
  }
  
  &::before {
    content: '✓';
    color: ${({ theme }) => theme.ACCENT};
    font-weight: bold;
    font-size: 1.2rem;
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 12px 24px;
  border: none;
  background: none;
  color: ${({ theme, active }) => active ? theme.ACCENT : theme.TEXT_SECONDARY};
  font-size: 0.95rem;
  font-weight: ${({ active }) => active ? 600 : 500};
  cursor: pointer;
  border-bottom: 2px solid ${({ theme, active }) => active ? theme.ACCENT : 'transparent'};
  margin-bottom: -2px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    color: ${({ theme }) => theme.ACCENT};
  }
`;

const FeeIncrementsContent: React.FC<{ theme: typeof darkTheme }> = ({ theme: customTheme }) => {
  const { user } = useAuth();
  const muiTheme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'apply' | 'history'>('apply');

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

  if (loading) return <Loader />;

  if (sessions.length === 0) {
    return <NoSessionsFound />;
  }

  return (
    <PageContainer>
      <Header>
        <Title>Fee Increments</Title>
        <ActionButtons>
          {activeTab === 'apply' && (
            <>
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
                onClick={() => setShowApplyModal(true)}
                disabled={!sessionId}
              >
                <TrendingUpIcon style={{ fontSize: '18px' }} />
                Apply Increment
              </Button>
            </>
          )}
        </ActionButtons>
      </Header>
      <MainContent>
        <TabsContainer>
          <Tab active={activeTab === 'apply'} onClick={() => setActiveTab('apply')}>
            <TrendingUpIcon style={{ fontSize: '1.1rem' }} />
            Apply Increment
          </Tab>
          <Tab active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
            <HistoryIcon style={{ fontSize: '1.1rem' }} />
            History
          </Tab>
        </TabsContainer>

        {activeTab === 'apply' ? (
          <ContentCard>
          <h3 style={{ 
            marginTop: 0, 
            marginBottom: '20px',
            color: customTheme?.TEXT_PRIMARY,
            fontSize: '1.5rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <TrendingUpIcon style={{ color: customTheme?.ACCENT, fontSize: '1.8rem' }} />
            About Fee Increments
          </h3>
          <InfoBox>
            <InfoIcon style={{ color: customTheme?.ACCENT, fontSize: '1.5rem', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Important:</strong> Fee increments only affect fee plans and fee structures. 
              Already generated Challans in the database will NOT be modified. 
              New fee generations will automatically use the updated amounts.
            </div>
          </InfoBox>
          
          <h4 style={{ 
            color: customTheme?.TEXT_PRIMARY, 
            marginTop: '32px',
            marginBottom: '16px',
            fontSize: '1.2rem',
            fontWeight: 600
          }}>
            Key Features
          </h4>
          <FeatureList>
            <FeatureItem>
              Apply percentage-based or fixed amount increments to fee plans and/or fee structures
            </FeatureItem>
            <FeatureItem>
              Filter by students, classes, or specific fee heads for targeted increments
            </FeatureItem>
            <FeatureItem>
              Choose to preserve discount amounts or discount percentages when incrementing fee plans
            </FeatureItem>
            <FeatureItem>
              Preview changes before applying to ensure accuracy
            </FeatureItem>
            <FeatureItem>
              Safe operation - existing Challans remain unchanged, only future fee generations are affected
            </FeatureItem>
          </FeatureList>

          <h4 style={{ 
            color: customTheme?.TEXT_PRIMARY, 
            marginTop: '32px',
            marginBottom: '16px',
            fontSize: '1.2rem',
            fontWeight: 600
          }}>
            How It Works
          </h4>
          <ol style={{ 
            color: customTheme?.TEXT_PRIMARY, 
            lineHeight: '2', 
            paddingLeft: '24px',
            fontSize: '0.95rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <li>Select a session and click "Apply Increment"</li>
            <li>Choose increment type (percentage or fixed amount) and value</li>
            <li>Select target (fee plans, fee structures, or both)</li>
            <li>Optionally filter by students, classes, or fee heads</li>
            <li>Generate preview to see what will be updated</li>
            <li>Apply the increment - only fee plans/structures are updated</li>
            <li>New fee generations will use the updated amounts automatically</li>
          </ol>
        </ContentCard>
        ) : (
          <IncrementHistoryComponent
            schoolId={user?.school_id || 0}
            sessionId={sessionId || undefined}
            feeHeads={feeHeads}
          />
        )}
      </MainContent>
      {sessionId && activeTab === 'apply' && (
        <ApplyIncrementModal
          isOpen={showApplyModal}
          onClose={() => setShowApplyModal(false)}
          onSuccess={() => {
            setShowApplyModal(false);
            setActiveTab('history'); // Switch to history tab after successful increment
          }}
          schoolId={user?.school_id || 0}
          sessionId={sessionId}
          feeHeads={feeHeads}
        />
      )}
    </PageContainer>
  );
};

const FeeIncrements: React.FC = () => {
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
      <FeeIncrementsContent theme={customTheme} />
    </ThemeProvider>
  );
};

export default FeeIncrements;

