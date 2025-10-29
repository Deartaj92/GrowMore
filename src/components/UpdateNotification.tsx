import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { UpdateService } from '../services/updateService';

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

const UpdateContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-width: 350px;
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
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

const UpdateTitle = styled.h3`
  margin: 0 0 12px 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const UpdateIcon = styled.div`
  width: 20px;
  height: 20px;
  background: #4a6cf7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: bold;
`;

const UpdateMessage = styled.p`
  margin: 0 0 16px 0;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.9rem;
  line-height: 1.4;
`;

const ReleaseInfo = styled.div`
  background: ${({ theme }) => theme.BACKGROUND};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
`;

const ReleaseVersion = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin-bottom: 4px;
`;

const ReleaseNotes = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  max-height: 60px;
  overflow-y: auto;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: ${({ theme }) => theme.BORDER};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
`;

const ProgressFill = styled.div<{ progress: number }>`
  width: ${props => props.progress}%;
  height: 100%;
  background: linear-gradient(90deg, #4a6cf7, #3b82f6);
  transition: width 0.3s ease;
  border-radius: 4px;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 12px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  
  ${props => props.variant === 'primary' ? `
    background: #4a6cf7;
    color: white;
    &:hover:not(:disabled) { 
      background: #3a5ce5; 
      transform: translateY(-1px);
    }
    &:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
  ` : `
    background: ${props.theme.BACKGROUND};
    color: ${props.theme.TEXT_PRIMARY};
    border: 1px solid ${props.theme.BORDER};
    &:hover:not(:disabled) { 
      background: ${props.theme.HOVER_BG}; 
      transform: translateY(-1px);
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `}
`;

const CloseButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  cursor: pointer;
  font-size: 18px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  
  &:hover {
    background: ${({ theme }) => theme.HOVER_BG};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

const UpdateNotification: React.FC = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [release, setRelease] = useState<GitHubRelease | null>(null);
  const [updateService] = useState(UpdateService.getInstance());

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      const result = await updateService.checkForUpdates();
      if (result.updateAvailable && result.release) {
        setRelease(result.release);
        setShowUpdate(true);
      }
    } catch (error) {
      console.error('Update check failed:', error);
    }
  };

  const handleDownload = async () => {
    if (!release) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);
    
    try {
      await updateService.downloadUpdate(release, (progress) => {
        setDownloadProgress(progress);
      });
    } catch (error) {
      console.error('Download failed:', error);
      setIsDownloading(false);
      alert('Download failed. Please try again later.');
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate || !release) return null;

  return (
    <UpdateContainer>
      <CloseButton onClick={handleDismiss} disabled={isDownloading}>
        ×
      </CloseButton>
      
      <UpdateTitle>
        <UpdateIcon>!</UpdateIcon>
        Update Available
      </UpdateTitle>
      
      <UpdateMessage>
        A new version is available. Download now to get the latest features and improvements.
      </UpdateMessage>
      
      <ReleaseInfo>
        <ReleaseVersion>Version {updateService.getReleaseVersion(release)}</ReleaseVersion>
        <ReleaseNotes>
          {updateService.getReleaseNotes(release)}
        </ReleaseNotes>
      </ReleaseInfo>
      
      {isDownloading && (
        <ProgressBar>
          <ProgressFill progress={downloadProgress} />
        </ProgressBar>
      )}
      
      <ButtonContainer>
        <Button 
          variant="primary" 
          onClick={handleDownload} 
          disabled={isDownloading}
        >
          {isDownloading ? `Downloading... ${Math.round(downloadProgress)}%` : 'Download Update'}
        </Button>
        <Button 
          onClick={handleDismiss} 
          disabled={isDownloading}
        >
          Later
        </Button>
      </ButtonContainer>
    </UpdateContainer>
  );
};

export default UpdateNotification;
