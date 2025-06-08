import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle, Pressable, ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '@/store/theme-store';
import { colors } from '@/constants/colors';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFValue } from 'react-native-responsive-fontsize';

type GlassmorphicCardProps = {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  gradientColors?: readonly [ColorValue, ColorValue];
};

export const GlassmorphicCard = ({ 
  children, 
  onPress, 
  style,
  gradientColors 
}: GlassmorphicCardProps) => {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  
  const defaultGradient = isDarkMode 
    ? colors.gradients.dark.primary as [ColorValue, ColorValue]
    : colors.gradients.light.primary as [ColorValue, ColorValue];
  
  const CardComponent = onPress ? Pressable : View;
  
  return (
    <CardComponent
      style={[styles.container, { shadowColor: theme.shadow }, style]}
      onPress={onPress}
    >
      <LinearGradient
        colors={gradientColors || defaultGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={[styles.content, { backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.75)' : 'rgba(255, 255, 255, 0.75)' }]}>
          {children}
        </View>
      </LinearGradient>
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: wp('5%'),
    overflow: 'hidden',
    shadowOffset: { width: 0, height: hp('0.5%') },
    shadowOpacity: 0.15,
    shadowRadius: wp('3%'),
    elevation: 5,
  },
  gradient: {
    width: '100%',
    height: '100%',
  },
  content: {
    flexGrow: 1,
    minHeight: 0,
    width: '100%',
    padding: wp('4%'),
    borderRadius: wp('5%'),
  },
});