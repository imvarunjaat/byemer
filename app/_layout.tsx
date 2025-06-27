import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments, SplashScreen } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { useThemeStore } from "@/store/theme-store";
import { useAuthStore } from "@/store/auth-store";
import AuthProvider from "@/components/AuthProvider";
import { View, Text } from "react-native";

// Tell the system to use (tabs) as our initialRouteName and home page
export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// Prevent the expo splash screen from auto-hiding before asset loading is complete.
ExpoSplashScreen.preventAutoHideAsync();

// Main layout component that handles splash screen and initial loading
export default function RootLayout() {
  // State to track initialization
  const [isReady, setIsReady] = useState(false);
  
  // Load fonts with a default font to prevent errors
  const [loaded, error] = useFonts({
    // You can add custom fonts here if needed
    // 'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Handle any errors loading fonts
  useEffect(() => {
    if (error) console.error('Font loading error:', error);
  }, [error]);

  // Prepare the app when resources are loaded
  useEffect(() => {
    if (loaded) {
      // Hide the expo splash screen
      ExpoSplashScreen.hideAsync().catch(console.error);
      
      // Mark the app as ready after a brief delay to ensure all components are mounted
      setTimeout(() => {
        setIsReady(true);
      }, 200);
    }
  }, [loaded]);

  // Show a blank screen until everything is ready
  if (!loaded || !isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }} />
    );
  }

  // Once everything is ready, render the main layout
  return <RootLayoutNav />;
}

// Navigation component with proper auth wrapping
function RootLayoutNav() {
  const { isDarkMode } = useThemeStore();
  const { isAuthenticated } = useAuthStore();
  
  // Force expo-router to use the correct initial route
  useEffect(() => {
    // This ensures the app defaults to the tabs route and prevents GO_BACK errors
    SplashScreen.preventAutoHideAsync();
    
    // Small delay to let the router fully initialize
    setTimeout(() => {
      SplashScreen.hideAsync();
    }, 100);
  }, []);
  
  return (
    <AuthProvider>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <Stack
        initialRouteName="(tabs)"
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="room/[id]" 
          options={{ 
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="create-room" 
          options={{ 
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_bottom',
          }} 
        />
        <Stack.Screen 
          name="join-room" 
          options={{ 
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_bottom',
          }} 
        />
        <Stack.Screen 
          name="login" 
          options={{ 
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_bottom',
          }} 
        />
        <Stack.Screen 
          name="signup" 
          options={{ 
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_bottom',
          }} 
        />
        <Stack.Screen 
          name="auth/callback" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
          }} 
        />
        <Stack.Screen 
          name="auth/confirm" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
          }} 
        />
        <Stack.Screen 
          name="auth-error" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
          }} 
        />
        <Stack.Screen 
          name="otp-login" 
          options={{ 
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_bottom',
          }} 
        />
      </Stack>
    </AuthProvider>
  );
}