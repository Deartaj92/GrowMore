import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { usePageFooter } from '../../contexts/PageFooterContext';
import { useTheme } from '../../contexts/ThemeContext';
import { darkTheme, lightTheme } from '../../constants';

const FooterContainer = styled.footer<{ visible: boolean; bottom: number; transformY: number; transformX: number }>`
  flex-shrink: 0;
  display: ${({ visible }) => visible ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.CARD};
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  box-shadow: 0 -1px 6px rgba(0, 0, 0, 0.1);
  min-height: 36px;
  padding: 0.5rem 1rem;
  z-index: 9999; /* Very high z-index to ensure it's above everything */
  position: fixed;
  bottom: ${({ bottom }) => `${bottom}px`};
  left: 0;
  right: 0;
  width: 100%;
  /* Use safe area insets for devices with notches/home indicators */
  padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
  
  /* Smooth transitions for all position changes */
  transform: translate(${({ transformX }) => `${transformX}px`}, ${({ transformY }) => `${transformY}px`}) translateZ(0);
  will-change: transform, bottom;
  transition: bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
              transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  /* Ensure footer is positioned relative to viewport, not document */
  position: fixed;
  /* Prevent footer from being affected by parent transforms or scrolling */
  isolation: isolate;
  /* Smooth rendering */
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  
  @media (max-width: 700px) {
    padding: 0.4rem 0.75rem;
    padding-bottom: calc(0.4rem + env(safe-area-inset-bottom, 0px));
    min-height: 32px;
    /* Ensure footer stays locked on mobile - independent of scroll */
    position: fixed;
    -webkit-transform: translate(${({ transformX }) => `${transformX}px`}, ${({ transformY }) => `${transformY}px`}) translateZ(0);
    transform: translate(${({ transformX }) => `${transformX}px`}, ${({ transformY }) => `${transformY}px`}) translateZ(0);
    /* Smoother transitions on mobile */
    transition: bottom 0.25s cubic-bezier(0.4, 0, 0.2, 1), 
                transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
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
  const [footerBottom, setFooterBottom] = useState(0);
  const [transformY, setTransformY] = useState(0);
  const [transformX, setTransformX] = useState(0);
  const initialViewportHeightRef = useRef<number>(0);
  const isMobileRef = useRef<boolean>(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  // Create portal container at document body level for mobile
  useEffect(() => {
    const checkMobile = () => {
      isMobileRef.current = window.innerWidth <= 700;
      if (isMobileRef.current && initialViewportHeightRef.current === 0) {
        initialViewportHeightRef.current = window.innerHeight;
      }
      
      // On mobile, render footer in portal at body level to avoid scroll issues
      if (isMobileRef.current) {
        let portal = document.getElementById('global-footer-portal');
        if (!portal) {
          portal = document.createElement('div');
          portal.id = 'global-footer-portal';
          portal.style.position = 'fixed';
          portal.style.pointerEvents = 'none';
          portal.style.zIndex = '9999';
          document.body.appendChild(portal);
        }
        setPortalContainer(portal);
      } else {
        // On desktop, use normal rendering
        setPortalContainer(null);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      // Clean up portal on unmount
      const portal = document.getElementById('global-footer-portal');
      if (portal && portal.parentNode) {
        portal.parentNode.removeChild(portal);
      }
    };
  }, []);

  // Handle keyboard visibility and viewport positioning on mobile
  useEffect(() => {
    // Only handle keyboard on mobile devices
    const checkMobile = () => {
      return window.innerWidth <= 700;
    };

    if (!checkMobile()) {
      setFooterBottom(0);
      return;
    }

    // Initialize initial height on mobile
    if (initialViewportHeightRef.current === 0) {
      initialViewportHeightRef.current = window.innerHeight;
    }

    let rafId: number | null = null;
    const visualViewport = (window as any).visualViewport;
    const THROTTLE_MS = 16; // ~60fps

    const updateFooterPosition = () => {
      const now = performance.now();
      // Throttle updates to prevent jank
      if (now - lastUpdateTimeRef.current < THROTTLE_MS) {
        return;
      }
      lastUpdateTimeRef.current = now;

      if (!checkMobile()) {
        setFooterBottom(0);
        setTransformY(0);
        setTransformX(0);
        return;
      }

      if (visualViewport) {
        // Use Visual Viewport API (modern browsers - most accurate)
        const viewportHeight = visualViewport.height;
        const viewportTop = visualViewport.offsetTop;
        const viewportLeft = visualViewport.offsetLeft;
        const windowHeight = window.innerHeight;
        const heightDifference = windowHeight - viewportHeight;
        
        // Calculate footer position relative to visual viewport
        if (heightDifference > 150) {
          // Keyboard is open - position footer at bottom of visual viewport
          setFooterBottom(heightDifference);
          // Compensate for viewport scroll with transform
          setTransformY(viewportTop);
          setTransformX(-viewportLeft);
          
          // Update width and positioning for horizontal scroll
          if (footerRef.current) {
            if (viewportLeft !== 0) {
              footerRef.current.style.left = `${viewportLeft}px`;
              footerRef.current.style.right = 'auto';
              footerRef.current.style.width = `${visualViewport.width}px`;
            } else {
              footerRef.current.style.left = '0';
              footerRef.current.style.right = '0';
              footerRef.current.style.width = '100%';
            }
          }
        } else {
          // Keyboard is closed - footer at bottom of window
          setFooterBottom(0);
          // Still compensate for any viewport scroll
          setTransformY(viewportTop);
          setTransformX(-viewportLeft);
          
          // Reset horizontal positioning
          if (footerRef.current) {
            if (viewportLeft !== 0) {
              footerRef.current.style.left = `${viewportLeft}px`;
              footerRef.current.style.right = 'auto';
              footerRef.current.style.width = `${visualViewport.width}px`;
            } else {
              footerRef.current.style.left = '0';
              footerRef.current.style.right = '0';
              footerRef.current.style.width = '100%';
            }
          }
        }
      } else {
        // Fallback: detect keyboard by height change
        const currentHeight = window.innerHeight;
        
        if (currentHeight > initialViewportHeightRef.current) {
          initialViewportHeightRef.current = currentHeight;
        }
        
        const heightDiff = initialViewportHeightRef.current - currentHeight;
        
        if (heightDiff > 150) {
          setFooterBottom(heightDiff);
        } else {
          setFooterBottom(0);
        }
        setTransformY(0);
        setTransformX(0);
      }
    };

    // Use Visual Viewport API if available (preferred method)
    if (visualViewport) {
      // Use passive listeners for better performance
      visualViewport.addEventListener('resize', updateFooterPosition, { passive: true });
      visualViewport.addEventListener('scroll', updateFooterPosition, { passive: true });
    } else {
      // Fallback to window resize
      window.addEventListener('resize', updateFooterPosition, { passive: true });
      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          initialViewportHeightRef.current = window.innerHeight;
          updateFooterPosition();
        }, 100);
      });
    }
    
    // Use requestAnimationFrame for smooth, throttled updates
    // Throttling is handled inside updateFooterPosition for consistent frame rate
    const animate = () => {
      updateFooterPosition();
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    // Initial check
    updateFooterPosition();

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (visualViewport) {
        visualViewport.removeEventListener('resize', updateFooterPosition);
        visualViewport.removeEventListener('scroll', updateFooterPosition);
      } else {
        window.removeEventListener('resize', updateFooterPosition);
        window.removeEventListener('orientationchange', updateFooterPosition);
      }
    };
  }, []);

  // Ensure footer stays fixed - styles are now handled via CSS transitions through props
  // This effect only ensures critical properties are maintained
  useEffect(() => {
    if (!footerRef.current || !isMobileRef.current) return;

    const enforceCriticalStyles = () => {
      if (!footerRef.current) return;
      
      // Ensure critical fixed positioning properties
      footerRef.current.style.position = 'fixed';
      footerRef.current.style.zIndex = '9999';
    };

    enforceCriticalStyles();

    // Only enforce on major changes, not continuously
    const handleResize = () => {
      enforceCriticalStyles();
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [footerContent]);

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

  const footerElement = (
    <FooterContainer 
      ref={footerRef}
      theme={themeObj} 
      visible={!!footerContent.visible}
      bottom={footerBottom}
      transformY={transformY}
      transformX={transformX}
      style={{ pointerEvents: 'auto' }}
    >
      <FooterContent theme={themeObj}>
        {footerContent.content}
      </FooterContent>
    </FooterContainer>
  );

  // On mobile, render footer in portal at body level to make it truly independent
  // On desktop, render normally
  if (portalContainer && isMobileRef.current) {
    return createPortal(footerElement, portalContainer);
  }

  return footerElement;
};

export default GlobalFooter;

