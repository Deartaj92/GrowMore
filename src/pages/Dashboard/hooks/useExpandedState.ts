import { useState, useEffect } from 'react';

export function useExpandedState(key: string, defaultValue: boolean = false) {
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(isExpanded));
    } catch (error) {
      // Failed to save state
    }
  }, [isExpanded, key]);

  return [isExpanded, setIsExpanded] as const;
}

