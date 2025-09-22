
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { User as AppUser } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, Search, Sparkles } from 'lucide-react';

type SuggestedFriendsProps = {
  allUsers: AppUser[];
  onAddFriend: (friend: AppUser) => void;
  currentUserId: string;
  contacts: AppUser[];
};

export function SuggestedFriends({ allUsers, onAddFriend, currentUserId, contacts }: SuggestedFriendsProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

  const availableUsers = allUsers.filter(user => 
    user.id !== currentUserId && !contacts.find(c => c.id === user.id)
  );

  const filteredUsers = searchQuery 
    ? availableUsers.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableUsers.slice(0, 5); // Show top 5 suggestions if no search

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Sparkles className="h-5 w-5 text-accent" />
          Find Friends
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for people..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {filteredUsers.length > 0 ? (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
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
          <p className="text-sm text-muted-foreground text-center pt-4">
            {searchQuery ? 'No users found.' : 'No new suggestions. Try searching!'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
