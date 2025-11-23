import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../contexts/ThemeContext';
import { useContext } from 'react';
import {
  Business as BusinessIcon,
  School as SchoolIcon,
  CalendarMonth as CalendarMonthIcon,
  BeachAccess as BeachAccessIcon,
  People as PeopleIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  Settings as SettingsIcon,
  Campaign as CampaignIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';

// Styled Components
const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 24px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  margin-bottom: 40px;
  text-align: center;
  
  @media (max-width: 768px) {
    margin-bottom: 16px;
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: linear-gradient(135deg, ${({ theme }) => theme.TEXT_PRIMARY}, ${({ theme }) => theme.TEXT_SECONDARY});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  @media (max-width: 768px) {
    font-size: 1.4rem;
    gap: 8px;
    margin: 0 0 4px 0;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0;
  font-weight: 400;
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
    line-height: 1.2;
  }
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  justify-items: center;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    justify-items: center;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
    justify-items: stretch;
  }
`;

const Card = styled.div<{ $color?: string }>`
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
  height: 180px;
  
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
    height: 160px;
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
  
  /* Perfect vertical and horizontal centering */
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
  
  /* Override Material-UI icon styles for perfect centering */
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
  
  /* Additional centering for Material-UI icons */
  & > * {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 100% !important;
    height: 100% !important;
  }
  
  ${Card}:hover & {
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

const CardBody = styled.div`
  padding: 0 20px 20px 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    padding: 0 16px 16px 16px;
  }
`;

const CardDescription = styled.p`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0 0 12px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
    margin: 0 0 10px 0;
    -webkit-line-clamp: 2;
  }
`;

const CardAction = styled.div<{ $color?: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ $color }) => $color || '#3b82f6'};
  font-size: 0.9rem;
  font-weight: 600;
  margin-top: auto;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, ${({ $color }) => $color ? `${$color}20` : '#3b82f620'}, transparent);
    transition: left 0.5s ease;
  }
  
  &::after {
    content: '→';
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 1rem;
    display: inline-block;
  }
  
  ${Card}:hover & {
    transform: translateX(2px);
    
    &::before {
      left: 100%;
    }
    
    &::after {
      transform: translateX(6px) scale(1.1);
    }
  }
  
  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

// Settings menu items
const settingsItems = [
  {
    title: 'Institute Profile',
    description: 'Manage school information, contact details, and institutional settings with logo and branding',
    icon: <BusinessIcon />,
    path: '/settings/institute-profile',
    color: '#3b82f6' // Blue
  },
  {
    title: 'Classes',
    description: 'Create and manage class structures, sections, and academic divisions with comprehensive organization',
    icon: <SchoolIcon />,
    path: '/settings/classes',
    color: '#10b981' // Green
  },
  {
    title: 'Sessions',
    description: 'Configure academic sessions, terms, and academic year management with date ranges and periods',
    icon: <CalendarMonthIcon />,
    path: '/settings/sessions',
    color: '#f59e0b' // Orange
  },
  {
    title: 'Holidays',
    description: 'Set up holiday calendar, vacation periods, and non-working days with automatic scheduling',
    icon: <BeachAccessIcon />,
    path: '/settings/holidays',
    color: '#8b5cf6' // Purple
  },
  {
    title: 'User Management',
    description: 'Manage user accounts, roles, permissions, and access control for staff and administrators',
    icon: <PeopleIcon />,
    path: '/settings/user-management',
    color: '#ef4444' // Red
  },
  {
    title: 'Student Password Management',
    description: 'Manage and reset student login passwords, view current passwords, and set default credentials for students',
    icon: <LockIcon />,
    path: '/settings/student-passwords',
    color: '#06b6d4' // Cyan
  },
  {
    title: 'Render Settings',
    description: 'Control which menu cards and tabs are visible to teachers and students in their respective dashboards',
    icon: <VisibilityIcon />,
    path: '/settings/render-settings',
    color: '#9333ea' // Purple
  },
  {
    title: 'General Settings',
    description: 'Configure general system settings including individual teacher score deduction preferences',
    icon: <SettingsIcon />,
    path: '/settings/general-settings',
    color: '#6366f1' // Indigo
  },
  {
    title: 'User Announcements',
    description: 'Create announcement pop-ups for students and teachers that show when they open the app',
    icon: <CampaignIcon />,
    path: '/settings/user-announcements',
    color: '#f97316' // Amber / announcement
  },
  {
    title: 'Notification Settings',
    description: 'Manage your notification preferences and control which categories of notifications you receive',
    icon: <NotificationsIcon />,
    path: '/settings/notifications',
    color: '#ec4899' // Pink
  }
];

const SettingsDashboard: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const handleCardClick = (path: string) => {
    navigate(path);
  };

  return (
    <PageContainer theme={theme}>
      <Header>
        <Title>
          <BusinessIcon style={{ fontSize: 40 }} />
          System Settings
        </Title>
        <Subtitle>
          Configure and manage all system settings and institutional preferences
        </Subtitle>
      </Header>

      <CardsGrid>
        {settingsItems.map((item, index) => (
          <Card 
            key={index}
            onClick={() => handleCardClick(item.path)}
            theme={theme}
            $color={item.color}
          >
            <CardHeader $color={item.color}>
              <CardIcon $color={item.color}>
                {item.icon}
              </CardIcon>
              <CardTitle>{item.title}</CardTitle>
            </CardHeader>
            <CardBody>
              <CardDescription>{item.description}</CardDescription>
              <CardAction $color={item.color}>
                Get Started
              </CardAction>
            </CardBody>
          </Card>
        ))}
      </CardsGrid>
    </PageContainer>
  );
};

export default SettingsDashboard;
