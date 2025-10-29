import React from 'react';
import styled from 'styled-components';
import FeeAuditLogs from '../components/FeeAuditLogs';

const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 1rem;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  min-height: 100vh;
`;

const FeeAuditLogsPage: React.FC = () => {
  return (
    <PageContainer>
      <FeeAuditLogs />
    </PageContainer>
  );
};

export default FeeAuditLogsPage;

