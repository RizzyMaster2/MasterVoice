
'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile } from '@/lib/data';
import { IncomingCallDialog } from './incoming-call-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

type Call = {
  otherParticipant: UserProfile;
  offer?: RTCSessionDescriptionInit;
};

type CallContextType = {
  incomingCall: Call | null;
  acceptCall: () => void;
  declineCall: () => void;
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
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const supabase = createClient();
  const { toast } = useToast();
  const userChannelRef = useRef<any>(null);
  const router = useRouter();
  const declineTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const clearDeclineTimer = () => {
    if (declineTimerRef.current) {
      clearTimeout(declineTimerRef.current);
      declineTimerRef.current = null;
    }
  }

  const declineCall = useCallback(() => {
    clearDeclineTimer();
    if (incomingCall && currentUser) {
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
    }
    setIncomingCall(null);
  }, [incomingCall, currentUser, supabase]);

  useEffect(() => {
    if (!currentUser?.id) return;
    
    const channel = supabase.channel(`user-signaling:${currentUser.id}`);
    userChannelRef.current = channel;
    
    channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
        const { data: callerProfile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.from)
            .single();

        if (error || !callerProfile) {
            console.error("Could not find profile for caller:", payload.from);
            return;
        }

        if (callerProfile && !incomingCall) {
            setIncomingCall({ otherParticipant: callerProfile, offer: payload.offer });
            
            // Set a timeout to automatically decline the call
            declineTimerRef.current = setTimeout(() => {
              toast({
                title: "Missed Call",
                description: `You missed a call from ${callerProfile.display_name}`,
                variant: 'info'
              });
              declineCall();
            }, 10000); // 10 seconds
        }
    });

    channel.on('broadcast', { event: 'hangup' }, () => {
        if (incomingCall) {
            toast({ title: "Call Ended", description: "The other user has ended the call." });
            clearDeclineTimer();
            setIncomingCall(null);
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
        clearDeclineTimer();
    };

  }, [currentUser?.id, supabase, incomingCall, toast, declineCall]);


  const acceptCall = () => {
    clearDeclineTimer();
    if (incomingCall) {
      router.push(`/home/chat/${incomingCall.otherParticipant.id}/call?isReceiving=true`);
      setIncomingCall(null);
    }
  };
  
  return (
    <CallContext.Provider value={{ incomingCall, acceptCall, declineCall }}>
      {children}
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
