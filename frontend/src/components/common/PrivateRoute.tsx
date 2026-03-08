import { useRecoilValue } from 'recoil';
import { authState } from '@/recoil/auth/atoms';
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { CircularProgressIndicator } from '@components/common/CircularProgressIndicator';
import * as S from './PrivateRoute.styles';

interface PrivateRouteProps {
  children: ReactNode;
}

function PrivateRoute({ children }: PrivateRouteProps) {
  const auth = useRecoilValue(authState);

  if (auth.isLoading) {
    return (
      <S.StyledLoadingContainer>
        <CircularProgressIndicator />
      </S.StyledLoadingContainer>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default PrivateRoute;
