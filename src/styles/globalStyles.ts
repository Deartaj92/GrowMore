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

  /* Hide scrollbar for Chrome, Safari and Opera */
  ::-webkit-scrollbar {
    width: 0px;
    background: transparent;
  }
  
  /* Hide scrollbar for IE, Edge and Firefox */
  body, * {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
  }
  
  html {
    font-size: 16px; /* Base font-size for consistent rem calculations */
    -webkit-text-size-adjust: 100%; /* Prevent iOS font size adjustment */
    -moz-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }
  
  html, body {
    overflow-x: hidden;
    max-width: 100vw;
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

