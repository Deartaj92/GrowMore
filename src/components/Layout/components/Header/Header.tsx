import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUserPermissions } from '../../../../services/permissionService';
import { shouldShowMenuItem, pathToPermissionKey } from '../../../../utils/permissionMapping';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../supabaseClient';
import { examinationService } from '../../../../services/examinationService';
import type { Examination } from '../../../../types/examinations';
import { fetchUnreadCounts, UnreadCounts } from '../../../../services/notificationService';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  AccountCircle as UserIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  PersonAdd as PersonAddIcon,
  Block as BlockIcon,
  GroupAdd as GroupAddIcon,
  Description as DescriptionIcon,
  Assessment as AssessmentIcon,
  BarChart as BarChartIcon,
  Work as WorkIcon,
  AccessTime as AccessTimeIcon,
  EventBusy as EventBusyIcon,
  Event as EventIcon,
  Assignment as AssignmentIcon,
  CalendarMonth as CalendarMonthIcon,
  AttachMoney as AttachMoneyIcon,
  AccountBalance as AccountBalanceIcon,
  ListAlt as ListAltIcon,
  AccountBalanceWallet as WalletIcon,
  AccountBalanceWallet,
  Receipt as ReceiptIcon,
  Gavel as GavelIcon,
  PieChart as PieChartIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Quiz as QuizIcon,
  Forum as ForumIcon,
  Settings as SettingsIcon,
  Business as BusinessIcon,
  BeachAccess as BeachAccessIcon,
  Notifications as NotificationsIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Person as PersonIcon,
  CloudDownload as CloudDownloadIcon,
  EmojiEvents as EmojiEventsIcon,
  Add as AddIcon,
  List as ListIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  ChevronRight as ChevronRightIcon,
  Feedback as FeedbackIcon,
  TrendingUp as TrendingUpIcon,
  Calculate as CalculateIcon,
  Badge as BadgeIcon,
  Nfc as NfcIcon,
  QrCodeScanner as QrCodeScannerIcon,
  QrCode2 as QrCode2Icon,
  CreditCard as CreditCardIcon,
} from '@mui/icons-material';
import styled from 'styled-components';
import {
  Header as HeaderStyled,
  HeaderLeft,
  HeaderActions,
  HeaderIconCircle,
} from '../../styles';
import { clayCardStyle, isDark, clayInsetStyle, getLayoutPalette, CARD_RADIUS_LG, CARD_RADIUS_MD } from '../../../../styles/DesignSystem';
import { StudentInfo, ParentInfo, InstituteProfile } from '../../types';
import NotificationBell from '../../../NotificationBell';
import ProfileDropdown from '../ProfileDropdown/ProfileDropdown';
import { getSequenceNumber } from '../../../../utils/studentUtils';

// Mac-style window controls (for Electron)
const MacWindowControls = styled.div`
  display: flex;
  gap: 11px;
  height: 28px;
  align-items: center;
  -webkit-app-region: no-drag;
  margin-left: 8px;
  margin-right: -16px;
  padding-right: 16px;
  
  @media (max-width: 700px) {
    display: none;
  }
`;

const MacButton = styled.button<{ color: string }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: ${({ color }) => color};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  padding: 0;
  transition: box-shadow 0.18s, background 0.18s;
  box-shadow: 0 1px 2px #0002;
  outline: none;
  &:hover { filter: brightness(1.1); }
  &:focus { outline: none; }
  &:active { filter: brightness(0.95); }
`;

const MacIcon = styled.span`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  color: #222c;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s;
  ${MacButton}:hover & { opacity: 1; }
`;

function MacWindowControlsComponent() {
  const [isMaximized, setIsMaximized] = React.useState(false);
  React.useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.isMaximized().then(setIsMaximized);
      window.electronAPI.onMaximize(() => setIsMaximized(true));
      window.electronAPI.onUnmaximize(() => setIsMaximized(false));
    }
  }, []);
  const handleMinimize = () => { if (window.electronAPI) window.electronAPI.minimize(); };
  const handleMaximize = () => { if (window.electronAPI) { if (isMaximized) window.electronAPI.unmaximize(); else window.electronAPI.maximize(); } };
  const handleClose = () => { if (window.electronAPI) window.electronAPI.close(); };
  return (
    <MacWindowControls>
      <MacButton color="#ffbd2e" aria-label="Minimize" title="Minimize" onClick={handleMinimize}><MacIcon>&#8211;</MacIcon></MacButton>
      <MacButton color="#27c93f" aria-label={isMaximized ? 'Restore' : 'Maximize'} title={isMaximized ? 'Restore' : 'Maximize'} onClick={handleMaximize}><MacIcon>{isMaximized ? <>&#9633;</> : <>&#9723;</>}</MacIcon></MacButton>
      <MacButton color="#ff5f56" aria-label="Close" title="Close" onClick={handleClose}><MacIcon>&#10005;</MacIcon></MacButton>
    </MacWindowControls>
  );
}

// App Logo
const AppLogo = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  color: ${props => props.theme.TEXT_PRIMARY};
  margin-right: 10px;
  flex-shrink: 0;
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};
  cursor: pointer;
  overflow: hidden;
  -webkit-app-region: no-drag;
  border: 1.5px solid ${({ theme }) => getLayoutPalette(theme).surfaceBorder};
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  appearance: none;
  -webkit-appearance: none;
  outline: none;
  padding: 0;
  font: inherit;
  
  &:hover {
    cursor: pointer;
  }
  
  svg {
    font-size: 20px;
    pointer-events: none;
  }
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    pointer-events: none;
    image-rendering: -webkit-optimize-contrast;
    'image-rendering': 'high-quality';
  }
  
  @media (max-width: 700px) {
    width: 32px;
    height: 32px;
    margin-right: 8px;
    
    svg {
      font-size: 18px;
    }
  }
`;

// Navigation Menu Container
const NavMenu = styled.nav`
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
  position: relative;
  z-index: 100002;
  
  @media (max-width: 700px) {
    display: none;
  }
`;

// Navigation Menu Item
const NavMenuItem = styled.button<{ $hasDropdown?: boolean; $isDashboard?: boolean }>`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: ${props => props.theme.TEXT_SECONDARY};
  font-size: 0.82rem;
  font-weight: 500;
  cursor: ${props => props.$hasDropdown ? 'default' : 'pointer'};
  border-radius: ${CARD_RADIUS_LG};
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  white-space: nowrap;
  -webkit-app-region: no-drag;
  letter-spacing: 0.01em;
  
  ${props => props.$isDashboard && `
    color: ${getLayoutPalette(props.theme).navActiveText};
    font-weight: 600;
  `}
  
  &:hover {
    background: ${({ theme }) => getLayoutPalette(theme).navHoverBg};
    color: ${props => props.theme.TEXT_PRIMARY};
    box-shadow: ${({ theme }) => getLayoutPalette(theme).navHoverShadow};
  }
  
  svg {
    font-size: 16px;
    flex-shrink: 0;
    opacity: 0.75;
  }
  
  span {
    flex-shrink: 0;
  }
  
  @media (max-width: 700px) {
    padding: 6px 10px;
    font-size: 0.8rem;
    gap: 5px;
    
    svg {
      font-size: 14px;
    }
  }
`;

const MenuWrapper = styled.div`
  position: relative;
  z-index: 100002;
`;

const MenuDropdown = styled.div<{ $isOpen: boolean; $columns?: number; $actualColumns?: number }>`
  position: fixed;
  
  ${clayCardStyle}
  background: ${({ theme }) => isDark(theme) ? theme.CARD : '#ffffff'};
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
    
  border-radius: ${CARD_RADIUS_LG};
  padding: 10px;
  z-index: 100001;
  overflow: visible;
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transform: ${props => props.$isOpen ? 'translateY(0)' : 'translateY(-6px)'};
  transition: all 0.2s ease;
  display: ${props => props.$isOpen ? ((props.$actualColumns || props.$columns || 1) === 1 ? 'block' : 'grid') : 'none'};
  grid-template-columns: ${props => {
    const cols = props.$actualColumns || props.$columns || 1;
    if (cols === 1) return '1fr';
    if (cols === 2) return 'repeat(2, 1fr)';
    if (cols === 3) return 'repeat(3, 1fr)';
    return `repeat(${cols}, 1fr)`;
  }};
  gap: 12px;
  pointer-events: ${props => props.$isOpen ? 'auto' : 'none'};
  width: fit-content;
  min-width: ${props => {
    const cols = props.$actualColumns || props.$columns || 1;
    if (cols === 1) return '240px';
    if (cols === 2) return '420px';
    if (cols === 3) return '640px';
    return 'auto';
  }};
  max-width: ${props => {
    const cols = props.$actualColumns || props.$columns || 1;
    if (cols === 1) return '360px';
    if (cols === 2) return '540px';
    if (cols === 3) return '900px';
    return 'auto';
  }};
  max-height: 520px;
  overflow-y: auto;
  overflow-x: hidden;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => getLayoutPalette(theme).dropdownThumb};
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => getLayoutPalette(theme).dropdownThumbHover};
  }
  
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => `${getLayoutPalette(theme).dropdownThumb} transparent`};
  
  @media (max-width: 1400px) {
    ${props => {
    const cols = props.$actualColumns || props.$columns || 1;
    if (cols >= 3) {
      return `
          grid-template-columns: repeat(2, 1fr);
          min-width: 420px;
          max-width: 540px;
        `;
    }
    return '';
  }}
  }
  
  @media (max-width: 1200px) {
    ${props => {
    const cols = props.$actualColumns || props.$columns || 1;
    if (cols >= 3) {
      return `
          grid-template-columns: repeat(2, 1fr);
          min-width: 400px;
          max-width: 520px;
        `;
    }
    return '';
  }}
  }
  
  @media (max-width: 1024px) {
    ${props => {
    const cols = props.$actualColumns || props.$columns || 1;
    if (cols >= 3) {
      return `
          grid-template-columns: repeat(2, 1fr);
          min-width: 380px;
          max-width: 500px;
        `;
    }
    if (cols === 2) {
      return `
          grid-template-columns: 1fr;
          min-width: 240px;
          max-width: 360px;
        `;
    }
    return '';
  }}
  }
  
  @media (max-width: 768px) {
    min-width: 85vw;
    max-width: 85vw;
    grid-template-columns: 1fr !important;
    gap: 10px;
    padding: 10px;
    max-height: 70vh;
  }
  
  @media (max-width: 480px) {
    min-width: 90vw;
    max-width: 90vw;
    padding: 8px;
    gap: 8px;
    max-height: 75vh;
  }
`;

const DropdownColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  overflow: visible;
  
  &:not(:last-child)::after {
    content: '';
    position: absolute;
    right: -8px;
    top: 0;
    bottom: 0;
    width: 1px;
    background: ${props => props.theme.BORDER};
  }
`;

const ColumnSeparator = styled.div`
  width: 100%;
  height: 1px;
  background: ${props => props.theme.BORDER};
  margin: 6px 0;
`;

const ColumnTitle = styled.h3`
  font-size: 0.8rem;
  font-weight: 700;
  color: ${props => props.theme.TEXT_PRIMARY};
  margin: 0 0 8px 0;
  padding-bottom: 6px;
  border-bottom: 2px solid ${props => props.theme.BORDER};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Badge = styled.span`
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 9px;
  background: ${({ theme }) => getLayoutPalette(theme).badgeBg};
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1;
  margin-left: 8px;
  flex-shrink: 0;
  position: relative;
  box-shadow: ${({ theme }) => getLayoutPalette(theme).badgeShadow};
  opacity: 1 !important;
  visibility: visible !important;
  z-index: 3;
  border: 1.5px solid ${({ theme }) => getLayoutPalette(theme).badgeBorder};
`;

