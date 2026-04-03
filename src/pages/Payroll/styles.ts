import styled, { css } from 'styled-components';
import {
  isDark,
  clayCardStyle,
  clayPanelStyle,
  clayButtonStyle,
  neumorphFieldStyle,
  neumorphSelectFieldStyle,
  minimalSelectMenuStyle,
  getLayoutPalette,
  CARD_RADIUS_LG,
  CARD_RADIUS_MD,
} from '../../styles/DesignSystem';

// ==========================================
// LAYOUT COMPONENTS
// ==========================================
export const PayrollContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: ${({ theme }) => theme.BG};
  padding: 0 12px 6px 12px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  position: relative;
  
  @media (max-width: 768px) {
    padding: 0 8px 8px 8px;
    gap: 0.4rem;
  }
`;

export const TabContainer = styled.div`
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  ${clayPanelStyle}
  border-radius: ${CARD_RADIUS_LG};
  padding: 0.5rem 0.625rem;
  margin: 6px 0 2px 0;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    padding: 0.5rem;
    margin: 4px 0 4px 0;
    border-radius: ${CARD_RADIUS_MD};
  }
`;

export const TabsWrapper = styled.div`
  display: flex;
  gap: 0.4rem;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => `${getLayoutPalette(theme).dropdownThumb} transparent`};
  
  &::-webkit-scrollbar {
    height: 5px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => getLayoutPalette(theme).dropdownThumb};
    border-radius: 2px;
    
    &:hover {
      background: ${({ theme }) => getLayoutPalette(theme).dropdownThumbHover};
    }
  }
  
  @media (max-width: 768px) {
    width: 100%;
    gap: 0.35rem;
    padding-bottom: 0.25rem;
  }
`;

export const TabButton = styled.button<{ active: boolean }>`
  ${clayButtonStyle}
  padding: 0.6rem 1rem;
  border: 1.5px solid ${({ active, theme }) =>
    active ? `${theme.ACCENT || '#6366f1'}55` : getLayoutPalette(theme).surfaceBorder};
  background: ${({ active, theme }) =>
    active
      ? `${theme.ACCENT || '#6366f1'}`
      : getLayoutPalette(theme).surfaceBg};
  color: ${({ active, theme }) => (active ? '#fff' : theme.TEXT_PRIMARY)};
  font-size: 0.85rem;
  font-weight: ${({ active }) => (active ? 700 : 600)};
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 999px;
  min-height: 38px;
  
  &:hover {
    color: ${({ active, theme }) => (active ? '#fff' : theme.ACCENT || '#6366f1')};
    border-color: ${({ theme }) => `${theme.ACCENT || '#6366f1'}66`};
    transform: none;
  }
  
  &:active {
    transform: none;
  }
  
  @media (max-width: 768px) {
    padding: 0.68rem 0.95rem;
    font-size: 0.8rem;
    min-height: 36px;
  }
  
  @media (max-width: 480px) {
    padding: 0.58rem 0.9rem;
    font-size: 0.78rem;
  }
  
  svg {
    font-size: 1.05rem;
    
    @media (max-width: 768px) {
      font-size: 1rem;
    }
  }
`;

// ==========================================
// CARD COMPONENTS
// ==========================================
export const StatCard = styled.div<{ accentColor?: string }>`
  ${clayCardStyle}
  padding: 1rem;
  ${({ accentColor }) => accentColor ? `border-left: 4px solid ${accentColor};` : ''}
  transition: all 0.2s ease;
  
  @media (max-width: 768px) {
    padding: 0.75rem;
  }
  
  &:hover {
    transform: translateY(-2px);
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
  ${clayCardStyle}
  padding: 1.5rem;
  margin-bottom: 0.5rem;
  
  @media (max-width: 768px) {
    padding: 1rem;
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
  ${clayCardStyle}
  overflow: hidden;
  margin-bottom: 0.5rem;
  
  @media (max-width: 768px) {
    margin-bottom: 0.375rem;
  }
`;

export const TableHeader = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  
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
    background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  }
  
  th {
    text-align: left;
    padding: 0.75rem 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
    border-bottom: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
    
    @media (max-width: 768px) {
      padding: 0.625rem 0.75rem;
      font-size: 0.7rem;
    }
  }
  
  tbody tr {
    border-bottom: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
    transition: background 0.18s;
    
    &:hover {
      background: ${({ theme }) => getLayoutPalette(theme).surfaceHoverBg};
    }
    
    &:last-child {
      border-bottom: none;
    }
  }
  
  td {
    padding: 0.875rem 1rem;
    font-size: 0.84rem;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
    
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
  ${clayButtonStyle}
  border: none;
  
  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
  }
`;

export const SecondaryButton = styled.button`
  ${clayButtonStyle}
  
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
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).surfaceBorder};
  border-radius: 999px;
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};
  
  &:hover {
    background: ${({ theme }) => getLayoutPalette(theme).surfaceHoverBg};
    border-color: ${({ theme }) => `${theme.ACCENT}55`};
    color: ${({ theme }) => theme.ACCENT};
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
  ${neumorphFieldStyle}
`;

export const FormSelect = styled.select`
  ${neumorphSelectFieldStyle}
`;

// ==========================================
// BADGE/CHIP COMPONENTS
// ==========================================
export const StatusBadge = styled.span<{ status?: string; color?: string; bgColor?: string }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
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
  border: 1px solid ${({ status, color }) => {
    const resolved = color || (
      status === 'paid' || status === 'completed' ? '#22c55e'
        : status === 'pending' || status === 'approved' ? '#f59e0b'
          : status === 'draft' ? '#6b7280'
            : status === 'rejected' ? '#ef4444'
              : '#6b7280'
    );
    return `${resolved}33`;
  }};
  
  @media (max-width: 768px) {
    padding: 0.2rem 0.625rem;
    font-size: 0.7rem;
  }
`;

export const ToolbarCard = styled(ContentCard)`
  padding: 0.75rem 1rem;

  @media (max-width: 768px) {
    padding: 0.75rem;
  }
`;

export const ToolbarRow = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
`;

export const ToolbarGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
`;

export const PageHeading = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
`;

export const PageTitle = styled.h2`
  font-size: 1.05rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  @media (max-width: 768px) {
    font-size: 0.95rem;
  }
`;

export const PageSubtitle = styled.p`
  font-size: 0.78rem;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  margin: 0;
  line-height: 1.45;
`;

export const SurfaceInset = styled.div`
  ${css`
    ${({ theme }) => {
      const layout = getLayoutPalette(theme);
      return css`
        background: ${layout.surfaceBg};
        border: 1px solid ${layout.surfaceBorder};
        box-shadow: ${layout.surfaceShadow};
      `;
    }}
  `}
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: ${CARD_RADIUS_LG};
`;

export const TableScroller = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

export const ClayTextInput = styled.input`
  ${neumorphFieldStyle}
  width: 100%;
  min-height: 38px;
  font-size: 0.8rem;
`;

export const ClaySelectInput = styled.select`
  ${neumorphSelectFieldStyle}
  ${minimalSelectMenuStyle}
  width: 100%;
  min-height: 38px;
  font-size: 0.8rem;
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
