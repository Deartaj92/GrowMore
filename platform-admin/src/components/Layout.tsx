import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  List, 
  Typography, 
  Divider, 
  IconButton, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  useTheme,
  Avatar,
  Menu,
  MenuItem,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Brightness4,
  Brightness7
} from '@mui/icons-material';

const drawerWidth = 260;

const Layout: React.FC<{ toggleTheme: () => void; mode: 'light' | 'dark' }> = ({ toggleTheme, mode }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const locationPath = window.location.pathname;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Schools', icon: <SchoolIcon />, path: '/schools' },
    { text: 'Super Admins', icon: <PeopleIcon />, path: '/admins' },
    { text: 'Platform Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 40, height: 40 }}>
          <SchoolIcon />
        </Avatar>
        <Typography variant="h6" component="div" color="primary" sx={{ fontWeight: 'bold' }}>
          Platform Admin
        </Typography>
      </Box>
      <Divider sx={{ mb: 2, mx: 2, opacity: 0.5 }} />
      <List sx={{ px: 2, flex: 1 }}>
        {menuItems.map((item) => {
          const isActive = locationPath === item.path || (item.path !== '/' && locationPath.startsWith(item.path));
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{
                  borderRadius: '12px',
                  backgroundColor: isActive ? `${theme.palette.primary.main}15` : 'transparent',
                  color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                  '&:hover': {
                    backgroundColor: isActive ? `${theme.palette.primary.main}25` : theme.palette.action.hover,
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} sx={{ fontWeight: isActive ? 600 : 500, fontSize: '0.95rem' }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Box sx={{ p: 2 }}>
        <Box sx={{ 
          p: 2, 
          borderRadius: 3, 
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: theme.palette.primary.dark }}>
            {user?.name?.charAt(0) || 'A'}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="subtitle2" component="span" noWrap sx={{ fontWeight: 'bold' }}>{user?.name || 'Admin'}</Typography>
            <Typography variant="caption" noWrap color="text.secondary">{user?.role}</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: 'text.primary',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }} />
          
          <IconButton onClick={toggleTheme} color="inherit" sx={{ mr: 2 }}>
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          
          <IconButton onClick={handleMenuOpen} size="small" sx={{ ml: 2 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main }}>
              {user?.name?.charAt(0) || 'A'}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            sx={{ mt: 1.5, minWidth: 150, borderRadius: 2, elevation: 3 }}
          >
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
              <ListItemIcon sx={{ color: 'inherit' }}>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none', boxShadow: 4 },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: `1px solid ${theme.palette.divider}` },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 4 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px'
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
