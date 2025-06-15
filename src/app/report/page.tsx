// This file is intentionally left blank as the "Financial Report" feature has been removed.
// It should ideally be deleted from the project structure.

import { use } from 'react';

interface PageProps {
  params: { [key: string]: string | string[] | undefined };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function RemovedReportPage({ params, searchParams }: PageProps) {
  // Directly "use" params and searchParams as suggested by Next.js for such warnings.
  const resolvedParams = use(params);
  const resolvedSearchParams = use(searchParams);

  // To prevent "unused variable" linting errors if they are not otherwise used:
  if (process.env.NODE_ENV === 'development') {
    if (resolvedParams && Object.keys(resolvedParams).length > 0) {
      console.log('Report page resolved params:', resolvedParams);
    }
    if (resolvedSearchParams && Object.keys(resolvedSearchParams).length > 0) {
      console.log('Report page resolved searchParams:', resolvedSearchParams);
    }
  }
  
  return null;
}
