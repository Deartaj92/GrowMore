import React, { useEffect, useRef, useState, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';

// Add NDEFReader types for TypeScript
declare global {
    interface Window {
        NDEFReader: any;
    }
}
import { useTheme } from '../components/Layout/contexts/ThemeContext';
import { darkTheme, lightTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
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
} from '@mui/icons-material';
import { rfidOfflineService } from '../services/rfidOfflineService';

// ─── Animations ────────────────────────────────────────────────────────────────

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.4); }
  50%       { box-shadow: 0 0 0 18px rgba(59,130,246,0); }
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
  height: 100%;
  background: ${({ theme }) => theme.BG};
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  box-sizing: border-box;
  overflow-y: auto;

  @media (max-width: 768px) { padding: 0.5rem; gap: 0.5rem; }
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg { color: ${({ theme }) => theme.ACCENT}; }
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
  padding: 4px 10px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  animation: ${pulse} 2s infinite;
`;

const SyncBadge = styled.div<{ $syncing?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover { background: rgba(59, 130, 246, 0.2); }
  svg { animation: ${({ $syncing }) => $syncing ? css`${keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`} 1s linear infinite` : 'none'}; }
`;

const BigStatusOverlay = styled.div<{ $status: 'present' | 'late' | 'out' | 'already_marked' | 'already_left' }>`
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  padding: 1.5rem 2.5rem;
  background: ${({ $status }) =>
        $status === 'late' ? '#eab308' :
            $status === 'present' ? '#22c55e' :
                $status === 'out' ? '#3b82f6' :
                    '#ef4444' // errors/warnings
    };
  color: #fff;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.4);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  animation: ${slideUp} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;

  .status-label {
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    opacity: 0.9;
  }

  .status-msg {
    font-size: 2.2rem;
    font-weight: 900;
    white-space: nowrap;
    text-shadow: 0 2px 4px rgba(0,0,0,0.15);
  }
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
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 24px;
  width: 100%;
  max-width: 450px;
  padding: 2rem;
  box-shadow: 0 20px 50px rgba(0,0,0,0.3);
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
  width: 100%;
  padding: 0.8rem;
  background: ${({ theme }) => theme.ACCENT};
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: transform 0.2s;
  &:hover { transform: translateY(-2px); }
  &:active { transform: translateY(0); }
`;

const ProminentDate = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;

  .date-day {
    font-size: 0.72rem;
    font-weight: 700;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 2px;
  }

  .date-full {
    font-size: 1.1rem;
    font-weight: 800;
    color: ${({ theme }) => theme.ACCENT};
  }

  @media (max-width: 600px) {
    align-items: flex-start;
    text-align: left;
    margin-top: 0.5rem;
  }
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 1rem;
  flex: 1;
  min-height: 0;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

// ── Scanner Card ───────────────────────────────────────────────────────────────

const ScannerCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.2rem;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
`;

const ScanArea = styled.div<{ $status: 'idle' | 'success' | 'error' }>`
  width: 160px;
  height: 160px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: background 0.4s;
  background: ${({ $status }) =>
        $status === 'success' ? 'rgba(34,197,94,0.12)' :
            $status === 'error' ? 'rgba(239,68,68,0.12)' :
                'rgba(59,130,246,0.08)'};
  animation: ${({ $status }) =>
        $status === 'success' ? css`${rippleGreen} 0.6s ease-out` :
            $status === 'error' ? css`${rippleRed} 0.6s ease-out` :
                css`${pulse} 2.5s ease-in-out infinite`};

    transition: color 0.3s;
  }
`;

const ScannedImage = styled.img`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  animation: ${fadeIn} 0.5s ease-out;
  border: 4px solid #22c55e;
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
  font-size: 1rem;
  font-weight: 700;
  color: ${({ $status }) =>
        $status === 'success' ? '#22c55e' :
            $status === 'error' ? '#ef4444' :
                '#3b82f6'};
  text-align: center;
  min-height: 1.4rem;
`;

const SubText = styled.div`
  font-size: 0.82rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-align: center;
`;

const DateSelect = styled.input`
  width: 100%;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  box-sizing: border-box;
  outline: none;
  cursor: pointer;

  &:focus { border-color: ${({ theme }) => theme.ACCENT}; }
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  width: 100%;
`;

const StatBox = styled.div<{ $color: string }>`
  background: ${({ $color }) => $color}18;
  border: 1px solid ${({ $color }) => $color}33;
  border-radius: 10px;
  padding: 0.75rem;
  text-align: center;
`;

