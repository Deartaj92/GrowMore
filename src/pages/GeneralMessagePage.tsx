import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { WhatsApp as WhatsAppIcon, Send as SendIcon, Search as SearchIcon, Refresh as RefreshIcon, ContentCopy as CopyIcon } from '@mui/icons-material';
import WhatsAppBulkSender from '../components/WhatsAppBulkSender';
import { AttendanceNotificationData } from '../services/whatsappSemiAuto';
import { format } from 'date-fns';
import { useToast } from '../components/useToast';

// Helper function to check if theme is dark
const isDark = (themeObj: any) => themeObj.BG === '#252525';

const Container = styled.div`
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 1rem;
  box-sizing: border-box;
  min-height: 100vh;
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
  border-bottom: ${({ theme }) => isDark(theme)
        ? '1px solid rgba(255, 255, 255, 0.05)'
        : '1px solid rgba(0, 0, 0, 0.05)'};
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
    border-bottom: none;
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
  height: 300px;
  max-height: 300px;
  min-height: 250px;
  overflow: hidden;
  padding: 0;
  display: flex;
  flex-direction: column;
`;

const HistoryHeader = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: ${({ theme }) => isDark(theme)
        ? '1px solid rgba(255, 255, 255, 0.05)'
        : '1px solid rgba(0, 0, 0, 0.05)'};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${({ theme }) => isDark(theme)
        ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
        : 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)'};
  backdrop-filter: blur(8px);
