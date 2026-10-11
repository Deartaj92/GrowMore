import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './TeacherLoader.css';

export interface LoaderProps {
  size?: 'small' | 'medium' | 'large';
  centered?: boolean;
  fullScreen?: boolean;
  fullScreenDark?: boolean;
  message?: string;
}

export const TeacherLoader: React.FC<LoaderProps> = ({
  size = 'medium',
  centered,
  fullScreen = true,
  fullScreenDark = false,
  message,
}) => {
  // If centered is explicitly provided, use it; otherwise default to fullScreen
  const isCentered = centered !== undefined ? centered : fullScreen;

  const base = import.meta.env.BASE_URL ? import.meta.env.BASE_URL.replace(/\/$/, '') : '';
  const primaryLogo = `${base}/patternLogo.png`;
  const fallbackLogo = `${base}/icon-192.png`;
  const finalFallbackLogo = `${base}/notification-icon.png`;

  const [logoSrc, setLogoSrc] = useState<string>(primaryLogo);

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
      try {
        const resolved = await preload(primaryLogo);
        if (!cancelled) setLogoSrc(resolved);
        return;
      } catch {}

      try {
        const resolved = await preload(fallbackLogo);
        if (!cancelled) setLogoSrc(resolved);
        return;
      } catch {}

      try {
        const resolved = await preload(finalFallbackLogo);
        if (!cancelled) setLogoSrc(resolved);
      } catch {
        if (!cancelled) setLogoSrc(primaryLogo);
      }
    };

    resolveLogo();

    return () => {
      cancelled = true;
    };
  }, [primaryLogo, fallbackLogo, finalFallbackLogo]);

  const content = (
    <div
      className={`styled-loader-wrapper ${isCentered ? 'centered' : ''} ${
        fullScreenDark ? 'dark-bg' : ''
      }`}
    >
      <div className="loader-content">
        <div className={`logo-loader ${size}`}>
          {logoSrc && (
            <>
              <img
                src={logoSrc}
                alt="Grow More"
                draggable={false}
                loading="eager"
                decoding="async"
              />
              <div
                className="shine"
                style={{
                  WebkitMaskImage: `url(${logoSrc})`,
                  maskImage: `url(${logoSrc})`,
                }}
              />
            </>
          )}
        </div>

        <div className={`loading-line ${fullScreenDark ? 'dark-bg' : ''}`}>
          <span className="track" />
          <span className="bar" />
        </div>

        {message && <p className="loader-msg">{message}</p>}
      </div>
    </div>
  );

  if (isCentered && typeof document !== 'undefined') {
    return ReactDOM.createPortal(content, document.body);
  }

  return content;
};

// Also export default and as Loader for identical usage as the main app
export const Loader = TeacherLoader;
export default TeacherLoader;
