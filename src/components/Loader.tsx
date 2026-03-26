import React from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';

interface LoaderProps {
  size?: 'small' | 'medium' | 'large';
  centered?: boolean;
  fullScreenDark?: boolean;
}

const Loader: React.FC<LoaderProps> = ({ size = 'medium', centered = true, fullScreenDark = false }) => {
  const primaryLogo = `${process.env.PUBLIC_URL || ''}/patternLogo.png`;
  const fallbackLogo = `${process.env.PUBLIC_URL || ''}/icon-192.png`;
  const finalFallbackLogo = `${process.env.PUBLIC_URL || ''}/notification-icon.png`;
  const [logoSrc, setLogoSrc] = React.useState(primaryLogo);

  React.useEffect(() => {
    setLogoSrc(primaryLogo);
  }, [primaryLogo]);

  React.useEffect(() => {
    const preloadLogo = new Image();
    preloadLogo.src = primaryLogo;
  }, [primaryLogo]);

  const content = (
    <StyledWrapper $centered={centered} $fullScreenDark={fullScreenDark}>
      <LoaderContent>
        <LogoLoader $size={size}>
          <img
            src={logoSrc}
            alt="Grow More"
            draggable={false}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onError={() => {
              if (logoSrc !== fallbackLogo) {
                setLogoSrc(fallbackLogo);
                return;
              }
              if (logoSrc !== finalFallbackLogo) {
                setLogoSrc(finalFallbackLogo);
              }
            }}
          />
          <div className="shine" style={{ WebkitMaskImage: `url(${logoSrc})`, maskImage: `url(${logoSrc})` }} />
        </LogoLoader>
        <LoadingLine $darkBg={fullScreenDark}>
          <span className="track" />
          <span className="bar" />
        </LoadingLine>
      </LoaderContent>
    </StyledWrapper>
  );

  if (centered && typeof document !== 'undefined') {
    return ReactDOM.createPortal(content, document.body);
  }

  return content;
};

const StyledWrapper = styled.div<{ $centered: boolean; $fullScreenDark?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${props => (props.$centered ? '100vw' : '100%')};
  height: ${props => (props.$centered ? '100dvh' : 'auto')};
  min-height: ${props => (props.$centered ? '100vh' : 'auto')};
  padding: ${props => (props.$centered ? '2rem' : '1rem')};
  ${props => props.$centered && `
    position: fixed;
    inset: 0;
    z-index: 9999;
  `}
  ${props => props.$fullScreenDark && `
    z-index: 99999;
    background: #252525;
    min-height: 100vh;
    min-height: 100dvh;
  `}
`;

const LoaderContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  transform: translateY(-16px);
`;

const LogoLoader = styled.div<{ $size: LoaderProps['size'] }>`
  position: relative;
  width: ${props => {
    switch (props.$size) {
      case 'small':
        return '104px';
      case 'large':
        return '208px';
      default:
        return '152px';
    }
  }};
  height: ${props => {
    switch (props.$size) {
      case 'small':
        return '104px';
      case 'large':
        return '208px';
      default:
        return '152px';
    }
  }};

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    filter: drop-shadow(0 16px 30px rgba(0, 0, 0, 0.28));
  }

  .shine {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: linear-gradient(
      120deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0) 36%,
      rgba(255, 255, 255, 0.92) 50%,
      rgba(255, 255, 255, 0) 64%,
      rgba(255, 255, 255, 0) 100%
    );
    background-size: 200% auto;
    background-position: 150% center;
    opacity: 0.95;
    -webkit-mask-image: url('/icon-192.png');
    mask-image: url('/icon-192.png');
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-position: center;
    mask-position: center;
    animation: logoShine 2.8s linear infinite;
  }

  @keyframes logoShine {
    0%,
    15% {
      background-position: 150% center;
    }
    55% {
      background-position: -50% center;
    }
    100% {
      background-position: -50% center;
    }
  }
`;

const LoadingLine = styled.div<{ $darkBg?: boolean }>`
  position: relative;
  width: 64px;
  height: 3px;
  margin-top: 2px;

  .track {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: ${props => (props.$darkBg ? 'rgba(255,255,255,0.14)' : 'rgba(51,65,85,0.14)')};
  }

  .bar {
    position: absolute;
    top: 0;
    left: 0;
    width: 22px;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 55%, #d97706 100%);
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.28);
    animation: loaderLine 1.2s ease-in-out infinite;
  }

  @keyframes loaderLine {
    0% {
      transform: translateX(0);
      opacity: 0.55;
    }
    50% {
      transform: translateX(42px);
      opacity: 1;
    }
    100% {
      transform: translateX(0);
      opacity: 0.55;
    }
  }
`;

export default Loader;
