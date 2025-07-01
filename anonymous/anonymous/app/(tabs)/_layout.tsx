import React from "react";
import { Tabs } from "expo-router";
import { useThemeStore } from "@/store/theme-store";
import { colors } from "@/constants/colors";
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabLayout() {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? colors.dark : colors.light;
  
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