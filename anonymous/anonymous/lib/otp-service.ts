import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Nullable } from '@/types/utils';

export interface RequestOtpResponse {
  success: boolean;
  message?: string;
  error?: any;
}

export interface VerifyOtpResponse {
  success: boolean;
  message?: string;
  error?: any;
  session?: Session | null;
  user?: User | null;
}

export interface OtpVerificationResponse {
  message?: string;
  error?: string | null;
  user?: any;
  session?: any;
}

export const otpService = {
  /**
   * Request OTP code via email
   */
  async requestOtp(email: string): Promise<RequestOtpResponse> {
    try {
      console.log(`Requesting OTP for ${email}`);
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          // Note: By leaving out emailRedirectTo, Supabase will send an OTP code
          // instead of a magic link by default
        }
      });

      if (error) {
        console.error('Error requesting OTP:', error);
        return {
          success: false,
          message: error.message || 'Failed to send OTP',
          error
        };
      }

      return {
        success: true,
        message: 'OTP sent successfully'
      };
    } catch (error: any) {
      console.error('Exception in requestOtp:', error);
      return {
        success: false,
        message: error?.message || 'An unexpected error occurred',
        error
      };
    }
  },

  /**
   * Verify OTP code
   */
  async verifyOtp(email: string, token: string): Promise<VerifyOtpResponse> {
    try {
      console.log(`Verifying OTP for ${email}`);
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email'
      });

      if (error) {
        console.error('Error verifying OTP:', error);
        return {
          success: false,
          message: error.message || 'Failed to verify OTP',
          error
        };
      }

      return {
        success: true,
        message: 'OTP verified successfully',
        session: data.session,
        user: data.user
      };
    } catch (error: any) {
      console.error('Exception in verifyOtp:', error);
      return {
        success: false,
        message: error?.message || 'An unexpected error occurred',
        error
      };
    }
  },

  /**
   * Complete the authentication by setting the session
   */
  completeAuthentication: async (session: any): Promise<OtpVerificationResponse> => {
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (error) {
        throw error;
      }

      return {
        user: data.user,
        error: null,
      };
    } catch (error: any) {
      console.error('Error setting session:', error);
      return {
        user: null,
        error: error.message || 'Failed to complete authentication',
      };
    }
  },
};
