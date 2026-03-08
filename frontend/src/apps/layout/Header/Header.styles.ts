import { styled } from '@mui/material/styles';
import { AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import { ReactComponent as NewsongLogo } from '@assets/icons/NewsongJ_logo.svg';

export const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.custom?.colors?.primary?._900 || '#021730',
  height: 'px',
  boxShadow: 'none',
  position: 'fixed',
}));

export const StyledToolbar = styled(Toolbar)({
  minHeight: '66px !important',
  padding: '0 24px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const LeftPanel = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
});

export const Logo = styled(NewsongLogo)({
  width: '120px',
  height: '28px',
});

export const Title = styled(Typography)(({ theme }) => ({
  fontSize: theme.custom?.typography?.h3?.fontSize || '22px',
  fontWeight: theme.custom?.typography?.h3?.fontWeight || 700,
  lineHeight: theme.custom?.typography?.h3?.lineHeight || '1.5em',
  letterSpacing: '-0.04em',
  color: theme.custom?.colors?.on?.primary || '#FFFFFF',
}));

export const RightPanel = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
});

export const NotificationButton = styled(IconButton)(({ theme }) => ({
  color: theme.custom?.colors?.on?.primary || '#FFFFFF',
  padding: '8px',
}));

export const AvatarButton = styled('button')({
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:focus': {
    outline: 'none', // 포커스 시 아웃라인 제거 (필요에 따라 수정)
  },
  '&:focus-visible': {
    boxShadow: `0 0 0 2pxHighlight`, // 키보드 네비게이션을 위한 포커스 스타일
  }
});