import styled, { css } from 'styled-components';

// ==========================================
// HELPER: Theme Detect
// ==========================================
export const isDark = (theme: any) => theme.BG === '#0f172a' || theme.BG === '#111827' || theme.BG === '#1e293b' || theme.BG === '#252525' || theme.BG === '#181c2a';

// Shared sizing tokens for cards/sections across the app
export const CARD_RADIUS_LG = '6px';
export const CARD_RADIUS_MD = '4px';
export const CONTROL_HEIGHT_SM = '24px';
export const CONTROL_FONT_SM = '0.72rem';
export const CONTROL_PADDING_X_SM = '0.6rem';

export const DASHBOARD_STATUS_COLORS = {
  success: '#22c55e',
  successStrong: '#16a34a',
  danger: '#ef4444',
  warning: '#f59e0b',
  warningStrong: '#eab308',
  info: '#3b82f6',
  infoStrong: '#2563eb',
  violet: '#8b5cf6',
  neutral: '#64748b',
  whatsapp: '#25D366',
} as const;

export const getDashboardPalette = (theme: any) => {
  const dark = isDark(theme);

  return {
    cardBg: theme.CARD,
    cardAltBg: dark ? '#2a2a2a' : theme.CARD,
    cardSubtleBg: dark ? '#353b4a' : '#f9fafb',
    cardSubtleHoverBg: dark ? '#3d4557' : '#f3f4f6',
    modalBg: dark ? '#2a2a2a' : '#ffffff',
    tableBg: dark ? '#2a2a2a' : '#f9fafb',
    tableTrack: dark ? '#232a3b' : '#e5e7eb',
    tableThumb: dark ? '#6366f1cc' : '#6366f1cc',
    tableThumbHover: dark ? '#818cf8' : '#818cf8',
    tooltipBg: dark ? '#1e293b' : '#ffffff',
    tooltipBorder: dark ? '#374151' : '#e5e7eb',
    tooltipText: dark ? '#f3f4f6' : '#1e293b',
    chartGrid: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    chartAxis: dark ? '#4b5563' : '#d1d5db',
    chartTick: dark ? '#9ca3af' : '#6b7280',
    mutedText: dark ? '#b0b8d1' : '#94a3b8',
    subtleText: dark ? '#9ca3af' : '#6b7280',
    titleText: dark ? '#e2e8f0' : '#1e293b',
    bodyText: dark ? '#f3f4f6' : '#232a3b',
    inverseText: '#ffffff',
    glassSoft: dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    glassHover: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    selectionBg: dark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
    divider: dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    accentTint: `${theme.ACCENT}20`,
    accentTintSoft: `${theme.ACCENT}15`,
    status: {
      success: DASHBOARD_STATUS_COLORS.success,
      successStrong: DASHBOARD_STATUS_COLORS.successStrong,
      danger: DASHBOARD_STATUS_COLORS.danger,
      warning: DASHBOARD_STATUS_COLORS.warning,
      warningStrong: DASHBOARD_STATUS_COLORS.warningStrong,
      info: DASHBOARD_STATUS_COLORS.info,
      infoStrong: DASHBOARD_STATUS_COLORS.infoStrong,
      violet: DASHBOARD_STATUS_COLORS.violet,
      neutral: DASHBOARD_STATUS_COLORS.neutral,
      whatsapp: DASHBOARD_STATUS_COLORS.whatsapp,
      successBg: dark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
      dangerBg: dark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
      warningBg: dark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
      infoBg: dark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
      violetBg: dark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)',
      neutralBg: dark ? 'rgba(107, 114, 128, 0.2)' : 'rgba(107, 114, 128, 0.1)',
    },
  };
};

