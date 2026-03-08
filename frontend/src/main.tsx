import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

import { CssBaseline } from '@mui/material';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { RecoilRoot } from 'recoil';
import { QueryClientProvider } from '@tanstack/react-query';

import App from './App';
import AuthInitializer from './components/common/AuthInitializer';
import { GlobalStyle } from './styles/GlobalStyle';
import { lightTheme, darkTheme } from '@styles/theme';
import { makeUnifiedTheme } from '@styles/makeTheme';
import { queryClient } from './utils/queryClient'; 

const ThemedApp: React.FC = () => {
    const [mode,] = useState<'light' | 'dark'>('light');

    const customTheme = mode === 'dark' ? darkTheme : lightTheme;
    const theme = makeUnifiedTheme(customTheme);

    return (
        <MuiThemeProvider theme={theme}>
            <StyledThemeProvider theme={theme}>
                <CssBaseline />
                <GlobalStyle />
                <AuthInitializer>
                    <App />
                </AuthInitializer>
            </StyledThemeProvider>
        </MuiThemeProvider>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <RecoilRoot>
                <ThemedApp />
            </RecoilRoot>
        </QueryClientProvider>
    </React.StrictMode>
);
