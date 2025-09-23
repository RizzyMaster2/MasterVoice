
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
import { LogIn, AlertTriangle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof formSchema>;

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get('message');
  
  const vpnError = 'Failed to fetch';
  const isVpnError = errorMessage?.includes(vpnError);
  const displayMessage = isVpnError 
    ? 'A network proxy or VPN is interfering with the connection. Please disable it and try again.' 
    : errorMessage;


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
    
    // Server action handles redirects and errors.
    // The try/catch is removed to prevent catching the redirect signal.
    await login(formData);

    // Only set loading to false if login fails and returns, which it won't 
    // on success because of the redirect. It might be better to just let it be.
    // In case of an error that doesn't redirect, we need to re-enable the form.
    // This part is tricky because a successful redirect unmounts the component.
    // The redirect on error will reload the page with a message, resetting the state.
    // A non-redirect error could still hang, though.
    // For now, we'll assume all paths lead to a redirect or page change.
    // A more robust solution might involve `useFormState`.
    // Let's add a failsafe.
    setIsLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {displayMessage && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{isVpnError ? 'Network Proxy Detected' : 'Login Failed'}</AlertTitle>
            <AlertDescription>{displayMessage}</AlertDescription>
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
