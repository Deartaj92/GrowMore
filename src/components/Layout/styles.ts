import styled, { css } from 'styled-components';
import { FONT, lightTheme } from './constants';

// ==========================================
// LAYOUT COMPONENTS
// ==========================================
export const AppContainer = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  background: ${props => props.theme.BG};
  display: flex;
  flex-direction: column;
  
  @media (max-width: 700px) {
    height: 100dvh; /* Dynamic viewport height for mobile browsers */
  }
`;

export const LayoutWrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  font-family: ${FONT};
  color: ${props => props.theme.TEXT_PRIMARY};
  background: ${props => props.theme.BG};
  flex: 1;
  min-height: 0; /* Critical for flex children */
`;

export const MainArea = styled.div<{ $isTeacher?: boolean }>`
  position: relative;
  margin-left: ${props => props.$isTeacher ? '0' : '54px'};
  margin-top: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: ${props => props.theme.BG};
  
  @media (max-width: 700px) {
    margin-left: 0;
    margin-top: 0;
  }
`;

export const ContentArea = styled.main`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: ${props => props.theme.BG};
  padding: 0;
  -webkit-overflow-scrolling: touch;
`;

export const Overlay = styled.div<{ open: boolean }>`
  display: ${({ open }) => open ? 'block' : 'none'};
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.32);
  z-index: 2100;
  @media (min-width: 701px) {
    display: none;
  }
`;

// ==========================================
// HEADER COMPONENTS
// ==========================================
export const Header = styled.header<{ $hasSidebar?: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 48px;
  -webkit-app-region: drag;
  
  background: ${props => props.theme.CARD};

  border-bottom: 1.5px solid ${({ theme }) => theme.BORDER};
  box-shadow: 0 4px 12px 0 #0002;
  
  @media (max-width: 700px) {
    height: 48px;
    padding: 0 12px;
  }
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  margin-right: 16px;
  
  @media (max-width: 700px) {
    gap: 6px;
    max-width: calc(100% - 100px);
    flex: 0 1 auto;
    margin-right: 0;
  }
`;

export const MenuButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.TEXT_PRIMARY};
  font-size: 1.4rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 2px;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
`;

export const PageTitle = styled.h1<{ isMobile: boolean; $isOverflowing?: boolean }>`
  font-weight: 700;
  font-size: ${({ isMobile }) => isMobile ? 'clamp(0.75rem, 3vw, 0.95rem)' : '0.95rem'};
  color: ${props => props.theme.TEXT_PRIMARY};
  margin: 0;
  padding: 0;
  min-width: 0;
  flex: ${({ isMobile }) => isMobile ? '2' : '1'};
  line-height: 1.2;
  transition: font-size 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @media (min-width: 701px) {
    padding-left: 12px;
  }
`;

export const Logo = styled.div`
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  font-weight: 700;
  color: ${props => props.theme.TEXT_PRIMARY};
  letter-spacing: 1px;
  gap: 8px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

export const LogoContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

export const LogoName = styled.div`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${props => props.theme.TEXT_PRIMARY};
  letter-spacing: 1px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

export const LogoTagline = styled.div`
  font-size: 0.65rem;
  font-weight: 400;
  color: ${props => props.theme.TEXT_SECONDARY};
  letter-spacing: 0.5px;
  line-height: 1.2;
`;

export const InstituteLogo = styled.img`
  width: 26px;
  height: 26px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid ${props => props.theme.BORDER};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
  margin-left: auto;
  
  @media (max-width: 700px) {
    gap: 6px;
    min-width: auto;
    justify-content: flex-end;
  }
`;

export const NavigationButtonsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  
  @media (max-width: 700px) {
    display: none;
  }
`;

export const HeaderIconCircle = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.theme.BG === '#252525' || props.theme.BG === '#181c2a'
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(255, 255, 255, 0.45)'};
  color: ${props => props.theme.TEXT_SECONDARY};
  font-size: 0.95rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
  border: 1px solid ${props => props.theme.BG === '#252525' || props.theme.BG === '#181c2a'
    ? 'rgba(255, 255, 255, 0.06)'
    : 'rgba(255, 255, 255, 0.5)'};
  
  &:hover {
    background: ${props => props.theme.BG === '#252525' || props.theme.BG === '#181c2a'
    ? 'rgba(255, 255, 255, 0.12)'
    : 'rgba(255, 255, 255, 0.65)'};
    color: ${props => props.theme.ACCENT};
    transform: scale(1.08);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  @media (max-width: 700px) {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }

  svg {
    width: 18px;
    height: 18px;
    @media (max-width: 700px) {
      width: 18px;
      height: 18px;
    }
  }
`;

export const MacWindowControls = styled.div`
  display: flex;
  gap: 8px;
  height: 100%;
  align-items: center;
  -webkit-app-region: no-drag;
  margin-left: 12px;
  padding: 0 4px;
  
  @media (max-width: 700px) {
    display: none;
  }
`;

export const MacButton = styled.button<{ color: string }>`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: ${({ color }) => color};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s ease;
  opacity: 0.8;
  
  &:hover {
    opacity: 1;
  }
  
  &:active {
    opacity: 0.7;
  }

  svg {
    width: 10px;
    height: 10px;
    color: #000;
    opacity: 0;
    transition: opacity 0.2s ease;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  &:hover svg {
    opacity: 0.8;
  }
`;

export const WeakConnectionIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: #f59e0b;
  color: white;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  flex-shrink: 0;

  @media (max-width: 700px) {
    padding: 4px 8px;
    margin-right: 0;
    
    svg {
      width: 18px;
      height: 18px;
    }
  }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
  }
