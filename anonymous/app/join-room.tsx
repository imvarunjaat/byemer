import React, { useState, useRef, useEffect } from 'react';
import { Text, View, SafeAreaView, KeyboardAvoidingView, Platform, Pressable, StyleSheet, useWindowDimensions, ScrollView, TouchableWithoutFeedback, Keyboard, Animated, Alert } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '@/store/theme-store';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/constants/colors';
import { InputField } from '@/components/InputField';
import { Button } from '../components/Button';
import { verticalScale } from '../utils/responsive';
import { roomService } from '@/lib/room-service';

type CreateStylesParams = {
  isDarkMode: boolean;
  width: number;
  height: number;
  theme: typeof colors.light;
};

function createStyles({ isDarkMode, width, height, theme }: CreateStylesParams) {
  const isSmallDevice = width < 350;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    keyboardAvoid: {
      flex: 1,
    },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      paddingHorizontal: Math.max(width * 0.04, 16),
      paddingBottom: Math.max(height * 0.03, 18),
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Math.max(height * 0.02, 16), // Increased bottom margin
      marginTop: Math.max(height * 0.05, 20), // Increased top margin
      width: '100%',
      paddingHorizontal: Math.max(width * 0.04, 16),
      paddingBottom: Math.max(height * 0.01, 8),
      backgroundColor: theme.background,
      zIndex: 10,
    },
    backButton: {
      borderRadius: 20,
      padding: 4,
      marginRight: 12,
    },
    title: {
      fontSize: isSmallDevice ? 22 : 26,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'left',
    },
    subtitle: {
      fontSize: isSmallDevice ? 13 : 16,
      fontWeight: '500',
      color: isDarkMode ? '#bb86fc' : '#7c4dff',
      marginTop: 2,
      opacity: 0.8,
      textAlign: 'left',
    },
    emojiFloatContainer: {
      position: 'absolute',
      top: -Math.max(width * 0.15, 28), // Half of the container height to create floating effect
      alignSelf: 'center',
      zIndex: 10,
      width: Math.max(width * 0.18, 56),
      height: Math.max(width * 0.18, 56),
      borderRadius: Math.max(width * 0.09, 28),
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? 'rgba(60,16,83,1)' : '#ede7ff',
      shadowColor: isDarkMode ? '#000' : '#d1c4e9',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 12,
      elevation: 8,
    },
    formCard: {
      marginTop: Math.max(height * 0.05, 28), // Increased margin to make room for floating icon
      marginBottom: Math.max(height * 0.02, 12),
      width: '96%',
      maxWidth: 420,
      minWidth: 240,
      alignSelf: 'center',
      alignItems: 'center',
      paddingHorizontal: Math.max(width * 0.06, 18),
      paddingTop: Math.max(height * 0.035, 20), // Increased top padding to make room for icon
      paddingBottom: Math.max(height * 0.025, 14),
      borderRadius: Math.max(width * 0.04, 18),
      backgroundColor: isDarkMode ? 'rgba(60, 16, 83, 0.97)' : 'rgba(90, 40, 120, 0.95)',
      shadowColor: isDarkMode ? '#000' : '#c5bfff',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 10,
    },
    formSection: {
      marginBottom: Math.max(height * 0.02, 10),
      width: '100%',
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: isSmallDevice ? 15 : 18,
      fontWeight: '600',
      marginBottom: 6,
      alignSelf: 'flex-start',
      color: theme.text,
    },
    inputSection: {
      width: '95%',
      maxWidth: 320,
      minWidth: 140,
      marginBottom: Math.max(height * 0.02, 10),
      alignSelf: 'center',
    },
    infoSection: {
      marginBottom: Math.max(height * 0.02, 10),
      width: '100%',
      alignItems: 'center',
    },
    infoText: {
      fontSize: isSmallDevice ? 12 : 14,
      lineHeight: isSmallDevice ? 16 : 19,
      textAlign: 'center',
      opacity: 0.85,
      color: theme.secondaryText,
    },
    joinButton: {
      marginTop: Math.max(height * 0.01, 6),
      width: '95%',
      maxWidth: 320,
      minWidth: 140,
      alignSelf: 'center',
      borderRadius: Math.max(width * 0.03, 12),
      paddingVertical: Math.max(height * 0.012, 7),
    },
    privacyNote: {
      fontSize: isSmallDevice ? 12 : 13,
      textAlign: 'center',
      marginTop: 12,
      color: theme.secondaryText,
      opacity: 0.8,
    },
  });
}

