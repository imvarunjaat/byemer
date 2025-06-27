import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  ActivityIndicator, 
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { useThemeStore } from '@/store/theme-store';
import { colors } from '@/constants/colors';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/store/auth-store';
import { otpService } from '@/lib/otp-service';
import { userService } from '@/lib/user-service';

export const OTPLogin = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(0);
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  const setUser = useAuthStore((state: any) => state.setUser);
  const otpInputRef = useRef<TextInput>(null);

  // Start countdown timer when we have an expiry time
  useEffect(() => {
    if (!expiresAt) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
      
      if (diff <= 0) {
        clearInterval(interval);
        setCountdown(0);
        Alert.alert('OTP Expired', 'Your verification code has expired. Please request a new one.');
      } else {
        setCountdown(diff);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Format the countdown as MM:SS
  const formatCountdown = () => {
    if (!countdown) return '';
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Validate email
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Request OTP to be sent to email
  const handleSendOTP = async () => {
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await otpService.requestOtp(email);
      
      if (!response.success) {
        setError(response.message || 'Failed to send verification code');
      } else {
        setStep('verify');
        
        // Set a default expiry time (10 minutes)
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + 10);
        setExpiresAt(expiry);
        
        // Focus on OTP input
        setTimeout(() => {
          otpInputRef.current?.focus();
        }, 100);
        
        Alert.alert('Verification Code Sent', `We've sent a verification code to ${email}`);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('OTP request error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify the OTP entered by the user
  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await otpService.verifyOtp(email, otp);
      
      if (!response.success) {
        setError(response.message || 'Failed to verify code');
      } else if (response.user && response.session) {
        // Set the user in auth store
        setUser({
          id: response.user.id,
          email: response.user.email as string,
          username: email.split('@')[0], // Default username from email
        });
        
        // Create user profile if it doesn't exist
        try {
          if (response.user?.id) {
            const username = email.split('@')[0];
            const profileResult = await userService.createUserProfile(
              response.user.id, 
              username
            );
            
            if (profileResult) {
              console.log('User profile created or already exists');
            }
          }
        } catch (profileError) {
          // Log error but don't block authentication flow
          console.error('Error with profile:', profileError);
        }
        
        // Navigate to home screen
        router.replace('/');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('OTP verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset back to email step
  const handleChangeEmail = () => {
    setStep('email');
    setOtp('');
    setError(null);
    setExpiresAt(null);
    setCountdown(0);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          {step === 'email' ? 'Sign in with Email' : 'Verify your Email'}
        </Text>
        
        {step === 'email' ? (
          <>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              We'll send a verification code to your email
            </Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 8,
                paddingHorizontal: 16
              }]}
              placeholder="your@email.com"
              placeholderTextColor={theme.secondaryText}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isLoading}
            />
            
            {error && (
              <Text style={[styles.errorText, { color: theme.error || '#ff3b30' }]}>
                {error}
              </Text>
            )}
            
            <Button
              title="Send Verification Code"
              onPress={handleSendOTP}
              style={styles.button}
              disabled={isLoading || !email}
            />
          </>
        ) : (
          <>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              Enter the verification code sent to {email}
            </Text>
            
            <View style={styles.otpContainer}>
              <TextInput
                ref={otpInputRef}
                style={[styles.otpInput, { 
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: theme.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  fontSize: 24,
                  letterSpacing: 8,
                  textAlign: 'center',
                  paddingHorizontal: 16,
                  fontWeight: '600'
                }]}
                value={otp}
                onChangeText={(text) => {
                  // Only allow digits
                  const cleaned = text.replace(/[^0-9]/g, '');
                  setOtp(cleaned);
                }}
                placeholder="123456"
                placeholderTextColor={theme.secondaryText}
                keyboardType="number-pad"
                maxLength={6}
                editable={!isLoading}
              />
              
              {countdown > 0 && (
                <Text style={[styles.countdownText, { color: theme.accent }]}>
                  Expires in: {formatCountdown()}
                </Text>
              )}
            </View>
            
            {error && (
              <Text style={[styles.errorText, { color: theme.error || '#ff3b30' }]}>
                {error}
              </Text>
            )}
            
            <Button
              title="Verify Code"
              onPress={handleVerifyOTP}
              style={styles.button}
              disabled={isLoading || otp.length !== 6}
            />
            
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={styles.textButton} 
                onPress={handleChangeEmail}
                disabled={isLoading}
              >
                <Text style={{ color: theme.accent }}>Change Email</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.textButton} 
                onPress={handleSendOTP}
                disabled={isLoading}
              >
                <Text style={{ color: theme.accent }}>Resend Code</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        
        {isLoading && (
          <ActivityIndicator 
            style={styles.loader} 
            color={theme.accent} 
            size="large" 
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 28,
    textAlign: 'center',
    lineHeight: 22,
  },
  input: {
    width: '100%',
    height: 55,
    marginBottom: 28,
    padding: 15,
    fontSize: 16,
  },
  otpContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 28,
  },
  otpInput: {
    width: '100%',
    height: 65,
    marginBottom: 12,
    padding: 12,
  },
  countdownText: {
    fontSize: 14,
    marginTop: 12,
    fontWeight: '600',
  },
  button: {
    width: '100%',
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  textButton: {
    padding: 8,
  },
  errorText: {
    marginBottom: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  loader: {
    marginTop: 20,
  },
});
