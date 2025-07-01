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

  useEffect(() => {
    // Clear any previous states when callback screen mounts
    clearError();
    clearSuccess();
    
    const handleAuthCallback = async () => {
      try {
        setMessage('Processing authentication...');
        
        // Check if we have a session
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
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
          throw new Error('No session found after authentication');
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
