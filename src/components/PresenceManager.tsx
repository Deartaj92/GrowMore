import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

const PresenceManager: React.FC = () => {
    const { user } = useAuth();
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Helper to get current student session
    const getStudentSession = () => {
        const session = localStorage.getItem('studentSession');
        return session ? JSON.parse(session) : null;
    };

    const updateStatus = async (isOnline: boolean) => {
        const now = new Date().toISOString();
        const studentSession = getStudentSession();
        const appVersion = process.env.REACT_APP_VERSION || 'v1.3.1';

        // Update Staff
        if (user?.staff_id) {
            await supabase
                .from('staff')
                .update({
                    is_online: isOnline,
                    last_online: now,
                    app_version: appVersion
                })
                .eq('id', user.staff_id);
        }

        // Update Student
        if (studentSession?.id && studentSession?.isStudent) {
            await supabase
                .from('students')
                .update({
                    is_online: isOnline,
                    last_online: now,
                    app_version: appVersion
                })
                .eq('id', studentSession.id);
        }
    };

    useEffect(() => {
        // Initial online status
        updateStatus(true);

        // Heartbeat every 2 minutes
        heartbeatIntervalRef.current = setInterval(() => {
            updateStatus(true);
        }, 2 * 60 * 1000);

        // Visibility change handler
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                updateStatus(true);
            } else {
                updateStatus(false);
            }
        };

        // Before unload handler (close/refresh)
        const handleBeforeUnload = () => {
            updateStatus(false);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            updateStatus(false); // Set offline on unmount
        };
    }, [user?.staff_id]); // Re-run if user changes

    return null;
};

export default PresenceManager;
