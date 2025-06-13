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

import { InputField } from '@/components/InputField';
import { Button } from '../components/Button';

export default function LoginScreen() {
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const { login, isLoading, error, clearError } = useAuthStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // Animation on component mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);
  
  // Handle error display
  useEffect(() => {
    if (error) {
      Alert.alert('Login Error', error, [
        { text: 'OK', onPress: () => clearError() }
      ]);
    }
  }, [error]);
  
  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password');
      return;
    }
    await login(email, password);
  };
  
  const toggleSecureEntry = () => {
    setSecureTextEntry(!secureTextEntry);
  };
  
  const navigateToSignup = () => {
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
              <Text style={[styles.inputLabel, { color: theme.text }]}>Email</Text>
              <InputField
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                containerStyle={styles.fieldContainer}
                leftIcon={<Feather name="mail" size={20} color={theme.secondaryText} />}
                placeholderTextColor={theme.secondaryText}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Password</Text>
              <InputField
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry={secureTextEntry}
                containerStyle={styles.fieldContainer}
                leftIcon={<Feather name="lock" size={20} color={theme.secondaryText} />}
                rightIcon={
                  <TouchableOpacity 
                    onPress={toggleSecureEntry}
                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                  >
                    <Feather 
                      name={secureTextEntry ? 'eye' : 'eye-off'} 
                      size={20} 
                      color={theme.secondaryText} 
                    />
                  </TouchableOpacity>
                }
                placeholderTextColor={theme.secondaryText}
              />
            </View>
            
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={[styles.forgotPasswordText, { color: theme.accent }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
            
            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              style={styles.loginButton}
              textStyle={{ fontWeight: 'bold', fontSize: RFValue(16) }}
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
});
