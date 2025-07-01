import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Text, 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Platform, 
  TouchableWithoutFeedback, 
  Keyboard, 
  useWindowDimensions, 
  Animated, 
  FlatList, 
  AppState, 
  Modal, 
  Alert,
  Easing,
  ViewStyle,
  TextStyle,
  ImageStyle,
  GestureResponderEvent, 
  Pressable,
  StatusBar,
  KeyboardAvoidingView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/store/theme-store';
import { useAuthStore } from '@/store/auth-store';
import { colors as themeColors } from '@/constants/colors';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { scaleSize, verticalScale, scaleFont } from '../../utils/responsive';
import { roomService, messageService } from '@/lib/room-service';
import { supabase, Room, RoomParticipant, Message as SupabaseMessage, checkRealtimeConnection } from '@/lib/supabase';

type Style = ViewStyle | TextStyle | ImageStyle | Animated.AnimatedProps<ViewStyle>; // Specified ViewStyle for AnimatedProps

// const AnimatedPressable = Animated.createAnimatedComponent(Pressable) as any; // Commented out as OptionItem now uses Pressable + Animated.View

// Generate a 6-digit room code if not provided
const generateRoomCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

type MessageType = {
  id: string;
  text: string;
  isCurrentUser: boolean;
  timestamp: number;
  nickname?: string;
  isSystemMessage?: boolean;
};

type RoomMember = {
  id: string;
  name: string;
  isAdmin: boolean;
  joined_at?: string;
  last_seen_at?: string;
  is_active?: boolean;
};

// OptionItem and OptionItemProps must be defined above the main component so they are always in scope

type OptionItemProps = {
  icon?: string;
  label: string;
  onPress: () => void;
  color: string;
};

