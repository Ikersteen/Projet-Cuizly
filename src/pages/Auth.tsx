import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Mail, Lock, User, Building, Eye, EyeOff, MessageCircle, Loader2 } from "lucide-react";
import { PhoneInput } from "@/components/PhoneInput";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { validatePassword, validateEmail, validateTextInput, INPUT_LIMITS } from "@/lib/validation";
import { isRateLimited } from "@/lib/security";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';
import { useDataPersistence } from "@/hooks/useDataPersistence";
import { useGoogleAuthMobile } from '@/hooks/useGoogleAuthMobile';
import { Capacitor } from '@capacitor/core';
import { getLocalizedRoute } from '@/lib/routeTranslations';
import { generateUserUrl } from '@/lib/urlUtils';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<'consumer' | 'restaurant_owner'>('consumer');
  const [hcaptchaToken, setHcaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('signin');
  
  // SMS verification states pour inscription
  const [smsVerificationStep, setSmsVerificationStep] = useState<'phone' | 'code' | 'completed'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsSessionToken, setSmsSessionToken] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  
  // SMS verification states pour connexion
  const [signinSmsVerificationStep, setSigninSmsVerificationStep] = useState<'phone' | 'code' | 'completed'>('phone');
  const [signinPhoneNumber, setSigninPhoneNumber] = useState('');
  const [signinSmsSessionToken, setSigninSmsSessionToken] = useState<string | null>(null);
  const [signinVerificationCode, setSigninVerificationCode] = useState('');
  const [signinSmsLoading, setSigninSmsLoading] = useState(false);
  const [signinSmsError, setSigninSmsError] = useState<string | null>(null);
  const [signinPhoneVerified, setSigninPhoneVerified] = useState(false);

  // Load saved phone numbers on component mount
  useEffect(() => {
    const savedPhoneNumber = localStorage.getItem('cuizly_saved_phone');
    if (savedPhoneNumber) {
      setPhoneNumber(savedPhoneNumber);
      setSigninPhoneNumber(savedPhoneNumber);
    }
  }, []);
  
  const hcaptchaRef = useRef<HCaptcha>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sendWelcomeEmail } = useEmailNotifications();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { restoreDataAfterAuth } = useDataPersistence();

  // Check URL parameters to set user type and active tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    const tabParam = urlParams.get('tab');
    
    if (typeParam === 'restaurant') {
      setUserType('restaurant_owner');
    }
    
    if (tabParam === 'signup') {
      setActiveTab('signup');
    }
  }, []);

  useEffect(() => {
    console.log("🔵 [Auth Effect] Initializing auth state listener");
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔵 [Auth State Change] Event:", event);
        console.log("🔵 [Auth State Change] Session present:", !!session);
        
        if (session?.user) {
          console.log("🔵 [Auth State Change] User ID:", session.user.id);
          console.log("🔵 [Auth State Change] Email:", session.user.email);
          console.log("🔵 [Auth State Change] Provider:", session.user.app_metadata?.provider);
          console.log("🔵 [Auth State Change] User metadata:", session.user.user_metadata);
          console.log("🔵 [Auth State Change] Email confirmed:", !!session.user.email_confirmed_at);
        }
        
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          console.log("🟢 [Auth State Change] User connected, checking profile...");
          
          try {
            // Check if user has profile, create if needed
            const { data: profile, error: profileError } = await supabase
              .from('waitlist')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle();

            console.log("🔵 [Auth State Change] Profile exists:", !!profile);
            
            if (profileError && profileError.code !== 'PGRST116') {
              console.error("🔴 [Auth State Change] Error fetching profile:", profileError);
            }

            // Si pas de profil, le créer automatiquement
            if (!profile) {
              console.log("🔵 [Auth State Change] Creating user profile...");
              
              // Si les métadonnées sont présentes, les utiliser
              if (session.user.user_metadata && Object.keys(session.user.user_metadata).length > 0) {
                await createUserProfile(session.user);
              } else {
                // Sinon, créer un profil basique pour utilisateur OAuth
                const { error: createError } = await supabase.from('waitlist').insert({
                  user_id: session.user.id,
                  first_name: session.user.user_metadata?.full_name?.split(' ')[0] || 
                             session.user.user_metadata?.name?.split(' ')[0] || '',
                  last_name: session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || 
                            session.user.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
                  user_type: 'consumer' // Par défaut pour OAuth
                });

                if (createError) {
                  console.error("🔴 [Auth State Change] Error creating basic profile:", createError);
                }
              }
            }

            console.log("🟢 [Auth State Change] Preparing personalized redirect...");
            
            // Restore temporary data after successful authentication
            setTimeout(() => {
              restoreDataAfterAuth();
            }, 500);
            
            // Get personalized dashboard URL
            const dashboardRoute = getLocalizedRoute('/dashboard', currentLanguage as 'fr' | 'en');
            
            // Fetch profile to generate personalized URL
            const { data: userProfile } = await supabase
              .from('waitlist')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            if (userProfile) {
              // Import generateUserUrl dynamically to avoid circular dependencies
              const { generateUserUrl } = await import('@/lib/urlUtils');
              
              // Get restaurant data if user is restaurant owner
              let restaurant = null;
              if (userProfile.user_type === 'restaurant_owner') {
                const { data: restaurantData } = await supabase
                  .from('restaurants')
                  .select('*')
                  .eq('owner_id', session.user.id)
                  .maybeSingle();
                restaurant = restaurantData;
              }
              
              const personalizedUrl = generateUserUrl(
                userProfile.user_type,
                userProfile,
                restaurant,
                currentLanguage
              );
              
              console.log("🟢 [Auth State Change] Redirecting to:", personalizedUrl);
              navigate(personalizedUrl);
            } else {
              navigate(dashboardRoute);
            }
          } catch (error) {
            console.error("🔴 [Auth State Change] Error handling connection:", error);
            // Même en cas d'erreur, rediriger vers le dashboard
            const dashboardRoute = getLocalizedRoute('/dashboard', currentLanguage as 'fr' | 'en');
            navigate(dashboardRoute);
          }
        }
      }
    );

    // Check for existing session
    const checkAuth = async () => {
      console.log("🔵 [Auth Effect] Checking existing session");
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("🔴 [Auth Effect] Error checking session:", error);
          return;
        }
        
        console.log("🔵 [Auth Effect] Existing session:", !!session);
        
        if (session) {
          console.log("🟢 [Auth Effect] Session found, preparing redirect");
          
          // Restore temporary data
          setTimeout(() => {
            restoreDataAfterAuth();
          }, 500);
          
          const dashboardRoute = getLocalizedRoute('/dashboard', currentLanguage as 'fr' | 'en');
          navigate(dashboardRoute);
        }
      } catch (error) {
        console.error("🔴 [Auth Effect] Error in checkAuth:", error);
      }
    };
    
    checkAuth();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Rate limiting check
    const clientIP = 'signup'; // Use a general key for client-side rate limiting
    if (isRateLimited(clientIP, 5, 900000)) { // 5 attempts per 15 minutes
      toast({
        title: t('auth.errors.tooManyAttempts'),
        description: t('auth.errors.pleaseWait'),
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const restaurantName = userType === 'restaurant_owner' ? formData.get('restaurantName') as string : '';

    // Enhanced validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      toast({
        title: t('auth.errors.invalidEmail'),
        description: emailValidation.error,
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      toast({
        title: t('auth.errors.weakPassword'),
        description: passwordValidation.error,
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    const nameValidation = validateTextInput(fullName, INPUT_LIMITS.NAME, 'Nom complet');
    if (!nameValidation.isValid) {
      toast({
        title: t('auth.errors.invalidName'),
        description: nameValidation.error,
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    if (userType === 'restaurant_owner' && restaurantName) {
      const restaurantNameValidation = validateTextInput(restaurantName, INPUT_LIMITS.NAME, 'Nom du restaurant');
      if (!restaurantNameValidation.isValid) {
        toast({
          title: t('auth.errors.invalidRestaurantName'),
          description: restaurantNameValidation.error,
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
    }

    // Vérification hCaptcha
    if (!hcaptchaToken) {
      toast({
        title: t('auth.errors.verificationRequired'),
        description: t('auth.errors.completeCaptcha'),
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/courriel-confirme`,
          captchaToken: hcaptchaToken,
          data: {
            full_name: nameValidation.sanitized,
            user_type: userType,
            restaurant_name: userType === 'restaurant_owner' ? validateTextInput(restaurantName, INPUT_LIMITS.NAME).sanitized : null,
            phone_number: phoneVerified ? phoneNumber : null
          }
        }
      });

      if (error) throw error;

      // If user is created and confirmed, create profile
      if (data.user && !data.user.email_confirmed_at) {
        // Send custom confirmation email via our edge function
        try {
          const { data: confirmationData, error: confirmationError } = await supabase.functions.invoke('send-confirmation-email', {
            body: {
              email: data.user.email!,
              confirmationUrl: `${window.location.origin}/dashboard?token_hash=${data.session?.access_token}&type=signup`,
              userName: nameValidation.sanitized,
              userType: userType,
            },
          });

          if (confirmationError) {
            console.error('Error sending confirmation email:', confirmationError);
          }
        } catch (error) {
          console.error('Error invoking confirmation email function:', error);
        }

        toast({
          title: t('auth.success.accountCreated'),
          description: t('auth.success.checkEmailConfirmation'),
        });
      } else if (data.user) {
        // User is auto-confirmed, create profile and redirect
        await createUserProfile(data.user);
        
        // Send welcome email
        await sendWelcomeEmail({
          email: data.user.email!,
          userName: nameValidation.sanitized,
          userType: userType,
        });
        
        // Generate personalized dashboard URL
        const { data: profileData } = await supabase
          .from('waitlist')
          .select('*')
          .eq('user_id', data.user.id)
          .maybeSingle();
        
        let restaurantData = null;
        if (userType === 'restaurant_owner') {
          const { data: restaurant } = await supabase
            .from('restaurants')
            .select('*')
            .eq('owner_id', data.user.id)
            .single();
          restaurantData = restaurant;
        }
        
        const personalizedUrl = generateUserUrl(
          userType,
          profileData,
          restaurantData,
          currentLanguage as 'fr' | 'en'
        );
        
        navigate(personalizedUrl);
      }
    } catch (error: any) {
      let errorMessage = t('auth.errors.genericError');
      
      if (error.message?.includes("User already registered")) {
        errorMessage = t('auth.errors.userAlreadyRegistered');
      } else if (error.message?.includes("Invalid email")) {
        errorMessage = t('auth.errors.invalidEmail');
      } else if (error.message?.includes("Password should be at least")) {
        errorMessage = t('auth.errors.passwordMinLength');
      }

      toast({
        title: t('auth.errors.signupError'),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      // Reset hCaptcha
      setHcaptchaToken(null);
      setCaptchaError(null);
      hcaptchaRef.current?.resetCaptcha();
    }
  };

  const createUserProfile = async (user: any) => {
    try {
      const { error } = await supabase.from('waitlist').insert({
        user_id: user.id,
        first_name: user.user_metadata.full_name?.split(' ')[0] || '',
        last_name: user.user_metadata.full_name?.split(' ').slice(1).join(' ') || '',
        user_type: user.user_metadata.user_type || 'consumer',
        restaurant_name: user.user_metadata.restaurant_name || null,
        phone: user.user_metadata.phone_number || null
      });

      if (error) {
        console.error('Error creating profile:', error);
        return;
      }

      // Si c'est un propriétaire de restaurant, créer automatiquement le restaurant
      if (user.user_metadata.user_type === 'restaurant_owner' && user.user_metadata.restaurant_name) {
        const { error: restaurantError } = await supabase.from('restaurants').insert({
          name: user.user_metadata.restaurant_name,
          owner_id: user.id,
          description: `Bienvenue chez ${user.user_metadata.restaurant_name}`,
          is_active: true
        });

        if (restaurantError) {
          console.error('Error creating restaurant:', restaurantError);
        }
      }
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Rate limiting check
    const clientIP = 'signin'; // Use a general key for client-side rate limiting
    if (isRateLimited(clientIP, 5, 900000)) { // 5 attempts per 15 minutes
      toast({
        title: t('auth.errors.tooManyAttempts'),
        description: t('auth.errors.pleaseWait'),
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Enhanced validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      toast({
        title: t('auth.errors.invalidEmail'),
        description: emailValidation.error,
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    // Vérification hCaptcha pour la connexion aussi
    if (!hcaptchaToken) {
      toast({
        title: t('auth.errors.verificationRequired'),
        description: t('auth.errors.completeCaptcha'),
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          captchaToken: hcaptchaToken
        }
      });

      if (error) throw error;

      // La redirection sera gérée automatiquement par onAuthStateChange
      // qui créera l'URL personnalisée appropriée
    } catch (error: any) {
      let errorMessage = t('auth.errors.incorrectCredentials');
      
      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = t('auth.errors.emailOrPasswordIncorrect');
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = t('auth.errors.emailNotConfirmed');
      } else if (error.message?.includes("Too many requests")) {
        errorMessage = t('auth.errors.tooManyRequests');
      }

      toast({
        title: t('auth.errors.signinError'), 
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      // Reset hCaptcha
      setHcaptchaToken(null);
      setCaptchaError(null);
      hcaptchaRef.current?.resetCaptcha();
    }
  };

  const { signInWithGoogle: signInWithGoogleMobile } = useGoogleAuthMobile();
  
  const handleGoogleAuth = async () => {
    console.log("🔵 [Google Auth] Starting Google connection");
    
    try {
      setIsLoading(true);
      
      // Sur mobile, utiliser le plugin Capacitor
      if (Capacitor.isNativePlatform()) {
        console.log("🔵 [Google Auth] Using Capacitor plugin for native platform");
        const { data, error } = await signInWithGoogleMobile();
        
        if (error) {
          throw error;
        }
        
        console.log("🟢 [Google Auth] Mobile authentication successful");
        
        // Créer ou mettre à jour le profil utilisateur
        if (data?.user) {
          // Ajouter le user_type aux métadonnées si nécessaire
          if (!data.user.user_metadata?.user_type) {
            const { error: updateError } = await supabase.auth.updateUser({
              data: { user_type: userType }
            });
            if (updateError) {
              console.error("🔴 [Google Auth] Error updating user metadata:", updateError);
            }
          }
          await createUserProfile(data.user);
        }
        
        // La redirection sera gérée automatiquement par onAuthStateChange
        // qui créera l'URL personnalisée appropriée
        return;
      }
      
      // Sur web, utiliser la méthode OAuth classique
      console.log("🔵 [Google Auth] Using web OAuth flow");
      const redirectUrl = `${window.location.origin}/dashboard`;
      console.log("🔵 [Google Auth] Configured redirect URL:", redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) {
        console.error("🔴 [Google Auth] OAuth error:", error);
        throw error;
      }
      
      console.log("🟢 [Google Auth] OAuth initiated successfully");
      
    } catch (error: any) {
      console.error("🔴 [Google Auth] Error in handleGoogleAuth:", error);
      
      let errorMessage = "Unable to connect with Google";
      
      if (error.message?.includes("provider is not enabled")) {
        errorMessage = "Google OAuth is not configured for this application";
      } else if (error.message?.includes("invalid_request")) {
        errorMessage = t('auth.errors.oauthConfigInvalid');
      } else if (error.message?.includes("redirect_uri")) {
        errorMessage = t('auth.errors.redirectUriUnauthorized');
      }

      toast({
        title: t('auth.errors.oauthError'),
        description: `${errorMessage} - ${t('auth.errors.checkConsole')}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // SMS verification functions
  const sendSMSVerification = async () => {
    setSmsLoading(true);
    setSmsError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-sms-verification', {
        body: {
          phone: phoneNumber,
          language: currentLanguage
        }
      });

      if (error) throw error;

      setSmsSessionToken(data.sessionToken);
      setSmsVerificationStep('code');
      
      toast({
        title: t('auth.smsVerification.smsSent'),
        description: t('auth.smsVerification.checkPhoneForCode'),
      });
    } catch (error: any) {
      setSmsError(error.message || t('auth.smsVerification.cannotSendSms'));
      toast({
        title: t('auth.smsVerification.smsError'),
        description: error.message || t('auth.smsVerification.cannotSendSms'),
        variant: "destructive"
      });
    } finally {
      setSmsLoading(false);
    }
  };

  const verifySMSCode = async () => {
    setSmsLoading(true);
    setSmsError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-sms-code', {
        body: {
          sessionToken: smsSessionToken,
          code: verificationCode
        }
      });

      if (error) throw error;

      if (data.verified) {
        setPhoneVerified(true);
        setSmsVerificationStep('completed');
        
        // Save phone number for future use
        localStorage.setItem('cuizly_saved_phone', phoneNumber);
        
        toast({
          title: t('auth.smsVerification.phoneVerified'),
          description: t('auth.smsVerification.phoneVerifiedSuccess'),
        });
      }
    } catch (error: any) {
      setSmsError(error.message || t('auth.smsVerification.incorrectCode'));
      toast({
        title: t('auth.smsVerification.verificationError'),
        description: error.message || t('auth.smsVerification.incorrectCode'),
        variant: "destructive"
      });
    } finally {
      setSmsLoading(false);
    }
  };

  const resetSMSVerification = () => {
    setSmsVerificationStep('phone');
    setPhoneNumber('');
    setSmsSessionToken(null);
    setVerificationCode('');
    setSmsError(null);
    setPhoneVerified(false);
  };

  // SMS verification functions pour la connexion
  const sendSigninSMSVerification = async () => {
    setSigninSmsLoading(true);
    setSigninSmsError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-sms-verification', {
        body: {
          phone: signinPhoneNumber,
          language: currentLanguage
        }
      });

      if (error) throw error;

      setSigninSmsSessionToken(data.sessionToken);
      setSigninSmsVerificationStep('code');
      
      toast({
        title: t('auth.smsVerification.smsSent'),
        description: t('auth.smsVerification.checkPhoneForCode'),
      });
    } catch (error: any) {
      setSigninSmsError(error.message || t('auth.smsVerification.cannotSendSms'));
      toast({
        title: t('auth.smsVerification.smsError'),
        description: error.message || t('auth.smsVerification.cannotSendSms'),
        variant: "destructive"
      });
    } finally {
      setSigninSmsLoading(false);
    }
  };

  const verifySigninSMSCode = async () => {
    setSigninSmsLoading(true);
    setSigninSmsError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-sms-code', {
        body: {
          sessionToken: signinSmsSessionToken,
          code: signinVerificationCode
        }
      });

      if (error) throw error;

      if (data.verified) {
        setSigninPhoneVerified(true);
        setSigninSmsVerificationStep('completed');
        
        // Save phone number for future use
        localStorage.setItem('cuizly_saved_phone', signinPhoneNumber);
        
        toast({
          title: t('auth.smsVerification.phoneVerified'),
          description: t('auth.smsVerification.phoneVerifiedSuccess'),
        });
      }
    } catch (error: any) {
      setSigninSmsError(error.message || t('auth.smsVerification.incorrectCode'));
      toast({
        title: t('auth.smsVerification.verificationError'),
        description: error.message || t('auth.smsVerification.incorrectCode'),
        variant: "destructive"
      });
    } finally {
      setSigninSmsLoading(false);
    }
  };

  const resetSigninSMSVerification = () => {
    setSigninSmsVerificationStep('phone');
    setSigninPhoneNumber('');
    setSigninSmsSessionToken(null);
    setSigninVerificationCode('');
    setSigninSmsError(null);
    setSigninPhoneVerified(false);
  };


  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to home */}
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-cuizly-neutral hover:text-foreground text-sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('navigation.back_home')}
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/lovable-uploads/3c5c1704-3a2b-4c77-8039-43aae95c34f9.png" 
              alt="Cuizly Logo" 
              className="h-16 object-contain dark:filter dark:invert dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('auth.title')}</h1>
          <p className="text-cuizly-neutral text-lg">
            {t('auth.subtitle')}
          </p>
        </div>

        <Card className="shadow-card border border-border">
          <CardContent className="p-8 flex items-center justify-center">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-sm">
              <TabsList className="grid w-full grid-cols-2 mb-8 h-12 rounded-lg p-1">
                 <TabsTrigger 
                   value="signin" 
                   className="text-sm font-medium rounded-md" 
                   translate="no"
                   onSelect={() => {
                     setHcaptchaToken(null);
                     setCaptchaError(null);
                     setShowSignInPassword(false);
                     setShowSignUpPassword(false);
                     // Reset SMS states pour connexion
                     resetSigninSMSVerification();
                     hcaptchaRef.current?.resetCaptcha();
                   }}
                 >
                  {t('auth.tabs.signin')}
                </TabsTrigger>
                 <TabsTrigger 
                   value="signup" 
                   className="text-sm font-medium rounded-md" 
                   translate="no"
                   onSelect={() => {
                     setHcaptchaToken(null);
                     setCaptchaError(null);
                     setShowSignInPassword(false);
                     setShowSignUpPassword(false);
                     // Reset SMS states pour inscription
                     resetSMSVerification();
                     hcaptchaRef.current?.resetCaptcha();
                   }}
                 >
                  {t('auth.tabs.signup')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-sm">{t('auth.form.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-cuizly-neutral" />
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        placeholder={t('auth.form.emailPlaceholder')}
                        className="pl-10 text-sm"
                        autoComplete="username"
                        autoFocus={false}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-sm">{t('auth.form.password')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-cuizly-neutral" />
                      <Input
                        id="signin-password"
                        name="password"
                        type={showSignInPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10 text-sm"
                        autoComplete="current-password"
                        autoFocus={false}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cuizly-neutral hover:text-foreground transition-colors flex items-center justify-center"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        tabIndex={-1}
                      >
                        {showSignInPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* hCaptcha pour la connexion */}
                  <div className="space-y-2">
                    <Label className="text-sm text-foreground">{t('auth.form.securityVerification')}</Label>
                    <div className="flex justify-center">
                        <HCaptcha
                          ref={hcaptchaRef}
                          sitekey="30de45b6-4d34-4bd6-99b0-4cea109482b8"
                          languageOverride={currentLanguage === 'fr' ? 'fr' : 'en'}
                          onVerify={(token) => {
                            setHcaptchaToken(token);
                            setCaptchaError(null);
                          }}
                          onExpire={() => {
                            setHcaptchaToken(null);
                            setCaptchaError(t('auth.errors.verificationExpired'));
                          }}
                          onError={() => {
                            setHcaptchaToken(null);
                            setCaptchaError(t('auth.errors.verificationError'));
                          }}
                          theme="light"
                          size="normal"
                        />
                    </div>
                    {captchaError && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-2">
                        <div className="flex items-start space-x-2">
                          <svg className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <p className="text-xs text-destructive">{captchaError}</p>
                        </div>
                      </div>
                    )}
                    {hcaptchaToken && (
                      <div className="flex items-center text-xs text-green-600">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {t('auth.form.verified')}
                      </div>
                    )}
                   </div>

                   {/* Section de vérification SMS après hCaptcha pour connexion */}
                   {hcaptchaToken && !signinPhoneVerified && (
                     <div className="space-y-4 border-t pt-4">
                       <div className="text-center">
                         <MessageCircle className="mx-auto h-8 w-8 text-cuizly-primary mb-2" />
                         <h3 className="text-lg font-medium">{t('auth.smsVerification.title')}</h3>
                         <p className="text-sm text-cuizly-neutral">
                           {t('auth.smsVerification.subtitle')}
                         </p>
                       </div>

                        {signinSmsVerificationStep === 'phone' && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="signin-phone" className="text-sm">{t('auth.smsVerification.phoneNumber')}</Label>
                              <PhoneInput
                                id="signin-phone"
                                value={signinPhoneNumber}
                                onChange={setSigninPhoneNumber}
                                placeholder="(514) 465-4783"
                                required
                              />
                            </div>
                           
                           {signinSmsError && (
                             <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                               <p className="text-xs text-destructive">{signinSmsError}</p>
                             </div>
                           )}
                           
                           <Button
                           type="button"
                             onClick={sendSigninSMSVerification}
                             disabled={signinSmsLoading || !signinPhoneNumber.trim()}
                             className="w-full"
                           >
                             {signinSmsLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                             {signinSmsLoading ? t('auth.smsVerification.sending') : t('auth.smsVerification.sendCode')}
                           </Button>
                         </div>
                       )}

                       {signinSmsVerificationStep === 'code' && (
                         <div className="space-y-3">
                           <div className="space-y-2">
                             <Label htmlFor="signin-verification-code" className="text-sm">{t('auth.smsVerification.verificationCode')}</Label>
                             <Input
                               id="signin-verification-code"
                               type="text"
                               placeholder="123456"
                               value={signinVerificationCode}
                               onChange={(e) => setSigninVerificationCode(e.target.value)}
                               className="text-center text-lg tracking-widest"
                               maxLength={6}
                               required
                             />
                             <p className="text-xs text-cuizly-neutral text-center">
                               {t('auth.smsVerification.codeSentTo')} {signinPhoneNumber}
                             </p>
                           </div>
                           
                           {signinSmsError && (
                             <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                               <p className="text-xs text-destructive">{signinSmsError}</p>
                             </div>
                           )}
                           
                           <div className="flex space-x-2">
                             <Button
                               type="button"
                               variant="outline"
                               onClick={resetSigninSMSVerification}
                               className="flex-1"
                             >
                               {t('auth.smsVerification.changeNumber')}
                             </Button>
                             <Button
                             type="button"
                               onClick={verifySigninSMSCode}
                               disabled={signinSmsLoading || signinVerificationCode.length !== 6}
                               className="flex-1"
                             >
                               {signinSmsLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                               {signinSmsLoading ? t('auth.smsVerification.verifying') : t('auth.smsVerification.verify')}
                             </Button>
                           </div>
                         </div>
                       )}

                       {signinSmsVerificationStep === 'completed' && signinPhoneVerified && (
                         <div className="text-center space-y-2">
                           <div className="flex items-center justify-center text-green-600">
                             <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                               <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                             </svg>
                             {t('auth.smsVerification.phoneVerified')}
                           </div>
                           <p className="text-xs text-cuizly-neutral">{signinPhoneNumber}</p>
                         </div>
                       )}
                     </div>
                   )}

                   <Button type="submit" className="w-full text-sm" disabled={isLoading || !hcaptchaToken || !signinPhoneVerified}>
                     {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                     {isLoading ? t('auth.form.signingIn') : t('auth.form.signin')}
                   </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">{t('auth.form.or')}</span>
                  </div>
                </div>

                 <div className="space-y-2 sm:space-y-3">
                   <Button 
                     variant="outline" 
                     className="w-full text-sm flex items-center justify-center gap-2" 
                     onClick={handleGoogleAuth}
                     type="button"
                   >
                     <svg width="18" height="18" viewBox="0 0 24 24" className="w-4 h-4">
                       <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                       <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                       <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                       <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                     </svg>
                     {t('auth.form.continueWithGoogle')}
                   </Button>
                   
                 </div>

              </TabsContent>

              <TabsContent value="signup" className="space-y-3 sm:space-y-4">
                <form onSubmit={handleSignUp} className="space-y-3 sm:space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm">{t('auth.form.iAm')}</Label>
                    <RadioGroup
                      value={userType}
                      onValueChange={(value: 'consumer' | 'restaurant_owner') => setUserType(value)}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="consumer" id="consumer" />
                        <Label htmlFor="consumer" className="text-xs sm:text-sm cursor-pointer">
                          {t('auth.form.consumer')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="restaurant_owner" id="restaurant_owner" />
                        <Label htmlFor="restaurant_owner" className="text-xs sm:text-sm cursor-pointer">
                          {t('auth.form.restaurantOwner')}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm">{t('auth.form.fullName')}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-cuizly-neutral" />
                      <Input
                        id="fullName"
                        name="fullName"
                        placeholder={t('auth.form.fullNamePlaceholder')}
                        className="pl-10 text-sm"
                        autoComplete="new-password"
                        autoFocus={false}
                        required
                      />
                    </div>
                  </div>

                  {userType === 'restaurant_owner' && (
                    <div className="space-y-2">
                      <Label htmlFor="restaurantName" className="text-sm">{t('auth.form.restaurantName')}</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-3 h-4 w-4 text-cuizly-neutral" />
                        <Input
                          id="restaurantName"
                          name="restaurantName"
                          placeholder={t('auth.form.restaurantNamePlaceholder')}
                          className="pl-10 text-sm"
                          autoComplete="new-password"
                          autoFocus={false}
                          required={userType === 'restaurant_owner'}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm">{t('auth.form.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-cuizly-neutral" />
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        placeholder={t('auth.form.emailPlaceholder')}
                        className="pl-10 text-sm"
                        autoComplete="email"
                        autoFocus={false}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm">{t('auth.form.password')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-cuizly-neutral" />
                      <Input
                        id="signup-password"
                        name="password"
                        type={showSignUpPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10 text-sm"
                        autoComplete="new-password"
                        autoFocus={false}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cuizly-neutral hover:text-foreground transition-colors flex items-center justify-center"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        tabIndex={-1}
                      >
                        {showSignUpPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-cuizly-neutral space-y-1">
                    <p>{t('auth.form.passwordRequirements.title')}</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-2">
                      <li>{t('auth.form.passwordRequirements.minLength')}</li>
                      <li>{t('auth.form.passwordRequirements.uppercase')}</li>
                      <li>{t('auth.form.passwordRequirements.lowercase')}</li>
                      <li>{t('auth.form.passwordRequirements.number')}</li>
                      <li>{t('auth.form.passwordRequirements.special')}</li>
                    </ul>
                  </div>

                  {/* hCaptcha pour l'inscription */}
                  <div className="space-y-2">
                    <Label className="text-sm text-foreground">{t('auth.form.securityVerification')}</Label>
                    <div className="flex justify-center">
                        <HCaptcha
                          ref={hcaptchaRef}
                          sitekey="30de45b6-4d34-4bd6-99b0-4cea109482b8"
                          languageOverride={currentLanguage === 'fr' ? 'fr' : 'en'}
                          onVerify={(token) => {
                            setHcaptchaToken(token);
                            setCaptchaError(null);
                          }}
                          onExpire={() => {
                            setHcaptchaToken(null);
                            setCaptchaError(t('auth.errors.verificationExpired'));
                          }}
                          onError={() => {
                            setHcaptchaToken(null);
                            setCaptchaError(t('auth.errors.verificationError'));
                          }}
                          theme="light"
                          size="normal"
                        />
                    </div>
                    {captchaError && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-2">
                        <div className="flex items-start space-x-2">
                          <svg className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <p className="text-xs text-destructive">{captchaError}</p>
                        </div>
                      </div>
                    )}
                    {hcaptchaToken && (
                      <div className="flex items-center text-xs text-green-600">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {t('auth.form.verified')}
                      </div>
                    )}
                  </div>

                  {/* Section de vérification SMS après hCaptcha */}
                  {hcaptchaToken && !phoneVerified && (
                    <div className="space-y-4 border-t pt-4">
                      <div className="text-center">
                        <MessageCircle className="mx-auto h-8 w-8 text-cuizly-primary mb-2" />
                        <h3 className="text-lg font-medium">{t('auth.smsVerification.title')}</h3>
                        <p className="text-sm text-cuizly-neutral">
                          {t('auth.smsVerification.subtitle')}
                        </p>
                      </div>

                       {smsVerificationStep === 'phone' && (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="phone" className="text-sm">{t('auth.smsVerification.phoneNumber')}</Label>
                            <PhoneInput
                              id="phone"
                              value={phoneNumber}
                              onChange={setPhoneNumber}
                              placeholder="(514) 465-4783"
                              required
                            />
                          </div>
                          
                          {smsError && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                              <p className="text-xs text-destructive">{smsError}</p>
                            </div>
                          )}
                          
                          <Button
                          type="button"
                            onClick={sendSMSVerification}
                            disabled={smsLoading || !phoneNumber.trim()}
                            className="w-full"
                          >
                            {smsLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {smsLoading ? t('auth.smsVerification.sending') : t('auth.smsVerification.sendCode')}
                          </Button>
                        </div>
                      )}

                      {smsVerificationStep === 'code' && (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="verification-code" className="text-sm">{t('auth.smsVerification.verificationCode')}</Label>
                            <Input
                              id="verification-code"
                              type="text"
                              placeholder="123456"
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value)}
                              className="text-center text-lg tracking-widest"
                              maxLength={6}
                              required
                            />
                            <p className="text-xs text-cuizly-neutral text-center">
                              {t('auth.smsVerification.codeSentTo')} {phoneNumber}
                            </p>
                          </div>
                          
                          {smsError && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                              <p className="text-xs text-destructive">{smsError}</p>
                            </div>
                          )}
                          
                          <div className="flex space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={resetSMSVerification}
                              className="flex-1"
                            >
                              {t('auth.smsVerification.changeNumber')}
                            </Button>
                            <Button
                            type="button"
                              onClick={verifySMSCode}
                              disabled={smsLoading || verificationCode.length !== 6}
                              className="flex-1"
                            >
                              {smsLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              {smsLoading ? t('auth.smsVerification.verifying') : t('auth.smsVerification.verify')}
                            </Button>
                          </div>
                        </div>
                      )}

                      {smsVerificationStep === 'completed' && phoneVerified && (
                        <div className="text-center space-y-2">
                          <div className="flex items-center justify-center text-green-600">
                            <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {t('auth.smsVerification.phoneVerified')}
                          </div>
                          <p className="text-xs text-cuizly-neutral">{phoneNumber}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {userType === 'restaurant_owner' ? (
                    <div className="space-y-3">
                      <Button 
                        type="submit" 
                        className="w-full text-sm bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {t('auth.form.createAccount')}
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      type="submit" 
                      className="w-full text-sm" 
                      disabled={isLoading || !hcaptchaToken || !phoneVerified}
                    >
                      {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
                    </Button>
                  )}
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">{t('auth.form.or')}</span>
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full text-sm flex items-center justify-center gap-2" 
                    onClick={handleGoogleAuth}
                    type="button"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" className="w-4 h-4">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {t('auth.form.continueWithGoogle')}
                  </Button>
                  
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-cuizly-neutral mt-4 sm:mt-6 space-y-2 px-2">
          <p>
            {t('auth.termsText.prefix')}{" "}
            <Link to="/terms" className="underline hover:no-underline">
              {t('auth.termsText.terms')}
            </Link>{" "}
            {t('auth.termsText.and')}{" "}
            <Link to="/privacy" className="underline hover:no-underline">
              {t('auth.termsText.privacy')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;