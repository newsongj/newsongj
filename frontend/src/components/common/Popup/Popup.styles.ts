import styled, { keyframes, css } from 'styled-components'

const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`

const fadeOut = keyframes`
    from { opacity: 1; }
    to   { opacity: 0; }
`

export const Overlay = styled.div<{ state: 'entering' | 'entered' | 'exiting' }>`
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;

    animation: ${({ state }) =>
        state === 'entering' || state === 'entered'
            ? css`${fadeIn} 300ms ease-out forwards`
            : css`${fadeOut} 200ms ease-in forwards`};
`

export const PopupWrapper = styled.div`
    width: 496px;
    border-radius: ${({ theme }) => theme.custom.borderRadius};
    background-color: ${({ theme }) => theme.custom.colors.neutral._100};
    padding: ${({ theme }) => theme.custom.spacing.xl};
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-sizing: border-box;
    z-index: 10001;
`

export const Content = styled.div<{ hasInput: boolean }>`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.custom.spacing.sm};
    margin-bottom: ${({ theme }) => theme.custom.spacing.xl};
`

export const Title = styled.div`
    width: 100%;
    font-size: ${({ theme }) => theme.custom.typography.subtitle.fontSize};
    font-weight: ${({ theme }) => theme.custom.typography.subtitle.fontWeight};
    color: ${({ theme }) => theme.custom.colors.text.high};
`

export const Description = styled.div`
    width: 100%;
    font-size: ${({ theme }) => theme.custom.typography.body1.fontSize};
    font-weight: ${({ theme }) => theme.custom.typography.body1.fontWeight};
    color: ${({ theme }) => theme.custom.colors.text.medium};
`

export const Caption = styled.div`
    color:  ${({ theme }) => theme.custom.colors.on.error};
    font-size: ${({ theme }) => theme.custom.typography.body2.fontSize};
    font-weight: ${({ theme }) => theme.custom.typography.body2.fontWeight};
    margin-top: ${({ theme }) => theme.custom.spacing.sm};
    line-height:${({ theme }) => theme.custom.typography.body2.lineHeight};
    white-space: pre-line;
`;

export const InputWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.custom.spacing.sm}; 
    border: 1px solid ${({ theme }) => theme.custom.colors.neutral._80};
    width: 100%;
    border-radius: 5px;
    padding: ${({ theme }) => theme.custom.spacing.md};
`

export const Input = styled.input`
    flex: 1;
    border: none;
    background-color: transparent;
    color: ${({ theme }) => theme.custom.colors.text.high};
    font-size: ${({ theme }) => theme.custom.typography.body2.fontSize};
    font-weight: ${({ theme }) => theme.custom.typography.body2.fontWeight};
    outline: none;
`

export const Count = styled.div`
    font-size: ${({ theme }) => theme.custom.typography.caption.fontSize};
    color: ${({ theme }) => theme.custom.colors.text.medium};
`

export const Actions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: ${({ theme }) => theme.custom.spacing.xl};
`

export const ButtonText = styled.button<{ variant?: 'third' | 'error' }>`
    background: none;
    border: none;
    padding: 0;
    font-size: ${({ theme }) => theme.custom.typography.body1.fontSize};
    color: ${({ theme, variant }) => {
        switch (variant) {
            case 'third': return theme.custom.colors.text.medium;
            case 'error': return theme.custom.colors.on.error;
            default: return theme.custom.colors.primary._500;
        }
    }};
    cursor: pointer;

    &:hover {
        opacity: 0.8;
    }
`
