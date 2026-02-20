import React, { createContext } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
});

export const darkTheme = {
  BG: '#252525',
  SIDEBAR_BG: '#2a2a2a',
  CARD: '#2a2a2a',
  ACCENT: '#4a6cf7',
  SHADOW: '0 1.8px 7.2px 0 #0003',
  TEXT_PRIMARY: '#e0e0e0',
  TEXT_SECONDARY: '#b0b8d1',
  BORDER: 'rgba(255, 255, 255, 0.05)',
  ICON_BG: 'rgba(74, 108, 247, 0.15)',
  HOVER_BG: 'rgba(74, 108, 247, 0.18)',
  FIELD_BG: '#252525',
  FIELD_BORDER: '#3a3f4b',
  ACCENT_INPUT: '#4a6cf7',
  CANCEL_BG: '#252525',
  CANCEL_COLOR: '#e0e0e0',
};

export const lightTheme = {
  BG: '#f5f7fa',
  SIDEBAR_BG: '#ffffff',
  CARD: '#ffffff',
  ACCENT: '#4a6cf7',
  SHADOW: '0 1.8px 7.2px 0 #0003',
  TEXT_PRIMARY: '#1a1a1a',
  TEXT_SECONDARY: '#666666',
  BORDER: 'rgba(0, 0, 0, 0.05)',
  ICON_BG: 'rgba(74, 108, 247, 0.1)',
  HOVER_BG: 'rgba(74, 108, 247, 0.15)',
  FIELD_BG: '#f7faff',
  FIELD_BORDER: '#b6c2d9',
  ACCENT_INPUT: '#4a6cf7',
  CANCEL_BG: '#ededed',
  CANCEL_COLOR: '#232323',
}; 