import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { SentimentVeryDissatisfied as NotFoundIcon, ArrowBack } from '@mui/icons-material';

const float = keyframes`
  0% { transform: translateY(0) scale(1.08) rotate(-8deg); }
  50% { transform: translateY(-14px) scale(1.13) rotate(8deg); }
  100% { transform: translateY(0) scale(1.08) rotate(-8deg); }
`;
const bgAnim = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const NotFoundBg = styled.div`
  min-height: 100vh;
  width: 100vw;
  position: fixed;
  top: 0; left: 0;
  z-index: 0;
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'linear-gradient(120deg, #232a3b 0%, #232a3b 40%, #4a6cf7 70%, #ef4444 100%)'
    : 'linear-gradient(120deg, #f5f7fa 0%, #e0e7ef 40%, #4a6cf7 70%, #ef4444 100%)'};
  background-size: 200% 200%;
  animation: ${bgAnim} 8s ease-in-out infinite;
  filter: blur(2px) brightness(0.9) saturate(1.1);
`;

const NotFoundContainer = styled.div`
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
`;
const GlassCard = styled.div`
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'rgba(30, 34, 54, 0.82)'
    : 'rgba(255,255,255,0.82)'};
  border-radius: 22px;
  box-shadow: 0 4px 32px #0005, 0 0 0 2.5px #4a6cf7cc, 0 0 16px 2px #ef4444cc;
  border: 1.5px solid #4a6cf7cc;
  padding: 2.1rem 1.3rem 1.5rem 1.3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  backdrop-filter: blur(12px) saturate(1.2);
  position: relative;
  margin-top: 2.5rem;
  margin-bottom: 2.5rem;
  max-width: 320px;
  width: 96vw;
  box-sizing: border-box;
  border-image: linear-gradient(120deg, #4a6cf7 0%, #ef4444 100%) 1;
`;
const NotFoundIconCircle = styled.div`
  background: ${({ theme }) => theme.BG === '#252525'
    ? 'linear-gradient(135deg, #232a3b 60%, #4a6cf7 100%)'
    : 'linear-gradient(135deg, #e0e7ef 60%, #4a6cf7 100%)'};
  border-radius: 50%;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.2rem;
  box-shadow: 0 4px 24px #4a6cf7cc, 0 0 0 4px #ef4444cc44;
  animation: ${float} 3.2s ease-in-out infinite;
  border: 2px solid #fff3;
  position: relative;
  z-index: 2;
`;
const NotFoundTitle = styled.h1`
  font-size: 1.45rem;
  font-weight: 900;
  margin-bottom: 0.5rem;
  color: ${({ theme }) => theme.BG === '#252525' ? '#fff' : '#232a3b'};
  text-shadow: 0 2px 12px #4a6cf7cc, 0 0 4px #ef4444cc;
`;
const NotFoundText = styled.p`
  font-size: 0.98rem;
  color: ${({ theme }) => theme.BG === '#252525' ? '#b0b8d1' : '#4a6cf7'};
  margin-bottom: 1.2rem;
  text-align: center;
  text-shadow: 0 1px 4px #232a3b33;
`;
const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(90deg, #4a6cf7 60%, #ef4444 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.6rem 1.3rem;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 2px 12px #4a6cf799, 0 0 0 2px #ef4444cc;
  transition: background 0.18s, box-shadow 0.18s, transform 0.18s;
  letter-spacing: 0.01em;
  &:hover {
    background: linear-gradient(90deg, #274bb5 60%, #ef4444 100%);
    box-shadow: 0 4px 16px #4a6cf799, 0 0 0 4px #ef4444cc;
    transform: scale(1.04) translateY(-2px);
  }
`;

const PageNotFound: React.FC = () => {
  const navigate = useNavigate();
  return (
    <>
      <NotFoundBg />
      <NotFoundContainer>
        <GlassCard>
          <NotFoundIconCircle>
            <NotFoundIcon style={{ fontSize: 36, color: '#fff', filter: 'drop-shadow(0 0 8px #ef4444cc)' }} />
          </NotFoundIconCircle>
          <NotFoundTitle>Page Not Found</NotFoundTitle>
          <NotFoundText>
            Sorry, the page you are looking for does not exist or is under construction.<br />
            Please check the menu or return to the dashboard.
          </NotFoundText>
          <BackButton onClick={() => navigate('/')}> <ArrowBack /> Go to Dashboard </BackButton>
        </GlassCard>
      </NotFoundContainer>
    </>
  );
};

export default PageNotFound; 