import styled, { keyframes, css } from 'styled-components';
import { KeyboardArrowUpRounded as ChevronDownIcon } from '@mui/icons-material';
import {
  clayCardStyle,
  clayButtonStyle,
  clayInputStyle,
  clayPanelStyle,
  getLayoutPalette,
  getDashboardPalette,
  neumorphDateFieldStyle,
  isDark,
  CARD_RADIUS_LG,
  CARD_RADIUS_MD
} from '../../styles/DesignSystem';

// ==========================================
// ANIMATIONS
// ==========================================
const tableRowSlideIn = keyframes`
  0% {
    opacity: 0;
    transform: translateX(-10px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
`;

const slideIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
    filter: blur(4px);
  }
  60% {
    opacity: 1;
    transform: translateY(-4px) scale(1.03);
    filter: blur(0px);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0px);
  }
`;

const shimmer = keyframes`
  0% { left: -100%; }
  100% { left: 100%; }
`;

const modalSlideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const fadeInSlideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const resetAnimation = keyframes`
  from, to {
    opacity: 0;
    transform: translateY(20px);
  }
`;

// ==========================================
// LAYOUT COMPONENTS
// ==========================================
export const DashboardContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: ${({ theme }) => theme.BG};
  padding: 0.5rem;
  padding-bottom: 0.2rem; /* Match tighter gap between cards */
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
  position: relative;
  
  @media (max-width: 768px) {
    padding: 0.375rem;
    padding-bottom: 0.16rem; /* Match tighter gap between cards on mobile */
    gap: 0.16rem;
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
  ${clayPanelStyle}
  border-bottom: 1px solid ${({ theme }) => getLayoutPalette(theme).shellBorder};
  padding: 0.5rem 0.25rem;
  margin-top: -0.5rem;
  margin-bottom: 0.5rem;
  margin-left: -0.5rem;
  margin-right: -0.5rem;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};

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

export const TabsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  position: relative;
  min-width: 0;
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

export const TabsWrapper = styled.div<{ $isScrolling?: boolean; $hideScrollbar?: boolean; $preventScroll?: boolean }>`
  display: flex;
  gap: 0.4rem;
  flex: 1;
  align-items: center;
  min-width: 0;
  
  /* Prevent scrolling when $preventScroll is true */
  ${({ $preventScroll }) => $preventScroll
    ? 'overflow: hidden;'
    : `
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
    `}
  
  /* Desktop: Hide scrollbar when $hideScrollbar is true */
  @media (min-width: 769px) {
    ${({ $preventScroll, $hideScrollbar, theme }) => {
    if ($preventScroll) return '';

    const scrollbarStyles = $hideScrollbar
      ? `
          scrollbar-width: none;
          -ms-overflow-style: none;
          &::-webkit-scrollbar {
            display: none;
            height: 0;
          }
        `
      : `
  scrollbar-width: thin;
          -ms-overflow-style: auto;
          scrollbar-color: ${`${getLayoutPalette(theme).dropdownThumb} transparent`};
  
  &::-webkit-scrollbar {
            display: block;
    height: 4px;
  }
  
  &::-webkit-scrollbar-track {
            background: transparent;
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
            background: ${getLayoutPalette(theme).dropdownThumb};
    border-radius: 2px;
    
    &:hover {
              background: ${getLayoutPalette(theme).dropdownThumbHover};
    }
          }
        `;
    return scrollbarStyles;
  }}
  }
  
  @media (max-width: 768px) {
    width: 100%;
    gap: 0.3rem;
    padding-bottom: 0.25rem;
    /* Allow scrolling on mobile */
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    /* Hide scrollbar on mobile by default */
    scrollbar-width: ${({ $isScrolling }) => $isScrolling ? 'thin' : 'none'};
    -ms-overflow-style: ${({ $isScrolling }) => $isScrolling ? 'auto' : 'none'};
    
    &::-webkit-scrollbar {
      display: ${({ $isScrolling }) => $isScrolling ? 'block' : 'none'};
      height: 4px;
    }
  }
`;

export const OverflowButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem;
  border-radius: ${CARD_RADIUS_MD};
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).surfaceBorder};
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  color: ${({ theme }) => getLayoutPalette(theme).shellText};
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  min-width: 32px;
  height: 32px;
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};
  
  &:hover {
    background: ${({ theme }) => getLayoutPalette(theme).surfaceHoverBg};
    border-color: ${({ theme }) => getLayoutPalette(theme).surfaceHoverBorder};
    box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceHoverShadow};
    color: ${({ theme }) => theme.ACCENT};
    transform: translateY(-1px);
  }
  
  svg {
    font-size: 18px;
  }
  
  @media (max-width: 768px) {
    display: none;
  }
`;

export const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  ${clayCardStyle}
  border-radius: ${CARD_RADIUS_LG};
  min-width: 200px;
  z-index: 1000;
  padding: 0.25rem 0;
  overflow: hidden;
`;

export const DropdownMenuItem = styled.button<{ $active?: boolean; $isAttention?: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.65rem 1rem;
  border: none;
  background: ${({ $active, theme }) => $active
    ? getDashboardPalette(theme).accentTint
    : 'transparent'};
  color: ${({ $active, $isAttention, theme }) => $active ? theme.ACCENT : $isAttention ? '#ec4899' : theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  font-weight: ${({ $active, $isAttention }) => ($active || $isAttention) ? '600' : '500'};
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  
  svg {
    font-size: 18px;
    margin-right: 0.5rem;
    flex-shrink: 0;
    ${({ $isAttention, $active }) => $isAttention && !$active && css`
      animation: ${wiggle} 1s ease-in-out infinite;
      color: #ec4899;
    `}
  }
  
  &:hover {
    background: ${({ $active, theme }) => $active
      ? getDashboardPalette(theme).accentTintSoft
      : getLayoutPalette(theme).navHoverBg};
    color: ${({ theme, $isAttention }) => $isAttention ? '#ec4899' : theme.ACCENT};
  }
  
  &:active {
    background: ${({ $active, theme }) => $active
      ? `${theme.ACCENT}30`
      : getLayoutPalette(theme).surfaceHoverBg};
  }
`;

const premiumPulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.7);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(244, 63, 94, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(244, 63, 94, 0);
  }
`;

const wiggle = keyframes`
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(3deg); }
  75% { transform: rotate(-3deg); }
`;

const floatingIcon = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
`;

const tabAttentionPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 4px rgba(236, 72, 153, 0.15), inset 0 0 2px rgba(236, 72, 153, 0.05);
    border-color: rgba(236, 72, 153, 0.25);
  }
  50% {
    box-shadow: 0 0 12px rgba(236, 72, 153, 0.35), inset 0 0 4px rgba(236, 72, 153, 0.1);
    border-color: rgba(236, 72, 153, 0.45);
  }
`;

export const BirthdayBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #d946ef 100%);
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 700;
  height: 16px;
  min-width: 16px;
  padding: 0 5px;
  border-radius: 10px;
  margin-left: 6px;
  box-shadow: 0 0 8px rgba(236, 72, 153, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  line-height: 1;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0; left: -100%; width: 100%; height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    );
    animation: shineBadge 3s infinite ease-in-out;
  }

  @keyframes shineBadge {
    0% { left: -100%; }
    15% { left: 100%; }
    100% { left: 100%; }
  }
`;

