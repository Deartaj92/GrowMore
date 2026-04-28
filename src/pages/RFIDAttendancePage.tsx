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
    Sensors as NfcIcon,
    Logout as LogoutIcon,
    Bolt as BoltIcon,
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

const scanLine = keyframes`
  0%   { top: 10%; opacity: 1; }
  50%  { opacity: 0.4; }
  100% { top: 90%; opacity: 1; }
`;

const rippleGreen = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
  100% { box-shadow: 0 0 0 40px rgba(34,197,94,0); }
`;

const rippleRed = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
  100% { box-shadow: 0 0 0 40px rgba(239,68,68,0); }
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
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.8rem 1rem;

  @media (max-width: 768px) {
    padding: 0.85rem;
    gap: 0.85rem;
    align-items: stretch;
  }
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: ${({ theme }) => getDashboardPalette(theme).titleText};
  display: flex;
  align-items: center;
  gap: 0.6rem;

  svg { color: ${({ theme }) => theme.ACCENT}; }

  @media (max-width: 768px) {
    font-size: 1.02rem;
    gap: 0.45rem;
  }
`;

const TopBarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: flex-end;

  @media (max-width: 768px) {
    width: 100%;
    gap: 0.6rem;
    flex-direction: column;
    align-items: stretch;
  }
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

const ModeToggle = styled.div`
  display: flex;
  background: ${({ theme }) => theme.CARD};
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  overflow: hidden;
`;

const ModeBtn = styled.button<{ $active?: boolean }>`
  padding: 0.45rem 1rem;
  font-size: 0.82rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  background: ${({ $active, theme }) => $active ? theme.ACCENT : 'transparent'};
  color: ${({ $active, theme }) => $active ? '#fff' : theme.TEXT_SECONDARY};

  &:hover { opacity: 0.85; }
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
  gap: 0.75rem;
  flex: 1;
  min-height: 0;
  align-items: stretch;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    min-height: auto;
  }
`;

// ── Scanner Card ───────────────────────────────────────────────────────────────

const ScannerCard = styled.div`
  ${clayCardStyle}
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 1.2rem;
  min-height: 0;

  @media (max-width: 768px) {
    padding: 1rem;
    gap: 0.9rem;
  }
`;

const ScanArea = styled.div<{ $status: 'idle' | 'success' | 'error' }>`
  ${clayInsetStyle}
  width: 188px;
  height: 188px;
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.4s;
  overflow: hidden;
  background: ${({ $status }) =>
        $status === 'success' ? 'rgba(34,197,94,0.12)' :
            $status === 'error' ? 'rgba(239,68,68,0.12)' :
                'rgba(59,130,246,0.06)'};
  animation: ${({ $status }) =>
        $status === 'success' ? css`${rippleGreen} 0.6s ease-out` :
            $status === 'error' ? css`${rippleRed} 0.6s ease-out` :
                css`${pulse} 2.5s ease-in-out infinite`};
  transition: color 0.3s;

  @media (max-width: 768px) {
    width: 146px;
    height: 146px;
    border-radius: 22px;

    svg {
      font-size: 46px !important;
    }
  }
`;

const ScanLineBar = styled.div<{ $active: boolean }>`
  position: absolute;
  left: 20%;
  width: 60%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #3b82f6, transparent);
  border-radius: 2px;
  animation: ${({ $active }) => $active ? css`${scanLine} 1.6s ease-in-out infinite` : 'none'};
  top: 50%;
  opacity: ${({ $active }) => $active ? 1 : 0};
  transition: opacity 0.3s;
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
  background: ${({ $color }) => `${$color}16`};
  border-color: ${({ $color }) => `${$color}33`};
  border-radius: ${CARD_RADIUS_MD};
  padding: 0.75rem;
  text-align: center;

  @media (max-width: 768px) {
    padding: 0.65rem 0.5rem;
  }
`;

const StatNum = styled.div<{ $color: string }>`
  font-size: 1.6rem;
  font-weight: 800;
  color: ${({ $color }) => $color};
  line-height: 1;

  @media (max-width: 768px) {
    font-size: 1.35rem;
  }
`;

const StatLabel = styled.div`
  font-size: 0.72rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 0.2rem;

  @media (max-width: 768px) {
    font-size: 0.68rem;
  }
`;

// ── Feed Panel ────────────────────────────────────────────────────────────────

const FeedCard = styled.div`
  ${clayCardStyle}
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;

  @media (max-width: 768px) {
    min-height: auto;
  }
`;

const FeedHeader = styled.div`
  padding: 1rem 1.2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${({ theme }) => getDashboardPalette(theme).divider};

  @media (max-width: 720px) {
    padding: 0.85rem;
    flex-direction: column;
    align-items: stretch;
    gap: 0.7rem;
  }
`;

const FeedTitle = styled.div`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 0.4rem;

  svg { color: ${({ theme }) => theme.ACCENT}; }
`;

const ClearBtn = styled.button`
  ${clayButtonStyle}
  color: ${({ theme }) => getButtonPalette(theme).secondaryText};
  font-size: 0.78rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.7rem;
  min-height: 32px;

  @media (max-width: 720px) {
    min-width: 92px;
    justify-content: center;
  }
`;

const FeedHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;

  @media (max-width: 720px) {
    width: 100%;
    justify-content: stretch;
    gap: 0.5rem;
  }
`;

const FeedSearch = styled.input`
  ${clayInputStyle}
  min-width: 240px;
  height: 34px;
  padding: 0.45rem 0.8rem;
  font-size: 0.82rem;

  @media (max-width: 720px) {
    min-width: 0;
    flex: 1;
  }
`;

const FeedSplitGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex: 1;
  min-height: 0;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const FeedList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 0;
`;

const FeedSection = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  border-right: 1px solid ${({ theme }) => getDashboardPalette(theme).divider};
  &:last-child { border-right: none; }

  @media (max-width: 1100px) {
    border-right: none;
    border-bottom: 1px solid ${({ theme }) => getDashboardPalette(theme).divider};
    &:last-child { border-bottom: none; }
  }

  @media (max-width: 768px) {
    min-height: 320px;
  }
