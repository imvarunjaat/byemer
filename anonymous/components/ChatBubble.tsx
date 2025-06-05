import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeStore } from '@/store/theme-store';
import { colors } from '@/constants/colors';

type ChatBubbleProps = {
  message: string;
  timestamp: string;
  isCurrentUser: boolean;
};

export const ChatBubble = ({ message, timestamp, isCurrentUser }: ChatBubbleProps) => {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  
  return (
    <View style={[
      styles.container,
      isCurrentUser ? styles.currentUser : styles.otherUser,
    ]}>
      <View style={[
        styles.bubble,
        isCurrentUser 
          ? [styles.currentUserBubble, { backgroundColor: theme.accent }]
          : [styles.otherUserBubble, { backgroundColor: theme.card }],
      ]}>
        <Text style={[
          styles.message,
          { color: isCurrentUser ? '#fff' : theme.text }
        ]}>
          {message}
        </Text>
        <Text style={[
          styles.timestamp,
          { color: isCurrentUser ? 'rgba(255, 255, 255, 0.7)' : theme.secondaryText }
        ]}>
          {timestamp}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  currentUser: {
    alignSelf: 'flex-end',
  },
  otherUser: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentUserBubble: {
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    borderBottomLeftRadius: 4,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
});