import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'styled-components';
import styled from 'styled-components';
import { Cake, OpenInNew } from '@mui/icons-material';
import { clayCardStyle, isDark, CARD_RADIUS_LG, getDashboardPalette } from '../../../../styles/DesignSystem';
import { getStudentDisplayId } from '../../../../utils/studentUtils';
import { formatAppDate } from '../../../../utils/dateUtils';
import { ageCompletedYearsOnDate } from '../../utils/dashboardUtils';

const Container = styled.div`
  display: contents;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.75rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const HeroCard = styled.div`
  ${clayCardStyle}
  padding: 1.35rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  border-radius: ${CARD_RADIUS_LG};
`;

const HeroLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const HeroIconWrap = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) =>
    isDark(theme) ? 'rgba(236, 72, 153, 0.18)' : 'rgba(236, 72, 153, 0.12)'};
  color: #ec4899;
  box-shadow: ${({ theme }) =>
    isDark(theme)
      ? 'inset 0 1px 3px rgba(255,255,255,0.06)'
      : 'inset 0 1px 3px rgba(255,255,255,0.85)'};
  svg {
    font-size: 1.75rem !important;
  }
`;

const HeroTitle = styled.div`
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const HeroSubtitle = styled.div`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 0.2rem;
`;

const CountBadge = styled.div`
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-variant-numeric: tabular-nums;
`;

const CountLabel = styled.div`
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 0.35rem;
  text-align: right;
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.5rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const StudentCard = styled.button`
  ${clayCardStyle}
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  padding: 0;
  border: none;
  cursor: pointer;
  border-radius: ${CARD_RADIUS_LG};
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.ACCENT};
    outline-offset: 2px;
  }
`;

const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 1.1rem 1.15rem 0.85rem;
`;

const Avatar = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  overflow: hidden;
  flex-shrink: 0;
  background: ${({ theme }) =>
    isDark(theme) ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  font-weight: 800;
  color: ${({ theme }) => theme.ACCENT};
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const CardBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const StudentName = styled.div`
  font-size: 1rem;
  font-weight: 800;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  letter-spacing: -0.02em;
  line-height: 1.25;
`;

const MetaRow = styled.div`
  font-size: 0.78rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 0.35rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.65rem;
  align-items: center;
`;

const Dot = styled.span`
  opacity: 0.45;
`;

const GenderChip = styled.span<{ $g: string }>`
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px 8px;
  border-radius: 999px;
  background: ${({ $g }) =>
    $g === 'Female' || $g === 'female'
      ? 'rgba(236,72,153,0.18)'
      : $g === 'Male' || $g === 'male'
        ? 'rgba(59,130,246,0.18)'
        : 'rgba(100,116,139,0.15)'};
  color: ${({ $g }) =>
    $g === 'Female' || $g === 'female'
      ? '#db2777'
      : $g === 'Male' || $g === 'male'
        ? '#2563eb'
        : '#64748b'};
`;

const CardFooter = styled.div`
  padding: 0.65rem 1.15rem 1rem;
  border-top: 1px solid
    ${({ theme }) =>
      isDark(theme) ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;

const AgeHighlight = styled.div`
  font-size: 0.82rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
`;

const OpenHint = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  svg {
    font-size: 0.95rem !important;
    opacity: 0.85;
  }
`;

export interface BirthdayStudentRow {
  id: number;
  name: string;
  dob: string;
  gender?: string | null;
  father_name?: string | null;
  picture_url?: string | null;
  roll_number?: string | null;
  class_id?: number | null;
  section_id?: number | null;
}

interface BirthdaysTabProps {
  birthdays: BirthdayStudentRow[];
  getClassName: (classId: any) => string;
  getSectionName: (sectionId: any) => string;
}

const BirthdaysTab: React.FC<BirthdaysTabProps> = ({ birthdays, getClassName, getSectionName }) => {
  const theme = useTheme() as any;
  const navigate = useNavigate();
  const palette = getDashboardPalette(theme);
  const subtleText = palette.subtleText;

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Container>
      <StatsGrid>
        <HeroCard theme={theme}>
          <HeroLeft>
            <HeroIconWrap theme={theme}>
              <Cake />
            </HeroIconWrap>
            <div>
              <HeroTitle theme={theme}>Birthdays today</HeroTitle>
              <HeroSubtitle theme={theme}>{todayLabel}</HeroSubtitle>
            </div>
          </HeroLeft>
          <div>
            <CountBadge theme={theme}>{birthdays.length}</CountBadge>
            <CountLabel theme={theme}>
              {birthdays.length === 1 ? 'Student' : 'Students'}
            </CountLabel>
          </div>
        </HeroCard>
      </StatsGrid>

      <CardGrid>
        {birthdays.map((student) => {
          const className = getClassName(student.class_id);
          const sectionName = getSectionName(student.section_id);
          const displayId = getStudentDisplayId({
            id: student.id,
            roll_number: student.roll_number,
          });
          const age = student.dob ? ageCompletedYearsOnDate(student.dob) : 0;
          const g = student.gender || '';

          return (
            <StudentCard
              key={student.id}
              type="button"
              theme={theme}
              onClick={() => navigate(`/students/profile/${student.id}`)}
            >
              <CardTop>
                <Avatar theme={theme}>
                  {student.picture_url ? (
                    <img
                      src={student.picture_url}
                      alt=""
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    (student.name || '?').charAt(0).toUpperCase()
                  )}
                </Avatar>
                <CardBody>
                  <StudentName theme={theme}>{student.name || 'Student'}</StudentName>
                  <MetaRow theme={theme} style={{ color: subtleText }}>
                    <span>ID {displayId}</span>
                    <Dot>·</Dot>
                    <span>
                      {className}
                      {sectionName ? ` (${sectionName})` : ''}
                    </span>
                    {(g === 'Male' ||
                      g === 'male' ||
                      g === 'Female' ||
                      g === 'female') && (
                      <GenderChip $g={g} theme={theme}>
                        {g}
                      </GenderChip>
                    )}
                  </MetaRow>
                  {student.father_name ? (
                    <MetaRow theme={theme} style={{ marginTop: '0.25rem', fontSize: '0.72rem' }}>
                      Father: {student.father_name}
                    </MetaRow>
                  ) : null}
                </CardBody>
              </CardTop>
              <CardFooter theme={theme}>
                <AgeHighlight theme={theme}>
                  Turns <strong>{age}</strong> today · DOB{' '}
                  {student.dob ? formatAppDate(student.dob) : '—'}
                </AgeHighlight>
                <OpenHint theme={theme}>
                  Profile
                  <OpenInNew />
                </OpenHint>
              </CardFooter>
            </StudentCard>
          );
        })}
      </CardGrid>
    </Container>
  );
};

export default BirthdaysTab;
