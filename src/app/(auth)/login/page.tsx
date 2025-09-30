
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';
import { Suspense } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface LoginPageContentProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

function LoginPageContent({ searchParams }: LoginPageContentProps) {
  const message = searchParams.message as string | undefined;

  return (
    <Card className="w-full max-w-sm shadow-xl relative">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Welcome Back</CardTitle>
        <CardDescription>
          Enter your email below to log in to your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {message && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Login Error</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        <LoginForm />
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="underline text-primary font-medium">
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage({ searchParams }: LoginPageContentProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageContent searchParams={searchParams} />
    </Suspense>
  );
}
