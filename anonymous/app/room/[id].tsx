import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StatusBar, 
  Pressable, 
  useWindowDimensions, 
  Modal, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Alert,
  Animated,
  Easing,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageStyle,
  GestureResponderEvent // Added GestureResponderEvent
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
        <Ionicons name={iconName as any} size={scaleFont(22)} color={color} style={styles.optionIcon} />
        <Text style={[styles.optionText, { color }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
});

export default function CreatedRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; name?: string; emoji?: string; code?: string }>();
  const { isDarkMode } = useThemeStore();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const appTheme = isDarkMode ? themeColors.dark : themeColors.light;
  
  // State
  const [showOptions, setShowOptions] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([
    { id: '1', name: 'You', isAdmin: true },
    { id: '2', name: 'User 2', isAdmin: false },
    { id: '3', name: 'User 3', isAdmin: false },
  ]);
  
  // Room details with defaults
  const { id = Date.now().toString(), name: roomName = 'Room', emoji = '💬' } = params;
  const [roomCode] = useState(generateRoomCode());
  
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

  // Auto-scroll to bottom when messages change or keyboard appears
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, keyboardHeight]);

  // Keyboard handling
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      'keyboardWillShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const hideSubscription = Keyboard.addListener(
      'keyboardWillHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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
        keyboardVerticalOffset={Platform.OS === 'ios' 
          ? insets.top + insets.bottom + 8
          : insets.bottom
        }
        enabled
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
              <ScrollView
                ref={scrollViewRef}
                style={{ flex: 1 }}
                contentContainerStyle={
                  messages.length === 0
                    ? {
                        flexGrow: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingHorizontal: scaleSize(16),
                        paddingVertical: verticalScale(12),
                      }
                    : {
                        flexGrow: 1,
                        paddingHorizontal: scaleSize(16),
                        paddingVertical: verticalScale(12),
                      }
                }
                keyboardShouldPersistTaps="handled"
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
            <View style={[styles.inputContainer, { backgroundColor: appTheme.background, borderTopColor: appTheme.border }]}> 
              <View style={[styles.inputWrapper, { backgroundColor: appTheme.card, borderColor: appTheme.border }]}> 
                <TextInput
                  style={[styles.textInput, { color: appTheme.text }]}
                  placeholder="Type a message..."
                  placeholderTextColor={appTheme.secondaryText}
                  multiline
                  value={message}
                  onChangeText={setMessage}
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
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
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: scaleSize(12),
    paddingBottom: verticalScale(16),
    borderTopWidth: 1,
    position: 'relative',
    zIndex: 10,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: scaleSize(22),
    paddingHorizontal: scaleSize(14),
    paddingVertical: verticalScale(8),
    marginRight: scaleSize(8),
    borderWidth: 1,
    minHeight: verticalScale(44),
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
    width: scaleSize(48),
    height: scaleSize(48),
    borderRadius: scaleSize(24),
    justifyContent: 'center',
    alignItems: 'center',
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