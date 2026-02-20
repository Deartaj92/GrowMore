import React from 'react';
import { WifiOff as WifiOffIcon } from '@mui/icons-material';
import {
  NetworkModal as NetworkModalStyled,
  NetworkModalContent,
  NetworkIcon,
  NetworkTitle,
  NetworkMessage,
  NetworkActions,
  NetworkButton,
} from '../../styles';

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
  if (!isOpen) return null;

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
      </NetworkModalContent>
    </NetworkModalStyled>
  );
};

export default NetworkModal;

