
'use client';

import { useHomeClient } from '@/components/app/home-client-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { redirect } from 'next/navigation';

const SelectChatIllustration = () => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50">
      <style>{`
        .main-icon { animation: float 3s ease-in-out infinite; }
        .bubble { opacity: 0; transform-origin: center; animation: pop-in 0.5s ease-out forwards; }
        .bubble-1 { animation-delay: 0.5s; }
        .bubble-2 { animation-delay: 0.7s; }
        .bubble-3 { animation-delay: 0.9s; }
        .arrow { stroke-dasharray: 20; stroke-dashoffset: 20; animation: draw 0.7s 1.2s ease-out forwards; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes pop-in { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes draw { to { stroke-dashoffset: 0; } }
      `}</style>
      <g className="main-icon">
          <path fill="currentColor" d="M50 30 C 40 30, 35 40, 35 50 C 35 65, 45 70, 50 70 C 55 70, 65 65, 65 50 C 65 40, 60 30, 50 30 Z M 50 25 C 55 25, 55 20, 50 20 C 45 20, 45 25, 50 25 Z" />
      </g>
      <circle cx="20" cy="50" r="4" fill="currentColor" className="bubble bubble-1" />
      <circle cx="15" cy="65" r="3" fill="currentColor" className="bubble bubble-2" />
      <circle cx="25" cy="35" r="3" fill="currentColor" className="bubble bubble-3" />
      <path d="M28 50 L 35 50" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="arrow" />
    </svg>
);


export default function HomePage() {
  const { 
    friends, 
    isLoading
  } = useHomeClient();

  if (isLoading) {
    return <Skeleton className="h-full w-full" />;
  }
  
  if (friends.length === 0) {
    redirect('/home/friends');
  }

  return (
    <div className="flex-1 flex flex-col h-full items-center justify-center bg-muted/20 rounded-lg">
        <div className="text-center">
          <SelectChatIllustration />
          <h2 className="text-xl font-semibold">Select a Conversation</h2>
          <p className="text-muted-foreground mt-2">
            Choose a friend from the sidebar to start chatting.
          </p>
        </div>
    </div>
  );
}
