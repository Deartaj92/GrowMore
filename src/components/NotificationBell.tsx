import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import {
  Notifications as BellIcon,
  NotificationsActive as BellActiveIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Grade as GradeIcon,
  Event as EventIcon,
  Book as BookIcon,
  Group as GroupIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useNotifications } from '../contexts/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationBellContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const BellButton = styled.button<{ $hasUnread: boolean }>`
  position: relative;
  background: none;
  border: none;
  color: ${props => props.$hasUnread ? props.theme.ACCENT : props.theme.TEXT_SECONDARY};
  font-size: 1.5rem;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${props => props.theme.HOVER_BG};
    color: ${props => props.theme.ACCENT};
    transform: scale(1.05);
  }

  svg {
    width: 24px;
    height: 24px;
  }
`;

const UnreadBadge = styled.div`
  position: absolute;
  top: 4px;
  right: 4px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  border: 2px solid ${props => props.theme.CARD};
  animation: ${props => props.theme === 'dark' ? 'pulse-red' : 'pulse-red-light'} 2s infinite;

  @keyframes pulse-red {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
    50% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3); }
  }

  @keyframes pulse-red-light {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
    50% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2); }
  }
`;

const NotificationDropdown = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: ${props => props.theme.CARD};
  border: 1px solid ${props => props.theme.BORDER};
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  width: 380px;
  max-height: 500px;
  overflow: hidden;
  z-index: 3000;

  @media (max-width: 700px) {
    width: 320px;
    right: -10px;
  }
`;

const NotificationHeader = styled.div<{ $isRead?: boolean }>`
  padding: 16px 20px;
  border-bottom: 1px solid ${props => props.theme.BORDER};
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${props => props.theme.ACCENT}10;
`;

const NotificationTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${props => props.theme.TEXT_PRIMARY};
`;

const MarkAllReadButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.ACCENT};
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s ease;

  &:hover {
    background: ${props => props.theme.HOVER_BG};
  }
`;

const NotificationList = styled.div`
  max-height: 400px;
  overflow-y: auto;
`;

const NotificationItem = styled.div<{ $isRead: boolean; $isImportant: boolean }>`
  padding: 12px 16px;
  border-bottom: 1px solid ${props => props.theme.BORDER};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  background: ${props =>
    props.$isImportant
      ? `${props.theme.ACCENT}10`
      : props.$isRead
        ? 'transparent'
        : `${props.theme.ACCENT}05`
  };
  border-left: ${props => props.$isImportant ? '4px solid #ef4444' : '4px solid transparent'};
  animation: ${props => props.$isImportant && !props.$isRead ? 'pulse-important 2s ease-in-out infinite' : 'none'};

  @keyframes pulse-important {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
    }
    50% {
      box-shadow: 0 0 0 4px rgba(239, 68, 68, 0);
    }
  }

  &:hover {
    background: ${props => props.$isImportant ? `${props.theme.ACCENT}15` : props.theme.HOVER_BG};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const NotificationIcon = styled.div<{ $type: string; $isImportant: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  flex-shrink: 0;
  background: ${props => {
    if (props.$isImportant) return '#ef4444';
    switch (props.$type) {
      case 'activity': return props.theme.ACCENT;
      case 'system': return '#10b981';
      case 'alert': return '#f59e0b';
      default: return props.theme.ACCENT;
    }
  }};
  color: white;
  font-size: 0.9rem;
`;

const NotificationContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const NotificationTitleText = styled.div<{ $isRead: boolean }>`
  font-weight: ${props => props.$isRead ? '500' : '600'};
  font-size: 0.9rem;
  color: ${props => props.theme.TEXT_PRIMARY};
  line-height: 1.2;
  flex: 1;
`;

const NotificationDate = styled.div<{ $isRead: boolean }>`
  font-weight: ${props => props.$isRead ? '400' : '500'};
  font-size: 0.75rem;
  color: ${props => props.theme.TEXT_SECONDARY};
  line-height: 1.2;
  flex-shrink: 0;
`;

