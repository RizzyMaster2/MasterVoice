
'use client';

import { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff } from 'lucide-react';
import type { UserProfile } from '@/lib/data';

interface IncomingCallDialogProps {
  caller: UserProfile;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallDialog({ caller, onAccept, onDecline }: IncomingCallDialogProps) {
  const getInitials = (name: string | undefined | null) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '?';

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    // Create audio context and nodes
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    oscillatorRef.current = audioContextRef.current.createOscillator();
    gainRef.current = audioContextRef.current.createGain();

    // Configure oscillator
    oscillatorRef.current.type = 'sine';
    oscillatorRef.current.frequency.setValueAtTime(440, audioContextRef.current.currentTime); // A4 note
    
    // Connect nodes
    oscillatorRef.current.connect(gainRef.current);
    gainRef.current.connect(audioContextRef.current.destination);

    // Start oscillator
    oscillatorRef.current.start();
    
    // Create the ringing pattern
    const ring = () => {
      if (!audioContextRef.current || !gainRef.current) return;
      const now = audioContextRef.current.currentTime;
      gainRef.current.gain.cancelScheduledValues(now);
      gainRef.current.gain.setValueAtTime(0, now);
      // Ring for 1 second, pause for 2 seconds
      gainRef.current.gain.linearRampToValueAtTime(1, now + 0.1);
      gainRef.current.gain.linearRampToValueAtTime(0, now + 1);
    };

    ring(); // Initial ring
    const interval = setInterval(ring, 3000); // Repeat every 3 seconds

    // Cleanup function
    return () => {
      clearInterval(interval);
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <Dialog open={true}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={caller.photo_url || undefined} alt={caller.display_name || ''} />
            <AvatarFallback className="text-4xl">{getInitials(caller.display_name)}</AvatarFallback>
          </Avatar>
          <DialogTitle className="font-headline text-2xl">{caller.display_name}</DialogTitle>
          <DialogDescription>is calling you...</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row justify-center gap-4 pt-4">
          <Button variant="destructive" size="icon" className="rounded-full h-16 w-16" onClick={onDecline}>
            <PhoneOff className="h-7 w-7" />
          </Button>
          <Button variant="success" size="icon" className="rounded-full h-16 w-16 bg-green-600 hover:bg-green-700" onClick={onAccept}>
            <Phone className="h-7 w-7" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
