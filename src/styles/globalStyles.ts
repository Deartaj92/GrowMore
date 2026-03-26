import { createGlobalStyle } from 'styled-components';
import { isDark } from './DesignSystem';

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

  /* Reset & Base */
  * {
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow-x: hidden;
    background: ${({ theme }: any) => theme.BG};
    color: ${({ theme }: any) => theme.TEXT_PRIMARY};
    font-family: 'Inter', -apple-system, system-ui, sans-serif;
    font-size: 16px;
    line-height: 1.5;
    transition: background-color 0.3s ease;
  }

  #root {
    height: 100%;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* Selection Highlight */
  ::selection {
    background: ${({ theme }: any) => `${theme.ACCENT}33`};
    color: ${({ theme }: any) => theme.ACCENT};
  }

  /* Better Scrollbars */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  
  ::-webkit-scrollbar-thumb {
    background: ${({ theme }: any) => (isDark(theme) ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)')};
    border-radius: 10px;
    transition: background 0.2s ease;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }: any) => theme.ACCENT}66;
  }

  /* Mobile touch optimizations */
  @media (max-width: 700px) {
    html, body, #root {
      height: 100%;
      min-height: 100%;
      overflow: hidden;
      overscroll-behavior: none;
    }

    * {
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    
    input, textarea, select {
      font-size: 16px !important; /* Prevent iOS zoom */
    }
  }

  /* Global Element Resets */
  button {
    font-family: inherit;
    cursor: pointer;
    border: none;
    outline: none;
    background: none;
    padding: 0;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  input, textarea, select {
    font-family: inherit;
    outline: none;
    background: none;
    border: none;
    color: inherit;
  }

  a {
    text-decoration: none;
    color: inherit;
    transition: color 0.2s ease;
  }

  ul, ol {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  h1, h2, h3, h4, h5, h6, p {
    margin: 0;
  }

  /* Focus visible styles for accessibility */
  *:focus-visible {
    outline: 2px solid ${({ theme }: any) => theme.ACCENT || '#6366f1'};
    outline-offset: 2px;
  }

  /* Utility Animations */
  .fade-in {
    animation: fadeIn 0.4s ease-out forwards;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Additional mobile fixes for payment toolbar/autofill */
  input::-webkit-credentials-auto-fill-button {
    visibility: hidden;
    position: absolute;
    right: 0;
  }
`;
