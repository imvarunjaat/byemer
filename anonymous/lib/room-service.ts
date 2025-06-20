import { supabase, Room, RoomParticipant, Message } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile } from './user-service';

// Service for managing rooms
export const roomService = {
  // Create a new room
  async createRoom(name: string, createdBy: string, isPrivate: boolean = false, accessCode?: string, emoji: string = '💬'): Promise<Room | null> {
    try {
      // Create room in Supabase
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          name,
          created_by: createdBy,
          is_private: isPrivate,
          access_code: accessCode
        })
        .select()
        .single();

      if (error) throw error;
      
      // Add to user's recent rooms in Supabase
      try {
        const { error: recentRoomError } = await supabase
          .from('user_recent_rooms')
          .upsert({
            user_id: createdBy,
            room_id: data.id,
            last_accessed: new Date().toISOString(),
            emoji: emoji // Use the provided emoji
          }, {
            onConflict: 'user_id,room_id',
            ignoreDuplicates: false
          });
        
        if (recentRoomError) {
          console.error('Failed to add room to user_recent_rooms:', recentRoomError);
        }
      } catch (storageError) {
        console.error('Failed to add room to recent rooms:', storageError);
      }
      
      return data;
    } catch (error) {
      console.error('Error creating room:', error);
      return null;
    }
  },

  // Get room by ID (falls back to using access_code for numeric codes)
  async getRoomById(roomIdOrCode: string): Promise<Room | null> {
    try {
      // Always try by UUID first
      let { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomIdOrCode)
        .single();
      
      if (error && error.code === '22P02') { // Invalid UUID format error
        // If that fails, try by access_code for backward compatibility
        const response = await supabase
          .from('rooms')
          .select('*')
          .eq('access_code', roomIdOrCode)
          .single();
        
        data = response.data;
        error = response.error;
      }

      // Handle 'no rows returned' error silently
      if (error && (error.code === 'PGRST116' || 
                   (error.message && error.message.includes('no rows')) || 
                   (error.details && error.details.includes('0 rows')))) {
        // No need to log this specific error, it's an expected case
        return null;
      }

      // Handle other errors
      if (error) {
        console.error('Unexpected error getting room:', error);
        throw error;
      }
      
      return data;
    } catch (error: any) {
      // Only log non-expected errors 
      if (!(error?.code === 'PGRST116' || 
           (error?.message && error?.message.includes('no rows')) || 
           (error?.details && error?.details.includes('0 rows')))) {
        console.error('Error getting room:', error);
      }
      return null;
    }
  },

  // Get all public rooms
  async getPublicRooms(): Promise<Room[]> {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_private', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting public rooms:', error);
      return [];
    }
  },

  // Get rooms created by a user
  async getUserRooms(userId: string): Promise<Room[]> {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user rooms:', error);
      return [];
    }
  },
  
  // Get user's recent rooms from Supabase using separate queries instead of joins
  async getRecentRooms(userId: string): Promise<any[]> {
    try {
      // First get the user's recent room IDs
      const { data: recentRoomData, error: recentRoomError } = await supabase
        .from('user_recent_rooms')
        .select('id, room_id, last_accessed, emoji, nickname')
        .eq('user_id', userId)
        .order('last_accessed', { ascending: false })
        .limit(10);

      if (recentRoomError) {
        console.error('Failed to get recent rooms data:', recentRoomError);
        return [];
      }
      
      if (!recentRoomData || recentRoomData.length === 0) {
        return [];
      }
      
      // Extract room IDs
      const roomIds = recentRoomData.map(item => item.room_id);
      
      // Get the actual room data with a separate query
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .in('id', roomIds);
        
      if (roomsError) {
        console.error('Failed to get rooms data:', roomsError);
        return [];
      }
      
      // Combine the data to match the expected format
      return recentRoomData.map(recentRoom => {
        const room = roomsData.find(r => r.id === recentRoom.room_id) || null;
        return {
          ...recentRoom,
          rooms: room,  // Keep the original property
          room: room    // Add the expected property
        };
      });
    } catch (error) {
      console.error('Failed to get recent rooms:', error);
      return [];
    }
  },
  
  // Clear recent rooms functionality is disabled as requested
  async clearRecentRooms(userId: string): Promise<void> {
    // This functionality has been removed as requested
    console.log('Clear rooms functionality disabled');
    return;
  },

  // Join a room
  async joinRoom(roomId: string, userId: string, nickname?: string): Promise<RoomParticipant | null> {
    try {
      // First check if already joined
      const { data: existing } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        // Update nickname if provided
        const updateData: any = { 
          is_active: true, 
          last_seen_at: new Date().toISOString() 
        };
        
        if (nickname) {
          updateData.nickname = nickname;
        }
        
        // Already joined, update is_active to true and possibly nickname
        await supabase
          .from('room_participants')
          .update(updateData)
          .eq('id', existing.id);

        // Add to user's recent rooms
        this.addRoomToRecents(roomId, userId, nickname);
          
        return existing;
      }

      // Insert new participant
      const { data, error } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomId,
          user_id: userId,
          is_active: true,
          joined_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          nickname: nickname
        })
        .select()
        .single();

      if (error) throw error;
      
      // Add to user's recent rooms
      this.addRoomToRecents(roomId, userId, nickname);
      
      return data;
    } catch (error) {
      console.error('Error joining room:', error);
      return null;
    }
  },
  
  // Helper to add a room to user's recent rooms when joined
  async addRoomToRecents(roomId: string, userId: string, nickname?: string, emoji: string = '💬'): Promise<void> {
    try {
      // Check if room exists
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('id', roomId)
        .single();
      
      if (roomError || !room) {
        console.error('Room not found when trying to add to recents:', roomError);
        return;
      }
      
      // Add to user's recent rooms in Supabase
      const { error } = await supabase
        .from('user_recent_rooms')
        .upsert({
          user_id: userId,
          room_id: roomId,
          last_accessed: new Date().toISOString(),
          emoji: emoji, // Use provided emoji
          nickname: nickname // Store the nickname used for this room
        }, {
          onConflict: 'user_id,room_id',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error('Error updating user_recent_rooms:', error);
      }
    } catch (error) {
      console.error('Error adding room to recents:', error);
    }
  },

  // Leave a room
  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      // First remove from room_participants
      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;
      
      // Also remove from user_recent_rooms to prevent it showing in recent rooms
      try {
        const { error: recentRoomError } = await supabase
          .from('user_recent_rooms')
          .delete()
          .eq('room_id', roomId)
          .eq('user_id', userId);
          
        if (recentRoomError) {
          console.error('Error removing from recent rooms:', recentRoomError);
          // Continue anyway as the main action succeeded
        }
      } catch (recentError) {
        console.error('Failed to remove room from recent rooms:', recentError);
        // Continue anyway as the main action succeeded
      }
      
      return true;
    } catch (error) {
      console.error('Error leaving room:', error);
      return false;
    }
  },

  // Get participants in a room
  async getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting room participants:', error);
      return [];
    }
  },

  // Delete a room (only if created by user)
  async deleteRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      // Verify the room belongs to the user
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .eq('created_by', userId)
        .single();

      if (roomError || !room) return false;

      // Delete the room
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);

      if (error) throw error;
      
      // Also remove from user_recent_rooms for the user who deleted it
      try {
        const { error: recentRoomError } = await supabase
          .from('user_recent_rooms')
          .delete()
          .eq('room_id', roomId)
          .eq('user_id', userId);
          
        if (recentRoomError) {
          console.error('Error removing deleted room from recent rooms:', recentRoomError);
          // Continue anyway as the main delete action succeeded
        }
      } catch (recentError) {
        console.error('Failed to remove deleted room from recent rooms:', recentError);
        // Continue anyway as the main delete action succeeded
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting room:', error);
      return false;
    }
  }
};

