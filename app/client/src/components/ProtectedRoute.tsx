import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoginPage } from './LoginPage';
import { ShieldX } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-zinc-400 text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  // Not authenticated - show login page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Requires admin but user is not admin
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <ShieldX className="w-12 h-12 text-red-500 mx-auto" strokeWidth={1.5} />
          <h1 className="text-xl font-semibold text-white">Access Denied</h1>
          <p className="text-sm text-zinc-400">You don't have permission to access this page.</p>
          <p className="text-xs text-zinc-500">Admin access required</p>
        </div>
      </div>
    );
  }

  // Authenticated and authorized
  return <>{children}</>;
};
