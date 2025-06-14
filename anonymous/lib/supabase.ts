import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://iqzodmrmskrpzlwizfha.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlxem9kbXJtc2tycHpsd2l6ZmhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MjMzNTgsImV4cCI6MjA2NTQ5OTM1OH0.WiWvgNNDmuGpz9bKjvuILGJy7n0Y2AXZEiCLjEUrdJE';

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

export type Message = {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  nickname: string;
  sent_at: string;
};
