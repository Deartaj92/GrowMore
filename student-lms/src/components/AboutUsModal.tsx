import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './AboutUsModal.css';

type AboutUsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const ABOUT_IMAGE = '/aboutus.png';

export const AboutUsModal: React.FC<AboutUsModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    const fallbacks = ['./aboutus.png', '/aboutus.png', 'aboutus.png'];
    const currentIndex = fallbacks.findIndex((path) => target.src.includes(path));
    const nextIndex = (currentIndex + 1) % fallbacks.length;
    target.src = fallbacks[nextIndex];
  };

  return createPortal(
    <div
      className="about-us-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-us-title"
    >
      <div className="about-us-content">
        <button
          type="button"
          className="about-us-close"
          onClick={onClose}
          aria-label="Close about GrowMore"
        >
          ×
        </button>

        <div className="about-us-pattern" aria-hidden />

        <div className="about-us-image-section">
          <img
            className="about-us-image"
            src={ABOUT_IMAGE}
            alt="About Grow More — School Management System"
            onError={handleImageError}
          />
        </div>

        <div className="about-us-text-section">
          <div className="about-us-brand">
            <h2 id="about-us-title" className="about-us-brand-title">
              GROW MORE
            </h2>
            <p className="about-us-brand-subtitle">School Management System</p>
          </div>

          <div className="about-us-contact">
            <div className="about-us-contact-name">TAJ ALI KHAN</div>
            <div className="about-us-contact-title">Founder &amp; CEO</div>
            <div className="about-us-contact-phone">0313-9794635</div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
