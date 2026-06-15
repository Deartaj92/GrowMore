import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  AdminPanelSettings
} from '@mui/icons-material';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  // If already logged in, redirect
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const loggedUser = await signIn(username, password);
      // Redirect based on role
      if (loggedUser.role === 'School Admin' && loggedUser.schoolId) {
        navigate('/schools');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      bgcolor: 'background.default',
      p: 2
    }}>
      <Card sx={{ maxWidth: 400, width: '100%', borderRadius: 3, boxShadow: 6 }}>
        <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 60, 
              height: 60, 
              borderRadius: '50%', 
              bgcolor: `${theme.palette.primary.main}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1
            }}>
              <AdminPanelSettings sx={{ fontSize: 32, color: 'primary.main' }} />
            </Box>
            <Typography variant="h5" fontWeight="bold">
              Platform Admin
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to manage the multi-tenant system
            </Typography>
          </Box>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <TextField
              label="Username"
              variant="outlined"
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              autoFocus
            />
            
            <TextField
              label="Password"
              variant="outlined"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            {error && (
  <Typography color="error" variant="body2" sx={{ textAlign: 'center' }}>
    {error}
  </Typography>
)}

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isSubmitting}
              sx={{ mt: 1, py: 1.5 }}
            >
              {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
