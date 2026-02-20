import React from 'react';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import {
  ModalOverlay,
  ModalBox,
  ModalClose,
  ModalTitle,
  ModalLabel,
  ModalInputGroup,
  ModalInput,
  ModalActions,
  ModalButton,
} from '../../styles';
import { Theme } from '../../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  showCurrent: boolean;
  showNew: boolean;
  showConfirm: boolean;
  modalLoading: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onToggleShowCurrent: () => void;
  onToggleShowNew: () => void;
  onToggleShowConfirm: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  theme,
  currentPassword,
  newPassword,
  confirmPassword,
  showCurrent,
  showNew,
  showConfirm,
  modalLoading,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onToggleShowCurrent,
  onToggleShowNew,
  onToggleShowConfirm,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalBox onClick={(e) => e.stopPropagation()}>
        <ModalClose onClick={onClose}>&times;</ModalClose>
        <ModalTitle>Change Password</ModalTitle>
        <form onSubmit={onSubmit}>
          <ModalLabel>Current Password</ModalLabel>
          <ModalInputGroup>
            <ModalInput
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => onCurrentPasswordChange(e.target.value)}
              placeholder="Enter current password"
              required
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={onToggleShowCurrent}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                color: theme === 'dark' ? '#fff' : '#1e293b'
              }}
            >
              {showCurrent ? <VisibilityOff /> : <Visibility />}
            </button>
          </ModalInputGroup>

          <ModalLabel>New Password</ModalLabel>
          <ModalInputGroup>
            <ModalInput
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => onNewPasswordChange(e.target.value)}
              placeholder="Enter new password"
              required
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={onToggleShowNew}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                color: theme === 'dark' ? '#fff' : '#1e293b'
              }}
            >
              {showNew ? <VisibilityOff /> : <Visibility />}
            </button>
          </ModalInputGroup>

          <ModalLabel>Confirm New Password</ModalLabel>
          <ModalInputGroup>
            <ModalInput
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              placeholder="Confirm new password"
              required
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={onToggleShowConfirm}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                color: theme === 'dark' ? '#fff' : '#1e293b'
              }}
            >
              {showConfirm ? <VisibilityOff /> : <Visibility />}
            </button>
          </ModalInputGroup>

          <ModalActions>
            <ModalButton type="button" onClick={onClose} color="#6b7280">
              Cancel
            </ModalButton>
            <ModalButton type="submit" disabled={modalLoading}>
              {modalLoading ? 'Updating...' : 'Update Password'}
            </ModalButton>
          </ModalActions>
        </form>
      </ModalBox>
    </ModalOverlay>
  );
};

export default ChangePasswordModal;

