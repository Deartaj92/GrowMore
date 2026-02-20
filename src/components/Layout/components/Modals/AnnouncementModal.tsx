import React from 'react';
import { Snooze as SnoozeIcon, VisibilityOff } from '@mui/icons-material';
import {
  AnnouncementOverlay,
  AnnouncementBox,
  AnnouncementHeader,
  AnnouncementTitle,
  AnnouncementBody,
  AnnouncementFooter,
  AnnouncementFooterRow,
  AnnouncementFooterHighlight,
  AnnouncementActions,
  AnnouncementActionButton,
} from '../../styles';

interface AnnouncementModalProps {
  announcement: any;
  onRemindMeLater: () => void;
  onDontShowAgain: () => void;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  announcement,
  onRemindMeLater,
  onDontShowAgain,
}) => {
  if (!announcement) return null;

  return (
    <AnnouncementOverlay>
      <AnnouncementBox>
        <AnnouncementHeader>
          <AnnouncementTitle
            className="ql-editor"
            dangerouslySetInnerHTML={{ __html: announcement.title || '' }}
          />
        </AnnouncementHeader>
        <AnnouncementBody>
          <div
            className="ql-editor"
            dangerouslySetInnerHTML={{ __html: announcement.message || '' }}
          />
        </AnnouncementBody>
        {announcement.footer_text && (
          <AnnouncementFooter>
            <AnnouncementFooterRow>
              <AnnouncementFooterHighlight
                className="ql-editor"
                dangerouslySetInnerHTML={{ __html: announcement.footer_text }}
              />
            </AnnouncementFooterRow>
          </AnnouncementFooter>
        )}
        <AnnouncementActions>
          <AnnouncementActionButton $variant="primary" type="button" onClick={onRemindMeLater}>
            <SnoozeIcon fontSize="small" />
            Remind me later
          </AnnouncementActionButton>
          {!announcement.hide_dont_show && (
            <AnnouncementActionButton type="button" onClick={onDontShowAgain}>
              <VisibilityOff fontSize="small" />
              Don't show again
            </AnnouncementActionButton>
          )}
        </AnnouncementActions>
      </AnnouncementBox>
    </AnnouncementOverlay>
  );
};

export default AnnouncementModal;

