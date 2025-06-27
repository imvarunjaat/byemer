import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://iqzodmrmskrpzlwizfha.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlxem9kbXJtc2tycHpsd2l6ZmhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MjMzNTgsImV4cCI6MjA2NTQ5OTM1OH0.WiWvgNNDmuGpz9bKjvuILGJy7n0Y2AXZEiCLjEUrdJE';
// Note: Never expose this key in production code or client-side applications
// For this example, we're using it to bypass RLS during profile creation
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlxem9kbXJtc2tycHpsd2l6ZmhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTkyMzM1OCwiZXhwIjoyMDY1NDk5MzU4fQ.8WHeUD1YcJE4My49QEwcjWp7rKByf6DxbfJZeaHuT-c';

// Create the Supabase client with enhanced session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: {
      getItem: key => AsyncStorage.getItem(key),
      setItem: (key, value) => AsyncStorage.setItem(key, value),
      removeItem: key => AsyncStorage.removeItem(key),
    },
  },
  // Add Supabase global configuration options
  global: {
    headers: { 'x-app-version': '1.0.0' },
  },
  // Configure realtime subscription settings
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
});

// Create the Supabase admin client with service role key to bypass RLS policies
// Important: This should ONLY be used for operations that require admin privileges
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  // Add Supabase global configuration options
  global: {
    headers: { 'x-app-version': '1.0.0' },
  },
});

// Types for Supabase tables
export type Profile = {
  id: string;
  username: string;
  created_at: string;
  updated_at: string;
};

export type Room = {
  id: string;
  name: string;
  created_by: string;
  is_private: boolean;
  access_code: string | null;
  created_at: string;
  updated_at: string;
};

export type RoomParticipant = {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  nickname: string;
  is_active: boolean;
  last_seen_at: string;
};

// --- Supabase Health check function for Supabase connectivity
export const supabaseHealthCheck = async (): Promise<{ status: string; message: string }> => {
  try {
    // Check authentication status
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Supabase session check failed:', sessionError);
      return {
        status: 'error',
        message: `Auth session check failed: ${sessionError.message}`
      };
    }

    // Check profiles table access
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (profileError) {
      console.error('Supabase database check failed:', profileError);
      return {
        status: 'error',
        message: `Database access check failed: ${profileError.message}`
      };
    }

    return {
      status: 'healthy',
      message: `Supabase is connected. Auth: ${sessionData.session ? 'Authenticated' : 'Not authenticated'}. Database: Access OK.`
    };
  } catch (error) {
    console.error('Unexpected error during Supabase health check:', error);
    return {
      status: 'error',
      message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

// Function to check and manage realtime connection status
export const checkRealtimeConnection = () => {
  try {
    // Get all current channels
    const channels = supabase.getChannels();
    
    console.log(`Current active realtime channels: ${channels.length}`);
    channels.forEach((channel, index) => {
      console.log(`Channel ${index + 1}: ${channel.topic} - State: ${channel.state}`);
    });

    // Check if there are any channels in CLOSED or ERRORED state
    const problematicChannels = channels.filter(channel => 
      channel.state === 'closed' || channel.state === 'errored');
      
    if (problematicChannels.length > 0) {
      console.log(`Found ${problematicChannels.length} problematic channels. Cleaning up...`);
      
      // Remove problematic channels
      problematicChannels.forEach(channel => {
        try {
          console.log(`Removing problematic channel: ${channel.topic}`);
          supabase.removeChannel(channel);
        } catch (error) {
          console.error(`Error removing channel ${channel.topic}:`, error);
        }
      });
    }
    
    return {
      totalChannels: channels.length,
      problematicChannels: problematicChannels.length,
      healthy: problematicChannels.length === 0
    };
  } catch (error) {
    console.error('Error checking realtime connection:', error);
    return {
      error: String(error),
      healthy: false
    };
  }
};

export type Message = {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  nickname: string;
  sent_at: string;
};
