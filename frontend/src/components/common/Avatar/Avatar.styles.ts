import { styled } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';

interface StyledAvatarProps {
  $size: number;
}

export const StyledAvatar = styled(Avatar, {
  shouldForwardProp: (prop) => prop !== '$size',
})<StyledAvatarProps>(({ theme, $size }) => ({
  width: $size,
  height: $size,
  backgroundColor: theme.custom?.colors?.primary?._050 || '#E6F1FD',
  color: theme.custom?.colors?.primary?._500 || '#187EF4',
  fontSize: theme.custom?.typography?.body1?.fontSize || '16px',
  fontWeight: theme.custom?.typography?.body1?.fontWeight || 400,
}));
