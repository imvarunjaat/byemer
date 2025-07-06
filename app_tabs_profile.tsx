import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Switch, 
  Pressable, 
  Alert, 
  Linking, 
  Platform, 
  KeyboardAvoidingView,
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFValue } from 'react-native-responsive-fontsize';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/store/theme-store';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/constants/colors';
import { userService } from '@/lib/user-service';
import { InputField } from '@/components/InputField';
import { Button } from '../../components/Button';
import { EmojiSelector } from '@/components/EmojiSelector';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

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

// Modern List Item Component
const ModernListItem = ({ icon, title, subtitle, onPress, rightContent, iconColor, style }) => {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  
  return (
    <Pressable
      style={({ pressed }) => [
        styles.listItem,
        {
          backgroundColor: pressed ? theme.surfaceContainer : 'transparent',
        },
        style
      ]}
      onPress={onPress}
    >
      <View style={[styles.listItemIcon, { backgroundColor: iconColor || theme.primaryContainer }]}>
        <MaterialCommunityIcons
          name={icon}
          size={24}
          color={iconColor ? theme.onPrimary : theme.onPrimaryContainer}
        />
      </View>
      
      <View style={styles.listItemContent}>
        <Text style={[styles.listItemTitle, { color: theme.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.listItemSubtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      
      <View style={styles.listItemRight}>
        {rightContent || (
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={theme.textTertiary}
          />
        )}
      </View>
    </Pressable>
  );
};

export default function ProfileScreen() {
  const { isDarkMode, toggleTheme } = useThemeStore();
  const { logout, user, updateSession } = useAuthStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  const router = useRouter();
  
  const [nickname, setNickname] = useState(user?.username || 'Anonymous');
  const [originalNickname, setOriginalNickname] = useState(user?.username || 'Anonymous');
  const [selectedEmoji, setSelectedEmoji] = useState(user?.preferred_emoji || '🎭');
  const [originalEmoji, setOriginalEmoji] = useState(user?.preferred_emoji || '🎭');
  const [showEmojiSelector, setShowEmojiSelector] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // Sync local state with auth store user data
  useEffect(() => {
    if (user) {
      setNickname(user.username || 'Anonymous');
      setOriginalNickname(user.username || 'Anonymous');
      setSelectedEmoji(user.preferred_emoji || '🎭');
      setOriginalEmoji(user.preferred_emoji || '🎭');
    }
  }, [user]);

  // Reset the save message after a few seconds
  useEffect(() => {
    let timer;
    if (saveMessage) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setSaveMessage(''));
      }, 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [saveMessage, fadeAnim]);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [saveMessage]);
  
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: async () => {
            try {
              await logout();
              router.replace('/');
            } catch (error) {
              console.error('Logout error:', error);
            }
          }, 
          style: 'destructive' 
        },
      ]
    );
  };
  
  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    setShowEmojiSelector(false);
  };
  
  // Check if profile data has changed
  const hasProfileChanged = () => {
    return nickname !== originalNickname || selectedEmoji !== originalEmoji;
  };
  
  // Save profile changes
  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      // Track if we're only updating emoji (may need special handling)
      const onlyUpdatingEmoji = nickname === originalNickname && selectedEmoji !== originalEmoji;
      
      // Prepare updates object with only changed fields
      const updates: { username?: string; preferred_emoji?: string } = {};
      
      if (nickname !== originalNickname) {
        updates.username = nickname;
      }
      
      if (selectedEmoji !== originalEmoji) {
        updates.preferred_emoji = selectedEmoji;
      }
      
      // Only make the API call if there are changes
      if (Object.keys(updates).length > 0) {
        const updatedProfile = await userService.updateUserProfile(user.id, updates);
        
        if (updatedProfile || onlyUpdatingEmoji) {
          // For emoji-only updates, updatedProfile might be null if the column doesn't exist
          // but we still want to update the UI
          
          // Update user in auth store immediately
          const updatedUser = {
            ...user,
            username: updatedProfile?.username || nickname,
            preferred_emoji: selectedEmoji // Always use the selected emoji for UI
          };
          
          if (updateSession) {
            updateSession(updatedUser);
          }
          
          // Update local state to reflect the changes
          setOriginalNickname(updatedUser.username);
          setOriginalEmoji(updatedUser.preferred_emoji);
          
          setSaveMessage('Profile updated successfully!');
        } else {
          setSaveMessage('Failed to update profile. Please try again.');
        }
      } else {
        setSaveMessage('No changes to save.');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveMessage('An error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDarkMode ? colors.gradients.dark.background : colors.gradients.light.background}
        style={styles.background}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                Profile
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                Manage your profile and preferences
              </Text>
            </View>
            
            {/* Profile Card */}
            <View style={styles.profileSection}>
              <ModernCard style={styles.profileCard} elevated>
                <LinearGradient
                  colors={isDarkMode ? colors.gradients.dark.primary : colors.gradients.light.primary}
                  style={styles.profileGradient}
                >
                  <View style={styles.profileHeader}>
                    <TouchableOpacity
                      style={[styles.avatarContainer, { backgroundColor: theme.surface }]}
                      onPress={() => setShowEmojiSelector(true)}
                    >
                      <Text style={styles.avatarEmoji}>{selectedEmoji}</Text>
                      <View style={[styles.editBadge, { backgroundColor: theme.primary }]}>
                        <MaterialCommunityIcons
                          name="pencil"
                          size={12}
                          color={theme.onPrimary}
                        />
                      </View>
                    </TouchableOpacity>
                    
                    <View style={styles.profileInfo}>
                      <Text style={[styles.profileName, { color: theme.text }]}>
                        {nickname}
                      </Text>
                      <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>
                        {user?.email || 'No email'}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </ModernCard>
            </View>
            
            {/* Edit Profile Section */}
            <View style={styles.editSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Edit Profile
              </Text>
              
              <ModernCard style={styles.editCard}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>
                    Username
                  </Text>
                  <InputField
                    value={nickname}
                    onChangeText={setNickname}
                    placeholder="Enter your username"
                    style={styles.input}
                  />
                </View>
                
                <ModernListItem
                  icon="emoticon-happy"
                  title="Avatar Emoji"
                  subtitle={`Current: ${selectedEmoji}`}
                  onPress={() => setShowEmojiSelector(true)}
                  iconColor={theme.secondary}
                />
                
                {hasProfileChanged() && (
                  <View style={styles.saveContainer}>
                    <Button
                      title="Save Changes"
                      onPress={handleSaveProfile}
                      loading={isSaving}
                      style={[styles.saveButton, { backgroundColor: theme.primary }]}
                      textStyle={{ color: theme.onPrimary }}
                    />
                  </View>
                )}
              </ModernCard>
            </View>
            
            {/* Settings Section */}
            <View style={styles.settingsSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Settings
              </Text>
              
              <ModernCard style={styles.settingsCard}>
                <ModernListItem
                  icon={isDarkMode ? "weather-night" : "weather-sunny"}
                  title="Theme"
                  subtitle={isDarkMode ? "Dark mode" : "Light mode"}
                  onPress={toggleTheme}
                  rightContent={
                    <Switch
                      value={isDarkMode}
                      onValueChange={toggleTheme}
                      trackColor={{ false: theme.outline, true: theme.primary }}
                      thumbColor={isDarkMode ? theme.onPrimary : theme.surface}
                      ios_backgroundColor={theme.outline}
                    />
                  }
                  iconColor={isDarkMode ? '#BB86FC' : '#FFA726'}
                />
                
                <View style={styles.separator} />
                
                <ModernListItem
                  icon="bell"
                  title="Notifications"
                  subtitle="Push notifications"
                  rightContent={
                    <Switch
                      value={notificationsEnabled}
                      onValueChange={setNotificationsEnabled}
                      trackColor={{ false: theme.outline, true: theme.primary }}
                      thumbColor={notificationsEnabled ? theme.onPrimary : theme.surface}
                      ios_backgroundColor={theme.outline}
                    />
                  }
                  iconColor={theme.info}
                />
              </ModernCard>
            </View>
            
            {/* Account Section */}
            <View style={styles.accountSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Account
              </Text>
              
              <ModernCard style={styles.accountCard}>
                <ModernListItem
                  icon="information"
                  title="About isThatu"
                  subtitle="Learn more about the app"
                  onPress={() => {}}
                  iconColor={theme.info}
                />
                
                <View style={styles.separator} />
                
                <ModernListItem
                  icon="shield-check"
                  title="Privacy Policy"
                  subtitle="How we protect your data"
                  onPress={() => {}}
                  iconColor={theme.success}
                />
                
                <View style={styles.separator} />
                
                <ModernListItem
                  icon="logout"
                  title="Logout"
                  subtitle="Sign out of your account"
                  onPress={handleLogout}
                  iconColor={theme.error}
                />
              </ModernCard>
            </View>
            
            {/* Save Message */}
            {saveMessage && (
              <Animated.View style={[styles.saveMessage, { opacity: fadeAnim }]}>
                <ModernCard style={[
                  styles.messageCard,
                  { 
                    backgroundColor: saveMessage.includes('success') ? theme.successContainer : theme.errorContainer
                  }
                ]}>
                  <MaterialCommunityIcons
                    name={saveMessage.includes('success') ? "check-circle" : "alert-circle"}
                    size={20}
                    color={saveMessage.includes('success') ? theme.success : theme.error}
                  />
                  <Text style={[
                    styles.messageText,
                    { 
                      color: saveMessage.includes('success') ? theme.success : theme.error
                    }
                  ]}>
                    {saveMessage}
                  </Text>
                </ModernCard>
              </Animated.View>
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
      
      {/* Emoji Selector Modal */}
      <EmojiSelector
        visible={showEmojiSelector}
        onSelectEmoji={handleEmojiSelect}
        onClose={() => setShowEmojiSelector(false)}
        selectedEmoji={selectedEmoji}
      />
    </View>
  );
}

// Add these missing style definitions
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(240,240,255,0.7)',
    // Remove any padding that might interfere with safe area insets
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: margin.sm,
    width: '100%',
  },
  saveButton: {
    marginLeft: margin.sm,
    minWidth: responsiveWidth(20),
    height: responsiveHeight(5.5),
  },
  saveMessage: {
    marginTop: margin.xs,
    fontSize: scaledFontSize(12),
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: responsiveWidth(5),
    paddingTop: responsiveHeight(3),
    paddingBottom: responsiveHeight(12),
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsiveHeight(2),
    marginTop: responsiveHeight(1),
  },
  title: {
    fontSize: scaledFontSize(28),
    fontWeight: 'bold',
  },
  profileCard: {
    marginBottom: responsiveHeight(3),
    width: '100%',
    maxWidth: responsiveWidth(95),
    alignSelf: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: responsiveHeight(3),
  },
  avatarContainer: {
    width: responsiveWidth(22),
    height: responsiveWidth(22),
    borderRadius: responsiveWidth(11),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: responsiveHeight(2),
  },
  avatarEmoji: {
    fontSize: scaledFontSize(44),
  },
  profileName: {
    fontSize: scaledFontSize(20),
    fontWeight: 'bold',
    marginBottom: responsiveHeight(0.5),
  },
  profileSubtitle: {
    fontSize: scaledFontSize(13),
    textAlign: 'center',
    opacity: 0.7,
  },
  nicknameSection: {
    marginBottom: responsiveHeight(3),
  },
  emojiSection: {
    marginBottom: responsiveHeight(2),
  },
  sectionTitle: {
    fontSize: scaledFontSize(16),
    fontWeight: '600',
    marginBottom: responsiveHeight(1),
  },
  emojiSelectorContainer: {
    marginTop: responsiveHeight(2),
  },
  settingsCard: {
    marginTop: responsiveHeight(2),
    marginBottom: responsiveHeight(2),
    width: '100%',
    maxWidth: responsiveWidth(98),
    alignSelf: 'center',
    backgroundColor: 'rgba(124,77,255,0.04)',
    borderRadius: radius.lg,
    paddingHorizontal: responsiveWidth(5),
    paddingVertical: responsiveHeight(2),
  },
  cardTitle: {
    fontSize: scaledFontSize(18),
    fontWeight: '600',
    marginBottom: responsiveHeight(1.2),
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: responsiveHeight(1.2),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: scaledFontSize(15),
    marginLeft: responsiveWidth(3),
    fontWeight: '500',
  },
  spacer: {
    height: responsiveHeight(1),
    width: '100%',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    marginTop: responsiveHeight(1),
  },
  aboutSection: {
    marginTop: responsiveHeight(2),
    alignItems: 'center',
  },
  aboutTitle: {
    fontSize: scaledFontSize(14),
    fontWeight: '600',
    marginBottom: responsiveHeight(0.5),
  },
  aboutText: {
    fontSize: scaledFontSize(12),
    textAlign: 'center',
    marginBottom: responsiveHeight(0.5),
  },
  aboutEmail: {
    fontSize: scaledFontSize(12),
    textAlign: 'center',
    marginTop: responsiveHeight(0.5),
  },
});