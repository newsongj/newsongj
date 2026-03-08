import React from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { Button } from '@components/common/Button';

const StyledContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  padding: theme.custom.spacing.lg,
  backgroundColor: theme.custom.colors.neutral._99,
}));

const StyledCard = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.custom.spacing.lg,
  padding: theme.custom.spacing.xxl,
  backgroundColor: theme.custom.colors.white,
  borderRadius: theme.custom.borderRadius,
  boxShadow: theme.custom.shadows.dp02,
  maxWidth: '400px',
  width: '100%',
}));

const StyledTitle = styled('h1')(({ theme }) => ({
  fontSize: theme.custom.typography.h2.fontSize,
  lineHeight: theme.custom.typography.h2.lineHeight,
  fontWeight: theme.custom.typography.h2.fontWeight,
  color: theme.custom.colors.error,
  margin: 0,
  textAlign: 'center',
}));

const StyledMessage = styled('p')(({ theme }) => ({
  fontSize: theme.custom.typography.body1.fontSize,
  lineHeight: theme.custom.typography.body1.lineHeight,
  color: theme.custom.colors.text.medium,
  margin: 0,
  textAlign: 'center',
}));

const LoginFailedPage: React.FC = () => {
  const navigate = useNavigate();

  const handleRetryLogin = () => {
    navigate('/login');
  };

  return (
    <StyledContainer>
      <StyledCard>
        <StyledTitle>로그인 실패</StyledTitle>
        <StyledMessage>
          SSO 로그인 중 오류가 발생했습니다.
          <br />
          다시 시도해주세요.
        </StyledMessage>
        <Button
          variant="filled"
          onClick={handleRetryLogin}
          fullWidth
        >
          다시 로그인
        </Button>
      </StyledCard>
    </StyledContainer>
  );
};

export default LoginFailedPage;
