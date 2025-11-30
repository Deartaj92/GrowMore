import React from 'react';
import { ExitToApp as ExitIcon } from '@mui/icons-material';
import {
  ModalOverlay,
  ModalBox,
  ModalTitle,
  ModalButton,
} from '../../styles';
import { Theme } from '../../types';

interface ExitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  theme: Theme;
}

const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  theme,
}) => {
  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalBox onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px',
            background: theme === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ExitIcon style={{ fontSize: '32px', color: '#ef4444' }} />
          </div>
          <ModalTitle style={{ textAlign: 'center', marginBottom: '8px' }}>
            Exit Application
          </ModalTitle>
          <p style={{
            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            Are you sure you want to exit the application?
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <ModalButton
              onClick={onClose}
              color="#6b7280"
              style={{ flex: 1 }}
            >
              Cancel
            </ModalButton>
            <ModalButton
              onClick={() => {
                onClose();
                onConfirm();
              }}
              color="#ef4444"
              style={{ flex: 1 }}
            >
              Exit
            </ModalButton>
          </div>
        </div>
      </ModalBox>
    </ModalOverlay>
  );
};

export default ExitConfirmModal;

