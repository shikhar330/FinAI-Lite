
'use client';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { AppLogo } from './AppLogo';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  HelpCircle,
  Landmark,
  MessageSquareHeart,
  Settings,
  Target,
  CalendarClock, // Added CalendarClock
} from 'lucide-react';
import { cn } from '@/lib/utils'; 

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/finances', label: 'Update Finances', icon: Landmark },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/bill-tracker', label: 'Bill Reminders', icon: CalendarClock }, // Added Bill Reminders
  { href: '/what-if', label: 'What-If Scenarios', icon: HelpCircle },
  { href: '/goal-setting', label: 'Financial Goals', icon: Target },
  { href: '/financial-advice', label: 'AI Advisor', icon: MessageSquareHeart },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { open, setOpen, isMobile, hasMounted } = useSidebar(); 

  const handleLinkClick = () => {
    if (hasMounted && isMobile) { 
      setOpen(false); 
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className={cn(
          "flex items-center", 
          (open || isMobile) ? "p-4 justify-start" : "p-2 justify-center" 
        )}>
        <AppLogo showText={open || isMobile} />
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior={false} passHref={false}>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  onClick={handleLinkClick}
                >
                  <item.icon className="h-5 w-5" />
                  
                  <span className={(isMobile || open) ? 'inline-block' : 'hidden'}>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t">
         <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/settings" legacyBehavior={false} passHref={false}>
                <SidebarMenuButton
                  tooltip="Settings"
                  isActive={pathname === '/settings'}
                  onClick={handleLinkClick}
                >
                  <Settings className="h-5 w-5" />
                   
                  <span className={(isMobile || open) ? 'inline-block' : 'hidden'}>Settings</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
         </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
