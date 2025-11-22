import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { Schedule as ScheduleIcon } from '@mui/icons-material';
import Loader from '../components/Loader';

const Container = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const SimpleHeader = styled.div`
  text-align: center;
  margin-bottom: 20px;
`;

const SimpleTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 8px 0;
`;

const SimpleSubtitle = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0;
`;

const TimetableContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  padding: 24px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const TimetableGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 16px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const PeriodCard = styled.div`
  background: #e3f2fd;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #bbdefb;
  position: relative;
`;

const PeriodHeader = styled.div`
  background: #ff6b35;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: 0 2px 4px rgba(255, 107, 53, 0.3);
  text-align: center;
`;

const PeriodNumber = styled.div`
  color: white;
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 2px;
`;

const PeriodTime = styled.div`
  color: white;
  font-size: 0.85rem;
  font-weight: 500;
  opacity: 0.9;
`;

const PeriodContent = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  width: 100%;
`;

const ContentCard = styled.div`
  background: #2196f3;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 4px rgba(33, 150, 243, 0.3);
  text-align: center;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
`;

const ContentText = styled.div`
  color: white;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.2;
  word-break: break-word;
`;

const BreakCard = styled.div`
  background: #e3f2fd;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #bbdefb;
  text-align: center;
  grid-column: 1 / -1;
`;

const BreakHeader = styled.div`
  background: #f59e0b;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
`;

const BreakText = styled.div`
  color: white;
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 4px;
`;

const BreakTime = styled.div`
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  opacity: 0.9;
`;

const FreePeriodCard = styled(PeriodCard)`
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  opacity: 0.8;
`;

const FreePeriodHeader = styled.div`
  background: #9e9e9e;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: 0 2px 4px rgba(158, 158, 158, 0.3);
  text-align: center;
`;

const FreePeriodContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50px;
  color: #757575;
  font-style: italic;
  font-size: 0.95rem;
  font-weight: 500;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
`;

