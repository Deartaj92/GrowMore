import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { Refresh as RefreshIcon } from '@mui/icons-material';

const RefreshIndicator = styled.div<{ $visible: boolean; $pullDistance: number; $refreshing: boolean }>`
  position: fixed;
  top: ${props => {
    if (!props.$visible) return '-100px';
    // Keep it near header (44px header height + small offset)
    return '52px';
  }};
  left: 50%;
  transform: translateX(-50%);
  display: ${props => props.$visible ? 'flex' : 'none'};
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background: transparent;
  z-index: 1000;
  pointer-events: none;
  transition: ${props => props.$visible ? 'opacity 0.2s ease-out' : 'opacity 0.3s ease-in'};
  opacity: ${props => props.$visible ? 1 : 0};
`;

const RefreshIconWrapper = styled.div<{ $rotating: boolean; $pullDistance: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => props.theme.ACCENT || '#9333ea'};
  color: white;
  transform: rotate(${props => props.$rotating ? 180 : 0}deg) scale(${props => Math.min(1, props.$pullDistance / 80)});
  transition: ${props => props.$rotating ? 'transform 0.3s linear' : 'transform 0.2s ease-out'};
  margin-bottom: 8px;
  
  svg {
    font-size: 20px;
  }
`;

const RefreshText = styled.div<{ $visible: boolean }>`
  font-size: 0.85rem;
  color: ${props => props.theme.TEXT_SECONDARY || '#666'};
  font-weight: 500;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.2s ease;
