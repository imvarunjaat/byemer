import React, { useEffect } from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withSequence,
  withDelay,
  Easing
} from 'react-native-reanimated';
import { useThemeStore } from '@/store/theme-store';
import { colors } from '@/constants/colors';
import { Platform } from 'react-native';

export const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useThemeStore();
  
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  
  useEffect(() => {
    rotation.value = withSequence(
      withTiming(rotation.value + 45, { duration: 150, easing: Easing.ease }),
      withTiming(rotation.value + 360, { duration: 300, easing: Easing.ease })
    );
    
    scale.value = withSequence(
      withTiming(0.8, { duration: 150, easing: Easing.ease }),
      withTiming(1.1, { duration: 150, easing: Easing.ease }),
      withDelay(50, withTiming(1, { duration: 100, easing: Easing.ease }))
    );
  }, [isDarkMode]);
  
  const animatedStyle = useAnimatedStyle(() => {
    if (Platform.OS === 'web') {
      return {};
    }
    return {
      transform: [
        { rotate: `${rotation.value}deg` },
        { scale: scale.value }
      ],
    };
  });
  
  const theme = isDarkMode ? colors.dark : colors.light;
  
  return (
    <Pressable 
      onPress={toggleTheme}
      style={[styles.container, { backgroundColor: theme.card }]}
    >
      {Platform.OS !== 'web' ? (
        <Animated.View style={animatedStyle}>
          {isDarkMode ? (
            <MaterialCommunityIcons name="moon-waning-crescent" size={24} color={theme.accent} />
          ) : (
            <MaterialCommunityIcons name="white-balance-sunny" size={24} color={theme.accent} />
          )}
        </Animated.View>
      ) : (
        <View>
          {isDarkMode ? (
            <MaterialCommunityIcons name="moon-waning-crescent" size={24} color={theme.accent} />
          ) : (
            <MaterialCommunityIcons name="white-balance-sunny" size={24} color={theme.accent} />
          )}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});