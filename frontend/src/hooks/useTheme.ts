// src/hooks/useTheme.ts
import { useEffect, useState } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';
export type Effective = 'light' | 'dark';
/**
 * themeMode: 실제로 사용자가 선택한 모드 (system/light/dark)
 * effective: 적용 중인 실제 테마 (light or dark)
 */
export const useTheme = () => {
    const [mode, setMode] = useState<ThemeMode>(() => {
        const saved = localStorage.getItem('theme-mode') as ThemeMode;
        if (saved) return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    });

    // system 모드라면 OS 변경도 감지
    useEffect(() => {
        if (mode !== 'system') return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = (e: MediaQueryListEvent) => {
            setMode(prev => (prev === 'system' ? (e.matches ? 'dark' : 'light') : prev));
        };
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, [mode]);

    useEffect(() => {
        localStorage.setItem('theme-mode', mode);
    }, [mode]);


    const setSystem = (() => {
        setMode('system')
        window.location.reload();
    });
    const setLight = (() => {
        setMode('light')
        window.location.reload();
    });
    const setDark = (() => {
        setMode('dark');
        window.location.reload();
    });

    // 실제 적용할 dark/light 결정
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const effective: Effective =
        mode === 'system' ? (isSystemDark ? 'dark' : 'light') : mode;

    return { mode, effective, setSystem, setLight, setDark };
};