export const getLayoutPalette = (theme: any) => {
  const dark = isDark(theme);

  return {
    shellBg: dark
      ? `linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, ${theme.BG}ee 100%)`
      : 'linear-gradient(145deg, #ffffff 0%, #fdfefe 22%, #eef5fb 100%)',
    shellBorder: dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(226, 232, 240, 0.85)',
    shellDivider: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(203, 213, 225, 0.8)',
    shellText: theme.TEXT_PRIMARY,
    shellMutedText: dark ? '#a0a7b8' : '#64748b',
    shellSoftText: dark ? '#94a3b8' : '#64748b',
    shellOverlay: dark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(15, 23, 42, 0.28)',
    surfaceBg: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.58)',
    surfaceBorder: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.82)',
    surfaceShadow: dark
      ? '0 4px 12px rgba(0, 0, 0, 0.42), inset 0 1px 2px rgba(255, 255, 255, 0.05)'
      : '0 2px 8px rgba(15, 23, 42, 0.05), inset 0 2px 4px rgba(255, 255, 255, 1)',
    surfaceHoverBg: dark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.92)',
    surfaceHoverBorder: dark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 1)',
    surfaceHoverShadow: dark
      ? '0 6px 16px rgba(0, 0, 0, 0.55), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
      : '0 4px 12px rgba(15, 23, 42, 0.08), inset 0 2px 4px rgba(255, 255, 255, 1)',
    navHoverBg: dark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(79, 70, 229, 0.08)',
    navHoverShadow: dark
      ? 'inset 0 1px 2px rgba(220, 235, 255, 0.06)'
      : 'inset 0 1px 2px rgba(255, 255, 255, 1), 0 2px 4px rgba(15, 23, 42, 0.02)',
    navActiveText: theme.ACCENT,
    dropdownThumb: dark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
    dropdownThumbHover: dark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
    sidebarBg: theme.BG,
    sidebarHeaderBg: theme.CARD,
    sidebarShadow: dark ? '2px 0 16px rgba(0, 0, 0, 0.28)' : '2px 0 16px rgba(15, 23, 42, 0.12)',
    sidebarHoverBg: dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.04)',
    sidebarSubmenuBg: dark ? 'rgba(0, 0, 0, 0.15)' : 'rgba(15, 23, 42, 0.03)',
    badgeBg: DASHBOARD_STATUS_COLORS.danger,
    badgeBorder: 'rgba(255, 255, 255, 0.3)',
    badgeShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
    footerText: dark ? '#a0a7b8' : '#64748b',
    footerBorder: dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(226, 232, 240, 0.9)',
    footerShadow: dark
      ? '0 -4px 16px rgba(0,0,0,0.45), inset 0 1px 2px rgba(255, 255, 255, 0.05)'
      : '0 -4px 20px rgba(0, 0, 0, 0.04), inset 0 2px 5px rgba(255, 255, 255, 1)',
  };
};

export const getFieldPalette = (theme: any) => {
  const dark = isDark(theme);

  return {
    bg: dark
      ? `linear-gradient(145deg, rgba(255, 255, 255, 0.04) 0%, ${theme.CARD}f6 22%, ${theme.BG} 100%)`
      : 'linear-gradient(145deg, #ffffff 0%, #fdfefe 22%, #eef5fb 100%)',
    text: theme.TEXT_PRIMARY,
    placeholder: dark ? '#64748b' : '#94a3b8',
    border: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.95)',
    hoverBorder: `${theme.ACCENT}44`,
    focusBorder: theme.ACCENT,
    focusRing: `${theme.ACCENT}22`,
    shadow: dark
      ? `0 8px 18px rgba(0, 0, 0, 0.28),
         0 2px 6px rgba(0, 0, 0, 0.18),
         inset 0 1px 0 rgba(255, 255, 255, 0.08),
         inset 0 8px 14px rgba(255, 255, 255, 0.02),
         inset 0 -8px 14px rgba(0, 0, 0, 0.18)`
      : `0 8px 18px rgba(15, 23, 42, 0.06),
         0 2px 6px rgba(15, 23, 42, 0.03),
         inset 0 2px 0 rgba(255, 255, 255, 0.92),
         inset 0 8px 12px rgba(255, 255, 255, 0.7),
         inset 0 -8px 12px rgba(59, 130, 246, 0.05)`,
    hoverShadow: dark
      ? `0 10px 22px rgba(0, 0, 0, 0.32),
         0 3px 8px rgba(0, 0, 0, 0.2),
         inset 0 1px 0 rgba(255, 255, 255, 0.1),
         inset 0 10px 16px rgba(255, 255, 255, 0.025),
         inset 0 -10px 16px rgba(0, 0, 0, 0.2)`
      : `0 10px 22px rgba(15, 23, 42, 0.08),
         0 3px 8px rgba(15, 23, 42, 0.04),
         inset 0 2px 0 rgba(255, 255, 255, 0.96),
         inset 0 10px 14px rgba(255, 255, 255, 0.74),
         inset 0 -10px 14px rgba(59, 130, 246, 0.06)`,
    focusShadow: dark
      ? `0 8px 18px rgba(0, 0, 0, 0.28),
         0 2px 6px rgba(0, 0, 0, 0.18),
         inset 0 1px 0 rgba(255, 255, 255, 0.08),
         inset 0 8px 14px rgba(255, 255, 255, 0.02),
         inset 0 -8px 14px rgba(0, 0, 0, 0.18),
         0 0 0 3px ${theme.ACCENT}22`
      : `0 8px 18px rgba(15, 23, 42, 0.06),
         0 2px 6px rgba(15, 23, 42, 0.03),
         inset 0 2px 0 rgba(255, 255, 255, 0.92),
         inset 0 8px 12px rgba(255, 255, 255, 0.7),
         inset 0 -8px 12px rgba(59, 130, 246, 0.05),
         0 0 0 3px ${theme.ACCENT}22`,
    calendarIconFilter: dark ? 'invert(0.88)' : 'invert(0.18)',
    calendarIconOpacity: dark ? 0.82 : 0.72,
    selectIcon: dark ? '#94a3b8' : '#64748b',
    menuBg: dark ? theme.CARD : '#ffffff',
    menuText: dark ? theme.TEXT_PRIMARY : '#1e293b',
    menuMutedText: dark ? theme.TEXT_SECONDARY : '#64748b',
  };
};

