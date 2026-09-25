import styled from 'styled-components';
import { isDark } from '../../styles/DesignSystem';

export const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: ${({ theme }) => theme.CARD || '#ffffff'};
  border: 1px solid ${({ theme }) => theme.BORDER || '#e2e8f0'};
  border-radius: 6px;
  margin-bottom: 0.75rem;

  .filter-field {
    display: flex;
    align-items: center;
    gap: 0.35rem;

    label {
      font-size: 0.72rem;
      font-weight: 700;
      color: ${({ theme }) => theme.TEXT_SECONDARY || '#64748b'};
      text-transform: uppercase;
      white-space: nowrap;
    }

    select,
    input {
      padding: 0.32rem 0.55rem;
      font-size: 0.8rem;
      border-radius: 4px;
      border: 1px solid ${({ theme }) => theme.FIELD_BORDER || (isDark(theme) ? '#3a3f4b' : '#cbd5e1')};
      background: ${({ theme }) => theme.FIELD_BG || (isDark(theme) ? '#1e293b' : '#ffffff')};
      color: ${({ theme }) => theme.TEXT_PRIMARY || (isDark(theme) ? '#f8fafc' : '#0f172a')};
      color-scheme: ${({ theme }) => (isDark(theme) ? 'dark' : 'light')};
      outline: none;

      option,
      optgroup {
        background-color: ${({ theme }) => (isDark(theme) ? '#1e293b' : '#ffffff')} !important;
        color: ${({ theme }) => (isDark(theme) ? '#f8fafc' : '#0f172a')} !important;
      }

      &:focus {
        border-color: #3b82f6;
      }
    }
  }
`;

export const DenseSelect = styled.select`
  width: 100%;
  padding: 0.4rem 0.6rem;
  font-size: 0.82rem;
  border-radius: 4px;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s ease;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER || (isDark(theme) ? '#3a3f4b' : '#cbd5e1')};
  background: ${({ theme }) => theme.FIELD_BG || (isDark(theme) ? '#1e293b' : '#ffffff')};
  color: ${({ theme }) => theme.TEXT_PRIMARY || (isDark(theme) ? '#f8fafc' : '#0f172a')};
  color-scheme: ${({ theme }) => (isDark(theme) ? 'dark' : 'light')};

  option,
  optgroup {
    background-color: ${({ theme }) => (isDark(theme) ? '#1e293b' : '#ffffff')} !important;
    color: ${({ theme }) => (isDark(theme) ? '#f8fafc' : '#0f172a')} !important;
  }

  &:focus {
    border-color: #3b82f6;
  }
`;

export const DenseInput = styled.input`
  width: 100%;
  padding: 0.4rem 0.6rem;
  font-size: 0.82rem;
  border-radius: 4px;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s ease;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER || (isDark(theme) ? '#3a3f4b' : '#cbd5e1')};
  background: ${({ theme }) => theme.FIELD_BG || (isDark(theme) ? '#1e293b' : '#ffffff')};
  color: ${({ theme }) => theme.TEXT_PRIMARY || (isDark(theme) ? '#f8fafc' : '#0f172a')};

  &::placeholder {
    color: ${({ theme }) => (isDark(theme) ? '#718096' : '#94a3b8')};
  }

  &:focus {
    border-color: #3b82f6;
  }
`;

export const DenseTextarea = styled.textarea`
  width: 100%;
  padding: 0.4rem 0.6rem;
  font-size: 0.82rem;
  border-radius: 4px;
  box-sizing: border-box;
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s ease;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER || (isDark(theme) ? '#3a3f4b' : '#cbd5e1')};
  background: ${({ theme }) => theme.FIELD_BG || (isDark(theme) ? '#1e293b' : '#ffffff')};
  color: ${({ theme }) => theme.TEXT_PRIMARY || (isDark(theme) ? '#f8fafc' : '#0f172a')};

  &::placeholder {
    color: ${({ theme }) => (isDark(theme) ? '#718096' : '#94a3b8')};
  }

  &:focus {
    border-color: #3b82f6;
  }
