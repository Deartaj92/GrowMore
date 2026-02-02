import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';
import { sortClasses } from '../utils/classUtils';
import {
  Search as SearchIcon,
  PersonOff as PersonOffIcon,
  Person as PersonIcon,
  ArrowBack as ArrowBackIcon,
  FilterList as FilterListIcon,
  School as SchoolIcon,
  Class as ClassIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Loader from './Loader';

// --- Animations ---
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(74, 108, 247, 0.4); }
  70% { transform: scale(1.02); box-shadow: 0 0 0 6px rgba(74, 108, 247, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(74, 108, 247, 0); }
`;

// --- Styled Components ---

const PageContainer = styled.div`
  width: 100%;
  height: 100%;
  padding: 16px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: background 0.3s ease;

  @media (max-width: 900px) {
    padding: 8px;
  }

  .desktop-only-text {
    @media (max-width: 900px) {
      display: none !important;
    }
  }

  .meta-label {
    @media (max-width: 900px) {
      display: none !important;
    }
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 24px;
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 1px solid ${({ theme }) => theme.BORDER};
  animation: ${fadeIn} 0.4s ease-out;
  backdrop-filter: blur(10px);

  @media (max-width: 900px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 8px 12px;
    margin-bottom: 12px;
    border-radius: 12px;
  }
`;

const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const BackButton = styled.button`
  background: ${({ theme }) => theme.ICON_BG};
  color: ${({ theme }) => theme.ACCENT};
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: ${({ theme }) => theme.HOVER_BG};
    transform: translateX(-4px);
  }
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 800;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, ${({ theme }) => theme.TEXT_PRIMARY}, ${({ theme }) => theme.ACCENT});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  @media (max-width: 900px) {
    font-size: 1.1rem;
    font-weight: 700;
  }
`;

const Subtitle = styled.span`
  font-size: 0.9rem;
  opacity: 0.7;
  font-weight: 500;

  @media (max-width: 900px) {
    display: none;
  }
`;


const ControlsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  align-items: flex-end;
  animation: ${fadeIn} 0.5s ease-out 0.1s backwards;
`;

const ControlCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 200px;
`;

const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StyledSelect = styled.select`
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  background-size: 1em;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.ACCENT}20;
  }

  /* Fix for dark mode option visibility */
  option {
    background: ${({ theme }) => theme.CARD};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

const SearchComp = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: auto;
`;

const HeaderControls = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;

  @media (max-width: 900px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    width: 100%;
  }
`;
const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 48px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.ACCENT}20;
  }

  &::placeholder {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    opacity: 0.6;
  }
`;

const SearchIconWrapper = styled.div`
  position: absolute;
  left: 16px;
  color: ${({ theme }) => theme.ACCENT};
  display: flex;
  align-items: center;
  pointer-events: none;
