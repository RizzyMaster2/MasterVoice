
'use client';

import type { UserProfile } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Phone, PhoneOff } from "lucide-react";

interface ActiveCallBarProps {
    participants: UserProfile[];
    onJoin: () => void;
    onDecline: () => void;
}

const getInitials = (name: string | null | undefined) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'U';

export function ActiveCallBar({ participants, onJoin, onDecline }: ActiveCallBarProps) {
    if (participants.length === 0) {
        return null;
    }

    return (
        <div className="p-3 bg-card border rounded-lg flex items-center justify-between animate-in fade-in-50">
            <div className="flex items-center gap-4">
                <div className="flex -space-x-4 rtl:space-x-reverse">
                    {participants.slice(0, 3).map(p => (
                        <Avatar key={p.id} className="w-8 h-8 border-2 border-background">
                            <AvatarImage src={p.photo_url || ''} />
                            <AvatarFallback>{getInitials(p.display_name)}</AvatarFallback>
                        </Avatar>
                    ))}
                </div>
                <div>
                    <p className="font-semibold text-sm">Incoming Call</p>
                    <p className="text-xs text-muted-foreground">{participants[0].display_name} is calling...</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button size="sm" variant="destructive" onClick={onDecline}>
                    <PhoneOff className="h-4 w-4 mr-2" />
                    Decline
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={onJoin}>
                    <Phone className="h-4 w-4 mr-2" />
                    Join
                </Button>
            </div>
        </div>
    )
}
