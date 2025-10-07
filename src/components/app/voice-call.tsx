
'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useCall } from './call-provider';

interface VoiceCallLogicProps {
  supabase: SupabaseClient;
  currentUser: UserProfile;
  otherParticipant: UserProfile;
  isReceiving: boolean;
  onConnected: (stream: MediaStream, localStream: MediaStream) => void;
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
    onClose 
}: VoiceCallLogicProps) {
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const signalingChannelRef = useRef<any>(null); // For chat-specific signaling
  const userChannelRef = useRef<any>(null); // For user-specific listening
  const isMountedRef = useRef(true);

  const { toast } = useToast();
  
  const handleCloseRef = useRef(onClose);
  handleCloseRef.current = onClose;

  const { setEndCall } = useCall() as any;


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
       if (userChannelRef.current) {
        supabase.removeChannel(userChannelRef.current);
        userChannelRef.current = null;
      }
      
      sessionStorage.removeItem('webrtc_offer');

      if (isMountedRef.current) {
          handleCloseRef.current();
      }
    };

    setEndCall(() => handleClose);


    const init = async () => {
        console.log('[RTC] Initializing call...');
        if (peerConnectionRef.current) {
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (!isMountedRef.current) {
              stream.getTracks().forEach(track => track.stop());
              return;
            };
            localStreamRef.current = stream;

            const pc = new RTCPeerConnection(PEER_CONNECTION_CONFIG);
            peerConnectionRef.current = pc;

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = event => {
                if (event.candidate && signalingChannelRef.current) {
                    console.log('[ICE] Local candidate:', event.candidate);
                    signalingChannelRef.current.send({
                        type: 'broadcast',
                        event: 'ice-candidate',
                        payload: event.candidate,
                    });
                }
            };

            pc.ontrack = event => {
                console.log('[RTC] Received remote track.');
                if (event.streams[0] && isMountedRef.current) {
                    onConnected(event.streams[0], stream);
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
            
            // This is the SHARED channel for the two participants to exchange details for THIS call
            const channelId = `signaling:${[currentUser.id, otherParticipant.id].sort().join(':')}`;
            const channel = supabase.channel(channelId, { config: { broadcast: { self: false } } });
            signalingChannelRef.current = channel;
            
            // Both users listen for hangups on the shared channel
            channel.on('broadcast', { event: 'hangup' }, () => {
              handleClose(false);
            });

            // Both users exchange ICE candidates on the shared channel
            channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
                if (payload && peerConnectionRef.current) {
                    try {
                        console.log('[ICE] Received remote candidate:', payload);
                        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload));
                    } catch (e) {
                        console.error('[ICE] Error adding received ICE candidate', e);
                    }
                }
            });
          
            // Only the CALLER listens for an answer on the shared channel
            if(!isReceiving) {
              channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
                if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'stable') {
                  console.log('[RTC] Received answer:', payload);
                  await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload));
                }
              });
            }

            channel.subscribe(async (subStatus) => {
                if (subStatus !== 'SUBSCRIBED' || !isMountedRef.current) return;
                console.log(`[RTC] Successfully subscribed to shared channel: ${channelId}`);
                
                if (isReceiving) {
                    // Receiver gets offer from session storage, sets it, creates answer, and sends it on the shared channel
                    if (!peerConnectionRef.current) return;
                    const offerString = sessionStorage.getItem('webrtc_offer');
                    if (offerString) {
                        const offer = JSON.parse(offerString);
                        console.log('[RTC] Receiver got offer from storage:', offer);
                        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
                        const answer = await peerConnectionRef.current.createAnswer();
                        await peerConnectionRef.current.setLocalDescription(answer);
                        console.log('[RTC] Receiver created and set local answer:', answer);
                        channel.send({ type: 'broadcast', event: 'answer', payload: answer });
                        sessionStorage.removeItem('webrtc_offer');
                    } else {
                        console.error("[RTC] Receiver couldn't find offer in session storage.");
                        handleClose(true);
                    }
                } else {
                    // Caller creates an offer and sends it to the OTHER user's personal channel
                    if (!peerConnectionRef.current) return;
                    
                    // Listen on my own user channel for hangup if the other person declines before connecting
                    userChannelRef.current = supabase.channel(`user-signaling:${currentUser.id}`);
                    userChannelRef.current.on('broadcast', { event: 'hangup' }, ({payload}) => {
                      if (payload.from === otherParticipant.id) handleClose(false);
                    });
                    userChannelRef.current.subscribe();
                    
                    const offer = await peerConnectionRef.current.createOffer();
                    await peerConnectionRef.current.setLocalDescription(offer);

                    // Send offer to the other user's personal channel
                    const otherUserChannel = supabase.channel(`user-signaling:${otherParticipant.id}`);
                    otherUserChannel.subscribe(status => {
                        if (status === 'SUBSCRIBED') {
                            console.log('[RTC] Sending offer to user channel:', otherParticipant.id);
                            otherUserChannel.send({
                              type: 'broadcast',
                              event: 'offer',
                              payload: { from: currentUser.id, offer, callerProfile: currentUser }
                            });
                            supabase.removeChannel(otherUserChannel);
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
  }, [currentUser.id, otherParticipant.id, isReceiving, supabase, toast]);

  return null;
}
