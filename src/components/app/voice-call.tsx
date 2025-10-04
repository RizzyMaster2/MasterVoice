
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
import { Mic, MicOff, PhoneOff, Loader2, Timer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';

interface VoiceCallProps {
  supabase: SupabaseClient;
  currentUser: UserProfile;
  otherParticipant: UserProfile;
  initialOffer?: RTCSessionDescriptionInit;
  onClose: () => void;
}

const PEER_CONNECTION_CONFIG: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

export function VoiceCall({ supabase, currentUser, otherParticipant, initialOffer, onClose }: VoiceCallProps) {
  const [status, setStatus] = useState<'calling' | 'connecting' | 'connected' | 'error'>(initialOffer ? 'connecting' : 'calling');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const signalingChannelRef = useRef<any>(null);
  
  const { toast } = useToast();
  
  const handleClose = useCallback((notify = true) => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    peerConnectionRef.current?.close();

    if (notify && signalingChannelRef.current) {
        signalingChannelRef.current.send({
            type: 'broadcast',
            event: 'hangup',
            payload: { from: currentUser.id },
        });
    }
    if (signalingChannelRef.current) {
      supabase.removeChannel(signalingChannelRef.current);
    }
    onClose();
  }, [onClose, currentUser.id, supabase]);

  useEffect(() => {
    if (status !== 'connected') return;
    const timer = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;

        const pc = new RTCPeerConnection(PEER_CONNECTION_CONFIG);
        peerConnectionRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.onicecandidate = event => {
          if (event.candidate) {
            signalingChannelRef.current?.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: event.candidate,
            });
          }
        };

        pc.ontrack = event => {
          if (remoteAudioRef.current && event.streams[0]) {
            remoteAudioRef.current.srcObject = event.streams[0];
          }
        };

        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;
          if (state === 'connected') setStatus('connected');
          else if (['failed', 'disconnected', 'closed'].includes(state)) handleClose(false);
        };

        const channelId = `signaling:${[currentUser.id, otherParticipant.id].sort().join(':')}`;
        const channel = supabase.channel(channelId, { config: { broadcast: { self: false } } });
        signalingChannelRef.current = channel;

        channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
            if (pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(payload));
            }
        });

        channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
            if (payload) await pc.addIceCandidate(new RTCIceCandidate(payload));
        });

        channel.subscribe(async (subStatus) => {
            if (subStatus !== 'SUBSCRIBED') return;
            
            if (initialOffer) { // Receiver
                await pc.setRemoteDescription(new RTCSessionDescription(initialOffer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                channel.send({ type: 'broadcast', event: 'answer', payload: answer });
            } else { // Caller
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                
                // Use a separate channel to send the initial offer
                const offerChannel = supabase.channel(`user-signaling:${otherParticipant.id}`);
                offerChannel.subscribe(status => {
                    if (status === 'SUBSCRIBED') {
                        offerChannel.send({ type: 'broadcast', event: 'offer', payload: { from: currentUser.id, offer }})
                        .then(() => supabase.removeChannel(offerChannel));
                    }
                })
            }
        });

      } catch (error) {
        setStatus('error');
        toast({ title: 'Microphone Access Error', description: 'Please allow microphone access to make calls.', variant: 'destructive' });
        setTimeout(() => handleClose(true), 2000);
      }
    };
    init();

    return () => handleClose(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = !track.enabled; });
      setIsMicMuted(prev => !prev);
    }
  };

  const getInitials = (name: string | undefined | null) => name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '?';
  const formatDuration = (seconds: number) => new Date(seconds * 1000).toISOString().substr(14, 5);

  const statusText = {
      calling: `Ringing ${otherParticipant?.display_name}...`,
      connecting: 'Connecting...',
      connected: 'Connected',
      error: 'Error Starting Call'
  };

  return (
    <Dialog open={true} onOpenChange={() => handleClose(true)}>
      <DialogContent className="max-w-md h-[70vh] flex flex-col p-0 gap-0" onInteractOutside={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">Voice Call</DialogTitle>
        <DialogDescription className="sr-only">A voice call is in progress.</DialogDescription>
        
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 bg-gradient-to-br from-background to-primary/5 relative">
            {status === 'connected' && (
                <Badge variant="secondary" className="absolute top-4 left-4 z-10 flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    {formatDuration(callDuration)}
                </Badge>
            )}
            <div className="flex flex-col items-center gap-4 text-center">
                <Avatar className="h-32 w-32 border-4 border-transparent">
                    <AvatarImage src={otherParticipant?.photo_url || undefined} alt={otherParticipant?.display_name || ''} />
                    <AvatarFallback className="text-4xl">{getInitials(otherParticipant?.display_name)}</AvatarFallback>
                </Avatar>
                <p className="font-semibold text-xl">{otherParticipant?.display_name}</p>
            </div>

            <div className="text-center absolute bottom-10 z-10 flex items-center gap-2 text-muted-foreground">
                {status === 'calling' || status === 'connecting' ? <Loader2 className="animate-spin h-4 w-4" /> : null}
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
