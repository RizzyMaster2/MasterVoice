
'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Cog,
  Gamepad2,
  ShieldCheck,
  BrainCircuit,
  DollarSign,
  MoveRight,
} from 'lucide-react';

const sections = [
  { id: 'features', title: 'Features', icon: MessageSquare },
  { id: 'how-it-works', title: 'How It Works', icon: Cog },
  { id: 'use-cases', title: 'Use Cases', icon: Gamepad2 },
  { id: 'admin-controls', title: 'Admin', icon: ShieldCheck },
  { id: 'ai-features', title: 'AI-Powered', icon: BrainCircuit },
  { id: 'pricing', title: 'Pricing', icon: DollarSign },
];

export function LandingNav() {
  const [activeSection, setActiveSection] = useState<string | null>('hero');
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-30% 0px -70% 0px' }
    );

    const elements = document.querySelectorAll('section[id]');
    elements.forEach((el) => observer.current?.observe(el));

    // Observe hero section separately as it's not a standard section element
    const hero = document.getElementById('hero-section');
    if (hero) observer.current.observe(hero);


    return () => {
      elements.forEach((el) => observer.current?.unobserve(el));
      if (hero) observer.current.unobserve(hero);
    };
  }, []);

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault();
      document.getElementById(id)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
      });
  }

  return (
    <nav className="hidden lg:block fixed left-8 top-1/2 -translate-y-1/2 z-40">
      <ul className="space-y-2">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              onClick={(e) => handleScrollTo(e, section.id)}
              className={cn(
                'group flex items-center gap-3 py-2 px-3 rounded-full transition-all duration-300 ease-in-out',
                'bg-transparent hover:bg-muted/80 hover:pl-4',
                activeSection === section.id
                  ? 'bg-muted/80 pl-4 w-40'
                  : 'w-12 hover:w-40'
              )}
            >
              <section.icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  activeSection === section.id
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              <span
                className={cn(
                  'truncate text-sm font-medium transition-all duration-300',
                   activeSection === section.id
                    ? 'text-foreground opacity-100'
                    : 'text-muted-foreground opacity-0 group-hover:opacity-100'
                )}
              >
                {section.title}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
