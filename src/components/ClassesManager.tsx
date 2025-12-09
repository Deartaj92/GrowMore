import React, { useEffect, useState, useContext, useRef } from 'react';
import styled, { css } from 'styled-components';
import { sortClasses } from '../utils/classUtils';
import { supabase } from '../supabaseClient';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Search as SearchIcon,
  FilterList as FilterIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Close as CloseIcon,
  MoreVert as MoreIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  RemoveCircleOutline as UnlinkIcon
} from '@mui/icons-material';
import { ThemeContext, darkTheme, lightTheme } from './Layout';
import { ThemeProvider } from 'styled-components';
import { useToast } from './useToast';
import { useAuth } from '../contexts/AuthContext';
import NoSessionsFound from './NoSessionsFound';

interface Section {
  id: number;
  name: string;
  class_id: number;
  teacher_id?: number | null;
  students?: any[];
}

interface Class {
  id: number;
  name: string;
  description?: string;
  has_sections?: boolean;
  sections?: Section[];
}

interface Student {
  id: number;
  class_id: number;
  section_id: number;
  gender?: string;
  status: string;
}

interface Staff {
  id: number;
  name: string;
  role: string;
}

// Styled Components
const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 12px 6px 12px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  /* Hardware acceleration for container */
  transform: translateZ(0);
  will-change: transform;
`;

const Header = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 6px 0 4px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.BG};
  box-shadow: 0 1px 6px #0001;
  border-radius: 10px;
  padding: 4px 8px 2px 8px;
  min-height: 36px;
`;

const Title = styled.h2`
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 1px;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
`;

const HeaderFilters = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 8px;
  box-shadow: 0 1px 4px #0001;
  padding: 6px 8px;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 6px;
  padding: 2px 6px;
  min-width: 120px;
  max-width: 180px;
  width: 100%;
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.8rem;
  outline: none;
  width: 100%;
  margin-left: 4px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;

  ${({ variant, theme }) => {
    switch (variant) {
      case 'primary':
        return `
          background: #4a6cf7;
          color: white;
  &:hover {
            background: #3a5ce5;
            transform: translateY(-1px);
          }
        `;
      case 'secondary':
        return `
          background: ${theme === 'dark' ? '#252525' : '#f7faff'};
          color: #4a6cf7;
          border: 1px solid ${theme === 'dark' ? '#3a3f4b' : '#b6c2d9'};
          &:hover {
            background: ${theme === 'dark' ? 'rgba(74, 108, 247, 0.18)' : 'rgba(74, 108, 247, 0.15)'};
            border-color: #4a6cf7;
          }
        `;
      case 'danger':
        return `
          background: #ef4444;
          color: white;
          &:hover {
            background: #dc2626;
          }
        `;
      default:
        return '';
    }
  }}
`;

const ClassesGrid = styled.div<{ cardCount: number }>`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  padding: 8px 0 10px 0;
  background: transparent;
  box-shadow: none;
  justify-content: start;
  /* Hardware acceleration for grid */
  transform: translateZ(0);
  will-change: transform;
  
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 4px 0 8px 0;
  }
`;

const ClassCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  padding: 1.5rem 1.5rem 1.2rem 1.5rem;
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 2.5px solid ${({ theme }) => theme.BORDER};
  position: relative;
  overflow: visible;
  margin-bottom: 0.5rem;
  min-width: 220px;
  width: 100%;
  transition: border 0.4s cubic-bezier(0.4,0,0.2,1);

  &:hover {
    border-color: #4a6cf7;
    box-shadow: none;
    transform: none;
  }
  
  @media (max-width: 700px) {
    padding: 1.2rem 1.2rem 1rem 1.2rem;
    margin-bottom: 0.3rem;
  }
`;

const ClassHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const ClassTitle = styled.h3`
  font-size: 1.4rem;
  font-weight: 900;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  letter-spacing: 0.5px;
`;

const ClassDescription = styled.p`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0.4rem 0 0.8rem;
  font-size: 0.95rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin: 1rem 0;
`;

const StatItem = styled.div`
  background: ${({ theme }) => theme.FIELD_BG};
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
  border: 1px solid ${({ theme }) => theme.BORDER};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const StatValue = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
`;

const StatLabelBig = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  letter-spacing: 0.04em;
`;

const SectionsList = styled.div`
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SectionItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0.75rem;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 8px;
  margin-bottom: 0.5rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const SectionName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const SectionTeacher = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.85rem;
  margin-top: 2px;
`;

const SectionInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const SectionStats = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
  margin-right: 0.5rem;
`;

const SectionCount = styled.span`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.95em;
  font-weight: 500;
  margin-left: 0.25em;
`;

const SectionRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const CardActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
`;

const IconButton = styled.button<{ color?: string }>`
  background: ${({ theme, color }) => color || theme.ACCENT};
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.18s, box-shadow 0.18s, transform 0.18s;
  font-size: 1.25rem;
  margin-left: 0.25rem;
  &:hover {
    background: ${({ theme, color }) => color === '#ef4444' ? '#dc2626' : theme.ACCENT};
    box-shadow: 0 2px 8px ${({ theme, color }) => color || theme.ACCENT}99;
    transform: scale(1.08);
  }
