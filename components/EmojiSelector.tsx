import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import { useThemeStore } from '@/store/theme-store';
import { colors } from '@/constants/colors';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFValue } from 'react-native-responsive-fontsize';

const EMOJI_CATEGORIES = {
  'Faces': ['😀', '😂', '🥹', '😊', '😎', '🥸', '🤩', '🥳', '😈', '👻', '👽', '🤖', '💩'],
  'Animals': ['🐶', '🐱', '🦊', '🐼', '🐨', '🦁', '🐯', '🦄', '🐙', '🦋', '🐉'],
  'Food': ['🍕', '🍔', '🌮', '🍦', '🍭', '🍫', '🧁', '🍎', '🍓', '🥑'],
  'Activities': ['🎮', '🎯', '🎨', '🎭', '🎬', '🎤', '🎧', '⚽️', '🏀', '🏆'],
  'Objects': ['💎', '🔮', '🎁', '🎈', '💡', '🔑', '⏰', '📱', '💻', '🔍'],
  'Symbols': ['❤️', '🔥', '⭐️', '✨', '💫', '☁️', '🌈', '🌟', '💯', '🚀']
};

type EmojiSelectorProps = {
  onSelect: (emoji: string) => void;
  selectedEmoji?: string;
};

export const EmojiSelector = ({ onSelect, selectedEmoji }: EmojiSelectorProps) => {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  
  const [activeCategory, setActiveCategory] = useState<string>('Faces');
  
  return (
    <View style={styles.container}>
      <View style={styles.categoryTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {Object.keys(EMOJI_CATEGORIES).map((category) => (
            <Pressable
              key={category}
              onPress={() => setActiveCategory(category)}
              style={[
                styles.categoryTab,
                activeCategory === category && { 
                  backgroundColor: isDarkMode ? 'rgba(187, 134, 252, 0.2)' : 'rgba(124, 77, 255, 0.1)' 
                }
              ]}
            >
              <Text style={[
                styles.categoryText,
                { color: activeCategory === category ? theme.accent : theme.secondaryText }
              ]}>
                {category}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      
      <View style={styles.emojiGrid}>
        {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji) => (
          <Pressable
            key={emoji}
            onPress={() => onSelect(emoji)}
            style={[
              styles.emojiButton,
              selectedEmoji === emoji && { 
                backgroundColor: isDarkMode ? 'rgba(187, 134, 252, 0.2)' : 'rgba(124, 77, 255, 0.1)',
                borderColor: theme.accent,
              }
            ]}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  categoryTabs: {
    flexDirection: 'row',
    marginBottom: hp('1.5%'),
  },
  categoryTab: {
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1%'),
    marginRight: wp('2%'),
    borderRadius: wp('4%'),
  },
  categoryText: {
    fontSize: RFValue(14),
    fontWeight: '500',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emojiButton: {
    width: wp('16%'),
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp('1%'),
    borderRadius: wp('4%'),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  emoji: {
    fontSize: RFValue(28),
  },
});