import { styled } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';

export const ContentContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$collapsed',
})<{ $collapsed?: boolean }>(({ theme, $collapsed }) => ({
  marginLeft: $collapsed ? '56px' : '256px',
  marginTop: '66px',
  height: 'calc(100vh - 66px)',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.custom?.colors?.surface || '#FFFFFF',
  transition: 'margin-left 0.3s ease',
  overflow: 'hidden',
}));

export const ContentHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.custom?.spacing?.md || '16px',
  padding: theme.custom?.spacing?.md || '16px',
}));

export const ContentTitle = styled(Typography)(({ theme }) => ({
  fontSize: theme.custom?.typography?.subtitle?.fontSize || '18px',
  fontWeight: theme.custom?.typography?.subtitle?.fontWeight || 700,
  lineHeight: `${theme.custom?.typography?.subtitle?.lineHeight || 24}px`,
  color: theme.custom?.colors?.on.surface || 'rgba(0, 0, 0, 0.87)',
  minWidth: '66px',
}));

export const ContentBreadcrumb = styled(Typography)(({ theme }) => ({
  fontSize: theme.custom?.typography?.body2?.fontSize || '12px',
  fontWeight: theme.custom?.typography?.body2?.fontWeight || 400,
  lineHeight: `${theme.custom?.typography?.body2?.lineHeight || 18}px`,
  color: theme.custom?.colors?.neutral._50 || 'rgba(0, 0, 0, 0.6)',
}));

export const ContentBody = styled(Box)(({ theme }) => ({
  flex: 1,
  backgroundColor: theme.custom?.colors?.surface || '#FFFFFF',
  padding: theme.custom?.spacing?.md || '16px',
  overflow: 'auto',
}));
