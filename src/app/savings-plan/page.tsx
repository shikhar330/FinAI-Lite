// This page component is a placeholder as the "Savings Plan" feature has been removed.
// It returns null to prevent rendering errors if this route is somehow accessed.
// Ideally, this route and file should be fully removed if not needed by the routing system.

import { use } from 'react';

interface PageProps {
  params: { [key: string]: string | string[] | undefined };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function SavingsPlanPage({ params, searchParams }: PageProps) {
  // Directly "use" params and searchParams as suggested by Next.js for such warnings.
  const resolvedParams = use(params);
  const resolvedSearchParams = use(searchParams);
  
  // To prevent "unused variable" linting errors if they are not otherwise used:
  if (process.env.NODE_ENV === 'development') {
    if (resolvedParams && Object.keys(resolvedParams).length > 0) {
      console.log('Savings plan page resolved params:', resolvedParams);
    }
    if (resolvedSearchParams && Object.keys(resolvedSearchParams).length > 0) {
      console.log('Savings plan page resolved searchParams:', resolvedSearchParams);
    }
  }

  return null;
}
