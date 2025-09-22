'use client';

import { ProfileForm } from '@/components/app/profile-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { deleteUser } from '@/app/actions/user';
import { Mic, Trash2, Volume2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ProfilePage() {
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
    <div className="max-w-4xl mx-auto space-y-6">
      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="audio">Audio & Voice</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Public Profile</CardTitle>
              <CardDescription>
                This is how others will see you on the site.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="audio" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Audio & Voice</CardTitle>
              <CardDescription>
                Manage your audio input and output settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex items-center gap-4">
                <Mic className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <Label htmlFor="input-device">Input Device</Label>
                  <Select>
                    <SelectTrigger id="input-device">
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default - Microphone (Realtek Audio)</SelectItem>
                      <SelectItem value="device-1">Microphone (Device 1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
               <div className="flex items-center gap-4">
                <Volume2 className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <Label htmlFor="output-device">Output Device</Label>
                  <Select>
                    <SelectTrigger id="output-device">
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default - Speakers (Realtek Audio)</SelectItem>
                      <SelectItem value="device-1">Headphones (Device 1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="account" className="mt-6">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                These actions are permanent and cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-between items-center">
              <p className="text-sm">
                Delete your account and all associated data.
              </p>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
