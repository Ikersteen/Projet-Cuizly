import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WebsiteConfig {
  id?: string;
  restaurant_id: string;
  is_published: boolean;
  subdomain: string | null;
  custom_domain: string | null;
  theme_color: string;
  secondary_color: string;
  font_family: string;
  logo_position: string;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_image_url: string | null;
  hero_cta_text: string;
  hero_cta_enabled: boolean;
  about_title: string;
  about_content: string | null;
  about_image_url: string | null;
  about_enabled: boolean;
  menu_title: string;
  menu_enabled: boolean;
  menu_display_style: string;
  gallery_title: string;
  gallery_images: string[];
  gallery_enabled: boolean;
  contact_title: string;
  contact_enabled: boolean;
  show_map: boolean;
  show_opening_hours: boolean;
  reservations_title: string;
  reservations_enabled: boolean;
  reservations_description: string | null;
  show_social_links: boolean;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string[] | null;
  google_analytics_id: string | null;
}

const defaultConfig: Omit<WebsiteConfig, 'restaurant_id'> = {
  is_published: false,
  subdomain: null,
  custom_domain: null,
  theme_color: '#FF6B35',
  secondary_color: '#1A1A2E',
  font_family: 'Inter',
  logo_position: 'left',
  hero_title: null,
  hero_subtitle: null,
  hero_image_url: null,
  hero_cta_text: 'Réserver une table',
  hero_cta_enabled: true,
  about_title: 'À propos',
  about_content: null,
  about_image_url: null,
  about_enabled: true,
  menu_title: 'Notre Menu',
  menu_enabled: true,
  menu_display_style: 'grid',
  gallery_title: 'Galerie',
  gallery_images: [],
  gallery_enabled: true,
  contact_title: 'Contact',
  contact_enabled: true,
  show_map: true,
  show_opening_hours: true,
  reservations_title: 'Réservations',
  reservations_enabled: true,
  reservations_description: null,
  show_social_links: true,
  meta_title: null,
  meta_description: null,
  meta_keywords: null,
  google_analytics_id: null,
};

export const useRestaurantWebsite = (restaurantId: string | null) => {
  const [config, setConfig] = useState<WebsiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (restaurantId) {
      loadWebsiteConfig();
    }
  }, [restaurantId]);

  const loadWebsiteConfig = async () => {
    if (!restaurantId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurant_websites')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig(data as WebsiteConfig);
      } else {
        // No website yet, set default config
        setConfig({
          ...defaultConfig,
          restaurant_id: restaurantId,
        });
      }
    } catch (error) {
      console.error('Error loading website config:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la configuration du site',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (updates: Partial<WebsiteConfig>) => {
    if (!restaurantId || !config) return false;

    setSaving(true);
    try {
      const updatedConfig = { ...config, ...updates };

      if (config.id) {
        // Update existing
        const { error } = await supabase
          .from('restaurant_websites')
          .update(updates)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('restaurant_websites')
          .insert({
            ...updatedConfig,
            restaurant_id: restaurantId,
          })
          .select()
          .single();

        if (error) throw error;
        updatedConfig.id = data.id;
      }

      setConfig(updatedConfig);
      toast({
        title: 'Sauvegardé',
        description: 'Configuration du site mise à jour',
      });
      return true;
    } catch (error) {
      console.error('Error saving website config:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder la configuration',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const generateSubdomain = async (restaurantName: string) => {
    try {
      const { data, error } = await supabase.rpc('generate_website_subdomain', {
        restaurant_name: restaurantName,
      });

      if (error) throw error;
      return data as string;
    } catch (error) {
      console.error('Error generating subdomain:', error);
      return null;
    }
  };

  const publishWebsite = async () => {
    return saveConfig({ is_published: true });
  };

  const unpublishWebsite = async () => {
    return saveConfig({ is_published: false });
  };

  return {
    config,
    loading,
    saving,
    saveConfig,
    generateSubdomain,
    publishWebsite,
    unpublishWebsite,
    reload: loadWebsiteConfig,
  };
};
