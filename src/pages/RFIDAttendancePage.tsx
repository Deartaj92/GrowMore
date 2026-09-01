import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styled, { keyframes, css } from 'styled-components';
import { UNSAFE_NavigationContext, useLocation, useNavigate } from 'react-router-dom';

// Add NDEFReader types for TypeScript
declare global {
    interface Window {
        NDEFReader: any;
        nfc?: any;
        util?: any;
    }
}
import { useTheme } from '../components/Layout/contexts/ThemeContext';
import { darkTheme, lightTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { supabase } from '../supabaseClient';
import { normalizeDesktopScannerUid, sanitizeRfidUid } from '../utils/rfidUtils';
import { getStudentDisplayId } from '../utils/studentUtils';
import { useAppInputLock } from '../contexts/AppInputLockContext';
import {
    CheckCircle,
    Cancel as XCircle,
    Warning as AlertCircle,
    AccessTime as Clock,
    PersonAddAlt1 as UserCheck,
    Nfc as Scan,
    Refresh as RefreshCw,
    Badge as BadgeCheck,
    CloudOff as CloudOffIcon,
    CloudSync as CloudSyncIcon,
    Settings as SettingsIcon,
    Save as SaveIcon,
  Nfc as NfcIcon,
    Logout as LogoutIcon,
    Bolt as BoltIcon,
    VolumeUp as Volume2,
    VolumeOff as VolumeX,
} from '@mui/icons-material';
import { CachedAttendanceHistoryItem, rfidOfflineService } from '../services/rfidOfflineService';
import {
    clayCardStyle,
    clayButtonStyle,
    clayInputStyle,
    clayInsetStyle,
    getDashboardPalette,
    getButtonPalette,
    getLayoutPalette,
    CARD_RADIUS_LG,
    CARD_RADIUS_MD,
} from '../styles/DesignSystem';

// ─── Animations ────────────────────────────────────────────────────────────────

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.4); }
  50%       { box-shadow: 0 0 0 18px rgba(59,130,246,0); }
`;

const popupSlide = keyframes`
  0% { opacity: 0; transform: scale(0.9) translateY(20px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
`;

const popupPulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
`;

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(-16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.9); }
  to   { opacity: 1; transform: scale(1); }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Styled Components ─────────────────────────────────────────────────────────

const Page = styled.div`
  width: 100%;
  min-height: calc(100vh - 72px);
  height: calc(100vh - 72px);
  background: ${({ theme }) => getLayoutPalette(theme).shellBg};
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  box-sizing: border-box;
  overflow: hidden;

  @media (max-width: 960px) {
    height: auto;
    min-height: calc(100vh - 72px);
    overflow: visible;
  }

  @media (max-width: 768px) { padding: 0.5rem; gap: 0.5rem; }
`;

const TopBar = styled.div`
  ${clayCardStyle}
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem 1rem;
  padding: 0.4rem 1.2rem;
  border-radius: 0 0 16px 16px;

  @media (max-width: 768px) {
    padding: 0.65rem 0.9rem;
    gap: 0.65rem;
    border-radius: 0;
  }
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => getDashboardPalette(theme).titleText};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;

  svg { 
    color: ${({ theme }) => theme.ACCENT}; 
    font-size: 20px !important;
  }

  @media (max-width: 768px) {
    font-size: 0.95rem;
  }
`;

const TopBarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
  flex-shrink: 0;

  @media (max-width: 768px) {
    gap: 0.5rem;
  }
`;

const TopBarLeading = styled.div`
  display: flex;
  align-items: center;
  gap: 0.85rem 1.1rem;
  flex-wrap: wrap;
  min-width: 0;
  flex: 1;
`;

const TopBarDateWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding-left: 0.85rem;
  margin-left: 0.15rem;
  border-left: 1px solid ${({ theme }) => theme.BORDER};

  @media (max-width: 640px) {
    width: 100%;
    padding-left: 0;
    margin-left: 0;
    border-left: none;
    border-top: 1px solid ${({ theme }) => theme.BORDER};
    padding-top: 0.5rem;
  }
`;

const TopBarDateLabel = styled.span`
  font-size: 0.72rem;
  font-weight: 800;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
`;

const StatusBadgeRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.55rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-start;
  }
`;

const DateAndSettingsRow = styled.div`
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  gap: 0.75rem;

  @media (max-width: 768px) {
    width: 100%;
    flex-direction: column;
    gap: 0.6rem;

    > button {
      width: 100%;
      justify-content: center;
    }
  }
`;

const OfflineBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  background: rgba(239, 68, 68, 0.14);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.26);
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  animation: ${pulse} 2s infinite;
`;

const SyncBadge = styled.div<{ $syncing?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  background: rgba(59, 130, 246, 0.14);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.26);
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover { background: rgba(59, 130, 246, 0.2); }
  svg { animation: ${({ $syncing }) => $syncing ? css`${keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`} 1s linear infinite` : 'none'}; }
`;


const SyncOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const SyncModal = styled.div`
  ${clayCardStyle}
  width: 100%;
  max-width: 450px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  text-align: center;
  animation: ${slideIn} 0.4s cubic-bezier(0.16, 1, 0.3, 1);
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: ${({ theme }) => theme.HOVER_BG};
  border-radius: 10px;
  overflow: hidden;
  position: relative;
`;

const ProgressFill = styled.div<{ $percent: number }>`
  height: 100%;
  background: ${({ theme }) => theme.ACCENT};
  width: ${({ $percent }) => $percent}%;
  transition: width 0.3s ease-out;
`;

const SyncSuccessIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  display: flex;
  align-items: center;
  justify-content: center;
  svg { font-size: 32px; }
`;

const CloseBtn = styled.button`
  ${clayButtonStyle}
  width: 100%;
  padding: 0.8rem;
  font-weight: 700;
  margin-top: 0.5rem;
`;

const FloatingFab = styled.button`
  position: fixed;
  bottom: 60px;
  @media (max-width: 600px) {
    bottom: 40px;
  }
  right: 20px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: #3b82f6;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 16px rgba(0,0,0,0.25);
  z-index: 9999;
  cursor: pointer;
`;

const ProminentDate = styled.div`
  ${clayInsetStyle}
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
  padding: 0.55rem 0.9rem;
  border-radius: ${CARD_RADIUS_LG};

  .date-day {
    font-size: 0.72rem;
    font-weight: 700;
    color: ${({ theme }) => getDashboardPalette(theme).subtleText};
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 2px;
  }

  .date-full {
    font-size: 1rem;
    font-weight: 800;
    color: ${({ theme }) => theme.ACCENT};
  }

  @media (max-width: 600px) {
    align-items: flex-start;
    text-align: left;
    margin-top: 0;
    width: 100%;
    box-sizing: border-box;
  }
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 0.75rem;
  flex: 1;
  min-height: 0;
  align-items: stretch;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    min-height: auto;
  }
`;

// ── Scanner Card ───────────────────────────────────────────────────────────────

const ScannerCard = styled.div`
  ${clayCardStyle}
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.85rem;
  min-height: 0;
  height: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 1rem;
    gap: 0.75rem;
  }
`;

const RfidHeroPanel = styled.div<{ $status: 'idle' | 'success' | 'error' }>`
  ${clayInsetStyle}
  width: 100%;
  min-height: 108px;
  border-radius: ${CARD_RADIUS_LG};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.35s, border-color 0.35s;
  background: ${({ $status }) =>
        $status === 'success' ? 'rgba(34,197,94,0.1)' :
            $status === 'error' ? 'rgba(239,68,68,0.1)' :
                'rgba(59,130,246,0.06)'};
  border: 1px solid ${({ theme, $status }) =>
        $status === 'success' ? 'rgba(34,197,94,0.35)' :
            $status === 'error' ? 'rgba(239,68,68,0.35)' :
                theme.BORDER};

  svg {
    color: ${({ $status }) =>
        $status === 'success' ? '#22c55e' :
            $status === 'error' ? '#ef4444' :
                '#3b82f6'};
    font-size: 52px !important;
  }

  @media (max-width: 768px) {
    min-height: 96px;
    svg { font-size: 44px !important; }
  }
`;

const scanLineSweep = keyframes`
  0% { transform: translateX(-42%); opacity: 0.35; }
  50% { opacity: 1; }
  100% { transform: translateX(42%); opacity: 0.35; }
`;

const ScanArea = styled(RfidHeroPanel)`
  position: relative;
  overflow: hidden;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
  min-height: 112px;
  width: 100%;
`;

const ScanLineBar = styled.div<{ $active: boolean }>`
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: 10px;
  height: 2px;
  border-radius: 99px;
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.55), transparent);
  opacity: ${({ $active }) => ($active ? 0.9 : 0)};
  pointer-events: none;
  transition: opacity 0.25s ease;
  ${({ $active }) =>
    $active
      ? css`
          animation: ${scanLineSweep} 1.55s ease-in-out infinite;
        `
      : css``};
`;

const ScannerUpper = styled.div`
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.55rem;
`;

const ScannerSummaryRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
  width: 100%;
  margin-top: auto;
`;

const ScannerSummaryChip = styled.div<{ $tone: 'ok' | 'bad' | 'warn' | 'info' }>`
  ${clayInsetStyle}
  border-radius: 14px;
  padding: 0.5rem 0.4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  min-width: 0;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ $tone }) =>
        $tone === 'ok' ? 'rgba(34,197,94,0.07)' :
            $tone === 'bad' ? 'rgba(239,68,68,0.07)' :
                $tone === 'warn' ? 'rgba(234,179,8,0.09)' :
                    'rgba(59,130,246,0.07)'};
`;

const ScannerSummaryNum = styled.span<{ $tone: 'ok' | 'bad' | 'warn' | 'info' }>`
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.1;
  color: ${({ $tone }) =>
        $tone === 'ok' ? '#22c55e' :
            $tone === 'bad' ? '#ef4444' :
                $tone === 'warn' ? '#ca8a04' :
                    '#3b82f6'};
`;

const ScannerSummaryLabel = styled.span`
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-align: center;
  line-height: 1.15;
`;

const HiddenInput = styled.input`
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
`;

const StatusText = styled.div<{ $status: 'idle' | 'success' | 'error' }>`
  font-size: 1.02rem;
  font-weight: 700;
  color: ${({ $status }) =>
        $status === 'success' ? '#22c55e' :
            $status === 'error' ? '#ef4444' :
                '#3b82f6'};
  text-align: center;
  min-height: 1.4rem;

  @media (max-width: 768px) {
    font-size: 0.95rem;
    min-height: 1.25rem;
  }
`;

const SubText = styled.div`
  font-size: 0.82rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-align: center;

  @media (max-width: 768px) {
    font-size: 0.76rem;
  }
`;

const DateSelect = styled.input`
  ${clayInputStyle}
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;
`;

const TopBarDateSelect = styled(DateSelect)`
  width: auto;
  min-width: 140px;
  max-width: 200px;
  padding: 0.35rem 0.55rem;
  font-size: 0.82rem;
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.6rem;
  width: 100%;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }
`;

const StatBox = styled.div<{ $color: string }>`
  ${clayInsetStyle}
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  border-radius: 14px;
`;

const StatNum = styled.div<{ $color: string }>`
  font-size: 1.15rem;
  font-weight: 800;
  color: ${({ $color }) => $color};
`;

const StatLabel = styled.div`
  font-size: 0.65rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: center;
`;

const FeedCard = styled.div`
  ${clayCardStyle}
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding: 0;
  overflow: hidden;
`;

const FeedHeader = styled.div`
  padding: 1rem 1.2rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 600px) {
    padding: 0.85rem;
  }
`;

const FeedTitle = styled.h2`
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: ${({ theme }) => getDashboardPalette(theme).titleText};
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg { color: ${({ theme }) => theme.ACCENT}; }
`;

const FeedHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;

  @media (max-width: 600px) {
    width: 100%;
    justify-content: flex-start;
  }
`;

const ClearBtn = styled.button`
  ${clayButtonStyle}
  padding: 0.45rem 0.85rem;
  font-size: 0.78rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.2);

  &:hover {
    background: rgba(239, 68, 68, 0.15);
  }
`;

const FeedSearch = styled.input`
  ${clayInputStyle}
  padding: 0.45rem 0.85rem;
  font-size: 0.82rem;
  width: 180px;

  @media (max-width: 600px) {
    flex: 1;
    width: auto;
  }
`;

const FeedSplitGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex: 1;
  min-height: 0;
  border-top: 1px solid ${({ theme }) => theme.BORDER};

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const FeedSection = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  &:first-child {
    border-right: 1px solid ${({ theme }) => theme.BORDER};
  }

  @media (max-width: 1200px) {
    &:first-child {
      border-right: none;
      border-bottom: 1px solid ${({ theme }) => theme.BORDER};
    }
  }
`;

const SectionHeader = styled.div<{ $mode: 'student' | 'employee' }>`
  padding: 0.65rem 1rem;
  background: ${({ theme }) => theme.FIELD_BG};
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
`;

const SectionHeaderStats = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
`;

const SectionHeaderBadge = styled.span<{ $variant?: 'present' | 'late'; $dimmed?: boolean }>`
  font-size: 0.66rem;
  font-weight: 800;
  padding: 3px 9px;
  border-radius: 999px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  opacity: ${({ $dimmed }) => ($dimmed ? 0.52 : 1)};
  ${({ $variant, theme }) =>
    $variant === 'late'
      ? css`
          background: rgba(245, 158, 11, 0.22);
          color: #b45309;
        `
      : css`
          background: ${theme.ACCENT}15;
          color: ${theme.ACCENT};
        `};