export const getButtonPalette = (theme: any) => {
  const dark = isDark(theme);
  const accent = theme.ACCENT || '#6366f1';

  return {
    primaryBg: `linear-gradient(135deg, ${accent} 0%, ${dark ? '#4338ca' : '#4f46e5'} 100%)`,
    primaryText: '#ffffff',
    primaryBorder: 'transparent',
    primaryShadow: dark
      ? '0 4px 12px rgba(79, 70, 229, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.2)'
      : '0 4px 12px rgba(99, 102, 241, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
    primaryHoverShadow: dark
      ? '0 6px 16px rgba(79, 70, 229, 0.5)'
      : '0 6px 16px rgba(99, 102, 241, 0.4)',
    dangerBg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    dangerText: '#ffffff',
    dangerBorder: 'transparent',
    dangerShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
    dangerHoverShadow: '0 6px 16px rgba(239, 68, 68, 0.3)',
    secondaryBg: dark
      ? `linear-gradient(145deg, rgba(255, 255, 255, 0.04) 0%, ${theme.CARD}f2 22%, ${theme.BG} 100%)`
      : 'linear-gradient(145deg, #ffffff 0%, #fdfefe 22%, #eef5fb 100%)',
    secondaryText: dark ? '#94a3b8' : '#64748b',
    secondaryTextHover: dark ? '#f8fafc' : '#0f172a',
    secondaryBorder: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
    secondaryShadow: dark
      ? `0 8px 18px rgba(0, 0, 0, 0.24),
         inset 0 1px 0 rgba(255, 255, 255, 0.08),
         inset 0 8px 14px rgba(255, 255, 255, 0.02),
         inset 0 -8px 14px rgba(0, 0, 0, 0.18)`
      : `0 8px 18px rgba(15, 23, 42, 0.05),
         inset 0 2px 0 rgba(255, 255, 255, 0.92),
         inset 0 8px 12px rgba(255, 255, 255, 0.7),
         inset 0 -8px 12px rgba(59, 130, 246, 0.05)`,
    secondaryHoverBg: dark ? 'rgba(255, 255, 255, 0.06)' : '#f8fafc',
    secondaryHoverBorder: `${accent}44`,
    secondaryHoverShadow: dark
      ? '0 10px 22px rgba(0, 0, 0, 0.28)'
      : '0 10px 22px rgba(15, 23, 42, 0.08)',
  };
};

export const getFooterNavPalette = (theme: any) => {
  const dark = isDark(theme);
  const layout = getLayoutPalette(theme);

  return {
    buttonBg: layout.surfaceBg,
    buttonBorder: layout.surfaceBorder,
    buttonShadow: layout.surfaceShadow,
    buttonHoverBg: layout.surfaceHoverBg,
    buttonHoverBorder: layout.surfaceHoverBorder,
    buttonHoverShadow: layout.surfaceHoverShadow,
    iconShadow: dark ? 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35))' : 'drop-shadow(0 1px 1px rgba(255, 255, 255, 0.6))',
    tooltipBg: dark ? theme.CARD : '#0f172a',
    tooltipBorder: dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
    tooltipArrow: dark ? theme.CARD : '#0f172a',
  };
};

export const getFooterNavButtonStyle = (theme: any, accentColor: string, hovered = false) => {
  const footer = getFooterNavPalette(theme);

  return {
    width: '30px',
    height: '30px',
    minWidth: '30px',
    minHeight: '30px',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: hovered ? `${accentColor}22` : footer.buttonBg,
    border: `1.5px solid ${hovered ? `${accentColor}66` : footer.buttonBorder}`,
    borderRadius: '999px',
    cursor: 'pointer',
    position: 'relative' as const,
    overflow: 'visible' as const,
    boxShadow: hovered ? footer.buttonHoverShadow : footer.buttonShadow,
    transition: 'none',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  };
};

