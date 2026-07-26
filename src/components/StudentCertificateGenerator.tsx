import React, { useState, useEffect, useContext } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/useToast';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import Loader from '../components/Loader';
import {
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Chip,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CardMembership as CertificateIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  CheckCircle,
  Warning as WarningIcon,
  Close as CloseIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Description as FileIcon,
} from '@mui/icons-material';
import jsPDF from 'jspdf';

const Container = styled.div<{ $theme: any }>`
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  background: ${({ $theme }) => $theme?.BG || '#ffffff'};
  min-height: 100vh;
`;

const Header = styled.div<{ $theme: any }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 1rem;
  margin-bottom: 1.5rem;
  background: ${({ $theme }) => $theme?.CARD || '#ffffff'};
  border: 1px solid ${({ $theme }) => $theme?.BORDER || '#e5e7eb'};
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const Card = styled(Paper)<{ $theme: any }>`
  padding: 1.5rem;
  background: ${({ $theme }) => $theme?.CARD || '#ffffff'};
  border: 1px solid ${({ $theme }) => $theme?.BORDER || '#e5e7eb'};
  border-radius: 16px;
  margin-bottom: 1.5rem;
`;

const CertificatePreviewBox = styled.div<{ $theme: any }>`
  border: 4px double ${({ $theme }) => $theme?.BORDER || '#1e293b'};
  padding: 2.5rem;
  background: #ffffff;
  color: #0f172a;
  border-radius: 8px;
  position: relative;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  font-family: 'Times New Roman', Georgia, serif;
`;

type CertificateType = 'slc' | 'character' | 'bonafide';

