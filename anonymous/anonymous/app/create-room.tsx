import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, Platform, Pressable, Alert, Modal, TouchableOpacity, Keyboard, ScrollView, KeyboardAvoidingView } from 'react-native';
// Removed KeyboardAwareScrollView in favor of native components
import { Feather } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFValue } from 'react-native-responsive-fontsize';
import { useRouter } from 'expo-router';
import { useThemeStore } from '@/store/theme-store';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/constants/colors';
import { useWindowDimensions } from 'react-native';

import { InputField } from '@/components/InputField';
import { Button } from '../components/Button';
import { EmojiSelector } from '@/components/EmojiSelector';
import { roomService } from '@/lib/room-service';

// Responsive, theme-aware styles
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
    content: {
      flexGrow: 1,
      paddingTop: Math.max(height * 0.03, 20),
      paddingBottom: Math.max(height * 0.05, 32),
      alignItems: 'center',
      minHeight: height,
      backgroundColor: 'transparent',
    },
    emojiFloatContainer: {
      position: 'absolute',
      top: Math.max(height * 0.025, 12),
      left: Math.max(width * 0.06, 18),
      zIndex: 2,
      width: Math.max(width * 0.13, 48),
      height: Math.max(width * 0.13, 48),
      borderRadius: Math.max(width * 0.065, 24),
      alignItems: 'center',
      justifyContent: 'center',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 4,
      elevation: 5,
    },
    emojiFloatText: {
      fontSize: Math.max(width * 0.11, 32),
      textAlign: 'center',
      opacity: 0.85,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Math.max(height * 0.06, 24),
      marginBottom: Math.max(height * 0.025, 10),
      zIndex: 1,
      width: '90%',
      alignSelf: 'center',
    },
    title: {
      fontSize: Math.max(width * 0.06, 22),
      fontWeight: '700',
      color: theme.accent,
      marginBottom: Math.max(height * 0.005, 2),
    },
    subtitle: {
      fontSize: Math.max(width * 0.04, 14),
      color: theme.accent,
      marginBottom: Math.max(height * 0.005, 2),
    },
    formCard: {
      width: '92%',
      maxWidth: 420,
      minWidth: 260,
      alignSelf: 'center',
      alignItems: 'center',
      paddingHorizontal: Math.max(width * 0.06, 18),
      paddingVertical: Math.max(height * 0.03, 18),
      borderRadius: Math.max(width * 0.06, 18),
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.13,
      shadowRadius: 8,
      elevation: 6,
      marginBottom: Math.max(height * 0.02, 12),
      backgroundColor: theme.card,
    },
    formSection: {
      marginBottom: Math.max(height * 0.03, 18),
      width: '100%',
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: Math.max(width * 0.045, 16),
      fontWeight: '600',
      marginBottom: Math.max(height * 0.015, 6),
      alignSelf: 'flex-start',
      color: theme.text,
    },
    inputContainer: {
      width: '100%',
      maxWidth: 350,
      minWidth: 200,
      alignSelf: 'center',
      alignItems: 'center',
      paddingHorizontal: Math.max(width * 0.02, 8),
      paddingVertical: Math.max(height * 0.015, 6),
      borderRadius: Math.max(width * 0.04, 12),
      marginBottom: Math.max(height * 0.02, 8),
      borderWidth: 1.5,
      borderColor: theme.accent,
      backgroundColor: isDarkMode ? '#231942' : '#f7f3ff',
    },
    input: {
      fontSize: Math.max(width * 0.045, 16),
      color: theme.text,
      width: '100%',
      paddingVertical: Math.max(height * 0.01, 6),
      paddingHorizontal: Math.max(width * 0.02, 8),
      backgroundColor: 'transparent',
    },
    emojiButton: {
      marginTop: Math.max(height * 0.01, 6),
      marginBottom: Math.max(height * 0.017, 7),
      borderWidth: 1.5,
      borderRadius: Math.max(width * 0.06, 18),
      paddingVertical: Math.max(height * 0.006, 4),
      paddingHorizontal: Math.max(width * 0.04, 12),
      backgroundColor: 'transparent',
      borderColor: theme.accent,
    },
    emojiSelectorContainer: {
      marginTop: Math.max(height * 0.02, 8),
      width: '100%',
      alignItems: 'center',
    },
    infoSection: {
      marginTop: Math.max(height * 0.025, 10),
      marginBottom: Math.max(height * 0.012, 5),
      alignItems: 'center',
      width: '100%',
      backgroundColor: 'transparent',
    },
    infoText: {
      fontSize: isSmallDevice ? 12 : 14,
      color: theme.secondaryText,
      textAlign: 'center',
      opacity: 0.9,
      marginBottom: Math.max(height * 0.01, 6),
    },
    createButton: {
      marginTop: Math.max(height * 0.012, 7),
      width: '65%',
      alignSelf: 'center',
      borderRadius: Math.max(width * 0.04, 12),
      backgroundColor: theme.accent,
    },
  });
}

