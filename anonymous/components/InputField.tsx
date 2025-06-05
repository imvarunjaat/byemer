import React from 'react';
import { 
  StyleSheet, 
  TextInput, 
  View, 
  TextInputProps,
  Text,
  ViewStyle
} from 'react-native';
import { useThemeStore } from '@/store/theme-store';
import { colors } from '@/constants/colors';

interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const InputField = ({
  label,
  error,
  containerStyle,
  leftIcon,
  rightIcon,
  ...props
}: InputFieldProps) => {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  
  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: theme.text }]}>
          {label}
        </Text>
      )}
      
      <View style={[
        styles.inputContainer,
        { 
          backgroundColor: theme.card,
          borderColor: error ? theme.error : theme.border,
        }
      ]}>
        {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
        
        <TextInput
          style={[
            styles.input,
            { 
              color: theme.text,
              marginLeft: leftIcon ? 8 : 0,
              marginRight: rightIcon ? 8 : 0,
            }
          ]}
          placeholderTextColor={theme.secondaryText}
          {...props}
        />
        
        {rightIcon && <View style={styles.iconContainer}>{rightIcon}</View>}
      </View>
      
      {error && (
        <Text style={[styles.error, { color: theme.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    fontSize: 14,
    marginTop: 4,
  },
});