import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  useTheme,
  useMediaQuery,
  styled
} from '@mui/material';
import { Close as CloseIcon, Payment as PaymentIcon, Info as InfoIcon, Search as SearchIcon, MonetizationOn, CheckCircle, Warning, ErrorOutline } from '@mui/icons-material';
import { feeService } from '../services/feeService';
import { FeeInvoice, FeePayment } from '../types/fee';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { useLoading } from '../contexts/LoadingContext';
import { useProgress } from '../components/Layout';
import NoStudentsFound from '../components/NoStudentsFound';
import NoSessionsFound from '../components/NoSessionsFound';
import NoClassesFound from '../components/NoClassesFound';
import NoSectionsFound from '../components/NoSectionsFound';

import Loader from '../components/Loader';
// Styled components for compact, modern look
const PageContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  padding: theme.spacing(3),
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
    : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2)
  }
}));

const PageTitle = styled(Typography)(({ theme }) => ({
  fontSize: '2.2rem',
  fontWeight: 700,
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(45deg, #4a6cf7, #7c3aed)'
    : 'linear-gradient(45deg, #4a6cf7, #3b82f6)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  textShadow: theme.palette.mode === 'dark'
    ? '0 4px 8px rgba(0, 0, 0, 0.3)'
    : '0 2px 4px rgba(0, 0, 0, 0.1)',
  mb: 3,
  [theme.breakpoints.down('sm')]: {
    fontSize: '1.4rem',
    textAlign: 'center',
    mb: 2
  }
}));

const StatCard = styled(Box)(({ theme }) => ({
  background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)',
  borderRadius: 16,
  boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
  backdropFilter: 'blur(16px)',
  border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.3)',
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  minWidth: 140,
  minHeight: 90,
  gap: 8,
  position: 'relative',
}));

const StatIcon = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 12,
  right: 16,
  opacity: 0.18,
  fontSize: 48,
  pointerEvents: 'none',
}));

const FilterBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 16,
  margin: '18px 0 8px 0',
  alignItems: 'center',
  background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
  borderRadius: 14,
  boxShadow: theme.palette.mode === 'dark' ? '0 2px 12px #0008' : '0 2px 12px #0001',
  padding: '16px 18px',
  backdropFilter: 'blur(8px)',
}));

const SearchField = styled(TextField)(({ theme }) => ({
  minWidth: 180,
  '& .MuiInputBase-root': {
    borderRadius: 999,
    background: theme.palette.mode === 'dark' ? 'rgba(74,108,247,0.10)' : 'rgba(74,108,247,0.07)',
    fontWeight: 500,
    fontSize: '1rem',
    paddingLeft: 8,
  },
  '& .MuiInputBase-input': {
    paddingLeft: 32,
  },
}));

const TableContainer = styled(Box)(({ theme }) => ({
  background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.97)',
  borderRadius: 16,
  boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
  marginTop: 24,
  overflowX: 'auto',
  backdropFilter: 'blur(8px)',
  border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.3)',
}));

const Table = styled('table')(({ theme }) => ({
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: 700,
  fontSize: '0.97rem',
}));

const Th = styled('th')(({ theme }) => ({
  padding: '12px 10px',
  background: theme.palette.mode === 'dark' ? 'rgba(74,108,247,0.10)' : '#f7f7fa',
  color: theme.palette.text.secondary,
  fontWeight: 700,
  borderBottom: `2px solid ${theme.palette.divider}`,
  textAlign: 'left',
  position: 'sticky',
  top: 0,
  zIndex: 1,
}));

const Td = styled('td')(({ theme }) => ({
  padding: '12px 10px',
  color: theme.palette.text.primary,
  borderBottom: `1px solid ${theme.palette.divider}`,
  fontSize: '0.97rem',
  background: 'transparent',
}));

const ActionButton = styled(Button)(({ theme }) => ({
  minWidth: 0,
  padding: '6px 14px',
  borderRadius: 999,
  fontSize: '0.93rem',
  fontWeight: 500,
  textTransform: 'none',
  boxShadow: '0 2px 8px 0 rgba(74, 108, 247, 0.07)',
  transition: 'box-shadow 0.18s',
  '&:hover': {
    boxShadow: '0 4px 16px 0 rgba(74, 108, 247, 0.13)'
  }
}));

