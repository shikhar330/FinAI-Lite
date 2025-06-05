import { Coins } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  showText?: boolean;
}

export function AppLogo({ showText = true }: AppLogoProps) {
  return (
    <Link href="/" className={cn(
        "flex items-center gap-2 text-primary hover:text-primary/90 transition-colors",
        !showText && "w-full justify-center"
      )}>
      <Coins className="h-6 w-6" /> {/* Adjusted size */}
      {showText && <h1 className="text-lg font-semibold">FinAI Lite</h1>} {/* Adjusted size and conditional rendering */}
    </Link>
  );
}
