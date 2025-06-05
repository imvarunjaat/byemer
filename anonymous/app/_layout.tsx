import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useThemeStore } from "@/store/theme-store";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Load fonts with a default font to prevent errors
  const [loaded, error] = useFonts({
    // You can add custom fonts here if needed
    // 'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) {
      console.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const { isDarkMode } = useThemeStore();
  
  return (
    <>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <Stack
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
      </Stack>
    </>
  );
}