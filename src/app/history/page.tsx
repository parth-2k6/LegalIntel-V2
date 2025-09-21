'use client';

import { useAuth } from '@/hooks/use-auth';
import { Loader2, FileText, Clock, Bot } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getFirestore, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { app } from '@/lib/firebase-config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type HistoryItem = {
  id: string;
  fileName: string;
  createdAt: { toDate: () => Date };
  executiveSummary: { overview: string };
};

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const fetchHistory = async () => {
        setLoading(true);
        const db = getFirestore(app);
        const historyRef = collection(db, 'users', user.uid, 'history');
        const q = query(historyRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const historyData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryItem));
        setHistory(historyData);
        setLoading(false);
      };
      fetchHistory();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You must be logged in to view your document analysis history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold mb-6">Analysis History</h1>
      {history.length === 0 ? (
        <p>You have no saved analyses. <Link href="/" className="text-primary hover:underline">Analyze a document</Link> to get started.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {history.map((item) => (
            <Card key={item.id} className="flex flex-col">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 break-all">
                    <FileText className="h-5 w-5 flex-shrink-0" />
                    <span>{item.fileName || 'Untitled Document'}</span>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 text-xs pt-1">
                    <Clock className="h-4 w-4" />
                    <span>{item.createdAt?.toDate().toLocaleString() || 'N/A'}</span>
                  </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-4">{item.executiveSummary?.overview}</p>
              </CardContent>
              <CardFooter>
                 <Button asChild className="w-full">
                    <Link href={`/simulator/${item.id}`}>
                      <Bot className="mr-2 h-4 w-4" />
                      Simulate
                    </Link>
                 </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
