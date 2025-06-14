import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, Switch, Pressable, Alert } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFValue } from 'react-native-responsive-fontsize';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/store/theme-store';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/constants/colors';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';
import { InputField } from '@/components/InputField';
import { Button } from '../../components/Button';
import { EmojiSelector } from '@/components/EmojiSelector';
import { useRouter } from 'expo-router';



export default function ProfileScreen() {
  const { isDarkMode, toggleTheme } = useThemeStore();
  const { logout, user } = useAuthStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  const router = useRouter();
  
  const [nickname, setNickname] = useState(user?.username || 'Anonymous');
  const [selectedEmoji, setSelectedEmoji] = useState('🎭');
  const [showEmojiSelector, setShowEmojiSelector] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: () => {
            logout();
            router.replace('/');
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
            <InputField
              value={nickname}
              onChangeText={setNickname}
              placeholder="Enter a nickname"
              maxLength={20}
              leftIcon={<MaterialCommunityIcons name="account" size={20} color={theme.secondaryText} />}
            />
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
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="shield" size={20} color={theme.accent} />
                <Text style={[styles.settingText, { color: theme.text }]}>Privacy Policy</Text>
              </View>
            </View>
            <Button
              title="Log Out"
              onPress={handleLogout}
              variant="outline"
              icon={<Ionicons name="log-out" size={20} color={theme.accent} />}
              style={{ ...styles.logoutButton, marginTop: hp('2%'), marginBottom: hp('1%') }}
            />
          </GlassmorphicCard>
        </GlassmorphicCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(240,240,255,0.7)',
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
    marginBottom: hp('3%'),
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
});