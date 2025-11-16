import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { supabase } from '../supabaseClient';
import { AccountCircle, Edit as EditIcon, Add as AddIcon, Phone as PhoneIcon, Work as WorkIcon, Info, Person as PersonIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import NoTeachersFound from '../components/NoTeachersFound';

const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 12px 6px 12px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  height: 93vh;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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

const AddHeaderButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 1px 4px #0002;
  transition: background 0.18s, border 0.18s, transform 0.13s;
  &:hover { 
    transform: translateY(-1px); 
    border-color: ${({ theme }) => theme.ACCENT};
  }
`;

const MainContent = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  padding: 0 0 32px 0;
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: scroll-position;
  @media (max-width: 700px) {
    scroll-behavior: auto;
    -webkit-overflow-scrolling: touch;
    perspective: none;
    overscroll-behavior: contain;
    scroll-snap-type: none;
  }
  @media (min-width: 701px) {
    scroll-behavior: smooth;
    scroll-snap-type: y proximity;
    perspective: 1000px;
  }
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 3px;
    transition: background 0.2s;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
  }
  @media (max-width: 700px) {
    &::-webkit-scrollbar { width: 4px; }
  }
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  width: 100%;
  padding: 0;
  margin: 0;
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 700px) {
    grid-template-columns: repeat(1, 1fr);
    gap: 8px;
  }
`;

const EmployeeCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 14px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.18), 0 1.5px 6px rgba(0,0,0,0.10);
  padding: 1.2rem 1rem 1rem 1rem;
  position: relative;
  border: 2px solid ${({ theme }) => theme.FIELD_BORDER};
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.18s;
  max-width: 100%;
  width: 100%;
  cursor: pointer;
  box-sizing: border-box;
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: ${({ theme }) => theme.ACCENT};
  }
`;

const CardImageSection = styled.div`
  width: 100%;
  height: 100px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#f3f4f8'};
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  box-shadow: 0 1px 4px #0001;
`;

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const CardActions = styled.div`
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
    ${EmployeeCard}:hover & {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }
  }
`;

const CardActionBtn = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: #facc15;
  color: #222;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  transition: background 0.18s, color 0.18s, transform 0.18s;
  cursor: pointer;
  &:hover {
    background: #fde047;
    color: #7c3aed;
    transform: scale(1.12);
  }
`;

const CardContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  background: none;
  padding: 0 6px;
`;

const CardName = styled.h3`
  font-family: 'Inter', 'Segoe UI', 'Roboto', 'Arial', sans-serif;
  font-weight: 600;
  color: ${({ theme }) => theme.BG === '#252525' ? '#e2e8f0' : '#1e293b'};
  margin: 0;
  text-align: center;
  line-height: 1.2;
  letter-spacing: 0.01em;
`;

const CardInfoRow = styled.div`
  width: 100%;
  text-align: center;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 700;
  margin-top: 2px;
`;

const NoResults = styled.div`
  text-align: center;
  color: #b0b8d1;
  font-size: 1.1rem;
  margin: 48px 0;
`;

const AddEmployeeCard = styled(EmployeeCard)`
  border: 2px dashed #6366f1;
  color: #6366f1;
  cursor: pointer;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

// Skeleton loading (similar style across app)
const EmployeeSkeletonContainer = styled.div`
  width: 100%;
  height: 100%;
  padding: 8px 12px 24px 12px;
  box-sizing: border-box;
`;

const EmployeeSkeletonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  width: 100%;
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 700px) {
    grid-template-columns: repeat(1, 1fr);
    gap: 8px;
  }
`;

const EmployeeSkeletonCard = styled.div`
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#232a3b' : '#f3f4f6'};
  border-radius: 14px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.10), 0 1.5px 6px rgba(0,0,0,0.10);
  border: 1.5px solid ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#353b4a' : '#e5e7eb'};
  min-height: 180px;
  width: 100%;
  margin: 0 auto;
  padding: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent);
    animation: shimmer 1.5s infinite;
    z-index: 2;
    border-radius: 14px;
  }
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

const EmployeeSkeletonBanner = styled.div`
  height: 100px;
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#2b3242' : '#e5e7ef'};
  border-top-left-radius: 14px;
  border-top-right-radius: 14px;
`;

