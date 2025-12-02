import React from 'react';
import { useTheme } from 'styled-components';
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
  AdmissionsSummaryGrid,
  AdmissionsSummaryCard,
  SummaryCardHeader,
  SummaryCardTitle,
  SummaryCardIcon,
  SummaryCardValue,
  SummaryCardSubtext,
  AdmissionsChartsGrid,
  AdmissionsChartCard,
  AdmissionsChartTitle,
  DashboardDateInput
} from '../../styles';
import { getCurrentMonthRange } from '../../utils/dashboardUtils';

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
    <div style={{ width: '100%' }}>
      {/* Date Range Selector for Admissions */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'flex-end'
      }}>
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
      </div>

      {admissionsLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <RefreshIcon style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <AdmissionsSummaryGrid>
            <AdmissionsSummaryCard>
              <SummaryCardHeader>
                <SummaryCardTitle>Inquiries</SummaryCardTitle>
                <SummaryCardIcon color="#3b82f6">
                  <QuestionAnswer />
                </SummaryCardIcon>
              </SummaryCardHeader>
              <SummaryCardValue>
                {admissionsLoading ? <DottedLoader /> : (admissionsData?.totalInquiries || 0)}
              </SummaryCardValue>
              <SummaryCardSubtext>
                {admissionsLoading ? <DottedLoader size={0.7} /> : `Selected Range: ${admissionsData?.inquiriesThisMonth || 0}`}
              </SummaryCardSubtext>
            </AdmissionsSummaryCard>

            <AdmissionsSummaryCard>
              <SummaryCardHeader>
                <SummaryCardTitle>Students</SummaryCardTitle>
                <SummaryCardIcon color="#22c55e">
                  <School />
                </SummaryCardIcon>
              </SummaryCardHeader>
              <SummaryCardValue>
                {admissionsLoading ? <DottedLoader /> : (admissionsData?.totalStudents || 0)}
              </SummaryCardValue>
              <SummaryCardSubtext>
                {admissionsLoading ? <DottedLoader size={0.7} /> : `Selected Range: ${admissionsData?.studentsThisMonth || 0}`}
              </SummaryCardSubtext>
            </AdmissionsSummaryCard>

            <AdmissionsSummaryCard>
              <SummaryCardHeader>
                <SummaryCardTitle>Families</SummaryCardTitle>
                <SummaryCardIcon color="#f59e0b">
                  <Group />
                </SummaryCardIcon>
              </SummaryCardHeader>
              <SummaryCardValue>
                {admissionsLoading ? <DottedLoader /> : (admissionsData?.totalFamilies || 0)}
              </SummaryCardValue>
              <SummaryCardSubtext>
                {admissionsLoading ? <DottedLoader size={0.7} /> : `Selected Range: ${admissionsData?.familiesThisMonth || 0}`}
              </SummaryCardSubtext>
            </AdmissionsSummaryCard>

            <AdmissionsSummaryCard>
              <SummaryCardHeader>
                <SummaryCardTitle>Fee Plans</SummaryCardTitle>
                <SummaryCardIcon color="#ef4444">
                  <AttachMoney />
                </SummaryCardIcon>
              </SummaryCardHeader>
              <SummaryCardValue>
                {admissionsLoading ? <DottedLoader /> : (admissionsData?.totalFeePlans || 0)}
              </SummaryCardValue>
              <SummaryCardSubtext>
                {admissionsLoading ? <DottedLoader size={0.7} /> : `Selected Range: ${admissionsData?.feePlansThisMonth || 0}`}
              </SummaryCardSubtext>
            </AdmissionsSummaryCard>
          </AdmissionsSummaryGrid>

          {/* Charts */}
          <AdmissionsChartsGrid>
            <AdmissionsChartCard>
              <AdmissionsChartTitle>Admissions</AdmissionsChartTitle>
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
            </AdmissionsChartCard>

            <AdmissionsChartCard>
              <AdmissionsChartTitle>Withdrawals</AdmissionsChartTitle>
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
            </AdmissionsChartCard>

            <AdmissionsChartCard>
              <AdmissionsChartTitle>Gender</AdmissionsChartTitle>
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
            </AdmissionsChartCard>
          </AdmissionsChartsGrid>

          {/* Additional Cards: Grade Distribution, Latest Admissions, Today's Birthdays */}
          <AdmissionsChartsGrid style={{ marginTop: '1.5rem' }}>
            {/* Class Wise Strength Card */}
            {classStrengths && classStrengths.length > 0 && (
              <AdmissionsChartCard style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
              <AdmissionsChartTitle style={{ marginBottom: '1rem' }}>Class Wise Strength</AdmissionsChartTitle>
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
            </AdmissionsChartCard>
            )}

            {/* Latest Admissions Card */}
            <AdmissionsChartCard style={{ minHeight: '400px' }}>
              <AdmissionsChartTitle>Latest Admissions</AdmissionsChartTitle>
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
            </AdmissionsChartCard>
          </AdmissionsChartsGrid>

          {/* Today's Birthdays Card */}
          {(todaysBirthdays && todaysBirthdays.length > 0) || (admissionsData?.todaysBirthdaysCount > 0) ? (
          <AdmissionsChartsGrid style={{ marginTop: '1.5rem' }}>
            <AdmissionsChartCard style={{
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
                <AdmissionsChartTitle style={{ color: '#fff', marginBottom: '0.5rem' }}>
                  Today's Birthdays
                </AdmissionsChartTitle>
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
            </AdmissionsChartCard>
          </AdmissionsChartsGrid>
          ) : null}
        </>
      )}
    </div>
  );
};

export default AdmissionsTab;