`;

// ==========================================
// STUDENT SEARCH COMPONENTS
// ==========================================
export const StudentSearchWrapper = styled.div<{ $expanded: boolean }>`
  position: relative;
  width: ${props => props.$expanded ? '240px' : '30px'};
  height: 30px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  @media (max-width: 700px) {
    width: ${props => props.$expanded ? '180px' : '30px'};
  }
`;

export const StudentSearchInput = styled.div<{ $expanded: boolean }>`
  position: absolute;
  width: 100%;
  height: 30px;
  display: flex;
  align-items: center;
  border-radius: ${props => props.$expanded ? '8px' : '50%'};
  background: ${props => props.theme.FIELD_BG || props.theme.CARD};
  border: 1.2px solid ${props => props.$expanded ? props.theme.FIELD_BORDER : props.theme.BORDER};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: visible;
  cursor: ${props => props.$expanded ? 'text' : 'pointer'};
  -webkit-app-region: no-drag;
  padding: ${props => props.$expanded ? '0 12px' : '0'};
  
  &:hover {
    border-color: ${props => props.theme.ACCENT};
    background: ${props => props.theme.HOVER_BG || props.theme.FIELD_BG || props.theme.CARD};
  }
  
  &:focus-within {
    border-color: ${props => props.theme.ACCENT};
  }
  
  .search-icon {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: ${props => props.theme.TEXT_SECONDARY};
    transition: all 0.3s ease;
    opacity: ${props => props.$expanded ? '0' : '1'};
    transform: ${props => props.$expanded ? 'scale(0)' : 'scale(1)'};
    pointer-events: ${props => props.$expanded ? 'none' : 'auto'};
    position: ${props => props.$expanded ? 'absolute' : 'relative'};
    left: ${props => props.$expanded ? '12px' : '0'};
    
    svg {
      width: 16px;
      height: 16px;
      color: #7c8597;
    }
  }
  
  .search-field {
    flex: 1;
    min-width: 0;
    opacity: ${props => props.$expanded ? '1' : '0'};
    pointer-events: ${props => props.$expanded ? 'auto' : 'none'};
    transition: opacity 0.2s ease 0.1s;
    position: relative;
    
    input {
      border: none;
      background: transparent;
      color: ${props => props.theme.TEXT_PRIMARY};
      font-size: 0.85rem;
      outline: none;
      width: 100%;
      padding: 0;
      margin-left: ${props => props.$expanded ? '8px' : '0'};
      
      &::placeholder {
        color: #7c8597;
      }
    }
  }
