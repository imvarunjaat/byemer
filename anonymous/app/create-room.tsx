import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, Dimensions, Pressable, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
import { useRouter } from 'expo-router';
import { useThemeStore } from '@/store/theme-store';
import { colors } from '@/constants/colors';

import { InputField } from '@/components/InputField';
import { Button } from '../components/Button';
import { EmojiSelector } from '@/components/EmojiSelector';

export default function CreateRoomScreen() {
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  const formCardBg = isDarkMode ? 'rgba(60, 16, 83, 0.97)' : 'rgba(90, 40, 120, 0.95)';
  
  const [roomName, setRoomName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💬');
  const [showEmojiSelector, setShowEmojiSelector] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
  };
  
  const handleCreateRoom = () => {
    if (!roomName.trim()) return;
    setIsCreating(true);
    setTimeout(() => {
      setIsCreating(false);
      // Simulate a room ID
      const roomId = Math.floor(Math.random() * 1000000).toString();
      router.push(`/room/${roomId}?name=${encodeURIComponent(roomName)}&emoji=${encodeURIComponent(selectedEmoji)}`);
      setRoomName('');
      setSelectedEmoji('💬');
      setShowEmojiSelector(false);
    }, 1000);
  };
  
  // Accent and background colors
  const accent = isDarkMode ? '#bb86fc' : '#7c4dff';
  const cardBg = isDarkMode ? 'rgba(30, 18, 50, 0.97)' : '#fff';
  const cardShadow = isDarkMode ? '#000' : '#c5bfff';
  const emojiBg = isDarkMode ? 'rgba(60,16,83,1)' : '#ede7ff';
  const emojiShadow = isDarkMode ? '#000' : '#d1c4e9';
  const screenBg = isDarkMode ? '#18122B' : '#f5f6ff';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: screenBg }]}>  
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Floating Emoji Icon */}
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
          <View style={[styles.formCard, { backgroundColor: cardBg, shadowColor: cardShadow, marginTop: 24 }]}>
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
              <Text style={[styles.infoText, { color: theme.secondaryText }]}>Everyone in this room will be anonymous.{"\n"}The room code will be generated after creation.</Text>
            </View>

            <Button
              title="Create Room"
              onPress={handleCreateRoom}
              loading={isCreating}
              disabled={!roomName.trim()}
              style={Object.assign({}, styles.createButton, { backgroundColor: accent })}
              textStyle={{ fontWeight: 'bold', fontSize: 18 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  formSection: {
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  emojiSelectorContainer: {
    marginTop: 16,
  },
  infoSection: {
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    opacity: 0.8,
  },
  createButton: {
    marginTop: 10,
    width: '60%',
    alignSelf: 'center',
    borderRadius: 18,
    paddingVertical: 12,
  },
  emojiFloatContainer: {
    alignSelf: 'center',
    marginTop: 32,
    marginBottom: -40,
    zIndex: 2,
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 12,
  },
  emojiFloatText: {
    fontSize: width * 0.1,
  },
  formCard: {
    marginTop: width * 0.1,
    marginBottom: width * 0.05,
    width: '90%',
    maxWidth: 400,
    minWidth: 260,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: width * 0.07,
    paddingVertical: width * 0.07,
    borderRadius: width * 0.06,
    shadowOffset: { width: 0, height: width * 0.02 },
    shadowOpacity: 0.18,
    shadowRadius: width * 0.045,
    elevation: 10,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#7c4dff',
    marginTop: 2,
    marginBottom: 0,
    textAlign: 'left',
    opacity: 0.7,
  },
  inputContainer: {
    borderWidth: 2,
    borderRadius: width * 0.03,
    paddingHorizontal: width * 0.035,
    paddingVertical: width * 0.03,
    marginBottom: width * 0.01,
    width: '80%',
    maxWidth: 250,
    minWidth: 150,
    alignSelf: 'center',
  },
  input: {
    fontSize: width * 0.04,
  },
  emojiButton: {
    borderWidth: 2,
    borderRadius: width * 0.03,
    paddingHorizontal: width * 0.04,
    paddingVertical: width * 0.025,
    marginTop: width * 0.005,
    marginBottom: width * 0.005,
    backgroundColor: 'transparent',
    width: '80%',
    maxWidth: 250,
    minWidth: 150,
    alignSelf: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(240,240,255,0.7)',
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    paddingHorizontal: width * 0.05,
    paddingTop: width * 0.05,
    paddingBottom: width * 0.1,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 68,
    marginTop: 28,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: 1,
    marginTop: 10,
  },
});