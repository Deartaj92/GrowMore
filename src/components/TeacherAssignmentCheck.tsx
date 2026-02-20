import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { School as SchoolIcon, Person as PersonIcon } from '@mui/icons-material';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background: ${({ theme }) => theme.BG};
`;

const MessageCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  padding: 3rem 2rem;
  text-align: center;
  max-width: 500px;
  width: 100%;
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 50%;
  margin: 0 auto 1.5rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 1rem 0;
`;

const Message = styled.p`
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  line-height: 1.6;
  margin: 0 0 1.5rem 0;
`;

const ContactInfo = styled.div`
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1.5rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const ContactTitle = styled.h4`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 0.5rem 0;
`;

const ContactText = styled.p`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0;
  line-height: 1.4;
`;

interface TeacherAssignmentCheckProps {
  children: React.ReactNode;
}

const TeacherAssignmentCheck: React.FC<TeacherAssignmentCheckProps> = ({ children }) => {
  const { user } = useAuth();
  const [isAssigned, setIsAssigned] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTeacherAssignment = async () => {
      if (!user?.staff_id || !user?.school_id) {
        setLoading(false);
        return;
      }

      try {
        // Check if teacher is assigned as class teacher to any class
        const { data: classAssignments, error: classError } = await supabase
          .from('classes')
          .select('id, name')
          .eq('teacher_id', user.staff_id)
          .eq('school_id', user.school_id);

        if (classError) {
          setIsAssigned(false);
          setLoading(false);
          return;
        }

        // Only check for class teacher assignments
        // Teachers assigned to subjects but not as class teachers shouldn't access attendance
        const hasClassAssignments = classAssignments && classAssignments.length > 0;
        
        
        setIsAssigned(hasClassAssignments);
      } catch (error) {
        setIsAssigned(false);
      } finally {
        setLoading(false);
      }
    };

    checkTeacherAssignment();
  }, [user?.staff_id, user?.school_id]);

  if (loading) {
    return (
      <Container>
        <MessageCard>
          <IconContainer>
            <PersonIcon style={{ fontSize: '2rem' }} />
          </IconContainer>
          <Title>Checking Assignment Status</Title>
          <Message>Please wait while we verify your class assignments...</Message>
        </MessageCard>
      </Container>
    );
  }

  if (isAssigned === false) {
    return (
      <Container>
        <MessageCard>
          <IconContainer>
            <SchoolIcon style={{ fontSize: '2rem' }} />
          </IconContainer>
          <Title>No Class Teacher Assignment Found</Title>
          <Message>
            You are not currently assigned as a class teacher for any class. 
            To access attendance features, you need to be assigned as a class teacher to a specific class by the school administration.
          </Message>
          <ContactInfo>
            <ContactTitle>Need Help?</ContactTitle>
            <ContactText>
              Please contact your school administrator to request class teacher assignment to a specific class. 
              Once assigned as a class teacher, you will be able to access attendance management features.
            </ContactText>
          </ContactInfo>
        </MessageCard>
      </Container>
    );
  }

  // If teacher is assigned, render the children (attendance components)
  return <>{children}</>;
};

export default TeacherAssignmentCheck;
