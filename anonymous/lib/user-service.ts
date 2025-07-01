import { supabase } from './supabase';
import { logger } from '../config';

export interface Profile {
  id: string;
  username: string;
  created_at?: string;
  updated_at?: string;
  preferred_emoji?: string;
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
      
      // SECURITY IMPROVEMENT: No longer using supabaseAdmin to bypass RLS
      // Instead, we now rely on proper RLS policies in Supabase that allow users
      // to create their own profile once authenticated
      // 
      // Your Supabase RLS should have a policy like:
      // CREATE POLICY "Users can create their own profile" 
      // ON public.profiles FOR INSERT 
      // WITH CHECK (auth.uid() = id);
      
      const { data, error } = await supabase
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
        .select('id, username, created_at, updated_at, preferred_emoji')
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
   * Updates a user profile with new information
   */
  updateUserProfile: async (userId: string, updates: { username?: string, preferred_emoji?: string }): Promise<Profile | null> => {
    try {
      // Only update fields that we know exist
      const updateData: any = {};
      if (updates.username !== undefined) updateData.username = updates.username;
      
      // Store emoji separately - we'll handle it in memory only if column doesn't exist
      const preferredEmoji = updates.preferred_emoji;
      let emojiSaved = false;
      
      // Try to update profile data with just the username first
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select('id, username, created_at, updated_at')
        .single();

      if (error) {
        console.error('Error updating user profile:', error);
        return null;
      }
      
      // If emoji update was requested, try to update it separately
      if (preferredEmoji !== undefined) {
        try {
          // Try to add emoji column if it doesn't exist (silent fail is ok)
          try {
            const alterTableQuery = `
              ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_emoji TEXT DEFAULT '🎭';
            `;
            await supabase.rpc('execute_sql', { query: alterTableQuery }).single();
          } catch (columnError) {
            console.log('Note: Could not add preferred_emoji column automatically');
          }
          
          // Now try to update just the emoji
          const { error: emojiError } = await supabase
            .from('profiles')
            .update({ preferred_emoji: preferredEmoji })
            .eq('id', userId);
            
          if (!emojiError) {
            emojiSaved = true;
          }
        } catch (emojiError) {
          console.log('Could not save emoji to database, will use in-memory only:', emojiError);
        }
      }

      // Return the data with emoji added (either from DB or memory)
      return preferredEmoji !== undefined 
        ? { ...data, preferred_emoji: preferredEmoji } 
        : data;
    } catch (error) {
      console.error('Exception in updateUserProfile:', error);
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
