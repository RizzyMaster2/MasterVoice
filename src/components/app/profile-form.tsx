
'use client';

import { useEffect, useState, useRef, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

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
import { Save, ShieldAlert, Upload, Loader2 } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';
import { updateUserProfile } from '@/app/(auth)/actions/user';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  bio: z
    .string()
    .max(160, { message: 'Bio cannot exceed 160 characters.' })
    .optional(),
  avatarFile: z.any().optional(),
});

type ProfileFormValues = z.infer<typeof formSchema>;

export function ProfileForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const supabase = createClient();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      bio: '',
      avatarFile: undefined,
    },
  });

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (!error && user) {
        setUser(user);
        setIsVerified(!!user.email_confirmed_at);
        const metadata = user.user_metadata;
        form.reset({
          name: metadata?.display_name || metadata?.full_name || '',
          bio: metadata?.bio || '',
        });
        setPreviewUrl(metadata?.avatar_url || metadata?.photo_url || null);
      }
    };
    fetchUser();
  }, [form, supabase]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      form.setValue('avatarFile', file, { shouldDirty: true });
      const newPreviewUrl = URL.createObjectURL(file);
      
      if (previewUrl && !previewUrl.startsWith('https://')) {
          URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(newPreviewUrl);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl && !previewUrl.startsWith('https://')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);


  async function onSubmit(data: FormData) {
    if (!user) return;
    
    startTransition(async () => {
        try {
            await updateUserProfile(data);
            toast({
                title: 'Profile Updated',
                description: 'Your changes have been saved successfully.',
            });
            form.reset(form.getValues()); // Reset with new values to clear dirty state
            router.refresh();
        } catch (error) {
            toast({
                title: 'Error Updating Profile',
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        }
    });
  }
  
  const getInitials = (name: string | undefined | null) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'U';

  if (!user) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="col-span-1 flex flex-col items-center gap-4">
                <Skeleton className="h-32 w-32 rounded-full" />
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="col-span-2 space-y-8">
                 <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-20 w-full" />
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isVerified && (
        <Alert
          variant="destructive"
          className="mb-6 bg-amber-50 border-amber-200 text-amber-800 [&>svg]:text-amber-600"
        >
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Account Not Verified</AlertTitle>
          <AlertDescription>
            Please verify your email address to enable profile editing and sending friend requests.
          </AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form ref={formRef} action={onSubmit} className="space-y-8">
          <input type="hidden" name="userId" value={user.id} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <div className="col-span-1 flex flex-col items-center text-center gap-4">
              <FormLabel>Avatar</FormLabel>
              <Avatar className="h-32 w-32">
                <AvatarImage src={previewUrl || undefined} alt={form.getValues('name')} />
                <AvatarFallback className="text-4xl">{getInitials(form.getValues('name'))}</AvatarFallback>
              </Avatar>
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  name="avatarFile"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={!isVerified}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isVerified}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Image
                </Button>
              </div>
            </div>

            <div className="col-span-2 space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your Name"
                        {...field}
                        disabled={!isVerified}
                      />
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
                        className="resize-none h-24"
                        {...field}
                        disabled={!isVerified}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end">
              <Button type="submit" disabled={!isVerified || isSubmitting || !form.formState.isDirty}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
