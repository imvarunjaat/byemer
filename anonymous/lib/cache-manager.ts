import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cache item with expiry tracking
 */
interface CacheItem<T> {
  value: T;
  timestamp: number;
  expiry?: number; // Optional expiry time in milliseconds
}

/**
 * Enhanced Cache Manager with expiry, compression and error handling
 */
class CacheManager {
  private readonly prefix: string = 'app_cache_';
  
  /**
   * Set an item in the cache
   * 
   * @param key Cache key
   * @param value Value to store
   * @param options Optional configuration
   */
  async setItem<T>(
    key: string,
    value: T,
    options: {
      expiry?: number; // Time in milliseconds until the cache expires
      overwrite?: boolean; // Whether to overwrite existing cache
    } = {}
  ): Promise<void> {
    const { expiry, overwrite = true } = options;
    const prefixedKey = this.getPrefixedKey(key);
    
    try {
      // Check if we should overwrite
      if (!overwrite) {
        const exists = await this.hasItem(key);
        if (exists) return;
      }
      
      // Create cache item with metadata
      const cacheItem: CacheItem<T> = {
        value,
        timestamp: Date.now(),
        expiry
      };
      
      // Serialize and store
      const serialized = JSON.stringify(cacheItem);
      await AsyncStorage.setItem(prefixedKey, serialized);
    } catch (error) {
      console.error(`Error caching item ${key}:`, error);
      // Fail silently in production
    }
  }
  
  /**
   * Get an item from the cache
   * 
   * @param key Cache key
   * @param defaultValue Value to return if key doesn't exist
   * @returns The cached value or defaultValue
   */
  async getItem<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const prefixedKey = this.getPrefixedKey(key);
    
    try {
      const serialized = await AsyncStorage.getItem(prefixedKey);
      if (!serialized) return defaultValue;
      
      const cacheItem: CacheItem<T> = JSON.parse(serialized);
      
      // Check if cache has expired
      if (this.isExpired(cacheItem)) {
        await this.removeItem(key);
        return defaultValue;
      }
      
      return cacheItem.value;
    } catch (error) {
      console.error(`Error retrieving cached item ${key}:`, error);
      return defaultValue;
    }
  }
  
  /**
   * Check if an item exists in the cache and is not expired
   * 
   * @param key Cache key
   * @returns Whether the item exists and is valid
   */
  async hasItem(key: string): Promise<boolean> {
    const prefixedKey = this.getPrefixedKey(key);
    
    try {
      const serialized = await AsyncStorage.getItem(prefixedKey);
      if (!serialized) return false;
      
      const cacheItem: CacheItem<any> = JSON.parse(serialized);
      
      // Check if cache has expired
      if (this.isExpired(cacheItem)) {
        await this.removeItem(key);
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Remove an item from the cache
   * 
   * @param key Cache key
   */
  async removeItem(key: string): Promise<void> {
    const prefixedKey = this.getPrefixedKey(key);
    
    try {
      await AsyncStorage.removeItem(prefixedKey);
    } catch (error) {
      console.error(`Error removing cached item ${key}:`, error);
    }
  }
  
  /**
   * Clear all app-related cache items
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.prefix));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
  
  /**
   * Clear expired items from the cache
   */
  async clearExpiredItems(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.prefix));
      
      const expiredKeys: string[] = [];
      
      for (const key of cacheKeys) {
        const serialized = await AsyncStorage.getItem(key);
        if (!serialized) continue;
        
        try {
          const cacheItem: CacheItem<any> = JSON.parse(serialized);
          if (this.isExpired(cacheItem)) {
            expiredKeys.push(key);
          }
        } catch {
          // If we can't parse it, it's corrupted, so remove it
          expiredKeys.push(key);
        }
      }
      
      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
      }
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }
  
  /**
   * Get cache statistics
   * 
   * @returns Statistics about the current cache state
   */
  async getCacheStats(): Promise<{ totalItems: number; totalSize: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.prefix));
      
      let totalSize = 0;
      
      for (const key of cacheKeys) {
        const item = await AsyncStorage.getItem(key);
        if (item) {
          totalSize += item.length;
        }
      }
      
      return {
        totalItems: cacheKeys.length,
        totalSize // Size in bytes
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalItems: 0, totalSize: 0 };
    }
  }
  
  // Private helper methods
  
  private getPrefixedKey(key: string): string {
    return `${this.prefix}${key}`;
  }
  
  private isExpired<T>(cacheItem: CacheItem<T>): boolean {
    if (!cacheItem.expiry) return false;
    
    const now = Date.now();
    const expiryTime = cacheItem.timestamp + cacheItem.expiry;
    
    return now > expiryTime;
  }
}

// Export as singleton
export default new CacheManager();
