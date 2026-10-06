import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchSystemStatus } from '../services/adminApi';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    const verifyToken = async () => {
      const key = localStorage.getItem('admin_api_key');
      if (!key) {
        if (isMounted) setIsAuthenticated(false);
        return;
      }

      try {
        await fetchSystemStatus();
        if (isMounted) setIsAuthenticated(true);
      } catch (err: any) {
        console.error('Authentication verification failed:', err);
        localStorage.removeItem('admin_api_key');
        if (isMounted) setIsAuthenticated(false);
      }
    };

    verifyToken();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-xs text-slate-400 font-mono tracking-wider">Verifying Admin Credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
