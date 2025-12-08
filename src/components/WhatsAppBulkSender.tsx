import React, { useState, useContext, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useWhatsAppBulkSender } from '../hooks/useWhatsAppBulkSender';
import { AttendanceNotificationData } from '../services/whatsappSemiAuto';
import { ThemeContext } from '../contexts/ThemeContext';
import { WhatsApp as WhatsAppIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

interface WhatsAppBulkSenderProps {
  notificationData: AttendanceNotificationData[];
  schoolName: string;
  onClose: () => void;
  selectedDate: string;
  mode?: 'attendance' | 'general';
  defaultMessage?: string;
}

const WhatsAppBulkSender: React.FC<WhatsAppBulkSenderProps> = ({
  notificationData,
  schoolName,
  onClose,
  selectedDate,
  mode = 'attendance',
  defaultMessage
}) => {
  const { theme } = useContext(ThemeContext);
  const { user } = useAuth();
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [sentStudents, setSentStudents] = useState<Set<number>>(new Set());
  const [sentStudentIds, setSentStudentIds] = useState<Set<number>>(new Set());
  const [skippedStudents, setSkippedStudents] = useState<Set<number>>(new Set());
  const [customMessages, setCustomMessages] = useState<Map<number, string>>(new Map());
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'urdu' | 'english'>('urdu');

  const applySentIds = useCallback((idSet: Set<number>) => {
    setSentStudentIds(idSet);
    setSentStudents(() => {
      const idxSet = new Set<number>();
      notificationData.forEach((notification, idx) => {
        if (idSet.has(notification.student_id)) {
          idxSet.add(idx);
        }
      });
      return idxSet;
    });
  }, [notificationData]);

  const persistSentIds = useCallback((ids: Set<number>) => {
    try {
      const key = `attendance_sent_${selectedDate}`;
      localStorage.setItem(key, JSON.stringify(Array.from(ids)));
    } catch {
      // ignore storage errors
    }
  }, [selectedDate]);

  const loadSentStatusFromLocal = useCallback(() => {
    try {
      const key = `attendance_sent_${selectedDate}`;
      const raw = localStorage.getItem(key);
      const ids: number[] = raw ? JSON.parse(raw) : [];
      const idSet = new Set<number>(ids);
      applySentIds(idSet);
    } catch (error) {
    }
  }, [applySentIds, selectedDate]);

  const clearRemoteSentStatus = useCallback(async () => {
    if (!user?.school_id) return;
    try {
      await supabase
        .from('notification_logs')
        .delete()
        .eq('school_id', user.school_id)
        .eq('notification_date', selectedDate);
    } catch (error) {
    }
  }, [selectedDate, user?.school_id]);

  // Theme-aware colors
  const colors = {
    light: {
      bg: '#ffffff',
      bgSecondary: '#f8f9fa',
      card: '#f8f9fa',
      text: '#1a1a1a',
      textSecondary: '#666666',
      border: '#e0e0e0',
      accent: '#25d366',
      accentHover: '#1ea952',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      shadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      overlay: 'rgba(0, 0, 0, 0.5)'
    },
    dark: {
      bg: '#2a2a2a',
      bgSecondary: '#3a3a3a',
      card: '#3a3a3a',
      text: '#e0e0e0',
      textSecondary: '#b0b0b0',
      border: '#4a4a4a',
      accent: '#25d366',
      accentHover: '#1ea952',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      shadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      overlay: 'rgba(0, 0, 0, 0.7)'
    }
  };

  const currentColors = colors[theme];


  // Status emoji mapping
  const statusEmoji: { [key: string]: string } = {
    'absent': '❌',
    'late': '⏰',
    'leave': '🏠'
  };

  const formatMessage = useCallback((data: AttendanceNotificationData): string => {
    // Check if there's a custom message for this student
    const customMessage = customMessages.get(data.student_id);
    if (customMessage) {
      return customMessage;
    }

    // Use default message format based on selected language
    if (mode === 'general' && defaultMessage) {
      return defaultMessage
        .replace('{student_name}', data.student_name)
        .replace('{staff_name}', data.student_name) // Staff name uses same field
        .replace('{father_name}', data.father_name || '')
        .replace('{roll_number}', data.roll_number || '')
        .replace('{password}', data.password || '')
        .replace('{class_name}', data.class_name)
        .replace('{role}', data.role || '')
        .replace('{mobile}', data.mobile || data.student_phone || '')
        .replace('{school_name}', schoolName)
        .replace('{school_website}', data.school_website || '');
    }

    const status = data.status.toLowerCase();
    const effectiveStatus = status === 'leave' ? 'absent' : status; // Treat leave same as absent

    if (selectedLanguage === 'urdu') {
      // Urdu status translations
      const urduStatusMap: { [key: string]: string } = {
        'absent': 'غیر حاضر',
        'late': 'دیر سے پہنچا',
        'leave': 'غیر حاضر'
      };

      const urduStatus = urduStatusMap[effectiveStatus] || data.status;

      // Special phrasing for 'late' to avoid 'سے' after 'سکول'
      if (effectiveStatus === 'late') {
        return `روزنامہ حاضری کی رپورٹ
محترم والد/والدہ!
آپ کا بچہ ${data.student_name} کلاس ${data.class_name} آج بتاریخ ${data.date || selectedDate} سکول دیر سے پہنچا ہے۔
${data.remarks ? `تبصرہ: ${data.remarks}` : ''}
برائے مہربانی اپنے بچے کو وقت پر سکول بھیجیں۔ شکریہ

${data.school_short_name || schoolName}`;
      }

      return `روزنامہ حاضری کی رپورٹ
محترم والد/والدہ!
آپ کا بچہ ${data.student_name} کلاس ${data.class_name} آج بتاریخ ${data.date || selectedDate} سکول سے ${urduStatus} ہے۔
${data.remarks ? `تبصرہ: ${data.remarks}` : ''}
برائے مہربانی اپنے بچے کو باقاعدگی سے سکول بھیجیں۔ شکریہ

${data.school_short_name || schoolName}`;
    } else {
      // English message format
      const emoji = statusEmoji[status] || '📝';
      const statusText = (effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1));
      const headerPrefix = data.notification_channel === 'sms' ? '' : '📚 ';

      return `${headerPrefix}Daily Attendance Report
Dear Parent/Guardian!
Your child ${data.student_name} from class ${data.class_name} was ${statusText.toLowerCase()} on ${data.date || selectedDate}.
${data.remarks ? `Remarks: ${data.remarks}` : ''}
Please ensure your child attends school regularly. Thank you.

${data.school_short_name || schoolName}`;
    }
  }, [customMessages, schoolName, selectedDate, selectedLanguage]);

  const {
    openWhatsAppChatAlternative,
    openSMSChat
  } = useWhatsAppBulkSender({
    delayBetweenMessages: 1000,
    onProgress: () => { },
    onComplete: () => { }
  });



  // Sequential sending functions
  const currentStudent = notificationData[currentStudentIndex];
  const isLastStudent = currentStudentIndex === notificationData.length - 1;
  const isFirstStudent = currentStudentIndex === 0;
  const totalProcessed = sentStudents.size + skippedStudents.size;
  const remainingStudents = notificationData.length - totalProcessed;
  const isAlreadySent = currentStudent ? sentStudentIds.has(currentStudent.student_id) : false;

  const recordSentStatus = useCallback(async (student: AttendanceNotificationData, index: number) => {
    const channel = student.notification_channel || 'whatsapp';

    setSentStudents(prev => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });

    setSentStudentIds(prev => {
      const next = new Set(prev);
      next.add(student.student_id);
      persistSentIds(next);
      return next;
    });

    if (user?.school_id) {
      try {
        const messageText = customMessages.get(student.student_id) || formatMessage(student);
        const msgType = mode === 'general' ? 'General' : 'Attendance';
        
        const { error } = await supabase
          .from('notification_logs')
          .upsert({
            school_id: user.school_id,
            student_id: student.student_id,
            notification_date: selectedDate,
            channel,
            status: 'sent',
            sent_by: user.staff_id || null,
            msg_type: msgType,
            message: messageText
          }, {
            onConflict: 'school_id,student_id,notification_date,channel'
          });
        
        if (error) {
          console.error('Error recording notification log:', error);
        }
      } catch (error) {
        console.error('Exception recording notification log:', error);
      }
    }
  }, [customMessages, formatMessage, persistSentIds, selectedDate, user?.school_id, user?.staff_id]);

  const handleSendCurrentStudent = () => {
    if (!currentStudent) return;

    const messageToSend = getCurrentMessage();
    const channel = currentStudent.notification_channel || 'whatsapp';

    // Use appropriate function based on notification channel
    const success = channel === 'sms'
      ? openSMSChat(currentStudent.student_phone, messageToSend)
      : openWhatsAppChatAlternative(currentStudent.student_phone, messageToSend);

    if (success) {
      recordSentStatus(currentStudent, currentStudentIndex);

      // Auto-advance to next student after a short delay
      setTimeout(() => {
        handleNextStudent();
      }, 1000);
    } else {
    }
  };

  const handleSkipCurrentStudent = () => {
    if (!currentStudent) return;

    setSkippedStudents(prev => new Set(Array.from(prev).concat(currentStudentIndex)));

    // Auto-advance to next student
    handleNextStudent();
  };

  const handleNextStudent = () => {
    if (currentStudentIndex < notificationData.length - 1) {
      setCurrentStudentIndex(prev => prev + 1);
    }
  };

  const handlePreviousStudent = () => {
    if (currentStudentIndex > 0) {
      setCurrentStudentIndex(prev => prev - 1);
    }
  };

  const handleResetProgress = () => {
    setCurrentStudentIndex(0);
    setSentStudents(new Set());
    setSkippedStudents(new Set());
    setCustomMessages(new Map());
    setSentStudentIds(new Set());
    persistSentIds(new Set());
    clearRemoteSentStatus();
    try {
      localStorage.removeItem(`attendance_sent_${selectedDate}`);
    } catch { }
  };

  // Message editing functions
  const handleEditMessage = () => {
    setIsEditingMessage(true);
  };

  const handleSaveMessage = () => {
    if (currentStudent) {
      const messageTextArea = document.getElementById('message-editor') as HTMLTextAreaElement;
      if (messageTextArea) {
        const newMessage = messageTextArea.value.trim();
        if (newMessage) {
          setCustomMessages(prev => new Map(prev.set(currentStudent.student_id, newMessage)));
          setIsEditingMessage(false);
        }
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditingMessage(false);
  };

  const handleResetMessage = () => {
    if (currentStudent) {
      setCustomMessages(prev => {
        const newMap = new Map(prev);
        newMap.delete(currentStudent.student_id);
        return newMap;
      });
    }
  };

  const getCurrentMessage = (): string => {
    if (currentStudent) {
      return customMessages.get(currentStudent.student_id) || formatMessage(currentStudent);
    }
    return '';
  };

  useEffect(() => {
    let cancelled = false;

    const loadRemoteSentStatus = async () => {
      if (!user?.school_id) {
        if (!cancelled) {
          loadSentStatusFromLocal();
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('notification_logs')
          .select('student_id')
          .eq('school_id', user.school_id)
          .eq('notification_date', selectedDate);

        if (error) throw error;

        if (!cancelled) {
          const idSet = new Set<number>((data || []).map(row => row.student_id));
          applySentIds(idSet);
          persistSentIds(idSet);
        }
      } catch (error) {
        if (!cancelled) {
          loadSentStatusFromLocal();
        }
      }
    };

    loadRemoteSentStatus();

    return () => {
      cancelled = true;
    };
  }, [user?.school_id, selectedDate, notificationData, applySentIds, persistSentIds, loadSentStatusFromLocal]);

  // Prevent body scroll when modal is open and ensure modal is viewport-centered
  useEffect(() => {
    // Store current scroll position
    const scrollY = window.scrollY;
    // Prevent body scroll and lock position
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.setAttribute('data-scroll-position', scrollY.toString());

    return () => {
      // Restore scroll position
      const savedScrollY = document.body.getAttribute('data-scroll-position');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.removeAttribute('data-scroll-position');
      if (savedScrollY) {
        window.scrollTo(0, parseInt(savedScrollY, 10));
      }
    };
  }, []);

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: currentColors.overlay,
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: currentColors.bg,
        borderRadius: '16px',
        padding: window.innerWidth <= 700 ? '16px' : '24px',
        maxWidth: '900px',
        width: window.innerWidth <= 700 ? '90vw' : '95%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: currentColors.bg === '#252525'
          ? '0 0 40px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.4)'
          : '0 0 40px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.1)',
        border: currentColors.bg === '#252525'
          ? '1px solid rgba(255, 255, 255, 0.05)'
          : '1px solid rgba(0, 0, 0, 0.05)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        margin: window.innerWidth <= 700 ? '16px' : '32px 16px',
        zIndex: 1301
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: window.innerWidth <= 700 ? 'flex-start' : 'center',
          marginBottom: window.innerWidth <= 700 ? '12px' : '16px',
          paddingBottom: window.innerWidth <= 700 ? '8px' : '12px',
          borderBottom: `1px solid ${currentColors.border}`,
          flexWrap: window.innerWidth <= 700 ? 'wrap' : 'nowrap',
          gap: window.innerWidth <= 700 ? '8px' : '0',
          position: 'relative'
        }}>
          <div style={{ flex: window.innerWidth <= 700 ? '1 1 100%' : 'initial' }}>
            <h2 style={{
              margin: 0,
              fontSize: window.innerWidth <= 700 ? '16px' : '20px',
              fontWeight: 'bold',
              color: currentColors.text,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📱 Notifications (WhatsApp & SMS)
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              color: currentColors.textSecondary,
              fontSize: window.innerWidth <= 700 ? '10px' : '12px'
            }}>
              {notificationData.length} students • {notificationData.filter(n => n.notification_channel === 'sms').length} SMS • {notificationData.filter(n => n.notification_channel === 'whatsapp' || !n.notification_channel).length} WhatsApp
            </p>
          </div>

          {/* Language Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginRight: window.innerWidth <= 700 ? '0' : '12px',
            flex: window.innerWidth <= 700 ? '1 1 auto' : 'initial'
          }}>
            {window.innerWidth > 700 && (
              <span style={{
                fontSize: '12px',
                fontWeight: '500',
                color: currentColors.textSecondary
              }}>
                Language:
              </span>
            )}
            <div style={{
              display: 'flex',
              backgroundColor: currentColors.bgSecondary,
              borderRadius: '6px',
              padding: '2px',
              flex: window.innerWidth <= 700 ? '1 1 auto' : 'initial'
            }}>
              <button
                onClick={() => setSelectedLanguage('urdu')}
                style={{
                  padding: window.innerWidth <= 700 ? '10px 12px' : '6px 12px',
                  borderRadius: '4px',
                  fontSize: window.innerWidth <= 700 ? '12px' : '12px',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: selectedLanguage === 'urdu' ? currentColors.accent : 'transparent',
                  color: selectedLanguage === 'urdu' ? '#ffffff' : currentColors.textSecondary,
                  flex: window.innerWidth <= 700 ? '1' : 'initial'
                }}
              >
                🇵🇰 {window.innerWidth <= 700 ? 'اردو' : 'Urdu'}
              </button>
              <button
                onClick={() => setSelectedLanguage('english')}
                style={{
                  padding: window.innerWidth <= 700 ? '10px 12px' : '6px 12px',
                  borderRadius: '4px',
                  fontSize: window.innerWidth <= 700 ? '12px' : '12px',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: selectedLanguage === 'english' ? currentColors.accent : 'transparent',
                  color: selectedLanguage === 'english' ? '#ffffff' : currentColors.textSecondary,
                  flex: window.innerWidth <= 700 ? '1' : 'initial'
                }}
              >
                🇺🇸 {window.innerWidth <= 700 ? 'Eng' : 'English'}
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: window.innerWidth <= 700 ? '18px' : '20px',
              cursor: 'pointer',
              color: currentColors.textSecondary,
              padding: window.innerWidth <= 700 ? '4px' : '6px',
              borderRadius: '6px',
              transition: 'all 0.2s ease',
              position: window.innerWidth <= 700 ? ('absolute' as const) : ('static' as const),
              right: window.innerWidth <= 700 ? 0 : undefined,
              top: window.innerWidth <= 700 ? 0 : undefined
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentColors.border;
              e.currentTarget.style.color = currentColors.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = currentColors.textSecondary;
            }}
          >
            ✕
          </button>
        </div>

        {/* Main Content - Responsive Layout */}
        <div style={{
          display: 'flex',
          gap: window.innerWidth <= 700 ? '10px' : '16px',
          flex: 1,
          minHeight: 0,
          flexDirection: window.innerWidth <= 700 ? 'column' : 'row'
        }}>
          {window.innerWidth <= 700 ? (
            /* MOBILE LAYOUT - Message First, Student Info Below */
            <>
              {/* Message Preview Section - Mobile */}
              {currentStudent && (
                <div style={{
                  background: currentColors.card,
                  border: `1px solid ${currentColors.border}`,
                  borderRadius: '6px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px'
                  }}>
                    <div style={{
                      fontWeight: 'bold',
                      color: currentColors.accent,
                      fontSize: '11px'
                    }}>
                      📝 Message
                    </div>

                    <div style={{ display: 'flex', gap: '3px' }}>
                      {!isEditingMessage ? (
                        <button
                          onClick={handleEditMessage}
                          style={{
                            background: currentColors.accent,
                            color: 'white',
                            border: 'none',
                            padding: '3px 6px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '9px',
                            fontWeight: '500'
                          }}
                        >
                          ✏️
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={handleSaveMessage}
                            style={{
                              background: currentColors.success,
                              color: 'white',
                              border: 'none',
                              padding: '3px 6px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '9px',
                              fontWeight: '500'
                            }}
                          >
                            ✅
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            style={{
                              background: currentColors.danger,
                              color: 'white',
                              border: 'none',
                              padding: '3px 6px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '9px',
                              fontWeight: '500'
                            }}
                          >
                            ❌
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditingMessage ? (
                    <textarea
                      id="message-editor"
                      defaultValue={getCurrentMessage()}
                      style={{
                        background: currentColors.bg,
                        border: `1px solid ${currentColors.border}`,
                        borderRadius: '4px',
                        padding: '6px',
                        fontSize: '12px',
                        lineHeight: '1.3',
                        color: currentColors.text,
                        resize: 'vertical',
                        fontFamily: 'monospace',
                        minHeight: '140px'
                      }}
                      placeholder="Enter message..."
                    />
                  ) : (
                    <div style={{
                      background: currentColors.bg,
                      border: `1px solid ${currentColors.border}`,
                      borderRadius: '4px',
                      padding: '6px',
                      fontSize: '12px',
                      whiteSpace: 'pre-line',
                      lineHeight: '1.3',
                      color: currentColors.text,
                      overflow: 'auto',
                      fontFamily: 'monospace',
                      maxHeight: '180px'
                    }}>
                      {getCurrentMessage()}
                    </div>
                  )}
                </div>
              )}

              {/* Student Info Section - Mobile */}
              {currentStudent && (
                <div style={{
                  background: currentColors.card,
                  border: `1px solid ${currentColors.border}`,
                  borderRadius: '6px',
                  padding: '8px'
                }}>
                  {/* Progress Bar - Compact */}
                  <div style={{
                    background: currentColors.border,
                    borderRadius: '3px',
                    height: '4px',
                    marginBottom: '8px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(totalProcessed / notificationData.length) * 100}%`,
                      height: '100%',
                      background: currentColors.accent,
                      transition: 'width 0.5s ease'
                    }} />
                  </div>

                  {/* Student Info - Compact */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: currentColors.text,
                        marginBottom: '2px'
                      }}>
                        {currentStudent.student_name}
                        {currentStudent.father_name && (
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 'normal',
                            color: currentColors.textSecondary,
                            marginLeft: '6px'
                          }}>
                            • {currentStudent.father_name}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: currentColors.textSecondary
                      }}>
                        {currentStudent.class_name} • {currentStudent.status}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: currentColors.textSecondary,
                      background: currentColors.bgSecondary,
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {currentStudentIndex + 1}/{notificationData.length}
                    </div>
                  </div>

                  {/* Action Buttons - Compact */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '4px'
                  }}>
                    <button
                      onClick={handlePreviousStudent}
                      disabled={isFirstStudent}
                      style={{
                        background: isFirstStudent ? currentColors.border : currentColors.textSecondary,
                        color: 'white',
                        border: 'none',
                        padding: '10px 6px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: '500',
                        opacity: isFirstStudent ? 0.5 : 1
                      }}
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={handleNextStudent}
                      disabled={isLastStudent}
                      style={{
                        background: isLastStudent ? currentColors.border : currentColors.textSecondary,
                        color: 'white',
                        border: 'none',
                        padding: '10px 6px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: '500',
                        opacity: isLastStudent ? 0.5 : 1
                      }}
                    >
                      Next →
                    </button>
                    <button
                      onClick={handleSendCurrentStudent}
                      style={{
                        background: currentStudent?.notification_channel === 'sms' ? '#4CAF50' : currentColors.accent,
                        color: 'white',
                        border: 'none',
                        padding: '10px 6px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      {isAlreadySent
                        ? (
                          window.innerWidth <= 700
                            ? (
                              currentStudent?.notification_channel === 'sms'
                                ? '↻ 💬 Resend'
                                : (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  ↻ <WhatsAppIcon style={{ fontSize: '1.1em' }} /> Resend
                                </span>)
                            )
                            : (
                              currentStudent?.notification_channel === 'sms'
                                ? '↻ 💬 Resend SMS'
                                : (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  ↻ <WhatsAppIcon style={{ fontSize: '1.1em' }} /> Resend WhatsApp
                                </span>)
                            )
                        )
                        : (
                          window.innerWidth <= 700
                            ? (
                              currentStudent?.notification_channel === 'sms'
                                ? '💬 Send'
                                : (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <WhatsAppIcon style={{ fontSize: '1.1em' }} /> Send
                                </span>)
                            )
                            : (
                              currentStudent?.notification_channel === 'sms'
                                ? '💬 Send SMS'
                                : (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  <WhatsAppIcon style={{ fontSize: '1.1em' }} /> Send WhatsApp
                                </span>)
                            )
                        )}
                    </button>
                    <button
                      onClick={handleSkipCurrentStudent}
                      style={{
                        background: currentColors.warning,
                        color: 'black',
                        border: 'none',
                        padding: '10px 6px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: 'bold'
                      }}
                    >
                      ⏭️ Skip
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* DESKTOP LAYOUT - Keep Original Side-by-Side */
            <>
              {/* Left Side - Progress & Student Info */}
              <div style={{
                flex: '0 0 300px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {/* Progress Summary */}
                <div style={{
                  background: theme === 'dark' ? 'rgba(37, 211, 102, 0.1)' : 'rgba(37, 211, 102, 0.05)',
                  border: `1px solid ${currentColors.accent}`,
                  borderRadius: '8px',
                  padding: '12px'
                }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: currentColors.text,
                    marginBottom: '8px'
                  }}>
                    📊 Progress: {totalProcessed}/{notificationData.length}
                  </div>

                  {/* Progress Bar */}
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: currentColors.border,
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      width: `${(totalProcessed / notificationData.length) * 100}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${currentColors.accent}, ${currentColors.accentHover})`,
                      transition: 'width 0.5s ease',
                      borderRadius: '4px'
                    }} />
                  </div>

                  <div style={{
                    fontSize: '11px',
                    color: currentColors.textSecondary,
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ color: currentColors.success }}>✅ {sentStudents.size}</span>
                    <span style={{ color: currentColors.warning }}>⏭️ {skippedStudents.size}</span>
                    <span style={{ color: currentColors.textSecondary }}>📝 {remainingStudents}</span>
                  </div>
                </div>

                {/* Current Student Info */}
                {currentStudent && (
                  <div style={{
                    background: currentColors.card,
                    border: `1px solid ${currentColors.accent}`,
                    borderRadius: '8px',
                    padding: '12px',
                    flex: 1
                  }}>
                    <div style={{
                      textAlign: 'center',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        background: currentColors.accent,
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '8px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        display: 'inline-block',
                        marginBottom: '8px'
                      }}>
                        {currentStudentIndex + 1} of {notificationData.length}
                      </div>

                      <h3 style={{
                        margin: '0 0 6px 0',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: currentColors.text
                      }}>
                        👤 {currentStudent.student_name}
                        {currentStudent.father_name && (
                          <span style={{
                            fontSize: '16px',
                            fontWeight: 'normal',
                            color: currentColors.textSecondary,
                            marginLeft: '8px'
                          }}>
                            • {currentStudent.father_name}
                          </span>
                        )}
                      </h3>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{
                          background: theme === 'dark' ? 'rgba(74, 108, 247, 0.2)' : 'rgba(74, 108, 247, 0.1)',
                          color: '#4a6cf7',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          📚 {currentStudent.class_name}
                        </span>
                        <span style={{
                          background: theme === 'dark' ? 'rgba(220, 53, 69, 0.2)' : 'rgba(220, 53, 69, 0.1)',
                          color: currentColors.danger,
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {statusEmoji[currentStudent.status.toLowerCase()] || '📝'} {currentStudent.status.charAt(0).toUpperCase() + currentStudent.status.slice(1)}
                        </span>
                        {isAlreadySent && (
                          <span style={{
                            background: theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
                            color: '#16a34a',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            ✅ Sent
                          </span>
                        )}
                      </div>

                      <div style={{
                        fontSize: '13px',
                        color: currentColors.textSecondary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}>
                        {currentStudent.notification_channel === 'sms' ? (
                          <>
                            <span style={{ color: '#4CAF50' }}>💬</span>
                            <span>{currentStudent.student_phone} (SMS)</span>
                          </>
                        ) : (
                          <>
                            <span style={{ color: '#25D366' }}>📱</span>
                            <span>{currentStudent.student_phone} (WhatsApp)</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Navigation */}
                    <div style={{
                      display: 'flex',
                      gap: '6px',
                      justifyContent: 'center',
                      marginBottom: '12px'
                    }}>
                      <button
                        onClick={handlePreviousStudent}
                        disabled={isFirstStudent}
                        style={{
                          background: isFirstStudent ? currentColors.border : currentColors.textSecondary,
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          cursor: isFirstStudent ? 'not-allowed' : 'pointer',
                          opacity: isFirstStudent ? 0.5 : 1,
                          fontSize: '14px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isFirstStudent) {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        ← Prev
                      </button>

                      <button
                        onClick={handleNextStudent}
                        disabled={isLastStudent}
                        style={{
                          background: isLastStudent ? currentColors.border : currentColors.textSecondary,
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          cursor: isLastStudent ? 'not-allowed' : 'pointer',
                          opacity: isLastStudent ? 0.5 : 1,
                          fontSize: '14px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isLastStudent) {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        Next →
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div style={{
                      display: 'flex',
                      gap: '6px',
                      justifyContent: 'center'
                    }}>
                      <button
                        onClick={handleSendCurrentStudent}
                        style={{
                          background: currentStudent?.notification_channel === 'sms'
                            ? `linear-gradient(135deg, #4CAF50, #45a049)`
                            : `linear-gradient(135deg, ${currentColors.accent}, ${currentColors.accentHover})`,
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s ease',
                          boxShadow: currentStudent?.notification_channel === 'sms'
                            ? `0 2px 8px rgba(76, 175, 80, 0.3)`
                            : `0 2px 8px rgba(37, 211, 102, 0.3)`,
                          flex: 1
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = currentStudent?.notification_channel === 'sms'
                            ? `0 4px 12px rgba(76, 175, 80, 0.4)`
                            : `0 4px 12px rgba(37, 211, 102, 0.4)`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = currentStudent?.notification_channel === 'sms'
                            ? `0 2px 8px rgba(76, 175, 80, 0.3)`
                            : `0 2px 8px rgba(37, 211, 102, 0.3)`;
                        }}
                      >
                        {currentStudent?.notification_channel === 'sms' ? '💬 Send SMS' : '📱 Send WhatsApp'}
                      </button>

                      <button
                        onClick={handleSkipCurrentStudent}
                        style={{
                          background: `linear-gradient(135deg, ${currentColors.warning}, #e0a800)`,
                          color: 'black',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s ease',
                          boxShadow: `0 2px 8px rgba(255, 193, 7, 0.3)`,
                          flex: 1
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = `0 4px 12px rgba(255, 193, 7, 0.4)`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = `0 2px 8px rgba(255, 193, 7, 0.3)`;
                        }}
                      >
                        ⏭️ Skip
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side - Message Preview */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column'
              }}>
                {currentStudent && (
                  <div style={{
                    background: currentColors.card,
                    border: `1px solid ${currentColors.border}`,
                    borderRadius: '8px',
                    padding: '12px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <div style={{
                        fontWeight: 'bold',
                        color: currentColors.accent,
                        fontSize: '14px'
                      }}>
                        📝 Message Preview:
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        {!isEditingMessage ? (
                          <>
                            <button
                              onClick={handleEditMessage}
                              style={{
                                background: currentColors.accent,
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '10px',
                                fontWeight: '500',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.8';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1';
                              }}
                            >
                              ✏️ Edit
                            </button>

                            {customMessages.has(currentStudent.student_id) && (
                              <button
                                onClick={handleResetMessage}
                                style={{
                                  background: currentColors.warning,
                                  color: 'black',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '10px',
                                  fontWeight: '500',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.opacity = '0.8';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.opacity = '1';
                                }}
                              >
                                🔄 Reset
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              onClick={handleSaveMessage}
                              style={{
                                background: currentColors.success,
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '10px',
                                fontWeight: '500',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.8';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1';
                              }}
                            >
                              ✅ Save
                            </button>

                            <button
                              onClick={handleCancelEdit}
                              style={{
                                background: currentColors.danger,
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '10px',
                                fontWeight: '500',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.8';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1';
                              }}
                            >
                              ❌ Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditingMessage ? (
                      <textarea
                        id="message-editor"
                        defaultValue={getCurrentMessage()}
                        style={{
                          background: currentColors.bg,
                          border: `1px solid ${currentColors.border}`,
                          borderRadius: '6px',
                          padding: '12px',
                          fontSize: '12px',
                          lineHeight: '1.4',
                          color: currentColors.text,
                          flex: 1,
                          resize: 'vertical',
                          fontFamily: 'monospace',
                          minHeight: '200px'
                        }}
                        placeholder="Enter your custom message here..."
                      />
                    ) : (
                      <div style={{
                        background: currentColors.bg,
                        border: `1px solid ${currentColors.border}`,
                        borderRadius: '6px',
                        padding: '12px',
                        fontSize: '12px',
                        whiteSpace: 'pre-line',
                        lineHeight: '1.4',
                        color: currentColors.text,
                        flex: 1,
                        overflow: 'auto',
                        fontFamily: 'monospace'
                      }}>
                        {getCurrentMessage()}
                      </div>
                    )}

                    {/* Custom message indicator */}
                    {customMessages.has(currentStudent.student_id) && !isEditingMessage && (
                      <div style={{
                        marginTop: '8px',
                        padding: '4px 8px',
                        background: theme === 'dark' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 193, 7, 0.1)',
                        border: `1px solid ${currentColors.warning}`,
                        borderRadius: '4px',
                        fontSize: '10px',
                        color: currentColors.warning,
                        textAlign: 'center'
                      }}>
                        ✏️ Custom message for this student
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          display: 'flex',
          gap: window.innerWidth <= 700 ? '8px' : '8px',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: window.innerWidth <= 700 ? '8px' : '12px',
          borderTop: `1px solid ${currentColors.border}`,
          marginTop: window.innerWidth <= 700 ? '8px' : '12px',
          flexWrap: window.innerWidth <= 700 ? 'nowrap' : 'nowrap'
        }}>
          <button
            onClick={handleResetProgress}
            style={{
              background: currentColors.danger,
              color: 'white',
              border: 'none',
              padding: window.innerWidth <= 700 ? '12px 16px' : '8px 16px',
              borderRadius: window.innerWidth <= 700 ? '5px' : '6px',
              cursor: 'pointer',
              fontSize: window.innerWidth <= 700 ? '12px' : '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              flex: window.innerWidth <= 700 ? '1 1 0' : 'initial',
              order: window.innerWidth <= 700 ? 3 : 1
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.opacity = '1';
            }}
          >
            🔄 Reset
          </button>

          <div style={{
            display: 'flex',
            gap: window.innerWidth <= 700 ? '8px' : '12px',
            flex: window.innerWidth <= 700 ? '1 1 0' : 'initial',
            order: window.innerWidth <= 700 ? 1 : 2
          }}>
            <button
              onClick={onClose}
              style={{
                background: currentColors.success,
                color: 'white',
                border: 'none',
                padding: window.innerWidth <= 700 ? '12px 16px' : '8px 16px',
                borderRadius: window.innerWidth <= 700 ? '5px' : '6px',
                cursor: 'pointer',
                fontSize: window.innerWidth <= 700 ? '12px' : '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                flex: window.innerWidth <= 700 ? 1 : 'initial'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.opacity = '1';
              }}
            >
              {window.innerWidth <= 700 ? '✅ Done' : '✅ Finish & Close'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WhatsAppBulkSender;