import React, { useState, useEffect } from 'react';
import { BaseModal } from '@components/common/BaseModal';
import { Button } from '@components/common/Button';
import { TextField } from '@components/common/TextField';
import { useAuth } from '@/hooks/auth/useAuth';
import type { PasswordChangeRequest } from "@/models/auth.types";
import { PasswordChangeModalProps } from './PasswordChange.types';
import * as S from './PasswordChangeModal.styles';

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ open, onClose, onSuccess }) => {
  const { changePassword } = useAuth();

  const initialForm: PasswordChangeRequest = {
    current_password: '',
    new_password: '',
  };

  const [paswwordForm, setPasswordForm] = useState<PasswordChangeRequest>(initialForm);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const getPasswordStatus = (password: string, confirmPassword: string) => {
    const hasMinLength = password.length >= 8;
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=~`]/.test(password);
    const hasAlphabet = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const isMatch = password.length > 0 && password === confirmPassword;

    return {
      hasMinLength,
      hasSpecial,
      hasAlphabet,
      hasNumber,
      isMatch,
    };
  };
  const passwordStatus = getPasswordStatus(paswwordForm.new_password, confirmPassword);

  useEffect(() => {
    if (open) {
      setPasswordForm(initialForm);
      setConfirmPassword('');
      setError(null);
      setIsLoading(false);
    }
  }, [open]);

  const validatePassword = () => {
    const { hasMinLength, hasSpecial, hasAlphabet, hasNumber, isMatch } =
      getPasswordStatus(paswwordForm.new_password, confirmPassword);

    // 새 비밀번호 입력 여부
    if (!paswwordForm.new_password) {
      setError("새 비밀번호를 입력해주세요.");
      return false;
    }

    // 일치 여부
    if (!isMatch) {
      setError("새 비밀번호가 일치하지 않습니다.");
      return false;
    }

    if (!hasMinLength) {
      setError("비밀번호는 최소 8자 이상이어야 합니다.");
      return false;
    }

    if (!hasSpecial) {
      setError("비밀번호에 특수문자가 포함되어야 합니다.");
      return false;
    }

    if (!hasAlphabet) {
      setError("비밀번호에 영문자가 포함되어야 합니다.");
      return false;
    }

    if (!hasNumber) {
      setError("비밀번호에 숫자가 포함되어야 합니다.");
      return false;
    }

    setError("");
    return true;
  };
  const handlePasswordChange = async () => {

    if (!validatePassword()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await changePassword(paswwordForm);
      if (response.message) {
        setIsSuccess(true);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || '비밀번호 변경에 실패했습니다.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const renderActions = () => {
    if (isSuccess) {
      return (
        <Button
          variant="filled"
          onClick={onSuccess}>                                                                               │
          확인                                                                                                                      │
        </Button>
      );
    }
    return (
      <Button
        variant="filled"
        onClick={handlePasswordChange}
        disabled={isLoading}
      >
        {isLoading ? '변경 중...' : '변경'}
      </Button>
    )
  };
  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="비밀번호 재설정"
      actions={renderActions()}
      size='medium'
    >
      {isSuccess ? (
        <S.StyledContainer>
          <S.StyledWarningTitle>
            비밀번호가 성공적으로 변경되었습니다.<br></br>
            보안을 위해 다시 로그인해주세요.
          </S.StyledWarningTitle>
        </S.StyledContainer>
      ) : (
        <S.StyledContainer>
          <S.StyledWarningTitle>초기 비밀번호이므로 비밀번호 재설정이 필요합니다.</S.StyledWarningTitle>
          <S.StyledSubTitle>기존 비밀번호</S.StyledSubTitle>
          <TextField
            label="기존 비밀번호"
            type="password"
            value={paswwordForm.current_password}
            onChange={(e) => {
              setPasswordForm(prev => ({
                ...prev,
                current_password: e.target.value,
              }));
              setError(null);
            }}
            placeholder="기존 비밀번호를 입력하세요"
            fullWidth
            disabled={isLoading}
          />
          <S.StyledSubTitle>새 비밀번호</S.StyledSubTitle>
          <TextField
            label="새 비밀번호"
            type="password"
            value={paswwordForm.new_password}
            onChange={(e) => {
              setPasswordForm(prev => ({
                ...prev,
                new_password: e.target.value,
              }));
              setError(null);
            }}
            placeholder="새 비밀번호를 입력하세요"
            fullWidth
            disabled={isLoading}
          />
          <S.StyledSubTitle>새 비밀번호 확인</S.StyledSubTitle>
          <TextField
            label="새 비밀번호 확인"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError(null);
            }}
            placeholder="새 비밀번호를 다시 입력하세요"
            fullWidth
            disabled={isLoading}
            style={{ marginTop: '16px' }}
          />

          <S.PasswordRulesWrapper>
            <S.PasswordRuleItem $valid={passwordStatus.hasMinLength}>
              <span>{passwordStatus.hasMinLength ? "✔" : "✖"}</span>
              <span>비밀번호는 최소 8자 이상이어야 합니다.</span>
            </S.PasswordRuleItem>
            <S.PasswordRuleItem $valid={passwordStatus.hasSpecial}>
              <span>{passwordStatus.hasSpecial ? "✔" : "✖"}</span>
              <span>비밀번호에 특수문자가 포함되어야 합니다.</span>
            </S.PasswordRuleItem>
            <S.PasswordRuleItem $valid={passwordStatus.hasAlphabet}>
              <span>{passwordStatus.hasAlphabet ? "✔" : "✖"}</span>
              <span>비밀번호에 영문자가 포함되어야 합니다.</span>
            </S.PasswordRuleItem>
            <S.PasswordRuleItem $valid={passwordStatus.hasNumber}>
              <span>{passwordStatus.hasNumber ? "✔" : "✖"}</span>
              <span>비밀번호에 숫자가 포함되어야 합니다.</span>
            </S.PasswordRuleItem>
            <S.PasswordRuleItem $valid={passwordStatus.isMatch}>
              <span>{passwordStatus.isMatch ? "✔" : "✖"}</span>
              <span>새 비밀번호와 확인 비밀번호가 일치해야 합니다.</span>
            </S.PasswordRuleItem>
          </S.PasswordRulesWrapper>

          {error && (
            <S.StyledErrorTitle>{error}</S.StyledErrorTitle>
          )}
        </S.StyledContainer>
      )
      }
    </BaseModal >
  );
};

export default PasswordChangeModal;