`;

export const StudentSuggestionList = styled.ul<{ $visible: boolean }>`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: ${props => props.theme.CARD};
  border: 1.5px solid ${props => props.theme.BORDER};
  border-radius: 0 0 12px 12px;
  box-shadow: 0 8px 32px #0003, 0 1.5px 6px #232a3b22;
  z-index: 1000;
  margin: 0;
  padding: 0.1rem 0;
  list-style: none;
  max-height: 260px;
  overflow-y: auto;
  display: ${props => props.$visible ? 'block' : 'none'};
  scrollbar-width: thin;
  scrollbar-color: ${props => props.theme.ACCENT}40 ${props => props.theme.BG};
  
  &::-webkit-scrollbar {
    width: 10px;
    background: ${props => props.theme.BG};
  }
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.ACCENT}80;
    border-radius: 6px;
  }
  &::-webkit-scrollbar-track {
    background: ${props => props.theme.BG};
    border-radius: 6px;
  }
  
  @media (max-width: 700px) {
    left: -12px;
    right: -12px;
    min-width: calc(100% + 24px);
    width: calc(100% + 24px);
    border-radius: 12px;
    margin-top: 4px;
  }
`;

export const StudentSuggestionItem = styled.li<{ $active: boolean }>`
  padding: 0.4rem 0.9rem 0.4rem 0.75rem;
  color: ${props => props.theme.TEXT_PRIMARY};
  background: ${props => props.$active ? props.theme.HOVER_BG : 'transparent'};
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  border-left: 3px solid ${props => props.$active ? props.theme.ACCENT : 'transparent'};
  transition: background 0.16s, border-color 0.16s;
  
  &:hover {
    background: ${props => props.theme.HOVER_BG};
  }
  
  @media (max-width: 700px) {
    padding: 0.3rem 0.75rem 0.3rem 0.6rem;
    font-size: 0.8rem;
  }
`;

export const StudentSuggestionItemRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  width: 100%;
`;

export const StudentSuggestionMain = styled.div`
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
  
  @media (max-width: 700px) {
    gap: 0.5rem;
  }
`;

export const StudentSuggestionTextCol = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

export const StudentSuggestionAvatar = styled.div`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #232a3b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  color: #b0b8d1;
  overflow: hidden;
  border: 1.5px solid #353b4a;
  flex-shrink: 0;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  @media (max-width: 700px) {
    display: none;
  }
`;

export const StudentSuggestionName = styled.span`
  font-weight: 700;
  color: ${props => props.theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
  
  @media (max-width: 700px) {
    max-width: 220px;
    font-size: 0.8rem;
  }
`;

export const StudentSuggestionFather = styled.span`
  color: #7c8597;
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
  
  @media (max-width: 700px) {
    max-width: 220px;
    font-size: 0.75rem;
  }
`;

export const StudentSuggestionMetaCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 0;
  margin-left: 1.2rem;
`;

export const StudentSuggestionClass = styled.span`
  color: ${props => props.theme.ACCENT};
  font-size: 0.8rem;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90px;
  
  @media (max-width: 700px) {
    max-width: 120px;
    font-size: 0.75rem;
  }
`;

export const StudentSuggestionId = styled.span`
  color: #a0a7b8;
  font-size: 0.8rem;
  line-height: 1.1;
  white-space: nowrap;
  
  @media (max-width: 700px) {
    font-size: 0.75rem;
  }
`;

// ==========================================
// PROFILE DROPDOWN COMPONENTS
// ==========================================
export const ProfileDropdown = styled.div`
  position: absolute;
  right: 0;
  top: 110%;
  
  background: ${({ theme }) => theme.CARD};

  border: 1.5px solid ${({ theme }) => theme.BORDER};
  box-shadow: 0 8px 32px 0 #0003, 0 1.5px 6px #0005;
    
  border-radius: 14px;
  min-width: 210px;
  z-index: 100000; /* Higher than GlobalLoaderOverlay (99999) to ensure logout button works during loading */
  padding: 14px 0 8px 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const ProfileDropdownItem = styled.button`
  width: 100%;
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.05rem;
  font-weight: 500;
  padding: 10px 22px;
  text-align: left;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  &:hover {
    background: ${({ theme }) => theme.HOVER_BG};
    color: ${({ theme }) => theme.ACCENT};
  }
`;

