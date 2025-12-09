import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface FooterContent {
  content?: ReactNode;
  visible?: boolean;
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
  const [footerContent, setFooterContent] = useState<FooterContent | null>(null);

  return (
    <PageFooterContext.Provider value={{ footerContent, setFooterContent }}>
      {children}
    </PageFooterContext.Provider>
  );
};

export const usePageFooter = () => useContext(PageFooterContext);


