import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import AppLayout from '@components/common/AppLayout/AppLayout';
import PrivateRoute from '@components/common/PrivateRoute/PrivateRoute';
import MemberPrivateRoute from '@components/common/MemberPrivateRoute/MemberPrivateRoute';
import LoginPage from './pages/LoginPage/LoginPage';
import MemberLoginPage from './pages/MemberLoginPage/MemberLoginPage';
import ResearchPage from './pages/ResearchPage/ResearchPage';
import VehiclePage from './pages/VehiclePage/VehiclePage';
import SuspendedMealPage from './pages/SuspendedMealPage/SuspendedMealPage';

const router = createBrowserRouter([
    { path: '/login',         element: <LoginPage /> },
    { path: '/member-login',  element: <MemberLoginPage /> },
    { path: '/research',      element: <PrivateRoute><AppLayout title="수련회 인원조사"><ResearchPage /></AppLayout></PrivateRoute> },
    { path: '/vehicle',       element: <MemberPrivateRoute><AppLayout title="수련회 차량 신청"><VehiclePage /></AppLayout></MemberPrivateRoute> },
    { path: '/suspendedmeal', element: <PrivateRoute><AppLayout title="서스펜디드밀 신청"><SuspendedMealPage /></AppLayout></PrivateRoute> },
    { path: '/',              element: <Navigate to="/research" replace /> },
    { path: '*',              element: <Navigate to="/research" replace /> },
]);

const App: React.FC = () => <RouterProvider router={router} />;

export default App;
