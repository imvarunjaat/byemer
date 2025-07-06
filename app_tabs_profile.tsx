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
            Alert.alert(
              'Log out',
              'Are you sure you want to log out?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log out', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } }
              ]
            );
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
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, minHeight: '100%', ...styles.content, paddingBottom: responsiveHeight(10) }}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Profile</Text>
        </View>
        
        <GlassmorphicCard style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatarContainer, { backgroundColor: isDarkMode ? 'rgba(187, 134, 252, 0.2)' : 'rgba(124, 77, 255, 0.1)' }]}>
              <Text style={styles.avatarEmoji}>{selectedEmoji}</Text>
            </View>
            <Text style={[styles.profileName, { color: theme.text }]}>
              {nickname}
            </Text>
            <Text style={[styles.profileSubtitle, { color: theme.secondaryText }]}>
              Your identity is hidden from others
            </Text>
          </View>
          
          <View style={styles.nicknameSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Your Nickname
            </Text>
            <View style={styles.inputRow}>
              <InputField
                value={nickname}
                onChangeText={setNickname}
                placeholder="Enter a nickname"
                maxLength={20}
                leftIcon={<MaterialCommunityIcons name="account" size={20} color={theme.secondaryText} />}
                containerStyle={{ flex: 1 }}
              />
              <Button
                title="Save"
                onPress={handleSaveProfile}
                style={styles.saveButton}
                disabled={!hasProfileChanged() || isSaving}
                loading={isSaving}
              />
            </View>
            {saveMessage ? (
              <Text style={[
                styles.saveMessage, 
                { color: saveMessage.includes('success') ? '#4CAF50' : saveMessage.includes('No changes') ? theme.secondaryText : '#F44336' }
              ]}>
                {saveMessage}
              </Text>
            ) : null}
          </View>
          
          <View style={styles.emojiSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Your Emoji
            </Text>
            <Button
              title={`Change Emoji ${selectedEmoji}`}
              onPress={() => setShowEmojiSelector(!showEmojiSelector)}
              variant="outline"
            />
            
            {showEmojiSelector && (
              <View style={styles.emojiSelectorContainer}>
                <EmojiSelector
                  onSelect={handleEmojiSelect}
                  selectedEmoji={selectedEmoji}
                />
              </View>
            )}
          </View>
          
          {/* Settings menu moved here for better UX */}
          <GlassmorphicCard style={styles.settingsCard}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Settings</Text>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="moon" size={20} color={theme.accent} />
                <Text style={[styles.settingText, { color: theme.text }]}>Dark Mode</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: '#767577', true: theme.accent }}
                thumbColor={isDarkMode ? theme.secondaryAccent : '#f4f3f4'}
              />
            </View>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="notifications" size={20} color={theme.accent} />
                <Text style={[styles.settingText, { color: theme.text }]}>Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#767577', true: theme.accent }}
                thumbColor={notificationsEnabled ? theme.secondaryAccent : '#f4f3f4'}
              />
            </View>
            <Pressable 
              style={styles.settingItem} 
              onPress={() => Linking.openURL('https://imvarunjaat.github.io/privacy-policy/')}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="shield" size={20} color={theme.accent} />
                <Text style={[styles.settingText, { color: theme.text }]}>Privacy Policy</Text>
              </View>
              <Feather name="chevron-right" size={18} color={theme.secondaryText} />
            </Pressable>
            
            <View style={styles.spacer} />
            <View style={styles.spacer} />
            
            <Button
              title="Log Out"
              onPress={handleLogout}
              variant="outline"
              icon={<Ionicons name="log-out" size={20} color={theme.accent} />}
              style={{ ...styles.logoutButton, marginTop: responsiveHeight(1), marginBottom: responsiveHeight(1) }}
            />
            
            <View style={styles.spacer} />
            <View style={styles.spacer} />
            <View style={styles.spacer} />
            
            {/* About This App section */}
            <View style={styles.aboutSection}>
              <Text style={[styles.aboutTitle, { color: theme.text }]}>About This App</Text>
              <Text style={[styles.aboutText, { color: theme.secondaryText }]}>
                Built with <Text style={{ color: theme.accent }}>❤️</Text> by:- Varun Chaudhary
              </Text>
              <Text 
                style={[styles.aboutEmail, { color: '#007AFF' }]}
                onPress={() => Linking.openURL('mailto:contact.isThatu@gmail.com')}
              >
                contact.isThatu@gmail.com
              </Text>
            </View>
          </GlassmorphicCard>

        </GlassmorphicCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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