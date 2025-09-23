'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Shield,
} from 'lucide-react';

import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { useUser } from '@/hooks/use-user';

const menuItems = [
  {
    href: '/home',
    label: 'Home',
    icon: Home,
  },
  // {
  //   href: '/profile',
  //   label: 'Profile',
  //   icon: User,
  // },
];

const adminMenuItem = {
  href: '/home/admin',
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
                  isActive={pathname.startsWith(adminMenuItem.href)}
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
    </>
  );
}
