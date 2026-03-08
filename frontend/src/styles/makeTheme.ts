import { createTheme } from '@mui/material/styles';
import type { DefaultTheme } from 'styled-components';

// 네가 갖고 있는 lightTheme/darkTheme(현재 구조)는 custom용 원천 데이터라고 보고 병합
export function makeUnifiedTheme(custom: DefaultTheme['custom']): DefaultTheme {
    const muiTheme = createTheme({
        palette: {
            mode: custom.mode,
            primary: { main: custom.colors.primary._500 },
            background: { default: custom.colors.background, paper: custom.colors.surface },
            // 필요시 추가 설정...
        },
        typography: {
            // MUI가 쓰는 키(예: subtitle1/2)는 맞춰서, 네 토큰은 custom 안에 유지
            h1: { fontSize: custom.typography.h1.fontSize, fontWeight: custom.typography.h1.fontWeight, lineHeight: custom.typography.h1.lineHeight },
            h2: { fontSize: custom.typography.h2.fontSize, fontWeight: custom.typography.h2.fontWeight, lineHeight: custom.typography.h2.lineHeight },
            body1: { fontSize: custom.typography.body1.fontSize, fontWeight: custom.typography.body1.fontWeight, lineHeight: custom.typography.body1.lineHeight },
            body2: { fontSize: custom.typography.body2.fontSize, fontWeight: custom.typography.body2.fontWeight, lineHeight: custom.typography.body2.lineHeight },
            button: { fontSize: custom.typography.button.fontSize, fontWeight: custom.typography.button.fontWeight, lineHeight: custom.typography.button.lineHeight },
            caption: { fontSize: custom.typography.caption.fontSize, fontWeight: custom.typography.caption.fontWeight, lineHeight: custom.typography.caption.lineHeight },
        },
        shape: { borderRadius: parseInt(custom.borderRadius, 10) || 10 },
        // shadows/breakpoints 등은 MUI 형식과 다르므로 MUI 쪽은 기본 혹은 별도 매핑
    });

    // 🔗 하나의 객체로 합치기: muiTheme에 custom 네임스페이스를 얹는다
    const unified = {
        ...muiTheme,
        custom,
    } as const;

    return unified; // 타입상 styled-components DefaultTheme & MUI Theme를 동시에 만족
}