export const ProfileDropdownHeader = styled.div`
  padding: 0 22px 8px 22px;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.98rem;
  font-weight: 600;
  border-bottom: 1.5px solid ${({ theme }) => theme.BORDER};
  margin-bottom: 6px;
`;

export const ProfileDropdownDivider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.BORDER};
  margin: 8px 0;
`;

export const ToggleSwitch = styled.div`
  position: relative;
  width: 36px;
  height: 18px;
  background: ${({ theme }) => theme.TEXT_SECONDARY}40;
  border-radius: 12px;
  padding: 2px;
  transition: all 0.3s;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;

  &[data-checked="true"] {
    background: ${({ theme }) => theme.ACCENT};
  }

  &::after {
    content: '';
    position: absolute;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    left: 2px;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &[data-checked="true"]::after {
    transform: translateX(18px);
  }
`;

// ==========================================
// MODAL COMPONENTS
// ==========================================
export const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.35);
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const ModalBox = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  padding: 2.2rem 2rem 1.7rem 2rem;
  min-width: 320px;
  max-width: 95vw;
  width: 100%;
  max-width: 400px;
  position: relative;
  border: 1.5px solid ${({ theme }) => theme.BORDER};
`;

export const ModalTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin-bottom: 1.1rem;
`;

export const ModalClose = styled.button`
  position: absolute;
  top: 0.7rem;
  right: 0.7rem;
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1.5rem;
  cursor: pointer;
`;

export const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  justify-content: flex-end;
`;

export const ModalButton = styled.button<{ color?: string }>`
  padding: 0.5rem 1.2rem;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  background: ${({ color, theme }) => color || theme.ACCENT};
  color: #fff;
  transition: background 0.18s;
  &:hover {
    background: ${({ color, theme }) => color ? color + 'cc' : theme.ACCENT + 'cc'};
  }
`;

export const ModalLabel = styled.label`
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 600;
  margin-bottom: 0.1rem;
`;

export const ModalInputGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 10px;
  padding: 0 12px;
  margin-bottom: 1rem;
  transition: border 0.18s;
  &:focus-within { border-color: ${({ theme }) => theme.ACCENT_INPUT}; }
`;

export const ModalInput = styled.input`
  border: none;
  background: none;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.08rem;
  padding: 13px 0;
  width: 100%;
  &:focus { outline: none; }
`;

export const ModalError = styled.div`
  color: #ef4444;
  font-size: 1rem;
  text-align: center;
  margin-top: 4px;
  background: ${({ theme }) => theme.CARD};
  border-radius: 8px;
  padding: 7px 0 5px 0;
`;

export const ModalSuccess = styled.div`
  color: #22c55e;
  font-size: 1rem;
  text-align: center;
  margin-top: 4px;
  background: ${({ theme }) => theme.CARD};
  border-radius: 8px;
  padding: 7px 0 5px 0;
`;

// ==========================================
// NETWORK COMPONENTS
// ==========================================
export const NetworkAlert = styled.div`
  position: fixed;
  top: 44px;
  left: 0;
  right: 0;
  background: #ef4444;
  color: white;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 500;
  z-index: 2000;
  animation: slideDown 0.3s ease-out;
  
  @keyframes slideDown {
    from { transform: translateY(-100%); }
    to { transform: translateY(0); }
  }
`;

export const NetworkModal = styled(ModalOverlay)`
  background: rgba(0, 0, 0, 0.75);
  z-index: 9999 !important;
`;

export const NetworkModalContent = styled(ModalBox)`
  text-align: center;
  padding: 2rem;
`;

export const NetworkIcon = styled.div`
  font-size: 3rem;
  color: #ef4444;
  margin-bottom: 1rem;
`;

export const NetworkTitle = styled.h2`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.5rem;
  margin-bottom: 1rem;
`;

export const NetworkMessage = styled.p`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-bottom: 2rem;
  line-height: 1.5;
`;

export const NetworkActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
`;

export const NetworkButton = styled(ModalButton) <{ variant?: 'primary' | 'danger' }>`
  min-width: 120px;
  background: ${({ variant }) => variant === 'danger' ? '#ef4444' : '#4a6cf7'};
  &:hover {
    background: ${({ variant }) => variant === 'danger' ? '#dc2626' : '#3a5ce5'};
  }
`;

export const OfflineContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
  text-align: center;
  gap: 16px;
  color: ${props => props.theme.TEXT_SECONDARY};

  h1 {
    color: ${props => props.theme.TEXT_PRIMARY};
    margin: 0;
  }
`;

export const ActionButton = styled.button`
  background-color: ${props => props.theme.ACCENT};
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #3a5cc7;
  }

  &:disabled {
    background-color: #555;
    cursor: not-allowed;
  }
