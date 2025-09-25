
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Home } from 'lucide-react';
import Link from 'next/link';

const NotFoundIllustration = () => (
    <svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" className="h-16 w-auto text-destructive">
        <style>
            {`
            .digit {
                font-family: var(--font-headline), sans-serif;
                font-size: 80px;
                font-weight: bold;
                fill: currentColor;
                opacity: 0;
                animation: drop-in 0.5s ease-out forwards;
            }
            .digit-1 { animation-delay: 0.2s; }
            .digit-2 { animation-delay: 0.4s; transform: scale(0.95); }
            .digit-3 { animation-delay: 0.6s; }
            
            .magnify-glass {
                stroke: currentColor;
                stroke-width: 8;
                stroke-linecap: round;
                fill: none;
                transform-origin: 105px 45px;
                animation: search-anim 3s ease-in-out infinite;
            }

            @keyframes drop-in {
                from { transform: translateY(-50px) scale(0.8); opacity: 0; }
                to { transform: translateY(0) scale(1); opacity: 1; }
            }

            @keyframes search-anim {
                0%, 100% { transform: rotate(0deg) scale(1); }
                25% { transform: rotate(-15deg) scale(1.05); }
                75% { transform: rotate(10deg) scale(0.95); }
            }
            `}
        </style>
        <text x="10" y="75" className="digit digit-1">4</text>
        
        {/* Animated Magnifying Glass */}
        <g className="digit digit-2">
          <circle cx="100" cy="45" r="30" className="magnify-glass" />
          <line x1="125" y1="70" x2="140" y2="85" className="magnify-glass" />
        </g>
        
        <text x="150" y="75" className="digit digit-3">4</text>
    </svg>
);


export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-xl text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            <NotFoundIllustration />
          </div>
          <CardTitle className="font-headline text-4xl text-destructive">
            Page Not Found
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
