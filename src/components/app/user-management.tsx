
'use client';

import type { User } from '@supabase/supabase-js';
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
import { Trash2 } from 'lucide-react';
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


type UserManagementProps = {
  users: User[];
};

export function UserManagement({ users }: UserManagementProps) {
  const { toast } = useToast();

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
            <TableRow key={user.id}>
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
                        this user's account and remove their data from our
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
