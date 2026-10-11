import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import styled, { createGlobalStyle, css } from 'styled-components';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { PageHeaderContext } from '../components/Layout';
import Loader from '../components/Loader';
import {
  EventSeat as ChairIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckIcon,
  Class as ClassIcon,
  PictureAsPdf as PdfIcon,
  Print as PrintIcon,
  Close as CloseIcon,
  School as SchoolIcon,
  FilterList as FilterIcon,
  QrCode2 as QrIcon,
  Assignment as ExamIcon,
  Refresh as RefreshIcon,
  MeetingRoom as RoomIcon,
  FormatListNumbered as NumberIcon
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import * as QRCode from 'qrcode';
import {
  getLayoutPalette,
  getFieldPalette,
  isDark as checkIsDark,
  ClayCard,
  ClayButton,
  ClaySelect,
  ClayInput
} from '../styles/DesignSystem';

// ==========================================
// COLOR THEMES
// ==========================================
export interface ThemePreset {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  badgeBg: string;
  badgeText: string;
  cardBorder: string;
  accentBg: string;
  pdfPrimary: [number, number, number];
  pdfSecondary: [number, number, number];
  pdfLight: [number, number, number];
}

export interface ClassSectionGroup {
  key: string;
  classId: string;
  sectionId: string | null;
  className: string;
  sectionName: string;
  displayName: string;
  activeCount: number;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'slate',
    name: 'Classic Slate',
    primary: '#475569',
    secondary: '#64748b',
    badgeBg: 'linear-gradient(180deg, #64748b 0%, #475569 100%)',
    badgeText: '#ffffff',
    cardBorder: '#334155',
    accentBg: '#f8fafc',
    pdfPrimary: [71, 85, 105],
    pdfSecondary: [100, 116, 139],
    pdfLight: [248, 250, 252]
  },
  {
    id: 'navy',
    name: 'Royal Navy',
    primary: '#1e3a8a',
    secondary: '#1d4ed8',
    badgeBg: 'linear-gradient(180deg, #2563eb 0%, #1e3a8a 100%)',
    badgeText: '#ffffff',
    cardBorder: '#1e3a8a',
    accentBg: '#eff6ff',
    pdfPrimary: [30, 58, 138],
    pdfSecondary: [37, 99, 235],
    pdfLight: [239, 246, 255]
  },
  {
    id: 'maroon',
    name: 'Crimson Maroon',
    primary: '#881337',
    secondary: '#9f1239',
    badgeBg: 'linear-gradient(180deg, #be123c 0%, #881337 100%)',
    badgeText: '#ffffff',
    cardBorder: '#881337',
    accentBg: '#fff1f2',
    pdfPrimary: [136, 19, 55],
    pdfSecondary: [159, 18, 57],
    pdfLight: [255, 241, 242]
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    primary: '#065f46',
    secondary: '#047857',
    badgeBg: 'linear-gradient(180deg, #059669 0%, #065f46 100%)',
    badgeText: '#ffffff',
    cardBorder: '#065f46',
    accentBg: '#ecfdf5',
    pdfPrimary: [6, 95, 70],
    pdfSecondary: [4, 120, 87],
    pdfLight: [236, 253, 245]
  },
  {
    id: 'monochrome',
    name: 'Ink-Saver Mono',
    primary: '#18181b',
    secondary: '#3f3f46',
    badgeBg: 'linear-gradient(180deg, #27272a 0%, #09090b 100%)',
    badgeText: '#ffffff',
    cardBorder: '#18181b',
    accentBg: '#fafafa',
    pdfPrimary: [24, 24, 27],
    pdfSecondary: [63, 63, 70],
    pdfLight: [250, 250, 250]
  }
];

// ==========================================
// STYLED COMPONENTS
// ==========================================

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-height: 100%;
  padding: 0 10px 1.5rem 10px;
  background: ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    const dark = checkIsDark(theme);
    return `
      radial-gradient(circle at top left, ${dark ? 'rgba(255, 255, 255, 0.035)' : `${theme.ACCENT}10`} 0%, transparent 26%),
      linear-gradient(180deg, rgba(255,255,255,${dark ? '0.02' : '0.35'}) 0%, transparent 18%),
      ${layout.shellBg}
    `;
  }};
`;

const PrintGlobalStyle = createGlobalStyle`
  @media print {
    @page {
      margin: 5mm;
      size: A4 portrait;
    }
    
    body {
      background-color: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    body * {
      visibility: hidden;
    }
    
    #chair-print-section, #chair-print-section * {
      visibility: visible;
    }
    
    #chair-print-section {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      background: white !important;
      padding: 0 !important;
      margin: 0 !important;
      display: grid !important;
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 6mm 5mm !important;
    }
  }

  .button-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: button-spin 0.8s linear infinite;
    display: inline-block;
  }

  @keyframes button-spin {
    to { transform: rotate(360deg); }
  }
`;

const ControlPanel = styled(ClayCard)`
  padding: 1rem 1.2rem;
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-radius: 14px;

  @media print {
    display: none;
  }
`;

const ControlRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.85rem;
  align-items: end;
  flex: 1 1 auto;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
`;

const Label = styled.label`
  font-size: 0.73rem;
  font-weight: 700;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  display: flex;
  align-items: center;
  gap: 0.4rem;

  svg {
    font-size: 1rem;
    opacity: 0.75;
  }
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  align-items: center;
  flex-wrap: wrap;
  flex: 0 0 auto;

  @media (max-width: 900px) {
    width: 100%;
    justify-content: flex-start;
  }
`;

const ClassSelectionSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.85rem 1rem;
  background: ${({ theme }) => {
    const dark = checkIsDark(theme);
    return dark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(241, 245, 249, 0.65)';
  }};
  border: 1px solid ${({ theme }) => getFieldPalette(theme).border};
  border-radius: 12px;
`;

const ClassSelectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const ClassSelectionTitle = styled.div`
  font-size: 0.82rem;
  font-weight: 800;
  color: ${({ theme }) => theme.ACCENT};
  display: flex;
  align-items: center;
  gap: 0.45rem;
  letter-spacing: 0.2px;

  svg {
    font-size: 1.15rem;
  }
`;

const ClassSelectionStats = styled.span`
  font-size: 0.76rem;
  font-weight: 600;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  margin-left: 0.35rem;
`;

const ClassQuickActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ClassActionButton = styled.button<{ $active?: boolean }>`
  border: 1px solid ${({ theme, $active }) => ($active ? theme.ACCENT : getFieldPalette(theme).border)};
  background: ${({ theme, $active }) => {
    if ($active) return `${theme.ACCENT}15`;
    return checkIsDark(theme) ? 'rgba(255, 255, 255, 0.04)' : '#ffffff';
  }};
  color: ${({ theme, $active }) => ($active ? theme.ACCENT : getFieldPalette(theme).text)};
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.3rem 0.65rem;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.15s ease-in-out;

  &:hover {
    background: ${({ theme }) => `${theme.ACCENT}20`};
    color: ${({ theme }) => theme.ACCENT};
    border-color: ${({ theme }) => theme.ACCENT};
  }
`;

const ClassPillsGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
`;

