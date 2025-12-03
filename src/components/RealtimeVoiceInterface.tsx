import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Sparkles, MicOff, Volume2, VolumeX, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeVoiceClient } from '@/utils/RealtimeVoiceClient';
import TypewriterRichText from '@/components/TypewriterRichText';
import RichTextRenderer from '@/components/RichTextRenderer';
import { useConversations } from '@/hooks/useConversations';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface RealtimeVoiceInterfaceProps {
  onClose?: () => void;
}

const RealtimeVoiceInterface: React.FC<RealtimeVoiceInterfaceProps> = ({ onClose }) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [currentAssistantMessageId, setCurrentAssistantMessageId] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voiceClientRef = useRef<RealtimeVoiceClient | null>(null);
  
  const { createConversation, saveMessage, loadConversationMessages } = useConversations();

  useEffect(() => {
    const initUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        const { data: profile } = await supabase
          .from('waitlist')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();
        setUserProfile(profile);
        
        // Charger la dernière conversation vocale ou en créer une nouvelle
        const { data: existingConversations, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('type', 'voice')
          .order('updated_at', { ascending: false })
          .limit(1);

        // Ne plus charger l'historique des conversations
      }
    };
    initUser();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle realtime voice messages
  const handleMessage = (event: any) => {
    // Uniquement les événements critiques pour éviter le spam
    const criticalEvents = ['session.created', 'error', 'input_audio_buffer.speech_started', 'input_audio_buffer.speech_stopped'];
    if (criticalEvents.includes(event.type)) {
      console.log('Voice event:', event.type);
    }
    
    switch (event.type) {
      case 'response.audio.delta':
        setIsSpeaking(true);
        break;
      case 'response.audio.done':
        setIsSpeaking(false);
        break;
      case 'response.audio_transcript.delta':
        if (event.delta) {
          const newContent = currentMessage + event.delta;
          setCurrentMessage(newContent);
          
          // Si pas de message assistant actuel, en créer un
          if (!currentAssistantMessageId) {
            const messageId = Date.now().toString();
            setCurrentAssistantMessageId(messageId);
            setMessages(prev => [...prev, {
              id: messageId,
              type: 'assistant',
              content: newContent,
              timestamp: new Date(),
              isTyping: true
            }]);
          } else {
            // Mettre à jour le message existant
            setMessages(prev => prev.map(msg => 
              msg.id === currentAssistantMessageId 
                ? { ...msg, content: newContent }
                : msg
            ));
          }
        }
        break;
      case 'response.audio_transcript.done':
        if (currentAssistantMessageId) {
          // Finaliser le message existant
          setMessages(prev => prev.map(msg => 
            msg.id === currentAssistantMessageId 
              ? { ...msg, isTyping: false }
              : msg
          ));
          
          setCurrentAssistantMessageId(null);
        }
        setCurrentMessage('');
        break;
      case 'input_audio_buffer.speech_started':
        console.log('User started speaking');
        break;
      case 'input_audio_buffer.speech_stopped':
        console.log('User stopped speaking');
        break;
    }
  };

  const startConversation = async () => {
    if (!userId) {
      toast({
        title: t('voiceAssistant.errors.connectionFailed'),
        description: t('voiceAssistant.errors.notConnected'),
        variant: "destructive",
      });
      return;
    }

    try {
      voiceClientRef.current = new RealtimeVoiceClient(handleMessage);
      await voiceClientRef.current.connect();
      
      setIsConnected(true);
      
      // Pas de toast au démarrage
    } catch (error) {
      console.error('Erreur connexion:', error);
      toast({
        title: t('voiceAssistant.connectionError'),
        description: t('errors.general'),
        variant: "destructive",
      });
    }
  };

  const endConversation = () => {
    if (voiceClientRef.current) {
      voiceClientRef.current.disconnect();
      voiceClientRef.current = null;
    }
    setIsConnected(false);
    setIsSpeaking(false);
    setCurrentMessage('');
    
    toast({
      title: t('voiceAssistant.disconnected'),
      description: t('voiceAssistant.conversationEndedDesc'),
    });
  };

  useEffect(() => {
    return () => {
      if (voiceClientRef.current) {
        voiceClientRef.current.disconnect();
      }
    };
  }, []);

  // Animated orb component
  const AnimatedOrb = () => (
    <div className="relative flex items-center justify-center">
      {/* Outer pulse rings */}
      {isSpeaking && (
        <>
          <div className="absolute w-32 h-32 rounded-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 animate-ping" />
          <div className="absolute w-24 h-24 rounded-full bg-gradient-to-r from-blue-400/30 to-purple-400/30 animate-pulse" />
        </>
      )}
      
      {/* Main orb */}
      <div className={`relative w-20 h-20 rounded-full transition-all duration-300 ${
        isConnected 
          ? isSpeaking
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 shadow-xl shadow-blue-500/50 scale-110'
            : 'bg-gradient-to-r from-green-500 to-blue-500 shadow-lg shadow-green-500/30'
          : 'bg-gradient-to-r from-gray-400 to-gray-500'
      }`}>
        {/* Inner glow effect */}
        <div className={`absolute inset-2 rounded-full transition-all duration-300 ${
          isConnected 
            ? 'bg-gradient-to-r from-white/20 to-white/10'
            : 'bg-white/10'
        }`} />
        
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isConnected ? (
            isSpeaking ? (
              <Volume2 className="w-8 h-8 text-white animate-pulse" />
            ) : (
              <Sparkles className="w-8 h-8 text-white" />
            )
          ) : (
            <MicOff className="w-8 h-8 text-white/70" />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
        {messages.length === 0 && !isConnected && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-20">
            <AnimatedOrb />
            <div className="space-y-3 max-w-lg">
              <h1 className="text-2xl font-semibold text-foreground">
                {t('voiceAssistant.voiceMode')}
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed">
                {t('voiceAssistant.available')}
              </p>
            </div>
          </div>
        )}

        {/* Connected state with orb */}
        {isConnected && (
          <div className="flex flex-col items-center space-y-6">
            <AnimatedOrb />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-foreground">
                {t('voiceAssistant.speakNaturally')}
              </p>
            </div>
          </div>
        )}

        {/* Messages en cours supprimés car maintenant intégrés dans la liste */}

        {/* Message history */}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%]`}>
              <div className={`rounded-3xl px-6 py-4 ${
                message.type === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-foreground'
              }`}>
                {message.isTyping && message.type === 'assistant' ? (
                  <TypewriterRichText 
                    text={message.content}
                    speed={20}
                    className="text-base leading-relaxed"
                    onComplete={() => {
                      setMessages(prev => prev.map(msg => 
                        msg.id === message.id 
                          ? { ...msg, isTyping: false }
                          : msg
                      ));
                    }}
                  />
                ) : (
                  <RichTextRenderer 
                    content={message.content} 
                    className="text-base leading-relaxed"
                  />
                )}
              </div>
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Control Area */}
      <div className="border-t border-border bg-background px-6 py-6">
        <div className="flex items-center justify-center space-x-4">
          {!isConnected ? (
            <Button
              onClick={startConversation}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {t('voiceAssistant.available')}
            </Button>
          ) : (
            <Button
              onClick={endConversation}
              variant="destructive"
              className="px-8 py-4 rounded-full font-medium"
            >
              <MicOff className="w-5 h-5 mr-2" />
              {t('voiceAssistant.endConversation')}
            </Button>
          )}
        </div>
        
        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            {!isConnected 
              ? t('voiceAssistant.smartAssistant')
              : t('voiceAssistant.conversationActive')
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default RealtimeVoiceInterface;