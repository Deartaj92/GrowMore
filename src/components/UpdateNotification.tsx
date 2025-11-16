import React, { useState, useEffect, useImperativeHandle, forwardRef, useContext, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styled, { ThemeProvider } from 'styled-components';
import ReactMarkdown from 'react-markdown';
import { UpdateService } from '../services/updateService';
import { ThemeContext, darkTheme, lightTheme } from './Layout';
import DownloadProgressModal from './DownloadProgressModal';

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

// Viewport-centered modal overlay
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
      backdrop-filter: blur(0);
    }
    to {
      opacity: 1;
      backdrop-filter: blur(4px);
    }
  }
`;

// Compact, centered modal container
const UpdateContainer = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${({ theme }) => theme.CARD || '#ffffff'};
  border: 1px solid ${({ theme }) => theme.BORDER || 'rgba(0, 0, 0, 0.1)'};
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  width: 90vw;
  max-width: 450px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s cubic-bezier(0.2, 0.9, 0.4, 1);

  @keyframes slideUp {
    from {
      transform: translate(-50%, -45%);
      opacity: 0;
    }
    to {
      transform: translate(-50%, -50%);
      opacity: 1;
    }
  }

  @media (max-width: 480px) {
    width: calc(100vw - 32px);
    padding: 20px;
    max-width: none;
    max-height: 85vh;
  }
`;

const UpdateTitle = styled.h3`
  margin: 0 0 12px 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY || '#1a1a1a'};
  font-size: 1.15rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: center;
  justify-content: center;
`;

const UpdateIcon = styled.div`
  width: 24px;
  height: 24px;
  background: #4a6cf7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  font-weight: bold;
  flex-shrink: 0;
`;

const UpdateMessage = styled.p`
  margin: 0 0 16px 0;
  color: ${({ theme }) => theme.TEXT_SECONDARY || '#666666'};
  font-size: 0.9rem;
  line-height: 1.5;
  text-align: center;
`;

const ReleaseInfo = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'};
  border: 1px solid ${({ theme }) => theme.BORDER || 'rgba(0, 0, 0, 0.1)'};
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  max-height: 280px;
  display: flex;
  flex-direction: column;
`;

const ReleaseVersion = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY || '#1a1a1a'};
  margin-bottom: 6px;
  font-size: 0.95rem;
  text-align: center;
`;

const ReleaseNotes = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY || '#666666'};
  max-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
  line-height: 1.6;
  text-align: left;
  word-wrap: break-word;
  padding: 8px;
  margin-top: 8px;
  
  /* Markdown styling */
  & h1, & h2, & h3, & h4, & h5, & h6 {
    color: ${({ theme }) => theme.TEXT_PRIMARY || '#1a1a1a'};
    font-weight: 600;
    margin: 12px 0 8px 0;
    line-height: 1.3;
  }
  
  & h1 {
    font-size: 1.1rem;
    border-bottom: 1px solid ${({ theme }) => theme.BORDER || 'rgba(0, 0, 0, 0.1)'};
    padding-bottom: 4px;
  }
  
  & h2 {
    font-size: 1rem;
  }
  
  & h3 {
    font-size: 0.95rem;
  }
  
  & h4, & h5, & h6 {
    font-size: 0.9rem;
  }
  
  & p {
    margin: 8px 0;
    line-height: 1.6;
  }
  
  & strong, & b {
    font-weight: 600;
    color: ${({ theme }) => theme.TEXT_PRIMARY || '#1a1a1a'};
  }
  
  & em, & i {
    font-style: italic;
  }
  
  /* Bold and italic combination (***text*** or **_text_**) */
  & strong em, & strong i, & b em, & b i,
  & em strong, & em b, & i strong, & i b {
    font-weight: 600;
    font-style: italic;
    color: ${({ theme }) => theme.TEXT_PRIMARY || '#1a1a1a'};
  }
  
  /* Also handle nested combinations in headers */
  & h1 strong em, & h1 em strong,
  & h2 strong em, & h2 em strong,
  & h3 strong em, & h3 em strong,
  & h4 strong em, & h4 em strong,
  & h5 strong em, & h5 em strong,
  & h6 strong em, & h6 em strong {
    font-weight: 600;
    font-style: italic;
  }
  
  & code {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'};
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.85em;
    color: ${({ theme }) => theme.TEXT_PRIMARY || '#1a1a1a'};
  }
  
  & pre {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
    padding: 10px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 8px 0;
    
    & code {
      background: transparent;
      padding: 0;
    }
  }
  
  & ul, & ol {
    margin: 8px 0;
    padding-left: 24px;
  }
  
  & li {
    margin: 4px 0;
    line-height: 1.5;
  }
  
  & ul {
    list-style-type: disc;
  }
  
  & ol {
    list-style-type: decimal;
  }
  
  & a {
    color: #4a6cf7;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  & blockquote {
    border-left: 3px solid ${({ theme }) => theme.BORDER || 'rgba(0, 0, 0, 0.2)'};
    padding-left: 12px;
    margin: 8px 0;
    color: ${({ theme }) => theme.TEXT_SECONDARY || '#666666'};
    font-style: italic;
  }
  
  & hr {
    border: none;
    border-top: 1px solid ${({ theme }) => theme.BORDER || 'rgba(0, 0, 0, 0.1)'};
    margin: 12px 0;
  }
  
  & table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    
    & th, & td {
      border: 1px solid ${({ theme }) => theme.BORDER || 'rgba(0, 0, 0, 0.1)'};
      padding: 6px 8px;
      text-align: left;
    }
    
    & th {
      background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
      font-weight: 600;
    }
  }
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    border-radius: 3px;
    
    &:hover {
      background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
    }
  }
  
  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'} ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
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

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  color: ${({ theme }) => theme.TEXT_SECONDARY || '#666666'};
  cursor: pointer;
  font-size: 20px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
    color: ${({ theme }) => theme.TEXT_PRIMARY || '#1a1a1a'};
  }
  
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

