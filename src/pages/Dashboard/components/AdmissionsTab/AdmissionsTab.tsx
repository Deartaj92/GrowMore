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
    <div>
      {/* Date Range Selector for Admissions */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        alignItems: 'center',
        flexWrap: 'wrap'
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
        <button
          onClick={() => {
            const range = getCurrentMonthRange();
            setAdmissionsDateFrom(range.from);
            setAdmissionsDateTo(range.to);
          }}
          style={{
            padding: '0.5rem 1rem',
            background: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
            border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)'}`,
            borderRadius: '6px',
            color: '#6366f1',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)';
          }}
        >
          Current Month
        </button>
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
                {admissionsLoading ? <DottedLoader /> : admissionsData.totalInquiries}
              </SummaryCardValue>
              <SummaryCardSubtext>
                {admissionsLoading ? <DottedLoader size={0.7} /> : `Selected Range: ${admissionsData.inquiriesThisMonth}`}
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
                {admissionsLoading ? <DottedLoader /> : admissionsData.totalStudents}
              </SummaryCardValue>
              <SummaryCardSubtext>
                {admissionsLoading ? <DottedLoader size={0.7} /> : `Selected Range: ${admissionsData.studentsThisMonth}`}
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
                {admissionsLoading ? <DottedLoader /> : admissionsData.totalFamilies}
              </SummaryCardValue>
              <SummaryCardSubtext>
                {admissionsLoading ? <DottedLoader size={0.7} /> : `Selected Range: ${admissionsData.familiesThisMonth}`}
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
                {admissionsLoading ? <DottedLoader /> : admissionsData.totalFeePlans}
              </SummaryCardValue>
              <SummaryCardSubtext>
                {admissionsLoading ? <DottedLoader size={0.7} /> : `Selected Range: ${admissionsData.feePlansThisMonth}`}
              </SummaryCardSubtext>
            </AdmissionsSummaryCard>
          </AdmissionsSummaryGrid>

          {/* Charts */}
          <AdmissionsChartsGrid>
            <AdmissionsChartCard>
              <AdmissionsChartTitle>Admissions</AdmissionsChartTitle>
              <div style={{ flex: 1, minHeight: 0, width: '100%', position: 'relative' }}>
                {admissionsChartData && admissionsChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minHeight={280}>
                    <BarChart
                      data={admissionsChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: isDark ? '#888' : '#666', fontSize: 12 }}
                        stroke={isDark ? '#888' : '#666'}
                        angle={-45}
                        textAnchor="end"
                        height={60}
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
                        wrapperStyle={{ paddingTop: '10px' }}
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
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '280px',
                    color: isDark ? '#888' : '#666',
                    fontSize: '0.95rem'
                  }}>
                    No data available
                  </div>
                )}
              </div>
            </AdmissionsChartCard>

            <AdmissionsChartCard>
              <AdmissionsChartTitle>Withdrawals</AdmissionsChartTitle>
              <div style={{ flex: 1, minHeight: 0, width: '100%', position: 'relative' }}>
                {withdrawalsChartData && withdrawalsChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minHeight={280}>
                    <BarChart
                      data={withdrawalsChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: isDark ? '#888' : '#666', fontSize: 12 }}
                        stroke={isDark ? '#888' : '#666'}
                        angle={-45}
                        textAnchor="end"
                        height={60}
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
                        wrapperStyle={{ paddingTop: '10px' }}
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
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '280px',
                    color: isDark ? '#888' : '#666',
                    fontSize: '0.95rem'
                  }}>
                    No data available
                  </div>
                )}
              </div>
            </AdmissionsChartCard>

            <AdmissionsChartCard>
              <AdmissionsChartTitle>Gender</AdmissionsChartTitle>
              <div style={{ flex: 1, minHeight: 0, width: '100%', position: 'relative' }}>
                {genderChartData && genderChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minHeight={280}>
                    <PieChart>
                      <Pie
                        data={genderChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
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
                          backgroundColor: isDark ? '#2a2a2a' : '#fff',
                          border: `1px solid ${isDark ? '#444' : '#ddd'}`,
                          borderRadius: '8px',
                          color: isDark ? '#e2e8f0' : '#1e293b'
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '280px',
                    color: isDark ? '#888' : '#666',
                    fontSize: '0.95rem'
                  }}>
                    No data available
                  </div>
                )}
              </div>
            </AdmissionsChartCard>
          </AdmissionsChartsGrid>

          {/* Additional Cards: Grade Distribution, Latest Admissions, Today's Birthdays */}
          <AdmissionsChartsGrid style={{ marginTop: '1.5rem' }}>
            {/* Class Wise Strength Card */}
            <AdmissionsChartCard style={{ minHeight: '400px' }}>
              <AdmissionsChartTitle style={{ marginBottom: '1rem' }}>Class Wise Strength</AdmissionsChartTitle>
              <div style={{ flex: 1, minHeight: 0, width: '100%', position: 'relative' }}>
                {classStrengths && classStrengths.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minHeight={350}>
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
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '350px',
                    color: isDark ? '#888' : '#666',
                    fontSize: '0.95rem'
                  }}>
                    No data available
                  </div>
                )}
              </div>
            </AdmissionsChartCard>

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
                  latestAdmissions.map((admission, idx) => {
                    const admissionDate = admission.admissionDate
                      ? new Date(admission.admissionDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                      : 'N/A';

                    const initials = admission.name
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

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
                        {admission.pictureUrl ? (
                          <img
                            src={admission.pictureUrl}
                            alt={admission.name}
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
                            {admission.name}
                          </div>
                          <div style={{
                            fontSize: '0.8rem',
                            color: isDark ? '#888' : '#666',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <School style={{ fontSize: '0.75rem' }} />
                            <span>{admission.className}</span>
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
                  marginBottom: '1.5rem'
                }}>
                  Celebrating {admissionsData.todaysBirthdaysCount} {admissionsData.todaysBirthdaysCount === 1 ? 'birthday' : 'birthdays'} today!
                </div>
                {admissionsData.todaysBirthdaysCount > 0 && (
                  <div style={{
                    width: '100%',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    marginBottom: '1rem',
                    padding: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px'
                  }}>
                    {todaysBirthdays.map((student, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.5rem',
                          marginBottom: '0.5rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px'
                        }}
                      >
                        {student.pictureUrl ? (
                          <img
                            src={student.pictureUrl}
                            alt={student.name}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'rgba(255, 255, 255, 0.3)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}
                          >
                            {student.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                        )}
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                            {student.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                            {student.className}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  }}
                >
                  View Details & Send SMS
                </button>
              </div>
            </AdmissionsChartCard>
          </AdmissionsChartsGrid>
        </>
      )}
    </div>
  );
};

export default AdmissionsTab;

