import React, { useState, useEffect, useContext, useCallback } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { WhatsApp as WhatsAppIcon, Send as SendIcon, Search as SearchIcon, Refresh as RefreshIcon, ContentCopy as CopyIcon } from '@mui/icons-material';
import WhatsAppBulkSender from '../components/WhatsAppBulkSender';
import { AttendanceNotificationData } from '../services/whatsappSemiAuto';
import { format } from 'date-fns';
import { useToast } from '../components/useToast';
import { getStudentDisplayId, matchesStudentSearch } from '../utils/studentUtils';

// Helper function to check if theme is dark
const isDark = (themeObj: any) => themeObj.BG === '#252525';

const Container = styled.div`
  width: 100%;
  height: 100%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 1rem;
  box-sizing: border-box;
  min-height: 0; /* Critical for flex children */
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Header = styled.div`
  background: ${({ theme }) => isDark(theme)
        ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
        : 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)'};
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 16px;
  padding: 1rem 1.5rem;
  border: ${({ theme }) => isDark(theme)
        ? '1px solid rgba(255, 255, 255, 0.05)'
        : '1px solid rgba(0, 0, 0, 0.05)'};
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: ${({ theme }) => isDark(theme)
        ? '0 0 40px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.4)'
        : '0 0 40px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.1)'};
`;

const HeaderTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  text-shadow: ${({ theme }) => isDark(theme)
        ? '0 2px 4px rgba(0, 0, 0, 0.5)'
        : 'none'};
`;

const StudentListFooter = styled.div`
  padding: 0.5rem 1rem;
  border-top: ${({ theme }) => isDark(theme)
        ? '1px solid rgba(255, 255, 255, 0.05)'
        : '1px solid rgba(0, 0, 0, 0.05)'};
  font-size: 0.7rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  background: ${({ theme }) => isDark(theme)
        ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
        : 'linear-gradient(0deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)'};
  backdrop-filter: blur(8px);
  opacity: 0.7;
  flex-shrink: 0;
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 1rem;
  flex: 1;
  min-height: 0;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const LeftSidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: calc(100vh - 160px);
  position: sticky;
  top: 1rem;

  @media (max-width: 900px) {
    height: auto;
    position: static;
  }
`;

const RightContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  min-width: 0;
`;

const Card = styled.div`
  background: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.03)'
        : 'rgba(255, 255, 255, 0.8)'};
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 16px;
  border: ${({ theme }) => isDark(theme)
        ? '1px solid rgba(255, 255, 255, 0.05)'
        : '1px solid rgba(0, 0, 0, 0.05)'};
  padding: 1rem;
  box-shadow: ${({ theme }) => isDark(theme)
        ? '0 4px 20px rgba(0, 0, 0, 0.3)'
        : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  display: flex;
  flex-direction: column;
  transition: background-color 0.2s ease;
`;

const SelectionCard = styled(Card)`
  gap: 1rem;
  flex-shrink: 0;
`;

const SearchCard = styled(Card)`
  padding: 0.75rem;
  flex-shrink: 0;
`;

const StudentListCard = styled(Card)`
  height: 500px;
  max-height: calc(100vh - 400px);
  min-height: 300px;
  overflow: hidden;
  padding: 0;
  display: flex;
  flex-direction: column;
`;

const StudentListHeader = styled.div`
  padding: 0.75rem 1rem;
  border-bottom: ${({ theme }) => isDark(theme)
        ? '1px solid rgba(255, 255, 255, 0.05)'
        : '1px solid rgba(0, 0, 0, 0.05)'};
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.9rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${({ theme }) => isDark(theme)
        ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
        : 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)'};
  backdrop-filter: blur(8px);
`;

const StudentListContent = styled.div`
  overflow-y: auto;
  flex: 1;
  padding: 0.5rem;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.2) transparent'
        : 'rgba(0, 0, 0, 0.2) transparent'};

  &::-webkit-scrollbar {
    width: 8px;
    background-color: transparent;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 4px;
    margin: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.2)'
        : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 4px;
    border: ${({ theme }) => `2px solid ${theme.CARD}`};
    
    &:hover {
      background-color: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.3)'
        : 'rgba(0, 0, 0, 0.3)'};
    }
  }
