import React, { useState, useEffect, useContext } from 'react';
import styled, { css } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { landingPageService, WidgetWithPreference } from '../services/landingPageService';
import { ThemeContext } from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import * as Icons from '@mui/icons-material';
import { Assessment as AssessmentIcon, BarChart as BarChartIcon, Assignment as AssignmentIcon, Quiz as QuizIcon, School as SchoolIcon, Schedule as ScheduleIcon, AccessTime as AccessTimeIcon, Person as PersonIcon, Event as EventIcon, CalendarToday as CalendarIcon, LocationOn as LocationIcon, Phone as PhoneIcon, Sms as SmsIcon, WhatsApp as WhatsAppIcon, AccountCircle, AttachMoney as AttachMoneyIcon } from '@mui/icons-material';
import Loader from '../components/Loader';
import { examinationService } from '../services/examinationService';
import { Examination } from '../types/examinations';
import { fetchRenderSettings, isTeacherCardVisible, isStudentCardVisible, isParentCardVisible, RenderSettings } from '../services/renderSettingsService';

const Container = styled.div`
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const WelcomeHeader = styled.div`
  margin-bottom: 2rem;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 0.5rem;
  line-height: 1.2;
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const WidgetsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 2rem;
  width: 100%;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const WidgetCard = styled.div<{ $color?: string }>`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 16px;
  padding: 0;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  min-height: 180px;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, ${({ $color }) => $color || '#3b82f6'}, ${({ $color }) => $color ? `${$color}80` : '#3b82f680'});
    border-radius: 16px 16px 0 0;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, ${({ $color }) => $color ? `${$color}05` : '#3b82f605'} 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-6px) scale(1.02);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
    border-color: ${({ $color }) => $color || '#3b82f6'};
    
    &::after {
      opacity: 1;
    }
  }
  
  &:active {
    transform: translateY(-3px) scale(1.01);
  }
`;

const WidgetHeader = styled.div<{ $color?: string }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 20px 20px 16px 20px;
  position: relative;
  z-index: 1;
`;

const WidgetIcon = styled.div<{ $color?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color, theme }) => $color ? `${$color}15` : theme.ICON_BG};
  color: ${({ $color }) => $color || '#3b82f6'};
  font-size: 24px;
  flex-shrink: 0;
  
  svg {
    width: 24px;
    height: 24px;
  }
`;

const WidgetTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  line-height: 1.3;
  flex: 1;
`;

const WidgetBody = styled.div`
  padding: 0 20px 20px 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  z-index: 1;
`;

const WidgetValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 8px 0;
  line-height: 1;
`;

const WidgetDescription = styled.p`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0;
  line-height: 1.4;
`;

const WidgetAction = styled.div<{ $color?: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ $color }) => $color || '#3b82f6'};
  font-size: 0.9rem;
  font-weight: 600;
  margin-top: 12px;
  transition: all 0.3s ease;
  
  &::after {
    content: '→';
    transition: transform 0.3s ease;
  }
  
  ${WidgetCard}:hover & {
    transform: translateX(4px);
    
    &::after {
      transform: translateX(6px);
    }
  }
`;

// Teacher-specific styled components (matching WelcomePage)
const WelcomeText = styled.div`
  text-align: center;
  margin-bottom: 1rem;
`;

const WelcomeSmall = styled.div`
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-bottom: 0.2rem;
  font-weight: 400;
`;

const WelcomeLarge = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  line-height: 1;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const GrowText = styled.span`
  color: #ff6b35;
  text-shadow: 0 4px 8px rgba(255, 107, 53, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const MoreText = styled.span`
  color: #3b82f6;
  text-shadow: 0 4px 8px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const QuickLinksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
  margin-top: 2rem;
  width: 100%;
  max-width: 1600px;
  margin-left: auto;
  margin-right: auto;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const QuickLinkCard = styled.div<{ $color?: string }>`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 16px;
  padding: 0;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  height: 200px;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, ${({ $color }) => $color || '#3b82f6'}, ${({ $color }) => $color ? `${$color}80` : '#3b82f680'});
    border-radius: 16px 16px 0 0;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, ${({ $color }) => $color ? `${$color}05` : '#3b82f605'} 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-6px) scale(1.02);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
    border-color: ${({ $color }) => $color || '#3b82f6'};
    
    &::after {
      opacity: 1;
    }
  }
  
  &:active {
    transform: translateY(-3px) scale(1.01);
  }
  
  @media (max-width: 768px) {
    height: 180px;
  }
`;

const CardHeader = styled.div<{ $color?: string }>`
  padding: 20px 20px 12px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    padding: 16px 16px 10px 16px;
    gap: 12px;
  }
`;

const CardIcon = styled.div<{ $color?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, ${({ $color }) => $color || '#3b82f6'}, ${({ $color }) => $color ? `${$color}80` : '#3b82f680'});
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  flex-shrink: 0;
  box-shadow: 0 6px 16px ${({ $color }) => $color ? `${$color}25` : '#3b82f625'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  svg {
    width: 24px !important;
    height: 24px !important;
  }
  
  ${QuickLinkCard}:hover & {
    transform: scale(1.1);
    box-shadow: 0 8px 24px ${({ $color }) => $color ? `${$color}40` : '#3b82f640'};
  }
  
  @media (max-width: 768px) {
    width: 44px;
    height: 44px;
    
    svg {
      width: 20px !important;
      height: 20px !important;
    }
  }
`;

const CardTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  line-height: 1.3;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const CardBody = styled.div`
  padding: 0 20px 20px 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    padding: 0 16px 16px 16px;
  }
`;

const CardDescription = styled.p`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0 0 12px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
    margin: 0 0 10px 0;
    -webkit-line-clamp: 2;
  }
`;

// Student card styled components (matching StudentList.tsx)
const getStatusColor = (status: string) =>
  status === 'active' ? '34,197,94' : // green
  status === 'suspended' ? '245,158,11' : // orange
  status === 'withdrawn' ? '239,68,68' : // red
  '99,102,241'; // blue

const StudentCardGrid = styled.div<{ $hasScroll?: boolean; $columns?: number }>`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  width: 100%;
  padding: 0;
  margin: 0;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  
  @media (max-width: 700px) {
    grid-template-columns: repeat(1, 1fr);
    gap: 8px;
  }
  
  /* Apply scrollbar for both mobile and desktop when there are more than 2 rows */
  ${({ $hasScroll, theme, $columns = 3 }) => $hasScroll && css`
    /* Calculate height for 2 rows: 2 rows × (card height + gap) - gap (last row doesn't need gap) */
    /* Card height is approximately 150px (more compact display), gap is 16px on desktop, 8px on mobile */
    max-height: ${$columns === 1 
      ? 'calc(2 * (150px + 8px) - 8px)' /* Mobile: 1 column, 2 rows = 308px */
      : $columns === 2
      ? 'calc(2 * (150px + 16px) - 16px)' /* Tablet: 2 columns, 2 rows = 316px */
      : 'calc(2 * (150px + 16px) - 16px)'}; /* Desktop: 3 columns, 2 rows = 316px */
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 8px;
    -webkit-overflow-scrolling: touch;
    
    /* Custom scrollbar styling */
    scrollbar-width: thin;
    scrollbar-color: ${theme.BG === '#252525' 
      ? 'rgba(255, 255, 255, 0.3) transparent' 
      : 'rgba(0, 0, 0, 0.3) transparent'};
    
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 3px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: ${theme.BG === '#252525' 
        ? 'rgba(255, 255, 255, 0.3)' 
        : 'rgba(0, 0, 0, 0.3)'};
      border-radius: 3px;
      
      &:hover {
        background: ${theme.BG === '#252525' 
          ? 'rgba(255, 255, 255, 0.5)' 
          : 'rgba(0, 0, 0, 0.5)'};
      }
    }
  `}
`;

