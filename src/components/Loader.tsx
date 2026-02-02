import React from 'react';
import styled from 'styled-components';

interface LoaderProps {
  size?: 'small' | 'medium' | 'large';
  centered?: boolean;
  /** Full-screen splash style with dark background */
  fullScreenDark?: boolean;
}

const Loader: React.FC<LoaderProps> = ({ size = 'medium', centered = true, fullScreenDark = false }) => {
  return (
    <StyledWrapper $centered={centered} $size={size} $fullScreenDark={fullScreenDark}>
      <LoaderContent $size={size}>
        <div className="book">
          <div className="book__pg-shadow" />
          <div className="book__pg" />
          <div className="book__pg book__pg--2" />
          <div className="book__pg book__pg--3" />
          <div className="book__pg book__pg--4" />
          <div className="book__pg book__pg--5" />
        </div>
        <LoadingText $darkBg={fullScreenDark}>
          Loading
          <DotsContainer>
            <Dot $delay={0}>.</Dot>
            <Dot $delay={0.2}>.</Dot>
            <Dot $delay={0.4}>.</Dot>
          </DotsContainer>
        </LoadingText>
      </LoaderContent>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div<{ $centered: boolean; $size: string; $fullScreenDark?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: ${props => props.$centered ? '100%' : 'auto'};
  min-height: ${props => props.$centered ? '60vh' : 'auto'};
  padding: ${props => props.$centered ? '2rem' : '1rem'};
  ${props => props.$fullScreenDark && `
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: #252525;
    min-height: 100vh;
    min-height: 100dvh;
  `}
`;

const LoaderContent = styled.div<{ $size: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  .book,
  .book__pg-shadow,
  .book__pg {
    animation: cover 5s ease-in-out infinite;
  }
  .book {
    background-color: hsl(235, 85.40%, 59.60%);
    border-radius: 0.25em;
    box-shadow:
      0 0.25em 0.5em hsla(0, 0%, 0%, 0.3),
      0 0 0 0.25em hsl(235, 85.40%, 59.60%) inset;
    padding: 0.25em;
    perspective: 37.5em;
    position: relative;
    width: 8em;
    height: 6em;
    transform: scale(${props => {
      switch (props.$size) {
        case 'small': return '0.7';
        case 'large': return '1.2';
        default: return '0.85'; // Slightly smaller than original
      }
    }}) translate3d(0, 0, 0);
    transform-style: preserve-3d;
  }
  .book__pg-shadow,
  .book__pg {
    position: absolute;
    left: 0.25em;
    width: calc(50% - 0.25em);
  }
  .book__pg-shadow {
    animation-name: shadow;
    background-image: linear-gradient(
      -45deg,
      hsla(0, 0%, 0%, 0) 50%,
      hsla(0, 0%, 0%, 0.3) 50%
    );
    filter: blur(0.25em);
    top: calc(100% - 0.25em);
    height: 3.75em;
    transform: scaleY(0);
    transform-origin: 100% 0%;
  }
  .book__pg {
    animation-name: pg1;
    background-color: hsl(223, 10%, 100%);
    background-image: linear-gradient(
      90deg,
      hsla(223, 10%, 90%, 0) 87.5%,
      hsl(223, 10%, 90%)
    );
    background-size: 100% 100%;
    background-position: center;
    background-repeat: no-repeat;
    height: calc(100% - 0.5em);
    transform-origin: 100% 50%;
  }
  .book__pg--2,
  .book__pg--3,
  .book__pg--4 {
    background-image: repeating-linear-gradient(
        hsl(223, 10%, 10%) 0 0.125em,
        hsla(223, 10%, 10%, 0) 0.125em 0.5em
      ),
      linear-gradient(90deg, hsla(223, 10%, 90%, 0) 87.5%, hsl(223, 10%, 90%));
    background-repeat: no-repeat;
    background-position: center;
    background-size:
      2.5em 4.125em,
      100% 100%;
  }
  .book__pg--2 {
    animation-name: pg2;
  }
  .book__pg--3 {
    animation-name: pg3;
  }
  .book__pg--4 {
    animation-name: pg4;
  }
  .book__pg--5 {
    animation-name: pg5;
    background-color: hsl(223, 10%, 100%);
    background-image: linear-gradient(
      90deg,
      hsla(223, 10%, 90%, 0) 87.5%,
      hsl(223, 10%, 90%)
    );
    background-size: 100% 100%;
    background-position: center;
    background-repeat: no-repeat;
    height: calc(100% - 0.5em);
    transform-origin: 100% 50%;
  }

  /* Dark theme */
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: hsl(223, 10%, 30%);
      --fg: hsl(223, 10%, 90%);
    }
  }

  /* Animations */
  @keyframes cover {
    from,
    5%,
    45%,
    55%,
    95%,
    to {
      animation-timing-function: ease-out;
      background-color: hsl(235, 85.40%, 59.60%);
    }
    10%,
    40%,
    60%,
    90% {
      animation-timing-function: ease-in;
      background-color: hsl(235, 85.40%, 59.60%);
    }
  }
  @keyframes shadow {
    from,
    10.01%,
    20.01%,
    30.01%,
    40.01% {
      animation-timing-function: ease-in;
      transform: translate3d(0, 0, 1px) scaleY(0) rotateY(0);
    }
    5%,
    15%,
    25%,
    35%,
    45%,
    55%,
    65%,
    75%,
    85%,
    95% {
      animation-timing-function: ease-out;
      transform: translate3d(0, 0, 1px) scaleY(0.2) rotateY(90deg);
    }
    10%,
    20%,
    30%,
    40%,
    50%,
    to {
      animation-timing-function: ease-out;
      transform: translate3d(0, 0, 1px) scaleY(0) rotateY(180deg);
    }
    50.01%,
    60.01%,
    70.01%,
    80.01%,
    90.01% {
      animation-timing-function: ease-in;
      transform: translate3d(0, 0, 1px) scaleY(0) rotateY(180deg);
    }
    60%,
    70%,
    80%,
    90%,
    to {
      animation-timing-function: ease-out;
      transform: translate3d(0, 0, 1px) scaleY(0) rotateY(0);
    }
  }
  @keyframes pg1 {
    from,
    to {
      animation-timing-function: ease-in-out;
      background-color: hsl(223, 10%, 100%);
      transform: translate3d(0, 0, 1px) rotateY(0.4deg);
    }
    10%,
    15% {
      animation-timing-function: ease-out;
      background-color: hsl(223, 10%, 100%);
      transform: translate3d(0, 0, 1px) rotateY(180deg);
    }
    20%,
    80% {
      animation-timing-function: ease-in;
      background-color: hsl(223, 10%, 45%);
      transform: translate3d(0, 0, 1px) rotateY(180deg);
    }
    85%,
    90% {
      animation-timing-function: ease-in-out;
      background-color: hsl(223, 10%, 100%);
      transform: translate3d(0, 0, 1px) rotateY(180deg);
    }
  }
  @keyframes pg2 {
    from,
    to {
      animation-timing-function: ease-in;
      background-color: hsl(223, 10%, 45%);
      transform: translate3d(0, 0, 1px) rotateY(0.3deg);
    }
    5%,
    10% {
      animation-timing-function: ease-in-out;
      background-color: hsl(223, 10%, 100%);
      transform: translate3d(0, 0, 1px) rotateY(0.3deg);
    }
    20%,
    25% {
      animation-timing-function: ease-out;
      background-color: hsl(223, 10%, 100%);
      transform: translate3d(0, 0, 1px) rotateY(179.9deg);
    }
    30%,
    70% {
      animation-timing-function: ease-in;
      background-color: hsl(223, 10%, 45%);
      transform: translate3d(0, 0, 1px) rotateY(179.9deg);
    }
    75%,
    80% {
      animation-timing-function: ease-in-out;
      background-color: hsl(223, 10%, 100%);
      transform: translate3d(0, 0, 1px) rotateY(179.9deg);
    }
    90%,
    95% {
      animation-timing-function: ease-out;
      background-color: hsl(223, 10%, 100%);
      transform: translate3d(0, 0, 1px) rotateY(0.3deg);
    }
  }
  @keyframes pg3 {
    from,
    10%,
    90%,
    to {
      animation-timing-function: ease-in;
      background-color: hsl(223, 10%, 45%);
      transform: translate3d(0, 0, 1px) rotateY(0.2deg);
    }
    15%,
    20% {
      animation-timing-function: ease-in-out;
      background-color: hsl(223, 10%, 100%);
      transform: translate3d(0, 0, 1px) rotateY(0.2deg);
    }
    30%,
    35% {
      animation-timing-function: ease-out;
      background-color: hsl(223, 10%, 100%);
      transform: translate3d(0, 0, 1px) rotateY(179.8deg);
    }
    40%,
    60% {
      animation-timing-function: ease-in;
      background-color: hsl(223, 10%, 45%);
      transform: translate3d(0, 0, 1px) rotateY(179.8deg);
    }
    65%,
    70% {
      animation-timing-function: ease-in-out;
      background-color: hsl(223, 10%, 100%);
      transform: translate3d(0, 0, 1px) rotateY(179.8deg);
    }
    80%,
    85% {
      animation-timing-function: ease-out;
      background-color: hsl(223, 10%, 100%);
      transform: translate3d(0, 0, 1px) rotateY(0.2deg);
    }
  }
  @keyframes pg4 {
    from,
    20%,
    80%,
    to {
      animation-timing-function: ease-in;
      background-color: hsl(223, 10%, 45%);
      transform: translate3d(0, 0, 1px) rotateY(0.1deg);
    }
    25%,
    30% {
      animation-timing-function: ease-in-out;
      background-color: hsl(223, 10%, 100%);
      transform: translate3d(0, 0, 1px) rotateY(0.1deg);
    }
    40%,
    45% {
      animation-timing-function: ease-out;
      background-color: hsl(223, 10%, 100%);
      transform: translate3d(0, 0, 1px) rotateY(179.7deg);
    }
    50% {
      animation-timing-function: ease-in;
      background-color: hsl(223, 10%, 45%);
      transform: translate3d(0, 0, 1px) rotateY(179.7deg);
    }
    55%,
    60% {
      animation-timing-function: ease-in-out;
      background-color: hsl(223, 10%, 100%);
      transform: translate3d(0, 0, 1px) rotateY(179.7deg);
    }
    70%,
    75% {
      animation-timing-function: ease-out;
      background-color: hsl(223, 10%, 100%);
      transform: translate3d(0, 0, 1px) rotateY(0.1deg);
    }
  }
  @keyframes pg5 {
    from,
    30%,
    70%,
    to {
      animation-timing-function: ease-in;
      background-color: hsl(223, 10%, 45%);
      transform: translate3d(0, 0, 1px) rotateY(0);
    }
    35%,
    40% {
      animation-timing-function: ease-in-out;
      background-color: hsl(223, 10%, 100%);
      transform: translate3d(0, 0, 1px) rotateY(0deg);
    }
    50% {
      animation-timing-function: ease-in-out;
      background-color: hsl(223, 10%, 100%);
      transform: translate3d(0, 0, 1px) rotateY(179.6deg);
    }
    60%,
    65% {
      animation-timing-function: ease-out;
      background-color: hsl(223, 10%, 100%);
      transform: translate3d(0, 0, 1px) rotateY(0);
    }
  }
`;

const LoadingText = styled.div<{ $darkBg?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  color: ${props => props.$darkBg ? 'hsl(223, 10%, 75%)' : 'hsl(223, 10%, 50%)'};
  font-weight: 500;
  letter-spacing: 0.5px;
  
  @media (prefers-color-scheme: dark) {
    color: ${props => props.$darkBg ? 'hsl(223, 10%, 85%)' : 'hsl(223, 10%, 80%)'};
  }
`;

const DotsContainer = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 0.3rem;
  width: 1.8rem;
  justify-content: flex-start;
`;

const Dot = styled.span<{ $delay: number }>`
  opacity: 0;
  font-size: 1.2rem;
  line-height: 1;
  animation: dotPulse 1.4s ease-in-out infinite;
  animation-delay: ${props => props.$delay}s;
  
  @keyframes dotPulse {
    0%, 20% {
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
`;

export default Loader;
