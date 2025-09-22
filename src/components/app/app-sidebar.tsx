'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Shield,
  User,
} from 'lucide-react';

import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { UserNav } from './user-nav';
import { useUser } from '@/hooks/use-user';
import { Skeleton } from '../ui/skeleton';

const menuItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: User,
  },
];

const adminMenuItem = {
  href: '/dashboard/admin',
  label: 'Admin',
  icon: Shield,
};

export function AppSidebar() {
  const pathname = usePathname();
  const { isAdmin } = useUser();

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Logo className="w-7 h-7 text-primary" />
          <span className="font-headline text-2xl font-bold text-primary group-data-[collapsible=icon]:hidden">
            MasterVoice
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={{ children: item.label }}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {isAdmin && (
              <SidebarMenuItem key={adminMenuItem.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === adminMenuItem.href}
                  tooltip={{ children: adminMenuItem.label }}
                >
                <Link href={adminMenuItem.href}>
                  <adminMenuItem.icon />
                  <span>{adminMenuItem.label}</span>
                  </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            )}
          </>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <UserNav />
      </SidebarFooter>
    </>
  );
}
