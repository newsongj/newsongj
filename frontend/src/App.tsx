import React from 'react';
import { Routes, Route, BrowserRouter } from 'react-router-dom';

import Orchestrator from './apps';
import NotFound from './pages/NotFound.tsx';
import LoginPage from './pages/LoginPage';
import LoginFailedPage from './pages/LoginFailedPage.tsx';
import AuthExchangePage from './pages/AuthExchangePage.tsx';
import PrivateRoute from './components/common/PrivateRoute.tsx';
import AuthInitializer from './components/common/AuthInitializer.tsx';

const App: React.FC = () => {
    return (
        <BrowserRouter future={{ v7_startTransition: true }}>
            <AuthInitializer>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/login-failed" element={<LoginFailedPage />} />
                    <Route path="/auth/exchange" element={<AuthExchangePage />} />
                    <Route path="/not-found" element={<NotFound />} />

                    <Route path="/*" element={<PrivateRoute><Orchestrator /></PrivateRoute>} />
                </Routes>
            </AuthInitializer>
        </BrowserRouter>
    );
};

export default App;
