'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { deleteUser } from '@/app/actions/user';

import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
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
import { User, Save, Trash2, ShieldAlert } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  bio: z.string().max(160, { message: 'Bio cannot exceed 160 characters.' }).optional(),
  avatarUrl: z.string().url({ message: 'Please enter a valid URL.' }).optional(),
});

type ProfileFormValues = z.infer<typeof formSchema>;

export function ProfileForm() {
  const { toast } = useToast();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const supabase = createClient();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      bio: '',
      avatarUrl: '',
    },
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) {
        setUser(data.user);
        setIsVerified(!!data.user.email_confirmed_at);
        form.reset({
          name: data.user.user_metadata?.full_name || '',
          bio: data.user.user_metadata?.bio || '',
          avatarUrl: data.user.user_metadata?.avatar_url || '',
        });
        if (!data.user.email_confirmed_at) {
          form.disable();
        }
      }
    };
    fetchUser();
  }, [form, supabase]);
  
  const avatarUrl = form.watch('avatarUrl');

  async function onSubmit(values: ProfileFormValues) {
    if (!user) return;
    
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: values.name,
        bio: values.bio,
        avatar_url: values.avatarUrl,
      }
    })

    if (error) {
      toast({
        title: 'Error Updating Profile',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Profile Updated',
        description: 'Your changes have been saved successfully.',
      });
    }
  }

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

  if (!user) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    )
  }

  return (
    <Form {...form}>
      {!isVerified && (
        <Alert variant="destructive" className="mb-6 bg-amber-50 border-amber-200 text-amber-800 [&>svg]:text-amber-600">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Account Not Verified</AlertTitle>
          <AlertDescription>
            Please verify your email address to enable profile editing and unlock all features.
          </AlertDescription>
        </Alert>
      )}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-8" aria-disabled={!isVerified}>
          <FormField
            control={form.control}
            name="avatarUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Avatar</FormLabel>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={avatarUrl} alt={form.getValues('name')} />
                    <AvatarFallback><User className="h-10 w-10" /></AvatarFallback>
                  </Avatar>
                  <FormControl>
                    <Input placeholder="https://example.com/avatar.png" {...field} disabled={!isVerified} />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your Name" {...field} disabled={!isVerified} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell us a little bit about yourself"
                    className="resize-none"
                    {...field}
                    disabled={!isVerified}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" disabled={!isVerified}>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
        <div className="flex justify-end pt-8 border-t">
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
        </div>
      </form>
    </Form>
  );
}