`;

const StudentItem = styled.div<{ selected?: boolean }>`
  padding: 0.6rem 0.8rem;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
  background: ${({ theme, selected }) => selected
        ? (isDark(theme) ? 'rgba(255, 255, 255, 0.08)' : `${theme.ACCENT}15`)
        : 'transparent'};
  border-left: ${({ theme, selected }) => selected
        ? `3px solid ${theme.ACCENT}`
        : '3px solid transparent'};

  &:hover {
    background: ${({ theme, selected }) => selected
        ? (isDark(theme) ? 'rgba(255, 255, 255, 0.12)' : `${theme.ACCENT}20`)
        : (isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)')};
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const StudentInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
`;

const StudentName = styled.div`
  font-weight: 600;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: ${({ theme }) => theme.ACCENT};
`;

const StudentDetail = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const MessageSection = styled.div`
  display: flex;
  gap: 1rem;
  height: 250px;

  @media (max-width: 700px) {
    flex-direction: column;
    height: auto;
  }
`;

const MessageInputCard = styled(Card)`
  flex: 1;
  padding: 0;
  overflow: hidden;
`;

const SendButtonCard = styled(Card)`
  width: 120px;
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
  
  @media (max-width: 700px) {
    width: 100%;
    height: 60px;
  }
`;

const StyledTextArea = styled.textarea`
  width: 100%;
  height: 100%;
  padding: 1.5rem;
  border: none;
  background: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.03)'
        : 'rgba(255, 255, 255, 0.8)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  resize: none;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
  transition: background-color 0.2s ease;

  &:focus {
    background: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(255, 255, 255, 0.9)'};
  }

  &::placeholder {
    color: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.3)'
        : 'rgba(0, 0, 0, 0.3)'};
    opacity: 1;
  }
`;

const SendButton = styled.button`
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.ACCENT};
  color: ${({ theme }) => theme.BG};
  border: none;
  border-radius: 16px;
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  box-shadow: ${({ theme }) => isDark(theme)
        ? '0 4px 20px rgba(0, 0, 0, 0.3)'
        : '0 4px 20px rgba(0, 0, 0, 0.1)'};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.ACCENT_DARK || theme.ACCENT};
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => isDark(theme)
        ? '0 6px 24px rgba(0, 0, 0, 0.4)'
        : '0 6px 24px rgba(0, 0, 0, 0.15)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const HistorySection = styled(Card)`
  height: 260px;
  max-height: 240px;
  min-height: 240px;
  overflow: hidden;
  padding: 0;
  display: flex;
  flex-direction: column;
`;

const HistoryHeader = styled.div`
  padding: 0.5rem 0.75rem;
  border-bottom: ${({ theme }) => isDark(theme)
        ? '1px solid rgba(255, 255, 255, 0.05)'
        : '1px solid rgba(0, 0, 0, 0.05)'};
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  background: ${({ theme }) => isDark(theme)
        ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
        : 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)'};
  backdrop-filter: blur(8px);
  
  @media (max-width: 700px) {
    flex-wrap: wrap;
    padding: 0.4rem 0.5rem;
  }
`;

const HistoryTitle = styled.h3`
  margin: 0;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 700;
`;

const HistoryList = styled.div`
  overflow-y: auto;
  padding: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.2) transparent'
        : 'rgba(0, 0, 0, 0.2) transparent'};

  &::-webkit-scrollbar {
    width: 8px;
    background-color: transparent;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 4px;
    margin: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.2)'
        : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 4px;
    border: ${({ theme }) => `2px solid ${theme.CARD}`};
    
    &:hover {
      background-color: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.3)'
        : 'rgba(0, 0, 0, 0.3)'};
    }
  }
`;

const HistoryItem = styled.div`
  background: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.03)'
        : 'rgba(255, 255, 255, 0.8)'};
  border: ${({ theme }) => isDark(theme)
        ? '1px solid rgba(255, 255, 255, 0.05)'
        : '1px solid rgba(0, 0, 0, 0.05)'};
  border-radius: 12px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);

  &:hover {
    border-color: ${({ theme }) => theme.ACCENT};
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => isDark(theme)
        ? '0 4px 20px rgba(0, 0, 0, 0.3)'
        : '0 4px 20px rgba(0, 0, 0, 0.1)'};
    background: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(255, 255, 255, 0.9)'};
  }
`;

const HistoryMeta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-bottom: 0.5rem;
`;

