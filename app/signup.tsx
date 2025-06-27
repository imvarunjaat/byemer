import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Keyboard,
  Animated,
  Dimensions,
  Platform,
  Alert
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Feather } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFValue } from 'react-native-responsive-fontsize';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuthRedirectUrl } from '@/lib/deep-linking';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '@/store/theme-store';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

import { InputField } from '@/components/InputField';
import { Button } from '../components/Button';
import { userService } from '@/lib/user-service';

export default function SignupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const redirectMessage = params.message as string;
  const redirectedEmail = params.email as string;
  
  const { isDarkMode } = useThemeStore();
  const { 
    signup, 
    error: authError, 
    success: authSuccess,
    verificationPending, 
    isLoading: authLoading, 
    clearError,
    clearSuccess 
  } = useAuthStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(redirectedEmail || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(redirectMessage || null);
  const [emailSent, setEmailSent] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // Display effects
  useEffect(() => {
    if (infoMessage) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }).start();
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true
        }).start(() => setInfoMessage(null));
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [infoMessage, fadeAnim]);
  
  // Handle verification pending state
  useEffect(() => {
    if (verificationPending) {
      setEmailSent(true);
      
      // Force a refresh of the user profile data
      const { checkSession } = useAuthStore.getState();
      setTimeout(() => {
        console.log('Verification pending in signup, refreshing profile data...');
        checkSession();
      }, 1000);
    }
  }, [verificationPending, authSuccess]);
  
  // Validate email format
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailSignup = async () => {
    Keyboard.dismiss();
    
    if (!username) {
      setError('Username is required');
      return;
    }
    
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First check if username is available
      const usernameAvailable = await userService.isUsernameAvailable(username);
      if (!usernameAvailable) {
        setError('This username is already taken. Please choose another one.');
        setIsLoading(false);
        return;
      }

      // IMPORTANT: Skip all email existence checks entirely
      // Let Supabase's signup method handle duplicate emails directly
      console.log('Attempting signup with username:', username, 'email:', email);
      
      // Call signup directly without any pre-checks for email existence
      await signup(username, email);
      
      // If signup succeeds (no error thrown), we don't need to do anything else
      // The auth store will update verification state, which our useEffect will catch
      console.log('Signup request successful');
      
    } catch (err: any) {
      console.log('Signup error:', err.message);
      
      // Extract the error message
      const errorMsg = err.message || '';
      
      // Special handling for "email exists" errors
      if (errorMsg.toLowerCase().includes('already registered') || 
          errorMsg.toLowerCase().includes('already in use') ||
          errorMsg.toLowerCase().includes('email exists')) {
        
        console.log('Email already exists - redirecting to login');
        
        setError(null);
        setSuccess('Email already registered. Redirecting to login...');
        setEmailSent(false);
        
        // Add slight delay before redirecting to allow user to see the message
        setTimeout(() => {
          router.push({
            pathname: '/login',
            params: { 
              message: 'This email is already registered. Please sign in instead.',
              email: email
            }
          });
        }, 1500);
        
        return;
      } 
      
      // Handle rate limiting errors gracefully
      else if (errorMsg.toLowerCase().includes('rate limit')) {
        setError('Please wait a moment before trying again.');
      }
      
      // Generic error fallback
      else {
        setError(errorMsg || 'Failed to create account');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const navigateToLogin = () => {
    // Clear states before navigation
    clearError();
    clearSuccess();
    setEmailSent(false);
    router.push('/login');
  };
  
  const goBack = () => {
    router.back();
  };
  
  const { width, height } = Dimensions.get('window');
  const isSmallDevice = width < 375;
  
  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid={true}
    >
      <LinearGradient
        colors={isDarkMode 
          ? ['#121212', '#1E1E1E', '#121212'] 
          : ['#FFFFFF', '#F8F9FA', '#FFFFFF']}
        style={styles.background}
      >
        <Animated.View 
          style={[
            styles.infoContainer,
            {
              opacity: fadeAnim,
              display: infoMessage ? 'flex' : 'none',
              backgroundColor: isDarkMode ? '#333333' : '#F0F0F0'
            }
          ]}
        >
          <Feather name="info" size={20} color={isDarkMode ? '#FFFFFF' : '#333333'} />
          <Text style={[styles.infoText, { color: theme.text }]}>{infoMessage}</Text>
        </Animated.View>

        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Feather name="arrow-left" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerText, { color: theme.text }]}>Create Account</Text>
          <View style={{ width: 24 }} />
        </View>

        {emailSent ? (
          <View style={styles.verificationContainer}>
            <View style={styles.iconContainer}>
              <Feather name="mail" size={60} color={theme.accent} />
            </View>
            <Text style={[styles.verificationTitle, { color: theme.text }]}>Verification Email Sent</Text>
            <Text style={[styles.verificationText, { color: theme.secondaryText }]}>
              We've sent a verification link to:
            </Text>
            <Text style={[styles.emailText, { color: theme.text }]}>{email}</Text>
            <Text style={[styles.verificationText, { color: theme.secondaryText, marginTop: 20 }]}>
              Please check your email and follow the link to complete your registration.
            </Text>
            
            <Button
              title="Back to Login"
              onPress={navigateToLogin}
              style={styles.backToLoginButton}
              textStyle={{ fontWeight: 'bold' }}
              variant="outline"
            />
          </View>
        ) : (
          <View style={styles.formContainer}>
            <View style={styles.iconContainer}>
              <Feather name="user-plus" size={40} color={theme.accent} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Join the Conversation</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              Create an anonymous profile to start chatting
            </Text>

            <View style={styles.inputsContainer}>
              <InputField
                label="Username"
                placeholder="Choose a unique username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                leftIcon={<Feather name="user" size={20} color={theme.secondaryText} />}
              />
              
              <InputField
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                leftIcon={<Feather name="mail" size={20} color={theme.secondaryText} />}
              />

              {error && (
                <View style={styles.errorContainer}>
                  <Feather name="alert-circle" size={16} color="#FF4D4F" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {authError && !error && (
                <View style={styles.errorContainer}>
                  <Feather name="alert-circle" size={16} color="#FF4D4F" />
                  <Text style={styles.errorText}>{authError}</Text>
                </View>
              )}

              {authSuccess && (
                <View style={styles.successContainer}>
                  <Feather name="check-circle" size={16} color="#52C41A" />
                  <Text style={styles.successText}>{authSuccess}</Text>
                </View>
              )}

                <Button
                  title="Sign Up"
                  onPress={handleEmailSignup}
                  loading={isLoading || authLoading}
                  style={styles.signupButton}
                  textStyle={{ fontWeight: 'bold', fontSize: RFValue(16) }}
                />

              <View style={styles.dividerContainer}>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <Text style={[styles.dividerText, { color: theme.secondaryText }]}>OR</Text>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
              </View>

              <View style={styles.loginTextContainer}>
                <Text style={[styles.loginText, { color: theme.secondaryText }]}>
                  Already have an account?
                </Text>
                <TouchableOpacity onPress={navigateToLogin}>
                  <Text style={styles.loginLink}>Log In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </LinearGradient>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
  },
  container: {
    flexGrow: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingTop: Platform.OS === 'ios' ? hp(6) : hp(4),
    paddingBottom: hp(2),
  },
  headerText: {
    fontSize: RFValue(18),
    fontWeight: '600',
  },
  backButton: {
    padding: 8,
  },
  formContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: wp(6),
    paddingTop: hp(4),
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(90, 80, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(3),
  },
  title: {
    fontSize: RFValue(24),
    fontWeight: 'bold',
    marginBottom: hp(1),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: RFValue(14),
    marginBottom: hp(4),
    textAlign: 'center',
    maxWidth: '80%',
  },
  inputsContainer: {
    width: '100%',
    maxWidth: 400,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: hp(1),
    paddingHorizontal: wp(2),
  },
  errorText: {
    color: '#FF4D4F',
    marginLeft: 8,
    fontSize: RFValue(12),
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: hp(1),
    paddingHorizontal: wp(2),
  },
  successText: {
    color: '#52C41A',
    marginLeft: 8,
    fontSize: RFValue(12),
  },
  signupButton: {
    marginTop: hp(3),
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: hp(3),
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: wp(3),
    fontSize: RFValue(12),
  },
  loginTextContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp(2),
  },
  loginText: {
    fontSize: RFValue(14),
    marginRight: 5,
  },
  loginLink: {
    color: '#5A50FF',
    fontWeight: '600',
    fontSize: RFValue(14),
  },
  verificationContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: wp(6),
    paddingTop: hp(6),
  },
  verificationTitle: {
    fontSize: RFValue(22),
    fontWeight: 'bold',
    marginTop: hp(3),
    marginBottom: hp(2),
  },
  verificationText: {
    fontSize: RFValue(14),
    textAlign: 'center',
    maxWidth: '90%',
  },
  emailText: {
    fontSize: RFValue(16),
    fontWeight: '600',
    marginTop: hp(1),
  },
  backToLoginButton: {
    marginTop: hp(4),
    width: wp(70),
    maxWidth: 280,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(4),
    marginHorizontal: wp(4),
    marginTop: hp(2),
    borderRadius: 8,
  },
  infoText: {
    marginLeft: 10,
    flex: 1,
    fontSize: RFValue(13),
  },
});
