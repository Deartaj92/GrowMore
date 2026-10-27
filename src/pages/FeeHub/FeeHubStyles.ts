import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled, { css } from 'styled-components';
import { isDark } from '../../styles/DesignSystem';

// ==============================================================================
// 1. PAGE & LAYOUT CONTAINERS (Ultra-responsive, compact sizing)
// ==============================================================================

export const HubContainer = styled.div`
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 0.75rem 1rem 2rem 1rem;
  box-sizing: border-box;
  overflow-x: hidden;
  background: ${({ theme }) => (isDark(theme) ? (theme.BG || '#0f172a') : '#f8fafc')};
  min-height: calc(100vh - 65px);
  color: ${({ theme }) => (isDark(theme) ? '#f8fafc' : '#0f172a')};

  @media (max-width: 768px) {
    padding: 0.45rem 0.45rem 1.5rem 0.45rem;
  }
`;

export const HubHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => (isDark(theme) ? 'rgba(255,255,255,0.08)' : '#e2e8f0')};

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.65rem;

    .icon-badge {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
      flex-shrink: 0;
    }

    h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: ${({ theme }) => (isDark(theme) ? '#f8fafc' : '#0f172a')};
    }

    p {
      margin: 0.1rem 0 0 0;
      font-size: 0.75rem;
      color: ${({ theme }) => (isDark(theme) ? '#94a3b8' : '#64748b')};
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
`;

export const ShiftNoticeBanner = styled.div<{ $isOpen: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45rem 0.75rem;
  border-radius: 6px;
  margin-bottom: 0.85rem;
  font-size: 0.78rem;
  font-weight: 600;
  background: ${({ $isOpen, theme }) =>
    $isOpen
      ? isDark(theme)
        ? 'rgba(16, 185, 129, 0.15)'
        : 'rgba(16, 185, 129, 0.1)'
      : isDark(theme)
      ? 'rgba(239, 68, 68, 0.15)'
      : 'rgba(239, 68, 68, 0.1)'};
  border: 1px solid ${({ $isOpen }) => ($isOpen ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)')};
  color: ${({ $isOpen }) => ($isOpen ? '#10b981' : '#ef4444')};
  flex-wrap: wrap;
  gap: 0.5rem;

  .shift-info {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
`;

// ==============================================================================
// 2. METRICS & KPI GRIDS (Tight, small-sized cards)
// ==============================================================================

export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.65rem;
  margin-bottom: 0.85rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.45rem;
  }

  @media (max-width: 360px) {
    grid-template-columns: 1fr;
  }
`;

export const StatBox = styled.div<{ $accent: string }>`
  background: ${({ theme }) => (isDark(theme) ? '#1e293b' : '#ffffff')};
  border: 1px solid ${({ theme }) => (isDark(theme) ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0')};
  border-left: 3.5px solid ${({ $accent }) => $accent};
  border-radius: 8px;
  padding: 0.65rem 0.85rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  min-width: 0;
  box-sizing: border-box;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
  }

  .title {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${({ theme }) => (isDark(theme) ? '#94a3b8' : '#64748b')};
    margin-bottom: 0.2rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .value {
    font-size: 1.25rem;
    font-weight: 800;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    color: ${({ theme }) => (isDark(theme) ? '#f8fafc' : '#0f172a')};
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sub {
    font-size: 0.7rem;
    color: ${({ $accent }) => $accent};
    font-weight: 600;
    margin-top: 0.2rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 640px) {
    padding: 0.45rem 0.6rem;

    .title {
      font-size: 0.62rem;
    }
    .value {
      font-size: 1.05rem;
    }
    .sub {
      font-size: 0.62rem;
    }
  }
`;

// ==============================================================================
// 3. TAB NAVIGATION (Horizontal scroll with touch and mobile optimization)
// ==============================================================================

export const HubTabsNav = styled.div`
  display: flex;
  gap: 0.3rem;
  border-bottom: 2px solid ${({ theme }) => (isDark(theme) ? 'rgba(255,255,255,0.08)' : '#e2e8f0')};
  margin-bottom: 1rem;
  overflow-x: auto;
  padding-bottom: 0.2rem;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    height: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => (isDark(theme) ? '#475569' : '#cbd5e1')};
    border-radius: 3px;
  }
`;

export const HubTabBtn = styled.button<{ $active: boolean; $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: 6px 6px 0 0;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.12s ease;
  position: relative;
  background: ${({ $active, theme }) =>
    $active ? (isDark(theme) ? '#1e293b' : '#ffffff') : 'transparent'};
  color: ${({ $active, $color, theme }) =>
    $active ? ($color || '#2563eb') : isDark(theme) ? '#94a3b8' : '#64748b'};

  ${({ $active, $color }) =>
    $active &&
    css`
      &::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        right: 0;
        height: 2.5px;
        background: ${$color || '#2563eb'};
        border-radius: 2px 2px 0 0;
      }
    `}

  &:hover {
    color: ${({ $color }) => $color || '#2563eb'};
    background: ${({ $active, theme }) =>
      $active ? (isDark(theme) ? '#1e293b' : '#ffffff') : isDark(theme) ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
  }

  .count-pill {
    font-size: 0.65rem;
    padding: 0.05rem 0.35rem;
    border-radius: 999px;
    background: ${({ $active, $color }) => ($active ? ($color || '#2563eb') : '#94a3b8')};
    color: #ffffff;
    font-weight: 800;
  }
`;

