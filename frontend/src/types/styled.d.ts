import 'styled-components';
import type { Theme as MuiTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    custom: {
      mode: 'light' | 'dark';
      typography: {
        hero: { fontSize: string; fontWeight: number; lineHeight: string; };
        h1: { fontSize: string; fontWeight: number; lineHeight: string; };
        h2: { fontSize: string; fontWeight: number; lineHeight: string; };
        h3: { fontSize: string; fontWeight: number; lineHeight: string; };
        subtitle: { fontSize: string; fontWeight: number; lineHeight: string; };
        body1: { fontSize: string; fontWeight: number; lineHeight: string; };
        body2: { fontSize: string; fontWeight: number; lineHeight: string; };
        button: { fontSize: string; fontWeight: number; lineHeight: string; };
        caption: { fontSize: string; fontWeight: number; lineHeight: string; };
      };
      colors: {
        primary: {
          _050: string; _100: string; _200: string; _300: string; _400: string;
          _500: string; _600: string; _700: string; _800: string; _900: string;
          variant: string; container: string; outline: string;
        };
        neutral: {
          _00: string; _10: string; _20: string; _30: string; _40: string;
          _50: string; _60: string; _70: string; _80: string; _90: string;
          _95: string; _99: string; _100: string;
        };
        text: { high: string; medium: string; disabled: string; };
        textOnPrimary: { high: string; medium: string; disabled: string; };
        background: string; surface: string; error: string; success: string;
        warning: string; info: string; active: string; inactive: string;
        white: string; black: string;
        on: {
          primary: string; background: string; surface: string; error: string;
          success: string; warning: string; info: string; active: string; inactive: string;
        };
      };
      borderRadius: string;
      spacing: { xs: string; sm: string; md: string; lg: string; xl: string; xxl: string; };
      overlay: {
        primary: { hover: string; pressed: string };
        white: { hover: string; pressed: string };
        black: { hover: string; pressed: string };
      };
      breakpoints: { mobile: string; tablet: string; desktop: string; wide: string; };
      shadows: {
        dp00: string; dp01: string; dp02: string; dp03: string; dp04: string;
        dp06: string; dp08: string; dp09: string; dp12: string; dp16: string; dp24: string;
      };
      transitions: { fast: string; normal: string; slow: string; };
      zIndices: { modal: number; overlay: number; dropdown: number; header: number; };
      opacity: { _08: number; _12: number; _16: number; _38: number; _60: number; _87: number; };
    };
  }
}

declare module 'styled-components' {
  export interface DefaultTheme extends MuiTheme {
    custom: {
      mode: 'light' | 'dark';
      typography: {
        hero: {
          fontSize: string;
          fontWeight: number;
          lineHeight: string;
        };
        h1: {
          fontSize: string;
          fontWeight: number;
          lineHeight: string;
        };
        h2: {
          fontSize: string;
          fontWeight: number;
          lineHeight: string;
        };
        h3: {
          fontSize: string;
          fontWeight: number;
          lineHeight: string;
        };
        subtitle: {
          fontSize: string;
          fontWeight: number;
          lineHeight: string;
        };
        body1: {
          fontSize: string;
          fontWeight: number;
          lineHeight: string;
        };
        body2: {
          fontSize: string;
          fontWeight: number;
          lineHeight: string;
        };
        button: {
          fontSize: string;
          fontWeight: number;
          lineHeight: string;
        };
        caption: {
          fontSize: string;
          fontWeight: number;
          lineHeight: string;
        };
      };
      colors: {
        primary: {
          _050: string;
          _100: string;
          _200: string;
          _300: string;
          _400: string;
          _500: string;
          _600: string;
          _700: string;
          _800: string;
          _900: string;
          variant: string;
          container: string;
          outline: string;
        };
        neutral: {
          _00: string;
          _10: string;
          _20: string;
          _30: string;
          _40: string;
          _50: string;
          _60: string;
          _70: string;
          _80: string;
          _90: string;
          _95: string;
          _99: string;
          _100: string;
        };
        text: {
          high: string;
          medium: string;
          disabled: string;
        };
        textOnPrimary: {
          high: string;
          medium: string;
          disabled: string;
        };
        background: string;
        surface: string;
        error: string;
        success: string;
        warning: string;
        info: string;
        active: string;
        inactive: string;
        white: string;
        black: string;
        on: {
          primary: string;
          background: string;
          surface: string;
          error: string;
          success: string;
          warning: string;
          info: string;
          active: string;
          inactive: string;
        };
      };
      borderRadius: string;
      spacing: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        xxl: string;
      };
      overlay: {
        primary: { hover: string; pressed: string };
        white: { hover: string; pressed: string };
        black: { hover: string; pressed: string };
      };
      breakpoints: {
        mobile: string;
        tablet: string;
        desktop: string;
        wide: string;
      };
      shadows: {
        dp00: string;
        dp01: string;
        dp02: string;
        dp03: string;
        dp04: string;
        dp06: string;
        dp08: string;
        dp09: string;
        dp12: string;
        dp16: string;
        dp24: string;
      };
      transitions: {
        fast: string;
        normal: string;
        slow: string;
      };
      zIndices: {
        modal: number;
        overlay: number;
        dropdown: number;
        header: number;
      };
      opacity: {
        _08: number;
        _12: number;
        _16: number;
        _38: number;
        _60: number;
        _87: number;
      };
    }
  }
}
