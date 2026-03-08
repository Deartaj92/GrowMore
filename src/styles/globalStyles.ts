import { createGlobalStyle } from 'styled-components';

/**
 * Global styles for the entire application
 * These styles apply to all pages and components
 */
export const GlobalStyles = createGlobalStyle`
  @font-face {
    font-family: 'JameelNooriNastaleeq';
    src: url('/fonts/JameelNooriNastaleeq.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
  }

  /* Auto-hide scrollbars - show on hover or scroll for Chrome, Safari and Opera */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 4px;
    transition: background 0.3s ease;
  }
  
  ::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 4px;
    transition: background 0.3s ease;
  }
  
  /* Show scrollbar on hover */
  *:hover::-webkit-scrollbar-thumb {
    background: ${({ theme }: any) => theme.TEXT_SECONDARY || 'rgba(0, 0, 0, 0.2)'};
  }
  
  *:hover::-webkit-scrollbar-track {
    background: ${({ theme }: any) => theme.BG || '#f3f4f6'};
  }
  
  /* Show scrollbar when scrolling */
  .scrolling::-webkit-scrollbar-thumb,
  .scrolling *::-webkit-scrollbar-thumb {
    background: ${({ theme }: any) => theme.TEXT_SECONDARY || 'rgba(0, 0, 0, 0.2)'};
  }
  
  .scrolling::-webkit-scrollbar-track,
  .scrolling *::-webkit-scrollbar-track {
    background: ${({ theme }: any) => theme.BG || '#f3f4f6'};
  }
  
  /* Show scrollbar thumb on hover when visible */
  *:hover::-webkit-scrollbar-thumb:hover,
  .scrolling::-webkit-scrollbar-thumb:hover,
  .scrolling *::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }: any) => theme.TEXT || 'rgba(0, 0, 0, 0.3)'};
  }
  
  /* Auto-hide scrollbars for Firefox - show on hover */
  * {
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
    transition: scrollbar-color 0.3s ease;
  }
  
  *:hover {
    scrollbar-color: ${({ theme }: any) => `${theme.TEXT_SECONDARY || 'rgba(0, 0, 0, 0.2)'} ${theme.BG || '#f3f4f6'}`};
  }
  
  .scrolling,
  .scrolling * {
    scrollbar-color: ${({ theme }: any) => `${theme.TEXT_SECONDARY || 'rgba(0, 0, 0, 0.2)'} ${theme.BG || '#f3f4f6'}`};
  }
  
  html {
    font-size: 16px; /* Base font-size for consistent rem calculations */
    -webkit-text-size-adjust: 100%; /* Prevent iOS font size adjustment */
    -moz-text-size-adjust: 100%;
    text-size-adjust: 100%;
    overflow-x: hidden;
  }
  
  html, body {
    overflow-x: hidden;
    margin: 0;
    padding: 0;
  }
  
  body {
    overflow-x: hidden;
  }
  
  #root {
    overflow-x: hidden;
  }
  
  /* Mobile touch optimizations */
  @media (max-width: 700px) {
    * {
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    
    input, textarea, select {
      -webkit-user-select: text;
      -khtml-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      user-select: text;
    }
    
    /* Prevent zoom on double tap */
    * {
      touch-action: manipulation;
    }
    
    /* Smooth transitions for mobile */
    .sidebar-transition {
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
  }

  /* Global button reset */
  button {
    font-family: inherit;
    cursor: pointer;
    border: none;
    outline: none;
    background: none;
  }

  /* Global input reset */
  input, textarea, select {
    font-family: inherit;
    outline: none;
    /* Prevent payment toolbar on mobile */
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
  }
  
  /* Prevent payment toolbar - hide browser payment UI */
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  
  input[type="number"] {
    -moz-appearance: textfield;
  }
  
  /* Additional mobile-specific rules to prevent payment toolbar */
  @media (max-width: 700px) {
    input, textarea, select {
      /* Force autocomplete off via CSS (though HTML attribute is more reliable) */
      -webkit-autofill: none;
    }
    
    /* Hide payment toolbar if it appears */
    input::-webkit-credentials-auto-fill-button,
    input::-webkit-strong-password-auto-fill-button {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  }
  
  /* Hide any payment-related browser UI */
  input[autocomplete="off"]::-webkit-credentials-auto-fill-button,
  input[autocomplete="one-time-code"]::-webkit-credentials-auto-fill-button,
  input[data-form-type="other"]::-webkit-credentials-auto-fill-button {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }

  /* Global link styles */
  a {
    text-decoration: none;
    color: inherit;
  }

  /* Global list reset */
  ul, ol {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  /* Global heading reset */
  h1, h2, h3, h4, h5, h6 {
    margin: 0;
    padding: 0;
    font-weight: inherit;
  }

  /* Global paragraph reset */
  p {
    margin: 0;
    padding: 0;
  }

  /* Smooth scrolling */
  html {
    scroll-behavior: smooth;
  }

  /* Focus visible styles for accessibility */
  *:focus-visible {
    outline: 2px solid ${({ theme }: any) => theme.ACCENT || '#6366f1'};
    outline-offset: 2px;
  }
`;

