import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  Box,
  Avatar,
  Chip,
  Divider,
  Collapse,
  CircularProgress,
  alpha,
} from '@mui/material';
import {
  Close as CloseIcon,
  Assignment as AssignmentIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { reportService } from '../../utils/reportService';
import { Report as ImportedReport } from '../../types/reports';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../useToast';
import { supabase } from '../../supabaseClient';

// Helper to get parent session info
const getParentInfo = () => {
  try {
    const parentSessionStr = localStorage.getItem('parentSession');
    if (parentSessionStr) {
      return JSON.parse(parentSessionStr);
    }
  } catch (error) {
    // Ignore parse errors
  }
  return null;
};

interface ReportDetailsModalProps {
  open: boolean;
  onClose: () => void;
  reportId: string;
}

interface Report extends Omit<ImportedReport, 'id' | 'category_id' | 'reported_by' | 'category'> {
  id: string;
  category_id: string;
  reported_by: string;
  incident_date?: string;
  action_taken?: string;
  category?: {
    id: string;
    name: string;
  };
}

const statusColors: Record<string, string> = {
  'pending': '#ed6c02',
  'in_review': '#2196f3',
  'resolved': '#2e7d32',
  'dismissed': '#757575',
  'in_progress': '#f59e42'
};

const formatStatus = (status: string | undefined) => {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'low': return '#4caf50';
    case 'medium': return '#ff9800';
    case 'high': return '#f44336';
    case 'urgent': return '#9c27b0';
    default: return '#757575';
  }
};