`;

// ==========================================
// ANNOUNCEMENT COMPONENTS
// ==========================================
const announcementQuillStyles = css`
  & h1, & h2, & h3, & h4, & h5, & h6 {
    margin: 8px 0 4px 0;
    font-weight: 600;
  }

  & p {
    margin: 6px 0;
  }

  & ul, & ol {
    margin: 6px 0 6px 1.2rem;
    padding-left: 1rem;
  }

  & li {
    margin: 2px 0;
  }

  & code {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'};
    padding: 2px 5px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.85em;
  }

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.18);
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.28);
  }

  .ql-editor {
    font-family: 'JameelNooriNastaleeq', 'Inter', 'Segoe UI', Arial, sans-serif;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }

  & strong, & b {
    font-weight: 600;
  }

  & em, & i {
    font-style: italic;
  }
`;

export const AnnouncementOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9500;
`;

export const AnnouncementBox = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 18px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.35);
  border: 1px solid ${({ theme }) => theme.BORDER};
  max-width: 380px;
  width: min(380px, calc(100vw - 32px));
  max-height: 80vh;
  height: min(500px, 80vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const AnnouncementHeader = styled.div`
  padding: 8px 16px 6px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
`;

export const AnnouncementTitle = styled.div`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  width: 100%;
  flex: 1;
  ${announcementQuillStyles}
`;

export const AnnouncementHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const AnnouncementIconButton = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
  &:hover {
    transform: translateY(-1px);
    background: ${({ theme }) => theme.BG};
  }
`;

export const AnnouncementBody = styled.div`
  padding: 14px 18px;
  flex: 1;
  overflow-y: auto;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  line-height: 1.5;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'};
  min-height: 220px;
  max-height: 360px;
  ${announcementQuillStyles}

  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => `${theme.TEXT_SECONDARY}66 ${theme.BG}`};

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525' ? '#383d4a' : '#edf1f7'};
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.TEXT_SECONDARY}66;
    border-radius: 999px;
    border: 1px solid ${({ theme }) => theme.BG};
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.35);
  }
`;

export const AnnouncementFooter = styled.div`
  padding: 10px 18px 12px 18px;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'};
  min-height: 44px;
  justify-content: center;
`;

export const AnnouncementFooterRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
`;

export const AnnouncementFooterHighlight = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  width: 100%;
  font-family: 'JameelNooriNastaleeq', 'Inter', 'Segoe UI', Arial, sans-serif;
  ${announcementQuillStyles}
`;

export const AnnouncementActions = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px 18px;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.CARD};
`;

export const AnnouncementActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 0.2s ease, background 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  ${({ theme, $variant }) => $variant === 'primary'
    ? css`
        background: ${theme.ACCENT};
        color: ${theme.BG};
        &:hover {
          transform: translateY(-1px);
          background: ${theme.ACCENT}cc;
        }
      `
    : css`
        background: ${theme.CARD};
        color: ${theme.TEXT_PRIMARY};
        border-color: ${theme.BORDER};
        &:hover {
          transform: translateY(-1px);
          background: ${theme.BG};
        }
      `}
`;

export const SeenByOverlay = styled(AnnouncementOverlay)`
  z-index: 9600;
