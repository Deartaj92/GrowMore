import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  DoneAll as DoneAllIcon,
} from '@mui/icons-material';
import { useNotifications } from '../contexts/NotificationContext';
import { Notification } from '../services/activityTrackingService';
import { motion, AnimatePresence } from 'framer-motion';
import { ReportDetailsModal } from './reports/ReportDetailsModal';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';
import { hasPermission } from '../services/permissionService';

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

// Helper to get student session info
const getStudentInfo = () => {
  try {
    const studentSessionStr = localStorage.getItem('studentSession');
    if (studentSessionStr) {
      return JSON.parse(studentSessionStr);
    }
  } catch (error) {
    // Ignore parse errors
  }
  return null;
};

const NotificationBellContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const BellButton = styled.button<{ $hasUnread: boolean; $hasNew: boolean }>`
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
  animation: ${props => props.$hasNew ? 'newNotificationPulse 0.6s ease-out' : 'none'};

  @keyframes newNotificationPulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.15);
    }
    100% {
      transform: scale(1);
    }
  }

  &:hover {
    background: ${props => props.theme.HOVER_BG};
    color: ${props => props.theme.ACCENT};
    transform: scale(1.05);
  }

  svg {
    width: 24px;
    height: 24px;
    transition: transform 0.2s ease;
  }
`;

const UnreadBadge = styled.div<{ $isNew?: boolean }>`
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
  animation: ${props => {
    if (props.$isNew) {
      return 'newBadgePulse 0.6s ease-out';
    }
    return props.theme === 'dark' ? 'pulse-red' : 'pulse-red-light';
  }} ${props => props.$isNew ? '1' : 'infinite'};

  @keyframes newBadgePulse {
    0% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
    }
    50% {
      transform: scale(1.3);
      box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
    }
  }

  @keyframes pulse-red {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
    50% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3); }
  }

  @keyframes pulse-red-light {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
    50% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2); }
  }
`;

const NewNotificationPopup = styled(motion.div)`
  position: absolute;
  top: -40px;
  right: 0;
  background: ${props => props.theme.ACCENT};
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    right: 12px;
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 4px solid ${props => props.theme.ACCENT};
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
  padding: 12px 16px;
  border-bottom: 1px solid ${props => props.theme.BORDER};
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${props => props.theme.ACCENT}10;
  gap: 12px;
  
  @media (max-width: 768px) {
    padding: 10px 12px;
    gap: 8px;
    flex-wrap: wrap;
  }
`;

const NotificationHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  
  @media (max-width: 768px) {
    gap: 6px;
  }
`;

const NotificationHeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    gap: 4px;
  }
`;

const HeaderActionButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.TEXT_SECONDARY};
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  min-width: 32px;
  height: 32px;
  
  &:hover {
    background: ${props => props.theme.HOVER_BG};
    color: ${props => props.theme.ACCENT};
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  svg {
    font-size: 18px;
  }
  
  @media (max-width: 768px) {
    padding: 5px;
    min-width: 28px;
    height: 28px;
    
    svg {
      font-size: 16px;
    }
  }
`;

const TabContainer = styled.div`
  display: flex;
  gap: 0;
  padding: 0;
  border-bottom: 2px solid ${props => props.theme.BORDER};
  background: ${props => props.theme.CARD};
  position: relative;
`;

const TabButton = styled.button<{ $isActive: boolean }>`
  background: transparent;
  color: ${props => props.$isActive ? props.theme.ACCENT : props.theme.TEXT_SECONDARY};
  border: none;
  border-bottom: 3px solid ${props => props.$isActive ? props.theme.ACCENT : 'transparent'};
  padding: 12px 20px;
  border-radius: 0;
  font-size: 0.9rem;
  font-weight: ${props => props.$isActive ? '600' : '500'};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
  flex: 1;
  margin: 0;

  &:hover {
    background: ${props => props.$isActive ? 'transparent' : props.theme.HOVER_BG};
    color: ${props => props.$isActive ? props.theme.ACCENT : props.theme.TEXT_PRIMARY};
  }

  &:active {
    transform: none;
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.ACCENT};
    outline-offset: -2px;
  }
`;

const TabBadge = styled.span`
  background: ${props => props.theme.ACCENT};
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
  line-height: 1.2;
`;

const TabBadgeInactive = styled.span`
  background: ${props => props.theme.TEXT_SECONDARY};
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
  line-height: 1.2;
