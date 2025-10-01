
'use client';

import Link from "next/link";
import { Button } from "../ui/button";
import { Flame } from "lucide-react";
import { useState, useRef, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

export function FireSaleBanner() {
  const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 });
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
    setMousePosition({ x: -100, y: -100 });
  };


  return (
    <div 
      ref={bannerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative -mx-4 mb-4 flex items-center justify-center p-4 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 text-white shadow-2xl overflow-hidden animate-in fade-in-0 duration-1000"
    >
        {/* Ripple effect */}
        <div 
            className="pointer-events-none absolute inset-0 transition-all duration-300"
            style={{
                background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 25%)`
            }}
        />
      {/* Static background with texture */}
      <div 
        className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%220%200%2040%2040%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%20fill-rule%3D%22evenodd%22%3E%3Cpath%20d%3D%22M0%2040L40%200H20L0%2020M40%2040V20L20%2040%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')]"
      />
      {/* Rip Animation Layers */}
      <div 
        className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 transition-transform duration-700 ease-in-out group-hover:-translate-x-full" 
        style={{clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)'}} 
      />
      <div 
        className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 transition-transform duration-700 ease-in-out group-hover:translate-x-full"
        style={{clipPath: 'polygon(5% 0, 100% 0, 100% 100%, 0% 100%)'}} 
      />
      <div className="z-10 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center">
        <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 animate-bounce" />
            <p className="font-bold text-lg sm:text-xl">
                <span className="hidden sm:inline">Limited Time:</span> FIRE SALE!
            </p>
        </div>
        <p className="text-sm sm:text-base">
            Get a <span className="font-bold">Lifetime Pro Plan</span> for just $50!
        </p>
         <Button asChild variant="outline" size="sm" className="bg-transparent text-white border-white hover:bg-white hover:text-red-500">
            <Link href="/billing/info/pro">Claim Offer</Link>
        </Button>
      </div>
    </div>
  );
}
