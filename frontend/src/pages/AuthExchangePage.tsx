import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CircularProgressIndicator } from '@components/common/CircularProgressIndicator';
import { useAuth } from '@/hooks/auth/useAuth';

const AuthExchangePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { exchangeTicketForToken } = useAuth();
  const exchangeAttempted = useRef(false);

  useEffect(() => {
    const handleTokenExchange = async () => {
      if (exchangeAttempted.current) return;
      exchangeAttempted.current = true;

      const ticket = searchParams.get('ticket');
      if (!ticket) {
        navigate('/login-failed');
        return;
      }

      try {
        const isSuccess = await exchangeTicketForToken(ticket);

        if (isSuccess) {
          window.location.replace('/');
        } else {
          throw new Error('Token exchange did not return user data.');
        }
      } catch (error) {
        navigate('/login-failed');
      }
    };

    handleTokenExchange();
  }, [searchParams, exchangeTicketForToken, navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '16px'
    }}>
      <CircularProgressIndicator size={40} />
      <p>SSO 로그인 처리 중...</p>
    </div>
  );
};

export default AuthExchangePage;