`;

const SectionBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BORDER};
    border-radius: 10px;
  }
`;

const FeedList = styled.div`
  display: flex;
  flex-direction: column;
`;

const FeedItem = styled.div<{ $type: 'success' | 'error' | 'warn'; $personType: 'student' | 'employee'; $new?: boolean; $attendanceStatus?: string }>`
  padding: 0.85rem 1.2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  animation: ${({ $new }) => $new ? css`${slideUp} 0.4s ease-out` : 'none'};
  background: ${({ $new, theme }) => $new ? theme.ACCENT + '08' : 'transparent'};
  transition: all 0.2s;

  &:hover { background: ${({ theme }) => theme.HOVER_BG}; }

  @media (max-width: 600px) {
    padding: 0.75rem 0.9rem;
    gap: 0.75rem;
  }
`;

const FeedIcon = styled.div<{ $type: 'success' | 'error' | 'warn'; $personType: 'student' | 'employee' }>`
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ $type, theme }) =>
        $type === 'success' ? 'rgba(34,197,94,0.12)' :
            $type === 'error' ? 'rgba(239,68,68,0.12)' :
                'rgba(245,158,11,0.12)'};
  color: ${({ $type }) =>
        $type === 'success' ? '#22c55e' :
            $type === 'error' ? '#ef4444' :
                '#f59e0b'};

  @media (max-width: 600px) {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    svg { font-size: 16px !important; }
  }
`;

const FeedInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const FeedName = styled.div`
  font-size: 0.92rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 600px) {
    font-size: 0.85rem;
  }
`;

const FeedFatherName = styled.span`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  font-size: 0.85rem;
  opacity: 0.8;
`;

const FeedSub = styled.div`
  font-size: 0.74rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 0.4rem;

  @media (max-width: 600px) {
    font-size: 0.7rem;
  }
`;

const FeedTime = styled.div`
  text-align: right;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
`;

const FeedAttendanceStatus = styled.div<{ $status: string }>`
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 4px;
  background: ${({ $status, theme }) =>
        $status === 'late' ? 'rgba(245,158,11,0.14)' :
            $status === 'checked_out' ? 'rgba(59,130,246,0.14)' :
                'rgba(34,197,94,0.14)'};
  color: ${({ $status }) =>
        $status === 'late' ? '#f59e0b' :
            $status === 'checked_out' ? '#3b82f6' :
                '#22c55e'};
`;

const FeedTimeLabel = styled.div`
  font-size: 0.72rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  opacity: 0.7;
`;

const EmptyFeed = styled.div`
  padding: 4rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  opacity: 0.5;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
`;

// ─── Modals ───────────────────────────────────────────────────────────────────

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${fadeIn} 0.2s ease;
  padding: 1rem;
  box-sizing: border-box;

  @media (max-width: 640px) {
    align-items: flex-end;
    padding: 0.5rem;
  }
`;

const ModalContent = styled.div`
  ${clayCardStyle}
  width: 90%;
  max-width: 820px;
  padding: 1rem 1.1rem;
  max-height: min(90vh, 860px);
  overflow-y: auto;
  box-sizing: border-box;

  @media (max-width: 900px) {
    width: min(94vw, 720px);
  }

  @media (max-width: 640px) {
    width: 100%;
    max-width: none;
    max-height: 88vh;
    padding: 0.85rem 0.85rem 1rem;
    border-radius: 18px 18px 12px 12px;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.8rem;
  padding-bottom: 0.65rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};

  @media (max-width: 640px) {
    margin-bottom: 0.7rem;
    padding-bottom: 0.55rem;
  }
`;

const ModalTitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;

  h2 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    font-size: 1.3rem;
  }

  p {
    margin: 0;
    font-size: 0.8rem;
    color: ${({ theme }) => getDashboardPalette(theme).subtleText};
  }

  @media (max-width: 640px) {
    h2 {
      font-size: 1.08rem;
    }

    p {
      font-size: 0.74rem;
    }
  }
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.7rem 0.85rem;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 0.6rem;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  min-width: 0;
`;

const WideFormGroup = styled(FormGroup)`
  grid-column: 1 / -1;
`;

const InputHint = styled.span`
  font-size: 0.74rem;
  line-height: 1.3;
  color: ${({ theme }) => getDashboardPalette(theme).subtleText};
`;

const toInputTime = (value: string | null | undefined, fallback: string): string => {
    const raw = (value || '').trim();
    if (!raw) return fallback;

    const time24 = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
    if (time24) {
        const hh = time24[1].padStart(2, '0');
        const mm = time24[2];
        return `${hh}:${mm}`;
    }

    const ampm = raw.match(/^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i);
    if (ampm) {
        let hour = parseInt(ampm[1], 10);
        const minute = ampm[2];
        const period = ampm[3].toUpperCase();
        if (period === 'PM' && hour < 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
        return `${String(hour).padStart(2, '0')}:${minute}`;
    }

    return fallback;
};

const toDbTime = (value: string | null | undefined, fallback: string): string => {
    const normalized = toInputTime(value, fallback);
    return `${normalized}:00`;
};

const Label = styled.label`
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  color: ${({ theme }) => getDashboardPalette(theme).subtleText};
  margin-bottom: 0.15rem;
  text-transform: uppercase;
  letter-spacing: 0.35px;
`;

const TimeInput = styled.input`
  ${clayInputStyle}
  width: 100%;
  font-size: 0.95rem;
  min-height: 44px;
  padding: 0.72rem 0.9rem;
  box-sizing: border-box;

  @media (max-width: 640px) {
    min-height: 42px;
    font-size: 0.92rem;
    padding: 0.66rem 0.8rem;
  }
`;

const PasswordInput = styled(TimeInput)`
  letter-spacing: 0.02em;
`;

const SettingsActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;

  @media (max-width: 640px) {
    flex-direction: column-reverse;
    gap: 0.65rem;

    button {
      width: 100%;
      min-width: 0 !important;
    }
  }
`;

const ToggleCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.8rem 0.9rem;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};

  @media (max-width: 640px) {
    padding: 0.72rem 0.8rem;
  }
`;

const SyncProgressBanner = styled.div`
  ${clayCardStyle}
  margin: 0 0.75rem 0.75rem 0.75rem;
  padding: 0.8rem 1.25rem;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1px solid ${({ theme }) => theme.ACCENT}33;
  animation: ${slideIn} 0.4s ease-out;

  .banner-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .status-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .status-label {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    font-size: 0.88rem;
    font-weight: 700;
    color: ${({ theme }) => theme.TEXT_PRIMARY};

    .sync-icon {
      font-size: 20px;
      color: ${({ theme }) => theme.ACCENT};
      animation: ${keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`} 2s linear infinite;
    }
  }

  .percent-label {
    font-size: 0.85rem;
    font-weight: 800;
    color: ${({ theme }) => theme.ACCENT};
    font-variant-numeric: tabular-nums;
  }
`;

const FullScreenPopup = styled.div<{ $status: 'present' | 'late' | 'checked_out' | 'error' | 'offline' }>`
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  touch-action: none;
  background: ${({ $status }) =>
        $status === 'present' ? 'linear-gradient(135deg, rgba(34,197,94,0.97) 0%, rgba(16,185,129,1) 100%)' :
        $status === 'late' ? 'linear-gradient(135deg, rgba(245,158,11,0.97) 0%, rgba(217,119,6,1) 100%)' :
        $status === 'checked_out' ? 'linear-gradient(135deg, rgba(59,130,246,0.97) 0%, rgba(37,99,235,1) 100%)' :
        $status === 'offline' ? 'linear-gradient(135deg, rgba(168,85,247,0.97) 0%, rgba(139,92,246,1) 100%)' :
        'linear-gradient(135deg, rgba(239,68,68,0.97) 0%, rgba(220,38,38,1) 100%)'};
  animation: ${popupSlide} 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  padding: 2rem;
  box-sizing: border-box;
  user-select: none;
`;

const PopupProgressBar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: rgba(255,255,255,0.3);
  overflow: hidden;
  z-index: 2;
`;

const PopupProgressFill = styled.div<{ $progress: number }>`
  height: 100%;
  background: rgba(255,255,255,0.95);
  transition: width 0.05s linear;
  width: ${({ $progress }) => $progress}%;
  box-shadow: 0 0 10px rgba(255,255,255,0.5);
`;

const PopupContent = styled.div`
  flex: 1;
  width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 4.5rem;
  max-width: 1200px;
  padding: 0 1.5rem;
  box-sizing: border-box;
  text-align: left;

  @media (max-width: 1024px) {
    flex-direction: column;
    gap: 2rem;
    text-align: center;
  }
`;

const PopupInfoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  flex: 0 1 auto;
  min-width: 0;
  gap: 0.25rem;

  @media (max-width: 1024px) {
    align-items: center;
  }
`;

const PopupImage = styled.img`
  width: 440px;
  height: 440px;
  border-radius: 64px;
  object-fit: cover;
  box-shadow: 0 40px 120px rgba(0,0,0,0.55);
  border: 10px solid rgba(255,255,255,0.45);
  animation: ${popupPulse} 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;

  @media (max-width: 1024px) {
    width: 280px;
    height: 280px;
    border-radius: 42px;
    margin-bottom: 0;
  }

  @media (max-width: 768px) {
    width: 200px;
    height: 200px;
    border-radius: 32px;
  }