const NoTimetableMessage = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1.2rem;
`;

const NoTimetableIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 16px;
  opacity: 0.6;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

const MyTimetable: React.FC = () => {
  const { user } = useAuth();
  const [timetableData, setTimetableData] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionName, setSessionName] = useState<string>('');

  // Helper functions
  const getSubjectName = (id: number): string => subjects.find(s => s.id === id)?.name || '';
  const getClassName = (id: number): string => classes.find(c => c.id === id)?.name || '';

  // Helper function to get teacher's schedule
  const getTeacherSchedule = () => {
    const periods = [
      { num: 1, time: '08:30-09:00' },
      { num: 2, time: '09:00-09:30' },
      { num: 3, time: '09:30-10:00' },
      { num: 4, time: '10:00-10:30' },
      { num: 5, time: '10:30-11:00' },
      { num: 6, time: '11:15-11:45' },
      { num: 7, time: '11:45-12:15' },
      { num: 8, time: '12:15-12:45' },
    ];

    const scheduleMap = new Map<number, { classes: string[]; subjects: string[] }>();
    
    timetableData.forEach((item: any) => {
      const period = item.period_index + 1; // Convert 0-based to 1-based
      const className = getClassName(item.class_id);
      const subjectName = getSubjectName(item.subject_id);
      
      if (!scheduleMap.has(period)) {
        scheduleMap.set(period, { classes: [className], subjects: [subjectName] });
      } else {
        // Add both class and subject (allowing duplicates)
        const existing = scheduleMap.get(period)!;
        existing.classes.push(className);
        existing.subjects.push(subjectName);
      }
    });

    // Create schedule array with all periods
    const allPeriods = [];
    for (let i = 1; i <= periods.length; i++) {
      if (i === 6) {
        // Add break after 5th period
        allPeriods.push({ period: 'Break', time: '11:00-11:15', class: '', subject: '' });
      }
      
      const scheduleItem = scheduleMap.get(i);
      if (scheduleItem) {
        // Remove duplicate subjects and classes (similar to how double subjects are handled)
        const uniqueSubjects = Array.from(new Set(scheduleItem.subjects));
        const uniqueClasses = Array.from(new Set(scheduleItem.classes));
        allPeriods.push({
          period: i,
          time: periods[i-1].time,
          class: uniqueClasses.join(' / '),
          subject: uniqueSubjects.join(' / ')
        });
      } else {
        allPeriods.push({
          period: i,
          time: periods[i-1].time,
          class: 'Free Period',
          subject: '-'
        });
      }
    }

    return allPeriods;
  };

  useEffect(() => {
    const fetchTimetableData = async () => {
      if (!user?.staff_id || !user?.school_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch subjects and classes first
        const [subjectsResult, classesResult] = await Promise.all([
          supabase.from('subjects').select('id, name').eq('school_id', user.school_id),
          supabase.from('classes').select('id, name').eq('school_id', user.school_id)
        ]);

        if (subjectsResult.data) setSubjects(subjectsResult.data);
        if (classesResult.data) setClasses(classesResult.data);

        // Get active session
        const { data: session } = await supabase
          .from('sessions')
          .select('id, name')
          .eq('is_active', true)
          .eq('school_id', user.school_id)
          .single();

        if (!session) {
          setTimetableData([]);
          setLoading(false);
          return;
        }

        setSessionName(session.name);

        // Fetch timetable data for this teacher
        const { data: timetable, error } = await supabase
          .from('timetable')
          .select('period_index, subject_id, class_id, day_of_week')
          .eq('teacher_id', user.staff_id)
          .eq('session_id', session.id)
          .eq('school_id', user.school_id)
          .eq('day_of_week', 1); // Monday only

        if (error) {
          setTimetableData([]);
        } else {
          setTimetableData(timetable || []);
        }
      } catch (error) {
        setTimetableData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTimetableData();
  }, [user?.staff_id, user?.school_id]);

  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <Loader />
        </LoadingContainer>
      </Container>
    );
  }

  return (
    <Container>
      <SimpleHeader>
        <SimpleTitle>My Timetable</SimpleTitle>
        <SimpleSubtitle>
          {sessionName ? `Current Session: ${sessionName}` : 'View your assigned periods, subjects, and classes'}
        </SimpleSubtitle>
      </SimpleHeader>

      <TimetableContainer>
        {timetableData.length === 0 ? (
          <NoTimetableMessage>
            <NoTimetableIcon>📅</NoTimetableIcon>
            <div>No timetable assigned yet</div>
            <div style={{ fontSize: '1rem', marginTop: '8px', opacity: 0.8 }}>
              Please contact your administrator to assign your teaching schedule.
            </div>
          </NoTimetableMessage>
        ) : (
          <TimetableGrid>
            {getTeacherSchedule().map((item, index) => {
              if (item.period === 'Break') {
                return (
                  <BreakCard key={index}>
                    <BreakHeader>
                      <BreakText>BREAK</BreakText>
                      <BreakTime>{item.time}</BreakTime>
                    </BreakHeader>
                  </BreakCard>
                );
              }

              if (item.class === 'Free Period') {
                return (
                  <FreePeriodCard key={index}>
                    <FreePeriodHeader>
                      <PeriodNumber>Period {item.period}</PeriodNumber>
                      <PeriodTime>{item.time}</PeriodTime>
                    </FreePeriodHeader>
                    <FreePeriodContent>
                      Free Period
                    </FreePeriodContent>
                  </FreePeriodCard>
                );
              }

              return (
                <PeriodCard key={index}>
                  <PeriodHeader>
                    <PeriodNumber>Period {item.period}</PeriodNumber>
                    <PeriodTime>{item.time}</PeriodTime>
                  </PeriodHeader>
                  <PeriodContent>
                    <ContentCard>
                      <ContentText>{item.class}</ContentText>
                    </ContentCard>
                    <ContentCard>
                      <ContentText>{item.subject}</ContentText>
                    </ContentCard>
                  </PeriodContent>
                </PeriodCard>
              );
            })}
          </TimetableGrid>
        )}
      </TimetableContainer>
    </Container>
  );
};

export default MyTimetable;