`;

const HistoryTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 1px;
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
  border-radius: 8px;
  border: none;
  background: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.03)'
        : 'rgba(255, 255, 255, 0.8)'};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  outline: none;
  transition: background-color 0.2s ease;

  &:hover, &:focus {
    background: ${({ theme }) => isDark(theme)
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(255, 255, 255, 0.9)'};
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

const GeneralMessagePage: React.FC = () => {
    const { theme: themeMode } = useContext(ThemeContext);
    const theme = themeMode === 'dark' ? darkTheme : lightTheme;
    const { user } = useAuth();
    const { showToast } = useToast();

    const [targetType, setTargetType] = useState<'all' | 'class' | 'student'>('all');
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [sections, setSections] = useState<any[]>([]);
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [students, setStudents] = useState<any[]>([]);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [notificationData, setNotificationData] = useState<AttendanceNotificationData[]>([]);
    const [schoolName, setSchoolName] = useState('');
    const [history, setHistory] = useState<any[]>([]);
    const [refreshHistory, setRefreshHistory] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());

    // Filter students when search term changes
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredStudents(students);
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            const filtered = students.filter(s =>
                s.name.toLowerCase().includes(lowerTerm) ||
                (s.father_name && s.father_name.toLowerCase().includes(lowerTerm)) ||
                (s.class_name && s.class_name.toLowerCase().includes(lowerTerm))
            );
            setFilteredStudents(filtered);
        }
    }, [searchTerm, students]);

    // Initial fetch
    useEffect(() => {
        if (user?.school_id) {
            fetchClasses();
            fetchSchoolProfile();
            fetchHistory();
        }
    }, [user?.school_id, refreshHistory]);

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
                        .select('id, name, father_name, phone, notification_channel')
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

                    targetStudents = studentsData.map((s: any) => ({
                        ...s,
                        class_name: classData?.name,
                        section_name: sectionName
                    }));

                } else if (targetType === 'all' || targetType === 'student') {
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
                        .select('id, name, father_name, phone, notification_channel')
                        .eq('school_id', user.school_id)
                        .neq('status', 'withdrawn')
                        .in('id', studentIds);

                    if (!studentsData) {
                        setStudents([]);
                        setLoading(false);
                        return;
                    }

                    // Combine student data with class info
                    targetStudents = studentsData.map((s: any) => ({
                        ...s,
                        ...latestRecords.get(s.id)
                    }));
                }

                setStudents(targetStudents);
                setSelectedStudentIds(new Set(targetStudents.map(s => s.id)));
            } catch (error) {
                console.error('Error fetching students:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTargetStudents();
    }, [targetType, selectedClass, selectedSection, user?.school_id]);

    // Fetch sections when class changes
    useEffect(() => {
        if (targetType === 'class' && selectedClass && user?.school_id) {
            fetchSections(selectedClass);
        } else {
            setSections([]);
            setSelectedSection('');
        }
    }, [targetType, selectedClass, user?.school_id]);

    const fetchSchoolProfile = async () => {
        if (!user?.school_id) return;
        try {
            const { data } = await supabase
                .from('institute_profile')
                .select('name, short_name')
                .eq('school_id', user.school_id)
                .single();

            if (data) {
                setSchoolName(data.short_name || data.name);
            }
        } catch (error) {
            console.error('Error fetching school profile:', error);
        }
    };

    const fetchClasses = async () => {
        if (!user?.school_id) return;
        try {
            const { data } = await supabase
                .from('classes')
                .select('id, name')
                .eq('school_id', user.school_id)
                .order('name');

            if (data) {
                setClasses(data);
            }
        } catch (error) {
            console.error('Error fetching classes:', error);
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
            console.error('Error fetching sections:', error);
        }
    };

    const fetchHistory = async () => {
        if (!user?.school_id) return;
        try {
            const { data } = await supabase
                .from('notification_logs')
                .select('*')
                .eq('school_id', user.school_id)
                .eq('msg_type', 'General')
                .order('created_at', { ascending: false })
                .limit(20);

            if (data) {
                const uniqueHistory = data.reduce((acc: any[], curr) => {
                    const exists = acc.find(item => item.message === curr.message && item.notification_date === curr.notification_date);
                    if (!exists) {
                        acc.push(curr);
                    }
                    return acc;
                }, []);
                setHistory(uniqueHistory);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    const handleSend = async () => {
        if (!message.trim()) {
            showToast('Please enter a message', 'error');
            return;
        }

        if (selectedStudentIds.size === 0) {
            showToast('No students selected to send message to', 'error');
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
                notification_channel: (s.notification_channel as 'whatsapp' | 'sms') || 'whatsapp'
            }));

        if (formattedData.length === 0) {
            showToast('No students with phone numbers found in selection', 'error');
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
                                <option value="student">Single Student</option>
                            </StyledSelect>
                        </FormGroup>

                        {targetType === 'class' && (
                            <>
                                <FormGroup>
                                    <Label theme={theme}>Select Class</Label>
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
                                {selectedClass && (
                                    <FormGroup>
                                        <Label theme={theme}>Select Section</Label>
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
                            <SearchIcon style={{ fontSize: 20, color: '#666' }} />
                            <SearchInput
                                theme={theme}
                                placeholder="Search students..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </SearchContainer>
                    </SearchCard>

                    <StudentListCard theme={theme}>
                        <StudentListHeader theme={theme}>
                            <span>Students ({selectedStudentIds.size}/{filteredStudents.length})</span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={handleSelectAll}
                                    style={{
                                        background: 'transparent',
                                        border: `1px solid ${themeMode === 'dark' ? '#555' : '#ddd'}`,
                                        color: themeMode === 'dark' ? '#aaa' : '#666',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    All
                                </button>
                                <button
                                    onClick={handleDeselectAll}
                                    style={{
                                        background: 'transparent',
                                        border: `1px solid ${themeMode === 'dark' ? '#555' : '#ddd'}`,
                                        color: themeMode === 'dark' ? '#aaa' : '#666',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    None
                                </button>
                            </div>
                        </StudentListHeader>
                        <StudentListContent theme={theme}>
                            {loading ? (
                                <div style={{ padding: '1rem', textAlign: 'center', color: '#888' }}>Loading...</div>
                            ) : filteredStudents.length > 0 ? (
                                filteredStudents.map(student => (
                                    <StudentItem
                                        key={student.id}
                                        theme={theme}
                                        selected={selectedStudentIds.has(student.id)}
                                        onClick={() => toggleStudentSelection(student.id)}
                                    >
                                        <Checkbox
                                            type="checkbox"
                                            checked={selectedStudentIds.has(student.id)}
                                            onChange={() => toggleStudentSelection(student.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            theme={theme}
                                        />
                                        <StudentInfo>
                                            <div style={{ fontSize: '0.85rem', color: theme.TEXT_PRIMARY, lineHeight: '1.4' }}>
                                                <span style={{ opacity: 0.7 }}>{student.id}</span> . <strong>{student.name}</strong> . {student.father_name} . {student.class_name} {student.section_name ? `(${student.section_name})` : ''}
                                            </div>
                                        </StudentInfo>
                                    </StudentItem>
                                ))
                            ) : (
                                <div style={{ padding: '1rem', textAlign: 'center', color: '#888' }}>
                                    No students found
                                </div>
                            )}
                        </StudentListContent>
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
                                <span style={{ fontSize: '0.8rem', color: '#888', marginRight: 'auto' }}>Variables:</span>
                                <VariableTag theme={theme} onClick={() => insertVariable('{student_name}')}>Student Name</VariableTag>
                                <VariableTag theme={theme} onClick={() => insertVariable('{father_name}')}>Father Name</VariableTag>
                                <VariableTag theme={theme} onClick={() => insertVariable('{class_name}')}>Class</VariableTag>
                                <VariableTag theme={theme} onClick={() => insertVariable('{school_name}')}>School</VariableTag>
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
                            <HistoryTitle theme={theme}>Message History</HistoryTitle>
                            <IconButton onClick={() => setRefreshHistory(prev => prev + 1)}>
                                <RefreshIcon />
                            </IconButton>
                        </HistoryHeader>
                        <HistoryList theme={theme}>
                            {history.map((item, index) => (
                                <HistoryItem key={index} theme={theme} onClick={() => handleRepeatMessage(item.message)}>
                                    <HistoryMeta theme={theme}>
                                        <span>{format(new Date(item.notification_date), 'dd MMM yyyy')}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <CopyIcon style={{ fontSize: 14 }} /> Reuse
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