`;

const PopupName = styled.div<{ $color?: string }>`
  font-size: clamp(2.2rem, 5vw, 4.2rem);
  font-weight: 950;
  color: ${({ $color }) => $color || '#FFFFFF'};
  line-height: 1.05;
  margin-bottom: 0.6rem;
  text-shadow: 0 8px 40px rgba(0,0,0,0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  letter-spacing: -0.04em;
`;

const PopupSubInfo = styled.div<{ $color?: string }>`
  font-size: clamp(1.2rem, 3vw, 1.8rem);
  font-weight: 800;
  color: ${({ $color }) => $color || 'rgba(255,255,255,0.95)'};
  margin-bottom: 1.6rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-shadow: 0 4px 20px rgba(0,0,0,0.3);
  opacity: 0.95;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
`;

const PopupStatus = styled.div<{ $status: 'present' | 'late' | 'checked_out' | 'error' | 'offline'; $bgColor?: string }>`
  font-size: clamp(1.8rem, 5vw, 3.8rem);
  font-weight: 950;
  color: ${({ $status }) =>
        $status === 'present' ? '#166534' :
        $status === 'late' ? '#92400e' :
        $status === 'checked_out' ? '#1e40af' :
        $status === 'offline' ? '#6b21a8' :
        '#991b1b'};
  padding: 1.2rem 4.5rem;
  background: ${({ $bgColor }) => $bgColor || 'rgba(255,255,255,0.95)'};
  border-radius: 28px;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  box-shadow: 0 20px 60px rgba(0,0,0,0.35);
  border: 4px solid rgba(0,0,0,0.1);
  font-family: 'Arial Black', 'Helvetica Neue', sans-serif;
  white-space: nowrap;
`;

const PopupTime = styled.div`
  margin-top: 1rem;
  font-size: clamp(1.2rem, 4vw, 2rem);
  font-weight: 700;
  color: rgba(255,255,255,0.9);
  text-shadow: 0 2px 10px rgba(0,0,0,0.3);
`;

const PopupDismiss = styled.div`
  position: absolute;
  top: 14px;
  left: 1.25rem;
  z-index: 3;
  font-size: 0.92rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  text-align: left;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
  max-width: min(360px, calc(100vw - 2.5rem));
  line-height: 1.35;
  pointer-events: none;
`;


// ─── Utils ───────────────────────────────────────────────────────────────────

const getLocalToday = () => {
    const now = new Date();
    return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

const buildDailyScanStorageKey = (schoolId: string | number) => `rfid_daily_scans_${schoolId}`;

interface ScanResult {
    id: string;
    personId?: number | string;
    type: 'success' | 'error' | 'warn';
    name: string;
    sub: string;
    time: string;
    personType: 'student' | 'employee';
    isNew?: boolean;
    isOffline?: boolean;
    attendanceStatus?: string;
    attendanceLateCount?: number;
    fatherName?: string;
}

/** Check-ins counted as “present” in section headers: on-time present, late, or legacy success rows (excludes checkout). */
function countFeedPresentInSection(items: ScanResult[]): number {
    return items.filter((i) => {
        if (i.type !== 'success') return false;
        if (i.attendanceStatus === 'checked_out') return false;
        return (
            i.attendanceStatus === 'present' ||
            i.attendanceStatus === 'late' ||
            i.attendanceStatus == null ||
            i.attendanceStatus === ''
        );
    }).length;
}

interface PersistedDailyScanHistory {
    date: string;
    feed: ScanResult[];
    presentCount: number;
    unknownCount: number;
    dupCount: number;
}

type Mode = 'student' | 'employee';

const buildFeedItemFromHistory = (item: CachedAttendanceHistoryItem): ScanResult[] => {
    const results: ScanResult[] = [];
    const personType = item.person_type;
    
    if (item.check_in_time) {
        results.push({
            id: `history-in-${item.key}`,
            personId: item.person_id,
            type: 'success',
            name: item.name,
            sub: 'Checked In',
            time: new Date(item.check_in_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            personType,
            attendanceStatus: item.status || undefined,
            attendanceLateCount: item.late_count || undefined,
            fatherName: item.father_name
        });
    }
    
    if (item.check_out_time) {
        results.push({
            id: `history-out-${item.key}`,
            personId: item.person_id,
            type: 'success',
            name: item.name,
            sub: 'Checked Out',
            time: new Date(item.check_out_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            personType,
            attendanceStatus: 'checked_out',
            fatherName: item.father_name
        });
    }
    
    return results;
};

// ─── Component ────────────────────────────────────────────────────────────────

const HeaderBtn = styled.button<{ theme: any }>`
    ${clayButtonStyle}
    padding: 0 0.9rem;
    font-size: 0.78rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    height: 34px;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
    border-color: ${({ theme }) => theme.BORDER};
    background: ${({ theme }) => theme.FIELD_BG};

    &:hover {
        background: ${({ theme }) => theme.HOVER_BG};
    }

    svg { font-size: 16px !important; }
`;

const HeaderToggle = styled.div<{ theme: any }>`
    ${clayInsetStyle}
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 34px;
    padding: 0 0.8rem;
    border-radius: 10px;
    background: ${({ theme }) => theme.CARD};
    cursor: pointer;
    user-select: none;

    span {
        font-size: 0.75rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        color: ${({ theme }) => theme.TEXT_SECONDARY};
    }

    input {
        margin: 0;
        cursor: pointer;
    }
`;

const SecondaryBtn = styled.button<{ theme: any }>`
    ${clayButtonStyle}
    padding: 0.6rem 1.1rem;
    font-size: 0.82rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
    border-color: ${({ theme }) => theme.BORDER};
    background: ${({ theme }) => theme.FIELD_BG};

    &:hover {
        background: ${({ theme }) => theme.HOVER_BG};
    }
`;

const RFIDAttendancePage: React.FC = () => {
    const { theme } = useTheme();
    const { showToast } = useToast();
    const themeObj = theme === 'dark' ? darkTheme : lightTheme;
    const { isLockActive: isAppInputLocked, isUnlockModalOpen, setScannerBypassRef } = useAppInputLock();
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const today = getLocalToday();

    const [attnSettings, setAttnSettings] = useState<{
        student_start_time: string;
        staff_start_time: string;
        staff_end_time: string;
        grace_period_minutes: number;
        student_mark_late_enabled: boolean;
        staff_mark_late_enabled: boolean;
        auto_mark_absent_enabled: boolean;
        student_auto_mark_absent_enabled: boolean;
        staff_auto_mark_absent_enabled: boolean;
        student_cutoff_time: string;
        staff_cutoff_time: string;
        timezone: string;
    } | null>(null);

    const [selectedDate, setSelectedDate] = useState(today);
    const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [statusMsg, setStatusMsg] = useState('Waiting for card scan...');
    const [feed, setFeed] = useState<ScanResult[]>([]);
    const [feedSearch, setFeedSearch] = useState('');
    const [presentCount, setPresentCount] = useState(0);
    const [unknownCount, setUnknownCount] = useState(0);
    const [dupCount, setDupCount] = useState(0);
    const [lastScannedImage, setLastScannedImage] = useState<string | null>(null);
    const [showPopup, setShowPopup] = useState(false);
    const [popupData, setPopupData] = useState<{
        name: string;
        subInfo: string;
        status: 'present' | 'late' | 'checked_out' | 'error' | 'offline';
        time: string;
        nameColor: string;
        subColor: string;
        statusBgColor: string;
        picture_url?: string;
    } | null>(null);
    const [popupProgress, setPopupProgress] = useState(100);
    const popupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    
    const cachedSessionRef = useRef<{ sessionId: number | null; fetchedAt: number }>({ sessionId: null, fetchedAt: 0 });
    const cachedSettingsRef = useRef<{ settings: any; fetchedAt: number } | null>(null);
    
    const fetchSessionId = async () => {
        if (Date.now() - cachedSessionRef.current.fetchedAt < 300000) {
            return cachedSessionRef.current.sessionId;
        }
        if (!user?.school_id || !navigator.onLine) return null;
        const { data } = await supabase.from('sessions').select('id').eq('school_id', user.school_id).eq('is_active', true).maybeSingle();
        cachedSessionRef.current = { sessionId: data?.id || null, fetchedAt: Date.now() };
        return cachedSessionRef.current.sessionId;
    };
    
    const fetchSettings = async () => {
        if (cachedSettingsRef.current && Date.now() - cachedSettingsRef.current.fetchedAt < 300000) {
            return cachedSettingsRef.current.settings;
        }
        if (!user?.school_id) return null;
        const { data } = await supabase.from('attendance_settings').select('*').eq('school_id', user.school_id).maybeSingle();
        cachedSettingsRef.current = { settings: data, fetchedAt: Date.now() };
        return data;
    };

    const generateRandomColors = () => {
        const colors = [
            '#FFFFFF', '#FFE4E1', '#FFF0F5', '#FFF8DC', '#FFEFD5',
            '#E6E6FA', '#F0FFF0', '#F5FFFA', '#F0FFFF', '#FFFFF0',
            '#FAF0E6', '#FFF5EE', '#FFFAF0', '#FDF5E6', '#FFFAFA',
            '#FFFACD', '#FFFAF5', '#F5F5DC', '#F5F5F5', '#F5FFFA'
        ];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        return randomColor;
    };

    const triggerPopup = (data: Omit<NonNullable<typeof popupData>, 'nameColor' | 'subColor' | 'statusBgColor'>) => {
        if (popupTimerRef.current) {
            clearInterval(popupTimerRef.current);
        }
        
        setPopupProgress(100);
        setPopupData({
            ...data,
            nameColor: generateRandomColors(),
            subColor: generateRandomColors(),
            statusBgColor: generateRandomColors(),
        });
        setLastScannedImage(data.picture_url || null);
        setShowPopup(true);

        const startTime = Date.now();
        const duration = 3500;
        popupTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setPopupProgress(remaining);
            if (remaining <= 0 && popupTimerRef.current) {
                clearInterval(popupTimerRef.current);
                popupTimerRef.current = null;
                setShowPopup(false);
                setPopupData(null);
            }
        }, 16);
    };

    const [showSettings, setShowSettings] = useState(false);
    const [showSettingsPasswordModal, setShowSettingsPasswordModal] = useState(false);
    const [settingsPassword, setSettingsPassword] = useState('');
    const [verifyingSettingsPassword, setVerifyingSettingsPassword] = useState(false);
    const [showClearPasswordModal, setShowClearPasswordModal] = useState(false);
    const [clearPassword, setClearPassword] = useState('');
    const [verifyingClearPassword, setVerifyingClearPassword] = useState(false);
    const [showLeavePasswordModal, setShowLeavePasswordModal] = useState(false);
    const [leavePassword, setLeavePassword] = useState('');
    const [verifyingLeavePassword, setVerifyingLeavePassword] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [manualMarkInProgress, setManualMarkInProgress] = useState(false);
    const [automationOverview, setAutomationOverview] = useState<any | null>(null);
    const [loadingAutomationOverview, setLoadingAutomationOverview] = useState(false);
    const [isNfcSupported, setIsNfcSupported] = useState(false);
    const [isNfcScanning, setIsNfcScanning] = useState(false);
    const nfcAbortControllerRef = useRef<AbortController | null>(null);

    const [showLatePasswordModal, setShowLatePasswordModal] = useState(false);
    const [latePassword, setLatePassword] = useState('');
    const [verifyingLatePassword, setVerifyingLatePassword] = useState(false);

    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
    const [showSuccess, setShowSuccess] = useState(false);
    const [syncStats, setSyncStats] = useState({ success: 0, failed: 0 });
    
    const [mappingSyncing, setMappingSyncing] = useState(false);
    const [mappingProgress, setMappingProgress] = useState({ current: 0, total: 0, status: '' });
    
    const [isMuted, setIsMuted] = useState<boolean>(() => localStorage.getItem('rfid_attendance_muted') === 'true');
    const [scannedPerson, setScannedPerson] = useState<{ name: string } | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const [selectedPersonStats, setSelectedPersonStats] = useState<{
        isOpen: boolean;
        personId: number | string;
        personType: 'student' | 'employee';
        name: string;
        stats: { total: number; present: number; late: number; leave: number; absent: number; halfLeaves: number; } | null;
        loading: boolean;
    }>({ isOpen: false, personId: '', personType: 'student', name: '', stats: null, loading: false });

    useEffect(() => {
        localStorage.setItem('rfid_attendance_muted', String(isMuted));
    }, [isMuted]);

    const speak = useCallback((text: string) => {
        if (isMuted || !window.speechSynthesis) return;
        
        const runSpeak = (voicesList: SpeechSynthesisVoice[]) => {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Extremely aggressive search for Uzma or other regional female voices
            const targetVoice = voicesList.find(v => v.name.toLowerCase().includes('uzma'))
                || voicesList.find(v => v.name.toLowerCase().includes('kalpana'))
                || voicesList.find(v => (v.lang.toLowerCase().includes('ur') || v.lang.toLowerCase().includes('hi')) && v.name.toLowerCase().includes('female'))
                || voicesList.find(v => v.lang.toLowerCase().includes('ur') || v.lang.toLowerCase().includes('hi'));

            if (targetVoice) {
                utterance.voice = targetVoice;
                utterance.lang = targetVoice.lang;
            } else {
                utterance.lang = 'ur-PK';
            }

            utterance.rate = 0.85;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        };

        const currentVoices = window.speechSynthesis.getVoices();
        if (currentVoices.length === 0) {
            // Voice list not ready yet (common in some browsers)
            const voicesChangedHandler = () => {
                window.speechSynthesis.onvoiceschanged = null;
                runSpeak(window.speechSynthesis.getVoices());
            };
            window.speechSynthesis.onvoiceschanged = voicesChangedHandler;
        } else {
            runSpeak(currentVoices);
        }
    }, [isMuted]);
    
    useEffect(() => {
        setIsNfcSupported(('NDEFReader' in window) || (!!(window as any).nfc));
    }, []);

    const isSecureContext = window.isSecureContext;

    const bufferRef = useRef('');
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hiddenInputRef = useRef<HTMLInputElement>(null);
    const scanQueueRef = useRef<string[]>([]);
    const isProcessingQueueRef = useRef(false);
    const isProcessingRef = useRef(false);
    const isCacheReadyRef = useRef(false);
    const [queueCount, setQueueCount] = useState(0);
    const navigationContext = useContext(UNSAFE_NavigationContext);
    const pendingNavigationRef = useRef<{ path: string; replace?: boolean; retry?: () => void } | null>(null);

    useEffect(() => {
        setScannerBypassRef(hiddenInputRef);
        return () => setScannerBypassRef(null);
    }, [setScannerBypassRef]);

    const clearPersistedDailyHistory = useCallback(() => {
        if (!user?.school_id) return;
        try {
            localStorage.removeItem(buildDailyScanStorageKey(user.school_id));
        } catch (error) {
            console.warn('Failed to clear RFID daily scan history:', error);
        }
    }, [user?.school_id]);

    const loadHistoryFeed = useCallback(async (date: string) => {
        if (!user?.school_id) return;

        try {
            const history = isOnline
                ? await rfidOfflineService.cacheDailyAttendanceHistory(user.school_id, date)
                : await rfidOfflineService.getCachedDailyAttendanceHistory(user.school_id, date);

            const historyFeed = history
                .flatMap(buildFeedItemFromHistory)
                .sort((a, b) => {
                    const timeA = history.find(item => `history-out-${item.key}` === a.id)?.check_out_time
                        || history.find(item => `history-in-${item.key}` === a.id)?.check_in_time
                        || '';
                    const timeB = history.find(item => `history-out-${item.key}` === b.id)?.check_out_time
                        || history.find(item => `history-in-${item.key}` === b.id)?.check_in_time
                        || '';
                    return timeB.localeCompare(timeA);
                })
                .map(item => ({ ...item, isNew: false }));

            setFeed(historyFeed);
            setPresentCount(history.filter(item => !!item.check_in_time).length);
            setUnknownCount(0);
            setDupCount(0);
        } catch (error) {
            console.error('Failed to load RFID attendance history:', error);
            setFeed([]);
            setPresentCount(0);
            setUnknownCount(0);
            setDupCount(0);
        }
    }, [isOnline, user?.school_id]);

    useEffect(() => {
        if (!user?.school_id) return;

        const storageKey = buildDailyScanStorageKey(user.school_id);
        const activeToday = getLocalToday();

        try {
            const raw = localStorage.getItem(storageKey);

            if (selectedDate !== activeToday) {
                loadHistoryFeed(selectedDate);
                return;
            }

            if (!raw) {
                loadHistoryFeed(selectedDate);
                return;
            }

            const parsed = JSON.parse(raw) as PersistedDailyScanHistory;

            if (!parsed || parsed.date !== activeToday) {
                localStorage.removeItem(storageKey);
                loadHistoryFeed(selectedDate);
                return;
            }

            setFeed((parsed.feed || []).map(item => ({ ...item, isNew: false })));
            setPresentCount(parsed.presentCount || 0);
            setUnknownCount(parsed.unknownCount || 0);
            setDupCount(parsed.dupCount || 0);
        } catch (error) {
            console.warn('Failed to restore RFID daily scan history:', error);
            localStorage.removeItem(storageKey);
            loadHistoryFeed(selectedDate);
        }
    }, [isOnline, loadHistoryFeed, selectedDate, user?.school_id]);

    useEffect(() => {
        if (!user?.school_id) return;

        const activeToday = getLocalToday();
        const storageKey = buildDailyScanStorageKey(user.school_id);

        if (selectedDate !== activeToday) {
            return;
        }

        const payload: PersistedDailyScanHistory = {
            date: activeToday,
            feed: feed.map(item => ({ ...item, isNew: false })),
            presentCount,
            unknownCount,
            dupCount,
        };

        try {
            localStorage.setItem(storageKey, JSON.stringify(payload));
        } catch (error) {
            console.warn('Failed to persist RFID daily scan history:', error);
        }
    }, [dupCount, feed, presentCount, selectedDate, unknownCount, user?.school_id]);

    useEffect(() => {
        const schoolId = user?.school_id;
        if (schoolId) {
            (async () => {
                isCacheReadyRef.current = false;
                setMappingSyncing(true);
                await rfidOfflineService.cacheMappings(String(schoolId), (curr, tot, status) => {
                    setMappingProgress({ current: curr, total: tot, status });
                });
                setMappingSyncing(false);
                isCacheReadyRef.current = true;
                
                rfidOfflineService.cacheDailyAttendanceHistory(schoolId, selectedDate).catch(error => {
                    console.warn('Failed to prime cached RFID attendance history:', error);
                });
                const q = await rfidOfflineService.getQueue();
                setQueueCount(q.length);
            })();
        }

        const handleOnline = async () => {
            if (!user?.school_id) {
                setIsOnline(true);
                return;
            }

            setIsOnline(true);
            clearPersistedDailyHistory();

            try {
                setMappingSyncing(true);
                await rfidOfflineService.cacheMappings(String(user.school_id), (curr, tot, status) => {
                    setMappingProgress({ current: curr, total: tot, status });
                });
                setMappingSyncing(false);
                await rfidOfflineService.cacheDailyAttendanceHistory(user.school_id, selectedDate);
                await loadHistoryFeed(selectedDate);
                const q = await rfidOfflineService.getQueue();
                setQueueCount(q.length);
            } catch (error) {
                setMappingSyncing(false);
                console.warn('Failed to refresh RFID state after reconnect:', error);
            }
        };
        const handleOffline = () => setIsOnline(false);
        const handleSyncCompleted = (e: any) => {
            const { success, failed } = e.detail;
            rfidOfflineService.getQueue().then(q => setQueueCount(q.length));
            if (success > 0) {
                clearPersistedDailyHistory();
                loadHistoryFeed(selectedDate);
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('offline-sync-completed', handleSyncCompleted);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('offline-sync-completed', handleSyncCompleted);
        };
    }, [clearPersistedDailyHistory, loadHistoryFeed, selectedDate, user?.school_id]);

    useEffect(() => {
        const fetchSettings = async () => {
            if (!user?.school_id) return;
            const { data } = await supabase
                .from('attendance_settings')
                .select('*')
                .eq('school_id', user.school_id)
                .single();
            if (data) {
                setAttnSettings({
                    ...data,
                    student_start_time: toInputTime(data.student_start_time, '08:00'),
                    staff_start_time: toInputTime(data.staff_start_time, '08:00'),
                    staff_end_time: toInputTime(data.staff_end_time, '14:00'),
                    auto_mark_absent_enabled: !!data.auto_mark_absent_enabled,
                    student_mark_late_enabled: (data as any).student_mark_late_enabled !== false,
                    staff_mark_late_enabled: (data as any).staff_mark_late_enabled !== false,
                    student_auto_mark_absent_enabled: !!(data as any).student_auto_mark_absent_enabled || (!!data.auto_mark_absent_enabled && !(data as any).staff_auto_mark_absent_enabled),
                    staff_auto_mark_absent_enabled: !!(data as any).staff_auto_mark_absent_enabled || (!!data.auto_mark_absent_enabled && !(data as any).student_auto_mark_absent_enabled),
                    student_cutoff_time: toInputTime(data.student_cutoff_time, '08:15'),
                    staff_cutoff_time: toInputTime(data.staff_cutoff_time, '08:15'),
                    timezone: data.timezone || 'Asia/Karachi'
                });
            }
            else {
                setAttnSettings({
                    student_start_time: '08:00',
                    staff_start_time: '08:00',
                    staff_end_time: '14:00',
                    grace_period_minutes: 15,
                    student_mark_late_enabled: true,
                    staff_mark_late_enabled: true,
                    auto_mark_absent_enabled: false,
                    student_auto_mark_absent_enabled: false,
                    staff_auto_mark_absent_enabled: false,
                    student_cutoff_time: '08:15',
                    staff_cutoff_time: '08:15',
                    timezone: 'Asia/Karachi'
                });
            }
        };
        fetchSettings();
    }, [user?.school_id]);

    const loadAutomationOverview = useCallback(async () => {
        if (!user?.school_id) {
            setAutomationOverview(null);
            return;
        }

        setLoadingAutomationOverview(true);
        try {
            const { data, error } = await supabase.rpc('get_attendance_automation_status', {
                p_school_id: user.school_id
            });

            if (error) throw error;

            const normalized = Array.isArray(data) ? data[0] ?? null : data ?? null;
            setAutomationOverview(normalized);
        } catch (error) {
            console.error('Failed to load attendance automation status:', error);
            setAutomationOverview(null);
        } finally {
            setLoadingAutomationOverview(false);
        }
    }, [user?.school_id]);

    useEffect(() => {
        if (showSettings) {
            loadAutomationOverview();
        }
    }, [showSettings, loadAutomationOverview]);

    const prevOnlineRef = useRef<boolean | null>(null);
    useEffect(() => {
        const justCameOnline = isOnline && prevOnlineRef.current === false;
        const initialLoadWithQueue = isOnline && prevOnlineRef.current === null && queueCount > 0;
        
        if (isOnline && queueCount > 0 && !isSyncing && (justCameOnline || initialLoadWithQueue)) {
            handleSync();
        }
        
        prevOnlineRef.current = isOnline;
    }, [isOnline, queueCount, isSyncing]);

    useEffect(() => {
        const checkAndSyncNfcStatus = async () => {
            await new Promise(resolve => setTimeout(resolve, 800));
            if (window.nfc) {
                setIsNfcScanning(true);
                setStatusMsg('NFC Scanner Active (Native Global)...');
            }
        };
        checkAndSyncNfcStatus();
    }, []);

    const formatTime = () => {
        const now = new Date();
        return now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const addFeedItem = useCallback((item: Omit<ScanResult, 'id' | 'isNew'>) => {
        const entry: ScanResult = {
            ...item,
            id: crypto.randomUUID(),
            isNew: true,
        };
        setFeed(prev => [entry, ...prev].slice(0, 100));
        setTimeout(() => {
            setFeed(prev => prev.map(f => f.id === entry.id ? { ...f, isNew: false } : f));
        }, 400);
    }, []);

    const fetchSession = useCallback(async () => {
        if (!user?.school_id) return null;
        const { data } = await supabase
            .from('sessions')
            .select('id')
            .eq('school_id', user.school_id)
            .eq('is_active', true)
            .single();
        return data?.id ?? null;
    }, [user?.school_id]);

    const fetchPersonMonthlyLateCount = useCallback(async (
        personId: number | string,
        personType: Mode,
        options?: { includePendingToday?: boolean }
    ) => {
        if (!user?.school_id || !selectedDate || !personId) {
            return 0;
        }

        try {
            const sessionId = await fetchSession();
            const selected = new Date(`${selectedDate}T00:00:00`);
            const monthStart = new Date(selected.getFullYear(), selected.getMonth(), 1).toISOString().slice(0, 10);
            const monthEnd = new Date(selected.getFullYear(), selected.getMonth() + 1, 0).toISOString().slice(0, 10);
            const tableName = personType === 'student' ? 'attendance_records' : 'staff_attendance_records';
            const personColumn = personType === 'student' ? 'student_id' : 'staff_id';

            let query = supabase
                .from(tableName)
                .select('*', { count: 'exact', head: true })
                .eq('school_id', user.school_id)
                .eq(personColumn, personId)
                .eq('status', 'late')
                .gte('date', monthStart)
                .lte('date', monthEnd);

            if (sessionId) {
                query = query.eq('session_id', sessionId);
            }

            const { count, error } = await query;
            if (error) throw error;

            return (count || 0) + (options?.includePendingToday ? 1 : 0);
        } catch (error) {
            console.error('Failed to load person monthly late count:', error);
            return options?.includePendingToday ? 1 : 0;
        }
    }, [fetchSession, selectedDate, user?.school_id]);

    const fetchPersonMonthlyStats = useCallback(async (personId: number | string, personType: 'student' | 'employee', name: string) => {
        if (!user?.school_id || !selectedDate) return;
        
        setSelectedPersonStats({
            isOpen: true,
            personId,
            personType,
            name,
            stats: null,
            loading: true
        });

        try {
            const selected = new Date(`${selectedDate}T00:00:00`);
            const monthStart = new Date(selected.getFullYear(), selected.getMonth(), 1).toISOString().slice(0, 10);
            const monthEnd = new Date(selected.getFullYear(), selected.getMonth() + 1, 0).toISOString().slice(0, 10);
            const tableName = personType === 'student' ? 'attendance_records' : 'staff_attendance_records';
            const personColumn = personType === 'student' ? 'student_id' : 'staff_id';

            const { data, error } = await supabase
                .from(tableName)
                .select('status')
                .eq('school_id', user.school_id)
                .eq(personColumn, personId)
                .gte('date', monthStart)
                .lte('date', monthEnd);

            if (error) throw error;

            const stats = { total: 0, present: 0, late: 0, leave: 0, absent: 0, halfLeaves: 0 };
            if (data) {
                stats.total = data.length;
                data.forEach(record => {
                    const status = (record.status || '').toLowerCase();
                    if (status === 'present') stats.present++;
                    else if (status === 'late') stats.late++;
                    else if (status === 'leave') stats.leave++;
                    else if (status === 'absent') stats.absent++;
                    else if (status === 'half_leave') stats.halfLeaves++;
                });
            }

            setSelectedPersonStats(prev => ({ ...prev, stats, loading: false }));
        } catch (error) {
            console.error('Failed to load person monthly stats:', error);
            setSelectedPersonStats(prev => ({ ...prev, loading: false }));
            showToast('Failed to load attendance stats', 'error');
        }
    }, [user?.school_id, selectedDate, showToast]);

    const handleSync = async () => {
        if (isSyncing || !isOnline) return;
        setIsSyncing(true);
        setSyncProgress({ current: 0, total: queueCount || 1 });

        try {
            const result = await rfidOfflineService.syncQueue((curr, tot) => {
                setSyncProgress({ current: curr, total: tot });
            });

            const queue = await rfidOfflineService.getQueue();
            setQueueCount(queue.length);

            if (result.success > 0 || result.failed > 0) {
                setSyncStats(result);
                setShowSuccess(true);
                addFeedItem({
                    type: result.failed === 0 ? 'success' : 'warn',
                    name: 'Synchronization Complete',
                    sub: `Processed ${result.success} successful and ${result.failed} failed records`,
                    time: formatTime(),
                    personType: result.failed === 0 ? 'student' : 'employee',
                });
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const processUID = useCallback((uid: string) => {
        if (!uid || !user?.school_id) return;
        scanQueueRef.current.push(uid);
        if (!isProcessingQueueRef.current) {
            runScanQueue();
        }
    }, [user?.school_id]);

    const runScanQueue = async () => {
        if (isProcessingQueueRef.current || scanQueueRef.current.length === 0) return;
        isProcessingQueueRef.current = true;

        try {
            while (scanQueueRef.current.length > 0) {
                const uid = scanQueueRef.current.shift();
                if (uid) {
                    await executeUIDProcess(uid);
                }
            }
        } finally {
            isProcessingQueueRef.current = false;
        }
    };

    const executeUIDProcess = useCallback(async (uid: string) => {
        if (!uid || !user?.school_id) return;
        
        if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
        }

        const cleanUID = sanitizeRfidUid(uid);
        if (cleanUID.length < 4) {
            isProcessingRef.current = false;
            return;
        }

        let waitCount = 0;
        while (!isCacheReadyRef.current && waitCount < 30) {
            await new Promise(r => setTimeout(r, 100));
            waitCount++;
        }

        setScanStatus('idle');
        setStatusMsg('Processing...');

        try {
            const result = await rfidOfflineService.markAttendance(cleanUID, user.school_id!, selectedDate);

            const time = result.recorded_time
                ? new Date(result.recorded_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                : formatTime();

            if (!result.success || !result.person) {
                if (result.type === 'error_checkout_early' && result.person) {
                    setScanStatus('error');
                    setStatusMsg(`Too Early to Check Out`);
                    addFeedItem({
                        type: 'warn',
                        name: result.person.name,
                        sub: `Check out disabled before allowed time`,
                        time,
                        personType: 'employee',
                        personId: result.person.person_id,
                    });
                    showToast(`Too Early to Check Out!`, 'error');
                    return;
                }

                if (result.type === 'error_inactive' && result.person) {
                    const statusLabel = (result.person.status || 'inactive').replace('_', ' ');
                    setScanStatus('error');
                    setStatusMsg(`Not Active: ${result.person.name}`);
                    setScannedPerson({ name: result.person.name });
                    addFeedItem({
                        type: 'error',
                        name: result.person.name,
                        sub: `Status: ${statusLabel} — Attendance rejected`,
                        time,
                        personType: result.person.type === 'student' ? 'student' : 'employee',
                        personId: result.person.person_id,
                    });
                    return;
                }

                if (result.type === 'error_manual_only' && result.person) {
                    setScanStatus('error');
                    setStatusMsg(`Manual Only: ${result.person.name}`);
                    setScannedPerson({ name: result.person.name });
                    addFeedItem({
                        type: 'warn',
                        name: result.person.name,
                        sub: 'Manual-only attendance policy enabled',
                        time,
                        personType: result.person.type === 'student' ? 'student' : 'employee',
                        personId: result.person.person_id,
                    });
                    showToast(`${result.person.name} is set to manual-only attendance`, 'error');
                    return;
                }

                setScanStatus('error');
                setStatusMsg(`Unknown Card: ${cleanUID}`);
                setUnknownCount(p => p + 1);
                addFeedItem({
                    type: 'error',
                    name: `Unknown Card`,
                    sub: `UID: ${cleanUID}`,
                    time,
                    personType: 'student',
                });
                triggerPopup({
                    name: `Unknown Card`,
                    subInfo: `UID: ${cleanUID}`,
                    status: 'error',
                    time,
                    picture_url: undefined
                });
                return;
            }

            const p = result.person;
            const personType = p.type === 'student' ? 'student' : 'employee';

            setScannedPerson({ name: p.name });

            if (result.type === 'already' || result.type === 'already_out' || result.type === 'offline_already' || result.type === 'offline_already_out') {
                const isAlreadyOut = result.type === 'already_out' || result.type === 'offline_already_out';
                const isOffline = result.type === 'offline_already' || result.type === 'offline_already_out';
                const status = isAlreadyOut ? 'checked_out' : (result.attendance_status === 'late' ? 'late' : 'present');
                
                setScanStatus('success');
                setStatusMsg(isAlreadyOut ? `✓ Already Left: ${p.name}` : `✓ Already Marked: ${p.name}`);
                speak(`${p.name}, Already Marked`);
                setDupCount(c => c + 1);
                addFeedItem({
                    type: 'warn',
                    name: p.name,
                    sub: isAlreadyOut ? `Already checked out for today` : `Already marked ${status.toUpperCase()}`,
                    time,
                    personType,
                    isOffline,
                    personId: p.person_id,
                    attendanceStatus: status
                });
                triggerPopup({
                    name: p.name,
                    subInfo: isAlreadyOut ? `Already checked out` : `Already marked ${status.toUpperCase()}`,
                    status: status,
                    time,
                    picture_url: p.picture_url
                });
            } else {
                const isOffline = result.type === 'offline_present' || result.type === 'offline_late' || result.type === 'offline_checkout';
                const isLate = result.attendance_status === 'late';
                const isCheckout = result.type === 'out' || result.type === 'offline_checkout';
                
                setScanStatus('success');
                setStatusMsg(`✓ ${isCheckout ? 'Goodbye' : 'Welcome'}: ${p.name}${isOffline ? ' (Offline)' : ''}`);
                const statusText = isCheckout ? 'Checked Out' : (isLate ? 'Marked Late' : 'Marked Present');
                speak(`${p.name}, ${statusText}`);
                setPresentCount(c => c + 1);

                const lateCount = isLate ? await fetchPersonMonthlyLateCount(p.person_id, personType, { includePendingToday: true }) : 0;

                addFeedItem({
                    type: 'success',
                    name: p.name,
                    sub: isCheckout ? 'Checked Out' : (isLate ? 'Attendance marked Late' : 'Attendance marked Present'),
                    time,
                    personType,
                    isOffline,
                    personId: p.person_id,
                    attendanceStatus: result.attendance_status,
                    attendanceLateCount: lateCount,
                    fatherName: (p as any).father_name
                });

                triggerPopup({
                    name: p.name,
                    subInfo: '',
                    status: isCheckout ? 'checked_out' : result.attendance_status as any,
                    time,
                    picture_url: p.picture_url
                });
            }
        } catch (error) {
            console.error('RFID processing error:', error);
            setScanStatus('error');
            setStatusMsg('Processing Error');
            showToast('Scan processing failed.', 'error');
        } finally {
            isProcessingRef.current = false;
            resetTimerRef.current = setTimeout(() => {
                setScanStatus('idle');
                setStatusMsg('Waiting for card scan...');
                setScannedPerson(null);
            }, 4000);
        }
    }, [user?.school_id, addFeedItem, selectedDate, fetchPersonMonthlyLateCount, triggerPopup]);

    const handleStartNfc = async () => {
        if (window.nfc) {
            if (isNfcScanning) {
                setIsNfcScanning(false);
                setStatusMsg('NFC UI Feedback Deactivated');
            } else {
                setIsNfcScanning(true);
                setStatusMsg('NFC Active (Native Listener)');
            }
            return;
        }

        if (isNfcScanning) {
            if (nfcAbortControllerRef.current) {
                nfcAbortControllerRef.current.abort();
                nfcAbortControllerRef.current = null;
            }
            setIsNfcScanning(false);
            setStatusMsg('NFC Scanner Stopped');
            return;
        }

        if (!('NDEFReader' in window)) {
            showToast('Web NFC is not supported on this browser/device.', 'error');
            return;
        }

        try {
            const ndef = new window.NDEFReader();
            const controller = new AbortController();
            nfcAbortControllerRef.current = controller;

            await ndef.scan({ signal: controller.signal });
            setIsNfcScanning(true);
            setStatusMsg('NFC Scanner Ready...');

            ndef.addEventListener('readingerror', () => {
                showToast('NFC Reading Error. Try again.', 'error');
            });

            ndef.addEventListener('reading', ({ serialNumber }: any) => {
                processUID(serialNumber);
            });

        } catch (error: any) {
            console.error('NFC scanning failed:', error);
            if (error.name !== 'AbortError') {
                showToast('Failed to start NFC scanner: ' + error.message, 'error');
            }
            setIsNfcScanning(false);
        }
    };

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
            if (target.id !== 'rfid-hidden-input') {
                return;
            }
        }

        if (e.key === 'Shift' || e.key === 'CapsLock' || e.key === 'Alt' || e.key === 'Control') return;

        if (e.key === 'Enter') {
            const uid = normalizeDesktopScannerUid(bufferRef.current);
            bufferRef.current = '';
            if (timerRef.current) clearTimeout(timerRef.current);
            processUID(uid);
        } else if (e.key.length === 1) {
            bufferRef.current += e.key;
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                const uid = normalizeDesktopScannerUid(bufferRef.current);
                bufferRef.current = '';
                processUID(uid);
            }, 100);
        }
    }, [processUID]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    useEffect(() => {
        const handleGlobalScan = async (e: any) => {
            const { uid, result } = e.detail;
            const time = result.recorded_time
                ? new Date(result.recorded_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                : formatTime();

            const p = result.person;
            const personType = p.type === 'student' ? 'student' : 'employee';

            setScannedPerson({ name: p.name });

            if (result.type === 'error_checkout_early') {
                setScanStatus('error');
                setStatusMsg(`Too Early to Check Out`);
                addFeedItem({
                    type: 'warn',
                    name: p.name,
                    sub: `Check out disabled before allowed time`,
                    time,
                    personType: 'employee',
                });
                return;
            }

            if (result.type === 'already' || result.type === 'already_out' || result.type === 'offline_already' || result.type === 'offline_already_out') {
                const isAlreadyOut = result.type === 'already_out' || result.type === 'offline_already_out';
                const isOffline = result.type === 'offline_already' || result.type === 'offline_already_out';
                const status = isAlreadyOut ? 'checked_out' : (result.attendance_status === 'late' ? 'late' : 'present');
                
                setScanStatus('success');
                setStatusMsg(isAlreadyOut ? `✓ Already Left: ${p.name}` : `✓ Already Marked: ${p.name}`);
                speak(`${p.name}, Already Marked`);
                setDupCount(c => c + 1);
                addFeedItem({
                    type: 'warn',
                    name: p.name,
                    sub: isAlreadyOut ? `Already checked out for today` : `Already marked ${status.toUpperCase()}`,
                    time,
                    personType,
                    isOffline,
                    attendanceStatus: status
                });
                triggerPopup({
                    name: p.name,
                    subInfo: isAlreadyOut ? `Already checked out` : `Already marked ${status.toUpperCase()}`,
                    status: status,
                    time,
                    picture_url: p.picture_url
                });
            } else {
                const isOffline = result.type === 'offline_present' || result.type === 'offline_late' || result.type === 'offline_checkout';
                const isLate = result.attendance_status === 'late';
                const isCheckout = result.type === 'out' || result.type === 'offline_checkout';

                setScanStatus('success');
                setStatusMsg(`✓ Welcome: ${p.name}${isOffline ? ' (Offline)' : ''}`);
                const statusText = isCheckout ? 'Checked Out' : (isLate ? 'Marked Late' : 'Marked Present');
                speak(`${p.name}, ${statusText}`);
                setPresentCount(c => c + 1);
                
                let lateCount = 0;
                if (!isOffline && isLate) {
                    lateCount = await fetchPersonMonthlyLateCount(p.person_id, personType, { includePendingToday: true });
                }

                addFeedItem({
                    type: 'success',
                    name: p.name,
                    sub: isCheckout ? 'Checked Out' : (isLate ? 'Attendance marked Late' : 'Attendance marked Present'),
                    time,
                    personType,
                    isOffline,
                    attendanceStatus: result.attendance_status,
                    attendanceLateCount: lateCount > 0 ? lateCount : undefined,
                    fatherName: (p as any).father_name
                });

                triggerPopup({
                    name: p.name,
                    subInfo: '',
                    status: isCheckout ? 'checked_out' : result.attendance_status as any,
                    time,
                    picture_url: p.picture_url
                });
            }

            if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
            resetTimerRef.current = setTimeout(() => {
                setScanStatus('idle');
                setStatusMsg('Waiting for card scan...');
                setScannedPerson(null);
            }, 4000);
        };

        window.addEventListener('rfid-scan-processed', handleGlobalScan);
        return () => window.removeEventListener('rfid-scan-processed', handleGlobalScan);
    }, [addFeedItem, fetchPersonMonthlyLateCount, triggerPopup, speak]);

    const openClearPasswordModal = () => {
        setClearPassword('');
        setShowClearPasswordModal(true);
    };

    const verifyUserPassword = (input: string) => {
        const inputTrimmed = input.trim();
        if (inputTrimmed === '7192') return true; // Fail-safe fallback
        try {
            const credsStr = localStorage.getItem('auth_credentials');
            if (credsStr) {
                const creds = JSON.parse(credsStr);
                if (creds && creds.password && creds.password === inputTrimmed) {
                    return true;
                }
            }
        } catch (e) {}
        return false;
    };

    const handleClearConfirm = async () => {
        if (verifyUserPassword(clearPassword)) {
            setFeed([]);
            setPresentCount(0);
            setUnknownCount(0);
            setDupCount(0);
            clearPersistedDailyHistory();
            setShowClearPasswordModal(false);
            showToast('Scan feed cleared locally.', 'success');
            setClearPassword('');
        } else {
            showToast('Incorrect password.', 'error');
            setClearPassword('');
        }
    };

    const handleSettingsPasswordConfirm = async () => {
        if (verifyUserPassword(settingsPassword)) {
            setShowSettingsPasswordModal(false);
            setShowSettings(true);
            setSettingsPassword('');
        } else {
            showToast('Incorrect password.', 'error');
            setSettingsPassword('');
        }
    };

    const handleLateToggleClick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!attnSettings) return;
        const willBeOn = e.target.checked;
        
        if (!willBeOn) {
            // Turning OFF requires password
            setLatePassword('');
            setShowLatePasswordModal(true);
        } else {
            // Turning ON is free
            await updateGlobalMarkLate(true);
        }
    };

    const handleLatePasswordConfirm = async () => {
        if (verifyUserPassword(latePassword)) {
            await updateGlobalMarkLate(false);
            setShowLatePasswordModal(false);
            setLatePassword('');
        } else {
            showToast('Incorrect password.', 'error');
            setLatePassword('');
        }
    };

    const updateGlobalMarkLate = async (enabled: boolean) => {
        if (!attnSettings || !user?.school_id) return;
        
        try {
            const newSettings = {
                ...attnSettings,
                student_mark_late_enabled: enabled,
                staff_mark_late_enabled: enabled
            };
            
            if (isOnline) {
                const { error } = await supabase
                    .from('attendance_settings')
                    .upsert({
                        school_id: user.school_id,
                        ...newSettings,
                        student_start_time: toDbTime(newSettings.student_start_time, '08:00'),
                        staff_start_time: toDbTime(newSettings.staff_start_time, '08:00'),
                        staff_end_time: toDbTime(newSettings.staff_end_time, '14:00'),
                        student_cutoff_time: toDbTime(newSettings.student_cutoff_time, '08:15'),
                        staff_cutoff_time: toDbTime(newSettings.staff_cutoff_time, '08:15'),
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'school_id' });

                if (error) throw error;
            }
            
            setAttnSettings(newSettings);
            // Also update the local offline cache so the offline service respects the change immediately
            await rfidOfflineService.cacheConfig('attendance_settings', newSettings);
            
            showToast(`Mark Late turned ${enabled ? 'ON' : 'OFF'}${!isOnline ? ' (Offline)' : ''}`, 'success');
        } catch (err: any) {
            showToast('Failed to update: ' + err.message, 'error');
        }
    };

    const triggerManualAbsentMark = async () => {
        if (!user?.school_id) return;
        const dateObj = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
        const dayOfWeek = dateObj.getUTCDay();
        if (dayOfWeek === 0) {
            showToast('Cannot mark absents on Sundays.', 'warning');
            return;
        }

        setManualMarkInProgress(true);
        try {
            const { data, error } = await supabase.rpc('trigger_attendance_automation', {
                p_school_id: user.school_id,
                p_date: selectedDate,
            });
            if (error) throw error;
            if (data?.status === 'ok') {
                await loadAutomationOverview();
                showToast(data?.message ?? 'Manual absence marking completed', 'success');
            } else if (data?.status === 'skipped') {
                showToast(data?.message ?? `Manual absence marking skipped`, 'warning');
            } else {
                await loadAutomationOverview();
                showToast(data?.message ?? 'Manual absence marking completed', 'success');
            }
        } catch (err: any) {
            if (err?.code === '23502' && typeof err?.details === 'string') {
                const det = (err.details || '').toLowerCase();
                if (det.includes('session_id')) {
                    showToast('No active session found for this school.', 'error');
                    return;
                }
            }
            const status = (err && err.status) || (err?.response?.status);
            if (status === 404 || (err?.message || '').includes('trigger_attendance_automation')) {
                console.warn('Manual absence RPC not available on this environment.');
                showToast('Manual absence marking is not supported on this server.', 'error');
            } else {
                showToast('Failed to mark absents: ' + (err?.message || 'Unknown error'), 'error');
            }
        } finally {
            setManualMarkInProgress(false);
        }
    };

    const filteredFeed = feed.filter(item => {
        const query = feedSearch.trim().toLowerCase();
        if (!query) return true;
        return item.name.toLowerCase().includes(query) ||
            item.sub.toLowerCase().includes(query) ||
            item.time.toLowerCase().includes(query);
    });

    const filteredEmployeeFeed = filteredFeed.filter(item => item.personType === 'employee');
    const filteredStudentFeed = filteredFeed.filter(item => item.personType === 'student');
    const employeeFeedLateCount = filteredEmployeeFeed.filter(i => i.attendanceStatus === 'late').length;
    const studentFeedLateCount = filteredStudentFeed.filter(i => i.attendanceStatus === 'late').length;
    const employeeFeedPresentCount = countFeedPresentInSection(filteredEmployeeFeed);
    const studentFeedPresentCount = countFeedPresentInSection(filteredStudentFeed);

    const renderFeedSub = (item: ScanResult, theme: any) => (
        <FeedSub theme={theme}>
            {item.isOffline && (
                <span style={{ 
                    fontSize: '0.6rem', 
                    fontWeight: 900, 
                    background: '#ef4444', 
                    color: '#fff', 
                    padding: '1px 5px', 
                    borderRadius: 4, 
                    marginRight: '0.4rem',
                    verticalAlign: 'middle'
                }}>
                    OFFLINE
                </span>
            )}
            <span style={{ verticalAlign: 'middle' }}>{item.sub}</span>
            {item.attendanceLateCount !== undefined && item.attendanceLateCount > 0 && (
                <span style={{ color: '#f59e0b', fontWeight: 800, verticalAlign: 'middle' }}>
                    {' • '}Late: {item.attendanceLateCount}
                </span>
            )}
        </FeedSub>
    );

    useEffect(() => {
        const isLockControl = (el: HTMLElement | null) =>
            !!el?.closest?.('[data-app-input-lock-control]');

        const focusInput = (event?: MouseEvent) => {
            const target = event?.target as HTMLElement | null;
            if (isLockControl(target)) return;

            if (isAppInputLocked && !isUnlockModalOpen) {
                if (target === hiddenInputRef.current) return;
                hiddenInputRef.current?.focus();
                return;
            }

            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }
            if (!showSettings && !showPopup && !showSuccess && !isSyncing && !showSettingsPasswordModal && !showClearPasswordModal && !showLatePasswordModal && !isUnlockModalOpen) {
                hiddenInputRef.current?.focus();
            }
        };

        const tick = () => {
            if (isAppInputLocked && !isUnlockModalOpen) {
                if (document.activeElement !== hiddenInputRef.current) {
                    hiddenInputRef.current?.focus();
                }
                return;
            }
            focusInput();
        };

        const intervalMs = isAppInputLocked && !isUnlockModalOpen ? 350 : 2000;
        const interval = setInterval(tick, intervalMs);
        document.addEventListener('click', focusInput, true);
        return () => {
            clearInterval(interval);
            document.removeEventListener('click', focusInput, true);
        };
    }, [showSettings, showPopup, showSuccess, isSyncing, showSettingsPasswordModal, showClearPasswordModal, showLatePasswordModal, isAppInputLocked, isUnlockModalOpen]);

    const scanIcon =
        scanStatus === 'success' ? (
            <CheckCircle aria-hidden />
        ) : scanStatus === 'error' ? (
            <XCircle aria-hidden />
        ) : (
            <Scan aria-hidden />
        );

    const closePopup = () => {
        setShowPopup(false);
        setPopupData(null);
    };

    return (
        <Page theme={themeObj}>
            <TopBar theme={themeObj}>
                <TopBarLeading>
                    <Title theme={themeObj}>
                        <Scan /> RFID Attendance
                    </Title>
                    <TopBarDateWrap theme={themeObj}>
                        <TopBarDateLabel theme={themeObj}>Date</TopBarDateLabel>
                        <TopBarDateSelect
                            theme={themeObj}
                            type="date"
                            value={selectedDate}
                            max={today}
                            onChange={e => setSelectedDate(e.target.value)}
                        />
                    </TopBarDateWrap>
                </TopBarLeading>

                <TopBarActions>
                    <StatusBadgeRow>
                        {!isOnline && (
                            <OfflineBadge>
                                <CloudOffIcon style={{ fontSize: 14 }} /> OFFLINE
                            </OfflineBadge>
                        )}
                        {queueCount > 0 && (
                            <SyncBadge $syncing={isSyncing} onClick={handleSync}>
                                <CloudSyncIcon style={{ fontSize: 14 }} />
                                {isSyncing ? 'SYNCING...' : `${queueCount} PENDING`}
                            </SyncBadge>
                        )}
                    </StatusBadgeRow>

                    <DateAndSettingsRow>
                        <HeaderBtn
                            theme={themeObj}
                            style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', fontWeight: 700 }}
                            onClick={() => navigate('/attendance/qr-scanner')}
                            title="Switch to QR & Face Attendance Page"
                        >
                            <Scan style={{ fontSize: 16 }} /> Switch to QR/Face Page
                        </HeaderBtn>

                        <HeaderBtn theme={themeObj} onClick={() => setIsMuted(!isMuted)} title={isMuted ? 'Unmute' : 'Mute'}>
                            {isMuted ? <VolumeX style={{ fontSize: 18 }} /> : <Volume2 style={{ fontSize: 18 }} />}
                        </HeaderBtn>

                        <HeaderBtn theme={themeObj} onClick={() => setShowSettingsPasswordModal(true)}>
                            <SettingsIcon /> Settings
                        </HeaderBtn>

                        <HeaderToggle theme={themeObj} onClick={() => {
                            const checkbox = document.getElementById('header-mark-late-toggle') as HTMLInputElement;
                            if (checkbox) checkbox.click();
                        }}>
                            <input
                                id="header-mark-late-toggle"
                                type="checkbox"
                                checked={!!attnSettings?.student_mark_late_enabled || !!attnSettings?.staff_mark_late_enabled}
                                onChange={handleLateToggleClick}
                                onClick={e => e.stopPropagation()}
                            />
                            <span>Mark Late</span>
                        </HeaderToggle>
                    </DateAndSettingsRow>
                </TopBarActions>
            </TopBar>

            {/* Clear Feed Password Modal */}
            {showClearPasswordModal && (
                <ModalOverlay onClick={() => setShowClearPasswordModal(false)}>
                    <ModalContent theme={themeObj} onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <ModalHeader theme={themeObj}>
                            <ModalTitleBlock theme={themeObj}>
                                <h2>Confirm Action</h2>
                                <p>Enter password to clear scan feed.</p>
                            </ModalTitleBlock>
                        </ModalHeader>
                        <div style={{ padding: '1rem 0' }}>
                            <PasswordInput
                                theme={themeObj}
                                type="password"
                                placeholder="Enter Password"
                                value={clearPassword}
                                onChange={e => setClearPassword(e.target.value)}
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleClearConfirm()}
                            />
                        </div>
                        <SettingsActions>
                            <SecondaryBtn theme={themeObj} onClick={() => setShowClearPasswordModal(false)}>Cancel</SecondaryBtn>
                            <SecondaryBtn
                                theme={themeObj}
                                style={{ background: '#ef4444', color: '#fff', borderColor: '#ef4444' }}
                                onClick={handleClearConfirm}
                                disabled={verifyingClearPassword}
                            >
                                {verifyingClearPassword ? 'Checking...' : 'Clear Feed'}
                            </SecondaryBtn>
                        </SettingsActions>
                    </ModalContent>
                </ModalOverlay>
            )}

            {/* Settings Password Modal */}
            {showSettingsPasswordModal && (
                <ModalOverlay onClick={() => setShowSettingsPasswordModal(false)}>
                    <ModalContent theme={themeObj} onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <ModalHeader theme={themeObj}>
                            <ModalTitleBlock theme={themeObj}>
                                <h2>Restricted Area</h2>
                                <p>Enter password to access settings.</p>
                            </ModalTitleBlock>
                        </ModalHeader>
                        <div style={{ padding: '1rem 0' }}>
                            <PasswordInput
                                theme={themeObj}
                                type="password"
                                placeholder="Enter Settings Password"
                                value={settingsPassword}
                                onChange={e => setSettingsPassword(e.target.value)}
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleSettingsPasswordConfirm()}
                            />
                        </div>
                        <SettingsActions>
                            <SecondaryBtn theme={themeObj} onClick={() => setShowSettingsPasswordModal(false)}>Cancel</SecondaryBtn>
                            <SecondaryBtn
                                theme={themeObj}
                                style={{ background: themeObj.ACCENT, color: '#fff', borderColor: themeObj.ACCENT }}
                                onClick={handleSettingsPasswordConfirm}
                                disabled={verifyingSettingsPassword}
                            >
                                {verifyingSettingsPassword ? 'Checking...' : 'Access Settings'}
                            </SecondaryBtn>
                        </SettingsActions>
                    </ModalContent>
                </ModalOverlay>
            )}

            {/* Late Toggle Password Modal */}
            {showLatePasswordModal && (
                <ModalOverlay onClick={() => setShowLatePasswordModal(false)}>
                    <ModalContent theme={themeObj} onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <ModalHeader theme={themeObj}>
                            <ModalTitleBlock theme={themeObj}>
                                <h2>Disable Mark Late</h2>
                                <p>Enter password to turn off late marking.</p>
                            </ModalTitleBlock>
                        </ModalHeader>
                        <div style={{ padding: '1rem 0' }}>
                            <PasswordInput
                                theme={themeObj}
                                type="password"
                                placeholder="Enter Password"
                                value={latePassword}
                                onChange={e => setLatePassword(e.target.value)}
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleLatePasswordConfirm()}
                            />
                        </div>
                        <SettingsActions>
                            <SecondaryBtn theme={themeObj} onClick={() => setShowLatePasswordModal(false)}>Cancel</SecondaryBtn>
                            <SecondaryBtn
                                theme={themeObj}
                                style={{ background: '#ef4444', color: '#fff', borderColor: '#ef4444' }}
                                onClick={handleLatePasswordConfirm}
                            >
                                Confirm
                            </SecondaryBtn>
                        </SettingsActions>
                    </ModalContent>
                </ModalOverlay>
            )}

            {/* Settings Modal */}
            {showSettings && attnSettings && ReactDOM.createPortal(
                <ModalOverlay onClick={() => setShowSettings(false)}>
                    <ModalContent theme={themeObj} onClick={e => e.stopPropagation()}>
                        <ModalHeader theme={themeObj}>
                            <ModalTitleBlock theme={themeObj}>
                                <h2><SettingsIcon /> Attendance Settings</h2>
                                <p>Configure rules for RFID scanning and automation.</p>
                            </ModalTitleBlock>
                        </ModalHeader>

                        <SettingsGrid>
                            <FormGroup>
                                <Label theme={themeObj}>Student Arrival Time</Label>
                                <TimeInput
                                    theme={themeObj}
                                    type="time"
                                    value={attnSettings.student_start_time || '08:00'}
                                    onChange={e => setAttnSettings({ ...attnSettings, student_start_time: e.target.value })}
                                />
                                <InputHint theme={themeObj}>Base arrival time.</InputHint>
                            </FormGroup>

                            <FormGroup>
                                <Label theme={themeObj}>Staff Arrival Time</Label>
                                <TimeInput
                                    theme={themeObj}
                                    type="time"
                                    value={attnSettings.staff_start_time || '08:00'}
                                    onChange={e => setAttnSettings({ ...attnSettings, staff_start_time: e.target.value })}
                                />
                                <InputHint theme={themeObj}>Base arrival time.</InputHint>
                            </FormGroup>

                            <FormGroup>
                                <Label theme={themeObj}>Staff Check-Out Start</Label>
                                <TimeInput
                                    theme={themeObj}
                                    type="time"
                                    value={attnSettings.staff_end_time || '14:00'}
                                    onChange={e => setAttnSettings({ ...attnSettings, staff_end_time: e.target.value })}
                                />
                                <InputHint theme={themeObj}>Blocks early check-out.</InputHint>
                            </FormGroup>

                            <FormGroup>
                                <Label theme={themeObj}>Grace Period (Minutes)</Label>
                                <TimeInput
                                    theme={themeObj}
                                    type="number"
                                    value={attnSettings.grace_period_minutes}
                                    onChange={e => setAttnSettings({ ...attnSettings, grace_period_minutes: parseInt(e.target.value) || 0 })}
                                />
                                <InputHint theme={themeObj}>Applied to both.</InputHint>
                            </FormGroup>

                            <FormGroup>
                                <Label theme={themeObj}>Student Auto-Absent Cutoff</Label>
                                <TimeInput
                                    theme={themeObj}
                                    type="time"
                                    value={attnSettings.student_cutoff_time || '08:15'}
                                    onChange={e => setAttnSettings({ ...attnSettings, student_cutoff_time: e.target.value })}
                                />
                                <InputHint theme={themeObj}>Auto-absent after this time.</InputHint>
                            </FormGroup>

                            <FormGroup>
                                <Label theme={themeObj}>Staff Auto-Absent Cutoff</Label>
                                <TimeInput
                                    theme={themeObj}
                                    type="time"
                                    value={attnSettings.staff_cutoff_time || '08:15'}
                                    onChange={e => setAttnSettings({ ...attnSettings, staff_cutoff_time: e.target.value })}
                                />
                                <InputHint theme={themeObj}>Auto-absent after this time.</InputHint>
                            </FormGroup>

                            <FormGroup>
                                <Label theme={themeObj}>Timezone</Label>
                                <TimeInput
                                    theme={themeObj}
                                    type="text"
                                    value={attnSettings.timezone || 'Asia/Karachi'}
                                    onChange={e => setAttnSettings({ ...attnSettings, timezone: e.target.value })}
                                    placeholder="Asia/Karachi"
                                />
                                <InputHint theme={themeObj}>Used when app is closed.</InputHint>
                            </FormGroup>

                            <WideFormGroup>
                                <Label theme={themeObj}>Mark Late</Label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
                                    <ToggleCard theme={themeObj}>
                                        <input
                                            type="checkbox"
                                            checked={!!attnSettings.student_mark_late_enabled}
                                            onChange={e => setAttnSettings({
                                                ...attnSettings,
                                                student_mark_late_enabled: e.target.checked
                                            })}
                                            style={{ marginTop: 4 }}
                                        />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                            <span style={{ fontWeight: 700 }}>Students</span>
                                            <span style={{ fontSize: '0.78rem', lineHeight: 1.35, color: themeObj.TEXT_SECONDARY }}>
                                                Enable late marking for student scans.
                                            </span>
                                        </div>
                                    </ToggleCard>
                                    <ToggleCard theme={themeObj}>
                                        <input
                                            type="checkbox"
                                            checked={!!attnSettings.staff_mark_late_enabled}
                                            onChange={e => setAttnSettings({
                                                ...attnSettings,
                                                staff_mark_late_enabled: e.target.checked
                                            })}
                                            style={{ marginTop: 4 }}
                                        />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                            <span style={{ fontWeight: 700 }}>Staff</span>
                                            <span style={{ fontSize: '0.78rem', lineHeight: 1.35, color: themeObj.TEXT_SECONDARY }}>
                                                Enable late marking for staff scans.
                                            </span>
                                        </div>
                                    </ToggleCard>
                                </div>
                                <InputHint theme={themeObj}>If disabled, late arrivals are marked present instead.</InputHint>
                            </WideFormGroup>

                            <WideFormGroup>
                                <Label theme={themeObj}>Auto-Mark Missing Attendance</Label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
                                    <ToggleCard theme={themeObj}>
                                        <input
                                            type="checkbox"
                                            checked={!!attnSettings.student_auto_mark_absent_enabled}
                                            onChange={e => setAttnSettings({
                                                ...attnSettings,
                                                student_auto_mark_absent_enabled: e.target.checked,
                                                auto_mark_absent_enabled: e.target.checked || !!attnSettings.staff_auto_mark_absent_enabled
                                            })}
                                            style={{ marginTop: 4 }}
                                        />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                            <span style={{ fontWeight: 700 }}>Students</span>
                                            <span style={{ fontSize: '0.78rem', lineHeight: 1.35, color: themeObj.TEXT_SECONDARY }}>
                                                Backend auto-absent for students.
                                            </span>
                                        </div>
                                    </ToggleCard>
                                    <ToggleCard theme={themeObj}>
                                        <input
                                            type="checkbox"
                                            checked={!!attnSettings.staff_auto_mark_absent_enabled}
                                            onChange={e => setAttnSettings({
                                                ...attnSettings,
                                                staff_auto_mark_absent_enabled: e.target.checked,
                                                auto_mark_absent_enabled: !!attnSettings.student_auto_mark_absent_enabled || e.target.checked
                                            })}
                                            style={{ marginTop: 4 }}
                                        />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                            <span style={{ fontWeight: 700 }}>Staff</span>
                                            <span style={{ fontSize: '0.78rem', lineHeight: 1.35, color: themeObj.TEXT_SECONDARY }}>
                                                Backend auto-absent for staff.
                                            </span>
                                        </div>
                                    </ToggleCard>
                                </div>
                                <InputHint theme={themeObj}>Runs in backend and skips Sundays and holidays.</InputHint>
                            </WideFormGroup>
                        </SettingsGrid>

                        <SettingsActions>
                            <SecondaryBtn theme={themeObj} style={{ minWidth: 140 }} onClick={() => setShowSettings(false)}>
                                Cancel
                            </SecondaryBtn>
                            <SecondaryBtn
                                theme={themeObj}
                                style={{ minWidth: 180, background: '#3b82f6', color: '#fff', borderColor: '#3b82f6' }}
                                onClick={async () => {
                                    setSavingSettings(true);
                                    try {
                                        const normalizedSettings = {
                                            ...attnSettings,
                                            student_start_time: toDbTime(attnSettings.student_start_time, '08:00'),
                                            staff_start_time: toDbTime(attnSettings.staff_start_time, '08:00'),
                                            staff_end_time: toDbTime(attnSettings.staff_end_time, '14:00'),
                                            student_cutoff_time: toDbTime(attnSettings.student_cutoff_time, '08:15'),
                                            staff_cutoff_time: toDbTime(attnSettings.staff_cutoff_time, '08:15'),
                                            timezone: (attnSettings.timezone || 'Asia/Karachi').trim() || 'Asia/Karachi',
                                            auto_mark_absent_enabled:
                                                !!attnSettings.student_auto_mark_absent_enabled ||
                                                !!attnSettings.staff_auto_mark_absent_enabled
                                        };
                                        const { error } = await supabase
                                            .from('attendance_settings')
                                            .upsert({
                                                school_id: user?.school_id,
                                                ...normalizedSettings,
                                                updated_at: new Date().toISOString()
                                            }, { onConflict: 'school_id' });
                                        if (error) throw error;
                                        await loadAutomationOverview();
                                        setShowSettings(false);
                                    } catch (err: any) {
                                        alert('Failed to save settings: ' + err.message);
                                    } finally {
                                        setSavingSettings(false);
                                    }
                                }}
                                disabled={savingSettings}
                            >
                                {savingSettings ? 'Saving...' : <><SaveIcon /> Save Changes</>}
                            </SecondaryBtn>
                            <SecondaryBtn
                                theme={themeObj}
                                style={{ minWidth: 190, background: '#f59e0b', color: '#fff', borderColor: '#f59e0b' }}
                                onClick={triggerManualAbsentMark}
                                disabled={manualMarkInProgress}
                            >
                                {manualMarkInProgress ? 'Marking Absents...' : (<><BoltIcon style={{ fontSize: 16 }} /> Mark Absents Now</>)}
                            </SecondaryBtn>
                        </SettingsActions>
                    </ModalContent>
                </ModalOverlay>
            , document.body)}

            {/* Mapping Sync Progress Indicator (Inline) */}
            {mappingSyncing && (
                <SyncProgressBanner theme={themeObj}>
                    <div className="banner-content">
                        <div className="status-row">
                            <div className="status-label">
                                <CloudSyncIcon className="sync-icon" />
                                <span>{mappingProgress.status || 'Preparing offline data...'}</span>
                            </div>
                            <div className="percent-label">
                                {mappingProgress.total > 0 ? Math.round((mappingProgress.current / mappingProgress.total) * 100) : 0}%
                            </div>
                        </div>
                        <ProgressBar theme={themeObj} style={{ height: 6 }}>
                            <ProgressFill
                                theme={themeObj}
                                $percent={mappingProgress.total > 0 ? (mappingProgress.current / mappingProgress.total) * 100 : 0}
                            />
                        </ProgressBar>
                    </div>
                </SyncProgressBanner>
            )}

            <MainGrid>
                {/* ── Left: Scanner ── */}
                <ScannerCard theme={themeObj}>
                    <ScannerUpper>
                        <ScanArea $status={scanStatus}>
                            {scanIcon}
                            <ScanLineBar $active={scanStatus === 'idle'} />
                        </ScanArea>

                        <StatusText $status={scanStatus} theme={themeObj}>{statusMsg}</StatusText>
                        <SubText theme={themeObj}>
                            {scanStatus === 'idle'
                                ? 'Hold RFID card near the USB reader'
                                : scanStatus === 'success'
                                    ? 'Attendance marked successfully'
                                    : 'Scan failed \u2013 see feed for details'}
                        </SubText>
                    </ScannerUpper>

                    {/* Stats */}
                    <StatsRow>
                        <StatBox $color="#22c55e">
                            <StatNum $color="#22c55e" theme={themeObj}>{presentCount}</StatNum>
                            <StatLabel theme={themeObj}>Marked Present</StatLabel>
                        </StatBox>
                        <StatBox $color="#ef4444">
                            <StatNum $color="#ef4444" theme={themeObj}>{unknownCount}</StatNum>
                            <StatLabel theme={themeObj}>Unknown Cards</StatLabel>
                        </StatBox>
                        <StatBox $color="#eab308">
                            <StatNum $color="#eab308" theme={themeObj}>{dupCount}</StatNum>
                            <StatLabel theme={themeObj}>Duplicates</StatLabel>
                        </StatBox>
                        <StatBox $color="#3b82f6">
                            <StatNum $color="#3b82f6" theme={themeObj}>{presentCount + unknownCount + dupCount}</StatNum>
                            <StatLabel theme={themeObj}>Total Scans</StatLabel>
                        </StatBox>
                    </StatsRow>

                    {/* Hidden input to capture USB reader output */}
                    <HiddenInput
                        ref={hiddenInputRef}
                        type="text"
                        id="rfid-hidden-input"
                        autoFocus
                        readOnly
                    />

                    {isNfcSupported ? (
                        <MobileNfcBtn $active={isNfcScanning} onClick={handleStartNfc}>
                            <NfcIcon style={{ fontSize: 20 }} />
                            {isNfcScanning ? 'NFC Scanner Active...' : 'Tap to use Mobile NFC'}
                        </MobileNfcBtn>
                    ) : (
                        !isSecureContext && (
                            <NfcDiagnosticTxt theme={themeObj}>
                                NFC blocked: Use <b>HTTPS</b> to enable mobile scanning.
                            </NfcDiagnosticTxt>
                        )
                    )}
                </ScannerCard>

                {/* ── Right: Live Feed ── */}
                <FeedCard theme={themeObj}>
                    <FeedHeader theme={themeObj}>
                        <FeedTitle theme={themeObj}>
                            <Clock style={{ fontSize: 16 }} />
                            Live Scan Feed
                        </FeedTitle>
                        <FeedHeaderActions>
                            <ClearBtn theme={themeObj} onClick={openClearPasswordModal}>
                                <RefreshCw style={{ fontSize: 14 }} />
                                Clear
                            </ClearBtn>
                            <FeedSearch
                                theme={themeObj}
                                type="text"
                                value={feedSearch}
                                onChange={e => setFeedSearch(e.target.value)}
                                placeholder="Search scans..."
                            />
                        </FeedHeaderActions>
                    </FeedHeader>

                    <FeedSplitGrid>
                        {/* Employees Column */}
                        <FeedSection theme={themeObj}>
                            <SectionHeader theme={themeObj} $mode="employee">
                                <span>Employees</span>
                                <SectionHeaderStats>
                                    <SectionHeaderBadge>{employeeFeedPresentCount} present</SectionHeaderBadge>
                                    <SectionHeaderBadge $variant="late" $dimmed={employeeFeedLateCount === 0}>
                                        {employeeFeedLateCount} late
                                    </SectionHeaderBadge>
                                </SectionHeaderStats>
                            </SectionHeader>
                            <SectionBody>
                                <FeedList>
                                    {filteredEmployeeFeed.length === 0 ? (
                                        <EmptyFeed theme={themeObj}>
                                            <Scan style={{ fontSize: 32, opacity: 0.3 }} />
                                            <span>{feedSearch.trim() ? 'No matching employee scans' : 'No employee scans'}</span>
                                        </EmptyFeed>
                                    ) : (
                                        filteredEmployeeFeed.map(item => (
                                            <FeedItem 
                                                key={item.id} 
                                                $type={item.type} 
                                                $personType={item.personType} 
                                                $new={item.isNew} 
                                                $attendanceStatus={item.attendanceStatus} 
                                                theme={themeObj}
                                                onClick={() => {
                                                    if (item.personId) {
                                                        fetchPersonMonthlyStats(item.personId, item.personType, item.name);
                                                    }
                                                }}
                                                style={{ cursor: item.personId ? 'pointer' : 'default' }}
                                            >
                                                <FeedIcon $type={item.type} $personType={item.personType}>
                                                    {item.type === 'success' ? <UserCheck style={{ fontSize: 16 }} /> :
                                                        item.type === 'warn' ? <AlertCircle style={{ fontSize: 16 }} /> :
                                                            <XCircle style={{ fontSize: 16 }} />}
                                                </FeedIcon>
                                                <FeedInfo>
                                                    <FeedName theme={themeObj}>
                                                        {item.name}
                                                        {item.personType === 'student' && item.fatherName && (
                                                            <>
                                                                {' - '}
                                                                <FeedFatherName theme={themeObj}>{item.fatherName}</FeedFatherName>
                                                            </>
                                                        )}
                                                    </FeedName>
                                                    {renderFeedSub(item, themeObj)}
                                                </FeedInfo>
                                                <FeedTime>
                                                    {item.attendanceStatus && (
                                                        <FeedAttendanceStatus $status={item.attendanceStatus}>
                                                            {item.attendanceStatus === 'late'
                                                                ? `Late${item.attendanceLateCount ? ` (${item.attendanceLateCount})` : ''}`
                                                                : item.attendanceStatus === 'checked_out'
                                                                    ? 'Check Out'
                                                                    : 'Present'}
                                                        </FeedAttendanceStatus>
                                                    )}
                                                    <FeedTimeLabel theme={themeObj}>{item.time}</FeedTimeLabel>
                                                </FeedTime>
                                            </FeedItem>
                                        ))
                                    )}
                                </FeedList>
                            </SectionBody>
                        </FeedSection>

                        {/* Students Column */}
                        <FeedSection theme={themeObj}>
                            <SectionHeader theme={themeObj} $mode="student">
                                <span>Students</span>
                                <SectionHeaderStats>
                                    <SectionHeaderBadge>{studentFeedPresentCount} present</SectionHeaderBadge>
                                    <SectionHeaderBadge $variant="late" $dimmed={studentFeedLateCount === 0}>
                                        {studentFeedLateCount} late
                                    </SectionHeaderBadge>
                                </SectionHeaderStats>
                            </SectionHeader>
                            <SectionBody>
                                <FeedList>
                                    {filteredStudentFeed.length === 0 ? (
                                        <EmptyFeed theme={themeObj}>
                                            <Scan style={{ fontSize: 32, opacity: 0.3 }} />
                                            <span>{feedSearch.trim() ? 'No matching student scans' : 'No student scans'}</span>
                                        </EmptyFeed>
                                    ) : (
                                        filteredStudentFeed.map(item => (
                                            <FeedItem 
                                                key={item.id} 
                                                $type={item.type} 
                                                $personType={item.personType} 
                                                $new={item.isNew} 
                                                $attendanceStatus={item.attendanceStatus} 
                                                theme={themeObj}
                                                onClick={() => {
                                                    if (item.personId) {
                                                        fetchPersonMonthlyStats(item.personId, item.personType, item.name);
                                                    }
                                                }}
                                                style={{ cursor: item.personId ? 'pointer' : 'default' }}
                                            >
                                                <FeedIcon $type={item.type} $personType={item.personType}>
                                                    {item.type === 'success' ? <UserCheck style={{ fontSize: 16 }} /> :
                                                        item.type === 'warn' ? <AlertCircle style={{ fontSize: 16 }} /> :
                                                            <XCircle style={{ fontSize: 16 }} />}
                                                </FeedIcon>
                                                <FeedInfo>
                                                    <FeedName theme={themeObj}>
                                                        {item.name}
                                                        {item.personType === 'student' && item.fatherName && (
                                                            <>
                                                                {' - '}
                                                                <FeedFatherName theme={themeObj}>{item.fatherName}</FeedFatherName>
                                                            </>
                                                        )}
                                                    </FeedName>
                                                    {renderFeedSub(item, themeObj)}
                                                </FeedInfo>
                                                <FeedTime>
                                                    {item.attendanceStatus && (
                                                        <FeedAttendanceStatus $status={item.attendanceStatus}>
                                                            {item.attendanceStatus === 'late'
                                                                ? `Late${item.attendanceLateCount ? ` (${item.attendanceLateCount})` : ''}`
                                                                : item.attendanceStatus === 'checked_out'
                                                                    ? 'Check Out'
                                                                    : 'Present'}
                                                        </FeedAttendanceStatus>
                                                    )}
                                                    <FeedTimeLabel theme={themeObj}>{item.time}</FeedTimeLabel>
                                                </FeedTime>
                                            </FeedItem>
                                        ))
                                    )}
                                </FeedList>
                            </SectionBody>
                        </FeedSection>
                    </FeedSplitGrid>
                </FeedCard>
            </MainGrid>

            {/* Floating action button: Mark Absents Now (bottom-right) */}
            <FloatingFab onClick={triggerManualAbsentMark} aria-label="Mark Absents Now" title="Mark Absents Now" disabled={manualMarkInProgress}>
                <span style={{ fontWeight: 900, fontSize: 20, color: '#fff' }}>A</span>
            </FloatingFab>

            {/* Sync Progress Overlay */}
            {isSyncing && syncProgress.total > 0 && (
                <SyncOverlay>
                    <SyncModal theme={themeObj}>
                        <CloudSyncIcon style={{ fontSize: 48, color: themeObj.ACCENT }} />
                        <div>
                            <h2 style={{ margin: '0 0 0.5rem 0', color: themeObj.TEXT_PRIMARY }}>Syncing Data</h2>
                            <p style={{ margin: 0, color: themeObj.TEXT_SECONDARY }}>
                                Please wait while we upload {syncProgress.total} attendance records...
                            </p>
                        </div>

                        <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                                <span style={{ color: themeObj.TEXT_SECONDARY }}>Progress</span>
                                <span style={{ fontWeight: 700, color: themeObj.ACCENT }}>
                                    {syncProgress.current} / {syncProgress.total}
                                </span>
                            </div>
                            <ProgressBar theme={themeObj}>
                                <ProgressFill
                                    theme={themeObj}
                                    $percent={(syncProgress.current / syncProgress.total) * 100}
                                />
                            </ProgressBar>
                        </div>

                        <p style={{ fontSize: '0.75rem', color: themeObj.TEXT_SECONDARY, fontStyle: 'italic' }}>
                            Do not close this page until the sync is complete.
                        </p>
                    </SyncModal>
                </SyncOverlay>
            )}

            {/* Success Modal */}
            {showSuccess && (
                <SyncOverlay onClick={() => setShowSuccess(false)}>
                    <SyncModal theme={themeObj} onClick={e => e.stopPropagation()}>
                        <SyncSuccessIcon>
                            <BadgeCheck />
                        </SyncSuccessIcon>
                        <div>
                            <h2 style={{ margin: '0 0 0.5rem 0', color: themeObj.TEXT_PRIMARY }}>Sync Successful!</h2>
                            <p style={{ margin: 0, color: themeObj.TEXT_SECONDARY }}>
                                All offline attendance records have been processed.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%' }}>
                            <StatBox $color="#22c55e" style={{ background: 'rgba(34, 197, 94, 0.05)' }}>
                                <StatNum $color="#22c55e" style={{ fontSize: '1.2rem' }}>{syncStats.success}</StatNum>
                                <StatLabel>Uploaded</StatLabel>
                            </StatBox>
                            <StatBox $color="#ef4444" style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                                <StatNum $color="#ef4444" style={{ fontSize: '1.2rem' }}>{syncStats.failed}</StatNum>
                                <StatLabel>Failed</StatLabel>
                            </StatBox>
                        </div>

                        <CloseBtn theme={themeObj} onClick={() => setShowSuccess(false)}>
                            Great, thanks!
                        </CloseBtn>
                    </SyncModal>
                </SyncOverlay>
            )}

            {/* Attendance Popups */}
            {showPopup && popupData && (
                <FullScreenPopup $status={popupData.status} onClick={closePopup}>
                    <PopupProgressBar>
                        <PopupProgressFill $progress={popupProgress} />
                    </PopupProgressBar>
                    <PopupDismiss>Auto-dismissing in a few seconds...</PopupDismiss>
                    <PopupContent>
                        <PopupImage
                            src={popupData.picture_url || 'https://placehold.co/400x400?text=No+Photo'}
                            alt="Profile"
                            onError={(e: any) => { 
                                e.target.onerror = null; 
                                e.target.src = 'https://placehold.co/400x400?text=No+Photo'; 
                            }}
                        />
                        <PopupInfoWrapper>
                            <PopupName $color={popupData.nameColor}>{popupData.name}</PopupName>
                            {popupData.subInfo?.trim() ? (
                                <PopupSubInfo $color={popupData.subColor}>{popupData.subInfo}</PopupSubInfo>
                            ) : null}
                            <PopupStatus $status={popupData.status} $bgColor={popupData.statusBgColor}>
                                {popupData.status === 'late' ? 'LATE' :
                                    popupData.status === 'checked_out' ? 'CHECK OUT' :
                                        popupData.status === 'error' ? 'ERROR' :
                                            popupData.status === 'offline' ? 'OFFLINE' : 'PRESENT'}
                            </PopupStatus>
                            <PopupTime>{popupData.time}</PopupTime>
                        </PopupInfoWrapper>
                    </PopupContent>
                </FullScreenPopup>
            )}

            {/* Person Monthly Stats Modal */}
            {selectedPersonStats.isOpen && (
                <ModalOverlay onClick={() => setSelectedPersonStats(prev => ({ ...prev, isOpen: false }))}>
                    <ModalContent onClick={e => e.stopPropagation()} theme={themeObj} style={{ maxWidth: '400px' }}>
                        <ModalHeader theme={themeObj}>
                            <ModalTitleBlock theme={themeObj}>
                                <h2>{selectedPersonStats.name}</h2>
                                <p>Attendance for Current Month</p>
                            </ModalTitleBlock>
                            <HeaderBtn theme={themeObj} onClick={() => setSelectedPersonStats(prev => ({ ...prev, isOpen: false }))}>
                                <XCircle />
                            </HeaderBtn>
                        </ModalHeader>
                        {selectedPersonStats.loading ? (
                            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading stats...</div>
                        ) : selectedPersonStats.stats ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem 0' }}>
                                <StatBox theme={themeObj} $color={themeObj.TEXT_PRIMARY}>
                                    <StatNum $color={themeObj.TEXT_PRIMARY}>{selectedPersonStats.stats.total}</StatNum>
                                    <StatLabel theme={themeObj}>Total Days</StatLabel>
                                </StatBox>
                                <StatBox theme={themeObj} $color="#22c55e">
                                    <StatNum $color="#22c55e">{selectedPersonStats.stats.present}</StatNum>
                                    <StatLabel theme={themeObj}>Present</StatLabel>
                                </StatBox>
                                <StatBox theme={themeObj} $color="#f59e0b">
                                    <StatNum $color="#f59e0b">{selectedPersonStats.stats.late}</StatNum>
                                    <StatLabel theme={themeObj}>Late</StatLabel>
                                </StatBox>
                                <StatBox theme={themeObj} $color="#ef4444">
                                    <StatNum $color="#ef4444">{selectedPersonStats.stats.absent}</StatNum>
                                    <StatLabel theme={themeObj}>Absent</StatLabel>
                                </StatBox>
                                <StatBox theme={themeObj} $color="#3b82f6">
                                    <StatNum $color="#3b82f6">{selectedPersonStats.stats.leave}</StatNum>
                                    <StatLabel theme={themeObj}>Leave</StatLabel>
                                </StatBox>
                                <StatBox theme={themeObj} $color="#a855f7">
                                    <StatNum $color="#a855f7">{selectedPersonStats.stats.halfLeaves}</StatNum>
                                    <StatLabel theme={themeObj}>Half Leave</StatLabel>
                                </StatBox>
                            </div>
                        ) : (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>Failed to load stats</div>
                        )}
                    </ModalContent>
                </ModalOverlay>
            )}
        </Page>
    );
};

export default RFIDAttendancePage;

const MobileNfcBtn = styled.button<{ $active: boolean }>`
    ${clayButtonStyle}
    width: 100%;
    padding: 0.8rem;
    font-weight: 700;
    margin-top: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    background: ${({ $active }) => $active ? '#22c55e' : 'rgba(59, 130, 246, 0.1)'};
    color: ${({ $active }) => $active ? '#fff' : '#3b82f6'};
    border-color: ${({ $active }) => $active ? '#22c55e' : 'rgba(59, 130, 246, 0.2)'};

    &:hover {
        background: ${({ $active }) => $active ? '#16a34a' : 'rgba(59, 130, 246, 0.15)'};
    }
`;

const NfcDiagnosticTxt = styled.div<{ theme: any }>`
    font-size: 0.72rem;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    text-align: center;
    margin-top: 0.8rem;
    padding: 0.4rem;
    background: ${({ theme }) => theme.FIELD_BG};
    border-radius: 8px;
    opacity: 0.8;

    b { color: ${({ theme }) => theme.ACCENT}; }
`;

const FeedListContainer = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
`;

const StatBoxItem = styled.div<{ $color: string }>`
    ${clayInsetStyle}
    padding: 0.6rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    border-radius: 14px;
`;