// Export interface for manual trigger
export interface UpdateNotificationRef {
  checkForUpdates: () => Promise<void>;
}

const UpdateNotification = forwardRef<UpdateNotificationRef>((props, ref) => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const [showUpdate, setShowUpdate] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [release, setRelease] = useState<GitHubRelease | null>(null);
  const [updateService] = useState(UpdateService.getInstance());
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isDownloadModalMinimized, setIsDownloadModalMinimized] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState<{ fileName: string; downloadedBytes: number; totalBytes: number; filePath?: string }>({
    fileName: '',
    downloadedBytes: 0,
    totalBytes: 0,
    filePath: ''
  });
  const DISMISSED_KEY = 'gm_dismissed_release_tag';
  const STARTUP_CHECK_KEY = 'gm_startup_update_checked';

  const checkForUpdates = useCallback(async (isManual: boolean = false, isStartup: boolean = false) => {
    // If download is in progress, restore the download modal instead of checking for updates
    if (showDownloadModal && isDownloading && downloadProgress < 100) {
      // Restore the minimized modal (bring it to front)
      setIsDownloadModalMinimized(false);
      return;
    }
    
    // Check if there's a dismissed version - if so, don't check during session (unless manual or startup)
    const dismissedTag = localStorage.getItem(DISMISSED_KEY);
    if (!isManual && !isStartup && dismissedTag) {
      // During session, if version was dismissed, don't show update notification again
      // Only startup checks and manual checks can override dismissed status
      return;
    }
    
    try {
      const result = await updateService.checkForUpdates();
      
      if (result.error) {
        console.error('Update check error:', result.error);
        // Only show error alerts for manual checks
        // Startup and automatic checks should fail silently
        if (isManual) {
          // Use the error message from the service directly (it already has user-friendly messages)
          alert('Failed to check for updates:\n\n' + result.error);
        }
        // For startup/automatic checks, fail silently (just return)
        return;
      }
      
      if (result.updateAvailable && result.release) {
        const dismissedTag = localStorage.getItem(DISMISSED_KEY);
        
        if (isManual) {
          // Manual check: show update even if previously dismissed
          // User explicitly requested to check, so show it
          setRelease(result.release);
          setShowUpdate(true);
        } else if (isStartup) {
          // Startup check: always show if update is available (clears dismissed flag before this)
          setRelease(result.release);
          setShowUpdate(true);
        } else {
          // During session (non-startup, non-manual): respect dismissed flag
          // This prevents showing again after canceling during the same session
          if (dismissedTag !== result.release.tag_name) {
            setRelease(result.release);
            setShowUpdate(true);
          }
        }
      } else {
        // No update available
        if (isManual) {
          // For manual checks, show message if no update available
          alert('Your app is up to date. No updates are available for your platform.');
        }
        // For startup/automatic checks, fail silently (no alert)
      }
    } catch (error) {
      console.error('Update check failed:', error);
      if (isManual) {
        alert('Failed to check for updates. Please try again later.');
      }
    }
  }, [updateService, showDownloadModal, isDownloading, downloadProgress]);

  // Expose checkForUpdates method for external use
  useImperativeHandle(ref, () => ({
    checkForUpdates: async () => {
      console.log('[UpdateNotification] checkForUpdates called via ref (manual check)');
      await checkForUpdates(true);
    }
  }), [checkForUpdates]);

  // Check for updates on every app startup (only for desktop/Electron, not web)
  useEffect(() => {
    // Check if running in Electron/Desktop or Capacitor (mobile)
    // Use the same detection logic as UpdateService
    const isDesktop = !!(window as any).electronAPI || !!(window as any).require || navigator.userAgent.includes('Electron');
    const isCapacitor = !!(window as any).Capacitor;
    
    // Only check for updates in Electron/desktop or Capacitor (mobile), not in web browser
    if (!isDesktop && !isCapacitor) {
      // Web: Don't check for updates
      return;
    }
    
    // Clear dismissed flag on startup so updates can show again after app restart
    // This ensures users are always notified of updates on each app launch
    localStorage.removeItem(DISMISSED_KEY);
    
    // Add a small delay to ensure component is fully mounted and app is ready
    const startupCheck = setTimeout(() => {
      // Check for updates on every startup (desktop/mobile only)
      // Check silently (don't show error if offline)
      console.log('[UpdateNotification] Running startup update check');
      checkForUpdates(false, true); // Pass isStartup=true so it always shows on startup
    }, 1500); // 1.5 second delay to ensure app is ready
    
    return () => {
      clearTimeout(startupCheck);
    };
  }, [checkForUpdates]);

  // Set up download progress listener for Electron
  useEffect(() => {
    if (window.electronAPI) {
      const progressHandler = (data: { progress: number; downloadedBytes: number; totalBytes: number; fileName: string; isPaused?: boolean; canceled?: boolean }) => {
        // Handle cancellation
        if (data.canceled) {
          // Get current release from state (use callback to get latest value)
          setRelease(currentRelease => {
            // Mark this version as dismissed to prevent showing again
            if (currentRelease) {
              localStorage.setItem(DISMISSED_KEY, currentRelease.tag_name);
            }
            return currentRelease; // Don't change release, just use it for dismissal
          });
          
          setShowDownloadModal(false);
          setIsDownloading(false);
          setDownloadProgress(0);
          setShowUpdate(false); // Ensure update notification stays closed
          setDownloadInfo({
            fileName: '',
            downloadedBytes: 0,
            totalBytes: 0,
            filePath: ''
          });
          return;
        }
        
        setDownloadProgress(data.progress);
        setIsPaused(data.isPaused || false);
        setDownloadInfo({
          fileName: data.fileName,
          downloadedBytes: data.downloadedBytes,
          totalBytes: data.totalBytes
        });
      };
      
      window.electronAPI.onDownloadProgress(progressHandler);
      
      return () => {
        // Cleanup if needed
      };
    }
  }, []);

  const handleDownload = async () => {
    if (!release) return;
    
    // Check if running in Electron/Desktop
    const isDesktop = !!(window as any).electronAPI || !!(window as any).require || navigator.userAgent.includes('Electron');
    const isCapacitor = !!(window as any).Capacitor;
    
    if (isDesktop && window.electronAPI) {
      // Desktop: Show download modal and use Electron download
      // Hide the update notification modal when download starts
      setShowUpdate(false);
      setIsDownloading(true);
      setShowDownloadModal(true);
      setDownloadProgress(0);
      
      // Find installer name for display
      const installerAsset = release.assets.find(a => 
        (a.name && a.name.toLowerCase().endsWith('.exe') && a.name.toLowerCase().includes('setup')) ||
        (a.name && a.name.toLowerCase().includes('growmore') && a.name.toLowerCase().endsWith('.exe'))
      );
      
      if (installerAsset) {
        setDownloadInfo({
          fileName: installerAsset.name,
          downloadedBytes: 0,
          totalBytes: installerAsset.size || 0
        });
      }
      
      try {
        const result = await updateService.downloadUpdate(release, (progress) => {
          setDownloadProgress(progress);
        });
        
        // Download complete - store file path for completion handler
        // Note: Save dialog was shown before download started
        if (result.filePath) {
          setDownloadInfo(prev => ({ ...prev, filePath: result.filePath }));
        }
      } catch (error: any) {
        setIsDownloading(false);
        setShowDownloadModal(false);
        
        // Don't show error alert if download was canceled by user
        if (!error.message || !error.message.includes('canceled')) {
          alert(`Download failed: ${error.message || 'Please try again later.'}`);
        }
      }
    } else {
      // Mobile (Capacitor) or fallback: Use existing flow
      // Hide the update notification when download starts
      setShowUpdate(false);
      setIsDownloading(true);
      setDownloadProgress(0);
      
      try {
        console.log('[UpdateNotification] Starting mobile/fallback download');
        await updateService.downloadUpdate(release, (progress) => {
          setDownloadProgress(progress);
        });
        setIsDownloading(false);
        
        // For mobile, the download opens in browser/external app
        // Show a helpful message
        if (isCapacitor) {
          alert('Download started! Please check your browser or downloads folder to complete the installation.');
        }
      } catch (error: any) {
        setIsDownloading(false);
        console.error('[UpdateNotification] Download failed:', error);
        alert('Download or install failed. Please try again from the update menu or use Downloads to install.');
      }
    }
  };

  const handleDownloadComplete = async (filePath: string) => {
    // Use the provided filePath or the stored one from downloadInfo
    const finalFilePath = filePath || downloadInfo.filePath;
    
    // Open file location in explorer if we have a path
    if (finalFilePath && window.electronAPI) {
      try {
        await window.electronAPI.showItemInFolder(finalFilePath);
      } catch (error) {
        console.error('Failed to open file location:', error);
        // Fallback: just close the modal
      }
    }
    
    setShowDownloadModal(false);
    setIsDownloading(false);
    setShowUpdate(false);
  };

  const handleDownloadCancel = async () => {
    // Actually cancel the download if it's in progress
    if (window.electronAPI && downloadInfo.fileName) {
      try {
        await window.electronAPI.cancelDownload(downloadInfo.fileName);
      } catch (error) {
        console.error('Failed to cancel download:', error);
      }
    }
    
    // Mark this version as dismissed to prevent it from showing again immediately
    if (release) {
      localStorage.setItem(DISMISSED_KEY, release.tag_name);
    }
    
    setShowDownloadModal(false);
    setIsDownloading(false);
    setDownloadProgress(0);
    setShowUpdate(false); // Ensure update notification is also closed
    setDownloadInfo({
      fileName: '',
      downloadedBytes: 0,
      totalBytes: 0,
      filePath: ''
    });
  };

  const handleCancel = () => {
    // Always close the update notification when Cancel is clicked
    // Download can continue in its own modal
    if (release) {
      localStorage.setItem(DISMISSED_KEY, release.tag_name);
    }
    setShowUpdate(false);
  };

  // Don't return null if download modal is visible - we still need to render it
  const shouldShowUpdateModal = showUpdate && release;

  return (
    <>
             {shouldShowUpdateModal && ReactDOM.createPortal(
               <ThemeProvider theme={theme}>
                 <ModalOverlay>
                   <UpdateContainer onClick={(e) => e.stopPropagation()}>
              <CloseButton onClick={handleCancel}>
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
                  <ReactMarkdown>
                  {updateService.getReleaseNotes(release)}
                  </ReactMarkdown>
                </ReleaseNotes>
              </ReleaseInfo>
              
              <ButtonContainer>
                <Button
                  variant="primary"
                  onClick={handleDownload}
                >
                  Update
                </Button>
                <Button
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              </ButtonContainer>
            </UpdateContainer>
          </ModalOverlay>
        </ThemeProvider>,
        document.body
      )}
      <DownloadProgressModal
        isVisible={showDownloadModal}
        fileName={downloadInfo.fileName}
        progress={downloadProgress}
        downloadedBytes={downloadInfo.downloadedBytes}
        totalBytes={downloadInfo.totalBytes}
        isPaused={isPaused}
        isMinimized={isDownloadModalMinimized}
        onMinimizeChange={setIsDownloadModalMinimized}
        onCancel={handleDownloadCancel}
        onPause={async () => {
          if (window.electronAPI && downloadInfo.fileName) {
            await window.electronAPI.pauseDownload(downloadInfo.fileName);
          }
        }}
        onResume={async () => {
          if (window.electronAPI && downloadInfo.fileName) {
            await window.electronAPI.resumeDownload(downloadInfo.fileName);
          }
        }}
        onComplete={(filePath) => {
          // Use stored file path from download result
          handleDownloadComplete(downloadInfo.filePath || filePath || '');
        }}
      />
    </>
  );
});

UpdateNotification.displayName = 'UpdateNotification';

export default UpdateNotification;

