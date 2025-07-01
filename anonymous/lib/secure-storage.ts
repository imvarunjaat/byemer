import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logger } from '../config';

/**
 * Secure Storage utility - uses SecureStore on native platforms
 * and falls back to encrypted AsyncStorage on web
 */
class SecureStorage {
  private prefix = 'secure_';
  private encryptionKey = 'anonymous_app_key'; // This should be moved to environment variables

  /**
   * Store a value securely
   * 
   * @param key Storage key
   * @param value Value to store
   * @returns Success status
   */
  async setItem(key: string, value: string): Promise<boolean> {
    const prefixedKey = `${this.prefix}${key}`;
    
    try {
      if (this.isNativePlatform()) {
        await SecureStore.setItemAsync(prefixedKey, value);
      } else {
        // For web, we'll use AsyncStorage with simple encryption
        // Note: This is not truly secure but better than plaintext
        const encryptedValue = this.simpleEncrypt(value);
        await AsyncStorage.setItem(prefixedKey, encryptedValue);
      }
      return true;
    } catch (error) {
      logger.error(`Failed to securely store item ${key}:`, error);
      return false;
    }
  }

  /**
   * Retrieve a securely stored value
   * 
   * @param key Storage key
   * @returns The stored value or null
   */
  async getItem(key: string): Promise<string | null> {
    const prefixedKey = `${this.prefix}${key}`;
    
    try {
      if (this.isNativePlatform()) {
        return await SecureStore.getItemAsync(prefixedKey);
      } else {
        // For web, decrypt the value from AsyncStorage
        const encryptedValue = await AsyncStorage.getItem(prefixedKey);
        if (!encryptedValue) return null;
        return this.simpleDecrypt(encryptedValue);
      }
    } catch (error) {
      logger.error(`Failed to retrieve secure item ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a securely stored value
   * 
   * @param key Storage key
   * @returns Success status
   */
  async removeItem(key: string): Promise<boolean> {
    const prefixedKey = `${this.prefix}${key}`;
    
    try {
      if (this.isNativePlatform()) {
        await SecureStore.deleteItemAsync(prefixedKey);
      } else {
        await AsyncStorage.removeItem(prefixedKey);
      }
      return true;
    } catch (error) {
      logger.error(`Failed to remove secure item ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if a key exists in secure storage
   * 
   * @param key Storage key
   * @returns Whether the key exists
   */
  async hasItem(key: string): Promise<boolean> {
    const value = await this.getItem(key);
    return value !== null;
  }

  /**
   * Store sensitive user credentials
   * 
   * @param userId User ID
   * @param accessToken Access token
   * @param refreshToken Refresh token (optional)
   */
  async storeUserCredentials(
    userId: string,
    accessToken: string,
    refreshToken?: string
  ): Promise<boolean> {
    try {
      await this.setItem('user_id', userId);
      await this.setItem('access_token', accessToken);
      
      if (refreshToken) {
        await this.setItem('refresh_token', refreshToken);
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to store user credentials:', error);
      return false;
    }
  }

  /**
   * Clear all user credentials
   */
  async clearUserCredentials(): Promise<boolean> {
    try {
      await this.removeItem('user_id');
      await this.removeItem('access_token');
      await this.removeItem('refresh_token');
      return true;
    } catch (error) {
      logger.error('Failed to clear user credentials:', error);
      return false;
    }
  }

  /**
   * Get stored user credentials
   * 
   * @returns User credentials or null if not found
   */
  async getUserCredentials(): Promise<{
    userId: string;
    accessToken: string;
    refreshToken?: string;
  } | null> {
    try {
      const userId = await this.getItem('user_id');
      const accessToken = await this.getItem('access_token');
      
      if (!userId || !accessToken) {
        return null;
      }
      
      const refreshToken = await this.getItem('refresh_token');
      
      return {
        userId,
        accessToken,
        refreshToken: refreshToken || undefined
      };
    } catch (error) {
      logger.error('Failed to get user credentials:', error);
      return null;
    }
  }

  // Private helper methods
  private isNativePlatform(): boolean {
    return Platform.OS !== 'web';
  }

  // Very simple encryption/decryption methods
  // Note: This is NOT secure for serious applications
  // For production, use a proper encryption library
  private simpleEncrypt(text: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
      result += String.fromCharCode(charCode);
    }
    return Buffer.from(result).toString('base64');
  }

  private simpleDecrypt(encrypted: string): string {
    const text = Buffer.from(encrypted, 'base64').toString();
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  }
}

// Export as singleton
export default new SecureStorage();
