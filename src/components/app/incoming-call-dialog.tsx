
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
import { useToast } from '@/hooks/use-toast';

// A simple, short ringing sound as a Base64 data URI (WAV format)
const ringtoneDataUri = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

interface IncomingCallDialogProps {
  caller: UserProfile;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallDialog({ caller, onAccept, onDecline }: IncomingCallDialogProps) {
  const getInitials = (name: string | undefined | null) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '?';
  
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const playSound = async () => {
      if (audioRef.current) {
        try {
          await audioRef.current.play();
        } catch (error) {
          console.warn("Ringtone autoplay was blocked by the browser. A user interaction is required to play audio.");
        }
      }
    };
    
    playSound();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
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
        <audio ref={audioRef} src={ringtoneDataUri} loop />
      </DialogContent>
    </Dialog>
  );
}
