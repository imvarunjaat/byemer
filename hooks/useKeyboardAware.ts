import { useState, useEffect } from 'react';
import { Keyboard, KeyboardEvent, Platform, LayoutAnimation } from 'react-native';

export type KeyboardInfo = {
  keyboardVisible: boolean;
  keyboardHeight: number;
  screenOffsetY: number;
};

type UseKeyboardAwareOptions = {
  enableAnimation?: boolean;
  animationDuration?: number;
};

/**
 * Hook to handle keyboard visibility and adjust UI accordingly
 */
export const useKeyboardAware = (options: UseKeyboardAwareOptions = {}) => {
  const { enableAnimation = true, animationDuration = 250 } = options;
  
  const [keyboardInfo, setKeyboardInfo] = useState<KeyboardInfo>({
    keyboardVisible: false,
    keyboardHeight: 0,
    screenOffsetY: 0,
  });

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e: KeyboardEvent) => {
        if (enableAnimation) {
          LayoutAnimation.configureNext({
            duration: animationDuration,
            update: {
              type: LayoutAnimation.Types.easeInEaseOut,
            },
          });
        }
        
        setKeyboardInfo({
          keyboardVisible: true,
          keyboardHeight: e.endCoordinates.height,
          screenOffsetY: e.endCoordinates.screenY - e.endCoordinates.height,
        });
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        if (enableAnimation) {
          LayoutAnimation.configureNext({
            duration: animationDuration,
            update: {
              type: LayoutAnimation.Types.easeInEaseOut,
            },
          });
        }
        
        setKeyboardInfo({
          keyboardVisible: false,
          keyboardHeight: 0,
          screenOffsetY: 0,
        });
      }
    );

    // Clean up listeners
    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [enableAnimation, animationDuration]);

  /**
   * Dismiss the keyboard
   */
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return {
    ...keyboardInfo,
    dismissKeyboard,
  };
};
