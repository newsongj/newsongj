import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Container } from './layout/Container';
import { LoadingFallback } from '@components/common/LoadingFallback';
const MemberListPage = React.lazy(() => import('./pages/MemberListPage'));
const DeletedMemberPage = React.lazy(() => import('./pages/DeletedMemberPage'));
const PermissionManagementPage = React.lazy(() => import('./pages/PermissionManagementPage'));
const AttendancePage = React.lazy(() => import('./pages/AttendancePage'));
const NewcomerMemberPage = React.lazy(() => import('./pages/NewcomerMemberPage'));
const AttendanceDashboard = React.lazy(() => import('./pages/AttendanceDashboard'));
const RetreatDashboard = React.lazy(() => import('./pages/RetreatDashboard'));
const RetreatResearchListPage = React.lazy(() => import('./pages/RetreatResearchListPage'));
const RetreatVehicleListPage = React.lazy(() => import('./pages/RetreatVehicleListPage'));
const SuspendedMealPage = React.lazy(() => import('./pages/SuspendedMealPage'));
const RetreatCreatePage = React.lazy(() => import('./pages/RetreatCreatePage'));
const RetreatEditPage = React.lazy(() => import('./pages/RetreatEditPage'));

const Orchestrator: React.FC = () => {
  return (
    <Container>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/attendance-dashboard" replace />} />

          <Route path="/members" element={<MemberListPage />} />
          <Route path="/members/newcomer" element={<NewcomerMemberPage />} />
          <Route path="/deleted-members" element={<DeletedMemberPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/attendance-dashboard" element={<AttendanceDashboard />} />
          <Route path="/retreat/dashboard" element={<RetreatDashboard />} />
          <Route path="/retreat/research" element={<RetreatResearchListPage />} />
          <Route path="/retreat/vehicle" element={<RetreatVehicleListPage />} />
          <Route path="/retreat/create" element={<RetreatCreatePage />} />
          <Route path="/retreat/edit" element={<RetreatEditPage />} />
          <Route path="/retreat/suspended-meal" element={<SuspendedMealPage />} />

          <Route path="/permission/accounts" element={<PermissionManagementPage />} />
          <Route path="/permission/policies" element={<PermissionManagementPage />} />

          <Route path="/permission/management" element={<Navigate to="/permission/accounts" replace />} />
          <Route path="/permission/users" element={<Navigate to="/permission/accounts" replace />} />
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
