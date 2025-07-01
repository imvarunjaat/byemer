import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { supabase } from './supabase';
import { processAuthUrl, getWindowLocation } from './platform-utils';

/**
 * Configure deep linking handlers for the app
 * This should be called in the _layout.tsx file
 */
export const configureDeepLinking = () => {
  // Configure URL event listener
  Linking.addEventListener('url', handleDeepLink);
  
  // Check for initial URL when app was launched via a link
  const initializeDeepLink = async () => {
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      handleUrl(initialUrl);
    }
  };
  
  initializeDeepLink();
};

/**
 * Handle deep link events
 */
const handleDeepLink = (event: Linking.EventType) => {
  handleUrl(event.url);
};

/**
 * Process a deep link URL
 */
const handleUrl = async (url: string) => {
  console.log('Deep link received:', url);
  
  try {
    // Parse the URL
    const parsedUrl = Linking.parse(url);
    
    // Check if this is an auth link
    if (isAuthLink(url)) {
      await handleAuthLink(url);
    }
  } catch (error) {
    console.error('Error handling deep link:', error);
  }
};

/**
 * Check if URL is an authentication link from Supabase
 */
const isAuthLink = (url: string): boolean => {
  return url.includes('/auth/v1/verify') || 
         url.includes('/auth/v1/callback') || 
         url.includes('/auth/callback') ||
         url.includes('access_token=') ||
         url.includes('refresh_token=') ||
         url.includes('type=recovery');
};

/**
 * Handle Supabase authentication links
 */
const handleAuthLink = async (url: string) => {
  try {
    console.log('Processing auth link:', url);
    console.log('Platform:', Platform.OS);
    
    // Use our platform-aware URL processing utility
    // This works on both web and mobile safely
    const { code, accessToken, refreshToken } = await processAuthUrl(url);
    
    // Exchange code for session if present
    if (code) {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('Error exchanging code for session:', error);
          throw error;
        }
        
        if (data?.session) {
          console.log('Successfully exchanged code for session');
          
          // Import auth store to refresh user profile
          const { useAuthStore } = require('@/store/auth-store');
          const { checkSession } = useAuthStore.getState();
          
          // Force a session check to refresh the profile data
          console.log('Refreshing user profile after authentication...');
          await checkSession();
          
          // Navigate home after successful auth
          router.replace('/');
          return; // Exit early, authentication was successful
        }
      } catch (exchangeError) {
        console.error('Failed to exchange code:', exchangeError);
      }
    }
    
    // Try multiple auth strategies in sequence
    
    // Strategy 1: Direct token extraction from URL (OAuth or magic link with tokens)
    if (url.includes('#access_token=') || url.includes('?access_token=')) {
      // Extract tokens from the URL
      const accessToken = extractTokenFromUrl(url, 'access_token');
      const refreshToken = extractTokenFromUrl(url, 'refresh_token');
      
      console.log('Tokens extracted - Access token exists:', !!accessToken, 'Refresh token exists:', !!refreshToken);
      
      if (accessToken && refreshToken) {
        try {
          // Try setting the session with extracted tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            console.error('Error setting session with tokens:', error);
            throw error;
          }
          
          // Immediately verify session was set
          const { data: verifyData } = await supabase.auth.getSession();
          if (verifyData?.session) {
            console.log('Session successfully established with tokens');
            
            // Import auth store to refresh user profile
            const { useAuthStore } = require('@/store/auth-store');
            const { checkSession } = useAuthStore.getState();
            
            // Refresh session data
            await checkSession();
            
            // Navigate home after successful auth
            router.replace('/');
            return; // Exit early, authentication was successful
          }
        } catch (tokenError) {
          console.error('Token processing error:', tokenError);
          // Continue to next strategy
        }
      }
    }
    
    // Strategy 2: Code exchange (for verification links with code parameter)
    if (url.includes('code=')) {
      try {
        const codeParam = extractTokenFromUrl(url, 'code');
        if (codeParam) {
          console.log('Found code parameter, attempting exchange');
          const { data, error } = await supabase.auth.exchangeCodeForSession(codeParam);
          
          if (error) {
            console.error('Error exchanging code for session:', error);
            throw error;
          }
          
          if (data?.session) {
            console.log('Session established via code exchange');
            
            // Import auth store to refresh user profile
            const { useAuthStore } = require('@/store/auth-store');
            const { checkSession } = useAuthStore.getState();
            
            // Refresh session data
            await checkSession();
            
            // Navigate home after successful auth
            router.replace('/');
            return; // Exit early, authentication was successful
          }
        }
      } catch (codeError) {
        console.error('Code exchange error:', codeError);
        // Continue to next strategy
      }
    }
    
    // Strategy 3: Session refresh (if we already have a session that needs refreshing)
    try {
      console.log('Attempting session refresh');
      const { data: refreshData } = await supabase.auth.refreshSession();
      
      if (refreshData?.session) {
        console.log('Session refreshed successfully');
        
        // Import auth store to refresh user profile
        const { useAuthStore } = require('@/store/auth-store');
        const { checkSession } = useAuthStore.getState();
        
        // Refresh session data
        await checkSession();
        
        // Navigate home after successful auth
        router.replace('/');
        return; // Exit early, authentication was successful
      }
    } catch (refreshError) {
      console.error('Session refresh error:', refreshError);
      // Continue to next strategy
    }
    
    // Strategy 4: Direct session check (if session exists but wasn't detected)
    try {
      console.log('Checking for existing session');
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData?.session) {
        console.log('Existing session found');
        
        // Import auth store to refresh user profile
        const { useAuthStore } = require('@/store/auth-store');
        const { checkSession } = useAuthStore.getState();
        
        // Refresh session data
        await checkSession();
        
        // Navigate home after successful auth
        router.replace('/');
        return; // Exit early, authentication was successful
      }
    } catch (sessionError) {
      console.error('Session check error:', sessionError);
    }
    
    // If all strategies fail, route to the callback screen for further handling
    console.log('All direct auth strategies failed, routing to callback screen');
    // Only route to callback if we're not already on that screen to prevent loops
    if (!url.includes('/auth/callback')) {
      router.push('/auth/callback' as any);
    }

    
  } catch (error: any) {
    console.error('Error processing auth link:', error);
    router.push(('/auth/callback?error=' + encodeURIComponent(error.message || 'Unknown error')) as any);
  }
};