export const NotificationDot = styled.span`
  position: absolute;
  top: -3px;
  right: -3px;
  width: 7px;
  height: 7px;
  background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%);
  border-radius: 50%;
  z-index: 2;
  display: block;
  
  &::after {
    content: '';
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    border-radius: 50%;
    background: rgba(244, 63, 94, 0.4);
    animation: ${premiumPulse} 2.5s infinite ease-out;
  }
`;

export const TabButton = styled.button.attrs<{ active: boolean; $isAttention?: boolean }>(props => ({
  $active: props.active,
  $isAttention: props.$isAttention,
}))<{ active: boolean; $isAttention?: boolean }>`
  ${clayButtonStyle}
  padding: 0.35rem 0.72rem;
  border-radius: ${CARD_RADIUS_LG};
  font-size: 0.82rem;
  min-height: 34px;
  font-weight: ${({ active }) => active ? '700' : '600'};
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  color: ${({ active, theme }) => active ? '#ffffff' : getLayoutPalette(theme).shellSoftText};
  background: ${({ active, theme }) => active ? undefined : getLayoutPalette(theme).surfaceBg};
  border: 1px solid ${({ active, theme }) => active ? 'transparent' : getLayoutPalette(theme).surfaceBorder};
  box-shadow: ${({ active, theme }) => active ? undefined : getLayoutPalette(theme).surfaceShadow};
  position: relative;

  svg {
    font-size: 17px;
    color: inherit;
  }

  ${({ active, theme }) => !active && css`
    &:hover {
      background: ${getLayoutPalette(theme).navHoverBg};
      color: ${theme.ACCENT};
      border-color: ${getLayoutPalette(theme).surfaceHoverBorder};
      box-shadow: ${getLayoutPalette(theme).surfaceHoverShadow};
      transform: none;
    }
  `}

  ${({ active }) => active && css`
    pointer-events: none;
    transform: none;
  `}

  ${({ $isAttention, active, theme }) => $isAttention && !active && css`
    border-color: ${isDark(theme) ? 'rgba(236, 72, 153, 0.35)' : 'rgba(236, 72, 153, 0.25)'};
    background: ${isDark(theme) ? 'rgba(236, 72, 153, 0.05)' : 'rgba(236, 72, 153, 0.03)'};
    animation: ${tabAttentionPulse} 2.5s infinite ease-in-out;
    color: #ec4899;
    
    svg {
      animation: ${floatingIcon} 2s infinite ease-in-out;
      color: #ec4899;
    }
    
    &:hover {
      background: ${isDark(theme) ? 'rgba(236, 72, 153, 0.1)' : 'rgba(236, 72, 153, 0.06)'};
      border-color: rgba(236, 72, 153, 0.6);
      color: #ec4899;
      box-shadow: 0 0 12px rgba(236, 72, 153, 0.25);
    }
  `}
  
  @media (max-width: 768px) {
    padding: 0.32rem 0.6rem;
    font-size: 0.74rem;
    gap: 0.25rem;
    border-radius: ${CARD_RADIUS_MD};
    min-height: 30px;
    
    svg {
      font-size: 14px;
    }
  }
`;

export const DashboardDateInput = styled.input`
  ${neumorphDateFieldStyle}
  padding: 0.45rem 0.85rem;
  border-radius: 12px;
  min-width: 140px;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    flex: 1;
    min-width: 0;
    width: 100%;
    padding: 0.375rem 0.625rem;
    font-size: 0.8rem;
    border-radius: 10px;
  }
  
  @media (max-width: 480px) {
    padding: 0.35rem 0.5rem;
    font-size: 0.75rem;
  }
`;

export const DashboardGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-start;
  align-items: stretch;
  margin-top: 4px;
  width: 100%;
  @media (max-width: 1100px) {
    gap: 12px;
  }
  @media (max-width: 900px) {
    gap: 8px;
    flex-direction: column;
    margin-top: 8px;
  }
  @media (max-width: 600px) {
    gap: 5px;
    margin-top: 3px;
  }
`;

export const TwoColumnGrid = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: ${({ $columns }) => ($columns === 2 ? '1fr 1fr' : '1fr')};
  gap: 0.375rem;
  align-items: flex-start;
  width: 100%;
  margin-bottom: 0.25rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
  
  @media (max-width: 768px) {
    gap: 0.3rem;
  }
`;

export const LeftColumn = styled.div`
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  
  @media (max-width: 1024px) {
    gap: 0.5rem;
  }
  
  @media (max-width: 768px) {
    gap: 0.375rem;
  }
`;

export const RightColumn = styled.div`
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  
  @media (max-width: 768px) {
    gap: 0.16rem;
  }
`;

// ==========================================
// CARD COMPONENTS
// ==========================================
export const Card = styled.div<{
  gradient?: string;
  shadow?: string;
}>`
  flex: 1 1 260px;
  min-width: 220px;
  max-width: 400px;
  background: ${({ gradient }) => gradient || 'linear-gradient(135deg, #232a3b 60%, #232a3b 100%)'};
  border-radius: ${CARD_RADIUS_LG};
  box-shadow: 0 8px 32px 0 #10131b, 0 1.5px 0 #232a3b;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 24px 32px;
  position: relative;
  color: #fff;
  overflow: visible;
  min-width: 0;
  min-height: 0;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: ${CARD_RADIUS_LG};
    box-shadow: inset 0 2px 16px #1a2233;
    pointer-events: none;
    z-index: 0;
  }
  @media (max-width: 900px) {
    flex: 1 1 45%;
    min-width: 180px;
    max-width: 100%;
    padding: 18px 12px;
  }
  @media (max-width: 700px) {
    flex: 1 1 100%;
    min-width: 0;
    max-width: 100%;
    padding: 12px 6px;
  }
`;

export const CardIconCircle = styled.div<{
  bg: string;
  shadow: string;
}>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ bg }) => bg};
  box-shadow: ${({ shadow }) => shadow};
  color: #fff;
  font-size: 2rem;
  margin-right: 18px;
  z-index: 1;
`;

export const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  z-index: 1;
`;

export const CardTitle = styled.div`
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 2px;
  text-shadow: 0 2px 8px #10131b;
`;

export const CardValue = styled.div`
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: 1px;
  text-shadow: 0 2px 8px #10131b;
`;

export const ChartCard = styled(Card)`
  flex-direction: column;
  align-items: flex-start;
  padding: 24px 32px 16px 32px;
  grid-column: span 2;
  min-height: 220px;
`;

export const ChartTitle = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 12px;
  text-shadow: 0 2px 8px #10131b;
`;

export const ChartSVG = styled.svg`
  width: 100%;
  height: 120px;
  display: block;
