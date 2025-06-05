import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, KeyboardAvoidingView, Platform, Dimensions, Pressable } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
import { useRouter } from 'expo-router';
import { useThemeStore } from '@/store/theme-store';
import { colors } from '@/constants/colors';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';
import { InputField } from '@/components/InputField';
import { Button } from '../components/Button';

export default function JoinRoomScreen() {
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  const formCardBg = isDarkMode ? 'rgba(60, 16, 83, 0.97)' : 'rgba(90, 40, 120, 0.95)';
  
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={{ marginRight: 16, borderRadius: 20, padding: 4 }}>
              <Feather name="arrow-left" size={28} color={isDarkMode ? '#fff' : '#7c4dff'} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>Join Room</Text>
              <Text style={[styles.subtitle, { color: isDarkMode ? '#bb86fc' : '#7c4dff' }]}>Join an anonymous conversation instantly</Text>
            </View>
          </View>
          
          <View style={[styles.emojiFloatContainer, { backgroundColor: isDarkMode ? 'rgba(60,16,83,1)' : '#ede7ff', shadowColor: isDarkMode ? '#000' : '#d1c4e9' }]}> 
              <MaterialCommunityIcons name="link" size={40} color={isDarkMode ? colors.dark.secondaryAccent : colors.light.accent} />
            </View>
            <View style={[styles.formCard, { backgroundColor: formCardBg, shadowColor: isDarkMode ? '#000' : '#c5bfff' }]}>
              <View style={styles.formSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Room Code</Text>
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
                <Text style={[styles.infoText, { color: theme.secondaryText }]}>Ask your friend for the 6-digit room code to join their anonymous chat room.</Text>
              </View>
              <Button
                title="Join Anonymously"
                onPress={handleJoinRoom}
                loading={isJoining}
                disabled={!roomCode.trim()}
                style={styles.joinButton}
              />
              <Text style={[styles.privacyNote, { color: theme.secondaryText }]}>Your identity will remain anonymous in the chat room.</Text>
            </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(240,240,255,0.7)',
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: '5%',
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 68,
    marginTop: 28,
    marginBottom: 18,
    paddingHorizontal: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    marginLeft: 0,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: 0,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#7c4dff',
    marginTop: 5,
    marginBottom: 0,
    textAlign: 'left',
    opacity: 0.7,
  },
  emojiFloatContainer: {
    alignSelf: 'center',
    marginTop: 3,
    marginBottom: -40,
    zIndex: 2,
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: width * 0.1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 12,
  },
  formCard: {
    marginTop: 48,
    marginBottom: 20,
    width: '90%',
    maxWidth: 400,
    minWidth: 260,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 28,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  formSection: {
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: width * 0.04,
    fontWeight: '600',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  infoSection: {
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  infoText: {
    fontSize: width * 0.03,
    lineHeight: width * 0.05,
    textAlign: 'center',
    opacity: 0.85,
  },
  inputSection: {
    width: '90%',
    maxWidth: 340,
    minWidth: 180,
    marginBottom: 24,
    alignSelf: 'center',
  },
  joinButton: {
    marginTop: 8,
    width: '90%',
    maxWidth: 340,
    minWidth: 180,
    alignSelf: 'center',
    borderRadius: 16,
    paddingVertical: 10,
  },
  privacyNote: {
    fontSize: 13,
    textAlign: 'center',
  },
});