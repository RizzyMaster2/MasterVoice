'use client';

import { useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { deleteUser } from '@/app/actions/user';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';

export function SettingsContent() {
  const { toast } = useToast();
  const { user } = useUser();

  async function handleDeleteAccount() {
    if (!user) return;
    try {
      await deleteUser(user.id);
      toast({
        title: 'Account Deleted',
        description: 'Your account has been permanently deleted.',
      });
      // The server action will handle the redirect.
    } catch (error) {
      toast({
        title: 'Error Deleting Account',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
       <Card className='border-destructive'>
        <CardHeader>
            <CardTitle className='text-destructive'>Danger Zone</CardTitle>
            <CardDescription>
                These actions are permanent and cannot be undone.
            </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-between items-center">
            <p className='text-sm'>Delete your account and all associated data.</p>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    account and remove your data from our servers.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive hover:bg-destructive/90"
                    >
                    Continue
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CardFooter>
       </Card>
    </div>
  );
}
