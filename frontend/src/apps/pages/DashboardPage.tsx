import React from 'react';
import DashboardView from '@/components/dashboard/DashboardView';
import { useDashboard } from '@/hooks/dashboard';

const DashboardPage: React.FC = () => {
  const dashboardState = useDashboard();
  return <DashboardView {...dashboardState} />;
};

export default DashboardPage;
