import React from 'react';
import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from '@components/common/AppLayout/AppLayout';
import LoginPage from './pages/LoginPage/LoginPage';
import ResearchPage from './pages/ResearchPage/ResearchPage';
import VehiclePage from './pages/VehiclePage/VehiclePage';

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                    path="/research"
                    element={
                        <AppLayout title="수련회 인원조사">
                            <ResearchPage />
                        </AppLayout>
                    }
                />
                <Route
                    path="/vehicle"
                    element={
                        <AppLayout title="수련회 차량 신청">
                            <VehiclePage />
                        </AppLayout>
                    }
                />
                <Route path="/" element={<Navigate to="/research" replace />} />
                <Route path="*" element={<Navigate to="/research" replace />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
