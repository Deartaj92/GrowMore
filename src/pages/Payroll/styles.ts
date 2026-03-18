import styled from 'styled-components';
import { isDark } from '../../styles/DesignSystem';

// ==========================================
// LAYOUT COMPONENTS
// ==========================================
export const PayrollContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: ${({ theme }) => theme.BG};
  padding: 0.5rem;
  padding-bottom: 0.25rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  position: relative;
  
  @media (max-width: 768px) {
    padding: 0.375rem;
    padding-bottom: 0.2rem;
    gap: 0.2rem;
  }
`;

export const TabContainer = styled.div`
  position: sticky;
  top: -0.5rem;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  background: ${({ theme }) => theme.BG};
  border-bottom: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a')
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(0, 0, 0, 0.1)'};
  padding: 0.4rem 0;
  margin-top: -0.5rem;
  margin-bottom: 0.25rem;
  margin-left: -0.5rem;
  margin-right: -0.5rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    padding: 0.5rem;
    top: -0.375rem;
    margin-top: -0.375rem;
    margin-bottom: 0.2rem;
    margin-left: -0.375rem;
    margin-right: -0.375rem;
    padding-left: 0.375rem;
    padding-right: 0.375rem;
  }
`;

export const TabsWrapper = styled.div`
  display: flex;
  gap: 0.25rem;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a')
    ? 'rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05)'};
  
  &::-webkit-scrollbar {
    height: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a')
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(0, 0, 0, 0.05)'};
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a')
      ? 'rgba(255, 255, 255, 0.2)'
      : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 2px;
    
    &:hover {
      background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a')
        ? 'rgba(255, 255, 255, 0.3)'
        : 'rgba(0, 0, 0, 0.3)'};
    }
  }
  
  @media (max-width: 768px) {
    width: 100%;
    gap: 0.5rem;
    padding-bottom: 0.25rem;
  }
`;

export const TabButton = styled.button<{ active: boolean }>`
  padding: 0.65rem 1.35rem;
  border: none;
  border-bottom: ${({ active, theme }) =>
    active
      ? `4px solid ${theme.ACCENT || '#6366f1'}`
      : '4px solid transparent'};
  background: ${({ active, theme }) => active 
    ? (isDark(theme) ? 'rgba(99, 102, 241, 0.08)' : 'rgba(79, 70, 229, 0.05)') 
    : 'transparent'};
  color: ${({ active, theme }) =>
    active
      ? (theme.ACCENT || '#6366f1')
      : theme.TEXT_SECONDARY};
  font-size: 0.95rem;
  font-weight: ${({ active }) => active ? 700 : 600};
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  position: relative;
  margin-bottom: -1px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  
  &:hover {
    color: ${({ theme }) => theme.ACCENT || '#6366f1'};
    background: ${({ active, theme }) => active 
      ? (isDark(theme) ? 'rgba(99, 102, 241, 0.12)' : 'rgba(79, 70, 229, 0.08)')
      : (isDark(theme) ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)')};
  }
  
  &:active {
    transform: scale(0.97);
  }
  
  @media (max-width: 768px) {
    padding: 0.75rem 1.1rem;
    font-size: 0.875rem;
    border-bottom: ${({ active, theme }) =>
      active
        ? `4.5px solid ${theme.ACCENT || '#6366f1'}`
        : '4.5px solid transparent'};
  }
  
  @media (max-width: 480px) {
    padding: 0.6rem 1rem;
    font-size: 0.825rem;
  }
  
  svg {
    font-size: 1.25rem;
    
    @media (max-width: 768px) {
      font-size: 1.1rem;
    }
  }
`;

// ==========================================
// CARD COMPONENTS
// ==========================================
export const StatCard = styled.div<{ accentColor?: string }>`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : theme.CARD)};
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.BG === '#252525'
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  padding: 1rem;
  border: ${({ theme }) => theme.BG === '#252525'
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  ${({ accentColor }) => accentColor ? `border-left: 4px solid ${accentColor};` : ''}
  transition: all 0.2s ease;
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    border-radius: 10px;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.BG === '#252525'
      ? '0 8px 40px rgba(0, 0, 0, 0.4)'
      : '0 8px 40px rgba(0, 0, 0, 0.15)'};
  }
`;

export const StatCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  
  @media (max-width: 768px) {
    margin-bottom: 0.5rem;
  }
`;

export const StatCardIcon = styled.div<{ color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${({ color }) => color}20;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ color }) => color};
  
  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    
    svg {
      font-size: 1.1rem !important;
    }
  }
`;

export const StatCardTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

export const StatCardValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 0.25rem;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
    margin-bottom: 0.2rem;
  }
`;

export const StatCardSubtext = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  @media (max-width: 768px) {
    font-size: 0.75rem;
  }
`;

export const ContentCard = styled.div`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : theme.CARD)};
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.BG === '#252525'
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  padding: 1.5rem;
  border: ${({ theme }) => theme.BG === '#252525'
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  margin-bottom: 0.5rem;
  
  @media (max-width: 768px) {
    padding: 1rem;
    border-radius: 10px;
    margin-bottom: 0.375rem;
  }
`;

export const ContentCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    margin-bottom: 0.75rem;
    gap: 0.5rem;
  }
`;

export const ContentCardTitle = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 0.625rem;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.375rem;
    margin-bottom: 0.375rem;
  }