export const getFooterNavIconStyle = (theme: any, accentColor: string, hovered = false) => ({
  fontSize: '16px',
  color: hovered ? accentColor : accentColor,
  opacity: hovered ? 1 : 0.92,
  filter: getFooterNavPalette(theme).iconShadow,
  transition: 'none',
});

export const getFooterNavTooltipStyle = (theme: any) => {
  const footer = getFooterNavPalette(theme);

  return {
    position: 'absolute' as const,
    bottom: 'calc(100% + 6px)',
    left: '50%',
    transform: 'translateX(-50%)',
    background: footer.tooltipBg,
    color: '#fff',
    padding: '3px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    whiteSpace: 'nowrap' as const,
    pointerEvents: 'none' as const,
    zIndex: 10001,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    border: `1px solid ${footer.tooltipBorder}`,
    maxWidth: 'calc(100vw - 16px)',
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  };
};

export const getFooterNavTooltipArrowStyle = (theme: any) => ({
  position: 'absolute' as const,
  top: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  border: '3px solid transparent',
  borderTopColor: getFooterNavPalette(theme).tooltipArrow,
});

// ==========================================
// MIXINS: Neumorphic / Claymorphic
// ==========================================

export const clayPanelStyle = css`
  background: ${({ theme }) =>
    isDark(theme)
      ? `linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, ${theme.BG}ee 100%)`
      : 'linear-gradient(145deg, #ffffff 0%, #fdfefe 22%, #eef5fb 100%)'
  };
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1.5px solid ${({ theme }) =>
    isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(226, 232, 240, 0.8)'
  };
  box-shadow: ${({ theme }) =>
    isDark(theme)
      ? '0 4px 12px rgba(0, 0, 0, 0.3)'
      : '0 4px 12px rgba(15, 23, 42, 0.03)'
  };
`;

export const clayInsetStyle = css`
  background: ${({ theme }) => isDark(theme) ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.6)'};
  border: 1.5px solid ${({ theme }) => isDark(theme) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(226, 232, 240, 0.6)'};
  box-shadow: ${({ theme }) => isDark(theme) 
    ? 'inset 0 2px 4px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.01)' 
    : 'inset 0 2px 4px rgba(15, 23, 42, 0.02), inset 0 1px 1px rgba(255, 255, 255, 0.8)'};
`;

export const clayCardStyle = css`
  background: ${({ theme }) =>
    isDark(theme)
      ? `linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, ${theme.CARD}f6 18%, ${theme.BG} 100%)`
      : 'linear-gradient(145deg, #ffffff 0%, #fdfefe 22%, #eef5fb 100%)'
  };
  border-radius: ${CARD_RADIUS_LG};
  border: 1.5px solid ${({ theme }) =>
    isDark(theme) ? 'rgba(255, 255, 255, 0.09)' : 'rgba(226, 232, 240, 0.95)'
  };
  box-shadow: ${({ theme }) =>
    isDark(theme)
      ? `0 10px 24px rgba(0,0,0,0.42),
         0 2px 8px rgba(0,0,0,0.28),
         inset 0 1px 0 rgba(255, 255, 255, 0.12),
         inset 0 10px 18px rgba(255, 255, 255, 0.03),
         inset 0 -10px 18px rgba(0, 0, 0, 0.2)`
      : `0 10px 24px rgba(15, 23, 42, 0.08),
         0 2px 8px rgba(15, 23, 42, 0.04),
         inset 0 2px 0 rgba(255, 255, 255, 0.95),
         inset 0 10px 16px rgba(255, 255, 255, 0.75),
         inset 0 -10px 16px rgba(59, 130, 246, 0.06)`
  };
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
`;

