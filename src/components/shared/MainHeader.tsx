
'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { AppLogo } from './AppLogo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogIn, LogOut, Settings as SettingsIcon, UserCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '../ui/button';

export function MainHeader() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, signOut, loading } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push('/auth/login'); // Navigate to login page after logout
    } catch (error: any) {
      toast({
        title: "Logout Failed",
        description: error.message || "An error occurred during logout.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      {/* Removed md:hidden to make SidebarTrigger always visible */}
      <div className=""> 
        <SidebarTrigger />
      </div>
      <div className="hidden md:block">
        <AppLogo />
      </div>
      <div className="flex-1 md:hidden">
        {/* Mobile view: Centered Logo or leave empty for trigger to be on left and avatar on right */}
      </div>
      <div className="ml-auto flex items-center gap-4">
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-9 w-9 cursor-pointer">
                {/* In a real app, user.photoURL could be used here */}
                <AvatarImage src={user.photoURL || `https://placehold.co/100x100.png?text=${user.email?.[0].toUpperCase()}`} alt="User Avatar" data-ai-hint="user avatar" />
                <AvatarFallback>
                  {user.email ? user.email[0].toUpperCase() : <User className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user.displayName || user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/profile" passHref legacyBehavior>
                <DropdownMenuItem asChild>
                  <a className="flex items-center gap-2"><UserCircle className="h-4 w-4" /> Profile</a>
                </DropdownMenuItem>
              </Link>
              <Link href="/settings" passHref legacyBehavior>
                <DropdownMenuItem asChild>
                 <a className="flex items-center gap-2"><SettingsIcon className="h-4 w-4" /> Settings</a>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                <LogOut className="h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href="/auth/login" className="flex items-center gap-2">
              <LogIn className="h-4 w-4" /> Login / Sign Up
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
