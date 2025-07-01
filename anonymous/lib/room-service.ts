import { supabase, Room, RoomParticipant, Message } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile } from './user-service';

// Service for managing rooms
export const roomService = {
  // Get unread message count for a room
  async getUnreadMessageCount(roomId: string, userId: string): Promise<number> {
    try {
      // Get the last read timestamp for this user and room (using last_accessed as a fallback for last_read_at)
      const { data: userRoom } = await supabase
        .from('user_recent_rooms')
        .select('last_accessed')
        .eq('user_id', userId)
        .eq('room_id', roomId)
        .single();
      
      // If we have no record of this room or the user hasn't accessed it yet
      const lastReadAt = userRoom?.last_accessed || '2000-01-01T00:00:00Z';
      
      // Count messages after the last read time
      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('room_id', roomId)
        .gt('created_at', lastReadAt)
        .not('user_id', 'eq', userId); // Don't count the user's own messages
      
      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return 0;
    }
  },
  
  // Mark all messages as read in a room by updating the last_accessed field
  async markRoomAsRead(roomId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_recent_rooms')
        .update({ 
          last_accessed: new Date().toISOString() // Using last_accessed instead of last_read_at
        })
        .eq('user_id', userId)
        .eq('room_id', roomId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking room as read:', error);
      return false;
    }
  },
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
  async joinRoom(roomId: string, userId: string, nickname?: string): Promise<{ participant: RoomParticipant | null; alreadyJoined: boolean }> {
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
          
        return { participant: existing, alreadyJoined: true };
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
      
      return { participant: data, alreadyJoined: false };
    } catch (error) {
      console.error('Error joining room:', error);
      return { participant: null, alreadyJoined: false };
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
          last_accessed: new Date().toISOString(), // This is the correct column to use instead of last_read_at
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
      return []; // Return empty array on error
    }
  },
  
  // Check if a user has been kicked from a room
  async isUserKickedFromRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      // First check local storage for kicked users - this is the most reliable method
      const kickedUsersKey = `kicked_users_${roomId}`;
      const kickedUsersJSON = await AsyncStorage.getItem(kickedUsersKey);
      
      if (kickedUsersJSON) {
        const kickedUsers = JSON.parse(kickedUsersJSON);
        if (kickedUsers[userId]) {
          return true;
        }
      }
      
      // Before we look at the database, check if this is a room that the user just created
      const { data: roomInfo } = await supabase
        .from('rooms')
        .select('created_by, created_at')
        .eq('id', roomId)
        .single();
      
      // If this user is the creator of the room, they can't be kicked
      if (roomInfo && roomInfo.created_by === userId) {
        console.log(`User ${userId} is the creator of room ${roomId}, can't be kicked`);
        return false;
      }
      
      // If room was created in last 10 seconds and user is accessing it now,
      // they're likely creating it, not being kicked
      if (roomInfo) {
        const roomCreatedAt = new Date(roomInfo.created_at).getTime();
        const now = Date.now();
        const isNewRoom = (now - roomCreatedAt) < 10000; // 10 seconds
        
        if (isNewRoom) {
          console.log(`Room ${roomId} was just created, this is likely not a kick scenario`);
          return false;
        }
      }
      
      // First check if user ever joined this room (check recent rooms)
      const { data: recentRoom } = await supabase
        .from('user_recent_rooms')
        .select('id, last_accessed')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .limit(1);
        
      // If no recent room record, user was never in this room
      if (!recentRoom || recentRoom.length === 0) {
        console.log(`User ${userId} was never in room ${roomId}, not kicked`);
        return false; // Not kicked, just never joined
      }
      
      // Now check if they're still in room participants
      const { data: participant } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .limit(1);
      
      // User was in the room (has recent room) but is no longer a participant
      if (!participant || participant.length === 0) {
        // Check if this is the first time the user is accessing the room
        // by looking at the recent room's last_accessed timestamp
        const lastAccessed = new Date(recentRoom[0].last_accessed).getTime();
        const now = Date.now();
        const isFirstAccess = (now - lastAccessed) > 86400000; // 24 hours
        
        if (isFirstAccess) {
          console.log(`This appears to be first access in a while, not treating as kicked`);
          return false;
        }
        
        console.log(`User ${userId} was previously in room ${roomId} but isn't anymore - likely kicked`);
        
        // Store this in local kicked users for future reference
        const existingDataJSON = await AsyncStorage.getItem(kickedUsersKey);
        const kickedUsers = existingDataJSON ? JSON.parse(existingDataJSON) : {};
        
        kickedUsers[userId] = {
          kickedAt: new Date().toISOString(),
          kickedBy: 'unknown' // We don't know who kicked them
        };
        
        await AsyncStorage.setItem(kickedUsersKey, JSON.stringify(kickedUsers));
        return true;
      }
      
      return false; // User is still in the room, not kicked
    } catch (error) {
      console.error('Error checking if user is kicked:', error);
      return false; // Default to allowing access if we can't determine
    }
  },
  
  // Subscribe to room participant changes using a modified approach that doesn't rely on Postgres changes
  subscribeToRoomParticipants(roomId: string, userId: string, callback: (event: 'joined' | 'left' | 'kicked', participantId: string, nickname?: string) => void): () => void {
    console.log(`Setting up participant subscription for room ${roomId} with poll-based approach`);
    
    // Track current participants
    let currentParticipants: { [userId: string]: RoomParticipant } = {};
    let initialCheckComplete = false;
    let kickDetectionFlag = false;
    
    // Get room creator info
    let roomCreator: string | null = null;
    
    // Create a channel name for this subscription
    const channelName = `room-participants-${roomId}`;
    
    // Get room info for creator check
    // Wrap with Promise.resolve() to ensure we have a full Promise with .catch() method
    Promise.resolve(
      supabase
        .from('rooms')
        .select('created_by, created_at')
        .eq('id', roomId)
        .single()
    )
      .then(({ data }) => {
        if (data) {
          roomCreator = data.created_by;
          console.log(`Room ${roomId} creator is ${roomCreator}`);
        }
      })
      .catch((error: any) => {
        console.error(`Error getting room creator for ${roomId}:`, error);
      });
    
    // Initial load of participants
    this.getRoomParticipants(roomId).then(participants => {
      participants.forEach(p => {
        currentParticipants[p.user_id] = p;
      });
      initialCheckComplete = true;
      console.log(`Loaded ${participants.length} initial participants for room ${roomId}`);
    }).catch(error => {
      console.error(`Error loading initial participants for room ${roomId}:`, error);
    });
    
    // Setup polling interval to check for participant changes
    const pollInterval = setInterval(async () => {
      try {
        // Skip polling until initial check is complete
        if (!initialCheckComplete) {
          return;
        }
        
        // If current user is room creator, they can't be kicked
        if (userId === roomCreator) {
          // Skip kick checks for room creator
        } else if (!kickDetectionFlag) {
          // Check if current user was kicked
          const wasKicked = await this.isUserKickedFromRoom(roomId, userId);
          if (wasKicked) {
            console.log('Current user detected as kicked during poll');
            kickDetectionFlag = true; // Set flag so we only trigger this once
            callback('kicked', userId, 'You'); // Nickname might not be available here
            return;
          }
        }
        
        const latestParticipants = await this.getRoomParticipants(roomId);
        const latestParticipantsMap: { [userId: string]: RoomParticipant } = {};
        
        // Build map of latest participants
        latestParticipants.forEach(p => {
          latestParticipantsMap[p.user_id] = p;
          
          // Check for new participants
          if (!currentParticipants[p.user_id]) {
            console.log(`Detected new participant: ${p.nickname} (${p.user_id})`);
            callback('joined', p.user_id, p.nickname);
          }
        });
        
        // Check for participants who left
        Object.keys(currentParticipants).forEach(pid => {
          if (!latestParticipantsMap[pid]) {
            const oldParticipant = currentParticipants[pid];
            console.log(`Detected participant left: ${oldParticipant?.nickname || 'Unknown'} (${pid})`);
            
            // If this is the current user, check if kicked
            if (pid === userId) {
              // Check if kicked
              this.isUserKickedFromRoom(roomId, userId).then(isKicked => {
                if (isKicked && !kickDetectionFlag) {
                  console.log('Current user was kicked');
                  kickDetectionFlag = true; // Set flag so we only trigger this once
                  callback('kicked', userId, oldParticipant?.nickname || 'You');
                } else if (!kickDetectionFlag) {
                  console.log('Current user left');
                  callback('left', userId, oldParticipant?.nickname || 'You');
                }
              });
            } else {
              // Other user left
              callback('left', pid, oldParticipant?.nickname || 'Unknown');
            }
          }
        });
        
        // Update current participants
        currentParticipants = latestParticipantsMap;
      } catch (error) {
        console.error(`Error polling participants for room ${roomId}:`, error);
      }
    }, 2000); // Poll every 2 seconds
    
    // Set up enhanced channel with multiple event handlers for real-time participant updates
    const subscription = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true }  // Allow seeing your own broadcasts
        }
      })
      .on('broadcast', { event: 'kick' }, payload => {
        console.log('Received kick broadcast event', payload);
        // Handle both cases - being kicked yourself and others being kicked
        if (payload.kickedUserId === userId && !kickDetectionFlag) {
          console.log('Current user was kicked via broadcast event');
          kickDetectionFlag = true; // Set flag so we only trigger this once
          callback('kicked', userId, payload.nickname || 'You');
        } else if (payload.kickedUserId && payload.kickedUserId !== userId) {
          // Another participant was kicked, notify UI to update immediately
          console.log(`Another user was kicked: ${payload.nickname} (${payload.kickedUserId})`);
          callback('kicked', payload.kickedUserId, payload.nickname || 'Unknown User');
          
          // Also remove from our local tracking to ensure UI is consistent
          if (currentParticipants[payload.kickedUserId]) {
            delete currentParticipants[payload.kickedUserId];
          }
        }
      })
      // Also listen on the backup channel for kicks
      .subscribe((status) => {
        console.log(`Participants subscription status for room ${roomId}:`, status);
      });
      
    // Add a secondary subscription to catch participant updates through the backup channel
    const kicksSubscription = supabase
      .channel(`room-${roomId}-kicks`)
      .on('broadcast', { event: 'participant_update' }, (payload: any) => {
        console.log('Received participant_update event:', payload);
        
        // Type guard to ensure payload has the expected structure
        if (payload && typeof payload === 'object' && 'type' in payload && 
            payload.type === 'kicked' && 'userId' in payload) {
          
          // Safely handle the kick event by making sure we're passing a valid event type to callback
          const eventType: 'joined' | 'left' | 'kicked' = 'kicked';
          
          if (payload.userId === userId && !kickDetectionFlag) {
            kickDetectionFlag = true;
            callback(eventType, userId, payload.nickname || 'You');
          } else if (payload.userId !== userId) {
            callback(eventType, payload.userId, payload.nickname || 'Unknown User');
            
            // Update our local tracking
            if (currentParticipants[payload.userId]) {
              delete currentParticipants[payload.userId];
            }
          }
        }
      })
      .subscribe();
    
    console.log('Participant subscription created and activated');

    // Return unsubscribe function with comprehensive cleanup
    return () => {
      console.log(`Cleaning up participant subscription for room ${roomId}`);
      
      // Clear polling interval
      clearInterval(pollInterval);
      
      // Clean up main subscription
      try {
        supabase.removeChannel(subscription);
        console.log(`Successfully removed participant channel for room ${roomId}`);
      } catch (channelError) {
        console.error(`Error removing participant channel for room ${roomId}:`, channelError);
      }
      
      // Also clean up the kicks subscription
      try {
        supabase.removeChannel(kicksSubscription);
        console.log(`Successfully removed kicks channel for room ${roomId}`);
      } catch (kicksError) {
        console.error(`Error removing kicks channel for room ${roomId}:`, kicksError);
      }
      
      // Clear any stored references
      currentParticipants = {};
      kickDetectionFlag = false;
    };
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
  },

  // Kick a member from a room (only if executed by room creator)
  async kickMember(roomId: string, adminUserId: string, userId: string, memberNickname?: string): Promise<boolean> {
    try {
      // First verify that the user requesting the kick is the room creator
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .eq('created_by', adminUserId)
        .single();

      if (roomError || !room) {
        console.error('Not authorized to kick: not room creator');
        return false;
      }
      
      // Store the participant data before deletion to get their information
      const { data: participantData } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();
      
      // Get participant nickname or use provided name as fallback
      const nickname = participantData?.nickname || memberNickname || 'Unknown User';

      // Remove the participant from the room
      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error kicking member:', error);
        throw error;
      }
      
      // Also remove from user_recent_rooms for the kicked member
      try {
        const { error: recentRoomError } = await supabase
          .from('user_recent_rooms')
          .delete()
          .eq('room_id', roomId)
          .eq('user_id', userId);
          
        if (recentRoomError) {
          console.error('Error removing from recent rooms for kicked member:', recentRoomError);
          // Continue anyway as the main action succeeded
        }
      } catch (recentError) {
        console.error('Failed to remove room from recent rooms for kicked member:', recentError);
        // Continue anyway as the main action succeeded
      }
      
      // Broadcast a system message about the kick to all participants
      try {
        await supabase
          .from('messages')
          .insert({
            room_id: roomId,
            user_id: 'system', // Using 'system' to indicate this is a system message
            content: `${nickname} has been removed from the room`,
            created_at: new Date().toISOString(),
            nickname: 'System',
            sent_at: Date.now().toString()
          });
      } catch (messageError) {
        console.error('Error broadcasting kick message:', messageError);
        // Continue anyway as the main kick action succeeded
      }
      
      // Store kicked user information locally
      try {
        const kickedUsersKey = `kicked_users_${roomId}`;
        const existingDataJSON = await AsyncStorage.getItem(kickedUsersKey);
        const kickedUsers = existingDataJSON ? JSON.parse(existingDataJSON) : {};
        
        // Add this user to the kicked users
        kickedUsers[userId] = {
          kickedAt: new Date().toISOString(),
          kickedBy: adminUserId
        };
        
        await AsyncStorage.setItem(kickedUsersKey, JSON.stringify(kickedUsers));
        
        // Broadcast a kick event through a dedicated channel for reliable real-time updates
        try {
          // Create a stable channel name that all clients would be listening on
          const channelName = `room-participants-${roomId}`;
          console.log(`Broadcasting kick event to channel: ${channelName}`);
          
          // Subscribe to the channel first to ensure it's established
          const channel = supabase.channel(channelName, {
            config: {
              broadcast: { self: true } // Allow seeing your own broadcasts
            }
          });
          
          // Make sure channel is connected before sending, with timeout safeguard
          await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              console.log('Kick channel subscription timed out, continuing anyway');
              resolve(); // Resolve anyway after timeout to prevent UI blocking
            }, 2000); // 2-second timeout
            
            try {
              channel.subscribe((status) => {
                console.log(`Kick broadcast channel status: ${status}`);    
                // Continue once connected
                if (status === 'SUBSCRIBED') {
                  clearTimeout(timeoutId);
                  resolve();
                }
              });
            } catch (err) {
              clearTimeout(timeoutId);
              console.error('Error in kick channel subscription:', err);
              resolve(); // Resolve anyway to prevent UI blocking
            }
          });
          
          // Send the kick event with comprehensive payload data
          await channel.send({
            type: 'broadcast',
            event: 'kick',
            payload: { 
              kickedUserId: userId, 
              nickname,
              kickedAt: new Date().toISOString(),
              kickedBy: adminUserId,
              roomId: roomId 
            }
          });
          console.log('Kick broadcast sent successfully');
          
          // Also create a room-wide notification for backup
          const backupChannelName = `room-${roomId}-kicks`;
          console.log(`Broadcasting backup kick event to channel: ${backupChannelName}`);
          
          // Create and subscribe to backup channel
          const backupChannel = supabase.channel(backupChannelName, {
            config: {
              broadcast: { self: true } // Allow seeing your own broadcasts
            }
          });
          
          // Make sure backup channel is connected before sending, with timeout safeguard
          await new Promise<void>((resolve) => {
            const timeoutId = setTimeout(() => {
              console.log('Backup kick channel subscription timed out, continuing anyway');
              resolve(); // Resolve anyway after timeout to prevent UI blocking
            }, 2000); // 2-second timeout
            
            try {
              backupChannel.subscribe((status) => {
                console.log(`Backup kick channel status: ${status}`);
                // Continue once connected
                if (status === 'SUBSCRIBED') {
                  clearTimeout(timeoutId);
                  resolve();
                }
              });
            } catch (err) {
              clearTimeout(timeoutId);
              console.error('Error in backup kick channel subscription:', err);
              resolve(); // Resolve anyway to prevent UI blocking
            }
          });
          
          // Send on backup channel
          await backupChannel.send({
            type: 'broadcast',
            event: 'participant_update',
            payload: { 
              type: 'kicked',
              userId: userId, 
              nickname,
              timestamp: Date.now(),
              roomId: roomId,
              kickedBy: adminUserId
            }
          });
          
          console.log('Backup kick broadcast sent successfully');
        } catch (broadcastError) {
          console.error('Error broadcasting kick event:', broadcastError);
        }  
      } catch (error) {
        console.error('Error storing kicked user information:', error);
      }
      
      return true;
    } catch (error) {
      console.error('Error kicking member from room:', error);
      return false;
    }
  }
};

