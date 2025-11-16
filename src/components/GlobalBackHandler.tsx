import React, { useEffect } from 'react';
import { useBackNavigation } from '../hooks/useBackNavigation';

interface GlobalBackHandlerProps {
  onExit?: () => void;
}

const GlobalBackHandler: React.FC<GlobalBackHandlerProps> = ({ onExit }) => {
  const { handleBackPress } = useBackNavigation({
    onExit,
    exitDelay: 2000,
    showExitPrompt: true
  });

  // Handle hardware back button (Android) and browser back
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Prevent default browser back behavior
      event.preventDefault();
      event.stopImmediatePropagation();
      handleBackPress();
      
      // Push the current state back to prevent navigation
      window.history.pushState(null, '', window.location.pathname);
    };

    // Push initial state to enable back button handling
    window.history.pushState(null, '', window.location.pathname);

    // Add event listeners
    window.addEventListener('popstate', handlePopState, true);

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState, true);
    };
  }, [handleBackPress]);

  // Handle keyboard shortcuts for testing
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Backspace for testing back navigation
      if (event.key === 'Backspace' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleBackPress();
      }
      
      // Escape key for testing back navigation
      if (event.key === 'Escape') {
        event.preventDefault();
        handleBackPress();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleBackPress]);

  // This component doesn't render anything
  return null;
};

export default GlobalBackHandler;
