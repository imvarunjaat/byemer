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
import { useRouter } from 'expo-router';
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
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // Animation on component mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
    
    // Reset email sent state and clear any previous states when component mounts
    setEmailSent(false);
    clearError();
    clearSuccess();
    
    return () => {
      clearError();
      clearSuccess();
    };
  }, []);
  
  // Update emailSent state when auth store indicates verification is pending
  useEffect(() => {
    if (verificationPending && authSuccess) {
      setEmailSent(true);
    }
  }, [verificationPending, authSuccess]);
  
  // Validate email format
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignup = async () => {
    // Validate inputs
    if (!username.trim()) {
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
        return;
      }

      // Check if email already exists in the auth system
      const { data: existingUserCheck } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false // This will fail if user doesn't exist
        }
      });

      // If we get here and the request didn't fail, the email exists
      // Redirect user to login with message and email
      setIsLoading(false);
      clearError();
      clearSuccess();
      setEmailSent(false);
      router.push({
        pathname: '/login',
        params: { 
          message: 'This email is already registered. Please sign in instead.',
          email: email
        }
      });
      return;
    } catch (err: any) {
      // Error code 400 with message "User doesn't exist" means email is not registered
      // This is a good case for signup - email doesn't exist
      if (err.message && err.message.includes("User doesn't exist")) {
        try {
          // Use the signup method from our auth store
          // Success state will be handled by the useEffect watching verificationPending
          await signup(username, email);
        } catch (signupErr: any) {
          setError(signupErr.message || 'Failed to create account');
        }
      } else {
        // Any other error
        setError(err.message || 'Failed to create account');
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
            styles.content, 
            { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0]
            })}] }
          ]}
        >
          <TouchableOpacity 
            onPress={goBack} 
            style={[styles.backButton, { backgroundColor: theme.accent + '15' }]}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={22} color={theme.accent} />
          </TouchableOpacity>
          
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              Sign up to start chatting anonymously
            </Text>
          </View>
          
          <View style={[styles.formCard, { backgroundColor: theme.card }]}>
            {!emailSent ? (
              <>
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Username</Text>
                  <InputField
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Choose a username"
                    containerStyle={styles.fieldContainer}
                    placeholderTextColor={theme.secondaryText}
                    autoCapitalize="none"
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Email</Text>
                  <InputField
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Your email address"
                    keyboardType="email-address"
                    containerStyle={styles.fieldContainer}
                    placeholderTextColor={theme.secondaryText}
                    autoCapitalize="none"
                  />
                </View>
                
                <Text style={[styles.infoText, { color: theme.secondaryText }]}>
                  We'll send a verification email to this address. No password required!
                </Text>
                
                <Button
                  title="Sign Up"
                  onPress={handleSignup}
                  loading={isLoading || authLoading}
                  style={styles.signupButton}
                  textStyle={{ fontWeight: 'bold', fontSize: RFValue(16) }}
                />
                
                {(error || authError) && (
                  <Text style={[styles.errorText, { color: theme.error || '#ff3b30' }]}>
                    {error || authError}
                  </Text>
                )}
              </>
            ) : (
              <View style={styles.successContainer}>
                <Feather name="mail" size={60} color={theme.accent} />
                <Text style={[styles.title, { color: theme.text, marginTop: 20 }]}>
                  Verification Email Sent!
                </Text>
                <Text style={[styles.subtitle, { color: theme.secondaryText, textAlign: 'center' }]}>
                  Please check your email and click the verification link to complete your registration.
                </Text>
              </View>
            )}
            
            <View style={styles.loginContainer}>
              <Text style={[styles.loginText, { color: theme.secondaryText }]}>
                Already have an account?
              </Text>
              <TouchableOpacity onPress={navigateToLogin}>
                <Text style={[styles.loginLink, { color: theme.accent }]}>
                  {" Sign In"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    color: '#ff3b30',
  },
  fieldContainer: {
    marginBottom: 0,
  },
  infoText: {
    fontSize: 14,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  otpContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  otpInput: {
    width: '100%',
    marginBottom: 8,
  },
  countdownText: {
    fontSize: 14,
    marginTop: 12,
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 12,
    padding: 8,
  },
  resendText: {
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  container: {
    flexGrow: 1,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    padding: wp('5%'),
    paddingTop: Platform.OS === 'ios' ? hp('6%') : hp('4%'),
  },
  backButton: {
    width: Math.min(wp('11%'), 44),
    height: Math.min(wp('11%'), 44),
    borderRadius: Math.min(wp('5.5%'), 22),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp('3%'),
  },
  header: {
    marginBottom: hp('5%'),
    width: '100%',
  },
  title: {
    fontSize: Math.min(RFValue(30), hp('4.2%')),
    fontWeight: 'bold',
    marginBottom: hp('1.2%'),
    includeFontPadding: false,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: Math.min(RFValue(16), hp('2.2%')),
    opacity: 0.8,
    includeFontPadding: false,
    letterSpacing: 0.2,
  },
  formCard: {
    borderRadius: Math.min(wp('5%'), 20),
    padding: wp('7%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inputContainer: {
    marginBottom: hp('3%'),
    width: '100%',
  },
  inputLabel: {
    fontSize: Math.min(RFValue(14), hp('2%')),
    fontWeight: '600',
    marginBottom: hp('1.2%'),
    includeFontPadding: false,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: Math.min(wp('3.5%'), 16),
    paddingHorizontal: wp('4%'),
    height: Math.min(hp('7%'), 55),
    minHeight: 48,
    paddingVertical: 0,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp('3%'),
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: Math.min(RFValue(15), hp('2.1%')),
    includeFontPadding: false,
    textAlignVertical: 'center',
    paddingVertical: 0,
    paddingRight: 40,
  },
  eyeIcon: {
    height: '100%',
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  signupButton: {
    height: Math.min(hp('7%'), 55),
    minHeight: 48,
    borderRadius: Math.min(wp('3.5%'), 16),
    marginBottom: hp('3%'),
    marginTop: hp('1%'),
    width: '100%',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: RFValue(14),
  },
  loginLink: {
    fontSize: Math.min(RFValue(14), hp('2%')),
    fontWeight: '600',
    includeFontPadding: false,
  },
});
