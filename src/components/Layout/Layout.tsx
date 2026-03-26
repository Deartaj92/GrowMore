import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { WifiOff as WifiOffIcon } from '@mui/icons-material';

// Import contexts
import { ThemeProvider as CustomThemeProvider, useTheme } from './contexts/ThemeContext';
import { MuteProvider } from './contexts/MuteContext';
import { PageHeaderProvider, usePageHeader } from './contexts/PageHeaderContext';
import { PageFooterProvider, usePageFooter } from './contexts/PageFooterContext';
import { ProgressProvider, useProgress } from './contexts/ProgressContext';
import { hasPermission } from '../../services/permissionService';

// Import types and constants
import { Theme, StudentInfo, ParentInfo, InstituteProfile } from './types';
import { darkTheme, lightTheme, menuItems } from './constants';

// Import styles
import {
  AppContainer,
  LayoutWrapper,
  MainArea,
  ContentArea,
  OfflineContainer,
  ActionButton,
} from './styles';

// Import global styles
import { GlobalStyles } from '../../styles/globalStyles';

// Import utilities
import { checkConnection } from './utils/layoutUtils';
import { getAnnouncementIdentity } from './utils/announcementUtils';

// Import components
import NotificationBell from '../NotificationBell';
import AnnouncementHandler from '../AnnouncementHandler';
import AboutUsModal from '../AboutUsModal';
import PresenceManager from '../PresenceManager';
import Header from './components/Header/Header';
import GlobalFooter from './components/GlobalFooter/GlobalFooter';
import ChangePasswordModal from './components/Modals/ChangePasswordModal';
import ExitConfirmModal from './components/Modals/ExitConfirmModal';
import NetworkModal from './components/Modals/NetworkModal';
import AnnouncementModal from './components/Modals/AnnouncementModal';
import SeenByModal from './components/Modals/SeenByModal';

// Import external dependencies
import { useToast } from '../useToast';
import useGlobalClickSound from '../../hooks/useGlobalClickSound';
import { getUser, removeUser } from '../../utils/auth';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { NotificationProvider } from '../../contexts/NotificationContext';
import { UpdateService } from '../../services/updateService';
import { isWeb as checkIsWeb } from '../../utils/platformDetection';
import '../../utils/testNotifications';

// Capacitor import for mobile back button handling
let CapacitorApp: any = null;
try {
  CapacitorApp = require('@capacitor/app').App;
} catch (e) {
  // Capacitor not available
}


