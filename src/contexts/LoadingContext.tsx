import React, { createContext, useContext, useState } from 'react';

const LoadingContext = createContext<{
  loading: boolean;
  setLoading: (val: boolean) => void;
}>({
  loading: false,
  setLoading: () => {},
});

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  return (
    <LoadingContext.Provider value={{ loading, setLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}; 