import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { supabase } from './supabase';

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
    
    // For Supabase auth links, we need to manually process the URL
    // and then check the session
    if (url.includes('#access_token=') || url.includes('?access_token=')) {
      // This is a full OAuth or magic link response with tokens in the URL
      const { data, error } = await supabase.auth.setSession({
        access_token: extractTokenFromUrl(url, 'access_token'),
        refresh_token: extractTokenFromUrl(url, 'refresh_token')
      });
      
      console.log('Set session result:', data ? 'Success' : 'Failed', error ? error.message : '');
    } else {
      // For verification links or other auth links, just route to the callback
      console.log('Routing to auth callback screen');
      router.push('/auth/callback' as any);
      return;
    }
    
    // After processing, check if we have a session
    setTimeout(async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth session error:', error);
        router.push(('/auth/callback?error=' + encodeURIComponent(error.message)) as any);
        return;
      }
      
      if (data && data.session) {
        console.log('Successfully authenticated via deep link');
        // Navigate to home screen or landing page
        router.replace('/');
      } else {
        // No session found, route to login
        console.log('No session found after auth link');
        router.push('/auth/callback?error=No%20session%20found' as any);
      }
    }, 1000); // Increased timeout for better reliability
    
  } catch (error: any) {
    console.error('Error processing auth link:', error);
    router.push(('/auth/callback?error=' + encodeURIComponent(error.message || 'Unknown error')) as any);
  }
};

/**
 * Extract token from Supabase auth URL
 */
const extractTokenFromUrl = (url: string, paramName: string): string => {
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
        return '';
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
  const typeParam = 'type=';
  
  // Try to find token in URL
  if (url.includes(tokenParam)) {
    const tokenStart = url.indexOf(tokenParam) + tokenParam.length;
    const tokenEnd = url.indexOf('&', tokenStart);
    
    if (tokenEnd > tokenStart) {
      return url.substring(tokenStart, tokenEnd);
    } else {
      return url.substring(tokenStart);
    }
  }
  
  return '';
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
  
  // For mobile, use app scheme
  return getAppDeepLink('auth/callback');
};
