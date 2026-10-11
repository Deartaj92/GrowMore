import React from 'react';
import './GrowMoreLogo.css';

const LOGO_SRC = '/patternLogo.png';

export type GrowMoreLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_PX: Record<GrowMoreLogoSize, number> = {
  xs: 28,
  sm: 36,
  md: 46,
  lg: 64,
  xl: 84,
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
  withGlow = true,
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
