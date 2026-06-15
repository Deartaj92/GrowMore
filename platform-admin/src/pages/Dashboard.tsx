import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, useTheme, CircularProgress } from '@mui/material';
import { School, People, VerifiedUser, Warning } from '@mui/icons-material';
import { supabase } from '../lib/supabaseClient';

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const [stats, setStats] = useState({
    totalSchools: 0,
    activeSchools: 0,
    totalAdmins: 0,
    loading: true
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [schoolsRes, adminsRes] = await Promise.all([
          supabase.from('schools').select('id, status', { count: 'exact' }),
          supabase.from('super_admins').select('id', { count: 'exact' })
        ]);

        const activeSchools = schoolsRes.data?.filter(s => s.status === 'active').length || 0;

        setStats({
          totalSchools: schoolsRes.count || 0,
          activeSchools,
          totalAdmins: adminsRes.count || 0,
          loading: false
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, []);

  if (stats.loading) {
    return (
      <Box sx={{ display: 'flex', height: '50vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const statCards = [
    {
      title: 'Total Schools',
      value: stats.totalSchools,
      icon: <School sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      color: theme.palette.primary.main,
      bg: `${theme.palette.primary.main}15`
    },
    {
      title: 'Active Schools',
      value: stats.activeSchools,
      icon: <VerifiedUser sx={{ fontSize: 40, color: theme.palette.success.main }} />,
      color: theme.palette.success.main,
      bg: `${theme.palette.success.main}15`
    },
    {
      title: 'Super Admins',
      value: stats.totalAdmins,
      icon: <People sx={{ fontSize: 40, color: theme.palette.info.main }} />,
      color: theme.palette.info.main,
      bg: `${theme.palette.info.main}15`
    }
  ];

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>
        Platform Overview
      </Typography>

      <Grid container spacing={4}>
        {statCards.map((stat, i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Card sx={{ borderRadius: 4, height: '100%' }}>
              <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box sx={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: '50%', 
                  bgcolor: stat.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {stat.icon}
                </Box>
                <Box>
                  <Typography variant="h3" component="div" sx={{ fontWeight: 600, mb: 0.5 }}>{stat.value}</Typography>
                  <Typography variant="subtitle1" color="text.secondary" fontWeight="medium">
                    {stat.title}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Dashboard;
