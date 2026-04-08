import React, { useState, useEffect, useRef } from 'react';
import styled, { useTheme, createGlobalStyle, css } from 'styled-components';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { PageHeaderContext } from '../components/Layout';
import Loader from '../components/Loader';
import { Print, Badge as BadgeIcon, TableView } from '@mui/icons-material';
import { pdf } from '@react-pdf/renderer';
import StudentCardsPDFDocument from '../components/StudentCardsPDFDocument';
import { getStudentDisplayId } from '../utils/studentUtils';
import {
  CARD_RADIUS_LG,
  clayPanelStyle,
  getButtonPalette,
  getLayoutPalette,
  isDark as checkIsDark,
  clayInputStyle,
  minimalSelectMenuStyle,
} from '../styles/DesignSystem';

type CardColorScheme = {
  key: string;
  label: string;
  description: string;
  topCurve: string;
  mainCurve: string;
  bottomBorder: string;
  idPill: string;
  nameHighlight: string;
};

type CardDesignVariant = 'classic' | 'modern';

const DEFAULT_CARD_COLOR_SCHEME: CardColorScheme = {
  key: 'classic',
  label: 'Classic Green',
  description: 'Current card style with the familiar green and navy header.',
  topCurve: '#2cb742',
  mainCurve: '#191636',
  bottomBorder: '#4ab44b',
  idPill: '#d32f2f',
  nameHighlight: '#d32f2f',
};

const CARD_COLOR_PRESETS: CardColorScheme[] = [
  DEFAULT_CARD_COLOR_SCHEME,
  {
    key: 'royal',
    label: 'Royal Blue',
    description: 'Clean blue tones with a polished school-brand look.',
    topCurve: '#2f80ed',
    mainCurve: '#143a7b',
    bottomBorder: '#4da3ff',
    idPill: '#f05a28',
    nameHighlight: '#f05a28',
  },
  {
    key: 'sunrise',
    label: 'Iqra',
    description: 'A clean light-and-dark treatment built around the student uniform sand tone.',
    topCurve: '#FFC370',
    mainCurve: '#CE8A2C',
    bottomBorder: '#e3b56a',
    idPill: '#c9964f',
    nameHighlight: '#c9964f',
  },
  {
    key: 'teal',
    label: 'Teal Fresh',
    description: 'Modern teal palette with softer contrast for easy reading.',
    topCurve: '#14b8a6',
    mainCurve: '#134e4a',
    bottomBorder: '#2dd4bf',
    idPill: '#0f766e',
    nameHighlight: '#0f766e',
  },
];

const buildStudentCardColorsStorageKey = (schoolId: number | string) => `student_card_colors_${schoolId}`;

const normalizeCardColorScheme = (value: any): CardColorScheme => ({
  key: typeof value?.key === 'string' ? value.key : DEFAULT_CARD_COLOR_SCHEME.key,
  label: typeof value?.label === 'string' ? value.label : DEFAULT_CARD_COLOR_SCHEME.label,
  description: typeof value?.description === 'string' ? value.description : DEFAULT_CARD_COLOR_SCHEME.description,
  topCurve: typeof value?.topCurve === 'string' ? value.topCurve : DEFAULT_CARD_COLOR_SCHEME.topCurve,
  mainCurve: typeof value?.mainCurve === 'string' ? value.mainCurve : DEFAULT_CARD_COLOR_SCHEME.mainCurve,
  bottomBorder: typeof value?.bottomBorder === 'string' ? value.bottomBorder : DEFAULT_CARD_COLOR_SCHEME.bottomBorder,
  idPill: typeof value?.idPill === 'string' ? value.idPill : DEFAULT_CARD_COLOR_SCHEME.idPill,
  nameHighlight: typeof value?.nameHighlight === 'string' ? value.nameHighlight : DEFAULT_CARD_COLOR_SCHEME.nameHighlight,
});

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 100%;
  padding: 0 10px 1rem 10px;
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
      margin: 10mm;
    }
    
    body {
      background-color: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    body * {
      visibility: hidden;
    }
    
    #print-section, #print-section * {
      visibility: visible;
    }
    
    #print-section {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
    }
  }
`;

const Header = styled.div`
  ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    return css`
      ${clayPanelStyle}
      border: 1px solid ${layout.shellBorder};
      box-shadow: ${layout.surfaceShadow};
    `;
  }}
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin: 8px 0 6px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  border-radius: ${CARD_RADIUS_LG};
  padding: 8px 10px;
  min-height: 36px;

  @media print {
    display: none;
  }
`;

const SEGMENTED_HEIGHT = '30px';

const SegmentedGroup = styled.div`
  ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    return css`
      background: ${layout.surfaceBg};
      border: 1px solid ${layout.surfaceBorder};
      box-shadow: ${layout.surfaceShadow};
    `;
  }}
  display: flex;
  align-items: center;
  border-radius: ${CARD_RADIUS_LG};
  overflow: hidden;
  @media (max-width: 700px) {
    width: 100%;
    justify-content: center;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
  }
`;

const ControlsPanel = styled.div`
  ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    return css`
      ${clayPanelStyle}
      border: 1px solid ${layout.shellBorder};
      box-shadow: ${layout.surfaceShadow};
      background: ${layout.surfaceBg};
    `;
  }}
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  border-radius: ${CARD_RADIUS_LG};
  padding: 0.95rem;
  margin-bottom: 0.75rem;
