import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@components/common/Button';
import { TextField } from '@components/common/TextField';
import { PasswordChangeModal } from '@components/user/PasswordChangeModal';
import { useAuth } from '@/hooks/auth/useAuth';
import * as S from './LoginPage.styles';
import newsongjLogo from '@assets/J_logo.png';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, setAuthStatus } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isPasswordChangeModalOpen, setIsPasswordChangeModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPasswordChangeModal = () => setIsPasswordChangeModalOpen(true);
  const closePasswordChangeModal = () => setIsPasswordChangeModalOpen(false);

  const handleInputChange = (field: 'email' | 'password') => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    setError(null);
  };

  const validateLoginInput = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email) {
      setError('이메일을 입력해주세요.');
      return false;
    }
    if (!formData.password) {
      setError('비밀번호를 입력해주세요.');
      return false;
    }

    return true;
  }

  const handleLogin = async (e: React.FormEvent) => {

    if (!validateLoginInput(e)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const loginResponse = await login(formData);

      if (loginResponse.requires_password_change) {
        openPasswordChangeModal();
      } else {
        const isSetAuth = await setAuthStatus(loginResponse.access_token);

        if (!isSetAuth) {
          setError('인증 정보 설정에 실패했습니다.');
          return;
        }

        navigate('/', { replace: true });
      }

    } catch (error: any) {
      setError(error.response?.data?.detail || error.message || '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChangeSuccess = () => {
    closePasswordChangeModal();
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
              label="이메일"
              type="text"
              value={formData.email}
              onChange={handleInputChange('email')}
              placeholder="이메일을 입력하세요"
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

          {error && (
            <S.StyledErrorMessage>
              {error}
            </S.StyledErrorMessage>
          )}

          <S.StyledButtonGroup>
            <Button
              variant="filled"
              type="submit"
              disabled={isLoading}
              fullWidth
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>
          </S.StyledButtonGroup>
        </S.StyledForm>
      </S.StyledLoginCard>

      <PasswordChangeModal
        open={isPasswordChangeModalOpen}
        onClose={closePasswordChangeModal}
        onSuccess={handlePasswordChangeSuccess}
      />
    </S.StyledContainer>
  );
};

export default LoginPage;
