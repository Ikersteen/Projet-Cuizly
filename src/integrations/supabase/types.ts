export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_type: string
          apartment_unit: string | null
          city: string
          country: string
          created_at: string
          formatted_address: string
          id: string
          is_active: boolean
          is_primary: boolean
          latitude: number | null
          longitude: number | null
          neighborhood: string | null
          postal_code: string | null
          province: string
          street_name: string | null
          street_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address_type: string
          apartment_unit?: string | null
          city?: string
          country?: string
          created_at?: string
          formatted_address: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          postal_code?: string | null
          province?: string
          street_name?: string | null
          street_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address_type?: string
          apartment_unit?: string | null
          city?: string
          country?: string
          created_at?: string
          formatted_address?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          postal_code?: string | null
          province?: string
          street_name?: string | null
          street_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      anonymous_location_tracking: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          page_accessed: string
          session_id: string
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          page_accessed: string
          session_id: string
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          page_accessed?: string
          session_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      conversation_messages: {
        Row: {
          audio_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          message_type: string
          role: string
          transcription: string | null
        }
        Insert: {
          audio_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          message_type?: string
          role: string
          transcription?: string | null
        }
        Update: {
          audio_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          message_type?: string
          role?: string
          transcription?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          anonymous_session_id: string | null
          created_at: string
          id: string
          title: string | null
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          anonymous_session_id?: string | null
          created_at?: string
          id?: string
          title?: string | null
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          anonymous_session_id?: string | null
          created_at?: string
          id?: string
          title?: string | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      restaurant_websites: {
        Row: {
          about_content: string | null
          about_enabled: boolean | null
          about_image_url: string | null
          about_title: string | null
          contact_enabled: boolean | null
          contact_title: string | null
          created_at: string
          custom_domain: string | null
          font_family: string | null
          gallery_enabled: boolean | null
          gallery_images: string[] | null
          gallery_title: string | null
          google_analytics_id: string | null
          hero_cta_enabled: boolean | null
          hero_cta_text: string | null
          hero_image_url: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          is_published: boolean
          logo_position: string | null
          menu_display_style: string | null
          menu_enabled: boolean | null
          menu_title: string | null
          meta_description: string | null
          meta_keywords: string[] | null
          meta_title: string | null
          reservations_description: string | null
          reservations_enabled: boolean | null
          reservations_title: string | null
          restaurant_id: string
          secondary_color: string | null
          show_map: boolean | null
          show_opening_hours: boolean | null
          show_social_links: boolean | null
          subdomain: string | null
          theme_color: string | null
          updated_at: string
        }
        Insert: {
          about_content?: string | null
          about_enabled?: boolean | null
          about_image_url?: string | null
          about_title?: string | null
          contact_enabled?: boolean | null
          contact_title?: string | null
          created_at?: string
          custom_domain?: string | null
          font_family?: string | null
          gallery_enabled?: boolean | null
          gallery_images?: string[] | null
          gallery_title?: string | null
          google_analytics_id?: string | null
          hero_cta_enabled?: boolean | null
          hero_cta_text?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_published?: boolean
          logo_position?: string | null
          menu_display_style?: string | null
          menu_enabled?: boolean | null
          menu_title?: string | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          reservations_description?: string | null
          reservations_enabled?: boolean | null
          reservations_title?: string | null
          restaurant_id: string
          secondary_color?: string | null
          show_map?: boolean | null
          show_opening_hours?: boolean | null
          show_social_links?: boolean | null
          subdomain?: string | null
          theme_color?: string | null
          updated_at?: string
        }
        Update: {
          about_content?: string | null
          about_enabled?: boolean | null
          about_image_url?: string | null
          about_title?: string | null
          contact_enabled?: boolean | null
          contact_title?: string | null
          created_at?: string
          custom_domain?: string | null
          font_family?: string | null
          gallery_enabled?: boolean | null
          gallery_images?: string[] | null
          gallery_title?: string | null
          google_analytics_id?: string | null
          hero_cta_enabled?: boolean | null
          hero_cta_text?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_published?: boolean
          logo_position?: string | null
          menu_display_style?: string | null
          menu_enabled?: boolean | null
          menu_title?: string | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          reservations_description?: string | null
          reservations_enabled?: boolean | null
          reservations_title?: string | null
          restaurant_id?: string
          secondary_color?: string | null
          show_map?: boolean | null
          show_opening_hours?: boolean | null
          show_social_links?: boolean | null
          subdomain?: string | null
          theme_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_websites_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          allergens: string[] | null
          cover_image_url: string | null
          created_at: string
          cuisine_type: string[] | null
          delivery_radius: number | null
          description: string | null
          description_en: string | null
          description_fr: string | null
          dietary_restrictions: string[] | null
          dress_code: string | null
          email: string | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          is_active: boolean | null
          logo_url: string | null
          max_reservation_duration_minutes: number | null
          name: string
          number_of_tables: number | null
          opening_hours: Json | null
          owner_id: string
          parking: string | null
          phone: string | null
          price_range: string | null
          reservation_turnover_minutes: number | null
          reservations_enabled: boolean
          restaurant_specialties: string[] | null
          service_types: string[] | null
          tiktok_url: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergens?: string[] | null
          cover_image_url?: string | null
          created_at?: string
          cuisine_type?: string[] | null
          delivery_radius?: number | null
          description?: string | null
          description_en?: string | null
          description_fr?: string | null
          dietary_restrictions?: string[] | null
          dress_code?: string | null
          email?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          max_reservation_duration_minutes?: number | null
          name: string
          number_of_tables?: number | null
          opening_hours?: Json | null
          owner_id: string
          parking?: string | null
          phone?: string | null
          price_range?: string | null
          reservation_turnover_minutes?: number | null
          reservations_enabled?: boolean
          restaurant_specialties?: string[] | null
          service_types?: string[] | null
          tiktok_url?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergens?: string[] | null
          cover_image_url?: string | null
          created_at?: string
          cuisine_type?: string[] | null
          delivery_radius?: number | null
          description?: string | null
          description_en?: string | null
          description_fr?: string | null
          dietary_restrictions?: string[] | null
          dress_code?: string | null
          email?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          max_reservation_duration_minutes?: number | null
          name?: string
          number_of_tables?: number | null
          opening_hours?: Json | null
          owner_id?: string
          parking?: string | null
          phone?: string | null
          price_range?: string | null
          reservation_turnover_minutes?: number | null
          reservations_enabled?: boolean
          restaurant_specialties?: string[] | null
          service_types?: string[] | null
          tiktok_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          created_at: string | null
          event_details: Json | null
          event_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          restaurant_name: string | null
          updated_at: string
          user_id: string | null
          user_type: Database["public"]["Enums"]["user_type"]
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          restaurant_name?: string | null
          updated_at?: string
          user_id?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          restaurant_name?: string | null
          updated_at?: string
          user_id?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_public_restaurant_data: { Args: never; Returns: boolean }
      check_reservation_availability: {
        Args: {
          p_date: string
          p_party_size: number
          p_restaurant_id: string
          p_time: string
        }
        Returns: boolean
      }
      cleanup_expired_anonymous_conversations: {
        Args: never
        Returns: undefined
      }
      create_notification: {
        Args: {
          p_link?: string
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_restaurant_slug: {
        Args: { restaurant_name: string }
        Returns: string
      }
      decrypt_pii:
        | {
            Args: { encrypted_data: string; secret_key?: string }
            Returns: string
          }
        | { Args: { encrypted_text: string }; Returns: string }
      detect_address_enumeration: { Args: never; Returns: undefined }
      detect_suspicious_admin_activity: { Args: never; Returns: undefined }
      emergency_admin_verification: { Args: never; Returns: boolean }
      emergency_decrypt_customer_data: {
        Args: { justification: string; record_id: string }
        Returns: {
          access_justification: string
          decrypted_address: string
          decrypted_email: string
          decrypted_phone: string
        }[]
      }
      encrypt_pii:
        | { Args: { data: string; secret_key?: string }; Returns: string }
        | { Args: { plain_text: string }; Returns: string }
      generate_website_subdomain: {
        Args: { restaurant_name: string }
        Returns: string
      }
      get_all_conversations_with_messages: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          anonymous_session_id: string
          conversation_created_at: string
          conversation_id: string
          conversation_title: string
          conversation_type: string
          message_content: string
          message_created_at: string
          message_id: string
          message_role: string
          message_type: string
          user_id: string
        }[]
      }
      get_analytics_summary: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          avg_session_duration: number
          browser_breakdown: Json
          device_breakdown: Json
          event_breakdown: Json
          top_pages: Json
          total_events: number
          total_page_views: number
          unique_sessions: number
          unique_users: number
        }[]
      }
      get_available_time_slots: {
        Args: { p_date: string; p_party_size: number; p_restaurant_id: string }
        Returns: {
          available_spots: number
          time_slot: string
        }[]
      }
      get_conversation_stats: {
        Args: never
        Returns: {
          anonymous_conversations: number
          authenticated_conversations: number
          total_conversations: number
          total_messages: number
        }[]
      }
      get_offers_with_restaurant_names: {
        Args: { category_filter?: string }
        Returns: {
          category: string
          created_at: string
          cuisine_type: string
          description: string
          discount_amount: number
          discount_percentage: number
          id: string
          is_active: boolean
          restaurant_cuisine_type: string[]
          restaurant_id: string
          restaurant_name: string
          restaurant_price_range: string
          title: string
          updated_at: string
          valid_until: string
        }[]
      }
      get_public_restaurants: {
        Args: never
        Returns: {
          address: string
          allergens: string[]
          cover_image_url: string
          created_at: string
          cuisine_type: string[]
          delivery_radius: number
          description: string
          description_en: string
          description_fr: string
          dietary_restrictions: string[]
          dress_code: string
          email: string
          facebook_url: string
          id: string
          instagram_url: string
          is_active: boolean
          logo_url: string
          name: string
          opening_hours: Json
          owner_id: string
          parking: string
          phone: string
          price_range: string
          reservations_enabled: boolean
          restaurant_specialties: string[]
          service_types: string[]
          tiktok_url: string
          updated_at: string
        }[]
      }
      get_public_user_names: {
        Args: { user_ids: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
          username: string
        }[]
      }
      get_public_website: {
        Args: { website_subdomain: string }
        Returns: {
          restaurant_data: Json
          website_config: Json
        }[]
      }
      get_restaurant_by_slug: {
        Args: { restaurant_slug: string }
        Returns: {
          address: string
          allergens: string[]
          cover_image_url: string
          created_at: string
          cuisine_type: string[]
          delivery_radius: number
          description: string
          description_en: string
          description_fr: string
          dietary_restrictions: string[]
          dress_code: string
          email: string
          facebook_url: string
          id: string
          instagram_url: string
          is_active: boolean
          logo_url: string
          name: string
          opening_hours: Json
          owner_id: string
          parking: string
          phone: string
          price_range: string
          reservations_enabled: boolean
          restaurant_specialties: string[]
          service_types: string[]
          updated_at: string
        }[]
      }
      get_restaurant_contact_info: {
        Args: { restaurant_id: string }
        Returns: {
          email: string
          phone: string
        }[]
      }
      get_security_status: { Args: never; Returns: Json }
      get_translated_description: {
        Args: {
          language?: string
          restaurant_row: Database["public"]["Tables"]["restaurants"]["Row"]
        }
        Returns: string
      }
      get_user_primary_address: {
        Args: { p_address_type: string; p_user_id: string }
        Returns: {
          apartment_unit: string
          city: string
          country: string
          formatted_address: string
          id: string
          latitude: number
          longitude: number
          neighborhood: string
          postal_code: string
          province: string
          street_name: string
          street_number: string
        }[]
      }
      get_waitlist_data_ultra_secure: {
        Args: { page_offset?: number; page_size?: number; search_term?: string }
        Returns: {
          address_masked: string
          company_name: string
          created_at: string
          email_masked: string
          id: string
          name: string
          phone_masked: string
          restaurant_type: string
          total_count: number
        }[]
      }
      get_waitlist_entries_secure: {
        Args: {
          page_offset?: number
          page_size?: number
          search_filter?: string
        }
        Returns: {
          address: string
          company_name: string
          created_at: string
          email: string
          id: string
          masked_email: string
          masked_phone: string
          message: string
          name: string
          phone: string
          restaurant_type: string
        }[]
      }
      get_waitlist_fortress_access: {
        Args: {
          admin_justification?: string
          page_offset?: number
          page_size?: number
        }
        Returns: {
          access_level: string
          business_type: string
          contact_masked: string
          name_first: string
          record_id: string
          region_masked: string
          security_clearance: string
          signup_date: string
        }[]
      }
      get_waitlist_maximum_security: {
        Args: { page_offset?: number; page_size?: number; search_term?: string }
        Returns: {
          access_level: string
          address_region: string
          company_name: string
          created_at: string
          email_masked: string
          id: string
          message_preview: string
          name: string
          phone_masked: string
          restaurant_type: string
          total_count: number
        }[]
      }
      get_waitlist_secure_admin: {
        Args: { page_offset?: number; page_size?: number; search_term?: string }
        Returns: {
          created_at: string
          email_masked: string
          id: string
          restaurant_type: string
          total_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_analytics: {
        Args: {
          p_increment?: number
          p_metric: string
          p_restaurant_id: string
        }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_authenticated_user: { Args: never; Returns: boolean }
      log_security_event: {
        Args: {
          p_event_details?: Json
          p_event_type: string
          p_ip_address?: unknown
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      log_unauthorized_access_attempt: { Args: never; Returns: boolean }
      log_user_activity: {
        Args: {
          p_duration_seconds?: number
          p_event_data?: Json
          p_event_type: string
          p_page_title?: string
          p_page_url?: string
          p_referrer?: string
          p_session_id: string
        }
        Returns: string
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      mask_sensitive_data: {
        Args: { data: string; mask_type?: string; security_level?: string }
        Returns: string
      }
      track_anonymous_location: {
        Args: {
          p_city?: string
          p_country?: string
          p_latitude?: number
          p_longitude?: number
          p_metadata?: Json
          p_page_accessed: string
          p_session_id: string
        }
        Returns: string
      }
      track_profile_view: {
        Args: { p_restaurant_id: string }
        Returns: undefined
      }
      update_analytics_data: {
        Args: {
          p_date?: string
          p_menu_views?: number
          p_offer_clicks?: number
          p_profile_views?: number
          p_restaurant_id: string
        }
        Returns: undefined
      }
      update_learned_preferences: {
        Args: {
          p_interaction_type: string
          p_restaurant_data?: Json
          p_restaurant_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      upload_restaurant_image: {
        Args: { p_image_type: string; p_image_url: string }
        Returns: string
      }
      validate_admin_session: { Args: never; Returns: boolean }
      validate_email_domain: { Args: { email: string }; Returns: boolean }
      validate_password_strength: {
        Args: { password: string }
        Returns: boolean
      }
      validate_waitlist_entry: {
        Args: {
          company_name_input?: string
          email_input: string
          name_input: string
          phone_input?: string
        }
        Returns: boolean
      }
      verify_admin_access: { Args: never; Returns: boolean }
      verify_secure_address_access: {
        Args: { p_address_id?: string; p_user_id: string }
        Returns: boolean
      }
      verify_secure_admin_access: {
        Args: { max_hourly_accesses?: number }
        Returns: boolean
      }
      verify_ultra_secure_waitlist_access: { Args: never; Returns: boolean }
      verify_waitlist_admin_context: { Args: never; Returns: boolean }
      verify_waitlist_security_status: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      reservation_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "no_show"
      user_type: "consumer" | "restaurant_owner"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      reservation_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "no_show",
      ],
      user_type: ["consumer", "restaurant_owner"],
    },
  },
} as const