`;

const Modal = styled.div`
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000 !important;
  backdrop-filter: blur(4px);
  overflow-y: auto;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  position: relative;
  border: 1px solid ${({ theme }) => theme.BORDER};
  margin: auto;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 1.5rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}33;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}33;
  }
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
`;

const LoadingSpinner = styled.div`
  width: 50px;
  height: 50px;
  border: 3px solid #4a6cf7;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const ErrorMessage = styled.div`
  background: #fee2e2;
  color: #dc2626;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SuccessMessage = styled.div`
  background: #dcfce7;
  color: #16a34a;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MainContent = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  padding: 0 0 32px 0;
  /* Super smooth scrolling optimizations */
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: y proximity;
  will-change: scroll-position;
  
  /* Hardware acceleration */
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
  
  /* Momentum scrolling for mobile */
  @media (max-width: 700px) {
    scroll-behavior: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  /* Smooth scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 4px;
    transition: background 0.2s;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
  }
`;



const CloseButton = styled.button`
  position: absolute;
  top: 18px;
  right: 18px;
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 10;
  &:hover {
  color: #ef4444;
  }
`;

const AddSectionButton = styled(Button)`
  background: ${({ theme }) => theme === 'dark' ? '#232a3b' : '#f7faff'};
  color: ${({ theme }) => theme === 'dark' ? '#b0b8d1' : '#4a6cf7'};
  border: 1px solid ${({ theme }) => theme === 'dark' ? '#3a3f4b' : '#b6c2d9'};
  &:hover {
    background: ${({ theme }) => theme === 'dark' ? '#2d3650' : '#e6edfa'};
    color: #4a6cf7;
    border-color: #4a6cf7;
  }
`;

const ClassActions = styled.div`
  display: flex;
  gap: 0.25rem;
  position: absolute;
  top: 1.2rem;
  right: 1.2rem;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-10px) scale(0.95);
  transition: opacity 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1);
  z-index: 2;
  
  ${ClassCard}:hover & {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0) scale(1);
  }
`;

const SmallIconButton = styled.button<{ color?: string; disabled?: boolean }>`
  background: ${({ color, disabled }) => disabled ? '#999' : (color || 'transparent')};
  color: white;
  border: none;
  border-radius: 8px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  transition: background 0.18s, box-shadow 0.18s, transform 0.18s;
  font-size: 1rem;
  padding: 0;
  box-shadow: 0 1px 4px rgba(74,108,247,0.08);
  opacity: ${({ disabled }) => disabled ? 0.5 : 1};
  &:hover {
    background: ${({ color, disabled }) => disabled ? '#999' : (color || '#4a6cf7')}33;
    transform: ${({ disabled }) => disabled ? 'none' : 'scale(1.15)'};
    box-shadow: ${({ color, disabled }) => {
      if (disabled) return '0 1px 4px rgba(74,108,247,0.08)';
      const colorValue = color || '#4a6cf7';
      return `0 2px 8px ${colorValue}33`;
    }};
  }
`;

const SectionIconButton = styled.button<{ color: string; disabled?: boolean }>`
  background: none;
  border: none;
  color: ${({ color, disabled }) => disabled ? '#999' : color};
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  font-size: 1.1rem;
  padding: 0;
  margin-left: 0.15rem;
  opacity: ${({ disabled }) => disabled ? 0.5 : 1};
  &:hover {
    filter: ${({ disabled }) => disabled ? 'none' : 'brightness(1.3)'};
  }
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  white-space: nowrap;
  z-index: 1000;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: #333;
  }
`;

const TooltipContainer = styled.div`
  position: relative;
  display: inline-block;
  
  &:hover ${Tooltip} {
    opacity: 1;
  }
`;

// Add a CardContent wrapper for flex layout
const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;
const AddSectionWrapper = styled.div`
  margin-top: auto;
  padding-top: 1rem;
  display: flex;
`;

// Add this before the ClassesManager component
const AddClassCard = styled(ClassCard)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px dashed #4a6cf7;
  color: #4a6cf7;
  background: ${({ theme }) => theme.BG};
  transition: border-color 0.18s, background 0.18s;
  &:hover {
    border-color: #274bb5;
    background: ${({ theme }) => theme.FIELD_BG};
  }
`;

// Add styled components for the new card layout and circular progress
const ClassStatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0.5rem 0 1.2rem 0;
`;
const StatBig = styled.div`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-right: 0.5rem;
`;
const StatIcon = styled.div`
  margin-left: auto;
  color: #4a6cf7;
  font-size: 2.2rem;
`;
const GenderStatsRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.7rem;
  margin-bottom: 1.1rem;
`;
const GenderStat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1 1 0;
`;
const GenderLabel = styled.div`
  font-size: 0.95rem;
  color: #888;
  font-weight: 600;
  margin-top: 0.2em;
`;
const GenderCount = styled.div`
  font-size: 1.1rem;
  color: #222;
  font-weight: 700;
`;

// New StatArc component for eSkooly-style stat
const StatArc: React.FC<{
  percent: number;
  color: string;
  label: string;
  count: number;
}> = ({ percent, color, label, count }) => {
  const [displayPercent, setDisplayPercent] = useState(0);
  const requestRef = useRef<number | null>(null);
  useEffect(() => {
    let start: number | null = null;
    const duration = 1800;
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setDisplayPercent(Math.round(progress * percent));
      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayPercent(percent);
      }
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [percent]);
  // SVG arc math for 270° arc with bottom gap
  const size = 38;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const startAngle = 135; // bottom left
  const endAngle = 405;   // bottom right (270° arc)
  const arcAngle = endAngle - startAngle;
  const arcEnd = startAngle + (arcAngle * (displayPercent / 100));
  // Arc helpers
  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const a = (angle - 90) * Math.PI / 180.0;
    return {
      x: cx + r * Math.cos(a),
      y: cy + r * Math.sin(a)
    };
  };
  const describeArc = (cx: number, cy: number, r: number, start: number, end: number) => {
    const startPt = polarToCartesian(cx, cy, r, end);
    const endPt = polarToCartesian(cx, cy, r, start);
    const largeArcFlag = end - start <= 180 ? '0' : '1';
    return [
      'M', startPt.x, startPt.y,
      'A', r, r, 0, largeArcFlag, 0, endPt.x, endPt.y
    ].join(' ');
  };
  return (
    <StatArcWrapper>
      <svg width={size} height={size} style={{ display: 'block', position: 'relative' }}>
        {/* Background arc */}
        <path
          d={describeArc(center, center, radius, startAngle, endAngle)}
          stroke={color + '22'}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
        />
        {/* Foreground arc */}
        <path
          d={describeArc(center, center, radius, startAngle, arcEnd)}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.4s' }}
        />
        {/* Centered count (strength) */}
        <text
          x="54%"
          y="54%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="1.05rem"
          fontWeight="700"
          fill={color}
          style={{ fontFamily: 'Inter, Segoe UI, Arial, sans-serif', pointerEvents: 'none', userSelect: 'none' }}
        >
          {count}
        </text>
      </svg>
      <StatArcLabel>{label}</StatArcLabel>
    </StatArcWrapper>
  );
};
const StatArcWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 44px;
`;
const StatArcLabel = styled.div`
  font-size: 0.78rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 600;
  margin-top: 1px;
`;

const SectionActionButtons = styled.div`
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s;
  z-index: 2;
  ${SectionItem}:hover & {
    opacity: 1;
    pointer-events: auto;
  }
`;

const ClassesLoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  width: 100%;
  animation: fadeIn 0.5s;
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const ClassesLoadingCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 18px;
  box-shadow: 0 8px 32px 0 #0002, 0 1.5px 6px #0001;
  padding: 2.5rem 2.5rem 2rem 2.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 320px;
  max-width: 95vw;
`;

