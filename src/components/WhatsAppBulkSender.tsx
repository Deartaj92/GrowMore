import React, { useState, useContext } from 'react';
import { useWhatsAppBulkSender } from '../hooks/useWhatsAppBulkSender';
import { AttendanceNotificationData } from '../services/whatsappSemiAuto';
import { ThemeContext } from '../contexts/ThemeContext';

interface WhatsAppBulkSenderProps {
  notificationData: AttendanceNotificationData[];
  schoolName: string;
  onClose: () => void;
}

const WhatsAppBulkSender: React.FC<WhatsAppBulkSenderProps> = ({
  notificationData,
  schoolName,
  onClose
}) => {
  const { theme } = useContext(ThemeContext);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [sentStudents, setSentStudents] = useState<Set<number>>(new Set());
  const [skippedStudents, setSkippedStudents] = useState<Set<number>>(new Set());
  const [customMessages, setCustomMessages] = useState<Map<number, string>>(new Map());
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'urdu' | 'english'>('urdu');

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

  const formatMessage = (data: AttendanceNotificationData): string => {
    // Check if there's a custom message for this student
    const customMessage = customMessages.get(data.student_id);
    if (customMessage) {
      return customMessage;
    }

    // Use default message format based on selected language
    const status = data.status.toLowerCase();
    
    if (selectedLanguage === 'urdu') {
      // Urdu status translations
      const urduStatusMap: { [key: string]: string } = {
        'absent': 'غیر حاضر',
        'late': 'دیر سے پہنچا',
        'leave': 'چھٹی'
      };
      
      const urduStatus = urduStatusMap[status] || data.status;

      return `روزنامہ حاضری کی رپورٹ
محترم والد/والدہ!
آپ کا بچہ ${data.student_name} کلاس ${data.class_name} آج بتاریخ ${data.date} سکول سے ${urduStatus} ہے۔
${data.remarks ? `تبصرہ: ${data.remarks}` : ''}
برائے مہربانی اپنے بچے کو باقاعدگی سے سکول بھیجیں۔ شکریہ

${data.school_short_name || schoolName}`;
    } else {
      // English message format
      const emoji = statusEmoji[status] || '📝';
      const statusText = data.status.charAt(0).toUpperCase() + data.status.slice(1);

      return `📚 Daily Attendance Report
Dear Parent/Guardian!
Your child ${data.student_name} from class ${data.class_name} was ${statusText.toLowerCase()} on ${data.date}.
${data.remarks ? `Remarks: ${data.remarks}` : ''}
Please ensure your child attends school regularly. Thank you.

${data.school_short_name || schoolName}`;
    }
  };

  const {
    openWhatsAppChatAlternative,
    downloadAsHTML
  } = useWhatsAppBulkSender({
    delayBetweenMessages: 1000,
    onProgress: () => {},
    onComplete: () => {}
  });

  const handleDownloadHTML = () => {
    const whatsappMessages = notificationData.map(data => ({
      phone: data.student_phone,
      message: customMessages.get(data.student_id) || formatMessage(data),
      studentName: data.student_name,
      status: 'pending' as const
    }));
    downloadAsHTML(whatsappMessages, `attendance_messages_${new Date().toISOString().split('T')[0]}.html`);
  };

  // Sequential sending functions
  const currentStudent = notificationData[currentStudentIndex];
  const isLastStudent = currentStudentIndex === notificationData.length - 1;
  const isFirstStudent = currentStudentIndex === 0;
  const totalProcessed = sentStudents.size + skippedStudents.size;
  const remainingStudents = notificationData.length - totalProcessed;

  const handleSendCurrentStudent = () => {
    if (!currentStudent) return;
    
    const messageToSend = getCurrentMessage();
    const success = openWhatsAppChatAlternative(currentStudent.student_phone, messageToSend);
    
    if (success) {
      setSentStudents(prev => new Set(Array.from(prev).concat(currentStudentIndex)));
      console.log(`✅ Sent message to ${currentStudent.student_name}`);
      
      // Auto-advance to next student after a short delay
      setTimeout(() => {
        handleNextStudent();
      }, 1000);
    } else {
      console.error(`❌ Failed to send message to ${currentStudent.student_name}`);
    }
  };

  const handleSkipCurrentStudent = () => {
    if (!currentStudent) return;
    
    setSkippedStudents(prev => new Set(Array.from(prev).concat(currentStudentIndex)));
    console.log(`⏭️ Skipped ${currentStudent.student_name}`);
    
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

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: currentColors.overlay,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: currentColors.bg,
        borderRadius: '12px',
        padding: '20px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '95vh',
        overflow: 'auto',
        boxShadow: currentColors.shadow,
        border: `1px solid ${currentColors.border}`,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: `1px solid ${currentColors.border}`
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 'bold',
              color: currentColors.text,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📱 WhatsApp Notifications
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              color: currentColors.textSecondary,
              fontSize: '12px'
            }}>
              {notificationData.length} students • Sequential sending
            </p>
          </div>
          
          {/* Language Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginRight: '12px'
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: '500',
              color: currentColors.textSecondary
            }}>
              Language:
            </span>
            <div style={{
              display: 'flex',
              backgroundColor: currentColors.bgSecondary,
              borderRadius: '6px',
              padding: '2px'
            }}>
              <button
                onClick={() => setSelectedLanguage('urdu')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: selectedLanguage === 'urdu' ? currentColors.accent : 'transparent',
                  color: selectedLanguage === 'urdu' ? '#ffffff' : currentColors.textSecondary
                }}
              >
                🇵🇰 Urdu
              </button>
              <button
                onClick={() => setSelectedLanguage('english')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: selectedLanguage === 'english' ? currentColors.accent : 'transparent',
                  color: selectedLanguage === 'english' ? '#ffffff' : currentColors.textSecondary
                }}
              >
                🇺🇸 English
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: currentColors.textSecondary,
              padding: '6px',
              borderRadius: '6px',
              transition: 'all 0.2s ease'
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

        {/* Main Content - Horizontal Layout */}
        <div style={{
          display: 'flex',
          gap: '16px',
          flex: 1,
          minHeight: 0
        }}>
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
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: currentColors.text
                  }}>
                    👤 {currentStudent.student_name}
                  </h3>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                  }}>
                    <span style={{
                      background: theme === 'dark' ? 'rgba(74, 108, 247, 0.2)' : 'rgba(74, 108, 247, 0.1)',
                      color: '#4a6cf7',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: '500'
                    }}>
                      📚 {currentStudent.class_name}
                    </span>
                    <span style={{
                      background: theme === 'dark' ? 'rgba(220, 53, 69, 0.2)' : 'rgba(220, 53, 69, 0.1)',
                      color: currentColors.danger,
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: '500'
                    }}>
                      {statusEmoji[currentStudent.status.toLowerCase()] || '📝'} {currentStudent.status.charAt(0).toUpperCase() + currentStudent.status.slice(1)}
                    </span>
                  </div>
                  
                  <div style={{
                    fontSize: '11px',
                    color: currentColors.textSecondary
                  }}>
                    📱 {currentStudent.student_phone}
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
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: isFirstStudent ? 'not-allowed' : 'pointer',
                      opacity: isFirstStudent ? 0.5 : 1,
                      fontSize: '11px',
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
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: isLastStudent ? 'not-allowed' : 'pointer',
                      opacity: isLastStudent ? 0.5 : 1,
                      fontSize: '11px',
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
                      background: `linear-gradient(135deg, ${currentColors.accent}, ${currentColors.accentHover})`,
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
                      boxShadow: `0 2px 8px rgba(37, 211, 102, 0.3)`,
                      flex: 1
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = `0 4px 12px rgba(37, 211, 102, 0.4)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = `0 2px 8px rgba(37, 211, 102, 0.3)`;
                    }}
                  >
                    📱 Send
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
        </div>

        {/* Footer Actions */}
        <div style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '12px',
          borderTop: `1px solid ${currentColors.border}`,
          marginTop: '12px'
        }}>
          <button
            onClick={handleResetProgress}
            style={{
              background: currentColors.danger,
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
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

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleDownloadHTML}
              style={{
                background: currentColors.textSecondary,
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
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
              📄 Download HTML
            </button>
            
            <button
              onClick={onClose}
              style={{
                background: currentColors.success,
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
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
              ✅ Finish & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppBulkSender;