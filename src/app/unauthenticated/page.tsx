
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LogIn, UserPlus } from 'lucide-react';
import Link from 'next/link';

const UnauthenticatedIllustration = () => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-destructive">
        <style>
        {`
            .lock-body, .lock-shackle {
                stroke: currentColor;
                stroke-width: 6;
                stroke-linecap: round;
                stroke-linejoin: round;
                fill: none;
            }
            .lock-shackle {
                animation: lock-jiggle 2s ease-in-out infinite;
                transform-origin: 50% 100%;
            }
            .keyhole {
                fill: currentColor;
                opacity: 0;
                animation: keyhole-fade 1s 1s forwards;
            }
            @keyframes lock-jiggle {
                0%, 100% { transform: translateY(0) rotate(0); }
                25% { transform: translateY(-2px) rotate(-5deg); }
                75% { transform: translateY(0) rotate(5deg); }
            }
            @keyframes keyhole-fade {
                to { opacity: 1; }
            }
        `}
        </style>
        <path className="lock-shackle" d="M30 45V30C30 19 39 10 50 10C61 10 70 19 70 30V45" />
        <rect className="lock-body" x="20" y="45" width="60" height="45" rx="8" />
        <circle className="keyhole" cx="50" cy="68" r="6" />
    </svg>
);


export default function UnauthenticatedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <UnauthenticatedIllustration />
          </div>
          <CardTitle className="font-headline text-2xl">
            Access Denied
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
