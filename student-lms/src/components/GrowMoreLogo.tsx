import React from 'react';
import './GrowMoreLogo.css';

const LOGO_SRC = '/patternLogo.png';

export type GrowMoreLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_PX: Record<GrowMoreLogoSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
};

type GrowMoreLogoProps = {
  size?: GrowMoreLogoSize | number;
  className?: string;
  alt?: string;
  withGlow?: boolean;
};

export const GrowMoreLogo: React.FC<GrowMoreLogoProps> = ({
  size = 'md',
  className = '',
  alt = 'GrowMore',
  withGlow = false,
}) => {
  const px = typeof size === 'number' ? size : SIZE_PX[size];

  return (
    <span
      className={`growmore-logo ${withGlow ? 'growmore-logo--glow' : ''} ${className}`.trim()}
      style={{ width: px, height: px }}
    >
      <img
        src={LOGO_SRC}
        alt={alt}
        width={px}
        height={px}
        className="growmore-logo-img"
        draggable={false}
        decoding="async"
      />
    </span>
  );
};