`;

interface PullToRefreshProps {
  onRefresh: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  threshold?: number;
  pullDistance?: number;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  disabled = false,
  threshold = 80,
  pullDistance: maxPullDistance = 120
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const scrollableRef = useRef<HTMLElement | null>(null);
  const touchStartY = useRef<number>(0);
  const scrollTop = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  
  // Find the scrollable element (MainArea) after mount
  useEffect(() => {
    // Find MainArea specifically - it should be the main scroll container
    const findMainScrollable = () => {
      // Look for element with specific characteristics of MainArea
      const elements = document.querySelectorAll('*');
      for (const el of elements) {
        const style = window.getComputedStyle(el);
        const rect = (el as HTMLElement).getBoundingClientRect();
        // MainArea characteristics: overflow-y: auto, margin-top: 44px, height: calc(100vh - 44px)
        if (
          style.overflowY === 'auto' && 
          rect.top >= 44 && 
          rect.top < 50 &&
          (el as HTMLElement).offsetHeight > 0
        ) {
          scrollableRef.current = el as HTMLElement;
          return;
        }
      }
    };
    
    // Try immediately and after a short delay
    findMainScrollable();
    const timeout = setTimeout(findMainScrollable, 100);
    return () => clearTimeout(timeout);
  }, []);


  // Attach event listeners directly to the scrollable element
  useEffect(() => {
    const scrollable = scrollableRef.current;
    if (!scrollable) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (disabled || isRefreshing) return;
      
      // Check if MainArea is at the top (with small tolerance)
      if (scrollable.scrollTop <= 5) {
        const touchY = e.touches[0].clientY;
        const target = e.target as HTMLElement;
        
        // Check if touch is on a nested scrollable element
        let current: HTMLElement | null = target;
        let hasNestedScrollable = false;
        while (current && current !== scrollable) {
          const style = window.getComputedStyle(current);
          if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && 
              current.scrollHeight > current.clientHeight) {
            hasNestedScrollable = true;
            break;
          }
          current = current.parentElement;
        }
        
        // Only allow pull-to-refresh if:
        // 1. Touch started near the top of viewport (within first 150px)
        // 2. No nested scrollable element is present, OR nested scrollable is also at top
        if (touchY < 150 && (!hasNestedScrollable || (current && current.scrollTop <= 5))) {
          touchStartY.current = touchY;
          scrollTop.current = scrollable.scrollTop;
          isDragging.current = true;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (disabled || isRefreshing || !isDragging.current) return;
      
      // Check if MainArea is still at the top
      if (scrollable.scrollTop > 5) {
        setIsPulling(false);
        setPullDistance(0);
        isDragging.current = false;
        return;
      }
      
      const touchY = e.touches[0].clientY;
      const deltaY = touchY - touchStartY.current;
      const target = e.target as HTMLElement;
      
      // Check if there's a nested scrollable element
      let current: HTMLElement | null = target;
      let nestedScrollable: HTMLElement | null = null;
      while (current && current !== scrollable) {
        const style = window.getComputedStyle(current);
        if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && 
            current.scrollHeight > current.clientHeight) {
          nestedScrollable = current;
          break;
        }
        current = current.parentElement;
      }
      
      // If there's a nested scrollable that can scroll down, cancel pull-to-refresh
      if (nestedScrollable) {
        const canScrollDown = nestedScrollable.scrollTop < nestedScrollable.scrollHeight - nestedScrollable.clientHeight - 5;
        // If nested scrollable can scroll and user is trying to scroll down (or already scrolled)
        if (canScrollDown || nestedScrollable.scrollTop > 5) {
          setIsPulling(false);
          setPullDistance(0);
          isDragging.current = false;
          return;
        }
      }
      
      // Only allow downward pull when at the very top and no nested scrolling
      if (deltaY > 0 && scrollable.scrollTop <= 5) {
        // Only prevent default if we're sure it's a pull gesture (significant downward movement)
        if (deltaY > 10) {
          e.preventDefault();
        }
        setIsPulling(true);
        const resistance = 0.5;
        const rawDistance = deltaY;
        const distance = rawDistance <= threshold 
          ? rawDistance 
          : threshold + (rawDistance - threshold) * resistance;
        setPullDistance(Math.min(distance, maxPullDistance));
      } else if (deltaY <= 0) {
        setIsPulling(false);
        setPullDistance(0);
        isDragging.current = false;
      }
    };

    const handleTouchEnd = () => {
      if (disabled || isRefreshing || !isDragging.current) return;
      isDragging.current = false;
      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        setIsPulling(false);
        onRefresh();
        setTimeout(() => {
          setPullDistance(0);
          setIsRefreshing(false);
        }, 500);
      } else {
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    const handleScroll = () => {
      if (scrollable.scrollTop > 0 && isPulling) {
        setIsPulling(false);
        setPullDistance(0);
        isDragging.current = false;
      }
    };

    scrollable.addEventListener('touchstart', handleTouchStart, { passive: false });
    scrollable.addEventListener('touchmove', handleTouchMove, { passive: false });
    scrollable.addEventListener('touchend', handleTouchEnd);
    scrollable.addEventListener('scroll', handleScroll);

    return () => {
      scrollable.removeEventListener('touchstart', handleTouchStart);
      scrollable.removeEventListener('touchmove', handleTouchMove);
      scrollable.removeEventListener('touchend', handleTouchEnd);
      scrollable.removeEventListener('scroll', handleScroll);
    };
  }, [disabled, isRefreshing, isPulling, pullDistance, threshold, maxPullDistance, onRefresh]);

  const indicator = (
    <RefreshIndicator
      $visible={isPulling || isRefreshing}
      $pullDistance={pullDistance}
      $refreshing={isRefreshing}
    >
      <RefreshIconWrapper
        $rotating={isRefreshing}
        $pullDistance={pullDistance}
      >
        <RefreshIcon />
      </RefreshIconWrapper>
      <RefreshText $visible={pullDistance >= threshold || isRefreshing}>
        {isRefreshing ? 'Refreshing...' : pullDistance >= threshold ? 'Release to refresh' : 'Pull to refresh'}
      </RefreshText>
    </RefreshIndicator>
  );

  return (
    <>
      {typeof document !== 'undefined' && createPortal(indicator, document.body)}
      {children}
    </>
  );
};

export default PullToRefresh;

