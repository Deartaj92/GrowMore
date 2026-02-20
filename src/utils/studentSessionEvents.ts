export const broadcastStudentSessionChange = () => {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('student-session-changed'));
  } catch (error) {
    // Failed to dispatch student-session-changed event
  }
};
