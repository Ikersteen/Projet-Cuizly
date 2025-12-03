import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, X, Camera, User, Trash2, Edit2, Crop, ChevronDown, Instagram, Facebook, MapPin, Music2, Settings, Shield, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PhotoAdjustmentModal } from "@/components/PhotoAdjustmentModal";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { useAddresses } from "@/hooks/useAddresses";
import { createAddressInput } from "@/lib/addressUtils";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from 'react-i18next';
import { validateFileUpload } from "@/lib/security";
import { HolidaysSection } from "@/components/HolidaysSection";
import { AccountSettingsSection } from "@/components/AccountSettingsSection";

import { CUISINE_OPTIONS, CUISINE_TRANSLATIONS, SERVICE_TYPES_OPTIONS, SERVICE_TYPES_TRANSLATIONS, PRICE_RANGE_OPTIONS, PRICE_RANGE_TRANSLATIONS } from "@/constants/cuisineTypes";

interface ImprovedRestaurantProfileModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  // Legacy props for compatibility
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  restaurant?: any;
  onUpdate?: () => void;
}

export const ImprovedRestaurantProfileModal = ({ 
  isOpen, 
  onClose, 
  open, 
  onOpenChange, 
  onUpdate 
}: ImprovedRestaurantProfileModalProps) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { primaryAddress: restaurantAddress, createAddress, updateAddress: updateAddressHook } = useAddresses('restaurant');
  
  // Handle both prop formats
  const requestedOpen = isOpen ?? open ?? false;
  const [actuallyOpen, setActuallyOpen] = useState(false);
  const handleClose = onClose ?? (() => onOpenChange?.(false));
  
  const [restaurant, setRestaurant] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    description: "",
    phone: "",
    email: "",
    address: restaurantAddress?.formatted_address || "",
    cuisine_type: [] as string[],
    restaurant_specialties: [] as string[],
    service_types: [] as string[],
    dietary_restrictions: [] as string[],
    allergens: [] as string[],
    instagram_url: "",
    facebook_url: "",
    tiktok_url: "",
    price_range: "" as string,
    reservations_enabled: false,
    dress_code: "",
    parking: "",
    opening_hours: {
      monday: { open: "09:00", close: "17:00", closed: false },
      tuesday: { open: "09:00", close: "17:00", closed: false },
      wednesday: { open: "09:00", close: "17:00", closed: false },
      thursday: { open: "09:00", close: "17:00", closed: false },
      friday: { open: "09:00", close: "17:00", closed: false },
      saturday: { open: "09:00", close: "17:00", closed: false },
      sunday: { open: "09:00", close: "17:00", closed: true }
    }
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoModalType, setPhotoModalType] = useState<'logo' | 'cover'>('logo');
  
  // Photo adjustment modal states
  const [logoAdjustmentOpen, setLogoAdjustmentOpen] = useState(false);
  const [coverAdjustmentOpen, setCoverAdjustmentOpen] = useState(false);
  const [tempLogoUrl, setTempLogoUrl] = useState<string>('');
  const [tempCoverUrl, setTempCoverUrl] = useState<string>('');
  
  // Specialty input state
  const [specialtyInput, setSpecialtyInput] = useState<string>('');
  
  // Debug log for modal state
  // console.log('Modal states:', { photoModalOpen, photoModalType });

  useEffect(() => {
    if (requestedOpen) {
      setActuallyOpen(false);
      loadRestaurant();
    } else {
      setActuallyOpen(false);
    }
  }, [requestedOpen]);

  useEffect(() => {
    if (restaurantAddress) {
      setFormData(prev => ({ ...prev, address: restaurantAddress.formatted_address }));
    }
  }, [restaurantAddress]);

  const loadRestaurant = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', session.user.id)
        .single();

      if (error) throw error;

      // Also load profile data for username
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', session.user.id)
        .single();

      setRestaurant(data);
      setFormData({
        name: data.name || "",
        username: profileData?.username || "",
        description: data.description || "",
        phone: data.phone || "",
        email: data.email || "",
        address: restaurantAddress?.formatted_address || data.address || "",
        cuisine_type: data.cuisine_type || [],
        restaurant_specialties: data.restaurant_specialties || [],
        instagram_url: data.instagram_url || "",
        facebook_url: data.facebook_url || "",
        tiktok_url: (data as any).tiktok_url || "",
        service_types: (data as any).service_types || [],
        dietary_restrictions: data.dietary_restrictions || [],
        allergens: data.allergens || [],
        price_range: data.price_range || "",
        reservations_enabled: data.reservations_enabled || false,
        dress_code: (data as any).dress_code || "",
        parking: (data as any).parking || "",
        opening_hours: (data.opening_hours && typeof data.opening_hours === 'object') ? data.opening_hours as any : {
          monday: { open: "09:00", close: "17:00", closed: false },
          tuesday: { open: "09:00", close: "17:00", closed: false },
          wednesday: { open: "09:00", close: "17:00", closed: false },
          thursday: { open: "09:00", close: "17:00", closed: false },
          friday: { open: "09:00", close: "17:00", closed: false },
          saturday: { open: "09:00", close: "17:00", closed: false },
          sunday: { open: "09:00", close: "17:00", closed: true }
        }
      });
    } catch (error) {
      console.error('Error loading restaurant:', error);
    } finally {
      setLoading(false);
      setActuallyOpen(true);
    }
  };

  // Handle file upload with adjustment modal
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
    const file = event.target.files?.[0];
    console.log('🎯 handleFileUpload called with type:', type, 'file:', file);
    
    if (!file) {
      console.log('❌ No file selected');
      return;
    }

    // Use centralized validation from security module
    const validation = validateFileUpload(file);
    if (!validation.isValid) {
      console.log('❌ File validation failed:', validation.error);
      toast({
        title: t('restaurantProfile.error'),
        description: validation.error || t('restaurantProfile.invalidFile'),
        variant: "destructive"
      });
      return;
    }

    console.log('✅ File validation passed, reading file...');
    
    // Convert file to URL for adjustment modal
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      console.log('📸 FileReader onload, result length:', result?.length);
      
      if (!result) {
        console.error('❌ FileReader result is empty');
        toast({
          title: t('restaurantProfile.error'),
          description: t('restaurantProfile.cannotReadFile'),
          variant: "destructive"
        });
        return;
      }
      
      if (type === 'cover') {
        console.log('🖼️ Setting cover URL and opening modal');
        setTempCoverUrl(result);
        setCoverAdjustmentOpen(true);
        console.log('📱 Cover adjustment modal state set to true');
      } else {
        console.log('🏷️ Setting logo URL and opening modal');
        setTempLogoUrl(result);
        setLogoAdjustmentOpen(true);
        console.log('📱 Logo adjustment modal state set to true');
      }
    };
    reader.onerror = (error) => {
      console.error('❌ FileReader error:', error);
      toast({
        title: t('restaurantProfile.error'),
        description: t('restaurantProfile.cannotReadFile'),
        variant: "destructive"
      });
    };
    reader.readAsDataURL(file);
  };

  // Helper function to convert base64 to blob
  const base64ToBlob = (base64Data: string): Blob => {
    const arr = base64Data.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleAdjustedImageSave = async (adjustedImageData: string, type: 'logo' | 'cover') => {
    console.log('💾 Saving adjusted image for type:', type);
    
    if (type === 'cover') {
      setUploadingCover(true);
    } else {
      setUploadingLogo(true);
    }
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!session) {
        console.error('❌ No session found');
        throw new Error('No session');
      }

      console.log('✅ Session found, converting image...');

      // Convert base64 to blob directly (avoiding CSP issues with fetch on data URI)
      const blob = base64ToBlob(adjustedImageData);
      console.log('📄 Blob created:', { size: blob.size, type: blob.type });
      
      const fileExt = blob.type.split('/')[1] || 'jpg';
      const fileName = `${session.user.id}/${type}-${Date.now()}.${fileExt}`;
      
      console.log('📤 Starting upload to:', fileName);

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('restaurant-images')
        .upload(fileName, blob, {
          contentType: blob.type,
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('✅ Upload successful:', uploadData);

      const { data: urlData } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(fileName);

      console.log('🔗 Public URL generated:', urlData.publicUrl);

      // Update database
      const updateField = type === 'cover' ? 'cover_image_url' : 'logo_url';
      console.log('💾 Updating database field:', updateField);
      
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ 
          [updateField]: urlData.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('owner_id', session.user.id);

      if (updateError) {
        console.error('❌ Database update error:', updateError);
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      console.log('✅ Database updated successfully');

      // Update form data and restaurant state
      setFormData(prev => ({ ...prev, [updateField]: urlData.publicUrl }));
      setRestaurant(prev => ({ ...prev, [updateField]: urlData.publicUrl }));
      
      toast({
        title: t('restaurantProfile.success'),
        description: type === 'cover' ? t('restaurantProfile.coverUploaded') : t('restaurantProfile.logoUploaded')
      });
      
    } catch (error) {
      console.error('❌ Complete upload process failed:', error);
      
      let errorMessage = t('restaurantProfile.cannotUpload');
      if (error instanceof Error) {
        errorMessage = `${t('restaurantProfile.cannotUpload')}: ${error.message}`;
      }
      
      toast({
        title: t('restaurantProfile.error'),
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      if (type === 'cover') {
        setUploadingCover(false);
        setCoverAdjustmentOpen(false);
      } else {
        setUploadingLogo(false);
        setLogoAdjustmentOpen(false);
      }
    }
  };

  // Handle image removal
  const handleImageRemove = async (imageType: 'logo' | 'cover') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const updateField = imageType === 'logo' ? 'logo_url' : 'cover_image_url';
      
      // Update restaurant in database
      const { error } = await supabase
        .from('restaurants')
        .update({ 
          [updateField]: null,
          updated_at: new Date().toISOString()
        })
        .eq('owner_id', session.user.id);

      if (error) throw error;

      // Update local state
      setRestaurant((prev: any) => ({
        ...prev,
        [updateField]: null
      }));

      toast({
        title: t('restaurantProfile.success'),
        description: t('restaurantProfile.imageRemoved'),
      });

      if (onUpdate) onUpdate();

    } catch (error) {
      console.error('Error removing image:', error);
      toast({
        title: t('errors.title'),
        description: t('errors.serverError'),
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    if (!formData.name.trim()) {
      toast({
        title: t('restaurantProfile.error'),
        description: t('restaurantProfile.nameRequired'),
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      // Handle address update separately
      let addressUpdated = false;
      if (formData.address?.trim()) {
        const addressInput = createAddressInput(formData.address, 'restaurant', true);
        
        if (restaurantAddress) {
          const result = await updateAddressHook(restaurantAddress.id!, addressInput);
          addressUpdated = !!result;
        } else {
          const result = await createAddress(addressInput);
          addressUpdated = !!result;
        }
      }

      // Update other restaurant data (including address for compatibility)
      const updateData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        address: formData.address?.trim() || null,
        phone: formData.phone?.trim() || null,
        email: formData.email?.trim() || null,
        cuisine_type: formData.cuisine_type,
        restaurant_specialties: formData.restaurant_specialties,
        instagram_url: formData.instagram_url.trim() || null,
        facebook_url: formData.facebook_url.trim() || null,
        tiktok_url: formData.tiktok_url.trim() || null,
        dietary_restrictions: formData.dietary_restrictions,
        allergens: formData.allergens,
        service_types: formData.service_types,
        price_range: formData.price_range || null,
        reservations_enabled: formData.reservations_enabled,
        dress_code: formData.dress_code?.trim() || null,
        parking: formData.parking?.trim() || null,
        opening_hours: formData.opening_hours
      };

      const { error } = await supabase
        .from('restaurants')
        .update(updateData)
        .eq('owner_id', session.user.id);

      if (error) throw error;

      // Update username in profiles table
      if (formData.username.trim()) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ username: formData.username.trim() })
          .eq('user_id', session.user.id);
        
        if (profileError) throw profileError;
      }

      // Always show success toast for profile save
      toast({
        title: t('restaurantProfile.saved'),
        description: t('restaurantProfile.savedSuccessfully')
      });

      // Close modal and trigger parent update
      handleClose();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error saving restaurant:', error);
      toast({
        title: t('restaurantProfile.error'),
        description: t('restaurantProfile.saveError'),
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={actuallyOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-4xl max-h-[95vh] overflow-y-auto [&>button]:w-8 [&>button]:h-8 p-0"
        aria-describedby="restaurant-profile-description"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t('restaurantProfile.title')}</DialogTitle>
          <DialogDescription id="restaurant-profile-description">
            {t('restaurantProfile.description')}
          </DialogDescription>
        </DialogHeader>
        
        {/* Header with padding */}
        <div className="px-2 sm:px-4 md:px-6 lg:px-8 pt-2 sm:pt-4">
          <div className="flex items-center justify-center">
            <h2 className="text-xl font-semibold text-center">{t('restaurantProfile.title')}</h2>
          </div>
        </div>

        {/* Content area */}
        <div className="px-2 sm:px-4 md:px-6 lg:px-8 pb-2 sm:pb-4 md:pb-6">
          <div className="space-y-6">
            {/* Facebook-style Header with Cover Photo and Logo */}
            <div className="relative">
              {/* Cover Photo Background */}
              <div className="relative w-full h-48 sm:h-64 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                {restaurant?.cover_image_url ? (
                  <img 
                    src={restaurant.cover_image_url} 
                    alt={t('restaurantProfile.coverImageAlt')}
                    className="w-full h-full object-cover"
                  />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                      <Camera className="h-16 w-16 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 font-medium">{t('restaurantProfile.noCoverPhoto')}</p>
                    </div>
                  )}
                
                {/* Cover Photo Hover Effect Only - No Click */}
                <div className="absolute inset-0 group">
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200" />
                </div>

                {/* Floating Edit Button - Always visible for better UX */}
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-3 right-3 bg-white hover:bg-white/90 text-gray-700 shadow-lg border z-50"
                  onMouseDown={() => console.log('🟡 Button mouse down')}
                  onMouseUp={() => console.log('🟡 Button mouse up')}
                  onClick={() => {
                    // Use file input instead
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => handleFileUpload(e as any, 'cover');
                    input.click();
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  {restaurant?.cover_image_url ? t('restaurantProfile.editCover') : t('restaurantProfile.addCover')}
                </Button>

                {/* Dark overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              </div>

              {/* Logo and Restaurant Info Overlay */}
              <div className="absolute -bottom-6 left-6 flex items-end gap-4">
                {/* Logo */}
                <div className="relative">
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
                    {restaurant?.logo_url ? (
                      <img 
                        src={restaurant.logo_url} 
                        alt={t('restaurantProfile.logoAlt')}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <User className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Logo Click Handler */}
                  <div 
                    className="absolute inset-0 cursor-pointer group rounded-full overflow-hidden"
                    onClick={() => {
                      // Use file input for logo
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => handleFileUpload(e as any, 'logo');
                      input.click();
                    }}
                  >
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Camera className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Spacer for the overlay */}
            <div className="h-8"></div>

            {/* Tabs for Profile and Account Settings */}
            <Tabs defaultValue="profile" className="w-full space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t('profile.profileTab')}
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {t('profile.securityTab')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6 mt-6">

            {/* Rest of the form */}
            <div className="space-y-2">
              <Label htmlFor="name">{t('restaurantProfile.restaurantName')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('restaurantProfile.restaurantNamePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">{t('restaurantProfile.username')}</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder={t('restaurantProfile.usernamePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="description">{t('restaurantProfile.description')}</Label>
                <span className={`text-xs ${
                  formData.description.length > 450 
                    ? 'text-orange-500' 
                    : 'text-muted-foreground'
                }`}>
                  {formData.description.length}/1000
                </span>
              </div>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => {
                  if (e.target.value.length <= 1000) {
                    setFormData(prev => ({ ...prev, description: e.target.value }));
                  }
                }}
                placeholder={t('restaurantProfile.descriptionPlaceholder')}
                className="min-h-[120px]"
                maxLength={1000}
              />
              {formData.description.length > 950 && (
                <p className="text-xs text-muted-foreground">
                  {t('restaurantProfile.charactersRemaining', { count: 1000 - formData.description.length })}
                </p>
              )}
            </div>

            <AddressAutocomplete
              value={formData.address}
              onChange={(address) => setFormData(prev => ({ ...prev, address }))}
              label={t('restaurantProfile.address')}
              placeholder={t('restaurantProfile.addressPlaceholder')}
            />

            <div className="space-y-2">
              <Label htmlFor="phone">{t('restaurantProfile.phone')}</Label>
               <Input
                 id="phone"
                 value={formData.phone}
                 onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                 placeholder="+1 (514) 465-4783"
                 autoComplete="off"
                 autoCorrect="off"
                 autoCapitalize="off"
                 spellCheck="false"
               />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('restaurantProfile.email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder={t('auth.form.emailPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram_url" className="flex items-center gap-2">
                <Instagram className="h-4 w-4" />
                Instagram
              </Label>
              <Input
                id="instagram_url"
                type="url"
                value={formData.instagram_url}
                onChange={(e) => setFormData(prev => ({ ...prev, instagram_url: e.target.value }))}
                placeholder={t('restaurantProfile.instagramPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facebook_url" className="flex items-center gap-2">
                <Facebook className="h-4 w-4" />
                Facebook
              </Label>
              <Input
                id="facebook_url"
                type="url"
                value={formData.facebook_url}
                onChange={(e) => setFormData(prev => ({ ...prev, facebook_url: e.target.value }))}
                placeholder={t('restaurantProfile.facebookPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktok_url" className="flex items-center gap-2">
                <Music2 className="h-4 w-4" />
                TikTok
              </Label>
              <Input
                id="tiktok_url"
                type="url"
                value={formData.tiktok_url}
                onChange={(e) => setFormData(prev => ({ ...prev, tiktok_url: e.target.value }))}
                placeholder="https://www.tiktok.com/@votrerestaurant"
              />
            </div>

            <Separator />

            {/* Code vestimentaire */}
            <div className="space-y-2">
              <Label htmlFor="dress_code">{t('restaurantProfile.dressCode')}</Label>
              <Textarea
                id="dress_code"
                value={formData.dress_code || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, dress_code: e.target.value }))}
                placeholder={t('restaurantProfile.dressCodePlaceholder')}
                rows={2}
              />
            </div>

            {/* Stationnement */}
            <div className="space-y-2">
              <Label htmlFor="parking">{t('restaurantProfile.parking')}</Label>
              <Textarea
                id="parking"
                value={formData.parking || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, parking: e.target.value }))}
                placeholder={t('restaurantProfile.parkingPlaceholder')}
                rows={2}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>{t('restaurantProfile.openingHours')}</Label>
              <p className="text-sm text-muted-foreground">{t('restaurantProfile.openingHoursDescription')}</p>
              <div className="space-y-2">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                  const hours = formData.opening_hours[day as keyof typeof formData.opening_hours];
                  if (!hours) return null;
                  
                  const copyHoursToClipboard = async () => {
                    const textToCopy = `${hours.open}-${hours.close}`;
                    try {
                      await navigator.clipboard.writeText(textToCopy);
                      toast({
                        title: t('restaurantProfile.hoursCopied'),
                        description: t('restaurantProfile.hoursCopiedDesc')
                      });
                    } catch (err) {
                      toast({
                        title: t('restaurantProfile.error'),
                        description: t('restaurantProfile.copyError'),
                        variant: "destructive"
                      });
                    }
                  };
                  
                  return (
                    <div key={day} className="flex items-center gap-2">
                      <div className="w-20 text-sm font-medium">
                        {t(`restaurantProfile.${day}`)}
                      </div>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="checkbox"
                        checked={!hours.closed}
                        onChange={(e) => {
                          const newHours = { ...formData.opening_hours };
                          newHours[day as keyof typeof newHours].closed = !e.target.checked;
                          setFormData(prev => ({ ...prev, opening_hours: newHours }));
                        }}
                        className="rounded border-gray-300"
                      />
                      {!hours.closed && (
                        <>
                          <Input
                            type="time"
                            value={hours.open}
                            onChange={(e) => {
                              const newHours = { ...formData.opening_hours };
                              newHours[day as keyof typeof newHours].open = e.target.value;
                              setFormData(prev => ({ ...prev, opening_hours: newHours }));
                            }}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">à</span>
                          <Input
                            type="time"
                            value={hours.close}
                            onChange={(e) => {
                              const newHours = { ...formData.opening_hours };
                              newHours[day as keyof typeof newHours].close = e.target.value;
                              setFormData(prev => ({ ...prev, opening_hours: newHours }));
                            }}
                            className="w-24"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={copyHoursToClipboard}
                            className="h-8 px-2 text-xs"
                            title={t('restaurantProfile.copyHours')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      {hours.closed && (
                        <span className="text-sm text-muted-foreground">{t('restaurantProfile.closed')}</span>
                      )}
                     </div>
                   </div>
                 );
                 })}
               </div>
            </div>


            <Separator />

            {/* Holidays Section */}
            {restaurant && (
              <HolidaysSection restaurantId={restaurant.id} />
            )}

            <Separator />

            <div className="space-y-2">
              <Label>{t('restaurantProfile.priceRange')}</Label>
              <p className="text-sm text-muted-foreground">{t('restaurantProfile.priceRangeDesc')}</p>
              <Select 
                value={formData.price_range} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, price_range: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('restaurantProfile.priceRangePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_RANGE_OPTIONS.map((range) => (
                    <SelectItem key={range} value={range}>
                       {PRICE_RANGE_TRANSLATIONS[range as keyof typeof PRICE_RANGE_TRANSLATIONS]?.[i18n.language as 'fr' | 'en'] || 
                        range}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('restaurant.cuisineType')}</Label>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background min-h-[40px]">
                {CUISINE_OPTIONS.sort().map((cuisine) => (
                  <Badge
                    key={cuisine}
                    variant={formData.cuisine_type.includes(cuisine) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        cuisine_type: prev.cuisine_type.includes(cuisine)
                          ? prev.cuisine_type.filter(c => c !== cuisine)
                          : [...prev.cuisine_type, cuisine]
                      }));
                    }}
                  >
                    {CUISINE_TRANSLATIONS[cuisine as keyof typeof CUISINE_TRANSLATIONS]?.[i18n.language as 'fr' | 'en'] || cuisine}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('restaurant.serviceTypes')}</Label>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background min-h-[40px]">
                {SERVICE_TYPES_OPTIONS.sort().map((service) => (
                  <Badge
                    key={service}
                    variant={formData.service_types.includes(service) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        service_types: prev.service_types.includes(service)
                          ? prev.service_types.filter(s => s !== service)
                          : [...prev.service_types, service]
                      }));
                    }}
                  >
                    {SERVICE_TYPES_TRANSLATIONS[service as keyof typeof SERVICE_TYPES_TRANSLATIONS]?.[i18n.language as 'fr' | 'en'] || service}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialties">{t('restaurantProfile.specialties')}</Label>
              <Input
                id="specialties"
                value={specialtyInput}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.includes(',')) {
                    const newSpecialty = value.replace(',', '').trim();
                    if (newSpecialty && !formData.restaurant_specialties.includes(newSpecialty)) {
                      setFormData(prev => ({ 
                        ...prev, 
                        restaurant_specialties: [...prev.restaurant_specialties, newSpecialty] 
                      }));
                    }
                    setSpecialtyInput('');
                  } else {
                    setSpecialtyInput(value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === ',' || e.key === 'Enter') {
                    e.preventDefault();
                    const value = specialtyInput.trim();
                    if (value && !formData.restaurant_specialties.includes(value)) {
                      setFormData(prev => ({ 
                        ...prev, 
                        restaurant_specialties: [...prev.restaurant_specialties, value] 
                      }));
                      setSpecialtyInput('');
                    }
                  }
                }}
                placeholder={t('restaurantProfile.specialtiesPlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('restaurantProfile.specialtiesHint')}
              </p>
              {formData.restaurant_specialties.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.restaurant_specialties.map((specialty, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {specialty}
                      <X 
                        className="h-3 w-3 ml-1 cursor-pointer" 
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          restaurant_specialties: prev.restaurant_specialties.filter((_, i) => i !== index) 
                        }))}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-6 mt-6">
              <AccountSettingsSection
                currentEmail={formData.email}
                currentPhone={formData.phone}
                onSuccess={() => {
                  toast({
                    title: t('profile.settingsUpdated'),
                    description: t('profile.settingsUpdatedDesc'),
                  });
                }}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => {
              onClose?.();
              onOpenChange?.(false);
            }}>
              {t('restaurantProfile.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
              {t('restaurantProfile.save')}
            </Button>
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Photo Adjustment Modals */}
    <PhotoAdjustmentModal
      open={logoAdjustmentOpen}
      onOpenChange={setLogoAdjustmentOpen}
      imageUrl={tempLogoUrl}
      onSave={(adjustedData) => handleAdjustedImageSave(adjustedData, 'logo')}
      title={t('photoAdjustment.adjustProfilePhoto')}
    />

    <PhotoAdjustmentModal
      open={coverAdjustmentOpen}
      onOpenChange={setCoverAdjustmentOpen}
      imageUrl={tempCoverUrl}
      onSave={(adjustedData) => handleAdjustedImageSave(adjustedData, 'cover')}
      title={t('photoAdjustment.adjustCoverPhoto')}
    />
    </>
  );
};

// Legacy export for compatibility
export const RestaurantProfileModal = ImprovedRestaurantProfileModal;