export default function JoinRoomScreen() {
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  const { width, height } = useWindowDimensions();
  const styles = createStyles({ isDarkMode, width, height, theme });
  const { user, isAuthenticated } = useAuthStore();

  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [step, setStep] = useState<'code' | 'nickname' | 'accessCode'>('code');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [roomData, setRoomData] = useState<any>(null);
  const inputRef = useRef<any>(null);

  // Only allow numeric input and auto-submit if 6 digits
  const handleInputChange = (text: string) => {
    // Remove non-digits
    const sanitized = text.replace(/\D/g, '');
    setRoomCode(sanitized);
    if (error) setError('');
    if (sanitized.length === 6) {
      Keyboard.dismiss();
      checkRoomExists(sanitized);
    }
  };

  const checkRoomExists = async (code: string) => {
    if (!code.trim()) {
      setError('Please enter a room code');
      return;
    }
    
    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      Alert.alert(
        "Authentication Required",
        "You need to log in before joining a room.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go to Login", onPress: () => router.push("/login") }
        ]
      );
      return;
    }
    
    setIsJoining(true);
    setError('');
    
    try {
      // Find room by ID or code
      const room = await roomService.getRoomById(code);
      
      if (!room) {
        setError('Room not found. Please check the code and try again.');
        setIsJoining(false);
        return;
      }
      
      setRoomData(room);
      
      // If it's a private room, ask for access code next
      if (room.is_private && room.access_code) {
        setStep('accessCode');
        setIsJoining(false);
        return;
      }
      
      // Otherwise, proceed to nickname step
      setStep('nickname');
      setIsJoining(false);
    } catch (error) {
      console.error('Error checking room:', error);
      setError('Unable to check room. Please try again.');
      setIsJoining(false);
    }
  };
  
  const checkAccessCode = () => {
    if (!accessCode.trim()) {
      setError('Please enter the access code');
      return;
    }
    
    if (roomData && roomData.access_code === accessCode) {
      setError('');
      setStep('nickname');
    } else {
      setError('Incorrect access code');
    }
  };
  
  const handleJoinRoom = async () => {
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }
    
    if (!roomData || !roomData.id) {
      setError('Room data is missing');
      return;
    }
    
    setIsJoining(true);
    setError('');
    
    try {
      // Use user ID if authenticated, or generate a random one for anonymous
      const userId = isAuthenticated && user ? user.id : `anon_${Math.random().toString(36).substring(2, 9)}`;
      
      // Join the room in Supabase - this now returns additional information
      const result = await roomService.joinRoom(roomData.id, userId, nickname);
      
      if (!result.participant) {
        throw new Error('Failed to join room');
      }

      // Check if user was already a member
      if (result.alreadyJoined) {
        // Show a brief toast or message
        Alert.alert(
          'Already a Member',
          "You're already a member of this room. Heading back in now!",
          [{ text: 'OK', onPress: () => navigateToRoom() }]
        );
      } else {
        // Just navigate directly for new joins
        navigateToRoom();
      }
      
    } catch (error) {
      console.error('Error joining room:', error);
      setError('Failed to join room. Please try again.');
      setIsJoining(false);
    }
  };

  // Helper function to navigate to the room
  const navigateToRoom = () => {
    router.push({
      pathname: "/room/[id]",
      params: { id: roomData!.id, nickname }
    });
  };

  // Add state for keyboard height
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Auto-focus input field when component mounts
  React.useEffect(() => {
    // Small delay to ensure component is fully rendered
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Enhanced keyboard handling with better behavior and animations
  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const showSubscription = Keyboard.addListener(
      showEvent,
      (e) => {
        const keyboardHeight = e.endCoordinates.height;
        // Use a smoother animation for keyboard appearance
        if (Platform.OS === 'ios') {
          // iOS has built-in animation with keyboardWillShow
          setKeyboardHeight(keyboardHeight);
        } else {
          // For Android, add a small delay to sync with the keyboard animation
          setTimeout(() => {
            setKeyboardHeight(keyboardHeight);
          }, 50);
        }
      }
    );

    const hideSubscription = Keyboard.addListener(
      hideEvent,
      () => {
        // Use a smoother animation for keyboard disappearance
        if (Platform.OS === 'ios') {
          // iOS has built-in animation with keyboardWillHide
          setKeyboardHeight(0);
        } else {
          // For Android, add a small delay to sync with the keyboard animation
          setTimeout(() => {
            setKeyboardHeight(0);
          }, 50);
        }
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Add fade animation for form card
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header - Always stays at the top */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8} accessibilityLabel="Go back">
          <Feather name="arrow-left" size={28} color={isDarkMode ? '#fff' : '#7c4dff'} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Join Room</Text>
          <Text style={styles.subtitle}>Join an anonymous conversation instantly</Text>
        </View>
      </View>
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
        contentContainerStyle={{ flex: 1 }}
        enabled
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1 }}>
            <ScrollView
              contentContainerStyle={{
                paddingBottom: keyboardHeight > 0 ? verticalScale(20) : 0,
                paddingTop: keyboardHeight > 0 ? verticalScale(10) : verticalScale(20),
                flexGrow: 1,
                justifyContent: keyboardHeight > 0 ? 'flex-start' : 'center'
              }}
              keyboardShouldPersistTaps="handled"
              scrollEventThrottle={16}
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
            >
            <View style={[styles.content, { paddingTop: 0 }]}>
              <Animated.View 
                style={[
                  styles.formCard, 
                  { 
                    marginTop: keyboardHeight > 0 ? Math.max(height * 0.01, 5) : Math.max(height * 0.03, 16),
                    transform: [{ translateY: keyboardHeight > 0 ? -Math.min(keyboardHeight * 0.05, 20) : 0 }],
                    opacity: fadeAnim // Apply fade animation
                  }
                ]}
              >
                <View style={{ width: '100%', position: 'relative' }}>
                  <View style={styles.emojiFloatContainer}>
                    <MaterialCommunityIcons name="link" size={Math.max(width * 0.08, 34)} color={isDarkMode ? colors.dark.secondaryAccent : colors.light.accent} />
                  </View>
                  {step === 'code' && (
                    <>
                      <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Room Code</Text>
                        <InputField
                          ref={inputRef}
                          value={roomCode}
                          onChangeText={handleInputChange}
                          placeholder="Enter 6-digit code"
                          keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                          maxLength={6}
                          error={error}
                          autoFocus
                          returnKeyType="done"
                          onSubmitEditing={() => checkRoomExists(roomCode)}
                          containerStyle={styles.inputSection}
                        />
                      </View>
                      <View style={styles.infoSection}>
                        <Text style={styles.infoText}>Ask your friend for the 6-digit room code to join their anonymous chat room.</Text>
                      </View>
                      <Button
                        title="Check Room"
                        onPress={() => checkRoomExists(roomCode)}
                        loading={isJoining}
                        disabled={roomCode.length !== 6}
                        style={styles.joinButton}
                      />
                    </>
                  )}
                  
                  {step === 'accessCode' && (
                    <>
                      <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Access Code</Text>
                        <InputField
                          value={accessCode}
                          onChangeText={(text) => {
                            setAccessCode(text);
                            if (error) setError('');
                          }}
                          placeholder="Enter private room access code"
                          secureTextEntry
                          error={error}
                          autoFocus
                          returnKeyType="next"
                          onSubmitEditing={checkAccessCode}
                          containerStyle={styles.inputSection}
                        />
                      </View>
                      <View style={styles.infoSection}>
                        <Text style={styles.infoText}>This is a private room. Please enter the access code provided by the room creator.</Text>
                      </View>
                      <Button
                        title="Continue"
                        onPress={checkAccessCode}
                        loading={isJoining}
                        disabled={!accessCode.trim()}
                        style={styles.joinButton}
                      />
                    </>
                  )}
                  
                  {step === 'nickname' && (
                    <>
                      <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Your Nickname</Text>
                        <InputField
                          value={nickname}
                          onChangeText={(text) => {
                            setNickname(text);
                            if (error) setError('');
                          }}
                          placeholder="Enter your nickname"
                          error={error}
                          autoFocus
                          returnKeyType="done"
                          onSubmitEditing={handleJoinRoom}
                          containerStyle={styles.inputSection}
                          maxLength={20}
                        />
                      </View>
                      <View style={styles.infoSection}>
                        <Text style={styles.infoText}>Choose a nickname that will be shown to others in the room.</Text>
                      </View>
                      <Button
                        title="Join Anonymously"
                        onPress={handleJoinRoom}
                        loading={isJoining}
                        disabled={!nickname.trim()}
                        style={styles.joinButton}
                      />
                    </>
                  )}
                  <Text style={styles.privacyNote}>Your identity will remain anonymous in the chat room.</Text>
                </View>
              </Animated.View>
            </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}