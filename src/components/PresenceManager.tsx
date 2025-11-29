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

    // Helper to get current parent/family session
    const getFamilySession = () => {
        const session = localStorage.getItem('parentSession');
        return session ? JSON.parse(session) : null;
    };

    const updateStatus = async (isOnline: boolean) => {
        const now = new Date().toISOString();
        const studentSession = getStudentSession();
        const familySession = getFamilySession();
        const appVersion = process.env.REACT_APP_VERSION || 'v1.4.0';

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

        // Update Family/Parent
        if (familySession?.id && familySession?.isParent) {
            await supabase
                .from('families')
                .update({
                    is_online: isOnline,
                    last_online: now,
                    app_version: appVersion
                })
                .eq('id', familySession.id);
        }
    };

    useEffect(() => {
        // Check initial visibility state and set status accordingly
        const isVisible = document.visibilityState === 'visible';
        updateStatus(isVisible);

        // Heartbeat: only update status when app is visible
        // This keeps the last_online timestamp fresh while user is active
        heartbeatIntervalRef.current = setInterval(() => {
            const currentlyVisible = document.visibilityState === 'visible';
            // Only update if visible - this maintains online status and updates timestamp
            if (currentlyVisible) {
                updateStatus(true);
            }
            // If hidden/minimized, don't update - status should already be false
        }, 2 * 60 * 1000);

        // Visibility change handler - handles minimize/restore and tab switching
        const handleVisibilityChange = () => {
            const isVisible = document.visibilityState === 'visible';
            // Immediately update status based on visibility
            updateStatus(isVisible);
        };

        // Window focus handler - app window gains focus
        const handleWindowFocus = () => {
            // When window gets focus, ensure we're online
            if (document.visibilityState === 'visible') {
                updateStatus(true);
            }
        };

        // Window blur handler - app window loses focus
        const handleWindowBlur = () => {
            // Only set offline if document is also hidden (minimized)
            // Don't set offline just because user clicked outside - app might still be visible
            if (document.visibilityState === 'hidden') {
                updateStatus(false);
            }
        };

        // Before unload handler (close/refresh)
        const handleBeforeUnload = () => {
            updateStatus(false);
        };

        // Add event listeners
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleWindowFocus);
        window.addEventListener('blur', handleWindowBlur);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            // Cleanup
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleWindowFocus);
            window.removeEventListener('blur', handleWindowBlur);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            updateStatus(false); // Set offline on unmount
        };
    }, [user?.staff_id]); // Re-run if user changes

    return null;
};

export default PresenceManager;
