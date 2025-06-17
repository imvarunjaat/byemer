import { supabase, supabaseAdmin } from './supabase';

export interface Profile {
  id: string;
  username: string;
  created_at?: string;
  updated_at?: string;
  // Add any other fields that might be in your profiles table
}

// User profile service functions
export const userService = {
  /**
   * Creates a user profile after signup
   * This function should be called after successful authentication
   */
  createUserProfile: async (userId: string, username: string): Promise<Profile | null> => {
    try {
      console.log('Creating profile for user:', userId, 'with username:', username);
      
      // First check if profile already exists to avoid duplicate inserts
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, username, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();
      
      // If profile exists, just return it
      if (existingProfile) {
        console.log('Profile already exists, skipping creation');
        return existingProfile;
      }
      
      // Use supabaseAdmin to bypass RLS when creating the profile
      // This ensures that the profile can be created regardless of RLS policies
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          username
        })
        .select('id, username, created_at, updated_at')
        .single();

      if (error) {
        // If we get a duplicate key error, the profile already exists (race condition)
        if (error.code === '23505') {
          console.log('Profile already exists (duplicate key), ignoring');
          const { data: retryData } = await supabase
            .from('profiles')
            .select('id, username, created_at, updated_at')
            .eq('id', userId)
            .single();
          return retryData;
        }
        
        console.error('Error creating user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception in createUserProfile:', error);
      return null;
    }
  },

  /**
   * Gets a user profile by user ID
   */
  getUserProfile: async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error getting user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception in getUserProfile:', error);
      return null;
    }
  },

  /**
   * Checks if a username is available
   */
  isUsernameAvailable: async (username: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // Error code PGRST116 means no rows returned, so username is available
        return true;
      }
      
      // If we got data, username exists
      return !data;
    } catch (error) {
      console.error('Error checking username availability:', error);
      // Default to username not available on error to be safe
      return false;
    }
  },
};
