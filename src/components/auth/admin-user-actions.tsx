'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { deleteUser } from '@/app/actions/user';
import { useToast } from '@/hooks/use-toast';
import { Shield, Trash2, User as UserIcon } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
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
import { useRouter } from 'next/navigation';

type AdminUserActionsProps = {
  users: User[];
};

export function AdminUserActions({ users }: AdminUserActionsProps) {
  const { toast } = useToast();
  const router = useRouter();

  async function handleDeleteUser(userId: string) {
    try {
      await deleteUser(userId);
      toast({
        title: 'User Deleted',
        description: 'The user account has been permanently deleted.',
      });
      // Refresh the page to update the user list
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error Deleting User',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="absolute top-4 right-4">
      <AlertDialog>
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
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the user: {user.email}. This
                      action cannot be undone.
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
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </AlertDialog>
    </div>
  );
}
