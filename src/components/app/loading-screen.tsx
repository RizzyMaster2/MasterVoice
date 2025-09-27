
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
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
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
            
            .line {
                stroke-dasharray: 200;
                stroke-dashoffset: 200;
                animation: draw-line 10s infinite linear;
                stroke: hsl(var(--primary) / 0.1);
            }
            .line-1 { animation-delay: -2s; }
            .line-2 { animation-delay: -5s; }
            .line-3 { animation-delay: -8s; }

            @keyframes float {
                0% { transform: translate(0, 0); }
                25% { transform: translate(20px, 10px) scale(1.1); }
                50% { transform: translate(-10px, -15px) scale(0.9); }
                75% { transform: translate(5px, -20px) scale(1); }
                100% { transform: translate(0, 0); }
            }
            @keyframes draw-line {
                to {
                    stroke-dashoffset: -200;
                }
            }
        `}</style>
         {/* Grid pattern */}
        <path d="M0 10 H100 M0 20 H100 M0 30 H100 M0 40 H100 M0 50 H100 M0 60 H100 M0 70 H100 M0 80 H100 M0 90 H100 M10 0 V100 M20 0 V100 M30 0 V100 M40 0 V100 M50 0 V100 M60 0 V100 M70 0 V100 M80 0 V100 M90 0 V100" stroke="hsl(var(--border) / 0.05)" strokeWidth="0.5" />

        <g>
            <circle cx="20" cy="30" r="4" fill="hsl(var(--primary) / 0.5)" className="orb orb-1" />
            <circle cx="80" cy="70" r="5" fill="hsl(var(--primary) / 0.5)" className="orb orb-2" />
            <circle cx="90" cy="10" r="3" fill="hsl(var(--primary) / 0.5)" className="orb orb-3" />
            <circle cx="40" cy="85" r="4" fill="hsl(var(--primary) / 0.5)" className="orb orb-4" />
             <circle cx="10" cy="80" r="2" fill="hsl(var(--primary) / 0.5)" className="orb orb-2" style={{animationDelay: '-15s'}}/>
            <circle cx="60" cy="40" r="6" fill="hsl(var(--primary) / 0.5)" className="orb orb-1" style={{animationDelay: '-10s'}}/>

            <path className="line line-1" d="M20 30 L 60 40 L 80 70 L 40 85 Z" fill="none" />
            <path className="line line-2" d="M90 10 L 80 70 L 10 80 L 20 30 Z" fill="none" />
            <path className="line line-3" d="M40 85 L 90 10 M60 40 L 10 80" fill="none" />
        </g>

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
