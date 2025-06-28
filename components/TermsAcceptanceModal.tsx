import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Platform,
  Switch,
  BackHandler,
  Alert,
  Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';

interface TermsAcceptanceModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function TermsAcceptanceModal({ 
  visible, 
  onAccept, 
  onDecline 
}: TermsAcceptanceModalProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();
  const canContinue = termsAccepted && privacyAccepted;
  
  // Define handleDecline function first before using it in useEffect
  const handleDecline = () => {
    // Show confirmation dialog
    Alert.alert(
      "Exit Application", 
      "You must accept the Terms and Conditions and Privacy Policy to use this application. The app will now close.", 
      [
        {
          text: "Exit", 
          onPress: () => {
            // First notify callback
            onDecline();
            // Then exit app
            BackHandler.exitApp();
          },
          style: "destructive"
        },
      ],
      { cancelable: false }
    );
  };
  
  // Prevent back button from working when modal is visible
  useEffect(() => {
    if (visible) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // Handle the decline action when back is pressed
        if (visible) {
          handleDecline();
          return true; // Prevent default behavior
        }
        return false;
      });
      
      return () => backHandler.remove();
    }
  }, [visible, onDecline]);
  
  const handleAccept = async () => {
    if (!canContinue || !user) return;
    
    setLoading(true);
    try {
      // Record the user's consent in the database
      const { error } = await supabase
        .from('user_consent')
        .upsert({
          user_id: user.id,
          terms_accepted: true,
          privacy_accepted: true,
          accepted_at: new Date().toISOString(),
          version: '1.0'  // Update this version when terms change
        });
        
      if (error) {
        console.error('Error saving consent:', error);
        throw error;
      }
      
      onAccept();
    } catch (err) {
      console.error('Failed to save consent:', err);
      // Still allow them to continue even if saving failed
      onAccept();
    } finally {
      setLoading(false);
    }
  };
  
  // handleDecline function moved above
  
  // Debug log
  useEffect(() => {
    console.log('TERMS MODAL - Visibility state:', { visible, canContinue });
    if (visible) {
      console.log('TERMS MODAL - Modal is set to visible');
    }
  }, [visible, canContinue]);
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      statusBarTranslucent={true}
      // Remove onRequestClose to prevent back button from closing the modal
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.title}>Terms & Conditions</Text>
            {/* Close button removed to prevent dismissing the modal */}
          </View>
          
          <ScrollView style={styles.termsContainer}>
            <Text style={styles.sectionTitle}>Terms of Service</Text>
            <Text style={styles.termsText}>
              Welcome to our chat application. By using this service, you agree to the following terms and conditions:
              
              1. You must be at least 13 years of age to use this service.
              
              2. You are responsible for all activities that occur under your account.
              
              3. You agree not to use the service for any illegal or unauthorized purpose.
              
              4. We reserve the right to terminate your account if you violate these terms.
              
              5. We may update these terms from time to time, and it is your responsibility to review them periodically.
              
              6. Your use of the service after any changes to the terms constitutes your acceptance of the new terms.
            </Text>
            
            <Text style={styles.sectionTitle}>Privacy Policy</Text>
            <Text style={styles.termsText}>
              Our privacy policy explains how we collect, use, and protect your personal information:
              
              1. We collect minimal personal information necessary to provide our service.
              
              2. We do not sell your personal information to third parties.
              
              3. We use cookies and similar technologies to enhance your experience.
              
              4. You have the right to access, correct, or delete your personal information.
              
              5. We take reasonable measures to protect your data but cannot guarantee absolute security.
            </Text>
            
            <TouchableOpacity 
              onPress={() => Linking.openURL('https://imvarunjaat.github.io/privacy-policy/')}
              style={styles.learnMoreContainer}
            >
              <Text style={styles.learnMoreText}>Learn More</Text>
            </TouchableOpacity>
          </ScrollView>
          
          <View style={styles.acceptanceContainer}>
            <View style={styles.switchRow}>
              <Switch
                value={termsAccepted}
                onValueChange={setTermsAccepted}
                trackColor={{ false: '#d1d1d1', true: '#4caf50' }}
                thumbColor={Platform.OS === 'ios' ? undefined : termsAccepted ? '#fff' : '#f4f3f4'}
              />
              <Text style={styles.acceptanceText}>
                I accept the Terms of Service
              </Text>
            </View>
            
            <View style={styles.switchRow}>
              <Switch
                value={privacyAccepted}
                onValueChange={setPrivacyAccepted}
                trackColor={{ false: '#d1d1d1', true: '#4caf50' }}
                thumbColor={Platform.OS === 'ios' ? undefined : privacyAccepted ? '#fff' : '#f4f3f4'}
              />
              <Text style={styles.acceptanceText}>
                I accept the Privacy Policy
              </Text>
            </View>
          </View>
          
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={handleDecline}
            >
              <Text style={styles.buttonText}>Decline & Exit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.acceptButton, !canContinue && styles.disabledButton]}
              onPress={handleAccept}
              disabled={!canContinue || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Accept & Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
    zIndex: 1000,
  },
  learnMoreContainer: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 12,
    paddingRight: 5,
  },
  learnMoreText: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  modalView: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  termsContainer: {
    padding: 16,
    maxHeight: 300,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  termsText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 16,
  },
  acceptanceContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  acceptanceText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  button: {
    flex: 1,
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  acceptButton: {
    backgroundColor: '#4caf50',
  },
  declineButton: {
    backgroundColor: '#f44336',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
