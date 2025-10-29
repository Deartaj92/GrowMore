import { supabase } from '../supabaseClient';

export interface AttendanceNotificationData {
  student_id: number;
  student_name: string;
  class_name: string;
  section_name?: string;
  date: string;
  status: string;
  remarks?: string;
  student_phone: string; // Changed from parent_phone to student_phone
  family_id?: number;
  school_short_name?: string;
}

export interface WhatsAppNotification {
  id?: number;
  school_id: number;
  student_id: number;
  family_id?: number;
  student_phone: string; // Changed from parent_phone
  message_type: string;
  message_content: string;
  status?: string;
  scheduled_time?: string;
  sent_time?: string;
  error_message?: string;
  retry_count?: number;
  max_retries?: number;
}

class WhatsAppSemiAutoService {
  private readonly MESSAGE_TEMPLATES = {
    attendance: {
      urdu: {
        absent: `روزنامہ حاضری کی رپورٹ
محترم والد/والدہ!
آپ کا بچہ {studentName} کلاس {className} آج بتاریخ {date} سکول سے غیر حاضر ہے۔
برائے مہربانی اپنے بچے کو باقاعدگی سے سکول بھیجیں۔ شکریہ

{schoolName}`,
        
        late: `روزنامہ حاضری کی رپورٹ
محترم والد/والدہ!
آپ کا بچہ {studentName} کلاس {className} آج بتاریخ {date} سکول سے دیر سے پہنچا ہے۔
برائے مہربانی اپنے بچے کو وقت پر سکول بھیجیں۔ شکریہ

{schoolName}`,
        
        leave: `روزنامہ حاضری کی رپورٹ
محترم والد/والدہ!
آپ کا بچہ {studentName} کلاس {className} آج بتاریخ {date} سکول سے چھٹی ہے۔
اطلاع دینے کا شکریہ۔

{schoolName}`
      },
      english: {
        absent: `📚 Daily Attendance Report
Dear Parent/Guardian!
Your child {studentName} from class {className} was absent on {date}.
Please ensure your child attends school regularly. Thank you.

{schoolName}`,
        
        late: `📚 Daily Attendance Report
Dear Parent/Guardian!
Your child {studentName} from class {className} was late on {date}.
Please ensure your child arrives at school on time. Thank you.

{schoolName}`,
        
        leave: `📚 Daily Attendance Report
Dear Parent/Guardian!
Your child {studentName} from class {className} was on leave on {date}.
Thank you for informing us.

{schoolName}`
      }
    }
  };

