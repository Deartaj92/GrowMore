import styled from 'styled-components';

export const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 12px 6px 12px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  height: 92vh;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transform: translateZ(0);
  will-change: transform;
`;

export const Header = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 6px 0 4px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.BG};
  box-shadow: 0 1px 6px #0001;
  border-radius: 10px;
  padding: 4px 8px 2px 8px;
  min-height: 36px;
`;

export const Title = styled.h2`
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 1px;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
`;

export const MainContent = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  padding: 16px 0;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 4px;
    transition: background 0.2s;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
  }
`;

export const InfoBox = styled.div`
  background: linear-gradient(135deg, ${({ theme }) => theme.ACCENT}15 0%, ${({ theme }) => theme.ACCENT}08 100%);
  border: 2px solid ${({ theme }) => theme.ACCENT}40;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 24px;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  line-height: 1.7;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  
  strong {
    color: ${({ theme }) => theme.ACCENT};
    font-weight: 600;
  }
`;

