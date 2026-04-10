import React from 'react';
import { Close as CloseIcon } from '@mui/icons-material';
import {
  SeenByOverlay,
  SeenByBox,
  SeenByHeader,
  SeenByTitle,
  SeenByClose,
  SeenByList,
  SeenByItem,
  SeenByName,
  SeenByMeta,
  SeenByEmpty,
} from '../../styles';
import { AnnouncementView } from '../../types';
import { formatAppDateTime } from '../../../../utils/dateUtils';

interface SeenByModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: AnnouncementView[];
  loading: boolean;
  error: string | null;
}

const SeenByModal: React.FC<SeenByModalProps> = ({
  isOpen,
  onClose,
  entries,
  loading,
  error,
}) => {
  if (!isOpen) return null;

  return (
    <SeenByOverlay>
      <SeenByBox>
        <SeenByHeader>
          <SeenByTitle>Seen by</SeenByTitle>
          <SeenByClose onClick={onClose}>
            <CloseIcon fontSize="small" />
          </SeenByClose>
        </SeenByHeader>
        <SeenByList>
          {loading && <SeenByEmpty>Loading…</SeenByEmpty>}
          {!loading && error && <SeenByEmpty>{error}</SeenByEmpty>}
          {!loading && !error && entries.length === 0 && (
            <SeenByEmpty>No viewers yet.</SeenByEmpty>
          )}
          {!loading && !error && entries.map(entry => (
            <SeenByItem key={entry.viewer_identifier}>
              <SeenByName>{entry.viewer_name || entry.viewer_identifier}</SeenByName>
              <SeenByMeta>
                <span>{entry.viewer_role || entry.viewer_type}</span>
                {entry.seen_at && <span>{formatAppDateTime(entry.seen_at)}</span>}
              </SeenByMeta>
            </SeenByItem>
          ))}
        </SeenByList>
      </SeenByBox>
    </SeenByOverlay>
  );
};

export default SeenByModal;
