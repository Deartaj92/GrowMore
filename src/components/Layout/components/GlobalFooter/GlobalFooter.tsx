import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { usePageFooter } from '../../contexts/PageFooterContext';
import { useTheme } from '../../contexts/ThemeContext';
import { darkTheme, lightTheme } from '../../constants';

const FooterContainer = styled.footer<{ visible: boolean; $keyboardOffset: number }>`
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
  position: sticky;
  bottom: ${({ $keyboardOffset }) => $keyboardOffset}px;
  width: 100%;
  transition: bottom 0.2s ease-out;
  
  @media (max-width: 700px) {
    padding: 0.4rem 0.75rem;
    min-height: 32px;
  }
`;

const FooterContent = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.85rem;
  width: 100%;
  
  @media (max-width: 700px) {
    font-size: 0.8rem;
  }
`;

const GlobalFooter: React.FC = () => {
  const { footerContent } = usePageFooter();
  const { theme } = useTheme();
  const themeObj = theme === 'dark' ? darkTheme : lightTheme;
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700;
  const lastHeightRef = useRef<number>(window.innerHeight);

  useEffect(() => {
    if (!isMobile) {
      setKeyboardOffset(0);
      return;
    }

    let keyboardHeight = 0;
    let isInputFocused = false;

    // Function to calculate keyboard height
    const calculateKeyboardHeight = () => {
      const currentHeight = window.innerHeight;
      const heightDiff = lastHeightRef.current - currentHeight;
      
      // If height decreased significantly (more than 150px), keyboard is likely open
      if (heightDiff > 150) {
        keyboardHeight = heightDiff;
        return keyboardHeight;
      }
      
      // Use Visual Viewport API if available (more accurate)
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const diff = windowHeight - viewportHeight;
        
        if (diff > 150) {
          keyboardHeight = diff;
          return keyboardHeight;
        }
      }
      
      keyboardHeight = 0;
      return 0;
    };

    // Handle window resize (keyboard show/hide)
    const handleResize = () => {
      if (!isInputFocused) {
        setKeyboardOffset(0);
        lastHeightRef.current = window.innerHeight;
        return;
      }

      const height = calculateKeyboardHeight();
      setKeyboardOffset(height);
      lastHeightRef.current = window.innerHeight;
    };

    // Handle Visual Viewport changes (more accurate for mobile keyboards)
    const handleVisualViewportResize = () => {
      if (!isInputFocused || !window.visualViewport) return;
      
      const viewportHeight = window.visualViewport.height;
      const windowHeight = window.innerHeight;
      const diff = windowHeight - viewportHeight;
      
      if (diff > 150) {
        setKeyboardOffset(diff);
      } else {
        setKeyboardOffset(0);
      }
    };

    // Handle input focus
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        isInputFocused = true;
        // Small delay to let keyboard appear
        setTimeout(() => {
          const height = calculateKeyboardHeight();
          setKeyboardOffset(height);
        }, 300);
      }
    };

    // Handle input blur
    const handleBlur = () => {
      isInputFocused = false;
      // Delay to let keyboard hide
      setTimeout(() => {
        setKeyboardOffset(0);
      }, 100);
    };

    // Add event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('focusin', handleFocus);
    window.addEventListener('focusout', handleBlur);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportResize);
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('focusin', handleFocus);
      window.removeEventListener('focusout', handleBlur);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
      }
    };
  }, [isMobile]);

  if (!footerContent || footerContent.visible === false) {
    return null;
  }

  return (
    <FooterContainer 
      theme={themeObj} 
      visible={!!footerContent.visible}
      $keyboardOffset={keyboardOffset}
    >
      <FooterContent theme={themeObj}>
        {footerContent.content}
      </FooterContent>
    </FooterContainer>
  );
};

export default GlobalFooter;

