import React from 'react';
import { Routes, Route, BrowserRouter } from 'react-router-dom';

import Orchestrator from './apps';
import NotFound from './pages/NotFound.tsx';
import LoginPage from './pages/LoginPage';
import PrivateRoute from './components/common/PrivateRoute.tsx';
import AuthInitializer from './components/common/AuthInitializer.tsx';

const App: React.FC = () => {
    return (
        <BrowserRouter basename="/admin" future={{ v7_startTransition: true }}>
            <AuthInitializer>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/not-found" element={<NotFound />} />

                    <Route path="/*" element={<PrivateRoute><Orchestrator /></PrivateRoute>} />
                </Routes>
            </AuthInitializer>
        </BrowserRouter>
    );
};

export default App;
