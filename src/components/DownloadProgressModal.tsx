import React, { useEffect, useState, useContext } from 'react';
import ReactDOM from 'react-dom';
import styled, { ThemeProvider } from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from './Layout';

const ModalOverlay = styled.div<{ isMinimized: boolean }>`
  position: fixed;
  ${props => props.isMinimized ? `
    top: auto;
    left: auto;
    right: 20px;
    bottom: 20px;
    width: auto;
    height: auto;
    background: transparent;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  ` : `
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  `}
  z-index: 10001;
  display: flex;
  align-items: ${props => props.isMinimized ? 'flex-end' : 'center'};
  justify-content: ${props => props.isMinimized ? 'flex-end' : 'center'};
  animation: ${props => props.isMinimized ? 'none' : 'fadeIn 0.2s ease-out'};

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ModalContainer = styled.div<{ isMinimized: boolean }>`
  background: ${({ theme }) => theme.CARD || '#ffffff'};
  border: 1px solid ${({ theme }) => theme.BORDER || 'rgba(0, 0, 0, 0.1)'};
  border-radius: ${props => props.isMinimized ? '12px' : '16px'};
  padding: ${props => props.isMinimized ? '16px 20px' : '32px'};
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
  width: ${props => props.isMinimized ? '320px' : '90vw'};
  max-width: ${props => props.isMinimized ? '320px' : '480px'};
  animation: ${props => props.isMinimized ? 'slideInRight 0.3s ease-out' : 'slideUp 0.3s cubic-bezier(0.2, 0.9, 0.4, 1)'};
  cursor: ${props => props.isMinimized ? 'pointer' : 'default'};

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const MinimizeButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.TEXT_SECONDARY || '#666666'};
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 18px;
  line-height: 1;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
    color: ${({ theme }) => theme.TEXT_PRIMARY || '#1a1a1a'};
  }
`;

const Title = styled.h3`
  margin: 0 0 8px 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY || '#1a1a1a'};
  font-size: 1.25rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const DownloadIcon = styled.div`
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #4a6cf7, #3b82f6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  font-weight: bold;
  flex-shrink: 0;
`;

const FileName = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY || '#666666'};
  margin-bottom: 24px;
  word-break: break-all;
`;

const ProgressContainer = styled.div`
  margin-bottom: 24px;
`;

const ProgressInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const ProgressLabel = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY || '#666666'};
  font-weight: 500;
`;

const ProgressPercent = styled.span`
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY || '#1a1a1a'};
  font-weight: 700;
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 12px;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
  border-radius: 6px;
  overflow: hidden;
  position: relative;
`;

