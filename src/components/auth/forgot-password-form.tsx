
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
import { Mail, Send, CheckCircle } from 'lucide-react';
import { requestPasswordReset } from '@/app/(auth)/actions/auth';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

type ForgotPasswordFormValues = z.infer<typeof formSchema>;

export function ForgotPasswordForm() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setIsLoading(true);
    try {
      const result = await requestPasswordReset(values.email);
      if (result.error) {
        throw new Error(result.error);
      }
      setIsSuccess(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isSuccess) {
    return (
      <Alert variant="success" className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 [&>svg]:text-green-600 dark:[&>svg]:text-green-400">
        <CheckCircle className="h-4 w-4" />
        <AlertTitle className="font-bold">Check your email</AlertTitle>
        <AlertDescription>
          A password reset link has been sent to the email address you provided.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="name@example.com" {...field} className="pl-9" />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          <Send className="mr-2 h-4 w-4" />
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </Button>
      </form>
    </Form>
  );
}
