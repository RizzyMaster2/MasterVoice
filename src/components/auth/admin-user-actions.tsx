'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteUser } from '@/app/(auth)/actions/user';
import { useToast } from '@/hooks/use-toast';
import { Shield, Trash2, User as UserIcon } from 'lucide-react';


type AdminUserActionsProps = {
  users: User[];
};

export function AdminUserActions({ users }: AdminUserActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  async function handleDeleteUser() {
    if (!userToDelete) return;
    
    try {
      await deleteUser(userToDelete.id);
      toast({
        title: 'User Deleted',
        description: 'The user account has been permanently deleted.',
      });
      setUserToDelete(null);
      setIsAlertOpen(false);
      // Refresh the page to update the user list
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error Deleting User',
        description: (error as Error).message,
        variant: 'destructive',
      });
      setIsAlertOpen(false);
    }
  }

  const openAlertDialog = (user: User) => {
    setUserToDelete(user);
    setIsAlertOpen(true);
  }

  return (
    <div className="absolute top-4 right-4">
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Shield className="h-4 w-4" />
              <span className="sr-only">Admin Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Users</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {users.map((user) => (
              <DropdownMenuItem
                key={user.id}
                className="flex justify-between items-center"
                onSelect={(e) => e.preventDefault()}
              >
                <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    <span>{user.email}</span>
                </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openAlertDialog(user)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
         {userToDelete && (
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the user: {userToDelete.email}. This
                    action cannot be undone.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDeleteUser}
                    className="bg-destructive hover:bg-destructive/90"
                >
                    Delete
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
         )}
      </AlertDialog>
    </div>
  );
}
