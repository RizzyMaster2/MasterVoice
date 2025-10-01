
'use client';

import Link from "next/link";
import { Button } from "../ui/button";
import { Flame } from "lucide-react";
import { useState, useRef, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

export function FireSaleBanner() {
  const [mousePosition, setMousePosition] = useState({ x: -200, y: -200 });
  const bannerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (bannerRef.current) {
        const rect = bannerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setMousePosition({ x, y });
    }
  };
  
  const handleMouseLeave = () => {
    setMousePosition({ x: -200, y: -200 });
  };


  return (
    <div 
      ref={bannerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
          "group relative -mx-4 mb-4 flex items-center justify-center p-4 text-white shadow-2xl overflow-hidden animate-in fade-in-0 duration-1000",
          "bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500",
          "before:content-[''] before:absolute before:inset-0 before:z-0 before:bg-gradient-to-r before:from-yellow-400 before:via-red-500 before:to-pink-500 before:animate-pulse before:blur-2xl before:opacity-50"
      )}
    >
        {/* Ripple effect */}
        <div 
            className="pointer-events-none absolute inset-0 z-20 transition-all duration-300"
            style={{
                background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255, 255, 200, 0.4) 0%, rgba(255, 255, 255, 0) 30%)`
            }}
        />
      {/* Shimmer background */}
       <div className="absolute inset-0 z-0 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:36px_36px]"></div>
        <div className="absolute inset-[-100%] z-10 block h-[300%] w-[300%] animate-[shimmer_6s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,rgba(255,215,0,0.5)_0%,rgba(255,80,80,0.6)_50%,rgba(255,215,0,0.5)_100%)]"></div>
      
      {/* Rip Animation Layers */}
      <div 
        className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 transition-transform duration-700 ease-in-out group-hover:-translate-x-full z-10" 
        style={{clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)'}} 
      />
      <div 
        className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 transition-transform duration-700 ease-in-out group-hover:translate-x-full z-10"
        style={{clipPath: 'polygon(5% 0, 100% 0, 100% 100%, 0% 100%)'}} 
      />
      <div className="z-20 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center">
        <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 animate-bounce" />
            <p className="font-bold text-lg sm:text-xl">
                <span className="hidden sm:inline">Limited Time:</span> FIRE SALE!
            </p>
        </div>
        <p className="text-sm sm:text-base">
            Get a <span className="font-bold">Lifetime Pro Plan</span> for just $20!
        </p>
         <Button asChild variant="outline" size="sm" className="bg-transparent text-white border-white hover:bg-white hover:text-red-500">
            <Link href="/billing/info/pro">Claim Offer</Link>
        </Button>
      </div>
    </div>
  );
}