const DropdownMenuItem = styled.button<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border: none;
  background: transparent;
  border-radius: ${CARD_RADIUS_MD};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
  position: relative;
  
  &:hover {
    background: ${({ theme }) => getLayoutPalette(theme).navHoverBg};
    transform: translateX(4px);
    box-shadow: ${({ theme }) => isDark(theme) ? 'none' : getLayoutPalette(theme).navHoverShadow};
  }
  
  .menu-icon {
    width: 24px;
    height: 24px;
    border-radius: ${CARD_RADIUS_MD};
    background: linear-gradient(135deg, ${props => props.$color} 0%, ${props => props.$color}dd 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
    box-shadow: 0 2px 4px ${props => props.$color}40;
    
    svg {
      font-size: 16px;
    }
  }
  
  .menu-content {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }
  
  .menu-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: ${props => props.theme.TEXT_PRIMARY};
    margin: 0 0 2px 0;
    line-height: 1.2;
  }
  
  .menu-description {
    font-size: 0.65rem;
    color: ${props => props.theme.TEXT_SECONDARY};
    margin: 0;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  @media (max-width: 768px) {
    padding: 8px;
    gap: 10px;
    
    .menu-icon {
      width: 26px;
      height: 26px;
      
      svg {
        font-size: 17px;
      }
    }
    
    .menu-title {
      font-size: 0.8rem;
    }
    
    .menu-description {
      font-size: 0.7rem;
    }
  }
`;

// Mobile Sidebar Components
const MobileSidebarBackdrop = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${({ theme }) => getLayoutPalette(theme).shellOverlay};
  z-index: 9998;
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transition: opacity 0.3s ease, visibility 0.3s ease;
  
  @media (min-width: 701px) {
    display: none;
  }
`;

const MobileSidebar = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 85vw;
  max-width: 320px;
  height: 100dvh;
  max-height: 100dvh;
  background: ${({ theme }) => getLayoutPalette(theme).sidebarBg};
  z-index: 9999;
  transform: translateX(${props => props.$isOpen ? '0' : '-100%'});
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: ${({ theme }) => getLayoutPalette(theme).sidebarShadow};
  
  /* Fallback for browsers that don't support dvh */
  @supports not (height: 100dvh) {
    height: 100vh;
    max-height: 100vh;
  }
  
  @media (min-width: 701px) {
    display: none;
  }
`;

const MobileSidebarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  background: ${({ theme }) => getLayoutPalette(theme).sidebarHeaderBg};
  position: sticky;
  top: 0;
  z-index: 1;
`;

const MobileSidebarTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${props => props.theme.TEXT_PRIMARY};
  margin: 0;
`;

const MobileSidebarCloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.TEXT_PRIMARY};
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${CARD_RADIUS_MD};
  transition: background 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => getLayoutPalette(theme).sidebarHoverBg};
  }
  
  svg {
    font-size: 24px;
  }
`;

const MobileMenuSection = styled.div`
  padding: 8px 0;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  position: relative;
  z-index: 2;
  
  * {
    opacity: 1 !important;
    visibility: visible !important;
  }
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => getLayoutPalette(theme).dropdownThumb};
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => getLayoutPalette(theme).dropdownThumbHover};
  }
  
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => `${getLayoutPalette(theme).dropdownThumb} transparent`};
`;

const MobileMenuItem = styled.button<{ $hasSubmenu?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px;
  background: none;
  border: none;
  color: ${({ theme }) => getLayoutPalette(theme).shellText} !important;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease;
  position: relative;
  z-index: 2;
  opacity: 1 !important;
  visibility: visible !important;
  
  * {
    opacity: 1 !important;
    visibility: visible !important;
  }
  
  &:hover {
    background: ${({ theme }) => getLayoutPalette(theme).sidebarHoverBg};
  }
  
  .menu-icon {
    margin-right: 12px;
    display: flex !important;
    align-items: center;
    color: ${({ theme }) => getLayoutPalette(theme).shellSoftText} !important;
    flex-shrink: 0;
    opacity: 1 !important;
    visibility: visible !important;
    
    svg {
      font-size: 20px;
      display: block !important;
      opacity: 1 !important;
      visibility: visible !important;
      color: inherit !important;
      fill: currentColor !important;
    }
  }
  
  .menu-label {
    flex: 1;
    color: ${({ theme }) => getLayoutPalette(theme).shellText} !important;
    opacity: 1 !important;
    visibility: visible !important;
    display: block !important;
  }
  
  .menu-arrow {
    color: ${({ theme }) => getLayoutPalette(theme).shellSoftText} !important;
    transition: transform 0.2s ease;
    transform: ${props => props.$hasSubmenu ? 'rotate(0deg)' : 'rotate(-90deg)'};
    flex-shrink: 0;
    opacity: 1 !important;
    visibility: visible !important;
  }
`;

const MobileSubmenu = styled.div<{ $isOpen: boolean }>`
  max-height: ${props => props.$isOpen ? '5000px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease;
  background: ${({ theme }) => getLayoutPalette(theme).sidebarSubmenuBg};
  opacity: 1 !important;
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  
  > * {
    opacity: 1 !important;
    visibility: visible !important;
  }
  
  /* Force immediate visibility when open - override transition delay */
  ${props => props.$isOpen && `
    max-height: 5000px !important;
    overflow: visible !important;
  `}
`;

const MobileSubmenuItem = styled.button`
  position: relative;
  width: 100%;
  display: flex !important;
  align-items: center;
  gap: 12px;
  padding: 10px 16px 10px 32px;
  background: none;
  border: none;
  color: ${({ theme }) => getLayoutPalette(theme).shellSoftText} !important;
  font-size: 0.85rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease;
  opacity: 1 !important;
  visibility: visible !important;
  z-index: 2;
  min-height: 48px;
  
  > * {
    opacity: 1 !important;
    visibility: visible !important;
    display: block !important;
  }
  
  &:hover {
    background: ${({ theme }) => getLayoutPalette(theme).sidebarHoverBg};
    color: ${props => props.theme.TEXT_PRIMARY} !important;
  }
  
  .submenu-icon {
    width: 24px !important;
    height: 24px !important;
    min-width: 24px !important;
    min-height: 24px !important;
    border-radius: ${CARD_RADIUS_MD};
    display: flex !important;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    opacity: 1 !important;
    visibility: visible !important;
    
    svg {
      font-size: 16px !important;
      color: white !important;
      opacity: 1 !important;
      visibility: visible !important;
      fill: currentColor !important;
      display: block !important;
    }
  }
  
  .submenu-content {
    flex: 1;
    min-width: 0;
    display: flex !important;
    flex-direction: column;
    gap: 2px;
    opacity: 1 !important;
    visibility: visible !important;
  }
  
  .submenu-title {
    font-weight: 500;
    color: ${({ theme }) => getLayoutPalette(theme).shellText} !important;
    font-size: 0.85rem;
    opacity: 1 !important;
    visibility: visible !important;
    display: block !important;
    line-height: 1.2;
  }
  
  .submenu-description {
    font-size: 0.7rem;
    color: ${({ theme }) => getLayoutPalette(theme).shellSoftText} !important;
    opacity: 0.85 !important;
    line-height: 1.3;
    display: block !important;
    visibility: visible !important;
  }
`;

const HamburgerButton = styled.button`
  display: none;
  background: none;
  border: none;
  color: ${props => props.theme.TEXT_PRIMARY};
  cursor: pointer;
  padding: 8px;
  margin-right: 8px;
  border-radius: ${CARD_RADIUS_MD};
  transition: background 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => getLayoutPalette(theme).surfaceHoverBg};
    color: ${props => props.theme.ACCENT};
  }
  
  svg {
    font-size: 24px;
  }
  
  @media (max-width: 700px) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const ProfileAvatarContainer = styled(HeaderIconCircle) <{ $hasImage: boolean }>`
  border: ${props => props.$hasImage
    ? `2.5px solid ${getLayoutPalette(props.theme).surfaceBorder}`
    : `1.5px solid ${getLayoutPalette(props.theme).surfaceBorder}`};
  box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceShadow};
  background: ${props => props.$hasImage ? 'transparent' : getLayoutPalette(props.theme).surfaceBg};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  padding: 0;
  width: 40px;
  height: 40px;
  
  &:hover {
    transform: scale(1.08);
    box-shadow: ${({ theme }) => getLayoutPalette(theme).surfaceHoverShadow};
  }
  
  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    display: block;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    z-index: 0;
    image-rendering: -webkit-optimize-contrast;
    'image-rendering': 'high-quality';
    filter: brightness(1.02);
  }
  
  &:hover img {
    transform: scale(1.06);
  }
  
  svg {
    position: relative;
    z-index: 0;
  }
`;

type SearchStudentRecord = {
  id: number;
  name: string;
  father_name?: string | null;
  class_id: number;
  section_id: number;
  picture_url?: string | null;
  roll_number?: string | null;
  status?: string | null;
};

type SearchEmployeeRecord = {
  id: number;
  name: string;
  role?: string | null;
  designation?: string | null;
  department?: string | null;
  mobile?: string | null;
  picture_url?: string | null;
  status?: string | null;
};

type SearchClassRecord = {
  id: number;
  name: string;
  has_sections?: boolean | null;
};

type SearchSectionRecord = {
  id: number;
  name: string;
};

type SearchPageItem = {
  id: string;
  title: string;
  description: string;
  path: string;
  category: string;
  color?: string;
};

type SearchResultItem =
  | {
      type: 'student';
      id: string;
      title: string;
      subtitle: string;
      meta: string;
      imageUrl?: string | null;
      path: string;
      accent?: string;
      status?: string | null;
    }
  | {
      type: 'employee';
      id: string;
      title: string;
      subtitle: string;
      meta: string;
      imageUrl?: string | null;
      path: string;
      accent?: string;
    }
  | {
      type: 'page';
      id: string;
      title: string;
      subtitle: string;
      meta: string;
      path: string;
      accent?: string;
    };

const GlobalSearchWrapper = styled.div`
  position: relative;
  flex: 0 0 auto;
  width: 38px;
  min-width: 38px;
  -webkit-app-region: no-drag;
  z-index: 100003;
  transition: width 0.24s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.24s cubic-bezier(0.4, 0, 0.2, 1);

  &.is-open {
    width: clamp(300px, 34vw, 440px);
    min-width: 280px;
  }

  @media (max-width: 1180px) {
    &.is-open {
      min-width: 240px;
    }
  }

  @media (max-width: 980px) {
    &.is-open {
      width: min(420px, calc(100vw - 24px));
      min-width: min(420px, calc(100vw - 24px));
    }
  }

  @media (max-width: 700px) {
    width: 36px;
    min-width: 36px;
    margin-left: auto;

    &.is-open {
      position: fixed;
      top: 56px;
      left: auto;
      right: 12px;
      width: calc(100vw - 24px);
      min-width: calc(100vw - 24px);
      z-index: 100004;
    }
  }
`;

const GlobalSearchInputShell = styled.div<{ $open: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: ${({ $open }) => ($open ? 'flex-start' : 'center')};
  gap: ${({ $open }) => ($open ? '10px' : '0')};
  width: 100%;
  height: ${({ $open }) => ($open ? '38px' : '38px')};
  min-height: ${({ $open }) => ($open ? '38px' : '38px')};
  padding: 0 ${({ $open }) => ($open ? '14px' : '0')};
  border-radius: ${({ $open }) => ($open ? CARD_RADIUS_LG : '999px')};
  border: 1px solid ${({ theme, $open }) =>
    $open ? theme.ACCENT : getLayoutPalette(theme).surfaceBorder};
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  box-shadow: ${({ theme, $open }) =>
    $open
      ? `0 0 0 3px ${theme.ACCENT}22, ${getLayoutPalette(theme).surfaceShadow}`
      : getLayoutPalette(theme).surfaceShadow};
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;

  ${clayInsetStyle}

  &:focus-within {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: ${({ theme }) => `0 0 0 3px ${theme.ACCENT}22, ${getLayoutPalette(theme).surfaceHoverShadow}`};
  }

  @media (max-width: 700px) {
    background: ${({ theme }) => isDark(theme) ? '#252525' : '#ffffff'};
    box-shadow: ${({ theme, $open }) =>
      $open
        ? (isDark(theme)
            ? `0 0 0 3px ${theme.ACCENT}22, 0 14px 30px rgba(0, 0, 0, 0.34)`
            : `0 0 0 3px ${theme.ACCENT}22, 0 14px 26px rgba(15, 23, 42, 0.16)`)
        : (isDark(theme)
            ? '0 6px 16px rgba(0, 0, 0, 0.28)'
            : '0 6px 14px rgba(15, 23, 42, 0.12)')};
  }
`;

const GlobalSearchIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => getLayoutPalette(theme).shellSoftText};
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  min-width: 18px;
  min-height: 18px;
  margin: 0;
  padding: 0;
  line-height: 0;

  svg {
    font-size: 18px;
    display: block;
    margin: 0;
  }
`;

const GlobalSearchInput = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.92rem;
  font-weight: 500;
  outline: none;
  box-shadow: none;
  appearance: none;
  -webkit-appearance: none;

  &::placeholder {
    color: ${({ theme }) => getLayoutPalette(theme).shellSoftText};
    opacity: 0.95;
  }

  &:focus,
  &:focus-visible,
  &:active {
    outline: none;
    box-shadow: none;
    border: none;
  }
`;

const GlobalSearchDropdown = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  right: 0;
  padding: 10px;
  border-radius: 22px;
  border: 1px solid ${({ theme }) => isDark(theme) ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'};
  background: ${({ theme }) => isDark(theme) ? '#262626' : '#ffffff'};
  box-shadow: ${({ theme }) =>
    isDark(theme)
      ? '0 18px 40px rgba(0, 0, 0, 0.38)'
      : '0 18px 40px rgba(15, 23, 42, 0.16)'};
  max-height: min(68vh, 560px);
  overflow-y: auto;
  overflow-x: hidden;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => isDark(theme) ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.12)'};
    border-radius: 999px;
  }

  @media (max-width: 700px) {
    top: calc(100% + 8px);
    max-height: min(62vh, 520px);
  }
`;

const SearchSection = styled.div`
  & + & {
    margin-top: 8px;
  }
`;

const SearchSectionLabel = styled.div`
  padding: 6px 8px 8px;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => getLayoutPalette(theme).shellSoftText};
`;

const SearchResultButton = styled.button<{ $active: boolean; $accent?: string }>`
  width: 100%;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border: 1px solid ${({ theme, $active, $accent }) =>
    $active ? ($accent || theme.ACCENT) : 'transparent'};
  border-radius: 16px;
  background: ${({ theme, $active, $accent }) =>
    $active
      ? `${$accent || theme.ACCENT}12`
      : isDark(theme)
        ? 'rgba(255,255,255,0.025)'
        : 'rgba(255,255,255,0.55)'};
  box-shadow: ${({ theme, $active }) =>
    $active ? getLayoutPalette(theme).surfaceShadow : 'none'};
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
  text-align: left;

  &:hover {
    border-color: ${({ theme, $accent }) => ($accent || theme.ACCENT)};
    background: ${({ theme, $accent }) => `${$accent || theme.ACCENT}12`};
    transform: translateY(-1px);
  }
`;

const SearchResultAvatar = styled.div<{ $accent?: string }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  font-weight: 800;
  color: ${({ theme, $accent }) => $accent || theme.ACCENT};
  background: ${({ theme, $accent }) => `${$accent || theme.ACCENT}18`};
  border: 1px solid ${({ theme, $accent }) => `${$accent || theme.ACCENT}33`};
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    image-rendering: -webkit-optimize-contrast;
    'image-rendering': 'high-quality';
    filter: brightness(1.02);
  }
`;

const SearchResultText = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const SearchResultTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const SearchResultTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SearchStatusBadge = styled.span<{ $status?: string | null }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: capitalize;
  white-space: nowrap;
  flex-shrink: 0;
  color: ${({ $status }) =>
    $status === 'active' ? '#22c55e' :
    $status === 'inactive' ? '#ef4444' :
    $status === 'suspended' ? '#f59e0b' :
    '#94a3b8'};
  background: ${({ $status }) =>
    $status === 'active' ? 'rgba(34, 197, 94, 0.12)' :
    $status === 'inactive' ? 'rgba(239, 68, 68, 0.12)' :
    $status === 'suspended' ? 'rgba(245, 158, 11, 0.12)' :
    'rgba(148, 163, 184, 0.12)'};
  border: 1px solid ${({ $status }) =>
    $status === 'active' ? 'rgba(34, 197, 94, 0.24)' :
    $status === 'inactive' ? 'rgba(239, 68, 68, 0.24)' :
    $status === 'suspended' ? 'rgba(245, 158, 11, 0.24)' :
    'rgba(148, 163, 184, 0.24)'};
`;

const SearchResultSubtitle = styled.div`
  font-size: 0.76rem;
  font-weight: 500;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SearchResultMeta = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  color: ${({ theme }) => getLayoutPalette(theme).shellSoftText};
  background: ${({ theme }) => isDark(theme) ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)'};
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).surfaceBorder};
  white-space: nowrap;
`;

const SearchEmptyState = styled.div`
  padding: 18px 14px;
  text-align: center;
  color: ${({ theme }) => getLayoutPalette(theme).shellSoftText};
  font-size: 0.84rem;
  line-height: 1.45;
`;

interface HeaderProps {
  user: any;
  studentInfo: StudentInfo | null;
  parentInfo: ParentInfo | null;
  isDownloadActive: boolean;
  onRefresh: () => void;
  avatarUrl: string | null;
  staffName: string | null;
  profileMenuOpen: boolean;
  setProfileMenuOpen: (open: boolean) => void;
  profileIconRef: React.RefObject<HTMLButtonElement>;
  profileDropdownRef: React.RefObject<HTMLDivElement>;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenChangePassword: () => void;
  isWeb: boolean;
  onCheckForUpdates: () => void;
  isCheckingUpdate: boolean;
  onAboutUsClick: () => void;
  onLogout: () => void;
  appVersion: string;
  instituteProfile: InstituteProfile | null;
}

const Header: React.FC<HeaderProps> = ({
  user,
  studentInfo,
  parentInfo,
  isDownloadActive,
  onRefresh,
  avatarUrl,
  staffName,
  profileMenuOpen,
  setProfileMenuOpen,
  profileIconRef,
  profileDropdownRef,
  theme,
  onToggleTheme,
  onOpenChangePassword,
  isWeb,
  onCheckForUpdates,
  isCheckingUpdate,
  onAboutUsClick,
  onLogout,
  appVersion,
  instituteProfile,
}) => {
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser } = useAuth();
  const searchSchoolId = authUser?.school_id || user?.school_id;

  // State for published examinations
  const [publishedExaminations, setPublishedExaminations] = useState<Examination[]>([]);

  // Reset image error when avatar URL changes
  useEffect(() => {
    setImageError(false);
  }, [avatarUrl, parentInfo?.avatar_url]);

  // Check if user is Student or Parent - these use localStorage sessions
  // Students and Parents use localStorage sessions, so check localStorage immediately to prevent menu flash
  // Also check props for when they're loaded
  const checkIsRestrictedRole = () => {
    // First check localStorage immediately (prevents flash on load)
    try {
      const studentSession = localStorage.getItem('studentSession');
      const parentSession = localStorage.getItem('parentSession');
      if (studentSession || parentSession) {
        return true;
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    // Then check props (for when they're loaded)
    if (!!studentInfo || !!parentInfo) {
      return true;
    }

    // If user has no school_id and is not super admin, they might be student/parent
    // But we check via localStorage primarily
    return false;
  };

  const isRestrictedRole = checkIsRestrictedRole();

  // Load user permissions for all users with role_id
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [cachedDashboardPath, setCachedDashboardPath] = useState<string | null>(null);

  const loadPermissions = useCallback(async () => {
      if (!navigator.onLine) {
        return;
      }

      // Check if user is Super Admin (from super_admins table)
      if (user?.id && !user?.school_id) {
        try {
          const { data: superAdminData } = await supabase
            .from('super_admins')
            .select('id')
            .eq('username', user.username)
            .maybeSingle();

          if (superAdminData) {
            setIsSuperAdmin(true);
            // Super Admin has all permissions
            setUserPermissions(new Set(Object.values(pathToPermissionKey)));
            setPermissionsLoaded(true);
            setCachedDashboardPath('/dashboard');
            return;
          }
        } catch (error) {
          console.error('Error checking super admin:', error);
        }
      }

      // Load permissions for all users with role_id from roles table
      if (user?.id && user?.school_id) {
        try {
          const perms = await getUserPermissions(user.id, user.school_id);
          setUserPermissions(perms);
          // Cache dashboard path based on permissions
          if (perms.has('dashboard')) {
            setCachedDashboardPath('/dashboard');
          } else {
            setCachedDashboardPath('/user');
          }
          setPermissionsLoaded(true);
        } catch (error) {
          console.error('Error loading permissions:', error);
          setCachedDashboardPath('/user');
          setPermissionsLoaded(true);
        }
      } else {
        setCachedDashboardPath('/user');
        setPermissionsLoaded(true);
      }
    }, [user?.id, user?.school_id, user?.username]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  useEffect(() => {
    const handleOnline = () => {
      if (!user?.id) return;
      setPermissionsLoaded(false);
      loadPermissions();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [loadPermissions, user?.id]);

  // Load published examinations
  useEffect(() => {
    const loadPublishedExaminations = async () => {
      const schoolId = authUser?.school_id || user?.school_id;
      if (!schoolId) return;

      try {
        const exams = await examinationService.getExaminations({ status: 'published' }, schoolId);
        setPublishedExaminations(exams);
      } catch (error) {
        console.error('Error loading published examinations:', error);
        setPublishedExaminations([]);
      }
    };

    loadPublishedExaminations();
  }, [authUser?.school_id, user?.school_id]);

  // Fetch unread counts for notifications with real-time updates
  useEffect(() => {
    const schoolId = authUser?.school_id || user?.school_id;
    if (!schoolId) return;

    let debounceTimer: NodeJS.Timeout | null = null;

    const loadUnreadCounts = async () => {
      try {
        const counts = await fetchUnreadCounts(schoolId);
        setUnreadCounts(counts);
      } catch (error) {
        console.error('Error loading unread counts:', error);
      }
    };

    // Debounced version to prevent excessive reloads
    const debouncedLoadUnreadCounts = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        loadUnreadCounts();
      }, 300); // 300ms debounce
    };

    // Initial load
    loadUnreadCounts();

    // Set up real-time subscriptions
    const channelName = `unread-counts-${schoolId}`;
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false }
        }
      });

    // Subscribe to leave_requests changes
    channel
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'leave_requests',
          filter: `school_id=eq.${schoolId}`
        },
        (payload) => {
          // Reload counts when leave requests change (debounced)
          debouncedLoadUnreadCounts();
        }
      )
      // Subscribe to complaints changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaints',
          filter: `school_id=eq.${schoolId}`
        },
        (payload) => {
          // Reload counts when complaints change (debounced)
          debouncedLoadUnreadCounts();
        }
      )
      // Subscribe to suggestions changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suggestions',
          filter: `school_id=eq.${schoolId}`
        },
        (payload) => {
          // Reload counts when suggestions change (debounced)
          debouncedLoadUnreadCounts();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to unread counts');
        }
      });

    // Cleanup: unsubscribe when component unmounts or dependencies change
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      supabase.removeChannel(channel);
    };
  }, [authUser?.school_id, user?.school_id]);

  const [studentMenuOpen, setStudentMenuOpen] = useState(false);
  const [employeeMenuOpen, setEmployeeMenuOpen] = useState(false);
  const [attendanceMenuOpen, setAttendanceMenuOpen] = useState(false);
  const [financeMenuOpen, setFinanceMenuOpen] = useState(false);
  const [accountsMenuOpen, setAccountsMenuOpen] = useState(false);
  const [communicationMenuOpen, setCommunicationMenuOpen] = useState(false);
  const [academicsMenuOpen, setAcademicsMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [miscMenuOpen, setMiscMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({
    leaveRequests: 0,
    complaints: 0,
    suggestions: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const [searchStudents, setSearchStudents] = useState<SearchStudentRecord[]>([]);
  const [searchEmployees, setSearchEmployees] = useState<SearchEmployeeRecord[]>([]);
  const [searchClasses, setSearchClasses] = useState<SearchClassRecord[]>([]);
  const [searchSections, setSearchSections] = useState<SearchSectionRecord[]>([]);
  const [mobileOpenMenus, setMobileOpenMenus] = useState<Set<string>>(new Set());
  const menuLeaveTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout | null }>({});
  const globalSearchRef = useRef<HTMLDivElement>(null);
  const globalSearchInputRef = useRef<HTMLInputElement>(null);
  const searchItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const studentMenuRef = useRef<HTMLDivElement>(null);
  const studentButtonRef = useRef<HTMLButtonElement>(null);
  const studentDropdownRef = useRef<HTMLDivElement>(null);
  const employeeMenuRef = useRef<HTMLDivElement>(null);
  const employeeButtonRef = useRef<HTMLButtonElement>(null);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);
  const attendanceMenuRef = useRef<HTMLDivElement>(null);
  const attendanceButtonRef = useRef<HTMLButtonElement>(null);
  const attendanceDropdownRef = useRef<HTMLDivElement>(null);
  const financeMenuRef = useRef<HTMLDivElement>(null);
  const financeButtonRef = useRef<HTMLButtonElement>(null);
  const financeDropdownRef = useRef<HTMLDivElement>(null);
  const accountsMenuRef = useRef<HTMLDivElement>(null);
  const accountsButtonRef = useRef<HTMLButtonElement>(null);
  const accountsDropdownRef = useRef<HTMLDivElement>(null);
  const communicationMenuRef = useRef<HTMLDivElement>(null);
  const communicationButtonRef = useRef<HTMLButtonElement>(null);
  const communicationDropdownRef = useRef<HTMLDivElement>(null);
  const academicsMenuRef = useRef<HTMLDivElement>(null);
  const academicsButtonRef = useRef<HTMLButtonElement>(null);
  const academicsDropdownRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const miscMenuRef = useRef<HTMLDivElement>(null);
  const miscButtonRef = useRef<HTMLButtonElement>(null);
  const miscDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRestrictedRole || !searchSchoolId) {
      setSearchStudents([]);
      setSearchEmployees([]);
      setSearchClasses([]);
      setSearchSections([]);
      return;
    }

    let isMounted = true;

    const loadSearchData = async () => {
      try {
        const [studentsResult, employeesResult, classesResult, sectionsResult] = await Promise.all([
          supabase
            .from('students')
            .select('id, name, father_name, class_id, section_id, picture_url, roll_number, status')
            .eq('school_id', searchSchoolId),
          supabase
            .from('staff')
            .select('*')
            .eq('school_id', searchSchoolId)
            .order('name', { ascending: true }),
          supabase
            .from('classes')
            .select('id, name, has_sections')
            .eq('school_id', searchSchoolId),
          supabase
            .from('sections')
            .select('id, name')
            .eq('school_id', searchSchoolId),
        ]);

        if (!isMounted) return;

        setSearchStudents(studentsResult.data || []);
        setSearchEmployees(employeesResult.data || []);
        setSearchClasses(classesResult.data || []);
        setSearchSections(sectionsResult.data || []);
      } catch (error) {
        if (!isMounted) return;
        console.error('Error loading global search data:', error);
        setSearchStudents([]);
        setSearchEmployees([]);
        setSearchClasses([]);
        setSearchSections([]);
      }
    };

    loadSearchData();

    return () => {
      isMounted = false;
    };
  }, [isRestrictedRole, searchSchoolId]);

  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setActiveSearchIndex(-1);
  }, [location.pathname]);

  useEffect(() => {
    if (!searchOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (globalSearchRef.current && !globalSearchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
        setSearchQuery('');
        setActiveSearchIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [searchOpen]);

  // Update dropdown positions
  const updateDropdownPositions = () => {
    const updatePosition = (buttonRef: React.RefObject<HTMLButtonElement>, dropdownRef: React.RefObject<HTMLDivElement>) => {
      if (buttonRef.current && dropdownRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const dropdown = dropdownRef.current;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 8; // Padding from viewport edges

        // Get dropdown dimensions - use offsetWidth/offsetHeight as fallback
        const dropdownRect = dropdown.getBoundingClientRect();
        const dropdownWidth = dropdownRect.width || dropdown.offsetWidth || 0;
        const dropdownHeight = dropdownRect.height || dropdown.offsetHeight || 0;

        // If dimensions are still 0, use a reasonable default or skip adjustment
        if (dropdownWidth === 0 || dropdownHeight === 0) {
          // Set initial position and let it adjust on next frame
          dropdown.style.top = `${buttonRect.bottom + 4}px`;
          dropdown.style.left = `${buttonRect.left}px`;
          return;
        }

        let top = buttonRect.bottom + 4;
        let left = buttonRect.left;

        // Check if dropdown would overflow bottom edge
        if (top + dropdownHeight > viewportHeight - padding) {
          // Try positioning above the button
          const spaceAbove = buttonRect.top;
          const spaceBelow = viewportHeight - buttonRect.bottom;

          if (spaceAbove > spaceBelow && spaceAbove >= dropdownHeight) {
            // Position above button if there's more space above
            top = buttonRect.top - dropdownHeight - 4;
          } else {
            // Otherwise, position at bottom of viewport with padding
            top = viewportHeight - dropdownHeight - padding;
          }
        }

        // Check if dropdown would overflow right edge
        if (left + dropdownWidth > viewportWidth - padding) {
          // Align to right edge of viewport with padding
          left = viewportWidth - dropdownWidth - padding;
        }

        // Check if dropdown would overflow left edge
        if (left < padding) {
          left = padding;
        }

        dropdown.style.top = `${top}px`;
        dropdown.style.left = `${left}px`;
      }
    };

    if (studentMenuOpen) updatePosition(studentButtonRef, studentDropdownRef);
    if (employeeMenuOpen) updatePosition(employeeButtonRef, employeeDropdownRef);
    if (attendanceMenuOpen) updatePosition(attendanceButtonRef, attendanceDropdownRef);
    if (financeMenuOpen) updatePosition(financeButtonRef, financeDropdownRef);
    if (accountsMenuOpen) updatePosition(accountsButtonRef, accountsDropdownRef);
    if (communicationMenuOpen) updatePosition(communicationButtonRef, communicationDropdownRef);
    if (academicsMenuOpen) updatePosition(academicsButtonRef, academicsDropdownRef);
    if (settingsMenuOpen) updatePosition(settingsButtonRef, settingsDropdownRef);
    if (miscMenuOpen) updatePosition(miscButtonRef, miscDropdownRef);
  };

  // Update positions when menus open or on scroll/resize
  useEffect(() => {
    if (studentMenuOpen || employeeMenuOpen || attendanceMenuOpen || financeMenuOpen || accountsMenuOpen ||
      communicationMenuOpen || academicsMenuOpen || settingsMenuOpen || miscMenuOpen) {
      // Initial positioning
      updateDropdownPositions();

      // Reposition after a short delay to ensure dropdown is fully rendered
      const delayedUpdate = setTimeout(() => {
        updateDropdownPositions();
      }, 10);

      const handleScroll = () => updateDropdownPositions();
      const handleResize = () => updateDropdownPositions();

      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);

      return () => {
        clearTimeout(delayedUpdate);
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [studentMenuOpen, employeeMenuOpen, attendanceMenuOpen, financeMenuOpen, accountsMenuOpen,
    communicationMenuOpen, academicsMenuOpen, settingsMenuOpen, miscMenuOpen]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(menuLeaveTimeoutRef.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  // Student menu items
  const studentMenuItems = [
    {
      title: 'All Students',
      description: 'View and manage all student records',
      icon: <PeopleIcon />,
      path: '/students/list',
      color: '#3b82f6'
    },
    {
      title: 'Add Student',
      description: 'Register new students',
      icon: <PersonAddIcon />,
      path: '/students/add',
      color: '#10b981'
    },
    {
      title: 'Bulk Add Students',
      description: 'Add multiple students at once',
      icon: <GroupAddIcon />,
      path: '/bulk-student-admission',
      color: '#06b6d4'
    },
    {
      title: 'Family Management',
      description: 'Manage family relationships',
      icon: <PeopleIcon />,
      path: '/family-management',
      color: '#ef4444',
      separatorBefore: true
    }
  ];

  const studentSecondaryMenuItems = [
    {
      title: 'Student Status',
      description: 'Manage enrollment status',
      icon: <BlockIcon />,
      path: '/students/status',
      color: '#f59e0b'
    },
    {
      title: 'Promotion',
      description: 'Handle student promotions',
      icon: <SchoolIcon />,
      path: '/bulk-promote-demote',
      color: '#8b5cf6'
    },
    {
      title: 'Withdrawal Register',
      description: 'View admission and withdrawal',
      icon: <DescriptionIcon />,
      path: '/students/withdrawal-register',
      color: '#14b8a6'
    },
    {
      title: 'Student Reports',
      description: 'Generate comprehensive student reports',
      icon: <BarChartIcon />,
      path: '/reports',
      color: '#3b82f6',
      separatorBefore: true
    },
    {
      title: 'Student Cards',
      description: 'Generate and print ID cards',
      icon: <BadgeIcon />,
      path: '/students/cards',
      color: '#8b5cf6'
    }
  ];

  // Misc menu items
  const miscMenuItems = [
    {
      title: 'Notebook Tags',
      description: 'Generate and print tags for notebooks',
      icon: <AssignmentIcon />,
      path: '/misc/notebook-tags',
      color: '#3b82f6'
    }
  ];

  // Attendance menu items (Student only)
  const attendanceMenuItems = [
    {
      title: 'Mark Student Attendance',
      description: 'Record daily student attendance',
      icon: <AssessmentIcon />,
      path: '/attendance/mark',
      color: '#3b82f6'
    },
    {
      title: 'Student Attendance Report',
      description: 'Generate attendance reports',
      icon: <BarChartIcon />,
      path: '/attendance/report',
      color: '#10b981'
    },
    {
      title: 'Student Half Leaves',
      description: 'Record and manage student half-day leaves',
      icon: <AccessTimeIcon />,
      path: '/attendance/half-leaves',
      color: '#ec4899'
    },
    {
      title: 'Attendance Analytics',
      description: 'View comprehensive student attendance analytics and trends',
      icon: <BarChartIcon />,
      path: '/attendance/analytics',
      color: '#0ea5e9'
    }
  ];

  // Reports menu items
  const employeeReportsMenuItems = [
    {
      title: 'Employee Reports',
      description: 'Generate comprehensive employee reports',
      icon: <BarChartIcon />,
      path: '/reports/employee-reports',
      color: '#3b82f6'
    }
  ];

  // Employee attendance menu items
  const employeeAttendanceMenuItems = [
    {
      title: 'Mark Staff Attendance',
      description: 'Record daily staff attendance',
      icon: <WorkIcon />,
      path: '/attendance/staff',
      color: '#f59e0b'
    },
    {
      title: 'Staff Attendance Report',
      description: 'Generate staff reports',
      icon: <BarChartIcon />,
      path: '/attendance/staff-report',
      color: '#8b5cf6'
    },
    {
      title: 'Staff Half Leaves',
      description: 'Record and manage staff half-day leaves',
      icon: <AccessTimeIcon />,
      path: '/attendance/staff-half-leaves',
      color: '#ec4899'
    },
    {
      title: 'Employee Attendance Analytics',
      description: 'View detailed employee attendance, check-in, and checkout analytics',
      icon: <BarChartIcon />,
      path: '/attendance/staff-analytics',
      color: '#0ea5e9'
    }
  ];

  const otherAttendanceMenuItems = [
    {
      title: 'QR Scanner',
      description: 'Mark attendance via QR code scanning',
      icon: <QrCodeScannerIcon />,
      path: '/attendance/qr-scanner',
      color: '#0ea5e9'
    },
    {
      title: 'RFID Scanner',
      description: 'Mark attendance via RFID card scanning',
      icon: <NfcIcon />,
      path: '/attendance/rfid-scanner',
      color: '#6366f1'
    },
    {
      title: 'RFID Card Assignment',
      description: 'Assign RFID cards to students and employees',
      icon: <CreditCardIcon />,
      path: '/attendance/rfid-cards',
      color: '#a855f7'
    },
    {
      title: 'Student QR labels',
      description: 'Generate and print student attendance QR codes',
      icon: <QrCode2Icon />,
      path: '/attendance/student-qr-labels',
      color: '#14b8a6'
    },
    {
      title: 'Holidays',
      description: 'Set up holiday calendar',
      icon: <BeachAccessIcon />,
      path: '/settings/holidays',
      color: '#8b5cf6'
    }
  ];

  // Employee menu items
  const employeeMenuItems = [
    {
      title: 'All Employees',
      description: 'View and manage all staff members',
      icon: <SchoolIcon />,
      path: '/employees/list',
      color: '#3b82f6'
    },
    {
      title: 'Add New',
      description: 'Register new employees and create profiles',
      icon: <PersonAddIcon />,
      path: '/employees/add',
      color: '#10b981'
    },
    {
      title: 'Teacher Subject Assignment',
      description: 'Assign subjects to teachers',
      icon: <AssignmentIcon />,
      path: '/teacher-subjects',
      color: '#f59e0b'
    },
    {
      title: 'Timetable',
      description: 'Create and manage class schedules',
      icon: <CalendarMonthIcon />,
      path: '/timetable',
      color: '#8b5cf6'
    }
  ];

  // Fee menu items - split into two groups
  const feeMenuItems1 = [
    {
      title: 'Fee Collection',
      description: 'Enhanced fee collection interface',
      icon: <AttachMoneyIcon />,
      path: '/fee-collection',
      color: '#8b5cf6'
    },
    {
      title: 'Family Fee Collection',
      description: 'Collect fees for linked family students',
      icon: <AttachMoneyIcon />,
      path: '/family-fee-collection',
      color: '#0ea5e9'
    },
    {
      title: 'Fee Structure',
      description: 'Create and manage fee structures',
      icon: <AccountBalanceIcon />,
      path: '/fee-structure-management',
      color: '#10b981'
    },
    {
      title: 'Fee Plans',
      description: 'Create and manage individual student fee plans',
      icon: <DescriptionIcon />,
      path: '/fee-plans',
      color: '#06b6d4'
    },
    {
      title: 'Generate Challans',
      description: 'Generate fee challans for students based on fee plans',
      icon: <ReceiptIcon />,
      path: '/generate-challans',
      color: '#3b82f6'
    },
    {
      title: 'Challans List',
      description: 'View and manage all generated challans',
      icon: <ListIcon />,
      path: '/challans',
      color: '#6366f1'
    },
    {
      title: 'Fee Defaulters',
      description: 'View students with outstanding fees',
      icon: <AttachMoneyIcon />,
      path: '/fee-defaulters',
      color: '#ef4444'
    },
    {
      title: 'Fee Arrears',
      description: 'Add and manage other payments/arrears without challans',
      icon: <ReceiptIcon />,
      path: '/fee-arrears',
      color: '#f59e0b'
    }
  ];

  // Payroll menu items
  const payrollMenuItems = [
    {
      title: 'Payroll Management',
      description: 'Manage employee salaries, payments, and payroll operations',
      icon: <CalculateIcon />,
      path: '/payroll',
      color: '#3b82f6'
    }
  ];

  const feeMenuItems2 = [
    {
      title: 'Fee Analytics',
      description: 'Comprehensive fee analytics dashboard',
      icon: <AssessmentIcon />,
      path: '/fee-analytics',
      color: '#059669'
    },
    {
      title: 'Payment History',
      description: 'View complete payment history',
      icon: <ListAltIcon />,
      path: '/payment-history',
      color: '#3b82f6'
    },
    {
      title: 'Payments Analytics',
      description: 'Track payment trends, methods, and collection performance',
      icon: <AssessmentIcon />,
      path: '/payments-analytics',
      color: '#0d9488'
    },
    {
      title: 'Fee Ledger',
      description: 'View comprehensive fee ledger',
      icon: <AccountBalanceIcon />,
      path: '/ledger',
      color: '#14b8a6'
    },
    {
      title: 'Fee Increments',
      description: 'Apply increments to fee plans and structures',
      icon: <TrendingUpIcon />,
      path: '/fee-increments',
      color: '#f97316'
    },
    {
      title: 'Other Incomes',
      description: 'Record and track non-fee income sources',
      icon: <AttachMoneyIcon />,
      path: '/other-income-manager',
      color: '#16a34a'
    },
    {
      title: 'Fee Audit Logs',
      description: 'Track all fee-related changes',
      icon: <ListAltIcon />,
      path: '/fee-audit-logs',
      color: '#6b7280'
    },
    ...payrollMenuItems
  ];

  // Expense menu items
  const expenseMenuItems = [
    {
      title: 'Expense Manager',
      description: 'Track and manage all school expenditures',
      icon: <ReceiptIcon />,
      path: '/expense-manager',
      color: '#dc2626'
    },
    {
      title: 'Expense Analytics',
      description: 'View comprehensive expense analytics and insights',
      icon: <BarChartIcon />,
      path: '/expense-analytics',
      color: '#3b82f6'
    }
  ];

  // Other Income menu items
  const otherIncomeMenuItems = [
    {
      title: 'Other Incomes',
      description: 'Record and track non-fee income sources',
      icon: <AttachMoneyIcon />,
      path: '/other-income-manager',
      color: '#16a34a'
    }
  ];

  // Fine menu items
  const fineMenuItems = [
    {
      title: 'Assign Fine',
      description: 'Set and assign fines for violations',
      icon: <AttachMoneyIcon />,
      path: '/fines/assign',
      color: '#3b82f6'
    },
    {
      title: 'Collect Fine',
      description: 'Process fine payments and track collections',
      icon: <AttachMoneyIcon />,
      path: '/fines/collect',
      color: '#10b981'
    },
    {
      title: 'Remaining Fine',
      description: 'View outstanding fines and track payments',
      icon: <WalletIcon />,
      path: '/fines/remaining',
      color: '#f59e0b'
    },
    {
      title: 'Fine Statistics',
      description: 'Analyze fine trends and generate reports',
      icon: <PieChartIcon />,
      path: '/fines/statistics',
      color: '#8b5cf6'
    }
  ];

  // Accounts menu items
  const accountsMenuItems = [
    {
      title: 'Setup Accounts',
      description: 'Manage bank accounts, EasyPaisa, JazzCash and other payment accounts',
      icon: <AccountBalanceWallet />,
      path: '/setup-accounts',
      color: '#3b82f6'
    },
    {
      title: 'Balance Sheet',
      description: 'View account balances including income and expenses',
      icon: <AccountBalanceIcon />,
      path: '/balance-sheet',
      color: '#10b981'
    },
    {
      title: 'Cash Flow',
      description: 'View cash inflows, outflows, and net cash flow statement',
      icon: <TrendingUpIcon />,
      path: '/cash-flow',
      color: '#f59e0b'
    },
    {
      title: 'Assets & Liabilities',
      description: 'Manage school assets and liabilities',
      icon: <AccountBalanceIcon />,
      path: '/assets-liabilities',
      color: '#8b5cf6'
    }
  ];




  // Enquiry Management menu items (moved to Communication)
  const enquiryMenuItems = [
    {
      title: 'Enquiry Dashboard',
      description: 'Overview of all enquiries',
      icon: <DashboardIcon />,
      path: '/enquiries/dashboard',
      color: '#3b82f6'
    },
    {
      title: 'All Enquiries',
      description: 'View and manage all enquiries',
      icon: <ListIcon />,
      path: '/enquiries/list',
      color: '#10b981'
    },
    {
      title: 'New Enquiry',
      description: 'Create new enquiries',
      icon: <AddIcon />,
      path: '/enquiries/create',
      color: '#f59e0b'
    }
  ];

  // Communication menu items (placeholder for future communication features)
  const communicationMenuItems = useMemo(() => {
    const items = [
      {
        title: 'Messages',
        description: 'Send and receive messages',
        icon: <ForumIcon />,
        path: '/students/general-message',
        color: '#3b82f6',
        badgeCount: 0
      },
      {
        title: 'Announcements',
        description: 'Create and manage announcements',
        icon: <ListAltIcon />,
        path: '/settings/user-announcements',
        color: '#10b981',
        badgeCount: 0
      },
      {
        title: 'Events and Notices',
        description: 'Create and manage school events and notices',
        icon: <EventIcon />,
        path: '/events',
        color: '#8b5cf6',
        badgeCount: 0
      },
      {
        title: 'Leave Requests',
        description: 'Review and manage leave requests',
        icon: <EventBusyIcon />,
        path: '/attendance/leave-requests',
        color: '#ef4444',
        badgeCount: unreadCounts.leaveRequests
      },
      {
        title: 'Complaints & Suggestions',
        description: 'Review and manage student and parent complaints and suggestions',
        icon: <FeedbackIcon />,
        path: '/attendance/complaints-suggestions',
        color: '#f59e0b',
        badgeCount: unreadCounts.complaints + unreadCounts.suggestions
      }
    ];
    return items;
  }, [unreadCounts]);

  // Generate description for Marks Entry based on published examinations
  const getMarksEntryDescription = useMemo(() => {
    if (publishedExaminations.length === 0) {
      return 'Enter and manage student marks';
    } else if (publishedExaminations.length === 1) {
      return publishedExaminations[0].name;
    } else {
      const count = publishedExaminations.length;
      const countText = count === 2 ? 'Two' : count === 3 ? 'Three' : count === 4 ? 'Four' : count === 5 ? 'Five' : `${count}`;
      return `${countText} Examinations`;
    }
  }, [publishedExaminations]);

  // Examination menu items
  const examinationMenuItems = useMemo(() => {
    const baseItems = [
      {
        title: 'Manage Examinations',
        description: 'Create and manage examination schedules',
        icon: <AssessmentIcon />,
        path: '/examinations',
        color: '#3b82f6'
      },
      {
        title: 'Master Sheets',
        description: 'Generate comprehensive master sheets',
        icon: <BarChartIcon />,
        path: '/master-sheets',
        color: '#f59e0b'
      },
      {
        title: 'DMC Generation',
        description: 'Generate detailed marks certificates',
        icon: <CloudDownloadIcon />,
        path: '/dmc-generation',
        color: '#8b5cf6'
      },
      {
        title: 'Position Holders',
        description: 'View student positions and rankings',
        icon: <EmojiEventsIcon />,
        path: '/position-holders',
        color: '#ef4444'
      },
      {
        title: 'Exam Analytics',
        description: 'Analyze examination performance',
        icon: <PieChartIcon />,
        path: '/exam-analytics',
        color: '#06b6d4'
      },
      {
        title: 'Manage Subjects',
        description: 'Add, edit, and manage subjects',
        icon: <SchoolIcon />,
        path: '/subjects',
        color: '#84cc16'
      },
      {
        title: 'Examination Configuration',
        description: 'Configure grade criteria and settings',
        icon: <SettingsIcon />,
        path: '/examination-configuration',
        color: '#6366f1'
      }
    ];

    // Only add Marks Entry if there are published examinations
    if (publishedExaminations.length > 0) {
      baseItems.splice(1, 0, {
        title: 'Marks Entry',
        description: getMarksEntryDescription,
        icon: <ListAltIcon />,
        path: '/marks-entry',
        color: '#10b981'
      });
    }

    return baseItems;
  }, [publishedExaminations, getMarksEntryDescription]);

  // Test Record menu items
  const testRecordMenuItems = [
    {
      title: 'Test Marks Entry',
      description: 'View and manage test records',
      icon: <QuizIcon />,
      path: '/test-records',
      color: '#10b981'
    },
    {
      title: 'Test Master Sheet',
      description: 'Generate test master sheets',
      icon: <AssessmentIcon />,
      path: '/test-record-master-sheet',
      color: '#f59e0b'
    },
    {
      title: 'Test Analytics',
      description: 'Analyze test performance and statistics',
      icon: <BarChartIcon />,
      path: '/test-analytics',
      color: '#8b5cf6'
    }
  ];

  // Daily Diary menu items
  const diaryMenuItems = [
    {
      title: 'Assign Diary',
      description: 'Create and manage daily homework assignments',
      icon: <AssignmentIcon />,
      path: '/homework-diary',
      color: '#3b82f6'
    },
    {
      title: 'Diary Analytics',
      description: 'Analyze homework assignment patterns',
      icon: <BarChartIcon />,
      path: '/diary-analytics',
      color: '#10b981'
    }
  ];

  // Settings menu items - split into two columns
  const settingsColumn1Items = [
    {
      title: 'Institute Profile',
      description: 'Manage school information and settings',
      icon: <BusinessIcon />,
      path: '/settings/institute-profile',
      color: '#3b82f6'
    },
    {
      title: 'Classes',
      description: 'Create and manage class structures',
      icon: <SchoolIcon />,
      path: '/settings/classes',
      color: '#10b981'
    },
    {
      title: 'Sessions',
      description: 'Configure academic sessions and terms',
      icon: <CalendarMonthIcon />,
      path: '/settings/sessions',
      color: '#f59e0b'
    }
  ];

  const settingsColumn2Items = [
    {
      title: 'User Management',
      description: 'Manage user accounts and permissions',
      icon: <PeopleIcon />,
      path: '/settings/user-management',
      color: '#ef4444'
    },
    {
      title: 'Role Management',
      description: 'Configure roles and access permissions',
      icon: <AdminPanelSettingsIcon />,
      path: '/settings/role-management',
      color: '#8b5cf6'
    },
    {
      title: 'User Permissions',
      description: 'Manage individual user permissions',
      icon: <PersonIcon />,
      path: '/settings/user-permissions',
      color: '#10b981'
    },
    {
      title: 'Render Settings',
      description: 'Configure render settings users',
      icon: <SettingsIcon />,
      path: '/settings/rendersettings',
      color: '#ec4899'
    },
    {
      title: 'General Settings',
      description: 'Configure general system settings',
      icon: <SettingsIcon />,
      path: '/settings/general-settings',
      color: '#6366f1'
    },
    {
      title: 'Notification Settings',
      description: 'Manage notification preferences',
      icon: <NotificationsIcon />,
      path: '/settings/notifications',
      color: '#ec4899'
    }
  ];

  // Helper function to get dashboard path based on permissions
  // Note: This is primarily for display/reference. For actual navigation, use handleLogoClick.
  const getDashboardPath = useCallback(() => {
    // If we have a cached path, use it (prevents incorrect navigation during loading)
    if (cachedDashboardPath) {
      return cachedDashboardPath;
    }

    // Super Admin always has dashboard access
    if (isSuperAdmin) {
      return '/dashboard';
    }

    // If permissions are loaded, check them
    if (permissionsLoaded) {
      if (userPermissions.has('dashboard')) {
        return '/dashboard';
      }
      return '/user';
    }

    // While permissions are loading, return null to indicate we need async check
    // This prevents incorrect navigation during the loading phase
    return null;
  }, [permissionsLoaded, userPermissions, isSuperAdmin, cachedDashboardPath]);

  // Async handler for logo click that checks permissions if needed
  const handleLogoClick = useCallback(async () => {
    if (isRestrictedRole) {
      navigate('/home');
      return;
    }

    // If permissions are loaded, use the cached path
    if (permissionsLoaded && cachedDashboardPath) {
      navigate(cachedDashboardPath);
      return;
    }

    // If permissions aren't loaded yet, check them asynchronously
    if (!permissionsLoaded && user?.id && user?.school_id) {
      try {
        // Check if Super Admin
        if (!user.school_id) {
          const { data: superAdminData } = await supabase
            .from('super_admins')
            .select('id')
            .eq('username', user.username)
            .maybeSingle();

          if (superAdminData) {
            navigate('/dashboard');
            return;
          }
        }

        // Check dashboard permission
        const { hasPermission } = await import('../../../../services/permissionService');
        const hasDashboardPerm = await hasPermission(user.id, 'dashboard', user.school_id);
        navigate(hasDashboardPerm ? '/dashboard' : '/user');
      } catch (error) {
        console.error('Error checking permission for logo click:', error);
        // On error, stay on current page or go to user dashboard
        if (location.pathname !== '/dashboard' && location.pathname !== '/user') {
          navigate('/user');
        }
      }
      return;
    }

    // Fallback: use current pathname if no user info
    if (!user?.id || !user?.school_id) {
      if (location.pathname !== '/user') {
        navigate('/user');
      }
    }
  }, [isRestrictedRole, permissionsLoaded, cachedDashboardPath, user, navigate, location.pathname]);

  const menuItems = [
    {
      icon: <PeopleIcon />,
      path: '/students',
      label: 'Students',
      hasDropdown: true,
      menuItems: [
        { title: 'Student Management', items: studentMenuItems },
        { title: 'Student Services', items: studentSecondaryMenuItems }
      ],
      columns: 2
    },
    {
      icon: <SchoolIcon />,
      path: '/employees',
      label: 'Employees',
      hasDropdown: true,
      menuItems: [
        { title: 'Employee Management', items: employeeMenuItems },
        { title: 'Reports', items: employeeReportsMenuItems }
      ],
      columns: 2
    },
    {
      icon: <AssessmentIcon />,
      path: '/attendance',
      label: 'Attendance',
      hasDropdown: true,
      menuItems: [
        { title: 'Student Attendance', items: attendanceMenuItems },
        { title: 'Employees Attendance', items: employeeAttendanceMenuItems },
        { title: 'Other', items: otherAttendanceMenuItems }
      ],
      columns: 3
    },
    {
      icon: <AccountBalanceIcon />,
      path: '/finance',
      label: 'Finance',
      hasDropdown: true,
      menuItems: [
        {
          title: 'Fee Management',
          items: feeMenuItems1
        },
        {
          title: 'Fee Record',
          items: feeMenuItems2
        },
        {
          title: 'Expense Management',
          items: expenseMenuItems
        },
        {
          title: 'Fine Management',
          items: fineMenuItems
        }
      ],
      columns: 3
    },
    {
      icon: <AccountBalanceWallet />,
      path: '/accounts',
      label: 'Accounts',
      hasDropdown: true,
      menuItems: [
        { title: 'Account Management', items: accountsMenuItems }
      ],
      columns: 1
    },
    {
      icon: <AssessmentIcon />,
      path: '/academics',
      label: 'Academics',
      hasDropdown: true,
      menuItems: [
        { title: 'Examination', items: examinationMenuItems },
        { title: 'Test Management', items: testRecordMenuItems },
        { title: 'Daily Diary', items: diaryMenuItems }
      ],
      columns: 3
    },
    {
      icon: <ForumIcon />,
      path: '/communication',
      label: 'Communication',
      hasDropdown: true,
      menuItems: [
        { title: 'Communication', items: communicationMenuItems },
        { title: 'Enquiry Management', items: enquiryMenuItems }
      ],
      columns: 2
    },
    {
      icon: <ListAltIcon />,
      path: '/misc',
      label: 'Miscellaneous',
      hasDropdown: true,
      menuItems: [
        { title: 'Miscellaneous Items', items: miscMenuItems }
      ],
      columns: 1
    },
    {
      icon: <SettingsIcon />,
      path: '/settings',
      label: 'Settings',
      hasDropdown: true,
      menuItems: [
        { title: 'School Configuration', items: settingsColumn1Items },
        { title: 'System Settings', items: settingsColumn2Items }
      ],
      columns: 2
    }
  ];

  // Filter menu items based on permissions for teachers
  const filterMenuItems = useMemo(() => {
    if (!permissionsLoaded) return [];

    const filterItems = (items: any[]): any[] => {
      return items.filter(item =>
        shouldShowMenuItem(item.path, user?.role, userPermissions)
      );
    };

    const filterMenuSections = (sections: any[]): any[] => {
      return sections.map(section => {
        const filteredItems = filterItems(section.items || []);
        const filteredExpenseItems = section.expenseItems ? filterItems(section.expenseItems) : undefined;

        // Only include section if it has visible items
        if (filteredItems.length === 0 && (!filteredExpenseItems || filteredExpenseItems.length === 0)) {
          return null;
        }

        return {
          ...section,
          items: filteredItems,
          ...(filteredExpenseItems && { expenseItems: filteredExpenseItems })
        };
      }).filter((section): section is NonNullable<typeof section> => section !== null);
    };

    return menuItems.map(menuItem => {
      if (!menuItem.hasDropdown) {
        // Simple menu item - check permission
        if (!shouldShowMenuItem(menuItem.path, user?.role, userPermissions)) {
          return null;
        }
        return menuItem;
      }

      // Menu with dropdown - filter submenu items
      const filteredSections = filterMenuSections(menuItem.menuItems || []);

      // Only show menu if it has at least one visible section
      if (filteredSections.length === 0) {
        return null;
      }

      return {
        ...menuItem,
        menuItems: filteredSections
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
  }, [permissionsLoaded, user?.role, userPermissions, menuItems, getDashboardPath]);

  const searchablePages = useMemo<SearchPageItem[]>(() => {
    const seen = new Set<string>();
    const pages: SearchPageItem[] = [];

    filterMenuItems.forEach((menuItem: any) => {
      if (menuItem.hasDropdown && Array.isArray(menuItem.menuItems)) {
        menuItem.menuItems.forEach((section: any) => {
          (section.items || []).forEach((item: any) => {
            if (!item?.path || seen.has(item.path)) return;
            seen.add(item.path);
            pages.push({
              id: `page-${item.path}`,
              title: item.title,
              description: item.description || '',
              path: item.path,
              category: menuItem.label,
              color: item.color,
            });
          });
        });
        return;
      }

      if (!menuItem?.path || seen.has(menuItem.path)) return;
      seen.add(menuItem.path);
      pages.push({
        id: `page-${menuItem.path}`,
        title: menuItem.label,
        description: `Open ${menuItem.label}`,
        path: menuItem.path,
        category: 'Navigation',
      });
    });

    return pages;
  }, [filterMenuItems]);

  const trimmedSearchQuery = searchQuery.trim().toLowerCase();

  const studentSearchResults = useMemo<SearchResultItem[]>(() => {
    if (!trimmedSearchQuery) return [];

    const scoredResults: Array<Extract<SearchResultItem, { type: 'student' }> & { score: number }> = [];

    searchStudents.forEach((student) => {
      const classObj = searchClasses.find((item) => item.id === student.class_id);
      const sectionObj = searchSections.find((item) => item.id === student.section_id);
      const classLabel = classObj?.name || 'Unknown class';
      const sectionLabel = sectionObj?.name || '';
      const studentName = student.name || '';
      const fatherName = student.father_name || '';
      const rollNumber = student.roll_number || '';
      const sequenceNumber = getSequenceNumber(student.roll_number);
      const nameLower = studentName.toLowerCase();
      const fatherLower = fatherName.toLowerCase();
      const classLower = classLabel.toLowerCase();
      const sectionLower = sectionLabel.toLowerCase();
      const rollLower = rollNumber.toLowerCase();
      const sequenceLower = sequenceNumber.toLowerCase();
      let score = 0;
      if (nameLower.startsWith(trimmedSearchQuery)) score = Math.max(score, 950);
      else if (nameLower.includes(trimmedSearchQuery)) score = Math.max(score, 640);
      if (fatherLower.includes(trimmedSearchQuery)) score = Math.max(score, 260);
      if (classLower.includes(trimmedSearchQuery)) score = Math.max(score, 220);
      if (sectionLower.includes(trimmedSearchQuery)) score = Math.max(score, 180);
      if (rollLower === trimmedSearchQuery) score = Math.max(score, 1200);
      else if (rollLower.startsWith(trimmedSearchQuery)) score = Math.max(score, 980);
      else if (rollLower.includes(trimmedSearchQuery)) score = Math.max(score, 760);
      if (sequenceLower === trimmedSearchQuery) score = Math.max(score, 1100);
      else if (sequenceLower.startsWith(trimmedSearchQuery)) score = Math.max(score, 900);

      if (!score) return;
      const displayId = sequenceNumber || String(student.id);
      const classMeta = sectionLabel ? `${classLabel} - ${sectionLabel}` : classLabel;
      const studentMeta = `${classMeta} - ${rollNumber || `Roll ${displayId}`}`;

      scoredResults.push({
        type: 'student',
        id: `student-${student.id}`,
        title: studentName,
        subtitle: fatherName || classMeta,
        meta: studentMeta,
        imageUrl: student.picture_url,
        path: `/students/profile/${displayId}`,
        accent: '#3b82f6',
        status: student.status || null,
        score,
      });
    });

    return scoredResults
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ score, ...item }) => item);
  }, [searchClasses, searchSections, searchStudents, trimmedSearchQuery]);

  const employeeSearchResults = useMemo<SearchResultItem[]>(() => {
    if (!trimmedSearchQuery) return [];

    const scoredResults: Array<Extract<SearchResultItem, { type: 'employee' }> & { score: number }> = [];

    searchEmployees.forEach((employee) => {
      const name = employee.name || '';
      const role = employee.role || employee.designation || 'Staff member';
      const department = employee.department || '';
      const mobile = employee.mobile || '';
      const status = employee.status || '';
      const nameLower = name.toLowerCase();
      const roleLower = role.toLowerCase();
      const departmentLower = department.toLowerCase();
      const mobileLower = mobile.toLowerCase();
      const statusLower = status.toLowerCase();
      const idLower = String(employee.id).toLowerCase();
      let score = 0;

      if (nameLower.startsWith(trimmedSearchQuery)) score = Math.max(score, 950);
      else if (nameLower.includes(trimmedSearchQuery)) score = Math.max(score, 620);
      if (roleLower.includes(trimmedSearchQuery)) score = Math.max(score, 320);
      if (departmentLower.includes(trimmedSearchQuery)) score = Math.max(score, 280);
      if (mobileLower.includes(trimmedSearchQuery)) score = Math.max(score, 260);
      if (statusLower.includes(trimmedSearchQuery)) score = Math.max(score, 180);
      if (idLower === trimmedSearchQuery) score = Math.max(score, 500);
      if (['staff', 'employee', 'employees'].includes(trimmedSearchQuery)) score = Math.max(score, 140);
      if (trimmedSearchQuery === 'teacher' && roleLower.includes('teacher')) score = Math.max(score, 220);

      if (!score) return;

      const subtitleParts = [role];
      if (department) subtitleParts.push(department);

      scoredResults.push({
        type: 'employee',
        id: `employee-${employee.id}`,
        title: name,
        subtitle: subtitleParts.join(' â€¢ '),
        meta: `${status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : 'Staff'}${mobile ? ` Â· ${mobile}` : ''}`,
        imageUrl: employee.picture_url,
        path: `/employees/profile/${employee.id}`,
        accent: '#10b981',
        score,
      });
    });

    return scoredResults
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ score, ...item }) => item);
  }, [searchEmployees, trimmedSearchQuery]);

  const pageSearchResults = useMemo<SearchResultItem[]>(() => {
    if (!trimmedSearchQuery) return [];

    const scoredResults: Array<Extract<SearchResultItem, { type: 'page' }> & { score: number }> = [];

    searchablePages.forEach((page) => {
      const titleLower = page.title.toLowerCase();
      const descriptionLower = page.description.toLowerCase();
      const categoryLower = page.category.toLowerCase();
      const pathLower = page.path.toLowerCase();
      let score = 0;

      if (titleLower.startsWith(trimmedSearchQuery)) score = Math.max(score, 900);
      else if (titleLower.includes(trimmedSearchQuery)) score = Math.max(score, 560);
      if (descriptionLower.includes(trimmedSearchQuery)) score = Math.max(score, 260);
      if (categoryLower.includes(trimmedSearchQuery)) score = Math.max(score, 220);
      if (pathLower.includes(trimmedSearchQuery)) score = Math.max(score, 140);

      if (!score) return;

      scoredResults.push({
        type: 'page',
        id: page.id,
        title: page.title,
        subtitle: page.description,
        meta: page.category,
        path: page.path,
        accent: page.color || '#6366f1',
        score,
      });
    });

    return scoredResults
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(({ score, ...item }) => item);
  }, [searchablePages, trimmedSearchQuery]);

  const groupedSearchResults = useMemo(() => {
    const groups: Array<{ label: string; items: SearchResultItem[] }> = [];

    if (studentSearchResults.length > 0) {
      groups.push({ label: 'Students', items: studentSearchResults });
    }
    if (employeeSearchResults.length > 0) {
      groups.push({ label: 'Staff', items: employeeSearchResults });
    }
    if (pageSearchResults.length > 0) {
      groups.push({ label: 'Pages', items: pageSearchResults });
    }

    return groups;
  }, [employeeSearchResults, pageSearchResults, studentSearchResults]);

  const flattenedSearchResults = useMemo(
    () => groupedSearchResults.flatMap((group) => group.items),
    [groupedSearchResults]
  );

  useEffect(() => {
    setActiveSearchIndex(-1);
  }, [trimmedSearchQuery, groupedSearchResults]);

  useEffect(() => {
    if (activeSearchIndex >= 0 && searchItemRefs.current[activeSearchIndex]) {
      searchItemRefs.current[activeSearchIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeSearchIndex]);

  const handleSearchResultSelect = useCallback((item: SearchResultItem) => {
    setSearchOpen(false);
    setSearchQuery('');
    setActiveSearchIndex(-1);
    navigate(item.path, { replace: false });
  }, [navigate]);

  const openGlobalSearch = useCallback(() => {
    setSearchOpen(true);
    requestAnimationFrame(() => {
      globalSearchInputRef.current?.focus();
    });
  }, []);

  const handleGlobalSearchKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setSearchOpen(false);
      return;
    }

    if (!flattenedSearchResults.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      setSearchOpen(true);
      setActiveSearchIndex((prev) => {
        if (prev < 0) return 0;
        return Math.min(prev + 1, flattenedSearchResults.length - 1);
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      setSearchOpen(true);
      setActiveSearchIndex((prev) => {
        if (prev < 0) return flattenedSearchResults.length - 1;
        return Math.max(prev - 1, 0);
      });
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      const target = flattenedSearchResults[activeSearchIndex >= 0 ? activeSearchIndex : 0];
      if (target) {
        handleSearchResultSelect(target);
      }
      return;
    }

    if (event.key === 'Tab' && activeSearchIndex >= 0 && flattenedSearchResults[activeSearchIndex]) {
      event.preventDefault();
      handleSearchResultSelect(flattenedSearchResults[activeSearchIndex]);
    }
  }, [activeSearchIndex, flattenedSearchResults, handleSearchResultSelect]);

  const toggleMobileMenu = (menuLabel: string) => {
    setMobileOpenMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuLabel)) {
        newSet.delete(menuLabel);
      } else {
        newSet.add(menuLabel);
      }
      return newSet;
    });
  };

  const handleMobileMenuItemClick = useCallback((path: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setMobileSidebarOpen(false);
    setMobileOpenMenus(new Set());
    navigate(path, { replace: false });
  }, [navigate]);

  return (
    <>
      {!isRestrictedRole && (
        <>
          <MobileSidebarBackdrop
            $isOpen={mobileSidebarOpen}
            onClick={() => {
              setMobileSidebarOpen(false);
              setMobileOpenMenus(new Set());
            }}
          />
          <MobileSidebar $isOpen={mobileSidebarOpen}>
            <MobileSidebarHeader>
              <MobileSidebarTitle>Menu</MobileSidebarTitle>
              <MobileSidebarCloseButton
                onClick={() => {
                  setMobileSidebarOpen(false);
                  setMobileOpenMenus(new Set());
                }}
              >
                <CloseIcon />
              </MobileSidebarCloseButton>
            </MobileSidebarHeader>
            <MobileMenuSection>
              {filterMenuItems.map((item) => {
                const isOpen = mobileOpenMenus.has(item.label);
                return (
                  <React.Fragment key={item.path}>
                    <MobileMenuItem
                      $hasSubmenu={item.hasDropdown}
                      onClick={() => {
                        if (item.hasDropdown) {
                          toggleMobileMenu(item.label);
                        } else {
                          handleMobileMenuItemClick(item.path);
                        }
                      }}
                    >
                      <span className="menu-icon" style={{ color: 'inherit' }}>{item.icon}</span>
                      <span className="menu-label" style={{ color: 'inherit' }}>{item.label}</span>
                      {item.label === 'Communication' && (() => {
                        const totalUnread = unreadCounts.leaveRequests + unreadCounts.complaints + unreadCounts.suggestions;
                        return totalUnread > 0 ? (
                          <Badge style={{ marginLeft: 'auto', marginRight: item.hasDropdown ? '8px' : '0' }}>
                            {totalUnread > 99 ? '99+' : totalUnread}
                          </Badge>
                        ) : null;
                      })()}
                      {item.hasDropdown && (
                        <ChevronRightIcon
                          className="menu-arrow"
                          style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                        />
                      )}
                    </MobileMenuItem>
                    {item.hasDropdown && (
                      <MobileSubmenu $isOpen={isOpen}>
                        {item.menuItems && Array.isArray(item.menuItems) && item.menuItems.length > 0 && (
                          (() => {
                            const firstItem = item.menuItems[0] as any;
                            return firstItem?.title && 'items' in firstItem && firstItem.items;
                          })() ? (
                            // Multi-column structure (Students, Employees, Finance, Academics, Communication)
                            item.menuItems
                              .filter((section: any) => {
                                // Only show section if it has visible items
                                const hasItems = section.items && section.items.length > 0;
                                const hasExpenseItems = section.expenseItems && section.expenseItems.length > 0;
                                return hasItems || hasExpenseItems;
                              })
                              .map((section: any, sectionIdx: number) => (
                                <React.Fragment key={sectionIdx}>
                                  <MobileMenuItem
                                    style={{
                                      padding: '8px 16px',
                                      fontWeight: 600,
                                      fontSize: '0.8rem',
                                      textTransform: 'uppercase',
                                      color: 'inherit',
                                      cursor: 'default',
                                      borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#e0e0e0'}`,
                                      marginTop: sectionIdx > 0 ? '8px' : '0'
                                    } as React.CSSProperties}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span className="menu-label">{section.title}</span>
                                  </MobileMenuItem>
                                  {section.items && section.items.map((menuItem: any, idx: number) => (
                                    <MobileSubmenuItem
                                      key={idx}
                                      onClick={(e) => handleMobileMenuItemClick(menuItem.path, e)}
                                      style={{ '--color': menuItem.color } as React.CSSProperties}
                                    >
                                      <div
                                        className="submenu-icon"
                                        style={{ background: `linear-gradient(135deg, ${menuItem.color} 0%, ${menuItem.color}dd 100%)` }}
                                      >
                                        {menuItem.icon}
                                      </div>
                                      <div className="submenu-content">
                                        <div className="submenu-title">{menuItem.title}</div>
                                        <div className="submenu-description">{menuItem.description}</div>
                                      </div>
                                      {menuItem.badgeCount !== undefined && menuItem.badgeCount > 0 && (
                                        <Badge style={{ marginLeft: 'auto', flexShrink: 0 }}>{menuItem.badgeCount > 99 ? '99+' : menuItem.badgeCount}</Badge>
                                      )}
                                    </MobileSubmenuItem>
                                  ))}
                                  {section.expenseItems && (
                                    <>
                                      {section.expenseItems.map((menuItem: any, idx: number) => (
                                        <MobileSubmenuItem
                                          key={`expense-${idx}`}
                                          onClick={() => handleMobileMenuItemClick(menuItem.path)}
                                          style={{ '--color': menuItem.color } as React.CSSProperties}
                                        >
                                          <div
                                            className="submenu-icon"
                                            style={{ background: `linear-gradient(135deg, ${menuItem.color} 0%, ${menuItem.color}dd 100%)` }}
                                          >
                                            {menuItem.icon}
                                          </div>
                                          <div className="submenu-content">
                                            <div className="submenu-title">{menuItem.title}</div>
                                            <div className="submenu-description">{menuItem.description}</div>
                                          </div>
                                          {menuItem.badgeCount !== undefined && menuItem.badgeCount > 0 && (
                                            <Badge style={{ marginLeft: 'auto', flexShrink: 0 }}>{menuItem.badgeCount > 99 ? '99+' : menuItem.badgeCount}</Badge>
                                          )}
                                        </MobileSubmenuItem>
                                      ))}
                                    </>
                                  )}
                                </React.Fragment>
                              ))
                          ) : (
                            // Single column structure (Settings)
                            (item.menuItems as any[]).map((menuItem: any, idx: number) => (
                              <MobileSubmenuItem
                                key={idx}
                                onClick={() => handleMobileMenuItemClick(menuItem.path)}
                                style={{ '--color': menuItem.color } as React.CSSProperties}
                              >
                                <div
                                  className="submenu-icon"
                                  style={{ background: `linear-gradient(135deg, ${menuItem.color} 0%, ${menuItem.color}dd 100%)` }}
                                >
                                  {menuItem.icon}
                                </div>
                                <div className="submenu-content">
                                  <div className="submenu-title">{menuItem.title}</div>
                                  <div className="submenu-description">{menuItem.description}</div>
                                </div>
                                {menuItem.badgeCount !== undefined && menuItem.badgeCount > 0 && (
                                  <Badge style={{ marginLeft: 'auto', flexShrink: 0 }}>{menuItem.badgeCount > 99 ? '99+' : menuItem.badgeCount}</Badge>
                                )}
                              </MobileSubmenuItem>
                            ))
                          )
                        )}
                      </MobileSubmenu>
                    )}
                  </React.Fragment>
                );
              })}
            </MobileMenuSection>
          </MobileSidebar>
        </>
      )}
      <HeaderStyled $hasSidebar={false}>
        <HeaderLeft>
          {!isRestrictedRole && (
            <HamburgerButton
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open menu"
            >
              <MenuIcon />
            </HamburgerButton>
          )}
            <AppLogo
              type="button"
              onClick={handleLogoClick}
              title={isRestrictedRole ? 'Go to Home' : 'Go to Dashboard'}
            >
            {instituteProfile?.logo_url ? (
              <img src={instituteProfile.logo_url} alt="App Logo" />
            ) : (
              <SchoolIcon />
            )}
          </AppLogo>
          {!isRestrictedRole && permissionsLoaded && (
            <NavMenu>
              {filterMenuItems.map((item) => {
                const isStudents = item.label === 'Students';
                const isEmployees = item.label === 'Employees';
                const isAttendance = item.label === 'Attendance';

                const getMenuState = () => {
                  if (isStudents) return { open: studentMenuOpen, setOpen: setStudentMenuOpen, ref: studentMenuRef, buttonRef: studentButtonRef, dropdownRef: studentDropdownRef };
                  if (isEmployees) return { open: employeeMenuOpen, setOpen: setEmployeeMenuOpen, ref: employeeMenuRef, buttonRef: employeeButtonRef, dropdownRef: employeeDropdownRef };
                  if (isAttendance) return { open: attendanceMenuOpen, setOpen: setAttendanceMenuOpen, ref: attendanceMenuRef, buttonRef: attendanceButtonRef, dropdownRef: attendanceDropdownRef };
                  if (item.label === 'Finance') return { open: financeMenuOpen, setOpen: setFinanceMenuOpen, ref: financeMenuRef, buttonRef: financeButtonRef, dropdownRef: financeDropdownRef };
                  if (item.label === 'Accounts') return { open: accountsMenuOpen, setOpen: setAccountsMenuOpen, ref: accountsMenuRef, buttonRef: accountsButtonRef, dropdownRef: accountsDropdownRef };
                  if (item.label === 'Communication') return { open: communicationMenuOpen, setOpen: setCommunicationMenuOpen, ref: communicationMenuRef, buttonRef: communicationButtonRef, dropdownRef: communicationDropdownRef };
                  if (item.label === 'Academics') return { open: academicsMenuOpen, setOpen: setAcademicsMenuOpen, ref: academicsMenuRef, buttonRef: academicsButtonRef, dropdownRef: academicsDropdownRef };
                  if (item.label === 'Settings') return { open: settingsMenuOpen, setOpen: setSettingsMenuOpen, ref: settingsMenuRef, buttonRef: settingsButtonRef, dropdownRef: settingsDropdownRef };
                  if (item.label === 'Miscellaneous') return { open: miscMenuOpen, setOpen: setMiscMenuOpen, ref: miscMenuRef, buttonRef: miscButtonRef, dropdownRef: miscDropdownRef };
                  return null;
                };

                const menuState = item.hasDropdown ? getMenuState() : null;

                if (item.hasDropdown) {
                  return (
                    <MenuWrapper
                      key={item.path}
                      ref={menuState?.ref}
                      onMouseEnter={() => {
                        // Close all other menus first
                        if (!isStudents && studentMenuOpen) setStudentMenuOpen(false);
                        if (!isEmployees && employeeMenuOpen) setEmployeeMenuOpen(false);
                        if (!isAttendance && attendanceMenuOpen) setAttendanceMenuOpen(false);
                        if (item.label !== 'Finance' && financeMenuOpen) setFinanceMenuOpen(false);
                        if (item.label !== 'Accounts' && accountsMenuOpen) setAccountsMenuOpen(false);
                        if (item.label !== 'Communication' && communicationMenuOpen) setCommunicationMenuOpen(false);
                        if (item.label !== 'Academics' && academicsMenuOpen) setAcademicsMenuOpen(false);
                        if (item.label !== 'Settings' && settingsMenuOpen) setSettingsMenuOpen(false);
                        if (item.label !== 'Miscellaneous' && miscMenuOpen) setMiscMenuOpen(false);

                        // Clear any pending close timeout for this menu
                        if (menuLeaveTimeoutRef.current[item.path]) {
                          clearTimeout(menuLeaveTimeoutRef.current[item.path]!);
                          menuLeaveTimeoutRef.current[item.path] = null;
                        }

                        // Clear all other menu timeouts
                        Object.keys(menuLeaveTimeoutRef.current).forEach(key => {
                          if (key !== item.path && menuLeaveTimeoutRef.current[key]) {
                            clearTimeout(menuLeaveTimeoutRef.current[key]!);
                            menuLeaveTimeoutRef.current[key] = null;
                          }
                        });

                        menuState?.setOpen(true);
                        // Update position immediately with viewport boundary checks
                        setTimeout(() => {
                          if (menuState?.buttonRef.current && menuState?.dropdownRef.current) {
                            const buttonRect = menuState.buttonRef.current.getBoundingClientRect();
                            const dropdown = menuState.dropdownRef.current;
                            const viewportWidth = window.innerWidth;
                            const viewportHeight = window.innerHeight;
                            const padding = 8; // Padding from viewport edges

                            // Get dropdown dimensions - use offsetWidth/offsetHeight as fallback
                            const dropdownRect = dropdown.getBoundingClientRect();
                            const dropdownWidth = dropdownRect.width || dropdown.offsetWidth || 0;
                            const dropdownHeight = dropdownRect.height || dropdown.offsetHeight || 0;

                            // If dimensions are still 0, set initial position and adjust on next frame
                            if (dropdownWidth === 0 || dropdownHeight === 0) {
                              dropdown.style.top = `${buttonRect.bottom + 4}px`;
                              dropdown.style.left = `${buttonRect.left}px`;
                              // Schedule another update after render
                              requestAnimationFrame(() => {
                                updateDropdownPositions();
                              });
                              return;
                            }

                            let top = buttonRect.bottom + 4;
                            let left = buttonRect.left;

                            // Check if dropdown would overflow bottom edge
                            if (top + dropdownHeight > viewportHeight - padding) {
                              // Try positioning above the button
                              const spaceAbove = buttonRect.top;
                              const spaceBelow = viewportHeight - buttonRect.bottom;

                              if (spaceAbove > spaceBelow && spaceAbove >= dropdownHeight) {
                                // Position above button if there's more space above
                                top = buttonRect.top - dropdownHeight - 4;
                              } else {
                                // Otherwise, position at bottom of viewport with padding
                                top = viewportHeight - dropdownHeight - padding;
                              }
                            }

                            // Check if dropdown would overflow right edge
                            if (left + dropdownWidth > viewportWidth - padding) {
                              // Align to right edge of viewport with padding
                              left = viewportWidth - dropdownWidth - padding;
                            }

                            // Check if dropdown would overflow left edge
                            if (left < padding) {
                              left = padding;
                            }

                            dropdown.style.top = `${top}px`;
                            dropdown.style.left = `${left}px`;
                          }
                        }, 0);
                      }}
                      onMouseLeave={() => {
                        // Add a small delay before closing to allow moving to dropdown
                        menuLeaveTimeoutRef.current[item.path] = setTimeout(() => {
                          menuState?.setOpen(false);
                          menuLeaveTimeoutRef.current[item.path] = null;
                        }, 100);
                      }}
                    >
                      <NavMenuItem
                        ref={menuState?.buttonRef}
                        $hasDropdown={true}
                        aria-label={item.label}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                        {item.label === 'Communication' && (() => {
                          const totalUnread = unreadCounts.leaveRequests + unreadCounts.complaints + unreadCounts.suggestions;
                          return totalUnread > 0 ? (
                            <Badge style={{ marginLeft: '6px' }}>{totalUnread > 99 ? '99+' : totalUnread}</Badge>
                          ) : null;
                        })()}
                      </NavMenuItem>
                      <MenuDropdown
                        ref={menuState?.dropdownRef}
                        $isOpen={menuState?.open || false}
                        $columns={item.columns}
                        $actualColumns={item.label === 'Finance' ? 3 : (item.menuItems?.length || 0)}
                        onMouseEnter={() => {
                          // Clear any pending close timeout when mouse enters dropdown
                          if (menuLeaveTimeoutRef.current[item.path]) {
                            clearTimeout(menuLeaveTimeoutRef.current[item.path]!);
                            menuLeaveTimeoutRef.current[item.path] = null;
                          }
                        }}
                        onMouseLeave={() => {
                          // Close when mouse leaves dropdown
                          menuState?.setOpen(false);
                        }}
                      >
                        {item.label === 'Finance' ? (
                          // Finance has 3 columns: Fee Management, Fee Record, Expense Management + Fine Management (same column)
                          item.menuItems?.map((section: any, sectionIdx: number) => {
                            // For Finance menu, combine Expense Management and Fine Management in the same column (3rd column)
                            const isExpenseManagement = section.title === 'Expense Management';
                            const isFineManagement = section.title === 'Fine Management';

                            // Skip rendering Fine Management as separate column, it will be rendered with Expense Management
                            if (isFineManagement && sectionIdx === 3) {
                              return null;
                            }

                            // If this is Expense Management, render both Expense and Fine sections together
                            if (isExpenseManagement) {
                              const fineSection = item.menuItems?.find((s: any) => s.title === 'Fine Management');
                              return (
                                <DropdownColumn key={sectionIdx}>
                                  <ColumnTitle>{section.title}</ColumnTitle>
                                  {section.items.map((menuItem: any, idx: number) => (
                                    <DropdownMenuItem
                                      key={idx}
                                      $color={menuItem.color}
                                      onClick={() => {
                                        navigate(menuItem.path);
                                        menuState?.setOpen(false);
                                      }}
                                    >
                                      <div className="menu-icon">{menuItem.icon}</div>
                                      <div className="menu-content">
                                        <div className="menu-title">{menuItem.title}</div>
                                        <div className="menu-description">{menuItem.description}</div>
                                      </div>
                                    </DropdownMenuItem>
                                  ))}
                                  {fineSection && (
                                    <>
                                      <ColumnSeparator />
                                      <ColumnTitle>{fineSection.title}</ColumnTitle>
                                      {fineSection.items.map((menuItem: any, idx: number) => (
                                        <DropdownMenuItem
                                          key={idx}
                                          $color={menuItem.color}
                                          onClick={() => {
                                            navigate(menuItem.path);
                                            menuState?.setOpen(false);
                                          }}
                                        >
                                          <div className="menu-icon">{menuItem.icon}</div>
                                          <div className="menu-content">
                                            <div className="menu-title">{menuItem.title}</div>
                                            <div className="menu-description">{menuItem.description}</div>
                                          </div>
                                        </DropdownMenuItem>
                                      ))}
                                    </>
                                  )}
                                </DropdownColumn>
                              );
                            }

                            // Render other sections normally
                            return (
                              <DropdownColumn key={sectionIdx}>
                                <ColumnTitle>{section.title}</ColumnTitle>
                                {section.items.map((menuItem: any, idx: number) => {
                                  // Add separator before Payroll in Fee Record section
                                  const isFeeRecordSection = section.title === 'Fee Record';
                                  const isPayrollItem = menuItem.path === '/payroll';
                                  // Check if previous item is not Payroll (to add separator before first Payroll item)
                                  const prevItem = idx > 0 ? section.items[idx - 1] : null;
                                  const isFirstPayrollItem = isFeeRecordSection && isPayrollItem && prevItem && prevItem.path !== '/payroll';

                                  return (
                                    <React.Fragment key={idx}>
                                      {isFirstPayrollItem && <ColumnSeparator />}
                                      <DropdownMenuItem
                                        $color={menuItem.color}
                                        onClick={() => {
                                          navigate(menuItem.path);
                                          menuState?.setOpen(false);
                                        }}
                                      >
                                        <div className="menu-icon">{menuItem.icon}</div>
                                        <div className="menu-content">
                                          <div className="menu-title">{menuItem.title}</div>
                                          <div className="menu-description">{menuItem.description}</div>
                                        </div>
                                      </DropdownMenuItem>
                                    </React.Fragment>
                                  );
                                })}
                              </DropdownColumn>
                            );
                          })
                        ) : isStudents || isEmployees || isAttendance || item.label === 'Academics' || item.label === 'Communication' || item.label === 'Settings' || item.label === 'Accounts' ? (
                          // Students, Employees, and Academics have 3 columns, Communication, Settings, and Accounts have 2 columns - all with titles
                          item.menuItems?.map((section: any, sectionIdx: number) => (
                            <DropdownColumn key={sectionIdx}>
                              <ColumnTitle>{section.title}</ColumnTitle>
                              {section.items.map((menuItem: any, idx: number) => {
                                // Add separator before Reports items in Students and Employees menus
                                const isEmployeeReports = isEmployees && sectionIdx === 1 && menuItem.path === '/reports/employee-reports';
                                // Add separator before Teacher Subject Assignment in Employee Management section
                                const isTeacherSubject = isEmployees && sectionIdx === 0 && menuItem.path === '/teacher-subjects';
                                const isAttendanceOtherBreak = isAttendance && section.title === 'Other' && menuItem.path === '/settings/holidays';
                                const shouldShowSeparator = !!menuItem.separatorBefore || isEmployeeReports || isTeacherSubject || isAttendanceOtherBreak;
                                return (
                                  <React.Fragment key={idx}>
                                    {shouldShowSeparator && <ColumnSeparator />}
                                    <DropdownMenuItem
                                      $color={menuItem.color}
                                      onClick={() => {
                                        navigate(menuItem.path);
                                        menuState?.setOpen(false);
                                      }}
                                    >
                                      <div className="menu-icon">{menuItem.icon}</div>
                                      <div className="menu-content">
                                        <div className="menu-title">{menuItem.title}</div>
                                        <div className="menu-description">{menuItem.description}</div>
                                      </div>
                                      {menuItem.badgeCount !== undefined && menuItem.badgeCount > 0 && (
                                        <Badge>{menuItem.badgeCount > 99 ? '99+' : menuItem.badgeCount}</Badge>
                                      )}
                                    </DropdownMenuItem>
                                  </React.Fragment>
                                );
                              })}
                            </DropdownColumn>
                          ))
                        ) : (
                          // Single column fallback (Settings)
                          <DropdownColumn style={{ gridColumn: `1 / -1` }}>
                            {(() => {
                              const firstItem = item.menuItems && Array.isArray(item.menuItems) && item.menuItems.length > 0 ? item.menuItems[0] : null;
                              const hasSectionStructure = firstItem && typeof firstItem === 'object' && 'items' in firstItem && Array.isArray((firstItem as any).items);

                              if (hasSectionStructure) {
                                // If menuItems is array of sections, render items from first section
                                return (firstItem as any).items.map((menuItem: any, idx: number) => (
                                  <DropdownMenuItem
                                    key={idx}
                                    $color={menuItem.color}
                                    onClick={() => {
                                      navigate(menuItem.path);
                                      menuState?.setOpen(false);
                                    }}
                                  >
                                    <div className="menu-icon">{menuItem.icon}</div>
                                    <div className="menu-content">
                                      <div className="menu-title">{menuItem.title}</div>
                                      <div className="menu-description">{menuItem.description}</div>
                                    </div>
                                  </DropdownMenuItem>
                                ));
                              } else {
                                // Direct array of menu items
                                return (item.menuItems as any[])?.map((menuItem: any, idx: number) => (
                                  <DropdownMenuItem
                                    key={idx}
                                    $color={menuItem.color}
                                    onClick={() => {
                                      navigate(menuItem.path);
                                      menuState?.setOpen(false);
                                    }}
                                  >
                                    <div className="menu-icon">{menuItem.icon}</div>
                                    <div className="menu-content">
                                      <div className="menu-title">{menuItem.title}</div>
                                      <div className="menu-description">{menuItem.description}</div>
                                    </div>
                                  </DropdownMenuItem>
                                ));
                              }
                            })()}
                          </DropdownColumn>
                        )}
                      </MenuDropdown>
                    </MenuWrapper>
                  );
                }
                return (
                  <NavMenuItem
                    key={item.path}
                    $isDashboard={false}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!item.hasDropdown) {
                        navigate(item.path, { replace: false });
                      }
                    }}
                    aria-label={item.label}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.label === 'Communication' && (() => {
                      const totalUnread = unreadCounts.leaveRequests + unreadCounts.complaints + unreadCounts.suggestions;
                      return totalUnread > 0 ? (
                        <Badge style={{ marginLeft: '6px' }}>{totalUnread > 99 ? '99+' : totalUnread}</Badge>
                      ) : null;
                    })()}
                  </NavMenuItem>
                );
              })}
            </NavMenu>
          )}
        </HeaderLeft>
        <HeaderActions>
          {!isRestrictedRole && permissionsLoaded && (
            <GlobalSearchWrapper ref={globalSearchRef} className={searchOpen ? 'is-open' : ''}>
              <GlobalSearchInputShell
                $open={searchOpen}
                onClick={() => {
                  if (!searchOpen) {
                    openGlobalSearch();
                  }
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (!searchOpen && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    openGlobalSearch();
                  }
                }}
                aria-label={searchOpen ? 'Search' : 'Open search'}
              >
                <GlobalSearchIcon>
                  <SearchIcon />
                </GlobalSearchIcon>
                {searchOpen && (
                  <GlobalSearchInput
                    ref={globalSearchInputRef}
                    type="text"
                    autoComplete="off"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onKeyDown={handleGlobalSearchKeyDown}
                    placeholder="Search students, staff, or pages"
                    aria-label="Global search"
                  />
                )}
              </GlobalSearchInputShell>
              {searchOpen && (
                <GlobalSearchDropdown>
                  {!trimmedSearchQuery ? (
                    <SearchEmptyState>
                      Start typing to jump to a student profile, staff profile, or any page you can access.
                    </SearchEmptyState>
                  ) : groupedSearchResults.length === 0 ? (
                    <SearchEmptyState>
                      No matches found for "{searchQuery.trim()}". Try a name, roll number, staff role, or page title.
                    </SearchEmptyState>
                  ) : (
                    (() => {
                      let runningIndex = -1;

                      return groupedSearchResults.map((group) => (
                        <SearchSection key={group.label}>
                          <SearchSectionLabel>{group.label}</SearchSectionLabel>
                          {group.items.map((item) => {
                            runningIndex += 1;
                            const resultIndex = runningIndex;
                            const isActive = resultIndex === activeSearchIndex;
                            const fallbackLabel = item.title
                              .split(' ')
                              .map((part) => part[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase();

                            return (
                              <SearchResultButton
                                key={item.id}
                                ref={(element) => { searchItemRefs.current[resultIndex] = element; }}
                                type="button"
                                $active={isActive}
                                $accent={item.accent}
                                onMouseEnter={() => setActiveSearchIndex(resultIndex)}
                                onClick={() => handleSearchResultSelect(item)}
                              >
                                <SearchResultAvatar $accent={item.accent}>
                                  {item.type !== 'page' && item.imageUrl ? (
                                    <img src={item.imageUrl} alt="" />
                                  ) : item.type === 'student' ? (
                                    <PeopleIcon style={{ fontSize: 22 }} />
                                  ) : item.type === 'employee' ? (
                                    <BadgeIcon style={{ fontSize: 22 }} />
                                  ) : (
                                    fallbackLabel
                                )}
                              </SearchResultAvatar>
                              <SearchResultText>
                                <SearchResultTitleRow>
                                  <SearchResultTitle>{item.title}</SearchResultTitle>
                                  {item.type === 'student' && item.status && (
                                    <SearchStatusBadge $status={item.status}>
                                      {item.status}
                                    </SearchStatusBadge>
                                  )}
                                </SearchResultTitleRow>
                                <SearchResultSubtitle>{item.subtitle}</SearchResultSubtitle>
                              </SearchResultText>
                                <SearchResultMeta>{item.meta}</SearchResultMeta>
                              </SearchResultButton>
                            );
                          })}
                        </SearchSection>
                      ));
                    })()
                  )}
                </GlobalSearchDropdown>
              )}
            </GlobalSearchWrapper>
          )}
          {(user || studentInfo || parentInfo) && <NotificationBell />}
          <HeaderIconCircle
            role="button"
            tabIndex={0}
            onClick={onRefresh}
            aria-label="Refresh page"
            style={{
              opacity: isDownloadActive ? 0.5 : 1,
              cursor: isDownloadActive ? 'not-allowed' : 'pointer',
              pointerEvents: isDownloadActive ? 'none' : 'auto'
            }}
            title={isDownloadActive ? 'Download in progress. Please wait before refreshing.' : 'Refresh page'}
          >
            <RefreshIcon />
          </HeaderIconCircle>
          <div style={{ position: 'relative' }}>
            <ProfileAvatarContainer
              role="button"
              tabIndex={0}
              ref={profileIconRef as any}
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              aria-label="Profile"
              $hasImage={!!(avatarUrl || parentInfo?.avatar_url) && !imageError}
            >
              {(avatarUrl || parentInfo?.avatar_url) && !imageError ? (
                <img
                  src={avatarUrl || parentInfo?.avatar_url || ''}
                  alt="avatar"
                  onError={() => setImageError(true)}
                  onLoad={() => setImageError(false)}
                />
              ) : (
                <UserIcon />
              )}
            </ProfileAvatarContainer>
            {profileMenuOpen && (
              <ProfileDropdown
                ref={profileDropdownRef}
                studentInfo={studentInfo}
                parentInfo={parentInfo}
                staffName={staffName}
                user={user}
                theme={theme}
                onToggleTheme={onToggleTheme}
                onOpenChangePassword={onOpenChangePassword}
                isWeb={isWeb}
                onCheckForUpdates={onCheckForUpdates}
                isCheckingUpdate={isCheckingUpdate}
                isDownloadActive={isDownloadActive}
                onAboutUsClick={onAboutUsClick}
                onLogout={onLogout}
                appVersion={appVersion}
              />
            )}
          </div>
          {!isWeb && <MacWindowControlsComponent />}
        </HeaderActions>
      </HeaderStyled>
    </>
  );
};

export default Header;

