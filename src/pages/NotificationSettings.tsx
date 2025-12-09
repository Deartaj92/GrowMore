import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { activityTrackingService, NotificationPreferences } from '../services/activityTrackingService';
import { useToast } from '../components/useToast';
import { ThemeContext, darkTheme, lightTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../contexts/NotificationContext';
import {
  Notifications as NotificationsIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

const Container = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  padding-bottom: 3rem; /* Extra padding at bottom to prevent clipping */
  height: 100%;
  min-height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
  position: relative;

  @media (max-width: 768px) {
    padding: 1rem;
    padding-bottom: 3rem;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1rem 1.5rem;
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    padding: 1rem;
    gap: 1rem;
  }

  @media (max-width: 480px) {
    padding: 0.875rem;
    gap: 0.875rem;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    width: 100%;
  }

  @media (max-width: 480px) {
    gap: 0.875rem;
  }
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.25rem;
  font-weight: 600;
  white-space: nowrap;

  @media (max-width: 768px) {
    font-size: 1.1rem;
    width: 100%;
    justify-content: flex-start;
  }

  @media (max-width: 480px) {
    font-size: 1rem;
    gap: 0.375rem;
    
    svg {
      font-size: 1.25rem !important;
    }
  }
`;

const HeaderSettings = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex: 1;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    width: 100%;
    padding: 0.5rem 0;
    border-top: 1px solid ${({ theme }) => theme.BORDER};
    border-bottom: 1px solid ${({ theme }) => theme.BORDER};
    margin: 0.5rem 0;
  }

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.875rem;
    padding: 0.75rem 0;
  }
`;

const HeaderSettingItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;

  @media (max-width: 768px) {
    flex: 1;
    justify-content: space-between;
    min-width: 0;
  }

  @media (max-width: 480px) {
    width: 100%;
    gap: 1rem;
  }
`;

const HeaderSettingLabel = styled.label`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  white-space: nowrap;
  cursor: pointer;
  user-select: none;

  @media (max-width: 768px) {
    font-size: 0.875rem;
    white-space: normal;
    flex: 1;
    min-width: 0;
  }

  @media (max-width: 480px) {
    font-size: 0.85rem;
    line-height: 1.4;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: stretch;
    gap: 0.75rem;
    
    button {
      flex: 1;
      min-height: 44px; /* Better touch target */
    }
  }

  @media (max-width: 480px) {
    gap: 0.625rem;
    
    button {
      min-height: 48px; /* Even larger touch target on small screens */
      font-size: 0.875rem;
      padding: 0.625rem 0.875rem;
    }
  }
`;

const CompactToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
  cursor: pointer;
  touch-action: manipulation; /* Better touch handling */

  @media (max-width: 768px) {
    width: 48px;
    height: 26px;
    min-width: 48px; /* Ensure minimum touch target */
  }

  @media (max-width: 480px) {
    width: 52px;
    height: 28px;
    min-width: 52px;
  }
`;

const CompactToggleInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;

  &:checked + span {
    background-color: ${({ theme }) => theme.ACCENT};
  }

  &:checked + span:before {
    transform: translateX(20px);
  }

  &:focus + span {
    box-shadow: 0 0 0 3px ${({ theme }) => theme.ACCENT}33;
  }
`;

const CompactToggleSlider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${({ theme }) => theme.BORDER};
  transition: 0.3s;
  border-radius: 24px;

  &:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }

  @media (max-width: 768px) {
    &:before {
      height: 20px;
      width: 20px;
      left: 3px;
      bottom: 3px;
    }
  }

  @media (max-width: 480px) {
    &:before {
      height: 22px;
      width: 22px;
      left: 3px;
      bottom: 3px;
    }
  }
`;

const CompactButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  white-space: nowrap;
  touch-action: manipulation; /* Better touch handling */
  -webkit-tap-highlight-color: transparent; /* Remove tap highlight on mobile */

  ${({ $variant, theme }) =>
    $variant === 'primary'
      ? `
    background: ${theme.ACCENT};
    color: ${theme.BG};
    &:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
    &:active {
      transform: translateY(0);
      opacity: 0.85;
    }
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
  `
      : `
    background: ${theme.CARD};
    color: ${theme.TEXT_PRIMARY};
    border: 1px solid ${theme.BORDER};
    &:hover {
      background: ${theme.BG};
    }
    &:active {
      background: ${theme.BG};
      transform: scale(0.98);
    }
  `}

  @media (max-width: 768px) {
    font-size: 0.875rem;
    padding: 0.625rem 1rem;
  }

  @media (max-width: 480px) {
    font-size: 0.85rem;
    padding: 0.75rem 0.875rem;
    
    svg {
      font-size: 1rem !important;
    }
  }
`;

const Card = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-top: 1rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  border-radius: 8px;
  background: ${({ theme }) => theme.BG};
  border: 1px solid ${({ theme }) => theme.BORDER};
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.HOVER_BG || theme.BG};
    border-color: ${({ theme }) => theme.ACCENT}33;
  }
`;

const SettingInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const SettingLabel = styled.label`
  font-size: 1rem;
  font-weight: 500;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  cursor: pointer;
`;

const SettingDescription = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
  margin-left: 1rem;
`;

const ToggleInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;

  &:checked + span {
    background-color: ${({ theme }) => theme.ACCENT};
  }

  &:checked + span:before {
    transform: translateX(24px);
  }

  &:focus + span {
    box-shadow: 0 0 0 3px ${({ theme }) => theme.ACCENT}33;
  }
`;

const ToggleSlider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${({ theme }) => theme.BORDER};
  transition: 0.3s;
  border-radius: 28px;

  &:before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }
`;


const SuccessMessage = styled.div`
  padding: 1rem;
  border-radius: 8px;
  background: #10b98122;
  border: 1px solid #10b981;
  color: #10b981;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

// Skeleton Loader Components
const SkeletonHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1rem 1.5rem;
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  margin-bottom: 1.5rem;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.1), transparent);
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    padding: 1rem;
    gap: 1rem;
  }

  @media (max-width: 480px) {
    padding: 0.875rem;
    gap: 0.875rem;
  }
