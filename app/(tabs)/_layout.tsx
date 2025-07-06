import React, { useEffect, useState } from "react";
import { Tabs, router } from "expo-router";
import { View, ActivityIndicator, Platform } from "react-native";
import { useThemeStore } from "@/store/theme-store";
import { colors } from "@/constants/colors";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from "@/store/auth-store";
import { supabase } from "@/lib/supabase";
import TermsAcceptanceModal from "@/components/TermsAcceptanceModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from 'expo-blur';

export default function TabLayout() {
  const { user, logout } = useAuthStore();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  const insets = useSafeAreaInsets();

  // Check terms acceptance
  useEffect(() => {
    async function checkTerms() {
      if (!user || !user.id) {
        setIsLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('user_consent')
          .select('terms_accepted, privacy_accepted')
          .eq('user_id', user.id)
          .maybeSingle();
        
        console.log('Terms check result:', { data, error });
        
        if (error) {
          console.error('Error checking terms:', error);
          setShowTermsModal(true);
        } else if (!data || !data.terms_accepted || !data.privacy_accepted) {
          console.log('Terms not accepted, showing modal');
          setShowTermsModal(true);
        }
      } catch (err) {
        console.error('Terms check failed:', err);
        setShowTermsModal(true);
      } finally {
        setIsLoading(false);
      }
    }
    
    checkTerms();
  }, [user]);
  
  const handleAcceptTerms = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('user_consent')
        .upsert({
          user_id: user.id,
          terms_accepted: true,
          privacy_accepted: true,
          accepted_at: new Date().toISOString(),
          version: '1.0'
        });
      
      if (error) {
        console.error('Failed to save terms acceptance:', error);
      }
      
      setShowTermsModal(false);
    } catch (err) {
      console.error('Terms acceptance error:', err);
    }
  };
  
  const handleDeclineTerms = () => {
    logout();
  };
  
  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: theme.background
      }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (showTermsModal) {
    return (
      <TermsAcceptanceModal
        visible={true}
        onAccept={handleAcceptTerms}
        onDecline={handleDeclineTerms}
      />
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarStyle: {
          backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 8,
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          height: 80 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
          paddingHorizontal: 16,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: -4,
          marginBottom: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: theme.background,
          shadowColor: 'transparent',
          borderBottomWidth: 0,
          elevation: 0,
        },
        headerTitleStyle: {
          color: theme.text,
          fontWeight: '700',
          fontSize: 20,
        },
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 4,
          paddingVertical: 4,
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={100}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
              }}
            />
          ) : null
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              backgroundColor: focused ? theme.primaryContainer : 'transparent',
              borderRadius: 12,
              padding: 8,
              marginTop: 2,
            }}>
              <MaterialCommunityIcons 
                name={focused ? "home" : "home-outline"} 
                size={size} 
                color={focused ? theme.onPrimaryContainer : color} 
              />
            </View>
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              backgroundColor: focused ? theme.primaryContainer : 'transparent',
              borderRadius: 12,
              padding: 8,
              marginTop: 2,
            }}>
              <MaterialCommunityIcons 
                name={focused ? "account" : "account-outline"} 
                size={size} 
                color={focused ? theme.onPrimaryContainer : color} 
              />
            </View>
          ),
          headerShown: false,
        }}
      />
    </Tabs>
  );
}