`;

const ControlsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  align-items: stretch;
`;

const ControlBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-width: 220px;
  flex: 1;
`;

const ControlLabel = styled.div`
  font-size: 0.8rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const HelperText = styled.div`
  font-size: 0.72rem;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  line-height: 1.35;
`;

const PresetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.7rem;
`;

const PresetButton = styled.button<{ $active: boolean; $scheme: CardColorScheme }>`
  border-radius: 16px;
  padding: 0.8rem;
  cursor: pointer;
  text-align: left;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  border: 1px solid ${({ theme, $active }) => $active ? theme.ACCENT : getLayoutPalette(theme).surfaceBorder};
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  box-shadow: ${({ theme, $active }) => $active ? `0 12px 24px ${theme.ACCENT}22` : getLayoutPalette(theme).surfaceShadow};

  &:hover {
    transform: translateY(-1px);
  }
`;

const PresetSwatches = styled.div`
  display: flex;
  gap: 0.45rem;
  margin-bottom: 0.65rem;
`;

const Swatch = styled.span<{ $color: string }>`
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: ${({ $color }) => $color};
  border: 1px solid rgba(255,255,255,0.55);
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08);
`;

const PresetTitle = styled.div`
  font-size: 0.82rem;
  font-weight: 800;
  margin-bottom: 0.15rem;
`;

const PresetDescription = styled.div`
  font-size: 0.7rem;
  line-height: 1.35;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
`;

const ColorEditorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
`;

const ColorField = styled.label`
  ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    return css`
      background: ${layout.shellBg};
      border: 1px solid ${layout.surfaceBorder};
    `;
  }}
  display: flex;
  align-items: center;
  gap: 0.7rem;
  border-radius: 14px;
  padding: 0.65rem 0.75rem;
  cursor: pointer;
`;

const ColorInput = styled.input`
  width: 42px;
  height: 42px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
`;

const ColorMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
`;

const ColorName = styled.span`
  font-size: 0.76rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const ColorValue = styled.span`
  font-size: 0.68rem;
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const SecondaryButton = styled.button`
  ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    return css`
      background: ${layout.surfaceBg};
      color: ${theme.TEXT_PRIMARY};
      border: 1px solid ${layout.surfaceBorder};
      box-shadow: ${layout.surfaceShadow};
    `;
  }}
  height: ${SEGMENTED_HEIGHT};
  padding: 0 0.9rem;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
`;

const DesignToggleGroup = styled.div`
  display: inline-flex;
  gap: 0.4rem;
  flex-wrap: wrap;
`;

const DesignToggleButton = styled.button<{ $active: boolean }>`
  ${({ theme, $active }) => {
    const layout = getLayoutPalette(theme);
    const buttons = getButtonPalette(theme);
    return css`
      background: ${$active ? buttons.primaryBg : layout.surfaceBg};
      color: ${$active ? buttons.primaryText : theme.TEXT_PRIMARY};
      border: 1px solid ${$active ? theme.ACCENT : layout.surfaceBorder};
      box-shadow: ${$active ? buttons.primaryShadow : layout.surfaceShadow};
    `;
  }}
  min-height: 34px;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
`;

const SegmentedSelect = styled.select<{ first?: boolean; last?: boolean }>`
  ${clayInputStyle}
  ${minimalSelectMenuStyle}
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  height: ${SEGMENTED_HEIGHT};
  line-height: 1;
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  padding: 0 1.8rem 0 0.72rem;
  border-right: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  &:last-child { border-right: none; }
  border-radius: 0;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  @media (max-width: 700px) {
    width: 100%;
    min-width: 0;
  }