const StudentCard = styled.div<{ status: string }>`
  background: ${({ theme }) => theme.CARD};
  border-radius: 14px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.18), 0 1.5px 6px rgba(0,0,0,0.10);
  padding: 0;
  position: relative;
  border: 2.5px solid rgba(${({ status }) => getStatusColor(status)}, 0.5);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.18s;
  min-width: 270px;
  max-width: 100%;
  width: 100%;
  cursor: default;
  box-sizing: border-box;
  overflow: hidden;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: rgba(${({ status }) => getStatusColor(status)}, 0.8);
  }
  
  @media (max-width: 700px) {
    min-width: 200px;
  }
`;

const StatusBadge = styled.div<{ status: string }>`
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 600;
  background: ${({ status }) =>
    status === 'active' ? 'rgba(34, 197, 94, 0.15)' :
    status === 'suspended' ? 'rgba(245, 158, 11, 0.15)' :
    status === 'withdrawn' ? 'rgba(239, 68, 68, 0.15)' :
    'rgba(99, 102, 241, 0.15)'};
  color: ${({ status }) =>
    status === 'active' ? 'rgb(21, 128, 61)' :
    status === 'suspended' ? 'rgb(161, 98, 7)' :
    status === 'withdrawn' ? 'rgb(185, 28, 28)' :
    'rgb(67, 56, 202)'};
  box-shadow: none;
  letter-spacing: 0.02em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  line-height: 1;
  border: 1px solid ${({ status }) =>
    status === 'active' ? 'rgba(34, 197, 94, 0.3)' :
    status === 'suspended' ? 'rgba(245, 158, 11, 0.3)' :
    status === 'withdrawn' ? 'rgba(239, 68, 68, 0.3)' :
    'rgba(99, 102, 241, 0.3)'};

  ${({ status }) => status === 'active' && `
    &::before {
      content: '';
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.6;
    }
  `}
`;

const CardImageSection = styled.div`
  width: 100%;
  height: 80px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#f3f4f8'};
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  box-shadow: 0 1px 4px #0001;
  
  @media (max-width: 700px) {
    height: 100px;
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
  }
`;

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.32s cubic-bezier(0.4,0,0.2,1);
  will-change: transform;
  ${StudentCard}:hover & {
    transform: none;
  }
  
  @media (max-width: 700px) {
    transition: transform 0.2s ease;
    transform: translateZ(0);
    backface-visibility: hidden;
  }
`;

const StudentCardAvatar = styled.div`
  width: 120px;
  min-height: 140px;
  align-self: stretch;
  border-radius: 0;
  background: ${({ theme }) => theme.ACCENT + '22'};
  color: ${({ theme }) => theme.ACCENT};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 700;
  flex-shrink: 0;
  overflow: hidden;
  cursor: default;
  transition: all 0.2s ease;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ theme }) => theme.BG === '#252525' ?
    'linear-gradient(45deg, rgba(255,255,255,0.1), transparent)' :
    'linear-gradient(45deg, rgba(0,0,0,0.05), transparent)'};
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover::after {
    opacity: 1;
  }
  
  @media (max-width: 700px) {
    width: 90px;
    min-height: 120px;
    font-size: 2rem;
  }
`;

const StudentCardTop = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0;
  max-height: 140px;
  
  @media (max-width: 700px) {
    max-height: 120px;
  }
`;

const StudentCardName = styled.h3`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
`;

const StudentCardFatherName = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.92rem;
  margin-bottom: 0.1rem;
`;

const StudentCardDetails = styled.p`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.9rem;
  margin: 0.25rem 0;
`;

const CardActions = styled.div<{ offsetTop?: boolean; $active?: boolean }>`
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  flex-direction: row;
  gap: 4px;
  opacity: 0;
  pointer-events: none;
  z-index: 3;
  transition: opacity 0.18s, transform 0.18s;
  width: auto;
  
  @media (min-width: 701px) {
    ${StudentCard}:hover & {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }
  }
  
  @media (max-width: 700px) {
    opacity: ${({ $active }) => $active ? 1 : 0};
    pointer-events: ${({ $active }) => $active ? 'auto' : 'none'};
    transition: opacity 0.2s ease;
  }
`;

const CardActionBtn = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: #4a6cf7;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  transition: background 0.18s, color 0.18s, transform 0.18s;
  cursor: pointer;
  &:hover {
    background: #3a5ce5;
    transform: scale(1.12);
  }
`;

const StudentCardContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  background: none;
  padding: 0 6px;
`;

const CardIdBadge = styled.span`
  position: absolute;
  top: 4px;
  right: 4px;
  background: #6366f1;
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  box-shadow: 0 1px 2px #0002;
  z-index: 3;
  letter-spacing: 0.2px;
  border: 1px solid #fff3;
`;

const CardAction = styled.div<{ $color?: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ $color }) => $color || '#3b82f6'};
  font-size: 0.9rem;
  font-weight: 600;
  margin-top: auto;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &::after {
    content: '→';
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 1rem;
    display: inline-block;
  }
  
  ${QuickLinkCard}:hover & {
    transform: translateX(2px);
    
    &::after {
      transform: translateX(6px) scale(1.1);
    }
  }
  
  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

const CardDivider = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: block;
    height: 1px;
    background: ${({ theme }) => theme.BORDER};
    margin: 8px 0;
    opacity: 0.5;
  }
`;

// Events section styled components
const EventsSection = styled.div`
  margin-bottom: 3rem;
  width: 100%;
`;

const LinkedStudentsCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 16px;
  padding: 1.5rem;
  margin-top: 2rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  @media (max-width: 768px) {
    padding: 1rem;
    margin-top: 1.5rem;
  }
`;

const LinkedStudentsCardHeader = styled.div`
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const LinkedStudentsCardTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const TotalRemainingFee = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: ${({ theme }) => theme.BG === '#252525' 
    ? 'rgba(239, 68, 68, 0.15)' 
    : 'rgba(239, 68, 68, 0.1)'};
  border: 1px solid ${({ theme }) => theme.BG === '#252525' 
    ? 'rgba(239, 68, 68, 0.3)' 
    : 'rgba(239, 68, 68, 0.2)'};
  border-radius: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.BG === '#252525' 
    ? '#fca5a5' 
    : '#dc2626'};
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
`;

const FeeAmount = styled.span`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.BG === '#252525' 
    ? '#ef4444' 
    : '#b91c1c'};
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const FeeInfoCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 1rem;
  margin-top: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    margin-top: 1rem;
  }
`;

const FeeInfoCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

const FeeInfoCardTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const TotalFeeBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: ${({ theme }) => theme.BG === '#252525' 
    ? 'rgba(239, 68, 68, 0.15)' 
    : 'rgba(239, 68, 68, 0.1)'};
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.BG === '#252525' 
    ? '#ef4444' 
    : '#b91c1c'};
  
  span:last-child {
    font-size: 1.9rem;
    
    @media (max-width: 768px) {
      font-size: 1.8rem;
    }
  }
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
    padding: 0.5rem;
  }
`;

const FeeTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FeeTableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1fr;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const FeeTableRow = styled.div<{ $isStudentHeader?: boolean }>`
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1fr;
  gap: 0.75rem;
  padding: ${({ $isStudentHeader }) => $isStudentHeader ? '0.75rem' : '0.5rem'} 0.75rem;
  align-items: center;
  background: ${({ $isStudentHeader, theme }) => 
    $isStudentHeader 
      ? (theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)')
      : 'transparent'};
  border-radius: ${({ $isStudentHeader }) => $isStudentHeader ? '6px' : '0'};
  border-left: ${({ $isStudentHeader, theme }) => 
    $isStudentHeader ? `3px solid ${theme.BG === '#252525' ? '#ef4444' : '#dc2626'}` : 'none'};
  margin-top: ${({ $isStudentHeader }) => $isStudentHeader ? '0.5rem' : '0'};
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.25rem;
    padding: 0.5rem;
    border-left: none;
    border-bottom: 1px solid ${({ theme }) => theme.BORDER};
    background: ${({ theme }) => theme.BG === '#252525' 
      ? 'rgba(255, 255, 255, 0.02)' 
      : 'rgba(0, 0, 0, 0.01)'};
    border-radius: 6px;
    margin-top: 0.5rem;
  }
`;

