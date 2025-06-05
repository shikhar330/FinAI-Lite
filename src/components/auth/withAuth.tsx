
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, type ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

export default function withAuth<P extends object>(WrappedComponent: ComponentType<P>) {
  const ComponentWithAuth = (props: P) => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        router.replace('/auth/login');
      }
    }, [user, loading, router]);

    if (loading || !user) {
      return (
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }
    return <WrappedComponent {...props} />;
  };
  
  // Assign a display name for easier debugging
  const wrappedComponentName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  ComponentWithAuth.displayName = `WithAuth(${wrappedComponentName})`;
  
  return ComponentWithAuth;
}
