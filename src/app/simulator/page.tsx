'use client';

import { useAuth } from '@/hooks/use-auth';
import { Loader2, FileText, Bot } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getFirestore, collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { app } from '@/lib/firebase-config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

// This page now acts as a redirect to the main simulator page,
// or finds the latest document if a user lands here directly.
export default function SimulatorRedirectPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Just redirect to the new simulator page.
    router.replace('/legal-simulator');
  }, [router]);

  // Display a loader while redirecting
  return (
    <div className="flex flex-col justify-center items-center h-[calc(100vh-4rem)] text-center">
      <Loader2 className="h-10 w-10 animate-spin" />
      <p className="mt-4 text-muted-foreground">Loading Simulator...</p>
    </div>
  );
}