`;

const SectionHeader = styled.div<{ $mode?: 'student' | 'employee' }>`
  padding: 0.6rem 1rem;
  background: ${({ theme, $mode }) => $mode === 'employee' ? 'rgba(168, 85, 247, 0.1)' : getDashboardPalette(theme).selectionBg};
  font-size: 0.78rem;
  font-weight: 700;
  color: ${({ theme, $mode }) => $mode === 'employee' ? '#a855f7' : getDashboardPalette(theme).subtleText};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${({ theme, $mode }) => $mode === 'employee' ? 'rgba(168, 85, 247, 0.24)' : getDashboardPalette(theme).divider};
`;

const SectionBody = styled.div`
  flex: 1;
  overflow-y: auto;
  min-height: 0;
`;

const FeedItem = styled.div<{ $type: 'success' | 'error' | 'warn'; $personType?: string; $new?: boolean; $attendanceStatus?: 'present' | 'late' | 'checked_out' }>`
  ${clayInsetStyle}
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: ${CARD_RADIUS_MD};
  border: 1px solid ${({ $type, $personType, $attendanceStatus }) =>
        $attendanceStatus === 'late' ? 'rgba(245, 158, 11, 0.38)' :
        $attendanceStatus === 'checked_out' ? 'rgba(59, 130, 246, 0.38)' :
        $attendanceStatus === 'present' ? 'rgba(34,197,94,0.35)' :
        $type === 'success' ? ($personType === 'employee' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(34,197,94,0.25)') :
            $type === 'error' ? 'rgba(239,68,68,0.25)' :
                'rgba(234,179,8,0.25)'};
  background: ${({ $type, $personType, $attendanceStatus }) =>
        $attendanceStatus === 'late' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.14), rgba(245, 158, 11, 0.04))' :
        $attendanceStatus === 'checked_out' ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.14), rgba(59, 130, 246, 0.04))' :
        $attendanceStatus === 'present' ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.14), rgba(34, 197, 94, 0.04))' :
        $type === 'success' ? ($personType === 'employee' ? 'rgba(168, 85, 247, 0.06)' : 'rgba(34,197,94,0.06)') :
            $type === 'error' ? 'rgba(239,68,68,0.06)' :
                'rgba(234,179,8,0.06)'};
  animation: ${({ $new }) => $new ? css`${slideIn} 0.3s ease` : 'none'};

  @media (max-width: 768px) {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 0.6rem;
    padding: 0.7rem 0.8rem;
  }
`;

const FeedIcon = styled.div<{ $type: 'success' | 'error' | 'warn'; $personType?: string }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ $type, $personType }) =>
        $type === 'success' ? ($personType === 'employee' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(34,197,94,0.15)') :
            $type === 'error' ? 'rgba(239,68,68,0.15)' :
                'rgba(234,179,8,0.15)'};

  svg {
    color: ${({ $type, $personType }) =>
        $type === 'success' ? ($personType === 'employee' ? '#a855f7' : '#22c55e') :
            $type === 'error' ? '#ef4444' :
                '#eab308'};
  }
`;

const FeedInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const FeedName = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 768px) {
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
    line-height: 1.25;
  }
`;

const FeedFatherName = styled.span`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 600;
`;

const FeedSub = styled.div`
  font-size: 0.76rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};

  @media (max-width: 768px) {
    margin-top: 0.15rem;
    line-height: 1.3;
  }
`;

const FeedRollNumber = styled.span`
  font-weight: 800;
  color: #ec4899;
`;

const FeedTime = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
  text-align: right;
  min-width: 112px;

  @media (max-width: 768px) {
    width: calc(100% - 44px);
    min-width: 0;
    margin-left: calc(36px + 0.6rem);
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    text-align: left;
  }
`;

const FeedAttendanceStatus = styled.div<{ $status: 'present' | 'late' | 'checked_out' }>`
  font-size: 1.08rem;
  font-weight: 900;
  line-height: 1;
  color: ${({ $status }) => $status === 'late' ? '#f59e0b' : $status === 'checked_out' ? '#3b82f6' : '#22c55e'};
  text-transform: uppercase;
  letter-spacing: 0.05em;

  @media (max-width: 768px) {
    font-size: 0.92rem;
  }
`;

const FeedTimeLabel = styled.div`
  font-size: 0.84rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  white-space: nowrap;

  @media (max-width: 768px) {
    font-size: 0.78rem;
  }
`;

const TypeBadge = styled.span<{ $color: string }>`
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  background: ${({ $color }) => $color}22;
  color: ${({ $color }) => $color};
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

const EmptyFeed = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  gap: 0.75rem;
  font-size: 0.9rem;

  @media (max-width: 768px) {
    padding: 2rem 1rem;
    font-size: 0.82rem;
  }
`;

const renderFeedSub = (item: ScanResult, themeObj: any) => {
    if (!item.subAccent) {
        return <FeedSub theme={themeObj}>{item.sub}</FeedSub>;
    }

    return (
        <FeedSub theme={themeObj}>
            {item.sub}
            {' - '}
            <FeedRollNumber theme={themeObj}>{item.subAccent}</FeedRollNumber>
        </FeedSub>
    );
};

const matchesFeedSearch = (item: ScanResult, search: string) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    return [
        item.name,
        item.fatherName,
        item.sub,
        item.subAccent,
        item.time,
        item.attendanceStatus,
    ].some(value => String(value || '').toLowerCase().includes(query));
};

const MobileNfcBtn = styled.button<{ $active?: boolean }>`
  ${clayButtonStyle}
  background: ${({ $active, theme }) => $active ? getButtonPalette(theme).primaryBg : undefined};
  color: ${({ $active }) => $active ? '#fff' : '#3b82f6'};
  border: 1px solid ${({ $active }) => $active ? '#22c55e' : 'rgba(59, 130, 246, 0.2)'};
  padding: 0.6rem 1.2rem;
  font-size: 0.85rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  box-shadow: ${({ $active }) => $active ? '0 4px 15px rgba(34, 197, 94, 0.3)' : 'none'};

  @media (min-width: 1200px) {
    display: none; /* Hide on large desktop screens */
  }

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    padding: 0.7rem 1rem;
  }
`;

const NfcDiagnosticTxt = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: rgba(239, 68, 68, 0.05);
  border: 1px dashed rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  text-align: center;
