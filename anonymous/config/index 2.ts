import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Determine which environment we're in
const getEnvType = () => {
  if (__DEV__) return 'development';
  
  // We can also check for specific release channels in Expo
  const releaseChannel = Constants.expoConfig?.releaseChannel;
  if (releaseChannel) {
    if (releaseChannel.indexOf('prod') !== -1) return 'production';
    if (releaseChannel.indexOf('staging') !== -1) return 'staging';
  }
  
  // Default to production if we can't determine
  return 'production';
};

// Environment-specific configuration
const ENV = {
  development: {
    // Supabase
    supabaseUrl: 'https://your-dev-instance.supabase.co',
    supabaseAnonKey: 'your-dev-anon-key',
    
    // App settings
    logLevel: 'debug',
    maxRetries: 3,
    cacheExpiry: 30 * 60 * 1000, // 30 minutes in milliseconds
    clearCacheOnLogout: true,
    
    // API Endpoints
    apiBaseUrl: 'https://dev-api.yourapp.com',
    
    // Feature flags
    enableRoomHistory: true,
    enableOfflineMode: true,
    showDebugInfo: true,
  },
  staging: {
    // Supabase
    supabaseUrl: 'https://your-staging-instance.supabase.co',
    supabaseAnonKey: 'your-staging-anon-key',
    
    // App settings
    logLevel: 'info',
    maxRetries: 3,
    cacheExpiry: 60 * 60 * 1000, // 1 hour in milliseconds
    clearCacheOnLogout: true,
    
    // API Endpoints
    apiBaseUrl: 'https://staging-api.yourapp.com',
    
    // Feature flags
    enableRoomHistory: true,
    enableOfflineMode: true,
    showDebugInfo: false,
  },
  production: {
    // Supabase
    supabaseUrl: 'https://your-prod-instance.supabase.co',
    supabaseAnonKey: 'your-prod-anon-key',
    
    // App settings
    logLevel: 'error', // Only log errors in production
    maxRetries: 5,
    cacheExpiry: 6 * 60 * 60 * 1000, // 6 hours in milliseconds
    clearCacheOnLogout: true,
    
    // API Endpoints
    apiBaseUrl: 'https://api.yourapp.com',
    
    // Feature flags
    enableRoomHistory: true,
    enableOfflineMode: true,
    showDebugInfo: false,
  }
};

// Get the current environment
const currentEnv = getEnvType();
export const config = ENV[currentEnv];

// Add environment info to the exported config
export const environment = {
  currentEnv,
  isProduction: currentEnv === 'production',
  isDevelopment: currentEnv === 'development',
  isStaging: currentEnv === 'staging',
  version: Constants.expoConfig?.version || '1.0.0',
  buildNumber: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1',
  platform: Platform.OS
};

// Custom logger that respects the configured log level
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (LOG_LEVEL_PRIORITY[config.logLevel as LogLevel] <= LOG_LEVEL_PRIORITY.debug) {
      if (__DEV__) {
        console.log(`[DEBUG] ${message}`, ...args);
      }
    }
  },
  
  info: (message: string, ...args: any[]) => {
    if (LOG_LEVEL_PRIORITY[config.logLevel as LogLevel] <= LOG_LEVEL_PRIORITY.info) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (LOG_LEVEL_PRIORITY[config.logLevel as LogLevel] <= LOG_LEVEL_PRIORITY.warn) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  
  error: (message: string, ...args: any[]) => {
    if (LOG_LEVEL_PRIORITY[config.logLevel as LogLevel] <= LOG_LEVEL_PRIORITY.error) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
};
