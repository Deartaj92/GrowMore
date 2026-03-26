import React, { useState, useEffect, useRef } from 'react';
import styled, { useTheme, createGlobalStyle, css } from 'styled-components';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { PageHeaderContext } from '../components/Layout';
import Loader from '../components/Loader';
import { Print, Badge as BadgeIcon } from '@mui/icons-material';
import { pdf } from '@react-pdf/renderer';
import StudentCardsPDFDocument from '../components/StudentCardsPDFDocument';
import { getStudentDisplayId } from '../utils/studentUtils';
import {
  CARD_RADIUS_LG,
  clayPanelStyle,
  getButtonPalette,
  getLayoutPalette,
  isDark as checkIsDark,
  clayInputStyle,
  minimalSelectMenuStyle,
} from '../styles/DesignSystem';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 100%;
  padding: 0 10px 1rem 10px;
  background: ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    const dark = checkIsDark(theme);
    return `
      radial-gradient(circle at top left, ${dark ? 'rgba(255, 255, 255, 0.035)' : `${theme.ACCENT}10`} 0%, transparent 26%),
      linear-gradient(180deg, rgba(255,255,255,${dark ? '0.02' : '0.35'}) 0%, transparent 18%),
      ${layout.shellBg}
    `;
  }};
`;

const PrintGlobalStyle = createGlobalStyle`
  @media print {
    @page {
      margin: 10mm;
    }
    
    body {
      background-color: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    body * {
      visibility: hidden;
    }
    
    #print-section, #print-section * {
      visibility: visible;
    }
    
    #print-section {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
    }
  }
`;

const Header = styled.div`
  ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    return css`
      ${clayPanelStyle}
      border: 1px solid ${layout.shellBorder};
      box-shadow: ${layout.surfaceShadow};
    `;
  }}
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin: 8px 0 6px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  border-radius: ${CARD_RADIUS_LG};
  padding: 8px 10px;
  min-height: 36px;

  @media print {
    display: none;
  }
`;

const SEGMENTED_HEIGHT = '30px';

const SegmentedGroup = styled.div`
  ${({ theme }) => {
    const layout = getLayoutPalette(theme);
    return css`
      background: ${layout.surfaceBg};
      border: 1px solid ${layout.surfaceBorder};
      box-shadow: ${layout.surfaceShadow};
    `;
  }}
  display: flex;
  align-items: center;
  border-radius: ${CARD_RADIUS_LG};
  overflow: hidden;
  @media (max-width: 700px) {
    width: 100%;
    justify-content: center;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
  }
`;

const SegmentedSelect = styled.select<{ first?: boolean; last?: boolean }>`
  ${clayInputStyle}
  ${minimalSelectMenuStyle}
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  height: ${SEGMENTED_HEIGHT};
  line-height: 1;
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  padding: 0 1.8rem 0 0.72rem;
  border-right: 1px solid ${({ theme }) => getLayoutPalette(theme).shellDivider};
  &:last-child { border-right: none; }
  border-radius: 0;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  @media (max-width: 700px) {
    width: 100%;
    min-width: 0;
  }
