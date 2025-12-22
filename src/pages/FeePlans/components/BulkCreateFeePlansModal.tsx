import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import styled, { ThemeProvider } from 'styled-components';
import { ThemeContext, darkTheme, lightTheme } from '../../../components/Layout';
import { Close as CloseIcon, PlaylistAdd as BulkAddIcon, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ModalContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.BORDER};
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
  animation: slideUp 0.3s cubic-bezier(0.2, 0.9, 0.4, 1);
  overflow: hidden;

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
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)'};
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.25rem;
  font-weight: 700;
`;

const HeaderIcon = styled.div`
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, ${({ theme }) => theme.ACCENT}, ${({ theme }) => theme.ACCENT}dd);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

const InfoSection = styled.div`
  margin-bottom: 24px;
`;

const InfoTitle = styled.h3`
  margin: 0 0 12px 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1rem;
  font-weight: 600;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
`;

const InfoItem = styled.div`
  padding: 12px;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const InfoLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
`;

const InfoValue = styled.div`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 700;
`;

const ProgressSection = styled.div`
  margin-bottom: 24px;
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const ProgressLabel = styled.span`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const ProgressPercent = styled.span`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-weight: 700;
`;

const EstimatedTime = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 4px;
  text-align: right;
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 12px;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  margin-bottom: 12px;
`;

const ProgressBarFill = styled.div<{ progress: number }>`
  width: ${props => props.progress}%;
  height: 100%;
  background: linear-gradient(90deg, ${({ theme }) => theme.ACCENT}, ${({ theme }) => theme.ACCENT}dd);
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

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`;

const StatItem = styled.div<{ type?: 'success' | 'error' | 'pending' }>`
  padding: 12px;
  background: ${({ theme, type }) => {
    if (type === 'success') return theme.BG === '#252525' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)';
    if (type === 'error') return theme.BG === '#252525' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)';
    return theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)';
  }};
  border-radius: 8px;
  border: 1px solid ${({ theme, type }) => {
    if (type === 'success') return 'rgba(16, 185, 129, 0.3)';
    if (type === 'error') return 'rgba(239, 68, 68, 0.3)';
    return theme.BORDER;
  }};
  text-align: center;
`;

const StatValue = styled.div<{ type?: 'success' | 'error' | 'pending' }>`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ type }) => {
    if (type === 'success') return '#10b981';
    if (type === 'error') return '#ef4444';
    return 'inherit';
  }};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
`;

const StatusMessage = styled.div<{ type?: 'success' | 'error' | 'info' }>`
  padding: 12px 16px;
  border-radius: 8px;
  background: ${({ theme, type }) => {
    if (type === 'success') return theme.BG === '#252525' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)';
    if (type === 'error') return theme.BG === '#252525' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)';
    return theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)';
  }};
  border: 1px solid ${({ theme, type }) => {
    if (type === 'success') return 'rgba(16, 185, 129, 0.3)';
    if (type === 'error') return 'rgba(239, 68, 68, 0.3)';
    return theme.BORDER;
  }};
  color: ${({ theme, type }) => {
    if (type === 'success') return '#10b981';
    if (type === 'error') return '#ef4444';
    return theme.TEXT_PRIMARY;
  }};
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  margin-top: 16px;
`;

const ModalFooter = styled.div`
  padding: 20px 24px;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)'};
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;
  
  ${({ variant, theme }) => {
    if (variant === 'primary') {
      return `
        background: ${theme.ACCENT};
        color: white;
        
        &:hover:not(:disabled) {
          background: ${theme.ACCENT}dd;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px ${theme.ACCENT}40;
        }
        
        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
      `;
    } else {
      return `
        background: ${theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
        color: ${theme.TEXT_PRIMARY};
        border: 1px solid ${theme.BORDER};
        
        &:hover:not(:disabled) {
          background: ${theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'};
        }
        
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `;
    }
  }}
