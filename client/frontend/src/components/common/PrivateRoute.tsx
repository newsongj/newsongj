import React from 'react';
import { Navigate } from 'react-router-dom';
import { storage } from '@utils/storage';

interface Props { children: React.ReactNode }

const PrivateRoute: React.FC<Props> = ({ children }) => {
    const token = storage.getToken();
    if (!token) return <Navigate to="/login" replace />;
    return <>{children}</>;
};

export default PrivateRoute;
