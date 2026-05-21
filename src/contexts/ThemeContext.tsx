import React, { createContext } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => { },
});

export const darkTheme = {
  BG: '#252525',
  SIDEBAR_BG: '#2a2a2a',
  CARD: '#2a2a2a',
  ACCENT: '#3b82f6',
  ACCENT_DARK: '#2563eb',
  ACCENT_DANGER: '#ef4444',
  ACCENT_DANGER_DARK: '#c53030',
  BUTTON_SECONDARY_BG: '#2c2c2c',
  BUTTON_SECONDARY_BORDER: '#4a4a4a',
  BUTTON_SECONDARY_HOVER_BG: 'rgba(59, 130, 246, 0.22)',
  BUTTON_SECONDARY_HOVER_BORDER: '#3b82f6',
  SHADOW: '0 1.8px 7.2px 0 #0003',
  TEXT_PRIMARY: '#e0e0e0',
  TEXT_SECONDARY: '#b0b8d1',
  BORDER: 'rgba(255, 255, 255, 0.05)',
  ICON_BG: 'rgba(59, 130, 246, 0.15)',
  HOVER_BG: 'rgba(59, 130, 246, 0.18)',
  FIELD_BG: '#252525',
  FIELD_BORDER: '#3a3f4b',
  ACCENT_INPUT: '#3b82f6',
  CANCEL_BG: '#252525',
  CANCEL_COLOR: '#e0e0e0',
};

export const lightTheme = {
  BG: '#ebf4fc',
  SIDEBAR_BG: '#ffffff',
  CARD: '#ffffff',
  ACCENT: '#3b82f6',
  ACCENT_DARK: '#1d4ed8',
  ACCENT_DANGER: '#dc2626',
  ACCENT_DANGER_DARK: '#b91c1c',
  BUTTON_SECONDARY_BG: '#f1f5f9',
  BUTTON_SECONDARY_BORDER: '#cbd5e1',
  BUTTON_SECONDARY_HOVER_BG: 'rgba(79, 70, 229, 0.18)',
  BUTTON_SECONDARY_HOVER_BORDER: '#4f46e5',
  SHADOW: '0 1.8px 7.2px 0 #0003',
  TEXT_PRIMARY: '#1a1a1a',
  TEXT_SECONDARY: '#666666',
  BORDER: 'rgba(0, 0, 0, 0.05)',
  ICON_BG: 'rgba(59, 130, 246, 0.1)',
  HOVER_BG: 'rgba(59, 130, 246, 0.15)',
  FIELD_BG: '#f7faff',
  FIELD_BORDER: '#cce0f5',
  ACCENT_INPUT: '#3b82f6',
  CANCEL_BG: '#ededed',
  CANCEL_COLOR: '#232323',
}; 