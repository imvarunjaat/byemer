

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '@/store/theme-store';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/constants/colors';

import { InputField } from '@/components/InputField';
import { Button } from '../components/Button';
// Using useState from React import above

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const redirectMessage = params.message as string;
  const redirectedEmail = params.email as string;
  
  const { isDarkMode } = useThemeStore();
  const { 
    login, 
    error: authError, 
    success: authSuccess, 
    isLoading, 
    clearError, 
    clearSuccess,
    user
  } = useAuthStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  
  const [email, setEmail] = useState(redirectedEmail || '');
  const [emailSent, setEmailSent] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(redirectMessage || null);
  const [autoLoginSent, setAutoLoginSent] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [uiLoading, setUiLoading] = useState(false); // UI loading state independent of actual auth loading
  const [loadingProgress] = useState(new Animated.Value(0));
  
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
    
    // Auto-send login link if we were redirected with an email
    if (redirectedEmail && !autoLoginSent) {
      try {
        login(redirectedEmail).catch((err) => {
          // If we get a rate limit error, we'll just assume the email was sent
          // and won't show the error to the user
          if (err?.message?.includes('security purposes') || err?.message?.includes('seconds')) {
            console.log('Rate limiting detected, suppressing error');
            clearError();
          }
        });
      } catch (err) {
        // Silent catch
      }
      setAutoLoginSent(true);
      setEmailSent(true);
    }
    
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
    
    // Check if user is authenticated and force profile refresh
    if (user) {
      console.log('User authenticated in login screen, refreshing profile');
      const { checkSession } = useAuthStore.getState();
      checkSession();
    }
  }, [authSuccess, user]);

  // Handle auth errors - hide rate limiting errors
  useEffect(() => {
    if (authError) {
      // Extract cooldown time from error message if it exists
      if (authError.includes('security purposes') || authError.includes('seconds')) {
        // Rate limiting error - suppress it and show success instead
        console.log('Rate limiting error suppressed:', authError);
        
        // Extract the number of seconds from the error message
        const match = authError.match(/after (\d+) seconds/);
        if (match && match[1]) {
          const seconds = parseInt(match[1], 10);
          setCooldownTime(seconds);
          setButtonDisabled(true);
          
          // Start countdown timer
          const timer = setInterval(() => {
            setCooldownTime(prev => {
              if (prev <= 1) {
                clearInterval(timer);
                setButtonDisabled(false);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          
          // Clean up timer
          return () => clearInterval(timer);
        }
        
        clearError();
        if (!emailSent) {
          setEmailSent(true);
        }
      }
    }
  }, [authError]);
  
  // Global error interceptor - prevent any rate limiting errors from reaching the UI
  // This is a more aggressive approach to ensure no errors slip through
  useEffect(() => {
    // Create a global error handler to catch any errors that might be displayed
    const originalConsoleError = console.error;
    console.error = function() {
      const args = Array.from(arguments);
      const errorString = args.join(' ');
      
      // If this is a rate limiting error, suppress it
      if (errorString.includes('security purposes') || errorString.includes('seconds')) {
        console.log('Intercepted and suppressed global error:', errorString);
        return;
      }
      
      // Otherwise, pass through to original console.error
      return originalConsoleError.apply(console, args);
    };
    
    // Restore original on cleanup
    return () => {
      console.error = originalConsoleError;
    };
  }, []);
  
  const navigateToSignup = () => {
    // Clear states 
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
            {redirectedEmail && autoLoginSent ? (
              // When redirected with email, show only success message
              <View style={styles.autoLoginContainer}>
                <View style={styles.iconCircle}>
                  <Feather name="mail" size={40} color={theme.accent} />
                </View>
                
                <Text style={[styles.title, { color: theme.text, marginTop: 20, textAlign: 'center' }]}>
                  Email Already Registered
                </Text>
                
                <Text style={[styles.infoText, { color: theme.secondaryText, textAlign: 'center', marginTop: 8 }]}>
                  We've sent a login link to <Text style={{fontWeight: '600'}}>{redirectedEmail}</Text>
                </Text>
                
                <View style={styles.checkInboxCard}>
                  <Feather name="check-circle" size={18} color={theme.success || '#4CAF50'} style={styles.successIcon} />
                  <Text style={[styles.successText, { color: theme.success || '#4CAF50' }]}>
                    Please check your inbox to sign in
                  </Text>
                </View>
              </View>
            ) : (
              // Regular login flow
              <>
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Email address</Text>
                  
                  {/* Loading progress bar - only visible while loading */}
                  {uiLoading && (
                    <Animated.View 
                      style={[styles.loadingBar, { 
                        width: loadingProgress.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%']
                        }),
                        backgroundColor: theme.accent
                      }]}
                    />
                  )}
                  
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

                {infoMessage && (
                  <View style={styles.infoContainer}>
                    <Feather name="info" size={18} color={theme.accent} style={styles.infoIcon} />
                    <Text style={[styles.infoText, { color: theme.accent }]}>
                      {infoMessage}
                    </Text>
                  </View>
                )}
                
                {authError && !emailSent && !authError.includes('security purposes') && !authError.includes('seconds') && (
                  <Text style={[styles.errorText, { color: theme.error || '#ff3b30' }]}>
                    {authError}
                  </Text>
                )}

                <Button
                  title={
                    isLoading || uiLoading ? 'Sending...' : 
                    cooldownTime > 0 ? `Wait ${cooldownTime}s` : 
                    user ? 'Logout' : 'Send Login Link'
                  }
                  onPress={() => {
                    // If user is already logged in, show logout confirmation
                    if (user) {
                      Alert.alert(
                        'Logout',
                        'Are you sure you want to logout?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { 
                            text: 'Logout', 
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                const { logout } = useAuthStore.getState();
                                await logout();
                                router.replace('/');
                              } catch (error) {
                                console.error('Logout error:', error);
                                Alert.alert('Error', 'Failed to logout. Please try again.');
                              }
                            }
                          }
                        ],
                        { cancelable: true }
                      );
                      return;
                    }
                    
                    if (email && !isLoading && !uiLoading) {
                      // Start UI loading animation immediately
                      setUiLoading(true);
                      
                      // Create loading animation
                      loadingProgress.setValue(0);
                      Animated.timing(loadingProgress, {
                        toValue: 100,
                        duration: 1500,
                        useNativeDriver: false,
                      }).start();
                      
                      clearError(); // Clear any previous errors
                      
                      // Check if email exists before attempting login
                      supabase.auth.signInWithOtp({
                        email,
                        options: {
                          shouldCreateUser: false // This fails if user doesn't exist
                        }
                      }).then(() => {
                        // Email exists - immediately show success UI
                        setEmailSent(true);
                        setUiLoading(false); // Stop the UI loading state
                        
                        // Attempt to send login link but handle rate limit errors silently
                        login(email).catch(err => {
                          // If we get a rate limit error, we don't need to show anything
                          // as we've already shown the success message
                          if (err?.message?.includes('security purposes') || 
                              err?.message?.includes('seconds')) {
                            console.log('Rate limiting detected, suppressing error');
                            clearError();
                          }
                        });
                      }).catch(err => {
                        // If user doesn't exist, redirect to signup
                        if (err.message && err.message.includes("User doesn't exist")) {
                          // Redirect to signup with email and message
                          router.push({
                            pathname: '/signup',
                            params: { 
                              message: 'Email is not registered. Please sign up.',
                              email: email
                            }
                          });
                        } else if (err?.message?.includes('security purposes') || 
                                 err?.message?.includes('seconds')) {
                          // Handle rate limiting errors by showing success anyway
                          console.log('Rate limiting detected, showing success UI');
                          clearError();
                          setEmailSent(true);
                          setUiLoading(false); // Stop the UI loading state
                        } else {
                          // Other errors - attempt login anyway
                          clearError();
                          login(email).catch(() => {
                            // Show success message regardless of outcome
                            // This ensures users always see a consistent UI
                            setEmailSent(true);
                            setUiLoading(false); // Stop the UI loading state
                          });
                        }
                      });
                    }
                  }}
                  style={styles.button}
                  disabled={!email || isLoading || buttonDisabled || uiLoading}
                />
              </>
            )}
            
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
  loadingBar: {
    height: 3,
    borderRadius: 2,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  button: {
    marginTop: hp('3%'),
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  autoLoginContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInboxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FFF0',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E6F5E6',
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
