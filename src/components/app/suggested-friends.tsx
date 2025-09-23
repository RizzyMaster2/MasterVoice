
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserProfile } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, Search, Sparkles } from 'lucide-react';
import { CreateGroupDialog } from './create-group-dialog';

type SuggestedFriendsProps = {
  allUsers: UserProfile[];
  onAddFriend: (friend: UserProfile) => void;
  contactIds: Set<string>;
  onGroupCreated: () => void;
};

export function SuggestedFriends({ allUsers, onAddFriend, contactIds, onGroupCreated }: SuggestedFriendsProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const getInitials = (name: string | null) => (name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U');
  
  const availableUsers = useMemo(() => allUsers.filter(user => !contactIds.has(user.id)), [allUsers, contactIds]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return availableUsers.slice(0, 5); // Show top 5 suggestions if no search
    
    return availableUsers.filter(user => 
        user.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
  }, [searchQuery, availableUsers]);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between font-headline">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Find Friends
          </div>
          <CreateGroupDialog
            allUsers={allUsers}
            onGroupCreated={onGroupCreated}
          />
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
                    <AvatarImage src={user.photo_url || undefined} alt={user.display_name || ''} />
                    <AvatarFallback>{getInitials(user.display_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{user.display_name}</p>
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
