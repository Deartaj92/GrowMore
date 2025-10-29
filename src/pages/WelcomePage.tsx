import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Assessment as AssessmentIcon, BarChart as BarChartIcon, Assignment as AssignmentIcon, Quiz as QuizIcon, School as SchoolIcon, Schedule as ScheduleIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { usePageReady } from '../hooks/usePageReady';
import { examinationService } from '../services/examinationService';
import { Examination } from '../types/examinations';

const Container = styled.div`
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
`;

const WelcomeHeader = styled.div`
  margin-bottom: 2rem;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 1rem;
  line-height: 1.2;
`;

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

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
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
  position: relative;
  overflow: hidden;
  
  /* Perfect vertical and horizontal centering */
  svg {
    width: 24px !important;
    height: 24px !important;
    display: block;
    margin: 0 auto;
    vertical-align: middle;
    position: relative;
    top: 0;
    left: 0;
  }
  
  /* Override Material-UI icon styles for perfect centering */
  .MuiSvgIcon-root {
    width: 24px !important;
    height: 24px !important;
    font-size: 24px !important;
    display: block !important;
    margin: 0 auto !important;
    vertical-align: middle !important;
    position: relative !important;
    top: 0 !important;
    left: 0 !important;
  }
  
  /* Additional centering for Material-UI icons */
  & > * {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 100% !important;
    height: 100% !important;
  }
  
  ${QuickLinkCard}:hover & {
    transform: scale(1.1);
    box-shadow: 0 8px 24px ${({ $color }) => $color ? `${$color}40` : '#3b82f640'};
  }
  
  @media (max-width: 768px) {
    width: 44px;
    height: 44px;
    font-size: 20px;
    
    svg {
      width: 20px !important;
      height: 20px !important;
    }
    
    .MuiSvgIcon-root {
      width: 20px !important;
      height: 20px !important;
      font-size: 20px !important;
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
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, ${({ $color }) => $color ? `${$color}20` : '#3b82f620'}, transparent);
    transition: left 0.5s ease;
  }
  
  &::after {
    content: '→';
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 1rem;
    display: inline-block;
  }
  
  ${QuickLinkCard}:hover & {
    transform: translateX(2px);
    
    &::before {
      left: 100%;
    }
    
    &::after {
      transform: translateX(6px) scale(1.1);
    }
  }
  
  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

// Skeleton Loading Components
const SkeletonCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  animation: pulse 1.5s ease-in-out infinite;
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

const SkeletonHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const SkeletonIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${({ theme }) => theme.BORDER};
  animation: pulse 1.5s ease-in-out infinite;
`;

const SkeletonTitle = styled.div`
  height: 20px;
  width: 60%;
  background: ${({ theme }) => theme.BORDER};
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;
`;

const SkeletonDescription = styled.div`
  height: 16px;
  width: 100%;
  background: ${({ theme }) => theme.BORDER};
  border-radius: 4px;
  margin-bottom: 8px;
  animation: pulse 1.5s ease-in-out infinite;
  
  &:last-child {
    width: 80%;
  }
`;

const SkeletonTitleMain = styled.div`
  height: 32px;
  width: 300px;
  background: ${({ theme }) => theme.BORDER};
  border-radius: 6px;
  margin: 0 auto 1rem;
  animation: pulse 1.5s ease-in-out infinite;
`;

const SkeletonSubtitle = styled.div`
  height: 20px;
  width: 400px;
  background: ${({ theme }) => theme.BORDER};
  border-radius: 4px;
  margin: 0 auto;
  animation: pulse 1.5s ease-in-out infinite;
`;


const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [staffName, setStaffName] = useState<string>('');
  const [staffGender, setStaffGender] = useState<string>('');
  const [teacherSections, setTeacherSections] = useState<Array<{id: number, name: string, class_id: number, class_name: string}>>([]);
  const [isPageReady, setIsPageReady] = useState(false);
  const [publishedExaminations, setPublishedExaminations] = useState<Examination[]>([]);
  const [isClassTeacher, setIsClassTeacher] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Use the page ready hook to signal when the page is fully loaded
  usePageReady(isPageReady);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        const [staffNameResult, examinationsResult, classTeacherResult, sectionsResult] = await Promise.all([
          fetchStaffName(),
          fetchPublishedExaminations(),
          checkClassTeacherAssignment(),
          fetchTeacherSections()
        ]);
        
        // Signal that the page is ready after data is loaded
        setIsPageReady(true);
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
          // Check if teacher is assigned to any section (which makes them a class teacher)
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
          // First fetch sections
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

          // Get unique class IDs
          const classIds = Array.from(new Set(sections.map(s => s.class_id)));

          // Fetch classes
          const { data: classes, error: classesError } = await supabase
            .from('classes')
            .select('id, name')
            .in('id', classIds)
            .eq('school_id', user.school_id);

          if (classesError) {
            setTeacherSections([]);
            return;
          }

          // Create class lookup map
          const classMap = new Map(classes?.map(c => [c.id, c.name]) || []);

          // Combine sections with class names
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


    fetchData();
  }, [user?.staff_id, user?.school_id]);

  if (loading) {
    return (
      <Container>
        <WelcomeHeader>
          <SkeletonTitleMain />
          <SkeletonSubtitle />
        </WelcomeHeader>

        <QuickLinksGrid>
          {/* Skeleton cards for the main navigation items */}
          {[1, 2, 3, 4, 5].map((index) => (
            <SkeletonCard key={index}>
              <SkeletonHeader>
                <SkeletonIcon />
                <SkeletonTitle />
              </SkeletonHeader>
              <SkeletonDescription />
              <SkeletonDescription />
            </SkeletonCard>
          ))}
        </QuickLinksGrid>
      </Container>
    );
  }

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


  return (
    <Container>
      <WelcomeHeader>
        <WelcomeText>
          <WelcomeSmall>Welcome to</WelcomeSmall>
          <WelcomeLarge>
            <GrowText>GROW</GrowText> <MoreText>MORE!</MoreText>
          </WelcomeLarge>
        </WelcomeText>
        <Subtitle>{getGenderTitle(staffGender)}{staffName || 'User'}{getClassSectionInfo()}</Subtitle>
      </WelcomeHeader>

      <QuickLinksGrid>
        {/* Only show attendance cards if teacher is assigned as class teacher */}
        {isClassTeacher && (
          <>
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
          </>
        )}

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

        {/* Examination Marks Entry Cards - Only show if there are published examinations */}
        {publishedExaminations.map((examination) => (
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
};

export default WelcomePage; 