`;


// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = 'student' | 'employee';

interface ScanResult {
    id: string;
    type: 'success' | 'error' | 'warn';
    name: string;
    fatherName?: string;
    sub: string;
    subAccent?: string;
    time: string;
    personType: Mode;
    attendanceStatus?: 'present' | 'late' | 'checked_out';
    attendanceLateCount?: number;
    isNew?: boolean;
    picture_url?: string;
}

interface PersistedDailyScanHistory {
    date: string;
    feed: ScanResult[];
    presentCount: number;
    unknownCount: number;
    dupCount: number;
}

const getLocalToday = () => new Date().toISOString().slice(0, 10);

const buildDailyScanStorageKey = (schoolId: number | string) =>
    `rfid-attendance:daily-scan-history:${schoolId}`;

const formatRecordedFeedTime = (value?: string | null) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const buildFeedItemFromHistory = (item: CachedAttendanceHistoryItem): ScanResult[] => {
    const personType: Mode = item.person_type === 'employee' ? 'employee' : 'student';
    const baseSub = personType === 'student'
        ? `${item.class_name || ''}${item.section_name ? ` (${item.section_name})` : ''}`.trim()
        : item.role || 'Staff';
    const subAccent = personType === 'student'
        ? (getStudentDisplayId({ id: item.person_id, roll_number: item.roll_number }) ? String(getStudentDisplayId({ id: item.person_id, roll_number: item.roll_number })) : undefined)
        : String(item.person_id);
    const entries: Array<ScanResult & { sortTime: string }> = [];

    if (item.check_in_time) {
        entries.push({
            id: `history-in-${item.key}`,
            type: 'success',
            name: item.name,
            fatherName: personType === 'student' ? item.father_name : undefined,
            sub: baseSub,
            subAccent,
            time: formatRecordedFeedTime(item.check_in_time),
            personType,
            attendanceStatus: item.status === 'late' ? 'late' : 'present',
            isNew: false,
            sortTime: item.check_in_time,
        });
    }

    if (personType === 'employee' && item.check_out_time) {
        entries.push({
            id: `history-out-${item.key}`,
            type: 'success',
            name: `${item.name} (OUT)`,
            sub: `Checked Out • ${item.role || 'Staff'}`,
            time: formatRecordedFeedTime(item.check_out_time),
            personType: 'employee',
            attendanceStatus: 'checked_out',
            isNew: false,
            sortTime: item.check_out_time,
        });
    }

    return entries
        .sort((a, b) => b.sortTime.localeCompare(a.sortTime))
        .map(({ sortTime, ...entry }) => entry);
};

const SecondaryBtn = styled.button`
  ${clayButtonStyle}
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(6px);
  z-index: 1000;
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

