
'use client';
 
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
 
const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});
 export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });
  const [loading, setLoading] = useState(false);
 
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (loading) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
 
      if (error) {
        toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
        setLoading(false); // Stop loading on error
        return;
      }
 
      toast({ title: 'Login successful', description: 'Redirecting…' });
      // Explicitly push to the home page to avoid middleware race conditions.
      // The useUser hook will handle the full page reload on SIGNED_IN event.
      router.push('/home');
    } catch (error) {
       toast({ title: 'An unexpected error occurred', description: (error as Error).message, variant: 'destructive' });
       setLoading(false);
    }
  }
 
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          <LogIn className="mr-2 h-4 w-4" />
          {loading ? 'Signing in…' : 'Login'}
        </Button>
      </form>
    </Form>
  );
}
