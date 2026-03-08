import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: #FFFFFF !important;
  }

  h1, h2, h3, h4, h5, h6 {
    margin: 0;
    padding: 0;
  }

  p, div {
    margin: 0;
    padding: 0;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button {
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
  }

  input, textarea {
    font-family: inherit;
    font-size: inherit;
  }

  
  ::-webkit-scrollbar {
    width: 12px;
  }

  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.custom.colors.neutral._90};
    border-radius: ${({ theme }) => theme.custom.borderRadius};
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.custom.colors.neutral._60};
    border-radius: ${({ theme }) => theme.custom.borderRadius};
    border: 2px solid ${({ theme }) => theme.custom.colors.neutral._90};
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.custom.colors.neutral._50};
  }

  ::-webkit-scrollbar-thumb:active {
    background: ${({ theme }) => theme.custom.colors.neutral._40};
  }
`;
