import React from 'react';
import styled from 'styled-components';
import { useContext } from 'react';
import { ThemeContext, darkTheme, lightTheme } from '../contexts/ThemeContext';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
`;

const ModalContent = styled.div`
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  width: 900px;
  height: 400px;
  background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
  border-radius: 20px;
  overflow: visible;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: row;
  position: relative;
  
  @media (max-width: 768px) {
    width: 95vw;
    max-width: 500px;
    height: auto;
    min-height: 250px;
    flex-direction: row;
    border-radius: 16px;
  }
`;

const PatternBackground = styled.div`
  position: absolute;
  bottom: -100px;
  right: -50px;
  width: 400px;
  height: 400px;
  z-index: 0;
  pointer-events: none;
  opacity: 0.22;
  background-image: url('${process.env.PUBLIC_URL || ''}/patternLogo.png');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  mix-blend-mode: overlay;
  
  @media (max-width: 768px) {
    width: 250px;
    height: 250px;
    bottom: -60px;
    right: -30px;
    opacity: 0.18;
  }
`;

const ContentSection = styled.div`
  flex: 1;
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: relative;
  color: white;
  z-index: 1;
  
  @media (max-width: 768px) {
    padding: 20px 15px;
    min-height: 200px;
    justify-content: flex-end;
  }
`;

const BrandSection = styled.div`
  position: absolute;
  top: 40px;
  right: 40px;
  z-index: 5;
  text-align: right;
  
  @media (max-width: 768px) {
    top: 15px;
    right: 15px;
  }
`;

const BrandTitle = styled.div`
  font-size: 3.5rem;
  font-weight: 900;
  line-height: 1;
  margin-bottom: 5px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  position: relative;
  background: linear-gradient(
    90deg,
    #ffffff 0%,
    #ffffff 25%,
    #ffc107 50%,
    #ffffff 75%,
    #ffffff 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: titleShine 3s ease-in-out infinite;
  
  @keyframes titleShine {
    0%, 100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }
  
  @media (max-width: 768px) {
    font-size: 1.8rem;
    white-space: nowrap;
  }
`;

const BrandSubtitle = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
  color: #ffffff;
  opacity: 0.8;
  margin-top: 5px;
  
  @media (max-width: 768px) {
    font-size: 0.7rem;
    white-space: nowrap;
  }
`;

const ContactSection = styled.div`
  position: absolute;
  bottom: 40px;
  right: 40px;
  font-weight: 600;
  text-align: right;
  
  @media (max-width: 768px) {
    bottom: 15px;
    right: 15px;
  }
`;

const ContactName = styled.div`
  font-size: 1.4rem;
  font-weight: 800;
  margin-bottom: 2px;
  color: #ffc107;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  
  @media (max-width: 768px) {
    font-size: 1rem;
    white-space: nowrap;
    margin-bottom: 1px;
  }
`;

const ContactTitle = styled.div`
  font-size: 1rem;
  margin-bottom: 4px;
  color: #ffffff;
  opacity: 0.9;
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
    margin-bottom: 2px;
    white-space: nowrap;
  }
`;

const ContactPhone = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: #ffffff;
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
    white-space: nowrap;
  }
`;

const ImageSection = styled.div`
  flex: 0 0 450px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  position: relative;
  overflow: visible;
  padding-top: 0;
  border-radius: 20px 0 0 20px;
  z-index: 1;
  
  @media (max-width: 768px) {
    flex: 0 0 250px;
    min-height: 200px;
    align-items: flex-end;
    padding-top: 0;
    border-radius: 16px 0 0 16px;
  }
`;

const AboutImage = styled.img`
  width: 80%;
  height: 120%;
  object-fit: cover;
  display: block;
  image-rendering: high-quality;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  image-rendering: pixelated;
  image-rendering: auto;
  -ms-interpolation-mode: bicubic;
  -webkit-backface-visibility: hidden;
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
  margin-top: -25%;
  margin-right: auto;
  object-position: bottom;
  border-radius: 0 0 0 20px;
  filter: contrast(1.1) brightness(0.95) saturate(1.05);
  -webkit-filter: contrast(1.1) brightness(0.95) saturate(1.05);
  
  @media (max-width: 768px) {
    width: 95%;
    height: 130%;
    margin-top: -20%;
    border-radius: 0 0 0 16px;
  }
`;

interface AboutUsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutUsModal: React.FC<AboutUsModalProps> = ({ isOpen, onClose }) => {
  const { theme } = useContext(ThemeContext);
  const themeObj = theme === 'dark' ? darkTheme : lightTheme;
  const [isZoomed, setIsZoomed] = React.useState(false);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleImageClick = () => {
    setIsZoomed(!isZoomed);
  };

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent>
        <PatternBackground />
        <ImageSection>
          <AboutImage 
            src={`${process.env.PUBLIC_URL || ''}/aboutus.png`} 
            alt="About Grow More - School Management System"
            onError={(e) => {
              // Try fallback paths
              const target = e.target as HTMLImageElement;
              const fallbackPaths = [
                './aboutus.png',
                '/aboutus.png',
                'aboutus.png'
              ];
              
              const currentSrc = target.src;
              const currentIndex = fallbackPaths.findIndex(path => currentSrc.includes(path));
              const nextIndex = (currentIndex + 1) % fallbackPaths.length;
              target.src = fallbackPaths[nextIndex];
            }}
          />
        </ImageSection>
        
        <ContentSection>
          <BrandSection>
            <BrandTitle>GROW MORE</BrandTitle>
            <BrandSubtitle>School Management System</BrandSubtitle>
          </BrandSection>
          
          <ContactSection>
            <ContactName>TAJ ALI KHAN</ContactName>
            <ContactTitle>Founder & CEO</ContactTitle>
            <ContactPhone>0313-9794635</ContactPhone>
          </ContactSection>
        </ContentSection>
      </ModalContent>
    </ModalOverlay>
  );
};

export default AboutUsModal;