// ==============================================================================
// 4. CARDS & FILTER BARS
// ==============================================================================

export const HubCard = styled.div`
  background: ${({ theme }) => (isDark(theme) ? '#1e293b' : '#ffffff')};
  border: 1px solid ${({ theme }) => (isDark(theme) ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0')};
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  margin-bottom: 0.85rem;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;

  @media (max-width: 768px) {
    padding: 0.65rem;
    border-radius: 6px;
  }
`;

export const HubFilterRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
  padding: 0.5rem 0.75rem;
  background: ${({ theme }) => (isDark(theme) ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc')};
  border: 1px solid ${({ theme }) => (isDark(theme) ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0')};
  border-radius: 6px;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;

  .filter-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;

    label {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      color: ${({ theme }) => (isDark(theme) ? '#94a3b8' : '#64748b')};
      white-space: nowrap;
    }
  }

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.45rem;
    padding: 0.5rem;

    & > div {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      flex: none !important;
    }

    .filter-item {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      flex: none !important;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0.2rem;

      label {
        font-size: 0.66rem;
      }

      select, input {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
      }
    }
  }
`;

// ==============================================================================
// 5. INPUTS, SELECTS, & CONTROLS (Small, crisp height ~32px)
// ==============================================================================

export const ModernInput = styled.input`
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 0.35rem 0.65rem;
  font-size: 0.8rem;
  height: 32px;
  border-radius: 6px;
  outline: none;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
  border: 1px solid ${({ theme }) => (isDark(theme) ? '#334155' : '#cbd5e1')};
  background: ${({ theme }) => (isDark(theme) ? '#0f172a' : '#ffffff')};
  color: ${({ theme }) => (isDark(theme) ? '#f8fafc' : '#0f172a')};

  &::placeholder {
    color: ${({ theme }) => (isDark(theme) ? '#64748b' : '#94a3b8')};
  }

  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
`;

export const ModernSelect = styled.select`
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 0.35rem 0.65rem;
  font-size: 0.8rem;
  height: 32px;
  border-radius: 6px;
  outline: none;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
  border: 1px solid ${({ theme }) => (isDark(theme) ? '#334155' : '#cbd5e1')};
  background: ${({ theme }) => (isDark(theme) ? '#0f172a' : '#ffffff')};
  color: ${({ theme }) => (isDark(theme) ? '#f8fafc' : '#0f172a')};
  color-scheme: ${({ theme }) => (isDark(theme) ? 'dark' : 'light')};

  option,
  optgroup {
    background: ${({ theme }) => (isDark(theme) ? '#1e293b' : '#ffffff')};
    color: ${({ theme }) => (isDark(theme) ? '#f8fafc' : '#0f172a')};
  }

  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
`;

export const ModernButton = styled.button<{
  $variant?: 'primary' | 'success' | 'danger' | 'warning' | 'secondary' | 'ghost';
  $size?: 'sm' | 'md' | 'lg';
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.12s ease;
  outline: none;

  ${({ $size }) => {
    switch ($size) {
      case 'sm':
        return css`
          padding: 0.2rem 0.5rem;
          font-size: 0.72rem;
          height: 26px;
        `;
      case 'lg':
        return css`
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          height: 38px;
        `;
      default:
        return css`
          padding: 0.35rem 0.7rem;
          font-size: 0.78rem;
          height: 32px;
        `;
    }
  }}

  ${({ $variant, theme }) => {
    switch ($variant) {
      case 'primary':
        return css`
          background: #2563eb;
          color: #ffffff;
          border: 1px solid #1d4ed8;
          &:hover:not(:disabled) {
            background: #1d4ed8;
          }
        `;
      case 'success':
        return css`
          background: #059669;
          color: #ffffff;
          border: 1px solid #047857;
          &:hover:not(:disabled) {
            background: #047857;
          }
        `;
      case 'danger':
        return css`
          background: #dc2626;
          color: #ffffff;
          border: 1px solid #b91c1c;
          &:hover:not(:disabled) {
            background: #b91c1c;
          }
        `;
      case 'warning':
        return css`
          background: #d97706;
          color: #ffffff;
          border: 1px solid #b45309;
          &:hover:not(:disabled) {
            background: #b45309;
          }
        `;
      case 'ghost':
        return css`
          background: transparent;
          color: ${isDark(theme) ? '#cbd5e1' : '#334155'};
          border: 1px solid transparent;
          &:hover:not(:disabled) {
            background: ${isDark(theme) ? 'rgba(255,255,255,0.06)' : 'rgba(0, 0, 0, 0.05)'};
          }
        `;
      default:
        return css`
          background: ${isDark(theme) ? '#334155' : '#f1f5f9'};
          color: ${isDark(theme) ? '#f8fafc' : '#334155'};
          border: 1px solid ${isDark(theme) ? '#475569' : '#cbd5e1'};
          &:hover:not(:disabled) {
            opacity: 0.9;
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// ==============================================================================
// 6. TABLES (Responsive scroll container, compact high-density rows)
// ==============================================================================

export const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => (isDark(theme) ? 'rgba(255,255,255,0.08)' : '#e2e8f0')};
  margin-top: 0.5rem;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => (isDark(theme) ? '#475569' : '#cbd5e1')};
    border-radius: 4px;
  }
