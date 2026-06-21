import React from 'react';
import { Navigate } from 'react-router-dom';
import { storage } from '@utils/storage';

const MemberPrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (!storage.getToken()) {
        return <Navigate to="/member-login" replace />;
    }
    return <>{children}</>;
};

export default MemberPrivateRoute;
