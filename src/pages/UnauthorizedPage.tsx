import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Warning as WarningIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background: ${({ theme }) => theme.BG};
  text-align: center;
`;

const Icon = styled.div`
  color: #ef4444;
  font-size: 4rem;
  margin-bottom: 1.5rem;

  svg {
    width: 4rem;
    height: 4rem;
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 1rem;
`;

const Message = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0 0 2rem;
  max-width: 500px;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  background: #4a6cf7;
  color: white;

  &:hover {
    background: #3a5ce5;
    transform: translateY(-1px);
  }
`;

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Container>
      <Icon>
        <WarningIcon fontSize="inherit" />
      </Icon>
      <Title>Access Denied</Title>
      <Message>
        {user ? 
          `Sorry, you don't have permission to access this page. This area requires higher privileges than your current role (${user.role}).` :
          'Please log in to access this page.'}
      </Message>
      <Button onClick={() => navigate('/login')}>
        <ArrowBackIcon />
        Go Back
      </Button>
    </Container>
  );
};

export default UnauthorizedPage; 