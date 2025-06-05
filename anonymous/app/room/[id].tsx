import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, SafeAreaView, Pressable, Alert, FlatList, TextInput, KeyboardAvoidingView, Platform, Modal, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeStore } from '@/store/theme-store';
import { colors } from '@/constants/colors';

const MOCK_MESSAGES = [
  { id: '1', message: 'Welcome to the room! 🎉', isCurrentUser: false },
  { id: '2', message: 'Hi there! 👋', isCurrentUser: true },
  { id: '3', message: "Let's start chatting.", isCurrentUser: false },
];

export default function CreatedRoomScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;

  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const flatListRef = useRef(null);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    setMessages([...messages, { id: Date.now().toString(), message: newMessage, isCurrentUser: true }]);
    setNewMessage('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleOption = (option) => {
    setShowOptions(false);
    if (option === 'add') Alert.alert('Add Contacts', 'This would open the add contacts UI.');
    if (option === 'kick') Alert.alert('Kick Member', 'This would open the kick member UI.');
    if (option === 'delete') Alert.alert('Delete Room', 'This would delete the room (frontend only).');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={28} color={isDarkMode ? '#fff' : '#7c4dff'} />
          </Pressable>
          <Text style={[styles.title, { color: theme.text }]}>Room</Text>
          <Pressable onPress={() => setShowOptions(true)} style={styles.menuButton}>
            <Feather name="more-vertical" size={26} color={theme.text} />
          </Pressable>
        </View>
        <View style={styles.roomInfoBox}>
          <Text style={[styles.roomEmoji, { fontSize: 40 }]}>{params.emoji || '💬'}</Text>
          <Text style={[styles.roomName, { color: theme.text }]}>{params.name || 'Room Name'}</Text>
          <Text style={[styles.roomCode, { color: theme.secondaryText }]}>Room Code: {params.id}</Text>
        </View>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.isCurrentUser ? styles.bubbleRight : styles.bubbleLeft, { backgroundColor: item.isCurrentUser ? theme.accent : theme.card }]}> 
              <Text style={{ color: item.isCurrentUser ? '#fff' : theme.text }}>{item.message}</Text>
            </View>
          )}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />
        <View style={[styles.inputRow, { backgroundColor: theme.card }]}> 
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor={theme.secondaryText}
            multiline
          />
          <Pressable
            onPress={handleSend}
            disabled={!newMessage.trim()}
            style={({ pressed }) => [styles.sendButton, { backgroundColor: newMessage.trim() ? theme.accent : theme.secondaryText, opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="send" size={20} color="#fff" />
          </Pressable>
        </View>
        <Modal
          visible={showOptions}
          transparent
          animationType="fade"
          onRequestClose={() => setShowOptions(false)}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptions(false)}>
            <View style={[styles.optionsMenu, { backgroundColor: theme.card }]}> 
              <Pressable style={styles.optionRow} onPress={() => handleOption('add')}>
                <Feather name="user-plus" size={20} color={theme.accent} />
                <Text style={[styles.optionText, { color: theme.accent }]}>Add Contacts</Text>
              </Pressable>
              <Pressable style={styles.optionRow} onPress={() => handleOption('kick')}>
                <Feather name="user-x" size={20} color={theme.accent} />
                <Text style={[styles.optionText, { color: theme.accent }]}>Kick Member</Text>
              </Pressable>
              <Pressable style={styles.optionRow} onPress={() => handleOption('delete')}>
                <Feather name="trash-2" size={20} color={theme.error} />
                <Text style={[styles.optionText, { color: theme.error }]}>Delete Room</Text>
              </Pressable>
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    marginRight: 16,
    borderRadius: 20,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  menuButton: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 16,
  },
  roomInfoBox: {
    alignItems: 'center',
    marginBottom: 12,
  },
  roomEmoji: {
    marginBottom: 4,
  },
  roomName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  roomCode: {
    fontSize: 14,
    marginBottom: 4,
  },
  chatList: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  bubbleLeft: {
    alignSelf: 'flex-start',
    borderTopLeftRadius: 4,
  },
  bubbleRight: {
    alignSelf: 'flex-end',
    borderTopRightRadius: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 16,
    padding: 8,
    marginTop: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendButton: {
    marginLeft: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  optionsMenu: {
    marginTop: 60,
    marginRight: 24,
    borderRadius: 16,
    paddingVertical: 8,
    width: 180,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
});