import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, Switch, Dimensions, Pressable } from 'react-native';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/store/theme-store';
import { colors } from '@/constants/colors';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';
import { InputField } from '@/components/InputField';
import { Button } from '../../components/Button';
import { EmojiSelector } from '@/components/EmojiSelector';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const { isDarkMode, toggleTheme } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  const router = useRouter();
  
  const [nickname, setNickname] = useState('Anonymous');
  const [selectedEmoji, setSelectedEmoji] = useState('🎭');
  const [showEmojiSelector, setShowEmojiSelector] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
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
              onPress={() => {}}
              variant="outline"
              icon={<Ionicons name="log-out" size={20} color={theme.accent} />}
              style={{ ...styles.logoutButton, marginTop: width * 0.04, marginBottom: width * 0.02 }}
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
    paddingHorizontal: width * 0.05,
    paddingTop: width * 0.05,
    paddingBottom: width * 0.12,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: width * 0.04,
    marginTop: width * 0.02,
  },
  title: {
    fontSize: Math.max(22, Math.min(32, width * 0.08)),
    fontWeight: 'bold',
  },
  profileCard: {
    marginBottom: width * 0.05,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: Math.max(56, Math.min(88, width * 0.22)),
    height: Math.max(56, Math.min(88, width * 0.22)),
    borderRadius: Math.max(28, Math.min(44, width * 0.11)),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: width * 0.04,
  },
  avatarEmoji: {
    fontSize: Math.max(28, Math.min(44, width * 0.11)),
  },
  profileName: {
    fontSize: Math.max(16, Math.min(24, width * 0.06)),
    fontWeight: 'bold',
    marginBottom: width * 0.01,
  },
  profileSubtitle: {
    fontSize: Math.max(11, Math.min(14, width * 0.035)),
    textAlign: 'center',
    opacity: 0.7,
  },
  nicknameSection: {
    marginBottom: width * 0.06,
  },
  emojiSection: {
    marginBottom: width * 0.04,
  },
  sectionTitle: {
    fontSize: Math.max(14, Math.min(18, width * 0.045)),
    fontWeight: '600',
    marginBottom: width * 0.025,
  },
  emojiSelectorContainer: {
    marginTop: width * 0.04,
  },
  settingsCard: {
    marginTop: width * 0.04,
    marginBottom: width * 0.05,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: 'rgba(124,77,255,0.04)',
    borderRadius: Math.max(16, Math.min(24, width * 0.06)),
    paddingHorizontal: width < 350 ? 10 : 18,
    paddingVertical: width < 350 ? 10 : 16,
  },
  cardTitle: {
    fontSize: Math.max(15, Math.min(20, width * 0.05)),
    fontWeight: '600',
    marginBottom: width * 0.03,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Math.max(8, Math.min(14, width * 0.03)),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: Math.max(13, Math.min(16, width * 0.04)),
    marginLeft: width * 0.025,
  },
  logoutButton: {
    marginTop: width * 0.025,
  },
});