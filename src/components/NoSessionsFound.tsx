import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext, darkTheme, lightTheme } from '../contexts/ThemeContext';
import { Box, Button, Typography, useMediaQuery } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { styled as muiStyled, useTheme as useMuiTheme } from '@mui/material/styles';
import DualTypingTextSessions from './DualTypingTextSessions';
import Loader from './Loader';

const CenteredFlex = muiStyled(Box)(({ theme }) => ({
  minHeight: 'calc(100vh - 64px)',
  width: '100vw',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  padding: 0,
}));

const IconCircle = muiStyled(Box)(({ theme }) => ({
  width: 88,
  height: 88,
  borderRadius: '50%',
  background: theme.palette.mode === 'dark' ? darkTheme.ICON_BG : lightTheme.ICON_BG,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 12,
  boxShadow: theme.palette.mode === 'dark' ? '0 2px 16px #0005' : '0 2px 16px #4a6cf71a',
}));

const AddSessionButton = muiStyled(Button)(({ theme }) => ({
  background: theme.palette.mode === 'dark'
    ? 'rgba(40, 60, 120, 0.32)'
    : 'rgba(74, 108, 247, 0.18)',
  color: theme.palette.mode === 'dark' ? '#a7c7ff' : '#2a3a5a',
  borderRadius: 14,
  fontWeight: 700,
  fontSize: '1.15rem',
  padding: '1rem 2.5rem',
  marginTop: 18,
  border: theme.palette.mode === 'dark'
    ? '1.5px solid rgba(120,160,255,0.18)'
    : '1.5px solid rgba(74,108,247,0.18)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: 'none',
  textTransform: 'none',
  transition: 'background 0.2s, border 0.2s, transform 0.15s',
  '&:hover': {
    background: theme.palette.mode === 'dark'
      ? 'rgba(40, 60, 120, 0.44)'
      : 'rgba(74, 108, 247, 0.28)',
    border: theme.palette.mode === 'dark'
      ? '1.5px solid rgba(120,160,255,0.28)'
      : '1.5px solid rgba(74,108,247,0.28)',
    transform: 'translateY(-2px) scale(1.03)',
    boxShadow: 'none',
  },
}));

const TipBox = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 24,
  color: theme.palette.mode === 'dark' ? darkTheme.TEXT_SECONDARY : lightTheme.TEXT_SECONDARY,
  fontSize: '1rem',
  opacity: 0.85,
  justifyContent: 'center',
}));

export default function NoSessionsFound({ loading = false }: { loading?: boolean }) {
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  if (loading) {
    return (
      <CenteredFlex>
        <Loader />
      </CenteredFlex>
    );
  }
  return (
    <CenteredFlex>
      <IconCircle>
        <CalendarTodayIcon style={{ fontSize: 54, color: theme === 'dark' ? darkTheme.ACCENT : lightTheme.ACCENT }} />
      </IconCircle>
      <DualTypingTextSessions />
      <Typography
        variant="h6"
        fontWeight={600}
        sx={{
          color: theme === 'dark' ? darkTheme.TEXT_PRIMARY : '#232a3b',
          marginBottom: 1
        }}
      >
        Your session list is empty
      </Typography>
      <Typography
        variant="body1"
        sx={{
          color: theme === 'dark' ? darkTheme.TEXT_SECONDARY : '#4a4a4a',
          marginBottom: 2,
          maxWidth: 420,
          marginX: 'auto'
        }}
      >
        There are currently no sessions in the system. Start by adding your first session to unlock all features like attendance, reports, and more.
      </Typography>
      <AddSessionButton
        size="large"
        onClick={() => navigate('/settings/sessions')}
        disableElevation
      >
        Add New Session
      </AddSessionButton>
      <TipBox sx={{ color: theme === 'dark' ? darkTheme.TEXT_SECONDARY : '#6b7280' }}>
        <HelpOutlineIcon fontSize="small" style={{ opacity: 0.7 }} />
        <span>Need help? Contact your admin or check the documentation.</span>
      </TipBox>
    </CenteredFlex>
  );
} 