`;

const NotificationTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${props => props.theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    gap: 6px;
  }
`;

const UnreadCountBadge = styled.span`
  background: #ef4444;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
  line-height: 1.4;
  
  @media (max-width: 768px) {
    font-size: 0.7rem;
    padding: 2px 5px;
    min-width: 18px;
  }
`;

const NotificationList = styled.div`
  max-height: 400px;
  overflow-y: auto;
  padding-right: 2px; /* Prevent content from touching scrollbar */

  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: ${props => props.theme.TEXT_SECONDARY} transparent;

  /* Chrome/Edge/Safari */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: ${props => props.theme.TEXT_SECONDARY};
    border-radius: 3px;
    border: 1px solid transparent; /* Creates padding around thumb */
    background-clip: content-box;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background-color: ${props => props.theme.ACCENT};
  }
`;

const NotificationItem = styled.div<{ $isRead: boolean; $isImportant: boolean }>`
  padding: 12px 16px;
  border-bottom: 1px solid ${props => props.theme.BORDER};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  background: ${props => {
    // Read items: no background
    if (props.$isRead) {
      return 'transparent';
    }
    // Unread important items: slightly more visible
    if (props.$isImportant) {
      return `${props.theme.ACCENT}15`;
    }
    // Unread normal items: subtle background
    return `${props.theme.ACCENT}10`;
  }};
  border-left: ${props =>
    props.$isImportant
      ? '4px solid #ef4444'
      : props.$isRead
        ? '4px solid transparent'
        : `4px solid ${props.theme.ACCENT}`
  };
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
    background: ${props => {
      // Read items on hover: subtle hover background
      if (props.$isRead) {
        return props.theme.HOVER_BG;
      }
      // Unread important items on hover: maintain visibility
      if (props.$isImportant) {
        return `${props.theme.ACCENT}20`;
      }
      // Unread normal items on hover: slightly more visible
      return `${props.theme.ACCENT}15`;
    }};
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
    
    // Category-specific colors for letter indicators
    switch (props.$type) {
      case 'attendance': return '#3b82f6'; // Blue for Attendance (A)
      case 'test_marks': return '#10b981'; // Green for Test (T)
      case 'homework_diary': return '#f59e0b'; // Orange/Amber for Diary (D)
      
      // Other activity types
      case 'examination_marks': return '#8b5cf6'; // Purple
      case 'subject_assignment': return '#06b6d4'; // Cyan
      case 'class_management': return '#ec4899'; // Pink
      case 'student_management': return '#14b8a6'; // Teal
      
      // System types
      case 'activity': return props.theme.ACCENT;
      case 'system': return '#10b981';
      case 'alert': return '#f59e0b';
      case 'report': return '#ef4444'; // Red for reports
      case 'announcement': return '#6366f1'; // Indigo
      
      default: return props.theme.ACCENT;
    }
  }};
  color: white;
  font-size: 0.9rem;
`;

