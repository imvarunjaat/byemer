import { Dimensions, PixelRatio } from 'react-native';

// Guideline sizes are based on standard ~5.4" mobile device (iPhone 12/13/14)
const guidelineBaseWidth = 390;
const guidelineBaseHeight = 844;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function scaleSize(size: number) {
  return (SCREEN_WIDTH / guidelineBaseWidth) * size;
}

export function verticalScale(size: number) {
  return (SCREEN_HEIGHT / guidelineBaseHeight) * size;
}

export function scaleFont(size: number) {
  const newSize = size * (SCREEN_WIDTH / guidelineBaseWidth);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

// Optionally, a moderate scale for more subtle scaling
export function moderateScale(size: number, factor = 0.5) {
  return size + (scaleSize(size) - size) * factor;
}
