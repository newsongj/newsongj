import { styled } from '@mui/material/styles';

interface StyledProgressContainerProps {
  $width: number;
}

interface StyledActiveIndicatorProps {
  $progress: number;
  $width: number;
}

export const StyledProgressContainer = styled('div')<StyledProgressContainerProps>(({ $width }) => ({
  position: 'relative',
  width: $width,
  height: 12,
}));

export const StyledTrack = styled('div')(({ theme }) => ({
  position: 'absolute',
  top: 4,
  left: 0,
  right: 0,
  height: 4,
  backgroundColor: theme.custom.colors.primary.container,
  borderRadius: 8,
}));

export const StyledActiveIndicator = styled('div')<StyledActiveIndicatorProps>(({ $progress, $width }) => ({
  position: 'absolute',
  top: 0,
  left: 2,
  width: Math.max(0, ($progress / 100) * ($width - 4)),
  height: 12,
  display: 'flex',
  alignItems: 'center',
  overflow: 'hidden',
}));

export const StyledProgressBar = styled('div')(({ theme }) => ({
  width: '100%',
  height: 4,
  backgroundColor: theme.custom.colors.primary._500,
  borderRadius: 8,
  position: 'relative',
  top: 2,
}));

export const StyledStopIndicator = styled('div')<{ $position: number }>(({ theme, $position }) => ({
  position: 'absolute',
  top: 4,
  left: $position - 2,
  width: 4,
  height: 4,
  backgroundColor: theme.custom.colors.primary._500,
  borderRadius: 26,
}));
