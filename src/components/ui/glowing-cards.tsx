import React, { useEffect, useRef, useState } from 'react';

// Minimal cn utility
function cn(...classes: Array<string | undefined | false | null>): string {
  return classes.filter(Boolean).join(' ');
}

export interface GlowingCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  hoverEffect?: boolean;
}

export interface GlowingCardsProps {
  children: React.ReactNode;
  className?: string;
  enableGlow?: boolean;
  glowRadius?: number;
  glowOpacity?: number;
  animationDuration?: number;
  enableHover?: boolean;
  gap?: string;
  maxWidth?: string;
  padding?: string;
  backgroundColor?: string;
  borderRadius?: string;
  responsive?: boolean;
  customTheme?: {
    cardBg?: string;
    cardBorder?: string;
    textColor?: string;
    hoverBg?: string;
  };
}

export const GlowingCard: React.FC<GlowingCardProps> = ({
  children,
  className,
  glowColor = '#3b82f6',
  hoverEffect = true,
  ...props
}) => {
  return (
    <div
      className={cn(
        'relative flex-1 min-w-[14rem] p-0 rounded-2xl',
        'transition-all duration-400 ease-out',
        className
      )}
      style={{
        // CSS var used by overlay clone
        ['--glow-color' as any]: glowColor,
      } as React.CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
};

export const GlowingCards: React.FC<GlowingCardsProps> = ({
  children,
  className,
  enableGlow = true,
  glowRadius = 25,
  glowOpacity = 1,
  animationDuration = 400,
  enableHover = true,
  gap = '1rem',
  maxWidth = '100%',
  padding = '0',
  backgroundColor,
  borderRadius = '0.75rem',
  responsive = true,
  customTheme,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const overlay = overlayRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (overlay) {
        overlay.style.setProperty('--x', x + 'px');
        overlay.style.setProperty('--y', y + 'px');
        overlay.style.setProperty('--opacity', String(glowOpacity));
      }
      // Also expose to descendants for per-card borders
      container.style.setProperty('--x', x + 'px');
      container.style.setProperty('--y', y + 'px');
      // Global fallback for deep descendants
      document.documentElement.style.setProperty('--x', x + 'px');
      document.documentElement.style.setProperty('--y', y + 'px');
      setShowOverlay(true);
    };
    const handleMouseLeave = () => {
      setShowOverlay(false);
      if (overlay) overlay.style.setProperty('--opacity', '0');
    };
    // Initialize to container center so borders are visible immediately
    const init = () => {
      const rect = container.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      container.style.setProperty('--x', cx + 'px');
      container.style.setProperty('--y', cy + 'px');
      document.documentElement.style.setProperty('--x', cx + 'px');
      document.documentElement.style.setProperty('--y', cy + 'px');
    };
    init();
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [enableGlow, glowOpacity]);

  const containerStyle = {
    ['--gap' as any]: gap,
    ['--max-width' as any]: maxWidth,
    ['--padding' as any]: padding,
    ['--border-radius' as any]: borderRadius,
    ['--animation-duration' as any]: animationDuration + 'ms',
    ['--glow-radius' as any]: glowRadius + 'rem',
    ['--glow-opacity' as any]: glowOpacity,
    backgroundColor: backgroundColor || undefined,
    ...customTheme,
  } as React.CSSProperties;

  return (
    <div className={cn('relative w-full', className)} style={containerStyle}>
      <div
        ref={containerRef}
        className={cn('relative max-w-[var(--max-width)] mx-auto')}
        style={{ padding: 'var(--padding)' }}
      >
        <div
          className={cn(
            'flex items-stretch justify-start flex-wrap gap-[var(--gap)]',
            responsive && 'flex-row'
          )}
        >
          {children}
        </div>

        {enableGlow && (
          <div
            ref={overlayRef}
            className={cn(
              'absolute inset-0 pointer-events-none select-none',
              'opacity-0 transition-all duration-[var(--animation-duration)] ease-out'
            )}
            style={{
              WebkitMask:
                'radial-gradient(var(--glow-radius) var(--glow-radius) at var(--x, 0) var(--y, 0), #000 1%, transparent 50%)',
              mask:
                'radial-gradient(var(--glow-radius) var(--glow-radius) at var(--x, 0) var(--y, 0), #000 1%, transparent 50%)',
              opacity: showOverlay ? 'var(--opacity)' : '0',
            }}
          >
            <div
              className={cn(
                'flex items-stretch justify-start flex-wrap gap-[var(--gap)] max-w-[var(--max-width)] mx-auto'
              )}
              style={{ padding: 'var(--padding)' }}
            >
              {React.Children.map(children, (child) => {
                // Render gradient border placeholders matching each card's footprint
                if (React.isValidElement(child) && child.type === GlowingCard) {
                  const cardGlowColor = (child.props as any).glowColor || '#3b82f6';
                  return (
                    <div
                      className={cn('relative rounded-2xl', (child.props as any).className)}
                      style={{
                        borderRadius: 'var(--border-radius)',
                        position: 'relative',
                      }}
                    >
                      <div
                        className="absolute inset-0 rounded-2xl"
                        style={{
                          padding: '1px',
                          borderRadius: 'calc(var(--border-radius) + 1px)',
                          background:
                            `radial-gradient(140px 140px at var(--x, -100px) var(--y, -100px), ${cardGlowColor} 0%, ${cardGlowColor}99 25%, ${cardGlowColor}44 45%, transparent 60%),` +
                            'linear-gradient(90deg, #22d3ee, #a78bfa, #f472b6)',
                          WebkitMask:
                            'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                          WebkitMaskComposite: 'xor' as any,
                          maskComposite: 'exclude' as any,
                          opacity: 1,
                        }}
                      />
                    </div>
                  );
                }
                // Fallback placeholder for non GlowingCard children
                return <div className="relative rounded-2xl" style={{ borderRadius: 'var(--border-radius)' }} />;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlowingCards;


