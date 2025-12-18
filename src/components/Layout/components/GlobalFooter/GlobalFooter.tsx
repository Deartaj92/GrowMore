import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { usePageFooter } from '../../contexts/PageFooterContext';
import { useTheme } from '../../contexts/ThemeContext';
import { darkTheme, lightTheme } from '../../constants';

const FooterContainer = styled.footer<{ visible: boolean }>`
  flex-shrink: 0;
  display: ${({ visible }) => visible ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.CARD};
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  box-shadow: 0 -1px 6px rgba(0, 0, 0, 0.1);
  min-height: 36px;
  padding: 0.5rem 1rem;
  z-index: 100;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  
  @media (max-width: 700px) {
    padding: 0.4rem 0.75rem;
    min-height: 32px;
  }
`;

const FooterContent = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.85rem;
  width: 100%;
  pointer-events: auto;
  
  @media (max-width: 700px) {
    font-size: 0.8rem;
  }
`;

interface GlobalFooterProps {
  onHeightChange?: (height: number) => void;
}

const GlobalFooter: React.FC<GlobalFooterProps> = ({ onHeightChange }) => {
  const { footerContent } = usePageFooter();
  const { theme } = useTheme();
  const themeObj = theme === 'dark' ? darkTheme : lightTheme;
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!footerRef.current || !footerContent || footerContent.visible === false) {
      onHeightChange?.(0);
      return;
    }

    const updateHeight = () => {
      if (footerRef.current) {
        const height = footerRef.current.offsetHeight;
        onHeightChange?.(height);
        }
    };

    // Initial measurement
    updateHeight();

    // Use ResizeObserver to track height changes
    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    resizeObserver.observe(footerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [footerContent, onHeightChange]);

  // Don't show footer if it's not visible or if it's in loading state
  // Footer should only show after content has loaded
  if (!footerContent || footerContent.visible === false || footerContent.loading === true) {
    return null;
  }

  return (
    <FooterContainer 
      ref={footerRef}
      theme={themeObj} 
      visible={!!footerContent.visible}
    >
      <FooterContent theme={themeObj}>
        {footerContent.content}
      </FooterContent>
    </FooterContainer>
  );
};

export default GlobalFooter;

