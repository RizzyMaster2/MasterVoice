
'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  startCall: (participant: UserProfile, chatId?: string) => void;
  endCall: () => void;
  activeCall: Call | null;
  joinCall: (chatId: string) => void;
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
  const userChannelRef = useRef<any>(null);
  
  const endCall = useCallback(() => {
    if (activeCall && user && userChannelRef.current) {
        // Broadcast hangup on the shared channel if one exists in RTC component,
        // or just clean up locally. The other side will handle via connection state change.
    }
    setActiveCall(null);
    setIncomingCall(null);
  }, [activeCall, user]);


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

  useEffect(() => {
    if (!user) return;
    
    // This channel is for this user to receive signals
    const channel = supabase.channel(`user-signaling:${user.id}`);
    userChannelRef.current = channel;
    
    channel.on('broadcast', { event: 'offer' }, ({ payload }) => {
        const caller = findUserById(payload.from);
        if (caller && !activeCall && !incomingCall) {
            setIncomingCall({ otherParticipant: caller, offer: payload.offer });
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

  }, [user, supabase, findUserById, activeCall, incomingCall, endCall, toast]);

  const startCall = useCallback(async (participant: UserProfile) => {
     if (!user) return;
     // Set the active call locally to open the UI
     setActiveCall({ otherParticipant: participant });
     
     // The `VoiceCall` component will handle creating and sending the offer.
  }, [user]);

  const joinCall = (chatId: string) => {
    toast({
      title: 'Feature Coming Soon',
      description: 'Group voice calling is not available at the moment.',
      variant: 'info'
    });
  };

  const acceptCall = () => {
    if (incomingCall) {
      setActiveCall(incomingCall);
      setIncomingCall(null);
    }
  };

  const declineCall = () => {
    if (incomingCall && user) {
        // Send a hangup message to the caller's channel
        const callerChannel = supabase.channel(`user-signaling:${incomingCall.otherParticipant.id}`);
        callerChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                callerChannel.send({
                    type: 'broadcast',
                    event: 'hangup',
                    payload: { from: user.id },
                }).then(() => supabase.removeChannel(callerChannel));
            }
        });
        setIncomingCall(null);
    }
  };

  const currentUserProfile: UserProfile | null = user ? {
    id: user.id,
    display_name: user.user_metadata?.display_name || user.email,
    full_name: user.user_metadata?.full_name || user.email,
    photo_url: user.user_metadata?.photo_url || '',
    created_at: user.created_at,
    email: user.email || null,
    status: 'online', // Placeholder
    bio: user.user_metadata?.bio || null,
  } : null;

  return (
    <CallContext.Provider value={{ startCall, endCall, activeCall, joinCall }}>
      {children}
      {currentUserProfile && activeCall && (
        <VoiceCall
          supabase={supabase}
          currentUser={currentUserProfile}
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