`;

export const ModernTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;

  thead {
    background: ${({ theme }) => (isDark(theme) ? '#0f172a' : '#f8fafc')};
    border-bottom: 2px solid ${({ theme }) => (isDark(theme) ? 'rgba(255,255,255,0.08)' : '#cbd5e1')};
  }

  th {
    padding: 0.5rem 0.65rem;
    text-align: left;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${({ theme }) => (isDark(theme) ? '#94a3b8' : '#64748b')};
    white-space: nowrap;
  }

  tbody tr {
    border-bottom: 1px solid ${({ theme }) => (isDark(theme) ? 'rgba(255,255,255,0.05)' : '#f1f5f9')};
    transition: background 0.12s ease;

    &:hover {
      background: ${({ theme }) => (isDark(theme) ? 'rgba(255,255,255,0.03)' : 'rgba(59, 130, 246, 0.03)')};
    }
  }

  td {
    padding: 0.45rem 0.65rem;
    color: ${({ theme }) => (isDark(theme) ? '#f8fafc' : '#0f172a')};
    vertical-align: middle;
  }
`;

// ==============================================================================
// 7. BADGES & PILLS
// ==============================================================================

export const ModernBadge = styled.span<{
  $variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';
}>`
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;

  ${({ $variant, theme }) => {
    switch ($variant) {
      case 'success':
        return css`
          background: ${isDark(theme) ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)'};
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.35);
        `;
      case 'warning':
        return css`
          background: ${isDark(theme) ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.12)'};
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.35);
        `;
      case 'danger':
        return css`
          background: ${isDark(theme) ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.12)'};
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.35);
        `;
      case 'info':
        return css`
          background: ${isDark(theme) ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.12)'};
          color: #3b82f6;
          border: 1px solid rgba(37, 99, 235, 0.35);
        `;
      case 'purple':
        return css`
          background: ${isDark(theme) ? 'rgba(147, 51, 234, 0.2)' : 'rgba(147, 51, 234, 0.12)'};
          color: #a855f7;
          border: 1px solid rgba(147, 51, 234, 0.35);
        `;
      default:
        return css`
          background: ${isDark(theme) ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.12)'};
          color: ${isDark(theme) ? '#cbd5e1' : '#475569'};
          border: 1px solid rgba(100, 116, 139, 0.35);
        `;
    }
  }}
`;

