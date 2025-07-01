import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

/**
 * Platform-aware utilities for handling URLs and deep links
 */

/**
 * Safely process a URL string, handling platform differences
 * @param url The URL string to process - optional for mobile platforms
 * @param params URL parameters from Expo Router (for mobile platforms)
 * @returns An object with extracted tokens and parameters
 */
export const processAuthUrl = async (url?: string | null, params?: Record<string, any>) => {
  try {
    // Get parameters from different sources based on platform
    const accessToken = 
      // From params directly (mobile)
      (params?.access_token ? 
        (Array.isArray(params.access_token) ? params.access_token[0] : params.access_token) : 
        // From URL extraction (web)
        (url && extractTokenFromUrl(url, 'access_token')));
    
    const refreshToken = 
      // From params directly (mobile)
      (params?.refresh_token ? 
        (Array.isArray(params.refresh_token) ? params.refresh_token[0] : params.refresh_token) : 
        // From URL extraction (web)
        (url && extractTokenFromUrl(url, 'refresh_token')));
        
    const code = 
      // From params directly (mobile)
      (params?.code ? 
        (Array.isArray(params.code) ? params.code[0] : params.code) : 
        // From URL extraction (web)
        (url && extractTokenFromUrl(url, 'code')));
    
    return {
      accessToken,
      refreshToken,
      code,
      url,
      params
    };
  } catch (error) {
    console.error('Error processing auth URL:', error);
    return {
      accessToken: null,
      refreshToken: null,
      code: null,
      url,
      params,
      error
    };
  }
};

/**
 * Safely access window.location on web, returns null on mobile
 */
export const getWindowLocation = (): Location | null => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    return window.location;
  }
  return null;
};

/**
 * Extract a token from URL parameters
 * Works with both hash fragments and query parameters
 */
export const extractTokenFromUrl = (url: string, paramName: string): string | null => {
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
        return null; // Parameter not found
      }
    }
  }
  
  // Find the end of the token (next & or end of string)
  let endIndex = url.indexOf('&', startIndex);
  if (endIndex === -1) {
    endIndex = url.length;
  }
  
  // Extract and decode the token
  return decodeURIComponent(url.substring(startIndex, endIndex));
};
