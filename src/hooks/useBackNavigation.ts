import { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface UseBackNavigationOptions {
  onExit?: () => void;
  exitDelay?: number;
  showExitPrompt?: boolean;
}

export const useBackNavigation = (options: UseBackNavigationOptions = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationHistory = useRef<string[]>([]);
  const lastBackPress = useRef<number>(0);
  const exitPromptShown = useRef<boolean>(false);
  const exitTimeoutRef = useRef<NodeJS.Timeout>();
  
  const {
    onExit,
    exitDelay = 2000,
    showExitPrompt = true
  } = options;

  // Check if any modals or sidebars are open
  const checkForOpenModals = () => {
    // Check for Material-UI modals
    const muiModals = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
    if (muiModals.length > 0) {
      return true;
    }
    
    // Check for custom modals
    const customModals = document.querySelectorAll('.modal, .dialog, [data-modal="true"]');
    if (customModals.length > 0) {
      return true;
    }
    
    // Check for any visible overlays or backdrops
    const overlays = document.querySelectorAll('[class*="overlay"], [class*="backdrop"], [class*="modal-overlay"]');
    let hasVisibleOverlay = false;
    overlays.forEach(overlay => {
      const style = window.getComputedStyle(overlay);
      if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
        hasVisibleOverlay = true;
      }
    });
    if (hasVisibleOverlay) {
      return true;
    }
    
    // Check for sidebar
    const sidebar = document.querySelector('[data-sidebar="true"]');
    if (sidebar) {
      // Check if sidebar is expanded by looking at CSS transform or classes
      const computedStyle = window.getComputedStyle(sidebar);
      const transform = computedStyle.transform;
      const isExpanded = transform !== 'none' && !transform.includes('translateX(-100%)');
      
      if (isExpanded || sidebar.classList.contains('expanded')) {
        return true;
      }
    }
    
    return false;
  };

  // Close all open modals and sidebars
  const closeAllModals = () => {
    // Close Material-UI modals by triggering escape key
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(escapeEvent);
    
    // Close custom modals
    const customModals = document.querySelectorAll('.modal, .dialog, [data-modal="true"]');
    customModals.forEach(modal => {
      const closeButton = modal.querySelector('[data-close="true"], .close, .modal-close');
      if (closeButton) {
        (closeButton as HTMLElement).click();
      }
    });
    
    // Close overlays and backdrops
    const overlays = document.querySelectorAll('[class*="overlay"], [class*="backdrop"], [class*="modal-overlay"]');
    overlays.forEach(overlay => {
      const style = window.getComputedStyle(overlay);
      if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
        // Try to find close button or trigger click on overlay
        const closeButton = overlay.querySelector('[data-close="true"], .close, .modal-close');
        if (closeButton) {
          (closeButton as HTMLElement).click();
        } else {
          // If no close button, click the overlay itself
          (overlay as HTMLElement).click();
        }
      }
    });
    
    // Close sidebar by triggering close event
    const sidebar = document.querySelector('[data-sidebar="true"]');
    if (sidebar) {
      const computedStyle = window.getComputedStyle(sidebar);
      const transform = computedStyle.transform;
      const isExpanded = transform !== 'none' && !transform.includes('translateX(-100%)');
      
      if (isExpanded || sidebar.classList.contains('expanded')) {
        const closeEvent = new CustomEvent('closeSidebar', { bubbles: true });
        sidebar.dispatchEvent(closeEvent);
      }
    }
  };

  // Track navigation history
  useEffect(() => {
    navigationHistory.current.push(location.pathname);
    
    // Keep only last 10 entries to prevent memory issues
    if (navigationHistory.current.length > 10) {
      navigationHistory.current.shift();
    }
  }, [location.pathname]);

  // Handle back button press
  const handleBackPress = useCallback(() => {
    const now = Date.now();
    const timeSinceLastPress = now - lastBackPress.current;
    
    // First, check if any modals or sidebars are open
    if (checkForOpenModals()) {
      // Close modals/sidebars first
      closeAllModals();
      return;
    }
    
    // If this is the first back press or enough time has passed, reset
    if (timeSinceLastPress > exitDelay) {
      lastBackPress.current = now;
      exitPromptShown.current = false;
      
      // Check if we can go back in navigation history
      if (navigationHistory.current.length > 1) {
        // Remove current location
        navigationHistory.current.pop();
        // Navigate to previous location
        const previousPath = navigationHistory.current[navigationHistory.current.length - 1];
        if (previousPath && previousPath !== location.pathname) {
          navigate(previousPath);
          return;
        }
      }
      
      // If no previous page or we're at the root, show exit prompt
      if (showExitPrompt && !exitPromptShown.current) {
        exitPromptShown.current = true;
        showExitPromptToast();
        
        // Reset after delay
        if (exitTimeoutRef.current) {
          clearTimeout(exitTimeoutRef.current);
        }
        exitTimeoutRef.current = setTimeout(() => {
          exitPromptShown.current = false;
        }, exitDelay);
        
        return;
      }
      
      // Second back press within delay - exit
      if (onExit) {
        onExit();
      } else {
        // Default exit behavior
        if (window.electronAPI) {
          window.electronAPI.minimize();
        } else {
          window.close();
        }
      }
    } else {
      // Second back press - exit immediately
      if (onExit) {
        onExit();
      } else {
        // Default exit behavior
        if (window.electronAPI) {
          window.electronAPI.minimize();
        } else {
          window.close();
        }
      }
    }
  }, [navigate, location.pathname, onExit, exitDelay, showExitPrompt]);

  // Show exit prompt toast
  const showExitPromptToast = () => {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #1f2937;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideUp 0.3s ease-out;
    `;
    
    toast.textContent = 'Press back again to exit';
    document.body.appendChild(toast);
    
    // Remove toast after delay
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, exitDelay);
  };

  // Add CSS animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from {
          transform: translateX(-50%) translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Handle hardware back button (Android)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Prevent default browser back behavior
      event.preventDefault();
      handleBackPress();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current);
      }
    };
  }, [handleBackPress]);

  // Handle keyboard backspace (for desktop testing)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Backspace' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleBackPress();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleBackPress]);

  return {
    handleBackPress,
    canGoBack: navigationHistory.current.length > 1,
    goBack: () => {
      if (navigationHistory.current.length > 1) {
        navigationHistory.current.pop();
        const previousPath = navigationHistory.current[navigationHistory.current.length - 1];
        if (previousPath) {
          navigate(previousPath);
        }
      }
    }
  };
};