const FeeCell = styled.div<{ $align?: 'left' | 'right' | 'center'; $bold?: boolean; $color?: string }>`
  font-size: 0.875rem;
  color: ${({ $color, theme }) => $color || theme.TEXT_PRIMARY};
  font-weight: ${({ $bold }) => $bold ? '700' : '500'};
  text-align: ${({ $align }) => $align || 'left'};
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
    text-align: left;
    display: flex;
    justify-content: space-between;
    
    &::before {
      content: attr(data-label);
      font-weight: 600;
      color: ${({ theme }) => theme.TEXT_SECONDARY};
      margin-right: 0.5rem;
    }
  }
`;

const StudentHeaderRow = styled.div`
  display: contents;
  
  @media (max-width: 768px) {
    display: block;
    font-weight: 700;
    font-size: 0.95rem;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
    padding: 0.5rem;
    margin-top: 0.75rem;
    background: ${({ theme }) => theme.BG === '#252525' 
      ? 'rgba(255, 255, 255, 0.05)' 
      : 'rgba(0, 0, 0, 0.03)'};
    border-radius: 6px;
    border-left: 3px solid ${({ theme }) => theme.BG === '#252525' ? '#ef4444' : '#dc2626'};
  }
`;

const StudentFeeCardsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const StudentFeeCard = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' 
    ? 'rgba(255, 255, 255, 0.03)' 
    : 'rgba(0, 0, 0, 0.02)'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-left: 3px solid ${({ theme }) => theme.BG === '#252525' ? '#ef4444' : '#dc2626'};
  border-radius: 8px;
  padding: 0.75rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' 
      ? 'rgba(255, 255, 255, 0.05)' 
      : 'rgba(0, 0, 0, 0.03)'};
  }
  
  @media (max-width: 768px) {
    padding: 0.625rem;
  }
`;

const StudentFeeCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.625rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  
  @media (max-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const StudentFeeCardName = styled.div`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const StudentFeeCardTotal = styled.div`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ theme }) => theme.BG === '#252525' 
    ? '#ef4444' 
    : '#b91c1c'};
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const FeeItemsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const FeeItemRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr;
  gap: 0.75rem;
  padding: 0.5rem 0.625rem;
  background: ${({ theme }) => theme.BG === '#252525' 
    ? 'rgba(255, 255, 255, 0.02)' 
    : 'rgba(0, 0, 0, 0.01)'};
  border-radius: 6px;
  align-items: center;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.25rem;
    padding: 0.5rem;
  }
`;

const FeeItemName = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 500;
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }
`;

const FeeItemDueDate = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  @media (max-width: 768px) {
    font-size: 0.75rem;
    &::before {
      content: 'Due: ';
      font-weight: 600;
    }
  }
`;

const FeeItemAmount = styled.div`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${({ theme }) => theme.BG === '#252525' 
    ? '#ef4444' 
    : '#b91c1c'};
  text-align: right;
  
  @media (max-width: 768px) {
    text-align: left;
    font-size: 0.8rem;
    &::before {
      content: 'Amount: ';
      font-weight: 600;
      color: ${({ theme }) => theme.TEXT_SECONDARY};
      margin-right: 0.25rem;
    }
  }
`;

const EventsTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const EventsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const EventCard = styled.div<{ $eventType?: string }>`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${({ $eventType }) => {
      switch ($eventType) {
        case 'academic': return '#3b82f6';
        case 'sports': return '#10b981';
        case 'cultural': return '#f59e0b';
        case 'holiday': return '#ef4444';
        case 'meeting': return '#8b5cf6';
        default: return '#6b7280';
      }
    }};
  }
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border-color: ${({ $eventType }) => {
      switch ($eventType) {
        case 'academic': return '#3b82f6';
        case 'sports': return '#10b981';
        case 'cultural': return '#f59e0b';
        case 'holiday': return '#ef4444';
        case 'meeting': return '#8b5cf6';
        default: return '#6b7280';
      }
    }};
  }
`;

const EventHeader = styled.div`
  display: flex;
  align-items: start;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const EventTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  flex: 1;
`;

