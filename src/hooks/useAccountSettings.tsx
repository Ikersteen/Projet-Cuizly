import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

// Validation schemas
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const emailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email must be less than 255 characters');

const phoneSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');

export const useAccountSettings = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isChangingPhone, setIsChangingPhone] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Validate password strength
  const validatePassword = (password: string): { isValid: boolean; error?: string } => {
    try {
      passwordSchema.parse(password);
      return { isValid: true };
    } catch (error: any) {
      return { 
        isValid: false, 
        error: error.errors?.[0]?.message || 'Invalid password' 
      };
    }
  };

  // Validate email format
  const validateEmail = (email: string): { isValid: boolean; error?: string } => {
    try {
      emailSchema.parse(email);
      return { isValid: true };
    } catch (error: any) {
      return { 
        isValid: false, 
        error: error.errors?.[0]?.message || 'Invalid email' 
      };
    }
  };

  // Validate phone format
  const validatePhone = (phone: string): { isValid: boolean; error?: string } => {
    try {
      phoneSchema.parse(phone);
      return { isValid: true };
    } catch (error: any) {
      return { 
        isValid: false, 
        error: error.errors?.[0]?.message || 'Invalid phone number' 
      };
    }
  };

  // Change password
  const handlePasswordChange = async (
    currentPassword: string, 
    newPassword: string, 
    confirmPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsChangingPassword(true);

    try {
      // Validate passwords match
      if (newPassword !== confirmPassword) {
        throw new Error(t('profile.passwordsDoNotMatch') || 'Passwords do not match');
      }

      // Validate new password strength
      const validation = validatePassword(newPassword);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Update password in Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: t('profile.passwordChangeSuccess') || 'Password changed successfully',
        description: t('profile.passwordChangeSuccessDesc') || 'Your password has been updated.',
      });

      return { success: true };
    } catch (error: any) {
      console.error('Password change error:', error);
      toast({
        title: t('profile.passwordChangeError') || 'Error changing password',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Change email (requires verification)
  const handleEmailChange = async (newEmail: string): Promise<{ success: boolean; error?: string }> => {
    setIsChangingEmail(true);

    try {
      // Validate email
      const validation = validateEmail(newEmail);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Update email in Supabase Auth (will send verification email)
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      toast({
        title: t('profile.emailChangeRequested') || 'Email change requested',
        description: t('profile.emailChangeRequestedDesc') || 'Please check your new email to confirm the change.',
      });

      return { success: true };
    } catch (error: any) {
      console.error('Email change error:', error);
      toast({
        title: t('profile.emailChangeError') || 'Error changing email',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setIsChangingEmail(false);
    }
  };

  // Send phone verification code
  const sendPhoneVerification = async (phoneNumber: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Validate phone
      const validation = validatePhone(phoneNumber);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Call edge function to send SMS
      const { data, error } = await supabase.functions.invoke('send-sms-verification', {
        body: { phone: phoneNumber }
      });

      if (error) throw error;

      if (data?.sessionToken) {
        setSessionToken(data.sessionToken);
        setVerificationSent(true);
        
        toast({
          title: t('profile.verificationCodeSent') || 'Verification code sent',
          description: t('profile.verificationCodeSentDesc') || 'Please check your phone for the code.',
        });

        return { success: true };
      }

      throw new Error('No session token received');
    } catch (error: any) {
      console.error('Phone verification error:', error);
      toast({
        title: t('profile.phoneVerificationError') || 'Error sending verification',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  // Verify phone code and update
  const verifyPhoneCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    setIsChangingPhone(true);

    try {
      if (!sessionToken) {
        throw new Error('No session token available');
      }

      // Verify the code via edge function
      const { data, error } = await supabase.functions.invoke('verify-sms-code', {
        body: { 
          sessionToken,
          code 
        }
      });

      if (error) throw error;

      if (!data?.verified) {
        throw new Error(t('profile.invalidVerificationCode') || 'Invalid verification code');
      }

      // Update phone in auth.users
      const { error: updateError } = await supabase.auth.updateUser({
        phone: data.phoneNumber
      });

      if (updateError) throw updateError;

      // Update phone in profiles table
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ phone: data.phoneNumber })
          .eq('user_id', user.id);

        if (profileError) throw profileError;
      }

      setVerificationSent(false);
      setSessionToken(null);

      toast({
        title: t('profile.phoneChangeSuccess') || 'Phone number updated',
        description: t('profile.phoneChangeSuccessDesc') || 'Your phone number has been verified and updated.',
      });

      return { success: true };
    } catch (error: any) {
      console.error('Phone verification error:', error);
      toast({
        title: t('profile.phoneVerificationError') || 'Verification failed',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setIsChangingPhone(false);
    }
  };

  return {
    handlePasswordChange,
    handleEmailChange,
    sendPhoneVerification,
    verifyPhoneCode,
    validatePassword,
    validateEmail,
    validatePhone,
    isChangingPassword,
    isChangingEmail,
    isChangingPhone,
    verificationSent,
  };
};