`;

const SkeletonHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    width: 100%;
  }
`;

const SkeletonTitle = styled.div`
  width: 200px;
  height: 28px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 6px;

  @media (max-width: 768px) {
    width: 180px;
    height: 24px;
  }

  @media (max-width: 480px) {
    width: 150px;
    height: 22px;
  }
`;

const SkeletonHeaderSettings = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex: 1;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    width: 100%;
    padding: 0.5rem 0;
    border-top: 1px solid ${({ theme }) => theme.BORDER};
    border-bottom: 1px solid ${({ theme }) => theme.BORDER};
    margin: 0.5rem 0;
  }

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.875rem;
    padding: 0.75rem 0;
  }
`;

const SkeletonToggleItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;

  @media (max-width: 768px) {
    flex: 1;
    justify-content: space-between;
  }

  @media (max-width: 480px) {
    width: 100%;
    gap: 1rem;
  }
`;

const SkeletonToggleLabel = styled.div`
  width: 140px;
  height: 16px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 4px;

  @media (max-width: 480px) {
    width: 120px;
    height: 14px;
  }
`;

const SkeletonToggle = styled.div`
  width: 44px;
  height: 24px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 24px;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 48px;
    height: 26px;
  }

  @media (max-width: 480px) {
    width: 52px;
    height: 28px;
  }
`;

const SkeletonHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: stretch;
    gap: 0.75rem;
  }

  @media (max-width: 480px) {
    gap: 0.625rem;
  }
`;

const SkeletonButton = styled.div`
  width: 80px;
  height: 36px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 8px;

  @media (max-width: 768px) {
    flex: 1;
    height: 44px;
  }

  @media (max-width: 480px) {
    height: 48px;
  }
`;

const SkeletonCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.1), transparent);
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

const SkeletonSectionTitle = styled.div`
  width: 200px;
  height: 24px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 6px;
  margin-bottom: 0.75rem;
`;

const SkeletonDescription = styled.div`
  width: 100%;
  height: 14px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 4px;
  margin-bottom: 1rem;
`;

const SkeletonCategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-top: 1rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const SkeletonCategoryRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  border-radius: 8px;
  background: ${({ theme }) => theme.BG};
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const SkeletonCategoryInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SkeletonCategoryLabel = styled.div`
  width: 180px;
  height: 16px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 4px;
`;

const SkeletonCategoryDesc = styled.div`
  width: 240px;
  height: 12px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 4px;
`;

const SkeletonCategoryToggle = styled.div`
  width: 52px;
  height: 28px;
  background: ${({ theme }) => theme.BG === '#252525' ? '#353b4a' : '#e5e7eb'};
  border-radius: 28px;
  flex-shrink: 0;
  margin-left: 1rem;
