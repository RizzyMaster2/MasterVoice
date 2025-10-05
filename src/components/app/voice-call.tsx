
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
import { Mic, MicOff, PhoneOff, Loader2, Timer, ActivitySquare } from 'lucide-react';
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
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
};

export function VoiceCall({ supabase, currentUser, otherParticipant, initialOffer, onClose }: VoiceCallProps) {
  const [status, setStatus] = useState<'calling' | 'connecting' | 'connected' | 'error'>(initialOffer ? 'connecting' : 'calling');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [stats, setStats] = useState<{ rtt?: number; bitrate?: number }>({});

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const signalingChannelRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const { toast } = useToast();

  const handleClose = useCallback((notify = true) => {
    console.log('[RTC] Closing call...');
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
    }

    if (notify && signalingChannelRef.current) {
      console.log('[RTC] Sending hangup signal.');
      signalingChannelRef.current.send({
        type: 'broadcast',
        event: 'hangup',
        payload: { from: currentUser.id },
      });
    }
    if (signalingChannelRef.current) {
      supabase.removeChannel(signalingChannelRef.current);
      signalingChannelRef.current = null;
    }
    onClose();
  }, [onClose, currentUser.id, supabase]);

  useEffect(() => {
    if (status !== 'connected') return;
    const timer = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    let isMounted = true;
    let speakingInterval: NodeJS.Timeout | null = null;
    let statsInterval: NodeJS.Timeout | null = null;

    const init = async () => {
      console.log('[RTC] Initializing call...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isMounted) return;
        localStreamRef.current = stream;

        const pc = new RTCPeerConnection(PEER_CONNECTION_CONFIG);
        peerConnectionRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.onicecandidate = event => {
          if (event.candidate) {
            console.log('[ICE] Local candidate:', event.candidate);
            signalingChannelRef.current?.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: event.candidate,
            });
          }
        };

        pc.ontrack = event => {
          console.log('[RTC] Received remote track.');
          if (remoteAudioRef.current && event.streams[0]) {
            remoteAudioRef.current.srcObject = event.streams[0];
          }
        };

        pc.onconnectionstatechange = () => {
          if (!peerConnectionRef.current) return;
          console.log(`[RTC] Connection state changed: ${peerConnectionRef.current.connectionState}`);
          if (!isMounted) return;
          if (peerConnectionRef.current.connectionState === 'connected') setStatus('connected');
          else if (['failed', 'disconnected', 'closed'].includes(peerConnectionRef.current.connectionState)) {
            toast({ title: "Call disconnected" });
            handleClose(false);
          }
        };

        // Setup signaling channel FIRST
        const channelId = `signaling:${[currentUser.id, otherParticipant.id].sort().join(':')}`;
        const channel = supabase.channel(channelId, { config: { broadcast: { self: false } } });
        signalingChannelRef.current = channel;

        channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
            console.log('[RTC] Received answer:', payload);
            if (pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(payload));
            }
        });
        
        channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
            console.log('[ICE] Received remote candidate:', payload);
            if (payload) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(payload));
                } catch (e) {
                    console.error('[ICE] Error adding received ICE candidate', e);
                }
            }
        });
        
        // This is now the critical part: Subscribe first, THEN create offer/answer
        channel.subscribe(async (subStatus) => {
            if (subStatus !== 'SUBSCRIBED' || !isMounted) {
                console.log(`[RTC] Channel subscription status: ${subStatus}`);
                return;
            }

            console.log(`[RTC] Successfully subscribed to channel: ${channelId}`);
            
            if (initialOffer) { // We are RECEIVING a call
                console.log('[RTC] initialOffer exists. Creating an answer.');
                await pc.setRemoteDescription(new RTCSessionDescription(initialOffer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                console.log('[RTC] Created and set local answer:', answer);
                channel.send({ type: 'broadcast', event: 'answer', payload: answer });
            } else { // We are INITIATING a call
                console.log('[RTC] No initialOffer. Creating an offer.');
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                console.log('[RTC] Created and set local offer:', offer);
                
                // Use a SEPARATE, TEMPORARY channel to send the initial offer to the specific user
                const offerChannel = supabase.channel(`user-signaling:${otherParticipant.id}`);
                offerChannel.subscribe(status => {
                    if (status === 'SUBSCRIBED') {
                        console.log(`[RTC] Sending offer to ${otherParticipant.display_name}`);
                        offerChannel.send({ type: 'broadcast', event: 'offer', payload: { from: currentUser.id, offer } })
                        .then(() => supabase.removeChannel(offerChannel));
                    }
                });
            }
        });

        // Active speaker detection
        audioContextRef.current = new AudioContext();
        sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 512;
        sourceRef.current.connect(analyserRef.current);

        const detectSpeaking = () => {
          if (!analyserRef.current) return;
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          const volume = data.reduce((a, b) => a + b, 0) / data.length;
          setIsSpeaking(volume > 10);
        };

        speakingInterval = setInterval(detectSpeaking, 200);

        // Stats polling
        statsInterval = setInterval(async () => {
          if (!peerConnectionRef.current) return;
          const statsReport = await peerConnectionRef.current.getStats();
          statsReport.forEach(report => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.currentRoundTripTime) {
              setStats(prev => ({ ...prev, rtt: Math.round(report.currentRoundTripTime * 1000) }));
            }
            if (report.type === 'inbound-rtp' && report.kind === 'audio') {
              const bitrate = (report.bytesReceived * 8) / (report.timestamp / 1000);
              setStats(prev => ({ ...prev, bitrate: Math.round(bitrate) }));
            }
          });
        }, 2000);

      } catch (error) {
        console.error('[RTC] Initialization error:', error);
        setStatus('error');
        toast({ title: 'Microphone Access Error', description: 'Please allow microphone access to make calls.', variant: 'destructive' });
        if(isMounted) {
            setTimeout(() => handleClose(true), 2000);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      if (speakingInterval) clearInterval(speakingInterval);
      if (statsInterval) clearInterval(statsInterval);
      handleClose(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id, initialOffer, otherParticipant.id]);

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
          {status === 'connected' && (
            <Badge variant={isSpeaking ? 'default' : 'outline'} className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <ActivitySquare className="h-4 w-4" />
              {isSpeaking ? 'Speaking' : 'Silent'}
            </Badge>
          )}
          <div className="flex flex-col items-center gap-4 text-center">
            <Avatar className="h-32 w-32 border-4 border-transparent">
              <AvatarImage src={otherParticipant?.photo_url || undefined} alt={otherParticipant?.display_name || ''} />
              <AvatarFallback className="text-4xl">{getInitials(otherParticipant?.display_name)}</AvatarFallback>
            </Avatar>
            <p className="font-semibold text-xl">{otherParticipant?.display_name}</p>
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
            <Button variant="destructive" size="icon" className="rounded-full h-16 w-16" onClick={() => handleClose(true)}>
              <PhoneOff className="h-7 w-7" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