const FullScreenPopup = styled.div<{ $status: 'present' | 'late' | 'checked_out' | 'error' | 'offline' }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: ${({ $status }) =>
        $status === 'present' ? 'linear-gradient(135deg, rgba(34,197,94,0.97) 0%, rgba(22,163,74,1) 100%)' :
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
`;

const PopupProgressFill = styled.div<{ $progress: number }>`
  height: 100%;
  background: rgba(255,255,255,0.95);
  transition: width 0.05s linear;
  width: ${({ $progress }) => $progress}%;
  box-shadow: 0 0 10px rgba(255,255,255,0.5);
`;

const PopupContent = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 4.5rem;
  max-width: 1200px;
  width: 92%;
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
  flex: 1;
  min-width: 0;

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

const PopupIconWrapper = styled.div<{ $status: 'present' | 'late' | 'checked_out' | 'error' | 'offline' }>`
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: rgba(255,255,255,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2.5rem;
  animation: ${popupPulse} 0.6s ease-out;
  box-shadow: 0 25px 80px rgba(0,0,0,0.4);
  border: 4px solid rgba(255,255,255,0.3);
  
  svg {
    font-size: 90px;
    color: #fff;
    filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3));
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
  margin-top: 2rem;
  font-size: clamp(1.2rem, 4vw, 2rem);
  font-weight: 700;
  color: rgba(255,255,255,0.9);
  text-shadow: 0 2px 10px rgba(0,0,0,0.3);
`;

const PopupDismiss = styled.div`
  position: absolute;
  bottom: 2.5rem;
  font-size: 1rem;
  color: rgba(255,255,255,0.6);
  font-weight: 500;
`;


// ─── Component ────────────────────────────────────────────────────────────────

const RFIDAttendancePage: React.FC = () => {
    const { theme } = useTheme();
    const { showToast } = useToast();
    const themeObj = theme === 'dark' ? darkTheme : lightTheme;
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
    const [automationOverview, setAutomationOverview] = useState<any | null>(null);
    const [loadingAutomationOverview, setLoadingAutomationOverview] = useState(false);
    const [isNfcSupported, setIsNfcSupported] = useState(false);
    const [isNfcScanning, setIsNfcScanning] = useState(false);
    const nfcAbortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        setIsNfcSupported(('NDEFReader' in window) || (!!(window as any).nfc));
    }, []);

    const isSecureContext = window.isSecureContext;

    // Buffer for USB reader (acts like keyboard input)
    const bufferRef = useRef('');
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hiddenInputRef = useRef<HTMLInputElement>(null);
    const scanQueueRef = useRef<string[]>([]);
    const isProcessingQueueRef = useRef(false);
    const isProcessingRef = useRef(false); // Legacy ref for backward compat if needed, but we'll use isProcessingQueueRef mostly
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [queueCount, setQueueCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
    const [showSuccess, setShowSuccess] = useState(false);
    const [syncStats, setSyncStats] = useState({ success: 0, failed: 0 });
    const [scannedPerson, setScannedPerson] = useState<{ name: string } | null>(null);
    const navigationContext = useContext(UNSAFE_NavigationContext);
    const pendingNavigationRef = useRef<{ path: string; replace?: boolean; retry?: () => void } | null>(null);

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

    // Initial cache and queue check
    useEffect(() => {
        if (user?.school_id) {
            rfidOfflineService.cacheMappings(String(user.school_id));
            rfidOfflineService.cacheDailyAttendanceHistory(user.school_id, selectedDate).catch(error => {
                console.warn('Failed to prime cached RFID attendance history:', error);
            });
            rfidOfflineService.getQueue().then(q => setQueueCount(q.length));
        }

        const handleOnline = async () => {
            if (!user?.school_id) {
                setIsOnline(true);
                return;
            }

            setIsOnline(true);
            clearPersistedDailyHistory();

            try {
                await rfidOfflineService.cacheMappings(String(user.school_id));
                await rfidOfflineService.cacheDailyAttendanceHistory(user.school_id, selectedDate);
                await loadHistoryFeed(selectedDate);
                const q = await rfidOfflineService.getQueue();
                setQueueCount(q.length);
            } catch (error) {
                console.warn('Failed to refresh RFID state after reconnect:', error);
            }
        };
        const handleOffline = () => setIsOnline(false);
        const handleSyncCompleted = (e: any) => {
            const { success, failed } = e.detail;
            rfidOfflineService.getQueue().then(q => setQueueCount(q.length));
            if (success > 0) {
                console.log(`[RFIDPage] Background sync detected: ${success} success`);
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
                // Fallback / Default
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
    }, [loadHistoryFeed, selectedDate, user?.school_id]);

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
        // Trigger visible handleSync ONLY if:
        // 1. We just transitioned from offline to online
        // 2. We just loaded the page and are online with a pre-existing queue
        // (Any subsequent scan while online will NOT trigger this because prevOnlineRef.current will be true)
        const justCameOnline = isOnline && prevOnlineRef.current === false;
        const initialLoadWithQueue = isOnline && prevOnlineRef.current === null && queueCount > 0;
        
        if (isOnline && queueCount > 0 && !isSyncing && (justCameOnline || initialLoadWithQueue)) {
            handleSync();
        }
        
        prevOnlineRef.current = isOnline;
    }, [isOnline, queueCount, isSyncing]);

    // Auto-start NFC scanning logic - unified with GlobalNFCListener
    useEffect(() => {
        const checkAndSyncNfcStatus = async () => {
            // Wait for bridge
            await new Promise(resolve => setTimeout(resolve, 800));
            if (window.nfc) {
                // If native, the GlobalNFCListener is already handling it
                // We just update the local UI status
                setIsNfcScanning(true);
                setStatusMsg('NFC Scanner Active (Native Global)...');
            }
        };
        checkAndSyncNfcStatus();

        // On this page, we handle scans via both listeners, but GlobalNFCListener 
        // will show the toast. We can keep it or silence it. 
        // For now, let's just make sure we don't double bind if we don't have to.
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
        // Remove "new" flag after animation
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
                    personType: result.failed === 0 ? 'student' : 'employee', // Fallback for feed display
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
        
        // Clear any existing reset timer immediately when a new scan starts
        if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
        }

        const cleanUID = sanitizeRfidUid(uid);
        if (cleanUID.length < 4) {
            isProcessingRef.current = false;
            return;
        }

        setScanStatus('idle');
        setStatusMsg('Processing...');

        try {
            // result = { success, person, type }
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

            // UI Feedback
            setScannedPerson({ name: p.name });

            if (result.type === 'already' || result.type === 'already_out' || result.type === 'offline_already' || result.type === 'offline_already_out') {
                const isAlreadyOut = result.type === 'already_out' || result.type === 'offline_already_out';
                const status = isAlreadyOut ? 'checked_out' : (result.attendance_status === 'late' ? 'late' : 'present');
                
                setScanStatus('success');
                setStatusMsg(isAlreadyOut ? `✓ Already Left: ${p.name}` : `✓ Already Marked: ${p.name}`);
                setDupCount(c => c + 1);
                addFeedItem({
                    type: 'warn',
                    name: p.name,
                    sub: isAlreadyOut ? `Already checked out for today` : `Already marked ${status.toUpperCase()}`,
                    time,
                    personType
                });
                triggerPopup({
                    name: p.name,
                    subInfo: isAlreadyOut ? `Already checked out` : `Already marked ${status.toUpperCase()}`,
                    status: status,
                    time,
                    picture_url: p.picture_url
                });
            } else if (result.type === 'out') {
                setScanStatus('success');
                setStatusMsg(`OUT ✓ ${p.name}`);
                addFeedItem({
                    type: 'success',
                    name: `${p.name} (OUT)`,
                    sub: `Checked Out • ${p.role || 'Staff'}`,
                    time,
                    personType: 'employee',
                    attendanceStatus: 'checked_out'
                });
                triggerPopup({
                    name: p.name,
                    subInfo: p.role || 'Staff',
                    status: 'checked_out',
                    time,
                    picture_url: p.picture_url
                });
            } else {
                const isOffline = result.type === 'offline_present' || result.type === 'offline_late';
                const isOnlineResult = result.type === 'online_present' || result.type === 'online_late';
                const isLate = result.attendance_status === 'late';
                
                setScanStatus('success');
                setStatusMsg(isLate ? `LATE Arrival: ${p.name}` : `PRESENT: ${p.name}`);
                setPresentCount(c => c + 1);

                const studentDisplayId = getStudentDisplayId({ id: p.person_id, roll_number: p.roll_number });
                const subLabel = p.type === 'student'
                    ? `${p.class_name || ''}${p.section_name ? ` (${p.section_name})` : ''}`.trim()
                    : p.role || 'Staff';
                const subAccent = p.type === 'student'
                    ? (studentDisplayId ? String(studentDisplayId) : undefined)
                    : (p.person_id ? String(p.person_id) : undefined);

                if (isOffline) {
                    addFeedItem({
                        type: 'success',
                        name: `${p.name} (Offline)`,
                        fatherName: personType === 'student' ? p.father_name : undefined,
                        sub: `${subLabel} • ${isLate ? 'LATE' : 'PRESENT'}`,
                        subAccent,
                        time,
                        personType,
                    });

                    triggerPopup({
                        name: p.name,
                        subInfo: subLabel,
                        status: isLate ? 'late' : 'present',
                        time,
                        picture_url: p.picture_url
                    });

                    const q = await rfidOfflineService.getQueue();
                    setQueueCount(q.length);
                } else {
                    const lateCount = isLate
                        ? await fetchPersonMonthlyLateCount(p.person_id, personType, { includePendingToday: false })
                        : undefined;

                    addFeedItem({
                        type: 'success',
                        name: p.name,
                        fatherName: personType === 'student' ? p.father_name : undefined,
                        sub: subLabel,
                        subAccent,
                        time,
                        personType,
                        attendanceStatus: isLate ? 'late' : 'present',
                        attendanceLateCount: lateCount,
                    });

                    triggerPopup({
                        name: p.name,
                        subInfo: subLabel,
                        status: isLate ? 'late' : 'present',
                        time,
                        picture_url: p.picture_url
                    });
                }
            }

        } catch (err: any) {
            console.error('Scan processing error:', err);
            setScanStatus('error');
            setStatusMsg('Scan Failed');
            addFeedItem({
                type: 'error',
                name: 'System Error',
                sub: err?.message || 'Check connection',
                time: formatTime(),
                personType: 'student'
            });
        } finally {
            isProcessingRef.current = false;
            // Reset preview
            resetTimerRef.current = setTimeout(() => {
                setScanStatus('idle');
                setStatusMsg('Waiting for card scan...');
                setScannedPerson(null);
                resetTimerRef.current = null;
            }, 4000);
        }
    }, [user?.school_id, addFeedItem, selectedDate, fetchPersonMonthlyLateCount, triggerPopup]);

    const handleStartNfc = async () => {
        // --- 1. Pure Native Android APK (PhoneGap-NFC) ---
        if (window.nfc) {
            // On native, GlobalNFCListener is already active.
            // Toggling here just updates UI state or shows status.
            if (isNfcScanning) {
                setIsNfcScanning(false);
                setStatusMsg('NFC UI Feedback Deactivated');
            } else {
                setIsNfcScanning(true);
                setStatusMsg('NFC Scanner Active (Native)...');
            }
            return;
        }

        // --- 2. Standard Web Browser Browser (Web NFC) ---
        if (isNfcScanning) {
            if (nfcAbortControllerRef.current) {
                nfcAbortControllerRef.current.abort();
                nfcAbortControllerRef.current = null;
            }
            setIsNfcScanning(false);
            return;
        }

        try {
            const ndef = new window.NDEFReader();
            nfcAbortControllerRef.current = new AbortController();

            setIsNfcScanning(true);
            await ndef.scan({ signal: nfcAbortControllerRef.current.signal });

            ndef.onreadingerror = (event: any) => {
                console.error("NFC Reading Error:", event);
                setScanStatus('error');
                setStatusMsg('NFC Read Error: Hold card steady against the back of your phone');

                setTimeout(() => {
                    if (isNfcScanning) setStatusMsg('NFC Scanner Active...');
                }, 2000);
            };

            ndef.onreading = ({ serialNumber }: any) => {
                console.log("NFC Card detected:", serialNumber);
                if (serialNumber) {
                    const cleanUID = sanitizeRfidUid(serialNumber);
                    processUID(cleanUID);
                }
            };
        } catch (error: any) {
            setIsNfcScanning(false);
            if (error.name !== 'AbortError') {
                alert("NFC Error: " + error.message);
            }
        }
    };

    // Handle keyboard input from USB RFID reader
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Ignore modifier keys
        if (e.key === 'Shift' || e.key === 'CapsLock' || e.key === 'Alt' || e.key === 'Control') return;

        if (e.key === 'Enter') {
            // Card scan complete – process the buffered UID
            const uid = normalizeDesktopScannerUid(bufferRef.current);
            bufferRef.current = '';
            if (timerRef.current) clearTimeout(timerRef.current);
            if (uid.length >= 4) processUID(uid);
        } else if (e.key.length === 1) {
            bufferRef.current += e.key;
            // Auto-flush if no Enter comes within 100ms (some readers don't send Enter)
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                const uid = normalizeDesktopScannerUid(bufferRef.current);
                bufferRef.current = '';
                if (uid.length >= 4) processUID(uid);
            }, 120);
        }
    }, [processUID]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // UI synchronization with global background scanner
    useEffect(() => {
        const handleGlobalScan = async (e: any) => {
            const { uid, result } = e.detail;
            if (!result || !result.person) return;

            const time = result.recorded_time
                ? new Date(result.recorded_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                : formatTime();
            const p = result.person;
            const personType = p.type === 'student' ? 'student' : 'employee';

            // UI Feedback update
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
                showToast(`Too Early to Check Out!`, 'error');
                return;
            }

            if (result.type === 'error_inactive') {
                const statusLabel = (p.status || 'inactive').replace('_', ' ');
                setScanStatus('error');
                setStatusMsg(`Not Active: ${p.name}`);
                addFeedItem({
                    type: 'error',
                    name: p.name,
                    sub: `Status: ${statusLabel} — Attendance rejected`,
                    time,
                    personType
                });
                showToast(`Already Checked Out!`, 'error');
                return;
            }

            if (result.type === 'error_manual_only') {
                setScanStatus('error');
                setStatusMsg(`Manual Only: ${p.name}`);
                addFeedItem({
                    type: 'warn',
                    name: p.name,
                    sub: 'Manual-only attendance policy enabled',
                    time,
                    personType
                });
                showToast(`${p.name} is set to manual-only attendance`, 'error');
                return;
            }

            if (result.type === 'already' || result.type === 'already_out') {
                const isAlreadyOut = result.type === 'already_out';
                setScanStatus('error');
                setStatusMsg(isAlreadyOut ? `Already Left: ${p.name}` : `Already marked: ${p.name}`);
                setDupCount(c => c + 1);
                addFeedItem({
                    type: 'warn',
                    name: p.name,
                    sub: isAlreadyOut ? `Already checked out for today` : `Already marked Present`,
                    time,
                    personType
                });
                triggerPopup({
                    name: p.name,
                    subInfo: isAlreadyOut ? `Already checked out` : `Already marked Present`,
                    status: 'error',
                    time,
                });
            } else if (result.type === 'out') {
                setScanStatus('success');
                setStatusMsg(`OUT ✓ ${p.name}`);
                addFeedItem({
                    type: 'success',
                    name: `${p.name} (OUT)`,
                    sub: `Checked Out • ${p.role || 'Staff'}`,
                    time,
                    personType: 'employee',
                    attendanceStatus: 'checked_out'
                });
                triggerPopup({
                    name: p.name,
                    subInfo: p.role || 'Staff',
                    status: 'checked_out',
                    time,
                });
            } else {
                const isOffline = result.type === 'offline_present' || result.type === 'offline_late';
                const isOnlineResult = result.type === 'online_present' || result.type === 'online_late';
                const isLate = result.attendance_status === 'late';

                if (isOffline) {
                    setScanStatus('success');
                    setStatusMsg(isLate ? `LATE Arrival: ${p.name}` : `PRESENT: ${p.name}`);
                    setPresentCount(c => c + 1);

                    const studentDisplayId = getStudentDisplayId({ id: p.person_id, roll_number: p.roll_number });
                    const subLabel = p.type === 'student'
                        ? `${p.class_name || ''}${p.section_name ? ` (${p.section_name})` : ''}`.trim()
                        : p.role || 'Staff';
                    const subAccent = p.type === 'student'
                        ? (studentDisplayId ? String(studentDisplayId) : undefined)
                        : (p.person_id ? String(p.person_id) : undefined);

                    addFeedItem({
                        type: 'success',
                        name: `${p.name} (Offline)`,
                        fatherName: personType === 'student' ? p.father_name : undefined,
                        sub: `${subLabel} • ${isLate ? 'LATE' : 'PRESENT'}`,
                        subAccent,
                        time,
                        personType,
                    });

                    rfidOfflineService.getQueue().then(q => setQueueCount(q.length));
                    triggerPopup({
                        name: p.name,
                        subInfo: subLabel,
                        status: isLate ? 'late' : 'present',
                        time,
                        picture_url: p.picture_url
                    });
                    return;
                }

                const lateCount = isLate
                    ? await fetchPersonMonthlyLateCount(p.person_id, personType, { includePendingToday: false })
                    : undefined;
                setScanStatus('success');
                setStatusMsg(isLate ? `LATE Arrival: ${p.name}` : `PRESENT: ${p.name}`);
                setPresentCount(c => c + 1);

                const studentDisplayId = getStudentDisplayId({ id: p.person_id, roll_number: p.roll_number });
                const subLabel = p.type === 'student'
                    ? `${p.class_name || ''}${p.section_name ? ` (${p.section_name})` : ''}`.trim()
                    : p.role || 'Staff';
                const subAccent = p.type === 'student'
                    ? (studentDisplayId ? String(studentDisplayId) : undefined)
                    : (p.person_id ? String(p.person_id) : undefined);

                addFeedItem({
                    type: 'success',
                    name: p.name,
                    fatherName: personType === 'student' ? p.father_name : undefined,
                    sub: subLabel,
                    subAccent,
                    time,
                    personType,
                    attendanceStatus: isLate ? 'late' : 'present',
                    attendanceLateCount: lateCount,
                });

                triggerPopup({
                    name: p.name,
                    subInfo: subLabel,
                    status: isLate ? 'late' : 'present',
                    time,
                    picture_url: p.picture_url
                });
            }

            // Auto-reset preview after 4 seconds
            if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
            resetTimerRef.current = setTimeout(() => {
                setScanStatus('idle');
                setStatusMsg('Waiting for card scan...');
                setScannedPerson(null);
                resetTimerRef.current = null;
            }, 4000);
        };

        window.addEventListener('rfid-scan-processed', handleGlobalScan);
        return () => window.removeEventListener('rfid-scan-processed', handleGlobalScan);
    }, [addFeedItem, fetchPersonMonthlyLateCount, showToast, triggerPopup]);

    const clearFeedData = () => {
        setFeed([]);
        setPresentCount(0);
        setUnknownCount(0);
        setDupCount(0);
        clearPersistedDailyHistory();
    };

    const openClearPasswordModal = () => {
        setClearPassword('');
        setShowClearPasswordModal(true);
    };

    const closeClearPasswordModal = () => {
        if (verifyingClearPassword) return;
        setShowClearPasswordModal(false);
        setClearPassword('');
    };

    const closeLeavePasswordModal = () => {
        if (verifyingLeavePassword) return;
        setShowLeavePasswordModal(false);
        setLeavePassword('');
        pendingNavigationRef.current = null;
    };

    const verifyUserPassword = useCallback(async (password: string) => {
        if (!user?.id) return false;

        if (user.is_super_admin) {
            const { data, error } = await supabase
                .from('super_admins')
                .select('password')
                .eq('id', user.id)
                .single();

            return !error && !!data && data.password === password;
        }

        const { data, error } = await supabase
            .from('users')
            .select('password')
            .eq('id', user.id)
            .single();

        return !error && !!data && data.password === password;
    }, [user?.id, user?.is_super_admin]);

    const openSettingsPasswordModal = () => {
        setSettingsPassword('');
        setShowSettingsPasswordModal(true);
    };

    const closeSettingsPasswordModal = () => {
        if (verifyingSettingsPassword) return;
        setShowSettingsPasswordModal(false);
        setSettingsPassword('');
    };

    const verifySettingsPassword = async () => {
        if (!user?.id) return;

        if (!settingsPassword.trim()) {
            showToast('Please enter your password.', 'error');
            return;
        }

        setVerifyingSettingsPassword(true);
        try {
            const isValidPassword = await verifyUserPassword(settingsPassword);
            if (!isValidPassword) {
                showToast('Incorrect password.', 'error');
                return;
            }

            setShowSettingsPasswordModal(false);
            setSettingsPassword('');
            setShowSettings(true);
        } catch (error) {
            showToast('Failed to verify password.', 'error');
        } finally {
            setVerifyingSettingsPassword(false);
        }
    };

    const verifyClearPassword = async () => {
        if (!user?.id) return;

        if (!clearPassword.trim()) {
            showToast('Please enter your password.', 'error');
            return;
        }

        setVerifyingClearPassword(true);
        try {
            const isValidPassword = await verifyUserPassword(clearPassword);
            if (!isValidPassword) {
                showToast('Incorrect password.', 'error');
                return;
            }

            clearFeedData();
            setShowClearPasswordModal(false);
            setClearPassword('');
        } catch (error) {
            showToast('Failed to verify password.', 'error');
        } finally {
            setVerifyingClearPassword(false);
        }
    };

    const verifyLeavePassword = async () => {
        if (!user?.id) return;

        if (!leavePassword.trim()) {
            showToast('Please enter your password.', 'error');
            return;
        }

        setVerifyingLeavePassword(true);
        try {
            const isValidPassword = await verifyUserPassword(leavePassword);
            if (!isValidPassword) {
                showToast('Incorrect password.', 'error');
                return;
            }

            const pendingNavigation = pendingNavigationRef.current;
            setShowLeavePasswordModal(false);
            setLeavePassword('');
            pendingNavigationRef.current = null;

            if (pendingNavigation) {
                if (pendingNavigation.retry) {
                    pendingNavigation.retry();
                } else {
                    navigate(pendingNavigation.path, { replace: !!pendingNavigation.replace });
                }
            }
        } catch (error) {
            showToast('Failed to verify password.', 'error');
        } finally {
            setVerifyingLeavePassword(false);
        }
    };


    useEffect(() => {
        const navigatorWithBlock = navigationContext?.navigator as any;
        if (!navigatorWithBlock?.block) {
            return;
        }

        const unblock = navigatorWithBlock.block((tx: any) => {
            const nextLocation = tx.location;
            const nextPath = `${nextLocation.pathname}${nextLocation.search}${nextLocation.hash}`;
            const currentPath = `${location.pathname}${location.search}${location.hash}`;

            if (nextPath === currentPath) {
                tx.retry();
                return;
            }

            pendingNavigationRef.current = {
                path: nextPath,
                replace: tx.action === 'REPLACE',
                retry: () => {
                    unblock();
                    tx.retry();
                },
            };
            setLeavePassword('');
            setShowLeavePasswordModal(true);
        });

        return unblock;
    }, [location.hash, location.pathname, location.search, navigationContext]);

    const filteredEmployeeFeed = feed.filter(item => item.personType === 'employee' && matchesFeedSearch(item, feedSearch));
    const filteredStudentFeed = feed.filter(item => item.personType === 'student' && matchesFeedSearch(item, feedSearch));

    const scanIcon =
        scanStatus === 'success' ? <CheckCircle style={{ fontSize: 56 }} /> :
            scanStatus === 'error' ? <XCircle style={{ fontSize: 56 }} /> :
                <Scan style={{ fontSize: 56 }} />;

    // Auto-focus the hidden input
    useEffect(() => {
        const focusInput = (event?: MouseEvent) => {
            const target = event?.target as HTMLElement | null;
            if (target) {
                const tagName = target.tagName;
                const isInteractive =
                    target.isContentEditable ||
                    tagName === 'INPUT' ||
                    tagName === 'TEXTAREA' ||
                    tagName === 'SELECT' ||
                    tagName === 'BUTTON' ||
                    tagName === 'A' ||
                    !!target.closest('input, textarea, select, button, a, [contenteditable="true"]');

                if (isInteractive) {
                    return;
                }
            }

            if (hiddenInputRef.current) hiddenInputRef.current.focus();
        };
        focusInput();
        document.addEventListener('click', focusInput);
        return () => document.removeEventListener('click', focusInput);
    }, []);

    const formatAutomationRunAt = (value?: string | null) => {
        if (!value) return 'No runs yet';

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'No runs yet';

        return date.toLocaleString('en-PK', {
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit'
        });
    };


    return (
        <Page theme={themeObj}>
            <TopBar>
                <Title theme={themeObj}>
                    <BadgeCheck style={{ fontSize: 22 }} />
                    RFID Attendance Scanner
                </Title>
                <TopBarActions>
                    <StatusBadgeRow>
                        {!isOnline && (
                            <OfflineBadge>
                                <CloudOffIcon style={{ fontSize: 16 }} />
                                OFFLINE MODE
                            </OfflineBadge>
                        )}
                        {queueCount > 0 && (
                            <SyncBadge $syncing={isSyncing} onClick={handleSync}>
                                <CloudSyncIcon style={{ fontSize: 16 }} />
                                {queueCount} Pending Syncs
                            </SyncBadge>
                        )}
                    </StatusBadgeRow>

                    <DateAndSettingsRow>
                        <ProminentDate theme={themeObj}>
                            <div className="date-day">Attendance Date</div>
                            <div className="date-full">
                                {new Date().toLocaleDateString('en-PK', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                })}
                            </div>
                        </ProminentDate>


                        <SecondaryBtn theme={themeObj} onClick={openSettingsPasswordModal}>
                            <SettingsIcon style={{ fontSize: 18 }} />
                            Settings
                        </SecondaryBtn>
                    </DateAndSettingsRow>
                </TopBarActions>
            </TopBar>

            {showSettingsPasswordModal && ReactDOM.createPortal(
                <ModalOverlay onClick={closeSettingsPasswordModal}>
                    <ModalContent
                        theme={themeObj}
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: 440 }}
                    >
                        <ModalHeader theme={themeObj}>
                            <ModalTitleBlock theme={themeObj}>
                                <h2>
                                    <SettingsIcon /> Verify Password
                                </h2>
                                <p>Enter your login password to open attendance settings.</p>
                            </ModalTitleBlock>
                        </ModalHeader>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            <Label theme={themeObj}>Password</Label>
                            <PasswordInput
                                theme={themeObj}
                                type="password"
                                value={settingsPassword}
                                onChange={e => setSettingsPassword(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        verifySettingsPassword();
                                    }
                                }}
                                placeholder="Enter your password"
                                autoFocus
                            />
                            <InputHint theme={themeObj}>Use the same password you used to log in.</InputHint>
                        </div>

                        <SettingsActions>
                            <SecondaryBtn
                                theme={themeObj}
                                style={{ minWidth: 140 }}
                                onClick={closeSettingsPasswordModal}
                                disabled={verifyingSettingsPassword}
                            >
                                Cancel
                            </SecondaryBtn>
                            <SecondaryBtn
                                theme={themeObj}
                                style={{ minWidth: 180, background: '#3b82f6', color: '#fff', borderColor: '#3b82f6' }}
                                onClick={verifySettingsPassword}
                                disabled={verifyingSettingsPassword}
                            >
                                {verifyingSettingsPassword ? 'Verifying...' : 'Open Settings'}
                            </SecondaryBtn>
                        </SettingsActions>
                    </ModalContent>
                </ModalOverlay>,
                document.body
            )}

            {showClearPasswordModal && ReactDOM.createPortal(
                <ModalOverlay onClick={closeClearPasswordModal}>
                    <ModalContent
                        theme={themeObj}
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: 440 }}
                    >
                        <ModalHeader theme={themeObj}>
                            <ModalTitleBlock theme={themeObj}>
                                <h2>
                                    <RefreshCw /> Verify Password
                                </h2>
                                <p>Enter your login password to clear the scan feed.</p>
                            </ModalTitleBlock>
                        </ModalHeader>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            <Label theme={themeObj}>Password</Label>
                            <PasswordInput
                                theme={themeObj}
                                type="password"
                                value={clearPassword}
                                onChange={e => setClearPassword(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        verifyClearPassword();
                                    }
                                }}
                                placeholder="Enter your password"
                                autoFocus
                            />
                            <InputHint theme={themeObj}>Use the same password you used to log in.</InputHint>
                        </div>

                        <SettingsActions>
                            <SecondaryBtn
                                theme={themeObj}
                                style={{ minWidth: 140 }}
                                onClick={closeClearPasswordModal}
                                disabled={verifyingClearPassword}
                            >
                                Cancel
                            </SecondaryBtn>
                            <SecondaryBtn
                                theme={themeObj}
                                style={{ minWidth: 180, background: '#ef4444', color: '#fff', borderColor: '#ef4444' }}
                                onClick={verifyClearPassword}
                                disabled={verifyingClearPassword}
                            >
                                {verifyingClearPassword ? 'Verifying...' : 'Clear Feed'}
                            </SecondaryBtn>
                        </SettingsActions>
                    </ModalContent>
                </ModalOverlay>,
                document.body
            )}

            {showLeavePasswordModal && ReactDOM.createPortal(
                <ModalOverlay onClick={closeLeavePasswordModal}>
                    <ModalContent
                        theme={themeObj}
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: 440 }}
                    >
                        <ModalHeader theme={themeObj}>
                            <ModalTitleBlock theme={themeObj}>
                                <h2>
                                    <SettingsIcon /> Verify Password
                                </h2>
                                <p>Enter your login password to leave this page.</p>
                            </ModalTitleBlock>
                        </ModalHeader>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            <Label theme={themeObj}>Password</Label>
                            <PasswordInput
                                theme={themeObj}
                                type="password"
                                value={leavePassword}
                                onChange={e => setLeavePassword(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        verifyLeavePassword();
                                    }
                                }}
                                placeholder="Enter your password"
                                autoFocus
                            />
                            <InputHint theme={themeObj}>Use the same password you used to log in.</InputHint>
                        </div>

                        <SettingsActions>
                            <SecondaryBtn
                                theme={themeObj}
                                style={{ minWidth: 140 }}
                                onClick={closeLeavePasswordModal}
                                disabled={verifyingLeavePassword}
                            >
                                Stay Here
                            </SecondaryBtn>
                            <SecondaryBtn
                                theme={themeObj}
                                style={{ minWidth: 180, background: '#3b82f6', color: '#fff', borderColor: '#3b82f6' }}
                                onClick={verifyLeavePassword}
                                disabled={verifyingLeavePassword}
                            >
                                {verifyingLeavePassword ? 'Verifying...' : 'Leave Page'}
                            </SecondaryBtn>
                        </SettingsActions>
                    </ModalContent>
                </ModalOverlay>,
                document.body
            )}

            {showSettings && attnSettings && ReactDOM.createPortal(
                <ModalOverlay onClick={() => setShowSettings(false)}>
                    <ModalContent theme={themeObj} onClick={e => e.stopPropagation()}>
                        <ModalHeader theme={themeObj}>
                            <ModalTitleBlock theme={themeObj}>
                                <h2>
                                    <SettingsIcon /> Attendance Settings
                                </h2>
                                <p>Scan timing, cutoff, and backend rules.</p>
                            </ModalTitleBlock>
                        </ModalHeader>


                        <SettingsGrid>
                            <FormGroup>
                                <Label theme={themeObj}>Student Start Time</Label>
                                <TimeInput
                                    theme={themeObj}
                                    type="time"
                                    value={attnSettings.student_start_time}
                                    onChange={e => setAttnSettings({ ...attnSettings, student_start_time: e.target.value })}
                                />
                                <InputHint theme={themeObj}>Controls late status.</InputHint>
                            </FormGroup>

                            <FormGroup>
                                <Label theme={themeObj}>Staff Start Time</Label>
                                <TimeInput
                                    theme={themeObj}
                                    type="time"
                                    value={attnSettings.staff_start_time}
                                    onChange={e => setAttnSettings({ ...attnSettings, staff_start_time: e.target.value })}
                                />
                                <InputHint theme={themeObj}>Late after grace.</InputHint>
                            </FormGroup>

                            <FormGroup>
                                <Label theme={themeObj}>Staff Check-out After</Label>
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
                        </SettingsActions>
                    </ModalContent>
                </ModalOverlay>
            , document.body)}

            {showPopup && popupData && (
                <FullScreenPopup
                    $status={popupData.status}
                    onClick={() => {
                        setShowPopup(false);
                        setPopupData(null);
                        if (popupTimerRef.current) {
                            clearInterval(popupTimerRef.current);
                            popupTimerRef.current = null;
                        }
                    }}
                >
                    <PopupProgressBar>
                        <PopupProgressFill $progress={popupProgress} />
                    </PopupProgressBar>
                    <PopupContent>
                        {popupData.picture_url ? (
                            <PopupImage src={popupData.picture_url} alt={popupData.name} />
                        ) : (
                            <PopupIconWrapper $status={popupData.status}>
                                {popupData.status === 'present' && <CheckCircle />}
                                {popupData.status === 'late' && <AlertCircle />}
                                {popupData.status === 'checked_out' && <LogoutIcon />}
                                {popupData.status === 'offline' && <CloudSyncIcon />}
                                {popupData.status === 'error' && <XCircle />}
                            </PopupIconWrapper>
                        )}
                        
                        <PopupInfoWrapper>
                            <PopupName $color={popupData.nameColor}>{popupData.name}</PopupName>
                            <PopupSubInfo $color={popupData.subColor}>{popupData.subInfo}</PopupSubInfo>
                            <PopupStatus $status={popupData.status} $bgColor={popupData.statusBgColor}>
                                {popupData.status === 'present' && 'Present'}
                                {popupData.status === 'late' && 'Late Arrival'}
                                {popupData.status === 'checked_out' && 'Checked Out'}
                                {popupData.status === 'offline' && 'Scan Successful'}
                                {popupData.status === 'error' && 'Error'}
                            </PopupStatus>
                            <PopupTime>{popupData.time}</PopupTime>
                        </PopupInfoWrapper>
                    </PopupContent>
                </FullScreenPopup>
            )}

            <MainGrid>
                {/* \u2500\u2500 Left: Scanner \u2500\u2500 */}
                <ScannerCard theme={themeObj}>
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

                {/* \u2500\u2500 Right: Live Feed \u2500\u2500 */}
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
                                <span style={{ opacity: 0.8 }}>{filteredEmployeeFeed.length}</span>
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
                                            <FeedItem key={item.id} $type={item.type} $personType={item.personType} $new={item.isNew} $attendanceStatus={item.attendanceStatus} theme={themeObj}>
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
                                <span style={{ opacity: 0.6 }}>{filteredStudentFeed.length}</span>
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
                                            <FeedItem key={item.id} $type={item.type} $personType={item.personType} $new={item.isNew} $attendanceStatus={item.attendanceStatus} theme={themeObj}>
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

        </Page>
    );
};

export default RFIDAttendancePage;


