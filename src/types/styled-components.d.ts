import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    BG: string;
    SIDEBAR_BG: string;
    CARD: string;
    ACCENT: string;
    ACCENT_DARK?: string;
    ACCENT_DANGER?: string;
    ACCENT_DANGER_DARK?: string;
    BUTTON_SECONDARY_BG?: string;
    BUTTON_SECONDARY_BORDER?: string;
    BUTTON_SECONDARY_HOVER_BG?: string;
    BUTTON_SECONDARY_HOVER_BORDER?: string;
    SHADOW: string;
    TEXT_PRIMARY: string;
    TEXT_SECONDARY: string;
    BORDER: string;
    ICON_BG: string;
    HOVER_BG: string;
    FIELD_BG: string;
    FIELD_BORDER: string;
    ACCENT_INPUT: string;
    CANCEL_BG: string;
    CANCEL_COLOR: string;
    name?: string;
    CARD_BG?: string;
    BG_SECONDARY?: string;
    PRIMARY?: string;
    WARNING?: string;
    ERROR?: string;
    TEXT_DISABLED?: string;
  }

  export interface ExecutionContext {
    theme: any;
  }
}

