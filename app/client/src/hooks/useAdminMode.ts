import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useAdminMode = () => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    // Check URL parameter on mount and when URL changes
    const checkAdminParam = () => {
      const params = new URLSearchParams(window.location.search);
      const hasAdminParam = params.get('admin') === '1';
      // Only enable admin mode if user is actually an admin AND has the URL parameter
      setIsAdminMode(hasAdminParam && isAdmin);
    };

    checkAdminParam();

    // Listen for URL changes
    window.addEventListener('popstate', checkAdminParam);
    return () => window.removeEventListener('popstate', checkAdminParam);
  }, [isAdmin]);

  return isAdminMode;
};