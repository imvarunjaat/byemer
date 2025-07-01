import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';

interface UseTermsAcceptanceResult {
  showTermsModal: boolean;
  hasAcceptedTerms: boolean;
  termsVersion: string;
  isLoading: boolean;
  handleAcceptTerms: () => Promise<void>;
  handleDeclineTerms: () => void;
  resetTermsState: () => void;
}

export function useTermsAcceptance(): UseTermsAcceptanceResult {
  const { user, logout } = useAuthStore();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [termsVersion, setTermsVersion] = useState('1.0');
  const [isLoading, setIsLoading] = useState(true);

  // Check if the user has already accepted the terms
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    async function checkTermsAcceptance() {
      setIsLoading(true);
      try {
        if (!user || !user.id) {
          setShowTermsModal(false);
          setIsLoading(false);
          return;
        }
        
        // Use maybeSingle() instead of single() to avoid errors when no record exists
        const { data, error } = await supabase
          .from('user_consent')
          .select('terms_accepted, privacy_accepted, version')
          .eq('user_id', user.id)
          .maybeSingle();

        // With maybeSingle(), error should only occur for actual errors, not missing records
        if (error) {
          console.error('Error checking terms acceptance:', error);
          // Show terms modal as fallback for any error
          setShowTermsModal(true);
          setHasAcceptedTerms(false);
        } else if (data) {
          // We have a record, check if terms are accepted and version matches
          const termsAccepted = data.terms_accepted && data.privacy_accepted;
          const currentVersion = termsVersion;
          
          // Show the modal again if terms version has changed or not accepted
          if (!termsAccepted || data.version !== currentVersion) {
            setShowTermsModal(true);
            setHasAcceptedTerms(false);
          } else {
            setShowTermsModal(false);
            setHasAcceptedTerms(true);
          }
        } else {
          // No consent record found (data is null with maybeSingle)
          console.log('No terms consent record found, showing terms modal');
          setShowTermsModal(true);
          setHasAcceptedTerms(false);
        }
      } catch (err) {
        console.error('Failed to check terms acceptance:', err);
        // Default to showing terms
        setShowTermsModal(true);
        setHasAcceptedTerms(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkTermsAcceptance();
  }, [user]);

  const handleAcceptTerms = async () => {
    if (!user || !user.id) return;
    
    try {
      setIsLoading(true);
      
      // Record the user's consent in the database
      const { error } = await supabase
        .from('user_consent')
        .upsert({
          user_id: user.id,
          terms_accepted: true,
          privacy_accepted: true,
          accepted_at: new Date().toISOString(),
          version: termsVersion
        });
        
      if (error) {
        console.error('Error saving consent:', error);
        throw error;
      }
      
      setHasAcceptedTerms(true);
      setShowTermsModal(false);
    } catch (err) {
      console.error('Failed to save consent:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineTerms = () => {
    // User declined the terms, log them out
    logout();
    setShowTermsModal(false);
  };

  const resetTermsState = () => {
    setShowTermsModal(false);
    setHasAcceptedTerms(false);
    setIsLoading(false);
  };

  return {
    showTermsModal,
    hasAcceptedTerms,
    termsVersion,
    isLoading,
    handleAcceptTerms,
    handleDeclineTerms,
    resetTermsState,
  };
}