`;

export const DenseContainer = styled.div`
  width: 100%;
  max-width: 1750px;
  margin: 0 auto;
  padding: 0.75rem 1rem;
  box-sizing: border-box;
  color: ${({ theme }) => theme.TEXT_PRIMARY || '#1e293b'};
`;

export const DenseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.6rem;

  .title-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    h1 {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      color: ${({ theme }) => theme.TEXT_PRIMARY || '#0f172a'};
    }

    .subtitle {
      font-size: 0.78rem;
      color: ${({ theme }) => theme.TEXT_SECONDARY || '#64748b'};
      margin-left: 0.25rem;
      border-left: 1px solid ${({ theme }) => theme.BORDER || '#cbd5e1'};
      padding-left: 0.6rem;
    }
  }

  .actions-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

export const StatsStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.6rem;
  margin-bottom: 0.75rem;
`;

export const StatCard = styled.div<{ $accentColor?: string }>`
  background: ${({ theme }) => theme.CARD || '#ffffff'};
  border: 1px solid ${({ theme }) => theme.BORDER || '#e2e8f0'};
  border-left: 3px solid ${({ $accentColor }) => $accentColor || '#3b82f6'};
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  display: flex;
  flex-direction: column;
  justify-content: center;

  .stat-label {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${({ theme }) => theme.TEXT_SECONDARY || '#64748b'};
  }

  .stat-val-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-top: 0.15rem;

    .stat-val {
      font-size: 1.15rem;
      font-weight: 800;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: ${({ theme }) => theme.TEXT_PRIMARY || '#0f172a'};
    }

    .stat-sub {
      font-size: 0.72rem;
      font-weight: 600;
      color: ${({ $accentColor }) => $accentColor || '#3b82f6'};
    }
  }
`;

export const DenseCard = styled.div`
  background: ${({ theme }) => theme.CARD || '#ffffff'};
  border: 1px solid ${({ theme }) => theme.BORDER || '#e2e8f0'};
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
`;


export const CompactTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;

  thead {
    position: sticky;
    top: 0;
    z-index: 5;
    background: ${({ theme }) => (theme.BG === '#252525' ? '#222222' : '#f1f5f9')};
  }

  th {
    padding: 0.45rem 0.65rem;
    text-align: left;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: ${({ theme }) => theme.TEXT_SECONDARY || '#475569'};
    border-bottom: 1px solid ${({ theme }) => theme.BORDER || '#cbd5e1'};
    white-space: nowrap;
  }

  tbody tr {
    border-bottom: 1px solid ${({ theme }) => theme.BORDER || '#f1f5f9'};
    transition: background 0.15s ease;

    &:hover {
      background: ${({ theme }) => (theme.BG === '#252525' ? '#333333' : '#f8fafc')};
    }
  }

  td {
    padding: 0.4rem 0.65rem;
    color: ${({ theme }) => theme.TEXT_PRIMARY || '#334155'};
    vertical-align: middle;
  }

  .num {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-weight: 600;
  }
`;

export const DenseBadge = styled.span<{ $variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  white-space: nowrap;

  background: ${({ $variant }) => {
    switch ($variant) {
      case 'success':
        return 'rgba(16, 185, 129, 0.12)';
      case 'warning':
        return 'rgba(245, 158, 11, 0.12)';
      case 'danger':
        return 'rgba(239, 68, 68, 0.12)';
      case 'info':
        return 'rgba(59, 130, 246, 0.12)';
      default:
        return 'rgba(100, 116, 139, 0.1)';
    }
  }};

  color: ${({ $variant }) => {
    switch ($variant) {
      case 'success':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'danger':
        return '#ef4444';
      case 'info':
        return '#3b82f6';
      default:
        return '#64748b';
    }
  }};

  border: 1px solid ${({ $variant }) => {
    switch ($variant) {
      case 'success':
        return 'rgba(16, 185, 129, 0.25)';
      case 'warning':
        return 'rgba(245, 158, 11, 0.25)';
      case 'danger':
        return 'rgba(239, 68, 68, 0.25)';
      case 'info':
        return 'rgba(59, 130, 246, 0.25)';
      default:
        return 'rgba(100, 116, 139, 0.2)';
    }
  }};
`;

