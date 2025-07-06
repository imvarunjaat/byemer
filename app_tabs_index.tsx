import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Alert,
  Pressable,
  Animated,
  RefreshControl,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFValue } from 'react-native-responsive-fontsize';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/store/theme-store';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/constants/colors';
import { roomService } from '@/lib/room-service';
import { Button } from '../../components/Button';
import { ThemeToggle } from '@/components/themeToggle';

const { width, height } = Dimensions.get('window');

// Modern Material Design 3 Card Component
const ModernCard = ({ children, style, onPress, elevated = false, ...props }) => {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  
  const cardStyle = [
    styles.modernCard,
    {
      backgroundColor: elevated ? theme.cardElevated : theme.card,
      shadowColor: theme.shadow,
    },
    style
  ];
  
  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          cardStyle,
          pressed && styles.cardPressed
        ]}
        onPress={onPress}
        {...props}
      >
        {children}
      </Pressable>
    );
  }
  
  return <View style={cardStyle} {...props}>{children}</View>;
};

// Modern Floating Action Button
const ModernFAB = ({ onPress, icon, label, variant = 'primary', style, ...props }) => {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  const scaleValue = useState(new Animated.Value(1))[0];
  
  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };
  
  const fabStyle = [
    styles.modernFAB,
    {
      backgroundColor: variant === 'primary' ? theme.primary : theme.secondary,
      shadowColor: theme.shadow,
    },
    style
  ];
  
  return (
    <Animated.View style={[fabStyle, { transform: [{ scale: scaleValue }] }]}>
      <Pressable
        style={styles.fabPressable}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...props}
      >
        <MaterialCommunityIcons 
          name={icon} 
          size={24} 
          color={variant === 'primary' ? theme.onPrimary : theme.onSecondary} 
        />
        {label && (
          <Text style={[
            styles.fabLabel,
            { color: variant === 'primary' ? theme.onPrimary : theme.onSecondary }
          ]}>
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
};

// Modern Room Item Component
const ModernRoomItem = ({ room, onPress }) => {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  
  const roomName = room.room?.name || room.rooms?.name || room.name || 'Unnamed Room';
  const emoji = room.emoji || '💬';
  const timeAgo = formatTimeAgo(room.last_accessed || room.created_at);
  
  return (
    <ModernCard onPress={() => onPress(room)} style={styles.roomItem}>
      <View style={styles.roomItemContent}>
        <LinearGradient
          colors={isDarkMode ? [theme.primary, theme.secondary] : [theme.primaryContainer, theme.secondaryContainer]}
          style={styles.roomIconContainer}
        >
          <Text style={styles.roomEmoji}>{emoji}</Text>
        </LinearGradient>
        
        <View style={styles.roomInfo}>
          <Text style={[styles.roomName, { color: theme.text }]} numberOfLines={1}>
            {roomName}
          </Text>
          <Text style={[styles.roomTime, { color: theme.textSecondary }]}>
            {timeAgo}
          </Text>
        </View>
        
        <View style={styles.roomActions}>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={theme.textTertiary}
          />
        </View>
      </View>
    </ModernCard>
  );
};

// Helper function to format time ago
const formatTimeAgo = (dateString) => {
  if (!dateString) return 'Unknown';
  
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

export default function HomeScreen() {
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const { isAuthenticated, user, logout } = useAuthStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  
  const [recentRooms, setRecentRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const handleCreateRoom = () => {
    router.push('/create-room');
  };
  
  const handleJoinRoom = () => {
    router.push('/join-room');
  };
  
  const handleRoomPress = (room) => {
    const roomId = room.room_id || room.id;
    const roomName = room.room?.name || room.rooms?.name || room.name || '';
    const emoji = room.emoji || '💬';
    const nickname = room.nickname || 'Anonymous';
    
    console.log(`Navigating to room: ${roomId}, with emoji: ${emoji}`);
    router.push(`/room/${roomId}?name=${encodeURIComponent(roomName)}&emoji=${encodeURIComponent(emoji)}&nickname=${encodeURIComponent(nickname)}`);
  };
  
  const loadRecentRooms = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    
    try {
      if (isAuthenticated && user) {
        const rooms = await roomService.getRecentRooms(user.id);
        console.log('Recent rooms loaded:', rooms?.length || 0);
        setRecentRooms(rooms || []);
      } else {
        setRecentRooms([]);
      }
    } catch (error) {
      console.error('Failed to load recent rooms:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadRecentRooms(true);
  };
  
  useEffect(() => {
    if (isAuthenticated && user) {
      loadRecentRooms();
    }
  }, [isAuthenticated, user?.id]);
  
  const handleLogin = () => {
    router.push('/login');
  };
  
  const handleSignup = () => {
    router.push('/signup');
  };
  
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/');
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        },
      ]
    );
  };
  
  const renderAuthenticatedContent = () => (
    <View style={styles.container}>
      <LinearGradient
        colors={isDarkMode ? colors.gradients.dark.background : colors.gradients.light.background}
        style={styles.background}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.primary]}
                tintColor={theme.primary}
              />
            }
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <View style={styles.headerText}>
                  <Text style={[styles.greeting, { color: theme.textSecondary }]}>
                    Hello,
                  </Text>
                  <Text style={[styles.userName, { color: theme.text }]}>
                    {user?.username || 'Anonymous'} 👋
                  </Text>
                </View>
                <View style={styles.headerActions}>
                  <ThemeToggle />
                  <TouchableOpacity
                    style={[styles.profileButton, { backgroundColor: theme.primaryContainer }]}
                    onPress={handleLogout}
                  >
                    <MaterialCommunityIcons
                      name="logout"
                      size={20}
                      color={theme.onPrimaryContainer}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <LinearGradient
                colors={isDarkMode ? colors.gradients.dark.hero : colors.gradients.light.hero}
                style={styles.heroGradient}
              >
                <View style={styles.heroContent}>
                  <Text style={[styles.heroTitle, { color: theme.text }]}>
                    Ready to chat?
                  </Text>
                  <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
                    Join conversations or start your own room
                  </Text>
                </View>
              </LinearGradient>
            </View>
            
            {/* Action Cards */}
            <View style={styles.actionSection}>
              <View style={styles.actionGrid}>
                <ModernCard onPress={handleCreateRoom} style={styles.actionCard}>
                  <LinearGradient
                    colors={isDarkMode ? colors.gradients.dark.primary : colors.gradients.light.primary}
                    style={styles.actionGradient}
                  >
                    <MaterialCommunityIcons
                      name="plus-circle"
                      size={32}
                      color={theme.primary}
                    />
                    <Text style={[styles.actionTitle, { color: theme.text }]}>
                      Create Room
                    </Text>
                    <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>
                      Start a new conversation
                    </Text>
                  </LinearGradient>
                </ModernCard>
                
                <ModernCard onPress={handleJoinRoom} style={styles.actionCard}>
                  <LinearGradient
                    colors={isDarkMode ? colors.gradients.dark.secondary : colors.gradients.light.secondary}
                    style={styles.actionGradient}
                  >
                    <MaterialCommunityIcons
                      name="account-group"
                      size={32}
                      color={theme.secondary}
                    />
                    <Text style={[styles.actionTitle, { color: theme.text }]}>
                      Join Room
                    </Text>
                    <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>
                      Enter with a room code
                    </Text>
                  </LinearGradient>
                </ModernCard>
              </View>
            </View>
            
            {/* Recent Rooms */}
            <View style={styles.recentSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Recent Rooms
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                  Jump back into your conversations
                </Text>
              </View>
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                    Loading rooms...
                  </Text>
                </View>
              ) : recentRooms.length > 0 ? (
                <FlatList
                  data={recentRooms}
                  renderItem={({ item }) => (
                    <ModernRoomItem room={item} onPress={handleRoomPress} />
                  )}
                  keyExtractor={(item) => item.id || item.room_id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.roomSeparator} />}
                />
              ) : (
                <ModernCard style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="chat-outline"
                    size={48}
                    color={theme.textTertiary}
                  />
                  <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                    No recent rooms
                  </Text>
                  <Text style={[styles.emptyStateSubtitle, { color: theme.textSecondary }]}>
                    Create or join a room to start chatting
                  </Text>
                </ModernCard>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
  
  const renderUnauthenticatedContent = () => (
    <View style={styles.container}>
      <LinearGradient
        colors={isDarkMode ? colors.gradients.dark.background : colors.gradients.light.background}
        style={styles.background}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <View style={styles.headerText}>
                  <Text style={[styles.appName, { color: theme.text }]}>
                    isThatu
                  </Text>
                </View>
                <View style={styles.headerActions}>
                  <ThemeToggle />
                </View>
              </View>
            </View>
            
            {/* Welcome Hero */}
            <View style={styles.welcomeSection}>
              <LinearGradient
                colors={isDarkMode ? colors.gradients.dark.hero : colors.gradients.light.hero}
                style={styles.welcomeGradient}
              >
                <View style={styles.welcomeContent}>
                  <Text style={[styles.welcomeTitle, { color: theme.text }]}>
                    Welcome to isThatu
                  </Text>
                  <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
                    Connect, chat, and share moments anonymously
                  </Text>
                </View>
              </LinearGradient>
            </View>
            
            {/* Auth Section */}
            <View style={styles.authSection}>
              <ModernCard style={styles.authCard}>
                <Text style={[styles.authTitle, { color: theme.text }]}>
                  Get Started
                </Text>
                <Text style={[styles.authDescription, { color: theme.textSecondary }]}>
                  Join the conversation by creating an account or signing in
                </Text>
                
                <View style={styles.authButtons}>
                  <Button
                    title="Sign Up"
                    onPress={handleSignup}
                    style={[styles.authButton, { backgroundColor: theme.primary }]}
                    textStyle={{ color: theme.onPrimary }}
                  />
                  <Button
                    title="Sign In"
                    onPress={handleLogin}
                    style={[styles.authButton, { 
                      backgroundColor: theme.primaryContainer,
                      borderWidth: 1,
                      borderColor: theme.primary
                    }]}
                    textStyle={{ color: theme.onPrimaryContainer }}
                    variant="outline"
                  />
                </View>
              </ModernCard>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
  
  return isAuthenticated ? renderAuthenticatedContent() : renderUnauthenticatedContent();
}
            try {
              await logout();
              // The router navigation will happen automatically as auth state changes
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ],
      { cancelable: true }
    );
  };
  
  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <LinearGradient
        colors={isDarkMode 
          ? ['#121212', '#1E1E1E', '#121212'] 
          : ['#FFFFFF', '#F8F9FA', '#FFFFFF']}
        style={styles.background}
      >
        <View style={[styles.header, { paddingTop: 40 }]}>
          <Text style={[styles.title, { color: theme.text }]}>
            is<Text style={{ color: theme.accent }}>Thatu</Text>
          </Text>
          <View style={styles.headerRight}>
            {isAuthenticated ? (
              <TouchableOpacity 
                style={[styles.profileButton, { backgroundColor: theme.accent + '20' }]}
                onPress={handleLogout}
              >
                <Feather name="user" size={18} color={theme.accent} />
                <Text style={[styles.profileText, { color: theme.accent }]}>
                  {user?.username || 'User'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.authButton, { backgroundColor: theme.accent + '20' }]}
                onPress={handleLogin}
              >
                <Text style={[styles.authButtonText, { color: theme.accent }]}>Login</Text>
              </TouchableOpacity>
            )}
            <ThemeToggle />
          </View>
        </View>
        
        <ScrollView 
          contentContainerStyle={{...styles.content, paddingBottom: hp('10%')}}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <Text style={[styles.heroTitle, { color: theme.text }]}>
              Chat Anonymously 🎭
            </Text>
            <Text style={[styles.heroSubtitle, { color: theme.secondaryText }]}>
              Create or join rooms to chat without revealing your identity
            </Text>
          </View>
          
          <View style={styles.actionsContainer}>
            <GlassmorphicCard 
              onPress={handleCreateRoom}
              style={styles.actionCard}
              gradientColors={isDarkMode 
                ? colors.gradients.dark.primary as [ColorValue, ColorValue]
                : colors.gradients.light.primary as [ColorValue, ColorValue]}
            >
              <View style={styles.actionContent}>
                <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? 'rgba(187, 134, 252, 0.2)' : 'rgba(124, 77, 255, 0.1)' }]}>
                  <Feather name="plus" size={24} color={theme.accent} />
                </View>
                <Text style={[styles.actionTitle, { color: theme.text }]}>
                  Create Room
                </Text>
                <Text style={[styles.actionDescription, { color: theme.secondaryText }]}>
                  Start a new anonymous group chat
                </Text>
              </View>
            </GlassmorphicCard>
            
            <GlassmorphicCard 
              onPress={handleJoinRoom}
              style={styles.actionCard}
              gradientColors={isDarkMode 
                ? colors.gradients.dark.secondary as [ColorValue, ColorValue]
                : colors.gradients.light.secondary as [ColorValue, ColorValue]}
            >
              <View style={styles.actionContent}>
                <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? 'rgba(3, 218, 198, 0.2)' : 'rgba(3, 218, 198, 0.1)' }]}>
                  <MaterialCommunityIcons name="account-plus-outline" size={24} color={isDarkMode ? colors.dark.secondaryAccent : colors.light.accent} />
                </View>
                <Text style={[styles.actionTitle, { color: theme.text }]}>
                  Join Room
                </Text>
                <Text style={[styles.actionDescription, { color: theme.secondaryText }]}>
                  Enter a room with an invite code
                </Text>
              </View>
            </GlassmorphicCard>
          </View>
          
          {/* Only show recent rooms for authenticated users */}
          {isAuthenticated && (
            <View style={styles.recentSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Recent Rooms
              </Text>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={[styles.sectionSubtitle, { color: theme.secondaryText }]}>
                  {recentRooms.length} {recentRooms.length === 1 ? 'room' : 'rooms'} found
                </Text>
              </View>
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={theme.accent} />
                  <Text style={[styles.loadingText, { color: theme.secondaryText }]}>Loading recent rooms...</Text>
                </View>
              ) : recentRooms.length > 0 ? (
                <View style={styles.roomsContainer}>
                  {recentRooms.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.roomItem, { backgroundColor: theme.card }]}
                      onPress={() => handleRoomPress(item)}
                    >
                      <View style={styles.roomItemLeft}>
                        <View style={[styles.roomEmoji, { backgroundColor: theme.accent + '20' }]}>
                          <Text style={styles.emojiText}>{item.emoji || '💬'}</Text>
                        </View>
                        <View style={styles.roomInfo}>
                          <Text style={[styles.roomName, { color: theme.text }]} numberOfLines={1}>
                            {item.room?.name || 'Unnamed Room'}
                          </Text>
                          <Text style={[styles.roomTime, { color: theme.secondaryText }]}>
                            {item.last_accessed ? new Date(item.last_accessed).toLocaleDateString() : 'Recently'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.roomItemRight}>
                        <FontAwesome5 name="chevron-right" size={14} color={theme.secondaryText} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="message-text" size={40} color={theme.secondaryText} />
                  <Text style={[styles.emptyStateText, { color: theme.secondaryText }]}>
                    No recent rooms
                  </Text>
                  <Button 
                    title="Create Your First Room" 
                    onPress={handleCreateRoom}
                    variant="primary"
                    size="small"
                    style={{ marginTop: 16 }}
                  />
                </View>
              )}
            </View>
          )}
          
          {!isAuthenticated && (
            <View style={styles.authSection}>
              <LinearGradient
                colors={isDarkMode 
                  ? ['rgba(187, 134, 252, 0.1)', 'rgba(124, 77, 255, 0.05)'] 
                  : ['rgba(124, 77, 255, 0.08)', 'rgba(187, 134, 252, 0.03)']}
                style={styles.authCard}
              >
                <Text style={[styles.authTitle, { color: theme.text }]}>
                  Create an Account
                </Text>
                <Text style={[styles.authDescription, { color: theme.secondaryText }]}>
                  Sign up to save your rooms and chat history
                </Text>
                <View style={styles.authButtons}>
                  <Button
                    title="Sign Up"
                    onPress={handleSignup}
                    variant="primary"
                    size="small"
                    style={{ marginRight: 10, flex: 1 }}
                  />
                  <Button
                    title="Login"
                    onPress={handleLogin}
                    variant="outline"
                    size="small"
                    style={{ flex: 1 }}
                  />
                </View>
              </LinearGradient>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  recentSection: {
    marginBottom: hp('2.5%'),
  },
  sectionTitle: {
    fontSize: RFValue(20),
    fontWeight: '600',
    marginBottom: hp('1%'),
  },
  sectionSubtitle: {
    fontSize: RFValue(12),
    fontStyle: 'italic',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 10,
  },
  profileText: {
    fontSize: RFValue(12),
    fontWeight: '600',
    marginLeft: 5,
  },
  authButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 10,
  },
  authButtonText: {
    fontSize: RFValue(12),
    fontWeight: '600',
  },
  authSection: {
    marginTop: hp('4%'),
    marginBottom: hp('4%'),
    paddingHorizontal: wp('5%'),
  },
  authCard: {
    padding: wp('5%'),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 77, 255, 0.2)',
  },
  authTitle: {
    fontSize: RFValue(18),
    fontWeight: 'bold',
    marginBottom: 8,
  },
  authDescription: {
    fontSize: RFValue(14),
    marginBottom: 16,
  },
  authButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  background: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp('5%'),
    paddingTop: hp('6%'),
    paddingBottom: hp('1.5%'),
  },
  title: {
    fontSize: RFValue(28),
    fontWeight: 'bold',
  },
  content: {
    padding: wp('5%'),
    paddingBottom: hp('5%'),
  },
  heroSection: {
    marginBottom: hp('4%'),
  },
  heroTitle: {
    fontSize: RFValue(32),
    fontWeight: 'bold',
    marginBottom: hp('1%'),
  },
  heroSubtitle: {
    fontSize: RFValue(16),
    lineHeight: RFValue(24),
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp('4%'),
  },
  actionCard: {
    width: '48%',
    height: hp('22%'),
  },
  actionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: wp('14%'),
    height: wp('14%'),
    borderRadius: wp('7%'),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp('1.5%'),
  },
  actionTitle: {
    fontSize: RFValue(18),
    fontWeight: '600',
    marginBottom: hp('0.7%'),
    textAlign: 'center',
  },
  actionDescription: {
    fontSize: RFValue(14),
    textAlign: 'center',
    paddingHorizontal: wp('1%'),
  },
  roomsContainer: {
    width: '100%',
    paddingVertical: 8,
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  roomItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roomEmoji: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emojiText: {
    fontSize: 18,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: RFValue(14),
    fontWeight: '600',
    marginBottom: 4,
  },
  roomTime: {
    fontSize: RFValue(12),
  },
  roomItemRight: {
    paddingRight: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp('5%'),
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center', 
    paddingVertical: 30,
  },
  loadingText: {
    marginTop: 8,
    fontSize: RFValue(14),
  },
  emptyStateText: {
    fontSize: RFValue(16),
    marginTop: hp('1.5%'),
  },
});