const ClassesLoadingSpinner = styled.div`
  width: 54px;
  height: 54px;
  border: 5px solid ${({ theme }) => theme.BORDER};
  border-top: 5px solid ${({ theme }) => theme.ACCENT};
  border-radius: 50%;
  animation: spin 1.1s linear infinite;
  margin-bottom: 28px;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ClassesLoadingText = styled.div`
  color: ${({ theme }) => theme.ACCENT};
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  margin-bottom: 6px;
`;

const ClassesLoadingSubText = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1.05rem;
  font-weight: 500;
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0;
  padding: 0.15rem 0;
  border-top: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.BG};
  box-shadow: 0 -1px 6px #0001;
  flex: 0 0 auto;
  width: 100%;
  @media (max-width: 700px) {
    flex-direction: row;
    align-items: center;
    gap: 0;
    padding: 0.15rem 0.1rem 0.05rem 0.1rem;
  }
`;

const PaginationInfo = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.95rem;
  
  @media (max-width: 768px) {
    text-align: center;
    font-size: 0.9rem;
  }
`;

const PaginationControls = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  @media (max-width: 700px) {
    flex: none;
    margin-left: auto;
    width: auto;
    gap: 0.2rem;
}
`;

const PaginationButton = styled.button<{ active?: boolean }>`
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  border: 1px solid ${({ theme, active }) => active ? theme.ACCENT : theme.FIELD_BORDER};
  background: ${({ theme, active }) => active ? theme.ACCENT : theme.FIELD_BG};
  color: ${({ theme, active }) => active ? '#fff' : theme.TEXT_PRIMARY};
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 22px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.ACCENT};
    background: ${({ theme }) => theme.ACCENT};
    color: #fff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
    min-width: 36px;
  }
`;

// Add SegmentedGroup and SegmentedSelect styled components
const SEGMENTED_HEIGHT = '32px';

const SegmentedGroup = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.BG === '#252525' ? '#222' : '#f3f4f6'};
  border-radius: 11px;
  box-shadow: 1.4px 1.4px 4px #2222;
  overflow: hidden;
  @media (max-width: 700px) {
    width: 100%;
    justify-content: center;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    border-radius: 8px;
  }
`;

const SegmentedBase = css`
  font-family: inherit;
  font-size: 0.77em;
  font-weight: 400;
  height: ${SEGMENTED_HEIGHT};
  line-height: ${SEGMENTED_HEIGHT};
  box-shadow: 1.4px 1.4px 4px #2222;
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  background: ${({ theme }) => theme.BG === '#252525' ? '#444' : '#f3f4f6'};
  color: ${({ theme }) => theme.BG === '#252525' ? '#C0C0C0' : '#444'};
`;

const SegmentedInput = styled.input`
  ${SegmentedBase}
  padding: 0 0.84em;
  min-width: 98px;
  border-right: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
  border-top-left-radius: 11px;
  border-bottom-left-radius: 11px;
  @media (max-width: 700px) {
    width: 100%;
    border-radius: 8px !important;
    border-right: none;
    min-width: 0;
  }