`;

export const StatCard = styled.div`
  flex: 1 1 320px;
  min-width: 220px;
  max-width: 400px;
  background: linear-gradient(135deg, #232a3b 60%, #232a3b 100%);
  border-radius: ${CARD_RADIUS_LG};
  box-shadow: 0 8px 32px 0 #10131b, 0 1.5px 0 #232a3b;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 32px 40px;
  position: relative;
  color: #fff;
  overflow: visible;
  min-width: 0;
  min-height: 0;
  @media (max-width: 900px) {
    flex: 1 1 45%;
    min-width: 180px;
    max-width: 100%;
    padding: 18px 12px;
  }
  @media (max-width: 700px) {
    flex: 1 1 100%;
    min-width: 0;
    max-width: 100%;
    padding: 12px 6px;
  }
`;

export const IconCircle = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3a4a6d 60%, #4e5d8a 100%);
  box-shadow: 0 4px 16px #1a2233;
  color: #fff;
  font-size: 2rem;
  margin-right: 18px;
  z-index: 1;
`;

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: clamp(0.45rem, 1.2vw, 0.85rem);
  margin-bottom: clamp(0.6rem, 2vw, 1rem);
  width: 100%;
  @media (max-width: 600px) {
    grid-template-columns: 1fr 1fr;
    gap: 0.45rem;
  }
`;

export const SummaryCard = styled.div<{ bg?: string }>`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : theme.CARD)};
  border-radius: ${CARD_RADIUS_MD};
  box-shadow: 0 6px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.10);
  padding: clamp(0.8rem, 2vw, 1.2rem) clamp(0.8rem, 2vw, 1.2rem) clamp(0.7rem, 1.5vw, 1rem) clamp(0.8rem, 2vw, 1.2rem);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  flex: 1 1 0;
  color: #fff;
  position: relative;
  margin-bottom: 0;
  border: 1px solid ${({ theme }) => theme.BORDER};
  transition: border-color 0.18s;
  font-size: clamp(0.92rem, 1.5vw, 1.05rem);
  &:hover {
    border-color: #6366f1;
  }
`;

export const SummaryIconBg = styled.div<{ color: string }>`
  position: absolute;
  top: 0.7rem;
  right: 0.7rem;
  background: ${({ color }) => color};
  border-radius: 16px;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  filter: none;
`;

export const SummaryTitle = styled.div`
  font-size: 0.98rem;
  font-weight: 700;
  margin-bottom: 0.2rem;
  color: #a0a7b8;
`;

export const SummaryValue = styled.div<{ color?: string }>`
  font-size: 1.5rem;
  font-weight: 800;
  color: ${({ color }) => color || '#fff'};
  margin-bottom: 0.1rem;
`;

export const SummarySubRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.1rem;
  margin-top: 0.2rem;
  font-size: 1.08rem;
  font-weight: 600;
`;

export const GenderStat = styled.span<{ color: string }>`
  display: flex;
  align-items: center;
  gap: 0.3em;
  color: ${({ color }) => color};
  font-size: 1.08rem;
  font-weight: 700;
`;

export const ProgressBar = styled.div<{ color: string; percent: number }>`
  width: 100%;
  height: 9px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 6px;
  margin: 0.5rem 0 0.2rem 0;
  overflow: hidden;
  position: relative;
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${({ percent }) => percent}%;
    background: ${({ color }) => {
    if (color === '#22c55e') return '#22c55e';
    if (color === '#ef4444') return '#ef4444';
    if (color === '#facc15' || color === '#eab308') return '#eab308';
    return color;
  }};
    border-radius: 6px;
    transition: width 0.3s;
  }
`;

export const SubLabel = styled.span<{ color: string }>`
  color: ${({ color }) => color};
  font-size: 1.01rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.2em;
`;

// ==========================================
// ATTENDANCE TAB COMPONENTS
// ==========================================
export const AttendanceStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.375rem;
  }
`;

export const AttendanceStatCard = styled.div<{ accentColor: string; $index?: number }>`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : theme.CARD)};
  border-radius: ${CARD_RADIUS_LG};
  box-shadow: ${({ theme }) => theme.BG === '#252525'
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  padding: 1rem;
  border: ${({ theme }) => theme.BG === '#252525'
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  border-left: 4px solid ${({ accentColor }) => accentColor};
  transition: all 0.2s ease;
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    gap: 0.375rem;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.BG === '#252525'
    ? '0 8px 40px rgba(0, 0, 0, 0.4)'
    : '0 8px 40px rgba(0, 0, 0, 0.15)'};
  }
`;

export const AttendanceStatTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  
  @media (max-width: 768px) {
    margin-bottom: 0.5rem;
  }
`;

export const AttendanceStatIcon = styled.div<{ color: string }>`
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

export const AttendanceStatTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

export const AttendanceStatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const AttendanceStatValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

export const AttendanceStatRightInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  
  @media (max-width: 768px) {
    gap: 0.2rem;
  }
`;

export const AttendanceStatPercentage = styled.div<{ color: string }>`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ color }) => color};
  
  @media (max-width: 768px) {
    font-size: 0.95rem;
  }
`;

export const AttendanceStatStatus = styled.div<{ status: string }>`
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  background: ${({ status, theme }) => {
    if (status === 'Excellent') return '#22c55e20';
    if (status === 'Good') return '#3b82f620';
    if (status === 'Needs Attention') return '#ef444420';
    return theme.BG === '#252525' ? '#353b4a' : '#e5e7eb';
  }};
  color: ${({ status }) => {
    if (status === 'Excellent') return '#22c55e';
    if (status === 'Good') return '#3b82f6';
    if (status === 'Needs Attention') return '#ef4444';
    return '#666';
  }};
  
  @media (max-width: 768px) {
    font-size: 0.7rem;
    padding: 0.15rem 0.4rem;
  }
`;

export const AttendanceChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

export const AttendanceChartCard = styled.div`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : theme.CARD)};
  border-radius: ${CARD_RADIUS_LG};
  box-shadow: ${({ theme }) => theme.BG === '#252525'
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  padding: 1.5rem;
  border: ${({ theme }) => theme.BG === '#252525'
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

export const AttendanceChartHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
`;

export const AttendanceChartSummary = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: ${({ theme }) => theme.BG === '#252525'
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  flex-wrap: wrap;
`;

export const AttendanceChartSummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const AttendanceChartSummaryLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const AttendanceChartSummaryValue = styled.div<{ color?: string }>`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ color, theme }) => color || theme.TEXT_PRIMARY};
`;

export const ConsecutiveAbsentCard = styled.div`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : theme.CARD)};
  border-radius: ${CARD_RADIUS_LG};
  box-shadow: ${({ theme }) => theme.BG === '#252525'
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  padding: 1.5rem;
  border: ${({ theme }) => theme.BG === '#252525'
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  margin-bottom: 0.25rem;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

export const ConsecutiveAbsentHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  
  svg {
    flex-shrink: 0;
  }
`;

export const ConsecutiveAbsentTableContainer = styled.div`
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 12px;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.BG === '#252525' ? '#6366f1cc #232a3b' : '#6366f1cc #e5e7eb'};
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#e5e7eb'};
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #6366f1cc;
    border-radius: 4px;
    
    &:hover {
      background: #6366f1;
    }
  }
`;

export const ConsecutiveAbsentTable = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  
  @media (max-width: 900px) {
    display: none; /* Hide table on mobile - use cards instead */
  }
`;

