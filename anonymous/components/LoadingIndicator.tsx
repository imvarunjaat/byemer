import React from 'react';
import { 
  ActivityIndicator, 
  StyleSheet, 
  View, 
  Text, 
  Modal,
  ViewStyle,
  TextStyle
} from 'react-native';

interface LoadingIndicatorProps {
  visible: boolean;
  text?: string;
  overlay?: boolean;
  spinnerSize?: 'small' | 'large';
  spinnerColor?: string;
  textStyle?: TextStyle;
  containerStyle?: ViewStyle;
}

/**
 * A customizable loading indicator component that can be used in inline or modal overlay mode
 */
export function LoadingIndicator({
  visible,
  text,
  overlay = false,
  spinnerSize = 'large',
  spinnerColor = '#007AFF',
  textStyle,
  containerStyle
}: LoadingIndicatorProps) {

  if (!visible) return null;

  const content = (
    <View style={[
      styles.container, 
      overlay ? styles.overlayContainer : null,
      containerStyle
    ]}>
      <ActivityIndicator size={spinnerSize} color={spinnerColor} />
      {text ? <Text style={[styles.text, textStyle]}>{text}</Text> : null}
    </View>
  );

  if (overlay) {
    return (
      <Modal
        transparent
        animationType="fade"
        visible={visible}
        onRequestClose={() => {}}
      >
        <View style={styles.modalBackground}>
          {content}
        </View>
      </Modal>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    minHeight: 80,
    minWidth: 80
  },
  overlayContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center'
  },
  modalBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  }
});
