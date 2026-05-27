import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline } from '@mui/material';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { GlobalStyle } from '@styles/GlobalStyle';
import { lightTheme } from '@styles/theme';
import { makeUnifiedTheme } from '@styles/makeTheme';
import { queryClient } from '@utils/queryClient';

const theme = makeUnifiedTheme(lightTheme);

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <MuiThemeProvider theme={theme}>
                <StyledThemeProvider theme={theme}>
                    <CssBaseline />
                    <GlobalStyle />
                    <App />
                </StyledThemeProvider>
            </MuiThemeProvider>
        </QueryClientProvider>
    </React.StrictMode>
);