// Main Layout Component
const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();
  const { footerContent } = usePageFooter();
  const { theme, toggleTheme } = useTheme();
  const { startProgress, completeProgress } = useProgress();
  const { navHistory, forwardHistory, handleGoBack, handleGoForward } = useNavigation();
  const { user: authUser, signOut } = useAuth();
  const toast = useToast();
  const user = getUser();
  const isWeb = checkIsWeb();

  // State management
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 700);
  const [pageHeaderText, setPageHeaderText] = useState('');
  const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [isWeakConnection, setIsWeakConnection] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(new Date());
  const [isMaximized, setIsMaximized] = useState(false);
  const [instituteProfile, setInstituteProfile] = useState<InstituteProfile | null>(null);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [parentInfo, setParentInfo] = useState<ParentInfo | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [aboutUsModalOpen, setAboutUsModalOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isDownloadActive, setIsDownloadActive] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Announcement state
  const [announcementQueue, setAnnouncementQueue] = useState<any[]>([]);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [seenByModalOpen, setSeenByModalOpen] = useState(false);
  const [seenByEntries, setSeenByEntries] = useState<any[]>([]);
  const [seenByLoading, setSeenByLoading] = useState(false);
  const [seenByError, setSeenByError] = useState<string | null>(null);
  const seenAnnouncementsRef = useRef<Set<number>>(new Set());
  const snoozedAnnouncementsRef = useRef<Set<number>>(new Set());
  const [footerHeight, setFooterHeight] = useState(0);

  // Refs
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const profileIconRef = useRef<HTMLButtonElement>(null);
  const userHasInteracted = useRef(false);
  const isNavigatingViaButtonsRef = useRef(false);
  const lastBackPressRef = useRef<number>(0);

  // Constants
  const appVersion = process.env.REACT_APP_VERSION || 'dev';
  const [updateService] = useState(() => UpdateService.getInstance());

  // Check if we're on student profile page and user is Principal
  const isStudentProfilePage = location.pathname.match(/^\/students\/profile\/\d+$/);
  const showStudentSearch = !!(user?.role === 'Principal' && isStudentProfilePage);

  // Mobile detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 700);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll detection for auto-hide scrollbars
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      // Add scrolling class to body and html
      document.body.classList.add('scrolling');
      document.documentElement.classList.add('scrolling');

      // Clear existing timeout
      clearTimeout(scrollTimeout);

      // Remove scrolling class after scrolling stops (1 second delay)
      scrollTimeout = setTimeout(() => {
        document.body.classList.remove('scrolling');
        document.documentElement.classList.remove('scrolling');
      }, 1000);
    };

    // Listen to scroll events on window and document
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Electron window state
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.isMaximized().then(setIsMaximized);
      window.electronAPI.onMaximize(() => setIsMaximized(true));
      window.electronAPI.onUnmaximize(() => setIsMaximized(false));
    }
  }, []);

  // Load student/parent info
  useEffect(() => {
    const load = async () => {
      try {
        const currentUser = getUser();
        if (currentUser) {
          localStorage.removeItem('studentSession');
          localStorage.removeItem('parentSession');
          setStudentInfo(null);
          setParentInfo(null);
          return;
        }

        const studentRaw = localStorage.getItem('studentSession');
        if (studentRaw) {
          const studentParsed = JSON.parse(studentRaw);
          if (studentParsed?.id) {
            const { data } = await supabase
              .from('students')
              .select('id, name, school_id, class_id, section_id')
              .eq('id', studentParsed.id)
              .single();
            if (data) {
              setStudentInfo({
                id: data.id,
                name: data.name,
                school_id: data.school_id,
                class_id: data.class_id,
                section_id: data.section_id,
              });
              setParentInfo(null);
              return;
            }
          }
        }

        const parentRaw = localStorage.getItem('parentSession');
        if (parentRaw) {
          const parentParsed = JSON.parse(parentRaw);
          if (parentParsed?.id) {
            const { data } = await supabase
              .from('families')
              .select('id, name, school_id, contact_person, contact_number, address, avatar_url')
              .eq('id', parentParsed.id)
              .single();
            if (data) {
              setParentInfo({
                id: data.id,
                name: data.name,
                school_id: data.school_id,
                contact_person: data.contact_person,
                contact_number: data.contact_number,
                address: data.address,
                avatar_url: data.avatar_url,
              });
              setStudentInfo(null);
              return;
            }
          }
        }

        setStudentInfo(null);
        setParentInfo(null);
      } catch {
        setStudentInfo(null);
        setParentInfo(null);
      }
    };
    load();
  }, [user, authUser]);

  // Fetch institute profile
  useEffect(() => {
    const fetchInstituteProfile = async () => {
      const schoolId = authUser?.school_id || studentInfo?.school_id || parentInfo?.school_id;
      if (!schoolId) return;

      try {
        const { data, error } = await supabase
          .from('institute_profile')
          .select('*')
          .eq('school_id', schoolId)
          .single();

        if (!error && data && (data.short_name || data.logo_url)) {
          setInstituteProfile(data);
        } else {
          try {
            const { data: schoolData, error: schoolError } = await supabase
              .from('schools')
              .select('name, logo_url')
              .eq('id', schoolId)
              .single();

            if (!schoolError && schoolData) {
              setInstituteProfile({
                short_name: schoolData.name,
                logo_url: schoolData.logo_url,
                tagline: schoolData.name
              });
            } else {
              setInstituteProfile(null);
            }
          } catch {
            setInstituteProfile(null);
          }
        }
      } catch {
        setInstituteProfile(null);
      }
    };

    fetchInstituteProfile();
  }, [authUser?.school_id, studentInfo?.school_id, parentInfo?.school_id]);

  // Fetch staff profile
  useEffect(() => {
    async function fetchStaffProfile() {
      if (user?.id) {
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('staff_id')
            .eq('id', user.id)
            .single();
          if (!userError && userData?.staff_id) {
            setStaffId(userData.staff_id);
            const { data: staffData, error: staffError } = await supabase
              .from('staff')
              .select('name, picture_url')
              .eq('id', userData.staff_id)
              .single();
            if (!staffError && staffData) {
              setStaffName(staffData.name || null);
              setAvatarUrl(staffData.picture_url || null);
            } else {
              setStaffName(null);
              setAvatarUrl(null);
            }
          } else {
            setStaffId(null);
            setStaffName(null);
            setAvatarUrl(null);
          }
        } catch {
          setStaffId(null);
          setStaffName(null);
          setAvatarUrl(null);
        }
      }
    }
    fetchStaffProfile();
  }, [user?.id]);


  // Network connection checking
  useEffect(() => {
    let isMounted = true;

    const wrappedCheckConnection = async () => {
      if (!isMounted) return;
      await checkConnection(
        (online) => {
          setIsOnline(online);
          if (online) {
            setIsPageLoading(false);
          }
        },
        setIsWeakConnection,
        setIsCheckingConnection
      );
    };

    wrappedCheckConnection();
    const intervalId = setInterval(() => {
      if (isMounted) wrappedCheckConnection();
    }, 60000);
    const handleOnline = () => { if (isMounted) wrappedCheckConnection(); };
    const handleOffline = () => { if (isMounted) setIsOnline(false); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    setIsPageLoading(true);
    checkConnection(
      (online) => {
        setIsOnline(online);
        if (online) {
          setIsPageLoading(false);
        }
      },
      setIsWeakConnection,
      setIsCheckingConnection
    );
  }, [location.pathname]);

  // Reset pageHeader on route change
  useEffect(() => {
    setPageHeaderText('');
  }, [location.pathname]);

  // Check if title is overflowing on mobile
  useEffect(() => {
    if (!isMobile || !titleRef.current) return;

    const checkOverflow = () => {
      if (titleRef.current) {
        const isOverflowing = titleRef.current.scrollWidth > titleRef.current.clientWidth;
        setIsTitleOverflowing(isOverflowing);
      }
    };

    setTimeout(checkOverflow, 100);
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [isMobile, location.pathname]);

  // Announcement logic
  const announcementIdentity = getAnnouncementIdentity(studentInfo, authUser, staffId);
  const currentAnnouncement = showAnnouncement && announcementQueue.length
    ? announcementQueue[currentAnnouncementIndex]
    : null;

  // Handlers
  const handleRefresh = () => {
    if (isDownloadActive) {
      toast.showToast('Please wait for the download to complete before refreshing', 'error');
      return;
    }

    // Use full page reload for all users to ensure proper app refresh
    if (window.location.reload) {
      window.location.reload();
    } else {
      window.location.href = window.location.href;
    }
  };

  const handleRetry = async () => {
    await checkConnection(setIsOnline, setIsWeakConnection, setIsCheckingConnection);
    setLastChecked(new Date());
  };

  const handleExit = () => {
    if (isDownloadActive) {
      let downloadDetails = '';
      try {
        const downloadState = localStorage.getItem('gm_download_state');
        if (downloadState) {
          const state = JSON.parse(downloadState);
          const progress = state.totalBytes > 0
            ? Math.round((state.downloadedBytes / state.totalBytes) * 100)
            : 0;
          const status = state.isPaused ? ' (Paused)' : '';
          downloadDetails = `\n\nDownload: ${state.fileName}\nProgress: ${progress}%${status}`;
        }
      } catch (e) {
        // Ignore errors
      }

      const confirmClose = window.confirm(
        '⚠️ Download in Progress!\n\n' +
        'A download is currently in progress (or paused).' + downloadDetails +
        '\n\nIf you close the application now, the download will be canceled.\n\n' +
        'Are you sure you want to close?'
      );
      if (!confirmClose) {
        return;
      }
    }

    try {
      if (CapacitorApp) {
        CapacitorApp.exitApp();
      } else if (window.electronAPI) {
        window.electronAPI.close();
      } else if (isWeb) {
        const closed = window.close();
        setTimeout(() => {
          if (!document.hidden) {
            window.location.href = 'about:blank';
          }
        }, 100);
      } else {
        window.close();
      }
    } catch (error) {
      try {
        window.close();
      } catch {
        if (isWeb) {
          window.location.href = 'about:blank';
        }
      }
    }
  };

  const handleLogout = async () => {
    const studentSession = localStorage.getItem('studentSession');
    if (studentSession) {
      try {
        const parsed = JSON.parse(studentSession);
        if (parsed.id) {
          await supabase
            .from('students')
            .update({ is_online: false, last_online: new Date().toISOString() })
            .eq('id', parsed.id);
        }
      } catch (e) {
        // Ignore
      }
      localStorage.removeItem('studentSession');
    }

    if (authUser) {
      try {
        await signOut();
      } catch (error) {
        removeUser();
      }
    } else {
      removeUser();
    }
    navigate('/login');
  };

  const handleCheckForUpdates = async () => {
    if (isDownloadActive && (window as any).updateNotificationRef?.current) {
      (window as any).updateNotificationRef.current.restoreDownloadModal();
      setProfileMenuOpen(false);
      return;
    }

    if (isCheckingUpdate) return;
    setIsCheckingUpdate(true);
    try {
      if ((window as any).checkForAppUpdates) {
        (window as any).checkForAppUpdates();
      } else {
        toast.showToast('Update service not available', 'error');
      }
    } catch (error) {
      toast.showToast('Failed to check for updates', 'error');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const openChangePasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setModalLoading(false);
    setShowChangePassword(true);
  };

  const closeChangePasswordModal = () => {
    setShowChangePassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setModalLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.showToast('All fields are required.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.showToast('New passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 4) {
      toast.showToast('Password must be at least 4 characters.', 'error');
      return;
    }
    setModalLoading(true);
    startProgress(true);

    try {
      if (studentInfo) {
        const { data, error } = await supabase
          .from('students')
          .select('password')
          .eq('id', studentInfo.id)
          .single();

        if (error) {
          toast.showToast('Failed to verify current password.', 'error');
          completeProgress();
          setModalLoading(false);
          return;
        }

        const isValidPassword = data.password === currentPassword ||
          (data.password === 'aa' && currentPassword === 'aa') ||
          (!data.password && currentPassword === 'aa');

        if (!isValidPassword) {
          toast.showToast('Current password is incorrect.', 'error');
          completeProgress();
          setModalLoading(false);
          return;
        }

        const { error: updateError } = await supabase
          .from('students')
          .update({ password: newPassword })
          .eq('id', studentInfo.id)
          .eq('school_id', studentInfo.school_id);

        if (updateError) {
          toast.showToast('Failed to update password.', 'error');
          completeProgress();
          return;
        }

        toast.showToast('Password updated successfully!', 'success');
        completeProgress();
        setTimeout(() => {
          closeChangePasswordModal();
        }, 600);
        return;
      }

      if (parentInfo) {
        const { data, error } = await supabase
          .from('families')
          .select('password')
          .eq('id', parentInfo.id)
          .single();

        if (error) {
          toast.showToast('Failed to verify current password.', 'error');
          completeProgress();
          setModalLoading(false);
          return;
        }

        const isValidPassword = data.password === currentPassword ||
          (data.password === 'aa' && currentPassword === 'aa') ||
          (!data.password && currentPassword === 'aa');

        if (!isValidPassword) {
          toast.showToast('Current password is incorrect.', 'error');
          completeProgress();
          setModalLoading(false);
          return;
        }

        const { error: updateError } = await supabase
          .from('families')
          .update({ password: newPassword })
          .eq('id', parentInfo.id)
          .eq('school_id', parentInfo.school_id);

        if (updateError) {
          toast.showToast('Failed to update password.', 'error');
          completeProgress();
          return;
        }

        toast.showToast('Password updated successfully!', 'success');
        completeProgress();
        setTimeout(() => {
          closeChangePasswordModal();
        }, 600);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .eq('password', currentPassword)
        .single();

      if (error || !data) {
        toast.showToast('Current password is incorrect.', 'error');
        completeProgress();
        return;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', user.id);

      if (updateError) {
        toast.showToast('Failed to update password.', 'error');
        completeProgress();
        return;
      }

      toast.showToast('Password updated successfully!', 'success');
      completeProgress();
      setTimeout(() => {
        closeChangePasswordModal();
      }, 600);
    } catch (err) {
      toast.showToast('Something went wrong.', 'error');
      completeProgress();
    } finally {
      setModalLoading(false);
    }
  };

  // Click-away logic for profile dropdown
  useEffect(() => {
    if (!profileMenuOpen) return;
    function handleClick(e: MouseEvent) {
      const dropdown = profileDropdownRef.current;
      const icon = profileIconRef.current;
      if (
        dropdown && !dropdown.contains(e.target as Node) &&
        icon && !icon.contains(e.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileMenuOpen]);

  // Download state checking
  useEffect(() => {
    const checkDownloadState = () => {
      if ((window as any).updateNotificationRef?.current) {
        const isActive = (window as any).updateNotificationRef.current.isDownloadActive();
        setIsDownloadActive(isActive);
      } else {
        try {
          const downloadState = localStorage.getItem('gm_download_state');
          if (downloadState) {
            const state = JSON.parse(downloadState);
            setIsDownloadActive(state.progress < 100);
          } else {
            setIsDownloadActive(false);
          }
        } catch {
          setIsDownloadActive(false);
        }
      }
    };

    checkDownloadState();
    const interval = setInterval(checkDownloadState, 1000);
    return () => clearInterval(interval);
  }, []);

  // Prevent page refresh/reload when download is active
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDownloadActive) {
        e.preventDefault();
        let downloadInfo = '';
        try {
          const downloadState = localStorage.getItem('gm_download_state');
          if (downloadState) {
            const state = JSON.parse(downloadState);
            const progress = state.totalBytes > 0
              ? Math.round((state.downloadedBytes / state.totalBytes) * 100)
              : 0;
            const status = state.isPaused ? ' - Paused' : '';
            downloadInfo = ` (${state.fileName} - ${progress}%${status})`;
          }
        } catch (e) {
          // Ignore errors
        }
        e.returnValue = `⚠️ Download in progress${downloadInfo}. Are you sure you want to leave? The download will be canceled.`;
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDownloadActive]);

  // Mobile back button handling
  useEffect(() => {
    const handleBackPress = () => {
      if (location.pathname !== '/dashboard') {
        handleGoBack();
        return;
      }

      setShowExitConfirm(true);
    };

    let removeCapListener: (() => void) | null = null;

    const setupCapacitorListener = async () => {
      try {
        if (CapacitorApp) {
          const listener = await CapacitorApp.addListener('backButton', handleBackPress);
          removeCapListener = () => {
            listener.remove();
          };
        }
      } catch (error) {
        // Ignore
      }
    };

    if (isWeb) {
      return;
    }

    setupCapacitorListener();

    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      handleBackPress();
      window.history.pushState(null, '', window.location.pathname);
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (showExitConfirm) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState, true);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      removeCapListener?.();
      window.removeEventListener('popstate', handlePopState, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [location.pathname, handleGoBack, showExitConfirm, isWeb]);

  // Keyboard shortcuts for navigation
  useEffect(() => {
    if (isWeb) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        handleGoBack();
      }
      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault();
        handleGoForward();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGoBack, handleGoForward, isWeb]);

  // Swipe to open/close sidebar (mobile)
  useEffect(() => {
    if (!isMobile) return;

    const handleTouchStart = (e: TouchEvent) => {
      setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
      if (!touchStart || !touchEnd) return;

      setTouchStart(null);
      setTouchEnd(null);
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchStart, touchEnd, isMobile]);

  // User interaction unlock
  React.useEffect(() => {
    const unlock = () => {
      userHasInteracted.current = true;
      window.removeEventListener('mousedown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('mousedown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
    return () => {
      window.removeEventListener('mousedown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  useGlobalClickSound();

  const muiTheme = React.useMemo(() => createTheme({
    palette: {
      mode: theme,
      primary: { main: '#4a6cf7' },
      secondary: { main: '#ef4444' },
      background: {
        default: theme === 'dark' ? darkTheme.BG : lightTheme.BG,
        paper: theme === 'dark' ? darkTheme.CARD : lightTheme.CARD,
      },
    },
  }), [theme]);

  // Announcement handlers (simplified - full implementation would use the hook)
  const handleOpenAnnouncement = useCallback(async (id: number) => {
    const existing = announcementQueue.find(a => a.id === id);
    if (existing) {
      const index = announcementQueue.indexOf(existing);
      setCurrentAnnouncementIndex(index);
      setShowAnnouncement(true);
      return;
    }

    try {
      const { data, error } = await supabase.from('announcements').select('*').eq('id', id).single();
      if (data && !error) {
        setAnnouncementQueue(prev => [data, ...prev]);
        setCurrentAnnouncementIndex(0);
        setShowAnnouncement(true);
      }
    } catch (e) {
      // Ignore
    }
  }, [announcementQueue]);

  const handleDismissAnnouncement = () => {
    if (!announcementQueue.length) {
      setShowAnnouncement(false);
      setAnnouncementQueue([]);
      setCurrentAnnouncementIndex(0);
      return;
    }

    if (currentAnnouncementIndex + 1 < announcementQueue.length) {
      setCurrentAnnouncementIndex(currentAnnouncementIndex + 1);
    } else {
      setShowAnnouncement(false);
      setAnnouncementQueue([]);
      setCurrentAnnouncementIndex(0);
    }
  };

  const handleRemindMeLater = () => {
    if (currentAnnouncement?.id) {
      snoozedAnnouncementsRef.current.add(currentAnnouncement.id);
    }
    handleDismissAnnouncement();
  };

  const handleDontShowAgain = () => {
    if (!currentAnnouncement) return;
    // Implementation would use announcement utils
    handleDismissAnnouncement();
  };

  const loadSeenByEntries = useCallback(async (announcementId: number) => {
    setSeenByLoading(true);
    setSeenByError(null);
    try {
      const { data, error } = await supabase
        .from('announcement_views')
        .select('*')
        .eq('announcement_id', announcementId)
        .order('seen_at', { ascending: false });
      if (error) throw error;
      setSeenByEntries(data || []);
    } catch (error) {
      setSeenByError('Unable to load viewers right now.');
    } finally {
      setSeenByLoading(false);
    }
  }, []);

  const handleOpenSeenBy = async () => {
    if (!currentAnnouncement?.id) return;
    setSeenByModalOpen(true);
    loadSeenByEntries(currentAnnouncement.id);
  };

  const handleCloseSeenBy = () => {
    setSeenByModalOpen(false);
  };

  const handleFooterHeightChange = useCallback((height: number) => {
    setFooterHeight(height);
  }, []);

  const [canViewSeenByList, setCanViewSeenByList] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      if (authUser?.id && authUser?.school_id) {
        // Check if user has permission to view seen_by list (using user-management permission)
        const hasPerm = await hasPermission(authUser.id, 'settings-user-management', authUser.school_id);
        setCanViewSeenByList(hasPerm);
      } else if (authUser?.id && !authUser?.school_id) {
        // Super Admin (no school_id) can view seen_by list
        setCanViewSeenByList(true);
      } else {
        setCanViewSeenByList(false);
      }
    };
    checkPermission();
  }, [authUser?.id, authUser?.school_id]);

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
        <ThemeProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
          <GlobalStyles />
        <AnnouncementHandler onOpenAnnouncement={handleOpenAnnouncement} />
        <AppContainer>
          {/* Header floats independently outside MainArea for true glass see-through effect */}
          <Header
            user={user}
            studentInfo={studentInfo}
            parentInfo={parentInfo}
            isDownloadActive={isDownloadActive}
            onRefresh={handleRefresh}
            avatarUrl={avatarUrl}
            staffName={staffName}
            profileMenuOpen={profileMenuOpen}
            setProfileMenuOpen={setProfileMenuOpen}
            profileIconRef={profileIconRef}
            profileDropdownRef={profileDropdownRef}
            theme={theme}
            onToggleTheme={toggleTheme}
            onOpenChangePassword={openChangePasswordModal}
            isWeb={isWeb}
            onCheckForUpdates={handleCheckForUpdates}
            isCheckingUpdate={isCheckingUpdate}
            onAboutUsClick={() => setAboutUsModalOpen(true)}
            onLogout={handleLogout}
            appVersion={appVersion}
            instituteProfile={instituteProfile}
          />
          <LayoutWrapper>
            <MainArea $isTeacher={true}>
              <ContentArea style={{ top: '48px', bottom: footerHeight > 0 ? `${footerHeight}px` : '0' }}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={location.pathname + location.search}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: '100%',
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        boxSizing: 'border-box'
                      }}
                    >
                      {isOnline || location.pathname.includes('/attendance/rfid-scanner') || location.pathname.includes('/attendance/rfid-cards') ? (
                        <Outlet />
                      ) : (
                        <OfflineContainer>
                          <WifiOffIcon style={{ fontSize: 64, color: '#ff6b6b' }} />
                          <h1>You are offline</h1>
                          <p>Please check your internet connection.</p>
                          <p>Last check: {lastChecked.toLocaleTimeString()}</p>
                          <ActionButton onClick={handleRetry} disabled={isCheckingConnection}>
                            {isCheckingConnection ? 'Retrying...' : 'Retry Now'}
                          </ActionButton>
                        </OfflineContainer>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </ContentArea>
              <GlobalFooter onHeightChange={handleFooterHeightChange} />
            </MainArea>
          </LayoutWrapper>
        </AppContainer>

        {/* Modals */}
        <ChangePasswordModal
          isOpen={showChangePassword}
          onClose={closeChangePasswordModal}
          theme={theme}
          currentPassword={currentPassword}
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          showCurrent={showCurrent}
          showNew={showNew}
          showConfirm={showConfirm}
          modalLoading={modalLoading}
          onCurrentPasswordChange={setCurrentPassword}
          onNewPasswordChange={setNewPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onToggleShowCurrent={() => setShowCurrent(!showCurrent)}
          onToggleShowNew={() => setShowNew(!showNew)}
          onToggleShowConfirm={() => setShowConfirm(!showConfirm)}
          onSubmit={handlePasswordChange}
        />

        <ExitConfirmModal
          isOpen={showExitConfirm}
          onClose={() => setShowExitConfirm(false)}
          onConfirm={handleExit}
          theme={theme}
        />

        <NetworkModal
          isOpen={!isOnline && !isWeakConnection}
          isCheckingConnection={isCheckingConnection}
          onRetry={handleRetry}
          onExit={handleExit}
        />

        {currentAnnouncement && (
          <AnnouncementModal
            announcement={currentAnnouncement}
            onRemindMeLater={handleRemindMeLater}
            onDontShowAgain={handleDontShowAgain}
          />
        )}

        {seenByModalOpen && canViewSeenByList && (
          <SeenByModal
            isOpen={seenByModalOpen}
            onClose={handleCloseSeenBy}
            entries={seenByEntries}
            loading={seenByLoading}
            error={seenByError}
          />
        )}

        <AboutUsModal
          isOpen={aboutUsModalOpen}
          onClose={() => setAboutUsModalOpen(false)}
        />

      </ThemeProvider>
    </MuiThemeProvider>
  );
};

// Wrapper component with all providers
const LayoutWithProviders: React.FC = () => {
  return (
    <PageHeaderProvider>
      <PageFooterProvider>
        <CustomThemeProvider>
          <MuteProvider>
            <NotificationProvider>
              <PresenceManager />
              <Layout />
            </NotificationProvider>
          </MuteProvider>
        </CustomThemeProvider>
      </PageFooterProvider>
    </PageHeaderProvider>
  );
};

export default LayoutWithProviders;
