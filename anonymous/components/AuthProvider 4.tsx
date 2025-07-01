import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuthStore } from '@/store/auth-store';
import { configureDeepLinking } from '@/lib/deep-linking';
import { ErrorInterceptor } from '@/components/ErrorBoundary';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { checkSession } = useAuthStore();

  // One-time initialization
  useEffect(() => {
    // Simple passive session check without immediate navigation
    checkSession();
    
    // Configure deep linking for auth redirects - delayed to avoid conflicts
    const timer = setTimeout(() => {
      configureDeepLinking();
    }, 500); // Greater delay to ensure other initialization is completed
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Add error interceptor to handle auth errors gracefully */}
      <ErrorInterceptor />
      
      {/* Render children regardless of auth state */}
      {children}
    </>
  );
}

export default AuthProvider;
