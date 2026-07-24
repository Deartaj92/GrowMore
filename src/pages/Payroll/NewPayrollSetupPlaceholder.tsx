import React, { useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext, lightTheme, darkTheme } from '../../contexts/ThemeContext';
import {
  AccountBalanceWallet as WalletIcon,
  AddCircleOutline as AddIcon,
  ReceiptLong as ReceiptIcon,
  CheckCircleOutline as CheckIcon,
  Tune as SetupIcon,
} from '@mui/icons-material';

const Container = styled.div<{ theme: any }>`
  min-height: calc(100vh - 120px);
  padding: 2rem;
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const Card = styled.div<{ theme: any }>`
  max-width: 800px;
  width: 100%;
  background: ${({ theme }) =>
    theme.BG === '#252525'
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(255, 255, 255, 0.9)'};
  backdrop-filter: blur(12px);
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
  text-align: center;
`;

const IconHeader = styled.div<{ theme: any }>`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: ${({ theme }) => `${theme.ACCENT}15`};
  color: ${({ theme }) => theme.ACCENT};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem auto;
`;

const Title = styled.h1<{ theme: any }>`
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const Subtitle = styled.p<{ theme: any }>`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  max-width: 580px;
  margin: 0 auto 2rem auto;
  line-height: 1.6;
`;

const Badge = styled.span<{ theme: any }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.85rem;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 700;
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.25);
  margin-bottom: 1.25rem;
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
  margin-top: 1.5rem;
  text-align: left;
`;

const FeatureCard = styled.div<{ theme: any }>`
  padding: 1.25rem;
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.BG === '#252525'
      ? 'rgba(255, 255, 255, 0.02)'
      : 'rgba(248, 250, 252, 0.8)'};
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const FeatureTitle = styled.div<{ theme: any }>`
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.35rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const FeatureDesc = styled.div<{ theme: any }>`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  line-height: 1.45;
`;

const NewPayrollSetupPlaceholder: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  return (
    <Container theme={theme}>
      <Card theme={theme}>
        <IconHeader theme={theme}>
          <WalletIcon style={{ fontSize: 38 }} />
        </IconHeader>

        <Badge theme={theme}>
          <CheckIcon style={{ fontSize: 16 }} /> Legacy Tabs Cleaned Out & Reset
        </Badge>

        <Title theme={theme}>New Salary & Payroll Setup</Title>
        <Subtitle theme={theme}>
          The legacy multi-tab payroll system has been removed. We are ready to build a clean, accurate, and foolproof salary management workflow customized to your exact requirements.
        </Subtitle>

        <FeaturesGrid>
          <FeatureCard theme={theme}>
            <FeatureTitle theme={theme}>
              <ReceiptIcon style={{ fontSize: 18, color: theme.ACCENT }} />
              Clean Salary Slips
            </FeatureTitle>
            <FeatureDesc theme={theme}>
              Simplified monthly salary slip generation with clear earnings, attendance, and net payable totals.
            </FeatureDesc>
          </FeatureCard>

          <FeatureCard theme={theme}>
            <FeatureTitle theme={theme}>
              <SetupIcon style={{ fontSize: 18, color: '#10b981' }} />
              Simple Rules & Plans
            </FeatureTitle>
            <FeatureDesc theme={theme}>
              Straightforward basic pay structures without confusing nested adjustments or duplicate entries.
            </FeatureDesc>
          </FeatureCard>

          <FeatureCard theme={theme}>
            <FeatureTitle theme={theme}>
              <AddIcon style={{ fontSize: 18, color: '#f59e0b' }} />
              Direct Payment Ledger
            </FeatureTitle>
            <FeatureDesc theme={theme}>
              Easy-to-scan payment tracking per employee with receipts and clear balance histories.
            </FeatureDesc>
          </FeatureCard>
        </FeaturesGrid>
      </Card>
    </Container>
  );
};

export default NewPayrollSetupPlaceholder;
