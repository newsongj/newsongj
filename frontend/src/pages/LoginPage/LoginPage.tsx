import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Snackbar } from '@mui/material';
import { Button } from '@components/common/Button';
import { TextField } from '@components/common/TextField';
import { useAuth } from '@/hooks/auth/useAuth';
import * as S from './LoginPage.styles';
import newsongjLogo from '@assets/J_logo.png';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({ login_id: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'error',
  });

  const showError = (message: string) =>
    setSnackbar({ open: true, message, severity: 'error' });

  const handleInputChange = (field: 'login_id' | 'password') => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.login_id) { showError('전화번호를 입력해주세요.'); return; }
    if (!formData.password) { showError('비밀번호를 입력해주세요.'); return; }

    setIsLoading(true);

    try {
      await login(formData);
      navigate('/', { replace: true });
    } catch (err: any) {
      showError(err.response?.data?.detail || err.message || '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <S.StyledContainer>
      <S.StyledLogo>
        <img src={newsongjLogo} alt="NewsongJ" height="40" style={{ marginBottom: 8 }} />
        <br />
        NEWSONGJ ADMIN
      </S.StyledLogo>

      <S.StyledLoginCard>
        <S.StyledForm onSubmit={handleLogin}>
          <S.StyledInputGroup>
            <TextField
              label="전화번호"
              type="text"
              value={formData.login_id}
              onChange={handleInputChange('login_id')}
              placeholder="전화번호를 입력하세요 (하이픈 제외)"
              disabled={isLoading}
              fullWidth
            />
            <TextField
              label="비밀번호"
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
              placeholder="비밀번호를 입력하세요"
              disabled={isLoading}
              fullWidth
            />
          </S.StyledInputGroup>

          <S.StyledButtonGroup>
            <Button variant="filled" type="submit" disabled={isLoading} fullWidth>
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>
          </S.StyledButtonGroup>
        </S.StyledForm>
      </S.StyledLoginCard>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </S.StyledContainer>
  );
};

export default LoginPage;
