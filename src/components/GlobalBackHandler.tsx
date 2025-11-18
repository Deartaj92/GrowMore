import React, { useEffect } from 'react';
import { useBackNavigation } from '../hooks/useBackNavigation';
import { isWeb } from '../utils/platformDetection';

interface GlobalBackHandlerProps {
  onExit?: () => void;
}

const GlobalBackHandler: React.FC<GlobalBackHandlerProps> = ({ onExit }) => {
  // Don't render anything on web - let browser handle navigation natively
  if (isWeb()) {
    return null;
  }

  const { handleBackPress } = useBackNavigation({
    onExit,
    exitDelay: 2000,
    showExitPrompt: true
  });

  // Handle hardware back button (Android) and browser back
  // This component only renders on Electron/Capacitor, so we can safely set up handlers
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
      
      // Don't handle Escape key here - let modals handle it themselves
      // Escape key handling was causing infinite recursion with closeAllModals
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleBackPress]);

  // This component doesn't render anything
  return null;
};

export default GlobalBackHandler;
