import { useState, useCallback } from 'react';

interface WhatsAppMessage {
  phone: string;
  message: string;
  studentName: string;
  status: 'pending' | 'sent' | 'failed';
}

interface UseWhatsAppBulkSenderOptions {
  delayBetweenMessages?: number; // milliseconds
  maxRetries?: number;
  onProgress?: (sent: number, total: number) => void;
  onComplete?: (results: WhatsAppMessage[]) => void;
}

export const useWhatsAppBulkSender = (options: UseWhatsAppBulkSenderOptions = {}) => {
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, total: 0 });
  const [results, setResults] = useState<WhatsAppMessage[]>([]);

  const {
    delayBetweenMessages = 3000,
    maxRetries = 3,
    onProgress,
    onComplete
  } = options;

  /**
   * Format phone number with proper country code (Pakistan +92)
   */
  const formatPhoneNumber = useCallback((phone: string): string => {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Handle different phone number formats for Pakistan
    if (cleanPhone.length === 10) {
      // 10 digits: assume Pakistan (+92)
      return `92${cleanPhone}`;
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      // 11 digits starting with 0: remove leading 0 and add Pakistan country code
      return `92${cleanPhone.substring(1)}`;
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith('92')) {
      // Already has Pakistan country code
      return cleanPhone;
    } else if (cleanPhone.length === 13 && cleanPhone.startsWith('092')) {
      // 13 digits starting with 092: remove leading 0
      return cleanPhone.substring(1);
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
      // 12 digits starting with 91: change to Pakistan country code
      return `92${cleanPhone.substring(2)}`;
    } else if (cleanPhone.length === 13 && cleanPhone.startsWith('091')) {
      // 13 digits starting with 091: change to Pakistan country code
      return `92${cleanPhone.substring(3)}`;
    } else {
      // For other formats, try to add +92 if it looks like a Pakistani number
      if (cleanPhone.length >= 10 && cleanPhone.length <= 12) {
        return `92${cleanPhone}`;
      }
      // Return as is for international numbers
      return cleanPhone;
    }
  }, []);

  /**
   * Open WhatsApp Web with a specific phone number and message
   */
  const openWhatsAppChat = useCallback((phone: string, message: string) => {
    // Format phone number with proper country code
    const formattedPhone = formatPhoneNumber(phone);
    
    // Create WhatsApp Web URL with proper formatting
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    
    // Try multiple approaches to ensure WhatsApp Web opens properly
    try {
      // Method 1: Open in new tab with specific window features
      const newWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer,width=1200,height=800');
      
      // Method 2: If that fails, try direct navigation
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Fallback: Create a temporary link and click it
        const link = document.createElement('a');
        link.href = whatsappUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to open WhatsApp Web:', error);
      return false;
    }
  }, [formatPhoneNumber]);

  /**
   * Send messages one by one (opens WhatsApp Web for each)
   */
  const sendBulkMessages = useCallback(async (messages: WhatsAppMessage[]) => {
    setIsSending(true);
    setProgress({ sent: 0, total: messages.length });
    setResults([]);

    const results: WhatsAppMessage[] = [];

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      try {
        // Open WhatsApp Web for this message
        const success = openWhatsAppChat(message.phone, message.message);
        
        if (success) {
          message.status = 'sent';
          results.push(message);
          
          // Update progress
          const newProgress = { sent: i + 1, total: messages.length };
          setProgress(newProgress);
          onProgress?.(i + 1, messages.length);
          
          // Show notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Message ${i + 1}/${messages.length}`, {
              body: `Opened WhatsApp for ${message.studentName}`,
              icon: '/whatsapp-icon.png'
            });
          }
        } else {
          message.status = 'failed';
          results.push(message);
        }
      } catch (error) {
        console.error(`Failed to send message to ${message.phone}:`, error);
        message.status = 'failed';
        results.push(message);
      }

      // Delay between messages (except for the last one)
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenMessages));
      }
    }

    setResults(results);
    setIsSending(false);
    onComplete?.(results);
    
    return results;
  }, [openWhatsAppChat, delayBetweenMessages, onProgress, onComplete]);

  /**
   * Generate WhatsApp Web links for all messages
   */
  const generateWhatsAppLinks = useCallback((messages: WhatsAppMessage[]) => {
    return messages.map(message => {
      const formattedPhone = formatPhoneNumber(message.phone);
      
      // Use WhatsApp API URL instead of web.whatsapp.com to avoid loading issues
      const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message.message)}`;
      
      return {
        ...message,
        url
      };
    });
  }, [formatPhoneNumber]);

  /**
   * Alternative method using wa.me links (more reliable)
   */
  const openWhatsAppChatAlternative = useCallback((phone: string, message: string) => {
    // Format phone number with proper country code
    const formattedPhone = formatPhoneNumber(phone);
    
    // Use wa.me instead of web.whatsapp.com
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    
    try {
      // Try to open in new tab with specific window features
      const newWindow = window.open(
        whatsappUrl, 
        '_blank', 
        'noopener,noreferrer,width=800,height=600'
      );
      
      // Check if popup was blocked
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        console.warn('Popup blocked, trying alternative method...');
        
        // Fallback: Create a temporary link and click it
        const link = document.createElement('a');
        link.href = whatsappUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        // Clean up after a short delay
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
        }, 100);
        
        return true; // Assume success for fallback
      }
      
      return true;
    } catch (error) {
      console.error('Failed to open WhatsApp:', error);
      return false;
    }
  }, [formatPhoneNumber]);

  /**
   * Download messages as HTML file with clickable links
   */
  const downloadAsHTML = useCallback((messages: WhatsAppMessage[], filename: string = 'whatsapp_messages.html') => {
    const links = generateWhatsAppLinks(messages);
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>WhatsApp Messages</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .message { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .student-name { font-weight: bold; color: #25d366; }
        .phone { color: #666; }
        .message-content { margin: 10px 0; white-space: pre-wrap; }
        .whatsapp-link { 
            display: inline-block; 
            background: #25d366; 
            color: white; 
            padding: 10px 20px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin-top: 10px;
        }
        .whatsapp-link:hover { background: #128c7e; }
    </style>
</head>
<body>
    <h1>WhatsApp Messages for Attendance</h1>
    <p>Click each link to open WhatsApp Web and send the message:</p>
    
    ${links.map(link => `
        <div class="message">
            <div class="student-name">${link.studentName}</div>
            <div class="phone">Phone: ${link.phone}</div>
            <div class="message-content">${link.message}</div>
            <a href="${link.url}" target="_blank" class="whatsapp-link">
                📱 Send WhatsApp Message
            </a>
        </div>
    `).join('')}
    
    <script>
        // Auto-open first message after 2 seconds
        setTimeout(() => {
            const firstLink = document.querySelector('.whatsapp-link');
            if (firstLink) {
                firstLink.click();
            }
        }, 2000);
    </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generateWhatsAppLinks]);

  /**
   * Open SMS app with a specific phone number and message
   */
  const openSMSChat = useCallback((phone: string, message: string) => {
    // Format phone number with proper country code
    const formattedPhone = formatPhoneNumber(phone);
    
    // Create SMS URL (sms: protocol)
    // Remove country code for SMS (most SMS apps work better with local format)
    const localPhone = formattedPhone.startsWith('92') ? formattedPhone.substring(2) : formattedPhone;
    const smsUrl = `sms:${localPhone}?body=${encodeURIComponent(message)}`;
    
    try {
      // Try to open SMS app
      window.location.href = smsUrl;
      return true;
    } catch (error) {
      console.error('Failed to open SMS app:', error);
      // Fallback: try with tel: protocol
      try {
        window.location.href = `tel:${localPhone}`;
        return true;
      } catch (fallbackError) {
        console.error('Failed to open tel link:', fallbackError);
        return false;
      }
    }
  }, [formatPhoneNumber]);

  /**
   * Request notification permission
   */
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  return {
    isSending,
    progress,
    results,
    sendBulkMessages,
    openWhatsAppChat,
    openWhatsAppChatAlternative,
    openSMSChat,
    generateWhatsAppLinks,
    downloadAsHTML,
    requestNotificationPermission,
    formatPhoneNumber
  };
};
