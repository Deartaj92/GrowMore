import React from 'react';
import { useTheme } from 'styled-components';
import styled from 'styled-components';
import {
  QuestionAnswer,
  School,
  Group,
  AttachMoney,
  People,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import DottedLoader from '../shared/DottedLoader';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList
} from 'recharts';
import {
  DashboardDateInput
} from '../../styles';
import { getCurrentMonthRange } from '../../utils/dashboardUtils';

// Helper function to check if theme is dark
const isDark = (themeObj: any) => themeObj.BG === '#252525' || themeObj.BG === '#181c2a';

// ===== STYLED COMPONENTS (Matching FeeAnalytics structure) =====

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.375rem;
  }
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1rem;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    gap: 0.375rem;
  }
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  @media (max-width: 768px) {
    font-size: 0.7rem;
  }
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const StatChange = styled.div<{ $positive?: boolean }>`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $positive }) => $positive ? '#22c55e' : '#ef4444'};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ContentCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1.5rem;
  border: ${({ theme }) => isDark(theme)
    ? '1px solid rgba(255, 255, 255, 0.05)'
    : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => isDark(theme)
    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
    : '0 4px 20px rgba(0, 0, 0, 0.1)'};
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const CardTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-align: center;
`;

const Container = styled.div`
  display: contents;
`;

const DateRangeContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 0.25rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  
  @media (max-width: 768px) {
    gap: 0.5rem;
    margin-bottom: 0.2rem;
  }
`;

interface AdmissionsTabProps {
  admissionsDateFrom: string;
  setAdmissionsDateFrom: (date: string) => void;
  admissionsDateTo: string;
  setAdmissionsDateTo: (date: string) => void;
  admissionsLoading: boolean;
  admissionsData: any;
  admissionsChartData: any[];
  withdrawalsChartData: any[];
  genderChartData: any[];
  classStrengths: any[];
  latestAdmissions: any[];
  todaysBirthdays: any[];
}

const AdmissionsTab: React.FC<AdmissionsTabProps> = ({
  admissionsDateFrom,
  setAdmissionsDateFrom,
  admissionsDateTo,
  setAdmissionsDateTo,
  admissionsLoading,
  admissionsData,
  admissionsChartData,
  withdrawalsChartData,
  genderChartData,
  classStrengths,
  latestAdmissions,
  todaysBirthdays
}) => {
  const theme = useTheme() as any;
  const isDark = theme.BG === '#252525' || theme.BG === '#181c2a';

  return (
    <Container>
      {/* Date Range Selector for Admissions */}
      <DateRangeContainer>
        <DashboardDateInput
          type="date"
          value={admissionsDateFrom}
          onChange={(e) => {
            const newDate = e.target.value;
            setAdmissionsDateFrom(newDate);
          }}
          title="From Date"
        />
        <span style={{ color: isDark ? '#888' : '#666', fontWeight: 500 }}>to</span>
        <DashboardDateInput
          type="date"
          value={admissionsDateTo}
          onChange={(e) => {
            const newDate = e.target.value;
            setAdmissionsDateTo(newDate);
          }}
          title="To Date"
        />
      </DateRangeContainer>

      {admissionsLoading ? (
        <EmptyState theme={theme}>
          <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
        </EmptyState>
      ) : (
        <>
          {/* Summary Cards */}
          <StatsGrid theme={theme}>
            <StatCard theme={theme}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                <StatLabel theme={theme}>Inquiries</StatLabel>
                <QuestionAnswer style={{ fontSize: '1.25rem', color: '#3b82f6' }} />
              </div>
              <StatValue theme={theme}>
                {admissionsLoading ? <DottedLoader /> : (admissionsData?.totalInquiries || 0)}
              </StatValue>
              <StatChange $positive={true} theme={theme}>
                Selected Range: {admissionsLoading ? <DottedLoader size={0.7} /> : (admissionsData?.inquiriesThisMonth || 0)}
              </StatChange>
            </StatCard>

            <StatCard theme={theme}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                <StatLabel theme={theme}>Students</StatLabel>
                <School style={{ fontSize: '1.25rem', color: '#22c55e' }} />
              </div>
              <StatValue theme={theme}>
                {admissionsLoading ? <DottedLoader /> : (admissionsData?.totalStudents || 0)}
              </StatValue>
              <StatChange $positive={true} theme={theme}>
                Selected Range: {admissionsLoading ? <DottedLoader size={0.7} /> : (admissionsData?.studentsThisMonth || 0)}
              </StatChange>
            </StatCard>

            <StatCard theme={theme}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                <StatLabel theme={theme}>Families</StatLabel>
                <Group style={{ fontSize: '1.25rem', color: '#f59e0b' }} />
              </div>
              <StatValue theme={theme}>
                {admissionsLoading ? <DottedLoader /> : (admissionsData?.totalFamilies || 0)}
              </StatValue>
              <StatChange $positive={true} theme={theme}>
                Selected Range: {admissionsLoading ? <DottedLoader size={0.7} /> : (admissionsData?.familiesThisMonth || 0)}
              </StatChange>
            </StatCard>

            <StatCard theme={theme}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                <StatLabel theme={theme}>Fee Plans</StatLabel>
                <AttachMoney style={{ fontSize: '1.25rem', color: '#ef4444' }} />
              </div>
              <StatValue theme={theme}>
                {admissionsLoading ? <DottedLoader /> : (admissionsData?.totalFeePlans || 0)}
              </StatValue>
              <StatChange $positive={true} theme={theme}>
                Selected Range: {admissionsLoading ? <DottedLoader size={0.7} /> : (admissionsData?.feePlansThisMonth || 0)}
              </StatChange>
            </StatCard>
          </StatsGrid>

          {/* Charts */}
          <ContentGrid theme={theme}>
            <ContentCard theme={theme}>
              <CardTitle theme={theme}>Admissions</CardTitle>
              <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={admissionsChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: isDark ? '#888' : '#666', fontSize: 12 }}
                        stroke={isDark ? '#888' : '#666'}
                      />
                      <YAxis
                        tick={{ fill: isDark ? '#888' : '#666', fontSize: 12 }}
                        stroke={isDark ? '#888' : '#666'}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? '#2a2a2a' : '#fff',
                          border: `1px solid ${isDark ? '#444' : '#ddd'}`,
                          borderRadius: '8px',
                          color: isDark ? '#e2e8f0' : '#1e293b'
                        }}
                      />
                      <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                        iconType="rect"
                      />
                      <Bar dataKey="boys" stackId="a" fill="#3b82f6" name="Boys" />
                      <Bar dataKey="girls" stackId="a" fill="#ec4899" name="Girls" />
                      <LabelList
                        dataKey="total"
                        position="top"
                        style={{ fill: isDark ? '#e2e8f0' : '#1e293b', fontSize: 11 }}
                        formatter={(value: number) => value > 0 ? value : ''}
                      />
                    </BarChart>
                  </ResponsiveContainer>
            </ContentCard>

            <ContentCard theme={theme}>
              <CardTitle theme={theme}>Withdrawals</CardTitle>
              <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={withdrawalsChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: isDark ? '#888' : '#666', fontSize: 12 }}
                        stroke={isDark ? '#888' : '#666'}
                      />
                      <YAxis
                        tick={{ fill: isDark ? '#888' : '#666', fontSize: 12 }}
                        stroke={isDark ? '#888' : '#666'}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? '#2a2a2a' : '#fff',
                          border: `1px solid ${isDark ? '#444' : '#ddd'}`,
                          borderRadius: '8px',
                          color: isDark ? '#e2e8f0' : '#1e293b'
                        }}
                      />
                      <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                        iconType="rect"
                      />
                      <Bar dataKey="boys" stackId="a" fill="#ef4444" name="Boys" />
                      <Bar dataKey="girls" stackId="a" fill="#f97316" name="Girls" />
                      <LabelList
                        dataKey="students"
                        position="top"
                        style={{ fill: isDark ? '#e2e8f0' : '#1e293b', fontSize: 11 }}
                        formatter={(value: number) => value > 0 ? value : ''}
                      />
                    </BarChart>
                  </ResponsiveContainer>
            </ContentCard>

            <ContentCard theme={theme}>
              <CardTitle theme={theme}>Gender</CardTitle>
              <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={genderChartData}
                        cx="50%"
                        cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {genderChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color || '#888'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ddd',
                          borderRadius: '8px',
                      color: '#1e293b'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
            </ContentCard>
          </ContentGrid>

          {/* Additional Cards: Grade Distribution, Latest Admissions, Today's Birthdays */}
          <ContentGrid theme={theme}>
            {/* Class Wise Strength Card */}
            {classStrengths && classStrengths.length > 0 && (
              <ContentCard theme={theme} style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
              <CardTitle theme={theme} style={{ marginBottom: '1rem' }}>Class Wise Strength</CardTitle>
                <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={classStrengths}
                      layout="vertical"
                      margin={{ top: 5, right: 50, left: 0, bottom: 5 }}
                    >
                      <XAxis type="number" stroke={isDark ? '#888' : '#666'} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke={isDark ? '#888' : '#666'}
                        width={100}
                        tick={{ fill: isDark ? '#888' : '#666', fontSize: 12 }}
                        interval={0}
                      />
                      <Tooltip
                        contentStyle={{
                          background: isDark ? '#2a2a2a' : '#fff',
                          border: `1px solid ${isDark ? '#444' : '#ddd'}`,
                          borderRadius: '8px',
                          padding: '8px 12px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="boys" stackId="a" fill="#3b82f6" name="Boys" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="girls" stackId="a" fill="#22c55e" name="Girls" radius={[0, 4, 4, 0]}>
                        <LabelList
                          dataKey="total"
                          position="right"
                          style={{ fill: isDark ? '#e2e8f0' : '#1e293b', fontSize: 12, fontWeight: 600 }}
                          formatter={(value: number) => value || ''}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
              </div>
            </ContentCard>
            )}

            {/* Latest Admissions Card */}
            <ContentCard theme={theme} style={{ minHeight: '400px' }}>
              <CardTitle theme={theme}>Latest Admissions</CardTitle>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                padding: '0.5rem 0',
                maxHeight: '350px',
                overflowY: 'auto'
              }}>
                {latestAdmissions.length === 0 ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    textAlign: 'center',
                    color: isDark ? '#888' : '#666'
                  }}>
                    <People style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
                    <div style={{ fontSize: '0.95rem' }}>No recent admissions</div>
                  </div>
                ) : (
                  latestAdmissions.map((admission: any, idx: number) => {
                    const admissionDate = admission.admissionDate || admission.admission_date
                      ? new Date(admission.admissionDate || admission.admission_date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                      : 'N/A';

                    const studentName = admission.name || 'N/A';
                    const initials = studentName !== 'N/A'
                      ? studentName
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                          .slice(0, 2)
                      : 'N/A';

                    const className = admission.className || admission.class_name || 'N/A';
                    const pictureUrl = admission.pictureUrl || admission.picture_url;

                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                          borderRadius: '8px',
                          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`
                        }}
                      >
                        {pictureUrl ? (
                          <img
                            src={pictureUrl}
                            alt={studentName}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: '#6366f1',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.875rem',
                              fontWeight: 600
                            }}
                          >
                            {initials}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            color: isDark ? '#e2e8f0' : '#1e293b',
                            marginBottom: '0.25rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {studentName}
                          </div>
                          <div style={{
                            fontSize: '0.8rem',
                            color: isDark ? '#888' : '#666',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <School style={{ fontSize: '0.75rem' }} />
                            <span>{className}</span>
                            <span style={{ margin: '0 0.25rem' }}>•</span>
                            <span>{admissionDate}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ContentCard>
          </ContentGrid>

          {/* Today's Birthdays Card */}
          {(todaysBirthdays && todaysBirthdays.length > 0) || (admissionsData?.todaysBirthdaysCount > 0) ? (
          <ContentGrid theme={theme}>
            <ContentCard theme={theme} style={{
              minHeight: '200px',
              background: 'linear-gradient(135deg, #ec4899 0%, #ef4444 100%)',
              color: '#fff',
              border: 'none'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                padding: '2rem',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '4rem',
                  marginBottom: '1rem',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                }}>
                  🎂
                </div>
                <CardTitle theme={theme} style={{ color: '#fff', marginBottom: '0.5rem' }}>
                  Today's Birthdays
                </CardTitle>
                <div style={{
                  fontSize: '1rem',
                  marginBottom: '1rem',
                  opacity: 0.95
                }}>
                  {new Date().toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                    marginBottom: '1rem'
                }}>
                    {admissionsData?.todaysBirthdaysCount || todaysBirthdays?.length || 0} {(admissionsData?.todaysBirthdaysCount || todaysBirthdays?.length || 0) === 1 ? 'Birthday' : 'Birthdays'}
                </div>
                  {todaysBirthdays && todaysBirthdays.length > 0 && (
                  <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      justifyContent: 'center',
                      maxWidth: '600px'
                  }}>
                      {todaysBirthdays.slice(0, 10).map((birthday: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                            padding: '0.5rem 0.75rem',
                            background: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: '20px',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            backdropFilter: 'blur(10px)'
                          }}
                        >
                          {birthday.name || 'N/A'}
                        </div>
                      ))}
                      {todaysBirthdays.length > 10 && (
                        <div style={{
                          padding: '0.5rem 0.75rem',
                          background: 'rgba(255, 255, 255, 0.2)',
                          borderRadius: '20px',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          backdropFilter: 'blur(10px)'
                        }}>
                          +{todaysBirthdays.length - 10} more
                          </div>
                        )}
                  </div>
                )}
              </div>
            </ContentCard>
          </ContentGrid>
          ) : null}
        </>
      )}
    </Container>
  );
};

export default AdmissionsTab;