const HistoryMessage = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const StyledSelect = styled.select`
  width: 100%;
  padding: 12px 14px;
  padding-right: 40px;
  border-radius: 8px;
  border: ${({ theme }) => isDark(theme)
        ? '1px solid rgba(255, 255, 255, 0.05)'
        : '1px solid rgba(0, 0, 0, 0.05)'};
  background: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.03)'
        : 'rgba(255, 255, 255, 0.8)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s ease;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  backdrop-filter: blur(8px);

  /* Custom dropdown arrow */
  background-image: ${({ theme }) => isDark(theme)
        ? `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23e0e0e0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`
        : `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231a1a1a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`};
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;

  &:hover, &:focus {
    background: ${({ theme }) => isDark(theme)
        ? `rgba(255, 255, 255, 0.05) url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23e0e0e0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e") no-repeat right 12px center / 16px`
        : `rgba(255, 255, 255, 0.9) url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231a1a1a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e") no-repeat right 12px center / 16px`};
    border-color: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(0, 0, 0, 0.1)'};
  }

  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}26;
  }

  /* Style the dropdown options */
  option {
    background: ${({ theme }) => isDark(theme)
        ? theme.CARD || 'rgba(255, 255, 255, 0.05)'
        : theme.CARD || '#ffffff'};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
    padding: 8px 12px;
    border: none;
  }

  /* Style selected option */
  option:checked {
    background: ${({ theme }) => theme.ACCENT};
    color: ${({ theme }) => theme.BG};
  }
`;

const SearchInput = styled.input`
  width: 100%;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  outline: none;
  padding: 0.2rem;

  &::placeholder {
    color: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.3)'
        : 'rgba(0, 0, 0, 0.3)'};
    opacity: 1;
  }
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.03)'
        : 'rgba(255, 255, 255, 0.8)'};
  border: none;
  border-radius: 8px;
  padding: 0.5rem 0.8rem;
  transition: background-color 0.2s ease;

  &:focus-within {
    background: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(255, 255, 255, 0.9)'};
  }
`;

const VariablesBar = styled.div`
  padding: 0.5rem 1.5rem;
  background: ${({ theme }) => isDark(theme)
        ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
        : 'linear-gradient(0deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)'};
  border-top: ${({ theme }) => isDark(theme)
        ? '1px solid rgba(255, 255, 255, 0.05)'
        : '1px solid rgba(0, 0, 0, 0.05)'};
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
`;

const VariableTag = styled.button`
  background: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(255, 255, 255, 0.9)'};
  border: ${({ theme }) => isDark(theme)
        ? '1px solid rgba(255, 255, 255, 0.1)'
        : '1px solid rgba(0, 0, 0, 0.1)'};
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-family: monospace;
  cursor: pointer;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${({ theme }) => theme.ACCENT};
    color: ${({ theme }) => theme.ACCENT};
    background: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.08)'
        : `${theme.ACCENT}10`};
  }
`;

const IconButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(0, 0, 0, 0.05)'};
    color: ${({ theme }) => theme.ACCENT};
  }
`;

const ActionButton = styled.button`
  background: transparent;
  border: ${({ theme }) => isDark(theme)
        ? '1px solid rgba(255, 255, 255, 0.1)'
        : '1px solid rgba(0, 0, 0, 0.1)'};
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(0, 0, 0, 0.05)'};
    border-color: ${({ theme }) => theme.ACCENT};
    color: ${({ theme }) => theme.ACCENT};
  }
`;

const LoadingText = styled.div`
  padding: 1rem;
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const VariablesLabel = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-right: auto;
`;

