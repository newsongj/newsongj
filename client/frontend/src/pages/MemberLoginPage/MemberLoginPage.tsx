import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@components/common/Button';
import { TextField } from '@components/common/TextField';
import { memberLogin } from '@api/auth';
import { storage } from '@utils/storage';
import * as S from '../LoginPage/LoginPage.styles';
import newsongjLogo from '@assets/J_logo.png';

const MemberLoginPage: React.FC = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({ phone: '', name: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleInputChange = (field: 'phone' | 'name') => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const value = field === 'phone'
            ? e.target.value.replace(/-/g, '')
            : e.target.value;
        setFormData((prev) => ({ ...prev, [field]: value }));
        setError(null);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.phone) { setError('전화번호를 입력해주세요.'); return; }
        if (!formData.name)  { setError('이름을 입력해주세요.'); return; }

        setIsLoading(true);
        setError(null);

        try {
            const data = await memberLogin({ phone: formData.phone, name: formData.name });
            storage.setToken(data.token);
            localStorage.setItem('client_user', JSON.stringify(data));
            navigate('/vehicle', { replace: true });
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
                NEWSONGJ 차량조사
            </S.StyledLogo>

            <S.StyledLoginCard>
                <S.StyledForm onSubmit={handleLogin}>
                    <S.StyledInputGroup>
                        <TextField
                            label="전화번호"
                            type="text"
                            value={formData.phone}
                            onChange={handleInputChange('phone')}
                            placeholder="- 없이 입력 (예: 01012345678)"
                            disabled={isLoading}
                            fullWidth
                        />
                        <TextField
                            label="이름"
                            type="text"
                            value={formData.name}
                            onChange={handleInputChange('name')}
                            placeholder="이름을 입력하세요"
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
                            {isLoading ? '확인 중...' : '입장하기'}
                        </Button>
                    </S.StyledButtonGroup>
                </S.StyledForm>
            </S.StyledLoginCard>
        </S.StyledContainer>
    );
};

export default MemberLoginPage;
