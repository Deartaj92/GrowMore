export const broadcastStudentSessionChange = () => {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('student-session-changed'));
  } catch (error) {
    console.error('[studentSessionEvents] Failed to dispatch student-session-changed event', error);
  }
};