export const ConsecutiveAbsentTableHeader = styled.div`
  display: grid;
  grid-template-columns: 80px 180px 180px 150px 150px 150px;
  gap: 1rem;
  padding: 0.85rem 1.25rem;
  margin-bottom: 0.5rem;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: ${({ theme }) => theme.BG === '#252525' ? '#8b949e' : '#64748b'};
  position: sticky;
  top: 0;
  z-index: 10;
  @media (min-width: 901px) and (max-width: 1200px) {
    grid-template-columns: 60px 140px 140px 120px 120px 120px;
    gap: 0.75rem;
    font-size: 0.7rem;
  }
`;

export const ConsecutiveAbsentTableHeaderCell = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ConsecutiveAbsentTableBody = styled.div``;

export const ConsecutiveAbsentTableRow = styled.div<{ $index?: number }>`
  display: grid;
  grid-template-columns: 80px 180px 180px 150px 150px 150px;
  gap: 1rem;
  padding: 0.85rem 1.25rem;
  align-items: center;
  margin-bottom: 0.5rem;
  border-radius: ${CARD_RADIUS_LG};
  
  /* Claymorphic Background & Shadow - Subtle shiny blue pop */
  background: ${({ theme }) =>
    theme.BG === '#252525'
      ? 'linear-gradient(145deg, #222538 0%, #222222 100%)'
      : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)'
  };
  border: 1.5px solid ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(226, 232, 240, 0.8)'
  };
  box-shadow: ${({ theme }) =>
    theme.BG === '#252525'
      ? `0 2px 8px rgba(0,0,0,0.30),
         inset 0 1px 2px rgba(220, 235, 255, 0.06),
         inset 0 -1px 3px rgba(37, 99, 235, 0.08)`
      : `0 4px 14px rgba(15, 23, 42, 0.03),
         inset 0 2px 5px rgba(255, 255, 255, 1),
         inset 0 -2px 5px rgba(37, 99, 235, 0.04)`
  };

  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.BG === '#252525' ? '#e2e8f0' : '#334155'};
  
  animation: ${tableRowSlideIn} 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards;
  animation-delay: ${props => (props.$index || 0) * 0.05 + 0.1}s;
  opacity: 0;
  
  @media (min-width: 901px) and (max-width: 1200px) {
    grid-template-columns: 60px 140px 140px 120px 120px 120px;
    gap: 0.75rem;
    font-size: 0.8rem;
    padding: 0.75rem 0.875rem;
  }
`;

export const ConsecutiveAbsentTableCell = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
`;

export const ConsecutiveDaysBadge = styled.span<{ days: number }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
  background: ${({ days }) => {
    if (days >= 7) return '#ef444420';
    if (days >= 4) return '#f59e0b20';
    return '#3b82f620';
  }};
  color: ${({ days }) => {
    if (days >= 7) return '#ef4444';
    if (days >= 4) return '#f59e0b';
    return '#3b82f6';
  }};
`;

// Mobile card styles for consecutive absent students
export const ConsecutiveAbsentGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 12px;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.BG === '#252525' ? '#6366f1cc #232a3b' : '#6366f1cc #e5e7eb'};
  
  &::-webkit-scrollbar {
    width: 6px;
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? '#6366f1cc' : '#6366f1cc'};
    border-radius: 6px;
    transition: background 0.2s;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#6366f1' : '#6366f1'};
  }
  
  @media (min-width: 901px) {
    display: none; /* Hide cards on desktop - use table instead */
  }
`;

export const ConsecutiveAbsentMobileCard = styled.div<{ $index?: number }>`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : theme.CARD)};
  border-radius: ${CARD_RADIUS_LG};
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: clamp(0.18rem, 1vw, 0.38rem) clamp(0.5rem, 2vw, 0.7rem);
  font-size: clamp(0.72rem, 1.7vw, 0.8rem);
  min-width: 0;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: clamp(0.18rem, 1vw, 0.55rem);
  position: relative;
  animation: ${tableRowSlideIn} 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards;
  animation-delay: ${props => (props.$index || 0) * 0.05 + 0.1}s;
  opacity: 0;
  
  @media (max-width: 600px) {
    padding: 0.28rem 0.5rem;
    font-size: 0.75rem;
    gap: 0.35rem;
  }
`;

export const ConsecutiveAbsentCardContent = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1 1 0;
  min-width: 0;
`;

export const ConsecutiveAbsentRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.18rem;
  font-size: 0.92rem;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @media (max-width: 600px) {
    gap: 0.12rem;
    font-size: 0.85rem;
  }
`;

export const ConsecutiveAbsentId = styled.span`
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#b0b8d1' : '#6366f1'};
  font-weight: 600;
  font-size: 0.85rem;
`;

export const ConsecutiveAbsentName = styled.span`
  font-weight: 700;
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#fff' : '#232a3b'};
  font-size: clamp(0.75rem, 2vw, 0.93rem);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ConsecutiveAbsentClass = styled.span`
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#a0a7b8' : '#94a3b8'};
  font-size: clamp(0.7rem, 1.8vw, 0.82rem);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ConsecutiveAbsentDaysContainer = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: auto;
`;

export const AbsentsTableWrapper = styled.div`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : theme.CARD)};
  border-radius: ${CARD_RADIUS_LG};
  box-shadow: ${({ theme }) => theme.BG === '#252525'
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  border: ${({ theme }) => theme.BG === '#252525'
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  margin-bottom: 0.25rem;
  overflow: hidden;
`;

export const AbsentsTableHeader = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

export const AbsentsHeaderTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`;

export const AbsentsHeaderTitle = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

export const AbsentsControls = styled.div<{ isExpanded?: boolean }>`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  margin-left: auto;
`;

export const DateInput = styled.input`
  ${neumorphDateFieldStyle}
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
`;

export const WhatsAppButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  background: #25D366;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: #20BA5A;
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

export const ExportButton = styled.button`
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
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
`;

export const ExportDropdown = styled.div`
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : '#fff')};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  min-width: 180px;
  z-index: 1000;
  overflow: hidden;
  padding: 0.25rem;
