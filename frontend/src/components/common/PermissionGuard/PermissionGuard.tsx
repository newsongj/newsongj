import React from 'react';
import { useRecoilValue } from 'recoil';
import { Navigate } from 'react-router-dom';
import { authState, userPermissionsState } from '@/recoil/auth/atoms';
import { hasPermission } from '@/constants/permissions';
import { PermissionGuardProps } from './PermissionGuard.types';

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  requiredPermissions,
  children,
  fallback = null
}) => {
  const auth = useRecoilValue(authState);
  const userPermissions = useRecoilValue(userPermissionsState);

  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!auth.isAuthenticated || !auth.user) {
    return <Navigate to="/login" replace />;
  }

  const hasRequiredPermission = hasPermission(userPermissions, requiredPermissions);

  if (!hasRequiredPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGuard;

