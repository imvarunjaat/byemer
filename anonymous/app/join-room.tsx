import React, { useState } from 'react';
import { Text, View, SafeAreaView, KeyboardAvoidingView, Platform, Pressable, StyleSheet, useWindowDimensions, ScrollView } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '@/store/theme-store';
import { colors } from '@/constants/colors';
import { InputField } from '@/components/InputField';
import { Button } from '../components/Button';

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
      paddingTop: Math.max(height * 0.02, 12),
      paddingBottom: Math.max(height * 0.03, 18),
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Math.max(height * 0.01, 8),
      marginTop: Math.max(height * 0.03, 18),
      width: '100%',
      paddingHorizontal: 0,
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
      alignSelf: 'center',
      marginTop: 0,
      marginBottom: -Math.max(height * 0.04, 18),
      zIndex: 2,
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
      marginTop: Math.max(height * 0.06, 32),
      marginBottom: Math.max(height * 0.02, 12),
      width: '96%',
      maxWidth: 420,
      minWidth: 240,
      alignSelf: 'center',
      alignItems: 'center',
      paddingHorizontal: Math.max(width * 0.06, 18),
      paddingVertical: Math.max(height * 0.025, 14),
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

  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const handleJoinRoom = () => {
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    
    setError('');
    setIsJoining(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsJoining(false);
      
      // For demo purposes, let's say any 6-digit code works
      if (roomCode.length === 6 && /^\d+$/.test(roomCode)) {
        router.push(`/room/${roomCode}`);
      } else {
        setError('Invalid room code. Please try again.');
      }
    }, 1500);
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8} accessibilityLabel="Go back">
                <Feather name="arrow-left" size={28} color={isDarkMode ? '#fff' : '#7c4dff'} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Join Room</Text>
                <Text style={styles.subtitle}>Join an anonymous conversation instantly</Text>
              </View>
            </View>
            <View style={styles.emojiFloatContainer}>
              <MaterialCommunityIcons name="link" size={Math.max(width * 0.08, 34)} color={isDarkMode ? colors.dark.secondaryAccent : colors.light.accent} />
            </View>
            <View style={styles.formCard}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Room Code</Text>
                <InputField
                  value={roomCode}
                  onChangeText={(text) => {
                    setRoomCode(text);
                    if (error) setError('');
                  }}
                  placeholder="Enter 6-digit code"
                  keyboardType="number-pad"
                  maxLength={6}
                  error={error}
                  autoFocus
                  containerStyle={styles.inputSection}
                />
              </View>
              <View style={styles.infoSection}>
                <Text style={styles.infoText}>Ask your friend for the 6-digit room code to join their anonymous chat room.</Text>
              </View>
              <Button
                title="Join Anonymously"
                onPress={handleJoinRoom}
                loading={isJoining}
                disabled={!roomCode.trim()}
                style={styles.joinButton}
              />
              <Text style={styles.privacyNote}>Your identity will remain anonymous in the chat room.</Text>
            </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}