`;

export const ExportDropdownItem = styled.button<{ $type?: string }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  background: ${({ $type, theme }) => {
    if ($type === 'absent') {
      return theme.BG === '#252525'
        ? 'rgba(239, 68, 68, 0.15)'
        : 'rgba(239, 68, 68, 0.08)';
    }
    if ($type === 'present') {
      return theme.BG === '#252525'
        ? 'rgba(34, 197, 94, 0.15)'
        : 'rgba(34, 197, 94, 0.08)';
    }
    return 'transparent';
  }};
  color: ${({ $type, theme }) => {
    if ($type === 'absent') {
      return theme.BG === '#252525' ? '#f87171' : '#dc2626';
    }
    if ($type === 'present') {
      return theme.BG === '#252525' ? '#4ade80' : '#16a34a';
    }
    return theme.TEXT_PRIMARY;
  }};
  font-size: 0.875rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid ${({ $type }) => {
    if ($type === 'absent') return '#ef4444';
    if ($type === 'present') return '#22c55e';
    return 'transparent';
  }};
  
  svg {
    color: ${({ $type }) => {
    if ($type === 'absent') return '#ef4444';
    if ($type === 'present') return '#22c55e';
    return 'inherit';
  }};
    font-size: 1rem;
  }
  
  &:hover {
    background: ${({ $type, theme }) => {
    if ($type === 'absent') {
      return theme.BG === '#252525'
        ? 'rgba(239, 68, 68, 0.25)'
        : 'rgba(239, 68, 68, 0.15)';
    }
    if ($type === 'present') {
      return theme.BG === '#252525'
        ? 'rgba(34, 197, 94, 0.25)'
        : 'rgba(34, 197, 94, 0.15)';
    }
    return theme.BG === '#252525' ? '#353b4a' : '#f3f4f6';
  }};
    transform: translateX(2px);
    box-shadow: ${({ $type }) => {
    if ($type === 'absent') return '0 2px 8px rgba(239, 68, 68, 0.2)';
    if ($type === 'present') return '0 2px 8px rgba(34, 197, 94, 0.2)';
    return 'none';
  }};
  }
  
  &:active {
    transform: translateX(0);
  }
  
  &:first-child {
    margin-bottom: 0.25rem;
  }
  
  &:last-child {
    margin-top: 0.25rem;
  }
`;

export const ExpandIcon = styled(ChevronDownIcon) <{ $expanded: boolean }>`
  transform: ${({ $expanded }) => $expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  transition: transform 0.3s ease;
  cursor: pointer;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  &:hover {
    color: ${({ theme }) => theme.ACCENT};
  }
`;

export const AbsentsCollapsibleContent = styled.div<{ $expanded: boolean }>`
  max-height: ${({ $expanded }) => $expanded ? '5000px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease;
`;

export const AbsenteesGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 12px;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.BG === '#252525' ? '#6366f1cc #232a3b' : '#6366f1cc #e5e7eb'};
  &::-webkit-scrollbar {
    width: 6px;
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? '#6366f1cc' : '#6366f1cc'};
    border-radius: 6px;
    transition: background 0.2s;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#818cf8' : '#818cf8'};
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#e5e7eb'};
    border-radius: 6px;
  }
  @media (max-width: 600px) {
    gap: 0.35rem;
    max-height: 260px;
    padding-right: 6px;
  }
  @media (min-width: 901px) {
    display: none;
  }
`;

// Base AbsenteeCard component
const AbsenteeCard = styled.div`
  ${clayCardStyle}
  border-radius: ${CARD_RADIUS_LG};
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  padding: 0.5rem 0.85rem;
  margin-bottom: 0.25rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  min-width: 0;
  font-size: 0.825rem;
  z-index: 1;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    transform: translateY(-1px);
    background: ${({ theme }) =>
    (theme.BG === '#252525' || theme.BG === '#181c2a')
      ? 'linear-gradient(145deg, #2a2d42 0%, #282828 100%)'
      : 'linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%)'
    };
    box-shadow: ${({ theme }) =>
    (theme.BG === '#252525' || theme.BG === '#181c2a')
      ? `0 6px 16px rgba(0,0,0,0.50),
         inset 0 1px 2px rgba(220, 235, 255, 0.08)`
      : `0 6px 16px rgba(15, 23, 42, 0.06),
         inset 0 2px 5px rgba(255, 255, 255, 1)`
    };
  }
`;

// Animated version with delay
const AnimatedAbsenteeCard = styled(AbsenteeCard) <{ $index: number }>`
  opacity: 0;
  animation: ${slideIn} 0.7s cubic-bezier(0.23, 1, 0.32, 1) forwards;
  animation-delay: ${props => props.$index * 0.09 + 0.18}s;
`;

export const CompactAnimatedAbsenteeCard = styled(AnimatedAbsenteeCard) <{ $index?: number }>`
  padding: clamp(0.18rem, 1vw, 0.38rem) clamp(0.5rem, 2vw, 0.7rem);
  font-size: clamp(0.72rem, 1.7vw, 0.8rem);
  min-width: 0;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: clamp(0.18rem, 1vw, 0.55rem);
  position: relative;
  @media (max-width: 900px) {
    display: flex; /* Keep card structure for mobile/tablet */
  }
  @media (min-width: 901px) {
    display: none; /* Hide cards on desktop - use table instead */
  }
  @media (max-width: 600px) {
    padding: 0.28rem 0.5rem;
    font-size: 0.75rem;
    gap: 0.35rem;
    min-width: 340px;
  }
`;

export const StudentAvatar = styled.div`
  width: clamp(18px, 4vw, 26px);
  height: clamp(18px, 4vw, 26px);
  border-radius: 50%;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: clamp(0.18rem, 1vw, 0.5rem);
  color: ${({ theme }) => theme.BG === '#252525' ? '#a0a7b8' : '#64748b'};
  font-weight: 600;
  font-size: clamp(0.7rem, 1.5vw, 0.8rem);
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  @media (max-width: 600px) {
    width: 22px;
    height: 22px;
    font-size: 0.7rem;
    margin-right: 0.35rem;
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    display: block;
  }
`;

export const AbsenteeCardContent = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1 1 0;
  min-width: 0;
`;

export const AbsenteeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.18rem;
  font-size: 0.92rem;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  @media (max-width: 600px) {
    gap: 0.12rem;
    font-size: 0.85rem;
  }
`;

export const AbsenteeId = styled.span`
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#b0b8d1' : '#6366f1'};
  font-weight: 600;
  font-size: 0.85rem;
`;

export const AbsenteeName = styled.span`
  font-weight: 700;
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#fff' : '#232a3b'};
  font-size: clamp(0.75rem, 2vw, 0.93rem);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const AbsenteeFather = styled.span`
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#a0a7b8' : '#94a3b8'};
  font-size: clamp(0.7rem, 1.8vw, 0.82rem);
  margin-left: 0.15rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Dot = styled.span`
  display: inline-block;
  width: 4px;
  height: 4px;
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#a0a7b8' : '#cbd5e1'};
  border-radius: 50%;
  margin: 0 0.18rem;
  &.father-dot {
    @media (max-width: 600px) {
      display: none;
    }
  }
`;

export const StatusPill = styled.button<{ status?: string; $status?: string }>`
  background: ${({ $status, status, theme }) => {
    const s = $status || status;
    const isDark = theme.BG === '#252525' || theme.BG === '#181c2a';
    if (s === 'absent') return isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.12)';
    if (s === 'leave') return isDark ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.12)';
    if (s === 'late' || s === 'Lt' || s === 'lt') return isDark ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.15)';
    if (s === 'present' || s === 'P') return isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.12)';
    return 'transparent';
  }};
  color: ${({ $status, status }) => {
    const s = $status || status;
    if (s === 'absent') return '#ef4444';
    if (s === 'leave') return '#2563eb';
    if (s === 'late' || s === 'Lt' || s === 'lt') return '#f59e0b';
    if (s === 'present' || s === 'P') return '#22c55e';
    return '#64748b';
  }};
  border: none;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  position: absolute;
  right: 16px;
  top: 16px;
  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
