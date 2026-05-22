import React, { useEffect, useState, useContext } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import {
  Receipt as ReceiptIcon,
  Assessment as AssessmentIcon,
  AttachMoney as AttachMoneyIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// Styled Components
const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 24px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  height: 100%;
  min-height: 100%;
  padding-bottom: 2rem; /* Extra padding at bottom to prevent clipping */
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
  position: relative;
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

const CardContent = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const CardIcon = styled.div<{ $color?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${({ $color }) => $color ? `${$color}15` : '#3b82f615'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $color }) => $color || '#3b82f6'};
  
  & svg {
    font-size: 24px;
  }
  
  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
    
    & svg {
      font-size: 20px;
    }
  }
`;

const CardTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const CardDescription = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0;
  line-height: 1.5;
  flex: 1;
  
  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

const CardAction = styled.div`
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.ACCENT};
  font-size: 0.9rem;
  font-weight: 600;
  transition: transform 0.2s;
  
  ${Card}:hover & {
    transform: translateX(2px);
  }
  
  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

// Expense Management menu items
const expenseManagementItems = [
  {
    title: 'Expense Manager',
    description: 'Create, view, edit, and manage all school expenses with categories, payment methods, and status tracking',
    icon: <ReceiptIcon />,
    path: '/expense-manager',
    color: '#3b82f6' // Blue
  },
  {
    title: 'Expense Analytics',
    description: 'View comprehensive expense analytics, trends, category breakdowns, and financial insights',
    icon: <AssessmentIcon />,
    path: '/expense-analytics',
    color: '#10b981' // Green
  },
];

const ExpenseDashboard: React.FC = () => {
  const navigate = useNavigate();
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth();

  const handleCardClick = (path: string) => {
    navigate(path);
  };

  return (
    <>
      <PageContainer>
      <Header>
        <Title>
          <AttachMoneyIcon style={{ fontSize: '2.5rem' }} />
          Expense Management
        </Title>
        <Subtitle>
          Manage and track all school expenditures efficiently
        </Subtitle>
      </Header>

      <CardsGrid>
        {expenseManagementItems.map((item, index) => (
          <Card
            key={index}
            $color={item.color}
            onClick={() => handleCardClick(item.path)}
          >
            <CardContent>
              <CardHeader>
                <CardIcon $color={item.color}>
                  {item.icon}
                </CardIcon>
              </CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
              <CardAction>
                Open
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </CardAction>
            </CardContent>
          </Card>
        ))}
      </CardsGrid>
      </PageContainer>
    </>
  );
};

export default ExpenseDashboard;

