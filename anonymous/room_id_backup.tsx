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
import { colors as themeColors } from '@/constants/colors';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { scaleSize, verticalScale, scaleFont } from '../../utils/responsive';

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
};

type RoomMember = {
  id: string;
  name: string;
  isAdmin: boolean;
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
  const params = useLocalSearchParams<{ id?: string; name?: string; emoji?: string; code?: string; joined?: string }>();
  const { isDarkMode } = useThemeStore();
  const { width, height } = useWindowDimensions();
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

  
  const [members, setMembers] = useState<RoomMember[]>([
    // If 'joined' param is present, user is not admin
    { id: '1', name: 'You', isAdmin: !isJoinedRoom },
    { id: '2', name: 'User 2', isAdmin: isJoinedRoom },
    { id: '3', name: 'User 3', isAdmin: false },
  ]);
  
  // Room details with defaults
  const { id = Date.now().toString(), name: roomName = 'Room', emoji = '💬', code } = params;
  const [roomCode] = useState(code || generateRoomCode());
  
  // Icon sizes based on screen width
  const iconSizes = {
    backArrow: width * 0.065,
    header: width * 0.06,
  };
  
  // Handle sending a new message
  const handleSend = () => {
    if (!message.trim()) return;
    
    const newMessage: MessageType = {
      id: Date.now().toString(),
      text: message,
      isCurrentUser: true,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    setMessage('');
  };

  // Handle room options
  const handleRoomAction = (action: 'delete' | 'add' | 'kick' | 'leave') => {
    setShowOptions(false);
    
    switch (action) {
      case 'leave':
        // In a real app, you would implement leave group logic here
        Alert.alert('Leave Group', 'You have left the group.');
        router.back();
        break;
      case 'delete':
        Alert.alert(
          'Delete Group',
          'Are you sure you want to delete this group? This action cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Delete', 
              style: 'destructive',
              onPress: () => {
                // Handle delete group
                router.back();
              }
            },
          ]
        );
        break;
        
      case 'add':
        // In a real app, you would implement member addition logic here
        Alert.alert('Add Member', 'Share the room code to add members: ' + roomCode);
        break;
        
      case 'kick':
        // In a real app, you would show a member list to kick
        const nonAdminMembers = members.filter(m => !m.isAdmin);
        if (nonAdminMembers.length > 0) {
          Alert.alert(
            'Kick Member',
            'Select a member to kick',
            [
              ...nonAdminMembers.map(member => ({
                text: member.name,
                onPress: () => {
                  setMembers(prev => prev.filter(m => m.id !== member.id));
                }
              })),
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        } else {
          Alert.alert('No members to kick');
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
  const [inputPosition, setInputPosition] = useState(isJoinedRoom && Platform.OS === 'android' ? 500 : 0);
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
      
      if (isJoinedRoom && Platform.OS === 'android') {
        // For Android joined rooms, position input immediately and then focus
        // This prevents the keyboard from covering the input on first appearance
        setTimeout(() => {
          // Pre-emptively set the position before keyboard appears - very high position
          setInputPosition(500);  // Much higher safe initial position well above keyboard
          
          // Short delay before focusing to ensure position is applied
          setTimeout(() => {
            textInputRef.current?.focus();
          }, 300); // Longer delay for Android
        }, 500); // Longer initial delay
      } else if (isJoinedRoom) {
        // For iOS joined rooms
        setTimeout(() => {
          textInputRef.current?.focus();
        }, 100);
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
  
  // Extra effect for Android joined rooms to monitor keyboard status and adjust positioning
  useEffect(() => {
    if (isJoinedRoom && Platform.OS === 'android') {
      // Check keyboard visibility every 100ms for the first 3 seconds after mounting
      const startTime = Date.now();
      const interval = setInterval(() => {
        const isKeyboardVisible = Keyboard.isVisible(); // This returns a boolean directly
        const currentTime = Date.now();
        if (isKeyboardVisible) {
          // Force position update if keyboard is visible
          setInputPosition(prevPos => Math.max(prevPos, 500));
        }
        
        // Stop checking after 3 seconds
        if (currentTime - startTime > 3000) {
          clearInterval(interval);
        }
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [isJoinedRoom]);

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
        
        // For Android joined rooms: position input above keyboard
        if (Platform.OS === 'android' && isJoinedRoom) {
          // Position input field above keyboard with extra margin
          setInputPosition(kbHeight + 50); // Much larger margin above keyboard for safety
          
          // Perform multiple scroll attempts for reliability
          requestAnimationFrame(() => {
            scrollToBottom(false, 0);
            
            // Additional scroll attempts with staggered delays for reliability
            setTimeout(() => scrollToBottom(false, 0), 50);  
            setTimeout(() => scrollToBottom(false, 0), 150);
            setTimeout(() => scrollToBottom(false, 0), 300);
          });
        } else {
          // Standard behavior for iOS or created rooms
          if (messages.length > 0) {
            setTimeout(() => scrollToBottom(true, 0), 
              Platform.OS === 'ios' ? 100 : 200);
          }
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: appTheme.background }} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={appTheme.background} />
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
              <Text style={{ fontSize: scaleFont(22), marginRight: scaleSize(8) }}>{emoji}</Text>
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
              Room Code: {roomCode}
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 95 : 10}
        contentContainerStyle={{ flex: 1 }}
        enabled={!(Platform.OS === 'android' && isJoinedRoom)} // Disable for Android joined rooms - we'll handle manually
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1 }}>
            <ScrollView
                ref={scrollViewRef}
                style={{ flex: 1 }}
                contentContainerStyle={{
                  flexGrow: 1,
                  paddingHorizontal: scaleSize(16),
                  paddingTop: verticalScale(12),
                  paddingBottom: Platform.OS === 'android' && isJoinedRoom
                    ? (keyboardHeight > 0 ? verticalScale(80) : verticalScale(60))
                    : (keyboardHeight > 0 ? (Platform.OS === 'ios' ? verticalScale(8) : verticalScale(10)) : verticalScale(14)),
                  ...(messages.length === 0 && {
                    justifyContent: 'center',
                    alignItems: 'center'
                  })
                }
                }
                keyboardShouldPersistTaps="always"
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
                        <Text style={[styles.messageText, { color: msg.isCurrentUser ? '#fff' : appTheme.text }]}>{msg.text}</Text>
                        <Text style={[styles.messageTime, { color: msg.isCurrentUser ? '#e0e0e0' : appTheme.secondaryText }]}>{formatTime(msg.timestamp)}</Text>
                      </View>
                    </Animated.View>
                  ))
                )}
              </ScrollView>
            </View>
            {/* Input Area */}
            <View style={[
              styles.inputContainer, 
              { 
                backgroundColor: appTheme.background, 
                borderTopColor: appTheme.border,
                paddingBottom: Platform.OS === 'ios' ? verticalScale(6) : verticalScale(2),
                paddingTop: verticalScale(6),
                // Position absolutely for Android joined rooms
                ...(Platform.OS === 'android' && isJoinedRoom ? {
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: inputPosition,
                  elevation: 10, // Ensure it's above other elements
                  zIndex: 1000, // Additional z-index for safety
                  backgroundColor: appTheme.background, // Ensure background is opaque
                  borderColor: appTheme.border,
                  borderTopWidth: 1,
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
                      maxHeight: 100
                    }]}
                    placeholder="Type a message..."
                    placeholderTextColor={appTheme.secondaryText}
                    multiline
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
            </View>
          </View>
        </TouchableWithoutFeedback>
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
          {members[0]?.isAdmin ? (
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
    fontSize: scaleFont(10),
    textAlign: 'right',
    marginTop: 4,
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
    textAlignVertical: 'top', 
    includeFontPadding: false,
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