`;

export const StatusDropdown = styled.div<{ direction?: 'up' | 'down' }>`
  position: absolute;
  z-index: 1000;
  min-width: 120px;
  max-width: 220px;
  width: max-content;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG === '#252525' || theme.BG === '#181c2a' ? 'rgba(42,42,42,0.97)' : '#fff'};
  color: ${({ theme }) => theme.BG === '#252525' || theme.BG === '#181c2a' ? '#f3f4f6' : '#232a3b'};
  border: 1.5px solid ${({ theme }) => theme.BG === '#252525' || theme.BG === '#181c2a' ? '#353b4a' : '#e5e7eb'};
  border-radius: 8px;
  box-shadow: 0 2px 12px #0002;
  padding: 0.2rem 0;
  display: flex;
  flex-direction: column;
  right: 0;
  ${({ direction }) =>
    direction === 'down'
      ? 'top: calc(100% + 6px);'
      : 'bottom: calc(100% + 6px);'}
`;

export const StatusOption = styled.button<{ color?: string; separator?: boolean }>`
  background: none;
  border: none;
  color: ${({ color }) => color || '#64748b'};
  font-weight: 600;
  font-size: 0.93rem;
  padding: 0.4rem 1rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
  border-top: ${({ separator }) => separator ? '1px solid #eee' : 'none'};
  margin-top: ${({ separator }) => separator ? '2px' : '0'};
  &:hover {
    background: ${({ color }) => color ? `${color}22` : 'rgba(0,0,0,0.05)'};
  }
`;

export const AbsenteesDesktopTable = styled.div`
  display: none;
  flex-direction: column;
  width: 100%;
  max-height: 400px;
  overflow-y: auto;
  overflow-x: auto;
  padding-right: 12px;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.BG === '#252525' ? '#6366f1cc #232a3b' : '#6366f1cc #e5e7eb'};
  &::-webkit-scrollbar {
    width: 6px;
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? '#6366f1cc' : '#6366f1cc'};
    border-radius: 6px;
    transition: background 0.2s;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#818cf8' : '#818cf8'};
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#e5e7eb'};
    border-radius: 6px;
  }
  @media (min-width: 901px) {
    display: flex;
  }
`;

export const AbsenteesTableHeader = styled.div`
  display: grid;
  grid-template-columns: 50px 150px 180px 150px 200px 180px 180px 100px;
  gap: 1rem;
  padding: 0.85rem 1.25rem;
  margin-bottom: 0.5rem;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: ${({ theme }) => theme.BG === '#252525' ? '#8b949e' : '#64748b'};
  border-bottom: none;
  position: sticky;
  top: 0;
  z-index: 10;
  @media (min-width: 901px) and (max-width: 1200px) {
    grid-template-columns: 40px 120px 140px 120px 160px 140px 140px 80px;
    gap: 0.75rem;
    font-size: 0.7rem;
  }
`;

export const AbsenteesTableHeaderCell = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const AbsenteesTableRow = styled.div<{ $index: number }>`
  display: grid;
  grid-template-columns: 50px 150px 180px 150px 200px 180px 180px 100px;
  gap: 1rem;
  padding: 0.85rem 1.25rem;
  align-items: center;
  margin-bottom: 0.5rem;
  border-radius: ${CARD_RADIUS_LG};
  
  /* Claymorphic Background & Shadow - Subtle shiny blue pop */
  background: ${({ theme }) =>
    theme.BG === '#252525'
      ? 'linear-gradient(145deg, #222538 0%, #222222 100%)'
      : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)'
  };
  border: 1.5px solid ${({ theme }) =>
    theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(226, 232, 240, 0.8)'
  };
  box-shadow: ${({ theme }) =>
    theme.BG === '#252525'
      ? `0 2px 8px rgba(0,0,0,0.30),
         inset 0 1px 2px rgba(220, 235, 255, 0.06),
         inset 0 -1px 3px rgba(37, 99, 235, 0.08)`
      : `0 4px 14px rgba(15, 23, 42, 0.03),
         inset 0 2px 5px rgba(255, 255, 255, 1),
         inset 0 -2px 5px rgba(37, 99, 235, 0.04)`
  };

  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.BG === '#252525' ? '#e2e8f0' : '#334155'};
  
  animation: ${tableRowSlideIn} 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards;
  animation-delay: ${props => props.$index * 0.05 + 0.1}s;
  opacity: 0;
  
  @media (min-width: 901px) and (max-width: 1200px) {
    grid-template-columns: 40px 120px 140px 120px 160px 140px 140px 80px;
    gap: 0.75rem;
    font-size: 0.8rem;
    padding: 0.75rem 0.875rem;
  }
`;

export const AbsenteesTableCell = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
`;

export const AbsenteesTableAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.BG === '#252525' ? '#a0a7b8' : '#64748b'};
  font-weight: 600;
  font-size: 0.75rem;
  flex-shrink: 0;
  overflow: hidden;
  cursor: pointer;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
`;

export const AbsenteesTableStatusPill = styled.button<{ $status: string }>`
  background: ${({ $status, theme }) => {
    if ($status === 'absent') return theme.BG === '#252525' ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.12)';
    if ($status === 'leave') return theme.BG === '#252525' ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.12)';
    if ($status === 'late' || $status === 'Lt' || $status === 'lt') return theme.BG === '#252525' ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.15)';
    if ($status === 'present' || $status === 'P') return theme.BG === '#252525' ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.12)';
    return 'transparent';
  }};
  color: ${({ $status }) => {
    if ($status === 'absent') return '#ef4444';
    if ($status === 'leave') return '#2563eb';
    if ($status === 'late' || $status === 'Lt' || $status === 'lt') return '#f59e0b';
    if ($status === 'present' || $status === 'P') return '#22c55e';
    return '#64748b';
  }};
  border: none;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  position: relative;
  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
`;

export const AbsenteesStatsRow = styled.div`
  display: flex;
  gap: 1.5rem;
  padding: 0.875rem 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f9fafb'};
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.BG === '#252525' ? '#9ca3af' : '#6b7280'};
  flex-wrap: wrap;
  align-items: center;

  .stat {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    white-space: nowrap;

    b {
      font-weight: 700;
    }

    &.total {
      color: ${({ theme }) => theme.BG === '#252525' ? '#e2e8f0' : '#1e293b'};
    }

    &.present {
      color: ${({ theme }) => theme.BG === '#252525' ? '#22c55e' : '#16a34a'};
    }

    &.absent {
      color: #ef4444;
      font-weight: 600;
    }

    &.leave {
      color: #2563eb;
      font-weight: 600;
    }

    &.late {
      color: #2563eb;
      font-weight: 600;
    }

    &.avg {
      color: ${({ theme }) => theme.BG === '#252525' ? '#22c55e' : '#16a34a'};
      font-weight: 600;
    }
  }
`;

// ==========================================
// FEE TAB COMPONENTS
// ==========================================
export const FeeStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
`;

export const FeeStatCard = styled.div<{ $index?: number }>`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : theme.CARD)};
  border-radius: ${CARD_RADIUS_LG};
  box-shadow: 0 6px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.10);
  padding: 1.2rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  transition: all 0.2s ease;
  
  @media (max-width: 768px) {
    padding: 0.875rem;
    border-radius: ${CARD_RADIUS_LG};
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 40px rgba(0,0,0,0.25);
  }
`;

