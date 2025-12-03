import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import TextareaAutosize from 'react-textarea-autosize';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, MicOff, Volume2, VolumeX, Brain, ChefHat, User as UserIcon, Send, Keyboard, Square, ArrowDown, Plus, Image as ImageIcon, Camera, ThumbsUp, ThumbsDown, Copy, Bookmark, FileText, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import ThinkingIndicator from '@/components/ThinkingIndicator';
import TypewriterRichText from '@/components/TypewriterRichText';
import RichTextRenderer from '@/components/RichTextRenderer';
import { RealtimeVoiceClient } from '@/utils/RealtimeVoiceClient';
import { useConversations } from '@/hooks/useConversations';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useAnonymousTracking } from '@/hooks/useAnonymousTracking';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isAudio?: boolean;
  isProcessing?: boolean;
  isTyping?: boolean;
  imageUrl?: string;
  documentUrl?: string;
  documentName?: string;
}

interface VoiceChatInterfaceProps {
  onClose?: () => void;
}

const VoiceChatInterface: React.FC<VoiceChatInterfaceProps> = ({ onClose }) => {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [shouldStopTyping, setShouldStopTyping] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('text');
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [textInput, setTextInput] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Array<{id: string, type: 'image' | 'document', data: string, name: string}>>([]);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceDetectionRef = useRef<any>(null);
  const realtimeClientRef = useRef<RealtimeVoiceClient | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const thinkingIndicatorRef = useRef<HTMLDivElement | null>(null);
  
  const { createConversation, saveMessage } = useConversations();
  const { trackUserLocation } = useUserLocation();
  const [messageActions, setMessageActions] = useState<Record<string, { liked?: boolean; disliked?: boolean; copied?: boolean; bookmarked?: boolean }>>({});
  
  // Tracking de localisation pour utilisateurs anonymes
  useAnonymousTracking('Cuizly Assistant');

  useEffect(() => {
    const initUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        setIsAnonymous(false);
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        setUserProfile(profile);
        
        // Suivre la localisation de l'utilisateur
        await trackUserLocation('Cuizly Assistant');
        
        // Créer une nouvelle conversation pour stocker les messages (backend uniquement)
        const newConvId = await createConversation('voice');
        if (newConvId) {
          setCurrentConversationId(newConvId);
        }
      } else {
        // Utilisateur non connecté = mode anonyme
        setIsAnonymous(true);
        setUserId(null);
        setUserProfile(null);
        
        // Créer une nouvelle conversation anonyme pour le tracking backend uniquement
        const newConvId = await createConversation('voice');
        if (newConvId) {
          setCurrentConversationId(newConvId);
        }
      }
    };
    initUser();
  }, []);

  // Détection du scroll pour afficher/cacher l'indicateur
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      
      // Afficher l'indicateur seulement si:
      // 1. L'utilisateur n'est pas près du bas
      // 2. ET il y a un message en cours de génération (thinking, typing ou speaking)
      const hasActiveGeneration = isThinking || messages.some(msg => msg.isTyping) || isSpeaking;
      setShowScrollIndicator(!isNearBottom && hasActiveGeneration);
    };

    container.addEventListener('scroll', handleScroll);
    // Ne plus appeler handleScroll() automatiquement pour éviter le scroll automatique

    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages, isThinking, isSpeaking]);

  // Scroll automatique vers l'indicateur de réflexion
  useEffect(() => {
    if (isThinking && thinkingIndicatorRef.current) {
      thinkingIndicatorRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, [isThinking]);

  // Attach camera stream to video element
  useEffect(() => {
    if (cameraStream && videoRef.current && showCameraModal) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(err => console.error('Error playing video:', err));
    }
  }, [cameraStream, showCameraModal]);

  // Handle realtime voice messages
  const handleRealtimeMessage = (event: any) => {
    console.log('Realtime event:', event);
    
    switch (event.type) {
      case 'session.created':
        console.log('Session created');
        break;
      case 'response.audio.delta':
        setIsSpeaking(true);
        break;
      case 'response.audio.done':
        setIsSpeaking(false);
        // In conversation mode, restart recording after AI finishes
        if (isConversationActive && !isRecording) {
          setTimeout(() => {
            if (realtimeClientRef.current?.getConnectionStatus()) {
              setIsRecording(true);
            }
          }, 500);
        }
        break;
      case 'response.audio_transcript.delta':
        // Handle assistant transcript
        if (event.delta) {
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.type === 'assistant' && lastMessage.isTyping) {
              return [
                ...prev.slice(0, -1),
                {
                  ...lastMessage,
                  content: lastMessage.content + event.delta,
                }
              ];
            } else {
              return [
                ...prev,
                {
                  id: Date.now().toString(),
                  content: event.delta,
                  type: 'assistant',
                  timestamp: new Date(),
                  isAudio: true,
                  isProcessing: false,
                  isTyping: true,
                }
              ];
            }
          });
        }
        break;
      case 'response.audio_transcript.done':
        // Mark transcript as complete and save to database
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.type === 'assistant' && lastMessage.isTyping) {
            // Save assistant message to database
            if (currentConversationId && lastMessage.content) {
              saveMessage(currentConversationId, 'assistant', lastMessage.content, 'audio');
            }
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                isTyping: false,
              }
            ];
          }
          return prev;
        });
        break;
      case 'input_audio_buffer.speech_started':
        console.log('User started speaking');
        // Stop AI audio if playing
        if (isSpeaking && audioRef.current) {
          audioRef.current.pause();
          setIsSpeaking(false);
        }
        break;
      case 'input_audio_buffer.speech_stopped':
        console.log('User stopped speaking');
        break;
      case 'conversation.item.input_audio_transcription.completed':
        // Sauvegarder le message vocal de l'utilisateur
        if (event.transcript && currentConversationId) {
          console.log('User transcript:', event.transcript);
          saveMessage(currentConversationId, 'user', event.transcript, 'audio');
          
          // Ajouter le message à l'interface
          setMessages(prev => {
            // Vérifier si le message n'existe pas déjà
            const lastUserMessage = prev.filter(m => m.type === 'user').pop();
            if (!lastUserMessage || lastUserMessage.content !== event.transcript) {
              return [...prev, {
                id: Date.now().toString(),
                type: 'user',
                content: event.transcript,
                timestamp: new Date(),
                isAudio: true
              }];
            }
            return prev;
          });
        }
        break;
    }
  };

  // Voice Activity Detection for interruption
  const setupVoiceActivityDetection = (audioStream: MediaStream) => {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(audioStream);
    const analyser = audioContext.createAnalyser();
    
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    let silenceTimeout: NodeJS.Timeout | null = null;
    let isSpeakingDetected = false;
    
    const detectVoiceActivity = () => {
      if (!isConversationActive) return;
      
      analyser.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      const threshold = 15;
      
      if (average > threshold) {
        if (!isSpeakingDetected) {
          isSpeakingDetected = true;
          if (isSpeaking && audioRef.current) {
            console.log('User started speaking - interrupting AI');
            audioRef.current.pause();
            setIsSpeaking(false);
          }
          if (silenceTimeout) {
            clearTimeout(silenceTimeout);
            silenceTimeout = null;
          }
        }
      } else {
        if (isSpeakingDetected) {
          if (silenceTimeout) clearTimeout(silenceTimeout);
          silenceTimeout = setTimeout(() => {
            isSpeakingDetected = false;
            console.log('User stopped speaking');
          }, 1000);
        }
      }
      
      requestAnimationFrame(detectVoiceActivity);
    };
    
    detectVoiceActivity();
    
    return {
      stop: () => {
        if (silenceTimeout) clearTimeout(silenceTimeout);
        audioContext.close();
      }
    };
  };

  // Start continuous conversation mode with realtime
  const startConversation = async () => {
    try {
      setIsConversationActive(true);
      setIsRecording(true);
      console.log('Starting realtime conversation...');
      
      // Create conversation if needed (pour tracking backend)
      let conversationId = currentConversationId;
      if (!conversationId) {
        conversationId = await createConversation('voice');
        if (conversationId) {
          setCurrentConversationId(conversationId);
        }
      }
      
      // Initialize realtime voice client
      realtimeClientRef.current = new RealtimeVoiceClient(handleRealtimeMessage);
      await realtimeClientRef.current.connect();
      
      // Le système attend silencieusement que l'utilisateur parle
      
      console.log('Conversation démarrée - Vous pouvez maintenant parler naturellement avec Cuizly en temps réel');
    } catch (error) {
      console.error('Error starting realtime conversation:', error);
      setIsConversationActive(false);
      setIsRecording(false);
    }
  };

  // Stop conversation mode
  const stopConversation = () => {
    setIsConversationActive(false);
    setIsRecording(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    
    // Disconnect realtime client
    if (realtimeClientRef.current) {
      realtimeClientRef.current.disconnect();
      realtimeClientRef.current = null;
    }
    
    // Clean up old voice activity detection if exists
    if (voiceDetectionRef.current) {
      voiceDetectionRef.current.stop();
      voiceDetectionRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      setIsSpeaking(false);
    }
    
    console.log('Realtime conversation stopped');
  };

  // Audio recording functions
  const startRecording = async () => {
    if (!isConversationActive || !stream) return;
    
    try {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processVoiceInput(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (error) {
      console.error('Erreur enregistrement:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Process voice input
  const processVoiceInput = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    const userMessageId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: userMessageId,
      type: 'user',
      content: t('voiceChat.processingAudio'),
      timestamp: new Date(),
      isAudio: true,
      isProcessing: true
    }]);

    try {
      const audioBase64 = await blobToBase64(audioBlob);
      
      const transcriptionResponse = await supabase.functions.invoke('voice-to-text', {
        body: { audio: audioBase64.split(',')[1] }
      });

      if (transcriptionResponse.error) throw new Error(t('voiceAssistant.transcriptionFailed'));
      
      const transcription = transcriptionResponse.data?.text;
      if (!transcription) throw new Error(t('voiceAssistant.noTranscription'));

      setMessages(prev => prev.map(msg => 
        msg.id === userMessageId 
          ? { ...msg, content: transcription, isProcessing: false }
          : msg
      ));

      // Show thinking indicator
      setIsThinking(true);

      const chatResponse = await supabase.functions.invoke('cuizly-voice-chat', {
        body: { 
          message: transcription,
          userId,
          conversationHistory: messages.slice(-5),
          language: i18n.language === 'en' ? 'en' : 'fr'
        }
      });

      if (chatResponse.error) throw new Error(t('voiceAssistant.aiProcessingFailed'));

      const aiResponse = chatResponse.data?.response;
      if (!aiResponse) throw new Error(t('voiceAssistant.noAiResponse'));

      // Hide thinking indicator and show response with typing effect
      setIsThinking(false);
      const aiMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: aiMessageId,
        type: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        isTyping: true
      }]);

      const ttsResponse = await supabase.functions.invoke('cuizly-voice-elevenlabs', {
        body: { text: aiResponse }
      });

      if (ttsResponse.data?.audioContent) {
        const audioUrl = `data:audio/mp3;base64,${ttsResponse.data.audioContent}`;
        setAudioUrl(audioUrl);
        playAudio(audioUrl);
      }

    } catch (error) {
      console.error('Erreur traitement vocal:', error);
      setIsThinking(false);
      
      setMessages(prev => prev.filter(msg => msg.id !== userMessageId));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle image generation
  const handleImageGeneration = async (prompt: string) => {
    setIsProcessing(true);
    setIsThinking(true);

    try {
      const response = await supabase.functions.invoke('generate-image', {
        body: { 
          prompt,
          language: i18n.language === 'en' ? 'en' : 'fr'
        }
      });

      setIsThinking(false);

      if (response.error || !response.data?.success) {
        throw new Error('Image generation failed');
      }

      const imageBase64 = `data:image/png;base64,${response.data.imageBase64}`;
      
      const aiMessageId = Date.now().toString();
      setMessages(prev => [...prev, {
        id: aiMessageId,
        type: 'assistant',
        content: i18n.language === 'fr' ? '✨ Voici l\'image générée :' : '✨ Here is the generated image:',
        timestamp: new Date(),
        imageUrl: imageBase64,
        isTyping: false
      }]);

      toast({
        title: i18n.language === 'fr' ? 'Image générée' : 'Image generated',
        description: i18n.language === 'fr' ? 'Votre image a été créée avec succès' : 'Your image has been created successfully',
      });
    } catch (error) {
      console.error('Error generating image:', error);
      setIsThinking(false);
      toast({
        title: t('errors.title'),
        description: i18n.language === 'fr' ? 'Erreur lors de la génération de l\'image' : 'Error generating image',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Process text input
  const processTextInput = async (text: string) => {
    if (!text.trim()) return;

    // Detect image generation requests - include variants with and without accents
    const imageGenerationKeywords = [
      // French with accents
      'génère une image', 'génère moi une image', 'génère l\'image', 'génère-moi une image',
      'crée une image', 'crée moi une image', 'crée l\'image', 'crée-moi une image',
      // French without accents (important for user input)
      'genere une image', 'genere moi une image', 'genere l\'image', 'genere-moi une image',
      'cree une image', 'cree moi une image', 'cree l\'image', 'cree-moi une image',
      // Other French keywords
      'dessine', 'dessine moi', 'dessine-moi', 'illustre', 'fais une image', 'fais moi une image',
      'fait une image', 'fait moi une image', 'créer une image', 'creer une image',
      'générer une image', 'generer une image', 'fabrique une image',
      // English keywords
      'generate an image', 'generate image', 'create an image', 'create image',
      'draw', 'illustrate', 'make an image', 'make image', 'produce an image'
    ];

    // Normalize text by removing accents for comparison
    const normalizeText = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const normalizedText = normalizeText(text);
    
    const isImageRequest = imageGenerationKeywords.some(keyword => 
      normalizedText.includes(normalizeText(keyword))
    );

    if (isImageRequest) {
      // Extract the actual prompt by removing the trigger phrase
      let prompt = text;
      imageGenerationKeywords.forEach(keyword => {
        prompt = prompt.replace(new RegExp(keyword, 'gi'), '').trim();
      });
      
      // Add user message
      const userMessageId = Date.now().toString();
      setMessages(prev => [...prev, {
        id: userMessageId,
        type: 'user',
        content: text,
        timestamp: new Date(),
        isAudio: false
      }]);

      await handleImageGeneration(prompt || text);
      return;
    }
    
    setIsProcessing(true);
    
    // Create abort controller for this request
    const controller = new AbortController();
    setAbortController(controller);
    
    // Create conversation if needed (even for anonymous users)
    let conversationId = currentConversationId;
    if (!conversationId) {
      conversationId = await createConversation('text');
      if (conversationId) {
        setCurrentConversationId(conversationId);
      }
    }
    
    const userMessageId = Date.now().toString();
    const userMessage = {
      id: userMessageId,
      type: 'user' as const,
      content: text,
      timestamp: new Date(),
      isAudio: false
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Save user message to database (even for anonymous users)
    if (conversationId) {
      await saveMessage(conversationId, 'user', text, 'text');
    }

    try {
      // If realtime client is connected, send via realtime
      if (realtimeClientRef.current?.getConnectionStatus()) {
        await realtimeClientRef.current.sendMessage(text);
        setIsProcessing(false);
        return;
      }

      // Fallback to regular chat function for text mode
      setIsThinking(true);

      const chatResponse = await supabase.functions.invoke('cuizly-voice-chat', {
        body: { 
          message: text,
          userId,
          conversationHistory: messages.slice(-5),
          language: i18n.language === 'en' ? 'en' : 'fr'
        }
      });

      // Check if request was aborted
      if (controller.signal.aborted) {
        return;
      }

      if (chatResponse.error) throw new Error(t('voiceAssistant.aiProcessingFailed'));

      const aiResponse = chatResponse.data?.response;
      if (!aiResponse) throw new Error(t('voiceAssistant.noAiResponse'));

      // Hide thinking indicator and show response with typing effect
      setIsThinking(false);
      const aiMessageId = (Date.now() + 1).toString();
      const assistantMessage = {
        id: aiMessageId,
        type: 'assistant' as const,
        content: aiResponse,
        timestamp: new Date(),
        isTyping: true
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Save assistant message to database
      if (conversationId) {
        await saveMessage(conversationId, 'assistant', aiResponse, 'text');
      }

    } catch (error) {
      if (controller.signal.aborted) {
        console.log('Request was aborted by user');
        return;
      }
      
      console.error('Erreur traitement texte:', error);
      setIsThinking(false);
    } finally {
      setIsProcessing(false);
      setAbortController(null);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const playAudio = (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    audio.onplay = () => {
      console.log('AI started speaking');
      setIsSpeaking(true);
    };
    
    audio.onended = () => {
      console.log('AI finished speaking');
      setIsSpeaking(false);
      if (isConversationActive && !isRecording) {
        setTimeout(() => {
          startRecording();
        }, 500);
      }
    };
    
    audio.onerror = () => {
      setIsSpeaking(false);
      console.error('Erreur de lecture audio');
    };
    
    audio.play();
  };

  const toggleConversation = () => {
    if (isConversationActive) {
      stopConversation();
    } else {
      startConversation();
    }
  };

  const toggleRecording = () => {
    if (!isConversationActive) return;
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
  };

  const stopGeneration = () => {
    // Stop abort controller
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    
    // Signal typewriter to stop
    setShouldStopTyping(true);
    
    // Stop all states immediately
    setIsProcessing(false);
    setIsThinking(false);
    setIsSpeaking(false);
    
    // Stop audio immediately if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Clear audio URL to stop any pending audio
    setAudioUrl(null);
    
    console.log('Génération arrêtée - La génération de la réponse a été interrompue.');
  };

  const handleTypewriterStop = (partialText: string, messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content: partialText, isTyping: false }
        : msg
    ));
    setShouldStopTyping(false); // Reset the stop signal
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If there are selected files, process them with the text message
    if (selectedFiles.length > 0) {
      const filesToProcess = [...selectedFiles];
      const messageToSend = textInput.trim();
      
      // Clear immediately
      setSelectedFiles([]);
      setTextInput('');
      
      // Then process
      await processFilesWithMessage(filesToProcess, messageToSend);
      return;
    }
    
    // Otherwise, process text normally
    if (textInput.trim() && !isProcessing) {
      processTextInput(textInput);
      setTextInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit(e);
    }
  };

  // Camera functions
  const openCamera = async () => {
    // Always start with photo mode
    setCameraMode('photo');
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // On mobile, use native file input with camera
      cameraInputRef.current?.click();
    } else {
      // On desktop, use getUserMedia
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: true  // Always request audio for video capability
        });
        setCameraStream(stream);
        setShowCameraModal(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
        toast({
          title: t('errors.title'),
          description: i18n.language === 'fr' ? 'Impossible d\'accéder à la caméra' : 'Cannot access camera',
          variant: "destructive",
        });
      }
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (videoMediaRecorderRef.current && isRecordingVideo) {
      videoMediaRecorderRef.current.stop();
    }
    setShowCameraModal(false);
    setIsRecordingVideo(false);
    setRecordingTime(0);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        const compressedImage = await compressImage(imageData);
        
        const newFile = {
          id: Date.now().toString() + Math.random(),
          type: 'image' as const,
          data: compressedImage,
          name: `photo_${Date.now()}.jpg`
        };
        
        setSelectedFiles(prev => [...prev, newFile]);
        closeCamera();
        
        toast({
          description: i18n.language === 'fr' ? 'Photo capturée' : 'Photo captured',
        });
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.8);
  };

  const startVideoRecording = () => {
    if (!cameraStream) return;

    try {
      const mediaRecorder = new MediaRecorder(cameraStream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      videoChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        await handleVideoUpload(videoBlob);
      };

      mediaRecorder.start();
      videoMediaRecorderRef.current = mediaRecorder;
      setIsRecordingVideo(true);
      setRecordingTime(0);

      // Auto-stop after 30 seconds
      const recordingInterval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 29) {
            stopVideoRecording();
            clearInterval(recordingInterval);
            return 30;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Error starting video recording:', error);
      toast({
        title: t('errors.title'),
        description: i18n.language === 'fr' ? 'Erreur lors du démarrage de l\'enregistrement' : 'Error starting recording',
        variant: "destructive",
      });
    }
  };

  const stopVideoRecording = () => {
    if (videoMediaRecorderRef.current && isRecordingVideo) {
      videoMediaRecorderRef.current.stop();
      setIsRecordingVideo(false);
    }
  };

  const handleVideoUpload = async (videoBlob: Blob) => {
    closeCamera();
    setIsProcessing(true);
    setIsThinking(true);

    try {
      // Convert video to base64
      const videoBase64 = await blobToBase64(videoBlob);
      const base64Data = videoBase64.split(',')[1];

      // Add user message with video
      const userMessageId = Date.now().toString();
      setMessages(prev => [...prev, {
        id: userMessageId,
        type: 'user',
        content: i18n.language === 'fr' ? '📹 Vidéo envoyée' : '📹 Video sent',
        timestamp: new Date(),
        isAudio: false
      }]);

      // Stream the AI response
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-video`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            videoBase64: base64Data,
            userMessage: '',
            language: i18n.language === 'en' ? 'en' : 'fr'
          })
        }
      );

      setIsThinking(false);

      if (!response.ok || !response.body) {
        throw new Error('Failed to analyze video');
      }

      const aiMessageId = (Date.now() + 1).toString();
      let fullResponse = '';

      setMessages(prev => [...prev, {
        id: aiMessageId,
        type: 'assistant',
        content: '',
        timestamp: new Date(),
        isTyping: true
      }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                setMessages(prev => prev.map(msg =>
                  msg.id === aiMessageId
                    ? { ...msg, content: fullResponse }
                    : msg
                ));
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }

      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId
          ? { ...msg, isTyping: false }
          : msg
      ));

    } catch (error) {
      console.error('Error analyzing video:', error);
      setIsThinking(false);
      toast({
        title: t('errors.title'),
        description: i18n.language === 'fr' ? 'Erreur lors de l\'analyse de la vidéo' : 'Error analyzing video',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Recording timer effect
  useEffect(() => {
    if (isRecordingVideo && recordingTime >= 30) {
      stopVideoRecording();
    }
  }, [recordingTime, isRecordingVideo]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Check if any message is currently typing
  const hasTypingMessage = messages.some(msg => msg.isTyping);

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  };

  // Compress and resize image
  const compressImage = (base64: string, maxWidth = 512, maxHeight = 512, quality = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = base64;
    });
  };

  // Handle file upload (images and documents) - just store the files, don't send yet
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'document') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input to allow selecting the same file again
    e.target.value = '';

    // Check if we already have 5 files
    if (selectedFiles.length >= 5) {
      toast({
        title: t('errors.title'),
        description: i18n.language === 'fr' ? 'Vous pouvez ajouter jusqu\'à 5 fichiers maximum' : 'You can add up to 5 files maximum',
        variant: "destructive",
      });
      return;
    }

    // Check file type
    if (fileType === 'image' && !file.type.startsWith('image/')) {
      toast({
        title: t('errors.title'),
        description: t('errors.invalidFileType') || 'Veuillez sélectionner une image',
        variant: "destructive",
      });
      return;
    }

    if (fileType === 'document' && !['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
      toast({
        title: t('errors.title'),
        description: i18n.language === 'fr' ? 'Formats supportés : TXT, PDF, DOC, DOCX' : 'Supported formats: TXT, PDF, DOC, DOCX',
        variant: "destructive",
      });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target?.result as string;
        
        let processedData = fileData;
        let textContent = '';
        
        // Compress images before storing
        if (fileType === 'image') {
          processedData = await compressImage(fileData);
        }
        
        // Extract text from txt files
        if (fileType === 'document' && file.type === 'text/plain') {
          textContent = fileData.split(',')[1] ? atob(fileData.split(',')[1]) : '';
        }
        
        const newFile = {
          id: Date.now().toString() + Math.random(),
          type: fileType,
          data: processedData,
          name: file.name,
          textContent: textContent || undefined
        };
        
        setSelectedFiles(prev => [...prev, newFile]);
      };
      reader.onerror = () => {
        toast({
          title: t('errors.title'),
          description: t('errors.fileReadError') || 'Erreur lors de la lecture du fichier',
          variant: "destructive",
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: t('errors.title'),
        description: t('errors.fileReadError') || 'Erreur lors de la lecture du fichier',
        variant: "destructive",
      });
    }
  };

  // Process multiple files with optional text message
  const processFilesWithMessage = async (files: Array<{id: string, type: 'image' | 'document', data: string, name: string}>, message: string) => {
    setIsProcessing(true);
    
    // Create conversation if needed
    let conversationId = currentConversationId;
    if (!conversationId && userId) {
      conversationId = await createConversation('text');
      if (conversationId) {
        setCurrentConversationId(conversationId);
      }
    }
    
    try {
      // Upload all files to Supabase Storage
      const uploadedUrls: string[] = [];
      
      for (const file of files) {
        const base64Data = file.data.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        
        const bucketName = file.type === 'image' ? 'chat-images' : 'chat-documents';
        
        // Determine mime type based on file extension
        let mimeType = 'application/octet-stream';
        if (file.type === 'image') {
          mimeType = 'image/jpeg';
        } else if (file.name.endsWith('.txt')) {
          mimeType = 'text/plain';
        } else if (file.name.endsWith('.pdf')) {
          mimeType = 'application/pdf';
        }
        
        const blob = new Blob([byteArray], { type: mimeType });
        
        const timestamp = Date.now();
        const extension = file.name.split('.').pop() || (file.type === 'image' ? 'jpg' : 'txt');
        const fileName = `${userId || 'anonymous'}_${timestamp}_${Math.random().toString(36).substring(7)}.${extension}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, blob);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }
        
        // Get public URL for the uploaded file
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName);
        
        uploadedUrls.push(publicUrl);
      }
      
      // Always create a message if files are uploaded
      const userMessageId = Date.now().toString();
      const imageFile = files.find(f => f.type === 'image');
      const documentFile = files.find(f => f.type === 'document');
      
      const userMessage: Message = {
        id: userMessageId,
        type: 'user',
        content: message.trim(), // Empty string if no text
        timestamp: new Date(),
        isAudio: false,
        imageUrl: imageFile?.data,
        documentUrl: documentFile ? uploadedUrls[files.indexOf(documentFile)] : undefined,
        documentName: documentFile?.name
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Save user message to database with the file URLs
      if (conversationId) {
        await saveMessage(
          conversationId, 
          'user', 
          message.trim() || ' ', // Space if no text to indicate file only
          'text',
          undefined,
          undefined,
          uploadedUrls[0]
        );
      }
      
      // Clear selected files after sending
      setSelectedFiles([]);
    } catch (uploadError) {
      console.error('Error uploading files:', uploadError);
      toast({
        title: t('errors.title'),
        description: 'Erreur lors de l\'upload des fichiers',
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }
    
    // Analyze images or documents
    const imageFile = files.find(f => f.type === 'image');
    const documentFile = files.find(f => f.type === 'document');
    
    if (imageFile || documentFile) {
      setIsThinking(true);

      try {
        let response;
        
        if (imageFile) {
          // Call edge function to analyze the image
          response = await supabase.functions.invoke('analyze-food-image', {
            body: { 
              imageBase64: imageFile.data,
              userMessage: message,
              language: i18n.language === 'en' ? 'en' : 'fr'
            }
          });
        } else if (documentFile) {
          console.log('Processing document:', documentFile.name);
          setIsThinking(true);
          
          //  Extract document content (text or base64)
          let documentContent = '';
          
          // @ts-ignore - textContent may exist on document files
          if (documentFile.textContent) {
            // @ts-ignore
            documentContent = documentFile.textContent;
          } else {
            // For PDFs and binary files, send base64
            const base64Data = documentFile.data.split(',')[1];
            documentContent = base64Data;
          }
          
          // Create AI message placeholder
          const aiMessageId = (Date.now() + 1).toString();
          const aiMessage: Message = {
            id: aiMessageId,
            type: 'assistant',
            content: '',
            timestamp: new Date(),
            isTyping: false
          };
          setMessages(prev => [...prev, aiMessage]);
          
          try {
            // Stream document analysis
            const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZ2t6dm5ic2RuZmdtY3h0dXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MDU5NDksImV4cCI6MjA3MDk4MTk0OX0.VJZg2dWjtNydKV5RRRrl69XiOTv_1rya4IN5cI1MAzM';
            const streamResponse = await fetch('https://ffgkzvnbsdnfgmcxturx.supabase.co/functions/v1/analyze-document', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${anonKey}`
              },
              body: JSON.stringify({
                documentContent: documentContent.substring(0, 50000), // Limit size
                documentName: documentFile.name,
                language: i18n.language === 'en' ? 'en' : 'fr'
              })
            });

            if (!streamResponse.ok || !streamResponse.body) {
              throw new Error('Failed to start stream');
            }

            const reader = streamResponse.body.getReader();
            const decoder = new TextDecoder();
            let textBuffer = '';
            let streamDone = false;
            let accumulatedContent = '';

            // Process streaming response
            while (!streamDone) {
              const { done, value } = await reader.read();
              if (done) break;
              textBuffer += decoder.decode(value, { stream: true });

              // Process line-by-line
              let newlineIndex: number;
              while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
                let line = textBuffer.slice(0, newlineIndex);
                textBuffer = textBuffer.slice(newlineIndex + 1);

                if (line.endsWith("\r")) line = line.slice(0, -1);
                if (line.startsWith(":") || line.trim() === "") continue;
                if (!line.startsWith("data: ")) continue;

                const jsonStr = line.slice(6).trim();
                if (jsonStr === "[DONE]") {
                  streamDone = true;
                  break;
                }

                try {
                  const parsed = JSON.parse(jsonStr);
                  const content = parsed.choices?.[0]?.delta?.content as string | undefined;
                  if (content) {
                    accumulatedContent += content;
                    setMessages(prev => prev.map(msg => 
                      msg.id === aiMessageId 
                        ? { ...msg, content: accumulatedContent }
                        : msg
                    ));
                  }
                } catch {
                  textBuffer = line + "\n" + textBuffer;
                  break;
                }
              }
            }

            // Final flush
            if (textBuffer.trim()) {
              for (let raw of textBuffer.split("\n")) {
                if (!raw) continue;
                if (raw.endsWith("\r")) raw = raw.slice(0, -1);
                if (raw.startsWith(":") || raw.trim() === "") continue;
                if (!raw.startsWith("data: ")) continue;
                const jsonStr = raw.slice(6).trim();
                if (jsonStr === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(jsonStr);
                  const content = parsed.choices?.[0]?.delta?.content as string | undefined;
                  if (content) {
                    accumulatedContent += content;
                    setMessages(prev => prev.map(msg => 
                      msg.id === aiMessageId 
                        ? { ...msg, content: accumulatedContent }
                        : msg
                    ));
                  }
                } catch { }
              }
            }

            // Stop thinking, trigger typewriter
            setIsThinking(false);
            setMessages(prev => prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, isTyping: true }
                : msg
            ));

            // Save to database
            if (conversationId && accumulatedContent) {
              await saveMessage(conversationId, 'assistant', accumulatedContent, 'text');
            }
          } catch (error) {
            console.error('Error analyzing document:', error);
            toast({
              title: i18n.language === 'en' ? 'Error' : 'Erreur',
              description: i18n.language === 'en' ? 'Error analyzing document' : 'Erreur lors de l\'analyse du document',
              variant: 'destructive'
            });
            setMessages(prev => prev.filter(msg => msg.id !== aiMessageId));
            setIsThinking(false);
          }
        }

        // Handle image analysis (response variable is only set for images)
        if (imageFile && response) {
          if (response?.error) throw new Error(response.error.message);

          const analysis = response?.data?.response || response?.data?.analysis;
          if (!analysis) throw new Error('No analysis received');

          setIsThinking(false);
          
          // Add AI response
          const aiMessageId = (Date.now() + 1).toString();
          setMessages(prev => [...prev, {
            id: aiMessageId,
            type: 'assistant',
            content: analysis,
            timestamp: new Date(),
            isTyping: true
          }]);
          
          // Save assistant message to database
          if (conversationId) {
            await saveMessage(conversationId, 'assistant', analysis, 'text');
          }
        }

      } catch (error) {
        console.error('Error analyzing file:', error);
        setIsThinking(false);
        toast({
          title: t('errors.title'),
          description: imageFile 
            ? (t('errors.imageAnalysisFailed') || 'Erreur lors de l\'analyse de l\'image')
            : 'Erreur lors de l\'analyse du document',
          variant: "destructive",
        });
      }
    }
    
    setIsProcessing(false);
  };

  return (
    <>
      <main className="h-screen bg-background flex flex-col max-w-6xl mx-auto w-full relative md:overflow-auto overflow-hidden">
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto scrollbar-hide px-2 md:px-6 py-4 md:py-8 pb-32 md:pb-40 space-y-4 md:space-y-6 overscroll-contain"
          style={{ overflowAnchor: 'none' }}
        >
          
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 md:space-y-6 py-12 md:py-20 px-4">
              <img 
                src="/cuizly-assistant-logo.png" 
                alt="Cuizly Assistant Vocal"
                className="h-12 md:h-16 w-auto"
              />
              <div className="space-y-2 md:space-y-3 max-w-lg">
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {t('voiceChat.description')}
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[90%] md:max-w-[85%]`}>
                {message.imageUrl || message.documentUrl ? (
                  // If message has image or document, show it with optional text below
                  <div className="space-y-2">
                    {message.imageUrl && (
                      <div className="rounded-2xl overflow-hidden">
                        <img 
                          src={message.imageUrl} 
                          alt="Uploaded food" 
                          className="max-w-xs max-h-48 object-cover"
                        />
                      </div>
                    )}
                    {message.documentUrl && (
                      <div className="flex items-center gap-2 rounded-2xl px-4 py-3 bg-muted border border-border min-w-0">
                        <FileText className="w-5 h-5 flex-shrink-0 text-primary" />
                        <span className="text-sm font-medium truncate min-w-0 flex-1">{message.documentName || 'Document'}</span>
                      </div>
                    )}
                    {message.content && (
                      <div className={message.type === 'user' ? 'rounded-3xl px-6 py-4 bg-muted w-fit' : ''}>
                        <RichTextRenderer 
                          content={message.content} 
                          className="text-base leading-relaxed"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  // Otherwise show normal message bubble
                  <div className={`${
                    message.type === 'user' 
                      ? 'rounded-3xl px-4 md:px-6 py-3 md:py-4 bg-muted w-fit' 
                      : ''
                   } ${message.isProcessing ? 'animate-pulse' : ''}`}>
                    {message.isTyping && message.type === 'assistant' ? (
                      <TypewriterRichText 
                        text={message.content}
                        speed={20}
                        className="text-base leading-relaxed"
                        shouldStop={shouldStopTyping}
                        onComplete={() => {
                          setMessages(prev => prev.map(msg => 
                            msg.id === message.id 
                              ? { ...msg, isTyping: false }
                              : msg
                          ));
                        }}
                        onStopped={(partialText) => handleTypewriterStop(partialText, message.id)}
                      />
                    ) : (
                      <RichTextRenderer 
                        content={message.content} 
                        className="text-base leading-relaxed"
                      />
                    )}
                    {message.isAudio && (
                      <div className="flex items-center gap-2 text-xs mt-2 opacity-70">
                        <Volume2 className="w-3 h-3" />
                        <span>{t('voiceChat.voiceMessage')}</span>
                      </div>
                    )}
                    {message.isProcessing && (
                      <div className="flex items-center gap-2 text-xs mt-2 opacity-70">
                        <ThinkingIndicator />
                      </div>
                    )}
                  </div>
                )}
                
                {/* Action icons below messages - only show when message is complete and not during thinking */}
                {!message.isProcessing && !message.isTyping && !isThinking && (
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {message.type === 'user' ? (
                      // For user messages: only Copy icon
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-full transition-colors hover:bg-transparent"
                        onClick={() => {
                          navigator.clipboard.writeText(message.content);
                          setMessageActions(prev => ({
                            ...prev,
                            [message.id]: { ...prev[message.id], copied: true }
                          }));
                          toast({
                            description: "Message copié",
                            duration: 2000,
                          });
                          
                          // Reset après 1 seconde
                          setTimeout(() => {
                            setMessageActions(prev => ({
                              ...prev,
                              [message.id]: { ...prev[message.id], copied: false }
                            }));
                          }, 1000);
                        }}
                      >
                        <Copy 
                          className={`w-3.5 h-3.5 transition-all ${
                            messageActions[message.id]?.copied 
                              ? 'fill-black dark:fill-white stroke-black dark:stroke-white' 
                              : 'fill-none stroke-muted-foreground'
                          }`} 
                        />
                      </Button>
                    ) : (
                      // For assistant messages: Like, Dislike, Copy, Bookmark icons
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-full transition-colors hover:bg-transparent"
                          onClick={() => {
                            const wasLiked = messageActions[message.id]?.liked;
                            setMessageActions(prev => ({
                              ...prev,
                              [message.id]: { 
                                ...prev[message.id], 
                                liked: !prev[message.id]?.liked,
                                disliked: false
                              }
                            }));
                            // Only show toast when adding like, not removing
                            if (!wasLiked) {
                              toast({
                                description: "Thanks for your feedback!",
                                duration: 2000,
                              });
                            }
                          }}
                        >
                          <ThumbsUp 
                            className={`w-3.5 h-3.5 transition-all ${
                              messageActions[message.id]?.liked 
                                ? 'fill-black dark:fill-white stroke-black dark:stroke-white' 
                                : 'fill-none stroke-muted-foreground'
                            }`} 
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-full transition-colors hover:bg-transparent"
                          onClick={() => {
                            const wasDisliked = messageActions[message.id]?.disliked;
                            setMessageActions(prev => ({
                              ...prev,
                              [message.id]: { 
                                ...prev[message.id], 
                                disliked: !prev[message.id]?.disliked,
                                liked: false
                              }
                            }));
                            // Only show toast when adding dislike, not removing
                            if (!wasDisliked) {
                              toast({
                                description: "Thanks for your feedback!",
                                duration: 2000,
                              });
                            }
                          }}
                        >
                          <ThumbsDown 
                            className={`w-3.5 h-3.5 transition-all ${
                              messageActions[message.id]?.disliked 
                                ? 'fill-black dark:fill-white stroke-black dark:stroke-white' 
                                : 'fill-none stroke-muted-foreground'
                            }`} 
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-full transition-colors hover:bg-transparent"
                          onClick={() => {
                            navigator.clipboard.writeText(message.content);
                            setMessageActions(prev => ({
                              ...prev,
                              [message.id]: { ...prev[message.id], copied: true }
                            }));
                            toast({
                              description: "Response copied",
                              duration: 2000,
                            });
                            
                            // Reset après 1 seconde
                            setTimeout(() => {
                              setMessageActions(prev => ({
                                ...prev,
                                [message.id]: { ...prev[message.id], copied: false }
                              }));
                            }, 1000);
                          }}
                        >
                          <Copy 
                            className={`w-3.5 h-3.5 transition-all ${
                              messageActions[message.id]?.copied 
                                ? 'fill-black dark:fill-white stroke-black dark:stroke-white' 
                                : 'fill-none stroke-muted-foreground'
                            }`} 
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-full transition-colors hover:bg-transparent"
                          onClick={() => {
                            const wasBookmarked = messageActions[message.id]?.bookmarked;
                            setMessageActions(prev => ({
                              ...prev,
                              [message.id]: { ...prev[message.id], bookmarked: !prev[message.id]?.bookmarked }
                            }));
                            // Only show toast when adding bookmark, not removing
                            if (!wasBookmarked) {
                              toast({
                                description: "Response saved",
                                duration: 2000,
                              });
                            }
                          }}
                        >
                          <Bookmark 
                            className={`w-3.5 h-3.5 transition-all ${
                              messageActions[message.id]?.bookmarked 
                                ? 'fill-black dark:fill-white stroke-black dark:stroke-white' 
                                : 'fill-none stroke-muted-foreground'
                            }`} 
                          />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Thinking indicator when AI is processing */}
          {isThinking && (
            <div ref={thinkingIndicatorRef} className="flex justify-start">
              <div className="max-w-[85%]">
                <div>
                  <ThinkingIndicator className="py-2" />
                </div>
              </div>
            </div>
          )}
          
          {isSpeaking && (
            <div className="flex justify-start">
              <div className="flex items-center gap-3 bg-green-50 text-green-700 rounded-3xl px-6 py-4">
                <Volume2 className="w-5 h-5 animate-pulse" />
                <span className="text-sm font-medium">{t('voiceChat.assistantSpeaking')}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={stopAudio}
                  className="text-green-700 hover:bg-green-100"
                >
                  <VolumeX className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        
          {/* Indicateur de scroll pour descendre */}
          {showScrollIndicator && (
            <div className="fixed bottom-[120px] left-1/2 -translate-x-1/2 z-[60]">
              <Button
                onClick={scrollToBottom}
                variant="secondary"
                size="icon"
                className="rounded-full shadow-lg border border-border bg-background hover:bg-muted"
              >
                <ArrowDown className="w-4 h-4" />
              </Button>
            </div>
          )}
        </main>

      {/* Chat input et disclaimer - complètement indépendant */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm px-6 py-4 z-50">
        <form onSubmit={handleTextSubmit} className="space-y-3 max-w-4xl mx-auto">
          {/* Files preview */}
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {selectedFiles.map((file) => (
                <div key={file.id} className="relative inline-block group">
                  {file.type === 'image' ? (
                    <div className="relative">
                      <img 
                        src={file.data} 
                        alt={file.name} 
                        className="h-24 w-auto max-w-[120px] rounded-xl object-cover"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full p-0 bg-black hover:bg-black shadow-lg flex items-center justify-center md:h-1 md:w-1 lg:top-2 lg:right-2 lg:h-5 lg:w-5"
                        onClick={() => setSelectedFiles(prev => prev.filter(f => f.id !== file.id))}
                      >
                        <span className="text-white text-[20px] font-bold leading-none">×</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-border bg-muted min-w-[140px] max-w-[280px]">
                        <FileText className="w-5 h-5 flex-shrink-0 text-primary" />
                        <span className="text-sm truncate flex-1">{file.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full p-0 bg-black hover:bg-black shadow-lg flex items-center justify-center md:h-1 md:w-1 lg:top-2 lg:right-2 lg:h-5 lg:w-5"
                        onClick={() => setSelectedFiles(prev => prev.filter(f => f.id !== file.id))}
                      >
                        <span className="text-white text-[20px] font-bold leading-none">×</span>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-3 items-center">
            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'image')}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'image')}
              className="hidden"
              capture="user"
            />
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.rtf,.odt"
              onChange={(e) => handleFileUpload(e, 'document')}
              className="hidden"
            />
            
            {/* Dropdown menu for upload options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  disabled={isProcessing}
                  variant="outline"
                  className="rounded-full w-10 h-10 p-0 flex items-center justify-center flex-shrink-0 transition-none hover:scale-100"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="start" 
                className="w-56 bg-popover border-2 shadow-lg rounded-xl p-2"
                sideOffset={8}
              >
                <DropdownMenuItem 
                  onClick={openCamera}
                  className="rounded-lg px-4 py-3 cursor-pointer hover:bg-accent transition-colors"
                >
                  <Camera className="mr-3 h-5 w-5" />
                  <span className="font-medium">{i18n.language === 'fr' ? 'Caméra' : 'Camera'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    console.log('Gallery option clicked');
                    fileInputRef.current?.click();
                  }}
                  className="rounded-lg px-4 py-3 cursor-pointer hover:bg-accent transition-colors"
                >
                  <ImageIcon className="mr-3 h-5 w-5" />
                  <span className="font-medium">{t('voiceChat.choosePhoto') || 'Choisir une photo'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    console.log('Document option clicked');
                    pdfInputRef.current?.click();
                  }}
                  className="rounded-lg px-4 py-3 cursor-pointer hover:bg-accent transition-colors"
                >
                  <FileText className="mr-3 h-5 w-5" />
                  <span className="font-medium">Document</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <TextareaAutosize
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (textInput.trim() || selectedFiles.length > 0) {
                    handleTextSubmit(e as any);
                  }
                }
              }}
              placeholder={t('voiceChat.inputPlaceholder')}
              disabled={isProcessing}
              autoComplete="on"
              autoCorrect="on"
              autoCapitalize="sentences"
              spellCheck="true"
              minRows={1}
              maxRows={5}
              className="flex-1 rounded-3xl outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none py-2.5 px-3 border border-input bg-white md:bg-background text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 transition-none"
            />
            <Button
              type={(isProcessing || isThinking || isSpeaking || hasTypingMessage) ? "button" : "submit"}
              onClick={(isProcessing || isThinking || isSpeaking || hasTypingMessage) ? stopGeneration : undefined}
              disabled={!(isProcessing || isThinking || isSpeaking || hasTypingMessage) && !textInput.trim() && selectedFiles.length === 0}
              className="rounded-full w-10 h-10 p-0 flex items-center justify-center flex-shrink-0"
            >
              {(isProcessing || isThinking || isSpeaking || hasTypingMessage) ? (
                <Square className="w-3.5 h-3.5 fill-white dark:fill-black" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </form>
        
        {/* Disclaimer text */}
        <p className="text-center text-xs text-muted-foreground px-2 mt-3 max-w-4xl mx-auto leading-relaxed">
          {i18n.language === 'fr' ? (
            <>
              En discutant avec Cuizly Assistant, vous acceptez nos{' '}
              <a href="/terms" className="underline hover:text-foreground transition-colors whitespace-nowrap">conditions</a>
              {' '}et avez lu notre{' '}
              <a href="/privacy" className="underline hover:text-foreground transition-colors whitespace-nowrap">politique de confidentialité</a>
              . Voir les{' '}
              <a href="/cookies" className="underline hover:text-foreground transition-colors whitespace-nowrap">préférences de cookies</a>.
            </>
          ) : (
            <>
              By chatting with Cuizly Assistant, you accept our{' '}
              <a href="/terms" className="underline hover:text-foreground transition-colors whitespace-nowrap">terms</a>
              {' '}and have read our{' '}
              <a href="/privacy" className="underline hover:text-foreground transition-colors whitespace-nowrap">privacy policy</a>
              . See{' '}
              <a href="/cookies" className="underline hover:text-foreground transition-colors whitespace-nowrap">cookie preferences</a>.
            </>
          )}
        </p>
      </div>

      {/* Camera Modal */}
      <Dialog open={showCameraModal} onOpenChange={(open) => !open && closeCamera()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {i18n.language === 'fr' ? 'Caméra' : 'Camera'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Mode toggle buttons */}
            <div className="flex gap-2 justify-center">
              <Button
                variant={cameraMode === 'photo' ? 'default' : 'outline'}
                onClick={() => setCameraMode('photo')}
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                {i18n.language === 'fr' ? 'Photo' : 'Photo'}
              </Button>
              <Button
                variant={cameraMode === 'video' ? 'default' : 'outline'}
                onClick={() => setCameraMode('video')}
                className="flex-1"
              >
                <Video className="w-4 h-4 mr-2" />
                {i18n.language === 'fr' ? 'Vidéo' : 'Video'}
              </Button>
            </div>

            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {isRecordingVideo && (
                <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="font-mono text-sm">{recordingTime}s / 30s</span>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={closeCamera}
              >
                {i18n.language === 'fr' ? 'Annuler' : 'Cancel'}
              </Button>

              {cameraMode === 'photo' ? (
                <Button onClick={capturePhoto}>
                  <Camera className="w-4 h-4 mr-2" />
                  {i18n.language === 'fr' ? 'Capturer' : 'Capture'}
                </Button>
              ) : (
                <>
                  {!isRecordingVideo ? (
                    <Button onClick={startVideoRecording}>
                      <Video className="w-4 h-4 mr-2" />
                      {i18n.language === 'fr' ? 'Démarrer' : 'Start'}
                    </Button>
                  ) : (
                    <Button onClick={stopVideoRecording} variant="destructive">
                      <Square className="w-4 h-4 mr-2" />
                      {i18n.language === 'fr' ? 'Arrêter' : 'Stop'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VoiceChatInterface;