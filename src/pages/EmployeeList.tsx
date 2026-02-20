import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { supabase } from '../supabaseClient';
import { Edit as EditIcon, Add as AddIcon, Phone as PhoneIcon, Work as WorkIcon, Info, Person as PersonIcon, LocationOn as LocationIcon, WhatsApp as WhatsAppIcon, Sms as SmsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import NoTeachersFound from '../components/NoTeachersFound';
import { Box, Grid } from '@mui/material';
import Loader from '../components/Loader';

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

const getStatusColor = (status: string) =>
  status === 'active' ? '34,197,94' : // green
    status === 'suspended' ? '245,158,11' : // orange
      status === 'withdrawn' ? '239,68,68' : // red
        '99,102,241'; // blue

const EmployeeCard = styled.div<{ status: string }>`
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
  cursor: pointer;
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

const Avatar = styled.div`
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
  cursor: pointer;
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

const CardTop = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0;
  max-height: 140px;
  
  @media (max-width: 700px) {
    max-height: 120px;
  }
`;

const EmployeeName = styled.h3`
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  
  @media (max-width: 700px) {
    font-size: 0.95rem;
  }
`;

const RoleName = styled.div`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.92rem;
  margin-bottom: 0.1rem;
  
  @media (max-width: 700px) {
    font-size: 0.8rem;
  }
`;

const EmployeeDetails = styled.p`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.9rem;
  margin: 0.25rem 0;
  
  @media (max-width: 700px) {
    font-size: 0.75rem;
  }
`;

const CardActions = styled.div<{ offsetTop?: boolean }>`
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
  
  @media (max-width: 700px) {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
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
  &:last-child {
    background: #ef4444;
    color: #fff;
    &:hover {
      background: #dc2626;
      color: #fff;
    }
  }
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

  // Real-time subscription for staff updates
  useEffect(() => {
    if (!user?.school_id) return;

    const subscription = supabase
      .channel('staff-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'staff',
          filter: `school_id=eq.${user?.school_id}`,
        },
        (payload) => {
          const updatedStaff = payload.new;
          setEmployees((prev) =>
            prev.map((emp) =>
              emp.id === updatedStaff.id ? { ...emp, ...updatedStaff } : emp
            )
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
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
          <Loader />
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
        <Title>All Employees <span style={{ fontWeight: 400, fontSize: '1rem', color: '#4a4a4a' }}>({employees.length})</span></Title>
        <AddHeaderButton onClick={() => navigate('/employees/add')}>
          <AddIcon style={{ fontSize: 18 }} /> Add
        </AddHeaderButton>
      </Header>
      <MainContent>
        <CardGrid>
          {employees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              status={employee.status || 'active'}
              onClick={() => handleProfile(employee)}
              data-employee-card
            >
              <CardTop>
                <Avatar
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProfile(employee);
                  }}
                  title="View Employee Profile"
                >
                  {employee.picture_url ? (
                    <img
                      src={employee.picture_url}
                      alt={employee.name}
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
                      {(employee.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?')}
                    </span>
                  )}
                </Avatar>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.2rem 1.5rem 1.2rem 1rem' }}>
                  <EmployeeName>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>{employee.name}</span>
                      <StatusBadge status={employee.status || 'active'}>
                        {(employee.status || 'active').charAt(0).toUpperCase() + (employee.status || 'active').slice(1)}
                      </StatusBadge>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        opacity: 0.6,
                        fontWeight: 'normal'
                      }}>
                        #{employee.id}
                      </span>
                    </div>
                  </EmployeeName>
                  <RoleName style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{employee.role || 'N/A'}</span>
                    {employee.mobile && (
                      <span style={{ fontSize: '0.85rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {employee.notification_channel === 'sms' ? (
                          <SmsIcon style={{ fontSize: '0.9rem', opacity: 0.8 }} titleAccess="SMS" />
                        ) : (
                          <WhatsAppIcon style={{ fontSize: '0.9rem', color: '#25d366' }} titleAccess="WhatsApp" />
                        )}
                        {employee.mobile}
                      </span>
                    )}
                  </RoleName>
                  <EmployeeDetails style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span>
                      <WorkIcon style={{ fontSize: '0.9rem', verticalAlign: 'middle', marginRight: '4px' }} />
                      {employee.department || employee.designation || 'N/A'}
                    </span>
                    {employee.address && (
                      <span style={{ fontSize: '0.8rem', opacity: 0.7, textAlign: 'right', maxWidth: '50%', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                        <LocationIcon style={{ fontSize: '0.9rem' }} />
                        {employee.address}
                      </span>
                    )}
                  </EmployeeDetails>
                </div>
              </CardTop>
              <CardActions>
                <CardActionBtn
                  title="View Profile"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProfile(employee);
                  }}
                  style={{ background: '#4a6cf7', color: '#fff' }}
                >
                  <PersonIcon fontSize="inherit" />
                </CardActionBtn>
                <CardActionBtn
                  title="Edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(employee);
                  }}
                >
                  <EditIcon fontSize="inherit" />
                </CardActionBtn>
              </CardActions>
            </EmployeeCard>
          ))}
        </CardGrid>
      </MainContent>
    </PageContainer>
  );
};

export default EmployeeList; 