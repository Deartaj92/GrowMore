import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Remove, CropSquare, Close } from '@mui/icons-material';

const ControlsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  -webkit-app-region: no-drag;
  position: fixed;
  top: 0;
  right: 0;
  z-index: 9999;
  padding: 8px;
`;

const ControlButton = styled.button<{ color?: string }>`
  background: transparent;
  border: none;
  color: ${({ color }) => color || '#666'};
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }

  svg {
    font-size: 20px;
  }
`;

const WindowControls: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Check initial window state
    if (window.electronAPI) {
      window.electronAPI.isMaximized().then(setIsMaximized);
    }

    // Listen for maximize/unmaximize events
    if (window.electronAPI) {
      window.electronAPI.onMaximize(() => setIsMaximized(true));
      window.electronAPI.onUnmaximize(() => setIsMaximized(false));
    }
  }, []);

  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimize();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      if (isMaximized) {
        window.electronAPI.unmaximize();
      } else {
        window.electronAPI.maximize();
      }
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.close();
    }
  };

  return (
    <ControlsContainer>
      <ControlButton onClick={handleMinimize}>
        <Remove />
      </ControlButton>
      <ControlButton onClick={handleMaximize}>
        <CropSquare />
      </ControlButton>
      <ControlButton onClick={handleClose} color="#e81123">
        <Close />
      </ControlButton>
    </ControlsContainer>
  );
};

export default WindowControls; 