export const MiniProgressBar = styled.div<{ $percent: number }>`
  width: 100%;
  max-width: 90px;
  height: 5px;
  background: ${({ theme }) => (theme.BG === '#252525' ? '#444' : '#e2e8f0')};
  border-radius: 999px;
  overflow: hidden;
  display: inline-block;
  vertical-align: middle;
  margin-right: 0.35rem;

  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${({ $percent }) => Math.min(100, Math.max(0, $percent))}%;
    background: ${({ $percent }) =>
      $percent >= 100 ? '#10b981' : $percent > 50 ? '#3b82f6' : '#f59e0b'};
    border-radius: 999px;
  }
`;

export const CompactButton = styled.button<{ $variant?: 'primary' | 'success' | 'danger' | 'secondary' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.75rem;
  border-radius: 5px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s, background 0.15s;
  white-space: nowrap;

  background: ${({ $variant, theme }) => {
    switch ($variant) {
      case 'primary':
        return '#2563eb';
      case 'success':
        return '#059669';
      case 'danger':
        return '#dc2626';
      default:
        return theme.BUTTON_SECONDARY_BG || '#e2e8f0';
    }
  }};

  color: ${({ $variant, theme }) => {
    switch ($variant) {
      case 'primary':
      case 'success':
      case 'danger':
        return '#ffffff';
      default:
        return theme.TEXT_PRIMARY || '#334155';
    }
  }};

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  backdrop-filter: blur(2px);
`;

export const ModalCard = styled(DenseCard)<{ $maxWidth?: string }>`
  max-width: ${({ $maxWidth }) => $maxWidth || '440px'};
  width: 100%;
  padding: 1.25rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
  background: ${({ theme }) => theme.CARD || (theme.BG === '#252525' ? '#2a2a2a' : '#ffffff')};
  border: 1px solid ${({ theme }) => theme.BORDER || (theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0')};
`;

export const SectionDivider = styled.div`
  border-bottom: 1px solid ${({ theme }) => (theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)')};
  margin: 0.6rem 0;
`;

export const FieldLabel = styled.label`
  font-size: 0.72rem;
  font-weight: 700;
  display: block;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.TEXT_SECONDARY || (theme.BG === '#252525' ? '#b0b8d1' : '#64748b')};
`;

export const FieldGroup = styled.div`
  margin-bottom: 0.65rem;
`;

export const SuggestionsDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: ${({ theme }) => theme.CARD || (isDark(theme) ? '#1e293b' : '#ffffff')};
  border: 1px solid ${({ theme }) => theme.BORDER || (isDark(theme) ? '#334155' : '#cbd5e1')};
  border-radius: 6px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.25);
  max-height: 300px;
  overflow-y: auto;
  z-index: 999;
  padding: 0.25rem 0;
`;

export const SuggestionItem = styled.div<{ $selected?: boolean }>`
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  background: ${({ $selected, theme }) =>
    $selected
      ? isDark(theme)
        ? 'rgba(59, 130, 246, 0.25)'
        : 'rgba(59, 130, 246, 0.12)'
      : 'transparent'};
  border-bottom: 1px solid ${({ theme }) => (isDark(theme) ? '#2d3748' : '#f1f5f9')};
  color: ${({ theme }) => theme.TEXT_PRIMARY || (isDark(theme) ? '#f8fafc' : '#0f172a')};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) => (isDark(theme) ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.08)')};
  }

  .name {
    font-weight: 700;
  }

  .meta {
    font-size: 0.72rem;
    color: ${({ theme }) => theme.TEXT_SECONDARY || (isDark(theme) ? '#94a3b8' : '#64748b')};
  }

  .challan {
    font-size: 0.7rem;
    font-family: monospace;
    opacity: 0.85;
  }

  .amount {
    font-weight: 800;
    text-align: right;
  }
`;

/**
 * Formats any date string (YYYY-MM-DD, ISO string, or Date) to DD-MM-YYYY format
 */
export function formatFeeDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  try {
    // Check YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss directly
    if (typeof dateInput === 'string') {
      const cleanStr = dateInput.split('T')[0];
      const parts = cleanStr.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        // parts = [YYYY, MM, DD]
        return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
      }
    }
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return String(dateInput);
  }
}

