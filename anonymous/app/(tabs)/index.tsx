import React from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, ColorValue, TouchableOpacity } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFValue } from 'react-native-responsive-fontsize';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useThemeStore } from '@/store/theme-store';
import { useAuthStore } from '@/store/auth-store';
import { colors } from '@/constants/colors';
import { GlassmorphicCard } from '@/components/GlassmorphicCard';
import { Button } from '../../components/Button';
import { ThemeToggle } from '@/components/themeToggle';

export default function HomeScreen() {
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const { isAuthenticated, user, logout } = useAuthStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  
  const handleCreateRoom = () => {
    router.push('/create-room');
  };
  
  const handleJoinRoom = () => {
    router.push('/join-room');
  };
  
  const handleLogin = () => {
    router.push('/login');
  };
  
  const handleSignup = () => {
    router.push('/signup');
  };
  
  const handleLogout = () => {
    logout();
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
  recentSection: {
    marginBottom: hp('2.5%'),
  },
  sectionTitle: {
    fontSize: RFValue(20),
    fontWeight: '600',
    marginBottom: hp('2%'),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp('5%'),
  },
  emptyStateText: {
    fontSize: RFValue(16),
    marginTop: hp('1.5%'),
  },
});