import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import TermsAcceptanceModal from '@/components/TermsAcceptanceModal';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'expo-router';

export default function TermsTestScreen() {
  const [showModal, setShowModal] = useState(false);
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleAccept = () => {
    console.log('Terms accepted');
    setShowModal(false);
    // Navigate to home screen
    router.replace('/(tabs)');
  };
  
  const handleDecline = () => {
    console.log('Terms declined');
    setShowModal(false);
    // Log out the user
    logout();
    router.replace('/');
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Terms and Conditions Test</Text>
      <Text style={styles.subtitle}>
        This screen helps troubleshoot the terms and conditions modal
      </Text>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.buttonText}>Show Terms Modal</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, {backgroundColor: '#f44336'}]} 
        onPress={() => router.back()}
      >
        <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity>

      <TermsAcceptanceModal
        visible={showModal}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#6C63FF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
