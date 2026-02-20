import React from 'react';
import styled from 'styled-components';
import { 
  History, 
  Code, 
  Storage as Database, 
  CheckCircle,
  Warning
} from '@mui/icons-material';

const Container = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid ${({ theme }) => theme.BORDER};
  text-align: center;
  max-width: 800px;
  margin: 2rem auto;
`;

const Icon = styled.div`
  font-size: 4rem;
  color: ${({ theme }) => (theme as any).ACCENT};
  margin-bottom: 1rem;
`;

const Title = styled.h2`
  margin: 0 0 1rem 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.8rem;
  font-weight: 600;
`;

const Description = styled.p`
  margin: 0 0 2rem 0;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 1.1rem;
  line-height: 1.6;
`;

const StepsContainer = styled.div`
  text-align: left;
  margin: 2rem 0;
`;

const Step = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : '#f8f9fa'};
  border-radius: 8px;
  border-left: 4px solid ${({ theme }) => (theme as any).ACCENT};
`;

const StepIcon = styled.div`
  color: ${({ theme }) => (theme as any).ACCENT};
  font-size: 1.5rem;
  margin-top: 0.2rem;
`;

const StepContent = styled.div`
  flex: 1;
`;

const StepTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.1rem;
  font-weight: 600;
`;

const StepDescription = styled.p`
  margin: 0 0 0.5rem 0;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.95rem;
  line-height: 1.5;
`;

const CodeBlock = styled.pre`
  background: ${({ theme }) => theme.BG === '#252525' ? '#1a1a1a' : '#f1f3f4'};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 6px;
  padding: 1rem;
  margin: 0.5rem 0;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  overflow-x: auto;
  text-align: left;
`;

const WarningBox = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 1rem;
  margin: 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const WarningText = styled.div`
  color: #dc2626;
  font-weight: 500;
`;

const BenefitsList = styled.ul`
  text-align: left;
  margin: 1.5rem 0;
  padding-left: 1.5rem;
`;

const BenefitItem = styled.li`
  margin-bottom: 0.5rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  line-height: 1.5;
`;

const FeeAuditSetupInstructions: React.FC = () => {
  return (
    <Container>
      <Icon>
        <History />
      </Icon>
      
      <Title>Fee Audit System Setup Required</Title>
      
      <Description>
        The fee audit system tracks all changes to fee-related data, providing complete transparency and accountability. 
        To enable this feature, you need to set up the audit logging system in your database.
      </Description>

      <WarningBox>
        <Warning style={{ color: '#dc2626' }} />
        <WarningText>
          This setup requires database administrator access. Please contact your system administrator if you don't have the necessary permissions.
        </WarningText>
      </WarningBox>

      <StepsContainer>
        <Step>
          <StepIcon>
            <Database />
          </StepIcon>
          <StepContent>
            <StepTitle>1. Open Supabase SQL Editor</StepTitle>
            <StepDescription>
              Go to your Supabase dashboard and navigate to the SQL Editor section.
            </StepDescription>
          </StepContent>
        </Step>

        <Step>
          <StepIcon>
            <Code />
          </StepIcon>
          <StepContent>
            <StepTitle>2. Run the Setup Script</StepTitle>
            <StepDescription>
              Copy and paste the following SQL script into the SQL Editor and execute it:
            </StepDescription>
            <CodeBlock>
{`-- Copy the contents of setup_fee_audit_system.sql
-- and paste them into the Supabase SQL Editor
-- Then click "Run" to execute the script`}
            </CodeBlock>
          </StepContent>
        </Step>

        <Step>
          <StepIcon>
            <CheckCircle />
          </StepIcon>
          <StepContent>
            <StepTitle>3. Verify Setup</StepTitle>
            <StepDescription>
              After running the script, refresh this page. The audit logs should now be accessible.
            </StepDescription>
          </StepContent>
        </Step>
      </StepsContainer>

      <div>
        <h3 style={{ color: '#10b981', marginBottom: '1rem' }}>Benefits of Fee Audit Logging:</h3>
        <BenefitsList>
          <BenefitItem><strong>Complete Transparency:</strong> Track every change made to fee data</BenefitItem>
          <BenefitItem><strong>User Accountability:</strong> Know who made what changes and when</BenefitItem>
          <BenefitItem><strong>Compliance:</strong> Meet audit requirements for financial data</BenefitItem>
          <BenefitItem><strong>Debugging:</strong> Investigate fee calculation discrepancies</BenefitItem>
          <BenefitItem><strong>Security:</strong> Detect unauthorized fee modifications</BenefitItem>
        </BenefitsList>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #0ea5e9' }}>
        <p style={{ margin: 0, color: '#0c4a6e', fontSize: '0.9rem' }}>
          <strong>Need Help?</strong> The setup script is located in your project files as <code>setup_fee_audit_system.sql</code>. 
          Copy its contents and run them in your Supabase SQL Editor.
        </p>
      </div>
    </Container>
  );
};

export default FeeAuditSetupInstructions;
