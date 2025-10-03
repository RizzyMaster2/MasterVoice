
'use client';

import * as React from 'react';
import type { User } from '@supabase/supabase-js';
import type { UserProfile, Friend } from '@/lib/data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Trash2, Users, ChevronDown, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deleteUser } from '@/app/(auth)/actions/user';
import { useToast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { getFriendsForUser } from '@/app/(auth)/actions/admin';
import { Card, CardContent } from '../ui/card';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

type UserManagementProps = {
  users: User[];
};

function UserFriends({ userId }: { userId: string }) {
  const [friends, setFriends] = React.useState<Friend[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchFriends() {
      try {
        setIsLoading(true);
        const data = await getFriendsForUser(userId);
        setFriends(data as Friend[]);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchFriends();
  }, [userId]);
  
  const getInitials = (name: string | undefined | null) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'U';


  if (isLoading) {
    return <div className="flex items-center gap-2 p-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/>Loading friends...</div>;
  }
  if (error) {
    return <p className="text-destructive p-4">Error: {error}</p>;
  }
  if (friends.length === 0) {
    return <p className="p-4 text-muted-foreground">This user has no friends.</p>;
  }

  return (
      <div className="space-y-2 p-2">
        {friends.map(friend => (
            <div key={friend.friend_id} className="flex items-center gap-3 p-2 rounded-md bg-accent/50">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={friend.friend_profile?.photo_url || undefined} alt={friend.friend_profile?.display_name || ''} />
                    <AvatarFallback>{getInitials(friend.friend_profile?.display_name)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-medium text-sm">{friend.friend_profile?.display_name}</p>
                    <p className="text-xs text-muted-foreground">{friend.friend_profile?.email}</p>
                </div>
            </div>
        ))}
      </div>
  );
}


export function UserManagement({ users }: UserManagementProps) {
  const { toast } = useToast();
  const [openCollapsibleId, setOpenCollapsibleId] = React.useState<string | null>(null);

  const getInitials = (name: string | undefined | null) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'U';

  async function handleDeleteUser(userId: string) {
    try {
      await deleteUser(userId);
      toast({
        title: 'User Deleted',
        description: 'The user account has been permanently deleted.',
        variant: 'success'
      });
    } catch (error) {
      toast({
        title: 'Error Deleting User',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  }

  if (!users || users.length === 0) {
    return <p>No users to display.</p>
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <Collapsible asChild key={user.id} onOpenChange={(isOpen) => setOpenCollapsibleId(isOpen ? user.id : null)}>
             <>
              <TableRow>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage
                      src={user.user_metadata.photo_url || user.user_metadata.avatar_url}
                      alt={user.user_metadata.display_name || user.user_metadata.full_name}
                    />
                    <AvatarFallback>
                      {getInitials(user.user_metadata.display_name || user.user_metadata.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">
                    {user.user_metadata.display_name || user.user_metadata.full_name || 'N/A'}
                  </span>
                </div>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                {new Date(user.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Users className="h-4 w-4" />
                        <ChevronDown className={cn("h-4 w-4 transition-transform", openCollapsibleId === user.id && "rotate-180")} />
                        <span className="sr-only">View Friends</span>
                    </Button>
                </CollapsibleTrigger>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Delete user</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete
                        this user&apos;s account and remove their data from our
                        servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteUser(user.id)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
            <CollapsibleContent asChild>
                <tr>
                    <td colSpan={4}>
                       <Card className="m-2">
                            <CardContent className="p-2">
                                {openCollapsibleId === user.id && <UserFriends userId={user.id}/>}
                            </CardContent>
                       </Card>
                    </td>
                </tr>
            </CollapsibleContent>
            </>
           </Collapsible>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
