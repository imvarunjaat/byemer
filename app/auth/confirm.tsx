import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useThemeStore } from '@/store/theme-store';
import { colors } from '@/constants/colors';
import { Button } from '@/components/Button';

export default function ConfirmScreen() {
  const { type, token, error: errorParam } = useLocalSearchParams();
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(errorParam?.toString() || null);
  const [message, setMessage] = React.useState('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      // For all types of authentication redirects, just redirect to home
      // This handles OTP and email confirmation redirects from Supabase
      
      setLoading(true);
      
      try {
        // Check if we already have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session) {
          // We have a valid session, redirect to home
          setTimeout(() => {
            router.replace('/');
          }, 1500);
          setMessage('Authentication successful! Redirecting...');
        } else {
          // No valid session, show login button
          setMessage('Verification complete. Please log in.');
        }
      } catch (err: any) {
        // Don't show errors, just redirect to login
        setMessage('Please sign in to continue.');
        console.log('Auth redirect handling:', err?.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    handleEmailConfirmation();
  }, [type, token]);

  const handleLogin = () => {
    router.push('/login');
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Email Verification</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
              Verifying your email...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.messageContainer}>
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
            <Button 
              title="Go Back" 
              onPress={handleBack} 
              style={styles.button}
            />
          </View>
        ) : (
          <View style={styles.messageContainer}>
            <Text style={[styles.successText, { color: theme.success }]}>{message}</Text>
            <Button 
              title="Log In" 
              onPress={handleLogin} 
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
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
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
