import React from 'react';

export interface PermissionGuardProps {
  requiredPermissions: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
