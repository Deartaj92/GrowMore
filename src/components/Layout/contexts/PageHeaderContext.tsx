import React, { createContext, useContext, useState } from 'react';
import { PageHeaderContextType } from '../types';

export const PageHeaderContext = createContext<PageHeaderContextType>({ setPageHeader: () => { } });

export const PageHeaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pageHeader, setPageHeader] = useState('');

  return (
    <PageHeaderContext.Provider value={{ setPageHeader }}>
      {children}
    </PageHeaderContext.Provider>
  );
};

export const usePageHeader = () => useContext(PageHeaderContext);