const EmployeeSkeletonLine = styled.div<{ width?: string; height?: string }>`
  height: ${({ height }) => height || '16px'};
  width: ${({ width }) => width || '80%'};
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#353b4a' : '#e0e7ef'};
  border-radius: 6px;
  margin: 10px auto 0 auto;
`;

const EmployeeListSkeleton: React.FC = () => (
  <EmployeeSkeletonContainer>
    <EmployeeSkeletonGrid>
      {Array.from({ length: 8 }).map((_, i) => (
        <EmployeeSkeletonCard key={i}>
          <EmployeeSkeletonBanner />
          <div style={{ padding: '10px 6px 16px 6px' }}>
            <EmployeeSkeletonLine width="60%" height="18px" />
            <EmployeeSkeletonLine width="40%" height="14px" />
            <EmployeeSkeletonLine width="50%" height="14px" />
          </div>
        </EmployeeSkeletonCard>
      ))}
    </EmployeeSkeletonGrid>
  </EmployeeSkeletonContainer>
);

const EmployeeList: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setLoading, loading } = useLoading();

  // Check if user has school_id
  if (!user?.school_id) {
    return (
      <PageContainer>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '2rem', 
          gap: 16,
          color: '#888',
          fontSize: '1.1rem',
          fontWeight: 600
        }}>
          <Info style={{ fontSize: '1.5rem' }} />
          No school context found. Please contact your administrator.
        </div>
      </PageContainer>
    );
  }

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!user?.school_id) return;
      const minDuration = 2000;
      const start = Date.now();
      setLoading(true);
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false });
      if (!error) setEmployees(data || []);
      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => setLoading(false), minDuration - elapsed);
      } else {
      setLoading(false);
      }
    };
    fetchEmployees();
  }, [user?.school_id]);

  const handleEdit = (employee: any) => {
    navigate(`/employees/add?edit=${employee.id}`);
  };

  const handleProfile = (employee: any) => {
    navigate(`/employees/profile/${employee.id}`);
  };

  // Delete functionality intentionally removed per requirements.

  if (loading) {
    return (
      <PageContainer>
        <Header>
          <Title>All Employees</Title>
        </Header>
        <MainContent>
          <EmployeeListSkeleton />
        </MainContent>
      </PageContainer>
    );
  }

  // Show NoTeachersFound if there are no employees
  if (employees.length === 0) {
    return <NoTeachersFound />;
  }

  return (
    <PageContainer>
      <Header>
        <Title>All Employees <span style={{fontWeight:400, fontSize:'1rem', color:'#4a4a4a'}}>({employees.length})</span></Title>
        <AddHeaderButton onClick={() => navigate('/employees/add')}>
          <AddIcon style={{ fontSize: 18 }} /> Add
        </AddHeaderButton>
      </Header>
      <MainContent>
        <CardGrid>
          {employees.map((employee) => (
            <EmployeeCard key={employee.id}>
              <CardImageSection>
                <CardActions>
                  <CardActionBtn title="View Profile" onClick={(e) => { e.stopPropagation(); handleProfile(employee); }}><PersonIcon fontSize="inherit" /></CardActionBtn>
                  <CardActionBtn title="Edit" onClick={(e) => { e.stopPropagation(); handleEdit(employee); }}><EditIcon fontSize="inherit" /></CardActionBtn>
                </CardActions>
                {employee.picture_url ? (
                  <CardImage src={employee.picture_url} alt={employee.name} />
                ) : (
                  <AccountCircle style={{ fontSize: 64, color: '#b0b8d1' }} />
                )}
              </CardImageSection>
              <CardContent>
                <CardName>{employee.name}</CardName>
                <CardInfoRow><WorkIcon style={{fontSize:16,verticalAlign:'middle',marginRight:4}} />{employee.role || '-'}</CardInfoRow>
                <CardInfoRow><PhoneIcon style={{fontSize:16,verticalAlign:'middle',marginRight:4}} />{employee.mobile || '-'}</CardInfoRow>
              </CardContent>
            </EmployeeCard>
          ))}
        </CardGrid>
      </MainContent>
    </PageContainer>
  );
};

export default EmployeeList; 