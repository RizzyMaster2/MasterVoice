
'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import type { UserProfile } from '@/lib/data';
import { VoiceCall } from './voice-call';
import { IncomingCallDialog } from './incoming-call-dialog';
import { useToast } from '@/hooks/use-toast';
import { getUsers } from '@/app/(auth)/actions/chat';

type Call = {
  otherParticipant: UserProfile;
  offer?: RTCSessionDescriptionInit;
};

type CallContextType = {
  startCall: (participant: UserProfile) => void;
  endCall: () => void;
  activeCall: Call | null;
};

const CallContext = createContext<CallContextType | null>(null);

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      const users = await getUsers();
      setAllUsers(users);
    };
    fetchUsers();
  }, []);

  const findUserById = useCallback((userId: string) => {
    return allUsers.find(u => u.id === userId);
  }, [allUsers]);

  const endCall = useCallback(() => {
    setActiveCall(null);
    setIncomingCall(null);
  }, []);

  const startCall = useCallback(async (participant: UserProfile) => {
    if (!user || activeCall) return;

    // Create a temporary PeerConnection to create an offer
    const tempPc = new RTCPeerConnection();
    const offer = await tempPc.createOffer();
    await tempPc.setLocalDescription(offer);
    tempPc.close(); // Clean up immediately

    const signalingChannel = supabase.channel(`signaling-channel-${[user.id, participant.id].sort().join('-')}`);
    
    signalingChannel.subscribe((status) => {
        if(status === 'SUBSCRIBED') {
            signalingChannel.send({
                type: 'broadcast',
                event: 'call-offer',
                payload: {
                  from: user.id,
                  to: participant.id,
                  offer: offer,
                },
              });
        }
    });

    setActiveCall({ otherParticipant: participant });

    const timeout = setTimeout(() => {
        if (activeCall) { // Check if call is still ringing
            toast({ title: 'Call timed out', description: `${participant.display_name} did not answer.` });
            endCall();
        }
    }, 30000); // 30 second timeout

    // Listen for acceptance
    signalingChannel.on('broadcast', { event: 'answer' }, () => {
        clearTimeout(timeout);
    });
     signalingChannel.on('broadcast', { event: 'call-rejected' }, () => {
        clearTimeout(timeout);
    });

  }, [user, activeCall, supabase, toast, endCall]);

  useEffect(() => {
    if (!user || allUsers.length === 0) return;

    const handleOffer = ({ payload }: { payload: any }) => {
      if (payload.to === user.id && !activeCall && !incomingCall) {
        const caller = findUserById(payload.from);
        if (caller) {
          setIncomingCall({ otherParticipant: caller, offer: payload.offer });
        }
      }
    };
    
    // Use a more generic channel name that both users can subscribe to
    const myChannel = supabase.channel(`user-channel-${user.id}`);
    
    // Subscribe to broadcast events on a predictable channel name
    const channels = allUsers.map(u => 
        supabase.channel(`signaling-channel-${[user.id, u.id].sort().join('-')}`)
            .on('broadcast', { event: 'call-offer' }, handleOffer)
            .subscribe()
    );
    
    return () => {
        channels.forEach(channel => channel.unsubscribe());
    };
  }, [user, supabase, activeCall, incomingCall, findUserById, allUsers]);

  const acceptCall = () => {
    if (incomingCall) {
      setActiveCall(incomingCall);
      setIncomingCall(null);
    }
  };

  const declineCall = () => {
    if (incomingCall && user) {
        const signalingChannel = supabase.channel(`signaling-channel-${[user.id, incomingCall.otherParticipant.id].sort().join('-')}`);
         signalingChannel.subscribe((status) => {
            if(status === 'SUBSCRIBED') {
                 signalingChannel.send({
                    type: 'broadcast',
                    event: 'call-rejected',
                    payload: { from: user.id, to: incomingCall.otherParticipant.id },
                });
                setIncomingCall(null);
            }
        });
    }
  };

  return (
    <CallContext.Provider value={{ startCall, endCall, activeCall }}>
      {children}
      {user && activeCall && (
        <VoiceCall
          supabase={supabase}
          currentUser={user as UserProfile}
          otherParticipant={activeCall.otherParticipant}
          initialOffer={activeCall.offer}
          onClose={endCall}
        />
      )}
      {user && incomingCall && (
        <IncomingCallDialog
          caller={incomingCall.otherParticipant}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}
    </CallContext.Provider>
  );
}