const EventTypeBadge = styled.span<{ $eventType?: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  background: ${({ $eventType }) => {
    switch ($eventType) {
      case 'academic': return '#3b82f615';
      case 'sports': return '#10b98115';
      case 'cultural': return '#f59e0b15';
      case 'holiday': return '#ef444415';
      case 'meeting': return '#8b5cf615';
      default: return '#6b728015';
    }
  }};
  color: ${({ $eventType }) => {
    switch ($eventType) {
      case 'academic': return '#3b82f6';
      case 'sports': return '#10b981';
      case 'cultural': return '#f59e0b';
      case 'holiday': return '#ef4444';
      case 'meeting': return '#8b5cf6';
      default: return '#6b7280';
    }
  }};
`;

const EventDescription = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0 0 1rem 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const EventDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const EventDetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  
  svg {
    font-size: 1rem;
    opacity: 0.7;
  }
`;

const CustomLandingPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState<WidgetWithPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [widgetData, setWidgetData] = useState<Record<string, any>>({});
  const [studentInfo, setStudentInfo] = useState<{ id: number; name: string; school_id: number; role: string } | null>(null);
  const [parentInfo, setParentInfo] = useState<{ id: number; name: string; school_id: number; role: string } | null>(null);
  const [linkedStudents, setLinkedStudents] = useState<Array<{
    id: number;
    name: string;
    picture_url?: string | null;
    father_name?: string | null;
    phone?: string | null;
    father_mobile?: string | null;
    address?: string | null;
    status?: string;
    class_id?: number | null;
    section_id?: number | null;
    classes?: { name: string } | null;
    sections?: { name: string } | null;
    notification_channel?: string | null;
    remainingFee?: number;
  }>>([]);
  const [totalRemainingFee, setTotalRemainingFee] = useState<number>(0);
  const [feeDetails, setFeeDetails] = useState<Array<{
    studentId: number;
    studentName: string;
    remainingFeeItems: Array<{
      name: string;
      amount: number;
      dueDate: string;
    }>;
    totalRemaining: number;
  }>>([]);
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [gridColumns, setGridColumns] = useState(3);
  
  // Teacher-specific state
  const [staffName, setStaffName] = useState<string>('');
  const [staffGender, setStaffGender] = useState<string>('');
  const [teacherSections, setTeacherSections] = useState<Array<{id: number, name: string, class_id: number, class_name: string}>>([]);
  const [publishedExaminations, setPublishedExaminations] = useState<Examination[]>([]);
  const [isClassTeacher, setIsClassTeacher] = useState<boolean>(false);
  const [renderSettings, setRenderSettings] = useState<RenderSettings | null>(null);
  
  // Events state
  const [events, setEvents] = useState<Array<{
    id: number;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    event_type: string;
    is_all_day: boolean;
    visible_to: string[];
  }>>([]);

  // Check for student or parent session if no staff user
  useEffect(() => {
    if (!user) {
      try {
        const studentSession = localStorage.getItem('studentSession');
        if (studentSession) {
          const parsed = JSON.parse(studentSession);
          if (parsed?.id && parsed?.school_id) {
            setStudentInfo({
              id: parsed.id,
              name: parsed.name || 'Student',
              school_id: parsed.school_id,
              role: 'Student'
            });
            setParentInfo(null);
            return;
          }
        }
        
        const parentSession = localStorage.getItem('parentSession');
        if (parentSession) {
          const parsed = JSON.parse(parentSession);
          if (parsed?.id && parsed?.school_id) {
            setParentInfo({
              id: parsed.id,
              name: parsed.name || 'Parent',
              school_id: parsed.school_id,
              role: 'Parent'
            });
            setStudentInfo(null);
            return;
          }
        }
        
        setStudentInfo(null);
        setParentInfo(null);
      } catch (e) {
        // Error parsing session
        setStudentInfo(null);
        setParentInfo(null);
      }
    } else {
      setStudentInfo(null);
      setParentInfo(null);
    }
  }, [user]);

  // Track mobile state and grid columns
  useEffect(() => {
    const checkViewport = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      setIsMobile(width <= 700);
      
      // Determine grid columns based on viewport width
      if (width <= 700) {
        setGridColumns(1); // Mobile: 1 column
      } else if (width <= 1200) {
        setGridColumns(2); // Tablet: 2 columns
      } else {
        setGridColumns(3); // Desktop: 3 columns
      }
    };
    
    checkViewport();
    window.addEventListener('resize', checkViewport);
    
    return () => {
      window.removeEventListener('resize', checkViewport);
    };
  }, []);

  // Close card actions when clicking outside on mobile
  useEffect(() => {
    if (activeCardId === null) return;

    const handleClickOutside = (e: Event) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking on a card or its actions
      if (target.closest('[data-student-card]')) return;
      setActiveCardId(null);
    };

    // Only add listener on mobile
    if (isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [activeCardId, isMobile]);

  useEffect(() => {
    const schoolId = user?.school_id || studentInfo?.school_id || parentInfo?.school_id;
    if (schoolId) {
      // Load events for all users
      loadEvents();
      
      // If user is a Teacher, load teacher-specific data
      if (user?.role === 'Teacher') {
        loadTeacherData();
      } else if (user?.role === 'Student' || studentInfo) {
        // For students, load render settings
        loadStudentData();
      } else if (user?.role === 'Parent' || parentInfo) {
        // For parents, load linked students
        loadParentData();
      } else {
        loadWidgets();
      }
    }
  }, [user, studentInfo, parentInfo]);

  const loadStudentData = async () => {
    const schoolId = user?.school_id || studentInfo?.school_id;
    if (!schoolId) return;

    setLoading(true);
    try {
      const settings = await fetchRenderSettings(schoolId);
      setRenderSettings(settings);
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  const loadParentData = async () => {
    const familyId = parentInfo?.id;
    const schoolId = parentInfo?.school_id;
    if (!familyId || !schoolId) return;

    setLoading(true);
    try {
      // Fetch linked students from family_members table with full student details
      const { data: familyMembers, error } = await supabase
        .from('family_members')
        .select(`
          student_id,
          students (
            id,
            name,
            picture_url,
            father_name,
            phone,
            father_mobile,
            address,
            status,
            notification_channel
          )
        `)
        .eq('family_id', familyId);

      if (error) throw error;

      // Extract student IDs
      const studentIds = (familyMembers || [])
        .map((member: any) => member.students?.id)
        .filter(Boolean);

      if (studentIds.length === 0) {
        setLinkedStudents([]);
        setLoading(false);
        return;
      }

      // Fetch full student data with class/section from student_class_history
      const { data: activeSessionData } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .eq('school_id', schoolId)
        .maybeSingle();

      let studentsWithClass: any[] = [];

      if (activeSessionData) {
        // Fetch from student_class_history for active session
        const { data: historyData } = await supabase
          .from('student_class_history')
          .select(`
            student_id,
            new_class_id,
            new_section_id,
            new_classes:new_class_id(id, name),
            new_sections:new_section_id(id, name)
          `)
          .eq('session_id', activeSessionData.id)
          .eq('school_id', schoolId)
          .in('student_id', studentIds);

        if (historyData && historyData.length > 0) {
          const historyMap = new Map(historyData.map((h: any) => [h.student_id, h]));
          
          // Fetch students and merge with class history
          const { data: studentsData } = await supabase
            .from('students')
            .select('id, name, picture_url, father_name, phone, father_mobile, address, status, notification_channel')
            .eq('school_id', schoolId)
            .in('id', studentIds);

          studentsWithClass = (studentsData || []).map((student: any) => {
            const history = historyMap.get(student.id);
            return {
              ...student,
              class_id: history?.new_class_id || null,
              section_id: history?.new_section_id || null,
              classes: history?.new_classes || null,
              sections: history?.new_sections || null,
            };
          });
        }
      }

      // If no history data, fetch students directly
      if (studentsWithClass.length === 0) {
        const { data: studentsData } = await supabase
          .from('students')
          .select('id, name, picture_url, father_name, phone, father_mobile, address, status, notification_channel, class_id, section_id')
          .eq('school_id', schoolId)
          .in('id', studentIds);

        if (studentsData) {
          // Fetch class and section names
          const classIds = Array.from(new Set(studentsData.map((s: any) => s.class_id).filter(Boolean)));
          const sectionIds = Array.from(new Set(studentsData.map((s: any) => s.section_id).filter(Boolean)));

          const { data: classesData } = await supabase
            .from('classes')
            .select('id, name')
            .eq('school_id', schoolId)
            .in('id', classIds);

          const { data: sectionsData } = await supabase
            .from('sections')
            .select('id, name')
            .eq('school_id', schoolId)
            .in('id', sectionIds);

          const classMap = new Map(classesData?.map((c: any) => [c.id, c]) || []);
          const sectionMap = new Map(sectionsData?.map((s: any) => [s.id, s]) || []);

          studentsWithClass = (studentsData || []).map((student: any) => ({
            ...student,
            classes: classMap.get(student.class_id) || null,
            sections: sectionMap.get(student.section_id) || null,
          }));
        }
      }

      setLinkedStudents(studentsWithClass);
      
      // Calculate remaining fee for all linked students
      await calculateRemainingFeesForStudents(studentsWithClass, schoolId);
      
      // Load render settings for parents
      const settings = await fetchRenderSettings(schoolId);
      setRenderSettings(settings);
    } catch (error) {
      console.error('[CustomLandingPage] Error loading parent data:', error);
      setLinkedStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate remaining fee for a list of students
  const calculateRemainingFeesForStudents = async (
    students: Array<{
      id: number;
      name: string;
      picture_url?: string | null;
      father_name?: string | null;
      phone?: string | null;
      father_mobile?: string | null;
      address?: string | null;
      status?: string;
      class_id?: number | null;
      section_id?: number | null;
      classes?: { name: string } | null;
      sections?: { name: string } | null;
      notification_channel?: string | null;
    }>, 
    schoolId: number
  ) => {
    if (!students || students.length === 0) {
      setTotalRemainingFee(0);
      setFeeDetails([]);
      return;
    }

    try {
      let totalRemaining = 0;
      const feeDetailsList: Array<{
        studentId: number;
        studentName: string;
        remainingFeeItems: Array<{
          name: string;
          amount: number;
          dueDate: string;
        }>;
        totalRemaining: number;
      }> = [];

      const studentsWithFees = await Promise.all(
        students.map(async (student) => {
          // Fetch fee invoices for the student with fee heads
          const { data: feeInvoices, error: invoicesError } = await supabase
            .from('fee_invoices')
            .select(`
              id,
              student_id,
              month,
              year,
              due_date,
              fee_invoice_items (
                id,
                amount,
                fee_heads (
                  id,
                  name,
                  description
                )
              )
            `)
            .eq('student_id', student.id)
            .eq('school_id', schoolId)
            .order('year', { ascending: false })
            .order('month', { ascending: false });

          if (invoicesError) {
            console.error(`Error fetching invoices for student ${student.id}:`, invoicesError);
            return { ...student, remainingFee: 0 };
          }

          // Fetch payment history for the student
          const { data: paymentHistory, error: paymentError } = await supabase
            .from('fee_payments')
            .select(`
              id,
              fee_invoices!inner (
                student_id
              ),
              fee_payment_items (
                id,
                fee_item_id,
                amount
              )
            `)
            .eq('fee_invoices.student_id', student.id)
            .eq('school_id', schoolId);

          if (paymentError) {
            console.error(`Error fetching payments for student ${student.id}:`, paymentError);
            return { ...student, remainingFee: 0 };
          }

          // Calculate remaining fee for this student
          let studentRemaining = 0;
          const remainingFeeItems: Array<{
            name: string;
            amount: number;
            dueDate: string;
          }> = [];

          if (feeInvoices && feeInvoices.length > 0) {
            feeInvoices.forEach((invoice) => {
              invoice.fee_invoice_items?.forEach((item: any) => {
                const itemAmount = Number(item.amount || 0);
                
                // Calculate already paid amount for this specific fee item
                const alreadyPaid = paymentHistory?.reduce((sum, payment) => {
                  if (payment.fee_payment_items) {
                    const itemPayment = payment.fee_payment_items.find(
                      (paymentItem: any) => paymentItem.fee_item_id === item.id
                    );
                    return sum + (itemPayment ? Number(itemPayment.amount || 0) : 0);
                  }
                  return sum;
                }, 0) || 0;
                
                const remainingItemAmount = Math.max(0, itemAmount - alreadyPaid);
                
                // Only include items that still need payment
                if (remainingItemAmount > 0) {
                  const feeHeadName = item.fee_heads?.name || 'Unknown Fee Head';
                  const monthYear = new Date(invoice.month + '/01/' + invoice.year).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                  
                  remainingFeeItems.push({
                    name: `${feeHeadName} (${monthYear})`,
                    amount: remainingItemAmount,
                    dueDate: invoice.due_date
                  });
                  studentRemaining += remainingItemAmount;
                }
              });
            });
          }

          // Store detailed fee information
          if (remainingFeeItems.length > 0) {
            feeDetailsList.push({
              studentId: student.id,
              studentName: student.name,
              remainingFeeItems,
              totalRemaining: studentRemaining
            });
          }

          totalRemaining += studentRemaining;
          return { ...student, remainingFee: studentRemaining };
        })
      );

      setLinkedStudents(studentsWithFees);
      setTotalRemainingFee(totalRemaining);
      setFeeDetails(feeDetailsList);
    } catch (error) {
      console.error('[CustomLandingPage] Error calculating remaining fees:', error);
      setTotalRemainingFee(0);
      setFeeDetails([]);
    }
  };

  const loadTeacherData = async () => {
    if (!user?.school_id || !user?.staff_id) return;

    setLoading(true);
    try {
      const [staffNameResult, examinationsResult, classTeacherResult, sectionsResult, settingsResult] = await Promise.all([
        fetchStaffName(),
        fetchPublishedExaminations(),
        checkClassTeacherAssignment(),
        fetchTeacherSections(),
        fetchRenderSettingsData()
      ]);
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffName = async () => {
    if (user?.staff_id) {
      try {
        const { data, error } = await supabase
          .from('staff')
          .select('name, gender')
          .eq('id', user.staff_id)
          .single();

        if (error) throw error;
        if (data) {
          setStaffName(data.name);
          setStaffGender(data.gender || '');
        }
      } catch (error) {
        // Handle error silently
      }
    }
  };

  const fetchPublishedExaminations = async () => {
    if (user?.school_id) {
      try {
        const examinations = await examinationService.getExaminations({}, user.school_id);
        const published = examinations.filter(exam => exam.status === 'published');
        setPublishedExaminations(published);
      } catch (error) {
        // Handle error silently
      }
    }
  };

  const checkClassTeacherAssignment = async () => {
    if (user?.staff_id && user?.school_id) {
      try {
        const { data: sectionAssignments, error } = await supabase
          .from('sections')
          .select('id, name, class_id')
          .eq('teacher_id', user.staff_id)
          .eq('school_id', user.school_id);

        if (error) {
          setIsClassTeacher(false);
          return;
        }

        const hasSectionAssignments = sectionAssignments && sectionAssignments.length > 0;
        setIsClassTeacher(hasSectionAssignments);
      } catch (error) {
        setIsClassTeacher(false);
      }
    }
  };

  const fetchTeacherSections = async () => {
    if (user?.staff_id && user?.school_id) {
      try {
        const { data: sections, error: sectionsError } = await supabase
          .from('sections')
          .select('id, name, class_id')
          .eq('teacher_id', user.staff_id)
          .eq('school_id', user.school_id);

        if (sectionsError) {
          setTeacherSections([]);
          return;
        }

        if (!sections || sections.length === 0) {
          setTeacherSections([]);
          return;
        }

        const classIds = Array.from(new Set(sections.map(s => s.class_id)));

        const { data: classes, error: classesError } = await supabase
          .from('classes')
          .select('id, name')
          .in('id', classIds)
          .eq('school_id', user.school_id);

        if (classesError) {
          setTeacherSections([]);
          return;
        }

        const classMap = new Map(classes?.map(c => [c.id, c.name]) || []);

        const formattedSections = sections.map(section => ({
          id: section.id,
          name: section.name,
          class_id: section.class_id,
          class_name: classMap.get(section.class_id) || 'Unknown Class'
        }));

        setTeacherSections(formattedSections);
      } catch (error) {
        setTeacherSections([]);
      }
    }
  };

  const fetchRenderSettingsData = async () => {
    if (user?.school_id) {
      const settings = await fetchRenderSettings(user.school_id);
      setRenderSettings(settings);
    }
  };

  const loadEvents = async () => {
    const schoolId = user?.school_id || studentInfo?.school_id || parentInfo?.school_id;
    if (!schoolId) return;

    try {
      const userRole = user?.role || studentInfo?.role || parentInfo?.role || 'Guest';
      
      // Fetch all events for the school
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('school_id', schoolId)
        .gte('end_date', new Date().toISOString().split('T')[0]) // Only future events
        .order('start_date', { ascending: true })
        .limit(10); // Limit to 10 upcoming events

      if (error) throw error;

      // Filter events based on user role and visible_to array
      const filteredEvents = (data || []).filter(event => {
        // If visible_to is empty, show to all
        if (!event.visible_to || event.visible_to.length === 0) return true;
        // Check if user's role is in visible_to array
        return event.visible_to.includes(userRole);
      });

      setEvents(filteredEvents);
    } catch (error) {
      console.error('[CustomLandingPage] Error loading events:', error);
    }
  };

  const loadWidgets = async () => {
    const schoolId = user?.school_id || studentInfo?.school_id;
    if (!schoolId) return;

    setLoading(true);
    try {
      // Determine user role
      const userRole = user?.role || studentInfo?.role || 'Guest';
      const widgetsData = await landingPageService.getWidgetsForRole(schoolId, userRole);
      setWidgets(widgetsData);

      // Load data for stat widgets
      const dataPromises = widgetsData
        .filter(w => w.widget_type === 'stat')
        .map(async (widget) => {
          try {
            const value = await fetchWidgetValue(widget);
            return { [widget.widget_key]: value };
          } catch (error) {
            return { [widget.widget_key]: 'N/A' };
          }
        });

      const dataResults = await Promise.all(dataPromises);
      const dataMap = Object.assign({}, ...dataResults);
      setWidgetData(dataMap);
    } catch (error) {
      console.error('[CustomLandingPage] Error loading widgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWidgetValue = async (widget: WidgetWithPreference): Promise<string | number> => {
    const config = widget.widget_config || {};
    const schoolId = user?.school_id || studentInfo?.school_id;
    
    try {
      switch (config.query) {
        case 'students':
          const { count: studentCount } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId);
          return studentCount || 0;

        case 'staff':
          let staffQuery = supabase
            .from('staff')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId);
          
          if (config.filter?.role) {
            staffQuery = staffQuery.eq('role', config.filter.role);
          }
          
          const { count: staffCount } = await staffQuery;
          return staffCount || 0;

        case 'reports':
          let reportsQuery = supabase
            .from('reports')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId);
          
          if (config.filter?.status) {
            reportsQuery = reportsQuery.eq('status', config.filter.status);
          }
          
          const { count: reportsCount } = await reportsQuery;
          return reportsCount || 0;

        case 'attendance':
          // Get today's attendance count
          const today = new Date().toISOString().split('T')[0];
          const { count: attendanceCount } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId)
            .eq('date', today);
          return attendanceCount || 0;

        default:
          return 'N/A';
      }
    } catch (error) {
      console.error('[CustomLandingPage] Error fetching widget value:', error);
      return 'N/A';
    }
  };

  const getIconComponent = (iconName?: string) => {
    if (!iconName) return Icons.Dashboard;
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Icons.Dashboard;
  };

  const handleWidgetClick = (widget: WidgetWithPreference) => {
    const config = widget.widget_config || {};
    
    // Handle link widgets
    if (widget.widget_type === 'link' && config.route) {
      navigate(config.route);
    }
    
    // Handle stat widgets - navigate to relevant page
    if (widget.widget_type === 'stat') {
      switch (widget.widget_key) {
        case 'total_students':
          navigate('/students');
          break;
        case 'total_teachers':
          navigate('/employees');
          break;
        case 'attendance_today':
          navigate('/attendance');
          break;
        case 'pending_reports':
          navigate('/reports');
          break;
        default:
          break;
      }
    }
  };

  // Helper function to get gender-based title
  const getGenderTitle = (gender: string) => {
    if (!gender) return '';
    const genderLower = gender.toLowerCase();
    if (genderLower === 'male' || genderLower === 'm') return 'Mr. ';
    if (genderLower === 'female' || genderLower === 'f') return 'Ms. ';
    return '';
  };

  // Helper function to format class-section info
  const getClassSectionInfo = () => {
    if (teacherSections.length === 0) return '';
    
    const sectionsInfo = teacherSections.map(section => 
      `${section.class_name}-${section.name}`
    ).join(', ');
    
    return ` (${sectionsInfo})`;
  };

  if (loading) {
    return <Loader />;
  }

  // Helper function to format event date
  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Helper function to format event time
  const formatEventTime = (timeStr?: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // If user is a Student, show student-specific menu cards
  if (user?.role === 'Student' || studentInfo) {
    // For students, get ID from studentInfo (for student session) or from user
    // Note: Students don't have staff_id, so we need to get their student ID differently
    let studentId: number | null = null;
    
    if (studentInfo?.id) {
      studentId = studentInfo.id;
    } else if (user?.role === 'Student') {
      // If user is logged in as student, we might need to fetch their student ID
      // For now, try to get it from localStorage or we'll need to fetch it
      try {
        const studentSession = localStorage.getItem('studentSession');
        if (studentSession) {
          const parsed = JSON.parse(studentSession);
          if (parsed?.id) {
            studentId = parsed.id;
          }
        }
      } catch (e) {
        // Error parsing student session
      }
    }
    
    return (
      <Container>
        <WelcomeHeader>
          <WelcomeText>
            <WelcomeSmall>Welcome to</WelcomeSmall>
            <WelcomeLarge>
              <GrowText>GROW</GrowText> <MoreText>MORE!</MoreText>
            </WelcomeLarge>
          </WelcomeText>
          <Subtitle>{user?.name || studentInfo?.name || 'Student'}</Subtitle>
        </WelcomeHeader>

        {/* Events Section */}
        {events.length > 0 && (
          <EventsSection>
            <EventsTitle>
              <EventIcon />
              Upcoming Events
            </EventsTitle>
            <EventsGrid>
              {events.map((event) => (
                <EventCard key={event.id} $eventType={event.event_type}>
                  <EventHeader>
                    <EventTitle>{event.title}</EventTitle>
                    <EventTypeBadge $eventType={event.event_type}>
                      {event.event_type}
                    </EventTypeBadge>
                  </EventHeader>
                  <EventDescription>{event.description}</EventDescription>
                  <EventDetails>
                    <EventDetailRow>
                      <CalendarIcon />
                      <span>
                        {formatEventDate(event.start_date)}
                        {event.start_date !== event.end_date && ` - ${formatEventDate(event.end_date)}`}
                      </span>
                    </EventDetailRow>
                    {!event.is_all_day && event.start_time && (
                      <EventDetailRow>
                        <AccessTimeIcon />
                        <span>
                          {formatEventTime(event.start_time)}
                          {event.end_time && ` - ${formatEventTime(event.end_time)}`}
                        </span>
                      </EventDetailRow>
                    )}
                    {event.location && (
                      <EventDetailRow>
                        <LocationIcon />
                        <span>{event.location}</span>
                      </EventDetailRow>
                    )}
                  </EventDetails>
                </EventCard>
              ))}
            </EventsGrid>
          </EventsSection>
        )}

        <QuickLinksGrid>
          {/* My Profile Card */}
          {studentId && isStudentCardVisible(renderSettings, 'my_profile') && (
            <QuickLinkCard onClick={() => navigate(`/student/${studentId}`)} $color="#6366f1">
              <CardHeader $color="#6366f1">
                <CardIcon $color="#6366f1">
                  <PersonIcon />
                </CardIcon>
                <CardTitle>My Profile</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  View your profile, attendance records, examination results, test records, and reports.
                </CardDescription>
                <CardAction $color="#6366f1">
                  View Profile
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          )}
        </QuickLinksGrid>
      </Container>
    );
  }

  // If user is a Parent, show linked students
  if (user?.role === 'Parent' || parentInfo) {
    return (
      <Container>
        <WelcomeHeader>
          <WelcomeText>
            <WelcomeSmall>Welcome to</WelcomeSmall>
            <WelcomeLarge>
              <GrowText>GROW</GrowText> <MoreText>MORE!</MoreText>
            </WelcomeLarge>
          </WelcomeText>
          <Subtitle>{user?.name || parentInfo?.name || 'Parent'}</Subtitle>
        </WelcomeHeader>

        {/* Events Section */}
        {events.length > 0 && (
          <EventsSection>
            <EventsTitle>
              <EventIcon />
              Upcoming Events
            </EventsTitle>
            <EventsGrid>
              {events.map((event) => (
                <EventCard key={event.id} $eventType={event.event_type}>
                  <EventHeader>
                    <EventTitle>{event.title}</EventTitle>
                    <EventTypeBadge $eventType={event.event_type}>
                      {event.event_type}
                    </EventTypeBadge>
                  </EventHeader>
                  <EventDescription>{event.description}</EventDescription>
                  <EventDetails>
                    <EventDetailRow>
                      <CalendarIcon />
                      <span>
                        {formatEventDate(event.start_date)}
                        {event.start_date !== event.end_date && ` - ${formatEventDate(event.end_date)}`}
                      </span>
                    </EventDetailRow>
                    {!event.is_all_day && event.start_time && (
                      <EventDetailRow>
                        <AccessTimeIcon />
                        <span>
                          {formatEventTime(event.start_time)}
                          {event.end_time && ` - ${formatEventTime(event.end_time)}`}
                        </span>
                      </EventDetailRow>
                    )}
                    {event.location && (
                      <EventDetailRow>
                        <LocationIcon />
                        <span>{event.location}</span>
                      </EventDetailRow>
                    )}
                  </EventDetails>
                </EventCard>
              ))}
            </EventsGrid>
          </EventsSection>
        )}

        {/* Linked Students Section */}
        {isParentCardVisible(renderSettings, 'linked_students') && (
          <LinkedStudentsCard>
            <LinkedStudentsCardHeader>
              <LinkedStudentsCardTitle>Linked Students</LinkedStudentsCardTitle>
            </LinkedStudentsCardHeader>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary, #666)' }}>
                Loading students...
              </div>
            ) : linkedStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary, #666)' }}>
                No students linked to this family.
              </div>
            ) : (
              <StudentCardGrid 
                $hasScroll={linkedStudents.length > (gridColumns * 2)} 
                $columns={gridColumns}
              >
                {linkedStudents.map((student) => (
              <StudentCard
                key={student.id}
                status={student.status || 'active'}
                data-student-card
                onClick={(e) => {
                  // Don't toggle if clicking on action buttons
                  if ((e.target as HTMLElement).closest('.card-actions')) return;
                  
                  // On mobile, toggle actions visibility
                  if (isMobile) {
                    setActiveCardId(activeCardId === student.id ? null : student.id);
                  }
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  fontSize: '0.85rem',
                  opacity: 0.6,
                  fontWeight: 600,
                  color: 'inherit',
                  background: 'rgba(0, 0, 0, 0.05)',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  zIndex: 1
                }}>
                  #{student.id}
                </div>
                <StudentCardTop>
                  <StudentCardAvatar
                    title="Student Avatar"
                  >
                    {student.picture_url ? (
                      <img
                        src={student.picture_url}
                        alt={student.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'top',
                          display: 'block'
                        }}
                      />
                    ) : (
                      <span style={{ width: '100%', textAlign: 'center' }}>
                        {(student.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?')}
                      </span>
                    )}
                  </StudentCardAvatar>
                  <StudentCardContent style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.2rem 1.5rem 1.2rem 1rem' }}>
                    <StudentCardName>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>{student.name}</span>
                        <StatusBadge status={student.status || 'active'}>
                          {(student.status || 'active').charAt(0).toUpperCase() + (student.status || 'active').slice(1)}
                        </StatusBadge>
                      </div>
                    </StudentCardName>
                    <StudentCardFatherName style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{student.father_name || 'N/A'}</span>
                      {(student.phone || student.father_mobile) && (
                        <span style={{ fontSize: '0.85rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {student.notification_channel === 'whatsapp' ? (
                            <WhatsAppIcon style={{ fontSize: '0.9rem', color: '#25D366' }} />
                          ) : student.notification_channel === 'sms' ? (
                            <SmsIcon style={{ fontSize: '0.9rem', color: '#4CAF50' }} />
                          ) : (
                            <PhoneIcon style={{ fontSize: '0.9rem' }} />
                          )}
                          {student.phone || student.father_mobile}
                        </span>
                      )}
                    </StudentCardFatherName>
                    <StudentCardDetails style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span>
                        {student.classes?.name || 'N/A'}
                        {student.sections?.name && ` (${student.sections.name})`}
                      </span>
                      {student.address && (
                        <span style={{ fontSize: '0.8rem', opacity: 0.7, textAlign: 'right', maxWidth: '50%', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <LocationIcon style={{ fontSize: '0.9rem' }} />
                          {student.address}
                        </span>
                      )}
                    </StudentCardDetails>
                  </StudentCardContent>
                </StudentCardTop>
                <CardActions className="card-actions" $active={activeCardId === student.id}>
                  <CardActionBtn
                    title="View Profile"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveCardId(null); // Close actions after navigation
                      navigate(`/students/profile/${student.id}`);
                    }}
                  >
                    <AccountCircle fontSize="inherit" />
                  </CardActionBtn>
                </CardActions>
              </StudentCard>
                ))}
              </StudentCardGrid>
            )}
          </LinkedStudentsCard>
        )}

        {/* Fee Information Card */}
        {isParentCardVisible(renderSettings, 'linked_students') && feeDetails.length > 0 && (
          <FeeInfoCard>
            <FeeInfoCardHeader>
              <FeeInfoCardTitle>
                <AttachMoneyIcon style={{ fontSize: '1.1rem' }} />
                Fee Information
              </FeeInfoCardTitle>
              {totalRemainingFee > 0 && (
                <TotalFeeBadge>
                  <span>Total Remaining:</span>
                  <span>Rs. {Math.floor(totalRemainingFee)}</span>
                </TotalFeeBadge>
              )}
            </FeeInfoCardHeader>

            <StudentFeeCardsContainer>
              {feeDetails.map((studentFee) => (
                <StudentFeeCard key={studentFee.studentId}>
                  <StudentFeeCardHeader>
                    <StudentFeeCardName>{studentFee.studentName}</StudentFeeCardName>
                    <StudentFeeCardTotal>Rs. {Math.floor(studentFee.totalRemaining)}</StudentFeeCardTotal>
                  </StudentFeeCardHeader>
                  
                  <FeeItemsList>
                    {studentFee.remainingFeeItems.map((item, itemIndex) => (
                      <FeeItemRow key={itemIndex}>
                        <FeeItemName>{item.name}</FeeItemName>
                        <FeeItemDueDate>
                          {new Date(item.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </FeeItemDueDate>
                        <FeeItemAmount>Rs. {Math.floor(item.amount)}</FeeItemAmount>
                      </FeeItemRow>
                    ))}
                  </FeeItemsList>
                </StudentFeeCard>
              ))}
            </StudentFeeCardsContainer>
          </FeeInfoCard>
        )}
      </Container>
    );
  }

  // If user is a Teacher, show teacher-specific menu cards
  if (user?.role === 'Teacher') {
    return (
      <Container>
        <WelcomeHeader>
          <WelcomeText>
            <WelcomeSmall>Welcome to</WelcomeSmall>
            <WelcomeLarge>
              <GrowText>GROW</GrowText> <MoreText>MORE!</MoreText>
            </WelcomeLarge>
          </WelcomeText>
          <Subtitle>{getGenderTitle(staffGender)}{staffName || user?.name || 'User'}{getClassSectionInfo()}</Subtitle>
        </WelcomeHeader>

        {/* Events Section */}
        {events.length > 0 && (
          <EventsSection>
            <EventsTitle>
              <EventIcon />
              Upcoming Events
            </EventsTitle>
            <EventsGrid>
              {events.map((event) => (
                <EventCard key={event.id} $eventType={event.event_type}>
                  <EventHeader>
                    <EventTitle>{event.title}</EventTitle>
                    <EventTypeBadge $eventType={event.event_type}>
                      {event.event_type}
                    </EventTypeBadge>
                  </EventHeader>
                  <EventDescription>{event.description}</EventDescription>
                  <EventDetails>
                    <EventDetailRow>
                      <CalendarIcon />
                      <span>
                        {formatEventDate(event.start_date)}
                        {event.start_date !== event.end_date && ` - ${formatEventDate(event.end_date)}`}
                      </span>
                    </EventDetailRow>
                    {!event.is_all_day && event.start_time && (
                      <EventDetailRow>
                        <AccessTimeIcon />
                        <span>
                          {formatEventTime(event.start_time)}
                          {event.end_time && ` - ${formatEventTime(event.end_time)}`}
                        </span>
                      </EventDetailRow>
                    )}
                    {event.location && (
                      <EventDetailRow>
                        <LocationIcon />
                        <span>{event.location}</span>
                      </EventDetailRow>
                    )}
                  </EventDetails>
                </EventCard>
              ))}
            </EventsGrid>
          </EventsSection>
        )}

        <QuickLinksGrid>
          {/* My Profile Card */}
          {user?.staff_id && isTeacherCardVisible(renderSettings, 'my_profile') && (
            <QuickLinkCard onClick={() => navigate(`/employees/profile/${user.staff_id}`)} $color="#6366f1">
              <CardHeader $color="#6366f1">
                <CardIcon $color="#6366f1">
                  <PersonIcon />
                </CardIcon>
                <CardTitle>My Profile</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  View your profile, attendance records, timetable, test analysis, and diary assignments.
                </CardDescription>
                <CardAction $color="#6366f1">
                  View Profile
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          )}

          {user?.staff_id && isTeacherCardVisible(renderSettings, 'my_profile') && <CardDivider />}

          {/* Attendance Cards - Only show if teacher is assigned as class teacher */}
          {isClassTeacher && isTeacherCardVisible(renderSettings, 'mark_attendance') && (
            <QuickLinkCard onClick={() => navigate('/attendance/mark')} $color="#3b82f6">
              <CardHeader $color="#3b82f6">
                <CardIcon $color="#3b82f6">
                  <AssessmentIcon />
                </CardIcon>
                <CardTitle>Mark Attendance</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  Take attendance for your classes. Mark students as present, absent, or late.
                </CardDescription>
                <CardAction $color="#3b82f6">
                  Get Started
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          )}

          {isClassTeacher && isTeacherCardVisible(renderSettings, 'attendance_reports') && (
            <QuickLinkCard onClick={() => navigate('/attendance/report')} $color="#10b981">
              <CardHeader $color="#10b981">
                <CardIcon $color="#10b981">
                  <BarChartIcon />
                </CardIcon>
                <CardTitle>Attendance Reports</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  View and analyze attendance records, generate reports, and track attendance patterns.
                </CardDescription>
                <CardAction $color="#10b981">
                  Get Started
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          )}

          {isClassTeacher && isTeacherCardVisible(renderSettings, 'half_leaves') && (
            <QuickLinkCard onClick={() => navigate('/attendance/half-leaves')} $color="#ec4899">
              <CardHeader $color="#ec4899">
                <CardIcon $color="#ec4899">
                  <AccessTimeIcon />
                </CardIcon>
                <CardTitle>Half Leaves</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  Record and manage half-day leaves for students in your classes. Track first half and second half leave records.
                </CardDescription>
                <CardAction $color="#ec4899">
                  Get Started
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          )}

          {(isClassTeacher && (isTeacherCardVisible(renderSettings, 'mark_attendance') || isTeacherCardVisible(renderSettings, 'attendance_reports') || isTeacherCardVisible(renderSettings, 'half_leaves'))) && <CardDivider />}

          {isTeacherCardVisible(renderSettings, 'reports') && (
            <QuickLinkCard onClick={() => navigate('/reports')} $color="#f59e0b">
              <CardHeader $color="#f59e0b">
                <CardIcon $color="#f59e0b">
                  <AssignmentIcon />
                </CardIcon>
                <CardTitle>Reports</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  View, create, and manage student and staff reports.
                </CardDescription>
                <CardAction $color="#f59e0b">
                  Get Started
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          )}

          {isTeacherCardVisible(renderSettings, 'reports') && <CardDivider />}

          {isTeacherCardVisible(renderSettings, 'test_marks_entry') && (
            <QuickLinkCard onClick={() => navigate('/test-records')} $color="#8b5cf6">
              <CardHeader $color="#8b5cf6">
                <CardIcon $color="#8b5cf6">
                  <QuizIcon />
                </CardIcon>
                <CardTitle>Test Marks Entry</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  Create and manage test records, enter marks, and track student performance.
                </CardDescription>
                <CardAction $color="#8b5cf6">
                  Get Started
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          )}

          {isTeacherCardVisible(renderSettings, 'test_records') && (
            <QuickLinkCard onClick={() => navigate('/test-record-master-sheet')} $color="#06b6d4">
              <CardHeader $color="#06b6d4">
                <CardIcon $color="#06b6d4">
                  <AssessmentIcon />
                </CardIcon>
                <CardTitle>Test Records</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  View comprehensive test records and performance analysis for students.
                </CardDescription>
                <CardAction $color="#06b6d4">
                  Get Started
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          )}

          {(isTeacherCardVisible(renderSettings, 'test_marks_entry') || isTeacherCardVisible(renderSettings, 'test_records')) && <CardDivider />}

          {isTeacherCardVisible(renderSettings, 'my_timetable') && (
            <QuickLinkCard onClick={() => navigate('/my-timetable')} $color="#8b5cf6">
              <CardHeader $color="#8b5cf6">
                <CardIcon $color="#8b5cf6">
                  <ScheduleIcon />
                </CardIcon>
                <CardTitle>My Timetable</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  View your assigned periods, subjects, and classes for the current session.
                </CardDescription>
                <CardAction $color="#8b5cf6">
                  View Schedule
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          )}

          {isTeacherCardVisible(renderSettings, 'my_timetable') && <CardDivider />}

          {isTeacherCardVisible(renderSettings, 'assign_diary') && (
            <QuickLinkCard onClick={() => navigate('/homework-diary')} $color="#10b981">
              <CardHeader $color="#10b981">
                <CardIcon $color="#10b981">
                  <AssignmentIcon />
                </CardIcon>
                <CardTitle>Assign Diary</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  Assign daily homework diary entries for your classes and subjects.
                </CardDescription>
                <CardAction $color="#10b981">
                  Get Started
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          )}

          {isTeacherCardVisible(renderSettings, 'assign_diary') && <CardDivider />}

          {/* Examination Marks Entry Cards */}
          {isTeacherCardVisible(renderSettings, 'examination_marks_entry') && publishedExaminations.map((examination) => (
            <QuickLinkCard 
              key={examination.id} 
              onClick={() => navigate('/marks-entry', { state: { examinationId: examination.id } })}
              $color="#ef4444"
            >
              <CardHeader $color="#ef4444">
                <CardIcon $color="#ef4444">
                  <SchoolIcon />
                </CardIcon>
                <CardTitle>{examination.name}</CardTitle>
              </CardHeader>
              <CardBody>
                <CardDescription>
                  Enter marks for {examination.exam_type} - {examination.start_date ? new Date(examination.start_date).toLocaleDateString('en-GB') : 'TBD'}
                </CardDescription>
                <CardAction $color="#ef4444">
                  Get Started
                </CardAction>
              </CardBody>
            </QuickLinkCard>
          ))}
        </QuickLinksGrid>
      </Container>
    );
  }

  // For non-teacher roles, show widget-based landing page
  // Get display name safely - use type assertion to avoid TypeScript narrowing issues
  const studentInfoName = (studentInfo as { id: number; name: string; school_id: number; role: string } | null)?.name;
  const displayName = user?.name || studentInfoName || 'User';
  
  if (widgets.length === 0) {
    return (
      <Container>
        <WelcomeHeader>
          <Title>Welcome, {displayName}</Title>
          <Subtitle>No widgets configured for your role. Contact your administrator.</Subtitle>
        </WelcomeHeader>
      </Container>
    );
  }

  return (
    <Container>
      <WelcomeHeader>
        <Title>Welcome, {displayName}</Title>
        <Subtitle>Your personalized landing page</Subtitle>
      </WelcomeHeader>

      {/* Events Section */}
      {events.length > 0 && (
        <EventsSection>
          <EventsTitle>
            <EventIcon />
            Upcoming Events
          </EventsTitle>
          <EventsGrid>
            {events.map((event) => (
              <EventCard key={event.id} $eventType={event.event_type}>
                <EventHeader>
                  <EventTitle>{event.title}</EventTitle>
                  <EventTypeBadge $eventType={event.event_type}>
                    {event.event_type}
                  </EventTypeBadge>
                </EventHeader>
                <EventDescription>{event.description}</EventDescription>
                <EventDetails>
                  <EventDetailRow>
                    <CalendarIcon />
                    <span>
                      {formatEventDate(event.start_date)}
                      {event.start_date !== event.end_date && ` - ${formatEventDate(event.end_date)}`}
                    </span>
                  </EventDetailRow>
                  {!event.is_all_day && event.start_time && (
                    <EventDetailRow>
                      <AccessTimeIcon />
                      <span>
                        {formatEventTime(event.start_time)}
                        {event.end_time && ` - ${formatEventTime(event.end_time)}`}
                      </span>
                    </EventDetailRow>
                  )}
                  {event.location && (
                    <EventDetailRow>
                      <LocationIcon />
                      <span>{event.location}</span>
                    </EventDetailRow>
                  )}
                </EventDetails>
              </EventCard>
            ))}
          </EventsGrid>
        </EventsSection>
      )}

      <WidgetsGrid>
        {widgets.map((widget) => {
          const IconComponent = getIconComponent(widget.icon_name);
          const value = widgetData[widget.widget_key] ?? '—';

          return (
            <WidgetCard
              key={widget.id}
              $color={widget.color}
              onClick={() => handleWidgetClick(widget)}
            >
              <WidgetHeader $color={widget.color}>
                <WidgetIcon $color={widget.color}>
                  <IconComponent />
                </WidgetIcon>
                <WidgetTitle>{widget.widget_name}</WidgetTitle>
              </WidgetHeader>
              <WidgetBody>
                {widget.widget_type === 'stat' && (
                  <WidgetValue>{value}</WidgetValue>
                )}
                {widget.widget_type === 'link' && (
                  <WidgetDescription>
                    {widget.widget_config?.description || 'Click to navigate'}
                  </WidgetDescription>
                )}
                <WidgetAction $color={widget.color}>
                  {widget.widget_type === 'stat' ? 'View Details' : 'Open'}
                </WidgetAction>
              </WidgetBody>
            </WidgetCard>
          );
        })}
      </WidgetsGrid>
    </Container>
  );
};

export default CustomLandingPage;

