
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile, Chat } from '@/lib/data';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Mic, MicOff, PhoneOff, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';

interface VoiceCallProps {
  supabase: SupabaseClient;
  currentUser: UserProfile;
  chat: Chat;
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

export function VoiceCall({ supabase, currentUser, chat, onClose }: VoiceCallProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'calling' | 'error'>('calling');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const otherParticipant = chat.otherParticipant;
  const otherParticipantId = otherParticipant?.id;
  
  const isLocalUserSpeaking = useActiveSpeaker(localStream);
  const isRemoteUserSpeaking = useActiveSpeaker(remoteStream);

  const cleanup = useCallback(() => {
    // Stop all tracks
    localStream?.getTracks().forEach(track => track.stop());
    remoteStream?.getTracks().forEach(track => track.stop());
    setLocalStream(null);
    setRemoteStream(null);
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Unsubscribe from Supabase channel
    if (otherParticipantId) {
        supabase.channel(`signaling-${currentUser.id}-${otherParticipantId}`).unsubscribe();
        supabase.channel(`signaling-${otherParticipantId}-${currentUser.id}`).unsubscribe();
    }
  }, [localStream, remoteStream, otherParticipantId, supabase, currentUser.id]);


  const handleClose = useCallback(() => {
    if (status !== 'connecting' && status !== 'connected') {
        cleanup();
        onClose();
        return;
    }
    
    const signalingChannel = supabase.channel('signaling-broadcast');
     signalingChannel.send({
        type: 'broadcast',
        event: 'hangup',
        payload: { from: currentUser.id, to: otherParticipantId },
    }).then(() => {
        cleanup();
        onClose();
    });

  }, [status, cleanup, onClose, supabase, currentUser.id, otherParticipantId]);

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
        setTimeout(onClose, 2000);
      }
    };
    init();

    // Ensure cleanup is called on component unmount
    return () => {
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Main WebRTC Signaling Logic
  useEffect(() => {
    if (!localStream || !otherParticipantId) return;

    const pc = new RTCPeerConnection(PEER_CONNECTION_CONFIG);
    peerConnectionRef.current = pc;

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.onicecandidate = event => {
      if (event.candidate) {
        supabase.channel('signaling-broadcast').send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { from: currentUser.id, to: otherParticipantId, candidate: event.candidate },
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
        if(pc.connectionState === 'connected') {
            setStatus('connected');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
            handleClose();
        }
    }

    const signalingChannel = supabase.channel('signaling-broadcast');

    const handleOffer = async (payload: any) => {
      if (payload.to === currentUser.id && peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.offer));
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        signalingChannel.send({
          type: 'broadcast',
          event: 'answer',
          payload: { from: currentUser.id, to: otherParticipantId, answer },
        });
        setStatus('connecting');
      }
    };
    
    const handleAnswer = async (payload: any) => {
        if (payload.to === currentUser.id && peerConnectionRef.current?.signalingState === 'have-local-offer') {
             await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
        }
    };

    const handleIceCandidate = async (payload: any) => {
        if (payload.to === currentUser.id && peerConnectionRef.current) {
            try {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
                console.error('Error adding received ice candidate', e);
            }
        }
    };

    const handleHangUp = (payload: any) => {
        if (payload.to === currentUser.id) {
            cleanup();
            onClose();
        }
    };

    signalingChannel
        .on('broadcast', { event: 'offer' }, ({ payload }) => handleOffer(payload))
        .on('broadcast', { event: 'answer' }, ({ payload }) => handleAnswer(payload))
        .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => handleIceCandidate(payload))
        .on('broadcast', { event: 'hangup' }, ({ payload }) => handleHangUp(payload))
        .subscribe(async (subStatus) => {
          if (subStatus === 'SUBSCRIBED') {
              if (peerConnectionRef.current) {
                  const offer = await peerConnectionRef.current.createOffer();
                  await peerConnectionRef.current.setLocalDescription(offer);
                  signalingChannel.send({
                      type: 'broadcast',
                      event: 'offer',
                      payload: { from: currentUser.id, to: otherParticipantId, offer },
                  });
              }
          }
        });

    return () => {
      supabase.removeChannel(signalingChannel);
      pc.close();
    };

  }, [localStream, supabase, currentUser.id, otherParticipantId, handleClose, cleanup, onClose]);
  
  const toggleMute = () => {
      if (localStream) {
          localStream.getAudioTracks().forEach(track => {
              track.enabled = !track.enabled;
          });
          setIsMicMuted(prev => !prev);
      }
  };

  const getInitials = (name: string | undefined | null) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '?';

    const statusText = {
        calling: `Calling ${otherParticipant?.display_name}...`,
        connecting: 'Connecting...',
        connected: 'Connected',
        error: 'Error'
    }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md h-[70vh] flex flex-col p-0 gap-0" onInteractOutside={(e) => e.preventDefault()}>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 bg-gradient-to-br from-background to-primary/5 relative overflow-hidden">
            <div className={cn(
                "absolute inset-0 bg-primary/10 transition-opacity duration-700",
                status === 'connected' ? 'opacity-100' : 'opacity-0'
            )} />
             
            <div className="flex items-end justify-center gap-4 w-full relative z-10">
                <div className="flex flex-col items-center gap-2">
                    <Avatar className={cn(
                        "h-24 w-24 border-4 transition-all duration-300",
                        isLocalUserSpeaking && !isMicMuted ? "border-primary shadow-2xl shadow-primary/50" : "border-transparent"
                    )}>
                        <AvatarImage src={currentUser?.photo_url || undefined} alt={currentUser?.display_name || ''} />
                        <AvatarFallback className="text-3xl">{getInitials(currentUser?.display_name)}</AvatarFallback>
                    </Avatar>
                    <p className="font-semibold text-sm">You</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                     <Avatar className={cn(
                        "h-32 w-32 border-4 transition-all duration-300",
                        isRemoteUserSpeaking ? "border-primary shadow-2xl shadow-primary/50" : "border-transparent"
                    )}>
                        <AvatarImage src={otherParticipant?.photo_url || undefined} alt={otherParticipant?.display_name || ''} />
                        <AvatarFallback className="text-4xl">{getInitials(otherParticipant?.display_name)}</AvatarFallback>
                    </Avatar>
                    <p className="font-semibold">{otherParticipant?.display_name}</p>
                </div>
            </div>

            <div className="text-center absolute bottom-10 z-10 flex items-center gap-2 text-muted-foreground">
                {status === 'calling' && <Loader2 className="animate-spin h-4 w-4" />}
                <p>{statusText[status]}</p>
            </div>
             <audio ref={remoteAudioRef} autoPlay playsInline />
        </div>

        <div className="p-4 border-t bg-background/95 flex justify-center items-center h-24">
            <div className="flex items-center gap-4">
                <Button variant={isMicMuted ? "outline" : "secondary"} size="icon" className="rounded-full h-14 w-14" onClick={toggleMute}>
                   {isMicMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>
                <Button variant="destructive" size="icon" className="rounded-full h-16 w-16" onClick={handleClose}>
                    <PhoneOff className="h-7 w-7" />
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
