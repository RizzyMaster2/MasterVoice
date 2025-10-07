
'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile } from '@/lib/data';
import { IncomingCallDialog } from './incoming-call-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

type Call = {
  callerProfile: UserProfile;
  otherParticipant: UserProfile; // Added for context
  offer: RTCSessionDescriptionInit;
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
        // We need to notify the caller on THEIR channel that we hung up.
        const callerHangupChannel = supabase.channel(`user-signaling:${incomingCall.callerProfile.id}`);
        callerHangupChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                callerHangupChannel.send({
                    type: 'broadcast',
                    event: 'hangup',
                    payload: { from: currentUser.id },
                }).then(() => supabase.removeChannel(callerHangupChannel));
            }
        });
    }
    setIncomingCall(null);
  }, [incomingCall, currentUser, supabase]);

  useEffect(() => {
    if (!currentUser?.id) return;
    
    // Listen on the user's personal channel for incoming offers
    const channel = supabase.channel(`user-signaling:${currentUser.id}`);
    userChannelRef.current = channel;
    
    channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
        const { from: callerId, offer, callerProfile } = payload;
        
        if (!callerProfile) {
            console.error("Could not find profile for caller:", callerId);
            return;
        }

        if (callerProfile && !incomingCall) {
            setIncomingCall({ callerProfile, offer, otherParticipant: callerProfile });
            
            // Set a timeout to automatically decline the call
            declineTimerRef.current = setTimeout(() => {
              toast({
                title: "Missed Call",
                description: `You missed a call from ${callerProfile.display_name}`,
              });
              declineCall();
            }, 30000); // 30 seconds
        }
    });

    channel.on('broadcast', { event: 'hangup' }, ({ payload }) => {
        if (incomingCall && payload.from === incomingCall.callerProfile.id) {
            toast({ title: "Call Cancelled", description: "The other user cancelled the call." });
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
      // Pass the offer to the call page via sessionStorage because it's too large for a URL param
      sessionStorage.setItem('webrtc_offer', JSON.stringify(incomingCall.offer));
      router.push(`/home/chat/${incomingCall.callerProfile.id}/call?isReceiving=true`);
      setIncomingCall(null);
    }
  };
  
  // We only show the pop-up dialog if the user is NOT already looking at the chat of the person calling.
  const showDialog = incomingCall && router; // A bit of a hack to check router is ready
  
  return (
    <CallContext.Provider value={{ incomingCall, acceptCall, declineCall }}>
      {children}
      {currentUser && showDialog && (
        <IncomingCallDialog
          participants={[incomingCall.callerProfile]}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}
    </CallContext.Provider>
  );
}
