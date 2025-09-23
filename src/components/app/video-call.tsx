
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
import { Mic, MicOff, Video, VideoOff, PhoneOff, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoCallProps {
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

export function VideoCall({ supabase, currentUser, chat, onClose }: VideoCallProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const otherParticipantId = chat.participants.find(p => p !== currentUser.id);

  const handleClose = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    localStream?.getTracks().forEach(track => track.stop());
    const signalingChannel = supabase.channel('signaling-channel');
     signalingChannel.send({
        type: 'broadcast',
        event: 'hangup',
        payload: { target: otherParticipantId },
    });
    setIsOpen(false);
    onClose();
  }, [localStream, onClose, otherParticipantId, supabase]);

  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        setHasCameraPermission(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing media devices.', error);
        setHasCameraPermission(false);
        toast({
          title: 'Media Access Denied',
          description: 'Please allow camera and microphone access to make calls.',
          variant: 'destructive',
        });
        handleClose();
      }
    };
    init();

    return () => {
      localStream?.getTracks().forEach(track => track.stop());
    };
  }, [handleClose, localStream, toast]);

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
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      }
    };
    
    // Cleanup on unmount
    return () => {
        pc.close();
        peerConnectionRef.current = null;
    }
  }, [localStream, supabase, otherParticipantId]);

  useEffect(() => {
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
              // Initiate call by sending offer
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

  const toggleVideo = () => {
      if (localStream) {
          localStream.getVideoTracks().forEach(track => {
              track.enabled = !track.enabled;
          });
          setIsVideoOff(prev => !prev);
      }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="font-headline">Video Call with {chat.otherParticipant?.display_name}</DialogTitle>
          <DialogDescription>
            {remoteStream ? 'Connected' : 'Connecting...'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 p-2 relative">
             {hasCameraPermission === false && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                    <Alert variant="destructive" className="max-w-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Media Permissions Error</AlertTitle>
                      <AlertDescription>
                        MasterVoice needs access to your camera and microphone to make video calls. Please update your browser settings.
                      </AlertDescription>
                    </Alert>
                </div>
            )}
            
            {/* Remote Video */}
            <div className="bg-muted rounded-lg overflow-hidden flex items-center justify-center relative">
                 <video ref={remoteVideoRef} autoPlay className="w-full h-full object-cover" />
                 {!remoteStream && (
                    <div className="absolute text-muted-foreground">Waiting for peer...</div>
                 )}
            </div>

            {/* Local Video */}
            <div className="bg-muted rounded-lg overflow-hidden flex items-center justify-center absolute bottom-4 right-4 w-1/4 h-1/4 md:relative md:w-full md:h-full">
                 <video ref={localVideoRef} autoPlay muted className="w-full h-full object-cover" />
            </div>
        </div>

        <DialogFooter className="p-4 border-t bg-background/95 flex justify-center">
            <div className="flex items-center gap-4">
                <Button variant={isMicMuted ? "destructive" : "secondary"} size="icon" className="rounded-full h-12 w-12" onClick={toggleMute}>
                   {isMicMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>
                <Button variant={isVideoOff ? "destructive" : "secondary"} size="icon" className="rounded-full h-12 w-12" onClick={toggleVideo}>
                   {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
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
