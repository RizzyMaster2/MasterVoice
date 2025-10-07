
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, PhoneOff, Loader2, Timer, ActivitySquare, ShieldAlert, Volume2, Info } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { VoiceCallLogic } from '@/components/app/voice-call';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { Slider } from '@/components/ui/slider';
import { useUser } from '@/hooks/use-user';


export function CallPage({ currentUser, friend, isReceiving, isLoading }: { currentUser: UserProfile | null, friend: UserProfile | null, isReceiving: boolean, isLoading: boolean }) {
  const router = useRouter();
  const supabase = createClient();

  const [status, setStatus] = useState<'calling' | 'connecting' | 'connected' | 'error'>('connecting');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [stats, setStats] = useState<{ rtt?: number; bitrate?: number }>({});
  const [volume, setVolume] = useState(1); // from 0 to 1
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const handleClose = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
    }
    router.push(`/home/chat/${friend?.id}`);
  }, [router, friend?.id]);

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
  
  useEffect(() => {
    if(remoteAudioRef.current) {
      remoteAudioRef.current.volume = volume;
    }
  }, [volume])

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
    connected: formatDuration(callDuration),
    error: 'Error Starting Call'
  };

  const isConnecting = status === 'calling' || status === 'connecting';
  
  const avatarUser = isConnecting ? currentUser : friend;
  const mainText = isConnecting ? 'You' : friend?.display_name;

  return (
    <div className="w-full h-full flex flex-col p-0 gap-0">
        {currentUser && friend && (
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
        )}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 bg-gradient-to-br from-background to-primary/5 relative">
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={isLoading}>
              <div className="relative cursor-context-menu">
                {isLoading || !avatarUser ? (
                    <Skeleton className="h-32 w-32 rounded-full" />
                ) : (
                    <Avatar className="h-32 w-32 border-4 border-transparent data-[speaking=true]:border-primary transition-all" data-speaking={isSpeaking}>
                      <AvatarImage src={avatarUser.photo_url || undefined} alt={avatarUser.display_name || ''} />
                      <AvatarFallback className="text-4xl">{getInitials(avatarUser.display_name)}</AvatarFallback>
                    </Avatar>
                )}
                <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity">
                    <p className="text-lg font-semibold">{mainText}</p>
                    <div className="flex items-center gap-2 text-sm font-mono">
                      {(status === 'calling' || status === 'connecting') && <Loader2 className="animate-spin h-4 w-4" />}
                      <p>{statusText[status]}</p>
                    </div>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>{friend?.display_name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col items-start gap-2" onSelect={(e) => e.preventDefault()}>
                  <div className="flex items-center gap-2 w-full">
                    <Volume2 className="h-4 w-4" />
                    <span>Volume</span>
                  </div>
                  <Slider 
                    defaultValue={[volume * 100]} 
                    max={100} 
                    step={1}
                    onValueChange={(value) => setVolume(value[0] / 100)}
                    className="w-[150px]"
                  />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
               <DropdownMenuCheckboxItem
                  checked={showDebugInfo}
                  onCheckedChange={setShowDebugInfo}
                >
                  <Info className="mr-2 h-4 w-4" />
                  Show Debug Info
                </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

            {status === 'connected' && friend && (
                 <div className="relative">
                    <Avatar className="h-20 w-20 border-2 data-[speaking=true]:border-primary transition-all" data-speaking={isSpeaking}>
                        <AvatarImage src={friend.photo_url || undefined} alt={friend.display_name || ''} />
                        <AvatarFallback className="text-2xl">{getInitials(friend.display_name)}</AvatarFallback>
                    </Avatar>
                    <p className='text-center mt-2 text-sm font-semibold'>{friend.display_name}</p>
                </div>
            )}

          {showDebugInfo && (
            <Badge variant="secondary" className="absolute top-4 left-4 z-10 flex items-center gap-2 font-mono text-xs">
              <ActivitySquare className="h-4 w-4" />
              RTT: {stats.rtt ?? '–'} ms | Bitrate: {stats.bitrate ? (stats.bitrate / 1000).toFixed(0) : '–'} kbps
            </Badge>
          )}
          
          <audio ref={remoteAudioRef} autoPlay playsInline />
        </div>

        <div className="p-4 border-t bg-background/95 flex flex-col justify-center items-center h-40">
           <Alert className="max-w-md mb-4 bg-secondary">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle className="text-xs font-semibold">For Your Safety</AlertTitle>
            <AlertDescription className="text-xs">
                We are recording this call for demonstration purposes.
            </AlertDescription>
            </Alert>
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