export const ReportDetailsModal: React.FC<ReportDetailsModalProps> = ({
  open,
  onClose,
  reportId
}) => {
  const { user } = useAuth();
  const parentInfo = getParentInfo();
  const { showToast } = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedUpdates, setExpandedUpdates] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (open && reportId) {
      loadReport();
    } else {
      setReport(null);
      setExpandedUpdates({});
    }
  }, [open, reportId]);

  const loadReport = async () => {
    // Get school_id from user or parentInfo
    const schoolId = user?.school_id || parentInfo?.school_id;
    if (!reportId || !schoolId) return;
    
    setLoading(true);
    try {
      const data = await reportService.getReportById(reportId, schoolId);
      
      // Transform the data to match our local Report type
      // Updates are already included in the response from getReportById
      const transformedData = {
        ...data,
        id: data.id.toString(),
        category: {
          id: data.category?.id?.toString() || '',
          name: data.category?.name || ''
        },
        category_id: data.category_id.toString(),
        reported_by: data.reported_by.toString(),
        incident_date: data.created_at,
        action_taken: '',
        updates: data.updates || []
      } as unknown as Report;
      
      setReport(transformedData);
    } catch (error) {
      showToast('Failed to load report details', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const toggleUpdates = (reportId: string) => {
    if (!reportId) return;
    setExpandedUpdates(prev => ({
      ...prev,
      [reportId]: !prev[reportId]
    }));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 1
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Report Details
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : report ? (
          <Box>
            {/* Header */}
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  #{report.id}
                </Typography>
                <Chip
                  label={report.category?.name}
                  size="small"
                  icon={<AssignmentIcon />}
                  sx={{
                    backgroundColor: alpha('#1976d2', 0.1),
                    color: 'primary.main',
                    fontWeight: 500
                  }}
                />
                <Box sx={{ flex: 1 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {report.incident_date ? new Date(report.incident_date).toLocaleDateString() : new Date(report.created_at).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">|</Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: statusColors[report.status],
                      fontWeight: 500
                    }}
                  >
                    {formatStatus(report.status)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">|</Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: getSeverityColor(report.severity),
                      fontWeight: 500,
                      textTransform: 'capitalize'
                    }}
                  >
                    {report.severity}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Content */}
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 3 }}>
                <Avatar
                  src={report.subject_type === 'staff' ? report.staff?.picture_url : report.student?.picture_url}
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: alpha('#1976d2', 0.1),
                    color: 'primary.main'
                  }}
                >
                  {report.subject_type === 'staff'
                    ? (!report.staff?.picture_url && report.staff?.name?.[0])
                    : (!report.student?.picture_url && report.student?.name?.[0])
                  }
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {report.subject_type === 'staff' ? report.staff?.name : report.student?.name}
                    </Typography>
                    {report.subject_type === 'student' && (
                      <>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          • {report.student?.class?.name} {report.student?.section?.name ? report.student.section.name : ''}
                        </Typography>
                        {report.reporter?.name && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            • by {report.reporter.name}
                          </Typography>
                        )}
                      </>
                    )}
                    {report.subject_type === 'staff' && report.staff?.role && (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        • {report.staff.role}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="body1" sx={{ mb: 2, color: 'text.primary', lineHeight: 1.6 }}>
                    {report.description}
                  </Typography>
                  {report.action_taken && (
                    <Box sx={{
                      mt: 2,
                      p: 2,
                      borderRadius: 1,
                      bgcolor: alpha('#000', 0.03),
                      border: '1px solid',
                      borderColor: 'divider'
                    }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Action Taken:
                      </Typography>
                      <Typography variant="body2">
                        {report.action_taken}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Updates Section */}
              {report.updates && report.updates.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box
                    onClick={() => toggleUpdates(report.id)}
                    sx={{
                      p: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      cursor: 'pointer',
                      borderRadius: 1,
                      bgcolor: alpha('#1976d2', 0.05),
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: alpha('#1976d2', 0.1)
                      }
                    }}
                  >
                    <KeyboardArrowDownIcon
                      sx={{
                        transform: expandedUpdates[report.id] ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease',
                        color: 'primary.main'
                      }}
                    />
                    <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 600 }}>
                      Report Updates
                    </Typography>
                    <Chip
                      size="small"
                      label={report.updates.length}
                      sx={{
                        ml: 1,
                        bgcolor: alpha('#1976d2', 0.1),
                        color: 'primary.main'
                      }}
                    />
                    {report.updates.length > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                        <TimeIcon sx={{ color: 'text.secondary', opacity: 0.7, fontSize: 16 }} />
                        <Typography variant="caption" color="text.secondary">
                          Last updated: {new Date(report.updates[0].created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Collapse in={expandedUpdates[report.id]}>
                    <Box sx={{ mt: 2, pl: 4 }}>
                      {report.updates.map((update, index, updates) => (
                        <Box
                          key={update.id}
                          sx={{
                            position: 'relative',
                            pb: index === updates.length - 1 ? 0 : 3,
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              left: -20,
                              top: 6,
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: 'primary.main',
                              boxShadow: theme => `0 0 0 4px ${alpha(theme.palette.primary.main, 0.1)}`,
                              zIndex: 1
                            },
                            '&::after': index !== updates.length - 1 ? {
                              content: '""',
                              position: 'absolute',
                              left: -15,
                              top: 18,
                              width: 2,
                              height: 'calc(100% - 6px)',
                              background: theme => `linear-gradient(180deg, 
                                ${alpha(theme.palette.primary.main, 0.3)} 0%, 
                                ${alpha(theme.palette.primary.main, 0.1)} 100%
                              )`,
                              borderRadius: '4px'
                            } : {}
                          }}
                        >
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="subtitle2">
                              Status changed from{' '}
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  bgcolor: alpha('#757575', 0.1),
                                  color: 'text.secondary',
                                  fontSize: '0.75rem',
                                  fontWeight: 600
                                }}
                              >
                                {formatStatus(update.previous_status)}
                              </Box>
                              {' '}to{' '}
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  bgcolor: alpha('#1976d2', 0.1),
                                  color: 'primary.main',
                                  fontSize: '0.75rem',
                                  fontWeight: 600
                                }}
                              >
                                {formatStatus(update.new_status)}
                              </Box>
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              by {update.staff?.name} • {new Date(update.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                          {update.update_note && (
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'text.secondary',
                                bgcolor: alpha('#fff', 0.5),
                                p: 1.5,
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider'
                              }}
                            >
                              {update.update_note}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Collapse>
                </>
              )}
            </Box>
          </Box>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