// ==============================================================================
// 8. THEME-ADAPTIVE SEARCH DROPDOWNS
// ==============================================================================

export const SearchDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 60;
  background: ${({ theme }) => (isDark(theme) ? '#1e293b' : '#ffffff')};
  border: 1px solid ${({ theme }) => (isDark(theme) ? '#334155' : '#cbd5e1')};
  border-radius: 6px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
  margin-top: 3px;
  max-height: 240px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => (isDark(theme) ? '#475569' : '#cbd5e1')};
  }
`;

export const SearchDropdownItem = styled.div`
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid ${({ theme }) => (isDark(theme) ? 'rgba(255,255,255,0.06)' : '#f1f5f9')};
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.12s ease;
  color: ${({ theme }) => (isDark(theme) ? '#f8fafc' : '#0f172a')};

  &:hover {
    background: ${({ theme }) => (isDark(theme) ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.06)')};
  }

  .primary-text {
    font-weight: 700;
    font-size: 0.82rem;
  }

  .sub-text {
    font-size: 0.7rem;
    color: ${({ theme }) => (isDark(theme) ? '#94a3b8' : '#64748b')};
    margin-top: 2px;
  }
`;

// ==============================================================================
// 9. MODALS & DIALOGS (Global App-Wide Portal & Full-Screen Backdrop)
// ==============================================================================

const BackdropOverlay = styled.div`
  position: fixed;
  inset: 0;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999999;
  padding: 1.25rem;
  box-sizing: border-box;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
`;

export interface ModalBackdropProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const ModalBackdrop: React.FC<ModalBackdropProps> = ({ children, ...props }) => {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    React.createElement(BackdropOverlay, props, children),
    document.body
  );
};

export const ModalDialog = styled.div<{ $width?: string }>`
  background: ${({ theme }) => (isDark(theme) ? '#1e293b' : '#ffffff')};
  border: 1px solid ${({ theme }) => (isDark(theme) ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0')};
  border-radius: 12px;
  width: 100%;
  max-width: ${({ $width }) => $width || '540px'};
  max-height: 90vh;
  margin: auto;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(0, 0, 0, 0.1);
  padding: 1.25rem;
  box-sizing: border-box;
  color: ${({ theme }) => (isDark(theme) ? '#f8fafc' : '#0f172a')};
  position: relative;
  z-index: 1000000;

  @media (max-width: 640px) {
    padding: 0.85rem;
    max-height: 94vh;
  }

  .modal-title {
    margin: 0 0 0.3rem 0;
    font-size: 1.1rem;
    font-weight: 800;
  }

  .modal-subtitle {
    margin: 0 0 1rem 0;
    font-size: 0.75rem;
    color: ${({ theme }) => (isDark(theme) ? '#94a3b8' : '#64748b')};
  }
`;

// ==============================================================================
// 10. RESPONSIVE GRID HELPERS
// ==============================================================================

export const POSGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 1rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const SplitGrid = styled.div`
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: 1rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

// ==============================================================================
// 11. FORMATTERS
// ==============================================================================

export function formatFeeCurrency(val: number | string | null | undefined): string {
  const num = Number(val || 0);
  return `Rs ${num.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

export function formatFeeDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  try {
    if (typeof dateInput === 'string') {
      const cleanStr = dateInput.split('T')[0];
      const parts = cleanStr.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
      }
    }
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(dateInput);
  }
}
