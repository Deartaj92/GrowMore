import React, { createContext, useContext, useState } from 'react';
import { MuteContextType } from '../types';

const MuteContext = createContext<MuteContextType>({ muted: false, toggleMute: () => { } });

export const MuteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [muted, setMuted] = useState(() => {
    const stored = localStorage.getItem('muted');
    return stored === 'true';
  });

  const toggleMute = () => {
    setMuted(m => {
      localStorage.setItem('muted', String(!m));
      return !m;
    });
  };

  return (
    <MuteContext.Provider value={{ muted, toggleMute }}>
      {children}
    </MuteContext.Provider>
  );
};

export const useMute = () => useContext(MuteContext);
export { MuteContext };

