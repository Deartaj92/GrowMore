import React, { useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';

interface AnnouncementHandlerProps {
    onOpenAnnouncement: (id: number) => void;
}

const AnnouncementHandler: React.FC<AnnouncementHandlerProps> = ({ onOpenAnnouncement }) => {
    const { activeAnnouncementId, closeAnnouncement } = useNotifications();

    useEffect(() => {
        if (activeAnnouncementId) {
            onOpenAnnouncement(activeAnnouncementId);
            closeAnnouncement(); // Reset the trigger so it can be triggered again
        }
    }, [activeAnnouncementId, onOpenAnnouncement, closeAnnouncement]);

    return null;
};

export default AnnouncementHandler;
