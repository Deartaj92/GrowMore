import React from 'react';
import styled, { useTheme } from 'styled-components';
import './Loader.css';

const LoadingText = styled.div<{ $isDark: boolean }>`
  margin-top: 24px;
  color: ${({ $isDark }) => $isDark ? '#e0e0e0' : '#000000'} !important;
  font-weight: 700 !important;
  font-size: 20px !important;
  letter-spacing: 0.5px;
  text-align: center;
  opacity: 1.0 !important;
  text-shadow: none !important;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
  -webkit-text-fill-color: ${({ $isDark }) => $isDark ? '#e0e0e0' : '#000000'} !important;
  -webkit-text-stroke: none !important;
`;

const Loader: React.FC<{ className?: string }> = ({ className }) => {
  const theme = useTheme();
  const isDark = (theme as any).BG === '#252525' || (theme as any).BG === '#181c2a';
  
  // Enhanced colors based on theme
  const ballColor = (theme as any).ACCENT;
  const shadowColor = isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.3)';
  
  return (
    <div 
      className={`loader-outer ${className || ''}`} 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'transparent',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999
      }}
    >
      <div 
        className="wrapper" 
        style={{ 
          width: 90, 
          height: 60, 
          position: 'relative', 
          zIndex: 1 
        }}
      >
        <div 
          className="circle" 
          style={{ 
            backgroundColor: ballColor,
            boxShadow: `0 0 20px ${ballColor}40`
          }} 
        />
        <div 
          className="circle" 
          style={{ 
            backgroundColor: ballColor,
            boxShadow: `0 0 20px ${ballColor}40`
          }} 
        />
        <div 
          className="circle" 
          style={{ 
            backgroundColor: ballColor,
            boxShadow: `0 0 20px ${ballColor}40`
          }} 
        />
        <div 
          className="shadow" 
          style={{ backgroundColor: shadowColor }}
        />
        <div 
          className="shadow" 
          style={{ backgroundColor: shadowColor }}
        />
        <div 
          className="shadow" 
          style={{ backgroundColor: shadowColor }}
        />
      </div>
      <LoadingText $isDark={isDark}>
        Loading Content...
      </LoadingText>
    </div>
  );
};

export default Loader; 