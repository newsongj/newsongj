import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import AppLayout from '@components/common/AppLayout/AppLayout';
import LoginPage from './pages/LoginPage/LoginPage';
import ResearchPage from './pages/ResearchPage/ResearchPage';
import VehiclePage from './pages/VehiclePage/VehiclePage';
import SuspendedMealPage from './pages/SuspendedMealPage/SuspendedMealPage';

const router = createBrowserRouter([
    { path: '/login',        element: <LoginPage /> },
    { path: '/research',     element: <AppLayout title="수련회 인원조사"><ResearchPage /></AppLayout> },
    { path: '/vehicle',      element: <AppLayout title="수련회 차량 신청"><VehiclePage /></AppLayout> },
    { path: '/suspendedmeal', element: <AppLayout title="서스펜디드밀 신청"><SuspendedMealPage /></AppLayout> },
    { path: '/',             element: <Navigate to="/research" replace /> },
    { path: '*',             element: <Navigate to="/research" replace /> },
]);

const App: React.FC = () => <RouterProvider router={router} />;

export default App;