  /**
   * Prepare attendance notifications for absent/late/leave students
   * Simplified version using student phone numbers directly
   */
  async prepareAttendanceNotifications(
    attendanceData: any[],
    schoolId: number,
    schoolName: string,
    className: string,
    sectionName?: string
  ): Promise<AttendanceNotificationData[]> {
    try {
      // Fetch school short name from institute profile
      let schoolShortName = schoolName;
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('institute_profile')
          .select('short_name')
          .eq('school_id', schoolId)
          .single();

        if (!profileError && profileData?.short_name) {
          schoolShortName = profileData.short_name;
          console.log('Using school short name:', schoolShortName);
        } else {
          console.log('No short name found, using full school name:', schoolName);
        }
      } catch (error) {
        console.warn('Error fetching school short name:', error);
      }

      const notificationData: AttendanceNotificationData[] = [];
      
      for (const student of attendanceData) {
        // Only send notifications for absent, late, or leave students
        if (['absent', 'late', 'leave'].includes(student.status.toLowerCase())) {
          try {
            // Get student info including phone number
            const { data: studentInfo, error: studentError } = await supabase
              .from('students')
              .select('name, phone')
              .eq('id', student.id)
              .eq('school_id', schoolId)
              .single();

            if (studentError) {
              console.error(`Error fetching student info for ID ${student.id}:`, studentError);
              continue;
            }

            // Check if we have phone number
            if (studentInfo?.phone) {
              notificationData.push({
                student_id: student.id,
                student_name: studentInfo.name,
                class_name: className,
                section_name: sectionName,
                date: student.date || new Date().toISOString().split('T')[0],
                status: student.status,
                remarks: student.remarks,
                student_phone: studentInfo.phone,
                family_id: undefined, // Not using family system
                school_short_name: schoolShortName
              });
            } else {
              console.warn(`No phone number found for student ID ${student.id} (${studentInfo?.name})`);
            }
          } catch (error) {
            console.error(`Unexpected error processing student ID ${student.id}:`, error);
            continue;
          }
        }
      }

      console.log(`Prepared ${notificationData.length} notifications out of ${attendanceData.length} students`);
      return notificationData;
    } catch (error) {
      console.error('Failed to prepare attendance notifications:', error);
      throw error;
    }
  }

  /**
   * Format attendance message based on status and language
   */
  private formatAttendanceMessage(data: AttendanceNotificationData, schoolName: string, language: 'urdu' | 'english' = 'urdu'): string {
    const template = this.MESSAGE_TEMPLATES.attendance[language][data.status.toLowerCase() as keyof typeof this.MESSAGE_TEMPLATES.attendance.urdu];
    
    if (!template) {
      if (language === 'urdu') {
        return `روزنامہ حاضری کی رپورٹ
محترم والد/والدہ!
آپ کا بچہ ${data.student_name} کلاس ${data.class_name} آج بتاریخ ${data.date} سکول سے ${data.status} ہے۔
${data.remarks ? `تبصرہ: ${data.remarks}` : ''}
برائے مہربانی اپنے بچے کو باقاعدگی سے سکول بھیجیں۔ شکریہ

${data.school_short_name || schoolName}`;
      } else {
        return `📚 Daily Attendance Report
Dear Parent/Guardian!
Your child ${data.student_name} from class ${data.class_name} was ${data.status.toLowerCase()} on ${data.date}.
${data.remarks ? `Remarks: ${data.remarks}` : ''}
Please ensure your child attends school regularly. Thank you.

${data.school_short_name || schoolName}`;
      }
    }

    return template
      .replace('{studentName}', data.student_name)
      .replace('{className}', data.section_name ? `${data.class_name} - ${data.section_name}` : data.class_name)
      .replace('{date}', data.date)
      .replace('{schoolName}', data.school_short_name || schoolName)
      .replace('{remarks}', data.remarks || '');
  }

  /**
   * Generate CSV data for WA Sender plugin
   */
  generateCSVForWASender(
    notificationData: AttendanceNotificationData[],
    schoolName: string
  ): string {
    const csvRows = notificationData.map(data => {
      const message = this.formatAttendanceMessage(data, schoolName, 'urdu');
      // Format for WA Sender: Phone,Message
      return `"${data.student_phone}","${message.replace(/"/g, '""')}"`;
    });

    return 'Phone,Message\n' + csvRows.join('\n');
  }

  /**
   * Download CSV file for WA Sender plugin
   */
  downloadCSVForWASender(
    notificationData: AttendanceNotificationData[],
    schoolName: string,
    date: string
  ): void {
    try {
      const csvContent = this.generateCSVForWASender(notificationData, schoolName);
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `attendance_notifications_${date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading CSV:', error);
      throw error;
    }
  }

  /**
   * Generate Google Sheets data for WA Sender plugin
   */
  generateGoogleSheetsData(
    notificationData: AttendanceNotificationData[],
    schoolName: string
  ): Array<{Phone: string, Message: string}> {
    return notificationData.map(data => ({
      Phone: data.student_phone,
      Message: this.formatAttendanceMessage(data, schoolName, 'urdu')
    }));
  }

  /**
   * Log notification activity
   */
  async logNotificationActivity(
    action: string,
    className: string,
    sectionName: string,
    notificationCount: number,
    date: string
  ): Promise<void> {
    try {
      // Simple activity logging
      console.log(`WhatsApp notification activity: ${action}`, {
        class: className,
        section: sectionName,
        notification_count: notificationCount,
        date: date,
        method: 'semi_automated',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging WhatsApp notification activity:', error);
    }
  }
}

export const whatsappSemiAutoService = new WhatsAppSemiAutoService();