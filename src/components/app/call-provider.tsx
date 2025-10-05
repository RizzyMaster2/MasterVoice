
'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
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

export function CallProvider({ children, currentUser }: { children: React.ReactNode; currentUser: UserProfile }) {
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const supabase = createClient();
  const { toast } = useToast();
  const userChannelRef = useRef<any>(null);
  
  const endCall = useCallback(() => {
    setActiveCall(null);
    setIncomingCall(null);
  }, []);


  useEffect(() => {
    const fetchUsers = async () => {
      const users = await getUsers();
      setAllUsers(users);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    
    const channel = supabase.channel(`user-signaling:${currentUser.id}`);
    userChannelRef.current = channel;
    
    channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
        // Fetch fresh user data to prevent depending on stale `allUsers` state
        const { data: callerProfile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.from)
            .single();

        if (error || !callerProfile) {
            console.error("Could not find profile for caller:", payload.from);
            return;
        }

        if (callerProfile && !activeCall && !incomingCall) {
            setIncomingCall({ otherParticipant: callerProfile, offer: payload.offer });
        }
    });

    channel.on('broadcast', { event: 'hangup' }, () => {
        if (activeCall || incomingCall) {
            endCall();
            toast({ title: "Call Ended", description: "The other user has ended the call." });
        }
    });
    
    channel.subscribe((status, err) => {
        if (err) {
            console.error('Signaling channel subscription error:', err);
        }
    });

    return () => {
        if (channel) {
            supabase.removeChannel(channel);
        }
        userChannelRef.current = null;
    };

  }, [currentUser?.id, supabase, activeCall, incomingCall, endCall, toast]);

  const startCall = useCallback((participant: UserProfile) => {
     if (!currentUser.id) return;
     setActiveCall({ otherParticipant: participant });
  }, [currentUser.id]);

  const acceptCall = () => {
    if (incomingCall) {
      setActiveCall(incomingCall);
      setIncomingCall(null);
    }
  };

  const declineCall = () => {
    if (incomingCall && currentUser) {
        // Send a hangup message to the caller's channel
        const callerChannel = supabase.channel(`user-signaling:${incomingCall.otherParticipant.id}`);
        callerChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                callerChannel.send({
                    type: 'broadcast',
                    event: 'hangup',
                    payload: { from: currentUser.id },
                }).then(() => supabase.removeChannel(callerChannel));
            }
        });
        setIncomingCall(null);
    }
  };

  return (
    <CallContext.Provider value={{ startCall, endCall, activeCall }}>
      {children}
      {currentUser && activeCall && (
        <VoiceCall
          supabase={supabase}
          currentUser={currentUser}
          otherParticipant={activeCall.otherParticipant}
          initialOffer={activeCall.offer}
          onClose={endCall}
        />
      )}
      {currentUser && incomingCall && (
        <IncomingCallDialog
          caller={incomingCall.otherParticipant}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}
    </CallContext.Provider>
  );
}