export const FeeStatLabel = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  @media (max-width: 768px) {
    font-size: 0.75rem;
    margin-bottom: 0.375rem;
    letter-spacing: 0.3px;
  }
`;

export const FeeStatValue = styled.div`
  font-size: 1.75rem;
  font-weight: 800;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  
  @media (max-width: 768px) {
    font-size: 1.35rem;
  }
`;

export const CollectionChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

export const CollectionChartCard = styled.div`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : theme.CARD)};
  border-radius: ${CARD_RADIUS_LG};
  box-shadow: 0 6px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.10);
  padding: 1.5rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

export const CollectionChartTitle = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

export const FeeCollectionDetailsCard = styled.div`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : theme.CARD)};
  border-radius: ${CARD_RADIUS_LG};
  box-shadow: 0 6px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.10);
  padding: 1.5rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  margin-bottom: 1.5rem;
`;

export const FeeCollectionDetailsTitle = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

export const FeeCollectionTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const FeeCollectionTableHeader = styled.thead``;

export const FeeCollectionTableHeaderCell = styled.th`
  text-align: left;
  padding: 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

export const FeeCollectionTableBody = styled.tbody``;

export const FeeCollectionTableRow = styled.tr<{ isTotal?: boolean }>`
  ${({ isTotal, theme }) => isTotal && `
    font-weight: 700;
    background: ${theme.BG === '#252525' ? '#353b4a' : '#f3f4f6'};
  `}
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#f3f4f6'};
  }
`;

export const FeeCollectionTableCell = styled.td`
  padding: 0.75rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

export const DefaultersCard = styled.div`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : theme.CARD)};
  border-radius: ${CARD_RADIUS_LG};
  box-shadow: 0 6px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.10);
  padding: 1.5rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

export const DefaultersTitle = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

export const DefaultersTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const DefaultersTableHeader = styled.thead``;

export const DefaultersTableHeaderCell = styled.th`
  text-align: left;
  padding: 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

export const DefaultersTableBody = styled.tbody``;

export const DefaultersTableRow = styled.tr<{ isTotal?: boolean }>`
  ${({ isTotal, theme }) => isTotal && `
    font-weight: 700;
    background: ${theme.BG === '#252525' ? '#353b4a' : '#f3f4f6'};
  `}
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#f3f4f6'};
  }
`;

export const DefaultersTableCell = styled.td<{ isMonth?: boolean }>`
  padding: 0.75rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  ${({ isMonth }) => isMonth && `
    font-weight: 600;
  `}
`;

export const StatusBadge = styled.span<{ status?: string; color?: string; bgColor?: string }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ status, bgColor }) => {
    if (bgColor) return bgColor;
    if (status === 'Paid') return '#22c55e20';
    if (status === 'Pending') return '#f59e0b20';
    if (status === 'Overdue') return '#ef444420';
    return '#6b728020';
  }};
  color: ${({ status, color }) => {
    if (color) return color;
    if (status === 'Paid') return '#22c55e';
    if (status === 'Pending') return '#f59e0b';
    if (status === 'Overdue') return '#ef4444';
    return '#6b7280';
  }};
`;

// ==========================================
// ADMISSIONS TAB COMPONENTS
// ==========================================
export const AdmissionsSummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
`;

export const AdmissionsSummaryCard = styled.div<{ $index?: number }>`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : theme.CARD)};
  border-radius: ${CARD_RADIUS_LG};
  box-shadow: 0 6px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.10);
  padding: 1.2rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  transition: all 0.2s ease;
  
  @media (max-width: 768px) {
    padding: 0.875rem;
    border-radius: ${CARD_RADIUS_LG};
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 40px rgba(0,0,0,0.25);
  }
`;

export const SummaryCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  
  @media (max-width: 768px) {
    margin-bottom: 0.5rem;
  }
`;

export const SummaryCardTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

export const SummaryCardIcon = styled.div<{ color: string }>`
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

export const SummaryCardValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 0.25rem;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
    margin-bottom: 0.2rem;
  }
`;

export const SummaryCardSubtext = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  @media (max-width: 768px) {
    font-size: 0.75rem;
  }
`;

export const AdmissionsChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

export const AdmissionsChartCard = styled.div`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : theme.CARD)};
  border-radius: ${CARD_RADIUS_LG};
  box-shadow: 0 6px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.10);
  padding: 1.5rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  flex-direction: column;
  min-height: 350px;
  position: relative;
  overflow: hidden;
  
  @media (max-width: 768px) {
    padding: 1rem;
    min-height: 300px;
  }
`;

export const AdmissionsChartTitle = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  flex-shrink: 0;
`;

// ==========================================
// HOMEWORK TAB COMPONENTS
// ==========================================
export const HomeworkViewToggle = styled.div`
  display: flex;
  gap: 0.5rem;
  background: ${({ theme }) => theme.BG === '#252525' ? '#1f2937' : '#ffffff'};
  border-radius: 12px;
  padding: 0.375rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 280px;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: stretch;
    min-width: 0;
  }
`;

export const HomeworkToggleButton = styled.button<{ $active: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 8px;
  background: ${({ $active, theme }) =>
    $active
      ? `linear-gradient(135deg, ${theme.ACCENT} 0%, ${theme.ACCENT}dd 100%)`
      : 'transparent'
  };
  color: ${({ $active, theme }) =>
    $active
      ? '#ffffff'
      : theme.TEXT_SECONDARY
  };
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${({ $active, theme }) =>
    $active
      ? 'rgba(255, 255, 255, 0.1)'
      : 'transparent'
  };
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  
  &:hover::before {
    opacity: 1;
  }
  
  svg {
    transition: transform 0.2s ease;
    ${({ $active }) => $active ? 'transform: scale(1.1);' : ''}
  }
  
  @media (max-width: 768px) {
    padding: 0.625rem 1rem;
    font-size: 0.8rem;
    gap: 0.375rem;
    
    svg {
      font-size: 0.9rem;
    }
  }
  
  &:hover:not(:disabled) {
    background: ${({ $active, theme }) =>
    $active
      ? `linear-gradient(135deg, ${theme.ACCENT} 0%, ${theme.ACCENT}dd 100%)`
      : theme.BG === '#252525' ? '#2a3441' : '#f8fafc'
  };
    transform: ${({ $active }) => $active ? 'translateY(-1px)' : 'none'};
    box-shadow: ${({ $active }) =>
    $active
      ? '0 4px 12px rgba(99, 102, 241, 0.3)'
      : '0 2px 4px rgba(0, 0, 0, 0.1)'
  };
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: ${({ $active }) =>
    $active
      ? '0 2px 6px rgba(99, 102, 241, 0.2)'
      : 'none'
  };
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const HomeworkTableWrapper = styled.div`
  ${clayCardStyle}
  border-radius: ${CARD_RADIUS_LG};
  overflow: hidden;
`;

export const HomeworkTableHeader = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    padding: 0.875rem 1rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
`;

export const HomeworkHeaderTitle = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 0.625rem;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    width: 100%;
  }
