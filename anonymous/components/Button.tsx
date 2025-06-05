import React from 'react';
import { 
  StyleSheet, 
  Text, 
  Pressable, 
  ViewStyle, 
  TextStyle,
  ActivityIndicator,
  ColorValue
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '@/store/theme-store';
import { colors } from '@/constants/colors';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) => {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  
  const getGradientColors = (): readonly [ColorValue, ColorValue] => {
    if (disabled) {
      return isDarkMode ? ['#444', '#333'] : ['#e0e0e0', '#d0d0d0'];
    }
    
    switch (variant) {
      case 'primary':
        return isDarkMode 
          ? colors.gradients.dark.primary as [ColorValue, ColorValue]
          : colors.gradients.light.primary as [ColorValue, ColorValue];
      case 'secondary':
        return isDarkMode 
          ? colors.gradients.dark.secondary as [ColorValue, ColorValue]
          : colors.gradients.light.secondary as [ColorValue, ColorValue];
      case 'outline':
        return isDarkMode 
          ? ['transparent', 'transparent'] 
          : ['transparent', 'transparent'];
      default:
        return isDarkMode 
          ? colors.gradients.dark.primary as [ColorValue, ColorValue]
          : colors.gradients.light.primary as [ColorValue, ColorValue];
    }
  };
  
  const getTextColor = () => {
    if (disabled) {
      return isDarkMode ? '#999' : '#999';
    }
    
    if (variant === 'outline') {
      return theme.accent;
    }
    
    return variant === 'primary' 
      ? (isDarkMode ? '#fff' : theme.text) 
      : theme.text;
  };
  
  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'small':
        return { height: 36, paddingHorizontal: 12 };
      case 'large':
        return { height: 56, paddingHorizontal: 24 };
      default:
        return { height: 48, paddingHorizontal: 20 };
    }
  };
  
  const getTextSize = (): TextStyle => {
    switch (size) {
      case 'small':
        return { fontSize: 14 };
      case 'large':
        return { fontSize: 18 };
      default:
        return { fontSize: 16 };
    }
  };
  
  const buttonStyles = [
    styles.button,
    getSizeStyles(),
    variant === 'outline' && {
      borderWidth: 1.5,
      borderColor: theme.accent,
    },
    style,
  ];
  
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        { opacity: (pressed || disabled) ? 0.8 : 1 },
      ]}
    >
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={buttonStyles}
      >
        {loading ? (
          <ActivityIndicator color={getTextColor()} size="small" />
        ) : (
          <>
            {icon}
            <Text
              style={[
                styles.text,
                getTextSize(),
                { color: getTextColor(), marginLeft: icon ? 8 : 0 },
                textStyle,
              ]}
            >
              {title}
            </Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
});