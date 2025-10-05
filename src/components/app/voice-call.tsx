
'use client';

import { useEffect, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

interface VoiceCallLogicProps {
  supabase: SupabaseClient;
  currentUser: UserProfile;
  otherParticipant: UserProfile;
  isReceiving: boolean;
  onConnected: (stream: MediaStream) => void;
  onStatusChange: (status: 'calling' | 'connecting' | 'connected' | 'error') => void;
  onStatsUpdate: (stats: { rtt?: number; bitrate?: number }) => void;
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

export function VoiceCallLogic({ 
    supabase, 
    currentUser, 
    otherParticipant, 
    isReceiving,
    onConnected,
    onStatusChange,
    onStatsUpdate,
    onClose 
}: VoiceCallLogicProps) {
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const signalingChannelRef = useRef<any>(null);
  
  const isMountedRef = useRef(true);

  const { toast } = useToast();

  useEffect(() => {
    isMountedRef.current = true;
    onStatusChange(isReceiving ? 'connecting' : 'calling');

    const handleClose = (notify = true) => {
      console.log('[RTC] Closing call...');
      if (signalingChannelRef.current && notify) {
          console.log('[RTC] Sending hangup signal.');
          signalingChannelRef.current.send({
              type: 'broadcast',
              event: 'hangup',
              payload: { from: currentUser.id },
          });
      }

      localStreamRef.current?.getTracks().forEach(track => track.stop());
      
      if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
      }
       if (signalingChannelRef.current) {
        supabase.removeChannel(signalingChannelRef.current);
        signalingChannelRef.current = null;
      }
      
      if (isMountedRef.current) {
          onClose();
      }
    };


    const init = async () => {
        console.log('[RTC] Initializing call...');
        if (peerConnectionRef.current) {
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (!isMountedRef.current) return;
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
                if (event.streams[0]) {
                    onConnected(event.streams[0]);
                }
            };

            pc.onconnectionstatechange = () => {
                if (!peerConnectionRef.current || !isMountedRef.current) return;
                console.log(`[RTC] Connection state changed: ${peerConnectionRef.current.connectionState}`);
                if (peerConnectionRef.current.connectionState === 'connected') onStatusChange('connected');
                else if (['failed', 'disconnected', 'closed'].includes(peerConnectionRef.current.connectionState)) {
                    toast({ title: "Call disconnected" });
                    handleClose(false);
                }
            };
            
            const channelId = `signaling:${[currentUser.id, otherParticipant.id].sort().join(':')}`;
            const channel = supabase.channel(channelId, { config: { broadcast: { self: false } } });
            signalingChannelRef.current = channel;
            
            channel.on('broadcast', { event: 'hangup' }, () => {
              handleClose(false);
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

            if (isReceiving) {
                 channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
                    console.log('[RTC] Received offer:', payload.offer);
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    console.log('[RTC] Created and set local answer:', answer);
                    channel.send({ type: 'broadcast', event: 'answer', payload: answer });
                });
            } else {
                 channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
                    console.log('[RTC] Received answer:', payload);
                    if (pc.signalingState !== 'stable') {
                        await pc.setRemoteDescription(new RTCSessionDescription(payload));
                    }
                });
            }

            channel.subscribe(async (subStatus) => {
                if (subStatus !== 'SUBSCRIBED' || !isMountedRef.current) return;
                console.log(`[RTC] Successfully subscribed to channel: ${channelId}`);
                if (!isReceiving) {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    console.log('[RTC] Created and set local offer:', offer);
                    
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
            
        } catch (error) {
            console.error('[RTC] Initialization error:', error);
            onStatusChange('error');
            toast({ title: 'Microphone Access Error', description: 'Please allow microphone access to make calls.', variant: 'destructive' });
            if(isMountedRef.current) {
                setTimeout(() => handleClose(true), 2000);
            }
        }
    };
    
    init();

    return () => {
      console.log('Cleanup running');
      isMountedRef.current = false;
      handleClose(true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