// Service for managing messages
export const messageService = {
  // Track active subscriptions to prevent duplicate subscriptions
  _activeSubscriptions: {} as Record<string, { channel: any; timestamp: number }>,
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

  // This property is no longer needed as we use _activeSubscriptions instead
  
  // Listen to new messages in a room with enhanced real-time performance
  subscribeToNewMessages(roomId: string, callback: (message: Message) => void): () => void {
    console.log(`Setting up enhanced real-time subscription for room ${roomId}`);
    
    // First, check for local messages that might have been added while offline
    this.checkLocalMessages(roomId, callback);
    
    // Generate a unique client ID to help with message deduplication
    const clientId = `client-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`;
    
    // Check if we already have an active subscription for this room
    const existingSubscription = this._activeSubscriptions[roomId];
    if (existingSubscription) {
      const timeSinceCreation = Date.now() - existingSubscription.timestamp;
      
      // If the subscription is recent (less than 10 seconds old), reuse it
      // Reduced from 30s to 10s to ensure fresher subscriptions
      if (timeSinceCreation < 10000) {
        console.log(`Reusing existing subscription for room ${roomId} (created ${timeSinceCreation}ms ago)`);
        return () => {
          console.log(`Skipping cleanup of shared subscription for room ${roomId}`);
          // No-op since this is a shared subscription
        };
      } else {
        // If it's an older subscription, clean it up and create a new one
        console.log(`Cleaning up stale subscription for room ${roomId}`);
        try {
          supabase.removeChannel(existingSubscription.channel);
          delete this._activeSubscriptions[roomId];
        } catch (error) {
          console.error(`Error removing stale channel for room ${roomId}:`, error);
        }
      }
    }
    
    // Create a stable channel name with client ID for better debugging
    const channelName = `room-${roomId}-messages-${clientId}`;
    console.log(`Creating enhanced channel: ${channelName}`);
    
    // Set up the channel with improved configuration for reliability
    const subscription = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true }  // Allow seeing your own broadcasts
          // Note: retryInterval and timeout are not available in the type definition
          // but we can still enhance the real-time behavior with broadcast settings
        }
      })
      .on('system', { event: 'connection_status' }, (status) => {
        console.log(`Realtime connection status for room ${roomId}:`, status);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      }, async (payload: { new: Message }) => {
        console.log('Real-time message received:', payload.new);
        
        // Add sent timestamp if missing
        if (!payload.new.sent_at) {
          payload.new.sent_at = new Date().toISOString();
        }
        
        if (payload.new) {
          try {
            // Get nickname from local storage if available
            const localStorageKey = `messages_${roomId}`;
            
            const messagesJSON = await AsyncStorage.getItem(localStorageKey);
            if (messagesJSON) {
              const messages = JSON.parse(messagesJSON);
              
              // Find matching message by content and time to get nickname
              const matchingMsg = messages.find((m: Message) => {
                return m.user_id === payload.new.user_id && 
                       m.content === payload.new.content;
              });
              
              if (matchingMsg && matchingMsg.nickname) {
                // Add nickname to the message
                payload.new.nickname = matchingMsg.nickname;
              } else {
                // Attempt to get nickname from participants table as fallback
                try {
                  const { data: participant } = await supabase
                    .from('room_participants')
                    .select('nickname')
                    .eq('room_id', roomId)
                    .eq('user_id', payload.new.user_id)
                    .single();
                  
                  if (participant?.nickname) {
                    payload.new.nickname = participant.nickname;
                  } else {
                    payload.new.nickname = 'User';
                  }
                } catch (participantError) {
                  console.error('Error fetching participant nickname:', participantError);
                  payload.new.nickname = 'User';
                }
              }
            } else {
              // Attempt to get nickname from participants table
              try {
                const { data: participant } = await supabase
                  .from('room_participants')
                  .select('nickname')
                  .eq('room_id', roomId)
                  .eq('user_id', payload.new.user_id)
                  .single();
                
                if (participant?.nickname) {
                  payload.new.nickname = participant.nickname;
                } else {
                  payload.new.nickname = 'User';
                }
              } catch (participantError) {
                console.error('Error fetching participant nickname:', participantError);
                payload.new.nickname = 'User';
              }
            }
          } catch (err) {
            console.error('Error enhancing realtime message:', err);
            // Set a default nickname as fallback
            payload.new.nickname = 'User';
          }
          
          // Also update local cache with this message for consistency
          try {
            const messagesJSON = await AsyncStorage.getItem(`messages_${roomId}`);
            const messages = messagesJSON ? JSON.parse(messagesJSON) : [];
            
            // Check if message already exists in cache to avoid duplicates
            const exists = messages.some((m: Message) => m.id === payload.new.id);
            if (!exists) {
              messages.unshift(payload.new);
              await AsyncStorage.setItem(`messages_${roomId}`, JSON.stringify(messages));
            }
          } catch (cacheError) {
            console.error('Error updating message cache:', cacheError);
          }
          
          // Call callback with the enhanced message
          callback(payload.new);
        }
      })
      .subscribe((status) => {
        console.log(`Subscription status for room ${roomId}:`, status);
      });
    
    console.log('Subscription created and activated');
    
    // Store this subscription in our tracking object
    this._activeSubscriptions[roomId] = {
      channel: subscription,
      timestamp: Date.now()
    };

    // Handle potential connection errors
    subscription.on('system', { event: 'reconnect_attempt' }, () => {
      console.log(`Attempting to reconnect to room ${roomId} channel`);
    });

    subscription.on('system', { event: 'disconnect' }, (reason) => {
      console.log(`Disconnected from room ${roomId} channel:`, reason);
    });

    // Return unsubscribe function with proper cleanup
    return () => {
      console.log(`Cleaning up subscription for room ${roomId}`);
      try {
        // Only remove if this is the current active subscription
        if (this._activeSubscriptions[roomId]?.channel === subscription) {
          delete this._activeSubscriptions[roomId];
          supabase.removeChannel(subscription);
          console.log(`Successfully removed channel for room ${roomId}`);
        } else {
          console.log(`Skipping removal of outdated channel for room ${roomId}`);
        }
      } catch (error) {
        console.error(`Error removing channel for room ${roomId}:`, error);
      }
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
