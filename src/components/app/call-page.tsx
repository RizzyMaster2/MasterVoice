
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import type { UserProfile } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, PhoneOff, Loader2, Timer, ActivitySquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { VoiceCallLogic } from '@/components/app/voice-call';
import { Skeleton } from '@/components/ui/skeleton';

export function CallPage({ friend }: { friend: UserProfile }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser, isLoading: isUserLoading } = useUser();
  const supabase = createClient();
  const { toast } = useToast();

  const [status, setStatus] = useState<'calling' | 'connecting' | 'connected' | 'error'>('connecting');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [stats, setStats] = useState<{ rtt?: number; bitrate?: number }>({});
  
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const isReceiving = searchParams.get('isReceiving') === 'true';

  const handleClose = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
    }
    router.push(`/home/chat/${friend.id}`);
  }, [router, friend.id]);

  const onConnected = useCallback((stream: MediaStream, localStream: MediaStream) => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream;
    }
    try {
        localStreamRef.current = localStream;
        if(!localStream) return;
        audioContextRef.current = new AudioContext();
        sourceRef.current = audioContextRef.current.createMediaStreamSource(localStream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 512;
        sourceRef.current.connect(analyserRef.current);
    } catch (e) {
        console.error("Error setting up audio analyser:", e);
    }
  }, []);

  useEffect(() => {
    let speakingInterval: NodeJS.Timeout | null = null;
    
    if (status === 'connected') {
        const timer = setInterval(() => setCallDuration(prev => prev + 1), 1000);

        const detectSpeaking = () => {
          if (!analyserRef.current) return;
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          const volume = data.reduce((a, b) => a + b, 0) / data.length;
          setIsSpeaking(volume > 10);
        };
        speakingInterval = setInterval(detectSpeaking, 200);

        return () => {
            clearInterval(timer);
            if (speakingInterval) clearInterval(speakingInterval);
        };
    }
  }, [status]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = !track.enabled; });
      setIsMicMuted(prev => !prev);
    }
  };

  const getInitials = (name: string | undefined | null) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  const formatDuration = (seconds: number) =>
    new Date(seconds * 1000).toISOString().substr(14, 5);

  const statusText = {
    calling: `Ringing ${friend?.display_name}...`,
    connecting: 'Connecting...',
    connected: 'Connected',
    error: 'Error Starting Call'
  };

  if (isUserLoading || !friend || !currentUser) {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-background to-primary/5">
             <Skeleton className="h-32 w-32 rounded-full" />
             <Skeleton className="h-8 w-48 mt-4" />
             <Skeleton className="h-5 w-64 mt-2" />
        </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-0 gap-0">
        <VoiceCallLogic 
            supabase={supabase}
            currentUser={currentUser}
            otherParticipant={friend}
            isReceiving={isReceiving}
            onConnected={onConnected}
            onStatusChange={setStatus}
            onStatsUpdate={setStats}
            onClose={handleClose}
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 bg-gradient-to-br from-background to-primary/5 relative">
          {status === 'connected' && (
            <Badge variant="secondary" className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <Timer className="h-4 w-4" />
              {formatDuration(callDuration)}
            </Badge>
          )}
          {status === 'connected' && (
            <Badge variant={isSpeaking ? 'default' : 'outline'} className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <ActivitySquare className="h-4 w-4" />
              {isSpeaking ? 'Speaking' : 'Silent'}
            </Badge>
          )}
          <div className="flex flex-col items-center gap-4 text-center">
            <Avatar className="h-32 w-32 border-4 border-transparent">
              <AvatarImage src={friend?.photo_url || undefined} alt={friend?.display_name || ''} />
              <AvatarFallback className="text-4xl">{getInitials(friend?.display_name)}</AvatarFallback>
            </Avatar>
            <p className="font-semibold text-xl">{friend?.display_name}</p>
          </div>

          <div className="text-center absolute bottom-10 z-10 flex flex-col items-center gap-1 text-muted-foreground">
            {(status === 'calling' || status === 'connecting') && <Loader2 className="animate-spin h-4 w-4" />}
            <p>{statusText[status]}</p>
            {status === 'connected' && (
              <p className="text-xs">
                RTT: {stats.rtt ?? '–'} ms
              </p>
            )}
          </div>
          <audio ref={remoteAudioRef} autoPlay playsInline />
        </div>

        <div className="p-4 border-t bg-background/95 flex justify-center items-center h-24">
          <div className="flex items-center gap-4">
            <Button variant={isMicMuted ? 'outline' : 'secondary'} size="icon" className="rounded-full h-14 w-14" onClick={toggleMute}>
              {isMicMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>
            <Button variant="destructive" size="icon" className="rounded-full h-16 w-16" onClick={handleClose}>
              <PhoneOff className="h-7 w-7" />
            </Button>
          </div>
        </div>
    </div>
  );
}
