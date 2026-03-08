import styled from 'styled-components';
import { BadgeVariant } from './Badge.types';

interface StyledBadgeProps {
  $variant: BadgeVariant;
  $size: 'small' | 'medium' | 'large';
}

export const StyledBadge = styled.span<StyledBadgeProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  white-space: nowrap;
  transition: ${({ theme }) => theme.custom.transitions.fast};
  
  /* Variant styles */
  ${({ $variant, theme }) => {
    switch ($variant) {
      case 'error':
        return `
      background-color: ${theme.custom.colors.error};
      color: ${theme.custom.colors.on.error};
    `;
      case 'success':
        return `
      background-color: ${theme.custom.colors.success};
      color: ${theme.custom.colors.on.success};
    `;
      case 'warning':
        return `
      background-color: ${theme.custom.colors.warning};
      color: ${theme.custom.colors.on.warning};
    `;
      case 'info':
        return `
      background-color: ${theme.custom.colors.info};
      color: ${theme.custom.colors.on.info};
    `;
      case 'active':
        return `
      background-color: ${theme.custom.colors.active};
      color: ${theme.custom.colors.on.active};
    `;
      case 'inactive':
        return `
      background-color: ${theme.custom.colors.inactive};
      color: ${theme.custom.colors.on.inactive};
    `;
      default:
        return `
      background-color: ${theme.custom.colors.background};
      color: ${theme.custom.colors.text.high};
    `;
    }
  }}
  
  /* Size styles */
  ${({ $size, theme }) => {
    switch ($size) {
      case 'small':
        return `
          padding: ${theme.custom.spacing.xs} ${theme.custom.spacing.sm};
          font-size: ${theme.custom.typography.body2.fontSize};
          font-weight: ${theme.custom.typography.body2.fontWeight};
        `;
      case 'large':
        return `
          padding: ${theme.custom.spacing.sm} ${theme.custom.spacing.md};
          font-size: ${theme.custom.typography.body1.fontSize};
          font-weight: ${theme.custom.typography.body1.fontWeight};
        `;
      default: // medium
        return `
          padding: 4px ${theme.custom.spacing.sm};
          font-size: ${theme.custom.typography.button.fontSize};
          font-weight: ${theme.custom.typography.button.fontWeight};
        `;
    }
  }}
`;
