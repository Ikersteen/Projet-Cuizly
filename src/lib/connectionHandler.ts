// Connection handler for robust Supabase operations
import { supabase } from '@/integrations/supabase/client';

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  onRetry?: (attempt: number, error: any) => void;
}

export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const { maxRetries = 3, baseDelay = 1000, onRetry } = options;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;
      
      if (isLastAttempt) {
        throw error;
      }
      
      onRetry?.(attempt + 1, error);
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Retry failed unexpectedly');
};

export const checkConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    return !error;
  } catch (error) {
    console.warn('Connection check failed:', error);
    return false;
  }
};

export const refreshSession = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Session refresh failed:', error);
      return false;
    }
    
    return !!data.session;
  } catch (error) {
    console.error('Session refresh error:', error);
    return false;
  }
};

export const ensureValidSession = async (): Promise<boolean> => {
  try {
    // First check current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session check error:', error);
      return false;
    }
    
    if (!session) {
      console.warn('No session found');
      return false;
    }
    
    // Check if session is expired
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at < now) {
      console.log('Session expired, attempting refresh...');
      return await refreshSession();
    }
    
    return true;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
};