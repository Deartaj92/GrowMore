import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { ProgressContextType } from '../types';
import { ProgressBarOverlay, ProgressBar } from '../styles';

const ProgressContext = createContext<ProgressContextType>({
  startProgress: () => { },
  setProgress: () => { },
  completeProgress: () => { },
  resetProgress: () => { },
});

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [progress, setProgressState] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isIndeterminate, setIsIndeterminate] = useState(false);
  const [disableTransition, setDisableTransition] = useState(false);
  const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);

  const startProgress = useCallback((indeterminate = false) => {
    // Prevent multiple simultaneous starts
    if (isActiveRef.current) {
      return;
    }

    // Clear any existing timeout
    if (progressTimeoutRef.current) {
      clearTimeout(progressTimeoutRef.current);
      progressTimeoutRef.current = null;
    }

    // Temporarily disable transition to prevent showing previous progress
    setDisableTransition(true);

    // Reset progress to 0 immediately without transition
    setProgressState(0);

    isActiveRef.current = true;
    setIsVisible(true);
    setIsIndeterminate(indeterminate);

    // Re-enable transition after a brief delay
    setTimeout(() => {
      setDisableTransition(false);
    }, 50);
  }, []);

  const setProgress = useCallback((newProgress: number) => {
    if (isIndeterminate || !isActiveRef.current) return;

    // Ensure progress only goes forward
    setProgressState(prev => {
      const clampedProgress = Math.min(100, Math.max(0, newProgress));
      return Math.max(prev, clampedProgress);
    });
  }, [isIndeterminate]);

  const completeProgress = useCallback(() => {
    if (!isActiveRef.current) {
      return;
    }

    setProgressState(100);
    setIsIndeterminate(false);

    // Hide progress bar after completion
    if (progressTimeoutRef.current) {
      clearTimeout(progressTimeoutRef.current);
    }

    progressTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      isActiveRef.current = false;
    }, 300);
  }, []);

  const resetProgress = useCallback(() => {
    isActiveRef.current = false;
    setIsVisible(false);
    setProgressState(0);
    setIsIndeterminate(false);
    setDisableTransition(false);
    if (progressTimeoutRef.current) {
      clearTimeout(progressTimeoutRef.current);
      progressTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ProgressContext.Provider value={{ startProgress, setProgress, completeProgress, resetProgress }}>
      {children}
      <ProgressBarOverlay>
        <ProgressBar
          progress={progress}
          isVisible={isVisible}
          isIndeterminate={isIndeterminate}
          disableTransition={disableTransition}
        />
      </ProgressBarOverlay>
    </ProgressContext.Provider>
  );
};

export const useProgress = () => useContext(ProgressContext);
export { ProgressContext };

