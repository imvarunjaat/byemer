import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

// This is a mock implementation. In a real app, you would connect to a backend API
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Simulate API call delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Mock validation
          if (email === 'test@example.com' && password === 'password') {
            set({ 
              isAuthenticated: true, 
              user: { 
                id: '1', 
                username: 'TestUser', 
                email: 'test@example.com' 
              },
              isLoading: false
            });
          } else {
            set({ 
              isLoading: false, 
              error: 'Invalid email or password' 
            });
          }
        } catch (error) {
          set({ 
            isLoading: false, 
            error: 'Login failed. Please try again.' 
          });
        }
      },

      signup: async (username: string, email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Simulate API call delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Mock validation - in a real app, you would validate and create a user in your backend
          if (email && password && username) {
            set({ 
              isAuthenticated: true, 
              user: { 
                id: Math.random().toString(36).substring(2, 9), 
                username, 
                email 
              },
              isLoading: false
            });
          } else {
            set({ 
              isLoading: false, 
              error: 'Please fill all required fields' 
            });
          }
        } catch (error) {
          set({ 
            isLoading: false, 
            error: 'Signup failed. Please try again.' 
          });
        }
      },

      logout: () => {
        set({ 
          isAuthenticated: false, 
          user: null 
        });
      },

      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
