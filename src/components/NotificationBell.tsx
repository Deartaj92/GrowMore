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
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNotifications } from '../contexts/NotificationContext';
import { Notification } from '../services/activityTrackingService';
import { motion, AnimatePresence } from 'framer-motion';
import { ReportDetailsModal } from './reports/ReportDetailsModal';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';

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
  padding: 16px 20px;
  border-bottom: 1px solid ${props => props.theme.BORDER};
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${props => props.theme.ACCENT}10;
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
  const { showToast } = useToast();
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
      }
      
      // If it's a report notification, try to open it first
      if (notification.notification_type === 'report') {
        try {
          if (!user?.school_id) {
            showToast('Unable to access reports', 'error');
            return;
          }
          
          // Early return for delete actions - show who deleted it
          if (notification.activity_action === 'delete') {
            let deletedBy = notification.title || 'Unknown';
            
            if (notification.activity_log_id) {
              const { data: activityLog } = await supabase
                .from('activity_logs')
                .select('teacher_id')
                .eq('id', notification.activity_log_id)
                .maybeSingle();
              
              if (activityLog?.teacher_id) {
                const { data: staffData } = await supabase
                  .from('staff')
                  .select('name')
                  .eq('id', activityLog.teacher_id)
                  .maybeSingle();
                deletedBy = staffData?.name || deletedBy;
              }
            }
            
            showToast(`Report is deleted by ${deletedBy}`, 'error');
            setIsOpen(false);
            return;
          }
          
          // STEP 1: Get activity log data (contains entity_id and activity_action)
          let reportId: string | null = null;
          let activityLogData: any = null;
          
          if (notification.activity_log_id) {
            const { data: activityLog, error: activityLogError } = await supabase
              .from('activity_logs')
              .select('entity_id, activity_action, teacher_id')
              .eq('id', notification.activity_log_id)
              .maybeSingle();
            
            if (!activityLogError && activityLog) {
              activityLogData = activityLog;
              
              // Get report ID from entity_id (if it's not a delete action)
              if (activityLog.entity_id && activityLog.activity_action !== 'delete') {
                reportId = activityLog.entity_id.toString();
              }
            }
          }
          
          // STEP 2: If we have a report ID, try to fetch and open the report
          if (reportId) {
            const { data: reportCheck, error: reportCheckError } = await supabase
              .from('reports')
              .select('id')
              .eq('id', reportId)
              .eq('school_id', user.school_id)
              .maybeSingle();
            
            if (!reportCheckError && reportCheck) {
              // Report exists - open it
              setSelectedReportId(reportId);
              setReportModalOpen(true);
              setIsOpen(false);
              return;
            }
            
            // Report doesn't exist - check if it was deleted
            if (activityLogData?.activity_action === 'delete') {
              let deletedBy = notification.title || 'Unknown';
              if (activityLogData.teacher_id) {
                const { data: staffData } = await supabase
                  .from('staff')
                  .select('name')
                  .eq('id', activityLogData.teacher_id)
                  .maybeSingle();
                deletedBy = staffData?.name || deletedBy;
              }
              showToast(`Report is deleted by ${deletedBy}`, 'error');
              setIsOpen(false);
              return;
            }
            
            // Report doesn't exist but no delete action found
            showToast('Report not found', 'error');
            setIsOpen(false);
            return;
          }
          
          // STEP 3: If we don't have report ID yet, check if it's a delete action
          if (activityLogData?.activity_action === 'delete') {
            // This is a deleted report - show who deleted it
            let deletedBy = notification.title || 'Unknown';
            if (activityLogData.teacher_id) {
              const { data: staffData } = await supabase
                .from('staff')
                .select('name')
                .eq('id', activityLogData.teacher_id)
                .maybeSingle();
              deletedBy = staffData?.name || deletedBy;
            }
            showToast(`Report is deleted by ${deletedBy}`, 'error');
            setIsOpen(false);
            return;
          }
          
          // STEP 4: If we still don't have report ID, try to get it from entity_id (even if it was null before)
          if (activityLogData?.entity_id) {
            reportId = activityLogData.entity_id.toString();
            
            // Try to fetch the report
            const { data: reportCheck, error: reportCheckError } = await supabase
              .from('reports')
              .select('id')
              .eq('id', reportId)
              .eq('school_id', user.school_id)
              .maybeSingle();
            
            if (!reportCheckError && reportCheck) {
              // Report exists - open it
              setSelectedReportId(reportId);
              setReportModalOpen(true);
              setIsOpen(false);
              return;
            }
            
            // Report doesn't exist - it was deleted
            let deletedBy = notification.title || 'Unknown';
            if (activityLogData.teacher_id) {
              const { data: staffData } = await supabase
                .from('staff')
                .select('name')
                .eq('id', activityLogData.teacher_id)
                .maybeSingle();
              deletedBy = staffData?.name || deletedBy;
            }
            showToast(`Report is deleted by ${deletedBy}`, 'error');
            setIsOpen(false);
            return;
          }
          
          // STEP 5: If we still don't have report ID, check if it's a delete action
          // Use activity_action to accurately identify delete actions
          const isDeletedReport = notification.activity_action === 'delete';
          
          if (isDeletedReport) {
            // This looks like a deleted report - try to get who deleted it
            let deletedBy = notification.title || 'Unknown';
            
            if (notification.activity_log_id) {
              const { data: activityLog } = await supabase
                .from('activity_logs')
                .select('activity_action, teacher_id')
                .eq('id', notification.activity_log_id)
                .maybeSingle();
              
              if (activityLog?.teacher_id) {
                const { data: staffData } = await supabase
                  .from('staff')
                  .select('name')
                  .eq('id', activityLog.teacher_id)
                  .maybeSingle();
                deletedBy = staffData?.name || deletedBy;
              }
            }
            
            showToast(`Report is deleted by ${deletedBy}`, 'error');
            setIsOpen(false);
            return;
          }
          
          // STEP 6: Try to find report by parsing notification message
          // Message format: "New Student Report - [CATEGORY] [SEVERITY] - [SUBJECT]"
          // or "New Staff Report - [CATEGORY] [SEVERITY] - [SUBJECT]"
          try {
            const message = notification.message || '';
            const parts = message.split(' - ');
            
            if (parts.length >= 3) {
              const reportTypePart = parts[0]; // "New Student Report", etc.
              const categoryPart = parts[1]; // "Homework Incomplete [LOW]"
              const subjectName = parts[2]; // "Zohaib" or "Mehran"
              
              const isStudentReport = reportTypePart.toLowerCase().includes('student');
              // Remove severity like "[LOW]", "[HIGH]", etc. from category name
              const categoryName = categoryPart.replace(/\s*\[.*?\]\s*/g, '').trim();
              
              // Get teacher ID from title (teacher name)
              const { data: teacherData, error: teacherError } = await supabase
                .from('staff')
                .select('id')
                .eq('name', notification.title)
                .eq('school_id', user.school_id)
                .maybeSingle();
              
              if (teacherData?.id) {
                // Query reports to find matching one
                // First try with reported_by filter
                let query = supabase
                  .from('reports')
                  .select(`
                    id,
                    student_id,
                    staff_id,
                    subject_type,
                    category_id,
                    category:report_categories(name),
                    student:students(name)
                  `)
                  .eq('school_id', user.school_id)
                  .eq('reported_by', teacherData.id)
                  .order('created_at', { ascending: false })
                  .limit(50);
                
                let { data: reports, error: reportsError } = await query;
                
                // If error or no results, try simpler query
                if (reportsError || !reports || reports.length === 0) {
                  const simpleQuery = supabase
                    .from('reports')
                    .select('id, student_id, staff_id, subject_type, category_id')
                    .eq('school_id', user.school_id)
                    .eq('reported_by', teacherData.id)
                    .order('created_at', { ascending: false })
                    .limit(50);
                  
                  const simpleResult = await simpleQuery;
                  
                  if (!simpleResult.error && simpleResult.data) {
                    // Fetch related data separately
                    reports = await Promise.all(simpleResult.data.map(async (r: any) => {
                      const [categoryResult, studentResult, staffResult] = await Promise.all([
                        r.category_id ? supabase.from('report_categories').select('name').eq('id', r.category_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
                        r.student_id ? supabase.from('students').select('name').eq('id', r.student_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
                        r.staff_id ? supabase.from('staff').select('name').eq('id', r.staff_id).maybeSingle() : Promise.resolve({ data: null, error: null })
                      ]);
                      return {
                        ...r,
                        category: categoryResult.data ? { name: categoryResult.data.name } : null,
                        student: studentResult.data ? { name: studentResult.data.name } : null,
                        staff: staffResult.data ? { name: staffResult.data.name } : null
                      };
                    }));
                    reportsError = null;
                  }
                }
                
                // If still no results, try broader search (all reports in school, not just by reported_by)
                if ((reportsError || !reports || reports.length === 0) && isStudentReport) {
                  // First, find the student ID
                  const { data: studentData } = await supabase
                    .from('students')
                    .select('id')
                    .eq('name', subjectName)
                    .eq('school_id', user.school_id)
                    .maybeSingle();
                  
                  if (studentData?.id) {
                    // Query reports for this student
                    const broaderQuery = supabase
                      .from('reports')
                      .select('id, student_id, staff_id, subject_type, category_id')
                      .eq('school_id', user.school_id)
                      .eq('student_id', studentData.id)
                      .eq('subject_type', 'student')
                      .order('created_at', { ascending: false })
                      .limit(50);
                    
                    const broaderResult = await broaderQuery;
                    
                    if (!broaderResult.error && broaderResult.data) {
                      // Fetch related data separately
                      reports = await Promise.all(broaderResult.data.map(async (r: any) => {
                        const [categoryResult, studentResult] = await Promise.all([
                          r.category_id ? supabase.from('report_categories').select('name').eq('id', r.category_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
                          r.student_id ? supabase.from('students').select('name').eq('id', r.student_id).maybeSingle() : Promise.resolve({ data: null, error: null })
                        ]);
                        return {
                          ...r,
                          category: categoryResult.data ? { name: categoryResult.data.name } : null,
                          student: studentResult.data ? { name: studentResult.data.name } : null
                        };
                      }));
                      reportsError = null;
                    }
                  }
                }
                
                if (!reportsError && reports && reports.length > 0) {
                  // Find matching report (case-insensitive)
                  const normalizedCategoryName = categoryName.trim().toLowerCase();
                  const normalizedSubjectName = subjectName.trim().toLowerCase();
                  
                  const matchingReport = reports.find((r: any) => {
                    const reportCategory = r.category?.name?.trim().toLowerCase() || '';
                    const matchesCategory = reportCategory === normalizedCategoryName;
                    
                    if (isStudentReport) {
                      const reportStudent = r.student?.name?.trim().toLowerCase() || '';
                      const matchesStudent = reportStudent === normalizedSubjectName;
                      return matchesCategory && matchesStudent && r.subject_type === 'student';
                    } else {
                      const reportStaff = r.staff?.name?.trim().toLowerCase() || '';
                      const matchesStaff = reportStaff === normalizedSubjectName;
                      return matchesCategory && matchesStaff && r.subject_type === 'staff';
                    }
                  });
                  
                  if (matchingReport) {
                    reportId = matchingReport.id.toString();
                    
                    // Verify the report exists
                    const { data: reportCheck } = await supabase
                      .from('reports')
                      .select('id')
                      .eq('id', reportId)
                      .eq('school_id', user.school_id)
                      .maybeSingle();
                    
                    if (reportCheck) {
                      // Report exists - open it
                      setSelectedReportId(reportId);
                      setReportModalOpen(true);
                      setIsOpen(false);
                      return;
                    }
                  }
                }
              }
            }
          } catch (parseError) {
            // Error parsing message
          }
          
          // If we can't find the report at all
          showToast('Report not found', 'error');
          setIsOpen(false);
          return;
        } catch (error) {
          showToast('Failed to load report', 'error');
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
              <NotificationTitle>
                Notifications
                {activeTab === 'activity' && activityUnreadCount > 0 && (
                  <span style={{ 
                    marginLeft: '8px', 
                    fontSize: '0.85rem', 
                    fontWeight: 'normal',
                    color: '#ef4444'
                  }}>
                    ({activityUnreadCount} new)
                  </span>
                )}
                {activeTab === 'reports' && reportUnreadCount > 0 && (
                  <span style={{ 
                    marginLeft: '8px', 
                    fontSize: '0.85rem', 
                    fontWeight: 'normal',
                    color: '#ef4444'
                  }}>
                    ({reportUnreadCount} new)
                  </span>
                )}
              </NotificationTitle>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                {(activeTab === 'activity' ? activityUnreadCount : reportUnreadCount) > 0 && (
                  <MarkAllReadButton onClick={handleMarkAllRead}>
                    Mark all read
                  </MarkAllReadButton>
                )}
              </div>
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
