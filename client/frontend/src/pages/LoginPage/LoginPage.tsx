import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@components/common/Button';
import { TextField } from '@components/common/TextField';
import { login as apiLogin } from '@api/auth';
import { storage } from '@utils/storage';
import * as S from './LoginPage.styles';
import newsongjLogo from '@assets/J_logo.png';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({ username: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleInputChange = (field: 'username' | 'password') => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
        setError(null);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.username) { setError('아이디를 입력해주세요.'); return; }
        if (!formData.password) { setError('비밀번호를 입력해주세요.'); return; }

        setIsLoading(true);
        setError(null);

        try {
            const data = await apiLogin({ username: formData.username, password: formData.password });
            storage.setToken(data.token);
            localStorage.setItem('client_user', JSON.stringify({
                token:    data.token,
                role:     data.role,
                gyogu:    data.gyogu,
                team:     data.team,
                group_no: data.group_no,
            }));
            navigate('/research', { replace: true });
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || '로그인에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <S.StyledContainer>
            <S.StyledLogo>
                <img src={newsongjLogo} alt="NewsongJ" height="40" style={{ marginBottom: 8 }} />
                <br />
                NEWSONGJ 대학부
            </S.StyledLogo>

            <S.StyledLoginCard>
                <S.StyledForm onSubmit={handleLogin}>
                    <S.StyledInputGroup>
                        <TextField
                            label="아이디"
                            type="text"
                            value={formData.username}
                            onChange={handleInputChange('username')}
                            placeholder="아이디를 입력하세요"
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
        </S.StyledContainer>
    );
};

export default LoginPage;