/**
 * Extract token from Supabase auth URL
 */
const extractTokenFromUrl = (url: string, paramName: string): string | null => {
  // Extract a token from either hash fragment or query parameters
  const tokenParam = paramName + '=';
  
  // Check hash fragment first
  let startIndex = url.indexOf('#' + tokenParam);
  if (startIndex !== -1) {
    startIndex += tokenParam.length + 1; // +1 for the '#'
  } else {
    // Check query params
    startIndex = url.indexOf('?' + tokenParam);
    if (startIndex !== -1) {
      startIndex += tokenParam.length + 1; // +1 for the '?'
    } else {
      // Check if parameter is in the middle of query string
      startIndex = url.indexOf('&' + tokenParam);
      if (startIndex !== -1) {
        startIndex += tokenParam.length + 1; // +1 for the '&'
      } else {
        return null;
      }
    }
  }
  
  // Find the end of the token (next & or end of string)
  const endIndex = url.indexOf('&', startIndex);
  
  if (endIndex !== -1) {
    return url.substring(startIndex, endIndex);
  } else {
    return url.substring(startIndex);
  }
};

/**
 * Generate universal deep link to the app
 */
export const getAppDeepLink = (path: string): string => {
  const scheme = 'genzchat';
  const prefix = Platform.OS === 'android' ? `${scheme}://` : `${scheme}:`;
  return `${prefix}/${path}`;
};

/**
 * Get the redirect URL for authentication
 * This should be used when configuring Supabase auth
 */
export const getAuthRedirectUrl = (): string => {
  if (Platform.OS === 'web') {
    // For web, we can use the current URL
    return `${window.location.origin}/auth/callback`;
  }
  
  // For mobile, use app scheme - this MUST match what you've configured in app.json
  // Using the format that directly works with Supabase's auth flow
  const scheme = 'genzchat';
  
  // Ensure the format is exactly as Supabase expects for deep linking
  // The format must be: yourscheme://path/to/callback - do NOT add any additional parameters
  const callbackUrl = `${scheme}://auth/callback`;
  console.log('Mobile redirect URL:', callbackUrl);
  return callbackUrl;
};
