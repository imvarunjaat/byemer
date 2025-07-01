import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useThemeStore } from '@/store/theme-store';
import { colors } from '@/constants/colors';
import { OTPLogin } from '@/components/OTPLogin';
import { FontAwesome } from '@expo/vector-icons';

export default function OTPLoginScreen() {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  
  const handleGoBack = () => {
    router.back();
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={handleGoBack}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <FontAwesome name="arrow-left" size={24} color={theme.text} />
      </TouchableOpacity>
      
      <View style={styles.content}>
        <OTPLogin />
        
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.secondaryText }]}>
            Prefer password login? {' '}
            <Text 
              style={[styles.footerLink, { color: theme.accent }]}
              onPress={() => router.push('/login')}
            >
              Login with Password
            </Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 16,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: 0,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontWeight: '600',
  },
});