const OptionItem: React.FC<OptionItemProps> = React.memo((props) => {
  const { label, onPress, color } = props;
  const iconName = props.icon || "help-circle-outline";
  const opacity = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(opacity, {
      toValue: 0.7,
      useNativeDriver: false,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(opacity, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: false,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={({ pressed }) => ({})}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.optionItem, { opacity }]}> 
        {(iconName === "user-plus" || iconName === "user-x") ? (
          <Feather name={iconName as any} size={scaleFont(22)} color={color} style={styles.optionIcon} />
        ) : (
          <Ionicons name={iconName as any} size={scaleFont(22)} color={color} style={styles.optionIcon} />
        )}
        <Text style={[styles.optionText, { color }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
});

export default function CreatedRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; name?: string; emoji?: string; joined?: string; nickname?: string }>();
  const { isDarkMode } = useThemeStore();
  const { user, isAuthenticated } = useAuthStore();
  const { width, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  const appTheme = isDarkMode ? themeColors.dark : themeColors.light;
  
  // State
  const [showOptions, setShowOptions] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isJoinedRoom] = useState(params.joined === 'true');
  const [keyboardShown, setKeyboardShown] = useState(false);
  const [roomData, setRoomData] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isKicked, setIsKicked] = useState(false);  // Track if current user is kicked
  
  // User nickname - from params or default
  const [nickname, setNickname] = useState(params.nickname || 'Anonymous');
  
  // For managing real-time subscription
  const messageSubscriptionRef = useRef<() => void | null>(null);
  const participantSubscriptionRef = useRef<() => void | null>(null);
  // Track mounted state to prevent state updates after unmounting
  const isMountedRef = useRef<boolean>(true);
  // Reference to store connection check interval
  const connectionCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track active subscription IDs to prevent duplicates
  const activeSubscriptionIdRef = useRef<string | null>(null);
  // Track processed message IDs to prevent duplicates
  const processedMessageIdsRef = useRef<Set<string>>(new Set());

  const [members, setMembers] = useState<RoomMember[]>([
    // Initial empty state, will be populated from database
    { id: isAuthenticated && user ? user.id : 'you', name: 'You', isAdmin: false },
  ]);
  
  // Room details with defaults
  const { id } = params;
  const [roomCode, setRoomCode] = useState('');
  const [roomEmoji, setRoomEmoji] = useState(params.emoji || '💬');

  // Fetch room data
  useEffect(() => {
    const fetchRoomData = async () => {
      if (!id) {
        setError('Room ID is missing');
        setLoading(false);
        return;
      }
      
      try {
        // Get room data from Supabase
        const room = await roomService.getRoomById(id);
        
        if (!room) {
          setError('Room not found');
          setLoading(false);
          return;
        }
        
        setRoomData(room);
        // Use the 6-digit access_code instead of room.id for display
        setRoomCode(room.access_code || generateRoomCode());
        
        // Try to get the emoji from user_recent_rooms if not provided in params
        if (!params.emoji) {
          try {
            const { data: recentRoomData } = await supabase
              .from('user_recent_rooms')
              .select('emoji')
              .eq('room_id', room.id)
              .eq('user_id', user?.id || '')
              .single();
            
            if (recentRoomData?.emoji) {
              setRoomEmoji(recentRoomData.emoji);
            }
          } catch (emojiError) {
            console.error('Error fetching room emoji:', emojiError);
          }
        }
        
        // Fetch room participants
        const participants = await roomService.getRoomParticipants(room.id);
        
        // Convert participants to members format
        const membersList: RoomMember[] = participants.map(p => {
          const isCurrentUser = isAuthenticated && user ? p.user_id === user.id : 
            p.nickname === nickname;
          
          return {
            id: p.user_id,
            name: isCurrentUser ? 'You' : p.nickname,
            isAdmin: room.created_by === p.user_id,
            is_active: p.is_active,
            joined_at: p.joined_at,
            last_seen_at: p.last_seen_at
          };
        });
        
        setMembers(membersList);
        
        // Fetch initial messages
        const roomMessages = await messageService.getRoomMessages(room.id);
        
        // Convert to our UI format and sort
        if (roomMessages.length > 0) {
          const userId = isAuthenticated && user ? user.id : 'anonymous';
          const formattedMessages: MessageType[] = roomMessages
            .map(m => ({
              id: m.id || `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              text: m.content,
              isCurrentUser: m.user_id === userId || m.nickname === nickname,
              timestamp: new Date(m.created_at || m.sent_at || Date.now()).getTime(),
              nickname: m.nickname
            }))
            .sort((a, b) => a.timestamp - b.timestamp); // Sort by time ascending
          
          setMessages(formattedMessages);
        }
                // Setup real-time subscription
        // Generate a unique subscription ID
        const subscriptionId = `${room.id}_${Date.now()}`;
        activeSubscriptionIdRef.current = subscriptionId;
        
        const unsubscribe = messageService.subscribeToNewMessages(room.id, (newMessage) => {
          // Only process if this is still the active subscription
          if (activeSubscriptionIdRef.current !== subscriptionId) {
            console.log('Ignoring message from outdated subscription');
            return;
          }

          // Check if we've already processed this message ID
          if (newMessage.id && processedMessageIdsRef.current.has(newMessage.id)) {
            console.log('Ignoring duplicate message with ID:', newMessage.id);
            return;
          }

          // Add this message ID to processed set if it has an ID
          if (newMessage.id) {
            processedMessageIdsRef.current.add(newMessage.id);
            
            // Keep the set size manageable by removing old entries if it gets too large
            if (processedMessageIdsRef.current.size > 1000) {
              // Convert to array, keep only the latest 500 entries
              const messageIds = Array.from(processedMessageIdsRef.current);
              processedMessageIdsRef.current = new Set(messageIds.slice(-500));
            }
          }

          // Add new message to state
          const userId = isAuthenticated && user ? user.id : 'anonymous';
          const formattedMessage: MessageType = {
            id: newMessage.id || `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            text: newMessage.content,
            isCurrentUser: newMessage.user_id === userId || newMessage.nickname === nickname,
            timestamp: new Date(newMessage.created_at || newMessage.sent_at || Date.now()).getTime(),
            nickname: newMessage.nickname
          };
          
          // Check if this message already exists in the current UI state
          const isDuplicate = messages.some(m => 
            // Same ID (exact duplicate)
            (m.id === formattedMessage.id) ||
            // Same content from same user within time window (local preview vs server message)
            (m.text === formattedMessage.text && 
             formattedMessage.isCurrentUser === true && // Only apply stricter checks for current user's messages
             m.isCurrentUser === true &&
             Math.abs(m.timestamp - formattedMessage.timestamp) < 5000) // Reduced window for faster display
          );
          
          if (!isDuplicate && isMountedRef.current) {
            console.log('Adding new message:', formattedMessage);
            // Use a function update to ensure we're working with the latest state
            setMessages(prev => {
              // Add the new message to the array
              const updatedMessages = [...prev, formattedMessage];
              
              // Schedule a scroll to bottom on next tick
              setTimeout(() => {
                if (scrollViewRef.current && isMountedRef.current) {
                  scrollViewRef.current.scrollToEnd({ animated: true });
                }
              }, 50);
              
              return updatedMessages;
            });
          }
        });
        
        // Store unsubscribe function
        messageSubscriptionRef.current = unsubscribe;
        
        // Set up participant subscription for real-time updates (joining, leaving, kicks)
        const participantUnsubscribe = roomService.subscribeToRoomParticipants(
          room.id, 
          user?.id || 'anonymous',
          (event, participantId, nickname) => {
            console.log(`Participant event: ${event}`, { participantId, nickname });
            
            if (event === 'joined') {
              // Someone joined
              if (isMountedRef.current) {
                const newMember: RoomMember = {
                  id: participantId,
                  name: nickname || 'Unknown User',
                  isAdmin: false,
                  is_active: true,
                  joined_at: new Date().toISOString(),
                  last_seen_at: new Date().toISOString()
                };
                
                setMembers(prev => [...prev.filter(m => m.id !== participantId), newMember]);
                
                // Show notification in console
                console.log(`${nickname || 'Someone'} joined the room`);
              }
            } 
            else if (event === 'left') {
              // Someone left
              if (isMountedRef.current) {
                setMembers(prev => prev.filter(m => m.id !== participantId));
                
                // Show notification in console
                console.log(`${nickname || 'Someone'} left the room`);
              }
            }
            else if (event === 'kicked') {
              console.log(`[KICK_DEBUG] Received kick event for participantId=${participantId}, current user=${user?.id || 'anonymous'}`);
              
              // Current user was kicked
              if (participantId === (user?.id || 'anonymous') && isMountedRef.current) {
                // Check if the user was actually in the room before showing kicked message
                // This prevents false positives when creating new rooms
                const currentUserId = user?.id || 'anonymous';
                if (!isAuthenticated || members.some(m => m.id === currentUserId)) {
                  console.log('[KICK_DEBUG] YOU WERE KICKED FROM THE ROOM');
                  
                  // Only show the alert if we haven't already shown it for this room
                  if (!isKicked) {
                    setIsKicked(true);
                    
                    // Show alert notification
                    Alert.alert(
                      'Removed from Room',
                      'You have been removed from this room by the admin.',
                      [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
                    );
                  }
                } else {
                  console.log('[KICK_DEBUG] False positive kick detection prevented');
                }
              }
              else if (isMountedRef.current) {
                // Another member was kicked
                console.log(`[KICK_DEBUG] Another member kicked: ${nickname || participantId}`);
                
                // Use our direct handler to ensure UI is updated
                handleMemberKicked(participantId, nickname);
              }
            }
          }
        );
        
        // Store unsubscribe function
        participantSubscriptionRef.current = participantUnsubscribe;
        
        // Set up periodic connection health check
        console.log('Setting up realtime connection monitoring');
        connectionCheckIntervalRef.current = setInterval(() => {
          if (isMountedRef.current) {
            // Check realtime connection health
            const status = checkRealtimeConnection();
            console.log('Realtime connection status:', status);
            
            // If connection is unhealthy, restart the subscription
            if (!status.healthy) {
              console.log('Unhealthy connection detected, restarting subscription');
              
              // Clean up old subscription
              if (messageSubscriptionRef.current) {
                messageSubscriptionRef.current();
              }
              
              if (participantSubscriptionRef.current) {
                participantSubscriptionRef.current();
              }
              
              // Create new subscription
              const newUnsubscribe = messageService.subscribeToNewMessages(room.id, (newMessage) => {
                // Add new message to state (same handler as before)
                const userId = isAuthenticated && user ? user.id : 'anonymous';
                const formattedMessage: MessageType = {
                  id: newMessage.id || `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                  text: newMessage.content,
                  isCurrentUser: newMessage.user_id === userId || newMessage.nickname === nickname,
                  timestamp: new Date(newMessage.created_at || newMessage.sent_at || Date.now()).getTime(),
                  nickname: newMessage.nickname
                };
                
                // Check if this message already exists to avoid duplicates
                const isDuplicate = messages.some(m => 
                  // Same ID (exact duplicate)
                  (m.id === formattedMessage.id) ||
                  // Same content from same user within time window (local preview vs server message)
                  (m.text === formattedMessage.text && 
                   formattedMessage.isCurrentUser === true && // Only apply stricter checks for current user's messages
                   m.isCurrentUser === true &&
                   Math.abs(m.timestamp - formattedMessage.timestamp) < 10000) // Wider 10-second window
                );
                
                if (!isDuplicate && isMountedRef.current) {
                  console.log('Adding new message after reconnect:', formattedMessage);
                  setMessages(prev => [...prev, formattedMessage]);
                }
              });
              
              // Create new participant subscription
              const newParticipantUnsubscribe = roomService.subscribeToRoomParticipants(
                room.id, 
                user?.id || 'anonymous',
                (event, participantId, nickname) => {
                  // Same handler as above
                  if (event === 'kicked' && participantId === (user?.id || 'anonymous') && isMountedRef.current) {
                    setIsKicked(true);
                    Alert.alert(
                      'Removed from Room',
                      'You have been removed from this room by the admin.',
                      [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
                    );
                  }
                }
              );
              
              // Generate a new subscription ID
              const newSubscriptionId = `${room.id}_${Date.now()}`;
              activeSubscriptionIdRef.current = newSubscriptionId;
              
              // Update subscription reference
              messageSubscriptionRef.current = newUnsubscribe;
              participantSubscriptionRef.current = newParticipantUnsubscribe;
            }
          }
        }, 30000); // Check every 30 seconds
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching room data:', err);
        setError('Failed to load room data');
        setLoading(false);
      }
    };
    
    fetchRoomData();
    
    // Clean up subscription on unmount
    return () => {
      console.log('Cleaning up room effect');
      isMountedRef.current = false;
      
      // Clear active subscription ID to prevent stale callbacks
      activeSubscriptionIdRef.current = null;
      
      // Clear processed message IDs
      processedMessageIdsRef.current.clear();
      
      if (messageSubscriptionRef.current) {
        messageSubscriptionRef.current();
        messageSubscriptionRef.current = null;
      }
      
      if (participantSubscriptionRef.current) {
        participantSubscriptionRef.current();
        participantSubscriptionRef.current = null;
      }
      
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
        connectionCheckIntervalRef.current = null;
      }
    };
  }, [id, isAuthenticated, user, nickname]);
  
  // Icon sizes based on screen width
  const iconSizes = {
    backArrow: width * 0.065,
    header: width * 0.06,
  };
  
  // Handle sending a new message with optimistic UI update for instant feedback
  const handleSend = async () => {
    if (!message.trim() || !roomData) return;
    
    const messageText = message.trim();
    setMessage(''); // Clear input right away for better UX
    
    try {
      // Check if user is kicked before allowing message send
      if (isKicked) {
        Alert.alert(
          'Cannot Send Message',
          'You have been removed from this room and cannot send messages.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
        );
        return;
      }
      
      // Use user ID if authenticated, or generate a random one for anonymous
      const userId = isAuthenticated && user ? user.id : `anon_${Math.random().toString(36).substring(2, 9)}`;
      
      // Generate a temporary ID for the local message
      const localMessageId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Add an optimistic version of the message to the UI immediately
      // This gives instant feedback to the user before server confirmation
      const optimisticMessage: MessageType = {
        id: localMessageId,
        text: messageText,
        isCurrentUser: true,
        timestamp: Date.now(),
        nickname: 'You'
      };
      
      // Immediately add to UI with optimistic update
      setMessages(prev => {
        const updatedMessages = [...prev, optimisticMessage];
        
        // Scroll to the new message
        setTimeout(() => {
          if (scrollViewRef.current && isMountedRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, 50);
        
        return updatedMessages;
      });
      
      // In parallel, send the message to the server
      messageService.sendMessage(
        roomData.id,
        userId,
        nickname,
        messageText
      ).then(serverMessage => {
        if (serverMessage && serverMessage.id) {
          // The message will also come through the subscription
          // Record the local message ID to help with deduplication
          processedMessageIdsRef.current.add(localMessageId);
          
          // Also record the server message ID as processed
          // This prevents duplicate messages when the subscription receives it
          processedMessageIdsRef.current.add(serverMessage.id);
        }
      }).catch(error => {
        console.error('Error sending message to server:', error);
        
        // If message fails, show an error indicator on the message
        setMessages(prev => prev.map(msg => 
          msg.id === localMessageId 
            ? { ...msg, failed: true } 
            : msg
        ));
        
        // Allow the user to retry
        Alert.alert('Message Not Sent', 'Tap on the message to retry');
      });
    } catch (error) {
      console.error('Error in message send flow:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  // Direct function to handle member kick UI updates
  const handleMemberKicked = (memberId: string, nickname?: string) => {
    console.log(`[KICK_DEBUG] Direct kick handler called for ${nickname || memberId}`);
    
    // Force UI update to remove member
    setMembers(prevMembers => {
      const filteredMembers = prevMembers.filter(m => m.id !== memberId);
      console.log(`[KICK_DEBUG] Members list update - before: ${prevMembers.length}, after: ${filteredMembers.length}`);
      return filteredMembers;
    });
    
    // Add system message for feedback
    const kickSystemMessage: MessageType = {
      id: `system_kick_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      text: `${nickname || 'A member'} was removed from the room`,
      isCurrentUser: false,
      timestamp: Date.now(),
      nickname: 'System',
      isSystemMessage: true
    };
    
    setMessages(prev => [...prev, kickSystemMessage]);
    console.log('[KICK_DEBUG] Added kick system message to chat');
  };
  
  // Handle room options with Supabase integration
  const handleRoomAction = async (action: 'delete' | 'add' | 'kick' | 'leave') => {
    if (!roomData) return;
    setShowOptions(false);
    
    switch (action) {
      case 'leave':
        try {
          // Get current user ID
          const userId = isAuthenticated && user ? user.id : '';
          
          if (!userId) {
            Alert.alert('Error', 'User ID missing');
            return;
          }

          Alert.alert(
            'Leave Room',
            'Are you sure you want to leave this room?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Leave', 
                style: 'destructive',
                onPress: async () => {
                  try {
                    // Update room_participants table to mark user as inactive
                    const success = await roomService.leaveRoom(roomData.id, userId);
                    
                    if (success) {
                      router.replace('/(tabs)');
                    } else {
                      Alert.alert('Error', 'Failed to leave room');
                    }
                  } catch (error) {
                    console.error('Error leaving room:', error);
                    Alert.alert('Error', 'Failed to leave room');
                  }
                }
              },
            ]
          );
        } catch (error) {
          console.error('Error leaving room:', error);
          Alert.alert('Error', 'Failed to leave room');
        }
        break;
        
      case 'delete':
        // Only room creator can delete
        if (!isAuthenticated || !user || roomData.created_by !== user.id) {
          Alert.alert('Not Authorized', 'Only the room creator can delete this room');
          return;
        }
        
        Alert.alert(
          'Delete Room',
          'Are you sure you want to delete this room? This action cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Delete', 
              style: 'destructive',
              onPress: async () => {
                try {
                  // Delete room in Supabase
                  const deleted = await roomService.deleteRoom(roomData.id, user.id);
                  
                  if (deleted) {
                    router.replace('/(tabs)');
                  } else {
                    Alert.alert('Error', 'Failed to delete room');
                  }
                } catch (error) {
                  console.error('Error deleting room:', error);
                  Alert.alert('Error', 'Failed to delete room');
                }
              }
            },
          ]
        );
        break;
        
      case 'add':
        // Share room code
        Alert.alert('Add Member', `Share this room code with friends to join: ${roomCode}`);
        break;
        
      case 'kick':
        console.log('[KICK_DEBUG] Kick action selected');
        
        // Only room creator can kick members
        if (!isAuthenticated || !user || roomData.created_by !== user.id) {
          Alert.alert('Not Authorized', 'Only the room creator can remove members');
          return;
        }
        
        // Filter out admin (creator) and current user from members that can be kicked
        const nonAdminMembers = members.filter(m => !m.isAdmin && m.id !== user.id);
        
        if (nonAdminMembers.length > 0) {
          Alert.alert(
            'Kick Member',
            'Select a member to remove',
            [
              ...nonAdminMembers.map(member => ({
                text: member.name,
                onPress: async () => {
                  try {
                    // Show loading indicator
                    setLoading(true);
                    
                    console.log(`[KICK_DEBUG] Attempting to kick member: ${member.name} (${member.id})`);
                    
                    // Call the kickMember service method
                    const success = await roomService.kickMember(id!, user?.id || '', member.id, member.name);
                    
                    if (success) {
                      console.log(`[KICK_DEBUG] Kick successful for ${member.name}`);
                      
                      // Force immediate UI update regardless of real-time subscription
                      handleMemberKicked(member.id, member.name);
                      
                      // Additional notification
                      Alert.alert('Success', `${member.name} was removed from the room`);
                    } else {
                      console.log(`[KICK_DEBUG] Kick failed for ${member.name}`);
                      Alert.alert('Error', 'Failed to remove member. You may not have permission.');
                    }
                  } catch (error) {
                    console.error('[KICK_DEBUG] Error removing member:', error);
                    Alert.alert('Error', 'Failed to remove member');
                  } finally {
                    setLoading(false);
                  }
                }
              })),
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        } else {
          Alert.alert('No Members', 'There are no members to remove');
        }
        break;
    }
  };

  // Format time for messages
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Animation values
  const messageAnimations = useRef<{[key: string]: Animated.Value}>({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [inputPosition, setInputPosition] = useState(0);
  const [initialKeyboardShown, setInitialKeyboardShown] = useState(false); // Track first keyboard appearance
  const [isFirstMount, setIsFirstMount] = useState(true);
  
  // Function to handle scroll positioning
  const scrollToBottom = useCallback((animated = false, delay = 0) => {
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated });
      }, delay);
    }
  }, [messages.length]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      // Use consistent approach for all room types
      const delay = Platform.OS === 'android' ? 100 : 50;
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, delay);
    }
  }, [messages]);
  
  // Initialize the component and handle first keyboard appearance
  useEffect(() => {
    // Set a flag when component is first mounted
    if (isFirstMount) {
      setIsFirstMount(false);
      
      if (isJoinedRoom) {
        // For Android joined rooms, use a much longer delay sequence and different approach
        if (Platform.OS === 'android') {
          // Do not focus immediately - allow UI to settle first
          setTimeout(() => {  
            // First scroll to position messages
            if (scrollViewRef.current && messages.length > 0) {
              scrollViewRef.current.scrollToEnd({ animated: false });
            }
            
            // Focus after a significant delay
            setTimeout(() => {
              if (textInputRef.current) {
                textInputRef.current.focus();
              }
              
              // After keyboard appears, do multiple scroll attempts with increasing delays
              setTimeout(() => {
                if (scrollViewRef.current && messages.length > 0) {
                  scrollViewRef.current.scrollToEnd({ animated: false });
                }
              }, 300);
              
              setTimeout(() => {
                if (scrollViewRef.current && messages.length > 0) {
                  scrollViewRef.current.scrollToEnd({ animated: false });
                }
              }, 800);
              
              setTimeout(() => {
                if (scrollViewRef.current && messages.length > 0) {
                  scrollViewRef.current.scrollToEnd({ animated: false });
                }
              }, 1500);
            }, 800);
          }, 1000);
        } else {
          // For iOS joined rooms
          setTimeout(() => {
            textInputRef.current?.focus();
          }, 100);
        }
      }
    }
  }, [isFirstMount, isJoinedRoom]);
  
  // Focus the input when switching back to the app
  useEffect(() => {
    if (isJoinedRoom && Platform.OS === 'android') {
      // Listen for app state changes
      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
          // App has come to the foreground
          setTimeout(() => {
            setInputPosition(500); // Very high safe position
            textInputRef.current?.focus();
          }, 500);
        }
      });
      
      return () => subscription.remove();
    }
  }, [isJoinedRoom]);
  
  // Using proper KeyboardAvoidingView for all platforms now

  // Keyboard handling with special treatment for Android joined rooms
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const showSubscription = Keyboard.addListener(
      showEvent,
      (e) => {
        const kbHeight = e.endCoordinates.height;
        setKeyboardShown(true);
        setKeyboardHeight(kbHeight);
        
        // Special handling for Android joined rooms
        if (Platform.OS === 'android' && isJoinedRoom) {
          // Track if this is the first keyboard appearance
          if (!initialKeyboardShown) {
            setInitialKeyboardShown(true);
            // On first keyboard appearance, use a much higher position
            setInputPosition(screenHeight * 0.5); // Position at 50% of screen height
          } else {
            // For subsequent appearances, use normal position
            setInputPosition(kbHeight + 100); // Very large safety margin
          }
          
          // Multiple aggressive scroll attempts with longer delays and forced scroll
          requestAnimationFrame(() => {
            if (scrollViewRef.current) {
              scrollViewRef.current.scrollToEnd({ animated: false });
            }
            setTimeout(() => scrollToBottom(false, 0), 100);
            setTimeout(() => scrollToBottom(false, 0), 300);
            setTimeout(() => scrollToBottom(false, 0), 500);
            setTimeout(() => scrollToBottom(false, 0), 800);
            setTimeout(() => scrollToBottom(false, 0), 1200); // Very long delay
          });
        } 
        // Standard approach for iOS or created rooms
        else if (messages.length > 0) {
          // Use a shared approach with multiple scroll attempts for reliability
          setTimeout(() => {
            scrollToBottom(true, 0);
            // Add some extra scroll attempts for Android
            if (Platform.OS === 'android') {
              setTimeout(() => scrollToBottom(true, 0), 100);
              setTimeout(() => scrollToBottom(true, 0), 300);
            }
          }, Platform.OS === 'ios' ? 100 : 200);
        }
      }
    );

    const hideSubscription = Keyboard.addListener(
      hideEvent,
      () => {
        setKeyboardShown(false);
        
        // For Android joined rooms: reset position
        if (Platform.OS === 'android' && isJoinedRoom) {
          setInputPosition(0);
        }
        
        // For all: update keyboard height after a delay
        setTimeout(() => {
          setKeyboardHeight(0);
          if (messages.length > 0) {
            scrollToBottom(true, 100);
          }
        }, Platform.OS === 'ios' ? 50 : 200);
      }
    );
    
    // Keyboard dismiss when tapping outside input area
    const keyboardDismissEvent = () => {
      if (Platform.OS === 'ios') {
        // iOS handles keyboard dismissal smoothly
        Keyboard.dismiss();
      } else {
        // Android might need some help with layout updates after dismiss
        Keyboard.dismiss();
        setTimeout(() => {
          if (messages.length > 0) {
            scrollViewRef.current?.scrollToEnd({ animated: false });
          }
        }, 150);
      }
    };
    
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [messages.length, isJoinedRoom]);

  // Create message animation when messages change
  useEffect(() => {
    messages.forEach(message => {
      if (!messageAnimations.current[message.id]) {
        messageAnimations.current[message.id] = new Animated.Value(0);
        Animated.spring(messageAnimations.current[message.id], {
          toValue: 1,
          useNativeDriver: true,
          friction: 7,
          tension: 40
        }).start();
      }
    });
  }, [messages]);

  // Add animation to new messages
  const getMessageAnimation = (messageId: string) => {
    if (!messageAnimations.current[messageId]) {
      messageAnimations.current[messageId] = new Animated.Value(0.5);
      Animated.spring(messageAnimations.current[messageId], {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8
      }).start();
    }
    return messageAnimations.current[messageId];
  };

  // Render loading screen while fetching data
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: appTheme.background }} edges={['left', 'right', 'bottom']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={appTheme.background} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: appTheme.text, fontSize: scaleFont(18), marginBottom: scaleSize(10) }}>Loading room...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Render error screen if room couldn't be loaded
  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: appTheme.background }} edges={['left', 'right', 'bottom']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={appTheme.background} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: scaleSize(20) }}>
          <Text style={{ color: 'red', fontSize: scaleFont(18), marginBottom: scaleSize(10) }}>{error}</Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              padding: scaleSize(12),
              backgroundColor: pressed ? appTheme.border : appTheme.accent,
              borderRadius: scaleSize(8),
              marginTop: scaleSize(20),
            })}
          >
            <Text style={{ color: 'white', fontSize: scaleFont(16) }}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  
  // Get room name from roomData
  const roomName = roomData?.name || 'Chat Room';
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.background }]} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={appTheme.background} />
      {/* Display room emoji */}
      <View style={[styles.emojiFloatContainer, { backgroundColor: isDarkMode ? 'rgba(60,16,83,1)' : '#ede7ff' }]}>
        <Text style={styles.emojiFloatText}>{roomEmoji}</Text>
      </View>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: appTheme.card,
          borderBottomWidth: 1,
          borderBottomColor: appTheme.border,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: scaleSize(16),
            paddingVertical: verticalScale(10),
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              padding: scaleSize(8),
              borderRadius: scaleSize(20),
              backgroundColor: pressed ? appTheme.border : 'transparent',
            })}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={scaleFont(24)} color={appTheme.accent} />
          </Pressable>
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              marginLeft: scaleSize(10),
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: scaleFont(22), marginRight: scaleSize(8) }}>{roomEmoji}</Text>
              <Text
                style={{
                  fontSize: scaleFont(18),
                  fontWeight: '600',
                  color: appTheme.text,
                  maxWidth: width * 0.5,
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {roomName}
              </Text>
            </View>
            <Text
              style={{
                fontSize: scaleFont(14),
                color: appTheme.secondaryText,
                marginTop: scaleSize(2),
              }}
            >
              {members.length} member{members.length !== 1 ? 's' : ''} • Room Code: {roomCode}
            </Text>
          </View>
          <Pressable
            onPress={() => setShowOptions(true)}
            style={({ pressed }) => ({
              padding: scaleSize(8),
              borderRadius: scaleSize(20),
              backgroundColor: pressed ? appTheme.border : 'transparent',
            })}
            accessibilityRole="button"
            accessibilityLabel="Show room options"
          >
            <Feather name="more-vertical" size={scaleFont(24)} color={appTheme.text} />
          </Pressable>
        </View>
      </View>
      {/* Main Chat Area */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={'padding'} // Use padding behavior for all platforms
        keyboardVerticalOffset={Platform.OS === 'ios' ? 95 : (isJoinedRoom ? 180 : 10)} // Extremely high offset for Android joined rooms
        contentContainerStyle={{ flex: 1 }}
        enabled={true} // Enable for all platforms
      >
        {/* Main content wrapper */}
        <View style={{ flex: 1 }}>
          {/* Message list */}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={{ flex: 1 }}>
              <ScrollView
                ref={scrollViewRef}
                style={{ flex: 1 }}
                keyboardShouldPersistTaps="always"
                contentContainerStyle={{
                  flexGrow: 1,
                  paddingHorizontal: scaleSize(16),
                  paddingTop: verticalScale(12),
                  // For Android joined rooms, add massive padding at bottom to ensure content is visible
                  paddingBottom: Platform.OS === 'android' && isJoinedRoom 
                    ? verticalScale(180) // Extremely large bottom padding for Android joined rooms
                    : (keyboardHeight > 0 
                      ? (Platform.OS === 'ios' ? verticalScale(8) : verticalScale(10)) 
                      : verticalScale(14)),
                  ...(messages.length === 0 && {
                    justifyContent: 'center',
                    alignItems: 'center'
                  })
                }}
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => {
                  if (messages.length > 0) {
                    scrollViewRef.current?.scrollToEnd({ animated: false });
                  }
                }}
                onLayout={() => {
                  if (messages.length > 0) {
                    scrollViewRef.current?.scrollToEnd({ animated: false });
                  }
                }}
              >
                {messages.length === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="message-text-outline" size={scaleFont(48)} color={appTheme.border} style={styles.emptyIcon} />
                    <Text style={[styles.emptyText, { color: appTheme.secondaryText }]}>No messages yet. Start the conversation!</Text>
                  </View>
                ) : (
                  messages.map((msg) => (
                    <Animated.View
                      key={msg.id}
                      style={{
                        opacity: getMessageAnimation(msg.id),
                        transform: [{ scale: getMessageAnimation(msg.id) }],
                      }}
                    >
                      <View
                        style={[
                          styles.messageContainer,
                          msg.isCurrentUser ? [styles.myMessage, { backgroundColor: appTheme.accent }] : [styles.otherMessage, { backgroundColor: appTheme.card }],
                        ]}
                      >
                        {/* Display nickname for messages from others */}
                        {!msg.isCurrentUser && msg.nickname && (
                          <Text style={[
                            styles.messageNickname, 
                            { color: appTheme.secondaryText }
                          ]}>
                            {msg.nickname}
                          </Text>
                        )}
                        <Text style={[styles.messageText, { color: msg.isCurrentUser ? '#fff' : appTheme.text }]}>{msg.text}</Text>
                        <Text style={[styles.messageTime, { color: msg.isCurrentUser ? '#e0e0e0' : appTheme.secondaryText }]}>{formatTime(msg.timestamp)}</Text>
                      </View>
                    </Animated.View>
                  ))
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
          
          {/* Input Area */}
          <View style={[
            styles.inputContainer, 
            { 
              backgroundColor: appTheme.background, 
              borderTopColor: appTheme.border,
              paddingBottom: Platform.OS === 'ios' ? verticalScale(6) : verticalScale(2),
              paddingTop: verticalScale(6),
              // Special handling for Android joined rooms with keyboard-immune bottom positioning
              ...(Platform.OS === 'android' && isJoinedRoom ? {
                position: 'absolute', // Position absolutely
                left: 0,
                right: 0,
                bottom: screenHeight * 0.7, // Position in bottom 30% of screen, WELL above any keyboard
                maxHeight: 70, // Constrain height to ensure it's visible
                paddingBottom: verticalScale(10), // Extra padding
                paddingTop: verticalScale(10), // Extra padding
                borderTopWidth: 1,
                borderBottomWidth: 1,
                backgroundColor: appTheme.background, // Ensure background is solid
                elevation: 10, // Strong Android shadow
                zIndex: 9999 // Maximum z-index to ensure visibility
              } : {})
            }
          ]}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <View style={{flex: 1, flexDirection: 'row', alignItems: 'flex-end', marginBottom: Platform.OS === 'android' ? 2 : 0}}>
                <View style={[styles.inputWrapper, { backgroundColor: appTheme.card, borderColor: appTheme.border }]}> 
                  <TextInput
                    ref={textInputRef}
                    style={[styles.textInput, { 
                      color: appTheme.text,
                      height: Platform.OS === 'ios' ? 36 : 40
                    }]}
                    placeholder="Type a message..."
                    placeholderTextColor={appTheme.secondaryText}
                    numberOfLines={1}
                    value={message}
                    onChangeText={setMessage}
                    returnKeyType="send"
                    onSubmitEditing={handleSend}
                    blurOnSubmit={false}
                  />
                  {message.length > 0 && (
                    <Pressable onPress={() => setMessage('')} style={styles.clearButton} accessibilityRole="button" accessibilityLabel="Clear message">
                      <Feather name="x-circle" size={scaleFont(20)} color={appTheme.secondaryText} />
                    </Pressable>
                  )}
                </View>
                <Pressable
                  onPress={handleSend}
                  style={({ pressed }) => [styles.sendButton, { backgroundColor: pressed ? appTheme.accent + 'cc' : appTheme.accent }]}
                  accessibilityRole="button"
                  accessibilityLabel="Send message"
                >
                  <Ionicons name="send" size={scaleFont(24)} color="#fff" style={styles.sendIcon} />
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </View>
      </KeyboardAvoidingView>
      {/* Options Modal */}
      <Modal
        visible={showOptions}
        animationType="slide"
        transparent
        onRequestClose={() => setShowOptions(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowOptions(false)}>
          <View style={{ flex: 1, backgroundColor: '#00000055' }} />
        </TouchableWithoutFeedback>
        <View style={{ backgroundColor: appTheme.card, borderTopLeftRadius: scaleSize(24), borderTopRightRadius: scaleSize(24), paddingBottom: insets.bottom || scaleSize(24) }}>
          {/* Check if current user is admin by checking if room was created by them */}
          {roomData && ((isAuthenticated && user && roomData.created_by === user.id) || (!isAuthenticated && roomData.created_by.includes('anon'))) ? (
            <>
              <OptionItem
                icon="user-plus"
                label="Add Member"
                onPress={() => { setShowOptions(false); handleRoomAction('add'); }}
                color={appTheme.accent}
              />
              <OptionItem
                icon="user-x"
                label="Kick Member"
                onPress={() => { setShowOptions(false); handleRoomAction('kick'); }}
                color={appTheme.warning}
              />
              <OptionItem
                icon="trash"
                label="Delete Group"
                onPress={() => { setShowOptions(false); handleRoomAction('delete'); }}
                color={appTheme.error}
              />
              <OptionItem
                icon="log-out"
                label="Leave Group"
                onPress={() => { setShowOptions(false); handleRoomAction('leave'); }}
                color={appTheme.error}
              />
            </>
          ) : (
            <OptionItem
              icon="log-out"
              label="Leave Room"
              onPress={() => { setShowOptions(false); handleRoomAction('leave'); }}
              color={appTheme.error}
            />
          )}
        
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Define styles with proper TypeScript types
const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
  },
  emojiFloatContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 5,
  },
  emojiFloatText: {
    fontSize: 32,
    textAlign: 'center',
    opacity: 0.85,
  },
  content: {
    flex: 1,
  },

  // Empty state
  emptyState: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  emptyIcon: {
    opacity: 0.5, 
    marginBottom: verticalScale(10)
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: '80%',
    fontSize: scaleFont(16),
    lineHeight: scaleFont(22),
  },
  // Messages
  messageBubbleWrapper: {
    maxWidth: '80%',
    marginBottom: verticalScale(12),
  },
  messageBubble: {
    paddingHorizontal: scaleSize(16),
    paddingVertical: verticalScale(8),
    borderRadius: scaleSize(18),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: scaleFont(16),
    lineHeight: scaleFont(20),
  },
  messageTime: {
    fontSize: 12,
    alignSelf: "flex-end",
    marginTop: 4,
  },
  messageNickname: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  // Input area
  inputContainer: {
    padding: scaleSize(6),
    paddingBottom: Platform.OS === 'ios' ? verticalScale(6) : verticalScale(2),
    borderTopWidth: 1,
    position: 'relative',
    zIndex: 10,
    backgroundColor: 'transparent',
    paddingTop: scaleSize(6),
    marginBottom: 0,
    minHeight: Platform.OS === 'ios' ? verticalScale(46) : verticalScale(42),
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: scaleSize(22),
    paddingHorizontal: scaleSize(14),
    paddingVertical: verticalScale(6),
    marginRight: scaleSize(8),
    borderWidth: 1,
    minHeight: Platform.OS === 'android' ? verticalScale(40) : verticalScale(40),
    maxHeight: verticalScale(100),
  },
  textInput: {
    flex: 1,
    fontSize: scaleFont(16),
    minHeight: verticalScale(28),
    padding: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
    maxHeight: verticalScale(36),
    height: verticalScale(36),
    overflow: 'hidden',
  },
  clearButton: {
    position: 'absolute',
    right: scaleSize(8),
    padding: scaleSize(4),
  },
  sendButton: {
    width: Platform.OS === 'android' ? scaleSize(40) : scaleSize(44),
    height: Platform.OS === 'android' ? scaleSize(40) : scaleSize(44),
    borderRadius: Platform.OS === 'android' ? scaleSize(20) : scaleSize(22),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  sendIcon: {
    marginLeft: scaleSize(2),
  },
  
  // Options
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(16),
    paddingHorizontal: scaleSize(24),
  },
  optionIcon: {
    width: scaleSize(28),
  },
  optionText: {
    fontSize: scaleFont(16),
    marginLeft: scaleSize(12),
  },

  // Added for chat message bubbles
  messageContainer: {
    maxWidth: '80%',
    borderRadius: scaleSize(16),
    paddingVertical: verticalScale(8),
    paddingHorizontal: scaleSize(14),
    marginVertical: verticalScale(4),
    marginHorizontal: scaleSize(8),
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4f8cff', // fallback, will be overridden inline
    borderBottomRightRadius: scaleSize(4),
    borderBottomLeftRadius: scaleSize(16),
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#e5e5ea', // fallback, will be overridden inline
    borderBottomLeftRadius: scaleSize(4),
    borderBottomRightRadius: scaleSize(16),
  },
});