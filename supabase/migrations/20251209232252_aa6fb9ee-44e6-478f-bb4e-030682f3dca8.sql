-- Create restaurant_websites table for storing website configurations
CREATE TABLE public.restaurant_websites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  
  -- Basic settings
  is_published boolean NOT NULL DEFAULT false,
  subdomain text UNIQUE,
  custom_domain text UNIQUE,
  
  -- Theme & Design
  theme_color text DEFAULT '#FF6B35',
  secondary_color text DEFAULT '#1A1A2E',
  font_family text DEFAULT 'Inter',
  logo_position text DEFAULT 'left',
  
  -- Hero section
  hero_title text,
  hero_subtitle text,
  hero_image_url text,
  hero_cta_text text DEFAULT 'Réserver une table',
  hero_cta_enabled boolean DEFAULT true,
  
  -- About section
  about_title text DEFAULT 'À propos',
  about_content text,
  about_image_url text,
  about_enabled boolean DEFAULT true,
  
  -- Menu section
  menu_title text DEFAULT 'Notre Menu',
  menu_enabled boolean DEFAULT true,
  menu_display_style text DEFAULT 'grid',
  
  -- Gallery section
  gallery_title text DEFAULT 'Galerie',
  gallery_images text[] DEFAULT '{}',
  gallery_enabled boolean DEFAULT true,
  
  -- Contact section
  contact_title text DEFAULT 'Contact',
  contact_enabled boolean DEFAULT true,
  show_map boolean DEFAULT true,
  show_opening_hours boolean DEFAULT true,
  
  -- Reservations section
  reservations_title text DEFAULT 'Réservations',
  reservations_enabled boolean DEFAULT true,
  reservations_description text,
  
  -- Social links (additional to restaurant table)
  show_social_links boolean DEFAULT true,
  
  -- SEO
  meta_title text,
  meta_description text,
  meta_keywords text[],
  
  -- Analytics
  google_analytics_id text,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.restaurant_websites ENABLE ROW LEVEL SECURITY;

-- Policy: Restaurant owners can manage their website
CREATE POLICY "Restaurant owners can view their website"
ON public.restaurant_websites FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r 
    WHERE r.id = restaurant_websites.restaurant_id 
    AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Restaurant owners can create their website"
ON public.restaurant_websites FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants r 
    WHERE r.id = restaurant_websites.restaurant_id 
    AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Restaurant owners can update their website"
ON public.restaurant_websites FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r 
    WHERE r.id = restaurant_websites.restaurant_id 
    AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Restaurant owners can delete their website"
ON public.restaurant_websites FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r 
    WHERE r.id = restaurant_websites.restaurant_id 
    AND r.owner_id = auth.uid()
  )
);

-- Policy: Public can view published websites
CREATE POLICY "Public can view published websites"
ON public.restaurant_websites FOR SELECT
USING (is_published = true);

-- Create index for faster lookups
CREATE INDEX idx_restaurant_websites_restaurant_id ON public.restaurant_websites(restaurant_id);
CREATE INDEX idx_restaurant_websites_subdomain ON public.restaurant_websites(subdomain);
CREATE INDEX idx_restaurant_websites_custom_domain ON public.restaurant_websites(custom_domain);

-- Function to generate unique subdomain
CREATE OR REPLACE FUNCTION public.generate_website_subdomain(restaurant_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Create base slug from restaurant name
  base_slug := lower(regexp_replace(
    unaccent(restaurant_name),
    '[^a-z0-9]+', '-', 'g'
  ));
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Check for uniqueness and add counter if needed
  WHILE EXISTS (SELECT 1 FROM restaurant_websites WHERE subdomain = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Function to get public website data
CREATE OR REPLACE FUNCTION public.get_public_website(website_subdomain text)
RETURNS TABLE (
  website_config jsonb,
  restaurant_data jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_jsonb(rw.*) as website_config,
    jsonb_build_object(
      'id', r.id,
      'name', r.name,
      'description', r.description,
      'description_fr', r.description_fr,
      'description_en', r.description_en,
      'address', r.address,
      'phone', r.phone,
      'email', r.email,
      'cuisine_type', r.cuisine_type,
      'price_range', r.price_range,
      'logo_url', r.logo_url,
      'cover_image_url', r.cover_image_url,
      'opening_hours', r.opening_hours,
      'reservations_enabled', r.reservations_enabled,
      'instagram_url', r.instagram_url,
      'facebook_url', r.facebook_url,
      'tiktok_url', r.tiktok_url,
      'dietary_restrictions', r.dietary_restrictions,
      'allergens', r.allergens,
      'restaurant_specialties', r.restaurant_specialties,
      'service_types', r.service_types,
      'parking', r.parking,
      'dress_code', r.dress_code
    ) as restaurant_data
  FROM restaurant_websites rw
  JOIN restaurants r ON r.id = rw.restaurant_id
  WHERE rw.subdomain = website_subdomain
    AND rw.is_published = true
    AND r.is_active = true;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_restaurant_websites_updated_at
BEFORE UPDATE ON public.restaurant_websites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();