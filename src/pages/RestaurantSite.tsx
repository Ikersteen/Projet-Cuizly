import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Instagram, 
  Facebook, 
  Calendar,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { ReservationModal } from '@/components/ReservationModal';

interface WebsiteData {
  website_config: any;
  restaurant_data: any;
}

export default function RestaurantSite() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const [data, setData] = useState<WebsiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);

  useEffect(() => {
    const loadWebsite = async () => {
      if (!subdomain) {
        setError('Site non trouvé');
        setLoading(false);
        return;
      }

      try {
        const { data: result, error: fetchError } = await supabase
          .rpc('get_public_website', { website_subdomain: subdomain });

        if (fetchError) throw fetchError;

        if (result && result.length > 0) {
          setData(result[0]);
        } else {
          setError('Site non trouvé');
        }
      } catch (err) {
        console.error('Error loading website:', err);
        setError('Erreur lors du chargement du site');
      } finally {
        setLoading(false);
      }
    };

    loadWebsite();
  }, [subdomain]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
          <p className="text-muted-foreground">{error || 'Site non trouvé'}</p>
        </div>
      </div>
    );
  }

  const { website_config: config, restaurant_data: restaurant } = data;

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // Parse opening hours
  const openingHours = restaurant.opening_hours || {};

  return (
    <>
      <Helmet>
        <title>{config.meta_title || restaurant.name}</title>
        <meta name="description" content={config.meta_description || restaurant.description} />
        {config.meta_keywords && (
          <meta name="keywords" content={config.meta_keywords.join(', ')} />
        )}
        <style>{`
          :root {
            --site-primary: ${config.theme_color || '#FF6B35'};
            --site-secondary: ${config.secondary_color || '#1A1A2E'};
          }
          body {
            font-family: '${config.font_family || 'Inter'}', sans-serif;
          }
        `}</style>
        {config.google_analytics_id && (
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${config.google_analytics_id}`} />
        )}
      </Helmet>

      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b">
          <div className="container mx-auto px-4">
            <div className={`flex items-center h-16 ${
              config.logo_position === 'center' ? 'justify-center' : 
              config.logo_position === 'right' ? 'justify-end' : 'justify-between'
            }`}>
              <div className={`flex items-center gap-3 ${config.logo_position === 'center' ? 'absolute left-4' : ''}`}>
                {restaurant.logo_url && (
                  <img src={restaurant.logo_url} alt={restaurant.name} className="h-10 w-auto" />
                )}
                {config.logo_position !== 'center' && (
                  <span className="font-bold text-xl" style={{ color: config.secondary_color }}>
                    {restaurant.name}
                  </span>
                )}
              </div>

              {config.logo_position === 'center' && (
                <span className="font-bold text-xl" style={{ color: config.secondary_color }}>
                  {restaurant.name}
                </span>
              )}

              <div className="hidden md:flex items-center gap-6">
                {config.about_enabled && (
                  <button onClick={() => scrollToSection('about')} className="text-sm hover:opacity-70">
                    À propos
                  </button>
                )}
                {config.menu_enabled && (
                  <button onClick={() => scrollToSection('menu')} className="text-sm hover:opacity-70">
                    Menu
                  </button>
                )}
                {config.gallery_enabled && (
                  <button onClick={() => scrollToSection('gallery')} className="text-sm hover:opacity-70">
                    Galerie
                  </button>
                )}
                {config.contact_enabled && (
                  <button onClick={() => scrollToSection('contact')} className="text-sm hover:opacity-70">
                    Contact
                  </button>
                )}
                {config.reservations_enabled && restaurant.reservations_enabled && (
                  <Button 
                    size="sm" 
                    onClick={() => setReservationModalOpen(true)}
                    style={{ backgroundColor: config.theme_color }}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Réserver
                  </Button>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section 
          className="relative min-h-screen flex items-center justify-center"
          style={{
            backgroundImage: config.hero_image_url || restaurant.cover_image_url 
              ? `url(${config.hero_image_url || restaurant.cover_image_url})` 
              : undefined,
            backgroundColor: config.secondary_color,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 text-center text-white px-4 max-w-4xl">
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              {config.hero_title || restaurant.name}
            </h1>
            {(config.hero_subtitle || restaurant.description) && (
              <p className="text-xl md:text-2xl mb-8 opacity-90">
                {config.hero_subtitle || restaurant.description}
              </p>
            )}
            {restaurant.cuisine_type && restaurant.cuisine_type.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {restaurant.cuisine_type.map((cuisine: string) => (
                  <Badge key={cuisine} variant="secondary" className="bg-white/20 text-white border-none">
                    {cuisine}
                  </Badge>
                ))}
              </div>
            )}
            {config.hero_cta_enabled && config.reservations_enabled && restaurant.reservations_enabled && (
              <Button 
                size="lg" 
                onClick={() => setReservationModalOpen(true)}
                style={{ backgroundColor: config.theme_color }}
                className="text-lg px-8 py-6"
              >
                <Calendar className="h-5 w-5 mr-2" />
                {config.hero_cta_text || 'Réserver une table'}
              </Button>
            )}
          </div>
          <button 
            onClick={() => scrollToSection('about')}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white animate-bounce"
          >
            <ChevronDown className="h-8 w-8" />
          </button>
        </section>

        {/* About Section */}
        {config.about_enabled && (
          <section id="about" className="py-20 px-4">
            <div className="container mx-auto max-w-4xl">
              <h2 className="text-4xl font-bold text-center mb-12" style={{ color: config.secondary_color }}>
                {config.about_title || 'À propos'}
              </h2>
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    {config.about_content || restaurant.description_fr || restaurant.description}
                  </p>
                  {restaurant.restaurant_specialties && restaurant.restaurant_specialties.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-semibold mb-3">Nos spécialités</h3>
                      <div className="flex flex-wrap gap-2">
                        {restaurant.restaurant_specialties.map((specialty: string) => (
                          <Badge key={specialty} style={{ backgroundColor: config.theme_color }}>
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {(config.about_image_url || restaurant.logo_url) && (
                  <div>
                    <img 
                      src={config.about_image_url || restaurant.logo_url} 
                      alt={restaurant.name}
                      className="rounded-lg shadow-lg w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Menu Section */}
        {config.menu_enabled && (
          <section id="menu" className="py-20 px-4 bg-gray-50">
            <div className="container mx-auto max-w-4xl">
              <h2 className="text-4xl font-bold text-center mb-12" style={{ color: config.secondary_color }}>
                {config.menu_title || 'Notre Menu'}
              </h2>
              <div className="text-center">
                <p className="text-gray-600 mb-8">
                  Découvrez notre sélection de plats préparés avec des ingrédients frais et de qualité.
                </p>
                {restaurant.dietary_restrictions && restaurant.dietary_restrictions.length > 0 && (
                  <div className="mb-8">
                    <h3 className="font-semibold mb-3">Options alimentaires</h3>
                    <div className="flex flex-wrap justify-center gap-2">
                      {restaurant.dietary_restrictions.map((diet: string) => (
                        <Badge key={diet} variant="outline">
                          {diet}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="lg"
                  style={{ borderColor: config.theme_color, color: config.theme_color }}
                >
                  Voir le menu complet
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Gallery Section */}
        {config.gallery_enabled && config.gallery_images && config.gallery_images.length > 0 && (
          <section id="gallery" className="py-20 px-4">
            <div className="container mx-auto max-w-6xl">
              <h2 className="text-4xl font-bold text-center mb-12" style={{ color: config.secondary_color }}>
                {config.gallery_title || 'Galerie'}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {config.gallery_images.map((image: string, index: number) => (
                  <div key={index} className="aspect-square overflow-hidden rounded-lg">
                    <img 
                      src={image} 
                      alt={`${restaurant.name} - Photo ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Contact Section */}
        {config.contact_enabled && (
          <section id="contact" className="py-20 px-4 bg-gray-50">
            <div className="container mx-auto max-w-4xl">
              <h2 className="text-4xl font-bold text-center mb-12" style={{ color: config.secondary_color }}>
                {config.contact_title || 'Contact'}
              </h2>
              <div className="grid md:grid-cols-2 gap-12">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    {restaurant.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 mt-1" style={{ color: config.theme_color }} />
                        <div>
                          <p className="font-medium">Adresse</p>
                          <p className="text-gray-600">{restaurant.address}</p>
                        </div>
                      </div>
                    )}
                    {restaurant.phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 mt-1" style={{ color: config.theme_color }} />
                        <div>
                          <p className="font-medium">Téléphone</p>
                          <a href={`tel:${restaurant.phone}`} className="text-gray-600 hover:underline">
                            {restaurant.phone}
                          </a>
                        </div>
                      </div>
                    )}
                    {restaurant.email && (
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 mt-1" style={{ color: config.theme_color }} />
                        <div>
                          <p className="font-medium">Email</p>
                          <a href={`mailto:${restaurant.email}`} className="text-gray-600 hover:underline">
                            {restaurant.email}
                          </a>
                        </div>
                      </div>
                    )}
                    {config.show_social_links && (
                      <div className="flex gap-4 pt-4">
                        {restaurant.instagram_url && (
                          <a href={restaurant.instagram_url} target="_blank" rel="noopener noreferrer">
                            <Instagram className="h-6 w-6" style={{ color: config.theme_color }} />
                          </a>
                        )}
                        {restaurant.facebook_url && (
                          <a href={restaurant.facebook_url} target="_blank" rel="noopener noreferrer">
                            <Facebook className="h-6 w-6" style={{ color: config.theme_color }} />
                          </a>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {config.show_opening_hours && Object.keys(openingHours).length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Clock className="h-5 w-5" style={{ color: config.theme_color }} />
                        <h3 className="font-semibold">Horaires d'ouverture</h3>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(openingHours).map(([day, hours]: [string, any]) => (
                          <div key={day} className="flex justify-between text-sm">
                            <span className="capitalize">{day}</span>
                            <span className="text-gray-600">{hours || 'Fermé'}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Reservation Section */}
        {config.reservations_enabled && restaurant.reservations_enabled && (
          <section id="reservations" className="py-20 px-4" style={{ backgroundColor: config.theme_color }}>
            <div className="container mx-auto max-w-2xl text-center text-white">
              <h2 className="text-4xl font-bold mb-6">
                {config.reservations_title || 'Réservations'}
              </h2>
              {config.reservations_description && (
                <p className="text-lg mb-8 opacity-90">
                  {config.reservations_description}
                </p>
              )}
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => setReservationModalOpen(true)}
                className="text-lg px-8 py-6"
              >
                <Calendar className="h-5 w-5 mr-2" />
                Réserver maintenant
              </Button>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="py-8 px-4 border-t">
          <div className="container mx-auto text-center text-gray-600">
            <p>&copy; {new Date().getFullYear()} {restaurant.name}. Tous droits réservés.</p>
            <p className="mt-2 text-sm">
              Site créé avec <a href="https://cuizly.ca" className="hover:underline" style={{ color: config.theme_color }}>Cuizly</a>
            </p>
          </div>
        </footer>
      </div>

      {/* Reservation Modal */}
      <ReservationModal
        isOpen={reservationModalOpen}
        onClose={() => setReservationModalOpen(false)}
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
      />
    </>
  );
}
