import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useThemeStore } from "@/store/theme-store";
import { useAuthStore } from "@/store/auth-store";
import { configureDeepLinking } from "@/lib/deep-linking";
import { ErrorInterceptor } from "@/components/ErrorBoundary";

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
      
      // Initialize deep linking for authentication - must happen early in the app lifecycle
      console.log('Configuring deep linking handlers...');
      configureDeepLinking();
      
      // Reset any stale verification states but keep user session
      const { clearSuccess, clearError, checkSession } = useAuthStore.getState();
      clearSuccess();
      clearError();
      
      // Check for existing session on app startup
      console.log('Checking for existing auth session...');
      checkSession();
    }
  }, [loaded]);

  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!loaded) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'signup' || segments[0] === 'otp-login' || segments[0] === 'auth';

    if (isAuthenticated && !user && !inAuthGroup) {
      // User is authenticated but profile not loaded, and not in auth flow, redirect to login to ensure profile is fetched
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      // User is authenticated and in auth flow, redirect to home
      router.replace('/');
    } else if (!isAuthenticated && !inAuthGroup) {
      // User is not authenticated and not in auth flow, redirect to login
      router.replace('/login');
    }
  }, [isAuthenticated, user, loaded, segments, router]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const { isDarkMode } = useThemeStore();
  
  return (
    <>
      <ErrorInterceptor />
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
    </>
  );
}