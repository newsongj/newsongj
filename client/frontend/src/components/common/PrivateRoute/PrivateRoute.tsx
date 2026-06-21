import React from 'react';
import { Navigate } from 'react-router-dom';
import { storage } from '@utils/storage';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (!storage.getToken()) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

export default PrivateRoute;