const ClassPill = styled.button<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;

  ${({ $selected, theme }) => {
    const accent = theme.ACCENT;
    if ($selected) {
      return css`
        background: ${accent};
        color: #ffffff;
        border: 1.5px solid ${accent};
        box-shadow: 0 3px 8px ${accent}40;
        transform: translateY(-1px);

        &:hover {
          background: ${accent}ee;
          box-shadow: 0 4px 12px ${accent}55;
        }
      `;
    }
    return css`
      background: ${getFieldPalette(theme).bg};
      color: ${getLayoutPalette(theme).shellMutedText};
      border: 1.5px solid ${getFieldPalette(theme).border};

      &:hover {
        border-color: ${accent}88;
        background: ${accent}10;
        color: ${accent};
      }
    `;
  }}
`;

const ClassPillBadge = styled.span<{ $selected: boolean }>`
  font-size: 0.7rem;
  font-weight: 800;
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  line-height: 1.2;
  transition: all 0.18s ease;

  ${({ $selected }) => {
    if ($selected) {
      return css`
        background: rgba(255, 255, 255, 0.28);
        color: #ffffff;
      `;
    }
    return css`
      background: rgba(15, 23, 42, 0.08);
      color: inherit;
    `;
  }}
`;

const SelectedStudentsPanel = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => getFieldPalette(theme).border};
  border-radius: 14px;
  background: ${({ theme }) => getFieldPalette(theme).bg};
  max-height: 180px;
  overflow-y: auto;
`;

const StudentChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 100%;
  min-height: 32px;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  background: ${({ theme }) => `${theme.ACCENT}12`};
  border: 1px solid ${({ theme }) => `${theme.ACCENT}24`};
  color: ${({ theme }) => getFieldPalette(theme).text};
`;

const StudentChipText = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.82rem;
  font-weight: 600;
`;

const ChipRemoveButton = styled.button`
  width: 18px;
  height: 18px;
  min-width: 18px;
  border: none;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.1);
  color: inherit;
  cursor: pointer;
  padding: 0;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }
`;

const SelectedStudentsMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: -0.1rem;
`;

const SelectedStudentsCount = styled.div`
  font-size: 0.78rem;
  font-weight: 700;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const TextActionButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.ACCENT};
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0;

  &:hover {
    text-decoration: underline;
  }
`;

const OptionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px dashed ${({ theme }) => getFieldPalette(theme).border};
`;

const ThemeSelectorWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const ThemeDot = styled.button<{ $active: boolean; $color: string }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  border: 2px solid ${({ $active }) => ($active ? '#ffffff' : 'transparent')};
  outline: 2px solid ${({ $active, $color }) => ($active ? $color : 'transparent')};
  cursor: pointer;
  transition: transform 0.15s ease;

  &:hover {
    transform: scale(1.15);
  }
`;

const PreviewHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0.5rem 5px 0 5px;

  @media print {
    display: none;
  }
`;

const PreviewTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 800;
  color: ${({ theme }) => theme.ACCENT};
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0;
`;

const TagsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(3.65in, 1fr));
  gap: 18px;
  justify-content: center;
  padding: 10px;

  @media print {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 6mm 5mm !important;
    padding: 0 !important;
  }
`;

// ==========================================
// CHAIR TAG CARD STYLING
// ==========================================

const TagItem = styled.div<{ $themePreset: ThemePreset }>`
  width: 3.65in;
  min-height: 2.34in;
  background: #ffffff;
  border: 1.8px solid ${({ $themePreset }) => $themePreset.cardBorder};
  border-radius: 12px;
  padding: 8px 9px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
  overflow: hidden;
  page-break-inside: avoid;
  color: #1f2937;
  gap: 6px;

  /* Double hairline frame inside card */
  &::before {
    content: '';
    position: absolute;
    inset: 5px;
    border: 1.2px solid ${({ $themePreset }) => $themePreset.cardBorder};
    border-radius: 8px;
    z-index: 0;
    pointer-events: none;
    opacity: 0.85;
  }

  @media print {
    box-shadow: none;
    border: 1.5px solid #222222 !important;
    margin: 0;
    background: white !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
`;

const TagCardInner = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 6px;
`;

const TagHeaderSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const SchoolHeaderLine = styled.div`
  font-size: 0.88rem;
  font-weight: 900;
  color: #111827;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: center;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
`;

const ExamBadge = styled.div<{ $themePreset: ThemePreset }>`
  width: 100%;
  font-size: 0.86rem;
  font-weight: 800;
  color: ${({ $themePreset }) => $themePreset.badgeText};
  background: ${({ $themePreset }) => $themePreset.badgeBg};
  border-radius: 6px;
  padding: 0.3rem 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
`;

const TagMainRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 116px;
  gap: 7px;
  align-items: stretch;
`;

const StudentDetailsCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  justify-content: space-between;
`;

const DetailBox = styled.div<{ $themePreset: ThemePreset }>`
  background: linear-gradient(180deg, #ffffff 0%, ${({ $themePreset }) => $themePreset.accentBg} 100%);
  border: 1.3px solid ${({ $themePreset }) => $themePreset.cardBorder};
  border-radius: 6px;
  padding: 5px 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
  min-height: 32px;
`;

const DetailLabel = styled.span`
  font-size: 0.62rem;
  font-weight: 700;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  line-height: 1;
  margin-bottom: 2px;
`;

const DetailValue = styled.span`
  font-size: 0.94rem;
  font-weight: 800;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
`;

const StudentNameValue = styled(DetailValue)`
  font-size: 1.16rem;
  font-weight: 900;
  color: #000000;
  letter-spacing: 0.2px;
`;

const SideSeatHeroBox = styled.div<{ $themePreset: ThemePreset }>`
  background: linear-gradient(180deg, #ffffff 0%, ${({ $themePreset }) => $themePreset.accentBg} 100%);
  border: 2px solid ${({ $themePreset }) => $themePreset.primary};
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5px 6px;
  text-align: center;
  position: relative;
  overflow: hidden;
`;

const SeatBadgeHeader = styled.div<{ $themePreset: ThemePreset }>`
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.8px;
  color: ${({ $themePreset }) => $themePreset.primary};
  text-transform: uppercase;
  margin-bottom: 2px;
`;

const SeatNumberBig = styled.div`
  font-size: 2.3rem;
  font-weight: 900;
  color: #000000;
  line-height: 1;
  font-family: monospace, sans-serif;
  letter-spacing: -0.5px;
`;

const SeatSubLabel = styled.div`
  font-size: 0.6rem;
  font-weight: 700;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 3px;
`;

const QrWrapper = styled.div`
  margin-top: 3px;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const SubInfoRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
`;

const TagFooterSection = styled.div<{ $themePreset: ThemePreset }>`
  margin-top: auto;
  border-top: 1px dashed ${({ $themePreset }) => $themePreset.cardBorder};
  padding-top: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
`;

const FooterNote = styled.div`
  font-size: 0.55rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const SignatureBox = styled.div`
  font-size: 0.56rem;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #9ca3af;
  padding-bottom: 1px;
  min-width: 90px;
  text-align: right;
`;

const EmptyState = styled(ClayCard)`
  padding: 3rem;
  text-align: center;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;

  svg {
    font-size: 3rem;
    opacity: 0.3;
  }
`;

// ==========================================
// COMPONENT
// ==========================================

const ChairTagGenerator: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const { setPageHeader } = useContext(PageHeaderContext);

  // Core Data
  const [loading, setLoading] = useState(true);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [allActiveStudents, setAllActiveStudents] = useState<any[]>([]);
  const [schoolProfile, setSchoolProfile] = useState<any>(null);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  // Filters & Customizations (Class & Section Groups)
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  const [studentToAdd, setStudentToAdd] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Tag Configuration
  const [examName, setExamName] = useState<string>('ANNUAL EXAMINATION 2026');
  const [roomNumber, setRoomNumber] = useState<string>('');
  const [numberingMode, setNumberingMode] = useState<
    'class_section_sequential' | 'class_sequential' | 'continuous' | 'roll'
  >('class_section_sequential');
  const [startSeatNumber, setStartSeatNumber] = useState<number>(1);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('slate');
  const [includeQr, setIncludeQr] = useState<boolean>(true);
  const [includeSignLine, setIncludeSignLine] = useState<boolean>(true);

  // Export State
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [qrCodeMap, setQrCodeMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setPageHeader('Chair Tags');
  }, [setPageHeader]);

  // Active theme preset
  const activeTheme = useMemo(() => {
    return THEME_PRESETS.find(t => t.id === selectedThemeId) || THEME_PRESETS[0];
  }, [selectedThemeId]);

  // Initial Data Fetch
  useEffect(() => {
    if (!user?.school_id) return;

    const fetchInitialData = async () => {
      try {
        const [
          { data: classesData },
          { data: sectionsData },
          { data: activeSessionData },
          { data: profileData },
          { data: schoolData }
        ] = await Promise.all([
          supabase.from('classes').select('id, name').eq('school_id', user.school_id).order('name'),
          supabase.from('sections').select('id, class_id, name').eq('school_id', user.school_id).order('name'),
          supabase.from('sessions').select('id').eq('school_id', user.school_id).eq('is_active', true).maybeSingle(),
          supabase.from('institute_profile').select('*').eq('school_id', user.school_id).single(),
          supabase.from('schools').select('*').eq('id', user.school_id).single()
        ]);

        setClasses(classesData || []);
        setSections(sectionsData || []);
        setActiveSessionId(activeSessionData?.id || null);
        setSchoolProfile({
          name: profileData?.name || schoolData?.name || 'AL HARAM PUBLIC SCHOOL AND IQRA ACADEMY',
          address: profileData?.address || schoolData?.address || ''
        });
      } catch (err: any) {
        console.error('Error fetching initial data for chair tags:', err);
        toast.showToast('Failed to load institute details', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user]);

  // Helper to extract student roll number
  const getStudentRoll = (student: any): string => {
    return (
      student?.roll_no ||
      student?.roll_number ||
      student?.rollNumber ||
      student?.admission_no ||
      student?.admissionNumber ||
      student?.gr_no ||
      student?.registration_no ||
      String(student?.id || '-')
    );
  };

  // Helper for numeric roll sorting
  const getRollSortValue = (student: any): number => {
    const rollStr = String(getStudentRoll(student));
    const numeric = Number(rollStr.replace(/[^\d.-]/g, ''));
    return Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER;
  };

  // Fetch all active students with class history alignment
  useEffect(() => {
    if (!user?.school_id) return;

    const fetchStudents = async () => {
      setFetchingStudents(true);
      try {
        // 1. Fetch direct active students from students table
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('*')
          .eq('school_id', user.school_id)
          .eq('status', 'active')
          .order('name');

        if (studentsError) throw studentsError;
        if (!studentsData || studentsData.length === 0) {
          setAllActiveStudents([]);
          setSelectedStudents([]);
          return;
        }

        let mappedStudents = [...studentsData];

        // 2. If active session is set, merge with session class history
        if (activeSessionId) {
          const { data: historyData } = await supabase
            .from('student_class_history')
            .select('student_id, new_class_id, new_section_id, adm_class_id, adm_section_id')
            .eq('session_id', activeSessionId)
            .eq('school_id', user.school_id);

          if (historyData && historyData.length > 0) {
            const historyMap = new Map<number, any>();
            historyData.forEach((item: any) => {
              historyMap.set(item.student_id, {
                class_id: item.new_class_id || item.adm_class_id,
                section_id: item.new_section_id ?? item.adm_section_id
              });
            });

            mappedStudents = mappedStudents.map((st: any) => {
              const hist = historyMap.get(st.id);
              if (hist) {
                return {
                  ...st,
                  class_id: hist.class_id || st.class_id,
                  section_id: hist.section_id !== undefined ? hist.section_id : st.section_id
                };
              }
              return st;
            });
          }
        }

        // Sort students by student ID in ascending order
        mappedStudents.sort((a: any, b: any) => {
          const idA = Number(a.id);
          const idB = Number(b.id);
          if (!isNaN(idA) && !isNaN(idB) && idA !== idB) {
            return idA - idB;
          }
          return (a.name || '').localeCompare(b.name || '');
        });

        setAllActiveStudents(mappedStudents);

        // By default, select all active class-section groups and all active students
        const allKeys = Array.from(
          new Set(
            mappedStudents.map((s: any) =>
              `${s.class_id ? String(s.class_id) : 'unassigned'}_${s.section_id !== null && s.section_id !== undefined && s.section_id !== '' ? String(s.section_id) : 'none'}`
            )
          )
        ) as string[];

        setSelectedGroupKeys(prev => (prev.length === 0 ? allKeys : prev));
        setSelectedStudents(mappedStudents);
      } catch (err: any) {
        console.error('Error fetching students:', err);
        toast.showToast('Failed to fetch active students', 'error');
      } finally {
        setFetchingStudents(false);
      }
    };

    fetchStudents();
  }, [user, activeSessionId]);

  // Helper to generate unique key for a class and section pair
  const getGroupKey = (classId: any, sectionId: any) => {
    return `${classId ? String(classId) : 'unassigned'}_${sectionId !== null && sectionId !== undefined && sectionId !== '' ? String(sectionId) : 'none'}`;
  };

  // Groups of class + section with active students (e.g. "10th A", "10th B")
  const activeClassSectionGroups = useMemo<ClassSectionGroup[]>(() => {
    const groupCountMap = new Map<string, number>();
    const groupMetaMap = new Map<string, { classId: string; sectionId: string | null }>();

    allActiveStudents.forEach(st => {
      const cid = st.class_id ? String(st.class_id) : 'unassigned';
      const sid = st.section_id !== null && st.section_id !== undefined && st.section_id !== '' ? String(st.section_id) : null;
      const key = getGroupKey(cid, sid);

      groupCountMap.set(key, (groupCountMap.get(key) || 0) + 1);
      if (!groupMetaMap.has(key)) {
        groupMetaMap.set(key, { classId: cid, sectionId: sid });
      }
    });

    const groups: ClassSectionGroup[] = [];

    groupMetaMap.forEach((meta, key) => {
      const cls = classes.find(c => String(c.id) === meta.classId);
      const sec = meta.sectionId ? sections.find(s => String(s.id) === meta.sectionId) : null;

      const className = cls?.name || 'Class';
      const sectionName = sec?.name || '';
      const displayName = sectionName ? `${className} ${sectionName}` : className;

      groups.push({
        key,
        classId: meta.classId,
        sectionId: meta.sectionId,
        className,
        sectionName,
        displayName,
        activeCount: groupCountMap.get(key) || 0
      });
    });

    // Sort by class order first, then section name
    groups.sort((a, b) => {
      const idxA = classes.findIndex(c => String(c.id) === a.classId);
      const idxB = classes.findIndex(c => String(c.id) === b.classId);
      if (idxA !== -1 && idxB !== -1 && idxA !== idxB) {
        return idxA - idxB;
      }
      if (a.className !== b.className) {
        return a.className.localeCompare(b.className);
      }
      return a.sectionName.localeCompare(b.sectionName);
    });

    return groups;
  }, [allActiveStudents, classes, sections]);

  // Total active students within currently selected groups
  const totalActiveInSelectedGroups = useMemo(() => {
    const selectedKeySet = new Set(selectedGroupKeys);
    return allActiveStudents.filter(s => selectedKeySet.has(getGroupKey(s.class_id, s.section_id))).length;
  }, [allActiveStudents, selectedGroupKeys]);

  // Toggle selection for a single class-section group (e.g. 10th A)
  const handleToggleGroup = (groupKey: string) => {
    const isCurrentlySelected = selectedGroupKeys.includes(groupKey);

    if (isCurrentlySelected) {
      const nextKeys = selectedGroupKeys.filter(k => k !== groupKey);
      setSelectedGroupKeys(nextKeys);
      setSelectedStudents(prev => prev.filter(s => getGroupKey(s.class_id, s.section_id) !== groupKey));
    } else {
      const nextKeys = [...selectedGroupKeys, groupKey];
      setSelectedGroupKeys(nextKeys);

      const studentsToAdd = allActiveStudents.filter(s => getGroupKey(s.class_id, s.section_id) === groupKey);
      setSelectedStudents(prev => {
        const existingIds = new Set(prev.map(s => s.id));
        const newOnes = studentsToAdd.filter(s => !existingIds.has(s.id));
        return [...prev, ...newOnes];
      });
    }
  };

  // Select all active class-section groups at once
  const handleSelectAllGroups = () => {
    const allKeys = activeClassSectionGroups.map(g => g.key);
    setSelectedGroupKeys(allKeys);
    setSelectedStudents(allActiveStudents);
    toast.showToast(`Selected all ${allKeys.length} class & section groups (${allActiveStudents.length} students)`, 'info');
  };

  // Deselect all groups at once
  const handleDeselectAllGroups = () => {
    setSelectedGroupKeys([]);
    setSelectedStudents([]);
    toast.showToast('Deselected all groups', 'info');
  };

  // Available students in dropdown to add
  const availableStudentsToAdd = useMemo(() => {
    const selectedIds = new Set(selectedStudents.map(s => s.id));
    const selectedKeySet = new Set(selectedGroupKeys);

    return allActiveStudents.filter(s => {
      const groupKey = getGroupKey(s.class_id, s.section_id);
      const matchGroup = selectedGroupKeys.length === 0 || selectedKeySet.has(groupKey);
      return matchGroup && !selectedIds.has(s.id);
    });
  }, [allActiveStudents, selectedStudents, selectedGroupKeys]);

  const addStudentToSelection = (studentId: string) => {
    const student = allActiveStudents.find(s => s.id?.toString() === studentId);
    if (!student) return;
    setSelectedStudents(prev => [...prev, student]);
    setStudentToAdd('');
  };

  const removeStudentFromSelection = (studentId: string) => {
    setSelectedStudents(prev => prev.filter(s => s.id?.toString() !== studentId));
  };

  const handleSelectAllActive = () => {
    const selectedKeySet = new Set(selectedGroupKeys);
    const matching = allActiveStudents.filter((s: any) => {
      const groupKey = getGroupKey(s.class_id, s.section_id);
      return selectedGroupKeys.length === 0 || selectedKeySet.has(groupKey);
    });
    setSelectedStudents(matching);
    toast.showToast(`Selected all ${matching.length} active students`, 'info');
  };

  const handleDeselectAll = () => {
    setSelectedStudents([]);
  };

  // Generate QR codes for selected students asynchronously
  useEffect(() => {
    if (!includeQr || selectedStudents.length === 0) return;

    let isCancelled = false;

    const generateQrs = async () => {
      const newMap: Record<string, string> = {};
      const batch = selectedStudents.slice(0, 100); // generate for first batch or on-demand
      for (const student of batch) {
        if (qrCodeMap[student.id]) {
          newMap[student.id] = qrCodeMap[student.id];
          continue;
        }
        try {
          const roll = getStudentRoll(student);
          const className = classes.find(c => c.id?.toString() === student.class_id?.toString())?.name || '';
          const qrPayload = `ROLL:${roll}|NAME:${student.name}|CLASS:${className}|ID:${student.id}`;
          const dataUrl = await QRCode.toDataURL(qrPayload, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 100,
            color: { dark: '#000000', light: '#ffffff' }
          });
          newMap[student.id] = dataUrl;
        } catch {
          // Ignore QR generation errors
        }
      }

      if (!isCancelled) {
        setQrCodeMap(prev => ({ ...prev, ...newMap }));
      }
    };

    generateQrs();

    return () => {
      isCancelled = true;
    };
  }, [selectedStudents, includeQr, classes]);

  // Tags to render list with SNo starting from 1 for each class/section
  const tagsToRender = useMemo(() => {
    let list = [...selectedStudents];
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      list = list.filter(s => 
        (s.name || '').toLowerCase().includes(q) ||
        (s.father_name || '').toLowerCase().includes(q) ||
        String(getStudentRoll(s)).toLowerCase().includes(q)
      );
    }

    // Sort students by class, then section, then ascending order of student ID
    list.sort((a: any, b: any) => {
      const classA = a.class_id ? String(a.class_id) : '';
      const classB = b.class_id ? String(b.class_id) : '';
      if (classA !== classB) {
        const idxA = classes.findIndex(c => c.id?.toString() === classA);
        const idxB = classes.findIndex(c => c.id?.toString() === classB);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        return classA.localeCompare(classB);
      }

      const secA = a.section_id !== null && a.section_id !== undefined ? String(a.section_id) : '';
      const secB = b.section_id !== null && b.section_id !== undefined ? String(b.section_id) : '';
      if (secA !== secB) {
        return secA.localeCompare(secB);
      }

      const idA = Number(a.id);
      const idB = Number(b.id);
      if (!isNaN(idA) && !isNaN(idB) && idA !== idB) {
        return idA - idB;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    // Compute S.No starting from 1 for each class and section
    const classSectionCounters = new Map<string, number>();
    const classCounters = new Map<string, number>();

    return list.map((student, overallIdx) => {
      const cid = String(student.class_id || 'unassigned');
      const sid = String(student.section_id || 'default');

      const classSecKey = `${cid}_${sid}`;
      const classSecCount = (classSectionCounters.get(classSecKey) || 0) + 1;
      classSectionCounters.set(classSecKey, classSecCount);

      const classCount = (classCounters.get(cid) || 0) + 1;
      classCounters.set(cid, classCount);

      let sno: string;
      if (numberingMode === 'class_section_sequential') {
        sno = String(classSecCount);
      } else if (numberingMode === 'class_sequential') {
        sno = String(classCount);
      } else if (numberingMode === 'continuous') {
        sno = String(startSeatNumber + overallIdx);
      } else {
        sno = String(getStudentRoll(student));
      }

      const rollNo = getStudentRoll(student);
      const className = classes.find(c => c.id?.toString() === student.class_id?.toString())?.name || '-';
      const sectionName = sections.find(s => s.id?.toString() === student.section_id?.toString())?.name || '';

      return {
        student,
        rollNo,
        sno,
        className,
        sectionName,
        classDisplay: `${className}${sectionName ? ` (${sectionName})` : ''}`,
        examName: examName.trim() || 'CHAIR TAG',
        roomNumber: roomNumber.trim(),
        qrDataUrl: qrCodeMap[student.id] || null
      };
    });
  }, [selectedStudents, searchFilter, numberingMode, startSeatNumber, classes, sections, examName, roomNumber, qrCodeMap]);

  // ==========================================
  // PDF GENERATION (JSPDF)
  // ==========================================

  const drawRoundedRect = (
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    style: 'S' | 'F' | 'DF' = 'S'
  ) => {
    pdf.roundedRect(x, y, width, height, radius, radius, style);
  };

  const drawChairTagToPdf = (
    pdf: jsPDF,
    tag: any,
    x: number,
    y: number,
    width: number,
    height: number,
    themePreset: ThemePreset
  ) => {
    const pad = 4;
    const contentX = x + pad;
    const contentW = width - pad * 2;
    const [pR, pG, pB] = themePreset.pdfPrimary;
    const [sR, sG, sB] = themePreset.pdfSecondary;
    const [lR, lG, lB] = themePreset.pdfLight;

    const studentName = (tag.student.name || '-').toUpperCase();
    const parentName = tag.student.father_name || '-';
    const classValue = tag.classDisplay || '-';
    const snoValue = String(tag.sno || '-');
    const examHeader = tag.examName.toUpperCase();
    const schoolName = (schoolProfile?.name || 'AL HARAM PUBLIC SCHOOL AND IQRA ACADEMY').toUpperCase();
    const roomText = tag.roomNumber ? `ROOM: ${tag.roomNumber.toUpperCase()}` : '';

    // 1. Outer Clean Card Box with Theme Border
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(pR, pG, pB);
    pdf.setLineWidth(0.6);
    drawRoundedRect(pdf, x, y, width, height, 3, 'DF');

    // 2. Inset Inner Hairline Border
    pdf.setDrawColor(pR, pG, pB);
    pdf.setLineWidth(0.2);
    drawRoundedRect(pdf, x + 1.8, y + 1.8, width - 3.6, height - 3.6, 2, 'S');

    // 3. School Header Line (LARGE & BOLD)
    pdf.setTextColor(17, 24, 39);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.2);
    const schoolLine = pdf.splitTextToSize(schoolName, contentW - 4).slice(0, 1);
    const schoolText = Array.isArray(schoolLine) ? schoolLine[0] : schoolLine;
    const schoolX = x + (width - pdf.getTextWidth(schoolText)) / 2;
    pdf.text(schoolText, schoolX, y + 5.6);

    // 4. Exam Name / Chair Tag Header Banner (PROMINENT)
    const examBannerY = y + 7.4;
    const examBannerH = 5.6;
    pdf.setFillColor(pR, pG, pB);
    pdf.setDrawColor(sR, sG, sB);
    pdf.setLineWidth(0.2);
    drawRoundedRect(pdf, contentX, examBannerY, contentW, examBannerH, 1.6, 'DF');

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.4);
    const examLine = pdf.splitTextToSize(examHeader, contentW - 6).slice(0, 1);
    const examText = Array.isArray(examLine) ? examLine[0] : examLine;
    const examX = x + (width - pdf.getTextWidth(examText)) / 2;
    pdf.text(examText, examX, examBannerY + 3.9);

    // 5. Main Center Section: Student Details Left + Huge Hero Chair Box Right
    const mainSectionY = examBannerY + examBannerH + 2.4;
    const heroBoxW = 32; // 32mm wide for big clear numbers
    const leftDetailsW = contentW - heroBoxW - 2.5;
    const heroBoxX = contentX + leftDetailsW + 2.5;
    const heroBoxH = height - (mainSectionY - y) - 6.2;

    // --- Left Details Boxes (LARGE READABLE FONTS - NO REG NO) ---
    const hasRoom = Boolean(tag.roomNumber);

    if (hasRoom) {
      // 4 Boxes (when Exam Room is specified)
      // 1. Candidate Name Box
      const nameBoxY = mainSectionY;
      const nameBoxH = 10.5;
      pdf.setFillColor(lR, lG, lB);
      pdf.setDrawColor(pR, pG, pB);
      pdf.setLineWidth(0.3);
      drawRoundedRect(pdf, contentX, nameBoxY, leftDetailsW, nameBoxH, 1.6, 'DF');

      pdf.setTextColor(75, 85, 99);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(5.2);
      pdf.text('CANDIDATE NAME', contentX + 2.5, nameBoxY + 3.2);

      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12.6);
      const nameLine = pdf.splitTextToSize(studentName, leftDetailsW - 5).slice(0, 1);
      pdf.text(nameLine, contentX + 2.5, nameBoxY + 8.5);

      // 2. Father's Name Box (ABOVE CLASS)
      const fatherBoxY = nameBoxY + nameBoxH + 1.8;
      const fatherBoxH = 9.0;
      pdf.setFillColor(lR, lG, lB);
      pdf.setDrawColor(pR, pG, pB);
      pdf.setLineWidth(0.3);
      drawRoundedRect(pdf, contentX, fatherBoxY, leftDetailsW, fatherBoxH, 1.6, 'DF');

      pdf.setTextColor(75, 85, 99);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(5.2);
      pdf.text("FATHER'S NAME", contentX + 2.5, fatherBoxY + 3.0);

      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10.0);
      const fatherLine = pdf.splitTextToSize(parentName, leftDetailsW - 5).slice(0, 1);
      pdf.text(fatherLine, contentX + 2.5, fatherBoxY + 7.2);

      // 3. Class & Section Box
      const classBoxY = fatherBoxY + fatherBoxH + 1.8;
      const classBoxH = 9.4;
      pdf.setFillColor(lR, lG, lB);
      pdf.setDrawColor(pR, pG, pB);
      pdf.setLineWidth(0.3);
      drawRoundedRect(pdf, contentX, classBoxY, leftDetailsW, classBoxH, 1.6, 'DF');

      pdf.setTextColor(75, 85, 99);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(5.2);
      pdf.text('CLASS & SECTION', contentX + 2.5, classBoxY + 3.0);

      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11.0);
      const classLine = pdf.splitTextToSize(classValue, leftDetailsW - 5).slice(0, 1);
      pdf.text(classLine, contentX + 2.5, classBoxY + 7.5);

      // 4. Exam Room Box
      const roomBoxY = classBoxY + classBoxH + 1.8;
      const roomBoxH = 8.5;
      pdf.setFillColor(lR, lG, lB);
      pdf.setDrawColor(pR, pG, pB);
      pdf.setLineWidth(0.3);
      drawRoundedRect(pdf, contentX, roomBoxY, leftDetailsW, roomBoxH, 1.6, 'DF');

      pdf.setTextColor(75, 85, 99);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(5.2);
      pdf.text('EXAM ROOM', contentX + 2.5, roomBoxY + 3.0);

      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.6);
      pdf.text(String(tag.roomNumber), contentX + 2.5, roomBoxY + 6.8);
    } else {
      // 3 Large Balanced Clean Boxes: Candidate Name, Father's Name, Class & Section (NO REG NO)
      // 1. Candidate Name Box (LARGE & PROMINENT)
      const nameBoxY = mainSectionY;
      const nameBoxH = 13.0;
      pdf.setFillColor(lR, lG, lB);
      pdf.setDrawColor(pR, pG, pB);
      pdf.setLineWidth(0.3);
      drawRoundedRect(pdf, contentX, nameBoxY, leftDetailsW, nameBoxH, 1.6, 'DF');

      pdf.setTextColor(75, 85, 99);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(5.4);
      pdf.text('CANDIDATE NAME', contentX + 2.5, nameBoxY + 3.6);

      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13.6);
      const nameLine = pdf.splitTextToSize(studentName, leftDetailsW - 5).slice(0, 1);
      pdf.text(nameLine, contentX + 2.5, nameBoxY + 10.2);

      // 2. Father's Name Box (LARGE & CLEAR - ABOVE CLASS)
      const fatherBoxY = nameBoxY + nameBoxH + 2.2;
      const fatherBoxH = 11.0;
      pdf.setFillColor(lR, lG, lB);
      pdf.setDrawColor(pR, pG, pB);
      pdf.setLineWidth(0.3);
      drawRoundedRect(pdf, contentX, fatherBoxY, leftDetailsW, fatherBoxH, 1.6, 'DF');

      pdf.setTextColor(75, 85, 99);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(5.4);
      pdf.text("FATHER'S NAME", contentX + 2.5, fatherBoxY + 3.4);

      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11.0);
      const fatherLine = pdf.splitTextToSize(parentName, leftDetailsW - 5).slice(0, 1);
      pdf.text(fatherLine, contentX + 2.5, fatherBoxY + 8.8);

      // 3. Class & Section Box (LARGE & BOLD)
      const classBoxY = fatherBoxY + fatherBoxH + 2.2;
      const classBoxH = 11.8;
      pdf.setFillColor(lR, lG, lB);
      pdf.setDrawColor(pR, pG, pB);
      pdf.setLineWidth(0.3);
      drawRoundedRect(pdf, contentX, classBoxY, leftDetailsW, classBoxH, 1.6, 'DF');

      pdf.setTextColor(75, 85, 99);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(5.4);
      pdf.text('CLASS & SECTION', contentX + 2.5, classBoxY + 3.6);

      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12.0);
      const classLine = pdf.splitTextToSize(classValue, leftDetailsW - 5).slice(0, 1);
      pdf.text(classLine, contentX + 2.5, classBoxY + 9.4);
    }

    // --- Right Hero Chair Number Box ---
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(pR, pG, pB);
    pdf.setLineWidth(0.6);
    drawRoundedRect(pdf, heroBoxX, mainSectionY, heroBoxW, heroBoxH, 2.4, 'DF');

    // Hero Header Banner
    const seatBannerH = 5.4;
    pdf.setFillColor(pR, pG, pB);
    pdf.roundedRect(heroBoxX, mainSectionY, heroBoxW, seatBannerH, 2.4, 2.4, 'F');
    pdf.rect(heroBoxX, mainSectionY + 2.5, heroBoxW, seatBannerH - 2.5, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.4);
    const seatHeaderTxt = numberingMode === 'roll' ? 'ROLL NO' : 'CHAIR NO';
    const seatHeaderX = heroBoxX + (heroBoxW - pdf.getTextWidth(seatHeaderTxt)) / 2;
    pdf.text(seatHeaderTxt, seatHeaderX, mainSectionY + 3.8);

    // Big S.No / Chair Number
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');

    if (includeQr && tag.qrDataUrl) {
      pdf.setFontSize(24);
      const seatTextWidth = pdf.getTextWidth(snoValue);
      const seatNumX = heroBoxX + (heroBoxW - seatTextWidth) / 2;
      pdf.text(snoValue, seatNumX, mainSectionY + 16);

      const qrSize = 14;
      const qrX = heroBoxX + (heroBoxW - qrSize) / 2;
      const qrY = mainSectionY + 19;
      try {
        pdf.addImage(tag.qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      } catch {
        // ignore
      }
    } else {
      pdf.setFontSize(32);
      const seatTextWidth = pdf.getTextWidth(snoValue);
      const seatNumX = heroBoxX + (heroBoxW - seatTextWidth) / 2;
      pdf.text(snoValue, seatNumX, mainSectionY + 23);

      pdf.setTextColor(75, 85, 99);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.5);
      const deskSub = 'CHAIR TAG';
      pdf.text(deskSub, heroBoxX + (heroBoxW - pdf.getTextWidth(deskSub)) / 2, mainSectionY + 34);
    }

    // 6. Clean Footer Section
    const footerY = y + height - 5.5;
    pdf.setDrawColor(pR, pG, pB);
    pdf.setLineWidth(0.2);
    pdf.line(contentX, footerY, contentX + contentW, footerY);

    pdf.setTextColor(100, 116, 139);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(5.2);
    pdf.text('DO NOT REMOVE OR DAMAGE THIS TAG', contentX + 1, footerY + 3.5);

    if (includeSignLine) {
      pdf.setTextColor(31, 41, 55);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(5.6);
      const signTxt = 'Invigilator Sign: _______________';
      const signX = contentX + contentW - pdf.getTextWidth(signTxt) - 1;
      pdf.text(signTxt, signX, footerY + 3.5);
    }
  };

  const generatePDF = async () => {
    if (tagsToRender.length === 0) {
      toast.showToast('No active students selected to generate tags.', 'warning');
      return;
    }

    try {
      setIsGeneratingPdf(true);

      // Pre-generate QR codes for any students missing in qrCodeMap
      if (includeQr) {
        for (const tag of tagsToRender) {
          if (!tag.qrDataUrl) {
            try {
              const roll = tag.rollNo;
              const qrPayload = `ROLL:${roll}|NAME:${tag.student.name}|CLASS:${tag.className}|ID:${tag.student.id}`;
              const dataUrl = await QRCode.toDataURL(qrPayload, {
                errorCorrectionLevel: 'M',
                margin: 1,
                width: 100,
                color: { dark: '#000000', light: '#ffffff' }
              });
              tag.qrDataUrl = dataUrl;
            } catch {
              // Ignore QR code errors
            }
          }
        }
      }

      const totalTags = tagsToRender.length;
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const marginX = 6;
      const marginY = 6;
      const gapX = 5;
      const gapY = 3.5;
      const cols = 2;
      const rows = 4;
      const tagsPerPage = cols * rows;
      const cardWidth = (pageWidth - marginX * 2 - gapX) / cols;
      const cardHeight = (pageHeight - marginY * 2 - gapY) / rows;
      const renderedCardHeight = cardHeight - 6;
      const totalPages = Math.ceil(totalTags / tagsPerPage);

      for (let p = 0; p < totalPages; p++) {
        const startIdx = p * tagsPerPage;
        const endIdx = Math.min(startIdx + tagsPerPage, totalTags);
        if (p > 0) pdf.addPage();

        for (let i = startIdx; i < endIdx; i++) {
          const indexOnPage = i - startIdx;
          const col = indexOnPage % cols;
          const row = Math.floor(indexOnPage / cols);
          const x = marginX + col * (cardWidth + gapX);
          const y = marginY + row * (cardHeight + gapY);
          drawChairTagToPdf(pdf, tagsToRender[i], x, y, cardWidth, renderedCardHeight, activeTheme);
        }
      }

      let groupLabel = 'All_Class_Sections';
      if (selectedGroupKeys.length === 1) {
        const single = activeClassSectionGroups.find(g => g.key === selectedGroupKeys[0]);
        groupLabel = (single?.displayName || 'Group').replace(/\s+/g, '_');
      } else if (selectedGroupKeys.length > 1 && selectedGroupKeys.length < activeClassSectionGroups.length) {
        groupLabel = `${selectedGroupKeys.length}_Groups`;
      }
      const fileName = `Chair_Tags_${groupLabel}.pdf`;
      pdf.save(fileName);
      toast.showToast(`Chair tags generated (${totalTags} tags)!`, 'success');
    } catch (error) {
      console.error('PDF Generation error:', error);
      toast.showToast('Failed to generate PDF.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintBrowser = () => {
    window.print();
  };

  if (loading) return <Loader />;

  return (
    <Container>
      <PrintGlobalStyle />

      <ControlPanel>
        {/* Row 1: Interactive Class & Section Groups Selector (e.g. 10th A, 10th B) */}
        <ClassSelectionSection>
          <ClassSelectionHeader>
            <ClassSelectionTitle>
              <ClassIcon /> Select Class & Sections ({selectedGroupKeys.length} of {activeClassSectionGroups.length} selected)
              <ClassSelectionStats>
                • {totalActiveInSelectedGroups} active student{totalActiveInSelectedGroups === 1 ? '' : 's'}
              </ClassSelectionStats>
            </ClassSelectionTitle>
            <ClassQuickActions>
              <ClassActionButton
                type="button"
                onClick={handleSelectAllGroups}
                $active={activeClassSectionGroups.length > 0 && selectedGroupKeys.length === activeClassSectionGroups.length}
                title="Select all active class & section groups"
              >
                <CheckIcon style={{ fontSize: '0.95rem' }} /> Select All
              </ClassActionButton>
              <ClassActionButton
                type="button"
                onClick={handleDeselectAllGroups}
                $active={selectedGroupKeys.length === 0}
                title="Deselect all groups"
              >
                <UncheckIcon style={{ fontSize: '0.95rem' }} /> Deselect All
              </ClassActionButton>
            </ClassQuickActions>
          </ClassSelectionHeader>

          <ClassPillsGrid>
            {activeClassSectionGroups.map(g => {
              const isSelected = selectedGroupKeys.includes(g.key);
              return (
                <ClassPill
                  key={g.key}
                  type="button"
                  $selected={isSelected}
                  onClick={() => handleToggleGroup(g.key)}
                  title={`Click to ${isSelected ? 'deselect' : 'select'} ${g.displayName} (${g.activeCount} active students)`}
                >
                  {isSelected ? (
                    <CheckIcon style={{ fontSize: '0.95rem' }} />
                  ) : (
                    <UncheckIcon style={{ fontSize: '0.95rem', opacity: 0.55 }} />
                  )}
                  <span>{g.displayName}</span>
                  <ClassPillBadge $selected={isSelected}>
                    {g.activeCount}
                  </ClassPillBadge>
                </ClassPill>
              );
            })}
          </ClassPillsGrid>
        </ClassSelectionSection>

        {/* Row 2: Student Filter + Export Actions */}
        <ControlRow>
          <FilterGrid>
            <FormGroup>
              <Label><ChairIcon /> Add Individual Student</Label>
              <ClaySelect
                value={studentToAdd}
                onChange={(e) => addStudentToSelection(e.target.value)}
                disabled={availableStudentsToAdd.length === 0}
              >
                <option value="">
                  {availableStudentsToAdd.length === 0
                    ? 'All matching students selected'
                    : `Select to add (${availableStudentsToAdd.length} available)`}
                </option>
                {availableStudentsToAdd.map(student => (
                  <option key={student.id} value={student.id}>
                    {[getStudentRoll(student), student.name, student.father_name]
                      .filter(Boolean)
                      .join(' - ')}
                  </option>
                ))}
              </ClaySelect>
            </FormGroup>

            <FormGroup>
              <Label><FilterIcon /> Filter Preview</Label>
              <ClayInput
                type="text"
                placeholder="Search name / roll..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </FormGroup>
          </FilterGrid>

          <Actions>
            <ClayButton
              $variant="secondary"
              onClick={selectedStudents.length === 0 ? handleSelectAllActive : handleDeselectAll}
            >
              {selectedStudents.length === 0 ? <CheckIcon /> : <UncheckIcon />}
              {selectedStudents.length === 0 ? 'Select All Active' : 'Deselect All'}
            </ClayButton>

            <ClayButton
              $variant="secondary"
              onClick={handlePrintBrowser}
              disabled={tagsToRender.length === 0}
              title="Print directly using browser print"
            >
              <PrintIcon />
              Print
            </ClayButton>

            <ClayButton
              $variant="primary"
              onClick={generatePDF}
              disabled={tagsToRender.length === 0 || isGeneratingPdf}
              style={{ minWidth: '160px' }}
            >
              {isGeneratingPdf ? <div className="button-spinner" style={{ marginRight: '8px' }} /> : <PdfIcon />}
              {isGeneratingPdf ? 'Generating...' : `Export PDF (${tagsToRender.length} Tags)`}
            </ClayButton>
          </Actions>
        </ControlRow>

        {/* Selected Students Chips (if customized) */}
        {selectedStudents.length > 0 && (
          <FormGroup>
            <SelectedStudentsMeta>
              <SelectedStudentsCount>
                <ChairIcon fontSize="small" />
                {selectedStudents.length} active student{selectedStudents.length === 1 ? '' : 's'} included
              </SelectedStudentsCount>
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <TextActionButton type="button" onClick={handleSelectAllActive}>
                  Reset To All Active
                </TextActionButton>
                <TextActionButton type="button" onClick={handleDeselectAll}>
                  Clear Selection
                </TextActionButton>
              </div>
            </SelectedStudentsMeta>

            <SelectedStudentsPanel>
              {selectedStudents.map((student: any) => (
                <StudentChip key={student.id}>
                  <StudentChipText>
                    {[getStudentRoll(student), student.name, student.father_name]
                      .filter(Boolean)
                      .join(' - ')}
                  </StudentChipText>
                  <ChipRemoveButton
                    type="button"
                    onClick={() => removeStudentFromSelection(student.id.toString())}
                    aria-label={`Remove ${student.name}`}
                  >
                    <CloseIcon style={{ fontSize: '0.85rem' }} />
                  </ChipRemoveButton>
                </StudentChip>
              ))}
            </SelectedStudentsPanel>
          </FormGroup>
        )}

        {/* Row 2: Exam Customization & Visual Settings */}
        <OptionsGrid>
          <FormGroup>
            <Label><ExamIcon /> Exam Title</Label>
            <ClayInput
              type="text"
              value={examName}
              placeholder="e.g. ANNUAL EXAMINATION 2026"
              onChange={(e) => setExamName(e.target.value)}
            />
          </FormGroup>

          <FormGroup>
            <Label><RoomIcon /> Examination Room / Hall (Optional)</Label>
            <ClayInput
              type="text"
              value={roomNumber}
              placeholder="e.g. Hall 1 / Room 102"
              onChange={(e) => setRoomNumber(e.target.value)}
            />
          </FormGroup>

          <FormGroup>
            <Label><NumberIcon /> Chair Numbering (S.No)</Label>
            <ClaySelect
              value={numberingMode}
              onChange={(e) => setNumberingMode(e.target.value as any)}
            >
              <option value="class_section_sequential">Sequential S.No (starts from 1 per class & section)</option>
              <option value="class_sequential">Sequential S.No (starts from 1 per class)</option>
              <option value="continuous">Continuous Sequential (1, 2, 3...)</option>
              <option value="roll">Use Roll Number from DB</option>
            </ClaySelect>
          </FormGroup>

          {numberingMode === 'continuous' && (
            <FormGroup>
              <Label><NumberIcon /> Starting Seat Number</Label>
              <ClayInput
                type="number"
                min="1"
                value={startSeatNumber}
                onChange={(e) => setStartSeatNumber(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </FormGroup>
          )}

          <FormGroup>
            <Label>Theme Preset</Label>
            <ThemeSelectorWrapper>
              {THEME_PRESETS.map(preset => (
                <ThemeDot
                  key={preset.id}
                  type="button"
                  $color={preset.primary}
                  $active={selectedThemeId === preset.id}
                  title={preset.name}
                  onClick={() => setSelectedThemeId(preset.id)}
                />
              ))}
              <span style={{ fontSize: '0.74rem', fontWeight: 600, marginLeft: '4px' }}>
                {activeTheme.name}
              </span>
            </ThemeSelectorWrapper>
          </FormGroup>

          <FormGroup>
            <Label><QrIcon /> Tag Elements</Label>
            <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'center', height: '100%' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={includeQr}
                  onChange={(e) => setIncludeQr(e.target.checked)}
                />
                QR Code
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={includeSignLine}
                  onChange={(e) => setIncludeSignLine(e.target.checked)}
                />
                Signature Box
              </label>
            </div>
          </FormGroup>
        </OptionsGrid>
      </ControlPanel>

      {/* Main Preview Area */}
      {fetchingStudents ? (
        <Loader />
      ) : tagsToRender.length > 0 ? (
        <>
          <PreviewHeader>
            <PreviewTitle>
              <ChairIcon />
              Preview Chair Tags ({tagsToRender.length})
            </PreviewTitle>
            <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>
              Standard A4 Sheet • 8 Tags / Page (2 columns × 4 rows)
            </div>
          </PreviewHeader>

          <TagsContainer id="chair-print-section">
            {tagsToRender.map((tag, idx) => (
              <TagItem key={`${tag.student.id}-${idx}`} $themePreset={activeTheme}>
                <TagCardInner>
                  {/* Header: School Name & Exam Title */}
                  <TagHeaderSection>
                    <SchoolHeaderLine>
                      {schoolProfile?.name || 'AL HARAM PUBLIC SCHOOL AND IQRA ACADEMY'}
                    </SchoolHeaderLine>
                    <ExamBadge $themePreset={activeTheme}>
                      {tag.examName}
                    </ExamBadge>
                  </TagHeaderSection>

                  {/* Main Grid: Student Info Left + Hero Seat Right */}
                  <TagMainRow>
                    <StudentDetailsCol>
                      <DetailBox $themePreset={activeTheme}>
                        <DetailLabel>Candidate Name</DetailLabel>
                        <StudentNameValue>{tag.student.name || '-'}</StudentNameValue>
                      </DetailBox>

                      <DetailBox $themePreset={activeTheme}>
                        <DetailLabel>Father's Name</DetailLabel>
                        <DetailValue>{tag.student.father_name || '-'}</DetailValue>
                      </DetailBox>

                      <DetailBox $themePreset={activeTheme}>
                        <DetailLabel>Class & Section</DetailLabel>
                        <DetailValue style={{ fontSize: '1.02rem', fontWeight: 800 }}>
                          {tag.classDisplay || '-'}
                        </DetailValue>
                      </DetailBox>

                      {tag.roomNumber && (
                        <DetailBox $themePreset={activeTheme}>
                          <DetailLabel>Exam Room</DetailLabel>
                          <DetailValue>{tag.roomNumber}</DetailValue>
                        </DetailBox>
                      )}
                    </StudentDetailsCol>

                    {/* Right Hero Seat Number & QR */}
                    <SideSeatHeroBox $themePreset={activeTheme}>
                      <SeatBadgeHeader $themePreset={activeTheme}>
                        {numberingMode === 'roll' ? 'ROLL NO' : 'CHAIR NO'}
                      </SeatBadgeHeader>
                      <SeatNumberBig>{tag.sno}</SeatNumberBig>

                      {includeQr && tag.qrDataUrl ? (
                        <QrWrapper>
                          <img src={tag.qrDataUrl} alt={`QR for ${tag.student.name}`} />
                        </QrWrapper>
                      ) : (
                        <SeatSubLabel>CHAIR TAG</SeatSubLabel>
                      )}
                    </SideSeatHeroBox>
                  </TagMainRow>

                  {/* Footer Bar */}
                  <TagFooterSection $themePreset={activeTheme}>
                    <FooterNote>DO NOT REMOVE OR DAMAGE THIS TAG</FooterNote>
                    {includeSignLine && (
                      <SignatureBox>Invigilator Sign: _________</SignatureBox>
                    )}
                  </TagFooterSection>
                </TagCardInner>
              </TagItem>
            ))}
          </TagsContainer>
        </>
      ) : selectedGroupKeys.length === 0 ? (
        <EmptyState>
          <ClassIcon />
          <div>
            <strong style={{ fontSize: '1.05rem', display: 'block', marginBottom: '4px' }}>No Class & Section Selected</strong>
            <span>Please select one or more class & section groups above or click below to generate tags.</span>
          </div>
          <ClayButton $variant="primary" onClick={handleSelectAllGroups}>
            <CheckIcon /> Select All Groups
          </ClayButton>
        </EmptyState>
      ) : (
        <EmptyState>
          <ChairIcon />
          <div>No active students found matching the selected class & section groups.</div>
          <ClayButton $variant="secondary" onClick={handleSelectAllActive}>
            <RefreshIcon /> Reset Selection
          </ClayButton>
        </EmptyState>
      )}
    </Container>
  );
};

export default ChairTagGenerator;
