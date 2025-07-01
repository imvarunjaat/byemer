import { useState, useCallback } from 'react';

/**
 * Custom hook to manage loading states for async operations
 * 
 * @returns {Object} Loading state and helper functions
 */
export const useLoading = (initialState = false) => {
  const [isLoading, setIsLoading] = useState<boolean>(initialState);
  const [loadingText, setLoadingText] = useState<string>('Loading...');

  /**
   * Show loading indicator with optional custom text
   */
  const showLoading = useCallback((text?: string) => {
    if (text) setLoadingText(text);
    setIsLoading(true);
  }, []);

  /**
   * Hide loading indicator
   */
  const hideLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  /**
   * Execute an async function while showing loading indicator
   * 
   * @param asyncFn - Async function to execute
   * @param options - Options for loading behavior
   * @returns The result of the async function
   */
  const withLoading = useCallback(async <T,>(
    asyncFn: () => Promise<T>,
    options: {
      loadingText?: string;
      suppressErrors?: boolean;
      onError?: (error: any) => void;
    } = {}
  ): Promise<T | null> => {
    const { loadingText, suppressErrors = false, onError } = options;
    
    try {
      if (loadingText) setLoadingText(loadingText);
      setIsLoading(true);
      
      const result = await asyncFn();
      return result;
    } catch (error) {
      if (!suppressErrors) {
        console.error('Error in withLoading:', error);
      }
      
      if (onError) {
        onError(error);
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    loadingText,
    showLoading,
    hideLoading,
    withLoading
  };
};
