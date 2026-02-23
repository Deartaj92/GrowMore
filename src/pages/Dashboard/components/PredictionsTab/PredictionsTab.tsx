import React, { useState, useEffect, useCallback } from 'react';
import styled, { useTheme } from 'styled-components';
import { Lightbulb, Assessment, CheckCircle, Warning, Cancel, Group, TrendingDown, ReportProblem } from '@mui/icons-material';
import { supabase } from '../../../../supabaseClient';
import Loader from '../../../../components/Loader';
import { getStudentDisplayId } from '../../../../utils/studentUtils';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-bottom: 2rem;
`;

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};

  svg {
    color: ${({ theme }) => theme.ACCENT};
    font-size: 1.5rem;
  }
`;

const Subtitle = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 0.25rem;
  line-height: 1.4;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
`;

const SummaryCard = styled.div<{ $color?: string }>`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid ${({ theme, $color }) => $color ? `${$color}40` : ((theme as any).BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)')};
  box-shadow: ${({ theme }) => (theme as any).BG === '#252525' ? '0 4px 20px rgba(0, 0, 0, 0.2)' : '0 4px 20px rgba(0, 0, 0, 0.05)'};
`;

const IconWrapper = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${({ $color }) => `${$color}20`};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $color }) => $color};
  
  svg {
    font-size: 1.5rem;
  }
`;

const SummaryInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const SummaryLabel = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SummaryValue = styled.span`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  line-height: 1.2;
`;

const SectionContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 1.5rem;
  border: ${({ theme }) => (theme as any).BG === '#252525' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)'};
  box-shadow: ${({ theme }) => (theme as any).BG === '#252525' ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.05)'};
`;

const SectionTitle = styled.h3<{ $color?: string }>`
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme, $color }) => $color || theme.TEXT_PRIMARY};

  svg {
    font-size: 1.25rem;
  }
