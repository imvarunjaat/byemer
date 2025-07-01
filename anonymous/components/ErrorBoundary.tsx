import React, { useEffect } from 'react';
import { Platform } from 'react-native';

// Helper type for React Native's ErrorUtils (available in __DEV__ mode)
type ErrorHandlerType = (error: any, isFatal?: boolean) => void;
interface RNErrorUtils {
  getGlobalHandler: () => ErrorHandlerType;
  setGlobalHandler: (callback: ErrorHandlerType) => void;
}

/**
 * Component to intercept and suppress specific types of errors
 * particularly focused on rate limiting errors from authentication
 */
export function ErrorInterceptor() {
  useEffect(() => {
    // Store original console methods
    const originalConsoleError = console.error;
    
    // Override console.error to filter out specific errors
    console.error = function() {
      const args = Array.from(arguments);
      const errorString = typeof args[0] === 'string' ? args[0] : '';
      
      // Check for all error strings that might contain rate limiting messages
      if (
        args.some(arg => 
          typeof arg === 'string' && (
            arg.includes('security purposes') ||
            arg.includes('seconds') ||
            arg.includes('AuthApiError') ||
            arg.toLowerCase().includes('rate limit')
          )
        ) || 
        errorString.includes('Login error: [AuthApiError')
      ) {
        // Instead of showing error, log it as info
        console.log('Suppressed auth rate limit error:', ...args);
        return;
      }
      
      // Pass through normal errors
      return originalConsoleError.apply(console, args);
    };
    
    // React Native specific - override native error handling if possible
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      // This is a more aggressive approach to suppress red box errors
      // related to rate limiting in development mode
      const globalAny = global as any;
      if (__DEV__ && globalAny.ErrorUtils) {
        const errorUtils = globalAny.ErrorUtils as RNErrorUtils;
        const originalErrorHandler = errorUtils.getGlobalHandler();
        
        errorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
          const errorMsg = error?.message || error?.toString() || '';
          
          if (
            errorMsg.includes('security purposes') || 
            errorMsg.includes('seconds') ||
            errorMsg.includes('AuthApiError')
          ) {
            console.log('Suppressed fatal auth error:', error);
            return;
          }
          
          return originalErrorHandler(error, isFatal);
        });
      }
    }
    
    return () => {
      // Restore original console methods
      console.error = originalConsoleError;
    };
  }, []);
  
  // This component doesn't render anything
  return null;
}
