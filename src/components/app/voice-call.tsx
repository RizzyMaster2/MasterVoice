
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/data';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Mic, MicOff, PhoneOff, Loader2, Signal, Timer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

interface VoiceCallProps {
  supabase: SupabaseClient;
  currentUser: UserProfile;
  otherParticipant: UserProfile;
  initialOffer?: RTCSessionDescriptionInit;
  onClose: () => void;
}

const PEER_CONNECTION_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const useActiveSpeaker = (stream: MediaStream | null, threshold = 20) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        if (!stream || stream.getAudioTracks().length === 0) {
            setIsSpeaking(false);
            return;
        }

        try {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            
            source.connect(analyserRef.current);
            analyserRef.current.fftSize = 512;
            const bufferLength = analyserRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const checkSpeaking = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
                
                setIsSpeaking(average > threshold);
                animationFrameRef.current = requestAnimationFrame(checkSpeaking);
            };

            animationFrameRef.current = requestAnimationFrame(checkSpeaking);

        } catch (e) {
            console.error('Failed to initialize active speaker detection:', e);
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (audioContextRef.current?.state !== 'closed') {
                audioContextRef.current?.close();
            }
            setIsSpeaking(false);
        };
    }, [stream, threshold]);

    return isSpeaking;
};

export function VoiceCall({ supabase, currentUser, otherParticipant, initialOffer, onClose }: VoiceCallProps) {
  const [status, setStatus] = useState<'calling' | 'receiving' | 'connecting' | 'connected' | 'error'>(initialOffer ? 'receiving' : 'calling');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [ping, setPing] = useState<number | null>(null);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const signalingChannelRef = useRef<any>(null);

  const { toast } = useToast();
  
  const otherParticipantId = otherParticipant.id;
  
  const isLocalUserSpeaking = useActiveSpeaker(localStream);
  const isRemoteUserSpeaking = useActiveSpeaker(remoteStream);

  const cleanup = useCallback(() => {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (signalingChannelRef.current) {
      supabase.removeChannel(signalingChannelRef.current);
      signalingChannelRef.current = null;
    }
  }, [localStream, supabase]);

  const handleClose = useCallback((notify = true) => {
    if (notify && currentUser.id && otherParticipantId) {
        const otherUserChannel = supabase.channel(`user-signaling:${otherParticipantId}`);
        otherUserChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                otherUserChannel.send({
                    type: 'broadcast',
                    event: 'hangup',
                    payload: { from: currentUser.id },
                }).then(() => supabase.removeChannel(otherUserChannel));
            }
        });
    }
    cleanup();
    onClose();
  }, [cleanup, onClose, currentUser.id, otherParticipantId, supabase]);

  useEffect(() => {
    let timerInterval: NodeJS.Timeout | null = null;
    let statsInterval: NodeJS.Timeout | null = null;

    if (status === 'connected') {
      timerInterval = setInterval(() => setCallDuration(prev => prev + 1), 1000);
      statsInterval = setInterval(async () => {
        if (peerConnectionRef.current?.connectionState === 'connected') {
          const stats = await peerConnectionRef.current.getStats();
          stats.forEach(report => {
            if (report.type === 'remote-inbound-rtp' && report.roundTripTime) {
                setPing(Math.round(report.roundTripTime * 1000));
            }
          });
        }
      }, 3000);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
      if (statsInterval) clearInterval(statsInterval);
    };
  }, [status]);


  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setLocalStream(stream);
      } catch (error) {
        setStatus('error');
        toast({
          title: 'Microphone Access Error',
          description: 'Please allow microphone access to make calls.',
          variant: 'destructive',
        });
        setTimeout(() => handleClose(true), 2000);
      }
    };
    init();

    return () => {
        localStream?.getTracks().forEach(track => track.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!localStream || !currentUser.id || !otherParticipantId) {
        return;
    }
    
    const channelId = `signaling:${[currentUser.id, otherParticipantId].sort().join(':')}`;
    const channel = supabase.channel(channelId, {
      config: { broadcast: { self: false } },
    });
    signalingChannelRef.current = channel;
    let pc: RTCPeerConnection | null = null;

    channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.to === currentUser.id && pc && pc.signalingState !== 'closed') {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
        }
    });

    channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.to === currentUser.id && payload.candidate && pc && pc.signalingState !== 'closed') {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
                console.error('Error adding received ice candidate', e);
            }
        }
    });
    
    channel.subscribe(async (subStatus) => {
      if (subStatus === 'SUBSCRIBED') {
        pc = new RTCPeerConnection(PEER_CONNECTION_CONFIG);
        peerConnectionRef.current = pc;

        localStream.getTracks().forEach(track => pc!.addTrack(track, localStream));

        pc.onicecandidate = event => {
            if (event.candidate && signalingChannelRef.current) {
                signalingChannelRef.current.send({
                    type: 'broadcast',
                    event: 'ice-candidate',
                    payload: { to: otherParticipantId, candidate: event.candidate },
                });
            }
        };

        pc.ontrack = event => {
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
                if (remoteAudioRef.current) {
                    remoteAudioRef.current.srcObject = event.streams[0];
                }
            }
        };

        pc.onconnectionstatechange = () => {
            if (!peerConnectionRef.current) return;
            const state = peerConnectionRef.current.connectionState;
            if(state === 'connected') {
                setStatus('connected');
            } else if (['failed', 'disconnected', 'closed'].includes(state)) {
                handleClose(false);
            }
        };

        if (initialOffer) { // This user is the receiver
            setStatus('connecting');
            if (pc.signalingState !== "stable") {
                await Promise.all([
                    new Promise(resolve => { if (pc!.signalingState === 'stable') resolve(true); }),
                    new Promise(resolve => setTimeout(resolve, 200)) // fallback timeout
                ]);
            }
            await pc.setRemoteDescription(new RTCSessionDescription(initialOffer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            if (signalingChannelRef.current) {
                signalingChannelRef.current.send({
                    type: 'broadcast',
                    event: 'answer',
                    payload: { to: otherParticipantId, from: currentUser.id, answer },
                });
            }
        } else { // This user is the caller
            const otherUserChannel = supabase.channel(`user-signaling:${otherParticipantId}`);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            otherUserChannel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    otherUserChannel.send({
                        type: 'broadcast',
                        event: 'offer',
                        payload: { from: currentUser.id, offer },
                    }).then(() => supabase.removeChannel(otherUserChannel));
                }
            });
        }
      }
    });

    return () => {
        if (pc) pc.close();
        peerConnectionRef.current = null;
        if(signalingChannelRef.current) {
            supabase.removeChannel(signalingChannelRef.current);
            signalingChannelRef.current = null;
        }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream, currentUser.id, otherParticipantId]);
  
  const toggleMute = () => {
      if (localStream) {
          localStream.getAudioTracks().forEach(track => { track.enabled = !track.enabled; });
          setIsMicMuted(prev => !prev);
      }
  };

  const getInitials = (name: string | undefined | null) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '?';

    const statusText = {
        calling: `Ringing ${otherParticipant?.display_name}...`,
        receiving: `Incoming call from ${otherParticipant?.display_name}`,
        connecting: 'Connecting...',
        connected: 'Connected',
        error: 'Error'
    }

    const formatDuration = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    };

  return (
    <Dialog open={true} onOpenChange={() => handleClose(true)}>
      <DialogContent className="max-w-md h-[70vh] flex flex-col p-0 gap-0" onInteractOutside={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">Voice Call</DialogTitle>
        <DialogDescription className="sr-only">A voice call is in progress. You can mute your microphone or hang up.</DialogDescription>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 bg-gradient-to-br from-background to-primary/5 relative overflow-hidden">
            <div className={cn("absolute inset-0 bg-primary/10 transition-opacity duration-700", status === 'connected' ? 'opacity-100' : 'opacity-0')} />
             <div className="absolute top-4 left-4 z-10 flex gap-2">
                {status === 'connected' && (
                    <Badge variant="secondary" className="flex items-center gap-2">
                        <Timer className="h-4 w-4" />
                        {formatDuration(callDuration)}
                    </Badge>
                )}
                {ping !== null && (
                    <Badge variant={ping < 100 ? "success" : ping < 200 ? "warning" : "destructive"} className="flex items-center gap-2">
                        <Signal className="h-4 w-4" />
                        {ping}ms
                    </Badge>
                )}
            </div>
            <div className="flex items-end justify-center gap-4 w-full relative z-10">
                <div className="flex flex-col items-center gap-2">
                    <Avatar className={cn("h-24 w-24 border-4 transition-all duration-300", isLocalUserSpeaking && !isMicMuted ? "border-primary shadow-2xl shadow-primary/50" : "border-transparent")}>
                        <AvatarImage src={currentUser?.photo_url || undefined} alt={currentUser?.display_name || ''} />
                        <AvatarFallback className="text-3xl">{getInitials(currentUser?.display_name)}</AvatarFallback>
                    </Avatar>
                    <p className="font-semibold text-sm">You</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                     <Avatar className={cn("h-32 w-32 border-4 transition-all duration-300", isRemoteUserSpeaking ? "border-primary shadow-2xl shadow-primary/50" : "border-transparent")}>
                        <AvatarImage src={otherParticipant?.photo_url || undefined} alt={otherParticipant?.display_name || ''} />
                        <AvatarFallback className="text-4xl">{getInitials(otherParticipant?.display_name)}</AvatarFallback>
                    </Avatar>
                    <p className="font-semibold">{otherParticipant?.display_name}</p>
                </div>
            </div>
            <div className="text-center absolute bottom-10 z-10 flex items-center gap-2 text-muted-foreground">
                {status === 'calling' && <Loader2 className="animate-spin h-4 w-4" />}
                {status === 'connecting' && <Loader2 className="animate-spin h-4 w-4" />}
                <p>{statusText[status]}</p>
            </div>
             <audio ref={remoteAudioRef} autoPlay playsInline />
        </div>
        <div className="p-4 border-t bg-background/95 flex justify-center items-center h-24">
            <div className="flex items-center gap-4">
                <Button variant={isMicMuted ? "outline" : "secondary"} size="icon" className="rounded-full h-14 w-14" onClick={toggleMute}>
                   {isMicMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>
                <Button variant="destructive" size="icon" className="rounded-full h-16 w-16" onClick={() => handleClose(true)}>
                    <PhoneOff className="h-7 w-7" />
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
