
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
  const signalingChannel = useRef<any>(null);
  
  const endCall = useCallback(() => {
    if (activeCall && user && signalingChannel.current) {
        signalingChannel.current.send({
            type: 'broadcast',
            event: 'hangup',
            payload: { from: user.id },
        });
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
    const channel = supabase.channel(`user-signaling:${user.id}`);
    signalingChannel.current = channel;
    
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
        channel.unsubscribe();
        signalingChannel.current = null;
    };

  }, [user, supabase, findUserById, activeCall, incomingCall, endCall, toast]);

  const startCall = useCallback(async (participant: UserProfile) => {
     if (!user) return;
     setActiveCall({ otherParticipant: participant });
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
        const hangupChannel = supabase.channel(`user-signaling:${incomingCall.otherParticipant.id}`);
        hangupChannel.subscribe(() => {
            hangupChannel.send({
                type: 'broadcast',
                event: 'hangup',
                payload: { from: user.id },
            });
            supabase.removeChannel(hangupChannel);
        });
        setIncomingCall(null);
    }
  };

  return (
    <CallContext.Provider value={{ startCall, endCall, activeCall, joinCall }}>
      {children}
      {user && activeCall && (
        <VoiceCall
          supabase={supabase}
          currentUser={{ ...user, ...findUserById(user.id)} as UserProfile}
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
