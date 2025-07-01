import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import ErrorTrackingService from '../lib/error-tracking';
import { logger } from '../config';
// If you want to add Sentry for production error tracking:
// 1. Run: npx expo install @sentry/react-native
// 2. Uncomment: import * as Sentry from '@sentry/react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error so the next render shows fallback UI
    this.setState({ hasError: true, error, errorInfo });
    
    // Send error to error tracking service
    logger.error('Error caught by GlobalErrorBoundary:', error);
    
    // Track error with our error tracking service
    ErrorTrackingService.captureError(error, {
      componentStack: errorInfo.componentStack,
      // React Native doesn't have window.location
      path: 'react-native-app',
      isFatal: false,
      source: 'GlobalErrorBoundary'
    });
    
    // If using Sentry, uncomment this line
    // Sentry.captureException(error);
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          {/* Use existing icon since error.png is missing */}
          <Image 
            source={require('../assets/images/icon.png')} 
            style={styles.errorImage}
          />
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Text style={styles.message}>
            We apologize for the inconvenience. The app encountered an unexpected error.
          </Text>
          
          {__DEV__ && this.state.error && (
            <View style={styles.debugContainer}>
              <Text style={styles.errorText}>
                {this.state.error.toString()}
              </Text>
            </View>
          )}
          
          <TouchableOpacity style={styles.button} onPress={this.resetError}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20
  },
  errorImage: {
    width: 120,
    height: 120,
    marginBottom: 20
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666'
  },
  debugContainer: {
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    width: '100%',
    marginBottom: 20
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: 'red'
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  }
});
