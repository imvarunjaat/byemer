import { supabase, Room, RoomParticipant, Message } from '@/lib/supabase';
import { Profile } from './user-service';

// Service for managing rooms
export const roomService = {
  // Create a new room
  async createRoom(name: string, createdBy: string, isPrivate: boolean = false, accessCode?: string): Promise<Room | null> {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          name,
          created_by: createdBy,
          is_private: isPrivate,
          access_code: accessCode || null
        })
        .select()
        .single();

      if (error) throw error;
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

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting room:', error);
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

  // Join a room
  async joinRoom(roomId: string, userId: string): Promise<RoomParticipant | null> {
    try {
      // Check if user is already in the room
      const { data: existing, error: checkError } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

      if (!checkError && existing) {
        // User is already in the room, just return the existing record
        return existing;
      }

      // User is not in the room, add them
      const { data, error } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomId,
          user_id: userId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error joining room:', error);
      return null;
    }
  },

  // Leave a room
  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;
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
      const { data, error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          user_id: userId,
          nickname,
          content,
          sent_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  },

  // Get messages from a room
  async getRoomMessages(roomId: string, limit = 50, before?: string): Promise<Message[]> {
    try {
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

      // Return messages in oldest first order for display
      return data ? [...data].reverse() : [];
    } catch (error) {
      console.error('Error getting room messages:', error);
      return [];
    }
  },

  // Delete a message
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      // Only allow delete if user is the message author
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  },

  // Listen to new messages in a room
  subscribeToNewMessages(roomId: string, callback: (message: Message) => void): () => void {
    const subscription = supabase
      .channel(`room-${roomId}-messages`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      }, (payload: { new: Message }) => {
        if (payload.new) {
          callback(payload.new);
        }
      })
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(subscription);
    };
  }
};
