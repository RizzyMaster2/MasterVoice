
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Shield,
  UserPlus,
} from 'lucide-react';

import { Logo } from '@/components/logo';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

const menuItems = [
  {
    href: '/home',
    label: 'Chats',
    icon: Home,
  },
   {
    href: '/home/friends',
    label: 'Friends',
    icon: UserPlus,
  },
  {
    href: '/home/groups',
    label: 'Groups',
    icon: Users,
  }
];

const adminMenuItem = {
  href: '/home/admin',
  label: 'Admin',
  icon: Shield,
};

const businessAdminMenuItem = {
  href: '/home/admin/business',
  label: 'Admin',
  icon: Shield,
};

export function AppSidebar() {
  const pathname = usePathname();
  const { isAdmin, isBusinessPlan } = useUser();

  const isMenuItemActive = (href: string) => {
    if (href === '/home') {
        // Special case for home to avoid matching /home/friends etc.
        return pathname === href;
    }
    return pathname.startsWith(href);
  }
  
  const finalAdminMenuItem = isBusinessPlan ? businessAdminMenuItem : adminMenuItem;
  const showAdminLink = isAdmin || isBusinessPlan;

  return (
    <>
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo className="h-6 w-6 text-primary" />
          <span className="font-headline text-xl text-primary">MasterVoice</span>
        </Link>
      </div>
      <div className="flex-1">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                isMenuItemActive(item.href) && 'bg-muted text-primary'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          {showAdminLink && (
             <Link
              key={finalAdminMenuItem.href}
              href={finalAdminMenuItem.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                pathname.startsWith(finalAdminMenuItem.href) && 'bg-muted text-primary'
              )}
            >
              <finalAdminMenuItem.icon className="h-4 w-4" />
              {finalAdminMenuItem.label}
            </Link>
          )}
        </nav>
      </div>
    </>
  );
}