`;

export const HomeworkCollapsibleContent = styled.div<{ $expanded: boolean }>`
  max-height: ${({ $expanded }) => $expanded ? '5000px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease;
`;

export const HomeworkList = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

export const NoHomeworkData = styled.div`
  padding: 3rem 1.5rem;
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.95rem;
`;

export const HomeworkTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

export const HomeworkTableHead = styled.thead`
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#f9fafb'};
`;

export const HomeworkTableRow = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#fafafa'};
  }
`;

export const HomeworkTableHeaderCell = styled.th`
  padding: 0.875rem 1rem;
  text-align: left;
  font-size: 0.875rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
  
  &:first-child {
    width: 20%;
  }
  
  &:nth-child(2) {
    width: 20%;
  }
  
  &:last-child {
    width: 60%;
  }
`;

export const HomeworkTableBody = styled.tbody``;

export const HomeworkTableCell = styled.td`
  padding: 0.875rem 1rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  vertical-align: top;
  
  &:first-child {
    width: 25%;
    min-width: 150px;
  }
  
  &:nth-child(2) {
    width: 20%;
    min-width: 120px;
  }
  
  &:last-child {
    width: 55%;
  }
  
  @media (max-width: 768px) {
    padding: 0.75rem 0.5rem;
    font-size: 0.8rem;
  }
`;

// Mobile-specific components
export const HomeworkMobileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 1rem;
  
  @media (min-width: 769px) {
    display: none;
  }
`;

export const HomeworkMobileCard = styled.div`
  background: ${({ theme }) =>
    theme.BG === '#252525' || theme.BG === '#181c2a'
      ? 'linear-gradient(145deg, #222538 0%, #222222 100%)'
      : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)'
  };
  border: 1.5px solid ${({ theme }) =>
    theme.BG === '#252525' || theme.BG === '#181c2a' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(226, 232, 240, 0.8)'
  };
  box-shadow: ${({ theme }) =>
    theme.BG === '#252525' || theme.BG === '#181c2a'
      ? `0 4px 12px rgba(0,0,0,0.40),
         inset 0 1px 2px rgba(220, 235, 255, 0.06),
         inset 0 -1px 3px rgba(37, 99, 235, 0.08)`
      : `0 4px 14px rgba(15, 23, 42, 0.03),
         inset 0 2px 5px rgba(255, 255, 255, 1),
         inset 0 -2px 5px rgba(37, 99, 235, 0.04)`
  };
  border-radius: ${CARD_RADIUS_LG};
  border-left: 4px solid ${({ theme }) => theme.ACCENT};
  padding: 1rem;
  transition: all 0.2s ease;
  
  &:active {
    transform: scale(0.98);
    background: ${({ theme }) => theme.BG === '#252525' || theme.BG === '#181c2a' ? '#3a4250' : '#f3f4f6'};
  }
`;

export const HomeworkMobileCardHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

export const HomeworkMobileClass = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  
  svg {
    color: ${({ theme }) => theme.ACCENT};
    opacity: 0.8;
  }
`;

export const HomeworkMobileSubject = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  svg {
    color: ${({ theme }) => theme.ACCENT};
  }
`;

export const HomeworkMobileDescription = styled.div`
  font-size: 0.875rem;
  line-height: 1.6;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  white-space: pre-wrap;
  word-wrap: break-word;
`;

export const HomeworkTeacherItem = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  padding-bottom: 1.5rem;
  
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

export const HomeworkTeacherHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

export const HomeworkClassItem = styled.div`
  margin-left: 1.5rem;
  margin-bottom: 1rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

export const HomeworkClassHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

export const HomeworkSubjectItem = styled.div`
  margin-left: 1.5rem;
  margin-bottom: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#f9fafb'};
  border-radius: 6px;
  border-left: 3px solid ${({ theme }) => theme.ACCENT};
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

export const HomeworkSubjectName = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 0.375rem;
  white-space: nowrap;
  flex-shrink: 0;
  
  svg {
    font-size: 0.875rem;
    color: ${({ theme }) => theme.ACCENT};
  }
`;

export const HomeworkSubjectHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

export const HomeworkText = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  line-height: 1.5;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  
  @media (max-width: 768px) {
    -webkit-line-clamp: 2;
    width: 100%;
  }
`;

export const HomeworkTeacher = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  display: flex;
  align-items: center;
  gap: 0.375rem;
  white-space: nowrap;
  flex-shrink: 0;
  
  svg {
    font-size: 0.75rem;
    opacity: 0.7;
  }
  
  @media (max-width: 768px) {
    font-size: 0.75rem;
  }
`;

export const HomeworkDivider = styled.span`
  color: ${({ theme }) => theme.BORDER};
  margin: 0 0.25rem;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

export const HomeworkBadge = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  padding: 0.2rem 0.5rem;
  border-radius: 8px;
  white-space: nowrap;
`;

// ==========================================
// MODAL COMPONENTS
// ==========================================
export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: ${modalSlideIn} 0.2s ease;
`;

export const ModalContent = styled.div`
  background: ${({ theme }) => (theme.BG === '#252525' ? '#2a2a2a' : '#fff')};
  border-radius: ${CARD_RADIUS_LG};
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  animation: ${modalSlideIn} 0.3s ease;
`;

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

export const ModalIcon = styled.div<{ color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${({ color }) => color}20;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ color }) => color};
`;

export const ModalTitle = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

export const ModalMessage = styled.div`
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-bottom: 1.5rem;
  line-height: 1.6;
`;

export const StudentInfoCard = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#f9fafb'};
  border-radius: ${CARD_RADIUS_LG};
  padding: 1rem;
  margin-bottom: 1.5rem;
`;

export const StudentName = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 0.75rem;
`;

export const StudentDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const DetailLabel = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 600;
`;

export const DetailValue = styled.div<{ highlight?: boolean }>`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: ${({ highlight }) => highlight ? 700 : 500};
  ${({ highlight }) => highlight && `
    font-size: 1rem;
  `}
`;

export const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

export const ModalButton = styled.button<{ variant?: 'primary' | 'secondary' | 'cancel' | 'delete' }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${({ variant, theme }) => {
    if (variant === 'primary' || variant === 'delete') {
      return `
        background: #ef4444;
        color: white;
        
        &:hover {
          background: #dc2626;
          transform: translateY(-1px);
        }
      `;
    }
    if (variant === 'cancel') {
      return `
        background: ${theme.BG === '#252525' ? '#353b4a' : '#f3f4f6'};
        color: ${theme.TEXT_PRIMARY};
        border: 1px solid ${theme.BORDER};
        
        &:hover {
          background: ${theme.BG === '#252525' ? '#404552' : '#e5e7eb'};
        }
      `;
    }
    return `
      background: ${theme.BG === '#252525' ? '#353b4a' : '#f3f4f6'};
      color: ${theme.TEXT_PRIMARY};
      border: 1px solid ${theme.BORDER};
      
      &:hover {
        background: ${theme.BG === '#252525' ? '#3d4557' : '#e5e7eb'};
      }
    `;
  }}
  
  &:active {
    transform: translateY(0);
  }
`;

