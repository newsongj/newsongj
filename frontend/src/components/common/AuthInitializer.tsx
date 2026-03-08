import { useEffect, useState } from 'react';
import { CircularProgressIndicator } from '@components/common/CircularProgressIndicator';
import { useAuth } from '@/hooks/auth/useAuth';

interface AuthInitializerProps {
  children: React.ReactNode;
}

/**
 * 애플리케이션 로드 시 기존 토큰으로 인증 상태를 복원합니다.
 * 로컬 로그인과 SSO 로그인 모두 동일한 방식으로 처리합니다.
 */
function AuthInitializer({ children }: AuthInitializerProps) {
  const { checkAuthStatus } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await checkAuthStatus();
      } catch (error) {
        console.error('Authentication initialization failed:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [checkAuthStatus]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <CircularProgressIndicator size={40} />
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthInitializer;