const NotificationMessage = styled.div<{ $isRead: boolean }>`
  font-size: 0.8rem;
  color: ${props => props.theme.TEXT_SECONDARY};
  line-height: 1.3;
`;

const NotificationTime = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.TEXT_SECONDARY};
  display: flex;
  align-items: center;
  gap: 4px;
`;


const EmptyState = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: ${props => props.theme.TEXT_SECONDARY};
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  color: ${props => props.theme.TEXT_SECONDARY}50;
  margin-bottom: 16px;
`;

const EmptyTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${props => props.theme.TEXT_PRIMARY};
`;

const EmptyMessage = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: ${props => props.theme.TEXT_SECONDARY};
`;

const LoadingState = styled.div`
  padding: 20px;
  text-align: center;
  color: ${props => props.theme.TEXT_SECONDARY};
`;

const NotificationBell: React.FC = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notificationId: number) => {
    // Mark notification as read when clicked
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.is_read) {
      await markAsRead([notificationId]);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const getNotificationIcon = (type: string, isImportant: boolean) => {
    if (isImportant) return <ErrorIcon />;
    
    switch (type) {
      // Activity types
      case 'attendance': return <PersonIcon />;
      case 'test_marks': return <AssessmentIcon />;
      case 'examination_marks': return <GradeIcon />;
      case 'subject_assignment': return <AssignmentIcon />;
      case 'class_management': return <SchoolIcon />;
      case 'student_management': return <GroupIcon />;
      case 'report': return <WarningIcon />;
      
      // System types
      case 'activity': return <BellIcon />;
      case 'system': return <InfoIcon />;
      case 'alert': return <WarningIcon />;
      
      // Default fallback
      default: return <BellIcon />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <NotificationBellContainer>
      <BellButton
        ref={buttonRef}
        $hasUnread={unreadCount > 0}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        {unreadCount > 0 ? <BellActiveIcon /> : <BellIcon />}
        {unreadCount > 0 && (
          <UnreadBadge>
            {unreadCount > 99 ? '99+' : unreadCount}
          </UnreadBadge>
        )}
      </BellButton>

      <AnimatePresence>
        {isOpen && (
          <NotificationDropdown
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <NotificationHeader>
              <NotificationTitle>Notifications</NotificationTitle>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={refreshNotifications}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer',
                    padding: '4px',
                    fontSize: '14px'
                  }}
                  title="Refresh notifications"
                >
                  🔄
                </button>
                {unreadCount > 0 && (
                  <MarkAllReadButton onClick={handleMarkAllRead}>
                    Mark all read
                  </MarkAllReadButton>
                )}
              </div>
            </NotificationHeader>

            <NotificationList>
              {isLoading ? (
                <LoadingState>Loading notifications...</LoadingState>
              ) : notifications.length === 0 ? (
                <EmptyState>
                  <EmptyIcon>
                    <BellIcon />
                  </EmptyIcon>
                  <EmptyTitle>No notifications</EmptyTitle>
                  <EmptyMessage>You're all caught up!</EmptyMessage>
                </EmptyState>
              ) : (
                notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    $isRead={notification.is_read}
                    $isImportant={notification.is_important}
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <NotificationIcon
                        $type={notification.notification_type}
                        $isImportant={notification.is_important}
                      >
                        {getNotificationIcon(notification.notification_type, notification.is_important)}
                      </NotificationIcon>
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* First line: Teacher name + Time */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '4px'
                        }}>
                          <NotificationTitleText $isRead={notification.is_read}>
                            {notification.title}
                          </NotificationTitleText>
                          <NotificationDate $isRead={notification.is_read}>
                            {formatTime(notification.created_at)}
                          </NotificationDate>
                        </div>
                        
                        {/* Second line: Description only */}
                        <NotificationMessage $isRead={notification.is_read}>
                          {notification.message}
                        </NotificationMessage>
                      </div>
                    </div>
                  </NotificationItem>
                ))
              )}
            </NotificationList>
          </NotificationDropdown>
        )}
      </AnimatePresence>
    </NotificationBellContainer>
  );
};

export default NotificationBell;