`;

const SegmentedButton = styled.button<{ first?: boolean; last?: boolean }>`
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  height: ${SEGMENTED_HEIGHT};
  line-height: 1;
  border: none;
  outline: none;
  transition: background 0.2s;
  appearance: none;
  ${({ theme }) => {
    const buttons = getButtonPalette(theme);
    return css`
      background: ${buttons.primaryBg};
      color: ${buttons.primaryText};
      box-shadow: ${buttons.primaryShadow};
    `;
  }}
  padding: 0 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.35em;
  border-radius: 0;
  cursor: pointer;
  &:hover {
    box-shadow: ${({ theme }) => getButtonPalette(theme).primaryHoverShadow};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  @media (max-width: 700px) {
    width: 100%;
    min-width: 0;
  }
`;

const PrintContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;

  @media print {
    display: block;
    gap: 0;
  }
`;

const CardTemplate = styled.div`
  width: 3.375in;
  height: 2.125in;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  position: relative;
  page-break-inside: avoid;
  overflow: hidden;
  box-shadow: 0 4px 10px rgba(0,0,0,0.08);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;

  @media print {
    border: 1px solid #e5e7eb;
    box-shadow: none;
    margin: 10px;
    float: left;
  }
`;

const CardBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;

  &::before {
    content: '';
    position: absolute;
    top: -26%;
    left: -10%;
    width: 120%;
    height: 118px;
    background: #2cb742; /* green curve */
    border-radius: 50%;
    transform: rotate(2deg);
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -26%;
    left: -15%;
    width: 130%;
    height: 110px;
    background: #191636; /* navy curve */
    border-radius: 50%;
    transform: rotate(5deg);
  }
`;

const BottomBorder = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 5px;
  background: #4ab44b;
  z-index: 10;
`;

const CardContentWrapper = styled.div`
  position: relative;
  z-index: 10;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const HeaderContent = styled.div`
  width: 100%;
  height: 68px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 5px 10px 0 10px;
  gap: 10px;
`;

const SchoolLogoWrapper = styled.div`
  width: 56px;
  height: 56px;
  min-width: 56px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -10px;
  overflow: hidden;

  img {
    width: 94%;
    height: 94%;
    object-fit: contain;
    border-radius: 50%;
  }
`;

const HeaderTextCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: -10px;
  flex: 1;
  color: white;
  min-width: 0;
`;

const SchoolName = styled.div`
  font-size: 0.80rem;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.1;
  width: 100%;
`;

const SchoolAddress = styled.div`
  font-size: 0.40rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-top: 3px;
  color: #e5e7eb;
  text-align: center;
  width: 100%;
`;

const CardBody = styled.div`
  flex: 1;
  padding: 0 5px 0 10px;
  display: flex;
`;

const LeftSection = styled.div`
  width: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 15px;
`;

const PhotoOuterView = styled.div`
  width: 68px;
  height: 80px;
  border-radius: 4px;
  background: transparent;
  padding: 0;
  border: none;
`;

const PhotoContainer = styled.div`
  width: 100%;
  height: 100%;
  background: #e5e7eb;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #9ca3af;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const SignatureSection = styled.div`
  margin-top: auto;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const SignatureImgPlaceholder = styled.div`
  width: 50px;
  height: 10px;
  border-bottom: 1px solid #1f2937;
  margin-bottom: 2px;
`;

const SignatureText = styled.div`
  font-size: 0.45rem;
  font-weight: 700;
  color: #1a1835;
`;

const RightSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-left: 20px;
  padding-top: 5px;
`;

const IdPillWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
  margin-left: -20px;
`;

const IdPill = styled.div`
  background: #d32f2f;
  color: white;
  font-size: 0.45rem;
  font-weight: 800;
  padding: 2px 10px;
  border-radius: 12px;
  letter-spacing: 0.5px;
`;

const InfoGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const InfoRow = styled.div`
  display: flex;
  font-size: 0.52rem;
  line-height: 1.2;
`;

const InfoLabel = styled.span`
  width: 68px;
  font-weight: 700;
  color: #1a1835;
`;

const InfoSeparator = styled.span`
  margin: 0 6px 0 2px;
  color: #1a1835;
  font-weight: 700;
`;

const InfoValue = styled.span<{ $highlight?: boolean }>`
  flex: 1;
  font-weight: ${({ $highlight }) => $highlight ? '800' : '600'};
  color: ${({ $highlight }) => $highlight ? '#d32f2f' : '#374151'};
`;

const EmptyState = styled.div`
  text-align: center;
  ${clayPanelStyle}
  padding: 2rem;
  background: ${({ theme }) => getLayoutPalette(theme).surfaceBg};
  border-radius: ${CARD_RADIUS_LG};
  color: ${({ theme }) => getLayoutPalette(theme).shellMutedText};
  border: 1px solid ${({ theme }) => getLayoutPalette(theme).shellBorder};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;

  svg {
    font-size: 3rem;
    opacity: 0.5;
  }
`;

const StudentCardsPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const { setPageHeader } = React.useContext(PageHeaderContext);
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');

  const [students, setStudents] = useState<any[]>([]);
  const [schoolProfile, setSchoolProfile] = useState<any>(null);
  const [sessionEndDate, setSessionEndDate] = useState<string | null>(null);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    setPageHeader('Student Cards');
  }, [setPageHeader]);

  useEffect(() => {
    if (!user?.school_id) return;

    const fetchInitialData = async () => {
      try {
        // Fetch School Profile
        const [{ data: profileData }, { data: schoolData }] = await Promise.all([
          supabase.from('institute_profile').select('*').eq('school_id', user.school_id).single(),
          supabase.from('schools').select('*').eq('id', user.school_id).single()
        ]);

        setSchoolProfile({
          name: profileData?.name || schoolData?.name || 'GROW MORE ERPS',
          address: profileData?.address || schoolData?.address || 'YOUR SCHOOL ADDRESS HERE',
          logo_url: profileData?.logo_url || schoolData?.logo_url || null
        });

        // Fetch Session End Date
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('end_date')
          .eq('school_id', user.school_id)
          .eq('is_active', true)
          .single();

        if (sessionData && sessionData.end_date) {
          setSessionEndDate(sessionData.end_date);
        }

        // Fetch Classes & Sections
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('id, name')
          .eq('school_id', user.school_id)
          .order('name');

        if (classesError) throw classesError;
        setClasses(classesData || []);

        const { data: sectionsData, error: sectionsError } = await supabase
          .from('sections')
          .select('id, class_id, name')
          .eq('school_id', user.school_id)
          .order('name');

        if (sectionsError) throw sectionsError;
        setSections(sectionsData || []);

      } catch (err: any) {
        toast.showToast('Failed to load initial data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user]);

  useEffect(() => {
    if (!selectedClass || !user?.school_id) return;

    const fetchStudents = async () => {
      setFetching(true);
      try {
        let query = supabase
          .from('students')
          .select('*')
          .eq('school_id', user.school_id)
          .eq('class_id', selectedClass)
          .eq('status', 'active');

        if (selectedSection) {
          query = query.eq('section_id', selectedSection);
        }

        const { data, error } = await query;
        if (error) throw error;
        setStudents(data || []);
      } catch (error) {
        toast.showToast("Failed to fetch students", 'error');
      } finally {
        setFetching(false);
      }
    };

    fetchStudents();
  }, [selectedClass, selectedSection, user]);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const doc = <StudentCardsPDFDocument students={students} schoolProfile={schoolProfile} classes={classes} sections={sections} />;
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Student_Cards.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.showToast('Failed to generate PDF', 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const filteredSections = sections.filter(s => s.class_id.toString() === selectedClass);

  if (loading) return <Loader />;

  return (
    <Container>
      <Header>
        <SegmentedGroup>
          <SegmentedSelect
            first
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedSection('');
            }}
          >
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SegmentedSelect>

          <SegmentedSelect
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={!selectedClass}
          >
            <option value="">All Sections</option>
            {filteredSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </SegmentedSelect>

          <SegmentedButton
            last
            onClick={handleDownloadPDF}
            disabled={!students.length || fetching || isGeneratingPDF}
            style={{ opacity: (!students.length || fetching || isGeneratingPDF) ? 0.5 : 1 }}
          >
            <Print style={{ fontSize: 16 }} />
            {isGeneratingPDF ? 'Generating...' : 'PDF Cards'}
          </SegmentedButton>
        </SegmentedGroup>
      </Header>

      {fetching ? (
        <Loader />
      ) : students.length > 0 ? (
        <PrintContainer id="print-section">
          <PrintGlobalStyle />
          {students.map(student => (
            <CardTemplate key={student.id}>
              <CardBackground />
              <BottomBorder />

              <CardContentWrapper>
                <HeaderContent>
                  {schoolProfile?.logo_url && (
                    <SchoolLogoWrapper>
                      <img src={schoolProfile.logo_url} alt="Logo" />
                    </SchoolLogoWrapper>
                  )}
                  <HeaderTextCol>
                    <SchoolName>{schoolProfile?.name || 'YOUR SCHOOL NAME HERE'}</SchoolName>
                    <SchoolAddress>{schoolProfile?.address || 'YOUR SCHOOL ADDRESS HERE'}</SchoolAddress>
                  </HeaderTextCol>
                </HeaderContent>

                <CardBody>
                  <LeftSection>
                    <PhotoOuterView>
                      <PhotoContainer>
                        {student.picture_url ? (
                          <img src={student.picture_url} alt={student.name} />
                        ) : (
                          <BadgeIcon style={{ fontSize: 36, color: '#ccc' }} />
                        )}
                      </PhotoContainer>
                    </PhotoOuterView>

                    <SignatureSection>
                      <SignatureImgPlaceholder />
                      <SignatureText>Principal</SignatureText>
                    </SignatureSection>
                  </LeftSection>

                  <RightSection>
                    <IdPillWrapper>
                      <IdPill>IDENTITY CARD</IdPill>
                    </IdPillWrapper>

                    <InfoGrid>
                      <InfoRow>
                        <InfoLabel>Name</InfoLabel><InfoSeparator>:</InfoSeparator><InfoValue $highlight>{student.name}</InfoValue>
                      </InfoRow>
                      <InfoRow>
                        <InfoLabel>Father's Name</InfoLabel><InfoSeparator>:</InfoSeparator><InfoValue>{student.father_name || '-'}</InfoValue>
                      </InfoRow>
                      <InfoRow>
                        <InfoLabel>Class</InfoLabel><InfoSeparator>:</InfoSeparator><InfoValue>{classes.find(c => c.id === student.class_id)?.name || '-'} {student.section_id && sections.find(s => s.id === student.section_id) ? `(${sections.find(s => s.id === student.section_id)?.name})` : ''}</InfoValue>
                      </InfoRow>
                      <InfoRow>
                        <InfoLabel>Date of Birth</InfoLabel><InfoSeparator>:</InfoSeparator><InfoValue>{student.dob ? new Date(student.dob).toLocaleDateString() : '-'}</InfoValue>
                      </InfoRow>
                      <InfoRow>
                        <InfoLabel>Roll No.</InfoLabel><InfoSeparator>:</InfoSeparator><InfoValue>{getStudentDisplayId({ id: student.id, roll_number: student.roll_number })}</InfoValue>
                      </InfoRow>
                      {(student.guardian_phone || student.emergency_contact) && (
                        <InfoRow>
                          <InfoLabel>Contact No.</InfoLabel><InfoSeparator>:</InfoSeparator><InfoValue>{student.guardian_phone || student.emergency_contact}</InfoValue>
                        </InfoRow>
                      )}
                    </InfoGrid>
                  </RightSection>
                </CardBody>
              </CardContentWrapper>
            </CardTemplate>
          ))}
        </PrintContainer>
      ) : (
        <EmptyState>
          <BadgeIcon />
          {selectedClass ? 'No students found in the selected class/section.' : 'Select a class to generate student ID cards.'}
        </EmptyState>
      )}

    </Container>
  );
};

export default StudentCardsPage;
