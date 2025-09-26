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
    // Realtime hangup logic removed
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

  const findUserById = useCallback((userId: string) => {
    return allUsers.find(u => u.id === userId);
  }, [allUsers]);

  const startCall = useCallback(async (participant: UserProfile, chatId?: string) => {
     toast({
      title: 'Feature Coming Soon',
      description: 'Voice calling is not available at the moment.',
      variant: 'info'
    });
    // All realtime logic removed
  }, [toast]);

  const joinCall = (chatId: string) => {
    toast({
      title: 'Feature Coming Soon',
      description: 'Voice calling is not available at the moment.',
      variant: 'info'
    });
    // For now, this just opens the voice call component
    // In a real app, this would need to negotiate a connection with existing participants
    // if (user && activeGroupCalls[chatId]) {
    //   const otherParticipant = findUserById(activeGroupCalls[chatId].participants[0]); // Just picking the first one for now
    //    if (otherParticipant) {
    //        setActiveCall({ otherParticipant: otherParticipant });
    //    }
    // }
  };

  const acceptCall = () => {
    if (incomingCall) {
      setActiveCall(incomingCall);
      setIncomingCall(null);
    }
  };

  const declineCall = () => {
    // Realtime rejection logic removed
    if (incomingCall && user) {
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
