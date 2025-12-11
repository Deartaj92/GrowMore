import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';

export interface FooterContent {
  content?: ReactNode;
  visible?: boolean;
  loading?: boolean;
}

interface PageFooterContextType {
  footerContent: FooterContent | null;
  setFooterContent: (content: FooterContent | null) => void;
}

export const PageFooterContext = createContext<PageFooterContextType>({
  footerContent: null,
  setFooterContent: () => {},
});

export const PageFooterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [footerContent, setFooterContentState] = useState<FooterContent | null>(null);

  // Memoize setFooterContent to prevent unnecessary re-renders
  const setFooterContent = useCallback((content: FooterContent | null) => {
    setFooterContentState(content);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    footerContent,
    setFooterContent
  }), [footerContent, setFooterContent]);

  return (
    <PageFooterContext.Provider value={contextValue}>
      {children}
    </PageFooterContext.Provider>
  );
};

export const usePageFooter = () => useContext(PageFooterContext);


