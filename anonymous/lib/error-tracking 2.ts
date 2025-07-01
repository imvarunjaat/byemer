import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../config';

// Define global ErrorUtils type
type ErrorUtilsType = {
  getGlobalHandler(): (error: any, isFatal: boolean) => void;
  setGlobalHandler(callback: (error: any, isFatal: boolean) => void): void;
};

// Access global ErrorUtils
// @ts-ignore - React Native specific API
const globalErrorUtils = global.ErrorUtils;

// Detect if app is in production
const isProduction = !__DEV__;

// App config
const appConfig = {
  isProduction,
  errorReportingEnabled: isProduction,
};

// Maximum number of errors to store locally
const MAX_STORED_ERRORS = 50;

// Error storage key
const ERROR_STORAGE_KEY = 'app_errors';

interface ErrorReport {
  timestamp: number;
  error: string;
  componentStack?: string;
  path?: string;
  userId?: string;
  appVersion?: string;
  deviceInfo?: {
    platform: string;
    osVersion?: string;
    deviceModel?: string;
  };
}

/**
 * Error tracking service that logs errors and optionally sends them to an error reporting service
 * For production, this could be integrated with services like Sentry, LogRocket, etc.
 */
class ErrorTrackingService {
  /**
   * Initialize the error tracking service
   */
  initialize() {
    // Set up global error handler for uncaught JS errors
    if (!globalErrorUtils) return;

    // Store the original handler
    const originalHandler = globalErrorUtils.getGlobalHandler();
    
    // Set up our custom error handler
    globalErrorUtils.setGlobalHandler((error: any, isFatal: boolean) => {
      this.captureError(error, { isFatal });
      // Call the original handler
      originalHandler(error, isFatal);
    });

    logger.info('Error tracking service initialized');
  }

  /**
   * Capture and log an error
   * 
   * @param error The error to capture
   * @param additionalInfo Additional context about the error
   */
  async captureError(error: Error | string, additionalInfo: Record<string, any> = {}) {
    try {
      const errorMessage = error instanceof Error ? error.message : error;
      const errorStack = error instanceof Error ? error.stack : undefined;

      // Log to console in development
      if (!appConfig.isProduction) {
        logger.error('Error captured:', errorMessage, errorStack, additionalInfo);
      }

      // Create error report
      const errorReport: ErrorReport = {
        timestamp: Date.now(),
        error: errorMessage,
        componentStack: additionalInfo.componentStack,
        path: additionalInfo.path || '',
        appVersion: Constants.expoConfig?.version || '1.0.0',
        deviceInfo: {
          platform: Platform.OS,
          osVersion: Platform.Version?.toString(),
          deviceModel: Platform.OS === 'ios' ? Platform.constants?.osVersion : undefined,
        },
      };

      // Store error locally for later analysis or upload
      await this.storeErrorLocally(errorReport);

      // In production, send to error tracking service
      if (appConfig.isProduction && appConfig.errorReportingEnabled) {
        // If you integrate with an error reporting service like Sentry,
        // you would send the error here
        // this.sendToErrorService(errorReport);
      }

    } catch (trackingError) {
      // Last resort, log to console
      console.error('Failed to track error:', trackingError);
    }
  }

  /**
   * Get all stored errors
   */
  async getStoredErrors(): Promise<ErrorReport[]> {
    try {
      const storedErrors = await AsyncStorage.getItem(ERROR_STORAGE_KEY);
      return storedErrors ? JSON.parse(storedErrors) : [];
    } catch (error) {
      logger.error('Failed to get stored errors:', error);
      return [];
    }
  }

  /**
   * Clear all stored errors
   */
  async clearStoredErrors(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(ERROR_STORAGE_KEY);
      return true;
    } catch (error) {
      logger.error('Failed to clear stored errors:', error);
      return false;
    }
  }

  /**
   * Store an error report locally
   */
  private async storeErrorLocally(errorReport: ErrorReport): Promise<void> {
    try {
      // Get current stored errors
      let storedErrors = await this.getStoredErrors();
      
      // Add new error to the list
      storedErrors = [errorReport, ...storedErrors];
      
      // Keep only the most recent errors
      if (storedErrors.length > MAX_STORED_ERRORS) {
        storedErrors = storedErrors.slice(0, MAX_STORED_ERRORS);
      }
      
      // Save back to storage
      await AsyncStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(storedErrors));
    } catch (error) {
      console.error('Failed to store error locally:', error);
    }
  }

  /**
   * Send stored errors to the error reporting service
   * This can be called when the app regains connectivity
   */
  async uploadStoredErrors(): Promise<boolean> {
    if (!appConfig.errorReportingEnabled) return false;
    
    try {
      const storedErrors = await this.getStoredErrors();
      
      if (storedErrors.length === 0) return true;
      
      // Here you would implement the code to send errors to your service
      logger.info(`Uploading ${storedErrors.length} stored errors...`);
      
      // If successful, clear the stored errors
      await this.clearStoredErrors();
      return true;
    } catch (error) {
      logger.error('Failed to upload stored errors:', error);
      return false;
    }
  }
}

export default new ErrorTrackingService();
