import React from 'react';
import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';

import Orchestrator from './apps';
import NotFound from './pages/NotFound.tsx';
import LoginFailedPage from './pages/LoginFailedPage.tsx';
import AuthExchangePage from './pages/AuthExchangePage.tsx';
import PrivateRoute from './components/common/PrivateRoute.tsx';

const App: React.FC = () => {
    return (
        <BrowserRouter future={{ v7_startTransition: true }}>
            <Routes>
                <Route path="/login" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login-failed" element={<LoginFailedPage />} />
                <Route path="/auth/exchange" element={<AuthExchangePage />} />
                <Route path="/not-found" element={<NotFound />} />

                <Route path="/*" element={<PrivateRoute><Orchestrator /></PrivateRoute>} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
