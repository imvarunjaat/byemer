import { PostgrestFilterBuilder } from '@supabase/postgrest-js';
import { supabase } from './supabase';
import CacheManager from './cache-manager';
import { createPaginatedQuery } from './pagination-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '../types';

/**
 * Enhanced message service with pagination and caching
 */
export const enhancedMessageService = {
  /**
   * Fetch messages with pagination, caching, and offline support
   */
  async fetchPaginatedMessages(
    roomId: string,
    options = { pageSize: 20, initialPage: 0 }
  ): Promise<{ messages: Message[], hasMore: boolean }> {
    const cacheKey = `room_messages_${roomId}`;
    
    try {
      // Create a query to get messages for this room
      const query = supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId);
      
      // Create a paginated query
      const { fetchNextPage, resetPagination } = createPaginatedQuery<Message>(
        query,
        {
          pageSize: options.pageSize,
          orderBy: 'created_at',
          orderDirection: 'desc',
          initialPage: options.initialPage
        }
      );
      
      // Fetch the next page
      const { data, hasMore } = await fetchNextPage();
      
      // Ensure data is an array for safe processing
      const fetchedMessages = Array.isArray(data) ? data : [];

      // Cache the messages (with 1 hour expiry)
      if (fetchedMessages.length > 0) {
        // Get previously cached messages
        const cachedMessages = (await CacheManager.getItem<Message[]>(cacheKey)) || [];
        
        // Merge new messages with cached (avoiding duplicates)
        const messageMap = new Map();
        [...cachedMessages, ...fetchedMessages].forEach(msg => {
          messageMap.set(msg.id, msg);
        });
        
        const combinedMessages = Array.from(messageMap.values());
        
        // Update the cache with the combined messages
        await CacheManager.setItem(cacheKey, combinedMessages, {
          expiry: 60 * 60 * 1000, // 1 hour
        });
        
        // Also update the AsyncStorage backup (for backward compatibility)
        await AsyncStorage.setItem(`messages_${roomId}`, JSON.stringify(combinedMessages));
      }
      
      return {
        messages: fetchedMessages,
        hasMore
      };
    } catch (error) {
      console.error('Error fetching paginated messages:', error);
      
      // Try to load from cache if online fetch fails
      const cachedMessages = await CacheManager.getItem<Message[]>(cacheKey, []);
      return {
        messages: cachedMessages || [],
        hasMore: false // Assume no more when loading from cache
      };
    }
  },

  /**
   * Fetch all messages for a room with caching
   * (legacy method for backward compatibility)
   */
  async fetchAllMessages(roomId: string): Promise<Message[]> {
    const cacheKey = `room_messages_${roomId}`;
    
    try {
      // Try to fetch fresh data
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Cache the fresh data
      if (data && data.length > 0) {
        await CacheManager.setItem(cacheKey, data, {
          expiry: 60 * 60 * 1000 // 1 hour
        });
        
        // Also update the AsyncStorage backup (for backward compatibility)
        await AsyncStorage.setItem(`messages_${roomId}`, JSON.stringify(data));
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching all messages:', error);
      
      // Try to load from cache
      const cachedMessages = await CacheManager.getItem<Message[]>(cacheKey, []);
      if (cachedMessages && cachedMessages.length > 0) {
        return cachedMessages;
      }
      
      // Legacy fallback to AsyncStorage
      try {
        const storedMessages = await AsyncStorage.getItem(`messages_${roomId}`);
        if (storedMessages) {
          return JSON.parse(storedMessages);
        }
      } catch (storageError) {
        console.error('Error reading from AsyncStorage:', storageError);
      }
      
      return [];
    }
  },

  /**
   * Add a new message to the local cache
   */
  async addMessageToCache(message: Message): Promise<void> {
    const roomId = message.room_id;
    const cacheKey = `room_messages_${roomId}`;
    
    try {
      // Get existing messages
      const cachedMessages = (await CacheManager.getItem<Message[]>(cacheKey)) || [];
      
      // Add new message to the beginning (assuming descending order by created_at)
      const updatedMessages = [message, ...cachedMessages];
      
      // Update cache
      await CacheManager.setItem(cacheKey, updatedMessages, {
        expiry: 60 * 60 * 1000 // 1 hour
      });
      
      // Also update AsyncStorage (for backward compatibility)
      await AsyncStorage.setItem(`messages_${roomId}`, JSON.stringify(updatedMessages));
    } catch (error) {
      console.error('Error adding message to cache:', error);
    }
  },

  /**
   * Clear the cache for a specific room
   */
  async clearRoomCache(roomId: string): Promise<void> {
    const cacheKey = `room_messages_${roomId}`;
    
    try {
      await CacheManager.removeItem(cacheKey);
      await AsyncStorage.removeItem(`messages_${roomId}`);
    } catch (error) {
      console.error('Error clearing room cache:', error);
    }
  }
};
