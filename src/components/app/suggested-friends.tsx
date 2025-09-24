
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserProfile } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, Search, Sparkles, Loader2 } from 'lucide-react';
import { CreateGroupDialog } from './create-group-dialog';

type SuggestedFriendsProps = {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onAddFriend: (friend: UserProfile) => void;
  contactIds: Set<string>;
  onChatCreated: () => void;
  isAddingFriend: boolean;
};

export function SuggestedFriends({ currentUser, allUsers, onAddFriend, contactIds, onChatCreated, isAddingFriend }: SuggestedFriendsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [userBeingAdded, setUserBeingAdded] = useState<string | null>(null);

  const getInitials = (name: string | null) => (name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U');
  
  const filteredUsers = useMemo(() => {
    const availableUsers = allUsers.filter(user => user.id !== currentUser.id);

    if (searchQuery) {
      return availableUsers.filter(user => 
        user.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // If no search query, show suggestions (users who are not contacts)
    const suggested = availableUsers.filter(user => !contactIds.has(user.id));
    return suggested.slice(0, 5);

  }, [allUsers, currentUser.id, contactIds, searchQuery]);

  const handleAddClick = (user: UserProfile) => {
    setUserBeingAdded(user.id);
    onAddFriend(user);
  }

  // Reset the specific user's loading state when the global transition finishes
  if (!isAddingFriend && userBeingAdded) {
    setUserBeingAdded(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between font-headline">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Find Friends
          </div>
          <CreateGroupDialog
            allUsers={allUsers.filter(user => user.id !== currentUser.id)}
            onGroupCreated={onChatCreated}
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
                {!contactIds.has(user.id) && (
                    <Button variant="ghost" size="icon" onClick={() => handleAddClick(user)} disabled={isAddingFriend}>
                       {isAddingFriend && userBeingAdded === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                       ) : (
                        <Plus className="h-4 w-4" />
                       )}
                        <span className="sr-only">Add friend</span>
                    </Button>
                )}
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

    