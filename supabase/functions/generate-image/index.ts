import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, language } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }
    
    console.log('Generating image with Lovable AI for prompt:', prompt);

    // Intelligent prompt enhancement based on content type
    const enhancePrompt = (userPrompt: string, lang: string) => {
      const lowercasePrompt = userPrompt.toLowerCase();
      
      // Detect image style/type from prompt
      const isArtistic = /art|painting|drawing|sketch|illustration|cartoon|anime|watercolor|oil painting|abstract/i.test(lowercasePrompt);
      const isPhoto = /photo|photograph|realistic|real|portrait|landscape|nature/i.test(lowercasePrompt);
      const isFood = /food|dish|meal|recipe|cuisine|restaurant|plat|repas|nourriture/i.test(lowercasePrompt);
      const isLogo = /logo|icon|brand|emblem|badge/i.test(lowercasePrompt);
      const is3D = /3d|render|cgi|digital art/i.test(lowercasePrompt);
      const isMinimal = /minimal|simple|clean|flat/i.test(lowercasePrompt);
      
      let stylePrefix = '';
      let styleSuffix = '';
      
      if (lang === 'en') {
        if (isArtistic) {
          stylePrefix = 'Beautiful artistic creation, masterful technique: ';
          styleSuffix = '. Rich details, expressive style, museum quality artwork.';
        } else if (isLogo) {
          stylePrefix = 'Professional logo design, clean vector style: ';
          styleSuffix = '. Modern, memorable, scalable design with perfect symmetry.';
        } else if (is3D) {
          stylePrefix = 'High-quality 3D render, cinematic lighting: ';
          styleSuffix = '. Octane render quality, realistic materials, dramatic composition.';
        } else if (isMinimal) {
          stylePrefix = 'Clean minimal design: ';
          styleSuffix = '. Simple, elegant, balanced composition with purposeful whitespace.';
        } else if (isFood) {
          stylePrefix = 'Professional food photography, appetizing presentation: ';
          styleSuffix = '. Gourmet styling, perfect lighting, mouth-watering details, 8K quality.';
        } else if (isPhoto) {
          stylePrefix = 'Professional photography, ultra high resolution: ';
          styleSuffix = '. Perfect lighting, sharp focus, vivid colors, 8K quality.';
        } else {
          stylePrefix = 'High quality, detailed image: ';
          styleSuffix = '. Professional quality, vivid colors, excellent composition, 4K resolution.';
        }
      } else {
        if (isArtistic) {
          stylePrefix = 'Belle création artistique, technique maîtrisée: ';
          styleSuffix = '. Détails riches, style expressif, qualité musée.';
        } else if (isLogo) {
          stylePrefix = 'Design de logo professionnel, style vectoriel épuré: ';
          styleSuffix = '. Moderne, mémorable, design scalable avec symétrie parfaite.';
        } else if (is3D) {
          stylePrefix = 'Rendu 3D haute qualité, éclairage cinématique: ';
          styleSuffix = '. Qualité Octane render, matériaux réalistes, composition dramatique.';
        } else if (isMinimal) {
          stylePrefix = 'Design minimaliste épuré: ';
          styleSuffix = '. Simple, élégant, composition équilibrée avec espaces blancs intentionnels.';
        } else if (isFood) {
          stylePrefix = 'Photographie culinaire professionnelle, présentation appétissante: ';
          styleSuffix = '. Style gastronomique, éclairage parfait, détails savoureux, qualité 8K.';
        } else if (isPhoto) {
          stylePrefix = 'Photographie professionnelle, ultra haute résolution: ';
          styleSuffix = '. Éclairage parfait, mise au point nette, couleurs vives, qualité 8K.';
        } else {
          stylePrefix = 'Image de haute qualité, détaillée: ';
          styleSuffix = '. Qualité professionnelle, couleurs vives, excellente composition, résolution 4K.';
        }
      }
      
      return `${stylePrefix}${userPrompt}${styleSuffix}`;
    };

    const enhancedPrompt = enhancePrompt(prompt, language || 'fr');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later.', success: false }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required, please add credits.', success: false }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Image generation response received');

    // Extract base64 image from Lovable AI response
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error('No image in response:', JSON.stringify(data));
      throw new Error('No image generated');
    }

    // Extract base64 data (remove data:image/png;base64, prefix if present)
    let imageBase64 = imageUrl;
    if (imageUrl.startsWith('data:')) {
      imageBase64 = imageUrl.split(',')[1];
    }

    console.log('Image generated successfully');

    return new Response(
      JSON.stringify({ 
        imageBase64,
        success: true 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-image function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