const StatNum = styled.div<{ $color: string }>`
  font-size: 1.6rem;
  font-weight: 800;
  color: ${({ $color }) => $color};
  line-height: 1;
`;

const StatLabel = styled.div`
  font-size: 0.72rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 0.2rem;
`;

// ── Feed Panel ────────────────────────────────────────────────────────────────

const FeedCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
  overflow: hidden;
`;

const FeedHeader = styled.div`
  padding: 1rem 1.2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
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
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.78rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover { background: ${({ theme }) => theme.HOVER_BG}; color: ${({ theme }) => theme.TEXT_PRIMARY}; }
`;

const TestBtn = styled(ClearBtn)`
  color: ${({ theme }) => theme.ACCENT};
  &:hover { background: rgba(59, 130, 246, 0.1); color: ${({ theme }) => theme.ACCENT}; }
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
  border-right: 1px solid ${({ theme }) => theme.BORDER};
  &:last-child { border-right: none; }

  @media (max-width: 1100px) {
    border-right: none;
    border-bottom: 1px solid ${({ theme }) => theme.BORDER};
    &:last-child { border-bottom: none; }
  }
`;

const SectionHeader = styled.div<{ $mode?: 'student' | 'employee' }>`
  padding: 0.6rem 1rem;
  background: ${({ theme, $mode }) => $mode === 'employee' ? 'rgba(168, 85, 247, 0.08)' : theme.HOVER_BG};
  font-size: 0.8rem;
  font-weight: 700;
  color: ${({ theme, $mode }) => $mode === 'employee' ? '#a855f7' : theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${({ theme, $mode }) => $mode === 'employee' ? 'rgba(168, 85, 247, 0.2)' : theme.BORDER};
`;

const SectionBody = styled.div`
  flex: 1;
  overflow-y: auto;
  max-height: 430px; /* ~6 rows + headers and gaps */
`;

const FeedItem = styled.div<{ $type: 'success' | 'error' | 'warn'; $personType?: string; $new?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 1px solid ${({ $type, $personType }) =>
        $type === 'success' ? ($personType === 'employee' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(34,197,94,0.25)') :
            $type === 'error' ? 'rgba(239,68,68,0.25)' :
                'rgba(234,179,8,0.25)'};
  background: ${({ $type, $personType }) =>
        $type === 'success' ? ($personType === 'employee' ? 'rgba(168, 85, 247, 0.06)' : 'rgba(34,197,94,0.06)') :
            $type === 'error' ? 'rgba(239,68,68,0.06)' :
                'rgba(234,179,8,0.06)'};
  animation: ${({ $new }) => $new ? css`${slideIn} 0.3s ease` : 'none'};
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
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FeedSub = styled.div`
  font-size: 0.76rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const FeedTime = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  white-space: nowrap;
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
`;

const MobileNfcBtn = styled.button<{ $active?: boolean }>`
  background: ${({ $active }) => $active ? '#22c55e' : 'rgba(59, 130, 246, 0.1)'};
  color: ${({ $active }) => $active ? '#fff' : '#3b82f6'};
  border: 1px solid ${({ $active }) => $active ? '#22c55e' : 'rgba(59, 130, 246, 0.2)'};
  padding: 0.6rem 1.2rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: ${({ $active }) => $active ? '0 4px 15px rgba(34, 197, 94, 0.3)' : 'none'};

  &:hover { 
    transform: translateY(-2px);
    background: ${({ $active }) => $active ? '#16a34a' : 'rgba(59, 130, 246, 0.15)'};
  }
  
  &:active { transform: translateY(0); }

  @media (min-width: 961px) {
    display: none; /* Hide on desktop */
  }
`;


// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = 'student' | 'employee';

interface ScanResult {
    id: string;
    type: 'success' | 'error' | 'warn';
    name: string;
    sub: string;
    time: string;
    personType: Mode;
    isNew?: boolean;
}

const SecondaryBtn = styled.button`
  background: ${({ theme }) => theme.HOVER_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  &:hover { background: ${({ theme }) => theme.BORDER}; }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${fadeIn} 0.2s ease;
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 20px;
  width: 90%;
  max-width: 450px;
  padding: 2rem;
  box-shadow: 0 20px 50px rgba(0,0,0,0.3);
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.8rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TimeInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  outline: none;
  &:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
`;


// ─── Component ────────────────────────────────────────────────────────────────

const RFIDAttendancePage: React.FC = () => {
    const { theme } = useTheme();
    const themeObj = theme === 'dark' ? darkTheme : lightTheme;
    const { user } = useAuth();
    const today = new Date().toISOString().slice(0, 10);

    const [attnSettings, setAttnSettings] = useState<{
        student_start_time: string;
        staff_start_time: string;
        staff_end_time: string;
        grace_period_minutes: number;
    } | null>(null);

    const [selectedDate, setSelectedDate] = useState(today);
    const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [statusMsg, setStatusMsg] = useState('Waiting for card scan...');
    const [feed, setFeed] = useState<ScanResult[]>([]);
    const [presentCount, setPresentCount] = useState(0);
    const [unknownCount, setUnknownCount] = useState(0);
    const [dupCount, setDupCount] = useState(0);

    const [showSettings, setShowSettings] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [bigStatus, setBigStatus] = useState<'present' | 'late' | 'out' | 'already_marked' | 'already_left' | null>(null);
    const bigStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [testScanStates, setTestScanStates] = useState<Record<string, 'in' | 'out'>>({});

    const [isNfcSupported, setIsNfcSupported] = useState(false);
    const [isNfcScanning, setIsNfcScanning] = useState(false);
    const nfcAbortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        setIsNfcSupported('NDEFReader' in window);
    }, []);

    // Buffer for USB reader (acts like keyboard input)
    const bufferRef = useRef('');
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hiddenInputRef = useRef<HTMLInputElement>(null);
    const isProcessingRef = useRef(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [queueCount, setQueueCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
    const [showSuccess, setShowSuccess] = useState(false);
    const [syncStats, setSyncStats] = useState({ success: 0, failed: 0 });
    const [scannedPerson, setScannedPerson] = useState<{ name: string; photo_url?: string } | null>(null);

    // Initial cache and queue check
    useEffect(() => {
        if (user?.school_id) {
            rfidOfflineService.cacheMappings(String(user.school_id));
            rfidOfflineService.getQueue().then(q => setQueueCount(q.length));
        }

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [user?.school_id]);

    useEffect(() => {
        const fetchSettings = async () => {
            if (!user?.school_id) return;
            const { data } = await supabase
                .from('attendance_settings')
                .select('*')
                .eq('school_id', user.school_id)
                .single();
            if (data) setAttnSettings(data);
            else {
                // Fallback / Default
                setAttnSettings({
                    student_start_time: '08:00:00',
                    staff_start_time: '08:00:00',
                    staff_end_time: '14:00:00',
                    grace_period_minutes: 15
                });
            }
        };
        fetchSettings();
    }, [user?.school_id]);

    useEffect(() => {
        if (isOnline && queueCount > 0 && !isSyncing) {
            handleSync();
        }
    }, [isOnline, queueCount]);

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

    const determineStatus = (personType: Mode): 'present' | 'late' => {
        if (!attnSettings) return 'present';
        const startTimeStr = personType === 'student' ? attnSettings.student_start_time : attnSettings.staff_start_time;
        if (!startTimeStr) return 'present';

        const [startH, startM] = startTimeStr.split(':').map(Number);
        const now = new Date();
        const startLimit = new Date();
        startLimit.setHours(startH, startM, 0, 0);
        startLimit.setMinutes(startLimit.getMinutes() + (attnSettings.grace_period_minutes || 0));

        return now > startLimit ? 'late' : 'present';
    };

    const processUID = useCallback(async (uid: string) => {
        if (!uid || !user?.school_id || isProcessingRef.current) return;
        isProcessingRef.current = true;

        // Clear any existing reset timer immediately when a new scan starts
        if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
        }

        const cleanUID = uid.trim().toUpperCase().replace(/[^A-F0-9]/g, '');
        if (cleanUID.length < 4) {
            isProcessingRef.current = false;
            return;
        }

        setScanStatus('idle');
        setStatusMsg('Processing...');

        try {
            const sessionId = await fetchSession();
            const now = new Date().toISOString();
            const time = formatTime();

            // 1. Check local cache first for fast detection
            const mapping = await rfidOfflineService.lookupRFID(cleanUID);
            let personType: Mode = mapping?.type || 'student';
            let personData: any = null;

            if (mapping) {
                personType = mapping.type;
            } else if (isOnline) {
                // If not in cache, try finding in DB (First Student, then Staff)
                const { data: student } = await supabase
                    .from('students')
                    .select('id, name, type:id') // Dummy type field for checking
                    .eq('school_id', user.school_id)
                    .eq('rfid_uid', cleanUID)
                    .maybeSingle();

                if (student) {
                    personType = 'student';
                } else {
                    const { data: staff } = await supabase
                        .from('staff')
                        .select('id')
                        .eq('school_id', user.school_id)
                        .eq('rfid_uid', cleanUID)
                        .maybeSingle();
                    if (staff) personType = 'employee';
                    else personType = null as any; // Not found
                }
            } else {
                personType = null as any; // Offline and not in cache
            }

            if (!personType) {
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
                return;
            }

            if (personType === 'student') {
                // ── Student Logic ──
                const { data: student, error } = await supabase
                    .from('students')
                    .select('id, name, roll_number, photo_url, class_id, section_id, classes:class_id(name), sections:section_id(name)')
                    .eq('school_id', user.school_id)
                    .eq('rfid_uid', cleanUID)
                    .maybeSingle();

                if (error) throw error;
                if (!student) throw new Error('Student data disappeared');

                // Check for duplicate
                const { data: existing } = await supabase
                    .from('attendance_records')
                    .select('id, status')
                    .eq('student_id', student.id)
                    .eq('date', selectedDate)
                    .eq('school_id', user.school_id)
                    .maybeSingle();

                if (existing) {
                    setScanStatus('error');
                    const className = (student as any).classes?.name || '';
                    const sectionName = (student as any).sections?.name || '';
                    const classLabel = [className, sectionName].filter(Boolean).join(' - ');
                    setStatusMsg(`Already marked: ${student.name}`);
                    setDupCount(p => p + 1);
                    addFeedItem({
                        type: 'warn',
                        name: student.name,
                        sub: `Already marked ${existing.status} • ${classLabel}`,
                        time,
                        personType: 'student',
                    });
                    return;
                }

                const status = determineStatus('student');

                await supabase.from('attendance_records').insert({
                    student_id: student.id,
                    class_id: student.class_id,
                    section_id: student.section_id,
                    school_id: user.school_id,
                    session_id: sessionId,
                    date: selectedDate,
                    status: status,
                    source: 'rfid',
                    check_in_time: now,
                });

                const classLabel = [(student as any).classes?.name, (student as any).sections?.name].filter(Boolean).join(' - ');
                setScanStatus('success');
                setStatusMsg(`✓ ${student.name}`);
                setScannedPerson({ name: student.name, photo_url: student.photo_url || undefined });
                setPresentCount(p => p + 1);
                addFeedItem({
                    type: 'success',
                    name: student.name,
                    sub: `${status === 'late' ? 'LATE • ' : ''}${classLabel} • Roll: ${student.roll_number || student.id}`,
                    time,
                    personType: 'student',
                });

                // Show big message
                if (bigStatusTimerRef.current) clearTimeout(bigStatusTimerRef.current);
                setBigStatus(status === 'late' ? 'late' : 'present');
                bigStatusTimerRef.current = setTimeout(() => setBigStatus(null), 3500);

            } else {
                // ── Employee Logic ──
                const { data: staffMember, error } = await supabase
                    .from('staff')
                    .select('id, name, role, photo_url')
                    .eq('school_id', user.school_id)
                    .eq('rfid_uid', cleanUID)
                    .maybeSingle();

                if (error) throw error;
                if (!staffMember) throw new Error('Staff data disappeared');

                const { data: existing } = await supabase
                    .from('staff_attendance_records')
                    .select('id, status, check_in_time, check_out_time')
                    .eq('staff_id', staffMember.id)
                    .eq('date', selectedDate)
                    .eq('school_id', user.school_id)
                    .maybeSingle();

                if (existing) {
                    if (existing.check_out_time) {
                        setScanStatus('error');
                        setStatusMsg(`Already Left: ${staffMember.name}`);
                        setDupCount(p => p + 1);
                        addFeedItem({
                            type: 'warn',
                            name: staffMember.name,
                            sub: `Checked out at ${new Date(existing.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                            time,
                            personType: 'employee',
                        });
                        return;
                    }

                    // Check out the employee
                    await supabase
                        .from('staff_attendance_records')
                        .update({ check_out_time: now })
                        .eq('id', existing.id);

                    setScanStatus('success');
                    setStatusMsg(`OUT ✓ ${staffMember.name}`);
                    setScannedPerson({ name: staffMember.name, photo_url: staffMember.photo_url || undefined });
                    addFeedItem({
                        type: 'success',
                        name: `${staffMember.name} (OUT)`,
                        sub: `Checked Out • ${staffMember.role || 'Staff'}`,
                        time,
                        personType: 'employee',
                    });
                    return;
                }

                const status = determineStatus('employee');

                await supabase.from('staff_attendance_records').insert({
                    staff_id: staffMember.id,
                    school_id: user.school_id,
                    session_id: sessionId,
                    date: selectedDate,
                    status: status,
                    source: 'rfid',
                    check_in_time: now,
                });

                setScanStatus('success');
                setStatusMsg(`IN ✓ ${staffMember.name}`);
                setScannedPerson({ name: staffMember.name, photo_url: staffMember.photo_url || undefined });
                setPresentCount(p => p + 1);
                addFeedItem({
                    type: 'success',
                    name: `${staffMember.name} (IN)`,
                    sub: `${status === 'late' ? 'LATE • ' : ''}${staffMember.role || 'Staff'}`,
                    time,
                    personType: 'employee',
                });

                // Show big message
                if (bigStatusTimerRef.current) clearTimeout(bigStatusTimerRef.current);
                setBigStatus(status === 'late' ? 'late' : 'present');
                bigStatusTimerRef.current = setTimeout(() => setBigStatus(null), 3500);
            }
        } catch (err: any) {
            // ── Offline Logic ──
            if (!navigator.onLine || err?.message?.includes('fetch')) {
                const mapping = await rfidOfflineService.lookupRFID(cleanUID);
                if (mapping) {
                    await rfidOfflineService.queueScan({
                        rfid_uid: cleanUID,
                        person_id: mapping.person_id,
                        person_type: mapping.type,
                        school_id: String(user.school_id),
                        session_id: await fetchSession().catch(() => null),
                        date: selectedDate,
                        timestamp: new Date().toISOString(),
                        class_id: mapping.class_id,
                        section_id: mapping.section_id,
                        source: 'rfid-offline'
                    });

                    const q = await rfidOfflineService.getQueue();
                    setQueueCount(q.length);

                    setScanStatus('success');
                    setStatusMsg(`✓ ${mapping.name} (Offline)`);
                    setScannedPerson({ name: mapping.name, photo_url: mapping.photo_url });
                    setPresentCount(p => p + 1);
                    addFeedItem({
                        type: 'success',
                        name: `${mapping.name} (Offline)`,
                        sub: mapping.type === 'student'
                            ? `${mapping.class_name || ''} ${mapping.section_name || ''} • Roll: ${mapping.roll_number || ''}`
                            : (mapping.role || 'Staff'),
                        time: formatTime(),
                        personType: mapping.type,
                    });
                    return;
                } else {
                    setScanStatus('error');
                    setStatusMsg(`Unknown Offline Card: ${cleanUID}`);
                    setUnknownCount(p => p + 1);
                    addFeedItem({
                        type: 'error',
                        name: 'Unknown Card',
                        sub: `UID: ${cleanUID} (Offline)`,
                        time: formatTime(),
                        personType: 'student', // Fallback
                    });
                    return;
                }
            }

            setScanStatus('error');
            setStatusMsg('Error: ' + (err?.message || 'Unknown'));
            addFeedItem({
                type: 'error',
                name: 'Error',
                sub: err?.message || 'Database error',
                time: formatTime(),
                personType: 'student', // Fallback
            });
        } finally {
            isProcessingRef.current = false;

            // Set/Reset the 4-second preview timer
            resetTimerRef.current = setTimeout(() => {
                setScanStatus('idle');
                setStatusMsg('Waiting for card scan...');
                setScannedPerson(null);
                resetTimerRef.current = null;
            }, 4000);
        }
    }, [user?.school_id, selectedDate, addFeedItem, fetchSession]);

    const handleStartNfc = async () => {
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

            ndef.addEventListener("readingerror", () => {
                setScanStatus('error');
                setStatusMsg('NFC Read Error');
            });

            ndef.addEventListener("reading", ({ serialNumber }: any) => {
                if (serialNumber) {
                    processUID(serialNumber);
                }
            });
        } catch (error: any) {
            setIsNfcScanning(false);
            alert("NFC Error: " + error.message);
        }
    };

    // Handle keyboard input from USB RFID reader
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Ignore modifier keys
        if (e.key === 'Shift' || e.key === 'CapsLock' || e.key === 'Alt' || e.key === 'Control') return;

        if (e.key === 'Enter') {
            // Card scan complete – process the buffered UID
            const uid = bufferRef.current;
            bufferRef.current = '';
            if (timerRef.current) clearTimeout(timerRef.current);
            if (uid.length >= 4) processUID(uid);
        } else if (e.key.length === 1) {
            bufferRef.current += e.key;
            // Auto-flush if no Enter comes within 100ms (some readers don't send Enter)
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                const uid = bufferRef.current;
                bufferRef.current = '';
                if (uid.length >= 4) processUID(uid);
            }, 120);
        }
    }, [processUID]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const handleClear = () => {
        setFeed([]);
        setPresentCount(0);
        setUnknownCount(0);
        setDupCount(0);
        setTestScanStates({});
    };

    const simulateScan = () => {
        if (isProcessingRef.current) return;

        // Reset any existing timer
        if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
        }

        const dummyNames = ['Ali Khan', 'Fatima Zahra', 'Umar Farooq', 'Ayesha Bibi', 'Zainab Ahmed'];
        const dummyPhotos = [
            'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160&h=160&fit=crop',
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop',
            'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=160&h=160&fit=crop',
            'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&h=160&fit=crop'
        ];
        const dummySubs = ['Class 5-A \u2022 Roll: 102', 'Grade 8 \u2022 Roll: 045', 'Staff \u2022 Teacher', 'Class 3-C \u2022 Roll: 012', 'Staff \u2022 Admin'];
        const randomIdx = Math.floor(Math.random() * dummyNames.length);
        const name = dummyNames[randomIdx];
        const photo = dummyPhotos[randomIdx];
        const sub = dummySubs[randomIdx];
        const isEmployee = sub.includes('Staff');
        const currentState = testScanStates[name];

        const triggerBigStatus = (status: 'present' | 'late' | 'out' | 'already_marked' | 'already_left') => {
            if (bigStatusTimerRef.current) clearTimeout(bigStatusTimerRef.current);
            setBigStatus(status);
            bigStatusTimerRef.current = setTimeout(() => setBigStatus(null), 3500);
        };

        // --- Handle Existing State (Duplicate or Check-out) ---
        if (currentState === 'out') {
            setScanStatus('error');
            setStatusMsg(`Already Left: ${name}`);
            setDupCount(p => p + 1);
            addFeedItem({
                type: 'warn',
                name: `${name} (Test)`,
                sub: `Already checked out for today`,
                time: formatTime(),
                personType: isEmployee ? 'employee' : 'student',
            });
            triggerBigStatus('already_left');
            return;
        }

        if (currentState === 'in') {
            if (isEmployee) {
                // Employee Check-out
                setScanStatus('success');
                setStatusMsg(`OUT ✓ ${name}`);
                setScannedPerson({ name, photo_url: photo });
                setTestScanStates(prev => ({ ...prev, [name]: 'out' }));
                addFeedItem({
                    type: 'success',
                    name: `${name} (Test OUT)`,
                    sub: `Checked Out • Staff`,
                    time: formatTime(),
                    personType: 'employee',
                });
                triggerBigStatus('out');
                return;
            } else {
                // Student Duplicate
                setScanStatus('error');
                setStatusMsg(`Already marked: ${name}`);
                setDupCount(p => p + 1);
                addFeedItem({
                    type: 'warn',
                    name: `${name} (Test)`,
                    sub: `Duplicate scan detected`,
                    time: formatTime(),
                    personType: 'student',
                });
                triggerBigStatus('already_marked');
                return;
            }
        }

        // --- Handle First Scan (New Entry) ---
        setTestScanStates(prev => ({ ...prev, [name]: 'in' }));
        const isLate = Math.random() > 0.7;

        setScanStatus('success');
        setStatusMsg(`${isEmployee ? 'IN ' : ''}✓ ${name}`);
        setScannedPerson({ name, photo_url: photo });
        setPresentCount(p => p + 1);

        addFeedItem({
            type: 'success',
            name: `${name} (Test IN)`,
            sub: `${isLate ? 'LATE • ' : ''}${sub}`,
            time: formatTime(),
            personType: isEmployee ? 'employee' : 'student',
        });

        triggerBigStatus(isLate ? 'late' : 'present');

        // Start fresh 4s timer
        resetTimerRef.current = setTimeout(() => {
            setScanStatus('idle');
            setStatusMsg('Waiting for card scan...');
            setScannedPerson(null);
            resetTimerRef.current = null;
        }, 4000);
    };
    const scanIcon =
        scanStatus === 'success' ? <CheckCircle style={{ fontSize: 56 }} /> :
            scanStatus === 'error' ? <XCircle style={{ fontSize: 56 }} /> :
                <Scan style={{ fontSize: 56 }} />;

    // Auto-focus the hidden input
    useEffect(() => {
        const focusInput = () => {
            if (hiddenInputRef.current) hiddenInputRef.current.focus();
        };
        focusInput();
        document.addEventListener('click', focusInput);
        return () => document.removeEventListener('click', focusInput);
    }, []);

    return (
        <Page theme={themeObj}>
            <TopBar>
                <Title theme={themeObj}>
                    <BadgeCheck style={{ fontSize: 22 }} />
                    RFID Attendance Scanner
                </Title>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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

                    <SecondaryBtn theme={themeObj} onClick={() => setShowSettings(true)}>
                        <SettingsIcon style={{ fontSize: 18 }} />
                        Settings
                    </SecondaryBtn>
                </div>
            </TopBar>

            {showSettings && attnSettings && (
                <ModalOverlay onClick={() => setShowSettings(false)}>
                    <ModalContent theme={themeObj} onClick={e => e.stopPropagation()}>
                        <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <SettingsIcon /> Attendance Settings
                        </h2>

                        <FormGroup>
                            <Label theme={themeObj}>Student Start Time</Label>
                            <TimeInput
                                theme={themeObj}
                                type="time"
                                value={attnSettings.student_start_time}
                                onChange={e => setAttnSettings({ ...attnSettings, student_start_time: e.target.value })}
                            />
                        </FormGroup>

                        <FormGroup>
                            <Label theme={themeObj}>Staff Start Time</Label>
                            <TimeInput
                                theme={themeObj}
                                type="time"
                                value={attnSettings.staff_start_time}
                                onChange={e => setAttnSettings({ ...attnSettings, staff_start_time: e.target.value })}
                            />
                        </FormGroup>

                        <FormGroup>
                            <Label theme={themeObj}>Grace Period (Minutes)</Label>
                            <TimeInput
                                theme={themeObj}
                                type="number"
                                value={attnSettings.grace_period_minutes}
                                onChange={e => setAttnSettings({ ...attnSettings, grace_period_minutes: parseInt(e.target.value) || 0 })}
                            />
                        </FormGroup>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <SecondaryBtn theme={themeObj} style={{ flex: 1 }} onClick={() => setShowSettings(false)}>
                                Cancel
                            </SecondaryBtn>
                            <SecondaryBtn
                                theme={themeObj}
                                style={{ flex: 1, background: '#3b82f6', color: '#fff', borderColor: '#3b82f6' }}
                                onClick={async () => {
                                    setSavingSettings(true);
                                    try {
                                        const { error } = await supabase
                                            .from('attendance_settings')
                                            .upsert({
                                                school_id: user?.school_id,
                                                ...attnSettings,
                                                updated_at: new Date().toISOString()
                                            }, { onConflict: 'school_id' });
                                        if (error) throw error;
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
                        </div>
                    </ModalContent>
                </ModalOverlay>
            )}

            <MainGrid>
                {/* \u2500\u2500 Left: Scanner \u2500\u2500 */}
                <ScannerCard theme={themeObj}>
                    <ScanArea $status={scanStatus}>
                        {scanStatus === 'success' && scannedPerson?.photo_url ? (
                            <ScannedImage src={scannedPerson.photo_url} alt={scannedPerson.name} />
                        ) : (
                            scanIcon
                        )}
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

                    {isNfcSupported && (
                        <MobileNfcBtn $active={isNfcScanning} onClick={handleStartNfc}>
                            <NfcIcon style={{ fontSize: 20 }} />
                            {isNfcScanning ? 'NFC Scanner Active...' : 'Tap to use Mobile NFC'}
                        </MobileNfcBtn>
                    )}
                </ScannerCard>

                {/* \u2500\u2500 Right: Live Feed \u2500\u2500 */}
                <FeedCard theme={themeObj}>
                    <FeedHeader theme={themeObj}>
                        <FeedTitle theme={themeObj}>
                            <Clock style={{ fontSize: 16 }} />
                            Live Scan Feed
                        </FeedTitle>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <TestBtn theme={themeObj} onClick={simulateScan}>
                                <Scan style={{ fontSize: 14 }} />
                                Test Scan
                            </TestBtn>
                            <ClearBtn theme={themeObj} onClick={handleClear}>
                                <RefreshCw style={{ fontSize: 14 }} />
                                Clear
                            </ClearBtn>
                        </div>
                    </FeedHeader>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, minHeight: 0 }} className="feed-split-grid">
                        <style>{`
                            @media (max-width: 1100px) {
                                .feed-split-grid { grid-template-columns: 1fr !important; }
                            }
                        `}</style>

                        {/* Students Column */}
                        <FeedSection theme={themeObj}>
                            <SectionHeader theme={themeObj} $mode="student">
                                <span>Students</span>
                                <span style={{ opacity: 0.6 }}>{feed.filter(i => i.personType === 'student').length}</span>
                            </SectionHeader>
                            <SectionBody>
                                <FeedList>
                                    {feed.filter(i => i.personType === 'student').length === 0 ? (
                                        <EmptyFeed theme={themeObj}>
                                            <Scan style={{ fontSize: 32, opacity: 0.3 }} />
                                            <span>No student scans</span>
                                        </EmptyFeed>
                                    ) : (
                                        feed.filter(i => i.personType === 'student').map(item => (
                                            <FeedItem key={item.id} $type={item.type} $personType={item.personType} $new={item.isNew} theme={themeObj}>
                                                <FeedIcon $type={item.type} $personType={item.personType}>
                                                    {item.type === 'success' ? <UserCheck style={{ fontSize: 16 }} /> :
                                                        item.type === 'warn' ? <AlertCircle style={{ fontSize: 16 }} /> :
                                                            <XCircle style={{ fontSize: 16 }} />}
                                                </FeedIcon>
                                                <FeedInfo>
                                                    <FeedName theme={themeObj}>{item.name}</FeedName>
                                                    <FeedSub theme={themeObj}>{item.sub}</FeedSub>
                                                </FeedInfo>
                                                <FeedTime theme={themeObj}>{item.time}</FeedTime>
                                            </FeedItem>
                                        ))
                                    )}
                                </FeedList>
                            </SectionBody>
                        </FeedSection>

                        {/* Employees Column */}
                        <FeedSection theme={themeObj}>
                            <SectionHeader theme={themeObj} $mode="employee">
                                <span>Employees</span>
                                <span style={{ opacity: 0.8 }}>{feed.filter(i => i.personType === 'employee').length}</span>
                            </SectionHeader>
                            <SectionBody>
                                <FeedList>
                                    {feed.filter(i => i.personType === 'employee').length === 0 ? (
                                        <EmptyFeed theme={themeObj}>
                                            <Scan style={{ fontSize: 32, opacity: 0.3 }} />
                                            <span>No employee scans</span>
                                        </EmptyFeed>
                                    ) : (
                                        feed.filter(i => i.personType === 'employee').map(item => (
                                            <FeedItem key={item.id} $type={item.type} $personType={item.personType} $new={item.isNew} theme={themeObj}>
                                                <FeedIcon $type={item.type} $personType={item.personType}>
                                                    {item.type === 'success' ? <UserCheck style={{ fontSize: 16 }} /> :
                                                        item.type === 'warn' ? <AlertCircle style={{ fontSize: 16 }} /> :
                                                            <XCircle style={{ fontSize: 16 }} />}
                                                </FeedIcon>
                                                <FeedInfo>
                                                    <FeedName theme={themeObj}>{item.name}</FeedName>
                                                    <FeedSub theme={themeObj}>{item.sub}</FeedSub>
                                                </FeedInfo>
                                                <FeedTime theme={themeObj}>{item.time}</FeedTime>
                                            </FeedItem>
                                        ))
                                    )}
                                </FeedList>
                            </SectionBody>
                        </FeedSection>
                    </div>
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

            {/* Big Status Msg in Bottom Right */}
            {bigStatus && (
                <BigStatusOverlay $status={bigStatus}>
                    <div className="status-label">
                        {bigStatus === 'already_marked' || bigStatus === 'already_left' ? 'Scan Warning' : 'Scan Success'}
                    </div>
                    <div className="status-msg">
                        {bigStatus === 'late' && 'Marked as Late Arrival!'}
                        {bigStatus === 'present' && 'Marked as Present !'}
                        {bigStatus === 'out' && 'Employee Checked Out !'}
                        {bigStatus === 'already_marked' && 'Already Marked Present!'}
                        {bigStatus === 'already_left' && 'Already Checked Out!'}
                    </div>
                </BigStatusOverlay>
            )}
        </Page>
    );
};

export default RFIDAttendancePage;
