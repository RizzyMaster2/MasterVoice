
'use client';

import { useState, useEffect } from 'react';
import { Logo } from '@/components/logo';

const tips = [
  "You can start a voice call from any chat window using the phone icon.",
  "Customize your public profile, including your avatar and bio, on the Profile page.",
  "Use the 'Add Friend' tab to search for and connect with new people.",
  "Create group chats for your teams or friend groups from the 'Groups' page.",
  "Click your avatar in the top-right to access your profile and billing settings.",
  "Upgrade to the Pro plan for features like HD voice and noise cancellation."
];

const LoadingBackground = () => (
    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 100 100">
        <defs>
            <radialGradient id="glow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </radialGradient>
        </defs>
        <style>{`
            .orb {
                animation: float 20s infinite ease-in-out;
            }
            .orb-1 { animation-duration: 15s; animation-delay: -5s; }
            .orb-2 { animation-duration: 25s; animation-delay: -2s; }
            .orb-3 { animation-duration: 18s; animation-delay: -8s; }
            .orb-4 { animation-duration: 22s; animation-delay: -12s; }
            @keyframes float {
                0% { transform: translate(0, 0); }
                25% { transform: translate(10px, 20px); }
                50% { transform: translate(-15px, -10px); }
                75% { transform: translate(5px, -20px); }
                100% { transform: translate(0, 0); }
            }
        `}</style>
        <circle cx="20" cy="30" r="15" fill="url(#glow)" className="orb orb-1" />
        <circle cx="80" cy="70" r="20" fill="url(#glow)" className="orb orb-2" />
        <circle cx="90" cy="10" r="10" fill="url(#glow)" className="orb orb-3" />
        <circle cx="40" cy="85" r="18" fill="url(#glow)" className="orb orb-4" />
    </svg>
);


export function LoadingScreen() {
  const [tip, setTip] = useState('');

  useEffect(() => {
    setTip(tips[Math.floor(Math.random() * tips.length)]);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-background overflow-hidden relative">
      <LoadingBackground />
      <div className="flex flex-col items-center gap-6 z-10 animate-in fade-in duration-1000">
        <Logo className="h-16 w-16 text-primary animate-pulse" style={{ animationDuration: '2s' }} />
        <p className="text-lg font-semibold text-muted-foreground animate-pulse" style={{ animationDelay: '200ms', animationDuration: '2s' }}>Loading your space...</p>
         {tip && (
            <div className="absolute bottom-10 left-10 right-10 text-center animate-in fade-in-0 slide-in-from-bottom-5 duration-1000 delay-500">
                <p className="text-sm text-muted-foreground/80 italic">
                    <span className="font-bold">Tip:</span> {tip}
                </p>
            </div>
        )}
      </div>
    </div>
  );
}