export const StudentCertificateGenerator: React.FC = () => {
  const { user } = useAuth();
  const { theme: themeMode } = useContext(ThemeContext);
  const toast = useToast();
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [schoolProfile, setSchoolProfile] = useState<any>(null);
  const [certType, setCertType] = useState<CertificateType>('slc');

  // Certificate details
  const [serialNo, setSerialNo] = useState<string>(`CERT-${Date.now().toString().slice(-6)}`);
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [leavingDate, setLeavingDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [leavingReason, setLeavingReason] = useState<string>('Passed out / Parents request');
  const [conduct, setConduct] = useState<string>('Exemplary & Good');
  const [remarks, setRemarks] = useState<string>('He/She bears a good moral character and has cleared all school dues.');
  const [duesCleared, setDuesCleared] = useState<boolean>(true);
  const [pendingFeeDues, setPendingFeeDues] = useState<number>(0);

  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (user?.school_id) {
      fetchInitialData();
    }
  }, [user?.school_id]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [studentsRes, profileRes, schoolRes] = await Promise.all([
        supabase
          .from('students')
          .select('id, name, father_name, roll_number, dob, gender, class_id, section_id, created_at, status')
          .eq('school_id', user!.school_id)
          .order('name', { ascending: true }),
        supabase.from('institute_profile').select('*').eq('school_id', user!.school_id).maybeSingle(),
        supabase.from('schools').select('*').eq('id', user!.school_id).maybeSingle(),
      ]);

      setStudents(studentsRes.data || []);

      const p = profileRes.data;
      const s = schoolRes.data;
      setSchoolProfile({
        name: p?.name || s?.name || 'School Name',
        address: p?.address || s?.address || '',
        phone: p?.phone || s?.contact_number || s?.contact || '',
        logo_url: p?.logo_url || s?.logo_url || null,
      });
    } catch (error: any) {
      toast.showToast('Failed to load initial data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStudent = async (studentId: string) => {
    setSelectedStudentId(studentId);
    if (!studentId) {
      setSelectedStudent(null);
      return;
    }

    const st = students.find((s) => String(s.id) === String(studentId));
    setSelectedStudent(st);

    // Check fee dues clearance
    try {
      const { data: arrearsData } = await supabase
        .from('fee_collection')
        .select('remaining_balance, balance')
        .eq('student_id', studentId)
        .eq('school_id', user!.school_id);

      let totalDues = 0;
      (arrearsData || []).forEach((row: any) => {
        totalDues += parseFloat(row.remaining_balance || row.balance || '0');
      });

      setPendingFeeDues(totalDues);
      setDuesCleared(totalDues <= 0);
    } catch (error) {
      setDuesCleared(true);
    }
  };

  const generatePDF = () => {
    if (!selectedStudent || !schoolProfile) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const width = doc.internal.pageSize.getWidth();

    // Decorative Borders
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(1.5);
    doc.rect(8, 8, width - 16, 281);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, width - 20, 277);

    // Header / School Branding
    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text(schoolProfile.name.toUpperCase(), width / 2, 28, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    if (schoolProfile.address) {
      doc.text(schoolProfile.address, width / 2, 35, { align: 'center' });
    }
    if (schoolProfile.phone) {
      doc.text(`Contact: ${schoolProfile.phone}`, width / 2, 40, { align: 'center' });
    }

    doc.setDrawColor(203, 213, 225);
    doc.line(20, 44, width - 20, 44);

    // Certificate Title Banner
    const titleText =
      certType === 'slc'
        ? 'SCHOOL LEAVING CERTIFICATE'
        : certType === 'character'
        ? 'CHARACTER & CONDUCT CERTIFICATE'
        : 'BONAFIDE STUDENT CERTIFICATE';

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(width / 2 - 65, 49, 130, 12, 2, 2, 'FD');
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(titleText, width / 2, 57, { align: 'center' });

    // Serial & Issue Date
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Sr No: ${serialNo}`, 20, 72);
    doc.text(`Date of Issue: ${new Date(issueDate).toLocaleDateString()}`, width - 20, 72, { align: 'right' });

    // Body Text
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);

    let startY = 88;
    const lineGap = 10;

    const studentName = selectedStudent.name.toUpperCase();
    const fatherName = (selectedStudent.father_name || 'N/A').toUpperCase();
    const rollNo = selectedStudent.roll_number || String(selectedStudent.id);
    const dobFormatted = selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString() : 'N/A';

    if (certType === 'slc') {
      doc.text(`This is to certify that `, 20, startY);
      doc.setFont('times', 'bold');
      doc.text(studentName, 62, startY);
      doc.setFont('times', 'normal');

      startY += lineGap;
      doc.text(`Son / Daughter of `, 20, startY);
      doc.setFont('times', 'bold');
      doc.text(fatherName, 55, startY);
      doc.setFont('times', 'normal');
      doc.text(` bearing Roll No / ID `, 130, startY);
      doc.setFont('times', 'bold');
      doc.text(rollNo, 175, startY);

      startY += lineGap;
      doc.setFont('times', 'normal');
      doc.text(`was a bonafide student of this institution. As per school records, his/her Date of Birth is `, 20, startY);

      startY += lineGap;
      doc.setFont('times', 'bold');
      doc.text(dobFormatted, 20, startY);

      startY += lineGap + 4;
      doc.setFont('times', 'normal');
      doc.text(`Date of Leaving School: `, 20, startY);
      doc.setFont('times', 'bold');
      doc.text(new Date(leavingDate).toLocaleDateString(), 65, startY);

      startY += lineGap;
      doc.setFont('times', 'normal');
      doc.text(`Reason for Leaving: `, 20, startY);
      doc.setFont('times', 'bold');
      doc.text(leavingReason, 60, startY);

      startY += lineGap;
      doc.setFont('times', 'normal');
      doc.text(`General Conduct & Progress: `, 20, startY);
      doc.setFont('times', 'bold');
      doc.text(conduct, 70, startY);

      startY += lineGap;
      doc.setFont('times', 'normal');
      doc.text(`School Dues Clearance: `, 20, startY);
      doc.setFont('times', 'bold');
      doc.text(duesCleared ? 'All Dues Paid & Cleared' : `Pending Dues: Rs. ${pendingFeeDues}`, 65, startY);
    } else if (certType === 'character') {
      doc.text(`This is to certify that `, 20, startY);
      doc.setFont('times', 'bold');
      doc.text(studentName, 62, startY);
      doc.setFont('times', 'normal');

      startY += lineGap;
      doc.text(`Son / Daughter of `, 20, startY);
      doc.setFont('times', 'bold');
      doc.text(fatherName, 55, startY);
      doc.setFont('times', 'normal');

      startY += lineGap;
      doc.text(`has been a student of this school. During his/her stay at this institution, his/her general conduct`, 20, startY);

      startY += lineGap;
      doc.text(`and moral character has been found to be `, 20, startY);
      doc.setFont('times', 'bold');
      doc.text(conduct.toUpperCase(), 95, startY);

      startY += lineGap + 4;
      doc.setFont('times', 'normal');
      doc.text(`To the best of our knowledge, he/she has taken an active part in co-curricular activities and`, 20, startY);
      startY += lineGap;
      doc.text(`bears an unblemished character. We wish him/her every success in future endeavors.`, 20, startY);
    } else {
      doc.text(`This is to certify that `, 20, startY);
      doc.setFont('times', 'bold');
      doc.text(studentName, 62, startY);
      doc.setFont('times', 'normal');

      startY += lineGap;
      doc.text(`Son / Daughter of `, 20, startY);
      doc.setFont('times', 'bold');
      doc.text(fatherName, 55, startY);
      doc.setFont('times', 'normal');

      startY += lineGap;
      doc.text(`is a bonafide student of `, 20, startY);
      doc.setFont('times', 'bold');
      doc.text(schoolProfile.name, 65, startY);

      startY += lineGap;
      doc.setFont('times', 'normal');
      doc.text(`currently studying and registered under Roll No / ID `, 20, startY);
      doc.setFont('times', 'bold');
      doc.text(rollNo, 115, startY);
    }

    // Remarks
    if (remarks) {
      startY += lineGap + 10;
      doc.setFont('times', 'bold');
      doc.text('Remarks / Observations:', 20, startY);
      startY += 6;
      doc.setFont('times', 'italic');
      doc.text(remarks, 20, startY);
    }

    // Signatures Block
    const sigY = 240;
    doc.setDrawColor(100, 116, 139);
    doc.line(25, sigY, 75, sigY);
    doc.line(width - 75, sigY, width - 25, sigY);

    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('Prepared By / Class Teacher', 50, sigY + 6, { align: 'center' });
    doc.text('Principal / Headmaster Stamp', width - 50, sigY + 6, { align: 'center' });

    doc.save(`${certType.toUpperCase()}_${selectedStudent.name.replace(/\s+/g, '_')}.pdf`);
  };

  if (loading) return <Loader />;

  return (
    <ThemeProvider theme={theme}>
      <Container $theme={theme}>
        <Header $theme={theme}>
          <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CertificateIcon color="primary" /> Student Official Certificate Generator
          </Typography>
        </Header>

        <Grid container spacing={3}>
          {/* Form Settings */}
          <Grid item xs={12} md={6}>
            <Card $theme={theme}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon color="primary" /> 1. Select Student & Certificate Type
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="select-student-label">Select Student</InputLabel>
                    <Select
                      labelId="select-student-label"
                      label="Select Student"
                      value={selectedStudentId}
                      onChange={(e) => handleSelectStudent(e.target.value as string)}
                    >
                      <MenuItem value="">-- Choose Student --</MenuItem>
                      {students.map((st) => (
                        <MenuItem key={st.id} value={st.id}>
                          {st.name} s/o {st.father_name || 'N/A'} (Roll #{st.roll_number || st.id})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="cert-type-label">Certificate Type</InputLabel>
                    <Select
                      labelId="cert-type-label"
                      label="Certificate Type"
                      value={certType}
                      onChange={(e) => setCertType(e.target.value as CertificateType)}
                    >
                      <MenuItem value="slc">School Leaving Certificate (SLC / TC)</MenuItem>
                      <MenuItem value="character">Character & Conduct Certificate</MenuItem>
                      <MenuItem value="bonafide">Bonafide Student Certificate</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {selectedStudent && (
                <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: theme.BG, border: `1px solid ${theme.BORDER}` }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                    Student Information Clearance:
                  </Typography>
                  <Typography variant="body2"><strong>Name:</strong> {selectedStudent.name}</Typography>
                  <Typography variant="body2"><strong>Father's Name:</strong> {selectedStudent.father_name || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Date of Birth:</strong> {selectedStudent.dob || 'N/A'}</Typography>
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {duesCleared ? (
                      <Chip icon={<CheckCircle />} label="School Dues Cleared" color="success" size="small" />
                    ) : (
                      <Chip icon={<WarningIcon />} label={`Pending Dues: Rs. ${pendingFeeDues}`} color="error" size="small" />
                    )}
                  </Box>
                </Box>
              )}
            </Card>

            {/* Certificate Details */}
            <Card $theme={theme}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <FileIcon color="primary" /> 2. Certificate Particulars
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Serial / Certificate No."
                    value={serialNo}
                    onChange={(e) => setSerialNo(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Issue Date"
                    InputLabelProps={{ shrink: true }}
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </Grid>

                {certType === 'slc' && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="date"
                        label="Leaving Date"
                        InputLabelProps={{ shrink: true }}
                        value={leavingDate}
                        onChange={(e) => setLeavingDate(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Reason for Leaving"
                        value={leavingReason}
                        onChange={(e) => setLeavingReason(e.target.value)}
                      />
                    </Grid>
                  </>
                )}

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="General Conduct & Moral Character"
                    value={conduct}
                    onChange={(e) => setConduct(e.target.value)}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Remarks / Additional Notes"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  disabled={!selectedStudent}
                  onClick={() => setPreviewOpen(true)}
                >
                  Preview Certificate
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<PrintIcon />}
                  disabled={!selectedStudent}
                  onClick={generatePDF}
                >
                  Download / Print PDF
                </Button>
              </Box>
            </Card>
          </Grid>

          {/* Live Web Preview */}
          <Grid item xs={12} md={6}>
            {selectedStudent && schoolProfile ? (
              <CertificatePreviewBox $theme={theme}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <Typography variant="h5" fontWeight={800} style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {schoolProfile.name}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    {schoolProfile.address}
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="subtitle1" fontWeight={700} style={{ background: '#f1f5f9', padding: '4px 12px', display: 'inline-block', borderRadius: '4px' }}>
                    {certType === 'slc'
                      ? 'SCHOOL LEAVING CERTIFICATE'
                      : certType === 'character'
                      ? 'CHARACTER & CONDUCT CERTIFICATE'
                      : 'BONAFIDE STUDENT CERTIFICATE'}
                  </Typography>
                </div>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, fontSize: '0.85rem' }}>
                  <span><strong>Sr No:</strong> {serialNo}</span>
                  <span><strong>Date:</strong> {issueDate}</span>
                </Box>

                <Typography paragraph style={{ lineHeight: 1.8 }}>
                  This is to certify that <strong>{selectedStudent.name.toUpperCase()}</strong> S/D of <strong>{(selectedStudent.father_name || 'N/A').toUpperCase()}</strong> bearing Roll No <strong>{selectedStudent.roll_number || selectedStudent.id}</strong> has been a bonafide student of this institution.
                </Typography>

                {certType === 'slc' && (
                  <Typography paragraph style={{ lineHeight: 1.8 }}>
                    His/Her Date of Birth according to school records is <strong>{selectedStudent.dob || 'N/A'}</strong>. He/She left the school on <strong>{leavingDate}</strong> due to <strong>{leavingReason}</strong>. His/Her conduct was <strong>{conduct}</strong> and all school dues are <strong>{duesCleared ? 'cleared' : 'pending'}</strong>.
                  </Typography>
                )}

                {remarks && (
                  <Typography variant="body2" style={{ fontStyle: 'italic', marginTop: '1rem' }}>
                    Remarks: {remarks}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 8, pt: 2, borderTop: '1px solid #cbd5e1' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Class Teacher Signature</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Principal Stamp & Signature</span>
                </Box>
              </CertificatePreviewBox>
            ) : (
              <Alert severity="info">Please select a student from the form on the left to preview their official certificate.</Alert>
            )}
          </Grid>
        </Grid>

        {/* Fullscreen Preview Dialog */}
        <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Official Certificate Preview
            <IconButton onClick={() => setPreviewOpen(false)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {selectedStudent && schoolProfile && (
              <CertificatePreviewBox $theme={theme}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <Typography variant="h4" fontWeight={800} style={{ textTransform: 'uppercase' }}>
                    {schoolProfile.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {schoolProfile.address}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" fontWeight={700} style={{ background: '#f1f5f9', padding: '6px 16px', display: 'inline-block', borderRadius: '4px' }}>
                    {certType === 'slc'
                      ? 'SCHOOL LEAVING CERTIFICATE'
                      : certType === 'character'
                      ? 'CHARACTER & CONDUCT CERTIFICATE'
                      : 'BONAFIDE STUDENT CERTIFICATE'}
                  </Typography>
                </div>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
                  <span><strong>Sr No:</strong> {serialNo}</span>
                  <span><strong>Date of Issue:</strong> {issueDate}</span>
                </Box>

                <Typography paragraph style={{ lineHeight: 2, fontSize: '1.1rem' }}>
                  This is to certify that <strong>{selectedStudent.name.toUpperCase()}</strong> Son/Daughter of <strong>{(selectedStudent.father_name || 'N/A').toUpperCase()}</strong> registered under Roll No <strong>{selectedStudent.roll_number || selectedStudent.id}</strong> was a student of this school.
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 10, pt: 2, borderTop: '1px solid #94a3b8' }}>
                  <span>Class Teacher</span>
                  <span>Principal / Headmaster</span>
                </Box>
              </CertificatePreviewBox>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewOpen(false)}>Close</Button>
            <Button variant="contained" startIcon={<PrintIcon />} onClick={generatePDF}>
              Download PDF
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeProvider>
  );
};

export default StudentCertificateGenerator;
