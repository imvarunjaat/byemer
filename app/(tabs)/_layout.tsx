import React, { useEffect, useState } from "react";
import { Tabs, router } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useThemeStore } from "@/store/theme-store";
import { colors } from "@/constants/colors";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from "@/store/auth-store";
import { supabase } from "@/lib/supabase";
import TermsAcceptanceModal from "@/components/TermsAcceptanceModal";

export default function TabLayout() {
  const { user, logout } = useAuthStore();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6C63FF" />
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
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.secondaryText,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: theme.background,
          shadowColor: 'transparent',
          borderBottomWidth: 0,
        },
        headerTitleStyle: {
          color: theme.text,
          fontWeight: '600',
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-outline" size={size} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-outline" size={size} color={color} />,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}