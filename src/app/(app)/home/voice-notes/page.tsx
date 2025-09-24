
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, Play, Pause, Trash2, StopCircle, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { formatDistanceToNow } from 'date-fns';
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

type VoiceNote = {
  id: string;
  file_path: string;
  public_url: string;
  created_at: string;
};

export default function VoiceNotesPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const supabase = createClient();
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchVoiceNotes = async () => {
      setIsLoading(true);
      const { data: files, error } = await supabase.storage
        .from('files')
        .list(`${user.id}/voice-notes`, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) {
        toast({ title: 'Error fetching voice notes', description: error.message, variant: 'destructive' });
      } else {
        const notes = files.map(file => {
           const { data: { publicUrl } } = supabase.storage.from('files').getPublicUrl(`${user.id}/voice-notes/${file.name}`);
           return {
                id: file.id,
                file_path: `${user.id}/voice-notes/${file.name}`,
                public_url: publicUrl,
                created_at: file.created_at,
           }
        });
        setVoiceNotes(notes);
      }
      setIsLoading(false);
    };

    fetchVoiceNotes();
  }, [user, supabase, toast]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = uploadRecording;
      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast({ title: 'Recording started...' });
    } catch (error) {
      toast({ title: 'Microphone access denied', description: 'Please allow microphone access to record voice notes.', variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({ title: 'Recording stopped, uploading...' });
    }
  };

  const uploadRecording = async () => {
    if (!user) return;
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    audioChunksRef.current = [];

    const fileName = `voice-note-${Date.now()}.webm`;
    const filePath = `${user.id}/voice-notes/${fileName}`;
    
    setIsLoading(true);
    const { error } = await supabase.storage.from('files').upload(filePath, audioBlob);
    setIsLoading(false);

    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Voice note saved!', variant: 'success' });
      // Refetch notes
      const { data: files, error: listError } = await supabase.storage
        .from('files')
        .list(`${user.id}/voice-notes`, { sortBy: { column: 'created_at', order: 'desc' } });
      
      if (listError) {
         toast({ title: 'Error fetching voice notes', description: listError.message, variant: 'destructive' });
      } else {
         const notes = files.map(file => {
           const { data: { publicUrl } } = supabase.storage.from('files').getPublicUrl(`${user.id}/voice-notes/${file.name}`);
           return { id: file.id, file_path: `${user.id}/voice-notes/${file.name}`, public_url: publicUrl, created_at: file.created_at }
        });
        setVoiceNotes(notes);
      }
    }
  };

  const togglePlay = (note: VoiceNote) => {
    if (audioRef.current && isPlaying === note.id) {
      audioRef.current.pause();
      setIsPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const newAudio = new Audio(note.public_url);
      audioRef.current = newAudio;
      newAudio.play();
      setIsPlaying(note.id);
      newAudio.onended = () => setIsPlaying(null);
    }
  };

  const deleteNote = async (notePath: string) => {
    const { error } = await supabase.storage.from('files').remove([notePath]);
    if (error) {
      toast({ title: 'Error deleting note', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Voice note deleted.' });
      setVoiceNotes(prev => prev.filter(n => n.file_path !== notePath));
    }
  };

  return (
    <div className="flex justify-center items-start h-full p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Mic className="h-6 w-6 text-primary" />
            My Voice Notes
          </CardTitle>
          <CardDescription>Record, listen, and manage your personal voice memos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center p-6 bg-muted rounded-lg">
            {isRecording ? (
              <Button onClick={stopRecording} variant="destructive" size="lg" className="rounded-full w-24 h-24">
                <StopCircle className="h-10 w-10" />
              </Button>
            ) : (
              <Button onClick={startRecording} size="lg" className="rounded-full w-24 h-24" disabled={isLoading}>
                 {isLoading ? <Loader2 className="h-10 w-10 animate-spin" /> : <Mic className="h-10 w-10" />}
              </Button>
            )}
          </div>
          
          <div className="space-y-4">
             <h3 className="font-semibold">Your Recordings</h3>
              <ScrollArea className="h-[400px] border rounded-md p-2">
                {isLoading && voiceNotes.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : voiceNotes.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>You have no voice notes yet.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {voiceNotes.map(note => (
                            <div key={note.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50">
                                <div>
                                    <p className="font-medium">Voice Note - {new Date(note.created_at).toLocaleDateString()}</p>
                                    <p className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => togglePlay(note)}>
                                        {isPlaying === note.id ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                                    </Button>
                                    <a href={note.public_url} download={`voice-note-${note.id}.webm`}>
                                        <Button variant="ghost" size="icon">
                                            <Download className="h-5 w-5" />
                                        </Button>
                                    </a>
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <Trash2 className="h-5 w-5 text-destructive" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete this voice note?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the voice note.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => deleteNote(note.file_path)} className="bg-destructive hover:bg-destructive/90">
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    