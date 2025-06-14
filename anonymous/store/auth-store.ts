import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { userService } from '@/lib/user-service';
import { getAuthRedirectUrl } from '@/lib/deep-linking';
import { Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';

// Set up Supabase auth state change listener
supabase.auth.onAuthStateChange((event, session) => {
  console.log(`Supabase auth event: ${event}`, session ? `User: ${session.user.email}` : 'No session');
  
  // Update our auth store when Supabase auth state changes
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    if (session) {
      // Get the auth store and update it
      const { handleSession } = useAuthStore.getState();
      handleSession(session);
    }
  } else if (event === 'SIGNED_OUT') {
    // Clear auth state when user signs out
    const { logout } = useAuthStore.getState();
    logout();
  }
});

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  error: string | null;
  success: string | null;
  verificationPending: boolean;
  login: (email: string) => Promise<void>;
  signup: (username: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  clearSuccess: () => void;
  checkSession: () => Promise<void>;
  handleSession: (session?: Session | null) => Promise<void>;
}

// Supabase authentication implementation
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
      success: null,
      verificationPending: false,
      
      // Set user manually (needed for OTP flow)
      setUser: (user: User) => {
        set({ user, isAuthenticated: true, error: null });
      },

      checkSession: async () => {
        set({ isLoading: true });
        try {
          console.log('Checking for existing session...');
          // Check for existing session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Session check error:', error);
            set({ isLoading: false, isAuthenticated: false });
            return;
          }
          
          console.log('Session check result:', session ? `User: ${session.user.email}` : 'No session');
          
          if (session?.user) {
            // Fetch user profile from profiles table
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', session.user.id)
              .single();
              
            if (profileError) throw profileError;
            
            set({ 
              isAuthenticated: true, 
              user: { 
                id: session.user.id,
                email: session.user.email!,
                username: profile?.username || session.user.email!.split('@')[0] 
              },
              isLoading: false
            });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Session check error:', error);
          set({ isLoading: false });
        }
      },

      login: async (email: string) => {
        set({ isLoading: true, error: null, success: null });
        
        try {
          // Send magic link to the provided email
          const { data, error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: getAuthRedirectUrl()
            }
          });
          
          if (error) throw error;
          
          // Since this is a passwordless flow, we won't have a user object yet
          // Just indicate the email was sent successfully
          set({ 
            isLoading: false,
            success: `Verification email sent to ${email}. Please check your inbox.`,
            verificationPending: true
          });
        } catch (error: any) {
          console.error('Login error:', error);
          set({ 
            isLoading: false, 
            error: error.message || 'Failed to send verification email. Please try again.' 
          });
        }
      },

      handleSession: async (session?: any) => {
        set({ isLoading: true, error: null, verificationPending: false });
        
        try {
          // Use provided session or get current session
          let sessionData: any = session;
          
          if (!sessionData) {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            sessionData = data?.session;
          }
          
          // Log the session for debugging
          console.log('handleSession called with valid session:', sessionData ? 'yes' : 'no');
          
          if (sessionData) {
            const user = sessionData.user;
            // User is logged in, get their profile
            let username = ''; // Default empty username
            
            // Try to fetch user profile from database
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', user.id)
              .single();
              
            // If profile doesn't exist, create it now that we're authenticated
            if (profileError && profileError.code === 'PGRST116') {
              // Profile not found, create it
              // Get username from user metadata if available
              const metadata = user.user_metadata;
              if (metadata && metadata.username) {
                username = metadata.username;
              }
              
              try {
                // Use our dedicated userService to create the profile
                await userService.createUserProfile(user.id, username);
                console.log('User profile created successfully');
              } catch (profileError) {
                console.error('Failed to create user profile:', profileError);
                // Continue anyway - the user is authenticated
              }
            } else if (profileError) {
              // Some other error occurred
              console.error('Error fetching profile:', profileError);
              // Continue anyway, as the user is authenticated
            } else if (profile) {
              username = profile.username;
            }
            
            set({ 
              isAuthenticated: true, 
              user: { 
                id: user.id,
                email: user.email!,
                username
              },
              isLoading: false
            });
          }
        } catch (error: any) {
          console.error('Login error:', error);
          set({ 
            isLoading: false, 
            error: error.message || 'Login failed. Please try again.' 
          });
        }
      },

      signup: async (username: string, email: string) => {
        set({ isLoading: true, error: null, success: null });
        
        try {
          console.log('Starting signup process for:', email, username);
          
          // Sign up the user with magic link (passwordless) flow
          const { data, error } = await supabase.auth.signUp({
            email,
            // Required by Supabase even though we won't use it for passwordless auth
            password: Math.random().toString(36).slice(-10) + Math.random().toString(36).toUpperCase().slice(-2),
            options: {
              data: {
                username  // Store username in user metadata
              },
              // Use our proper deep linking redirect URL for email verification
              emailRedirectTo: getAuthRedirectUrl()
            }
          });
          
          if (error) throw error;
          
          if (data.user) {
            console.log('User created successfully with ID:', data.user.id);
            
            // Create profile in Supabase regardless of session state
            try {
              // Force profile creation at signup time
              console.log('Creating user profile for:', data.user.id, username);
              const profile = await supabase
                .from('profiles')
                .upsert({
                  id: data.user.id,
                  username: username,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select()
                .maybeSingle();
                
              console.log('Profile creation result:', profile.data ? 'Success' : 'Failed', profile.error || '');
              
              // If session exists, user is automatically logged in (development mode)
              if (data.session) {
                console.log('Auto-login: User has active session');
                
                set({
                  isLoading: false,
                  isAuthenticated: true,
                  user: { id: data.user.id, username, email },
                  success: null,  // No success message needed since we're logged in
                  verificationPending: false
                });
              } else {
                // No session but user created - email verification is required
                set({
                  isLoading: false,
                  isAuthenticated: false, 
                  user: null,
                  success: "Verification email sent! Please check your inbox and click the link to verify your account.",
                  verificationPending: true
                });
              }
            } catch (profileError) {
              console.error('Error creating profile:', profileError);
              
              // Even if profile creation fails, we still want to handle auth state
              if (data.session) {
                set({
                  isLoading: false,
                  isAuthenticated: true,
                  user: { id: data.user.id, username, email }
                });
              } else {
                set({
                  isLoading: false,
                  isAuthenticated: false,
                  user: null,
                  success: "Verification email sent, but we couldn't create your profile. This will be fixed when you verify your email.",
                  verificationPending: true
                });
              }
            }
          }
        } catch (error: any) {
          console.error("Signup error:", error);
          set({ 
            isLoading: false, 
            error: error.message || 'Signup failed. Please try again.' 
          });
        }
      },

      logout: async () => {
        try {
          await supabase.auth.signOut();
        } catch (error) {
          console.error('Error signing out:', error);
        } finally {
          set({ 
            isAuthenticated: false, 
            user: null 
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      clearSuccess: () => {
        set({ success: null });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist these fields
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        // Explicitly exclude temporary states
      }),
      onRehydrateStorage: () => (state) => {
        // Log when rehydration happens
        console.log('Auth store rehydrated:', 
          state ? `User: ${state.user?.username || 'no username'}` : 'no state');
        
        // Always verify session with Supabase when rehydrating from storage
        setTimeout(() => {
          useAuthStore.getState().checkSession();
        }, 500);
      },
    }
  )
);