`;

export const TwoColumnGrid = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: ${({ $columns }) => ($columns === 2 ? '1fr 1fr' : '1fr')};
  gap: 0.5rem;
  align-items: flex-start;
  width: 100%;
  margin-bottom: 0.5rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
  
  @media (max-width: 768px) {
    gap: 0.375rem;
    margin-bottom: 0.375rem;
  }
`;

// ==========================================
// TABLE COMPONENTS
// ==========================================
export const TableWrapper = styled.div`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : theme.CARD)};
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.BG === '#252525'
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  border: ${({ theme }) => theme.BG === '#252525'
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  overflow: hidden;
  margin-bottom: 0.5rem;
  
  @media (max-width: 768px) {
    border-radius: 10px;
    margin-bottom: 0.375rem;
  }
`;

export const TableHeader = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f9fafb'};
  
  @media (max-width: 768px) {
    padding: 0.875rem 1rem;
  }
`;

export const TableTitle = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  thead {
    background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#f9fafb'};
  }
  
  th {
    text-align: left;
    padding: 0.75rem 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: ${({ theme }) => theme.BG === '#252525' ? '#9ca3af' : '#6b7280'};
    border-bottom: 1px solid ${({ theme }) => theme.BG === '#252525' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
    
    @media (max-width: 768px) {
      padding: 0.625rem 0.75rem;
      font-size: 0.7rem;
    }
  }
  
  tbody tr {
    border-bottom: 1px solid ${({ theme }) => theme.BG === '#252525' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
    transition: background 0.18s;
    
    &:hover {
      background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#f3f4f8'};
    }
    
    &:last-child {
      border-bottom: none;
    }
  }
  
  td {
    padding: 0.875rem 1rem;
    font-size: 0.875rem;
    color: ${({ theme }) => theme.BG === '#252525' ? '#fff' : '#232a3b'};
    
    @media (max-width: 768px) {
      padding: 0.75rem 0.75rem;
      font-size: 0.8rem;
    }
  }
`;

// ==========================================
// BUTTON COMPONENTS
// ==========================================
export const PrimaryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 8px;
  background: ${({ theme }) => theme.ACCENT || '#6366f1'};
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.ACCENT ? `${theme.ACCENT}dd` : '#5855eb'};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
  }
`;

export const SecondaryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#fff'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT};
    background: ${({ theme }) => theme.BG === '#252525' ? '#3d4557' : '#f9fafb'};
  }
  
  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
  }
`;

export const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#f3f4f6'};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
  
  @media (max-width: 768px) {
    width: 28px;
    height: 28px;
  }
`;

// ==========================================
// FORM COMPONENTS
// ==========================================
export const FormControl = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    gap: 0.375rem;
    margin-bottom: 0.75rem;
  }
`;

export const FormLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

export const FormInput = styled.input`
  padding: 0.625rem 0.75rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#fff'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.875rem;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT};
  }
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 3px ${({ theme }) => (theme.ACCENT || '#6366f1')}33;
  }
  
  @media (max-width: 768px) {
    padding: 0.5rem 0.625rem;
    font-size: 0.8rem;
  }
`;

export const FormSelect = styled.select`
  padding: 0.625rem 0.75rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#fff'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT};
  }
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 3px ${({ theme }) => (theme.ACCENT || '#6366f1')}33;
  }
  
  @media (max-width: 768px) {
    padding: 0.5rem 0.625rem;
    font-size: 0.8rem;
  }
`;

// ==========================================
// BADGE/CHIP COMPONENTS
// ==========================================
export const StatusBadge = styled.span<{ status?: string; color?: string; bgColor?: string }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ status, bgColor }) => {
    if (bgColor) return bgColor;
    if (status === 'paid' || status === 'completed') return '#22c55e20';
    if (status === 'pending' || status === 'approved') return '#f59e0b20';
    if (status === 'draft') return '#6b728020';
    if (status === 'rejected') return '#ef444420';
    return '#6b728020';
  }};
  color: ${({ status, color }) => {
    if (color) return color;
    if (status === 'paid' || status === 'completed') return '#22c55e';
    if (status === 'pending' || status === 'approved') return '#f59e0b';
    if (status === 'draft') return '#6b7280';
    if (status === 'rejected') return '#ef4444';
    return '#6b7280';
  }};
  
  @media (max-width: 768px) {
    padding: 0.2rem 0.625rem;
    font-size: 0.7rem;
  }
`;

// ==========================================
// EMPTY STATE COMPONENTS
// ==========================================
export const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  @media (max-width: 768px) {
    padding: 2rem 1rem;
  }
`;

export const EmptyStateIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    font-size: 4rem;
  }
  
  @media (max-width: 768px) {
    font-size: 3rem;
    margin-bottom: 0.75rem;
    
    svg {
      font-size: 3rem;
    }
  }
`;

export const EmptyStateTitle = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
    margin-bottom: 0.375rem;
  }
`;

export const EmptyStateText = styled.div`
  font-size: 0.9rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  max-width: 400px;
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

