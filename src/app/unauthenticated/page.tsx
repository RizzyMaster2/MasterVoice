import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertTriangle, LogIn, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function UnauthenticatedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="font-headline text-2xl">
            You are not logged in
          </CardTitle>
          <CardDescription>
            You need to be logged in to access this page. Please log in or
            create an account to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-4">
          <Button asChild>
            <Link href="/login">
              <LogIn className="mr-2" /> Login
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/signup">
              <UserPlus className="mr-2" /> Sign Up
            </Link>
          </Button>
        </CardContent>
        <CardFooter>
           <p className="w-full text-center text-sm text-muted-foreground">
            Go back to{' '}
            <Link href="/" className="font-medium text-primary hover:underline">
              Homepage
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