const GeneralMessagePage: React.FC = () => {
    const { theme: themeMode } = useContext(ThemeContext);
    const theme = themeMode === 'dark' ? darkTheme : lightTheme;
    const { user } = useAuth();
    const { showToast } = useToast();

    const [targetType, setTargetType] = useState<'all' | 'class' | 'staff'>('all');
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedClassHasSections, setSelectedClassHasSections] = useState<boolean>(false);
    const [sections, setSections] = useState<any[]>([]);
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [students, setStudents] = useState<any[]>([]);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [notificationData, setNotificationData] = useState<AttendanceNotificationData[]>([]);
    const [schoolName, setSchoolName] = useState('');
    const [schoolWebsite, setSchoolWebsite] = useState('');
    const [history, setHistory] = useState<any[]>([]);
    const [refreshHistory, setRefreshHistory] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    // Filter students when search term changes
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredStudents(students);
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            const filtered = students.filter(s => {
                const nameMatch = s.name.toLowerCase().includes(lowerTerm);
                const fatherMatch = s.father_name && s.father_name.toLowerCase().includes(lowerTerm);
                const classMatch = s.class_name && s.class_name.toLowerCase().includes(lowerTerm);
                const idMatch = matchesStudentSearch(s, searchTerm);
                return nameMatch || fatherMatch || classMatch || idMatch.matches;
            });
            setFilteredStudents(filtered);
        }
    }, [searchTerm, students]);

    // Fetch students based on selection
    useEffect(() => {
        if (!user?.school_id) return;

        const fetchTargetStudents = async () => {
            setLoading(true);
            try {
                // First, fetch the active session
                const { data: sessionData } = await supabase
                    .from('sessions')
                    .select('id')
                    .eq('school_id', user.school_id)
                    .eq('is_active', true)
                    .single();

                if (!sessionData) {
                    showToast('No active session found', 'error');
                    setStudents([]);
                    setLoading(false);
                    return;
                }

                const activeSessionId = sessionData.id;
                let targetStudents: any[] = [];

                if (targetType === 'class') {
                    if (!selectedClass) {
                        setStudents([]);
                        setLoading(false);
                        return;
                    }

                    // Fetch students from student_class_history for the active session and selected class
                    let schQuery = supabase
                        .from('student_class_history')
                        .select('student_id')
                        .eq('session_id', activeSessionId)
                        .eq('new_class_id', selectedClass)
                        .eq('school_id', user.school_id);

                    if (selectedSection) {
                        schQuery = schQuery.eq('new_section_id', selectedSection);
                    }

                    const { data: schData } = await schQuery;

                    if (!schData || schData.length === 0) {
                        setStudents([]);
                        setLoading(false);
                        return;
                    }

                    // Get student IDs from student_class_history
                    const studentIds = schData.map(sch => sch.student_id);

                    // Fetch full student details (excluding withdrawn)
                    const { data: studentsData } = await supabase
                        .from('students')
                        .select('id, name, father_name, phone, notification_channel, roll_number, password')
                        .eq('school_id', user.school_id)
                        .neq('status', 'withdrawn')
                        .in('id', studentIds);

                    if (!studentsData) {
                        setStudents([]);
                        setLoading(false);
                        return;
                    }

                    // Get class/section names
                    const { data: classData } = await supabase
                        .from('classes')
                        .select('name')
                        .eq('id', selectedClass)
                        .single();

                    let sectionName: string | null = null;
                    if (selectedSection) {
                        const { data: sectionData } = await supabase
                            .from('sections')
                            .select('name')
                            .eq('id', selectedSection)
                            .single();
                        sectionName = sectionData?.name;
                    }

                    // Filter out students without phone numbers and map to student structure
                    targetStudents = studentsData
                        .filter((s: any) => s.phone != null && s.phone !== '' && s.phone.trim() !== '')
                        .map((s: any) => ({
                            ...s,
                            class_name: classData?.name,
                            section_name: sectionName
                        }));

                } else if (targetType === 'all') {
                    // Fetch all students from student_class_history for the active session
                    const { data: schData } = await supabase
                        .from('student_class_history')
                        .select(`
                            student_id,
                            new_class_id,
                            new_section_id,
                            new_classes:new_class_id(name),
                            new_sections:new_section_id(name)
                        `)
                        .eq('session_id', activeSessionId)
                        .eq('school_id', user.school_id)
                        .order('id', { ascending: true });

                    if (!schData || schData.length === 0) {
                        setStudents([]);
                        setLoading(false);
                        return;
                    }

                    // Group by student_id to get the latest record for each student
                    const studentHistoryMap = new Map();
                    schData.forEach((h: any) => {
                        if (!studentHistoryMap.has(h.student_id)) {
                            studentHistoryMap.set(h.student_id, []);
                        }
                        studentHistoryMap.get(h.student_id).push(h);
                    });

                    // Get the latest record for each student
                    const latestRecords = new Map();
                    studentHistoryMap.forEach((records: any[], studentId: number) => {
                        const latest = records[records.length - 1];
                        latestRecords.set(studentId, {
                            class_name: latest.new_classes?.name,
                            section_name: latest.new_sections?.name
                        });
                    });

                    // Get unique student IDs
                    const studentIds = Array.from(latestRecords.keys());

                    // Fetch full student details (excluding withdrawn)
                    const { data: studentsData } = await supabase
                        .from('students')
                        .select('id, name, father_name, phone, notification_channel, roll_number, password')
                        .eq('school_id', user.school_id)
                        .neq('status', 'withdrawn')
                        .in('id', studentIds);

                    if (!studentsData) {
                        setStudents([]);
                        setLoading(false);
                        return;
                    }

                    // Filter out students without phone numbers and combine with class info
                    targetStudents = studentsData
                        .filter((s: any) => s.phone != null && s.phone !== '' && s.phone.trim() !== '')
                        .map((s: any) => ({
                            ...s,
                            ...latestRecords.get(s.id)
                        }));
                } else if (targetType === 'staff') {
                    // Fetch all staff members (handle pagination for large datasets)
                    const BATCH_SIZE = 1000;
                    const allStaff: any[] = [];
                    let from = 0;
                    let hasMore = true;

                    while (hasMore) {
                        const { data: staffData, error: staffError } = await supabase
                            .from('staff')
                            .select('id, name, mobile, notification_channel, role')
                            .eq('school_id', user.school_id)
                            .order('name', { ascending: true })
                            .range(from, from + BATCH_SIZE - 1);

                        if (staffError) {
                            console.error('Error fetching staff:', staffError);
                            showToast(`Error fetching staff: ${staffError.message}`, 'error');
                            break;
                        }

                        if (staffData && staffData.length > 0) {
                            allStaff.push(...staffData);
                            from += BATCH_SIZE;
                            hasMore = staffData.length === BATCH_SIZE;
                        } else {
                            hasMore = false;
                        }
                    }

                    if (allStaff.length === 0) {
                        setStudents([]);
                        setLoading(false);
                        return;
                    }

                    // Filter out staff without mobile numbers and map to student-like structure
                    targetStudents = allStaff
                        .filter((s: any) => s.mobile != null && s.mobile !== '' && s.mobile.trim() !== '')
                        .map((s: any) => ({
                            id: s.id,
                            name: s.name,
                            phone: s.mobile,
                            notification_channel: (s.notification_channel as 'whatsapp' | 'sms') || 'whatsapp',
                            class_name: 'Staff',
                            section_name: null,
                            father_name: null,
                            roll_number: '',
                            password: '',
                            role: s.role || ''
                        }));
                }

                setStudents(targetStudents);
                setSelectedStudentIds(new Set(targetStudents.map(s => s.id)));
            } catch (error: any) {
                console.error('Error in fetchTargetStudents:', error);
                showToast(`Error loading ${targetType === 'staff' ? 'staff' : 'students'}: ${error?.message || 'Unknown error'}`, 'error');
                setStudents([]);
            } finally {
                setLoading(false);
            }
        };

        fetchTargetStudents();
    }, [targetType, selectedClass, selectedSection, user?.school_id, classes]);

    // Fetch sections when class changes and update has_sections state
    useEffect(() => {
        if (targetType === 'class' && selectedClass && user?.school_id) {
            const selectedClassData = classes.find(c => c.id === parseInt(selectedClass));
            const hasSections = selectedClassData?.has_sections ?? true;
            setSelectedClassHasSections(hasSections);
            
            if (hasSections) {
                fetchSections(selectedClass);
            } else {
                setSections([]);
                setSelectedSection('');
            }
        } else {
            setSections([]);
            setSelectedSection('');
            setSelectedClassHasSections(false);
        }
    }, [targetType, selectedClass, user?.school_id, classes]);

    const fetchSchoolProfile = async () => {
        if (!user?.school_id) return;
        try {
            const { data } = await supabase
                .from('institute_profile')
                .select('name, short_name, website')
                .eq('school_id', user.school_id)
                .single();

            if (data) {
                setSchoolName(data.short_name || data.name);
                setSchoolWebsite(data.website || '');
            }
        } catch (error) {
        }
    };

    const fetchClasses = async () => {
        if (!user?.school_id) return;
        try {
            const { data } = await supabase
                .from('classes')
                .select('id, name, has_sections')
                .eq('school_id', user.school_id)
                .order('name');

            if (data) {
                setClasses(data);
            }
        } catch (error) {
        }
    };

    const fetchSections = async (classId: string) => {
        if (!user?.school_id) return;
        try {
            const { data } = await supabase
                .from('sections')
                .select('id, name')
                .eq('school_id', user.school_id)
                .eq('class_id', classId)
                .order('name');

            if (data) {
                setSections(data);
            }
        } catch (error) {
        }
    };

    const fetchHistory = useCallback(async () => {
        if (!user?.school_id) return;
        try {
            const BATCH_SIZE = 1000; // Supabase limit per query
            const allResults: any[] = [];
            let from = 0;
            let hasMore = true;

            // Fetch all rows in batches to handle Supabase's 1000 row limit
            while (hasMore) {
                let query = supabase
                    .from('notification_logs')
                    .select('*')
                    .eq('school_id', user.school_id);
                
                // Filter by category if not "All"
                if (selectedCategory !== 'All') {
                    query = query.eq('msg_type', selectedCategory);
                }
                
                const { data, error } = await query
                    .order('created_at', { ascending: false })
                    .range(from, from + BATCH_SIZE - 1);

                if (error) {
                    console.error('Error fetching history:', error);
                    break;
                }

                if (data && data.length > 0) {
                    allResults.push(...data);
                    from += BATCH_SIZE;
                    // If we got less than BATCH_SIZE, we've reached the end
                    hasMore = data.length === BATCH_SIZE;
                } else {
                    hasMore = false;
                }
            }

            if (allResults.length > 0) {
                // Group by message content and date, keeping the most recent one for each unique message
                const messageMap = new Map<string, any>();
                
                allResults.forEach((item) => {
                    const key = `${item.message}_${item.notification_date}`;
                    const existing = messageMap.get(key);
                    
                    // Keep the most recent entry for each unique message+date combination
                    if (!existing || new Date(item.created_at) > new Date(existing.created_at)) {
                        messageMap.set(key, item);
                    }
                });
                
                // Convert map to array and sort by created_at descending
                const uniqueHistory = Array.from(messageMap.values())
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 20); // Limit to 20 most recent unique messages for display
                
                setHistory(uniqueHistory);
            } else {
                setHistory([]);
            }
        } catch (error) {
            console.error('Error fetching message history:', error);
            setHistory([]);
        }
    }, [user?.school_id, selectedCategory]);

    // Initial fetch
    useEffect(() => {
        if (user?.school_id) {
            fetchClasses();
            fetchSchoolProfile();
        }
    }, [user?.school_id]);

    // Fetch history when category changes or refresh is triggered
    useEffect(() => {
        if (user?.school_id) {
            fetchHistory();
        }
    }, [user?.school_id, refreshHistory, selectedCategory, fetchHistory]);

    const handleSend = async () => {
        if (!message.trim()) {
            showToast('Please enter a message', 'error');
            return;
        }

        if (selectedStudentIds.size === 0) {
            showToast(`No ${targetType === 'staff' ? 'staff' : 'students'} selected to send message to`, 'error');
            return;
        }

        const selectedStudents = filteredStudents.filter(s => selectedStudentIds.has(s.id));

        const formattedData: AttendanceNotificationData[] = selectedStudents
            .filter(s => s.phone)
            .map((s: any) => ({
                student_id: s.id,
                student_name: s.name,
                father_name: s.father_name,
                class_name: s.class_name || '',
                section_name: s.section_name,
                date: new Date().toISOString().split('T')[0],
                status: 'General',
                student_phone: s.phone,
                school_short_name: schoolName,
                school_website: schoolWebsite,
                notification_channel: (s.notification_channel as 'whatsapp' | 'sms') || 'whatsapp',
                roll_number: s.roll_number || '',
                password: s.password || '',
                role: s.role || '',
                mobile: s.phone || ''
            }));

        if (formattedData.length === 0) {
            showToast(`No ${targetType === 'staff' ? 'staff' : 'students'} with phone numbers found in selection`, 'error');
            return;
        }

        setNotificationData(formattedData);
        setSending(true);
    };

    const insertVariable = (variable: string) => {
        setMessage(prev => prev + variable);
    };

    const handleRepeatMessage = (msg: string) => {
        setMessage(msg);
    };

    const handleCloseSender = () => {
        setSending(false);
        setRefreshHistory(prev => prev + 1);
    };

    const toggleStudentSelection = (studentId: number) => {
        setSelectedStudentIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(studentId)) {
                newSet.delete(studentId);
            } else {
                newSet.add(studentId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
    };

    const handleDeselectAll = () => {
        setSelectedStudentIds(new Set());
    };

    return (
        <Container theme={theme}>
            <Header theme={theme}>
                <HeaderTitle theme={theme}>
                    <WhatsAppIcon style={{ fontSize: 28, color: '#25d366' }} />
                    General Message Sender
                </HeaderTitle>
            </Header>

            <MainGrid>
                <LeftSidebar>
                    <SelectionCard theme={theme}>
                        <FormGroup>
                            <Label theme={theme}>Send To</Label>
                            <StyledSelect
                                theme={theme}
                                value={targetType}
                                onChange={(e) => setTargetType(e.target.value as any)}
                            >
                                <option value="all">All Students</option>
                                <option value="class">Class Wise</option>
                                <option value="staff">All Staff</option>
                            </StyledSelect>
                        </FormGroup>

                        {targetType === 'class' && (
                            <>
                                <FormGroup>
                                    <Label>Select Class</Label>
                                    <StyledSelect
                                        theme={theme}
                                        value={selectedClass}
                                        onChange={(e) => setSelectedClass(e.target.value)}
                                    >
                                        <option value="">Select Class...</option>
                                        {classes.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </StyledSelect>
                                </FormGroup>
                                {selectedClass && selectedClassHasSections && (
                                    <FormGroup>
                                        <Label>Select Section</Label>
                                        <StyledSelect
                                            theme={theme}
                                            value={selectedSection}
                                            onChange={(e) => setSelectedSection(e.target.value)}
                                        >
                                            <option value="">All Sections</option>
                                            {sections.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </StyledSelect>
                                    </FormGroup>
                                )}
                            </>
                        )}
                    </SelectionCard>

                    <SearchCard theme={theme}>
                        <SearchContainer theme={theme}>
                            <SearchIcon style={{ fontSize: 20, color: theme.TEXT_SECONDARY }} />
                            <SearchInput
                                theme={theme}
                                placeholder={targetType === 'staff' ? 'Search staff...' : 'Search students...'}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </SearchContainer>
                    </SearchCard>

                    <StudentListCard theme={theme}>
                        <StudentListHeader theme={theme}>
                            <span>{targetType === 'staff' ? 'Staff' : 'Students'} ({selectedStudentIds.size}/{filteredStudents.length})</span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <ActionButton theme={theme} onClick={handleSelectAll}>
                                    All
                                </ActionButton>
                                <ActionButton theme={theme} onClick={handleDeselectAll}>
                                    None
                                </ActionButton>
                            </div>
                        </StudentListHeader>
                        <StudentListContent theme={theme}>
                            {loading ? (
                                <LoadingText theme={theme}>Loading...</LoadingText>
                            ) : filteredStudents.length > 0 ? (
                                filteredStudents.map(student => (
                                    <StudentItem
                                        key={student.id}
                                        theme={theme}
                                        selected={selectedStudentIds.has(student.id)}
                                        onClick={() => toggleStudentSelection(student.id)}
                                    >
                                        {/* Checkbox hidden as requested */}
                                        <StudentInfo>
                                            <div style={{ fontSize: '0.85rem', color: theme.TEXT_PRIMARY, lineHeight: '1.4' }}>
                                                <span style={{ opacity: 0.7 }}>{getStudentDisplayId(student)}</span> . <strong>{student.name}</strong> . {student.father_name} . {student.class_name} {student.section_name ? `(${student.section_name})` : ''}
                                            </div>
                                        </StudentInfo>
                                    </StudentItem>
                                ))
                            ) : (
                                <LoadingText theme={theme}>
                                    {targetType === 'staff' ? 'No staff found' : 'No students found'}
                                </LoadingText>
                            )}
                        </StudentListContent>
                        <StudentListFooter theme={theme}>
                            * Only {targetType === 'staff' ? 'staff' : 'students'} with mobile numbers shall be listed
                        </StudentListFooter>
                    </StudentListCard>
                </LeftSidebar>

                <RightContent>
                    <MessageSection>
                        <MessageInputCard theme={theme}>
                            <StyledTextArea
                                theme={theme}
                                placeholder="Type your message here..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                            <VariablesBar theme={theme}>
                                <VariablesLabel theme={theme}>Variables:</VariablesLabel>
                                {targetType === 'staff' ? (
                                    <>
                                        <VariableTag theme={theme} onClick={() => insertVariable('{staff_name}')}>Staff Name</VariableTag>
                                        <VariableTag theme={theme} onClick={() => insertVariable('{role}')}>Role</VariableTag>
                                        <VariableTag theme={theme} onClick={() => insertVariable('{mobile}')}>Mobile</VariableTag>
                                        <VariableTag theme={theme} onClick={() => insertVariable('{password}')}>Password</VariableTag>
                                        <VariableTag theme={theme} onClick={() => insertVariable('{school_name}')}>School</VariableTag>
                                        <VariableTag theme={theme} onClick={() => insertVariable('{school_website}')}>School Website</VariableTag>
                                    </>
                                ) : (
                                    <>
                                        <VariableTag theme={theme} onClick={() => insertVariable('{student_name}')}>Student Name</VariableTag>
                                        <VariableTag theme={theme} onClick={() => insertVariable('{father_name}')}>Father Name</VariableTag>
                                        <VariableTag theme={theme} onClick={() => insertVariable('{roll_number}')}>Roll Number</VariableTag>
                                        <VariableTag theme={theme} onClick={() => insertVariable('{password}')}>Password</VariableTag>
                                        <VariableTag theme={theme} onClick={() => insertVariable('{class_name}')}>Class</VariableTag>
                                        <VariableTag theme={theme} onClick={() => insertVariable('{school_name}')}>School</VariableTag>
                                        <VariableTag theme={theme} onClick={() => insertVariable('{school_website}')}>School Website</VariableTag>
                                    </>
                                )}
                            </VariablesBar>
                        </MessageInputCard>
                        <SendButtonCard theme={theme}>
                            <SendButton theme={theme} onClick={handleSend} disabled={loading || selectedStudentIds.size === 0}>
                                <SendIcon style={{ fontSize: 28 }} />
                                Send
                            </SendButton>
                        </SendButtonCard>
                    </MessageSection>

                    <HistorySection theme={theme}>
                        <HistoryHeader theme={theme}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                <HistoryTitle theme={theme}>Message History</HistoryTitle>
                                <StyledSelect
                                    theme={theme}
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    style={{ 
                                        width: 'auto', 
                                        minWidth: '100px',
                                        padding: '4px 8px',
                                        fontSize: '0.75rem'
                                    }}
                                >
                                    <option value="All">All Categories</option>
                                    <option value="General">General</option>
                                    <option value="Attendance">Attendance</option>
                                    <option value="Fee">Fee</option>
                                    <option value="Report">Report</option>
                                </StyledSelect>
                            </div>
                            <IconButton theme={theme} onClick={() => setRefreshHistory(prev => prev + 1)} style={{ padding: '4px' }}>
                                <RefreshIcon style={{ fontSize: '16px' }} />
                            </IconButton>
                        </HistoryHeader>
                        <HistoryList theme={theme}>
                            {history.map((item, index) => (
                                <HistoryItem key={index} theme={theme} onClick={() => handleRepeatMessage(item.message)}>
                                    <HistoryMeta theme={theme}>
                                        <span>{format(new Date(item.notification_date), 'dd MMM yyyy')}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: theme.TEXT_SECONDARY }}>
                                            <CopyIcon style={{ fontSize: 14, color: theme.TEXT_SECONDARY }} /> Reuse
                                        </span>
                                    </HistoryMeta>
                                    <HistoryMessage theme={theme}>
                                        {item.message}
                                    </HistoryMessage>
                                </HistoryItem>
                            ))}
                        </HistoryList>
                    </HistorySection>
                </RightContent>
            </MainGrid>

            {sending && (
                <WhatsAppBulkSender
                    notificationData={notificationData}
                    schoolName={schoolName}
                    selectedDate={new Date().toISOString().split('T')[0]}
                    onClose={handleCloseSender}
                    mode="general"
                    defaultMessage={message}
                />
            )}
        </Container>
    );
};

export default GeneralMessagePage;
