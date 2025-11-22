import { supabase } from '../supabaseClient';

export interface AttendanceNotificationData {
  student_id: number;
  student_name: string;
  father_name?: string;
  class_name: string;
  section_name?: string;
  date: string;
  status: string;
  remarks?: string;
  student_phone: string; // Changed from parent_phone to student_phone
  family_id?: number;
  school_short_name?: string;
  notification_channel?: 'whatsapp' | 'sms'; // Added notification channel
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
        }
      } catch (error) {
        // Error fetching school short name
      }

      const notificationData: AttendanceNotificationData[] = [];

      // Filter eligible attendance entries first
      const eligible = attendanceData.filter(s => ['absent', 'late', 'leave'].includes(String(s.status).toLowerCase()));
      if (eligible.length === 0) {
        return [];
      }

      // Batch fetch students
      const studentIds = Array.from(new Set(eligible.map((s: any) => s.id))).filter(Boolean);
      const { data: studentsBatch, error: studentsBatchError } = await supabase
        .from('students')
        .select('id, name, phone, notification_channel, class_id, section_id, father_name')
        .in('id', studentIds)
        .eq('school_id', schoolId);

      if (studentsBatchError) {
        return [];
      }

      const studentMap = new Map<number, any>();
      (studentsBatch || []).forEach(s => studentMap.set(s.id, s));

      // Collect unique class and section IDs
      const classIds = Array.from(new Set((studentsBatch || []).map(s => s.class_id).filter(Boolean)));
      const sectionIds = Array.from(new Set((studentsBatch || []).map(s => s.section_id).filter(Boolean)));

      // Batch fetch classes and sections
      let classMap = new Map<number, string>();
      let sectionMap = new Map<number, string>();

      if (classIds.length > 0) {
        const { data: classesData } = await supabase
          .from('classes')
          .select('id, name')
          .in('id', classIds)
          .eq('school_id', schoolId);
        (classesData || []).forEach(c => classMap.set(c.id, c.name));
      }

      if (sectionIds.length > 0) {
        const { data: sectionsData } = await supabase
          .from('sections')
          .select('id, name')
          .in('id', sectionIds)
          .eq('school_id', schoolId);
        (sectionsData || []).forEach(s => sectionMap.set(s.id, s.name));
      }

      // Build notifications
      for (const att of eligible) {
        const studentInfo = studentMap.get(att.id);
        if (!studentInfo) continue;

        const studentClassName = studentInfo.class_id ? (classMap.get(studentInfo.class_id) || className) : className;
        const studentSectionName = studentInfo.section_id ? (sectionMap.get(studentInfo.section_id) || sectionName) : sectionName;

        if (studentInfo.phone) {
          notificationData.push({
            student_id: att.id,
            student_name: studentInfo.name,
            father_name: studentInfo.father_name,
            class_name: studentClassName,
            section_name: studentSectionName,
            date: att.date || new Date().toISOString().split('T')[0],
            status: att.status,
            remarks: att.remarks,
            student_phone: studentInfo.phone,
            family_id: undefined,
            school_short_name: schoolShortName,
            notification_channel: (studentInfo.notification_channel as 'whatsapp' | 'sms') || 'whatsapp'
          });
        }
      }

      return notificationData;
    } catch (error) {
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
    } catch (error) {
      // Error logging WhatsApp notification activity
    }
  }
}

export const whatsappSemiAutoService = new WhatsAppSemiAutoService();