interface StudentRow {
  id: number;
  name: string;
  className: string;
  sectionName: string;
  status: 'paid' | 'partial' | 'unpaid';
  due: number;
}

interface LedgerRow {
  invoice: FeeInvoice;
  payments: FeePayment[];
}

interface Stat {
  label: string;
  value: string | number;
}

interface FeeStatusChipProps {
  status: 'paid' | 'partial' | 'unpaid';
}

const FeeStatusChip = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'status',
})<FeeStatusChipProps>(({ theme, status }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '2px 12px',
  borderRadius: 999,
  fontWeight: 600,
  fontSize: '0.92rem',
  color: '#fff',
  background:
    status === 'paid' ? theme.palette.success.main :
    status === 'partial' ? theme.palette.warning.main :
    theme.palette.error.main,
  boxShadow: '0 2px 8px 0 rgba(74, 108, 247, 0.07)',
}));

// --- Dashboard-style Skeleton Loader for FeeManagement ---
const FeeManagementSkeletonContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  padding: theme.spacing(3),
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
    : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2)
  }
}));
const SkeletonPageTitle = styled(Box)(({ theme }) => ({
  width: 220,
  height: 38,
  borderRadius: 10,
  marginBottom: theme.spacing(3),
  background: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#e5e7eb',
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent)',
    animation: 'shimmer 1.5s infinite',
    borderRadius: 10,
  }
}));
const SkeletonStatGrid = styled(Grid)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));
const SkeletonStatCard = styled(Box)(({ theme }) => ({
  background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)',
  borderRadius: 16,
  boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
  padding: '20px 24px',
  minWidth: 140,
  minHeight: 90,
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.08), transparent)',
    animation: 'shimmer 1.5s infinite',
    borderRadius: 16,
  }
}));
const SkeletonFilterBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 16,
  margin: '18px 0 8px 0',
  alignItems: 'center',
  background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
  borderRadius: 14,
  boxShadow: theme.palette.mode === 'dark' ? '0 2px 12px #0008' : '0 2px 12px #0001',
  padding: '16px 18px',
  backdropFilter: 'blur(8px)',
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent)',
    animation: 'shimmer 1.5s infinite',
    borderRadius: 14,
  }
}));
const SkeletonTableContainer = styled(Box)(({ theme }) => ({
  background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.97)',
  borderRadius: 16,
  boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
  marginTop: 24,
  overflowX: 'auto',
  backdropFilter: 'blur(8px)',
  border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.3)',
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.08), transparent)',
    animation: 'shimmer 1.5s infinite',
    borderRadius: 16,
  }
}));
const SkeletonTableRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '18px 10px',
  borderBottom: `1px solid ${theme.palette.divider}`,
}));
const SkeletonCell = styled(Box)(({ theme }) => ({
  height: 18,
  borderRadius: 8,
  background: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#e5e7eb',
  flex: 1,
  minWidth: 60,
  maxWidth: 120,
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.10), transparent)',
    animation: 'shimmer 1.5s infinite',
    borderRadius: 8,
  }
}));
const FeeManagementSkeleton = () => (
  <FeeManagementSkeletonContainer>
    <SkeletonPageTitle />
    <SkeletonStatGrid container spacing={2} mb={2}>
      {[...Array(4)].map((_, i) => (
        <Grid item xs={6} sm={3} key={i}>
          <SkeletonStatCard />
        </Grid>
      ))}
    </SkeletonStatGrid>
    <SkeletonFilterBar style={{ marginBottom: 24 }} />
    <SkeletonTableContainer>
      {[...Array(6)].map((_, i) => (
        <SkeletonTableRow key={i}>
          {[...Array(6)].map((_, j) => (
            <SkeletonCell key={j} />
          ))}
        </SkeletonTableRow>
      ))}
    </SkeletonTableContainer>
  </FeeManagementSkeletonContainer>
);

