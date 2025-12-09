import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useRestaurantWebsite, WebsiteConfig } from '@/hooks/useRestaurantWebsite';
import { 
  Globe, 
  Palette, 
  Layout, 
  Image, 
  MessageSquare, 
  Calendar,
  Eye,
  Save,
  ExternalLink,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface WebsiteBuilderSectionProps {
  restaurantId: string;
  restaurantName: string;
}

export const WebsiteBuilderSection = ({ restaurantId, restaurantName }: WebsiteBuilderSectionProps) => {
  const { t } = useTranslation();
  const { config, loading, saving, saveConfig, generateSubdomain, publishWebsite, unpublishWebsite } = useRestaurantWebsite(restaurantId);
  
  const [formData, setFormData] = useState<Partial<WebsiteConfig>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  useEffect(() => {
    if (config && formData) {
      const changed = JSON.stringify(config) !== JSON.stringify(formData);
      setHasChanges(changed);
    }
  }, [config, formData]);

  const handleChange = (field: keyof WebsiteConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await saveConfig(formData);
    setHasChanges(false);
  };

  const handleGenerateSubdomain = async () => {
    const subdomain = await generateSubdomain(restaurantName);
    if (subdomain) {
      handleChange('subdomain', subdomain);
    }
  };

  const handleTogglePublish = async () => {
    if (config?.is_published) {
      await unpublishWebsite();
    } else {
      // Ensure subdomain exists before publishing
      if (!formData.subdomain) {
        const subdomain = await generateSubdomain(restaurantName);
        if (subdomain) {
          await saveConfig({ ...formData, subdomain, is_published: true });
          return;
        }
      }
      await publishWebsite();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const websiteUrl = formData.subdomain 
    ? `https://${formData.subdomain}.cuizly.ca` 
    : null;

  return (
    <div className="space-y-6">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Créateur de Site Web</h2>
          <p className="text-muted-foreground">Créez et personnalisez le site vitrine de votre restaurant</p>
        </div>
        <div className="flex items-center gap-4">
          {formData.is_published ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Publié
            </Badge>
          ) : (
            <Badge variant="secondary">
              <XCircle className="h-3 w-3 mr-1" />
              Brouillon
            </Badge>
          )}
          <Button
            variant={formData.is_published ? "outline" : "default"}
            onClick={handleTogglePublish}
            disabled={saving}
          >
            {formData.is_published ? 'Dépublier' : 'Publier le site'}
          </Button>
        </div>
      </div>

      {/* Website URL */}
      {websiteUrl && formData.is_published && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <span className="font-medium">Votre site est en ligne:</span>
                <a 
                  href={websiteUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {websiteUrl}
                </a>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Voir le site
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Général</span>
          </TabsTrigger>
          <TabsTrigger value="design" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Design</span>
          </TabsTrigger>
          <TabsTrigger value="sections" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            <span className="hidden sm:inline">Sections</span>
          </TabsTrigger>
          <TabsTrigger value="gallery" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            <span className="hidden sm:inline">Galerie</span>
          </TabsTrigger>
          <TabsTrigger value="seo" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">SEO</span>
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Domaine et URL</CardTitle>
              <CardDescription>Configurez l'adresse de votre site web</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Sous-domaine Cuizly</Label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center">
                    <Input
                      value={formData.subdomain || ''}
                      onChange={(e) => handleChange('subdomain', e.target.value)}
                      placeholder="mon-restaurant"
                    />
                    <span className="ml-2 text-muted-foreground">.cuizly.ca</span>
                  </div>
                  <Button variant="outline" onClick={handleGenerateSubdomain}>
                    Générer
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Domaine personnalisé (optionnel)</Label>
                <Input
                  value={formData.custom_domain || ''}
                  onChange={(e) => handleChange('custom_domain', e.target.value)}
                  placeholder="www.monrestaurant.com"
                />
                <p className="text-sm text-muted-foreground">
                  Contactez-nous pour configurer votre domaine personnalisé
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Section Hero</CardTitle>
              <CardDescription>La première chose que vos visiteurs voient</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Titre principal</Label>
                <Input
                  value={formData.hero_title || ''}
                  onChange={(e) => handleChange('hero_title', e.target.value)}
                  placeholder={restaurantName}
                />
              </div>

              <div className="space-y-2">
                <Label>Sous-titre</Label>
                <Textarea
                  value={formData.hero_subtitle || ''}
                  onChange={(e) => handleChange('hero_subtitle', e.target.value)}
                  placeholder="Une expérience culinaire unique..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Image de fond (URL)</Label>
                <Input
                  value={formData.hero_image_url || ''}
                  onChange={(e) => handleChange('hero_image_url', e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Bouton de réservation</Label>
                  <p className="text-sm text-muted-foreground">Afficher le bouton d'appel à l'action</p>
                </div>
                <Switch
                  checked={formData.hero_cta_enabled}
                  onCheckedChange={(checked) => handleChange('hero_cta_enabled', checked)}
                />
              </div>

              {formData.hero_cta_enabled && (
                <div className="space-y-2">
                  <Label>Texte du bouton</Label>
                  <Input
                    value={formData.hero_cta_text || ''}
                    onChange={(e) => handleChange('hero_cta_text', e.target.value)}
                    placeholder="Réserver une table"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Design Tab */}
        <TabsContent value="design" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Couleurs</CardTitle>
              <CardDescription>Personnalisez les couleurs de votre site</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Couleur principale</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.theme_color || '#FF6B35'}
                      onChange={(e) => handleChange('theme_color', e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.theme_color || '#FF6B35'}
                      onChange={(e) => handleChange('theme_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Couleur secondaire</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.secondary_color || '#1A1A2E'}
                      onChange={(e) => handleChange('secondary_color', e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.secondary_color || '#1A1A2E'}
                      onChange={(e) => handleChange('secondary_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Typographie</CardTitle>
              <CardDescription>Choisissez la police de caractères</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Police principale</Label>
                <Select
                  value={formData.font_family || 'Inter'}
                  onValueChange={(value) => handleChange('font_family', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter</SelectItem>
                    <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                    <SelectItem value="Montserrat">Montserrat</SelectItem>
                    <SelectItem value="Lora">Lora</SelectItem>
                    <SelectItem value="Roboto">Roboto</SelectItem>
                    <SelectItem value="Open Sans">Open Sans</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Position du logo</Label>
                <Select
                  value={formData.logo_position || 'left'}
                  onValueChange={(value) => handleChange('logo_position', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Gauche</SelectItem>
                    <SelectItem value="center">Centre</SelectItem>
                    <SelectItem value="right">Droite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sections Tab */}
        <TabsContent value="sections" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>À propos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Activer cette section</Label>
                <Switch
                  checked={formData.about_enabled}
                  onCheckedChange={(checked) => handleChange('about_enabled', checked)}
                />
              </div>

              {formData.about_enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={formData.about_title || ''}
                      onChange={(e) => handleChange('about_title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contenu</Label>
                    <Textarea
                      value={formData.about_content || ''}
                      onChange={(e) => handleChange('about_content', e.target.value)}
                      rows={4}
                      placeholder="Décrivez votre restaurant, son histoire, sa philosophie..."
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Menu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Activer cette section</Label>
                <Switch
                  checked={formData.menu_enabled}
                  onCheckedChange={(checked) => handleChange('menu_enabled', checked)}
                />
              </div>

              {formData.menu_enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={formData.menu_title || ''}
                      onChange={(e) => handleChange('menu_title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Style d'affichage</Label>
                    <Select
                      value={formData.menu_display_style || 'grid'}
                      onValueChange={(value) => handleChange('menu_display_style', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grid">Grille</SelectItem>
                        <SelectItem value="list">Liste</SelectItem>
                        <SelectItem value="carousel">Carousel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Réservations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Activer les réservations en ligne</Label>
                <Switch
                  checked={formData.reservations_enabled}
                  onCheckedChange={(checked) => handleChange('reservations_enabled', checked)}
                />
              </div>

              {formData.reservations_enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={formData.reservations_title || ''}
                      onChange={(e) => handleChange('reservations_title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.reservations_description || ''}
                      onChange={(e) => handleChange('reservations_description', e.target.value)}
                      rows={2}
                      placeholder="Instructions pour la réservation..."
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Activer cette section</Label>
                <Switch
                  checked={formData.contact_enabled}
                  onCheckedChange={(checked) => handleChange('contact_enabled', checked)}
                />
              </div>

              {formData.contact_enabled && (
                <>
                  <div className="flex items-center justify-between">
                    <Label>Afficher la carte</Label>
                    <Switch
                      checked={formData.show_map}
                      onCheckedChange={(checked) => handleChange('show_map', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Afficher les horaires</Label>
                    <Switch
                      checked={formData.show_opening_hours}
                      onCheckedChange={(checked) => handleChange('show_opening_hours', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Afficher les réseaux sociaux</Label>
                    <Switch
                      checked={formData.show_social_links}
                      onCheckedChange={(checked) => handleChange('show_social_links', checked)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gallery Tab */}
        <TabsContent value="gallery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Galerie Photos</CardTitle>
              <CardDescription>Ajoutez des images de votre restaurant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Activer la galerie</Label>
                <Switch
                  checked={formData.gallery_enabled}
                  onCheckedChange={(checked) => handleChange('gallery_enabled', checked)}
                />
              </div>

              {formData.gallery_enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={formData.gallery_title || ''}
                      onChange={(e) => handleChange('gallery_title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Images (URLs, une par ligne)</Label>
                    <Textarea
                      value={(formData.gallery_images || []).join('\n')}
                      onChange={(e) => handleChange('gallery_images', e.target.value.split('\n').filter(Boolean))}
                      rows={6}
                      placeholder="https://image1.jpg&#10;https://image2.jpg&#10;https://image3.jpg"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Référencement (SEO)</CardTitle>
              <CardDescription>Optimisez votre site pour les moteurs de recherche</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Titre SEO</Label>
                <Input
                  value={formData.meta_title || ''}
                  onChange={(e) => handleChange('meta_title', e.target.value)}
                  placeholder={`${restaurantName} - Restaurant à Montréal`}
                  maxLength={60}
                />
                <p className="text-sm text-muted-foreground">
                  {(formData.meta_title || '').length}/60 caractères
                </p>
              </div>

              <div className="space-y-2">
                <Label>Description SEO</Label>
                <Textarea
                  value={formData.meta_description || ''}
                  onChange={(e) => handleChange('meta_description', e.target.value)}
                  placeholder="Découvrez notre cuisine raffinée..."
                  rows={3}
                  maxLength={160}
                />
                <p className="text-sm text-muted-foreground">
                  {(formData.meta_description || '').length}/160 caractères
                </p>
              </div>

              <div className="space-y-2">
                <Label>Mots-clés (séparés par des virgules)</Label>
                <Input
                  value={(formData.meta_keywords || []).join(', ')}
                  onChange={(e) => handleChange('meta_keywords', e.target.value.split(',').map(k => k.trim()).filter(Boolean))}
                  placeholder="restaurant, gastronomie, montréal..."
                />
              </div>

              <div className="space-y-2">
                <Label>Google Analytics ID (optionnel)</Label>
                <Input
                  value={formData.google_analytics_id || ''}
                  onChange={(e) => handleChange('google_analytics_id', e.target.value)}
                  placeholder="G-XXXXXXXXXX"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save button */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button 
            size="lg" 
            onClick={handleSave} 
            disabled={saving}
            className="shadow-lg"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Sauvegarder les modifications
          </Button>
        </div>
      )}
    </div>
  );
};
