
'use client';

import { useState, useEffect, useRef } from 'react';
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
import { deleteUser } from '@/app/(auth)/actions/user';
import { Mic, Trash2, Volume2, MicOff, Users, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/lib/data';
import { getChats } from '@/app/(auth)/actions/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { UnverifiedAccountWarning } from '@/components/app/unverified-account-warning';

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred.';
};

export default function ProfilePage() {
  const { toast } = useToast();
  const { user, isVerified } = useUser();
  const router = useRouter();
  const [micLevel, setMicLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);

  useEffect(() => {
    const fetchFriends = async () => {
      if (user) {
        setIsLoadingFriends(true);
        try {
          const chats = await getChats();
          const friendList = chats
            .filter(chat => !chat.is_group && chat.otherParticipant)
            .map(chat => chat.otherParticipant as UserProfile);
          setFriends(friendList);
        } catch (error) {
          toast({
            title: 'Error fetching friends',
            description: getErrorMessage(error),
            variant: 'destructive',
          });
        } finally {
          setIsLoadingFriends(false);
        }
      }
    };
    fetchFriends();
  }, [user, toast]);

  const stopMicTest = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    mediaStreamRef.current = null;
    setMicLevel(0);
    setIsMicTesting(false);
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopMicTest();
    };
  }, []);

  const startMicTest = async () => {
    if (isMicTesting) {
      stopMicTest();
    }
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        
        analyserRef.current.fftSize = 256;
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        setIsMicTesting(true);

        const updateMicLevel = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
            setMicLevel(Math.min(average, 100)); // Cap at 100
            animationFrameRef.current = requestAnimationFrame(updateMicLevel);
          }
        };

        animationFrameRef.current = requestAnimationFrame(updateMicLevel);

      } catch (err) {
        console.error('Error accessing microphone:', err);
        toast({
          title: 'Microphone Access Denied',
          description: 'Please enable microphone permissions in your browser settings.',
          variant: 'destructive',
        });
      }
    }
  };


  async function handleDeleteAccount() {
    if (!user) return;
    try {
      await deleteUser(user.id);
      toast({
        title: 'Account Deleted',
        description: 'Your account has been permanently deleted.',
        variant: 'success'
      });
      // Handle navigation on the client side
      router.refresh();
      router.push('/');
    } catch (error) {
      toast({
        title: 'Error Deleting Account',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  }
  
  const getInitials = (name: string | null | undefined) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'U';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {!isVerified && <UnverifiedAccountWarning />}
      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="friends">Friends ({friends.length})</TabsTrigger>
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
        <TabsContent value="friends" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <Users className="h-6 w-6" />
                Your Friends
              </CardTitle>
              <CardDescription>
                Your list of connections on Chord.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {isLoadingFriends ? (
                   <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : friends.length > 0 ? (
                  <div className="space-y-4">
                    {friends.map((friend) => (
                      <div key={friend.id} className="flex items-center gap-4 p-2 rounded-md hover:bg-accent/50">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={friend.photo_url || undefined} alt={friend.display_name || ''} />
                          <AvatarFallback>{getInitials(friend.display_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{friend.display_name}</p>
                          <p className="text-sm text-muted-foreground">{friend.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                     <Users className="h-12 w-12 mb-4" />
                    <p className="font-semibold">No Friends Yet</p>
                    <p className="text-sm">Use the "Find Friends" feature on the home page to start connecting!</p>
                  </div>
                )}
              </ScrollArea>
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
              <div className="space-y-4">
                <Label>Microphone Test</Label>
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <Mic className="h-5 w-5 text-muted-foreground" />
                  <Progress value={micLevel} className={cn(
                    "w-full transition-all duration-150",
                    micLevel > 1 && "shadow-lg shadow-primary/50"
                  )} 
                  style={{
                    boxShadow: `0 0 ${micLevel / 5}px ${micLevel / 3}px hsl(var(--primary) / 0.3)`
                  }}
                  />
                </div>
                 <div className="flex gap-2">
                    {!isMicTesting ? (
                      <Button variant="outline" onClick={startMicTest}>
                        <Mic className="mr-2 h-4 w-4" />
                        Test Microphone
                      </Button>
                    ) : (
                      <Button variant="destructive" onClick={stopMicTest}>
                        <MicOff className="mr-2 h-4 w-4" />
                        Stop Test
                      </Button>
                    )}
                  </div>
              </div>

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
              <CardTitle className="text-destructive font-headline">Danger Zone</CardTitle>
              <CardDescription>
                These actions are permanent and cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <p className="text-sm">
                Delete your account and all associated data. This is a final action.
              </p>
            </CardContent>
            <CardFooter className="flex justify-end items-center bg-destructive/10 py-4 px-6 rounded-b-lg">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete My Account
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
