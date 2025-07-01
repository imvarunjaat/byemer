import { Dimensions, Platform, PixelRatio } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFValue } from 'react-native-responsive-fontsize';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

// Screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (Based on iPhone 11 Pro - adjust if needed)
const baseWidth = 375;
const baseHeight = 812;

// Check if device is a tablet
export const isTablet = () => {
  const pixelDensity = PixelRatio.get();
  const adjustedWidth = SCREEN_WIDTH * pixelDensity;
  const adjustedHeight = SCREEN_HEIGHT * pixelDensity;
  
  return (
    Math.sqrt(Math.pow(adjustedWidth, 2) + Math.pow(adjustedHeight, 2)) >= 1000
  );
};

// Screen size utility
export const screenWidth = SCREEN_WIDTH;
export const screenHeight = SCREEN_HEIGHT;

// Responsive width based on percentage
export const responsiveWidth = (percentage: number) => wp(`${percentage}%`);

// Responsive height based on percentage
export const responsiveHeight = (percentage: number) => hp(`${percentage}%`);

// Font scaling with minimum and maximum boundaries
export const scaledFontSize = (size: number, minimumSize = 12, maximumSize = 40) => {
  const scaledSize = RFValue(size);
  // Ensure the font size stays within desired bounds
  return Math.max(minimumSize, Math.min(scaledSize, maximumSize));
};

// Alternative font scaling approach
export const adjustedFontSize = (size: number) => {
  // Use size-matters for more precise control over font scaling
  return moderateScale(size, 0.3); // The factor 0.3 reduces the scaling rate
};

// Spacing scales
export const spacing = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(16),
  lg: moderateScale(24),
  xl: moderateScale(32),
  xxl: moderateScale(48),
};

// Margin/padding utility
export const margin = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(16),
  lg: moderateScale(24),
  xl: moderateScale(32),
  xxl: moderateScale(48),
};

// Border radius utility
export const radius = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(20),
  xl: moderateScale(28),
  round: 9999, // For circular shapes
};

// Platform-specific adjustment
export const getAdjustedSize = (size: number, factor = 0.2) => {
  return Platform.OS === 'ios' ? size : size * (1 - factor);
};

// Conditional sizing based on device size
export const conditionalSize = (size: number, tabletMultiplier = 1.3) => {
  return isTablet() ? size * tabletMultiplier : size;
};

// Export the raw utilities for direct usage
export { wp, hp, RFValue, scale, verticalScale, moderateScale };
