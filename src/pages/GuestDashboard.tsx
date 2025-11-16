import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {
  People as PeopleIcon,
  Person as PersonIcon,
  Assessment as AssessmentIcon,
  Quiz as QuizIcon,
  Assignment as AssignmentIcon,
  AttachMoney as AttachMoneyIcon,
  ReceiptLong as ReceiptLongIcon,
  School as SchoolIcon,
  Dashboard as DashboardIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { ThemeContext } from '../components/Layout';
import { fetchRenderSettings, isGuestPageAccessible, RenderSettings } from '../services/renderSettingsService';
import { GUEST_ACCESSIBLE_PAGES } from '../config/renderSettingsConfig';
import Loader from '../components/Loader';

const Container = styled.div`
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
`;

const WelcomeHeader = styled.div`
  margin-bottom: 2rem;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 1rem;
  line-height: 1.2;
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const QuickLinksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
  margin-top: 2rem;
  width: 100%;
  max-width: 1600px;
  margin-left: auto;
  margin-right: auto;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const QuickLinkCard = styled.div<{ $color?: string }>`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 16px;
  padding: 0;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  height: 200px;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, ${({ $color }) => $color || '#3b82f6'}, ${({ $color }) => $color ? `${$color}80` : '#3b82f680'});
    border-radius: 16px 16px 0 0;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, ${({ $color }) => $color ? `${$color}05` : '#3b82f605'} 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-6px) scale(1.02);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
    border-color: ${({ $color }) => $color || '#3b82f6'};
    
    &::after {
      opacity: 1;
    }
  }
  
  &:active {
    transform: translateY(-3px) scale(1.01);
  }
  
  @media (max-width: 768px) {
    height: 180px;
  }
`;

const CardHeader = styled.div<{ $color?: string }>`
  padding: 20px 20px 12px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    padding: 16px 16px 10px 16px;
    gap: 12px;
  }
`;

const CardIcon = styled.div<{ $color?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, ${({ $color }) => $color || '#3b82f6'}, ${({ $color }) => $color ? `${$color}80` : '#3b82f680'});
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  flex-shrink: 0;
  box-shadow: 0 6px 16px ${({ $color }) => $color ? `${$color}25` : '#3b82f625'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  
  svg {
    width: 24px !important;
    height: 24px !important;
    display: block;
    margin: 0 auto;
    vertical-align: middle;
    position: relative;
    top: 0;
    left: 0;
  }
  
  .MuiSvgIcon-root {
    width: 24px !important;
    height: 24px !important;
    font-size: 24px !important;
    display: block !important;
    margin: 0 auto !important;
    vertical-align: middle !important;
    position: relative !important;
    top: 0 !important;
    left: 0 !important;
  }
  
  & > * {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 100% !important;
    height: 100% !important;
  }
  
  ${QuickLinkCard}:hover & {
    transform: scale(1.1);
    box-shadow: 0 8px 24px ${({ $color }) => $color ? `${$color}40` : '#3b82f640'};
  }
  
  @media (max-width: 768px) {
    width: 44px;
    height: 44px;
    font-size: 20px;
    
    svg {
      width: 20px !important;
      height: 20px !important;
    }
    
    .MuiSvgIcon-root {
      width: 20px !important;
      height: 20px !important;
      font-size: 20px !important;
    }
  }
`;

const CardTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  line-height: 1.3;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const CardDescription = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0;
  line-height: 1.4;
  padding: 0 20px 20px 20px;
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: flex-end;
  
  @media (max-width: 768px) {
    font-size: 0.85rem;
    padding: 0 16px 16px 16px;
  }
`;

// Map page keys to routes and icons
const pageConfig: Record<string, { route: string; icon: React.ReactNode; color: string }> = {
  'students_list': {
    route: '/students/list',
    icon: <PeopleIcon />,
    color: '#3b82f6' // Blue
  },
  'student_profile': {
    route: '/students/list', // Redirect to list since we need student ID for profile
    icon: <PersonIcon />,
    color: '#10b981' // Green
  },
  'attendance_reports': {
    route: '/attendance/report',
    icon: <AssessmentIcon />,
    color: '#f59e0b' // Orange
  },
  'examination_results': {
    route: '/examination',
    icon: <QuizIcon />,
    color: '#8b5cf6' // Purple
  },
  'test_records': {
    route: '/test-records',
    icon: <AssignmentIcon />,
    color: '#06b6d4' // Cyan
  },
  'reports': {
    route: '/reports',
    icon: <BarChartIcon />,
    color: '#ef4444' // Red
  },
  'fee_analytics': {
    route: '/fee-management',
    icon: <AttachMoneyIcon />,
    color: '#10b981' // Green
  },
  'fine_statistics': {
    route: '/fines/statistics',
    icon: <ReceiptLongIcon />,
    color: '#f59e0b' // Orange
  },
  'employees_list': {
    route: '/employees/list',
    icon: <SchoolIcon />,
    color: '#6366f1' // Indigo
  },
  'dashboard': {
    route: '/dashboard',
    icon: <DashboardIcon />,
    color: '#9333ea' // Purple
  }
};

const GuestDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const [renderSettings, setRenderSettings] = useState<RenderSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      if (user?.school_id) {
        try {
          const settings = await fetchRenderSettings(user.school_id);
          setRenderSettings(settings);
        } catch (error) {
          console.error('Error fetching render settings:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  if (loading) {
    return <Loader />;
  }

  // Filter pages based on render settings
  // If settings are not loaded yet, show all pages (they'll be filtered by ProtectedRoute)
  const visiblePages = renderSettings 
    ? GUEST_ACCESSIBLE_PAGES.filter(page => {
        return isGuestPageAccessible(renderSettings, page.key);
      })
    : GUEST_ACCESSIBLE_PAGES; // Show all pages if settings not loaded yet

  if (visiblePages.length === 0) {
    return (
      <Container>
        <WelcomeHeader>
          <Title>Welcome, {user?.name || 'Guest'}</Title>
          <Subtitle>No pages are currently available. Please contact your administrator to enable access to pages.</Subtitle>
        </WelcomeHeader>
      </Container>
    );
  }

  return (
    <Container>
      <WelcomeHeader>
        <Title>Welcome, {user?.name || 'Guest'}</Title>
        <Subtitle>Select a page to view (read-only access)</Subtitle>
      </WelcomeHeader>

      <QuickLinksGrid>
        {visiblePages.map((page) => {
          const config = pageConfig[page.key];
          if (!config) return null;

          return (
            <QuickLinkCard
              key={page.key}
              onClick={() => navigate(config.route)}
              $color={config.color}
            >
              <CardHeader $color={config.color}>
                <CardIcon $color={config.color}>
                  {config.icon}
                </CardIcon>
                <CardTitle>{page.label}</CardTitle>
              </CardHeader>
              <CardDescription>{page.description}</CardDescription>
            </QuickLinkCard>
          );
        })}
      </QuickLinksGrid>
    </Container>
  );
};

export default GuestDashboard;