`;

interface BulkCreateFeePlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (onProgress?: (progress: number, step: string, success: number, errors: number, estimatedTime?: number) => void) => Promise<{ successCount: number; errorCount: number }>;
  totalStudents: number;
  studentsNeedingPlans: number;
  sessionName: string;
}

export const BulkCreateFeePlansModal: React.FC<BulkCreateFeePlansModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  totalStudents,
  studentsNeedingPlans,
  sessionName
}) => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setIsProcessing(false);
      setProgress(0);
      setCurrentStep('');
      setSuccessCount(0);
      setErrorCount(0);
      setIsComplete(false);
      setEstimatedTime(undefined);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    setIsProcessing(true);
    setProgress(0);
    setSuccessCount(0);
    setErrorCount(0);
    setIsComplete(false);
    setCurrentStep('Initializing...');
    
    try {
      const result = await onConfirm((progressValue: number, step: string, success: number, errors: number, estTime?: number) => {
        setProgress(progressValue);
        setCurrentStep(step);
        setSuccessCount(success);
        setErrorCount(errors);
        setEstimatedTime(estTime);
      });
      
      // Update final counts
      setSuccessCount(result.successCount);
      setErrorCount(result.errorCount);
      setIsComplete(true);
      setProgress(100);
      setCurrentStep('Completed');
    } catch (error: any) {
      console.error('Bulk create error:', error);
      setIsComplete(true);
      setCurrentStep('Error occurred');
      if (error.message) {
        setCurrentStep(`Error: ${error.message}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return 'Calculating...';
    
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}m ${secs}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <ThemeProvider theme={theme}>
      <ModalOverlay onClick={(e) => {
        if (!isProcessing && e.target === e.currentTarget) {
          onClose();
        }
      }}>
        <ModalContainer onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            <HeaderTitle>
              <HeaderIcon>
                <BulkAddIcon style={{ fontSize: '24px' }} />
              </HeaderIcon>
              Bulk Create Fee Plans
            </HeaderTitle>
            {!isProcessing && (
              <CloseButton onClick={onClose}>
                <CloseIcon style={{ fontSize: '20px' }} />
              </CloseButton>
            )}
          </ModalHeader>

          <ModalBody>
            {!isProcessing && !isComplete && (
              <>
                <InfoSection>
                  <InfoTitle>Summary</InfoTitle>
                  <InfoGrid>
                    <InfoItem>
                      <InfoLabel>Session</InfoLabel>
                      <InfoValue>{sessionName}</InfoValue>
                    </InfoItem>
                    <InfoItem>
                      <InfoLabel>Total Students</InfoLabel>
                      <InfoValue>{totalStudents}</InfoValue>
                    </InfoItem>
                    <InfoItem>
                      <InfoLabel>Students Needing Plans</InfoLabel>
                      <InfoValue>{studentsNeedingPlans}</InfoValue>
                    </InfoItem>
                    <InfoItem>
                      <InfoLabel>Already Have Plans</InfoLabel>
                      <InfoValue>{totalStudents - studentsNeedingPlans}</InfoValue>
                    </InfoItem>
                  </InfoGrid>
                </InfoSection>

                <StatusMessage type="info">
                  This will create fee plans for {studentsNeedingPlans} students who don't have a plan yet.
                  Only fee heads relevant to each student's class will be added.
                </StatusMessage>
              </>
            )}

            {(isProcessing || isComplete) && (
              <>
                <ProgressSection>
                  <ProgressHeader>
                    <ProgressLabel>{isComplete ? 'Completed' : currentStep || 'Processing...'}</ProgressLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <ProgressPercent>{progress.toFixed(2)}%</ProgressPercent>
                      {estimatedTime !== undefined && estimatedTime > 0 && !isComplete && (
                        <EstimatedTime>
                          Est. {formatTime(estimatedTime)}
                        </EstimatedTime>
                      )}
                    </div>
                  </ProgressHeader>
                  <ProgressBarContainer>
                    <ProgressBarFill progress={progress} />
                  </ProgressBarContainer>
                </ProgressSection>

                <StatsGrid>
                  <StatItem type="success">
                    <StatValue type="success">{successCount}</StatValue>
                    <StatLabel>Created</StatLabel>
                  </StatItem>
                  <StatItem type="error">
                    <StatValue type="error">{errorCount}</StatValue>
                    <StatLabel>Errors</StatLabel>
                  </StatItem>
                  <StatItem type="pending">
                    <StatValue>{Math.max(0, studentsNeedingPlans - successCount - errorCount)}</StatValue>
                    <StatLabel>Remaining</StatLabel>
                  </StatItem>
                </StatsGrid>

                {isComplete && (
                  <StatusMessage type={successCount > 0 ? 'success' : 'error'}>
                    {successCount > 0 ? (
                      <>
                        <CheckCircle style={{ fontSize: '20px' }} />
                        Bulk creation completed successfully! {successCount} fee plans created.
                        {errorCount > 0 && ` ${errorCount} errors occurred.`}
                      </>
                    ) : (
                      <>
                        <ErrorIcon style={{ fontSize: '20px' }} />
                        Bulk creation failed. Please try again.
                      </>
                    )}
                  </StatusMessage>
                )}
              </>
            )}
          </ModalBody>

          <ModalFooter>
            {!isProcessing && !isComplete && (
              <>
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleConfirm}>
                  <BulkAddIcon style={{ fontSize: '18px' }} />
                  Start Bulk Create
                </Button>
              </>
            )}
            {isComplete && (
              <Button variant="primary" onClick={onClose}>
                Close
              </Button>
            )}
          </ModalFooter>
        </ModalContainer>
      </ModalOverlay>
    </ThemeProvider>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
