

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
  Alert,
  TextInput
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

import { InputField } from '@/components/InputField';
import { Button } from '../components/Button';
// Using useState from React import above

export default function LoginScreen() {
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const { 
    login, 
    error: authError, 
    success: authSuccess, 
    isLoading, 
    clearError, 
    clearSuccess 
  } = useAuthStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  
  const [email, setEmail] = useState('');
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

  // Handle success state changes from auth store
  useEffect(() => {
    if (authSuccess && authSuccess.includes('Verification email sent')) {
      setEmailSent(true);
    }
  }, [authSuccess]);
  
  const navigateToSignup = () => {
    // Clear states before navigation
    clearError();
    clearSuccess();
    setEmailSent(false);
    router.push('/signup');
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
            <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              Sign in to continue using isThatu
            </Text>
          </View>
          
          <View style={[styles.formCard, { backgroundColor: theme.card }]}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Email address</Text>
              <View style={[styles.inputWrapper, { borderColor: theme.border }]}>
                <View style={styles.iconContainer}>
                  <Feather name="mail" size={20} color={theme.secondaryText} />
                </View>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="your@email.com"
                  placeholderTextColor={theme.secondaryText}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={email}
                  onChangeText={(text: string) => setEmail(text)}
                  editable={!isLoading}
                />
              </View>
            </View>

            {emailSent && (
              <View style={styles.successContainer}>
                <Feather name="check-circle" size={18} color={theme.success || '#4CAF50'} style={styles.successIcon} />
                <Text style={[styles.successText, { color: theme.success || '#4CAF50' }]}>
                  Verification email sent! Please check your inbox.
                </Text>
              </View>
            )}

            {authError && !emailSent && (
              <Text style={[styles.errorText, { color: theme.error || '#ff3b30' }]}>
                {authError}
              </Text>
            )}

            <Button
              title={isLoading ? 'Sending...' : 'Send Login Link'}
              onPress={() => {
                if (email && !isLoading) {
                  clearError(); // Clear any previous errors
                  login(email);
                  // Success will be handled by the useEffect
                }
              }}
              style={styles.button}
              disabled={!email || isLoading}
            />
            
            <View style={styles.signupContainer}>
              <Text style={[styles.signupText, { color: theme.secondaryText }]}>
                Don't have an account?
              </Text>
              <TouchableOpacity onPress={navigateToSignup}>
                <Text style={[styles.signupLink, { color: theme.accent }]}>
                  {" Sign Up"}
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
  // Main input style
  button: {
    marginTop: hp('3%'),
  },
  errorText: {
    marginTop: hp('2%'),
    fontSize: Math.min(RFValue(14), hp('2%')),
    textAlign: 'center',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: hp('2%'),
  },
  successIcon: {
    marginRight: 8,
  },
  successText: {
    fontSize: Math.min(RFValue(14), hp('2%')),
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 0,
  },
  container: {
    flexGrow: 1,
    minHeight: hp('100%'),
  },
  background: {
    flex: 1,
    width: '100%',
    minHeight: hp('100%'),
  },
  content: {
    flex: 1,
    paddingHorizontal: wp('5%'),
    paddingTop: Platform.OS === 'ios' ? hp('6%') : hp('4%'),
    paddingBottom: hp('4%'),
    justifyContent: 'flex-start',
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: hp('3%'),
    paddingVertical: hp('1%'),
  },
  forgotPasswordText: {
    fontSize: Math.min(RFValue(14), hp('2%')),
    fontWeight: '600',
    includeFontPadding: false,
    textDecorationLine: 'underline',
    opacity: 0.9,
  },
  loginButton: {
    height: Math.min(hp('7%'), 55),
    minHeight: 48,
    borderRadius: Math.min(wp('3.5%'), 16),
    marginBottom: hp('3%'),
    marginTop: hp('1%'),
    width: '100%',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: hp('1%'),
  },
  signupText: {
    fontSize: Math.min(RFValue(14), hp('2%')),
    includeFontPadding: false,
  },
  signupLink: {
    fontSize: Math.min(RFValue(14), hp('2%')),
    fontWeight: '600',
    includeFontPadding: false,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(150,150,150,0.2)',
    width: '100%',
    marginVertical: hp('2%'),
  },
  otpButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: hp('1.5%'),
    width: '100%',
  },
  otpIcon: {
    marginRight: 8,
  },
  otpButtonText: {
    fontSize: Math.min(RFValue(14), hp('2%')),
    fontWeight: '500',
    includeFontPadding: false,
  },
});