export default function FeeManagement() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const { setLoading, loading } = useLoading();
  const { startProgress, setProgress, completeProgress } = useProgress();
  const schoolId = user?.school_id;

  // State
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [showLedger, setShowLedger] = useState(false);
  const [showCollect, setShowCollect] = useState(false);
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMode, setCollectMode] = useState('Cash');
  const [collectRemarks, setCollectRemarks] = useState('');
  const [collectLoading, setCollectLoading] = useState(false);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: number; name: string; class_id: number }[]>([]);
  const [sessions, setSessions] = useState<{ id: number; name: string }[]>([]);

  // Fetch students and their fee status
  useEffect(() => {
    if (!schoolId) return;
    const minDuration = 2000;
    const start = Date.now();
    setLoading(true);
    setError(null);
    const fetchData = async () => {
      startProgress(false);
      setProgress(10);
      try {
        // Fetch students with class/section info
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, name, class_id, section_id')
          .eq('school_id', schoolId);
        if (studentsError) throw studentsError;
        setProgress(30);

        // Fetch class/section/session names
        const { data: classesData } = await supabase
          .from('classes')
          .select('id, name')
          .eq('school_id', schoolId);
        setProgress(40);
        const { data: sectionsData } = await supabase
          .from('sections')
          .select('id, name, class_id')
          .eq('school_id', schoolId);
        setProgress(50);
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('id, name')
          .eq('school_id', schoolId);
        setProgress(60);
        setClasses(classesData || []);
        setSections(sectionsData || []);
        setSessions(sessionsData || []);

        // Fetch all invoices for these students
        const studentIds = (studentsData || []).map((s: any) => s.id);
        let invoices: FeeInvoice[] = [];
        if (studentIds.length > 0) {
          const { data: invoiceData } = await supabase
            .from('fee.fee_invoices')
            .select('*')
            .eq('school_id', schoolId)
            .in('student_id', studentIds);
          invoices = invoiceData || [];
        }
        setProgress(75);

        // Compute student fee status and due
        const studentRows: StudentRow[] = (studentsData || []).map((stu: any) => {
          const stuInvoices = invoices.filter(inv => inv.studentId === stu.id);
          let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
          let due = 0;
          if (stuInvoices.length > 0) {
            const totalDue = stuInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
            const paid = stuInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
            const partial = stuInvoices.filter(inv => inv.status === 'partial').reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
            due = totalDue - paid - partial;
            if (due <= 0) status = 'paid';
            else if (paid > 0 || partial > 0) status = 'partial';
          }
          return {
            id: stu.id,
            name: stu.name,
            className: classesData?.find(c => c.id === stu.class_id)?.name || '-',
            sectionName: sectionsData?.find(s => s.id === stu.section_id)?.name || '-',
            status,
            due
          };
        });
        setStudents(studentRows);
        setProgress(90);

        // Compute stats
        const totalDue = studentRows.reduce((sum, s) => sum + s.due, 0);
        const collected = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const outstanding = totalDue;
        const defaulters = studentRows.filter(s => s.status === 'unpaid').length;
        setStats([
          { label: 'Total Due', value: `Rs.${totalDue}` },
          { label: 'Collected', value: `Rs.${collected}` },
          { label: 'Outstanding', value: `Rs.${outstanding}` },
          { label: 'Defaulters', value: defaulters },
        ]);
        setProgress(100);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        const elapsed = Date.now() - start;
        if (elapsed < minDuration) {
          setTimeout(() => {
            setLoading(false);
            completeProgress();
          }, minDuration - elapsed);
        } else {
          setLoading(false);
          completeProgress();
        }
      }
    };
    fetchData();
  }, [schoolId]);

  // Filtering logic
  const filteredStudents = students.filter(s =>
    (!classFilter || s.className === classFilter) &&
    (!sectionFilter || s.sectionName === sectionFilter) &&
    (!statusFilter || s.status === statusFilter) &&
    (!search || s.name.toLowerCase().includes(search.toLowerCase()))
  );

  // Handlers
  const handleOpenLedger = async (student: StudentRow) => {
    setSelectedStudent(student);
    setShowLedger(true);
    setLedgerLoading(true);
    try {
      if (!schoolId) return;
      const ledger = await feeService.getStudentLedger(schoolId, student.id);
      // Map to ledger rows
      const rows: LedgerRow[] = ledger.invoices.map(inv => ({
        invoice: inv,
        payments: ledger.payments.filter(p => p.invoiceId === inv.id)
      }));
      setLedgerRows(rows);
    } catch (err: any) {
      setError(err.message || 'Failed to load ledger');
    } finally {
      setLedgerLoading(false);
    }
  };
  const handleOpenCollect = (student: StudentRow) => {
    setSelectedStudent(student);
    setShowCollect(true);
  };
  const handleCloseLedger = () => {
    setShowLedger(false);
    setSelectedStudent(null);
    setLedgerRows([]);
  };
  const handleCloseCollect = () => {
    setShowCollect(false);
    setSelectedStudent(null);
    setCollectAmount('');
    setCollectMode('Cash');
    setCollectRemarks('');
    setCollectLoading(false);
  };
  const handleCollectSubmit = async () => {
    if (!schoolId || !selectedStudent) return;
    setCollectLoading(true);
    try {
      // Find the latest unpaid/partial invoice for this student
      const invoices = await feeService.getFeeInvoices(schoolId, { studentId: selectedStudent.id });
      const invoice = invoices.find(inv => inv.status !== 'paid');
      if (!invoice) throw new Error('No unpaid invoice found');
      await feeService.createFeePayment({
        schoolId,
        invoiceId: invoice.id,
        paymentDate: new Date().toISOString().slice(0, 10),
        amount: Number(collectAmount),
        paymentMode: collectMode,
        remarks: collectRemarks,
        receivedBy: user.id, // Store the user ID who collected the payment
      });
      handleCloseCollect();
      // Optionally, refresh data
    } catch (err: any) {
      setError(err.message || 'Failed to collect payment');
    } finally {
      setCollectLoading(false);
    }
  };

  if (loading) return <Loader />;

  // Check for prerequisites and show appropriate empty states
  if (sessions.length === 0) {
    return <NoSessionsFound />;
  }

  if (classes.length === 0) {
    return <NoClassesFound />;
  }

  if (sections.length === 0) {
    return <NoSectionsFound />;
  }

  if (students.length === 0) {
    return <NoStudentsFound />;
  }

  return (
    <PageContainer>
      <PageTitle>Fee Management</PageTitle>
      {error && <Typography color="error" mb={2}>{error}</Typography>}
      <Grid container spacing={2} mb={2}>
        {stats.map(stat => (
          <Grid item xs={6} sm={3} key={stat.label}>
            <StatCard>
              <Typography fontWeight={600} fontSize="1.1rem">{stat.label}</Typography>
              <Typography fontWeight={700} fontSize="1.3rem">{stat.value}</Typography>
              <StatIcon>
                {stat.label.toLowerCase().includes('due') ? <MonetizationOn fontSize="inherit" /> :
                 stat.label.toLowerCase().includes('collected') ? <CheckCircle fontSize="inherit" /> :
                 stat.label.toLowerCase().includes('outstanding') ? <Warning fontSize="inherit" /> :
                 stat.label.toLowerCase().includes('defaulter') ? <ErrorOutline fontSize="inherit" /> : null}
              </StatIcon>
            </StatCard>
          </Grid>
        ))}
      </Grid>
      <FilterBar>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Class</InputLabel>
          <Select value={classFilter} label="Class" onChange={e => setClassFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {classes.map(c => (
              <MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Section</InputLabel>
          <Select
            value={sectionFilter}
            label="Section"
            onChange={e => setSectionFilter(e.target.value)}
            disabled={classFilter === ""}
          >
            <MenuItem value="">All</MenuItem>
            {(classFilter
              ? sections.filter(s => s.class_id === (classes.find(c => c.name === classFilter)?.id))
              : sections
            ).map(s => (
              <MenuItem key={s.id} value={s.name}>{s.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="partial">Partial</MenuItem>
            <MenuItem value="unpaid">Unpaid</MenuItem>
          </Select>
        </FormControl>
        <SearchField
          size="small"
          label="Search Student"
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ ml: 1, mr: 1, color: 'primary.main' }} fontSize="small" />
          }}
        />
      </FilterBar>
      <TableContainer>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Class</Th>
              <Th>Section</Th>
              <Th>Status</Th>
              <Th>Due</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><Td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>Loading...</Td></tr>
            ) : filteredStudents.length === 0 ? (
              <tr><Td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>No students found.</Td></tr>
            ) : filteredStudents.map(student => (
              <tr key={student.id} style={{ transition: 'background 0.18s' }}>
                <Td>{student.name}</Td>
                <Td>{student.className}</Td>
                <Td>{student.sectionName}</Td>
                <Td>
                  <FeeStatusChip status={student.status}>
                    {student.status === 'paid' && <CheckCircle sx={{ fontSize: 18, mr: 0.5 }} />}
                    {student.status === 'partial' && <Warning sx={{ fontSize: 18, mr: 0.5 }} />}
                    {student.status === 'unpaid' && <ErrorOutline sx={{ fontSize: 18, mr: 0.5 }} />}
                    {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                  </FeeStatusChip>
                </Td>
                <Td>{student.due === 0 ? '-' : `Rs.${student.due}`}</Td>
                <Td style={{ display: 'flex', gap: 8 }}>
                  <ActionButton variant="outlined" color="primary" size="small" startIcon={<InfoIcon fontSize="small" />} onClick={() => handleOpenLedger(student)} title="View Ledger">
                    Ledger
                  </ActionButton>
                  <ActionButton variant="contained" color="success" size="small" startIcon={<PaymentIcon fontSize="small" />} disabled={student.due === 0} onClick={() => handleOpenCollect(student)} title="Collect Payment">
                    Collect
                  </ActionButton>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableContainer>

      {/* Ledger Modal */}
      <Dialog open={showLedger} onClose={handleCloseLedger} maxWidth="sm" fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: theme.palette.mode === 'dark'
              ? 'rgba(40,60,120,0.98)' : 'rgba(255,255,255,0.98)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 40px #000b' : '0 8px 40px #5078ff22',
            backdropFilter: 'blur(8px)'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2 }}>
          {selectedStudent?.name}'s Fee Ledger
          <IconButton onClick={handleCloseLedger}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          {ledgerLoading ? (
            <Typography>Loading...</Typography>
          ) : ledgerRows.length === 0 ? (
            <Typography>No ledger records found.</Typography>
          ) : (
            <Table sx={{ minWidth: 400 }}>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Description</Th>
                  <Th>Amount</Th>
                  <Th>Paid</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.map((row, idx) => (
                  <tr key={idx}>
                    <Td>{row.invoice.invoiceDate}</Td>
                    <Td>Invoice</Td>
                    <Td>{row.invoice.totalAmount}</Td>
                    <Td>{row.payments.reduce((sum, p) => sum + (p.amount || 0), 0)}</Td>
                    <Td>{row.invoice.status.charAt(0).toUpperCase() + row.invoice.status.slice(1)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Collect Payment Modal */}
      <Dialog open={showCollect} onClose={handleCloseCollect} maxWidth="xs" fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: theme.palette.mode === 'dark'
              ? 'rgba(40,60,120,0.98)' : 'rgba(255,255,255,0.98)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 40px #000b' : '0 8px 40px #5078ff22',
            backdropFilter: 'blur(8px)'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2 }}>
          Collect Fee - {selectedStudent?.name}
          <IconButton onClick={handleCloseCollect}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Amount"
              type="number"
              value={collectAmount}
              onChange={e => setCollectAmount(e.target.value)}
              fullWidth
              inputProps={{ min: 1, max: selectedStudent?.due || 10000 }}
              disabled={collectLoading}
            />
            <FormControl fullWidth>
              <InputLabel>Mode</InputLabel>
              <Select value={collectMode} label="Mode" onChange={e => setCollectMode(e.target.value)} disabled={collectLoading}>
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="Bank">Bank</MenuItem>
                <MenuItem value="Online">Online</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Remarks"
              value={collectRemarks}
              onChange={e => setCollectRemarks(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              disabled={collectLoading}
            />
            <Button variant="contained" color="primary" onClick={handleCollectSubmit} disabled={collectLoading} sx={{ borderRadius: 2, fontWeight: 600 }}>
              {collectLoading ? 'Collecting...' : 'Collect'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
} 