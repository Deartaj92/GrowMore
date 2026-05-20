import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './GrowMoreLoader.css';

export type GrowMoreLoaderSize = 'small' | 'medium' | 'large';

type GrowMoreLoaderProps = {
  size?: GrowMoreLoaderSize;
  centered?: boolean;
  fullScreenDark?: boolean;
  message?: string;
};

const LOGO_CANDIDATES = ['/patternLogo.png', '/icon-192.png', '/notification-icon.png'];

const SIZE_PX: Record<GrowMoreLoaderSize, number> = {
  small: 104,
  medium: 152,
  large: 208,
};

export const GrowMoreLoader: React.FC<GrowMoreLoaderProps> = ({
  size = 'medium',
  centered = true,
  fullScreenDark = false,
  message,
}) => {
  const [logoSrc, setLogoSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const preload = (src: string) =>
      new Promise<string>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(src);
        image.onerror = () => reject(new Error(`Failed to load ${src}`));
        image.src = src;
      });

    const resolveLogo = async () => {
      setLogoSrc(null);
      for (const src of LOGO_CANDIDATES) {
        try {
          const resolved = await preload(src);
          if (!cancelled) setLogoSrc(resolved);
          return;
        } catch {
          /* try next */
        }
      }
    };

    resolveLogo();
    return () => {
      cancelled = true;
    };
  }, []);

  const content = (
    <div
      className={`gm-loader-wrap ${centered ? 'gm-loader-wrap--centered' : ''} ${
        fullScreenDark ? 'gm-loader-wrap--dark' : ''
      }`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="gm-loader-content">
        <div className="gm-loader-logo" style={{ width: SIZE_PX[size], height: SIZE_PX[size] }}>
          {logoSrc && (
            <>
              <img src={logoSrc} alt="GrowMore" draggable={false} decoding="async" />
              <div
                className="gm-loader-shine"
                style={{
                  WebkitMaskImage: `url(${logoSrc})`,
                  maskImage: `url(${logoSrc})`,
                }}
              />
            </>
          )}
        </div>
        <div className={`gm-loader-line ${fullScreenDark ? 'gm-loader-line--dark' : ''}`}>
          <span className="track" />
          <span className="bar" />
        </div>
        {message && <p className="gm-loader-message">{message}</p>}
      </div>
    </div>
  );

  if (centered && typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
};

/** Full-page loader for route data (inside layout content area). */
export const PageLoader: React.FC<{ message?: string }> = ({ message }) => (
  <div className="page-loader-shell">
    <GrowMoreLoader size="medium" centered={false} message={message} />
  </div>
);
