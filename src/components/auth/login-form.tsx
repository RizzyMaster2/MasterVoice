
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { login } from '@/app/(auth)/actions';
import { LogIn } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof formSchema>;

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get('message');
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('email', values.email);
    formData.append('password', values.password);
    
    // The login action will handle success/error and redirect.
    // A failed login will redirect back with a message on the URL.
    // A successful login will redirect to the dashboard.
    // We just need to wait for the action to complete.
    try {
        await login(formData);
    } catch (error) {
        // This catch block might run if the server action itself throws an unhandled error.
        toast({
            title: 'Login Failed',
            description: (error as Error).message || "An unexpected error occurred.",
            variant: 'destructive',
        });
        setIsLoading(false);
    }
    // No need to set loading to false on success because the page will redirect.
    // If the login fails, the page will reload with an error message, resetting the state.
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {errorMessage && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Login Failed</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
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
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          <LogIn className="mr-2 h-4 w-4" />
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>
      </form>
    </Form>
  );
}
