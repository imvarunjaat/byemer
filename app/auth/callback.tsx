import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useThemeStore } from '@/store/theme-store';
import { colors } from '@/constants/colors';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/store/auth-store';

export default function AuthCallbackScreen() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  const { handleSession, clearError, clearSuccess } = useAuthStore();

  // Helper function to extract params from URL
  const extractParamFromUrl = (url: string, paramName: string): string | null => {
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

  // Get error from URL params
  const params = useLocalSearchParams();
  const errorFromUrl = params.error as string | undefined;

  useEffect(() => {
    // Clear any previous states when callback screen mounts
    clearError();
    clearSuccess();

    // If we already have an error from the URL, display it
    if (errorFromUrl) {
      setError(errorFromUrl);
      return;
    }
    
    const handleAuthCallback = async () => {
      try {
        setMessage('Processing authentication...');
        console.log('Auth callback screen activated - attempting to process authentication');
        
        // First try to handle URL parameters which are more reliable on mobile
        const url = window.location.href;
        console.log('Processing URL:', url);
        
        // Extract code from URL if present
        if (url.includes('code=')) {
          console.log('Auth code found in URL, processing...');
          const codeMatch = url.match(/code=([^&]+)/);
          const code = codeMatch ? codeMatch[1] : null;
          
          if (code) {
            console.log('Exchanging code for session...');
            try {
              const { data: codeData, error: codeError } = await supabase.auth.exchangeCodeForSession(code);
              if (codeError) {
                console.error('Error exchanging code:', codeError);
                setError(`Authentication error: ${codeError.message}`);
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
        }
        
        // Check if we have a session directly
        console.log('Checking for existing session');
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          throw sessionError;
        }
        
        // Log session state
        console.log('Session check result:', 
                   'Data exists:', !!data,
                   'Session exists:', !!data?.session,
                   'User exists:', !!data?.session?.user);
        
        if (data?.session) {
          console.log('Auth callback - session found:', data.session.user.email);
          
          // Get user information
          const user = data.session.user;
          
          // Check if profile exists for this user
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
            
          if (profileError) {
            console.error('Error checking for profile:', profileError);
          }
          
          // If no profile exists, create one using metadata
          if (!profileData) {
            const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user';
            console.log('No profile found, creating one with username:', username);
            
            // Create profile
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                username: username,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();
              
            if (createError) {
              console.error('Error creating profile in callback:', createError);
            } else {
              console.log('Profile created in callback:', newProfile);
            }
          } else {
            console.log('Profile already exists:', profileData);
          }
          
          // Call the handleSession function from auth store to properly set up the user
          // Pass the session explicitly to ensure we're working with the latest data
          await handleSession(data.session);
          
          // Show success message with username if available
          const username = useAuthStore.getState().user?.username;
          setMessage(username ? `Welcome, ${username}!` : 'Authentication successful!');
          
          // Extra delay to ensure state is saved
          setTimeout(() => {
            // Verify authentication state was set properly
            const isAuthenticated = useAuthStore.getState().isAuthenticated;
            console.log('Auth state before redirecting:', isAuthenticated ? 'Authenticated' : 'Not authenticated');
            
            // Navigate to home screen
            router.replace('/');
          }, 1500);
        } else {
          // Try with exchange code flow as a fallback
          try {
            console.log('No session found on initial check, trying to get auth tokens');
            
            // First, try refreshing the session
            const { data: refreshResult } = await supabase.auth.refreshSession();
            if (refreshResult?.session) {
              console.log('Session refreshed successfully');
              // Process session
              await handleSession(refreshResult.session);
              setMessage('Authentication successful!');
              router.replace('/');
              return;
            }
            
            // Next, check URL parameters
            const url = window.location.href;
            const hasAuthParams = url.includes('code=') || url.includes('access_token=') || url.includes('refresh_token=');
            
            if (hasAuthParams) {
              console.log('Auth parameters found in URL, attempting token exchange');
              // Handle code exchange
              if (url.includes('code=')) {
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');
                if (code) {
                  console.log('Found code parameter, exchanging for session');
                  try {
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) {
                      console.error('Code exchange error:', error);
                      throw error;
                    }
                    if (data?.session) {
                      console.log('Session obtained from code exchange');
                      // Process session
                      await handleSession(data.session);
                      setMessage('Authentication successful!');
                      router.replace('/');
                      return;
                    }
                  } catch (exchangeError) {
                    console.error('Code exchange error:', exchangeError);
                    throw exchangeError;
                  }
                }
              }
              
              // Try direct token handling as last resort
              if (url.includes('access_token=')) {
                try {
                  const accessToken = extractParamFromUrl(url, 'access_token');
                  const refreshToken = extractParamFromUrl(url, 'refresh_token');
                  
                  if (accessToken && refreshToken) {
                    console.log('Found tokens in URL, setting session directly');
                    const { data, error } = await supabase.auth.setSession({
                      access_token: accessToken,
                      refresh_token: refreshToken
                    });
                    
                    if (error) {
                      console.error('Set session error:', error);
                      throw error;
                    }
                    
                    if (data?.session) {
                      console.log('Session set successfully from tokens');
                      await handleSession(data.session);
                      setMessage('Authentication successful!');
                      router.replace('/');
                      return;
                    }
                  }
                } catch (tokenError) {
                  console.error('Token handling error:', tokenError);
                  throw tokenError;
                }
              }
            }
            
            // If we get here, we've tried everything and failed
            throw new Error('No session found after exhausting all authentication methods');
          } catch (secondError) {
            console.error('Auth fallback error:', secondError);
            throw secondError;
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setError(error instanceof Error ? error.message : 'Authentication failed');
        
        // Give them a way to navigate back to login
        setTimeout(() => {
          setMessage('Redirecting to login...');
          setTimeout(() => {
            router.replace('/login');
          }, 1000);
        }, 2000);
      }
    };
    
    handleAuthCallback();
  }, [router, handleSession]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Authentication</Text>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
            {message}
          </Text>
        </View>
        
        {error && (
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