`;

const SegmentedButton = styled.button<{ active?: boolean; first?: boolean; last?: boolean }>`
  ${SegmentedBase}
  padding: 0 1.12em;
  display: flex;
  align-items: center;
  gap: 0.35em;
  border-radius: 0;
  ${({ first }) => first && `
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  `}
  ${({ last }) => last && `
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  cursor: pointer;
  background: ${({ active, theme }) => active ? theme.ACCENT : theme.BG};
  color: ${({ active, theme }) => active ? '#fff' : theme.TEXT_PRIMARY};
  border: 1.5px solid ${({ active, theme }) => active ? theme.ACCENT : theme.FIELD_BORDER};
  font-weight: ${({ active }) => active ? 700 : 400};
  &:hover, &:focus {
    background: ${({ theme }) => theme.BG === '#252525' ? '#353535' : '#e5e7eb'};
    opacity: 0.92;
  }
  & svg {
    font-size: 15px;
    vertical-align: middle;
    display: inline-block;
  }
  @media (max-width: 700px) {
    width: 100%;
    border-radius: 8px !important;
    min-width: 0;
  }
`;

const SegmentedSelect = styled.select<{ first?: boolean; last?: boolean }>`
  ${SegmentedBase}
  padding: 0 2.2em 0 0.84em;
  border-right: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
  &:last-child { border-right: none; }
  ${({ first }) => first && `
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  `}
  ${({ last }) => last && `
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  `}
  &:not(:first-child) {
    border-left: 1px solid ${({ theme }) => theme.BG === '#252525' ? '#555' : '#e5e7eb'};
  }
  appearance: none;
  -webkit-appearance: none;
  background-image: ${({ theme }) => theme.BG === '#252525'
    ? `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%23C0C0C0' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`
    : `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%23444' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`};
  background-repeat: no-repeat;
  background-position: right 0.8em center;
  background-size: 1em 1em;
  @media (max-width: 700px) {
    width: 100%;
    border-radius: 8px !important;
    border-left: none;
    border-right: none;
    min-width: 0;
    background-position: right 1em center;
  }
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  @media (max-width: 700px) {
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }
`;



const ClassesManager: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const themeObj = theme === 'dark' ? darkTheme : lightTheme;
  const { showToast } = useToast();
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSections, setLoadingSections] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    has_sections: true
  });
  const [addLoading, setAddLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeSession, setActiveSession] = useState<{ id: number; name: string } | null>(null);
  const [showEditSectionModal, setShowEditSectionModal] = useState(false);
  const [showDeleteSectionModal, setShowDeleteSectionModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [sectionEditLoading, setSectionEditLoading] = useState(false);
  const [sectionDeleteLoading, setSectionDeleteLoading] = useState(false);
  const [sectionEditName, setSectionEditName] = useState('');
  const [bulkAdd, setBulkAdd] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [bulkClassInput, setBulkClassInput] = useState('');
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [addSectionClassId, setAddSectionClassId] = useState<number | null>(null);
  const [sectionInput, setSectionInput] = useState('');
  const [addSectionLoading, setAddSectionLoading] = useState(false);
  const [teachers, setTeachers] = useState<Staff[]>([]);
  const [sectionTeachers, setSectionTeachers] = useState<{ [name: string]: number | '' }>({});
  const [editSectionTeacher, setEditSectionTeacher] = useState<number | ''>('');
  const [selectedTeacher, setSelectedTeacher] = useState<number | ''>('');
  const [sessions, setSessions] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    if (user?.school_id) {
    fetchClasses();
    fetchStudents();
    fetchTeachers();
    fetchSessions();
    }
  }, [user?.school_id]);

  const fetchClasses = async () => {
    if (!user?.school_id) {
      showToast('User school information not found', 'error');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, description, has_sections, sections:sections_class_id_fkey(*)')
        .eq('school_id', user.school_id)
        .order('name');
      if (error) throw error;
      setClasses(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!user?.school_id) return;

    const { data, error } = await supabase
      .from('students')
      .select('id, class_id, section_id, gender, status')
      .eq('school_id', user.school_id);
    if (!error && data) setStudents(data);
  };

  const fetchTeachers = async () => {
    if (!user?.school_id) return;

    const { data, error } = await supabase
      .from('staff')
      .select('id, name, role')
      .eq('role', 'Teacher')
      .eq('school_id', user.school_id)
      .order('name');
    if (!error && data) setTeachers(data);
  };

  const fetchSessions = async () => {
    if (!user?.school_id) return;

    const { data, error } = await supabase
      .from('sessions')
      .select('id, name')
      .eq('school_id', user.school_id);
    if (!error && data) setSessions(data);
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school_id) {
      showToast('User school information not found', 'error');
      return;
    }

    const names = formData.name.split(',').map(n => n.trim()).filter(Boolean);
    if (!names.length) return;
    const existingNames = classes.map(c => c.name.toLowerCase());
    const duplicates = names.filter(n => existingNames.includes(n.toLowerCase()));
    if (duplicates.length) {
      setShowAddModal(false);
      setFormData({ name: '', description: '', has_sections: true });
      setTimeout(() => {
        setError(`Class${duplicates.length > 1 ? 'es' : ''} '${duplicates.join(', ')}' already exist${duplicates.length > 1 ? '' : 's'}.`);
        showToast(`Class${duplicates.length > 1 ? 'es' : ''} '${duplicates.join(', ')}' already exist${duplicates.length > 1 ? '' : 's'}.`, 'error');
      }, 100);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('classes')
        .insert(names.map(name => ({ 
          name, 
          description: formData.description,
          has_sections: formData.has_sections,
          school_id: user.school_id
        })))
        .select();
      if (error) throw error;
      setClasses([...classes, ...(data || [])]);
      setShowAddModal(false);
      setFormData({ name: '', description: '', has_sections: true });
      showToast('Class(es) added successfully.', 'success');
    } catch (err: any) {
      setError(err.message);
      showToast('Error adding class: ' + err.message, 'error');
    }
  };

  const handleEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school_id) {
      showToast('User school information not found', 'error');
      return;
    }

    // Check if trying to change has_sections to false when sections exist
    if (selectedClass && !formData.has_sections && selectedClass.sections && selectedClass.sections.length > 0) {
      showToast('Cannot disable sections for a class that already has sections. Please delete all sections first.', 'error');
      return;
    }

    setEditLoading(true);
    try {
      const { error } = await supabase
        .from('classes')
        .update(formData)
        .eq('id', selectedClass?.id)
        .eq('school_id', user.school_id);
      if (error) throw error;
      setClasses(classes.map(c =>
        c.id === selectedClass?.id ? { ...c, ...formData } : c
      ));
      setShowEditModal(false);
      setSelectedClass(null);
      setFormData({ name: '', description: '', has_sections: true });
      showToast('Class updated successfully.', 'success');
    } catch (err: any) {
      setError(err.message);
      showToast('Error updating class: ' + err.message, 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!user?.school_id) {
      showToast('User school information not found', 'error');
      return;
    }

    setDeleteLoading(true);
    try {
      // Check for students in any session for this class
      const { data: studentsWithClass, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', selectedClass?.id)
        .eq('school_id', user.school_id);
      if (studentError) throw studentError;
      if (studentsWithClass && studentsWithClass.length > 0) {
        showToast('Cannot delete class with registered students in any session.', 'error');
        setDeleteLoading(false);
        setShowDeleteModal(false);
        setSelectedClass(null);
        return;
      }
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', selectedClass?.id)
        .eq('school_id', user.school_id);
      if (error) throw error;
      setClasses(classes.filter(c => c.id !== selectedClass?.id));
      setShowDeleteModal(false);
      setSelectedClass(null);
      showToast('Class deleted successfully.', 'success');
    } catch (err: any) {
      setError(err.message);
      showToast('Error deleting class: ' + err.message, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection || !user?.school_id) {
      showToast('User school information not found', 'error');
      return;
    }

    setSectionEditLoading(true);
    try {
      const { error } = await supabase
        .from('sections')
        .update({ name: sectionEditName, teacher_id: Number(editSectionTeacher) || null })
        .eq('id', selectedSection.id)
        .eq('school_id', user.school_id);
      if (error) throw error;
      setClasses(classes => classes.map(cls =>
        cls.sections?.some(s => s.id === selectedSection.id)
          ? { ...cls, sections: cls.sections.map(s => s.id === selectedSection.id ? { ...s, name: sectionEditName, teacher_id: Number(editSectionTeacher) || null } : s) }
          : cls
      ));
      setShowEditSectionModal(false);
      setSelectedSection(null);
      setSectionEditName('');
      setEditSectionTeacher('');
      showToast('Section updated successfully.', 'success');
    } catch (err: any) {
      showToast('Error updating section: ' + err.message, 'error');
    } finally {
      setSectionEditLoading(false);
    }
  };

  const handleDeleteSection = async () => {
    if (!selectedSection || !user?.school_id) {
      showToast('User school information not found', 'error');
      return;
    }

    // Check if section has students
    const sectionStudents = students.filter(s => s.section_id === selectedSection.id);
    if (sectionStudents.length > 0) {
      showToast(`Cannot delete section with ${sectionStudents.length} registered student(s). Please move or remove students first.`, 'error');
      return;
    }
    
    setSectionDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', selectedSection.id)
        .eq('school_id', user.school_id);
      if (error) throw error;
      setClasses(classes => classes.map(cls =>
        cls.sections?.some(s => s.id === selectedSection.id)
          ? { ...cls, sections: cls.sections.filter(s => s.id !== selectedSection.id) }
          : cls
      ));
      setShowDeleteSectionModal(false);
      setSelectedSection(null);
      showToast('Section deleted successfully.', 'success');
    } catch (err: any) {
      showToast('Error deleting section: ' + err.message, 'error');
    } finally {
      setSectionDeleteLoading(false);
    }
  };

  const openAddSectionModal = (classId: number) => {
    const classObj = classes.find(c => c.id === classId);
    if (classObj && !classObj.has_sections) {
      showToast('This class does not support sections. Please enable sections for this class first.', 'error');
      return;
    }
    setAddSectionClassId(classId);
    setSectionInput('');
    setSectionTeachers({});
    setShowAddSectionModal(true);
    // Scroll to top to ensure modal is visible
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddSectionModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSectionClassId || !user?.school_id) {
      showToast('User school information not found', 'error');
      return;
    }
    
    const sectionName = sectionInput.trim();
    if (!sectionName) return;
    
    const cls = classes.find(c => c.id === addSectionClassId);
    const existingNames = (cls?.sections || []).map(s => s.name.toLowerCase());
    
    if (existingNames.includes(sectionName.toLowerCase())) {
      showToast(`Section '${sectionName}' already exists in this class.`, 'error');
      setShowAddSectionModal(false);
      return;
    }

    try {
      setAddSectionLoading(true);
      const { data, error } = await supabase
        .from('sections')
        .insert([{
          name: sectionName,
          class_id: addSectionClassId,
          teacher_id: selectedTeacher || null,
          school_id: user.school_id
        }])
        .select();

      if (error) throw error;

      setClasses(classes.map(cls =>
        cls.id === addSectionClassId
          ? { ...cls, sections: [...(cls.sections || []), ...(data || [])] }
          : cls
      ));

      setShowAddSectionModal(false);
      setSectionInput('');
      setSelectedTeacher('');
      showToast('Section added successfully.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setAddSectionLoading(false);
    }
  };

  const handleBulkAddClasses = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school_id) {
      showToast('User school information not found', 'error');
      return;
    }

    const names = bulkClassInput.split(',').map(n => n.trim()).filter(Boolean);
    if (!names.length) return;
    const existingNames = classes.map(c => c.name.toLowerCase());
    const toAdd = names.filter(n => !existingNames.includes(n.toLowerCase()));
    if (!toAdd.length) {
      showToast('All classes already exist.', 'success');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('classes')
        .insert(toAdd.map(name => ({ 
          name,
          has_sections: true, // Default to true for bulk add
          school_id: user.school_id
        })))
        .select();
      if (error) throw error;
      setClasses([...classes, ...(data || [])]);
      showToast(`Added: ${toAdd.join(', ')}. Skipped: ${names.filter(n => !toAdd.includes(n)).join(', ')}`, 'success');
      setShowBulkAddModal(false);
      setBulkClassInput('');
    } catch (err: any) {
      showToast('Error adding classes: ' + err.message, 'error');
    }
  };

  const filteredClasses = classes.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to get ordinal suffix
  function getOrdinal(n: number) {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // Sort classes: numbered classes first, then special classes (Play Group, Nursery, K.G)
  const sortedClasses = sortClasses(filteredClasses);

  if (loading) return (
      <ThemeProvider theme={themeObj}>
      <ClassesLoadingContainer>
        <ClassesLoadingCard>
          <ClassesLoadingSpinner />
          <ClassesLoadingText>Loading Classes...</ClassesLoadingText>
          <ClassesLoadingSubText>Please wait while we fetch the latest classes.</ClassesLoadingSubText>
        </ClassesLoadingCard>
      </ClassesLoadingContainer>
      </ThemeProvider>
    );

  // Show NoSessionsFound if there are no sessions
  if (sessions.length === 0) {
    return <NoSessionsFound />;
  }

  return (
    <ThemeProvider theme={themeObj}>
    <PageContainer>
        <Header>
          <HeaderRow>
            <Title theme={themeObj}>
              Classes Manager <span style={{fontWeight:400, fontSize:'1rem', color: theme === 'dark' ? '#b0b8d1' : '#4a4a4a'}}>({classes.length})</span>
            </Title>
            <HeaderFilters style={{ display: window.innerWidth > 700 ? 'flex' : 'none' }}>
              <SegmentedGroup>
                <SegmentedInput
                  theme={themeObj}
                  type="text"
                  placeholder="Search classes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ minWidth: 220, maxWidth: 320, width: '100%' }}
                />
                <SegmentedButton
                  theme={themeObj}
                  onClick={() => setShowBulkAddModal(true)}
                  title="Bulk Add Classes"
                  style={{
                    minWidth: 110,
                    maxWidth: 130,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    background: theme === 'dark' ? '#444' : '#f3f4f6',
                    border: `1.5px solid ${theme === 'dark' ? '#555' : '#e5e7eb'}`,
                    color: theme === 'dark' ? '#C0C0C0' : '#444',
                    fontWeight: 700
                  }}
                >
                  <AddIcon style={{ fontSize: 15 }} />
                  <span style={{ fontWeight: 700, display: 'inline-block' }}>Bulk Add</span>
                </SegmentedButton>
              </SegmentedGroup>
            </HeaderFilters>
            {/* Mobile Add Button */}
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: window.innerWidth <= 700 ? 'flex' : 'none',
                background: theme === 'dark' ? '#23242a' : '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                boxShadow: '0 1px 4px #0002',
                alignItems: 'center',
                gap: '6px',
                color: theme === 'dark' ? '#C0C0C0' : '#444',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              <AddIcon style={{ fontSize: 18 }} />
              Add Class
            </button>
          </HeaderRow>
          {/* Mobile Search Bar */}
          <div style={{ display: window.innerWidth <= 700 ? 'flex' : 'none', marginTop: '8px', width: '100%' }}>
            <SearchBar style={{ width: '100%', maxWidth: 'none', flex: 1 }}>
              <SearchIcon style={{ color: theme === 'dark' ? '#b0b8d1' : '#666666' }} />
              <SearchInput
                placeholder="Search classes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: '1rem' }}
              />
            </SearchBar>
        </div>
        </Header>

        {error && (
          <ErrorMessage>
            <WarningIcon /> {error}
          </ErrorMessage>
        )}

        <MainContent>
          <ClassesGrid cardCount={classes.length + 1}>
          {sortedClasses.map(cls => {
            const classStudents = students.filter(s => s.class_id === cls.id);
            const activeStudents = classStudents.filter(s => s.status === 'active');
            const boys = activeStudents.filter(s => s.gender?.toLowerCase() === 'male' || s.gender?.toLowerCase() === 'boy').length;
            const girls = activeStudents.filter(s => s.gender?.toLowerCase() === 'female' || s.gender?.toLowerCase() === 'girl').length;
            const na = classStudents.filter(s => s.status !== 'active').length;
            const total = activeStudents.length;
            const percent = (n: number) => total ? Math.round((n / total) * 100) : 0;
            return (
              <ClassCard key={cls.id} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <ClassActions>
                  {cls.has_sections && (
                    <SmallIconButton color="#4a6cf7" title="Add Section" onClick={() => openAddSectionModal(cls.id)}>
                      <AddIcon style={{ fontSize: '1rem' }} />
                    </SmallIconButton>
                  )}
                  <SmallIconButton color="#4a6cf7" title="Edit Class" onClick={() => { 
                    setSelectedClass(cls); 
                    setFormData({ name: cls.name, description: cls.description || '', has_sections: cls.has_sections ?? true }); 
                    setShowEditModal(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}>
                    <EditIcon style={{ fontSize: '1rem' }} />
                  </SmallIconButton>
                  <TooltipContainer>
                    <SmallIconButton 
                      color="#ef4444" 
                      disabled={total > 0}
                      title={total > 0 ? "Students Exist" : "Delete Class"}
                      onClick={() => {
                        if (total > 0) return;
                        setSelectedClass(cls); 
                        setShowDeleteModal(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      <DeleteIcon style={{ fontSize: '1rem' }} />
                    </SmallIconButton>
                    {total > 0 && (
                      <Tooltip>Students Exist</Tooltip>
                    )}
                  </TooltipContainer>
                </ClassActions>
                <CardContent>
                  <ClassHeader>
                    <div>
                      <ClassTitle>{cls.name}</ClassTitle>
                      <ClassDescription>{cls.description || 'No description'}</ClassDescription>
                    </div>
                  </ClassHeader>
                  <ClassStatRow>
                    <div>
                      <StatBig>{total}</StatBig>
                      <StatLabelBig>STUDENTS</StatLabelBig>
                    </div>
                    <StatIcon><SchoolIcon /></StatIcon>
                  </ClassStatRow>
                  <GenderStatsRow>
                    <StatArc percent={percent(boys)} color="#2563eb" label="Boys" count={boys} />
                    <StatArc percent={percent(girls)} color="#22c55e" label="Girls" count={girls} />
                    <StatArc percent={percent(na)} color="#ef4444" label="N/A" count={na} />
                  </GenderStatsRow>
                  {cls.has_sections && (
                    <SectionsList>
                      {cls.sections?.map((section: Section) => {
                      const sectionTeacher = teachers.find(t => t.id === section.teacher_id);
                      const sectionStudents = students.filter(s => s.section_id === section.id && s.status === 'active').length;
                      
                      return (
                        <SectionItem key={section.id} style={{ position: 'relative', flexDirection: 'column', alignItems: 'stretch' }}>
                          {/* Action buttons at top middle, only on hover */}
                          <SectionActionButtons>
                            <SectionIconButton color="#4a6cf7" title="Edit Section" onClick={() => {
                              setSelectedSection(section);
                              setSectionEditName(section.name);
                              setEditSectionTeacher(section.teacher_id || '');
                              setShowEditSectionModal(true);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}>
                              <EditIcon style={{ fontSize: '1.1rem' }} />
                            </SectionIconButton>
                            <TooltipContainer>
                              <SectionIconButton 
                                color="#ef4444" 
                                disabled={sectionStudents > 0}
                                title={sectionStudents > 0 ? "Students Exist" : "Delete Section"}
                                onClick={() => {
                                  if (sectionStudents > 0) return;
                                  setSelectedSection(section);
                                  setShowDeleteSectionModal(true);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                              >
                                <DeleteIcon style={{ fontSize: '1.1rem' }} />
                              </SectionIconButton>
                              {sectionStudents > 0 && (
                                <Tooltip>Students Exist</Tooltip>
                              )}
                            </TooltipContainer>
                          </SectionActionButtons>
                          {/* First row: Section name and strength */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <SectionName>{section.name}</SectionName>
                            <SectionCount>({sectionStudents})</SectionCount>
                          </div>
                          {/* Second row: Teacher and unlink button */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 2 }}>
                            <SectionTeacher style={{ flex: 1 }}>
                              {sectionTeacher ? sectionTeacher.name : 'No teacher assigned'}
                            </SectionTeacher>
                            {sectionTeacher && (
                              <SectionIconButton color="#ef4444" title="Unlink Teacher" onClick={async () => {
                                if (!user?.school_id) {
                                  showToast('User school information not found', 'error');
                                  return;
                                }
                                
                                if (window.confirm('Unlink this teacher from the section?')) {
                                  try {
                                    const { error } = await supabase
                                      .from('sections')
                                      .update({ teacher_id: null })
                                      .eq('id', section.id)
                                      .eq('school_id', user.school_id);
                                    if (error) throw error;
                                    setClasses(classes => classes.map(cls =>
                                      cls.sections?.some(s => s.id === section.id)
                                        ? { ...cls, sections: cls.sections.map(s => s.id === section.id ? { ...s, teacher_id: null } : s) }
                                        : cls
                                    ));
                                    showToast('Teacher unlinked from section.', 'success');
                                  } catch (err: any) {
                                    showToast('Error unlinking teacher: ' + err.message, 'error');
                                  }
                                }
                              }}>
                                <UnlinkIcon style={{ fontSize: '1.1rem', marginLeft: 4 }} />
                              </SectionIconButton>
                            )}
                          </div>
                        </SectionItem>
                      );
                    })}
                    </SectionsList>
                  )}
                </CardContent>
              </ClassCard>
            );
          })}
          <AddClassCard theme={themeObj} onClick={() => {
            setShowAddModal(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}>
            <AddIcon style={{ fontSize: '3rem', marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add Class</div>
          </AddClassCard>
        </ClassesGrid>

        {/* Add Class Modal */}
        {showAddModal && (
          <Modal onClick={() => setShowAddModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <CloseButton onClick={() => setShowAddModal(false)}>
                <CloseIcon />
              </CloseButton>
            <ModalTitle>Add New Class</ModalTitle>
              <form onSubmit={handleAddClass}>
                <FormGroup>
                  <Label>Class Name(s) (comma separated)</Label>
                  <Input
                type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. 6th, 7th, 8th"
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Description</Label>
                  <TextArea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </FormGroup>
                <FormGroup>
                  <Label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={formData.has_sections}
                      onChange={e => setFormData({ ...formData, has_sections: e.target.checked })}
                      style={{ margin: 0 }}
                    />
                    Enable Sections for this class
                  </Label>
                </FormGroup>
              <ModalActions>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={addLoading}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={addLoading}>
                    {addLoading ? 'Adding...' : 'Add Class'}
                  </Button>
              </ModalActions>
              </form>
            </ModalContent>
          </Modal>
        )}

        {/* Edit Class Modal */}
        {showEditModal && (
          <Modal onClick={() => setShowEditModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <CloseButton onClick={() => setShowEditModal(false)}>
                <CloseIcon />
              </CloseButton>
            <ModalTitle>Edit Class</ModalTitle>
              <form onSubmit={handleEditClass}>
                <FormGroup>
                  <Label>Class Name</Label>
                  <Input
                type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Description</Label>
                  <TextArea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </FormGroup>
                <FormGroup>
                  <Label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={formData.has_sections}
                      onChange={e => setFormData({ ...formData, has_sections: e.target.checked })}
                      style={{ margin: 0 }}
                    />
                    Enable Sections for this class
                  </Label>
                </FormGroup>
              <ModalActions>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    disabled={editLoading}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={editLoading}>
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
              </ModalActions>
              </form>
            </ModalContent>
          </Modal>
        )}

        {/* Delete Class Modal */}
        {showDeleteModal && (
          <Modal onClick={() => setShowDeleteModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <CloseButton onClick={() => setShowDeleteModal(false)}>
                <CloseIcon />
              </CloseButton>
            <ModalTitle>Delete Class</ModalTitle>
              <p>Are you sure you want to delete {selectedClass?.name}? This action cannot be undone.<br/><b>Note:</b> You cannot delete a class if it has any students in any session.</p>
            <ModalActions>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  type="button"
                  onClick={handleDeleteClass}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </Button>
            </ModalActions>
            </ModalContent>
          </Modal>
        )}

        {/* Edit Section Modal */}
        {showEditSectionModal && selectedSection && (
          <Modal onClick={() => setShowEditSectionModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalTitle>Edit Section</ModalTitle>
              <form onSubmit={handleEditSection}>
                <FormGroup>
                  <Label>Section Name</Label>
                  <Input
                    type="text"
                    value={sectionEditName}
                    onChange={e => setSectionEditName(e.target.value)}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Teacher (Optional)</Label>
                  <select
                    value={editSectionTeacher}
                    onChange={e => setEditSectionTeacher(e.target.value ? Number(e.target.value) : '')}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 8, fontSize: '1rem', background: themeObj.FIELD_BG, color: themeObj.TEXT_PRIMARY, border: `1px solid ${themeObj.FIELD_BORDER}` }}
                  >
                    <option value=''>No teacher assigned</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name} · {t.id}</option>
                    ))}
                  </select>
                </FormGroup>
                <ModalActions>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setShowEditSectionModal(false)}
                    disabled={sectionEditLoading}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={sectionEditLoading}>
                    {sectionEditLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </ModalActions>
              </form>
            </ModalContent>
          </Modal>
        )}

        {/* Delete Section Modal */}
        {showDeleteSectionModal && selectedSection && (
          <Modal onClick={() => setShowDeleteSectionModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalTitle>Delete Section</ModalTitle>
              <p>Are you sure you want to delete section "{selectedSection.name}"? This action cannot be undone.</p>
              <ModalActions>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowDeleteSectionModal(false)}
                  disabled={sectionDeleteLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  type="button"
                  onClick={handleDeleteSection}
                  disabled={sectionDeleteLoading}
                >
                  {sectionDeleteLoading ? 'Deleting...' : 'Delete'}
                </Button>
              </ModalActions>
            </ModalContent>
          </Modal>
        )}

        {/* Bulk Add Classes Modal */}
        {showBulkAddModal && (
          <Modal onClick={() => setShowBulkAddModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
            <ModalTitle>Bulk Add Classes</ModalTitle>
              <form onSubmit={handleBulkAddClasses}>
                <FormGroup>
                  <Label>Class Names (comma separated)</Label>
                  <Input
                    type="text"
                value={bulkClassInput}
                onChange={e => setBulkClassInput(e.target.value)}
                    placeholder="e.g. 6th, 7th, 8th"
                    required
              />
                </FormGroup>
              <ModalActions>
                  <Button variant="secondary" type="button" onClick={() => setShowBulkAddModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Add Classes
                  </Button>
              </ModalActions>
              </form>
            </ModalContent>
          </Modal>
        )}

        {showAddSectionModal && (
          <Modal onClick={() => setShowAddSectionModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalTitle>Add Section</ModalTitle>
              <form onSubmit={handleAddSectionModal}>
                <FormGroup>
                  <Label>Section Name</Label>
                  <Input
                    type="text"
                    value={sectionInput}
                    onChange={e => setSectionInput(e.target.value)}
                    placeholder="e.g. A"
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Teacher (Optional)</Label>
                  <select
                    value={selectedTeacher}
                    onChange={e => setSelectedTeacher(e.target.value ? Number(e.target.value) : '')}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 8, fontSize: '1rem', background: themeObj.FIELD_BG, color: themeObj.TEXT_PRIMARY, border: `1px solid ${themeObj.FIELD_BORDER}` }}
                  >
                    <option value=''>Select Teacher</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name} · {t.id}</option>
                    ))}
                  </select>
                </FormGroup>
                <ModalActions>
                  <Button variant="secondary" type="button" onClick={() => {
                    setShowAddSectionModal(false);
                    setSectionInput('');
                    setSelectedTeacher('');
                  }} disabled={addSectionLoading}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={addSectionLoading}>
                    {addSectionLoading ? 'Adding...' : 'Add Section'}
                  </Button>
                </ModalActions>
              </form>
            </ModalContent>
          </Modal>
        )}

        </MainContent>

        <PaginationContainer>
          <PaginationInfo>
            Total Classes: {classes.length}
          </PaginationInfo>
          <PaginationControls>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: themeObj.TEXT_SECONDARY }}>Classes Status:</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#22c55e' }}>
                {classes.filter(c => c.has_sections).length} with sections enabled
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ef4444' }}>
                {classes.filter(c => !c.has_sections).length} without sections
              </span>
            </div>
          </PaginationControls>
        </PaginationContainer>

        {/* All Modals - Moved outside MainContent for proper positioning */}
        {/* Add Class Modal */}
        {showAddModal && (
          <Modal onClick={() => setShowAddModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <CloseButton onClick={() => setShowAddModal(false)}>
                <CloseIcon />
              </CloseButton>
              <ModalTitle>Add New Class</ModalTitle>
              <form onSubmit={handleAddClass}>
                <FormGroup>
                  <Label>Class Name(s) (comma separated)</Label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. 6th, 7th, 8th"
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Description</Label>
                  <TextArea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </FormGroup>
                <FormGroup>
                  <Label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={formData.has_sections}
                      onChange={e => setFormData({ ...formData, has_sections: e.target.checked })}
                      style={{ margin: 0 }}
                    />
                    Enable Sections for this class
                  </Label>
                </FormGroup>
                <ModalActions>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={addLoading}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={addLoading}>
                    {addLoading ? 'Adding...' : 'Add Class'}
                  </Button>
                </ModalActions>
              </form>
            </ModalContent>
          </Modal>
        )}

        {/* Edit Class Modal */}
        {showEditModal && (
          <Modal onClick={() => setShowEditModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <CloseButton onClick={() => setShowEditModal(false)}>
                <CloseIcon />
              </CloseButton>
              <ModalTitle>Edit Class</ModalTitle>
              <form onSubmit={handleEditClass}>
                <FormGroup>
                  <Label>Class Name</Label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Description</Label>
                  <TextArea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </FormGroup>
                <FormGroup>
                  <Label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={formData.has_sections}
                      onChange={e => setFormData({ ...formData, has_sections: e.target.checked })}
                      style={{ margin: 0 }}
                    />
                    Enable Sections for this class
                  </Label>
                </FormGroup>
                <ModalActions>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    disabled={editLoading}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={editLoading}>
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </ModalActions>
              </form>
            </ModalContent>
          </Modal>
        )}

        {/* Delete Class Modal */}
        {showDeleteModal && (
          <Modal onClick={() => setShowDeleteModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalTitle>Delete Class</ModalTitle>
              <p>Are you sure you want to delete "{selectedClass?.name}"?</p>
              <p>This action cannot be undone.</p>
              <ModalActions>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  type="button"
                  onClick={handleDeleteClass}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </Button>
              </ModalActions>
            </ModalContent>
          </Modal>
        )}

        {/* Edit Section Modal */}
        {showEditSectionModal && (
          <Modal onClick={() => setShowEditSectionModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalTitle>Edit Section</ModalTitle>
              <form onSubmit={handleEditSection}>
                <FormGroup>
                  <Label>Section Name</Label>
                  <Input
                    type="text"
                    value={sectionEditName}
                    onChange={e => setSectionEditName(e.target.value)}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Teacher (Optional)</Label>
                  <select
                    value={editSectionTeacher}
                    onChange={e => setEditSectionTeacher(e.target.value ? Number(e.target.value) : '')}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 8, fontSize: '1rem', background: themeObj.FIELD_BG, color: themeObj.TEXT_PRIMARY, border: `1px solid ${themeObj.FIELD_BORDER}` }}
                  >
                    <option value=''>Select Teacher</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name} · {t.id}</option>
                    ))}
                  </select>
                </FormGroup>
                <ModalActions>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setShowEditSectionModal(false)}
                    disabled={sectionEditLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={sectionEditLoading}
                  >
                    {sectionEditLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </ModalActions>
              </form>
            </ModalContent>
          </Modal>
        )}

        {/* Delete Section Modal */}
        {showDeleteSectionModal && (
          <Modal onClick={() => setShowDeleteSectionModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalTitle>Delete Section</ModalTitle>
              <p>Are you sure you want to delete "{selectedSection?.name}"?</p>
              <p>This action cannot be undone.</p>
              <ModalActions>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowDeleteSectionModal(false)}
                  disabled={sectionDeleteLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  type="button"
                  onClick={handleDeleteSection}
                  disabled={sectionDeleteLoading}
                >
                  {sectionDeleteLoading ? 'Deleting...' : 'Delete'}
                </Button>
              </ModalActions>
            </ModalContent>
          </Modal>
        )}

        {/* Bulk Add Classes Modal */}
        {showBulkAddModal && (
          <Modal onClick={() => setShowBulkAddModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalTitle>Bulk Add Classes</ModalTitle>
              <form onSubmit={handleBulkAddClasses}>
                <FormGroup>
                  <Label>Class Names (comma separated)</Label>
                  <Input
                    type="text"
                    value={bulkClassInput}
                    onChange={e => setBulkClassInput(e.target.value)}
                    placeholder="e.g. 6th, 7th, 8th"
                    required
                  />
                </FormGroup>
                <ModalActions>
                  <Button variant="secondary" type="button" onClick={() => setShowBulkAddModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Add Classes
                  </Button>
                </ModalActions>
              </form>
            </ModalContent>
          </Modal>
        )}

        {/* Add Section Modal */}
        {showAddSectionModal && (
          <Modal onClick={() => setShowAddSectionModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalTitle>Add Section</ModalTitle>
              <form onSubmit={handleAddSectionModal}>
                <FormGroup>
                  <Label>Section Name</Label>
                  <Input
                    type="text"
                    value={sectionInput}
                    onChange={e => setSectionInput(e.target.value)}
                    placeholder="e.g. A"
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Teacher (Optional)</Label>
                  <select
                    value={selectedTeacher}
                    onChange={e => setSelectedTeacher(e.target.value ? Number(e.target.value) : '')}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 8, fontSize: '1rem', background: themeObj.FIELD_BG, color: themeObj.TEXT_PRIMARY, border: `1px solid ${themeObj.FIELD_BORDER}` }}
                  >
                    <option value=''>Select Teacher</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name} · {t.id}</option>
                    ))}
                  </select>
                </FormGroup>
                <ModalActions>
                  <Button variant="secondary" type="button" onClick={() => {
                    setShowAddSectionModal(false);
                    setSectionInput('');
                    setSelectedTeacher('');
                  }} disabled={addSectionLoading}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={addSectionLoading}>
                    {addSectionLoading ? 'Adding...' : 'Add Section'}
                  </Button>
                </ModalActions>
              </form>
            </ModalContent>
          </Modal>
        )}

    </PageContainer>
    </ThemeProvider>
  );
};

export default ClassesManager; 