// Service for managing messages
export const messageService = {
  // Send a message
  async sendMessage(roomId: string, userId: string, nickname: string, content: string): Promise<Message | null> {
    try {
      console.log('Sending message:', { roomId, userId, nickname, content });
      
      // Update this room as recently accessed
      roomService.addRoomToRecents(roomId, userId, nickname);
      
      // Send to Supabase with nickname included
      const { data, error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          user_id: userId,
          content,
          nickname // Store nickname with the message in Supabase
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting message in Supabase:', error);
        throw error;
      }
      
      console.log('Message successfully saved to Supabase:', data);
      
      // For offline resilience, store in AsyncStorage as well
      try {
        const localStorageKey = `messages_${roomId}`;
        const storedMessagesJSON = await AsyncStorage.getItem(localStorageKey);
        const storedMessages = storedMessagesJSON ? JSON.parse(storedMessagesJSON) : [];
        storedMessages.push({
          ...data,
          nickname,
          sent_at: new Date().toISOString()
        });
        await AsyncStorage.setItem(localStorageKey, JSON.stringify(storedMessages));
        console.log('Message backup saved to AsyncStorage');
      } catch (storageError) {
        console.error('Failed to store message backup locally:', storageError);
        // Continue anyway since the message is already in Supabase
      }
      
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  },

  // Get messages from a room (combines local and remote messages)
  async getRoomMessages(roomId: string, limit = 50, before?: string): Promise<Message[]> {
    try {
      // First try to get messages from local storage
      const localStorageKey = `messages_${roomId}`;
      const localMessagesJSON = await AsyncStorage.getItem(localStorageKey);
      const localMessages = localMessagesJSON ? JSON.parse(localMessagesJSON) : [];
      
      // Then get messages from Supabase
      let query = supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data, error } = await query;

      if (error) throw error;
      const remoteMessages = data || [];
      
      // Combine and deduplicate messages
      const messagesMap = new Map();
      
      // Process remote messages first
      remoteMessages.forEach((message: Message) => {
        messagesMap.set(message.id, message);
      });
      
      // Then process local messages, which may have additional fields like nickname
      localMessages.forEach((message: Message) => {
        if (!messagesMap.has(message.id)) {
          messagesMap.set(message.id, message);
        } else {
          // If both exist, merge them with local taking precedence for fields like nickname
          messagesMap.set(message.id, {
            ...messagesMap.get(message.id),
            ...message
          });
        }
      });
      
      // Convert map back to array and sort by sent_at
      const combinedMessages = Array.from(messagesMap.values());
      combinedMessages.sort((a, b) => {
        const dateA = new Date(a.sent_at || a.created_at).getTime();
        const dateB = new Date(b.sent_at || b.created_at).getTime();
        return dateA - dateB; // ascending order by date
      });
      
      // Update local storage with latest combined messages
      await AsyncStorage.setItem(localStorageKey, JSON.stringify(combinedMessages));
      
      return combinedMessages;
    } catch (error) {
      console.error('Error getting room messages:', error);
      // Try to at least return local messages if available
      try {
        const localStorageKey = `messages_${roomId}`;
        const localMessagesJSON = await AsyncStorage.getItem(localStorageKey);
        if (localMessagesJSON) {
          const localMessages = JSON.parse(localMessagesJSON);
          return localMessages;
        }
      } catch (storageError) {
        console.error('Error getting local messages:', storageError);
      }
      return [];
    }
  },

  // Delete a message
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      // Get the message to find the room_id before deleting
      const { data: messageData, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .eq('user_id', userId)
        .single();
        
      if (fetchError) throw fetchError;
      const roomId = messageData?.room_id;
      
      // Only allow delete if user is the message author
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', userId);

      if (error) throw error;
      
      // Also remove from local storage if we have the roomId
      if (roomId) {
        try {
          const localStorageKey = `messages_${roomId}`;
          const messagesJSON = await AsyncStorage.getItem(localStorageKey);
          
          if (messagesJSON) {
            const messages = JSON.parse(messagesJSON);
            const updatedMessages = messages.filter((msg: Message) => msg.id !== messageId);
            await AsyncStorage.setItem(localStorageKey, JSON.stringify(updatedMessages));
          }
        } catch (storageError) {
          console.error('Error updating local message storage after delete:', storageError);
          // Continue anyway as the message was deleted from the server
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  },

  // Listen to new messages in a room
  subscribeToNewMessages(roomId: string, callback: (message: Message) => void): () => void {
    console.log(`Setting up subscription for room ${roomId}`);
    
    // First, check for local messages that might have been added while offline
    this.checkLocalMessages(roomId, callback);
    
    const subscription = supabase
      .channel(`room-${roomId}-messages`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      }, async (payload: { new: Message }) => {
        console.log('Real-time message received:', payload.new);
        
        if (payload.new) {
          try {
            // Get nickname from local storage if available
            const localStorageKey = `messages_${roomId}`;
            console.log('Looking for nickname in local storage:', localStorageKey);
            
            const messagesJSON = await AsyncStorage.getItem(localStorageKey);
            if (messagesJSON) {
              const messages = JSON.parse(messagesJSON);
              console.log(`Found ${messages.length} local messages to check for nickname match`);
              
              // Find matching message by content and time to get nickname
              const matchingMsg = messages.find((m: Message) => {
                return m.user_id === payload.new.user_id && 
                       m.content === payload.new.content;
              });
              
              if (matchingMsg && matchingMsg.nickname) {
                // Add nickname to the message
                console.log('Found matching message with nickname:', matchingMsg.nickname);
                payload.new.nickname = matchingMsg.nickname;
              } else {
                console.log('No matching message found with nickname');
                // Use a default nickname if we can't find one
                payload.new.nickname = 'User';
              }
            } else {
              console.log('No local messages found in storage');
              // Provide a default nickname
              payload.new.nickname = 'User';
            }
          } catch (err) {
            console.error('Error enhancing realtime message:', err);
            // Set a default nickname as fallback
            payload.new.nickname = 'User';
          }
          
          // Call callback with the message
          console.log('Calling callback with enhanced message:', payload.new);
          callback(payload.new);
        }
      })
      .subscribe();
    
    console.log('Subscription created and activated');


    // Return unsubscribe function
    return () => {
      supabase.removeChannel(subscription);
    };
  },
  
  // Check for messages stored locally that might not have been sent to Supabase
  async checkLocalMessages(roomId: string, callback: (message: Message) => void): Promise<void> {
    try {
      const localStorageKey = `messages_${roomId}`;
      const messagesJSON = await AsyncStorage.getItem(localStorageKey);
      if (messagesJSON) {
        const messages = JSON.parse(messagesJSON);
        // Only process messages from the last 5 minutes to avoid duplicates
        const recentTime = Date.now() - 5 * 60 * 1000;
        for (const msg of messages) {
          const msgTime = new Date(msg.created_at || msg.sent_at).getTime();
          if (msgTime > recentTime) {
            // Check if this is a local-only message (no id from server)
            if (!msg.id || msg.id.startsWith('local_')) {
              // Generate a temporary ID if needed
              if (!msg.id) {
                msg.id = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
              }
              callback(msg);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error checking local messages:', err);
    }
  }
};
