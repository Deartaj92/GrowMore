import { supabase } from '../supabaseClient';

/**
 * Test function to create a sample notification
 * This can be called from the browser console to test the notification system
 */
export const createTestNotification = async (userId: number, schoolId: number) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: userId,
        school_id: schoolId,
        notification_type: 'activity',
        title: 'John Doe', // Teacher name
        message: 'Marked Attendance - 12/20/2024 - Class 10 (Section A)',
        is_important: false,
        expires_at: null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating test notification:', error);
      return null;
    }

    console.log('Test notification created:', data);
    return data;
  } catch (error) {
    console.error('Failed to create test notification:', error);
    return null;
  }
};

/**
 * Test function to create multiple test notifications
 */
export const createMultipleTestNotifications = async (userId: number, schoolId: number, count: number = 3) => {
  const notifications = Array.from({ length: count }, (_, index) => ({
    recipient_id: userId,
    school_id: schoolId,
    notification_type: 'activity',
    title: `Teacher ${index + 1}`, // Teacher name
    message: index === 0 ? 'Marked Attendance - 12/20/2024 - Class 10 (Section A)' :
             index === 1 ? 'Mathematics Test Marks Entered - 12/20/2024 - 25 Students' :
             'Physics Test Marks Entered - 12/20/2024 - Final Examination',
    is_important: index === 0, // Make first one important
    expires_at: null
  }));

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      console.error('Error creating test notifications:', error);
      return null;
    }

    console.log(`Created ${count} test notifications:`, data);
    return data;
  } catch (error) {
    console.error('Failed to create test notifications:', error);
    return null;
  }
};

// Make functions available globally for testing
if (typeof window !== 'undefined') {
  (window as any).createTestNotification = createTestNotification;
  (window as any).createMultipleTestNotifications = createMultipleTestNotifications;
}
