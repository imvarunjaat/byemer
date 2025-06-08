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
  ImageStyle
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/store/theme-store';
import { colors as themeColors } from '@/constants/colors';
import { Feather, Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

type Style = ViewStyle | TextStyle | ImageStyle;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable) as any;

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
  const handleRoomAction = (action: 'delete' | 'add' | 'kick') => {
    setShowOptions(false);
    
    switch (action) {
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
      <View style={{
        paddingTop: insets.top,
        backgroundColor: appTheme.card,
        borderBottomWidth: 1,
        borderBottomColor: appTheme.border,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: width * 0.04,
          paddingVertical: 10,
        }}>
          <Pressable 
            onPress={() => router.back()} 
            style={({ pressed }) => ({
              padding: 8,
              borderRadius: 20,
              backgroundColor: pressed ? appTheme.border : 'transparent',
            })}
          >
            <Ionicons name="arrow-back" size={24} color={appTheme.accent} />
          </Pressable>
          
          <View style={{
            flex: 1,
            alignItems: 'center',
            marginLeft: 10,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 22, marginRight: 8 }}>{emoji}</Text>
              <Text 
                style={{
                  fontSize: 18,
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
            <Text style={{ 
              fontSize: 12, 
              color: appTheme.secondaryText, 
              marginTop: 2 
            }}>
              Room Code: {roomCode}
            </Text>
          </View>
          
          <Pressable 
            onPress={() => setShowOptions(true)}
            style={({ pressed }) => ({
              padding: 8,
              borderRadius: 20,
              backgroundColor: pressed ? appTheme.border : 'transparent',
            })}
          >
            <Feather name="more-vertical" size={24} color={appTheme.text} />
          </Pressable>
        </View>
      </View>
      
      {/* Chat Messages */}
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            <ScrollView 
              ref={scrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 ? (
                <View style={[styles.emptyState, { marginTop: height * 0.3 }]}>
                  <MaterialCommunityIcons 
                    name="message-outline" 
                    size={60} 
                    color={appTheme.secondaryText}
                    style={styles.emptyIcon}
                  />
                  <Text style={[styles.emptyText, { color: appTheme.secondaryText }]}>
                    Send your first message to start the conversation
                  </Text>
                </View>
              ) : (
                messages.map((msg) => {
                  const animation = getMessageAnimation(msg.id);
                  return (
                    <Animated.View 
                      key={msg.id}
                      style={[
                        styles.messageBubbleWrapper,
                        {
                          alignSelf: msg.isCurrentUser ? 'flex-end' : 'flex-start',
                          opacity: animation,
                          transform: [
                            { 
                              scale: animation.interpolate({
                                inputRange: [0.5, 1],
                                outputRange: [0.8, 1]
                              }) 
                            },
                            {
                              translateY: animation.interpolate({
                                inputRange: [0.5, 1],
                                outputRange: [20, 0]
                              })
                            }
                          ]
                        }
                      ]}
                    >
                      <View style={[
                        styles.messageBubble,
                        {
                          backgroundColor: msg.isCurrentUser ? appTheme.accent : appTheme.card,
                          borderBottomRightRadius: msg.isCurrentUser ? 4 : 18,
                          borderBottomLeftRadius: msg.isCurrentUser ? 18 : 4,
                        }
                      ]}>
                        <Text style={[
                          styles.messageText,
                          { color: msg.isCurrentUser ? '#fff' : appTheme.text }
                        ]}>
                          {msg.text}
                        </Text>
                        <Text style={[
                          styles.messageTime,
                          { color: msg.isCurrentUser ? 'rgba(255,255,255,0.7)' : appTheme.secondaryText }
                        ]}>
                          {formatTime(msg.timestamp)}
                        </Text>
                      </View>
                    </Animated.View>
                  );
                })
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
            
            {/* Message Input */}
            <View style={[
              styles.inputContainer, 
              {
                backgroundColor: appTheme.card,
                borderTopColor: appTheme.border,
                paddingBottom: Math.max(insets.bottom, 10),
              }
            ]}>
              <View style={[
                styles.inputWrapper,
                {
                  backgroundColor: appTheme.background,
                  borderColor: message ? appTheme.accent : appTheme.border,
                }
              ]}>
                <TextInput
                  style={[
                    styles.textInput,
                    { 
                      color: appTheme.text,
                      paddingRight: message ? 36 : 0,
                    }
                  ]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Type a message..."
                  placeholderTextColor={appTheme.secondaryText}
                  multiline
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                  blurOnSubmit={false}
                  enablesReturnKeyAutomatically
                  textAlignVertical="center"
                  selectionColor={appTheme.accent}
                />
                {message.length > 0 && (
                  <AnimatedPressable 
                    onPress={() => setMessage('')}
                    style={styles.clearButton}
                  >
                    <Ionicons 
                      name="close-circle" 
                      size={20} 
                      color={appTheme.secondaryText}
                    />
                  </AnimatedPressable>
                )}
              </View>
              
              <AnimatedPressable
                onPress={handleSend}
                disabled={!message.trim()}
                style={({ pressed }: { pressed: boolean }) => ({
                  ...styles.sendButton,
                  backgroundColor: message.trim() ? appTheme.accent : appTheme.border,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Ionicons 
                  name={message.trim() ? 'send' : 'mic-outline'}
                  size={22} 
                  color={message.trim() ? '#fff' : appTheme.secondaryText} 
                  style={styles.sendIcon} 
                />
              </AnimatedPressable>
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
        <Pressable 
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
          onPress={() => setShowOptions(false)}
        >
          <View style={{
            backgroundColor: appTheme.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: insets.bottom + 20,
            paddingTop: 20,
          }}>
            <View style={{
              width: 40,
              height: 4,
              backgroundColor: appTheme.border,
              borderRadius: 2,
              alignSelf: 'center',
              marginBottom: 20,
            }} />
            
            <OptionItem 
              icon="person-add" 
              label="Add Member" 
              onPress={() => handleRoomAction('add')}
              color={appTheme.text}
            />
            
            <OptionItem 
              icon="person-remove" 
              label="Kick Member" 
              onPress={() => handleRoomAction('kick')}
              color={appTheme.text}
            />
            
            <View style={{
              height: 1,
              backgroundColor: appTheme.border,
              marginVertical: 12,
              marginHorizontal: 16,
            }} />
            
            <OptionItem 
              icon="trash-outline" 
              label="Delete Group" 
              onPress={() => handleRoomAction('delete')}
              color={appTheme.error}
            />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// Reusable option item component type
type OptionItemProps = {
  icon: string;
  label: string;
  onPress: () => void;
  color: string;
};

// Reusable option item component
const OptionItem: React.FC<OptionItemProps> = ({ 
  icon, 
  label, 
  onPress, 
  color 
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
      tension: 40,
    }).start();
  };

  return (
    <AnimatedPressable 
      onPress={onPress}
      onPressIn={handlePressIn as any}
      onPressOut={handlePressOut as any}
      style={({ pressed }: { pressed: boolean }) => ({
        ...styles.optionItem,
        opacity: pressed ? 0.7 : 1,
        transform: [{ scale }],
      })}
    >
      <Ionicons name={icon as any} size={22} color={color} style={styles.optionIcon} />
      <Text style={[styles.optionText, { color }]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
};

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
    marginBottom: 10
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: '80%',
    fontSize: 16,
    lineHeight: 22,
  },
  // Messages
  messageBubbleWrapper: {
    maxWidth: '80%',
    marginBottom: 12,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 10,
    textAlign: 'right',
    marginTop: 4,
  },
  // Input area
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    minHeight: 44,
    maxHeight: 100,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 28,
    padding: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  clearButton: {
    position: 'absolute',
    right: 8,
    padding: 4,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    marginLeft: 2,
  },
  
  // Options
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  optionIcon: {
    width: 28,
  },
  optionText: {
    fontSize: 16,
    marginLeft: 12,
  },
});