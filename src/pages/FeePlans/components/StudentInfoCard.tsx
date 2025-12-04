import React from 'react';
import styled from 'styled-components';
import { StudentInfo } from '../types';

const Card = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const Title = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const Value = styled.span`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 600;
`;

interface StudentInfoCardProps {
  student: StudentInfo | null;
}

export const StudentInfoCard: React.FC<StudentInfoCardProps> = ({ student }) => {
  if (!student) {
    return (
      <Card>
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
          color: 'rgba(0, 0, 0, 0.5)'
        }}>
          Select a student to view information
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <Title>Student Information</Title>
      <Grid>
        <InfoItem>
          <Label>Student Name</Label>
          <Value>{student.name} {student.fatherName ? `/ ${student.fatherName}` : ''}</Value>
        </InfoItem>
        {student.studentNumber && (
          <InfoItem>
            <Label>Adm No.</Label>
            <Value>{student.studentNumber}</Value>
          </InfoItem>
        )}
        {student.rollNumber && (
          <InfoItem>
            <Label>Roll No.</Label>
            <Value>{student.rollNumber}</Value>
          </InfoItem>
        )}
        {student.dateOfAdmission && (
          <InfoItem>
            <Label>DoA</Label>
            <Value>{new Date(student.dateOfAdmission).toLocaleDateString()}</Value>
          </InfoItem>
        )}
        {student.campus && (
          <InfoItem>
            <Label>Campus</Label>
            <Value>{student.campus}</Value>
          </InfoItem>
        )}
        {(student.className || student.sectionName) && (
          <InfoItem>
            <Label>Class</Label>
            <Value>
              {student.className || 'N/A'}
              {student.sectionName ? ` / ${student.sectionName}` : ' - N/A'}
            </Value>
          </InfoItem>
        )}
        {student.transport && (
          <InfoItem>
            <Label>Transport</Label>
            <Value>{student.transport}</Value>
          </InfoItem>
        )}
        {student.feeSchedule && (
          <InfoItem>
            <Label>Fee Schedule</Label>
            <Value>{student.feeSchedule}</Value>
          </InfoItem>
        )}
      </Grid>
    </Card>
  );
};