const CategoryLetter = styled.span`
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: 0;
  line-height: 1;
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

const UnreadDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.theme.ACCENT};
  margin-left: 6px;
  flex-shrink: 0;
  box-shadow: 0 0 4px ${props => props.theme.ACCENT}60;
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
    setPanelOpen,
    openAnnouncement,
    loadMore,
    hasMore
  } = useNotifications();

  const { user } = useAuth();
  const parentInfo = getParentInfo();
  const studentInfo = getStudentInfo();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [activeTab, setActiveTab] = useState<'activity' | 'reports'>('activity');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const previousUnreadCountRef = useRef(unreadCount);
  
  // Use refs to track current values for IntersectionObserver callback
  const hasMoreRef = useRef(hasMore);
  const isLoadingRef = useRef(isLoading);
  const isOpenRef = useRef(isOpen);
  const loadMoreRef = useRef(loadMore);
  const activeTabRef = useRef(activeTab);
  
  // Update refs when values change
  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);
  
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);
  
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);
  
  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Filter notifications based on active tab (moved up for use in useEffect)
  // Activity: All notifications except reports (includes activities and announcements)
  // All report notifications (including deletes) go to Reports tab
  const activityNotifications = notifications.filter((n: Notification) => {
    // Exclude all report notifications - they go to Reports tab
    return n.notification_type !== 'report';
  });
  
  // Calculate hasMore for the active tab
  // Activity tab: use the context's hasMore (tracks activity notifications pagination)
  // Reports tab: always false (all reports are loaded at once)
  const hasMoreForActiveTab = activeTab === 'activity' ? hasMore : false;

  // Update hasMoreRef when activeTab or hasMore changes
  useEffect(() => {
    hasMoreRef.current = hasMoreForActiveTab;
  }, [hasMoreForActiveTab]);

  // Track new notifications and show indicator
  useEffect(() => {
    // Check if unread count increased (new notification arrived)
    if (unreadCount > previousUnreadCountRef.current) {
      const newCount = unreadCount - previousUnreadCountRef.current;
      if (newCount > 0) {
        setHasNewNotification(true);
        // Auto-hide after 3 seconds
        const timer = setTimeout(() => {
          setHasNewNotification(false);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
    previousUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  // Hide indicator when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setHasNewNotification(false);
    }
  }, [isOpen]);

  useEffect(() => {
    // Only set up observer when dropdown is open, has more items for active tab, and not currently loading
    // Only enable observer for Activity tab (Reports tab doesn't need pagination)
    if (!isOpen || !hasMoreForActiveTab || isLoading || activeTab !== 'activity') {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        // Use refs to get current values instead of closure values
        const currentHasMore = hasMoreRef.current;
        const currentIsLoading = isLoadingRef.current;
        const currentIsOpen = isOpenRef.current;
        const currentActiveTab = activeTabRef.current;
        
        // Only trigger if intersecting, has more, not loading, dropdown is still open, and on Activity tab
        if (entry.isIntersecting && currentHasMore && !currentIsLoading && currentIsOpen && currentActiveTab === 'activity') {
          loadMoreRef.current();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    const target = observerTarget.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
      observer.disconnect();
    };
  }, [hasMoreForActiveTab, isLoading, isOpen, activeTab]);

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

  // Pause automatic refresh while panel is open
  useEffect(() => {
    setPanelOpen(isOpen);
    return () => setPanelOpen(false);
  }, [isOpen, setPanelOpen]);

  const handleNotificationClick = async (notificationId: number) => {
    // Mark notification as read when clicked
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      if (!notification.is_read) {
        await markAsRead([notificationId]);
      }

      // If it's an announcement, open it
      if (notification.notification_type === 'announcement') {
        openAnnouncement(notification.id);
        setIsOpen(false);
        return;
      }
      
      // Navigate to leave requests page for leave_request notifications
      // ONLY navigate for "New Leave Request Submitted" notifications (for reviewers)
      // DO NOT navigate for "Leave Request Approved/Rejected" (status updates for requesters)
      if (notification.notification_type === 'leave_request') {
        const schoolId = user?.school_id || studentInfo?.school_id || parentInfo?.school_id;
        if (!schoolId) {
          setIsOpen(false);
          return;
        }

        // Check if this is a "new request" notification (for reviewers) vs status update (for requesters)
        const isNewRequestNotification = notification.title?.includes('New Leave Request Submitted') || 
                                         notification.message?.includes('submitted a new');
        const isStatusUpdate = notification.title?.includes('Approved') || 
                              notification.title?.includes('Rejected');

        // Only navigate for "new request" notifications, NOT for status updates
        if (isNewRequestNotification && !isStatusUpdate) {
          // Check if user has permission to view leave requests page
          let hasPagePermission = false;
          if (user?.id) {
            hasPagePermission = await hasPermission(user.id, 'leave-requests', schoolId);
          }

          // Only navigate if user has permission
          if (hasPagePermission) {
            setIsOpen(false);
            navigate('/attendance/leave-requests');
          } else {
            // No permission - just mark as read, don't navigate
            setIsOpen(false);
          }
        } else {
          // Status update notification - just mark as read, don't navigate
          setIsOpen(false);
        }
        return;
      }
      
      // Navigate to complaints/suggestions page
      // ONLY navigate for "New Complaint Submitted" notifications (for reviewers)
      // DO NOT navigate for "Complaint Reviewed" (status updates for requesters)
      if (notification.notification_type === 'complaint') {
        const schoolId = user?.school_id || studentInfo?.school_id || parentInfo?.school_id;
        if (!schoolId) {
          setIsOpen(false);
          return;
        }

        // Check if this is a "new complaint" notification (for reviewers) vs status update (for requesters)
        const isNewComplaintNotification = notification.title?.includes('New Complaint Submitted') || 
                                           notification.message?.includes('submitted a new complaint');
        const isStatusUpdate = notification.title?.includes('Reviewed') || 
                              notification.title?.includes('Complaint Reviewed');

        // Only navigate for "new complaint" notifications, NOT for status updates
        if (isNewComplaintNotification && !isStatusUpdate) {
          // Check if user has permission to view complaints-suggestions page
          let hasPagePermission = false;
          if (user?.id) {
            hasPagePermission = await hasPermission(user.id, 'complaints-suggestions', schoolId);
          }

          // Only navigate if user has permission
          if (hasPagePermission) {
            setIsOpen(false);
            navigate('/attendance/complaints-suggestions', { state: { activeTab: 0 } }); // 0 = Complaints tab
          } else {
            // No permission - just mark as read, don't navigate
            setIsOpen(false);
          }
        } else {
          // Status update notification - just mark as read, don't navigate
          setIsOpen(false);
        }
        return;
      }
      
      // Navigate to complaints/suggestions page for suggestions
      // ONLY navigate for "New Suggestion Submitted" notifications (for reviewers)
      // DO NOT navigate for "Suggestion Reviewed" (status updates for requesters)
      if (notification.notification_type === 'suggestion') {
        const schoolId = user?.school_id || studentInfo?.school_id || parentInfo?.school_id;
        if (!schoolId) {
          setIsOpen(false);
          return;
        }

        // Check if this is a "new suggestion" notification (for reviewers) vs status update (for requesters)
        const isNewSuggestionNotification = notification.title?.includes('New Suggestion Submitted') || 
                                            notification.message?.includes('submitted a new suggestion');
        const isStatusUpdate = notification.title?.includes('Reviewed') || 
                              notification.title?.includes('Suggestion Reviewed');

        // Only navigate for "new suggestion" notifications, NOT for status updates
        if (isNewSuggestionNotification && !isStatusUpdate) {
          // Check if user has permission to view complaints-suggestions page
          let hasPagePermission = false;
          if (user?.id) {
            hasPagePermission = await hasPermission(user.id, 'complaints-suggestions', schoolId);
          }

          // Only navigate if user has permission
          if (hasPagePermission) {
            setIsOpen(false);
            navigate('/attendance/complaints-suggestions', { state: { activeTab: 1 } }); // 1 = Suggestions tab
          } else {
            // No permission - just mark as read, don't navigate
            setIsOpen(false);
          }
        } else {
          // Status update notification - just mark as read, don't navigate
          setIsOpen(false);
        }
        return;
      }
      
      // If it's a report notification, try to open it first
      if (notification.notification_type === 'report') {
        try {
          // Get school_id from user or parentInfo
          const schoolId = user?.school_id || parentInfo?.school_id;
          
          if (!schoolId) {
            showToast('Unable to access reports', 'error');
            return;
          }
          
          // Use activity_log_id to get the report ID (same approach as notification generation)
          if (!notification.activity_log_id) {
            showToast('Report notification is missing activity log reference', 'error');
            setIsOpen(false);
            return;
          }
          
          // Fetch activity log to get entity_id (report ID)
          const { data: activityLog, error: activityLogError } = await supabase
            .from('activity_logs')
            .select('entity_id, activity_action, teacher_id, school_id')
            .eq('id', notification.activity_log_id)
            .maybeSingle();
          
          if (activityLogError || !activityLog) {
            showToast('Unable to find activity log for this notification', 'error');
            setIsOpen(false);
            return;
          }
          
          // Check if report was deleted
          if (activityLog.activity_action === 'delete') {
            let deletedBy = notification.title || 'Unknown';
            if (activityLog.teacher_id) {
              const { data: staffData } = await supabase
                .from('staff')
                .select('name')
                .eq('id', activityLog.teacher_id)
                .maybeSingle();
              deletedBy = staffData?.name || deletedBy;
            }
            showToast(`Report is deleted by ${deletedBy}`, 'error');
            setIsOpen(false);
            return;
          }
          
          // Get report ID from entity_id
          if (!activityLog.entity_id) {
            showToast('Report ID not found in activity log', 'error');
            setIsOpen(false);
            return;
          }
          
          const reportId = activityLog.entity_id.toString();
          
          // Simple approach: Get ID from activity log → Fetch report by ID
          // Try student_reports first (most common), then employee_reports
          // Try student_reports first
          let { data: report, error: reportError } = await supabase
            .from('student_reports')
            .select('id, school_id')
            .eq('id', reportId)
            .maybeSingle();
          
          // If not found in student_reports, try employee_reports
          if (!report && !reportError) {
            const employeeResult = await supabase
              .from('employee_reports')
              .select('id, school_id')
              .eq('id', reportId)
              .maybeSingle();
            
            report = employeeResult.data;
            reportError = employeeResult.error;
          }
          
          if (reportError) {
            showToast('Error loading report: ' + (reportError.message || 'Unknown error'), 'error');
            setIsOpen(false);
            return;
          }
          
          if (!report) {
            showToast('Report not found. It may have been deleted.', 'error');
            setIsOpen(false);
            return;
          }
          
          // Verify school_id matches (security check)
          if (report.school_id !== schoolId) {
            showToast('Report belongs to a different school', 'error');
            setIsOpen(false);
            return;
          }
          
          // Report exists and school matches - open it
          setSelectedReportId(reportId);
          setReportModalOpen(true);
          setIsOpen(false);
          await markAsRead([notification.id]);
          return;
        } catch (error: any) {
          showToast('Failed to load report: ' + (error.message || 'Unknown error'), 'error');
          setIsOpen(false);
        }
      }
    }
  };

  const handleMarkAllRead = async () => {
    // Mark only the notifications in the current tab as read       
    const tabNotifications = activeTab === 'activity' ? deduplicatedActivityNotifications : deduplicatedReportNotifications;
    const unreadIds = tabNotifications.filter((n: Notification) => !n.is_read).map((n: Notification) => n.id);
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
    }
  };

  const getNotificationIcon = (type: string, isImportant: boolean, message?: string, activityAction?: string) => {
    // Check if this is a deleted report using activity_action
    const isDeleted = activityAction === 'delete' && type === 'report';
    
    if (isDeleted) {
      return <DeleteIcon />;
    }
    
    if (isImportant) return <ErrorIcon />;

    switch (type) {
      // Activity types with letter indicators
      case 'attendance': return <CategoryLetter>A</CategoryLetter>;
      case 'test_marks': return <CategoryLetter>T</CategoryLetter>;
      case 'homework_diary': return <CategoryLetter>D</CategoryLetter>;
      
      // Other activity types
      case 'examination_marks': return <GradeIcon />;
      case 'subject_assignment': return <AssignmentIcon />;
      case 'class_management': return <SchoolIcon />;
      case 'student_management': return <GroupIcon />;
      case 'report': return <WarningIcon />;

      // System types
      case 'activity': return <BellIcon />;
      case 'system': return <InfoIcon />;
      case 'alert': return <WarningIcon />;
      case 'announcement': return <BellIcon />;

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

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  };

  // Reports: All report type notifications (including delete reports)
  const reportNotifications = notifications.filter((n: Notification) => {
    return n.notification_type === 'report';
  });
  
  // Remove duplicates by creating a unique key (id + notification_type)
  const getUniqueKey = (n: Notification) => `${n.id}_${n.notification_type}`;
  const seenKeys = new Set<string>();
  
  const deduplicatedActivityNotifications = activityNotifications.filter((n: Notification) => {
    const key = getUniqueKey(n);
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });
  
  seenKeys.clear();
  const deduplicatedReportNotifications = reportNotifications.filter((n: Notification) => {
    const key = getUniqueKey(n);
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  // Get unread counts for each tab (using deduplicated lists)
  const activityUnreadCount = deduplicatedActivityNotifications.filter((n: Notification) => !n.is_read).length;
  const reportUnreadCount = deduplicatedReportNotifications.filter((n: Notification) => !n.is_read).length;

  // Get filtered notifications based on active tab (using deduplicated lists)
  const filteredNotifications = activeTab === 'activity' ? deduplicatedActivityNotifications : deduplicatedReportNotifications;

  return (
    <>
      <NotificationBellContainer>
      <BellButton
        ref={buttonRef}
        $hasUnread={unreadCount > 0}
        $hasNew={hasNewNotification}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        {unreadCount > 0 ? <BellActiveIcon /> : <BellIcon />}
        {unreadCount > 0 && (
          <UnreadBadge $isNew={hasNewNotification}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </UnreadBadge>
        )}
        <AnimatePresence>
          {hasNewNotification && unreadCount > 0 && (
            <NewNotificationPopup
              initial={{ opacity: 0, y: 5, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.9 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {unreadCount === 1 ? '1 new...' : `${unreadCount} new...`}
            </NewNotificationPopup>
          )}
        </AnimatePresence>
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
              <NotificationHeaderLeft>
                <NotificationTitle>
                  Notifications
                  {activeTab === 'activity' && activityUnreadCount > 0 && (
                    <UnreadCountBadge>
                      {activityUnreadCount}
                    </UnreadCountBadge>
                  )}
                  {activeTab === 'reports' && reportUnreadCount > 0 && (
                    <UnreadCountBadge>
                      {reportUnreadCount}
                    </UnreadCountBadge>
                  )}
                </NotificationTitle>
              </NotificationHeaderLeft>
              <NotificationHeaderRight>
                <HeaderActionButton
                  onClick={refreshNotifications}
                  title="Refresh notifications"
                  aria-label="Refresh notifications"
                >
                  <RefreshIcon />
                </HeaderActionButton>
                {(activeTab === 'activity' ? activityUnreadCount : reportUnreadCount) > 0 && (
                  <HeaderActionButton
                    onClick={handleMarkAllRead}
                    title="Mark all as read"
                    aria-label="Mark all as read"
                  >
                    <DoneAllIcon />
                  </HeaderActionButton>
                )}
              </NotificationHeaderRight>
            </NotificationHeader>

            <TabContainer>
              <TabButton
                $isActive={activeTab === 'activity'}
                onClick={() => setActiveTab('activity')}
              >
                Activity
                {activityUnreadCount > 0 && (
                  <TabBadge>{activityUnreadCount}</TabBadge>
                )}
              </TabButton>
              <TabButton
                $isActive={activeTab === 'reports'}
                onClick={() => setActiveTab('reports')}
              >
                Reports
                {reportUnreadCount > 0 && (
                  <TabBadge>{reportUnreadCount}</TabBadge>
                )}
              </TabButton>
            </TabContainer>

            <NotificationList>
              {isLoading && filteredNotifications.length === 0 ? (
                <LoadingState>Loading notifications...</LoadingState>
              ) : filteredNotifications.length === 0 ? (
                <EmptyState>
                  <EmptyIcon>
                    <BellIcon />
                  </EmptyIcon>
                  <EmptyTitle>No {activeTab === 'activity' ? 'activities' : 'reports'}</EmptyTitle>
                  <EmptyMessage>
                    {activeTab === 'activity' 
                      ? "You're all caught up with activities and announcements!" 
                      : "No reports available."}
                  </EmptyMessage>
                </EmptyState>
              ) : (
                <>
                  {filteredNotifications.map((notification: Notification) => (
                    <NotificationItem
                      key={`${notification.id}_${notification.notification_type}`}
                      $isRead={notification.is_read}
                      $isImportant={notification.is_important}
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <NotificationIcon
                          $type={notification.notification_type}
                          $isImportant={notification.is_important}
                        >
                          {getNotificationIcon(notification.notification_type, notification.is_important, notification.message, notification.activity_action)}
                        </NotificationIcon>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* First line: Teacher name + Time */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '4px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, gap: '8px' }}>
                              <NotificationTitleText $isRead={notification.is_read}>
                                {notification.title}
                              </NotificationTitleText>
                              {!notification.is_read && <UnreadDot />}
                            </div>
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
                  ))}

                  {/* Sentinel for infinite scroll - only show when there's more to load and not currently loading */}
                  {/* Only show pagination for activity tab (reports are loaded separately) */}
                  {activeTab === 'activity' && hasMoreForActiveTab && !isLoading && (
                    <div ref={observerTarget} style={{ height: '20px', width: '100%' }} />
                  )}

                  {/* Loading indicator for pagination */}
                  {activeTab === 'activity' && isLoading && hasMoreForActiveTab && (
                    <div style={{
                      textAlign: 'center',
                      padding: '12px',
                      color: '#888',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #888',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Loading more...
                    </div>
                  )}
                  
                  {/* End of list indicator - only show when not loading and hasMore is false */}
                  {activeTab === 'activity' && !hasMoreForActiveTab && !isLoading && filteredNotifications.length > 0 && (
                    <div style={{
                      textAlign: 'center',
                      padding: '12px',
                      color: '#888',
                      fontSize: '0.85rem'
                    }}>
                      No more notifications
                    </div>
                  )}
                  
                </>
              )}
            </NotificationList>
          </NotificationDropdown>
        )}
      </AnimatePresence>
    </NotificationBellContainer>
    
    {reportModalOpen && selectedReportId && (
      <ReportDetailsModal
        open={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false);
          setSelectedReportId(null);
        }}
        reportId={selectedReportId}
      />
    )}
    </>
  );
};

export default NotificationBell;
