import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Account, UserPhotoLimitInfo } from '@photomaton/shared';

/**
 * Auth provider configuration from backend
 */
interface AuthProviderConfig {
  microsoft: boolean;
  google: boolean;
  domainRestriction: string | null;
}

interface AuthContextValue {
  account: Account | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  providers: AuthProviderConfig | null;
  loginWithMicrosoft: () => void;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccount: () => Promise<void>;
  photoLimitInfo: UserPhotoLimitInfo | null;
  refreshPhotoLimitInfo: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoLimitInfo, setPhotoLimitInfo] = useState<UserPhotoLimitInfo | null>(null);
  const [providers, setProviders] = useState<AuthProviderConfig | null>(null);

  const isAuthenticated = account !== null;
  const isAdmin = account?.role === 'admin';

  /**
   * Fetch auth provider configuration
   */
  const fetchAuthConfig = useCallback(async () => {
    try {
      const response = await fetch('/auth/config', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers);
      }
    } catch (err) {
      console.error('Failed to fetch auth config:', err);
    }
  }, []);

  /**
   * Fetch current user from backend
   */
  const fetchAccount = useCallback(async () => {
    try {
      const response = await fetch('/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAccount(data);
        setError(null);
      } else if (response.status === 401) {
        setAccount(null);
      } else {
        throw new Error('Failed to fetch account');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message);
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Initiate Microsoft OAuth login (redirect)
   */
  const loginWithMicrosoft = useCallback(() => {
    const currentPath = window.location.pathname;
    window.location.href = `/auth/login?redirect=${encodeURIComponent(currentPath)}`;
  }, []);

  /**
   * Authenticate with Google ID token
   */
  const loginWithGoogle = useCallback(async (credential: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ credential }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Google authentication failed');
      }

      // Refresh account data after successful login
      await fetchAccount();

      // Redirect to home
      window.location.href = '/';
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message || 'Google authentication failed');
      setLoading(false);
    }
  }, [fetchAccount]);

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setAccount(null);
      window.location.href = '/login';
    } catch (err: any) {
      console.error('Logout error:', err);
      setError(err.message);
    }
  }, []);

  /**
   * Refresh account data
   */
  const refreshAccount = useCallback(async () => {
    await fetchAccount();
  }, [fetchAccount]);

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Fetch user's photo limit information
   */
  const fetchPhotoLimitInfo = useCallback(async () => {
    try {
      const response = await fetch('/auth/me/limits', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setPhotoLimitInfo(data);
      } else if (response.status === 401) {
        setPhotoLimitInfo(null);
      }
    } catch (err) {
      console.error('Failed to fetch photo limit info:', err);
    }
  }, []);

  /**
   * Refresh photo limit info (call after capture or deletion)
   */
  const refreshPhotoLimitInfo = useCallback(async () => {
    await fetchPhotoLimitInfo();
  }, [fetchPhotoLimitInfo]);

  // Fetch auth config and account on mount
  useEffect(() => {
    fetchAuthConfig();
    fetchAccount();
  }, [fetchAuthConfig, fetchAccount]);

  // Fetch photo limit info when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchPhotoLimitInfo();
    } else {
      setPhotoLimitInfo(null);
    }
  }, [isAuthenticated, fetchPhotoLimitInfo]);

  // Handle OAuth callback errors
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');

    if (errorParam) {
      const errorMessages: Record<string, string> = {
        auth_failed: 'Authentication failed. Please try again.',
        invalid_state: 'Invalid authentication state. Please try again.',
        missing_code: 'Authentication code missing. Please try again.',
        session_error: 'Session error occurred. Please try again.',
      };

      setError(errorMessages[errorParam] || 'An error occurred during authentication.');

      // Clear error from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const value: AuthContextValue = {
    account,
    isAuthenticated,
    isAdmin,
    loading,
    error,
    providers,
    loginWithMicrosoft,
    loginWithGoogle,
    logout,
    refreshAccount,
    photoLimitInfo,
    refreshPhotoLimitInfo,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
