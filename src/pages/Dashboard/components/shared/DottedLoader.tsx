import React from 'react';
import styled, { keyframes } from 'styled-components';

const dotAnimation = keyframes`
  0%, 20% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
`;

const DotsContainer = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: inherit;
  font-weight: inherit;
`;

const Dot = styled.span<{ delay: number }>`
  width: 0.5em;
  height: 0.5em;
  border-radius: 50%;
  background-color: currentColor;
  animation: ${dotAnimation} 1.4s ease-in-out infinite;
  animation-delay: ${({ delay }) => delay}s;
`;

interface DottedLoaderProps {
  color?: string;
  size?: number;
}

const DottedLoader: React.FC<DottedLoaderProps> = ({ color, size = 1 }) => {
  return (
    <DotsContainer style={{ color, fontSize: `${size}em` }}>
      <Dot delay={0} />
      <Dot delay={0.2} />
      <Dot delay={0.4} />
    </DotsContainer>
  );
};

export default DottedLoader;

