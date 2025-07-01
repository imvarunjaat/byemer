import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useThemeStore } from '@/store/theme-store';
import { colors } from '@/constants/colors';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/store/auth-store';
import { processAuthUrl, getWindowLocation } from '@/lib/platform-utils';

export default function AuthCallbackScreen() {
  const [message, setMessage] = useState('Processing authentication...');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const hasInitiatedAuth = useRef(false);
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  const { handleSession, clearError, clearSuccess } = useAuthStore();

  // Get params from URL - this works on both web and mobile
  const params = useLocalSearchParams();

  useEffect(() => {
    // Only run once by tracking if we've already initiated the auth process
    if (hasInitiatedAuth.current) return;
    hasInitiatedAuth.current = true;
    
    // Clear any previous states when callback screen mounts
    clearError();
    clearSuccess();

    // If we already have an error from the URL params, display it
    const urlError = params.error ? 
      (Array.isArray(params.error) ? params.error[0] : String(params.error)) : null;
      
    if (urlError) {
      setError(String(urlError));
      setIsProcessing(false);
      return;
    }
    
    const handleAuthCallback = async () => {
      try {
        setMessage('Processing authentication...');
        console.log('Auth callback screen activated - attempting to process authentication');
        
        // Get URL and parameters using our platform-aware utility
        let url: string | null = null;
        
        // On web, we can use window.location
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
          url = window.location.href;
          console.log('Processing web URL:', url);
        } else {
          console.log('Mobile platform detected, using direct params');
        }
        
        // Process auth data from URL and params
        const { code, accessToken, refreshToken } = await processAuthUrl(url, params);
        
        // Try with code exchange if available
        if (code) {
          console.log('Auth code found, processing...');
          
          try {
            const { data: codeData, error: codeError } = await supabase.auth.exchangeCodeForSession(
              Array.isArray(code) ? code[0] : String(code)
            );
            
            if (codeError) {
              console.error('Error exchanging code:', codeError);
              setError(`Authentication error: ${codeError.message}`);
              setIsProcessing(false);
              return;
            }
            
            if (codeData?.session) {
              console.log('Successfully authenticated via code exchange!');
              await handleSession(codeData.session);
              setMessage('Authentication successful!');
              setTimeout(() => router.replace('/'), 1000);
              return;
            }
          } catch (exchangeError) {
            console.error('Failed to exchange code:', exchangeError);
          }
        }
        
        // Try with direct token handling if available
        if (accessToken && refreshToken) {
          console.log('Found tokens, setting session directly');
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: String(accessToken),
              refresh_token: String(refreshToken)
            });
            
            if (error) {
              console.error('Set session error:', error);
              throw error;
            }
            
            if (data?.session) {
              console.log('Session set successfully from tokens');
              await handleSession(data.session);
              setMessage('Authentication successful!');
              setTimeout(() => router.replace('/'), 1000);
              return;
            }
          } catch (tokenError) {
            console.error('Token handling error:', tokenError);
          }
        }
        
        // Check if we have an existing session
        console.log('Checking for existing session');
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          throw sessionError;
        }
        
        if (data?.session) {
          console.log('Found existing session');
          await handleSession(data.session);
          setMessage('Authentication successful!');
          setTimeout(() => router.replace('/'), 1000);
          return;
        }
        
        // If we get here, no authentication method worked
        throw new Error('No authentication data found');
        
      } catch (error) {
        console.error('Auth callback error:', error);
        setError(error instanceof Error ? error.message : 'Authentication failed');
        setIsProcessing(false);
      }
    };
    
    // Execute auth callback handler
    handleAuthCallback();
  }, [router, handleSession, params]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Authentication</Text>
        
        {isProcessing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
              {message}
            </Text>
          </View>
        ) : error ? (
          <View style={styles.messageContainer}>
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              Please try logging in again.
            </Text>
            <Button 
              title="Go to Login" 
              onPress={() => router.replace('/login')} 
              style={styles.button}
            />
          </View>
        ) : (
          <View style={styles.messageContainer}>
            <Text style={[styles.successText, { color: theme.success }]}>{message}</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              Redirecting you to the app...
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    width: '100%',
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    marginTop: 16,
    width: '100%',
  }
});
