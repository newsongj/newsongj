import { DefaultTheme } from 'styled-components';

type CustomBase = Omit<DefaultTheme['custom'], 'mode'>;

const commonTheme: CustomBase = {
    typography: {
        hero: {
            fontSize: '50px',
            fontWeight: 700,
            lineHeight: '65px',
        },
        h1: {
            fontSize: '38px',
            fontWeight: 700,
            lineHeight: '49px',
        },
        h2: {
            fontSize: '28px',
            fontWeight: 700,
            lineHeight: '36px',
        },
        h3: {
            fontSize: '22px',
            fontWeight: 700,
            lineHeight: '33px',
        },
        subtitle: {
            fontSize: '18px',
            fontWeight: 700,
            lineHeight: '27px',
        },
        body1: {
            fontSize: '16px',
            fontWeight: 400,
            lineHeight: '24px',
        },
        body2: {
            fontSize: '14px',
            fontWeight: 400,
            lineHeight: '21px',
        },
        button: {
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: '16px',
        },
        caption: {
            fontSize: '12px',
            fontWeight: 400,
            lineHeight: '18px',
        }
    },
    colors: {
        primary: {
            _050: '#E6F1FD',
            _100: '#B5D6FB',
            _200: '#85BBF9',
            _300: '#54A0F6',
            _400: '#2385F4',
            _500: '#187EF4',
            _600: '#095FC2',
            _700: '#064792',
            _800: '#042F61',
            _900: '#021730',
            variant: '#064792',
            container: '#E6F1FD',
            outline: 'rgba(93, 96, 100, 0.12)'
        },
        neutral: {
            _00: '#000000',
            _10: '#1C1E21',
            _20: '#2F3235',
            _30: '#46494C',
            _40: '#5D6064',
            _50: '#76797D',
            _60: '#8F9296',
            _70: '#A9ADB1',
            _80: '#C5C9CD',
            _90: '#E0E4E9',
            _95: '#EFF3F7',
            _99: '#FBFDFF',
            _100: '#FFFFFF'
        },
        text: {
            high: 'rgba(0,0,0,0.87)',
            medium: '#5D6064',
            disabled: '#A9ADB1'
        },
        textOnPrimary: {
            high: '#ffffff',
            medium: '#dddddd',
            disabled: '#bbbbbb'
        },
        background: '#f5f5f5',
        surface: '#ffffff',
        error: '#FAF0F3',
        success: '#E1FCEF',
        warning: '#FCF2E6',
        info: '#F0F1FA',
        active: '#E6F1FD',
        inactive: '#E9EDF5',
        white: '#ffffff',
        black: '#000000',
        on: {
            primary: '#ffffff',
            background: '#111111',
            surface: '#111111',
            error: '#ff4d4f',
            success: '#52c41a',
            warning: '#faad14',
            info: '#1890ff',
            active: '#1d78ff',
            inactive: '#cccccc',
        }
    },
    borderRadius: '8px',
    spacing: {
        xs: '8px',
        sm: '12px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '40px'
    },
    overlay: {
        primary: { hover: 'rgba(0, 92, 230, 0.04)', pressed: 'rgba(0, 92, 230, 0.12)' },
        white: { hover: 'rgba(255,255,255,0.04)', pressed: 'rgba(255,255,255,0.12)' },
        black: { hover: 'rgba(0,0,0,0.04)', pressed: 'rgba(0,0,0,0.12)' }
    },
    breakpoints: {
        mobile: '480px',
        tablet: '768px',
        desktop: '1024px',
        wide: '1440px'
    },
    shadows: {
        dp00: 'none',
        dp01: '0px 1px 3px 0px rgba(0, 0, 0, 0.2), 0px 2px 1px 0px rgba(0, 0, 0, 0.12), 0px 1px 1px 0px rgba(0, 0, 0, 0.14)',
        dp02: '0px 1px 5px 0px rgba(0, 0, 0, 0.2), 0px 3px 1px 0px rgba(0, 0, 0, 0.12), 0px 2px 2px 0px rgba(0, 0, 0, 0.14)',
        dp03: '0px 1px 8px 0px rgba(0, 0, 0, 0.2), 0px 3px 3px 0px rgba(0, 0, 0, 0.12), 0px 3px 4px 0px rgba(0, 0, 0, 0.14)',
        dp04: '0px 2px 4px 0px rgba(0, 0, 0, 0.2), 0px 1px 10px 0px rgba(0, 0, 0, 0.12), 0px 4px 5px 0px rgba(0, 0, 0, 0.14)',
        dp06: '0px 3px 5px 0px rgba(0, 0, 0, 0.2), 0px 1px 18px 0px rgba(0, 0, 0, 0.12), 0px 6px 10px 0px rgba(0, 0, 0, 0.14)',
        dp08: '0px 5px 5px 0px rgba(0, 0, 0, 0.2), 0px 3px 14px 0px rgba(0, 0, 0, 0.12), 0px 8px 10px 0px rgba(0, 0, 0, 0.14)',
        dp09: '0px 5px 6px 0px rgba(0, 0, 0, 0.2), 0px 3px 16px 0px rgba(0, 0, 0, 0.12), 0px 9px 12px 0px rgba(0, 0, 0, 0.14)',
        dp12: '0px 7px 8px 0px rgba(0, 0, 0, 0.2), 0px 5px 22px 0px rgba(0, 0, 0, 0.12), 0px 12px 17px 0px rgba(0, 0, 0, 0.14)',
        dp16: '0px 8px 10px 0px rgba(0, 0, 0, 0.2), 0px 6px 30px 0px rgba(0, 0, 0, 0.12), 0px 16px 24px 0px rgba(0, 0, 0, 0.14)',
        dp24: '0px 11px 15px 0px rgba(0, 0, 0, 0.2), 0px 9px 46px 0px rgba(0, 0, 0, 0.12), 0px 24px 38px 0px rgba(0, 0, 0, 0.14)'
    },
    transitions: {
        fast: '0.15s ease-in-out',
        normal: '0.3s ease-in-out',
        slow: '0.5s ease-in-out'
    },
    zIndices: {
        modal: 1000,
        overlay: 900,
        dropdown: 800,
        header: 700
    },
    opacity: {
        _08: 0.08,
        _12: 0.12,
        _16: 0.16,
        _38: 0.38,
        _60: 0.60,
        _87: 0.87
    },
}

export const lightTheme: DefaultTheme['custom'] = {
    mode: 'light',
    ...commonTheme,
}

export const darkTheme: DefaultTheme['custom'] = {
    mode: 'dark',
    ...commonTheme,
}
