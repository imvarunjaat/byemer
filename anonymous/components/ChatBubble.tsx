import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeStore } from '@/store/theme-store';
import { colors } from '@/constants/colors';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFValue } from 'react-native-responsive-fontsize';

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
    marginVertical: hp('0.5%'),
    maxWidth: wp('80%'),
  },
  currentUser: {
    alignSelf: 'flex-end',
  },
  otherUser: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: wp('5%'),
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1.2%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: hp('0.2%') },
    shadowOpacity: 0.1,
    shadowRadius: wp('1%'),
    elevation: 2,
  },
  currentUserBubble: {
    borderBottomRightRadius: wp('1%'),
  },
  otherUserBubble: {
    borderBottomLeftRadius: wp('1%'),
  },
  message: {
    fontSize: RFValue(16),
    lineHeight: RFValue(22),
  },
  timestamp: {
    fontSize: RFValue(11),
    marginTop: hp('0.5%'),
    alignSelf: 'flex-end',
  },
});