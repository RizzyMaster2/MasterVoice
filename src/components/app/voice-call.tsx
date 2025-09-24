
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile, Chat } from '@/lib/data';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mic, MicOff, PhoneOff, AlertTriangle, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

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

export function VoiceCall({ supabase, currentUser, chat, onClose }: VoiceCallProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const otherParticipant = chat.otherParticipant;
  const otherParticipantId = otherParticipant?.id;

  const handleClose = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    localStream?.getTracks().forEach(track => track.stop());
    if (otherParticipantId) {
        const signalingChannel = supabase.channel('signaling-channel');
         signalingChannel.send({
            type: 'broadcast',
            event: 'hangup',
            payload: { target: otherParticipantId },
        });
    }
    setIsOpen(false);
    onClose();
  }, [localStream, onClose, otherParticipantId, supabase]);

  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setLocalStream(stream);
        setHasPermission(true);
      } catch (error) {
        console.error('Error accessing media devices.', error);
        setHasPermission(false);
        
        let description = 'Please allow microphone access to make calls.';
        if (error instanceof Error && error.name === 'NotReadableError') {
          description = 'Could not start audio source. Is your microphone already in use by another application?';
        }

        toast({
          title: 'Media Access Error',
          description: description,
          variant: 'destructive',
        });
        handleClose();
      }
    };
    init();

    return () => {
      localStream?.getTracks().forEach(track => track.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!localStream || !otherParticipantId) return;

    const pc = new RTCPeerConnection(PEER_CONNECTION_CONFIG);
    peerConnectionRef.current = pc;

    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        supabase.channel('signaling-channel').send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { target: otherParticipantId, candidate: event.candidate },
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      }
    };
    
    return () => {
        pc.close();
        peerConnectionRef.current = null;
    }
  }, [localStream, supabase, otherParticipantId]);

  useEffect(() => {
    if (!otherParticipantId) return;

    const signalingChannel = supabase.channel('signaling-channel', {
        config: { broadcast: { self: false, ack: true } }
    });

    const handleOffer = async ({ offer, callerId }: { offer: RTCSessionDescriptionInit; callerId: string }) => {
        if (callerId === otherParticipantId && peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            signalingChannel.send({
                type: 'broadcast',
                event: 'answer',
                payload: { target: otherParticipantId, answer },
            });
        }
    };
    
    const handleAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
        if (peerConnectionRef.current?.signalingState === "have-local-offer") {
             await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        }
    };

    const handleIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        if (peerConnectionRef.current) {
             await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
    };

    const handleHangUp = () => {
        handleClose();
    };

    signalingChannel
        .on('broadcast', { event: 'offer' }, ({ payload }) => {
             if (payload.target === currentUser.id) handleOffer(payload);
        })
        .on('broadcast', { event: 'answer' }, ({ payload }) => {
            if (payload.target === currentUser.id) handleAnswer(payload);
        })
        .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
            if (payload.target === currentUser.id) handleIceCandidate(payload);
        })
        .on('broadcast', { event: 'hangup' }, ({ payload }) => {
             if (payload.target === currentUser.id) handleHangUp();
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
              if (peerConnectionRef.current) {
                  const offer = await peerConnectionRef.current.createOffer();
                  await peerConnectionRef.current.setLocalDescription(offer);
                  signalingChannel.send({
                      type: 'broadcast',
                      event: 'offer',
                      payload: { target: otherParticipantId, callerId: currentUser.id, offer },
                  });
              }
          }
        });

    return () => {
      supabase.removeChannel(signalingChannel);
    };

  }, [supabase, currentUser.id, otherParticipantId, handleClose]);
  
  const toggleMute = () => {
      if (localStream) {
          localStream.getAudioTracks().forEach(track => {
              track.enabled = !track.enabled;
          });
          setIsMicMuted(prev => !prev);
      }
  };

  const getInitials = (name: string | undefined | null) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md h-[70vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b text-center">
          <DialogTitle className="font-headline">Voice Call</DialogTitle>
          <DialogDescription>
            {remoteStream ? 'Connected' : `Calling ${otherParticipant?.display_name}...`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
             {hasPermission === false ? (
                <Alert variant="destructive" className="max-w-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Microphone Permissions Error</AlertTitle>
                  <AlertDescription>
                    MasterVoice needs access to your microphone to make voice calls. Please update your browser settings.
                  </AlertDescription>
                </Alert>
            ) : (
                <>
                <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-32 w-32 border-4 border-primary/20">
                        <AvatarImage src={otherParticipant?.photo_url || undefined} alt={otherParticipant?.display_name || ''} />
                        <AvatarFallback className="text-4xl">{getInitials(otherParticipant?.display_name)}</AvatarFallback>
                    </Avatar>
                    <p className="text-2xl font-bold">{otherParticipant?.display_name}</p>
                </div>
                 <audio ref={remoteAudioRef} autoPlay />
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <Mic className="h-5 w-5" />
                    <p>{isMicMuted ? "You are muted" : "Your microphone is on"}</p>
                 </div>
                </>
            )}
        </div>

        <DialogFooter className="p-4 border-t bg-background/95 flex justify-center">
            <div className="flex items-center gap-4">
                <Button variant={isMicMuted ? "destructive" : "secondary"} size="icon" className="rounded-full h-12 w-12" onClick={toggleMute}>
                   {isMicMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>
                <Button variant="destructive" size="icon" className="rounded-full h-12 w-12" onClick={handleClose}>
                    <PhoneOff className="h-6 w-6" />
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    