export default function CreateRoomScreen() {
  const { width, height } = useWindowDimensions();
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  const styles = createStyles({ isDarkMode, width, height, theme });
  const router = useRouter();

  const [roomName, setRoomName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💬');
  const [showEmojiSelector, setShowEmojiSelector] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [copied, setCopied] = useState(false);
  
  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
  };
  
  function generateRoomCode() {
    // Generates a 6-digit code as a string, ensuring it's exactly 6 digits
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Pad with leading zeros if needed to ensure 6 digits
    return code.padStart(6, '0');
  }
  
  // Add auth state
  const { isAuthenticated, user } = useAuthStore();
  
  const handleCreateRoom = async () => {
    if (!roomName.trim()) return;
    
    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      Alert.alert(
        "Authentication Required",
        "You need to log in before creating a room.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go to Login", onPress: () => router.push("/login") }
        ]
      );
      return;
    }
    
    setIsCreating(true);
    
    try {
      // Generate an access code for the room
      const accessCode = generateRoomCode();
      
      // Create room in Supabase
      const room = await roomService.createRoom(
        roomName.trim(),
        user.id,
        false, // not private by default
        accessCode
      );
      
      if (!room) {
        throw new Error("Failed to create room");
      }
      
      setRoomCode(accessCode);
      // Navigate to the room
      router.push(`/room/${room.id}?name=${encodeURIComponent(roomName)}&emoji=${encodeURIComponent(selectedEmoji)}`);
      setRoomName('');
      setSelectedEmoji('💬');
      setShowEmojiSelector(false);
    } catch (error) {
      console.error("Error creating room:", error);
      Alert.alert("Failed to Create Room", "Please try again later.");
    } finally {
      setIsCreating(false);
    }
  };
  
  // Enhanced keyboard handling
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const showSubscription = Keyboard.addListener(
      showEvent,
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const hideSubscription = Keyboard.addListener(
      hideEvent,
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);
  
  // Accent and background colors
  const accent = isDarkMode ? '#bb86fc' : '#7c4dff';
  const cardBg = isDarkMode ? 'rgba(30, 18, 50, 0.97)' : '#fff';
  const cardShadow = isDarkMode ? '#000' : '#c5bfff';
  const emojiBg = isDarkMode ? 'rgba(60,16,83,1)' : '#ede7ff';
  const emojiShadow = isDarkMode ? '#000' : '#d1c4e9';
  const screenBg = isDarkMode ? '#18122B' : '#f5f6ff';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        enabled
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            ...styles.content,
            paddingBottom: keyboardHeight > 0 ? keyboardHeight / 3 : Math.max(height * 0.05, 32)
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="interactive"
        >
      <View style={[styles.emojiFloatContainer, { backgroundColor: emojiBg, shadowColor: emojiShadow }]}> 
        <Text style={styles.emojiFloatText}>{selectedEmoji}</Text>
      </View>

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 16, borderRadius: 20, padding: 4 }}>
          <Feather name="arrow-left" size={28} color={isDarkMode ? '#fff' : '#7c4dff'} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: accent }]}>Create a Room</Text>
          <Text style={[styles.subtitle, { color: accent }]}>Start an anonymous conversation instantly</Text>
        </View>
      </View>
      <View style={[styles.formCard, { shadowColor: cardShadow, marginTop: 24 }]}>
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Room Name</Text>
          <InputField
            value={roomName}
            onChangeText={setRoomName}
            placeholder="E.g. Confession"
            maxLength={30}
            containerStyle={Object.assign({}, styles.inputContainer, { borderColor: accent, backgroundColor: isDarkMode ? '#231942' : '#f7f3ff' })}
            style={styles.input}
            placeholderTextColor={isDarkMode ? '#bdbdbd' : '#888'}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Room Emoji</Text>
          <Button
            title={`Select Emoji ${selectedEmoji}`}
            onPress={() => setShowEmojiSelector(!showEmojiSelector)}
            variant="outline"
            style={Object.assign({}, styles.emojiButton, { borderColor: accent })}
            textStyle={{ color: accent, fontSize: 18, fontWeight: '600' }}
          />
          {showEmojiSelector && (
            <View style={styles.emojiSelectorContainer}>
              <EmojiSelector
                onSelect={handleEmojiSelect}
                selectedEmoji={selectedEmoji}
              />
            </View>
          )}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoText}>Everyone in this room will be anonymous.{"\n"}The room code will be generated after creation.</Text>
        </View>

        <Button
          title="Create Room"
          onPress={handleCreateRoom}
          loading={isCreating}
          disabled={!roomName.trim()}
          style={styles.createButton}
          textStyle={{ fontWeight: 'bold', fontSize: 18 }}
        />
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}