`;

const TableWrap = styled.div`
  width: 100%;
  overflow-x: auto;
  border-radius: 8px;
  border: ${({ theme }) => (theme as any).BG === '#252525' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)'};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 700px;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const TH = styled.th`
  text-align: left;
  padding: 0.85rem 1rem;
  background: ${({ theme }) => (theme as any).BG === '#252525' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'};
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  border-bottom: ${({ theme }) => (theme as any).BG === '#252525' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)'};
`;

const TD = styled.td`
  padding: 0.85rem 1rem;
  font-size: 0.85rem;
  border-bottom: ${({ theme }) => (theme as any).BG === '#252525' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)'};
  vertical-align: top;
`;

const metricColor = (value: number, threshold: number, reverse = false) => {
    const isBad = reverse ? value > threshold : value < threshold;
    return isBad ? '#ef4444' : '#22c55e';
};

const ReasonList = styled.ul`
  margin: 0;
  padding-left: 1.2rem;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  li {
    margin-bottom: 0.2rem;
  }
`;

interface PredictionResult {
    id: number;
    name: string;
    father_name?: string;
    roll_number?: string;
    class_name: string;
    section_name?: string;
    attendance_rate: number;
    avg_test_score: number;
    risk_status: 'Safe' | 'At Risk' | 'Critical';
    risk_reason: string[];
}

interface PredictionsTabProps {
    user: any;
}

const PredictionsTab: React.FC<PredictionsTabProps> = ({ user }) => {
    const [loading, setLoading] = useState(true);
    const [predictions, setPredictions] = useState<PredictionResult[]>([]);
    const [totalStudentsProcessed, setTotalStudentsProcessed] = useState(0);

    const generatePredictions = useCallback(async () => {
        if (!user?.school_id) return;
        setLoading(true);

        try {
            const { data: students, error: studentError } = await supabase
                .from('students')
                .select('id, name, father_name, roll_number, class_id, section_id, classes(name), sections(name)')
                .eq('school_id', user.school_id)
                .eq('status', 'active');

            if (studentError) throw studentError;

            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            const dateStr = threeMonthsAgo.toISOString().split('T')[0];

            const { data: attendanceData } = await supabase
                .from('attendance_records')
                .select('student_id, status')
                .eq('school_id', user.school_id)
                .gte('date', dateStr);

            const { data: testData } = await supabase
                .from('test_results')
                .select('student_id, percentage')
                .eq('school_id', user.school_id)
                .order('id', { ascending: false })
                .limit(5000);

            const studentStats = new Map<number, { present: number, total: number, testSum: number, testCount: number }>();

            students?.forEach(s => {
                studentStats.set(s.id, { present: 0, total: 0, testSum: 0, testCount: 0 });
            });

            attendanceData?.forEach(record => {
                const stat = studentStats.get(record.student_id);
                if (stat) {
                    stat.total++;
                    if (record.status === 'present' || record.status === 'late') {
                        stat.present++;
                    }
                }
            });

            testData?.forEach(record => {
                const stat = studentStats.get(record.student_id);
                if (stat && record.percentage !== null) {
                    stat.testSum += record.percentage;
                    stat.testCount++;
                }
            });

            const results: PredictionResult[] = [];

            students?.forEach(s => {
                const stat = studentStats.get(s.id);
                if (!stat) return;

                let attnRate = stat.total > 0 ? (stat.present / stat.total) * 100 : 100;
                let avgTest = stat.testCount > 0 ? (stat.testSum / stat.testCount) : 75;

                let status: 'Safe' | 'At Risk' | 'Critical' = 'Safe';
                const reasons: string[] = [];

                if (attnRate < 60) {
                    reasons.push(`Severely low attendance (${attnRate.toFixed(1)}%)`);
                    status = 'Critical';
                } else if (attnRate < 75) {
                    reasons.push(`Low attendance (${attnRate.toFixed(1)}%)`);
                    status = 'At Risk';
                }

                if (avgTest < 40) {
                    reasons.push(`Failing test average (${avgTest.toFixed(1)}%)`);
                    status = 'Critical';
                } else if (avgTest < 55) {
                    reasons.push(`Poor test scores (${avgTest.toFixed(1)}%)`);
                    if (status !== 'Critical') {
                        status = 'At Risk';
                    }
                }

                if (status !== 'Safe') {
                    results.push({
                        id: s.id,
                        name: s.name,
                        father_name: s.father_name,
                        roll_number: s.roll_number,
                        class_name: (s.classes as any)?.name || 'Unknown',
                        section_name: (s.sections as any)?.name,
                        attendance_rate: attnRate,
                        avg_test_score: avgTest,
                        risk_status: status,
                        risk_reason: reasons
                    });
                }
            });

            results.sort((a, b) => {
                if (a.risk_status === 'Critical' && b.risk_status !== 'Critical') return -1;
                if (b.risk_status === 'Critical' && a.risk_status !== 'Critical') return 1;
                return a.attendance_rate - b.attendance_rate;
            });

            setPredictions(results);
            setTotalStudentsProcessed(students?.length || 0);
        } catch (e) {
            console.error("Prediction generated failed", e);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        generatePredictions();
    }, [generatePredictions]);

    if (loading) return <Loader />;

    const criticalStudents = predictions.filter(p => p.risk_status === 'Critical');
    const atRiskStudents = predictions.filter(p => p.risk_status === 'At Risk');

    const renderTable = (students: PredictionResult[]) => {
        if (students.length === 0) {
            return <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>No students found in this category.</div>;
        }
        return (
            <TableWrap>
                <Table>
                    <thead>
                        <tr>
                            <TH>Student Info</TH>
                            <TH>Class Details</TH>
                            <TH>Attendance</TH>
                            <TH>Avg Test Score</TH>
                            <TH>Identified Risks</TH>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map(p => (
                            <tr key={p.id}>
                                <TD>
                                    <div style={{ fontWeight: 600, color: 'inherit' }}>
                                        {p.name} {p.father_name && <span style={{ opacity: 0.7, fontWeight: 400 }}>• {p.father_name}</span>}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '2px' }}>
                                        Roll # {getStudentDisplayId({ id: p.id, roll_number: p.roll_number })}
                                    </div>
                                </TD>
                                <TD>
                                    <div style={{ fontWeight: 500 }}>{p.class_name}</div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '4px' }}>{p.section_name ? `Section ${p.section_name}` : 'No Section'}</div>
                                </TD>
                                <TD>
                                    <span style={{ fontWeight: 600, color: metricColor(p.attendance_rate, 75) }}>
                                        {p.attendance_rate.toFixed(1)}%
                                    </span>
                                </TD>
                                <TD>
                                    <span style={{ fontWeight: 600, color: metricColor(p.avg_test_score, 55) }}>
                                        {p.avg_test_score.toFixed(1)}%
                                    </span>
                                </TD>
                                <TD>
                                    <ReasonList>
                                        {p.risk_reason.map((r, i) => <li key={i}>{r}</li>)}
                                    </ReasonList>
                                </TD>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </TableWrap>
        );
    }

    return (
        <Container>
            <div>
                <PageHeader>
                    <Lightbulb />
                    Predictive Student Analytics
                </PageHeader>
                <Subtitle>
                    AI-heuristic early warning system that actively monitors attendance trends and academic performance
                    to predict potential dropouts or exam failures before they happen.
                </Subtitle>
            </div>

            <SummaryGrid>
                <SummaryCard $color="#3b82f6">
                    <IconWrapper $color="#3b82f6"><Group /></IconWrapper>
                    <SummaryInfo>
                        <SummaryLabel>Total Evaluated</SummaryLabel>
                        <SummaryValue>{totalStudentsProcessed}</SummaryValue>
                    </SummaryInfo>
                </SummaryCard>
                <SummaryCard $color="#f59e0b">
                    <IconWrapper $color="#f59e0b"><Warning /></IconWrapper>
                    <SummaryInfo>
                        <SummaryLabel>At Risk (Monitoring)</SummaryLabel>
                        <SummaryValue>{atRiskStudents.length}</SummaryValue>
                    </SummaryInfo>
                </SummaryCard>
                <SummaryCard $color="#ef4444">
                    <IconWrapper $color="#ef4444"><ReportProblem /></IconWrapper>
                    <SummaryInfo>
                        <SummaryLabel>Critical (Intervention)</SummaryLabel>
                        <SummaryValue>{criticalStudents.length}</SummaryValue>
                    </SummaryInfo>
                </SummaryCard>
            </SummaryGrid>

            {criticalStudents.length > 0 && (
                <SectionContainer style={{ borderLeft: '4px solid #ef4444' }}>
                    <SectionTitle $color="#ef4444">
                        <Cancel />
                        Action Required: High Risk of Failure or Dropout
                    </SectionTitle>
                    <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                        These students have severely low attendance (&lt; 60%) or failing academic grades (&lt; 40%). Immediate parental notification is recommended.
                    </p>
                    {renderTable(criticalStudents)}
                </SectionContainer>
            )}

            <SectionContainer style={{ borderLeft: '4px solid #f59e0b' }}>
                <SectionTitle $color="#f59e0b">
                    <Warning />
                    Monitor Closely: Early Warning Signs
                </SectionTitle>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                    These students show declining trends in attendance (&lt; 75%) or concerning academic scores (&lt; 55%). Early intervention can prevent escalation.
                </p>
                {renderTable(atRiskStudents)}
            </SectionContainer>

        </Container>
    );
};

export default PredictionsTab;