export const clayButtonStyle = css<{ $active?: boolean; $variant?: 'primary' | 'secondary' | 'danger' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 14px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  
  ${({ $variant, $active, theme }) => {
    const palette = getButtonPalette(theme);
    
    if ($active || $variant === 'primary') {
      return css`
        background: ${palette.primaryBg};
        color: ${palette.primaryText};
        border: 1px solid ${palette.primaryBorder};
        box-shadow: ${palette.primaryShadow};
        
        &:hover {
          transform: translateY(-1px);
          box-shadow: ${palette.primaryHoverShadow};
        }
      `;
    }

    if ($variant === 'danger') {
        return css`
          background: ${palette.dangerBg};
          color: ${palette.dangerText};
          border: 1px solid ${palette.dangerBorder};
          box-shadow: ${palette.dangerShadow};
          
          &:hover {
            transform: translateY(-1px);
            box-shadow: ${palette.dangerHoverShadow};
          }
        `;
      }
    
    return css`
      background: ${palette.secondaryBg};
      color: ${palette.secondaryText};
      border: 1px solid ${palette.secondaryBorder};
      box-shadow: ${palette.secondaryShadow};
      
      &:hover {
        transform: translateY(-1px);
        background: ${palette.secondaryHoverBg};
        color: ${palette.secondaryTextHover};
        border-color: ${palette.secondaryHoverBorder};
        box-shadow: ${palette.secondaryHoverShadow};
      }
    `;
  }}
`;

export const clayInputStyle = css`
  ${css`
    ${({ theme }) => {
      const field = getFieldPalette(theme);

      return css`
    padding: 0.6rem 1rem;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    
    background: ${field.bg};
    border: 1.5px solid ${field.border};
    color: ${field.text};
    box-shadow: ${field.shadow};
    appearance: none;
    -webkit-appearance: none;
    
    &:hover {
      border-color: ${field.hoverBorder};
      box-shadow: ${field.hoverShadow};
    }
    
    &:focus {
      outline: none;
      border-color: ${field.focusBorder};
      box-shadow: ${field.focusShadow};
    }
    
    &::placeholder {
      color: ${field.placeholder};
    }
    
    &:disabled {
      cursor: not-allowed;
      opacity: 0.7;
    }
    
    &::-webkit-calendar-picker-indicator {
      cursor: pointer;
      opacity: ${field.calendarIconOpacity};
      filter: ${field.calendarIconFilter};
    }
      `;
    }}
  `}
`;

export const neumorphFieldStyle = clayInputStyle;

export const minimalSelectMenuStyle = css`
  color-scheme: ${({ theme }) => isDark(theme) ? 'dark' : 'light'};

  option,
  optgroup {
    background: ${({ theme }) => getFieldPalette(theme).menuBg};
    color: ${({ theme }) => getFieldPalette(theme).menuText};
  }

  option:disabled {
    color: ${({ theme }) => getFieldPalette(theme).menuMutedText};
  }
`;

export const neumorphDateFieldStyle = css`
  padding: 0.6rem 1rem;
  ${neumorphFieldStyle}
`;

export const neumorphSelectFieldStyle = css`
  ${neumorphFieldStyle}
  ${minimalSelectMenuStyle}
  cursor: pointer;
  padding-right: 2rem;
  background-image: ${({ theme }) => {
    const color = encodeURIComponent(getFieldPalette(theme).selectIcon);
    return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='${color}'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`;
  }};
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;
`;

// ==========================================
// EXPORTED COMPONENTS
// ==========================================

export const ClayCard = styled.div`
  ${clayCardStyle}
`;

export const ClayButton = styled.button`
  ${clayButtonStyle}
`;

export const ClayInput = styled.input`
  ${neumorphFieldStyle}
`;

export const ClaySelect = styled.select`
  ${neumorphSelectFieldStyle}
`;

export const ClayDateInput = styled.input`
  ${neumorphDateFieldStyle}
`;

export const ClayTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 0.5rem;
  
  thead th {
    padding: 1rem;
    text-align: left;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${({ theme }) => isDark(theme) ? '#64748b' : '#94a3b8'};
    font-weight: 700;
  }
  
  tbody tr {
    ${clayCardStyle}
    border-radius: 12px;
    margin-bottom: 0.5rem;
    transition: transform 0.2s;
    
    &:hover {
      transform: scale(1.005);
      background: ${({ theme }) => isDark(theme) ? 'linear-gradient(145deg, #2a2d42 0%, #222538 100%)' : '#fcfdfe'};
    }
  }
  
  tbody td {
    padding: 1rem;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
    font-size: 0.875rem;
    
    &:first-child {
      border-top-left-radius: 12px;
      border-bottom-left-radius: 12px;
    }
    
    &:last-child {
      border-top-right-radius: 12px;
      border-bottom-right-radius: 12px;
    }
  }
`;

export const ClayBadge = styled.span<{ $type?: 'success' | 'warning' | 'danger' | 'info' }>`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  
  ${({ $type, theme }) => {
    switch ($type) {
      case 'success':
        return css`
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.2);
        `;
      case 'warning':
        return css`
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.2);
        `;
      case 'danger':
        return css`
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        `;
      default:
        return css`
          background: rgba(99, 102, 241, 0.1);
          color: #6366f1;
          border: 1px solid rgba(99, 102, 241, 0.2);
        `;
    }
  }}
`;
