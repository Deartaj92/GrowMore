import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { supabase } from '../supabaseClient';
import { AccountCircle, Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, Phone as PhoneIcon, Work as WorkIcon, Info } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import NoTeachersFound from '../components/NoTeachersFound';

const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0 32px 16px 32px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  max-width: 100vw;
  overflow-x: hidden;
  min-height: 100vh;
`;

const Header = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 32px 0 18px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.BG};
  box-shadow: 0 2px 12px #0001;
  border-radius: 18px;
  padding: 18px 18px 10px 18px;
`;

const Title = styled.h2`
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: 1px;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.8em 0.5em;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  padding: 18px 0 32px 0;
  background: transparent;
  box-shadow: none;
  justify-content: center;
`;

const EmployeeCard = styled.div`
  position: relative;
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : theme.CARD};
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  border: 1.5px solid ${({ theme }) => theme.BORDER};
  overflow: visible;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  transition: border-color 0.18s, box-shadow 0.18s;
  cursor: pointer;
  box-sizing: border-box;
  width: 100%;
  max-width: 220px;
  margin: 0 auto;
  padding: 0 0 1.2rem 0;
  &:hover {
    border-color: #6366f1;
  }
`;

const CardImageSection = styled.div`
  width: 100%;
  height: 150px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#232a3b' : '#f3f4f8'};
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  box-shadow: 0 2px 12px #0001;
`;

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const CardActions = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  opacity: 0;
  pointer-events: none;
  z-index: 3;
  transition: opacity 0.18s, transform 0.18s, top 0.18s;
  width: 22px;
  ${EmployeeCard}:hover & {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }
`;

const CardActionBtn = styled.button`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: #facc15;
  color: #222;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  box-shadow: 0 2px 8px #0002;
  transition: background 0.18s, color 0.18s, transform 0.18s;
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

const CardContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  background: none;
  padding: 0 10px;
`;

const CardName = styled.h3`
  font-size: 1.22rem;
  font-weight: 800;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  margin-bottom: 2px;
  text-align: center;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: break-word;
`;

const CardInfoRow = styled.div`
  width: 100%;
  text-align: center;
  font-size: 1.02rem;
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

  const handleDelete = async (employeeId: string) => {
    if (!user?.school_id) return;
    setLoading(true);
    const minDuration = 2000;
    const start = Date.now();
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', employeeId)
      .eq('school_id', user.school_id);
    if (!error) {
      setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
    }
    const elapsed = Date.now() - start;
    if (elapsed < minDuration) {
      setTimeout(() => setLoading(false), minDuration - elapsed);
    } else {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  // Show NoTeachersFound if there are no employees
  if (employees.length === 0) {
    return <NoTeachersFound />;
  }

  return (
    <PageContainer>
      <Header>
        <Title>All Employees <span style={{fontWeight:400, fontSize:'1rem', color:'#4a4a4a'}}>({employees.length})</span></Title>
      </Header>
      <CardGrid>
        {employees.map((employee) => (
          <EmployeeCard key={employee.id}>
            <CardImageSection>
              <CardActions>
                <CardActionBtn title="Edit" onClick={() => handleEdit(employee)}><EditIcon fontSize="inherit" /></CardActionBtn>
                <CardActionBtn title="Delete" onClick={() => handleDelete(employee.id)}><DeleteIcon fontSize="inherit" /></CardActionBtn>
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
        <AddEmployeeCard onClick={() => navigate('/employees/add')}>
          <AddIcon style={{ fontSize: 48, marginBottom: 8 }} />
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Add Employee</div>
        </AddEmployeeCard>
      </CardGrid>
    </PageContainer>
  );
};

export default EmployeeList; 