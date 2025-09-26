
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
        const channelId = `signaling-channel-${[user.id, activeCall.otherParticipant.id].sort().join('-')}`;
        const signalingChannel = supabase.channel(channelId);
        signalingChannel.send({
            type: 'broadcast',
            event: 'hangup',
            payload: { from: user.id, to: activeCall.otherParticipant.id },
        });
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

  const startCall = useCallback(async (participant: UserProfile, chatId?: string) => {
    if (!user || activeCall) return;

    if (chatId) {
        // This is a group call initiation
        setActiveCall({ otherParticipant: participant });
        // Send a group call update
         const callChannel = supabase.channel(`call-state:${chatId}`);
         callChannel.subscribe(status => {
            if (status === 'SUBSCRIBED') {
                 callChannel.track({ user_id: user.id, status: 'online' });
            }
         });

    } else {
        // This is a 1-on-1 call
        const tempPc = new RTCPeerConnection();
        const offer = await tempPc.createOffer();
        await tempPc.setLocalDescription(offer);
        tempPc.close();

        const channelId = `signaling-channel-${[user.id, participant.id].sort().join('-')}`;
        const signalingChannel = supabase.channel(channelId);
        
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

        setActiveCall({ otherParticipant: participant, offer });

        const timeout = setTimeout(() => {
            // Check if still ringing. `activeCall` might be stale here due to closure, 
            // so we check against the offer property which is only set for the caller.
            setActiveCall(currentActiveCall => {
                if (currentActiveCall?.offer) { 
                    toast({ title: 'Call timed out', description: `${participant.display_name} did not answer.` });
                    endCall();
                    return null;
                }
                return currentActiveCall;
            });
        }, 30000);

        signalingChannel.on('broadcast', { event: 'answer' }, () => clearTimeout(timeout));
        signalingChannel.on('broadcast', { event: 'call-rejected' }, () => clearTimeout(timeout));
    }

  }, [user, activeCall, supabase, toast, endCall]);

  const joinCall = (chatId: string) => {
    // Logic to join an existing group call
    // For now, this just opens the voice call component
    // In a real app, this would need to negotiate a connection with existing participants
    if (user && activeGroupCalls[chatId]) {
      const otherParticipant = findUserById(activeGroupCalls[chatId].participants[0]); // Just picking the first one for now
       if (otherParticipant) {
           setActiveCall({ otherParticipant: otherParticipant });
       }
    }
  };


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
    
    // Listen for direct 1-on-1 call offers from ALL users.
    const allUserChannels = allUsers
        .filter(u => u.id !== user.id)
        .map(u => {
            const channelId = `signaling-channel-${[user.id, u.id].sort().join('-')}`;
            return supabase.channel(channelId)
                .on('broadcast', { event: 'call-offer' }, handleOffer)
                .subscribe();
        }
    );
    
    return () => {
        allUserChannels.forEach(channel => channel.unsubscribe());
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
                signalingChannel.unsubscribe();
            }
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
