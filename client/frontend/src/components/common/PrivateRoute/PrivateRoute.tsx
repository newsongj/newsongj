import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { storage } from '@utils/storage';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation();
    if (!storage.getToken()) {
        return <Navigate to={`/login?redirect=${location.pathname}`} replace />;
    }
    return <>{children}</>;
};

export default PrivateRoute;
