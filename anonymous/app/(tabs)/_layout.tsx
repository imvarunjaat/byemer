import React, { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useThemeStore } from "@/store/theme-store";
import { colors } from "@/constants/colors";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from "@/store/auth-store";
import { useTermsAcceptance } from "@/hooks/useTermsAcceptance";
import TermsAcceptanceModal from "@/components/TermsAcceptanceModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  const insets = useSafeAreaInsets(); // Get safe area insets

  // Use the shared hook for terms acceptance
  const { 
    showTermsModal, 
    isLoading, 
    handleAcceptTerms, 
    handleDeclineTerms 
  } = useTermsAcceptance();
  
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }
  
  // Only render the modal when needed - the hook will handle all the logic
  if (showTermsModal) {
    return (
      <TermsAcceptanceModal
        visible={showTermsModal}
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
          height: 60 + insets.bottom, // Add bottom inset to tab bar height
          paddingBottom: 8 + insets.bottom, // Add bottom inset to padding
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