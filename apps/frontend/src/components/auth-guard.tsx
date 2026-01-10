'use client';

import { useEffect, useRef } from 'react';
import { getLoginInfo } from '@/lib/utils/request';

/**
 * AuthGuard component that checks authentication status on app startup
 * Runs once when the app loads and redirects to login if unauthorized
 */
export function AuthGuard() {
  const hasChecked = useRef(false);

  useEffect(() => {
    // Only run once on mount
    if (hasChecked.current) return;
    hasChecked.current = true;

    // Check authentication status
    const checkAuth = async () => {
      try {
        const result = await getLoginInfo();
        
        if (result.status === 403) {
          // Unauthorized - redirect to login
          const loginUrl = `${process.env.NEXT_PUBLIC_LOGIN_FRONTEND}/login/flashinfo?redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_FLASHREV_FRONTEND + '/superagent')}`;
          window.location.href = loginUrl;
        }
        // If status is 200, user is authenticated - do nothing
      } catch (error) {
        console.error('Auth check failed:', error);
        // On error, redirect to login as a safety measure
        const loginUrl = `${process.env.NEXT_PUBLIC_LOGIN_FRONTEND}/login/flashinfo?redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_FLASHREV_FRONTEND + '/superagent')}`;
        window.location.href = loginUrl;
      }
    };

    checkAuth();
  }, []);

  // This component doesn't render anything
  return null;
}
