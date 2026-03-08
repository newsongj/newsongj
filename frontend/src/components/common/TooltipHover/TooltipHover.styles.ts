import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

interface StyledTooltipProps {
  $placement: 'top' | 'bottom' | 'left' | 'right';
}

export const StyledTooltipContainer = styled(Box)({
  position: 'relative',
  display: 'inline-block',
});

export const StyledTooltipContent = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$placement',
})<StyledTooltipProps>(({ theme, $placement }) => ({
  position: 'absolute',
  zIndex: 9999,
  padding: `${theme.custom.spacing.xs} ${theme.custom.spacing.sm}`,
  backgroundColor: theme.custom.colors.neutral._20,
  color: theme.custom.colors.neutral._100,
  fontSize: theme.custom.typography.caption.fontSize,
  borderRadius: theme.custom.borderRadius,
  whiteSpace: 'nowrap',
  boxShadow: theme.custom.shadows.dp02,
  pointerEvents: 'none', // 마우스 이벤트 방지
  
  // 위치별 오프셋 (Portal 사용 시 상대 위치 조정)
  ...($placement === 'top' && {
    transform: 'translate(-50%, -100%)',
    marginTop: '-8px',
  }),
  
  ...($placement === 'bottom' && {
    transform: 'translate(-50%, 0%)',
    marginTop: '8px',
  }),
  
  ...($placement === 'left' && {
    transform: 'translate(-100%, -50%)',
    marginLeft: '-8px',
  }),
  
  ...($placement === 'right' && {
    transform: 'translate(0%, -50%)',
    marginLeft: '8px',
  }),
}));

export const StyledTooltipArrow = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$placement',
})<StyledTooltipProps>(({ theme, $placement }) => ({
  position: 'absolute',
  width: 0,
  height: 0,
  
  // 화살표 위치별 스타일
  ...($placement === 'top' && {
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderTop: `6px solid ${theme.custom.colors.neutral._20}`,
  }),
  
  ...($placement === 'bottom' && {
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderBottom: `6px solid ${theme.custom.colors.neutral._20}`,
  }),
  
  ...($placement === 'left' && {
    left: '100%',
    top: '50%',
    transform: 'translateY(-50%)',
    borderTop: '6px solid transparent',
    borderBottom: '6px solid transparent',
    borderLeft: `6px solid ${theme.custom.colors.neutral._20}`,
  }),
  
  ...($placement === 'right' && {
    right: '100%',
    top: '50%',
    transform: 'translateY(-50%)',
    borderTop: '6px solid transparent',
    borderBottom: '6px solid transparent',
    borderRight: `6px solid ${theme.custom.colors.neutral._20}`,
  }),
}));
