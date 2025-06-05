import React from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, ColorValue } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useThemeStore } from '@/store/theme-store';
import { colors } from '@/constants/colors';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';
import { Button } from '../../components/Button';
import { ThemeToggle } from '@/components/themeToggle';

export default function HomeScreen() {
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  
  const handleCreateRoom = () => {
    router.push('/create-room');
  };
  
  const handleJoinRoom = () => {
    router.push('/join-room');
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
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
          <ThemeToggle />
        </View>
        
        <ScrollView 
          contentContainerStyle={styles.content}
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
          
          <View style={styles.recentSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Recent Rooms
            </Text>
            
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
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heroSection: {
    marginBottom: 30,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  actionCard: {
    width: '48%',
    height: 180,
  },
  actionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  actionDescription: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  recentSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 12,
  },
});