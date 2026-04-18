import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Container } from './layout/Container';
import { LoadingFallback } from '@components/common/LoadingFallback';
import PermissionGuard from '@components/common/PermissionGuard';
import { MENU_CODES } from '@/constants/permissions';

const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const MemberListPage = React.lazy(() => import('./pages/MemberListPage'));
const DeletedMemberPage = React.lazy(() => import('./pages/DeletedMemberPage'));
const PermissionManagementPage = React.lazy(() => import('./pages/PermissionManagementPage'));
const UserManagementPage = React.lazy(() => import('./pages/UserManagementPage'));
const AttendancePage = React.lazy(() => import('./pages/AttendancePage'));
const AttendanceDashboard = React.lazy(() => import('./pages/AttendanceDashboard'));
const RetreatDashboard = React.lazy(() => import('./pages/RetreatDashboard'));
const SuspendedMealPage = React.lazy(() => import('./pages/SuspendedMealPage'));
const RetreatCreatePage = React.lazy(() => import('./pages/RetreatCreatePage'));

const Orchestrator: React.FC = () => {
  return (
    <Container>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/members" element={<MemberListPage />} />
          <Route path="/deleted-members" element={<DeletedMemberPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/attendance-dashboard" element={<AttendanceDashboard />} />
          <Route path="/retreat/dashboard" element={<RetreatDashboard />} />
          <Route path="/retreat/create" element={<RetreatCreatePage />} />
          <Route path="/retreat/suspended-meal" element={<SuspendedMealPage />} />

          <Route
            path="/permission/management"
            element={
              <PermissionGuard
                requiredPermissions={[MENU_CODES.PERMISSION_MANAGEMENT]}
                fallback={<Navigate to="/dashboard" replace />}
              >
                <PermissionManagementPage />
              </PermissionGuard>
            }
          />

          <Route
            path="/permission/users"
            element={
              <PermissionGuard
                requiredPermissions={[MENU_CODES.USER_MANAGEMENT]}
                fallback={<Navigate to="/dashboard" replace />}
              >
                <UserManagementPage />
              </PermissionGuard>
            }
            />
          <Route 
          path="*" 
          element={
          <Navigate to="/not-found" replace />
          } 
          />
        </Routes>
      </Suspense>
    </Container>
  );
};

export default Orchestrator;
