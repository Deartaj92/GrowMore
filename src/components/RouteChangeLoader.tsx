import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLoading } from '../contexts/LoadingContext';

const RouteChangeLoader: React.FC = () => {
  const location = useLocation();
  const { setLoading } = useLoading();

  useEffect(() => {
    // Show loader when route changes
    setLoading(true);
    
    // Fallback timeout to ensure loader doesn't stay active indefinitely
    // This is a safety net in case pages don't use the usePageReady hook
    const fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 3000); // 3 second fallback timeout (minimum 2s + 1s buffer)

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [location.pathname, setLoading]);

  return null;
};

export default RouteChangeLoader; 