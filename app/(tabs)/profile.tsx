import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, Switch, Pressable, Alert, Linking } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFValue } from 'react-native-responsive-fontsize';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/store/theme-store';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/constants/colors';
import { userService } from '@/lib/user-service';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';
import { InputField } from '@/components/InputField';
import { Button } from '../../components/Button';
import { EmojiSelector } from '@/components/EmojiSelector';
import { useRouter } from 'expo-router';



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
    let timer: ReturnType<typeof setTimeout>;
    if (saveMessage) {
      timer = setTimeout(() => {
        setSaveMessage('');
      }, 3000);
    }
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, flex: 1 }]}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, minHeight: '100%', ...styles.content }}
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
              style={{ ...styles.logoutButton, marginTop: hp('1%'), marginBottom: hp('1%') }}
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
    </SafeAreaView>
  );
}

// Add these missing style definitions
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(240,240,255,0.7)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    width: '100%',
  },
  saveButton: {
    marginLeft: 10,
    minWidth: 80,
    height: 45,
  },
  saveMessage: {
    marginTop: 5,
    fontSize: RFValue(12),
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: wp('5%'),
    paddingTop: hp('3%'),
    paddingBottom: hp('12%'),
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp('2%'),
    marginTop: hp('1%'),
  },
  title: {
    fontSize: RFValue(28),
    fontWeight: 'bold',
  },
  profileCard: {
    marginBottom: hp('3%'),
    width: '100%',
    maxWidth: wp('95%'),
    alignSelf: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: hp('3%'),
  },
  avatarContainer: {
    width: wp('22%'),
    height: wp('22%'),
    borderRadius: wp('11%'),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp('2%'),
  },
  avatarEmoji: {
    fontSize: RFValue(44),
  },
  profileName: {
    fontSize: RFValue(20),
    fontWeight: 'bold',
    marginBottom: hp('0.5%'),
  },
  profileSubtitle: {
    fontSize: RFValue(13),
    textAlign: 'center',
    opacity: 0.7,
  },
  nicknameSection: {
    marginBottom: hp('3%'),
  },
  emojiSection: {
    marginBottom: hp('2%'),
  },
  sectionTitle: {
    fontSize: RFValue(16),
    fontWeight: '600',
    marginBottom: hp('1%'),
  },
  emojiSelectorContainer: {
    marginTop: hp('2%'),
  },
  settingsCard: {
    marginTop: hp('2%'),
    marginBottom: hp('2%'),
    width: '100%',
    maxWidth: wp('98%'),
    alignSelf: 'center',
    backgroundColor: 'rgba(124,77,255,0.04)',
    borderRadius: wp('6%'),
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('2%'),
  },
  cardTitle: {
    fontSize: RFValue(18),
    fontWeight: '600',
    marginBottom: hp('1.2%'),
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp('1.2%'),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: RFValue(15),
    marginLeft: wp('2%'),
  },
  logoutButton: {
    marginTop: hp('1%'),
  },
  aboutSection: {
    marginTop: hp('5%'),
    marginBottom: hp('1%'),
    alignItems: 'center',
    paddingHorizontal: wp('2%'),
    paddingTop: hp('2%'),
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  spacer: {
    height: hp('1%'),
    width: '100%',
  },
  aboutTitle: {
    fontSize: RFValue(16),
    fontWeight: '600',
    marginBottom: hp('1%'),
  },
  aboutText: {
    fontSize: RFValue(14),
    textAlign: 'center',
    marginBottom: hp('3%'),
  },
  aboutEmail: {
    fontSize: RFValue(13),
    textAlign: 'center',
  },
});