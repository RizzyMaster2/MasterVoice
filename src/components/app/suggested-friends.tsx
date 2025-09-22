'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { User as AppUser } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';
import { Sparkles } from 'lucide-react';

type SuggestedFriendsProps = {
  suggestedUsers: AppUser[];
  onAddFriend: (friend: AppUser) => void;
};

export function SuggestedFriends({ suggestedUsers, onAddFriend }: SuggestedFriendsProps) {
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Sparkles className="h-5 w-5 text-accent" />
          Suggested Friends
        </CardTitle>
      </CardHeader>
      <CardContent>
        {suggestedUsers.length > 0 ? (
          <div className="space-y-4">
            {suggestedUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-muted-foreground truncate max-w-[150px]">{user.bio}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onAddFriend(user)}>
                  <Plus className="h-4 w-4" />
                  <span className="sr-only">Add friend</span>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No new suggestions right now. Check back later!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