`;

const SegmentedButton = styled.button<{ first?: boolean; last?: boolean }>`
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  height: ${SEGMENTED_HEIGHT};
  line-height: 1;
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  ${({ theme }) => {
    const buttons = getButtonPalette(theme);
    return css`
      background: ${buttons.primaryBg};
      color: ${buttons.primaryText};
      box-shadow: ${buttons.primaryShadow};
    `;
  }}
  padding: 0 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.35em;
  border-radius: 0;
  cursor: pointer;
  &:hover {
    box-shadow: ${({ theme }) => getButtonPalette(theme).primaryHoverShadow};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  @media (max-width: 700px) {
    width: 100%;
    min-width: 0;
  }
`;

const PrintContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;

  @media print {
    display: block;
    gap: 0;
  }
`;

const CardTemplate = styled.div<{ $variant: CardDesignVariant }>`
  width: ${({ $variant }) => $variant === 'modern' ? '2.2in' : '3.375in'};
  height: ${({ $variant }) => $variant === 'modern' ? '3.5in' : '2.125in'};
  background: #ffffff;
  border-radius: ${({ $variant }) => $variant === 'modern' ? '18px' : '6px'};
  border: 1px solid #e5e7eb;
  position: relative;
  page-break-inside: avoid;
  overflow: hidden;
  box-shadow: ${({ $variant }) => $variant === 'modern' ? '0 18px 40px rgba(15, 23, 42, 0.18)' : '0 4px 10px rgba(0,0,0,0.08)'};
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;

  @media print {
    border: 1px solid #e5e7eb;
    box-shadow: none;
    margin: 10px;
    float: left;
  }
`;

const CardBackground = styled.div<{ $scheme: CardColorScheme }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;

  &::before {
    content: '';
    position: absolute;
    top: -26%;
    left: -10%;
    width: 120%;
    height: 118px;
    background: ${({ $scheme }) => $scheme.topCurve};
    border-radius: 50%;
    transform: rotate(2deg);
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -26%;
    left: -15%;
    width: 130%;
    height: 110px;
    background: ${({ $scheme }) => $scheme.mainCurve};
    border-radius: 50%;
    transform: rotate(5deg);
  }
`;

const BottomBorder = styled.div<{ $scheme: CardColorScheme }>`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 5px;
  background: ${({ $scheme }) => $scheme.bottomBorder};
  z-index: 10;
`;

const CardContentWrapper = styled.div`
  position: relative;
  z-index: 10;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const HeaderContent = styled.div`
  width: 100%;
  height: 68px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 5px 10px 0 10px;
  gap: 10px;
`;

const SchoolLogoWrapper = styled.div`
  width: 56px;
  height: 56px;
  min-width: 56px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -10px;
  overflow: hidden;

  img {
    width: 94%;
    height: 94%;
    object-fit: contain;
    border-radius: 50%;
  }
`;

const HeaderTextCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: -10px;
  flex: 1;
  color: white;
  min-width: 0;
`;

const SchoolName = styled.div`
  font-size: 0.80rem;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.1;
  width: 100%;
`;

const SchoolAddress = styled.div`
  font-size: 0.40rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-top: 3px;
  color: #e5e7eb;
  text-align: center;
  width: 100%;
`;

const CardBody = styled.div`
  flex: 1;
  padding: 0 5px 0 10px;
  display: flex;
`;

const LeftSection = styled.div`
  width: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 15px;
`;

const PhotoOuterView = styled.div`
  width: 68px;
  height: 80px;
  border-radius: 4px;
  background: transparent;
  padding: 0;
  border: none;
`;

const PhotoContainer = styled.div`
  width: 100%;
  height: 100%;
  background: #e5e7eb;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #9ca3af;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const SignatureSection = styled.div`
  margin-top: auto;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const SignatureImgPlaceholder = styled.div`
  width: 50px;
  height: 10px;
  border-bottom: 1px solid #1f2937;
  margin-bottom: 2px;
`;

const SignatureText = styled.div`
  font-size: 0.45rem;
  font-weight: 700;
  color: #1a1835;
`;

const RightSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-left: 20px;
  padding-top: 5px;
`;

const IdPillWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
  margin-left: -20px;
`;

const IdPill = styled.div<{ $scheme: CardColorScheme }>`
  background: ${({ $scheme }) => $scheme.idPill};
  color: white;
  font-size: 0.45rem;
  font-weight: 800;
  padding: 2px 10px;
  border-radius: 12px;
  letter-spacing: 0.5px;
`;

const InfoGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const InfoRow = styled.div`
  display: flex;
  font-size: 0.52rem;
  line-height: 1.2;
`;

const InfoLabel = styled.span`
  width: 68px;
  font-weight: 700;
  color: #1a1835;
`;

const InfoSeparator = styled.span`
  margin: 0 6px 0 2px;
  color: #1a1835;
  font-weight: 700;
`;

const InfoValue = styled.span<{ $highlight?: boolean; $scheme: CardColorScheme }>`
  flex: 1;
  font-weight: ${({ $highlight }) => $highlight ? '800' : '600'};
  color: ${({ $highlight, $scheme }) => $highlight ? $scheme.nameHighlight : '#374151'};
`;

const ModernCardLayer = styled.div<{ $scheme: CardColorScheme }>`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 0;
  background:
    radial-gradient(circle at top center, ${({ $scheme }) => `${$scheme.topCurve}22`} 0%, transparent 30%),
    linear-gradient(180deg, #20395f 0%, #0f2340 100%);

  &::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 8px;
    right: 8px;
    bottom: 8px;
    border-radius: 14px;
    border: 2px solid ${({ $scheme }) => `${$scheme.topCurve}cc`};
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 90px;
    background:
      linear-gradient(135deg, transparent 0%, transparent 70%, ${({ $scheme }) => `${$scheme.topCurve}aa`} 70%, ${({ $scheme }) => `${$scheme.topCurve}aa`} 72%, transparent 72%, transparent 100%),
      linear-gradient(45deg, transparent 0%, transparent 78%, ${({ $scheme }) => `${$scheme.topCurve}88`} 78%, ${({ $scheme }) => `${$scheme.topCurve}88`} 80%, transparent 80%, transparent 100%);
    opacity: 0.9;
  }
`;

const ModernContentWrapper = styled(CardContentWrapper)`
  padding: 18px 14px 14px 14px;
`;

const ModernHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-height: 86px;
`;

const ModernLogoWrapper = styled.div`
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 999px;
  background: rgba(255,255,255,0.98);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.2);

  img {
    width: 84%;
    height: 84%;
    object-fit: contain;
  }
`;

const ModernHeaderText = styled.div`
  min-width: 0;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: center;
  text-align: center;
`;

const ModernSchoolName = styled.div`
  font-size: 0.68rem;
  font-weight: 900;
  line-height: 1.08;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const ModernSchoolAddress = styled.div`
  font-size: 0.34rem;
  font-weight: 600;
  color: rgba(255,255,255,0.8);
  letter-spacing: 0.04em;
`;

