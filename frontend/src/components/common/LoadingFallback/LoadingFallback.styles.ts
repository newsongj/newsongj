import { styled } from '@mui/material/styles';

interface StyledLoadingContainerProps {
  $height: string | number;
}

export const StyledLoadingContainer = styled('div')<StyledLoadingContainerProps>(({ $height }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: typeof $height === 'number' ? `${$height}px` : $height,
}));