`;

export const SeenByBox = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.35);
  border: 1px solid ${({ theme }) => theme.BORDER};
  width: min(420px, calc(100vw - 32px));
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const SeenByHeader = styled.div`
  padding: 14px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const SeenByTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

export const SeenByClose = styled(AnnouncementIconButton)`
  width: 32px;
  height: 32px;
`;

export const SeenByList = styled.div`
  padding: 14px 18px;
  flex: 1;
  overflow-y: scroll;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 260px;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => `${theme.ACCENT} ${theme.BG}`};

  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG};
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.ACCENT};
    border-radius: 999px;
    border: 2px solid ${({ theme }) => theme.BG};
  }
`;

export const SeenByItem = styled.div`
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'};
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const SeenByName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
`;

export const SeenByMeta = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`;

export const SeenByEmpty = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  padding: 24px 12px;
  font-size: 0.9rem;
`;

// ==========================================
// PROGRESS BAR COMPONENTS
// ==========================================
export const ProgressBarOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 2px;
  pointer-events: none;
  z-index: 100000;
`;

export const ProgressBar = styled.div<{
  progress: number;
  isVisible: boolean;
  isIndeterminate?: boolean;
  disableTransition?: boolean;
}>`
  height: 100%;
  background: linear-gradient(90deg, #4a6cf7, #6366f1, #8b5cf6);
  opacity: ${({ isVisible }) => isVisible ? 1 : 0};
  transition: opacity 0.3s ease-out;
  box-shadow: 0 2px 16px 0 rgba(74, 108, 247, 0.2);
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  ${({ isIndeterminate, progress, disableTransition }) =>
    isIndeterminate
      ? `
        width: 100%;
        animation: shimmer 1.5s infinite linear;
      `
      : `
        width: ${progress}%;
        transition: ${disableTransition ? 'none' : 'opacity 0.3s ease-out, width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'};
      `}

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

// ==========================================
// LOADING COMPONENTS
// ==========================================
export const PageLoader = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${props => props.theme.BG};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 5000;
  gap: 20px;
`;

export const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid ${props => props.theme.BORDER};
  border-top: 3px solid ${props => props.theme.ACCENT};
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export const LoadingText = styled.div`
  color: ${props => props.theme.TEXT_PRIMARY};
  font-size: 1.1rem;
  font-weight: 500;
`;

// ==========================================
// DASHBOARD CARD COMPONENTS (Legacy - can be removed if not used)
// ==========================================
export const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

export const DashboardCard = styled.div`
  background: ${props => props.theme.CARD};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${props => {
    // Check if theme object matches lightTheme structure
    const isLight = props.theme.BG === lightTheme.BG;
    return isLight ? '0 4px 24px 0 #e3e8f7' : props.theme.SHADOW;
  }};
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  border: 1px solid ${props => props.theme.BORDER};
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => {
    const isLight = props.theme.BG === lightTheme.BG;
    return isLight ? '0 8px 32px 0 #d0e2ff' : '0 8px 24px rgba(0, 0, 0, 0.2)';
  }};
  }
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

export const CardTitle = styled.h3`
  color: ${props => props.theme.TEXT_PRIMARY};
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
`;

export const CardIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.theme.ICON_BG};
  color: ${props => props.theme.ACCENT};
  font-size: 1.2rem;
  border: 1px solid ${props => props.theme.ACCENT}33;
`;

export const CardContent = styled.div`
  color: ${props => props.theme.TEXT_SECONDARY};
  font-size: 0.95rem;
  line-height: 1.5;
`;

export const CardValue = styled.div`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${props => props.theme.TEXT_PRIMARY};
  margin: 8px 0;
`;

export const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid ${props => props.theme.BORDER};
`;

export const CardStat = styled.div<{ positive?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${props => {
    if (props.positive) {
      const isLight = props.theme.BG === lightTheme.BG;
      return isLight ? '#2e7d32' : '#4caf50';
    }
    return props.theme.TEXT_SECONDARY;
  }};
  font-size: 0.9rem;
  font-weight: 500;
`;

