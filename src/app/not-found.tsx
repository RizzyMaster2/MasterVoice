
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SearchX, Home } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-xl text-center">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
            <SearchX className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="font-headline text-4xl text-destructive">
            404 - Not Found
          </CardTitle>
          <CardDescription>
            Oops! The page you are looking for does not exist. It might have been moved or deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                Let&apos;s get you back on track.
            </p>
        </CardContent>
        <CardFooter className="flex justify-center">
           <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" /> Go to Homepage
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
