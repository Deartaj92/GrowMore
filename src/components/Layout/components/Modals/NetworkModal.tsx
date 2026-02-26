import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { WifiOff as WifiOffIcon, Nfc as NfcIcon } from '@mui/icons-material';
import styled from 'styled-components';
import {
  NetworkModal as NetworkModalStyled,
  NetworkModalContent,
  NetworkIcon,
  NetworkTitle,
  NetworkMessage,
  NetworkActions,
  NetworkButton,
} from '../../styles';

const RFIDButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 120px;
  padding: 0.55rem 1.3rem;
  border-radius: 8px;
  border: 2px solid #a855f7;
  background: rgba(168, 85, 247, 0.12);
  color: #a855f7;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(168, 85, 247, 0.22);
    box-shadow: 0 0 16px rgba(168, 85, 247, 0.3);
  }

  svg { font-size: 20px; }
`;

const OfflineHint = styled.p`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.85rem;
  margin: 0 0 0.5rem 0;
  opacity: 0.8;
`;

const Divider = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0.75rem 0;

  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${({ theme }) => theme.BORDER};
  }

  span {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

interface NetworkModalProps {
  isOpen: boolean;
  isCheckingConnection: boolean;
  onRetry: () => void;
  onExit: () => void;
}

const NetworkModal: React.FC<NetworkModalProps> = ({
  isOpen,
  isCheckingConnection,
  onRetry,
  onExit,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (!isOpen) return null;

  // If already on an RFID page, don't show the modal at all — let the page work offline
  const isOnRFIDPage =
    location.pathname.includes('/attendance/rfid-scanner') ||
    location.pathname.includes('/attendance/rfid-cards');

  if (isOnRFIDPage) return null;

  const handleGoToRFID = () => {
    navigate('/attendance/rfid-scanner');
  };

  return (
    <NetworkModalStyled>
      <NetworkModalContent>
        <NetworkIcon>
          <WifiOffIcon style={{ fontSize: 'inherit' }} />
        </NetworkIcon>
        <NetworkTitle>No Internet Connection</NetworkTitle>
        <NetworkMessage>
          Please check your internet connection and try again.
          The application requires an internet connection to function properly.
        </NetworkMessage>
        <NetworkActions>
          <NetworkButton
            onClick={onRetry}
            disabled={isCheckingConnection}
          >
            {isCheckingConnection ? 'Checking...' : 'Retry'}
          </NetworkButton>
          <NetworkButton variant="danger" onClick={onExit}>
            Exit
          </NetworkButton>
        </NetworkActions>
        <Divider>
          <span>or</span>
        </Divider>
        <OfflineHint>RFID attendance works without internet</OfflineHint>
        <RFIDButton onClick={handleGoToRFID}>
          <NfcIcon />
          Open RFID Scanner
        </RFIDButton>
      </NetworkModalContent>
    </NetworkModalStyled>
  );
};

export default NetworkModal;
