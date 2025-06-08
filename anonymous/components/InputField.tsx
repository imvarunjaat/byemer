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
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFValue } from 'react-native-responsive-fontsize';

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
    marginBottom: hp('2%'),
    width: '100%',
  },
  label: {
    fontSize: RFValue(16),
    fontWeight: '500',
    marginBottom: hp('1%'),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: wp('4%'),
    height: hp('7%'),
    paddingHorizontal: wp('4%'),
  },
  input: {
    flex: 1,
    fontSize: RFValue(16),
    height: '100%',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    fontSize: RFValue(13),
    marginTop: hp('0.5%'),
  },
});