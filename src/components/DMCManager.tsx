import React, { useState, useEffect, useRef, useContext } from 'react';
import styled, { css } from 'styled-components';
import { supabase } from '../supabaseClient';
import {
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Search as SearchIcon,
  FilterList as FilterIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Close as CloseIcon,
  MoreVert as MoreIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  RemoveCircleOutline as UnlinkIcon,
  Assessment as AssessmentIcon,
  CalendarToday as CalendarIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  CloudDownload as CloudDownloadIcon
} from '@mui/icons-material';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { ThemeProvider } from 'styled-components';
import { useToast } from '../components/useToast';
import { useAuth } from '../contexts/AuthContext';
import { examinationService } from '../services/examinationService';
import { Examination, DMCTemplate, ExamMasterSheet } from '../types/examinations';

// Styled Components (copied and adapted from SubjectManager)
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
  /* Hardware acceleration for container */
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

const HeaderFilters = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border-radius: 8px;
  box-shadow: 0 1px 4px #0001;
  padding: 6px 8px;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.FIELD_BG};
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 6px;
  padding: 2px 6px;
  min-width: 120px;
  max-width: 180px;
  width: 100%;
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.8rem;
  outline: none;
  width: 100%;
  margin-left: 4px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;

  ${({ variant, theme }) => {
    switch (variant) {
      case 'primary':
        return `
          background: #4a6cf7;
          color: white;
  &:hover {
            background: #3a5ce5;
            transform: translateY(-1px);
          }
        `;
      case 'secondary':
        return `
          background: ${theme === 'dark' ? '#252525' : '#f7faff'};
          color: #4a6cf7;
          border: 1px solid ${theme === 'dark' ? '#3a3f4b' : '#b6c2d9'};
          &:hover {
            background: ${theme === 'dark' ? 'rgba(74, 108, 247, 0.18)' : 'rgba(74, 108, 247, 0.15)'};
            border-color: #4a6cf7;
          }
        `;
      case 'danger':
        return `
          background: #ef4444;
          color: white;
          &:hover {
            background: #dc2626;
          }
        `;
      default:
        return '';
    }
  }}
`;

const DMCManager: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const themeObj = theme === 'dark' ? darkTheme : lightTheme;
  const { showToast } = useToast();
  const { user } = useAuth();
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [templates, setTemplates] = useState<DMCTemplate[]>([]);
  const [selectedExam, setSelectedExam] = useState<Examination | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<DMCTemplate | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.school_id) {
      loadExaminations();
      loadTemplates();
    }
  }, [user?.school_id]);

  const loadExaminations = async () => {
    if (!user?.school_id) return;
    try {
      setLoading(true);
      const data = await examinationService.getExaminations({ status: 'published' }, user.school_id);
      setExaminations(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch examinations');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    if (!user?.school_id) return;
    try {
      const data = await examinationService.getDMCTemplates(user.school_id);
      setTemplates(data);
      if (data.length > 0) {
        setSelectedTemplate(data[0]);
      }
    } catch (err) {
    }
  };

  const handleGenerateDMC = async () => {
    if (!selectedExam || selectedStudents.length === 0) {
      showToast('Please select an examination and students', 'error');
      return;
    }

    try {
      await examinationService.exportDMC({
        exam_id: selectedExam.id,
        student_ids: selectedStudents,
        template_id: selectedTemplate?.id,
        export_options: {
          format: 'pdf',
          include_remarks: true,
          include_analytics: false
        }
      });
      showToast('DMC generated successfully', 'success');
    } catch (err) {
      showToast('Failed to generate DMC', 'error');
    }
  };

  // Check if user has school_id
  if (!user?.school_id) {
    return (
      <ThemeProvider theme={themeObj}>
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
            <InfoIcon style={{ fontSize: '1.5rem' }} />
            No school context found. Please contact your administrator.
          </div>
        </PageContainer>
      </ThemeProvider>
    );
  }

  if (loading) return (
    <ThemeProvider theme={themeObj}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '2rem',
        color: themeObj.TEXT_SECONDARY
      }}>
        Loading DMC Manager...
      </div>
    </ThemeProvider>
  );

  return (
    <ThemeProvider theme={themeObj}>
      <PageContainer>
        <Header>
          <Title theme={themeObj}>
            DMC Generation <span style={{fontWeight:400, fontSize:'1rem', color: theme === 'dark' ? '#b0b8d1' : '#4a4a4a'}}>({templates.length} templates)</span>
          </Title>
        </Header>

        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <WarningIcon /> {error}
          </div>
        )}

        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h3 style={{ marginBottom: '0.5rem', color: themeObj.TEXT_PRIMARY }}>Select Examination</h3>
            <select
              value={selectedExam?.id || ''}
              onChange={(e) => {
                const exam = examinations.find(exam => exam.id === parseInt(e.target.value));
                setSelectedExam(exam || null);
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${themeObj.FIELD_BORDER}`,
                borderRadius: '8px',
                background: themeObj.FIELD_BG,
                color: themeObj.TEXT_PRIMARY,
                fontSize: '1rem',
                outline: 'none'
              }}
            >
              <option value="">Select an examination...</option>
              {examinations.map(exam => (
                <option key={exam.id} value={exam.id}>{exam.name}</option>
              ))}
            </select>
          </div>

          <div>
            <h3 style={{ marginBottom: '0.5rem', color: themeObj.TEXT_PRIMARY }}>Select Template</h3>
            <select
              value={selectedTemplate?.id || ''}
              onChange={(e) => {
                const template = templates.find(t => t.id === parseInt(e.target.value));
                setSelectedTemplate(template || null);
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${themeObj.FIELD_BORDER}`,
                borderRadius: '8px',
                background: themeObj.FIELD_BG,
                color: themeObj.TEXT_PRIMARY,
                fontSize: '1rem',
                outline: 'none'
              }}
            >
              <option value="">Select a template...</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </div>

          <div>
            <h3 style={{ marginBottom: '0.5rem', color: themeObj.TEXT_PRIMARY }}>Student Selection</h3>
            <p style={{ color: themeObj.TEXT_SECONDARY, fontSize: '0.9rem' }}>
              Student selection will be implemented based on your requirements.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={handleGenerateDMC}
            disabled={!selectedExam || selectedStudents.length === 0}
            style={{ alignSelf: 'flex-start' }}
          >
            <CloudDownloadIcon />
            Generate DMC
          </Button>
        </div>
      </PageContainer>
    </ThemeProvider>
  );
};

export default DMCManager;