`;

const StudentsList = styled.div`
  flex: 1;
  overflow-y: auto;
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  box-shadow: ${({ theme }) => theme.SHADOW};
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 8px;
  animation: ${fadeIn} 0.5s ease-out 0.2s backwards;
  
  /* Custom Scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BORDER};
    border-radius: 10px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.TEXT_SECONDARY};
  }
`;

const ListHeader = styled.div`
  padding: 12px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  margin-bottom: 8px;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const StudentItem = styled.div<{ isExcluded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  margin-bottom: 8px;
  background: ${({ theme, isExcluded }) =>
    isExcluded
      ? `linear-gradient(90deg, #ef444410, transparent)`
      : theme.BG
  };
  border: 1px solid ${({ theme, isExcluded }) =>
    isExcluded ? '#ef444430' : theme.BORDER
  };
  border-left: 4px solid ${({ isExcluded, theme }) =>
    isExcluded ? '#ef4444' : 'transparent'
  };
  border-radius: 12px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: default;

  @media (max-width: 900px) {
    padding: 10px 12px;
    margin-bottom: 6px;
    border-radius: 8px;
    gap: 8px;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    background: ${({ theme, isExcluded }) =>
    isExcluded ? `linear-gradient(90deg, #ef444415, transparent)` : theme.FIELD_BG
  };
  }
`;

const StudentInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const AvatarPlaceholder = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: ${({ theme }) => `linear-gradient(135deg, ${theme.ACCENT}, ${theme.ACCENT}dd)`};
  color: white;
  display: flex;

  @media (max-width: 900px) {
    width: 36px;
    height: 36px;
    font-size: 0.95rem;
  }

  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
  box-shadow: 0 2px 8px ${({ theme }) => theme.ACCENT}40;
`;

const StudentDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const StudentName = styled.span<{ isExcluded: boolean }>`
  font-weight: 700;
  font-size: 1rem;
  color: ${({ theme, isExcluded }) => isExcluded ? '#ef4444' : theme.TEXT_PRIMARY};
  transition: color 0.3s ease;

  @media (max-width: 900px) {
    font-size: 0.9rem;
    font-weight: 600;
  }
`;

const StudentMeta = styled.div`
  display: flex;
  gap: 12px;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};

  @media (max-width: 900px) {
    gap: 6px;
    font-size: 0.7rem;
    flex-wrap: wrap;
  }
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  background: ${({ theme }) => theme.BORDER};
  padding: 2px 8px;
  border-radius: 6px;

  @media (max-width: 900px) {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.7rem;
  }
`;

const ActionButton = styled.button<{ variant?: 'danger' | 'success' | 'primary' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);

  @media (max-width: 900px) {
    padding: 8px 14px;
    font-size: 0.8rem;
    gap: 4px;
    border-radius: 8px;

    svg {
      font-size: 1rem !important;
    }
  }
  
  ${({ variant, theme }) => {
    switch (variant) {
      case 'danger':
        return css`
          background: #ef4444;
          color: white;
          &:hover { 
            background: #dc2626; 
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
          }
        `;
      case 'success':
        return css`
          background: #10b981;
          color: white;
          &:hover { 
            background: #059669; 
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          }
        `;
      default:
        return css`
          background: ${theme.ACCENT};
          color: white;
          &:hover { 
            background: ${theme.ACCENT}; 
            filter: brightness(1.1);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px ${theme.ACCENT}40;
          }
        `;
    }
  }}
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  gap: 16px;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-align: center;
  opacity: 0.7;

  svg {
    font-size: 4rem;
    color: ${({ theme }) => theme.BORDER};
  }
`;

const ExcludedBadge = styled.span`
  background: #ef444420;
  color: #ef4444;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #ef444440;
  display: flex;
  align-items: center;

  @media (max-width: 900px) {
    font-size: 0.65rem;
    padding: 3px 6px;
    display: none;
  }

  display: flex;
  align-items: center;
  gap: 4px;
`;

// Responsive Components
const ExamSelect = styled(StyledSelect)`
  width: 300px;
  padding: 8px 12px;
  font-size: 0.9rem;
  @media (max-width: 900px) {
    width: 100%;
    grid-column: 1 / -1;
    padding: 6px 10px;
    font-size: 0.85rem;
  }
`;

const ClassSelect = styled(StyledSelect)`
  width: 160px;
  padding: 8px 12px;
  font-size: 0.9rem;
  @media (max-width: 900px) {
    width: 100%;
    padding: 6px 10px;
    font-size: 0.85rem;
  }
`;

const SectionSelect = styled(StyledSelect)`
  width: 140px;
  padding: 8px 12px;
  font-size: 0.9rem;
  @media (max-width: 900px) {
    width: 100%;
    padding: 6px 10px;
    font-size: 0.85rem;
  }
`;

const ResponsiveSearchInput = styled(SearchInput)`
  width: 200px;
  padding: 8px 12px 8px 36px;
  font-size: 0.9rem;
  @media (max-width: 900px) {
    width: 100%;
    padding: 6px 10px 6px 32px;
    font-size: 0.85rem;
  }
`;

const ResponsiveSearchComp = styled(SearchComp)`
  @media (max-width: 900px) {
    width: 100%;
    grid-column: 1 / -1;
  }
`;


const StudentExclusionManager: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [excludedStudentIds, setExcludedStudentIds] = useState<Set<number>>(new Set());

  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: examsData } = await supabase
          .from('examinations')
          .select('id, name')
          .eq('school_id', user?.school_id)
          .order('created_at', { ascending: false });

        const { data: classesData } = await supabase
          .from('classes')
          .select('id, name')
          .eq('school_id', user?.school_id)
          .order('name');

        if (examsData) setExams(examsData);
        if (classesData) {
          const sortedClasses = sortClasses(classesData);
          setClasses(sortedClasses);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        showToast('Failed to load initial data', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (user?.school_id) {
      fetchData();
    }
  }, [user?.school_id]);

  // Fetch sections when class changes
  useEffect(() => {
    const fetchSections = async () => {
      if (!selectedClassId) {
        setSections([]);
        return;
      }

      try {
        const { data: sectionsData } = await supabase
          .from('sections')
          .select('id, name')
          .eq('class_id', selectedClassId)
          .eq('school_id', user?.school_id)
          .order('name');

        setSections(sectionsData || []);
      } catch (error) {
        console.error('Error fetching sections:', error);
      }
    };

    fetchSections();
  }, [selectedClassId, user?.school_id]);

  // Fetch students and exclusions when exam/class/section changes
  useEffect(() => {
    const fetchStudentsAndExclusions = async () => {
      // Need exam and class selected. Section is optional but if selected, use it.
      if (!selectedExamId || !selectedClassId) {
        setStudents([]);
        return;
      }

      try {
        setLoading(true);

        let query = supabase
          .from('students')
          .select('id, name, father_name, roll_number')
          .eq('school_id', user?.school_id)
          .eq('class_id', selectedClassId)
          .eq('status', 'active');

        if (selectedSectionId) {
          query = query.eq('section_id', selectedSectionId);
        }

        const { data: studentsData, error: studentError } = await query;

        if (studentError) throw studentError;

        const { data: exclusionsData, error: exclusionError } = await supabase
          .from('exam_exclusions')
          .select('student_id')
          .eq('exam_id', selectedExamId);

        if (exclusionError && exclusionError.code !== 'PGRST116') {
          console.error('Exclusion fetch error', exclusionError);
        }

        if (studentsData) {
          // Sort students by ID (user request)
          const sortedStudents = studentsData.sort((a, b) => a.id - b.id);
          setStudents(sortedStudents);
        }

        if (exclusionsData) {
          setExcludedStudentIds(new Set(exclusionsData.map(Ex => Ex.student_id)));
        } else {
          setExcludedStudentIds(new Set());
        }

      } catch (error) {
        console.error('Error fetching students:', error);
        showToast('Error loading students', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentsAndExclusions();
  }, [selectedExamId, selectedClassId, selectedSectionId, user?.school_id]);

  const handleToggleExclusion = async (studentId: number) => {
    if (!selectedExamId) return;

    try {
      const isExcluded = excludedStudentIds.has(studentId);

      if (isExcluded) {
        // Re-include (Delete from exclusions)
        const { error } = await supabase
          .from('exam_exclusions')
          .delete()
          .eq('exam_id', selectedExamId)
          .eq('student_id', studentId);

        if (error) throw error;

        setExcludedStudentIds(prev => {
          const next = new Set(prev);
          next.delete(studentId);
          return next;
        });
        showToast('Student re-included in exam', 'success');
      } else {
        // Exclude (Insert into exclusions)
        const { error } = await supabase
          .from('exam_exclusions')
          .insert({
            exam_id: selectedExamId,
            student_id: studentId,
            school_id: user?.school_id,
            reason: 'Manually excluded'
          });

        if (error) throw error;

        setExcludedStudentIds(prev => new Set(prev).add(studentId));
        showToast('Student excluded from exam', 'success');
      }
    } catch (error: any) {
      console.error('Error toggling exclusion:', error);
      showToast('Failed to update status: ' + error.message, 'error');
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.roll_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.father_name && student.father_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <PageContainer>
      <Header>
        <TitleGroup>
          <BackButton onClick={() => navigate(-1)} title="Back">
            <ArrowBackIcon />
          </BackButton>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Title>Exam Exclusions</Title>
            <Subtitle>Manage excluded students</Subtitle>
          </div>
        </TitleGroup>

        <HeaderControls>
          <ExamSelect
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
          >
            <option value="">Choose Exam...</option>
            {exams.map(exam => (
              <option key={exam.id} value={exam.id}>{exam.name}</option>
            ))}
          </ExamSelect>

          <ClassSelect
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setSelectedSectionId('');
            }}
          >
            <option value="">Choose Class...</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </ClassSelect>

          <SectionSelect
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            disabled={!selectedClassId || sections.length === 0}
          >
            <option value="">All Sections</option>
            {sections.map(section => (
              <option key={section.id} value={section.id}>{section.name}</option>
            ))}
          </SectionSelect>

          <ResponsiveSearchComp>
            <SearchIconWrapper style={{ left: '10px' }}>
              <SearchIcon style={{ fontSize: '1.1rem' }} />
            </SearchIconWrapper>
            <ResponsiveSearchInput
              placeholder="Search Student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </ResponsiveSearchComp>
        </HeaderControls>
      </Header>

      {loading ? (
        <Loader />
      ) : (
        <StudentsList>
          {!selectedExamId || !selectedClassId ? (
            <EmptyState>
              <FilterListIcon style={{ fontSize: '4rem', opacity: 0.2 }} />
              <h3>Ready to Filter</h3>
              <p>Please select both an examination and a class to view the student list.</p>
            </EmptyState>
          ) : filteredStudents.length === 0 ? (
            <EmptyState>
              <PersonOffIcon style={{ fontSize: '4rem', opacity: 0.2 }} />
              <h3>No Students Found</h3>
              <p>No active students found in the selected class matching your search.</p>
            </EmptyState>
          ) : (
            <>
              <ListHeader>
                <span>Student Details</span>
                <span>Exclusion Status</span>
              </ListHeader>
              <div style={{ padding: '0 12px 12px 12px' }}>
                {filteredStudents.map(student => {
                  const isExcluded = excludedStudentIds.has(student.id);
                  return (
                    <StudentItem key={student.id} isExcluded={isExcluded}>
                      <StudentInfo>
                        <AvatarPlaceholder>
                          {student.name.charAt(0).toUpperCase()}
                        </AvatarPlaceholder>
                        <StudentDetails>
                          <StudentName isExcluded={isExcluded}>
                            {student.name}
                            {isExcluded && <span style={{ fontSize: '0.8em', marginLeft: '6px', opacity: 0.7 }}>(Excluded)</span>}
                          </StudentName>
                          <StudentMeta>
                            <MetaItem>
                              <span className="meta-label">Roll No: </span>{student.roll_number || 'N/A'}
                            </MetaItem>
                            <MetaItem>
                              <span className="meta-label">Father: </span>{student.father_name || 'N/A'}
                            </MetaItem>
                          </StudentMeta>
                        </StudentDetails>
                      </StudentInfo>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {isExcluded && (
                          <ExcludedBadge>
                            <CancelIcon fontSize="small" /> Excluded
                          </ExcludedBadge>
                        )}
                        {!isExcluded && (
                          <span style={{
                            color: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            background: '#10b98115',
                            padding: '4px 8px',
                            borderRadius: '6px'
                          }} className="mobile-hide-text">
                            <CheckCircleIcon fontSize="small" />
                            <span style={{ display: 'inline' }} className="desktop-only-text">Included</span>
                          </span>
                        )}

                        <ActionButton
                          variant={isExcluded ? 'success' : 'danger'}
                          onClick={() => handleToggleExclusion(student.id)}
                        >
                          {isExcluded ? (
                            <>
                              <CheckCircleIcon fontSize="small" /> Re-include
                            </>
                          ) : (
                            <>
                              <PersonOffIcon fontSize="small" /> Exclude
                            </>
                          )}
                        </ActionButton>
                      </div>
                    </StudentItem>
                  );
                })}
              </div>
            </>
          )}
        </StudentsList>
      )}
    </PageContainer>
  );
};

export default StudentExclusionManager;
