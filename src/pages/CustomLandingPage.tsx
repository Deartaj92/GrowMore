import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { landingPageService, WidgetWithPreference } from '../services/landingPageService';
import { ThemeContext } from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import * as Icons from '@mui/icons-material';
import { Assessment as AssessmentIcon, BarChart as BarChartIcon, Assignment as AssignmentIcon, Quiz as QuizIcon, School as SchoolIcon, Schedule as ScheduleIcon, AccessTime as AccessTimeIcon, Person as PersonIcon, Event as EventIcon, CalendarToday as CalendarIcon, LocationOn as LocationIcon } from '@mui/icons-material';
import Loader from '../components/Loader';
import { examinationService } from '../services/examinationService';
import { Examination } from '../types/examinations';
import { fetchRenderSettings, isTeacherCardVisible, isStudentCardVisible, RenderSettings } from '../services/renderSettingsService';

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

  // Check for student session if no staff user
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
          }
        }
      } catch (e) {
        // Error parsing student session
      }
    } else {
      setStudentInfo(null);
    }
  }, [user]);

  useEffect(() => {
    const schoolId = user?.school_id || studentInfo?.school_id;
    if (schoolId) {
      // Load events for all users
      loadEvents();
      
      // If user is a Teacher, load teacher-specific data
      if (user?.role === 'Teacher') {
        loadTeacherData();
      } else if (user?.role === 'Student' || studentInfo) {
        // For students, load render settings
        loadStudentData();
      } else {
        loadWidgets();
      }
    }
  }, [user, studentInfo]);

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
    const schoolId = user?.school_id || studentInfo?.school_id;
    if (!schoolId) return;

    try {
      const userRole = user?.role || studentInfo?.role || 'Guest';
      
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

