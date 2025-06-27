import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '@/store/theme-store';
import { colors } from '@/constants/colors';
import { Button } from '@/components/Button';
import { FontAwesome } from '@expo/vector-icons';

export default function AuthErrorScreen() {
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;

  const handleLogin = () => {
    router.replace('/login');
  };

  const handleHome = () => {
    router.replace('/');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <FontAwesome name="exclamation-circle" size={64} color={theme.error} />
        </View>
        
        <Text style={[styles.title, { color: theme.text }]}>Authentication Error</Text>
        
        <Text style={[styles.message, { color: theme.secondaryText }]}>
          We couldn't complete the authentication process. This might happen if the verification 
          link is expired or invalid.
        </Text>
        
        <View style={styles.buttonContainer}>
          <Button 
            title="Try Logging In" 
            onPress={handleLogin} 
            style={styles.button}
          />
          <Button 
            title="Go Home" 
            onPress={handleHome}
            variant="secondary"
            style={styles.button}
          />
        </View>
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
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
  }
});
