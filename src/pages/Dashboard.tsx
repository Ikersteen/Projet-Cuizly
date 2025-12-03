import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useLocalizedRoute } from "@/lib/routeTranslations";
import { usePersonalizedUrl, extractSlugFromUrl } from "@/lib/urlUtils";
import { generateUniqueUsername } from "@/lib/usernameGenerator";
import ConsumerDashboard from "./ConsumerDashboard";
import RestaurantDashboard from "./RestaurantDashboard";

const Dashboard = () => {
  const { user, profile, loading, isAuthenticated } = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [restaurant, setRestaurant] = useState<any>(null);
  
  // Get localized routes
  const authRoute = useLocalizedRoute('/auth');
  
  // Generate personalized URL
  const personalizedUrl = usePersonalizedUrl(
    profile?.user_type,
    profile,
    restaurant
  );

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate(authRoute);
    }
  }, [loading, isAuthenticated, navigate, authRoute]);

  // Ensure user has a username and load restaurant data
  useEffect(() => {
    const initializeProfile = async () => {
      if (!user?.id || !profile) return;
      
      // Check if username is missing and generate one
      if (!profile.username) {
        try {
          const newUsername = await generateUniqueUsername(supabase);
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ username: newUsername })
            .eq('user_id', user.id);
          
          if (updateError) {
            console.error('Error updating username:', updateError);
          } else {
            console.log('Generated username:', newUsername);
            // Éviter le rechargement complet - le profile sera mis à jour via realtime
          }
        } catch (error) {
          console.error('Error generating username:', error);
        }
      }
      
      // Load restaurant data if user is restaurant owner
      if (profile.user_type === 'restaurant_owner') {
        try {
          const { data: restaurantData } = await supabase
            .from('restaurants')
            .select('*')
            .eq('owner_id', user.id)
            .maybeSingle();
          
          setRestaurant(restaurantData);
        } catch (error) {
          console.error('Error loading restaurant:', error);
        }
      }
    };

    if (!loading && isAuthenticated && profile) {
      initializeProfile();
    }
  }, [loading, isAuthenticated, profile, user?.id]);

  // Redirect to personalized URL
  useEffect(() => {
    if (!loading && isAuthenticated && profile && personalizedUrl) {
      const currentSlug = extractSlugFromUrl(location.pathname);
      const targetSlug = extractSlugFromUrl(personalizedUrl);
      
      // Only redirect if we're on the generic dashboard or wrong slug
      if (currentSlug !== targetSlug) {
        navigate(personalizedUrl, { replace: true });
      }
    }
  }, [loading, isAuthenticated, profile, personalizedUrl, location.pathname, navigate]);


  // Render appropriate dashboard based on user type
  return profile?.user_type === 'restaurant_owner' ? <RestaurantDashboard /> : <ConsumerDashboard />;
};

export default Dashboard;