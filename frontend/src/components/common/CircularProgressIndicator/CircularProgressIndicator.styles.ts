import { styled, keyframes } from '@mui/material/styles';

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

interface StyledCircularProgressProps {
  $size: number;
}

interface StyledCircleProps {
  $circumference: number;
}

export const StyledCircularProgress = styled('div')<StyledCircularProgressProps>(({ $size }) => ({
  width: $size,
  height: $size,
  display: 'inline-block',
}));

export const StyledSvg = styled('svg')<StyledCircularProgressProps>(({ $size }) => ({
  width: $size,
  height: $size,
  animation: `${spin} 1.4s linear infinite`,
}));

export const StyledCircle = styled('circle')<StyledCircleProps>(({ theme, $circumference }) => ({
  fill: 'none',
  stroke: theme.custom.colors.primary._500,
  strokeWidth: 4,
  strokeLinecap: 'round',
  strokeDasharray: `${$circumference * 0.25} ${$circumference}`,
  strokeDashoffset: 0,
}));