`;

// Skeleton Loader Component
const NotificationSettingsSkeleton: React.FC<{ theme: any }> = ({ theme }) => (
  <Container theme={theme}>
    <SkeletonHeader theme={theme}>
      <SkeletonHeaderLeft>
        <SkeletonTitle theme={theme} />
        <SkeletonHeaderSettings theme={theme}>
          <SkeletonToggleItem>
            <SkeletonToggleLabel theme={theme} />
            <SkeletonToggle theme={theme} />
          </SkeletonToggleItem>
          <SkeletonToggleItem>
            <SkeletonToggleLabel theme={theme} />
            <SkeletonToggle theme={theme} />
          </SkeletonToggleItem>
        </SkeletonHeaderSettings>
      </SkeletonHeaderLeft>
      <SkeletonHeaderActions theme={theme}>
        <SkeletonButton theme={theme} />
        <SkeletonButton theme={theme} style={{ width: '100px' }} />
      </SkeletonHeaderActions>
    </SkeletonHeader>

    <SkeletonCard theme={theme}>
      <SkeletonSectionTitle theme={theme} />
      <SkeletonDescription theme={theme} />
      <SkeletonCategoryGrid theme={theme}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <SkeletonCategoryRow key={i} theme={theme}>
            <SkeletonCategoryInfo>
              <SkeletonCategoryLabel theme={theme} />
              <SkeletonCategoryDesc theme={theme} />
            </SkeletonCategoryInfo>
            <SkeletonCategoryToggle theme={theme} />
          </SkeletonCategoryRow>
        ))}
      </SkeletonCategoryGrid>
    </SkeletonCard>
  </Container>
);

interface NotificationCategory {
  key: 'notify_attendance' | 'notify_test_marks' | 'notify_examination_marks' | 'notify_homework_diary' | 'notify_subject_assignment' | 'notify_reports' | 'notify_announcements' | 'notify_system';
  label: string;
  description: string;
}

const NotificationSettings: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const { user } = useAuth();
  const toast = useToast();
  const { refreshNotifications } = useNotifications();

  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const categories: NotificationCategory[] = [
    {
      key: 'notify_attendance',
      label: 'Attendance Notifications',
      description: 'Get notified when attendance is marked or updated',
    },
    {
      key: 'notify_test_marks',
      label: 'Test Marks Notifications',
      description: 'Receive notifications about test marks entry and updates',
    },
    {
      key: 'notify_examination_marks',
      label: 'Examination Marks Notifications',
      description: 'Get notified about examination marks entry and changes',
    },
    {
      key: 'notify_homework_diary',
      label: 'Homework Diary Notifications',
      description: 'Receive notifications about homework assignments and updates',
    },
    {
      key: 'notify_subject_assignment',
      label: 'Subject Assignment Notifications',
      description: 'Get notified when subjects are assigned or updated',
    },
    {
      key: 'notify_reports',
      label: 'Report Notifications',
      description: 'Receive notifications about student or staff reports',
    },
    {
      key: 'notify_announcements',
      label: 'Announcement Notifications',
      description: 'Get notified about new announcements and updates',
    },
    {
      key: 'notify_system',
      label: 'System Notifications',
      description: 'Receive system-wide notifications and important updates',
    },
  ];

  useEffect(() => {
    loadPreferences();
  }, [user?.staff_id, user?.school_id]);

  const loadPreferences = async () => {
    if (!user?.staff_id || !user?.school_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const prefs = await activityTrackingService.getNotificationPreferences(
        user.staff_id,
        user.school_id
      );

      if (prefs) {
        setPreferences(prefs);
      } else {
        // Create default preferences if none exist
        const defaultPrefs: Partial<NotificationPreferences> = {
          user_id: user.staff_id,
          school_id: user.school_id,
          activity_notifications: true,
          system_notifications: true,
          email_notifications: false,
          push_notifications: true,
          notify_attendance: true,
          notify_test_marks: true,
          notify_examination_marks: true,
          notify_homework_diary: true,
          notify_subject_assignment: true,
          notify_reports: true,
          notify_announcements: true,
          notify_system: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setPreferences(defaultPrefs as NotificationPreferences);
      }
    } catch (error) {
      toast.showToast('Failed to load notification preferences', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    if (!preferences) return;

    setPreferences({
      ...preferences,
      [key]: !preferences[key],
    });
  };

  const handleSave = async () => {
    if (!preferences || !user?.staff_id || !user?.school_id) {
      toast.showToast('Missing user information', 'error');
      return;
    }

    setSaving(true);
    try {
      const updated = await activityTrackingService.updateNotificationPreferences(
        user.staff_id,
        user.school_id,
        preferences
      );

      if (updated) {
        setPreferences(updated);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        toast.showToast('Notification preferences saved successfully!', 'success');
        // Refresh notifications to apply the new preferences
        await refreshNotifications();
      } else {
        toast.showToast('Failed to save preferences', 'error');
      }
    } catch (error) {
      toast.showToast('Failed to save notification preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!user?.staff_id || !user?.school_id) return;

    const defaultPrefs: Partial<NotificationPreferences> = {
      user_id: user.staff_id,
      school_id: user.school_id,
      activity_notifications: true,
      system_notifications: true,
      email_notifications: false,
      push_notifications: true,
      notify_attendance: true,
      notify_test_marks: true,
      notify_examination_marks: true,
      notify_homework_diary: true,
      notify_subject_assignment: true,
      notify_reports: true,
      notify_announcements: true,
      notify_system: true,
    };
    setPreferences(defaultPrefs as NotificationPreferences);
  };

  if (loading) {
    return <NotificationSettingsSkeleton theme={theme} />;
  }

  if (!user?.staff_id) {
    return (
      <Container theme={theme}>
        <Card theme={theme}>
          <p>You must be logged in as a staff member to access notification settings.</p>
        </Card>
      </Container>
    );
  }

  return (
    <Container theme={theme}>
      {showSuccess && (
        <SuccessMessage>
          <CheckCircleIcon />
          Settings saved successfully!
        </SuccessMessage>
      )}

      <Header theme={theme}>
        <HeaderLeft>
          <HeaderTitle theme={theme}>
            <NotificationsIcon />
            Notification Settings
          </HeaderTitle>
          <HeaderSettings>
            <HeaderSettingItem>
              <HeaderSettingLabel theme={theme} htmlFor="activity-toggle">
                Activity Notifications
              </HeaderSettingLabel>
              <CompactToggleSwitch>
                <CompactToggleInput
                  id="activity-toggle"
                  type="checkbox"
                  checked={preferences?.activity_notifications ?? true}
                  onChange={() => handleToggle('activity_notifications')}
                />
                <CompactToggleSlider theme={theme} />
              </CompactToggleSwitch>
            </HeaderSettingItem>
            <HeaderSettingItem>
              <HeaderSettingLabel theme={theme} htmlFor="push-toggle">
                Push Notifications
              </HeaderSettingLabel>
              <CompactToggleSwitch>
                <CompactToggleInput
                  id="push-toggle"
                  type="checkbox"
                  checked={preferences?.push_notifications ?? true}
                  onChange={() => handleToggle('push_notifications')}
                />
                <CompactToggleSlider theme={theme} />
              </CompactToggleSwitch>
            </HeaderSettingItem>
          </HeaderSettings>
        </HeaderLeft>
        <HeaderActions>
          <CompactButton
            theme={theme}
            $variant="secondary"
            onClick={handleReset}
            disabled={saving}
          >
            <RefreshIcon style={{ fontSize: '1rem' }} />
            Reset
          </CompactButton>
          <CompactButton
            theme={theme}
            $variant="primary"
            onClick={handleSave}
            disabled={saving}
          >
            <SaveIcon style={{ fontSize: '1rem' }} />
            {saving ? 'Saving...' : 'Save'}
          </CompactButton>
        </HeaderActions>
      </Header>

      <Card theme={theme}>
        <SectionTitle theme={theme}>Notification Categories</SectionTitle>
        <SettingDescription theme={theme} style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
          Control which notification categories you receive. Toggle off any category to stop receiving those notifications.
        </SettingDescription>

        <CategoryGrid>
          {categories.map((category) => (
            <SettingRow key={category.key} theme={theme}>
              <SettingInfo>
                <SettingLabel theme={theme}>{category.label}</SettingLabel>
                <SettingDescription theme={theme} style={{ fontSize: '0.8rem' }}>
                  {category.description}
                </SettingDescription>
              </SettingInfo>
              <ToggleSwitch>
              <ToggleInput
                type="checkbox"
                checked={typeof preferences?.[category.key] === 'boolean' ? preferences[category.key] : true}
                onChange={() => handleToggle(category.key)}
              />
                <ToggleSlider theme={theme} />
              </ToggleSwitch>
            </SettingRow>
          ))}
        </CategoryGrid>
      </Card>
    </Container>
  );
};

export default NotificationSettings;