const ProgressBarFill = styled.div<{ progress: number }>`
  width: ${props => props.progress}%;
  height: 100%;
  background: linear-gradient(90deg, #4a6cf7, #3b82f6, #60a5fa);
  transition: width 0.3s ease;
  border-radius: 6px;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;

const SizeInfo = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY || '#666666'};
  margin-top: 8px;
  text-align: center;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.95rem;
  
  ${props => props.variant === 'primary' ? `
    background: linear-gradient(135deg, #4a6cf7, #3b82f6);
    color: white;
    &:hover:not(:disabled) { 
      background: linear-gradient(135deg, #3a5ce5, #2563eb); 
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(74, 108, 247, 0.4);
    }
    &:disabled {
      background: #9ca3af;
      cursor: not-allowed;
      transform: none;
    }
  ` : `
    background: ${props.theme.CANCEL_BG || props.theme.CARD || props.theme.FIELD_BG || '#ededed'};
    color: ${props.theme.CANCEL_COLOR || props.theme.TEXT_PRIMARY || '#232323'};
    border: 1px solid ${props.theme.BORDER || props.theme.FIELD_BORDER || 'rgba(0, 0, 0, 0.1)'};
    &:hover:not(:disabled) { 
      background: ${props.theme.ACCENT_INPUT || props.theme.ACCENT || '#4a6cf7'}; 
      color: #fff;
      border-color: ${props.theme.ACCENT_INPUT || props.theme.ACCENT || '#4a6cf7'};
      transform: translateY(-1px);
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `}
`;

interface DownloadProgressModalProps {
  isVisible: boolean;
  fileName: string;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  isPaused?: boolean;
  onCancel: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onComplete?: (filePath: string) => void;
  isMinimized?: boolean;
  onMinimizeChange?: (minimized: boolean) => void;
}

const DownloadProgressModal: React.FC<DownloadProgressModalProps> = ({
  isVisible,
  fileName,
  progress,
  downloadedBytes,
  totalBytes,
  isPaused = false,
  onCancel,
  onPause,
  onResume,
  onComplete,
  isMinimized: externalIsMinimized,
  onMinimizeChange
}) => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const [showComplete, setShowComplete] = useState(false);
  const [internalIsMinimized, setInternalIsMinimized] = useState(false);
  const [startTime] = useState(Date.now());
  
  // Use external minimized state if provided, otherwise use internal
  const isMinimized = externalIsMinimized !== undefined ? externalIsMinimized : internalIsMinimized;
  
  const handleMinimizeChange = (minimized: boolean) => {
    if (externalIsMinimized !== undefined && onMinimizeChange) {
      onMinimizeChange(minimized);
    } else {
      setInternalIsMinimized(minimized);
    }
  };

  useEffect(() => {
    if (progress === 100 && !showComplete) {
      setShowComplete(true);
      // Notify parent that download is complete
      // The save dialog was already shown before download started
      setTimeout(() => {
        if (onComplete) {
          onComplete('');
        }
      }, 1000);
    }
  }, [progress, showComplete, onComplete]);

  if (!isVisible) return null;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const modalContent = (
    <ThemeProvider theme={theme}>
      <ModalOverlay 
        isMinimized={isMinimized} 
        onClick={(e) => {
          // Only allow closing by clicking outside when download is complete
          // During active download, prevent closing by clicking outside
          if (showComplete && !isMinimized) {
            // Allow closing when complete
            onCancel();
          } else if (isMinimized) {
            // When minimized, clicking outside restores it
            handleMinimizeChange(false);
          }
          // Otherwise, do nothing (download in progress)
        }}
      >
        <ModalContainer isMinimized={isMinimized} onClick={(e) => {
          e.stopPropagation();
          if (isMinimized && !showComplete) {
            handleMinimizeChange(false);
          }
        }}>
          <HeaderRow>
            <Title style={{ margin: 0, flex: 1 }}>
              <DownloadIcon style={{ display: isMinimized ? 'none' : 'flex' }}>⬇</DownloadIcon>
              {showComplete ? 'Download Complete!' : isPaused ? 'Download Paused' : isMinimized ? `${progress}%` : 'Downloading Update'}
            </Title>
                   {!showComplete && (
                     <MinimizeButton 
                       onClick={(e) => {
                         e.stopPropagation();
                         handleMinimizeChange(!isMinimized);
                       }}
                       title={isMinimized ? 'Restore' : 'Minimize to corner'}
                     >
                       {isMinimized ? '⬆' : '⬇'}
                     </MinimizeButton>
                   )}
          </HeaderRow>
          
          {!isMinimized && <FileName>{fileName}</FileName>}

          {!isMinimized && (
            <ProgressContainer>
              <ProgressInfo>
                <ProgressLabel>{showComplete ? 'Completed' : 'Progress'}</ProgressLabel>
                <ProgressPercent>{progress}%</ProgressPercent>
              </ProgressInfo>
              
              <ProgressBarContainer>
                <ProgressBarFill progress={progress} />
              </ProgressBarContainer>

              <SizeInfo>
                {formatBytes(downloadedBytes)} / {formatBytes(totalBytes)}
                {!showComplete && progress > 0 && downloadedBytes > 0 && (
                  <span style={{ marginLeft: '8px' }}>
                    • {formatBytes(((downloadedBytes / (Date.now() - startTime)) * 1000))}/s
                  </span>
                )}
              </SizeInfo>
            </ProgressContainer>
          )}

          {isMinimized && !showComplete && (
            <ProgressBarContainer style={{ marginTop: '8px' }}>
              <ProgressBarFill progress={progress} />
            </ProgressBarContainer>
          )}

          {!isMinimized && (
            <>
              {showComplete ? (
                <ButtonContainer>
                  <Button variant="primary" onClick={async () => {
                    // Call onComplete which will handle opening file location
                    if (onComplete) {
                      onComplete('');
                    }
                  }}>
                    Open File Location
                  </Button>
                  <Button onClick={onCancel}>
                    Close
                  </Button>
                </ButtonContainer>
              ) : (
                <ButtonContainer>
                  {onPause && onResume && (
                    <Button onClick={isPaused ? onResume : onPause}>
                      {isPaused ? '▶ Resume' : '⏸ Pause'}
                    </Button>
                  )}
                  <Button onClick={onCancel} disabled={progress === 100}>
                    Cancel
                  </Button>
                </ButtonContainer>
              )}
            </>
          )}
        </ModalContainer>
      </ModalOverlay>
    </ThemeProvider>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default DownloadProgressModal;

