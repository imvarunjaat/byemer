import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { userService } from '@/lib/user-service';
import { getAuthRedirectUrl } from '@/lib/deep-linking';

// Define the user type
export interface User {
  id: string;
  username: string;
  email: string;
  preferred_emoji?: string;
}

// Define the auth state
export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  error: string | null;
  success: string | null;
  verificationPending: boolean;
  
  // Internal state tracking
  _lastEmailSentTimestamp: number; // Tracks when the last auth email was sent for rate limiting
  
  // Methods
  login: (email: string) => Promise<void>;
  signup: (username: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  clearSuccess: () => void;
  checkSession: () => Promise<void>;
  handleSession: (session?: any) => Promise<void>;
  updateSession: (updatedUser: User) => void;
  setUser: (user: User) => void;
}

// Supabase authentication implementation
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      error: null,
      success: null,
      verificationPending: false,
      _lastEmailSentTimestamp: 0,

      setUser: (user: User) => {
        set({ user });
      },

      checkSession: async () => {
        try {
          set({ isLoading: true });
          
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            await get().handleSession(session);
          } else {
            set({ 
              isLoading: false, 
              isAuthenticated: false,
              user: null
            });
          }
        } catch (error) {
          console.error('Error checking session:', error);
          set({ 
            isLoading: false, 
            isAuthenticated: false,
            user: null,
            error: 'Failed to check authentication status.'
          });
        }
      },

      // Rate limiting is handled via the _lastEmailSentTimestamp property defined in the state
      
      login: async (email: string) => {
        set({ isLoading: true, error: null, success: null });
        console.log('Attempting to login with email:', email);
        
        // Client-side rate limiting to prevent 429 errors
        const now = Date.now();
        const lastSent = get()._lastEmailSentTimestamp;
        const timeSinceLastSend = now - lastSent;
        const minimumInterval = 60 * 1000; // 60 seconds minimum between requests
        
        if (lastSent > 0 && timeSinceLastSend < minimumInterval) {
          const remainingSeconds = Math.ceil((minimumInterval - timeSinceLastSend) / 1000);
          console.log(`Rate limiting prevention: Need to wait ${remainingSeconds} more seconds`);
          
          set({
            isLoading: false,
            error: `Please wait ${remainingSeconds} seconds before requesting another login link.`,
            verificationPending: false
          });
          return;
        }
        
        // Get the exact URL to use for redirection
        const redirectUrl = getAuthRedirectUrl();
        console.log('Login redirect URL:', redirectUrl);
        
        try {
          // First check if connection to Supabase is working
          const { data: sessionData } = await supabase.auth.getSession();
          console.log('Current session state:', sessionData ? 'Has session data' : 'No session data');
          
          // Continue with login
          const { data, error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: redirectUrl,
              shouldCreateUser: true // Ensure user is created if doesn't exist
            }
          });
          
          console.log('OTP request sent to:', email, 'with redirect:', redirectUrl);
          
          // Update last sent timestamp if request was successful
          set({ _lastEmailSentTimestamp: Date.now() });
          
          console.log('SignInWithOTP response:', data ? 'Data received' : 'No data', error ? 'Error occurred' : 'No error');
          
          if (error) throw error;
          
          set({ 
            isLoading: false,
            success: "Magic link sent! Check your email to complete login.",
            verificationPending: true
          });
        } catch (error: any) {
          console.error('Login error:', error);
          // More detailed error logging
          if (error.message) console.error('Error message:', error.message);
          if (error.status) console.error('Error status:', error.status);
          
          // Handle rate limiting errors gracefully
          if (error.status === 429 || (error.message && error.message.includes('security purposes'))) {
            // Extract wait time if available
            const waitTimeMatch = error.message.match(/after (\d+) seconds/);
            const waitTime = waitTimeMatch ? parseInt(waitTimeMatch[1], 10) : 60;
            
            set({
              isLoading: false,
              error: `Please wait ${waitTime} seconds before requesting another login link.`,
              verificationPending: false
            });
            
            // Still update the timestamp to prevent further requests
            set({ _lastEmailSentTimestamp: Date.now() });
          } else {
            // Handle other errors
            set({ 
              isLoading: false, 
              error: error.message || 'Login failed. Please try again.'
            });
          }
        }
      },

      handleSession: async (session?: any) => {
        if (!session) {
          set({ 
            isLoading: false, 
            isAuthenticated: false,
            user: null
          });
          return;
        }
        
        try {
          // Get user data from session
          const { user: authUser } = session;
          
          if (!authUser) {
            throw new Error('No user in session');
          }
          
          // Get user profile from Supabase
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();
            
          if (profileError && profileError.code !== 'PGRST116') {
            // PGRST116 is "no rows returned" error, which we handle below
            console.error('Error fetching profile:', profileError);
          }
          
          // If profile exists, use it
          if (profile) {
            set({
              isLoading: false,
              isAuthenticated: true,
              user: {
                id: authUser.id,
                username: profile.username,
                email: authUser.email || '',
                preferred_emoji: profile.preferred_emoji
              }
            });
          } else {
            // If no profile, try to get username from user metadata
            const username = authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'Anonymous';
            
            // Create a profile if it doesn't exist
            try {
              const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .upsert({
                  id: authUser.id,
                  username
                })
                .select()
                .single();
                
              if (createError) {
                throw createError;
              }
              
              set({
                isLoading: false,
                isAuthenticated: true,
                user: {
                  id: authUser.id,
                  username,
                  email: authUser.email || '',
                  preferred_emoji: newProfile?.preferred_emoji
                }
              });
            } catch (createProfileError) {
              console.error('Error creating profile:', createProfileError);
              
              // Still authenticate the user even if profile creation fails
              set({
                isLoading: false,
                isAuthenticated: true,
                user: {
                  id: authUser.id,
                  username,
                  email: authUser.email || ''
                }
              });
            }
          }
        } catch (error) {
          console.error('Error handling session:', error);
          set({ 
            isLoading: false, 
            isAuthenticated: false,
            user: null,
            error: 'Failed to load user profile.'
          });
        }
      },

      signup: async (username: string, email: string) => {
        set({ isLoading: true, error: null, success: null });
        
        // Client-side rate limiting to prevent 429 errors
        const now = Date.now();
        const lastSent = get()._lastEmailSentTimestamp;
        const timeSinceLastSend = now - lastSent;
        const minimumInterval = 60 * 1000; // 60 seconds minimum between requests
        
        if (lastSent > 0 && timeSinceLastSend < minimumInterval) {
          const remainingSeconds = Math.ceil((minimumInterval - timeSinceLastSend) / 1000);
          console.log(`Rate limiting prevention: Need to wait ${remainingSeconds} more seconds`);
          
          set({
            isLoading: false,
            error: `Please wait ${remainingSeconds} seconds before requesting another verification email.`,
            verificationPending: false
          });
          return;
        }
        
        try {
          console.log('Starting signup process for:', email, username);
          
          // Get the exact URL to use for redirection (same one for consistency)
          const redirectUrl = getAuthRedirectUrl();
          console.log('Signup redirect URL:', redirectUrl);
          
          // Generate a strong random password (required by Supabase)
          const randomPassword = Math.random().toString(36).slice(-10) + 
                               Math.random().toString(36).toUpperCase().slice(-2) + 
                               Math.random().toString(21).slice(2, 7) + 
                               '!';  // Ensure it meets password requirements
          
          console.log('Attempting auth.signUp with emailRedirectTo');
          
          // Sign up the user with magic link (passwordless) flow
          const { data, error } = await supabase.auth.signUp({
            email,
            password: randomPassword,
            options: {
              data: {
                username  // Store username in user metadata
              },
              // Use our proper deep linking redirect URL for email verification
              emailRedirectTo: redirectUrl
            }
          });
          
          // Update last email sent timestamp to apply rate limiting
          set({ _lastEmailSentTimestamp: Date.now() });
          
          console.log('SignUp response:', 
                      'Data:', data ? 'Present' : 'Null', 
                      'User:', data?.user ? 'Present' : 'Null', 
                      'Session:', data?.session ? 'Present' : 'Null',
                      'Error:', error ? error.message : 'None');
          
          // Extra diagnostic logging for signup flow
          if (data?.user) {
            console.log('User created with ID:', data.user.id);
            console.log('Email confirmed?', data.user.email_confirmed_at ? 'Yes' : 'No');
            console.log('User metadata:', JSON.stringify(data.user.user_metadata));
          }
          
          if (error) throw error;
          
          if (data.user) {
            console.log('User created successfully with ID:', data.user.id);
            
            // Create profile in Supabase regardless of session state
            try {
              // Attempt to create profile using service role client with a simpler approach
              console.log('Creating profile for user ID:', data.user.id);
              
              let profileCreated = false;
              
              // Option 1: First try direct SQL insert via RPC
              try {
                const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
                  'create_user_profile', 
                  { 
                    user_id: data.user.id,
                    user_name: username
                  }
                );
                
                if (rpcError) {
                  console.log('RPC failed, falling back to normal insert:', rpcError);
                  throw rpcError; // Will trigger fallback
                } else {
                  console.log('Profile created successfully via RPC');
                  profileCreated = true;
                }
              } catch (rpcAttemptError) {
                // Fallback to regular insert if RPC doesn't exist
                console.log('Falling back to direct insert');
                
                // Option 2: Fall back to direct insert
                try {
                  // Try with minimal fields
                  const { data: profile, error: profileError } = await supabaseAdmin
                    .from('profiles')
                    .upsert({
                      id: data.user.id,
                      username: username
                    })
                    .select()
                    .single();
                    
                  if (profileError) {
                    console.error('Error creating profile with standard insert:', profileError);
                    throw profileError;
                  }
                  
                  console.log('Profile created successfully via direct insert');
                  profileCreated = true;
                } catch (directInsertError) {
                  console.error('Failed to create profile via direct insert:', directInsertError);
                  
                  // Last resort - create profile via userService
                  try {
                    console.log('Final attempt: Using userService.createUserProfile');
                    const userProfile = await userService.createUserProfile(data.user.id, username);
                    if (userProfile) {
                      console.log('Profile created via userService');
                      profileCreated = true;
                    }
                  } catch (userServiceError) {
                    console.error('All profile creation methods failed:', userServiceError);
                    // Don't throw, just continue to handle auth state
                  }
                }
              }
              
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
          let errorMsg = error.message || 'Signup failed. Please try again.';
          
          // Handle rate limiting errors gracefully
          if (error.status === 429 || 
              (errorMsg && errorMsg.toLowerCase().includes('security purposes'))) {
            // Extract wait time if available
            const waitTimeMatch = errorMsg.match(/after (\d+) seconds/);
            const waitTime = waitTimeMatch ? parseInt(waitTimeMatch[1], 10) : 60;
            
            console.log('Rate limiting error detected during signup');
            set({
              isLoading: false,
              error: `Please wait ${waitTime} seconds before requesting another verification email.`,
              verificationPending: false
            });
            
            // Update the timestamp to prevent further requests
            set({ _lastEmailSentTimestamp: Date.now() });
          }
          // Improve error message for email already exists
          else if (errorMsg.toLowerCase().includes('user already registered') || 
                   errorMsg.toLowerCase().includes('email already exists')) {
            errorMsg = 'An account with this email already exists. Please log in or use a different email.';
            set({ 
              isLoading: false, 
              error: errorMsg
            });
          }
          // Handle other errors
          else {
            set({ 
              isLoading: false, 
              error: errorMsg
            });
          }
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

      updateSession: (updatedUser: User) => {
        // Update the user object in the store
        set(state => ({
          user: {
            ...state.user,
            ...updatedUser
          }
        }));
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
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
);
