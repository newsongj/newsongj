import { createTheme } from '@mui/material/styles';
import type { DefaultTheme } from 'styled-components';

export function makeUnifiedTheme(custom: DefaultTheme['custom']): DefaultTheme {
    const muiTheme = createTheme({
        palette: {
            mode: custom.mode,
            primary: { main: custom.colors.primary._500 },
            background: { default: custom.colors.background, paper: custom.colors.surface },
        },
        typography: {
            h1:      { fontSize: custom.typography.h1.fontSize,      fontWeight: custom.typography.h1.fontWeight,      lineHeight: custom.typography.h1.lineHeight },
            h2:      { fontSize: custom.typography.h2.fontSize,      fontWeight: custom.typography.h2.fontWeight,      lineHeight: custom.typography.h2.lineHeight },
            body1:   { fontSize: custom.typography.body1.fontSize,   fontWeight: custom.typography.body1.fontWeight,   lineHeight: custom.typography.body1.lineHeight },
            body2:   { fontSize: custom.typography.body2.fontSize,   fontWeight: custom.typography.body2.fontWeight,   lineHeight: custom.typography.body2.lineHeight },
            button:  { fontSize: custom.typography.button.fontSize,  fontWeight: custom.typography.button.fontWeight,  lineHeight: custom.typography.button.lineHeight },
            caption: { fontSize: custom.typography.caption.fontSize, fontWeight: custom.typography.caption.fontWeight, lineHeight: custom.typography.caption.lineHeight },
        },
        shape: { borderRadius: parseInt(custom.borderRadius, 10) || 8 },
    });

    return { ...muiTheme, custom } as unknown as DefaultTheme;
}