const ModernBody = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  padding-top: 8px;
`;

const ModernPhotoFrame = styled.div<{ $scheme: CardColorScheme }>`
  width: 108px;
  height: 126px;
  border-radius: 18px;
  padding: 4px;
  background: linear-gradient(180deg, ${({ $scheme }) => `${$scheme.topCurve}ee`} 0%, ${({ $scheme }) => `${$scheme.mainCurve}bb`} 100%);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.24);
`;

const ModernPhotoInner = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 14px;
  overflow: hidden;
  background: #ece5d7;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ModernTitle = styled.div`
  font-size: 0.36rem;
  font-weight: 700;
  color: rgba(255,255,255,0.72);
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const ModernStudentName = styled.div`
  font-size: 0.9rem;
  font-weight: 900;
  color: #ffffff;
  line-height: 1.05;
  text-align: center;
  max-width: 100%;
`;

const ModernInfoPanel = styled.div`
  width: 100%;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.16);
  border-radius: 14px;
  padding: 10px 10px 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const ModernProgramPill = styled.div<{ $scheme: CardColorScheme }>`
  align-self: stretch;
  background: ${({ $scheme }) => `${$scheme.topCurve}1e`};
  border: 1px solid ${({ $scheme }) => `${$scheme.topCurve}99`};
  color: ${({ $scheme }) => $scheme.topCurve};
  border-radius: 12px;
  padding: 6px 8px;
  font-size: 0.48rem;
  font-weight: 800;
  text-align: center;
  line-height: 1.15;
  text-transform: uppercase;
`;

const ModernInfoRow = styled.div`
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 6px;
  align-items: start;
  font-size: 0.46rem;
`;

const ModernInfoLabel = styled.span`
  font-weight: 800;
  color: rgba(255,255,255,0.7);
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const ModernInfoValue = styled.span`
  font-weight: 700;
  color: #ffffff;
`;

const ModernFooter = styled.div`
  width: 100%;
  margin-top: auto;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
`;

const ModernIdentityTag = styled.div<{ $scheme: CardColorScheme }>`
  flex: 1;
  padding: 6px 8px;
  border-radius: 12px;
  background: ${({ $scheme }) => `${$scheme.idPill}20`};
  border: 1px solid ${({ $scheme }) => `${$scheme.idPill}99`};
  color: #ffffff;
  font-size: 0.42rem;
  font-weight: 800;
  text-align: center;
  letter-spacing: 0.06em;
`;

const ModernQrBox = styled.div<{ $scheme: CardColorScheme }>`
  width: 48px;
  height: 48px;
  border-radius: 10px;
  border: 1px solid ${({ $scheme }) => `${$scheme.topCurve}88`};
  background:
    linear-gradient(90deg, ${({ $scheme }) => `${$scheme.topCurve}50`} 8%, transparent 8%, transparent 92%, ${({ $scheme }) => `${$scheme.topCurve}50`} 92%),
    linear-gradient(${({ $scheme }) => `${$scheme.topCurve}50`} 8%, transparent 8%, transparent 92%, ${({ $scheme }) => `${$scheme.topCurve}50`} 92%),
    radial-gradient(circle at 28% 28%, ${({ $scheme }) => $scheme.topCurve} 0 10%, transparent 11%),
    radial-gradient(circle at 72% 28%, ${({ $scheme }) => $scheme.topCurve} 0 10%, transparent 11%),
    radial-gradient(circle at 28% 72%, ${({ $scheme }) => $scheme.topCurve} 0 10%, transparent 11%),
    radial-gradient(circle at 72% 72%, ${({ $scheme }) => $scheme.topCurve} 0 10%, transparent 11%);
`;

const SAMPLE_MODERN_BLUE = '#4AA9D8';
const SAMPLE_MODERN_BLUE_LIGHT = '#BFE8FB';
const SAMPLE_MODERN_NAME = '#43AEE3';
const MODERN_BRAND_TITLE = 'AL-HARAM';
const MODERN_BRAND_SUBTITLE = 'Public School & Iqra Academy';

const EmptyState = styled.div`
  text-align: center;
  ${clayPanelStyle}
  padding: 2rem;
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  border-radius: ${CARD_RADIUS_LG};
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).shellBorder};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;

  svg {
    font-size: 3rem;
    opacity: 0.5;
  }
`;

const StudentCardsPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const { setPageHeader } = React.useContext(PageHeaderContext);
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');

  const [students, setStudents] = useState<any[]>([]);
  const [schoolProfile, setSchoolProfile] = useState<any>(null);
  const [sessionEndDate, setSessionEndDate] = useState<string | null>(null);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>(DEFAULT_CARD_COLOR_SCHEME.key);
  const [cardColors, setCardColors] = useState<CardColorScheme>(DEFAULT_CARD_COLOR_SCHEME);
  const [hasSavedColors, setHasSavedColors] = useState(false);
  const cardDesign: CardDesignVariant = 'classic';

  useEffect(() => {
    setPageHeader('Student Cards');
  }, [setPageHeader]);

  useEffect(() => {
    const schoolId = user?.school_id;
    if (!schoolId) return;
    let isMounted = true;

    const loadSavedCardColors = async () => {
      try {
        const { data, error } = await supabase
          .from('student_card_settings')
          .select('settings')
          .eq('school_id', schoolId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data?.settings) {
          const savedScheme = normalizeCardColorScheme(data.settings);
          if (!isMounted) return;
          setCardColors(savedScheme);
          setSelectedPresetKey(savedScheme.key);
          setHasSavedColors(true);
          localStorage.setItem(buildStudentCardColorsStorageKey(schoolId), JSON.stringify(savedScheme));
          return;
        }
      } catch (error) {
        console.warn('Failed to load student card colors from Supabase, using local fallback:', error);
      }

      try {
        const raw = localStorage.getItem(buildStudentCardColorsStorageKey(schoolId));
        if (!raw) {
          if (!isMounted) return;
          setCardColors(DEFAULT_CARD_COLOR_SCHEME);
          setSelectedPresetKey(DEFAULT_CARD_COLOR_SCHEME.key);
          setHasSavedColors(false);
          return;
        }

        const savedScheme = normalizeCardColorScheme(JSON.parse(raw));
        if (!isMounted) return;
        setCardColors(savedScheme);
        setSelectedPresetKey(savedScheme.key);
        setHasSavedColors(true);
      } catch (error) {
        console.warn('Failed to load saved student card colors:', error);
        if (!isMounted) return;
        setCardColors(DEFAULT_CARD_COLOR_SCHEME);
        setSelectedPresetKey(DEFAULT_CARD_COLOR_SCHEME.key);
        setHasSavedColors(false);
      }
    };

    loadSavedCardColors();

    return () => {
      isMounted = false;
    };
  }, [user?.school_id]);

  useEffect(() => {
    if (!user?.school_id) return;

    const fetchInitialData = async () => {
      try {
        // Fetch School Profile
        const [{ data: profileData }, { data: schoolData }] = await Promise.all([
          supabase.from('institute_profile').select('*').eq('school_id', user.school_id).single(),
          supabase.from('schools').select('*').eq('id', user.school_id).single()
        ]);

        setSchoolProfile({
          name: profileData?.name || schoolData?.name || 'GROW MORE ERPS',
          address: profileData?.address || schoolData?.address || 'YOUR SCHOOL ADDRESS HERE',
          logo_url: profileData?.logo_url || schoolData?.logo_url || null
        });

        // Fetch Session End Date
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('end_date')
          .eq('school_id', user.school_id)
          .eq('is_active', true)
          .single();

        if (sessionData && sessionData.end_date) {
          setSessionEndDate(sessionData.end_date);
        }

        // Fetch Classes & Sections
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('id, name')
          .eq('school_id', user.school_id)
          .order('name');

        if (classesError) throw classesError;
        setClasses(classesData || []);

        const { data: sectionsData, error: sectionsError } = await supabase
          .from('sections')
          .select('id, class_id, name')
          .eq('school_id', user.school_id)
          .order('name');

        if (sectionsError) throw sectionsError;
        setSections(sectionsData || []);

      } catch (err: any) {
        toast.showToast('Failed to load initial data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user]);

  useEffect(() => {
    if (!selectedClass || !user?.school_id) return;

    const fetchStudents = async () => {
      setFetching(true);
      try {
        let query = supabase
          .from('students')
          .select('*')
          .eq('school_id', user.school_id)
          .eq('class_id', selectedClass)
          .eq('status', 'active');

        if (selectedSection) {
          query = query.eq('section_id', selectedSection);
        }

        const { data, error } = await query;
        if (error) throw error;
        setStudents(data || []);
      } catch (error) {
        toast.showToast("Failed to fetch students", 'error');
      } finally {
        setFetching(false);
      }
    };

    fetchStudents();
  }, [selectedClass, selectedSection, user]);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const docWithDesign = <StudentCardsPDFDocument students={students} schoolProfile={schoolProfile} classes={classes} sections={sections} colorScheme={cardColors} designVariant={cardDesign} />;
      const asPdf = pdf(docWithDesign);
      const blob = await asPdf.toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Student_Cards.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.showToast('Failed to generate PDF', 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExportExcel = () => {
    try {
      if (!students.length) {
        toast.showToast('No students available to export', 'error');
        return;
      }

      const escapeCell = (value: unknown) => {
        const text = value === null || value === undefined ? '' : String(value);
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      };

      const formatDate = (value: string | null | undefined) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      };

      const rows = students.map((student) => {
        const studentClass = classes.find(c => c.id === student.class_id);
        const studentSection = student.section_id ? sections.find(s => s.id === student.section_id) : null;
        const dob = formatDate(student.dob);

        return {
          roll_no: getStudentDisplayId({ id: student.id, roll_number: student.roll_number }),
          name: student.name || '',
          father: student.father_name || '',
          class_section: `${studentClass?.name || ''}${studentSection?.name ? ` (${studentSection.name})` : ''}`.trim(),
          dob,
          phone: student.phone || student.contact_number || '',
        };
      });

      const headers = [
        ['Roll No', 'Name', 'Father', 'DOB', 'Class + Section', 'Phone'],
      ];

      const bodyRows = rows.map((row) => ([
        { value: row.roll_no, text: true },
        { value: row.name, text: false },
        { value: row.father, text: false },
        { value: row.dob, text: true },
        { value: row.class_section, text: false },
        { value: row.phone, text: true },
      ]));

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
          </head>
          <body>
            <table border="1">
              <thead>
                <tr>${headers[0].map((cell) => `<th>${escapeCell(cell)}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${bodyRows.map((row) => `<tr>${row.map((cell) => `<td${cell.text ? ' style="mso-number-format:\\@;"' : ''}>${escapeCell(cell.value)}</td>`).join('')}</tr>`).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Student_Cards_Data.xls';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.showToast('Student data exported for Excel', 'success');
    } catch (error) {
      console.error('Failed to export student data:', error);
      toast.showToast('Failed to export Excel file', 'error');
    }
  };

  const applyPreset = (presetKey: string) => {
    const preset = CARD_COLOR_PRESETS.find(item => item.key === presetKey);
    if (!preset) return;
    setSelectedPresetKey(preset.key);
    setCardColors(preset);
  };

  const updateCardColor = (field: keyof Omit<CardColorScheme, 'key' | 'label' | 'description'>, value: string) => {
    setSelectedPresetKey('custom');
    setCardColors(prev => ({
      ...prev,
      key: 'custom',
      label: 'Custom',
      description: 'Personalized colors chosen for this batch of student cards.',
      [field]: value,
    }));
  };

  const handleSaveCardColors = () => {
    const schoolId = user?.school_id;
    if (!schoolId) return;

    const saveCardColors = async () => {
      try {
        const { error } = await supabase
          .from('student_card_settings')
          .upsert(
            {
              school_id: schoolId,
              settings: {
                ...cardColors,
                designVariant: 'classic',
              },
            },
            { onConflict: 'school_id' }
          );

        if (error) throw error;

        localStorage.setItem(buildStudentCardColorsStorageKey(schoolId), JSON.stringify(cardColors));
        setHasSavedColors(true);
        toast.showToast('Student card colors saved', 'success');
      } catch (error) {
        console.error('Failed to save student card colors:', error);
        toast.showToast('Failed to save card colors', 'error');
      }
    };

    saveCardColors();
  };

  const handleResetSavedCardColors = () => {
    const schoolId = user?.school_id;
    if (!schoolId) return;

    const resetSavedCardColors = async () => {
      try {
        const { error } = await supabase
          .from('student_card_settings')
          .delete()
          .eq('school_id', schoolId);

        if (error) throw error;

        localStorage.removeItem(buildStudentCardColorsStorageKey(schoolId));
        setCardColors(DEFAULT_CARD_COLOR_SCHEME);
        setSelectedPresetKey(DEFAULT_CARD_COLOR_SCHEME.key);
        setHasSavedColors(false);
        toast.showToast('Student card colors reset to default', 'success');
      } catch (error) {
        console.error('Failed to reset student card colors:', error);
        toast.showToast('Failed to reset card colors', 'error');
      }
    };

    resetSavedCardColors();
  };

  const filteredSections = sections.filter(s => s.class_id.toString() === selectedClass);

  const renderClassicCard = (student: any) => (
    <>
      <CardBackground $scheme={cardColors} />
      <BottomBorder $scheme={cardColors} />

      <CardContentWrapper>
        <HeaderContent>
          {schoolProfile?.logo_url && (
            <SchoolLogoWrapper>
              <img src={schoolProfile.logo_url} alt="Logo" />
            </SchoolLogoWrapper>
          )}
          <HeaderTextCol>
            <SchoolName>{schoolProfile?.name || 'YOUR SCHOOL NAME HERE'}</SchoolName>
            <SchoolAddress>{schoolProfile?.address || 'YOUR SCHOOL ADDRESS HERE'}</SchoolAddress>
          </HeaderTextCol>
        </HeaderContent>

        <CardBody>
          <LeftSection>
            <PhotoOuterView>
              <PhotoContainer>
                {student.picture_url ? (
                  <img src={student.picture_url} alt={student.name} />
                ) : (
                  <BadgeIcon style={{ fontSize: 36, color: '#ccc' }} />
                )}
              </PhotoContainer>
            </PhotoOuterView>

            <SignatureSection>
              <SignatureImgPlaceholder />
              <SignatureText>Principal</SignatureText>
            </SignatureSection>
          </LeftSection>

          <RightSection>
            <IdPillWrapper>
              <IdPill $scheme={cardColors}>IDENTITY CARD</IdPill>
            </IdPillWrapper>

            <InfoGrid>
              <InfoRow>
                <InfoLabel>Name</InfoLabel><InfoSeparator>:</InfoSeparator><InfoValue $scheme={cardColors} $highlight>{student.name}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Father's Name</InfoLabel><InfoSeparator>:</InfoSeparator><InfoValue $scheme={cardColors}>{student.father_name || '-'}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Class</InfoLabel><InfoSeparator>:</InfoSeparator><InfoValue $scheme={cardColors}>{classes.find(c => c.id === student.class_id)?.name || '-'} {student.section_id && sections.find(s => s.id === student.section_id) ? `(${sections.find(s => s.id === student.section_id)?.name})` : ''}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Date of Birth</InfoLabel><InfoSeparator>:</InfoSeparator><InfoValue $scheme={cardColors}>{student.dob ? new Date(student.dob).toLocaleDateString() : '-'}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Roll No.</InfoLabel><InfoSeparator>:</InfoSeparator><InfoValue $scheme={cardColors}>{getStudentDisplayId({ id: student.id, roll_number: student.roll_number })}</InfoValue>
              </InfoRow>
              {(student.guardian_phone || student.emergency_contact) && (
                <InfoRow>
                  <InfoLabel>Contact No.</InfoLabel><InfoSeparator>:</InfoSeparator><InfoValue $scheme={cardColors}>{student.guardian_phone || student.emergency_contact}</InfoValue>
                </InfoRow>
              )}
            </InfoGrid>
          </RightSection>
        </CardBody>
      </CardContentWrapper>
    </>
  );

  const getModernNameBadgeStyle = (name: string) => {
    const length = name.trim().length;

    if (length >= 24) {
      return {
        fontSize: '0.62rem',
        padding: '6px 10px',
        maxWidth: '98%',
      };
    }

    if (length >= 20) {
      return {
        fontSize: '0.68rem',
        padding: '6px 12px',
        maxWidth: '96%',
      };
    }

    if (length >= 16) {
      return {
        fontSize: '0.78rem',
        padding: '6px 14px',
        maxWidth: '92%',
      };
    }

    return {
      fontSize: '0.94rem',
      padding: '6px 16px',
      maxWidth: '86%',
    };
  };

  const renderModernCard = (student: any) => (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#ffffff',
          overflow: 'hidden',
        }}
      >
        <div
          data-export-role="modern-header"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '42%',
            background: SAMPLE_MODERN_BLUE,
            borderBottomLeftRadius: 34,
            borderBottomRightRadius: 34,
            boxShadow: '0 16px 24px rgba(0,0,0,0.18)',
          }}
        />
      </div>

        <div
          style={{
            position: 'relative',
            zIndex: 2,
            width: '100%',
            height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
            padding: '14px 12px 14px 12px',
            boxSizing: 'border-box',
          }}
        >
        {[0, 8, 16].map((offset, index) => (
          <div
            key={`modern-outline-${index}`}
            style={{
              position: 'absolute',
              left: 10 + offset,
              right: 10 + offset,
              top: `calc(42% + ${offset}px)`,
              bottom: 10 + offset,
              borderLeft: `2px solid ${SAMPLE_MODERN_BLUE_LIGHT}`,
              borderRight: `2px solid ${SAMPLE_MODERN_BLUE_LIGHT}`,
              borderBottom: `2px solid ${SAMPLE_MODERN_BLUE_LIGHT}`,
              borderBottomLeftRadius: 26 - (index * 4),
              borderBottomRightRadius: 26 - (index * 4),
              pointerEvents: 'none',
              opacity: 0.95 - (index * 0.18),
            }}
          />
        ))}
        <div
          style={{
            marginTop: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '0 8px',
            transform: 'translateX(-16px)',
          }}
        >
          {schoolProfile?.logo_url && (
            <img
              src={schoolProfile.logo_url}
              alt="School logo"
              style={{
                width: 35,
                height: 35,
                objectFit: 'contain',
                flexShrink: 0,
                filter: 'drop-shadow(0 0 0.8px rgba(255,255,255,0.95)) drop-shadow(0 0 1.2px rgba(255,255,255,0.95))',
              }}
            />
          )}
          <div
            style={{
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '1.61rem',
                lineHeight: 0.95,
                letterSpacing: '0.5px',
                textAlign: 'left',
                textTransform: 'uppercase',
                textShadow: '0 4px 8px rgba(0,0,0,0.22)',
                whiteSpace: 'nowrap',
              }}
            >
              {MODERN_BRAND_TITLE}
            </div>
            <div
              style={{
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.66rem',
                lineHeight: 1.05,
                letterSpacing: '0.2px',
                textAlign: 'left',
                whiteSpace: 'nowrap',
              }}
            >
              {MODERN_BRAND_SUBTITLE}
            </div>
          </div>
        </div>

        <div
          data-export-role="modern-id-badge-wrap"
          style={{
            position: 'absolute',
            top: '25.5%',
            left: 0,
            right: 0,
            zIndex: 5,
            pointerEvents: 'none',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            data-export-role="modern-id-badge"
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.94)',
              border: `1.5px solid ${SAMPLE_MODERN_BLUE_LIGHT}`,
              color: SAMPLE_MODERN_NAME,
              fontSize: '0.44rem',
              fontWeight: 800,
              letterSpacing: '0.7px',
              textTransform: 'uppercase',
              boxShadow: '0 6px 14px rgba(0,0,0,0.10)',
            }}
          >
            Student ID Card
          </div>
        </div>

        <div
          data-export-role="modern-photo-frame"
          style={{
            marginTop: 60,
            width: 132,
            height: 154,
            borderRadius: '24px 0 30px 0',
            background: '#ffffff',
            padding: 4,
            boxShadow: '0 18px 30px rgba(0,0,0,0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '20px 0 26px 0',
              overflow: 'hidden',
              background: '#ececec',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {student.picture_url ? (
              <img
                src={student.picture_url}
                alt={student.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center' }}
              />
            ) : (
              <BadgeIcon style={{ fontSize: 44, color: '#bcc5cf' }} />
            )}
          </div>
        </div>

        <div
          data-export-role="modern-name-badge"
          style={{
            marginTop: 22,
            transform: 'translateY(-10px)',
            color: SAMPLE_MODERN_NAME,
            fontWeight: 900,
            lineHeight: 1,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            background: '#ffffff',
            border: `2px solid ${SAMPLE_MODERN_BLUE_LIGHT}`,
            borderRadius: 18,
            boxShadow: '0 10px 22px rgba(0,0,0,0.12)',
            position: 'relative',
            zIndex: 4,
            ...getModernNameBadgeStyle(student.name || ''),
          }}
        >
          {student.name}
        </div>
      </div>
    </>
  );

  if (loading) return <Loader />;

  return (
    <Container>
      <Header>
        <SegmentedGroup>
          <SegmentedSelect
            first
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedSection('');
            }}
          >
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SegmentedSelect>

          <SegmentedSelect
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={!selectedClass}
          >
            <option value="">All Sections</option>
            {filteredSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </SegmentedSelect>

          <SegmentedButton
            onClick={handleExportExcel}
            disabled={!students.length || fetching}
            style={{ opacity: (!students.length || fetching) ? 0.5 : 1 }}
          >
            <TableView style={{ fontSize: 16 }} />
            Export Excel
          </SegmentedButton>

          <SegmentedButton
            last
            onClick={handleDownloadPDF}
            disabled={!students.length || fetching || isGeneratingPDF}
            style={{ opacity: (!students.length || fetching || isGeneratingPDF) ? 0.5 : 1 }}
          >
            <Print style={{ fontSize: 16 }} />
            {isGeneratingPDF ? 'Generating...' : 'PDF Cards'}
          </SegmentedButton>
        </SegmentedGroup>
      </Header>

      <ControlsPanel>
        <ControlsRow>
          <ControlBlock>
            <ControlLabel>Card colors</ControlLabel>
            <HelperText>
              Pick a ready-made palette or fine-tune each color for the standard student card design.
            </HelperText>
          </ControlBlock>
        </ControlsRow>

        <ControlsRow>
          <ControlBlock>
            <PresetGrid>
              {CARD_COLOR_PRESETS.map((preset) => (
                <PresetButton
                  key={preset.key}
                  type="button"
                  $active={selectedPresetKey === preset.key}
                  $scheme={preset}
                  onClick={() => applyPreset(preset.key)}
                >
                  <PresetSwatches>
                    <Swatch $color={preset.topCurve} />
                    <Swatch $color={preset.mainCurve} />
                    <Swatch $color={preset.bottomBorder} />
                    <Swatch $color={preset.idPill} />
                  </PresetSwatches>
                  <PresetTitle>{preset.label}</PresetTitle>
                  <PresetDescription>{preset.description}</PresetDescription>
                </PresetButton>
              ))}
            </PresetGrid>
          </ControlBlock>
        </ControlsRow>

        <ControlsRow>
          <ControlBlock>
            <ControlLabel>Customize colors</ControlLabel>
            <ColorEditorGrid>
              <ColorField>
                <ColorInput type="color" value={cardColors.topCurve} onChange={(e) => updateCardColor('topCurve', e.target.value)} />
                <ColorMeta>
                  <ColorName>Top curve</ColorName>
                  <ColorValue>{cardColors.topCurve}</ColorValue>
                </ColorMeta>
              </ColorField>
              <ColorField>
                <ColorInput type="color" value={cardColors.mainCurve} onChange={(e) => updateCardColor('mainCurve', e.target.value)} />
                <ColorMeta>
                  <ColorName>Main header</ColorName>
                  <ColorValue>{cardColors.mainCurve}</ColorValue>
                </ColorMeta>
              </ColorField>
              <ColorField>
                <ColorInput type="color" value={cardColors.bottomBorder} onChange={(e) => updateCardColor('bottomBorder', e.target.value)} />
                <ColorMeta>
                  <ColorName>Bottom border</ColorName>
                  <ColorValue>{cardColors.bottomBorder}</ColorValue>
                </ColorMeta>
              </ColorField>
              <ColorField>
                <ColorInput type="color" value={cardColors.idPill} onChange={(e) => updateCardColor('idPill', e.target.value)} />
                <ColorMeta>
                  <ColorName>ID badge</ColorName>
                  <ColorValue>{cardColors.idPill}</ColorValue>
                </ColorMeta>
              </ColorField>
              <ColorField>
                <ColorInput type="color" value={cardColors.nameHighlight} onChange={(e) => updateCardColor('nameHighlight', e.target.value)} />
                <ColorMeta>
                  <ColorName>Student name</ColorName>
                  <ColorValue>{cardColors.nameHighlight}</ColorValue>
                </ColorMeta>
              </ColorField>
            </ColorEditorGrid>
          </ControlBlock>

          <ControlBlock style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.65rem', minHeight: '100%' }}>
              <HelperText>
                {selectedPresetKey === 'custom'
                  ? 'Using a custom palette for preview and PDF export.'
                  : hasSavedColors
                    ? `Using saved ${cardColors.label} colors for this school.`
                    : `Using ${cardColors.label} as the active card style.`}
              </HelperText>
              <SecondaryButton type="button" onClick={handleSaveCardColors}>
                Save colors
              </SecondaryButton>
              <SecondaryButton type="button" onClick={() => applyPreset(DEFAULT_CARD_COLOR_SCHEME.key)}>
                Reset default
              </SecondaryButton>
              <SecondaryButton type="button" onClick={handleResetSavedCardColors}>
                Clear saved
              </SecondaryButton>
            </div>
          </ControlBlock>
        </ControlsRow>
      </ControlsPanel>

      {fetching ? (
        <Loader />
      ) : students.length > 0 ? (
        <PrintContainer id="print-section">
          <PrintGlobalStyle />
          {students.map(student => (
            <CardTemplate key={student.id} $variant="classic" data-student-card="true">
              {renderClassicCard(student)}
            </CardTemplate>
          ))}
        </PrintContainer>
      ) : (
        <EmptyState>
          <BadgeIcon />
          {selectedClass ? 'No students found in the selected class/section.' : 'Select a class to generate student ID cards.'}
        </EmptyState>
      )}

    </Container>
  );
};

export default StudentCardsPage;
