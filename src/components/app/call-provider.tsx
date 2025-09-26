
'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import type { UserProfile, Chat } from '@/lib/data';
import { VoiceCall } from './voice-call';
import { IncomingCallDialog } from './incoming-call-dialog';
import { useToast } from '@/hooks/use-toast';
import { getUsers } from '@/app/(auth)/actions/chat';

type Call = {
  otherParticipant: UserProfile;
  offer?: RTCSessionDescriptionInit;
};

type ActiveCallState = {
  chatId: string;
  participants: string[];
};

type CallContextType = {
  startCall: (participant: UserProfile, chatId?: string) => void;
  endCall: () => void;
  activeCall: Call | null;
  activeGroupCalls: Record<string, ActiveCallState>;
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
  const [activeGroupCalls, setActiveGroupCalls] = useState<Record<string, ActiveCallState>>({});
  const supabase = createClient();
  const { toast } = useToast();
  
  const endCall = useCallback(() => {
    if (activeCall && user) {
        const channel = supabase.channel(`signaling:${user.id}`);
        channel.send({
            type: 'broadcast',
            event: 'hangup',
            payload: { from: user.id },
        });
        channel.unsubscribe();
    }
    setActiveCall(null);
    setIncomingCall(null);
  }, [activeCall, user, supabase]);


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
    const channel = supabase.channel(`signaling:${user.id}`);
    
    channel.on('broadcast', { event: 'offer' }, ({ payload }) => {
        const caller = findUserById(payload.from);
        if (caller && !activeCall) {
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
        if (status === 'SUBSCRIBED') {
            // console.log(`Subscribed to signaling channel: ${user.id}`);
        }
        if (err) {
            console.error('Signaling channel subscription error:', err);
        }
    });

    return () => {
        channel.unsubscribe();
    };

  }, [user, supabase, findUserById, activeCall, incomingCall, endCall, toast]);

  const startCall = useCallback(async (participant: UserProfile, chatId?: string) => {
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
        const channel = supabase.channel(`signaling:${incomingCall.otherParticipant.id}`);
        channel.subscribe(() => {
            channel.send({
                type: 'broadcast',
                event: 'hangup',
                payload: { from: user.id },
            });
            channel.unsubscribe();
        });
        setIncomingCall(null);
    }
  };

  return (
    <CallContext.Provider value={{ startCall, endCall, activeCall, activeGroupCalls, joinCall }}>
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
